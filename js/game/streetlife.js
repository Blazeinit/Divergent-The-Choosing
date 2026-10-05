/* ==========================================================================
   DIVERGENT — street life
   People and traffic in a walkable city, around wherever you are.

   Pedestrians walk the pavements: a network of walking lines along every
   kerb, joined at the corners and across the streets (they wait at the kerb
   for traffic). Who you meet depends on the sector: grey in Abnegation, black
   and white in Candor, blue in Erudite, Dauntless black by the tracks, the
   factionless in the ruins; a mix downtown. Walk up and talk (E) and they'll
   say something; brush past and some will say something anyway. They step
   round you, and you can't walk through them.

   Traffic keeps right on the two-way streets, westbound on Lake Street under
   the L. Buses, cars, Erudite vans, Amity trucks, Dauntless jeeps; they keep
   their distance, stop for you (and lean on the horn if you stand there),
   and you can't walk through them either. Each one you're near has its own
   engine sound.

   Everything is spawned out of sight (or at least far off) and let go once
   it's far behind you, so the city is busy wherever you go without the cost
   of a whole city's worth of people.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const INS = 1.6; // the walking line, in from the kerb
  const MAX_PEDS = 26, MAX_CARS = 13, MODEL_CAP = 36;
  const PED_FAR = 72, CAR_FAR = 190;

  // what people say when you talk to them, faction by faction (it's the day of the aptitude test)
  const LINES = {
    abnegation: ['Is there anything you need?', 'Mind the kerb there.', 'We\'re handing out bread on Fulton Street, if anyone you know needs it.', 'The test is over now. Whatever it said — go home and rest.', 'Excuse me. I\'m expected at the council hall.', 'You\'ll be all right. Everyone is, in the end.'],
    erudite: ['The serum\'s only as reliable as its calibration. Remember that.', 'Pardon me, I\'m late for the lab.', 'Did you know the L was built more than a century before the Fence?', 'Your results are in the system already. Fascinating, isn\'t it?', 'If you\'re lost: the streets are a grid. Even you can manage a grid.', 'Read something tonight. It helps.'],
    candor: ['You look lost. Are you lost?', 'Tested today? How did it go — and don\'t lie to me.', 'Honestly? You look terrified.', 'The Mart\'s that way, if you\'re looking for the truth.', 'That\'s a terrible way to stand. Stand up straight.', 'You\'re staring. Just say what you\'re thinking.'],
    amity: ['Lovely afternoon for it, isn\'t it?', 'Here — have an apple. Go on.', 'Peace be with you.', 'Whatever the test said, you\'ll find your place.', 'The truck back to the farms leaves from the Fence at sundown.', 'You look like you need a hug. No? All right.'],
    dauntless: ['Out of the way.', 'Train\'s due any minute. Gotta run.', 'What are you looking at?', 'Tomorrow\'s the Choosing. Don\'t be boring.', 'Jump on a moving train yet? You should.', 'Watch yourself out here after dark.'],
    factionless: ['Spare anything?', '…', 'Don\'t look at me like that.', 'They\'ll test you, and then they\'ll forget you.', 'Keep walking, kid.', 'Abnegation brings bread on Thursdays. The rest of them don\'t bother.'],
  };
  const PASSING = {
    abnegation: ['Excuse me.', 'Sorry.', 'Pardon.'],
    erudite: ['Excuse me.', 'Careful.', 'Hm.'],
    candor: ['Watch where you\'re going.', 'Excuse you.', 'Move.'],
    amity: ['Oh! Hello.', 'Sorry, love.', 'Hello there.'],
    dauntless: ['Move it.', 'Heads up.', 'Coming through.'],
    factionless: ['…', 'Spare anything?', 'Hey.'],
  };
  const FACTION_NAME = { abnegation: 'Abnegation', erudite: 'Erudite', candor: 'Candor', amity: 'Amity', dauntless: 'Dauntless', factionless: 'Factionless' };

  /* ---------------- the pavements: a walking network ---------------- */
  class Walkways {
    constructor(pads, blocked) {
      this.nodes = [];
      this.edges = [];
      this.keyed = new Map();
      this.blocked = blocked;
      for (const pd of pads) this.addPad(pd);
      this.addCrossings(blocked);
      // edges by 32 m cell, for spawning near the player
      this.cells = new Map();
      this.edges.forEach((e, i) => {
        const a = this.nodes[e.a], b = this.nodes[e.b];
        const n = Math.max(1, Math.ceil(e.len / 16));
        const seen = new Set();
        for (let k = 0; k <= n; k++) {
          const x = a.x + ((b.x - a.x) * k) / n, z = a.z + ((b.z - a.z) * k) / n;
          const key = Math.floor(x / 32) * 100003 + Math.floor(z / 32);
          if (seen.has(key)) continue;
          seen.add(key);
          let l = this.cells.get(key);
          if (!l) this.cells.set(key, (l = []));
          l.push(i);
        }
      });
    }
    node(x, z) {
      const key = Math.round(x * 10) + ':' + Math.round(z * 10);
      let i = this.keyed.get(key);
      if (i === undefined) { i = this.nodes.length; this.nodes.push({ x, z, edges: [] }); this.keyed.set(key, i); }
      return i;
    }
    link(a, b, cross) {
      if (a === b) return;
      const A = this.nodes[a], B = this.nodes[b];
      const len = Math.hypot(B.x - A.x, B.z - A.z);
      if (len < 0.3) return;
      // not where something's built over the pavement (the Hub stands across two streets)
      const n = Math.ceil(len);
      for (let k = 0; k <= n; k++) if (this.blocked(A.x + ((B.x - A.x) * k) / n, A.z + ((B.z - A.z) * k) / n, 0.45)) return;
      const i = this.edges.length;
      this.edges.push({ a, b, len, cross: !!cross });
      A.edges.push(i); B.edges.push(i);
    }
    addPad(pd) {
      const [x0, z0, x1, z1] = pd.r, e = pd.edge;
      if (x1 - x0 < 2 || z1 - z0 < 2) return;
      // a lane along each kerb, its ends at the corners (or short of the zone's grounds)
      const lo = (k) => (k ? INS : 0.5);
      if (e[1]) this.link(this.node(x0 + lo(e[0]), z0 + INS), this.node(x1 - lo(e[2]), z0 + INS));
      if (e[3]) this.link(this.node(x0 + lo(e[0]), z1 - INS), this.node(x1 - lo(e[2]), z1 - INS));
      if (e[0]) this.link(this.node(x0 + INS, z0 + lo(e[1])), this.node(x0 + INS, z1 - lo(e[3])));
      if (e[2]) this.link(this.node(x1 - INS, z0 + lo(e[1])), this.node(x1 - INS, z1 - lo(e[3])));
    }
    // crossings: from each corner straight over the street to the corner opposite
    addCrossings(blocked) {
      const N = this.nodes;
      const byZ = new Map(), byX = new Map();
      N.forEach((n, i) => {
        const kz = Math.round(n.z * 2), kx = Math.round(n.x * 2);
        if (!byZ.has(kz)) byZ.set(kz, []); byZ.get(kz).push(i);
        if (!byX.has(kx)) byX.set(kx, []); byX.get(kx).push(i);
      });
      const tryLink = (i, list, key) => {
        const n = N[i];
        let best = null, bd = 1e9;
        for (const j of list) {
          if (j === i) continue;
          const d = Math.abs(N[j][key] - n[key]);
          if (d < 7 || d > 24 || d >= bd) continue;
          if (n.edges.some((ei) => { const e = this.edges[ei]; return e.a === j || e.b === j; })) continue;
          best = j; bd = d;
        }
        if (best === null || best < i) return; // (each pair once)
        // not through anything solid (the Hub sits on two streets)
        const m = N[best];
        for (let k = 1; k < 6; k++) if (blocked(n.x + ((m.x - n.x) * k) / 6, n.z + ((m.z - n.z) * k) / 6, 0.3)) return;
        this.link(i, best, true);
      };
      N.forEach((n, i) => {
        if (n.edges.length > 2) return;
        // (only corners: where two lanes meet, or a lane ends)
        tryLink(i, byZ.get(Math.round(n.z * 2)) || [], 'x');
        tryLink(i, byX.get(Math.round(n.x * 2)) || [], 'z');
      });
    }
    edgesNear(x, z, r) {
      const out = [];
      const seen = new Set();
      for (let i = Math.floor((x - r) / 32); i <= Math.floor((x + r) / 32); i++) for (let j = Math.floor((z - r) / 32); j <= Math.floor((z + r) / 32); j++) {
        const l = this.cells.get(i * 100003 + j);
        if (!l) continue;
        for (const e of l) if (!seen.has(e)) { seen.add(e); out.push(e); }
      }
      return out;
    }
  }

  /* ---------------- the roads: lanes, cut where something stands on them ---------------- */
  function buildLanes(city, blocked) {
    const CM = DV.CityMap, c = city.centre, lim = city.walk.limit - 18, shore = city.walk.shore - 6;
    const lanes = [];
    const add = (axis, line, k0, k1) => {
      const mid = (k0 + k1) / 2;
      const defs = line.oneWay ? [{ off: line.oneWay > 0 ? -0.5 : 0.5, dir: line.oneWay }] : axis === 'x' ? [{ off: 2.0, dir: 1 }, { off: -2.0, dir: -1 }] : [{ off: -2.0, dir: 1 }, { off: 2.0, dir: -1 }];
      for (const d of defs) {
        const cc = mid + d.off;
        // the stretch inside the Fence
        const across = axis === 'x' ? cc - c[1] : cc - c[0];
        if (Math.abs(across) >= lim) continue;
        const half = Math.sqrt(lim * lim - across * across);
        let s0 = (axis === 'x' ? c[0] : c[1]) - half, s1 = (axis === 'x' ? c[0] : c[1]) + half;
        if (axis === 'x') s1 = Math.min(s1, shore);
        else if (cc > shore) continue;
        // split where the road is built over (the Hub's podium sits across Halsted and Monroe)
        let start = null;
        for (let s = s0; s <= s1 + 0.01; s += 3) {
          const x = axis === 'x' ? s : cc, z = axis === 'x' ? cc : s;
          const free = s <= s1 && !blocked(x, z, 1.4);
          if (free && start === null) start = s;
          if ((!free || s + 3 > s1) && start !== null) {
            const end = free ? s : s - 3;
            if (end - start > 40) lanes.push({ axis, c: cc, dir: d.dir, s0: start + 4, s1: end - 4, line, cars: [] });
            start = null;
          }
        }
      }
    };
    for (const a of CM.avenues) { const [k0, k1] = CM.road(a); add('z', a, k0, k1); }
    for (const st of CM.streets) { const [k0, k1] = CM.road(st); add('x', st, k0, k1); }
    return lanes;
  }

  /* ---------------- street life ---------------- */
  class Life {
    constructor(zone, city, kit) {
      this.zone = zone;
      this.city = city;
      this.kit = kit;
      this.r = U.rng(4242);
      const blocked = (x, z, r) => kit.blocked(x, z, r);
      this.walk = new Walkways(city.walk.pads, blocked);
      this.lanes = buildLanes(city, blocked);
      // the lanes of each street (for turning into one)
      this.laneBy = new Map();
      for (const l of this.lanes) { let a = this.laneBy.get(l.line); if (!a) this.laneBy.set(l.line, (a = [])); a.push(l); }
      // every car's lamps: tail lights, brake lights, indicators, headlights after dark (one draw call)
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_CARS * 6 * 3), 3));
      lg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_CARS * 6 * 3), 3));
      this.lamps = new THREE.Points(lg, new THREE.PointsMaterial({ size: 0.55, map: DV.StreetKit.glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true }));
      this.lamps.name = 'car_lamps';
      this.lamps.frustumCulled = false;
      zone.group.add(this.lamps);
      this.peds = [];
      this.cars = [];
      this.pool = [];
      this.pedT = 0;
      this.carT = 0;
      this.barkT = 0;
      this.idN = 0;
      this.first = true;
      this.awake = true;
    }
    // how busy it is here and now (0..1): the sector, and the time (curfew's at ten)
    busy(x, z) {
      const dd = DV.CityMap.district(x, z);
      const base = dd.d ? U.lerp(0.45, dd.d.density, U.clamp(dd.k * 2, 0, 1)) : 0.4;
      const m = DV.Clock.minutes();
      const t = m < 360 ? 0.08 : m < 420 ? 0.4 : m < 1200 ? 1 : m < 1320 ? 0.55 : 0.12;
      return base * t;
    }
    pickFaction(x, z) {
      const dd = DV.CityMap.district(x, z);
      const mix = dd.d && dd.k > 0.15 ? dd.d.peds : DV.CityMap.districts[0].peds;
      let tot = 0;
      for (const f in mix) tot += mix[f];
      let q = this.r() * tot;
      for (const f in mix) { q -= mix[f]; if (q <= 0) return f; }
      return 'abnegation';
    }

    /* ---- people ---- */
    model(f) {
      let m = this.pool.find((q) => !q.busy && q.f === f);
      if (!m && this.pool.length >= MODEL_CAP) {
        // all the people we've made are the wrong faction for here: let one go to make room
        const spare = this.pool.findIndex((q) => !q.busy);
        if (spare < 0) return null;
        const old = this.pool.splice(spare, 1)[0];
        if (old.model.root.parent) old.model.root.parent.remove(old.model.root);
        old.model.dispose();
      }
      if (!m) {
        const sex = this.r() < 0.5 ? 'f' : 'm';
        const young = this.r() < 0.18;
        const age = young ? 16 + Math.floor(this.r() * 3) : 22 + Math.floor(this.r() * 40);
        const app = DV.Character.fromFaction(f, sex, 'street:' + f + ':' + (this.modelN = (this.modelN || 0) + 1), { age });
        const model = DV.Character.create(app);
        this.zone.group.add(model.root);
        m = { model, f, sex, age, app, busy: false, name: FACTION_NAME[f] + ' ' + (age < 20 ? (sex === 'f' ? 'girl' : 'boy') : sex === 'f' ? 'woman' : 'man') };
        this.pool.push(m);
      }
      return m || null;
    }
    spawnPed(px, pz, near) {
      const W = this.walk;
      const list = W.edgesNear(px, pz, 62);
      if (!list.length) return false;
      const cam = DV.Game && DV.Game.camera;
      let fx = 0, fz = 1;
      if (cam) { const v = cam.getWorldDirection(new THREE.Vector3()); const l = Math.hypot(v.x, v.z) || 1; fx = v.x / l; fz = v.z / l; }
      for (let tries = 0; tries < 14; tries++) {
        const ei = list[Math.floor(this.r() * list.length)];
        const e = W.edges[ei];
        if (e.cross) continue;
        const A = W.nodes[e.a], B = W.nodes[e.b];
        const t = this.r();
        const x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t;
        const d = Math.hypot(x - px, z - pz);
        if (d > 62 || d < (near ? 5 : 24)) continue;
        // later ones come in from out of sight (behind you, or far up the street ahead)
        if (!near && ((x - px) * fx + (z - pz) * fz) / d > 0.35 && d < 48) continue;
        const f = this.pickFaction(x, z);
        const m = this.model(f);
        if (!m) return false;
        m.busy = true;
        const fwd = this.r() < 0.5;
        const p = {
          id: 'ped' + this.idN++, m, f, name: m.name, model: m.model,
          edge: ei, from: fwd ? e.a : e.b, to: fwd ? e.b : e.a, t: (fwd ? t : 1 - t) * e.len,
          x, z, rot: 0, speed: 0, pace: (m.age > 50 ? 1.05 : 1.25) + this.r() * 0.3, lat: (this.r() - 0.5) * 0.7,
          side: 0, wait: 0, stuck: 0, bark: null, barkCool: 4 + this.r() * 10, lineK: Math.floor(this.r() * 6), lodT: 0, listen: 0,
        };
        p.headY = () => 1.62 * (m.app.height || 1);
        m.model.root.visible = this.shown !== false;
        this.place(p);
        p.rot = p.wantRot;
        // talk to them
        p.it = { id: 'street:' + p.id, kind: 'action', x, y: 1.2, z, radius: 1.9, label: 'Talk to', name: p.name, onUse: () => this.talk(p) };
        this.zone.interactables.push(p.it);
        this.peds.push(p);
        return true;
      }
      return false;
    }
    place(p) {
      const W = this.walk, e = W.edges[p.edge], A = W.nodes[p.from], B = W.nodes[p.to];
      const k = U.clamp(p.t / e.len, 0, 1);
      const dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len;
      const lat = e.cross ? 0 : p.lat + p.side;
      p.x = A.x + (B.x - A.x) * k - dz * lat;
      p.z = A.z + (B.z - A.z) * k + dx * lat;
      p.wantRot = Math.atan2(dx, dz);
    }
    releasePed(p) {
      p.m.busy = false;
      p.m.model.root.visible = false;
      const i = this.zone.interactables.indexOf(p.it);
      if (i >= 0) this.zone.interactables.splice(i, 1);
      if (DV.Interaction.current === p.it) DV.Interaction.current = null;
    }
    talk(p) {
      const lines = LINES[p.f] || LINES.abnegation;
      p.lineK = (p.lineK + 1) % lines.length;
      this.say(p, lines[p.lineK], 4.5);
      p.listen = 4.5;
      DV.Stats.practice('empathy', 0.05);
    }
    say(p, text, secs) { p.bark = { text, until: performance.now() + (secs || 3.5) * 1000 }; }
    // the next stretch at a corner: carry on round the block, or (sometimes) cross the street
    nextEdge(p) {
      const W = this.walk, n = W.nodes[p.to];
      const opts = n.edges.filter((ei) => ei !== p.edge);
      if (!opts.length) return p.edge; // a dead end: turn round
      const w = opts.map((ei) => (W.edges[ei].cross ? 0.4 : 1));
      let q = this.r() * w.reduce((a, b) => a + b, 0);
      for (let k = 0; k < opts.length; k++) { q -= w[k]; if (q <= 0) return opts[k]; }
      return opts[0];
    }
    // may someone cross here now? At a working junction, on the white man (and nothing turning
    // through the crossing); anywhere else, when there's nothing coming
    mayCross(e) {
      const R = this.zone.roads, W = this.walk;
      if (R) {
        if (e.j === undefined) { const A = W.nodes[e.a], B = W.nodes[e.b]; e.j = R.near((A.x + B.x) / 2, (A.z + B.z) / 2, 5) || null; e.axis = Math.abs(B.x - A.x) > Math.abs(B.z - A.z) ? 'x' : 'z'; }
        if (e.j && e.j.signal) {
          if (R.walk(e.j, e.axis) !== 'walk') return false;
          const A = W.nodes[e.a], B = W.nodes[e.b], mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
          return !this.cars.some((c) => c.speed > 0.5 && Math.hypot(c.x - mx, c.z - mz) < 9);
        }
      }
      return this.clearToCross(e);
    }
    // is it safe to cross from here to there? (nothing coming within 24 m)
    clearToCross(e) {
      const W = this.walk, A = W.nodes[e.a], B = W.nodes[e.b];
      const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
      for (const c of this.cars) if (Math.hypot(c.x - mx, c.z - mz) < 24 && c.speed > 0.5) return false;
      return true;
    }
    updatePeds(dt, px, pz, cam) {
      const W = this.walk, P = DV.Player;
      for (let i = this.peds.length - 1; i >= 0; i--) {
        const p = this.peds[i];
        const dp = Math.hypot(p.x - px, p.z - pz);
        if (dp > PED_FAR) { this.releasePed(p); this.peds.splice(i, 1); continue; }
        let spd = p.pace;
        if (p.listen > 0) { p.listen -= dt; spd = 0; }
        if (p.wait > 0) { p.wait -= dt; spd = 0; }
        // the player in the way: stop, then step round
        const fx = Math.sin(p.wantRot), fz = Math.cos(p.wantRot);
        const ax = P.x - p.x, az = P.z - p.z, ahead = ax * fx + az * fz, beside = ax * fz - az * fx;
        if (ahead > 0 && ahead < 1.3 && Math.abs(beside) < 0.75) {
          spd = Math.min(spd, 0.15);
          p.stuck += dt;
          if (p.stuck > 0.5) p.side = U.damp(p.side, beside > 0 ? -0.95 : 0.95, 4, dt);
        } else {
          p.stuck = Math.max(0, p.stuck - dt);
          if (p.stuck === 0) p.side = U.damp(p.side, 0, 1.5, dt);
        }
        // a word as you brush past
        p.barkCool -= dt;
        if (dp < 2.2 && p.barkCool <= 0 && this.barkT <= 0 && this.r() < 0.15) {
          const l = PASSING[p.f];
          this.say(p, l[Math.floor(this.r() * l.length)], 2.4);
          this.barkT = 5;
        }
        if (p.barkCool <= 0) p.barkCool = 18 + this.r() * 20;
        // along the edge, and on round the corner
        let e = W.edges[p.edge];
        p.t += spd * dt;
        if (p.t >= e.len) {
          const next = this.nextEdge(p);
          const ne = W.edges[next];
          if (ne.cross && !this.mayCross(ne)) { p.t = e.len; p.wait = 0.5; }
          else {
            const at = p.to;
            p.edge = next; p.from = at; p.to = ne.a === at ? ne.b : ne.a; p.t = 0;
            e = ne;
          }
        }
        this.place(p);
        const moving = spd > 0.2;
        if (p.listen > 0) p.rot = U.dampAngle(p.rot, Math.atan2(P.x - p.x, P.z - p.z), 6, dt);
        else if (moving) p.rot = U.dampAngle(p.rot, p.wantRot, 7, dt);
        const root = p.model.root;
        root.position.set(p.x, 0.012, p.z);
        root.rotation.y = p.rot;
        p.it.x = p.x; p.it.z = p.z;
        // far ones animate less often (and nobody, while you can't see them)
        p.lodT += dt;
        if (this.shown === false || (dp > 30 && p.lodT < 0.12)) continue;
        const adt = p.lodT;
        p.lodT = 0;
        p.model.animate(adt, { speed: moving ? spd : 0, action: 'idle', lookYaw: 0, talking: !!(p.bark && p.bark.until > performance.now()) });
        const L = this.zone.lightAt(p.x, p.z);
        p.model.setTint(U.clamp(L[0] * 0.9, 0.25, 1.3), U.clamp(L[1] * 0.9, 0.25, 1.3), U.clamp(L[2] * 0.9, 0.25, 1.3));
      }
      void cam;
    }

    /* ---- traffic ---- */
    carKind(x, z, lane) {
      const dd = DV.CityMap.district(x, z), id = dd.d && dd.k > 0.2 ? dd.d.id : 'testing', q = this.r();
      const busRoute = lane.line.name === 'Lake St' || lane.line.name === 'Madison St' || lane.line.name === 'Halsted St';
      if (busRoute && q < 0.28) return { kind: 'bus', stripe: 0xb08a2a };
      if (q < 0.1) return { kind: 'pickup' }; // Amity, bringing produce in
      switch (id) {
        case 'erudite': return q < 0.5 ? { kind: 'van', color: 0xd6d8d8, stripe: 0x2a4a8a } : { kind: 'sedan', color: 0x3e4a5a };
        case 'candor': return { kind: 'sedan', color: q < 0.6 ? 0x1c1c1e : 0xd8d8d2 };
        case 'dauntless': return q < 0.7 ? { kind: 'jeep' } : { kind: 'van', color: 0x2a2a2c };
        case 'abnegation': return q < 0.5 ? { kind: 'bus', stripe: 0x8a8a84 } : { kind: 'van', color: 0x8a8a84 };
        case 'factionless': return null;
        default: return { kind: q < 0.45 ? 'sedan' : q < 0.7 ? 'hatch' : 'van' };
      }
    }
    spawnCar(px, pz) {
      // a lane that passes near you, at a point well off up or down it
      const near = this.lanes.filter((l) => Math.abs(l.c - (l.axis === 'x' ? pz : px)) < 110);
      if (!near.length) return false;
      for (let tries = 0; tries < 8; tries++) {
        const lane = near[Math.floor(this.r() * near.length)];
        const along = lane.axis === 'x' ? px : pz, across = Math.abs(lane.c - (lane.axis === 'x' ? pz : px));
        const reach = Math.sqrt(Math.max(0, 150 * 150 - across * across));
        // start behind the flow so it comes towards and past you
        const s = U.clamp(along - lane.dir * (reach * (0.75 + this.r() * 0.25)), lane.s0, lane.s1);
        const x = lane.axis === 'x' ? s : lane.c, z = lane.axis === 'x' ? lane.c : s;
        const d = Math.hypot(x - px, z - pz);
        if (d < 90 || d > 175) continue;
        if (this.cars.some((c) => c.lane === lane && Math.abs(c.s - s) < 16)) continue;
        const k = this.carKind(x, z, lane);
        if (!k) continue;
        const v = DV.Vehicles.build(k.kind, { seed: Math.floor(this.r() * 997), color: k.color, stripe: k.stripe });
        v.mesh.material = v.mesh.material.clone();
        const L = this.zone.lightAt(x, z);
        v.mesh.material.color.setRGB(U.clamp(L[0] * 0.95, 0.35, 1.2), U.clamp(L[1] * 0.95, 0.35, 1.2), U.clamp(L[2] * 0.95, 0.35, 1.2));
        this.zone.group.add(v.root);
        v.root.visible = this.shown !== false;
        const top = k.kind === 'bus' ? 9 : k.kind === 'jeep' ? 12.5 : 10.5 + this.r() * 2;
        const car = { id: this.idN++, v, kind: k.kind, lane, s, x, z, hx: 0, hz: 1, speed: top * 0.8, top, honk: 0, stopped: 0, sound: null, plan: null, planJ: null, turn: null, brake: false };
        this.placeCar(car);
        this.cars.push(car);
        return true;
      }
      return false;
    }
    placeCar(c) {
      if (c.turn) {
        // round the corner: a curve from where it was on its lane, through the corner, onto the new one
        const T = c.turn, t = U.clamp(T.u / T.len, 0, 1), it = 1 - t;
        c.x = it * it * T.p0[0] + 2 * it * t * T.k[0] + t * t * T.p1[0];
        c.z = it * it * T.p0[1] + 2 * it * t * T.k[1] + t * t * T.p1[1];
        const dx = it * (T.k[0] - T.p0[0]) + t * (T.p1[0] - T.k[0]), dz = it * (T.k[1] - T.p0[1]) + t * (T.p1[1] - T.k[1]);
        const n = Math.hypot(dx, dz) || 1;
        c.hx = dx / n; c.hz = dz / n;
      } else {
        const l = c.lane;
        c.x = l.axis === 'x' ? c.s : l.c;
        c.z = l.axis === 'x' ? l.c : c.s;
        c.hx = l.axis === 'x' ? l.dir : 0; c.hz = l.axis === 'x' ? 0 : l.dir;
      }
      c.v.root.position.set(c.x, 0, c.z);
      c.v.root.rotation.y = Math.atan2(c.hx, c.hz);
    }
    // the next junction ahead of a car on its lane: { j, entry, exit, d (its front to the entry) }
    nextJunction(c) {
      const R = this.zone.roads, l = c.lane;
      if (!R) return null;
      const front = c.s + (l.dir * c.v.length) / 2;
      let best = null;
      for (const j of R.along(l.line)) {
        const a = l.axis === 'x' ? j.box[0] : j.box[1], b = l.axis === 'x' ? j.box[2] : j.box[3];
        const entry = l.dir > 0 ? a : b, d = (entry - front) * l.dir;
        if (d < -0.5) continue; // passed it (or in it)
        if (!best || d < best.d) best = { j, entry, exit: l.dir > 0 ? b : a, d };
      }
      return best;
    }
    // at the next junction: straight on, or left or right (if there's a lane to turn into)
    planTurn(c, nj) {
      const l = c.lane, j = nj.j, q = this.r();
      const want = c.kind === 'bus' || q < 0.64 ? 'straight' : q < 0.84 ? 'right' : 'left';
      if (want === 'straight') return { turn: 'straight' };
      const hx = l.axis === 'x' ? l.dir : 0, hz = l.axis === 'x' ? 0 : l.dir;
      const rx = -hz, rz = hx; // (your right, going that way)
      const nx = want === 'right' ? rx : -rx, nz = want === 'right' ? rz : -rz;
      const axis = nx ? 'x' : 'z', dir = nx || nz, line = axis === 'x' ? j.st : j.av, at = axis === 'x' ? j.x : j.z;
      const lane = (this.laneBy.get(line) || []).find((t) => t.axis === axis && t.dir === dir && at > t.s0 + 6 && at < t.s1 - 14);
      return lane ? { turn: want, lane } : { turn: 'straight' };
    }
    // into the junction: start the turn if the way's clear (otherwise carry straight on)
    beginTurn(c, nj) {
      const l = c.lane, T = c.plan.lane, j = nj.j;
      const exitS = (T.dir > 0 ? (T.axis === 'x' ? j.box[2] : j.box[3]) : T.axis === 'x' ? j.box[0] : j.box[1]) + T.dir * (c.v.length / 2 + 1.5);
      // room on the new lane, and (turning left) nothing coming the other way
      const busy = this.cars.some((o) => o !== c && o.lane === T && !o.turn && (o.s - exitS) * T.dir > -16 && (o.s - exitS) * T.dir < 9);
      const opp = c.plan.turn === 'left' && this.cars.some((o) => o !== c && o.lane.line === l.line && o.lane.dir === -l.dir && !o.turn && o.speed > 1 && Math.hypot(o.x - j.x, o.z - j.z) < 34);
      if (busy || opp) { c.plan = { turn: 'straight' }; return; }
      const k = l.axis === 'x' ? [T.c, l.c] : [l.c, T.c];
      const p0 = [c.x, c.z], p1 = T.axis === 'x' ? [exitS, T.c] : [T.c, exitS];
      let len = 0, prev = p0;
      for (let i = 1; i <= 8; i++) {
        const t = i / 8, it = 1 - t, q = [it * it * p0[0] + 2 * it * t * k[0] + t * t * p1[0], it * it * p0[1] + 2 * it * t * k[1] + t * t * p1[1]];
        len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q;
      }
      c.turn = { p0, k, p1, len, u: 0, lane: T, endS: exitS, vmax: c.plan.turn === 'right' ? 5 : 6.5, side: c.plan.turn };
    }
    releaseCar(c) {
      if (c.v.root.parent) c.v.root.parent.remove(c.v.root);
      c.v.mesh.material.dispose();
      if (c.sound) { c.sound.stop(); c.sound = null; }
    }
    updateCars(dt, px, pz) {
      const P = DV.Player, R = this.zone.roads;
      for (let i = this.cars.length - 1; i >= 0; i--) {
        const c = this.cars[i], l = c.lane;
        const d = Math.hypot(c.x - px, c.z - pz);
        if (d > CAR_FAR || (!c.turn && (l.dir > 0 ? c.s > l.s1 : c.s < l.s0))) { this.releaseCar(c); this.cars.splice(i, 1); continue; }
        // what's ahead of it: you, someone crossing, the car in front (or one turning across)
        const hw = c.v.width / 2 + 0.55, look = c.v.length / 2 + 4 + c.speed * 1.3;
        let want = c.turn ? c.turn.vmax : c.top, forPlayer = false, held = false;
        const ahead = (x, z) => { const dx = x - c.x, dz = z - c.z, a = dx * c.hx + dz * c.hz, b = Math.abs(dx * c.hz - dz * c.hx); return b < hw ? a : -1; };
        const ap = ahead(P.x, P.z);
        if (ap > 0 && ap < look) { want = ap < c.v.length / 2 + 2.5 ? 0 : Math.min(want, (ap - c.v.length / 2 - 2.5) * 1.2); forPlayer = true; }
        for (const p of this.peds) { const a = ahead(p.x, p.z); if (a > 0 && a < look) want = Math.min(want, a < c.v.length / 2 + 2.5 ? 0 : (a - c.v.length / 2 - 2.5) * 1.2); }
        for (const o of this.cars) {
          if (o === c) continue;
          const a = ahead(o.x, o.z);
          if (a <= 0 || a > look + o.v.length) continue;
          // two that see each other (crossing paths): the older one goes first
          if (c.id < o.id && (c.x - o.x) * o.hx + (c.z - o.z) * o.hz > 0 && Math.abs((c.x - o.x) * o.hz - (c.z - o.z) * o.hx) < o.v.width / 2 + 0.55) continue;
          const gap = a - (o.v.length + c.v.length) / 2;
          if (gap < 6 + c.speed * 1.4) want = Math.min(want, gap < 2.6 ? 0 : o.speed + (gap - 2.6) * 0.6);
        }
        // the junction coming up: its lights, and what it'll do there
        if (!c.turn && R) {
          const nj = this.nextJunction(c);
          if (nj) {
            if (c.planJ !== nj.j) { c.planJ = nj.j; c.plan = this.planTurn(c, nj); }
            const light = R.light(nj.j, l.axis), stopD = nj.d - DV.Roads.CW - DV.Roads.STOP;
            if (light && light !== 'g' && stopD > -0.4) {
              // red: stop at the line; amber: stop if it can do it without slamming the brakes
              if (light === 'r' || stopD > (c.speed * c.speed) / 9) { want = Math.min(want, stopD < 0.3 ? 0 : Math.sqrt(2 * 3.2 * (stopD - 0.3))); held = stopD < 12; }
            } else if (!light && nj.d < 14) want = Math.min(want, 6.5); // a dead junction: slow down and look
            if (c.plan.turn !== 'straight' && nj.d < 26) want = Math.min(want, c.plan.turn === 'right' ? 5.5 : 7);
            if (c.plan.turn !== 'straight' && nj.d <= 0.3 && !held) this.beginTurn(c, nj);
          }
        }
        const was = c.speed;
        c.speed += U.clamp(want - c.speed, -6 * dt, 2.2 * dt);
        if (c.speed < 0.05) c.speed = 0;
        c.brake = c.speed < was - 0.4 * dt || (c.speed < 0.2 && want < 0.2);
        if (c.turn) {
          c.turn.u += c.speed * dt;
          if (c.turn.u >= c.turn.len) { c.lane = c.turn.lane; c.s = c.turn.endS; c.turn = null; c.planJ = null; c.plan = null; }
        } else c.s += l.dir * c.speed * dt;
        this.placeCar(c);
        // stood there in front of it? it'll let you know
        if (forPlayer && c.speed < 0.3) { c.stopped += dt; c.honk -= dt; if (c.stopped > 2.2 && c.honk <= 0) { DV.Audio.play('carhorn', { x: c.x, z: c.z, range: 60, big: c.kind === 'bus' }); c.honk = 5 + this.r() * 3; } }
        else c.stopped = 0;
        // its engine, while it's near
        if (DV.Audio && DV.Audio.ready) {
          if (!c.sound && d < 60 && this.cars.filter((q) => q.sound).length < 5) c.sound = DV.Audio.mover(c.kind === 'bus' ? 'bus' : 'engine');
          if (c.sound && d > 75) { c.sound.stop(); c.sound = null; }
          if (c.sound) c.sound.update(c.x, c.z, c.speed);
        }
      }
      this.updateLamps();
    }
    // tail and brake lights, indicators before and through a turn, headlights after dark
    updateLamps() {
      const g = this.lamps.geometry, pos = g.attributes.position.array, col = g.attributes.color.array;
      col.fill(0);
      const night = DV.StreetKit.lampsLevel ? DV.StreetKit.lampsLevel() : 0;
      const blink = Math.floor(performance.now() / 380) % 2 === 0;
      this.lamps.visible = this.shown !== false;
      this.cars.forEach((c, i) => {
        if (i >= MAX_CARS) return;
        const rx = -c.hz, rz = c.hx, L = c.v.length / 2 + 0.03, Wd = c.v.width / 2 - 0.22;
        const side = c.turn ? c.turn.side : c.plan && c.plan.turn !== 'straight' && c.planJ && Math.hypot(c.planJ.x - c.x, c.planJ.z - c.z) < 34 ? c.plan.turn : null;
        // [x across (+ right), along (+ front), height, colour]
        const pts = [
          [Wd, -L, 0.82, side === 'right' && blink ? [1, 0.55, 0.05] : c.brake ? [1, 0.08, 0.04] : [0.42 * night, 0.03 * night, 0.02 * night]],
          [-Wd, -L, 0.82, side === 'left' && blink ? [1, 0.55, 0.05] : c.brake ? [1, 0.08, 0.04] : [0.42 * night, 0.03 * night, 0.02 * night]],
          [Wd, L, 0.72, side === 'right' && blink ? [1, 0.55, 0.05] : [0.85 * night, 0.8 * night, 0.55 * night]],
          [-Wd, L, 0.72, side === 'left' && blink ? [1, 0.55, 0.05] : [0.85 * night, 0.8 * night, 0.55 * night]],
        ];
        pts.forEach(([a, b, y, cc], k) => {
          const o = (i * 6 + k) * 3;
          pos[o] = c.x + rx * a + c.hx * b; pos[o + 1] = y; pos[o + 2] = c.z + rz * a + c.hz * b;
          col[o] = cc[0]; col[o + 1] = cc[1]; col[o + 2] = cc[2];
        });
      });
      g.attributes.position.needsUpdate = true;
      g.attributes.color.needsUpdate = true;
    }
    // you can't walk through a car: push the player out of any that overlap
    pushPlayer() {
      const P = DV.Player, R = 0.32;
      for (const c of this.cars) {
        const ax = Math.abs(c.hx), az = Math.abs(c.hz);
        const ex = (ax * c.v.length + az * c.v.width) / 2 + R, ez = (az * c.v.length + ax * c.v.width) / 2 + R;
        const dx = P.x - c.x, dz = P.z - c.z;
        if (Math.abs(dx) >= ex || Math.abs(dz) >= ez) continue;
        const ox = ex - Math.abs(dx), oz = ez - Math.abs(dz);
        if (ox < oz) P.x += Math.sign(dx || 1) * ox; else P.z += Math.sign(dz || 1) * oz;
        P.syncModel && P.syncModel();
      }
    }

    // could you see the street from where you are? (outdoors, or in the lobby looking out
    // through its glass doors); deep inside the building nobody's drawn
    exposed() {
      const room = this.zone.roomAt(DV.Player.x, DV.Player.z);
      return !room || !!room.exterior || room.id === 'lobby';
    }
    show(v) {
      if (this.shown === v) return;
      this.shown = v;
      for (const p of this.peds) p.model.root.visible = v;
      for (const c of this.cars) c.v.root.visible = v;
      if (this.lamps) this.lamps.visible = v;
      if (this.kit) this.kit.hidden = !v;
    }

    /* ---- every frame ---- */
    update(dt) {
      if (!this.awake) this.wake();
      const P = DV.Player, px = P.x, pz = P.z;
      if (this.zone.roads) this.zone.roads.update(dt);
      // (the dev menu can empty the streets: people and traffic, not the furniture)
      if (DV.Dev && DV.Dev.on() && DV.Dev.flags.noStreet) {
        for (const p of this.peds) p.model.root.visible = false;
        for (const c of this.cars) { c.v.root.visible = false; if (c.sound) { c.sound.stop(); c.sound = null; } }
        if (this.lamps) this.lamps.visible = false;
        this.shown = null;
        return;
      }
      this.show(this.exposed());
      // a jump (a loaded game, a scene that moved you): start the streets round you afresh
      if (this.last && Math.hypot(px - this.last[0], pz - this.last[1]) > 40) this.first = true;
      this.last = [px, pz];
      const cam = DV.Game && DV.Game.camera;
      this.barkT -= dt;
      // crossing into a sector: say so, and remember you've been (the world map shows where)
      const here = DV.CityMap.district(px, pz);
      const did = here.marsh ? 'marsh' : here.d && here.k > 0.22 ? here.d.id : this.distId && here.d && here.d.id === this.distId && here.k > 0.1 ? this.distId : null;
      if (did !== this.distId) {
        const was = this.distId;
        this.distId = did;
        if (did && was !== undefined && this.exposed() && !this.zone.roomAt(px, pz)) DV.UI.notify(did === 'marsh' ? 'The Marsh' : here.d.name, 'info');
        if (did) { const w = DV.State.data.world; (w.visited || (w.visited = {}))[did] = true; }
      }
      const busy = this.busy(px, pz);
      const wantPeds = Math.round(MAX_PEDS * busy), wantCars = Math.round(MAX_CARS * busy * (DV.CityMap.district(px, pz).d && DV.CityMap.district(px, pz).d.id === 'factionless' ? 0.2 : 1));
      // fill up: the first time all at once (scattered round you), then one at a time, out of sight
      this.pedT -= dt; this.carT -= dt;
      if (this.first) { for (let k = 0; k < wantPeds * 2 && this.peds.length < wantPeds; k++) this.spawnPed(px, pz, true); this.first = false; }
      else if (this.peds.length < wantPeds && this.pedT <= 0) { this.spawnPed(px, pz, false); this.pedT = 0.35; }
      if (this.cars.length < wantCars && this.carT <= 0) { this.spawnCar(px, pz); this.carT = 1.2 + this.r() * 2; }
      this.updatePeds(dt, px, pz, cam);
      this.updateCars(dt, px, pz);
      this.pushPlayer();
    }
    // people you can bump into (the player's collision)
    bodies(px, pz, r) {
      const out = [];
      if (this.shown === null) return out; // (emptied by the dev menu)
      for (const p of this.peds) if (Math.abs(p.x - px) < r && Math.abs(p.z - pz) < r) out.push({ x: p.x, z: p.z, r: 0.28 });
      return out;
    }
    barkSources() {
      const now = performance.now();
      return this.peds.filter((p) => p.bark && p.bark.until > now);
    }
    // leaving the zone: engines off (people and cars stay where they are)
    sleep() {
      this.awake = false;
      for (const c of this.cars) if (c.sound) { c.sound.stop(); c.sound = null; }
    }
    wake() { this.awake = true; }
    stats() { return { peds: this.peds.length, cars: this.cars.length, models: this.pool.length, nodes: this.walk.nodes.length, edges: this.walk.edges.length, crossings: this.walk.edges.filter((e) => e.cross).length, lanes: this.lanes.length }; }
  }

  DV.StreetLife = {
    current: null,
    LINES,
    attach(zone, city, kit) {
      const life = new Life(zone, city, kit);
      zone.streetLife = life;
      return life;
    },
    // for the HUD's overhead lines and the player's collisions: whichever zone you're in
    active() {
      const z = DV.World.current;
      return z && z.streetLife ? z.streetLife : null;
    },
  };
})();
