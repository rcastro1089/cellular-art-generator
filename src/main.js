/* ── ENTRY POINT ─────────────────────────────────────────────────
   Module evaluation order: app.js pulls in state/palettes/engines/
   three3d/timeline and runs init; the feature modules then register
   their own card bindings. The selftest loads only on #selftest. */
import './app.js';
import './pro.js';
import './features/exports.js';
import './ambience.js';

if (location.hash === '#selftest') import('../test/selftest.js');
