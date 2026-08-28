# Tasks — SEO Recovery cellscape.art

## 1. Fase A — Indexación & Técnico (seo-indexation)

- [ ] 1.1 Crear `404.html` en la raíz del deploy (estilo blog.css, links a home y gallery, status real 404)
- [ ] 1.2 Configurar `not_found_handling=404.html` en Cloudflare Pages (dash o wrangler); fallback: `/* /404.html 404` en `_redirects`
- [ ] 1.3 Verificar con curl que una URL inexistente devuelve HTTP 404 (no 200+home)
- [ ] 1.4 Fix de `&amp;` literal en titles: /blog/math-art-decor-ideas/, /blog/gifts-for-programmers/, /gallery/, /gallery/patterns/day-and-night/
- [ ] 1.5 Añadir JSON-LD CollectionPage/ItemList a /blog/
- [ ] 1.6 Añadir JSON-LD Organization (o WebSite) a /about/
- [ ] 1.7 Arreglar h1 vacío del shell de la app (h1 de marca o visibilidad)
- [ ] 1.8 Convertir /blog/ en índice con mini-descripciones por post (refuerza keywords) + thumbnails si los hay
- [ ] 1.9 Cloudflare: verificar registro DNS www + redirect www→apex + certificado (resolver 525)
- [ ] 1.10 Actualizar lastmod de sitemap.xml (fecha real por página) y re-subir a GSC
- [ ] 1.11 Enviar Indexing API URL_UPDATED para el pillar y re-solicitar inspección por URL Inspection
- [ ] 1.12 Verificación: URL Inspection del pillar = PASS; sitemap sin errores en GSC

## 2. Fase B — Core Web Vitals (core-web-vitals)

- [ ] 2.1 Envolver la inicialización del engine en `src/main.js`: no crear WebGL context hasta interacción/scroll/visible
- [ ] 2.2 Mantener el landing state (arte seedeado + play pulsante) sin arrancar shaders: render estático del estado inicial vía Canvas2D o imagen
- [ ] 2.3 Retrasar AudioWorklet/ambience hasta el primer play (ya es user-gesture)
- [ ] 2.4 Pausar rAF cuando `document.visibilityState === 'hidden'` y reanudar al visible
- [ ] 2.5 Asegurar que `FEATURES` flags y deep-links (?pattern=/?rule=) siguen funcionando tras lazy-init
- [ ] 2.6 Correr selftest (test/ci-selftest.mjs) + CI
- [ ] 2.7 Re-medir PSI móvil: objetivo score ≥ 85, TBT < 4s, LCP ≤ 2.5s (si falla, iterar: split del primer render)
- [ ] 2.8 Verificar visualmente en móvil que la app arranca al primer Play

## 3. Fase C — Autoridad & Distribución (link-building)

- [ ] 3.1 Decidir y ejecutar: repo público (check secrets/keys en git history antes)
- [ ] 3.2 Escribir README con descripción, tagline ("Grown, not drawn"), link, screenshot/OG, licencia
- [ ] 3.3 Crear `research/links-log.md` y registrar cada envío
- [ ] 3.4 Preparar draft Show HN (título con "Show HN: …", demo, texto de pitch)
- [ ] 3.5 Preparar draft Product Hunt (tagline, descripción, capturas, links)
- [ ] 3.6 Redactar 2 posts para r/generative y r/cellular_automata (con video/animación en gif)
- [ ] 3.7 Abrir PR/issue en 2 awesome-lists (awesome cellular automata, awesome generative art)
- [ ] 3.8 Crear cuenta Pinterest + tablero "Cellular Automata Art" + 10 pins (imágenes de export + links a /gallery/ y math-art-decor)
- [ ] 3.9 Verificar a los 60 días: ≥3 links vivos (HTTP 200) y registro en links-log

## 4. Fase D — Contenido (content-expansion + home-layout-strategy)

- [ ] 4.1 Expandir /blog/math-art-decor-ideas/ a 2,000+ palabras (sections: wall art types, room-by-room, POD/printing tips, artist credits, CTA) — kw: scientific illustration, math poster
- [ ] 4.2 Actualizar JSON-LD Article (datePublished/dateModified) del 2º pillar + mini-desc en /blog/
- [ ] 4.3 Reforzar /gallery/ como hub: asegurar deep-links ?pattern= en TODAS las cards + título orientado a "game of life patterns"
- [ ] 4.4 Verificar deep-links ?pattern=glider (y 2 más) funcionando tras lazy-init
- [ ] 4.5 Añadir thumbnails (<img> + alt) a las cards de /blog/ (al menos 3 posts + el nuevo pillar)
- [ ] 4.6 Home móvil: reordenar .seo-content (intro H1 + value prop + mini-FAQ) antes del tool en < 768px
- [ ] 4.7 Home: enlaces internos del .seo-content al pillar y a /gallery/ (si no existen)
- [ ] 4.8 CTA social "Share your art" (enlace a X/IG con hashtag) en el flujo de export
- [ ] 4.9 Programar siguiente post del calendario editorial (kw ↗️: cellular automata simulation o procedural art)
- [ ] 4.10 Actualizar sitemap.xml tras contenido nuevo + nueva subida a GSC

## 5. Fase E — Medición (analytics-measurement)

- [ ] 5.1 Verificar GA4 recibe eventos de producción (Realtime)
- [ ] 5.2 Guardar `research/gsc-baseline-2026-08-28.md` (90 días: clicks/imp/queries/pages top)
- [ ] 5.3 Marcar fecha de checkpoint (14-21 días post-deploy) y recordatorio
- [ ] 5.4 Checklist de release: 21/21 URLs 200 · 404 real · pillar PASS · www 301 · CWV verdes · repo público
- [ ] 5.5 (Checkpoint futuro) Comparar GSC vs baseline y generar research/checkpoint-gsc-*.md