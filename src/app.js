/* ── APP — UI bindings, mode orchestration, main loop, init ──────
   All $()/addEventListener glue lives here (or in the self-contained
   feature modules exports.js / ambience.js / timeline.js). */
import { $, toast, icon } from './util.js';
import { state, VIEW2D, viewUV, coverUV, clampView } from './state.js';
import { PALETTES, activePal } from './palettes.js';
import { PRESET_RULES, PATTERNS, PRESET_RULES_3D, parseDigits, parse3dCounts, ruleString } from './rules.js';
import { engine, canvas } from './engine.js';
import { THREE3D } from './three3d.js';
import { SNAP, resetSnapshots, maybeSnapshot, updateHistoryUI } from './timeline.js';
import { AMBIENCE } from './ambience.js';

/* ── GRID OPERATIONS (engine-agnostic; y-up convention) ────────── */
function newCells(){ return new Uint8Array(state.grid * state.grid); }

export function randomFill(){
  if (state.viewMode === 'voxel' && THREE3D.voxel){
    THREE3D.voxel.randomFill(Math.min(0.45, state.density * 2));
    THREE3D.refreshVoxels();
    refreshStats(true);
    return;
  }
  const n = state.grid, cells = newCells();
  for (let i = 0; i < cells.length; i++) cells[i] = Math.random() < state.density ? 1 : 0;
  engine.uploadCells(cells);
  state.gen = 0;
  resetSnapshots();
  refreshStats(true);
}
export function clearGrid(){
  if (state.viewMode === 'voxel' && THREE3D.voxel){
    THREE3D.voxel.clear();
    THREE3D.refreshVoxels();
    refreshStats(true);
    return;
  }
  engine.uploadCells(newCells());
  state.gen = 0;
  resetSnapshots();
  refreshStats(true);
}
function loadPattern(name){
  const coords = PATTERNS[name];
  if (!coords) return;
  const n = state.grid, cells = newCells();
  let maxR = 0, maxC = 0;
  coords.forEach(([r, c]) => { maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); });
  const cx = Math.floor(n / 2 - maxC / 2), cy = Math.floor(n / 2 + maxR / 2);
  coords.forEach(([r, c]) => {
    const x = cx + c, y = cy - r;      // pattern rows grow downward, engine y grows up
    if (x >= 0 && y >= 0 && x < n && y < n) cells[y * n + x] = 1;
  });
  engine.uploadCells(cells);
  state.gen = 0;
  resetSnapshots();
  refreshStats(true);
  toast(`Pattern loaded: ${name}`, 'ok');
}
function setGridSize(n){
  state.grid = n;
  engine.createGrid(n);
  randomFill();
}

/* ── RULES UI ──────────────────────────────────────────────────── */
export function applyRules(bStr, sStr, fromPreset){
  const bOk = /^[0-8]*$/.test(bStr), sOk = /^[0-8]*$/.test(sStr);
  $('birthInput').classList.toggle('invalid', !bOk);
  $('surviveInput').classList.toggle('invalid', !sOk);
  if (!bOk || !sOk){ toast('Rules accept digits 0-8 only', 'err'); return; }
  state.birth = parseDigits(bStr);
  state.survive = parseDigits(sStr);
  $('birthInput').value = state.birth.join('');
  $('surviveInput').value = state.survive.join('');
  const match = PRESET_RULES.find(r => r.b === state.birth.join('') && r.s === state.survive.join(''));
  $('ruleName').textContent = `${ruleString()} — ${match ? match.name : 'Custom'}`;
  $('stRule').textContent = ruleString();
  $('ruleSelect').value = match ? match.name : '';
  if (!fromPreset) toast(`Rules applied: ${ruleString()}`, 'ok');
}

/* playback */
export function setRunning(run){
  if (run && SNAP.scrub !== null){
    SNAP.list.length = SNAP.scrub + 1;      // resuming from a rewind forks history
    SNAP.scrub = null;
    updateHistoryUI();
  }
  state.running = run;
  if (run) $('playBtn').classList.remove('pulse');   // invitation served
  $('playBtn').innerHTML = icon(run ? 'pause' : 'play');
  $('playBtn').title = run ? 'Pause' : 'Play';
}

/* First user-initiated play also starts the selected ambience sound (the
   click is the autoplay gesture). Only once per session — after that, sim
   playback and sound are independent (stopping the sound stays stopped). */
