# Auditoría Web Completa Final — cellscape.art (2026-08-28)

> Documento consolidado que integra TODOS los módulos: GSC, SEO técnico, contenido, rendimiento, a11y, seguridad, SERP, backlinks, copy, UX, conversión + análisis de arquitectura de home + opciones de tráfico. Modo audit-first: NO se modificó código.

---

## 0. Resumen ejecutivo

**Cellscape es un generador de arte de autómatas celulares (Conway's Game of Life) de altísima calidad técnica** — motor WebGL2 con 32 reglas, 26 patrones, 7 superficies, 27 paletas, export 7200×10800 @300dpi, 3D, audio generativo — con contenido editorial bueno (posts de 1.5-3.8K palabras, JSON-LD válido, 0 broken links).

**El problema no es el producto ni el contenido: es la visibilidad.** 1 click orgánico en 90 días, 148 impresiones en agosto, CrUX "No Data", cero backlinks, y el artículo más importante del sitio (el pillar de 3.8K palabras) **sin indexar**. Se añade un problema de rendimiento real: **TBT 29.3s en móvil** que penaliza Core Web Vitals.

**Veredicto:** la web tiene "SEO estructural" aprobado (8/10) y "SEO de adquisición" reprobado (1/10). Es un proyecto en Fase 0 de madurez: necesita indexación completa, Warp de performance y los primeros backlinks antes de poder juzgar si el contenido convierte.

---

## 1. Ficha técnica

| Campo | Valor |
|---|---|
| Dominio | cellscape.art (.art, nuevo — GSC desde ~31-jul-2026) |
| GSC property | https://cellscape.art/ (siteOwner ✅) |
| Stack | Vanilla JS (ES modules, sin build) + WebGL2 shaders + Three.js (CDN) + AudioWorklet + Cloudflare Pages |
| Páginas indexables | 21 (sitemap): home + about + faq + blog(7) + gallery(1) + patrones(10) |
| Analytics | GA4 G-3WQM53X1SX (commit d717727, agregado 2026-08-28 — sin histórico) |
| Repo | rcastro1089/cellular-art-generator (privado) |
| Monetización | Fase A: free tool + Pro (Gumroad por configurar) — POD Printful diferido |

---

## 2. Google Search Console (90 días: 30-may → 28-ago)

| Métrica | Valor |
|---|---|
| Clicks | **1** |
| Impresiones | 154 (jul: 6 → ago: 148 — recién indexando) |
| Queries con ≥1 imp | 8 |
| Sitemap | 21 submitted / 0 indexed (reporte rezagado; real ≠ 0, ver §3) |

**Páginas (top):** home 79 imp / 1 clk / pos 8.3 · cellular-automata-types 22 imp / pos 17.2 · diehard 18 imp / pos 5.9 · pulsar 10 imp / pos 6.2 · how-to-make-generative-art 9 imp / pos 24.6 · algorithmic-art-generators 9 imp / pos 70.3.

**Queries (top):** cellscape game (6 imp, pos 8.8) · game of life pulsar (pos 9) · types of cellular automata (pos 5) · b3/s2345 y b3/s1234 (pos 14-25) · cell scape · algorithmic artists · generative code art.

**Lectura:** los patrones rankean **pos 4-9 (primera página)** en queries de volumen ~0-10/mes. La maquinaria de rankeo funciona; el target no trae gente. Las kws con volumen (cellular automata 2.9K ↗️) aún no rankean — el pillar que las ataca no está indexado.

**CrUX: No Data** — menos de ~25-30 sesiones/28 días; nadie visitando todavía.

---

## 3. Indexación real (URL Inspection, 28-ago)

| URL | Verdict |
|---|---|
| / | ✅ PASS — Submitted and indexed |
| /blog/algorithmic-art-generators/ | ✅ PASS |
| /gallery/patterns/pulsar/ | ✅ PASS |
| **/blog/cellular-automata-art-guide/ (PILLAR 3,834 palabras)** | ❌ **NEUTRAL — Discovered, currently not indexed** |

Nota: "sitemap indexed: 0" es el reporte de sitemap (lento, 2-6 semanas de lag); la realidad es 3+ indexadas. El pillar es el único con problema real.

---

## 4. SEO técnico (crawl completo 21/21)

### ✅ Aprobado
- 21/21 URLs HTTP 200 · canonical self · viewport · sin noindex
- Titles/descs únicos · H1 en interiores
- JSON-LD **validados** (parse manual): home WebApplication+FAQPage · pillar/patrones Article+Breadcrumb+FAQ · faq FAQPage
- robots.txt `Allow: /` + Sitemap ✓
- 0 broken links internos (21 links únicos → todos 200)
- http→https (non-www) 301 ✓
- GA4 presente en todas las páginas (gtag.js)
- 0 errores de consola JS en home (headless)

### ❌ Fallos
| # | Fallo | Severidad |
|---|---|---|
| T1 | **Soft-404**: URL inexistente → HTTP 200 + HTML de la home (SPA fallback de CF Pages) | 🔴 CRÍTICO |
| T2 | **www-https → 525** SSL handshake · www-http → 200 sin redirect | 🟡 ALTO |
| T3 | Titles con `&amp;` literal: math-art-decor-ideas, gifts-for-programmers, /gallery/, day-and-night | 🟡 ALTO (CTR) |
| T4 | /blog/ index sin JSON-LD (0 schema, 276 words) | 🟠 MEDIO |
| T5 | /about/ sin JSON-LD (443 words) | 🟠 MEDIO |
| T6 | HSTS ausente · sin CSP | 🔵 BAJO |
| T7 | h1 de la home vacío en el shell de la app (el H1 real es del .seo-content) | 🔵 BAJO |

---

## 5. Rendimiento — Core Web Vitals (PSI lab, mobile, 28-ago)

| Métrica | Valor | Estado |
|---|---|---|
| Performance | **67** | 🟠 |
| FCP | 0.9 s | 🟢 |
| LCP | 2.6 s | 🟠 |
| CLS | 0 | 🟢 |
| **TBT** | **29,290 ms** | 🔴 CRÍTICO |
| Speed Index | 2.1 s | 🟢 |

**Causa:** "Minimize main-thread work: 41.7s". El engine WebGL (setup de shaders + primer render), el AudioWorklet de ambience y el bucle requestAnimationFrame constante bloquean el hilo principal. El engine corre aunque el usuario no toque nada (landing state paused con arte seedeado + keepAlive). En headless el app corre a 2 FPS — confirmado en vivo.

**Impacto:** ranking móvil perjudicado globalmente + experiencia pobre en equipos sin GPU.

---

## 6. Contenido editorial

| Página | Words | JSON-LD | Nota |
|---|---|---|---|
| Pillar cellular-automata-art-guide | 3,834 | Article+Breadcrumb+FAQ | ✅ fuerte, NO INDEXADO |
| algorithmic-art-generators | 1,923 | 3 | ✅ comparativa |
| cellular-automata-types | 1,689 | 3 | ✅ taxonomía |
| math-art-decor-ideas | 1,582 | 3 | ✅ (kw 3.6K LOW — infrautilizado) |
| how-to-make-generative-art | 1,556 | 4 (HowTo) | ✅ tutorial |
| gifts-for-programmers | 1,502 | 3 | ✅ |
| patrones (10) | 671-873 | 3 c/u | 🟠 específicos pero kw vol ~0 |
| gallery index | 799 | 1 | 🟠 lista de 26 patrones + 32 reglas |
| faq | 938 | 1 | ✅ |
| about | 443 | 0 | 🟠 corto + sin schema |
| blog index | 276 | 0 | 🟠 sin thumbnails (0 `<img>`) |

**Blog sin imágenes de portada en las tarjetas** → CTR débil en SERP/social. El sitio es 100% tipográfico/canvas (0 `<img>` en home/blog/gallery).

---

## 7. Accesibilidad (a11y)

- ✅ `lang="en"` · estructura de encabezados coherente (home: 1 h1 + 4 h2 + 6 h3) · botones con texto · sliders con labels
- ⚠️ Sin skip-link · 1 solo aria-label (bajo) · sin focus visible custom verificado
- ⚠️ 0 imágenes = sin problemas de alt, pero sin thumbnails ni contenido visual en blog
- 🔵 Contraste: verificar muted sobre fondos (patrón de riesgo en proyectos previos) — no auditado con tooling, sample visual OK

**Nota:** el sitio es una herramienta; a11y es mejora progresiva (nice-to-have) vs los P0/P1 de SEO.

---

## 8. Seguridad & headers

- ✅ HTTPS válido (non-www) · sin x-robots-tag (correcto para indexar) · sin errores JS
- ❌ **Sin HSTS** (recomendado: CF → SSL/TLS → Edge Certificates → HSTS on) · sin CSP (con shaders/audio de terceros es defendible no tenerla, pero documentar)
- ❌ www roto (525) — apartado §4

---

## 9. SERP real y competencia

**"game of life simulator" (2026-08-28):** dcode.fr · gameofliveevo.com · altftool.com · playgameoflife.com · conwaycanvas.com — simuladores establecidos con 5-15+ años de autoridad.

**Nicho CA:** Wikipedia (cellular automata) y Wolfram dominan las kws informacionales; conwaylife.com domina "game of life patterns". **Los búsquedas ↗️ LOW ("cellular automata", "cellular automaton", "cellular automata simulation") son el único terreno alcanzable** con el pillar + links.

**Backlinks:** 0 menciones indexadas de "cellscape.art" (verificado) + repo GitHub privado = sin posibilidad natural de link juice.

---

## 10. Copywriting (research/copywriting/language-analysis.md vs. vivo)

✅ **Alineado:** voice playful/visual/personal (research) = "Play Conway's Game of Life online and turn it into art" + tagline "Grown, not drawn". Ángulos de valor ("turn code into wall art", "generative art you design yourself") implementados en el .seo-content. **El copy no es el problema.**

---

## 11. UX / Producto / Conversión (muestreo en vivo)

- ✅ Home = app completa funcional (32 reglas, 26 patrones, 7 superficies, 27 paletas, export Pro gated, ambience, 3D voxel) — demo instantánea, sin registro
- ✅ Landing state: arte seedeado + play button pulsante invite
- ✅ Sidebar con progressive disclosure (details) — no abruma
- ⚠️ Monetización: "Unlock Pro" sin producto Gumroad creado todavía (by design, Fase A)
- ⚠️ No hay email capture / newsletter (solo puede monetizar por venta directa)
- ⚠️ No hay CTA social ("share your art") — oportunidad de distribución viral free

---

## 12. Análisis: ¿es correcto que la home tenga la app? 🏠

**Decisión (2026-07-28, documentada en CLAUDE.md): la tool vive en `/`.** Evaluación con datos:

**A favor de mantener la app en `/`:**
1. **"game of life" / "game of life simulator" (27K + 320/mo) son transaccionales**: el usuario quiere jugar AHORA. Una landing intermedia agrega fricción en la kw de más volumen del research.
2. **Dividir URL (/ + /app/) pulveriza la poca autoridad que tiene el dominio joven** — dos URLs compitiendo por los mismos términos = canibalización en un sitio con 0 DR.
3. GSC ya muestra la home rankeando (pos 8.3 promedio, 79 imp) — romper el URL que ya genera impresiones sería regresivo.
4. El studio (cellular-automata.studio) que tiene herramienta en subpágina no demuestra ventaja de ranking.

**En contra / matices:**
1. **El TBT de 29s viene de la app cargando en `/`** → eso NO se resuelve moviéndola a otra URL (el peso se mantiene), se resuelve con **lazy-init** (no arrancar el engine hasta interacción/scroll).
2. El .seo-content (texto SEO) está **abajo del fold en móvil** — para kws informacionales ("cellular automata art") el primer viewport es todo app. Mejorable con más texto arriba en versión móvil o un hero híbrido.
3. Cuando (si) el dominio gane autoridad, una página `/app/` dedicada podría capturar "game of life simulator" sin canibalizar — **reevaluar en 3-6 meses, no ahora**.

**Veredicto: SÍ es correcto que la home tenga la app** — con la condición de que (a) arranque lazy (fix CWV) y (b) el .seo-content se potencie. NO crear `/app/` en esta fase.

---

## 13. Opciones para potenciar tráfico (evaluadas)

| # | Opción | Potencial | Esfuerzo | Timing |
|---|---|---|---|---|
| 1 | **Indexar el pillar + forzar re-crawl de todo el sitemap** | 🔥🔥🔥 (desbloquea 2.9K ↗️) | Bajo | Ahora |
| 2 | **Fix CWV (lazy-init)** — mejor ranking global, mejor UX, es la "llave" | 🔥🔥🔥 | Medio | Ahora |
| 3 | **Primeros backlinks**: repo público + README + Product Hunt + Show HN + r/generative, r/cellular_automata, listas "Awesome" | 🔥🔥🔥 (autoridad de arranque) | Medio | 1-2 semanas |
| 4 | **2º pillar: expandir math-art-decor** ("scientific illustration" 3.6K LOW + "math poster" 2.9K) | 🔥🔥🔥 | Medio | Semana 2 |
| 5 | **Hub "All Game of Life Patterns"** consolidando los 26 patrones + deep-links (?pattern=) para capturar el tráfico de LifeWiki | 🔥🔥 | Medio | Semana 2 |
| 6 | **Pinterest** (nicho decor/math-art = canal visual nativo) — pins de exports + link a blog | 🔥🔥 (audiencia nuevo) | Bajo | Semana 2 |
| 7 | **Cadencia blog 2-4/mes** con kws ↗️: cellular automata simulation (170 ↗️), procedural art (210), generative art ideas | 🔥 | Bajo | Continuo |
| 8 | **Compartir en redes de creadores**: YouTube shorts de la simulación, TikTok "satisfying" | 🔥🔥 (viral potencial) | Medio | Semana 3 |
| 9 | **i18n español** ("juego de la vida", "autómata celular" — nicho hispano casi vacío) | 🔥 (fase 2, tras EN) | Alto | Mes 2 |
| 10 | **Programa "share your art"** en la web (CTA social + hastag) | 🔥 | Bajo | Semana 3 |

**Combo recomendado (Fase A):** 1+2+3 primero (desbloquear indexación, CWV y autoridad), luego 4+5+6 (contenido que convierte impresiones en tráfico), y 7-10 en modo continuo.

---

## 14. Tabla maestra de hallazgos

| # | Hallazgo | Categoría | Severidad | Esfuerzo | Cap (OpenSpec) |
|---|---|---|---|---|---|
| 1 | Pillar sin indexar | Indexación | 🔴 | Bajo | seo-indexation |
| 2 | Soft-404 (200+home) | Técnico | 🔴 | Bajo | seo-indexation |
| 3 | TBT 29.3s (main-thread 41.7s) | Rendimiento | 🔴 | Medio | core-web-vitals |
| 4 | 0 backlinks + repo privado | Autoridad | 🔴 | Medio | link-building |
| 5 | www 525 SSL | Técnico | 🟡 | Bajo | seo-indexation |
| 6 | `&amp;` en 4 titles | Técnico/CTR | 🟡 | Bajo | seo-indexation |
| 7 | JSON-LD blog/about ausente | Técnico | 🟠 | Bajo | seo-indexation |
| 8 | math-art-decor infrautilizado (3.6K) | Contenido | 🟠 | Medio | content-expansion |
| 9 | Blog sin thumbnails | UX/CTR | 🟠 | Bajo | content-expansion |
| 10 | No social share CTA | Conversión | 🟠 | Bajo | content-expansion |
| 11 | .seo-content abajo del fold móvil | UX/SEO | 🟠 | Bajo | home-layout-strategy |
| 12 | HSTS / CSP ausentes | Seguridad | 🔵 | Bajo | (tech-debt) |
| 13 | No email capture | Conversión | 🔵 | Bajo | (futuro) |
| 14 | h1 vacío en shell app | Técnico | 🔵 | Bajo | seo-indexation |

---

## 15. Plan de remediación (síntesis → OpenSpec `seo-recovery`)

| Fase | Capabilities | Objetivo |
|---|---|---|
| **A — Indexación & técnico** | seo-indexation | Pillar indexado, 404 real, www→301, titles limpias, JSON-LD |
| **B — Core Web Vitals** | core-web-vitals | TBT < 4s, score ≥ 85, engine lazy + rAF pausa en background |
| **C — Autoridad & distribución** | link-building | Repo público, 3+ backlinks iniciales en 60 días, social |
| **D — Contenido** | content-expansion, home-layout-strategy | 2º pillar, hub patrones, cadencia blog, home reforzada |
| **E — Medición** | analytics-measurement | GA4 verificado, baseline GSC, checkpoint 2-4 semanas |

**Métricas de éxito (90 días):** Pillar PASS · impresiones ≥ 500/mes · TBT < 4s · CrUX con datos · ≥5 kws en top-20 · clicks ≥ 30/mes.