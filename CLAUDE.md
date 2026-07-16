# Cellular Automata Art Generator

## Project Overview
Web-based generative art tool combining Conway's Game of Life and Life-like cellular automata with print-on-demand integration. Users create art by configuring rules, playing the simulation, and exporting/ordering physical prints.

## Stack
- **Simulation:** WebGL2 fragment shaders (primary) + Canvas 2D (fallback)
- **3D:** Three.js (lazy-loaded CDN)
- **Payments:** Gumroad (digital downloads)
- **POD:** Printful
- **Hosting:** Cloudflare Pages (static)
- **Framework:** Vanilla JS — no build step, single HTML file core

## Project Structure (actual repo contents)
```
cellular-art-generator/
├── index.html              → ENTIRE app: single file (HTML+CSS+JS+GLSL inline, no build)
├── v0-prototype.html       → Earlier prototype (reference only)
├── img example/            → Print-quality reference images
├── openspec/               → OpenSpec design docs
├── research/               → Market research
└── CLAUDE.md               → This file
```
Planned but NOT yet created: blog/, gallery/, shop.html, faq.html, about.html,
separate src/ tree. Everything lives inline in index.html — edit there.

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
- Viewport toolbar (#viewBar): zoom/rotate/pan/fit/fullscreen; 2D pan+zoom via
  uv window (VIEW2D → viewUV(), planar only), wheel zoom, ✋ drag-pan mode;
  3D wired to OrbitControls camera. Exports ignore the view (full artwork)
- Video export: 3/5/10s WebM (VP9→VP8→MP4 Safari) of the live viewport (2D or
  3D), explicit requestFrame pump @30fps, 12 Mbps. FEATURES.videoExport =
  premium gating hook (sprint 3 Gumroad)
- Selftest: open with #selftest → console + document.title verdict

## OpenSpec Status
- [x] proposal.md — WHY
- [x] specs/ (c1-c7) — WHAT
- [x] design.md — HOW
- [x] tasks.md — EXECUTION PLAN

## Key Contacts
- DataForSEO: rcastro1089@gmail.com (token in api-tokens.sh)
- Gumroad: automanexus.gumroad.com
- Printful: needs setup

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
