# QA harness

Headless end-to-end tests for the game. This is a development tool only: the game itself still
needs nothing but a browser.

The tests load `index.html` in headless Chromium with software WebGL (SwiftShader), drive the
real game through Playwright, and assert on the game state. Each `*.test.js` runs on its own
and exits non-zero on failure.

## Running

You need Node 18+ and the `playwright` package with a Chromium build:

```bash
npm i -g playwright && npx playwright install chromium   # once
NODE_PATH="$(npm root -g)" node tools/qa/run.js           # all tests (~15 min)
NODE_PATH="$(npm root -g)" node tools/qa/run.js checkpoint audio   # just some
```

To use a Chromium you already have, set `CHROMIUM_PATH=/path/to/chrome`. Screenshots go to
`tools/qa/out/`, which git ignores.

## What each test covers

| Test | Covers |
|---|---|
| `static` | Every schedule spot exists and is reachable on the nav grid; no double-booked spots; no dangling dialogue links; quest targets exist; interactables can be reached; simulation zones build |
| `boot` | Main menu → creator → intro → world through the real UI, then movement |
| `dialogue` | Random walk through every NPC's dialogue tree, looking for exceptions and dead ends |
| `checkpoint` | Reception → name badge → Kade → the arm. Covers blocking, NPCs showing badges at the arm, ducking under (caught, unseen, low Agility) and showing the badge from the inventory |
| `main-flow` | The whole main quest through all three simulations to the completion banner and a save |
| `divergent` | Awareness choices → INCONCLUSIVE → Juno's warning and manual record → the character sheet |
| `side-quests` | All six side quests, lockpicking, the coffee theft (seen and unseen), Tab menu, pause, waiting, and save → reload → Continue |
| `sims-idle` | Doing nothing in each simulation still progresses: the dog lunge, drowning, refusing to sit |
| `input` | The mouse stays captured through dialogue (mouse, wheel and click to choose) and re-captures after menus |
| `audio` | Per-room reverb, indoor vs. outdoor layers, open-door bleed, accents, the simulation beds, and the reverb setting |
| `save-migration` | A v1 save with old NPC ids loads into v2 with everything intact |
| `npc-day` | A full day of schedules from two vantage points: nobody stuck, teleported, path-less or double-seated |
| `perf` | Draw-call budget in the heaviest views |
