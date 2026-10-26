/* ==========================================================================
   DIVERGENT — Capture the Flag: the night game at the old pier
   The night of Day 3, the class rides the train out to the dead fairground
   at the end of Lake Street, where the old Ferris wheel stands on its pier
   out in the marsh. Two teams: Mark Rivera's and Shay Morrow's. Paint
   markers that sting like a bee and numb the arm for an hour. Shay's team
   hides its flag somewhere in the fairground; Mark's keeps its own on the
   pier, under the wheel. Somebody has to get high enough to see.

   The place is the real one (the same coordinates as the city's: the jetty,
   the pier and the wheel are built by the same code, js/game/waterfront.js,
   and the climb is its climb), with the fairground on the shore around it
   the way it is at night: a carousel with no horses left, the bumper-car
   pavilion, a coaster that ends in mid-air, containers, ticket booths.

   Teams have roles: guards stay on their flag, raiders go for the other
   one by the jetty or the old causeway through the reeds, Mark goes where
   you go. Anyone hit is out: they walk back to their own end with their
   hands up and come back in a while. Take their flag and it's over; let
   them reach yours and it's over the other way.

     DV.CTF.district(dt)   the compound's side: Mark's call at dinner, the train at 21:00 (Day 3)
     DV.CTF.start()         the chapter 'ctf'
     DV.CTF.devStart()      straight to the train (the dev menu, QA)
   Saved in DV.State.data.story.stage2.ctf.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const T = U.parseTime;
  const W = () => DV.Waterfront.parts;
  const st = () => DV.Fear.st();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // the shore (the fairground) and the ways out over the water
  const SHORE = [348, 36, 417, 132];
  const LINK = [409, 104.5, 417.5, 109.5]; // (shore to the landing)
  const OURS = 0x46d8ff, THEIRS = 0xff8a2a; // the paint
  const SPOTS = { pavilion: [365, 112], coaster: [357, 58], carousel: [380, 84] };
  const SPOT_NAMES = { pavilion: 'in the bumper-car pavilion', coaster: 'under the end of the coaster', carousel: 'on the carousel' };

  /* ------------------------------ the place ------------------------------ */
  // the pier and the way across to it are the city's; the causeway through the reeds is the night game's own
  let causeway = null;
  function walkable(x, z) {
    const P = W();
    return P.inR(x, z, SHORE, 0.2) || P.inR(x, z, LINK, 0.2) || P.inR(x, z, [P.WALK[0], P.WALK[1], P.WALK[2] + 1, P.WALK[3]], 0.25) || P.inR(x, z, P.PLAT, 0.25) ||
      P.inR(x, z, [P.STEPS[0] - 1, P.STEPS[1], P.STEPS[2] + 1.5, P.STEPS[3]], 0.3) || P.onPier(x, z, 0.6) || P.inR(x, z, P.LAND, 0.25) || (causeway && P.inR(x, z, causeway, 0.15));
  }
  DV.Zones.define('ctf_pier', {
    name: 'The Old Pier', region: 'The fairground at the end of Lake Street · night',
    chapter: true, noDiscover: true,
    bounds: { x0: 340, z0: 24, x1: 480, z1: 150 },
    buildingHeight: 1,
    fog: { color: 0x0b0f18, near: 30, far: 190 },
    sky: { top: 0x03050a, horizon: 0x141a28, ground: 0x05070a, skyline: false, clouds: 0.5, glow: 0.05 },
    exterior: { sunDir: [0.3, 0.8, 0.2], sunColor: [0.14, 0.15, 0.2], ambient: [0.16, 0.17, 0.22] },
    charLight: { ambient: 0.5, hemi: 0.35, dir: 0.35, dirColor: 0xa8b8ff },
    ambience: 'outdoor', reverb: 'exterior',
    rooms: [{ id: 'fairground', name: 'The Old Fairground', x0: SHORE[0], z0: SHORE[1], x1: SHORE[2], z1: SHORE[3], exterior: true, floor: 'gravel', edge: 'none',
      light: { ambient: [0.2, 0.21, 0.27], list: [[392, 84, 0.9, 4.5], [365, 110, 0.8, 4], [380, 64, 0.6, 4], [404, 106, 0.6, 4]], range: 13, color: [1, 0.82, 0.55] } }],
    doors: [], props: [],
    spawn: { x: 376, z: 40, rot: 0 },
    build(ctx) {
      const zone = ctx.zone, P = W();
      const CM = DV.CityMap;
      // the city behind, lit for the night
      const city = DV.City.build({
        seed: CM.seed, campus: [336, 22, 424, 152], centre: CM.centre, gridX: CM.gridX(), gridZ: CM.gridZ(), radius: CM.radius, hub: CM.hub, marshX: 420,
        haze: 0x101624, hazeK: 0.0036, ambient: 0x2a2e3c, lit: 1, shadowAmt: 0, cloudLight: 0x262a36, cloudDark: 0x0d0f15, puffTint: 0x30343e,
      });
      ctx.add(city.group); zone.city = city;
      ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
      // the water, dark, under the jetty and round the pier
      const water = new THREE.Mesh(new THREE.PlaneGeometry(460, 360), new THREE.MeshBasicMaterial({ color: 0x0a1218, fog: true }));
      water.rotation.x = -Math.PI / 2; water.position.set(417 + 230, -0.05, 90); ctx.add(water);
      const M = new DV.Vehicles.MB();
      P.buildJetty(zone, M);
      P.buildReeds(M, U.rng('ctf-reeds'));
      { const g = new THREE.BoxGeometry(2 * P.PIER.hl, 1.2, 2 * P.PIER.hw); g.rotateY(P.PIER.face); g.translate(P.PIER.x, P.PIER.top - 0.6, P.PIER.z); M.add(g, [0.34, 0.33, 0.31]); }
      P.buildLanding(zone, M);
      const wheel = P.buildWheel(M, {});
      zone.ladder = wheel.ladder;
      const wl = new THREE.Mesh(wheel.lights.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
      ctx.add(wl); zone.wheelLights = wl;
      // the causeway: an old boardwalk on piles from the landing out to the north end of the pier, half its boards gone
      const c0 = P.pierXZ(24, -10.6);
      causeway = [P.LAND[2] - 0.3, c0[1] - 1.6, c0[0] + 0.6, c0[1] + 1.6];
      for (let x = causeway[0]; x < causeway[2]; x += 0.5) { if (((x * 7.7) % 1) < 0.12) continue; M.box(x + 0.22, P.DECK - 0.04, c0[1], 0.44, 0.08, 3.0, P.mixC([0.36, 0.3, 0.23], [0, 0, 0], ((x * 3.1) % 1) * 0.3)); }
      for (let x = causeway[0] + 1; x < causeway[2]; x += 2.6) for (const dz of [-1.5, 1.5]) { const g = new THREE.CylinderGeometry(0.12, 0.13, 1.1, 6); g.translate(x, -0.45, c0[1] + dz); M.add(g, [0.18, 0.15, 0.12]); }
      // the shore, the link to the landing
      M.box((LINK[0] + LINK[2]) / 2, P.DECK - 0.04, (LINK[1] + LINK[3]) / 2, LINK[2] - LINK[0], 0.08, LINK[3] - LINK[1], [0.36, 0.3, 0.24]);
      // the fairground
      fairground(zone, M);
      // the train tracks along the south fence, where the night begins
      for (let x = 200; x < 420; x += 0.9) M.box(x, 0.06, 30.3, 0.25, 0.12, 2.6, [0.22, 0.18, 0.15]);
      for (const z of [29.6, 31.0]) M.box(310, 0.18, z, 220, 0.12, 0.1, [0.42, 0.42, 0.44]);
      ctx.add(new THREE.Mesh(M.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
      // where you can stand: the shore, the jetty, the pier (its deck 1.15 m up), the steps between
      zone.walkable = walkable;
      zone.groundAt = (x, z) => (P.inR(x, z, P.STEPS, -0.05) ? P.stepY(x) : P.onPier(x, z, -0.2) ? P.PIER.top : 0);
      // the flags, glowing in the dark the way the paint does
      zone.flags = {};
      for (const [team, col] of [['ours', OURS], ['theirs', THEIRS]]) {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6), new THREE.MeshBasicMaterial({ color: 0x9a9a9a, fog: true })); pole.position.y = 1.3; g.add(pole);
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55, 6, 2), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, fog: false })); cloth.position.set(0.47, 2.25, 0); g.add(cloth);
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); glow.position.y = 2.1; g.add(glow);
        // and a column of light over it, the way the paint glows: you can see it from the top of the wheel
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 16, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        beam.position.y = 8; g.add(beam);
        ctx.add(g);
        zone.flags[team] = { g, cloth, glow, beam };
      }
      // the paint: every ball in flight in one mesh, every splat on the ground in another
      const ballGeo = new THREE.SphereGeometry(0.05, 6, 4);
      const balls = new THREE.InstancedMesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), 48);
      balls.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(48 * 3), 3);
      balls.frustumCulled = false; balls.count = 0; ctx.add(balls);
      const splatGeo = new THREE.CircleGeometry(0.22, 8); splatGeo.rotateX(-Math.PI / 2);
      const splats = new THREE.InstancedMesh(splatGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, fog: true }), 60);
      splats.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(60 * 3), 3);
      splats.frustumCulled = false; splats.count = 0; ctx.add(splats);
      zone.paint = { balls, splats, n: 0 };
    },
    onExit(zone) { causeway = null; void zone; },
  });
  // the dead fairground: carousel, pavilion, coaster, booths, containers, fence and lamps
  function fairground(zone, M) {
    const C = zone.colliders;
    const box = (x, z, w, d, h, col, solid) => { M.box(x, h / 2, z, w, h, d, col); if (solid !== false) C.add(x - w / 2, z - d / 2, x + w / 2, z + d / 2, { y1: h, tag: 'prop' }); };
    const rust = [0.38, 0.24, 0.16], paint = [0.5, 0.18, 0.15], steel = [0.3, 0.31, 0.33];
    // the fence round it (with the gate onto the jetty and the gap to the landing)
    for (let z = SHORE[1]; z <= SHORE[3]; z += 2.5) M.box(SHORE[0] + 0.1, 1.1, z, 0.08, 2.2, 0.08, steel);
    M.box(SHORE[0] + 0.1, 2.1, (SHORE[1] + SHORE[3]) / 2, 0.04, 0.06, SHORE[3] - SHORE[1], steel);
    for (let x = SHORE[0]; x <= SHORE[2]; x += 2.5) { M.box(x, 1.1, SHORE[1] + 0.1, 0.08, 2.2, 0.08, steel); M.box(x, 1.1, SHORE[3] - 0.1, 0.08, 2.2, 0.08, steel); }
    // the gate arch onto the jetty, its sign long gone
    M.box(408, 2.6, 80.6, 0.4, 5.2, 0.4, paint); M.box(408, 2.6, 87.4, 0.4, 5.2, 0.4, paint); M.box(408, 5.0, 84, 0.5, 0.8, 7.2, paint);
    for (let k = 0; k < 9; k++) M.box(408.3, 5.0, 80.8 + k * 0.8, 0.05, 0.2, 0.2, k % 3 === 1 ? [1, 0.85, 0.5] : [0.25, 0.2, 0.15], k % 3 === 1 ? { emit: true } : undefined);
    // the carousel: a round deck, a centre post, a canopy, three horses left of thirty
    { const g = new THREE.CylinderGeometry(6, 6, 0.4, 24); g.translate(380, 0.2, 84); M.add(g, [0.45, 0.38, 0.3]); }
    { const g = new THREE.CylinderGeometry(0.8, 0.8, 4.4, 10); g.translate(380, 2.2, 84); M.add(g, [0.6, 0.5, 0.3]); C.add(379.2, 83.2, 380.8, 84.8, { y1: 4.4, tag: 'prop' }); }
    { const g = new THREE.ConeGeometry(6.6, 1.8, 24, 1, true); g.translate(380, 5.3, 84); M.add(g, [0.5, 0.2, 0.18]); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; M.box(380 + Math.cos(a) * 5.6, 2.3, 84 + Math.sin(a) * 5.6, 0.08, 4.0, 0.08, [0.7, 0.6, 0.35]); }
    for (const a of [0.4, 2.3, 4.4]) { const x = 380 + Math.cos(a) * 4.2, z = 84 + Math.sin(a) * 4.2; M.box(x, 1.1, z, 0.3, 0.5, 1.1, [0.85, 0.82, 0.75]); M.box(x, 1.45, z + 0.45, 0.22, 0.45, 0.25, [0.85, 0.82, 0.75]); }
    // the bumper-car pavilion: a roof on posts, the cars dead where they stopped
    for (const [x, z] of [[358, 105], [372, 105], [358, 118], [372, 118], [365, 105], [365, 118]]) box(x, z, 0.35, 0.35, 4.2, steel);
    M.box(365, 4.3, 111.5, 15, 0.25, 14, [0.24, 0.22, 0.22]);
    for (const [x, z, r] of [[361, 108, 0.3], [368, 109, 1.9], [362, 115, 2.6], [369, 114, 0.9]]) { M.push(x, 0, z, r); M.box(0, 0.35, 0, 1.2, 0.5, 1.8, [0.6, 0.1, 0.08]); M.box(0, 0.7, -0.3, 0.9, 0.3, 0.6, [0.15, 0.15, 0.15]); M.pop(); C.add(x - 0.8, z - 0.8, x + 0.8, z + 0.8, { y1: 0.8, tag: 'prop' }); }
    // the coaster: track on stilts, rising, and stopping in mid-air
    for (let k = 0; k < 9; k++) { const x = 352 + k * 2.6, h = 1.2 + k * 0.9; M.box(x, h / 2, 62, 0.25, h, 0.25, rust); M.box(x, h, 62, 2.7, 0.14, 1.2, rust); if (k % 2 === 0) C.add(x - 0.2, 61.8, x + 0.2, 62.2, { y1: h, tag: 'prop' }); }
    // ticket booths and the old stalls
    for (const [x, z] of [[396, 58], [400, 58], [404, 58]]) { box(x, z, 2.2, 2.2, 2.6, [0.45, 0.32, 0.22]); M.box(x, 2.75, z, 2.6, 0.3, 2.6, paint); }
    for (const [x, z] of [[394, 112], [399, 112]]) { box(x, z, 3, 2, 2.4, [0.32, 0.4, 0.3]); M.box(x, 2.6, z - 1.2, 3.2, 0.1, 1.2, [0.6, 0.55, 0.3]); }
    // containers to hide behind
    for (const [x, z, w, d, col] of [[395, 100, 2.5, 6, [0.25, 0.32, 0.4]], [392, 70, 6, 2.5, [0.5, 0.25, 0.15]], [370, 93, 6, 2.5, [0.3, 0.38, 0.25]], [355, 86, 2.5, 6, [0.42, 0.35, 0.2]], [388, 120, 6, 2.5, [0.25, 0.25, 0.3]], [372, 48, 6, 2.5, [0.45, 0.2, 0.2]]]) box(x, z, w, d, 2.6, col);
    // a few lamps still lit
    for (const [x, z] of [[392, 84], [365, 110], [380, 64], [404, 106]]) { M.box(x + 2.2, 2.2, z + 2.2, 0.12, 4.4, 0.12, [0.15, 0.15, 0.15]); M.box(x + 2.2, 4.4, z + 2.2, 0.4, 0.2, 0.4, [1, 0.85, 0.55], { emit: true }); }
  }

  /* ------------------------------ the route network (for the AI) ------------------------------ */
  function nodes() {
    const P = W(), pc = P.pierXZ(0, 0), pn = P.pierXZ(22, 0), ps = P.pierXZ(-14, 0), cwE = P.pierXZ(24, -8);
    const c0 = P.pierXZ(24, -10.6);
    return {
      flagO: P.pierXZ(-16, -1), guardO1: P.pierXZ(-13, 2.5), guardO2: P.pierXZ(-13, -4), pc, pn, ps, cwE, cwW: [P.LAND[2] - 1, c0[1]],
      st: [447.6, 84], sb: [441.5, 84], pl: [438, 84], j1: [423, 84], j0: [411.5, 84], g: [404, 84],
      l1: [427, 108], l0: [413, 107], fn: [389, 97], fs: [389, 72], cn: [380, 93.5], cs: [380, 74.5], wn: [366, 98], ws: [365, 72], pav: [365, 111.5], coa: [357, 56.5], west: [354, 77], car: [380, 79],
    };
  }
  const EDGES = [['flagO', 'ps'], ['ps', 'pc'], ['pc', 'pn'], ['pn', 'cwE'], ['cwE', 'cwW'], ['cwW', 'l1'], ['l1', 'l0'], ['l0', 'g'], ['pc', 'st'], ['st', 'sb'], ['sb', 'pl'], ['pl', 'j1'], ['j1', 'j0'], ['j0', 'g'],
    ['g', 'fn'], ['g', 'fs'], ['fn', 'cn'], ['fs', 'cs'], ['cn', 'wn'], ['cs', 'ws'], ['wn', 'pav'], ['ws', 'coa'], ['wn', 'west'], ['ws', 'west'], ['cs', 'car'], ['fn', 'pav'], ['flagO', 'guardO1'], ['flagO', 'guardO2'], ['ps', 'guardO1'], ['ps', 'guardO2']];
  function route(N, from, to, avoid) {
    const adj = {};
    for (const [a, b] of EDGES) { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }
    const prev = { [from]: null }, q = [from];
    while (q.length) { const n = q.shift(); if (n === to) break; for (const m of adj[n] || []) if (!(m in prev) && m !== avoid) { prev[m] = n; q.push(m); } }
    if (!(to in prev)) return null;
    const out = []; for (let n = to; n; n = prev[n]) out.unshift(n);
    return out;
  }
  const nearestNode = (N, x, z) => { let best = null, bd = 1e9; for (const k in N) { const d = Math.hypot(N[k][0] - x, N[k][1] - z); if (d < bd) { bd = d; best = k; } } return best; };

  /* ------------------------------ the game ------------------------------ */
  const CTF = {
    st() { const s = st(); return s.ctf || (s.ctf = { done: false }); },
    // the compound: Mark announces it at dinner on Day 3; the train leaves from the training passage at 21:00
    district() {
      if (DV.Clock.day() !== 3 || !DV.Initiation || !DV.Initiation.active()) return;
      const m = DV.Clock.minutes(), s = this.st();
      if (s.done) return;
      if (m >= T('19:10') && !s.called) {
        s.called = true;
        DV.Audio.play('chime');
        setTimeout(() => DV.UI.subtitle('Mark Rivera', 'Initiates! Tonight we play a game. Training Passage, nine o\'clock. Wear black. Everyone already does.', 6), 900);
        if (!DV.Quests.started('capture_flag')) { DV.Quests.start('capture_flag'); }
      }
      if (s.called && !s.missed && m >= T('20:40') && m < T('21:25') && Math.hypot(DV.Player.x - 24.5, DV.Player.z + 12.5) < 3.4 && DV.Game.state === 'playing' && !DV.StageOne.seqs.length) {
        s.missed = true; // (one go: the chapter takes it from here)
        const mk = DV.NPCs.get('d_mark');
        if (mk && mk.present) { mk.say('There you are. Train\'s coming. Run!', 3); }
        DV.UI.subtitle('Mark Rivera', 'There you are. Train\'s coming. Run!', 3);
        setTimeout(() => this.start(), 1800);
      }
      if (s.called && !s.missed && m >= T('21:25')) {
        s.missed = true;
        DV.Quests.fail('capture_flag', 'The train left at nine without you. The class came back after midnight, soaked in paint and loud about it.');
      }
    },
    waitStop(now) {
      const s = this.st();
      if (DV.Clock.day() !== 3 || s.done || !s.called || s.missed) return null;
      return now < T('20:45') ? { t: T('20:45'), why: 'The train for the night game leaves the Training Passage at nine.' } : null;
    },
    onArrive(opts) {
      if (opts.then !== 'ctf_back') return;
      const s = this.st();
      DV.StageOne.after(2.0, () => {
        DV.UI.subtitle('', s.won ? '[The whole class comes down the passage soaked in blue paint, still shouting. Somebody has the orange flag round their neck like a scarf.]' : '[The class comes down the passage in twos and threes, orange paint on everybody, nobody talking much.]', 6);
        DV.Save.write('auto');
      });
    },
    start() { DV.Chapter.start('ctf', { fadeOut: 1400, fadeIn: 1400 }); },
    devStart(o) {
      o = o || {};
      const st0 = DV.State.data, a = st0.aptitude;
      if (a.status !== 'complete') { a.status = 'complete'; a.result = a.result || 'dauntless'; a.recordedAs = a.recordedAs || a.result; }
      for (const f of ['checked_in', 'security_cleared', 'results_discussed']) DV.State.setFlag(f);
      if (DV.Build2.chosen() !== 'dauntless') DV.Build2.setFaction('dauntless');
      DV.Build2.dressFor('dauntless');
      st0.story = st0.story || {};
      st0.story.dauntlessName = st0.story.dauntlessName || st0.player.name;
      st0.player.district = 'dauntless';
      st0.world.day = 3; st0.world.time = T('21:00');
      const s = this.st(); s.called = true; s.missed = true; s.done = false;
      if (!DV.Quests.started('capture_flag')) DV.Quests.start('capture_flag');
      DV.Chapter.start('ctf', { instant: true, step: o.play ? 'play' : undefined });
    },
    // who's on which team: the class, alternately, by the board (Mark picks you first)
    teams() {
      const I = DV.Initiation, rows = I.rankings().filter((r) => r.id !== 'player');
      const ours = [], theirs = [];
      rows.forEach((r, i) => (i % 2 ? ours : theirs).push(r.id));
      // Josh goes to Shay, the way it was always going to be
      const jo = ours.indexOf('d_josh'); if (jo >= 0) { ours.splice(jo, 1); theirs.unshift('d_josh'); const t = theirs.pop(); if (t) ours.push(t); }
      return { ours: ours.slice(0, 4), theirs: theirs.slice(0, 4) };
    },
  };

  /* ------------------------------ the paint ------------------------------ */
  function fire(Ch, from, dir, team, by) {
    Ch.balls.push({ x: from.x, y: from.y, z: from.z, vx: dir.x * 30, vy: dir.y * 30 + 0.4, vz: dir.z * 30, team, by, t: 0 });
    DV.Audio.play('paint', { x: from.x, z: from.z, volume: by === 'player' ? 0.9 : 0.6 });
  }
  function splat(Ch, x, y, z, team) {
    const P = Ch.zone.paint, m = new THREE.Matrix4(), i = P.n++ % 60;
    m.compose(V(x, Math.max(0.03, y), z), new THREE.Quaternion(), V(0.7 + Math.random() * 0.6, 1, 0.7 + Math.random() * 0.6));
    P.splats.setMatrixAt(i, m);
    P.splats.setColorAt(i, new THREE.Color(team === 'ours' ? OURS : THEIRS));
    P.splats.count = Math.min(60, P.n);
    P.splats.instanceMatrix.needsUpdate = true; P.splats.instanceColor.needsUpdate = true;
    DV.Audio.play('splat', { x, z, volume: 0.6 });
  }
  function stepBalls(Ch, dt) {
    const zone = Ch.zone, P = DV.Player, m = new THREE.Matrix4(), col = new THREE.Color();
    const live = [];
    for (const b of Ch.balls) {
      b.t += dt;
      const ox = b.x, oy = b.y, oz = b.z;
      b.vy -= 3.5 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      let hit = false;
      // people in the way (yours count: friendly paint is still paint, but the referee doesn't count it)
      const test = (x, z, y0) => { const dx = b.x - x, dz = b.z - z; return dx * dx + dz * dz < 0.16 && b.y > y0 + 0.15 && b.y < y0 + 1.9; };
      for (const a of Ch.players) {
        if (a.out || a.team === b.team) continue;
        if (test(a.x, a.z, a.y || 0)) { tag(Ch, a, b.by); splat(Ch, a.x, (a.y || 0) + 0.02, a.z, b.team); hit = true; break; }
      }
      if (!hit && b.team === 'theirs' && !Ch.youOut && test(P.x, P.z, P.y || 0)) { tagYou(Ch, b.by); splat(Ch, P.x, (P.y || 0) + 0.02, P.z, b.team); hit = true; }
      if (!hit) {
        const d = Math.hypot(b.x - ox, b.y - oy, b.z - oz) || 1e-3;
        const h = zone.colliders.raycast(ox, oy, oz, (b.x - ox) / d, (b.y - oy) / d, (b.z - oz) / d, d);
        const g = zone.groundAt(b.x, b.z);
        if (h < d || b.y < g || b.t > 2.2) { splat(Ch, b.x, b.y < g ? g + 0.02 : b.y, b.z, b.team); hit = true; }
      }
      if (!hit) live.push(b);
    }
    Ch.balls = live.slice(-48);
    const B = zone.paint.balls;
    Ch.balls.forEach((b, i) => { m.makeTranslation(b.x, b.y, b.z); B.setMatrixAt(i, m); B.setColorAt(i, col.set(b.team === 'ours' ? OURS : THEIRS)); });
    B.count = Ch.balls.length;
    B.instanceMatrix.needsUpdate = true; if (B.instanceColor) B.instanceColor.needsUpdate = true;
  }
  function tag(Ch, a, by) {
    a.out = true; a.outT = 0; a.engaged = null;
    a.action = 'cower';
    DV.Audio.play('punch', { x: a.x, z: a.z, volume: 0.4 });
    if (a.team === 'theirs') Ch.score.ours++; else Ch.score.theirs++;
    if (by === 'player') { Ch.score.mine++; DV.UI.notify('You tagged ' + a.name + '.', 'info'); DV.Stats.practice('firearms', 0.5); }
    if (Math.random() < 0.5) Ch.say(a, U.pick(['Ow! OW. That actually —', 'I\'m out, I\'m out!', 'My arm. I can\'t feel my arm.', 'Aw, come ON.']), 2);
    // out: walk back to your own end with your hands up
    const N = Ch.N, home = a.team === 'ours' ? 'ps' : 'west';
    const r = route(N, nearestNode(N, a.x, a.z), home) || [home];
    a.walk(r.map((k) => N[k]), 1.6);
  }
  function tagYou(Ch, by) {
    if (Ch.youOut) return;
    Ch.youOut = true; Ch.outT = 0; Ch.score.theirs++; Ch.score.timesOut++;
    DV.Audio.play('punch', { volume: 0.8 }); DV.Game.rig.shake = 0.3;
    const a = Ch.players.find((x) => x.id === by);
    Ch.A.announce('TAGGED', 1.4, 'bad');
    DV.UI.subtitle('', '[It hits like a fist and then like a wasp. The whole arm goes numb. ' + (a ? a.name + ' got you.' : '') + ' You\'re out.]', 3.5);
    DV.Player.pinned = true;
  }

  /* ------------------------------ the AI ------------------------------ */
  function think(Ch, a, dt) {
    const N = Ch.N, P = DV.Player;
    a.y = Ch.zone.groundAt(a.x, a.z); a.sync();
    if (a.out) {
      a.outT += dt;
      a.action = 'cower';
      if (a.outT > 14 && !a.moving) { a.out = false; a.plan = null; a.action = 'idle'; }
      return;
    }
    a.cool = (a.cool || 0) - dt;
    a.lookT = (a.lookT || 0) - dt;
    // look for someone to shoot: the nearest of the other side you can see
    if (a.lookT <= 0) {
      a.lookT = 0.35 + Math.random() * 0.2;
      let best = null, bd = a.range || 17;
      const foes = Ch.players.filter((o) => o.team !== a.team && !o.out).map((o) => ({ x: o.x, z: o.z, y: o.y || 0, who: o }));
      if (a.team === 'theirs' && !Ch.youOut && !Ch.climbing) foes.push({ x: P.x, z: P.z, y: P.y || 0, who: 'player' });
      for (const f of foes) {
        const d = Math.hypot(f.x - a.x, f.z - a.z);
        if (d > bd) continue;
        const ey = (a.y || 0) + 1.5, ty = f.y + 1.2, dy = ty - ey;
        const L = Math.hypot(f.x - a.x, dy, f.z - a.z) || 1;
        if (Ch.zone.colliders.raycast(a.x, ey, a.z, (f.x - a.x) / L, dy / L, (f.z - a.z) / L, L) < L - 0.3) continue;
        best = f; bd = d;
      }
      a.engaged = best;
    }
    const e = a.engaged;
    if (e) {
      const ex = e.who === 'player' ? P.x : e.who.x, ez = e.who === 'player' ? P.z : e.who.z, eyy = (e.who === 'player' ? P.y || 0 : e.who.y || 0) + 1.2;
      a.queue = []; a.action = 'aim'; a.face(ex, ez);
      if (a.cool <= 0) {
        a.cool = (a.rate || 1.5) + Math.random() * 0.8;
        const from = V(a.x, (a.y || 0) + 1.45, a.z);
        const d = Math.hypot(ex - a.x, ez - a.z);
        const lead = d / 30;
        const tx = ex + (e.who === 'player' ? P.vx || 0 : 0) * lead, tz = ez + (e.who === 'player' ? P.vz || 0 : 0) * lead;
        const dir = V(tx - a.x, eyy - from.y + d * d * 0.0019, tz - a.z).normalize();
        const sp = (a.spread || 0.06) + d * 0.002;
        dir.x += (Math.random() - 0.5) * sp; dir.y += (Math.random() - 0.5) * sp; dir.z += (Math.random() - 0.5) * sp;
        fire(Ch, from, dir.normalize(), a.team, a.id);
      }
      return;
    }
    if (a.action === 'aim') a.action = 'idle';
    // no one in sight: about your job
    if (a.moving) return;
    const go = (k, spd) => { const r = route(N, nearestNode(N, a.x, a.z), k, a.avoid); if (r) a.walk(r.map((n) => [N[n][0] + (Math.random() - 0.5) * 1.2, N[n][1] + (Math.random() - 0.5) * 1.2]), spd || 2.6); };
    a.idleT = (a.idleT || 0) - dt;
    if (a.idleT > 0) return;
    a.idleT = 2 + Math.random() * 3;
    switch (a.role) {
      case 'guard': {
        const h = N[a.post];
        if (Math.hypot(a.x - h[0], a.z - h[1]) > 2.5) go(a.post, 2.2); else { a.action = 'guard'; a.face(a.watch[0], a.watch[1]); }
        break;
      }
      case 'raid': {
        // over the jetty or the causeway (each raider has his way), to the flag under the wheel
        if (Math.hypot(a.x - N.flagO[0], a.z - N.flagO[1]) < 1.6) { Ch.lose(a); return; }
        go('flagO', 2.8);
        break;
      }
      case 'push': {
        // ours: across to the fairground, then (once somebody has seen it) at their flag
        const target = Ch.spotted ? Ch.flagNode : 'g';
        if (Math.hypot(a.x - N[target][0], a.z - N[target][1]) > 3) go(target, 2.6); else a.action = 'guard';
        break;
      }
      case 'escort': {
        // Mark: where you are, a step behind
        if (Ch.climbing) break;
        const d = Math.hypot(a.x - P.x, a.z - P.z);
        if (d > 4) { const r = route(N, nearestNode(N, a.x, a.z), nearestNode(N, P.x, P.z)); const pts = (r || []).map((n) => N[n]); pts.push([P.x - Math.sin(P.rot) * 1.8 + 0.8, P.z - Math.cos(P.rot) * 1.8]); a.walk(pts, d > 12 ? 4.2 : 2.8); a.idleT = 0.6; }
        break;
      }
    }
  }

  /* ------------------------------ the chapter ------------------------------ */
  DV.Chapter.define('ctf', {
    zone: 'ctf_pier',
    title: 'CAPTURE THE FLAG\nDAY 3 · NIGHT',
    day: 3, time: '21:40',
    start(Ch, zone, opts) {
      Ch.zone = zone; Ch.N = nodes(); Ch.balls = []; Ch.players = [];
      Ch.score = { ours: 0, theirs: 0, mine: 0, timesOut: 0 };
      Ch.over = false; Ch.spotted = false; Ch.youOut = false; Ch.climbing = false;
      const s = CTF.st();
      s.flag = s.flag || ['pavilion', 'coaster', 'carousel'][Math.floor(U.rng('ctf:' + (DV.State.data.meta.created || 1))() * 3)];
      Ch.flagSpot = SPOTS[s.flag]; Ch.flagNode = { pavilion: 'pav', coaster: 'coa', carousel: 'car' }[s.flag];
      const F = zone.flags;
      F.ours.g.position.set(Ch.N.flagO[0], W().PIER.top, Ch.N.flagO[1]);
      F.theirs.g.position.set(Ch.flagSpot[0], s.flag === 'carousel' ? 0.4 : 0, Ch.flagSpot[1]);
      zone.wheelLights.visible = true;
      DV.Audio.setMusic('ctf');
      if (DV.Quests.started('capture_flag')) DV.Quests.tracked = 'capture_flag';
      // a little HUD of our own: the flags, the tags, the clock
      Ch.A = { announce: (t, secs, kind) => DV.Activity.announce.call({ hud: Ch.hud, _annT: null }, t, secs, kind) };
      Ch.hud = U.el('div', 'ctf-hud', '<div class="ctf-box"><div class="ctf-t">CAPTURE THE FLAG</div><div class="ctf-l"></div></div><div class="ctf-cross hidden"><i></i></div>', DV.UI.root);
      Ch.addObject({ dispose: () => { if (Ch.hud) Ch.hud.remove(); Ch.hud = null; DV.Player.pinned = false; DV.Player.moveScale = 1; DV.Game.camera.fov = DV.Config.CAMERA.fov; DV.Game.camera.updateProjectionMatrix(); } });
      Ch.gun = DV.Arms.pistol(); DV.Arms.tint(Ch.gun, [0.5, 0.55, 0.7]); Ch.gun.scale.setScalar(1.3); DV.Game.scene.add(Ch.gun);
      Ch.addObject({ dispose: () => { if (Ch.gun.parent) Ch.gun.parent.remove(Ch.gun); } });
      if (opts.step === 'play' || opts.step === 'end') this.play(Ch, zone, opts.step === 'end');
      else this.train(Ch, zone);
    },
    /* ---- the train out, the teams ---- */
    train(Ch, zone) {
      Ch.checkpoint('train');
      const tr = DV.City.trainMesh(4);
      tr.position.set(250, 0, 30.3); zone.group.add(tr);
      Ch.addObject({ dispose: () => { if (tr.parent) tr.parent.remove(tr); } });
      Ch.train = tr; Ch.trainV = 13;
      const P = DV.Player;
      P.place(376, 39, Math.PI); P.model.root.visible = false;
      Ch.cut(true);
      Ch.shot([400, 3.2, 22], [330, 2, 30.3], true);
      DV.Audio.play('train', { volume: 0.9 });
      const T2 = CTF.teams(), I = DV.Initiation;
      const mark = Ch.actor({ id: 'mark', name: 'Mark Rivera', app: DV.DauntlessCast.INSTRUCTOR(), x: 372, z: 38.4, rot: Math.PI, action: 'idle' });
      const shay = Ch.actor({ id: 'shay', name: 'Shay Morrow', app: DV.NPCs.get('d_shay') ? DV.NPCs.get('d_shay').appearance() : DV.DauntlessCast.member(3, 'f'), x: 379, z: 38.4, rot: Math.PI, action: 'idle' });
      for (const a of [mark, shay]) a.model.root.visible = false;
      const kids = T2.ours.concat(T2.theirs).map((id, i) => { const n = DV.NPCs.get(id); const a = Ch.actor({ id, name: I.nameOf(id), app: n ? n.appearance() : DV.DauntlessCast.member(i), x: 366 + i * 1.5, z: 40.5 + (i % 2) * 0.8, rot: Math.PI, action: 'idle' }); a.model.root.visible = false; return a; });
      Ch.seq([
        () => { DV.UI.narrate('CAPTURE THE FLAG\nDAY 3 · 21:40', 3.6); return 2.6; },
        () => Ch.train.position.x > 330,
        () => { Ch.shot([382, 2.2, 45], [376, 1.4, 34], false); return 0; },
        () => Ch.train.position.x > 368,
        () => {
          // they come off the moving train one after another, rolling on the gravel
          for (const a of [mark, shay].concat(kids)) a.model.root.visible = true;
          P.model.root.visible = true;
          DV.Audio.play('land', { volume: 0.9 });
          return 1.4;
        },
        () => { Ch.say(mark, 'Two teams. Shay picks first.', 2.6); return 2.8; },
        () => { Ch.say(shay, I.nameOf(T2.theirs[0]) + '.', 1.8); return 2.0; },
        () => { Ch.shot([373.6, 1.8, 36.6], [376, 1.5, 39], false); Ch.say(mark, '[He doesn\'t even look round.] ' + I.nameOf('player') + '.', 2.4); return 2.6; },
        () => { Ch.say(shay, 'The transfer? Huh. Thin pickings, Rivera.', 2.6); return 2.8; },
        () => { Ch.say(mark, 'Small is hard to hit. [Then the rest, fast:] ' + T2.ours.map((id) => I.first(id)).join(', ') + '.', 3.6); return 3.8; },
        () => { Ch.shot([384, 3.2, 41], [370, 1.2, 66], false); Ch.say(shay, 'We go first. Count to two hundred, then come and lose.', 3.2); for (const [i, a] of [shay].concat(kids.slice(T2.ours.length)).entries()) a.run([[376 + i * 1.2, 52], [370 + i * 2, 70]]); return 3.4; },
        () => { Ch.say(mark, 'Markers. They sting. Don\'t shoot each other on purpose.', 3); DV.Audio.play('reload', { volume: 0.8 }); return 3.2; },
        () => { Ch.say(mark, 'Our flag goes on the pier, under the wheel. Out along the jetty. Move.', 3.2); return 3.0; },
        () => { DV.UI.fade(1, 900).then(() => { Ch.cut(false); this.play(Ch, zone); DV.UI.fade(0, 1200); }); },
      ], 'train');
    },
    /* ---- the game ---- */
    play(Ch, zone, ended) {
      const N = Ch.N, P = DV.Player, I = DV.Initiation, T2 = CTF.teams();
      for (const a of Ch.actors.slice()) Ch.removeActor(a);
      if (Ch.train) { Ch.train.visible = false; }
      Ch.checkpoint('play');
      P.model.root.visible = true;
      const pc = N.pc;
      P.place(pc[0] - 2, pc[1] - 3, -Math.PI / 2); DV.Game.rig.yaw = -1.7; DV.Game.rig.follow(true);
      const mk = (id, name, app, team, role, at, extra) => { const a = Ch.actor({ id, name, app, x: at[0], z: at[1], rot: 0, action: 'idle' }); Object.assign(a, { team, role, out: false }, extra || {}); Ch.players.push(a); return a; };
      const app = (id, i) => { const n = DV.NPCs.get(id); return n ? n.appearance() : DV.DauntlessCast.member(i); };
      Ch.mark = mk('mark', 'Mark Rivera', DV.DauntlessCast.INSTRUCTOR(), 'ours', 'escort', [pc[0] - 3, pc[1] - 2], { rate: 1.2, spread: 0.04, range: 19 });
      T2.ours.forEach((id, i) => mk(id, I.nameOf(id), app(id, i), 'ours', i < 2 ? 'guard' : 'push', i < 2 ? N['guardO' + (i + 1)] : [pc[0] - 4, pc[1] + i], i < 2 ? { post: 'guardO' + (i + 1), watch: N.ps } : {}));
      const fs = Ch.flagSpot;
      mk('shay', 'Shay Morrow', DV.NPCs.get('d_shay') ? DV.NPCs.get('d_shay').appearance() : DV.DauntlessCast.member(3, 'f'), 'theirs', 'guard', [fs[0] + 2, fs[1] + 1.5], { post: Ch.flagNode, watch: N.g, rate: 1.3, spread: 0.05 });
      Ch.N.flagT = [fs[0], fs[1]];
      T2.theirs.forEach((id, i) => mk(id, I.nameOf(id), app(id, i + 4), 'theirs', i === 1 ? 'guard' : 'raid', i === 1 ? [fs[0] - 2, fs[1] - 1.5] : [N.west[0] + i, N.west[1] + i], i === 1 ? { post: Ch.flagNode, watch: N.g } : { avoid: i === 2 ? 'j1' : 'l1' }));
      Ch.t0 = Ch.t; Ch.limit = 9 * 60;
      if (ended) { Ch.over = true; return; }
      // the wheel's ladder: up, to see the whole fairground
      const L = zone.ladder;
      Ch.wheel = { ladder: L, topMin: 3, lookAt: [fs[0], 2.0, fs[1]], lookFrom: 3.0, onTop: () => this.top(Ch), onDown: () => { Ch.climbing = false; Ch.mark.model.root.visible = true; } };
      Ch.interact({ id: 'ctf_climb', kind: 'action', x: L.foot[0] - L.out[0] * 0.6, y: W().PIER.top + 1.2, z: L.foot[2] - L.out[1] * 0.6, radius: 1.9, label: 'Climb the wheel', name: 'The Ferris wheel (ladder)', cond: () => !Ch.over && !Ch.wheel.climb && !Ch.youOut, onUse: () => this.climb(Ch) });
      Ch.interact({ id: 'ctf_take', kind: 'action', x: fs[0], y: 1.2, z: fs[1], radius: 1.8, label: 'Take the flag', name: 'Their flag', cond: () => !Ch.over && !Ch.youOut, onUse: () => this.take(Ch) });
      Ch.after(1.2, () => Ch.say(Ch.mark, 'Two on the flag. The rest of you, with me. And somebody — we need eyes. Somebody high up.', 4.2));
      Ch.after(6, () => { Ch.say(Ch.mark, '[He looks up at the wheel, and then at you.] Can you climb?', 2.6); DV.Quests.setObj('capture_flag', 'meet', 'done', 'You rode the train out to the old pier.'); DV.Quests.activate('capture_flag', 'climb'); });
    },
    climb(Ch) {
      Ch.climbing = true;
      Ch.mark.model.root.visible = false; // (he's on the ladder below you)
      DV.Waterfront.climb(Ch.wheel);
      Ch.say(Ch.mark, 'Go. I\'m right behind you. Don\'t look down — or do, it\'s a better view.', 3);
    },
    top(Ch) {
      if (!Ch.spotted) {
        Ch.spotted = true;
        DV.Quests.setObj('capture_flag', 'climb', 'done', 'From the top of the wheel you saw their flag, ' + SPOT_NAMES[CTF.st().flag] + '.');
        DV.Quests.activate('capture_flag', 'flag');
        CTF.st().climbed = true;
        DV.Stats.addXP(40, 'Climbed the wheel in the dark');
      }
      setTimeout(() => DV.UI.subtitle('', '[The whole city, dark inside the Fence. And down in the fairground, a smear of orange light: their flag, ' + SPOT_NAMES[CTF.st().flag] + '. Two of them guarding it.]', 6), 1400);
      setTimeout(() => DV.UI.subtitle('Mark Rivera', '[From the rung below, quiet, nearly smiling:] See it? Good. Now get down before I have to explain to Dana how I lost you off a Ferris wheel.', 5.5), 7600);
    },
    take(Ch) {
      if (Ch.over) return;
      const near = Ch.players.find((a) => a.team === 'ours' && !a.out && a.role === 'push' && Math.hypot(a.x - DV.Player.x, a.z - DV.Player.z) < 9);
      if (near && !Ch.asked) { Ch.asked = true; Ch.giver = near; Ch.scene('ctf_flag', { speaker: near.name, faction: 'dauntless' }); return; }
      this.win(Ch, 'you');
    },
    win(Ch, how) {
      if (Ch.over) return;
      Ch.over = true;
      const s = CTF.st();
      s.won = true; s.flagBy = how; s.tags = Ch.score.mine;
      DV.State.setFlag(how === 'you' ? 'ctf_took_flag' : 'ctf_gave_flag');
      const who = how === 'you' ? DV.Initiation.nameOf('player') : Ch.giver.name;
      Ch.cut(true);
      const fs = Ch.flagSpot;
      Ch.shot([fs[0] + 5, 2.4, fs[1] + 5], [fs[0], 1.8, fs[1]], false);
      DV.Audio.play('whistle', { volume: 1 });
      DV.Audio.play('roar', { secs: 2.6, volume: 1 });
      for (const a of Ch.players) if (a.team === 'ours') { a.out = false; a.engaged = null; a.queue = []; a.action = 'cheer'; a.face(fs[0], fs[1]); }
      for (const a of Ch.players) if (a.team === 'theirs') { a.queue = []; a.engaged = null; a.action = 'arms_crossed'; }
      if (how !== 'you') { Ch.giver.place(fs[0] + 0.6, fs[1] + 0.6); Ch.giver.action = 'cheer'; }
      Ch.zone.flags.theirs.g.visible = false;
      DV.UI.narrate('FLAG TAKEN\n' + who.toUpperCase(), 3);
      Ch.seq([
        () => 3.2,
        () => { Ch.say(Ch.mark, how === 'you' ? '[He reaches you, takes one look, and laughs out loud — the first time anyone has heard it.] Who told you to climb that fast?' : '[He watches you hand it over. Later, he\'ll mention it: you were closest, and you didn\'t take it.] Good game.', 4.6); return 4.8; },
        () => this.finish(Ch, true),
      ], 'win');
    },
    lose(Ch, a) {
      if (Ch.over) return;
      Ch.over = true;
      const s = CTF.st();
      s.won = false; s.tags = Ch.score.mine;
      Ch.cut(true);
      const f = Ch.N.flagO;
      Ch.shot([f[0] + 5, W().PIER.top + 2.6, f[1] - 4], [f[0], W().PIER.top + 1.4, f[1]], false);
      DV.Audio.play('whistle', { volume: 1 });
      if (a) { a.action = 'cheer'; Ch.say(a, a.id === 'd_josh' ? 'HA! Under your nose, Rivera!' : 'Got it! It\'s ours!', 3); }
      Ch.zone.flags.ours.g.visible = false;
      DV.UI.narrate('YOUR FLAG IS GONE', 3);
      Ch.seq([
        () => 3.2,
        () => { Ch.say(Ch.mark, 'That\'s the game. [He doesn\'t say whose fault. He doesn\'t have to.] Train. Everyone.', 3.6); return 3.8; },
        () => this.finish(Ch, false),
      ], 'lose');
    },
    finish(Ch, won) {
      const s = CTF.st(), I = DV.Initiation;
      s.done = true;
      Ch.checkpoint('end');
      // the board: the winning side does well out of it, you a little more
      const T2 = CTF.teams();
      if (I && I.award) {
        for (const id of (won ? T2.ours : T2.theirs)) I.award(id, 60, 'Capture the flag');
        I.award('player', (won ? 60 : 15) + (s.flagBy === 'you' ? 40 : 0) + (s.climbed ? 20 : 0) + Math.min(5, Ch.score.mine) * 6, 'Capture the flag' + (won ? ', won' : ', lost'));
      }
      DV.Quests.setObj('capture_flag', 'flag', won ? 'done' : 'failed', won ? (s.flagBy === 'you' ? 'You took their flag yourself.' : 'You let a teammate take their flag.') : 'They got to your flag first.');
      DV.Quests.complete('capture_flag', won ? 'won' : 'lost');
      if (s.flagBy === 'gave' && Ch.giver) DV.Reputation.addRel(Ch.giver.id, 10);
      DV.Reputation.addRel('d_mark', won ? 6 : 2, true);
      DV.Stats.addXP(won ? 90 : 40, 'Capture the flag');
      Ch.banner(won ? 'CAPTURE THE FLAG · WON' : 'CAPTURE THE FLAG · LOST', (won ? (s.flagBy === 'you' ? 'YOU TOOK THEIR FLAG' : 'YOU LET ' + Ch.giver.name.toUpperCase() + ' TAKE IT') : 'THEY REACHED YOURS') + ' · ' + Ch.score.mine + ' TAGGED · OUT ' + Ch.score.timesOut + '×', 'Click or press any key · the train home', () => {
        DV.District.enter('dauntless', { day: 3, time: '23:40', spawn: [24.5, -11.5, Math.PI], fadeOut: 1400, then: 'ctf_back' });
      });
    },
    update(Ch, dt) {
      if (!Ch.zone) return;
      const zone = Ch.zone, P = DV.Player, input = DV.Input, G = DV.Game;
      // the intro's train
      if (Ch.train && Ch.train.visible) {
        if (Ch.train.position.x > 360) Ch.trainV = Math.max(4, Ch.trainV - dt * 4);
        Ch.train.position.x += Ch.trainV * dt;
        if (Ch.train.position.x > 560) Ch.train.visible = false;
      }
      // the flags wave
      const t = Ch.t;
      for (const k in zone.flags) { const f = zone.flags[k]; f.cloth.rotation.y = Math.sin(t * 2 + (k === 'ours' ? 1 : 0)) * 0.25; f.glow.material.opacity = 0.1 + Math.sin(t * 3) * 0.03; f.beam.material.opacity = (Ch.climbing ? 0.3 : 0.08) + Math.sin(t * 2.2) * 0.03; }
      if (Ch.wheel && Ch.wheel.climb) DV.Waterfront.climbStep(Ch.wheel, dt);
      stepBalls(Ch, dt);
      if (!Ch.players.length) return;
      for (const a of Ch.players) {
        if (!Ch.over) think(Ch, a, dt);
        else { a.y = zone.groundAt(a.x, a.z); a.sync(); }
        // paint shows: the tagged are lit up in the other side's colour
        if (a.out) { const c = new THREE.Color(a.team === 'ours' ? THEIRS : OURS); a.model.setTint(0.5 + c.r * 0.9, 0.5 + c.g * 0.9, 0.5 + c.b * 0.9); }
      }
      if (Ch.over) { this.hud(Ch); return; }
      // you, out: the arm comes back, and you walk back to the pier
      if (Ch.youOut) {
        Ch.outT += dt;
        if (Ch.outT > 3.5 && !Ch.respawning) {
          Ch.respawning = true;
          G.state = 'transition';
          DV.UI.fade(1, 700).then(() => {
            const N = Ch.N; P.place(N.pc[0] - 2, N.pc[1] - 2, -Math.PI / 2); P.pinned = false; G.rig.yaw = -1.7; G.rig.follow(true);
            Ch.youOut = false; Ch.respawning = false; G.state = 'playing';
            DV.UI.fade(0, 900); DV.UI.notify('Back on the pier. Your arm still doesn\'t feel like yours.', 'info');
          });
        }
        this.hud(Ch); return;
      }
      if (G.state !== 'playing') { this.hud(Ch); return; }
      // aiming: hold the right button, over the shoulder; the left fires
      const aiming = input.down('MouseRight');
      const rig = G.rig, yaw = rig.yaw, pitch = U.clamp(-rig.pitch * 0.9 + 0.12, -0.5, 0.6);
      const dir = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      if (aiming) {
        const rt = V(-Math.cos(yaw), 0, Math.sin(yaw)), fw = V(Math.sin(yaw), 0, Math.cos(yaw));
        const eye = V(P.x, (P.y || 0) + 1.7, P.z).addScaledVector(rt, 0.6).addScaledVector(fw, -1.4);
        rig.setTrack(eye, eye.clone().addScaledVector(dir, 10), 16, false, V(P.x, (P.y || 0) + 1.6, P.z));
        P.rot = U.dampAngle(P.rot, yaw, 14, dt); P.syncModel();
        P.model.animate(dt, { speed: P.speed, action: 'aim', aimPitch: pitch * 0.8 });
        P.moveScale = 0.5;
        Ch.wasAiming = true;
      } else if (Ch.wasAiming) { Ch.wasAiming = false; rig.follow(); P.moveScale = 1; }
      Ch.hud.querySelector('.ctf-cross').classList.toggle('hidden', !aiming);
      // the marker in your hand
      const hand = P.model.boneWorld('handR', V(0, 0, 0));
      Ch.gun.position.copy(hand); Ch.gun.lookAt(hand.clone().add(aiming ? dir : V(Math.sin(P.rot), -0.6, Math.cos(P.rot))));
      Ch.gun.userData.flash.opacity = Math.max(0, Ch.gun.userData.flash.opacity - dt * 14);
      Ch.cool = (Ch.cool || 0) - dt;
      if ((input.consume('MouseLeft') || input.consume('KeyJ')) && Ch.cool <= 0 && !Ch.climbing) {
        Ch.cool = 0.4;
        const from = V(P.x, (P.y || 0) + 1.45, P.z).addScaledVector(V(Math.sin(yaw), 0, Math.cos(yaw)), 0.4);
        const sp = aiming ? 0.012 : 0.07;
        const d2 = dir.clone(); d2.x += (Math.random() - 0.5) * sp; d2.y += (Math.random() - 0.5) * sp; d2.z += (Math.random() - 0.5) * sp;
        if (!aiming) P.rot = yaw;
        fire(Ch, from, d2.normalize(), 'ours', 'player');
        Ch.gun.userData.flash.opacity = 0.6;
      }
      // spotted the flag without the wheel: walk close enough and you see it anyway
      if (!Ch.spotted && Math.hypot(P.x - Ch.flagSpot[0], P.z - Ch.flagSpot[1]) < 14) { Ch.spotted = true; DV.Quests.setObj('capture_flag', 'climb', 'done', 'You found their flag on foot.'); DV.Quests.activate('capture_flag', 'flag'); Ch.say(Ch.mark, 'There. Orange. Go!', 2); }
      // out of time
      if (Ch.t - Ch.t0 > Ch.limit) { this.lose(Ch, null); }
      this.hud(Ch);
    },
    hud(Ch) {
      if (!Ch.hud) return;
      const left = Math.max(0, Math.round(Ch.limit - (Ch.t - (Ch.t0 || Ch.t))));
      const out = (team) => Ch.players.filter((a) => a.team === team && a.out).length;
      const html = 'Their flag: <b>' + (Ch.spotted ? SPOT_NAMES[CTF.st().flag] : 'somewhere in the fairground') + '</b><br>Tagged by you: <b>' + Ch.score.mine + '</b> · Out: ours ' + out('ours') + ', theirs ' + out('theirs') + '<br>' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + (Ch.youOut ? ' · <span class="bad">YOU\'RE OUT</span>' : '') + '<div class="k">hold <b>RMB</b> aim · <b>LMB</b> fire</div>';
      const l = Ch.hud.querySelector('.ctf-l');
      if (l._h !== html) { l._h = html; l.innerHTML = html; }
    },
  });

  /* ------------------------------ the flag: yours, or theirs ------------------------------ */
  DV.DialogueDB.add('ctf_flag', {
    entry: 'start',
    nodes: {
      start: {
        text: () => '[The flag is right there, glowing. ' + DV.Chapter.giver.name + ' is a step behind you, breathing hard, staring at it.]',
        choices: [
          { text: '(Take it. You climbed the wheel for this.)', end: true, effect: () => setTimeout(() => DV.Chapter.script.win(DV.Chapter, 'you'), 50) },
          { text: () => '"Go on. You take it, ' + DV.Initiation.first(DV.Chapter.giver.id) + '."', end: true, effect: () => setTimeout(() => DV.Chapter.script.win(DV.Chapter, 'gave'), 50) },
        ],
      },
    },
  });

  /* ------------------------------ the quest ------------------------------ */
  DV.QuestDB.add({
    id: 'capture_flag', title: 'Capture the Flag', type: 'side', giver: 'd_mark',
    summary: 'A Dauntless tradition: two teams, paint markers, the old fairground at the end of Lake Street at night. Find their flag before they find yours.',
    startText: 'Mark Rivera: "Training Passage, nine o\'clock. Wear black."',
    objectives: [
      { id: 'meet', text: 'Be by the Training Passage at nine for the train (Day 3)', target: { x: 24.5, z: -12.5 } },
      { id: 'climb', text: 'Find their flag (the wheel is high)', hidden: true },
      { id: 'flag', text: 'Take their flag', hidden: true },
    ],
    rewards: { xp: 60, rep: { dauntless: 4 } },
    completeText: 'The night game is over. The paint will take a week to come out.',
  });

  const css = document.createElement('style');
  css.textContent = [
    '.ctf-hud { position: absolute; inset: 0; pointer-events: none; }',
    'body.cutscene .ctf-hud { display: none; }',
    '.ctf-box { position: absolute; left: 16px; top: 78px; padding: 8px 12px; background: rgba(6, 8, 14, 0.78); border: 1px solid #000; box-shadow: inset 0 0 0 1px #2a3a50; font-size: 12px; color: var(--text); min-width: 230px; }',
    '.ctf-t { font-family: var(--serif); letter-spacing: 0.2em; color: #9fd8ff; margin-bottom: 4px; }',
    '.ctf-box b { color: #ffd890; font-weight: normal; } .ctf-box .bad { color: #ff8a5a; } .ctf-box .k { margin-top: 4px; color: #8a96a8; font-size: 11px; }',
    '.ctf-cross { position: absolute; left: 50%; top: 50%; width: 22px; height: 22px; margin: -11px 0 0 -11px; border: 1px solid rgba(160, 230, 255, 0.85); border-radius: 50%; }',
    '.ctf-cross i { position: absolute; left: 10px; top: 10px; width: 2px; height: 2px; background: #bff; }',
  ].join('\n');
  document.head.appendChild(css);

  CTF.SPOTS = SPOTS; CTF.nodes = nodes; CTF.route = route;
  DV.CTF = CTF;
})();
