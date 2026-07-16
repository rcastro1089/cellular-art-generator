# Proposal — Phase 4b: Exposure Terrain + Phase 5: Color Noise Generator

Status: PROPOSED (not started). Written 2026-07-16.
Context: Phase 4 surfaces (torus knot, Möbius strip, black hole "Gargantua") are
ALREADY SHIPPED in commit 9a4640e (UI buttons at `#modeSeg`, `buildSurface()` /
`buildBlackHole()` in THREE3D). This doc covers the two remaining phases.

---

## Phase 4b — Exposure Terrain ("crestas y valles")

### Concept
A 3D relief landscape where the long-exposure accumulation IS the topography:
- **Height** = visit count (`accumCnt` / accum texture G channel) — cells the CA
  visited often become ridges/peaks; never-visited cells stay as valley floor.
- **Color** = generation of last visit (`accumGen` / R channel) mapped through
  the active palette — identical semantics to the 2D long-exposure mode, so the
  terrain is literally the 2D artwork extruded.
- Result: gliders carve canyons, oscillators build towers, still lifes become
  mesas. Unique print angle: "your simulation's history as a landscape".

### Architecture (fits existing code)
1. **Data source — two engines, one interface:**
   - `CPUEngine`: already has `accumGen: Float32Array`, `accumCnt: Uint16Array`
     (index.html ~line 1328). Free.
   - `GLEngine`: accum lives in `accumTex` (RGBA32F ping-pong, R=lastGen,
     G=count). Add `readAccum()`: bind accum FBO, `gl.readPixels(..., gl.RGBA,
     gl.FLOAT, buf)` (EXT_color_buffer_float already required by the engine).
     Throttle: read every K generations (K = 4–8) and only while terrain mode
     is active. n≤512 → ≤4MB read, fine at 30fps/4.
