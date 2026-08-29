# Proposal: Curated Presets + Real Captures — cellscape.art

## Why

El home arranca con un canvas negro + 81 controles (audit ui-premium: "tool-first, no product-first") y la galería existente (`/gallery/`, 10 patrones + ~30 reglas) rankea en GSC (diehard pos 5.9, pulsar 6.2) **sin NI UNA imagen real** — las tarjetas son solo texto y el og:image de todo el sitio es uno solo genérico. El usuario que aterriza no ve NADA de lo que la herramienta puede hacer hasta que interactúa 5 minutos con sliders: primera impresión perdida.

Objetivo: darle al visitante **vitrina visual instantánea** (20 presets curados con capturas reales del motor) y **capturas reales en la galería** (que ya rankea) — mismo asset factory alimenta presets, gallery, og:image y futuro contenido IG/TikTok.

## What Changes

1. **4 patrones de "naves espaciales" verificados** (rakes/puffers del Life Lexicon original, validados por simulación B3/S23 antes de entrar):
   - **Space Rake** (p20) — primer rake conocido, dispara gliders hacia adelante
   - **Backrake** (p8, Jason Summers) — dispara gliders hacia atrás
   - **Gosper Puffer** (1971) — el primer puffer de la historia (c/2 ortogonal)
   - **Bi-block Puffer** (2 backrakes soldados) — puffer bi-block
2. **Página `/presets/`** con 20 presets curados (rule + pattern + palette + título + desc), cada tarjeta con thumbnail REAL generado por el motor (Playwright headless → screenshot del canvas renderizado).
3. **Capturas reales en `/gallery/`**: thumbnails del motor renderizado por patrón (generación interesante, paleta coherente), reemplazando las tarjetas solo-texto.
4. **Deep-link palette**: extender `?rule=&pattern=` con `&palette=` (slug kebab, matching con `PALETTES`) en `src/app.js`.
5. **og:image diferenciada** (opcional si rinde): un worker/plantilla por preset — se evalúa tras capturas.

## Capabilities

NEW:
1. `pattern-library-extended` — 4 naves validadas (rake/backrake/puffer) en PATTERNS
2. `visual-gallery` — capturas reales del motor en /gallery/ y /presets/
3. `deep-link-palette` — ?palette= en el loader

## Impact

- **Archivos tocados**: `src/rules.js` (PATTERNS), `src/app.js` (deep-link palette), `index.html` (nav o link), `presets/*` (nueva página + thumbs), `gallery/*` (thumbnails), `assets/` (PNGs del motor), `openspec/changes/curated-presets-gallery/*`, sitemap si hay URLs nuevas.
- **Sin cambios de arquitectura**: sin backend, sin mover la app, capturas son estáticas generadas en build.
- **Riesgos**: thumbnails pesados (mitigar: WebP o PNG ≤ 100KB, lazy-loading); patrones grandes (bi-block puffer ~100×29) pueden tocar bordes en grid 500 — aceptado con centrado existente.
- **Verificación**: selftest ALL-PASS, navegación a /presets/ y /gallery/ con imágenes cargando, deep-link con palette restaura la paleta correcta.