# Tasks — Curated Presets + Gallery Captures

## 1. Fase 1 — Validación de naves (pattern-library-extended)

- [ ] 1.1 Extraer coords de Space Rake (p20), Backrake (p8), Gosper Puffer (1971), Bi-block Puffer del Life Lexicon (vía Wayback)
- [ ] 1.2 Validador Node: simular B3/S23 (grid 300×300 sin wrap, 300 gens) → nave se MUEVE (centro de masa se desplaza) Y DISPARA (población del bounding box crece / emite gliders)
- [ ] 1.3 Añadir los 4 patrones a `src/rules.js` PATTERNS (coords [row, col] fila hacia abajo, mismo formato existente)
- [ ] 1.4 Selftest extendido: blinker + 1 nave se mueve (opcional si no rompe CI)

## 2. Fase 2 — Capturas reales del motor (visual-gallery)

- [ ] 2.1 Script Playwright headless: servir repo local, abrir `/?pattern=X&palette=Y`, esperar ~400 gens, screenshot del canvas a PNG (640×360 lo ideal, o ratio card)
- [ ] 2.2 Capturar thumbnails pa los 10 patrones con página completa del /gallery/
- [ ] 2.3 Insertar `<img>` de captura en cada `/gallery/patterns/*/index.html` (arriba, bajo el lede) + alt descriptivo
- [ ] 2.4 Añadir thumbnail al grid de `/gallery/index.html` (cards con imagen + nombre + meta)
- [ ] 2.5 Verificar peso ≤ 100KB por PNG o convertir a WebP

## 3. Fase 3 — Presets curados (visual-gallery + deep-link-palette)

- [ ] 3.1 Extender deep-link en `src/app.js`: `?palette=` (slug kebab contra PALETTES, case-insensitive)
- [ ] 3.2 Seleccionar 20 presets: ~8 con los patrones (naves incluidas) + ~12 reglas exóticas random-fill (Seeds, Day&Night, Coral, Gnarl, H-trees, etc.) con paletas curadas (Neon, Fire, Matrix, Ocean, Vaporwave, Cyberpunk, Aurora…)
- [ ] 3.3 Generar thumbnails de presets (Playwright, ~400 gens, paleta fija)
- [ ] 3.4 Crear `/presets/` (topbar igual al resto, grid 4×5 de cards con img + nombre + regla + link `/?rule=&pattern=&palette=`, JSON-LD CollectionPage)
- [ ] 3.5 Link a /presets/ desde nav/footer/home + sitemap.xml actualizado
- [ ] 3.6 Verificar deep-link completo: `/?pattern=space-rake&palette=cyberpunk` carga patrón + paleta correcta

## 4. Fase 4 — CIERRE

- [ ] 4.1 Correr selftest (test/ci-selftest.mjs) ALL-PASS
- [ ] 4.2 Commit + push (deploy automático CF Pages)
- [ ] 4.3 Verificar en vivo: /presets/, /gallery/, deep-link con paleta
- [ ] 4.4 Indexing API URL_UPDATED para /presets/ + /gallery/ patterns actualizados