# Spec: content-expansion

## ADDED Requirements

### Requirement: Second pillar expansion
The article /blog/math-art-decor-ideas/ SHALL be expanded into a true pillar (2,000+ words) that targets the "scientific illustration" (3.6K/mo, LOW) and "math poster" (2.9K/mo) keyword clusters.

#### Scenario: Pillar depth audit
WHEN the article is re-crawled after the expansion
THEN its text content is >= 2,000 words
AND it contains sections for at least: wall-art types, room-by-room ideas, printer/POD tips, artist credits and the Cellscape CTA
AND the JSON-LD Article block references an updated date

### Requirement: Unified pattern hub
The gallery index SHALL function as a "All Game of Life Patterns" hub listing all 26 patterns and 32 rules with deep-links (?pattern=/?rule=) to the live tool.

#### Scenario: Hub crawl
WHEN a crawler visits /gallery/
THEN every pattern card includes a link with ?pattern=<slug> to the homepage tool
AND the visible list contains at least 20 named patterns
AND the title/target keyword matches "game of life patterns" or "cellular automata patterns"

#### Scenario: Deep-link works
WHEN a user opens https://cellscape.art/?pattern=glider
THEN the tool loads with the glider pattern pre-selected and the simulation paused with that pattern visible

### Requirement: Editorial cadence
The site SHALL publish 2-4 new blog posts per month targeting keywords with growing trend (per the research list: "cellular automata simulation" 170 ↗️, "procedural art" 210, "generative art ideas", etc.).

#### Scenario: Monthly content review
WHEN the monthly content review runs
THEN at least 2 new articles were published that month
AND each new article has a unique target keyword from the research list
AND each article links to the hub, the pillar or a sibling article (internal linking)

### Requirement: Blog thumbnails
The blog index cards SHALL display a thumbnail image for each post.

#### Scenario: Blog index visual
WHEN a user visits /blog/
THEN every post card includes an <img> element with a non-empty alt text
AND the image file exists in the assets folder