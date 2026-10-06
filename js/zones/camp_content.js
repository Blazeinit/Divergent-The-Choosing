/* ==========================================================================
   DIVERGENT — The Chalk Year: what happens in each episode
   Data for the engine in camp_episodes.js. Voices and facts: docs/CAMPAIGN.md.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const C = DV.CampEp;
  const K = () => DV.Campaign;
  const flag = (n) => !!DV.State.flag(n);
  const div = () => !!DV.State.data.aptitude.divergent;
  const R = (id) => K().episode(id);
  const E = (id, o) => C.episode(Object.assign({ id, title: R(id).title, day: R(id).day, time: R(id).time, summary: R(id).summary }, o));
  const bad = ['neutral'];

  /* ======================================================================== ACT II · DAUNTLESS */
  E('camp_d1', {
    where: 'THE OLD RAIL YARD · UNDER THE L',
    zone: { id: 'camp_yard', name: 'The Old Rail Yard', region: 'Sector 3, under the L', w: 36, d: 22, outdoor: true, sky: 'night', floor: 'gravel', edgeMat: 'brick', spawn: { x: 3, z: 11, rot: Math.PI / 2 },
      lamps: [[6, 3, 1], [30, 3, 1], [6, 19, 1], [30, 19, 1], [18, 11, 0.8]],
      props: [{ type: 'wall_block', x: 18, z: 1.6, w: 14, d: 2.4, h: 3.2, mat: 'metal_dark' }, { type: 'crate', x: 31, z: 18, size: 0.9 }, { type: 'crate', x: 32.2, z: 17.4, size: 0.8, stack: true }, { type: 'barrel', x: 4, z: 18 }, { type: 'chalk_circle', x: 22, z: 11, r: 1.4 }] },
    music: 'tense', start: 'Dana Cole has put you on the night patrol. The Order has asked for Dauntless at the sixth circle.',
    goal: 'Look over the scene with Bo and Tess before the Order arrives', goalAt: { x: 22, z: 11 },
    endGoal: 'Speak to the Lieutenant', done: 'You stood in the circle and came out with your own account of it.',
    hint: 'A body in a circle of chalk. Look it over before anyone else arrives.', banner: 'THE CHALK WAS DRY BEFORE THE BODY WAS COLD.',
    actors: {
      bo: { name: 'Bo Kaminski', faction: 'dauntless', sex: 'm', age: 23, x: 7, z: 9, rot: 1.2, talk: { intro: '[Bo has his hands in his jacket and his eyes on the sky. A drone is turning slowly over the L.] Dana says it is an honour, the night duty. She has said it twice. She never says anything twice.', opts: [
        { q: 'What did the Order tell you?', a: 'A murderer. Singular. [He nods at the yard.] I count three sets of boots in the gravel and a van that was here and gone before we were.', fx: { trust: [['bo', 1]] } },
        { q: 'Why is a faction of jumpers doing police work?', a: 'The Order asked. Dana said yes before they finished asking. We take the nights; they keep the days. Somebody decided that for us, and it was not a Dauntless somebody.', fx: { clue: ['night_duty_deal', 'Dauntless took the Order\'s night duty at Dana Cole\'s word, before the Order had finished asking.', 'dana'] } },
        { q: 'You scared?', a: 'Of dead people? No. Of how tidy this is? Yes.' }] } },
      tess: { name: 'Tess Navarro', faction: 'dauntless', sex: 'f', age: 21, x: 7, z: 13, rot: 1.9, talk: { intro: '[Tess keeps her torch low and her voice lower.] Don\'t step in the circle. Whatever else you do.', opts: [
        { q: 'Who is he?', a: 'No one has said. No wound. No bag. He is wearing a paper band like the ones the Testing Center hands out. [She does not touch it.]', fx: { clue: ['red_folder_names', 'The dead are people the Testing Center flagged: this one still wears a candidate band.'] } },
        { q: 'How long has he been here?', a: 'The ground under him is dry. Everything else is damp. You work it out; I would rather not.' }] } },
      body: { name: 'The dead man', faction: 'neutral', sex: 'm', age: 34, x: 22, z: 11, rot: 0, action: 'lie', seatY: 0.04 },
    },
    things: [
      { id: 'circle', name: 'The chalk circle', x: 22, z: 8.2, text: 'A ring, drawn in one careful sweep, exactly as wide as the five before it. The chalk is dry. The gravel inside the ring is damp from the rain that stopped at dusk. Whoever drew it did so long after the man stopped breathing, and without a hurry.', fx: { clue: ['chalk_dry', 'The chalk was dry before the body was cold: the circle was drawn long after he died.'] } },
      { id: 'body', name: 'The dead man', x: 19.8, z: 11, text: 'He looks asleep. No blood, no bruising, no sign of a fight. A grey paper band on the left wrist: SECTOR 4 · APTITUDE · ROOM 3. His pupils are pinned, and there is a faint sweetness on his breath that you have smelled somewhere before: a clinic corridor.', fx: { clue: ['red_folder_names', 'The dead are people the Testing Center flagged: this one still wears a candidate band.'] } },
      { id: 'tin', name: 'A tin in the gutter', x: 28, z: 13.6, text: 'A flat tin the size of a hand, stamped CAL. TEAM · ORDER STORES. Three sticks of chalk, one used down to a stub. It was not dropped. It was put down, the way you put down something you will be back for.', fx: { clue: ['chalk_tin', 'A tin of chalk stamped CAL. TEAM stands where the van was: the Order\'s own people draw the circles.'], flag: 'camp_d_saw_tin' } },
      { id: 'tracks', name: 'Tyre tracks', x: 30, z: 8, text: 'Two vans, one behind the other, backed up to the circle and gone before you came. The second set is deeper: it carried more. Perception tells you the first van did not leave a body. It took something away.', fx: { clue: ['two_vans', 'Two Order vans stood at the circle before the patrol arrived. One left with something.'] } },
    ],
    need: ['circle', 'body', 'tin', 'bo'],
    risk: { actor: { name: 'Lt. Corbin Dray', faction: 'erudite', sex: 'm', age: 41, seed: 'dray' }, from: [35, 11], to: [27, 11], area: [14, 6, 28, 16], speed: 1.2, delay: 2, warn: 'Headlights at the yard gate. The Order. Get away from the circle.', clearLine: 'Patrol. Thank you for waiting at the fence.',
      caught: { text: '[A tall man in a plain coat with a very good voice.] You are standing in a crime scene, initiate. Nobody blames you. It is only that the circle must stay as it was drawn.', q: 'I was looking for what happened.', a: 'And what did you find? [He smiles, and writes nothing down.]', fx: {} }, caughtFx: { trust: [['bo', -1, 'you were standing in the circle when the Order arrived']] } },
    finale: { x: 26, z: 11, actor: 'risk', label: 'Speak to the Lieutenant', name: 'Lt. Corbin Dray', speaker: 'Lt. Corbin Dray', faction: 'erudite',
      text: '[He has the look of a man who listens to everything and answers one thing in three.] Lieutenant Dray. Calibration Team: we help with the paperwork. You are the transfer. Dana speaks well of you. [He nods at the circle.] Did you see anything before we arrived?',
      options: [
        { q: '"Nothing. We got here a minute ago."', fx: { flag: 'camp_dray_lied', trust: [['bo', 1, 'you covered for the patrol']], out: 'lied' } },
        { q: '"The chalk was dry before the body was cold. Somebody drew it after."', fx: { flag: 'camp_dray_truth', clue: ['dray_heard', 'I told Lt. Dray the chalk was dry. He thanked me and did not write it down.'], trust: [['bo', -1, 'you told the Order what you saw']], out: 'truth' } },
        { q: 'Say nothing, and look at the circle.', fx: { out: 'silent' } }] },
  });

  E('camp_d2', {
    where: 'THE LEADER\'S OFFICE · THE COMPOUND',
    zone: { id: 'camp_office', name: 'Dana Cole\'s Office', region: 'Dauntless compound', w: 14, d: 10, floor: 'carpet_dark', wall: 'concrete_dark', ceiling: 'ceiling_concrete', amb: [0.3, 0.3, 0.32], spawn: { x: 7, z: 8.4, rot: Math.PI },
      props: [{ type: 'desk', x: 7, z: 2.4, w: 2.2, d: 0.9, wood: true }, { type: 'filing_cabinet', x: 12.5, z: 2.2, rotDeg: -90, n: 3 }, { type: 'file_shelf', x: 1, z: 3.6, rotDeg: 90, len: 3 }, { type: 'rug', x: 7, z: 5.2, w: 4, d: 2.4, mat: 'carpet_dark' }] },
    music: 'tense', start: 'The night log is in Dana\'s desk. Mark has agreed to look the other way for ten minutes.',
    goal: 'Find the night-duty log in Dana\'s office', goalAt: { x: 7, z: 3.2 }, endGoal: 'Decide what to do with the log', done: 'You went into Dana Cole\'s desk and came out with a decision.',
    hint: 'Dana is at dinner. You have ten minutes. Mark is by the door.', banner: 'SOMEBODY SIGNS THE NIGHT LOG.',
    actors: {
      mark: { name: 'Mark Rivera', faction: 'dauntless', sex: 'm', age: 21, x: 3.4, z: 7.2, rot: 2.6, talk: { intro: '[Mark keeps one eye on the door.] Ten minutes. If she comes back early I never saw you, and you never saw me. That is the whole arrangement.', opts: [
        { q: 'Why are you helping me?', a: 'Because I finished first in my year and I have never once been asked what I thought about the cut. [A short breath.] And because I read the last two night logs. Somebody signs them in her pen.', fx: { trust: [['mark', 1]] } },
        { q: 'Does Dana ask about me?', if: () => K().trustOf('mark') >= 2, a: 'Where you go in the evenings. Who you eat with. Whether you speak to the Erudite initiates. She asks it like a friend would. [He does not smile.]', fx: { clue: ['mark_dana', 'Mark says Dana asks where I go in the evenings, and who I speak to.', 'dana'] } },
        { q: 'What happens if she finds us?', a: 'You are cut. I am a very good instructor of nobody.' }] } },
    },
    things: [
      { id: 'desk', name: 'The night-duty log', x: 7, z: 3.5, text: 'A black ledger: DATE · SECTOR · CALLED BY · RELEASED TO. The last six entries are the circles. Under CALLED BY, in a small upright hand: D.C. Under RELEASED TO, the same words every time: CAL. TEAM. The pen is a good one, green ink. It is lying on the blotter.', fx: { clue: ['night_log_dc', 'The night-duty log is initialled D.C. beside every circle: Dana Cole called each one in.', 'dana'], flag: 'camp_d_found_log' } },
      { id: 'cabinet', name: 'The contract drawer', x: 11.6, z: 3.2, text: 'The Order\'s night-duty contract, stamped by the Directorate and signed in two places: for the Order, Lt. C. Dray; for Dauntless, D. Cole. It runs for a year and has a clause that says Dauntless will not discuss "calibration activity" with anyone outside the contract.', fx: { clue: ['contract_dc', 'The Order\'s night-duty contract carries Dana Cole\'s signature and a gag clause about "calibration activity".', 'dana'] } },
      { id: 'shelf', name: 'The requisitions', x: 2.2, z: 3.6, text: 'A neat run of forms: chalk, torches, ten drums of something "for Stage Two", a cold store at the Erudite end of the compound. Every one countersigned by the Directorate\'s liaison. The liaison is not named. A line is left blank, as if the name was too well known to need writing.', fx: { clue: ['stage_two_drums', 'Stage Two\'s drums come from the Directorate through a liaison whose name is left blank.'] } },
    ],
    need: ['desk', 'cabinet', 'mark'],
    risk: { actor: { name: 'Dana Cole', faction: 'dauntless', sex: 'f', age: 34, seed: 'dana' }, from: [7, 9.5], to: [7, 5.6], area: [0.5, 0.5, 13.5, 4.6], speed: 1.4, delay: 2, warn: 'Steps in the corridor. Dana. Get away from the desk.', clearLine: 'Mark. Still here? Good. I have been looking for my pen.',
      caught: { text: '[Dana stops in the doorway, pleasantly.] Initiate. Looking for something? [She looks at the open drawer, and then at you. She smiles like she is grading you.]', q: 'I was looking for Mark.', a: 'He is behind you. [She waits a moment too long.] Run along.', fx: {} }, caughtFx: { trust: [['mark', -1, 'Dana found you at her desk']], flag: 'camp_dana_suspects' } },
    finale: { x: 3.4, z: 7.2, actor: 'mark', label: 'Tell Mark what you will do with it', name: 'Mark Rivera', speaker: 'Mark Rivera', faction: 'dauntless',
      text: '[Mark has the log in his hands. He does not open it.] It is evidence of something. I do not know what. You can carry it. I can carry it. Or it can go back, and we both go to bed.',
      options: [
        { q: 'I\'ll take it.', fx: { give: ['chalk', 'kept'], flag: 'camp_d_kept', trust: [['mark', 0]], out: 'kept' } },
        { q: 'You keep it, Mark: you are the one who can read what it means.', fx: { give: ['chalk', 'handed'], flag: 'camp_d_handed', trust: [['mark', 1]], out: 'handed' } },
        { q: 'Put it back. Nobody was here.', fx: { flag: 'camp_d_put_back', trust: [['mark', 1]], out: 'put_back' } }] },
  });

  /* ======================================================================== ACT II · CANDOR */
  E('camp_c1', {
    where: 'A BOARDING HOUSE · SECTOR 3',
    zone: { id: 'camp_tenement', name: 'The Boarding House', region: 'Sector 3', w: 18, d: 10, floor: 'wood', wall: 'paint_warm', ceiling: 'paint_white', amb: [0.3, 0.28, 0.26], lightColor: [1, 0.86, 0.62], intensity: 0.75, fixture: 'bulb', spawn: { x: 9, z: 8.4, rot: Math.PI },
      props: [{ type: 'bed', x: 3, z: 1.8, rotDeg: 0 }, { type: 'bed', x: 8, z: 1.8, rotDeg: 0 }, { type: 'bed', x: 13, z: 1.8, rotDeg: 0 }, { type: 'table', x: 9, z: 6.2, w: 1.8, d: 0.9, chairs: 2, top: 'wood' }, { type: 'shelf', x: 16.6, z: 6, rotDeg: -90, len: 2, h: 1.8, d: 0.35, levels: 3 }] },
    start: 'Dale Hollis stole medicine for a sister nobody had heard of. Rosa wants her found, and she wants you to do it.',
    goal: 'Find where Dale Hollis\'s sister lives', goalAt: { x: 9, z: 6 }, endGoal: 'Speak to Marta Hollis', done: 'You found Marta Hollis, and she agreed to speak.',
    hint: 'A boarding house on the Candor side of Sector 3. One of these doors is a Hollis.', banner: 'SHE WAS NOT HIDING. SHE WAS WAITING.',
    actors: {
      odette: { name: 'Odette Marsh', faction: 'candor', sex: 'f', age: 58, x: 5.6, z: 6, rot: 0.6, talk: { intro: '[A landlady in a cardigan that has seen better years.] If you are from the tribunal, I did not cause it. If you are from the Order, I have not seen anyone. If you are neither, I will tell you the rent.', opts: [
        { q: 'I am looking for someone called Marta Hollis.', a: 'No Hollis here. [She looks at the third bed.] There is a Marta Sloane in the back who pays on time and never goes out. Her brother brings groceries. Tall, tired, takes his hat off to the cat.', fx: { clue: ['marta_alias', 'Marta Hollis lives under the name Marta Sloane in the back of a boarding house in Sector 3.'] } },
        { q: 'Has the Order been?', a: 'Twice. Polite. Plain coats. They asked if "the quiet one" was still in. I said I did not know. I have always been a poor liar and they went away.', fx: { clue: ['order_asked', 'The Order came twice asking for "the quiet one" at the boarding house.'] } }] } },
      ned: { name: 'Ned Sloane', faction: 'candor', sex: 'm', age: 50, x: 14.2, z: 7.6, rot: -1.6, talk: { intro: '[A neighbour who wants to be asked.] I know everything about this house. Nobody ever asks.', opts: [
        { q: 'What does the woman in the back take for her trouble?', a: 'Bottles. Little brown ones with a paper cross on them. She sleeps for a day after, wakes up and cannot say her sister\'s name, then can. Poor soul.', fx: { clue: ['marta_bottles', 'Marta takes small brown bottles after which she cannot say names for a day.'] } },
        { q: 'Did she ever say where she was before?', a: 'Once. "The room with the white walls." Never again.' }] } },
      marta: { name: 'Marta Hollis', faction: 'candor', sex: 'f', age: 34, x: 13, z: 4.4, rot: 3, talk: { intro: '[A thin woman with her brother\'s eyes, wrapped in a grey cardigan, watching your hands.] You are the one Dale told. He said there would be a young one with a badge who cannot lie well and does not lie often.', opts: [
        { q: 'I am sorry about the crate.', a: 'He is the best thing in the family and it has made him a thief. [A pause.] Ask what you came to ask.', fx: { trust: [['marta', 1], ['dale', 1]] } },
        { q: 'What happened to you?', a: 'I tested strange. A woman wrote it down by hand instead of in the book. Three weeks later a man in a good coat asked me to sit in a white room for a "calibration". They gave me something to drink. The others in the room did not wake up.', fx: { clue: ['marta_room', 'Marta sat in a white calibration room. The others who drank did not wake up.'], flag: 'camp_marta_told' } }] } },
    },
    things: [
      { id: 'mail', name: 'The letter slots', x: 9, z: 9.5, text: 'Five slots with brass numbers. Number 4 has two names on a card: M. HOLLIS, struck through in pencil, and under it, in careful capitals, M. SLOANE. Somebody wanted to be hard to find, and not very hard.', fx: { clue: ['marta_alias', 'Marta Hollis lives under the name Marta Sloane in the back of a boarding house in Sector 3.'] } },
      { id: 'bottles', name: 'The brown bottles', x: 3, z: 3.6, text: 'A tray of little brown bottles on the washstand, each with a paper cross and a stamp: ERUDITE DISPENSARY · W/D · SERIES 7. Withdrawal. Somebody is being weaned off a thing that was not meant to be taken for long.', fx: { clue: ['series7_wd', 'The bottles are labelled "W/D · SERIES 7": withdrawal from a serum.'], flag: 'camp_c_saw_bottles' } },
      { id: 'letters', name: 'Dale\'s letters', x: 9, z: 5.2, text: 'A bundle tied with a bootlace. Every one begins "Tilly is better" or "Tilly is worse". There is no Tilly. Tilly is the name they use for her, so that the postman does not learn it. The last letter says: "They are asking about the Hollis name again. Move on the first."', fx: { clue: ['tilly_code', '"Tilly" is Dale\'s code for his sister; the last letter says the Order is asking about the Hollis name.'] } },
    ],
    need: ['mail', 'bottles', 'odette'],
    finale: { x: 13, z: 4.4, actor: 'marta', label: 'Ask Marta to give her statement', name: 'Marta Hollis', speaker: 'Marta Hollis', faction: 'candor',
      text: '[She folds her hands.] I will tell it once. I will tell it to the people who are bound to write down all of it. Not to the Order and not to the Directorate. Take me to Rosa, and the tribunal.',
      options: [
        { q: 'We\'ll go openly, by the front door, in daylight.', fx: { trust: [['marta', 1], ['rosa', 1, 'you brought a witness in by the front door']], flag: 'camp_c_openly', out: 'open' } },
        { q: 'We\'ll go at night, the back way. Nobody follows.', fx: { trust: [['marta', 2], ['rosa', -1, 'you smuggled a witness into the tribunal']], flag: 'camp_c_secretly', out: 'secret' } }] },
  });

  E('camp_c2', {
    where: 'THE TRIBUNAL ROOM · CANDOR HEADQUARTERS',
    zone: { id: 'camp_tribunal', name: 'The Tribunal', region: 'Candor headquarters', w: 18, d: 12, floor: 'marble_check', wall: 'paint_white', ceiling: 'paint_white', amb: [0.46, 0.46, 0.46], spawn: { x: 9, z: 10.4, rot: Math.PI },
      props: [{ type: 'table', x: 9, z: 3.2, w: 4.4, d: 1.1, chairs: 0, top: 'black' }, { type: 'bench', x: 4.5, z: 7.4, len: 3, seatable: false }, { type: 'bench', x: 13.5, z: 7.4, len: 3, seatable: false }, { type: 'floor_emblem', x: 9, z: 7.4, size: 2.4 }] },
    start: 'Marta Hollis will give her statement to the tribunal and to no one else. The tribunal has its seal on more than her statement.',
    goal: 'Read what the tribunal holds about the Order\'s contract', goalAt: { x: 9, z: 3 }, endGoal: 'Decide who keeps the statement', done: 'The statement was given, and it was sealed.',
    hint: 'A room built for the truth. Marta waits on the bench. Rosa is at the table.', banner: 'THE SEAL IS ON THE WRONG PAPER.',
    actors: {
      rosa: { name: 'Rosa Medina', faction: 'candor', sex: 'f', age: 45, x: 9, z: 5.2, rot: 0, talk: { intro: '[Rosa does not look up from the table.] The tribunal records everything. That is its purpose and its fault. Say what you have to say.', opts: [
        { q: 'Whose seal is that on the Order\'s contract?', a: 'Ours. The tribunal stamps any contract a faction asks it to witness: we do not read them. [Her jaw sets.] I read this one this morning. I did not like what I read.', fx: { trust: [['rosa', 1]] } },
        { q: 'Will you protect her?', a: 'I will protect what she says. That is different, and you know the difference. [She looks at you for a long moment.] I will do what I can for the woman.', fx: { trust: [['rosa', 1]] } }] } },
      marta: { name: 'Marta Hollis', faction: 'candor', sex: 'f', age: 34, x: 13.5, z: 8.6, rot: 3.6 },
      louise: { name: 'Louise Pratt', faction: 'candor', sex: 'f', age: 50, x: 3.6, z: 4.4, rot: 0.8, talk: { intro: '[The clerk\'s pen never stops.] Do not read the order book, do not breathe on the order book, and if you read it, I did not see you.', opts: [
        { q: 'Who signed the night-duty contract for Dauntless?', a: 'D. Cole. Five weeks ago, in the presence of a Directorate liaison and the Lieutenant. I wrote it down myself.', fx: { clue: ['clerk_dc', 'The tribunal clerk witnessed Dana Cole sign the night-duty contract five weeks ago.', 'dana'] } }] } },
    },
    things: [
      { id: 'seal', name: 'The tribunal seal', x: 9, z: 2.6, text: 'The tribunal\'s seal in black wax on a two-page contract: ORDER NIGHT-DUTY AGREEMENT. For the Order, Lt. C. Dray. For Dauntless, D. Cole. Nobody at the tribunal was asked to read it. The seal went on, as it goes on to every paper brought to it.', fx: { clue: ['rosa_seal', 'The tribunal seal is on the Order\'s night-duty contract; D. Cole signed for Dauntless.', 'dana'] } },
      { id: 'ledger', name: 'The Hollis ledger', x: 5.2, z: 3.4, text: 'The dispensary ledger from the Hollis case, the one Dale\'s crate was taken from. Beside the stolen line, in another hand: "Replacement lot 33. Authorised: A. P." A. P. is on every second page. Pierce signs for medicine that does not exist.', fx: { clue: ['lot33_ledger', 'The dispensary ledger shows "lot 33" replacement stock authorised by A. P.: Pierce.'] } },
      { id: 'statement', name: 'The sealed statement', x: 13.6, z: 7.2, text: 'Four pages in Marta\'s writing, very straight. The white room. The drink. The woman beside her, whose name she knew for a day. "I was told I was a gift," she writes. "I was told the others were a cost." At the bottom, the date and a line: "Read in the presence of Rosa Medina."', fx: { flag: 'camp_c_read_statement' } },
    ],
    need: ['seal', 'ledger', 'statement', 'rosa'],
    risk: { actor: { name: 'Officer Hale', faction: 'erudite', sex: 'm', age: 38, seed: 'hale-order' }, from: [9, 11.6], to: [12.6, 9.4], area: [10.5, 5.6, 17.5, 11], speed: 1.2, delay: 2, warn: 'An Order officer at the tribunal door, asking for Marta. Stay clear of her bench.', clearLine: 'The tribunal is closed to the Order. Good day, Officer.',
      caught: { text: '[The officer is courteous.] The Lieutenant would like a word with the witness. For her safety.', q: 'She is under the tribunal\'s protection.', a: 'Of course. [He looks at you for a moment longer than he should.] I will tell him so.', fx: {} }, caughtFx: { trust: [['marta', -1, 'the Order found her through you']] } },
    finale: { x: 9, z: 5.2, actor: 'rosa', label: 'Tell Rosa who should keep the statement', name: 'Rosa Medina', speaker: 'Rosa Medina', faction: 'candor',
      text: '[Rosa holds out a hand for the statement, and waits.] The tribunal keeps it. Once it is sealed, nobody may change it, or burn it, or lie about it. That is why it is safe. That is also why you may not like it.',
      options: [
        { q: 'The tribunal keeps it.', fx: { give: ['ledger', 'handed'], flag: 'camp_c_handed', trust: [['rosa', 1]], out: 'handed' } },
        { q: 'I will keep a copy myself, Rosa. In case.', fx: { give: ['ledger', 'kept'], flag: 'camp_c_kept', trust: [['rosa', -1, 'you kept a copy of a sealed statement']], out: 'kept' } }] },
  });

  /* ======================================================================== ACT II · ERUDITE */
  E('camp_e1', {
    where: 'THE DIRECTORATE ARCHIVE · LOWER LEVELS',
    zone: { id: 'camp_archive', name: 'The Archive', region: 'Erudite headquarters, lower levels', w: 20, d: 12, floor: 'tile_floor', wall: 'paint_white', ceiling: 'ceiling_tile', amb: [0.34, 0.35, 0.4], lightColor: [0.92, 0.96, 1], spawn: { x: 3, z: 10.4, rot: Math.PI },
      props: [{ type: 'file_shelf', x: 4, z: 2.4, len: 4 }, { type: 'file_shelf', x: 10, z: 2.4, len: 4 }, { type: 'file_shelf', x: 16, z: 2.4, len: 4 }, { type: 'file_shelf', x: 6.5, z: 5.6, len: 4 }, { type: 'file_shelf', x: 13.5, z: 5.6, len: 4 }, { type: 'table', x: 10, z: 9.6, w: 1.8, d: 0.8, chairs: 0, top: 'metal' }] },
    start: 'Dr. Park wants her calibration notes checked before the Directorate sees them. They are in a records cage, three floors down.',
    goal: 'Get the calibration notes out of the records cage', goalAt: { x: 17, z: 10.2 }, endGoal: 'Take the notes to Dr. Park', done: 'You got the notes out without anyone noticing, or noticing enough.',
    hint: 'Dr. Park gave you her key. The cage is at the far end, past the stacks.', banner: 'LOT THIRTY-THREE.',
    actors: {
      park: { name: 'Dr. Helen Park', faction: 'erudite', sex: 'f', age: 52, x: 3, z: 8.4, rot: 0.5, talk: { intro: '[Dr. Park speaks very quietly, and does not look at the cage.] The key is the Directorate\'s, so the log will show someone used it. If the log shows my name there is no harm: I have the right. If it shows yours, there is.', opts: [
        { q: 'What are the notes?', a: 'A calibration run. Series 7. It is not what I thought I was measuring. I would like someone else to read the numbers and tell me I am wrong.', fx: { trust: [['park', 1]] } },
        { q: 'Why me?', a: 'Because you are the only person in the building who has been in the red folder and is still in the building. That is a qualification of a kind.', if: () => flag('read_red_folder') } ] } },
      voss: { name: 'Mr. Voss', faction: 'erudite', sex: 'm', age: 61, x: 10, z: 8.4, rot: 3.1, talk: { intro: '[The archivist squints over his spectacles.] The rule is simple. Nothing leaves. Nothing enters. Everything is logged. Which of those do you wish to break?', opts: [
        { q: 'Who comes here after nine at night?', a: 'The cleaner. The Lieutenant, with the key to the calibration shelves. And the Dauntless liaison, twice a week, to sign for deliveries.', fx: { clue: ['voss_liaison', 'The archivist says a Dauntless liaison visits the Directorate archive twice a week to sign for deliveries.', 'dana'] } },
        { q: 'I am here for Dr. Park.', a: 'Dr. Park is always here for Dr. Park. [He relaxes a little.] The cage, then. Mind the log.', fx: {} }] } },
    },
    things: [
      { id: 'stacks', name: 'The calibration shelf', x: 9.6, z: 3.8, text: 'Binders marked SERIES 7 in a neat run. Lot 31, lot 32. A gap. Lot 33 has been removed from the shelf and recorded as "returned to source". The dosing sheet in the binder next to it has a line inked over three times: "raise to 3x until response." The response column is blank for every Divergent subject; the others have a number.', fx: { clue: ['lot33_dose', 'The dose was raised to three times standard "until response": the response column is blank for the Divergent.'] } },
      { id: 'cage', name: 'The records cage', x: 17, z: 10.2, text: 'Park\'s notes, in her small hand. A table of subject codes. A paragraph that ends: "Lot 33 produced no tolerance in subjects with the A-pattern and fatal sedation in four of nine. Recommend withdrawal. D.C. advises proceeding: Dauntless liaison, Series 7 supply, authorised to request further lots." The paper is warm: someone used it today.', fx: { clue: [['lot33_note', 'Dr. Park\'s notes: lot 33 was fatal in four of nine subjects; the recommendation to withdraw it was overruled.'], ['park_dc', 'Park\'s notes name "D.C., Dauntless liaison, Series 7 supply".', 'dana']] } },
      { id: 'log', name: 'The archive log', x: 10, z: 10.4, text: 'A ledger on a chain. KEY · TIME · NAME. The last line says: "17: 21:07: H. PARK". Under it a blank line waiting for you. You take the pen, and for a long moment you think of writing nothing.', fx: { flag: 'camp_e_saw_log' } },
    ],
    need: ['stacks', 'cage', 'voss'],
    risk: { actor: { name: 'Greta Lund', faction: 'erudite', sex: 'f', age: 33, seed: 'greta-lund' }, from: [19, 4], to: [14.6, 10.4], area: [11.5, 8.6, 19.6, 11.6], speed: 1.2, delay: 2, warn: 'A clerk is making her rounds toward the cage. Step away from it.', clearLine: 'The cage is quiet. Mr. Voss, the log is in order.',
      caught: { text: '[A clerk with a clipboard and a pleasant face.] This cage is Dr. Park\'s. May I see your authorisation?', q: 'Dr. Park sent me for a book.', a: 'Of course. I will put your name in the log. For her records. [She does.]', fx: {} }, caughtFx: { trust: [['park', -1, 'your name is in the archive log']] } },
    finale: { x: 3, z: 8.4, actor: 'park', label: 'Bring Dr. Park the notes', name: 'Dr. Helen Park', speaker: 'Dr. Helen Park', faction: 'erudite',
      text: '[She reads one page, and puts a hand over her mouth.] Four of nine. I wrote "four of nine" myself and I have never read it aloud. [She looks up.] What do you want to do with them?',
      options: [
        { q: 'Copy them. You keep the originals.', fx: { flag: 'camp_e_copied', trust: [['park', 1]], out: 'copied' } },
        { q: 'I\'ll keep them, Dr. Park. Somebody has to.', fx: { flag: 'camp_e_took_notes', trust: [['park', -1, 'you took her notes']], out: 'took' } },
        { q: 'Put them back. You are not safe if they are missing.', fx: { trust: [['park', 1]], out: 'back' } }] },
  });

  E('camp_e2', {
    where: 'ROOM THREE · THE DIRECTORATE',
    zone: { id: 'camp_calibration', name: 'Room Three', region: 'The Directorate', w: 14, d: 10, floor: 'tile_floor', wall: 'paint_white', ceiling: 'ceiling_tile', amb: [0.4, 0.42, 0.46], lightColor: [0.9, 0.96, 1], intensity: 0.9, spawn: { x: 7, z: 8.6, rot: Math.PI },
      props: [{ type: 'bed', x: 3.4, z: 2.2, rotDeg: 0 }, { type: 'bed', x: 7, z: 2.2, rotDeg: 0 }, { type: 'monitor_wall', x: 11.2, z: 0.6, n: 3 }, { type: 'table', x: 11.2, z: 6.2, w: 1.8, d: 0.8, chairs: 0, top: 'metal' }, { type: 'filing_cabinet', x: 1, z: 6, rotDeg: 90, n: 3 }] },
    music: 'tense', start: 'The notes are one thing. The room they describe is another. Dr. Pierce has a key and an appointment, and so do you.',
    goal: 'See what Room Three is for', goalAt: { x: 7, z: 2.8 }, endGoal: 'Decide what to do with the notes', done: 'You saw Room Three.',
    hint: 'The room in the notes. White walls, two cots, a monitor wall. Someone is lying very still.', banner: 'A GIFT, AND A COST.',
    actors: {
      ana: { name: 'Ana Reyes', faction: 'neutral', sex: 'f', age: 29, x: 7, z: 3.8, rot: 3.1, talk: { intro: '[She is awake. She has been awake a long time.] They are kind. That is the strange thing. They bring tea, and they say sorry, and then they write the number down.', opts: [
        { q: 'What do they give you?', a: 'A drink, in a paper cup. First day it does nothing. Second day I stop wanting to say no. Third day I want to say yes to everything. They say I am responding very well. [Her hand shakes.] The man in the next cot did not respond. They took him out on a trolley.', fx: { clue: ['ana_room', 'Ana Reyes: the drink makes you stop wanting to say no. The man in the next cot "did not respond" and was taken out.'] } },
        { q: 'Can you walk?', a: 'To the end of the corridor. Further, if somebody lets the door stay open.', fx: { trust: [] } }] } },
      park: { name: 'Dr. Helen Park', faction: 'erudite', sex: 'f', age: 52, x: 1.8, z: 8.4, rot: 0.5, talk: { intro: '[She is very pale and standing very straight.] I followed you in. I should not have. I wrote the numbers that put these people in this room, and I have never seen it.', opts: [{ q: 'Are you all right?', a: 'No. [A breath.] Ask me later.', fx: { trust: [['park', 1]] } }] } },
    },
    things: [
      { id: 'monitor', name: 'The monitor wall', x: 11.2, z: 2.2, text: () => 'Three screens of green: heart, breath, a flat trace labelled RESPONSE. The code on the centre screen is a subject list. ' + (div() ? 'The third name down is yours, and next to it the word PENDING, and a time that is tomorrow.' : 'The names are strangers. The fourth is a girl from the Testing Center waiting room; you remember her coat.'), fx: { clue: ['red_folder_names', 'The dead are people the Testing Center flagged: this one still wears a candidate band.'], flag: 'camp_e_saw_monitor' } },
      { id: 'chart', name: 'The dosing chart', x: 11.2, z: 5.2, text: 'A chart on a clipboard. Standard dose, then a heavier one, then a note in a fine hand: "3x for A-pattern. Subjects 2 and 5 failed to sedate. Increase." A second hand has written, smaller: "this is wrong." It has been scratched out.', fx: { clue: ['lot33_dose', 'The dose was raised to three times standard "until response": the response column is blank for the Divergent.'] } },
      { id: 'names', name: 'The subject book', x: 1.8, z: 6, text: 'A book of names with dates. The same names, in the same order, appear in a different book you have seen: the red folder. Each has a line: ALIVE · TRANSFERRED · NOT RECOVERED. The last category is the longest. Six circles; six lines; the seventh name is already written, in pencil.', fx: { clue: ['red_folder_names', 'The dead are people the Testing Center flagged: this one still wears a candidate band.'] } },
    ],
    need: ['monitor', 'chart', 'ana'],
    risk: { actor: { name: 'Dr. Alan Pierce', faction: 'erudite', sex: 'm', age: 48, seed: 'pierce-risk' }, from: [7, 9.6], to: [7, 6.4], area: [0.5, 0.5, 13.5, 5], speed: 1.1, delay: 2, warn: 'Dr. Pierce is at the door. Get away from the cots and the monitor.', clearLine: 'Ms. Reyes. Comfortable? Good. [He writes a number on a clipboard and leaves.]',
      caught: { text: '[Dr. Pierce does not raise his voice.] This is a restricted room. You are not on the list, and I would very much like to understand why you are in it.', q: 'I was looking for Dr. Park.', a: 'Dr. Park is not authorised here either. [He looks at your hands.] I am sure she will tell me she sent you.', fx: {} }, caughtFx: { trust: [['park', -1, 'Pierce knows you were in Room Three']], flag: 'camp_pierce_suspects' } },
    finale: { x: 1.8, z: 8.4, actor: 'park', label: 'Show Dr. Park what you found', name: 'Dr. Helen Park', speaker: 'Dr. Helen Park', faction: 'erudite',
      text: '[Her voice is steady, and that is worse.] I have to choose now whether I am a person who says this out loud. The notes can be mine, as testimony. Or they can be yours, as proof, and I can be someone who did not give them to you.',
      options: [
        { q: 'You keep them, Dr. Park. You are the one who can explain them.', fx: { give: ['lot33', 'handed'], flag: 'camp_e_handed', trust: [['park', 1]], out: 'handed' } },
        { q: 'I\'ll take them. You never gave them to me.', fx: { give: ['lot33', 'kept'], flag: 'camp_e_kept', trust: [['park', 0]], out: 'kept' } }] },
  });

  /* ======================================================================== ACT II · ABNEGATION */
  E('camp_a1', {
    where: 'JOAN\'S CELLAR · THE GREY STREET',
    zone: { id: 'camp_cellar', name: 'The Cellar', region: 'Abnegation sector', w: 10, d: 8, floor: 'concrete', wall: 'concrete', ceiling: 'ceiling_concrete', amb: [0.22, 0.22, 0.24], lightColor: [1, 0.84, 0.6], intensity: 0.7, fixture: 'bulb', spawn: { x: 5, z: 6.6, rot: Math.PI },
      props: [{ type: 'table', x: 5, z: 3.4, w: 2.4, d: 1.0, chairs: 2, top: 'wood' }, { type: 'shelf', x: 9.4, z: 3.4, rotDeg: -90, len: 3, h: 1.8, d: 0.35, levels: 3 }, { type: 'crate', x: 1, z: 1.2, size: 0.8 }, { type: 'crate', x: 1.9, z: 1.5, size: 0.7 }, { type: 'barrel', x: 8.8, z: 1 }] },
    start: 'Joan has a list of forty names, a cellar to keep it in and a plan that needs another pair of hands.',
    goal: 'Read Joan\'s list', goalAt: { x: 5, z: 3.4 }, endGoal: 'Decide how to carry it', done: 'You read Joan\'s tally and agreed what to do with it.',
    hint: 'Through the back of the kitchen and down. Joan is waiting by the stove.', banner: 'FORTY NAMES.',
    actors: {
      joan: { name: 'Elder Joan Hayes', faction: 'abnegation', sex: 'f', age: 66, x: 2.6, z: 5.4, rot: 0.6, talk: { intro: '[Joan does not sit. Joan never sits when there is work.] I will tell you three things and I will not tell you a fourth. They are collecting people who test strange. They have a list of their own. This is mine.', opts: [
        { q: 'What is the list?', a: 'Forty names. A tick where we have moved them. A cross where we were late. [She meets your eyes.] The crosses are the circles.', fx: { trust: [['joan', 1]] } },
        { q: 'Why not go to the council?', a: 'Because the council meets in public and Erudite reads the minutes. Aaron will hear it, because he is my brother-in-law and does not know yet that I am asking him. [A faint dry smile.]', fx: { clue: ['abn_council', 'Joan will not go to the council: Erudite reads the minutes.'] } }] } },
      aaron: { name: 'Aaron Hayes', faction: 'abnegation', sex: 'm', age: 68, x: 6.5, z: 5.4, rot: -0.6, when: () => true, talk: { intro: '[A council member in a grey coat, very still.] Joan has told me nothing and I have understood all of it. Ask me one thing.', opts: [
        { q: 'Will the council hear this?', a: 'The council will hear what it can bear. Some of them will listen with their hearts. The ones who vote, with their coats on. [A long breath.] I will ask.', fx: { trust: [['aaron', 1]] } },
        { q: 'Who on the council is with Erudite?', a: 'Three. One knowingly. I will not say who.', fx: { clue: ['abn_three', 'Three of the council are with Erudite; one knowingly.'] } }] } },
    },
    things: [
      { id: 'list', name: 'Joan\'s tally', x: 5, z: 3.4, text: 'Forty names in a plain hand, in two columns. Ticks in blue pencil; crosses in black. Beside twenty-three of the names, the same small note: "Sector 4 · manual". The red folder has the same manual entries. You do not need to see the red folder to know it.', fx: { clue: ['tally_names', 'Joan\'s forty names match the Testing Center\'s "manual" results: the dead are the flagged.'], flag: 'camp_a_read_list' } },
      { id: 'transfers', name: 'The book of transfers', x: 9, z: 4.4, text: 'A faction ledger of anyone who changed faction in the last ten years, with whom they spoke and who signed. Under the Dauntless pages, a line: "Cole, D. · b. Erudite · transferred Dauntless · reference: Directorate (O. Vance)". The reference is underlined in pencil, twice.', fx: { clue: ['joan_born', 'Dana Cole was born Erudite and transferred to Dauntless on a Directorate reference signed O. Vance.', 'dana'] } },
      { id: 'map', name: 'A map of doors', x: 1.2, z: 3.6, text: 'A hand-drawn map of the grey streets with a pencilled door in each block: the places that will take a family in for a night. Eleven doors. Nine are ticked. Two have a small black mark: the Pells and the Rowes. "Late, if the Order comes before Thursday."', fx: { flag: 'camp_a_saw_map' } },
    ],
    need: ['list', 'transfers', 'joan'],
    risk: { actor: { name: 'Aaron Hayes', faction: 'abnegation', sex: 'm', age: 68, seed: 'aaron-risk' }, from: [5, 7.6], to: [6.5, 5.4], area: [0.5, 0.5, 9.5, 4.6], speed: 1.0, delay: 1, warn: 'Someone on the stairs: Aaron. Step away from the table.', clearLine: '[He nods, as if he has seen nothing and understood everything.]',
      caught: { text: '[Aaron stops at the foot of the stairs.] I should not have come down. And you should not be standing like that, with her book open.', q: 'Joan trusts you.', a: 'Joan trusts everyone. It is her one fault. [He takes off his glasses and rubs his eyes.]', fx: {} }, caughtFx: { trust: [['aaron', -1, 'he found you with the book open']] } },
    finale: { x: 6.5, z: 5.4, actor: 'risk', label: 'Ask Aaron for his help', name: 'Aaron Hayes', speaker: 'Aaron Hayes', faction: 'abnegation',
      text: '[Aaron looks at the list, and then at Joan, and then at his own hands.] I can carry this to the council. I can say nothing. I can look away. Which is most use to her?',
      options: [
        { q: 'Carry it to the council, quietly.', fx: { trust: [['aaron', 1], ['joan', -1, 'you asked Aaron to carry the list to the council']], flag: 'camp_a_council', out: 'council' } },
        { q: 'Look away. That is all we need.', fx: { trust: [['aaron', 1], ['joan', 1]], flag: 'camp_a_looked_away', out: 'away' } },
        { q: 'Tell nobody. The fewer who know, the fewer who can tell.', fx: { trust: [['joan', 1]], flag: 'camp_a_nobody', out: 'nobody' } }] },
  });

  E('camp_a2', {
    where: 'THE GREY STREET · BEFORE CURFEW',
    zone: { id: 'camp_grey', name: 'The Grey Street', region: 'Abnegation sector', w: 40, d: 12, outdoor: true, sky: 'night', floor: 'asphalt', edgeMat: 'brick', spawn: { x: 3, z: 6, rot: Math.PI / 2 },
      lamps: [[8, 1.8, 1], [22, 1.8, 1], [36, 1.8, 1], [14, 10.2, 1], [30, 10.2, 1]],
      props: [{ type: 'crate', x: 11, z: 10.6, size: 0.8 }, { type: 'barrel', x: 36, z: 10.4 }, { type: 'wall_block', x: 20, z: 0.5, w: 9, d: 1, h: 3, mat: 'brick' }, { type: 'wall_block', x: 31, z: 0.5, w: 5, d: 1, h: 3, mat: 'brick' }] },
    music: 'tense', start: 'The Order comes down the grey street with a clipboard before curfew. One family on the list has not been moved.',
    goal: 'Find the Pells before the Order does', goalAt: { x: 31, z: 3 }, endGoal: 'Decide what to do with Joan\'s tally', done: 'The sweep came and went.',
    hint: 'Twenty minutes before curfew. The Pells are in the fourth door from the corner.', banner: 'THE CROSSES ARE THE LATE ONES.',
    actors: {
      miriam: { name: 'Miriam Pell', faction: 'abnegation', sex: 'f', age: 38, x: 31, z: 3.4, rot: 3.1, talk: { intro: '[She has a bag packed behind the door, and a child on her hip.] Joan said someone would come. I did not expect you. Is it tonight?', opts: [
        { q: 'The Order is coming with a clipboard. Go now, to the cellar.', a: 'Now. [She does not ask a question. She turns, and in one motion the bag is on her shoulder and the child is at her side.] Thank you. Thank you. Go.', fx: { saved: 1, flag: 'camp_a_pells_warned', trust: [['joan', 1, 'you warned the Pells']] } },
        { q: 'Where are the Rowes?', a: 'Across the road. Mr. Rowe will not leave without his dog. [A thin smile.] I will knock for him.', fx: { saved: 1 } }] } },
      joan: { name: 'Elder Joan Hayes', faction: 'abnegation', sex: 'f', age: 66, x: 4, z: 9.4, rot: 0, talk: { intro: '[Joan stands under the first lamp with her hands in her sleeves.] The Pells. The Rowes. I will keep the Order on this end of the street as long as a woman of my age can. Hurry.', opts: [{ q: 'I will.', a: 'Go on.', fx: {} }] } },
    },
    things: [
      { id: 'clipboard', name: 'On the van seat', x: 23, z: 7.6, text: 'A clipboard, left on the seat of the Order\'s van while the officers walk the row. The sweep list: thirty-one addresses on the grey street, a tick against twenty-six. The remaining five are the late ones. The Pells are number 31. The pen has a green ink.', fx: { clue: ['sweep_list', 'The Order\'s sweep list matches Joan\'s: the Pells are number 31.'] } },
      { id: 'notice', name: 'The curfew notice', x: 12, z: 1.4, text: 'A new notice on a wall that has never had notices: CURFEW 21:00. DRONES SCAN SECTORS 3 TO 9 BETWEEN 21:00 AND 06:00. REPORT ANYTHING UNUSUAL. A hand has written under it, in pencil, "unusual is a person". Someone has rubbed it out, and the shape remains.', fx: { flag: 'camp_a_saw_notice' } },
    ],
    need: ['clipboard', 'miriam'],
    risk: { actor: { name: 'Officer Doyle', faction: 'erudite', sex: 'm', age: 29, seed: 'doyle-order' }, from: [38, 8], to: [32, 6], area: [26, 0.5, 39.5, 5.6], speed: 1.2, delay: 1.5, warn: 'The officers are at the end of the row. Clear the Pells\' door.', clearLine: 'Nobody home. Mark it for tomorrow.',
      caught: { text: '[The officer is younger than you expected and looks tired.] Evening. Is this your door? [He glances at the clipboard.] I would be a poor policeman if I did not ask.', q: 'It is Elder Hayes\'s neighbour\'s house.', a: 'I see. [A quiet pause.] I did not see anyone. I want that said. It is the only sort of thing I am allowed to say.', fx: { flag: 'order_doubter' } }, caughtFx: { flag: 'order_doubter' } },
    finale: { x: 4, z: 9.4, actor: 'joan', label: 'Give Joan the tally', name: 'Elder Joan Hayes', speaker: 'Elder Joan Hayes', faction: 'abnegation',
      text: '[The street is quiet. The van has gone. Joan\'s hands are shaking, a little.] The Pells are out. The Rowes are out. Two more families are not. Nothing in this world is ever finished. [She holds out a hand.] The list. I will burn it.',
      options: [
        { q: 'Burn it, Joan. You are right.', fx: { give: ['tally', 'handed'], flag: 'camp_a_handed', trust: [['joan', 1]], out: 'handed' } },
        { q: 'I\'ll keep it. Somebody should read it aloud one day.', fx: { give: ['tally', 'kept'], flag: 'camp_a_kept', trust: [['joan', -1, 'you kept the list she asked you to burn']], out: 'kept' } }] },
  });

  /* ======================================================================== ACT II · AMITY */
  E('camp_m1', {
    where: 'THE DISPENSARY · AMITY HEADQUARTERS',
    zone: { id: 'camp_store', name: 'The Dispensary Store', region: 'Amity headquarters', w: 14, d: 9, floor: 'wood', wall: 'paint_warm', ceiling: 'paint_white', amb: [0.42, 0.4, 0.34], lightColor: [1, 0.92, 0.74], spawn: { x: 7, z: 7.8, rot: Math.PI },
      props: [{ type: 'shelf', x: 3, z: 0.6, len: 4, h: 2.0, d: 0.4, levels: 4 }, { type: 'shelf', x: 8, z: 0.6, len: 4, h: 2.0, d: 0.4, levels: 4 }, { type: 'shelf', x: 12.6, z: 0.6, len: 2.4, h: 2.0, d: 0.4, levels: 4 }, { type: 'table', x: 7, z: 4.6, w: 1.8, d: 0.9, chairs: 0, top: 'wood' }, { type: 'crate', x: 12.6, z: 6.4, size: 0.8 }] },
    start: 'Mary lets you into the dispensary store, because you asked about the bread and she cannot lie to a face she likes.',
    goal: 'Look at the dispensary store', goalAt: { x: 7, z: 1.6 }, endGoal: 'Speak to Mary about what you found', done: 'You looked at the shelves and Mary let you.',
    hint: 'A quiet back room with numbered shelves. Mary is by the door; Ruth is at the table.', banner: 'THE SHELVES HAVE NUMBERS.',
    actors: {
      mary: { name: 'Mary Ellis', faction: 'amity', sex: 'f', age: 54, x: 3.4, z: 5.8, rot: 0.8, talk: { intro: '[Mary folds a cloth she does not need to fold.] I told you the bread was from the dispensary. I did not tell you the dispensary got it from somewhere else. You would have asked, and I would have had to answer.', opts: [
        { q: 'Where does the peace tin come from?', a: 'It comes in on a truck on the second Thursday. The paper says it is a tonic for "a calm temper". Ruth has never had a bad word since. Neither have I. [She stops.] Neither have I.', fx: { trust: [['mary', 1]] } },
        { q: 'Who collects the empties?', a: 'A Dauntless woman. Always the same one, quite young, in a very good coat. She signs and she smiles and she asks if the circle is calm. I have never known a Dauntless to care so much.', fx: { clue: ['mary_tin', 'A Dauntless woman in a very good coat collects the empty tins from Amity\'s dispensary.', 'dana'] } }] } },
      ruth: { name: 'Ruth Calder', faction: 'amity', sex: 'f', age: 60, x: 11, z: 4.6, rot: -1.2, talk: { intro: '[Ruth, who argued with Tom for a week, is smiling in a way that does not reach her eyes.] Mary says you are asking after the tonic. It is lovely. I have never slept so well in my life.', opts: [
        { q: 'Do you remember the water dispute?', a: 'Of course. [A small pause.] I was very cross. I do not remember why.', fx: { clue: ['ruth_forgot', 'Ruth Calder cannot remember why she was angry about the sluice.'] } }] } },
    },
    things: [
      { id: 'shelves', name: 'The numbered shelves', x: 7, z: 1.6, text: 'Tins on racks, each labelled in a clean machine hand: LOT 31, LOT 32, LOT 34. A gap where 33 should be. The numbers are the same as the binders in the Directorate archive. They have crossed a city to sit here beside the seed packets.', fx: { clue: ['lot_numbers', 'The dispensary\'s lots carry the same numbers as the Directorate\'s Series 7 binders.'] } },
      { id: 'tin', name: 'The peace tin', x: 7, z: 4.0, text: () => 'A flat tin, the size of a loaf, with a faint grey powder in the lid. ' + (flag('peace_serum_immune') ? 'You ate the bread at supper. You felt nothing at all: and Mary watched you not feel it.' : flag('palmed_peace_bread') ? 'You palmed the bread at supper. You will not know how it works. You know that you did not want to find out.' : flag('ate_peace_bread') ? 'You ate the bread at supper. You were very happy. You have not been able to say why.' : 'You did not eat the bread at supper. You do not know how you knew.'), fx: { flag: 'camp_m_saw_tin' } },
      { id: 'ledger', name: 'The dispensary ledger', x: 11.8, z: 1.8, text: 'Deliveries, in a round good hand. "2nd Thursday: 4 tins. Signed: Directorate. Collected by: D.C." The same hand has a column marked "Sleeps well?" with a tick in every row. At the bottom: "The circle is calm."', fx: { clue: ['manifest_dc', 'The dispensary ledger records deliveries signed by the Directorate and collected by D.C.', 'dana'] } },
    ],
    need: ['shelves', 'tin', 'mary'],
    finale: { x: 3.4, z: 5.8, actor: 'mary', label: 'Tell Mary what you found', name: 'Mary Ellis', speaker: 'Mary Ellis', faction: 'amity',
      text: '[Mary looks at the tins, and for the first time in your acquaintance her smile slips.] A little something to keep the peace. [She hears it, as if it were someone else.] What would you do, if you were me?',
      options: [
        { q: 'Stop. Tell the circle. Let them decide.', fx: { trust: [['mary', 1]], flag: 'camp_m_asked', out: 'asked' } },
        { q: 'Let me take a tin. I want someone to look at it.', fx: { trust: [['mary', -1, 'you took a tin from her store']], flag: 'camp_m_sample', out: 'sample' } },
        { q: 'Say nothing. Thank her for her time.', fx: { trust: [['mary', 1]], out: 'quiet' } }] },
  });

  E('camp_m2', {
    where: 'THE FARM GATE · AFTER TEN',
    zone: { id: 'camp_farm_gate', name: 'The Farm Gate', region: 'Amity farmland', w: 30, d: 14, outdoor: true, sky: 'night', floor: 'gravel', edgeMat: 'brick', spawn: { x: 3, z: 7, rot: Math.PI / 2 },
      lamps: [[5, 2, 1], [24, 2, 1], [5, 12, 1], [24, 12, 1], [16, 7, 0.8]],
      props: [{ type: 'crate', x: 24, z: 3, size: 0.9 }, { type: 'crate', x: 25.2, z: 3.8, size: 0.9, stack: true }, { type: 'barrel', x: 27, z: 11 }],
      build(ctx) { if (DV.Vehicles && DV.Vehicles.park) DV.Vehicles.park(ctx.zone, 'van', 18, 8, Math.PI / 2); } },
    music: 'tense', start: 'A truck comes to the farm gate at ten with crates that are not for the farm. The manifests are in the cab.',
    goal: 'See what the truck is carrying', goalAt: { x: 24, z: 4 }, endGoal: 'Decide who gets the manifests', done: 'The truck came and went.',
    hint: 'The truck is at the gate. The driver and one Order guard are by the crates.', banner: 'IT IS IN THE FOOD.',
    actors: {
      mary: { name: 'Mary Ellis', faction: 'amity', sex: 'f', age: 54, x: 5, z: 10, rot: 0.2, talk: { intro: '[She is in her nightgown, with a coat over it.] I could not sleep. I never cannot sleep. [She smiles, and the smile is thin.]', opts: [
        { q: 'Why is the truck here at night?', a: 'It has always come at night. I told myself it was the cold chain.', fx: {} },
        { q: 'Will you help me read the manifests?', a: 'I can read them. I do not know if I can bear to.', fx: { trust: [['mary', 1]] } }] } },
      kofi: { name: 'Kofi Alder', faction: 'factionless', sex: 'm', age: 44, x: 20.4, z: 5.6, rot: 3, talk: { intro: '[The driver, a big man in a patched coat, does not look pleased.] Ten crates. Four tins to a crate. I deliver. I do not read.', opts: [
        { q: 'Who pays you?', a: 'The Directorate. Twice a week. They pay on time and they do not like to be asked. [He drops his voice.] The cab\'s open. I did not say that.', fx: { clue: ['truck_pay', 'The driver is paid by the Directorate twice a week and leaves the cab open.'] } }] } },
    },
    things: [
      { id: 'crates', name: 'The crates', x: 24.8, z: 4.6, text: 'Ten crates stencilled AMITY DISPENSARY · TONIC. Each holds four tins, each tin stamped with a lot number. LOT 34, LOT 34, LOT 35. Under the stencil, painted over but not well: SERIES 7 · FIELD GRADE. It is being given to people in their bread.', fx: { clue: ['lot_numbers', 'The dispensary\'s lots carry the same numbers as the Directorate\'s Series 7 binders.'], flag: 'camp_m_saw_crates' } },
      { id: 'cab', name: 'The van\'s cab', x: 18, z: 5.6, text: 'On the dashboard: delivery manifests with the same lot numbers as the calibration room, the destinations in two columns: AMITY · CANDOR (tribunal canteen) · DAUNTLESS (compound kitchen) · ERUDITE (dining hall). Four factions. The fifth, Abnegation, has a line: "TO FOLLOW".', fx: { clue: ['manifest_all', 'The manifests send Series 7 to four factions\' kitchens: Abnegation is marked "to follow".'] } },
    ],
    need: ['crates', 'cab', 'mary'],
    risk: { actor: { name: 'Officer Brandt', faction: 'erudite', sex: 'm', age: 36, seed: 'brandt-guard' }, from: [29, 12], to: [22, 6], area: [14, 2, 28, 10], speed: 1.2, delay: 1.5, warn: 'The Order guard is walking the truck. Get away from the cab and the crates.', clearLine: 'Truck is clear. Gate shut.',
      caught: { text: '[The guard\'s torch is steady.] Farm hands do not walk up to the cab at night.', q: 'I could not sleep.', a: 'Go back to bed. [He looks at the crates.] I would, if I could.', fx: {} }, caughtFx: { trust: [['mary', -1, 'the guard saw you at the truck']] } },
    finale: { x: 5, z: 10, actor: 'mary', label: 'Give Mary the manifests', name: 'Mary Ellis', speaker: 'Mary Ellis', faction: 'amity',
      text: '[Mary reads the destination column, one finger beneath each word.] Four kitchens. Mine is one. [She closes the sheet.] Take them where they will be read. I will say what I know, when someone asks.',
      options: [
        { q: 'I will take them: you keep your hands clean of it.', fx: { give: ['manifest', 'kept'], flag: 'camp_m_kept', trust: [['mary', 0]], out: 'kept' } },
        { q: 'Keep them, Mary. They are your testimony.', fx: { give: ['manifest', 'handed'], flag: 'camp_m_handed', trust: [['mary', 1]], out: 'handed' } }] },
  });

  /* ======================================================================== ACT III */
  E('camp_x1', {
    where: 'A STREET IN YOUR SECTOR · DAWN',
    zone: { id: 'camp_street', name: 'The Seventh Circle', region: 'Your sector, before six', w: 34, d: 12, outdoor: true, sky: 'dawn', floor: 'asphalt', edgeMat: 'brick', spawn: { x: 3, z: 6, rot: Math.PI / 2 },
      lamps: [[8, 1.8, 0.7], [26, 1.8, 0.7]],
      props: [{ type: 'lamp_post', x: 10, z: 1.2 }, { type: 'lamp_post', x: 26, z: 1.2 }, { type: 'chalk_circle', x: 17, z: 6, r: 1.4 }, { type: 'crate', x: 30, z: 10.4, size: 0.8 }] },
    music: 'tense', start: 'The seventh circle is on a pavement you know, and someone you know is inside it.',
    goal: 'See who is in the circle', goalAt: { x: 17, z: 6 }, endGoal: 'Answer the Lieutenant', done: 'The seventh circle.',
    hint: 'It is not yet six. There is a crowd, and a plain-coated man waiting for you.', banner: 'SOMEONE YOU KNOW.',
    actors: {
      v_jenna: { name: 'Jenna Morales', faction: 'neutral', sex: 'f', age: 17, x: 17, z: 6, rot: 0, action: 'lie', seatY: 0.04, when: () => flag('pd_shared') },
      v_daniel: { name: 'Daniel Webb', faction: 'neutral', sex: 'm', age: 17, x: 17, z: 6, rot: 0, action: 'lie', seatY: 0.04, when: () => !flag('pd_shared') },
      edith: { name: 'Edith Ashby', faction: 'abnegation', sex: 'f', age: 63, x: 8, z: 8.6, rot: 1.2, talk: { intro: '[A woman in a grey coat, who has stood here since the first lamp.] I came out to bring the milk in. I did not know whether to touch her.', opts: [
        { q: 'Did you see anyone?', a: 'A van with its lights off, at four. Two men, in plain coats, carrying. They took their time. They did not look at the houses. [She shakes her head.] They looked at the road.', fx: { clue: ['seventh_van', 'A van with its lights off was at the seventh circle at four; two men in plain coats carried, and did not hurry.'] } },
        { q: 'Had you seen her before?', a: 'The girl? Everyone has seen her. She sat on that step every evening and wrote in a notebook. A quiet one. A clever one.', fx: {} }] } },
      dray: { name: 'Lt. Corbin Dray', faction: 'erudite', sex: 'm', age: 41, seed: 'dray', x: 22, z: 6.6, rot: 3.6 },
    },
    things: [
      { id: 'circle', name: 'The circle', x: 17, z: 3.4, text: 'The seventh. The ring is as wide as the others, drawn in the same single sweep. This time the chalk is still damp at the start of the line where the hand was slow. Someone was careless; or someone was in a hurry for the first time.', fx: { clue: ['seventh_circle', 'The seventh circle\'s chalk was still damp: this one was drawn in a hurry.'] } },
      { id: 'stub', name: 'A stub of chalk', x: 29, z: 8.4, text: 'In the gutter: a chalk stub, with the end bitten. A stamp on the flat side: CAL. TEAM · ORDER STORES. A tin lid beside it, the same make as the one in the rail yard. The Order does not even trouble to take its own things home.', fx: { clue: ['chalk_tin', 'A tin of chalk stamped CAL. TEAM stands where the van was: the Order\'s own people draw the circles.'] } },
      { id: 'victim', name: 'The seventh', x: 15, z: 6, text: () => (flag('pd_shared') ? 'Jenna Morales. She went to Erudite to chase a word she heard in the Testing Center corridor, and she found it. Her notebook is on the step: "Protocol D" on the first page, underlined twice, and underneath, "D for what?"' : 'Daniel Webb, who chose the coals and was never meant for them. A paper band on his wrist from the Testing Center. His hands, which never hit anyone, are folded. His glasses are by the step. Someone has placed them carefully.'), after: () => { const jen = flag('pd_shared'); DV.State.setFlag(jen ? 'camp_seventh_jenna' : 'camp_seventh_daniel'); C.prog('camp_x1').outcome = jen ? 'jenna' : 'daniel'; C.fx({ trust: [] }); } },
    ],
    need: ['circle', 'stub', 'victim', 'edith'],
    finale: { x: 22, z: 6.6, actor: 'dray', label: 'Speak to the Lieutenant', name: 'Lt. Corbin Dray', speaker: 'Lt. Corbin Dray', faction: 'erudite',
      text: '[He takes his hat off as if in church.] I am sorry. I know you knew them. I have a little question, and I would take it as a kindness if you answered. Where were you last night, between ten and four?',
      options: [
        { q: '"In my bed. Ask anyone in my house."', fx: { flag: 'camp_dray_lied', clue: ['dray_alibi', 'I told Lt. Dray I was in my bed. He wrote nothing down. He was kind.'] } },
        { q: '"Trying to find out who did this."', fx: { flag: 'camp_dray_truth', clue: ['dray_truth', 'I told Lt. Dray I was trying to find who did this. He said, "Good." He meant something else.'], trust: [] } },
        { q: 'Say nothing.', fx: { flag: 'camp_dray_silent' } }] },
    setup(Ch) {
      // the runner: someone you trust, with a meeting place
      const ally = ['mark', 'joan', 'claire', 'rosa', 'park', 'mary'].filter((w) => !K().isDead(w)).sort((a, b) => K().trustOf(b) - K().trustOf(a))[0] || 'joan';
      Ch.runnerFrom = ally;
    },
  });
  // (after the Lieutenant: the note)
  DV.Events.on('dialogue:end', (e) => {
    if (e && e.tree === 'camp_x1_choice') { const from = (DV.Chapter.E && DV.Chapter.runnerFrom) || 'joan'; DV.State.setFlag('camp_meeting_note'); DV.UI.notify((K().ALLIES[from] ? K().ALLIES[from].name : 'Someone') + ' presses a folded paper into your hand: "Under the tracks, after dark."', 'item'); }
  });

  E('camp_x2', {
    where: 'A DISUSED L PLATFORM · EZRA\'S REFUGE',
    zone: { id: 'camp_tracks', name: 'Under the Tracks', region: 'Beneath the L', w: 26, d: 10, floor: 'concrete_dark', wall: 'concrete', ceiling: 'ceiling_concrete', amb: [0.2, 0.2, 0.23], lightColor: [1, 0.8, 0.55], intensity: 0.75, fixture: 'bulb', spawn: { x: 13, z: 8.6, rot: Math.PI },
      props: [{ type: 'table', x: 13, z: 4.2, w: 3.2, d: 1.2, chairs: 0, top: 'metal' }, { type: 'bed', x: 1.6, z: 2, rotDeg: 90 }, { type: 'bed', x: 1.6, z: 5, rotDeg: 90 }, { type: 'barrel', x: 23.4, z: 1.2 }, { type: 'crate', x: 24.2, z: 8.6, size: 0.9 }, { type: 'crate', x: 22.8, z: 8.9, size: 0.7 }] },
    music: 'tense', start: 'Ezra\'s refuge under the L: a stove, a map table and everyone who trusts you enough to come.',
    goal: 'Hear what the others have brought', goalAt: { x: 13, z: 4.2 }, endGoal: 'Lead them out', done: 'You got them out of the dark.',
    hint: 'A stove, a map table, a hanging lamp. Everyone who trusts you enough has come.', banner: 'SOMEONE TOLD.',
    actors: (() => {
      const slot = [[8.4, 7], [17.6, 7], [8.4, 1.8], [17.6, 1.8], [21.4, 5], [5.8, 5.4]];
      const mk = (id, name, faction, sex, age, i, piece, line) => ({ name, faction, sex, age, x: slot[i][0], z: slot[i][1], rot: 0, when: () => K().comes(id), talk: { intro: () => '[' + name.split(' ')[0] + ' ' + (K().has(piece) ? 'has nothing more to give, only a hand on your shoulder.' : 'puts a folded packet on the map table.') + '] ' + line, opts: [{ q: 'Thank you for coming.', a: 'Of course. [A pause.] It was not an easy road.', fx: { trust: [[id, 0]] } }, { q: 'Let me see what you brought.', if: () => !K().has(piece), a: 'Here. It is the whole of it, as I have it. I would take it as a kindness if you read it before you decide.', fx: { give: [piece, 'given'] } }] } });
      return {
        ezra: { name: 'Ezra', faction: 'factionless', sex: 'm', age: 54, x: 13, z: 7.2, rot: 3.1, talk: { intro: '[A big man in a patched coat, with a kettle.] This is as safe as anywhere. Which is not very. Put what you have on the table.', opts: [
          { q: 'Who knows we are here?', a: 'Everyone in this room, and the ones who sent them. [He pours tea.] One of you told. Not on purpose, maybe. Look at the table, and say who.', fx: { flag: 'camp_leak_known' } }] } },
        rosa: mk('rosa', 'Rosa Medina', 'candor', 'f', 45, 0, 'ledger', 'The tribunal has its seal on a paper it should never have stamped. I would like to be the one to take it off.'),
        park: mk('park', 'Dr. Helen Park', 'erudite', 'f', 52, 1, 'lot33', 'I have not slept in two days. I brought everything I should have kept to myself.'),
        joan: mk('joan', 'Elder Joan Hayes', 'abnegation', 'f', 66, 2, 'tally', 'Forty names. Nineteen crosses now. I should have burned it. I am glad I did not.'),
        mary: mk('mary', 'Mary Ellis', 'amity', 'f', 54, 3, 'manifest', 'I came by the long way. I do not usually go by the long way.'),
        mark: mk('mark', 'Mark Rivera', 'dauntless', 'm', 21, 4, 'chalk', 'I did not tell Dana I was leaving the compound. I am telling you, in case it matters.'),
        claire: mk('claire', 'Claire Dawson', 'erudite', 'f', 36, 5, 'witness', 'Results are overridden by hand at Sector 4. I will say so in front of anyone you like.'),
      };
    })(),
    things: [
      { id: 'table', name: 'The map table', x: 13, z: 2.6, label: 'Lay out the proof', text: () => 'The table is a city map with pins. You lay out what you hold: ' + (Object.keys(K().st().pieces).map((k) => K().PIECES[k].name).join('; ') || 'nothing yet') + '. Somebody told Pierce about the meetings. A pin stands over the Dauntless compound. Another over the Testing Center. A third has been moved, by someone, and not put back.', after: () => { C.mark('camp_x2', 'table'); DV.Chapter.scene('camp_x2_deduce', { speaker: 'The table', faction: '' }); } },
    ],
    need: ['table', 'deduce', 'ezra'],
    risk: { actor: { name: 'Lt. Corbin Dray', faction: 'erudite', sex: 'm', age: 41, seed: 'dray' }, from: [13, 9.6], to: [13, 6], area: [3, 0.5, 23, 4.6], speed: 1.2, delay: 1.5, warn: 'The Order is on the stairs. Lights out. Get away from the table: draw them off, or hide.', clearLine: '[He stands at the table with a lantern, looking at a map he cannot read, and then at the stove, still warm.]',
      caught: { text: '[Dray in the lantern light. Beautifully courteous.] I do not know what you imagine you are doing. I do know that this stove was lit at six.', q: 'We were cold.', a: 'Cold. [He looks at the table, and the map, and then at you.] Then you will not mind if we continue this somewhere warmer.', fx: {} }, caughtFx: { trust: [['ezra', -1, 'the Order found the table']], flag: 'camp_tracks_raided' } },
    finale: { x: 13, z: 7.2, actor: 'ezra', label: 'Lead them out', name: 'Ezra', speaker: 'Ezra', faction: 'factionless',
      text: '[Ezra has the kettle in one hand and a door in the other.] East tunnel. A hundred metres, a ladder, a gate that opens from the inside. Everybody out, or you stay and buy them a minute.',
      options: [
        { q: 'East tunnel, all of us together.', fx: { trust: [['ezra', 1]], flag: 'camp_tracks_together', out: 'together' } },
        { q: 'I will draw them off. You take the others.', fx: { trust: [['ezra', 1]], flag: 'camp_tracks_drew_off', out: 'drew_off' } },
        { q: 'Take the proof out first. The rest of us follow.', fx: { flag: 'camp_tracks_proof_first', out: 'proof_first' } }] },
    setup() {
      DV.DialogueDB.add('camp_x2_deduce', { entry: 'start', nodes: {
        start: { speaker: 'The table', faction: '', text: () => 'Somebody told Pierce where you would be. ' + (Object.entries(K().suspects()).map(([k, v]) => (K().ALLIES[k] ? K().ALLIES[k].name : k) + ': ' + v + ' clue' + (v > 1 ? 's' : '')).join(' · ') || 'You have nothing pointing at anyone.') + ' Who was it?', choices: [
          { text: 'Dana Cole.', to: 'dana' }, { text: 'Mary Ellis.', to: 'wrong', effect: () => K().trust('mary', -2, 'you accused her at the table') }, { text: 'Dr. Park.', to: 'wrong', effect: () => K().trust('park', -2, 'you accused her at the table') }, { text: 'Rosa Medina.', to: 'wrong', effect: () => K().trust('rosa', -2, 'you accused her at the table') }, { text: 'Mark Rivera.', to: 'wrong', effect: () => K().trust('mark', -2, 'you accused him at the table') }, { text: 'I cannot say.', to: 'unsure' }] },
        dana: { speaker: 'Ezra', faction: 'factionless', text: () => (K().suspectScore('dana') >= 2 ? 'Two clues and a good argument. [He looks round the table.] Dana Cole. Erudite-born, and the only one with a reason to be in all four kitchens. I will take your word, and the others will take mine.' : 'It might be. [He shakes his head.] You do not have enough to say so out loud. But I will keep it in mind.'), onEnter: () => { if (K().suspectScore('dana') >= 2) { DV.State.setFlag('camp_leak_named'); K().clue('leak_dana', 'The leak is Dana Cole: named at the table under the tracks.', { suspect: 'dana' }); } else DV.State.setFlag('camp_leak_accused_thin'); C.mark('camp_x2', 'deduce'); }, next: '', endText: 'Go on.' },
        wrong: { speaker: 'Ezra', faction: 'factionless', text: 'No. [He is certain, and gentle about it.] Look again. You have clues that point at one person, and she is not in this room. It will cost you someone\'s good opinion to say it wrong.', onEnter: () => C.mark('camp_x2', 'deduce'), endText: 'I will look again.' },
        unsure: { speaker: 'Ezra', faction: 'factionless', text: 'Then keep your eyes open and your mouth shut. That is also an answer.', onEnter: () => C.mark('camp_x2', 'deduce'), endText: 'Yes.' },
      } });
    },
  });
  // the deduction's marks are written with the engine's own names
  C.mark = C.mark || ((id, k) => { C.prog(id).seen[k] = true; });

  E('camp_x3', {
    where: 'THE GREY STREET · THE NIGHT OF THE SCAN',
    zone: { id: 'camp_scan', name: 'The Night of the Scan', region: 'Abnegation sector, under the drones', w: 50, d: 12, outdoor: true, sky: 'night', floor: 'asphalt', edgeMat: 'brick', spawn: { x: 3, z: 6, rot: Math.PI / 2 },
      lamps: [[10, 1.8, 0.7], [26, 1.8, 0.7], [42, 1.8, 0.7], [18, 10.4, 0.7], [34, 10.4, 0.7]],
      props: [{ type: 'crate', x: 14, z: 10.6, size: 0.8 }, { type: 'barrel', x: 38, z: 10.6 }, { type: 'wall_block', x: 24, z: 0.5, w: 7, d: 1, h: 3, mat: 'brick' }] },
    music: 'tense', start: 'The Order sweeps the grey street for the list. The drones are out. Every family you save is one the Directorate does not have.',
    goal: 'Warn the four families before the patrol reaches their doors', goalAt: { x: 14, z: 3 }, endGoal: 'Take the summons to the Hub', done: 'The night ended, and the families you saved are gone.',
    hint: 'Four doors on this side of the street. A patrol with a torch walks the road. Keep out of its light when you knock.', banner: 'THE LISTS ARE GOING.',
    actors: {
      silas: { name: 'Silas Beck', faction: 'abnegation', sex: 'm', age: 19, x: 45, z: 6, rot: 1.6, talk: { intro: '[A runner, out of breath, with a summons in his hand.] The vote is tomorrow. At the Hub. They want a name on the paper, and they want everyone there.', opts: [
        { q: 'How many are left?', a: () => 'You saved ' + (K().st().saved || 0) + ' families tonight. [He nods, slowly.] That is ' + (K().st().saved || 0) + ' that do not have a circle.', fx: {} }] } },
    },
    things: [1, 2, 3, 4].map((n) => ({ id: 'd' + n, name: 'Door ' + n, x: 6 + n * 8, z: 2.4, label: 'Warn the family', r: 1.4, text: '', use(Ch) {
      if (C.seen('camp_x3', 'd' + n)) return;
      C.mark('camp_x3', 'd' + n);
      const p = Ch.cast.patrol; const near = p ? Math.hypot(p.x - (6 + n * 8), p.z - 2.4) < Math.max(4.5, 8 - K().count() * 0.3) : false;
      if (near) { DV.UI.notify('The torch finds the door. The family is taken before you can speak.', 'quest_fail'); DV.State.setFlag('camp_x3_lost_' + n); DV.UI.subtitle('Order', 'Halt. Everyone out of the house.', 3); } else { C.fx({ saved: 1 }); DV.UI.notify('You warned the family at door ' + n + ': they are gone by the back before the torch turns.', 'quest'); }
    } })),
    need: ['d1', 'd2', 'd3', 'd4'],
    finale: { x: 45, z: 6, actor: 'silas', label: 'Take the summons', name: 'Silas Beck', speaker: 'Silas Beck', faction: 'abnegation',
      text: () => '[Silas holds out the summons. His hands are not steady.] The Hub, at ten. The Dean will speak, and the council will vote. ' + (K().st().saved || 0) + ' families are away. The list is in a box under a floor. They know who you are. They would like to hear what you say.',
      options: [{ q: 'I will be there.', fx: { out: 'summoned', trust: [] } }, { q: 'Tell them I am coming, and I am not alone.', fx: { out: 'summoned' } }] },
    setup(Ch) {
      const p = Ch.actor({ id: 'patrol', name: 'Order Patrol', faction: 'erudite', app: C.adult('erudite', 'm', 'scan-patrol', 30, 1.06), x: 12, z: 6.4, rot: 1.6, action: 'idle' });
      Ch.cast.patrol = p;
      const legs = [[40, 6.4], [12, 6.4]];
      let i = 0;
      const go = () => p.walk([legs[i++ % 2]], 1.15, () => Ch.after(0.8, go));
      go();
    },
  });

  /* ======================================================================== ACT IV */
  const votes = () => {
    const C2 = K(), st = C2.st(); let v = 2;
    for (const [id, p] of Object.entries(st.pieces)) { const d = C2.PIECES[id]; if (d && d.hard) v += p.how === 'kept' ? 2 : 1; else v += 1; }
    if (flag('camp_leak_named')) v += 1;
    if ((st.saved || 0) >= 2) v += 1;
    return v;
  };
  E('camp_z1', {
    where: 'THE COUNCIL CHAMBER · THE HUB',
    zone: { id: 'camp_council', name: 'The Council Chamber', region: 'The Hub, 20th floor', w: 30, d: 20, floor: 'terrazzo', wall: 'concrete_panel', ceiling: 'ceiling_concrete', amb: [0.5, 0.5, 0.52], lightColor: [1, 0.97, 0.9], intensity: 0.85, spawn: { x: 15, z: 18.2, rot: Math.PI },
      props: [{ type: 'lectern', x: 15, z: 3 }, { type: 'table', x: 15, z: 6.6, w: 5.2, d: 1.0, chairs: 0, top: 'metal_dark' }, { type: 'bench', x: 6, z: 11, rotDeg: 90, len: 5, seatable: false }, { type: 'bench', x: 6, z: 15, rotDeg: 90, len: 5, seatable: false }, { type: 'bench', x: 24, z: 11, rotDeg: -90, len: 5, seatable: false }, { type: 'bench', x: 24, z: 15, rotDeg: -90, len: 5, seatable: false }, { type: 'floor_emblem', x: 15, z: 11, size: 5 }] },
    music: 'ceremony', start: 'The Council votes on the Continuity Act in the Choosing Hall. Dean Vance will speak first. You will have a minute.',
    goal: 'Take your place before the Council', goalAt: { x: 15, z: 8 }, endGoal: 'Speak to the Dean', done: 'The vote was taken.',
    hint: 'The Council chamber. The Dean is at the lectern. Everyone has come.', banner: '',
    actors: {
      vance: { name: 'Dean Ottoline Vance', faction: 'erudite', sex: 'f', age: 58, x: 15, z: 4.2, rot: 0, talk: { intro: '[A woman in a pale suit with a voice that makes the room lean in.] I am told you have been asking questions. Good. A city ought to ask them. I would like to answer yours before you ask the Council\'s.', opts: [
        { q: 'What is Series 7?', a: 'A kindness. A way to give a frightened people a quiet night. Nobody has been harmed by a quiet night. [She does not blink.]', fx: { clue: ['vance_kindness', 'The Dean calls Series 7 "a kindness" and has not said the word "lot".'] } },
        { q: 'Who are the circles?', a: 'The Chalker\'s victims. A tragedy. We have asked for more drones and the Order to prevent a seventh. We have had a seventh. [She sighs.] That is why the Act is needed.', fx: {} },
        { q: 'You need me, don\'t you.', if: () => div(), a: 'I need people like you to be safe. Under my roof, with the right care. Nobody else can promise that. [She smiles.] Think about it.', fx: { flag: 'camp_vance_offer' } }] } },
      pierce: { name: 'Dr. Alan Pierce', faction: 'erudite', sex: 'm', age: 48, x: 11, z: 5, rot: 0.4 },
      dray: { name: 'Lt. Corbin Dray', faction: 'erudite', sex: 'm', age: 41, seed: 'dray', x: 15, z: 16.4, rot: 3.1 },
      aaron: { name: 'Aaron Hayes', faction: 'abnegation', sex: 'm', age: 68, x: 20, z: 5, rot: -0.4, talk: { intro: '[Aaron sits very upright.] I will vote as the evidence leads me. It has not led me anywhere yet. [He looks at you.]', opts: [{ q: 'Will you hear it if I speak?', a: 'I will hear it. The others may not.', fx: { trust: [['aaron', 1]] } }] } },
    },
    things: [
      { id: 'table', name: 'The table', x: 15, z: 8, label: 'Look at what you hold', text: () => 'On the table, in front of the Council\'s empty seats: ' + (Object.keys(K().st().pieces).map((k) => K().PIECES[k].name + ' (' + K().st().pieces[k].how + ')').join(' · ') || 'nothing') + '. The Council will vote on ten. You hold, by the numbers you can count, ' + votes() + ' of the ten. The rest depend on what you say.' },
    ],
    need: ['table', 'vance'],
    finale: { x: 15, z: 5.4, actor: 'vance', label: 'Speak to the Council', name: 'Dean Vance', speaker: 'The Council', faction: '',
      text: () => 'The Dean has finished. All eyes in the chamber are on you. The vote stands at ' + votes() + ' of ten against the Act, if you present what you hold. What will you do?',
      options: [
        { q: 'Present the evidence.', if: () => K().count() >= 1, fx: { out: 'present' } },
        { q: 'Accept the Dean\'s offer.', if: () => flag('camp_vance_offer'), fx: { out: 'the_quiet' } },
        { q: 'Walk out with Ezra.', if: () => K().comes('ezra'), fx: { out: 'under_the_tracks' } },
        { q: 'Leave by the gate, with the proof and the people.', if: () => K().eligible('beyond_the_fence'), fx: { out: 'beyond_the_fence' } },
        { q: 'Say nothing.', fx: { out: 'the_quiet_passes' } }] },
    finish(Ch, out) {
      let id = out;
      if (out === 'present') id = K().eligible('open_air') && votes() >= 7 ? 'open_air' : 'the_quiet_passes';
      K().finish(id);
      const def = K().ENDINGS[id];
      const dead = K().st().dead.map((d) => (K().ALLIES[d] ? K().ALLIES[d].name : d));
      const lines = [def.line, '', (K().st().saved || 0) + ' families got out on the night of the scan.', dead.length ? 'Dead: ' + dead.join(', ') + '.' : 'Nobody who trusted you died.', 'Proof held: ' + K().count() + '. Votes: ' + votes() + ' of 10.', '', 'THE CHALK YEAR · to be continued.'];
      DV.UI.showReading('THE CHALK YEAR — ' + def.name.toUpperCase(), lines.join('\n'), () => K().complete('camp_z1', id, { l1: 'THE CHALK YEAR', l2: def.name.toUpperCase(), l3: 'Click or press any key to keep exploring · the story goes on', banner: true }));
    },
  });
})();
