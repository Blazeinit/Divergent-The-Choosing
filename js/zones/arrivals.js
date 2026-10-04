/* ==========================================================================
   DIVERGENT — Build 2, chapter 3 (the other four): arrival
   What the first hour in your new faction looks like:
   - Abnegation: no speech. They hand you a crate of bread and point you at
     the factionless waiting at the corner.
   - Erudite: the reading hall at headquarters, and an entrance question.
   - Candor: the black-and-white lobby, and three questions in front of
     everyone — answered truthfully or not (they'll know).
   - Amity: the orchard at sunset, an apple to share, the circle round the fire.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const PL = () => DV.State.data.player;
  const adult = (f, sex, seed, age, h) => { const a = DV.Character.fromFaction(f, sex, seed, { age: age || 40 }); a.height = (a.height || 1) * (h || 1.05); return a; };
  const DRESS = {
    abnegation: 'Someone presses a folded set of greys into your hands. They fit. They always fit.',
    erudite: 'A pressed blue jacket is waiting on your bunk, a pair of reading glasses in the pocket, just in case.',
    candor: 'Black and white, crisp as a verdict. You change in a room with no mirrors to hide behind.',
    amity: 'Someone hands you a soft red shirt and a yellow scarf that smells of woodsmoke and apples.',
  };
  const welcomeBanner = (Ch, f, l2) => {
    DV.Build2.dressFor(f, DRESS[f]);
    DV.Quests.setObj('new_faction', 'arrive', 'done', 'Your first hour as ' + DV.Factions.name(f) + '.');
    DV.Quests.complete('new_faction', f);
    Ch.checkpoint('done');
    Ch.banner('WELCOME TO ' + DV.Factions.name(f).toUpperCase(), l2, 'Click or press any key to continue · Build 3: The First Week', () => {
      DV.FirstWeek.begin(f);
    });
  };
  // a save made after the welcome: look around, and start the week when you're ready
  const weekWaits = (Ch, f, a) => {
    Ch.interact({ id: 'begin_week', kind: 'action', x: () => a.x, y: 1.4, z: () => a.z, radius: 1.9, label: 'Begin your first week', name: a.name, onUse: () => DV.FirstWeek.begin(f) });
  };
  // the other initiates, scattered near a point
  function initiatesNear(Ch, f, x, z, faceX, faceZ) {
    const list = DV.Hub ? DV.Hub.initiatesOf(f) : [];
    return list.slice(0, 6).map((p, i) => {
      const a = Ch.actor({ id: p.id, name: p.name, app: p.app, x: x + (i % 3) * 1.3 - 1.3, z: z + Math.floor(i / 3) * 1.3, rot: 0, action: 'idle' });
      a.face(faceX, faceZ);
      return a;
    });
  }
  const sayBeat = (Ch, a, line, t) => () => { Ch.say(a, DV.Dialogue.fill(line, {}), t || 3.6); return (t || 3.6) + 0.4; };

  /* ------------------------------ props ------------------------------ */
  // an Abnegation house: two plain grey storeys, all the same
  DV.Props.define('grey_house', (ctx, p, B) => {
    const wall = ctx.M('concrete_panel'), dark = ctx.M('glass_dark'), trim = ctx.M('concrete_dark'), door = ctx.M('metal_painted');
    const w = p.w || 7, d = p.d || 8, h = p.h || 6;
    B.box(wall, 0, 0, -d / 2, w, h, d);
    B.box(trim, 0, h, -d / 2, w + 0.3, 0.25, d + 0.3);
    B.box(trim, 0, 0, 0.3, 1.6, 0.18, 0.7); // step
    B.panel(door, 0, 1.05, 0.012, 0.95, 2.1);
    for (const x of [-w / 2 + 1.3, w / 2 - 1.3]) { B.panel(dark, x, 1.6, 0.012, 1.1, 1.2); B.panel(dark, x, 4.3, 0.012, 1.1, 1.2); }
    B.panel(dark, 0, 4.3, 0.012, 1.1, 1.2);
    ctx.collide(-w / 2, -d, w / 2, 0, { y1: h });
  });
  // a bonfire (the flames are animated by the Amity chapter)
  DV.Props.define('fire_ring', (ctx, p, B) => {
    const stone = ctx.M('concrete_dark'), wood = ctx.M('wood');
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; B.box(stone, Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9, 0.35, 0.25, 0.35); }
    for (let k = 0; k < 4; k++) { B.push(0, 0.1, 0, (k / 4) * Math.PI); B.box(wood, 0, 0, 0, 1.2, 0.12, 0.14); B.pop(); }
    ctx.collide(-1, -1, 1, 1, { y1: 0.6 });
  });

  /* ============================== ABNEGATION ============================== */
  (function () {
    const props = [];
    const add = (type, x, z, o) => props.push(Object.assign({ type, x, z }, o || {}));
    for (let i = 0; i < 6; i++) { add('grey_house', 6 + i * 9, -0.2, { rotDeg: 0 }); add('grey_house', 6 + i * 9, 16.2, { rotDeg: 180 }); }
    add('lamp_post', 10.5, 1.2, { rotDeg: 90 }); add('lamp_post', 37.5, 1.2, { rotDeg: 90 }); add('lamp_post', 24, 14.8, { rotDeg: -90 }); add('lamp_post', 51, 14.8, { rotDeg: -90 });
    add('crate', 8, 13.6, { size: 0.8 }); add('bench', 30, 14.6, { rotDeg: 180, len: 2.4, seatable: false });
    DV.Zones.define('abn_street', {
      name: 'Abnegation Sector',
      region: 'The grey streets',
      chapter: true, noDiscover: true,
      bounds: { x0: -2, z0: -12, x1: 64, z1: 28 },
      buildingHeight: 1,
      fog: { color: 0x9aa0a6, near: 45, far: 300 },
      sky: { top: 0x63707c, horizon: 0xa9afb4, ground: 0x5a5c5f, skyline: false },
      exterior: { sunDir: [0.4, 0.8, 0.3], sunColor: [0.9, 0.88, 0.84], ambient: [0.52, 0.53, 0.56] },
      rooms: [{ id: 'abn_street', name: 'Abnegation Sector', x0: 0, z0: 0, x1: 60, z1: 16, exterior: true, floor: 'asphalt', edge: 'none' }],
      doors: [], props,
      spawn: { x: 4, z: 8, rot: Math.PI / 2 },
      build(ctx) {
        const city = DV.City.build({ seed: 501, campus: [-10, -14, 70, 30], gridX: [-470, -394, -318, -242, -166, -90, -16, 76, 152, 228, 304, 380, 456], gridZ: [-460, -396, -332, -268, -204, -140, -76, -20, 36, 100, 164, 228, 292, 356], radius: 520, hub: [260, 330], haze: 0x9aa0a6, track: { x0: -900, x1: 900, z0: -30, z1: -25.4, y: 7.4 } });
        ctx.add(city.group); ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
      },
    });
  })();
  DV.Chapter.define('arrival_abnegation', {
    zone: 'abn_street',
    title: 'ABNEGATION\nTHE GREY STREETS · DAY 2',
    day: 2, time: '11:30',
    start(Ch, zone, opts) {
      DV.Audio.setMusic('calm');
      if (opts.step !== 'done') { DV.Quests.activate('new_faction', 'arrive', 'Follow the elder down the street.'); Ch.checkpoint('street'); }
      Ch.elder = Ch.actor({ id: 'elder', name: 'Elder Joan Hayes', app: adult('abnegation', 'f', 'joan-hayes', 66, 1.0), x: 9, z: 8, rot: -Math.PI / 2, action: 'idle' });
      Ch.inits = initiatesNear(Ch, 'abnegation', 6, 10, 9, 8);
      // the factionless, waiting at the corner as they do every day
      Ch.poor = [0, 1, 2].map((i) => Ch.actor({ id: 'fl' + i, name: 'Factionless', app: adult('factionless', i === 1 ? 'f' : 'm', 'fl-abn' + i, 30 + i * 12), x: 53 + i * 1.6, z: 3 + (i % 2) * 1.2, rot: -Math.PI / 2, action: i === 1 ? 'crouch' : 'idle' }));
      if (PL().upbringing === 'abnegation') { Ch.mom = Ch.actor({ id: 'mom', name: 'Mom', app: DV.Build2.parentApp('mom'), x: 14, z: 13, rot: Math.PI, action: 'idle' }); }
      if (opts.step === 'done') { weekWaits(Ch, 'abnegation', Ch.elder); return; } // (a save from after the welcome: just be here)
      Ch.given = 0;
      Ch.seq([
        () => 1.0,
        sayBeat(Ch, Ch.elder, 'We don\'t make speeches here. We\'d rather show you.'),
        sayBeat(Ch, Ch.elder, PL().upbringing === 'abnegation' ? 'You know this street already. Now you choose it, which is different.' : 'You\'ll find we\'re not interesting people. That\'s rather the point.', 3.8),
        sayBeat(Ch, Ch.elder, 'There\'s bread in the crate by the door. The people at the corner haven\'t eaten today.', 3.8),
        () => { DV.Quests.activate('new_faction', 'arrive', 'Take bread from the crate and give it to the factionless at the corner (0/3).'); },
      ], 'abn');
      Ch.interact({ id: 'bread_crate', kind: 'action', x: 8, y: 0.8, z: 13.2, radius: 1.3, label: 'Take bread', name: 'Bread Crate', cond: () => !Ch.carrying && Ch.given < 3, onUse: () => { Ch.carrying = true; DV.Audio.play('pickup'); DV.UI.notify('You take a loaf of bread.', 'info'); } });
      Ch.poor.forEach((a, i) => Ch.interact({
        id: 'give' + i, kind: 'action', x: () => a.x, y: 1.2, z: () => a.z, radius: 1.4, label: 'Give bread', name: 'Factionless',
        cond: () => Ch.carrying && !a.fed,
        onUse: () => {
          a.fed = true; Ch.carrying = false; Ch.given++;
          Ch.say(a, ['Thank you.', 'Bless you, initiate.', '...You\'re new. You still look at us.'][i], 2.8);
          DV.Stats.practice('empathy', 1);
          DV.Reputation.add('abnegation', 2);
          DV.Quests.activate('new_faction', 'arrive', Ch.given < 3 ? 'Give bread to the factionless at the corner (' + Ch.given + '/3).' : 'Done.');
          if (Ch.given === 3) Ch.after(3, () => this.finish(Ch));
        },
      }));
    },
    finish(Ch) {
      Ch.elder.walk([[48, 6]], 1.1, (a) => a.face(DV.Player.x, DV.Player.z));
      Ch.seq([
        () => 2.4,
        sayBeat(Ch, Ch.elder, 'That\'s all Abnegation is. Again tomorrow. And the day after.', 3.6),
        () => welcomeBanner(Ch, 'abnegation', 'NOTHING FOR YOURSELF.'),
      ], 'fin');
    },
  });

  /* ============================== ERUDITE ============================== */
  (function () {
    const props = [];
    const add = (type, x, z, o) => props.push(Object.assign({ type, x, z }, o || {}));
    for (let x = 3; x < 30; x += 4.5) { add('shelf', x, 0.4, { len: 3.6, d: 0.45, levels: 5, h: 3.2 }); add('shelf', x, 23.6, { rotDeg: 180, len: 3.6, d: 0.45, levels: 5, h: 3.2 }); }
    for (const [x, z] of [[9, 9], [9, 15], [23, 9], [23, 15]]) add('table', x, z, { w: 3, d: 1.2, chairs: 4, top: 'wood' });
    add('crt_tv', 9, 9.2, { elev: 0.74 }); add('crt_tv', 23, 15.2, { elev: 0.74 });
    add('banner', 16, 23.9, { rotDeg: 180, faction: 'erudite', y: 6, h: 3.6 });
    add('sculpture', 16, 12, {});
    add('rug', 16, 12, { w: 6, d: 14, mat: 'carpet_blue' });
    DV.Zones.define('eru_hall', {
      name: 'Erudite Headquarters',
      region: 'The reading hall',
      chapter: true, noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 34, z1: 26 },
      buildingHeight: 10,
      fog: { color: 0x2b3440, near: 40, far: 160 },
      sky: { top: 0x5b6773, horizon: 0x9ca3a9, ground: 0x585b5d, skyline: false },
      rooms: [{ id: 'eru_hall', name: 'Reading Hall', x0: 0, z0: 0, x1: 32, z1: 24, h: 9, floor: 'marble_check', wall: 'paint_blue', ceiling: 'ceiling_tile', light: { ambient: [0.38, 0.4, 0.46], color: [0.85, 0.92, 1], intensity: 0.9, spacing: 5, range: 8, fixture: 'tube' } }],
      doors: [{ id: 'eru_door', x: 0, z: 12, dir: 'z', w: 2.4, type: 'glass', lock: 'none' }],
      windows: [{ id: 'eru_w1', x: 32, z: 6, dir: 'z', w: 5, sill: 1.0, top: 7.5 }, { id: 'eru_w2', x: 32, z: 18, dir: 'z', w: 5, sill: 1.0, top: 7.5 }],
      props,
      spawn: { x: 5, z: 12, rot: Math.PI / 2 },
      build(ctx) {
        const city = DV.City.build({ seed: 502, campus: [-20, -20, 50, 44], gridX: [-470, -394, -318, -242, -166, -90, -26, 58, 134, 210, 286, 362, 438], gridZ: [-460, -396, -332, -268, -204, -140, -76, -26, 50, 114, 178, 242, 306, 370], radius: 520, hub: [180, -240], haze: 0x9aa0a6 });
        ctx.add(city.group); ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
        ctx.interact({ id: 'eru_books', kind: 'examine', x: 7.5, y: 1.5, z: 1.0, radius: 1.4, label: 'Read', name: 'Bookshelf', title: 'A Book, Pulled at Random', text: 'A HISTORY OF THE FENCE, second edition, with corrections.\n\nThe margins are full of other people\'s notes, in five different hands, arguing with the author and with each other across forty years. Somebody has written "SOURCE?" eleven times on one page.\n\nYou realise you are smiling.' });
      },
    });
  })();
  DV.Chapter.define('arrival_erudite', {
    zone: 'eru_hall',
    title: 'ERUDITE\nHEADQUARTERS · DAY 2',
    day: 2, time: '11:30',
    canPass() { return true; },
    start(Ch, zone, opts) {
      DV.Audio.setMusic('calm');
      if (opts.step !== 'done') { DV.Quests.activate('new_faction', 'arrive', 'Speak with Dr. Park at the centre of the hall.'); Ch.checkpoint('hall'); }
      Ch.park = Ch.actor({ id: 'park', name: 'Dr. Helen Park', app: adult('erudite', 'f', 'helen-park', 52, 1.02), x: 16, z: 10, rot: -Math.PI / 2, action: 'clipboard' });
      Ch.inits = initiatesNear(Ch, 'erudite', 10, 12, 16, 10);
      Ch.crowdE = Ch.crowd([{ x: 8, z: 8.2, rot: 0, action: 'work' }, { x: 10, z: 9.8, rot: Math.PI, action: 'sit' }, { x: 22, z: 15.8, rot: Math.PI, action: 'sit' }, { x: 24, z: 14.2, rot: 0, action: 'read' }, { x: 28, z: 5, rot: -1.2, action: 'read' }], { faction: 'erudite', seed: 'eru', adults: true });
      Ch.crowdE.forEach((a) => { a.name = 'Erudite'; });
      if (opts.step === 'done') { weekWaits(Ch, 'erudite', Ch.park); return; }
      Ch.interact({ id: 'park_talk', kind: 'action', x: () => Ch.park.x, y: 1.4, z: () => Ch.park.z, radius: 1.8, label: 'Talk to', name: 'Dr. Helen Park', cond: () => !Ch.flag('quizzed'), onUse: () => { Ch.park.face(DV.Player.x, DV.Player.z); Ch.scene('erudite_entrance'); } });
      Ch.after(1.2, () => Ch.say(Ch.park, 'Initiates — over here, please. Don\'t touch the books yet. Yes, I know.', 3.6));
    },
    onDialogueEnd(Ch, e) {
      if (e.tree !== 'erudite_entrance' || !DV.State.flag('eru_quiz_done')) return;
      Ch.setFlag('quizzed');
      Ch.seq([
        () => 0.6,
        sayBeat(Ch, Ch.park, 'Your quarters are on the fourth floor. The library never closes. Some of us never leave it.', 3.8),
        () => welcomeBanner(Ch, 'erudite', 'THE QUESTIONS NEVER END.'),
      ], 'fin');
    },
  });
  DV.DialogueDB.add('erudite_entrance', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Dr. Helen Park', faction: 'erudite',
        text: () => (PL().upbringing === 'erudite' ? 'Welcome back — properly, this time. ' : 'A transfer. Good; we need fresh questions. ') + 'One small formality. There is no wrong answer. There is, however, a right one.\n\nA train leaves the Hub at noon going north at forty. Another leaves the fence at noon going south at sixty, on the same line. The line is two hundred long. Where do they meet?',
        choices: [
          { text: 'Eighty from the Hub.', to: 'right', effect: () => { DV.State.setFlag('eru_quiz_right'); DV.Stats.practice('logic', 2); DV.Reputation.add('erudite', 4); } },
          { text: 'Halfway. A hundred from each end.', to: 'wrong' },
          { text: 'They don\'t. Nobody runs two trains on one line.', to: 'clever', effect: () => { DV.Reputation.add('erudite', 2); DV.Stats.practice('observation', 1); } },
          { text: '[INTELLIGENCE 7] Eighty from the Hub — at quarter past two.', to: 'right2', check: { attr: 'intelligence', dc: 7 }, effect: () => { DV.State.setFlag('eru_quiz_right'); DV.Reputation.add('erudite', 6); DV.Stats.addXP(20, 'Showing off'); } },
        ],
      },
      right: { speaker: 'Dr. Helen Park', faction: 'erudite', text: 'Correct. Not quickly, but correctly, which is the order we prefer.', onEnter: (c) => c.setFlag('eru_quiz_done'), endText: 'Thank you.' },
      right2: { speaker: 'Dr. Helen Park', faction: 'erudite', text: '[She actually looks up from the clipboard.] And the time, unasked. Oh, you\'re going to be insufferable. Good.', onEnter: (c) => c.setFlag('eru_quiz_done'), endText: 'Thank you.' },
      wrong: { speaker: 'Dr. Helen Park', faction: 'erudite', text: 'Halfway assumes equal speeds. They aren\'t. Eighty from the Hub. [She makes a small mark.] Being wrong is allowed here. Staying wrong is not.', onEnter: (c) => c.setFlag('eru_quiz_done'), endText: 'Understood.' },
      clever: { speaker: 'Dr. Helen Park', faction: 'erudite', text: 'Ha. True — and not what I asked. Eighty from the Hub, if anyone ever did. Questioning the question is a habit we encourage. Within reason.', onEnter: (c) => c.setFlag('eru_quiz_done'), endText: 'Within reason.' },
    },
  });

  /* ============================== CANDOR ============================== */
  (function () {
    const props = [];
    const add = (type, x, z, o) => props.push(Object.assign({ type, x, z }, o || {}));
    add('emblem', 14, 21.9, { rotDeg: 180, faction: 'candor', y: 4.2, size: 3.4 });
    add('floor_emblem', 14, 11, { size: 6, color: '#e8e6e0', bg: '#111111' });
    for (const x of [4, 24]) add('column', x, 11, { h: 8, size: 0.9, mat: 'white' });
    add('bench', 7, 18, { rotDeg: 180, len: 3, seatable: false }); add('bench', 21, 18, { rotDeg: 180, len: 3, seatable: false });
    DV.Zones.define('cand_lobby', {
      name: 'The Merciless Mart',
      region: 'Candor headquarters',
      chapter: true, noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 30, z1: 24 },
      buildingHeight: 9,
      fog: { color: 0x3a3a3a, near: 40, far: 160 },
      sky: { top: 0x5b6773, horizon: 0x9ca3a9, ground: 0x585b5d, skyline: false },
      rooms: [{ id: 'cand_lobby', name: 'Lobby', x0: 0, z0: 0, x1: 28, z1: 22, h: 8, floor: 'marble_check', wall: 'paint_white', ceiling: 'paint_white', light: { ambient: [0.45, 0.45, 0.45], color: [1, 1, 0.97], intensity: 0.9, spacing: 5, range: 8 } }],
      doors: [{ id: 'cand_door', x: 14, z: 0, dir: 'x', w: 3, type: 'glass' }],
      windows: [{ id: 'cand_w1', x: 5, z: 0, dir: 'x', w: 5, sill: 0.5, top: 6.5 }, { id: 'cand_w2', x: 23, z: 0, dir: 'x', w: 5, sill: 0.5, top: 6.5 }],
      props,
      spawn: { x: 14, z: 4.8, rot: 0 },
      build(ctx) {
        const city = DV.City.build({ seed: 503, campus: [-20, -20, 48, 42], gridX: [-470, -394, -318, -242, -166, -90, -26, 54, 130, 206, 282, 358, 434], gridZ: [-460, -396, -332, -268, -204, -140, -76, -26, 48, 112, 176, 240, 304, 368], radius: 520, hub: [-160, -260], haze: 0x9aa0a6 });
        ctx.add(city.group); ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
      },
    });
  })();
  DV.Chapter.define('arrival_candor', {
    zone: 'cand_lobby',
    title: 'CANDOR\nTHE MERCILESS MART · DAY 2',
    day: 2, time: '11:30',
    canPass() { return true; },
    start(Ch, zone, opts) {
      DV.Audio.setMusic('none');
      if (opts.step !== 'done') { DV.Quests.activate('new_faction', 'arrive', 'Step into the circle. Answer truthfully.'); Ch.checkpoint('lobby'); }
      Ch.rosa = Ch.actor({ id: 'rosa', name: 'Rosa Medina', app: adult('candor', 'f', 'rosa-medina', 45, 1.03), x: 14, z: 14.5, rot: Math.PI, action: 'arms_crossed' });
      Ch.inits = initiatesNear(Ch, 'candor', 11, 6, 14, 11);
      const ring = [];
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; ring.push({ x: 14 + Math.cos(a) * 6.2, z: 11 + Math.sin(a) * 4.8, rot: Math.atan2(-Math.cos(a), -Math.sin(a)), action: 'arms_crossed' }); }
      Ch.ring = Ch.crowd(ring.filter((r, i) => i !== 7), { faction: 'candor', seed: 'cand', adults: true });
      Ch.ring.forEach((a) => { a.name = 'Candor'; a.lookAt([14, 11]); });
      if (opts.step === 'done') { weekWaits(Ch, 'candor', Ch.rosa); return; }
      Ch.interact({ id: 'circle', kind: 'action', x: 14, y: 1, z: 11, radius: 1.6, label: 'Step into the circle', name: 'The Circle', cond: () => !Ch.flag('asked'), onUse: () => { Ch.setFlag('asked'); DV.Player.place(14, 11, Math.PI); Ch.rosa.face(14, 11); Ch.scene('candor_truth'); } });
      Ch.after(1.2, () => Ch.say(Ch.rosa, 'New initiates! Into the middle, one at a time. Nothing to be afraid of. Unless you lie.', 3.8));
    },
    onDialogueEnd(Ch, e) {
      if (e.tree !== 'candor_truth') return;
      const lies = DV.State.data.story.candorLies || 0;
      for (const a of Ch.ring) a.action = lies ? 'arms_crossed' : 'clap';
      DV.Audio.play(lies ? 'murmur' : 'applause', { secs: 2.2 });
      Ch.seq([
        () => 1.2,
        sayBeat(Ch, Ch.rosa, lies ? 'You lied to us on your first day. Everyone does, once. Don\'t do it twice.' : 'Every word true. You\'d be amazed how rare that is, even here.', 3.8),
        () => welcomeBanner(Ch, 'candor', 'THE TRUTH IS WORTH THE TROUBLE.'),
      ], 'fin');
    },
  });
  // what Candor already knows about your Aptitude Day
  const brokeRules = () => ['ducked_barrier', 'coffee_stolen', 'read_envelope', 'took_pierce_key', 'kept_keycard'].some((f) => DV.State.flag(f)) || (DV.State.zoneState('testing_center').doors.rec_door === 'unlocked');
  const lie = () => { const s = DV.State.data.story; s.candorLies = (s.candorLies || 0) + 1; DV.Reputation.add('candor', -4); };
  const truth = () => { DV.Reputation.add('candor', 3); DV.Stats.practice('composure', 1); };
  DV.DialogueDB.add('candor_truth', {
    entry: 'q1',
    nodes: {
      q1: {
        speaker: 'Rosa Medina', faction: 'candor',
        text: 'Three questions, and everyone in this room has heard every kind of answer. First: did you break any rules yesterday, at the Testing Center?',
        choices: [
          { text: 'Yes.', to: 'q1yes', effect: () => (brokeRules() ? truth() : null) },
          { text: 'No.', effect: (c) => { if (brokeRules()) { lie(); c.goto('q1lie'); } else { truth(); c.goto('q1true'); } } },
        ],
      },
      q1yes: { speaker: 'Rosa Medina', faction: 'candor', text: () => (brokeRules() ? 'And you said so. Good. [Somebody in the circle laughs, not unkindly.]' : '[She tilts her head.] Hm. You don\'t look like you did. Confessing to things you didn\'t do is its own kind of lie, you know.'), next: 'q2', nextText: '...' },
      q1true: { speaker: 'Rosa Medina', faction: 'candor', text: 'Not a single one? [She watches you a moment.] All right. I believe you.', next: 'q2', nextText: '...' },
      q1lie: { speaker: 'Rosa Medina', faction: 'candor', text: '[The circle goes quiet.] The Testing Center sends us its incident reports, initiate. Every one. Try again on the next.', next: 'q2', nextText: '...' },
      q2: {
        speaker: 'Rosa Medina', faction: 'candor',
        text: 'Second. What did your aptitude test say?',
        choices: [
          { text: () => DV.Factions.name(DV.State.data.aptitude.recordedAs || DV.State.data.aptitude.result || 'candor') + '.', to: 'q2ok', effect: () => (DV.State.data.aptitude.divergent ? lie() : truth()) },
          { text: 'That\'s private.', to: 'q2private', effect: () => truth() },
          { text: 'It was inconclusive.', to: 'q2div', if: () => !!DV.State.data.aptitude.divergent, tag: 'Divergent', effect: () => { truth(); DV.State.setFlag('told_candor_divergent'); } },
        ],
      },
      q2ok: { speaker: 'Rosa Medina', faction: 'candor', text: 'And still you chose us. Results aren\'t destiny. [She almost smiles.] Don\'t tell Erudite I said that.', next: 'q3', nextText: '...' },
      q2private: { speaker: 'Rosa Medina', faction: 'candor', text: 'It is. And refusing to answer is honest too — as long as you say that\'s what you\'re doing. Which you did.', next: 'q3', nextText: '...' },
      q2div: { speaker: 'Rosa Medina', faction: 'candor', text: '[For a long second she says nothing at all. Then, very quietly, just for you:] We tell the truth here. That doesn\'t mean we tell it to everyone. Don\'t say that word in this building again.', next: 'q3', nextText: '...' },
      q3: {
        speaker: 'Rosa Medina', faction: 'candor',
        text: 'Last one, and it\'s the only one that matters. Why Candor?',
        choices: [
          { text: 'Because I\'m tired of people lying to me.', to: 'end', effect: () => truth() },
          { text: 'Because I\'d rather be hurt by the truth than comforted by a lie.', to: 'end', effect: () => truth() },
          { text: 'I honestly don\'t know yet.', to: 'end', effect: () => { truth(); DV.Reputation.add('candor', 2); } },
        ],
      },
      end: { speaker: 'Rosa Medina', faction: 'candor', text: 'Good. Step out of the circle, initiate.', endText: '...' },
    },
  });

  /* ============================== AMITY ============================== */
  (function () {
    const props = [];
    const add = (type, x, z, o) => props.push(Object.assign({ type, x, z }, o || {}));
    for (let x = 4; x < 46; x += 6) for (const z of [4, 30]) add('tree', x + ((x * 3) % 4) - 2, z + ((x * 7) % 3) - 1, { size: 1.1 });
    for (let z = 9; z < 26; z += 5) { add('tree', 3, z, { size: 1.0 }); add('tree', 43, z, { size: 1.0 }); }
    add('fire_ring', 23, 17, {});
    add('picnic_table', 15, 12, { rotDeg: 20 }); add('picnic_table', 31, 12, { rotDeg: -20 });
    add('car', 8, 22, { rotDeg: 70, mat: 'metal_painted' });
    add('barrel', 33, 23, {}); add('crate', 34, 22, { size: 0.8, stack: true });
    DV.Zones.define('amity_farm', {
      name: 'Amity Orchards',
      region: 'Beyond the fence line',
      chapter: true, noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 48, z1: 36 },
      buildingHeight: 1,
      fog: { color: 0xc0a088, near: 50, far: 360 },
      sky: { top: 0x4a5a78, horizon: 0xe6b07a, ground: 0x5a4a38, skyline: false },
      exterior: { sunDir: [-0.7, 0.25, -0.6], sunColor: [1.0, 0.72, 0.42], ambient: [0.42, 0.36, 0.32] },
      charLight: { ambient: 0.45, hemi: 0.4, dir: 0.75, dirColor: 0xffb070 },
      rooms: [{ id: 'orchard', name: 'The Orchard', x0: 0, z0: 0, x1: 46, z1: 34, exterior: true, floor: 'grass', edge: 'fence', edgeH: 1.2 }],
      doors: [], props,
      spawn: { x: 8, z: 18, rot: Math.PI / 2 },
      build(ctx) {
        // farmland, far from the city: just fields and the city's towers on the horizon
        const city = DV.City.build({ seed: 504, campus: [-300, -300, 300, 300], gridX: [-900, -820, 820, 900], gridZ: [-900, -820, 820, 900], radius: 1200, hub: [700, -500], haze: 0xd0a888, hazeK: 0.0028, ambient: 0xffe2c8, cloudLight: 0xf0c8a0, cloudDark: 0x8a6a68, puffTint: 0xf5c8a0, ground: [0.36, 0.38, 0.22], padColor: [0.4, 0.36, 0.24] });
        ctx.add(city.group); ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
        // the fire
        const flames = new THREE.Group();
        const fm = [0xffb040, 0xff7020, 0xffd070].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, depthWrite: false }));
        const tongues = [];
        for (let k = 0; k < 7; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.22 + (k % 3) * 0.06, 1.0, 5), fm[k % 3]); t.position.set((k % 3 - 1) * 0.25, 0.5, (Math.floor(k / 3) - 1) * 0.25); flames.add(t); tongues.push(t); }
        flames.position.set(23, 0.15, 17);
        ctx.add(flames);
        let t = 0;
        ctx.update((dt) => { t += dt; tongues.forEach((m, i) => { const s = 0.8 + 0.35 * Math.sin(t * (7 + i) + i * 1.7); m.scale.set(1, s, 1); m.rotation.y = t * (0.5 + i * 0.1); }); });
        ctx.zone.flames = flames;
      },
    });
  })();
  DV.Chapter.define('arrival_amity', {
    zone: 'amity_farm',
    title: 'AMITY\nTHE ORCHARDS · DAY 2 · EVENING',
    day: 2, time: '18:40',
    start(Ch, zone, opts) {
      DV.Audio.setMusic('orchard');
      if (opts.step !== 'done') { DV.Quests.activate('new_faction', 'arrive', 'Pick an apple and share it with someone.'); Ch.checkpoint('orchard'); }
      Ch.mary = Ch.actor({ id: 'mary', name: 'Mary Ellis', app: adult('amity', 'f', 'mary-ellis', 58, 1.0), x: 21, z: 14, rot: 0.6, action: 'idle' });
      Ch.inits = initiatesNear(Ch, 'amity', 12, 18, 23, 17);
      const circle = [];
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; circle.push({ x: 23 + Math.cos(a) * 3.0, z: 17 + Math.sin(a) * 3.0, rot: Math.atan2(-Math.cos(a), -Math.sin(a)), action: k % 3 === 0 ? 'clap' : 'sit', seatY: 0.25 }); }
      Ch.circle = Ch.crowd(circle, { faction: 'amity', seed: 'amity', adults: true });
      Ch.circle.forEach((a) => { a.name = 'Amity'; });
      Ch.fireT = 0;
      if (opts.step === 'done') { weekWaits(Ch, 'amity', Ch.mary); return; }
      Ch.interact({ id: 'apple_tree', kind: 'action', x: 16, y: 1.4, z: 30.5, radius: 2.2, label: 'Pick an apple', name: 'Apple Tree', cond: () => !Ch.apple && !Ch.shared, onUse: () => { Ch.apple = true; DV.Audio.play('pickup'); DV.UI.notify('You pick a red apple. It\'s warm from the sun.', 'info'); } });
      Ch.inits.concat([Ch.mary]).forEach((a) => Ch.interact({
        id: 'share_' + a.id, kind: 'action', x: () => a.x, y: 1.3, z: () => a.z, radius: 1.5, label: 'Share your apple', name: a.name,
        cond: () => Ch.apple && !Ch.shared,
        onUse: () => {
          Ch.apple = false; Ch.shared = true;
          Ch.say(a, a === Ch.mary ? 'For me? [She laughs, and takes half.] You\'ll do fine here.' : 'Oh! Thanks. I — thank you. Half each?', 3.2);
          DV.Reputation.add('amity', 4);
          DV.Stats.practice('empathy', 1);
          DV.Quests.activate('new_faction', 'arrive', 'Join the circle round the fire.');
          Ch.interact({ id: 'fire_sit', kind: 'action', x: 23, y: 0.8, z: 13.6, radius: 1.6, label: 'Sit by the fire', name: 'The Circle', cond: () => !Ch.flag('sat'), onUse: () => this.sit(Ch) });
        },
      }));
      Ch.after(1.2, () => Ch.say(Ch.mary, 'Welcome, welcome! Nobody makes a speech here — we just make room. Help yourself to the trees.', 4));
    },
    sit(Ch) {
      Ch.setFlag('sat');
      const spot = { id: 'fire_seat', x: 23, z: 13.9, rot: 0, act: 'sit', seatY: 0.25 };
      DV.Game.sitOn(spot, true);
      DV.Player.pinned = true;
      Ch.cut(true);
      Ch.shot([28, 2.2, 22], [23, 0.8, 16]);
      for (const a of Ch.circle) a.action = 'sit_clap';
      Ch.seq([
        () => { DV.UI.subtitle('', '[Someone starts a song you half know. By the second verse, you know it.]', 4.5); return 4.6; },
        () => { Ch.say(Ch.mary, 'Whatever you were before — you\'re welcome here. That\'s the whole of it.', 4); return 4.4; },
        () => { Ch.cut(false); DV.Player.pinned = false; welcomeBanner(Ch, 'amity', 'WHAT GROWS HERE IS SHARED.'); },
      ], 'fin');
    },
    update(Ch, dt) {
      // the fire crackles
      Ch.fireT += dt;
      if (Ch.fireT > 0.6 + Math.random() * 1.4) { Ch.fireT = 0; DV.Audio.play('crackle', { x: 23, z: 17, range: 20 }); }
    },
  });
})();
