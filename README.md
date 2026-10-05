# DIVERGENT — Build 4: The City

A browser-based, offline, single-player third-person 3D RPG prototype set in the world of *Divergent*, from Aptitude Test day to the end of your first week of initiation. It is a private, non-commercial fan project and is not affiliated with Veronica Roth, her publishers or the film studios. All characters, locations and dialogue are original.

**Build 1** is Aptitude Day. You create a character, arrive at a faction-neutral Aptitude Testing Center, explore it, talk to 30 scheduled NPCs, pick up side quests, sit the aptitude test (three playable simulations) and get your result.

**Build 2** carries on from there. You go home for the night to the family that raised you, then go to the Choosing Ceremony in the Hub. There you cut your palm and choose a faction, and the people you met on Aptitude Day choose too, some of them because of you. Your first hour in that faction follows: for Dauntless, a run for a moving train, a jump onto a roof, a leap into the dark, and the Pit. The other four factions each have their own arrival.

**Build 3** is initiation. In **Dauntless** the compound becomes a living place you sleep, eat and train in, with a class of eight initiates and an instructor on daily schedules. Stage One covers three days of hand-to-hand fighting, the shooting range, knives and the bags, ranked on a board. Around the training are the zip line off the Hancock building, a knife lesson, an ambush at the chasm, the cut, and your first fear simulation. **Candor, Erudite, Abnegation and Amity** each get a first week built around what that faction does:
- **Candor:** an interrogation, then truth serum in front of everyone.
- **Erudite:** two lab puzzles, then a night errand into your instructor's office.
- **Abnegation:** a supply run where there is never enough, then a sealed envelope carried past a curfew patrol.
- **Amity:** a water dispute to mediate, a culvert to dig out, and the bread at supper.

In every faction, what your aptitude test really said catches up with you.

**Build 4** opens the city. Once your results are in, the Testing Center's gate lets you out onto Lake Street, and from there you can walk the whole city on foot, out past the last streets into Amity's farmland and all the way to the Fence: a wall round the city and its farms, as in the film, that you can look at but never reach. The streets have their real names and the HUD tells you which one you're on and which sector you're in. Each sector looks like the faction that lives there: the grey Abnegation rows, Erudite glass, Candor's offices, the Dauntless warehouses and the factionless ruins. The blocks are built the way a real city fills up: continuous street walls of brick walk-ups, greystones, lofts and offices, alleys behind them, and towers stepping up downtown. People walk the pavements and cross on the walk signal. Traffic keeps to its lanes, stops at red lights, turns at junctions, and honks when you step out in front of it. You can walk home to your own front door instead of taking the bus. The Map tab now has a **City** view. The day goes by outside: the sun crosses the sky, dusk lights the windows and the street lamps, and the crickets start up. **T** lets you wait anywhere you're free to: the day passes in a time-lapse and stops when someone needs you. The Dauntless compound is busy at every hour, and the weapons are proper models.

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
- **The main menu's theme song** streams from SoundCloud (or YouTube, if SoundCloud won't play it), so it needs a connection and the page served (Option B). Opened from disk or offline, the menu plays its own synth music instead. To play a copy of your own offline, put it in `assets/audio/` and set `MENU_THEME.file` in `js/core/config.js`.

Saves, settings and autosaves live in the browser's `localStorage` under the `divergent_b1_` prefix. To wipe them, clear site data for the page.

---

## Controls

