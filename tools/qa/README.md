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
NODE_PATH="$(npm root -g)" node tools/qa/run.js           # all tests (~30 min)
NODE_PATH="$(npm root -g)" node tools/qa/run.js checkpoint audio   # just some
```

To use a Chromium you already have, set `CHROMIUM_PATH=/path/to/chrome`. Screenshots go to
`tools/qa/out/`, which git ignores.

## What each test covers

| Test | Covers |
|---|---|
| `static` | Every schedule spot exists and is reachable on the nav grid (in every zone, for every day of the Dauntless week); no double-booked spots; no dangling dialogue links; quest targets exist; interactables can be reached; all simulation and story zones build |
| `boot` | Main menu → creator → intro → world through the real UI, then movement |
| `dialogue` | Random walk through every NPC's dialogue tree, looking for exceptions and dead ends |
| `checkpoint` | Reception → name badge → Dean → the arm. Covers blocking, NPCs showing badges at the arm, ducking under (caught, unseen, low Agility) and showing the badge from the inventory |
| `main-flow` | The whole main quest through all three simulations to the completion banner and a save |
| `divergent` | Awareness choices → INCONCLUSIVE → Claire's warning and manual record → the character sheet |
| `side-quests` | All six side quests, lockpicking, the coffee theft (seen and unseen), Tab menu, pause, waiting on a bench (through the wait panel and its time-lapse), and save → reload → Continue |
| `sims-idle` | Doing nothing in each simulation still progresses: the dog lunge, drowning, refusing to sit |
| `reception` | Arriving candidates queue at the desk, are served in order, get their badge and move on |
| `movement` | Jump (stamina, exhaustion, height), crouch (camera, speed), sneaking past staff, no jumping the security arm |
| `input` | Classic mouse mode (in-game cursor off): the mouse stays captured through dialogue and re-captures after menus |
| `cursor` | The in-game cursor: menus keep the mouse captured; hover, clicks, wheel, sliders and dropdowns through it; free-mouse mode; the setting |
| `city` | The city builds fast and stays out of playable rooms; indoor/outdoor fog; cloud shadows move and darken people; the L train runs and stops cleanly |
| `wildlife` | Pigeons stay put, scatter when run at, perch and return; calm walkers don't spook them; crows circle; flags fly; litter stays in the plaza |
| `build2-story` | The bus home, dinner choices, a save at bedtime resuming at bedtime, the night before, the ceremony (order, consequences, knife, bowl, faction), the exodus |
| `build2-factions` | The Dauntless train (missing it, catching it), the roof jump (too early, right), first jumper, the net and the Pit; each other faction's arrival, a save after it, and "Begin your first week" |
| `build3-combat` | A fight as an activity; guarding and punishing beats a novice; turtling loses; holding Q yields; the range, bags and knives each score and hand the controls back |
| `build3-dauntless` | The compound on Day 2; sleeping; Day 3's range, bags and spar (and the camera handed back after each); a mid-afternoon save loading back to the same day, time, place and points; Daniel; Day 4's knives, range and fight; the board; the zip line |
| `build3-stageone` | The knife lesson and the scar; the fight against Josh; the ambush (struggle, fight, infirmary, expulsion); the cut; the fear simulation; STAGE ONE COMPLETE |
| `build3-weeks` | Candor, Erudite, Abnegation and Amity: each first week played start to finish by a bot, to its banner, and a save after it |
| `build4-city` | Out through the gate on foot and along the streets; buildings, the Testing Center, the shore and the Fence keep you in; street and sector names; furniture clear of buildings and lanes, and solid; people by sector on the pavements, talking, solid; one-way traffic on Lake Street that stops and honks for you; nothing drawn deep indoors; the world map; a save in the streets; walking home to your own door |
| `build4-wait` | The clock speed setting; T standing up; the wait panel's keys and quick choices; the time-lapse, Esc, midnight; Dauntless: stopping at the call, the warning for a block that's on, the 17:00 board while you wait, a conversation taking over, the bunk rest; no waiting in a chapter |
| `playthrough` | Played like a person (movement keys along nav paths, E, dialogue read at a human pace): Claire's results and the camera after; out through the gate to the bus; the ceremony for all five factions |
| `audio` | Per-room reverb, indoor vs. outdoor layers, open-door bleed, accents, the simulation beds, and the reverb setting |
| `save-migration` | A v1 save with old NPC ids and names loads into the current version with everything intact |
| `npc-day` | A full day of schedules from two vantage points: nobody stuck, teleported, path-less or double-seated |
| `perf` | Draw-call budget in the heaviest views, including the plaza looking out at the city |

Tests render at the lowest resolution and step game time (`QA.step`, `L.until`) instead of
waiting on the clock, so a slow software-GL frame rate can't make them flaky.

The Build 3 suites use the bots in `L.b3()` (`window.B`): `B.fightBot()` plays a fight (guards
the heavy shots, slips kicks, punishes recoveries), `B.finishActivity()` aims, throws and keeps
time at the range, the knife wall and the bags, `B.use(id)` uses an interactable, `B.at('HH:MM')`
jumps the clock (careful: an hour earlier than now rolls into tomorrow) and `B.wait(fn)` steps
until something happens. `QA.step(secs)` steps in 0.05 s frames, so anything shorter than that
does nothing.
