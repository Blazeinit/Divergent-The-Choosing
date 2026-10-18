/* ==========================================================================
   DIVERGENT — the Circle Line
   An underground railway under the city: six stations on a loop, two tracks
   (the inner loop clockwise, the outer loop back), trains on a timetable
   from 05:30 until the curfew at 21:00 — every five minutes in the rush
   hours, every eight otherwise.

   Go down a station entrance in the city (E at the portal on the building
   front) and you come out at the foot of the stairs in the ticket hall.
   Through the gates, the island platform: the inner loop on one side, the
   outer loop on the other, behind glass screen doors. The boards say what's
   due. A train runs in, stops, the doors open (both sets), people get off,
   then people get on; the chime, "stand clear", the doors shut, and it goes.

   Be on board when the doors shut and you ride. Walk the cars end to end
   (the gangways are open), sit down (E at a seat), or hold on (E at a pole
   or under the rail). Stand without holding on and you'll stagger when it
   pulls away or brakes. The next station's name comes over the PA; get off
   there, or stay on round the loop. Up the stairs and you're in the street
   by that station's entrance.

   The people are commuters, and they behave like it: they wait beside the
   doors, not in front of them, and let people off first; they sit where
   there's a gap between them and the next person if they can; the
   Dauntless stand by the doors; the Abnegation give their seat to someone
   older; a man asleep against the window wakes with a start at his stop;
   someone always runs for the doors as they close. Up in the street, people
   come and go from every entrance, more of them in the rush hours.

     DV.Metro.attachCity(zone, city)   the entrances (js/zones/testingCenter.js)
     DV.Metro.enter(i) / exit()       down the stairs / up them
     DV.Metro.riding()                on a train between stations
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const MK = DV.MetroKit, K = MK.K;

  const COLOUR = 0xc0582a; // the Circle Line's colour: rust
  // in order round the loop (the inner loop goes this way, the outer loop back). Each entrance is on a
  // building front: (x, z) on the building line and the way it faces onto the street.
  const STATIONS = [
    { id: 'halsted', name: 'Halsted', sub: 'Testing District', x: 103.2, z: 118, face: 'w', accent: 0x8a8478, mix: { abnegation: 3, erudite: 3, candor: 2, amity: 2, dauntless: 2 } },
    { id: 'state', name: 'State & Grand', sub: 'Dauntless Sector', x: 312.8, z: -166, face: 'e', accent: 0xa03024, mix: { dauntless: 7, erudite: 1, candor: 1 } },
    { id: 'wells', name: 'Wells', sub: 'Erudite Headquarters', x: 236.8, z: 252, face: 'e', accent: 0x2f5f9a, mix: { erudite: 7, candor: 1, abnegation: 1 } },
    { id: 'hub', name: 'Hub Central', sub: 'Downtown · The Hub', x: 116, z: 332.8, face: 's', accent: 0x6a7480, mix: { erudite: 3, candor: 3, abnegation: 2, dauntless: 2, amity: 1 } },
    { id: 'mart', name: 'Merciless Mart', sub: 'Candor Sector', x: -122.6, z: 267.9, face: 's', accent: 0xd8d8d0, mix: { candor: 7, erudite: 1, abnegation: 1 } },
    { id: 'california', name: 'California', sub: 'Abnegation Sector', x: -308.8, z: -42, face: 'w', accent: 0x9a968c, mix: { abnegation: 8, amity: 1 } },
  ];
  const N = STATIONS.length;
  const FACE = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
  const FROT = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 };

  // timing (real seconds; the clock runs at ten game seconds to one)
  const ARR_T = 11, DEP_T = 11, APPROACH = 105, DWELL = 19, DOOR_T = 1.3;
  const VMAX = 17, ACC = 1.15, DEC = 1.05, WRAP_E = 120;
  const OPEN_FROM = 5.5 * 60, OPEN_TO = 21 * 60;

  const LINES = {
    abnegation: ['Would you like my seat?', 'Two more stops. Then the walk.', 'Mind the doors — let them off first.', 'I take the outer loop. It\'s quieter.', 'Good morning. Or — is it afternoon already?'],
    erudite: ['Eight-minute headway off-peak. Five in the rush. Nobody ever believes me.', 'The tunnels predate the Fence by a century. Remarkable engineering.', 'Do you mind? I\'m reading.', 'Wells is the stop for headquarters. Obviously.', 'They timed the doors at nineteen seconds. It is not enough.'],
    candor: ['You\'re standing too close. Just so you know.', 'This train smells. Somebody had to say it.', 'You look like you missed your stop.', 'They check faction cards at Hub Central now. Did you know?', 'I hate the outer loop. I\'m on it every day.'],
    amity: ['Isn\'t it nice, all of us in here together?', 'Here — there\'s room. Squeeze in.', 'The truck\'s quicker to the farms, but I like the train.', 'Peace be with you. Mind your bag.'],
    dauntless: ['Real Dauntless ride the L. On the roof.', 'Move.', 'I could get there faster on foot. Running.', 'Doors shut in four seconds. Watch this.', 'You ever ride between the cars? Don\'t.'],
  };
  const PASSING = ['Excuse me.', 'Sorry.', 'Mind out.', 'Coming through.', 'Pardon.'];

  const st = (i) => STATIONS[((i % N) + N) % N];
  const nextOf = (i, key) => (i + (key === 'A' ? 1 : -1) + N) % N;
  const hop = (a, b) => { const A = st(a), B = st(b); return Math.round(U.clamp(Math.hypot(A.x - B.x, A.z - B.z) * 0.55, 260, 520) / 10) * 10; };
  const service = () => { const m = DV.Clock.minutes(); return m >= OPEN_FROM && m < OPEN_TO; };
  const peak = () => { const m = DV.Clock.minutes(); return (m >= 420 && m < 570) || (m >= 990 && m < 1140); };
  const headway = () => (peak() ? 5 : 8);
  const busy = () => { const m = DV.Clock.minutes(); return m < OPEN_FROM || m >= OPEN_TO ? 0 : peak() ? 1 : m >= 1140 ? 0.35 : 0.6; };
  const beep = (f, d, v, w) => { const A = DV.Audio; if (A && A.ready) try { A.tone(f, d, 'sine', v, w); } catch (e) { /* not ready */ } };
  const pick = (r, mix) => { let tot = 0; for (const f in mix) tot += mix[f]; let q = r() * tot; for (const f in mix) { q -= mix[f]; if (q <= 0) return f; } return 'abnegation'; };

  const Metro = {
    STATIONS, COLOUR,
    zone: null, kit: null, trains: null, mode: 'platform', here: 0, ride: null, offset: 0,
    people: [], pool: [], r: U.rng(1871),
    stats: { boarded: 0, alighted: 0, gaveSeat: 0, missed: 0, rides: 0, gap: 0, squeezed: 0 }, // (what the commuters did: the QA reads it)
    riding() { return this.mode === 'ride' && !!this.ride && this.ride.phase === 'run'; },
    inMetro() { return !!this.zone && DV.World.current === this.zone; },
    open: service,

    /* ================================================================ the zone */
    build(ctx) {
      const zone = ctx.zone;
      this.zone = zone;
      const boxes = { st: [], A: [], B: [], doorA: {}, doorB: {}, psdA: {}, psdB: {}, flaps: [] };
      this.boxes = boxes;
      const collide = (x0, z0, x1, z1, o) => { const b = zone.colliders.add(x0, z0, x1, z1, o); boxes.st.push(b); return b; };
      const kit = (this.kit = MK.buildStation(collide));
      ctx.add(kit.group);
      // (the east end wall, and the screen doors' own leaves: shut unless a train's doors are open)
      collide(K.plat.x1, 4.3, K.plat.x1 + 0.3, 13.7, { y1: K.ceil, tag: 'st' });
      for (const key of ['A', 'B']) {
        const zl = K.psd[key];
        for (const dx of kit.doorsX) { const b = collide(dx - 0.8, zl - 0.06, dx + 0.8, zl + 0.06, { y1: 2.6, tag: 'psd' }); boxes['psd' + key][dx] = b; }
      }
      K.lanes.forEach((z) => boxes.flaps.push(collide(K.gateX - 0.05, z - 0.45, K.gateX + 0.05, z + 0.45, { y1: 1.0, camera: false, tag: 'flap' })));
      // the two trains, and their colliders (laid out at the berth; on only while that train stands there)
      this.trains = {};
      for (const key of ['A', 'B']) {
        const tk = MK.buildTrain(key, COLOUR);
        const tz = K.track[key].z;
        tk.group.position.set(0, 0, tz);
        tk.group.visible = false;
        ctx.add(tk.group);
        for (const b of tk.boxes()) {
          const c = zone.colliders.add(b.x0, b.z0 + tz, b.x1, b.z1 + tz, { y1: b.y1, camera: b.camera, tag: 'train' });
          c.enabled = false;
          boxes[key].push(c);
          if (b.tag === 'door') boxes['door' + key][b.door] = c;
        }
        const seats = tk.seats.map((s, i) => Object.assign({}, s, { id: 'm' + key + 's' + i, z: s.z + tz, az: s.az + tz, occupant: null, key }));
        const holds = tk.holds.map((s, i) => Object.assign({}, s, { id: 'm' + key + 'h' + i, z: s.z + tz, ax: s.x, az: s.z + tz, occupant: null, key }));
        const tr = { key, kit: tk, z: tz, dir: K.track[key].dir, side: K.track[key].side, state: 'none', t: 0, x: 0, doorK: 0, nextAt: 0, seats, holds, sound: null, reopen: 0, closing: false, chimed: false, opened: false, boarded: false, speed: 0, accel: 0 };
        this.trains[key] = tr;
        // sit down (E), or hold on (E): only aboard a train that's standing here or carrying you
        for (const s of seats) zone.interactables.push({ id: 'seat:' + s.id, kind: 'seat', spot: s, x: s.x, y: 0.6, z: s.z, radius: 1.0, label: 'Sit', name: 'Seat', cond: () => this.aboardOK(tr) });
        for (const h of holds) zone.interactables.push({ id: 'hold:' + h.id, kind: 'action', x: h.x, y: 1.5, z: h.z, radius: 0.75, label: 'Hold on', name: h.pole ? 'Pole' : 'Grab Rail', bias: 0.4, cond: () => this.aboardOK(tr) && DV.Player.state !== 'sitting' && !h.occupant, onUse: () => { DV.Game.sitOn(h, true); DV.UI.notify('Holding on. Move to let go.'); } });
      }
      // the platform benches
      this.benches = kit.seats.map((s, i) => Object.assign({ id: 'mbench' + i, occupant: null }, s));
      for (const s of this.benches) zone.interactables.push({ id: 'seat:' + s.id, kind: 'seat', spot: s, x: s.x, y: 0.6, z: s.z, radius: 1.1, label: 'Sit', name: 'Bench', cond: () => this.mode === 'platform' || (this.ride && this.ride.phase === 'dwell') });
      // up the stairs to the street (walk out into the daylight at the top, or E there)
      zone.interactables.push({
        id: 'metro_exit', kind: 'action', x: K.stairs.out + 1.0, y: K.stairs.rise + 1.2, z: 9, radius: 1.8, label: 'Out to the street',
        get name() { return st(Metro.here).name + ' — Exit'; }, cond: () => this.canExit(),
        onUse: () => this.exit(),
      });
      // the departure boards, the route map in the cars
      zone.interactables.push({ id: 'metro_map', kind: 'action', x: K.hall.x0 + 3.5, y: 1.4, z: 13.2, radius: 1.3, label: 'Read', name: 'Line Map', onUse: () => DV.UI.showReading('THE CIRCLE LINE', this.mapText()) });
      zone.extras = this; // (speech and bodies: see bodies() and barkSources())
      ctx.update((dt) => this.update(dt));
      this.dress(0);
    },
    canExit() { return this.mode === 'platform' || (!!this.ride && this.ride.phase === 'dwell' && !this.playerAboard(this.trains[this.ride.key])); },
    aboardOK(tr) {
      if (this.mode === 'ride') return this.ride && this.ride.key === tr.key;
      return tr.state === 'dwell';
    },
    playerAboard(tr) {
      const P = DV.Player;
      return Math.abs(P.x) < K.half - 1.4 && Math.abs(P.z - tr.z) < K.inW + 0.05;
    },

    /* ---------------- the station you're at ---------------- */
    dress(i) {
      this.here = ((i % N) + N) % N;
      const S = st(this.here), kit = this.kit;
      kit.accent.color.setHex(S.accent);
      kit.accentMetal.color.setHex(S.accent);
      MK.drawRoundel(kit.name, S.name.toUpperCase(), S.accent, 'CIRCLE LINE · ' + S.sub.toUpperCase());
      const w = kit.way, c = w.ctx;
      c.fillStyle = '#14181c'; c.fillRect(0, 0, 512, 64);
      c.fillStyle = '#ece8dc'; c.font = 'bold 26px "Arial Narrow", Arial, sans-serif'; c.textBaseline = 'middle';
      c.textAlign = 'left'; c.fillText('◄ WAY OUT  ·  ' + S.name.toUpperCase(), 14, 32);
      c.textAlign = 'right'; c.fillStyle = '#' + new THREE.Color(COLOUR).getHexString(); c.fillText('TRAINS ►', 498, 32);
      w.tex.needsUpdate = true;
      const z = this.zone;
      if (z.roomMap) {
        z.roomMap.m_plat.name = S.name;
        z.roomMap.m_hall.name = S.name + ' — Ticket Hall';
        z.roomMap.m_stairs.name = S.name + ' — Stairs';
      }
      z.def.region = 'Circle Line · ' + S.sub;
      this.drawBoard(true);
      for (const key of ['A', 'B']) this.drawTrainSigns(this.trains[key]);
    },
    mapText() {
      const lines = ['Six stations on a loop under the city. Inner loop clockwise; outer loop the other way round.', ''];
      STATIONS.forEach((s, i) => lines.push((i === this.here ? '► ' : '   ') + s.name + ' — ' + s.sub));
      lines.push('', 'Trains every 5 minutes in the rush hours (07:00–09:30, 16:30–19:00), every 8 minutes otherwise.', 'First trains 05:30. Last trains before the curfew at 21:00.', '', 'THIS NETWORK IS MONITORED BY THE OFFICE OF PUBLIC ORDER. CARRY YOUR FACTION IDENTIFICATION.');
      return lines.join('\n');
    },
    drawBoard(force) {
      const now = performance.now();
      if (!force && now - (this._boardT || 0) < 1000) return;
      this._boardT = now;
      const b = this.kit.board, c = b.ctx;
      c.fillStyle = '#0b0d0e'; c.fillRect(0, 0, 512, 160);
      c.fillStyle = '#e8b04a'; c.font = 'bold 22px "Courier New", monospace'; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.fillText('CIRCLE LINE', 14, 22);
      c.textAlign = 'right'; c.fillText(DV.Clock.str(), 498, 22);
      c.fillStyle = '#3a3020'; c.fillRect(10, 40, 492, 2);
      const row = (y, key) => {
        const tr = this.trains[key], to = st(nextOf(this.here, key));
        let when;
        if (!service() && tr.state === 'none') when = 'CLOSED';
        else if (tr.state === 'dwell' || (this.mode === 'ride' && this.ride && this.ride.key === key && this.ride.phase === 'dwell')) when = 'BOARDING';
        else if (tr.state === 'arrive') when = 'DUE';
        else if (this.mode === 'ride' && this.ride && this.ride.key !== key) when = '—';
        else { const m = Math.max(0, Math.ceil(tr.nextAt - DV.Clock.total())); when = m <= 0 ? 'DUE' : m + ' MIN'; }
        c.textAlign = 'left'; c.fillStyle = '#e8b04a';
        c.font = 'bold 21px "Courier New", monospace';
        c.fillText((key === 'A' ? 'INNER ▸ ' : 'OUTER ◂ ') + to.name.toUpperCase(), 14, y);
        c.textAlign = 'right'; c.fillText(when, 498, y);
      };
      row(72, 'A');
      row(110, 'B');
      if (!service()) { c.textAlign = 'center'; c.fillStyle = '#c84a3a'; c.font = 'bold 15px "Courier New", monospace'; c.fillText('NO SERVICE: CURFEW 21:00 – 05:30', 256, 145); }
      else { c.textAlign = 'center'; c.fillStyle = '#7a6a48'; c.font = '14px "Courier New", monospace'; c.fillText('CARRY YOUR FACTION CARD AT ALL TIMES', 256, 145); }
      b.tex.needsUpdate = true;
    },
    drawTrainSigns(tr) {
      const at = this.mode === 'ride' && this.ride && this.ride.key === tr.key ? this.ride : null;
      const next = at ? (at.phase === 'dwell' ? this.here : at.to) : nextOf(this.here, tr.key);
      const d = tr.kit.disp, c = d.ctx;
      c.fillStyle = '#0a0c0d'; c.fillRect(0, 0, 256, 48);
      c.fillStyle = '#e8b04a'; c.font = 'bold 20px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText((at && at.phase === 'dwell' ? 'THIS IS ' : at ? 'NEXT: ' : (tr.key === 'A' ? 'INNER: ' : 'OUTER: ')) + st(next).name.toUpperCase(), 128, 25);
      d.tex.needsUpdate = true;
      // the route strip over the windows: every station, the next one lit
      const m = tr.kit.map, g = m.ctx, W = 1024;
      g.fillStyle = '#ece8dc'; g.fillRect(0, 0, W, 64);
      const hex = '#' + new THREE.Color(COLOUR).getHexString();
      g.fillStyle = hex; g.fillRect(30, 20, W - 60, 8);
      const order = [];
      for (let k = 0; k < N; k++) order.push((this.here + (tr.key === 'A' ? k : -k) + N * 2) % N);
      order.forEach((si, k) => {
        const x = 40 + ((W - 80) * k) / (N - 1);
        g.fillStyle = si === next ? hex : '#ffffff'; g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
        g.beginPath(); g.arc(x, 24, 9, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#1a1a1a'; g.font = (si === next ? 'bold ' : '') + '15px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center';
        g.fillText(st(si).name, x, 48);
      });
      m.tex.needsUpdate = true;
    },

    /* ================================================================ in and out */
    enter(i) {
      const G = DV.Game;
      if (!service()) { DV.UI.notify('The gates are shut: no trains between 21:00 and 05:30.'); return; }
      if (G.ctrl()) { DV.UI.notify('Not now.'); return; }
      this.fromZone = DV.World.current ? DV.World.current.id : 'testing_center';
      G.state = 'transition';
      DV.Input.clearMovement();
      DV.Audio.play('door', { volume: 0.5 });
      DV.UI.fade(1, 650).then(() => { try { this.arrive(i); } catch (e) { DV.UI.showError((e && e.stack) || String(e)); } });
    },
    arrive(i) {
      const G = DV.Game, P = DV.Player;
      const zone = DV.World.activate('metro');
      if (!P.model.root.parent) G.scene.add(P.model.root);
      if (P.seat) { P.seat.occupant = null; P.seat = null; }
      P.state = 'free'; P.pinned = false; P.cineAction = null; P.crouched = false; P.vx = P.vz = 0;
      this.mode = 'platform';
      this.ride = null;
      this.setOffset(0);
      this.clearPeople();
      this.dress(i);
      for (const key of ['A', 'B']) this.resetTrack(this.trains[key], true);
      this.stationColliders(true);
      this.spawnPlatform(true);
      // at the top of the stairs, in off the street: walk down them to the ticket hall
      P.place(K.stairs.top + 0.1, 9, Math.PI / 2);
      G.rig.yaw = P.rot; G.rig.pitch = 0.3; G.rig.follow(true);
      G.triggerState = {}; G.lastRoom = null;
      this.notePos();
      G.state = 'playing';
      G.updateAmbience(true);
      DV.Audio.setMusic('none');
      DV.UI.fade(0, 900);
      setTimeout(() => DV.UI.narrate(st(this.here).name.toUpperCase() + '\nCIRCLE LINE', 2.6), 350);
      if (!DV.State.flag('metro_shown')) {
        DV.State.setFlag('metro_shown');
        setTimeout(() => DV.UI.notify('Through the gates to the platform: inner loop on one side, outer loop on the other. Walk on when the doors open; E to sit or hold on. Ride as far as you like.', 'quest'), 3200);
      }
      DV.Events.emit('metro:enter', { station: st(this.here).id });
      void zone;
    },
    // where a save made down here puts you: in the street, at this station's entrance
    notePos() {
      const S = st(this.here), f = FACE[S.face];
      DV.State.data.player.pos = { x: +(S.x + f[0] * 1.6).toFixed(2), z: +(S.z + f[1] * 1.6).toFixed(2), rot: +FROT[S.face].toFixed(3) };
    },
    exit() {
      const G = DV.Game;
      const S = st(this.here), f = FACE[S.face];
      const sx = S.x + f[0] * 1.8, sz = S.z + f[1] * 1.8, rot = FROT[S.face];
      G.state = 'transition';
      DV.Input.clearMovement();
      DV.UI.fade(1, 700).then(() => {
        try {
          this.clearPeople();
          for (const key of ['A', 'B']) this.stopSound(this.trains[key]);
          const back = this.fromZone || 'testing_center';
          if (back === DV.District.zoneId()) DV.District.enter(DV.District.currentId(), { spawn: [sx, sz, rot], instant: true, title: S.name.toUpperCase() + '\n' + S.sub.toUpperCase() });
          else {
            const zone = DV.World.activate(back);
            DV.NPCs.attach(back);
            DV.Player.place(sx, sz, rot);
            G.rig.yaw = rot; G.rig.follow(true);
            G.state = 'playing';
            G.updateAmbience(true);
            DV.UI.fade(0, 1000);
            void zone;
          }
          DV.Events.emit('metro:exit', { station: S.id });
        } catch (e) { DV.UI.showError((e && e.stack) || String(e)); }
      });
    },

    /* ================================================================ trains */
    resetTrack(tr, fresh) {
      tr.state = 'none'; tr.t = 0; tr.x = 0; tr.doorK = 0; tr.kit.setDoors(0); this.kit.setPSD(tr.key, 0);
      tr.kit.group.visible = false;
      this.trainColliders(tr, false);
      this.stopSound(tr);
      // the next one, by the timetable (the two loops a couple of minutes apart)
      const now = DV.Clock.total(), H = headway(), off = tr.key === 'A' ? 1 : 3.5 + (this.here % 3);
      tr.nextAt = Math.ceil((now - off) / H) * H + off;
      if (fresh && tr.nextAt - now > H * 0.8) tr.nextAt -= H * 0.5; // (you've just come down: it's never long)
      for (const a of this.people.filter((p) => p.frame === tr.key)) this.despawn(a);
    },
    trainColliders(tr, on) { for (const b of this.boxes[tr.key]) b.enabled = on; if (on) this.doorColliders(tr); },
    doorColliders(tr) {
      const open = tr.doorK > 0.7;
      for (const dx in this.boxes['door' + tr.key]) this.boxes['door' + tr.key][dx].enabled = !open && this.boxes[tr.key][0].enabled;
      for (const dx in this.boxes['psd' + tr.key]) this.boxes['psd' + tr.key][dx].enabled = !open && this.stationOn;
    },
    stationColliders(on) {
      this.stationOn = on;
      for (const b of this.boxes.st) b.enabled = on;
      for (const key of ['A', 'B']) this.doorColliders(this.trains[key]);
    },
    setOffset(x) {
      this.offset = x;
      this.kit.group.position.x = x;
    },
    sound(tr) {
      if (!tr.sound && DV.Audio.ready) tr.sound = DV.Audio.mover('train');
      return tr.sound;
    },
    stopSound(tr) { if (tr.sound) { tr.sound.stop(); tr.sound = null; } },

    // on the platform: trains come and go past you
    stepTrack(tr, dt) {
      tr.t += dt;
      const was = tr.x;
      if (tr.state === 'none') {
        if (service() && DV.Clock.total() >= tr.nextAt) {
          tr.state = 'arrive'; tr.t = 0;
          tr.kit.group.visible = true;
          this.drawTrainSigns(tr);
          this.spawnRiders(tr);
          if (this.playerOnPlatform()) setTimeout(() => this.pa('The ' + (tr.key === 'A' ? 'inner' : 'outer') + ' loop train to ' + st(nextOf(this.here, tr.key)).name + ' is now approaching.'), 400);
        }
      } else if (tr.state === 'arrive') {
        const u = Math.min(1, tr.t / ARR_T);
        tr.x = -tr.dir * APPROACH * (1 - u) * (1 - u);
        if (u >= 1) { tr.x = 0; tr.state = 'dwell'; tr.t = 0; this.trainColliders(tr, true); this.beginDwell(tr); }
      } else if (tr.state === 'dwell') {
        this.stepDwell(tr, dt);
      } else if (tr.state === 'depart') {
        const u = Math.min(1, tr.t / DEP_T);
        tr.x = tr.dir * APPROACH * 1.4 * u * u;
        if (u >= 1) this.resetTrack(tr, false);
      }
      tr.kit.group.position.x = tr.x;
      tr.speed = dt > 0 ? Math.abs(tr.x - was) / dt : 0;
      if (tr.state === 'arrive' || tr.state === 'depart') { const s = this.sound(tr); if (s) s.update(tr.x, tr.z, tr.speed); }
      else if (tr.state === 'dwell' && tr.sound) tr.sound.update(tr.x, tr.z, 0);
    },
    beginDwell(tr) {
      tr.reopen = 0; tr.closing = false; tr.chimed = false; tr.opened = false; tr.boarded = false; tr.dwell = DWELL; tr.termTold = false;
      for (const a of this.people) if (a.frame === tr.key && a.state !== 'despawn') { a.stops--; if (a.stops <= 0) a.wantOff = true; }
    },
    // doors open, people off, people on, the chime, doors shut
    stepDwell(tr, dt) {
      const t = tr.t;
      if (!tr.closing) {
        const k = U.clamp((t - 0.8) / DOOR_T, 0, 1);
        if (k > 0 && tr.doorK === 0) { DV.Audio.play('door', { volume: 0.45 }); beep(1046, 0.12, 0.05); }
        tr.doorK = k;
        if (k >= 1 && !tr.opened) { tr.opened = true; this.alight(tr); }
        if (tr.opened && !tr.boarded && t > 0.8 + DOOR_T + 2.4) { tr.boarded = true; this.board(tr); }
        // the last train after the curfew: it goes no further while you're aboard
        if (this.mode === 'ride' && this.ride && this.ride.key === tr.key && !service() && tr.opened) {
          if (!tr.termTold) { tr.termTold = true; this.pa('This train terminates here. All change, please. The curfew is in force.'); }
          if (this.playerAboard(tr)) tr.dwell = Math.max(tr.dwell, t + 4);
        }
        if (!tr.chimed && t > tr.dwell - 3.2) {
          tr.chimed = true;
          beep(784, 0.22, 0.07); beep(622, 0.3, 0.07, 0.28);
          if (this.near(tr)) DV.UI.subtitle('Circle Line', 'Stand clear of the closing doors, please.', 2.4);
          for (const a of this.people) if (a.state === 'board' && a.train === tr.key) a.hurry = true;
        }
        if (t > tr.dwell - 1.2) {
          // anyone in a doorway? the doors open again (twice; then they shut regardless)
          if (tr.reopen < 2 && this.doorwayBlocked(tr)) { tr.reopen++; tr.dwell += 2.6; tr.chimed = false; DV.UI.subtitle('Circle Line', 'Please stand clear of the doors.', 2.2); }
          else { tr.closing = true; tr.closeT = 0; DV.Audio.play('door', { volume: 0.4 }); }
        }
      } else {
        tr.closeT += dt;
        tr.doorK = U.clamp(1 - tr.closeT / DOOR_T, 0, 1);
        if (tr.doorK <= 0) this.doorsShut(tr);
      }
      tr.kit.setDoors(tr.doorK);
      this.kit.setPSD(tr.key, tr.doorK);
      this.doorColliders(tr);
    },
    doorwayBlocked(tr) {
      const P = DV.Player, zl = K.psd[tr.key];
      const inGap = (x, z) => tr.kit.doors.some((dx) => Math.abs(x - dx) < 0.85 && (z - tr.z) * tr.side > K.inW - 0.3 && (z - zl) * tr.side < 0.35);
      if (inGap(P.x, P.z)) return true;
      return this.people.some((a) => (a.frame === tr.key || a.frame === 'st') && a.state !== 'despawn' && inGap(a.x, a.z));
    },
    doorsShut(tr) {
      tr.doorK = 0;
      tr.kit.setDoors(0); this.kit.setPSD(tr.key, 0);
      this.doorColliders(tr);
      // whoever was still in the doorway: through the screen doors already, they're on; otherwise, next one
      // (back onto the platform). And anyone still getting off who wasn't out yet stays on to the next stop.
      const zl = K.psd[tr.key];
      for (const a of this.people) {
        if (a.state === 'board' && a.train === tr.key && a.frame === 'st') {
          if ((a.z - zl) * tr.side < 0) { a.frame = tr.key; a.path = []; this.stats.boarded++; a.stops = 1 + Math.floor(this.r() * 4); a.wantOff = false; a.hurry = false; a.z = tr.z + tr.side * 0.5; this.stand(a, tr, true); continue; }
          a.state = 'wait'; a.train = null; a.path = []; a.hurry = false; this.stats.missed++;
          if ((a.z - zl) * tr.side < 0.6) a.z = zl + tr.side * 0.7;
          if (this.r() < 0.5) this.say(a, U.pick(['Missed it.', 'Typical.', 'Next one, then.']), 2.5);
        } else if (a.state === 'alight' && a.frame === tr.key) {
          if ((a.z - (tr.z + tr.side * K.inW)) * tr.side > 0.05) { a.frame = 'st'; a.train = null; a.z = zl + tr.side * 0.8; this.stats.alighted++; this.leave(a); }
          else { a.wantOff = false; a.stops = 1; a.path = []; a.wait = 0; this.stand(a, tr, true); this.say(a, U.pick(['Oh, come on.', 'That was my stop.', 'Next one, then.']), 2.5); }
        }
      }
      if (this.mode === 'ride' && this.ride && this.ride.key === tr.key) {
        if (this.playerAboard(tr)) this.nextHop(tr);
        else this.leaveRide(tr);
      } else if (this.mode === 'platform' && this.playerAboard(tr)) this.startRide(tr);
      else { tr.state = 'depart'; tr.t = 0; this.trainColliders(tr, false); for (const a of this.people) if (a.frame === 'st' && a.state === 'board' && a.train === tr.key) a.state = 'wait'; }
    },

    /* ---------------- riding ---------------- */
    startRide(tr) {
      this.mode = 'ride';
      this.stats.rides++;
      const other = this.trains[tr.key === 'A' ? 'B' : 'A'];
      this.resetTrack(other, false);
      other.state = 'held';
      this.ride = { key: tr.key, from: this.here, to: nextOf(this.here, tr.key), s: 0, v: 0, D: hop(this.here, nextOf(this.here, tr.key)), switched: false, phase: 'run', told: false, t: 0 };
      this.stationColliders(false);
      this.trainColliders(tr, true);
      tr.state = 'ride';
      this.drawTrainSigns(tr);
      this.pa('This is a Circle Line train, ' + (tr.key === 'A' ? 'inner' : 'outer') + ' loop. The next station is ' + st(this.ride.to).name + '.');
      DV.Events.emit('metro:depart', { from: st(this.here).id, to: st(this.ride.to).id });
    },
    nextHop(tr) {
      const R = this.ride;
      R.from = this.here; R.to = nextOf(this.here, tr.key); R.s = 0; R.v = 0; R.D = hop(R.from, R.to); R.switched = false; R.phase = 'run'; R.told = false;
      tr.state = 'ride';
      this.stationColliders(false);
      this.drawTrainSigns(tr);
      this.pa('The next station is ' + st(R.to).name + '.');
      DV.Events.emit('metro:depart', { from: st(this.here).id, to: st(R.to).id });
    },
    // the doors shut with you on the platform: it's an ordinary train leaving again
    leaveRide(tr) {
      this.mode = 'platform';
      this.ride = null;
      tr.state = 'depart'; tr.t = 0;
      this.trainColliders(tr, false);
      this.stationColliders(true);
      const other = this.trains[tr.key === 'A' ? 'B' : 'A'];
      this.resetTrack(other, true);
      this.drawTrainSigns(tr);
    },
    // where the station is, s metres into a hop of D: the departure end of the tunnel, then (lamp for
    // lamp) the same stretch over and over, then the arrival end
    rel(s, D) {
      const E = WRAP_E;
      if (s < E) return s;
      if (s > D - E) return s - D;
      return E + ((s - E) % 60);
    },
    stepRide(dt) {
      const R = this.ride, tr = this.trains[R.key];
      R.t += dt;
      if (R.phase === 'run') {
        const v0 = R.v;
        R.v = Math.min(VMAX, R.v + ACC * dt, Math.sqrt(2 * DEC * Math.max(0, R.D - R.s)) + 0.25);
        R.s = Math.min(R.D, R.s + R.v * dt);
        tr.accel = dt > 0 ? (R.v - v0) / dt : 0;
        tr.speed = R.v;
        const r = this.rel(R.s, R.D);
        this.setOffset(-tr.dir * r);
        if (!R.switched && R.s > R.D - WRAP_E) {
          // (out of sight of either: the next station takes the place of this one)
          R.switched = true;
          for (const a of this.people.filter((p) => p.frame === 'st')) this.despawn(a);
          this.dress(R.to);
          this.drawTrainSigns(tr);
          this.spawnPlatform(false);
        }
        if (!R.told && R.D - R.s < 170) { R.told = true; this.pa('Arriving at ' + st(R.to).name + '. ' + (st(R.to).sub ? st(R.to).sub + '.' : '')); }
        const snd = this.sound(tr);
        if (snd) snd.update(DV.Player.x, DV.Player.z + 0.6, R.v);
        // the clack of the rail joints in the floor
        if (R.v > 4 && DV.Game.rig && (R.clack = (R.clack || 0) - dt) <= 0) { R.clack = 18 / R.v; DV.Game.rig.shake = Math.max(DV.Game.rig.shake || 0, 0.06); }
        if (R.s >= R.D - 0.01 && R.v < 0.4) {
          R.phase = 'dwell';
          tr.accel = 0; tr.speed = 0; R.v = 0;
          this.setOffset(0);
          this.here = R.to;
          this.notePos();
          this.stationColliders(true);
          tr.state = 'dwell'; tr.t = 0;
          this.beginDwell(tr);
          this.drawTrainSigns(tr);
          DV.Events.emit('metro:arrive', { station: st(this.here).id });
        }
        this.lurch(dt, tr);
      } else {
        tr.t += dt;
        this.stepDwell(tr, dt);
        if (tr.sound) tr.sound.update(DV.Player.x, DV.Player.z, 0);
      }
    },
    // stand without holding on and the train throws you about
    lurch(dt, tr) {
      const P = DV.Player;
      if (P.state !== 'free' || !this.playerAboard(tr) || Math.abs(tr.accel) < 0.25) return;
      const push = -tr.dir * tr.accel * 0.32 * dt;
      const [nx, nz] = this.zone.colliders.resolveCircle(P.x + push, P.z, 0.3, 'player', 0);
      P.x = nx; P.z = nz; P.syncModel();
      if (!this._lurchTold && Math.abs(tr.accel) > 0.8) { this._lurchTold = true; DV.UI.notify('You stagger as the train lurches. Hold on to a pole or a rail (E), or sit down.'); }
    },
    near(tr) { const P = DV.Player; return Math.abs(P.x - tr.x) < 60; },
    playerOnPlatform() { const P = DV.Player; return P.z > K.plat.z0 - 0.2 && P.z < K.plat.z1 + 0.2; },
    pa(text) {
      DV.Audio.play('chime', { volume: 0.4 });
      setTimeout(() => DV.UI.subtitle('Circle Line', text, 4.2), 900);
    },

    /* ================================================================ the people */
    model(f) {
      let m = this.pool.find((q) => !q.busy && q.f === f);
      if (!m && this.pool.length >= 44) {
        const i = this.pool.findIndex((q) => !q.busy);
        if (i < 0) return null;
        const old = this.pool.splice(i, 1)[0];
        old.model.dispose();
      }
      if (!m) {
        const n = (this.modelN = (this.modelN || 0) + 1);
        const sex = this.r() < 0.5 ? 'f' : 'm';
        const age = this.r() < 0.12 ? 16 + Math.floor(this.r() * 3) : 21 + Math.floor(this.r() * 50);
        const app = DV.Character.fromFaction(f, sex, 'metro:' + f + ':' + n, { age });
        const model = DV.Character.create(app);
        model.noShadow = true; model.shadow.visible = false;
        this.zone.group.add(model.root);
        m = { model, f, sex, age, app, busy: false, name: DV.Names.person(f, sex, 'metro' + n) };
        this.pool.push(m);
      }
      m.busy = true;
      m.model.root.visible = true;
      return m;
    },
    spawn(f, frame, x, z, o) {
      const m = this.model(f);
      if (!m) return null;
      const a = Object.assign({ id: 'mp' + (this.idN = (this.idN || 0) + 1), m, f, name: m.name, frame, x, z, y: 0, rot: 0, state: 'wait', path: [], speed: 0, pace: (m.age > 60 ? 0.95 : 1.25) + this.r() * 0.3, act: 'idle', stops: 1, wait: 0, bark: null, barkCool: 5 + this.r() * 20, lodT: 0, seat: null, hold: null, train: null }, o || {});
      a.headY = () => (a.y || 0) + 1.62 * (m.app.height || 1) * (/^sit/.test(a.act) ? 0.72 : 1);
      a.it = { id: 'metro:' + a.id, kind: 'action', x, y: 1.2, z, radius: 1.6, label: 'Talk to', name: a.name, cond: () => this.frameStill(a.frame), onUse: () => this.talk(a) };
      this.zone.interactables.push(a.it);
      this.people.push(a);
      return a;
    },
    despawn(a) {
      a.state = 'despawn';
      if (a.seat) { a.seat.occupant = null; a.seat = null; }
      if (a.hold) { a.hold.occupant = null; a.hold = null; }
      a.m.busy = false; a.m.model.root.visible = false;
      const i = this.zone.interactables.indexOf(a.it);
      if (i >= 0) this.zone.interactables.splice(i, 1);
      if (DV.Interaction.current === a.it) DV.Interaction.current = null;
      const j = this.people.indexOf(a);
      if (j >= 0) this.people.splice(j, 1);
    },
    clearPeople() {
      for (const a of this.people.slice()) this.despawn(a);
      if (this.trains) for (const key of ['A', 'B']) { for (const s of this.trains[key].seats) s.occupant = null; for (const h of this.trains[key].holds) h.occupant = null; }
      if (this.benches) for (const s of this.benches) if (s.occupant !== 'player') s.occupant = null;
    },
    frameX(frame) { return frame === 'st' ? this.offset : this.trains[frame].x; },
    frameStill(frame) { return frame === 'st' ? this.offset === 0 : this.trains[frame].state === 'dwell' || (this.mode === 'ride' && this.ride && this.ride.key === frame); },
    // the waiting crowd on the platform (and a trickle down the stairs)
    spawnPlatform(first) {
      const S = st(this.here), n = Math.round(busy() * 14 * (0.75 + this.r() * 0.5));
      for (let i = 0; i < n; i++) {
        const key = this.r() < 0.5 ? 'A' : 'B';
        const f = pick(this.r, S.mix);
        const spot = this.waitSpot(key);
        const a = this.spawn(f, 'st', spot[0], spot[1], { state: 'wait', want: key, rot: key === 'A' ? Math.PI : 0 });
        if (!a) break;
        a.rot = key === 'A' ? Math.PI : 0;
        this.waitIdle(a);
      }
      this.trickleT = first ? 3 : 1;
    },
    waitSpot(key) {
      const doors = this.kit.doorsX, dx = doors[Math.floor(this.r() * doors.length)];
      const s = this.r() < 0.5 ? -1 : 1;
      const zl = key === 'A' ? K.plat.z0 + 0.75 + this.r() * 0.6 : K.plat.z1 - 0.75 - this.r() * 0.6;
      return [dx + s * (1.0 + this.r() * 0.9), zl];
    },
    waitIdle(a) {
      const f = a.f, r = this.r();
      a.act = f === 'erudite' && r < 0.6 ? 'read' : f === 'dauntless' && r < 0.4 ? 'arms_crossed' : r < 0.15 ? 'read' : 'idle';
      // a seat on a bench, if there's one free nearby and they're old or tired
      if ((a.m.age > 55 || r > 0.8) && a.frame === 'st') {
        const side = Math.sign(a.z - 9) || 1; // (a seat on this side of the bench: not through it)
        const b = this.benches.filter((s) => !s.occupant && Math.sign(s.az - 9) === side).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
        if (b && Math.abs(b.x - a.x) < 14) { b.occupant = a.id; a.bench = b; a.path = [[b.ax, b.az]]; a.state = 'toBench'; }
      }
    },
    spawnRiders(tr) {
      const n = Math.round(busy() * (8 + this.r() * 10));
      const mix = st(this.here).mix;
      for (let i = 0; i < n; i++) {
        const f = this.r() < 0.6 ? pick(this.r, mix) : pick(this.r, STATIONS[Math.floor(this.r() * N)].mix);
        const a = this.spawn(f, tr.key, 0, tr.z, { train: tr.key, stops: 1 + Math.floor(this.r() * 4) });
        if (!a) break;
        this.settle(a, tr, true);
      }
    },
    // aboard: a seat (with a gap next to it if there's a choice), or something to hold
    settle(a, tr, place) {
      const free = tr.seats.filter((s) => !s.occupant);
      let seat = null;
      const standy = a.f === 'dauntless' && this.r() < 0.75;
      if (free.length && !standy) {
        const occ = new Set(tr.seats.filter((s) => s.occupant).map((s) => Math.round(s.x * 10) + ':' + Math.sign(s.z - tr.z)));
        const lonely = (s) => [-K.SEAT_W, K.SEAT_W].filter((d) => occ.has(Math.round((s.x + d) * 10) + ':' + Math.sign(s.z - tr.z))).length;
        const score = (s) => Math.abs(s.x - a.x) * 0.15 + lonely(s) * 2.5 + this.r() * 1.5;
        seat = free.sort((p, q) => score(p) - score(q))[0];
        if (lonely(seat) === 0) this.stats.gap++; else this.stats.squeezed++;
      }
      // nowhere to sit, and you're old: an Abnegation passenger gets up for you
      if (!seat && a.m.age > 60) {
        const giver = this.people.find((p) => p.frame === tr.key && p.seat && p.f === 'abnegation' && p.m.age < 50 && p.state === 'seated');
        if (giver) {
          seat = giver.seat; giver.seat = null; this.stats.gaveSeat++;
          this.say(giver, 'Please — take my seat.', 3);
          this.stand(giver, tr, false);
        }
      }
      if (seat) {
        seat.occupant = a.id; a.seat = seat;
        if (place) { a.x = seat.x; a.z = seat.z; a.rot = seat.rot; a.state = 'seated'; a.act = this.seatAct(a); a.path = []; }
        else { a.path = a.path.concat([[seat.ax, seat.az]]); a.state = 'toSeat'; }
      } else this.stand(a, tr, place);
    },
    stand(a, tr, place) {
      const free = tr.holds.filter((h) => !h.occupant);
      const h = free.length ? free.sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x) + (this.r() - 0.5) * 3)[0] : null;
      if (h) {
        h.occupant = a.id; a.hold = h;
        if (place) { a.x = h.x; a.z = h.z; a.rot = h.rot; a.state = 'standing'; a.act = 'hang'; a.path = []; }
        else { a.path = a.path.concat([[h.x, h.z]]); a.state = 'toHold'; }
      } else { a.state = 'standing'; a.act = 'idle'; }
    },
    seatAct(a) {
      const r = this.r(), m = DV.Clock.minutes();
      if ((m < 450 || m > 1170) && r < 0.3) { a.asleep = true; return 'sit_slump'; }
      return a.f === 'erudite' && r < 0.5 ? 'sit_fold' : r < 0.2 ? 'sit_touch' : 'sit';
    },
    nearestDoor(tr, x) { return tr.kit.doors.reduce((b, d) => (Math.abs(d - x) < Math.abs(b - x) ? d : b), tr.kit.doors[0]); },
    // the doors are open: whoever's getting off gets off
    alight(tr) {
      for (const a of this.people) {
        if (a.frame !== tr.key || !a.wantOff || a.state === 'despawn') continue;
        const dx = this.nearestDoor(tr, a.x) + (this.r() - 0.5) * 0.4;
        const zIn = tr.z + tr.side * 0.35, zOut = K.psd[tr.key] + tr.side * 1.3;
        if (a.seat) { a.seat.occupant = null; a.seat = null; }
        if (a.hold) { a.hold.occupant = null; a.hold = null; }
        const delay = a.asleep ? 2.2 + this.r() * 1.5 : this.r() * 1.2;
        if (a.asleep) { a.asleep = false; setTimeout(() => this.say(a, U.pick(['— is this — oh. Oh! Excuse me!', 'Wha— my stop!', 'Hold the door!']), 2.6), 400); }
        a.wait = delay;
        a.path = [[a.x + (a.state === 'seated' ? 0 : 0), tr.z + tr.side * 0.3 * (a.state === 'seated' ? Math.sign(a.z - tr.z) || 1 : 0)], [dx, zIn], [dx, zOut]];
        if (a.state === 'seated') a.path[0] = [a.x, tr.z + Math.sign(a.z - tr.z) * 0.3];
        a.state = 'alight'; a.act = 'idle';
      }
    },
    // and then whoever's waiting gets on
    board(tr) {
      const zl = K.psd[tr.key];
      for (const a of this.people) {
        if (a.frame !== 'st' || a.want !== tr.key || (a.state !== 'wait' && a.state !== 'bench') || a.state === 'despawn') continue;
        if (a.bench) { a.bench.occupant = null; a.bench = null; }
        const dx = this.nearestDoor(tr, a.x);
        a.train = tr.key;
        a.state = 'board';
        a.wait = this.r() * 1.2;
        a.path = [[dx + (a.x < dx ? -0.25 : 0.25), zl + tr.side * 0.7], [dx, zl - tr.side * 0.4], [dx, tr.z + tr.side * 0.4]];
        a.act = 'idle';
      }
    },
    // the trickle: people coming down the stairs to wait, and people leaving
    trickle(dt) {
      if (this.offset !== 0 || !service()) return;
      this.trickleT -= dt;
      if (this.trickleT > 0) return;
      const b = busy();
      this.trickleT = b > 0 ? U.lerp(9, 3.5, b) * (0.6 + this.r() * 0.8) : 999;
      if (this.people.length > 40) return;
      const key = this.r() < 0.5 ? 'A' : 'B';
      const a = this.spawn(pick(this.r, st(this.here).mix), 'st', K.stairs.out + 0.9, 9 + (this.r() - 0.5) * 1.8, { state: 'enter', want: key, y: K.stairs.rise });
      if (!a) return;
      const lane = this.lane(key), spot = this.waitSpot(key);
      a.path = [[K.hall.x0 + 0.8, 9], [K.gateX - 1.6, lane], [K.gateX + 1.4, lane], spot];
      a.stairs = true;
    },
    lane(key) { const L = K.lanes; return key === 'A' ? L[Math.floor(this.r() * 3)] : L[3 + Math.floor(this.r() * 3)]; },
    leave(a) {
      const lane = this.lane(a.z < 9 ? 'A' : 'B');
      const sz = 9 + (this.r() - 0.5) * 1.8;
      a.path = [[K.gateX + 1.4, lane], [K.gateX - 1.6, lane], [K.hall.x0 + 0.8, sz], [K.stairs.top, sz], [K.stairs.out + 0.5, 9]];
      a.state = 'leave'; a.stairs = true; a.act = 'idle';
    },

    updatePeople(dt) {
      const P = DV.Player, cols = this.zone.colliders;
      this.barkT = (this.barkT || 0) - dt; // (one person at a time says something, now and then)
      const ppl = this.people;
      for (let i = ppl.length - 1; i >= 0; i--) {
        const a = ppl[i];
        if (a.state === 'despawn') continue;
        const still = this.frameStill(a.frame);
        let spd = 0;
        if (a.wait > 0) a.wait -= dt;
        else if (a.path.length && still) {
          const [tx, tz] = a.path[0];
          const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
          spd = a.hurry ? 2.6 : a.pace;
          // the player in the way: stop, say something, step round
          const fx = dx / (d || 1), fz = dz / (d || 1);
          const ax = P.x - a.x, az = P.z - a.z, ahead = ax * fx + az * fz, beside = ax * fz - az * fx;
          if (ahead > 0 && ahead < 1.0 && Math.abs(beside) < 0.55 && a.frame === this.playerFrame()) {
            spd = 0; a.blocked = (a.blocked || 0) + dt;
            if (a.blocked > 1.2 && (a.barkCool -= dt) < 0) { this.say(a, U.pick(PASSING), 2); a.barkCool = 6; }
            if (a.blocked > 0.6) { a.x += -fz * Math.sign(beside || 1) * 0.6 * dt; a.z += fx * Math.sign(beside || 1) * 0.6 * dt; }
          } else a.blocked = 0;
          // (a waypoint on the way needn't be hit exactly; one you can't get any nearer to, in a crowd or
          // against something, is given up after a couple of seconds)
          if (d < (a.path.length > 1 ? 0.45 : 0.18) || (a.prog = d < (a.bestD || 1e9) - 0.05 ? 0 : (a.prog || 0) + dt) > 2) {
            a.path.shift(); a.bestD = 1e9; a.prog = 0;
            if (!a.path.length) this.arrived(a);
          } else if (spd > 0) {
            if (d < (a.bestD || 1e9) - 0.05) a.bestD = d;
            const step = Math.min(d, spd * dt);
            a.x += fx * step; a.z += fz * step;
            a.rot = U.dampAngle(a.rot, Math.atan2(fx, fz), 9, dt);
            if (!a.stairs) { const [nx, nz] = cols.resolveCircle(a.x, a.z, 0.24, 'npc', 0); a.x = nx; a.z = nz; }
          }
        }
        // the stairs: up as they go west of the hall, gone out into the daylight at the top
        if (a.stairs) {
          a.y = K.stairY(a.x);
          if (a.state === 'leave' && a.x < K.stairs.out + 0.8) { this.despawn(a); continue; }
          if (a.state === 'enter' && a.x > K.hall.x0 + 0.5) a.stairs = false;
        }
        // keep apart (people in the same frame, standing about)
        if (still && (a.state === 'wait' || a.state === 'board' || a.state === 'leave' || a.state === 'enter' || a.state === 'alight')) {
          for (const b of ppl) {
            if (b === a || b.frame !== a.frame || b.state === 'despawn') continue;
            const dx = a.x - b.x, dz = a.z - b.z, d2 = dx * dx + dz * dz;
            if (d2 > 0.36 || d2 < 1e-6) continue;
            const d = Math.sqrt(d2), push = (0.6 - d) * 0.5;
            if (b.state === 'seated' || b.state === 'standing' || b.state === 'bench') { a.x += (dx / d) * push * 2; a.z += (dz / d) * push * 2; }
            else { a.x += (dx / d) * push; a.z += (dz / d) * push; }
          }
        }
        // talk now and then (the ones near you)
        a.barkCool -= dt;
        if (a.barkCool < 0 && this.barkT <= 0 && Math.hypot(a.x + this.frameX(a.frame) - P.x, a.z - P.z) < 4 && this.r() < 0.01) { this.say(a, U.pick(LINES[a.f] || LINES.abnegation), 3.5); a.barkCool = 40 + this.r() * 40; this.barkT = 9 + this.r() * 8; }
        // where they are, drawn
        const X = a.x + this.frameX(a.frame);
        const root = a.m.model.root;
        root.position.set(X, a.y + (a.state === 'seated' || a.state === 'bench' ? 0 : 0.012), a.z);
        root.rotation.y = a.rot;
        a.it.x = X; a.it.z = a.z;
        a.lodT += dt;
        const far = Math.abs(X - P.x) > 30;
        if ((a.state === 'seated' || far) && a.lodT < 0.12) continue;
        const adt = a.lodT; a.lodT = 0;
        const seated = a.state === 'seated' || a.state === 'bench';
        a.m.model.animate(adt, { speed: spd, action: seated ? a.act : spd > 0.05 ? 'idle' : a.act, seatY: seated ? (a.seat || a.bench || {}).seatY || 0.45 : 0, talking: !!(a.bark && a.bark.until > performance.now()) });
        const L = this.zone.lightAt(Math.max(-60, Math.min(48, X)), a.z);
        a.m.model.setTint(U.clamp(L[0], 0.3, 1.25), U.clamp(L[1], 0.3, 1.25), U.clamp(L[2], 0.3, 1.25));
      }
    },
    playerFrame() {
      if (this.mode === 'ride') return this.ride.key;
      const P = DV.Player;
      for (const key of ['A', 'B']) if (Math.abs(P.z - this.trains[key].z) < K.outW) return key;
      return 'st';
    },
    arrived(a) {
      const tr = a.train ? this.trains[a.train] : null;
      switch (a.state) {
        case 'enter': a.state = 'wait'; a.rot = a.want === 'A' ? Math.PI : 0; this.waitIdle(a); break;
        case 'toBench': if (a.bench) { a.x = a.bench.x; a.z = a.bench.z; a.rot = a.bench.rot; a.state = 'bench'; a.act = 'sit'; } else a.state = 'wait'; break;
        case 'board':
          // through the door: you're on the train now
          if (tr && tr.state !== 'none') { this.stats.boarded++; a.frame = tr.key; a.stops = 1 + Math.floor(this.r() * 4); a.wantOff = false; a.hurry = false; this.settle(a, tr, false); if (!a.path.length) this.arrived(a); }
          else a.state = 'wait';
          break;
        case 'toSeat': if (a.seat) { a.x = a.seat.x; a.z = a.seat.z; a.rot = a.seat.rot; a.state = 'seated'; a.act = this.seatAct(a); } break;
        case 'toHold': if (a.hold) { a.x = a.hold.x; a.z = a.hold.z; a.rot = a.hold.rot; a.state = 'standing'; a.act = 'hang'; } break;
        case 'alight': this.stats.alighted++; a.frame = 'st'; a.train = null; this.leave(a); break;
        case 'leave': this.despawn(a); break;
        default: break;
      }
    },
    say(a, text, secs) { a.bark = { text, until: performance.now() + (secs || 3) * 1000 }; },
    talk(a) {
      const lines = LINES[a.f] || LINES.abnegation;
      a.lineK = ((a.lineK === undefined ? Math.floor(this.r() * lines.length) : a.lineK) + 1) % lines.length;
      this.say(a, lines[a.lineK], 4.2);
      DV.Stats.practice('empathy', 0.05);
    },
    // for the player's collision and the speech bubbles (zone.extras)
    bodies(px, pz, r) {
      const out = [];
      const pf = this.playerFrame();
      for (const a of this.people) {
        if (a.state === 'despawn' || a.state === 'seated' || a.state === 'bench' || a.stairs) continue;
        if (a.frame !== pf && !(a.frame === 'st' && this.offset === 0) && !(a.frame !== 'st' && this.frameStill(a.frame))) continue;
        const X = a.x + this.frameX(a.frame);
        if (Math.abs(X - px) < r && Math.abs(a.z - pz) < r) out.push({ x: X, z: a.z, r: 0.26 });
      }
      return out;
    },
    barkSources() {
      const now = performance.now();
      return this.people.filter((a) => a.bark && a.bark.until > now).map((a) => ({ id: a.id, name: a.name, bark: a.bark, x: a.x + this.frameX(a.frame), z: a.z, headY: a.headY }));
    },

    /* ================================================================ every frame */
    update(dt) {
      if (!this.zone || DV.World.current !== this.zone) return;
      const G = DV.Game;
      if (G.state !== 'playing' && G.state !== 'cutscene') return;
      // the clock jumped (you waited on a bench): the timetable starts over from now
      const now = DV.Clock.total();
      if (this._now !== undefined && now - this._now > 3 && this.mode === 'platform') {
        this.clearPeople();
        for (const key of ['A', 'B']) this.resetTrack(this.trains[key], true);
        this.spawnPlatform(true);
      }
      this._now = now;
      if (this.mode === 'platform') {
        for (const key of ['A', 'B']) this.stepTrack(this.trains[key], dt);
        this.trickle(dt);
        if (!service() && !this._closedTold && this.trains.A.state === 'none' && this.trains.B.state === 'none') {
          this._closedTold = true;
          this.pa('The last trains have left. This station is now closed for the curfew. Please make your way to the street.');
        }
        if (service()) this._closedTold = false;
      } else this.stepRide(dt);
      // the gates: open for whoever comes up to them
      const open = K.lanes.map((z) => {
        if (this.offset !== 0) return 0;
        const near = (x, zz) => Math.abs(x - K.gateX) < 1.4 && Math.abs(zz - z) < 0.5;
        return near(DV.Player.x, DV.Player.z) || this.people.some((a) => a.frame === 'st' && near(a.x, a.z)) ? 1 : 0;
      });
      this.flapK = this.flapK || K.lanes.map(() => 0);
      let moved = false;
      this.flapK = this.flapK.map((k, i) => { const v = U.damp(k, open[i], 8, dt); if (Math.abs(v - k) > 0.002) moved = true; if (open[i] && k < 0.05) beep(1568, 0.06, 0.03); return v; });
      if (moved) this.kit.setFlaps(this.flapK);
      this.boxes.flaps.forEach((b, i) => { b.enabled = this.stationOn && this.flapK[i] < 0.5; });
      this.updatePeople(dt);
      // up the stairs and out into the daylight at the top: the street
      const P = DV.Player;
      if (G.state === 'playing' && this.canExit() && P.x < K.stairs.out + 0.75 && P.z > K.stairs.z0 && P.z < K.stairs.z1) this.exit();
      this.drawBoard(false);
      // the tunnel is darker than the station: draw in the fog between stations
      const f = DV.World.scene && DV.World.scene.fog;
      if (f) { const far = Math.abs(this.offset) > 70 ? 70 : 150; f.far = U.damp(f.far, far, 2, dt); f.near = Math.min(f.near, f.far - 10); }
    },
    sleep() {
      for (const key of ['A', 'B']) if (this.trains) this.stopSound(this.trains[key]);
    },

    /* ================================================================ up in the city */
    // the entrances on the building fronts, their signs, and people coming and going
    attachCity(zone, city) {
      const out = { entrances: [], peds: [], pool: [], t: 0, r: U.rng(77) };
      this.snap(city);
      zone.group.add(MK.buildEntrances(STATIONS.map((S) => ({ x: S.x, z: S.z, rot: FROT[S.face], name: S.name })), COLOUR));
      STATIONS.forEach((S, i) => {
        const f = FACE[S.face];
        // the two posts
        for (const s of [-1, 1]) {
          const px = S.x + (-f[1]) * s * 1.75, pz = S.z + f[0] * s * 1.75; // (along the facade)
          const cx = px + f[0] * 0.18, cz = pz + f[1] * 0.18;
          zone.colliders.add(cx - 0.3, cz - 0.3, cx + 0.3, cz + 0.3, { y1: 3.2, tag: 'metro' });
        }
        const it = {
          id: 'metro_in_' + S.id, kind: 'action', x: S.x + f[0] * 1.0, y: 1.2, z: S.z + f[1] * 1.0, radius: 2.3,
          get label() { return service() ? 'Go down' : 'Closed (curfew)'; },
          name: 'Circle Line — ' + S.name,
          cond: () => !DV.Game.ctrl(),
          onUse: () => Metro.enter(i),
        };
        zone.interactables.push(it);
        out.entrances.push({ S, f, it, door: [S.x + f[0] * 0.3, S.z + f[1] * 0.3], line: [S.x + f[0] * 1.6, S.z + f[1] * 1.6], along: [-f[1], f[0]] });
      });
      // commuters at the entrances near you
      out.update = (dt) => {
        const P = DV.Player;
        out.t -= dt;
        const b = busy();
        if (out.t <= 0) {
          out.t = b > 0 ? U.lerp(12, 3.5, b) * (0.6 + out.r() * 0.8) : 999;
          const e = out.entrances.filter((q) => Math.hypot(q.door[0] - P.x, q.door[1] - P.z) < 70).sort((p, q) => Math.hypot(p.door[0] - P.x, p.door[1] - P.z) - Math.hypot(q.door[0] - P.x, q.door[1] - P.z))[0];
          // (not where the city's own people are already going in and out: js/game/lives.js)
          if (e && out.peds.length < 8 && !(zone.lives && zone.lives.usedEntrance(e.S.id, 20))) this.cityPed(zone, out, e);
        }
        for (let i = out.peds.length - 1; i >= 0; i--) {
          const p = out.peds[i];
          const [tx, tz] = p.path[0];
          const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
          let spd = p.pace;
          const ax = P.x - p.x, az = P.z - p.z, fx = dx / (d || 1), fz = dz / (d || 1), ahead = ax * fx + az * fz, beside = ax * fz - az * fx;
          // you in the way: stop, and step round you (and if you will stand there, walk on round you regardless)
          if (ahead > 0 && ahead < 1.3 && Math.abs(beside) < 0.75) {
            p.stuck = (p.stuck || 0) + dt;
            spd = ahead < 0.9 ? 0 : spd * 0.4;
            const sg = beside >= 0 ? 1 : -1, k = 1.3 * dt;
            p.x += -fz * sg * k; p.z += fx * sg * k;
            if (p.stuck > 1.5) p.ghost = true;
          } else { p.stuck = 0; if (Math.hypot(ax, az) > 1.2) p.ghost = false; }
          if (d < 0.2) {
            p.path.shift();
            if (!p.path.length) { p.m.busy = false; p.m.model.root.visible = false; out.peds.splice(i, 1); continue; }
          } else { const st2 = Math.min(d, spd * dt); p.x += fx * st2; p.z += fz * st2; p.rot = U.dampAngle(p.rot, Math.atan2(fx, fz), 8, dt); }
          // in the doorway: going down (or coming up) the first steps
          const dd = (p.x - p.e.door[0]) * p.e.f[0] + (p.z - p.e.door[1]) * p.e.f[1];
          p.y = dd < 0.2 ? Math.max(-0.9, (dd - 0.2) * 1.3) : 0;
          const root = p.m.model.root;
          root.position.set(p.x, p.y + 0.012, p.z); root.rotation.y = p.rot;
          p.m.model.animate(dt, { speed: spd, action: 'idle' });
          const L = zone.lightAt(p.x, p.z);
          p.m.model.setTint(U.clamp(L[0] * 0.9, 0.25, 1.3), U.clamp(L[1] * 0.9, 0.25, 1.3), U.clamp(L[2] * 0.9, 0.25, 1.3));
        }
      };
      out.bodies = (px, pz, r) => out.peds.filter((p) => !p.ghost && p.y > -0.3 && Math.abs(p.x - px) < r && Math.abs(p.z - pz) < r).map((p) => ({ x: p.x, z: p.z, r: 0.26 }));
      out.sleep = () => { for (const p of out.peds) { p.m.busy = false; p.m.model.root.visible = false; } out.peds.length = 0; };
      zone.metro = out;
      return out;
    },
    // set each entrance flush on a real building front near where the map puts it: the nearest
    // building (not a lamp or a kiosk) whose face is on that building line and wide enough for the portal
    snap(city) {
      const sol = (city && city.walk && city.walk.solids) || [];
      const homes = Object.values((DV.CityMap && DV.CityMap.homes) || {});
      for (const S of STATIONS) {
        if (S.snapped) continue;
        const f = FACE[S.face], ax = f[0] !== 0; // (an east- or west-facing front runs along z)
        let best = null, bd = 1e9;
        for (const q of sol) {
          if (q[4] < 3 || Math.abs(q[0] - S.x) > 45 || Math.abs(q[1] - S.z) > 45) continue;
          const face = S.face === 'w' ? q[0] : S.face === 'e' ? q[2] : S.face === 'n' ? q[1] : q[3];
          if (Math.abs(face - (ax ? S.x : S.z)) > 3) continue;
          const a0 = ax ? q[1] : q[0], a1 = ax ? q[3] : q[2];
          if (a1 - a0 < 5.4) continue;
          const want = ax ? S.z : S.x, t = U.clamp(want, a0 + 2.7, a1 - 2.7), d = Math.abs(t - want) + Math.abs(face - (ax ? S.x : S.z)) * 0.5;
          // (not on top of anyone's front door: the walk home ends at one)
          const at = ax ? [face, t] : [t, face];
          if (homes.some((h) => Math.hypot(h.x - at[0], h.z - at[1]) < 14)) continue;
          if (d < bd) { bd = d; best = at; }
        }
        if (best) { S.x = best[0]; S.z = best[1]; }
        S.snapped = true;
      }
    },
    // the pavement in front of each entrance (nothing is put down there)
    clearRects() {
      return STATIONS.map((S) => {
        const f = FACE[S.face], al = [-f[1], f[0]];
        const pts = [[-2.6, -0.2], [2.6, -0.2], [-2.6, 2.8], [2.6, 2.8]].map(([a, o]) => [S.x + al[0] * a + f[0] * o, S.z + al[1] * a + f[1] * o]);
        return [Math.min(...pts.map((q) => q[0])), Math.min(...pts.map((q) => q[1])), Math.max(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[1]))];
      });
    },
    cityPed(zone, out, e) {
      const S = e.S, f = pick(out.r, S.mix);
      let m = out.pool.find((q) => !q.busy && q.f === f);
      if (!m && out.pool.length < 10) {
        const n = out.pool.length + 1, sex = out.r() < 0.5 ? 'f' : 'm';
        const model = DV.Character.create(DV.Character.fromFaction(f, sex, 'metrostreet:' + f + ':' + n, { age: 20 + Math.floor(out.r() * 45) }));
        zone.group.add(model.root);
        m = { model, f, busy: false };
        out.pool.push(m);
      }
      if (!m) return;
      // along the pavement one way or the other, but not past the end of the block (into the crossing)
      const CM = DV.CityMap, alongZ = e.along[1] !== 0, pos0 = alongZ ? S.z : S.x;
      const room = (sign) => {
        const dir = (alongZ ? e.along[1] : e.along[0]) * sign;
        let lim = 34;
        for (const q of alongZ ? CM.streets : CM.avenues) { const d = ((alongZ ? q.z : q.x) - pos0) * dir; if (d > 0) lim = Math.min(lim, d - q.w / 2 - 2.6); }
        return lim;
      };
      let sign = out.r() < 0.5 ? -1 : 1;
      if (room(sign) < 8) sign = -sign;
      const lim = room(sign);
      if (lim < 6) return;
      const away = sign * Math.min(lim, 14 + out.r() * 18);
      const far = [e.line[0] + e.along[0] * away, e.line[1] + e.along[1] * away];
      const P = DV.Player;
      const coming = out.r() < 0.5;
      // (someone appearing out of nowhere where you can see them won't do: those walk in from out of sight)
      if (coming && Math.hypot(far[0] - P.x, far[1] - P.z) < 26) return;
      m.busy = true; m.model.root.visible = true;
      const inside = [e.door[0] - e.f[0] * 1.2, e.door[1] - e.f[1] * 1.2];
      const p = coming
        ? { m, e, x: far[0], z: far[1], path: [e.line, e.door, inside], pace: 1.3 + out.r() * 0.3, rot: 0, y: 0 }
        : { m, e, x: inside[0], z: inside[1], path: [e.door, e.line, far], pace: 1.25 + out.r() * 0.3, rot: 0, y: -0.9 };
      out.peds.push(p);
    },
  };

  /* ---------------- the zone ---------------- */
  const room = (id, name, x0, z0, x1, z1, h, amb) => ({ id, name, x0, z0, x1, z1, h, noWalls: true, noFloor: true, noCeiling: true, floor: 'terrazzo', light: { ambient: amb, fixture: 'none', spacing: 0, list: [] } });
  DV.Zones.define('metro', {
    name: 'Circle Line',
    region: 'Circle Line',
    noDiscover: true,
    bounds: { x0: -80, z0: -2, x1: 60, z1: 20 },
    buildingHeight: K.ceil,
    fog: { color: 0x0d0f11, near: 30, far: 150 },
    sky: { top: 0x050607, horizon: 0x0b0c0d, ground: 0x050505, skyline: false },
    ambience: 'platform', reverb: 'platform',
    rooms: [
      room('m_hall', 'Ticket Hall', K.hall.x0, K.plat.z0, K.hall.x1, K.plat.z1, 4.4, [0.7, 0.68, 0.64]),
      Object.assign(room('m_stairs', 'Stairs', K.stairs.out, K.stairs.z0, K.hall.x0, K.stairs.z1, K.stairs.rise + 2.6, [0.74, 0.72, 0.68]), { floorAt: (x) => K.stairY(x), ceilAt: (x) => K.stairCeil(x) }),
      room('m_plat', 'Platform', K.plat.x0, K.plat.z0, K.plat.x1, K.plat.z1, 4.4, [0.66, 0.68, 0.7]),
      room('m_carA', 'Circle Line train', -26.5, 1.5, 26.5, 4.5, K.ceilY, [0.84, 0.85, 0.87]),
      room('m_carB', 'Circle Line train', -26.5, 13.5, 26.5, 16.5, K.ceilY, [0.84, 0.85, 0.87]),
    ],
    doors: [],
    props: [],
    spawn: { x: K.stairs.top + 0.1, z: 9, rot: Math.PI / 2 },
    build(ctx) { Metro.build(ctx); },
    onExit() { Metro.sleep(); },
  });

  DV.Metro = Metro;
})();
