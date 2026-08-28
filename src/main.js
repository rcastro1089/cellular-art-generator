/* ── ENTRY POINT ─────────────────────────────────────────────────
   Lazy-init (seo-recovery Phase B): the WebGL engine and all its
   modules load only AFTER a first user interaction (pointer/key/
   wheel/touch), a scroll toward the tool, or a deep-link/selftest.
   Before that, the page shell renders with zero engine work — no
   WebGL context, no shader compile, no AudioWorklet — which keeps
   the main thread free (Core Web Vitals TBT). */

const qs = new URLSearchParams(location.search);
const wantsDeepLink = qs.has('pattern') || qs.has('rule') || /mode=/.test(location.hash);
const AUTOSTART = location.hash === '#selftest' || wantsDeepLink;

let started = false;
function startApp() {
  if (started) return;
  started = true;
  Promise.all([
    import('./app.js'),
    import('./pro.js'),
    import('./features/exports.js'),
    import('./ambience.js'),
  ]).catch(err => {
    console.error('Cellscape lazy-init failed:', err);
    // fallback: try a plain eager import once so the app still boots
    import('./app.js').catch(() => {});
  });
  if (location.hash === '#selftest') import('../test/selftest.js');
}

if (AUTOSTART) {
  startApp();
} else {
  /* First interaction wakes the engine. Using pointerdown (not click)
     so the wake happens before any click's event handlers run. */
  const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
  EVENTS.forEach(ev => window.addEventListener(ev, startApp, { once: true, passive: true }));

  /* Scrolling to the tool (or past the fold) also counts. */
  let scrolled = false;
  window.addEventListener('scroll', () => {
    if (scrolled) return;
    if (window.scrollY > 240) { scrolled = true; startApp(); }
  }, { passive: true });

  /* Fail-safe: if nobody interacts, boot the seeded artwork anyway
     after 45s so the page is never left as an inert shell. */
  setTimeout(startApp, 45000);
}