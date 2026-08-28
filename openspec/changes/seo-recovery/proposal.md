# Proposal: SEO Recovery — cellscape.art

## Why

La auditoría completa (2026-08-28, `research/audit-web-completa-final-2026-08-28.md`) encontró que cellscape.art tiene **0.3% del potencial de tráfico operativo**: 1 click orgánico en 90 días, 148 impresiones en agosto, CrUX sin datos. El producto y el contenido son sólidos (motor WebGL2 maduro, 6 posts de 1.5-3.8K palabras, JSON-LD válido, 0 broken links), pero la web no tracciona por 4 causas raíz:

1. **Indexación incompleta**: el pillar "Cellular Automata Art: The Complete Guide" (3,834 palabras, kw "cellular automata" 2.9K/mo ↗️) está en "Discovered - currently not indexed" — es la pieza con más potencial del sitio.
2. **Soft-404 masivo**: Cloudflare Pages devuelve HTTP 200 + HTML de la home para cualquier URL inexistente — Google descarta todo como duplicado, crawl budget desperdiciado.
3. **Core Web Vitals mal**: TBT 29,290 ms en móvil (main-thread work 41.7s, PSI score 67) — el engine WebGL arranca en el hilo principal aunque el usuario no toque nada.
4. **Autoridad cero**: dominio nuevo (jul-2026), 0 backlinks, repo GitHub privado — Google no tiene razones para exhibir la web.

Sin remediación, la web continuará invisible (proyección: <10 clicks/mes por 6 meses) y la Fase A de monetización jamás podrá validarse, porque **no hay tráfico que convertir**.

## What Changes

- **Indexación**: re-solicitar indexación del pillar (URL Inspection + Indexing API), fix de soft-404 (404 real + `not_found_handling`), re-crawl completo del sitemap.
- **Técnico**: redirect 301 www → non-www (fix del 525 SSL), des-escapar `&amp;` en 4 titles, JSON-LD en /blog/ y /about/, arreglar h1 vacío del shell.
- **Rendimiento**: lazy-init del engine WebGL (arranque solo tras interacción/scroll), pausar requestAnimationFrame cuando la tab no es visible, TBT objetivo < 4s, score ≥ 85 en PSI móvil.
- **Autoridad**: repo GitHub público con README + link, primeros backlinks (Product Hunt, Show HN, r/generative, r/cellular_automata, listas "Awesome"), canal Pinterest para el nicho decor.
- **Contenido**: expandir math-art-decor como 2º pillar ("scientific illustration" 3.6K LOW + "math poster" 2.9K), hub "All Game of Life Patterns" con deep-links `?pattern=`, cadencia de blog 2-4 posts/mes con kws ↗️, thumbnails en blog index.
- **Home**: mantener la app en `/` (decisión validada en la auditoría), reforzar `.seo-content` (más texto arriba en móvil, CTA), NO crear `/app/` en esta fase.
- **Medición**: verificar GA4 en producción, registrar baseline GSC, checkpoint a 2-4 semanas.

## Capabilities

NEW:
1. `seo-indexation` — Indexación completa y correcciones técnicas de SEO
2. `core-web-vitals` — Performance: TBT < 4s, score ≥ 85, engine lazy
3. `link-building` — Primera autoridad: repo público, backlinks, distribución
4. `content-expansion` — 2º pillar, hub de patrones, cadencia editorial
5. `home-layout-strategy` — Home con app + SEO content reforzado
6. `analytics-measurement` — GA4, baseline y checkpoint de resultados

## Impact

- **Archivos tocados**: `index.html`, `src/app.js`, `src/main.js`, `styles/*`, `blog/*`, `gallery/*`, `faq/*`, `about/*`, `robots.txt`, `sitemap.xml`, `_headers`/`404.html`, `README.md` (+ CF Pages config `not_found_handling`, DNS/TLS de www en Cloudflare).
- **Sin cambios de arquitectura**: no se mueve la app de `/`, no hay cambios en el motor (solo inicialización), sin backend nuevo.
- **Hosting**: Cloudflare Pages (config de 404 + certificado www + HSTS).
- **Riesgos**: lazy-init puede introducir un flash de pantalla (mitigar con skeleton/landing state ya existente); repo público expone código (aceptado: el motor es el producto pero la app es gratuita; el código era visible en `archive/` igualmente).

## Success Metrics (90 días)

| Métrica | Actual | Target |
|---|---|---|
| Clicks/mes | ~1 | ≥ 30 |
| Impresiones/mes | 148 | ≥ 500 |
| Pillar indexado | ❌ | ✅ PASS |
| TBT móvil | 29,290 ms | < 4 s |
| PSI score móvil | 67 | ≥ 85 |
| Backlinks | 0 | ≥ 5 (3+ de calidad) |
| Kws en top-20 | ~3 | ≥ 10 |
| CrUX con datos | No Data | Con datos |