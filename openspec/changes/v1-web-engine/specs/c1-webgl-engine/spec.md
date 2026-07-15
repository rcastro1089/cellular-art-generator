# C1 — WebGL2 GPU Engine

## Requirements

### R1 — Shader-Based CA Simulation
- Implement Conway's Game of Life and Life-like rules using WebGL2 fragment shaders with ping-pong texture technique
- Support configurable B/S rules (birth/survival digits 0-8)
- Support at minimum 2000×2000 cell grid, rendered at interactive framerates (30+ FPS)
- Use floating-point textures (RGBA32F) for multi-state cell values
- Fallback: Canvas 2D CPU-based simulation when WebGL2 unavailable

### R2 — Visual Rendering
- **Color palettes:** 20+ predefined palettes (neon, matrix, fire, ocean, gold, pastel, etc.)
- **Gradients:** Cell color blends between states using palette interpolation
- **Glow/Bloom:** Post-processing bloom shader for premium neon look
- **Background:** Configurable background color/gradient, separate from cell colors
- **Anti-aliasing:** Supersample or FXAA for smooth output

### R3 — Controls & UI
- Play/pause/step controls
- Speed slider (1-120 FPS)
- Grid size selector (100×100 to 2000×2000)
- Rule editor (B/S input fields with validation)
- 32+ preset rule selector (presets list from research)
- 25+ preset patterns (gliders, guns, oscillators, spaceships)
- Random fill (adjustable density 0.01-0.99)
- Clear/reset

### R4 — Interaction
- Click to toggle cells (alive/dead)
- Click-drag to paint cells
- Right-click to kill cells
- Touch support for mobile
- Keyboard shortcuts (Space=play, R=random, C=clear, S=step)

### R5 — Performance
- 60 FPS at 500×500 with WebGL2
- 30 FPS at 2000×2000 with WebGL2
- Graceful degradation to Canvas 2D for unsupported browsers
- GPU memory management (cleanup on resize/reset)

## Acceptance Criteria

- [ ] WebGL2 shader simulation runs at 60 FPS for 500×500 grid
- [ ] 20+ color palettes with gradient interpolation
- [ ] Bloom post-processing effect visible
- [ ] All 32 preset rules functional
- [ ] Click/touch interaction works on mobile and desktop
- [ ] Canvas 2D fallback works when WebGL2 unavailable
- [ ] Grid up to 2000×2000 renders without crash
