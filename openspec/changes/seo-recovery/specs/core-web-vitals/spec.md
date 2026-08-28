# Spec: core-web-vitals

## ADDED Requirements

### Requirement: Lazy engine initialization
The cellular automata engine (WebGL2 setup, shader compile, first render, AudioWorklet) SHALL NOT execute on page load; it SHALL initialize only after a user interaction or after the user scrolls to the tool frame.

#### Scenario: Fresh page load without interaction
WHEN a user (or crawler) loads https://cellscape.art/ and does not interact
THEN no WebGL context is created within the first 3 seconds
AND the visible frame shows the static landing state (seeded artwork poster or lightweight placeholder)
AND the main thread stays responsive (no long task > 50 ms caused by engine setup)

#### Scenario: User clicks Play
WHEN the user clicks the Play button or presses space
THEN the engine initializes (context, shaders, AudioWorklet as chosen)
AND the simulation starts within 500 ms of the interaction

### Requirement: Background tab throttling
The simulation loop SHALL pause its requestAnimationFrame rendering when the tab is not visible, and SHALL resume without user action when it becomes visible again.

#### Scenario: Tab hidden
WHEN the document visibilityState changes to "hidden"
THEN the rAF loop stops scheduling frames
AND no CPU/GPU work continues in the background

#### Scenario: Tab visible again
WHEN the document visibilityState changes back to "visible"
THEN the rAF loop resumes automatically
AND the simulation continues from the current state

### Requirement: Mobile performance budget
The mobile lab performance (PageSpeed Insights mobile, median of 3 runs) SHALL reach a Performance score ≥ 85 and a Total Blocking Time < 4,000 ms.

#### Scenario: PSI mobile re-run
WHEN the remediation tasks are complete and PSI mobile is re-run for https://cellscape.art/
THEN the Performance score is >= 85
AND Total Blocking Time < 4,000 ms
AND Largest Contentful Paint <= 2.5 s

### Requirement: No functional regression
The lazy initialization and throttling changes SHALL keep all existing selftests passing and all documented features available.

#### Scenario: Selftest suite
WHEN the CI selftest (test/ci-selftest.mjs) runs on every push
THEN all checks pass
AND the features flags FEATURES.* behave as before the change