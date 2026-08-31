# Cellscape — Cellular Automata Art Generator

## Project Overview
Web-based generative art tool combining Conway's Game of Life and Life-like cellular automata with print-on-demand integration. Users create art by configuring rules, playing the simulation, and exporting/ordering physical prints.

## Branding (decided 2026-07-17)
- **Brand:** Cellscape (long descriptive name stays as SEO subtitle)
- **Tagline / print legend:** "Grown, not drawn — Cellscape · B3/S23 · gen N"
- Export signature overlay ON by default (drawSignature in features/exports.js);
  filenames `cellscape-*`. UI is emoji-free: inline SVG sprite in index.html
  (`#i-*` symbols) + `icon()` helper in util.js.

## Stack
- **Simulation:** WebGL2 fragment shaders (primary) + Canvas 2D (fallback)
- **3D:** Three.js (lazy-loaded CDN via import map)
- **Payments:** Gumroad (digital downloads)
- **POD:** Printful
- **Hosting:** Cloudflare Pages (static)
- **Framework:** Vanilla JS — no build step, native ES modules

## Project Structure (actual repo contents)
```
cellular-art-generator/
├── index.html              → page shell (markup only; importmap + module entry)
├── styles/app.css          → all styles
├── src/
│   ├── main.js             → entry (imports app + features; lazy selftest)
│   ├── state.js            → state + FEATURES flags + VIEW2D/viewUV/clampView
│   ├── palettes.js         → PALETTES, activePal(), paletteLUT32() (the ONE LUT)
│   ├── rules.js            → rule/pattern presets + parsing + ruleString (pure)
│   ├── shaders.js          → GLSL sources
│   ├── engine-gl.js        → GLEngine  ┐ same contract; selftest exercises
│   ├── engine-cpu.js       → CPUEngine ┘ whichever is active
│   ├── engine.js           → selection; exports live `engine` binding + canvas
│   ├── voxel.js            → Voxel3D (pure JS volumetric CA)
│   ├── three3d.js          → THREE3D: surfaces/black hole lens/terrain/voxels
│   ├── timeline.js         → SNAP rewind snapshots
│   ├── ambience.js         → noise generator + its card bindings
│   ├── features/exports.js → PNG + video export + their card bindings
│   └── app.js              → all other UI bindings, setViewMode, frame loop, init
├── test/selftest.js        → in-browser checks (#selftest)
├── test/ci-selftest.mjs    → headless Playwright runner (used by CI)
├── .github/workflows/ci.yml→ selftest must ALL-PASS on every push
├── archive/                → v0 prototype (reference only)
├── img-example/            → print-quality reference images (NOT tracked in git)
├── openspec/               → OpenSpec design docs + architecture audit
├── research/               → Market research
├── styles/blog.css         → standalone stylesheet for static content pages
│                             (blog/gallery/etc.) — decoupled from app.css/#app
├── blog/
│   ├── index.html                        → blog index, links all posts
│   ├── cellular-automata-art-guide/      → pillar (3,011 words, "cellular
│   │                                        automata" 2.9K/mo) + Related Reading
│   ├── algorithmic-art-generators/       → comparison ("algorithmic art"/"design")
│   ├── cellular-automata-types/          → reference/taxonomy (CA/1D/Lenia/etc)
│   ├── how-to-make-generative-art/       → tutorial (+ HowTo JSON-LD)
│   ├── math-art-decor-ideas/             → inspiration ("scientific illustration"
│   │                                        3.6K/mo, the single biggest keyword)
│   └── gifts-for-programmers/            → gift guide ("programmer gifts"/"code art")
├── gallery/
│   ├── index.html                        → directory of ALL 26 patterns + 32
│   │                                        rules from src/rules.js, each a
│   │                                        live deep-link (?pattern=/?rule=)
│   └── patterns/<slug>/                  → 10 dedicated deep pages (glider,
│       gosper-glider-gun, seeds, day-and-night, pulsar, r-pentomino, highlife,
│       lightweight-spaceship, block, diehard) — full history/mechanics/FAQ
├── faq/index.html          → site-wide FAQ (own FAQPage JSON-LD)
├── about/index.html        → project story/philosophy (no fabricated bio)
└── CLAUDE.md               → This file
```
All blog + gallery + faq + about pages: own Article/BreadcrumbList/FAQPage
JSON-LD where relevant (distinct FAQ questions per page, no cannibalization),
cross-linked via consistent footers, zero JS, styles/blog.css only.