let inviting = true;
function userPlayToggle(){
  const run = !state.running;
  setRunning(run);
  if (run && inviting){
    inviting = false;
    if (!AMBIENCE.playing)
      AMBIENCE.start().catch(err => console.warn('Ambience autostart failed:', err.message));
  }
}
function doStep(){
  if (state.viewMode === 'voxel'){
    if (THREE3D.voxel){ THREE3D.voxel.step(); THREE3D.refreshVoxels(); refreshStats(true); }
    return;
  }
  engine.step(); state.gen++; maybeSnapshot(); refreshStats(true);
}
$('playBtn').addEventListener('click', userPlayToggle);
$('stepBtn').addEventListener('click', () => { setRunning(false); doStep(); });
$('randomBtn').addEventListener('click', randomFill);
$('clearBtn').addEventListener('click', () => { setRunning(false); clearGrid(); });
$('speedRange').addEventListener('input', e => { state.speed = +e.target.value; $('speedVal').textContent = state.speed; });
$('densityRange').addEventListener('input', e => { state.density = e.target.value / 100; $('densityVal').textContent = e.target.value + '%'; });
$('gridSelect').addEventListener('change', e => {
  const n = +e.target.value;
  if (engine.name === 'Canvas2D' && n > 1000){
    toast('Large grids are slow without WebGL2', 'err');
  }
  setGridSize(n);
  toast(`Grid: ${n} × ${n}`, 'ok');
});

/* rules */
$('applyRuleBtn').addEventListener('click', () => applyRules($('birthInput').value, $('surviveInput').value));
[$('birthInput'), $('surviveInput')].forEach(inp =>
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('applyRuleBtn').click(); }));
{
  const sel = $('ruleSelect');
  const ph = document.createElement('option');
  ph.value = ''; ph.textContent = '— Rule presets —';
  sel.appendChild(ph);
  PRESET_RULES.forEach(r => {
    const o = document.createElement('option');
    o.value = r.name;
    o.textContent = `${r.name}  (B${r.b}/S${r.s})`;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    const r = PRESET_RULES.find(x => x.name === sel.value);
    if (r){ applyRules(r.b, r.s, true); toast(`Rule: ${r.name} (B${r.b}/S${r.s})`, 'ok'); }
  });
}

/* patterns */
{
  const sel = $('patternSelect');
  Object.keys(PATTERNS).forEach(name => {
    const o = document.createElement('option');
    o.value = o.textContent = name;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    if (!sel.value) return;
    setRunning(false);
    loadPattern(sel.value);
    sel.value = '';
  });
}

/* palettes */
function setPalette(p){
  state.palette = p;
  document.querySelectorAll('.pal').forEach(el => el.classList.toggle('active', el.dataset.name === p.name));
  document.documentElement.style.setProperty('--glow', p.stops[0]);
  if (state.viewMode === 'voxel') THREE3D.refreshVoxels();   // recolor while paused
}
{
  const grid = $('paletteGrid');
  PALETTES.forEach(p => {
    const b = document.createElement('button');
    b.className = 'pal' + (p === state.palette ? ' active' : '');
    b.dataset.name = p.name;
    b.title = p.name;
    b.innerHTML = `<div class="strip" style="background:linear-gradient(90deg,${p.stops.join(',')})"></div><span class="nm">${p.name}</span>`;
    b.addEventListener('click', () => setPalette(p));
    grid.appendChild(b);
  });
  document.documentElement.style.setProperty('--glow', state.palette.stops[0]);
}

/* bloom */
$('bloomToggle').addEventListener('change', e => { state.bloom = e.target.checked; });
$('bloomRange').addEventListener('input', e => {
  state.bloomIntensity = e.target.value / 10;
  $('bloomVal').textContent = state.bloomIntensity.toFixed(1);
});

/* theme + render mode + cell shape */
document.querySelectorAll('#themeSeg .btn').forEach(b =>
  b.addEventListener('click', () => {
    state.theme = b.dataset.theme;
    document.querySelectorAll('#themeSeg .btn').forEach(x => x.classList.toggle('on', x === b));
    if (state.viewMode === 'voxel') THREE3D.refreshVoxels();
    toast(state.theme === 'light' ? 'Paper theme — print ready' : 'Dark theme', 'ok');
  }));
