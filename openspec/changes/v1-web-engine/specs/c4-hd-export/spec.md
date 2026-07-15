# C4 — HD Export

## Requirements

### R1 — Export Resolution
- Render current frame at user-selectable resolution: 1920×1080, 3840×2160 (4K), 4000×4000, 6000×4000, 8000×8000
- Render off-screen using WebGL2 framebuffer or Canvas 2D (fallback)
- Maintain aspect ratio or allow custom crop

### R2 — Export Formats
- PNG (lossless, default)
- JPEG (compression quality selectable)
- SVG (vector export for simple 2D grids) — Phase 2
- PDF (print-ready layout with margins) — Phase 2

### R3 — Export Options
- Include/Exclude watermark
- Add title/label overlay (e.g., "Rule B3/S23 — Generation 142")
- Color profile: sRGB (web standard) with option for Adobe RGB

### R4 — Delivery
- Browser download as file
- Direct upload to Printful (via API) for print ordering
- Copy to clipboard for quick sharing

## Acceptance Criteria

- [ ] 4K export renders correctly without artifacts
- [ ] 8000×8000 export works (may take a few seconds)
- [ ] PNG download works in all modern browsers
- [ ] Watermark option functional
- [ ] Rule/gen overlay option functional
