# DIVERGENT — Build 1: The Aptitude Test

A browser-based, offline, single-player third-person 3D RPG prototype set on Aptitude Test day in the world of *Divergent*. It is a private, non-commercial fan project and is not affiliated with Veronica Roth, her publishers or the film studios. All characters, locations and dialogue in this build are original.

Build 1 is a vertical slice. You create a character, arrive at a faction-neutral Aptitude Testing Center, explore it, talk to 30 scheduled NPCs, pick up side quests, sit the aptitude test (three playable simulations) and get your result. It ends with **APTITUDE TEST COMPLETE / YOUR CHOOSING CEREMONY AWAITS.**, and after that you can keep exploring.

Everything is built from HTML, CSS, JavaScript and Three.js. There is no build step, no npm, and no framework. All textures, characters, sounds and music are generated procedurally at runtime.

---

## Run instructions

**Option A: double-click.** Open `index.html` in a desktop browser. The game runs straight from `file://` because the scripts are classic `<script>` tags on a global `DV` namespace, not ES modules.

**Option B: local web server** (recommended if your browser restricts `file://`):

```bash
cd Divergent-The-Choosing
python3 -m http.server 8000
# then open http://localhost:8000
```

Requirements:
- A current version of Chrome, Edge, Firefox or Safari, with WebGL enabled.
- No internet connection. Three.js r149 is included at `js/lib/three.min.js`. If that file is missing, `index.html` falls back to the jsDelivr CDN.

Saves, settings and autosaves live in the browser's `localStorage` under the `divergent_b1_` prefix. To wipe them, clear site data for the page.

---

## Controls

| Key | Action |
|---|---|
| **W A S D** / arrow keys | Move (relative to the camera) |
| **Mouse** | Orbit the camera. Click the game to capture the mouse, or hold a button and drag |
| **Mouse wheel** | Zoom the camera |
| **Shift** | Run (uses stamina) |
| **E** | Interact: talk, take, sit, open, examine. Also advances dialogue |
| **Tab** | RPG menu: Character · Skills · Inventory · Quests · Reputation · Map |
| **M / J / I** | Open the RPG menu on Map / Quests / Inventory |
| **T** | Wait (while seated): pass time in 1–12 hour steps, or "Until called" |
| **1–9**, ↑/↓ + Enter | Pick a dialogue response |
| **Esc** | Pause menu (Resume, Save, Load, Settings, Controls, Quit) and close windows |

All of these are also listed in-game under **Pause → Controls**.

---

## Project structure

