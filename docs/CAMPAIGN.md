# THE CHALK YEAR — the campaign after initiation

*Spoilers throughout. This is the design bible for everything that happens after the first week (the four non-Dauntless factions) or Stage One and Two (Dauntless). The code lives in `js/game/campaign.js` (the director, the casebook and the pieces of proof) and `js/zones/camp_*.js` (the episodes).*

---

## 1. What the city says, and what is true

**What the city says.** Nine weeks before the Choosing a body was found in Sector 3 with a circle of chalk drawn round it. Then another, in another sector. Five dead, a circle round each, the circle always drawn the same way. The newspapers call him *the Chalker*. Since then there is a curfew at 21:00, the Order (the Erudite-led police) patrols the streets, and drones scan the sectors between nine at night and six in the morning. The city is told: *a dangerous murderer is loose; trust the Order; stay in.*

**What is true.**

1. Erudite's Directorate, under **Dean Ottoline Vance**, is building **the Quiet**: *Series 7*, a compliance serum. It makes a person calm, suggestible and obedient. It is meant for the city's food and water.
2. The Quiet does not work on the Divergent. It *kills* some of them when the dose is raised to try. The Directorate found its test subjects through **Protocol D**: Sector 4's Aptitude Testing Center (Director **Dr. Alan Pierce**) records anomalous results by hand, and files each one in a **red folder** for "follow-up". Follow-up means a calibration room, then a body.
3. The "Chalker" is a story. The dead are the people in the red folder. A plainclothes Order unit, the **Calibration Team** under **Lieutenant Corbin Dray**, draws the circle after the fact, so the deaths read as one murderer, so the city asks for more drones and more Order.
4. The goal is **the Continuity Act**: a vote of the Council at the Hub that gives the Order emergency authority and makes the Quiet ration policy ("the peace bread") city-wide. After it passes there is no way back.
5. Not everyone who helps Vance knows what they help with.
   - **Dana Cole**, the Dauntless leader (Erudite-born), brokered the deal: Dauntless takes the Order's night duty and provides Stage Two's "simulation" subjects. She knows what the Quiet is and thinks it is worth it. **She is the leak** in the circle that forms in Act III.
   - **Mary Ellis** (Amity) has put a mild Series 7 in the bread for years, from "a little something from the dispensary". She believes it keeps the peace. She is not the leak.
   - **Dr. Helen Park** (Erudite) wrote the calibration notes. She thinks she is measuring a problem, not building a weapon, until lot 33.
   - **Rosa Medina** (Candor) knows the Candor tribunal's seals were used on the contracts and doesn't know what for.
   - **Joan Hayes** (Abnegation) and **Ezra** (the factionless) run the quiet underground that moves the flagged out before Erudite collects them.

The player is, or may be, **Divergent**. Even a player who isn't (a test result of one faction, no Divergent flag) is drawn in by what they see in their own faction's case. A Divergent player is on the red folder; the campaign never lets it stay abstract.

## 2. The cast (existing names in *italics* are already in the game)

