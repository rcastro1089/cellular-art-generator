# Architecture Audit — 2026-07-17

Scope: full repo + index.html (3,317 lines / 141 KB) at commit d4d2f23.
Verdict: the single-file/no-build decision was coherent for v1, but the file
has crossed the threshold where it stops scaling. Sprints 3 (payments) and 4
(content/SEO) will collide head-on with the current structure.

---

## Findings (by severity)

### A1 — Monolith past its sustainable size · HIGH
One file holds HTML, ~280 lines of CSS, ~2,700 lines of JS, 17 GLSL shader
blocks and audio DSP. Consequences already visible:
- Section numbering is broken (1,2,3,4,6a,5,7,6b,6c,6d,9,8) — comment-based
  organization has stopped working.
- Every feature edit touches the same file → git history/blame is noise,
  parallel work guarantees conflicts.
- Browser caching is all-or-nothing: a 1-line CSS tweak re-downloads 141 KB.

### A2 — Zero module boundaries; global mutable coupling · HIGH
81 top-level declarations in one shared scope. The `state` object is read/
mutated 153 times from every layer: GLEngine reads `state.birth` directly
(the render engine knows about UI state), THREE3D calls `activePal()`, the
frame loop knows every mode. Nothing can be tested, reused, or reasoned
about in isolation; there is no seam anywhere to cut.

### A3 — Business logic coupled to the DOM · HIGH
77 element IDs accessed via `$()` from inside logic modules — e.g. AMBIENCE
reads `$('noiseTypeSelect').value` inside the audio engine; the DOM is the
source of truth for several settings (volume, timer, noise type) while
`state` owns others. Two competing state stores. 53 loose addEventListener
calls with no mount/unmount pattern.

### A4 — Implicit dual-engine contract with no enforcement · HIGH
GLEngine and CPUEngine implement the same ~12-method interface (createGrid,
step, readAccum, render, renderToPixels, …) but the contract exists only by
convention. Every new feature must be implemented twice (readAccum was),
and nothing checks parity: the selftest only exercises whichever engine is
active. A CPU-path regression would ship silently to WebGL-less users —
precisely the users most likely to have odd browsers.

### A5 — Repeated palette→LUT logic · MEDIUM
The 32-entry palette LUT interpolation is re-implemented at least 3× (CPU
render, voxel refresh, terrain refresh). Same math, three drift sites.

### A6 — No CI, no lint, near-zero automated testing · HIGH (given monetization)
12 asserts in a hash-triggered manual selftest; it does not run on push.
No GitHub Actions, no linting, no typecheck (plain JS, no JSDoc types).
For a product about to take money (Gumroad/Printful), silent-regression
risk is the top operational risk. The selftest is trivially automatable
(headless Chrome asserts `document.title === 'SELFTEST ALL-PASS'`).

### A7 — Repo hygiene · MEDIUM
- `img example/` = 8.3 MB of PNGs tracked in git history forever; folder
  name contains a space (breaks unquoted tooling).
- `v0-prototype.html` dead code at root.
- No LICENSE, no README at root (GitHub landing shows nothing).

### A8 — Imminent collisions (sprints 3–4) · HIGH
- Payments: Gumroad license checks / Printful calls need endpoints or at
  minimum careful client-side gating — `FEATURES` flags in page source are
  trivially flipped in DevTools. Real gating needs a tiny backend
  (Cloudflare Workers/Functions fits the current hosting).
- SEO content: blog/, gallery/, shop.html require *separate static pages*
  (per-URL HTML is non-negotiable for SEO). The single-file architecture
  physically cannot host them; shared nav/styles will need extraction
  anyway — better to extract once, before writing 6 pages.

### What is genuinely good (keep)
- No-build + static hosting: right call for the product; keep it.
- Zero npm dependencies → zero supply-chain surface, nothing to rot.
- Lazy CDN Three.js; WebGL2 ping-pong FBO engine is well built; CPU
  fallback exists; selftest exists at all (rare for this project size).
- OpenSpec docs + research folder: decision history is preserved.

---

## Recommended path (keeps "no build step" — native ES modules)

Cloudflare Pages serves ES modules as-is; `<script type="module">` needs no
bundler. Target structure:

```
/
├── index.html            → shell: markup + <link css> + <script type=module>
├── styles/app.css
├── src/
│   ├── state.js          → state + pub/sub (single source of truth)
│   ├── palettes.js       → palettes + the ONE lut() implementation
│   ├── engine-contract.js→ JSDoc typedef of the Engine interface
│   ├── engine-gl.js      ├ engine-cpu.js
│   ├── rules.js          → CA rules, presets, parsing (pure, testable)
│   ├── three/            → three3d.js, lens.js, terrain.js, voxel.js
│   ├── features/         → export.js, video.js, ambience.js, timeline.js
│   └── ui/               → bindings.js (all $() + listeners live here only)
├── test/selftest.js      → current checks + engine CONTRACT test (runs both)
├── .github/workflows/ci.yml → headless Chrome: #selftest must ALL-PASS
├── blog/ gallery/ shop.html  → sprint 4 static pages import shared modules
└── archive/v0-prototype.html
```

Rules of the refactor:
1. Mechanical moves only — no behavior changes mixed in; selftest green
   after every step.
2. Order: css → palettes/rules (pure) → engines + contract test → three/ →
   features/ → ui bindings last.
3. `state.js` exports the store + a tiny `subscribe(key, fn)`; UI writes go
   through it, engines only *read* a passed-in config object (breaks A2/A3
   without a framework).
4. Estimated effort: 1.5–2 days including CI. Do it BEFORE sprint 3; every
   sprint after makes it more expensive.
5. Repo: move `img example/` out of git (or LFS), rename ascii-safe, add
   README + LICENSE, archive the prototype.
```