2. **THREE3D.buildTerrain()** (new, sibling of buildSurface/buildBlackHole/
   buildVoxelWorld):
   - `PlaneGeometry(W, W, S, S)` with S = min(n, 256) segments (decimate the
     grid for vertex count; sample accum with bilinear averaging when n > S).
   - Update path per animation tick (or per K gens): write heights into
     `geometry.attributes.position` (Y), write vertex colors into a `color`
     attribute, `computeVertexNormals()`, set `needsUpdate`. This mirrors how
     the voxel mode already streams per-frame geometry — no shader plumbing
     across GL contexts needed (canvas texture can't carry float precision).
   - Height mapping: `h = H * smoothstep(0,1, log1p(cnt) / log1p(cntMax))` —
     log scale so early exposure doesn't saturate; H ≈ 22% of plane width.
     Optional `terrainRelief` slider (0.5×–2×).
   - Material: `MeshStandardMaterial({ vertexColors: true, flatShading: false,
     roughness: .85 })` + the existing directional/hemisphere light rig from
     buildVoxelWorld (reuse). Paper theme → raise ambient, lower dir intensity
     (hillshade-on-white look, excellent for print).
   - Optional water plane at h=0 with palette bg color, slight opacity.
3. **UI:** add `⛰ Terrain` button to `#modeSeg` (data-mode="terrain"), route in
   `setViewMode()` like blackhole. Show hint: "Terrain grows from Long
   Exposure — switch render mode to ⏱ if off". If renderMode === 'live',
   auto-suggest (toast) enabling history.
4. **Export:** existing 3D auto-framed HD export works as-is (composer path).
   Camera preset: `{ r: 13, pos: [0, 14, 20] }`, slight top-down.
5. **Selftest:** pure-JS check — run 8 gens of a blinker on CPUEngine, assert
   height function is monotonic in accumCnt and h=0 where cnt=0.

### Tasks & estimates
| # | Task | Est |
|---|------|-----|
| T1 | GLEngine.readAccum() throttled readback | 1.5h |
| T2 | buildTerrain(): geometry, height+color streaming, lights, camera | 3h |
| T3 | UI button + hints + relief slider + paper-theme tuning | 1h |
| T4 | Selftest + CLAUDE.md doc | 0.5h |

**Total ≈ 6h.** Risks: readPixels stall on weak GPUs (mitigate: K throttle,
only in terrain mode); vertex count on mobile (cap S at 128 for touch devices).

---

## Phase 5 — Color Noise Generator (future-premium; FREE for now)

### Interpretation (confirmed with user 2026-07-16)
Audio ambient noise generator — the classic "noise colors": white, pink, brown
(red), blue, violet, grey. Pairs with the visual CA as a focus/ambience tool
("watch the automaton, listen to brown noise"). Premium hook only — NOT gated
yet, same pattern as `FEATURES.videoExport`.

### Architecture
1. **Web Audio, AudioWorklet-first** (fallback: ScriptProcessorNode for old
   Safari). All inline (no build step): worklet code as Blob URL string.
2. **Noise algorithms** (per 128-sample render quantum, stereo decorrelated —
   two independent generators L/R for width):
   - **White:** `Math.random()*2-1` (or xorshift for speed).
   - **Pink (−3 dB/oct):** Voss-McCartney 8-row, or Paul Kellet filter
     (3-pole IIR on white) — Kellet is simpler and fine.
   - **Brown (−6 dB/oct):** leaky integrator of white: `b += 0.02*(w−b)`,
     scale ×3.5, clamp.
   - **Blue (+3 dB/oct):** differentiated pink. **Violet (+6 dB/oct):**
     differentiated white.
   - **Grey:** white through an inverse-A-weighting-ish EQ — implement as
     white → 2 biquad shelves (low +8dB @ <150Hz, high +6dB @ >6kHz) via
     BiquadFilterNodes AFTER the worklet (cheap, no DSP in worklet).
3. **Graph:** worklet → (optional grey EQ) → StereoPannerNode →
   GainNode (volume, default 0.4, exponential ramps to avoid clicks) →
   destination. One AudioContext lazily created on first play (autoplay
   policy: must start from user gesture).
4. **UI:** new sidebar card "🔊 Ambience": noise-type segmented control
   (⚪ White | 🌸 Pink | 🟤 Brown | 🔵 Blue | 🟣 Violet | ⬜ Grey), volume
   slider, play/stop, sleep timer (15/30/60 min, `setTimeout` → 3s fade-out).
   Persist choice in localStorage.
5. **Audio-reactive visual (nice-to-have, +1.5h):** AnalyserNode → rms drives
   `bloomPass.strength` ±20% when 3D composer active. Off by default.
6. **Premium hook:** `FEATURES.noiseGenerator = { premium: false }` — when
   flipped, blur the card + Gumroad unlock CTA (same flow videoExport will
   use in Sprint 3).
7. **Selftest:** pure-JS spectral sanity — generate 2^14 brown samples, assert
   variance of the diff signal ≪ variance of white diff (integrator works);
   assert all outputs bounded [−1,1].

### Tasks & estimates
| # | Task | Est |
|---|------|-----|
| N1 | Worklet + 6 noise algorithms + graph + fades | 3h |
| N2 | Ambience UI card + timer + localStorage | 1.5h |
| N3 | FEATURES.noiseGenerator hook + docs | 0.5h |
| N4 | Selftest + (optional) audio-reactive bloom | 0.5h (+1.5h opt) |

**Total ≈ 5.5h (7h with reactive bloom).** Risks: autoplay policy (start on
gesture only — already the plan); iOS Safari worklet quirks (fallback node);
keep DSP allocation-free in `process()` (GC pauses = audible glitches).

---

## Recommended order
1. Phase 4b terrain first — it's a print/export differentiator (revenue-facing,
   feeds Printful/Gumroad sprint 3).
2. Phase 5 noise second — engagement/retention feature, premium later.
Both before Sprint 4 (Content & SEO), so articles/gallery can showcase them.
