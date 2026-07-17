# UI/UX Premium — Audit + Plan (pre-Gumroad)

Written 2026-07-17, at commit fe34e68. Requested by owner: "the page must
feel premium, professional, intuitive" — audited as if it were a product
app, not a demo.

Measured baseline: **9 sidebar cards, 81 interactive controls, 26 emojis**
used as iconography. Fullscreen shows a square canvas floating on a dark
void. Verdict: the engine is premium; the shell reads as a hacker demo.

---

## Findings (UX audit)

### F1 — Fullscreen is a wasted flagship moment · CRITICAL
`⛶` fullscreens `#stage`, but `fitCanvas()` keeps the canvas square and
capped, so a 16:9 monitor shows a centered square with huge dead margins.
The owner's actual use case — "background while I study" — is the single
strongest engagement + retention story this product has (visual ambience +
color noise = a focus app), and it's currently broken.

### F2 — Control overload · CRITICAL
81 controls always visible. Nothing is progressive: raw B/S digit inputs,
slice axis selectors, cell-shape dropdowns and export fit-modes hit every
first-time visitor at once. Users don't need 90% of it in the first minute.

### F3 — Emoji iconography · HIGH
26 emojis as UI icons (🍩🪢➿🕳⛰🧊🎲✕🎬🔊⚪🌸🟤…). Emojis render
differently per OS, have inconsistent stroke/weight/color, and read as
casual. This single fix moves perceived quality the most per hour invested.

### F4 — Branding is invisible & the print legend is weak · HIGH
- Overlay label is OFF by default → most downloaded/printed images carry
  zero branding (lost viral loop for a print business).
- Legend text is mechanical: `B3/S23 · Generation 1234 · <url>`.
- Name "Cellular Automata Art Generator" is descriptive SEO text, not a
  brand: 5 words, unpronounceable domain, nothing ownable. Fine as an SEO
  H1/subtitle; weak as the mark stamped on prints.

### F5 — Audio is correct but flat · MEDIUM
- Fade-in exists but is only 0.4s (reads as a pop); stop fade 0.5s.
- Switching noise type restarts the graph audibly.
- All six colors are static loops — no life, no motion. The "waves
  breaking" sound the owner heard is NOT a plain noise color: ocean surf
  is **brown noise with a slow swell** — amplitude + lowpass cutoff
  modulated by a ~0.05–0.12 Hz LFO (each "wave" is the noise rising,
  cresting brighter, and washing out). Blue is the opposite (bright hiss).
- No loudness matching between colors (violet feels weak, brown feels loud).
- No master limiter — brown ×3.2 can clip near max volume.

### F6 — Small trust details · MEDIUM
Toasts with emojis, monospace overload, palette chips with 5px names,
inconsistent microcopy ("⚠ 100³ = 1M voxels — expect low FPS"). Premium is
mostly the sum of these.

---

## Plan (5 workstreams, ordered)

### W1 — Icon system + visual polish (≈4h) — do first, biggest lift
- Inline SVG sprite in index.html (`<symbol>` set, Lucide-style 24px
  1.5px-stroke outline icons, `currentColor`): play/pause, step, shuffle,
  trash, torus, sphere, knot, mobius, black-hole, mountain, cube, camera,
  image, video, volume, timer, sun/moon, layers, maximize, move, rotate,
  zoom…  (~28 icons). Zero emojis anywhere: buttons, selects (text-only
  options), toasts, hints, mode names.
- Typography/spacing pass: consistent 8px rhythm, card titles smaller +
  letterspaced, remove double borders, soften glow, one accent gradient
  reserved for primary actions only.

### W2 — Simplify: progressive disclosure (≈4h)
Target: ≤25 controls visible on load; nothing lost, everything foldable.
- Sidebar regrouped into 5 sections: **Create** (play/step/random/clear,
  speed, rule PRESET select), **Look** (palette grid, theme, exposure
  toggle), **Surface** (mode segment + contextual sub-panel), **Ambience**,
  **Export**.
- Move behind an "Advanced" disclosure (collapsed by default): custom B/S
  inputs, density, grid size, cell shape, bloom intensity, wrap toggle,
  export fit-mode + transparent, voxel rule editor + slice controls.
- Patterns select merges into Create. Timeline card only appears once ≥2
  snapshots exist. Toast copy rewritten, no emoji, sentence case.

### W3 — Ambient fullscreen ("Focus mode") (≈5h) — the study-background feature
- Fullscreen now renders **cover-viewport**: planar GL path gets an
  aspect-aware uv window (same math as export 'fill'), CPU path already
  cover-crops; 3D modes set `camera.aspect` + renderer to viewport size.
- UI chrome (sidebar/header/hint/viewBar) fades out after 3s idle; cursor
  auto-hides; ESC or move to exit. Subtle corner watermark.
- One-click entry: "Focus mode" button = fullscreen + (optional) start the
  selected noise — the visual + audio ambience story in a single action.

### W4 — Audio v2 (≈5h)
- **Fades**: fade-in 1.8s on play, fade-out 1.2s on stop, 0.6s crossfade
  when switching type (build new graph in parallel, ramp both gains —
  no restart click). Timer keeps its 3s fade.
- **Ocean preset** (the "waves" the owner wants): brown noise through a
  lowpass whose cutoff (350→900 Hz) and gain (0.35→1.0) ride a randomized
  slow LFO (period 8–14s, eased), plus a slow stereo drift. Listed as
  "Ocean — waves breaking" next to the six colors.
- **Loudness matching**: per-type calibration gains so switching types
  keeps perceived volume constant.
- **Master chain**: gentle DynamicsCompressor as safety limiter →
  destination. Headroom fixed, no clipping at 100%.
- Selftest: ocean LFO bounds + calibration table sanity.

### W5 — Branding + print overlay (≈3h + naming decision)
- Overlay **ON by default** (owner decision), redesigned: small logo mark +
  brand name + rule/gen + tagline, kerned properly on a translucent pill;
  the checkbox to disable stays (premium could later remove watermark —
  classic freemium lever).
- Legend upgrade — candidates (pick one voice):
  1. `Grown, not drawn — {BRAND} · B3/S23 · gen 4 218`
  2. `Every pixel earned its place · {BRAND} · B3/S23 · gen 4 218`
  3. `Born from simple rules · {BRAND} · rule B3/S23 · generation 4 218`
- **DECIDED (owner, 2026-07-17): brand = "Cellscape", legend voice =
  "Grown, not drawn"**. Final legend:
  `Grown, not drawn — Cellscape · B3/S23 · gen 4 218`
- Title/H1 pattern: `Cellscape — cellular automata art generator` (keeps SEO).
- Rejected candidates (for the record): Emergent, Automa, Lifeform Studio.

### Order & effort
W1 → W2 → W3 → W4 → W5 ≈ **21h (~3 días)**, each workstream shippable and
selftest-green on its own. All before Gumroad (sprint 3), so the premium
shell is what paying users first see.
