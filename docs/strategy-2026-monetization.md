# Cellscape — Decisión de vía de monetización

> **Fecha:** 2026-08-31
> **Autor:** Ricardo Castro (rcastro1089@gmail.com), con análisis asistido.
> **Estado:** DECISIÓN CANÓNICA. Sustituye cualquier ambigüedad previa en
> `CLAUDE.md` / `docs/monetization.md` sobre el orden POD vs digital.
> **Fuentes:** `research/dataforseo/results.md` (2026-07-15),
> `research/audit-seo-2026-08-28.md`, `research/audit-web-completa-final-2026-08-28.md`,
> `research/gsc-baseline-2026-08-28.md`, `research/competitors/competitive-landscape.md`,
> `docs/monetization.md`.

---

## 1. El problema de fondo

El proyecto intenta ser cuatro cosas a la vez, todas a medias:

1. proyecto SEO de contenido,
2. canal viral de RRSS (TikTok),
3. herramienta digital tipo SaaS (Pro $9),
4. tienda física print-on-demand (Printful).

Cada una tiene infraestructura, audiencia y economía distintas. La sensación de
"hecho pedazo a pedazo" es el síntoma de no haber elegido el eje. Este documento
elige uno.

## 2. El dato que decide

De la investigación propia (`research/dataforseo/results.md`):

| Demanda | ¿Probada? | Evidencia |
|---|---|---|
| **La herramienta** (jugar con CA) | ✅ Sí | "game of life conway" 27,100/mo · "cellular automata" 2,900/mo ↗️ LOW · "game of life simulator" 320/mo LOW |
| **El producto físico** (comprar arte CA) | ❌ No | "conway game of life poster", "conway game of life art", "cellular automata wall art", "cellular automata decor" = **volumen 0 / sin datos** |

Contexto competitivo (`research/competitors/`):

- Redbubble en el nicho "cellular automata" = **48 productos** (nicho diminuto).
- **Atlasautomata.art** vende arte CA físico a **$108–122/lámina**, pero como
  **artista curador** con ediciones limitadas — NO arte generado por el usuario.
- Los simuladores gratuitos (playgameoflife, cellular-automata.studio, Algomodo)
  no monetizan: el estándar del sector es "gratis".

**Lectura:** el SEO trae *audiencia que quiere hacer arte CA*, no *compradores de
láminas CA*. Monetizar el hacer, no el objeto.

## 3. Estado actual (2026-08-31)

- Sitio live: https://cellscape.art (Cloudflare Pages, estático, sin build).
- Tráfico ≈ 0: **1 clic orgánico en 90 días**, 148 impresiones en agosto,
  CrUX "No Data". Dominio sin autoridad (0 backlinks indexados hasta finales de
  agosto; 1 merge en awesome-game-of-life el 2026-08-29).
- SEO estructural correcto (8/10); SEO de adquisición reprobado (1/10).
- Bloqueantes técnicos conocidos (audit 2026-08-28): pillar NO indexado,
  **TBT móvil ~29 s** (init del engine WebGL en main thread), soft-404 SPA,
  `www` con error 525.
- Monetización construida: **Cellscape Pro**, $9 one-time, licencia Gumroad
  (`product_id vTIfvUv7ID5kEokedm2JYg==`, permalink `cellscape-pro`). Gating
  client-side en `src/features/exports.js` vía `gatePro()` / `isPro()`.
  Bypassable por diseño (validación, no enforcement).
- Sin captura de email. Sin analítica de conversión más allá de GA4 pageviews.

## 4. Las vías, puntuadas

| Criterio | A. POD físico (UGC → láminas/enmarcado) | B. Digital-first (Pro + packs) | C. TikTok/RRSS |
|---|---|---|---|
| Demanda probada | ❌ volumen 0 | 🟡 herramienta sí; pago = barato de testear | — (es tráfico, no modelo) |
| Margen | ~40% (enmarcado peor: ~25–35%) | ~90% (Gumroad/Stripe fee ~5–10%) | — |
| Carga operativa | Alta: envíos, devoluciones, calidad/misprints, IVA-OSS UE, soporte | Baja: license keys, soporte mínimo | Media: producir vídeo constante |
| Coste de testear la hipótesis | Alto: Printful + backend pedidos + mockups + checkout + legal | **Cero — ya está construido** | Bajo |
| Escalabilidad | Pobre por unidad (físico, soporte-intensivo) | **Excelente (coste marginal ≈ 0)** | Alta en alcance, baja en control |
| Conversión desde tráfico frío | 0.3–1% a un pedido de ~$30 | 2–5% a un impulso de $9 sin riesgo para el comprador | Malísima a checkout; decente a captura de email |
| Time-to-first-dollar | El más largo | **Inmediato (producto existe)** | Indirecto |
| Moat | El flujo CA+POD es único, pero el moat no ayuda si no hay demanda | La herramienta + catálogo de piezas curadas | Audiencia propia (si se construye) |

**C no es alternativa a A/B** — es el grifo de tráfico. La pregunta real:
cuando TikTok mande 10K personas, ¿a qué se las lleva? TikTok convierte muy mal
a checkout físico y decentemente a **lista de email → producto digital**.

## 5. Decisión

