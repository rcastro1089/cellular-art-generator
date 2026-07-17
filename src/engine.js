/* ── ENGINE SELECTION ────────────────────────────────────────────
   Both engines implement the same contract (see test/selftest.js,
   which runs the shared checks against whichever engine is active):
   createGrid · uploadCells · uploadAge · readCells · readAccum ·
   resetAccum · step · paint · getCell · population · render ·
   renderToPixels · dispose · n · gen · name
   `engine` is a live ES-module binding: importers always see the
   active instance. */
import { GLEngine } from './engine-gl.js';
import { CPUEngine } from './engine-cpu.js';

export const canvas = document.getElementById('caCanvas');

export let engine;
try {
  engine = new GLEngine(canvas);
} catch (e) {
  console.warn('WebGL2 unavailable, falling back to Canvas 2D:', e.message);
  engine = new CPUEngine(canvas);
}
{
  const badge = document.getElementById('rendererBadge');
  badge.textContent = engine.name;
  badge.classList.add(engine.name === 'WebGL2' ? 'gpu' : 'cpu');
}