| Who | Faction | Role in the campaign |
|---|---|---|
| *Dr. Alan Pierce* | Erudite | Director of the Testing Center. Protocol D. Reports to Vance. Cold, careful, never raises his voice. |
| **Dean Ottoline Vance** | Erudite | Head of the Directorate. The face of the Continuity Act. Warm in public, precise in private. Never seen before Act III. |
| **Lt. Corbin Dray** | Erudite (Order) | Leads the Calibration Team. Draws the chalk. Polite; a good listener; the most dangerous man in the book. |
| *Dr. Helen Park* | Erudite | Your Erudite mentor. Wrote the calibration notes. Torn. Becomes an ally or a casualty. |
| *Mr. Voss* | Erudite | Archivist. Pedantic, frightened, useful. |
| *Rosa Medina* | Candor | Your Candor mentor. Law above feelings. Protects you if you have earned it. |
| *Dale Hollis* | Candor | The night clerk from week one. His stolen crate of medicine was for his sister. |
| **Marta Hollis** | Candor (hidden) | His sister. A Protocol D case who survived "calibration" and needs the medicine that eases the withdrawal. Key witness. |
| *Joan Hayes*, *Aaron Hayes* | Abnegation | Joan's list is of the people to move. Aaron is a Council member (the one vote that can be turned). |
| *Ezra* | Factionless | The big man in the patched coat under the tracks; the refuge. |
| *Mary Ellis*, *Ruth Calder*, *Tom Asher* | Amity | Mary: the bread. Ruth and Tom: the farm. |
| *Mark Rivera*, *Bo Kaminski*, *Tess Navarro*, *Nina Kaur*, *Dr. Ama Mensah*, *Hector Alvarez* | Dauntless | Mark: your instructor, honest. Nina: ex-tester, afraid. Dr. Ama: Amity-born doctor who has seen the "simulation" injuries. |
| *Dana Cole* | Dauntless | **The leak.** Erudite-born Dauntless leader. Brokered the deal. |
| *Claire Dawson* | Erudite (Testing Center) | The proctor who warned you. A friend if you made her one. |
| *Daniel Webb*, *Jenna Morales*, *Lucy Barnes* | various | From Aptitude Day. Daniel and Jenna are on the Protocol D list. One of them is the seventh circle. |

## 3. The proofs (pieces of the case)

A **piece** is a thing you hold that can be shown to others. `DV.Campaign.give(id, how)` records it once. The Casebook (Tab menu, *Case*) lists every piece, the clues leading to it, and who is on your side.

| id | Name | Where it comes from (case) | What it proves |
|---|---|---|---|
| `chalk` | The night log and the chalk | **Dauntless** — Night Duty | The circles are drawn by the Order's Calibration Team *after* death; the log is initialled "D.C.". |
| `ledger` | Marta's statement and the Hollis ledger | **Candor** — The Sister | A living victim: what the Quiet does, what lot 33 did, who signed. |
| `lot33` | Park's calibration notes | **Erudite** — Lot Thirty-Three | The serum's fatal failure rate in the Divergent; the dose that was raised on purpose. |
| `tally` | Joan's tally | **Abnegation** — The Tally | Forty names, each ticked or crossed, set against the red folder: the dead are the flagged. |
| `manifest` | The dispensary manifests | **Amity** — The Bread | The same lot numbers in Amity's "peace tin" and Erudite's calibration room: it is going into the food. |
| `page` | Your own page | Erudite week (took the red page) | Protocol D lists *you*. Only if `took_red_page`. |
| `witness` | Claire Dawson's word | Testing Center (claire_ally) | The Testing Center overrides results by hand. Optional, from Act III. |

You always play **your own faction's case** in Act II and so always hold **one** piece from it. The other four are in your allies' hands. In Act III they come to you or they don't, depending on **trust** (Section 5) and on what you did in the Act. By the Hearing you hold between one and seven.

## 4. Acts and episodes

Days are story days (`DV.State.data.world.day`): Day 1 Aptitude Day, Day 2 the Choosing, Days 3–6 the first week or Stage One. **The campaign is Days 7–13.** Everything after 21:00 is under curfew; the drones are out.

### ACT II — FACTION BEFORE BLOOD (Days 7–9)