document.querySelectorAll('#renderSeg .btn').forEach(b =>
  b.addEventListener('click', () => {
    state.renderMode = b.dataset.render;
    document.querySelectorAll('#renderSeg .btn').forEach(x => x.classList.toggle('on', x === b));
    $('resetExpBtn').style.display = state.renderMode === 'history' ? '' : 'none';
    if (state.viewMode === 'voxel') THREE3D.refreshVoxels();   // show/hide ghosts
    toast(state.renderMode === 'history' ? 'Long exposure — history accumulates' : 'Live mode', 'ok');
  }));
$('resetExpBtn').addEventListener('click', () => {
  if (state.viewMode === 'voxel' && THREE3D.voxel){
    THREE3D.voxel.resetExposure();
    THREE3D.refreshVoxels();
  } else {
    engine.resetAccum();
    state.gen = 0;
    resetSnapshots();
  }
  if (THREE3D.terrain) THREE3D.refreshTerrain(true);   // flatten the landscape
  refreshStats(true);
  toast('Exposure reset — accumulation starts fresh', 'ok');
});
$('shapeSelect').addEventListener('change', e => { state.cellShape = +e.target.value; });

/* ── INTERACTION (pointer events: mouse + touch) ───────────────── */
let painting = false, paintValue = 1;
export function eventToCell(e){
  const rect = canvas.getBoundingClientRect();
  const xN = (e.clientX - rect.left) / rect.width;
  const yN = (e.clientY - rect.top) / rect.height;
  if (xN < 0 || yN < 0 || xN >= 1 || yN >= 1) return null;
  const c = coverUV(canvas.width, canvas.height);   // pan/zoom + cover-crop window
  const ux = xN * c.sx + c.ox, uy = (1 - yN) * c.sy + c.oy;
  if (ux < 0 || uy < 0 || ux >= 1 || uy >= 1) return null;
  const n = state.grid;
  return { x: Math.floor(ux * n), y: Math.floor(uy * n) };   // engine y-up
}
function brushRadius(){ return state.grid >= 1000 ? (state.grid >= 2000 ? 3 : 1) : 0; }
let panDrag = null;
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  if (panMode){
    panDrag = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
    return;
  }
  const cell = eventToCell(e);
  if (!cell) return;
  const kill = e.button === 2 || e.shiftKey;
  paintValue = kill ? 0 : (engine.getCell(cell.x, cell.y) ? 0 : 1);  // toggle on tap
  painting = true;
  engine.paint(cell.x, cell.y, paintValue, brushRadius());
});
canvas.addEventListener('pointermove', e => {
  if (panDrag){
    const rect = canvas.getBoundingClientRect(), v = viewUV();
    VIEW2D.cx -= (e.clientX - panDrag.x) / rect.width * v.s;
    VIEW2D.cy += (e.clientY - panDrag.y) / rect.height * v.s;   // engine y-up
    panDrag = { x: e.clientX, y: e.clientY };
    clampView();
    return;
  }
  if (!painting) return;
  const cell = eventToCell(e);
  if (cell) engine.paint(cell.x, cell.y, paintValue, brushRadius());
});
['pointerup','pointercancel'].forEach(ev => canvas.addEventListener(ev, () => {
  painting = false;
  panDrag = null;
  if (panMode) canvas.style.cursor = 'grab';
}));
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  if (state.viewMode !== 'planar') return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  zoom2d(e.deltaY < 0 ? 1.12 : 1 / 1.12,
    (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
}, { passive: false });

/* keyboard */
document.addEventListener('keydown', e => {
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  switch (e.key){
    case ' ': e.preventDefault(); userPlayToggle(); break;
    case 'r': case 'R': randomFill(); break;
    case 'c': case 'C': setRunning(false); clearGrid(); break;
    case 's': case 'S': setRunning(false); doStep(); break;
  }
});