**Deep-link feature (src/app.js, added 2026-07-28):** `?pattern=<slug>` and
`?rule=<slug>` query params preload a named pattern/rule on page load (slug =
kebab-case of the PATTERNS/PRESET_RULES name in src/rules.js, matched
case-insensitively). This is what every gallery card's "Try it live" link
uses — verified end-to-end (real click → correct rule/pattern loads, e.g.
glider → population 5). Note some slugs differ from the display name (LWSS →
`lwss`, "Day & Night" → `day-night`) — always slugify the exact PATTERNS/
PRESET_RULES key, not the page's own URL slug, when linking.

**Gallery content strategy (2026-07-28):** deliberately did NOT build 30
separate near-duplicate pattern pages — for 0-search-volume keywords, that's
textbook thin/programmatic content that risks a Helpful Content penalty.
Instead: ONE comprehensive gallery index listing all 26 patterns + 32 rules
(satisfies breadth), plus 10 genuinely distinct deep-dive pages for the most
iconic/recognizable ones only. Same reasoning pattern as the earlier
"tool-stays-at-/" decision — pick the SEO-sound version of the spec's intent,
not its literal wording. shop.html still deferred with Printful (Fase A still
validating digital conversion first).

**SEO structure decision (2026-07-28):** the tool stays at `/` (index.html) —
NOT split into a landing + separate `/generator` route as the original
openspec c6-content spec proposed. Reasoning: "game of life"/"game of life
simulator" are transactional queries (intent = use the tool now); a landing
hop adds friction on the highest-volume keyword in the whole research set and
splits SEO authority across two URLs. Instead, index.html got an SEO content
section below the fold (`.seo-content` in app.css, requires `body` to allow
scroll — `#app` still pins the tool to exactly 100vh, unchanged) with a
condensed explainer, a mini-FAQ (own FAQPage JSON-LD), and a link to the blog
pillar. All future content pages (blog/gallery) link back to `/`, never to a
separate generator route.
Local dev: `npx http-server` (ES modules need HTTP, file:// won't load).

## Engine features (index.html)
- WebGL2 CA sim (ping-pong RGBA32F state) + Canvas2D fallback
- Render modes: Live | Long Exposure (history accumulation → temporal gradient)
- Themes: Dark | Paper (light, print-ready; auto-derives paper variant of any palette)
- 27 palettes (incl. 5 light print palettes), cell shapes (square/circle/rounded/diamond, SDF+AA)
- Timeline: auto snapshots every 8-20 gens (grids ≤1000), rewind slider
- Export: product presets up to 7200×10800 @300dpi, fit/fill/smart-crop,
  transparent PNG (garments), optional overlay (off by default)
- 3D: torus/sphere/knot/Möbius (live canvas texture) + voxel CA; UnrealBloom
  composer, auto-framed HD export
- Black hole: accretion-disk-only scene + gravitational-lens ShaderPass
  (point-mass deflection r−rE²/r in screen space → Interstellar arcs, shadow,
  photon ring; lens forces the composer even with bloom off)
- Terrain (⛰): exposure heightmap — engine.readAccum() (GL readPixels /
  CPU arrays), box-averaged + [1,2,1]-blurred onto ≤176² PlaneGeometry,
  height=log1p(visitCnt) via terrainHeight(), color=palette by lastVisit gen,
  relief slider, throttled every 4 gens
- Ambience (🔊): color noise generator — white/pink/brown/blue/violet/grey,
  AudioWorklet (blob) with ScriptProcessor fallback (file:// blocks blob
  worklets), grey = white + EQ shelves, sleep timer, localStorage persist,
  FEATURES.noiseGenerator premium hook
- Voxel: long-exposure ghosts (born/lastVisit/visitCnt mirror of 2D accum),
  cube-size slider (default 25% pitch), 8 rule presets (some set neighborhood)
- Viewport toolbar (#viewBar): zoom/rotate/pan/fit/focus; 2D pan+zoom via
  uv window (VIEW2D → viewUV()/coverUV(), planar only), wheel zoom, drag-pan;
  3D wired to OrbitControls camera. Exports ignore the view (full artwork)
- Canvas fills the full width/height of its frame by default (windowed too):
  fitCanvas measures #canvasWrap; engines cover-crop the grid via coverUV so
  cells stay square. Export presets still offer square (3600²) + wide/poster
- Focus mode: fullscreen renders cover-viewport (coverUV aspect crop in both
  engines + camera.aspect in 3D), UI chrome/cursor auto-hide after 3s idle,
  Cellscape watermark. keepAlive() (planar+fullscreen+running only) sprinkles
  random sparks when population stalls, so an ambient background never freezes
  once the CA settles. Sidebar uses progressive disclosure (details.adv);
  timeline card auto-appears once ≥2 snapshots
- Landing state: paused with the artwork seeded + pulsing play button
  (.pulse) inviting first play; first play also unlocks/starts the ambience
  sound (userPlayToggle, the click is the autoplay gesture)
- Layout: sidebar = Create (playback + rule/pattern + compact sound play/volume)
  → Surface → Look → Ambience (sound picker + timer) → Export
- Ambience v2: 6 noise colors + Ocean (brown + swell LFO) + Surf (steady
  brown→lowpass bed) + Voyager (cinematic: steady ocean bed + generative
  organ arpeggio — original A-minor progression, additive-drawbar organ voice
  playOrgan/playPad, synthetic convolver reverb makeReverbIR, lookahead
  scheduler on g.timers halted via g.stopped; NOT a copy of any scored
  melody). Fade-in 5.5s / fade-out 3.5s / crossfade 1.6s starting ~26 dB
  below target, per-type loudness calibration (NOISE_CAL), compressor limiter.
  midiToFreq is the pitch helper (selftested)
- Video export: 3/5/10s WebM (VP9→VP8→MP4 Safari) of the live viewport (2D or
  3D), explicit requestFrame pump @30fps, 12 Mbps. FEATURES.videoExport =
  premium gating hook (sprint 3 Gumroad)
- Selftest: open with #selftest → console + document.title verdict

## OpenSpec Status
- [x] proposal.md — WHY
- [x] specs/ (c1-c7) — WHAT
- [x] design.md — HOW
- [x] tasks.md — EXECUTION PLAN

## Monetization — Fase A (validation, decided 2026-07-28)
> **Canonical path decision (2026-08-31): `docs/strategy-2026-monetization.md`** —
> Cellscape is digital-first (free tool + paid digital tiers); physical POD is
> gated behind proven demand (≥50 digital sales + repeated print requests).
> Social/TikTok is the traffic arm, optimized for email capture, not direct sales.
> Full operational handoff (product IDs, API capabilities, test flow, pending
> tasks) lives in **`docs/monetization.md`**. Summary below.
- **Strategy:** research shows TOOL demand is proven ("game of life" 27.1K/mo)
  but PRODUCT demand (buying CA prints) is UNPROVEN (product keywords = 0 vol).
  So launch the finished tool FREE to capture the game-of-life traffic, and
  measure willingness to pay before building any fulfillment. Physical POD
  (Printful) is deferred until digital conversion is validated.
- **Cellscape Pro** (src/pro.js): client-side license unlock via Gumroad.
  Free tier = full tool + one signed 1920×1080 PNG. Pro unlocks print-res
  export (up to 7200×10800 @300dpi), transparent PNG, video, watermark
  removal. Gating in features/exports.js via gatePro()/isPro(). No backend yet
  → optimistic + bypassable BY DESIGN (real enforcement = Workers, sprint 3).
  DEV_KEY='CELLSCAPE-DEV' unlocks the Pro UX locally before the Gumroad product
  exists. Set GUMROAD_PERMALINK in pro.js to the real /l/<slug> once created;
  if the API rejects product_permalink, switch the body param to product_id.
- **Domain:** cellscape.art (user buying). Deploy files: robots.txt, sitemap.xml,
  _headers (Cloudflare Pages), SEO <head> (canonical, OG/Twitter, WebApplication
  JSON-LD, title retargeted to "Conway's Game of Life"). TODO before sharing
  links: add /og-cover.png (1200×630 screenshot) — referenced but not committed.

## Key Contacts
- DataForSEO: rcastro1089@gmail.com (token in api-tokens.sh)
- Gumroad: automanexus.gumroad.com (Cellscape Pro product = needs creating)
- Printful: deferred to post-validation

## Key Decisions
- SurfMap: Free tool, pay for export/print (NOT paywalled tool)
- First-mover in "generative CA art print" niche
- Non-planar surfaces (torus, sphere) as differentiator
- SEO strategy: long-tail zero-competition keywords
- Claude Code Opus recommended for shader implementation

## API Keys (reference only — actual values in ~/.hermes/api-tokens.sh)
- DataForSEO: login=rcastro1089@gmail.com
- Printful: needs setup
- Gumroad: needs setup
