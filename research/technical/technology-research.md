# Technology Research

## Overview of CA Rendering Technologies

| Technology | Grid Size | FPS (500²) | FPS (2000²) | Browser Support | Complexity |
|------------|:---------:|:----------:|:-----------:|:---------------:|:----------:|
| Canvas 2D (naive) | ~200² | 60 | 5 | 100% | Low |
| Canvas 2D (optimized, ImageData) | ~500² | 60 | 15 | 100% | Medium |
| WebGL2 Fragment Shaders | ~4000² | 60 | 30 | ~95% | High |
| WebGPU Compute Shaders | ~10000² | 60 | 60 | ~70% | Very High |
| Three.js (3D voxel) | ~100³ | 30 | — | ~95% | High |

## WebGL2 CA Simulation (Recommended)

### Ping-Pong Texture Technique
1. Create two RGBA32F textures (A, B) at grid resolution
2. Render quad with CA fragment shader: read A → write to B
3. Swap A ↔ B each frame
4. Render B to screen with color-mapping shader

### Key Advantages
- GPU parallelizes neighborhood checks across ALL cells
- 2000×2000 = 4M cells, each checking 8 neighbors = 36M operations per frame
- GPU does this in ~3ms, CPU would take 200+ms
- Post-processing (bloom, glow) is essentially free on GPU
- Offscreen rendering for HD export is trivial

### References
- benpm.github.io/blog/gol_1/ — WebGL CA tutorial series
- vectrx.substack.com/p/webgpu-cellular-automata — GPU CA guide
- kausthub.substack.com/p/building-conways-game-of-life-with — WebGPU version

## Existing 3D CA Implementations

| Project | Tech | Grid | Features |
|---------|------|:----:|----------|
| ho-wan.github.io/3dca/ | Three.js | ~50³ | Polished 3D graphics |
| williamyang98/3D-Cellular-Automata | Three.js | ~30³ | Basic |
| cubes.charliedeck.com | Three.js | ~40³ | 6-neighbor (von Neumann) |
| iris.joshua-becker.com/lab/game-of-life-3d/ | Three.js | ~60³ | Voxel cloud, rule variants |
| webgpu.com/showcase/game-3d-life | WebGPU | ~200³ | Compute shaders, fast |

## Non-Planar Surface Implementations

| Surface | Project | Tech | Print-Ready? |
|---------|---------|------|:-----------:|
| Toroidal | Our current Canvas impl | Canvas 2D | Basic |
| Spherical | ventrella.com/SphereCA | Custom | No |
| Hyperbolic | dmishin.github.io/hyperbolic-ca-simulator | Canvas 2D | No |
| Spherical + toroidal | This project (planned) | WebGL2 | Yes (planned) |

## Lightweight WebGL Libraries

| Library | Size (gzip) | Purpose |
|---------|:-----------:|---------|
| **Regl** | ~25KB | Functional WebGL, great for ping-pong textures |
| **twgl** | ~30KB | WebGL helper, less opinionated |
| **Three.js** | ~150KB | Full 3D engine (lazy load for 3D mode) |

**Recommendation:** Use raw WebGL2 for the CA engine (no library needed for ping-pong), Three.js for 3D mode only.

## Export Pipeline

### HD Export via WebGL2
1. Create framebuffer at target resolution (e.g., 4000×4000)
2. Bind framebuffer, render CA + post-processing
3. `gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)`
4. Create `ImageData` → `canvas.putImageData()` → `canvas.toBlob()`
5. `URL.createObjectURL(blob)` → download link

### Memory Considerations
- 4000×4000×4 bytes = 64MB per frame (acceptable)
- 8000×8000×4 bytes = 256MB per frame (mobile limit)
- Cap mobile at 4K, desktop up to 8K
