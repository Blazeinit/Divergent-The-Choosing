# DIVERGENT — Build 2: The Choosing

A browser-based, offline, single-player third-person 3D RPG prototype set in the world of *Divergent*, from Aptitude Test day to your first hour in your new faction. It is a private, non-commercial fan project and is not affiliated with Veronica Roth, her publishers or the film studios. All characters, locations and dialogue are original.

**Build 1** is Aptitude Day. You create a character, arrive at a faction-neutral Aptitude Testing Center, explore it, talk to 30 scheduled NPCs, pick up side quests, sit the aptitude test (three playable simulations) and get your result.

**Build 2** carries on from there. You go home for the night to the family that raised you, then go to the Choosing Ceremony in the Hub. There you cut your palm and choose a faction, and the people you met on Aptitude Day choose too, some of them because of you. Your first hour in that faction follows: for Dauntless, a run for a moving train, a jump onto a roof, a leap into the dark, and the Pit. The other four factions each have their own arrival.

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
| **Space** | Jump (uses stamina; you can't jump when you're winded) |
| **C** | Crouch / sneak. Slower, and staff don't hear you coming. Shift or C stands you back up |
| **E** | Interact: talk, take, sit, open, examine. Also advances dialogue |
| **Tab** | RPG menu: Character · Skills · Inventory · Quests · Reputation · Map |
| **M / J / I** | Open the RPG menu on Map / Quests / Inventory |
| **T** | Wait (while seated): pass time in 1–12 hour steps, or "Until called" |
| **In dialogue** | Point at a response with the in-game cursor and click (or scroll / ↑↓ and press E or Enter). 1–9 also work. The mouse stays captured, so you never need to click back into the game |
| **Menus** | The Tab menu, waiting, reading and banners keep the mouse captured and show the game's own cursor. Turn **Settings → In-game cursor** off to use the system cursor instead |
| **Space (held)** | At the Choosing Ceremony: hurry the names along |
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
      candidates.js        Candidate trees (Jenna, Daniel, Lucy, Nate…)
      juno.js              The technician: briefing, serum, results, inconclusive branch
      sims.js              Simulation choice scenes (every choice carries hidden aptitude weights)
  engine/                  Reusable engine layer (knows nothing about the story)
    textures.js            ~60 procedural canvas texture painters, signs, emblems, posters
    materials.js           Material cache, PS1 vertex-snap "wobble" shader patch
    geometry.js            StaticBatch: merges level geometry per material, bakes lighting to vertex colours
    collision.js           AABB spatial hash, circle push-out, camera raycasts
    navigation.js          Grid A* with door/lock edges, wall-proximity cost, path smoothing
    props.js               ~70 parametric prop builders (desks, lockers, vending, consoles, trees, buses…)
    world.js               Zone definition → rooms, walls, doors, windows, lights, colliders, nav, spots;
                           indoor/outdoor fog blending
    city.js                The procedural city around a zone: street grid, towers, the Hub, the L and its
                           train, the marsh and Ferris wheel, aerial haze, cloud deck and cloud shadows
    character.js           Procedural low-poly humans: skinned mesh, faces, hair, outfits, pose animation
    input.js               Keyboard/mouse, pointer lock with drag fallback
    audio.js               WebAudio procedural SFX, per-room convolution reverb, positional sounds,
                           soundscape layers, music, optional speech-synth PA
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
    checkpoint.js          The security arch: badge checks, the barrier arm, NPCs queueing to show badges
    soundscape.js          What you hear where you stand: reverb, indoor/outdoor layers, accents, one-shots
    wildlife.js            Pigeon flocks, crows and gulls, blowing litter, flags flying in the wind
    chapter.js             Build 2 story chapters: scripted zones with actors, crowds, beat sequences,
                           cutscenes (letterbox, camera shots, the player as a puppet) and checkpoints
    build2.js              The bridge from Aptitude Day: the bus home, your faction choice, your parents
    save.js                localStorage save slots (autosave + 6 manual)
    game.js                State machine and main loop; glues everything together
  zones/
    menuScene.js           Rooftop-at-dusk scene behind the main menu
    testingCenter.js       The hub: ~31 rooms, ~31 doors, ~250 props, spots, pickups, triggers
    simulations.js         The three test simulations + their scripted controller (DV.Sim)
    home.js                Build 2: your family's home (five versions, one per faction) and the night before
    hub.js                 Build 2: the Choosing Ceremony in the Hub — the hall, the bowls, who chooses what
    dauntless.js           Build 2: the train, the roof, the net and the Pit
    arrivals.js            Build 2: arriving in Abnegation, Erudite, Candor or Amity
  ui/
    ui.js                  HUD, compass, quest tracker, notifications, subtitles, barks, banners, fades
    dialogueUI.js          Old-school dialogue window (typewriter text, numbered choices, check labels)
    rpgMenu.js             Tab menu: Character / Skills / Inventory / Quests / Reputation / Map
    menus.js               Main menu, pause, save/load, settings, controls, credits, wait
    cursor.js              The in-game cursor (hover, click, wheel, sliders and dropdowns under pointer lock)
    creator.js             Character creation (appearance, upbringing, attributes, confirm)
