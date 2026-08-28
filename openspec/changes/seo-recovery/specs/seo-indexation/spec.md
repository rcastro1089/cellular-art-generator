# Spec: seo-indexation

## ADDED Requirements

### Requirement: Soft-404 elimination
The site SHALL return a true HTTP 404 status (and a useful 404 page) for any URL not present in sitemap.xml.

#### Scenario: Request for a nonexistent URL
WHEN a crawler requests /blog/no-existe-esta-pagina/
THEN the server responds with HTTP status 404
AND the response body is a custom 404 page (not the homepage HTML)
AND the response includes a link to the homepage and the gallery

### Requirement: Indexed pillar article
The pillar article /blog/cellular-automata-art-guide/ SHALL be submitted for indexing and reach "Submitted and indexed" in URL Inspection.

#### Scenario: Re-index request
WHEN the site owner runs the indexing task
THEN the Indexing API receives a URL_UPDATED notification for the pillar URL
AND the URL Inspection API returns verdict PASS on the next check

### Requirement: Canonical www redirect
All variants of the www host SHALL redirect with HTTP 301 to the canonical non-www host.

#### Scenario: Access via https://www.cellscape.art/
WHEN a client requests https://www.cellscape.art/
THEN the response is HTTP 301 to https://cellscape.art/
AND the certificate for www resolves without SSL handshake errors (no 525)

### Requirement: Unescaped title tags
The <title> tags of math-art-decor-ideas, gifts-for-programmers, the gallery index and day-and-night SHALL not contain the literal entity &amp;.

#### Scenario: SERP title rendering
WHEN Googlebot fetches /blog/math-art-decor-ideas/
THEN the <title> element contains a literal "&" character
AND no HTML entity appears unrendered in the title text

### Requirement: Schema coverage for missing pages
The blog index page SHALL include a CollectionPage/ItemList JSON-LD, and the about page SHALL include an Organization JSON-LD.

#### Scenario: Blog index has listing schema
WHEN a crawler requests /blog/
THEN the HTML includes at least one application/ld+json block of type CollectionPage or ItemList
AND the list of articles is represented within the schema

#### Scenario: About has organization schema
WHEN a crawler requests /about/
THEN the HTML includes an application/ld+json block of type Organization or WebSite related to the brand

### Requirement: Non-empty H1 on the app shell
The application shell in index.html SHALL not expose an empty H1; the visible H1 SHALL be the richest heading of the page (brand or SEO content title).

#### Scenario: Heading audit on homepage
WHEN an accessibility or SEO crawler audits https://cellscape.art/
THEN every H1 element has non-empty text content
AND the H1 (or the single visible heading) contains the brand or the main keyword topic