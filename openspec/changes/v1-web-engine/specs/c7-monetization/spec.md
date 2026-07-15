# C7 — Monetization

## Requirements

### R1 — Digital Downloads (Primary Revenue)
- **HD PNG download:** $9.99
- **SVG vector download:** $14.99 (Phase 2)
- **PDF print-ready (with margins):** $12.99 (Phase 2)
- Payment via Gumroad (easy setup, no API needed initially)
- Instant delivery after payment

### R2 — Print-on-Demand (Secondary Revenue)
- "Order Print" button routed to Printful
- Commission built into product markup (see C5)
- No inventory, no shipping

### R3 — Adsense (Tertiary, Phase 2)
- Only on blog/content pages, NEVER on the tool itself
- Only after 20,000 monthly visits

### R4 — Pricing Psychology
- Tool usage: **always free** (this drives traffic)
- "Download HD" in tool: $9.99 (impulse purchase)
- "Order Poster": $19.99+ (premium physical product)
- Bundle offer: "Download HD + PDF print-ready for $14.99"

## Acceptance Criteria

- [ ] "Download HD" button leads to payment flow
- [ ] Gumroad integration works end-to-end
- [ ] Printful orders route correctly
- [ ] No paywalls on the tool itself
- [ ] Pricing clearly displayed before payment
