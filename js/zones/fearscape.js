/* ==========================================================================
   DIVERGENT — Stage Two and Three: the fear landscape
   Each fear is a small place of its own, with its own way out:
     THE CROWS   a field at dusk; they come down out of the sky for your
                 eyes. Get to the barn, or get down in the wheat and be still.
     THE BOX     a wooden box that gets smaller. One board is loose.
     FIRE        a room going up from the door. The smoke comes down; the
                 window is the only way, if you stay low enough to reach it.
     FAMILY      a cellar, a bulb, a gun in your hand, your mother and father
                 on their knees, and a voice in the dark telling you to shoot.
                 Refusing is an answer.
     YOUR OWN    the one your aptitude test found (DV.Fear.own): the child on
                 the platform you couldn't reach, the dog, the faces that
                 want the truth, or (for the Divergent) the needle in the
                 white corridor.
   (The tank and the beam are in js/zones/fearsim.js.)
   The chapter 'fear_land' plays a run of them (DV.Fear.run): one fear per
   step, a white flash between, every step a checkpoint.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const dist = (x, z) => Math.hypot(DV.Player.x - x, DV.Player.z - z);
  const vmesh = (M, o) => new THREE.Mesh(M.geometry(), new THREE.MeshBasicMaterial(Object.assign({ vertexColors: true, fog: true }, o || {})));
  const adult = (f, sex, seed, age, h) => { const a = DV.Character.fromFaction(f, sex, seed, { age: age || 40 }); a.height = (a.height || 1) * (h || 1.05); return a; };
  // a camera the fear holds (a box doesn't leave room for an orbit): WASD still runs the way it looks
  const hold = (pos, look, lambda) => {
    const rig = DV.Game.rig;
    rig.setTrack(V(pos), V(look), lambda || 6, false, new THREE.Vector3(DV.Player.x, 1.4, DV.Player.z));
    rig.yaw = Math.atan2(look[0] - pos[0], look[2] - pos[2]);
  };
  const pose = (dt, action) => { const P = DV.Player; if (action) P.model.animate(dt, { speed: 0, action }); };

  /* ============================== THE CROWS ============================== */
  const FIELD = 30, BARN = [0, 27];
  DV.Zones.define('fear_crows', {
    name: 'Simulation', region: '', chapter: true, noDiscover: true,
    bounds: { x0: -FIELD - 4, z0: -FIELD - 4, x1: FIELD + 4, z1: FIELD + 4 },
    buildingHeight: 1,
    fog: { color: 0x7d6c55, near: 16, far: 78 },
    sky: { top: 0x3a3a40, horizon: 0xb08a5a, ground: 0x3a3226, skyline: false, clouds: 0.85, glow: 0.4, sun: 0xffb070 },
    exterior: { sunDir: [-0.4, 0.15, 0.8], sunColor: [0.9, 0.62, 0.4], ambient: [0.42, 0.36, 0.3] },
    charLight: { ambient: 0.45, hemi: 0.35, dir: 0.7, dirColor: 0xffb070 },
    ambience: 'outdoor', reverb: 'exterior',
    rooms: [{ id: 'field', name: '', x0: -FIELD, z0: -FIELD, x1: FIELD, z1: FIELD, exterior: true, floor: 'dirt', edge: 'none', light: { ambient: [0.5, 0.42, 0.32], list: [] } }],
    doors: [], props: [],
    spawn: { x: 0, z: -6, rot: 0 },
    build(ctx) {
      const zone = ctx.zone, M = new DV.Vehicles.MB(), r = U.rng('crows-field');
      // the wheat: crossed blades, waist high, everywhere but the cart track up the middle
      const cols = [[0.62, 0.52, 0.3], [0.55, 0.46, 0.26], [0.68, 0.58, 0.34], [0.5, 0.42, 0.24]];
      for (let i = 0; i < 1500; i++) {
        const x = (r() - 0.5) * 2 * FIELD, z = (r() - 0.5) * 2 * FIELD;
        if (Math.abs(x) < 1.1 && z > -14) continue;
        if (Math.hypot(x - BARN[0], z - BARN[1]) < 6) continue;
        const h = 0.8 + r() * 0.5, w = 0.55 + r() * 0.4, a = r() * Math.PI, c = cols[Math.floor(r() * cols.length)];
        for (const da of [0, Math.PI / 2]) {
          const dx = Math.cos(a + da) * w / 2, dz = Math.sin(a + da) * w / 2, lean = (r() - 0.5) * 0.25;
          M.quad([x - dx, 0, z - dz], [x + dx, 0, z + dz], [x + dx * 0.4 + lean, h, z + dz * 0.4], [x - dx * 0.4 + lean, h, z - dz * 0.4], c);
          M.quad([x - dx, 0, z - dz], [x - dx * 0.4 + lean, h, z - dz * 0.4], [x + dx * 0.4 + lean, h, z + dz * 0.4], [x + dx, 0, z + dz], [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8]);
        }
      }
      // a fence across the field, its posts for the crows
      zone.perches = [];
      for (let x = -22; x <= 22; x += 2.2) {
        M.box(x, 0.6, 2, 0.12, 1.2, 0.12, [0.3, 0.24, 0.18]);
        zone.perches.push([x, 1.24, 2]);
      }
      M.box(0, 1.0, 2, 44, 0.06, 0.04, [0.32, 0.26, 0.2]); M.box(0, 0.55, 2, 44, 0.06, 0.04, [0.32, 0.26, 0.2]);
      // the scarecrow, and the dead tree
      M.box(3.5, 1.1, -2, 0.1, 2.2, 0.1, [0.3, 0.22, 0.16]); M.box(3.5, 1.7, -2, 1.5, 0.08, 0.08, [0.3, 0.22, 0.16]);
      M.box(3.5, 1.5, -2, 0.42, 0.7, 0.26, [0.4, 0.32, 0.24]); M.box(3.5, 2.05, -2, 0.26, 0.28, 0.24, [0.62, 0.55, 0.4]);
      zone.perches.push([3.5, 2.25, -2], [2.8, 1.78, -2], [4.2, 1.78, -2]);
      const tree = (tx, tz, s) => {
        M.box(tx, 2 * s, tz, 0.4 * s, 4 * s, 0.4 * s, [0.18, 0.15, 0.13]);
        for (let k = 0; k < 6; k++) {
          const a = k * 1.1, l = (1.6 + (k % 3) * 0.6) * s, y = (2.6 + (k % 3) * 0.7) * s;
          const g = new THREE.BoxGeometry(0.14 * s, 0.14 * s, l); g.rotateX(-0.6); g.rotateY(a); g.translate(tx + Math.sin(a) * l * 0.4, y + 0.5 * s, tz + Math.cos(a) * l * 0.4); M.add(g, [0.18, 0.15, 0.13]);
          zone.perches.push([tx + Math.sin(a) * l * 0.75, y + l * 0.45 * Math.sin(0.6) + 0.5 * s, tz + Math.cos(a) * l * 0.75]);
        }
      };
      tree(-9, 9, 1.2); tree(13, 14, 1); tree(-17, -8, 1.3);
      // the barn at the head of the track: its door the way out
      const [bx, bz] = BARN;
      M.box(bx, 2.5, bz + 2.5, 9, 5, 5, [0.38, 0.2, 0.15]);
      M.prism([bx - 4.8, bx + 4.8, bz - 0.2, bz + 5.2, 5], [bx - 0.4, bx + 0.4, bz - 0.2, bz + 5.2, 7.2], [0.24, 0.18, 0.16]);
      M.box(bx, 1.3, bz - 0.02, 2.4, 2.6, 0.06, [0.2, 0.12, 0.09]);
      M.box(bx, 1.3, bz - 0.06, 0.06, 2.6, 0.04, [1, 0.82, 0.5], { emit: true }); // (light through the gap between the doors)
      zone.colliders.add(bx - 4.5, bz, bx + 4.5, bz + 5, { y1: 5, tag: 'wall' });
      for (let k = 0; k < 12; k++) zone.perches.push([bx - 4 + k * 0.72, 7.25 - Math.abs(k - 5.5) * 0.4, bz + 1]);
      ctx.add(vmesh(M));
      // the birds: every one of them in one mesh (three triangles each), moved every frame
      const N = 84;
      const pos = new Float32Array(N * 27), col = new Float32Array(N * 27);
      for (let i = 0; i < col.length; i += 3) { col[i] = 0.05; col[i + 1] = 0.05; col[i + 2] = 0.06; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true }));
      mesh.frustumCulled = false;
      ctx.add(mesh);
      zone.flock = { mesh, g, pos, col, birds: [] };
      const rb = U.rng('crows');
      for (let i = 0; i < N; i++) {
        const p = zone.perches[i % zone.perches.length];
        zone.flock.birds.push({ x: p[0] + (rb() - 0.5) * 0.3, y: p[1], z: p[2], perch: p, mode: 'perch', a: rb() * 6.3, r: 5 + rb() * 6, h: 3 + rb() * 4, w: (0.5 + rb() * 0.5) * (rb() < 0.5 ? -1 : 1), ph: rb() * 6, lift: 2 + rb() * 9, vy: 0, hx: 1, hz: 0 });
      }
    },
  });
  function drawFlock(fl, t) {
    const pos = fl.pos;
    let k = 0;
    for (const b of fl.birds) {
      const fly = b.mode !== 'perch' && b.mode !== 'ground';
      const s = 0.34, hx = b.hx, hz = b.hz, sx = hz, sz = -hx;
      const flap = fly ? Math.sin(t * (b.mode === 'dive' ? 22 : 13) + b.ph) * 0.5 : 0;
      const span = fly ? s * 1.6 : s * 0.35;
      const body = [b.x + hx * 0.2, b.y, b.z + hz * 0.2], tail = [b.x - hx * 0.24, b.y + (fly ? 0 : 0.05), b.z - hz * 0.24];
      for (const side of [-1, 1]) {
        const tip = [b.x + sx * side * span - hx * 0.08, b.y + flap * span * (fly ? 1 : 0) + (fly ? 0 : 0.06), b.z + sz * side * span - hz * 0.08];
        for (const v of [body, tail, tip]) { pos[k++] = v[0]; pos[k++] = v[1]; pos[k++] = v[2]; }
      }
      // the body and head, a dark wedge standing up
      for (const v of [[b.x + hx * 0.26, b.y + 0.06, b.z + hz * 0.26], tail, [b.x, b.y + 0.14, b.z]]) { pos[k++] = v[0]; pos[k++] = v[1]; pos[k++] = v[2]; }
    }
    fl.g.attributes.position.needsUpdate = true;
  }
  DV.Fear.define('crows', {
    title: 'THE CROWS', zone: 'fear_crows',
    start(Ch, zone) {
      DV.Player.place(0, -6, 0);
      DV.Game.rig.yaw = 0; DV.Game.rig.follow(true);
      Ch.pecks = 0; Ch.peckT = 0; Ch.diveT = 4; Ch.hidden = false; Ch.doorHits = 0; Ch.cawT = 1; Ch.lost = 0;
      Ch.voice('', '[A field at the end of the day, wheat to your waist. On the fence, on the scarecrow, on every branch of the dead trees: crows. All of them turned your way.]', 5.5);
      Ch.interact({ id: 'crows_door', kind: 'action', x: BARN[0], y: 1.2, z: BARN[1] - 0.6, radius: 1.8, label: 'Haul the doors open', name: 'The barn', cond: () => !Ch.done && !Ch.bending, onUse: () => {
        Ch.doorHits++;
        DV.Audio.play('creak', { volume: 0.8 }); DV.Game.rig.shake = 0.12;
        if (Ch.doorHits === 1) Ch.voice('', '[Stuck. The crows are on your back. Again —]', 2.5);
        else { Ch.voice('', '[The doors give. Inside the barn there is nothing at all but white.]', 3); Ch.after(1.0, () => Ch.endFear('faced')); }
      } });
    },
    update(Ch, dt) {
      const P = DV.Player, z = DV.World.current, fl = z.flock;
      const t = Ch.t;
      // down in the wheat and still: they lose you
      const inWheat = Math.abs(P.x) > 1.1 || P.z < -14;
      Ch.hidden = P.crouched && inWheat && P.speed < 0.6 && dist(BARN[0], BARN[1]) > 6;
      Ch.lost = U.clamp(Ch.lost + (Ch.hidden ? dt : -dt * 2), 0, 6);
      const cx = P.x + (Ch.lost > 2 ? Math.sin(t * 0.3) * Ch.lost * 2.5 : 0), cz = P.z + (Ch.lost > 2 ? Math.cos(t * 0.3) * Ch.lost * 2.5 : 0);
      let circling = 0;
      for (const b of fl.birds) {
        if (b.mode === 'perch') {
          if (t > b.lift * (Ch.fast ? 0.5 : 1)) { b.mode = 'circle'; DV.Audio.play('flap', { volume: 0.25 }); }
          b.hx = Math.sin(b.ph); b.hz = Math.cos(b.ph);
          continue;
        }
        if (b.mode === 'fall' || b.mode === 'ground') {
          if (b.mode === 'fall') { b.vy -= 4 * dt; b.y = Math.max(0.03, b.y + b.vy * dt); b.x += b.hx * dt * 0.4; b.z += b.hz * dt * 0.4; if (b.y <= 0.03) b.mode = 'ground'; }
          continue;
        }
        if (b.mode === 'circle') {
          circling++;
          b.a += b.w * dt * (9 / b.r);
          const tx = cx + Math.cos(b.a) * b.r, tz = cz + Math.sin(b.a) * b.r, ty = b.h + Math.sin(t + b.ph) * 0.8 + (Ch.lost > 2 ? 3 : 0);
          const dx = tx - b.x, dy = ty - b.y, dz = tz - b.z, d = Math.hypot(dx, dz) || 1;
          const k = Math.min(1, dt * 2.2);
          b.x += dx * k; b.y += dy * k; b.z += dz * k;
          b.hx = dx / d; b.hz = dz / d;
        } else if (b.mode === 'dive') {
          const dx = P.x - b.x, dy = 1.5 - b.y, dz = P.z - b.z, d = Math.hypot(dx, dy, dz) || 1;
          const s = Math.min(d, 13 * dt);
          b.x += dx / d * s; b.y += dy / d * s; b.z += dz / d * s;
          b.hx = dx / (Math.hypot(dx, dz) || 1); b.hz = dz / (Math.hypot(dx, dz) || 1);
          if (d < 0.6) {
            b.mode = 'circle'; b.a += Math.PI;
            if (!Ch.hidden) {
              Ch.pecks++; Ch.peckT = 1;
              Ch.hr = Math.min(190, Ch.hr + 9);
              P.stamina = Math.max(0, P.stamina - 5);
              DV.Audio.play('punch', { volume: 0.4 }); DV.Audio.play('caw', { volume: 0.7 });
              DV.Game.rig.shake = 0.22;
              if (Ch.pecks === 3) Ch.voice('', '[Beaks. Claws in your hair. You can\'t see for wings.]', 3);
            }
          }
        }
      }
      // one comes down at you, then another, faster as it goes on
      Ch.diveT -= dt;
      if (Ch.diveT <= 0 && circling > 6) {
        Ch.diveT = Ch.hidden ? 4 : U.clamp(2.6 - t * 0.03, 0.7, 2.6) * (Ch.fast ? 0.7 : 1);
        const b = fl.birds.find((x) => x.mode === 'circle' && Math.random() < 0.3) || fl.birds.find((x) => x.mode === 'circle');
        if (b && !Ch.hidden) b.mode = 'dive';
      }
      Ch.cawT -= dt;
      if (Ch.cawT <= 0) { Ch.cawT = 0.4 + Math.random() * (Ch.hidden ? 2.4 : 0.9); DV.Audio.play('caw', { volume: Ch.hidden ? 0.4 : 0.8 }); }
      Ch.peckT = Math.max(0, Ch.peckT - dt);
      drawFlock(fl, t);
      Ch.circling = circling;
      let fear = 0.45 + Math.min(1.1, circling * 0.014) + Ch.peckT * 0.7;
      if (Ch.hidden) fear *= 0.5;
      return fear;
    },
    threatened: (Ch) => Ch.circling > 10,
    calmAs: (Ch) => (Ch.hidden ? 'hidden' : 'calm'),
    hint(Ch) {
      if (Ch.hidden) return 'Down in the wheat, still. Now slow your heart (hold Space).';
      if (dist(BARN[0], BARN[1]) < 3) return 'The barn doors — haul them open (E)';
      return 'Run for the barn at the end of the track. Or get down in the wheat (C) and be still.';
    },
    bend(Ch) {
      Ch.voice('', '[You stand up in the middle of them and stop flinching. They\'re only birds because somebody decided they were. They hang in the air — and come down around you like burnt paper.]', 6);
      const fl = DV.World.current.flock;
      for (const b of fl.birds) if (b.mode !== 'perch') { b.mode = 'fall'; b.vy = 0; }
      for (let i = 0; i < fl.col.length; i += 3) { fl.col[i] = 0.2; fl.col[i + 1] = 0.19; fl.col[i + 2] = 0.18; }
      fl.g.attributes.color.needsUpdate = true;
      DV.Audio.play('glitch');
      Ch.after(3.2, () => Ch.endFear('aware'));
    },
  });

  /* ============================== THE BOX ============================== */
  const BOX = { W0: 1.7, W1: 0.42, H: 2.0 };
  DV.Zones.define('fear_box', {
    name: 'Simulation', region: '', chapter: true, noDiscover: true,
    bounds: { x0: -8, z0: -8, x1: 8, z1: 8 },
    buildingHeight: 1,
    fog: { color: 0x020202, near: 2, far: 16 },
    sky: { visible: false, skyline: false },
    charLight: { ambient: 0.3, hemi: 0.15, dir: 0.4, dirColor: 0xffd0a0 },
    ambience: 'none', reverb: 'small',
    rooms: [{ id: 'void', name: '', x0: -6, z0: -6, x1: 6, z1: 6, exterior: true, floor: 'wood', edge: 'none', light: { ambient: [0.2, 0.17, 0.14], list: [[0, 0, 0.6, 1.6]], range: 4, color: [1, 0.85, 0.6] } }],
    doors: [], props: [],
    spawn: { x: 0, z: 0, rot: 0 },
    build(ctx) {
      const zone = ctx.zone;
      // four walls of planks, each its own mesh (they move), and the lid
      const wall = (loose) => {
        const M = new DV.Vehicles.MB(), r = U.rng('box' + (loose ? 'l' : ''));
        for (let k = 0; k < 9; k++) {
          const x = -1.9 + k * 0.42 + 0.21, c = [0.36 + r() * 0.06, 0.26 + r() * 0.05, 0.17 + r() * 0.04];
          if (loose && k === 5) continue;
          M.box(x, BOX.H / 2, 0, 0.4, BOX.H, 0.06, c);
        }
        M.box(0, 0.25, -0.05, 3.9, 0.1, 0.04, [0.26, 0.18, 0.12]); M.box(0, BOX.H - 0.25, -0.05, 3.9, 0.1, 0.04, [0.26, 0.18, 0.12]);
        return vmesh(M);
      };
      zone.walls = [0, 1, 2, 3].map((i) => { const m = wall(i === 0); ctx.add(m); return m; });
      // the loose board, and the light that comes round it
      const LM = new DV.Vehicles.MB();
      LM.box(0, BOX.H / 2, 0, 0.4, BOX.H, 0.06, [0.4, 0.29, 0.19]);
      zone.board = vmesh(LM); ctx.add(zone.board);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.06, BOX.H * 0.9), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      zone.glow = glow; ctx.add(glow);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 4), new THREE.MeshBasicMaterial({ color: 0x241a12, fog: true }));
      lid.position.y = BOX.H; zone.lid = lid; ctx.add(lid);
      zone.box = { w: BOX.W0 };
    },
  });
  function placeBox(zone, w, fallK) {
    // north wall (with the loose board) at -z, then south, west, east; fallK tips them outward
    const set = [[0, -w, 0, -1], [0, w, Math.PI, 1], [-w, 0, Math.PI / 2, -1], [w, 0, -Math.PI / 2, 1]];
    zone.walls.forEach((m, i) => {
      const [x, z, ry] = set[i];
      m.position.set(x, 0, z); m.rotation.set(0, ry, 0);
      m.scale.x = Math.max(0.12, (w * 2 + 0.1) / 3.9);
      if (fallK) m.rotation.x = -fallK * Math.PI / 2;
    });
    const n = zone.walls[0];
    zone.board.position.set(0.21 * n.scale.x, 0, -w + (zone.boardOut || 0)); zone.board.rotation.set(fallK ? -fallK * Math.PI / 2 : (zone.boardOut || 0) * -2, 0, 0);
    zone.board.scale.x = n.scale.x;
    zone.glow.position.set(0.21 * n.scale.x + 0.2 * n.scale.x + 0.01, BOX.H / 2, -w + 0.035);
    zone.lid.scale.set(Math.max(0.15, (w * 2 + 0.2) / 4), 1, Math.max(0.15, (w * 2 + 0.2) / 4));
  }
  DV.Fear.define('box', {
    title: 'THE BOX', zone: 'fear_box',
    start(Ch, zone) {
      DV.Player.place(0, 0.3, Math.PI);
      zone.box.w = BOX.W0; zone.boardOut = 0;
      Ch.boardHits = 0; Ch.boardNeed = Math.max(4, 11 - DV.Stats.attr('strength')); Ch.crushT = 0; Ch.lidUp = 0; Ch.fallK = 0;
      Ch.seeBoard = DV.Stats.attr('perception') >= 6;
      placeBox(zone, zone.box.w);
      Ch.voice('', '[Wood. Close on every side, and a lid. You can touch two walls at once. Then you hear it: the creak of the boards moving in.]', 5);
      Ch.interact({ id: 'box_board', kind: 'action', x: () => 0.3, y: 1.0, z: () => -zone.box.w + 0.4, radius: 1.0, label: 'Kick the loose board', name: 'The board with light behind it', cond: () => Ch.seeBoard && !Ch.done && !Ch.bending && DV.Player.z < -zone.box.w + 1.0, onUse: () => {
        Ch.boardHits++;
        DV.Audio.play('crate', { volume: 1 }); DV.Game.rig.shake = 0.2;
        zone.boardOut = Math.min(0.12, Ch.boardHits * 0.02);
        if (Ch.boardHits >= Ch.boardNeed) {
          zone.boardOut = 0.5; zone.glow.material.opacity = 1; zone.glow.scale.x = 12;
          DV.Audio.play('creak', { volume: 1 });
          Ch.voice('', '[The board splits and swings out, and light comes in like water. You push through after it.]', 3.5);
          Ch.after(1.6, () => Ch.endFear('faced'));
        }
      } });
    },
    update(Ch, dt) {
      const zone = DV.World.current, P = DV.Player, B = zone.box;
      if (Ch.bending) {
        Ch.fallK = Math.min(1, Ch.fallK + dt * 0.8);
        placeBox(zone, B.w, Ch.fallK);
        zone.lid.position.y = BOX.H + Ch.fallK * 3;
        hold([B.w * 0.6 + 1, 2.4 + Ch.fallK, B.w * 0.6 + 1], [P.x, 1.0, P.z]);
        return 0.2;
      }
      if (Ch.calmed) {
        Ch.lidUp = Math.min(1, Ch.lidUp + dt * 0.6);
        zone.lid.position.y = BOX.H + Ch.lidUp * 2.5;
        zone.lid.rotation.z = Ch.lidUp * 0.6;
        return 0;
      }
      // the walls come in
      if (!Ch.boardBroken) B.w = Math.max(BOX.W1, B.w - dt * 0.03 * (Ch.fast ? 1.4 : 1));
      if (Math.random() < dt * 0.7) DV.Audio.play('creak', { volume: 0.4 + (BOX.W0 - B.w) * 0.4 });
      placeBox(zone, B.w);
      const m = B.w - 0.26;
      P.x = U.clamp(P.x, -m, m); P.z = U.clamp(P.z, -m, m); P.syncModel();
      // the light behind the loose board: you see it at once if you look properly, or in a while
      if (!Ch.seeBoard && Ch.t > 10) Ch.seeBoard = true;
      if (Ch.seeBoard) { zone.glow.material.opacity = 0.4 + Math.sin(Ch.t * 3) * 0.15; if (!Ch.saidBoard) { Ch.saidBoard = true; Ch.voice('', '[A line of light down one board on the far side. It moves when you lean on it.]', 3.2); } }
      if (zone.boardOut > 0.4) Ch.boardBroken = true;
      // the camera: up under the lid in a corner, looking down at you
      hold([B.w * 0.7, BOX.H - 0.12, B.w * 0.7], [P.x * 0.5, 0.75, P.z * 0.5 - 0.1], 9);
      // shut in to nothing
      if (B.w <= BOX.W1 + 0.001) { Ch.crushT += dt; if (Ch.crushT > 7) { Ch.endFear('blackout'); return 2.4; } }
      if (P.crouched) pose(0, null);
      return 0.35 + (BOX.W0 - B.w) / (BOX.W0 - BOX.W1) * 1.7 + (Ch.crushT > 0 ? 0.4 : 0);
    },
    threatened: () => DV.World.current.box.w < 1.25,
    // calm: the lid lifts off, and that's the end of it
    onCalm(Ch) { Ch.calmed = true; DV.Audio.play('creak', { volume: 1 }); Ch.voice('', '[You lie as still as the box will let you, and breathe, and the lid lifts away into the dark.]', 3.5); return 2.2; },
    hint(Ch) {
      const z = DV.World.current;
      if (Ch.seeBoard && DV.Player.z < -z.box.w + 1.0) return 'Kick the loose board — keep kicking (E)';
      if (Ch.seeBoard) return 'The board with the light behind it. Or slow your heart (hold Space).';
      return 'The walls are coming in. Breathe (hold Space). Look for a way out.';
    },
    bend(Ch) {
      Ch.voice('', '[You put a hand flat on each wall and simply push. They don\'t resist. They were never nailed to anything. They fall away from you like the sides of a stage set.]', 6);
      DV.Audio.play('creak', { volume: 1 });
      Ch.after(1.3, () => DV.Audio.play('land', { volume: 1 }));
      Ch.after(3.2, () => Ch.endFear('aware'));
    },
    end() { DV.Game.rig.follow(); },
  });

  /* ============================== FIRE ============================== */
  const ROOM = { x1: 7, z1: 5.5, h: 2.8, door: [6.9, 2.75], win: [0.1, 2.75] };
  const flameTex = () => DV.Tex.custom('flame_b', 64, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h * 0.72, 2, w / 2, h * 0.62, w * 0.52);
    g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.3, 'rgba(255,190,80,0.95)'); g.addColorStop(0.65, 'rgba(230,80,20,0.6)'); g.addColorStop(1, 'rgba(120,20,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(w / 2, 4); c.bezierCurveTo(w * 0.95, h * 0.45, w * 0.95, h * 0.95, w / 2, h - 2); c.bezierCurveTo(w * 0.05, h * 0.95, w * 0.05, h * 0.45, w / 2, 4); c.fill();
  }, { wrap: 'clamp' });
  DV.Zones.define('fear_fire', {
    name: 'Simulation', region: '', chapter: true, noDiscover: true,
    bounds: { x0: -3, z0: -3, x1: 10, z1: 9 },
    buildingHeight: 4, roof: true,
    fog: { color: 0x1a0d08, near: 6, far: 24 },
    sky: { top: 0x05050a, horizon: 0x101018, ground: 0x050505, skyline: false },
    charLight: { ambient: 0.5, hemi: 0.2, dir: 0.6, dirColor: 0xff9a50 },
    ambience: 'none', reverb: 'small',
    rooms: [{ id: 'flat', name: '', x0: 0, z0: 0, x1: ROOM.x1, z1: ROOM.z1, h: ROOM.h, floor: 'wood', wall: 'paint_warm', ceiling: 'ceiling_concrete', light: { ambient: [0.3, 0.18, 0.12], color: [1, 0.6, 0.3], intensity: 0.9, list: [[6.2, 2.75, 1.1, 1.0], [3.5, 2.75, 0.6]], range: 6 } }],
    doors: [{ id: 'ff_door', x: 7, z: 2.75, dir: 'z', w: 1.0, type: 'sealed', label: '', lockMsg: 'The handle burns your hand. The fire is on the other side.' }],
    windows: [{ id: 'ff_win', x: 0, z: 2.75, dir: 'z', w: 1.4, sill: 0.8, top: 2.1 }],
    props: [
      { type: 'bed', x: 2.0, z: 4.6, rotDeg: 90 },
      { type: 'table', x: 4.2, z: 1.2, w: 1.2, d: 0.8, chairs: 2, top: 'wood' },
      { type: 'shelf', x: 4.4, z: 5.25, rotDeg: 180, len: 1.6 },
    ],
    spawn: { x: 3.4, z: 2.75, rot: -Math.PI / 2 },
    build(ctx) {
      const zone = ctx.zone;
      // the flames: one instanced quad each, turned to the camera every frame
      const N = 44;
      const mat = new THREE.MeshBasicMaterial({ map: flameTex(), color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 1.5), mat, N);
      mesh.frustumCulled = false;
      ctx.add(mesh);
      const r = U.rng('fire');
      const pts = [];
      // along the walls from the door, across the floor, up the bed and the shelf
      for (let i = 0; i < N; i++) {
        const k = i / N;
        let x, z;
        if (i % 3 === 0) { x = ROOM.x1 - 0.3 - k * 6.2; z = 0.3; }
        else if (i % 3 === 1) { x = ROOM.x1 - 0.3 - k * 6.2; z = ROOM.z1 - 0.3; }
        else { x = ROOM.x1 - 0.4 - k * 5.4; z = 0.8 + r() * 3.9; }
        const d = Math.hypot(x - ROOM.door[0], z - ROOM.door[1]);
        pts.push({ x, z, s: 0.7 + r() * 0.7, on: d * (2.2 + r() * 0.8) + (i % 3 === 2 ? 6 : 0), ph: r() * 6, k: 0 });
      }
      zone.fire = { mesh, mat, pts, N };
      // the smoke coming down from the ceiling
      const smoke = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x1, ROOM.z1), new THREE.MeshBasicMaterial({ color: 0x1a1612, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide, fog: true }));
      smoke.rotation.x = Math.PI / 2; smoke.position.set(ROOM.x1 / 2, ROOM.h - 0.05, ROOM.z1 / 2);
      const smoke2 = smoke.clone(); smoke2.material = smoke.material.clone(); smoke2.material.opacity = 0.5;
      ctx.add(smoke); ctx.add(smoke2);
      zone.smoke = [smoke, smoke2];
      // the window you can break: glass you can see, and the night through it once it's gone
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.26), new THREE.MeshBasicMaterial({ color: 0xa8c0cc, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
      pane.position.set(0.04, 1.45, 2.75); pane.rotation.y = Math.PI / 2;
      ctx.add(pane); zone.pane = pane;
    },
  });
  DV.Fear.define('fire', {
    title: 'FIRE', zone: 'fear_fire',
    start(Ch, zone) {
      DV.Player.place(3.4, 2.75, -Math.PI / 2);
      DV.Game.rig.yaw = Math.PI / 2; DV.Game.rig.follow(true);
      Ch.smokeY = ROOM.h - 0.1; Ch.winHits = 0; Ch.winNeed = DV.Stats.attr('strength') >= 7 ? 2 : 3; Ch.winOpen = false; Ch.cold = 0; Ch.burnT = 0;
      for (const f of zone.fire.pts) f.k = 0;
      zone.pane.visible = true;
      DV.Audio.play('fire', { volume: 0.8 });
      Ch.voice('', '[Your own room, or a room like it. Under the door, a line of orange. Then the door itself is burning, and the smoke is coming in across the ceiling.]', 5.5);
      Ch.interact({ id: 'fire_window', kind: 'action', x: 0.7, y: 1.2, z: 2.75, radius: 1.3, label: () => (Ch.winOpen ? 'Climb out' : 'Break the window'), name: 'The window', cond: () => !Ch.done && !Ch.bending, onUse: () => {
        if (Ch.winOpen) { Ch.voice('', '[You go out over the sill into cold air, and fall into white.]', 3); Ch.after(1.0, () => Ch.endFear('faced')); return; }
        Ch.winHits++;
        DV.Audio.play('punch', { volume: 0.7 }); DV.Audio.play('crack', { volume: 0.8 }); DV.Game.rig.shake = 0.15;
        if (Ch.winHits >= Ch.winNeed) { Ch.winOpen = true; DV.World.current.pane.visible = false; DV.Audio.play('glass', { volume: 1 }); Ch.voice('', '[The glass goes. Air — real air — comes in round you, and the fire roars for it.]', 3.5); }
      } });
    },
    update(Ch, dt) {
      const zone = DV.World.current, P = DV.Player, F = zone.fire;
      const t = Ch.t * (Ch.fast ? 1.35 : 1);
      // the fire spreads from the door; the smoke comes down
      if (!Ch.bending) Ch.smokeY = Math.max(0.95, ROOM.h - 0.1 - t * 0.032);
      zone.smoke[0].position.y = Ch.smokeY; zone.smoke[1].position.y = Math.min(ROOM.h - 0.05, Ch.smokeY + 0.35);
      const cam = DV.Game.camera, m = new THREE.Matrix4(), q = new THREE.Quaternion();
      let heat = 0, touch = false;
      F.pts.forEach((f, i) => {
        const on = t > f.on;
        f.k = U.damp(f.k, on ? 1 : 0, 1.5, dt);
        const s = f.s * f.k * (0.85 + Math.sin(Ch.t * 9 + f.ph) * 0.12 + Math.sin(Ch.t * 23 + f.ph * 2) * 0.05);
        const y = 0.65 * s;
        q.setFromEuler(new THREE.Euler(0, Math.atan2(cam.position.x - f.x, cam.position.z - f.z), 0));
        m.compose(new THREE.Vector3(f.x, y, f.z), q, new THREE.Vector3(Math.max(0.001, s), Math.max(0.001, s), 1));
        F.mesh.setMatrixAt(i, m);
        if (f.k > 0.4) { const d = Math.hypot(P.x - f.x, P.z - f.z); heat += f.k / (d + 0.6); if (d < 0.5) touch = true; }
      });
      F.mesh.instanceMatrix.needsUpdate = true;
      if (Ch.bending) { F.mat.color.lerp(new THREE.Color(0x6080ff), Math.min(1, dt * 1.5)); return 0.2; }
      if (Math.random() < dt * 1.2) DV.Audio.play(Math.random() < 0.6 ? 'crackle' : 'fire', { volume: 0.5 + Math.min(0.5, heat * 0.1) });
      // a flame: it hurts, and you flinch back from it
      if (touch) { Ch.burnT += dt; if (Ch.burnT > 0.3) { Ch.burnT = 0; Ch.hr = Math.min(190, Ch.hr + 12); DV.Game.rig.shake = 0.2; DV.Audio.play('hit', { volume: 0.5 }); P.x += 0.5; P.syncModel(); } }
      // the smoke: above it you choke
      const head = P.crouched ? 1.0 : 1.62;
      Ch.inSmoke = head > Ch.smokeY;
      if (Ch.inSmoke) { P.stamina = Math.max(0, P.stamina - dt * 6); if (Math.random() < dt * 0.8) DV.Game.rig.shake = 0.1; }
      // the room lights you orange
      P.model.setTint(1.25, 0.78 + Math.sin(Ch.t * 11) * 0.04, 0.5);
      DV.Fear.look(Ch.panic, Ch.inSmoke ? 'blur(1.2px)' : '');
      return 0.45 + Math.min(1.0, heat * 0.22) + (Ch.inSmoke ? 0.8 : 0) + Math.min(0.5, t * 0.006);
    },
    threatened: (Ch) => Ch.smokeY < 2.1,
    onCalm(Ch) { Ch.voice('', '[Low on the boards, in the last of the clean air, you make your heart slow down. The roar goes quiet. The fire was only ever as big as you were afraid.]', 4); return 2.2; },
    hint(Ch) {
      if (Ch.inSmoke) return 'You can\'t breathe up there — get down (C)!';
      if (dist(0.7, 2.75) < 1.4) return Ch.winOpen ? 'Climb out (E)' : 'Break the window (E)';
      return 'The window — stay under the smoke. Or slow your heart (hold Space).';
    },
    bend(Ch) {
      Ch.voice('', '[You hold your hand in the nearest flame. It\'s cold. Of course it\'s cold. The whole room goes pale and blue, and the door is only a door.]', 5.5);
      DV.Audio.play('glitch');
      Ch.after(3.4, () => Ch.endFear('aware'));
    },
    end() { DV.Fear.look(0); },
  });

  /* ============================== FAMILY ============================== */
  DV.Zones.define('fear_family', {
    name: 'Simulation', region: '', chapter: true, noDiscover: true,
    bounds: { x0: -2, z0: -2, x1: 12, z1: 12 },
    buildingHeight: 4, roof: true,
    fog: { color: 0x030303, near: 4, far: 16 },
    sky: { visible: false, skyline: false },
    charLight: { ambient: 0.5, hemi: 0.2, dir: 0.8, dirColor: 0xffe0b0 },
    ambience: 'none', reverb: 'tiled',
    rooms: [{ id: 'cellar', name: '', x0: 0, z0: 0, x1: 10, z1: 10, h: 3.2, floor: 'concrete_dark', wall: 'concrete_dark', ceiling: 'ceiling_concrete', light: { ambient: [0.1, 0.1, 0.11], color: [1, 0.88, 0.66], intensity: 1.7, list: [[5, 5.2, 1.7, 2.9]], range: 7, fixture: 'bulb' } }],
    doors: [], props: [],
    spawn: { x: 5, z: 3, rot: 0 },
    build() {},
  });
  DV.Fear.define('family', {
    title: 'YOUR FAMILY', zone: 'fear_family',
    heart: { calm: false, awareAfter: 7 },
    start(Ch) {
      const P = DV.Player;
      P.place(5, 3, 0); P.pinned = true;
      DV.Game.rig.yaw = 0; DV.Game.rig.pitch = 0.08;
      Ch.mom = Ch.actor({ id: 'mom', name: 'Mom', app: DV.Build2.parentApp('mom'), x: 4.3, z: 6.4, rot: Math.PI, action: 'kneel' });
      Ch.dad = Ch.actor({ id: 'dad', name: 'Dad', app: DV.Build2.parentApp('dad'), x: 5.7, z: 6.4, rot: Math.PI, action: 'kneel' });
      Ch.voiceA = Ch.actor({ id: 'voice', name: 'The voice', app: adult('dauntless', 'm', 'the-voice', 40, 1.1), x: 5, z: 9.3, rot: Math.PI, action: 'arms_crossed' });
            Ch.gun = DV.Arms.pistol(); Ch.gun.scale.setScalar(1.25);
      DV.Game.scene.add(Ch.gun);
      Ch.addObject({ dispose: () => { if (Ch.gun && Ch.gun.parent) Ch.gun.parent.remove(Ch.gun); } });
      Ch.count = null; Ch.lowerT = 0; Ch.decided = false; Ch.shots = 0;
      const lines = [
        [1.2, () => Ch.voice('', '[A bulb on a wire. Concrete. Something heavy in your hands: a pistol, loaded. In front of you, on their knees on the floor, your mother and your father.]', 5.5)],
        [6.5, () => Ch.say(Ch.voiceA, 'Shoot them.', 2.6)],
        [9.5, () => Ch.say(Ch.mom, 'It\'s all right. Look at me. Not at him — at me.', 3.6)],
        [13.5, () => Ch.say(Ch.voiceA, 'You have ten seconds. Then I do it, and you watch.', 3.6)],
        [16.5, () => { Ch.say(Ch.dad, 'Whatever you do, we know you. That doesn\'t change.', 3.6); Ch.count = 10; Ch.countT = 1.7; }],
      ];
      for (const [t, f] of lines) Ch.after(t * (Ch.fast ? 0.6 : 1), f);
    },
    update(Ch, dt) {
      const P = DV.Player, rig = DV.Game.rig, input = DV.Input;
      // aim: the mouse moves the gun (it's yours to point anywhere)
      const yaw = rig.yaw, pitch = U.clamp(-rig.pitch * 0.7 + 0.08, -0.3, 0.35);
      const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), rt = new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw));
      const eye = new THREE.Vector3(P.x, 1.66 * P.scale, P.z).addScaledVector(rt, 0.55).addScaledVector(fw, -0.5);
      rig.setTrack(eye, eye.clone().addScaledVector(dir, 6), 18, false, new THREE.Vector3(P.x, 1.6, P.z));
      P.rot = U.dampAngle(P.rot, yaw, 12, dt); P.syncModel();
      const lowered = Ch.lowerT > 0.2;
      P.model.animate(dt, { speed: 0, action: lowered ? 'idle' : 'aim', aimPitch: pitch * 0.9 });
      const hand = P.model.boneWorld('handR', new THREE.Vector3()).lerp(P.model.boneWorld('handL', new THREE.Vector3()), 0.4).addScaledVector(dir, 0.07);
      Ch.gun.position.copy(hand); Ch.gun.lookAt(hand.clone().add(lowered ? new THREE.Vector3(0, -1, 0.3) : dir));
      Ch.gun.userData.flash.opacity = Math.max(0, Ch.gun.userData.flash.opacity - dt * 14);
      Ch.voiceA.model.setTint(0.05, 0.05, 0.06); // (a shape in the dark, never a face)
      if (Ch.decided || Ch.bending) return 0.4;
      // the count
      if (Ch.count !== null) {
        Ch.countT -= dt;
        if (Ch.countT <= 0) {
          Ch.count--; Ch.countT = 1.6;
          if (Ch.count > 0) { Ch.say(Ch.voiceA, String(Ch.count) + '.', 1.2); DV.Audio.play('tick', { volume: 0.7 }); }
          else { this.decide(Ch, 'froze'); return 2; }
        }
      }
      // lower the gun (hold Q): no
      if (input.down('KeyQ') || input.down('KeyS')) { Ch.lowerT += dt; if (Ch.lowerT > 1.5) { this.decide(Ch, 'refused'); return 1; } } else Ch.lowerT = Math.max(0, Ch.lowerT - dt * 2);
      // fire
      if (input.consume('MouseLeft') || input.consume('KeyJ')) {
        DV.Audio.play('gunshot', { volume: 1 }); Ch.gun.userData.flash.opacity = 1; DV.Game.rig.shake = 0.12;
        const ang = (a) => { const v = new THREE.Vector3(a.x, 1.0, a.z).sub(eye).normalize(); return v.angleTo(dir); };
        const tv = new THREE.Vector3(Ch.voiceA.x, 1.55, Ch.voiceA.z).sub(eye).normalize().angleTo(dir);
        if (Math.min(ang(Ch.mom), ang(Ch.dad)) < 0.2) { this.decide(Ch, 'shot'); return 2.4; }
        if (tv < 0.16) { this.decide(Ch, 'defied'); return 1.2; }
        Ch.shots++;
        Ch.say(Ch.voiceA, Ch.shots === 1 ? 'Into the dark? Again. At them.' : 'You\'re wasting it.', 2.2);
      }
      const k = Ch.count === null ? 0 : (10 - Ch.count) / 10;
      return 0.9 + k * 1.3;
    },
    decide(Ch, how) {
      Ch.decided = true;
      if (how === 'shot') {
        Ch.voice('', '[You do it. The sound is enormous in the little room, and then there is no room at all.]', 3.5);
        DV.State.setFlag('fear_family_shot');
        Ch.after(1.6, () => Ch.endFear('shot'));
      } else if (how === 'defied') {
        Ch.say(Ch.voiceA, '[The shot goes straight through him, and he laughs.] Brave. Wrong, but brave.', 3);
        Ch.after(2.6, () => Ch.endFear('defied'));
      } else {
        // lowered, or frozen: the voice does it instead, and the simulation ends on you
        Ch.say(Ch.voiceA, how === 'froze' ? 'Time.' : 'Then you\'ve chosen.', 2);
        Ch.after(1.4, () => { DV.Audio.play('gunshot', { volume: 1 }); DV.UI.fade(1, 120, true); });
        Ch.after(2.2, () => Ch.endFear('refused'));
        if (how === 'refused') Ch.after(0.2, () => Ch.voice('', '[You lower the gun. You say it out loud, so they hear: "No."]', 2.2));
      }
    },
    hint(Ch) {
      if (Ch.decided) return '';
      return Ch.count === null ? 'Hold the gun. Or don\'t.' : 'LMB fire · hold Q to lower the gun';
    },
    bend(Ch) {
      Ch.voice('', '[You open your hand. There\'s no gun in it — there never was. And these aren\'t them. They\'re what someone thinks you love. You say so, and they go to light.]', 6);
      Ch.gun.visible = false;
      DV.Audio.play('glitch');
      Ch.after(2.2, () => { Ch.mom.model.root.visible = false; Ch.dad.model.root.visible = false; Ch.voiceA.model.root.visible = false; });
      Ch.after(3.6, () => Ch.endFear('aware'));
    },
    end() { DV.Player.pinned = false; DV.Game.rig.follow(); },
  });

  /* ============================== YOUR OWN FEAR ============================== */
  const OWN = {
    child: { title: 'THE PLATFORM', fog: 0x060708, floor: 'concrete' },
    dog: { title: 'THE DOG', fog: 0x0a0806, floor: 'gravel' },
    tribunal: { title: 'THE TRIBUNAL', fog: 0x020203, floor: 'marble_check' },
    needle: { title: 'THE WHITE CORRIDOR', fog: 0xd8dde0, floor: 'tile_white' },
  };
  const ownId = () => (DV.Fear.st().ownFear || (DV.Fear.st().ownFear = DV.Fear.own().id));
  DV.Zones.define('fear_own', {
    name: 'Simulation', region: '', chapter: true, noDiscover: true,
    bounds: { x0: -20, z0: -20, x1: 20, z1: 20 },
    buildingHeight: 1,
    fog: { color: 0x050506, near: 8, far: 32 },
    sky: { visible: false, skyline: false },
    charLight: { ambient: 0.4, hemi: 0.2, dir: 0.5, dirColor: 0xd0d8ff },
    ambience: 'none', reverb: 'tiled',
    rooms: [
      { id: 'platform', name: '', x0: -3, z0: -18, x1: 3, z1: 18, exterior: true, floor: 'concrete', edge: 'none', light: { ambient: [0.16, 0.17, 0.2], list: [[0, -12, 0.7], [0, -4, 0.7], [0, 4, 0.7], [0, 12, 0.7]], range: 7, color: [0.8, 0.9, 1] } },
      { id: 'yard', name: '', x0: -12, z0: -18, x1: -3, z1: 18, exterior: true, floor: 'gravel', edge: 'none', light: { ambient: [0.16, 0.15, 0.14], list: [] } },
      { id: 'yard2', name: '', x0: 3, z0: -18, x1: 12, z1: 18, exterior: true, floor: 'gravel', edge: 'none', light: { ambient: [0.16, 0.15, 0.14], list: [] } },
    ],
    doors: [], props: [],
    spawn: { x: 0, z: -10, rot: 0 },
    build(ctx) {
      const zone = ctx.zone, M = new DV.Vehicles.MB(), v = ownId();
      zone.ownVariant = v;
      if (v === 'child') {
        // the platform from your test, stretched out into the dark: its edge, the drop, the rails
        for (let z = -18; z < 18; z += 1) M.box(3.05, -0.02, z + 0.5, 0.1, 0.06, 0.96, [0.75, 0.68, 0.2]);
        M.box(4.6, -1.0, 0, 3, 0.1, 36, [0.06, 0.06, 0.07]);
        for (const x of [4.0, 5.2]) M.box(x, -0.92, 0, 0.08, 0.08, 36, [0.3, 0.3, 0.32]);
        for (let z = -16; z <= 16; z += 6) { M.box(-2.6, 2, z, 0.4, 4, 0.4, [0.3, 0.3, 0.32]); M.box(0, 3.3, z, 0.1, 0.1, 1.6, [0.9, 0.95, 1], { emit: true }); }
        zone.colliders.add(-12, -18, -3, 18, { y1: 3, tag: 'wall' }); zone.colliders.add(3, -18, 12, 18, { y1: 3, tag: 'wall' });
      } else if (v === 'dog') {
        // a yard behind a fence at night, a lamp on a pole, the fence too high to climb
        for (let a = 0; a < Math.PI * 2; a += 0.2) { const x = Math.cos(a) * 10.5, z = Math.sin(a) * 10.5; M.box(x, 1.4, z, 0.12, 2.8, 0.12, [0.3, 0.3, 0.3]); }
        M.box(0, 0.06, 0, 0.6, 0.12, 0.6, [0.2, 0.2, 0.2]); M.box(-6, 2.5, -6, 0.15, 5, 0.15, [0.25, 0.25, 0.25]); M.box(-6, 5, -5.6, 0.5, 0.15, 0.8, [1, 0.9, 0.6], { emit: true });
      } else if (v === 'tribunal') {
        // a table under one lamp, a chair, and beyond the light, the faces
        M.box(0, 0.75, 1.2, 1.6, 0.06, 0.9, [0.08, 0.08, 0.08]); for (const [x, z] of [[-0.7, 0.85], [0.7, 0.85], [-0.7, 1.55], [0.7, 1.55]]) M.box(x, 0.37, z, 0.05, 0.74, 0.05, [0.08, 0.08, 0.08]);
        M.box(0, 3.4, 1.2, 0.04, 1.4, 0.04, [0.1, 0.1, 0.1]); M.box(0, 2.7, 1.2, 0.5, 0.18, 0.5, [0.15, 0.15, 0.15]); M.box(0, 2.6, 1.2, 0.36, 0.02, 0.36, [1, 0.95, 0.8], { emit: true });
        zone.colliders.add(-0.8, 0.75, 0.8, 1.65, { y1: 0.8, tag: 'prop' });
        // light from the lamp, as a cone
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 2.4, 2.6, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        cone.position.set(0, 1.3, 1.2); ctx.add(cone); zone.cone = cone;
      } else {
        // the Testing Center's corridor, white and long, and a door with your name on it
        for (const x of [-2.2, 2.2]) M.box(x, 1.6, 0, 0.2, 3.2, 36, [0.88, 0.9, 0.9]);
        M.box(0, 3.25, 0, 4.6, 0.1, 36, [0.92, 0.93, 0.94]);
        for (let z = -16; z <= 16; z += 4) M.box(0, 3.18, z, 1.2, 0.04, 0.5, [1, 1, 1], { emit: true });
        M.box(-2.08, 1.1, 6, 0.06, 2.2, 1.1, [0.42, 0.5, 0.58]);
        zone.colliders.add(-2.3, -18, -2.1, 18, { y1: 3.2, tag: 'wall' }); zone.colliders.add(2.1, -18, 2.3, 18, { y1: 3.2, tag: 'wall' });
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshBasicMaterial({ map: DV.Tex.sign((DV.State.data.player.name || 'YOU').toUpperCase(), { w: 256, h: 80, bg: '#d8dde0', color: '#7a1010', borderColor: '#7a1010' }), fog: true }));
        plate.position.set(-2.04, 2.4, 6); plate.rotation.y = Math.PI / 2; ctx.add(plate);
      }
      if (M.count) ctx.add(vmesh(M));
    },
  });
  DV.Fear.define('own', {
    get title() { return OWN[ownId()].title; },
    zone: 'fear_own',
    start(Ch, zone) {
      const v = zone.ownVariant || ownId(), P = DV.Player;
      Ch.own = v; Ch.ownStep = 0; Ch.calls = 0; Ch.stands = 0;
      const sc = DV.World.scene;
      if (sc.fog) { sc.fog.color.setHex(OWN[v].fog); sc.background.setHex(OWN[v].fog); }
      if (v === 'needle') { sc.fog.near = 14; sc.fog.far = 40; }
      const own = DV.Fear.own();
      Ch.after(0.5, () => Ch.voice('', '[' + own.line + ']', 5));
      this['start_' + v](Ch, zone, P);
    },
    update(Ch, dt) { return this['update_' + Ch.own](Ch, dt, DV.Player); },
    threatened(Ch) { return Ch.own === 'dog' ? !!(Ch.dog && Math.hypot(Ch.dog.x - DV.Player.x, Ch.dog.z - DV.Player.z) < 7) : Ch.own === 'needle' ? Ch.techs && Ch.techs.some((a) => Math.abs(a.z - DV.Player.z) < 6) : true; },
    onCalm(Ch) { return this['calm_' + Ch.own](Ch); },
    hint(Ch) {
      const P = DV.Player;
      switch (Ch.own) {
        case 'child': return P.speed > 0.5 ? 'She\'s always further away. Stop running.' : 'Call to her (E), or stand and breathe (hold Space).';
        case 'dog': return 'Don\'t run. Get down (C) and hold still when it comes — or shove it off (E).';
        case 'tribunal': return Ch.answered ? '' : 'Answer them (E). Or breathe (hold Space).';
        default: return dist(-1.6, 6) < 1.6 ? 'The door with your name on it (E)' : 'Stand still and slow your heart. Or get to the door with your name.';
      }
    },
    bend(Ch) {
      const P = DV.Player;
      if (Ch.own === 'child') {
        Ch.voice('', '[The platform is only as long as you let it be. You fold it in your head like paper, and she\'s standing in front of you, holding out her hand.]', 5);
        Ch.child.place(P.x, P.z + 1.2, Math.PI);
      } else if (Ch.own === 'dog') {
        Ch.voice('', '[You look at it properly. It\'s not a monster. It\'s a dog that was hungry once, in a test. It shrinks to what it was, and sits.]', 5);
        Ch.dog.root.scale.setScalar(0.5); Ch.dog.mode = 'calm'; Ch.dog.target = null;
      } else if (Ch.own === 'tribunal') {
        Ch.voice('', '[You reach up and switch off the lamp. Without the light on you, they have no faces at all.]', 4.5);
        for (const a of Ch.faces) a.model.root.visible = false;
        if (DV.World.current.cone) DV.World.current.cone.visible = false;
      } else {
        Ch.voice('', '[They stop, needles up, and you walk between them. You aren\'t what they\'re looking for. Not here. Not in your own head.]', 5);
        for (const a of Ch.techs) a.stop();
      }
      DV.Audio.play('glitch');
      Ch.after(3.4, () => Ch.endFear('aware'));
    },
    end() { DV.Game.rig.follow(); },

    /* ---- the platform: a child you can't reach ---- */
    start_child(Ch, zone, P) {
      P.place(0, -12, 0); DV.Game.rig.yaw = 0; DV.Game.rig.follow(true);
      Ch.child = Ch.actor({ id: 'child', name: 'The child', app: (() => { const a = DV.Character.fromFaction('abnegation', 'f', 'lost-child', { age: 8 }); a.height = 0.62; return a; })(), x: 0, z: 6, rot: Math.PI, action: 'idle' });
      Ch.cryT = 2;
      Ch.interact({ id: 'own_call', kind: 'action', x: () => P.x, y: 1.2, z: () => P.z, radius: 3, label: 'Call to her', name: 'The child', cond: () => !Ch.done && !Ch.bending && P.speed < 0.5 && !Ch.coming, onUse: () => {
        Ch.calls++;
        Ch.say(Ch.child, ['[She stops crying, and looks for you.]', '[She takes one step your way.]', '[She runs to you.]'][Math.min(2, Ch.calls - 1)], 2.4);
        DV.Audio.play('step', { volume: 0.5 });
        if (Ch.calls >= 3) this.calm_child(Ch);
      } });
    },
    update_child(Ch, dt, P) {
      const c = Ch.child;
      if (Ch.coming) {
        c.walk([[P.x, P.z + 0.8]], 2.2);
        if (Math.hypot(c.x - P.x, c.z - P.z) < 1.0 && !Ch.ended) { Ch.ended = true; Ch.voice('', '[A small hand in yours. That\'s all it ever wanted: for you to stop, and be there.]', 3.5); Ch.after(2.0, () => Ch.endFear(Ch.calls >= 3 ? 'faced' : 'calm')); }
        return 0.2;
      }
      Ch.cryT -= dt;
      if (Ch.cryT <= 0) { Ch.cryT = 3 + Math.random() * 2; Ch.say(c, U.pick(['Help me! Please!', 'Where are you?', 'I can\'t see you!', 'Don\'t leave me here!']), 2.2); }
      // get close and she's further: always further
      const d = Math.hypot(c.x - P.x, c.z - P.z);
      if (d < 5 && P.speed > 0.6) {
        Ch.ownStep++;
        DV.UI.glitch();
        const nz = P.z + (c.z > P.z ? 1 : -1) * (11 + Ch.ownStep * 2);
        c.place(U.clamp((Math.random() - 0.5) * 3, -2.2, 2.2), U.clamp(nz, -16, 16), c.z > P.z ? Math.PI : 0);
        if (Math.abs(nz) > 16) c.place(c.x, P.z < 0 ? 16 : -16, P.z < 0 ? Math.PI : 0);
        Ch.hr = Math.min(190, Ch.hr + 12);
      }
      c.face(P.x, P.z);
      return 0.75 + Ch.ownStep * 0.3 + (P.speed > 2 ? 0.3 : 0);
    },
    calm_child(Ch) { if (!Ch.coming) { Ch.coming = true; Ch.voice('', '[You stop. You stand still, and you call her name — and she comes to you.]', 3); } return 99; },

    /* ---- the dog ---- */
    start_dog(Ch, zone, P) {
      P.place(0, 0, 0); DV.Game.rig.yaw = 0; DV.Game.rig.follow(true);
      const dog = new DV.SimDog(-7, 3);
      dog.root.scale.setScalar(1.9); dog.mode = 'stalk';
      Ch.dog = dog;
      Ch.addObject({ update: (dt) => dog.update(dt, DV.World.current), dispose: () => dog.dispose() });
      Ch.dogA = Math.PI; Ch.lungeT = 5; Ch.dogState = 'circle';
      DV.Audio.play('growl', { volume: 0.8 });
      Ch.interact({ id: 'own_shove', kind: 'action', x: () => dog.x, y: 0.8, z: () => dog.z, radius: 2.2, label: 'Shove it off', name: 'The dog', cond: () => Ch.dogState === 'lunge' && !Ch.done && !Ch.bending, onUse: () => this.stand(Ch, 'shove') });
    },
    stand(Ch, how) {
      Ch.stands++;
      Ch.dogState = 'back'; Ch.backT = 1.2;
      DV.Audio.play(how === 'shove' ? 'punch' : 'yelp', { volume: 0.8 });
      if (how === 'shove') DV.Game.rig.shake = 0.2;
      Ch.voice('', ['[It stops a foot from your face, and backs off, growling.]', '[It comes again. Again you don\'t move. It isn\'t sure of you any more.]', '[It stops. Its ears go down. It lies at your feet like a dog.]'][Math.min(2, Ch.stands - 1)], 3);
      if (Ch.stands >= 3) { Ch.dog.mode = 'calm'; Ch.dogState = 'done'; Ch.after(2.4, () => Ch.endFear('faced')); }
    },
    update_dog(Ch, dt, P) {
      const dog = Ch.dog;
      const d = Math.hypot(dog.x - P.x, dog.z - P.z);
      if (Ch.dogState === 'done' || Ch.bending) return 0.3;
      if (Ch.dogState === 'circle') {
        Ch.dogA += dt * 0.5;
        dog.target = [P.x + Math.cos(Ch.dogA) * 6.5, P.z + Math.sin(Ch.dogA) * 6.5]; dog.spd = 2.6; dog.mode = 'stalk';
        Ch.lungeT -= dt * (P.speed > 2 ? 2 : 1);
        if (Ch.lungeT <= 0) { Ch.dogState = 'lunge'; DV.Audio.play('bark', { volume: 1 }); }
        if (Math.random() < dt * 0.4) DV.Audio.play('growl', { volume: 0.6 });
      } else if (Ch.dogState === 'lunge') {
        dog.target = [P.x, P.z]; dog.spd = P.speed > 2 ? 7 : 5.5; dog.mode = 'lunge';
        if (d < 1.3) {
          if (P.crouched && P.speed < 0.4) this.stand(Ch, 'still');
          else { Ch.hr = Math.min(190, Ch.hr + 18); DV.Game.rig.shake = 0.35; DV.Audio.play('bark', { volume: 1 }); P.stamina = Math.max(0, P.stamina - 15); Ch.dogState = 'back'; Ch.backT = 1.5; }
        }
      } else if (Ch.dogState === 'back') {
        Ch.backT -= dt;
        dog.target = [P.x + (dog.x - P.x) / (d || 1) * 6, P.z + (dog.z - P.z) / (d || 1) * 6]; dog.spd = 3; dog.mode = 'stalk';
        if (Ch.backT <= 0) { Ch.dogState = 'circle'; Ch.lungeT = 3.5 + Math.random() * 2; }
      }
      return 0.7 + U.clamp((8 - d) / 8, 0, 1) * 1.1 + (Ch.dogState === 'lunge' ? 0.5 : 0);
    },
    calm_dog(Ch) { Ch.dog.mode = 'calm'; Ch.dogState = 'done'; Ch.voice('', '[Your heart slows, and the dog stops circling, as if it can hear it. It lies down.]', 3.5); return 2.2; },

    /* ---- the tribunal ---- */
    start_tribunal(Ch, zone, P) {
      P.place(0, 0.2, 0); DV.Game.rig.yaw = 0; DV.Game.rig.follow(true);
      Ch.ring = 5.2; Ch.answered = false;
      Ch.faces = [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
        const f = ['candor', 'erudite', 'abnegation', 'dauntless', 'amity', 'candor', 'erudite'][i];
        const A = Ch.actor({ id: 'face' + i, name: '', app: adult(f, i % 2 ? 'f' : 'm', 'face' + i, 30 + i * 5), x: Math.cos(a) * Ch.ring, z: 1.2 + Math.sin(a) * Ch.ring, rot: 0, action: 'arms_crossed' });
        A.a = a; A.face(0, 1.2); return A;
      });
      Ch.askT = 3;
      Ch.interact({ id: 'own_answer', kind: 'action', x: 0, y: 1.0, z: 0.5, radius: 3, label: 'Answer them', name: 'The faces', cond: () => !Ch.done && !Ch.bending && !Ch.answered && !DV.Dialogue.isActive(), onUse: () => Ch.scene('fear_tribunal') });
    },
    update_tribunal(Ch, dt, P) {
      if (Ch.answered) return 0.2;
      // they come closer while you don't answer
      Ch.ring = Math.max(1.5, Ch.ring - dt * 0.07 * (Ch.fast ? 1.4 : 1));
      for (const A of Ch.faces) { A.place(Math.cos(A.a) * Ch.ring, 1.2 + Math.sin(A.a) * Ch.ring); A.face(P.x, P.z); }
      Ch.askT -= dt;
      if (Ch.askT <= 0) {
        Ch.askT = 4.5;
        const A = U.pick(Ch.faces);
        Ch.say(A, U.pick(['What did you do?', 'Say it.', 'We already know. Say it.', 'Everybody heard you. Say it again.', 'Why are you lying?']), 2.6);
      }
      return 0.7 + (5.2 - Ch.ring) * 0.3 + (Ch.lied ? 0.5 : 0);
    },
    calm_tribunal(Ch) { Ch.answered = true; Ch.voice('', '[You don\'t answer. You breathe, and wait, and one by one they lose interest in you and step back into the dark.]', 4); return 2.4; },

    /* ---- the white corridor ---- */
    start_needle(Ch, zone, P) {
      P.place(0, 0, 0); DV.Game.rig.yaw = 0; DV.Game.rig.follow(true);
      const tech = (id, z, rot) => {
        const A = Ch.actor({ id, name: 'Technician', app: adult('erudite', id.length % 2 ? 'f' : 'm', 'tech:' + id, 38), x: (Math.random() - 0.5) * 1.6, z, rot, action: 'idle' });
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 5), new THREE.MeshBasicMaterial({ color: 0xd8f0ff }));
        s.rotation.x = Math.PI / 2; A.model.attach('handR', s);
        A.walk([[A.x, 0]], Ch.fast ? 0.9 : 0.65);
        return A;
      };
      Ch.techs = [tech('t1', -15, 0), tech('t2', -13, 0), tech('t3', 15, Math.PI), tech('t4', 13, Math.PI)];
      Ch.say(Ch.techs[0], 'There you are. This won\'t take long.', 3);
      Ch.interact({ id: 'own_door', kind: 'action', x: -1.6, y: 1.2, z: 6, radius: 1.6, label: 'Open the door with your name on it', name: 'A door', cond: () => !Ch.done && !Ch.bending, onUse: () => { DV.Audio.play('door'); Ch.voice('', '[Your own name, on a door. You open it, and step through into white.]', 3); Ch.after(1.0, () => Ch.endFear('faced')); } });
    },
    update_needle(Ch, dt, P) {
      if (Ch.passing) { for (const a of Ch.techs) if (!a.moving) a.walk([[a.x, a.z > 0 ? -20 : 20]], 0.9); return 0; }
      let close = 9;
      for (const a of Ch.techs) {
        if (!a.moving && !Ch.bending) a.walk([[U.clamp(P.x, -1.6, 1.6), P.z]], Ch.fast ? 0.9 : 0.65);
        const d = Math.hypot(a.x - P.x, a.z - P.z);
        close = Math.min(close, d);
        if (d < 0.9 && !Ch.bending) {
          // hands on you: the needle comes up, and you tear free back to the middle
          Ch.hr = Math.min(190, Ch.hr + 16); DV.Game.rig.shake = 0.3; DV.Audio.play('scuff', { volume: 0.8 });
          Ch.say(a, U.pick(['Hold still.', 'It\'s only a test.', 'Arm, please.']), 1.8);
          for (const b of Ch.techs) b.place(b.x, b.z + (b.z > P.z ? 3 : -3));
        }
      }
      return 0.6 + U.clamp((8 - close) / 8, 0, 1) * 1.4;
    },
    calm_needle(Ch) { Ch.passing = true; Ch.voice('', '[You stand very still and make your heart as slow as anyone\'s. They look straight at you, and walk past. There\'s nothing on their screens.]', 4); return 3; },
  });
  // the faces want an answer
  DV.DialogueDB.add('fear_tribunal', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'The faces', faction: '',
        text: () => '[Every face leans into the light at once.] What did you do? Say it so everyone can hear.',
        choices: () => [
          { text: () => '"' + DV.FirstWeek.worstThing() + '"', end: true, effect: () => { const C = DV.Chapter; C.answered = true; C.voice('', '[You say it. Out loud, all of it. And the faces are only faces, and they let you go.]', 4); C.after(2.2, () => C.endFear('faced')); } },
          { text: '"Nothing. I haven\'t done anything."', end: true, effect: () => { const C = DV.Chapter; C.lied = true; C.hr = Math.min(190, C.hr + 20); C.ring = Math.max(1.5, C.ring - 1.2); C.voice('', '[They laugh. They come a step closer.]', 2.5); } },
          { text: '(Say nothing.)', end: true },
        ],
      },
    },
  });

  /* ============================== the landscape: a run of fears ============================== */
  // between the fears of the last test: the observation room, on the far side of the glass
  const INTERLUDE = [
    ['Dana Cole', 'Next. Don\'t give it time to think.'],
    ['Mark Rivera', 'Heart rate\'s down. That one\'s handled.'],
    ['Dr. Alan Pierce', 'Interesting. Note the time, please.'],
    ['Greg Lindqvist', 'Loading the next one. Here it comes.'],
    ['Dana Cole', 'Faster than the others. Mark that down too.'],
    ['Mark Rivera', 'Last one. You\'re nearly out.'],
  ];
  DV.Chapter.define('fear_land', {
    zone: () => { const m = DV.Fear.get(DV.Fear.current() || 'crows'); return m ? m.zone : 'fear_crows'; },
    start(Ch, zone, opts) {
      const run = DV.Fear.st().run, id = DV.Fear.current();
      if (!run || !id) { Ch.after(0.3, () => DV.District.enter('dauntless', {})); return; }
      // (a fear starts with nothing on the controller from the one before)
      for (const k of ['own', 'dog', 'child', 'faces', 'techs', 'coming', 'ended', 'answered', 'lied', 'passing', 'calmed', 'decided', 'boardBroken', 'saidBoard', 'saidCrack', 'shattered', 'drain', 'hidden', 'roofT', 'calmWait', 'bending', 'vig', 'circling', 'inSmoke']) delete Ch[k];
      Ch.fid = id; Ch.mod = DV.Fear.get(id); Ch.run = run;
      Ch.fast = run.kind === 'final';
      Ch.checkpoint(id + ':' + run.i);
      DV.Fear.begin(Ch, { music: Ch.fast ? 'landscape' : 'fear', hr: Ch.fast && run.i > 0 ? 104 : 96 });
      Ch.endFear = (how) => this.end(Ch, how);
      Ch.bending = false;
      Ch.mod.start(Ch, zone);
      Ch.mon.title((Ch.fast ? (run.i + 1) + ' / ' + run.queue.length + ' · ' : '') + Ch.mod.title);
      DV.UI.fade(0, 1100, true);
      if (Ch.fast && run.i > 0) { const L = INTERLUDE[(run.i - 1) % INTERLUDE.length]; Ch.after(0.4, () => Ch.voice(L[0] + ' (observation room)', L[1], 3)); }
      DV.Input.requestLock();
    },
    update(Ch, dt) {
      if (Ch.done || !Ch.mod) return;
      const M = Ch.mod;
      const fear = M.update(Ch, dt);
      if (Ch.done) return;
      if (Ch.bending || Ch.calmWait) { DV.Fear.heart(Ch, dt, 0.25, { calm: false }); return; }
      const r = DV.Fear.heart(Ch, dt, fear, Object.assign({ threatened: M.threatened ? M.threatened(Ch) : true, vignette: M.vignette ? M.vignette(Ch) : undefined }, M.heart || {}));
      Ch.mon.hint(M.hint ? M.hint(Ch) : '');
      if (r === 'calm') {
        const how = M.calmAs ? M.calmAs(Ch) : 'calm';
        const wait = M.onCalm ? M.onCalm(Ch) : 0;
        if (wait > 50) { Ch.calmWait = true; return; } // (the fear ends itself when the scene plays out)
        if (wait) { Ch.calmWait = true; Ch.after(wait, () => this.end(Ch, how)); } else this.end(Ch, how);
      } else if (r === 'blackout') this.end(Ch, 'blackout');
      else if (r === 'aware') { Ch.bending = true; DV.Stats.addXP(20, 'Saw through it'); M.bend(Ch); }
    },
    end(Ch, how) {
      if (Ch.done) return;
      Ch.done = true;
      if (Ch.mod.end) Ch.mod.end(Ch);
      const secs = Math.round(Ch.t);
      DV.Audio.play('whoosh');
      DV.UI.glitch();
      DV.Stats.practice('composure', how === 'calm' || how === 'hidden' ? 3 : 1.5);
      const res = { fear: Ch.fid, how, secs, aware: Ch.aware || how === 'aware', variant: Ch.fid === 'own' ? Ch.own : undefined };
      res.pts = DV.Fear.points(res);
      Ch.mon.hint('');
      DV.UI.narrate((DV.Fear.NAMES[Ch.fid] || '').toUpperCase() + '\n' + DV.Fear.METHODS[how].label.toUpperCase() + ' · ' + secs + 's', 1.6);
      Ch.after(1.2, () => { DV.Fear.stop(Ch); DV.Fear.next(res); });
    },
  });

  DV.FearScape = { OWN, ownId };
})();