/* ── VIEW MODE ORCHESTRATION ───────────────────────────────────── */
function updateModeUI(){
  const m = state.viewMode;
  document.querySelectorAll('#modeSeg .btn').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  $('voxelBtn').classList.toggle('primary', m === 'voxel');
  $('voxelBtn').innerHTML = m === 'voxel' ? icon('grid') + 'Exit Voxel Mode' : icon('cube') + '3D Voxel Mode';
  $('voxelCard').classList.toggle('hiddenCard', m !== 'voxel');
  updateHistoryUI();   // timeline card visibility (voxel-aware)
  $('orbitControlsBox').style.display = m === 'planar' ? 'none' : 'block';
  $('terrainBox').style.display = m === 'terrain' ? 'block' : 'none';
  $('canvasWrap').classList.toggle('mode3d', m !== 'planar');
  $('viewBar').classList.toggle('planar', m === 'planar');
  if (m !== 'planar') $('vbZoomLbl').textContent = '';
  else clampView();
  applyPanMode();   // re-apply drag binding to whichever canvas/controls are active
}
function updateModeHash(){
  const base = location.pathname + location.search;
  history.replaceState(null, '', state.viewMode === 'planar' ? base : base + '#mode=' + state.viewMode);
}

let switching3d = false;
async function setViewMode(mode){
  if (switching3d || mode === state.viewMode) return;
  if (mode === 'planar'){
    state.viewMode = 'planar';
    THREE3D.teardown();
    updateModeUI(); updateModeHash(); refreshStats(true);
    toast('Planar mode', 'ok');
    return;
  }
  switching3d = true;
  $('loading3d').classList.add('show');
  try {
    if (!await THREE3D.load()){ toast('Could not load 3D engine — check connection', 'err'); return; }
    if (!THREE3D.initRenderer()){ toast('WebGL unavailable — 3D modes need GPU support', 'err'); return; }
    state.viewMode = mode;
    if (mode === 'voxel') THREE3D.buildVoxelWorld();
    else if (mode === 'blackhole') THREE3D.buildBlackHole();
    else if (mode === 'terrain') THREE3D.buildTerrain();
    else THREE3D.buildSurface(mode);
    fitCanvas();
    updateModeUI(); updateModeHash(); refreshStats(true);
    const modeNames = { torus:'torus', sphere:'sphere', knot:'torus knot',
      mobius:'Möbius strip', blackhole:'black hole — the CA is the accretion disk',
      terrain:'exposure terrain — history becomes the landscape' };
    toast(mode === 'voxel' ? `3D voxel mode — ${state.voxelN}³ grid` : `Surface: ${modeNames[mode]}`, 'ok');
  } finally {
    switching3d = false;
    $('loading3d').classList.remove('show');
  }
}

/* surface / 3D UI */
document.querySelectorAll('#modeSeg .btn').forEach(b =>
  b.addEventListener('click', () => setViewMode(b.dataset.mode)));
$('voxelBtn').addEventListener('click', () =>
  setViewMode(state.viewMode === 'voxel' ? 'planar' : 'voxel'));
$('wrapToggle').addEventListener('change', e => {
  state.wrap = e.target.checked;
  toast(`Edge wrapping ${state.wrap ? 'on (toroidal)' : 'off (bounded)'}`, 'ok');
});
$('autoRotateToggle').addEventListener('change', e => {
  state.autoRotate = e.target.checked;
  if (THREE3D.controls) THREE3D.controls.autoRotate = state.autoRotate;
});
$('resetCamBtn').addEventListener('click', () => { if (THREE3D.controls) THREE3D.controls.reset(); });
$('terrainReliefRange').addEventListener('input', e => {
  state.terrainRelief = e.target.value / 100;
  $('terrainReliefVal').textContent = state.terrainRelief.toFixed(1) + '×';
  if (THREE3D.terrain) THREE3D.refreshTerrain(true);
});

