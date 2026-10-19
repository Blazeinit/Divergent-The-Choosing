/* ==========================================================================
   DIVERGENT — the other factions' trials, Day 6
   The day after the first week, each mentor has one more thing to show
   you. Not a test, exactly. Each is something the films had in them,
   seen from the inside of this city:
     ERUDITE     "Gallery B": Dr. Park takes you behind the glass, where a
                 Dauntless volunteer is given a simulation serum with a
                 transmitter in it, and does what a voice tells him, wide
                 awake. The vials on the tray are for every Dauntless member.
     ABNEGATION  "The Bread Line": Joan's cart at the corner, a queue of the
                 factionless, and an Order patrol coming down the grey
                 street to break it up. Hand out what you can; buy time if
                 you can talk.
     AMITY       "The Second Supper": a quarrel at the long tables that
                 stops mid-sentence when the bread goes round. You notice.
                 Then the basket comes to you.
   (Candor's trial is the Hearing itself: js/zones/week_candor.js.)
   Each is a chapter of its own, offered by the mentor once the week is
   over, that comes home to the week's free roam afterwards.

     DV.Trials.devStart(f)    straight to the faction's trial (the dev menu, QA)
     DV.Trials.st()           saved in DV.State.data.story.trials
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const FW = () => DV.FirstWeek;
  const APT = () => DV.State.data.aptitude;
  const adult = (f, sex, seed, age, h) => { const a = DV.Character.fromFaction(f, sex, seed, { age: age || 40 }); a.height = (a.height || 1) * (h || 1.05); return a; };
  const day = () => Math.max(6, DV.State.data.world.day || 6);
  const K = () => DV.Campaign;

  const TRIALS = {
    erudite: { id: 'trial_erudite', title: 'Gallery B', mentor: 'eru_park', line: '"You asked what the benches were really for." (Gallery B)', note: 'Dr. Park has asked for you. Gallery B, on the floor below the labs.' },
    abnegation: { id: 'trial_abnegation', title: 'The Bread Line', mentor: 'abn_joan', line: '"Is there anything I can do tomorrow?" (the bread line)', note: 'Joan has a cart for the corner tomorrow afternoon. She would like your hands.' },
    amity: { id: 'trial_amity', title: 'The Second Supper', mentor: 'am_mary', line: '"Can I stay for supper again?" (the second supper)', note: 'Mary says you\'re welcome at the long tables again tomorrow night.' },
  };

  const T = {
    TRIALS,
    st() { const s = DV.State.data.story || (DV.State.data.story = {}); return s.trials || (s.trials = {}); },
    done(f) { return !!this.st()[f]; },
    open(f) { return !!TRIALS[f] && DV.Quests.state('week_' + f) === 'complete' && !this.done(f); },
    start(f) { DV.Chapter.start(TRIALS[f].id, { fadeOut: 1400, fadeIn: 1400 }); },
    // the way home: the week's own free roam, the clock as it is
    home(f) {
      if (DV.Campaign && DV.Campaign.started()) DV.Campaign.home();
      else DV.Chapter.start('week_' + f, { step: 'end', keepClock: true, fadeOut: 1200, fadeIn: 1200, noTitle: true });
    },
    finish(Ch, f, outcome, l2) {
      this.st()[f] = outcome;
      DV.State.setFlag('trial_' + f + '_done');
      DV.Stats.addXP(80, TRIALS[f].title);
      Ch.checkpoint('end');
      Ch.banner(TRIALS[f].title.toUpperCase(), l2, 'Click or press any key to carry on', () => { DV.Save.write('auto'); this.home(f); });
    },
    devStart(f) {
      if (f === 'candor') { this.devCandor(); return; }
      const a = APT();
      if (a.status !== 'complete') { a.status = 'complete'; a.result = f; a.recordedAs = f; }
      const w = FW().st(); w.faction = f;
      if (DV.State.data.player.outfit !== f && DV.Build2) DV.Build2.dressFor(f);
      if (!DV.Quests.started('week_' + f)) DV.Quests.start('week_' + f, true);
      if (DV.Quests.state('week_' + f) !== 'complete') DV.Quests.complete('week_' + f, 'dev');
      delete this.st()[f];
      DV.State.data.world.day = 6;
      DV.Chapter.start(TRIALS[f].id, { instant: true });
    },
    // the Hearing, straight away (the Candor week's own step)
    devCandor() {
      const w = FW().st(); w.faction = 'candor';
      if (DV.State.data.player.outfit !== 'candor' && DV.Build2) DV.Build2.dressFor('candor');
      if (!DV.Quests.started('week_candor')) DV.Quests.start('week_candor', true);
      DV.Chapter.start('week_candor', { step: 'hearing', instant: true });
    },
  };

  /* ------------------------------ the mentors offer it ------------------------------ */
  for (const f of Object.keys(TRIALS)) {
    const tree = DV.DialogueDB.get(TRIALS[f].mentor);
    const node = tree && tree.nodes && tree.nodes.start;
    if (node && Array.isArray(node.choices)) node.choices.unshift({ text: TRIALS[f].line, if: () => T.open(f), end: true, effect: () => setTimeout(() => T.start(f), 300) });
  }
  // the week's banner is dismissed: the mentor's word
  DV.Events.on('quest:changed', (e) => {
    const f = e && e.type === 'complete' && /^week_/.test(e.id) ? e.id.slice(5) : null;
    if (f && TRIALS[f]) setTimeout(() => { if (T.open(f)) DV.UI.notify(TRIALS[f].note, 'quest'); }, 9000);
  });

  /* ============================== ERUDITE: GALLERY B ============================== */
  DV.Zones.define('eru_gallery', {
    name: 'Gallery B', region: 'Erudite headquarters, below the laboratories',
    chapter: true, noDiscover: true,
    bounds: { x0: -2, z0: -2, x1: 14, z1: 14 },
    buildingHeight: 8, roof: true,
    fog: { color: 0x20242a, near: 20, far: 80 },
    sky: { top: 0x5b6773, horizon: 0x9ca3a9, ground: 0x585b5d, skyline: false },
    charLight: { ambient: 0.5, hemi: 0.3, dir: 0.4, dirColor: 0xd8e8ff },
    rooms: [
      { id: 'gal', name: 'Gallery B', x0: 0, z0: 0, x1: 12, z1: 4, h: 3.2, floor: 'carpet_dark', wall: 'paint_blue', ceiling: 'ceiling_tile', light: { ambient: [0.16, 0.17, 0.2], color: [0.8, 0.85, 1], intensity: 0.5, spacing: 6, range: 5 } },
      { id: 'test', name: 'Test Room', x0: 0, z0: 4, x1: 12, z1: 12, h: 3.4, floor: 'tile_white', wall: 'paint_white', ceiling: 'ceiling_tile', light: { ambient: [0.5, 0.52, 0.54], color: [0.95, 0.98, 1], intensity: 1.0, spacing: 3.5, range: 6, fixture: 'panel' } },
    ],
    doors: [
      { id: 'gal_door', x: 0, z: 2, dir: 'z', w: 1.1, type: 'sealed', label: '', lockMsg: 'Dr. Park locked it behind you.' },
      { id: 'test_door', x: 12, z: 8, dir: 'z', w: 1.2, type: 'sealed', label: '' },
    ],
    windows: [{ id: 'gal_glass', x: 6, z: 4, dir: 'x', w: 10.4, sill: 0.85, top: 2.8 }],
    props: [
      { type: 'test_chair', x: 6, z: 8.6, rotDeg: 180, id: 'sl_chair' },
      { type: 'console', x: 9.8, z: 10.6, rotDeg: 180, id: 'sl_console_t' },
      { type: 'serum_tray', x: 4.4, z: 8.8 },
      { type: 'console', x: 2.4, z: 0.75, rotDeg: 0, id: 'sl_console' },
      { type: 'table', x: 9.6, z: 1.0, w: 1.6, d: 0.7, chairs: 0, top: 'black' },
      { type: 'serum_tray', x: 6.2, z: 0.7 },
    ],
    spawn: { x: 6, z: 2.4, rot: 0 },
    build() {},
  });
  DV.Chapter.define('trial_erudite', {
    zone: 'eru_gallery', title: 'ERUDITE\nGALLERY B · DAY 6', day, time: '14:00',
    start(Ch, zone, opts) {
      DV.Audio.setMusic('serum');
      Ch.seen = {}; Ch.caught = false;
      Ch.park = Ch.actor({ id: 'park', name: 'Dr. Helen Park', faction: 'erudite', app: adult('erudite', 'f', 'helen-park', 52, 1.02), x: 4.6, z: 3.2, rot: 0, action: 'clipboard' });
      const ike = DV.NPCs.get('d_ike');
      Ch.ike = Ch.actor({ id: 'ike', name: 'Ike Moreno', faction: 'dauntless', app: ike ? ike.appearance() : adult('dauntless', 'm', 'ike', 26), x: 6, z: 8.7, rot: Math.PI, action: 'sit', seatY: 0.5 });
      Ch.techA = Ch.actor({ id: 'techA', name: 'Technician', faction: 'erudite', app: adult('erudite', 'f', 'tech-a', 34), x: 4.6, z: 9.8, rot: 2.3, action: 'idle' });
      Ch.techB = Ch.actor({ id: 'techB', name: 'Technician', faction: 'erudite', app: adult('erudite', 'm', 'tech-b', 45), x: 9.8, z: 11.2, rot: Math.PI, action: 'type' });
      FW().placePlayer(6, 2.4, 0);
      if (opts.step === 'end') { this.after(Ch); return; }
      Ch.checkpoint('watch');
      this.watch(Ch);
    },
    watch(Ch) {
      Ch.cut(true);
      Ch.shot([2.2, 1.9, 1.2], [6, 1.3, 8.4], true);
      Ch.seq([
        () => 1.6,
        () => { Ch.say(Ch.park, 'You asked me what the benches were really for. This is what everything here is for, in the end. Watch. Say nothing.', 4.6); return 4.8; },
        () => { Ch.say(Ch.park, 'They can\'t hear us. They can see us, if they look up. They won\'t.', 3.2); return 3.4; },
        () => { Ch.shot([7.6, 1.6, 3.4], [6, 1.1, 8.6], false); Ch.techA.walk([[5.4, 8.9]], 1, (a) => a.face(6, 8.7)); Ch.say(Ch.techA, 'Subject twelve. Series Nine, the transmitter lot. Left side of the neck. You\'ll feel a pinch.', 4); return 4.2; },
        () => { DV.Audio.play('drink', { volume: 0.3 }); Ch.ike.action = 'sit_slump'; DV.UI.subtitle('', '[His head goes down. Then it comes up again, and his eyes are open, and there\'s nobody behind them.]', 4.4); return 4.6; },
        () => { Ch.shot([6.6, 1.7, 3.0], [8.5, 1.3, 9.5], false); Ch.say(Ch.techB, '[Into a microphone, bored:] Subject: stand up.', 2.6); return 2.2; },
        () => { Ch.ike.action = 'idle'; Ch.ike.place(6, 8.2, Math.PI); return 1.8; },
        () => { Ch.say(Ch.techB, 'Walk to the wall. Face it.', 2.4); Ch.ike.walk([[10.8, 6.2]], 1.0, (a) => a.face(12, 6.2)); return 4.2; },
        () => { Ch.say(Ch.techB, 'Raise your right hand. Say your name.', 2.8); Ch.ike.action = 'point'; return 2.6; },
        () => { Ch.say(Ch.ike, '[Flat, the way you\'d read a list:] Ike Moreno. Dauntless.', 3); return 3.2; },
        () => { Ch.say(Ch.techA, 'Response ninety-eight percent. He\'s awake. He\'ll remember a nap.', 3.4); return 3.6; },
        () => { Ch.shot([3.8, 1.75, 1.6], [4.6, 1.6, 3.2], false); Ch.park.face(DV.Player.x, DV.Player.z); Ch.say(Ch.park, '[Low:] A simulation serum with a transmitter in it. One signal, and whoever has had a dose does as they\'re told. Wide awake. I was asked to measure how long it keeps. Nobody asked me what it was for.', 6.2); return 6.4; },
        () => { Ch.cut(false); Ch.setFlag('free'); DV.UI.notify('Look round the gallery: the tray, the monitor, the delivery book. Then talk to Dr. Park.', 'info'); this.things(Ch); },
      ], 'watch');
    },
    things(Ch) {
      const look = (id, x, z, name, title, text, fx) => Ch.interact({ id, kind: 'action', x, y: 1.0, z, radius: 1.4, label: 'Examine', name, cond: () => !Ch.caught, onUse: () => {
        DV.UI.showReading(title, text);
        if (!Ch.seen[id]) { Ch.seen[id] = true; if (fx) fx(); if (Object.keys(Ch.seen).length === 2) Ch.after(4, () => this.intercom(Ch)); }
      } });
      look('sl_vials', 6.2, 1.25, 'The tray of vials', 'A Tray of Vials', 'Two dozen vials, Erudite blue, in a foam rack. Each one labelled in the same typed hand:\n\nS-9 · TRANSMITTER SUSPENSION\nALLOCATION: DAUNTLESS (ALL MEMBERS)\nLABEL FOR DISTRIBUTION AS: "TRACKER"\n\nThe rack holds twenty-four. The delivery slip under it says 1,400.', () => { DV.State.setFlag('saw_transmitter_serum'); if (K()) K().clue('s9_tracker', 'Series Nine — a simulation serum with a transmitter in it — is being sent to Dauntless labelled "tracker", one for every member.', {}); });
      look('sl_monitor', 2.4, 1.4, 'The monitor', 'The Monitor', 'Columns of subjects and responses, most of them 95, 97, 99 percent.\n\nOne line is different:\n\nSUBJECT 7 — RESPONSE: NONE (0%)\nNOTE: subject also on the Protocol D list. Non-response consistent with the anomaly. RECOMMEND: CALIBRATION.\n\n"Calibration" is underlined twice, in pencil.', () => { DV.State.setFlag('saw_divergent_nonresponse'); if (K()) K().clue('s9_divergent', 'The transmitter serum does nothing to people on the Protocol D list. Erudite\'s notes call that an anomaly to be "calibrated".', {}); });
      look('sl_log', 9.6, 1.6, 'The delivery book', 'The Delivery Book', 'Signed out, signed for:\n\nDauntless compound, infirmary stores — 400 — signed D.C.\nDauntless compound, infirmary stores — 400 — signed D.C.\nOffice of Public Order — 600 — signed (illegible), for the Directorate.\n\nThe column for "purpose" says MEDICAL every time, in the same pen.', () => { if (K()) K().clue('s9_dc', 'The transmitter serum was signed into the Dauntless infirmary by "D.C.", twice.', { suspect: 'dana' }); });
      FW().talkTo(Ch, Ch.park, 'tr_park', { id: 'talk_park', cond: () => Object.keys(Ch.seen).length >= 1 && !DV.Dialogue.isActive() });
    },
    // the intercom: someone upstairs has noticed the gallery isn't empty
    intercom(Ch) {
      if (Ch.caught) return;
      Ch.caught = true;
      DV.Audio.play('radio', { volume: 0.8 });
      Ch.voice('The intercom', '[A woman\'s voice, pleasant and exact, from a speaker in the ceiling:] Dr. Park. I see you have company in Gallery B. Who is it?', 5);
      Ch.after(5.2, () => { Ch.park.face(DV.Player.x, DV.Player.z); Ch.scene('tr_park_cover'); });
    },
    after(Ch) {
      FW().talkTo(Ch, Ch.park, 'tr_park', { id: 'talk_park' });
      Ch.ike.place(6, 8.7, Math.PI); Ch.ike.action = 'sit';
    },
    onDialogueEnd(Ch, e) {
      if (e.tree === 'tr_park' && Ch.flag('talked')) T.finish(Ch, 'erudite', T.st().erudite_cover || 'saw', 'THE SERUM IN THE BLUE VIALS · ' + (DV.State.flag('saw_divergent_nonresponse') ? 'IT DOES NOTHING TO SOME PEOPLE' : 'ONE FOR EVERY MEMBER'));
    },
  });
  const pk = (o) => Object.assign({ speaker: 'Dr. Helen Park', faction: 'erudite' }, o);
  DV.DialogueDB.add('tr_park_cover', {
    entry: 'start',
    nodes: {
      start: pk({
        text: '[She keeps her eyes on the speaker grille.] Dean, it\'s — [She looks at you. She\'s asking.]',
        choices: [
          { text: '(Let her lie for you.) "I\'m her note-taker."', end: true, effect: () => { T.st().erudite_cover = 'covered'; DV.Chapter.voice('The intercom', 'Then take good notes. [A click.]', 3); if (K()) K().trust('park', 1, 'She lied to the Dean for you.'); } },
          { text: '"An initiate. I asked to see." [RESOLVE 6]', check: { attr: 'resolve', dc: 6 }, fail: 'fail', to: 'truth' },
          { text: '(Say nothing. Let her decide.)', end: true, effect: () => { T.st().erudite_cover = 'silent'; DV.Chapter.voice('The intercom', 'Send whoever it is up to me when you\'re finished, Helen. [A click.]', 3.5); DV.State.setFlag('dean_knows_you'); } },
        ],
      }),
      truth: pk({ text: '[A pause from the ceiling. Then:] Curiosity. How Erudite of you. Don\'t make a habit of it. [A click.] [Dr. Park lets out a breath she seems to have been holding since Tuesday.]', endText: '...', onEnter: () => { T.st().erudite_cover = 'truth'; DV.State.setFlag('dean_knows_you'); if (K()) K().trust('park', 1, 'You didn\'t make her lie.'); } }),
      fail: pk({ text: '[Your voice comes out smaller than you meant.] [The ceiling waits. Then:] Send the initiate up to me, Helen. [A click. Dr. Park closes her eyes.]', endText: '...', onEnter: () => { T.st().erudite_cover = 'silent'; DV.State.setFlag('dean_knows_you'); } }),
    },
  });
  DV.DialogueDB.add('tr_park', {
    entry: 'start',
    nodes: {
      start: pk({
        text: () => '[Behind the glass they\'re walking Ike back to his chair.] ' + (DV.State.flag('saw_divergent_nonresponse') ? 'You saw subject seven. Yes. Nothing. Not a flicker. [She doesn\'t look at you.] I\'d rather you hadn\'t, and I\'m glad you did.' : 'Well? You\'re allowed questions in here. It\'s the one room where nobody can hear them.'),
        choices: [
          { text: '"That\'s not a tracker. It\'s a leash."', to: 'leash' },
          { text: '"Why show me this?"', to: 'why' },
          { text: '"It didn\'t work on one of them."', to: 'seven', if: () => DV.State.flag('saw_divergent_nonresponse') },
          { text: '"I\'ve seen enough."', end: true, effect: () => DV.Chapter.setFlag('talked') },
        ],
      }),
      leash: pk({ text: 'It\'s both. It\'s whatever the person holding the signal wants it to be. That\'s the trouble with a good instrument. [She closes her notebook.] Don\'t say that word upstairs.', next: 'start', nextText: 'I won\'t.', onEnter: () => DV.State.setFlag('park_leash') }),
      why: pk({ text: 'Because I\'m a scientist, and a scientist needs a witness. And because you look at the room before you look at the target. [A thin smile.] Somebody told me Dauntless instructors say that too.', next: 'start', nextText: '...' }),
      seven: pk({ text: 'Subject seven is on a list I\'m not supposed to know exists. Anyone on it... the serum simply doesn\'t find them. Upstairs, that makes them a problem. [Quietly:] Down here, it makes them interesting. Be one or the other carefully.', next: 'start', nextText: '...', onEnter: () => { if (K()) K().trust('park', 1, 'She told you about subject seven.'); } }),
    },
  });

  /* ============================== ABNEGATION: THE BREAD LINE ============================== */
  DV.Chapter.define('trial_abnegation', {
    zone: 'abn_street', title: 'ABNEGATION\nTHE BREAD LINE · DAY 6', day, time: '17:20',
    start(Ch, zone, opts) {
      DV.Audio.setMusic('calm');
      Ch.fed = 0; Ch.giveT = 0; Ch.stall = 0; Ch.over = false; Ch.talked = {};
      Ch.joan = Ch.actor({ id: 'joan', name: 'Elder Joan Hayes', faction: 'abnegation', app: adult('abnegation', 'f', 'joan-hayes', 66, 1.0), x: 45.6, z: 11.6, rot: Math.PI / 2, action: 'idle' });
      // the cart, a loaf for each of them
      const g = new THREE.Group(), wood = new THREE.MeshLambertMaterial({ color: 0x6a5a48 }), bread = new THREE.MeshLambertMaterial({ color: 0xb08850 });
      const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
      box(1.8, 0.1, 1.0, wood, 0, 0.55, 0); box(1.8, 0.35, 0.05, wood, 0, 0.78, 0.48); box(1.8, 0.35, 0.05, wood, 0, 0.78, -0.48);
      Ch.loaves = [];
      for (let k = 0; k < 10; k++) Ch.loaves.push(box(0.26, 0.12, 0.14, bread, -0.65 + (k % 5) * 0.3, 0.67, -0.25 + Math.floor(k / 5) * 0.3));
      g.position.set(47, 0, 10.2); Ch.addObject(g);
      // the queue, the length of the corner
      Ch.line = [];
      for (let i = 0; i < 10; i++) {
        const a = Ch.actor({ id: 'q' + i, name: DV.Names ? DV.Names.person('factionless', i % 2 ? 'f' : 'm', 'bl' + i, new Set()) : 'Factionless', faction: 'factionless', app: adult('factionless', i % 3 ? 'm' : 'f', 'breadline' + i, 20 + i * 6, 1.0), x: 49.2 + i * 0.9, z: 9.6 + (i % 2) * 0.25, rot: -Math.PI / 2, action: i % 4 === 3 ? 'crouch' : 'idle' });
        Ch.line.push(a);
      }
      // the patrol: two Dauntless in the Order's armbands, and their supervisor with her tablet
      Ch.patrol = [
        Ch.actor({ id: 'sup', name: 'Supervisor Ines Kemp', faction: 'erudite', app: adult('erudite', 'f', 'sup-kemp', 41), x: 2, z: 8, rot: Math.PI / 2, action: 'clipboard' }),
        Ch.actor({ id: 'pa', name: 'Order Patrol', faction: 'dauntless', app: adult('dauntless', 'm', 'order-a', 28), x: 1, z: 7, rot: Math.PI / 2, action: 'idle' }),
        Ch.actor({ id: 'pb', name: 'Order Patrol', faction: 'dauntless', app: adult('dauntless', 'f', 'order-b', 25), x: 1, z: 9.2, rot: Math.PI / 2, action: 'idle' }),
      ];
      for (const a of Ch.patrol) a.model.root.visible = false;
      FW().placePlayer(46, 9.6, Math.PI / 2);
      if (opts.step === 'end') { Ch.over = true; FW().talkTo(Ch, Ch.joan, 'tr_joan', { id: 'talk_joan' }); return; }
      Ch.checkpoint('line');
      Ch.interact({ id: 'bl_give', kind: 'action', x: 47.8, y: 0.9, z: 9.6, radius: 1.8, label: 'Hand out a loaf', name: 'The cart', cond: () => !Ch.over && Ch.giveT <= 0 && Ch.fed < Ch.line.length, onUse: () => this.give(Ch) });
      Ch.interact({ id: 'bl_patrol', kind: 'action', x: () => Ch.patrol[0].x, y: 1.4, z: () => Ch.patrol[0].z, radius: 2.2, label: 'Talk to the supervisor', name: 'Supervisor Ines Kemp', cond: () => !Ch.over && Ch.patrolOn && !DV.Dialogue.isActive(), onUse: () => { Ch.patrol[0].face(DV.Player.x, DV.Player.z); Ch.scene('tr_patrol', { speaker: 'Supervisor Ines Kemp', faction: 'erudite' }); } });
      Ch.seq([
        () => 1.4,
        () => { Ch.say(Ch.joan, 'One each. Look at them when you hand it over. That\'s the part they remember.', 4); return 4.2; },
        () => { Ch.say(Ch.line[0], '[An old man, both hands out.] Thank you, Elder. Thank you.', 3); return 9; },
        () => { this.patrolComes(Ch); },
      ], 'line');
    },
    give(Ch) {
      const a = Ch.line[Ch.fed];
      if (!a) return;
      Ch.giveT = 1.6;
      const loaf = Ch.loaves[Ch.fed]; if (loaf) loaf.visible = false;
      Ch.fed++;
      DV.Audio.play('paper', { volume: 0.5 });
      Ch.say(a, U.pick(['Thank you.', 'Bless you, Abnegation.', '[A nod. No words. The bread goes inside the coat.]', 'For my sister. Thank you.', 'You\'re new. Thank you.']), 2);
      a.walk([[a.x + 6, 13.8], [62, 13.8]], 1.3, (x) => { x.model.root.visible = false; });
      // the rest shuffle up
      Ch.line.slice(Ch.fed).forEach((b, i) => b.walk([[49.2 + i * 0.9, b.z]], 0.9));
      if (Ch.fed >= Ch.line.length) this.end(Ch, 'all');
    },
    patrolComes(Ch) {
      if (Ch.over) return;
      Ch.patrolOn = true;
      for (const a of Ch.patrol) a.model.root.visible = true;
      DV.Audio.play('radio', { volume: 0.7 });
      DV.UI.notify('An Order patrol, coming down the street from the west. Hand out what you can — or go and talk to them.', 'quest');
      Ch.say(Ch.joan, '[Not looking up.] Keep going. Don\'t hurry. Hurrying looks like guilt.', 3.4);
    },
    update(Ch, dt) {
      Ch.giveT -= dt;
      if (!Ch.patrolOn || Ch.over) return;
      if (DV.Dialogue.isActive()) return;
      if (Ch.stall > 0) { Ch.stall -= dt; for (const a of Ch.patrol) { a.queue = []; } return; }
      // they come on at a walk, the supervisor in front
      const lead = Ch.patrol[0];
      if (!lead.moving) {
        const tx = Math.min(42, lead.x + 3);
        Ch.patrol.forEach((a, i) => a.walk([[tx - (i ? 1 : 0), 8 + (i === 1 ? -1.2 : i === 2 ? 1.2 : 0)]], 1.0));
      }
      if (lead.x > 41.5) this.disperse(Ch);
    },
    disperse(Ch) {
      if (Ch.over) return;
      Ch.over = true;
      Ch.cut(true);
      Ch.shot([40, 2.4, 13], [48, 1.2, 9.5], false);
      Ch.say(Ch.patrol[0], 'This is an unlicensed assembly after the sixteen-hundred notice. Disperse. Faces to me as you go, please.', 4);
      DV.Audio.play('murmur', { secs: 1.6 });
      Ch.line.slice(Ch.fed).forEach((a, i) => a.run([[a.x + 4 + i, 15], [64, 15]]));
      Ch.after(1.5, () => Ch.patrol[0].action = 'clipboard');
      Ch.after(4.4, () => { DV.UI.subtitle('', '[She holds the tablet up to each face as it passes, and the tablet makes a small sound each time.]', 4); if (K()) K().clue('order_scans_breadline', 'The Order scanned the faces of everyone in Joan\'s bread line, and Joan\'s with them.', {}); });
      Ch.after(8.8, () => { Ch.cut(false); this.end(Ch, 'dispersed'); });
    },
    end(Ch, how) {
      Ch.over = true;
      T.st().abnegation_fed = Ch.fed;
      DV.State.setFlag(how === 'all' ? 'breadline_all' : 'breadline_dispersed');
      if (how === 'all') { if (K()) K().trust('joan', 1, 'You kept the bread line open with the Order coming.'); DV.Reputation.add('abnegation', 3); DV.Reputation.add('factionless', 3); }
      Ch.after(1.2, () => { Ch.joan.face(DV.Player.x, DV.Player.z); Ch.scene('tr_joan'); });
    },
    onDialogueEnd(Ch, e) {
      if (e.tree === 'tr_patrol' && Ch.stall > 0) Ch.after(0.3, () => Ch.say(Ch.patrol[0], '[She lowers the tablet.] Five minutes. Then I come back and count.', 3));
      if (e.tree === 'tr_joan' && !T.done('abnegation')) T.finish(Ch, 'abnegation', Ch.fed >= Ch.line.length ? 'all' : 'dispersed', Ch.fed + ' OF ' + Ch.line.length + ' FED · ' + (Ch.fed >= Ch.line.length ? 'THE LINE STAYED OPEN' : 'THE ORDER BROKE IT UP'));
    },
  });
  const stall = (key, secs) => () => { const C = DV.Chapter; if (C.talked[key]) return; C.talked[key] = true; C.stall = secs; };
  DV.DialogueDB.add('tr_patrol', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Supervisor Ines Kemp', faction: 'erudite',
        text: '[An Erudite in a grey coat with the Order\'s blue band on the sleeve, a tablet held like a hymn book.] Abnegation. You know about the notice. Assemblies of more than six, outside, after sixteen hundred.',
        choices: [
          { text: '"It\'s bread. It isn\'t a meeting." [CHARISMA 6]', check: { attr: 'charisma', dc: 6 }, fail: 'no', to: 'yes', if: () => !DV.Chapter.talked.cha },
          { text: '"Section four of the notice: food distribution is exempt until twenty-one hundred." [INTELLIGENCE 7]', check: { attr: 'intelligence', dc: 7 }, fail: 'no', to: 'law', if: () => !DV.Chapter.talked.int },
          { text: '"Count us, then. We\'ll wait." [RESOLVE 7]', check: { attr: 'resolve', dc: 7 }, fail: 'no', to: 'wait', if: () => !DV.Chapter.talked.res },
          { text: '(Go back to the cart.)', end: true },
        ],
      },
      yes: { speaker: 'Supervisor Ines Kemp', faction: 'erudite', text: '[She looks at the queue, the cart, the old woman handing out loaves.] ...Bread. Fine. Be quick about it.', endText: 'Thank you.', onEnter: stall('cha', 30) },
      law: { speaker: 'Supervisor Ines Kemp', faction: 'erudite', text: '[She scrolls. Her mouth tightens.] It does say that. [She makes a note of your face as well, while she\'s there.]', endText: '...', onEnter: () => { stall('int', 40)(); DV.State.setFlag('order_noted_you'); } },
      wait: { speaker: 'Supervisor Ines Kemp', faction: 'erudite', text: '[You stand between her and the line and don\'t move. The two Dauntless behind her look at each other.] ...We\'ll be back down this street in five minutes.', endText: '...', onEnter: stall('res', 25) },
      no: { speaker: 'Supervisor Ines Kemp', faction: 'erudite', text: 'I\'m sure you believe that. Step aside, please.', endText: '...', onEnter: () => { DV.Chapter.talked.fail = true; } },
    },
  });
  DV.DialogueDB.add('tr_joan', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Elder Joan Hayes', faction: 'abnegation',
        text: () => (DV.Chapter.fed >= 10 ? '[The cart\'s empty. She folds the cloth that covered the bread, corner to corner.] Every one of them. With them standing there. [She doesn\'t say well done. Abnegation doesn\'t.] They will remember your face, the Order. So will the people in that line.' : '[She watches the patrol go, the tablet still lit.] They have our faces now. All of them. [Quietly:] We\'ll do it again on Thursday, from a different corner. That\'s all there is to do.'),
        choices: [
          { text: '"Why does the Order care about bread?"', to: 'why' },
          { text: '"I\'ll be here Thursday."', end: true, effect: () => DV.State.setFlag('breadline_thursday') },
        ],
      },
      why: { speaker: 'Elder Joan Hayes', faction: 'abnegation', text: 'Because hungry people are frightened people, and frightened people do as they\'re told. Fed people ask questions. [She puts the cloth away.] Somebody in Erudite has done that sum.', endText: '...' },
    },
  });

  /* ============================== AMITY: THE SECOND SUPPER ============================== */
  DV.Chapter.define('trial_amity', {
    zone: 'amity_day', title: 'AMITY\nTHE SECOND SUPPER · DAY 6', day, time: '19:20',
    start(Ch, zone, opts) {
      DV.Audio.setMusic('orchard');
      Ch.ate = false; Ch.calm = 0;
      Ch.mary = Ch.actor({ id: 'mary', name: 'Mary Ellis', faction: 'amity', app: adult('amity', 'f', 'mary-ellis', 58, 1.0), x: 15.8, z: 10.6, rot: 0, action: 'sit' });
      Ch.ruth = Ch.actor({ id: 'ruth', name: 'Ruth Calder', faction: 'amity', app: adult('amity', 'f', 'ruth-calder', 61, 1.0), x: 14.2, z: 10.8, rot: 0.2, action: 'sit' });
      Ch.tom = Ch.actor({ id: 'tom', name: 'Tom Asher', faction: 'amity', app: adult('amity', 'm', 'tom-asher', 38, 1.04), x: 16.9, z: 13.2, rot: Math.PI, action: 'sit' });
      // the two at the far table, at each other's throats over a spade
      Ch.jo = Ch.actor({ id: 'jo', name: 'Jo Pruitt', faction: 'amity', app: adult('amity', 'm', 'jo-pruitt', 33), x: 30.2, z: 12.4, rot: Math.PI / 2, action: 'argue' });
      Ch.wil = Ch.actor({ id: 'wil', name: 'Wil Hanley', faction: 'amity', app: adult('amity', 'm', 'wil-hanley', 45), x: 31.8, z: 12.2, rot: -Math.PI / 2, action: 'argue' });
      // the tin, by Mary's elbow
      const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0xc8b070 }));
      tin.position.set(15.4, 0.82, 11.4); Ch.addObject(tin);
      FW().placePlayer(15.2, 13.3, Math.PI);
      if (opts.step === 'end') { this.finale(Ch); return; }
      Ch.checkpoint('supper');
      Ch.interact({ id: 'pb_tin', kind: 'action', x: 15.4, y: 0.9, z: 11.6, radius: 1.4, label: 'Look at the tin', name: 'A tin by Mary\'s elbow', onUse: () => {
        DV.UI.showReading('A Tin', 'A plain tin with a screw lid, the kind tea comes in. Inside: a white powder and a little spoon. The label is the dispensary\'s:\n\nSERIES 7 — MILD\nFOR THE BREAD\nDISPENSARY USE ONLY\n\nSomebody has drawn a small sun on it in pencil.');
        DV.State.setFlag('knows_peace_bread');
        if (K()) K().clue('peace_tin_series7', 'Amity\'s "peace tin" is labelled Series 7, from the dispensary. It goes into the bread.', {});
      } });
      Ch.cut(true);
      Ch.shot([22, 2.6, 16.5], [30.8, 1.2, 12.3], true);
      Ch.seq([
        () => 1.2,
        () => { Ch.say(Ch.jo, 'You took it and you didn\'t even put it BACK, Wil, it was in the ditch —', 3.4); return 3.0; },
        () => { Ch.say(Ch.wil, 'It\'s not YOUR spade! Nothing here is anybody\'s, that\'s the whole — don\'t you point at me —', 3.4); Ch.jo.action = 'point'; return 3.4; },
        () => { Ch.shot([18, 1.9, 15.5], [15.6, 1.0, 11], false); Ch.say(Ch.mary, '[Not raising her voice:] Bread, both of you. Sit down and eat something. It\'s still warm.', 3.6); return 3.8; },
        () => { Ch.jo.walk([[29.6, 12.4]], 1); Ch.jo.action = 'sit'; Ch.wil.action = 'sit'; DV.UI.subtitle('', '[The basket goes down the table and over to theirs. They each tear a piece off without looking at it.]', 4); return 4.4; },
        () => { Ch.shot([26.4, 1.7, 15], [31, 1.1, 12.3], false); return 3.2; },
        () => { Ch.say(Ch.jo, '— in the ditch, and — [He stops. He laughs.] Oh, it doesn\'t matter. It really doesn\'t, does it?', 3.6); Ch.jo.action = 'sit_clap'; return 3.8; },
        () => { Ch.say(Ch.wil, '[Laughing too, a beat too long:] It doesn\'t! It really doesn\'t!', 3); Ch.wil.action = 'sit_cheer'; return 3.2; },
        () => {
          const sharp = DV.State.data.aptitude.divergent || DV.Stats.attr('perception') >= 6;
          DV.UI.subtitle('', sharp ? '[Thirty seconds ago he wanted to hit him. Now they\'re both smiling at nothing, the same smile, the one the whole table has.]' : '[Everybody\'s laughing now. It\'s a lovely evening. Isn\'t it?]', 5);
          if (sharp) DV.State.setFlag('noticed_peace_bread');
          return 5.2;
        },
        () => { Ch.shot([16.6, 1.6, 15.2], [15.2, 0.9, 12.2], false); Ch.say(Ch.mary, 'Here — [the basket, held out to you] — there\'s plenty.', 2.8); return 2.4; },
        () => { Ch.cut(false); Ch.interact({ id: 'pb_bread', kind: 'action', x: 15.2, y: 0.9, z: 12.4, radius: 1.8, label: 'The basket of bread', name: 'Mary\'s bread', cond: () => !Ch.chose, onUse: () => Ch.scene('tr_bread', { speaker: 'Mary Ellis', faction: 'amity' }) }); DV.UI.notify('The basket is in front of you.', 'info'); },
      ], 'supper');
    },
    // the bread, in you: everything is fine, everything is lovely, everything is slow
    eat(Ch) {
      Ch.ate = true; Ch.calm = 1;
      Ch.div = !!DV.State.data.aptitude.divergent;
      DV.Player.moveScale = 0.7;
      DV.Audio.setMusic('orchard');
      Ch.hud = U.el('div', 'peace-hud', '<div class="pl">Peace</div><div class="pb"><i></i></div>', DV.UI.root);
      Ch.addObject({ dispose: () => { if (Ch.hud) Ch.hud.remove(); Ch.hud = null; DV.Fear.look(0); DV.Player.moveScale = 1; } });
      DV.UI.subtitle('', '[Warm. It\'s so warm. The light goes the colour of honey, and the people round you are the people you love most in the world, all of them, even the ones you don\'t know.]', 6);
      if (Ch.div) Ch.after(6.5, () => { Ch.broke = true; DV.UI.glitch(); DV.UI.subtitle('', '[— and then it slides off you, the way water slides off oil. The table is just a table. Everybody at it is still smiling. Mary is looking at you.]', 6); DV.State.setFlag('bread_immune_seen'); });
    },
    update(Ch, dt) {
      if (!Ch.ate) return;
      if (Ch.broke) Ch.calm = Math.max(0, Ch.calm - dt * 0.6); else Ch.calm = Math.max(0, Ch.calm - dt / 40);
      const k = Ch.calm;
      DV.Fear.look(0, k > 0.02 ? 'sepia(' + (0.45 * k).toFixed(3) + ') saturate(' + (1 + 0.4 * k).toFixed(3) + ') brightness(' + (1 + 0.1 * k).toFixed(3) + ') blur(' + (0.8 * k).toFixed(2) + 'px)' : '');
      DV.Player.moveScale = 1 - 0.3 * k;
      if (Ch.hud) Ch.hud.querySelector('i').style.width = Math.round(k * 100) + '%';
      if (k <= 0 && Ch.hud) { Ch.hud.remove(); Ch.hud = null; DV.Fear.look(0); DV.Player.moveScale = 1; }
      if (k > 0.3 && Math.random() < dt * 0.15) DV.UI.subtitle('', U.pick(['[Everything is very simple.]', '[You should tell them all how much you like them.]', '[What were you worried about? You can\'t remember. It doesn\'t matter.]']), 3);
    },
    finale(Ch) {
      Ch.checkpoint('end');
      FW().talkTo(Ch, Ch.mary, 'tr_mary', { id: 'talk_mary' });
      Ch.after(1.0, () => { Ch.mary.face(DV.Player.x, DV.Player.z); Ch.scene('tr_mary'); });
    },
    onDialogueEnd(Ch, e) {
      if (e.tree === 'tr_bread' && Ch.chose && !Ch.finaleT) { Ch.finaleT = true; Ch.after(Ch.ate ? 12 : 3, () => this.finale(Ch)); }
      if (e.tree === 'tr_mary' && !T.done('amity')) T.finish(Ch, 'amity', Ch.chose, Ch.chose === 'ate' ? (Ch.div ? 'YOU ATE IT · IT DID NOTHING TO YOU · MARY SAW' : 'YOU ATE IT · EVERYTHING WAS LOVELY') : Ch.chose === 'pocket' ? 'A PIECE OF IT IN YOUR POCKET' : 'YOU PASSED THE BASKET ON');
    },
  });
  const MA = { speaker: 'Mary Ellis', faction: 'amity' };
  DV.DialogueDB.add('tr_bread', {
    entry: 'start',
    nodes: {
      start: Object.assign({}, MA, {
        text: '[Warm bread, still steaming, in a basket with a cloth over it. Mary is smiling at you. Everyone is smiling at you.]',
        choices: [
          { text: '(Eat it.)', end: true, effect: () => { const C = DV.Chapter; C.chose = 'ate'; C.script.eat(C); } },
          { text: '(Take a piece, and slip it into your pocket when nobody\'s looking.) [AGILITY 5]', check: { attr: 'agility', dc: 5 }, end: true, effect: () => { DV.Chapter.chose = 'pocket'; DV.Inventory.add('peace_bread', 1); DV.State.setFlag('pocketed_peace_bread'); if (K()) K().clue('peace_bread_sample', 'You kept a piece of the peace bread from the Amity supper, uneaten.', {}); } },
          { text: '"I\'m not hungry, thanks." (Pass the basket on.)', end: true, effect: () => { DV.Chapter.chose = 'passed'; DV.State.setFlag('refused_peace_bread'); } },
        ],
      }),
      caught: Object.assign({}, MA, { text: '[Mary sees. Of course she sees. She doesn\'t say anything. She just tears you a second piece, and watches until you eat it.]', endText: '...', onEnter: () => { const C = DV.Chapter; C.chose = 'ate'; C.script.eat(C); DV.State.setFlag('mary_saw_pocket'); } }),
    },
  });
  DV.DialogueDB.add('tr_mary', {
    entry: 'start',
    nodes: {
      start: Object.assign({}, MA, {
        text: () => (DV.Chapter.chose === 'ate' && DV.Chapter.div ? '[She sits down beside you when the others have gone.] It didn\'t take, did it. I watched your face. [Gently:] It\'s only a little something from the dispensary. It keeps the peace.' : '[She sits down beside you when the others have gone.] Jo and Wil are going to dig the ditch together tomorrow. Singing, probably. [She smiles.] It\'s only a little something from the dispensary, in the bread. It keeps the peace.'),
        choices: [
          { text: '"You\'re drugging them. All of them." [CHARISMA 6]', check: { attr: 'charisma', dc: 6 }, fail: 'shrug', to: 'doubt' },
          { text: '"Did any of them choose that?"', to: 'choose' },
          { text: '"It works. That\'s something."', end: true, effect: () => DV.State.setFlag('accepted_peace_bread') },
        ],
      }),
      doubt: Object.assign({}, MA, { text: '[For the first time since you\'ve known her, she has nothing ready to say.] ...It\'s a mild one. They told me it was mild. [She looks at the tin.] Who\'s "they", I wonder. I\'ve never asked.', endText: '...', onEnter: () => { DV.State.setFlag('mary_doubts'); if (K()) K().trust('mary', 1, 'You made her ask where the tin comes from.'); } }),
      choose: Object.assign({}, MA, { text: 'Nobody chooses to be angry, either. [It sounds like something she\'s said before, to herself, a lot of times.] Go to bed, love.', endText: 'Good night, Mary.' }),
      shrug: Object.assign({}, MA, { text: 'Drugging is such an ugly word. [She pats your hand.] Go to bed, love. You\'ll feel differently in the morning.', endText: '...' }),
    },
  });
  Object.assign(DV.Items.defs, {
    peace_bread: { id: 'peace_bread', name: 'A Piece of Amity Bread', cat: 'misc', usable: false, desc: 'From the long tables in the orchard, still a little warm when you hid it. The whole table laughed after eating this. You didn\'t.', icon: { shape: 'bar', color: '#b08850' } },
  });

  const css = document.createElement('style');
  css.textContent = [
    '.peace-hud { position: absolute; right: 16px; top: 16px; padding: 8px 12px; background: rgba(40, 30, 10, 0.6); border: 1px solid #000; box-shadow: inset 0 0 0 1px #806a30; width: 180px; pointer-events: none; }',
    '.peace-hud .pl { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #e8c880; margin-bottom: 4px; }',
    '.peace-hud .pb { height: 6px; background: #1a140a; border: 1px solid #000; } .peace-hud i { display: block; height: 100%; width: 100%; background: #e8b860; }',
  ].join('\n');
  document.head.appendChild(css);

  DV.Trials = T;
})();
