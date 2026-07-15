# Design — Cellular Automata Art Generator

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    SINGLE-PAGE WEB APP                           │
│                       (index.html)                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                   RENDERER SELECTOR                      │     │
│  │  (Auto-detect: WebGL2 → WebGL1 → Canvas2D)              │     │
│  └──────────┬──────────────────────────────────────┬────────┘     │
│             │                                      │              │
│  ┌──────────▼──────────┐    ┌──────────────────────▼──────────┐  │
│  │  WEBGL2 GPU ENGINE  │    │  CANVAS 2D (FALLBACK)          │  │
│  │  ┌────────────────┐ │    │  ┌────────────────────────┐    │  │
│  │  │ CA Simulation  │ │    │  │ CPU Simulation         │    │  │
│  │  │ (frag shader   │ │    │  │ (naive array loop)     │    │  │
│  │  │  ping-pong)    │ │    │  │                        │    │  │
│  │  ├────────────────┤ │    │  ├────────────────────────┤    │  │
│  │  │ Post-Process   │ │    │  │ Basic rendering        │    │  │
│  │  │ (bloom, glow,  │ │    │  │ (fillRect per cell)    │    │  │
│  │  │  color-map)    │ │    │  └────────────────────────┘    │  │
│  │  ├────────────────┤ │    └──────────────────────────────────┘  │
│  │  │ HD Renderer   │ │                                         │
│  │  │ (offscreen    │ │                                         │
│  │  │  framebuffer) │ │                                         │
│  │  └────────────────┘ │                                         │
│  └─────────────────────┘                                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              THREE.JS 3D MODE (lazy)                    │     │
│  │  ┌─────────────────────────────────────────────────┐    │     │
│  │  │ 3D CA voxel simulation + orbit controls         │    │     │
│  │  └─────────────────────────────────────────────────┘    │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              MONETIZATION LAYER                          │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │     │
│  │  │ Gumroad      │  │ Printful     │  │ Adsense      │   │     │
│  │  │ (descargas)  │  │ (POD físico) │  │ (blog, Fase2)│   │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              PAGES (STATIC HTML SECTIONS)                │     │
│  │  /  /generator  /blog/*  /gallery/*  /shop  /faq  /about│     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Simulation** | WebGL2 fragment shaders | GPU-accelerated, 95% browser support, no dependencies |
| **3D** | Three.js (CDN, lazy-load) | Mature, well-documented, instanced rendering |
| **2D fallback** | Canvas 2D | 100% browser support, simple implementation |
| **Export** | OffscreenCanvas/gl.readPixels | No server needed, instant download |
| **Payments** | Gumroad (Phase 1) → Stripe (Phase 2) | Minimal setup, handles tax/compliance |
| **POD** | Printful (Phase 1: link, Phase 2: API) | Best quality, US+EU fulfillment |
| **Hosting** | Cloudflare Pages (static) | Free, fast CDN, no backend needed |
| **Framework** | Vanilla JS | No build step, single HTML file, fastest load |

## WebGL2 Engine Design

### CA Simulation Pipeline

```
Frame N (textureA)  ──→  Fragment Shader (CA rules)  ──→  Frame N+1 (textureB)
       ↑                                                        │
       └────────────────────── Swap ────────────────────────────┘
```

- **Input:** RGBA32F texture (R=cell state 0.0 or 1.0, GBA unused)
- **Output:** Same format texture
- **Neighborhood:** Read 8 neighbors from input texture, apply B/S rule
- **Rule encoding:** Pass B and S bitmasks as uniforms (birthMask, surviveMask)

### Post-Processing Pipeline

```
CA Output → Bloom Pass → Color Mapping → Tone Mapping → Screen
```

- **Bloom:** Extract bright pixels → gaussian blur (separated X/Y) → additive blend
- **Color Mapping:** Cell state (0 or 1) maps to palette color with optional gradient mixing based on neighbor count or generation age
- **Palette format:** Array of 2-5 color stops, interpolated based on cell "age" (generations alive)

### HD Export

1. Pause simulation
2. Create offscreen WebGL2 framebuffer at target resolution
3. Re-render CA state + post-processing at full resolution
4. Read pixels with gl.readPixels
5. Convert to Blob → download via URL.createObjectURL

## Surface Modes

Each surface mode is a vertex/fragment shader variation:

- **Planar:** Simple quad, UV = cell coordinates
- **Toroidal:** Cylinder warp → torus topology in vertex shader
- **Spherical:** Equirectangular UV mapping on sphere mesh
- **All modes:** CA simulation runs on flat grid; only RENDERING changes

## Data Flow

```
User Action → State Manager → CA Engine → Render Pipeline → Canvas
                                    │
                                    ↓
                              Export Handler → File Download / Printful
```

- **State:** Single object `{ grid, generation, rules, palette, surface, isPlaying, speed }`
- **No database needed** — all state is in-memory
- **Config sharing:** URL hash params encode rule/palette/seed for bookmarkability

## File Structure

```
cellular-art-generator/
├── index.html                     ← Main app (tool + homepage)
├── generator.html                 ← Full-screen generator page
├── blog/                          ← Blog content pages
│   ├── cellular-automata-art-guide.html
│   ├── algorithmic-art-generators.html
│   └── ...
├── gallery/                       ← Pattern gallery pages
│   ├── index.html
│   └── patterns/glider-gun.html
├── shop.html                      ← Product listing
├── faq.html
├── about.html
├── src/
│   ├── js/
│   │   ├── app.js                 ← Main app controller
│   │   ├── engine.js              ← CA engine (WebGL2 + Canvas2D)
│   │   ├── renderer.js            ← Rendering pipeline
│   │   ├── export.js              ← HD export handler
│   │   ├── ui.js                  ← UI controls
│   │   ├── presets.js             ← Rule + pattern presets
│   │   ├── palettes.js            ← Color palettes
│   │   └── monetization.js        ← Gumroad + Printful integration
│   ├── shaders/
│   │   ├── ca-sim.frag            ← CA simulation fragment shader
│   │   ├── bloom.frag             ← Bloom post-process
│   │   ├── blur-x.frag            ← Horizontal blur (bloom)
│   │   ├── blur-y.frag            ← Vertical blur (bloom)
│   │   └── color-map.frag         ← Color mapping shader
│   └── css/
│       └── style.css              ← All styles
├── assets/
│   └── og-image.png               ← Open Graph image
├── openspec/
│   └── changes/v1-web-engine/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/
│           ├── c1-webgl-engine/spec.md
│           ├── c2-surfaces/spec.md
│           ├── c3-3d-mode/spec.md
│           ├── c4-hd-export/spec.md
│           ├── c5-printful/spec.md
│           ├── c6-content/spec.md
│           └── c7-monetization/spec.md
├── research/
│   ├── dataforseo/
│   │   └── results.md
│   ├── copywriting/
│   │   └── language-analysis.md
│   ├── competitors/
│   │   └── competitive-landscape.md
│   └── technical/
│       └── technology-research.md
└── CLAUDE.md                      ← Project context
```
