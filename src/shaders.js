/* ── SHADERS (GLSL ES 3.00) ─────────────────────────────────── */
export const VS_FULLSCREEN = `#version 300 es
out vec2 v_uv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/* CA step. State texture: R = alive(0/1), G = age, B = trail heat. */
export const FS_SIM = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_state;
uniform ivec2 u_size;
uniform int u_birth;
uniform int u_survive;
uniform int u_wrap;
out vec4 outColor;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  int n = 0;
  for (int dy = -1; dy <= 1; dy++)
  for (int dx = -1; dx <= 1; dx++){
    if (dx == 0 && dy == 0) continue;
    ivec2 q = p + ivec2(dx, dy);
    if (u_wrap == 1) q = (q + u_size) % u_size;        // toroidal wrap
    else if (q.x < 0 || q.y < 0 || q.x >= u_size.x || q.y >= u_size.y) continue;
    n += int(texelFetch(u_state, q, 0).r + 0.5);
  }
  vec4 prev = texelFetch(u_state, p, 0);
  bool alive = prev.r > 0.5;
  bool next = alive ? (((u_survive >> n) & 1) == 1)
                    : (((u_birth   >> n) & 1) == 1);
  float age   = next ? (alive ? min(prev.g + 1.0, 1e6) : 1.0) : 0.0;
  float trail = next ? 1.0 : prev.b * 0.90;
  outColor = vec4(next ? 1.0 : 0.0, age, trail, 1.0);
}`;

/* State → palette colors. u_uvScale/offset implement crop/letterbox for
   export. u_mode 1 = long-exposure history (accum texture: R = gen of last
   visit → temporal gradient across the palette, G = visit count → density).
   u_shape draws each cell as an SDF shape with analytic antialiasing. */
export const FS_COLOR = `#version 300 es
precision highp float;
uniform highp sampler2D u_state;
uniform highp sampler2D u_accum;
uniform vec3 u_bg;
uniform vec3 u_stops[5];
uniform int u_numStops;
uniform float u_ageSpan;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_grid;
uniform int u_shape;      // 0 square · 1 circle · 2 rounded · 3 diamond
uniform int u_mode;       // 0 live · 1 long-exposure history
uniform float u_gen;
uniform int u_transparent;
in vec2 v_uv;
out vec4 outColor;
vec3 grad(float t){
  float f = t * float(u_numStops - 1);
  int i = int(clamp(floor(f), 0.0, float(u_numStops - 2)));
  return mix(u_stops[i], u_stops[i+1], clamp(f - float(i), 0.0, 1.0));
}
float shapeMask(vec2 uv){
  if (u_shape == 0) return 1.0;
  vec2 f = fract(uv * u_grid) - 0.5;
  float d;
  if (u_shape == 1) d = length(f) - 0.46;
  else if (u_shape == 2){
    vec2 q = abs(f) - 0.32;
    d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.14;
  } else d = abs(f.x) + abs(f.y) - 0.60;
  float aa = max(fwidth(d), 1e-4);
  return 1.0 - smoothstep(-aa, aa, d);
}
void main(){
  vec2 uv = v_uv * u_uvScale + u_uvOffset;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0){   // letterbox
    outColor = u_transparent == 1 ? vec4(0.0) : vec4(u_bg, 1.0);
    return;
  }
  vec4 s = texture(u_state, uv);
  vec3 cellCol = u_bg;
  float a = 0.0;
  if (u_mode == 1){
    vec4 acc = texture(u_accum, uv);
    if (acc.g > 0.5){
      cellCol = grad(clamp(acc.r / max(u_gen, 1.0), 0.0, 1.0));
      a = shapeMask(uv) * clamp(acc.g / 24.0, 0.30, 1.0);   // brief visits → light trace
    }
    if (s.r > 0.5){ cellCol = grad(1.0); a = shapeMask(uv); }  // live front
  } else {
    if (s.r > 0.5){ cellCol = grad(clamp(s.g / u_ageSpan, 0.0, 1.0)); a = shapeMask(uv); }
    else if (s.b > 0.02){ cellCol = grad(0.0); a = shapeMask(uv) * s.b * 0.30; }
  }
  if (u_transparent == 1) outColor = vec4(cellCol, a);
  else outColor = vec4(mix(u_bg, cellCol, a), 1.0);
}`;

/* Long-exposure accumulator. R = generation of last visit, G = visit count. */
export const FS_ACCUM = `#version 300 es
precision highp float;
uniform highp sampler2D u_state;
uniform highp sampler2D u_accum;
uniform float u_gen;
out vec4 outColor;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  float alive = texelFetch(u_state, p, 0).r;
  vec4 prev = texelFetch(u_accum, p, 0);
  outColor = vec4(alive > 0.5 ? u_gen : prev.r, prev.g + alive, 0.0, 1.0);
}`;

export const FS_BRIGHT = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_threshold;
in vec2 v_uv;
out vec4 outColor;
void main(){
  vec3 c = texture(u_tex, v_uv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  outColor = vec4(c * smoothstep(u_threshold, u_threshold + 0.3, l), 1.0);
}`;

export const FS_BLUR = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_dir;
in vec2 v_uv;
out vec4 outColor;
void main(){
  float w[5];
  w[0]=0.227027; w[1]=0.1945946; w[2]=0.1216216; w[3]=0.054054; w[4]=0.016216;
  vec3 c = texture(u_tex, v_uv).rgb * w[0];
  for (int i = 1; i < 5; i++){
    c += texture(u_tex, v_uv + u_dir * float(i)).rgb * w[i];
    c += texture(u_tex, v_uv - u_dir * float(i)).rgb * w[i];
  }
  outColor = vec4(c, 1.0);
}`;

export const FS_COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_intensity;
in vec2 v_uv;
out vec4 outColor;
void main(){
  vec3 c = texture(u_scene, v_uv).rgb + texture(u_bloom, v_uv).rgb * u_intensity;
  outColor = vec4(c, 1.0);
}`;

/* Block-sum reduction for population counting (64x64 output). */
export const FS_REDUCE = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_state;
uniform ivec2 u_size;
uniform int u_block;
out vec4 outColor;
void main(){
  ivec2 base = ivec2(gl_FragCoord.xy) * u_block;
  float sum = 0.0;
  for (int y = 0; y < u_block; y++)
  for (int x = 0; x < u_block; x++){
    ivec2 q = base + ivec2(x, y);
    if (q.x < u_size.x && q.y < u_size.y) sum += texelFetch(u_state, q, 0).r;
  }
  outColor = vec4(sum, 0.0, 0.0, 1.0);
}`;