/* ── VIEWPORT TOOLBAR (zoom / rotate / pan / fit / fullscreen) ─── */
let panMode = false;
const is3dView = () => state.viewMode !== 'planar';
function holdable(btn, fn){                       // fire on press, repeat while held
  let iv = null;
  const stop = () => { if (iv){ clearInterval(iv); iv = null; } };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault(); fn();
    iv = setInterval(fn, 90);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
}
function zoom2d(f, px = 0.5, py = 0.5){           // keep point under (px,py) fixed
  const v0 = viewUV();
  const ux = px * v0.s + v0.ox, uy = (1 - py) * v0.s + v0.oy;
  VIEW2D.z *= f; clampView();
  const v1 = viewUV();
  VIEW2D.cx += ux - (px * v1.s + v1.ox);
  VIEW2D.cy += uy - ((1 - py) * v1.s + v1.oy);
  clampView();
}
function dolly3d(f){
  const c = THREE3D.controls, cam = THREE3D.camera;
  if (!c || !cam) return;
  const off = new THREE3D.T.Vector3().subVectors(cam.position, c.target);
  const r = THREE3D._sceneRadius;
  off.setLength(Math.min(Math.max(off.length() * f, r * 0.25), r * 8));
  cam.position.copy(c.target).add(off);
  c.update();
}
function orbit3d(dTheta){
  const c = THREE3D.controls, cam = THREE3D.camera;
  if (!c || !cam) return;
  const T = THREE3D.T;
  const sph = new T.Spherical().setFromVector3(
    new T.Vector3().subVectors(cam.position, c.target));
  sph.theta += dTheta;
  cam.position.copy(c.target).add(new T.Vector3().setFromSpherical(sph));
  c.update();
}
function applyPanMode(){
  $('vbPan').classList.toggle('on', panMode);
  canvas.style.cursor = panMode ? 'grab' : '';
  if (THREE3D.controls && THREE3D.T)
    THREE3D.controls.mouseButtons.LEFT = panMode ? THREE3D.T.MOUSE.PAN : THREE3D.T.MOUSE.ROTATE;
}
holdable($('vbZoomIn'),  () => is3dView() ? dolly3d(1 / 1.10) : zoom2d(1.10));
holdable($('vbZoomOut'), () => is3dView() ? dolly3d(1.10)     : zoom2d(1 / 1.10));
holdable($('vbRotL'), () => orbit3d(0.07));
holdable($('vbRotR'), () => orbit3d(-0.07));
$('vbPan').addEventListener('click', () => {
  panMode = !panMode;
  applyPanMode();
  toast(panMode ? 'Pan — drag moves the view' : 'Pan off — drag paints again', 'ok');
});
$('vbFit').addEventListener('click', () => {
  if (is3dView() && THREE3D.controls) THREE3D.controls.reset();
  VIEW2D.z = 1; VIEW2D.cx = VIEW2D.cy = 0.5;
  clampView();
});
$('vbFull').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else if ($('stage').requestFullscreen) $('stage').requestFullscreen();
});

/* voxel settings UI */
$('voxelGridSelect').addEventListener('change', e => {
  state.voxelN = +e.target.value;
  if (state.voxelN >= 100) toast('100³ = one million voxels — expect low FPS', 'err');
  if (state.viewMode === 'voxel') THREE3D.buildVoxelWorld();
});
$('nbSelect').addEventListener('change', e => { state.nb3d = e.target.value; });

function applyRules3d(bStr, sStr, fromPreset){
  state.birth3d = parse3dCounts(bStr);
  state.survive3d = parse3dCounts(sStr);
  const b = state.birth3d.join(','), s = state.survive3d.join(',');
  $('birth3dInput').value = b;
  $('survive3dInput').value = s;
  const match = PRESET_RULES_3D.find(r => r.b.join(',') === b && r.s.join(',') === s);
  $('rule3dName').textContent = `B${b}/S${s}${match ? ' — ' + match.name : ' — Custom'}`;
  $('rule3dSelect').value = match ? match.name : '';
  if (!fromPreset) toast(`3D rules: B${b}/S${s}`, 'ok');
}
$('applyRule3dBtn').addEventListener('click', () => applyRules3d($('birth3dInput').value, $('survive3dInput').value));
[$('birth3dInput'), $('survive3dInput')].forEach(inp =>
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('applyRule3dBtn').click(); }));
{
  const sel = $('rule3dSelect');
  const empty = document.createElement('option');
  empty.value = ''; empty.textContent = '— 3D rule presets —';
  sel.appendChild(empty);
  PRESET_RULES_3D.forEach(r => {
    const o = document.createElement('option');
    o.value = r.name;
    o.textContent = `${r.name}  (B${r.b.join(',')}/S${r.s.join(',')})`;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    const r = PRESET_RULES_3D.find(x => x.name === sel.value);
    if (r){
      if (r.nb){ state.nb3d = r.nb; $('nbSelect').value = r.nb; }
      applyRules3d(r.b.join(','), r.s.join(','), true);
      toast(`3D rule: ${r.name}`, 'ok');
    }
  });
}
$('voxelSizeRange').addEventListener('input', e => {
  state.voxelSize = e.target.value / 100;
  $('voxelSizeVal').textContent = e.target.value + '%';
  THREE3D.refreshVoxels();
});
$('voxelOpacityRange').addEventListener('input', e => {
  state.voxelOpacity = e.target.value / 100;
  $('voxelOpacityVal').textContent = e.target.value + '%';
  if (THREE3D.voxelMesh){
    const mt = THREE3D.voxelMesh.material;
    mt.opacity = state.voxelOpacity;
    mt.depthWrite = state.voxelOpacity >= 0.99;
  }
});
$('sliceAxisSelect').addEventListener('change', e => { state.sliceAxis = e.target.value; THREE3D.refreshVoxels(); });
$('sliceRange').addEventListener('input', e => {
  state.slicePct = +e.target.value;
  $('sliceVal').textContent = state.slicePct + '%';
  THREE3D.refreshVoxels();
});

