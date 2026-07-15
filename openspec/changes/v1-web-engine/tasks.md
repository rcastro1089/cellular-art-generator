# Tasks — v1 Web Engine

## Execution Order

### Sprint 1: Core WebGL2 Engine (Priority: CRITICAL)
These tasks produce the minimum viable product — a working CA generator with beautiful output.

| # | Task | Capability | Est. Time | Depends On |
|:-:|------|:----------:|:---------:|:----------:|
| 1.1 | Set up project structure (files, folders, dev setup) | C1 | 1h | — |
| 1.2 | Implement Canvas 2D CA simulation (fallback) | C1 | 2h | 1.1 |
| 1.3 | Implement WebGL2 ping-pong CA simulation shader | C1 | 4h | 1.2 |
| 1.4 | Build basic UI: play/pause, step, speed, rule editor | C1 | 3h | 1.3 |
| 1.5 | Implement preset rules (32) + preset patterns (25+) | C1 | 2h | 1.4 |
| 1.6 | Implement color palette system (20+ palettes, gradients) | C1 | 3h | 1.3 |
| 1.7 | Implement bloom post-processing shader | C1 | 3h | 1.3 |
| 1.8 | Add click/touch interaction (toggle, paint) | C1 | 2h | 1.4 |
| 1.9 | Implement grid size selector + random fill | C1 | 1h | 1.4 |
| 1.10 | Canvas 2D → WebGL2 auto-detection and fallback | C1 | 1h | 1.3, 1.2 |
| 1.11 | **HD Export** — offscreen framebuffer, resolution selector, PNG download | C4 | 4h | 1.6, 1.7 |

### Sprint 2: Surfaces + 3D (Priority: HIGH)

| # | Task | Capability | Est. Time | Depends On |
|:-:|------|:----------:|:---------:|:----------:|
| 2.1 | Implement planar toroidal wrapping | C2 | 1h | 1.3 |
| 2.2 | Implement toroidal surface mode (3D donut render) | C2 | 4h | 1.3, 1.6 |
| 2.3 | Implement spherical surface mode | C2 | 4h | 1.3, 1.6 |
| 2.4 | Surface mode selector UI | C2 | 1h | 2.2, 2.3 |
| 2.5 | **3D Mode** — Three.js integration + voxel simulation | C3 | 6h | 1.3 |
| 2.6 | 3D controls (orbit, zoom, 2D/3D toggle) | C3 | 2h | 2.5 |
| 2.7 | 3D CA rules (modified neighborhood counts) | C3 | 2h | 2.5 |

### Sprint 3: Monetization (Priority: HIGH)

| # | Task | Capability | Est. Time | Depends On |
|:-:|------|:----------:|:---------:|:----------:|
| 3.1 | Gumroad integration for HD download ($9.99) | C7 | 2h | 1.11 |
| 3.2 | Printful Phase 1 — direct link + product variants | C5 | 2h | 1.11 |
| 3.3 | "Download HD" + "Order Print" buttons in UI | C7 | 1h | 3.1, 3.2 |
| 3.4 | Printful Phase 2 — full API integration | C5 | 6h | 3.2 |
| 3.5 | SVG vector export (Phase 2) | C4 | 4h | 1.11 |

### Sprint 4: Content & SEO (Priority: MEDIUM)

| # | Task | Capability | Est. Time | Depends On |
|:-:|------|:----------:|:---------:|:----------:|
| 4.1 | Pillar article: "What is Cellular Automata Art?" (3000+ words) | C6 | 4h | — |
| 4.2 | 5 cluster blog articles | C6 | 10h | 4.1 |
| 4.3 | Gallery pages (30+ pattern pages) | C6 | 6h | — |
| 4.4 | FAQ page + About page + Shop page | C6 | 3h | — |
| 4.5 | SEO meta tags, Open Graph, sitemap | C6 | 2h | 4.1-4.4 |
| 4.6 | Deploy to Cloudflare Pages + custom domain | C6 | 1h | 4.1-4.5 |

### Sprint 5: Launch & Distribution

| # | Task | Est. Time |
|:-:|------|:---------:|
| 5.1 | Post to r/cellular_automata, r/generative, r/proceduralgeneration | 1h |
| 5.2 | Hacker News "Show HN" post | 1h |
| 5.3 | Product Hunt launch | 2h |
| 5.4 | Monitor feedback, fix issues | Ongoing |

## Total Estimated Time

| Sprint | Hours | 
|--------|:-----:|
| Sprint 1 (Engine) | 26h |
| Sprint 2 (Surfaces+3D) | 20h |
| Sprint 3 (Monetization) | 15h |
| Sprint 4 (Content) | 26h |
| Sprint 5 (Launch) | 4h |
| **Total** | **~91h** |

## Blockers / Risks

- WebGL2 not available on some older browsers (~5% of users) → Canvas 2D fallback mitigates
- Printful API changes → Use Phase 1 (direct link) as backup
- Three.js bundle size (lazy-load via CDN, ~150KB gzipped)
- HD export memory limits on mobile (8000×8000 = 256MB for a single frame) → Cap mobile at 4K
