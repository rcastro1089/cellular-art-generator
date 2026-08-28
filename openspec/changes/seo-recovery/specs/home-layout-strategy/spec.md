# Spec: home-layout-strategy

## ADDED Requirements

### Requirement: Tool stays at the homepage
The tool SHALL remain at the root URL (/) and the site SHALL NOT create a separate /app/ route in this phase.

#### Scenario: Root URL serves the tool
WHEN a user visits https://cellscape.art/
THEN the application shell (tool) is rendered at the root path
AND no canonical points to a /app/ URL
AND the decision is documented in design.md (D1)

### Requirement: Enhanced SEO content section
The .seo-content section of the homepage SHALL be enhanced so that on mobile the first screen shows a brief keyword-bearing intro (brand H1 + one-paragraph value prop) before the tool, while desktop keeps the app-first layout.

#### Scenario: Mobile first screen
WHEN the viewport width is below 768px
THEN the first visible content includes the brand heading (Cellscape) and a one-sentence value proposition mentioning "Game of Life" or "cellular automata art"
AND the tool remains reachable with a single scroll or tap

#### Scenario: Desktop layout preserved
WHEN the viewport width is >= 1024px
THEN the app fills the first screen as today
AND the .seo-content appears after the app as before

### Requirement: Homepage content signals
The homepage SHALL use its H1 (or equivalent heading) for the keyword-bearing title of the brand description, and link to the pillar and the gallery from the .seo-content.

#### Scenario: Keyword audit of the homepage
WHEN a crawler audits the homepage headings and text
THEN at least one H1/H2 heading contains "cellular automata" or "Game of Life"
AND the .seo-content includes internal links to /blog/cellular-automata-art-guide/ and /gallery/
AND the FAQ section keeps its own FAQPage JSON-LD