```
index.html                 Entry point: root containers + ordered <script> tags
css/style.css              Early-2000s RPG UI theme (bevelled panels, serif headings, HUD, menus)
js/
  main.js                  Boot: THREE/WebGL checks, starts DV.Game
  lib/three.min.js         Three.js r149 (MIT, see THREE_LICENSE.txt)
  core/
    utils.js               DV.U math/time/DOM helpers, seeded RNG, DV.Events bus
    config.js              Tunables (time scale, speeds, camera, LOD, save slots) + persisted DV.Settings
  data/                    Pure data, no engine code
    factions.js            Six factions: descriptions, colours, clothing palettes; skin/hair/eye palettes
    rpg.js                 Attributes (STR AGI INT PER CHA RES), skills, XP curve, upbringings
    items.js               Item database (clothing, consumables, quest, misc)
    npcs.js                30 NPC definitions: identity, look, personality, access, schedules, dialogue id
    quests.js              Quest definitions (main + 6 side quests), objectives, rewards
    barks.js               Greetings, NPC↔NPC conversation lines, PA announcements
    dialogue/
      ambient.js           Tier-1 dialogue generator (builds a tree from an NPC's `lines`)
      staff.js             Handwritten staff trees (guard, receptionist, director, nurse, custodian…)
      candidates.js        Candidate trees (Mara, Elias, Pip, Rook…)
      juno.js              The technician: briefing, serum, results, inconclusive branch
      sims.js              Simulation choice scenes (every choice carries hidden aptitude weights)
  engine/                  Reusable engine layer (knows nothing about the story)
    textures.js            ~60 procedural canvas texture painters, signs, emblems, posters
    materials.js           Material cache, PS1 vertex-snap "wobble" shader patch
    geometry.js            StaticBatch: merges level geometry per material, bakes lighting to vertex colours
    collision.js           AABB spatial hash, circle push-out, camera raycasts
    navigation.js          Grid A* with door/lock edges, wall-proximity cost, path smoothing
    props.js               ~70 parametric prop builders (desks, lockers, vending, consoles, trees, buses…)
    world.js               Zone definition → rooms, walls, doors, windows, lights, colliders, nav, spots
    character.js           Procedural low-poly humans: skinned mesh, faces, hair, outfits, pose animation
    input.js               Keyboard/mouse, pointer lock with drag fallback
    audio.js               WebAudio procedural SFX, ambience beds, music, optional speech-synth PA
  game/                    Game systems
    state.js               The single serialisable save state (DV.State.data)
    clock.js               In-game clock (1 real second = 5 game seconds, day starts 08:00)
    stats.js               Attributes, skills (practice-based), XP/levels, checks, buffs
    inventory.js           Add/remove/use/equip
    reputation.js          Faction reputation + per-NPC relationship and disposition
    quests.js              Quest framework: NOT STARTED → ACTIVE → UPDATED → COMPLETE / FAILED
    dialogue.js            Dialogue engine: trees, conditions, checks, effects, memory, placeholders
    npc.js, npcAI.js       NPC runtime: schedules, pathing, spot claiming, queues, LOD, barks, conversations
    player.js, camera.js   Third-person controller and camera rig (orbit, collision, dialogue framing)
    aptitude.js            Hidden aptitude scoring, divergence, result computation
    interaction.js         "What can I press E on" resolver
    story.js               Day script: PA calls, triggers, world actions (vending, coffee, lockpicks…)
    save.js                localStorage save slots (autosave + 6 manual)
    game.js                State machine and main loop; glues everything together
  zones/
    menuScene.js           Rooftop-at-dusk scene behind the main menu
    testingCenter.js       The hub: ~31 rooms, ~31 doors, ~250 props, spots, pickups, triggers
    simulations.js         The three test simulations + their scripted controller (DV.Sim)
  ui/
    ui.js                  HUD, compass, quest tracker, notifications, subtitles, barks, banners, fades
    dialogueUI.js          Old-school dialogue window (typewriter text, numbered choices, check labels)
    rpgMenu.js             Tab menu: Character / Skills / Inventory / Quests / Reputation / Map
    menus.js               Main menu, pause, save/load, settings, controls, credits, wait
    creator.js             Character creation (appearance, upbringing, attributes, confirm)
assets/                    Empty in Build 1 (everything is procedural); reserved for authored assets
```

### Adding content (it's data-driven)

- **NPC:** add one `add({...})` block to `js/data/npcs.js` with an id, name, age, sex, faction, appearance, personality, `access`, `schedules` and either `lines` (Tier 1, auto-generated dialogue) or `dialogue: '<treeId>'`.
- **Dialogue:** add a tree to `js/data/dialogue/*.js`. Nodes are `{ text, onEnter, choices:[{ text, to | end, if, once, check:{attr,dc}, fail, effect, apt, tag }] }`.
- **Quest:** add an entry to `js/data/quests.js`, then drive it from dialogue or story with `c.startQuest / c.setObj / c.completeQuest` (or `DV.Quests.*`).
- **Zone:** call `DV.Zones.define(id, { rooms, doors, windows, props, spots, pickups, triggers, spawn, build })`. `DV.World.activate(id)` builds and swaps it in. The simulations are themselves three small zones.

---

## How a run plays (light spoilers)

1. **Main menu → New Game →** character creation: name, sex, skin, face, hair, hair colour, eyes, body type, height, and the faction you were raised in. Then spend 12 points across six attributes, each with a description. The upbringing sets your starting clothes and a little reputation. It never locks you out of anything.
2. **Intro**, then you arrive at 08:00 on the street outside the Sector 4 Aptitude Testing Center.
3. **Security checkpoint** (Kade) → **reception check-in** (Marion) → wait in the hall. About 30–60 game minutes later the PA calls you to **Testing Room 4**. Use that time to explore, eavesdrop, talk and start side quests.
4. **Juno** briefs you and gives you the serum. Then come three simulations: **I. The Platform** (a rod or a flare, a starving dog, a lost child), **II. The Flood** (rising water, a trapped woman, a panicking man, a keypad code) and **III. The Tribunal** (an interrogation, a confession, a button). Each one can be approached by fighting, reasoning, protecting, deceiving, defying or mediating, or by noticing that none of it is real.
5. You wake up and Juno gives you your result. If your profile is **inconclusive** (Divergent), she reacts, warns you, and lets you choose what gets *recorded*. The result never decides your faction, and the character sheet still shows **CURRENT FACTION: UNDECIDED**.

