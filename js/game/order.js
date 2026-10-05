/* ==========================================================================
   DIVERGENT — public order
   Erudite's police. The Office of Public Order keeps the Order Station on
   Armitage Avenue (the building is js/engine/city.js's); Erudite runs it and
   the Dauntless walk it. Guards in black with the Office's blue armband walk
   the pavements in twos, an Erudite supervisor with a tablet behind some of
   them; Erudite's drones go over the streets on their rounds, and now and
   then stop over somebody and look at them (a blue light, a second or two).

   Talk to a patrol and they'll talk back (about the drones, about who gives
   the orders). Walk past one and they may stop you: name and faction. Tell
   them, and you're on your way. Stall, lie badly, walk off, or be out after
   curfew, and the Office takes notice (the HUD shows it when it's up); push
   it far enough and you spend a couple of hours in a white room at the
   station answering the same questions.

     DV.Order.attach(zone, city, life)   the city (js/zones/testingCenter.js)
     DV.Order.active()                    the one where you are (barks, bodies)
     order.update(dt)                     every frame, with the street life
     order.info()                         QA: squads, drones, posts, notice
     DV.Order.notice()                    0..100: how much the Office has noticed you
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const SQUAD_FAR = 110, DRONE_FAR = 150, POST_NEAR = 130;
  const CURFEW = [1320, 360]; // 22:00 – 06:00
  const BLUE = '#3a78d8';

  // what they say on their rounds
  const BEAT = ['Keep it moving.', 'Papers ready, citizens.', 'Curfew\'s at ten. Don\'t make us remind you.', 'Unit four. Armitage and Clinton. All quiet.', 'Stay on the pavement.', 'Faction before blood.', 'Nothing to see. Go on.'];
  const NIGHT = ['It\'s after ten. Where are you going?', 'Curfew. Home. Now.', 'Unit four. One out after curfew, checking.'];
  const SUP = ['Note the time.', 'That\'s the third today on this street.', 'Keep up, please.', 'The figures don\'t lie. People do.'];
  const DRONE = { scan: 'CITIZEN, REMAIN STILL. SCANNING.', ok: 'IDENTITY CONFIRMED. THANK YOU FOR YOUR COOPERATION.', hold: 'IDENTITY... CONFIRMED.', curfew: 'CURFEW IS IN EFFECT. RETURN TO YOUR SECTOR.' };

  const state = () => {
    const w = DV.State.data.world;
    return w.order || (w.order = { notice: 0, stops: 0, scans: 0, detained: 0, cleared: 0 });
  };
  const curfew = () => { const m = DV.Clock.minutes(); return m >= CURFEW[0] || m < CURFEW[1]; };
  // the drones only come down and look at people after nine at night: there's someone out there in the
  // dark the Office is looking for (a killer; more of that in a later build). By day they fly their rounds
  const SCAN_HOURS = [1260, 360]; // 21:00 – 06:00
  const scanHours = () => { const m = DV.Clock.minutes(); return m >= SCAN_HOURS[0] || m < SCAN_HOURS[1]; };
  const factionWord = () => {
    const p = DV.State.data.player;
    return p.faction ? DV.Factions.name(p.faction) : 'no faction yet (tested today)';
  };

  /* ---------------- the uniforms ---------------- */
  // a Dauntless guard on Order duty: black vest and boots, the Office's blue armband, a badge;
  // or the Erudite supervisor walking behind them: blue coat, glasses, a tablet
  function uniform(sup, sex, seed, age) {
    const app = DV.Character.fromFaction(sup ? 'erudite' : 'dauntless', sex, 'order:' + seed, { age });
    const o = app.outfit;
    if (sup) Object.assign(o, { top: 'blazer', topColor: '#2a4f86', topColor2: '#e8eef5', bottom: 'pants', bottomColor: '#1d2f4e', shoes: 'shoes', shoeColor: '#15161c', acc: ['glasses', 'badge'], tattoos: [], piercings: [] });
    else Object.assign(o, { top: 'vest', topColor: '#1b1d22', topColor2: '#262a31', bottom: 'pants', bottomColor: '#17181b', shoes: 'boots', shoeColor: '#0e0e10', acc: ['armband', 'belt', 'badge'], armbandColor: BLUE, tattoos: [], piercings: [] });
    return app;
  }
  const SURNAMES = ['Hale', 'Brandt', 'Ortiz', 'Kemp', 'Novak', 'Reyes', 'Coyle', 'Marsh', 'Doyle', 'Fisk', 'Lund', 'Pryor', 'Vance', 'Webb'];

  /* ---------------- the drones ---------------- */
  // one body for all of them (instanced), one set of rotor discs, one set of shadows on the ground,
  // and their lights (points); a cone of blue light under one that's looking at somebody
  function droneGeometry() {
    const M = new DV.Vehicles.MB();
    const body = [0.16, 0.17, 0.19], arm = [0.25, 0.26, 0.28];
    M.box(0, 0, 0, 0.5, 0.16, 0.62, body);
    M.box(0, 0.1, -0.04, 0.32, 0.06, 0.36, [0.3, 0.32, 0.36]);
    M.box(0, -0.08, 0.22, 0.14, 0.1, 0.14, [0.08, 0.09, 0.1]); // the camera under its nose
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      M.push(x * 0.3, 0.02, z * 0.33, Math.atan2(x, z), 0, 0);
      M.box(0, 0, 0.12, 0.06, 0.05, 0.3, arm);
      M.pop();
      M.box(x * 0.47, 0.06, z * 0.5, 0.08, 0.1, 0.08, arm); // the motors
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(M.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(M.col, 3));
    g.computeVertexNormals();
    return g;
  }
  const ROTORS = [[-0.47, -0.5], [0.47, -0.5], [0.47, 0.5], [-0.47, 0.5]];

  /* ---------------- the order in one city ---------------- */
  class Order {
    constructor(zone, city, life) {
      this.zone = zone;
      this.city = city;
      this.life = life;
      this.r = U.rng(9181);
      this.squads = [];
      this.posts = [];
      this.drones = [];
      this.idN = 0;
      this.squadT = 0;
      this.droneT = 0;
      this.stopCool = 60; // (not in your first minute out)
      this.decayT = 0;
      this.station = DV.CityMap.landmark('order_station');
      this.lines = { x: DV.CityMap.avenues.map((a) => a.x), z: DV.CityMap.streets.map((s) => s.z) };
      this.buildDrones();
      this.buildStation();
    }

    /* ---- the station: the vans in the yard, the guards at the door ---- */
    buildStation() {
      const S = this.station;
      if (!S) return;
      const f = S.face || 1, front = S.z + f * (S.d / 2), yx = S.x + S.w / 2 - 5;
      this.vans = [];
      for (let k = 0; k < 3; k++) this.vans.push(DV.Vehicles.park(this.zone, 'van', yx, S.z - f * (S.d / 2 - 6) + f * k * 7.2, f > 0 ? 0 : Math.PI, { color: 0x1d2433, seed: 900 + k }));
      const mz = S.z - f * 3.5, pz = mz + f * (24 / 2 + 1.6);
      // (where the guards stand: the porch, the gatehouse, the supervisor by the notice board)
      this.postSpots = [
        { x: S.x - 1 - 4.6, z: pz + f * 3.6, rot: f > 0 ? 0 : Math.PI, sup: false, rifle: true },
        { x: S.x - 1 + 2.6, z: pz + f * 3.6, rot: f > 0 ? 0 : Math.PI, sup: false, rifle: true },
        { x: S.x + S.w / 2 - 9.5 - 1.4, z: front - 0.6 - 1.6, rot: f > 0 ? 0 : Math.PI, sup: false, rifle: true },
        { x: S.x - 1 + 4.4, z: pz + f * 2.6, rot: f > 0 ? 0.6 : Math.PI + 0.6, sup: true },
      ];
    }
    // the guards at the station are there while you're near enough to see them
    updatePosts(dt, px, pz) {
      const S = this.station;
      if (!S) return;
      const near = Math.hypot(px - S.x, pz - S.z) < POST_NEAR;
      // (the vans in the yard: a draw call each, so only when you're near enough to see them)
      const vis = Math.hypot(px - S.x, pz - S.z) < 260;
      for (const v of this.vans) v.root.visible = vis;
      if (near && !this.posts.length) {
        this.postSpots.forEach((sp, i) => {
          const m = this.member(sp.sup, 'post' + i, sp.x, sp.z, sp.rot, sp.sup ? 'Order Supervisor' : 'Station Guard');
          m.post = sp;
          if (sp.rifle) m.model.attach('handR', Object.assign(DV.Arms.rifle(), { name: 'rifle' })).position.set(0, -0.05, 0.12);
          this.posts.push(m);
        });
      } else if (!near && this.posts.length) {
        for (const m of this.posts) this.release(m);
        this.posts = [];
      }
      for (const m of this.posts) {
        const talking = this.talking === m;
        if (talking) m.rot = U.dampAngle(m.rot, Math.atan2(DV.Player.x - m.x, DV.Player.z - m.z), 6, dt);
        else m.rot = U.dampAngle(m.rot, m.post.rot, 3, dt);
        this.pose(m, dt, 0, m.post.sup ? 'read' : 'guard');
      }
    }

    /* ---- people ---- */
    member(sup, seed, x, z, rot, title) {
      const sex = this.r() < 0.35 ? 'f' : 'm', age = 21 + Math.floor(this.r() * 26);
      const app = uniform(sup, sex, seed + ':' + this.idN, age);
      const model = DV.Character.create(app);
      this.zone.group.add(model.root);
      const name = (sup ? 'Supervisor ' : 'Officer ') + SURNAMES[Math.floor(this.r() * SURNAMES.length)];
      const m = { id: 'po' + this.idN++, model, app, sup, name, title, x, z, rot, bark: null, lodT: 0 };
      m.headY = () => 1.62 * (app.height || 1);
      if (sup) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.15), new THREE.MeshLambertMaterial({ color: 0x1a2230, emissive: 0x2a5aa8, emissiveIntensity: 0.6 })); model.attach('handL', t).position.set(0, -0.06, 0.05); m.tablet = t; }
      m.it = { id: 'order:' + m.id, kind: 'action', x, y: 1.2, z, radius: 2.0, label: 'Talk to', name: title || name, onUse: () => this.talkTo(m) };
      this.zone.interactables.push(m.it);
      model.root.position.set(x, 0.012, z);
      model.root.rotation.y = rot;
      return m;
    }
    release(m) {
      const i = this.zone.interactables.indexOf(m.it);
      if (i >= 0) this.zone.interactables.splice(i, 1);
      if (DV.Interaction.current === m.it) DV.Interaction.current = null;
      if (m.tablet) { m.tablet.geometry.dispose(); m.tablet.material.dispose(); }
      if (m.model.root.parent) m.model.root.parent.remove(m.model.root);
      m.model.dispose();
    }
    say(m, text, secs) { m.bark = { text, until: performance.now() + (secs || 3.5) * 1000 }; }
    pose(m, dt, speed, action) {
      const root = m.model.root;
      root.position.set(m.x, 0.012, m.z);
      root.rotation.y = m.rot;
      m.it.x = m.x; m.it.z = m.z;
      m.lodT += dt;
      const dp = Math.hypot(m.x - DV.Player.x, m.z - DV.Player.z);
      if (dp > 35 && m.lodT < 0.12) return;
      const adt = m.lodT;
      m.lodT = 0;
      m.model.animate(adt, { speed, action: speed > 0.2 ? 'idle' : action || 'idle', talking: !!(m.bark && m.bark.until > performance.now()) });
      const L = this.zone.lightAt(m.x, m.z);
      m.model.setTint(U.clamp(L[0] * 0.9, 0.25, 1.3), U.clamp(L[1] * 0.9, 0.25, 1.3), U.clamp(L[2] * 0.9, 0.25, 1.3));
    }

    /* ---- the patrols ---- */
    spawnSquad(px, pz) {
      const W = this.life.walk, list = W.edgesNear(px, pz, 80);
      const cam = DV.Game && DV.Game.camera;
      let fx = 0, fz = 1;
      if (cam) { const v = cam.getWorldDirection(new THREE.Vector3()); const l = Math.hypot(v.x, v.z) || 1; fx = v.x / l; fz = v.z / l; }
      for (let tries = 0; tries < 16 && list.length; tries++) {
        const ei = list[Math.floor(this.r() * list.length)], e = W.edges[ei];
        if (e.cross || e.len < 6) continue;
        const A = W.nodes[e.a], B = W.nodes[e.b], t = this.r();
        const x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t, d = Math.hypot(x - px, z - pz);
        if (d < 34 || d > 78) continue;
        if (((x - px) * fx + (z - pz) * fz) / d > 0.3 && d < 60) continue; // (out of sight: behind you, or far off)
        const fwd = this.r() < 0.5;
        const sq = { id: 's' + this.idN++, edge: ei, from: fwd ? e.a : e.b, to: fwd ? e.b : e.a, t: (fwd ? t : 1 - t) * e.len, wait: 0, mode: 'walk', trail: [], members: [], barkT: 6 + this.r() * 10 };
        const n = this.r() < 0.4 ? 3 : 2;
        for (let k = 0; k < n; k++) {
          const sup = k === 2;
          sq.members.push(this.member(sup, sq.id + ':' + k, x, z, 0, sup ? 'Order Supervisor' : 'Order Officer'));
        }
        sq.lead = sq.members[0];
        this.placeLead(sq);
        for (const m of sq.members) { m.x = sq.lead.x; m.z = sq.lead.z; m.rot = sq.want; }
        this.squads.push(sq);
        return true;
      }
      return false;
    }
    placeLead(sq) {
      const W = this.life.walk, e = W.edges[sq.edge], A = W.nodes[sq.from], B = W.nodes[sq.to];
      const k = U.clamp(sq.t / e.len, 0, 1), dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len, lat = e.cross ? 0 : 0.35;
      sq.lead.x = A.x + (B.x - A.x) * k - dz * lat;
      sq.lead.z = A.z + (B.z - A.z) * k + dx * lat;
      sq.want = Math.atan2(dx, dz);
    }
    nextEdge(sq) {
      const W = this.life.walk, n = W.nodes[sq.to];
      const opts = n.edges.filter((ei) => ei !== sq.edge);
      if (!opts.length) return sq.edge;
      // (they keep straight on more than people do, and cross more: it's a beat)
      const e0 = W.edges[sq.edge], a0 = W.nodes[sq.from];
      const w = opts.map((ei) => {
        const e = W.edges[ei], o = W.nodes[e.a === sq.to ? e.b : e.a];
        const straight = (n.x - a0.x) * (o.x - n.x) + (n.z - a0.z) * (o.z - n.z) > 0 ? 1.6 : 1;
        return (e.cross ? 0.8 : 1) * straight;
      });
      void e0;
      let q = this.r() * w.reduce((a, b) => a + b, 0);
      for (let k = 0; k < opts.length; k++) { q -= w[k]; if (q <= 0) return opts[k]; }
      return opts[0];
    }
    // where a member behind the leader is: back along the leader's trail, a step to the side
    follow(sq, m, back, side, dt) {
      const T = sq.trail;
      let need = back, i = T.length - 1, x = sq.lead.x, z = sq.lead.z, hx = Math.sin(sq.lead.rot), hz = Math.cos(sq.lead.rot);
      while (i >= 0 && need > 0) {
        const d = Math.hypot(T[i][0] - x, T[i][1] - z);
        if (d >= need) { const k = need / d; hx = (x - T[i][0]) / d; hz = (z - T[i][1]) / d; x += (T[i][0] - x) * k; z += (T[i][1] - z) * k; need = 0; break; }
        if (d > 0.001) { hx = (x - T[i][0]) / d; hz = (z - T[i][1]) / d; }
        need -= d; x = T[i][0]; z = T[i][1]; i--;
      }
      const tx = x + hz * side, tz = z - hx * side;
      const was = [m.x, m.z];
      m.x = U.damp(m.x, tx, 8, dt); m.z = U.damp(m.z, tz, 8, dt);
      const sp = Math.hypot(m.x - was[0], m.z - was[1]) / Math.max(dt, 1e-4);
      if (sp > 0.25) m.rot = U.dampAngle(m.rot, Math.atan2(m.x - was[0], m.z - was[1]), 7, dt);
      return sp;
    }
    updateSquads(dt, px, pz) {
      const W = this.life.walk, P = DV.Player, night = curfew();
      for (let i = this.squads.length - 1; i >= 0; i--) {
        const sq = this.squads[i], L = sq.lead;
        const dp = Math.hypot(L.x - px, L.z - pz);
        if (dp > SQUAD_FAR && sq.mode === 'walk') { for (const m of sq.members) this.release(m); this.squads.splice(i, 1); continue; }
        let spd = 0;
        const ox = L.x, oz = L.z;
        if (sq.mode === 'walk') {
          spd = 1.15;
          if (sq.wait > 0) { sq.wait -= dt; spd = 0; }
          // you in the way: stop (and say so)
          const fx = Math.sin(sq.want), fz = Math.cos(sq.want), ax = P.x - L.x, az = P.z - L.z, ahead = ax * fx + az * fz;
          if (ahead > 0 && ahead < 1.4 && Math.abs(ax * fz - az * fx) < 0.8) { spd = 0; if (!sq.blockT) { sq.blockT = 1; this.say(L, 'Step aside.', 2.2); } } else sq.blockT = 0;
          sq.t += spd * dt;
          let e = W.edges[sq.edge];
          if (sq.t >= e.len) {
            const next = sq.waitFor !== undefined && sq.waitT < 25 ? sq.waitFor : this.nextEdge(sq);
            const ne = W.edges[next];
            if (ne.cross && !this.life.mayCross(ne)) { sq.t = e.len; sq.wait = 0.4; if (sq.waitFor !== next) { sq.waitFor = next; sq.waitT = 0; } sq.waitT += 0.4; }
            else { const at = sq.to; sq.waitFor = undefined; sq.edge = next; sq.from = at; sq.to = ne.a === at ? ne.b : ne.a; sq.t = 0; e = ne; }
          }
          this.placeLead(sq);
          if (spd > 0) L.rot = U.dampAngle(L.rot, sq.want, 7, dt);
          // on the beat: a word now and then
          sq.barkT -= dt;
          if (sq.barkT <= 0 && dp < 24) {
            const sup = sq.members.find((m) => m.sup);
            if (sup && this.r() < 0.3) this.say(sup, SUP[Math.floor(this.r() * SUP.length)], 3);
            else { const l = night ? NIGHT : BEAT; this.say(L, l[Math.floor(this.r() * l.length)], 3); if (this.r() < 0.4) DV.Audio.play('radio', { x: L.x, z: L.z, range: 22 }); }
            sq.barkT = 10 + this.r() * 14;
          }
        } else if (sq.mode === 'approach') {
          // to you, round anything in the way, until close enough to talk
          const dx = P.x - L.x, dz = P.z - L.z, d = Math.hypot(dx, dz);
          if (d > 16) { this.giveUp(sq); continue; }
          if (d > 1.8) {
            spd = 1.7;
            let nx = L.x + (dx / d) * spd * dt, nz = L.z + (dz / d) * spd * dt;
            [nx, nz] = this.zone.colliders.resolveCircle(nx, nz, 0.3, 'npc', 0);
            L.x = nx; L.z = nz;
          }
          L.rot = U.dampAngle(L.rot, Math.atan2(dx, dz), 8, dt);
          sq.approachT += dt;
          if (d <= 1.8 && DV.Game.state === 'playing' && !DV.Dialogue.isActive()) this.beginStop(sq);
          else if (sq.approachT > 14) this.giveUp(sq);
        } else if (sq.mode === 'return') {
          // back to where they left their beat
          const W2 = this.life.walk, e = W2.edges[sq.edge], A = W2.nodes[sq.from], B = W2.nodes[sq.to], k = U.clamp(sq.t / e.len, 0, 1);
          const tx = A.x + (B.x - A.x) * k, tz = A.z + (B.z - A.z) * k, dx = tx - L.x, dz = tz - L.z, d = Math.hypot(dx, dz);
          if (d < 0.3) sq.mode = 'walk';
          else { spd = 1.2; const s = Math.min(d, spd * dt); L.x += (dx / d) * s; L.z += (dz / d) * s; L.rot = U.dampAngle(L.rot, Math.atan2(dx, dz), 7, dt); }
        } else if (sq.mode === 'talk') {
          L.rot = U.dampAngle(L.rot, Math.atan2(P.x - L.x, P.z - L.z), 6, dt);
          if (!DV.Dialogue.isActive()) sq.mode = 'return';
        }
        // the trail the others follow
        const T = sq.trail, last = T[T.length - 1];
        if (!last || Math.hypot(L.x - last[0], L.z - last[1]) > 0.25) { T.push([L.x, L.z]); if (T.length > 40) T.shift(); }
        void ox; void oz;
        this.pose(L, dt, spd, 'guard');
        sq.members.forEach((m, k) => {
          if (k === 0) return;
          const talk = sq.mode === 'talk' || sq.mode === 'approach' && Math.hypot(P.x - L.x, P.z - L.z) < 3;
          const sp = this.follow(sq, m, k === 1 ? 1.1 : 2.4, k === 1 ? -0.7 : 0.3, dt);
          if (talk || this.talking === m) m.rot = U.dampAngle(m.rot, Math.atan2(P.x - m.x, P.z - m.z), 5, dt);
          this.pose(m, dt, sp > 0.25 ? sp : 0, m.sup ? 'read' : 'guard');
        });
      }
    }
    giveUp(sq) {
      sq.mode = 'return';
      this.say(sq.lead, 'Hey! ...Fine. We\'ll remember your face.', 3.4);
      this.addNotice(12, 'You walked away from an Order patrol.');
    }

    /* ---- stops: name and faction, please ---- */
    mayStop() {
      const G = DV.Game;
      if (G.state !== 'playing' || DV.Dialogue.isActive() || (DV.Chapter && DV.Chapter.active)) return false;
      if (this.zone.roomAt(DV.Player.x, DV.Player.z)) return false; // (on the street, not in a building's grounds)
      return this.life.shown !== false;
    }
    considerStops(dt, px, pz) {
      this.stopCool -= dt;
      if (this.stopCool > 0 || !this.mayStop()) return;
      const st = state(), night = curfew();
      const rate = (0.012 + st.notice / 2500) * (night ? 3 : 1);
      for (const sq of this.squads) {
        if (sq.mode !== 'walk') continue;
        const d = Math.hypot(sq.lead.x - px, sq.lead.z - pz);
        if (d > 10 || d < 2) continue;
        if (this.r() < rate * dt * 10) { this.callStop(sq); return; }
      }
    }
    callStop(sq) {
      sq.mode = 'approach';
      sq.approachT = 0;
      this.stopCool = 150 + this.r() * 90;
      this.say(sq.lead, curfew() ? 'You. After curfew. Stop right there.' : 'You — stop there. Identification.', 3);
      DV.Audio.play('radio', { x: sq.lead.x, z: sq.lead.z, range: 24 });
    }
    beginStop(sq) {
      sq.mode = 'talk';
      this.stopSquad = sq;
      const st = state();
      st.stops++;
      DV.Dialogue.startScene('order_stop', { speaker: sq.lead.name, faction: 'dauntless', onEnd: () => { this.stopSquad = null; if (sq.mode === 'talk') sq.mode = 'return'; } });
    }
    // E on an officer: a word (or, if they've already stopped you, the stop)
    talkTo(m) {
      if (DV.Dialogue.isActive()) return;
      const sq = this.squads.find((q) => q.members.indexOf(m) >= 0);
      if (sq && (sq.mode === 'approach' || sq.mode === 'talk')) { this.beginStop(sq); return; }
      this.talking = m;
      if (sq) sq.mode = 'talk';
      DV.Dialogue.startScene(m.sup ? 'order_supervisor' : 'order_officer', { speaker: m.name, faction: m.sup ? 'erudite' : 'dauntless', onEnd: () => { this.talking = null; if (sq && sq.mode === 'talk') sq.mode = 'return'; } });
    }

    /* ---- the drones ---- */
    buildDrones() {
      const N = 6;
      this.droneMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      this.droneMesh = new THREE.InstancedMesh(droneGeometry(), this.droneMat, N);
      this.rotorMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.21, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9aa2ac, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }), N * 4);
      this.shadowMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.55, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }), N);
      for (const m of [this.droneMesh, this.rotorMesh, this.shadowMesh]) { m.count = 0; m.frustumCulled = false; this.zone.group.add(m); }
      this.droneMesh.name = 'drones';
      // their lights: blue on top, red and green at the sides
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3 * 3), 3));
      lg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3 * 3), 3));
      this.lights = new THREE.Points(lg, new THREE.PointsMaterial({ size: 0.45, map: DV.StreetKit.glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true }));
      this.lights.frustumCulled = false;
      this.lights.geometry.setDrawRange(0, 0);
      this.zone.group.add(this.lights);
      // the scan: a cone of blue light, and a ring where it lands
      const cone = new THREE.ConeGeometry(1, 1, 16, 1, true).translate(0, -0.5, 0);
      this.coneMat = new THREE.MeshBasicMaterial({ color: 0x5aa0ff, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true });
      this.cone = new THREE.Mesh(cone, this.coneMat);
      this.ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 24).rotateX(-Math.PI / 2), this.coneMat);
      this.cone.visible = this.ring.visible = false;
      this.zone.group.add(this.cone, this.ring);
      this.M4 = new THREE.Matrix4(); this.Q = new THREE.Quaternion(); this.E = new THREE.Euler(); this.V = new THREE.Vector3(); this.S = new THREE.Vector3(1, 1, 1);
    }
    // a drone: on its rounds along a street (axis 'x': along an east–west street at z = line), at a height
    spawnDrone(px, pz, near) {
      for (let tries = 0; tries < 12; tries++) {
        const ax = this.r() < 0.5 ? 'x' : 'z', lines = ax === 'x' ? this.lines.z : this.lines.x;
        const line = lines[Math.floor(this.r() * lines.length)];
        const across = ax === 'x' ? Math.abs(line - pz) : Math.abs(line - px);
        if (across > 70) continue;
        const along = (ax === 'x' ? px : pz) + (this.r() - 0.5) * 140;
        const x = ax === 'x' ? along : line, z = ax === 'x' ? line : along, d = Math.hypot(x - px, z - pz);
        if (d > 95 || (!near && d < 45)) continue;
        if (!DV.CityMap.inside(x, z, 520) || DV.CityMap.district(x, z).farm || x > DV.CityMap.marshX - 10) continue;
        const dr = { id: 'd' + this.idN++, ax, line, x, z, y: 13 + this.r() * 5, dir: this.r() < 0.5 ? -1 : 1, speed: 5.5 + this.r() * 2, v: 0, bank: 0, yaw: 0, hold: 0, scanT: 6 + this.r() * 10, mode: 'patrol', spin: this.r() * 6, sound: null, bob: this.r() * 6 };
        dr.yaw = ax === 'x' ? (dr.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dr.dir > 0 ? 0 : Math.PI;
        this.drones.push(dr);
        return true;
      }
      return false;
    }
    // the next street at a junction: the drones keep to the streets (between the buildings)
    junctions(dr) {
      const cross = dr.ax === 'x' ? this.lines.x : this.lines.z;
      return cross;
    }
    updateDrones(dt, px, pz) {
      const P = DV.Player, life = this.life, st = state(), night = curfew();
      for (let i = this.drones.length - 1; i >= 0; i--) {
        const dr = this.drones[i];
        const d = Math.hypot(dr.x - px, dr.z - pz);
        if (d > DRONE_FAR) { if (dr.sound) dr.sound.stop(); this.drones.splice(i, 1); continue; }
        dr.bob += dt;
        let tx = dr.x, tz = dr.z, ty = dr.y;
        if (dr.mode === 'patrol') {
          // along the street; at each crossing street, now and then, round the corner (back towards
          // you, if it's wandering off)
          const prev = dr.ax === 'x' ? dr.x : dr.z;
          const step = dr.dir * dr.speed * dt;
          const next = prev + step;
          for (const c of this.junctions(dr)) {
            if ((prev - c) * (next - c) > 0 || prev === c) continue;
            const pAlong = dr.ax === 'x' ? px : pz, pAcross = dr.ax === 'x' ? pz : px;
            const away = (c - pAlong) * dr.dir > 60, wantTurn = this.r() < 0.3 || (away && Math.abs(pAcross - dr.line) > 8);
            if (wantTurn) {
              const newLine = c;
              dr.ax = dr.ax === 'x' ? 'z' : 'x';
              dr.line = newLine;
              const myAlong = dr.ax === 'x' ? dr.x : dr.z, target = dr.ax === 'x' ? px : pz;
              dr.dir = target > myAlong ? 1 : -1;
              if (dr.ax === 'x') dr.z = newLine; else dr.x = newLine;
              dr.hold = 0.6 + this.r() * 0.8;
              break;
            }
          }
          if (dr.hold > 0) dr.hold -= dt;
          else if (dr.ax === 'x') dr.x += dr.dir * dr.speed * dt; else dr.z += dr.dir * dr.speed * dt;
          tx = dr.x; tz = dr.z;
          // time to look at somebody?
          dr.scanT -= dt;
          if (dr.scanT <= 0 && !this.scanning && d < 45) { if (scanHours()) this.chooseScan(dr); else dr.scanT = 6 + this.r() * 10; }
        } else if (dr.mode === 'scan') {
          const t = dr.target, tgx = t === 'player' ? P.x : t.x, tgz = t === 'player' ? P.z : t.z;
          tx = tgx; tz = tgz; ty = 6;
          const dd = Math.hypot(dr.x - tgx, dr.z - tgz);
          const s = Math.min(dd, 7 * dt);
          if (dd > 0.05) { dr.x += ((tgx - dr.x) / dd) * s; dr.z += ((tgz - dr.z) / dd) * s; }
          dr.y = U.damp(dr.y, ty, 2.2, dt);
          if (dd < 1.2 && dr.y < 7) {
            dr.scanK = (dr.scanK || 0) + dt;
            if (!dr.said) { dr.said = true; this.say(dr, DRONE.scan, 2.2); DV.Audio.play('scan', { x: dr.x, z: dr.z, range: 30 }); }
            if (dr.scanK > 2.2) this.finishScan(dr);
          }
          if ((t !== 'player' && (t.released || !life.peds.includes(t))) || (t === 'player' && !this.mayStop()) || Math.hypot(dr.x - px, dr.z - pz) > 50 || (dr.scanAll = (dr.scanAll || 0) + dt) > 12) this.endScan(dr);
        } else if (dr.mode === 'back') {
          // up and back onto its street
          const bx = dr.ax === 'x' ? dr.x : dr.line, bz = dr.ax === 'x' ? dr.line : dr.z, dd = Math.hypot(bx - dr.x, bz - dr.z);
          const s = Math.min(dd, 6 * dt);
          if (dd > 0.05) { dr.x += ((bx - dr.x) / dd) * s; dr.z += ((bz - dr.z) / dd) * s; }
          dr.y = U.damp(dr.y, dr.cruise || 14, 1.5, dt);
          if (dd < 0.1 && Math.abs(dr.y - (dr.cruise || 14)) < 0.5) dr.mode = 'patrol';
          tx = bx; tz = bz;
        }
        // which way it's facing, and the lean into it
        const mx = tx - dr.x, mz = tz - dr.z;
        const moving = dr.mode === 'patrol' ? (dr.hold > 0 ? 0 : 1) : Math.min(1, Math.hypot(mx, mz) / 2);
        const want = dr.mode === 'patrol' ? (dr.ax === 'x' ? (dr.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dr.dir > 0 ? 0 : Math.PI) : Math.atan2(mx, mz);
        dr.yaw = U.dampAngle(dr.yaw, want, 3, dt);
        dr.bank = U.damp(dr.bank, moving * 0.16, 3, dt);
        dr.spin += dt * 40;
        // its buzz, when it's close
        if (!dr.sound && d < 30 && DV.Audio.ready && this.drones.filter((q) => q.sound).length < 2) dr.sound = DV.Audio.mover('drone');
        if (dr.sound && d > 38) { dr.sound.stop(); dr.sound = null; }
        if (dr.sound) dr.sound.update(dr.x, dr.z, moving * dr.speed, dr.y);
      }
      // a few on their rounds near you (more after curfew)
      const want = night ? 5 : 3;
      this.droneT -= dt;
      if (this.drones.length < want && this.droneT <= 0) { this.spawnDrone(px, pz, this.firstDrones); this.droneT = 2 + this.r() * 3; }
      this.firstDrones = false;
      void st;
      this.drawDrones();
    }
    chooseScan(dr) {
      const P = DV.Player;
      dr.scanT = 9 + this.r() * 12;
      const dp = Math.hypot(dr.x - P.x, dr.z - P.z);
      // you, sometimes (more often after curfew, and once the Office has noticed you)
      const st = state(), youK = 0.22 + st.notice / 200 + (curfew() ? 0.3 : 0);
      if (dp < 32 && this.mayStop() && this.r() < youK && (this.scanCool || 0) <= performance.now()) { this.startScan(dr, 'player'); return; }
      const peds = this.life.peds.filter((p) => Math.hypot(p.x - dr.x, p.z - dr.z) < 28);
      if (peds.length) this.startScan(dr, peds[Math.floor(this.r() * peds.length)]);
    }
    startScan(dr, target) {
      dr.mode = 'scan'; dr.target = target; dr.scanK = 0; dr.scanAll = 0; dr.said = false; dr.cruise = dr.y;
      this.scanning = dr;
      if (target !== 'player') target.listen = Math.max(target.listen || 0, 4); // (they stop for it, the way you're meant to)
    }
    finishScan(dr) {
      if (dr.target === 'player') {
        const st = state(), p = DV.State.data.player, div = !!DV.State.data.aptitude.divergent;
        st.scans++;
        this.scanCool = performance.now() + 90000;
        const night = curfew();
        if (div && st.notice > 25) { this.say(dr, DRONE.hold, 3); this.addNotice(8, null); DV.UI.notify('The drone\'s light stays on you a moment too long.', 'info'); }
        else { this.say(dr, night ? DRONE.curfew : DRONE.ok, 3); DV.UI.notify('An Order drone scans you — ' + U.esc(p.name) + ', ' + factionWord() + '.', 'info'); }
        if (night) this.addNotice(6, null);
      } else this.say(dr, DRONE.ok, 2.4);
      this.endScan(dr);
    }
    endScan(dr) {
      dr.mode = 'back';
      dr.target = null;
      if (this.scanning === dr) this.scanning = null;
    }
    drawDrones() {
      const N = Math.min(this.drones.length, this.droneMesh.instanceMatrix.count);
      const M4 = this.M4, Q = this.Q, E = this.E, V = this.V, S = this.S;
      const lp = this.lights.geometry.attributes.position.array, lc = this.lights.geometry.attributes.color.array;
      const blink = (performance.now() % 1000) < 120;
      let ri = 0;
      for (let i = 0; i < N; i++) {
        const dr = this.drones[i], y = dr.y + Math.sin(dr.bob * 2.1) * 0.12;
        E.set(dr.bank * 0.6, dr.yaw, 0, 'YXZ');
        Q.setFromEuler(E);
        M4.compose(V.set(dr.x, y, dr.z), Q, S);
        this.droneMesh.setMatrixAt(i, M4);
        for (const [rx, rz] of ROTORS) {
          const c = Math.cos(dr.yaw), s = Math.sin(dr.yaw);
          M4.compose(V.set(dr.x + rx * c + rz * s, y + 0.13, dr.z - rx * s + rz * c), Q, S);
          this.rotorMesh.setMatrixAt(ri++, M4);
        }
        M4.compose(V.set(dr.x, 0.03, dr.z), Q.identity(), S.set(1 + y * 0.02, 1, 1 + y * 0.02));
        S.set(1, 1, 1);
        this.shadowMesh.setMatrixAt(i, M4);
        // lights: the blue beacon on top, red to port, green to starboard
        const c = Math.cos(dr.yaw), s = Math.sin(dr.yaw);
        const L = [[0, 0.16, 0, 0.3, 0.55, 1.0], [-0.3, 0.02, -0.1, blink ? 1 : 0.35, 0.1, 0.08], [0.3, 0.02, -0.1, 0.1, blink ? 1 : 0.35, 0.2]];
        L.forEach(([lx, ly, lz, r, g, b], k) => {
          const j = (i * 3 + k) * 3;
          lp[j] = dr.x + lx * c + lz * s; lp[j + 1] = y + ly; lp[j + 2] = dr.z - lx * s + lz * c;
          lc[j] = r; lc[j + 1] = g; lc[j + 2] = b;
        });
      }
      for (const m of [this.droneMesh, this.shadowMesh]) { m.count = N; m.instanceMatrix.needsUpdate = true; m.visible = N > 0; }
      this.rotorMesh.count = ri; this.rotorMesh.instanceMatrix.needsUpdate = true; this.rotorMesh.visible = ri > 0;
      this.lights.visible = N > 0;
      this.lights.geometry.attributes.position.needsUpdate = true;
      this.lights.geometry.attributes.color.needsUpdate = true;
      this.lights.geometry.setDrawRange(0, N * 3);
      // the one looking at somebody: its cone of light, and the ring at their feet
      const dr = this.scanning;
      const on = dr && dr.mode === 'scan' && dr.scanK > 0;
      this.cone.visible = this.ring.visible = !!on;
      if (on) {
        const t = dr.target, gx = t === 'player' ? DV.Player.x : t.x, gz = t === 'player' ? DV.Player.z : t.z, h = dr.y - 0.1;
        this.cone.position.set(dr.x, h, dr.z);
        this.cone.scale.set(0.95, h, 0.95);
        this.ring.position.set(gx, 0.04, gz);
        this.coneMat.opacity = 0.16 + Math.sin(performance.now() / 90) * 0.04;
      }
    }

    /* ---- what the Office thinks of you ---- */
    addNotice(n, why) {
      const st = state();
      st.notice = U.clamp(st.notice + n, 0, 100);
      if (why && n > 0) DV.UI.notify(why, 'rep_down');
      if (st.notice >= 100 && !this.detaining) this.detain();
    }
    // too much: a couple of hours at the station, the same questions over and over
    async detain() {
      const G = DV.Game, st = state(), S = this.station;
      this.detaining = true;
      if (DV.Dialogue.isActive()) DV.Dialogue.end();
      G.state = 'cutscene';
      DV.Input.clearMovement();
      DV.UI.notify('Order officers take you by the arms.', 'quest_fail');
      await DV.UI.fade(1, 900);
      st.detained++;
      st.notice = 35;
      DV.Clock.skip(120);
      if (S) {
        const f = S.face || 1;
        DV.Player.place(S.x - 1, S.z + f * (S.d / 2 + 2.4), f > 0 ? 0 : Math.PI);
        G.rig.yaw = DV.Player.rot; G.rig.follow(true);
      }
      DV.Reputation.add('erudite', -3); DV.Reputation.add('dauntless', -1);
      DV.State.note('Held at the Order Station on Armitage for two hours. The same questions, over and over: name, faction, where were you going.');
      this.life.first = true; // (the street round you, afresh)
      for (const sq of this.squads) for (const m of sq.members) this.release(m);
      this.squads = [];
      this.stopCool = 240;
      await new Promise((r) => setTimeout(r, 400));
      DV.UI.fade(0, 900);
      if (G.state === 'cutscene') G.state = 'playing';
      DV.UI.notify('Released from the Order Station. Two hours gone.', 'info');
      this.detaining = false;
    }

    /* ---- every frame ---- */
    update(dt) {
      const P = DV.Player, px = P.x, pz = P.z;
      // inside a building (the Testing Center's lobby included), or the dev menu emptied the streets:
      // nobody about, nothing overhead (and nothing drawn)
      const room = this.zone.roomAt(px, pz), away = this.life.shown !== true || (room && !room.exterior);
      this.show(!away);
      if (away) return;
      // the Office forgets, slowly
      this.decayT += dt;
      if (this.decayT > 20) { this.decayT = 0; const st = state(); if (st.notice > 0) st.notice = Math.max(0, st.notice - 1); }
      // a couple of patrols near you (another after curfew, and round the station)
      const S = this.station, nearStation = S && Math.hypot(px - S.x, pz - S.z) < 260;
      const want = (curfew() ? 3 : 2) + (nearStation ? 1 : 0);
      this.squadT -= dt;
      if (this.squads.length < want && this.squadT <= 0) { this.spawnSquad(px, pz); this.squadT = 4 + this.r() * 6; }
      this.updateSquads(dt, px, pz);
      this.updatePosts(dt, px, pz);
      this.updateDrones(dt, px, pz);
      this.considerStops(dt, px, pz);
    }
    show(v) {
      if (this.shown === v) return;
      this.shown = v;
      for (const sq of this.squads) for (const m of sq.members) m.model.root.visible = v;
      for (const m of this.posts) m.model.root.visible = v;
      if (!v) for (const vn of this.vans || []) vn.root.visible = false;
      this.lights.visible = v;
      if (!v) { this.droneMesh.visible = this.rotorMesh.visible = this.shadowMesh.visible = this.cone.visible = this.ring.visible = false; this.sleep(); }
    }
    // QA and the HUD
    info() {
      const st = state();
      return { squads: this.squads.length, officers: this.squads.reduce((n, q) => n + q.members.length, 0), posts: this.posts.length, drones: this.drones.length, scanning: !!this.scanning, notice: st.notice, stops: st.stops, scans: st.scans, detained: st.detained, modes: this.squads.map((q) => q.mode) };
    }
    barkSources() {
      const now = performance.now(), out = [];
      for (const sq of this.squads) for (const m of sq.members) if (m.bark && m.bark.until > now) out.push(m);
      for (const m of this.posts) if (m.bark && m.bark.until > now) out.push(m);
      for (const d of this.drones) if (d.bark && d.bark.until > now) { if (!d.headY) { d.name = 'Order Drone'; d.headY = () => d.y - 1.5; } out.push(d); }
      return out;
    }
    bodies(px, pz, r) {
      const out = [];
      if (this.life.shown === null) return out;
      for (const sq of this.squads) for (const m of sq.members) if (Math.abs(m.x - px) < r && Math.abs(m.z - pz) < r) out.push({ x: m.x, z: m.z, r: 0.3 });
      for (const m of this.posts) if (Math.abs(m.x - px) < r && Math.abs(m.z - pz) < r) out.push({ x: m.x, z: m.z, r: 0.3 });
      return out;
    }
    sleep() { for (const d of this.drones) if (d.sound) { d.sound.stop(); d.sound = null; } }
  }

  /* ---------------- what they say ---------------- */
  const T = (id, tree) => DV.DialogueDB.add(id, tree);
  const notice = (n) => (c) => { if (DV.Order.current) DV.Order.current.addNotice(n, null); else { const st = state(); st.notice = U.clamp(st.notice + n, 0, 100); } void c; };
  const ofWhom = () => (DV.State.data.player.faction ? '{name}. ' + DV.Factions.name(DV.State.data.player.faction) + '.' : '{name}. No faction yet — I tested today.');

  // a stop: name and faction
  T('order_stop', {
    entry: (c) => (curfew() ? 'night' : 'start'),
    nodes: {
      start: {
        text: '[He holds up a gloved hand. Behind him the other one\'s watching your hands.] Name and faction.',
        choices: [
          { text: () => '[Tell him] ' + ofWhom(), to: 'check' },
          { text: 'What\'s this about?', check: { attr: 'resolve', dc: 5 }, to: 'why_ok', fail: 'why_bad' },
          { text: '[Give a false name]', check: { attr: 'charisma', dc: 7 }, to: 'lie_ok', fail: 'lie_bad', skill: 'deception' },
          { text: '[Say nothing]', to: 'silent' },
        ],
      },
      night: {
        text: 'It\'s after ten. Curfew. [His torch finds your face.] Name, faction, and where you\'re going at this hour.',
        choices: [
          { text: () => '[Tell him] ' + ofWhom() + ' I\'m on my way home.', to: 'night_home' },
          { text: 'I lost track of the time.', check: { attr: 'charisma', dc: 6 }, to: 'night_home', fail: 'night_warn' },
          { text: '[Say nothing]', to: 'silent' },
        ],
      },
      why_ok: { text: 'Routine. Everyone gets asked, every day. The quicker you answer, the quicker you\'re walking. Name and faction.', next: 'start2', nextText: 'All right.' },
      why_bad: { text: 'It\'s about you answering the question. [He steps closer.] Name. Faction.', onEnter: notice(4), next: 'start2', nextText: 'All right.' },
      start2: {
        text: 'Go on.',
        choices: [
          { text: () => '[Tell him] ' + ofWhom(), to: 'check' },
          { text: '[Say nothing]', to: 'silent' },
        ],
      },
      check: {
        text: (c) => {
          const div = c.divergent(), st = state();
          if (div && st.notice > 50) return '[The supervisor reads her tablet for a long time.] Your aptitude record is... incomplete. [She looks up.] Go home. Stay there. We\'ll know if you don\'t.';
          return '[He reads it off his wrist unit, then reads your face.] ...Fine. You\'re clear. Move along.';
        },
        onEnter: (c) => { const st = state(); if (c.divergent() && st.notice > 50) notice(10)(c); else { st.cleared++; notice(-6)(c); c.xp(5); } },
        end: true,
      },
      lie_ok: { text: '[He checks it. Something on his screen agrees with you.] ...Fine. Move along.', onEnter: (c) => { c.setFlag('order_lied'); c.xp(15, 'Talked past an Order patrol'); }, end: true },
      lie_bad: { text: '[He doesn\'t even look down.] That\'s not what the system says. [His hand closes on your arm.] You\'re coming with us.', onEnter: notice(100), end: true },
      silent: { text: 'Silent type. [He writes something down and looks at you a moment longer than he has to.] Go on. We\'ll be seeing you.', onEnter: notice(14), end: true },
      night_home: { text: 'Then walk. Straight there. [He\'s already talking into his radio.] One out after curfew, walking home.', onEnter: notice(4), end: true },
      night_warn: { text: 'Everybody loses track of the time. Nobody else is out in it. [He writes your name down.] Home. Now.', onEnter: notice(12), end: true },
    },
  });

  // a word with an officer on the beat
  T('order_officer', {
    entry: (c) => (curfew() ? 'night' : state().notice > 50 ? 'wary' : 'start'),
    nodes: {
      start: {
        text: '[A once-over: badge, clothes, face.] Keep moving, citizen. Unless you need something.',
        choices: [
          { text: 'What are you patrolling for?', to: 'why', once: true },
          { text: 'Who gives you your orders?', to: 'orders', once: true },
          { text: 'Are the drones yours?', to: 'drones', once: true },
          { text: 'You don\'t seem to like the arrangement.', check: { attr: 'perception', dc: 6 }, to: 'doubt', fail: 'doubt_no', if: (c) => c.flag('order_asked_orders') && !c.flag('order_doubter') },
          { text: 'Where do I report something?', to: 'report' },
          { text: 'Nothing. Sorry.', end: true },
        ],
      },
      why: { text: 'Order. Erudite\'s figures say the streets are quieter when we\'re seen on them. So we\'re seen on them.', next: 'start', nextText: 'I see.' },
      orders: { text: 'The Office of Public Order. Erudite runs it; Dauntless walks it. [A nod up at the sky.] They do the thinking. We do the walking.', onEnter: (c) => c.setFlag('order_asked_orders'), next: 'start', nextText: 'Right.' },
      drones: { text: 'Erudite\'s. They see more than we do and they never get tired. [Dry.] Smile for them. They like that.', next: 'start', nextText: 'Noted.' },
      doubt: { text: '[He looks at the drone over the junction before he answers.] ...Faction before blood. That\'s all I\'ll say about it. [Quieter.] Watch what you say under those things.', onEnter: (c) => { c.setFlag('order_doubter'); c.rep('dauntless', 1); }, next: 'start', nextText: 'I will.' },
      doubt_no: { text: 'I like my job fine. Move along.', next: 'start', nextText: 'Sorry.' },
      report: { text: 'The Order Station. Armitage Avenue, up past Clinton Street, at the north end. They\'ll take it down. They take everything down.', next: 'start', nextText: 'Thanks.' },
      wary: { text: 'You again. [He doesn\'t smile.] Your name\'s come up today. Keep walking, and keep it to your own sector.', end: true },
      night: { text: 'It\'s after curfew. Whatever you need, it\'ll keep till six. Home.', onEnter: notice(4), end: true },
    },
  });

  // the Erudite behind them, with the tablet
  T('order_supervisor', {
    entry: 'start',
    nodes: {
      start: {
        text: '[She doesn\'t look up from the tablet.] If you\'ve been stopped, answer the officer. If you haven\'t, I\'m busy.',
        choices: [
          { text: 'What are you writing?', to: 'writing', once: true },
          { text: 'Why is Erudite running the police?', check: { attr: 'intelligence', dc: 6 }, to: 'why_ok', fail: 'why_no' },
          { text: 'What happens if the drones see something?', to: 'drones', once: true },
          { text: 'Sorry to bother you.', end: true },
        ],
      },
      writing: { text: 'Everything. Who\'s out, where, at what time. [Now she looks at you.] Patterns. People are very predictable, once you have enough of them written down.', next: 'start', nextText: 'I see.' },
      why_ok: { text: '[A thin smile.] Because someone has to think about it. Dauntless are brave; bravery isn\'t a method. Abnegation runs the council, and kindness isn\'t a method either. We measure. Then we act.', onEnter: (c) => c.rep('erudite', 1), next: 'start', nextText: 'And the drones measure.' },
      why_no: { text: 'Because we\'re good at it. [Back to the tablet.] Was there anything else?', next: 'start', nextText: 'No.' },
      drones: { text: 'Then it\'s written down, and someone like me reads it. [She tilts her head.] Is there something you\'d like me to read about you?', onEnter: notice(3), next: 'start', nextText: 'No.' },
    },
  });

  DV.Order = {
    current: null,
    attach(zone, city, life) {
      const o = new Order(zone, city, life);
      zone.order = o;
      this.current = o;
      return o;
    },
    active() {
      const z = DV.World.current;
      return z && z.order ? z.order : null;
    },
    notice() { return state().notice; },
    curfew,
    scanHours,
  };
})();
