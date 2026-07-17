/* ── SELFTEST (open with #selftest) ──────────────────────────────
   Runs against whichever engine is active (WebGL2 or Canvas2D) —
   the same checks exercise both implementations of the engine
   contract, so a fallback-only regression still fails CI when CI
   runs without GPU. Verdict lands in console + document.title. */
import { state, VIEW2D, clampView, terrainHeight } from '../src/state.js';
import { activePal } from '../src/palettes.js';
import { engine, canvas } from '../src/engine.js';
import { parse3dCounts } from '../src/rules.js';
import { Voxel3D } from '../src/voxel.js';
import { makeNoiseKernel } from '../src/ambience.js';
import { setRunning, clearGrid, applyRules, eventToCell } from '../src/app.js';

setTimeout(() => {
  const results = [];
  const check = (name, ok) => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`); return ok; };
  try {
    setRunning(false);
    clearGrid();
    const n = state.grid, cx = n >> 1, cy = n >> 1;
    // horizontal blinker
    [[cx-1,cy],[cx,cy],[cx+1,cy]].forEach(([x,y]) => engine.paint(x, y, 1, 0));
    engine.step();
    const vertical = engine.getCell(cx, cy-1) === 1 && engine.getCell(cx, cy+1) === 1
                  && engine.getCell(cx-1, cy) === 0 && engine.getCell(cx+1, cy) === 0
                  && engine.getCell(cx, cy) === 1;
    check('conway-blinker-period-1', vertical);
    engine.step();
    const horizontal = engine.getCell(cx-1, cy) === 1 && engine.getCell(cx+1, cy) === 1
                    && engine.getCell(cx, cy-1) === 0 && engine.getCell(cx, cy+1) === 0;
    check('conway-blinker-period-2', horizontal);
    check('population-count', engine.population() === 3);
    // export pipeline: bg must differ from cell pixels
    const { data, w, h } = engine.renderToPixels(512, 512);
    const bg = activePal().bgRGB.map(v => Math.round(v * 255));
    let litPixels = 0;
    for (let i = 0; i < w * h; i++){
      const j = i * 4;
      if (Math.abs(data[j] - bg[0]) > 40 || Math.abs(data[j+1] - bg[1]) > 40 || Math.abs(data[j+2] - bg[2]) > 40) litPixels++;
    }
    check('export-renders-cells', litPixels > 0 && litPixels < w * h);
    // custom rule: Seeds (B2/S) — two adjacent cells die, corners around them are born
    applyRules('2', '', true);
    clearGrid();
    engine.paint(cx, cy, 1, 0); engine.paint(cx+1, cy, 1, 0);
    engine.step();
    const seedsOk = engine.getCell(cx, cy) === 0 && engine.getCell(cx+1, cy) === 0
                 && engine.getCell(cx, cy+1) === 1 && engine.getCell(cx+1, cy-1) === 1;
    check('seeds-rule-B2S', seedsOk);
    applyRules('3', '23', true);
    // 3D voxel engine logic (pure JS, no Three.js needed):
    // single seed, von Neumann B1/S∅ → seed dies, its 6 face-neighbors are born
    const vox = new Voxel3D(8);
    const saved3d = { b: state.birth3d, s: state.survive3d, nb: state.nb3d };
    state.birth3d = [1]; state.survive3d = []; state.nb3d = 'vn';
    vox.cells[4*64 + 4*8 + 4] = 1; vox.pop = 1;
    vox.step();
    state.birth3d = saved3d.b; state.survive3d = saved3d.s; state.nb3d = saved3d.nb;
    check('voxel-vn-B1-births-6', vox.pop === 6 && vox.cells[4*64 + 4*8 + 4] === 0);
    const nb1 = 4*64 + 4*8 + 5;   // face neighbor born on gen 1
    check('voxel-exposure-tracking',
      vox.born[nb1] === 1 && vox.lastVisit[nb1] === 1 && vox.visitCnt[nb1] === 1);
    check('parse-3d-counts', parse3dCounts('4, 12,26').join(',') === '4,12,26');
    // 2D viewport: zoomed pointer → cell mapping stays exact
    VIEW2D.z = 2; VIEW2D.cx = VIEW2D.cy = 0.75; clampView();
    const rc = canvas.getBoundingClientRect();
    const zc = eventToCell({ clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2 });
    check('view2d-zoom-mapping',
      !!zc && zc.x === Math.floor(0.75 * n) && zc.y === Math.floor(0.75 * n));
    VIEW2D.z = 1; VIEW2D.cx = VIEW2D.cy = 0.5; clampView();
    // exposure terrain: accum readback + pure height mapping
    const bl = new Uint8Array(n * n);   // 2×2 block (still life under B3/S23)
    bl[cy*n + cx] = bl[cy*n + cx + 1] = bl[(cy+1)*n + cx] = bl[(cy+1)*n + cx + 1] = 1;
    engine.uploadCells(bl);
    engine.step(); engine.step();
    const acc = engine.readAccum();
    check('terrain-accum-readback', acc.cnt[cy*n + cx] >= 2 && acc.gen[cy*n + cx] === 2);
    check('terrain-height-map',
      terrainHeight(0, 100) === 0
      && terrainHeight(10, 100) < terrainHeight(50, 100)
      && Math.abs(terrainHeight(100, 100) - 1) < 1e-9);
    // noise kernels: brown (integrated) is far smoother than white; bounded
    const kb = makeNoiseKernel('brown'), kw = makeNoiseKernel('white');
    let db = 0, dw = 0, pb = 0, pw = 0, bounded = true;
    for (let i = 0; i < 8192; i++){
      const b = kb(), w = kw();
      if (Math.abs(b) > 1 || Math.abs(w) > 1) bounded = false;
      db += (b - pb) * (b - pb); dw += (w - pw) * (w - pw);
      pb = b; pw = w;
    }
    check('noise-brown-smoother-than-white', bounded && db < dw * 0.05);
  } catch (err) {
    results.push('FAIL exception: ' + err.message);
  }
  const allPass = results.every(r => r.startsWith('PASS'));
  results.forEach(r => console.log('SELFTEST ' + r));
  console.log('SELFTEST ' + (allPass ? 'ALL-PASS' : 'HAS-FAILURES') + ' [' + engine.name + ']');
  document.title = 'SELFTEST ' + (allPass ? 'ALL-PASS' : 'HAS-FAILURES');
}, 600);