| Key | Action |
|---|---|
| **Main menu** | ↑ ↓ (or W S, Tab) choose, **Enter** to go; ← → step through the factions' highlights, or click a bowl; **Esc** closes Settings, Load and Credits. Click anywhere (or press a key) for the theme song |
| **W A S D** / arrow keys | Move (relative to the camera) |
| **Mouse** | Orbit the camera. Click the game to capture the mouse, or hold a button and drag |
| **Mouse wheel** | Zoom the camera |
| **Shift** | Run (uses stamina) |
| **Space** | Jump (uses stamina; you can't jump when you're winded) |
| **C** | Crouch / sneak. Slower, and staff don't hear you coming. Shift or C stands you back up |
| **E** | Interact: talk, take, sit, open, examine. Also advances dialogue |
| **Tab** | RPG menu: Character · Skills · Inventory · Quests · Reputation · Map |
| **M / J / I** | Open the RPG menu on Map / Quests / Inventory |
| **T** | Wait, anywhere you're free to (not in a story scene). Pick how long (← →), or a time ("until the call", "until lunch", "until the evening"), and press Enter. The day goes by in a time-lapse; Esc stops it. A call to training, the PA calling your name, or anyone who needs you stops it early. Waiting won't take you past midnight: for the night, go to bed |
| **Map (Tab → Map)** | **Local** for the building you're in, **City** for the whole city. Wheel or **+ / −** to zoom, drag to pan, **Fit** to see it all, hover for names |
| **In dialogue** | Point at a response with the in-game cursor and click (or scroll / ↑↓ and press E or Enter). 1–9 also work. The mouse stays captured, so you never need to click back into the game |
| **Menus** | The Tab menu, waiting, reading and banners keep the mouse captured and show the game's own cursor. Turn **Settings → In-game cursor** off to use the system cursor instead |
| **Clock speed** | **Settings → Clock speed**: an in-game hour takes 6 real minutes by default, 12 on slow or 3 on fast |
| **`** (dev menu on) | The developer menu, for testing. Turn it on at the bottom of **Settings → Developer**. It opens with the key under Esc, or from **Pause → Developer** |
| **Space (held)** | At the Choosing Ceremony: hurry the names along |
| **Esc** | Pause menu (Resume, Save, Load, Settings, Controls, Quit) and close windows |

**Fights and training (Build 3).** During a fight, training or any other hands-on activity, the activity takes the controls and shows its keys along the bottom of the screen.

| Key | In a fight |
|---|---|
| **LMB** / **J** | Jab: fast, cheap, low damage |
| **RMB** / **K** | Cross: slower and heavier. The rear hand drawing back is the tell |
| **F** / **L** | Kick: heaviest, longest wind-up. The knee coming up is the tell |
| **Shift** (hold) | Block. It drains stamina, and a kick can break it |
| **Space** + a direction | Dodge: a short slip with invulnerability frames |
| **Q** (hold) | Yield |

| Activity | Keys |
|---|---|
| The range | Mouse to aim, LMB to fire, hold RMB for the sights, hold Shift to hold your breath |
| The knife wall | Hold LMB to wind up, release to throw |
| The bags | Strike on the called beat (jab, cross, kick), and block when the bag swings back |
| Candor's interview | Watch him while he talks. LMB/E challenges a statement, then 1–3 picks the evidence. RMB/Space lets it stand |
| The serum | Hold Space to clench your jaw. Once you've held long enough, E says something else |
| Erudite's benches | 1/2/3 to pick up a flask and pour it into another. On the relay board: WASD to move, E/Space to flip |
| Amity's culvert | Space or LMB to strike while the swing is in the band |

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
    config.js              Tunables (speeds, camera, LOD, save slots) + persisted DV.Settings (incl. clock speed)
  data/                    Pure data, no engine code
    factions.js            Six factions: descriptions, colours, clothing palettes; skin/hair/eye palettes
    rpg.js                 Attributes (STR AGI INT PER CHA RES), skills, XP curve, upbringings
    items.js               Item database (clothing, consumables, quest, misc)
    citymap.js             Build 4: the city's one shared map (avenues and streets by name, the sectors,
                           landmarks, every family's home, the Fence) — the city, the HUD and the map read it
    npcs.js                30 NPC definitions: identity, look, personality, access, schedules, dialogue id
    npcs_dauntless.js      Build 3: the Dauntless compound's 19 people, with schedules per day
    quests.js              Quest definitions (main + 6 side quests), objectives, rewards
    barks.js               Greetings, NPC↔NPC conversation lines, PA announcements
    dialogue/
      ambient.js           Tier-1 dialogue generator (builds a tree from an NPC's `lines`)
      staff.js             Handwritten staff trees (guard, receptionist, director, nurse, custodian…)
      candidates.js        Candidate trees (Jenna, Daniel, Lucy, Nate…)
      juno.js              The technician: briefing, serum, results, inconclusive branch
      sims.js              Simulation choice scenes (every choice carries hidden aptitude weights)
      dauntless.js         Build 3: the instructor, the class, the members (tattoos, the zip line…)
  engine/                  Reusable engine layer (knows nothing about the story)
    textures.js            ~60 procedural canvas texture painters, signs, emblems, posters
    materials.js           Material cache, PS1 vertex-snap "wobble" shader patch
    geometry.js            StaticBatch: merges level geometry per material, bakes lighting to vertex colours
    collision.js           AABB spatial hash, circle push-out, camera raycasts
    navigation.js          Grid A* with door/lock edges, wall-proximity cost, path smoothing
    props.js               ~70 parametric prop builders (desks, lockers, vending, consoles, trees, buses…)
    vehicles.js            Build 4: low-poly vehicles (bus, saloon, hatchback, van, pickup, jeep), one draw
                           call each, and the vertex-coloured mesh builder they share
    arms.js                Build 4: the pistol, the carbine and the throwing knife, built the same way
    props_street.js        Build 4: the bus shelter, stop and street signs, hydrants, news boxes, kerbs, road paint
    roads.js               Build 4: the road network: junctions, their kerbs, and their signals' cycle
    streetkit.js           Build 4: street furniture along every kerb in 96 m chunks near you (lamps, trees,
                           benches, planters, bollards, bike racks, meters, mailboxes, phone booths, works
                           on the pavement, signs at the corners, parked cars), solid, darkening with the
                           hour; the lamps' glow at night; road markings and the traffic signals
    physics.js             Loose things (bins, newspaper boxes, cones, crates, rubbish bags): pushed, knocked
                           over, rolling, bouncing off walls and each other, sleeping; one mesh for all
    world.js               Zone definition → rooms, walls, doors, windows, lights, colliders, nav, spots;
                           indoor/outdoor fog blending
    city.js                The procedural city around a zone: street grid, towers, the Hub, the L and its
                           train, the marsh and Ferris wheel, aerial haze, cloud deck and cloud shadows.
                           Build 4's walk mode: pavements, kerbs and shopfronts, each sector built its own way,
                           the landmarks, the Fence and its gate, solid buildings
    character.js           Procedural low-poly humans: skinned mesh, faces, hair, outfits, pose animation
    input.js               Keyboard/mouse, pointer lock with drag fallback
    audio.js               WebAudio procedural SFX, per-room convolution reverb, positional sounds,
                           soundscape layers, music, optional speech-synth PA
  game/                    Game systems
    state.js               The single serialisable save state (DV.State.data)
    clock.js               In-game clock (an hour every 6 real minutes by default; Settings → Clock speed)
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
    streetlife.js          Build 4: pedestrians by sector on the pavements and crossings, and traffic that
                           keeps right, queues, stops for you and honks
    extras.js              Build 4: the people a place is full of (the compound's members): sets by the hour,
                           standing, sitting, talking, walking their loop; solid, and they answer you
    chapter.js             Build 2 story chapters: scripted zones with actors, crowds, beat sequences,
                           cutscenes (letterbox, camera shots, the player as a puppet) and checkpoints;
                           a chapter can span several days (Build 3's faction weeks)
    build2.js              The bridge from Aptitude Day: the bus home, your faction choice, your parents
    district.js            Build 3: a living zone you stay in for days (the Dauntless compound): the
                           day's script, NPC schedules per day, sleeping, entering and leaving
    wait.js                Build 4: waiting (T) — the time-lapse, what stops it, what you'd miss
    freerun.js             Free-running: a course of moves (runs, vaults, leaps, rolls, climbs, flips) on true
                           arcs under gravity, and runners that take it
    activity.js            Build 3: hands-on play that takes over controls, camera and HUD for a while
                           and hands back a result (fights, training, the serum, the lab benches…)
    combat.js              Hand to hand: moves with tells, block, dodge, stamina, poise, stagger,
                           knockdowns, yielding, and an AI that guards, adapts, counters and feints
    training.js            The range (breath, recoil, moving targets), the knife wall, the bag drill
    initiation.js          Dauntless Stage One: the class, the day's training blocks, points, rankings, the cut
    stageone.js            The Dauntless district script: the days, the scenes, the knife lesson, the
                           ambush, the cut, the fear simulation's debrief
    firstweek.js           Build 3's other four factions: the week's score sheet, days, standings, quests
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
    compound.js            Build 3: the Dauntless compound (the Pit, dormitory, training room, dining
                           hall, simulation room, tattoo parlour, infirmary) and its props
    zipline.js             Build 3: the Hancock roof at night and the zip line ride
    fearsim.js             Build 3: the first fear simulation (the tank or the beam) and the
                           factionless ending if you're cut
    week_candor.js         Build 3: Candor — the evidence, the interview, the truth game, the Hearing
    week_erudite.js        Build 3: Erudite — the flasks, the relay board, the office at night, the exam
    week_abnegation.js     Build 3: Abnegation — the supply run, dinner, the envelope, the bench
    week_amity.js          Build 3: Amity — the water dispute, the culvert, the circle, the bread
  ui/
    ui.js                  HUD, compass, quest tracker, notifications, subtitles, barks, banners, fades
    dialogueUI.js          Old-school dialogue window (typewriter text, numbered choices, check labels)
    rpgMenu.js             Tab menu: Character / Skills / Inventory / Quests / Reputation / Map
    worldMap.js            Build 4: the City map (sectors, streets by name, landmarks, the Fence, you, home)
    menus.js               Main menu (the bowls of the Choosing, keyboard), pause, save/load, settings, controls, credits, wait
    menuReel.js            The main menu's highlights reel: the factions' days in real places, cut together
    menuTheme.js           The main menu's theme song: SoundCloud's (or YouTube's) own player, or the synth
    devMenu.js             Build 4: the developer menu (go to, story jumps, time, noclip, readout…)
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
6. **The bus home.** After your results the front gate opens. Take the bus at the curb when you're ready, or walk: the city is yours to cross, and your family's door is in your sector (for Amity, a truck waits where Madison Street leaves the city for the farms).
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
10. Each ends with **WELCOME TO …**, and Build 2 is complete. Click on to carry straight into Build 3. A save made after the welcome offers **Begin your first week** when you're ready.
11. **Dauntless: Stage One.**
   - **Day 2.** You find your bunk in the dormitory. The compound is yours to explore: the Pit, the chasm, the dining hall, the tattoo parlour, the training room.
   - **Days 3 to 5** follow Mark's schedule: the range, the bags, sparring, knives, and ranked fights against Bryce and then Josh. Points go up on the board at 17:00 each day, and turning up late or missing a block costs you.
   - **The evenings are yours.** You can teach Daniel to keep his hands up at the bags, get a tattoo from Nina, or ride the zip line with Bo.
   - **Day 5:** Mark asks for a volunteer to stand at the knife board.
   - **The night of Day 5:** Josh's ambush at the chasm.
   - **Day 6:** the cut. The bottom of the board becomes factionless, and that can be you. If you make it, there's your first fear simulation: the tank if you drowned in the aptitude flood sim, the beam if you didn't. A Divergent player, or one with high Resolve, can realise that none of it is real.
12. **The first week (the other four factions).**
   - **Candor.** Read the Hollis case evidence, then sit across from a frightened clerk and call his lies with the right piece of paper. Tell Rosa all of it, or not. Play the truth game in the dormitory. On Day 5 the serum goes in your neck in front of sixty people, and whatever you're hiding comes out unless you can hold it in without anyone seeing.
   - **Erudite.** Measure four litres with no measuring jug, and light the relay board in the fewest switches. On the night of Day 4 you fetch a grey folder from Dr. Park's office. There's a red one beside it. On Day 5, the examination.
   - **Abnegation.** A cart of supplies and seven people who need more than it holds, so ask before you give. Dinner at the Hayes house, where you may only speak to ask about someone else. A sealed envelope to carry after curfew, past a Dauntless patrol with a torch. On Day 5, Joan on the bench tells you whether you're ready.
   - **Amity.** Ruth's orchard is dying and she blames Tom's sluice. Hear them both, walk the channel and dig out the culvert. Then help the circle find common ground, and eat the bread at supper (or don't).
   - Each week ends with **FIRST WEEK COMPLETE**, your standing, and what your test caught up with.

**Side quests:** *The Wooden Bird* (Lucy, Amity; a social quest about a lost carving and a gruff custodian), *Cold Feet* (Daniel, Abnegation; talk a frightened candidate into going back to his test before noon), *Paper Trail* (Martha; a sealed envelope you can deliver, read or open), *Initiation Starts Early* (Nate, Dauntless; steal the guard's coffee without being seen), *Protocol D* (Jenna, Candor; what are the staff hiding?) and *Finders Keepers* (lost property).

---

## Implemented features

**Build 4: The City**
- **The main menu, redone,** in the game's own look: the serif logo with the five-faction seal and *Faction before blood* under it, the buttons on a bronze-framed plate, a caption panel for what's playing, and along the bottom **the bowls of the Choosing**: grey stones, burning coals, water, glass and earth, with the city's skyline for the city. It works from the keyboard too.
- **Pause and Tab menus, redone.** Every big window wears the same bronze frame with bracket corners.
  - **Pause:** the menu on the left; on the right, who you are (your mark, name, level, faction and experience), where and when you are, the task in hand and your stamina.
  - **Tab:** a head with your mark, name, standing, experience, place and time; engraved page tabs with icons; and a rendered portrait of you in a frame with a bronze nameplate on the Character page. Headings are engraved, and the chosen row is lit at its edge.
  - The HUD steps back while either is open.
  - **A highlights reel plays behind it.** It cuts between real places in the game, each with its people at their day:
    - the Dauntless free-running the rooftops at dusk;
    - Abnegation handing bread to a queue of factionless;
    - Erudite reading and lecturing in the reading hall;
    - Candor arguing it out in the circle;
    - Amity picking apples, and dancing and singing round the fire.
  - **Cuts and captions:** each place is shot with a few camera moves. Between them the reel dips to black, with the next faction's mark and virtue. A place is built under the black the first time round, so you never see the hitch. Click a bowl (or press ← →) to cut straight to a faction.
  - **The theme song** is Paul van Dyk's *Nothing But You* (Cirrus Mix, Amaru deconstruction). It streams in SoundCloud's own player in a "Now Playing" window, with YouTube's as the backup. It starts on your first click, the synth music steps aside while it plays, and it fades out when you start. Its ♪ stops it, its ✕ turns it off, and Settings brings it back.
- **Free-running.** Characters can vault (speed and kong), leap gaps, drop, roll out of a landing, climb a wall and mantle onto it, and front-flip. Jumps fly true arcs under gravity, and a roll or flip turns the whole body over. There are new everyday actions too: handing things out, carrying, picking fruit, playing guitar, arguing, dancing, shelving books.
- **Physics.**
  - **Loose things in the streets:** bins, newspaper boxes, traffic cones, crates and rubbish bags aren't bolted down. Walk into one and you shove it along; run into one and it goes over. They slide with friction and rock on the edge of their base, past the tipping point they fall, and they land, bounce, roll on their side, stop at walls, knock each other on, and settle. Cars knock them flying, and people walking past shove them aside.
  - **You:** your movement is sub-stepped, so a slow frame can't carry you through a thin wall or a post. You slide along walls, and you stop at the edge of the map instead of snapping back.
  - **Traffic:** cars brake to their stopping distance (hard, if you step out in front of one), and their bodies dip under braking, lift pulling away and lean in turns.
- **More in the streets.** Planters, bollards, bike racks, parking meters by the parked cars, blue mailboxes, phone booths, fire alarm posts, works on the pavement with barriers and cones, rubbish bags in the ruins, and crates in the Dauntless sector. Each sector has its own mix, and nothing is placed on top of anything else.
- **Nothing in the road.** An audit of everything the city builds found two buildings standing in streets. The Hub straddled Halsted Street and the Monroe junction; it now stands in the middle of its own block. The Dauntless compound's derelict jump-off block stood across State Street; it's now against the compound's west wall. Farm hedges no longer clip the dirt roads.
- **A walkable city.** The Testing Center's front gate opens once your results are in, and the city outside is solid ground all the way to the Fence. It's laid out from one shared map (`DV.CityMap`): avenues and streets with their real names, the faction sectors, landmarks and every family's home. The HUD names the street and sector you're in, and so do save summaries.
  - **Each sector is built its own way:** rows of identical grey Abnegation houses with their yards, Erudite glass, Candor's offices, the Dauntless warehouses, the factionless ruins. Ground floors have shopfronts (boarded up where it's poor), and some shops are lit after dark.
  - **Landmarks:** the Merciless Mart, Erudite headquarters, the Abnegation council hall, the Dauntless compound, the Hancock, the Hub, the marsh and its Ferris wheel, and Amity Headquarters out among its farms. The Fence rings the city and the farmland with watchtowers and a gate.
  - **Streets** have pavements, kerbs, lanes and crossings. Street furniture is laid along every kerb, in chunks near you: lamps, trees, hydrants, benches, bins, news boxes, dead traffic signals, name signs at the corners and parked cars. Buildings, furniture and cars are solid.
  - **The Testing Center from outside** has a proper concrete exterior, and outer walls no longer show interior paint.
- **Streets that work** (`DV.Roads`). Every junction inside the Fence has continental crossings on each arm, and stop lines where the traffic comes up to it. Two-way streets have the double yellow and dashed parking-lane lines. All of it is worn by sector: crisp downtown, half gone in the ruins. Working junctions have a signal pole on each corner, with the traffic's head on the far right corner and a second head on a mast arm over its lane. Walk signals face across each road, and the street-name blades hang on the poles. The signals run a cycle (green, amber, all-red, then the cross street), offset so a car at the limit meets a run of greens. The ruins' signals went dark years ago, and a third of the Dauntless sector's are down. At night every lamp glows.
- **Traffic that obeys them.** Cars stop at the line on red (and on amber when they can do it without slamming the brakes), pull away on green, and slow down and look at a dead junction. They turn left and right into the cross street when there's room, and only turn left when nothing is coming the other way. They show brake lights, tail lights and headlights after dark, and indicate before a turn. People wait at the kerb for the white man.
- **Buildings with a logic to them** (inspired by how GTA IV's Liberty City and Mafia's Lost Heaven are built). Each deep block has an alley down the middle with bins, back stairs and wooden poles carrying the wires. On each side, standard 7.6 m lots (the old 25-foot lot) front the street and are built right up to the pavement, so the street is one continuous wall. Neighbours keep close to each other's height, and the corners stand taller.
  - **Walk-ups** in brick or Chicago greystone have bay windows, a belt course over the shops, a two-tier cornice, awnings and the odd fire escape.
  - **Lofts** have big steel windows, stepped parapets, water towers and skylights.
  - **Offices** have a stone base and a crown.
  - **Downtown towers** stand on a podium, set back from the street and step in twice to a crown and spire.
  - Shopfronts are only on the street side (and round the corner on a corner lot); backs and party walls are plain. A blank side wall rising over a lower roof still carries a faded painted sign. Roofs have stair bulkheads, plant, chimneys, aerials and Chicago's water towers.
- **Amity's farmland, inside the Fence.** The city stops about 640 m from the centre; past it, all the way out to the wall, are the farms that feed it, and you can walk them.
  - **Fields:** section roads of packed dirt carry on the city's grid between parcels. Each parcel is split into long strips of wheat, green crops, fresh ploughing, pasture and fallow, with hedgerows between them and orchards in rows.
  - **Farmsteads** stand where the roads meet: a farmhouse, a red barn, a silo and grain bins.
  - **Amity Headquarters,** west along Madison Street: the meeting hall, a greenhouse, a storehouse, the cabins in an arc, the great oak and an arch with the Amity sign.
  - The HUD says **Amity Farmland**. Cars and pedestrians keep to the city's streets.
- **The Fence, as the film shows it.** It isn't a fence at all: it's a wall right round the city and its farms, about 1.13 km out.
  - **The wall:** 18 m of poured concrete (formwork panels, rows of tie holes, rust and weather running down it). Buttresses climb its inner face, there's a ledge halfway up, vents low down, and a walkway along the top with a rail and a parapet.
  - **On top:** a steel frame carries the electrified mesh another 16 m up, with girders, cross-bracing in every bay, razor wire along the crest and red lamps on the posts.
  - **Towers and gate:** a dozen watchtowers stand over it, each with a lit cabin, an aerial and a searchlight looking in. The gate, at the far end of Madison Street past the farms, is a gatehouse: two towers, a lintel with the frame carried across it, and two shut steel doors with ribs, bands and a hazard stripe.
  - **The cordon:** nobody gets near it. In front of the wall runs a security fence with barbed outriggers and yellow RESTRICTED signs, then a concrete strip, the patrol road, an apron at the wall's foot, and floodlight masts that come on at dusk. You can walk up to the cordon and look; at the gate, a checkpoint (guard booth, the barrier arm down, HALT) stops you.
  - **On the map:** the wall at its true thickness, its towers, the cordon as a dashed line, and the farmland inside it (fields by crop, orchards, farm roads and steads). The City view opens zoomed in on the city; Fit shows the whole of it out to the wall.
- **The L's columns stand on the pavement.** Where an avenue crosses under it, the deck spans the junction from a bent past each corner, the way the Loop does it, instead of standing in the road.
- **Street life.** Pedestrians dressed for their sector walk the pavements and cross at corners on the walk signal (or, where the signals are dead, when it's clear). Speak to one and they answer, and brush past a group and someone says something. Traffic keeps right (Lake Street is one-way under the L), queues, stops for you or for people crossing, and honks. Engines are positional sounds.
- **Vehicles** are low-poly models in the game's style (a bus, saloons, hatchbacks, vans, pickups, Dauntless jeeps): wheels and arches, glass and pillars, lights, doors on the kerb side, one draw call each. Lake Street has a proper bus stop: shelter, lit advert, timetable, pole, street sign, crossing and road paint.
- **Walking home.** Instead of taking the bus you can walk to your family's front door in your sector (for Amity, a truck where Madison Street leaves the city). The objective marker points there once it's the nearer way.
- **The world map.** The Map tab has a **City** view beside the local one: the Fence and its gate, the farmland, the marsh, every block tinted by sector, the main streets by name (all of them when zoomed in), the L, the landmarks, your home and the objective. You show as an arrow in the streets, or as a marker on the place you're in. Zoom, pan and hover for names. Sectors you've walked through are named brighter.
- **The sky and the hour.** The sky is a shader dome. It keeps each zone's colours and adds a haze band on the horizon, a glow where the sun is behind the overcast, and stars after dark. Outside the Testing Center the hour shows: the sun crosses from east to west, the late afternoon warms, sunset glows, and at dusk the windows light up across the city and the street lamps come on, each with a halo and a pool of light on the road. Streets, clouds, furniture and people darken with the light.
- **Ambience.** Crickets from dusk to first light, the wind getting up now and then, traffic a few streets off (louder as cars pass you), horns and dogs in the streets, a murmur where it's busy, and birds only by day.
- **Waiting (T).** You can wait anywhere you're free to, not only on a bench. Pick how long, or pick a time: the next call to training, a meal, lights out, noon, the evening, or "until you're called" on Aptitude Day. The panel warns you if a training block is on right now. The day goes by in a time-lapse: the light moves, the clock spins, and people come and go. Every minute still happens on the way, so the rankings go up at 17:00 if you wait through it, and a call to training, the PA calling your name, or anyone who needs you stops the wait right there. Esc stops it early. Waiting won't take you past midnight. A rest on your bunk before lights out is a time-lapse too.
- **Clock speed.** An in-game hour now takes 6 real minutes (it was 12). **Settings → Clock speed** offers 12, 6 or 3.
- **The Dauntless compound, busy.** The Pit is full of members, by the hour:
  - **Evenings:** groups round four fire barrels, people leaning on the railing or sitting on it over the chasm, walkers on the floor and up on the paths, someone on a ledge with their legs over the edge, customers at the stalls, and a drum circle after dinner that you can hear.
  - **Daytime:** fewer and busier. Members watch the initiates at the ring.
  - **Mealtimes:** the members' tables full and a queue at the counter.
  - **Night:** the watch walking the railing.

  They stand, sit, talk among themselves or walk their loop, answer when spoken to, and are solid. The place looks lived in too: the flame and DAUNTLESS sprayed huge on the north wall, slogans between the paths, initiates' names and tallies at eye level, banners hanging from the paths, strings of bulbs across the Pit, and stalls selling cake and coffee, clothes, and boots and knives. The dormitory's washroom door is no longer behind a bunk.
- **A developer menu for testing** (Settings → Developer, then **`** or Pause → Developer):
  - **Go to:** the city's landmarks, sectors and front doors, or the rooms of wherever you are. Shift+click on the City map goes there too.
  - **Story:** jump to a point in the story (results in with the gate open, the evening at home, the Choosing, Dauntless days 2–6, each first week).
  - **Time:** set the hour and the day, freeze the clock or run it ×6/×60.
  - **You:** noclip, which flies through anything: **V** in game toggles it, WASD to move, Space up, C/Ctrl down, Shift faster, and turning it off lands you on the nearest ground you can stand on. Also ×2/×4 speed and endless stamina.
  - **World:** an info readout (zone, room, coordinates, time, frame cost, the street's numbers), hiding the HUD for screenshots, and emptying the streets.
  - **Quests & items:** finish the current objective, or give yourself any item.
- **Weapons in the game's style.** A service pistol (slide, serrations, sights with dots, trigger guard, grip panels), a carbine, and a throwing knife with a diamond-section blade and cord-wrapped handle. The range pistol sits in your hands and comes up to your eye when you aim down the sights. The armoury rack holds real carbines and pistols.

**Build 3: Initiation**
- **Activities** (`DV.Activity`). These are hands-on stretches of play that take over the controls, camera and HUD, then hand back a result. They run on game time, so pausing freezes them and the QA bots can step them frame by frame. There are eleven:
  - Dauntless: the fight, the range, the knives, the bags, the zip line, the struggle at the chasm.
  - Candor: the interview, the serum.
  - Erudite: the flasks, the relay board.
  - Amity: the culvert.

  The fear simulations are chapters of their own.
- **Hand-to-hand combat.**
  - Moves have wind-up, active and recovery phases, with a readable tell on every heavy one. There is blocking with stamina drain, dodging with invulnerability frames, poise, staggers, knockdowns and yielding.
  - Stats scale with Strength, Agility, Resolve, Perception and the Melee skill.
  - The AI keeps a guard up when you're close and adapts to spam. It counters into the opening you leave, and it feints and circles.
  - Mashing one button no longer wins, and only holding block always loses. A typical fight lasts 30–60 seconds.
- **Districts** (`DV.District`). The Dauntless compound is a persistent zone you live in for days. People follow schedules that change from day to day. You sleep in your bunk to start the next day at 06:30, and saves load back to the same day, time and place.
- **The Dauntless compound.** The Pit with its glass roof and the chasm, the dormitory and washroom, the training room (range lanes, knife boards, bags, the ring, the rankings board), the simulation room, the dining hall, the tattoo parlour, the infirmary and the members' quarters. It has 19 people, including the class of eight: Kat, Nate, Josh, Ella, Daniel and Joey from Aptitude Day, plus Marcus and Bryce.
- **Stage One.**
  - Three days of ranked training with points, lateness and missed-block penalties, a board that updates at 17:00, and the cut on Day 6.
  - Side quests: *Hands Up* (Daniel), *Ink* (tattoos, chosen in the chair), *The Zip Line* (Bo) and *Bad Blood* (Josh).
  - The knife lesson, the ambush, the infirmary, and Mark's questions.
  - A factionless ending if you're cut, and the first fear simulation if you're not.
- **The first week, for the other four factions** (`DV.FirstWeek`). Each week is a chapter that spans days, with a checkpoint on every step. The people you came in with on Aptitude Day are there in their new faction's clothes, and every week has its own evaluation. Some of what you do is recorded for later builds:
  - Candor: whether Rosa knows, whether you resisted the serum, whether your divergence was exposed.
  - Erudite: whether you read the red folder or tore your page out.
  - Abnegation: whether Ezra is now a contact, whether Joan protects you.
  - Amity: whether you saw the peace tin, whether Mary noticed.
- Ten new places: the compound, the Hancock roof at night, the fear tank and the beam, Candor's upper floors, Erudite's labs, Abnegation after curfew, the Hayes kitchen, and the orchard by day.
- New animation: fight poses, aiming, throwing, bag work, and seated tells (a hand to the neck, folded arms, a serum slump).

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
- Main menu, settings (sensitivity, invert Y, render scale, filtering, wobble, draw distance, FPS counter, volumes, PA voice, room reverb, ambience detail, quest markers, text speed, clock speed), credits, pause menu, wait menu, and a canvas map of visited rooms. The character sheet shows your candidate number.
- Saves are versioned. Build 1 saves migrate automatically: renamed NPCs keep their relationships and memory, and the old candidate card becomes the name badge.

---

## QA performed for this build

The suite lives in `tools/qa/`. Run it with `node tools/qa/run.js`; it needs Playwright, and `tools/qa/README.md` explains the setup. It has 30 tests covering the following, all run in headless Chromium (SwiftShader WebGL):

- Boot and the full UI new-game flow (menu → creator → intro → world) with zero console errors.
- **Static validation:**
  - Every schedule spot exists and can be reached on the nav grid, in every zone people live in, for every day of the Dauntless week.
  - No two people book the same spot at the same time.
  - Every dialogue target node exists, all quest references are valid and every interactable can be reached.
  - All 13 story and simulation zones build.
- **Build 3, combat and training:**
  - A fight takes over the game.
  - A bot that guards and punishes beats a novice by knockout, only holding block loses to a boxer, and holding Q yields.
  - The range, the bags and the knife wall each score out of 100 and hand the controls back.
- **Build 3, Dauntless days 2–4:**
  - Arrival, the living compound, sleeping to Day 3, and the range, bags and spar against Joey, all scored.
  - A save made mid-afternoon in the compound loads back to the same day, time, place, people and points.
  - Daniel's evening request, and Day 4's knives, range and ranked fight against Bryce.
  - The board at 17:00, and the zip line ride.
- **Build 3, Stage One:**
  - The knife lesson and the scar, then the fight against Josh.
  - The ambush: the struggle, the fight, the infirmary, and Josh expelled.
  - The cut on Day 6, then the fear simulation through to STAGE ONE COMPLETE.
- **Build 3, the first week:** each of the four faction weeks is played start to finish, down to its banner, and a save made after it loads as free roam.
- **Build 4, the city** (51 checks):
  - Out through the gate on foot and along the streets. Buildings, the Testing Center's walls, the shore and the Fence keep you in.
  - The HUD names the street and the sector. Street furniture stands clear of buildings and traffic lanes, and is solid.
  - People walk the pavements, dressed for their sector. They talk when spoken to and you can't walk through them.
  - One-way traffic on Lake Street keeps to its lanes and stops (and honks) for you. Nothing is drawn deep indoors.
  - The world map draws the city and where you are. A save made out in the streets loads back there, and the walk home ends at your own door.
  - The L's columns all stand on a pavement, none in a road.
  - Nothing the city puts up (19,000 pieces) stands in a road or a farm road, and no street furniture is off the pavement.
  - The Fence: you get as far as the cordon and no further, not even at the gate. The wall runs right round the city with no gaps, and it has its towers and lamps. The Amity truck waits inside the cordon.
  - Amity's farmland lies inside the wall: its fields, orchards and steads are all there and none is out of place. You can walk out of the city along Madison Street into the farms, Amity Headquarters stands inside the Fence, and the map names the farmland and what's outside the wall.
  - Junctions have paint, poles and lamps. A signal is never green both ways, and the walk signal only shows with its green.
  - Cars stop at the line on red and never run one. They turn at junctions and never drive into each other. People cross on the white man.
- **Build 4, waiting and the clock** (31 checks):
  - The clock speed setting.
  - T opens the wait standing up. The keys work on the panel, and the time-lapse runs and ends by itself. Esc stops it early.
  - It won't cross midnight. In Dauntless it stops at the call to training (nothing missed), and it warns about a block that's on now.
  - The rankings go up at 17:00 while you wait through it. A conversation that takes over mid-wait gets the screen back.
  - The bunk rest is a time-lapse, and T does nothing in a chapter.
- **The main menu** (77 checks):
  - **The menu:** the logo and oath, the bronze-framed buttons in the game's serif, the bowls (each drawn), the keys and the version line, and nothing left of the old skin; the keyboard (past a disabled button; Enter; Esc out of a panel; ← → through the highlights); Settings over the running reel; Credits naming the song; Continue from a real save (the reel and the theme stop); the layout at 1024×600, 1280×720 and 1920×1080 with nothing overlapping.
  - **The reel:** it opens on the city; each faction's highlight plays in its own place with its people at their routine, inside the draw-call budget; the dip to black covers the screen (with the next faction's mark) before a place is swapped (and says LOADING when it's built); it goes on by itself and round again; three times round leaves nothing behind; New Game from the middle of it (even mid-wipe) puts you on the rooftop for the creator.
  - **Free-running:** every step is on a roof or an obstacle and nothing is run through (sampled every 20 ms), three runners in their own lanes, all the moves, the flip and the roll turning the body over, no shadow in the air.
  - **The theme song** (stand-in players: no SoundCloud or YouTube from the test machine): SoundCloud's player in view, waiting for a click, the menu's music stepping aside, the volume from Settings, ♪ and ✕, YouTube taking over if SoundCloud says no, the synth if neither will, and the fade on the way out. From disk it doesn't try to stream.
- **Physics** (17 checks): walking into a bin shoves it and running knocks it over; it lands (never through the ground), stops and sleeps; knocked at a wall it stops at the wall; on its side it rolls across its axis far more than it slides; bodies knock each other on; a car knocks a cone flying without slowing; people shove bins aside; a wild knock is held to what a car could do and settles; a 10 fps sprint never carries you through a 10 cm wall; you're never left inside something pinned against a wall; you slide along walls; a car's nose dips braking and settles.
- **The developer menu** (24 checks): it's off by default, and the toggle at the bottom of Settings turns it on. Covered: the key and the pause entry, going to a landmark, setting the hour (the lamps come on), noclip ×4 through a wall, the readout, hiding the HUD, emptying the streets, Shift+click on the City map, jumping to a Dauntless day, a first week and the Choosing, and turning it off again.
- **Playthrough at a human pace:** walking with the movement keys and reading dialogue at reading speed. It covers Claire's results and the camera afterwards, out through the gate to the bus, and the ceremony for all five factions. The Dauntless suite also checks the camera after the range and the bags.
  - Candor: the evidence, the interview (five lies caught, one truth miscalled), the verdict, the truth game, Rosa's warning, and holding one answer in under the serum.
  - Erudite: both benches in the fewest moves, the office key, the red folder, getting caught by the archivist, and the exam.
  - Abnegation: asking all seven, a fair run, dinner, being stopped by the patrol, the envelope to Ezra, and Joan.
  - Amity: both sides heard, the culvert dug, consensus at the circle, and the bread.
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
  - Each other faction's arrival through to its banner, each save from after the banner loading as free roam, and "Begin your first week" carrying on into Build 3.
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

Bugs found and fixed during Build 4:
- **Buildings stood in the road.** The Hub was centred on Halsted Street, so its tubes covered the street and the Monroe junction. The Dauntless compound's jump-off block was set 9 m out from the compound, which put it across State Street. An audit of every piece the city builds against every carriageway found both, and the city suite now checks for it.
- **A car could roll into you.** Traffic slowed in proportion to the gap ahead, at no more than 6 m/s². A car doing 12 m/s that only saw you late couldn't stop in time and touched you. Cars now brake to their stopping distance and look far enough ahead to stop in, braking up to 8 m/s² for someone in the road.
- **You could run through thin walls at a low frame rate.** Each frame's movement was resolved in one jump. At 10 fps a sprint covers half a metre a frame, which could land you on the far side of a fence or a post. Movement is now resolved in steps of a third of your width.
- **People on the pavement stepped the wrong way.** When you were in someone's way, they sidestepped towards you instead of away (a sign error), then crept into you and shoved you back up the street. They now step aside quickly, the right way, and never walk into you.
- **Hardly anyone crossed at the lights.** Someone who decided to cross and saw the hand would give up after half a second and wander off. Anyone waiting also counted cars driving straight on beside them as traffic in the way. They now wait at the kerb for the white man, and only traffic crossing their path, or turning, holds them up.
- **The L's columns stood in the road.** Its bents were spaced every 15 m regardless of the streets crossing under it, so wherever one landed on an avenue its legs stood in the roadway and cut that avenue's traffic in two. They now stand on the pavement, and the deck spans each junction.
- **The camera locked after the aptitude test.** Claire's results talk asked for the completion banner on a real-time timer. A player still reading her last lines got the banner on top of the conversation, and when the talk ended the camera was never handed back. Talking to her again was the only way out.
- **Nothing happened after choosing a faction.** The ceremony waited for you to stand within 1.1 m of your place among the initiates. They stand shoulder to shoulder and you collide with them, so you could stop just short and wait forever, with the clock stopped. Getting close or pressing E now takes you the last step.
- **The camera froze after the range.** The range finishes itself from inside its own update. The hand-back put the camera behind you, then the rest of that update put the aiming camera back. The activity framework now holds a finish requested mid-update until the update returns. That covers the bags, the knives, fights and the faction-week puzzles too.
- **The dormitory washroom door** was behind a bunk.
- **Lit shop windows looked like TV static.** The building seed was interpolated across each face, and the window hash turned the rounding error into noise on every pixel.
- **The PA followed you.** A Testing Center announcement could still appear after you'd arrived somewhere else.
- **Pedestrians walked under the Hub**, where it stands across two streets. The pedestrian pool also ran dry after a long trip across the city.
- **From outside, the Testing Center's walls showed interior paint**, and walking into them stopped you dead instead of sliding you along.
- **Abnegation roofs looked white.** The gable ends were drawn in raw wall colour. A neighbour's house also stood in the road beside yours.
- **A pigeon spawned in the road**, off a pavement that was narrower than its flock's scatter.
- **A wait could stop a hair short of a call.** The time-lapse adds the minutes up in fractions, and depending on the frame times the sum could land at 07:49.9999 instead of 07:50. The clock read 07:49, and the call to training due at 07:50 never came. The last step now lands exactly on the minute. The waiting suite caught it under load.
- **Waiting dragged at a low frame rate.** The time-lapse ran on capped frame time, so it now follows the wall clock when frames are slow. The side-quests suite found it.

Bugs found and fixed during Build 3's QA:
- **The front gate never let the player out.** Two things stopped you leaving the Testing Center after your results. The gate's lock only ever opened for NPCs. And the plaza's chain-link fence was built straight across the gate opening, so even an open gate had a fence behind it. NPCs walk on the nav grid, so they never noticed. The old test only checked that the barrier lifted and the bus was available. The new one walks the player out to the street.
- **Fight balance.** Mashing jab always won: it stun-locked the opponent and ran the AI out of stamina. The fix:
  - Recovery can now cancel only into a different move.
  - Guarding costs less stamina, and the AI guards sooner and holds its guard.
  - The AI spots spam and times counters to the opening.
- **The fight camera** sat behind the player and hid the opponent. It now views from the side. On the knife wall it could end up outside the room; a camera anchor fixed that.
- **Real-time timers** in the activities made headless runs non-deterministic. They were moved to game time.
- **Skipping training blocks.** Finishing a block landed three minutes before the next one, so that block never started.
- **Hidden objectives.** One objective that should have appeared stayed hidden.
- **The dialogue window** stayed on screen when an activity interrupted a conversation.
- **The fear sim's debrief** was wiped by re-entering the district. On the beam you could simply wait it out on the roof, and its "crack" key was swallowed by the interact key.
- **Two Dauntless initiates** were scheduled into the same waiting spot on Day 6.
- **Leftover state between steps.** State left over from one step of a faction week leaked into the next, including talk prompts for people who were no longer there.
- **The Erudite lab bench.** The player's own body blocked the view.
- **The Candor corridor.** A noticeboard hung in the Hearing Room doorway.

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

- **Free roam.** The Testing Center (with the city outside it) and the Dauntless compound are the two places you live in. The other four factions' weeks are scripted chapters: you can walk around afterwards, but their headquarters aren't yet full districts with schedules.
- **The city's buildings are outsides only.** Apart from the Testing Center you can't go into them, and the landmarks are exteriors for now. Cars keep to one lane per direction (no overtaking or lane changes) and turn without giving way to people crossing on the same green (they stop for anyone in front of them). People in the street have a line each, not conversations.
- **The hour only shows outside the Testing Center.** The compound is underground, and the story scenes keep the time of day they were made for.
- **Waiting stops at midnight.** For the night, sleep. During a time-lapse the crowd catches up in jumps rather than walking.
- **The ceremony is long.** The ceremony takes a few minutes if you let every name play. Hold Space to hurry it.
- **The story ends at week one.** Each faction now has its first week, and the choices along the way set flags for what comes next, but nothing happens after the end-of-week banner yet.
- **Fights are one-on-one** and only in the Dauntless compound (and on the street outside the Testing Center, for testing).
- **No authored art or audio.** Everything is procedural, which keeps the download tiny but limits facial expressiveness and gives a synth-like sound palette.
- **Simple animation.** Animation is procedural pose blending, not motion capture. There are no IK foot plants on stairs, and sitting transitions are short lerps.
- **NPC movement is simple.** NPCs follow nav paths with basic local avoidance (they hang back, pause, or step round on the right). In very tight crowds they can still brush through each other. The player is solid to them, and they wait or say "excuse me".
- **Dialogue camera** is a fixed over-the-shoulder framing and can clip slightly in very tight spaces.
- **Pointer lock** needs one click on the game. After that it holds through dialogue and menus. Pressing Esc releases it on purpose. Some browsers refuse pointer lock from `file://` or inside iframes; the hold-and-drag fallback always works.
- **Spoken PA** (optional speech synthesis) can't be routed through the game's audio effects, so only the PA chime gets the horn-speaker and echo treatment.
- **No mid-simulation saves** (by design), and only one in-game day is scripted. After 17:00 the building quietly empties.
- **Performance** depends on the GPU. The static level is batched into one draw call per material. A typical frame in the hub is 60–85k triangles and 45–190 draw calls. Each character draws in one call, and door details and NPC shadows are culled with distance. The busy lobby is the worst case. Integrated GPUs should run it at the default "Retro (480p)" render scale, while "Native" resolution on a 4K display may struggle.
- **Physics is for the street's loose things.** Bodies are circles in plan against walls and each other. They don't stack, and people walking past don't step round them. Indoors, furniture is still fixed.
- **The theme song needs a connection** and the page served. Opened from disk, or offline, the menu plays its own music.
- **Desktop only.** No gamepad or touch controls yet. The main menu works from the keyboard as well as the mouse.

---

## Build 5 recommendations

1. **Stage Two in full.** Turn the Dauntless fear landscape into a run of simulations, one fear per day, each with its own way out, and show your fears in the Pit's ranking. Make Divergent awareness a skill that risks discovery the more you use it.
2. **The other four headquarters as districts.** Give the Merciless Mart, Erudite headquarters, the Abnegation sector and the Amity farm the same treatment as the compound: schedules, sleeping, daily routines, and a second and third week each.
3. **Payoffs.** Act on the flags this build records:
   - Rosa protecting you, Dr. Park as an ally, and the red page in your pocket.
   - Ezra's washer, Joan's list, and Mary's doubts about the bread.
   - Hollis spared or sentenced, Josh expelled, and Daniel cut or saved.
4. **Visiting Day.** Your parents come to the compound or your headquarters, and what you told them at dinner in Build 2 comes back.
5. **Combat, deeper.** Grapples, using the ring's ropes, multiple opponents in the ambush, and a sparring partner who remembers how you beat them.
6. **Content pipeline.** Optional loading of authored glTF characters and props from `assets/`, with procedural fallbacks. A small in-browser dialogue and quest editor would also help, since the trees are already plain data.
7. **Animation.** Layered upper and lower body, IK feet, facial visemes during speech, and more idle variety.
8. **Audio pass.** Voiced key lines (or better speech synthesis), recorded ambience and adaptive music stems.
9. **Accessibility.** Rebindable keys, gamepad support, a subtitle size option, a colour-blind-safe UI and reduced-motion settings.
10. **Engineering.** Run `tools/qa` in CI on every push, and split the longer suites so they run in parallel.
11. **The city, inside and out.** Enterable shops and stairwells, traffic that gives way properly and changes lanes, and the city on the clock for every faction once their headquarters are districts.
