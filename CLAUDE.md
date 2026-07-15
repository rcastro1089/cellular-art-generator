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

## Project Structure
```
~/MEGA/proyectos/apps/cellular-art-generator/
├── index.html              → Main app (tool + homepage)
├── generator.html          → Full-screen tool
├── blog/                   → Blog articles
├── gallery/                → Pattern showcase
├── shop.html / faq.html / about.html
├── src/js/                 → JavaScript
├── src/shaders/            → GLSL shaders
├── src/css/                → Styles
├── openspec/               → OpenSpec design docs
│   └── changes/v1-web-engine/
├── research/               → Market research
│   ├── dataforseo/
│   ├── copywriting/
│   ├── competitors/
│   └── technical/
└── CLAUDE.md               → This file
```

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
