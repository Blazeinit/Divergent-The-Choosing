/* ==========================================================================
   DIVERGENT — Build 2, chapter 2: the Choosing Ceremony
   The hall high up in the Hub, the city spread out below the windows. Five
   bowls on a table: grey stones, water, glass, earth, burning coals. The
   factions sit in five sections around them, the candidates in front.
   Names are called in reverse alphabetical order; each candidate cuts a
   palm and lets the blood fall into one bowl. The people you met on
   Aptitude Day choose too — and some of their choices depend on you.
   Then it's your turn.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const R = Math.PI / 180;

  // geometry of the hall
  const C = { x: 23, z: 13 }; // the centre of the dais
  const P = (r, deg) => [C.x + r * Math.sin(deg * R), C.z + r * Math.cos(deg * R)];
  const faceC = (x, z) => Math.atan2(C.x - x, C.z - z);
  const SECTIONS = { abnegation: -68, amity: -34, candor: 0, dauntless: 34, erudite: 68 }; // centre angle of each faction's seats
  const ROWS = [9.0, 10.5, 12.0, 13.5]; // (four rows to a section: the hall is full, as in the film)
  const ROW_SEATS = [4, 5, 6, 7];
  const AISLES = [-48, -15, 15, 48];
  const BOWLS = { abnegation: 20.0, erudite: 21.5, dauntless: 23.0, candor: 24.5, amity: 26.0 }; // x along the table
  const TABLE_Z = 12.2, STAND_Z = 13.35;
  const CAND_ROWS = [5.4, 6.3, 7.2];
  const CAND_SEATS = [3, 4, 5]; // seats to a bench segment, by row
  const CAND_SEGS = [[-45, -19], [-11, 11], [19, 45]];
  const INIT_R = 7.95;

  // seats in a faction section (row, index) → {x,z,rot}
  function sectionSeats(f) {
    const c = SECTIONS[f], out = [];
    ROWS.forEach((r, ri) => {
      const n = ROW_SEATS[ri];
      for (let i = 0; i < n; i++) {
        const deg = c - 13 + (26 * i) / (n - 1);
        const [x, z] = P(r, deg);
        out.push({ x, z, rot: faceC(x, z), row: ri, deg });
      }
    });
    return out;
  }
  // candidate seats: 2 rows × 3 bench segments × 3 seats
  function candidateSeats() {
    const out = [];
    CAND_ROWS.forEach((r, ri) => {
      const n = CAND_SEATS[ri];
      for (const [a, b] of CAND_SEGS) for (let i = 0; i < n; i++) {
        const deg = a + ((b - a) * (i + 0.5)) / n;
        const [x, z] = P(r, deg);
        out.push({ x, z, rot: faceC(x, z), r, deg, row: ri });
      }
    });
    return out;
  }
  // where each faction's new initiates stand, in front of their section
  function initiateSpot(f, k) {
    // two staggered rows in front of the section, fanning out from its middle
    const row = k % 2, j = Math.floor(k / 2);
    const deg = SECTIONS[f] + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 5.4 + (row ? 2.7 : 0);
    const [x, z] = P(INIT_R + row * 0.6, deg);
    return { x, z, rot: faceC(x, z), deg };
  }
  const nearestAisle = (deg) => AISLES.reduce((a, b) => (Math.abs(b - deg) < Math.abs(a - deg) ? b : a));
  // seat → table (via the nearest aisle)
  function routeToTable(seat, bx) {
    const a = nearestAisle(seat.deg);
    const pts = [P(seat.r, a), P(4.6, a), [bx, STAND_Z]];
    return pts;
  }
  // table → initiate spot (via the aisle nearest the section)
  function routeToSection(bx, spot) {
    const a = nearestAisle(spot.deg);
    const pts = [[bx, STAND_Z + 0.4], P(4.6, a), P(INIT_R, a)];
    const step = spot.deg > a ? 8 : -8;
    for (let d = a + step; Math.abs(d - spot.deg) > 8; d += step) pts.push(P(INIT_R, d));
    pts.push([spot.x, spot.z]);
    return pts;
  }

  /* ------------------------------ the hall ------------------------------ */
  (function defineHall() {
    const props = [];
    const add = (type, x, z, o) => props.push(Object.assign({ type, x, z }, o || {}));
    // benches for the factions (Dauntless stand) and the candidates
    for (const f of Object.keys(SECTIONS)) {
      if (f === 'dauntless') continue;
      ROWS.forEach((r) => {
        const c = SECTIONS[f];
        const [x, z] = P(r, c);
        const len = 2 * r * Math.sin(14 * R);
        add('bench', x, z, { rotDeg: (faceC(x, z) * 180) / Math.PI, len, seatable: false, back: true, wood: 'wood' });
      });
    }
    CAND_ROWS.forEach((r) => {
      for (const [a, b] of CAND_SEGS) {
        const m = (a + b) / 2;
        const [x, z] = P(r, m);
        add('bench', x, z, { rotDeg: (faceC(x, z) * 180) / Math.PI, len: 2 * r * Math.sin(((b - a) / 2) * R), seatable: false, back: false, wood: 'wood_light' });
      }
    });
    add('floor_emblem', C.x, C.z + 0.6, { size: 7.5 });
    add('table', C.x, TABLE_Z, { w: 7.4, d: 1.0, chairs: 0, top: 'metal_dark', h: 0.86 });
    add('lectern', C.x, 10.2, {});
    // faction banners high on the walls
    [['abnegation', 3], ['amity', 12.5], ['candor', 23], ['dauntless', 33.5], ['erudite', 43]].forEach(([f, x]) => add('banner', x, 33.9, { rotDeg: 180, faction: f, y: 6.4, h: 3 }));
    for (const x of [6, 40]) add('column', x, 26, { h: 9, size: 0.9, mat: 'concrete_panel' });
    add('plant', 2, 32.5, { size: 1.2 }); add('plant', 44, 32.5, { size: 1.2 });
    add('rug', C.x, 30, { w: 3.6, d: 7.5, mat: 'carpet_red' });

    DV.Zones.define('hub_hall', {
      name: 'The Hub',
      region: 'Choosing Hall · 20th floor',
      chapter: true,
      noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 48, z1: 38 },
      buildingHeight: 10,
      roof: { parapet: 1.1, tank: false }, // (from above, the top of the tower: plant, a mast, no water tank)
      facade: 'glass_dark',
      fog: { color: 0x7d858c, near: 60, far: 320 },
      sky: { top: 0x63727f, horizon: 0xa8b0b6, ground: 0x5a5d60, skyline: false },
      exterior: { sunDir: [0.45, 0.8, -0.35], sunColor: [0.9, 0.9, 0.86], ambient: [0.5, 0.52, 0.56] },
      charLight: { ambient: 0.55, hemi: 0.45, dir: 0.55 },
      rooms: [
        {
          id: 'hub_hall', name: 'Choosing Hall', x0: 0, z0: 0, x1: 46, z1: 34, h: 9, floor: 'terrazzo', wall: 'concrete_panel', ceiling: 'ceiling_concrete',
          light: { ambient: [0.5, 0.5, 0.52], color: [1, 0.97, 0.9], intensity: 0.8, spacing: 7, range: 11, extra: [
            { x: C.x, z: C.z, y: 7.5, intensity: 1.2, range: 9, color: [1, 0.95, 0.85] },
          ] },
        },
        { id: 'hub_stair', name: 'Stairwell', x0: 19, z0: 34, x1: 27, z1: 38, h: 4, floor: 'concrete', wall: 'concrete', light: { ambient: [0.3, 0.3, 0.32], color: [1, 0.95, 0.85], intensity: 0.8, spacing: 4, range: 6, fixture: 'tube' } },
      ],
      doors: [
        { id: 'hub_exit', x: 23, z: 34, dir: 'x', w: 3.2, type: 'double', lock: 'hub_exit', label: 'STAIRS', lockMsg: 'The doors stay shut until the ceremony is over.' },
      ],
      windows: [
        ...[5, 14, 23, 32, 41].map((x, i) => ({ id: 'hub_win_n' + i, x, z: 0, dir: 'x', w: 7, sill: 0.35, top: 8.2 })),
        ...[7, 17, 27].map((z, i) => ({ id: 'hub_win_w' + i, x: 0, z, dir: 'z', w: 7, sill: 0.35, top: 8.2 })),
        ...[7, 17, 27].map((z, i) => ({ id: 'hub_win_e' + i, x: 46, z, dir: 'z', w: 7, sill: 0.35, top: 8.2 })),
      ],
      props,
      spots: {},
      spawn: { x: 23, z: 30, rot: Math.PI },
      build(ctx) {
        const zone = ctx.zone;
        // the city 78 m below the windows; we're inside the Hub, so no Hub tower
        const city = DV.City.build({
          seed: 1990,
          y: -78,
          campus: [-40, -40, 86, 70],
          gridX: [-546, -470, -394, -318, -242, -166, -90, -46, 92, 166, 242, 318, 394, 470, 546],
          gridZ: [-524, -460, -396, -332, -268, -204, -140, -76, -46, 76, 140, 204, 268, 332, 396, 460],
          radius: 600,
          hub: [C.x, C.z],
          noHubTower: true,
          marshX: 520,
          ferris: [560, -60],
          haze: 0xa1a8ae,
          hazeK: 0.0036,
          deckY: 170,
        });
        ctx.add(city.group);
        zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
        // the five bowls
        zone.bowls = {};
        for (const f of Object.keys(BOWLS)) zone.bowls[f] = makeBowl(ctx, f, BOWLS[f], TABLE_Z);
        // the ceremonial knife
        const knife = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.03), new THREE.MeshBasicMaterial({ color: 0xc8ccd0, fog: true }));
        const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.025), new THREE.MeshBasicMaterial({ color: 0x2a2420, fog: true }));
        blade.position.x = 0.15; knife.add(blade, hilt);
        knife.position.set(C.x - 0.05, 0.875, TABLE_Z + 0.32);
        ctx.add(knife);
        zone.knife = knife;
      },
    });
  })();

  // a shallow metal bowl and what's in it; the coals glow
  function makeBowl(ctx, f, x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0.86, z);
    const metal = new THREE.MeshBasicMaterial({ color: 0x55585c, fog: true });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.16, 12, 1, true), metal);
    bowl.position.y = 0.08;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 12), metal);
    g.add(bowl, base);
    const fill = new THREE.Group();
    fill.position.y = 0.12;
    const rnd = U.rng('bowl' + f);
    // (the bowl's contents are lumps of one colour: each colour is merged into a single mesh, one draw call)
    const lump = (col, s, n, flat) => {
      const m = new THREE.MeshBasicMaterial({ color: col, fog: true });
      const pos = [];
      const tmp = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const g = new THREE.BoxGeometry(s * (0.7 + rnd() * 0.6), s * (flat ? 0.3 : 0.6 + rnd() * 0.5), s * (0.7 + rnd() * 0.6)).toNonIndexed();
        const a = rnd() * 6.28, r = rnd() * 0.24;
        tmp.position.set(Math.cos(a) * r, rnd() * 0.03, Math.sin(a) * r);
        tmp.rotation.set(rnd(), rnd() * 3, rnd());
        tmp.updateMatrix();
        g.applyMatrix4(tmp.matrix);
        pos.push(...g.attributes.position.array);
        g.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      fill.add(new THREE.Mesh(geo, m));
      return m;
    };
    let glow = null;
    if (f === 'abnegation') lump(0x8c8c88, 0.09, 26);
    else if (f === 'amity') { lump(0x4e3622, 0.11, 18); lump(0x3a5a2a, 0.03, 6); }
    else if (f === 'candor') lump(0xdfe6ea, 0.05, 40, true);
    else if (f === 'erudite') { const w = new THREE.Mesh(new THREE.CircleGeometry(0.31, 14), new THREE.MeshBasicMaterial({ color: 0x3e6f9e, transparent: true, opacity: 0.85, fog: true })); w.rotation.x = -Math.PI / 2; w.position.y = 0.02; fill.add(w); }
    else if (f === 'dauntless') { lump(0x1d1714, 0.08, 22); glow = lump(0xd25a1e, 0.05, 14); }
    g.add(fill);
    ctx.add(g);
    if (glow) {
      let t = Math.random() * 6;
      ctx.update((dt) => { t += dt; const k = 0.75 + 0.25 * Math.sin(t * 3.1) * Math.sin(t * 1.7 + 1); glow.color.setRGB(0.82 * k + 0.1, 0.35 * k, 0.12 * k); });
    }
    return { group: g, x, z, fill };
  }

  // a lectern for the speaker
  DV.Props.define('lectern', (ctx, p, B) => {
    const w = ctx.M('wood'), m = ctx.M('metal_dark');
    B.box(w, 0, 0, 0, 0.7, 1.05, 0.5);
    B.push(0, 1.05, 0.05, 0);
    B.box(w, 0, 0, 0, 0.8, 0.06, 0.55);
    B.pop();
    B.box(m, 0, 1.1, -0.15, 0.04, 0.3, 0.04);
    ctx.collide(-0.4, -0.3, 0.4, 0.3, { y1: 1.2 });
  });

  /* ------------------------------ who chooses what ------------------------------ */
  // reverse alphabetical by last name; `to` may depend on what happened on Aptitude Day
  const CANDIDATES = [
    { id: 'young_ella', name: 'Ella Young', last: 'Young', from: 'dauntless', to: 'dauntless', sex: 'f' },
    {
      id: 'daniel_webb', last: 'Webb', from: 'abnegation',
      to: (fl) => (fl.daniel_tested ? 'dauntless' : 'abnegation'),
      react: (fl, f) => (fl.daniel_tested
        ? { line: 'He walks past the stones without looking at them. The coals hiss. Somewhere in the Abnegation section, a council member stands up — and sits back down.', nod: true, say: 'Thank you.' }
        : { line: 'His hand shakes so badly the blood barely finds the stones. He doesn\'t look up.', say: null }),
    },
    { id: 'samuel_ward', last: 'Ward', from: 'abnegation', to: 'abnegation' },
    {
      id: 'nate_russo', last: 'Russo', from: 'dauntless', to: 'dauntless',
      react: (fl) => (fl.nate_heist ? { say: 'See you on the train, {name}!', nod: true } : fl.nate_asked ? { say: 'Still think you can hack it?' } : { say: 'DAUNTLESS!' }),
    },
    { id: 'quinn_tyler', name: 'Tyler Quinn', last: 'Quinn', from: 'candor', to: 'candor', sex: 'm' },
    { id: 'patel_arjun', name: 'Arjun Patel', last: 'Patel', from: 'amity', to: 'candor', sex: 'm' },
    { id: 'ortiz_maria', name: 'Maria Ortiz', last: 'Ortiz', from: 'erudite', to: 'erudite', sex: 'f' },
    { id: 'abby_morgan', last: 'Morgan', from: 'amity', to: 'amity' },
    {
      id: 'jenna_morales', last: 'Morales', from: 'candor',
      to: (fl) => (fl.pd_shared ? 'erudite' : 'candor'),
      react: (fl) => (fl.pd_shared ? { line: 'A Candor girl choosing water. The Candor section boos, cheerfully. Jenna finds you in the crowd and mouths two words: "Protocol D."', nod: true } : { say: 'Truth.' }),
    },
    { id: 'josh_miller', last: 'Miller', from: 'candor', to: 'dauntless' },
    { id: 'kat_malone', last: 'Malone', from: 'dauntless', to: 'dauntless' },
    { id: 'hannah_lewis', last: 'Lewis', from: 'abnegation', to: 'erudite' },
    { id: 'nora_kelly', last: 'Kelly', from: 'candor', to: 'candor' },
    { id: 'fox_riley', name: 'Riley Fox', last: 'Fox', from: 'abnegation', to: 'abnegation', sex: 'm' },
    { id: 'ben_fischer', last: 'Fischer', from: 'erudite', to: 'erudite' },
    { id: 'grace_chen', last: 'Chen', from: 'erudite', to: 'candor' },
    { id: 'joey_brennan', last: 'Brennan', from: 'dauntless', to: 'dauntless' },
    {
      id: 'lucy_barnes', last: 'Barnes', from: 'amity', to: 'amity',
      react: (fl) => (fl.bird_returned ? { line: 'Lucy lets her blood fall on the earth — and then holds up a little carved bird, and finds you, and grins.', nod: true, say: 'Thank you!' } : { line: 'Lucy chooses the earth. Her free hand keeps closing on nothing, as if she\'s holding something that isn\'t there.' }),
    },
  ];
  // the rest of the hall's candidates: sixteen more people from the same Aptitude Day, who go where their blood takes them
  const WALKONS = [
    ['castillo', 'Ruben Castillo', 'candor', 'dauntless', 'm'], ['brandt', 'Saskia Brandt', 'erudite', 'dauntless', 'f'], ['ibarra', 'Tomas Ibarra', 'amity', 'dauntless', 'm'],
    ['okafor', 'Imani Okafor', 'abnegation', 'dauntless', 'f'], ['doyle', 'Callum Doyle', 'dauntless', 'dauntless', 'm'], ['nair', 'Priya Nair', 'erudite', 'dauntless', 'f'],
    ['calloway', 'Wes Calloway', 'candor', 'dauntless', 'm'], ['marlow', 'Lena Marlow', 'dauntless', 'dauntless', 'f'],
    ['thorne', 'Abel Thorne', 'abnegation', 'abnegation', 'm'], ['ashby', 'Edith Ashby', 'abnegation', 'abnegation', 'f'], ['lund', 'Greta Lund', 'erudite', 'erudite', 'f'],
    ['vickers', 'Anselm Vickers', 'erudite', 'erudite', 'm'], ['pratt', 'Oren Pratt', 'candor', 'candor', 'm'], ['sloane', 'Dina Sloane', 'candor', 'candor', 'f'],
    ['fontaine', 'Willa Fontaine', 'amity', 'amity', 'f'], ['alder', 'Rowan Alder', 'amity', 'amity', 'm'],
  ];
  for (const [id, name, from, to, sex] of WALKONS) CANDIDATES.push({ id: 'wo_' + id, name, last: name.split(' ')[1], from, to, sex });
  // (called in reverse alphabetical order by last name)
  CANDIDATES.sort((a, b) => (b.last < a.last ? -1 : b.last > a.last ? 1 : 0));
  // the flags these choices read
  function storyFlags() {
    const F = (n) => !!DV.State.flag(n);
    return {
      daniel_tested: F('daniel_tested'),
      pd_shared: DV.Quests.isDone('protocol_d') && DV.State.data.quests.protocol_d.outcome === 'shared',
      nate_heist: DV.Quests.isDone('initiation') && DV.State.data.quests.initiation.outcome === 'stolen',
      nate_asked: DV.Quests.isDone('initiation') && DV.State.data.quests.initiation.outcome === 'asked',
      bird_returned: DV.Quests.isDone('lost_bird'),
    };
  }
  // the same faces as on Aptitude Day (no name badges today)
  function appearanceOf(c) {
    const def = DV.NPCData.get(c.id);
    if (def) return DV.Character.fromFaction(def.faction, def.sex, def.id, Object.assign({ age: def.age }, JSON.parse(JSON.stringify(def.appearance || {}))));
    return DV.Character.fromFaction(c.from, c.sex || 'm', 'cand:' + c.id);
  }
  function displayName(c) {
    const def = DV.NPCData.get(c.id);
    return def ? def.name : c.name;
  }

  /* ------------------------------ the speech ------------------------------ */
  const SPEECH = [
    'Good morning. Welcome to the Choosing.',
    'Generations ago, this city nearly destroyed itself — not from outside the fence, but from within.',
    'Some said the cause was greed. They gave up wanting things for themselves, and became Abnegation.',
    'Some said it was ignorance. They gave themselves to learning, and became Erudite.',
    'Some said it was the lie. They swore off it for good, and became Candor.',
    'Some said it was violence. They laid it down, and became Amity.',
    'And some said it was fear. They walked straight into it, and became Dauntless.',
    'Today, each of you will choose where you belong. Your blood marks the choice — and the choice is final.',
    'Faction before blood.',
  ];

  /* ------------------------------ the ceremony ------------------------------ */
  DV.Chapter.define('ceremony', {
    zone: 'hub_hall',
    title: 'THE CHOOSING CEREMONY\nTHE HUB · DAY 2 · 10:00',
    day: 2,
    time: '10:00',
    canPass(Ch, lock) { return lock === 'hub_exit' ? Ch.flag('exitOpen') : true; },
    start(Ch, zone, opts) {
      const st = DV.State.data;
      const pl = st.player;
      const up = pl.upbringing;
      Ch.speed = 1;
      DV.Quests.setObj('the_choosing', 'sleep', 'done');
      DV.Quests.activate('the_choosing', 'ceremony', 'The Choosing Ceremony has begun. Wait for your name.');
      // the crowd, faction by faction (keeping two seats for your parents)
      Ch.sections = {};
      for (const f of Object.keys(SECTIONS)) {
        const seats = sectionSeats(f);
        const keep = f === up ? [1, 2] : [];
        const spots = seats.filter((s, i) => keep.indexOf(i) < 0 && (i * 7 + f.length) % 10 < 9).map((s) => ({ x: s.x, z: s.z, rot: s.rot, action: f === 'dauntless' ? 'idle' : 'sit', seatY: 0.45 }));
        Ch.sections[f] = Ch.crowd(spots, { faction: f, prefix: f + '_', seed: 'choosing', adults: true, noShadow: true });
        if (f === up) {
          const mom = Ch.actor({ id: 'mom', name: 'Mom', app: DV.Build2.parentApp('mom'), x: seats[1].x, z: seats[1].z, rot: seats[1].rot, action: f === 'dauntless' ? 'idle' : 'sit' });
          const dad = Ch.actor({ id: 'dad', name: 'Dad', app: DV.Build2.parentApp('dad'), x: seats[2].x, z: seats[2].z, rot: seats[2].rot, action: f === 'dauntless' ? 'idle' : 'sit' });
          Ch.sections[f].push(mom, dad);
          Ch.mom = mom; Ch.dad = dad;
        }
      }
      // the candidates (and you), in their seats
      const fl = storyFlags();
      const seats = candidateSeats();
      const order = CANDIDATES.slice();
      // you take your place in the order by name
      const me = { id: 'player', last: pl.name, player: true };
      const key = (c) => (c.last || '').toLowerCase();
      let at = order.findIndex((c) => key(c) < key(me));
      if (at < 0) at = order.length;
      order.splice(at, 0, me);
      Ch.order = order;
      Ch.initCount = {};
      const mySeatIndex = 4; // front row, centre bench
      let si = 0;
      Ch.cands = order.map((c) => {
        if (c.player) return c;
        if (si === mySeatIndex) si++;
        const seat = seats[si++ % seats.length];
        const to = typeof c.to === 'function' ? c.to(fl) : c.to;
        const a = Ch.actor({ id: c.id, name: displayName(c), app: appearanceOf(c), x: seat.x, z: seat.z, rot: seat.rot, action: 'sit' });
        a.cand = Object.assign({}, c, { to, seat, react: c.react ? c.react(fl, to) : null });
        return a;
      });
      // the speaker
      Ch.speaker = Ch.actor({ id: 'speaker', name: 'Councilor Reed', app: Object.assign(DV.Character.fromFaction('abnegation', 'm', 'councilor-reed', { age: 61 }), { hairColor: '#8b8a86', height: 1.04 }), x: 6, z: 3, rot: 0.5, action: 'idle' });
      // you
      const mySeat = seats[mySeatIndex];
      Ch.mySeat = { id: 'my_seat', x: mySeat.x, z: mySeat.z, rot: mySeat.rot, act: 'sit', seatY: 0.45 };
      DV.Game.sitOn(Ch.mySeat, true);
      DV.Player.pinned = true;
      DV.Game.rig.yaw = mySeat.rot;
      DV.Game.rig.follow(true);
      // a save from after you chose: everyone's already in place, straight to the end
      if ((opts.step === 'after_player' || opts.step === 'exodus') && DV.Build2.chosen()) { this.resumeAfter(Ch, zone); return; }
      Ch.checkpoint('start');
      this.run(Ch, zone);
    },
    resumeAfter(Ch, zone) {
      const mine = DV.Build2.chosen();
      Ch.initCount = {};
      for (const a of Ch.cands) {
        if (a.player) continue;
        const f = a.cand.to;
        const k = (Ch.initCount[f] = (Ch.initCount[f] || 0) + 1) - 1;
        const s = initiateSpot(f, k);
        a.place(s.x, s.z, s.rot);
        a.action = 'idle';
      }
      const k = (Ch.initCount[mine] = (Ch.initCount[mine] || 0) + 1) - 1;
      const spot = initiateSpot(mine, k);
      DV.Player.standUp();
      DV.Player.place(spot.x, spot.z, spot.rot);
      DV.Player.pinned = true;
      DV.Game.rig.yaw = spot.rot;
      DV.Game.rig.follow(true);
      Ch.speaker.place(C.x, 9.7, 0);
      zone.knife.visible = false;
      Ch.setFlag('placed');
      Ch.setFlag('finale');
      this.exodus(Ch, zone);
    },

    run(Ch, zone) {
      const sp = Ch.speaker;
      DV.Audio.setMusic('ceremony');
      const beats = [
        // establishing shots
        () => { Ch.cut(true); Ch.shot([15, 7.5, 32.5], [23, 1.5, 12], true); return 3.2; },
        () => { Ch.shot([12, 6.5, 4], [30, 1.5, 22]); sp.walk([[10, 8], [20, 9.6], [C.x, 9.7]], 1.2, (a) => { a.rot = 0; }); return 3.4; },
        () => { Ch.shot([C.x, 2.2, 15.5], [C.x, 1.7, 9.8]); return 1.6; },
        () => { Ch.cut(false); DV.Game.rig.follow(); },
      ];
      SPEECH.forEach((line, i) => {
        beats.push(() => { Ch.say(sp, line, Math.max(3, line.length / 16)); sp.action = 'talk'; return Math.max(3, line.length / 16) + 0.4; });
        if (i === SPEECH.length - 1) beats.push(() => {
          sp.action = 'idle';
          DV.UI.subtitle('Everyone', 'Faction before blood.', 2.6);
          DV.Audio.play('murmur', { secs: 2.4, volume: 1.4 });
          for (const f in Ch.sections) for (const a of Ch.sections[f].slice(0, 3)) a.say('Faction before blood.', 2.2);
          return 3;
        });
      });
      for (const c of Ch.cands) beats.push((C2) => this.callCandidate(Ch, zone, c));
      beats.push(() => this.finale(Ch, zone));
      Ch.seq(beats, 'ceremony');
    },

    // one name: walk up, cut, choose, react, take their place
    callCandidate(Ch, zone, a) {
      const sp = Ch.speaker;
      if (a.player) return this.playerTurn(Ch, zone);
      const c = a.cand;
      Ch.say(sp, c.last + ', ' + displayName(c).split(' ')[0] + '.', 2.2);
      const bx = BOWLS[c.to];
      let done = false;
      a.walk(routeToTable(c.seat, C.x), 1.5, () => {
        a.rot = Math.PI; a.action = 'cut';
        DV.Audio.play('knife', { x: a.x, z: a.z, range: 30 });
        Ch.after(1.4, () => {
          a.walk([[bx, STAND_Z]], 1.2, () => {
            a.rot = Math.PI; a.action = 'bowl';
            Ch.after(0.9, () => {
              this.drip(Ch, zone, c.to, bx, a);
              this.react(Ch, c.from, c.to, a);
              const r = c.react;
              if (r && r.line) Ch.after(0.6, () => DV.UI.subtitle('', r.line, 5));
              if (r && r.say) Ch.after(r.line ? 2.6 : 0.8, () => Ch.say(a, DV.Dialogue.fill(r.say, {}), 2.6));
              Ch.after(r && r.line ? 3 : 1.4, () => {
                const k = (Ch.initCount[c.to] = (Ch.initCount[c.to] || 0) + 1) - 1;
                const spot = initiateSpot(c.to, k);
                a.action = 'idle';
                a.walk(routeToSection(bx, spot), 1.5, (b) => { b.rot = spot.rot; b.action = c.to === 'dauntless' ? 'cheer' : 'idle'; if (c.to === 'dauntless') Ch.after(2.5, () => { b.action = 'idle'; }); });
                done = true;
              });
            });
          });
        });
      });
      return () => done;
    },

    // blood into the bowl
    drip(Ch, zone, f, bx, who) {
      const drop = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.02), new THREE.MeshBasicMaterial({ color: 0x8a0e0e }));
      drop.position.set(bx, 1.32, STAND_Z - 0.75);
      const o = { mesh: drop, vy: 0, t: 0, update(dt) { this.t += dt; this.vy -= 9 * dt; drop.position.y += this.vy * dt; drop.position.z = U.lerp(STAND_Z - 0.75, TABLE_Z, Math.min(1, this.t * 3)); if (drop.position.y < 0.98) { drop.visible = false; } } };
      zone.group.add(drop);
      Ch.addObject(o);
      o.dispose = () => { if (drop.parent) drop.parent.remove(drop); };
      Ch.after(0.35, () => DV.Audio.play('drip', { into: f, x: bx, z: TABLE_Z, range: 30 }));
    },

    // the hall reacts: the new faction welcomes them; a transfer's old faction goes quiet
    react(Ch, from, to, a, isPlayer) {
      const sec = Ch.sections[to] || [];
      const dauntless = to === 'dauntless';
      for (const x of sec) {
        if (x === Ch.mom || x === Ch.dad) continue;
        const was = x.action;
        x.action = dauntless ? 'cheer' : x.action === 'sit' ? 'sit_clap' : 'clap';
        Ch.after(2.6 + Math.random() * 0.6, () => { x.action = was === 'sit_clap' || was === 'clap' || was === 'cheer' ? (dauntless ? 'idle' : 'sit') : was; });
      }
      const [sx, sz] = P(10.5, SECTIONS[to]);
      if (dauntless) DV.Audio.play('roar', { x: sx, z: sz, range: 60, secs: 3, volume: isPlayer ? 1.3 : 1 });
      else DV.Audio.play('applause', { x: sx, z: sz, range: 60, size: isPlayer ? 1.4 : 1 });
      if (from !== to) {
        const [ox, oz] = P(10.5, SECTIONS[from]);
        DV.Audio.play('murmur', { x: ox, z: oz, range: 60, secs: 2 });
      }
      void a;
    },

    /* ---------------- your turn ---------------- */
    playerTurn(Ch, zone) {
      const sp = Ch.speaker, pl = DV.State.data.player;
      Ch.say(sp, pl.name + '.', 2.4);
      Ch.speed = 1;
      Ch.myTurn = true;
      DV.Audio.play('murmur', { secs: 1.6, volume: 0.6 });
      Ch.after(1.2, () => {
        DV.Player.pinned = false;
        DV.Player.standUp();
        DV.Quests.setObj('the_choosing', 'ceremony', 'done', 'They called your name.');
        DV.Quests.activate('the_choosing', 'choose', 'Walk to the bowls. Take the knife. Choose.');
        // everyone watches you
        for (const x of Ch.actors) if (x !== sp) x.lookAt([C.x, STAND_Z]);
      });
      Ch.interact({
        id: 'cer_knife', kind: 'action', x: C.x, y: 0.95, z: STAND_Z - 0.35, radius: 1.3, label: 'Take the knife', name: 'Ceremonial Knife',
        cond: () => Ch.myTurn && !Ch.flag('cut'),
        onUse: () => this.cutPalm(Ch, zone),
      });
      for (const f of Object.keys(BOWLS)) {
        Ch.interact({
          id: 'cer_bowl_' + f, kind: 'action', x: BOWLS[f], y: 1.0, z: STAND_Z - 0.3, radius: 0.75,
          label: () => 'Hold your hand over the ' + DV.Build2.BOWL[f].what, name: DV.Factions.name(f),
          cond: () => Ch.myTurn && Ch.flag('cut') && !Ch.flag('chose'),
          onUse: () => { Ch.pendingBowl = f; DV.Player.rot = Math.PI; DV.Player.syncModel(); Ch.scene('ceremony_bowl'); },
        });
      }
      return () => Ch.flag('placed');
    },
    cutPalm(Ch, zone) {
      Ch.setFlag('cut');
      zone.knife.visible = false;
      DV.Player.pinned = true;
      DV.Player.rot = Math.PI;
      DV.Player.place(C.x, STAND_Z, Math.PI);
      Ch.cut(true);
      DV.Player.cineAction = 'cut';
      Ch.shot([C.x + 1.3, 1.65, STAND_Z + 1.2], [C.x, 1.1, STAND_Z - 0.2]);
      DV.Audio.play('knife');
      Ch.seq([
        () => 0.8,
        () => { DV.UI.subtitle('', DV.State.data.aptitude.divergent ? '[The blade stings. A bright line of blood. Somewhere behind you, your parents are watching — and nobody in this hall knows what you are.]' : '[The blade stings. A bright line of blood wells up across your palm.]', 4); return 2.2; },
        () => { DV.Player.cineAction = null; Ch.cut(false); DV.Player.pinned = false; DV.UI.notify('Stand at a bowl and hold out your hand.', 'info'); },
      ], 'cut');
    },
    choose(Ch, zone, f) {
      Ch.setFlag('chose');
      const pl = DV.State.data.player;
      const from = pl.upbringing;
      const bx = BOWLS[f];
      DV.Player.place(bx, STAND_Z, Math.PI);
      DV.Player.pinned = true;
      Ch.cut(true);
      DV.Player.cineAction = 'bowl';
      Ch.shot([bx - 1.4, 1.5, STAND_Z + 1.1], [bx, 0.95, TABLE_Z]);
      Ch.seq([
        () => 0.9,
        () => { this.drip(Ch, zone, f, bx, null); return 0.8; },
        () => {
          DV.Build2.setFaction(f);
          this.react(Ch, from, f, null, true);
          DV.Quests.setObj('the_choosing', 'choose', 'done', 'You let your blood fall ' + DV.Build2.BOWL[f].verb + '. You are ' + DV.Factions.name(f) + '.');
          Ch.shot([C.x, 6, STAND_Z + 9], [C.x, 1.4, STAND_Z]);
          return 1.6;
        },
        () => this.parents(Ch, from, f),
        () => {
          DV.Player.cineAction = null;
          Ch.cut(false);
          DV.Player.pinned = false;
          const k = (Ch.initCount[f] = (Ch.initCount[f] || 0) + 1) - 1;
          const spot = initiateSpot(f, k);
          Ch.mySpot = spot;
          // point the compass at your place among the initiates
          const obj = DV.QuestDB.get('the_choosing').objectives.find((o) => o.id === 'follow');
          obj.target = { x: spot.x, z: spot.z };
          DV.Quests.activate('the_choosing', 'follow', 'Go and stand with the ' + DV.Factions.name(f) + ' initiates.');
          // the others are already standing shoulder to shoulder: get close and you're with them
          // (the last step is walked for you, through the crowd); or press E; or, if you dawdle, you're shown
          Ch.joinT = 0;
          Ch.interact({ id: 'cer_join', kind: 'action', x: spot.x, y: 1.2, z: spot.z, radius: 3.2, label: 'Take your place', name: DV.Factions.name(f) + ' initiates', cond: () => !Ch.flag('joining'), onUse: () => this.joinInitiates(Ch) });
          return () => {
            if (Ch.flag('joined')) return true;
            if (!Ch.flag('joining') && Math.hypot(DV.Player.x - spot.x, DV.Player.z - spot.z) < 2.6) this.joinInitiates(Ch);
            return false;
          };
        },
        () => {
          DV.Player.rot = spot2rot(Ch.mySpot);
          DV.Player.syncModel();
          DV.Player.pinned = true;
          Ch.setFlag('placed');
          Ch.myTurn = false;
          DV.Game.rig.yaw = DV.Player.rot;
          for (const x of Ch.actors) x.lookAt(null);
          Ch.checkpoint('after_player');
        },
      ], 'mine');
    },
    // the last step into your place among the initiates (a short walk the ceremony does for you)
    joinInitiates(Ch) {
      if (Ch.flag('joining') || !Ch.mySpot) return;
      Ch.setFlag('joining');
      Ch.removeInteract('cer_join');
      const s = Ch.mySpot, G = DV.Game;
      DV.Player.pinned = true;
      // the scene has you for a moment (no bars): a few steps through the crowd, which won't push back
      if (G.state === 'playing') G.state = 'cutscene';
      DV.Input.clearMovement();
      Ch.walkPlayer([[s.x, s.z]], 1.6, () => {
        DV.Player.place(s.x, s.z, s.rot);
        if (G.state === 'cutscene' && !Ch.cutscene) G.state = 'playing';
        Ch.setFlag('joined');
      });
    },
    // your parents, in your old section
    parents(Ch, from, f) {
      const mom = Ch.mom, dad = Ch.dad;
      if (!mom) return 0;
      const fl = (n) => DV.State.flag(n);
      const blessing = fl('home_asked_leave') || fl('home_parent_transfer');
      let line;
      if (f === from) { mom.action = mom.action === 'sit' ? 'sit_clap' : 'clap'; dad.action = dad.action === 'sit' ? 'sit_clap' : 'clap'; line = '[In the ' + DV.Factions.name(from) + ' section, your parents are smiling. Your mother is crying a little, which she will deny.]'; }
      else if (blessing) { mom.action = mom.action === 'sit' ? 'sit_clap' : 'clap'; line = '[You find your parents in the ' + DV.Factions.name(from) + ' section. Your father nods once, slowly. Your mother is clapping — the only one in her row.]'; }
      else { dad.action = 'arms_crossed'; line = '[You find your parents in the ' + DV.Factions.name(from) + ' section. Your mother has her hand over her mouth. Your father is looking at the floor.]'; }
      DV.UI.subtitle('', line, 5);
      Ch.shot([mom.x + (C.x - mom.x) * 0.25, 2.2, mom.z + (C.z - mom.z) * 0.25], [mom.x, 1.1, mom.z]);
      return 3.4;
    },

    /* ---------------- the end ---------------- */
    finale(Ch, zone) {
      const sp = Ch.speaker;
      Ch.speed = 1;
      Ch.say(sp, 'Please welcome — your initiates.', 3);
      return 0;
    },

    update(Ch, dt, zone) {
      // still wandering after you chose? a reminder, then you're shown to your place
      if (Ch.mySpot && Ch.flag('chose') && !Ch.flag('joining') && !Ch.flag('placed') && DV.Game.state === 'playing') {
        Ch.joinT = (Ch.joinT || 0) + dt;
        if (Ch.joinT > 25 && !Ch.flag('join_nudged')) { Ch.setFlag('join_nudged'); DV.UI.notify('Your new faction is waiting for you — go and stand with them (follow the compass).', 'info'); }
        if (Ch.joinT > 60) { DV.UI.notify('A ' + DV.Factions.name(DV.Build2.chosen()) + ' initiate waves you over.', 'info'); this.joinInitiates(Ch); }
      }
      // hurry the names along (not during your own turn)
      const canHurry = !Ch.myTurn && !DV.Dialogue.isActive() && !Ch.flag('finale') && !Ch.cutscene;
      Ch.speed = canHurry && DV.Input.down('Space') ? 3.5 : 1;
      Ch.hint = canHurry ? (Ch.speed > 1 ? 'Hurrying… (release Space)' : 'Hold Space to hurry the ceremony along') : null;
      // the finale runs once the last name is called and everyone has taken their place
      if (!Ch.flag('finale') && Ch.seqs.every((s) => s.name !== 'ceremony') && Ch.flag('placed')) {
        const walking = Ch.cands.some((a) => a.walk && a.moving);
        if (!walking) { Ch.setFlag('finale'); this.exodus(Ch, zone); }
      }
    },
    // the factions file out — the Dauntless run for it
    exodus(Ch, zone) {
      const mine = DV.Build2.chosen();
      Ch.setFlag('exitOpen');
      DV.Quests.setObj('the_choosing', 'follow', 'done');
      DV.Quests.complete('the_choosing', mine);
      DV.Quests.start('new_faction');
      const door = [23, 33.2];
      const out = (a, delay, run) => Ch.after(delay, () => a.walk([[a.x, Math.max(a.z, 26)], [door[0] + (Math.random() - 0.5) * 2, 30.5], [door[0], 36.5]], run ? 4.4 : 1.4, (b) => { b.model.root.visible = false; b.ghost = true; }));
      // Dauntless first, at a run, whooping
      let d = 0.3;
      for (const a of Ch.sections.dauntless || []) { a.action = 'cheer'; out(a, (d += 0.15), true); }
      for (const a of Ch.cands) if (a.cand && a.cand.to === 'dauntless') { out(a, (d += 0.2), true); }
      DV.Audio.play('roar', { secs: 3.5, volume: 1.2 });
      DV.Audio.setMusic(mine === 'dauntless' ? 'dauntless' : 'calm');
      if (mine === 'dauntless') {
        DV.UI.subtitle('Nate Russo', 'Come ON, ' + DV.State.data.player.name + '! Run!', 3);
        DV.Player.pinned = false;
        DV.Quests.activate('new_faction', 'arrive', 'Run with the Dauntless — out of the Hub and down to the tracks.');
      } else {
        // the others follow at a walk; yours includes you
        let t = 5;
        for (const f of ['abnegation', 'amity', 'candor', 'erudite']) {
          for (const a of Ch.sections[f] || []) out(a, (t += 0.25), false);
          for (const a of Ch.cands) if (a.cand && a.cand.to === f) out(a, (t += 0.2), false);
        }
        Ch.after(f2delay(mine), () => {
          DV.Player.pinned = false;
          DV.Quests.activate('new_faction', 'arrive', 'Follow the ' + DV.Factions.name(mine) + ' out of the Hub.');
          DV.UI.notify('Follow your new faction out through the doors.', 'info');
        });
      }
      Ch.checkpoint('exodus');
      // through the doors → the next chapter
      Ch.interact({
        id: 'cer_leave', kind: 'action', x: 23, y: 1.2, z: 34.6, radius: 2.4, label: mine === 'dauntless' ? 'Run for it' : 'Leave with your faction', name: 'Stairs',
        onUse: () => this.leave(Ch),
      });
    },
    onTrigger(Ch, id, inside) { void Ch; void id; void inside; },
    leave(Ch) {
      if (Ch.flag('left')) return;
      Ch.setFlag('left');
      const mine = DV.Build2.chosen();
      DV.Player.pinned = false;
      DV.Chapter.goto(mine === 'dauntless' ? 'dauntless_run' : 'arrival_' + mine);
    },
    onDialogueEnd(Ch, e) { void Ch; void e; },
  });
  const spot2rot = (s) => s.rot;
  const f2delay = () => 6;

  // the moment at the bowl
  const BOWL_LINES = {
    abnegation: 'The stones are plain and grey and cool.',
    erudite: 'The water is perfectly still. You can see your hand in it.',
    candor: 'The glass catches every light in the hall.',
    amity: 'The earth smells like rain on the orchard.',
    dauntless: 'The coals hiss and spit. Behind you, the Dauntless are already on their feet.',
  };
  DV.DialogueDB.add('ceremony_bowl', {
    entry: 'start',
    nodes: {
      start: {
        speaker: () => DV.Factions.name(DV.Chapter.pendingBowl).toUpperCase(),
        faction: () => DV.Chapter.pendingBowl,
        text: () => {
          const f = DV.Chapter.pendingBowl;
          const st = DV.State.data, apt = st.aptitude, pl = st.player;
          const lines = ['[Blood beads along the cut. Below your hand: ' + DV.Build2.BOWL[f].what + '. ' + BOWL_LINES[f] + ']'];
          if (apt.divergent) lines.push('Divergent. Claire\'s word. ' + (apt.results && apt.results.indexOf(f) >= 0 ? 'This was one of the ones the test kept finding in you.' : 'The test couldn\'t make up its mind about you. Neither can you.'));
          else if (apt.result === f) lines.push('Your test said ' + DV.Factions.name(f) + '. It would be the easy thing.');
          else if (apt.result) lines.push('Your test said ' + DV.Factions.name(apt.result) + '. Not this.');
          if (f === pl.upbringing) lines.push('Your parents are watching from the ' + DV.Factions.name(f) + ' section. You could stay. You could go home tonight.');
          else lines.push('If you do this, you leave ' + DV.Factions.name(pl.upbringing) + ' — and your family — behind. Faction before blood.');
          if (st.story && st.story.leaning === f) lines.push('It\'s the one you kept coming back to, last night.');
          return lines.join('\n\n');
        },
        choices: [
          { text: () => 'Let your blood fall ' + DV.Build2.BOWL[DV.Chapter.pendingBowl].verb + '.', end: true, effect: () => { const Ch = DV.Chapter; Ch.after(0.05, () => Ch.script.choose(Ch, DV.World.current, Ch.pendingBowl)); } },
          { text: 'Not this one.', end: true },
        ],
      },
    },
  });

  // the initiates who chose faction f at the ceremony, dressed for their new faction
  function initiatesOf(f) {
    const fl = storyFlags();
    return CANDIDATES.filter((c) => (typeof c.to === 'function' ? c.to(fl) : c.to) === f).map((c) => {
      const def = DV.NPCData.get(c.id);
      // same person (face, skin, hair, build), new faction's clothes
      let app;
      if (def) {
        const keep = { age: def.age };
        for (const k of ['build', 'face', 'skin', 'hair', 'hairColor', 'hairDye', 'eyes', 'height', 'freckles']) if (def.appearance && def.appearance[k] !== undefined) keep[k] = def.appearance[k];
        app = DV.Character.fromFaction(f, def.sex, def.id + ':' + f, keep);
      } else app = DV.Character.fromFaction(f, c.sex || 'm', 'init:' + c.id + f);
      return { id: c.id, name: def ? def.name : c.name, from: c.from, app };
    });
  }
  // which faction a candidate chose at the ceremony (depends on Aptitude Day)
  function choiceOf(id) {
    const c = CANDIDATES.find((x) => x.id === id);
    if (!c) return null;
    return typeof c.to === 'function' ? c.to(storyFlags()) : c.to;
  }
  // how a candidate looks in faction f's clothes (the same face as at the ceremony)
  function initiateApp(id, f) {
    const c = CANDIDATES.find((x) => x.id === id);
    const def = DV.NPCData.get(id);
    if (def) {
      const keep = { age: def.age };
      for (const k of ['build', 'face', 'skin', 'hair', 'hairColor', 'hairDye', 'eyes', 'height', 'freckles']) if (def.appearance && def.appearance[k] !== undefined) keep[k] = def.appearance[k];
      return DV.Character.fromFaction(f, def.sex, def.id + ':' + f, keep);
    }
    return DV.Character.fromFaction(f, (c && c.sex) || 'm', 'init:' + id + f);
  }
  DV.Hub = { C, SECTIONS, BOWLS, CANDIDATES, sectionSeats, candidateSeats, initiateSpot, storyFlags, initiatesOf, choiceOf, initiateApp };
})();
