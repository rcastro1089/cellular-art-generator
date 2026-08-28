# Distribution Drafts — cellscape.art (Phase C)

Drafts listos para publicar por el owner (las cuentas PH/HN/Reddit/Pinterest son personales).
Publicar SOLO tras verificar CWV verdes + pillar indexado (checklist release, Fase E).

---

## 1. Show HN (Hacker News)

**Título:**
Show HN: Cellscape — a free GPU cellular automata art generator with 3D surfaces and print exports

**Texto (primer comentario/self):**
> I built Cellscape, a browser-based generative art tool where Conway's Game of Life and 30+ Life-like rules become print-quality wall art. No install, no account; everything runs locally in WebGL2 shaders and Canvas2D fallback.
>
> What makes it different from a plain simulator:
> - 27 color palettes + long-exposure accumulation (history trails as gradients)
> - Non-planar surfaces: torus, sphere, knot, Möbius, and a gravitational-lens "black hole" scene
> - Terrain + voxel modes (the CA history becomes a heightmap)
> - Export at up to 7200×10800 @300dpi for real printing, plus WebM video
> - Deep links: https://cellscape.art/?pattern=glider preloads a pattern
> - Auto-generated ambient sound (ocean, surf, cinematic) that evolves with the render
>
> The engine is lazy-loaded on first interaction so the page is fast on mobile. Source: https://github.com/rcastro1089/cellular-art-generator (vanilla JS, no build step, browser selftest suite).
>
> I'd love feedback on the 3D surfaces especially — the black-hole lens pass was the most fun to tune.

**Link:** https://cellscape.art/

---

## 2. Product Hunt

**Name:** Cellscape
**Tagline:** Grown, not drawn — turn Conway's Game of Life into print-quality wall art
**URL:** https://cellscape.art/
**Topics:** Art tools · Generative art · Designer tools
**Descripción (primera sección):**
> Cellscape is a free, browser-based cellular automata art generator. Pick from 32 rule presets (or type your own B/S rule), pick a surface — plane, torus, sphere, knot, Möbius, or a black hole with gravitational lensing — choose one of 27 palettes, and let the simulation grow a unique artwork. Long-exposure mode accumulates history into temporal gradients, terrain mode turns that history into a heightmap, and voxel mode renders it in 3D. Export up to 7200×10800 @300dpi for real printing, or download a WebM clip. Everything runs locally in your browser; nothing is uploaded anywhere.
>
> Why "grown, not drawn": every pixel traces back to one small rule applied over and over — the way a crystal's structure traces back to its lattice.
>
> Gallery of patterns: https://cellscape.art/gallery/
> Guide to how it works: https://cellscape.art/blog/cellular-automata-art-guide/

**Gallery del PH:** 5 capturas sugeridas: (1) la app con pulsar y Neon, (2) torus en Vaporwave, (3) black hole en Fire, (4) terrain en Forest, (5) export 4K PNG.

---

## 3. r/generative

**Título:** I made a free browser tool where cellular automata become print-quality art (WebGL2, 3D surfaces, 27 palettes)
**Texto:**
> Hey r/generative! I've been working on Cellscape, a generative art tool built around Conway's Game of Life and Life-like rules. It runs fully in the browser (WebGL2 shaders, no backend), and the interesting part for this sub: it treats the simulation as a *rendering medium*, not a toy.
>
> - 27 palettes + long-exposure accumulation → temporal gradients
> - 3D surfaces — torus, sphere, knot, Möbius, and a black hole with actual gravitational lensing shader
> - Terrain mode: the CA's visit-history becomes a heightmap; voxel mode renders it volumetric
> - Exports up to 7200×10800 @300dpi (print ready) + WebM
> - Deep links like /?pattern=glider preload any configuration
>
> Try it: https://cellscape.art/ — gallery: https://cellscape.art/gallery/
> The engine is lazy-loaded on first interaction and there's a selftest suite in the repo: https://github.com/rcastro1089/cellular-art-generator
>
> Would love critique on the black-hole lens or the terrain mapping. What would you add next?

---

## 4. r/cellular_automata

**Título:** WebGL2 CA art generator — 32 rule presets, 26 patterns, 3D surfaces, print-quality export
**Texto:**
> Sharing a tool I built: Cellscape renders Life-like cellular automata as generative wall art in the browser (WebGL2 shaders, CPU fallback). It supports custom B/S rules, 26 named patterns, long-exposure accumulation, and non-planar surfaces (torus, sphere, knot, Möbius — plus a gravitationally-lensed black hole scene).
>
> Deep links are handy for sharing specific rules: https://cellscape.art/?rule=seeds&pattern=glider — the page preloads that configuration.
>
> Exports go up to 7200×10800 @300dpi for printing, and the whole thing runs locally (no uploads, no account): https://cellscape.art/
> Source + pattern list: https://github.com/rcastro1089/cellular-art-generator

---

## 5. Awesome list — vovanmozg/awesome-cellular-automata

**PR objetivo:** añadir el repo en la sección de implementations/web:
- Título del PR: `Add Cellscape — a browser-based cellular automata art generator (WebGL2)`
- Entrada sugerida: `- [Cellscape](https://github.com/rcastro1089/cellular-art-generator) - Browser-based CA art generator with WebGL2 rendering, 3D surfaces and print-quality export ([live](https://cellscape.art))`

---

## 6. Pinterest (guía del owner)

1. Crear cuenta (email del owner) → tablero público **"Cellular Automata Art"**
2. 10 pins: usar exports/imágenes: pulsar neon, torus vaporwave, black hole fire, terrain forest, seeds paper, glider, gosper, diehard, day&night, voxel
3. Cada pin → link a `https://cellscape.art/gallery/` (7 pins) o `https://cellscape.art/blog/math-art-decor-ideas/` (3 pins)
4. Descripción: "Generative cellular automata art — grown, not drawn. Free in your browser. #generativeart #cellularautomata #mathart #wallart"
5. Un pin por semana durante el primer mes (cadencia constante)