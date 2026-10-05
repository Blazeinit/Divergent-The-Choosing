/* ==========================================================================
   DIVERGENT — the city going about its day
   The street life (js/game/streetlife.js) is people walking somewhere; this
   is people stopped somewhere, doing something: little scenes on the
   pavement near you, chosen by the sector you're in and the time of day.

     a fruit stall (Amity), a newsstand (Candor), bread handed out to a
     queue of factionless (Abnegation), a busker with a crowd, children
     playing chase, a pavement being swept, Erudite reading as they wait,
     Candor arguing on a corner, a Dauntless crew lounging, and after dark,
     the factionless round a burning barrel

   Each is built out of sight a little way off and let go once it's far
   behind you, so there are always a few going on wherever you walk. Talk to
   anyone in one (E); the stallholders and the Abnegation volunteer will
   hand you something.

     DV.CityLife.attach(zone, city, life)   the city (js/zones/testingCenter.js)
     DV.CityLife.active()                    the one where you are (barks, bodies)
     cl.update(dt) · cl.info() (QA)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const NEAR = 30, FAR = 68, GONE = 96, MAX = 3, APART = 26;
  const hour = () => DV.Clock.minutes() / 60;
  const between = (a, b) => { const h = hour(); return a < b ? h >= a && h < b : h >= a || h < b; };

  /* ---------------- props: one vertex-coloured mesh each ---------------- */
  const PROPS = {
    // a market stall: a counter, four posts and a striped awning
    stall(M, o) {
      const wood = [0.45, 0.32, 0.2], cloth = o.cloth || [0.75, 0.2, 0.15], cloth2 = [0.92, 0.88, 0.78];
      M.box(0, 0.45, 0, 2.2, 0.9, 0.8, wood);
      M.box(0, 0.92, 0, 2.3, 0.05, 0.9, [0.55, 0.4, 0.26]);
      for (const [x, z] of [[-1.05, -0.35], [1.05, -0.35], [-1.05, 0.35], [1.05, 0.35]]) M.box(x, 1.05, z, 0.07, 2.1, 0.07, wood);
      for (let k = 0; k < 6; k++) M.box(-1.0 + k * 0.4 + 0.2, 2.15, -0.1, 0.4, 0.05, 1.2, k % 2 ? cloth2 : cloth);
      for (let k = 0; k < 6; k++) M.box(-1.0 + k * 0.4 + 0.2, 2.0, -0.71, 0.4, 0.28, 0.03, k % 2 ? cloth2 : cloth);
      // what's on it
      if (o.goods === 'fruit') for (let k = 0; k < 3; k++) {
        M.box(-0.7 + k * 0.7, 1.05, 0, 0.55, 0.22, 0.45, [0.5, 0.36, 0.22]);
        for (let a = 0; a < 6; a++) M.box(-0.88 + k * 0.7 + (a % 3) * 0.18, 1.2, -0.1 + Math.floor(a / 3) * 0.2, 0.12, 0.12, 0.12, k === 1 ? [0.85, 0.65, 0.15] : [0.72, 0.14, 0.1]);
      }
      if (o.goods === 'papers') for (let k = 0; k < 4; k++) M.box(-0.75 + k * 0.5, 1.0, 0, 0.36, 0.08 + (k % 2) * 0.04, 0.46, [0.9, 0.9, 0.86]);
      if (o.goods === 'bread') for (let k = 0; k < 5; k++) M.box(-0.8 + k * 0.4, 1.02, (k % 2) * 0.12 - 0.06, 0.26, 0.11, 0.13, [0.77, 0.55, 0.3]);
      if (o.sign) M.box(0, 2.42, -0.68, 1.4, 0.3, 0.04, o.sign);
    },
    // a crate of bread (the Abnegation volunteers carry them)
    crate(M) {
      M.box(0, 0.18, 0, 0.6, 0.36, 0.42, [0.48, 0.36, 0.22]);
      for (let k = 0; k < 3; k++) M.box(-0.17 + k * 0.17, 0.41, 0, 0.13, 0.11, 0.26, [0.77, 0.55, 0.3]);
    },
    // a guitar case, open on the pavement
    case(M) {
      M.box(0, 0.05, 0, 0.42, 0.1, 1.0, [0.12, 0.1, 0.09]);
      M.box(0, 0.11, 0, 0.36, 0.02, 0.92, [0.5, 0.15, 0.18]);
      M.box(0.05, 0.13, 0.1, 0.06, 0.02, 0.06, [0.8, 0.7, 0.3]);
    },
    // an oil drum with a fire in it
    barrel(M) {
      M.push(0, 0, 0, 0, 0, 0);
      M.add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10).translate(0, 0.45, 0), [0.3, 0.18, 0.12]);
      M.add(new THREE.CylinderGeometry(0.31, 0.31, 0.05, 10).translate(0, 0.62, 0), [0.22, 0.14, 0.1]);
      M.add(new THREE.ConeGeometry(0.22, 0.55, 6).translate(0, 1.15, 0), [1.0, 0.55, 0.15], { emit: true });
      M.add(new THREE.ConeGeometry(0.14, 0.4, 5).translate(0.08, 1.12, 0.06), [1.0, 0.85, 0.35], { emit: true });
      M.pop();
    },
    broom(M) { M.box(0, 0, 0.55, 0.03, 0.03, 1.2, [0.5, 0.38, 0.22]); M.box(0, 0, 1.15, 0.25, 0.06, 0.12, [0.7, 0.6, 0.35]); },
    book(M, o) { M.box(0, 0, 0, 0.17, 0.035, 0.24, o.color || [0.2, 0.3, 0.5]); },
    guitar(M) {
      M.box(0, 0, 0, 0.34, 0.4, 0.09, [0.6, 0.33, 0.15]);
      M.box(0, 0.45, 0, 0.05, 0.52, 0.035, [0.35, 0.23, 0.13]);
    },
    loaf(M) { M.box(0, 0, 0, 0.26, 0.11, 0.13, [0.77, 0.55, 0.3]); },
  };
  const propMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
  const geoCache = {};
  function propGeo(kind, o) {
    const key = kind + JSON.stringify(o || {});
    if (!geoCache[key]) { const M = new DV.Vehicles.MB(); PROPS[kind](M, o || {}); geoCache[key] = M.geometry(); }
    return geoCache[key];
  }

  /* ---------------- what's going on, where and when ---------------- */
  // where: the sectors it happens in ('*' anywhere); hours: [from, to)
  const SCENES = {
    stall_fruit: { where: ['testing', 'downtown', 'abnegation', 'candor', 'erudite'], hours: [8, 19], w: 1.2 },
    newsstand: { where: ['candor', 'downtown', 'testing'], hours: [7, 20], w: 1 },
    bread: { where: ['abnegation', 'factionless', 'testing'], hours: [9, 17], w: 1.4 },
    busker: { where: ['downtown', 'testing', 'erudite', 'candor'], hours: [10, 22], w: 1 },
    kids: { where: ['abnegation', 'testing', 'candor'], hours: [9, 18.5], w: 1 },
    sweeper: { where: ['abnegation', 'testing', 'downtown'], hours: [7, 18], w: 0.8 },
    readers: { where: ['erudite', 'downtown'], hours: [8, 21], w: 1.2 },
    argument: { where: ['candor', 'downtown'], hours: [8, 22], w: 1.2 },
    chat: { where: ['*'], hours: [7, 21.5], w: 1 },
    crew: { where: ['dauntless'], hours: [0, 24], w: 1.6 },
    fire: { where: ['factionless'], hours: [17, 6], w: 2 },
  };
  const LINES = {
    stall_fruit: { vendor: ['Apples, fresh from the orchards this morning!', 'Take one. Go on, they\'re free today.', 'Amity grows enough for everyone.'], other: ['These are good this year.', 'Two, please.', 'Mm.'] },
    newsstand: { vendor: ['The Candor Daily! Every word of it true!', 'Read what they said in the council today, word for word.', 'Paper? It won\'t lie to you.'], other: ['They printed the whole thing again.', 'Honestly, I only read the letters.'] },
    bread: { vendor: ['There\'s enough for everyone. Take what you need.', 'Here you are. No, no thanks needed.', 'Pass it down the line, would you?'], other: ['Thank you.', '...Thanks.', 'Same time next week?', 'Bless the grey ones.'] },
    busker: { vendor: ['♪ ...and the river ran all the way to the sea... ♪', '♪ Peace in the orchard, peace in the field... ♪', 'Requests? I know four songs.'], other: ['She\'s good.', 'Play the one about the river.', '...'] },
    kids: { vendor: ['You\'re it!', 'Can\'t catch me!', 'No fair!'], other: ['You\'re it!', 'Can\'t catch me!', 'Ha!'] },
    sweeper: { vendor: ['Mind the dust, sorry.', 'Someone has to.', 'Good afternoon.'], other: [] },
    readers: { vendor: ['Fascinating. The figures were wrong by an order of magnitude.', 'Hm? Sorry. Chapter nine.', 'Do you mind? I\'m nearly finished.'], other: ['Have you read Matthews on the serum?', 'Shh.'] },
    argument: { vendor: ['That is NOT what you said yesterday.', 'Say it to my face, then!', 'I\'m being honest! That\'s the point!'], other: ['You\'re both wrong.', 'Here we go again.', 'Just admit it.'] },
    chat: { vendor: ['...and then she said the test was nothing like they told us.', 'Did you hear about the drones at night?', 'Tomorrow\'s the Choosing. Can you believe it?'], other: ['No!', 'Really?', 'I heard something different.', 'Ha. Typical.'] },
    crew: { vendor: ['Look who it is.', 'Train\'s late again.', 'You want something?'], other: ['Ha!', 'Shut up.', 'Race you to the tracks.'] },
    fire: { vendor: ['Get close. It\'s cold enough.', 'Don\'t go out past the tracks tonight. Not with what\'s out there.', 'Spare anything?'], other: ['...', 'They found another one, you know. By the river.', 'Keep your voice down.'] },
  };

  class CityLife {
    constructor(zone, city, life) {
      this.zone = zone; this.city = city; this.life = life;
      this.r = U.rng(5150);
      this.scenes = [];
      this.idN = 0;
      this.spawnT = 0;
      this.first = true;
      this.shown = true;
      // the glow over the fires (one draw for them all)
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
      this.glow = new THREE.Points(lg, new THREE.PointsMaterial({ size: 2.6, color: 0xff9a40, map: DV.StreetKit.glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true }));
      this.glow.frustumCulled = false;
      this.glow.visible = false;
      zone.group.add(this.glow);
    }

    /* ---- a place for a scene: a stretch of pavement, and which side the buildings are ---- */
    spot(px, pz, near) {
      const W = this.life.walk, list = W.edgesNear(px, pz, FAR + 4);
      const cam = DV.Game && DV.Game.camera;
      let fx = 0, fz = 1;
      if (cam) { const v = cam.getWorldDirection(new THREE.Vector3()); const l = Math.hypot(v.x, v.z) || 1; fx = v.x / l; fz = v.z / l; }
      // (street furniture, and the buildings and everything else solid)
      const blocked = (x, z) => (this.life.kit && this.life.kit.blocked(x, z, 0.4)) || this.zone.colliders.blocked(x, z, 0.4, 'npc');
      for (let tries = 0; tries < 18 && list.length; tries++) {
        const e = W.edges[list[Math.floor(this.r() * list.length)]];
        if (e.cross || e.len < 9) continue;
        const A = W.nodes[e.a], B = W.nodes[e.b], t = 0.25 + this.r() * 0.5;
        const x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t, d = Math.hypot(x - px, z - pz);
        if (d > FAR || d < (near ? 8 : NEAR)) continue;
        if (!near && ((x - px) * fx + (z - pz) * fz) / d > 0.4 && d < 55) continue; // (out of sight, mostly)
        if (this.scenes.some((s) => Math.hypot(s.x - x, s.z - z) < APART)) continue;
        if (this.zone.roomAt(x, z)) continue;
        if (this.life.kit && this.life.kit.chunk && !this.life.kit.chunk(x, z).built) continue; // (its street furniture isn't built yet: we can't see what's in the way)
        const S = DV.CityMap.landmark('order_station');
        if (S && Math.hypot(x - S.x, z - S.z) < 40) continue;
        const ux = (B.x - A.x) / e.len, uz = (B.z - A.z) / e.len;
        // the buildings' side: whichever side is built up a couple of metres off the walking line
        let nx = -uz, nz = ux;
        const l = blocked(x + nx * 2.4, z + nz * 2.4), r2 = blocked(x - nx * 2.4, z - nz * 2.4);
        if (r2 && !l) { nx = -nx; nz = -nz; }
        // room for it: nothing standing in its footprint (a tree, a lamp, a bin, a bench)
        let clear = true;
        for (let u = -1.8; u <= 1.8 && clear; u += 0.9) for (let v = 0.2; v <= 1.8; v += 0.8) if (blocked(x + ux * u + nx * v, z + uz * u + nz * v)) { clear = false; break; }
        if (!clear) continue;
        return { x, z, ux, uz, nx, nz, d };
      }
      return null;
    }
    pick(x, z) {
      const dd = DV.CityMap.district(x, z), id = dd.d && dd.k > 0.1 ? dd.d.id : 'testing';
      const night = between(22, 6);
      const opts = Object.entries(SCENES).filter(([k, s]) => (s.where.includes('*') || s.where.includes(id)) && between(s.hours[0], s.hours[1]) && (!night || k === 'crew' || k === 'fire'));
      if (!opts.length) return null;
      let q = this.r() * opts.reduce((a, [, s]) => a + s.w, 0);
      for (const [k, s] of opts) { q -= s.w; if (q <= 0) return k; }
      return opts[0][0];
    }
    faction(x, z) {
      const dd = DV.CityMap.district(x, z), mix = dd.d && dd.k > 0.15 ? dd.d.peds : DV.CityMap.districts[0].peds;
      let tot = 0; for (const f in mix) tot += mix[f];
      let q = this.r() * tot;
      for (const f in mix) { q -= mix[f]; if (q <= 0) return f; }
      return 'abnegation';
    }

    /* ---- building one ---- */
    spawn(px, pz, near) {
      const sp = this.spot(px, pz, near);
      if (!sp) return false;
      const kind = this.pick(sp.x, sp.z);
      if (!kind) return false;
      const sc = { id: 'cl' + this.idN++, kind, x: sp.x, z: sp.z, f: sp, people: [], props: [], solid: [], t: 0, gave: false };
      // local frame: u along the pavement, v towards the buildings
      const at = (u, v) => [sp.x + sp.ux * u + sp.nx * v, sp.z + sp.uz * u + sp.nz * v];
      const face = (dx, dz) => Math.atan2(dx, dz);
      const toStreet = face(-sp.nx, -sp.nz), toWall = face(sp.nx, sp.nz);
      const who = (f, role, u, v, rot, action, o) => this.person(sc, f, role, at(u, v), rot, action, o || {});
      const prop = (k, u, v, rot, o) => this.prop(sc, k, at(u, v), rot, o);
      const loc = this.faction(sp.x, sp.z);
      switch (kind) {
        case 'stall_fruit':
          prop('stall', 0, 0.9, toStreet, { goods: 'fruit', cloth: [0.72, 0.18, 0.12] });
          who('amity', 'vendor', 0, 1.65, toStreet, 'give');
          who(loc, 'other', -0.4, -0.05, toWall, 'idle');
          if (this.r() < 0.6) who(this.faction(sp.x, sp.z), 'other', 0.75, 0.0, toWall + 0.3, 'idle');
          sc.gift = 'apple';
          break;
        case 'newsstand':
          prop('stall', 0, 0.9, toStreet, { goods: 'papers', cloth: [0.12, 0.12, 0.12], sign: [0.92, 0.92, 0.88] });
          who('candor', 'vendor', 0, 1.65, toStreet, 'point');
          who(loc, 'other', 0.5, 0.0, toWall, 'read', { hold: ['handL', 'book', { color: [0.9, 0.9, 0.86] }] });
          sc.gift = 'candor_paper';
          break;
        case 'bread':
          prop('crate', -0.6, 0.85, 0);
          prop('crate', -0.15, 1.0, 0.3);
          who('abnegation', 'vendor', 0, 0.85, face(-sp.ux, -sp.uz), 'give', { hold: ['handR', 'loaf'] });
          for (let k = 0; k < 3; k++) who(k === 2 && this.r() < 0.5 ? 'abnegation' : 'factionless', 'other', -1.2 - k * 0.9, 0.55 + (k % 2) * 0.15, face(sp.ux, sp.uz), 'idle');
          sc.gift = 'bread_roll';
          break;
        case 'busker':
          who('amity', 'vendor', 0, 1.0, toStreet, 'strum', { hold: ['chest', 'guitar', null, [0.06, -0.32, 0.2], [0, 0, -1.1]] });
          prop('case', 0.9, 0.7, 0.2);
          for (let k = 0; k < 1 + Math.floor(this.r() * 2); k++) who(this.faction(sp.x, sp.z), 'other', -1.0 + k * 1.6, -0.6, face(-sp.nx * -1, -sp.nz * -1), this.r() < 0.5 ? 'clap' : 'idle');
          break;
        case 'kids':
          for (let k = 0; k < 3; k++) who(loc === 'factionless' ? 'abnegation' : loc, 'kid', 0, 0.6, 0, 'idle', { child: true, phase: (k / 3) * Math.PI * 2 });
          break;
        case 'sweeper':
          who('abnegation', 'vendor', 0, 0.8, face(sp.ux, sp.uz), 'sweep', { hold: ['handR', 'broom', null, [0, -0.05, 0.05], [Math.PI / 2 + 0.5, 0, 0]] });
          break;
        case 'readers':
          who('erudite', 'vendor', -0.5, 0.9, toStreet + 0.3, 'read', { hold: ['handL', 'book', { color: [0.18, 0.28, 0.5] }] });
          who('erudite', 'other', 0.6, 1.0, toStreet - 0.4, 'read', { hold: ['handL', 'book', { color: [0.45, 0.2, 0.2] }] });
          break;
        case 'argument':
          who('candor', 'vendor', -0.5, 0.7, face(sp.ux, sp.uz), 'argue');
          who('candor', 'other', 0.5, 0.7, face(-sp.ux, -sp.uz), 'argue');
          if (this.r() < 0.6) who(this.faction(sp.x, sp.z), 'other', 0, 1.5, toStreet, 'idle');
          break;
        case 'chat': {
          const n = 2 + (this.r() < 0.4 ? 1 : 0);
          for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + 0.3, u = Math.cos(a) * 0.7, v = 0.8 + Math.sin(a) * 0.5; who(this.faction(sp.x, sp.z), k ? 'other' : 'vendor', u, v, face(-Math.cos(a) * sp.ux - Math.sin(a) * sp.nx, -Math.cos(a) * sp.uz - Math.sin(a) * sp.nz), 'idle'); }
          break;
        }
        case 'crew':
          who('dauntless', 'vendor', 0, 1.2, toStreet, 'lean');
          who('dauntless', 'other', -0.8, 0.5, face(sp.nx + sp.ux, sp.nz + sp.uz), 'idle');
          who('dauntless', 'other', 0.8, 0.5, face(sp.nx - sp.ux, sp.nz - sp.uz), 'idle');
          break;
        case 'fire': {
          prop('barrel', 0, 0.9, 0);
          sc.fire = at(0, 0.9);
          for (let k = 0; k < 3; k++) { const a = -0.6 + k * 1.3 + Math.PI, u = Math.sin(a) * 0.9, v = 0.9 + Math.cos(a) * 0.9; who('factionless', k ? 'other' : 'vendor', u, v, face(-Math.sin(a) * sp.ux - Math.cos(a) * sp.nx, -Math.sin(a) * sp.uz - Math.cos(a) * sp.nz), 'idle'); }
          break;
        }
      }
      if (!sc.people.length) return false;
      this.scenes.push(sc);
      return true;
    }
    person(sc, f, role, [x, z], rot, action, o) {
      const sex = this.r() < 0.5 ? 'f' : 'm', age = o.child ? 9 + Math.floor(this.r() * 4) : 18 + Math.floor(this.r() * 50);
      const app = DV.Character.fromFaction(f, sex, 'scene:' + sc.id + ':' + sc.people.length, { age });
      if (o.child) app.child = true;
      const model = DV.Character.create(app);
      model.root.position.set(x, 0.012, z);
      model.root.rotation.y = rot;
      this.zone.group.add(model.root);
      if (o.hold) {
        const [bone, kind, opts, pos, r] = o.hold;
        const m = new THREE.Mesh(propGeo(kind, opts), propMat);
        m.position.set(...(pos || [0, -0.1, 0.06]));
        if (r) m.rotation.set(r[0], r[1], r[2]);
        model.attach(bone, m);
      }
      const name = o.child ? (sex === 'f' ? 'Girl' : 'Boy') : role === 'vendor' && sc.kind === 'stall_fruit' ? 'Fruit Seller' : role === 'vendor' && sc.kind === 'newsstand' ? 'Newsseller' : role === 'vendor' && sc.kind === 'bread' ? 'Abnegation Volunteer' : role === 'vendor' && sc.kind === 'busker' ? 'Busker' : DV.Factions.name(f) + ' ' + (sex === 'f' ? 'woman' : 'man');
      const p = { id: sc.id + ':' + sc.people.length, model, app, f, role, name, x, z, x0: x, z0: z, rot, rot0: rot, action, bark: null, lodT: 0, phase: o.phase || 0, child: !!o.child };
      p.headY = () => (o.child ? 1.0 : 1.62 * (app.height || 1));
      p.it = { id: 'cl:' + p.id, kind: 'action', x, y: 1.1, z, radius: 1.8, label: 'Talk to', name, onUse: () => this.talk(sc, p) };
      this.zone.interactables.push(p.it);
      sc.people.push(p);
      return p;
    }
    prop(sc, kind, [x, z], rot, o) {
      const m = new THREE.Mesh(propGeo(kind, o), propMat.clone());
      m.position.set(x, 0, z);
      m.rotation.y = rot || 0;
      const L = this.zone.lightAt(x, z);
      m.material.color.setRGB(U.clamp(L[0] * 0.95, 0.35, 1.2), U.clamp(L[1] * 0.95, 0.35, 1.2), U.clamp(L[2] * 0.95, 0.35, 1.2));
      this.zone.group.add(m);
      sc.props.push(m);
      // (a stall, a crate or a barrel you walk into, not through: round bodies, like people, so they go
      // when the scene does)
      const c = Math.cos(rot || 0), sn = Math.sin(rot || 0);
      if (kind === 'stall') for (const u of [-0.7, 0, 0.7]) sc.solid.push({ x: x + c * u, z: z - sn * u, r: 0.5 });
      if (kind === 'barrel' || kind === 'crate') sc.solid.push({ x, z, r: 0.36 });
      return m;
    }
    release(sc) {
      for (const p of sc.people) {
        const i = this.zone.interactables.indexOf(p.it);
        if (i >= 0) this.zone.interactables.splice(i, 1);
        if (DV.Interaction.current === p.it) DV.Interaction.current = null;
        if (p.model.root.parent) p.model.root.parent.remove(p.model.root);
        p.model.dispose();
      }
      for (const m of sc.props) {
        if (m.parent) m.parent.remove(m);
        m.material.dispose();
      }
    }
    say(p, text, secs) { p.bark = { text, until: performance.now() + (secs || 3.5) * 1000 }; }
    talk(sc, p) {
      const L = LINES[sc.kind], l = (p.role === 'vendor' ? L.vendor : L.other.length ? L.other : L.vendor);
      p.k = ((p.k === undefined ? Math.floor(this.r() * l.length) : p.k) + 1) % l.length;
      this.say(p, l[p.k], 4);
      p.listen = 4;
      // the stallholders (and the volunteer with the bread) give you something, once
      if (p.role === 'vendor' && sc.gift && !sc.gave && DV.Items.get(sc.gift)) {
        sc.gave = true;
        DV.Inventory.add(sc.gift, 1);
        DV.UI.notify('Received: ' + DV.Items.get(sc.gift).name, 'item');
      }
      DV.Stats.practice('empathy', 0.05);
    }

    /* ---- every frame ---- */
    update(dt) {
      const P = DV.Player, px = P.x, pz = P.z;
      const room = this.zone.roomAt(px, pz), away = this.life.shown !== true || (room && !room.exterior);
      if (away !== !this.shown) {
        this.shown = !away;
        for (const sc of this.scenes) { for (const p of sc.people) p.model.root.visible = this.shown; for (const m of sc.props) m.visible = this.shown; }
        this.glow.visible = this.shown && this.scenes.some((s) => s.fire);
      }
      if (away) return;
      // let go of the ones far behind you, and the ones whose hour has passed
      for (let i = this.scenes.length - 1; i >= 0; i--) {
        const sc = this.scenes[i], d = Math.hypot(sc.x - px, sc.z - pz), S = SCENES[sc.kind];
        if (d > GONE || (d > 40 && !between(S.hours[0], S.hours[1]))) { this.release(sc); this.scenes.splice(i, 1); }
      }
      // keep a few going round you (fewer late at night)
      const want = between(22, 6) ? 1 : MAX;
      this.spawnT -= dt;
      if (this.first) { for (let k = 0; k < 8 && this.scenes.length < want; k++) this.spawn(px, pz, true); this.first = false; }
      else if (this.scenes.length < want && this.spawnT <= 0) { this.spawn(px, pz, false); this.spawnT = 3 + this.r() * 3; }
      // a jump (a load, a scene that moved you): afresh
      if (this.last && Math.hypot(px - this.last[0], pz - this.last[1]) > 40) { for (const sc of this.scenes) this.release(sc); this.scenes = []; this.first = true; }
      this.last = [px, pz];
      const now = performance.now(), fires = [];
      for (const sc of this.scenes) {
        sc.t += dt;
        if (sc.fire) fires.push(sc.fire);
        // now and then somebody says something
        sc.barkT = (sc.barkT === undefined ? 2 + this.r() * 6 : sc.barkT) - dt;
        const dp = Math.hypot(sc.x - px, sc.z - pz);
        if (sc.barkT <= 0 && dp < 22) {
          const p = sc.people[Math.floor(this.r() * sc.people.length)], L = LINES[sc.kind], l = p.role === 'vendor' || !L.other.length ? L.vendor : L.other;
          if (l.length) this.say(p, l[Math.floor(this.r() * l.length)], 3);
          sc.barkT = 7 + this.r() * 9;
        }
        for (const p of sc.people) {
          let speed = 0, act = p.action;
          if (p.child) {
            // chase: round and round a little circle
            const a = sc.t * 1.6 + p.phase, R = 1.5;
            const cx = p.x0, cz = p.z0;
            const nx = cx + Math.cos(a) * R, nz = cz + Math.sin(a) * R;
            p.rot = Math.atan2(nx - p.x, nz - p.z);
            p.x = nx; p.z = nz; speed = 2.4; act = 'idle';
          } else if (sc.kind === 'sweeper') {
            // slowly up the pavement and back
            const s = Math.sin(sc.t * 0.12) * 3.5;
            p.x = p.x0 + sc.f.ux * s; p.z = p.z0 + sc.f.uz * s;
            p.rot = Math.cos(sc.t * 0.12) > 0 ? Math.atan2(sc.f.ux, sc.f.uz) : Math.atan2(-sc.f.ux, -sc.f.uz);
          }
          if (p.listen > 0) { p.listen -= dt; p.rot = U.dampAngle(p.rot, Math.atan2(px - p.x, pz - p.z), 6, dt); act = sc.kind === 'kids' ? 'wave' : 'idle'; speed = 0; }
          else if (!p.child && sc.kind !== 'sweeper') p.rot = U.dampAngle(p.rot, p.rot0, 3, dt);
          const root = p.model.root;
          root.position.set(p.x, 0.012, p.z);
          root.rotation.y = p.rot;
          p.it.x = p.x; p.it.z = p.z;
          p.lodT += dt;
          if (dp > 35 && p.lodT < 0.15) continue;
          const adt = p.lodT; p.lodT = 0;
          p.model.animate(adt, { speed, action: act, talking: !!(p.bark && p.bark.until > now) || (sc.kind === 'chat' && Math.sin(sc.t * 0.7 + p.phase * 3 + p.x) > 0.3) });
          const L = this.zone.lightAt(p.x, p.z);
          p.model.setTint(U.clamp(L[0] * 0.9, 0.25, 1.3), U.clamp(L[1] * 0.9, 0.25, 1.3), U.clamp(L[2] * 0.9, 0.25, 1.3));
        }
      }
      // the glow of the fires, flickering
      const gp = this.glow.geometry.attributes.position.array;
      fires.slice(0, MAX).forEach((f, i) => { gp[i * 3] = f[0]; gp[i * 3 + 1] = 1.2 + Math.sin(now / 90 + i) * 0.05; gp[i * 3 + 2] = f[1]; });
      this.glow.geometry.attributes.position.needsUpdate = true;
      this.glow.geometry.setDrawRange(0, Math.min(MAX, fires.length));
      this.glow.visible = fires.length > 0;
      this.glow.material.size = 2.4 + Math.sin(now / 70) * 0.25;
    }
    info() { return { scenes: this.scenes.map((s) => s.kind), people: this.scenes.reduce((n, s) => n + s.people.length, 0) }; }
    barkSources() {
      const now = performance.now(), out = [];
      for (const sc of this.scenes) for (const p of sc.people) if (p.bark && p.bark.until > now) out.push(p);
      return out;
    }
    bodies(px, pz, r) {
      const out = [];
      if (!this.shown) return out;
      for (const sc of this.scenes) {
        for (const p of sc.people) if (Math.abs(p.x - px) < r && Math.abs(p.z - pz) < r) out.push({ x: p.x, z: p.z, r: p.child ? 0.2 : 0.28 });
        for (const b of sc.solid) if (Math.abs(b.x - px) < r + 1 && Math.abs(b.z - pz) < r + 1) out.push(b);
      }
      return out;
    }
  }

  DV.CityLife = {
    SCENES,
    attach(zone, city, life) {
      const c = new CityLife(zone, city, life);
      zone.cityLife = c;
      return c;
    },
    active() {
      const z = DV.World.current;
      return z && z.cityLife ? z.cityLife : null;
    },
  };
})();
