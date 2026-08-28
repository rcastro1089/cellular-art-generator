# Design — SEO Recovery cellscape.art

## Contexto

Cellscape es un generador de arte de autómatas celulares estático (Vanilla JS sin build, Cloudflare Pages) con un blog/gallery editorial de 21 URLs. La auditoría completa (2026-08-28) reveló 4 causas raíz de la falta de tráfico: pillar sin indexar, soft-404 masivo por SPA fallback, TBT 29.3s en móvil y autoridad cero. El sitio ya tiene la base correcta (canonicals, JSON-LD, contenido profundo, 0 broken links) — la remediación es quirúrgica, no una reescritura.

## Goals

- Que el 100% del sitemap esté indexado (hoy ~3 de 21, con el pillar fuera).
- CWV móvil en verde (TBT < 4s, score ≥ 85).
- Primeros 3-5 backlinks y repo público en 60 días.
- 2º pillar y hub de patrones operativos en 30 días.
- Medición: baseline + checkpoint a 14-21 días.

## Non-Goals

- NO mover la app a /app/ (decisión D1).
- NO reescribir el motor ni agregar backend (la Fase A de monetización sigue sin backend por diseño).
- NO crear shop.html / integración Printful en esta fase.
- NO internacionalización (ES llega en una fase posterior, si el tráfico EN valida el nicho).
- NO rediseño visual ni cambio del design system.

## Decisiones

### D1 — La app se queda en `/` (home con la tool)
**Decisión:** mantener el tool en el root; reforzar .seo-content; sin ruta /app/.

**Problema:** la auditoría evaluó si la home como app limita el SEO.

**Alternativas:**
- Mover la tool a /app/ + home marketing: divide la autoridad de un dominio sin DR, canibaliza "game of life", fricción en kw transaccionales. Descartada por ahora.
- Home híbrida móvil (intro SEO arriba, tool abajo, desktop app-first): elegida vía spec home-layout-strategy.

**Implementación:** media query móvil que ordena el .seo-content antes del frame del tool; desktop intacto.

### D2 — Soft-404 con 404.html + not_found_handling
**Decisión:** subir `public/404.html` (o equivalente) al deploy de CF Pages y activar el "not_found_handling: 404.html" (dash: Settings > Not Found Handling). El repositorio es estático sin build; el archivo se añade a la raíz del deploy.

**Alternativas consideradas:** catch-all `_redirects` a /404.html (CF Pages soporta `/* /404.html 404`) — misma solución, se prefiere el archivo 404.html nativo + flag de dash porque CF lo sirve sin redirect interno.

### D3 — Lazy-init del engine WebGL
**Decisión:** el engine se inicializa tras la primera interacción (click/tecla/scroll-intent) o tras visible. En el landing state actual (arte seedeado + play pulsante) basta con mostrar el lienzo estático (una captura canvas pintada o el estado paused sin contexto WebGL), retrasando context creation y shader compile. rAF se pausa con `document.visibilitychange` → hidden.

**Alternativas consideradas:**
- Código en web worker: el engine usa WebGL2 que necesita el main thread (OffscreenCanvas en worker existe, pero es refactor mayor del motor — descartado para esta fase).
- IntersectionObserver + `requestIdleCallback` para arrancar 5s después: suficiente; se combina con interacción-first.

### D4 — www → 301 y certificado www en Cloudflare
**Decisión:** en CF → DNS añadir/verificar `www` (registro CNAME/redirect) y activar redirect de www a apex; configurar TLS en el zone de cellscape.art (cubre www). Objetivo: cero 525.

### D5 — Backlinks de arranque (orden de ejecución)
**Decisión:** repo público + README → Show HN → Product Hunt → r/generative y r/cellular_automata → 2 awesome-lists → Pinterest (tablero de arte). Cada envío se loguea en `research/links-log.md`.

### D6 — Segundo pillar: math-art-decor
**Decisión:** expandir `blog/math-art-decor-ideas/` a 2,000+ palabras y convertirlo en hub del cluster "scientific illustration" (3.6K LOW) + "math poster" (2.9K); internal linking desde gallery y posts.

### D7 — Pinterest antes que YouTube
**Decisión:** el canal que primero se activa es Pinterest (coste ~0, nicho decor visual, genera backlinks y tráfico referido sostenido). YouTube shorts queda como P3 tras validar Fase A de conversión.

### D8 — Sin newsletter en esta fase
**Decisión:** no se implementa email capture todavía (no hay backend); el share social es el CTA de distribución (ver D5).

## Riesgos / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Lazy-init rompe el "wow" de entrada (app instantánea) | Landing state ya existe (arte seedeado + play pulsante); el arranque a interacción es < 500ms |
| Repo público expone el código del motor | Aceptado: la app es free; la ventaja está en la marca/edión; no hay secretos en el repo (api keys en ~/.hermes) |
| PH/HN pueden rechazar sin tráfico previo | Los envíos se hacen tras indexación + CWV verdes; el pitch es "generative art tool" no "SEO site" |
| CF not_found_handling no disponible en plan free | Verificar; si no, catch-all `_redirects /* /404.html 404` (equivalente) |
| Cambio de orden móvil (.seo-content arriba) confunde usuarios de la app | Solo en móvil; el tool queda a un scroll; test visual post-deploy |
| Google tarda más de lo previsto en indexar el pillar | Indexing API + URL Inspection + re-crawl; segunda ronda a los 7 días |

## Migración Plan

1. **Fase A (Indexación & técnico)** — deploy inmediato: 404.html + _redirects si aplica, titles `&amp;`, JSON-LD blog/about, h1 shell, robots/sitemap lastmod, redirect www/DNS/TLS en CF. → re-crawl + Indexing API pillar.
2. **Fase B (CWV)** — lazy-init en `index.html` + `src/app.js` + `src/main.js`; pausa rAF en background; correr selftest CI; re-medir PSI.
3. **Fase C (Autoridad)** — repo público, README, lanzamientos y submissions (45-60 días).
4. **Fase D (Contenido)** — pillar math-art-decor, hub gallery deep-links, blog cadencia, thumbnails.
5. **Fase E (Medición)** — GA4 verify, baseline, checkpoint 14-21 días.

Rollback: cada fase es un commit independiente; la app en / es el estado estable previo; lazy-init se puede revertir quitando la guarda de interacción.

## Open Questions

- ¿CF Pages free permite `not_found_handling` desde dashboard o requiere API? (se resuelve en ejecución; fallback `_redirects`)
- ¿Product Hunt requiere cuenta del owner? (se preparan drafts; publicación la hace Ricardo)
- ¿El artículo de Pinterest rinde sin cuenta de negocio? (se abre cuenta básica ya)