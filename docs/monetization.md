# Cellscape — Monetization & Gumroad Pro (handoff)

> Operational reference for Hermes / future agents. Documents what exists, why,
> and how the paid unlock works. **No secrets live here** — API tokens are only
> in `~/.hermes/.env` (Windows: `C:\Users\rcast\.hermes\.env`), never in the repo.
> Last updated: 2026-07-28.

---

## 1. TL;DR — current state

- **Site is LIVE:** https://cellscape.art (Cloudflare Pages, static, no build step).
- **Model:** the tool is **free**; a one-time **Cellscape Pro** unlock (Gumroad
  license) gates print-quality export. This is **Fase A: validation** — measure
  willingness to pay *before* building physical print-on-demand (Printful).
- **Gumroad product exists and is published:** "Cellscape Pro", $9, license keys ON.
- **Code is wired and verified:** `src/pro.js` verifies license keys by
  `product_id`; the free/pro gating lives in `src/features/exports.js`.
- **Enforcement is client-side and bypassable BY DESIGN** — real server-side
  enforcement is deferred to a Cloudflare Workers backend (Sprint 3). For a
  validation MVP this is intentional; do not "harden" it prematurely.

---

## 2. Why this model (the strategy)

The keyword research (`research/dataforseo/results.md`) shows an asymmetry:

| Demand | Proven? | Evidence |
|---|---|---|
| The **tool** (playing with CA) | ✅ Yes | "game of life conway" 27.1K/mo; "cellular automata" trending up |
| The **product** (buying CA prints) | ❌ Unproven | product keywords ("conway game of life poster", etc.) = **0 volume** |

So: launch the finished tool **free** to capture the proven game-of-life traffic
via SEO, and use a cheap digital unlock to **learn if anyone pays** before
committing to fulfillment. Physical POD (Printful) stays deferred until digital
conversion is validated.

---

## 3. The product — "Cellscape Pro"

| Field | Value |
|---|---|
| Name | **Cellscape Pro** |
| Price | **$9** USD, one-time |
| Product ID (used for license verify) | `vTIfvUv7ID5kEokedm2JYg==` |
| Permalink (used for the buy link) | `cellscape-pro` |
| Buy URL | https://automanexus.gumroad.com/l/cellscape-pro |
| Published | Yes |
| License keys | Enabled ("Generate a unique license key per sale") |
| Gumroad account | Ricardo Castro — automanexus.gumroad.com |

The **product_id** is the identifier the license API verifies against (Gumroad
surfaces it as "Use your product ID to verify licenses through the API"). It is
the current, non-deprecated field — prefer it over `product_permalink`.

---

## 4. How the unlock works (technical)

### Files
- `src/pro.js` — owns Pro state, the unlock modal, license verification, and
  restore-on-load. Self-initializes on import (wired from `src/main.js`).
- `src/features/exports.js` — calls `gatePro(feature)` / `isPro()` to gate the
  paid export paths.
- Pro UI: unlock button `#proUnlockBtn`, modal `#proModal` in `index.html`;
  styles + `body.is-pro` in `styles/app.css`.

### Free vs Pro

| Capability | Free | Pro |
|---|---|---|
| Full tool (all rules, palettes, surfaces, 3D, play) | ✅ | ✅ |
| PNG export @ 1920×1080, **signed** | ✅ | ✅ |
| Print-res export (4K → 7200×10800 @300dpi) | ❌ | ✅ |
| Transparent PNG (garments) | ❌ | ✅ |
| Video export (WebM) | ❌ | ✅ |
| Remove signature watermark | ❌ | ✅ |

The free tier must stay genuinely useful — it is what SEO traffic lands on and
shares. Do not lock it down further without a reason.

### License flow
1. User buys → Gumroad issues a unique license key (in receipt + download page).
2. User opens cellscape.art → Export card → **Unlock Pro** → pastes key → Activate.
3. `verifyLicense()` POSTs to `https://api.gumroad.com/v2/licenses/verify` with
   `product_id` + `license_key`. On `success`, the key is stored in
   `localStorage` (`cellscape_pro_license`) and `body.is-pro` flips on.
4. On reload, `restore()` trusts the stored key optimistically (works offline),
   then revalidates in the background — only an **explicit** `success:false`
   downgrades, so a flaky network never re-locks a paying user.