> **Cellscape es una herramienta de arte generativo gratuita monetizada con
> productos digitales.** El print-on-demand se ofrece únicamente como upsell
> *bajo demanda* a quien ya ha demostrado que valora su pieza — nunca como
> embudo principal.

**Eje elegido: B (digital-first).** C (social) es el canal de tráfico, optimizado
para captura de email, no para venta directa. A (POD) queda **gated** detrás de
señales de demanda reales (ver §7).

### Por qué no físico ahora

- Keywords de producto a volumen 0 (dato propio).
- Márgenes ~40% + devoluciones + soporte + IVA necesitan un tráfico que no existe.
- El enmarcado es la peor versión: coste más alto, fragilidad, tasa de
  devolución más alta, soporte más pesado.
- Un SKU digital de $9 testea la misma hipótesis ("¿pagan?") con coste cero.

### Por qué digital-first gana ahora

- Ya construido. Sin fulfillment. ~90% margen. Bypassable pero irrelevante a $9
  de impulso (quien lo valora, paga).
- Iteración rápida sobre precio, oferta y posicionamiento.
- Un comprador digital ES exactamente quien luego dice "esto lo enmarcaría" →
  cualifica la demanda de POD gratis.

## 6. Plan secuenciado (90 días desde 2026-08-31)

**Fase 0 — Arreglar el embudo (bloquea todo).** Sale del audit SEO propio.
- Indexar el pillar (`/blog/cellular-automata-art-guide/`).
- Bajar TBT: init lazy del engine WebGL (post-interacción / IntersectionObserver),
  pausar rAF con tab oculta, ambience off por defecto.
- Fix soft-404 (404.html real en CF Pages — ya parcialmente hecho) y `www` (525).
- Sin esto, nada monetiza: 148 impresiones/mes.

**Fase 1 — Afilar la oferta digital.**
- Mantener **Pro $9 one-time** (export print-res, PNG transparente, vídeo,
  quitar marca de agua).
- Añadir tier **"Creator" ~$29 one-time**: licencia de uso comercial + todos los
  tamaños de export + **art pack** de 20–30 piezas pre-renderizadas a resolución
  museo (PNG). El pack es margen puro y da algo que comprar a quien NO usa la
  herramienta.
- (Opcional futuro) tier **"Studio" ~$79**: todo lo anterior + renders por
  encargo / batch. Solo si aparece demanda B2B.

**Fase 2 — Captura de email.** Audit issue #13.
- "5 wallpapers 4K gratis" → lista (formulario simple → ESP: Buttondown /
  MailerLite / ConvertKit free tier).
- Es el activo que hace que el tráfico de TikTok valga algo.

**Fase 3 — Distribución (drafts ya escritos en `research/distribution-drafts.md`).**
- Publicar: Show HN, Product Hunt, r/generative, r/cellular_automata, Pinterest.
- Backlinks de autoridad gratis + pico de tráfico para medir conversión real.

**Fase 4 — TikTok / Reels / Shorts.**
- 3–4 vídeos/semana: renders satisfactorios (black-hole lens, terrain morphs,
  long-exposure).
- CTA = "herramienta gratis, link in bio" → landing con captura de email,
  **no** tienda.
- Objetivo: audiencia + lista, no venta directa.

**Fase 5 — Instrumentar conversión.**
- Eventos GA4: `export_click`, `pro_modal_open`, `pro_purchase`,
  `email_capture`, `tier_selected`.
- Sin números no hay siguiente decisión informada.

**Fase 6 — Puerta del POD (condicional).**
- Activar SOLO con: (a) ≥50 ventas digitales acumuladas **y** (b) peticiones
  espontáneas repetidas de "¿puedo comprarlo impreso?".
- Entonces: **un solo producto héroe** (un tamaño de póster + una opción
  enmarcada) vía Printful, ofrecido en la pantalla de éxito post-export a quien
  acaba de crear algo. Demanda que tira, no especulación.

## 7. Criterios de corte (anti "pedazo a pedazo")

- Tras Fase 0–4 + 2 meses de TikTok, si hay **<10 ventas digitales** → hipótesis
  "pagan por esto" falsada. Pivotar la herramienta a pieza de portfolio /
  lead-gen, o liberarla open-source y seguir. **No añadir más superficie.**
- Si hay ventas digitales pero **cero** peticiones de impresión → **nunca**
  construir POD. Quedarse 100% digital.
- Checkpoint de revisión de este documento: **2026-11-30**.

## 8. Qué PARAR ahora mismo

- No construir fulfillment de láminas/enmarcado.
- No construir personalización "siembra tus iniciales / tu fecha": un CA desde
  semilla arbitraria suele morir o verse a ruido; build grande, output
  impredecible, riesgo alto de decepción del comprador.
- No añadir más modos 3D / features al motor. Ya está sobre-equipado para su
  tráfico. Cada hora va a embudo + distribución + oferta.

## 9. Nota sobre infraestructura de pagos

Decisión de pagos y su complejidad (Stripe vs Gumroad, one-time vs suscripción,
necesidad de backend/DB) documentada aparte para no acoplar la decisión de
*estrategia* con la de *implementación*. Resumen: para 2–3 tiers de **pago
único** con volumen bajo, la vía correcta es **Gumroad (actual) o Stripe Payment
Links + Cloudflare Worker sin base de datos**; NO se necesita suscripción ni DB
todavía. Ver siguiente handoff / conversación técnica.
