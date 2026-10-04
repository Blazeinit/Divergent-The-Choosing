/* ==========================================================================
   DIVERGENT — prop library
   Each prop is a builder function (ctx, p, B). The batch transform is
   already set to the prop's position/rotation; build in local space where
   +Z is the prop's "front". Props may add colliders, spots (NPC/seat
   positions), interactables and dynamic updaters through ctx.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const registry = {};

  DV.Props = {
    define(type, fn) {
      registry[type] = fn;
    },
    get(type) {
      return registry[type];
    },
    types() {
      return Object.keys(registry);
    },
  };
  const def = DV.Props.define;

  // shorthand
  const legs4 = (B, m, w, d, h, t, inset) => {
    const ix = w / 2 - (inset || 0.05), iz = d / 2 - (inset || 0.05);
    for (const [x, z] of [[-ix, -iz], [ix, -iz], [ix, iz], [-ix, iz]]) B.box(m, x, 0, z, t, h, t);
  };
  const seatInteract = (ctx, spot, name) => {
    ctx.interact({ id: 'seat:' + spot.id, kind: 'seat', spot, x: spot.x, y: 0.6, z: spot.z, radius: 1.2, label: 'Sit', name: name || 'Seat' });
  };

  /* ------------------------------ seating ------------------------------ */
  def('bench', (ctx, p, B) => {
    const len = p.len || 2.4;
    const metal = ctx.M('metal_dark'), wood = ctx.M(p.wood || 'wood');
    B.box(wood, 0, 0.42, 0, len, 0.05, 0.46);
    if (p.back !== false) {
      B.box(wood, 0, 0.55, -0.22, len, 0.32, 0.04);
      B.box(metal, -len / 2 + 0.1, 0.42, -0.24, 0.04, 0.5, 0.04);
      B.box(metal, len / 2 - 0.1, 0.42, -0.24, 0.04, 0.5, 0.04);
    }
    for (const x of [-len / 2 + 0.1, len / 2 - 0.1, ...(len > 2 ? [0] : [])]) {
      B.box(metal, x, 0, -0.18, 0.05, 0.42, 0.05);
      B.box(metal, x, 0, 0.18, 0.05, 0.42, 0.05);
      B.box(metal, x, 0.38, 0, 0.05, 0.04, 0.42);
    }
    ctx.collide(-len / 2, -0.26, len / 2, 0.24, { y1: 0.9 });
    const n = Math.max(1, Math.floor(len / 0.75));
    for (let k = 0; k < n; k++) {
      const x = -len / 2 + (len / n) * (k + 0.5);
      const s = ctx.spot((p.id || 'bench') + '_s' + k, x, 0.02, 0, 'sit', { seatY: 0.45 });
      if (p.seatable !== false) seatInteract(ctx, s, 'Bench');
    }
  });

  def('chair', (ctx, p, B) => {
    const style = p.style || 'plastic';
    if (style === 'office') {
      const fab = ctx.M('fabric_grey'), dark = ctx.M('metal_dark');
      B.cyl(dark, 0, 0, 0, 0.3, 0.3, 0.05, 5);
      B.box(dark, 0, 0.05, 0, 0.05, 0.38, 0.05);
      B.box(fab, 0, 0.42, 0, 0.48, 0.08, 0.46);
      B.box(fab, 0, 0.5, -0.22, 0.44, 0.5, 0.07);
    } else if (style === 'wood') {
      const w = ctx.M('wood');
      legs4(B, w, 0.44, 0.42, 0.44, 0.04);
      B.box(w, 0, 0.42, 0, 0.46, 0.04, 0.44);
      B.box(w, 0, 0.46, -0.2, 0.44, 0.5, 0.04);
    } else {
      const pl = ctx.M(p.color === 'orange' ? 'plastic_orange' : 'plastic'), m = ctx.M('metal');
      legs4(B, m, 0.42, 0.4, 0.43, 0.03);
      B.box(pl, 0, 0.42, 0.01, 0.46, 0.04, 0.44);
      B.box(pl, 0, 0.46, -0.21, 0.44, 0.4, 0.035);
    }
    if (!p.noCollide) ctx.collide(-0.24, -0.25, 0.24, 0.24, { y1: 0.9 });
    if (p.id) {
      const s = ctx.spot(p.id, 0, 0.02, 0, 'sit', { seatY: 0.45 });
      if (p.seatable !== false) seatInteract(ctx, s, 'Chair');
    }
  });

  def('sofa', (ctx, p, B) => {
    const len = p.len || 2.0;
    const fab = ctx.M(p.fabric || 'fabric_blue'), dark = ctx.M('metal_dark');
    B.box(dark, 0, 0, 0, len, 0.12, 0.8);
    B.box(fab, 0, 0.12, 0.05, len - 0.3, 0.3, 0.7);
    B.box(fab, 0, 0.12, -0.3, len, 0.75, 0.2);
    B.box(fab, -len / 2 + 0.12, 0.12, 0.05, 0.24, 0.5, 0.7);
    B.box(fab, len / 2 - 0.12, 0.12, 0.05, 0.24, 0.5, 0.7);
    ctx.collide(-len / 2, -0.4, len / 2, 0.4, { y1: 0.9 });
    const n = Math.max(1, Math.floor((len - 0.3) / 0.7));
    for (let k = 0; k < n; k++) {
      const x = -len / 2 + 0.15 + ((len - 0.3) / n) * (k + 0.5);
      const s = ctx.spot((p.id || 'sofa') + '_s' + k, x, 0.1, 0, 'sit', { seatY: 0.42 });
      seatInteract(ctx, s, 'Sofa');
    }
  });

  /* ------------------------------ furniture ------------------------------ */
  function crt(B, ctx, x, y, z, rot, screen, s) {
    s = s || 1;
    const body = ctx.M('plastic');
    B.push(x, y, z, rot || 0, s);
    B.box(body, 0, 0, 0.02, 0.36, 0.04, 0.3);
    B.box(body, 0, 0.04, -0.02, 0.38, 0.32, 0.34);
    B.box(body, 0, 0.08, -0.2, 0.26, 0.22, 0.12);
    B.panel(ctx.M((screen || 'crt_green') + ':emit'), 0, 0.2, 0.152, 0.3, 0.23);
    B.pop();
  }
  DV.Props.crt = crt;

  def('desk', (ctx, p, B) => {
    const w = p.w || 1.4, d = p.d || 0.7;
    const top = ctx.M(p.wood ? 'wood' : 'wood_light'), metal = ctx.M('metal_dark');
    B.box(top, 0, 0.72, 0, w, 0.04, d);
    B.box(metal, -w / 2 + 0.05, 0, 0, 0.05, 0.72, d - 0.05);
    B.box(metal, w / 2 - 0.05, 0, 0, 0.05, 0.72, d - 0.05);
    B.box(metal, 0, 0.3, d / 2 - 0.05, w - 0.1, 0.4, 0.02);
    // drawer unit
    B.box(ctx.M('metal'), w / 2 - 0.25, 0.05, 0, 0.38, 0.66, d - 0.08);
    if (p.computer !== false) {
      crt(B, ctx, -0.1, 0.74, 0.1, Math.PI, p.screen);
      B.box(ctx.M('plastic'), -0.1, 0.74, -0.18, 0.42, 0.025, 0.14); // keyboard
    }
    // papers & clutter
    const r = U.rng(p.id || p.x * 7 + p.z);
    const paper = ctx.M('paper');
    for (let k = 0; k < 3; k++) B.box(paper, 0.3 + r() * 0.2, 0.74 + k * 0.004, -0.1 + r() * 0.2, 0.21, 0.004, 0.29);
    if (r() < 0.5) B.cyl(ctx.M('plastic_orange'), -0.55, 0.74, -0.15, 0.04, 0.04, 0.1, 6); // mug
    ctx.collide(-w / 2, -d / 2, w / 2, d / 2, { y1: 0.8 });
    if (p.chair !== false) {
      B.push(-0.1, 0, -d / 2 - 0.25, 0);
      const fab = ctx.M('fabric_grey'), dark = ctx.M('metal_dark');
      B.cyl(dark, 0, 0, 0, 0.28, 0.28, 0.05, 5);
      B.box(dark, 0, 0.05, 0, 0.05, 0.36, 0.05);
      B.box(fab, 0, 0.41, 0, 0.46, 0.08, 0.44);
      B.box(fab, 0, 0.49, -0.21, 0.42, 0.5, 0.07);
      B.pop();
      if (p.id) ctx.spot(p.id, -0.1, -d / 2 - 0.25, 0, 'work', { seatY: 0.45 });
    }
    if (p.id) ctx.spot(p.id + '_visit', 0, d / 2 + 0.75, Math.PI, 'stand');
  });

  def('table', (ctx, p, B) => {
    const w = p.w || 1.6, d = p.d || 0.9, h = p.h || 0.74;
    const top = ctx.M(p.top || 'wood_light'), metal = ctx.M('metal_dark');
    B.box(top, 0, h - 0.04, 0, w, 0.04, d);
    legs4(B, metal, w, d, h - 0.04, 0.05, 0.08);
    ctx.collide(-w / 2, -d / 2, w / 2, d / 2, { y1: h + 0.05 });
    const chairs = p.chairs === undefined ? 4 : p.chairs;
    const pl = ctx.M(p.chairTex || 'plastic'), m = ctx.M('metal');
    const places = [];
    const perSide = Math.max(1, Math.round(chairs / 2));
    for (let k = 0; k < perSide; k++) {
      const x = -w / 2 + (w / perSide) * (k + 0.5);
      places.push([x, -d / 2 - 0.3, 0]);
      if (places.length < chairs) places.push([x, d / 2 + 0.3, Math.PI]);
    }
    places.slice(0, chairs).forEach(([x, z, rot], k) => {
      B.push(x, 0, z, rot);
      legs4(B, m, 0.4, 0.4, 0.43, 0.03);
      B.box(pl, 0, 0.42, 0, 0.44, 0.04, 0.42);
      B.box(pl, 0, 0.46, -0.2, 0.42, 0.38, 0.035);
      B.pop();
      if (p.id) {
        const s = ctx.spot(p.id + '_c' + k, x, z, rot, 'sit', { seatY: 0.45, approachLocal: [x - Math.sin(rot) * 0.65, z - Math.cos(rot) * 0.65] });
        seatInteract(ctx, s, 'Chair');
      }
    });
    if (p.clutter) {
      const paper = ctx.M('paper');
      const r = U.rng(p.id || 't' + p.x);
      for (let k = 0; k < 4; k++) B.box(paper, -w / 3 + r() * w * 0.6, h, -d / 4 + r() * d * 0.4, 0.21, 0.004, 0.29);
      B.cyl(ctx.M('white'), 0.2, h, 0.1, 0.04, 0.035, 0.1, 6);
    }
  });

  def('counter', (ctx, p, B) => {
    const len = p.len || 4, h = p.h || 1.05, d = p.d || 0.7;
    const front = ctx.M(p.front || 'wood_panel'), top = ctx.M(p.top || 'metal');
    B.box(front, 0, 0, 0.1, len, h, 0.1);
    B.box(top, 0, h, 0.05, len + 0.06, 0.04, 0.34);
    B.box(ctx.M('wood_light'), 0, 0.72, -0.2, len, 0.04, d - 0.2);
    B.box(ctx.M('metal_dark'), -len / 2 + 0.05, 0, -0.2, 0.05, 0.72, d - 0.25);
    B.box(ctx.M('metal_dark'), len / 2 - 0.05, 0, -0.2, 0.05, 0.72, d - 0.25);
    ctx.collide(-len / 2, -d / 2 - 0.05, len / 2, 0.2, { y1: h + 0.1 });
    if (p.computers) for (let k = 0; k < p.computers; k++) crt(B, ctx, -len / 2 + (len / p.computers) * (k + 0.5), 0.74, -0.15, 0, 'crt_blue');
    if (p.sign) {
      const t = DV.Tex.sign(p.sign, { w: 256, h: 48, bg: '#2a3236', size: 24, stripe: '#b08a3a' });
      B.panel(DV.Mat.fromTexture('sign|' + p.sign, t, {}), 0, h * 0.62, 0.16, Math.min(len - 0.4, 1.8), 0.34);
    }
  });

  def('cubicle', (ctx, p, B) => {
    const part = ctx.M('fabric_grey'), frame = ctx.M('metal');
    B.box(part, 0, 0, -0.95, 1.8, 1.3, 0.06);
    B.box(part, -0.9, 0, -0.2, 0.06, 1.3, 1.5);
    B.box(frame, 0, 1.3, -0.95, 1.82, 0.03, 0.08);
    B.box(frame, -0.9, 1.3, -0.2, 0.08, 0.03, 1.5);
    ctx.collide(-0.93, -0.98, 0.93, -0.92, { y1: 1.35 });
    ctx.collide(-0.93, -0.98, -0.87, 0.55, { y1: 1.35 });
    // desk against back partition, worker faces -z
    B.push(0.1, 0, -0.6, Math.PI);
    const top = ctx.M('wood_light'), metal = ctx.M('metal_dark');
    B.box(top, 0, 0.72, 0, 1.4, 0.04, 0.65);
    B.box(metal, -0.65, 0, 0, 0.05, 0.72, 0.6);
    B.box(metal, 0.65, 0, 0, 0.05, 0.72, 0.6);
    crt(B, ctx, 0.1, 0.74, 0.08, Math.PI, p.screen || 'crt_blue');
    B.box(ctx.M('paper'), -0.4, 0.745, 0, 0.3, 0.02, 0.35);
    B.pop();
    ctx.collide(-0.62, -0.95, 0.82, -0.27, { y1: 0.8 });
    B.push(0.0, 0, 0.0, Math.PI);
    const fab = ctx.M('fabric_blue'), dark = ctx.M('metal_dark');
    B.cyl(dark, 0, 0, 0, 0.28, 0.28, 0.05, 5);
    B.box(dark, 0, 0.05, 0, 0.05, 0.36, 0.05);
    B.box(fab, 0, 0.41, 0, 0.46, 0.08, 0.44);
    B.box(fab, 0, 0.49, -0.21, 0.42, 0.5, 0.07);
    B.pop();
    if (p.id) ctx.spot(p.id, 0, 0.0, Math.PI, 'work', { seatY: 0.45 });
  });

  def('filing_cabinet', (ctx, p, B) => {
    const m = ctx.M('metal');
    const n = p.n || 1;
    for (let k = 0; k < n; k++) {
      const x = (k - (n - 1) / 2) * 0.48;
      B.box(m, x, 0, 0, 0.46, 1.32, 0.6);
      for (let dr = 0; dr < 4; dr++) B.box(ctx.M('metal_dark'), x, 0.12 + dr * 0.31, 0.3, 0.12, 0.03, 0.03);
    }
    ctx.collide(-n * 0.24, -0.3, n * 0.24, 0.32, { y1: 1.32 });
  });

  def('shelf', (ctx, p, B) => {
    const len = p.len || 2, h = p.h || 2, d = p.d || 0.5;
    const m = ctx.M('metal_painted'), box = ctx.M('wood_light');
    for (const x of [-len / 2 + 0.03, len / 2 - 0.03]) for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) B.box(m, x, 0, z, 0.05, h, 0.05);
    const levels = p.levels || 4;
    const r = U.rng(p.id || 's' + p.x + p.z);
    for (let k = 0; k < levels; k++) {
      const y = 0.1 + (k * (h - 0.2)) / (levels - 1);
      B.box(m, 0, y, 0, len, 0.03, d);
      if (k < levels - 1 && p.empty !== true) {
        let x = -len / 2 + 0.1;
        while (x < len / 2 - 0.35) {
          const bw = 0.25 + r() * 0.3, bh = 0.18 + r() * 0.2;
          if (r() < 0.8) B.box(r() < 0.3 ? ctx.M('plastic') : box, x + bw / 2, y + 0.03, (r() - 0.5) * 0.08, bw, bh, d * 0.8);
          x += bw + 0.05;
        }
      }
    }
    ctx.collide(-len / 2, -d / 2, len / 2, d / 2, { y1: h });
  });

  def('file_shelf', (ctx, p, B) => {
    const len = p.len || 2, h = p.h || 2.1, d = 0.45;
    const m = ctx.M('metal_dark'), f = ctx.M('shelf_files');
    B.box(m, 0, 0, -d / 2 + 0.02, len, h, 0.04);
    for (const x of [-len / 2 + 0.02, len / 2 - 0.02]) B.box(m, x, 0, 0, 0.04, h, d);
    const levels = 5;
    for (let k = 0; k < levels; k++) {
      const y = 0.05 + (k * (h - 0.1)) / (levels - 1);
      B.box(m, 0, y, 0, len, 0.03, d);
      if (k < levels - 1) B.quad(f, [-len / 2 + 0.05, y + 0.03, 0.1], [len / 2 - 0.05, y + 0.03, 0.1], [len / 2 - 0.05, y + 0.38, 0.1], [-len / 2 + 0.05, y + 0.38, 0.1], [0, 0], [len, 0], [len, 0.5], [0, 0.5]);
    }
    if (p.double) {
      B.push(0, 0, 0, Math.PI);
      for (let k = 0; k < levels - 1; k++) {
        const y = 0.05 + (k * (h - 0.1)) / (levels - 1);
        B.quad(f, [-len / 2 + 0.05, y + 0.03, 0.1], [len / 2 - 0.05, y + 0.03, 0.1], [len / 2 - 0.05, y + 0.38, 0.1], [-len / 2 + 0.05, y + 0.38, 0.1], [0, 0], [len, 0], [len, 0.5], [0, 0.5]);
      }
      B.pop();
    }
    ctx.collide(-len / 2, -d / 2, len / 2, d / 2, { y1: h });
  });

  def('lockers', (ctx, p, B) => {
    const len = p.len || 2.4, h = 1.9;
    B.box(ctx.M('metal_painted'), 0, 0, 0, len, h, 0.5, { faces: { pz: ctx.M('lockers') } });
    ctx.collide(-len / 2, -0.25, len / 2, 0.25, { y1: h });
  });

  /* ------------------------------ amenities ------------------------------ */
  def('vending', (ctx, p, B) => {
    B.box(ctx.M('metal_dark'), 0, 0, 0, 0.95, 1.85, 0.8, { faces: { pz: ctx.M('vending:emit') }, uv: 'unit' });
    ctx.collide(-0.48, -0.4, 0.48, 0.4, { y1: 1.85 });
    const [x, z] = ctx.toWorld(0, 0.7);
    ctx.interact({ id: 'vend:' + (p.id || p.x + ',' + p.z), kind: 'action', action: 'vending', x, y: 1.0, z, radius: 1.3, label: 'Use', name: 'Ration Dispenser' });
  });

  def('water_cooler', (ctx, p, B) => {
    B.box(ctx.M('plastic'), 0, 0, 0, 0.36, 1.0, 0.36);
    B.cyl(ctx.M('white:glass'), 0, 1.0, 0, 0.14, 0.14, 0.4, 8);
    B.box(ctx.M('metal'), 0, 0.75, 0.19, 0.12, 0.08, 0.04);
    ctx.collide(-0.2, -0.2, 0.2, 0.2, { y1: 1.4 });
    const [x, z] = ctx.toWorld(0, 0.55);
    ctx.interact({ id: 'water:' + (p.id || p.x + ',' + p.z), kind: 'action', action: 'water', x, y: 1.0, z, radius: 1.2, label: 'Drink', name: 'Water Cooler' });
  });

  def('coffee_machine', (ctx, p, B) => {
    B.box(ctx.M('metal_dark'), 0, 0, 0, 0.35, 0.45, 0.32);
    B.box(ctx.M('metal'), 0, 0.12, 0.12, 0.2, 0.02, 0.1);
    B.panel(ctx.M('crt_green:emit'), 0, 0.36, 0.165, 0.12, 0.06);
    if (p.id) {
      const [x, z] = ctx.toWorld(0, 0.5);
      ctx.interact({ id: 'coffee:' + p.id, kind: 'action', action: 'coffee', x, y: 1.0, z, radius: 1.2, label: 'Pour coffee', name: 'Coffee Machine' });
    }
  });

  def('kitchenette', (ctx, p, B) => {
    const len = p.len || 3;
    const cab = ctx.M('wood'), top = ctx.M('metal');
    B.box(cab, 0, 0, 0, len, 0.88, 0.6);
    B.box(top, 0, 0.88, 0.02, len + 0.04, 0.04, 0.64);
    B.box(cab, 0, 1.45, -0.12, len, 0.65, 0.35);
    B.box(ctx.M('metal_dark'), -len / 2 + 0.6, 0.86, 0.02, 0.5, 0.05, 0.4); // sink
    B.box(ctx.M('metal'), -len / 2 + 0.6, 0.92, -0.2, 0.04, 0.25, 0.04);
    // fridge
    B.box(ctx.M('plastic'), len / 2 + 0.4, 0, 0, 0.75, 1.85, 0.7);
    B.box(ctx.M('metal_dark'), len / 2 + 0.1, 0.9, 0.36, 0.03, 0.4, 0.03);
    ctx.collide(-len / 2, -0.32, len / 2 + 0.8, 0.36, { y1: 1.9 });
  });

  def('crt_tv', (ctx, p, B) => {
    B.box(ctx.M('wood'), 0, 0, 0, 0.9, 0.6, 0.5);
    B.push(0, 0.6, 0, 0, 1.6);
    B.box(ctx.M('plastic'), 0, 0, -0.02, 0.38, 0.32, 0.34);
    B.pop();
    ctx.collide(-0.45, -0.25, 0.45, 0.25, { y1: 1.2 });
    // dynamic screen
    const tex = DV.Tex.custom('tvscreen' + p.x, 64, 48, (c, w, h) => { c.fillStyle = '#122'; c.fillRect(0, 0, w, h); }, { wrap: 'clamp' });
    const mat = new THREE.MeshBasicMaterial({ map: tex, fog: true });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.38), mat);
    const [wx, wz] = ctx.toWorld(0, 0.255);
    scr.position.set(wx, 0.6 + 0.26, wz);
    scr.rotation.y = p.rot || 0;
    ctx.add(scr);
    const cv = tex.userData.canvas, c2 = cv.getContext('2d');
    let t = 0, frame = 0;
    const lines = ['FACTION NEWS', 'CHOOSING CEREMONY', 'TOMORROW 09:00', 'THE HUB — FLOOR 20', 'AMITY HARVEST', 'REPORT: FENCE PATROL', 'WEATHER: OVERCAST'];
    ctx.update((dt) => {
      t += dt;
      if (t < 0.12) return;
      t = 0; frame++;
      c2.fillStyle = '#0d1a22'; c2.fillRect(0, 0, 64, 48);
      c2.fillStyle = '#2e6fd6'; c2.fillRect(0, 0, 64, 10);
      c2.fillStyle = '#fff'; c2.font = 'bold 7px Arial'; c2.fillText('CITY BROADCAST', 3, 8);
      c2.fillStyle = '#cfe0ff'; c2.font = '7px Arial';
      const k = Math.floor(frame / 30) % lines.length;
      c2.fillText(lines[k], 3, 24);
      c2.fillText(lines[(k + 1) % lines.length], 3, 34);
      for (let y = 0; y < 48; y += 2) { c2.fillStyle = 'rgba(0,0,0,0.25)'; c2.fillRect(0, y, 64, 1); }
      c2.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.08 + ')'; c2.fillRect(0, 0, 64, 48);
      tex.needsUpdate = true;
    });
  });

  /* ------------------------------ plants ------------------------------ */
  function foliage(B, m, x, y, z, r, rng) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rng() * 0.5;
      const lx = x + Math.cos(a) * r * 0.45, lz = z + Math.sin(a) * r * 0.45;
      B.tri(m, [x, y, z], [lx + Math.cos(a + 1.2) * r * 0.3, y + r * 0.9, lz + Math.sin(a + 1.2) * r * 0.3], [lx + Math.cos(a) * r, y + r * 0.6 + rng() * 0.2, lz + Math.sin(a) * r], [0, 0], [1, 0], [1, 1]);
      B.tri(m, [x, y, z], [lx + Math.cos(a) * r, y + r * 0.6 + rng() * 0.2, lz + Math.sin(a) * r], [lx + Math.cos(a + 1.2) * r * 0.3, y + r * 0.9, lz + Math.sin(a + 1.2) * r * 0.3], [0, 0], [1, 0], [1, 1]);
    }
  }
  def('plant', (ctx, p, B) => {
    const s = p.size || 1;
    B.cyl(ctx.M('plastic_orange'), 0, 0, 0, 0.22 * s, 0.17 * s, 0.4 * s, 6, { topMat: ctx.M('dirt') });
    foliage(B, ctx.M('grass:dbl'), 0, 0.4 * s, 0, 0.7 * s, U.rng(p.x * 13 + p.z));
    foliage(B, ctx.M('grass:dbl'), 0, 0.55 * s, 0, 0.5 * s, U.rng(p.x * 7 + p.z * 3));
    ctx.collide(-0.24 * s, -0.24 * s, 0.24 * s, 0.24 * s, { y1: 0.9, camera: false });
  });
  def('planter', (ctx, p, B) => {
    const w = p.w || 2, d = p.d || 0.8, h = p.h || 0.5;
    B.box(ctx.M(p.mat || 'concrete'), 0, 0, 0, w, h, d, { skip: { top: 1 } });
    B.box(ctx.M(p.mat || 'concrete'), 0, h, -d / 2 + 0.05, w, 0.04, 0.1);
    B.box(ctx.M(p.mat || 'concrete'), 0, h, d / 2 - 0.05, w, 0.04, 0.1);
    B.flat(ctx.M('dirt'), -w / 2 + 0.08, -d / 2 + 0.08, w / 2 - 0.08, d / 2 - 0.08, h - 0.06);
    const r = U.rng(p.x * 31 + p.z * 17);
    const leaf = ctx.M(p.flowers ? 'plastic_orange:dbl' : 'grass:dbl');
    const n = Math.max(2, Math.floor(w * 1.5));
    for (let k = 0; k < n; k++) foliage(B, k % 3 === 0 && p.flowers ? ctx.M('grass:dbl') : leaf, -w / 2 + 0.3 + r() * (w - 0.6), h - 0.06, (r() - 0.5) * (d - 0.4), 0.35 + r() * 0.25, r);
    ctx.collide(-w / 2, -d / 2, w / 2, d / 2, { y1: h + 0.4, camera: false });
  });
  def('tree', (ctx, p, B) => {
    const s = p.size || 1;
    const bark = ctx.M('wood');
    B.cyl(bark, 0, 0, 0, 0.12 * s, 0.2 * s, 2.6 * s, 6);
    const leaf = ctx.M('grass:dbl');
    const r = U.rng(p.x * 11 + p.z * 5);
    for (let k = 0; k < 5; k++) {
      const y = (2.0 + k * 0.45) * s;
      const rad = (1.7 - k * 0.25) * s;
      B.cyl(leaf, (r() - 0.5) * 0.3, y, (r() - 0.5) * 0.3, rad * 0.35, rad, 0.7 * s, 7, { bottom: true });
    }
    ctx.collide(-0.22 * s, -0.22 * s, 0.22 * s, 0.22 * s, { y1: 3, camera: false });
  });
  def('garden_bed', (ctx, p, B) => {
    const w = p.w || 3, d = p.d || 1.2;
    const wood = ctx.M('wood');
    B.box(wood, 0, 0, -d / 2, w, 0.35, 0.08);
    B.box(wood, 0, 0, d / 2, w, 0.35, 0.08);
    B.box(wood, -w / 2, 0, 0, 0.08, 0.35, d);
    B.box(wood, w / 2, 0, 0, 0.08, 0.35, d);
    B.flat(ctx.M('dirt'), -w / 2 + 0.04, -d / 2 + 0.04, w / 2 - 0.04, d / 2 - 0.04, 0.3);
    const r = U.rng(p.x * 3 + p.z * 29);
    for (let row = 0; row < 2; row++) for (let k = 0; k < Math.floor(w / 0.4); k++) {
      const x = -w / 2 + 0.25 + k * 0.4, z = (row - 0.5) * d * 0.45;
      foliage(B, ctx.M(r() < 0.3 ? 'plastic_orange:dbl' : 'grass:dbl'), x, 0.3, z, 0.2 + r() * 0.1, r);
    }
    ctx.collide(-w / 2, -d / 2, w / 2, d / 2, { y1: 0.45, camera: false });
  });

  /* ------------------------------ structure ------------------------------ */
  def('column', (ctx, p, B) => {
    const s = p.size || 0.6, h = p.h || 4;
    const m = ctx.M(p.mat || 'concrete_panel');
    B.box(m, 0, 0, 0, s, h, s, { sub: 1.2 });
    B.box(ctx.M('metal_dark'), 0, 0, 0, s + 0.06, 0.12, s + 0.06);
    ctx.collide(-s / 2, -s / 2, s / 2, s / 2, { y1: h });
  });
  def('railing', (ctx, p, B) => {
    const len = p.len || 3, h = p.h || 1.0;
    const m = ctx.M('metal');
    const n = Math.max(1, Math.round(len / 1.2));
    for (let k = 0; k <= n; k++) B.box(m, -len / 2 + (len * k) / n, 0, 0, 0.05, h, 0.05);
    B.box(m, 0, h - 0.04, 0, len, 0.05, 0.06);
    B.box(m, 0, h * 0.5, 0, len, 0.03, 0.03);
    ctx.collide(-len / 2, -0.06, len / 2, 0.06, { y1: h, camera: false });
  });
  def('wall_block', (ctx, p, B) => {
    // freestanding partial wall / partition
    const w = p.w || 2, h = p.h || 2.5, d = p.d || 0.2;
    B.box(ctx.M(p.mat || 'concrete_panel'), 0, 0, 0, w, h, d, { sub: 1.2 });
    ctx.collide(-w / 2, -d / 2, w / 2, d / 2, { y1: h });
  });
  def('pipes', (ctx, p, B) => {
    const len = p.len || 6, y = p.y || 2.8, n = p.n || 2;
    const m = ctx.M(p.mat || 'metal_painted');
    for (let k = 0; k < n; k++) B.pipeX(m, 0, y - k * 0.16, k * 0.14, len, 0.06 - k * 0.01, 6);
    for (let x = -len / 2 + 0.5; x < len / 2; x += 2) B.box(ctx.M('metal_dark'), x, y - (n - 1) * 0.16 - 0.08, (n - 1) * 0.07, 0.04, 0.3, (n - 1) * 0.14 + 0.15);
  });
  def('duct', (ctx, p, B) => {
    const len = p.len || 6, y = p.y || 2.7;
    B.box(ctx.M('metal'), 0, y, 0, len, 0.35, 0.5);
    for (let x = -len / 2 + 1; x < len / 2; x += 1.5) B.box(ctx.M('metal_dark'), x, y - 0.02, 0, 0.04, 0.39, 0.54);
  });
  def('vent', (ctx, p, B) => {
    B.panel(ctx.M('vent'), 0, p.y || 2.4, 0.01, p.w || 0.6, p.h || 0.4);
  });
  def('ceiling_vent', (ctx, p, B) => {
    const y = p.y || 3;
    B.quad(ctx.M('vent'), [-0.3, y - 0.01, -0.3], [0.3, y - 0.01, -0.3], [0.3, y - 0.01, 0.3], [-0.3, y - 0.01, 0.3], [0, 0], [1, 0], [1, 1], [0, 1]);
  });

  /* ------------------------------ wall dressing ------------------------------ */
  def('sign', (ctx, p, B) => {
    const tex = DV.Tex.sign(p.text, { w: p.tw || 256, h: p.th || 64, bg: p.bg, color: p.color, arrow: p.arrow, stripe: p.stripe, size: p.size, border: p.border });
    const m = DV.Mat.fromTexture('sign|' + p.text + '|' + (p.bg || '') + (p.arrow || '') + (p.emit ? 'e' : ''), tex, { emit: !!p.emit });
    B.panel(m, 0, p.y || 2.4, 0.015, p.w || 1.6, p.h || 0.4);
    if (p.hanging) {
      B.box(ctx.M('metal_dark'), -(p.w || 1.6) / 2 + 0.1, (p.y || 2.4) + (p.h || 0.4) / 2, 0, 0.02, p.hanging, 0.02);
      B.box(ctx.M('metal_dark'), (p.w || 1.6) / 2 - 0.1, (p.y || 2.4) + (p.h || 0.4) / 2, 0, 0.02, p.hanging, 0.02);
      B.push(0, 0, 0, Math.PI); B.panel(m, 0, p.y || 2.4, 0.015, p.w || 1.6, p.h || 0.4); B.pop();
    }
  });
  def('poster', (ctx, p, B) => {
    const m = DV.Mat.fromTexture('poster|' + p.kind, DV.Tex.poster(p.kind), {});
    B.panel(m, 0, p.y || 1.6, 0.012, 0.6, 0.9);
  });
  def('banner', (ctx, p, B) => {
    const h = p.h || 3;
    const m = DV.Mat.fromTexture('banner|' + p.faction, DV.Tex.banner(p.faction), { alphaTest: 0.5, doubleSide: true });
    const y = p.y || 4.5;
    B.panel(m, 0, y - h / 2, 0.05, h * 0.4, h);
    B.box(ctx.M('metal_dark'), 0, y, 0.05, h * 0.45, 0.05, 0.05);
  });
  def('emblem', (ctx, p, B) => {
    const tex = DV.Tex.emblem(p.faction || 'seal', p.color || '#d8d2c0', p.bg || null, 256);
    const m = DV.Mat.fromTexture('emblem|' + (p.faction || 'seal') + (p.color || '') + (p.bg || ''), tex, { transparent: !p.bg, emit: !!p.emit });
    B.panel(m, 0, p.y || 3, 0.02, p.size || 2, p.size || 2);
  });
  def('floor_emblem', (ctx, p, B) => {
    const tex = DV.Tex.emblem('seal', p.color || '#b08a3a', p.bg || '#2c2a26', 256);
    const m = DV.Mat.fromTexture('flooremblem', tex, {});
    const s = (p.size || 4) / 2;
    B.flat(m, -s, -s, s, s, 0.012, { uv: 'unit' });
  });
  def('rug', (ctx, p, B) => {
    const w = (p.w || 3) / 2, d = (p.d || 2) / 2;
    B.flat(ctx.M(p.mat || 'carpet_red'), -w, -d, w, d, 0.01);
  });
  def('stripe', (ctx, p, B) => {
    const w = (p.w || 3) / 2, d = (p.d || 0.3) / 2;
    B.flat(ctx.M(p.mat || 'hazard'), -w, -d, w, d, 0.008);
  });
  def('noticeboard', (ctx, p, B) => {
    B.panel(ctx.M('corkboard'), 0, p.y || 1.6, 0.02, p.w || 1.6, p.h || 1.0);
    if (p.text) {
      const [x, z] = ctx.toWorld(0, 0.6);
      ctx.interact({ id: 'notice:' + (p.id || p.x + ',' + p.z), kind: 'examine', x, y: 1.5, z, radius: 1.5, label: 'Read', name: p.title || 'Notice Board', title: p.title || 'Notice Board', text: p.text });
    }
  });
  def('whiteboard', (ctx, p, B) => {
    B.panel(ctx.M('whiteboard'), 0, p.y || 1.5, 0.02, p.w || 2, p.h || 1);
  });
  def('mirror', (ctx, p, B) => {
    B.panel(ctx.M('mirror'), 0, p.y || 1.5, 0.015, p.w || 1.5, p.h || 0.9);
  });
  def('exit_sign', (ctx, p, B) => {
    const tex = DV.Tex.sign('EXIT', { w: 128, h: 48, bg: '#0c5a2a', color: '#d8ffd8', size: 30 });
    B.box(ctx.M('metal_dark'), 0, (p.y || 2.5) - 0.13, 0.05, 0.42, 0.26, 0.1);
    B.panel(DV.Mat.fromTexture('exitsign', tex, { emit: true }), 0, p.y || 2.5, 0.101, 0.4, 0.15);
  });
  def('extinguisher', (ctx, p, B) => {
    B.cyl(ctx.M('plastic_orange'), 0, 0.6, 0.1, 0.08, 0.08, 0.45, 6);
    B.box(ctx.M('metal_dark'), 0, 1.05, 0.1, 0.06, 0.08, 0.06);
    B.box(ctx.M('metal_dark'), 0, 0.55, 0.02, 0.2, 0.6, 0.02);
  });
  def('clock', (ctx, p, B) => {
    // static rim; hands are dynamic and show the game time
    const y = p.y || 2.6, s = p.size || 0.5;
    B.push(0, y, 0.03, 0);
    B.pushEuler(0, 0, 0, Math.PI / 2, 0, 0);
    B.cyl(ctx.M('metal_dark'), 0, -0.04, 0, s / 2 + 0.03, s / 2 + 0.03, 0.04, 12);
    B.cyl(ctx.M('white'), 0, 0.0, 0, s / 2, s / 2, 0.012, 12);
    B.pop(); B.pop();
    const group = new THREE.Group();
    const [wx, wz] = ctx.toWorld(0, 0.06);
    group.position.set(wx, y, wz);
    group.rotation.y = p.rot || 0;
    const hm = new THREE.MeshBasicMaterial({ color: 0x151515 });
    const hour = new THREE.Mesh(new THREE.BoxGeometry(0.025, s * 0.28, 0.01), hm);
    const minute = new THREE.Mesh(new THREE.BoxGeometry(0.018, s * 0.42, 0.01), hm);
    hour.geometry.translate(0, s * 0.12, 0);
    minute.geometry.translate(0, s * 0.19, 0);
    group.add(hour, minute);
    ctx.add(group);
    ctx.update(() => {
      const t = DV.Clock ? DV.Clock.minutes() : 480;
      minute.rotation.z = -((t % 60) / 60) * Math.PI * 2;
      hour.rotation.z = -(((t / 60) % 12) / 12) * Math.PI * 2;
    });
  });

  /* ------------------------------ clutter ------------------------------ */
  def('trash_bin', (ctx, p, B) => {
    B.cyl(ctx.M('metal_dark'), 0, 0, 0, 0.2, 0.17, 0.6, 7);
    ctx.collide(-0.2, -0.2, 0.2, 0.2, { y1: 0.6, camera: false });
  });
  def('crate', (ctx, p, B) => {
    const s = p.size || 0.8;
    B.box(ctx.M('wood'), 0, 0, 0, s, s, s);
    B.box(ctx.M('wood_light'), 0, s * 0.45, s / 2 + 0.005, s, 0.08, 0.01);
    if (p.stack) B.push(0.05, s, 0.05, 0.3), B.box(ctx.M('wood'), 0, 0, 0, s * 0.8, s * 0.8, s * 0.8), B.pop();
    ctx.collide(-s / 2, -s / 2, s / 2, s / 2, { y1: s * (p.stack ? 1.8 : 1) });
  });
  def('boxes', (ctx, p, B) => {
    const r = U.rng(p.x * 17 + p.z * 13);
    const m = ctx.M('wood_light');
    let y = 0;
    for (let k = 0; k < (p.n || 3); k++) {
      const s = 0.4 + r() * 0.25;
      B.push((r() - 0.5) * 0.15, y, (r() - 0.5) * 0.15, (r() - 0.5) * 0.4);
      B.box(m, 0, 0, 0, s, s * 0.7, s);
      B.pop();
      y += s * 0.7;
    }
    ctx.collide(-0.35, -0.35, 0.35, 0.35, { y1: y, camera: false });
  });
  def('mop_bucket', (ctx, p, B) => {
    B.box(ctx.M('plastic_orange'), 0, 0.05, 0, 0.45, 0.35, 0.35);
    B.box(ctx.M('metal_dark'), 0, 0, 0, 0.5, 0.06, 0.4);
    B.box(ctx.M('wood_light'), 0.1, 0.3, 0, 0.03, 1.2, 0.03);
    ctx.collide(-0.25, -0.2, 0.25, 0.2, { y1: 0.5, camera: false });
  });
  def('barrel', (ctx, p, B) => {
    B.cyl(ctx.M(p.mat || 'rust'), 0, 0, 0, 0.3, 0.3, 0.9, 8);
    ctx.collide(-0.3, -0.3, 0.3, 0.3, { y1: 0.9, camera: false });
  });
  def('pallet', (ctx, p, B) => {
    B.box(ctx.M('wood_light'), 0, 0, 0, 1.2, 0.14, 1.0);
    ctx.collide(-0.6, -0.5, 0.6, 0.5, { y1: 0.14 });
  });
  def('paper_stack', (ctx, p, B) => {
    const m = ctx.M('paper');
    for (let k = 0; k < (p.n || 4); k++) B.box(m, (k % 2) * 0.03, (p.y || 0) + k * 0.06, 0, 0.3, 0.06, 0.22);
  });

  /* ------------------------------ facility specific ------------------------------ */
  def('scanner_arch', (ctx, p, B) => {
    const m = ctx.M('plastic'), d = ctx.M('metal_dark');
    B.box(m, -0.55, 0, 0, 0.18, 2.2, 0.5);
    B.box(m, 0.55, 0, 0, 0.18, 2.2, 0.5);
    B.box(m, 0, 2.2, 0, 1.28, 0.22, 0.5);
    B.box(d, -0.55, 0, 0, 0.2, 0.08, 0.52);
    B.box(d, 0.55, 0, 0, 0.2, 0.08, 0.52);
    B.panel(ctx.M('crt_green:emit'), 0, 2.31, 0.252, 0.4, 0.12);
    ctx.collide(-0.66, -0.25, -0.44, 0.25, { y1: 2.4 });
    ctx.collide(0.44, -0.25, 0.66, 0.25, { y1: 2.4 });
  });
  def('stanchions', (ctx, p, B) => {
    const len = p.len || 3;
    const m = ctx.M('metal');
    const n = Math.max(1, Math.round(len / 1.5));
    for (let k = 0; k <= n; k++) {
      const x = -len / 2 + (len * k) / n;
      B.cyl(ctx.M('metal_dark'), x, 0, 0, 0.16, 0.16, 0.03, 6);
      B.cyl(m, x, 0.03, 0, 0.03, 0.03, 0.92, 5);
    }
    B.box(ctx.M('fabric_blue'), 0, 0.84, 0, len, 0.06, 0.02);
    ctx.collide(-len / 2, -0.08, len / 2, 0.08, { y1: 0.95, camera: false });
  });
  def('test_chair', (ctx, p, B) => {
    const m = ctx.M('fabric_grey'), metal = ctx.M('metal');
    B.box(metal, 0, 0, 0, 0.5, 0.06, 0.8);
    B.box(metal, 0, 0.06, 0, 0.12, 0.35, 0.12);
    // reclined seat
    B.box(m, 0, 0.42, 0.1, 0.6, 0.12, 0.7);
    B.pushEuler(0, 0.48, -0.25, -0.55, 0, 0);
    B.box(m, 0, 0, -0.04, 0.6, 0.8, 0.12);
    B.box(m, 0, 0.8, -0.04, 0.3, 0.2, 0.14);
    B.pop();
    B.pushEuler(0, 0.42, 0.45, 0.6, 0, 0);
    B.box(m, 0, -0.45, 0, 0.5, 0.5, 0.1);
    B.pop();
    B.box(metal, -0.33, 0.55, 0.05, 0.06, 0.06, 0.6);
    B.box(metal, 0.33, 0.55, 0.05, 0.06, 0.06, 0.6);
    ctx.collide(-0.38, -0.5, 0.38, 0.55, { y1: 1.2 });
    if (p.id) ctx.spot(p.id, 0, 0.1, 0, 'recline', { seatY: 0.5 });
  });
  def('console', (ctx, p, B) => {
    const w = p.w || 1.6;
    B.box(ctx.M('metal_dark'), 0, 0, 0, w, 0.8, 0.7);
    B.box(ctx.M('metal'), 0, 0.8, 0, w + 0.04, 0.04, 0.74);
    crt(B, ctx, -w / 4, 0.84, 0.05, Math.PI, 'crt_green');
    crt(B, ctx, w / 4, 0.84, 0.05, Math.PI, p.screen2 || 'crt_blue');
    B.box(ctx.M('plastic'), 0, 0.84, -0.22, 0.5, 0.025, 0.16);
    // blinking lights
    for (let k = 0; k < 6; k++) B.box(ctx.M(k % 2 ? 'crt_green:emit' : 'plastic_orange:emit'), -w / 2 + 0.15 + k * 0.07, 0.6, -0.355, 0.03, 0.03, 0.01);
    ctx.collide(-w / 2, -0.35, w / 2, 0.35, { y1: 1.3 });
    if (p.id) ctx.spot(p.id, 0, -0.62, 0, 'type', {});
  });
  def('serum_tray', (ctx, p, B) => {
    const m = ctx.M('metal');
    legs4(B, m, 0.5, 0.4, 0.85, 0.03);
    B.box(m, 0, 0.85, 0, 0.55, 0.03, 0.45);
    B.box(m, 0, 0.3, 0, 0.5, 0.02, 0.4);
    for (let k = 0; k < 4; k++) B.cyl(ctx.M('crt_blue:emit'), -0.15 + k * 0.08, 0.88, -0.1, 0.018, 0.018, 0.09, 5);
    B.box(ctx.M('white'), 0.12, 0.88, 0.08, 0.16, 0.02, 0.03); // syringe
    ctx.collide(-0.28, -0.22, 0.28, 0.22, { y1: 0.9, camera: false });
  });
  def('bed', (ctx, p, B) => {
    const m = ctx.M('metal'), sheet = ctx.M('white');
    legs4(B, m, 0.9, 2.0, 0.45, 0.04);
    B.box(m, 0, 0.42, 0, 0.92, 0.06, 2.02);
    B.box(sheet, 0, 0.48, 0.05, 0.85, 0.14, 1.9);
    B.box(sheet, 0, 0.62, -0.75, 0.6, 0.1, 0.35);
    B.box(m, 0, 0.45, -1.0, 0.92, 0.55, 0.04);
    B.box(ctx.M('fabric_blue'), 0, 0.625, 0.35, 0.87, 0.02, 1.2);
    ctx.collide(-0.46, -1.02, 0.46, 1.02, { y1: 0.9 });
    if (p.id) ctx.spot(p.id, 0, 0.1, Math.PI, 'lie', { seatY: 0.62 });
  });
  def('curtain', (ctx, p, B) => {
    const len = p.len || 2.2;
    B.box(ctx.M('metal'), 0, 2.2, 0, len, 0.03, 0.03);
    const m = ctx.M('fabric_blue:dbl');
    const n = Math.round(len / 0.3);
    for (let k = 0; k < n; k++) {
      const x0 = -len / 2 + (len * k) / n, x1 = -len / 2 + (len * (k + 1)) / n;
      const zz = k % 2 ? 0.06 : -0.06;
      B.quad(m, [x0, 0.25, 0], [x1, 0.25, zz], [x1, 2.18, zz], [x0, 2.18, 0], [0, 0], [1, 0], [1, 3], [0, 3]);
    }
    ctx.collide(-len / 2, -0.07, len / 2, 0.07, { y1: 2.2, camera: false });
  });
  def('med_cabinet', (ctx, p, B) => {
    B.box(ctx.M('white'), 0, 0, 0, 1.0, 1.9, 0.45);
    B.box(ctx.M('white:glass'), 0, 1.0, 0.23, 0.9, 0.8, 0.01);
    for (let k = 0; k < 3; k++) B.box(ctx.M('metal'), 0, 1.05 + k * 0.27, 0, 0.92, 0.02, 0.4);
    B.panel(DV.Mat.fromTexture('medcross', DV.Tex.sign('+', { w: 64, h: 64, bg: '#f2f2f2', color: '#c02020', size: 48, border: false }), {}), 0, 0.7, 0.23, 0.25, 0.25);
    ctx.collide(-0.5, -0.23, 0.5, 0.23, { y1: 1.9 });
  });
  def('server_rack', (ctx, p, B) => {
    B.box(ctx.M('metal_dark'), 0, 0, 0, 0.7, 2.1, 1.0, { faces: { pz: ctx.M('server:emit') }, uv: 'unit' });
    ctx.collide(-0.35, -0.5, 0.35, 0.5, { y1: 2.1 });
  });
  def('boiler', (ctx, p, B) => {
    B.cyl(ctx.M('metal_painted'), 0, 0, 0, 0.8, 0.8, 2.4, 10);
    B.cyl(ctx.M('metal_dark'), 0, 2.4, 0, 0.2, 0.8, 0.3, 10);
    B.cyl(ctx.M('metal'), 0, 2.7, 0, 0.12, 0.12, 1.0, 6);
    B.box(ctx.M('metal_dark'), 0, 1.0, 0.78, 0.4, 0.4, 0.1);
    B.panel(ctx.M('crt_green:emit'), 0, 1.25, 0.84, 0.18, 0.1);
    ctx.collide(-0.8, -0.8, 0.8, 0.8, { y1: 3 });
  });
  def('electrical_panel', (ctx, p, B) => {
    B.box(ctx.M('metal_painted'), 0, 0.6, 0.0, 0.8, 1.2, 0.25);
    B.box(ctx.M('hazard'), 0, 1.65, 0.12, 0.8, 0.08, 0.02);
    for (let k = 0; k < 4; k++) B.box(ctx.M('metal_dark'), -0.25 + k * 0.17, 1.1, 0.13, 0.08, 0.2, 0.03);
    ctx.collide(-0.4, -0.12, 0.4, 0.14, { y1: 1.8 });
  });
  def('status_board', (ctx, p, B) => {
    // big departure-style board with a dynamic canvas
    const w = p.w || 4, h = p.h || 1.4, y = p.y || 3.4;
    B.box(ctx.M('metal_dark'), 0, y - h / 2 - 0.08, 0.06, w + 0.16, h + 0.16, 0.12);
    const tex = DV.Tex.custom('statusboard', 256, 96, (c, cw, ch) => { c.fillStyle = '#000'; c.fillRect(0, 0, cw, ch); }, { wrap: 'clamp' });
    tex.magFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({ map: tex, fog: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const [wx, wz] = ctx.toWorld(0, 0.125);
    mesh.position.set(wx, y, wz);
    mesh.rotation.y = p.rot || 0;
    ctx.add(mesh);
    const cv = tex.userData.canvas, c = cv.getContext('2d');
    let acc = 99;
    ctx.update((dt) => {
      acc += dt;
      if (acc < 1) return;
      acc = 0;
      c.fillStyle = '#0b0c0d'; c.fillRect(0, 0, 256, 96);
      c.fillStyle = '#d8a24a'; c.font = 'bold 11px "Courier New", monospace';
      c.fillText('APTITUDE TESTING — STATUS', 6, 13);
      const t = DV.Clock ? DV.Clock.minutes() : 480;
      c.fillText(DV.U.formatTime(t), 212, 13);
      c.fillStyle = '#333'; c.fillRect(4, 17, 248, 1);
      const groups = DV.Game && DV.Game.testingGroups ? DV.Game.testingGroups() : [];
      c.font = '10px "Courier New", monospace';
      groups.slice(0, 6).forEach((g, k) => {
        c.fillStyle = '#c8c0a8';
        c.fillText(g.name, 6, 31 + k * 11);
        c.fillStyle = g.color || '#7fd07f';
        c.fillText(g.status, 150, 31 + k * 11);
      });
      for (let yy = 0; yy < 96; yy += 2) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, yy, 256, 1); }
      tex.needsUpdate = true;
    });
  });
  def('kiosk', (ctx, p, B) => {
    B.box(ctx.M('metal_dark'), 0, 0, 0, 0.6, 1.0, 0.5);
    B.pushEuler(0, 1.0, 0.05, -0.5, 0, 0);
    B.box(ctx.M('metal_dark'), 0, 0, 0, 0.62, 0.45, 0.06);
    B.panel(ctx.M('crt_blue:emit'), 0, 0.225, 0.031, 0.5, 0.36);
    B.pop();
    ctx.collide(-0.3, -0.25, 0.3, 0.25, { y1: 1.4 });
    const [x, z] = ctx.toWorld(0, 0.7);
    ctx.interact({ id: 'kiosk:' + (p.id || p.x), kind: 'action', action: 'kiosk', x, y: 1.1, z, radius: 1.3, label: 'Use', name: 'Information Kiosk' });
  });
  def('lostfound_bin', (ctx, p, B) => {
    B.box(ctx.M('metal_painted'), 0, 0, 0, 0.9, 0.75, 0.6);
    B.box(ctx.M('metal_dark'), 0, 0.75, 0, 0.92, 0.04, 0.62);
    const t = DV.Tex.sign('LOST & FOUND', { w: 256, h: 48, bg: '#e8e0c8', color: '#222', size: 24 });
    B.panel(DV.Mat.fromTexture('lostfound', t, {}), 0, 0.5, 0.305, 0.7, 0.14);
    ctx.collide(-0.45, -0.3, 0.45, 0.3, { y1: 0.8, camera: false });
    const [x, z] = ctx.toWorld(0, 0.65);
    ctx.interact({ id: p.id || 'lostfound', kind: 'action', action: 'lostfound', x, y: 0.9, z, radius: 1.3, label: 'Search', name: 'Lost & Found Bin' });
  });
  def('stalls', (ctx, p, B) => {
    // stalls extend backwards (local -z) from a door line at z = 0
    const n = p.n || 3, sw = 1.0, d = 1.5;
    const m = ctx.M('metal_painted');
    for (let k = 0; k <= n; k++) B.box(m, -(n * sw) / 2 + k * sw, 0.15, -d / 2, 0.04, 1.9, d);
    for (let k = 0; k < n; k++) {
      const x = -(n * sw) / 2 + (k + 0.5) * sw;
      B.box(ctx.M('metal'), x, 0.15, -0.02, sw - 0.08, 1.85, 0.04);
    }
    ctx.collide(-(n * sw) / 2, -d, (n * sw) / 2, 0.02, { y1: 2.1 });
  });
  def('sinks', (ctx, p, B) => {
    const n = p.n || 3, len = n * 0.9;
    B.box(ctx.M('tile_white'), 0, 0, 0, len, 0.85, 0.55);
    B.box(ctx.M('white'), 0, 0.85, 0.02, len, 0.05, 0.58);
    for (let k = 0; k < n; k++) {
      const x = -len / 2 + 0.45 + k * 0.9;
      B.box(ctx.M('metal_dark'), x, 0.86, 0.05, 0.4, 0.05, 0.32);
      B.box(ctx.M('metal'), x, 0.9, -0.18, 0.04, 0.22, 0.04);
    }
    B.panel(ctx.M('mirror'), 0, 1.55, -0.27, len - 0.2, 0.8);
    ctx.collide(-len / 2, -0.28, len / 2, 0.3, { y1: 0.95 });
  });
  def('copier', (ctx, p, B) => {
    B.box(ctx.M('plastic'), 0, 0, 0, 1.1, 0.95, 0.65);
    B.box(ctx.M('metal_dark'), 0, 0.95, -0.05, 1.0, 0.08, 0.55);
    B.box(ctx.M('plastic'), 0.2, 1.03, 0.05, 0.5, 0.04, 0.4);
    B.panel(ctx.M('crt_green:emit'), -0.35, 0.85, 0.33, 0.15, 0.08);
    for (let k = 0; k < 3; k++) B.box(ctx.M('metal_dark'), 0, 0.15 + k * 0.22, 0.326, 0.9, 0.02, 0.01);
    ctx.collide(-0.55, -0.33, 0.55, 0.33, { y1: 1.1 });
  });
  def('monitor_wall', (ctx, p, B) => {
    // bank of CCTV monitors on a shelf against a wall (front +z)
    const n = p.n || 3;
    B.box(ctx.M('metal_dark'), 0, 0.9, 0, n * 0.55 + 0.1, 0.05, 0.5);
    B.box(ctx.M('metal_dark'), 0, 1.38, -0.05, n * 0.55 + 0.1, 0.04, 0.45);
    for (let k = 0; k < n; k++) {
      const x = -(n - 1) * 0.275 + k * 0.55;
      DV.Props.crt(B, ctx, x, 0.95, 0.0, 0, 'crt_cctv', 1.0);
      DV.Props.crt(B, ctx, x, 1.42, -0.02, 0, k % 2 ? 'crt_cctv' : 'crt_green', 0.95);
    }
    ctx.collide(-(n * 0.55) / 2 - 0.05, -0.25, (n * 0.55) / 2 + 0.05, 0.25, { y1: 1.9 });
  });
  def('projector_screen', (ctx, p, B) => {
    B.box(ctx.M('metal_dark'), 0, 2.6, 0.08, 2.6, 0.12, 0.12);
    B.panel(ctx.M('white'), 0, 1.85, 0.07, 2.4, 1.4);
  });

  /* ------------------------------ exterior ------------------------------ */
  def('bus_shelter', (ctx, p, B) => {
    const m = ctx.M('metal_dark'), g = ctx.M('white:glass');
    for (const [x, z] of [[-1.8, -0.7], [1.8, -0.7], [-1.8, 0.7], [1.8, 0.7]]) B.box(m, x, 0, z, 0.08, 2.5, 0.08);
    B.box(m, 0, 2.5, 0, 3.9, 0.08, 1.7);
    B.quad(g, [-1.8, 0.3, -0.7], [1.8, 0.3, -0.7], [1.8, 2.4, -0.7], [-1.8, 2.4, -0.7], [0, 0], [1, 0], [1, 1], [0, 1]);
    B.quad(g, [-1.8, 0.3, 0.7], [-1.8, 0.3, -0.7], [-1.8, 2.4, -0.7], [-1.8, 2.4, 0.7], [0, 0], [1, 0], [1, 1], [0, 1]);
    B.box(ctx.M('wood'), 0, 0.45, -0.4, 3.0, 0.05, 0.4);
    B.box(m, -1.2, 0, -0.4, 0.05, 0.45, 0.3);
    B.box(m, 1.2, 0, -0.4, 0.05, 0.45, 0.3);
    const t = DV.Tex.sign('ROUTE 5 — TESTING DISTRICT', { w: 256, h: 40, bg: '#2a4a6a', size: 16 });
    B.panel(DV.Mat.fromTexture('bussign', t, {}), 0, 2.38, 0.71, 2.0, 0.25);
    ctx.collide(-1.85, -0.75, 1.85, -0.65, { y1: 2.5 });
    ctx.collide(-1.85, -0.75, -1.75, 0.75, { y1: 2.5 });
    ctx.collide(-1.25, -0.6, 1.25, -0.2, { y1: 0.5 });
    for (let k = 0; k < 3; k++) {
      const s = ctx.spot((p.id || 'shelter') + '_s' + k, -0.9 + k * 0.9, -0.4, 0, 'sit', { seatY: 0.48 });
      seatInteract(ctx, s, 'Bench');
    }
  });
  def('lamp_post', (ctx, p, B) => {
    const m = ctx.M('metal_dark');
    B.cyl(m, 0, 0, 0, 0.07, 0.1, 4.5, 6);
    B.box(m, 0.4, 4.4, 0, 0.9, 0.08, 0.1);
    B.box(m, 0.8, 4.25, 0, 0.4, 0.15, 0.25);
    B.quad(ctx.M('light_panel:emit'), [0.62, 4.24, -0.1], [0.98, 4.24, -0.1], [0.98, 4.24, 0.1], [0.62, 4.24, 0.1], [0, 0], [1, 0], [1, 1], [0, 1]);
    ctx.collide(-0.12, -0.12, 0.12, 0.12, { y1: 4.5, camera: false });
  });
  def('flagpole', (ctx, p, B) => {
    B.cyl(ctx.M('metal'), 0, 0, 0, 0.04, 0.06, 7, 6);
    B.box(ctx.M('concrete'), 0, 0, 0, 0.6, 0.3, 0.6);
    const tex = DV.Tex.banner(p.faction || 'abnegation');
    const m = DV.Mat.fromTexture('flag|' + p.faction, tex, { alphaTest: 0.5, doubleSide: true });
    // flag flies sideways from the pole; the tall banner texture is laid on its side
    const fy0 = 5.95, fy1 = 6.85, fl = 1.5;
    B.quad(m, [0.05, fy1, 0], [0.05, fy0, 0], [0.05 + fl, fy0 + 0.05, 0.08], [0.05 + fl, fy1 + 0.05, 0.08], [0, 1], [1, 1], [1, 0], [0, 0]);
    ctx.collide(-0.3, -0.3, 0.3, 0.3, { y1: 2, camera: false });
  });
  def('bollard', (ctx, p, B) => {
    B.cyl(ctx.M('concrete'), 0, 0, 0, 0.18, 0.2, 0.8, 6);
    ctx.collide(-0.2, -0.2, 0.2, 0.2, { y1: 0.8, camera: false });
  });
  def('jersey_barrier', (ctx, p, B) => {
    const len = p.len || 3;
    const m = ctx.M('concrete');
    B.box(m, 0, 0, 0, len, 0.25, 0.6);
    B.box(m, 0, 0.25, 0, len, 0.6, 0.25);
    B.box(ctx.M('hazard'), 0, 0.6, 0.13, len, 0.15, 0.01);
    ctx.collide(-len / 2, -0.3, len / 2, 0.3, { y1: 0.85, camera: false });
  });
  def('bus', (ctx, p, B) => {
    const L = 10, Wd = 2.5, H = 3;
    const body = ctx.M('metal_painted'), dark = ctx.M('glass_dark');
    B.box(body, 0, 0.45, 0, Wd, H - 0.45, L, { sub: 2 });
    for (const zz of [-3.4, 3.4]) for (const xx of [-Wd / 2, Wd / 2]) B.cyl(ctx.M('black'), xx, 0, zz, 0.45, 0.45, 0.01, 8);
    for (let k = 0; k < 6; k++) {
      B.box(dark, -Wd / 2 - 0.01, 1.55, -4 + k * 1.5, 0.02, 0.8, 1.3);
      B.box(dark, Wd / 2 + 0.01, 1.55, -4 + k * 1.5, 0.02, 0.8, 1.3);
    }
    B.box(dark, 0, 1.3, L / 2 + 0.01, Wd - 0.3, 1.2, 0.02);
    B.box(ctx.M('black'), -Wd / 2, 0.1, 0, 0.1, 0.55, L - 1);
    B.box(ctx.M('black'), Wd / 2, 0.1, 0, 0.1, 0.55, L - 1);
    const t = DV.Tex.sign('TESTING DISTRICT', { w: 256, h: 40, bg: '#111', color: '#f0b030', size: 20 });
    B.panel(DV.Mat.fromTexture('busdest', t, { emit: true }), 0, 2.75, L / 2 + 0.02, 1.8, 0.28);
    ctx.collide(-Wd / 2, -L / 2, Wd / 2, L / 2, { y1: H });
  });
  def('car', (ctx, p, B) => {
    const body = ctx.M(p.mat || 'rust'), dark = ctx.M('glass_dark');
    B.box(body, 0, 0.3, 0, 1.8, 0.65, 4.2);
    B.box(body, 0, 0.95, -0.2, 1.6, 0.5, 2.2);
    B.box(dark, 0, 1.0, 0.92, 1.5, 0.4, 0.02);
    B.box(dark, -0.81, 1.0, -0.2, 0.02, 0.38, 2.0);
    B.box(dark, 0.81, 1.0, -0.2, 0.02, 0.38, 2.0);
    for (const zz of [-1.4, 1.4]) for (const xx of [-0.9, 0.9]) B.cyl(ctx.M('black'), xx, 0, zz, 0.32, 0.32, 0.01, 7);
    ctx.collide(-0.9, -2.1, 0.9, 2.1, { y1: 1.4 });
  });
  def('monolith', (ctx, p, B) => {
    B.box(ctx.M('concrete_panel'), 0, 0, 0, 3.2, 2.2, 0.6, { sub: 1 });
    const t = DV.Tex.sign(p.text || 'APTITUDE TESTING CENTER', { w: 512, h: 128, bg: '#2c2c2a', color: '#e0d8c0', size: 34 });
    B.panel(DV.Mat.fromTexture('mono|' + p.text, t, {}), 0, 1.3, 0.31, 2.9, 0.7);
    B.push(0, 0, 0, Math.PI); B.panel(DV.Mat.fromTexture('mono|' + p.text, t, {}), 0, 1.3, 0.31, 2.9, 0.7); B.pop();
    ctx.collide(-1.6, -0.3, 1.6, 0.3, { y1: 2.2 });
  });
  def('fountain', (ctx, p, B) => {
    const r = p.r || 2.2;
    const m = ctx.M('concrete');
    B.cyl(m, 0, 0, 0, r, r + 0.1, 0.55, 12, { noTop: true });
    B.cyl(ctx.M('concrete_dark'), 0, 0, 0, r - 0.25, r - 0.25, 0.5, 12, { noSides: true });
    B.cyl(m, 0, 0, 0, 0.35, 0.45, 1.6, 8);
    B.cyl(m, 0, 1.6, 0, 0.9, 0.5, 0.25, 10);
    B.flat(ctx.M('dirt'), -0.5, -0.5, 0.5, 0.5, 0.52);
    ctx.collide(-r, -r, r, r, { y1: 0.55, camera: false });
    ctx.collide(-0.5, -0.5, 0.5, 0.5, { y1: 1.9, camera: false });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const s = ctx.spot((p.id || 'fountain') + '_s' + k, Math.cos(a) * (r + 0.05), Math.sin(a) * (r + 0.05), Math.atan2(Math.cos(a), Math.sin(a)), 'sit', { seatY: 0.55 });
      seatInteract(ctx, s, 'Fountain ledge');
    }
  });
  def('sculpture', (ctx, p, B) => {
    const m = ctx.M('metal');
    B.box(ctx.M('concrete_panel'), 0, 0, 0, 1.4, 0.8, 1.4);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      B.pushEuler(Math.cos(a) * 0.3, 0.8, Math.sin(a) * 0.3, 0.25 * Math.sin(a), a, 0.25 * Math.cos(a));
      B.box(m, 0, 0, 0, 0.12, 2.2 + (k % 2) * 0.5, 0.12);
      B.pop();
    }
    const t = DV.Tex.sign('UNITY OF THE FIVE', { w: 256, h: 40, bg: '#3a3a36', size: 18 });
    B.panel(DV.Mat.fromTexture('sculptsign', t, {}), 0, 0.45, 0.705, 1.2, 0.2);
    ctx.collide(-0.7, -0.7, 0.7, 0.7, { y1: 3 });
    if (p.text) {
      const [x, z] = ctx.toWorld(0, 1.2);
      ctx.interact({ id: 'sculpt', kind: 'examine', x, y: 1, z, radius: 1.4, label: 'Read plaque', name: 'Sculpture', title: 'Unity of the Five', text: p.text });
    }
  });
  def('picnic_table', (ctx, p, B) => {
    const w = ctx.M('wood');
    B.box(w, 0, 0.72, 0, 2.0, 0.05, 0.8);
    for (const z of [-0.65, 0.65]) B.box(w, 0, 0.42, z, 2.0, 0.05, 0.3);
    for (const x of [-0.8, 0.8]) { B.box(ctx.M('metal_dark'), x, 0, 0, 0.06, 0.72, 0.06); B.box(ctx.M('metal_dark'), x, 0.38, 0, 0.06, 0.04, 1.6); }
    ctx.collide(-1.0, -0.8, 1.0, 0.8, { y1: 0.8 });
    for (let k = 0; k < 2; k++) {
      const s1 = ctx.spot((p.id || 'picnic') + '_a' + k, -0.5 + k, -0.68, 0, 'sit', { seatY: 0.46, approachLocal: [-0.5 + k, -1.35] });
      const s2 = ctx.spot((p.id || 'picnic') + '_b' + k, -0.5 + k, 0.68, Math.PI, 'sit', { seatY: 0.46, approachLocal: [-0.5 + k, 1.35] });
      seatInteract(ctx, s1, 'Picnic bench');
      seatInteract(ctx, s2, 'Picnic bench');
    }
  });
  def('rubble', (ctx, p, B) => {
    const r = U.rng(p.x * 5 + p.z * 9);
    const m = ctx.M('concrete_dark');
    for (let k = 0; k < (p.n || 6); k++) {
      const s = 0.2 + r() * 0.5;
      B.push((r() - 0.5) * 1.6, 0, (r() - 0.5) * 1.6, r() * 3);
      B.box(m, 0, 0, 0, s, s * 0.6, s * 0.8);
      B.pop();
    }
    if (p.collide) ctx.collide(-0.9, -0.9, 0.9, 0.9, { y1: 0.6, camera: false });
  });
  def('backdrop', (ctx, p, B) => {
    // flat painted building facade seen through windows / beyond fences
    const w = p.w || 20, h = p.h || 14;
    B.panel(ctx.M(p.mat || 'facade'), 0, h / 2, 0, w, h, {});
  });
})();
