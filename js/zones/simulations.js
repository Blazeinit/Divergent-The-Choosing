/* ==========================================================================
   DIVERGENT — the aptitude simulations
   Three zones (THE PLATFORM, THE FLOOD, THE TRIBUNAL), a simulation
   controller (DV.Sim) and one script per scenario. Every scenario supports
   several approaches; behaviour is recorded invisibly through DV.Aptitude.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  /* ================================ ZONES ================================ */
  (function platformZone() {
    const P = [];
    const add = (type, x, z, o) => P.push(Object.assign({ type, x, z }, o || {}));
    for (const x of [-8, -2, 4, 10, 16, 22, 28, 34, 40]) add('column', x, 6.7, { size: 0.45, h: 4.4, mat: 'metal_painted' });
    add('bench', 1, 7.35, { id: 'p_b1', len: 2.4, rotDeg: 180, seatable: false });
    add('bench', 25, 7.35, { id: 'p_b2', len: 2.4, rotDeg: 180, seatable: false });
    add('table', 30, 3.3, { w: 1.2, d: 0.7, chairs: 0, top: 'metal' });
    add('poster', 6, 7.88, { rotDeg: 180, kind: 'factions', y: 1.7 });
    add('poster', 19, 7.88, { rotDeg: 180, kind: 'safety', y: 1.7 });
    add('poster', 37, 7.88, { rotDeg: 180, kind: 'choose', y: 1.7 });
    add('sign', 31, 7.88, { rotDeg: 180, text: 'PLATFORM B — LOOP LINE', y: 3.0, w: 3, h: 0.45, bg: '#2a1a14', color: '#f0c070' });
    add('sign', 43.8, 4, { rotDeg: -90, text: 'EXIT', arrow: 'right', y: 2.8, w: 1.6, h: 0.42, bg: '#0c4a2a', emit: true });
    add('trash_bin', 12, 7.4);
    add('trash_bin', 38, 7.4);
    add('rubble', -10, 4, { n: 9 });
    add('rubble', -4, 1.2, { n: 4 });
    add('stripe', 15, 0.25, { w: 58, d: 0.4, mat: 'tactile' });
    add('electrical_panel', 21.2, 7.85, { rotDeg: 180 });
    add('sign', 51.88, 4, { rotDeg: -90, text: 'STREET LEVEL', arrow: 'up', y: 2.4, w: 2.0, h: 0.4, bg: '#0c4a2a', emit: true });
    DV.Zones.define('sim_platform', {
      name: 'Platform', simulation: true, ambience: 'platform',
      bounds: { x0: -16, z0: -10, x1: 54, z1: 12 },
      buildingHeight: 5,
      fog: { color: 0x140a0a, near: 5, far: 40 },
      sky: { top: 0x050208, horizon: 0x3a1010, ground: 0x050505, skylineTint: 0x401818 },
      exterior: { sunDir: [0.2, 0.9, -0.3], sunColor: [0.12, 0.06, 0.05], ambient: [0.1, 0.07, 0.07] },
      charLight: { ambient: 0.32, hemi: 0.25, dir: 0.35, dirColor: 0xff7040 },
      rooms: [
        { id: 'tracks', name: 'Tracks', x0: -16, z0: -8, x1: 54, z1: 0, exterior: true, floor: 'rail_track', floorY: -1.3, noWalk: true, edge: 'none' },
        { id: 'platform', name: 'Platform', x0: -16, z0: 0, x1: 44, z1: 8, exterior: true, floor: 'concrete_dark', edge: 'wall', edgeH: 5, edgeMat: 'brick', connect: ['tracks', 'stairs'],
          light: { ambient: [0.1, 0.07, 0.07], color: [1, 0.55, 0.25], intensity: 1.0, range: 8, list: [[-5, 5.5, 0.7, 4.1], [7, 5.5], [19, 5.5, 0.9, 4.1], [31, 5.5, 1.1, 4.1], [40, 5.5, 0.9, 4.1]] } },
        { id: 'stairs', name: 'Exit', x0: 44, z0: 1, x1: 52, z1: 7, h: 3.4, floor: 'tile_floor', wall: 'tile_small', light: { ambient: [0.1, 0.14, 0.12], color: [0.6, 1, 0.7], intensity: 0.8, spacing: 4 } },
      ],
      doors: [],
      props: P,
      spots: {},
      triggers: [{ id: 'exit', rect: { x0: 48.5, z0: 1, x1: 52, z1: 7 } }],
      spawn: { x: 34, z: 4.6, rot: -Math.PI / 2 },
      build(ctx) {
        const B = ctx.B;
        B.room = ctx.zone.roomMap.platform.index;
        // platform lip down to the tracks
        B.box(ctx.M('concrete'), 14, -1.3, -0.15, 60, 1.3, 0.3);
        // canopy and hanging lamps
        B.box(ctx.M('metal_dark'), 14, 4.4, 5.9, 60, 0.18, 4.4);
        for (const [x, z] of [[-5, 5.5], [7, 5.5], [19, 5.5], [31, 5.5], [40, 5.5]]) {
          B.box(ctx.M('metal_dark'), x, 3.9, z, 0.04, 0.5, 0.04);
          B.box(ctx.M('plastic_orange:emit'), x, 3.75, z, 0.35, 0.15, 0.35);
        }
        // ticket booth
        B.box(ctx.M('metal_painted'), 14, 0, 6.8, 2.4, 2.5, 1.8);
        B.box(ctx.M('glass_dark'), 14, 1.0, 5.89, 1.8, 0.9, 0.02);
        ctx.zone.colliders.add(12.8, 5.9, 15.2, 7.7, { y1: 2.5, tag: 'prop' });
        // stair steps beyond the exit
        for (let k = 0; k < 6; k++) B.box(ctx.M('concrete'), 50.4 + k * 0.3, k * 0.22, 4, 0.3, 0.22, 5.8);
        // don't let the player fall onto the tracks
        ctx.zone.colliders.add(-16, -0.35, 44, -0.05, { y0: 0, y1: 1.4, playerOnly: true, tag: 'edge', camera: false });
      },
    });
  })();

  (function floodZone() {
    const P = [];
    const add = (type, x, z, o) => P.push(Object.assign({ type, x, z }, o || {}));
    add('crate', 5, 8.6, { size: 0.8 });
    add('crate', 12.2, 8.4, { size: 0.8, stack: true });
    add('crate', 10.2, 8.9, { size: 0.7 });
    add('crate', 1.4, 1.4, { size: 0.9 });
    add('crate', 1.2, 7.3, { size: 0.8 });
    add('crate', 1.3, 9.2, { size: 0.7 });
    add('shelf', 5.4, 9.62, { len: 3, d: 0.5 });
    add('desk', 6.5, 1.0, { id: 'flood_desk', computer: false, chair: false });
    add('lockers', 13.55, 8.6, { len: 1.2, rotDeg: -90 });
    add('barrel', 9.6, 1.0, { mat: 'rust' });
    add('barrel', 10.4, 1.3, {});
    add('pipes', 7, 9.7, { len: 13.5, y: 3.0, n: 2, rotDeg: 0 });
    add('exit_sign', 13.88, 5, { rotDeg: -90, y: 2.7 });
    add('sign', 7, 0.13, { text: 'SUPPLY LINES', y: 3.05, w: 2.0, h: 0.3, bg: '#3a3020' });
    add('electrical_panel', 11.5, 0.15, {});
    DV.Zones.define('sim_flood', {
      name: 'Basement', simulation: true, ambience: 'flood',
      bounds: { x0: -2, z0: -2, x1: 20, z1: 12 },
      buildingHeight: 4,
      fog: { color: 0x0b1214, near: 6, far: 26 },
      sky: { visible: false },
      charLight: { ambient: 0.32, hemi: 0.3, dir: 0.25, dirColor: 0xffc080 },
      rooms: [
        { id: 'basement', name: 'Basement', x0: 0, z0: 0, x1: 14, z1: 10, h: 3.4, floor: 'concrete_dark', wall: 'concrete', ceiling: 'ceiling_concrete',
          light: { ambient: [0.14, 0.15, 0.15], color: [1, 0.85, 0.6], intensity: 0.95, spacing: 4.6, range: 6.5, fixture: 'bulb', flicker: [2] } },
        { id: 'stairwell', name: 'Stairwell', x0: 14, z0: 3.5, x1: 18, z1: 6.5, h: 3.4, floor: 'concrete', wall: 'concrete_dark', ceiling: 'ceiling_concrete', light: { ambient: [0.2, 0.22, 0.2], color: [0.7, 1, 0.8], intensity: 0.8, spacing: 3, fixture: 'tube' } },
      ],
      doors: [{ id: 'flood_exit', x: 14, z: 5, dir: 'z', w: 1.4, type: 'slide', lock: 'sim_exit', label: 'EXIT', lockMsg: 'Locked. A keypad glows beside the door.' }],
      props: P,
      spots: {},
      triggers: [{ id: 'exit', rect: { x0: 15, z0: 3.5, x1: 18, z1: 6.5 } }],
      spawn: { x: 7, z: 5, rot: -Math.PI / 2 },
      build(ctx) {
        const B = ctx.B;
        B.room = 0;
        // five countable supply pipes on the north wall
        for (const x of [2, 4.5, 7, 9.5, 12]) {
          B.cyl(ctx.M('metal_painted'), x, 0, 0.28, 0.08, 0.08, 3.4, 6);
          B.box(ctx.M('metal_dark'), x, 1.2, 0.2, 0.22, 0.08, 0.2);
        }
        // three red crates
        const red = DV.Tex.custom('crate_red', 32, 32, (c, w, h) => {
          c.fillStyle = '#8a1e18'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#5a1410'; c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2); c.fillRect(0, 0, 2, h); c.fillRect(w - 2, 0, 2, h);
          c.fillStyle = '#c84030'; c.fillRect(4, 13, 24, 6);
        }, {});
        const rm = DV.Mat.fromTexture('crate_red', red, {});
        for (const [x, z] of [[3, 8.4], [8.6, 8.6], [11, 2.6]]) {
          B.box(rm, x, 0, z, 0.8, 0.8, 0.8, { uv: 'unit' });
          ctx.zone.colliders.add(x - 0.4, z - 0.4, x + 0.4, z + 0.4, { y1: 0.8, tag: 'prop', camera: false });
        }
        // the fallen shelf pinning the old woman
        B.pushEuler(2.8, 0.25, 4.6, 0, 0.2, 1.2);
        B.box(ctx.M('metal_painted'), 0, -0.25, 0, 0.5, 2.2, 1.6);
        B.pop();
        ctx.zone.colliders.add(1.8, 3.9, 3.9, 5.4, { y1: 0.9, tag: 'prop', camera: false });
        // burst pipe & valve on the west wall
        B.pipeZ(ctx.M('metal_painted'), 0.25, 1.9, 8.2, 3.6, 0.07, 6);
        B.cyl(ctx.M('rust'), 0.35, 1.75, 8.2, 0.16, 0.16, 0.06, 8);
        // keypad by the exit
        B.box(ctx.M('metal_dark'), 13.88, 1.2, 6.3, 0.06, 0.3, 0.22);
        B.box(ctx.M('crt_green:emit'), 13.85, 1.42, 6.3, 0.02, 0.05, 0.15);
      },
    });
  })();

  (function tribunalZone() {
    const P = [];
    const add = (type, x, z, o) => P.push(Object.assign({ type, x, z }, o || {}));
    add('wall_block', 10, 2.2, { w: 11, h: 2.8, d: 2.2, mat: 'wood_panel' });
    add('emblem', 10, 3.32, { faction: 'candor', y: 1.5, size: 1.6, color: '#d8d2c0' });
    add('table', 10, 9.6, { w: 1.6, d: 0.7, chairs: 0, top: 'wood' });
    add('mirror', 0.12, 10, { rotDeg: 90, y: 2.1, w: 2.6, h: 3.6 });
    for (const x of [2.2, 17.8]) for (const z of [5, 10, 15]) add('column', x, z, { size: 0.8, h: 9, mat: 'concrete_panel' });
    DV.Zones.define('sim_tribunal', {
      name: 'Tribunal', simulation: true, ambience: 'tribunal',
      bounds: { x0: -2, z0: -2, x1: 22, z1: 22 },
      buildingHeight: 9,
      fog: { color: 0x000000, near: 7, far: 30 },
      sky: { visible: false },
      charLight: { ambient: 0.4, hemi: 0.2, dir: 0.7, dirColor: 0xffffff },
      rooms: [
        { id: 'chamber', name: 'Tribunal', x0: 0, z0: 0, x1: 20, z1: 20, h: 9, floor: 'marble_check', wall: 'concrete_dark', ceiling: 'ceiling_concrete',
          light: { ambient: [0.05, 0.05, 0.06], color: [1, 1, 1], intensity: 1.7, range: 8.5, fixture: 'none', list: [[10, 11, 1.7, 8.5], [10, 3.5, 0.6, 7]] } },
      ],
      doors: [],
      props: P,
      spots: {},
      triggers: [{ id: 'exit', rect: { x0: 8.8, z0: 18.8, x1: 11.2, z1: 20 } }],
      spawn: { x: 10, z: 15, rot: Math.PI },
      build(ctx) {
        const B = ctx.B;
        B.room = 0;
        // the chair (no regular seat interaction: the script handles it)
        B.push(10, 0, 11, Math.PI);
        const w = ctx.M('wood');
        for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]]) B.box(w, x, 0, z, 0.04, 0.44, 0.04);
        B.box(w, 0, 0.42, 0, 0.46, 0.04, 0.44);
        B.box(w, 0, 0.46, -0.2, 0.44, 0.55, 0.04);
        B.pop();
        ctx.zone.colliders.add(9.75, 10.75, 10.25, 11.25, { y1: 0.9, tag: 'prop', camera: false });
        // pedestal with the button
        B.box(ctx.M('metal_dark'), 13.5, 0, 11, 0.45, 1.0, 0.45);
        B.box(ctx.M('hazard'), 13.5, 1.0, 11, 0.5, 0.04, 0.5);
        ctx.zone.colliders.add(13.25, 10.75, 13.75, 11.25, { y1: 1.1, tag: 'prop', camera: false });
        // a door-shaped seam in the south wall
        B.push(10, 0, 19.89, Math.PI);
        B.panel(ctx.M('glass_dark'), 0, 1.25, 0, 1.3, 2.5);
        B.pop();
        // the confession on the table
        B.box(ctx.M('paper'), 10, 0.74, 9.55, 0.3, 0.004, 0.4);
        B.box(ctx.M('metal_dark'), 10.3, 0.745, 9.6, 0.15, 0.015, 0.015);
      },
    });
  })();

  /* ================================ ACTORS ================================ */
  class Actor {
    constructor(app, x, z, rot) {
      this.model = DV.Character.create(app);
      DV.Game.scene.add(this.model.root);
      this.x = x; this.z = z; this.rot = rot || 0; this.y = 0;
      this.target = null;
      this.spd = 1.2;
      this.action = 'idle';
      this.speed = 0;
      this.look = 0;
      this.seatY = 0.45;
      this.bark = null;
      this.sync();
    }
    moveTo(x, z, spd) { this.target = [x, z]; this.spd = spd || 1.2; }
    stop() { this.target = null; }
    face(x, z) { this.rot = U.yawTo(this.x, this.z, x, z); }
    sync() {
      this.model.root.position.set(this.x, this.y, this.z);
      this.model.root.rotation.y = this.rot;
    }
    update(dt, zone) {
      this.speed = 0;
      if (this.target) {
        const dx = this.target[0] - this.x, dz = this.target[1] - this.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.08) this.target = null;
        else {
          const s = Math.min(d, this.spd * dt);
          this.x += (dx / d) * s; this.z += (dz / d) * s;
          this.speed = s / dt;
          this.rot = U.dampAngle(this.rot, Math.atan2(dx, dz), 8, dt);
        }
      }
      this.sync();
      this.model.animate(dt, { speed: this.speed, action: this.target ? 'idle' : this.action, seatY: this.seatY, lookYaw: this.look, talking: !!(this.bark && this.bark.until > performance.now()) });
      if (zone) {
        const L = zone.lightAt(this.x, this.z);
        this.model.setTint(U.clamp(L[0], 0.25, 1.3), U.clamp(L[1], 0.25, 1.3), U.clamp(L[2], 0.25, 1.3));
      }
    }
    dispose() { this.model.dispose(); }
  }

  // procedural angular dog
  class Dog {
    constructor(x, z) {
      const g = new THREE.Group();
      const fur = new THREE.MeshLambertMaterial({ color: 0x3a3028, flatShading: true });
      const dark = new THREE.MeshLambertMaterial({ color: 0x1c1814, flatShading: true });
      DV.Mat.applyWobble(fur);
      const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || fur);
      const body = box(0.42, 0.42, 1.0);
      body.position.set(0, 0.72, 0);
      g.add(body);
      const chest = box(0.46, 0.5, 0.4);
      chest.position.set(0, 0.76, 0.32);
      g.add(chest);
      const neck = new THREE.Group();
      neck.position.set(0, 0.9, 0.52);
      g.add(neck);
      const head = box(0.3, 0.3, 0.34);
      head.position.set(0, 0.1, 0.16);
      neck.add(head);
      const snout = box(0.18, 0.16, 0.24, dark);
      snout.position.set(0, 0.02, 0.4);
      neck.add(snout);
      for (const s of [-1, 1]) {
        const ear = box(0.07, 0.16, 0.06, dark);
        ear.position.set(s * 0.1, 0.3, 0.08);
        ear.rotation.z = s * 0.3;
        neck.add(ear);
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.02), new THREE.MeshBasicMaterial({ color: 0xffb030 }));
        eye.position.set(s * 0.08, 0.15, 0.335);
        neck.add(eye);
      }
      this.legs = [];
      for (const [lx, lz] of [[-0.15, 0.36], [0.15, 0.36], [-0.15, -0.38], [0.15, -0.38]]) {
        const hip = new THREE.Group();
        hip.position.set(lx, 0.62, lz);
        const up = box(0.12, 0.34, 0.14);
        up.position.y = -0.15;
        hip.add(up);
        const knee = new THREE.Group();
        knee.position.y = -0.3;
        const lo = box(0.09, 0.32, 0.1, dark);
        lo.position.y = -0.15;
        knee.add(lo);
        hip.add(knee);
        g.add(hip);
        this.legs.push({ hip, knee });
      }
      const tail = new THREE.Group();
      tail.position.set(0, 0.86, -0.5);
      const tm = box(0.06, 0.06, 0.4);
      tm.position.z = -0.2;
      tail.add(tm);
      g.add(tail);
      this.tail = tail;
      // snare wire on the back leg
      const wire = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 4, 8), new THREE.MeshBasicMaterial({ color: 0xbfbfbf }));
      wire.rotation.x = Math.PI / 2;
      wire.position.set(0.15, 0.22, -0.38);
      g.add(wire);
      this.wire = wire;
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.02;
      g.add(sh);
      g.scale.setScalar(1.25);
      this.root = g;
      this.neck = neck;
      this.mats = [fur, dark];
      this.x = x; this.z = z; this.rot = Math.PI / 2;
      this.target = null; this.spd = 0;
      this.phase = 0;
      this.mode = 'stalk';
      this.t = 0;
      DV.Game.scene.add(g);
      this.sync();
    }
    sync() { this.root.position.set(this.x, 0, this.z); this.root.rotation.y = this.rot; }
    update(dt, zone) {
      this.t += dt;
      let speed = 0;
      if (this.target) {
        const dx = this.target[0] - this.x, dz = this.target[1] - this.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.1) this.target = null;
        else {
          const s = Math.min(d, this.spd * dt);
          this.x += (dx / d) * s; this.z += (dz / d) * s;
          speed = s / dt;
          this.rot = U.dampAngle(this.rot, Math.atan2(dx, dz), 6, dt);
        }
      }
      this.phase += speed * dt * 5.5;
      const amp = Math.min(0.7, speed * 0.35);
      this.legs.forEach((l, i) => {
        const ph = this.phase + (i === 0 || i === 3 ? 0 : Math.PI);
        l.hip.rotation.x = Math.sin(ph) * amp;
        l.knee.rotation.x = Math.max(0, Math.sin(ph + 1)) * amp;
      });
      const calm = this.mode === 'calm' || this.mode === 'freed';
      this.tail.rotation.y = calm ? Math.sin(this.t * 10) * 0.6 : 0;
      this.tail.rotation.x = calm ? -0.2 : 0.5;
      const growl = this.mode === 'stalk' || this.mode === 'child' || this.mode === 'lunge';
      this.neck.rotation.x = growl ? 0.25 + Math.sin(this.t * 30) * 0.02 : calm ? 0.45 : 0;
      if (this.mode === 'calm') { this.root.position.y = -0.2; this.legs.forEach((l) => { l.hip.rotation.x = -1.2; l.knee.rotation.x = 1.5; }); }
      this.sync();
      if (this.mode === 'calm') this.root.position.y = -0.22;
      if (zone) {
        const L = zone.lightAt(this.x, this.z);
        this.mats[0].color.setRGB(0.23 * U.clamp(L[0] * 2, 0.4, 2), 0.19 * U.clamp(L[1] * 2, 0.4, 2), 0.16 * U.clamp(L[2] * 2, 0.4, 2));
      }
    }
    dispose() { if (this.root.parent) this.root.parent.remove(this.root); }
  }

  /* ================================ CONTROLLER ================================ */
  const Sim = {
    active: false,
    index: 0,
    script: null,
    flags: {},
    held: null,
    objects: [],
    actors: [],
    t: 0,
    ended: false,

    start() {
      this.active = true;
      this.index = 0;
      DV.UI.simMode(true);
      this.load(0);
    },
    load(i) {
      this.index = i;
      DV.Aptitude.simIndex = i;
      const id = DV.Aptitude.sims[i];
      this.clearScene();
      DV.World.dispose(id);
      const zone = DV.World.activate(id);
      DV.NPCs.attach(id);
      const sp = zone.def.spawn;
      const p = DV.Player;
      if (p.seat) { p.seat.occupant = null; p.seat = null; }
      p.place(sp.x, sp.z, sp.rot);
      p.moveScale = 1;
      p.surfaceOverride = null;
      p.stamina = 100;
      DV.Game.rig.yaw = sp.rot;
      DV.Game.rig.pitch = 0.15;
      DV.Game.rig.follow(true);
      DV.Game.triggerState = {};
      DV.Game.lastRoom = null;
      DV.Game.updateAmbience();
      this.flags = {};
      this.held = null;
      this.t = 0;
      this.ended = false;
      this.fearTarget = 0;
      DV.Game.fear = 0;
      this.script = SCRIPTS[id];
      this.script.start(this, zone);
      DV.Game.state = 'playing';
      DV.Input.clearMovement();
      DV.UI.fade(0, 1800, true);
      DV.UI.narrate(this.script.title, 3.2);
    },
    update(dt, transitioning) {
      if (!this.active || !this.script) return;
      this.t += dt;
      const zone = DV.World.current;
      for (const a of this.actors) a.update(dt, zone);
      if (!transitioning && !this.ended) this.script.update(this, dt, zone);
      for (const o of this.objects) if (o.update) o.update(dt);
      // fear: target set by scripts, softened by Resolve & Composure
      const comp = U.clamp((DV.Stats.attr('resolve') - 3) * 0.07 + (DV.Stats.skill('composure') - 20) / 220, 0, 0.55);
      const f = U.clamp(this.fearTarget * (1 - comp), 0, 1);
      DV.Game.fear = U.damp(DV.Game.fear, f, 3, dt);
      DV.UI.setFear(DV.Game.fear);
      this.beatT = (this.beatT || 0) - dt;
      if (DV.Game.fear > 0.45 && this.beatT <= 0) { DV.Audio.play('heartbeat', { volume: DV.Game.fear }); this.beatT = 1.15 - DV.Game.fear * 0.55; }
      if (DV.Game.fear > 0.6) DV.Game.rig.shake = Math.max(DV.Game.rig.shake, (DV.Game.fear - 0.6) * 0.3);
      // overhead barks for sim actors (reuse subtitle)
    },
    // the scenario is over: dissolve to the next one
    end(reason) {
      if (this.ended) return;
      this.ended = true;
      DV.log('sim end', this.index, reason);
      const next = () => {
        DV.Game.state = 'transition';
        DV.Audio.play('whoosh');
        DV.UI.glitch();
        DV.UI.fade(1, 1600, true).then(() => {
          if (this.index + 1 < DV.Aptitude.sims.length) this.load(this.index + 1);
          else DV.Game.returnFromTest();
        });
      };
      setTimeout(next, 2200);
    },
    cleanup() {
      this.clearScene();
      this.active = false;
      this.script = null;
      DV.Interaction.extra = [];
      DV.UI.simMode(false);
      DV.UI.setFear(0);
      DV.Game.fear = 0;
      for (const id of DV.Aptitude.sims) DV.World.dispose(id);
    },
    clearScene() {
      for (const a of this.actors) a.dispose();
      for (const o of this.objects) { if (o.dispose) o.dispose(); else if (o.root && o.root.parent) o.root.parent.remove(o.root); else if (o.parent) o.parent.remove(o); }
      this.actors = [];
      this.objects = [];
      DV.Interaction.extra = [];
      this.setHeld(null);
    },
    // helpers for scripts & dialogue
    call(name, arg) {
      const s = this.script;
      if (!s || !s[name]) { console.warn('[Sim] no handler', name); return undefined; }
      return s[name](this, arg);
    },
    flag(n) { return !!this.flags[n]; },
    setFlag(n, v) { this.flags[n] = v === undefined ? true : v; },
    record(w, label) { DV.Aptitude.record(w, label); },
    scene(tree, opts) {
      if (DV.Dialogue.isActive()) return;
      DV.Dialogue.startScene(tree, opts || {});
    },
    voice(text, secs) {
      DV.UI.subtitle('', text, secs || 4);
      DV.Audio.play('tone' in DV.Audio ? 'beep' : 'beep', { volume: 0.4 });
    },
    say(actor, who, text, secs) {
      actor.bark = { text, until: performance.now() + (secs || 3.5) * 1000 };
      DV.UI.subtitle(who, text, secs || 3.5);
    },
    actor(app, x, z, rot) {
      const a = new Actor(app, x, z, rot);
      this.actors.push(a);
      return a;
    },
    addObject(o) { this.objects.push(o); if (o.root && !o.root.parent) DV.Game.scene.add(o.root); else if (o.isObject3D && !o.parent) DV.Game.scene.add(o); return o; },
    interact(it) { DV.Interaction.extra.push(it); return it; },
    setHeld(kind) {
      this.held = kind;
      const p = DV.Player;
      if (this.heldMesh && this.heldMesh.parent) this.heldMesh.parent.remove(this.heldMesh);
      this.heldMesh = null;
      if (!kind || !p.model) return;
      const hand = p.model.bones[11];
      let m;
      if (kind === 'rod') m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), new THREE.MeshLambertMaterial({ color: 0x6a6e70 }));
      else if (kind === 'flare') m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.04), new THREE.MeshBasicMaterial({ color: 0xd02a20 }));
      else if (kind === 'crowbar') m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.7, 0.03), new THREE.MeshLambertMaterial({ color: 0xa02020 }));
      else if (kind === 'mask') m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.08), new THREE.MeshLambertMaterial({ color: 0xd0c040 }));
      if (!m) return;
      m.position.set(0, kind === 'rod' ? -0.2 : -0.12, 0.03);
      hand.add(m);
      this.heldMesh = m;
    },
    bodies() {
      const out = [];
      for (const a of this.actors) out.push({ x: a.x, z: a.z, r: 0.25 });
      for (const o of this.objects) if (o instanceof Dog) out.push({ x: o.x, z: o.z, r: 0.45 });
      return out;
    },
    agents() {
      return this.actors.map((a) => ({ x: a.x, z: a.z, access: () => this.flag('doorOpen') }));
    },
    canPass(lock) {
      if (lock === 'sim_exit') return this.flag('doorOpen');
      return false;
    },
    onTrigger(id, inside) {
      if (this.script && this.script.onTrigger) this.script.onTrigger(this, id, inside);
    },
    onDialogueEnd(e) {
      if (this.script && this.script.onDialogueEnd) this.script.onDialogueEnd(this, e);
    },
  };
  Sim.Actor = Actor;
  Sim.Dog = Dog;

  /* ================================ SCRIPTS ================================ */
  const childApp = () => ({ sex: 'm', child: true, seed: 5, build: 'slim', skin: '#e9bf9b', face: 2, hair: 'messy', hairColor: '#8f7449', eyes: '#2d4d6b',
    outfit: { top: 'jacket', topColor: '#5a5e62', topColor2: '#c8c0b0', bottom: 'pants', bottomColor: '#3a3a3e', shoes: 'shoes', shoeColor: '#2a2a2a', acc: ['scarf'] } });

  const SCRIPTS = {};

  /* ------------------------------ SIM 1: THE PLATFORM ------------------------------ */
  SCRIPTS.sim_platform = {
    title: 'I',
    start(S, zone) {
      S.phase = 'table';
      S.dogAt = 0;
      // items on the table
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.035, 0.035), new THREE.MeshLambertMaterial({ color: 0x70757a }));
      rod.position.set(29.8, 0.76, 3.2);
      rod.rotation.y = 0.2;
      const flare = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0xd02a20 }));
      flare.position.set(30.35, 0.76, 3.45);
      S.addObject(rod); S.addObject(flare);
      S.tableItems = [rod, flare];
      S.interact({ id: 'sim_table', kind: 'action', x: 30, z: 3.3, radius: 1.9, label: 'Approach', name: 'The Table', cond: () => S.phase === 'table', onUse: () => S.scene('sim1_table') });
      // rain
      const N = 500;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 6);
      for (let i = 0; i < N; i++) {
        const x = U.rand(-14, 14), y = U.rand(-1, 9), z = U.rand(-10, 3.6);
        pos.set([x, y, z, x + 0.03, y + 0.35, z], i * 6);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9aa0b0, transparent: true, opacity: 0.45 }));
      rain.frustumCulled = false;
      rain.update = (dt) => {
        const a = geo.attributes.position.array;
        for (let i = 0; i < N; i++) {
          a[i * 6 + 1] -= dt * 13; a[i * 6 + 4] -= dt * 13;
          if (a[i * 6 + 1] < -1.3) { a[i * 6 + 1] += 10; a[i * 6 + 4] += 10; }
        }
        geo.attributes.position.needsUpdate = true;
        rain.position.set(DV.Player.x, 0, 0);
      };
      S.addObject(rain);
      // the broken clock on the back wall
      const clock = new THREE.Group();
      clock.position.set(34, 3.0, 7.87);
      clock.rotation.y = Math.PI;
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.36, 12), new THREE.MeshBasicMaterial({ color: 0xd8d0b8, fog: true }));
      clock.add(face);
      const hm = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.01), hm); hand1.geometry.translate(0, 0.11, 0.01);
      const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.01), hm); hand2.geometry.translate(0, 0.15, 0.01);
      clock.add(hand1, hand2);
      clock.update = (dt) => { hand2.rotation.z += dt * 2.2; hand1.rotation.z += dt * 0.25; };
      S.addObject(clock);
      S.interact({ id: 'sim_clock', kind: 'action', x: 34, z: 7.2, radius: 1.8, label: 'Examine', name: 'Station Clock', onUse: () => S.scene('sim1_clock') });
      S.interact({ id: 'sim_lever', kind: 'action', x: 21.2, z: 7.3, radius: 1.6, label: 'Examine', name: 'Emergency Lever', cond: () => !S.flag('shutter'), onUse: () => S.scene('sim1_lever') });
      // the shutter (lowered by the lever)
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.2, 8), new THREE.MeshLambertMaterial({ map: DV.Tex.get('grate'), color: 0x9a9a9a }));
      sh.position.set(20, 4.4 + 2.1, 4);
      S.addObject(sh);
      S.shutterMesh = sh;
      S.shutterCol = zone.colliders.add(19.9, 0, 20.1, 8, { y1: 4, enabled: false, tag: 'shutter' });
      setTimeout(() => S.voice('CHOOSE.', 4), 1200);
    },
    take(S, kind) {
      if (S.phase !== 'table') return;
      for (const m of S.tableItems) m.visible = false;
      if (kind === 'rod') S.setHeld('rod');
      else if (kind === 'flare') S.setHeld('flare');
      S.phase = 'dog';
      S.dogAt = S.t + 3;
    },
    spawnDog(S) {
      const dog = new Dog(-12, 3.5);
      S.addObject(dog);
      S.dog = dog;
      dog.mode = 'stalk';
      DV.Audio.play('growl');
      S.interact({ id: 'sim_dog', kind: 'action', x: () => dog.x, z: () => dog.z, radius: 4.5, label: 'Face', name: 'The Dog',
        cond: () => ['stalk', 'child', 'lunge', 'calm'].indexOf(dog.mode) >= 0 && !S.ended, onUse: () => S.scene('sim1_dog') });
      S.childAt = S.t + 9;
    },
    spawnChild(S) {
      const c = S.actor(childApp(), 14.2, 5.7, -Math.PI / 2);
      S.child = c;
      c.state = 'walk';
      S.say(c, 'Little Boy', 'Puppy? Here, puppy!', 3);
      S.interact({ id: 'sim_child', kind: 'action', x: () => c.x, z: () => c.z, radius: 2.2, label: 'Talk to', name: 'Little Boy',
        cond: () => ['walk', 'frozen', 'still', 'behind'].indexOf(c.state) >= 0 && !S.ended, onUse: () => S.scene('sim1_child', { speaker: 'Little Boy' }) });
    },
    update(S, dt, zone) {
      const p = DV.Player;
      if (S.phase === 'table') {
        S.fearTarget = 0.1;
        // walking away from the table counts as refusing
        if (S.t > 4 && (U.dist(p.x, p.z, 30, 3.3) > 9 || S.t > 25) && !DV.Dialogue.isActive()) {
          S.record({ resistance: 0.5 }, 'walked away from the table');
          this.take(S, null);
        }
        return;
      }
      if (!S.dog && S.t >= S.dogAt) this.spawnDog(S);
      const dog = S.dog;
      if (!dog) return;
      if (!S.child && S.t >= S.childAt) this.spawnChild(S);
      const child = S.child;
      const dp = U.dist(dog.x, dog.z, p.x, p.z);
      // observation: stand still near the dog for a while
      if (!S.flag('observed') && ['stalk', 'child'].indexOf(dog.mode) >= 0 && dp < 10 && p.speed < 0.2) {
        S.stillT = (S.stillT || 0) + dt;
        if (S.stillT > (DV.Stats.attr('perception') >= 5 ? 2.5 : 5)) this.observeNow(S);
      } else if (p.speed > 0.3) S.stillT = 0;
      // dog behaviour
      if (dog.mode === 'stalk') {
        const tx = p.x - Math.sign(p.x - dog.x || 1) * 5.5;
        dog.target = [U.clamp(tx, -12, 19.5 + (S.flag('shutter') ? 0 : 24)), U.clamp(p.z + Math.sin(S.t * 0.7) * 1.2, 1, 7)];
        dog.spd = 0.9;
        if (S.flag('shutter') && dog.x < 20) dog.target[0] = Math.min(dog.target[0], 19.3);
        if (child && child.state !== 'safe' && child.state !== 'gone' && child.x < 19.5 + (S.flag('shutter') ? 0 : 30) && S.t > S.childAt + 2) dog.mode = 'child';
        if (Math.random() < dt * 0.3) DV.Audio.play('growl', { volume: 0.6 });
      } else if (dog.mode === 'child') {
        const tgt = child && child.state === 'behind' ? p : child;
        if (!tgt) dog.mode = 'stalk';
        else {
          dog.target = [tgt.x - Math.sign(tgt.x - dog.x || 1) * 0.9, tgt.z];
          dog.spd = 0.55;
          if (S.flag('shutter') && (dog.x < 20) !== (tgt.x < 20)) { dog.mode = 'stalk'; }
          const d = U.dist(dog.x, dog.z, tgt.x, tgt.z);
          if (d < 1.4) {
            // the moment of truth: is the player in between?
            if (tgt === p || this.shielding(S)) {
              if (!S.flag('shielded')) { S.setFlag('shielded'); S.record({ selflessness: 2, bravery: 1.5 }, 'stood between the child and the dog'); }
            }
            if (!S.lungeAt) S.lungeAt = S.t + 6;
          }
        }
        if (Math.random() < dt * 0.4) DV.Audio.play('growl', { volume: 0.7 });
      } else if (dog.mode === 'flee') {
        dog.target = [-15, 3]; dog.spd = 6;
        if (dog.x < -13) { dog.mode = 'gone'; dog.root.visible = false; }
      } else if (dog.mode === 'chase_flare') {
        dog.target = [S.flareAt[0], S.flareAt[1]]; dog.spd = 4;
      }
      // the child walks toward the "puppy"
      if (child) {
        if (child.state === 'walk') {
          const d = U.dist(child.x, child.z, dog.x, dog.z);
          if (d > 3.2) child.moveTo(dog.x + 2.8, dog.z, 0.5);
          else { child.stop(); child.state = 'frozen'; child.action = 'cower'; S.say(child, 'Little Boy', '...Puppy?', 3); }
        } else if (child.state === 'follow' || child.state === 'behind') {
          const back = child.state === 'behind' ? 0.9 : 1.2;
          const tx = p.x - Math.sin(p.rot) * back, tz = p.z - Math.cos(p.rot) * back;
          if (U.dist(child.x, child.z, tx, tz) > 0.4) child.moveTo(tx, tz, Math.max(1.4, p.speed * 1.05));
          child.action = 'idle';
        } else if (child.state === 'run') {
          child.moveTo(50, 4, 2.6);
          if (child.x > 48) { child.state = 'safe'; child.model.root.visible = false; S.setFlag('childSafe'); }
        }
      }
      // lunge timeout: nobody acted
      const totalT = S.t - S.dogAt;
      if ((S.lungeAt && S.t > S.lungeAt) || totalT > 80) {
        if (['stalk', 'child'].indexOf(dog.mode) >= 0 && !DV.Dialogue.isActive()) {
          dog.mode = 'lunge';
          DV.Audio.play('bark');
          DV.Game.rig.shake = 0.8;
          S.voice('[The dog lunges — teeth, weight, heat — and the world tears like paper.]', 4);
          S.record({}, 'froze while the dog closed in');
          if (child && child.state !== 'safe' && !S.flag('shielded')) S.record({ selflessness: -0.5 }, 'did not reach the child in time');
          SCRIPTS.sim_platform.finish(S, 'lunge');
        }
      }
      // fear
      S.fearTarget = dog.mode === 'calm' || dog.mode === 'freed' || dog.mode === 'gone' || dog.mode === 'frozen' ? 0.1 : U.clamp(1.1 - dp / 10, 0.2, 1);
    },
    shielding(S) {
      const p = DV.Player, c = S.child, d = S.dog;
      if (!c || !d) return false;
      const dc = U.dist(p.x, p.z, c.x, c.z);
      if (dc > 1.8) return false;
      // player roughly on the segment between child and dog
      const vx = d.x - c.x, vz = d.z - c.z, L = Math.hypot(vx, vz) || 1;
      const t = ((p.x - c.x) * vx + (p.z - c.z) * vz) / (L * L);
      const px = c.x + vx * t, pz = c.z + vz * t;
      return t > 0.1 && t < 1.1 && U.dist(px, pz, p.x, p.z) < 0.9;
    },
    observeNow(S) {
      if (S.flag('observed')) return;
      S.setFlag('observed');
      S.record({ observation: 1.5, logic: 0.5 }, 'noticed the dog was caught in a snare');
      S.voice('[You notice: a loop of snare wire is biting into the dog\'s hind leg. It isn\'t hunting. It\'s in pain — and terrified.]', 6);
    },
    dogState(S) {
      return S.dog ? S.dog.mode : 'none';
    },
    dogNear(S) {
      return S.dog && S.child && U.dist(S.dog.x, S.dog.z, S.child.x, S.child.z) < 5;
    },
    dogResolve(S, how) {
      const dog = S.dog;
      if (!dog) return;
      const p = DV.Player;
      switch (how) {
        case 'fought':
          DV.Audio.play('hit'); DV.Audio.play('yelp');
          DV.Game.rig.shake = 0.6;
          dog.mode = 'flee';
          S.voice('[The rod connects. The dog yelps and bolts into the dark.]', 4);
          break;
        case 'flare_wave':
          DV.Audio.play('flare');
          dog.mode = 'flee';
          S.voice('[The flare hisses alive — red light, red smoke. The dog backs away, then turns and runs.]', 4);
          break;
        case 'flare_throw': {
          DV.Audio.play('flare');
          const fx = p.x - 9, fz = 3;
          S.flareAt = [fx, fz];
          const fl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xff3a20 }));
          fl.position.set(fx, 0.05, fz);
          S.addObject(fl);
          S.setHeld(null);
          dog.mode = 'chase_flare';
          S.voice('[The flare arcs down the platform, spitting red light. The dog wheels after it, snapping at the smoke.]', 4);
          break;
        }
        case 'calmed':
          dog.mode = 'calm'; dog.target = null;
          S.voice('[The dog sighs and lies down.]', 3);
          break;
        case 'freed':
          dog.mode = 'freed'; dog.target = null;
          dog.wire.visible = false;
          S.voice('[The wire comes free. The dog licks your wrist once — and limps away into the rain, unafraid.]', 5);
          setTimeout(() => { if (dog.mode === 'freed') { dog.mode = 'flee'; } }, 2500);
          break;
        case 'shout':
          DV.Audio.play('bark');
          dog.mode = 'flee';
          S.voice('[You roar. The dog flinches — and retreats into the dark.]', 4);
          break;
        case 'aware':
          dog.mode = 'frozen'; dog.target = null;
          DV.UI.glitch();
          S.voice('[The dog stops mid-step. Its outline fizzes, like static on a screen — and then it simply isn\'t there.]', 5);
          setTimeout(() => { dog.root.visible = false; }, 900);
          break;
      }
      this.finish(S, how);
    },
    scare(S) {
      DV.Audio.play('bark');
      DV.Game.rig.shake = 0.5;
      S.fearTarget = 1;
    },
    child(S, mode) {
      const c = S.child;
      if (!c) return;
      c.state = mode;
      c.action = mode === 'still' ? 'cower' : 'idle';
      if (mode === 'run') S.say(c, 'Little Boy', 'Okay! Okay!', 2.5);
      if (mode === 'behind') S.say(c, 'Little Boy', '*clings to your coat*', 2.5);
      if (mode === 'follow') S.say(c, 'Little Boy', 'Okay...', 2);
    },
    shutter(S) {
      S.setFlag('shutter');
      DV.Audio.play('shutter');
      const sh = S.shutterMesh;
      sh.update = (dt) => { sh.position.y = Math.max(2.1, sh.position.y - dt * 4); };
      S.shutterCol.enabled = true;
      const p = DV.Player;
      const childWest = S.child && S.child.state !== 'safe' && S.child.x < 20;
      const dogWest = S.dog && S.dog.x < 20;
      if (p.x > 20 && dogWest) {
        S.voice('[The steel grille slams down across the platform. On the far side, the dog throws itself against the bars.]', 5);
        if (childWest && S.child.state !== 'follow' && S.child.state !== 'behind') {
          S.record({ selflessness: -1.5 }, 'shut the child on the dog\'s side of the shutter');
          S.say(S.child, 'Little Boy', 'Wait — WAIT!', 3);
        }
        this.finish(S, 'shutter');
      } else {
        S.voice('[The grille crashes down — but the danger is already on your side of it.]', 4);
      }
    },
    finish(S, how) {
      if (S.finishing) return;
      S.finishing = true;
      setTimeout(() => {
        const c = S.child;
        if (c && (c.state === 'follow' || c.state === 'behind')) S.record({ selflessness: 0.5 }, 'kept the child safe');
        S.end(how);
      }, 3500);
    },
    onTrigger(S, id, inside) {
      if (id !== 'exit' || !inside || S.ended) return;
      const c = S.child;
      if (c && (c.state === 'follow' || c.state === 'behind')) S.record({ selflessness: 1.5, peacefulness: 1 }, 'led the child to safety');
      else if (c && c.state !== 'safe') S.record({ selflessness: -1.5, logic: 0.5 }, 'escaped alone and left the child behind');
      else S.record({ logic: 0.5, peacefulness: 0.5 }, 'chose escape over confrontation');
      S.voice('[You take the stairs two at a time. The rain, the growling, the red light — all of it falls away below you.]', 4);
      S.end('escape');
    },
  };

  /* ------------------------------ SIM 2: THE FLOOD ------------------------------ */
  SCRIPTS.sim_flood = {
    title: 'II',
    start(S, zone) {
      S.level = 0.04;
      S.rate = 1.7 / 115;
      // water plane
      const tex = DV.Tex.get('water').clone();
      tex.needsUpdate = true;
      tex.repeat.set(4, 3);
      const wm = new THREE.MeshBasicMaterial({ map: tex, color: 0x6a9aa8, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide, fog: true });
      const water = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), wm);
      water.rotation.x = -Math.PI / 2;
      water.position.set(7, S.level, 5);
      water.renderOrder = 4;
      water.update = (dt) => { water.position.y = S.level; tex.offset.x += dt * 0.02; tex.offset.y += dt * 0.013; };
      S.addObject(water);
      // stream from the burst pipe
      const stream = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.25), new THREE.MeshBasicMaterial({ color: 0x5a8090, transparent: true, opacity: 0.55 }));
      stream.position.set(0.32, 0.9, 8.2);
      stream.update = () => { stream.visible = !S.flag('valve'); };
      S.addObject(stream);
      // people
      const hester = S.actor({ sex: 'f', seed: 9, build: 'slim', skin: '#e9bf9b', face: 6, age: 70, hair: 'bun', hairColor: '#d9d7d2', outfit: { top: 'cardigan', topColor: '#6a5a4a', topColor2: '#a89880', bottom: 'longskirt', bottomColor: '#3e3a33', shoes: 'shoes', shoeColor: '#2a2a2a' } }, 3.6, 4.6, -Math.PI / 2);
      hester.action = 'lie';
      hester.seatY = 0.0;
      S.hester = hester;
      const corwin = S.actor({ sex: 'm', seed: 11, build: 'average', skin: '#c48a62', face: 5, age: 22, hair: 'messy', hairColor: '#2e1f15', outfit: { top: 'hoodie', topColor: '#3f4447', topColor2: '#5b4d3e', bottom: 'pants', bottomColor: '#35393a', shoes: 'boots', shoeColor: '#2f2a24' } }, 13.2, 5.0, Math.PI / 2);
      corwin.action = 'pace';
      S.corwin = corwin;
      S.say(corwin, 'Young Man', 'HELP! SOMEBODY! OPEN THE DOOR!', 3.5);
      S.nextShout = 7;
      // interactables
      S.interact({ id: 'f_hester', kind: 'action', x: () => hester.x, z: () => hester.z, radius: 2.0, label: 'Help', name: 'Old Woman', cond: () => !S.flag('hesterLost') && !S.ended, onUse: () => S.scene('sim2_hester') });
      S.interact({ id: 'f_corwin', kind: 'action', x: () => corwin.x, z: () => corwin.z, radius: 2.0, label: 'Talk to', name: 'Young Man', cond: () => !S.ended && !S.flag('corwinGone'), onUse: () => S.scene('sim2_corwin') });
      S.interact({ id: 'f_clip', kind: 'action', x: 6.5, z: 1.6, radius: 1.5, label: 'Read', name: 'Maintenance Log', onUse: () => S.scene('sim2_clipboard') });
      S.interact({ id: 'f_keypad', kind: 'action', x: 13.5, z: 6.3, radius: 1.4, label: 'Use', name: 'Keypad', cond: () => !S.flag('doorOpen'), onUse: () => S.scene('sim2_keypad') });
      S.interact({ id: 'f_locker', kind: 'action', x: 12.9, z: 8.6, radius: 1.4, label: 'Open', name: 'Locker', cond: () => !S.flag('maskTaken'), onUse: () => this.takeMask(S) });
      S.interact({ id: 'f_crowbar', kind: 'action', x: 8.6, z: 8.0, radius: 1.4, label: 'Take', name: 'Crowbar', cond: () => !S.flag('crowbar'), onUse: () => { S.setFlag('crowbar'); S.setHeld('crowbar'); DV.UI.notify('You take the crowbar.'); } });
      S.interact({ id: 'f_valve', kind: 'action', x: 0.7, z: 8.2, radius: 1.3, label: 'Examine', name: 'Burst Pipe', cond: () => !S.flag('valve'), onUse: () => S.scene('sim2_valve') });
      S.interact({ id: 'f_aware', kind: 'action', x: () => DV.Player.x, z: () => DV.Player.z, radius: 3, label: 'Steady yourself', name: '', cond: () => S.level > 1.05 && !S.flag('awareOffered') && !S.ended, onUse: () => { S.setFlag('awareOffered'); S.scene('sim2_aware'); } });
      setTimeout(() => S.voice('[Black water is seeping across the floor.]', 4), 1500);
    },
    level(S) { return S.level; },
    takeMask(S) {
      if (S.flag('maskTaken')) return;
      S.setFlag('maskTaken');
      S.setFlag('hasMask');
      S.setHeld('mask');
      DV.UI.notify('You take an emergency breathing mask. There is only one.');
    },
    giveMask(S, who) {
      if (who === 'hester') {
        S.setFlag('hasMask', false);
        S.setFlag('hesterMask');
        if (S.held === 'mask') S.setHeld(null);
        S.say(S.hester, 'Old Woman', '*breathes through the mask, eyes closed*', 3);
      }
    },
    freeHester(S, how) {
      S.setFlag('hesterFree');
      const h = S.hester;
      h.action = 'idle';
      h.seatY = 0.45;
      S.say(h, 'Old Woman', 'Oh — oh, thank you. I can stand. I can stand.', 3.5);
      void how;
    },
    valve(S) {
      S.setFlag('valve');
      S.rate *= 0.3;
      DV.Audio.play('clank');
      S.voice('[The valve shrieks, then turns. The roar of water drops to a trickle.]', 4);
    },
    code(S, c) {
      if (c === 'smash') { DV.Audio.play('hit'); S.voice('[You hit the keypad. It sparks — and keeps glowing, smugly.]', 3); return; }
      DV.Audio.play('keypad');
      if (c === '53') {
        S.setFlag('doorOpen');
        DV.Audio.play('check_ok');
        S.voice('[The keypad chirps. The lock clunks open.]', 3);
        if (!S.flag('codeCredited')) { S.setFlag('codeCredited'); S.record({ logic: 1.5 }, 'worked out the exit code'); }
      } else {
        DV.Audio.play('error');
        S.voice('[BZZT. The keypad flashes red.]', 2);
        S.rate *= 1.05;
      }
    },
    drain(S) {
      S.setFlag('drained');
      DV.UI.glitch();
      S.voice('[You close your eyes. When you open them, the water is draining away into nothing, and the walls are very slightly... thin.]', 5);
      S.drainT = 0;
      setTimeout(() => this.end(S, 'aware'), 4500);
    },
    update(S, dt, zone) {
      const p = DV.Player;
      if (S.flag('drained')) S.level = Math.max(0, S.level - dt * 0.6);
      else S.level = Math.min(1.8, S.level + S.rate * dt);
      p.moveScale = 1 - 0.45 * U.clamp(S.level / 1.2, 0, 1);
      p.surfaceOverride = S.level > 0.12 ? 'water' : null;
      const h = S.hester, c = S.corwin;
      // Hester follows once freed
      if (S.flag('hesterFree')) {
        const d = U.dist(h.x, h.z, p.x, p.z);
        if (d > 1.6) h.moveTo(p.x - Math.sin(p.rot) * 1.3, p.z - Math.cos(p.rot) * 1.3, 0.85);
        else h.stop();
      } else if (!S.flag('hesterMask') && !S.flag('hesterLost')) {
        if (S.level > 0.5 && !S.flag('hesterWarn')) { S.setFlag('hesterWarn'); S.say(h, 'Old Woman', 'The water — please — it\'s at my chin —', 4); }
        if (S.level > 0.78) {
          S.setFlag('hesterLost');
          DV.UI.glitch();
          S.voice('[The old woman\'s voice stops. When you look, there is only water where she was.]', 5);
          h.model.root.visible = false;
        }
      }
      // Corwin
      S.nextShout -= dt;
      if (!S.flag('corwinCalm') && !S.flag('corwinDespair') && S.nextShout <= 0) {
        S.nextShout = U.rand(6, 10);
        S.say(c, 'Young Man', U.pick(['HELP!', 'Somebody open this door!', 'We\'re going to drown in here!', 'Why won\'t it OPEN?']), 3);
      }
      if (S.t > 48 && !S.flag('maskTaken') && !S.flag('corwinCalm') && !S.flag('corwinGrab')) {
        S.setFlag('corwinGrab');
        c.moveTo(12.8, 8.3, 1.6);
        S.say(c, 'Young Man', 'A mask — there\'s a MASK —', 3);
      }
      if (S.flag('corwinGrab') && !S.flag('maskTaken') && U.dist(c.x, c.z, 12.8, 8.3) < 0.3) {
        S.setFlag('maskTaken');
        S.setFlag('corwinHasMask');
        c.moveTo(12.6, 6.2, 1.4);
      }
      if (S.flag('doorOpen') && !S.flag('corwinGone') && !S.flag('corwinFollows')) {
        if (S.flag('corwinCalm') && S.flag('hesterFree') === false && !S.flag('corwinWaits')) { S.setFlag('corwinWaits'); S.say(c, 'Young Man', 'Go — I\'ll wait for her. Go!', 3); }
        if (!S.flag('corwinCalm') || S.flag('hesterFree')) {
          c.moveTo(17, 5, 2.2);
          if (c.x > 16.5) { S.setFlag('corwinGone'); c.model.root.visible = false; }
        }
      }
      // forced endings
      if (S.level > 1.55 && !S.flag('drownScene') && !DV.Dialogue.isActive()) {
        S.setFlag('drownScene');
        S.scene('sim2_drown');
      }
      S.fearTarget = U.clamp(0.2 + S.level * 0.55, 0, 1);
    },
    end(S, how) {
      if (S.ended) return;
      if (how !== 'exit') {
        if (S.flag('hesterFree') || S.flag('hesterMask')) S.record({ selflessness: 0.5 }, 'saved the trapped woman');
      }
      S.end(how);
    },
    onTrigger(S, id, inside) {
      if (id !== 'exit' || !inside || S.ended) return;
      const hFree = S.flag('hesterFree') && U.dist(S.hester.x, S.hester.z, DV.Player.x, DV.Player.z) < 5;
      if (hFree) S.record({ selflessness: 1.5 }, 'led the injured woman out of the flood');
      else if (!S.flag('hesterFree') && !S.flag('hesterMask')) S.record({ selflessness: -1.5, logic: 0.5 }, 'escaped and left the trapped woman behind');
      if (S.flag('corwinCalm')) S.record({ peacefulness: 0.5 }, 'kept the frightened man from breaking');
      S.voice('[You climb out of the dark water and up the stairs. The roar of it fades behind you, then stops — as if someone turned it off.]', 4);
      this.end(S, 'exit');
    },
  };

  /* ------------------------------ SIM 3: THE TRIBUNAL ------------------------------ */
  SCRIPTS.sim_tribunal = {
    title: 'III',
    start(S, zone) {
      const judgeApp = (seed, sex) => ({ sex, seed, build: 'average', skin: '#c8ccd0', face: 1, hair: 'bald', faceless: true, height: 1.08,
        outfit: { top: 'robe', topColor: '#121214', topColor2: '#e8e6e0', bottom: 'pants', bottomColor: '#0e0e10', shoes: 'shoes', shoeColor: '#0a0a0a' } });
      S.judges = [];
      [[7.2, 'f'], [10, 'm'], [12.8, 'm']].forEach(([x, sex], i) => {
        const j = S.actor(judgeApp(30 + i, sex), x, 1.6, 0);
        j.y = 2.8;
        j.action = 'sit';
        j.seatY = 0.5;
        S.judges.push(j);
      });
      S.interact({ id: 't_chair', kind: 'action', x: 10, z: 11, radius: 1.6, label: 'Approach', name: 'The Chair', cond: () => !S.flag('sat') && !S.flag('trialStarted'), onUse: () => S.scene('sim3_chair') });
      S.interact({ id: 't_mirror', kind: 'action', x: 0.9, z: 10, radius: 2.0, label: 'Look into', name: 'Mirror', cond: () => !S.flag('doorOpen') && !S.ended, onUse: () => S.scene('sim3_mirror') });
      S.interact({ id: 't_button', kind: 'action', x: 13.5, z: 11, radius: 1.4, label: 'Examine', name: 'Red Button', cond: () => !S.flag('trialStarted'), onUse: () => DV.UI.notify('A single red button on a black pedestal. Nothing happens when you look at it. Yet.') });
      S.interact({ id: 't_paper', kind: 'action', x: 10, z: 9.6, radius: 1.4, label: 'Read', name: 'Document', cond: () => !S.flag('trialStarted'), onUse: () => DV.UI.showReading('Document', 'CONFESSION\n\nI, the undersigned, admit to tampering with serum lot 33 at the Sector 4 Aptitude Testing Center, and accept the judgement of the Tribunal.\n\nSIGNED: ______________\n\n(It is not dated. There is no witness line.)') });
      // glowing door (hidden until the mirror breaks)
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.5), new THREE.MeshBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0, fog: false }));
      door.position.set(10, 1.25, 19.85);
      door.rotation.y = Math.PI;
      door.update = (dt) => { if (S.flag('doorOpen')) door.material.opacity = Math.min(0.95, door.material.opacity + dt); };
      S.addObject(door);
      S.doorCol = zone.colliders.add(8.8, 19.6, 11.2, 19.9, { y1: 3, tag: 'seam' });
      S.voice('"SIT."', 4);
      DV.Audio.play('gavel', { volume: 0.5 });
      S.sitWarn = 0;
    },
    accusePlace(S) {
      const zs = DV.State.zoneState('testing_center').visited;
      const order = [['storage', 'storage room'], ['breakroom', 'staff break room'], ['records', 'records archive'], ['gallery', 'observation gallery'], ['proctor', 'proctor station'], ['closet', 'custodial closet'], ['infirmary', 'infirmary'], ['restroom', 'washroom'], ['offices', 'administration office']];
      for (const [id, name] of order) if (zs[id]) return name;
      return 'waiting hall';
    },
    accuseName(S) {
      for (const id of ['mara_voss', 'elias_thorne', 'pip_hollis', 'rook_delaney', 'theo_vance', 'juniper_nash']) {
        if (DV.State.npc(id).mem.met) return DV.NPCData.get(id).name;
      }
      return 'Mara Voss';
    },
    sit(S) {
      S.setFlag('sat');
      DV.Player.place(10, 11, Math.PI);
      DV.Player.sit({ x: 10, z: 11, rot: Math.PI, seatY: 0.46, act: 'sit', ax: 10, az: 11.8 });
      DV.Game.rig.yaw = Math.PI;
      setTimeout(() => this.startTrial(S), 900);
    },
    startTrial(S) {
      if (S.flag('trialStarted') || S.ended) return;
      S.setFlag('trialStarted');
      DV.Dialogue.startScene('sim3_trial', { speaker: 'The Tribunal' });
      DV.Game.onSceneStart();
    },
    breakTrial(S) {
      S.setFlag('brokeTrial');
      S.voice('[You stand and walk away from the bench. Nobody stops you. The tribunal\'s voices smear into a single drone.]', 4);
      if (DV.Player.state === 'sitting') DV.Player.standUp();
    },
    openDoor(S) {
      S.setFlag('doorOpen');
      S.doorCol.enabled = false;
      for (const j of S.judges) j.model.setVisible(false);
      DV.UI.narrate('', 0.1);
    },
    end(S, how) {
      if (how === 'verdict') {
        DV.UI.glitch();
        S.fearTarget = 0;
      }
      S.end(how);
    },
    update(S, dt, zone) {
      if (!S.flag('sat') && !S.flag('trialStarted')) {
        S.sitWarn += dt;
        if (S.sitWarn > 14 && !S.flag('warn1')) { S.setFlag('warn1'); S.voice('"SIT. DOWN."', 4); DV.Audio.play('gavel', { volume: 0.7 }); }
        if (S.sitWarn > 28 && !S.flag('warn2') && !DV.Dialogue.isActive() && !S.flag('doorOpen')) {
          S.setFlag('warn2');
          S.record({ resistance: 1.5 }, 'refused to sit when ordered');
          S.voice('"Very well. Stand, then."', 3);
          setTimeout(() => { if (!DV.Dialogue.isActive() && !S.flag('doorOpen')) this.startTrial(S); }, 1600);
        }
      }
      // judges turn to follow the player
      for (const j of S.judges) j.look = U.clamp(U.wrapAngle(U.yawTo(j.x, j.z, DV.Player.x, DV.Player.z) - j.rot), -0.9, 0.9);
      S.fearTarget = S.flag('doorOpen') ? 0.05 : S.flag('trialStarted') ? 0.55 : 0.35;
    },
    onDialogueEnd(S, e) {
      // walking away from the tribunal mid-trial (via the mirror glimpse)
      if (S.flag('brokeTrial') && !S.flag('doorOpen') && !S.flag('mirrorHint')) {
        S.setFlag('mirrorHint');
        DV.UI.notify('The mirror on the west wall is waiting.');
      }
      void e;
    },
    onTrigger(S, id, inside) {
      if (id !== 'exit' || !inside || S.ended || !S.flag('doorOpen')) return;
      S.record({ div: 2 }, 'walked out of the simulation through a door that should not exist');
      S.voice('[You step through. There is a moment of perfect white silence.]', 4);
      this.end(S, 'walked_out');
    },
  };

  DV.Sim = Sim;
})();
