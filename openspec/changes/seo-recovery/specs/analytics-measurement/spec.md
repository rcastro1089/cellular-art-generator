# Spec: analytics-measurement

## ADDED Requirements

### Requirement: GA4 verified in production
The Google Analytics 4 property (G-3WQM53X1SX) SHALL be verified to receive events from the production site.

#### Scenario: Live analytics check
WHEN the analytics verification task runs
THEN the GA4 property shows at least one event received within the last 24-48 hours from cellscape.art
AND the GA4 measurement ID appears in the live HTML of the homepage

### Requirement: GSC baseline recorded
The current Search Console baseline SHALL be recorded in a file so future improvements can be measured.

#### Scenario: Baseline snapshot
WHEN the remediation starts
THEN a research/gsc-baseline-2026-08-28.md file records: clicks, impressions, queries and pages metrics from the last 90 days
AND the file includes the top-10 queries and pages

### Requirement: Two-week checkpoint
A checkpoint review SHALL be performed 14-21 days after the remediation tasks complete, comparing GSC data against the baseline.

#### Scenario: Checkpoint run
WHEN 14-21 days have passed since the fixes deployed
THEN the checkpoint compares clicks/impressions/indexation with the baseline file
AND the results are saved as research/checkpoint-gsc-YYYY-MM-DD.md
AND a short report is delivered to the owner with the next recommended actions