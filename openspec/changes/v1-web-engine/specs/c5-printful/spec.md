# C5 — Print-On-Demand Integration

## Requirements

### R1 — Platform: Printful
- Integrate with Printful API (or direct store link)
- Products: Posters (A3, A2, A1), Canvas prints, Framed prints, Mugs, T-shirts, Tote bags
- Pricing: User sees retail price; our commission is built into markup

### R2 — Integration Approach (Phased)
- **Phase 1 (MVP):** Direct link to Printful store with pre-configured product — no API integration needed. User clicks "Order Print" → goes to Printful checkout with their design uploaded.
- **Phase 2:** Full API integration — generate mockup preview, inline checkout, automatic file upload.

### R3 — Products & Pricing

| Product | Our Price | Est. Cost | Commission |
|---------|:---------:|:---------:|:----------:|
| Poster A3 (11.7×16.5") | $19.99 | ~$8 | ~$12 |
| Poster A2 (16.5×23.4") | $29.99 | ~$12 | ~$18 |
| Canvas 16×20" | $49.99 | ~$22 | ~$28 |
| Framed Poster | $59.99 | ~$30 | ~$30 |
| Mug 11oz | $14.99 | ~$6 | ~$9 |
| T-shirt | $24.99 | ~$12 | ~$13 |

### R4 — User Flow
1. User creates design in the generator
2. Clicks "Order Print" button → selects product type
3. Design is uploaded to Printful (Phase 2) or linked via pre-generated URL (Phase 1)
4. User completes purchase on Printful
5. Printful fulfills and ships
6. Commission is paid out

## Acceptance Criteria

- [ ] Phase 1: "Order Print" button links to Printful with design file
- [ ] Phase 2: Printful API integration works end-to-end
- [ ] At least 3 product types available (poster, canvas, mug)