Every run plays exactly one of the five cases below, the one of their own faction (Dauntless players include Stage Two's fear landscape as the *opening* of Act II; it already exists as `fear_sim`). Each case is two chapters: **part 1** the scene and the trail, **part 2** the choice and the piece. The Act opens when the first week ends (see `Campaign.begin`): a notice board in your headquarters reads the sixth circle, and your mentor sends for you.

| Case | Chapter ids | Zones | Day | Piece |
|---|---|---|---|---|
| **Dauntless — Night Duty** | `camp_d1`, `camp_d2` | `camp_railyard` (the old yard under the L, a body, the Calibration Team); `d_compound` (Dana's office, the night log) | 7–8, nights | `chalk` |
| **Candor — The Sister** | `camp_c1`, `camp_c2` | `camp_tenement` (Dale Hollis's sister's flat, a block of rooms); `cand_upper` (the tribunal; the sealed statement) | 7–8 | `ledger` |
| **Erudite — Lot Thirty-Three** | `camp_e1`, `camp_e2` | `camp_archive` (the Directorate's archive and the calibration room, three floors); `eru_lab` | 7–9 | `lot33` |
| **Abnegation — The Tally** | `camp_a1`, `camp_a2` | `camp_tally_house` (Joan's cellar, the list); `abn_street` (the sweep: the Order comes for a family) | 7–9 | `tally` |
| **Amity — The Bread** | `camp_m1`, `camp_m2` | `camp_dispensary` (Amity's dispensary and its store); `amity_farm` (the night delivery truck, the manifests) | 7–9 | `manifest` |

**Design rules for a case.** Each has: a scene to read (examine four or five things), a person who knows more than they say (two or three conversations that turn on a stat check and the player's earlier choices), one *risk* (an Order patrol or a drone or an archivist, handled the way week one handled the patrol and the archivist: a cone of light, a timer, a lie), and one *choice* with a price (hand the piece to your faction's leadership and be safe, or keep it and be hunted). The player's choice sets `camp_<case>_kept` or `camp_<case>_handed`. Handing it over still gives the piece *as testimony only*; keeping it gives the piece itself.

### ACT III — THE CIRCLE CLOSES (Days 10–12)

| Chapter | Zone | What happens |
|---|---|---|
| `camp_x1` **The Seventh Circle** (Day 10, dawn) | `camp_street` (a block in the player's sector; the chalk circle on the pavement) | The seventh body is someone from Aptitude Day: **Jenna Morales** if she went to Erudite (`pd_shared`), else **Daniel Webb** (cut and factionless, or alive in Dauntless), else a stranger the player has met. Dray is there in uniform. He knows the player's name. He is kind. He asks a question the player can only answer with a lie or a truth that costs. Ends with Joan's runner (or Ezra's washer, or Claire, or Mark: whoever the player trusts most) pressing a **meeting place** into the player's hand. |
| `camp_x2` **Under the Tracks** (Day 10, night) | `camp_tracks` (Ezra's refuge: a disused L platform with bunks, a stove, a map table) | The circle meets: **Ezra**, **Joan** (or Aaron), **Rosa**, **Park**, **Mary**, **Mark/Bo**, **Claire**: whoever you have kept alive and trusted comes. Each who comes *brings their piece* (if their `trust` ≥ 3 and the player didn't betray them in Act II). The player lays the pieces on the map table: the **Casebook deduction** (Section 6). **Dana Cole** is not invited but **the Order arrives anyway** halfway through. The player must get the circle out (a chase through the dark tunnels, set in the same zone: lights out, a timer, choices about who to go back for). Afterwards: someone told. **Who?** |
| `camp_x3` **The Night of the Scan** (Day 11, 21:00–05:00) | `camp_scan` (a long night street under drones; the Abnegation sector's rows) | The Order sweeps Abnegation for Joan's list. You can: run the list out ahead of the drones family by family; draw the drones off through the city (an on-foot chase across the real roofs of `hancock_roof`/the free-running course); or confront Dray. The player's allies each do their part if they are alive and trusted. The night ends in the Hub's Council chamber with a summons: the vote is tomorrow. |

### ACT IV — THE CONTINUITY VOTE (Day 12–13)

| Chapter | Zone | What happens |
|---|---|---|
| `camp_z1` **The Hearing** (Day 12) | `hub_hall` (the Choosing Hall, arranged as a Council chamber) | Dean Vance presents the Continuity Act to the Council and the five factions in the stalls. The player may speak. The choice (below) is made with the pieces on the table. |
| `camp_end_*` **Four epilogues** (Day 13) | various | See Endings. |

### Endings

| Ending | Needs | What happens |
|---|---|---|
| **OPEN AIR** (the best) | ≥ 4 pieces including at least two of `chalk`/`ledger`/`lot33`/`tally`; *and* the leak named correctly (Dana) | The vote fails. Vance is stopped on the stage; Pierce is held; the Order is reorganised under the Council. The factions begin to argue about the Directorate for the first time. The last scene is on the roof of the Hub at dawn with whoever is left; the Fence's gate is visible. Hook: *what is outside?* |
| **THE QUIET** | The player takes Vance's offer (a seat, safety for the Divergent, a post in the Directorate) | The Act passes. The player is protected and used. The last scene is a calm, well-lit, silent city and a bread tin on a doorstep. |
| **UNDER THE TRACKS** | The player vanishes with Ezra (any piece count) | The vote passes without a fight; the player is factionless by choice, the head of a small network. Ten years later, a note: the circle is still moving people out. |
| **BEYOND THE FENCE** | ≥ 2 pieces and the player chooses the gate | The player takes the evidence and leaves through the gate with the flagged. The Fence shuts behind them. What is on the other side is for the next season. |
| **THE QUIET PASSES** (the bad) | < 2 pieces, or the player says nothing | The Act passes, the Divergent are collected, the player is among them or their friends are. The last scene is the bread tin and a chalk circle. |

## 5. Trust, flags and who comes

Each ally has a **trust** from 0 to 5 in `DV.Campaign.trustOf(id)`, changed by `DV.Campaign.trust(id, delta, why)`. The ids: `rosa`, `park`, `joan`, `aaron`, `ezra`, `mary`, `mark`, `claire`, `ama`, `nina`, `bo`, `tess`, `dale`, `marta`. Start values come from the existing flags (`rosa_protects` +2, `park_ally` +2, `joan_protects` +2, `ezra_contact` +2, `claire_ally` +2, `mary_doubts` +2, `mark_warned`/`mark_knows_josh` +1, `josh_*`, `daniel_*`, and so on); `DV.Campaign.begin` seeds them. An ally comes to Under the Tracks if `trustOf(id) ≥ 3` and they are not dead. An ally brings their piece if they come.

Flags set across the campaign (use `DV.State.setFlag`):

`camp_started`, `camp_<case>_part1`, `camp_<case>_kept`, `camp_<case>_handed`, `camp_<case>_done`, `camp_seventh_<name>`, `camp_dray_lied`, `camp_dray_truth`, `camp_tracks_raided`, `camp_leak_known`, `camp_leak_named`, `camp_scan_list_saved` (count in `story.campaign.saved`), `camp_vote_won`, `camp_vance_offer`, `camp_ending_<id>`.

Dead allies: `story.campaign.dead` (array of ids). A Divergent player's death is never random. Allies die only as the result of a choice the player made and was warned about.

## 6. The Casebook and the deduction

The Tab menu has a **Case** page: *The Case* (the five-line premise, as much as you know), *Proof* (each piece, owned or not, with where it came from), *People* (allies, trust bars, and the names of the Order's people as you meet them), and *Notes* (the clue log). In Act III's Under the Tracks the player is asked **who is the leak** and is given a list of suspects (Dana, Mary, Park, Rosa, Mark, Claire). There is exactly one answer (`dana`), and the clues that point to it are spread across the cases:

- `chalk` shows the night log initialled D.C. (Dauntless case).
- Mark Rivera, if trusted, says Dana asked where you went (Dauntless).
- Dr. Park's notes name Dana Cole as *"D.C., Dauntless liaison, Series 7 supply"* (Erudite case).
- Rosa's tribunal records show Dana's signature on the Order's night-duty contract (Candor case).
- Joan's tally: Dana was *born* Erudite; her name is on a "transferred" line (Abnegation).
- Mary mentions a Dauntless woman who collects the tin (Amity).

Any one of these is a clue; two make a case. `DV.Campaign.suspectScore('dana')` counts them. A wrong accusation has a cost in trust and a lost scene; a correct one is needed for OPEN AIR.

## 7. Technical contract for episodes

**Never invent your own save fields.** Use the framework.

```js
DV.Campaign.begin(f)                 // called once at the end of the first week / Stage Two; opens Act II
DV.Campaign.st()                     // the saved state: { started, faction, act, ep:{}, pieces:{}, clues:[], trust:{}, dead:[], saved, ending }
DV.Campaign.define(id, def)          // register an episode: { act, case, faction|null, title, chapter, needs(), day, time, summary }
DV.Campaign.start(epId, opts)        // fade to the episode's chapter; checkpoints resume it
DV.Campaign.complete(epId, outcome)  // marks it done, banner, and moves on: next episode, or back to your headquarters
DV.Campaign.next()                   // the id of the next available episode for this player, or null
DV.Campaign.give(pieceId, how)       // gain a piece (idempotent); how: 'kept' | 'handed' | 'given' (testimony only)
DV.Campaign.has(pieceId) / .count() / .proofCount()
DV.Campaign.clue(id, text, opts)     // log a clue to the Casebook (idempotent by id); opts.suspect: 'dana' etc. adds to suspectScore
DV.Campaign.trust(who, delta, why) / .trustOf(who)
DV.Campaign.kill(who, why)           // an ally dies (only as a stated consequence of a choice)
DV.Campaign.home()                   // back to the player's headquarters (free roam)
```

Episodes are **chapters** (`DV.Chapter.define`), with their own zones, exactly as `js/zones/week_candor.js` and `js/zones/week_erudite.js` do: read those first. A chapter has `start(Ch, zone, opts)`, a `step` per beat, `Ch.checkpoint(step)` at each beat, `Ch.interact(...)` for objects, `Ch.actor(...)` for people, `Ch.scene(tree)` for dialogue, `FW().talkTo(...)`, `FW().next(...)` to move between beats with a fade, and `Ch.banner(...)` at the end. Each episode defines its **quest** with `DV.QuestDB.add` (id `camp_<epid>`, type `main`, objectives with `target: {x, z}` in the episode's zone) and ends by calling `DV.Campaign.complete`.

Every episode ships with:

- its zone(s), its chapter, its dialogue trees (named `camp_<epid>_<what>`), its quest, in **one file** `js/zones/camp_<name>.js` (dialogue may be split into `js/data/dialogue/camp_<name>.js`);
- an entry in `index.html` (scripts after `js/game/campaign.js`);
- a QA test `tools/qa/camp-<name>.test.js` in the style of `build3-weeks.test.js` (a bot plays it start to finish with `B.use`, `QA.pick`, `L.until`, saves in the middle and reloads from the checkpoint) **and** a walking check in the style of `tools/qa/weeks-walk.test.js` (every person and object in every step can be walked to);
- a README paragraph in its report (the integrator writes the README).

Constraints: the art is the early-2000s PC RPG look; no authored assets; draw calls stay under 230 in the worst view; no random death; no model or tool names in code or commit messages; every beat is a checkpoint; a save in the middle of any episode loads back into the same beat.

## 8. What the opening of Act II looks like (so every episode starts the same way)

When the first week ends (the banner), `Campaign.begin(f)` activates the main quest *The Chalk Year*, sets `camp_started`, and (after the banner is dismissed) your mentor sends for you: *Rosa* (Candor), *Dr. Park* (Erudite), *Joan* (Abnegation), *Mary* (Amity), *Dana Cole* (Dauntless: the opening is Stage Two, then Dana). The sixth circle is on the board; you are given the case of your faction. The start of every case is an interaction at the headquarters (*Take the case*) and the chapter's own opening scene. When the case ends, `Campaign.complete` returns to the headquarters and the board offers the next episode (Act III onward are available in order, Day by Day; the clock moves to the right day).
