/* ── WEBGL2 ENGINE ─────────────────────────────────────────────── */
import { VS_FULLSCREEN, FS_SIM, FS_COLOR, FS_ACCUM, FS_BRIGHT, FS_BLUR, FS_COMPOSITE, FS_REDUCE } from './shaders.js';
import { state, digitsToMask, viewUV } from './state.js';
import { activePal } from './palettes.js';
import { bestWindowOffset } from './util.js';

export class GLEngine {
  constructor(canvas){
    this.name = 'WebGL2';
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias:false, alpha:false, preserveDrawingBuffer:false });
    if (!gl) throw new Error('WebGL2 not available');
    if (!gl.getExtension('EXT_color_buffer_float'))
      throw new Error('EXT_color_buffer_float not available');
    this.gl = gl;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.progs = {
      sim:       this._program(VS_FULLSCREEN, FS_SIM),
      color:     this._program(VS_FULLSCREEN, FS_COLOR),
      accum:     this._program(VS_FULLSCREEN, FS_ACCUM),
      bright:    this._program(VS_FULLSCREEN, FS_BRIGHT),
      blur:      this._program(VS_FULLSCREEN, FS_BLUR),
      composite: this._program(VS_FULLSCREEN, FS_COMPOSITE),
      reduce:    this._program(VS_FULLSCREEN, FS_REDUCE),
    };
    this.fbo = gl.createFramebuffer();      // scratch FBO, re-attached per pass
    this.n = 0;
    this.stateTex = [null, null];
    this.accumTex = [null, null];
    this.cur = 0;
    this.curA = 0;
    this.gen = 0;
    this._readBuf = null;
    this._zeroBuf = null;
    this.viewTex = {};                       // scene/bloom textures for display
    this.REDUCE = 64;
    this.reduceTex = this._tex(this.REDUCE, this.REDUCE, gl.RGBA32F, gl.NEAREST);
    this.reduceBuf = new Float32Array(this.REDUCE * this.REDUCE * 4);
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  }

  _program(vsSrc, fsSrc){
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error('Shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error('Link: ' + gl.getProgramInfoLog(p));
    const uni = {}, count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++){
      const info = gl.getActiveUniform(p, i);
      uni[info.name.replace('[0]','')] = gl.getUniformLocation(p, info.name);
    }
    return { p, uni };
  }

  _tex(w, h, internal, filter){
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internal, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  _target(tex){ // bind scratch FBO to a texture (null = default framebuffer)
    const gl = this.gl;
    if (tex === null){ gl.bindFramebuffer(gl.FRAMEBUFFER, null); return; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  }

  createGrid(n){
    const gl = this.gl;
    this.stateTex.forEach(t => t && gl.deleteTexture(t));
    this.accumTex.forEach(t => t && gl.deleteTexture(t));
    this.n = n;
    this.stateTex = [
      this._tex(n, n, gl.RGBA32F, gl.NEAREST),
      this._tex(n, n, gl.RGBA32F, gl.NEAREST),
    ];
    this.accumTex = [
      this._tex(n, n, gl.RGBA32F, gl.NEAREST),
      this._tex(n, n, gl.RGBA32F, gl.NEAREST),
    ];
    this.cur = 0;
    this.curA = 0;
    this.gen = 0;
    this._readBuf = null;
    this._zeroBuf = null;
    this._accBuf = null; this._accGen = null; this._accCnt = null;
  }

  uploadCells(cells){ // Uint8Array n*n, index = y*n+x with y-up
    const gl = this.gl, n = this.n;
    const buf = new Float32Array(n * n * 4);
    for (let i = 0; i < n * n; i++){
      const s = cells[i];
      const j = i * 4;
      buf[j] = s; buf[j+1] = s; buf[j+2] = s; buf[j+3] = 1;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.cur]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, n, gl.RGBA, gl.FLOAT, buf);
    this.resetAccum();
  }

  /* Restore a timeline snapshot: age > 0 means alive. Keeps accumulation. */
  uploadAge(age, gen){
    const gl = this.gl, n = this.n;
    const buf = new Float32Array(n * n * 4);
    for (let i = 0; i < n * n; i++){
      const s = age[i] > 0 ? 1 : 0;
      const j = i * 4;
      buf[j] = s; buf[j+1] = age[i]; buf[j+2] = s; buf[j+3] = 1;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.cur]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, n, gl.RGBA, gl.FLOAT, buf);
    this.gen = gen;
  }

  /* Snapshot readback: Uint8Array of ages (0 = dead, clamped to 255). */
  readCells(){
    const gl = this.gl, n = this.n;
    this._target(this.stateTex[this.cur]);
    const buf = this._readBuf || (this._readBuf = new Float32Array(n * n * 4));
    gl.readPixels(0, 0, n, n, gl.RGBA, gl.FLOAT, buf);
    const age = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++)
      age[i] = buf[i*4] > 0.5 ? Math.max(1, Math.min(255, buf[i*4+1])) : 0;
    return age;
  }

  /* Long-exposure readback for the terrain mode (R = gen of last visit,
     G = visit count). Reuses cached buffers; caller throttles frequency. */
  readAccum(){
    const gl = this.gl, n = this.n;
    this._target(this.accumTex[this.curA]);
    const buf = this._accBuf || (this._accBuf = new Float32Array(n * n * 4));
    gl.readPixels(0, 0, n, n, gl.RGBA, gl.FLOAT, buf);
    const g = this._accGen || (this._accGen = new Float32Array(n * n));
    const c = this._accCnt || (this._accCnt = new Float32Array(n * n));
    for (let i = 0; i < n * n; i++){ g[i] = buf[i*4]; c[i] = buf[i*4+1]; }
    return { gen: g, cnt: c };
  }

  resetAccum(){
    const gl = this.gl, n = this.n;
    const z = this._zeroBuf || (this._zeroBuf = new Float32Array(n * n * 4));
    this.accumTex.forEach(t => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, n, gl.RGBA, gl.FLOAT, z);
    });
    this.gen = 0;
  }

  step(){
    const gl = this.gl, n = this.n, P = this.progs.sim;
    const src = this.stateTex[this.cur], dst = this.stateTex[1 - this.cur];
    this._target(dst);
    gl.viewport(0, 0, n, n);
    gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.uniform1i(P.uni.u_state, 0);
    gl.uniform2i(P.uni.u_size, n, n);
    gl.uniform1i(P.uni.u_birth, digitsToMask(state.birth));
    gl.uniform1i(P.uni.u_survive, digitsToMask(state.survive));
    gl.uniform1i(P.uni.u_wrap, state.wrap ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.cur = 1 - this.cur;
    this.gen++;
    // long-exposure accumulation pass
    const A = this.progs.accum;
    this._target(this.accumTex[1 - this.curA]);
    gl.viewport(0, 0, n, n);
    gl.useProgram(A.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.cur]);
    gl.uniform1i(A.uni.u_state, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.accumTex[this.curA]);
    gl.uniform1i(A.uni.u_accum, 1);
    gl.uniform1f(A.uni.u_gen, this.gen);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    this.curA = 1 - this.curA;
  }

  paint(x, y, alive, radius){
    const gl = this.gl, n = this.n;
    const r = radius | 0;
    const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r);
    const x1 = Math.min(n - 1, x + r), y1 = Math.min(n - 1, y + r);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (w <= 0 || h <= 0) return;
    const v = alive ? 1 : 0;
    const buf = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h; i++){ const j = i*4; buf[j]=v; buf[j+1]=v; buf[j+2]=v; buf[j+3]=1; }
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.cur]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, w, h, gl.RGBA, gl.FLOAT, buf);
  }

  getCell(x, y){
    const gl = this.gl;
    this._target(this.stateTex[this.cur]);
    const px = new Float32Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, px);
    return px[0] > 0.5 ? 1 : 0;
  }

  _reduce(){   // 64×64 block density map into reduceBuf
    const gl = this.gl, P = this.progs.reduce, R = this.REDUCE;
    const block = Math.ceil(this.n / R);
    this._target(this.reduceTex);
    gl.viewport(0, 0, R, R);
    gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.cur]);
    gl.uniform1i(P.uni.u_state, 0);
    gl.uniform2i(P.uni.u_size, this.n, this.n);
    gl.uniform1i(P.uni.u_block, block);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.readPixels(0, 0, R, R, gl.RGBA, gl.FLOAT, this.reduceBuf);
    return this.reduceBuf;
  }

  population(){
    const buf = this._reduce(), R = this.REDUCE;
    let sum = 0;
    for (let i = 0; i < R * R; i++) sum += buf[i * 4];
    return Math.round(sum);
  }

  _ensureViewTargets(w, h){
    const gl = this.gl, V = this.viewTex;
    if (V.w === w && V.h === h) return;
    ['scene','pingA','pingB'].forEach(k => V[k] && gl.deleteTexture(V[k]));
    V.w = w; V.h = h;
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    V.scene = this._tex(w, h, gl.RGBA8, gl.LINEAR);
    V.pingA = this._tex(hw, hh, gl.RGBA8, gl.LINEAR);
    V.pingB = this._tex(hw, hh, gl.RGBA8, gl.LINEAR);
    V.hw = hw; V.hh = hh;
  }

  _colorPass(target, w, h, uvScale, uvOffset, transparent){
    const gl = this.gl, P = this.progs.color, p = activePal();
    this._target(target);
    gl.viewport(0, 0, w, h);
    gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.cur]);
    gl.uniform1i(P.uni.u_state, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.accumTex[this.curA]);
    gl.uniform1i(P.uni.u_accum, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform3fv(P.uni.u_bg, p.bgRGB);
    const stops = new Float32Array(15);
    p.stopsRGB.forEach((c, i) => stops.set(c, i * 3));
    gl.uniform3fv(P.uni.u_stops, stops);
    gl.uniform1i(P.uni.u_numStops, p.stopsRGB.length);
    gl.uniform1f(P.uni.u_ageSpan, state.ageSpan);
    gl.uniform2fv(P.uni.u_uvScale, uvScale);
    gl.uniform2fv(P.uni.u_uvOffset, uvOffset);
    gl.uniform1f(P.uni.u_grid, this.n);
    gl.uniform1i(P.uni.u_shape, state.cellShape);
    gl.uniform1i(P.uni.u_mode, state.renderMode === 'history' ? 1 : 0);
    gl.uniform1f(P.uni.u_gen, this.gen);
    gl.uniform1i(P.uni.u_transparent, transparent ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  _simplePass(prog, target, w, h, tex, setUniforms){
    const gl = this.gl;
    this._target(target);
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    setUniforms(prog.uni);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* Full pipeline: color → (bright → blur×4 → composite) → target */
  _renderPipeline(target, w, h, uvScale, uvOffset, blurScale, transparent){
    const gl = this.gl;
    if (transparent || !state.bloom || activePal().lightBg){
      this._colorPass(target, w, h, uvScale, uvOffset, transparent);
      return;
    }
    this._ensureViewTargets(w, h);
    const V = this.viewTex;
    this._colorPass(V.scene, w, h, uvScale, uvOffset);
    // bright extract → pingA (half res)
    this._simplePass(this.progs.bright, V.pingA, V.hw, V.hh, V.scene, u => {
      gl.uniform1i(u.u_tex, 0);
      gl.uniform1f(u.u_threshold, 0.32);
    });
    // two blur iterations (H+V), second with wider spread
    const spreads = [1.0, 2.2];
    for (const s of spreads){
      this._simplePass(this.progs.blur, V.pingB, V.hw, V.hh, V.pingA, u => {
        gl.uniform1i(u.u_tex, 0);
        gl.uniform2f(u.u_dir, s * blurScale / V.hw, 0);
      });
      this._simplePass(this.progs.blur, V.pingA, V.hw, V.hh, V.pingB, u => {
        gl.uniform1i(u.u_tex, 0);
        gl.uniform2f(u.u_dir, 0, s * blurScale / V.hh);
      });
    }
    // composite
    this._target(target);
    gl.viewport(0, 0, w, h);
    const P = this.progs.composite;
    gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, V.scene);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, V.pingA);
    gl.uniform1i(P.uni.u_scene, 0);
    gl.uniform1i(P.uni.u_bloom, 1);
    gl.uniform1f(P.uni.u_intensity, state.bloomIntensity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  }

  render(){
    const w = this.canvas.width, h = this.canvas.height;
    const v = viewUV();
    this._renderPipeline(null, w, h, [v.s, v.s], [v.ox, v.oy], 1.0);
  }

  /* ── 6a. HD EXPORT (WebGL path) ── */
  renderToPixels(w, h, fitMode = 'fit', transparent = false){
    if (w > this.maxTex || h > this.maxTex)
      throw new Error(`Resolution exceeds GPU limit (${this.maxTex}px)`);
    const gl = this.gl;
    // UV mapping: 'fit' letterboxes the full grid (uv beyond [0,1] → bg in
    // shader); 'fill' center-crops; 'smart' crops to the densest window.
    let uvScale = [1,1], uvOffset = [0,0];
    if (fitMode === 'fit'){
      if (w > h){ const f = w / h; uvScale = [f, 1]; uvOffset = [(1 - f) / 2, 0]; }
      else if (h > w){ const f = h / w; uvScale = [1, f]; uvOffset = [0, (1 - f) / 2]; }
    } else if (w > h){
      const f = h / w;
      uvScale = [1, f];
      uvOffset = [0, fitMode === 'smart'
        ? bestWindowOffset(this._reduce(), this.REDUCE, 4, f, 'y') : (1 - f) / 2];
    } else if (h > w){
      const f = w / h;
      uvScale = [f, 1];
      uvOffset = [fitMode === 'smart'
        ? bestWindowOffset(this._reduce(), this.REDUCE, 4, f, 'x') : (1 - f) / 2, 0];
    }

    const out = this._tex(w, h, gl.RGBA8, gl.NEAREST);
    const savedView = this.viewTex;
    this.viewTex = {};                        // temporary bloom chain at export res
    try {
      this._renderPipeline(out, w, h, uvScale, uvOffset, Math.max(1, h / 900), transparent);
      this._target(out);
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      // flip vertically (GL origin is bottom-left)
      const flipped = new Uint8ClampedArray(w * h * 4);
      const row = w * 4;
      for (let y = 0; y < h; y++)
        flipped.set(pixels.subarray(y * row, (y + 1) * row), (h - 1 - y) * row);
      return { data: flipped, w, h };
    } finally {
      const V = this.viewTex;
      ['scene','pingA','pingB'].forEach(k => V[k] && gl.deleteTexture(V[k]));
      gl.deleteTexture(out);
      this.viewTex = savedView;
    }
  }

  dispose(){
    const gl = this.gl;
    this.stateTex.forEach(t => t && gl.deleteTexture(t));
    this.accumTex.forEach(t => t && gl.deleteTexture(t));
    const V = this.viewTex;
    ['scene','pingA','pingB'].forEach(k => V[k] && gl.deleteTexture(V[k]));
    gl.deleteTexture(this.reduceTex);
    gl.deleteFramebuffer(this.fbo);
  }
}
