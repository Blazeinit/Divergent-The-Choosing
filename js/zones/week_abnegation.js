/* ==========================================================================
   DIVERGENT — Build 3: Abnegation, the first week ("Nothing for Yourself")
   Day 3   The supply run. A cart on the street with eight loaves, three
           blankets, two medicine kits — and seven people waiting, who all
           need more than that. Find out what each of them needs before you
           give anything. Some of them won't say. One of them isn't telling
           the whole truth, for a good reason.
   Day 3   Dinner at the Hayes house, where you may only speak to ask about
           somebody else.
   Day 4   After curfew, a sealed envelope from Joan for a man called Ezra
           at the warehouse on the east end — past the Dauntless patrol.
   Day 5   Joan doesn't rank anybody. She sits with you on the bench and
           tells you what she saw.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const FW = () => DV.FirstWeek;

  const PL = () => DV.State.data.player;
  const APT = () => DV.State.data.aptitude;
  const adult = (f, sex, seed, age, h) => { const a = DV.Character.fromFaction(f, sex, seed, { age: age || 40 }); a.height = (a.height || 1) * (h || 1.05); return a; };

  /* ============================== zones ============================== */
  // the grey street after curfew: the same street, the lamps on, a patrol on it
  (function () {
    const base = DV.Zones.get('abn_street');
    const props = base.props.slice();
    props.push({ type: 'wall_block', x: 61, z: 8, w: 1.2, d: 10, h: 6, mat: 'brick' });
    props.push({ type: 'crate', x: 58.6, z: 4.2, size: 0.9 }, { type: 'crate', x: 58.9, z: 5.1, size: 0.7 }, { type: 'barrel', x: 58.4, z: 12.2 });
    DV.Zones.define('abn_night', Object.assign({}, base, {
      name: 'Abnegation Sector',
      region: 'The grey streets, after curfew',
      fog: { color: 0x0c1018, near: 30, far: 220 },
      sky: { top: 0x04060c, horizon: 0x161c2a, ground: 0x05070a, skyline: false },
      exterior: { sunDir: [0.3, 0.8, 0.2], sunColor: [0.1, 0.11, 0.16], ambient: [0.12, 0.13, 0.18] },
      rooms: [{ id: 'abn_street', name: 'Abnegation Sector', x0: 0, z0: 0, x1: 60, z1: 16, exterior: true, floor: 'asphalt', edge: 'none', light: { ambient: [0.12, 0.13, 0.18], list: [[10.5, 1.9, 1.0], [37.5, 1.9, 1.0], [24, 14.1, 1.0], [51, 14.1, 1.0], [59.2, 8, 0.7, 3.2]], range: 9, color: [1, 0.84, 0.58] } }],
      props,
      spawn: { x: 30, z: 13.2, rot: -Math.PI / 2 },
      build(ctx) {
        const city = DV.City.build({ seed: 501, campus: [-10, -14, 70, 30], gridX: [-470, -394, -318, -242, -166, -90, -16, 76, 152, 228, 304, 380, 456], gridZ: [-460, -396, -332, -268, -204, -140, -76, -20, 36, 100, 164, 228, 292, 356], radius: 520, hub: [260, 330], haze: 0x0c1018, hazeK: 0.002, ambient: 0x2a3048, lit: 0.6, shadowAmt: 0, cloudLight: 0x2a3048, cloudDark: 0x0a0c14, puffTint: 0x30364c, cover: 0.0 });
        ctx.add(city.group); ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
      },
    }));
  })();
  // the Hayes kitchen: one table, four chairs, nothing on the walls
  (function () {
    const props = [
      { type: 'table', x: 4, z: 3.4, w: 1.8, d: 0.9, chairs: 4, top: 'wood', chairTex: 'wood', id: 'hayes' },
      { type: 'kitchenette', x: 4, z: 0.35, len: 3.2 },
      { type: 'shelf', x: 7.6, z: 3.5, rotDeg: -90, len: 1.6, h: 1.8, d: 0.35, levels: 3 },
    ];
    DV.Zones.define('abn_home', {
      name: 'The Hayes House',
      region: 'Abnegation Sector',
      chapter: true, noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 10, z1: 9 },
      buildingHeight: 6,
      fog: { color: 0x0c1018, near: 30, far: 120 },
      sky: { top: 0x04060c, horizon: 0x161c2a, ground: 0x05070a, skyline: false },
      rooms: [{ id: 'kitchen', name: 'Kitchen', x0: 0, z0: 0, x1: 8, z1: 7, h: 2.7, floor: 'wood', wall: 'paint_warm', ceiling: 'paint_white', light: { ambient: [0.24, 0.22, 0.2], color: [1, 0.84, 0.6], intensity: 0.85, spacing: 4, range: 5, fixture: 'bulb' } }],
      doors: [{ id: 'hayes_door', x: 4, z: 7, dir: 'x', w: 1.0, type: 'wood', lock: 'sealed', lockMsg: 'Not now — dinner\'s on the table.' }],
      windows: [{ id: 'hayes_w', x: 0, z: 3.5, dir: 'z', w: 1.4, sill: 1.0, top: 2.2 }],
      props,
      spawn: { x: 4, z: 5.6, rot: Math.PI },
      build() {},
    });
  })();

  /* ============================== the supply run ============================== */
  // who's waiting, what they need, and what they'll tell you
  const PEOPLE = [
    { id: 'ada', name: 'Ada Moss', sex: 'f', age: 71, x: 50.5, z: 3.0, act: 'idle', need: { medicine: 1, bread: 1 }, crit: 'medicine', line: 'A cough that rattles. She waves it away before you can ask.' },
    { id: 'pell', name: 'Pell', sex: 'm', age: 22, x: 53.5, z: 4.2, act: 'arms_crossed', need: { bread: 2 }, line: 'Thin, quick-eyed. Something loaf-shaped under his coat.' },
    { id: 'marta', name: 'Marta Hale', sex: 'f', age: 33, x: 46.5, z: 13.4, act: 'idle', need: { medicine: 1, bread: 2 }, crit: 'medicine', line: 'A little boy asleep against her, flushed with fever.' },
    { id: 'tam', name: 'Old Tam', sex: 'm', age: 78, x: 41.0, z: 2.2, act: 'crouch', need: { blanket: 1, bread: 1 }, crit: 'blanket', line: 'Sleeps under the L tracks. His coat is more hole than coat.' },
    { id: 'rena', name: 'Rena', sex: 'f', age: 26, x: 55.6, z: 11.6, act: 'idle', need: { bread: 2, blanket: 1 }, line: 'Pregnant, and trying not to look it.' },
    { id: 'ivo', name: 'Ivo Brandt', sex: 'm', age: 45, x: 49.0, z: 8.6, act: 'arms_crossed', need: { medicine: 1, bread: 1 }, crit: 'medicine', line: 'A rag wrapped round his right hand, dark at the knuckles.' },
    { id: 'price', name: 'Mrs. Price', sex: 'f', age: 64, x: 33.6, z: 1.4, act: 'idle', faction: 'abnegation', need: { bread: 1 }, line: 'Abnegation grey. A neighbour. She says she\'s only watching.' },
  ];
  const STOCK0 = { bread: 8, blanket: 3, medicine: 2 };
  const ITEM = { bread: 'a loaf of bread', blanket: 'a blanket', medicine: 'a medicine kit', lunch: 'your own lunch' };
  const run = () => FW().st().run || (FW().st().run = { stock: Object.assign({}, STOCK0), gave: {}, asked: {}, lunch: false, bound: false, pellWhy: false, priceTold: false });
  const gaveOf = (id) => run().gave[id] || (run().gave[id] = {});
  const breadOf = (id) => (gaveOf(id).bread || 0) + (gaveOf(id).lunch || 0);
  // how fair was it? needs met, the worst first; nobody doubled up while someone had nothing
  function assess() {
    const R = run();
    let pts = 0;
    const notes = [];
    for (const p of PEOPLE) {
      const g = gaveOf(p.id);
      if (p.crit === 'medicine') {
        const ok = g.medicine || (p.id === 'ivo' && R.bound);
        if (ok) pts += 3; else notes.push(p.name + ' needed medicine');
      }
      if (p.crit === 'blanket') { if (g.blanket) pts += 3; else notes.push(p.name + ' needed a blanket'); }
      if (breadOf(p.id) >= 1) pts += 1; else notes.push(p.name + ' got no bread');
      if (p.id === 'rena' && g.blanket) pts += 1;
    }
    // doubling up while someone went hungry (Pell's second loaf is fine if you knew why)
    const hungry = PEOPLE.some((p) => breadOf(p.id) === 0);
    for (const p of PEOPLE) if (breadOf(p.id) >= 2 && hungry && !(p.id === 'pell' && R.pellWhy)) { pts -= 1; notes.push('two loaves to ' + p.name + ' while someone had none'); }
    const asked = PEOPLE.filter((p) => R.asked[p.id]).length;
    pts += Math.round(asked / 2);
    if (R.lunch) pts += 2;
    if (R.priceTold && breadOf('price') >= 1) pts += 1;
    return { pts: U.clamp(pts, 0, 24), max: 24, notes };
  }

  /* ============================== the week ============================== */
  const STEPS = {
    run: { day: 3, time: '09:00', title: 'ABNEGATION\nTHE FIRST WEEK · DAY 3' },
    dinner: { day: 3, time: '18:30', title: 'DAY 3 · EVENING\nTHE HAYES HOUSE' },
    night: { day: 4, time: '22:40', title: 'DAY 4 · 22:40\nAFTER CURFEW' },
    reflect: { day: 5, time: '07:30', title: 'DAY 5' },
    end: { day: 5, time: '08:10' },
  };
  const step = (o) => STEPS[(o && o.step) || 'run'] || STEPS.run;
  const peers = () => FW().classOf('abnegation', [{ id: 'micah_cole', name: 'Micah Cole', app: adult('abnegation', 'm', 'micah-cole', 16, 1.0), bias: 64 }]);

  DV.Chapter.define('week_abnegation', {
    zone: (o) => ({ dinner: 'abn_home', night: 'abn_night' }[(o && o.step)] || 'abn_street'),
    day: (o) => step(o).day,
    time: (o) => step(o).time,
    title: (o) => step(o).title,
    canPass() { return true; },
    start(Ch, zone, opts) {
      FW().fresh(Ch);
      const s = opts.step || 'run';
      DV.Audio.setMusic(s === 'night' ? 'none' : 'calm');
      Ch.joan = Ch.actor({ id: 'joan', name: 'Elder Joan Hayes', faction: 'abnegation', app: adult('abnegation', 'f', 'joan-hayes', 66, 1.0), x: 9.5, z: 9.5, rot: Math.PI / 2, action: 'idle' });
      Ch.peers = peers().slice(0, 4);
      if (!DV.Quests.started('week_abnegation')) DV.Quests.start('week_abnegation');
      DV.Quests.tracked = 'week_abnegation';
      (this[s] || this.run).call(this, Ch, zone, opts);
    },

    /* ---------------- Day 3: the supply run ---------------- */
    run(Ch) {
      Ch.checkpoint('run');
      FW().placePlayer(6, 9.2, Math.PI / 2);
      // the cart
      const g = new THREE.Group();
      const wood = new THREE.MeshLambertMaterial({ color: 0x6a5a48 }), dark = new THREE.MeshLambertMaterial({ color: 0x2a2826 }), cloth = new THREE.MeshLambertMaterial({ color: 0x8a8a84 }), bread = new THREE.MeshLambertMaterial({ color: 0xb08850 });
      const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
      box(1.8, 0.1, 1.0, wood, 0, 0.55, 0); box(1.8, 0.35, 0.05, wood, 0, 0.78, 0.48); box(1.8, 0.35, 0.05, wood, 0, 0.78, -0.48); box(0.05, 0.35, 1.0, wood, 0.9, 0.78, 0);
      for (const [x, z] of [[-0.6, 0.55], [0.6, 0.55], [-0.6, -0.55], [0.6, -0.55]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 10), dark); w.rotation.x = Math.PI / 2; w.position.set(x, 0.28, z); g.add(w); }
      box(0.06, 0.06, 0.9, wood, -1.25, 0.62, 0);
      Ch.cartBread = []; Ch.cartBlankets = []; Ch.cartMeds = [];
      for (let k = 0; k < 8; k++) Ch.cartBread.push(box(0.26, 0.12, 0.14, bread, -0.65 + (k % 4) * 0.28, 0.67, -0.3 + Math.floor(k / 4) * 0.18));
      for (let k = 0; k < 3; k++) Ch.cartBlankets.push(box(0.5, 0.1, 0.36, cloth, 0.45, 0.66 + k * 0.1, -0.2));
      for (let k = 0; k < 2; k++) Ch.cartMeds.push(box(0.2, 0.14, 0.14, new THREE.MeshLambertMaterial({ color: 0xe8e6e0 }), 0.3 + k * 0.26, 0.67, 0.28));
      g.position.set(8, 0, 10.5);
      Ch.addObject(g);
      // whatever you were carrying when you saved is still in your hands
      Ch.carrying = run().carrying || null;
      this.syncCart(Ch);
      // the people waiting
      Ch.people = PEOPLE.map((p) => Ch.actor({ id: p.id, name: p.name, faction: p.faction || 'factionless', app: adult(p.faction || 'factionless', p.sex, 'abn-run-' + p.id, p.age, 1.0), x: p.x, z: p.z, rot: -Math.PI / 2, action: p.act }));
      Ch.people.forEach((a) => a.face(30, 8));
      if (PEOPLE.some((p) => p.id === 'marta')) {
        const m = Ch.people.find((a) => a.id === 'marta');
        Ch.jory = Ch.actor({ id: 'jory', name: 'Jory', faction: 'factionless', app: DV.Character.fromFaction('factionless', 'm', 'jory-hale', { age: 7 }), x: m.x + 0.6, z: m.z - 0.2, rot: m.rot, action: 'crouch' });
        Ch.jory.app.height = 0.62;
      }
      // the other initiates, with carts of their own further up
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'abnegation', app: p.app, x: 14 + i * 3.2, z: i % 2 ? 13.4 : 2.8, rot: i % 2 ? Math.PI : 0, action: 'idle' }));
      for (const a of Ch.peerActors) FW().talkTo(Ch, a, 'abn_peer', { id: 'talk_' + a.id });
      FW().talkTo(Ch, Ch.joan, 'abn_joan', { id: 'joan_talk' });
      // talk to each of them; give them what you're carrying
      for (const a of Ch.people) {
        const P = PEOPLE.find((p) => p.id === a.id);
        Ch.interact({ id: 'ask_' + a.id, kind: 'action', x: () => a.x, y: 1.3, z: () => a.z, radius: 1.7, label: 'Talk to', name: a.name, cond: () => !Ch.carrying, onUse: () => { a.face(DV.Player.x, DV.Player.z); run().asked[a.id] = true; Ch.scene('abn_' + a.id, { speaker: a.name, faction: P.faction || 'factionless' }); } });
        Ch.interact({ id: 'give_' + a.id, kind: 'action', x: () => a.x, y: 1.3, z: () => a.z, radius: 1.7, label: () => 'Give ' + ITEM[Ch.carrying], name: a.name, cond: () => !!Ch.carrying, onUse: () => this.give(Ch, a, P) });
      }
      Ch.interact({ id: 'cart', kind: 'action', x: 8, y: 0.9, z: 9.6, radius: 1.6, label: () => (Ch.carrying ? 'Put it back' : 'Take from the cart'), name: 'Supply Cart', cond: () => !FW().was('run_done'), onUse: () => { if (Ch.carrying) { this.putBack(Ch); return; } Ch.scene('abn_cart'); } });
      if (!FW().was('run_briefed')) {
        Ch.seq([
          () => 1.2,
          () => { Ch.joan.face(DV.Player.x, DV.Player.z); },
          FW().say(Ch, Ch.joan, 'Eight loaves. Three blankets. Two medicine kits. And seven people at the east end who need more than that.', 4.4),
          FW().say(Ch, Ch.joan, 'There\'s never enough. That\'s the first thing to learn. The second is what to do about it. Ask before you give.', 4.4),
          () => { FW().note('run_briefed'); DV.Quests.setObj('week_abnegation', 'distribute', 'active'); Ch.joan.walk([[40, 10.6]], 1.2, (a) => { a.face(50, 8); a.action = 'arms_crossed'; }); },
        ], 'brief');
      } else Ch.joan.place(40, 10.6, Math.PI / 2);
      if (FW().was('run_done')) this.runDone(Ch, true);
    },
    syncCart(Ch) {
      const S = run().stock;
      Ch.cartBread.forEach((m, i) => { m.visible = i < S.bread; });
      Ch.cartBlankets.forEach((m, i) => { m.visible = i < S.blanket; });
      Ch.cartMeds.forEach((m, i) => { m.visible = i < S.medicine; });
      const left = S.bread + S.blanket + S.medicine;
      Ch.hint = Ch.carrying ? 'Carrying ' + ITEM[Ch.carrying] + ' · on the cart: ' + S.bread + ' bread, ' + S.blanket + ' blankets, ' + S.medicine + ' medicine' : left ? 'On the cart: ' + S.bread + ' bread, ' + S.blanket + ' blankets, ' + S.medicine + ' medicine' : null;
    },
    take(Ch, what) {
      const S = run().stock;
      if (what !== 'lunch' && !S[what]) return;
      if (what === 'lunch') run().lunchTaken = true; else S[what]--;
      Ch.carrying = run().carrying = what;
      DV.Audio.play('pickup');
      this.syncCart(Ch);
    },
    putBack(Ch) {
      if (Ch.carrying !== 'lunch') run().stock[Ch.carrying]++;
      else run().lunchTaken = false;
      Ch.carrying = run().carrying = null;
      this.syncCart(Ch);
    },
    give(Ch, a, P) {
      const what = Ch.carrying, R = run();
      const g = gaveOf(a.id);
      g[what] = (g[what] || 0) + 1;
      if (what === 'lunch') R.lunch = true;
      Ch.carrying = R.carrying = null;
      this.syncCart(Ch);
      DV.Audio.play('item');
      DV.Stats.practice('empathy', 0.5);
      const need = (P.need[what === 'lunch' ? 'bread' : what] || 0) >= (what === 'lunch' ? breadOf(a.id) : g[what]);
      const lines = {
        medicine: { ada: 'For me? I — [the cough takes her]. Thank you. Truly.', marta: '[She grips your wrist.] Thank you. Thank you. He\'s been burning since Monday.', ivo: '[He looks at the kit, then at you.] You\'re sure? There\'s a little boy up the street who —', default: 'Medicine? I\'m not sick. Give it to somebody who is.' },
        blanket: { tam: '[He wraps it round himself like a cape and laughs.] A king! I\'m a king.', rena: 'Oh. Oh, it\'s warm. Thank you.', default: 'A blanket. Well. Thank you.' },
        bread: { pell: R.pellWhy ? 'For the kids. They\'ll eat tonight. Thanks.' : '[He tucks it away fast, next to the other one.] Thanks.', price: R.priceTold ? '[She takes it as if it might burn her.] ...Thank you. Don\'t tell the others.' : 'Oh, no — I couldn\'t. Really. [But she doesn\'t give it back.]', default: 'Thank you.' },
      };
      const L = lines[what === 'lunch' ? 'bread' : what] || {};
      let line = L[a.id] || L.default || 'Thank you.';
      if (!need && what !== 'medicine') line = '[A little embarrassed.] I\'ve got enough, really. ' + line;
      if (what === 'lunch') line = '[They look at the wrapped lunch, then at you.] That\'s yours, isn\'t it? ...Thank you.';
      Ch.say(a, line, 3.4);
      if (a.id === 'marta' && what === 'medicine' && Ch.jory) Ch.jory.action = 'crouch';
      if (a.id === 'tam' && what === 'blanket') a.action = 'crouch';
      if (R.stock.bread + R.stock.blanket + R.stock.medicine === 0) Ch.after(2.4, () => this.runDone(Ch));
    },
    runDone(Ch, quiet) {
      if (Ch.flag('run_closed')) return;
      Ch.setFlag('run_closed');
      if (!FW().was('run_done')) {
        const A = assess();
        FW().note('run_done', A);
        FW().mark('run', A.pts, A.max, 'The supply run: ' + (A.notes.length ? A.notes.join('; ') + '.' : 'everybody who needed something got it.'));
        DV.Quests.setObj('week_abnegation', 'distribute', 'done', 'The supplies are gone.');
      }
      Ch.hint = null;
      DV.Quests.activate('week_abnegation', 'dinner');
      if (quiet) { this.dinnerCall(Ch); return; }
      // she comes over to you
      const P = DV.Player, dx = Ch.joan.x - P.x, dz = Ch.joan.z - P.z, d = Math.hypot(dx, dz) || 1;
      Ch.joan.walk([[P.x + (dx / d) * 1.4, P.z + (dz / d) * 1.4]], 1.3, (a) => { a.action = 'idle'; a.face(DV.Player.x, DV.Player.z); });
      Ch.seq([
        () => () => !Ch.joan.moving,
        () => { Ch.scene('abn_joan_run'); return () => !DV.Dialogue.isActive(); },
        () => this.dinnerCall(Ch),
      ], 'run_done');
    },
    dinnerCall(Ch) {
      Ch.interact({ id: 'go_dinner', kind: 'action', x: 33, y: 1.0, z: 1.4, radius: 1.8, label: 'Go in for dinner', name: 'The Hayes House', onUse: () => FW().next(Ch, 'dinner', STEPS.dinner.title) });
      DV.UI.notify('Dinner at the Hayes house — the fourth door on the south side.', 'info');
    },

    /* ---------------- Day 3, evening: dinner ---------------- */
    dinner(Ch, zone) {
      Ch.checkpoint('dinner');
      DV.Quests.activate('week_abnegation', 'dinner');
      const seat = (k) => zone.spot('hayes_c' + k);
      const s0 = seat(0), s1 = seat(1), s2 = seat(2), s3 = seat(3);
      Ch.joan.place(s1.x, s1.z, s1.rot); Ch.joan.action = 'sit';
      Ch.aaron = Ch.actor({ id: 'aaron', name: 'Aaron Hayes', faction: 'abnegation', app: adult('abnegation', 'm', 'aaron-hayes', 68, 1.03), x: s2.x, z: s2.z, rot: s2.rot, action: 'sit' });
      const sam = Ch.peers.find((p) => p.id === 'samuel_ward') || Ch.peers[0];
      Ch.sam = Ch.actor({ id: sam.id, name: sam.name, faction: 'abnegation', app: sam.app, x: s3.x, z: s3.z, rot: s3.rot, action: 'sit' });
      FW().placePlayer(4, 5.4, Math.PI);
      DV.Game.sitOn(s0, true);
      DV.Player.pinned = true;
      Ch.cut(true);
      Ch.shot([6.6, 1.9, 5.6], [4, 0.9, 3.4]);
      Ch.seq([
        () => { DV.UI.subtitle('', '[Plain food, passed hand to hand. Nobody takes the first helping. Nobody takes the last.]', 4.2); return 4.4; },
        () => { Ch.cut(false); DV.Player.pinned = true; Ch.scene('abn_dinner'); },
      ], 'dinner');
    },

    /* ---------------- Day 4: after curfew ---------------- */
    night(Ch) {
      Ch.checkpoint('night');
      DV.Quests.setObj('week_abnegation', 'dinner', 'done');
      DV.Quests.activate('week_abnegation', 'envelope');
      FW().placePlayer(30, 13.4, -Math.PI / 2 + 0.3);
      Ch.joan.place(-50, -50);
      // Ezra, at the warehouse
      Ch.ezra = Ch.actor({ id: 'ezra', name: 'Ezra', faction: 'factionless', app: adult('factionless', 'm', 'ezra-warehouse', 54, 1.04), x: 58.6, z: 8.8, rot: -Math.PI / 2, action: 'arms_crossed' });
      Ch.interact({ id: 'ezra_talk', kind: 'action', x: () => Ch.ezra.x, y: 1.4, z: () => Ch.ezra.z, radius: 1.9, label: 'Give him the envelope', name: 'Ezra', cond: () => !FW().was('delivered'), onUse: () => { Ch.ezra.face(DV.Player.x, DV.Player.z); Ch.scene('abn_ezra', { speaker: 'Ezra', faction: 'factionless' }); } });
      Ch.interact({ id: 'open_env', kind: 'action', x: () => DV.Player.x, y: 1.0, z: () => DV.Player.z, radius: 99, bias: 50, label: 'Open the envelope', name: 'Joan\'s Envelope', cond: () => !FW().was('opened') && !FW().was('delivered') && !Ch.flag('stopped'), onUse: () => this.openEnvelope(Ch) });
      // the patrol: one Dauntless with a torch, up and down the middle of the street
      Ch.guard = Ch.actor({ id: 'guard', name: 'Dauntless Patrol', faction: 'dauntless', app: adult('dauntless', 'm', 'abn-patrol', 28, 1.06), x: 44, z: 8, rot: -Math.PI / 2, action: 'idle' });
      Ch.guard.spd = 1.1;
      Ch.patrolLeg = 0;
      const cone = new THREE.Mesh(new THREE.CircleGeometry(6.5, 18, -0.5, 1.0), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.18, depthWrite: false }));
      cone.rotation.x = -Math.PI / 2;
      cone.position.y = 0.03;
      Ch.cone = Ch.addObject(cone);
      Ch.after(1.2, () => DV.UI.notify('A Dauntless patrol walks the street after curfew. Keep to the doorways and stay low (C) — he only sees what his torch finds.', 'info'));
      // (a save from after the delivery: home)
      if (FW().was('delivered')) Ch.after(1.0, () => FW().next(Ch, 'reflect', STEPS.reflect.title));
    },
    update(Ch, dt) {
      if (Ch.step !== 'night' || !Ch.guard) return;
      const G = Ch.guard;
      // walk the beat: east to west and back, stopping to look about
      if (!G.moving && !Ch.flag('stopped') && !Ch.flag('guard_wait')) {
        Ch.setFlag('guard_wait');
        Ch.after(1.6, () => {
          Ch.setFlag('guard_wait', false);
          Ch.patrolLeg = (Ch.patrolLeg + 1) % 2;
          G.walk(Ch.patrolLeg ? [[14, 8.4]] : [[52, 7.6]], 1.1);
        });
      }
      Ch.cone.position.set(G.x, 0.03, G.z);
      Ch.cone.rotation.z = G.rot - Math.PI / 2;
      if (Ch.flag('stopped') || Ch.flag('let_go') || FW().was('delivered') || DV.Game.state !== 'playing') return;
      // does his torch find you?
      const P = DV.Player;
      const dx = P.x - G.x, dz = P.z - G.z, d = Math.hypot(dx, dz);
      const ang = Math.abs(U.wrapAngle ? U.wrapAngle(Math.atan2(dx, dz) - G.rot) : Math.atan2(Math.sin(Math.atan2(dx, dz) - G.rot), Math.cos(Math.atan2(dx, dz) - G.rot)));
      const doorway = P.z < 1.6 || P.z > 14.4;
      const low = P.crouched;
      let range = 6.5;
      if (doorway) range *= 0.55;
      if (low) range *= 0.6;
      const seen = (d < range && ang < 0.55) || d < (low ? 1.2 : 2.2);
      Ch.seenT = seen ? (Ch.seenT || 0) + dt : Math.max(0, (Ch.seenT || 0) - dt * 0.5);
      if (Ch.seenT > 0.6) this.stopped(Ch);
    },
    stopped(Ch) {
      Ch.setFlag('stopped');
      Ch.guard.stop();
      Ch.guard.face(DV.Player.x, DV.Player.z);
      DV.Audio.play('check_fail', { volume: 0.5 });
      Ch.say(Ch.guard, 'Hey! You. Stay where you are.', 2.4);
      Ch.after(1.0, () => Ch.scene('abn_patrol', { speaker: 'Dauntless Patrol', faction: 'dauntless' }));
    },
    openEnvelope(Ch) {
      FW().note('opened');
      DV.State.setFlag('opened_joan_envelope');
      DV.Audio.play('paper');
      const div = !!APT().divergent;
      DV.UI.showReading('Joan\'s Envelope', 'Plain paper, Joan\'s small upright hand. No greeting.\n\n' +
        '"E. — Four more. Erudite has started asking for files by name.\n\n' +
        '  The Wren girl, Sector 2 — recorded Amity, manually. Moved.\n' +
        '  T. Okafor — recorded Candor, manually. Will need papers.\n' +
        (div ? '  ' + PL().name + ' — recorded ' + DV.Factions.name(APT().recordedAs || 'abnegation') + ', manually. One of ours now. Do NOT let them take this one.\n' : '  A boy in Sector 5 — I don\'t have his name yet. I will.\n') +
        '\nBurn this. — J."', () => { if (div) DV.UI.notify('Your name, in Joan\'s handwriting.', 'info'); });
    },
    onDialogueEnd(Ch, e) {
      if (e.tree === 'abn_dinner') {
        DV.Player.pinned = false;
        Ch.seq([() => 0.6, () => FW().next(Ch, 'night', STEPS.night.title)], 'after_dinner');
      }
      if (e.tree === 'abn_patrol') {
        // he's had his look at you: he won't stop you twice
        Ch.setFlag('let_go');
        Ch.after(1.5, () => { Ch.setFlag('stopped', false); Ch.seenT = 0; Ch.guard.walk([[14, 8.4]], 1.1); Ch.patrolLeg = 1; });
      }
      if (e.tree === 'abn_ezra' && FW().was('delivered')) {
        DV.Quests.setObj('week_abnegation', 'envelope', 'done', 'You took Joan\'s envelope to Ezra.');
        Ch.seq([() => 1.2, () => { DV.UI.notify('Home, then. Quietly.', 'info'); return 2.0; }, () => FW().next(Ch, 'reflect', STEPS.reflect.title)], 'home');
      }
      if (e.tree === 'abn_reflect') this.finish(Ch);
    },

    /* ---------------- Day 5: the bench ---------------- */
    reflect(Ch) {
      Ch.checkpoint('reflect');
      DV.Quests.setObj('week_abnegation', 'envelope', 'done');
      DV.Quests.activate('week_abnegation', 'reflect');
      Ch.joan.place(30.5, 14.6, Math.PI); Ch.joan.action = 'sit';
      FW().placePlayer(26, 9, 0.6);
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'abnegation', app: p.app, x: 12 + i * 7, z: i % 2 ? 13.6 : 2.6, rot: i % 2 ? Math.PI : 0, action: i % 2 ? 'mop' : 'idle' }));
      Ch.interact({ id: 'joan_bench', kind: 'action', x: 29.6, y: 0.8, z: 13.6, radius: 1.6, label: 'Sit with Joan', name: 'Elder Joan Hayes', cond: () => !Ch.flag('sat'), onUse: () => { Ch.setFlag('sat'); FW().placePlayer(29.5, 14.6, Math.PI); DV.Player.pinned = true; Ch.scene('abn_reflect', { speaker: 'Elder Joan Hayes', faction: 'abnegation' }); } });
    },
    finish(Ch) {
      DV.Player.pinned = false;
      DV.Quests.setObj('week_abnegation', 'reflect', 'done');
      const pct = FW().pct();
      FW().note('assessed', pct);
      const ready = pct >= 60;
      const thread = FW().was('told_ezra') ? 'EZRA KNOWS WHAT YOU ARE.' : FW().was('opened') ? (APT().divergent ? 'YOUR NAME WAS IN THE ENVELOPE.' : 'YOU READ THE ENVELOPE.') : FW().was('seized') ? 'THE PATROL READ JOAN\'S LIST.' : 'YOU NEVER OPENED IT.';
      FW().complete(Ch, 'abnegation', (ready ? 'JOAN SAYS YOU\'RE READY' : 'JOAN SAYS: NOT YET') + ' · ' + thread, ready ? 'ready' : 'not_yet');
    },
    end(Ch) {
      Ch.joan.place(30.5, 14.6, Math.PI); Ch.joan.action = 'sit';
      FW().talkTo(Ch, Ch.joan, 'abn_joan', { id: 'joan_talk' });
      FW().placePlayer(29.5, 12.5, Math.PI);
    },
  });

  /* ============================== dialogue ============================== */
  const J = { speaker: 'Elder Joan Hayes', faction: 'abnegation' };
  const j = (o) => Object.assign({}, J, o);
  const ChA = () => (DV.Chapter.active && DV.Chapter.id === 'week_abnegation' ? DV.Chapter : null);
  const take = (what) => () => { const C = ChA(); if (C) C.script.take(C, what); };
  DV.DialogueDB.add('abn_cart', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Supply Cart', faction: 'abnegation',
        text: () => { const S = run().stock; return 'Bread: ' + S.bread + '.  Blankets: ' + S.blanket + '.  Medicine: ' + S.medicine + '.' + (!run().lunchTaken ? '\n\nAnd your own lunch, wrapped in a cloth, on the end of the cart.' : ''); },
        choices: [
          { text: 'Take a loaf of bread.', if: () => run().stock.bread > 0, end: true, effect: take('bread') },
          { text: 'Take a blanket.', if: () => run().stock.blanket > 0, end: true, effect: take('blanket') },
          { text: 'Take a medicine kit.', if: () => run().stock.medicine > 0, end: true, effect: take('medicine') },
          { text: 'Take your own lunch.', if: () => !run().lunchTaken, end: true, effect: take('lunch') },
          { text: 'Leave it.', end: true },
        ],
      },
    },
  });
  // each of the seven: what they need, if you ask the right way
  const person = (id, nodes) => DV.DialogueDB.add('abn_' + id, { entry: 'start', nodes });
  person('ada', {
    start: { text: () => (gaveOf('ada').medicine ? 'Bless you. I can breathe a little already. Or I think I can.' : '[She coughs into her sleeve.] Don\'t mind me, initiate. A bit of bread, if there\'s any to spare. The rest is just the cold.'), choices: [
      { text: 'That cough doesn\'t sound like the cold.', to: 'cough' },
      { text: '[PERCEPTION 5] Look at her properly.', check: { attr: 'perception', dc: 5 }, to: 'look' },
      { text: 'I\'ll see what I can do.', end: true },
    ] },
    cough: { text: 'It\'s been in my chest a fortnight. It\'ll go. [It won\'t, and she knows it.]', endText: 'I\'ll be back.' },
    look: { text: '[Grey lips. She\'s working hard for every breath, and hiding it well.] ...You\'re looking at me like a doctor. Fine. It\'s in my chest. There. Happy?', endText: 'I\'ll be back.' },
  });
  person('pell', {
    start: { text: () => (run().pellWhy ? 'You know where it goes now. Anything helps.' : 'Two loaves, if you\'ve got them. I haven\'t eaten since yesterday.'), choices: [
      { text: '[PERCEPTION 6] "There\'s already a loaf under your coat."', check: { attr: 'perception', dc: 6 }, to: 'caught', if: () => !run().pellWhy },
      { text: 'Two? Everyone here is hungry.', to: 'two', if: () => !run().pellWhy },
      { text: 'I\'ll see what I can do.', end: true },
    ] },
    caught: { text: '[He goes very still. Then, quietly:] It\'s not for me. There are kids at the warehouse — four of them, no parents. They don\'t come out on distribution days. They\'re scared of the grey coats.', endText: 'I understand.', onEnter: () => { run().pellWhy = true; } },
    two: { text: 'Everyone\'s hungry. Some of us are hungry for more than one. [He won\'t say more.]', choices: [
      { text: '[CHARISMA 6] "Who\'s the other one for, Pell?"', check: { attr: 'charisma', dc: 6 }, to: 'caught' },
      { text: 'All right.', end: true },
    ] },
  });
  person('marta', {
    start: { text: () => (gaveOf('marta').medicine ? 'His forehead\'s cooler. I swear it is. Thank you.' : 'It\'s not for me. It\'s Jory. He\'s been burning up since Monday and the clinic\'s got nothing. Please — if there\'s medicine.'), choices: [
      { text: 'How long has he been like this?', to: 'how', if: () => !gaveOf('marta').medicine },
      { text: 'I\'ll see what I can do.', end: true },
    ] },
    how: { text: 'Four days. He stopped eating yesterday. [She doesn\'t cry. She looks like someone who has run out of crying.]', endText: 'I\'ll be back.' },
  });
  person('tam', {
    start: { text: () => (gaveOf('tam').blanket ? 'Warm as a Dauntless! Ha. Thank you, friend.' : 'Evening, initiate! Or morning. They run together, under the tracks. Is there a blanket in that cart? Mine walked off.'), choices: [
      { text: 'Where do you sleep?', to: 'where', if: () => !gaveOf('tam').blanket },
      { text: 'I\'ll see.', end: true },
    ] },
    where: { text: 'Under the L, by the third pillar. The trains keep you company. They don\'t keep you warm.', endText: 'I\'ll be back.' },
  });
  person('rena', {
    start: { text: 'Bread, please. [She keeps a hand on her stomach without meaning to.] And — no. Just bread.', choices: [
      { text: 'And what?', to: 'and' },
      { text: 'I\'ll see what I can do.', end: true },
    ] },
    and: { text: '...A blanket, if there\'s one left after the old ones. The baby comes in winter. I\'m not asking.', endText: 'I\'ll be back.' },
  });
  person('ivo', {
    start: { text: () => (run().bound ? 'Still holding. You\'ve got good hands for a grey.' : '[He keeps the hand behind him.] Bread. That\'s all. The hand\'s nothing.'), choices: [
      { text: 'Let me see the hand.', to: 'hand', if: () => !run().bound && !gaveOf('ivo').medicine },
      { text: 'I\'ll see what I can do.', end: true },
    ] },
    hand: { text: '[A gash across the knuckles from a loading crate, three days old, angry red at the edges. Not yet bad. It will be.]', choices: [
      { text: '[INTELLIGENCE 6] Clean it with water from your flask and bind it with a strip torn from your own shirt.', check: { attr: 'intelligence', dc: 6 }, to: 'bound', effect: () => { run().bound = true; DV.Stats.practice('empathy', 1); } },
      { text: 'You need the medicine kit.', end: true },
    ] },
    bound: { text: '[You tear the strip off the hem of your shirt. He watches you do it as if it\'s the strangest thing he\'s seen all week.] ...Huh. Keep your kit for the boy, then.', endText: 'Keep it clean.' },
  });
  person('price', {
    start: { text: () => (run().priceTold ? 'Don\'t look at me like that. Go on, there are people who need it more.' : 'Oh, I\'m not here for anything, dear. I\'m only watching. It\'s nice to see the new ones do it properly.'), choices: [
      { text: '[PERCEPTION 6] She\'s thinner than she should be. Her coat hangs off her.', check: { attr: 'perception', dc: 6 }, to: 'thin', if: () => !run().priceTold },
      { text: 'Is everything all right at home?', to: 'home', if: () => !run().priceTold },
      { text: 'Have a good day, Mrs. Price.', end: true },
    ] },
    thin: { text: '[She sees you see it.] ...I lost my ration card. Three weeks ago. It\'s not done, to ask for another. Someone else would go without.', endText: 'I understand.', onEnter: () => { run().priceTold = true; } },
    home: { text: 'Everything\'s fine. [It isn\'t. But you\'d have to see it for yourself.]', endText: 'All right.' },
  });
  DV.DialogueDB.add('abn_peer', {
    entry: 'start',
    nodes: {
      start: {
        faction: 'abnegation',
        text: () => (FW().was('run_done') ? 'Is it always like this? Not enough, every time?' : 'I\'ve got the north end. You\'ve got the east. [Quietly.] Ask them first. I gave a blanket away before I asked and the man already had two.'),
        endText: 'Good luck.',
      },
    },
  });
  DV.DialogueDB.add('abn_joan', {
    entry: 'start',
    nodes: {
      start: j({
        text: () => (DV.Chapter.step === 'end' ? 'Go on. There\'s work. There\'s always work.' : FW().was('run_done') ? 'Dinner\'s at half past six. Fourth door on the south side. Don\'t bring anything — that\'s not how it works.' : 'Ask before you give. Not everyone will tell you the truth, and not because they\'re lying.'),
        choices: [
          { text: 'How do I choose, when there isn\'t enough?', to: 'choose', if: () => !FW().was('run_done') },
          { text: 'Nothing. Sorry.', end: true },
        ],
      }),
      choose: j({ text: 'The worst first. Then everybody, a little. Then — if there\'s anything left — the ones who didn\'t ask. They\'re usually the ones who need it most.', next: 'start', nextText: 'Thank you.' }),
    },
  });
  DV.DialogueDB.add('abn_joan_run', {
    entry: 'start',
    nodes: {
      start: j({
        text: () => {
          const A = FW().was('run_done') || { notes: [] };
          return '[She has watched all of it from the corner, the way she watches everything.] ' + (A.notes.length === 0 ? 'Everybody who needed something got something. That almost never happens.' : A.notes.length <= 2 ? 'Not bad. ' + A.notes[0] + '. You\'ll remember that tonight. Good — remember it.' : 'There were people you didn\'t reach. ' + A.notes.slice(0, 2).join('. ') + '. It\'s hard. It doesn\'t get easier. You get better.') + (run().lunch ? ' [A glance at your empty hands.] And you gave away your own lunch. Of course you did.' : '');
        },
        endText: 'Yes, Elder.',
      }),
    },
  });
  // dinner: you may only speak to ask about somebody else
  const selfish = (n) => () => { const s = FW().st(); s.selfish = (s.selfish || 0) + n; };
  DV.DialogueDB.add('abn_dinner', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Aaron Hayes', faction: 'abnegation',
        text: '[He passes you the bread before taking any himself.] So. Your first distribution.',
        choices: [
          { text: 'It was hard. I kept thinking I\'d got it wrong.', to: 'q2', effect: selfish(1) },
          { text: 'How is Mrs. Price? She lost her ration card.', to: 'price', if: () => !!run().priceTold },
          { text: 'How long have you two been doing this?', to: 'long' },
        ],
      },
      price: { speaker: 'Aaron Hayes', faction: 'abnegation', text: '[He and Joan exchange a look.] Has she. Three weeks, I\'d guess, from the look of her. I\'ll go round in the morning. Thank you for saying.', next: 'q2', nextText: '...', onEnter: () => { FW().note('told_price'); FW().mark('dinner_kind', 2, 2); } },
      long: { speaker: 'Aaron Hayes', faction: 'abnegation', text: 'Forty years. [Joan:] Forty-one. [Aaron:] She counts the first year. I was mostly in the way.', next: 'q2', nextText: '...' },
      q2: {
        speaker: 'Samuel Ward', faction: 'abnegation',
        text: '[Samuel, across the table, hasn\'t touched his food.] Can I ask something? Is it wrong to want to be good at this? To want someone to notice?',
        choices: [
          { text: 'I think everyone wants that. I do.', to: 'q3', effect: selfish(1) },
          { text: 'Who are you hoping notices, Sam?', to: 'sam' },
          { text: '[Say nothing. Pass him the bread.]', to: 'q3', effect: () => FW().note('passed_bread') },
        ],
      },
      sam: { speaker: 'Samuel Ward', faction: 'abnegation', text: () => (DV.State.flag('daniel_tested') ? '[A pause.] Daniel. He went Dauntless. I keep thinking: if I\'d been better at this, he\'d have stayed. That\'s stupid.' : '[A pause.] Daniel. He\'s working the north end and he won\'t look at me. I think he\'s ashamed of something. I don\'t know what.'), next: 'q3', nextText: 'It isn\'t stupid.', onEnter: () => FW().mark('dinner_sam', 2, 2) },
      q3: j({
        text: 'Is there anything you need, {name}? [She asks it plainly. It\'s the only question about yourself you\'ll be asked tonight.]',
        choices: [
          { text: 'No. Thank you.', to: 'end' },
          { text: 'I\'m tired, and I miss my family.', to: 'miss', effect: selfish(1) },
          { text: 'I need to know what\'s in the envelope you\'re going to ask me to carry.', to: 'env', if: () => DV.State.flag('rosa_protects') || !!APT().divergent, check: { attr: 'perception', dc: 7 } },
        ],
      }),
      miss: j({ text: '[She nods, as if you\'ve said something sensible.] Of course you do. It\'s allowed. It just isn\'t allowed to be the only thing.', next: 'end', nextText: '...' }),
      env: j({ text: '[A long silence. Aaron gets up to clear the plates.] ...You notice things. Tomorrow night, yes. And no — you don\'t need to know what\'s in it. That\'s the point of an envelope.', next: 'end', nextText: '...' }),
      end: j({
        text: 'Tomorrow night, after curfew, I\'ll need something taken to the warehouse at the east end. A man called Ezra. Sealed. You\'ll keep it sealed. Will you do that for me?',
        choices: [
          { text: 'Yes.', end: true, effect: () => FW().note('envelope') },
          { text: 'Why me?', to: 'why' },
        ],
      }),
      why: j({ text: 'Because the patrol stops the ones who look guilty. You don\'t, yet. [She hands you the envelope.] Keep it sealed.', endText: 'I will.', onEnter: () => FW().note('envelope') }),
    },
    onEnd: () => { const s = FW().st(); FW().mark('dinner', Math.max(0, 3 - (s.selfish || 0)), 3); },
  });
  DV.DialogueDB.add('abn_patrol', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Dauntless Patrol', faction: 'dauntless',
        text: 'Curfew was an hour ago, Stiff. [The torch finds your hands.] What\'s that? Envelope. Hand it over.',
        choices: [
          { text: 'Hand it over.', to: 'given' },
          { text: '[CHARISMA 6] "A note for a sick neighbour — she can\'t read, I read it to her. I\'ll be ten minutes."', check: { attr: 'charisma', dc: 6 }, to: 'lie', fail: 'lie_fail' },
          { text: '[RESOLVE 7] "It isn\'t mine to show you."', check: { attr: 'resolve', dc: 7 }, to: 'refuse', fail: 'refuse_fail' },
        ],
      },
      given: { speaker: 'Dauntless Patrol', faction: 'dauntless', text: '[He tears it open and reads it under the torch.] Names. Abnegation and their charity lists. [He shoves it back at you.] Home. Now. Next time I write you up.', endText: '...', onEnter: () => { FW().note('seized'); DV.State.setFlag('patrol_read_list'); FW().mark('night', 0, 6); } },
      lie: { speaker: 'Dauntless Patrol', faction: 'dauntless', text: '[He looks at you for a long moment, then snorts.] A Stiff lying for a neighbour. Go on. Ten minutes.', endText: 'Thank you.', onEnter: () => { FW().note('lied_patrol'); FW().mark('night', 4, 6); } },
      lie_fail: { speaker: 'Dauntless Patrol', faction: 'dauntless', text: '"Can\'t read," he says. [He takes it and reads it.] Names. Huh. [He gives it back, and looks at you differently.] Go home.', endText: '...', onEnter: () => { FW().note('seized'); DV.State.setFlag('patrol_read_list'); FW().mark('night', 1, 6); } },
      refuse: { speaker: 'Dauntless Patrol', faction: 'dauntless', text: '[He weighs it. A lot of paperwork, for a Stiff with an envelope.] ...Fine. Whatever it is, I didn\'t see it. Get off the street.', endText: 'Thank you.', onEnter: () => FW().mark('night', 6, 6) },
      refuse_fail: { speaker: 'Dauntless Patrol', faction: 'dauntless', text: 'Not yours to show. Right. [He takes it anyway, reads it, gives it back.] Names. Go home, Stiff.', endText: '...', onEnter: () => { FW().note('seized'); DV.State.setFlag('patrol_read_list'); FW().mark('night', 2, 6); } },
    },
  });
  DV.DialogueDB.add('abn_ezra', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Ezra', faction: 'factionless',
        text: () => '[A big man in a patched coat, who has clearly been waiting a while.] Joan\'s new one. [He turns the envelope over.] ' + (FW().was('opened') ? 'Seal\'s broken. [He looks at you.] So you know.' : FW().was('seized') ? 'Somebody\'s had their thumbs on this. Patrol?' : 'Still sealed. Good. She said you would.'),
        choices: [
          { text: 'What are the names for?', to: 'names' },
          { text: 'My name\'s in it.', if: () => FW().was('opened') && !!APT().divergent, to: 'mine' },
          { text: 'Good night, Ezra.', end: true, effect: () => FW().note('delivered') },
        ],
      },
      names: {
        speaker: 'Ezra', faction: 'factionless',
        text: 'People who test strange. Erudite collects them — files, first; then, sometimes, people. Joan finds them first, when she can. We move them, when we have to. [He tucks the envelope away.] That\'s all you need to know, Stiff.',
        choices: [
          { text: '[RESOLVE 6] "I tested strange too."', if: () => !!APT().divergent, check: { attr: 'resolve', dc: 6 }, to: 'mine' },
          { text: 'Thank you for telling me.', end: true, effect: () => FW().note('delivered') },
        ],
      },
      mine: {
        speaker: 'Ezra', faction: 'factionless',
        text: '[He looks at you for a long time.] Then you\'re in the right sector, with the right old woman. [He presses something into your hand: a washer stamped with a crooked E.] If it ever goes wrong — if they come asking — show that to anyone under the tracks. Someone will find me.',
        endText: 'Thank you.', onEnter: () => { FW().note('told_ezra'); FW().note('delivered'); DV.State.setFlag('ezra_contact'); DV.UI.notify('Ezra gives you a washer stamped with a crooked E.', 'item'); },
      },
    },
    onEnd: () => { FW().note('delivered'); if (!FW().st().marks.night) FW().mark('night', FW().was('opened') ? 4 : 6, 6); },
  });
  DV.DialogueDB.add('abn_reflect', {
    entry: 'start',
    nodes: {
      start: j({
        text: () => {
          const A = FW().was('run_done') || { notes: [] }, s = FW().st();
          const bits = [];
          bits.push(A.notes.length <= 1 ? 'On the street you asked before you gave. That\'s rarer than you\'d think.' : 'On the street you did what you could. Some people went without. You saw their faces; that\'s the lesson.');
          bits.push((s.selfish || 0) === 0 ? 'At my table you didn\'t say a word about yourself. Aaron noticed.' : 'At my table you talked about yourself a little. Everyone does, the first week.');
          bits.push(FW().was('opened') ? 'And you opened my envelope. [No anger in it.] I\'d have opened it too, at your age.' : FW().was('seized') ? 'The patrol read my list. That isn\'t your fault — but it will cost someone something.' : 'And you kept my envelope sealed, past a Dauntless with a torch. Thank you.');
          return '[She doesn\'t look at you. She looks at the street.] ' + bits.join(' ');
        },
        choices: [
          { text: 'Am I ready?', to: 'ready' },
          { text: 'Who were the names, Joan?', to: 'names', if: () => !!FW().was('opened') },
        ],
      }),
      ready: j({ text: () => (FW().pct() >= 60 ? 'Nobody\'s ever ready. [A small smile, the first you\'ve seen.] But you\'ll do. You\'ll do very well.' : 'Not yet. [Gently.] That isn\'t a judgement. It\'s a direction. Again tomorrow.'), endText: 'Thank you, Elder.' }),
      names: j({ text: () => (APT().divergent ? 'People like you. [Very quietly.] I knew the day you came down my street. Whatever you are, you\'re ours now, and we look after our own. Don\'t make it easy for them.' : 'People who need looking after, by people who will. Leave it there, for now. Please.'), next: 'ready', nextText: '...', onEnter: () => { if (APT().divergent) DV.State.setFlag('joan_protects'); } }),
    },
  });
  DV.WeekAbnegation = { PEOPLE, assess, run };
})();
