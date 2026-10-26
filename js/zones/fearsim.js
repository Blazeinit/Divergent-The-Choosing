/* ==========================================================================
   DIVERGENT — Build 3: Stage Two, the first fear simulation
   The serum finds the fear that's already yours:
     THE TANK — if you went under in your aptitude test's flood: a glass
                box in the dark, filling, with faces outside watching.
     THE BEAM — otherwise: a steel beam a hundred metres up, in the wind,
                between two roofs.
   The technician measures one thing: your heart (js/game/fear.js). It ends
   when you calm down, or when you do the thing the fear says you can't
   (the crack in the glass, the far roof). And if you're Divergent you
   might notice it isn't real: a fingertip on the glass, and the glass
   remembers it was never there. That is exactly what they're watching for.
   Both are fears of the engine too (DV.Fear: 'tank', 'beam'), so Stage
   Three's landscape (js/zones/fearscape.js) can chain them with the rest.
   Also: the factionless epilogue, for anyone cut at the end of Stage One.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const drowned = () => (DV.State.data.aptitude.choices || []).some((c) => /water closed over|fought the water|breathed underwater/.test(c.label || ''));
  const variant = () => (drowned() ? 'tank' : 'beam');

  /* ============================== THE TANK ============================== */
  const crackTex = () => DV.Tex.custom('glass_crack_b', 64, 64, (c) => {
    c.strokeStyle = 'rgba(230,240,255,0.95)'; c.lineWidth = 1;
    const r = U.rng('crack');
    for (let i = 0; i < 11; i++) {
      c.beginPath(); c.moveTo(32, 32);
      let x = 32, y = 32;
      const a = (i / 11) * Math.PI * 2 + r() * 0.4;
      for (let k = 0; k < 5; k++) { x += Math.cos(a + (r() - 0.5) * 0.7) * 6.5; y += Math.sin(a + (r() - 0.5) * 0.7) * 6.5; c.lineTo(x, y); }
      c.stroke();
    }
    c.beginPath(); c.arc(32, 32, 5, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(32, 32, 12, 0.3, 2.4); c.stroke();
  }, { wrap: 'clamp' });
  DV.Zones.define('fear_tank', {
    name: 'Simulation', region: '', chapter: true, noDiscover: true, simulation: false,
    bounds: { x0: -12, z0: -12, x1: 12, z1: 12 },
    buildingHeight: 1,
    fog: { color: 0x020305, near: 6, far: 26 },
    sky: { visible: false, skyline: false },
    charLight: { ambient: 0.4, hemi: 0.2, dir: 0.5, dirColor: 0x9ab8ff },
    ambience: 'flood', reverb: 'tiled',
    rooms: [{ id: 'void', name: '', x0: -10, z0: -10, x1: 10, z1: 10, exterior: true, floor: 'concrete_dark', edge: 'none', light: { ambient: [0.12, 0.13, 0.16], list: [[0, 0, 1.2, 5]], range: 8, color: [0.7, 0.85, 1] } }],
    doors: [], props: [],
    spawn: { x: 0, z: 0, rot: 0 },
    build(ctx) {
      const zone = ctx.zone;
      const S = 1.5; // half-width of the tank
      const glass = new THREE.MeshBasicMaterial({ color: 0x9ac0d0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, fog: true });
      const frame = new THREE.MeshBasicMaterial({ color: 0x1a1c20, fog: true });
      const g = new THREE.Group();
      for (const [x, z, ry] of [[0, -S, 0], [0, S, 0], [-S, 0, Math.PI / 2], [S, 0, Math.PI / 2]]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(S * 2, 4.2), glass); p.position.set(x, 2.1, z); p.rotation.y = ry; g.add(p);
      }
      const frames = new THREE.Group();
      for (const [x, z] of [[-S, -S], [S, -S], [-S, S], [S, S]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.3, 0.08), frame); b.position.set(x, 2.15, z); frames.add(b); }
      const lid = new THREE.Mesh(new THREE.BoxGeometry(S * 2 + 0.1, 0.08, S * 2 + 0.1), frame); lid.position.y = 4.2; frames.add(lid);
      ctx.add(g); ctx.add(frames);
      const cols = [];
      for (const [x0, z0, x1, z1] of [[-S - 0.1, -S - 0.1, S + 0.1, -S + 0.02], [-S - 0.1, S - 0.02, S + 0.1, S + 0.1], [-S - 0.1, -S, -S + 0.02, S], [S - 0.02, -S, S + 0.1, S]]) cols.push(zone.colliders.add(x0, z0, x1, z1, { y0: 0, y1: 4.3, tag: 'wall' }));
      // the water
      const water = new THREE.Mesh(new THREE.BoxGeometry(S * 2 - 0.04, 1, S * 2 - 0.04), new THREE.MeshBasicMaterial({ color: 0x24506a, transparent: true, opacity: 0.55, depthWrite: false, fog: true }));
      water.position.y = 0.0; water.scale.y = 0.001;
      ctx.add(water);
      const surf = new THREE.Mesh(new THREE.PlaneGeometry(S * 2 - 0.04, S * 2 - 0.04), new THREE.MeshBasicMaterial({ color: 0x6aa0c0, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
      surf.rotation.x = -Math.PI / 2; ctx.add(surf);
      // the water that's let out when the glass goes: a sheet across the floor
      const spill = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x3a6e8a, transparent: true, opacity: 0.5, depthWrite: false, fog: true }));
      spill.rotation.x = -Math.PI / 2; spill.position.y = 0.02; spill.visible = false; ctx.add(spill);
      zone.tank = { S, water, surf, glass, panes: g, frames, cols, spill };
      // the crack you'll find if you look (lower corner, north-east), and the ones that can spread
      const cmat = new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false });
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), cmat);
      crack.position.set(S - 0.02, 0.55, -S + 0.45); crack.rotation.y = -Math.PI / 2; ctx.add(crack);
      zone.tank.crack = crack;
      zone.tank.spread = [[0, -S + 0.02, 0], [0, S - 0.02, Math.PI], [-S + 0.02, 0, Math.PI / 2], [S - 0.02, 0.4, -Math.PI / 2]].map(([x, z, ry], i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), cmat);
        if (Math.abs(z) > 1) m.position.set(x + (i ? -0.4 : 0.5), 1.4 + i * 0.3, z); else m.position.set(x, 1.6 - i * 0.2, z);
        m.rotation.y = ry; m.visible = false; ctx.add(m); return m;
      });
      // the glass, when it goes: shards in one mesh
      const N = 70, shardGeo = new THREE.BufferGeometry();
      shardGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.07, 0, -0.05, -0.05, 0, 0.06, -0.04, 0], 3));
      const shards = new THREE.InstancedMesh(shardGeo, new THREE.MeshBasicMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, fog: true }), N);
      shards.visible = false; shards.frustumCulled = false; ctx.add(shards);
      zone.tank.shards = { mesh: shards, n: N, p: [] };
    },
  });
  // the glass gives way: shards out from every pane, the water out across the floor
  function shatter(Ch) {
    const T = DV.World.current.tank;
    if (!T || Ch.shattered) return;
    Ch.shattered = true;
    T.panes.visible = false;
    for (const c of T.cols) if (c) c.enabled = false;
    for (const m of T.spread) m.visible = false;
    T.crack.visible = false;
    const sh = T.shards, r = U.rng('shards:' + Ch.t);
    sh.p = [];
    for (let i = 0; i < sh.n; i++) {
      const side = i % 4, a = (r() - 0.5) * 2 * T.S, y = 0.3 + r() * 3.6;
      const [x, z, nx, nz] = side === 0 ? [a, -T.S, 0, -1] : side === 1 ? [a, T.S, 0, 1] : side === 2 ? [-T.S, a, -1, 0] : [T.S, a, 1, 0];
      sh.p.push({ x, y, z, vx: nx * (1.5 + r() * 3) + (r() - 0.5), vy: r() * 2, vz: nz * (1.5 + r() * 3) + (r() - 0.5), rx: r() * 6, ry: r() * 6, s: 0.7 + r() * 1.6 });
    }
    sh.mesh.visible = true;
    T.spill.visible = true; T.spill.scale.setScalar(1.6);
    DV.Audio.play('glass', { volume: 1 });
    DV.Audio.play('splash', { volume: 1 });
    setTimeout(() => DV.Audio.play('splash', { volume: 0.6 }), 300);
    DV.Game.rig.shake = 0.35;
    Ch.drain = true;
  }
  function stepShards(Ch, dt) {
    const T = DV.World.current && DV.World.current.tank;
    if (!T) return;
    if (Ch.drain) {
      Ch.level = Math.max(0.02, Ch.level - dt * 2.4);
      T.spill.scale.setScalar(Math.min(9, T.spill.scale.x + dt * 5));
      T.spill.material.opacity = Math.max(0.15, T.spill.material.opacity - dt * 0.08);
      T.water.scale.y = Ch.level; T.water.position.y = Ch.level / 2; T.surf.position.y = Ch.level + 0.005;
    }
    const sh = T.shards;
    if (!sh.mesh.visible) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    sh.p.forEach((s, i) => {
      if (s.y > 0.02) { s.vy -= 9.8 * dt; s.x += s.vx * dt; s.y = Math.max(0.02, s.y + s.vy * dt); s.z += s.vz * dt; s.rx += dt * 7; s.ry += dt * 5; } else { s.vx *= 0.9; s.vz *= 0.9; }
      e.set(s.y > 0.03 ? s.rx : -Math.PI / 2, s.ry, 0); q.setFromEuler(e);
      m.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(s.s, s.s, s.s));
      sh.mesh.setMatrixAt(i, m);
    });
    sh.mesh.instanceMatrix.needsUpdate = true;
  }
  DV.Fear.define('tank', {
    title: 'DROWNING', zone: 'fear_tank',
    start(Ch, zone) {
      const P = DV.Player;
      Ch.v = 'tank';
      P.place(0, 0, 0);
      Ch.level = 0.05; Ch.air = 1; Ch.cracks = 0; Ch.shattered = false; Ch.drain = false;
      // the faces outside the glass
      Ch.watchers = [[-3.6, -2.4], [3.4, -2.8], [-3, 3.2], [3.8, 2.6], [0, -4.4]].map(([x, z], i) => {
        const a = Ch.actor({ id: 'w' + i, name: '', app: DV.Character.fromFaction(['dauntless', 'erudite', 'candor', 'dauntless', 'abnegation'][i], i % 2 ? 'f' : 'm', 'fearface' + i, { age: 30 + i * 6 }), x, z, rot: 0, action: 'arms_crossed' });
        a.face(0, 0); return a;
      });
      Ch.voice('', '[Glass on four sides. Something cold at your ankles. It\'s rising.]', 4);
      const T = zone.tank;
      Ch.crackNeed = Math.max(4, 12 - DV.Stats.attr('strength'));
      Ch.interact({ id: 'crack', kind: 'action', x: T.crack.position.x - 0.3, y: 0.6, z: T.crack.position.z, radius: 1.2, label: 'Hit the crack', name: 'The glass', cond: () => Ch.crackNear && !Ch.done && !Ch.bending, onUse: () => {
        Ch.cracks++; Ch.hitCrack = true;
        DV.Audio.play('punch', { volume: 0.7 }); DV.Audio.play('crack', { volume: 0.6 }); DV.Game.rig.shake = 0.2;
        T.crack.scale.setScalar(1 + Ch.cracks * 0.35);
        // past halfway, it starts to run across the pane
        if (Ch.cracks >= Ch.crackNeed / 2) T.spread[3].visible = true;
      } });
    },
    update(Ch, dt) {
      const P = DV.Player, T = DV.World.current.tank;
      stepShards(Ch, dt);
      if (Ch.shattered) return 0.2;
      // the water rises (faster in the last test)
      Ch.level = Math.min(4.0, Ch.level + dt * 0.055 * (Ch.fast ? 1.35 : 1));
      T.water.scale.y = Ch.level; T.water.position.y = Ch.level / 2; T.surf.position.y = Ch.level + 0.005;
      const head = 1.55 * P.scale;
      const under = Ch.level > head;
      let fear = Ch.level / 2.2 + (under ? 1.2 : 0);
      P.moveScale = Ch.level > 0.9 ? 0.55 : 0.85;
      P.surfaceOverride = 'water';
      if (Math.random() < dt * 0.6) DV.Audio.play('splash', { volume: 0.25 });
      if (under) {
        Ch.air = Math.max(0, Ch.air - dt / (8 + DV.Stats.attr('resolve') * 0.8));
        Ch.vig = 0.5 + (1 - Ch.air) * 0.5;
        if (Ch.air <= 0) { Ch.endFear('blackout'); return fear; }
      } else { Ch.air = Math.min(1, Ch.air + dt * 0.5); Ch.vig = undefined; }
      // the crack in the corner: PERCEPTION sees it from further away
      const cr = T.crack.position, dc = Math.hypot(P.x - cr.x, P.z - cr.z);
      Ch.crackNear = dc < (DV.Stats.attr('perception') >= 6 ? 1.2 : 0.75);
      if (Ch.crackNear && !Ch.saidCrack) { Ch.saidCrack = true; Ch.voice('', '[A hairline crack in the glass, low in the corner.]', 3); }
      if (Ch.hitCrack) {
        Ch.hitCrack = false; fear += 0.3;
        if (Ch.cracks >= Ch.crackNeed) {
          shatter(Ch);
          Ch.voice('', '[The crack runs, and runs, and the whole wall lets go at once. The water goes out of the tank like a held breath.]', 4.5);
          Ch.after(2.2, () => Ch.endFear('faced'));
        }
      }
      return fear;
    },
    heart: { blackoutAfter: 60 },
    threatened: (Ch) => Ch.level > 0.9,
    vignette: (Ch) => Ch.vig,
    hint(Ch) {
      const under = Ch.level > 1.55 * DV.Player.scale;
      return under ? 'You can\'t breathe. Find a way out — or slow your heart. (hold Space)' : Ch.crackNear ? 'Hit the crack — again, and again (E)' : 'Hold Space, standing still: slow your breathing. Or look for a way out.';
    },
    // the moment from the film, in our own words: one fingertip, and the glass remembers it isn't there
    bend(Ch) {
      const P = DV.Player, T = DV.World.current.tank;
      // to the nearest pane, a hand up to it
      const pane = Math.abs(P.x) > Math.abs(P.z) ? (P.x > 0 ? 3 : 2) : (P.z > 0 ? 1 : 0);
      P.cineAction = 'point';
      Ch.voice('', '[You stop thrashing. You put one fingertip to the glass, and tap it — the way you\'d tap a window to wake someone. This is glass the way a picture of a door is a door.]', 6);
      DV.Audio.play('crack', { volume: 0.9 });
      T.spread[pane].visible = true; T.spread[pane].scale.setScalar(0.2);
      let k = 0;
      const grow = () => {
        k++;
        T.spread[pane].scale.setScalar(Math.min(1.6, 0.2 + k * 0.18));
        if (k % 2) DV.Audio.play('crack', { volume: 0.5 + k * 0.05 });
        if (k === 4) for (const m of T.spread) m.visible = true;
        if (k < 9) Ch.after(0.28, grow);
        else { P.cineAction = null; shatter(Ch); Ch.after(2.6, () => Ch.endFear('aware')); }
      };
      Ch.after(1.4, grow);
    },
    end(Ch) { DV.Player.moveScale = 1; DV.Player.surfaceOverride = null; DV.Player.cineAction = null; },
  });

  /* ============================== THE BEAM ============================== */
  DV.Zones.define('fear_beam', {
    name: 'Simulation', region: '', chapter: true, noDiscover: true,
    bounds: { x0: -2, z0: -4, x1: 40, z1: 10 },
    buildingHeight: 1,
    fog: { color: 0x7a5a4a, near: 120, far: 900 },
    sky: { top: 0x2a3048, horizon: 0xd88a52, ground: 0x2a2020, skyline: false },
    exterior: { sunDir: [-0.7, 0.3, 0.4], sunColor: [0.9, 0.6, 0.4], ambient: [0.36, 0.32, 0.34] },
    charLight: { ambient: 0.45, hemi: 0.4, dir: 0.8, dirColor: 0xffb080 },
    ambience: 'outdoor', reverb: 'exterior',
    rooms: [
      { id: 'roofA', name: '', x0: 0, z0: 0, x1: 6, z1: 6, exterior: true, floor: 'gravel', edge: 'none' },
      { id: 'beam', name: '', x0: 6, z0: 2.7, x1: 30, z1: 3.3, exterior: true, floor: 'metal_dark', edge: 'none' },
      { id: 'roofB', name: '', x0: 30, z0: 0, x1: 36, z1: 6, exterior: true, floor: 'gravel', edge: 'none' },
    ],
    doors: [], props: [],
    spawn: { x: 4.5, z: 3, rot: Math.PI / 2 },
    build(ctx) {
      const city = DV.City.build({
        seed: 1201, y: -150, campus: [-10, -10, 46, 16],
        gridX: [-546, -470, -394, -318, -242, -166, -90, -20, 56, 132, 208, 284, 360, 436],
        gridZ: [-460, -396, -332, -268, -204, -140, -76, -16, 40, 104, 168, 232, 296],
        radius: 700, hub: [300, -260],
        haze: 0x7a5a4a, hazeK: 0.0026, ambient: 0xc08a70, lit: 0.6, cloudLight: 0xd09070, cloudDark: 0x4a3440, puffTint: 0xc08a70,
      });
      ctx.add(city.group); ctx.zone.city = city;
      ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
      const conc = DV.Tex.get('concrete_dark').clone(); conc.needsUpdate = true; conc.wrapS = conc.wrapT = THREE.RepeatWrapping; conc.repeat.set(2, 40);
      for (const x of [3, 33]) { const t = new THREE.Mesh(new THREE.BoxGeometry(6.2, 150, 6.2), new THREE.MeshBasicMaterial({ map: conc, color: 0x6a6460, fog: true })); t.position.set(x, -75.05, 3); ctx.add(t); }
      const beam = new THREE.Group();
      const m = new THREE.MeshBasicMaterial({ color: 0x3a3a40, fog: true });
      const top = new THREE.Mesh(new THREE.BoxGeometry(24, 0.06, 0.6), m); top.position.set(18, -0.03, 3); beam.add(top);
      const web = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 0.08), m); web.position.set(18, -0.3, 3); beam.add(web);
      const bot = new THREE.Mesh(new THREE.BoxGeometry(24, 0.06, 0.5), m); bot.position.set(18, -0.58, 3); beam.add(bot);
      ctx.add(beam);
      ctx.zone.beam = beam;
    },
    onExit(zone) {
      if (zone.city && zone.city.train && zone.city.train.sound) { zone.city.train.sound.stop(); zone.city.train.sound = null; }
    },
  });
  DV.Fear.define('beam', {
    title: 'FALLING', zone: 'fear_beam',
    start(Ch) {
      Ch.v = 'beam';
      DV.Player.place(4.5, 3, Math.PI / 2);
      Ch.gust = 0; Ch.gustT = 2.5; Ch.windV = 0; Ch.falls = 0; Ch.wide = false;
      Ch.voice('', '[Wind. A roof the size of a room. In front of you, the only way off it: a steel beam, a hand\'s width, over nothing.]', 4.5);
    },
    update(Ch, dt) {
      const P = DV.Player;
      // the wind: gusts push you sideways; correct with A / D
      Ch.gustT -= dt;
      if (Ch.gustT <= 0) { Ch.gustT = U.rand(2.2, 4.2); Ch.gust = (Math.random() < 0.5 ? -1 : 1) * U.rand(0.5, 1.1) * (P.x > 6 && P.x < 30 ? 1 : 0.2); DV.Audio.play('gust', { volume: 0.9 }); }
      Ch.gust *= Math.pow(0.35, dt);
      const onBeam = P.x > 6 && P.x < 30;
      const W = Ch.wide ? 3 : 0.3;
      let fear;
      if (onBeam) {
        Ch.windV += (Ch.gust - Ch.windV * 0.8) * dt * 2.2;
        P.z += Ch.windV * dt * (Ch.wide ? 0.1 : 1);
        if (Math.abs(P.z - 3) > W) { this.fall(Ch); return 1.5; }
        fear = 0.9 + Math.abs(P.z - 3) / W * 0.9 + Math.abs(Ch.windV) * 0.6;
      } else fear = P.x >= 30 ? 0 : 0.5;
      if (P.x >= 30.6) { Ch.endFear('faced'); return 0; }
      // nobody waits out a fear: stay on the roof long enough and the roof goes
      if (P.x < 6) { Ch.roofT = (Ch.roofT || 0) + dt; if (Ch.roofT > 32) { Ch.roofT = 0; Ch.hr = Math.min(190, Ch.hr + 25); DV.Audio.play('shutter', { volume: 0.8 }); DV.Game.rig.shake = 0.5; Ch.voice('', '[The roof behind you cracks and falls away into the city. There is only the beam.]', 4); P.place(7.4, 3, Math.PI / 2); } }
      return fear;
    },
    threatened: () => DV.Player.x > 6.2,
    hint(Ch) { const x = DV.Player.x; return x > 6 && x < 30 ? 'The wind pushes you — lean into it with A / D. Hold Space to steady your breathing.' : x < 6 ? 'Walk the beam. Or stand here and slow your heart (hold Space).' : ''; },
    fall(Ch) {
      const P = DV.Player;
      Ch.falls++;
      Ch.hr = Math.min(190, Ch.hr + 35);
      DV.Audio.play('whoosh', { volume: 1 });
      DV.UI.fade(1, 250, true).then(() => {
        P.place(4.5, 3, Math.PI / 2); Ch.windV = 0; Ch.gust = 0;
        Ch.voice('', Ch.falls === 1 ? '[You fall. The city rushes up — and you\'re standing on the roof again, heart slamming.]' : '[Again. Again you\'re back on the roof.]', 3.5);
        DV.UI.fade(0, 500, true);
      });
      DV.UI.glitch();
    },
    bend(Ch) {
      Ch.voice('', '[You stop, out on the beam. Steel doesn\'t care how wide you think it is. Except it does, here. You think it wider — and the beam spreads under your feet into a bridge.]', 6);
      Ch.wide = true;
      const z = DV.World.current;
      if (z.beam) z.beam.scale.z = 10;
      DV.Audio.play('glitch');
      Ch.after(3.5, () => Ch.endFear('aware'));
    },
  });

  /* ============================== the first simulation ============================== */
  // Day 6: one fear, the one the serum finds first. (Later sessions and Stage Three run as 'fear_land'.)
  DV.Chapter.define('fear_sim', {
    zone: () => (variant() === 'tank' ? 'fear_tank' : 'fear_beam'),
    start(Ch, zone, opts) {
      Ch.mod = DV.Fear.get(variant());
      DV.Fear.begin(Ch, { music: 'fear' });
      Ch.endFear = (how) => this.end(Ch, how);
      Ch.bending = false; Ch.fast = false;
      Ch.mod.start(Ch, zone);
      Ch.mon.title(Ch.mod.title);
      Ch.hint = null;
      DV.Input.requestLock();
    },
    update(Ch, dt) {
      if (Ch.done) return;
      const M = Ch.mod;
      const fear = M.update(Ch, dt * (Ch.slow || 1));
      if (Ch.done) return;
      if (Ch.bending) { DV.Fear.heart(Ch, dt, 0.3, { calm: false }); return; }
      const r = DV.Fear.heart(Ch, dt, fear, Object.assign({ threatened: M.threatened(Ch), vignette: M.vignette ? M.vignette(Ch) : undefined }, M.heart || {}));
      Ch.mon.hint(M.hint(Ch));
      if (r === 'calm' || r === 'blackout') this.end(Ch, r);
      else if (r === 'aware') { Ch.bending = true; DV.Stats.addXP(20, 'Saw through it'); M.bend(Ch); }
    },
    end(Ch, how) {
      if (Ch.done) return;
      Ch.done = true;
      if (Ch.mod.end) Ch.mod.end(Ch);
      const secs = Math.round(Ch.t);
      DV.Audio.play('whoosh');
      DV.UI.glitch();
      const text = { calm: 'Your heart slows. The world goes white at the edges —', faced: 'You do it. You actually do it — and the world goes white —', aware: 'And the simulation simply stops, like a held breath let go —', blackout: 'The dark comes in from the edges —' }[how];
      Ch.voice('', '[' + text + ']', 3);
      const res = { how, secs, aware: Ch.aware, fear: Ch.v === 'tank' ? 'drowning' : 'falling', id: Ch.v, falls: Ch.falls || 0 };
      DV.Stats.practice('composure', how === 'calm' ? 3 : 1.5);
      DV.UI.fade(1, 1800, true).then(() => {
        DV.Fear.stop(Ch);
        DV.Audio.setMusic('none');
        DV.StageOne.afterFear(res);
      });
    },
  });

  /* ============================== cut: the factionless epilogue ============================== */
  DV.Chapter.define('factionless_epilogue', {
    zone: 'abn_street',
    title: 'FACTIONLESS\nTHE GREY STREETS',
    day: 6, time: '11:10',
    start(Ch, zone, opts) {
      DV.Audio.setMusic('calm');
      const P = DV.Player;
      P.place(44, 6, Math.PI / 2);
      Ch.poor = [0, 1, 2, 3].map((i) => Ch.actor({ id: 'fl' + i, name: 'Factionless', app: (() => { const a = DV.Character.fromFaction('factionless', i % 2 ? 'f' : 'm', 'fle' + i, { age: 24 + i * 11 }); a.height = (a.height || 1) * 1.04; return a; })(), x: 52 + (i % 2) * 1.6, z: 3 + i * 0.9, rot: -Math.PI / 2, action: i === 2 ? 'crouch' : 'idle' }));
      Ch.elder = Ch.actor({ id: 'elder', name: 'Abnegation Volunteer', app: DV.Character.fromFaction('abnegation', 'f', 'volunteer', { age: 52 }), x: 49, z: 8, rot: Math.PI / 2, action: 'idle' });
      Ch.checkpoint('done');
      Ch.after(2.5, () => Ch.say(Ch.poor[0], 'Dauntless black. You\'re new. Everybody\'s new once. Come on — there\'s bread at the corner if you\'re quick.', 5));
      Ch.after(8.5, () => Ch.say(Ch.elder, 'Here. [She presses half a loaf into your hands without looking at your clothes.] Tomorrow too.', 4));
      DV.Inventory.add && DV.Items.get('bread_loaf') && DV.Inventory.add('bread_loaf', 1);
      DV.Quests.isActive('stage_one') && DV.Quests.fail('stage_one', 'Cut.');
      DV.UI.notify('You are factionless. The story of the factionless continues in a later build.', 'info');
    },
  });

  DV.FearSim = { shatter, stepShards, variant };
})();