/* ── CANVAS SIZING ─────────────────────────────────────────────────
   Windowed: square viewport (grid aspect). Focus mode (fullscreen):
   the canvas covers the whole screen — engines cover-crop via coverUV,
   3D cameras get the real aspect. */
function fitCanvas(){
  const stage = $('stage');
  const fs = document.fullscreenElement === stage;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cssW, cssH;
  if (fs){
    cssW = stage.clientWidth; cssH = stage.clientHeight;
  } else {
    // fill the full width/height of the canvas frame (wrap is flex-sized,
    // independent of the canvas, so measuring it can't feed back)
    const wrap = $('canvasWrap');
    const cs = getComputedStyle(wrap);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    cssW = Math.max(160, wrap.clientWidth - padX);
    cssH = Math.max(160, wrap.clientHeight - padY);
  }
  const cap = fs ? 1920 : 1600;                     // render-size budget
  const scale = Math.min(dpr, cap / Math.max(cssW, cssH));
  const pxW = Math.max(1, Math.round(cssW * scale));
  const pxH = Math.max(1, Math.round(cssH * scale));
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  if (canvas.width !== pxW || canvas.height !== pxH){ canvas.width = pxW; canvas.height = pxH; }
  const tc = THREE3D.canvasEl;
  tc.style.width = cssW + 'px'; tc.style.height = cssH + 'px';
  if (THREE3D.renderer){
    THREE3D.renderer.setSize(pxW, pxH, false);
    if (THREE3D.camera){
      THREE3D.camera.aspect = pxW / pxH;
      THREE3D.camera.updateProjectionMatrix();
    }
  }
  if (THREE3D.composer) THREE3D.composer.setSize(pxW, pxH);
}
new ResizeObserver(fitCanvas).observe($('stage'));
fitCanvas();

/* Focus mode chrome: after 3s idle in fullscreen, hide toolbar + cursor. */
let idleTimer = null;
function armIdle(){
  const st = $('stage');
  st.classList.remove('idle');
  clearTimeout(idleTimer);
  if (document.fullscreenElement === st)
    idleTimer = setTimeout(() => st.classList.add('idle'), 3000);
}
document.addEventListener('fullscreenchange', () => { fitCanvas(); armIdle(); });
$('stage').addEventListener('pointermove', armIdle);

/* ── STATS + MAIN LOOP ─────────────────────────────────────────── */
let lastPopTime = 0;
export function refreshStats(forcePop){
  if (state.viewMode === 'voxel'){
    if (THREE3D.voxel){
      $('stGen').textContent = THREE3D.voxel.gen;
      $('stPop').textContent = THREE3D.voxel.pop.toLocaleString();
    }
    return;
  }
  $('stGen').textContent = state.gen;
  const now = performance.now();
  if (forcePop || now - lastPopTime > 400){
    lastPopTime = now;
    try { $('stPop').textContent = engine.population().toLocaleString(); } catch(_){}
  }
}
/* Ambient keep-alive: many rules (Conway included) settle into still lifes
   after a while, so a focus-mode background eventually stops moving. Only
   while fullscreen + running, sample population every ~90 gens and, if it has
   barely changed (stasis), sprinkle a few random sparks to reignite motion.
   Scoped to fullscreen so it never disturbs someone composing an artwork. */