assets/                    Empty in Build 1 (everything is procedural); reserved for authored assets
tools/qa/                  Headless end-to-end test suite (dev only; see tools/qa/README.md)
```

### Adding content (it's data-driven)

- **NPC:** add one `add({...})` block to `js/data/npcs.js` with an id, name, age, sex, faction, appearance, personality, `access`, `schedules` and either `lines` (Tier 1, auto-generated dialogue) or `dialogue: '<treeId>'`.
- **Dialogue:** add a tree to `js/data/dialogue/*.js`. Nodes are `{ text, onEnter, choices:[{ text, to | end, if, once, check:{attr,dc}, fail, effect, apt, tag }] }`.
- **Quest:** add an entry to `js/data/quests.js`, then drive it from dialogue or story with `c.startQuest / c.setObj / c.completeQuest` (or `DV.Quests.*`).
- **Zone:** call `DV.Zones.define(id, { rooms, doors, windows, props, spots, pickups, triggers, spawn, build })`. `DV.World.activate(id)` builds and swaps it in. The simulations are themselves three small zones.

---

## How a run plays (light spoilers)

1. **Main menu → New Game →** character creation: name, sex, skin, face, hair, hair colour, eyes, body type, height, and the faction you were raised in. Then spend 12 points across six attributes, each with a description. The upbringing sets your starting clothes and a little reputation. It never locks you out of anything.
2. **Intro**, then you arrive at 08:00 in the entrance lobby of the Sector 4 Aptitude Testing Center.
3. **Reception** (Martha, at the east desk in the lobby) checks you in and prints your **name badge**, which then shows on your chest. At the **security arch**, Dean won't lift the barrier arm until you show him the badge. You can also try to **duck under the arm** [AGILITY 7], which only works while he's busy checking someone else's badge. Then you wait in the hall. About 30–60 game minutes after you clear security, the PA calls you to **Testing Room 4**. Use that time to explore, eavesdrop, talk and start side quests.
4. **Claire** briefs you and gives you the serum. Then come three simulations: **I. The Platform** (a rod or a flare, a starving dog, a lost child), **II. The Flood** (rising water, a trapped woman, a panicking man, a keypad code) and **III. The Tribunal** (an interrogation, a confession, a button). Each one can be approached by fighting, reasoning, protecting, deceiving, defying or mediating, or by noticing that none of it is real.
5. You wake up and Claire gives you your result. If your profile is **inconclusive** (Divergent), she reacts, warns you, and lets you choose what gets *recorded*. The result never decides your faction, and the character sheet still shows **CURRENT FACTION: UNDECIDED**.
6. **The bus home.** After your results the front gate opens. Take the bus at the curb when you're ready.
7. **Home.** It's your family's house, the way your faction lives: Abnegation's bare grey rooms and the mirror behind a panel, Erudite's books, Candor's black and white, Amity's warm wood, a Dauntless flat in the compound. At dinner, what you say matters. You can keep the test to yourself, tell them your result, or (if you're Divergent) start to say the word before your mother stops you. You can also ask how they chose at their own Choosing (one of them transferred) and what would happen if you left. Lying awake afterwards, you keep coming back to one of the five bowls.
8. **The Choosing Ceremony.** It's held high in the Hub, with the city below the windows. The factions sit in five sections, with your parents among them. After the speech, names are called in reverse alphabetical order, yours included. Each candidate cuts a palm and lets the blood fall on stones, water, glass, earth or coals, and their new faction applauds (the Dauntless roar). Some of the Aptitude Day candidates choose differently depending on you:
   - Daniel takes the coals if you got him to his test.
   - Jenna goes to Erudite to chase Protocol D if you told her.
   - Lucy holds up her bird if you found it.
   - Nate calls out to you if you pulled off the coffee heist.

   When it's your turn, you walk to the table, take the knife and hold your hand over a bowl. The moment remembers your test, your family and last night. Your parents react from their section. Hold Space to hurry the other names along.
9. **Arrival.**
   - **Dauntless:** run alongside the moving L and jump into an open door. Ride across the city and jump onto a roof (too early and you fall, too late and the train carries you away). Then step off a ledge into the dark, land in the net, and pick the name you'll go by. The Pit has the chasm roaring beyond the railing.
   - **Abnegation:** no speech. A crate of bread and the factionless waiting at the corner.
   - **Erudite:** the reading hall and an entrance question.
   - **Candor:** three questions in a circle of people who already know what you did yesterday.
   - **Amity:** the orchard at sunset, an apple to share and the song around the fire.
10. Each ends with **WELCOME TO …** and Build 2 is complete. After that you can keep exploring.

**Side quests:** *The Wooden Bird* (Lucy, Amity; a social quest about a lost carving and a gruff custodian), *Cold Feet* (Daniel, Abnegation; talk a frightened candidate into going back to his test before noon), *Paper Trail* (Martha; a sealed envelope you can deliver, read or open), *Initiation Starts Early* (Nate, Dauntless; steal the guard's coffee without being seen), *Protocol D* (Jenna, Candor; what are the staff hiding?) and *Finders Keepers* (lost property).

---

## Implemented features

**Presentation**
- PS1-style procedural humans. Each one is a single skinned mesh with head, torso, arms, hands, legs and feet, plus face textures (eyes, brows, mouth, nose), 8 face presets, a dozen hairstyles, body types, height variation, glasses/tattoos/piercings/scarves, and faction-coded outfits (Abnegation grey, Dauntless black, Erudite blue, Candor black and white, Amity red/yellow, Factionless mismatched).
- Optional vertex-snap "wobble", 480p "retro" render scale, nearest-filtered low-res textures, fog, and baked per-vertex lighting from ceiling fixtures and windows.
- **The city beyond the fence.** The flat painted backdrops are gone. Around the Testing Center there is now a whole procedural city: brick walk-ups and concrete offices on the nearby blocks, a vacant lot across the street, glass towers downtown around the Hub (a bundle of black tubes with twin antennas), ruins and skeleton frames, the dried-up marsh to the east with the old Ferris wheel at the end of the street, and the elevated L on steel bents just past the curb.
  - Distant buildings fade into an aerial haze instead of disappearing into fog, so the skyline reads as layered silhouettes. The fog opens up outdoors and closes in again indoors.
  - An overcast deck drifts overhead and low clouds slide between the towers, partly hiding the Hub. Their shadows move across the rooftops, the plaza and the street, and dim people standing in them.
  - Every few minutes an L train runs the length of the line, right past the plaza. Its rumble, motor whine and rail clatter travel with it and come through the walls muffled when you're inside.
  - The whole city costs about six draw calls. The main menu rooftop looks out over the same city at dusk, with lit windows.
- **Wildlife and small motion.** Pigeons peck and hop about the plaza, the street and the courtyard. Run at them (or walk right through) and the whole flock scatters with a clatter of wings, waits on a lamp post, the bus shelter or the L, and drifts back down later. Crows and gulls circle over the city and call from where they are. Litter blows across the plaza in the gusts, and the faction flags fly in the wind. All birds are a single instanced draw call.
- The Testing Center is a real building: street, plaza, lobby with the reception desk, a security arch with a barrier arm and scanner lamps, waiting hall, corridors, admin offices, director's office, conference room, records archive, copy room, infirmary, storage, break room, lockers, maintenance, courtyard garden, washrooms, six testing rooms (two sealed), a proctor station and a one-way-glass observation gallery. It has signage, notice boards, posters, clutter and a skyline outside the windows.
- Procedural animation: walk, run, idle, sit, work, type, recline, lie, crouch, cower, guard, arms crossed, clipboard, wave, mop, garden, pace and talk, plus head look-at.

**Build 2: The Choosing**
- **Story chapters** (`DV.Chapter`). A chapter is a scripted stretch of story in its own zone, like the simulations, but with cutscenes, crowds and checkpoints:
  - Cutscenes: letterbox bars, camera shots, the player moved by the script.
  - Crowds of extras, seated and standing, with clapping, cheering, cutting, falling and train-strap poses.
  - Beat sequences that wait for time or a condition, and game-time timers (pausing freezes them).
  - A fast-forward.
  - Checkpoints: saving during a chapter and loading puts you back at the start of the current beat. A save from after a chapter's ending loads as free roam.
- **Eight new places:**
  - the family home (five versions, one per faction);
  - the Choosing Hall on the Hub's 20th floor, with the city 78 m below;
  - the L walkway, the inside of an L car, the roof, the net room and the Pit;
  - the Abnegation street, the Erudite reading hall, the Candor lobby and the Amity orchard.
- **About 90 people on screen at the ceremony**, including your parents (the same faces as at dinner) and the Aptitude Day candidates (the same faces, now in their new faction's clothes).
- **Consequences:**
  - Your faction: the character sheet shows it, plus reputation changes and a transfer flag.
  - Your parents' reaction: a blessing if you asked them about leaving.
  - Other candidates' choices driven by Aptitude Day quests and flags.
  - Your Dauntless name; whether you jumped first; whether you lied to Candor.
- New sounds: applause, the Dauntless roar, crowd murmurs, the knife, blood on each bowl's contents, the moving train you board, a crackling fire.

**Systems**
- Third-person controller with camera-relative movement, stamina, collision with walls, furniture and NPCs, and footstep surfaces.
- Smooth orbit camera with pitch limits, zoom, wall and ceiling collision, and a dialogue framing mode.
- 30 NPCs: 7 Abnegation, 6 Dauntless, 7 Erudite, 5 Candor, 4 Amity, 1 Factionless. Each has a name, age, sex, faction, look, personality, job, access rights, schedule, dialogue, relationship and memory.
  - Everyone has an ordinary first and last name (Walter Grant, Jess Thompson, Kevin Shah, Nora Kelly, Rose Murphy) — no fantasy names.
  - Candidates wear the clip-on name badge once they've checked in. Staff wear ID lanyards; Dauntless security wear metal badges.
  - Dialogue comes in three tiers: Tier 1 is generated from `lines`, Tier 2 is a handwritten tree, Tier 3 has deep memory.
  - Schedules run on the game clock with A* navigation through doors the NPC is allowed to open. NPCs claim seats and workstations, queue at reception, stop at the security arch to show a badge or tap a keycard, step around each other, hold NPC↔NPC conversations, bark at the player (greetings, "no running", staff-only areas), and use distance-based LOD.
- An old-school dialogue window with speaker, faction badge and disposition. Attribute checks such as `[PERCEPTION 6]` are shown greyed out when you can't pass them. Choices have real consequences (quests, items, reputation, relationships, flags), and NPCs remember you ("Back again?", "I still owe you").
- Quest framework with a journal, tracking, compass markers and distance to the objective. There is one main quest and six side quests, with branching outcomes and failure states.
- Inventory: clothing you can equip (it changes your model), consumables (stamina, buffs), readable documents and quest items. You can pick up, inspect and use items.
- Reputation for all six factions plus per-NPC relationships. Skills improve with practice (empathy, persuasion, deception, stealth, observation, composure…). There are XP and level-ups with attribute points.
- Hidden aptitude scoring covers five faction aptitudes, behavioural traits (bravery, selflessness, honesty, logic, peacefulness, observation, aggression, resistance, compliance, deception) and a separate divergence score. The result is a single faction or **INCONCLUSIVE**. The player never sees a "correct answer" or any numbers.
- **Sound that follows you indoors and out.**
  - Every room has a convolution reverb that suits it: a big echoing lobby atrium, a tiled washroom, carpeted offices, concrete service rooms, open air outside.
  - Outdoors you hear wind, crows and gulls, flag ropes clinking on the poles and a distant elevated train. Indoors the same sounds are muffled through the walls.
  - The outside comes back in near open doors and windows, and the main doors let a gust in as they open.
  - Rooms have their own accents: fluorescent buzz, the simulation core's hum, the boiler, vending compressors, wall-clock ticks, washroom drips.
  - Footsteps, doors and the scanner are positioned and panned, and NPC footsteps are audible.
  - The crowd murmur grows with the number of people nearby.
  - The PA sounds like horn speakers: roomy indoors, echoing outside.
  - Each simulation has its own bed and space.
- PA announcements: group calls, your own call, reminders, and Daniel's final calls. Speech synthesis is optional.
- Save/Load/Continue with an autosave and six manual slots. A save stores everything: world time, flags, doors, taken items, visited rooms, NPC memory, relationships, positions, quests, inventory and aptitude.
- Main menu, settings (sensitivity, invert Y, render scale, filtering, wobble, draw distance, FPS counter, volumes, PA voice, room reverb, ambience detail, quest markers, text speed), credits, pause menu, wait menu, and a canvas map of visited rooms. The character sheet shows your candidate number.
- Saves are versioned. Build 1 saves migrate automatically: renamed NPCs keep their relationships and memory, and the old candidate card becomes the name badge.

---

## QA performed for this build

The suite lives in `tools/qa/`. Run it with `node tools/qa/run.js`; it needs Playwright, and `tools/qa/README.md` explains the setup. It has 21 tests covering the following, all run in headless Chromium (SwiftShader WebGL):

- Boot and the full UI new-game flow (menu → creator → intro → world) with zero console errors.
- **Static validation:** every schedule spot exists and can be reached on the nav grid, every dialogue target node exists, all quest references are valid, every interactable can be reached, and all four zones build.
- **Dialogue fuzzing:** a random walk through all 30 NPC trees.
- **Main path**, start to finish: reception → name badge → security arch → PA call → Claire → serum → all three simulations → result → banner → save.
- **Checkpoint:** the arm blocks you until you show the badge, and the lamp flashes red when you push at it. NPCs coming through all stop to show a badge or tap a keycard. Ducking under gets you caught when the guard is watching and works unseen while he's busy. The option is greyed out at low Agility. Showing the badge from the inventory works.
- **Mouse capture:** the mouse stays locked through dialogue (mouse, wheel and click choose), and is re-captured after clicking a choice with a free cursor or closing the Tab menu.
- **Audio:** per-room reverb and layers from the street to the lobby, hall, washroom, maintenance and courtyard; open-door bleed; the simulation beds; the reverb setting.
- **Save migration:** a v1 save with the old NPC ids loads with relationships, memory, flags and the badge intact.
- **Render budget:** the busiest view (the lobby) went from about 280 to about 190 draw calls, and the front plaza looking out at the city stays well inside the budget.
- **Build 2, story:**
  - After your results the gate opens and the bus takes you home.
  - Dinner choices are remembered.
  - A save made at bedtime loads at bedtime, with dinner already eaten.
  - Your leaning is kept.
  - At the ceremony: 68 people, names in reverse alphabetical order (yours included), Daniel's and Jenna's choices following Aptitude Day, the knife, the bowl text, and your faction, transfer and reputation.
  - The quest completes, the doors open, and you run for the train.
- **Build 2, factions:**
  - Missing the train, then catching the next one.
  - Jumping too early from the train and falling, then retrying and landing the roof jump.
  - "Who's first?", first jumper, choosing your name, and the Pit's welcome banner.
  - Each other faction's arrival through to its banner, and each save from after the banner loading as free roam.
- **City:** the city builds in a fraction of a second and never pokes into a playable room. The fog opens up outdoors, cloud shadows move and darken people standing in them, and a train runs the whole line with its sound, then stops cleanly (also when you leave the zone mid-pass).
- **Wildlife:** flocks stay on their patch until you run at them, scatter together, perch, and come back down. Walking calmly past doesn't spook them. Crows circle, flags fly, and litter blows about but stays in the plaza.
- **In-game cursor:** menus keep the mouse captured. Hover, clicks, wheel scrolling, slider drags and dropdowns all work through the in-game cursor. With the mouse free it replaces the system cursor, and turning the setting off restores the old behaviour.
- **Crouch & jump:** stamina cost, no jumping when winded, the crouch camera, slow sneaking, sneaking past staff unheard, and no jumping over the security arm.
- **Reception line:** arriving candidates queue, are served in order, get their badge and move on.
- **Divergent path:** awareness choices in all three sims give INCONCLUSIVE. Claire's warning, the manual "record it as…" choice, the result slip and the character sheet all reflect it.
- **Passive path:** a player who does nothing still gets through. The dog lunges, the drowning scene plays, and refusing to sit still starts the trial.
- **Side quests:** every one, including the Lucy → Gus → storage → return chain, the lockpick check, the coffee heist, Ruth's archive key and Daniel's full arc.
- **Full-day NPC simulation** (08:00–17:30): no stuck NPCs, no teleports, no failed paths, no doubled seats.
- **Doors:** locked doors block both ways and open with a key.
- **Persistence:** save → reload page → Continue restores state. Two playthroughs in one browser session also work.

Bugs found and fixed during QA (Build 1 and the pre-Build 2 pass):
- Thin props (railings, queue tape, partitions) didn't block NPC paths, so NPCs walked through the checkpoint railings.
- Claire's results talk didn't auto-start because of a stale NPC distance.
- A long NPC walk could trigger the "stuck" teleport.
- An NPC that started the day queued at reception could stay stuck in line.
- An infinite loop when waiting "until called" before checking in.
- Simulation timers kept running in real time while the game was paused.
- Simulation state carried over into a second playthrough.
- Menu panels let the title text bleed through, and the narration text drew over menus.

---

## Known limitations

- **Free roam is small.** The Testing Center is the only large explorable place. The Build 2 places are built for their scenes. You can walk around them afterwards, but there is nothing more to do there yet.
- **The ceremony is long.** The ceremony takes a few minutes if you let every name play. Hold Space to hurry it.
- **Mostly linear story.** It branches in tone and in who does what, not in where you go. Every faction reaches its own arrival, but nothing yet happens after that.
- **No authored art or audio.** Everything is procedural, which keeps the download tiny but limits facial expressiveness and gives a synth-like sound palette.
- **Simple animation.** Animation is procedural pose blending, not motion capture. There are no IK foot plants on stairs, and sitting transitions are short lerps.
- **NPC movement is simple.** NPCs follow nav paths with basic local avoidance (they hang back, pause, or step round on the right). In very tight crowds they can still brush through each other. The player is solid to them, and they wait or say "excuse me".
- **Dialogue camera** is a fixed over-the-shoulder framing and can clip slightly in very tight spaces.
- **Pointer lock** needs one click on the game. After that it holds through dialogue and menus. Pressing Esc releases it on purpose. Some browsers refuse pointer lock from `file://` or inside iframes; the hold-and-drag fallback always works.
- **Spoken PA** (optional speech synthesis) can't be routed through the game's audio effects, so only the PA chime gets the horn-speaker and echo treatment.
- **No mid-simulation saves** (by design), and only one in-game day is scripted. After 17:00 the building quietly empties.
- **Performance** depends on the GPU. The static level is batched into one draw call per material. A typical frame in the hub is 60–85k triangles and 45–190 draw calls. Each character draws in one call, and door details and NPC shadows are culled with distance. The busy lobby is the worst case. Integrated GPUs should run it at the default "Retro (480p)" render scale, while "Native" resolution on a 4K display may struggle.
- **Desktop only.** No gamepad or touch controls yet.

---

## Build 3 recommendations

1. **Initiation, stage one.** For Dauntless this is the training room: the fighting ring (combat built on stamina and attributes), the knife-throwing range, the rankings board and the cut. Each other faction needs its own first week, with its own trials.
2. **A real compound.** Turn the Pit into a free-roam hub like the Testing Center, with schedules, a dining hall, bunks and the chasm at night. Do the same for each faction's headquarters.
3. **Consequences, continued.** Payoffs for both builds' choices. Claire could be investigated. Jenna, now Erudite, could take Protocol D somewhere it shouldn't go. Daniel's choice of the coals could cost his father his council seat. Gus's past could come up. Your parents' visiting day could open with what you told them at dinner.
4. **Content pipeline.** Optional loading of authored glTF characters and props from `assets/`, with procedural fallbacks. A small in-browser dialogue and quest editor would also help, since the trees are already plain data.
5. **Animation.** Layered upper and lower body, IK feet, facial visemes during speech, and more idle variety.
6. **Better crowds.** Proper steering or RVO for big crowd scenes like the Choosing Ceremony, plus daily routines across multiple days and zones.
7. **Combat and fear systems** for Dauntless training, reusing the existing stamina, fear vignette and attribute checks.
8. **Audio pass.** Voiced key lines (or better speech synthesis), recorded ambience and adaptive music stems.
9. **Accessibility.** Rebindable keys, gamepad support, a subtitle size option, a colour-blind-safe UI and reduced-motion settings.
10. **Engineering.** Run `tools/qa` in CI on every push, atlas sign and poster textures to cut static draw calls further, and add portal-based room culling.