**Side quests:** *The Wooden Bird* (Pip, Amity; a social quest about a lost carving and a gruff custodian), *Cold Feet* (Elias, Abnegation; talk a frightened candidate into going back to his test before noon), *Paper Trail* (Marion; a sealed envelope you can deliver, read or open), *Initiation Starts Early* (Rook, Dauntless; steal the guard's coffee without being seen), *Protocol D* (Mara, Candor; what are the staff hiding?) and *Finders Keepers* (lost property).

---

## Implemented features

**Presentation**
- PS1-style procedural humans. Each one is a single skinned mesh with head, torso, arms, hands, legs and feet, plus face textures (eyes, brows, mouth, nose), 8 face presets, a dozen hairstyles, body types, height variation, glasses/tattoos/piercings/scarves, and faction-coded outfits (Abnegation grey, Dauntless black, Erudite blue, Candor black and white, Amity red/yellow, Factionless mismatched).
- Optional vertex-snap "wobble", 480p "retro" render scale, nearest-filtered low-res textures, fog, and baked per-vertex lighting from ceiling fixtures and windows.
- The Testing Center is a real building: street, plaza, lobby, security checkpoint with barrier arm, reception, waiting hall, corridors, admin offices, director's office, conference room, records archive, copy room, infirmary, storage, break room, lockers, maintenance, courtyard garden, washrooms, six testing rooms (two sealed), a proctor station and a one-way-glass observation gallery. It has signage, notice boards, posters, clutter and a skyline outside the windows.
- Procedural animation: walk, run, idle, sit, work, type, recline, lie, crouch, cower, guard, arms crossed, clipboard, wave, mop, garden, pace and talk, plus head look-at.

**Systems**
- Third-person controller with camera-relative movement, stamina, collision with walls, furniture and NPCs, and footstep surfaces.
- Smooth orbit camera with pitch limits, zoom, wall and ceiling collision, and a dialogue framing mode.
- 30 NPCs: 7 Abnegation, 6 Dauntless, 7 Erudite, 5 Candor, 4 Amity, 1 Factionless. Each has a name, age, sex, faction, look, personality, job, access rights, schedule, dialogue, relationship and memory.
  - Dialogue comes in three tiers: Tier 1 is generated from `lines`, Tier 2 is a handwritten tree, Tier 3 has deep memory.
  - Schedules run on the game clock with A* navigation through doors the NPC is allowed to open. NPCs claim seats and workstations, queue at reception, hold NPC↔NPC conversations, bark at the player (greetings, "no running", staff-only areas), and use distance-based LOD.
- An old-school dialogue window with speaker, faction badge and disposition. Attribute checks such as `[PERCEPTION 6]` are shown greyed out when you can't pass them. Choices have real consequences (quests, items, reputation, relationships, flags), and NPCs remember you ("Back again?", "I still owe you").
- Quest framework with a journal, tracking, compass markers and distance to the objective. There is one main quest and six side quests, with branching outcomes and failure states.
- Inventory: clothing you can equip (it changes your model), consumables (stamina, buffs), readable documents and quest items. You can pick up, inspect and use items.
- Reputation for all six factions plus per-NPC relationships. Skills improve with practice (empathy, persuasion, deception, stealth, observation, composure…). There are XP and level-ups with attribute points.
- Hidden aptitude scoring covers five faction aptitudes, behavioural traits (bravery, selflessness, honesty, logic, peacefulness, observation, aggression, resistance, compliance, deception) and a separate divergence score. The result is a single faction or **INCONCLUSIVE**. The player never sees a "correct answer" or any numbers.
- PA announcements: group calls, your own call, reminders, and Elias' final calls. Speech synthesis is optional.
- Save/Load/Continue with an autosave and six manual slots. A save stores everything: world time, flags, doors, taken items, visited rooms, NPC memory, relationships, positions, quests, inventory and aptitude.
- Main menu, settings (sensitivity, invert Y, render scale, filtering, wobble, draw distance, FPS counter, volumes, PA voice, quest markers, text speed), credits, pause menu, wait menu, and a canvas map of visited rooms.

---

## QA performed for this build

All of these were run automatically in headless Chromium (SwiftShader WebGL):

- Boot and the full UI new-game flow (menu → creator → intro → world) with zero console errors.
- **Static validation:** every schedule spot exists and can be reached on the nav grid, every dialogue target node exists, all quest references are valid, every interactable can be reached, and all four zones build.
- **Dialogue fuzzing:** a random walk through all 30 NPC trees.
- **Main path**, start to finish: checkpoint → check-in → PA call → Juno → serum → all three simulations → result → banner → save.
- **Divergent path:** awareness choices in all three sims give INCONCLUSIVE. Juno's warning, the manual "record it as…" choice, the result slip and the character sheet all reflect it.
- **Passive path:** a player who does nothing still gets through. The dog lunges, the drowning scene plays, and refusing to sit still starts the trial.
- **Side quests:** every one, including the Pip → Gus → storage → return chain, the lockpick check, the coffee heist, Ruth's archive key and Elias' full arc.
- **Full-day NPC simulation** (08:00–17:30): no stuck NPCs, no teleports, no failed paths, no doubled seats.
- **Doors:** locked doors block both ways and open with a key.
- **Persistence:** save → reload page → Continue restores state. Two playthroughs in one browser session also work.

Bugs found and fixed during QA:
- Juno's results talk didn't auto-start because of a stale NPC distance.
- A long NPC walk could trigger the "stuck" teleport.
- An NPC that started the day queued at reception could stay stuck in line.
- An infinite loop when waiting "until called" before checking in.
- Simulation timers kept running in real time while the game was paused.
- Simulation state carried over into a second playthrough.
- Menu panels let the title text bleed through, and the narration text drew over menus.

---

## Known limitations

- **One location.** Build 1 only has the Testing Center and the three simulations. The streets beyond the plaza are backdrop.
- **No authored art or audio.** Everything is procedural, which keeps the download tiny but limits facial expressiveness and gives a synth-like sound palette.
- **Simple animation.** Animation is procedural pose blending, not motion capture. There are no IK foot plants on stairs, and sitting transitions are short lerps.
- **NPC movement isn't physically simulated.** NPCs follow nav paths and don't collide with each other, so crowds can overlap briefly. The player is solid to them, and they wait or say "excuse me".
- **Dialogue camera** is a fixed over-the-shoulder framing and can clip slightly in very tight spaces.
- **Pointer lock** needs a click on the game. Some browsers refuse it from `file://` or inside iframes; the hold-and-drag fallback always works.
- **No mid-simulation saves** (by design), and only one in-game day is scripted. After 17:00 the building quietly empties.
- **Performance** depends on the GPU. The static level is batched into one draw call per material. A typical frame in the hub is 60–85k triangles and 50–280 draw calls, most of them characters and dynamic props (the busy lobby is the worst case). Integrated GPUs should run it at the default "Retro (480p)" render scale, while "Native" resolution on a 4K display may struggle.
- **Desktop only.** No gamepad or touch controls yet.

---

## Build 2 recommendations

1. **The Choosing Ceremony.** A Hub zone with the five bowls, a family-and-candidates crowd scene, and a real choice that sets `player.faction`. The groundwork is already there: aptitude data, `recordedAs`, the divergent flag, faction reputation and NPC memory.
2. **The first faction zone.** For example, Dauntless arrival: the train jump, the net, the Pit, plus faction-specific quests, ranks and initiation stages. Each faction should get its own `DV.Zones.define` file.
3. **Consequences.** Payoffs for this build's choices. Juno could be investigated, Elias could transfer, Mara could expose Protocol D, and Gus' past could come up.
4. **Content pipeline.** Optional loading of authored glTF characters and props from `assets/`, with procedural fallbacks. A small in-browser dialogue and quest editor would also help, since the trees are already plain data.
5. **Animation.** Layered upper and lower body, IK feet, facial visemes during speech, and more idle variety.
6. **NPC crowd avoidance** (local steering), plus daily routines across multiple days and zones.
7. **Combat and fear systems** for Dauntless training, reusing the existing stamina, fear vignette and attribute checks.
8. **Audio pass.** Voiced key lines (or better speech synthesis), recorded ambience and adaptive music stems.
9. **Accessibility.** Rebindable keys, gamepad support, a subtitle size option, a colour-blind-safe UI and reduced-motion settings.
10. **Engineering.** An automated QA harness in the repo (the headless scripts used for this build), save-format versioning and migration tests, and texture atlasing to cut draw calls further.