let kaPrevPop = -1;
function keepAlive(){
  if (document.fullscreenElement !== $('stage') || !state.running) { kaPrevPop = -1; return; }
  if (state.gen === 0 || state.gen % 90) return;
  let pop = 0;
  try { pop = engine.population(); } catch (_) { return; }
  if (kaPrevPop >= 0 && Math.abs(pop - kaPrevPop) < Math.max(6, state.grid * 0.0006)){
    const n = state.grid;
    for (let k = 0; k < 10; k++){                 // ten small gliders/clusters
      const x = 2 + Math.floor(Math.random() * (n - 4));
      const y = 2 + Math.floor(Math.random() * (n - 4));
      for (let i = 0; i < 5; i++)
        engine.paint(x + (Math.random()*3|0), y + (Math.random()*3|0), 1, 0);
    }
  }
  kaPrevPop = pop;
}
let lastTime = performance.now(), acc = 0, frames = 0, fpsTime = performance.now();
function frame(now){
  const dt = Math.min(now - lastTime, 250);
  lastTime = now;
  const mode = state.viewMode;
  if (mode === 'voxel'){
    if (THREE3D.ready && THREE3D.voxel){
      if (state.running){
        acc += dt * state.speed / 1000;
        if (acc >= 1){                          // CPU sim: max 1 step per frame
          acc = Math.min(acc - Math.floor(acc), 1);
          THREE3D.voxel.step();
          THREE3D.refreshVoxels();
        }
      }
      THREE3D.renderFrame();
    }
  } else {
    if (state.running){
      acc += dt * state.speed / 1000;
      let steps = Math.min(Math.floor(acc), 4);   // cap catch-up work per frame
      acc -= Math.floor(acc);
      if (steps > 0){
        while (steps-- > 0){ engine.step(); state.gen++; }
        maybeSnapshot();
      }
    }
    if (mode === 'planar'){
      keepAlive();
      engine.render();
    } else if (THREE3D.ready && THREE3D.texture){
      engine.render();                          // hidden canvas feeds the surface texture
      THREE3D.texture.needsUpdate = true;
      THREE3D.renderFrame();
    } else if (THREE3D.ready && THREE3D.terrain){
      if (state.running) THREE3D.refreshTerrain();   // throttled accum readback
      THREE3D.renderFrame();
    }
  }
  refreshStats(false);
  frames++;
  if (now - fpsTime > 1000){
    $('stFps').textContent = Math.round(frames * 1000 / (now - fpsTime));
    frames = 0; fpsTime = now;
  }
  /* Background-tab throttling (seo-recovery Phase B): keep the loop
     scheduled but do zero sim/render work while the tab is hidden. */
  if (document.hidden){ requestAnimationFrame(frame); return; }
  requestAnimationFrame(frame);
}

/* ── INIT ──────────────────────────────────────────────────────── */
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  toast('GPU context lost — reload the page', 'err');
});
engine.createGrid(state.grid);
randomFill();
applyRules('3', '23', true);
/* Land paused with the artwork seeded — the pulsing play button invites the
   first interaction (which also unlocks the ambience sound). */
setRunning(false);
$('playBtn').classList.add('pulse');
requestAnimationFrame(frame);
{
  const m = location.hash.match(/mode=(torus|sphere|voxel|knot|mobius|blackhole|terrain)/);   // shareable view mode
  if (m) setViewMode(m[1]);
}
{
  /* Deep-link a rule/pattern via ?rule=slug&pattern=slug (e.g. from a gallery
     page: ?rule=conway&pattern=glider-gun). Slugs are kebab-case of the preset
     name, matched case-insensitively so URLs stay readable. */
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const qs = new URLSearchParams(location.search);
  const rp = qs.get('rule');
  if (rp){
    const r = PRESET_RULES.find(x => slug(x.name) === slug(rp));
    if (r) applyRules(r.b, r.s, true);
  }
  const pp = qs.get('pattern');
  if (pp){
    const name = Object.keys(PATTERNS).find(n => slug(n) === slug(pp));
    if (name) loadPattern(name);
  }
  const pal = qs.get('palette');
  if (pal){
    const p = PALETTES.find(x => slug(x.name) === slug(pal));
    if (p) setPalette(p);
  }
}
console.log(`%cCellscape %c— grown, not drawn`,
  'font-size:16px;color:#00d4ff;font-weight:bold', 'font-size:12px;color:#8a8aa3');
console.log(`Renderer: ${engine.name} · Grid: ${state.grid}² · Rule: ${ruleString()}`);
