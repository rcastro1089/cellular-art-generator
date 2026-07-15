# C3 — 3D Mode

## Requirements

### R1 — Three.js Integration
- Load Three.js from CDN (lazy-loaded, not in critical path)
- 3D CA mode renders cells as voxel cubes in 3D space
- Grid size limited to 100×100×100 (1M voxels) for performance
- Use instanced mesh rendering for performance

### R2 — Controls
- Orbit controls: rotate, pan, zoom with mouse/touch
- Toggle between 2D and 3D views
- Camera auto-rotation option
- Slice viewing: show/hide layers

### R3 — 3D CA Simulation
- 3D Moore neighborhood (26 neighbors)
- 3D von Neumann neighborhood (6 neighbors) as alternative
- Configurable B/S rules for 3D (e.g., 4D/5D/6D/7D neighborhood counts)
- Preset 3D rules (4555, Amoeba, etc.)

### R4 — Rendering
- Voxel colors from same palette system as 2D
- Voxel opacity slider (see-through effect for interior cells)
- Edge glow on voxels for visual quality

## Acceptance Criteria

- [ ] 3D view renders and is rotatable
- [ ] Voxel simulation runs at 30+ FPS for 50×50×50 grid
- [ ] Rules configurable for 3D neighborhoods
- [ ] 2D/3D toggle works seamlessly
- [ ] Color palettes transfer from 2D mode
