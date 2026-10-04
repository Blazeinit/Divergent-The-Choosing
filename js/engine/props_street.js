/* ==========================================================================
   DIVERGENT — street furniture
   What a city street has on it: a proper bus shelter (roof, glass, a lit
   advertising panel, a bench, the timetable), the stop's pole and sign,
   street-name signs on the corners, hydrants, newspaper boxes, the traffic
   lights that haven't worked in years, kerbs and road paint. Parked cars
   and buses use DV.Vehicles (real wheels, windscreens, lights).
   +Z is each prop's front (for the shelter: the road side).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const def = DV.Props.define;

  const seatInteract = (ctx, spot, name) => {
    ctx.interact({ id: 'seat:' + spot.id, kind: 'seat', spot, x: spot.x, y: 0.6, z: spot.z, radius: 1.2, label: 'Sit', name: name || 'Seat' });
  };
  const signMat = (key, text, o) => DV.Mat.fromTexture(key, DV.Tex.sign(text, o), { emit: !!(o && o.emit) });

  /* ---------------- the bus shelter: open to the road (+z), its back to the pavement ---------------- */
  def('bus_shelter', (ctx, p, B) => {
    const steel = ctx.M('metal_dark'), glass = ctx.M('white:glass'), roof = ctx.M('metal_painted');
    const W = 4.2, D = 1.6, H = 2.55;
    // posts
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2 - 0.1], [W / 2, D / 2 - 0.1]]) B.box(steel, x, 0, z, 0.08, H, 0.08);
    // a roof that overhangs the kerb, with a fascia carrying the route
    B.box(roof, 0, H, 0.12, W + 0.4, 0.09, D + 0.5);
    B.box(steel, 0, H - 0.06, D / 2 + 0.36, W + 0.4, 0.2, 0.05);
    B.panel(signMat('shelter_fascia', 'ROUTE 5 · TESTING DISTRICT · THE HUB', { w: 512, h: 40, bg: '#1e3448', color: '#e8e4d8', size: 18 }), 0, H - 0.06, D / 2 + 0.39, W - 0.2, 0.17);
    // glass: the back and the upwind side, in framed panes
    for (let k = 0; k < 3; k++) {
      const x0 = -W / 2 + (W / 3) * k, x1 = x0 + W / 3;
      B.quad(glass, [x0, 0.22, -D / 2], [x1, 0.22, -D / 2], [x1, 2.3, -D / 2], [x0, 2.3, -D / 2], [0, 0], [1, 0], [1, 1], [0, 1]);
      B.box(steel, x1, 0.2, -D / 2, 0.05, 2.12, 0.05);
    }
    B.box(steel, 0, 2.3, -D / 2, W, 0.05, 0.06);
    B.box(steel, 0, 0.18, -D / 2, W, 0.05, 0.06);
    B.quad(glass, [-W / 2, 0.22, D / 2 - 0.15], [-W / 2, 0.22, -D / 2], [-W / 2, 2.3, -D / 2], [-W / 2, 2.3, D / 2 - 0.15], [0, 0], [1, 0], [1, 1], [0, 1]);
    // the lit panel at the other end: a poster in a lightbox, both faces
    B.box(steel, W / 2, 0.15, -0.05, 0.16, 2.2, 1.35);
    const ad = DV.Mat.fromTexture('lightbox|' + (p.ad || 'factions'), DV.Tex.poster(p.ad || 'factions'), { emit: true });
    B.push(W / 2 + 0.085, 0, -0.05, Math.PI / 2); B.panel(ad, 0, 1.25, 0, 1.15, 1.75); B.pop();
    B.push(W / 2 - 0.085, 0, -0.05, -Math.PI / 2); B.panel(ad, 0, 1.25, 0, 1.15, 1.75); B.pop();
    // the timetable and a route map on the inside of the glass side
    B.push(-W / 2 + 0.04, 0, -0.1, Math.PI / 2);
    B.panel(signMat('shelter_times', 'ROUTE 5\nEVERY 20 MIN\nLAST BUS 19:40', { w: 128, h: 160, bg: '#e8e4d8', color: '#1a1a1a', size: 14 }), 0, 1.45, 0, 0.5, 0.62);
    B.pop();
    // the bench
    const wood = ctx.M('wood');
    B.box(wood, 0, 0.44, -D / 2 + 0.32, W - 1.4, 0.05, 0.4);
    B.box(wood, 0, 0.62, -D / 2 + 0.1, W - 1.4, 0.3, 0.04);
    for (const x of [-(W - 1.6) / 2, 0, (W - 1.6) / 2]) B.box(steel, x, 0, -D / 2 + 0.3, 0.05, 0.44, 0.34);
    ctx.collide(-W / 2 - 0.05, -D / 2 - 0.05, W / 2 + 0.05, -D / 2 + 0.06, { y1: H });
    ctx.collide(-W / 2 - 0.05, -D / 2 - 0.05, -W / 2 + 0.06, D / 2 - 0.1, { y1: H });
    ctx.collide(W / 2 - 0.1, -0.75, W / 2 + 0.1, 0.65, { y1: H });
    ctx.collide(-(W - 1.4) / 2, -D / 2, (W - 1.4) / 2, -D / 2 + 0.52, { y1: 0.5 });
    for (let k = 0; k < 3; k++) {
      const s = ctx.spot((p.id || 'shelter') + '_s' + k, -0.95 + k * 0.95, -D / 2 + 0.32, 0, 'sit', { seatY: 0.48 });
      seatInteract(ctx, s, 'Bench');
    }
  });

  // the stop itself: a pole, a round BUS disc, the route plate
  def('bus_stop_sign', (ctx, p, B) => {
    const steel = ctx.M('metal_dark');
    B.cyl(steel, 0, 0, 0, 0.05, 0.05, 2.9, 6);
    const disc = DV.Mat.fromTexture('busdisc', DV.Tex.custom('busdisc', 64, 64, (g) => {
      g.fillStyle = '#1e3448'; g.beginPath(); g.arc(32, 32, 31, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e8e4d8'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 27, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#e8e4d8'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BUS', 32, 33);
    }), { alphaTest: 0.5, doubleSide: true });
    B.panel(disc, 0, 2.62, 0.04, 0.55, 0.55);
    B.push(0, 0, 0, Math.PI); B.panel(disc, 0, 2.62, 0.04, 0.55, 0.55); B.pop();
    B.panel(signMat('busplate', '5  TESTING DIST.', { w: 128, h: 32, bg: '#e8e4d8', color: '#1e3448', size: 13 }), 0, 2.15, 0.04, 0.5, 0.13);
    ctx.collide(-0.08, -0.08, 0.08, 0.08, { y1: 2.9, camera: false });
  });

  // a two-blade street sign on a post (the street you're on, and the one crossing it)
  def('street_sign', (ctx, p, B) => {
    const steel = ctx.M('metal_dark');
    B.cyl(steel, 0, 0, 0, 0.045, 0.05, 3.2, 6);
    const a = signMat('st|' + p.a, p.a, { w: 192, h: 32, bg: '#2a5a3a', color: '#f0f0e8', size: 15 });
    B.panel(a, 0.55, 2.95, 0.025, 1.1, 0.19);
    B.push(0, 0, 0, Math.PI); B.panel(a, -0.55, 2.95, 0.025, 1.1, 0.19); B.pop();
    if (p.b) {
      const b = signMat('st|' + p.b, p.b, { w: 192, h: 32, bg: '#2a5a3a', color: '#f0f0e8', size: 15 });
      B.push(0, 0, 0, Math.PI / 2); B.panel(b, 0.55, 2.72, 0.025, 1.1, 0.19); B.pop();
      B.push(0, 0, 0, -Math.PI / 2); B.panel(b, -0.55, 2.72, 0.025, 1.1, 0.19); B.pop();
    }
    ctx.collide(-0.07, -0.07, 0.07, 0.07, { y1: 3.2, camera: false });
  });

  def('hydrant', (ctx, p, B) => {
    const red = ctx.M('plastic_orange');
    B.cyl(red, 0, 0, 0, 0.16, 0.16, 0.62, 8);
    B.cyl(red, 0, 0.62, 0, 0.12, 0.05, 0.14, 8);
    B.box(red, 0, 0.42, 0, 0.42, 0.1, 0.1);
    B.box(ctx.M('metal_dark'), 0, 0, 0, 0.36, 0.06, 0.36);
    ctx.collide(-0.18, -0.18, 0.18, 0.18, { y1: 0.75, camera: false });
  });

  // newspaper boxes: the Candor daily, free
  def('news_box', (ctx, p, B) => {
    const n = p.n || 2;
    for (let k = 0; k < n; k++) {
      const x = (k - (n - 1) / 2) * 0.55;
      const m = ctx.M(k % 2 ? 'metal_painted' : 'plastic');
      B.box(m, x, 0.3, 0, 0.5, 0.75, 0.45);
      B.box(ctx.M('metal_dark'), x, 0, 0, 0.42, 0.3, 0.38);
      B.panel(signMat('news|' + k, k % 2 ? 'THE TRUTH\nCANDOR DAILY' : 'FACTION\nBULLETIN', { w: 96, h: 64, bg: k % 2 ? '#111111' : '#e0dcd0', color: k % 2 ? '#f0f0f0' : '#202020', size: 12 }), x, 0.78, 0.23, 0.4, 0.25);
    }
    ctx.collide(-n * 0.28, -0.24, n * 0.28, 0.24, { y1: 1.05, camera: false });
  });

  // a traffic signal on a corner: the lamps have been dark for years
  def('dead_signal', (ctx, p, B) => {
    const steel = ctx.M('metal_dark');
    B.cyl(steel, 0, 0, 0, 0.07, 0.08, 4.2, 6);
    B.box(steel, (p.arm || 2.4) / 2, 4.1, 0, p.arm || 2.4, 0.08, 0.08);
    for (const x of [0.25, p.arm || 2.4]) {
      B.box(ctx.M('black'), x, 3.15, 0.05, 0.32, 0.92, 0.26);
      for (let k = 0; k < 3; k++) B.cyl(ctx.M('glass_dark'), x, 3.32 + k * 0.28 - 0.28, 0.19, 0.09, 0.09, 0.02, 8);
    }
    ctx.collide(-0.1, -0.1, 0.1, 0.1, { y1: 4.2, camera: false });
  });

  def('manhole', (ctx, p, B) => {
    B.cyl(ctx.M('metal_dark'), 0, 0.006, 0, 0.42, 0.42, 0.012, 10);
  });

  // a kerb: the edge of the pavement (a low lip; you step over it)
  def('kerb', (ctx, p, B) => {
    const len = p.len || 10;
    B.box(ctx.M('concrete'), 0, 0, 0, len, 0.07, 0.22);
    B.flat(ctx.M('pavement'), -len / 2, -(p.depth || 2), len / 2, -0.11, 0.012);
  });

  // road paint: a zebra crossing, a dashed centre line, a bus bay
  def('road_paint', (ctx, p, B) => {
    const paint = ctx.M('white');
    const y = 0.01;
    if (p.kind === 'zebra') {
      const W = p.w || 4, D = p.d || 6;
      for (let x = -W / 2 + 0.25; x < W / 2; x += 0.75) B.flat(paint, x, -D / 2, x + 0.42, D / 2, y);
    } else if (p.kind === 'dashes') {
      const len = p.len || 40;
      for (let x = -len / 2; x < len / 2; x += 4) B.flat(paint, x, -0.06, x + 2.2, 0.06, y);
    } else if (p.kind === 'line') {
      const len = p.len || 40;
      B.flat(paint, -len / 2, -0.06, len / 2, 0.06, y);
    } else if (p.kind === 'busbay') {
      const len = p.len || 14;
      for (let x = -len / 2; x < len / 2; x += 1.2) B.flat(ctx.M('plastic_orange'), x, -0.07, x + 0.6, 0.07, y);
      // BUS painted inside the bay (local -z, toward the kerb), reading from the pavement
      const t = DV.Mat.fromTexture('busbay', DV.Tex.custom('busbay', 128, 48, (g) => {
        g.clearRect(0, 0, 128, 48); g.fillStyle = '#d8b040'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BUS', 64, 26);
      }), { alphaTest: 0.4 });
      B.quad(t, [1.3, y + 0.002, -1.75], [-1.3, y + 0.002, -1.75], [-1.3, y + 0.002, -0.75], [1.3, y + 0.002, -0.75], [0, 0], [1, 0], [1, 1], [0, 1]);
    }
  });

  /* ---------------- parked vehicles: the real models, standing where the prop is ---------------- */
  const parked = (kind) => (ctx, p) => {
    const v = DV.Vehicles.build(p.kind || kind, { seed: p.seed || Math.round(p.x * 7 + p.z * 13), color: p.color, wreck: !!p.wreck, stripe: p.stripe, load: p.load });
    v.root.position.set(p.x, 0, p.z);
    v.root.rotation.y = p.rot || 0;
    if (p.wreck) { v.root.rotation.z = 0.035; v.root.position.y = -0.04; }
    const L = ctx.light(p.x, p.z);
    const m = v.mesh.material = v.mesh.material.clone();
    m.color.setRGB(Math.min(1.2, Math.max(0.35, L[0] * 0.95)), Math.min(1.2, Math.max(0.35, L[1] * 0.95)), Math.min(1.2, Math.max(0.35, L[2] * 0.95)));
    ctx.add(v.root);
    ctx.collide(-v.width / 2, -v.length / 2, v.width / 2, v.length / 2, { y1: v.height, tag: 'vehicle' });
  };
  // a parked car: a saloon or a hatchback (p.kind picks one); zone data written for the old
  // box cars says mat: 'metal_painted' for a blue-grey one
  def('car', (ctx, p, B) => {
    const seed = p.seed || Math.round(p.x * 7 + p.z * 13);
    const color = p.color || (p.mat === 'metal_painted' ? 0x5a6470 : undefined);
    parked(p.kind || (seed % 3 === 0 ? 'hatch' : 'sedan'))(ctx, Object.assign({}, p, { seed, color }), B);
  });
  def('bus', (ctx, p, B) => parked('bus')(ctx, p, B));
  def('vehicle', (ctx, p, B) => parked(p.kind || 'sedan')(ctx, p, B));
})();
