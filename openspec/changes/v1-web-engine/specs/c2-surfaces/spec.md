# C2 — Surface Modes

## Requirements

### R1 — Planar Mode (Default)
- Standard flat grid with optional wrapping (toroidal edges)
- Wrapping: cells on the right edge connect to left edge, top to bottom
- Users can toggle wrapping on/off

### R2 — Toroidal Mode
- Grid rendered onto a 3D torus (donut) surface using WebGL
- CA simulation still runs on flat grid but mapped to torus UV coordinates
- Rotatable 3D view with mouse drag
- Preserves topological wrapping naturally

### R3 — Spherical Mode
- Grid mapped onto a sphere using equirectangular or custom UV mapping
- CA simulation runs on flat grid; rendering projects onto sphere
- Seamless at poles using adjusted neighborhood logic
- Rotatable 3D view

### R4 — Hyperbolic Mode (optional, Phase 2)
- Implement regular hyperbolic tiling (e.g., {7,3} or {5,4} grid)
- Use existing research from dmishin's hyperbolic CA simulator
- Only if WebGL2 performance budget allows

## Acceptance Criteria

- [ ] Planar mode with toggleable wrapping
- [ ] Toroidal mode renders grid as 3D torus, rotatable
- [ ] Spherical mode renders grid as 3D sphere, rotatable
- [ ] All surface modes support same rules and interactions
- [ ] Export works in all surface modes