### DEV_KEY
`CELLSCAPE-DEV` unlocks the Pro UX **on localhost/127.0.0.1 only** (`IS_LOCAL`
guard). The bundle is public, so it is deliberately inert on the live host — do
not remove the host guard.

---

## 5. Gumroad API — what it can and cannot do

Verified empirically against the live account (2026-07-28):

| Action | API? | Endpoint / note |
|---|---|---|
| List / get products | ✅ | `GET /v2/products`, `GET /v2/products/:id` |
| **Create** a product | ✅ | `POST /v2/products` (requires `price` in cents) |
| **Edit** a product | ✅ | `PUT /v2/products/:id` (name, description, `custom_permalink`, price) |
| Create offer/discount codes | ✅ | `POST /v2/products/:id/offer_codes` (`amount_off`, `offer_type=percent`) |
| Verify a license | ✅ | `POST /v2/licenses/verify` (`product_id` + `license_key`) |
| **Upload files / product content** | ❌ | No endpoint (all `/files`,`/content`,`/upload` → 404). **Dashboard only.** |
| **Toggle license keys** | ❌ | Not exposed (`is_licensed`/`license` params silently ignored). **Dashboard only.** |

Credentials in `~/.hermes/.env` (names only — **values never leave that file**):
`TOKEN_GUMROAD` (access token, working), `APP_ID_GUMROAD`, `APP_SECRET_GUMROAD`.

---

## 6. Deploy & SEO

- **Domain:** cellscape.art (Cloudflare Pages, auto-deploys from `main`).
- **Deploy files:** `robots.txt`, `sitemap.xml`, `_headers` (security + revalidated
  caching for the no-build ES-module bundle).
- **SEO `<head>`** (in `index.html`): title targets "Conway's Game of Life",
  canonical, Open Graph + Twitter card, `WebApplication` JSON-LD.
- **`og-cover.png`** (1200×630, repo root → served at /og-cover.png): a real
  Conway B3/S23 long-exposure render behind the wordmark. Regenerate by
  rendering an HTML cover with Playwright if the brand changes.
- All of the above verified live (HTTP 200) on 2026-07-28.

**Off-page SEO still to do (not code):** submit `sitemap.xml` to Google Search
Console; build content (blog/gallery — Sprint 4, targets the zero-competition
long-tail); seed initial backlinks (r/cellular_automata, Product Hunt).

---

## 7. How to test the paid flow (free, no real payment)

The seller can validate the end-to-end unlock without paying:

1. In the Gumroad dashboard (or via `POST /v2/products/:id/offer_codes`), create a
   **100%-off** offer code for Cellscape Pro. ⚠️ **Treat these as temporary and
   delete them after testing** — an active 100%-off code = free Pro for anyone
   who knows it. Never commit a live code value to this (public) repo.
2. Open `https://automanexus.gumroad.com/l/cellscape-pro/<CODE>` → price shows $0.
3. Check out with an email (no payment at $0) → Gumroad issues a real license key.
4. cellscape.art → Export → **Unlock Pro** → paste key → Activate → expect
   **"Pro unlocked"** and the print/4K/transparent/video options enabled.

---

## 8. Pending / next steps

- [ ] **Upload `cellscape-pro-activation.pdf`** to the product's **Content** tab
      (Gumroad shows the product with 0 files as of 2026-07-28). The PDF is at
      `C:\Users\rcast\Downloads\cellscape-pro-activation.pdf` (an activation guide,
      not a code deliverable — the real deliverable is the license key).
- [ ] Delete any temporary 100%-off test codes once testing is done.
- [ ] Submit sitemap to Google Search Console.
- [ ] (Sprint 3) Cloudflare Workers backend for real server-side license
      enforcement; then Printful POD **if** validation is positive.
- [ ] (Sprint 4) Content pages (blog/, gallery/, shop) importing the shared
      `src/` modules.

---

## 9. Related

- `CLAUDE.md` → "Monetization — Fase A" section (canonical decisions).
- `research/dataforseo/results.md`, `research/competitors/competitive-landscape.md`
  → the demand data behind the strategy.
- `src/pro.js`, `src/features/exports.js` → the implementation.
