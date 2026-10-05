/* ==========================================================================
   DIVERGENT — Build 3: the Dauntless compound
   The Pit from Build 2, and everything cut into the rock around it:
     west  — the tunnel from the net, the transfer dormitory and its washroom
     north — the Training Room (the range, the knife wall, the bags, the
             ring, the rankings board), the Simulation Room (locked until
             Stage Two), the members' quarters (members only), the Dining Hall
     east  — Nina's tattoo parlour and the infirmary
     south — the railing, and the chasm
   Everything a scheduled person needs is a named spot: bunks, benches,
   lanes, bags, ring-side, the railing.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  /* ------------------------------ props ------------------------------ */
  // two-tier metal bunk: a 'lie' spot on each level (id + '_lo' / '_hi')
  DV.Props.define('bunk_bed', (ctx, p, B) => {
    const m = ctx.M('metal_dark'), sheet = ctx.M(p.sheet || 'fabric_grey'), pillow = ctx.M('white');
    for (const [x, z] of [[-0.45, -0.98], [0.45, -0.98], [-0.45, 0.98], [0.45, 0.98]]) B.box(m, x, 0, z, 0.05, 1.95, 0.05);
    for (const y of [0.38, 1.38]) {
      B.box(m, 0, y, 0, 0.95, 0.05, 2.0);
      B.box(sheet, 0, y + 0.05, 0.05, 0.86, 0.12, 1.88);
      B.box(pillow, 0, y + 0.17, -0.72, 0.56, 0.08, 0.32);
      B.box(m, 0, y + 0.05, -0.98, 0.95, 0.4, 0.04);
    }
    B.box(m, 0.47, 0.5, 0.3, 0.03, 1.2, 0.03); // ladder
    for (let k = 0; k < 4; k++) B.box(m, 0.47, 0.6 + k * 0.28, 0.3, 0.03, 0.03, 0.3);
    ctx.collide(-0.48, -1.0, 0.48, 1.0, { y1: 2.0 });
    if (p.id) {
      ctx.spot(p.id + '_lo', 0, 0.15, Math.PI, 'lie', { seatY: 0.43, approachLocal: [0.85, 0.3] });
      ctx.spot(p.id + '_hi', 0, 0.15, Math.PI, 'lie', { seatY: 1.43, approachLocal: [0.85, 0.3] });
      if (p.mine) {
        const [x, z] = ctx.toWorld(0.75, 0.2);
        ctx.interact({ id: 'my_bunk', kind: 'action', action: 'sleep', x, y: 0.8, z, radius: 1.3, get label() { return DV.Initiation && DV.Initiation.canSleep() ? 'Sleep' : 'Rest'; }, name: 'Your Bunk' });
      }
    }
  });

  // a heavy bag on a chain from the ceiling (the swinging part is built live: zone.bags)
  DV.Props.define('punching_bag', (ctx, p, B) => {
    const h = p.ceil || 6.5;
    B.box(ctx.M('metal_dark'), 0, h - 0.12, 0, 0.5, 0.12, 0.5);
    const zone = ctx.zone;
    const g = new THREE.Group();
    const [wx, wz] = ctx.toWorld(0, 0);
    g.position.set(wx, h - 0.12, wz);
    const chainMat = new THREE.MeshBasicMaterial({ color: 0x3a3a3c, fog: true });
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.03, h - 2.3, 0.03), chainMat);
    chain.position.y = -(h - 2.3) / 2;
    g.add(chain);
    const bagMat = new THREE.MeshLambertMaterial({ map: DV.Tex.get('fabric_grey'), color: p.color || 0x6a2a22, flatShading: true });
    const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.1, 8), bagMat);
    bag.position.y = -(h - 2.3) - 0.55;
    g.add(bag);
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.08, 8), new THREE.MeshBasicMaterial({ color: 0x151515, fog: true }));
    strap.position.y = bag.position.y + 0.4;
    g.add(strap);
    ctx.add(g);
    const it = { x: wx, z: wz, g, ax: 0, az: 0, vx: 0, vz: 0, len: h - 1.6, id: p.id };
    (zone.bags || (zone.bags = [])).push(it);
    ctx.collide(-0.22, -0.22, 0.22, 0.22, { y1: 2.1 });
    if (p.id) ctx.spot(p.id, 0, 0.75, Math.PI, 'bagwork');
    // the player's bag
    const [ix, iz] = ctx.toWorld(0, 0.8);
    ctx.interact({ id: 'bag:' + p.id, kind: 'action', action: 'bag', bag: it, x: ix, y: 1.2, z: iz, radius: 1.0, label: 'Work the bag', name: 'Heavy Bag' });
  });

  // the shooting bench and its targets (target faces are live: zone.targets).
  // Local frame: the shooter stands at -z behind the bench and shoots toward +z.
  DV.Props.define('range_lane', (ctx, p, B) => {
    const len = p.len || 13;
    const wood = ctx.M('wood'), m = ctx.M('metal_dark');
    // bench
    B.box(wood, 0, 0.95, 0, 1.2, 0.06, 0.5);
    B.box(m, -0.5, 0, 0, 0.05, 0.95, 0.05); B.box(m, 0.5, 0, 0, 0.05, 0.95, 0.05);
    ctx.collide(-0.6, -0.25, 0.6, 0.25, { y1: 1.0 });
    // target stand at the far end
    B.box(m, -0.35, 0, len, 0.05, 1.0, 0.05); B.box(m, 0.35, 0, len, 0.05, 1.0, 0.05);
    B.box(m, 0, 0, len, 0.8, 0.06, 0.3);
    ctx.collide(-0.4, len - 0.1, 0.4, len + 0.1, { y1: 1.9 });
    const zone = ctx.zone;
    const tex = DV.Tex.custom('target_face', 64, 96, (c, w, h) => {
      c.fillStyle = '#e8e2d0'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#20201e';
      // a human silhouette with scoring rings
      c.beginPath(); c.arc(w / 2, 20, 11, 0, Math.PI * 2); c.fill();
      c.fillRect(w / 2 - 20, 33, 40, 63);
      c.strokeStyle = '#e8e2d0'; c.lineWidth = 1.5;
      for (const r of [6, 13, 20]) { c.beginPath(); c.arc(w / 2, 58, r, 0, Math.PI * 2); c.stroke(); }
      c.beginPath(); c.arc(w / 2, 20, 5, 0, Math.PI * 2); c.stroke();
    });
    const mat = new THREE.MeshBasicMaterial({ map: tex, fog: true });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.93), mat);
    const [fx, fz] = ctx.toWorld(0, len - 0.03);
    face.position.set(fx, 1.45, fz);
    face.rotation.y = (ctx.prop.rot || 0) + Math.PI; // facing back down the lane
    ctx.add(face);
    const lane = { id: p.id, i: p.lane || 0, face, x: fx, z: fz, y: 1.45, w: 0.62, h: 0.93, holes: [], rot: face.rotation.y };
    const [bx, bz] = ctx.toWorld(0, -0.55);
    lane.stand = { x: bx, z: bz, rot: ctx.prop.rot || 0 };
    (zone.targets || (zone.targets = [])).push(lane);
    if (p.id) ctx.spot(p.id, 0, -0.55, 0, 'aim');
    ctx.interact({ id: 'range:' + p.id, kind: 'action', action: 'range', lane, x: bx, y: 1.1, z: bz, radius: 1.1, label: 'Take up a pistol', name: 'Firing Line' });
  });

  // a round wooden board for throwing knives at (knives stick in it live: zone.knifeBoards)
  DV.Props.define('knife_board', (ctx, p, B) => {
    const zone = ctx.zone;
    const tex = DV.Tex.custom('knife_board', 96, 96, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#a37a4a'); g.addColorStop(1, '#6e4a26');
      c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2); c.fill();
      for (let y = 0; y < h; y += 3) { c.fillStyle = 'rgba(40,22,8,' + (0.08 + Math.random() * 0.1) + ')'; c.fillRect(0, y, w, 1); }
      c.strokeStyle = '#2a1608'; c.lineWidth = 2;
      for (const r of [10, 22, 34, 46]) { c.beginPath(); c.arc(w / 2, h / 2, r, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = '#9a2a1a'; c.beginPath(); c.arc(w / 2, h / 2, 9, 0, Math.PI * 2); c.fill();
      // old knife scars
      c.fillStyle = 'rgba(20,10,4,0.6)';
      for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * 44; c.fillRect(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr, 2, 1); }
    }, { transparent: true });
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, fog: true });
    const size = p.size || 1.1;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    const [fx, fz] = ctx.toWorld(0, 0.06);
    face.position.set(fx, p.y || 1.5, fz);
    face.rotation.y = ctx.prop.rot || 0;
    ctx.add(face);
    B.box(ctx.M('wood'), 0, (p.y || 1.5) - size / 2, 0.02, size * 0.9, size, 0.05);
    const board = { id: p.id, face, x: fx, z: fz, y: p.y || 1.5, r: size / 2, rot: face.rotation.y, knives: [] };
    (zone.knifeBoards || (zone.knifeBoards = [])).push(board);
  });

  // the ring: red mat, white edge line, Dauntless emblem in the middle, corner posts and chains
  DV.Props.define('fight_ring', (ctx, p, B) => {
    const s = (p.size || 7) / 2;
    B.flat(ctx.M('mat_red'), -s, -s, s, s, 0.03);
    const white = ctx.M('paint_white');
    for (const [x0, z0, x1, z1] of [[-s, -s, s, -s + 0.1], [-s, s - 0.1, s, s], [-s, -s, -s + 0.1, s], [s - 0.1, -s, s, s]]) B.flat(white, x0, z0, x1, z1, 0.035);
    const tex = DV.Tex.emblem('dauntless', '#c8b8a0', null, 256);
    B.flat(DV.Mat.fromTexture('emblem|dauntless_ring', tex, { transparent: true }), -1.4, -1.4, 1.4, 1.4, 0.04, { uv: 'unit' });
    const m = ctx.M('metal_dark');
    for (const [x, z] of [[-s, -s], [s, -s], [-s, s], [s, s]]) B.box(m, x, 0, z, 0.12, 1.2, 0.12);
    // chains along three sides (the near side is open)
    const ch = ctx.M('metal');
    for (const [x0, z0, x1, z1] of [[-s, -s, s, -s], [-s, -s, -s, s], [s, -s, s, s]]) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      B.push((x0 + x1) / 2, 0, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0));
      B.box(ch, 0, 0.95, 0, 0.03, 0.03, len); B.box(ch, 0, 0.6, 0, 0.03, 0.03, len);
      B.pop();
    }
    ctx.zone.ring = { x0: ctx.prop.x - s + 0.3, z0: ctx.prop.z - s + 0.3, x1: ctx.prop.x + s - 0.3, z1: ctx.prop.z + s - 0.3, cx: ctx.prop.x, cz: ctx.prop.z };
  });

  // the rankings: a chalkboard the instructor writes the names on (the face is live: zone.rankBoard)
  DV.Props.define('rank_board', (ctx, p, B) => {
    const w = p.w || 3.2, h = p.h || 2.0, y = p.y || 1.9;
    B.box(ctx.M('wood'), 0, y - h / 2 - 0.08, 0.02, w + 0.16, h + 0.16, 0.05);
    const c = document.createElement('canvas'); c.width = 256; c.height = 160;
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, fog: true }));
    const [fx, fz] = ctx.toWorld(0, 0.06);
    face.position.set(fx, y, fz);
    face.rotation.y = ctx.prop.rot || 0;
    ctx.add(face);
    const board = {
      canvas: c, tex, face,
      // rows: [{ name, pts, you, cut }], title, cutAt (index of the first name below the line)
      draw(title, rows, cutAt) {
        const g = c.getContext('2d');
        g.fillStyle = '#1e2420'; g.fillRect(0, 0, 256, 160);
        g.fillStyle = 'rgba(220,225,215,0.06)';
        for (let i = 0; i < 14; i++) g.fillRect(Math.random() * 256, Math.random() * 160, 20 + Math.random() * 60, 6 + Math.random() * 12);
        g.fillStyle = '#e6e2d4'; g.font = 'bold 13px Georgia, serif'; g.textAlign = 'center';
        g.fillText(title || 'RANKINGS', 128, 18);
        g.fillRect(40, 23, 176, 1);
        g.textAlign = 'left'; g.font = '11px Courier New, monospace';
        const n = rows.length, lh = Math.min(12.5, 128 / Math.max(1, n));
        rows.forEach((r, i) => {
          const yy = 38 + i * lh;
          if (cutAt !== undefined && cutAt !== null && i === cutAt) { g.fillStyle = '#c84a3a'; g.fillRect(26, yy - lh + 3, 204, 1.5); }
          g.fillStyle = r.you ? '#f0d890' : cutAt !== undefined && cutAt !== null && i >= cutAt ? '#b8857a' : '#dcd8ca';
          g.fillText(String(i + 1).padStart(2, ' ') + '. ' + r.name.toUpperCase().slice(0, 18), 30, yy);
          if (r.pts !== undefined) { g.textAlign = 'right'; g.fillText(String(Math.round(r.pts)), 228, yy); g.textAlign = 'left'; }
        });
        tex.needsUpdate = true;
      },
    };
    board.draw('STAGE ONE', [], null);
    ctx.zone.rankBoard = board;
    const [ix, iz] = ctx.toWorld(0, 1.0);
    ctx.interact({ id: 'rank_board', kind: 'action', action: 'rankings', x: ix, y: 1.8, z: iz, radius: 1.8, label: 'Read', name: 'Rankings Board' });
  });

  // the tattoo chair: a reclining chair, a stool, a lamp on an arm, the ink trolley
  DV.Props.define('tattoo_chair', (ctx, p, B) => {
    const lea = ctx.M('fabric_grey'), m = ctx.M('metal_dark');
    B.box(m, 0, 0, 0, 0.5, 0.45, 0.7);
    B.push(0, 0.45, 0, 0); B.box(lea, 0, 0, 0.1, 0.62, 0.12, 0.9); B.pop();
    B.push(0, 0.5, -0.35, 0); B.box(lea, 0, 0, -0.35, 0.6, 0.12, 0.8); B.pop(); // back (reclined: built flat-ish)
    B.box(lea, 0, 0.42, 0.75, 0.55, 0.1, 0.5); // leg rest
    B.box(m, 0.75, 0, -0.2, 0.05, 1.7, 0.05); B.box(m, 0.55, 1.65, -0.2, 0.45, 0.04, 0.04);
    B.box(ctx.M('light_panel:emit'), 0.35, 1.55, -0.2, 0.2, 0.08, 0.2, { uv: 'unit' });
    B.box(ctx.M('metal'), -0.85, 0, 0.1, 0.5, 0.75, 0.4); // trolley
    for (let k = 0; k < 5; k++) B.cyl(ctx.M(['plastic_orange', 'black', 'paint_blue', 'plastic', 'carpet_red'][k]), -1.0 + k * 0.07, 0.75, 0.05, 0.02, 0.02, 0.08, 5);
    ctx.collide(-0.35, -0.8, 0.35, 1.0, { y1: 0.9 });
    ctx.collide(-1.1, -0.1, -0.6, 0.3, { y1: 0.8 });
    if (p.id) {
      ctx.spot(p.id + '_client', 0, -0.05, Math.PI, 'recline', { seatY: 0.6, approachLocal: [0.9, 0.2] });
      ctx.spot(p.id + '_artist', -0.75, 0.55, Math.PI / 2, 'work', { seatY: 0.5 });
    }
  });

  // a long dining table with a bench each side
  DV.Props.define('long_table', (ctx, p, B) => {
    const len = p.len || 5, top = ctx.M('wood'), m = ctx.M('metal_dark');
    B.box(top, 0, 0.72, 0, len, 0.06, 0.95);
    for (const x of [-len / 2 + 0.2, len / 2 - 0.2]) B.box(m, x, 0, 0, 0.08, 0.72, 0.7);
    ctx.collide(-len / 2, -0.48, len / 2, 0.48, { y1: 0.8 });
    // tin plates and cups
    for (let k = 0; k < Math.floor(len / 0.8); k++) {
      const x = -len / 2 + 0.4 + k * 0.8;
      if ((k * 7 + (p.seed || 0)) % 3 === 0) continue;
      B.cyl(ctx.M('metal'), x, 0.78, (k % 2 ? 0.25 : -0.25), 0.12, 0.12, 0.015, 8);
    }
    for (const side of [-1, 1]) {
      B.box(top, 0, 0.42, side * 0.75, len, 0.05, 0.32);
      B.box(m, -len / 2 + 0.2, 0, side * 0.75, 0.05, 0.42, 0.25); B.box(m, len / 2 - 0.2, 0, side * 0.75, 0.05, 0.42, 0.25);
      ctx.collide(-len / 2, side * 0.75 - 0.16, len / 2, side * 0.75 + 0.16, { y1: 0.47 });
      const n = Math.floor(len / 0.72);
      for (let k = 0; k < n; k++) {
        const x = -len / 2 + (len / n) * (k + 0.5);
        if (p.id) ctx.spot(p.id + (side < 0 ? '_a' : '_b') + k, x, side * 0.78, side < 0 ? 0 : Math.PI, 'sit', { seatY: 0.45, approachLocal: [x, side * 1.35] });
      }
    }
  });

  // dumbbell rack and a bench press
  DV.Props.define('weights', (ctx, p, B) => {
    const m = ctx.M('metal_dark'), r = ctx.M('black');
    B.box(m, 0, 0, 0, 1.6, 0.7, 0.45);
    for (let k = 0; k < 6; k++) { B.box(r, -0.65 + k * 0.26, 0.72, -0.08, 0.1, 0.1, 0.1); B.box(r, -0.65 + k * 0.26, 0.72, 0.1, 0.1, 0.1, 0.1); }
    B.box(ctx.M('fabric_grey'), 0, 0.42, 1.3, 0.35, 0.08, 1.2);
    B.box(m, 0, 0, 1.3, 0.1, 0.42, 1.0);
    B.box(m, 0, 1.0, 0.8, 1.8, 0.04, 0.04);
    for (const x of [-0.75, 0.75]) { B.cyl(r, x, 0.8, 0.8, 0.22, 0.22, 0.05, 10); B.box(m, x * 0.75, 0, 0.8, 0.05, 1.0, 0.05); }
    ctx.collide(-0.85, -0.25, 0.85, 1.95, { y1: 1.1 });
    if (p.id) ctx.spot(p.id, 0.0, 2.2, Math.PI, 'arms_crossed');
  });

  // an oil drum with a fire in it: the Pit's evenings gather round these
  DV.Props.define('fire_barrel', (ctx, p, B) => {
    B.cyl(ctx.M('rust'), 0, 0, 0, 0.3, 0.3, 0.9, 8);
    B.cyl(ctx.M('black'), 0, 0.88, 0, 0.27, 0.27, 0.02, 8);
    ctx.collide(-0.32, -0.32, 0.32, 0.32, { y1: 0.9, camera: false });
    const g = new THREE.Group();
    const fm = [0xffb040, 0xff7020, 0xffd070].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, depthWrite: false }));
    const tongues = [];
    for (let k = 0; k < 5; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.14 + (k % 2) * 0.05, 0.6, 5), fm[k % 3]); t.position.set((k % 3 - 1) * 0.12, 0.3, (Math.floor(k / 3) - 0.5) * 0.14); g.add(t); tongues.push(t); }
    // the glow it throws on everything round it
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff9a40, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(3.4, 3.4, 1); glow.position.y = 0.5; g.add(glow);
    g.position.set(p.x, 0.95, p.z);
    ctx.add(g);
    let t = p.x;
    ctx.update((dt) => {
      t += dt;
      tongues.forEach((m, i) => { const s = 0.75 + 0.35 * Math.sin(t * (8 + i) + i * 1.9); m.scale.set(1, s, 1); m.rotation.y = t * (0.6 + i * 0.1); });
      glow.material.opacity = 0.45 + 0.12 * Math.sin(t * 9.3) * Math.sin(t * 4.1);
    });
    (ctx.zone.fires || (ctx.zone.fires = [])).push({ x: p.x, z: p.z });
  });
  function glowTex() {
    return DV.Tex.custom('fireglow', 64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    });
  }

  // a stall against the rock: a counter, posts, a striped awning, its goods, a hand-painted sign
  DV.Props.define('stall', (ctx, p, B) => {
    const w = p.w || 3.2, wood = ctx.M('wood'), m = ctx.M('metal_dark');
    B.box(wood, 0, 0, 0.3, w, 1.0, 0.7, { faces: { pz: ctx.M('wood_panel') } });
    B.box(ctx.M('wood_light'), 0, 1.0, 0.3, w + 0.1, 0.05, 0.8);
    for (const x of [-w / 2 + 0.06, w / 2 - 0.06]) B.box(m, x, 0, 0.7, 0.07, 2.4, 0.07);
    // the awning: red and black stripes, tilted out over the counter
    const stripes = [ctx.M('mat_red'), ctx.M('black')];
    for (let k = 0; k < 6; k++) {
      const x0 = -w / 2 - 0.1 + ((w + 0.2) * k) / 6, x1 = x0 + (w + 0.2) / 6;
      B.quad(stripes[k % 2], [x0, 2.4, -0.4], [x1, 2.4, -0.4], [x1, 2.15, 1.05], [x0, 2.15, 1.05], [0, 0], [1, 0], [1, 1], [0, 1]);
    }
    // the goods
    const r = U.rng('stall' + p.x + p.z);
    if (p.kind === 'food') {
      for (let k = 0; k < 4; k++) B.cyl(ctx.M('metal'), -w / 2 + 0.5 + k * 0.7, 1.05, 0.3, 0.17, 0.17, 0.04, 8);
      for (let k = 0; k < 3; k++) B.box(ctx.M('wood_light'), -w / 2 + 0.8 + k * 0.85, 1.05, 0.2, 0.42, 0.22, 0.3, { faces: { top: ctx.M('mat_red') } }); // cakes
    } else if (p.kind === 'clothes') {
      B.box(m, 0, 1.9, 0, w - 0.4, 0.03, 0.03);
      for (let k = 0; k < 7; k++) B.box(ctx.M(r() < 0.6 ? 'black' : r() < 0.5 ? 'mat_red' : 'fabric_grey'), -w / 2 + 0.45 + k * ((w - 0.9) / 6), 1.2, 0, 0.32, 0.68, 0.06);
    } else {
      for (let k = 0; k < 5; k++) B.box(ctx.M(r() < 0.5 ? 'metal_dark' : 'wood_light'), -w / 2 + 0.4 + k * 0.6, 1.05, 0.25, 0.4, 0.15 + r() * 0.3, 0.35);
    }
    const sign = DV.Mat.fromTexture('stallsign|' + p.text, DV.Tex.sign(p.text || 'STALL', { w: 256, h: 48, bg: '#141414', color: '#e8502a', size: 26, border: false }), { emit: true });
    B.panel(sign, 0, 2.62, 0.72, Math.min(w - 0.2, 2.4), 0.42);
    ctx.collide(-w / 2, -0.1, w / 2, 0.7, { y1: 1.1 });
  });

  // a gun rack on the wall: carbines standing in their slots, pistols on the pegs above
  DV.Props.define('gun_rack', (ctx, p, B) => {
    const w = ctx.M('wood'), m = ctx.M('metal_dark');
    B.box(w, 0, 0.2, 0.04, 1.5, 1.85, 0.06);
    B.box(w, 0, 0.05, 0.2, 1.5, 0.12, 0.3); // the butt shelf
    B.box(m, 0, 1.15, 0.12, 1.4, 0.05, 0.16); // the slotted bar
    for (let k = 0; k < 4; k++) B.box(m, -0.45 + k * 0.3, 1.7, 0.1, 0.05, 0.05, 0.12); // pegs
    // the weapons themselves (DV.Arms), one mesh, lit like the room
    const M = new DV.Vehicles.MB();
    const n = p.rifles === undefined ? 5 : p.rifles;
    for (let k = 0; k < n; k++) {
      M.push(-0.56 + k * 0.28, 0.42, 0.17, 0, -Math.PI / 2 + 0.06, 0); // butt on the shelf, muzzle up, leaning back
      M.merge(DV.Arms.geometry('rifle'));
      M.pop();
    }
    for (let k = 0; k < 3; k++) {
      M.push(-0.45 + k * 0.3 + 0.15, 1.66, 0.12, Math.PI / 2, 0, 0); // pistols hung by the trigger guard
      M.merge(DV.Arms.geometry('pistol'));
      M.pop();
    }
    const mesh = new THREE.Mesh(M.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
    const L = ctx.light(p.x, p.z);
    mesh.material.color.setRGB(Math.min(1.2, L[0]), Math.min(1.2, L[1]), Math.min(1.2, L[2]));
    const [wx, wz] = ctx.toWorld(0, 0);
    mesh.position.set(wx, p.elev || 0, wz);
    mesh.rotation.y = ctx.prop.rot || 0;
    ctx.add(mesh);
    ctx.collide(-0.78, -0.05, 0.78, 0.36, { y1: 2 });
  });

  /* ------------------------------ the compound ------------------------------ */
  const PIT = DV.DauntlessPit;
  const rooms = PIT.rooms().concat([
    { id: 'dorm_corr', name: 'Dormitory Passage', x0: 7, z0: -9.5, x1: 13, z1: -6.5, h: 3.2, floor: 'concrete_dark', wall: 'rock', ceiling: 'rock', light: { ambient: [0.16, 0.16, 0.2], color: [1, 0.78, 0.5], intensity: 0.8, spacing: 3, range: 4.5, fixture: 'bulb' } },
    { id: 'dorm', name: 'Transfer Dormitory', x0: -9, z0: -17, x1: 7, z1: -1, h: 3.4, floor: 'concrete', wall: 'rock', ceiling: 'ceiling_concrete', light: { ambient: [0.2, 0.19, 0.2], color: [1, 0.8, 0.55], intensity: 0.85, spacing: 4.5, range: 6, fixture: 'bulb' } },
    { id: 'dorm_wash', name: 'Washroom', x0: -9, z0: -23, x1: -1, z1: -17, h: 3, floor: 'tile_small', wall: 'tile_white', ceiling: 'ceiling_concrete', light: { ambient: [0.25, 0.26, 0.27], color: [0.92, 0.96, 1], intensity: 0.8, spacing: 3.5, range: 5, fixture: 'tube' } },
    { id: 'tr_corr', name: 'Training Passage', x0: 22.5, z0: -22, x1: 25.5, z1: -14, h: 3.4, floor: 'concrete_dark', wall: 'rock', ceiling: 'rock', light: { ambient: [0.16, 0.17, 0.2], color: [0.85, 0.9, 1], intensity: 0.85, spacing: 3, range: 4.5, fixture: 'bulb' } },
    { id: 'training', name: 'Training Room', x0: 14, z0: -40, x1: 44, z1: -22, h: 6.5, floor: 'concrete', wall: 'concrete_dark', ceiling: 'ceiling_concrete', surface: 'concrete', light: { ambient: [0.3, 0.31, 0.33], color: [0.95, 0.97, 1], intensity: 0.95, spacing: 5, range: 8, fixture: 'tube' } },
    { id: 'sim_room', name: 'Simulation Room', x0: 27, z0: -21, x1: 34, z1: -14, h: 3.2, floor: 'tile_floor', wall: 'paint_white', ceiling: 'ceiling_tile', light: { ambient: [0.3, 0.32, 0.34], color: [0.9, 0.95, 1], intensity: 0.8, spacing: 3.5, range: 5, fixture: 'panel' } },
    { id: 'quarters', name: 'Members\' Quarters', x0: 36, z0: -20, x1: 40, z1: -14, h: 3.2, floor: 'concrete_dark', wall: 'rock', ceiling: 'rock', light: { ambient: [0.15, 0.15, 0.17], color: [1, 0.8, 0.55], intensity: 0.7, spacing: 3, range: 4, fixture: 'bulb' } },
    { id: 'dining', name: 'Dining Hall', x0: 46, z0: -32, x1: 62, z1: -14, h: 5, floor: 'concrete', wall: 'rock', ceiling: 'rock', surface: 'concrete', light: { ambient: [0.26, 0.23, 0.22], color: [1, 0.78, 0.52], intensity: 0.95, spacing: 5, range: 7.5, fixture: 'bulb' } },
    { id: 'tattoo', name: 'Tattoo Parlour', x0: 61, z0: -10, x1: 69, z1: -2, h: 3.4, floor: 'wood', wall: 'paint_warm', ceiling: 'ceiling_concrete', light: { ambient: [0.22, 0.18, 0.22], color: [1, 0.55, 0.75], intensity: 0.85, spacing: 4, range: 6, fixture: 'bulb', extra: [{ x: 66, z: -6, y: 2.4, intensity: 0.9, range: 4, color: [1, 0.95, 0.85] }] } },
    { id: 'infirmary', name: 'Infirmary', x0: 61, z0: 2, x1: 69, z1: 10, h: 3.2, floor: 'tile_white', wall: 'paint_white', ceiling: 'ceiling_tile', light: { ambient: [0.34, 0.35, 0.36], color: [0.95, 0.98, 1], intensity: 0.85, spacing: 3.5, range: 5, fixture: 'panel' } },
  ]);
  const doors = PIT.doors().concat([
    { id: 'pit_dorm', x: 13, z: -8, dir: 'z', w: 2.2, type: 'opening' },
    { id: 'dorm_door', x: 7, z: -8, dir: 'z', w: 1.4, type: 'single', label: 'Dormitory' },
    { id: 'wash_door', x: -5, z: -17, dir: 'x', w: 1.2, type: 'single', label: 'Washroom' },
    { id: 'pit_training', x: 24, z: -14, dir: 'x', w: 2.4, type: 'opening' },
    { id: 'training_door', x: 24, z: -22, dir: 'x', w: 2.2, type: 'double', label: 'Training Room' },
    { id: 'sim_door', x: 30.5, z: -14, dir: 'x', w: 1.4, type: 'single', lock: 'simroom', label: 'Simulation Room', lockMsg: 'Locked. "STAGE TWO" is stencilled on the door.' },
    { id: 'quarters_door', x: 38, z: -14, dir: 'x', w: 1.4, type: 'single', lock: 'members', label: 'Members\' Quarters', lockMsg: 'Members only. Initiates who want to see the inside of it can earn it.' },
    { id: 'dining_arch', x: 53, z: -14, dir: 'x', w: 3.2, type: 'opening' },
    { id: 'tattoo_door', x: 61, z: -6, dir: 'z', w: 1.5, type: 'glass', label: 'Tattoo Parlour' },
    { id: 'infirmary_door', x: 61, z: 6, dir: 'z', w: 1.5, type: 'single', label: 'Infirmary' },
  ]);

  const props = PIT.props();
  const add = (type, x, z, o) => props.push(Object.assign({ type, x, z }, o || {}));
  /* --- the Pit floor: somewhere to sit by the chasm, the noticeboard, stalls --- */
  add('bench', 24, 15.4, { id: 'pit_bench_w', len: 2.4, rotDeg: 0 });
  add('bench', 48, 15.4, { id: 'pit_bench_e', len: 2.4, rotDeg: 0 });
  add('noticeboard', 13.05, -11, { rotDeg: 90, w: 1.4, h: 1.0, id: 'pit_notice', title: 'Initiates', text: 'TRANSFER INITIATES\n\nTraining Room, 0800 sharp. Every day until you are told otherwise.\nMeals: 0700 · 1230 · 1900, Dining Hall.\nLights out 2300.\n\nThe railing is not a seat.\nThe chasm is not a dare.\n\nStage One ends with a ranking. The ranking ends with a cut.\n— M.R.' });
  add('crate', 58.5, 17, { size: 0.9, stack: true }); add('barrel', 57.2, 18.2, {});
  add('crate', 15.5, 17.5, { size: 0.9 });
  add('poster', 60.95, -12, { rotDeg: -90, kind: 'dauntless' });
  add('poster', 13.05, 12, { rotDeg: 90, kind: 'dauntless' });
  // fires to stand round, stalls along the walls, banners down from the paths
  for (const [x, z] of [[21, 9], [32, -7], [47, 5], [57.2, 18.2]]) add('fire_barrel', x, z);
  add('stall', 14.4, -2.5, { rotDeg: 90, kind: 'food', text: 'CAKE · BREAD · COFFEE', w: 3.4 });
  add('stall', 14.4, 11.2, { rotDeg: 90, kind: 'clothes', text: 'CLOTHES', w: 3.0 });
  add('stall', 59.6, 0.6, { rotDeg: -90, kind: 'gear', text: 'BOOTS · KNIVES · GEAR', w: 3.4 });
  for (const [x, z, r] of [[18, -13.9, 0], [44, -13.9, 0], [58, -13.9, 0], [13.1, 0, 90], [60.9, 12.5, -90]]) add('banner', x, z, { rotDeg: r, faction: 'dauntless', y: 9.6, h: 4.2 });
  // the drums (oil drums, upturned)
  for (const [x, z] of [[36, 9.4], [37.4, 9.9], [38.6, 9.2]]) add('barrel', x, z, { mat: 'metal_dark' });

  /* --- dormitory: bunks along both long walls, lockers by the door --- */
  const bunkX = [-7.5, -5, -2.5, 0, 2.5];
  // (the north row leaves an aisle to the washroom door, at x −5 in the north wall)
  const bunkXN = [-7.5, -2.75, -0.25, 2.25, 4.75];
  bunkXN.forEach((x, i) => add('bunk_bed', x, -15.9, { id: 'bunk_n' + i, rotDeg: 0, sheet: i % 2 ? 'fabric_grey' : 'carpet_dark' }));
  bunkX.forEach((x, i) => add('bunk_bed', x, -2.1, { id: 'bunk_s' + i, rotDeg: 180, sheet: i % 2 ? 'carpet_dark' : 'fabric_grey', mine: i === 4 }));
  add('sign', -5, -16.88, { text: 'WASHROOM', y: 2.45, w: 1.3, h: 0.26, bg: '#1d1d1d', color: '#d8c8a0' });
  add('lockers', 6.7, -14.5, { len: 2.4, rotDeg: -90 });
  add('lockers', 6.7, -4, { len: 2.4, rotDeg: -90 });
  add('table', -3, -9, { w: 2.4, d: 1.0, chairs: 4, id: 'dorm_table', top: 'wood' });
  add('trash_bin', 6.2, -10.5, {}); add('boxes', -8.3, -9.5, {}); add('rug', -3, -9, { w: 5, d: 3.2, mat: 'carpet_dark' });
  add('poster', -8.95, -6, { rotDeg: 90, kind: 'dauntless' });
  /* --- washroom --- */
  add('sinks', -5, -22.6, { n: 3 }); add('mirror', -5, -22.97, { y: 1.55, w: 2.4 }); add('stalls', -2.55, -19.5, { n: 2, rotDeg: -90 });

  /* --- training room --- */
  // the range: three lanes along the north wall, shooting east
  for (let i = 0; i < 3; i++) add('range_lane', 17.4, -38.9 + i * 1.55, { id: 'lane' + i, lane: i, len: 13.4, rotDeg: 90 });
  add('wall_block', 23.5, -34.6, { w: 17, d: 0.25, h: 1.2 });
  add('gun_rack', 14.08, -37, { rotDeg: 90 });
  add('stripe', 18.2, -37.4, { w: 0.15, d: 5.2, mat: 'hazard' });
  // the knife wall
  add('knife_board', 43.9, -38.4, { id: 'kb0', rotDeg: -90, y: 1.55, size: 1.1 });
  add('knife_board', 43.9, -36.2, { id: 'kb1', rotDeg: -90, y: 1.55, size: 1.1 });
  add('stripe', 37.6, -37.3, { w: 0.15, d: 4.6, mat: 'paint_white' });
  add('wall_block', 35.2, -34.6, { w: 4.6, d: 0.25, h: 1.2 });
  // the bags
  add('punching_bag', 17, -30.2, { id: 'bag0' }); add('punching_bag', 20, -30.2, { id: 'bag1' });
  add('punching_bag', 17, -26.4, { id: 'bag2' }); add('punching_bag', 20, -26.4, { id: 'bag3' });
  add('rug', 18.5, -28.3, { w: 6.4, d: 6.4, mat: 'mat_foam' });
  // the ring
  add('fight_ring', 32.5, -28.4, { size: 7 });
  // weights, benches for the ones waiting their turn
  add('weights', 41.2, -31.2, { id: 'weights0' });
  add('bench', 32.5, -23.2, { id: 'ring_bench', len: 4.8, rotDeg: 180, seatable: true });
  add('bench', 39.6, -26, { id: 'side_bench', len: 2.4, rotDeg: -90 });
  add('rank_board', 28.4, -22.12, { rotDeg: 180, w: 3.2, h: 2.0, y: 1.95 });
  add('extinguisher', 14.1, -24, { rotDeg: 90 });
  add('lockers', 43.6, -24.6, { len: 2.4, rotDeg: -90 });
  add('poster', 14.05, -32.5, { rotDeg: 90, kind: 'dauntless' });

  /* --- simulation room: the chair, the monitors (Stage Two) --- */
  add('test_chair', 30.5, -19.2, { id: 'fear_chair', rotDeg: 0 });
  add('console', 32.8, -19.8, { rotDeg: -90, id: 'fear_console' });

  /* --- members' quarters (only a corner of it: the rest is beyond) --- */
  add('crate', 39.2, -19.2, { size: 0.8 });

  /* --- dining hall --- */
  add('counter', 54, -30.6, { len: 9, rotDeg: 0, front: 'metal_painted', top: 'metal' });
  add('kitchenette', 46.4, -28.5, { len: 2.6, rotDeg: 90 });
  for (const [x, z, i] of [[50.5, -25.5, 0], [57.5, -25.5, 1], [50.5, -19.5, 2], [57.5, -19.5, 3]]) add('long_table', x, z, { id: 'dt' + i, len: 5.2, seed: i });
  add('banner', 61.9, -23, { rotDeg: -90, faction: 'dauntless', y: 4.4, h: 3.2 });
  // the members' tables, by the door
  add('long_table', 49.6, -16.5, { len: 4.4, seed: 7 }); add('long_table', 58.4, -16.5, { len: 4.4, seed: 8 });
  add('trash_bin', 47, -15, {});

  /* --- tattoo parlour --- */
  add('tattoo_chair', 66.2, -6, { id: 'tat', rotDeg: 90 });
  add('counter', 67.8, -3, { len: 2.2, rotDeg: 180, front: 'wood_panel' });
  for (const [z, k] of [[-9.95, 0], [-2.05, 1]]) add('poster', 65, z, { rotDeg: k ? 180 : 0, kind: 'dauntless' });
  add('mirror', 68.95, -7.5, { rotDeg: -90, y: 1.55, w: 1.0, h: 1.4 });
  add('sofa', 62.4, -8.6, { rotDeg: 90, id: 'tat_sofa' });

  /* --- infirmary --- */
  add('bed', 63, 8.9, { id: 'inf_bed0', rotDeg: 180 }); add('bed', 65.5, 8.9, { id: 'inf_bed1', rotDeg: 180 }); add('bed', 68, 8.9, { id: 'inf_bed2', rotDeg: 180 });
  add('curtain', 64.25, 8.5, { len: 2, rotDeg: 90 });
  add('med_cabinet', 68.7, 4, { rotDeg: -90 });
  add('desk', 66, 3, { rotDeg: 0, id: 'inf_desk' });

  /* ------------------------------ the Pit, dressed ------------------------------ */
  // spray paint on rock: rough letters, overspray, a drip or two
  function sprayTex(key, text, color, w, h, size) {
    return DV.Tex.custom('spray|' + key, w, h, (c, W, H, r) => {
      c.clearRect(0, 0, W, H);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold ' + (size || Math.floor(H * 0.62)) + 'px Impact, "Arial Black", sans-serif';
      // overspray: the same letters, soft and offset, a few times
      c.globalAlpha = 0.12; c.fillStyle = color;
      for (let k = 0; k < 6; k++) c.fillText(text, W / 2 + (r() - 0.5) * 6, H / 2 + (r() - 0.5) * 6);
      c.globalAlpha = 1; c.fillText(text, W / 2, H / 2);
      // drips running down from the letters
      const tw = c.measureText(text).width;
      for (let k = 0; k < Math.floor(tw / 18); k++) {
        const x = W / 2 - tw / 2 + r() * tw, y = H / 2 + (size || H * 0.62) * 0.3, len = 4 + r() * H * 0.35;
        c.fillRect(Math.floor(x), Math.floor(y), 2, Math.floor(len));
        c.beginPath(); c.arc(x + 1, y + len, 1.6, 0, Math.PI * 2); c.fill();
      }
      // knock some paint off the rock's bumps
      c.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < W * H * 0.004; k++) { c.globalAlpha = r() * 0.6; c.fillRect(Math.floor(r() * W), Math.floor(r() * H), 2, 2); }
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    });
  }
  function dressPit(ctx) {
    const decal = (tex, x, y, z, rotY, w, h, opts) => {
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true, color: (opts && opts.tint) || 0xd8d8d8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      mesh.position.set(x, y, z); mesh.rotation.y = rotY;
      ctx.add(mesh);
      return mesh;
    };
    // the north wall: the flame, eight metres high, and the name under it
    decal(DV.Tex.emblem('dauntless', '#e8502a', null, 256), 37, 12.2, -13.97, 0, 7.5, 7.5, { tint: 0xc8c8c8 });
    decal(sprayTex('dauntless', 'DAUNTLESS', '#e8e2d6', 1024, 160), 37, 7.35, -13.96, 0, 18, 2.8);
    // slogans between the paths on the side walls
    decal(sprayTex('nojump', 'NO ONE JUMPS ALONE', '#d8402a', 1024, 128), 13.03, 6.7, 2.5, Math.PI / 2, 11, 1.4);
    decal(sprayTex('fear', 'FEAR IS A CHOICE', '#e8e2d6', 1024, 128), 60.97, 6.7, 3.5, -Math.PI / 2, 10, 1.25);
    decal(sprayTex('habit', 'BRAVERY IS A HABIT', '#e8902a', 1024, 128), 60.97, 11.3, -4, -Math.PI / 2, 10, 1.25);
    decal(sprayTex('back', 'DON\'T LOOK BACK', '#d8402a', 1024, 128), 13.03, 11.3, 9, Math.PI / 2, 9, 1.2);
    // names and tallies down at eye level, where initiates sign the rock
    decal(sprayTex('tags', 'TESS · ROD · J.B. · 4EVR · MAYA', '#c8c0b0', 1024, 96, 52), 19.5, 2.2, -13.96, 0, 5.2, 0.5);
    decal(sprayTex('tally', '|||| |||| |||| ||', '#e8502a', 512, 96, 60), 46.5, 2.0, -13.96, 0, 2.4, 0.45);
    decal(sprayTex('jumped', 'JUMPED FIRST', '#e8e2d6', 512, 96, 54), 13.03, 2.6, -4.6, Math.PI / 2, 2.6, 0.5);
    // strings of bulbs from path to path across the Pit, sagging in the middle
    const N = 34, pos = [], col = [], lp = [];
    const warm = [[1, 0.82, 0.5], [1, 0.62, 0.3], [0.95, 0.35, 0.22], [1, 0.9, 0.7]];
    for (const [z, y] of [[-9, 10.2], [-2, 9.8], [5, 10.4], [12, 9.9]]) {
      for (let k = 0; k <= N; k++) {
        const t = k / N, x = 14.2 + (59.8 - 14.2) * t, yy = y - Math.sin(t * Math.PI) * 2.6;
        lp.push(x, yy, z);
        if (k < N) { const t2 = (k + 1) / N; lp.push(14.2 + (59.8 - 14.2) * t2, y - Math.sin(t2 * Math.PI) * 2.6, z); }
        if (k % 2 === 0) { pos.push(x, yy - 0.12, z); const c = warm[(k / 2) % warm.length]; col.push(c[0], c[1], c[2]); }
      }
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    ctx.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x141414, fog: true })));
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const bulbs = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.26, vertexColors: true, fog: true }));
    bulbs.frustumCulled = false;
    ctx.add(bulbs);
    const halo = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, map: DV.Tex.custom('fireglow', 64, 64, () => {}), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
    halo.frustumCulled = false;
    ctx.add(halo);
  }

  /* ------------------------------ the people about ------------------------------ */
  const SEEN_PIT = ['the_pit', 'pit_tunnel', 'dorm_corr', 'tr_corr', 'dining', 'tattoo', 'infirmary', 'net_room'];
  function crowdDef() {
    const ring = (cx, cz, r, n, acts, a0) => Array.from({ length: n }, (_, i) => {
      const a = (a0 || 0) + (i / n) * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      return { x, z, face: [cx, cz], act: acts[i % acts.length] };
    });
    // (the paths cut into the side walls: their walking surface, and the outer edge to sit on)
    const shelfX = { w: 14.25, e: 59.75 }, top = (y) => y + 0.2;
    const seats = (tx, tz, len, take) => {
      const n = Math.floor(len / 0.72), out = [];
      for (const side of [-1, 1]) for (let k = 0; k < n; k++) {
        if (!take(k, side)) continue;
        const x = tx - len / 2 + (len / n) * (k + 0.5);
        out.push({ x, z: tz + side * 0.78, rot: side < 0 ? 0 : Math.PI, act: ['sit', 'sit_touch', 'sit', 'sit_cheer', 'sit_fold'][(k + (side > 0 ? 2 : 0)) % 5], seatY: 0.45 });
      }
      return out;
    };
    return {
      faction: 'dauntless', title: 'Dauntless', seed: 31,
      lines: [
        'Initiate. You\'re standing in my light.',
        'First week? Don\'t eat the stew. Trust me.',
        'Jumped off the roof yourself, or did someone push?',
        'Nina\'s got an empty chair tonight, if you want ink.',
        'The railing\'s where you find out who you are. Or who your friends are.',
        'Keep your guard up. Everyone in here hits harder than they look.',
        'Rankings go up at five. Everyone pretends they don\'t care.',
        'Brave doesn\'t mean grim. Have a drink. Have some cake.',
        'You hear the river at night? You stop hearing it after a month.',
        'Transfer, huh? Don\'t worry. Nobody here cares where you came from. Much.',
      ],
      banter: ['Ha! No way.', 'Did you see him on the net?', 'Again! Again!', 'Five says she makes it.', 'Who\'s on the wall tonight?', 'Pass it here.', 'Look at the new ones. Babies.', 'Race you to the top path.', 'Hey! Over here!', 'That\'s what I said!', 'Louder!', 'He fell asleep on the train. On the ROOF.'],
      sets: [
        // the evening: everyone's out
        { id: 'pit_eve', when: [['17:30', '23:59'], ['00:00', '00:40']], rooms: SEEN_PIT, people: [
          ...ring(21, 9, 1.35, 4, ['talk', 'arms_crossed', 'talk', 'cheer'], 0.4),
          ...ring(32, -7, 1.35, 4, ['talk', 'lean', 'talk', 'arms_crossed'], 1.1),
          ...ring(47, 5, 1.4, 5, ['talk', 'cheer', 'talk', 'arms_crossed', 'talk'], 0.2),
          { x: 23.5, z: 19.45, rot: 0, act: 'sit', seatY: 1.12 }, { x: 30.5, z: 19.45, rot: 0.1, act: 'sit_cheer', seatY: 1.12 },
          { x: 41.5, z: 19.45, rot: -0.1, act: 'sit', seatY: 1.12 }, { x: 48.5, z: 19.45, rot: 0, act: 'sit_touch', seatY: 1.12 },
          { x: 25.6, z: 19.0, rot: 0.15, act: 'lean' }, { x: 36.2, z: 19.0, rot: -0.2, act: 'lean' }, { x: 53.6, z: 19.0, rot: 0, act: 'lean' },
          { x: 16.2, z: -2.2, rot: -Math.PI / 2, act: 'idle' }, { x: 16.4, z: -3.3, rot: -1.3, act: 'talk' },
          { x: 16.3, z: 11.4, rot: -Math.PI / 2, act: 'point' }, { x: 57.8, z: 0.4, rot: Math.PI / 2, act: 'arms_crossed' },
          { walk: [[17, -11], [57, -11], [57, 16], [17, 16]], speed: 1.3 },
          { walk: [[57, 16], [17, 16], [17, -11], [57, -11]], speed: 1.15 },
          { walk: [[22, 1], [50, 12], [55, -8], [30, -10]], speed: 1.4 },
          { y: top(4.5), walk: [[shelfX.w, -12], [shelfX.w, 17]], speed: 1.1 },
          { y: top(9), walk: [[shelfX.e, 17], [shelfX.e, -12]], speed: 1.2 },
          { y: top(13.5), walk: [[shelfX.e, -12], [shelfX.e, 9]], speed: 0.9 },
          { y: top(9) - 0.45, x: 15.3, z: 3, rot: Math.PI / 2, act: 'sit', seatY: 0.45 }, // legs over the edge
          { y: top(4.5) - 0.45, x: 58.7, z: 12, rot: -Math.PI / 2, act: 'sit_touch', seatY: 0.45 },
        ] },
        // the drums, after dinner
        { id: 'drums', when: [['19:45', '23:15']], rooms: SEEN_PIT, people: [
          { x: 36, z: 8.6, face: [36, 9.4], act: 'clap' }, { x: 37.4, z: 9.1, face: [37.4, 9.9], act: 'clap' }, { x: 38.6, z: 8.4, face: [38.6, 9.2], act: 'clap' },
          ...ring(37.3, 9.4, 2.9, 7, ['cheer', 'clap', 'cheer', 'arms_crossed', 'clap', 'cheer', 'wave'], 0.3),
        ] },
        // daytime: fewer, and busier
        { id: 'pit_day', when: [['06:30', '17:30']], rooms: SEEN_PIT, people: [
          { x: 16.2, z: -2.4, rot: -Math.PI / 2, act: 'idle' }, { x: 16.5, z: -1.4, rot: -1.9, act: 'talk' }, { x: 17.4, z: -3.1, rot: -1.1, act: 'talk' },
          { x: 26.5, z: 19.0, rot: 0, act: 'lean' }, { x: 47.6, z: 19.0, rot: 0.2, act: 'lean' }, { x: 38.8, z: 19.45, rot: 0, act: 'sit', seatY: 1.12 },
          ...ring(32, -7, 1.35, 3, ['talk', 'arms_crossed', 'talk'], 0.6),
          { x: 57.8, z: 0.2, rot: Math.PI / 2, act: 'point' }, { x: 57.6, z: 1.4, rot: 1.9, act: 'idle' }, { x: 16.3, z: 11.0, rot: -Math.PI / 2, act: 'idle' },
          { walk: [[17, -11], [57, -11], [57, 16], [17, 16]], speed: 1.5 },
          { walk: [[57, 16], [17, 16], [17, -11], [57, -11]], speed: 1.35 },
          { walk: [[24, -12], [24, 3], [53, -12]], speed: 1.6 },
          { walk: [[45, -12], [24, -12], [30, 14], [52, 10]], speed: 1.45 },
          { y: top(4.5), walk: [[shelfX.e, -12], [shelfX.e, 17]], speed: 1.2 },
          { y: top(9), walk: [[shelfX.w, 17], [shelfX.w, -12]], speed: 1.1 },
        ] },
        // the night watch
        { id: 'night', when: [['00:40', '06:30']], rooms: SEEN_PIT, people: [
          { walk: [[16, 18.4], [58, 18.4]], speed: 0.9 },
          { y: top(4.5), walk: [[shelfX.e, -12], [shelfX.e, 17]], speed: 0.8 },
        ] },
        // meals: the members' tables full, a queue at the counter
        { id: 'meals', when: [['06:55', '07:55'], ['12:25', '13:25'], ['18:55', '19:55']], rooms: ['dining'], people: [
          ...seats(49.6, -16.5, 4.4, (k, sd) => (k + (sd > 0 ? 1 : 0)) % 4 !== 3),
          ...seats(58.4, -16.5, 4.4, (k, sd) => (k + (sd > 0 ? 2 : 0)) % 4 !== 1),
          { x: 51.6, z: -29.4, rot: Math.PI, act: 'idle' }, { x: 52.6, z: -28.6, rot: Math.PI, act: 'arms_crossed' }, { x: 53.7, z: -29.0, rot: 2.9, act: 'talk' },
        ] },
        // members watching the initiates train
        { id: 'training', when: [['08:00', '17:00']], rooms: ['training', 'tr_corr'], people: [
          { x: 27.4, z: -32.2, face: [32.5, -28.4], act: 'arms_crossed' }, { x: 38.6, z: -32.6, face: [32.5, -28.4], act: 'cheer' },
          { x: 36.2, z: -23.3, face: [32.5, -28.4], act: 'arms_crossed' }, { x: 42.6, z: -27.6, face: [41.2, -31.2], act: 'talk' },
          { x: 42.4, z: -29.0, face: [41.2, -31.2], act: 'arms_crossed' },
        ] },
      ],
    };
  }

  DV.Zones.define('d_compound', {
    name: 'Dauntless Compound',
    region: 'Dauntless compound',
    noDiscover: false,
    relaxed: true, // nobody here tells you to walk
    underground: true,
    chasm: { z: 20 },
    bounds: { x0: -11, z0: -42, x1: 71, z1: 30 },
    buildingHeight: 18,
    roof: { deck: 'rock', parapet: 0, kit: false }, // (underground: the rock over the rooms, round the Pit's glass roof)
    facade: 'rock',
    fog: { color: 0x1a212c, near: 45, far: 170 },
    sky: { visible: false, skyline: false, top: 0x000000, horizon: 0x000000, ground: 0x000000 },
    charLight: { ambient: 0.5, hemi: 0.45, dir: 0.5, dirColor: 0xdfe8ff },
    rooms,
    doors,
    props,
    spawn: { x: 3, z: -4, rot: Math.PI },
    spots: {
      // comings and goings: the members' quarters
      arrive: { x: 38, z: -18, rot: Math.PI, act: 'idle' },
      leave: { x: 38, z: -18.5, rot: 0, act: 'idle' },
      // the instructor's marks
      mark_brief: { x: 24, z: -24.6, rot: Math.PI, act: 'arms_crossed' },
      mark_range: { x: 19.2, z: -34.2, rot: Math.PI, act: 'arms_crossed' },
      mark_knives: { x: 36.5, z: -35.2, rot: Math.PI / 2, act: 'arms_crossed' },
      mark_ring: { x: 36.6, z: -24.4, rot: -2.4, act: 'arms_crossed' },
      mark_bags: { x: 22.6, z: -28.3, rot: -Math.PI / 2, act: 'arms_crossed' },
      dana_watch: { x: 27.2, z: -23.4, rot: Math.PI, act: 'arms_crossed' },
      mark_rail: { x: 40, z: 18.9, rot: 0, act: 'lean' },
      mark_dining: { x: 60.5, z: -16, rot: -2.4, act: 'idle' },
      // the lineup (where initiates wait for instructions)
      line0: { x: 21, z: -26.2, rot: 0, act: 'idle' }, line1: { x: 22.2, z: -26.4, rot: 0, act: 'idle' }, line2: { x: 23.4, z: -26.2, rot: 0, act: 'idle' },
      line3: { x: 24.6, z: -26.4, rot: 0, act: 'idle' }, line4: { x: 25.8, z: -26.2, rot: 0, act: 'idle' }, line5: { x: 27, z: -26.4, rot: 0, act: 'idle' },
      line6: { x: 28.2, z: -26.2, rot: 0, act: 'idle' }, line7: { x: 29.4, z: -26.4, rot: 0, act: 'idle' },
      // around the ring
      ringside0: { x: 28.4, z: -24.6, rot: 2.6, act: 'arms_crossed' }, ringside1: { x: 30.2, z: -24.2, rot: Math.PI, act: 'arms_crossed' },
      ringside2: { x: 35, z: -24.2, rot: Math.PI, act: 'arms_crossed' }, ringside3: { x: 37.4, z: -26.3, rot: -2.2, act: 'arms_crossed' },
      ringside4: { x: 37.6, z: -30.4, rot: -1.6, act: 'arms_crossed' }, ringside5: { x: 27.6, z: -29.6, rot: 1.6, act: 'arms_crossed' },
      ring_a: { x: 32.5, z: -26.4, rot: Math.PI, act: 'idle' }, ring_b: { x: 32.5, z: -30.4, rot: 0, act: 'idle' },
      knife0: { x: 37.9, z: -38.4, rot: Math.PI / 2, act: 'idle' }, knife1: { x: 37.9, z: -36.2, rot: Math.PI / 2, act: 'idle' },
      // the Pit
      rail0: { x: 19, z: 18.9, rot: 0, act: 'lean' }, rail1: { x: 27, z: 18.9, rot: 0, act: 'lean' }, rail2: { x: 33, z: 18.9, rot: 0, act: 'lean' },
      rail3: { x: 44, z: 18.9, rot: 0, act: 'lean' }, rail4: { x: 51, z: 18.9, rot: 0.2, act: 'lean' }, rail5: { x: 56, z: 18.9, rot: 0, act: 'lean' },
      pit_c0: { x: 30, z: 4, rot: 0.4, act: 'idle' }, pit_c1: { x: 31.2, z: 4.9, rot: -2.6, act: 'idle' },
      pit_c2: { x: 44, z: 0, rot: -0.6, act: 'arms_crossed' }, pit_c3: { x: 43, z: 1.1, rot: 2.4, act: 'idle' },
      pit_c4: { x: 22, z: -6, rot: 1.2, act: 'idle' }, pit_c5: { x: 50, z: -8, rot: -0.5, act: 'idle' },
      dorm_mid: { x: -3, z: -6.6, rot: 0, act: 'idle' }, dorm_door_in: { x: 5.6, z: -8, rot: -Math.PI / 2, act: 'idle' },
      inf_visit: { x: 64.4, z: 6.6, rot: Math.PI, act: 'arms_crossed' },
      ink_wait: { x: 63.4, z: -4.2, rot: 2.2, act: 'pace' },
      zip_meet: { x: 24.9, z: -12.2, rot: Math.PI, act: 'idle' },
      board_a: { x: 27.6, z: -23.0, rot: Math.PI, act: 'arms_crossed' }, board_b: { x: 29.4, z: -23.0, rot: Math.PI, act: 'arms_crossed' },
      knife_stand: { x: 43.3, z: -38.4, rot: -Math.PI / 2, act: 'idle' },
      sim_mark: { x: 32.4, z: -15.9, rot: -2.4, act: 'arms_crossed' },
      // where the class hangs about in the evenings
      hang0: { x: 55.8, z: 17.0, rot: 0.8, act: 'idle' }, hang1: { x: 58.6, z: 16.8, rot: -0.8, act: 'arms_crossed' },
      hang2: { x: 51.4, z: -11.6, rot: 0.4, act: 'idle' }, hang3: { x: 54.8, z: -11.2, rot: -2.8, act: 'arms_crossed' },
      hang4: { x: 35.8, z: -2.2, rot: 1.0, act: 'idle' }, hang5: { x: 37.4, z: -1.2, rot: -2.1, act: 'idle' },
      hang6: { x: 16.6, z: -2.0, rot: 1.5, act: 'arms_crossed' }, hang7: { x: 17.6, z: 9.0, rot: 1.2, act: 'idle' },
      // staff
      cook: { x: 54, z: -31.5, rot: 0, act: 'type' }, cook2: { x: 51, z: -31.5, rot: 0, act: 'idle' },
      doc: { x: 66, z: 2.6, rot: 0, act: 'type' },
      // the night watch
      chasm_watch: { x: 37, z: 18.6, rot: 0, act: 'guard' },
      sim_tech: { x: 33.4, z: -19.8, rot: -Math.PI / 2, act: 'type' },
    },
    triggers: [
      { id: 't_training', room: 'training' },
      { id: 't_dining', room: 'dining' },
      { id: 't_tattoo', room: 'tattoo' },
      { id: 't_infirmary', room: 'infirmary' },
      { id: 't_dorm', room: 'dorm' },
      { id: 't_chasm', rect: { x0: 14, z0: 14, x1: 60, z1: 20 } },
      { id: 't_pit', room: 'the_pit' },
    ],
    build(ctx) {
      PIT.build(ctx);
      const zone = ctx.zone;
      // the bags swing when they're hit (and settle back slowly)
      ctx.update((dt) => {
        for (const b of zone.bags || []) {
          b.vx += (-b.ax * 9.81 / b.len - b.vx * 0.9) * dt;
          b.vz += (-b.az * 9.81 / b.len - b.vz * 0.9) * dt;
          b.ax += b.vx * dt; b.az += b.vz * dt;
          b.g.rotation.x = b.az; b.g.rotation.z = -b.ax;
        }
      });
      // (the fire barrel by the railing where the class hangs out in the evening is a prop)
      dressPit(ctx);
      // the people who make the place busy (DV.Extras), and their drums in the evening
      const crowd = DV.Extras.attach(zone, crowdDef());
      let beat = 0, step = 0;
      const RHYTHM = [2, 0, 1, 0, 2, 2, 1, 0, 2, 0, 1, 1, 2, 0, 1, 0];
      ctx.update((dt) => {
        crowd.update(dt);
        const drums = crowd.sets.find((q) => q.id === 'drums');
        const P = DV.Player, d = Math.hypot(P.x - 37.3, P.z - 9.5);
        if (!drums || !drums.on || d > 34 || !DV.Audio.ready) return;
        beat -= dt;
        if (beat > 0) return;
        beat += 0.21;
        const h = RHYTHM[step++ % RHYTHM.length];
        if (h) DV.Audio.play('drum', { x: 37.3, z: 9.5, range: 40, low: h === 2, volume: 0.9 });
      });
      zone.fireBarrel = { x: 57.2, z: 18.2 };
      // the knife line and the ring are stations too
      ctx.interact({ id: 'knife_line', kind: 'action', action: 'knife_line', x: 37.6, y: 1.0, z: -37.3, radius: 1.8, label: 'Step up to the line', name: 'Knife Wall' });
      ctx.interact({ id: 'fear_chair_use', kind: 'action', action: 'fear_chair', x: 30.5, y: 1.0, z: -18.3, radius: 1.6, label: 'Sit in the chair', name: 'Simulation Chair', cond: () => DV.Quests.obj('stage_one', 'stage2') === 'active' });
      ctx.interact({ id: 'ring_step', kind: 'action', action: 'ring', x: 32.5, y: 1.0, z: -25.2, radius: 2.0, label: 'Step into the ring', name: 'The Ring', cond: () => !!(DV.Initiation && (DV.Initiation.canStart('spar') || DV.Initiation.canStart('fight'))) });
    },
  });
})();
