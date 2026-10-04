/* ==========================================================================
   DIVERGENT — Build 3: Amity, the first week ("Common Ground")
   Day 3   Ruth Calder's orchard is drying out at the bottom of the hill, and
           she says it's because Tom Asher opened the sluice for his new
           seedbeds. Tom says he barely touched it. Amity has no judges; it
           has the circle, and tonight the new initiate is going to help.
           Listen to them both. Walk the channel and see the water for
           yourself — all the way down. Then dig.
   Evening The circle under the big tree, with the whole orchard watching.
           Then supper, and the bread everyone says is the best in the city.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const FW = () => DV.FirstWeek;

  const PL = () => DV.State.data.player;
  const APT = () => DV.State.data.aptitude;
  const adult = (f, sex, seed, age, h) => { const a = DV.Character.fromFaction(f, sex, seed, { age: age || 40 }); a.height = (a.height || 1) * (h || 1.05); return a; };

  /* ============================== the zone: the orchard by day ============================== */
  // the channel: from the sluice in the north-east corner, down the east side past Tom's seedbeds,
  // then west along the bottom of the orchard to Ruth's trees, under the farm track by a culvert
  const SLUICE = { x: 40, z: 32 };
  const CULVERT = { x: 24, z: 8.6 };
  (function () {
    const base = DV.Zones.get('amity_farm');
    const props = base.props.slice();
    for (const z of [21, 24, 27]) props.push({ type: 'garden_bed', x: 35.5, z, w: 4, d: 1.4 });
    props.push({ type: 'crate', x: 38.6, z: 19.2, size: 0.7 }, { type: 'barrel', x: 32.4, z: 26.4 });
    DV.Zones.define('amity_day', Object.assign({}, base, {
      name: 'Amity Orchards',
      region: 'Beyond the fence line',
      fog: { color: 0xc8d0c0, near: 60, far: 420 },
      sky: { top: 0x5a7aa8, horizon: 0xd8e0d8, ground: 0x5a5a40, skyline: false },
      exterior: { sunDir: [0.45, 0.75, 0.35], sunColor: [0.95, 0.9, 0.78], ambient: [0.5, 0.52, 0.5] },
      charLight: null,
      props,
      spawn: { x: 20, z: 15, rot: 0 },
      build(ctx) {
        const city = DV.City.build({ seed: 504, campus: [-300, -300, 300, 300], gridX: [-900, -820, 820, 900], gridZ: [-900, -820, 820, 900], radius: 1200, hub: [700, -500], haze: 0xc8d0c0, hazeK: 0.0022, ground: [0.38, 0.42, 0.24], padColor: [0.4, 0.38, 0.26] });
        ctx.add(city.group); ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
        // the channel: banks of dirt, water in it (the lower stretch is dry until the culvert is cleared)
        const water = new THREE.MeshLambertMaterial({ color: 0x4a7898, emissive: 0x0a1820, transparent: true, opacity: 0.88 });
        const dry = new THREE.MeshLambertMaterial({ color: 0x6a5838 });
        const bank = new THREE.MeshLambertMaterial({ color: 0x5a4a30 });
        const strip = (x0, z0, x1, z1, mat, y) => {
          const w = Math.abs(x1 - x0) || 0.7, d = Math.abs(z1 - z0) || 0.7;
          const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat);
          m.position.set((x0 + x1) / 2, y || 0.02, (z0 + z1) / 2);
          ctx.add(m);
          return m;
        };
        strip(39.3, 8.6, 40.7, 33, bank, 0.012); strip(4, 7.9, 40.7, 9.3, bank, 0.012);
        const upper = [strip(39.65, 9, 40.35, 33, water, 0.035), strip(CULVERT.x + 0.8, 8.25, 40.35, 8.95, water, 0.035)];
        // a branch to Tom's beds, off the sluice
        upper.push(strip(33.2, 29.2, 39.65, 29.8, water, 0.035));
        const lowerDry = strip(4.2, 8.25, CULVERT.x - 0.8, 8.95, dry, 0.03);
        const lowerWet = strip(4.2, 8.25, CULVERT.x - 0.8, 8.95, water, 0.036);
        lowerWet.visible = false;
        // the culvert under the track, choked with silt and leaves
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.8, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0x3a3a38, side: THREE.DoubleSide }));
        pipe.rotation.z = Math.PI / 2; pipe.position.set(CULVERT.x, 0.12, CULVERT.z);
        ctx.add(pipe);
        const silt = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshLambertMaterial({ color: 0x4a3a24 }));
        silt.scale.set(1.4, 0.55, 1.0); silt.position.set(CULVERT.x + 1.0, 0.08, CULVERT.z);
        ctx.add(silt);
        // the sluice gate: a board on a threaded post, a wheel to turn it
        const wood = new THREE.MeshLambertMaterial({ color: 0x6a5032 }), iron = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 0.16), wood); post.position.set(SLUICE.x - 0.6, 0.8, SLUICE.z); ctx.add(post);
        const post2 = post.clone(); post2.position.x = SLUICE.x + 0.6; ctx.add(post2);
        const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.18), wood); beam.position.set(SLUICE.x, 1.55, SLUICE.z); ctx.add(beam);
        const gate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.08), wood); gate.position.set(SLUICE.x, 0.85, SLUICE.z); ctx.add(gate);
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 5, 12), iron); wheel.position.set(SLUICE.x, 1.8, SLUICE.z); ctx.add(wheel);
        ctx.zone.channel = { lowerDry, lowerWet, silt, gate };
        ctx.collide(SLUICE.x - 0.7, SLUICE.z - 0.15, SLUICE.x + 0.7, SLUICE.z + 0.15, { y1: 1.6 });
      },
    }));
  })();
  // the stream runs again: the lower channel fills, the silt is gone
  const setFlow = (zone, on) => {
    const c = zone && zone.channel;
    if (!c) return;
    c.lowerWet.visible = !!on; c.lowerDry.visible = !on; c.silt.visible = !on;
  };

  /* ============================== the dig (an activity) ============================== */
  // a spade, a choked culvert, and a rhythm: strike when the swing is right
  class Dig {
    constructor(o) { this.id = 'dig'; this.o = o || {}; }
    begin(A) {
      this.A = A;
      FW().placePlayer(CULVERT.x + 1.9, CULVERT.z - 0.6, -Math.PI / 2 - 0.3);
      DV.Game.rig.setTrack(new THREE.Vector3(CULVERT.x + 4.2, 2.2, CULVERT.z - 2.6), new THREE.Vector3(CULVERT.x + 1.1, 0.4, CULVERT.z), 4, true, new THREE.Vector3(CULVERT.x + 2.5, 1.2, CULVERT.z - 1.0));
      this.need = 8; this.hits = 0; this.misses = 0;
      this.pos = 0; this.dir = 1; this.speed = 0.85;
      const S = DV.Stats;
      this.zone = U.clamp(0.14 + S.attr('strength') * 0.008 + S.attr('agility') * 0.008, 0.16, 0.3);
      this.zc = 0.5;
      this.strike = 0; this.done = false;
      const h = U.el('div', 'dig-hud', '<div class="tr-box"><div class="tr-title">THE CULVERT</div><div class="tr-line">Dig out the silt. Strike when the swing is in the band.</div><div class="tr-line dig-n"></div></div><div class="dig-bar"><div class="band"></div><div class="mark"></div></div><div class="dig-prog"><span>Cleared</span><div class="fh-bar"><i></i></div></div>', A.hud);
      this.h = h;
      A.keys('<b>Space</b> / <b>LMB</b> strike');
      this.sync();
    }
    q(s) { return this.h.querySelector(s); }
    sync() {
      this.q('.dig-n').textContent = 'Strokes: ' + this.hits + ' · misses: ' + this.misses;
      const b = this.q('.band');
      b.style.left = ((this.zc - this.zone / 2) * 100).toFixed(1) + '%';
      b.style.width = (this.zone * 100).toFixed(1) + '%';
      this.q('.dig-prog .fh-bar i').style.width = ((this.hits / this.need) * 100).toFixed(0) + '%';
    }
    update(dt, input, A) {
      FW().timers.tick.call(this, dt);
      this.strike = Math.max(0, this.strike - dt * 2.5);
      FW().pose(dt, { action: this.strike > 0 ? 'garden' : 'mop' });
      if (this.done) return;
      this.pos += this.dir * this.speed * dt;
      if (this.pos > 1) { this.pos = 1; this.dir = -1; }
      if (this.pos < 0) { this.pos = 0; this.dir = 1; }
      this.q('.mark').style.left = (this.pos * 100).toFixed(1) + '%';
      if (input.consume('Space') || input.consume('MouseLeft') || input.consume('KeyE')) {
        this.strike = 1;
        if (Math.abs(this.pos - this.zc) <= this.zone / 2) {
          this.hits++;
          DV.Audio.play('scuff', { volume: 0.8 });
          DV.Player.stamina = Math.max(0, DV.Player.stamina - 4);
          this.speed = Math.min(1.5, this.speed + 0.06);
          this.zc = U.clamp(0.25 + Math.random() * 0.5, 0.2, 0.8);
          if (this.hits >= this.need) {
            this.done = true;
            DV.Audio.play('splash', { volume: 0.8 });
            A.announce('THE WATER RUNS', 1.8, 'good');
            FW().timers.after.call(this, 2.0, () => A.finish({ hits: this.hits, misses: this.misses, score: Math.round(100 * this.hits / (this.hits + this.misses)) }));
          }
        } else {
          this.misses++;
          DV.Audio.play('whiff', { volume: 0.5 });
          DV.Player.stamina = Math.max(0, DV.Player.stamina - 8);
        }
        this.sync();
      }
    }
    end() {}
  }
  DV.WeekAmity = { Dig, SLUICE, CULVERT, setFlow };

  /* ============================== the week ============================== */
  const STEPS = {
    listen: { day: 3, time: '07:40', title: 'AMITY\nTHE FIRST WEEK · DAY 3' },
    circle: { day: 3, time: '18:30', title: 'DAY 3 · EVENING\nTHE CIRCLE' },
    end: { day: 3, time: '21:00' },
  };
  const step = (o) => STEPS[(o && o.step) || 'listen'] || STEPS.listen;
  const peers = () => FW().classOf('amity', [{ id: 'wren_ellis', name: 'Wren Ellis', app: adult('amity', 'f', 'wren-ellis', 16, 0.98), bias: 66 }]);
  const md = () => FW().st().med || (FW().st().med = { ruth: 3, tom: 3, heard: {} });

  DV.Chapter.define('week_amity', {
    zone: (o) => ((o && o.step) === 'circle' || (o && o.step) === 'end' ? 'amity_farm' : 'amity_day'),
    day: (o) => step(o).day,
    time: (o) => step(o).time,
    title: (o) => step(o).title,
    start(Ch, zone, opts) {
      FW().fresh(Ch);
      const s = opts.step || 'listen';
      DV.Audio.setMusic('orchard');
      Ch.mary = Ch.actor({ id: 'mary', name: 'Mary Ellis', faction: 'amity', app: adult('amity', 'f', 'mary-ellis', 58, 1.0), x: 21, z: 16.5, rot: 0.6, action: 'idle' });
      Ch.ruth = Ch.actor({ id: 'ruth', name: 'Ruth Calder', faction: 'amity', app: adult('amity', 'f', 'ruth-calder', 61, 1.0), x: 11.5, z: 6.2, rot: Math.PI, action: 'garden' });
      Ch.tom = Ch.actor({ id: 'tom', name: 'Tom Asher', faction: 'amity', app: adult('amity', 'm', 'tom-asher', 38, 1.04), x: 33.2, z: 24, rot: Math.PI / 2, action: 'garden' });
      Ch.peers = peers().slice(0, 4);
      if (!DV.Quests.started('week_amity')) DV.Quests.start('week_amity');
      DV.Quests.tracked = 'week_amity';
      (this[s] || this.listen).call(this, Ch, zone, opts);
    },
    talk(Ch) {
      FW().talkTo(Ch, Ch.ruth, 'am_ruth', { id: 'talk_ruth' });
      FW().talkTo(Ch, Ch.tom, 'am_tom', { id: 'talk_tom' });
      FW().talkTo(Ch, Ch.mary, 'am_mary', { id: 'talk_mary' });
      for (const a of Ch.peerActors || []) FW().talkTo(Ch, a, a.id === 'lucy_barnes' ? 'am_lucy' : 'am_peer', { id: 'talk_' + a.id });
    },

    /* ---------------- Day 3: the water ---------------- */
    listen(Ch, zone) {
      Ch.checkpoint('listen');
      FW().placePlayer(19.5, 14, 0.4);
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'amity', app: p.app, x: [16, 28, 9, 30][i], z: [29, 29.4, 29, 5][i], rot: [0, 0, 0, Math.PI][i], action: 'garden' }));
      this.talk(Ch);
      setFlow(zone, !!FW().was('dug'));
      if (!FW().was('briefed')) {
        Ch.seq([
          () => 1.2,
          () => { Ch.mary.face(DV.Player.x, DV.Player.z); },
          FW().say(Ch, Ch.mary, 'Good morning! Now — a job, and not an easy one. Ruth and Tom haven\'t spoken in a week.', 4.0),
          FW().say(Ch, Ch.mary, 'Ruth says her trees are dying because Tom took the water. Tom says he didn\'t. The circle meets tonight and I want you to help them.', 4.6),
          FW().say(Ch, Ch.mary, 'We don\'t have judges here. Listen to them both. Really listen. Then go and look at the water yourself.', 4.0),
          () => { FW().note('briefed'); },
        ], 'brief');
      }
      // the channel: the sluice, the culvert
      Ch.interact({ id: 'sluice', kind: 'action', x: SLUICE.x, y: 1.0, z: SLUICE.z - 0.8, radius: 1.6, label: 'Look at the sluice', name: 'Sluice Gate', onUse: () => { FW().note('saw_sluice'); this.channelSeen(Ch); Ch.scene('am_sluice'); } });
      Ch.interact({ id: 'culvert', kind: 'action', x: CULVERT.x + 1.2, y: 0.6, z: CULVERT.z - 0.9, radius: 1.8, label: () => (FW().was('found_silt') ? 'Dig out the culvert' : 'Look at the culvert'), name: 'Culvert', cond: () => !FW().was('dug'), onUse: () => (FW().was('found_silt') ? this.dig(Ch) : this.lookCulvert(Ch)) });
      this.checkHeard(Ch);
      if (FW().was('dug')) this.dayDone(Ch, true);
    },
    checkHeard(Ch) {
      const h = md().heard;
      FW().mark('listen', (h.ruth ? 2 : 0) + (h.tom ? 2 : 0) + (h.ruthDeep ? 1 : 0) + (FW().was('tom_half') ? 1 : 0) + (FW().was('dawn') ? 1 : 0), 7);
      if (h.ruth && h.tom && DV.Quests.obj('week_amity', 'listen') !== 'done') {
        DV.Quests.setObj('week_amity', 'listen', 'done', 'You heard Ruth and Tom out.');
        DV.Quests.activate('week_amity', 'channel');
      } else if (h.ruth && h.tom) DV.Quests.activate('week_amity', 'channel');
    },
    channelSeen(Ch) { if (md().heard.ruth && md().heard.tom) DV.Quests.activate('week_amity', 'channel'); },
    lookCulvert(Ch) {
      FW().note('found_silt');
      DV.Stats.practice('observation', 1);
      DV.UI.showReading('The Culvert', 'Where the channel ducks under the farm track the water backs up into a brown pool and goes no further. The pipe is packed solid — silt, leaves, a winter\'s worth of orchard trimmings.\n\nBelow the track the channel is bone dry, all the way down to Ruth\'s trees.\n\nIt isn\'t the sluice at all. Or not only the sluice.\n\nThere\'s a spade leaning on the fence.');
      DV.Quests.activate('week_amity', 'channel', 'The culvert under the track is blocked.');
    },
    dig(Ch) {
      DV.Activity.start(new Dig({}), (r) => {
        FW().note('dug', r);
        FW().mark('dig', r.score, 100, 'The culvert: dug out in ' + r.hits + ' strokes, ' + r.misses + ' missed.');
        setFlow(DV.World.current, true);
        DV.Quests.setObj('week_amity', 'channel', 'done', 'You cleared the culvert. Water reaches the bottom of the orchard again.');
        this.dayDone(Ch);
      });
    },
    dayDone(Ch, quiet) {
      DV.Quests.activate('week_amity', 'circle');
      if (!quiet) Ch.after(1.5, () => Ch.say(Ch.ruth, '[Shading her eyes, from the trees.] Is that — that\'s water. That\'s water in my ditch!', 3.6));
      Ch.interact({ id: 'to_circle', kind: 'action', x: 23, y: 0.8, z: 13.6, radius: 1.8, label: 'Go to the circle (evening)', name: 'The Big Tree', onUse: () => FW().next(Ch, 'circle', STEPS.circle.title) });
      DV.UI.notify('The circle meets at the fire this evening. Go there when you\'re ready.', 'info');
    },

    /* ---------------- evening: the circle, then supper ---------------- */
    circle(Ch, zone) {
      Ch.checkpoint('circle');
      DV.Quests.setObj('week_amity', 'channel', 'done');
      DV.Quests.activate('week_amity', 'circle');
      const ring = [];
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; if (k === 9 || k === 3 || k === 0 || k === 6) continue; ring.push({ x: 23 + Math.cos(a) * 3.2, z: 17 + Math.sin(a) * 3.2, rot: Math.atan2(-Math.cos(a), -Math.sin(a)), action: 'sit', seatY: 0.25 }); }
      Ch.circle = Ch.crowd(ring, { faction: 'amity', seed: 'amity-circle', adults: true });
      Ch.circle.forEach((a) => { a.name = 'Amity'; });
      const at = (k) => { const a = (k / 12) * Math.PI * 2; return [23 + Math.cos(a) * 3.2, 17 + Math.sin(a) * 3.2, Math.atan2(-Math.cos(a), -Math.sin(a))]; };
      const r0 = at(0), r6 = at(6), r3 = at(3);
      Ch.ruth.place(r0[0], r0[1], r0[2]); Ch.ruth.action = 'sit'; Ch.ruth.seatY = 0.25;
      Ch.tom.place(r6[0], r6[1], r6[2]); Ch.tom.action = 'sit'; Ch.tom.seatY = 0.25;
      Ch.mary.place(r3[0], r3[1], r3[2]); Ch.mary.action = 'sit'; Ch.mary.seatY = 0.25;
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'amity', app: p.app, x: 18 + i * 1.3, z: 12.4, rot: 0.3, action: 'idle' }));
      FW().placePlayer(23, 12.2, 0);
      // (a save from after the circle: on to supper — or, after supper, the hands)
      if (FW().was('bread')) { Ch.setFlag('sat'); Ch.after(0.5, () => this.finish(Ch)); }
      else if (FW().was('mediated')) { Ch.setFlag('sat'); Ch.after(0.8, () => this.supper(Ch)); }
      Ch.interact({ id: 'circle_sit', kind: 'action', x: 23, y: 0.8, z: 13.6, radius: 1.8, label: 'Take your place in the circle', name: 'The Circle', cond: () => !Ch.flag('sat'), onUse: () => this.sit(Ch) });
      Ch.after(1.6, () => Ch.say(Ch.mary, 'Come and sit. The space at the bottom is yours tonight.', 3.4));
    },
    sit(Ch) {
      Ch.setFlag('sat');
      DV.Game.sitOn({ id: 'circle_seat', x: 23, z: 13.8, rot: 0, act: 'sit', seatY: 0.25 }, true);
      DV.Player.pinned = true;
      Ch.cut(true);
      Ch.shot([28.5, 2.4, 21.5], [23, 0.8, 16]);
      Ch.fireT = 0;
      Ch.seq([
        () => { DV.UI.subtitle('', '[The fire. Thirty faces in its light. Ruth on one side, arms folded. Tom on the other, looking at his boots.]', 4.4); return 4.6; },
        () => { Ch.cut(false); DV.Player.pinned = true; Ch.scene('am_circle'); },
      ], 'circle');
    },
    supper(Ch) {
      DV.Quests.activate('week_amity', 'supper');
      DV.Player.pinned = false;
      FW().passTo('20:10');
      for (const a of Ch.circle) a.action = 'sit';
      Ch.cut(true);
      Ch.shot([17.5, 2.0, 15.5], [15, 0.8, 12]);
      DV.UI.fade(1, 700).then(() => {
        FW().placePlayer(15.2, 13.3, Math.PI);
        DV.Player.pinned = true;
        Ch.mary.place(15.8, 10.6, 0); Ch.mary.action = 'sit';
        Ch.ruth.place(14.2, 10.8, 0.2); Ch.ruth.action = 'sit';
        Ch.tom.place(16.9, 13.2, Math.PI); Ch.tom.action = 'sit';
        DV.UI.fade(0, 700);
        Ch.seq([
          () => { DV.UI.subtitle('', '[Supper at the long tables under the trees. The bread goes round, still warm — everyone says it\'s the best in the city.]', 4.4); return 4.6; },
          () => { Ch.cut(false); DV.Player.pinned = true; Ch.scene('am_bread'); },
        ], 'supper');
      });
    },
    onDialogueEnd(Ch, e) {
      if (e.tree === 'am_ruth' || e.tree === 'am_tom') this.checkHeard(Ch);
      if (e.tree === 'am_circle' && FW().was('mediated')) Ch.after(1.0, () => this.supper(Ch));
      if (e.tree === 'am_bread' && FW().was('bread')) this.finish(Ch);
    },
    update(Ch, dt) {
      if (Ch.step !== 'circle') return;
      Ch.fireT = (Ch.fireT || 0) + dt;
      if (Ch.fireT > 0.6 + Math.random() * 1.4) { Ch.fireT = 0; DV.Audio.play('crackle', { x: 23, z: 17, range: 20 }); }
    },
    finish(Ch) {
      DV.Player.pinned = false;
      DV.Quests.setObj('week_amity', 'supper', 'done');
      const pct = FW().pct();
      const st = FW().standings('amity', pct, Ch.peers);
      // Amity doesn't rank: the circle raises hands
      const hands = Math.round(U.clamp(pct / 100, 0.2, 1) * 30);
      FW().note('hands', hands);
      const out = FW().was('mediated');
      DV.UI.showReading('The Circle', '[At the end of the week the circle sits once more, and Mary asks the question she asks every initiate: "Is this one of us?"]\n\n' + hands + ' of 30 hands go up.' + (hands >= 24 ? ' Ruth\'s is first. Tom\'s is a moment behind, and higher.' : hands >= 15 ? ' Enough. Not everybody — but enough.' : ' Not many. Mary smiles anyway: "Then we\'ll ask again next week. That\'s allowed."'), () => {
        const l2 = (hands >= 15 ? hands + ' HANDS RAISED · ' : 'NOT YET · ') + (out === 'consensus' ? 'COMMON GROUND.' : out === 'compromise' ? 'A COMPROMISE, FOR NOW.' : 'THE ORCHARD IS DIVIDED.') + (FW().was('bread') === 'immune' ? ' THE BREAD DID NOTHING TO YOU.' : '');
        void st;
        FW().complete(Ch, 'amity', l2, out);
      });
    },
    end(Ch) {
      Ch.ruth.place(14.2, 10.8, 0.2); Ch.ruth.action = 'sit';
      Ch.tom.place(31, 11, 0); Ch.tom.action = 'idle';
      Ch.mary.place(21, 16.5, 0.6);
      this.talk(Ch);
      FW().placePlayer(19.5, 14, 0.4);
    },
  });

  /* ============================== dialogue ============================== */
  const heat = (who, d) => () => { const m = md(); m[who] = U.clamp(m[who] + d, 0, 6); };
  DV.DialogueDB.add('am_mary', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Mary Ellis', faction: 'amity',
        text: () => (DV.Chapter.step === 'end' ? 'You did well. Whatever the hands said — you did well.' : !md().heard.ruth || !md().heard.tom ? 'Ruth\'s down by the bottom trees. Tom\'s at the seedbeds by the sluice. Both of them, mind — not just the one you like better.' : 'Have you been down to the water yet? Walk the whole channel. People only ever look at the end they\'re standing at.'),
        choices: [
          { text: 'What happens if they can\'t agree?', to: 'nope', if: () => DV.Chapter.step !== 'end' },
          { text: 'Thanks, Mary.', end: true },
        ],
      },
      nope: { speaker: 'Mary Ellis', faction: 'amity', text: 'Then the circle sits until they can. We\'ve sat for three days, once. [She laughs.] Nobody wants to do that again.', endText: '...' },
    },
  });
  DV.DialogueDB.add('am_ruth', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Ruth Calder', faction: 'amity',
        text: () => (FW().was('dug') ? 'Water in the ditch for the first time in a fortnight. [She\'s smiling and trying not to.] Tonight, then.' : 'Look at them. [The leaves on the bottom row are curling brown at the edges.] My mother planted these. Forty years. Tom opens that sluice for his precious seedlings and nothing gets down here any more.'),
        choices: [
          { text: 'When did it start?', to: 'when', if: () => !FW().was('dug') },
          { text: '[CHARISMA 5] "These trees mean a lot to you."', check: { attr: 'charisma', dc: 5 }, to: 'mother', if: () => !FW().was('dug') },
          { text: 'Have you talked to Tom about it?', to: 'talked', if: () => !FW().was('dug') },
          { text: 'I\'ll see what I can find out.', end: true },
        ],
      },
      when: { speaker: 'Ruth Calder', faction: 'amity', text: 'Two weeks ago. Right when he dug his new beds. [She says it like it proves everything.] It was never good down here, mind, not since the spring flood. But it was never this.', next: 'start', nextText: '...', onEnter: () => { FW().note('ruth_flood'); } },
      mother: { speaker: 'Ruth Calder', faction: 'amity', text: '[Her arms come uncrossed.] ...She grafted every one of them herself. When they go, she goes, a bit. That\'s silly, isn\'t it. [It isn\'t, and you don\'t say it is.]', next: 'start', nextText: '...', onEnter: () => { md().heard.ruthDeep = true; heat('ruth', -1)(); } },
      talked: { speaker: 'Ruth Calder', faction: 'amity', text: 'Talked! I told him. He smiled at me. Amity smile. [She does an impression, and it\'s not kind.] "I\'m sure it\'ll sort itself out, Ruth."', next: 'start', nextText: '...' },
    },
    onEnd: () => { md().heard.ruth = true; },
  });
  DV.DialogueDB.add('am_tom', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Tom Asher', faction: 'amity',
        text: () => (FW().was('dug') ? 'Heard you dug out the culvert. [He rubs his neck.] I should have looked. I should have walked down there.' : 'Winter greens. [He waves at the seedbeds.] That\'s half the orchard fed in January. They need water now, while they\'re small. I opened the sluice a quarter turn, that\'s all. A quarter.'),
        choices: [
          { text: '[PERCEPTION 6] The wheel on the sluice is turned a lot more than a quarter.', check: { attr: 'perception', dc: 6 }, to: 'half', if: () => !FW().was('dug') && !!FW().was('saw_sluice') },
          { text: 'When do the seedlings need it most?', to: 'when', if: () => !FW().was('dug') },
          { text: 'Ruth says her trees are dying.', to: 'ruth', if: () => !FW().was('dug') },
          { text: 'See you tonight.', end: true },
        ],
      },
      half: { speaker: 'Tom Asher', faction: 'amity', text: '[He looks at it. He looks at you.] ...Half, then. Maybe more. I opened it a quarter and then a bit and then — they were wilting, all right? [Quieter.] I didn\'t think it would make any difference down at her end.', next: 'start', nextText: '...', onEnter: () => { FW().note('tom_half'); heat('tom', -1)(); } },
      when: { speaker: 'Tom Asher', faction: 'amity', text: 'Morning, mostly. You water at dawn, the sun doesn\'t steal it. [He blinks.] I suppose after that it doesn\'t much matter.', next: 'start', nextText: '...', onEnter: () => FW().note('dawn') },
      ruth: { speaker: 'Tom Asher', faction: 'amity', text: '[He winces.] Her end\'s been dry since the flood. Everybody knows that. It isn\'t me. [He doesn\'t sound sure.]', next: 'start', nextText: '...' },
    },
    onEnd: () => { md().heard.tom = true; },
  });
  DV.DialogueDB.add('am_sluice', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Sluice Gate', faction: 'amity',
        text: '[The gate board is wound up a long way — well over half open — and most of the water is going down the new branch into Tom\'s beds. What\'s left goes on down the channel.]',
        choices: [
          { text: 'Wind it back to a quarter.', to: 'wound', effect: () => { FW().note('closed_sluice'); heat('tom', 2)(); } },
          { text: 'Leave it. It isn\'t yours to change.', end: true },
        ],
      },
      wound: { speaker: '', text: '[You wind the wheel down. The branch to the seedbeds drops to a trickle. Somewhere up the slope, Tom Asher will notice.]', endText: '...' },
    },
  });
  DV.DialogueDB.add('am_circle', {
    entry: 'open',
    nodes: {
      open: {
        speaker: 'Mary Ellis', faction: 'amity',
        text: 'We\'re here for Ruth and for Tom, and for the water. {name} has spent today listening to them both. {name} — where would you like to begin?',
        choices: [
          { text: 'With Ruth. Ruth, tell everyone what you told me.', to: 'ruth_speaks' },
          { text: 'With what I found at the culvert.', to: 'culvert', if: () => !!FW().was('dug') || !!FW().was('found_silt') },
          { text: 'Tom took the water. He should give it back.', to: 'blame', effect: () => { heat('tom', 2)(); heat('ruth', -1)(); } },
        ],
      },
      ruth_speaks: {
        speaker: 'Ruth Calder', faction: 'amity',
        text: 'My trees are dying. My mother\'s trees. And every time I say so, someone smiles at me and tells me it\'ll sort itself out.',
        choices: [
          { text: '"You\'re afraid of losing the last of her, not just the trees."', if: () => !!md().heard.ruthDeep, to: 'heard_ruth', effect: () => { heat('ruth', -2)(); } },
          { text: '"You need water at the bottom of the orchard, and nobody\'s been listening."', to: 'heard_ruth', effect: () => { heat('ruth', -1)(); } },
          { text: 'Tom, what do you say to that?', to: 'tom_speaks' },
        ],
      },
      heard_ruth: { speaker: 'Ruth Calder', faction: 'amity', text: '[She nods, once, and something goes out of her shoulders.] ...Yes. That.', next: 'tom_speaks', nextText: 'Tom?' },
      tom_speaks: {
        speaker: 'Tom Asher', faction: 'amity',
        text: 'The greens feed everyone in winter. Everyone. I\'m not taking anything for me. [To the fire, not to her:] And her end was dry before I ever dug those beds.',
        choices: [
          { text: '"You were trying to feed everyone. Nobody here thinks you were being selfish."', to: 'heard_tom', effect: () => heat('tom', -1)() },
          { text: '"You opened the sluice more than a quarter, Tom."', if: () => !!FW().was('tom_half'), to: 'half', effect: () => { heat('tom', FW().was('closed_sluice') ? 1 : -1)(); } },
          { text: 'On to what I found.', to: 'culvert', if: () => !!FW().was('dug') || !!FW().was('found_silt') },
          { text: 'Let\'s hear proposals.', to: 'propose' },
        ],
      },
      heard_tom: { speaker: 'Tom Asher', faction: 'amity', text: '[He looks up from his boots for the first time.] ...No. I wasn\'t.', next: 'findings', nextText: '...' },
      half: { speaker: 'Tom Asher', faction: 'amity', text: '[A murmur round the fire. Tom goes red.] I did. More than half. I told you a quarter because a quarter sounded reasonable. I\'m sorry, Ruth.', next: 'findings', nextText: '...', onEnter: () => heat('ruth', -1)() },
      blame: { speaker: 'Tom Asher', faction: 'amity', text: '[He\'s on his feet.] Is that what this is? A trial? I thought we didn\'t do trials. [Mary puts a hand on his arm until he sits.]', next: 'findings', nextText: '...' },
      findings: {
        speaker: 'Mary Ellis', faction: 'amity',
        text: 'Did you find anything, when you walked the water?',
        choices: [
          { text: 'The culvert under the track was choked with silt. I dug it out this afternoon. The water reaches Ruth\'s trees again.', if: () => !!FW().was('dug'), to: 'culvert' },
          { text: 'The culvert under the track is blocked. That\'s why the bottom is dry.', if: () => !FW().was('dug') && !!FW().was('found_silt'), to: 'culvert' },
          { text: 'I didn\'t get that far.', to: 'propose' },
        ],
      },
      culvert: {
        speaker: 'Ruth Calder', faction: 'amity',
        text: () => (FW().was('dug') ? '[Ruth turns to look at you.] That was you? The water this afternoon? [To Tom, slowly:] ...So it wasn\'t only you.' : '[Ruth frowns.] Blocked? Since when? [Tom:] Since the flood, I\'d bet. Nobody\'s been under there in two years.'),
        next: 'propose', nextText: '...',
        onEnter: () => { heat('ruth', FW().was('dug') ? -2 : -1)(); heat('tom', -1)(); FW().note('said_culvert'); },
      },
      propose: {
        speaker: 'Mary Ellis', faction: 'amity',
        text: 'Then what would you suggest?',
        choices: [
          { text: '[INTELLIGENCE 6] Tom waters his beds at dawn, when it counts — then closes the branch, and the channel runs full to the orchard the rest of the day. And we clear the culvert every spring.', check: { attr: 'intelligence', dc: 6 }, to: 'dawn', if: () => !!FW().was('dawn') || DV.Stats.attr('intelligence') >= 7, effect: () => { heat('tom', -2)(); heat('ruth', -2)(); FW().note('proposal', 'dawn'); } },
          { text: 'Alternate days: Tom\'s beds one day, Ruth\'s trees the next.', to: 'alternate', effect: () => { heat('tom', -1)(); heat('ruth', -1)(); FW().note('proposal', 'alternate'); } },
          { text: 'Tom closes the sluice to a quarter, as he said, and keeps it there.', to: 'quarter', effect: () => { heat('ruth', -1)(); heat('tom', 1)(); FW().note('proposal', 'quarter'); } },
          { text: 'Let the circle decide. Show of hands.', to: 'vote', effect: () => { FW().note('proposal', 'vote'); } },
        ],
      },
      dawn: { speaker: 'Tom Asher', faction: 'amity', text: '[Tom and Ruth look at each other across the fire for a long moment.] ...I\'d dig the culvert with you. Every spring. [Ruth:] You\'d better.', next: 'close', nextText: '...' },
      alternate: { speaker: 'Ruth Calder', faction: 'amity', text: 'Every other day. [She thinks.] The trees can live with that. Can your greens, Tom? [Tom, grudging:] They\'ll have to.', next: 'close', nextText: '...' },
      quarter: { speaker: 'Tom Asher', faction: 'amity', text: '[He nods, but his jaw is tight.] A quarter. Fine. And when the greens fail in January, we\'ll all remember whose idea it was.', next: 'close', nextText: '...' },
      vote: { speaker: 'Mary Ellis', faction: 'amity', text: '[Hands go up, and down, and up again. It takes an hour. Nobody is happy and nobody is quite unhappy.] ...Alternate days, then. As the circle wishes.', next: 'close', nextText: '...' },
      close: {
        speaker: 'Mary Ellis', faction: 'amity',
        text: () => { const m = md(); const ok = m.ruth + m.tom; return ok <= 2 ? '[Ruth stands up, walks round the fire, and puts her hand on Tom\'s shoulder. The whole circle breathes out.] Then it\'s agreed. Thank you, {name}. Supper!' : ok <= 5 ? 'Then it\'s agreed — for now. We\'ll see how the water feels in a month. Thank you, {name}. Supper.' : '[Ruth is the first to leave the fire. Tom the second, the other way.] ...We\'ll sit again tomorrow. Supper, everyone.'; },
        endText: '...',
        onEnter: () => {
          const m = md(), ok = m.ruth + m.tom;
          const out = ok <= 2 ? 'consensus' : ok <= 5 ? 'compromise' : 'fracture';
          FW().note('mediated', out);
          FW().mark('circle', { consensus: 10, compromise: 6, fracture: 2 }[out] + (FW().was('said_culvert') ? 2 : 0), 12, 'The circle: ' + out + '.');
          DV.Quests.setObj('week_amity', 'circle', 'done', { consensus: 'Ruth and Tom found common ground.', compromise: 'A compromise, for now.', fracture: 'The circle broke up without agreement.' }[out]);
          if (out === 'consensus') DV.State.setFlag('amity_consensus');
        },
      },
    },
  });
  // the bread: everyone says it's the best in the city, and everyone gets very calm after it
  DV.DialogueDB.add('am_bread', {
    entry: 'start',
    nodes: {
      start: {
        speaker: '', faction: 'amity',
        text: '[A warm loaf comes round. Everyone tears a piece and passes it on. Across the table, the woman who baked it adds a pinch of something from a tin to the next bowl of dough, without looking, the way you\'d add salt.]',
        choices: [
          { text: 'Eat it.', to: 'eat' },
          { text: '[PERCEPTION 6] Watch the tin. Watch the faces.', check: { attr: 'perception', dc: 6 }, to: 'watch' },
          { text: '[AGILITY 6] Tear a piece, and palm it under the table.', check: { attr: 'agility', dc: 6 }, to: 'palm', fail: 'palm_fail' },
        ],
      },
      watch: {
        speaker: '', faction: 'amity',
        text: '[A plain tin with a dispensary stamp. And round the table, after the bread — the same soft smile, settling on face after face, a minute apart, like lamps being lit. Ruth and Tom are laughing together. An hour ago they couldn\'t look at each other.]',
        choices: [
          { text: 'Eat it anyway.', to: 'eat' },
          { text: '[AGILITY 6] Palm it under the table.', check: { attr: 'agility', dc: 6 }, to: 'palm', fail: 'palm_fail' },
          { text: '[CHARISMA 6] Ask Mary, quietly, what\'s in the tin.', check: { attr: 'charisma', dc: 6 }, to: 'ask' },
        ],
        onEnter: () => { FW().note('saw_tin'); DV.State.setFlag('saw_peace_tin'); },
      },
      eat: {
        speaker: '', faction: 'amity',
        text: () => (APT().divergent ? '[It\'s good bread. That\'s all it is, to you. But round the table everyone has gone soft at the edges, the same soft, all at once — and you haven\'t. Mary, at the end of the table, is watching you instead of the fire.]' : '[It\'s good bread. A warmth goes through you, slow, from the middle outwards, and the day\'s worries come loose and float off one by one. Everyone is so kind. Why were you ever worried?]'),
        choices: () => [{ text: '...', to: APT().divergent ? 'mary_sees' : 'calm' }],
        onEnter: () => { FW().note('bread', APT().divergent ? 'immune' : 'ate'); DV.State.setFlag(APT().divergent ? 'peace_serum_immune' : 'ate_peace_bread'); },
      },
      calm: { speaker: '', text: '[Later — you\'re not sure how much later — someone is singing, and you\'re singing too.]', endText: '...' },
      mary_sees: {
        speaker: 'Mary Ellis', faction: 'amity',
        text: '[She comes round the table and sits beside you, and says, very gently:] You look so wide awake, love. [She doesn\'t say anything else for a while.] ...The bread does everyone good. Most people.',
        choices: [
          { text: 'What\'s in it, Mary?', to: 'ask' },
          { text: 'I\'m just tired.', to: 'tired' },
        ],
      },
      tired: { speaker: 'Mary Ellis', faction: 'amity', text: 'Of course you are. [She pats your hand.] Then you\'ll sleep well. [She doesn\'t believe you, and she lets you see that she doesn\'t.]', endText: '...', onEnter: () => DV.State.setFlag('mary_noticed') },
      palm: { speaker: '', text: '[The bread goes into your sleeve and nobody sees. Round the table, the same soft smile settles on face after face. You keep yours on, as best you can.]', endText: '...', onEnter: () => { FW().note('bread', 'palmed'); DV.State.setFlag('palmed_peace_bread'); } },
      palm_fail: { speaker: 'Mary Ellis', faction: 'amity', text: '[A crust falls out of your sleeve onto the table. Mary picks it up and looks at it, and then at you.] Not hungry, love? [Gently, and only for you:] It\'s all right. You don\'t have to eat it. Nobody has to.', endText: '...', onEnter: () => { FW().note('bread', 'palmed'); DV.State.setFlag('mary_noticed'); } },
      ask: {
        speaker: 'Mary Ellis', faction: 'amity',
        text: '[She takes a long time to answer.] A little something from the dispensary. Only a little. It keeps the peace. [She looks at Ruth and Tom, laughing.] Was that so terrible? A week of shouting, and now look at them.',
        choices: [
          { text: '"They agreed before the bread. They found it themselves."', to: 'themselves', if: () => FW().was('mediated') !== 'fracture' },
          { text: '"Do they know?"', to: 'know' },
          { text: 'Say nothing.', to: 'nothing' },
        ],
        onEnter: () => { FW().note('asked_mary'); DV.State.setFlag('knows_peace_bread'); },
      },
      themselves: { speaker: 'Mary Ellis', faction: 'amity', text: '[She looks at you for a long time.] ...Yes. They did. [Quietly.] Maybe I\'ll bake the next loaf without it. Just to see.', endText: '...', onEnter: () => { DV.State.setFlag('mary_doubts'); if (!FW().was('bread')) FW().note('bread', 'asked'); } },
      know: { speaker: 'Mary Ellis', faction: 'amity', text: 'Everyone knows. Nobody asks. That\'s not the same as not knowing. [She gets up.] Eat or don\'t, love. Nobody here will make you.', endText: '...', onEnter: () => { if (!FW().was('bread')) FW().note('bread', 'asked'); } },
      nothing: { speaker: 'Mary Ellis', faction: 'amity', text: '[She pats your hand, and goes back to her end of the table.]', endText: '...', onEnter: () => { if (!FW().was('bread')) FW().note('bread', 'asked'); } },
    },
    onEnd: () => { if (!FW().was('bread')) FW().note('bread', 'ate'); FW().mark('supper', 1, 1); },
  });
  DV.DialogueDB.add('am_lucy', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Lucy Barnes', faction: 'amity',
        text: () => (DV.State.flag('bird_returned') ? '[She takes the little carved bird out of her pocket to show you, as if you might have forgotten.] I keep it on the windowsill. It looks out at the orchard. Grandma would have liked that.' : 'Sorry — sorry, am I in your way? I\'m always in somebody\'s way. [She is not in your way.]'),
        endText: 'You\'re not in the way, Lucy.',
      },
    },
  });
  DV.DialogueDB.add('am_peer', {
    entry: 'start',
    nodes: {
      start: {
        faction: 'amity',
        text: () => (FW().was('dug') ? 'Was that you who got the water going? Ruth hasn\'t stopped talking about it.' : 'They say the circle once sat for three days. I brought a cushion, just in case.'),
        endText: 'Ha.',
      },
    },
  });
})();
