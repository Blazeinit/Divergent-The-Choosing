/* ==========================================================================
   DIVERGENT — the city's people, and their days
   The street life (js/game/streetlife.js) is strangers passing; these are
   the people who live here. A few hundred of them, every one with a name, a
   faction, a front door in that faction's sector, a job, and a day that runs
   by the clock: up at six, out to work (on foot, or by the Circle Line when
   it's far), lunch on a bench or at a stall or in the bread line, an errand
   on the way home, the evening their own faction's way (Candor arguing on a
   corner, Erudite reading on a bench, the factionless round a fire, the
   Dauntless at the bar long after the others have gone in), and home before
   the curfew at nine. The Dauntless keep their own hours.

   Each person's day is planned at dawn, from the day itself, so where anyone
   is at any minute is a matter of looking it up: wait an hour (T), load a
   game, jump the clock, and everyone is where they should be. Only the ones
   near you, out of doors, are drawn (and walked properly: along the
   pavements, round you, waiting for the white man at the crossings); the
   rest are a line in a timetable.

   They notice things. They look at you, say hello the way their faction
   does, step out of your way, and remember you: help one carry a crate and
   they'll thank you next time; knock one flat running and they won't forget
   it (DV.Reputation hears about both). The factionless keep out of the
   Order's way; Candor tell the patrols what they think of them. A fight
   draws a crowd, people out of the shops included; a siren hurries everyone
   along; rain sends them in.

     DV.Lives.attach(zone, city, life)    the city (js/zones/testingCenter.js)
     DV.Lives.active()                     the one where you are
     lives.event(kind, x, z, o)            'fight' | 'stop' (a crowd), 'siren' (hurry)
     lives.where(p, day, m)                QA: { seg, tag, x, z, vis }
     lives.census(m)                       QA: how many where, by tag
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // how many of each faction live in the city (the Amity mostly on the farms, in on the truck)
  const POP = { abnegation: 80, erudite: 72, candor: 66, dauntless: 64, factionless: 62, amity: 36 };
  const DRAW_R = 70, KEEP_R = 78, PATH_R = 170, MAX_DRAWN = 22, MODEL_CAP = 40;
  const DAY0 = 300; // a day's plan runs from 05:00 to 05:00 the next morning
  const IN_BY = 20 * 60 + 52; // everyone but the Dauntless is in by then (the curfew's at nine)
  const LATE = 25 * 60; // the Dauntless are in by one
  const ROLES = {
    abnegation: { home: 8, shop: 1, work: 1 },
    erudite: { home: 5, work: 3, shop: 1, cafe: 1 },
    candor: { home: 5, work: 3, shop: 1, bar: 1 },
    dauntless: { home: 5, depot: 2, bar: 2, work: 1 },
    factionless: { home: 7, depot: 2 },
    downtown: { work: 5, shop: 3, cafe: 2, bar: 1 },
    testing: { work: 3, shop: 3, cafe: 1 },
  };
  const FNAME = { abnegation: 'Abnegation', erudite: 'Erudite', candor: 'Candor', amity: 'Amity', dauntless: 'Dauntless', factionless: 'Factionless' };

  /* ---------------- what they say ---------------- */
  const pick = (r, l) => l[Math.floor(r() * l.length)];
  const GREET = {
    abnegation: ['Good {tod}.', 'Hello. Mind how you go.', '{tod}.'],
    erudite: ['Hm. Good {tod}.', 'Hello.', '...Hello.'],
    candor: ['Hey. You look tired.', 'Hello. You\'re staring.', 'Afternoon. Or whatever it is.'],
    amity: ['Hello there!', 'Good {tod}, love.', 'Oh — hello!'],
    dauntless: ['Hey.', 'What.', '...'],
    factionless: ['...', 'Spare anything?', 'Hey.'],
  };
  const WARM = {
    abnegation: ['It\'s you. Thank you again for the other day.', 'You helped me. I haven\'t forgotten.'],
    erudite: ['Ah. The helpful one.', 'You again. Good.'],
    candor: ['You helped me. I don\'t say thank you much, so: thank you.', 'Oh, it\'s you. You\'re all right.'],
    amity: ['My friend! Come here.', 'There you are. You\'re a kind one.'],
    dauntless: ['Hey. You\'re all right.', 'Look who it is.'],
    factionless: ['You. You\'re one of the decent ones.', 'Thanks again. For before.'],
  };
  const COLD = {
    abnegation: ['Please — keep your distance.', 'I\'d rather you didn\'t.'],
    erudite: ['You. Statistically, you\'re a hazard.', 'Keep walking.'],
    candor: ['You knocked me flat. Don\'t pretend you didn\'t.', 'You\'ve got some nerve.'],
    amity: ['Oh. It\'s you.', 'I forgive you. I\'m still crossing the street.'],
    dauntless: ['Try that again. See what happens.', 'You\'re lucky I let it go.'],
    factionless: ['Get away from me.', 'I know your face now.'],
  };
  const DISTRUST = {
    abnegation: ['People are saying things about you. I\'m sure they\'re not true.', 'Excuse me. I have to go.'],
    erudite: ['I\'ve read about you. Nothing good.', 'No. Not today.'],
    candor: ['I\'ve heard what you did. Everyone has.', 'You\'ve got a reputation. Not a good one.'],
    amity: ['I\'m sure you mean well. I\'m going to go now.', 'Peace. From over there.'],
    dauntless: ['You\'ve got a name round here. Not a good one.', 'Walk on.'],
    factionless: ['You\'re the sort they warn us about.', '...'],
  };
  const LATE_LINES = {
    abnegation: ['It\'s nearly nine. You should be home too.', 'The siren goes soon. Hurry home.'],
    erudite: ['Curfew in a few minutes. I\'d mind the drones.', 'It\'s late. The patrols log everyone.'],
    candor: ['It\'s nearly nine. Go home. I\'m serious.', 'You\'ll be stopped, out at this hour.'],
    amity: ['It\'s getting late, love. Off home with you.', 'The last truck\'s gone. Mind yourself.'],
    dauntless: ['Curfew\'s for other people.', 'Out late? Good.'],
    factionless: ['They\'ll be out with the lights soon.', 'Get indoors. They come round after nine.'],
  };
  const TAG_LINES = {
    commute: ['On my way to {to}.', 'Can\'t stop. {to}.', 'Late for {to}. Again.'],
    homeward: ['Home. It\'s been a long day.', 'I\'m done for today.', 'Off home, before the siren.'],
    lunch: ['My lunch. Such as it is.', 'Twenty minutes to myself. Please.', 'Lunch. Finally.'],
    errand: ['Just picking something up.', 'One more thing, then home.', 'The queue was round the block.'],
    social: ['This is the best part of the day.', 'We come here most evenings.', 'Don\'t mind us.'],
  };
  const JOB_LINES = {
    hall: ['The council sits at ten. Someone has to set out the chairs.', 'There are forms for everything. Even for kindness.'],
    sweep: ['Somebody has to. It might as well be me.', 'Mind the dust, sorry.'],
    bread: ['There\'s enough for everyone. Take what you need.', 'Pass it down the line, would you?'],
    office: ['Ledgers. All day. Don\'t ask.', 'Back to my desk.'],
    shop: ['We\'re open till five. Come by.', 'Mind the step, it\'s loose.'],
    hq_erudite: ['Headquarters. Floor nine. Don\'t ask about floor ten.', 'The data won\'t analyse itself.'],
    hq_candor: ['The Mart. Hearings all afternoon.', 'Nine hours of other people telling the truth. Exhausting.'],
    papers: ['The Candor Daily. Every word of it true.', 'Paper? It won\'t lie to you.'],
    watch: ['Move along.', 'Quiet street. Let\'s keep it that way.', 'Nothing to see. Go on.'],
    compound: ['Back to the Pit. Shift starts at eight.', 'You don\'t want to know what we do down there.'],
    depot: ['Crates to the train. Crates off the train. Crates.', 'Shift at the depot. Heavy work.'],
    order: ['Order duty. Erudite\'s rules, our boots.', 'Station shift. Long one.'],
    haul: ['Somebody\'s got to carry it.', 'Don\'t mind me. It\'s heavy.'],
    scavenge: ['You\'d be surprised what they throw out.', 'Keep walking. Nothing here for you.'],
    none: ['Nowhere to be. That\'s the trouble.', 'They don\'t give us much to do.'],
    fruit: ['Apples from the orchards this morning!', 'Amity grows enough for everyone.'],
    farm: ['The truck goes back at sundown.'],
  };
  const SHOVED = {
    abnegation: ['Oh! I— that\'s all right.', 'Careful!'],
    erudite: ['Watch where you\'re going!', 'Do you mind?'],
    candor: ['Hey! Watch it!', 'You did that on purpose.'],
    amity: ['Ow! Oh — are you all right?', 'Goodness!'],
    dauntless: ['Hey! You want a fight?', 'Watch it.'],
    factionless: ['Hey!', 'Typical.'],
  };
  const CROWD = {
    fight: {
      abnegation: ['Someone stop them!', 'Please — that\'s enough!'], erudite: ['Somebody fetch the Order.', 'Fascinating. Appalling, but fascinating.'],
      candor: ['He started it! I saw!', 'Oh, hit him back!'], amity: ['Stop it, both of you!', 'Please, please stop!'],
      dauntless: ['Go on! Hit him!', 'Ha! Get up!'], factionless: ['...', 'Here we go.'],
    },
    stop: {
      abnegation: ['What did they do?', 'Leave them be.'], erudite: ['A routine stop. Probably.', 'They\'ll want names.'],
      candor: ['They\'ve done nothing wrong!', 'Ask them why. Go on.'], amity: ['Oh dear.', 'I hope they\'re all right.'],
      dauntless: ['Order business. Move along.', 'Ha. Rather them than me.'], factionless: ['Don\'t look. Keep walking.', '...'],
    },
  };
  const ARGUE = ['I\'ve done nothing wrong and you know it.', 'Write that down too, then.', 'Ask me anything. I\'ll tell you the truth. Will you?', 'Who gave the order? Say it.'];
  const SIREN = ['That\'s the siren.', 'Home. Now.', 'Hurry up — that\'s for us.', 'Come on.'];

  /* ---------------- a binary heap for the route search ---------------- */
  class Heap {
    constructor() { this.k = []; this.v = []; }
    push(key, val) {
      const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
      while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
      k[i] = key; v[i] = val;
    }
    pop() {
      const k = this.k, v = this.v, top = v[0], lk = k.pop(), lv = v.pop(), n = k.length;
      if (n) {
        let i = 0;
        for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; }
        k[i] = lk; v[i] = lv;
      }
      return top;
    }
    get size() { return this.k.length; }
  }

  class Lives {
    constructor(zone, city, life) {
      this.zone = zone; this.city = city; this.life = life;
      this.W = life.walk; this.kit = life.kit;
      this.r = U.rng(2024);
      this.agents = new Map(); // id → the drawn ones
      this.models = new Map(); // id → a model kept from the last time (the nearest few)
      this.events = [];
      this.barkT = 0; this.tick = 0; this.lastTotal = null; this.t = 0; // (t: game seconds, for what's going on in the street)
      this.routes = new Map();
      this.plans = new Map(); // day → planned?
      this.stats = { routes: 0, planned: 0, gathered: 0, shoved: 0, helped: 0, argued: 0, hid: 0, metro: {} };
      const n = this.W.nodes.length;
      this.g = new Float64Array(n); this.seen = new Int32Array(n); this.prevN = new Int32Array(n); this.prevE = new Int32Array(n); this.stamp = 0;
      this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
      this.places();
      this.people();
      // the glow over their fires (one draw for them all)
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3));
      this.glow = new THREE.Points(lg, new THREE.PointsMaterial({ size: 2.6, color: 0xff9a40, map: DV.StreetKit.glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true }));
      this.glow.frustumCulled = false; this.glow.visible = false; this.glow.name = 'lives_fires';
      zone.group.add(this.glow);
      DV.Events.on('city:siren', (o) => { if (DV.World.current === this.zone) this.event('siren', DV.Player.x, DV.Player.z, o || {}); });
    }

    /* ================================================================ the places */
    // street furniture already placed along the kerbs (data: it's built in chunks later)
    furn(x, z, r) {
      const K = this.kit, seen = new Set();
      for (const [ox, oz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
        // (looked up, not made: an empty chunk would be built and drawn)
        const c = K.chunks.get(Math.floor((x + ox) / 96) * 100003 + Math.floor((z + oz) / 96));
        if (!c || seen.has(c)) continue;
        seen.add(c);
        for (const it of c.items) {
          const big = it.name === 'bench' || it.name === 'bikerack' || it.name === 'bollards' ? 1.5 : it.name === 'planter' || it.name === 'phonebooth' ? 0.8 : 0.4;
          if (Math.abs(it.x - x) < r + big && Math.abs(it.z - z) < r + big && Math.hypot(it.x - x, it.z - z) < r + big) return true;
        }
      }
      return false;
    }
    solid(x, z, r) { return this.kit.blocked(x, z, r) || this.zone.colliders.blocked(x, z, r, 'npc'); }
    onRoad(x, z, pad) { return DV.CityMap.roadNet().onRoad(x, z, pad || 0); }
    // the nearest stretch of pavement to (x, z), and where on it: { edge, t, x, z }
    nearestLine(x, z, r) {
      const W = this.W;
      let best = null, bd = r || 6;
      for (const ei of W.edgesNear(x, z, r || 6)) {
        const e = W.edges[ei];
        if (e.cross) continue;
        const A = W.nodes[e.a], B = W.nodes[e.b], ux = (B.x - A.x) / e.len, uz = (B.z - A.z) / e.len;
        const t = U.clamp((x - A.x) * ux + (z - A.z) * uz, 0.2, e.len - 0.2), qx = A.x + ux * t, qz = A.z + uz * t, d = Math.hypot(qx - x, qz - z);
        if (d < bd) { bd = d; best = { edge: ei, t, x: qx, z: qz }; }
      }
      return best;
    }
    // whose part of the city this is: the sector it's nearest the heart of (a sector's housing runs on a
    // little past where its look fades out), or just the city ('testing': shops and offices)
    districtOf(x, z) {
      const CM = DV.CityMap, dd = CM.district(x, z);
      if (dd.farm || dd.marsh) return null;
      let best = 'testing', bk = 1.35;
      for (const d of CM.districts) { const k = Math.hypot(x - d.c[0], z - d.c[1]) / d.r; if (k < bk) { bk = k; best = d.id; } }
      return best;
    }
    streetName(x, z) {
      const s = DV.CityMap.streetAt(x, z);
      return (s.ns || s.ew) ? (s.ns || s.ew).name : 'the street';
    }
    places() {
      const W = this.W, CM = DV.CityMap, r = U.rng(7070);
      const camp = CM.campus, clears = DV.Metro ? DV.Metro.clearRects() : [];
      const homes = Object.values(CM.homes);
      this.fronts = [];
      // the building fronts along every stretch of pavement: a door every ten metres or so
      W.edges.forEach((e, ei) => {
        if (e.cross || e.len < 7) return;
        const A = W.nodes[e.a], B = W.nodes[e.b], ux = (B.x - A.x) / e.len, uz = (B.z - A.z) / e.len;
        for (let t = 3.5; t < e.len - 3; t += 10) {
          const lx = A.x + ux * t, lz = A.z + uz * t;
          if (lx > camp[0] - 8 && lx < camp[2] + 8 && lz > camp[1] - 8 && lz < camp[3] + 12) continue; // (the Testing Center's own)
          for (const s of [1, -1]) {
            const nx = -uz * s, nz = ux * s;
            // a building on this side, a couple of metres off the line (and not on the other)
            if (!this.kit.built(lx + nx * 2.3, lz + nz * 2.3, 0.1) || this.kit.built(lx - nx * 2.3, lz - nz * 2.3, 0.1)) continue;
            let F = 0.6;
            while (F < 2.6 && !this.kit.built(lx + nx * F, lz + nz * F, 0.02)) F += 0.1;
            if (F < 1.0 || F >= 2.6) continue;
            const x = lx + nx * (F - 0.4), z = lz + nz * (F - 0.4);
            if (this.solid(x, z, 0.3) || this.furn(x, z, 0.5) || this.furn((x + lx) / 2, (z + lz) / 2, 0.4) || this.onRoad(x, z, 0.3)) continue;
            if (clears.some((q) => x > q[0] - 1.5 && x < q[2] + 1.5 && z > q[1] - 1.5 && z < q[3] + 1.5)) continue;
            if (homes.some((h) => Math.hypot(h.x - x, h.z - z) < 6)) continue;
            if (this.zone.roomAt(x, z)) continue;
            const d = this.districtOf(x, z);
            if (!d) continue;
            this.fronts.push({ id: 'f' + this.fronts.length, x, z, lx, lz, edge: ei, t, ux, uz, nx, nz, F, d, lm: null, role: null, street: this.streetName(lx, lz) });
            break;
          }
        }
      });
      // the headquarters stand back from the street behind their plazas and steps: the doors nearest each
      // on the pavement are its way in
      for (const l of CM.landmarks) {
        if (!l.w || l.farm || l.id === 'hancock') continue;
        const l2 = this.fronts.filter((f) => !f.lm && Math.hypot(f.x - l.x, f.z - l.z) < Math.max(l.w, l.d) / 2 + 60).sort((a, b) => Math.hypot(a.x - l.x, a.z - l.z) - Math.hypot(b.x - l.x, b.z - l.z));
        for (const f of l2.slice(0, 3)) f.lm = l.id;
      }
      // what each one is: a home (in a faction's sector), a shop, an office, a café, a bar, a depot
      for (const f of this.fronts) {
        if (f.lm) { f.role = 'hq'; continue; }
        const w = ROLES[f.d] || ROLES.testing;
        let tot = 0; for (const k in w) tot += w[k];
        let q = r() * tot;
        for (const k in w) { q -= w[k]; if (q <= 0) { f.role = k; break; } }
      }
      const by = (fn) => this.fronts.filter(fn);
      this.homesOf = {};
      for (const f of Object.keys(POP)) {
        const sector = CM.districts.find((d) => d.faction === f);
        this.homesOf[f] = sector ? by((q) => q.role === 'home' && q.d === sector.id) : [];
      }
      // the outdoor places, spaced out along the pavements: stalls, the bread lines, fires, corners
      this.venues = [];
      const taken = (x, z, gap) => this.venues.some((v) => Math.hypot(v.x - x, v.z - z) < gap);
      const room = (f, u0, u1, v0, v1) => {
        for (let u = u0; u <= u1; u += 0.6) for (let v = v0; v <= v1; v += 0.4) {
          const x = f.lx + f.ux * u + f.nx * v, z = f.lz + f.uz * u + f.nz * v;
          if (this.solid(x, z, 0.28) || this.furn(x, z, 0.35) || this.onRoad(x, z, 0.3)) return false;
        }
        return true;
      };
      const want = [
        ['stall_fruit', ['downtown', 'testing', 'candor', 'erudite', 'abnegation'], 7, [-1.6, 1.8]],
        ['stall_papers', ['candor', 'downtown'], 4, [-1.6, 1.8]],
        ['bread', ['factionless', 'abnegation'], 3, [-6.2, 1.2]],
        ['fire', ['factionless'], 4, [-1.4, 1.4]],
        ['corner', ['candor', 'candor', 'downtown', 'dauntless', 'erudite', 'testing', 'abnegation'], 12, [-1.2, 1.2]],
      ];
      for (const [kind, where, n, [u0, u1]] of want) {
        // (shuffled with our own dice: the same city every time)
        const list = by((q) => where.includes(q.d) && q.role !== 'hq' && q.F > 1.3);
        for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
        let got = 0;
        const per = {};
        for (const f of list) {
          if (got >= n) break;
          if (kind === 'corner' && (per[f.d] || 0) >= where.filter((w) => w === f.d).length * 2) continue;
          if (taken(f.lx, f.lz, kind === 'corner' ? 45 : 60) || !room(f, u0, u1, -0.3, f.F - 0.35)) continue;
          if (DV.CityMap.landmark('order_station') && Math.hypot(f.lx - DV.CityMap.landmark('order_station').x, f.lz - DV.CityMap.landmark('order_station').z) < 45) continue;
          this.venues.push(this.venue(kind, f, this.venues.length));
          f.role = 'venue';
          per[f.d] = (per[f.d] || 0) + 1;
          got++;
        }
      }
      // the benches the street furniture put out (two to a bench)
      this.seats = [];
      for (const c of this.kit.chunks.values()) for (const it of c.items) {
        if (it.name !== 'bench') continue;
        const fx = Math.sin(it.rot), fz = Math.cos(it.rot), ax = Math.cos(it.rot), az = -Math.sin(it.rot);
        const ln = this.nearestLine(it.x + fx * 0.95, it.z + fz * 0.95, 2.5);
        if (!ln) continue;
        const d = this.districtOf(it.x, it.z);
        if (!d || (it.x > camp[0] - 8 && it.x < camp[2] + 8 && it.z > camp[1] - 8 && it.z < camp[3] + 12)) continue;
        for (const s of [-0.45, 0.45]) {
          this.seats.push({ id: 'b' + this.seats.length, kind: 'bench', x: it.x + ax * s + fx * 0.12, z: it.z + az * s + fz * 0.12, rot: it.rot, act: 'sit', seatY: 0.45, indoor: false, lx: ln.x, lz: ln.z, edge: ln.edge, t: ln.t, d, busy: {}, name: 'a bench on ' + this.streetName(it.x, it.z) });
        }
      }
      // the Circle Line's entrances (in and out: down the steps, the train, up the steps elsewhere)
      this.stations = (DV.Metro ? DV.Metro.STATIONS : []).map((S, i) => {
        const f = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[S.face];
        const ln = this.nearestLine(S.x + f[0] * 1.6, S.z + f[1] * 1.6, 14);
        return ln ? { id: 'st:' + S.id, kind: 'metro', i, S, x: S.x + f[0] * 0.3, z: S.z + f[1] * 0.3, lx: ln.x, lz: ln.z, edge: ln.edge, t: ln.t, indoor: true, name: S.name + ' station' } : null;
      }).filter(Boolean);
      // the Amity truck at the end of Madison Street: in from the farms in the morning, back at sundown
      const ta = CM.homes.amity, tl = this.nearestLine(ta.x + 2, ta.z, 12);
      this.truck = tl ? { id: 'truck', kind: 'truck', x: tl.x, z: tl.z, lx: tl.x, lz: tl.z, edge: tl.edge, t: tl.t, indoor: true, away: true, name: 'the farms' } : null;
      this.farms = { id: 'farms', kind: 'farms', x: -720, z: 420, lx: -720, lz: 420, edge: -1, indoor: true, away: true, name: 'the farms' };
      // (lookups by 64 m cell)
      this.grid = new Map();
      const put = (q, kind) => { const k = kind + ':' + Math.floor(q.lx / 64) + ':' + Math.floor(q.lz / 64); if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(q); };
      for (const f of this.fronts) put(f, f.role);
      for (const s of this.seats) put(s, 'seat');
      for (const v of this.venues) put(v, v.kind);
    }
    // places of a kind near (x, z), nearest first
    near(kind, x, z, r) {
      const out = [];
      for (let i = Math.floor((x - r) / 64); i <= Math.floor((x + r) / 64); i++) for (let j = Math.floor((z - r) / 64); j <= Math.floor((z + r) / 64); j++) {
        const l = this.grid.get(kind + ':' + i + ':' + j);
        if (l) for (const q of l) { const d = Math.hypot(q.lx - x, q.lz - z); if (d < r) out.push([d, q]); }
      }
      return out.sort((a, b) => a[0] - b[0]).map((q) => q[1]);
    }
    // a front as somewhere to go in (indoors) or to stand by (its wall, the pavement in front)
    inside(f) {
      if (!f.place) {
        const lm = f.lm && DV.CityMap.landmark(f.lm);
        const what = { home: 'home', shop: 'a shop on ' + f.street, work: 'an office on ' + f.street, cafe: 'a café on ' + f.street, bar: 'a bar on ' + f.street, depot: 'the depot on ' + f.street };
        f.place = { id: f.id, kind: f.role, x: f.x, z: f.z, lx: f.lx, lz: f.lz, edge: f.edge, t: f.t, indoor: true, name: lm ? lm.name : what[f.role] || f.street, front: f };
      }
      return f.place;
    }
    spot(f, tag, v, rot, act) {
      f.spots = f.spots || {};
      if (!f.spots[tag]) {
        let x = f.lx + f.nx * v, z = f.lz + f.nz * v;
        if (this.solid(x, z, 0.3) || this.furn(x, z, 0.3)) { x = f.x; z = f.z; }
        f.spots[tag] = { id: f.id + ':' + tag, kind: 'spot', x, z, rot, act, lx: f.lx, lz: f.lz, edge: f.edge, t: f.t, indoor: false, name: f.street, front: f };
      }
      return f.spots[tag];
    }
    // an outdoor place with room for people in it (u along the pavement, v towards the buildings)
    venue(kind, f, n) {
      const F = f.F, toStreet = Math.atan2(-f.nx, -f.nz), toWall = Math.atan2(f.nx, f.nz), along = Math.atan2(f.ux, f.uz), back = Math.atan2(-f.ux, -f.uz);
      const V = { id: 'v' + n, kind, x: f.lx, z: f.lz, lx: f.lx, lz: f.lz, f, d: f.d, slots: { vendor: [], other: [] }, props: [], mesh: null, solid: [], hours: [0, 0], name: f.street };
      const at = (u, v) => [f.lx + f.ux * u + f.nx * v, f.lz + f.uz * u + f.nz * v];
      const slot = (role, u, v, rot, act, o) => {
        const [x, z] = at(u, Math.min(v, F - 0.32));
        V.slots[role].push(Object.assign({ id: V.id + ':' + role + V.slots[role].length, kind: 'slot', venue: V, x, z, rot, act, lx: f.lx, lz: f.lz, edge: f.edge, t: f.t, indoor: false, busy: {}, name: V.name }, o || {}));
      };
      const prop = (k, u, v, rot, o) => { const [x, z] = at(u, v); V.props.push({ k, x, z, rot, o }); };
      switch (kind) {
        case 'stall_fruit': case 'stall_papers': {
          const fruit = kind === 'stall_fruit';
          prop('stall', 0, F - 0.95, toStreet, fruit ? { goods: 'fruit', cloth: [0.72, 0.18, 0.12] } : { goods: 'papers', cloth: [0.12, 0.12, 0.12], sign: [0.92, 0.92, 0.88] });
          slot('vendor', -0.45, F - 0.3, toStreet, fruit ? 'give' : 'point');
          slot('vendor', 0.55, F - 0.3, toStreet, 'idle');
          slot('other', -0.4, F - 1.85, toWall, fruit ? 'idle' : 'read');
          slot('other', 0.6, F - 1.85, toWall, 'idle');
          slot('other', 1.4, F - 1.95, toWall + 0.3, 'idle');
          V.hours = [7, 18.5];
          V.name = (fruit ? 'the fruit stall on ' : 'the newsstand on ') + f.street;
          break;
        }
        case 'bread':
          prop('crate', 0.3, F - 0.65, 0); prop('crate', 0.75, F - 0.55, 0.3);
          slot('vendor', 0, F - 1.05, back, 'give', { hold: 'loaf' });
          slot('vendor', 0.9, F - 1.2, back, 'give', { hold: 'loaf' });
          for (let k = 0; k < 7; k++) slot('other', -1.0 - k * 0.8, 0.5 + (k % 2) * 0.2, along, 'idle');
          V.hours = [9.75, 14.75];
          V.name = 'the bread line on ' + f.street;
          break;
        case 'fire':
          prop('barrel', 0, F * 0.55, 0);
          V.fire = at(0, F * 0.55);
          for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.4, u = Math.sin(a) * 0.95, v = F * 0.55 + Math.cos(a) * 0.95; if (v > -0.4) slot('other', u, v, Math.atan2(-Math.sin(a) * f.ux - Math.cos(a) * f.nx, -Math.sin(a) * f.uz - Math.cos(a) * f.nz), 'idle'); }
          V.hours = [17, 21];
          V.name = 'a fire on ' + f.street;
          break;
        case 'corner': {
          const c = F * 0.45;
          for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.3, u = Math.cos(a) * 0.7, v = c + Math.sin(a) * 0.5; slot('other', u, v, Math.atan2(-Math.cos(a) * f.ux - Math.sin(a) * f.nx, -Math.cos(a) * f.uz - Math.sin(a) * f.nz), 'idle'); }
          slot('other', 1.4, F - 0.3, toStreet, 'lean');
          V.name = 'the corner of ' + f.street;
          break;
        }
      }
      return V;
    }
    // a slot (a seat, a place in a queue) free for [t0, t1] on that day: book it
    book(slots, day, t0, t1) {
      for (const s of slots) {
        const b = s.busy[day] || (s.busy[day] = []);
        if (b.some(([a, c]) => a < t1 + 1 && c > t0 - 1)) continue;
        b.push([t0, t1]);
        return s;
      }
      return null;
    }

    /* ================================================================ the people */
    people() {
      const CM = DV.CityMap;
      this.pop = [];
      const hq = (id) => { const l = this.fronts.filter((f) => f.lm === id); return l.length ? l : null; };
      const HQ = { hall: hq('abnegation_hall'), erudite: hq('erudite_hq'), candor: hq('merciless_mart'), compound: hq('dauntless_compound'), order: hq('order_station') };
      this.hqCandor = HQ.candor ? HQ.candor[0] : null;
      for (const f of Object.keys(POP)) {
        for (let i = 0; i < POP[f]; i++) {
          const id = 'lv:' + f + ':' + i, r = U.rng(id);
          const sex = r() < 0.5 ? 'f' : 'm', age = f === 'dauntless' || f === 'factionless' ? 18 + Math.floor(r() * 40) : 18 + Math.floor(r() * 54);
          const p = { id, i: this.pop.length, f, sex, age, r, name: DV.Names.person(f, sex, 'life:' + id), seed: U.hashString(id), pace: (age > 55 ? 1.05 : 1.25) + r() * 0.28, plans: {}, lat: (r() - 0.5) * 0.7 };
          p.first = p.name.split(' ')[0];
          // home: a front door in their own sector (the Amity live on the farms)
          if (f === 'amity') p.home = this.truck || this.farms;
          else { const H = this.homesOf[f]; if (!H.length) continue; p.home = this.inside(H[Math.floor(r() * H.length)]); }
          const h = p.home;
          // work, near enough to get to (a few of them a train ride away)
          const nearest = (kind, x, z, rad, k) => { const l = this.near(kind, x, z, rad); return l.length ? l[Math.min(l.length - 1, Math.floor(r() * (k || 5)))] : null; };
          const fromHQ = (l) => (l ? l[Math.floor(r() * l.length)] : null);
          const downtown = () => { const D = CM.districts.find((d) => d.id === 'downtown'); return nearest('work', D.c[0] + (r() - 0.5) * 140, D.c[1] + (r() - 0.5) * 120, 120, 8); };
          const q = r();
          let job = { kind: 'none' };
          const J = (kind, front, o) => (front ? Object.assign({ kind, place: front.slots ? null : this.inside(front) }, o || {}) : null);
          switch (f) {
            case 'abnegation':
              job = q < 0.28 ? J('hall', fromHQ(HQ.hall)) : q < 0.46 ? { kind: 'sweep' } : q < 0.6 ? { kind: 'bread' } : q < 0.84 ? J('office', r() < 0.5 ? downtown() : nearest('work', h.lx, h.lz, 400)) : J('shop', nearest('shop', h.lx, h.lz, 300));
              break;
            case 'erudite':
              job = q < 0.5 ? J('hq_erudite', fromHQ(HQ.erudite)) : q < 0.85 ? J('office', r() < 0.7 ? downtown() : nearest('work', h.lx, h.lz, 300)) : J('shop', nearest('shop', h.lx, h.lz, 300));
              break;
            case 'candor':
              job = q < 0.4 ? J('hq_candor', fromHQ(HQ.candor)) : q < 0.7 ? J('office', r() < 0.7 ? downtown() : nearest('work', h.lx, h.lz, 300)) : q < 0.86 ? { kind: 'papers' } : J('shop', nearest('shop', h.lx, h.lz, 300));
              break;
            case 'dauntless':
              job = q < 0.34 ? { kind: 'watch', late: r() < 0.3 } : q < 0.58 ? J('compound', fromHQ(HQ.compound)) : q < 0.8 ? J('depot', nearest('depot', h.lx, h.lz, 400)) : J('order', fromHQ(HQ.order), { late: r() < 0.4 });
              break;
            case 'factionless':
              job = q < 0.34 ? J('haul', nearest('depot', h.lx, h.lz, 500)) : q < 0.76 ? { kind: 'scavenge' } : { kind: 'none' };
              break;
            case 'amity':
              job = q < 0.6 ? { kind: 'fruit' } : { kind: 'farm' };
              if (job.kind === 'farm') p.home = this.farms;
              break;
          }
          p.job = job || { kind: 'none' };
          // outdoor work: where (a stall, the bread line, a stretch of pavement to sweep, a beat to walk)
          const k = p.job.kind;
          if (k === 'papers' || k === 'fruit' || k === 'bread') {
            const kind = k === 'papers' ? 'stall_papers' : k === 'fruit' ? 'stall_fruit' : 'bread';
            const vs = this.venues.filter((v) => v.kind === kind);
            p.job.venue = vs.length ? vs[(i + Math.floor(r() * 2)) % vs.length] : null;
            if (!p.job.venue) p.job = { kind: 'none' };
            if (k === 'bread' && HQ.hall) p.job.place = this.inside(fromHQ(HQ.hall));
          }
          if (k === 'sweep' || k === 'scavenge') {
            const l = this.near('home', h.lx, h.lz, 160).concat(this.near('shop', h.lx, h.lz, 160)).filter(() => r() < 0.5).slice(0, 8);
            p.job.spots = l.map((fr) => (k === 'sweep' ? this.spot(fr, 'sweep', 0.55, Math.atan2(fr.ux, fr.uz), 'sweep') : this.spot(fr, 'pick', fr.F - 0.45, Math.atan2(fr.nx, fr.nz), 'pick')));
            if (p.job.spots.length < 3) p.job = { kind: 'none' };
          }
          if (k === 'watch') {
            const fr0 = r() < 0.5 ? h.front : (this.near('work', h.lx + (r() - 0.5) * 300, h.lz + (r() - 0.5) * 300, 140)[0] || h.front);
            const far = this.near('shop', fr0.lx, fr0.lz, 260).concat(this.near('work', fr0.lx, fr0.lz, 260)).filter((q2) => Math.hypot(q2.lx - fr0.lx, q2.lz - fr0.lz) > 120);
            if (fr0 && far.length) p.job.beat = [this.spot(fr0, 'guard', fr0.F - 0.4, Math.atan2(-fr0.nx, -fr0.nz), 'guard'), this.spot(far[Math.floor(r() * far.length)], 'guard', 1.0, 0, 'guard')];
            else p.job = J('compound', fromHQ(HQ.compound)) || { kind: 'none' };
            if (p.job.beat) { const b = p.job.beat[1]; b.rot = Math.atan2(-b.front.nx, -b.front.nz); }
          }
          if (k === 'haul' && p.job.place) {
            const dp = p.job.place;
            p.job.drops = this.near('shop', dp.lx, dp.lz, 220).concat(this.near('home', dp.lx, dp.lz, 220)).slice(0, 10).filter(() => r() < 0.6).map((fr) => this.spot(fr, 'drop', fr.F - 0.45, Math.atan2(fr.nx, fr.nz), 'give'));
            if (!p.job.drops.length) p.job = { kind: 'scavenge', spots: [] };
          }
          if (!p.job.place && !p.job.venue && !p.job.spots && !p.job.beat && p.job.kind !== 'farm') p.job = { kind: 'none' };
          if (p.job.kind === 'scavenge' && !(p.job.spots && p.job.spots.length)) p.job = { kind: 'none' };
          this.pop.push(p);
        }
      }
    }

    /* ================================================================ the plans */
    // metres a minute on foot, for someone this pace (the clock's speed sets how far a minute goes)
    mpm(p) { return (p.pace * 60) / DV.Clock.scale(); }
    walkEst(a, b) { return (Math.abs(a.lx - b.lx) + Math.abs(a.lz - b.lz)) * 1.1 + Math.hypot(a.x - a.lx, a.z - a.lz) + Math.hypot(b.x - b.lx, b.z - b.lz) + 3; }
    nearStation(q, max) { let best = null, bd = max; for (const s of this.stations) { const d = Math.hypot(s.lx - q.lx, s.lz - q.lz); if (d < bd) { bd = d; best = s; } } return best; }
    // how to get from a to b leaving at t: on foot, or (far, and the trains running) by the Circle Line
    travel(p, a, b, t, slow) {
      const mpm = this.mpm(p) * (slow || 1);
      if (a === b) return { min: 0, legs: [] };
      const direct = this.walkEst(a, b) / mpm;
      let best = { min: direct, legs: [{ k: 'walk', from: a, to: b, min: direct }] };
      if (direct > 32 && this.stations.length && !slow) {
        const sa = this.nearStation(a, 330), sb = this.nearStation(b, 330);
        if (sa && sb && sa !== sb) {
          const n = this.stations.length, d = Math.abs(sa.i - sb.i), hops = Math.min(d, n - d);
          const ride = 3 + (hops * 52 * DV.Clock.scale()) / 60;
          const w1 = this.walkEst(a, sa) / mpm, w2 = this.walkEst(sb, b) / mpm, tot = w1 + ride + w2;
          const open = t + w1 >= 5.5 * 60 && t + w1 + ride < 21 * 60;
          if (tot < direct - 8 && open) best = { min: tot, legs: [{ k: 'walk', from: a, to: sa, min: w1 }, { k: 'metro', from: sa, to: sb, min: ride }, { k: 'walk', from: sb, to: b, min: w2 }] };
        }
      }
      return best;
    }
    planFor(day) {
      if (!this.plans.has(day)) {
        this.plans.set(day, true);
        for (const p of this.pop) { p.plans[day] = this.planDay(p, day); for (const d in p.plans) if (+d < day - 1) delete p.plans[d]; }
        for (const d of [...this.plans.keys()]) if (d < day - 1) this.plans.delete(d);
        this.stats.planned++;
      }
    }
    // the day ahead for one person: [{ k: 'at' | 'walk' | 'metro', t0, t1, tag, act, place | from/to }]
    planDay(p, day) {
      const r = U.rng(p.seed + day * 7919), job = p.job, f = p.f;
      // (is it due to rain at any time from t, for dur minutes?)
      const wet = (t, dur) => { if (!DV.Weather) return false; for (let u = t - 10; u <= t + (dur || 0) + 10; u += 5) if (DV.Weather.at(day, u) > 0.2) return true; return false; };
      const limit = f === 'dauntless' ? LATE : IN_BY;
      const out = [];
      let now = DAY0, cur = { place: p.home, act: 'sleep', tag: 'home' };
      const stay = (t1) => { if (t1 > now + 0.05) out.push({ k: 'at', t0: now, t1, place: cur.place, act: cur.act, tag: cur.tag, hold: cur.hold, seatY: cur.place.seatY }); now = Math.max(now, t1); };
      const cost = (a, b, slow) => this.travel(p, a, b, now, slow).min;
      // go somewhere, to be there by `by` (or as soon as can be): leave in good time
      const go = (to, by, o) => {
        o = o || {};
        const tr = this.travel(p, cur.place, to, now, o.slow);
        stay(Math.max(now, (by || now) - tr.min));
        let t = now;
        const tag = o.walkTag || (to === p.home ? 'homeward' : 'commute');
        for (const l of tr.legs) {
          out.push({ k: l.k, t0: t, t1: t + l.min, from: l.from, to: l.to, tag, act: l.k === 'walk' ? o.walkAct || 'idle' : 'idle', hold: o.walkHold });
          t += l.min;
        }
        now = t;
        cur = { place: to, act: o.act || to.act || 'idle', tag: o.tag || 'work', hold: o.hold || to.hold };
      };
      // is there time for this (and still be home in time)?
      const fits = (to, dur, by) => Math.max(now + cost(cur.place, to), by || 0) + dur + cost(to, p.home) <= limit;
      // something on the way: a seat on a bench, a place at a stall or in the bread line, a café
      const outing = (tag, near, t, dur, kinds) => {
        for (const k of kinds) {
          let to = null;
          if (k === 'seat') { if (wet(t, dur + 30) || t > 19.25 * 60) continue; const l = this.near('seat', near.lx, near.lz, 220); for (const s of l.slice(0, 6)) { const arr = Math.max(now + cost(cur.place, s), t); to = this.book([s], day, arr, arr + dur); if (to) break; } }
          else if (k === 'stall' || k === 'bread' || k === 'fire' || k === 'corner') {
            if (wet(t, dur + 30) && k !== 'bread') continue;
            const vk = k === 'stall' ? (r() < 0.6 ? 'stall_fruit' : 'stall_papers') : k;
            const vs = this.near(vk, near.lx, near.lz, k === 'bread' ? 450 : 300).filter((v) => t / 60 >= v.hours[0] && t / 60 < (v.hours[1] || 24) || !v.hours[1]);
            for (const v of vs.slice(0, 3)) { const arr = Math.max(now + cost(cur.place, v.slots.other[0]), t); to = this.book(v.slots.other, day, arr, arr + dur); if (to) break; }
          } else if (k === 'neighbour') {
            // (a visit: someone else's front door, along the street)
            const l = this.near('home', near.lx, near.lz, 160).filter((q2) => q2.place !== p.home);
            if (l.length) to = this.inside(l[Math.floor(r() * Math.min(5, l.length))]);
          } else {
            const l = this.near(k, near.lx, near.lz, 260);
            if (l.length) to = this.inside(l[Math.floor(r() * Math.min(4, l.length))]);
          }
          if (!to || !fits(to, dur, t)) continue;
          go(to, t, { tag, act: to.act || 'idle' });
          stay(now + dur);
          return true;
        }
        return false;
      };
      const wake = 360 + r() * 70;
      const home = () => { if (cur.place !== p.home) go(p.home, now, { tag: 'home', act: 'sleep' }); else { cur.tag = 'home'; cur.act = 'sleep'; } };
      // work that keeps you on the move: round a set of spots (sweeping, picking through bins), back and forth on a beat
      const rounds = (spots, until, o) => {
        let k = Math.floor(r() * spots.length), lunched = false;
        while (now < until - 10) {
          if (!lunched && now > 12.4 * 60) { lunched = true; lunch(spots[k % spots.length]); continue; }
          const s = spots[k % spots.length];
          k++;
          if (Math.max(now + cost(cur.place, s, o.slow), 0) > until) break;
          go(s, now, { tag: 'work', walkTag: 'work', act: s.act, slow: o.slow, hold: o.hold, walkHold: o.hold });
          stay(Math.min(until, now + o.dwell[0] + r() * (o.dwell[1] - o.dwell[0])));
        }
      };
      const lunch = (near) => {
        const t = Math.max(now, 12.5 * 60 + r() * 25), dur = 28 + r() * 20;
        const kinds = f === 'factionless' ? ['bread', 'seat'] : f === 'erudite' ? ['seat', 'cafe', 'stall'] : f === 'candor' ? ['stall', 'cafe', 'corner'] : f === 'dauntless' ? ['bar', 'stall'] : ['seat', 'stall', 'cafe'];
        const back = cur;
        if (r() < 0.75 && outing('lunch', near, t, dur, kinds)) return back;
        return null;
      };
      // ---- the morning, and the work ----
      stay(wake);
      const k = job.kind;
      const start = { hall: 510, office: 525, shop: 495, hq_erudite: 510, hq_candor: 540, compound: 480, depot: 450, order: job.late ? 900 : 420, haul: 450 }[k] + r() * 25;
      const end = { hall: 1020, office: 1035, shop: 1020, hq_erudite: 1050, hq_candor: 1050, compound: 960, depot: 945, order: job.late ? 1380 : 900, haul: 990 }[k];
      if (k === 'farm') { cur = { place: this.farms, act: 'idle', tag: 'home' }; stay(360 + r() * 20); cur = { place: this.farms, act: 'idle', tag: 'work' }; stay(1080 + r() * 30); cur = { place: this.farms, act: 'sleep', tag: 'home' }; }
      else if (job.place && k !== 'haul' && k !== 'bread') {
        // an office, a shop, the council hall, headquarters, the compound, the station, the depot
        go(job.place, start, { tag: 'work', act: 'work' });
        if (start < 720) {
          stay(12.5 * 60 + r() * 20);
          const back = r() < 0.6 ? lunch(job.place) : null;
          if (back) go(job.place, now, { tag: 'work', act: 'work' });
        }
        stay(end + r() * 20);
      } else if (k === 'haul') {
        go(job.place, start, { tag: 'work', act: 'work' });
        let n = 0, lunched = false;
        while (now < end - 30) {
          if (!lunched && now > 12.3 * 60) { lunched = true; if (lunch(job.place)) { go(job.place, now, { tag: 'work', act: 'work' }); continue; } }
          stay(now + 8 + r() * 10);
          const d = job.drops[(n++ + Math.floor(r() * 3)) % job.drops.length];
          go(d, now, { tag: 'work', walkTag: 'work', act: 'give', walkAct: 'carry', walkHold: 'crate' });
          stay(now + 2 + r() * 3);
          go(job.place, now, { tag: 'work', walkTag: 'work', act: 'work' });
        }
        stay(Math.max(now, end));
      } else if (k === 'papers' || k === 'fruit' || k === 'bread') {
        // a stall, or the bread line (the volunteers do the morning at the hall first)
        const V = job.venue, from = k === 'fruit' ? 450 : k === 'papers' ? 465 : 600;
        const to = Math.min(k === 'fruit' ? 1050 : k === 'papers' ? 1080 : 870, IN_BY - 10 - cost(V.slots.vendor[0], p.home));
        if (k === 'bread' && job.place) { go(job.place, 510 + r() * 15, { tag: 'work', act: 'work' }); }
        const arrive = Math.max(from, now + cost(cur.place, V.slots.vendor[0]));
        const slot = this.book(V.slots.vendor, day, arrive, to);
        if (slot) { go(slot, from, { tag: 'work', act: slot.act, hold: slot.hold }); stay(to); }
        // (no room at the stall today: the Amity stay out on the farms, Candor go in to the Mart)
        else if (k === 'fruit') { cur = { place: this.farms, act: 'idle', tag: 'work' }; stay(to); }
        else if (k === 'papers' && this.hqCandor) { go(this.inside(this.hqCandor), from, { tag: 'work', act: 'work' }); stay(to); }
        if (k === 'bread' && job.place && fits(job.place, 60)) { go(job.place, now, { tag: 'work', act: 'work' }); stay(Math.max(now + 30, 1020)); }
      } else if (k === 'sweep') {
        go(job.spots[0], 480 + r() * 30, { tag: 'work', act: 'sweep', hold: 'broom', walkHold: 'broom', slow: 0.7 });
        rounds(job.spots, 990, { dwell: [10, 20], slow: 0.7, hold: 'broom' });
      } else if (k === 'scavenge') {
        go(job.spots[0], 480 + r() * 60, { tag: 'work', act: 'pick' });
        rounds(job.spots, 1020, { dwell: [6, 14] });
      } else if (k === 'watch') {
        const s0 = job.late ? 840 : 480, s1 = job.late ? 1320 : 960;
        go(job.beat[0], s0, { tag: 'work', act: 'guard' });
        rounds(job.beat, s1, { dwell: [4, 9] });
      } else {
        // nothing to do and nowhere to be: out for a bit, the bread line at noon, a bench
        stay(480 + r() * 90);
        outing('errand', p.home, now, 20 + r() * 30, f === 'factionless' ? ['corner', 'seat'] : ['seat', 'stall', 'shop']);
        outing('lunch', p.home, 11.75 * 60 + r() * 30, 30, f === 'factionless' ? ['bread', 'seat'] : ['seat', 'cafe']);
        outing('errand', p.home, now + 30 + r() * 60, 30 + r() * 30, ['seat', 'corner', 'shop']);
      }
      // ---- after work: an errand, then the evening, their faction's way ----
      if (k !== 'farm') {
        if (r() < 0.35 && f !== 'amity') outing('errand', p.home, now + 5, 10 + r() * 15, f === 'factionless' ? ['bread', 'corner'] : ['shop', 'stall']);
        const q = r();
        switch (f) {
          case 'abnegation': if (q < 0.3) outing('social', p.home, Math.max(now, 18.5 * 60), 50 + r() * 25, ['neighbour']); else if (q < 0.5) outing('social', p.home, Math.max(now, 18 * 60), 40, ['seat']); break;
          case 'erudite': if (q < 0.45) outing('social', p.home, Math.max(now, 17.75 * 60), 60 + r() * 30, ['seat', 'cafe']); else if (q < 0.7) outing('social', p.home, Math.max(now, 18 * 60), 70, ['cafe']); break;
          case 'candor': if (q < 0.5) outing('social', p.home, Math.max(now, 18 * 60), 60 + r() * 40, ['corner', 'bar']); else if (q < 0.7) outing('social', p.home, Math.max(now, 18.5 * 60), 80, ['bar']); break;
          case 'dauntless': if (q < 0.45) outing('social', p.home, Math.max(now, 19 * 60), 150 + r() * 60, ['bar', 'corner']); else if (q < 0.8) outing('social', p.home, Math.max(now, 19 * 60), 180 + r() * 60, ['corner', 'bar']); break;
          case 'factionless': if (q < 0.75) outing('social', p.home, Math.max(now, 17.5 * 60), Math.min(170, IN_BY - 20 - Math.max(now, 17.5 * 60) - 25), ['fire', 'corner']); break;
          case 'amity': break;
        }
        home();
      }
      stay(DAY0 + 1440);
      // (to be safe: nobody in the plan past the edge of the day)
      for (const s of out) { s.t0 = Math.max(DAY0, s.t0); s.t1 = Math.min(DAY0 + 1440, s.t1); }
      return out.filter((s) => s.t1 > s.t0 + 0.01 || s === out[out.length - 1]);
    }
    // the clock now: which day's plan, and the minute in it
    clockAt(day, m) { return m < DAY0 ? [day - 1, m + 1440] : [day, m]; }
    segAt(p, day, m) {
      const [d, mm] = this.clockAt(day, m);
      this.planFor(d);
      const plan = p.plans[d];
      if (!plan || !plan.length) return null;
      let lo = 0, hi = plan.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (plan[mid].t0 <= mm) lo = mid; else hi = mid - 1; }
      const seg = plan[lo];
      return { seg, k: U.clamp((mm - seg.t0) / Math.max(0.01, seg.t1 - seg.t0), 0, 1), day: d, m: mm };
    }
    // where someone is (QA, and who's near enough to draw): { seg, tag, x, z, vis }
    where(p, day, m) {
      const st = this.segAt(p, day === undefined ? DV.Clock.day() : day, m === undefined ? DV.Clock.minutes() : m);
      if (!st) return null;
      const s = st.seg;
      let x, z, vis = false;
      if (s.k === 'at') { x = s.place.x; z = s.place.z; vis = !s.place.indoor; }
      else if (s.k === 'metro') { x = U.lerp(s.from.x, s.to.x, st.k); z = U.lerp(s.from.z, s.to.z, st.k); }
      else {
        vis = true;
        if (s.path && s.path.ok) { const q = this.pathAt(s.path, st.k * s.path.L); x = q.x; z = q.z; }
        else if (s.path) { x = s.from.x; z = s.from.z; vis = false; }
        else { x = U.lerp(s.from.lx, s.to.lx, st.k); z = U.lerp(s.from.lz, s.to.lz, st.k); }
      }
      return { seg: s, k: st.k, tag: s.tag, x, z, vis, place: s.k === 'at' ? s.place : null };
    }
    census(m, day) {
      const out = { total: 0, home: 0, work: 0, lunch: 0, errand: 0, social: 0, commute: 0, homeward: 0, metro: 0, visible: 0 };
      for (const p of this.pop) {
        const w = this.where(p, day, m);
        if (!w) continue;
        out.total++;
        out[w.tag] = (out[w.tag] || 0) + 1;
        if (w.seg.k === 'metro') out.metro++;
        if (w.vis) out.visible++;
      }
      return out;
    }

    /* ================================================================ the routes */
    // along the pavements from a to b: the door (or the spot) to the walking line, round the
    // corners and over the crossings, to the line outside b, and in (or to the spot)
    route(a, b, once) {
      const key = a.id + '>' + b.id;
      let R = once ? null : this.routes.get(key);
      if (R) return R;
      const W = this.W, pts = [], segs = [];
      const add = (x, z, e, lat) => {
        const l = pts[pts.length - 1];
        if (l && Math.hypot(l[0] - x, l[1] - z) < 0.02) return;
        if (l) segs.push({ e, lat, cross: e >= 0 && W.edges[e].cross });
        pts.push([x, z]);
      };
      let ok = a.edge >= 0 && b.edge >= 0;
      if (ok) {
        add(a.x, a.z, -1, false);
        add(a.lx, a.lz, -1, false);
        if (a.edge === b.edge) add(b.lx, b.lz, a.edge, true);
        else {
          const nodes = this.astar(a, b);
          if (!nodes) ok = false;
          else {
            nodes.forEach(([n, e], i) => add(W.nodes[n].x, W.nodes[n].z, i === 0 ? a.edge : e, true));
            add(b.lx, b.lz, b.edge, true);
          }
        }
        add(b.x, b.z, -1, false);
      }
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      R = { ok: ok && pts.length > 1, pts, segs, cum, L: cum[cum.length - 1] || 0 };
      if (once) return R;
      if (this.routes.size > 4000) this.routes.clear();
      this.routes.set(key, R);
      this.stats.routes++;
      return R;
    }
    // A* over the walking network, from either end of a's stretch to either end of b's: [[node, edge in]]
    astar(a, b) {
      const W = this.W, g = this.g, seen = this.seen, pN = this.prevN, pE = this.prevE;
      const st = ++this.stamp, H = new Heap();
      const ea = W.edges[a.edge], eb = W.edges[b.edge];
      const h = (n) => Math.hypot(W.nodes[n].x - b.lx, W.nodes[n].z - b.lz);
      const open = (n, gv, from, e) => { if (seen[n] === st && g[n] <= gv) return; seen[n] = st; g[n] = gv; pN[n] = from; pE[n] = e; H.push(gv + h(n), n); };
      open(ea.a, a.t, -1, a.edge);
      open(ea.b, ea.len - a.t, -1, a.edge);
      const goal = new Map([[eb.a, b.t], [eb.b, eb.len - b.t]]);
      let best = -1, bestG = 1e9, n = 0;
      while (H.size && n++ < 20000) {
        const u = H.pop();
        const gu = g[u];
        if (gu + h(u) - 1 > bestG) break;
        if (goal.has(u) && gu + goal.get(u) < bestG) { bestG = gu + goal.get(u); best = u; }
        for (const ei of W.nodes[u].edges) {
          if (ei === b.edge) continue; // (b's own stretch is walked from its end)
          const e = W.edges[ei], v = e.a === u ? e.b : e.a;
          open(v, gu + e.len + (e.cross ? 7 : 0), u, ei);
        }
      }
      if (best < 0) return null;
      const out = [];
      for (let u = best; u >= 0; u = pN[u]) { out.unshift([u, pE[u]]); if (out.length > 4000) return null; }
      return out;
    }
    // a way from wherever someone is to wherever they want to be (off the timetable: to see a fight)
    adhoc(x0, z0, x1, z1) {
      const la = this.nearestLine(x0, z0, 4), lb = this.nearestLine(x1, z1, 4);
      if (!la || !lb) return null;
      const A = { id: '~', x: x0, z: z0, lx: la.x, lz: la.z, edge: la.edge, t: la.t }, B = { id: '~', x: x1, z: z1, lx: lb.x, lz: lb.z, edge: lb.edge, t: lb.t };
      const R = this.route(A, B, true);
      // (over one street at most: they'll cross to see, and the traffic stops for them)
      return R.ok && R.L < 90 && R.segs.filter((q) => q.cross).length <= 1 ? R : null;
    }
    reversed(R) {
      const pts = R.pts.slice().reverse(), segs = R.segs.slice().reverse(), cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { ok: R.ok, pts, segs, cum, L: cum[cum.length - 1] };
    }
    pathAt(R, s) {
      const c = R.cum;
      s = U.clamp(s, 0, R.L);
      let lo = 0, hi = c.length - 2;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (c[mid] <= s) lo = mid; else hi = mid - 1; }
      const A = R.pts[lo], B = R.pts[lo + 1] || A, len = (c[lo + 1] - c[lo]) || 1, k = (s - c[lo]) / len;
      return { x: A[0] + (B[0] - A[0]) * k, z: A[1] + (B[1] - A[1]) * k, dx: (B[0] - A[0]) / len, dz: (B[1] - A[1]) / len, i: lo };
    }

    /* ================================================================ drawing the near ones */
    model(p, budget) {
      let m = this.models.get(p.id);
      if (m) { this.models.delete(p.id); this.models.set(p.id, m); return m; }
      if ((this.built || 0) >= (budget || 2)) return null; // (a couple a tick: no hitch; a few more for a crowd)
      this.built = (this.built || 0) + 1;
      const app = DV.Character.fromFaction(p.f, p.sex, 'life:' + p.id, { age: p.age });
      m = DV.Character.create(app);
      m.app = app;
      this.zone.group.add(m.root);
      m.root.visible = false;
      this.models.set(p.id, m);
      // (the cache: the least lately seen go, if nobody's using them)
      if (this.models.size > MODEL_CAP) for (const [id, q] of this.models) { if (this.models.size <= MODEL_CAP) break; if (this.agents.has(id)) continue; q.dispose(); this.models.delete(id); }
      return m;
    }
    draw(p, w) {
      const model = this.model(p);
      if (!model) return null;
      const a = { id: p.id, p, model, name: p.name, f: p.f, x: w.x, z: w.z, rot: 0, s: 0, seg: null, side: 0, lat: p.lat, stuck: 0, listen: 0, barkCool: 3 + this.r() * 8, greetT: 0, lodT: 0, edge: -1, vx: 0, vz: 0, bark: null, hurry: 0, react: null, released: false };
      a.headY = () => 1.62 * (model.app.height || 1);
      const self = this;
      a.it = {
        id: 'life:' + p.id, kind: 'action', x: w.x, y: 1.2, z: w.z, radius: 1.9, name: p.name,
        get label() { return self.canHelp(a) ? 'Help carry' : self.canFeed(a) ? 'Give bread' : 'Talk to'; },
        onUse: () => this.talk(a),
      };
      this.zone.interactables.push(a.it);
      this.agents.set(p.id, a);
      if (!this.adopt(a, this.segAt(p, DV.Clock.day(), DV.Clock.minutes()), true)) { this.release(a); return null; }
      model.root.visible = this.shown;
      return a;
    }
    release(a) {
      a.released = true;
      a.model.root.visible = false;
      this.hold(a, null);
      const i = this.zone.interactables.indexOf(a.it);
      if (i >= 0) this.zone.interactables.splice(i, 1);
      if (DV.Interaction.current === a.it) DV.Interaction.current = null;
      this.agents.delete(a.id);
    }
    // something in their hands: a broom, a loaf, a crate, a book, a newspaper
    hold(a, kind) {
      if (a.heldKind === kind) return;
      if (a.held) { a.model.detach(a.held); a.held = null; }
      a.heldKind = kind;
      if (!kind || !DV.CityLife || !DV.CityLife.propGeo) return;
      const H = {
        broom: ['handR', 'broom', null, [0, -0.05, 0.05], [Math.PI / 2 + 0.5, 0, 0]],
        loaf: ['handR', 'loaf', null, [0, -0.1, 0.06]],
        crate: ['chest', 'crate', null, [0, -0.42, 0.34]],
        book: ['handL', 'book', { color: [0.18, 0.28, 0.5] }, [0, -0.1, 0.06]],
        paper: ['handL', 'book', { color: [0.9, 0.9, 0.86] }, [0, -0.1, 0.06]],
      }[kind];
      if (!H) return;
      const m = new THREE.Mesh(DV.CityLife.propGeo(H[1], H[2]), this.mat);
      m.position.set(...H[3]);
      if (H[4]) m.rotation.set(...H[4]);
      a.held = a.model.attach(H[0], m);
    }
    // take up whatever the plan says they're doing now (snap: put them there, rather than walk)
    adopt(a, st, snap) {
      if (!st) return false;
      const s = st.seg;
      if (s.k === 'metro' || (s.k === 'at' && s.place.indoor)) return false;
      const prev = a.seg;
      a.seg = s;
      a.arrived = false;
      a.okCross = -1;
      if (s.k === 'walk') {
        if (!s.path) s.path = this.route(s.from, s.to);
        if (!s.path.ok) return false;
        a.s = snap || !prev || prev.k !== 'walk' || prev.to !== s.from ? st.k * s.path.L : 0;
        if (prev && prev.k === 'at' && prev.place === s.from && !snap) a.s = Math.min(a.s, 2);
        const q = this.pathAt(s.path, a.s);
        if (snap) { a.x = q.x; a.z = q.z; a.rot = Math.atan2(q.dx, q.dz); }
      } else if (snap || Math.hypot(a.x - s.place.x, a.z - s.place.z) > 2.5) { a.x = s.place.x; a.z = s.place.z; a.rot = s.place.rot || 0; }
      const act = s.act;
      this.hold(a, s.hold || (act === 'sit' && a.f === 'erudite' ? 'book' : act === 'read' ? 'paper' : null));
      return true;
    }

    /* ---- who to draw ---- */
    choose(px, pz) {
      const day = DV.Clock.day(), m = DV.Clock.minutes();
      let paths = 0;
      const want = [];
      for (const p of this.pop) {
        const w = this.where(p, day, m);
        if (!w || !w.vis || w.seg === p.gone) continue; // (gone in already: there before the timetable said)
        const d = Math.hypot(w.x - px, w.z - pz);
        // (a walk near you needs its real route before anyone can be drawn on it)
        if (w.seg.k === 'walk' && !w.seg.path && d < PATH_R && paths < 10) { paths++; w.seg.path = this.route(w.seg.from, w.seg.to); const w2 = this.where(p, day, m); if (!w2.vis) continue; w.x = w2.x; w.z = w2.z; }
        if (w.seg.k === 'walk' && !w.seg.path) continue;
        const dd = Math.hypot(w.x - px, w.z - pz), has = this.agents.has(p.id);
        if (dd < (has ? KEEP_R : DRAW_R)) want.push([dd, p, w]);
      }
      want.sort((q, b) => q[0] - b[0]);
      const keep = new Set(want.slice(0, MAX_DRAWN).map((q) => q[1].id));
      for (const a of [...this.agents.values()]) if (!keep.has(a.id) && !a.react) this.release(a);
      this.built = 0;
      for (const [, p, w] of want.slice(0, MAX_DRAWN)) if (!this.agents.has(p.id)) this.draw(p, w);
      this.dressVenues(px, pz, m);
    }
    // the stalls, crates and fires, while they're out (near you)
    dressVenues(px, pz, m) {
      const h = m / 60, fires = [];
      for (const V of this.venues) {
        const on = V.props.length && Math.hypot(V.x - px, V.z - pz) < 110 && h >= V.hours[0] && h < V.hours[1];
        if (on && !V.mesh) {
          V.mesh = [];
          for (const q of V.props) {
            const mesh = new THREE.Mesh(DV.CityLife.propGeo(q.k, q.o), this.mat.clone());
            mesh.position.set(q.x, 0, q.z); mesh.rotation.y = q.rot || 0;
            const L = this.zone.lightAt(q.x, q.z);
            mesh.material.color.setRGB(U.clamp(L[0] * 0.95, 0.35, 1.2), U.clamp(L[1] * 0.95, 0.35, 1.2), U.clamp(L[2] * 0.95, 0.35, 1.2));
            mesh.visible = this.shown;
            this.zone.group.add(mesh);
            V.mesh.push(mesh);
            const c = Math.cos(q.rot || 0), sn = Math.sin(q.rot || 0);
            if (q.k === 'stall') for (const u of [-0.7, 0, 0.7]) V.solid.push({ x: q.x + c * u, z: q.z - sn * u, r: 0.5 });
            else V.solid.push({ x: q.x, z: q.z, r: 0.36 });
          }
        } else if (!on && V.mesh) {
          for (const mesh of V.mesh) { this.zone.group.remove(mesh); mesh.material.dispose(); }
          V.mesh = null; V.solid = [];
        }
        if (V.mesh && V.fire) fires.push(V.fire);
      }
      this.fires = fires;
    }

    /* ---- every frame ---- */
    update(dt) {
      const P = DV.Player, px = P.x, pz = P.z;
      const off = DV.Dev && DV.Dev.on() && DV.Dev.flags.noStreet;
      const room = this.zone.roomAt(px, pz), shown = !off && this.life.shown === true && !(room && !room.exterior);
      if (shown !== this.shown) {
        this.shown = shown;
        for (const a of this.agents.values()) a.model.root.visible = shown;
        for (const V of this.venues) if (V.mesh) for (const mesh of V.mesh) mesh.visible = shown;
      }
      if (!shown) { if (off && this.agents.size) for (const a of [...this.agents.values()]) this.release(a); this.glow.visible = false; this.life.others = []; return; }
      // a jump in the clock (a wait, a load, the dev menu): everyone to where they should be by now
      const tot = DV.Clock.total(), jumped = this.lastTotal !== null && Math.abs(tot - this.lastTotal) > 2;
      this.lastTotal = tot;
      // a jump in place (a load, a scene that moved you): afresh
      const moved = this.last && Math.hypot(px - this.last[0], pz - this.last[1]) > 30;
      this.last = [px, pz];
      this.tick -= dt; this.barkT -= dt; this.t += dt;
      if (this.tick <= 0 || jumped || moved) { this.tick = 0.4; if (jumped || moved) for (const a of [...this.agents.values()]) this.release(a); this.choose(px, pz); }
      const day = DV.Clock.day(), m = DV.Clock.minutes(), now = performance.now();
      this.events = this.events.filter((e) => e.until > this.t);
      const others = [];
      for (const a of [...this.agents.values()]) {
        this.step(a, dt, this.segAt(a.p, day, m), now);
        if (!a.released) others.push(a);
      }
      this.life.others = others;
      // the glow of their fires, flickering
      const fires = this.fires || [], gp = this.glow.geometry.attributes.position.array;
      fires.slice(0, 4).forEach((f, i) => { gp[i * 3] = f[0]; gp[i * 3 + 1] = 1.2 + Math.sin(now / 90 + i) * 0.05; gp[i * 3 + 2] = f[1]; });
      this.glow.geometry.attributes.position.needsUpdate = true;
      this.glow.geometry.setDrawRange(0, Math.min(4, fires.length));
      this.glow.visible = fires.length > 0;
      this.glow.material.size = 2.4 + Math.sin(now / 70) * 0.25;
    }
    step(a, dt, st, now) {
      const P = DV.Player, p = a.p;
      if (!st) { this.release(a); return; }
      a.hurry = Math.max(0, a.hurry - dt);
      a.listen = Math.max(0, a.listen - dt);
      a.barkCool -= dt;
      const ox = a.x, oz = a.z;
      let speed = 0, act = 'idle', look = null, talking = false;
      if (a.react) {
        // drawn to something (a fight, a stop): over to it, watch, then back to where they were
        const R = a.react, path = R.phase === 'back' ? R.backPath : R.path;
        if (R.phase === 'watch') {
          act = R.act; look = [R.ev.x, R.ev.z]; a.rot = U.dampAngle(a.rot, Math.atan2(R.ev.x - a.x, R.ev.z - a.z), 5, dt);
          if (this.t > R.ev.until + R.linger) { R.phase = 'back'; R.s = 0; }
          if (a.barkCool <= 0 && this.barkT <= 0 && this.r() < 0.02) { const L = (CROWD[R.ev.kind] || CROWD.fight)[a.f]; this.say(a, pick(this.r, L), 2.6); this.barkT = 1.5; a.barkCool = 6; }
        } else if (R.wait > 0) { R.wait -= dt; a.model.root.visible = false; return; }
        else if (R.s < path.L - 0.02) {
          if (!a.model.root.visible && this.shown) a.model.root.visible = true;
          // (along the pavement, like anyone: hurrying over to see, strolling back)
          const v = R.phase === 'go' ? Math.max(2.4, p.pace * 1.8) : p.pace;
          R.s = Math.min(path.L, R.s + v * dt);
          const q = this.pathAt(path, R.s);
          a.x = q.x; a.z = q.z; speed = v;
          a.rot = U.dampAngle(a.rot, Math.atan2(q.dx, q.dz), 8, dt);
        } else if (R.phase === 'go') R.phase = 'watch';
        else {
          // back where they left off: on with it (a walk catches up with the timetable; indoors, they go back in)
          a.react = null;
          if (a.seg && a.seg.k === 'at' && a.seg.place.indoor) { this.release(a); return; }
        }
      } else {
        if (st.seg !== a.seg) {
          // the plan's moved on: finish the walk they're on (if it's nearly done), then take up the next thing
          const s = a.seg, finishing = s && s.k === 'walk' && a.s < s.path.L - 0.05 && s.path.L - a.s < 45 && st.seg.t0 - s.t1 < 8;
          if (!finishing && !this.adopt(a, st, !s || st.seg.t0 - s.t1 > 8)) { this.release(a); return; }
        }
        const s = a.seg;
        if (s.k === 'walk') {
          const R = s.path, real = ((s.t1 - s.t0) * 60) / DV.Clock.scale(), v = R.L / Math.max(1, real);
          const sched = st.seg === s ? st.k * R.L : R.L;
          if (sched - a.s > 40) a.s = sched;
          let spd = v * U.clamp(1 + (sched - a.s) / 12, 0.85, 1.7);
          if (a.hurry > 0 || (DV.Weather && DV.Weather.now() > 0.3)) spd *= 1.4;
          else if (DV.World.tod && DV.World.tod.sky < 0.35) spd *= 1.12;
          spd = Math.min(spd, 3.4);
          const q0 = this.pathAt(R, a.s), sg = R.segs[q0.i] || {};
          a.edge = sg.e === undefined ? -1 : sg.e;
          // the crossings: wait at the kerb for the white man (and the traffic)
          const segStart = R.cum[q0.i];
          if (sg.cross && a.okCross !== q0.i) {
            if (a.s - segStart < 0.4 && !this.life.mayCross(this.W.edges[sg.e])) { spd = 0; a.s = segStart; }
            else a.okCross = q0.i;
          }
          // the Order about: the factionless keep out of its way, Candor tell it what they think
          spd = this.mindTheOrder(a, spd, dt, now);
          if (a.listen > 0 || a.argue) spd = 0;
          // you in the way: stop, then step round
          const fx = q0.dx, fz = q0.dz, ax = P.x - a.x, az = P.z - a.z, ahead = ax * fx + az * fz, beside = ax * fz - az * fx;
          if (ahead > 0 && ahead < 1.4 && Math.abs(beside) < 0.8) {
            spd = Math.min(spd, ahead < 0.95 ? 0 : 0.15);
            a.stuck += dt;
            if (a.stuck > 0.15) a.side = U.damp(a.side, beside > 0 ? 1.15 : -1.15, 6, dt);
          } else { a.stuck = Math.max(0, a.stuck - dt); if (a.stuck === 0) a.side = U.damp(a.side, a.hide ? a.hide : 0, 1.5, dt); }
          if (spd > 0) { const nd = Math.hypot(a.x + fx * spd * dt - P.x, a.z + fz * spd * dt - P.z), d0 = Math.hypot(a.x - P.x, a.z - P.z); if (nd < 0.68 && nd < d0) spd = 0; }
          a.s = Math.min(R.L, a.s + spd * dt);
          const q = this.pathAt(R, a.s), sg2 = R.segs[q.i] || {};
          const lat = sg2.lat && !sg2.cross ? U.clamp(a.lat + a.side, -1.3, 1.3) : 0;
          a.x = q.x - q.dz * lat; a.z = q.z + q.dx * lat;
          if (spd > 0.2) a.rot = U.dampAngle(a.rot, Math.atan2(q.dx, q.dz), 7, dt);
          speed = spd; act = s.act === 'carry' ? 'carry' : 'idle';
          if (a.s >= R.L - 0.01) {
            a.arrived = true;
            // in through the door (or down the steps): gone
            if (s.to.indoor) { if (s.to.kind === 'metro') this.stats.metro[s.to.id] = now; p.gone = s; this.release(a); return; }
            speed = 0; act = s.to.act || 'idle'; a.rot = U.dampAngle(a.rot, s.to.rot || a.rot, 4, dt);
          }
          // (coming up out of the Circle Line)
          if (s.from.kind === 'metro' && a.s < 3) this.stats.metro[s.from.id] = now;
        } else {
          // standing (or sitting) somewhere: at their place, facing the way it faces
          const pl = s.place;
          a.edge = -1;
          const d = Math.hypot(pl.x - a.x, pl.z - a.z);
          if (d > 0.05) { const k = Math.min(d, p.pace * dt); a.x += ((pl.x - a.x) / d) * k; a.z += ((pl.z - a.z) / d) * k; if (d > 0.4) { speed = p.pace; a.rot = U.dampAngle(a.rot, Math.atan2(pl.x - a.x, pl.z - a.z), 8, dt); } }
          if (speed === 0) { act = s.act || 'idle'; a.rot = U.dampAngle(a.rot, pl.rot || 0, 3, dt); }
          if (pl.venue && (pl.venue.kind === 'corner' || pl.venue.kind === 'fire')) talking = Math.sin(now / 1400 + p.i * 1.7) > 0.35;
          if (pl.venue && pl.venue.kind === 'corner' && p.f === 'candor' && act === 'idle') act = 'argue';
          if (pl.venue && pl.venue.kind === 'corner' && p.f === 'dauntless' && act === 'idle' && p.i % 2) act = 'arms_crossed';
          this.mindTheOrder(a, 0, dt, now);
        }
      }
      if (a.argue) { act = 'argue'; talking = true; look = [a.argue.x, a.argue.z]; a.rot = U.dampAngle(a.rot, Math.atan2(a.argue.x - a.x, a.argue.z - a.z), 5, dt); if (now > a.argue.until) a.argue = null; }
      if (a.hide && speed === 0 && !a.react) act = 'lean';
      // you: a look, a word, a step aside; knock them running and they'll remember
      this.mindYou(a, dt, now);
      if (a.listen > 0) { speed = 0; if (act !== 'sit') act = 'idle'; a.rot = U.dampAngle(a.rot, Math.atan2(P.x - a.x, P.z - a.z), 6, dt); }
      if (a.shoved > 0) { a.shoved -= dt; speed = 0; act = 'cower'; }
      const dp = Math.hypot(a.x - P.x, a.z - P.z);
      if (!look && dp < 4.5 && act !== 'sit') look = [P.x, P.z];
      a.vx = dt > 0 ? (a.x - ox) / dt : 0; a.vz = dt > 0 ? (a.z - oz) / dt : 0;
      const root = a.model.root;
      root.position.set(a.x, 0.012, a.z);
      root.rotation.y = a.rot;
      a.it.x = a.x; a.it.z = a.z;
      a.lodT += dt;
      if (!this.shown || (dp > 30 && a.lodT < 0.12)) return;
      const adt = a.lodT; a.lodT = 0;
      const lookYaw = look ? U.clamp(U.wrapAngle(Math.atan2(look[0] - a.x, look[1] - a.z) - a.rot), -1.1, 1.1) : 0;
      a.model.animate(adt, { speed, action: act, seatY: a.seg && a.seg.seatY ? a.seg.seatY : 0.45, lookYaw, talking: talking || !!(a.bark && a.bark.until > now) });
      const L = this.zone.lightAt(a.x, a.z);
      a.model.setTint(U.clamp(L[0] * 0.9, 0.25, 1.3), U.clamp(L[1] * 0.9, 0.25, 1.3), U.clamp(L[2] * 0.9, 0.25, 1.3));
    }
    // the patrols and the drones: the factionless keep to the wall till they've gone by; Candor argue
    mindTheOrder(a, spd, dt, now) {
      const O = this.zone.order;
      if (!O) return spd;
      let near = null, nd = 1e9;
      for (const sq of O.squads || []) for (const mm of sq.members) { const d = Math.hypot(mm.x - a.x, mm.z - a.z); if (d < nd) { nd = d; near = mm; } }
      let drone = false;
      for (const dr of O.drones || []) if (Math.hypot(dr.x - a.x, dr.z - a.z) < 12 && dr.y < 16) drone = true;
      if (a.f === 'factionless') {
        if ((near && nd < 16) || drone) {
          if (!a.hide) {
            // (which side's the wall? that way, out of the light)
            const q = a.seg && a.seg.k === 'walk' ? this.pathAt(a.seg.path, a.s) : null;
            let side = 0.9;
            if (q && this.kit.built(a.x - q.dz * 2.2, a.z + q.dx * 2.2, 0.2)) side = 0.95; else if (q) side = -0.95;
            a.hide = side; this.stats.hid++;
          }
          return 0;
        }
        if (a.hide && (!near || nd > 22)) a.hide = 0;
        return a.hide ? 0 : spd;
      }
      if (a.f === 'candor' && near && nd < 6 && !a.argue && (a.argued || 0) < now - 240000 && a.p.i % 3 === 0) {
        a.argued = now;
        a.argue = { x: near.x, z: near.z, until: now + 7000 };
        this.say(a, pick(this.r, ARGUE), 4);
        this.stats.argued++;
      }
      void dt;
      return spd;
    }
    mindYou(a, dt, now) {
      const P = DV.Player, d = Math.hypot(a.x - P.x, a.z - P.z), M = this.mem(a.p);
      // knocked into, running
      const v = Math.hypot(P.vx || 0, P.vz || 0);
      if (d < 0.72 && v > 3.4 && (a.shovedAt || 0) < now - 30000 && DV.Game.state === 'playing') {
        a.shovedAt = now; a.shoved = 1.2;
        M.hurt++; M.rel = U.clamp(M.rel - 10, -100, 100);
        this.say(a, pick(this.r, SHOVED[a.f]), 3);
        DV.Reputation.add(a.f, -1, true);
        DV.UI.notify(a.p.first + ' won\'t forget that.', 'rel_down');
        this.stats.shoved++;
        return;
      }
      // a word as you come up to them
      if (d < 3.4 && a.barkCool <= 0 && this.barkT <= 0 && !a.react && a.listen <= 0) {
        a.barkCool = 50 + this.r() * 40;
        if (this.r() < 0.55) { this.say(a, this.greeting(a), 2.6); this.barkT = 3; }
      }
      void dt;
    }
    tod() { const m = DV.Clock.minutes(); return m < 720 ? 'morning' : m < 1050 ? 'afternoon' : 'evening'; }
    greeting(a) {
      const M = this.mem(a.p), rep = DV.Reputation.get(a.f), r = this.r;
      if (M.rel <= -10) return pick(r, COLD[a.f]);
      if (M.rel >= 10) return pick(r, WARM[a.f]);
      if (rep <= -25) return pick(r, DISTRUST[a.f]);
      const t = this.tod();
      return pick(r, GREET[a.f]).replace('{tod}', t).replace(/^([a-z])/, (c) => c.toUpperCase());
    }
    mem(p) {
      const w = DV.State.data.world, L = w.lives || (w.lives = { mem: {} });
      return L.mem[p.id] || (L.mem[p.id] = { rel: 0, met: 0, helped: 0, hurt: 0 });
    }
    canHelp(a) { return !!(a.seg && a.seg.k === 'walk' && a.seg.act === 'carry' && !a.helpedSeg); }
    canFeed(a) { return a.f === 'factionless' && DV.Inventory.has('bread_roll') && !a.fed; }
    say(a, text, secs) { a.bark = { text, until: performance.now() + (secs || 3.5) * 1000 }; }
    // E: what they say depends on what they're doing, and on what they think of you
    talk(a) {
      const p = a.p, M = this.mem(p), r = this.r, s = a.seg;
      a.listen = 4.5;
      DV.Stats.practice('empathy', 0.05);
      if (this.canHelp(a)) {
        a.helpedSeg = true; M.helped++; M.rel = U.clamp(M.rel + 12, -100, 100); this.stats.helped++;
        a.hurry = 0; a.listen = 2;
        this.say(a, p.f === 'factionless' ? 'You\'d do that? ...Thanks. Nobody does that.' : 'Oh — thank you. It\'s heavier than it looks.', 4);
        DV.Reputation.add(p.f, 1);
        return;
      }
      if (this.canFeed(a)) {
        a.fed = true; M.helped++; M.rel = U.clamp(M.rel + 10, -100, 100); this.stats.helped++;
        DV.Inventory.remove('bread_roll', 1);
        this.say(a, 'For me? ...Thank you. I mean it.', 4);
        DV.Reputation.add('factionless', 1);
        return;
      }
      let line;
      const m = DV.Clock.minutes(), rep = DV.Reputation.get(p.f);
      if (M.rel <= -10) line = pick(r, COLD[p.f]);
      else if (M.rel >= 10 && M.met % 2 === 0) line = pick(r, WARM[p.f]);
      else if (rep <= -25) line = pick(r, DISTRUST[p.f]);
      else if (m >= 20 * 60 + 15 && m < 22 * 60) line = pick(r, LATE_LINES[p.f]);
      else if (s && s.tag === 'work') line = pick(r, JOB_LINES[p.job.kind] || JOB_LINES.none);
      else if (s && s.k === 'walk' && s.tag === 'commute') line = pick(r, TAG_LINES.commute).replace('{to}', s.to.kind === 'metro' ? 'the train' : s.to.name || 'work');
      else line = pick(r, TAG_LINES[s && TAG_LINES[s.tag] ? s.tag : 'homeward']);
      if (!M.met && M.rel > -10) line = (p.f === 'factionless' || p.f === 'dauntless' ? '' : 'I\'m ' + p.first + '. ') + line;
      M.met++;
      this.say(a, line, 4.5);
    }

    /* ================================================================ events */
    // something happens in the street: a fight, a stop (people gather round), a siren (they hurry)
    event(kind, x, z, o) {
      o = o || {};
      const ev = { kind, x, z, until: this.t + (o.secs || 18), t: this.t };
      this.events.push(ev);
      if (kind === 'siren') {
        for (const a of this.agents.values()) { a.hurry = 60; if (this.r() < 0.25) this.say(a, pick(this.r, SIREN), 2.5); }
        return ev;
      }
      const R = o.r || (kind === 'fight' ? 34 : 20);
      // where they stand to watch: round it, on this side of the street (a pavement's only three metres
      // across, so mostly up and down it from the trouble), clear of everything, and not on top of each other
      const cand = [];
      for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
        const px = x + i * 0.75, pz = z + j * 0.75, d = Math.hypot(px - x, pz - z);
        if (d < 1.8 || d > 6.2) continue;
        cand.push([d + (this.r() - 0.5) * 0.4, px, pz]);
      }
      cand.sort((a, b) => a[0] - b[0]);
      const ring = [];
      for (const [, px, pz] of cand) {
        if (ring.length >= 14) break;
        if (ring.some((q) => Math.hypot(q[0] - px, q[1] - pz) < 0.85)) continue;
        if (this.solid(px, pz, 0.3) || this.onRoad(px, pz, 0.3) || !this.clearLine(x, z, px, pz)) continue;
        ring.push([px, pz]);
      }
      ev.ring = ring;
      let n = 0;
      const join = (a, back) => {
        if (n >= ring.length) return false;
        const path = this.adhoc(a.x, a.z, ring[n][0], ring[n][1]);
        if (!path) return false;
        const act = kind === 'fight' ? { dauntless: 'cheer', candor: 'point', abnegation: 'arms_crossed', amity: 'cower', erudite: 'idle', factionless: 'idle' }[a.f] : { candor: 'argue', dauntless: 'arms_crossed' }[a.f] || 'idle';
        a.react = { ev, at: ring[n++], back, path, backPath: this.reversed(path), s: 0, phase: 'go', act, linger: this.r() * 3 };
        a.listen = 0; a.hide = 0;
        return true;
      };
      for (const a of this.agents.values()) {
        if (a.react || Math.hypot(a.x - x, a.z - z) > R || (a.seg && a.seg.tag === 'work' && a.seg.k === 'at' && a.seg.place.venue)) continue;
        if (a.seg && a.seg.k === 'at' && a.seg.act === 'sit' && this.r() < 0.5) continue;
        join(a, [a.x, a.z]);
      }
      // (and out of the shops and the houses close by, to see)
      if (kind === 'fight') {
        const day = DV.Clock.day(), m = DV.Clock.minutes();
        for (const p of this.pop) {
          if (n >= ring.length || this.agents.size >= MAX_DRAWN + 6) break;
          if (this.agents.has(p.id)) continue;
          const w = this.where(p, day, m);
          if (!w || w.seg.k !== 'at' || !w.place.indoor || w.place.edge < 0 || w.place.away || Math.hypot(w.place.x - x, w.place.z - z) > 65 || w.tag === 'home' && m < 6.5 * 60) continue;
          const model = this.model(p, 8);
          if (!model) continue;
          const a = { id: p.id, p, model, name: p.name, f: p.f, x: w.place.x, z: w.place.z, rot: 0, s: 0, seg: w.seg, side: 0, lat: p.lat, stuck: 0, listen: 0, barkCool: 2, greetT: 0, lodT: 0, edge: -1, vx: 0, vz: 0, bark: null, hurry: 0, react: null, released: false };
          a.headY = () => 1.62 * (model.app.height || 1);
          a.it = { id: 'life:' + p.id, kind: 'action', x: a.x, y: 1.2, z: a.z, radius: 1.9, name: p.name, label: 'Talk to', onUse: () => this.talk(a) };
          if (!join(a, [w.place.x, w.place.z])) continue;
          a.react.wait = (n % 4) * 0.7 + this.r() * 0.5; // (out of the door one after another)
          this.zone.interactables.push(a.it);
          this.agents.set(p.id, a);
          model.root.visible = this.shown;
          a.outOfDoors = true;
        }
      }
      // (and the strangers passing stop and stare)
      let g = 0;
      for (const q of this.life.peds) if (Math.hypot(q.x - x, q.z - z) < R) { q.gawk = { x, z, until: this.t + (o.secs || 18) + this.r() * 3, lives: this }; g++; }
      this.stats.gathered += n;
      ev.n = n; ev.gawk = g;
      return ev;
    }
    clearLine(x0, z0, x1, z1) {
      const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.8);
      for (let k = 1; k < n; k++) { const x = x0 + ((x1 - x0) * k) / n, z = z0 + ((z1 - z0) * k) / n; if (this.solid(x, z, 0.2) || this.onRoad(x, z, -0.1)) return false; }
      return true;
    }
    // did someone just go down (or come up) this entrance? (the metro's own commuters make way)
    usedEntrance(id, secs) { const t = this.stats.metro['st:' + id]; return !!t && performance.now() - t < (secs || 25) * 1000; }
    onStreet() { return this.shown ? this.agents.size : 0; }

    /* ---- for the HUD and the player ---- */
    barkSources() {
      const now = performance.now(), out = [];
      if (!this.shown) return out;
      for (const a of this.agents.values()) if (a.bark && a.bark.until > now) out.push(a);
      return out;
    }
    bodies(px, pz, r) {
      const out = [];
      if (!this.shown) return out;
      for (const a of this.agents.values()) if (Math.abs(a.x - px) < r && Math.abs(a.z - pz) < r && !(a.seg && a.seg.act === 'sit' && a.seg.k === 'at') && !(a.react && a.react.wait > 0)) out.push({ x: a.x, z: a.z, r: 0.28 });
      for (const V of this.venues) for (const b of V.solid) if (Math.abs(b.x - px) < r + 1 && Math.abs(b.z - pz) < r + 1) out.push(b);
      return out;
    }
    info() {
      const c = this.census();
      return { people: this.pop.length, drawn: this.agents.size, fronts: this.fronts.length, venues: this.venues.length, seats: this.seats.length, stations: this.stations.length, census: c, stats: this.stats };
    }
  }

  DV.Lives = {
    POP,
    attach(zone, city, life) {
      const l = new Lives(zone, city, life);
      zone.lives = l;
      return l;
    },
    active() {
      const z = DV.World.current;
      return z && z.lives ? z.lives : null;
    },
    FNAME,
  };
})();
