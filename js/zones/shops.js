/* ==========================================================================
   DIVERGENT — Build 7: inside the shops
   Each shop is its own small zone, built the first time you walk in (and
   only then: nothing of it exists while you're out in the street). The same
   bones every time, in the shop's own coordinates: the street door in the
   middle of the front wall (z = 0), its display windows either side with the
   street's daylight through the glass, the shop floor, the counter across
   the back with the till on it and the keeper behind it, and a door through
   to the back room (a storeroom, a press room, a kitchen, a workshop, an
   exam room), which has the bolted door out to the alley the keeper comes
   and goes by. Then each one dressed the way its people keep a shop: the
   depot's bare tins, the printer's racks and her press, the bookseller's
   shelves to the ceiling, the flash on the tattooist's wall, Amity's bins,
   the repairman's clutter, the diner's stools and booths, the clinic's
   cabinets and its waiting chairs.

   Props here (built like js/engine/props.js): goods_shelf (shelving, with
   tins, jars, packets, books, papers, bottles or gear on it), produce_bin,
   till, shop_window, shop_door, news_rack, print_press, glass_case, stool,
   booth, flash_wall, sacks, workbench.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const def = DV.Props.define;

  /* ------------------------------ the props ------------------------------ */
  // colours for the goods (vertex tints on a plain white or paper surface: one material, many labels)
  const LABELS = {
    tins: [[0.62, 0.6, 0.55], [0.7, 0.66, 0.5], [0.55, 0.56, 0.58], [0.66, 0.62, 0.58]],
    jars: [[0.9, 0.62, 0.2], [0.7, 0.2, 0.18], [0.5, 0.62, 0.3], [0.86, 0.78, 0.5]],
    packets: [[0.78, 0.76, 0.7], [0.6, 0.58, 0.52], [0.7, 0.68, 0.64], [0.52, 0.5, 0.46]],
    books: [[0.18, 0.3, 0.55], [0.5, 0.16, 0.14], [0.2, 0.36, 0.26], [0.62, 0.56, 0.42], [0.16, 0.16, 0.18], [0.72, 0.7, 0.62], [0.36, 0.24, 0.16]],
    papers: [[0.9, 0.89, 0.84], [0.84, 0.83, 0.78], [0.94, 0.92, 0.86]],
    bottles: [[0.85, 0.88, 0.92], [0.5, 0.3, 0.2], [0.82, 0.3, 0.2], [0.94, 0.94, 0.9], [0.3, 0.42, 0.7]],
    gear: [[0.14, 0.14, 0.15], [0.22, 0.2, 0.18], [0.5, 0.12, 0.1], [0.3, 0.3, 0.32]],
    junk: [[0.42, 0.3, 0.2], [0.5, 0.5, 0.48], [0.3, 0.32, 0.26], [0.6, 0.5, 0.3], [0.2, 0.2, 0.22]],
  };
  // shelving (len along x, front +z): uprights, boards, and the goods on every board but the top
  def('goods_shelf', (ctx, p, B) => {
    const len = p.len || 2, h = p.h || 2, d = p.d || 0.45, levels = p.levels || 5;
    const frame = ctx.M(p.frame || 'metal_painted'), board = ctx.M(p.board || p.frame || 'metal_painted');
    const kind = p.goods || 'tins', cols = LABELS[kind] || LABELS.tins, r = U.rng(p.id || 'gs' + p.x + ',' + p.z);
    const white = ctx.M('white'), paper = ctx.M('paper');
    for (const x of [-len / 2 + 0.03, len / 2 - 0.03]) for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) B.box(frame, x, 0, z, 0.05, h, 0.05);
    if (p.back !== false) B.box(board, 0, 0, -d / 2 + 0.01, len, h, 0.02);
    for (let k = 0; k < levels; k++) {
      const y = 0.08 + (k * (h - 0.16)) / (levels - 1);
      B.box(board, 0, y, 0, len, 0.03, d);
      if (k === levels - 1 || p.empty) continue;
      const gap = (h - 0.16) / (levels - 1) - 0.06;
      let x = -len / 2 + 0.08;
      while (x < len / 2 - 0.12) {
        const c = cols[Math.floor(r() * cols.length)];
        if (r() < 0.12) { x += 0.15 + r() * 0.2; continue; } // (sold out)
        if (kind === 'tins' || kind === 'jars') {
          const rr = kind === 'jars' ? 0.055 : 0.045, n = 1 + Math.floor(r() * 2.2), ht = kind === 'jars' ? 0.13 : 0.11;
          for (let j = 0; j < n; j++) for (const zz of [-0.1, 0.07]) B.cyl(kind === 'jars' ? white : ctx.M('metal'), x + rr, y + 0.03 + j * ht, zz, rr, rr, ht - 0.005, 6, { tint: c });
          x += rr * 2 + 0.02;
        } else if (kind === 'books') {
          const bw = 0.03 + r() * 0.04, bh = Math.min(gap, 0.2 + r() * 0.12);
          B.box(white, x + bw / 2, y + 0.03, 0, bw, bh, d * 0.75, { tint: c });
          x += bw + 0.004;
        } else if (kind === 'papers') {
          const n = 2 + Math.floor(r() * 5);
          B.box(paper, x + 0.16, y + 0.03, 0, 0.3, n * 0.02, d * 0.7, { tint: c });
          x += 0.36;
        } else if (kind === 'bottles') {
          const rr = 0.03 + r() * 0.015, ht = 0.12 + r() * 0.1;
          B.cyl(white, x + rr, y + 0.03, 0, rr * 0.5, rr, ht, 5, { tint: c });
          x += rr * 2 + 0.03;
        } else {
          const bw = 0.16 + r() * 0.26, bh = Math.min(gap, 0.1 + r() * 0.2);
          B.box(kind === 'packets' ? paper : white, x + bw / 2, y + 0.03, (r() - 0.5) * 0.06, bw, bh, d * 0.7, { tint: c });
          x += bw + 0.03;
        }
      }
    }
    ctx.collide(-len / 2, -d / 2, len / 2, d / 2, { y1: h });
  });

  // a slatted crate tipped toward you, heaped with fruit (or roots, or greens)
  def('produce_bin', (ctx, p, B) => {
    const w = p.w || 1.2, d = p.d || 0.8, wood = ctx.M('wood_light'), white = ctx.M('white'), r = U.rng('pb' + p.x + ',' + p.z);
    B.box(ctx.M('wood'), 0, 0, 0, w, 0.55, d);
    B.box(wood, 0, 0.55, -d / 2 + 0.03, w, 0.28, 0.05);
    B.box(wood, 0, 0.55, d / 2 - 0.03, w, 0.1, 0.05);
    const fruit = p.fruit || [[0.72, 0.14, 0.1]];
    for (let k = 0; k < (p.n || 26); k++) {
      const c = fruit[k % fruit.length], fx = (r() - 0.5) * (w - 0.16), fz = (r() - 0.5) * (d - 0.16), rr = p.size || 0.05;
      B.cyl(white, fx, 0.55 + (0.5 - fz / d) * 0.12 + r() * 0.04, fz, rr * 0.7, rr, rr * 1.6, 5, { tint: [c[0] * (0.85 + r() * 0.3), c[1] * (0.85 + r() * 0.3), c[2] * (0.85 + r() * 0.3)] });
    }
    if (p.label) {
      const t = DV.Tex.sign(p.label, { w: 128, h: 48, bg: '#2a2016', color: '#e8dcb8', size: 22, border: false });
      B.panel(DV.Mat.fromTexture('binlabel|' + p.label, t, {}), 0, 0.42, d / 2 + 0.005, 0.5, 0.18);
    }
    ctx.collide(-w / 2, -d / 2, w / 2, d / 2, { y1: 0.9 });
  });

  // the till: a cash register on the counter (its little green figures lit), a ledger beside it
  def('till', (ctx, p, B) => {
    const y = p.y || 1.09, m = ctx.M('metal_dark');
    B.box(m, 0, y, 0, 0.42, 0.12, 0.38);
    B.pushEuler(0, y + 0.12, 0.02, -0.5, 0, 0); B.box(ctx.M('metal'), 0, 0, 0, 0.4, 0.14, 0.24); B.pop();
    B.box(m, 0, y + 0.18, -0.13, 0.3, 0.14, 0.1);
    B.panel(ctx.M('crt_green:emit'), 0, y + 0.26, -0.079, 0.2, 0.06);
    B.box(ctx.M('paper'), 0.42, y, 0.02, 0.28, 0.03, 0.36);
  });

  // a display window, from the inside: the street through the glass, as bright as the day outside
  // (its material is the shop's own and turns with the hour: see js/game/shops.js)
  def('shop_window', (ctx, p, B) => {
    const w = p.w || 2, h = p.h || 1.7, y0 = p.y0 || 0.75, m = ctx.M('wood');
    B.panel(DV.Shops.windowMat(p.shop), 0, y0 + h / 2, 0.02, w, h);
    B.box(m, 0, y0 - 0.12, 0.08, w + 0.2, 0.12, 0.3); // the sill (and the display shelf on it)
    B.box(m, 0, y0 + h, 0.04, w + 0.2, 0.08, 0.06);
    for (const x of [-w / 2 - 0.06, w / 2 + 0.06]) B.box(m, x, y0 - 0.06, 0.04, 0.08, h + 0.14, 0.06);
    B.box(m, 0, y0, 0.04, 0.04, h, 0.04); // the mullion
    if (p.display) for (let k = 0; k < 5; k++) B.box(ctx.M('white'), -w / 2 + 0.25 + k * (w - 0.5) / 4, y0, 0.12, 0.16, 0.12 + (k % 3) * 0.06, 0.14, { tint: LABELS[p.display][k % LABELS[p.display].length] });
    ctx.collide(-w / 2 - 0.1, 0, w / 2 + 0.1, 0.24, { y1: y0 });
  });

  // the street door, from the inside: shut, a glass panel, the bell on its spring, "PULL"
  def('shop_door', (ctx, p, B) => {
    const w = 1.1, h = 2.25, wood = ctx.M(p.mat || 'wood');
    B.box(ctx.M('metal_dark'), 0, h, 0.04, w + 0.24, 0.12, 0.08);
    for (const x of [-w / 2 - 0.06, w / 2 + 0.06]) B.box(ctx.M('metal_dark'), x, 0, 0.04, 0.12, h + 0.12, 0.08);
    B.box(wood, 0, 0, 0.03, w, h, 0.05);
    B.panel(DV.Shops.windowMat(p.shop), 0, 1.45, 0.06, w - 0.3, 0.9);
    B.box(ctx.M('metal'), w / 2 - 0.14, 1.0, 0.08, 0.04, 0.24, 0.06);
    B.cyl(ctx.M('metal'), 0.2, h + 0.08, 0.14, 0.05, 0.06, 0.07, 6); // the bell
    const t = DV.Tex.sign('PULL', { w: 64, h: 24, bg: '#d8d0b8', color: '#202020', size: 14, border: false });
    B.panel(DV.Mat.fromTexture('pullsign', t, {}), w / 2 - 0.14, 1.32, 0.06, 0.16, 0.06);
    ctx.collide(-w / 2 - 0.1, 0, w / 2 + 0.1, 0.12, { y1: h });
  });

  // a newspaper rack: three sloping tiers of today's papers
  def('news_rack', (ctx, p, B) => {
    const len = p.len || 2, m = ctx.M('metal_dark'), paper = ctx.M('paper');
    for (const x of [-len / 2 + 0.03, len / 2 - 0.03]) B.box(m, x, 0, 0, 0.05, 1.4, 0.5);
    for (let k = 0; k < 3; k++) {
      const y = 0.45 + k * 0.36, z = 0.12 - k * 0.12;
      B.pushEuler(0, y, z, -0.6, 0, 0);
      B.box(m, 0, 0, 0, len, 0.02, 0.32);
      for (let j = 0; j < Math.floor(len / 0.38); j++) B.box(paper, -len / 2 + 0.22 + j * 0.38, 0.02, 0, 0.32, 0.03, 0.28, { tint: LABELS.papers[(j + k) % 3] });
      B.pop();
    }
    ctx.collide(-len / 2, -0.25, len / 2, 0.3, { y1: 1.4 });
  });

  // the press: a flatbed with its iron frame, the rollers, the feed board, a stack of sheets waiting
  def('print_press', (ctx, p, B) => {
    const m = ctx.M('metal_dark'), iron = ctx.M('metal');
    B.box(m, 0, 0, 0, 2.2, 0.85, 1.1);
    B.box(iron, 0, 0.85, 0, 2.0, 0.06, 0.9);
    for (const x of [-0.9, 0.9]) B.box(m, x, 0.85, -0.45, 0.12, 0.9, 0.12);
    B.box(m, 0, 1.7, -0.45, 1.92, 0.12, 0.14);
    B.pipeX(iron, 0, 1.25, -0.25, 1.8, 0.14, 8);
    B.pipeX(ctx.M('black'), 0, 1.02, 0.15, 1.8, 0.09, 6);
    B.box(ctx.M('wood_light'), 0.4, 0.92, 0.65, 1.0, 0.04, 0.5);
    B.box(ctx.M('paper'), 0.4, 0.96, 0.65, 0.8, 0.12, 0.4);
    B.cyl(m, -1.25, 0, 0.2, 0.32, 0.32, 0.12, 10); B.box(m, -1.25, 0.12, 0.2, 0.06, 0.8, 0.06); // the flywheel's stand
    ctx.collide(-1.4, -0.6, 1.2, 0.9, { y1: 1.8 });
  });

  // a glass-topped display counter (or cabinet): what's on show inside it, lit from above
  def('glass_case', (ctx, p, B) => {
    const len = p.len || 2, h = p.h || 1.0, d = p.d || 0.6, m = ctx.M(p.frame || 'wood');
    B.box(m, 0, 0, 0, len, 0.5, d);
    B.box(ctx.M('black'), 0, 0.5, 0, len - 0.06, 0.02, d - 0.06);
    const cols = LABELS[p.goods || 'gear'], r = U.rng('gc' + p.x + ',' + p.z);
    for (let k = 0; k < Math.floor(len / 0.3); k++) B.box(ctx.M('white'), -len / 2 + 0.2 + k * 0.3, 0.52, (r() - 0.5) * (d - 0.25), 0.18, 0.05 + r() * 0.08, 0.12, { tint: cols[k % cols.length] });
    B.box(ctx.M('white:glass'), 0, 0.52, 0, len - 0.04, h - 0.52, d - 0.04);
    B.box(m, 0, h, 0, len, 0.03, d);
    ctx.collide(-len / 2, -d / 2, len / 2, d / 2, { y1: h + 0.05 });
  });

  // a counter stool, bolted to the floor: sit on it (E)
  def('stool', (ctx, p, B) => {
    B.cyl(ctx.M('metal'), 0, 0, 0, 0.2, 0.22, 0.04, 8);
    B.cyl(ctx.M('metal'), 0, 0.04, 0, 0.03, 0.03, 0.6, 5);
    B.cyl(ctx.M(p.seat || 'mat_red'), 0, 0.64, 0, 0.19, 0.19, 0.08, 8);
    ctx.collide(-0.18, -0.18, 0.18, 0.18, { y1: 0.7, camera: false });
    if (p.id) {
      const s = ctx.spot(p.id, 0, 0, Math.PI, 'sit', { seatY: 0.7, approachLocal: [0, -0.55] });
      ctx.interact({ id: 'seat:' + s.id, kind: 'seat', spot: s, x: s.x, y: 0.7, z: s.z, radius: 1.0, label: 'Sit', name: 'Stool' });
    }
  });

  // a booth against the wall: the table out from it and a padded bench either side (along z)
  def('booth', (ctx, p, B) => {
    const fab = ctx.M(p.fabric || 'mat_red'), wood = ctx.M('wood'), m = ctx.M('metal_dark');
    B.box(ctx.M('marble_check'), 0, 0.72, 0, 1.3, 0.04, 0.75); B.box(m, 0, 0, 0, 0.08, 0.72, 0.08);
    for (const s of [-1, 1]) {
      B.box(wood, 0, 0, s * 0.85, 1.3, 0.42, 0.5);
      B.box(fab, 0, 0.42, s * 0.82, 1.3, 0.08, 0.46);
      B.box(fab, 0, 0.42, s * 1.07, 1.3, 0.7, 0.14);
      ctx.collide(-0.65, s > 0 ? 0.6 : -1.15, 0.65, s > 0 ? 1.15 : -0.6, { y1: 1.1 });
    }
    B.cyl(ctx.M('white'), -0.2, 0.76, 0.1, 0.1, 0.1, 0.02, 8); B.cyl(ctx.M('white'), -0.2, 0.78, 0.1, 0.04, 0.035, 0.09, 6);
    ctx.collide(-0.65, -0.38, 0.65, 0.38, { y1: 0.8 });
  });

  // the tattooist's flash: sheets of designs pinned in a grid on the wall
  def('flash_wall', (ctx, p, B) => {
    const tex = DV.Tex.custom('flash_sheets', 256, 128, (c, w, h, r) => {
      c.fillStyle = '#1a1816'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
        const x = 4 + i * 42, y = 4 + j * 41;
        c.fillStyle = '#e0d8c4'; c.fillRect(x, y, 38, 37);
        c.strokeStyle = r() < 0.4 ? '#a02018' : '#141414'; c.lineWidth = 2.5;
        c.beginPath();
        const k = Math.floor(r() * 4);
        if (k === 0) { c.arc(x + 19, y + 18, 11, 0, Math.PI * 2); c.moveTo(x + 8, y + 18); c.lineTo(x + 30, y + 18); }
        else if (k === 1) { c.moveTo(x + 6, y + 28); c.lineTo(x + 19, y + 6); c.lineTo(x + 32, y + 28); c.closePath(); }
        else if (k === 2) { for (let q = 0; q < 3; q++) { c.moveTo(x + 6 + q * 10, y + 30); c.quadraticCurveTo(x + 10 + q * 10, y + 4, x + 14 + q * 10, y + 30); } }
        else { c.moveTo(x + 6, y + 18); c.lineTo(x + 19, y + 10); c.lineTo(x + 32, y + 18); c.moveTo(x + 12, y + 24); c.lineTo(x + 19, y + 19); c.lineTo(x + 26, y + 24); }
        c.stroke();
      }
    });
    B.panel(DV.Mat.fromTexture('flashwall', tex, {}), 0, p.y || 1.55, 0.015, p.w || 2.4, (p.w || 2.4) / 2);
  });

  // sacks, piled: oats, flour, potatoes
  def('sacks', (ctx, p, B) => {
    const m = ctx.M('fabric_grey'), r = U.rng('sk' + p.x + ',' + p.z), n = p.n || 5;
    for (let k = 0; k < n; k++) {
      const row = Math.floor(k / 3), i = k % 3;
      B.push(-0.45 + i * 0.45 + (row ? 0.22 : 0), row * 0.32, (r() - 0.5) * 0.1, (r() - 0.5) * 0.4);
      B.box(m, 0, 0, 0, 0.42, 0.32, 0.62, { tint: [0.95 + r() * 0.1, 0.88 + r() * 0.08, 0.72] });
      B.pop();
    }
    ctx.collide(-0.7, -0.35, 0.7, 0.35, { y1: 0.7, camera: false });
  });

  // a workbench: a vice, a lamp on an arm, a radio with its back off, valves in a tray
  def('workbench', (ctx, p, B) => {
    const len = p.len || 1.8, wood = ctx.M('wood'), m = ctx.M('metal_dark');
    B.box(wood, 0, 0.82, 0, len, 0.06, 0.7);
    for (const x of [-len / 2 + 0.06, len / 2 - 0.06]) B.box(m, x, 0, 0, 0.06, 0.82, 0.62);
    B.box(m, -len / 2 + 0.3, 0.88, 0.2, 0.16, 0.14, 0.18);
    B.box(m, len / 2 - 0.3, 0.88, -0.2, 0.06, 0.6, 0.06); B.box(ctx.M('light_panel:emit'), len / 2 - 0.4, 1.42, -0.1, 0.14, 0.08, 0.14, { uv: 'unit' });
    B.box(ctx.M('wood'), 0, 0.88, -0.05, 0.42, 0.28, 0.24, { tint: [0.7, 0.5, 0.32] });
    for (let k = 0; k < 6; k++) B.cyl(ctx.M('white:glass'), 0.32 + (k % 3) * 0.06, 0.88, 0.12 + Math.floor(k / 3) * 0.06, 0.015, 0.02, 0.07, 5);
    ctx.collide(-len / 2, -0.35, len / 2, 0.35, { y1: 0.9 });
  });

  // a blackboard in a wooden frame: today's prices in chalk (from the shop's own stock)
  def('chalk_menu', (ctx, p, B) => {
    const w = p.w || 1.4, h = w * 0.62, y = p.y || 2.0, St = DV.ShopData.get(p.shop);
    const tex = DV.Tex.custom('chalkmenu|' + p.shop, 256, 160, (c, cw, ch) => {
      c.fillStyle = '#1e2420'; c.fillRect(0, 0, cw, ch);
      c.fillStyle = 'rgba(255,255,255,0.05)'; for (let k = 0; k < 40; k++) c.fillRect((k * 53) % cw, (k * 31) % ch, 30, 6);
      c.fillStyle = '#ece8dc'; c.font = 'bold 20px "Comic Sans MS", "Trebuchet MS", sans-serif'; c.textAlign = 'center';
      c.fillText(St ? St.short.toUpperCase() : 'TODAY', cw / 2, 26);
      c.font = '15px "Comic Sans MS", "Trebuchet MS", sans-serif';
      (St ? St.stock : []).slice(0, 6).forEach(([id], i) => {
        const d = DV.Items.get(id); if (!d) return;
        c.textAlign = 'left'; c.fillText(d.name.replace(/^(A |The )/, ''), 12, 52 + i * 18);
        c.textAlign = 'right'; c.fillText(String(DV.Shops ? DV.Shops.price(St, id) : d.value), cw - 12, 52 + i * 18);
      });
    });
    B.box(ctx.M('wood'), 0, y - h / 2 - 0.05, 0, w + 0.1, h + 0.1, 0.04);
    B.panel(DV.Mat.fromTexture('chalkmenu|' + p.shop, tex, {}), 0, y, 0.025, w, h);
  });

  /* ------------------------------ the shops ------------------------------ */
  // the same bones for every shop; o: W × D (the shop floor), B (the back room's depth), h, the
  // rooms' look and light, the counter (x, len, front, top), the staff door's x, the back room's
  // name and its own spots, the keeper's break spot, the alley door's x, and the dressing
  function shop(S, o) {
    const W = o.W || 10, D = o.D || 8, BK = o.B || 4, h = o.h || 3.4, id = S.id;
    const P = [];
    const add = (type, x, z, opts) => P.push(Object.assign({ type, x, z }, opts || {}));
    // the front: the door and the windows either side (wide as the wall allows)
    add('shop_door', 0, 0.1, { shop: id });
    const ww = Math.min(2.4, W / 2 - 1.6);
    for (const s of [-1, 1]) add('shop_window', s * (0.95 + ww / 2 + 0.3), 0.1, { shop: id, w: ww, display: o.display });
    // the counter and the till, and the shop's name over it on the back wall
    const C = o.counter;
    add('counter', C.x, D - 1.9, { rotDeg: 180, len: C.len, front: C.front || 'wood_panel', top: C.top || 'wood' });
    add('till', C.x + (C.till || 0.6), D - 1.95, { rotDeg: 180, y: (C.h || 1.05) + 0.04 });
    add('sign', C.x, D - 0.11, { rotDeg: 180, text: S.sign, y: 2.65, w: Math.min(4.2, W - 2), h: 0.42, tw: 512, bg: o.signBg || '#1d1c1a', color: o.signInk || '#e8dcb8', size: 26, border: false });
    const ckx = o.clockX !== undefined ? o.clockX : W / 2 - 0.12;
    add('clock', ckx, o.clockZ || 2.2, { rotDeg: ckx < 0 ? 90 : -90, y: 2.5, size: 0.4 });
    for (const q of o.props) P.push(q);
    const room = (rid, name, x0, z0, x1, z1, hh, look) => Object.assign({ id: rid, name, x0, z0, x1, z1, h: hh }, look);
    const backDoorX = o.staffDoor, alleyX = o.alley !== undefined ? o.alley : -backDoorX;
    const spots = Object.assign({
      arrive: { x: alleyX, z: D + BK - 0.9, rot: Math.PI },
      leave: { x: alleyX, z: D + BK - 0.9, rot: 0 },
      [id + '_counter']: { x: C.x, z: D - 0.95, rot: Math.PI, act: 'type', approach: [C.x, D - 0.95] },
      [id + '_back']: { x: o.backSpot[0], z: o.backSpot[1], rot: o.backSpot[2] || 0, act: 'clipboard', approach: [o.backSpot[0], o.backSpot[1]] },
      [id + '_customer']: { x: C.x, z: D - 2.9, rot: 0 },
    }, o.spots || {});
    return DV.Zones.define('shop_' + id, {
      name: S.name,
      region: S.street + ' · ' + S.district,
      shop: id,
      noDiscover: true,
      bounds: { x0: -W / 2 - 1.5, z0: -1.5, x1: W / 2 + 1.5, z1: D + BK + 1.5 },
      buildingHeight: h,
      facade: o.facade || 'brick',
      fog: { color: 0x0d0e10, near: 30, far: 80 },
      sky: { visible: false, skyline: false, top: 0x000000, horizon: 0x000000, ground: 0x000000 },
      charLight: o.charLight || { ambient: 0.5, hemi: 0.4, dir: 0.4, dirColor: 0xffe8c8 },
      rooms: [
        room('sh_' + id, S.name, -W / 2, 0, W / 2, D, h, o.look),
        room('sh_' + id + '_back', o.backName, -W / 2, D, W / 2, D + BK, h - 0.4, o.backLook || o.look),
      ],
      doors: [
        { id: 'sh_' + id + '_staff', x: backDoorX, z: D, dir: 'x', w: 1.1, mat: o.doorMat || 'wood' },
        { id: 'sh_' + id + '_alley', x: alleyX, z: D + BK, dir: 'x', w: 1.1, type: 'sealed', lockMsg: o.alleyMsg || 'The door to the alley. Bolted on the inside, and a sign on it: DELIVERIES ONLY.' },
      ],
      props: P,
      spots,
      spawn: { x: 0, z: 1.2, rot: 0 },
      build(ctx) { DV.Shops.buildInside(ctx, S); },
      onExit() { DV.Shops.leftInside(S); },
    });
  }
  const L = (ambient, color, intensity, fixture, spacing, range) => ({ ambient, color, intensity, fixture, spacing, range: range || 6 });
  const S = (id) => DV.ShopData.get(id);

  /* ---- the ration depot: bare and grey, tins in rows, sacks, the ledger on the counter ---- */
  shop(S('depot'), {
    W: 10, D: 8, B: 4, display: 'tins', facade: 'concrete_panel',
    look: { wall: 'paint_wall', floor: 'concrete', ceiling: 'ceiling_concrete', light: L([0.3, 0.3, 0.3], [0.9, 0.95, 1], 0.85, 'tube', 3.5) },
    backName: 'Storeroom', backLook: { wall: 'concrete', floor: 'concrete', ceiling: 'ceiling_concrete', light: L([0.24, 0.24, 0.24], [1, 0.9, 0.75], 0.7, 'bulb', 4) },
    counter: { x: -1.4, len: 5.0, front: 'wood_panel', top: 'wood' }, staffDoor: 3.3, backSpot: [-2.0, 10.6, Math.PI],
    props: [
      { type: 'goods_shelf', x: -4.72, z: 3.3, rotDeg: 90, len: 4.6, goods: 'tins', frame: 'wood', id: 'dep1' },
      { type: 'goods_shelf', x: 4.72, z: 3.0, rotDeg: -90, len: 3.4, goods: 'packets', frame: 'wood', id: 'dep2' },
      { type: 'sacks', x: 3.7, z: 5.7, n: 6 },
      { type: 'bench', x: -3.0, z: 0.75, len: 1.8 },
      { type: 'sign', x: 4.88, z: 5.9, rotDeg: -90, text: 'TAKE ONLY WHAT YOU NEED', y: 2.3, w: 2.0, h: 0.32, bg: '#d8d4c8', color: '#2a2826', size: 22, border: false },
      { type: 'noticeboard', x: -4.88, z: 6.5, rotDeg: 90, w: 1.0, h: 0.8, title: 'Depot Rules', text: 'SECTOR 9 RATION DEPOT\n\nOne allowance per household per day.\nBring your own bag. Return the tins.\nThose without scrip will not be turned away.\n\nDeliveries from Amity: 06:00. Doors: 07:00.\nThe depot closes at 18:00, when the ledger goes to the Council Hall.\n\nPinned underneath, in pencil: "Mrs. Avery on Kedzie needs a visit — no one has seen her since Sunday."' },
      // the storeroom
      { type: 'pallet', x: 2.4, z: 9.6 }, { type: 'sacks', x: 2.4, z: 9.6, elev: 0.14, n: 6 },
      { type: 'crate', x: -4.3, z: 9.0, size: 0.8, stack: true }, { type: 'crate', x: -4.3, z: 10.0, size: 0.8 },
      { type: 'goods_shelf', x: 0.4, z: 11.72, len: 3.2, goods: 'tins', frame: 'wood', id: 'dep3' },
      { type: 'table', x: -2.0, z: 9.4, w: 1.2, d: 0.6, chairs: 0, top: 'wood' }, { type: 'paper_stack', x: -2.2, z: 9.4, n: 3, elev: 0.74 },
    ],
  });

  /* ---- the print shop: racks of today's papers out front, the press in the back ---- */
  shop(S('printshop'), {
    W: 10, D: 8, B: 4.5, display: 'papers', facade: 'concrete',
    look: { wall: 'paint_white', floor: 'wood', ceiling: 'paint_white', light: L([0.34, 0.33, 0.32], [1, 0.97, 0.9], 0.9, 'panel', 3.5) },
    backName: 'Press Room', backLook: { wall: 'concrete', floor: 'concrete', ceiling: 'ceiling_concrete', light: L([0.26, 0.26, 0.26], [1, 0.95, 0.85], 0.85, 'tube', 3.5) },
    counter: { x: -1.6, len: 4.4, front: 'black', top: 'metal' }, staffDoor: 3.0, backSpot: [3.6, 10.4, Math.PI / 2],
    signBg: '#101010', signInk: '#f0eee6',
    props: [
      { type: 'news_rack', x: 4.62, z: 2.6, rotDeg: -90, len: 2.6 },
      { type: 'goods_shelf', x: -4.72, z: 3.4, rotDeg: 90, len: 4.4, goods: 'papers', frame: 'black', id: 'pr1' },
      { type: 'paper_stack', x: 1.6, z: 5.3, n: 6 }, { type: 'paper_stack', x: 2.1, z: 5.3, n: 4 },
      { type: 'noticeboard', x: 4.88, z: 5.4, rotDeg: -90, w: 1.6, h: 1.0, title: 'Front Pages', text: 'Front pages, pinned up in a row, the oldest yellow:\n\n"COUNCIL VOTE WAS RIGGED, SAYS COUNCILWOMAN" — and under it, a week later: "SHE WAS RIGHT."\n"FIVE LORRIES SENT. FOUR ARRIVED."\n"ERUDITE: WATER REPORT DELAYED \'FOR ACCURACY\'"\n"DAUNTLESS INITIATE BREAKS BOTH LEGS, SAYS IT WAS WORTH IT"\n\nA card underneath: WE PRINT THE CORRECTIONS ON THE FRONT PAGE. — G. HALE' },
      { type: 'poster', x: -4.88, z: 6.6, rotDeg: 90, kind: 'factions' },
      // the press room
      { type: 'print_press', x: -0.6, z: 10.3 },
      { type: 'file_shelf', x: -4.5, z: 10.4, rotDeg: 90, len: 2.0 },
      { type: 'pallet', x: 3.6, z: 8.9 }, { type: 'paper_stack', x: 3.6, z: 8.9, n: 8, elev: 0.14 },
      { type: 'barrel', x: 4.4, z: 11.8, mat: 'black' },
    ],
  });

  /* ---- the bookshop: shelves to the ceiling, glassware in cabinets, a stockroom of crates ---- */
  shop(S('bookshop'), {
    W: 10, D: 9, B: 4, display: 'books', facade: 'facade',
    look: { wall: 'paint_blue', floor: 'wood_light', ceiling: 'paint_white', light: L([0.32, 0.33, 0.36], [0.92, 0.96, 1], 0.9, 'tube', 3.2) },
    backName: 'Stockroom', backLook: { wall: 'paint_wall', floor: 'wood', ceiling: 'paint_white', light: L([0.26, 0.26, 0.28], [1, 0.95, 0.88], 0.75, 'bulb', 4) },
    counter: { x: 1.8, len: 3.6, front: 'wood', top: 'wood' }, staffDoor: -3.4, backSpot: [2.6, 11.0, 0],
    clockX: -4.88, clockZ: 7.6,
    props: [
      { type: 'rug', x: 0.6, z: 4.2, w: 3.0, d: 4.0, mat: 'carpet_blue' },
      { type: 'goods_shelf', x: -4.72, z: 4.2, rotDeg: 90, len: 6.0, h: 2.6, levels: 6, goods: 'books', frame: 'wood', id: 'bk1' },
      { type: 'goods_shelf', x: -0.9, z: 3.6, rotDeg: 90, len: 2.6, h: 1.6, levels: 4, goods: 'books', frame: 'wood', back: false, id: 'bk2' },
      { type: 'med_cabinet', x: 4.75, z: 2.3, rotDeg: -90 }, { type: 'med_cabinet', x: 4.75, z: 3.5, rotDeg: -90 },
      { type: 'glass_case', x: 4.4, z: 5.3, rotDeg: -90, len: 1.6, goods: 'bottles' },
      { type: 'chalk_menu', x: 4.88, z: 4.4, rotDeg: -90, shop: 'bookshop', w: 1.0, y: 2.3 },
      { type: 'emblem', x: -1.6, z: 8.88, rotDeg: 180, faction: 'erudite', y: 2.5, size: 0.7, color: '#2f5f9a' },
      // the stockroom
      { type: 'crate', x: -0.6, z: 10.0, size: 0.7, stack: true }, { type: 'crate', x: 0.3, z: 10.1, size: 0.7 },
      { type: 'file_shelf', x: 4.5, z: 11.0, rotDeg: -90, len: 2.0 },
      { type: 'goods_shelf', x: -1.2, z: 12.72, len: 3.0, goods: 'bottles', id: 'bk3' },
      { type: 'table', x: 1.4, z: 11.6, w: 1.2, d: 0.6, chairs: 0, top: 'wood' },
    ],
  });

  /* ---- the tattoo parlour: brick, a red bulb, the flash, the chair, the gear in the case ---- */
  shop(S('tattoo'), {
    W: 10, D: 8, B: 4, display: 'gear', facade: 'brick',
    look: { wall: 'concrete_dark', floor: 'concrete_dark', ceiling: 'ceiling_concrete', light: L([0.22, 0.2, 0.2], [1, 0.78, 0.66], 0.95, 'bulb', 3.2) },
    backName: 'Back Room', backLook: { wall: 'concrete_dark', floor: 'metal_plate', ceiling: 'ceiling_concrete', light: L([0.2, 0.2, 0.22], [0.8, 0.86, 1], 0.8, 'bulb', 4) },
    counter: { x: 2.2, len: 3.2, front: 'metal_dark', top: 'metal' }, staffDoor: -3.6, backSpot: [1.0, 10.9, 0],
    signBg: '#141414', signInk: '#e8502a', charLight: { ambient: 0.45, hemi: 0.35, dir: 0.4, dirColor: 0xffc8a8 },
    props: [
      { type: 'flash_wall', x: -4.88, z: 2.8, rotDeg: 90, w: 2.6, y: 1.6 },
      { type: 'tattoo_chair', x: -2.2, z: 5.2, rotDeg: -90, id: 'tat_chair' },
      { type: 'mirror', x: -4.88, z: 5.4, rotDeg: 90, y: 1.5, w: 1.0, h: 1.2 },
      { type: 'glass_case', x: 4.4, z: 3.0, rotDeg: -90, len: 2.4, goods: 'gear', frame: 'metal_dark' },
      { type: 'poster', x: 4.88, z: 5.0, rotDeg: -90, kind: 'dauntless' },
      { type: 'emblem', x: 2.2, z: 7.88, rotDeg: 180, faction: 'dauntless', y: 2.15, size: 0.55, color: '#c83a2a' },
      // the back room
      { type: 'weights', x: 2.6, z: 8.5 },
      { type: 'lockers', x: -4.7, z: 10.0, rotDeg: 90, len: 2.4 },
      { type: 'boxes', x: 4.4, z: 11.6, n: 3 },
      { type: 'sinks', x: 0.2, z: 11.72, n: 1, rotDeg: 180 },
    ],
  });

  /* ---- the produce market: bins of fruit and roots, barrels, flowers, the scales on the counter ---- */
  shop(S('market'), {
    W: 12, D: 9, B: 4, display: 'jars', facade: 'brick',
    look: { wall: 'wood_panel', floor: 'wood', ceiling: 'wood', light: L([0.34, 0.3, 0.24], [1, 0.86, 0.62], 0.95, 'bulb', 3.2) },
    backName: 'Loading Bay', backLook: { wall: 'brick', floor: 'concrete', ceiling: 'ceiling_concrete', light: L([0.26, 0.25, 0.22], [1, 0.9, 0.72], 0.75, 'bulb', 4) },
    counter: { x: -2.2, len: 4.4, front: 'wood_panel', top: 'wood' }, staffDoor: 4.0, backSpot: [-2.4, 11.0, Math.PI],
    signBg: '#5a2018', signInk: '#f0d8a0', alleyMsg: 'The loading door. The truck backs up to it at dawn; it\'s barred until then.',
    props: [
      { type: 'produce_bin', x: -5.4, z: 2.6, rotDeg: 90, label: 'APPLES', fruit: [[0.72, 0.14, 0.1], [0.62, 0.18, 0.08], [0.78, 0.6, 0.12]] },
      { type: 'produce_bin', x: -5.4, z: 4.0, rotDeg: 90, label: 'PEACHES', fruit: [[0.9, 0.56, 0.28], [0.86, 0.42, 0.22]] },
      { type: 'produce_bin', x: 5.4, z: 2.6, rotDeg: -90, label: 'POTATOES', fruit: [[0.6, 0.48, 0.3], [0.52, 0.4, 0.26]], size: 0.06 },
      { type: 'produce_bin', x: 5.4, z: 4.0, rotDeg: -90, label: 'GREENS', fruit: [[0.3, 0.5, 0.18], [0.36, 0.58, 0.22]], size: 0.07 },
      { type: 'produce_bin', x: 5.4, z: 5.4, rotDeg: -90, label: 'ONIONS', fruit: [[0.78, 0.6, 0.36], [0.6, 0.3, 0.3]] },
      { type: 'produce_bin', x: 1.2, z: 4.6, w: 2.0, d: 1.0, label: 'TODAY', fruit: [[0.72, 0.14, 0.1], [0.9, 0.56, 0.28], [0.3, 0.5, 0.18]], n: 40 },
      { type: 'barrel', x: -5.3, z: 6.4, mat: 'wood' }, { type: 'barrel', x: 4.9, z: 6.9, mat: 'wood' },
      { type: 'plant', x: -5.3, z: 0.6, size: 0.9 }, { type: 'plant', x: 5.3, z: 0.6, size: 0.9 },
      { type: 'goods_shelf', x: -0.3, z: 8.78, len: 2.4, h: 1.4, levels: 3, goods: 'jars', frame: 'wood', id: 'mk1', d: 0.35 },
      { type: 'banner', x: 2.6, z: 8.85, rotDeg: 180, faction: 'amity', y: 2.9, h: 1.3 },
      // the loading bay
      { type: 'pallet', x: -4.2, z: 10.2 }, { type: 'crate', x: -4.2, z: 10.2, elev: 0.14, size: 0.8, stack: true },
      { type: 'sacks', x: 1.0, z: 12.2, n: 5 }, { type: 'crate', x: 4.6, z: 12.2, size: 0.7 }, { type: 'crate', x: 4.6, z: 11.3, size: 0.7 },
    ],
  });

  /* ---- the repairman's: every shelf full, radios, torches, a kettle; the workshop he sleeps in ---- */
  shop(S('pawn'), {
    W: 10, D: 8, B: 4, display: 'junk', facade: 'brick',
    look: { wall: 'concrete_panel', floor: 'concrete', ceiling: 'ceiling_concrete', light: L([0.22, 0.2, 0.18], [1, 0.84, 0.6], 0.85, 'bulb', 3.6) },
    backName: 'Workshop', backLook: { wall: 'brick', floor: 'concrete', ceiling: 'ceiling_concrete', light: L([0.18, 0.17, 0.16], [1, 0.82, 0.56], 0.8, 'bulb', 4) },
    counter: { x: -1.0, len: 4.0, front: 'metal_painted', top: 'wood' }, staffDoor: 3.4, backSpot: [-1.0, 10.9, Math.PI],
    signBg: '#2a2620', signInk: '#d8c890', alleyMsg: 'A steel door with three bolts and a bar across it. Out here, that\'s just good sense.',
    props: [
      { type: 'goods_shelf', x: -4.72, z: 3.4, rotDeg: 90, len: 4.6, goods: 'junk', frame: 'rust', id: 'pw1' },
      { type: 'goods_shelf', x: 4.72, z: 2.4, rotDeg: -90, len: 2.6, goods: 'junk', frame: 'rust', id: 'pw2' },
      { type: 'crt_tv', x: 4.5, z: 5.2, rotDeg: -90 },
      { type: 'boxes', x: 3.6, z: 6.2, n: 4 }, { type: 'barrel', x: -3.8, z: 6.6 },
      { type: 'glass_case', x: 2.4, z: 1.2, len: 1.6, goods: 'junk', frame: 'metal_dark' },
      { type: 'sign', x: -1.0, z: 5.75, rotDeg: 180, text: 'NO CREDIT. NO REFUNDS. NO STOLEN GOODS.', y: 0.62, w: 1.6, h: 0.22, bg: '#d8d0b0', color: '#3a1a10', size: 16, border: false },
      // the workshop
      { type: 'workbench', x: -1.0, z: 11.55, rotDeg: 180, len: 2.2 },
      { type: 'bed', x: 3.9, z: 10.2, rotDeg: 90 },
      { type: 'boiler', x: -4.2, z: 9.0 },
      { type: 'crate', x: -1.6, z: 8.9, size: 0.7 },
    ],
  });

  /* ---- the diner: the checkerboard floor, the long counter and its stools, booths, the kitchen ---- */
  shop(S('diner'), {
    W: 10, D: 8, B: 4, display: 'jars', facade: 'brick',
    look: { wall: 'paint_warm', floor: 'marble_check', ceiling: 'ceiling_tile', light: L([0.36, 0.33, 0.3], [1, 0.92, 0.78], 0.95, 'panel', 3.2) },
    backName: 'Kitchen', backLook: { wall: 'tile_white', floor: 'tile_small', ceiling: 'ceiling_tile', light: L([0.32, 0.32, 0.32], [1, 0.97, 0.92], 0.95, 'tube', 3) },
    counter: { x: -1.8, len: 5.4, front: 'metal', top: 'marble_check', till: 2.0 }, staffDoor: 3.2, backSpot: [0.4, 9.4, Math.PI],
    signBg: '#7a2018', signInk: '#f4e0b0',
    props: [
      { type: 'stool', x: -3.6, z: 5.4, id: 'dn_st0' }, { type: 'stool', x: -2.7, z: 5.4, id: 'dn_st1' }, { type: 'stool', x: -0.9, z: 5.4, id: 'dn_st2' },
      { type: 'booth', x: 4.2, z: 2.2 }, { type: 'booth', x: 4.2, z: 4.9 },
      { type: 'coffee_machine', x: -3.6, z: 6.28, rotDeg: 180, elev: 1.09 },
      { type: 'chalk_menu', x: -1.8, z: 7.88, rotDeg: 180, shop: 'diner', w: 1.6 },
      { type: 'plant', x: -4.5, z: 0.7, size: 0.7 },
      // the kitchen
      { type: 'kitchenette', x: 0.6, z: 11.68, rotDeg: 180, len: 3.2 },
      { type: 'sinks', x: 3.6, z: 11.72, rotDeg: 180, n: 2 },
      { type: 'table', x: 0.4, z: 10.2, w: 1.6, d: 0.7, chairs: 0, top: 'metal' },
    ],
  });

  /* ---- the clinic: white tile, the pharmacy counter, waiting chairs, the exam room behind ---- */
  shop(S('clinic'), {
    W: 10, D: 8, B: 4, display: 'bottles', facade: 'concrete_panel',
    look: { wall: 'paint_white', floor: 'tile_floor', ceiling: 'ceiling_tile', light: L([0.38, 0.38, 0.38], [0.95, 0.98, 1], 1.0, 'panel', 3.2) },
    backName: 'Exam Room', backLook: { wall: 'tile_white', floor: 'tile_floor', ceiling: 'ceiling_tile', light: L([0.36, 0.36, 0.38], [0.95, 0.98, 1], 0.95, 'panel', 3) },
    counter: { x: 1.6, len: 3.6, front: 'white', top: 'metal' }, staffDoor: -3.6, backSpot: [1.2, 10.4, 0],
    signBg: '#f0f0ea', signInk: '#8a2018', alleyMsg: 'The side door, with a bell push beside it: "AFTER HOURS — RING FOR THE NURSE."',
    props: [
      { type: 'chair', x: -4.4, z: 2.4, rotDeg: 90 }, { type: 'chair', x: -4.4, z: 3.4, rotDeg: 90 }, { type: 'chair', x: -4.4, z: 4.4, rotDeg: 90 },
      { type: 'water_cooler', x: -4.6, z: 6.4 },
      { type: 'med_cabinet', x: 3.2, z: 7.75, rotDeg: 180 }, { type: 'med_cabinet', x: 4.3, z: 7.75, rotDeg: 180 },
      { type: 'goods_shelf', x: 4.72, z: 3.4, rotDeg: -90, len: 3.0, h: 1.8, goods: 'bottles', frame: 'white', id: 'cl1' },
      { type: 'noticeboard', x: -4.88, z: 5.3, rotDeg: 90, w: 1.2, h: 0.9, title: 'Health Notices', text: 'HALSTED STREET CLINIC\n\nWash your hands. Boil your water when the notice says so.\nThe doctor attends Tuesdays and Fridays, 10:00–14:00.\nInitiates: if you have hit your head, you have hit your head. Sit down.\n\nThe pharmacy will not sell more than one bottle of iron tonic per person per week. (We know who you are.)' },
      { type: 'poster', x: 4.88, z: 5.8, rotDeg: -90, kind: 'quiet' },
      // the exam room
      { type: 'bed', x: -2.6, z: 10.0, rotDeg: 90 }, { type: 'curtain', x: -1.2, z: 11.1, rotDeg: 90, len: 1.6 },
      { type: 'sinks', x: 1.6, z: 11.72, rotDeg: 180, n: 1 },
      { type: 'med_cabinet', x: 4.75, z: 9.6, rotDeg: -90 },
      { type: 'chair', x: 2.0, z: 9.1, style: 'wood' },
    ],
  });
})();
