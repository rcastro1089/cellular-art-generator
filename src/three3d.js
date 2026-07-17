/* ── SURFACES + 3D VOXEL MODE (lazy Three.js) ──────────────────── */
import { $ } from './util.js';
import { state, terrainHeight } from './state.js';
import { activePal, paletteLUT32 } from './palettes.js';
import { engine, canvas } from './engine.js';
import { Voxel3D } from './voxel.js';

let threeCanvasEl = $('threeCanvas');

export const THREE3D = {
  T: null, OrbitControls: null,
  EffectComposer: null, RenderPass: null, UnrealBloomPass: null, OutputPass: null,
  ShaderPass: null,
  renderer: null, scene: null, camera: null, controls: null,
  composer: null, bloomPass: null, lensPass: null, _sceneRadius: 18,
  mesh: null, texture: null, voxelMesh: null, ghostMesh: null, voxel: null,
  terrain: null, _terrainS: 0, _terrainMax: 1, _terrainGen: -1,
  _bhRadius: 0, _mat4: null, _col: null,
  get ready(){ return !!this.renderer; },
  get canvasEl(){ return threeCanvasEl; },   // live: teardown() swaps the element

  async load(){
    if (this.T) return true;
    try {
      const [three, oc, ec, rp, bp, op, sp] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
        import('three/addons/postprocessing/OutputPass.js'),
        import('three/addons/postprocessing/ShaderPass.js'),
      ]);
      this.T = three;
      this.OrbitControls = oc.OrbitControls;
      this.EffectComposer = ec.EffectComposer;
      this.RenderPass = rp.RenderPass;
      this.UnrealBloomPass = bp.UnrealBloomPass;
      this.OutputPass = op.OutputPass;
      this.ShaderPass = sp.ShaderPass;
      return true;
    } catch (err){
      console.error('Three.js load failed:', err);
      return false;
    }
  },

  /* Post-processing chain (neon bloom for dark themes). Rebuilt per scene.
     Black-hole scenes insert a gravitational-lens pass before bloom: a
     point-mass lens in screen space (source angle β = θ − θE²/θ) bends the
     accretion disk behind the hole into the Interstellar arcs, draws the
     event-horizon shadow and an additive photon ring. */
  setupComposer(){
    if (this.composer){ this.composer.dispose(); this.composer = null; this.bloomPass = null; this.lensPass = null; }
    if (!this.EffectComposer || !this.renderer || !this.scene) return;
    this.composer = new this.EffectComposer(this.renderer);
    this.composer.addPass(new this.RenderPass(this.scene, this.camera));
    if (this._bhRadius > 0 && this.ShaderPass){
      this.lensPass = new this.ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          uCenter:  { value: new this.T.Vector2(0.5, 0.5) },
          uRs:      { value: 0.12 },   // shadow radius, uv units (y-based)
          uAspect:  { value: 1 },
          uBg:      { value: new this.T.Vector3(0, 0, 0) },
          uGlow:    { value: new this.T.Vector3(1, 0.85, 0.6) },
        },
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          uniform sampler2D tDiffuse;
          uniform vec2 uCenter; uniform float uRs, uAspect;
          uniform vec3 uBg, uGlow;
          varying vec2 vUv;
          void main(){
            if (uRs < 1e-4){ gl_FragColor = texture2D(tDiffuse, vUv); return; }
            vec2 d = vUv - uCenter;
            d.x *= uAspect;
            float r = max(length(d), 1e-5);
            vec2 dir = d / r;
            float rE = uRs * 1.32;                       // Einstein radius just outside the shadow
            float rSrc = r - (rE * rE) / r;              // point-mass deflection (negative → secondary image)
            vec2 suv = uCenter + dir * rSrc / vec2(uAspect, 1.0);
            vec3 col = (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0)
              ? uBg : texture2D(tDiffuse, suv).rgb;
            col *= smoothstep(uRs * 0.92, uRs, r);       // event-horizon shadow, soft edge
            float ring = exp(-pow((r - uRs * 1.03) / (uRs * 0.04), 2.0));
            col += uGlow * ring * 0.85;                  // photon ring
            gl_FragColor = vec4(col, 1.0);
          }`,
      });
      this.composer.addPass(this.lensPass);
    }
    this.bloomPass = new this.UnrealBloomPass(
      new this.T.Vector2(threeCanvasEl.width, threeCanvasEl.height), 0.35, 0.3, 0.6);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new this.OutputPass());
  },

  /* Per-frame lens uniforms: project the hole (world origin) to screen uv
     and derive its apparent shadow radius from camera distance + fov. */
  _updateLens(){
    if (!this.lensPass || !this.camera) return;
    const T = this.T, cam = this.camera, u = this.lensPass.uniforms;
    const v = new T.Vector3(0, 0, 0).project(cam);
    u.uCenter.value.set((v.x + 1) / 2, (v.y + 1) / 2);
    const dist = cam.position.length();
    const halfTan = Math.tan(cam.fov * Math.PI / 360);
    u.uRs.value = (v.z > 1 || dist <= this._bhRadius * 1.05)
      ? 0 : 0.5 * (this._bhRadius / Math.sqrt(Math.max(dist * dist - this._bhRadius * this._bhRadius, 1e-4))) / halfTan;
    u.uAspect.value = cam.aspect;
    const p = activePal(), glow = p.stopsRGB.at(-1);
    u.uBg.value.set(...p.bgRGB);
    u.uGlow.value.set(glow[0], glow[1], glow[2]);
  },

  initRenderer(){
    if (this.renderer) return true;
    const T = this.T;
    try {
      this.renderer = new T.WebGLRenderer({ canvas: threeCanvasEl, antialias: true });
    } catch (err){
      console.error('WebGL unavailable for 3D mode:', err);
      this.renderer = null;
      return false;
    }
    this.camera = new T.PerspectiveCamera(45, 1, 0.1, 4000);
    this.controls = new this.OrbitControls(this.camera, threeCanvasEl);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotate = state.autoRotate;
    this.controls.autoRotateSpeed = 1.6;
    return true;
  },

  /* Live CA canvas (palette + bloom included) as texture for all surfaces. */
  _makeCanvasTexture(){
    const T = this.T;
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.generateMipmaps = false;
    tex.minFilter = T.LinearFilter;
    return tex;
  },

  /* Möbius strip: one-sided surface, u swept twice around while the strip
     half-twists. UV.x repeats the CA 3× along the band. */
  _mobiusGeometry(){
    const T = this.T, R = 7.5, W = 3.2, SU = 240, SV = 14;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= SU; i++){
      const u = i / SU * Math.PI * 2;
      for (let j = 0; j <= SV; j++){
        const v = (j / SV - 0.5) * 2 * W;
        const c = R + v * Math.cos(u / 2);
        pos.push(c * Math.cos(u), v * Math.sin(u / 2), c * Math.sin(u));
        uv.push(i / SU * 3, j / SV);
      }
    }
    for (let i = 0; i < SU; i++)
    for (let j = 0; j < SV; j++){
      const a = i * (SV + 1) + j, b = a + SV + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new T.BufferGeometry();
    g.setIndex(idx);
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    return g;
  },

  /* Torus / sphere / knot / Möbius: the 2D CA keeps simulating; its rendered
     canvas is used as a live texture on the mesh. */
  buildSurface(kind){
    const T = this.T;
    this.disposeScene();
    this.voxel = null;
    this.scene = new T.Scene();
    this.scene.background = new T.Color().setRGB(...activePal().bgRGB, T.SRGBColorSpace);
    this.texture = this._makeCanvasTexture();
    const geo = kind === 'torus'  ? new T.TorusGeometry(10, 4.2, 96, 160)
              : kind === 'sphere' ? new T.SphereGeometry(8.5, 128, 96)   // equirect UVs
              : kind === 'knot'   ? new T.TorusKnotGeometry(9, 2.6, 300, 40)
              :                     this._mobiusGeometry();
    this.mesh = new T.Mesh(geo, new T.MeshBasicMaterial({
      map: this.texture,
      side: kind === 'mobius' ? T.DoubleSide : T.FrontSide,
    }));
    this.scene.add(this.mesh);
    const cam = {
      torus:  { r: 14.6, pos: [0, 13, 22] },
      sphere: { r: 8.8,  pos: [0, 0, 26] },
      knot:   { r: 12.5, pos: [0, 9, 25] },
      mobius: { r: 11,   pos: [0, 7, 21] },
    }[kind];
    this._sceneRadius = cam.r;
    this.camera.position.set(...cam.pos);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.controls.saveState();
    this.setupComposer();
  },

  /* Gargantua: the scene holds ONLY the accretion disk (the CA is the
     plasma, polar UVs, Doppler-brightened approaching side). The shadow,
     photon ring and the lensed arcs over/under the hole all come from the
     gravitational-lens post pass — the disk behind the hole is rendered
     (nothing occludes it) and the lens bends its image around the shadow,
     so the curves stay physical from any camera angle. */
  buildBlackHole(){
    const T = this.T;
    this.disposeScene();
    this.voxel = null;
    this._bhRadius = 3.4;
    this.scene = new T.Scene();
    this.scene.background = new T.Color().setRGB(...activePal().bgRGB, T.SRGBColorSpace);
    this.texture = this._makeCanvasTexture();
    const IN = 4.0, OUT = 13.5;
    const disk = new T.RingGeometry(IN, OUT, 200, 24);
    {
      const p = disk.attributes.position, u = disk.attributes.uv;
      const vc = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++){                  // planar → polar UVs
        const x = p.getX(i), y = p.getY(i);
        const ang = Math.atan2(y, x), rad = (Math.hypot(x, y) - IN) / (OUT - IN);
        u.setXY(i, (ang / (Math.PI * 2) + 0.5) * 2, rad);
        // Doppler beaming (approaching side brighter) + hotter inner edge
        const b = (0.55 + 0.5 * Math.cos(ang)) * (1.35 - 0.55 * rad);
        vc[i*3] = vc[i*3+1] = vc[i*3+2] = b;
      }
      disk.setAttribute('color', new T.BufferAttribute(vc, 3));
    }
    const diskMesh = new T.Mesh(disk, new T.MeshBasicMaterial({
      map: this.texture, vertexColors: true, side: T.DoubleSide }));
    diskMesh.rotation.x = -Math.PI / 2;
    this.scene.add(diskMesh);
    this._sceneRadius = 13.5;
    this.camera.position.set(0, 2.3, 26);                 // grazing view → lensed arcs
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.controls.saveState();
    this.setupComposer();
  },

  /* Exposure terrain: the long-exposure history extruded into a landscape.
     Vertex height = log-scaled visit count (ridges where the CA lived
     longest), vertex color = palette by generation of last visit — the same
     semantics as the 2D long-exposure shader, so the terrain IS the artwork.
     Geometry streams from engine.readAccum(), throttled to every few gens. */
  buildTerrain(){
    const T = this.T;
    this.disposeScene();
    this.voxel = null;
    this.scene = new T.Scene();
    this.scene.background = new T.Color().setRGB(...activePal().bgRGB, T.SRGBColorSpace);
    const S = this._terrainS = Math.min(state.grid, 176);   // vertex grid (decimates big CA grids)
    const geo = new T.PlaneGeometry(24, 24, S, S);
    geo.rotateX(-Math.PI / 2);                              // heights along +Y
    geo.setAttribute('color', new T.BufferAttribute(new Float32Array((S+1)*(S+1)*3), 3));
    this.terrain = new T.Mesh(geo, new T.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85, metalness: 0 }));
    this.scene.add(this.terrain);
    const paper = state.theme === 'light' || activePal().lightBg;   // hillshade-on-white for print
    this.scene.add(new T.AmbientLight(0xffffff, paper ? 1.15 : 0.55));
    this.scene.add(new T.HemisphereLight(0xbbccff, 0x221133, paper ? 0.25 : 0.5));
    const dir = new T.DirectionalLight(0xffffff, paper ? 0.85 : 1.5);
    dir.position.set(1.2, 1.6, 0.9);
    this.scene.add(dir);
    this._terrainMax = 1;
    this._terrainGen = -1;
    this._sceneRadius = 15;
    this.camera.position.set(0, 17, 23);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.controls.saveState();
    this.setupComposer();
    this.refreshTerrain(true);
  },

  refreshTerrain(force){
    if (!this.terrain || !engine.readAccum) return;
    if (!force && engine.gen - this._terrainGen < 4) return;   // throttle GPU readback
    this._terrainGen = engine.gen;
    const acc = engine.readAccum();
    const n = engine.n, S = this._terrainS;
    const geo = this.terrain.geometry;
    const pos = geo.attributes.position, col = geo.attributes.color;
    const pal = activePal(), bg = pal.bgRGB;
    const LUT = paletteLUT32(pal);
    const gen = Math.max(engine.gen, 1);
    /* Box-average each vertex over its patch of cells: smooth ridges instead
       of a nearest-neighbor spike field on decimated grids. */
    const edge = new Int32Array(S + 2);                        // cell boundaries per vertex row/col
    for (let i = 0; i <= S + 1; i++) edge[i] = Math.min(Math.round((i - 0.5) / S * n), n);
    const V = (S + 1) * (S + 1);
    const hCnt = this._hCnt && this._hCnt.length === V ? this._hCnt : (this._hCnt = new Float32Array(V));
    const hGen = this._hGen && this._hGen.length === V ? this._hGen : (this._hGen = new Float32Array(V));
    let mx = 1, k = 0;
    for (let i = 0; i <= S; i++){
      // plane rows go far→near; engine rows are y-up → row i samples rows (S−i)
      const y0 = Math.max(edge[S - i], 0), y1 = Math.max(edge[S - i + 1], y0 + 1);
      for (let j = 0; j <= S; j++, k++){
        const x0 = Math.max(edge[j], 0), x1 = Math.max(edge[j + 1], x0 + 1);
        let sc = 0, sg = 0, nv = 0;
        for (let y = y0; y < y1; y++){
          const row = y * n;
          for (let x = x0; x < x1; x++){
            const c = acc.cnt[row + x];
            if (c){ sc += c; sg += acc.gen[row + x]; nv++; }
          }
        }
        const area = (y1 - y0) * (x1 - x0);
        hCnt[k] = sc / area;                                   // unvisited cells pull ridges down
        hGen[k] = nv ? sg / nv : 0;
        if (hCnt[k] > mx) mx = hCnt[k];
      }
    }
    /* Separable [1,2,1] blur ×2 on the heightfield: chaotic soups read as
       rolling hills instead of a spike field; real ridges survive. */
    const tmp = this._hTmp && this._hTmp.length === V ? this._hTmp : (this._hTmp = new Float32Array(V));
    const W = S + 1;
    for (let pass = 0; pass < 2; pass++){
      for (let i = 0; i < W; i++){
        const r = i * W;
        for (let j = 0; j < W; j++){
          const l = j > 0 ? hCnt[r+j-1] : hCnt[r+j], rr = j < S ? hCnt[r+j+1] : hCnt[r+j];
          tmp[r+j] = (l + 2 * hCnt[r+j] + rr) * 0.25;
        }
      }
      for (let j = 0; j < W; j++){
        for (let i = 0; i < W; i++){
          const u = i > 0 ? tmp[(i-1)*W+j] : tmp[i*W+j], d = i < S ? tmp[(i+1)*W+j] : tmp[i*W+j];
          hCnt[i*W+j] = (u + 2 * tmp[i*W+j] + d) * 0.25;
        }
      }
    }
    mx = 1;
    for (k = 0; k < V; k++) if (hCnt[k] > mx) mx = hCnt[k];
    this._terrainMax = mx;
    const H = 5.2 * state.terrainRelief;
    for (k = 0; k < V; k++){
      pos.setY(k, H * terrainHeight(hCnt[k], mx));
      if (hCnt[k] > 0){
        const c = LUT[Math.min(31, Math.floor(Math.min(hGen[k] / gen, 1) * 31))];
        col.setXYZ(k, c[0], c[1], c[2]);
      } else col.setXYZ(k, bg[0], bg[1], bg[2]);
    }
    pos.needsUpdate = col.needsUpdate = true;
    geo.computeVertexNormals();
  },

  buildVoxelWorld(){
    const T = this.T;
    this.disposeScene();
    const n = state.voxelN;
    this.voxel = new Voxel3D(n);
    this.voxel.randomFill(Math.min(0.45, state.density * 2));
    this.scene = new T.Scene();
    this.scene.background = new T.Color().setRGB(...activePal().bgRGB, T.SRGBColorSpace);
    this.scene.add(new T.AmbientLight(0xffffff, 0.85));
    this.scene.add(new T.HemisphereLight(0xbbccff, 0x220a33, 0.55));
    const dir = new T.DirectionalLight(0xffffff, 1.6);
    dir.position.set(1, 1.4, 0.8);
    this.scene.add(dir);
    const mat = new T.MeshLambertMaterial({ transparent: true, opacity: state.voxelOpacity });
    mat.depthWrite = state.voxelOpacity >= 0.99;
    mat.defines = { USE_UV: '' };
    mat.onBeforeCompile = sh => {   // edge glow: brighten cube face borders
      sh.fragmentShader = sh.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec4 diffuseColor = vec4( diffuse, opacity );
        { vec2 eguv = abs(vUv - 0.5);
          diffuseColor.rgb *= 1.0 + smoothstep(0.34, 0.5, max(eguv.x, eguv.y)) * 1.1; }`);
    };
    this.voxelMesh = new T.InstancedMesh(new T.BoxGeometry(0.92, 0.92, 0.92), mat, n * n * n);
    this.voxelMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.scene.add(this.voxelMesh);
    /* long-exposure ghosts: dead-but-visited cells, colored by time of last
       visit and dimmed toward bg by visit count (3D mirror of the 2D accum) */
    this.ghostMesh = new T.InstancedMesh(
      new T.BoxGeometry(0.92, 0.92, 0.92), new T.MeshBasicMaterial(), n * n * n);
    this.ghostMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.scene.add(this.ghostMesh);
    const frame3d = new T.LineSegments(
      new T.EdgesGeometry(new T.BoxGeometry(n, n, n)),
      new T.LineBasicMaterial({ color: 0x666688, transparent: true, opacity: 0.4 }));
    this.scene.add(frame3d);
    this.refreshVoxels();
    this._sceneRadius = n * 0.9;
    this.camera.position.set(n * 1.15, n * 0.95, n * 1.5);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.controls.saveState();
    this.setupComposer();
  },

  /* Rebuild instance matrices + colors after each step.
     history mode (3D analogue of the 2D long-exposure shader):
       live cubes  → colored by birth gen (old structures → first stop,
                     fresh front → last stop),
       ghost cubes → dead-but-visited cells at half size, colored by gen
                     of last visit, dimmed toward bg by visit count.
     live mode: palette by age/ageSpan (as before). */
  refreshVoxels(){
    if (!this.voxel || !this.voxelMesh) return;
    const T = this.T, vm = this.voxelMesh, gm = this.ghostMesh, vx = this.voxel;
    const n = vx.n, n2 = n * n, half = (n - 1) / 2;
    const m = this._mat4 || (this._mat4 = new T.Matrix4());
    const col = this._col || (this._col = new T.Color());
    const pal = activePal();
    const span = state.ageSpan, bg = pal.bgRGB;
    const LUT = paletteLUT32(pal);
    const history = state.renderMode === 'history';
    const gen = Math.max(vx.gen, 1);
    const sz = state.voxelSize, gsz = sz * 0.55;
    const axis = state.sliceAxis, cut = Math.ceil(n * state.slicePct / 100);
    let idx = 0, gidx = 0;
    for (let z = 0; z < n; z++){
      if (axis === 'z' && z >= cut) continue;
      for (let y = 0; y < n; y++){
        if (axis === 'y' && y >= cut) continue;
        const row = z * n2 + y * n;
        for (let x = 0; x < n; x++){
          if (axis === 'x' && x >= cut) continue;
          const i = row + x;
          if (vx.cells[i]){
            const t = history ? vx.born[i] / gen : Math.min(vx.age[i] / span, 1);
            m.makeScale(sz, sz, sz).setPosition(x - half, y - half, z - half);
            vm.setMatrixAt(idx, m);
            const c = LUT[Math.min(31, Math.floor(Math.min(t, 1) * 31))];
            col.setRGB(c[0], c[1], c[2], T.SRGBColorSpace);
            vm.setColorAt(idx, col);
            idx++;
          } else if (history && gm && vx.visitCnt[i]){
            const c = LUT[Math.min(31, Math.floor(Math.min(vx.lastVisit[i] / gen, 1) * 31))];
            const w = Math.min(Math.max(vx.visitCnt[i] / 24, 0.30), 1) * 0.8;
            m.makeScale(gsz, gsz, gsz).setPosition(x - half, y - half, z - half);
            gm.setMatrixAt(gidx, m);
            col.setRGB(
              bg[0] + (c[0] - bg[0]) * w,
              bg[1] + (c[1] - bg[1]) * w,
              bg[2] + (c[2] - bg[2]) * w, T.SRGBColorSpace);
            gm.setColorAt(gidx, col);
            gidx++;
          }
        }
      }
    }
    vm.count = idx;
    vm.instanceMatrix.needsUpdate = true;
    if (vm.instanceColor) vm.instanceColor.needsUpdate = true;
    if (gm){
      gm.count = gidx;
      gm.instanceMatrix.needsUpdate = true;
      if (gm.instanceColor) gm.instanceColor.needsUpdate = true;
    }
  },

  renderFrame(){
    if (!this.renderer || !this.scene) return;
    const p = activePal();
    if (this.scene.background && this.scene.background.isColor)
      this.scene.background.setRGB(...p.bgRGB, this.T.SRGBColorSpace);
    this.controls.update();
    const wantBloom = state.bloom && !p.lightBg;
    if (this.composer && (wantBloom || this.lensPass)){   // lens needs the composer even with bloom off
      this.bloomPass.enabled = wantBloom;
      this.bloomPass.strength = 0.1 + state.bloomIntensity * 0.25;
      this._updateLens();
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  },

  /* HD export of the current 3D view. Renders (with bloom) at export size
     into the drawing buffer and reads it back; the camera is dollied so the
     object fills the frame regardless of the on-screen zoom. */
  exportPixels(w, h){
    const T = this.T, r = this.renderer;
    const maxT = r.capabilities.maxTextureSize;
    if (w > maxT || h > maxT)
      throw new Error(`Resolution exceeds GPU limit (${maxT}px)`);
    const cam = this.camera;
    const oldAspect = cam.aspect, oldPos = cam.position.clone(), oldPR = r.getPixelRatio();
    const oldSize = new T.Vector2();
    r.getSize(oldSize);
    cam.aspect = w / h;
    // frame the object: dolly along the current view direction
    const target = this.controls.target;
    const dir = cam.position.clone().sub(target).normalize();
    const vFov = cam.fov * Math.PI / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
    const dist = this._sceneRadius * 1.08 / Math.sin(Math.min(vFov, hFov) / 2);
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.updateProjectionMatrix();
    const wantBloom = state.bloom && !activePal().lightBg;
    const useComposer = this.composer && (wantBloom || this.lensPass);
    try {
      r.setPixelRatio(1);
      r.setSize(w, h, false);
      if (useComposer){
        this.composer.setSize(w, h);
        this.bloomPass.enabled = wantBloom;
        this.bloomPass.strength = 0.1 + state.bloomIntensity * 0.25;
        this._updateLens();
        this.composer.render();
      } else {
        r.render(this.scene, cam);
      }
      const gl = r.getContext();
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const flipped = new Uint8ClampedArray(w * h * 4);   // GL rows are bottom-up
      const row = w * 4;
      for (let y = 0; y < h; y++)
        flipped.set(px.subarray(y * row, (y + 1) * row), (h - 1 - y) * row);
      for (let i = 3; i < flipped.length; i += 4) flipped[i] = 255;
      return { data: flipped, w, h };
    } finally {
      r.setPixelRatio(oldPR);
      r.setSize(oldSize.x, oldSize.y, false);
      if (this.composer) this.composer.setSize(oldSize.x, oldSize.y);
      cam.aspect = oldAspect;
      cam.position.copy(oldPos);
      cam.updateProjectionMatrix();
    }
  },

  disposeScene(){
    if (!this.scene) return;
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material)
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(mt => {
          if (mt.map) mt.map.dispose();
          mt.dispose();
        });
    });
    if (this.voxelMesh && this.voxelMesh.dispose) this.voxelMesh.dispose();
    if (this.ghostMesh && this.ghostMesh.dispose) this.ghostMesh.dispose();
    this.scene = null; this.mesh = null; this.texture = null;
    this.voxelMesh = null; this.ghostMesh = null;
    this.terrain = null; this._bhRadius = 0; this._terrainGen = -1; this._terrainMax = 1;
  },

  /* Full teardown when returning to planar: free every GPU resource and
     the GL context. (The ES module itself stays cached by the browser.) */
  teardown(){
    this.disposeScene();
    this.voxel = null;
    if (this.composer){ this.composer.dispose(); this.composer = null; this.bloomPass = null; }
    if (this.controls){ this.controls.dispose(); this.controls = null; }
    if (this.renderer){
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
      this.camera = null;
      const fresh = threeCanvasEl.cloneNode(false);   // clean canvas → clean GL context next time
      threeCanvasEl.parentNode.replaceChild(fresh, threeCanvasEl);
      threeCanvasEl = fresh;
    }
  },
};
