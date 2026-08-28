# Spec: link-building

## ADDED Requirements

### Requirement: Public repository with README
The GitHub repository SHALL be public and its README SHALL describe the project with the canonical link and the value proposition.

#### Scenario: GitHub discoverability
WHEN a visitor opens https://github.com/rcastro1089/cellular-art-generator
THEN the repository is public
AND the README contains a one-paragraph description
AND the README links to https://cellscape.art/
AND the README includes the tagline "Grown, not drawn" or the value proposition

### Requirement: Initial backlink portfolio
The site SHALL acquire at least 3 external backlinks within the first 60 days of this change.

#### Scenario: Launch distribution
WHEN the release ready is confirmed (indexed pillar, working site, public repo)
THEN submissions SHALL be posted to Product Hunt and Hacker News (Show HN)
AND at least two community posts SHALL be published on r/generative or r/cellular_automata linking to the tool
AND the results are tracked in a links log file

#### Scenario: Link verification
WHEN the backlink log is reviewed at the 60-day mark
THEN at least 3 of the submitted links are live (HTTP 200) and followed (not rel="nofollow" to the homepage where possible)
AND at least 1 backlink is from a domain with DR > 30 (per free OSS tools)

### Requirement: Pinterest channel for the decor niche
A Pinterest account SHALL be created and seeded with at least 10 pins linking to the gallery and the math-art-decor article.

#### Scenario: Pinterest content seeding
WHEN the Pinterest board is created
THEN each pin uses an exported artwork image (or OG cover) as the visual
AND each pin links to https://cellscape.art/gallery/ or /blog/math-art-decor-ideas/

### Requirement: Awesome-list submissions
The site SHALL be submitted to at least 2 relevant "awesome" lists (awesome cellular automata, awesome generative art or similar).

#### Scenario: Awesome list submission
WHEN the repository is public and labeled adequately
THEN a PR (or issue) is opened in the chosen awesome lists adding cellscape.art
AND the submission follows each list contribution guidelines