/* ==========================================================================
   DIVERGENT — procedural texture library
   Every texture is painted on a canvas at load (lazily, the first time
   something asks for it), so the game needs no external image assets.
   The surfaces are painted the way a texture artist of the day would have
   done it by hand: a base, a layer of fractal noise for the body of the
   material, the structure (bricks, slabs, panels, planks, tiles), then the
   life of the place on top: chipped edges, dirt in the joints, stains, rust
   and water running down from whatever sticks out, soot, wear where feet
   and hands go. Textures are cached by name.
   texture.userData.world = size in meters of one texture tile (for UVs).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const cache = {};
  const defs = {};

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  // (painted in memory: the passes below read the pixels back, which a GPU-backed canvas makes slow)
  const ctx2d = (cv) => cv.getContext('2d', { willReadFrequently: true });

  // ---------- painting helpers ----------
  function speckle(ctx, w, h, rng, count, colors, size) {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
      const s = size || 1;
      ctx.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), s, s);
    }
  }
  function noise(ctx, w, h, rng, strength) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * strength;
      d[i] += n; d[i + 1] += n; d[i + 2] += n; // (the array clamps)
    }
    ctx.putImageData(img, 0, 0);
  }
  // draws fn(ox, oy) once, and again shifted a tile over wherever (x, y, r) crosses an edge, so it tiles
  function wrap(w, h, x, y, r, fn) {
    fn(0, 0);
    const ex = x - r < 0 ? w : x + r > w ? -w : 0, ey = y - r < 0 ? h : y + r > h ? -h : 0;
    if (ex) fn(ex, 0);
    if (ey) fn(0, ey);
    if (ex && ey) fn(ex, ey);
  }
  function blotches(ctx, w, h, rng, count, color, rMin, rMax) {
    for (let i = 0; i < count; i++) {
      const x = rng() * w, y = rng() * h, r = rMin + rng() * (rMax - rMin);
      wrap(w, h, x, y, r, (ox, oy) => {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      });
    }
  }
  // a crack: a jagged line that wanders and forks, with a lit lip along one side
  function crack(ctx, w, h, rng, x, y, ang, len, color, lw, depth) {
    const pts = [[x, y]];
    let a = ang;
    for (let s = 0; s < len; s += 3 + rng() * 4) {
      a += (rng() - 0.5) * 0.9;
      x += Math.cos(a) * (3 + rng() * 4); y += Math.sin(a) * (3 + rng() * 4);
      pts.push([x, y]);
      if ((depth || 0) < 2 && rng() < 0.08) crack(ctx, w, h, rng, x, y, a + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.7), len * 0.4, color, Math.max(0.6, lw * 0.7), (depth || 0) + 1);
    }
    const r = len + 4;
    wrap(w, h, pts[0][0], pts[0][1], r, (ox, oy) => {
      ctx.lineWidth = lw; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,250,240,0.12)';
      ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px + ox + 1, py + oy + 1) : ctx.moveTo(px + ox + 1, py + oy + 1))); ctx.stroke();
      ctx.strokeStyle = color;
      ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px + ox, py + oy) : ctx.moveTo(px + ox, py + oy))); ctx.stroke();
    });
  }
  function cracks(ctx, w, h, rng, count, color) {
    for (let i = 0; i < count; i++) crack(ctx, w, h, rng, rng() * w, rng() * h, rng() * 6.28, 10 + rng() * 30, color, 1);
  }
  function grid(ctx, w, h, cols, rows, color, lw) {
    ctx.fillStyle = color;
    const cw = w / cols, rh = h / rows;
    for (let i = 0; i <= cols; i++) ctx.fillRect(Math.round(i * cw) - (i === cols ? lw : 0), 0, lw, h);
    for (let j = 0; j <= rows; j++) ctx.fillRect(0, Math.round(j * rh) - (j === rows ? lw : 0), w, lw);
  }
  const rgba = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (+a).toFixed(3) + ')';
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  // Tileable fractal value noise over a w × h canvas, 0..1 (stretched to its full range): `cells`
  // lattice cells across at the coarsest octave, twice as many each octave after, `gain` the weight
  // carried from one octave to the next.
  // (sy: how much faster it varies down than across, for grain that runs along something)
  function fbm(w, h, rng, cells, oct, gain, sy) {
    const out = new Float32Array(w * h);
    if (gain === undefined) gain = 0.5;
    const xs0 = new Int32Array(w), xs1 = new Int32Array(w), xt = new Float32Array(w);
    let amp = 1;
    for (let o = 0; o < oct; o++) {
      const cx = Math.max(1, Math.round(cells * (1 << o))), cy = Math.max(1, Math.round(((cx * h) / w) * (sy || 1)));
      const lat = new Float32Array(cx * cy);
      for (let i = 0; i < lat.length; i++) lat[i] = rng();
      for (let x = 0; x < w; x++) { const f = (x / w) * cx, i0 = Math.floor(f); xs0[x] = i0 % cx; xs1[x] = (i0 + 1) % cx; xt[x] = smooth(f - i0); }
      for (let y = 0; y < h; y++) {
        const f = (y / h) * cy, j0 = Math.floor(f), ty = smooth(f - j0), r0 = (j0 % cy) * cx, r1 = ((j0 + 1) % cy) * cx;
        for (let x = 0, i = y * w; x < w; x++, i++) {
          const t = xt[x], a = lat[r0 + xs0[x]], b = lat[r0 + xs1[x]], c = lat[r1 + xs0[x]], d = lat[r1 + xs1[x]];
          const top = a + (b - a) * t;
          out[i] += amp * (top + (c + (d - c) * t - top) * ty);
        }
      }
      amp *= gain;
    }
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < out.length; i++) { if (out[i] < lo) lo = out[i]; if (out[i] > hi) hi = out[i]; }
    const k = 1 / (hi - lo || 1);
    for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) * k;
    return out;
  }
  // a per-pixel pass over the canvas's bytes: fn(d, i, x, y), the array clamping what it writes
  function pass(ctx, w, h, fn) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) fn(d, i, x, y);
    ctx.putImageData(img, 0, 0);
  }
  // the body of a material: lighter and darker by a noise field (amt: ± the fraction at its extremes)
  function shadeBy(ctx, w, h, f, amt) {
    pass(ctx, w, h, (d, i, x, y) => {
      const k = 1 + (f[y * w + x] - 0.5) * 2 * amt;
      d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
    });
  }
  // a stain where a noise field rises past `lo` (soft over `soft`): damp, moss, oil, rust, soot
  function stainBy(ctx, w, h, f, lo, soft, rgb, alpha) {
    pass(ctx, w, h, (d, i, x, y) => {
      const a = smooth((f[y * w + x] - lo) / soft) * alpha;
      if (a <= 0) return;
      d[i] += (rgb[0] - d[i]) * a; d[i + 1] += (rgb[1] - d[i + 1]) * a; d[i + 2] += (rgb[2] - d[i + 2]) * a;
    });
  }
  // grain: every pixel a shade apart, and the odd darker pore and lighter fleck
  function grain(ctx, w, h, rng, amt, pores, flecks) {
    pass(ctx, w, h, (d, i) => {
      const q = rng();
      let k = 1 + (rng() - 0.5) * amt;
      if (q < (pores || 0)) k *= 0.62 + rng() * 0.2;
      else if (q > 1 - (flecks || 0)) k *= 1.18 + rng() * 0.15;
      d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
    });
  }
  // water, rust or soot running down a wall from (x, y): a thin streak that wanders a little, fading out
  function run(ctx, w, h, rng, x, y, len, wd, rgb, a) {
    const segs = 3 + Math.floor(len / 24);
    wrap(w, h, x, y + len / 2, Math.max(len / 2, wd) + 2, (ox, oy) => {
      let px = x + ox;
      for (let s = 0; s < segs; s++) {
        const y0 = y + oy + (len * s) / segs, y1 = y + oy + (len * (s + 1)) / segs;
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, rgba(rgb, a * (1 - s / segs)));
        g.addColorStop(1, rgba(rgb, a * (1 - (s + 1) / segs)));
        ctx.fillStyle = g;
        ctx.fillRect(px, y0, wd, y1 - y0 + 0.5);
        px += (rng() - 0.5) * 1.2;
      }
    });
  }
  function runs(ctx, w, h, rng, n, rgb, aMax, lenMin, lenMax, wdMax, yOf) {
    for (let k = 0; k < n; k++) {
      const len = lenMin + rng() * (lenMax - lenMin);
      run(ctx, w, h, rng, rng() * w, yOf ? yOf(rng) : rng() * h, len, 1 + rng() * ((wdMax || 3) - 1), rgb, aMax * (0.35 + 0.65 * rng()));
    }
  }
  // an irregular blob (a patch, a spall, a chip, a puddle of oil): a wobbly polygon round (x, y)
  function blob(ctx, x, y, rx, ry, rng, n) {
    n = n || 9;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, q = 0.65 + rng() * 0.5;
      const px = x + Math.cos(a) * rx * q, py = y + Math.sin(a) * ry * q;
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  function def(name, w, h, world, painter, opts) {
    defs[name] = { w, h, world, painter, opts: opts || {} };
  }

  /* ------------------------------ surfaces ------------------------------ */
  // poured concrete: mottled where the mix settled, pores and the odd chip of aggregate showing,
  // damp patches, a hairline crack or two
  function concreteBody(c, w, h, r, base, o) {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    shadeBy(c, w, h, fbm(w, h, r, 2, 6, 0.55), o.mottle || 0.12);
    shadeBy(c, w, h, fbm(w, h, r, 16, 3, 0.6), 0.05);
    stainBy(c, w, h, fbm(w, h, r, 3, 5, 0.6), 0.62, 0.25, o.stain || [70, 66, 58], o.stainA || 0.35);
    grain(c, w, h, r, o.grain || 0.1, o.pores || 0.012, o.flecks || 0.006);
  }
  def('concrete', 256, 256, 2.5, (c, w, h, r) => {
    concreteBody(c, w, h, r, '#8b8984', {});
    for (let i = 0; i < 40; i++) { c.fillStyle = rgba(r() < 0.6 ? [70, 68, 63] : [172, 170, 163], 0.5); c.beginPath(); c.arc(r() * w, r() * h, 0.6 + r() * 1.1, 0, 6.3); c.fill(); } // aggregate
    for (let i = 0; i < 3; i++) crack(c, w, h, r, r() * w, r() * h, r() * 6.3, 20 + r() * 50, 'rgba(38,36,33,0.5)', 1);
  });
  def('concrete_dark', 256, 256, 2.5, (c, w, h, r) => {
    concreteBody(c, w, h, r, '#5c5b57', { mottle: 0.16, stain: [28, 27, 25], stainA: 0.45, grain: 0.13, pores: 0.02 });
    blotches(c, w, h, r, 4, 'rgba(16,16,15,0.3)', 10, 26); // oil, old spills
    for (let i = 0; i < 6; i++) crack(c, w, h, r, r() * w, r() * h, r() * 6.3, 20 + r() * 60, 'rgba(18,18,16,0.6)', 1 + r() * 0.6);
  });
  // raw cut rock (the Dauntless Pit): bedding planes run across it, warped, with ledges catching the
  // light above and the dark of the seams under them; fractures down through the layers, wet seeps
  def('rock', 512, 512, 3.2, (c, w, h, r) => {
    const warp = fbm(w, h, r, 2, 5, 0.55), body = fbm(w, h, r, 4, 6, 0.6), fine = fbm(w, h, r, 32, 2, 0.5);
    const beds = 9, img = c.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
      const p = y * w + x;
      const t = ((y / h) * beds + (warp[p] - 0.5) * 2.2 + 8) % 1; // where in its bed
      let k = 0.7 + body[p] * 0.5 + (fine[p] - 0.5) * 0.25;
      k *= t < 0.06 ? 0.45 + t * 6 : t < 0.12 ? 1.18 : 1 - (t - 0.12) * 0.22; // the seam, the lit lip of the ledge, falling into shade
      const warm = body[p] > 0.6 ? 1 : 0;
      d[i] = 74 * k + warm * 6; d[i + 1] = 71 * k + warm * 3; d[i + 2] = 67 * k; d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    for (let i = 0; i < 16; i++) { const x = r() * w, y = r() * h; crack(c, w, h, r, x, y, Math.PI / 2 + (r() - 0.5) * 0.8, 30 + r() * 90, 'rgba(10,9,8,0.75)', 1 + r() * 1.5); }
    runs(c, w, h, r, 22, [18, 20, 20], 0.35, 30, 160, 5); // seeps
    stainBy(c, w, h, fbm(w, h, r, 3, 4, 0.6), 0.7, 0.2, [40, 44, 38], 0.35);
    grain(c, w, h, r, 0.16, 0.03, 0.02);
  });
  // rooftop gravel: a bed of small stones, each lit on top and shadowed under, between them dark grit
  def('gravel', 256, 256, 1.6, (c, w, h, r) => {
    c.fillStyle = '#5c5955'; c.fillRect(0, 0, w, h);
    const cols = [[136, 132, 126], [114, 110, 104], [156, 150, 140], [128, 116, 102], [100, 98, 96], [166, 162, 156]];
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, rx = 1.6 + r() * 2.6, ry = rx * (0.6 + r() * 0.4), col = cols[Math.floor(r() * cols.length)], v = 0.8 + r() * 0.35;
      wrap(w, h, x, y, rx + 1, (ox, oy) => {
        c.fillStyle = 'rgba(20,19,18,0.45)'; blob(c, x + ox + 0.7, y + oy + 1, rx, ry, r, 6); c.fill();
        c.fillStyle = rgba([col[0] * v, col[1] * v, col[2] * v], 1); blob(c, x + ox, y + oy, rx, ry, r, 6); c.fill();
        c.fillStyle = 'rgba(255,255,250,0.14)'; c.fillRect(x + ox - rx * 0.4, y + oy - ry * 0.6, rx * 0.8, 1);
      });
    }
    blotches(c, w, h, r, 5, 'rgba(30,28,26,0.25)', 14, 40);
    grain(c, w, h, r, 0.08);
  });
  // asphalt shingles on a house roof: staggered rows of tabs, granules, each a shade apart,
  // weathered paler at the edges, moss in the shade
  def('shingle', 256, 256, 1.6, (c, w, h, r) => {
    c.fillStyle = '#2c2a28'; c.fillRect(0, 0, w, h);
    const th = 16, tw = 32;
    for (let y = 0; y < h; y += th) {
      const off = (y / th) % 2 ? tw / 2 : 0;
      for (let x = -tw; x < w + tw; x += tw) {
        const v = 0.8 + r() * 0.35, tone = r() < 0.15 ? [0.42, 0.38, 0.34] : [0.36, 0.35, 0.33];
        c.fillStyle = U.rgbToCss(tone[0] * v, tone[1] * v, tone[2] * v);
        c.fillRect(x + off + 1, y, tw - 2, th - 3);
        const g = c.createLinearGradient(0, y, 0, y + th - 3);
        g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,255,255,0.08)');
        c.fillStyle = g; c.fillRect(x + off + 1, y, tw - 2, th - 3);
        c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x + off + 1, y + th - 3, tw - 2, 2); // the tab's shadow line
        if (r() < 0.06) { c.fillStyle = 'rgba(20,18,16,0.8)'; c.fillRect(x + off + 2 + r() * (tw - 12), y + th - 7, 6 + r() * 6, 4); } // a torn corner
      }
    }
    grain(c, w, h, r, 0.3, 0.05, 0.05);
    stainBy(c, w, h, fbm(w, h, r, 3, 4, 0.6), 0.68, 0.18, [80, 92, 60], 0.45); // moss
  });
  // board-formed concrete panels (the Testing Center, the lobby): one 3 m panel a tile, the joint
  // round it set back, the faint print of the formwork boards, two rows of tie holes plugged with a
  // darker cone, rust bled from the ties, water runs from the joint, a lighter cast skin in places
  def('concrete_panel', 512, 512, 3.0, (c, w, h, r) => {
    concreteBody(c, w, h, r, '#a19e96', { mottle: 0.08, stain: [92, 88, 80], stainA: 0.25, grain: 0.07, pores: 0.02, flecks: 0.004 });
    for (let y = 0; y < h; y += 64) { c.fillStyle = 'rgba(255,255,250,0.035)'; c.fillRect(0, y + 1, w, 1); c.fillStyle = 'rgba(40,38,34,0.06)'; c.fillRect(0, y, w, 1); } // the boards
    for (let k = 0; k < 10; k++) { const y = Math.floor(r() * 8) * 64; c.fillStyle = 'rgba(70,66,60,0.08)'; c.fillRect(r() * w, y + 2, 40 + r() * 140, 60); } // a board a shade apart
    // tie holes
    for (const fy of [0.25, 0.75]) for (const fx of [0.125, 0.375, 0.625, 0.875]) {
      const x = fx * w, y = fy * h;
      if (r() < 0.45) run(c, w, h, r, x - 1, y + 5, 30 + r() * 110, 2 + r() * 2, r() < 0.5 ? [112, 74, 44] : [70, 66, 58], 0.18 + r() * 0.2);
      const g = c.createRadialGradient(x, y, 0, x, y, 7);
      g.addColorStop(0, 'rgba(48,46,42,0.95)'); g.addColorStop(0.55, 'rgba(78,75,70,0.9)'); g.addColorStop(0.75, 'rgba(255,255,250,0.18)'); g.addColorStop(1, 'rgba(255,255,250,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 7, 0, 6.3); c.fill();
      c.fillStyle = 'rgba(25,24,22,0.7)'; c.beginPath(); c.arc(x + 0.5, y + 0.5, 2.4, 0, 6.3); c.fill();
    }
    // the joint round the panel: recessed, its upper lip lit and its lower edge in shade
    c.fillStyle = 'rgba(42,40,36,0.85)'; c.fillRect(0, 0, w, 4); c.fillRect(0, 0, 4, h);
    c.fillStyle = 'rgba(255,255,250,0.16)'; c.fillRect(0, 4, w, 2); c.fillRect(4, 4, 2, h - 4);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, h - 2, w, 2); c.fillRect(w - 2, 0, 2, h);
    runs(c, w, h, r, 14, [80, 76, 68], 0.2, 40, 220, 4, () => 6); // water run down from the joint
    for (let i = 0; i < 2; i++) crack(c, w, h, r, r() * w, r() * h, r() * 6.3, 30 + r() * 60, 'rgba(50,48,44,0.45)', 1);
  });
  // painted plaster over a block wall (v = 0, the bottom of the canvas, is the floor): the dado below
  // in a darker colour, a rail between, the skirting; roller texture, the block coursing showing
  // faintly through the paint, scuffs and dirt low down where chairs, trolleys and shoes hit it
  function paintedWall(base, dado, rail, rail2, skirt, opts) {
    return (c, w, h, r) => {
      const lower = dado ? Math.round(h * (1 - opts.dadoH / 3.0)) : h;
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      if (dado) { c.fillStyle = dado; c.fillRect(0, lower, w, h - lower); }
      for (let y = h - 4; y > 0; y -= 17) { c.fillStyle = 'rgba(0,0,0,0.025)'; c.fillRect(0, y, w, 1); } // block courses under the paint
      for (let y = h - 4, k = 0; y > 0; y -= 17, k++) for (let x = (k % 2) * 43; x < w; x += 86) { c.fillStyle = 'rgba(0,0,0,0.02)'; c.fillRect(x, y - 17, 1, 17); }
      shadeBy(c, w, h, fbm(w, h, r, 3, 5, 0.6), 0.03);
      grain(c, w, h, r, 0.04);
      if (rail) {
        c.fillStyle = rail; c.fillRect(0, lower - opts.railH, w, opts.railH);
        c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, lower - opts.railH, w, 1);
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, lower, w, 1);
        if (rail2) { c.fillStyle = rail2; c.fillRect(0, lower - opts.railH - 3, w, 2); }
      }
      // scuffs, a chair-back's rub, shoe marks above the skirting
      for (let i = 0; i < 26; i++) { c.fillStyle = rgba([30, 30, 30], 0.08 + r() * 0.16); c.fillRect(r() * w, h - 10 - Math.pow(r(), 2) * 60, 3 + r() * 14, 1 + (r() < 0.3 ? 1 : 0)); }
      const g = c.createLinearGradient(0, h - 40, 0, h - 8);
      g.addColorStop(0, 'rgba(60,54,44,0)'); g.addColorStop(1, 'rgba(60,54,44,0.16)');
      c.fillStyle = g; c.fillRect(0, h - 40, w, 32);
      // the skirting: a lit top edge, dust on it
      c.fillStyle = skirt; c.fillRect(0, h - 8, w, 8);
      c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(0, h - 8, w, 1);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, h - 1, w, 1);
      if (opts.runs) runs(c, w, h, r, opts.runs, [90, 80, 60], 0.08, 30, 120, 3, (q) => q() * h * 0.3);
    };
  }
  def('paint_wall', 256, 256, 3.0, paintedWall('#cac7b9', '#5f7378', '#3f4c50', '#b08a3a', '#2b2b2b', { dadoH: 1.15, railH: 4, runs: 4 }), { clampV: true });
  def('paint_white', 256, 256, 3.0, (c, w, h, r) => {
    paintedWall('#dddcd6', null, null, null, '#4d5152', {})(c, w, h, r);
    const y = Math.round(h * (1 - 1.0 / 3));
    c.fillStyle = '#9a9c9a'; c.fillRect(0, y, w, 3); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(0, y, w, 1); // a chair rail
  }, { clampV: true });
  def('paint_blue', 256, 256, 3.0, paintedWall('#c3cdd6', '#3e5d82', '#d7dde4', null, '#1e2c3d', { dadoH: 1.0, railH: 3 }), { clampV: true });
  def('paint_warm', 256, 256, 3.0, paintedWall('#cfc1a1', '#8a5a3c', '#5b3a26', null, '#2b1d14', { dadoH: 1.0, railH: 5 }), { clampV: true });
  // glazed tiles: each a shade apart with the glaze's sheen across it, grout gone grey and darker
  // low down, the odd chipped corner, a hairline crack
  function tiles(base, groutCol, n, opts) {
    return (c, w, h, r) => {
      const s = w / n, gw = opts.grout || 2, bc = U.hexToRgb(base).map((v) => v * 255);
      c.fillStyle = groutCol; c.fillRect(0, 0, w, h);
      const dirt = fbm(w, h, r, 2, 4, 0.6);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = i * s + gw / 2, y = j * s + gw / 2, t = s - gw, v = 1 + (r() - 0.5) * (opts.vary || 0.06);
        c.fillStyle = rgba([bc[0] * v, bc[1] * v, bc[2] * v], 1); c.fillRect(x, y, t, t);
        const g = c.createLinearGradient(x, y, x + t, y + t);
        g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.06)');
        c.fillStyle = g; c.fillRect(x, y, t, t);
        c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x, y, t, 1); c.fillRect(x, y, 1, t); // the cushion edge
        c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, y + t - 1, t, 1); c.fillRect(x + t - 1, y, 1, t);
        if (r() < 0.07) { c.fillStyle = groutCol; blob(c, x + (r() < 0.5 ? 0 : t), y + (r() < 0.5 ? 0 : t), 2 + r() * 3, 2 + r() * 3, r, 5); c.fill(); } // a chip
        if (r() < 0.05) crack(c, w, h, r, x + r() * t, y, Math.PI / 2 + (r() - 0.5), t * 0.8, 'rgba(80,80,76,0.45)', 0.7, 2);
      }
      // grime in the grout, heavier where the field says
      pass(c, w, h, (d, i, x, y) => {
        const gx = x % s, gy = y % s, inG = gx < gw || gy < gw;
        const f = dirt[y * w + x];
        const k = inG ? 0.82 - f * 0.25 : 1 - smooth((f - 0.75) / 0.25) * 0.08;
        d[i] *= k; d[i + 1] *= k; d[i + 2] *= k * (inG ? 0.96 : 1);
      });
      grain(c, w, h, r, 0.03);
    };
  }
  def('tile_white', 256, 256, 1.0, tiles('#e6e8e4', '#a9aca6', 4, { grout: 3 }));
  def('tile_small', 256, 256, 0.8, tiles('#bac8c7', '#7f8c8b', 8, { grout: 2, vary: 0.1 }));
  def('mirror', 128, 256, 2.0, (c, w, h, r) => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#9aa3a8'); g.addColorStop(0.42, '#d8dee0'); g.addColorStop(0.58, '#bfc8cc'); g.addColorStop(1, '#8a939a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    for (const [x0, wd] of [[18, 7], [40, 3], [70, 10]]) { c.save(); c.translate(x0, 0); c.rotate(0.35); c.fillRect(0, -20, wd, h * 1.4); c.restore(); }
    blotches(c, w, h, r, 5, 'rgba(70,64,52,0.12)', 6, 20); // the silvering going at the edges
    c.fillStyle = '#5d666b'; c.fillRect(0, 0, 3, h); c.fillRect(0, 0, w, 3);
    grain(c, w, h, r, 0.02);
  });
  // terrazzo: chips of marble, granite and the odd glass in a ground matrix, ground flat and polished,
  // a brass strip at the bay's edge, the shine worn off where people walk
  def('terrazzo', 256, 256, 2.0, (c, w, h, r) => {
    c.fillStyle = '#aca698'; c.fillRect(0, 0, w, h);
    shadeBy(c, w, h, fbm(w, h, r, 3, 4, 0.55), 0.05);
    const chips = ['#7d776b', '#c9c3b5', '#5f5a52', '#d8d1c1', '#8c6f52', '#6b7a7c', '#efe9dc', '#4a4844', '#9a8a70'];
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, s = r() < 0.08 ? 2.5 + r() * 3 : 0.7 + r() * 1.6;
      c.fillStyle = chips[Math.floor(r() * chips.length)];
      wrap(w, h, x, y, s + 1, (ox, oy) => { blob(c, x + ox, y + oy, s, s * (0.6 + r() * 0.5), r, 5); c.fill(); });
    }
    grain(c, w, h, r, 0.05);
    blotches(c, w, h, r, 6, 'rgba(255,255,240,0.06)', 20, 50);
    c.fillStyle = '#7a6a48'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h); // the divider strip
    c.fillStyle = 'rgba(255,240,200,0.25)'; c.fillRect(0, 0, w, 1); c.fillRect(0, 0, 1, h);
  });
  // a chequer of black and white marble: veins wandering through each slab, polished, the joints fine
  def('marble_check', 256, 256, 2.4, (c, w, h, r) => {
    const s = w / 2, veinW = fbm(w, h, r, 2, 5, 0.6), cloud = fbm(w, h, r, 3, 5, 0.6);
    const img = c.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
      const dark = ((x < s) !== (y < s)), p = y * w + x;
      const v = Math.abs(Math.sin((x * 0.6 + y * 0.9) * 0.022 + veinW[p] * 5)), v2 = Math.abs(Math.sin((x * 0.9 - y * 0.4) * 0.05 + veinW[p] * 7)); // the veins: thin where the sines cross zero
      const vein = Math.max(smooth((0.07 - v) / 0.07), smooth((0.035 - v2) / 0.035) * 0.45);
      const base = dark ? [58, 60, 63] : [204, 200, 190];
      const vc = dark ? [140, 138, 132] : [128, 122, 112];
      const k = 0.93 + cloud[p] * 0.12;
      for (let ch = 0; ch < 3; ch++) d[i + ch] = (base[ch] + (vc[ch] - base[ch]) * vein * 0.55) * k;
      d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    grain(c, w, h, r, 0.03);
    c.fillStyle = 'rgba(20,20,20,0.55)'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h); c.fillRect(s - 1, 0, 2, h); c.fillRect(0, s - 1, w, 2);
    blotches(c, w, h, r, 4, 'rgba(255,255,255,0.05)', 20, 50); // the polish
  });
  // vinyl composition tile, two tones in a check: the chips in the vinyl, scuffs from shoes and
  // chair legs, the wax built up in the joints
  def('tile_floor', 128, 128, 1.2, (c, w, h, r) => {
    const s = w / 2;
    c.fillStyle = '#9d9c91'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8b8a80'; c.fillRect(0, 0, s, s); c.fillRect(s, s, s, s);
    speckle(c, w, h, r, 900, ['#7b7a71', '#b3b2a7', '#6d6c64', '#a8a091', '#8c8f8a'], 1);
    shadeBy(c, w, h, fbm(w, h, r, 2, 4, 0.6), 0.05);
    for (let i = 0; i < 30; i++) { c.strokeStyle = rgba([40, 40, 38], 0.1 + r() * 0.15); c.lineWidth = 1; c.beginPath(); const x = r() * w, y = r() * h, a = r() * 6.3, l = 3 + r() * 12; c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.6, y + Math.sin(a + 0.5) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); } // scuffs
    grain(c, w, h, r, 0.05);
    c.fillStyle = 'rgba(60,58,52,0.75)'; c.fillRect(0, 0, w, 1); c.fillRect(0, 0, 1, h); c.fillRect(s, 0, 1, h); c.fillRect(0, s, w, 1);
  });
  // carpet tiles: a loop pile in rows, flecked yarn, flattened and darker along the walking lines
  function carpet(base, fleck) {
    return (c, w, h, r) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      speckle(c, w, h, r, 2600, fleck, 1);
      pass(c, w, h, (d, i, x, y) => { const k = ((x + (y >> 1)) % 3 === 0 ? 0.9 : 1) * (y % 2 ? 0.96 : 1.03); d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }); // the loops in rows
      shadeBy(c, w, h, fbm(w, h, r, 2, 4, 0.6), 0.12); // wear
      grain(c, w, h, r, 0.1);
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 0, w, 1); c.fillRect(0, 0, 1, h); // the tile seams
    };
  }
  def('carpet_blue', 128, 128, 1.0, carpet('#2f4565', ['#253752', '#3c5679', '#1e2c42', '#465f80']));
  def('carpet_grey', 128, 128, 1.0, carpet('#5d5e60', ['#4c4d4f', '#6e6f71', '#424345', '#6a6458']));
  def('carpet_red', 128, 128, 1.0, carpet('#6a2a26', ['#561f1c', '#7c3530', '#45201d', '#7a4a30']));
  def('carpet_dark', 128, 128, 1.0, carpet('#2b2c30', ['#222327', '#36373b', '#1b1c1f']));
  // suspended ceiling: fissured mineral tiles in a grid of T-bar, a water stain or two, a tile sagging
  def('ceiling_tile', 128, 128, 1.2, (c, w, h, r) => {
    c.fillStyle = '#cbc8bd'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 360; i++) { c.fillStyle = rgba([120, 116, 106], 0.25 + r() * 0.35); const x = r() * w, y = r() * h; c.fillRect(x, y, 1 + r() * 3, 1); } // the fissures
    shadeBy(c, w, h, fbm(w, h, r, 2, 3, 0.6), 0.04);
    const st = fbm(w, h, r, 2, 4, 0.6);
    pass(c, w, h, (d, i, x, y) => { const f = st[y * w + x], a = smooth((f - 0.8) / 0.08) * 0.35, ring = Math.abs(f - 0.82) < 0.01 ? 0.18 : 0; d[i] -= (40 * a + 60 * ring); d[i + 1] -= (52 * a + 70 * ring); d[i + 2] -= (80 * a + 90 * ring); }); // a water stain with its tide line
    grain(c, w, h, r, 0.05);
    const s = w / 2;
    for (const p of [0, s]) { c.fillStyle = '#8f8d86'; c.fillRect(p, 0, 3, h); c.fillRect(0, p, w, 3); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(p, 0, 1, h); c.fillRect(0, p, w, 1); }
  });
  def('ceiling_concrete', 128, 128, 2.0, (c, w, h, r) => {
    concreteBody(c, w, h, r, '#706e69', { mottle: 0.14, stain: [34, 32, 30], stainA: 0.4, grain: 0.12, pores: 0.02 });
    c.fillStyle = 'rgba(30,28,26,0.35)'; c.fillRect(0, 0, w, 1); c.fillStyle = 'rgba(255,255,250,0.06)'; c.fillRect(0, 1, w, 1); // a formwork line
  });
  // wood: the grain drawn as rings warped by noise (a plank cut through the trunk), knots, open pores
  function woodGrain(c, w, h, r, base, dark, opts) {
    opts = opts || {};
    const warp = opts.vertical ? fbm(w, h, r, 8, 4, 0.55, 1 / 8) : fbm(w, h, r, 1, 4, 0.55, 8), fine = opts.vertical ? fbm(w, h, r, 32, 2, 0.5, 1 / 8) : fbm(w, h, r, 4, 2, 0.5, 8);
    const knots = [];
    for (let k = 0; k < (opts.knots || 2); k++) knots.push([r() * w, r() * h, 3 + r() * 5]);
    const freq = opts.freq || 0.18;
    const img = c.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
      const p = y * w + x;
      let along = opts.vertical ? x : y;
      for (const [kx, ky, kr] of knots) { const dx = x - kx, dy = (y - ky) * 0.6, dd = dx * dx + dy * dy; if (dd < kr * kr * 16) along += (kr * 2.2) * Math.exp(-dd / (kr * kr * 3)) * (opts.vertical ? Math.sign(dx) : Math.sign(dy) || 1); }
      const ring = Math.sin(along * freq + warp[p] * 5), t = Math.pow(Math.abs(ring), 0.5);
      const k = 1 + (fine[p] - 0.5) * 0.2;
      for (let ch = 0; ch < 3; ch++) d[i + ch] = (dark[ch] + (base[ch] - dark[ch]) * t) * k;
      d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    for (const [kx, ky, kr] of knots) { const g = c.createRadialGradient(kx, ky, 0, kx, ky, kr); g.addColorStop(0, rgba(dark.map((v) => v * 0.6), 0.9)); g.addColorStop(1, rgba(dark, 0)); c.fillStyle = g; c.beginPath(); c.ellipse(kx, ky, opts.vertical ? kr * 0.7 : kr * 1.3, opts.vertical ? kr * 1.3 : kr * 0.7, 0, 0, 6.3); c.fill(); }
    for (let i = 0; i < w * h * 0.01; i++) { c.fillStyle = rgba(dark.map((v) => v * 0.7), 0.4); if (opts.vertical) c.fillRect(r() * w, r() * h, 1, 2 + r() * 3); else c.fillRect(r() * w, r() * h, 2 + r() * 3, 1); } // pores
  }
  def('wood_panel', 256, 256, 2.0, (c, w, h, r) => {
    woodGrain(c, w, h, r, [118, 76, 44], [74, 44, 22], { vertical: true, freq: 0.32, knots: 3 });
    for (let x = 0; x < w; x += 32) { // the boards, each a shade apart, V-grooved
      c.fillStyle = rgba(r() < 0.5 ? [0, 0, 0] : [255, 220, 180], 0.04 + r() * 0.05); c.fillRect(x, 0, 32, h);
      c.fillStyle = 'rgba(28,14,5,0.75)'; c.fillRect(x, 0, 2, h);
      c.fillStyle = 'rgba(255,220,180,0.1)'; c.fillRect(x + 2, 0, 1, h);
    }
    const rail = Math.round(h * 0.62);
    c.fillStyle = '#3a2414'; c.fillRect(0, rail, w, 6); c.fillStyle = 'rgba(255,220,180,0.14)'; c.fillRect(0, rail, w, 1);
    c.fillStyle = '#2a190d'; c.fillRect(0, h - 10, w, 10); c.fillStyle = 'rgba(255,220,180,0.12)'; c.fillRect(0, h - 10, w, 1);
    for (let i = 0; i < 18; i++) { c.fillStyle = rgba([20, 12, 6], 0.15 + r() * 0.2); c.fillRect(r() * w, h - 12 - r() * 40, 3 + r() * 10, 1); }
  }, { clampV: true });
  def('wood', 128, 128, 1.0, (c, w, h, r) => {
    woodGrain(c, w, h, r, [128, 90, 56], [82, 54, 30], { freq: 0.22, knots: 2 });
    for (let y = 0; y < h; y += 32) { c.fillStyle = rgba(r() < 0.5 ? [0, 0, 0] : [255, 230, 200], 0.05); c.fillRect(0, y, w, 32); c.fillStyle = 'rgba(30,16,6,0.55)'; c.fillRect(0, y, w, 1); } // the boards
    grain(c, w, h, r, 0.05);
  });
  def('wood_light', 128, 128, 1.0, (c, w, h, r) => {
    woodGrain(c, w, h, r, [182, 146, 98], [140, 102, 62], { freq: 0.16, knots: 1 });
    grain(c, w, h, r, 0.04);
  });
  // brushed steel: the brushing along it, fingerprints and dull patches, a scratch or two
  def('metal', 128, 128, 1.0, (c, w, h, r) => {
    c.fillStyle = '#8f9496'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) { c.fillStyle = rgba(r() < 0.5 ? [255, 255, 255] : [0, 0, 0], r() * 0.06); c.fillRect(0, y, w, 1); }
    for (let i = 0; i < 260; i++) { c.fillStyle = rgba([255, 255, 255], r() * 0.08); c.fillRect(r() * w, r() * h, 6 + r() * 40, 1); }
    shadeBy(c, w, h, fbm(w, h, r, 2, 4, 0.6), 0.08);
    for (let i = 0; i < 7; i++) { c.strokeStyle = rgba(r() < 0.5 ? [230, 234, 236] : [60, 62, 64], 0.3); c.lineWidth = 0.8; c.beginPath(); const x = r() * w, y = r() * h, a = r() * 6.3; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * (5 + r() * 25), y + Math.sin(a) * (5 + r() * 25)); c.stroke(); }
    blotches(c, w, h, r, 3, 'rgba(70,60,48,0.12)', 6, 16);
    grain(c, w, h, r, 0.03);
  });
  def('metal_dark', 128, 128, 1.0, (c, w, h, r) => {
    c.fillStyle = '#3d4144'; c.fillRect(0, 0, w, h);
    shadeBy(c, w, h, fbm(w, h, r, 2, 5, 0.6), 0.14);
    for (let i = 0; i < 40; i++) { c.strokeStyle = rgba([150, 156, 160], 0.08 + r() * 0.14); c.lineWidth = 0.8; c.beginPath(); const x = r() * w, y = r() * h, a = r() * 6.3, l = 3 + r() * 16; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); } // scuffs, the steel showing
    stainBy(c, w, h, fbm(w, h, r, 3, 4, 0.6), 0.72, 0.15, [70, 48, 34], 0.35); // a little rust
    grain(c, w, h, r, 0.08);
  });
  // painted steel: the coat chipped back to primer and rust at the knocks, rust bleeding from them,
  // scuffs, the paint dulled and chalky where the weather gets it
  def('metal_painted', 128, 128, 1.0, (c, w, h, r) => {
    c.fillStyle = '#4f6a5c'; c.fillRect(0, 0, w, h);
    shadeBy(c, w, h, fbm(w, h, r, 2, 4, 0.6), 0.1);
    for (let i = 0; i < 7; i++) {
      const x = r() * w, y = r() * h, s = 1 + Math.pow(r(), 2) * 6;
      run(c, w, h, r, x - 1, y + s * 0.5, 6 + r() * 26, 1.5 + r() * 1.5, [110, 62, 32], 0.35);
      c.fillStyle = 'rgba(130,128,118,0.9)'; blob(c, x, y, s * 1.3, s, r, 7); c.fill(); // primer
      c.fillStyle = 'rgba(104,58,30,0.95)'; blob(c, x, y, s * 0.8, s * 0.6, r, 6); c.fill(); // rust
    }
    for (let i = 0; i < 30; i++) { c.fillStyle = rgba([150, 160, 150], 0.12); c.fillRect(r() * w, r() * h, 2 + r() * 10, 1); }
    grain(c, w, h, r, 0.06);
  });
  // diamond tread plate: the raised bars catching the light on one side, dirt packed between
  def('metal_plate', 128, 128, 1.0, (c, w, h, r) => {
    c.fillStyle = '#62666a'; c.fillRect(0, 0, w, h);
    shadeBy(c, w, h, fbm(w, h, r, 2, 4, 0.6), 0.12);
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) for (const [ox, oy, a] of [[4, 4, 0.7], [12, 12, -0.7]]) {
      c.save(); c.translate(x + ox, y + oy); c.rotate(a);
      c.fillStyle = 'rgba(30,32,34,0.6)'; c.fillRect(-5, 0, 10, 2.5);
      c.fillStyle = '#9a9ea2'; c.fillRect(-5, -1.5, 10, 2);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-4, -1.5, 8, 1);
      c.restore();
    }
    stainBy(c, w, h, fbm(w, h, r, 3, 4, 0.6), 0.68, 0.2, [60, 52, 44], 0.4);
    grain(c, w, h, r, 0.06);
  });
  def('rust', 128, 128, 1.5, (c, w, h, r) => {
    c.fillStyle = '#6a4a35'; c.fillRect(0, 0, w, h);
    const f = fbm(w, h, r, 3, 6, 0.65);
    pass(c, w, h, (d, i, x, y) => { const v = f[y * w + x]; d[i] = 62 + v * 72; d[i + 1] = 42 + v * 38; d[i + 2] = 30 + v * 22; }); // orange where it's fresh, brown where it's old
    stainBy(c, w, h, fbm(w, h, r, 4, 4, 0.6), 0.6, 0.15, [42, 32, 26], 0.6); // scale
    for (let i = 0; i < 40; i++) { c.fillStyle = rgba([30, 22, 16], 0.5); blob(c, r() * w, r() * h, 1 + r() * 2, 1 + r() * 2, r, 5); c.fill(); } // pits
    runs(c, w, h, r, 10, [120, 64, 30], 0.35, 20, 70, 3);
    grain(c, w, h, r, 0.14);
  });
  // paving slabs, each laid a shade apart: bevelled edges catching the light, the joints dark with
  // dirt (and a weed in one), a corner chipped off, a crack across a slab, gum trodden flat, a
  // stain where something stood, the slabs where most feet go smoother and paler
  def('pavement', 512, 512, 3.0, (c, w, h, r) => {
    const n = 4, s = w / n, jw = 3;
    c.fillStyle = '#4a4843'; c.fillRect(0, 0, w, h);
    const tones = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 0.9 + r() * 0.17, x = i * s + jw / 2, y = j * s + jw / 2, t = s - jw, warm = (r() - 0.5) * 0.03;
      tones.push(v);
      c.fillStyle = U.rgbToCss((0.5 + warm) * v, 0.49 * v, (0.465 - warm) * v); c.fillRect(x, y, t, t);
    }
    shadeBy(c, w, h, fbm(w, h, r, 2, 5, 0.55), 0.08);
    grain(c, w, h, r, 0.12, 0.02, 0.02); // the aggregate in the slab
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * s + jw / 2, y = j * s + jw / 2, t = s - jw;
      c.fillStyle = 'rgba(255,255,250,0.16)'; c.fillRect(x, y, t, 2); c.fillRect(x, y, 2, t); // the bevel, lit
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x, y + t - 2, t, 2); c.fillRect(x + t - 2, y, 2, t); // and in shade
      if (r() < 0.25) { c.fillStyle = '#4a4843'; const cx = x + (r() < 0.5 ? 0 : t), cy = y + (r() < 0.5 ? 0 : t); blob(c, cx, cy, 4 + r() * 8, 4 + r() * 8, r, 6); c.fill(); } // a chipped corner
      if (r() < 0.25) { const a = r() < 0.5 ? 0 : Math.PI / 2; crack(c, w, h, r, a ? x + r() * t : x + 2, a ? y + 2 : y + r() * t, a + (r() - 0.5) * 0.6, t * (0.5 + r() * 0.5), 'rgba(30,29,26,0.65)', 1.2, 1); }
      if (r() < 0.4) for (let q = 0; q < 2 + r() * 4; q++) { c.fillStyle = 'rgba(206,204,196,0.6)'; c.beginPath(); c.arc(x + 8 + r() * (t - 16), y + 8 + r() * (t - 16), 1.8 + r() * 1.6, 0, 6.3); c.fill(); c.fillStyle = 'rgba(40,38,34,0.25)'; c.fillRect(x + 8 + r() * (t - 16), y + 8 + r() * (t - 16), 3, 2); } // gum
      if (r() < 0.12) { c.fillStyle = 'rgba(42,38,30,0.22)'; blob(c, x + t / 2 + (r() - 0.5) * t * 0.5, y + t / 2 + (r() - 0.5) * t * 0.5, 14 + r() * 24, 10 + r() * 16, r, 10); c.fill(); } // a stain
    }
    // the joints: dirt and grit in them, a weed
    const jd = fbm(w, h, r, 4, 3, 0.6);
    pass(c, w, h, (d, i, x, y) => {
      const gx = (x + jw / 2) % s, gy = (y + jw / 2) % s;
      if (gx < jw || gy < jw) { const k = 0.75 + jd[y * w + x] * 0.35; d[i] = 64 * k; d[i + 1] = 61 * k; d[i + 2] = 55 * k; }
    });
    for (let k = 0; k < 4; k++) { const x = Math.floor(r() * n) * s, y = r() * h; c.fillStyle = 'rgba(74,88,48,0.8)'; for (let q = 0; q < 6; q++) c.fillRect(x - 2 + r() * 4, y + r() * 10, 1 + r(), 2 + r() * 3); }
    blotches(c, w, h, r, 4, 'rgba(36,34,28,0.12)', 30, 80);
  });

  // asphalt: a dense aggregate (dark binder, grey and the odd pale chip), polished smoother where
  // the wheels run, tar snakes where cracks were sealed, patches of a different age with crisp cut
  // edges, a patch of alligator cracking, oil drips, and a fine web of cracks
  def('asphalt', 512, 512, 5.0, (c, w, h, r) => {
    const body = fbm(w, h, r, 2, 5, 0.6), wear = fbm(w, h, r, 1, 3, 0.5);
    const img = c.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
      const p = y * w + x, q = r();
      let v = 54 + (body[p] - 0.5) * 16 + (r() - 0.5) * 18;
      if (q < 0.18) v *= 0.62; // binder between the stones
      else if (q > 0.985) v += 34 + r() * 30; // a pale chip
      else if (q > 0.9) v += 12;
      v += (wear[p] - 0.5) * 10;
      d[i] = v; d[i + 1] = v; d[i + 2] = v * 1.02 + 1; d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    // patches, laid later: smoother and a shade darker (or paler, older), with a crisp cut edge
    for (let k = 0; k < 3; k++) {
      const pw = 60 + r() * 140, ph = 40 + r() * 90, px = r() * (w - pw), py = r() * (h - ph), dark = r() < 0.6;
      c.fillStyle = dark ? 'rgba(24,24,26,0.5)' : 'rgba(120,118,112,0.18)'; c.fillRect(px, py, pw, ph);
      for (let i = 0; i < pw * ph * 0.04; i++) { c.fillStyle = rgba(dark ? [70, 70, 72] : [90, 88, 84], 0.5); c.fillRect(px + r() * pw, py + r() * ph, 1, 1); }
      c.strokeStyle = 'rgba(10,10,10,0.75)'; c.lineWidth = 2; c.strokeRect(px, py, pw, ph);
      c.strokeStyle = 'rgba(140,140,140,0.12)'; c.lineWidth = 1; c.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
    }
    // tar snakes: sealed cracks, wavy, glossy black with a sheen beside them
    for (let k = 0; k < 2; k++) {
      let x = r() * w, y = 0;
      const vert = k % 2 === 0, pts = [];
      if (!vert) { x = 0; y = r() * h; }
      while (vert ? y < h + 10 : x < w + 10) { pts.push([x, y]); if (vert) { x += (r() - 0.5) * 22; y += 8 + r() * 14; } else { y += (r() - 0.5) * 22; x += 8 + r() * 14; } }
      for (const off of vert ? [0, -w, w] : [0, -h, h]) {
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.strokeStyle = 'rgba(12,12,13,0.7)'; c.lineWidth = 2 + r() * 2.5; c.beginPath(); pts.forEach(([a, b], i) => (vert ? (i ? c.lineTo(a + off, b) : c.moveTo(a + off, b)) : (i ? c.lineTo(a, b + off) : c.moveTo(a, b + off)))); c.stroke();
        c.strokeStyle = 'rgba(120,122,126,0.16)'; c.lineWidth = 1; c.beginPath(); pts.forEach(([a, b], i) => (vert ? (i ? c.lineTo(a + off + 2, b - 1) : c.moveTo(a + off + 2, b - 1)) : (i ? c.lineTo(a + 1, b + off - 2) : c.moveTo(a + 1, b + off - 2)))); c.stroke();
      }
    }
    // alligator cracking: a patch of small polygons
    { const ax = r() * w, ay = r() * h, R = 40 + r() * 30;
      for (let i = 0; i < 26; i++) { const a = r() * 6.3, rr = Math.sqrt(r()) * R; crack(c, w, h, r, ax + Math.cos(a) * rr, ay + Math.sin(a) * rr, r() * 6.3, 10 + r() * 14, 'rgba(14,14,14,0.75)', 1, 2); } }
    for (let i = 0; i < 18; i++) crack(c, w, h, r, r() * w, r() * h, r() * 6.3, 20 + r() * 70, 'rgba(16,16,16,0.65)', 1 + r() * 0.8);
    // oil: drips gathered in a darker smear, a faint sheen on them
    for (let i = 0; i < 5; i++) { const x = r() * w, y = r() * h, s = 6 + r() * 16; wrap(w, h, x, y, s, (ox, oy) => { c.fillStyle = 'rgba(10,10,12,0.35)'; blob(c, x + ox, y + oy, s, s * 0.6, r, 10); c.fill(); c.fillStyle = 'rgba(8,8,10,0.4)'; blob(c, x + ox, y + oy, s * 0.5, s * 0.3, r, 8); c.fill(); }); }
    blotches(c, w, h, r, 4, 'rgba(70,74,90,0.06)', 8, 20); // the sheen
  });

  // road paint, worn: flaked off in specks and patches where the tyres run (the asphalt shows through
  // the holes: drawn as a cut-out), grimy, never quite white
  function roadPaint(rgb) {
    return (c, w, h, r) => {
      c.fillStyle = rgba(rgb, 1); c.fillRect(0, 0, w, h);
      shadeBy(c, w, h, fbm(w, h, r, 2, 4, 0.6), 0.12);
      grain(c, w, h, r, 0.08);
      const wear = fbm(w, h, r, 5, 4, 0.6);
      pass(c, w, h, (d, i, x, y) => { const f = wear[y * w + x] * 0.8 + r() * 0.2; d[i + 3] = f > 0.76 ? 0 : 255; if (f > 0.64) { d[i] *= 0.84; d[i + 1] *= 0.84; d[i + 2] *= 0.84; } });
    };
  }
  def('paint_road', 256, 256, 2.0, roadPaint([226, 224, 214]), { alpha: true });
  def('paint_road_amber', 256, 256, 2.0, roadPaint([206, 132, 52]), { alpha: true });

  def('grass', 128, 128, 2.0, (c, w, h, r) => {
    c.fillStyle = '#485a2e'; c.fillRect(0, 0, w, h);
    shadeBy(c, w, h, fbm(w, h, r, 2, 4, 0.6), 0.16);
    const cols = [[62, 81, 39], [90, 111, 56], [107, 124, 64], [54, 69, 31], [123, 122, 68], [80, 96, 44]];
    for (let i = 0; i < 3200; i++) { const col = cols[Math.floor(r() * cols.length)], x = r() * w, y = r() * h; c.fillStyle = rgba(col, 0.85); c.fillRect(x, y, 1, 2 + r() * 3); c.fillStyle = 'rgba(255,255,220,0.1)'; c.fillRect(x, y, 1, 1); } // blades
    stainBy(c, w, h, fbm(w, h, r, 3, 4, 0.6), 0.7, 0.15, [96, 82, 52], 0.5); // bare, dry patches
    grain(c, w, h, r, 0.08);
  });
  // a field in rows: the crop along the ridges, the soil between (grey, tinted by the field: wheat,
  // corn, cabbages, the plough's furrows); four rows a tile, along u
  def('field_rows', 128, 128, 3.0, (c, w, h, r) => {
    c.fillStyle = '#9a9a92'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      const y = k * 32;
      c.fillStyle = '#5a564e'; c.fillRect(0, y, w, 10); // the furrow
      c.fillStyle = '#76736a'; c.fillRect(0, y + 10, w, 4);
      c.fillStyle = '#b4b4aa'; c.fillRect(0, y + 18, w, 8); // the top of the ridge, catching the light
    }
    shadeBy(c, w, h, fbm(w, h, r, 2, 4, 0.6), 0.1);
    speckle(c, w, h, r, 1400, ['#6a675f', '#c8c8bc', '#8a877e', '#4e4b45'], 1);
    grain(c, w, h, r, 0.1);
  });
  def('dirt', 128, 128, 2.0, (c, w, h, r) => {
    c.fillStyle = '#5b4632'; c.fillRect(0, 0, w, h);
    shadeBy(c, w, h, fbm(w, h, r, 2, 5, 0.6), 0.18);
    for (let i = 0; i < 500; i++) { const v = 0.7 + r() * 0.6; c.fillStyle = rgba([110 * v, 96 * v, 80 * v], 0.8); c.fillRect(r() * w, r() * h, 1 + (r() < 0.2 ? 1 : 0), 1); } // grit and pebbles
    stainBy(c, w, h, fbm(w, h, r, 3, 4, 0.6), 0.7, 0.2, [44, 34, 26], 0.4); // damp
    grain(c, w, h, r, 0.12);
  });

  // Brick, in stretcher bond: every brick a shade apart (reds, browns, the odd dark clinker or pale
  // salmon), its face grained and its arrises a little rounded and chipped; the mortar set back, in
  // shadow under each course; soot and rain run down it, salts bloom white low down, a few faces spalled.
  // (exported: the city's facades lay their brick with the same hand)
  function brickWall(c, w, h, r, o) {
    const rows = o.rows, cols = o.cols, ch = h / rows, bw = w / cols, m = o.mortar;
    const base = o.colors || [[146, 78, 58], [134, 72, 55], [152, 86, 62], [122, 66, 52], [158, 94, 68]];
    c.fillStyle = rgba(o.mortarCol || [112, 106, 96], 1); c.fillRect(0, 0, w, h);
    for (let j = 0; j < rows; j++) {
      const off = j % 2 ? bw / 2 : 0;
      for (let i = -1; i <= cols; i++) {
        const q = r(), col = q < 0.04 ? [84, 52, 44] : q > 0.97 ? [170, 112, 86] : base[Math.floor(r() * base.length)];
        const v = 0.9 + r() * 0.16 * (o.vary || 1);
        const x0 = Math.round(i * bw + off) + m / 2, y0 = j * ch + m / 2, bwx = Math.round((i + 1) * bw + off) - Math.round(i * bw + off) - m, bh = ch - m;
        c.fillStyle = rgba([col[0] * v, col[1] * v, col[2] * v], 1);
        c.fillRect(x0, y0, bwx, bh);
        if (r() < 0.25) { const g = c.createLinearGradient(x0, 0, x0 + bwx, 0); const e = r() < 0.5; g.addColorStop(0, rgba([30, 18, 14], e ? 0.3 : 0)); g.addColorStop(1, rgba([30, 18, 14], e ? 0 : 0.3)); c.fillStyle = g; c.fillRect(x0, y0, bwx, bh); } // a burnt end
        if (bh > 4) {
          c.fillStyle = 'rgba(255,225,200,0.13)'; c.fillRect(x0, y0, bwx, 1); // the top arris, lit
          c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x0, y0 + bh - 1, bwx, 1); c.fillRect(x0 + bwx - 1, y0, 1, bh);
        }
        if (r() < (o.chips || 0.18)) { c.fillStyle = rgba(o.mortarCol || [112, 106, 96], 0.95); blob(c, x0 + (r() < 0.5 ? 0 : bwx), y0 + (r() < 0.5 ? 0 : bh), 1 + r() * bh * 0.35, 1 + r() * bh * 0.3, r, 5); c.fill(); } // a chipped corner
        if (r() < (o.spall || 0.04)) { c.fillStyle = 'rgba(170,110,90,0.5)'; blob(c, x0 + bwx * (0.3 + r() * 0.4), y0 + bh / 2, bwx * 0.25, bh * 0.4, r, 7); c.fill(); c.fillStyle = 'rgba(40,24,20,0.35)'; c.fillRect(x0 + bwx * 0.3, y0 + bh - 1, bwx * 0.4, 1); } // a spalled face
      }
    }
    // the mortar: recessed, dark at the top of each bed joint under the brick's shadow, lighter below
    const f = fbm(w, h, r, 4, 4, 0.6), surf = fbm(w, h, r, Math.max(4, w / 16), 2, 0.6);
    pass(c, w, h, (d, i, x, y) => {
      const p = y * w + x, j = Math.floor(y / ch), yy = y - j * ch, off = j % 2 ? bw / 2 : 0;
      const xx = ((x - off) % bw + bw) % bw;
      const inM = yy < m / 2 || yy >= ch - m / 2 || xx < m / 2 || xx >= bw - m / 2;
      let k;
      if (inM) k = (yy >= ch - m / 2 || yy < m / 2 ? (yy < m / 2 ? 0.7 : 0.92) : 0.82) * (0.85 + f[p] * 0.3);
      else k = 0.9 + surf[p] * 0.2;
      d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
    });
    grain(c, w, h, r, 0.12, 0.02, 0.01);
    // soot and rain from above, salts low down
    if (o.soot) runs(c, w, h, r, o.soot, [24, 20, 18], 0.35, h * 0.1, h * 0.6, Math.max(2, w / 64));
    if (o.bloom) stainBy(c, w, h, fbm(w, h, r, 3, 4, 0.6), 0.74, 0.16, [190, 186, 172], o.bloom);
    stainBy(c, w, h, fbm(w, h, r, 2, 4, 0.6), 0.6, 0.3, [40, 30, 26], o.grime || 0.3);
  }
  def('brick', 512, 512, 2.4, (c, w, h, r) => {
    brickWall(c, w, h, r, { rows: 32, cols: 10, mortar: 3, soot: 30, bloom: 0.3, grime: 0.32 });
  });

  // the Testing Center's outside wall: board-formed concrete, a ribbon of windows on each upper floor
  // (v = 0 is the ground)
  def('facade', 256, 256, 9.0, (c, w, h, r) => {
    concreteBody(c, w, h, r, '#8c887f', { mottle: 0.12, stain: [60, 56, 50], stainA: 0.35, grain: 0.1, pores: 0.02 });
    for (let x = 0; x < w; x += 64) { c.fillStyle = 'rgba(40,38,34,0.35)'; c.fillRect(x, 0, 2, h); c.fillStyle = 'rgba(255,255,250,0.08)'; c.fillRect(x + 2, 0, 1, h); } // the panel joints
    runs(c, w, h, r, 40, [36, 33, 28], 0.22, 20, 160, 3);
    // floor bands
    for (const f of [0.36, 0.7]) {
      const y = Math.round(h * (1 - f));
      c.fillStyle = '#6c6860'; c.fillRect(0, y, w, 6);
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, y, w, 1);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y + 6, w, 2);
      runs(c, w, h, r, 10, [30, 28, 24], 0.25, 10, 50, 3, () => y + 8);
    }
    // windows on the upper floors: steel frames, the glass reflecting the sky over the room behind it
    for (const f of [0.42, 0.76]) {
      const y = Math.round(h * (1 - f)) - 34;
      for (let x = 20; x < w; x += 80) {
        c.fillStyle = '#2a2c2d'; c.fillRect(x, y, 48, 32);
        const lit = r() < 0.25;
        for (const px of [x + 3, x + 25]) {
          const g = c.createLinearGradient(px, y, px + 6, y + 28);
          g.addColorStop(0, lit ? 'rgba(230,210,150,0.75)' : 'rgba(150,165,172,0.6)'); g.addColorStop(0.5, lit ? 'rgba(200,170,110,0.6)' : 'rgba(60,72,80,0.5)'); g.addColorStop(1, lit ? 'rgba(160,130,80,0.6)' : 'rgba(30,36,40,0.6)');
          c.fillStyle = g; c.fillRect(px, y + 3, 20, 26);
          c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(px + 2, y + 4, 2, 24);
        }
        c.fillStyle = '#4a4740'; c.fillRect(x - 2, y + 32, 52, 3);
        run(c, w, h, r, x + 4 + r() * 40, y + 35, 20 + r() * 40, 2, [40, 36, 30], 0.25);
      }
    }
  });
  // cloth: a twill weave (the diagonal ribs of a work shirt or trousers), the threads a shade apart
  function cloth(base) {
    return (c, w, h, r) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      pass(c, w, h, (d, i, x, y) => { const t = (x + y) % 4, k = t === 0 ? 1.1 : t === 1 ? 1.03 : t === 2 ? 0.95 : 0.9; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; });
      for (let y = 0; y < h; y++) if (r() < 0.2) { c.fillStyle = rgba(r() < 0.5 ? [0, 0, 0] : [255, 255, 255], 0.04); c.fillRect(0, y, w, 1); } // slubs in the weft
      shadeBy(c, w, h, fbm(w, h, r, 2, 3, 0.6), 0.08);
      grain(c, w, h, r, 0.08);
    };
  }
  def('fabric_grey', 64, 64, 0.6, cloth('#58595c'));
  def('fabric_blue', 64, 64, 0.6, cloth('#304a6b'));
  def('plastic', 32, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#c2bfb4'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 8);
  });
  def('plastic_orange', 32, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#c4672c'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 10);
  });
  def('white', 8, 8, 1.0, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); });
  def('black', 8, 8, 1.0, (c, w, h) => { c.fillStyle = '#121212'; c.fillRect(0, 0, w, h); });
  def('light_panel', 32, 32, 1.2, (c, w, h, r) => {
    c.fillStyle = '#f4f1e2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d9d5c2';
    for (let x = 2; x < w; x += 4) c.fillRect(x, 0, 1, h);
    c.fillStyle = '#9a978c'; c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2); c.fillRect(0, 0, 2, h); c.fillRect(w - 2, 0, 2, h);
  });
  def('light_panel_dim', 32, 32, 1.2, (c, w, h, r) => {
    c.fillStyle = '#8f8c80'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7a776c';
    for (let x = 2; x < w; x += 4) c.fillRect(x, 0, 1, h);
    c.fillStyle = '#5a584f'; c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2);
  });
  def('chainlink', 32, 32, 0.5, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(170,175,175,0.95)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, h / 2); c.lineTo(w / 2, 0); c.lineTo(w, h / 2); c.lineTo(w / 2, h); c.closePath();
    c.stroke();
  }, { alpha: true });
  def('grate', 32, 32, 0.5, (c, w, h) => {
    c.fillStyle = '#2a2c2d'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#6a6e70';
    for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 2, h);
    c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2);
  });
  def('vent', 32, 32, 0.6, (c, w, h) => {
    c.fillStyle = '#9fa3a3'; c.fillRect(0, 0, w, h);
    for (let y = 4; y < h - 2; y += 4) { c.fillStyle = '#2f3233'; c.fillRect(3, y, w - 6, 2); }
    c.fillStyle = '#6a6e6e'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h);
  });
  def('lockers', 64, 128, 1.2, (c, w, h, r) => {
    c.fillStyle = '#56707a'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) {
      c.fillStyle = '#2f3d42'; c.fillRect(x, 0, 2, h);
      for (let y = 8; y < 30; y += 4) { c.fillStyle = '#34454b'; c.fillRect(x + 8, y, 16, 2); }
      c.fillStyle = '#c0c4c4'; c.fillRect(x + 24, 60, 3, 10);
      c.fillStyle = '#e8e2c8'; c.fillRect(x + 8, 36, 12, 6);
    }
    noise(c, w, h, r, 12);
  });
  def('shelf_files', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#3c3a35'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 2; row++) {
      let x = 1;
      while (x < w - 1) {
        const bw = 2 + Math.floor(r() * 4);
        const col = U.pick(['#c8b88a', '#a39066', '#7a8a9a', '#9a6a4a', '#d8d0b8', '#5c6f84']);
        c.fillStyle = col;
        const top = row * 32 + 4 + Math.floor(r() * 5);
        c.fillRect(x, top, bw, 32 - (top - row * 32) - 2);
        x += bw + 1;
      }
      c.fillStyle = '#6a6458'; c.fillRect(0, row * 32 + 30, w, 2);
    }
  });
  def('server', 32, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#16191b'; c.fillRect(0, 0, w, h);
    for (let y = 2; y < h; y += 6) {
      c.fillStyle = '#2b3033'; c.fillRect(1, y, w - 2, 5);
      for (let x = 3; x < 12; x += 3) {
        c.fillStyle = r() > 0.4 ? (r() > 0.5 ? '#38e86b' : '#e8b838') : '#1e3a24';
        c.fillRect(x, y + 2, 1, 1);
      }
      c.fillStyle = '#4a5054'; c.fillRect(16, y + 1, 13, 3);
    }
  });
  def('crt_green', 32, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#04140a'; c.fillRect(0, 0, w, h);
    for (let y = 3; y < h - 2; y += 3) {
      c.fillStyle = 'rgba(80,255,120,' + (0.3 + r() * 0.5) + ')';
      c.fillRect(2, y, 4 + Math.floor(r() * 22), 1);
    }
    for (let y = 0; y < h; y += 2) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y, w, 1); }
  });
  def('crt_blue', 32, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#0a1830'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2e6fd6'; c.fillRect(0, 0, w, 4);
    for (let y = 7; y < h - 2; y += 3) {
      c.fillStyle = 'rgba(180,210,255,' + (0.3 + r() * 0.5) + ')';
      c.fillRect(3, y, 3 + Math.floor(r() * 20), 1);
    }
    for (let y = 0; y < h; y += 2) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y, w, 1); }
  });
  def('crt_cctv', 32, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#1b1f1c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3e4741'; c.fillRect(4, 14, 24, 12); c.fillRect(8, 6, 4, 8);
    noise(c, w, h, r, 50);
    for (let y = 0; y < h; y += 2) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y, w, 1); }
    c.fillStyle = '#e84a3a'; c.fillRect(26, 2, 3, 3);
  });
  def('vending', 32, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#7a1f1f'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a2430'; c.fillRect(2, 2, 20, 46);
    for (let y = 4; y < 46; y += 8) for (let x = 3; x < 21; x += 5) {
      c.fillStyle = U.pick(['#d8c050', '#4a8ad8', '#d85a3a', '#5ad87a', '#e8e8e8']);
      c.fillRect(x, y, 3, 5);
    }
    c.fillStyle = 'rgba(200,230,255,0.15)'; c.fillRect(2, 2, 20, 46);
    c.fillStyle = '#c8c8c0'; c.fillRect(24, 10, 6, 14);
    c.fillStyle = '#111'; c.fillRect(4, 52, 16, 8);
    c.fillStyle = '#f0e0a0'; c.fillRect(24, 4, 6, 3);
  });
  def('paper', 32, 32, 0.3, (c, w, h, r) => {
    c.fillStyle = '#e8e3d3'; c.fillRect(0, 0, w, h);
    for (let y = 5; y < h - 3; y += 3) { c.fillStyle = 'rgba(40,40,40,0.4)'; c.fillRect(3, y, 6 + Math.floor(r() * 20), 1); }
  });
  def('corkboard', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#9b7348'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, r, 500, ['#7f5c38', '#b48858', '#6b4c2e'], 1);
    for (let i = 0; i < 7; i++) {
      const x = 4 + Math.floor(r() * 44), y = 4 + Math.floor(r() * 44);
      c.fillStyle = U.pick(['#ece6d4', '#f2e9a8', '#d8e4ec', '#f0d0c0']);
      c.fillRect(x, y, 12 + Math.floor(r() * 6), 14 + Math.floor(r() * 4));
      c.fillStyle = 'rgba(40,40,40,0.5)';
      for (let k = 0; k < 4; k++) c.fillRect(x + 2, y + 3 + k * 3, 8, 1);
      c.fillStyle = U.pick(['#d03030', '#3050d0', '#30a030']); c.fillRect(x + 5, y, 2, 2);
    }
    c.fillStyle = '#4a3420'; c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3); c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
  });
  def('whiteboard', 64, 32, 1.0, (c, w, h, r) => {
    c.fillStyle = '#eef0ee'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(40,60,160,0.6)'; c.lineWidth = 1;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(6 + r() * 10, 5 + i * 5); c.lineTo(20 + r() * 34, 5 + i * 5 + r() * 2); c.stroke(); }
    c.strokeStyle = 'rgba(180,40,40,0.6)'; c.beginPath(); c.arc(48, 20, 6, 0, 6.28); c.stroke();
    c.fillStyle = '#8a8c8a'; c.fillRect(0, 0, w, 1); c.fillRect(0, h - 1, w, 1);
  });
  def('water', 64, 64, 3.0, (c, w, h, r) => {
    c.fillStyle = '#20343a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = 'rgba(160,200,210,' + r() * 0.25 + ')';
      c.fillRect(Math.floor(r() * w), Math.floor(r() * h), 4 + Math.floor(r() * 10), 1);
    }
  });
  def('rail_track', 64, 64, 2.0, (c, w, h, r) => {
    c.fillStyle = '#2d2a26'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, r, 600, ['#3e3a34', '#4a443c', '#26231f', '#5a5246'], 2);
    for (let y = 2; y < h; y += 12) { c.fillStyle = '#4a3624'; c.fillRect(0, y, w, 5); }
    c.fillStyle = '#8a8a88'; c.fillRect(12, 0, 4, h); c.fillRect(48, 0, 4, h);
  });
  def('tactile', 32, 32, 0.6, (c, w, h) => {
    c.fillStyle = '#c9a42a'; c.fillRect(0, 0, w, h);
    for (let y = 2; y < h; y += 6) for (let x = 2; x < w; x += 6) { c.fillStyle = '#8f7418'; c.fillRect(x, y, 3, 3); }
  });
  def('hazard', 32, 32, 1.0, (c, w, h) => {
    c.fillStyle = '#d8b020'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1a1a';
    for (let i = -h; i < w; i += 12) { c.beginPath(); c.moveTo(i, h); c.lineTo(i + 6, h); c.lineTo(i + 6 + h, 0); c.lineTo(i + h, 0); c.fill(); }
  });
  def('glass_dark', 8, 8, 1.0, (c, w, h) => { c.fillStyle = '#1d2326'; c.fillRect(0, 0, w, h); });
  /* ------------------------------ Build 3: the training room ------------------------------ */
  // interlocking foam mats, scuffed where people land
  def('mat_foam', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#1f2a38'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 14);
    blotches(c, w, h, r, 5, 'rgba(120,130,150,0.12)', 6, 18);
    c.fillStyle = 'rgba(8,10,14,0.85)';
    for (let x = 0; x < w; x += 8) { c.fillRect(x, 0, 1, 3); c.fillRect(x + 4, h - 3, 1, 3); }
    c.fillRect(0, 0, w, 1); c.fillRect(0, 0, 1, h);
    speckle(c, w, h, r, 60, ['#2c394c', '#141c26'], 1);
  });
  // a chalkboard, wiped a hundred times
  def('chalkboard', 64, 64, 1.2, (c, w, h, r) => {
    c.fillStyle = '#1e2420'; c.fillRect(0, 0, w, h);
    blotches(c, w, h, r, 10, 'rgba(200,205,200,0.06)', 6, 22);
    noise(c, w, h, r, 8);
  });
  // rubber floor of the ring
  def('mat_red', 64, 64, 1.0, (c, w, h, r) => {
    c.fillStyle = '#5a1c1a'; c.fillRect(0, 0, w, h);
    noise(c, w, h, r, 16);
    blotches(c, w, h, r, 6, 'rgba(20,6,6,0.25)', 6, 20);
    c.fillStyle = 'rgba(10,4,4,0.7)'; c.fillRect(0, 0, w, 1); c.fillRect(0, 0, 1, h);
  });

  /* ------------------------------ sky -------------------------------- */
  def('skyline', 1024, 256, 1, (c, w, h, r) => {
    c.clearRect(0, 0, w, h);
    // far layer
    let x = 0;
    while (x < w) {
      const bw = 10 + Math.floor(r() * 40), bh = 20 + Math.floor(r() * 90);
      c.fillStyle = '#3c4148';
      c.fillRect(x, h - bh, bw, bh);
      x += bw + Math.floor(r() * 4);
    }
    // near layer with lit windows
    x = 0;
    while (x < w) {
      const bw = 18 + Math.floor(r() * 50);
      let bh = 30 + Math.floor(r() * 120);
      if (r() < 0.04) bh = 200 + Math.floor(r() * 40); // landmark towers
      c.fillStyle = '#23272c';
      c.fillRect(x, h - bh, bw, bh);
      if (bh > 190) { c.fillRect(x + bw / 2 - 1, h - bh - 30, 2, 30); c.fillRect(x + bw / 2 - 6, h - bh - 4, 12, 4); }
      // broken tops
      if (r() < 0.3) { c.clearRect(x + Math.floor(r() * bw), h - bh, 4 + Math.floor(r() * 8), 6 + Math.floor(r() * 10)); }
      for (let wy = h - bh + 6; wy < h - 4; wy += 6) for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
        if (r() < 0.06) { c.fillStyle = 'rgba(230,200,130,0.85)'; c.fillRect(wx, wy, 2, 3); }
      }
      x += bw + Math.floor(r() * 10);
    }
  }, { alpha: true, wrap: 'repeatX' });

  /* ---------------------------- emblems ------------------------------ */
  // Simple original faction sigils.
  function emblem(id, c, w, h, color, bg) {
    const cx = w / 2, cy = h / 2, R = w * 0.44;
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); } else c.clearRect(0, 0, w, h);
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w * 0.045;
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
    c.lineWidth = w * 0.035;
    if (id === 'abnegation') {
      // two open hands meeting
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(cx + s * R * 0.08, cy + R * 0.55);
        c.quadraticCurveTo(cx + s * R * 0.75, cy + R * 0.35, cx + s * R * 0.55, cy - R * 0.25);
        c.lineTo(cx + s * R * 0.25, cy - R * 0.6);
        c.stroke();
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.moveTo(cx + s * R * (0.5 - k * 0.1), cy - R * (0.2 + k * 0.12));
          c.lineTo(cx + s * R * (0.12 + k * 0.04), cy - R * (0.35 + k * 0.1));
          c.stroke();
        }
      }
    } else if (id === 'dauntless') {
      // flames
      for (const [ox, sc] of [[-0.32, 0.7], [0.32, 0.7], [0, 1]]) {
        c.beginPath();
        const bx = cx + ox * R, by = cy + R * 0.6;
        c.moveTo(bx - R * 0.22 * sc, by);
        c.quadraticCurveTo(bx - R * 0.35 * sc, by - R * 0.6 * sc, bx, by - R * 1.25 * sc);
        c.quadraticCurveTo(bx + R * 0.1 * sc, by - R * 0.7 * sc, bx + R * 0.3 * sc, by - R * 0.55 * sc);
        c.quadraticCurveTo(bx + R * 0.32 * sc, by - R * 0.2 * sc, bx + R * 0.22 * sc, by);
        c.closePath();
        c.fill();
      }
    } else if (id === 'erudite') {
      // an eye
      c.beginPath();
      c.moveTo(cx - R * 0.75, cy);
      c.quadraticCurveTo(cx, cy - R * 0.75, cx + R * 0.75, cy);
      c.quadraticCurveTo(cx, cy + R * 0.75, cx - R * 0.75, cy);
      c.stroke();
      c.beginPath(); c.arc(cx, cy, R * 0.22, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(cx - R * 0.5, cy - R * 0.62); c.lineTo(cx + R * 0.5, cy - R * 0.62); c.stroke();
    } else if (id === 'candor') {
      // balance scales
      c.beginPath(); c.moveTo(cx, cy - R * 0.65); c.lineTo(cx, cy + R * 0.55); c.stroke();
      c.beginPath(); c.moveTo(cx - R * 0.6, cy - R * 0.4); c.lineTo(cx + R * 0.6, cy - R * 0.4); c.stroke();
      c.beginPath(); c.moveTo(cx - R * 0.3, cy + R * 0.55); c.lineTo(cx + R * 0.3, cy + R * 0.55); c.stroke();
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(cx + s * R * 0.6, cy - R * 0.4); c.lineTo(cx + s * R * 0.42, cy + R * 0.05);
        c.lineTo(cx + s * R * 0.78, cy + R * 0.05); c.closePath(); c.stroke();
        c.beginPath(); c.arc(cx + s * R * 0.6, cy + R * 0.05, R * 0.18, 0, Math.PI); c.fill();
      }
    } else if (id === 'amity') {
      // tree
      c.beginPath(); c.moveTo(cx, cy + R * 0.65); c.lineTo(cx, cy - R * 0.1); c.stroke();
      for (const [dx, dy] of [[-0.35, -0.15], [0.35, -0.15], [0, -0.45]]) {
        c.beginPath(); c.moveTo(cx, cy + R * 0.1); c.lineTo(cx + dx * R * 0.6, cy + dy * R * 0.4); c.stroke();
      }
      for (const [dx, dy, rr] of [[0, -0.4, 0.3], [-0.32, -0.15, 0.24], [0.32, -0.15, 0.24], [-0.18, -0.55, 0.2], [0.18, -0.55, 0.2]]) {
        c.beginPath(); c.arc(cx + dx * R, cy + dy * R, rr * R, 0, Math.PI * 2); c.fill();
      }
      c.beginPath(); c.moveTo(cx - R * 0.4, cy + R * 0.65); c.lineTo(cx + R * 0.4, cy + R * 0.65); c.stroke();
    } else if (id === 'factionless') {
      c.beginPath(); c.moveTo(cx - R * 0.5, cy - R * 0.5); c.lineTo(cx + R * 0.5, cy + R * 0.5); c.stroke();
    } else {
      // five-faction seal: five dots on a ring
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
        c.beginPath(); c.arc(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55, R * 0.16, 0, Math.PI * 2); c.fill();
      }
      c.beginPath(); c.arc(cx, cy, R * 0.2, 0, Math.PI * 2); c.stroke();
    }
  }

  /* ---------------------------- API ------------------------------- */
  const Tex = {
    defs,
    // the painting toolkit, for the textures painted elsewhere (the city's facades, faces, clothes)
    paint: { fbm, pass, shadeBy, stainBy, grain, run, runs, blob, crack, wrap, rgba, smooth, brickWall, concreteBody, ctx2d },
    filterMode() {
      return DV.Settings && DV.Settings.get('textureFilter') === 'smooth' ? THREE.LinearFilter : THREE.NearestFilter;
    },
    finalize(tex, opts) {
      tex.wrapS = opts.wrap === 'clamp' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
      tex.wrapT = opts.wrap === 'clamp' || opts.wrap === 'repeatX' || opts.clampV ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
      tex.magFilter = Tex.filterMode();
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = Tex.aniso || 1; // (the renderer sets this: streets stay sharp at a low angle)
      tex.needsUpdate = true;
      return tex;
    },
    get(name) {
      if (cache[name]) return cache[name];
      const d = defs[name];
      if (!d) {
        console.warn('[Tex] missing texture', name);
        return Tex.get('white');
      }
      const cv = makeCanvas(d.w, d.h);
      const ctx = ctx2d(cv);
      d.painter(ctx, d.w, d.h, U.rng('tex_' + name));
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, d.opts);
      tex.userData.world = d.world;
      tex.userData.alpha = !!d.opts.alpha;
      cache[name] = tex;
      return tex;
    },
    // A text sign. Cached by key.
    sign(text, opts) {
      opts = opts || {};
      const key = 'sign:' + text + ':' + JSON.stringify(opts);
      if (cache[key]) return cache[key];
      const w = opts.w || 256, h = opts.h || 64;
      const cv = makeCanvas(w, h);
      const c = cv.getContext('2d');
      c.fillStyle = opts.bg || '#1f2a2e';
      c.fillRect(0, 0, w, h);
      if (opts.border !== false) {
        c.strokeStyle = opts.borderColor || 'rgba(255,255,255,0.6)';
        c.lineWidth = 3;
        c.strokeRect(5, 5, w - 10, h - 10);
      }
      if (opts.stripe) { c.fillStyle = opts.stripe; c.fillRect(0, h - 12, w, 6); }
      c.fillStyle = opts.color || '#f1ede0';
      const lines = String(text).split('\n');
      let size = opts.size || Math.floor((h * 0.5) / lines.length);
      const fontOf = (sz) => (opts.weight || 'bold') + ' ' + sz + 'px ' + (opts.font || '"Arial Narrow", Arial, sans-serif');
      c.font = fontOf(size);
      const room = w - (opts.arrow ? 90 : 28);
      while (size > 8 && Math.max.apply(null, lines.map((ln) => c.measureText(ln).width)) > room) {
        size--;
        c.font = fontOf(size);
      }
      c.textAlign = opts.align || 'center';
      c.textBaseline = 'middle';
      const x = opts.align === 'left' ? 16 : w / 2;
      lines.forEach((ln, i) => {
        c.fillText(ln, x, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15);
      });
      if (opts.arrow) {
        c.font = 'bold ' + Math.floor(h * 0.55) + 'px Arial';
        c.textAlign = opts.arrow === 'left' ? 'left' : 'right';
        c.fillText(opts.arrow === 'left' ? '◄' : opts.arrow === 'up' ? '▲' : '►', opts.arrow === 'left' ? 14 : w - 14, h / 2);
      }
      // retro grime
      const r = U.rng(key);
      const img = c.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (r() - 0.5) * 18;
        img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
      }
      c.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, { wrap: 'clamp' });
      tex.magFilter = THREE.LinearFilter;
      cache[key] = tex;
      return tex;
    },
    emblem(id, color, bg, size) {
      const key = 'emblem:' + id + ':' + color + ':' + bg + ':' + (size || 128);
      if (cache[key]) return cache[key];
      const s = size || 128;
      const cv = makeCanvas(s, s);
      emblem(id, cv.getContext('2d'), s, s, color || '#ffffff', bg);
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, { wrap: 'clamp' });
      tex.magFilter = THREE.LinearFilter;
      cache[key] = tex;
      return tex;
    },
    // Draws an emblem onto any 2D canvas (used by the UI).
    drawEmblem(ctx, id, size, color, bg) {
      emblem(id, ctx, size, size, color, bg);
    },
    // Faction banner (tall cloth)
    banner(faction) {
      const key = 'banner:' + faction;
      if (cache[key]) return cache[key];
      const f = DV.Factions.get(faction);
      const w = 64, h = 160;
      const cv = makeCanvas(w, h);
      const c = cv.getContext('2d');
      c.fillStyle = faction === 'candor' ? '#1a1a1a' : f.color;
      c.fillRect(0, 0, w, h);
      c.fillStyle = faction === 'candor' ? '#efede6' : 'rgba(0,0,0,0.25)';
      c.fillRect(0, 0, w, 6); c.fillRect(0, h - 22, w, 4);
      const ecv = makeCanvas(56, 56);
      emblem(faction, ecv.getContext('2d'), 56, 56, faction === 'candor' ? '#efede6' : f.accent);
      c.drawImage(ecv, 4, 30);
      c.fillStyle = faction === 'candor' ? '#efede6' : f.accent;
      c.font = 'bold 9px Arial'; c.textAlign = 'center';
      c.fillText(f.name.toUpperCase(), w / 2, 110);
      // fringe
      for (let x = 0; x < w; x += 4) { c.clearRect(x, h - 10, 2, 10); }
      noise(c, w, h, U.rng(key), 16);
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, { wrap: 'clamp', alpha: true });
      cache[key] = tex;
      return tex;
    },
    poster(kind) {
      const key = 'poster:' + kind;
      if (cache[key]) return cache[key];
      const w = 128, h = 192;
      const cv = makeCanvas(w, h);
      const c = cv.getContext('2d');
      // restrained civic notices: paper, ink, one colour, a mark, a line of type
      const posters = {
        factions: ['#d9d5c7', '#23272a', '#5b6b78', ['FIVE FACTIONS', 'ONE CITY'], 'seal'],
        test: ['#c9d0d6', '#1c2a3a', '#3c5f86', ['THE TEST', 'IS A GUIDE'], 'erudite'],
        quiet: ['#cfcdc4', '#26282a', '#6f7374', ['PLEASE', 'REMAIN QUIET'], 'abnegation'],
        safety: ['#d6d2c4', '#2a2422', '#8a3a30', ['REPORT ANYTHING', 'UNUSUAL'], 'dauntless'],
        harvest: ['#d8d0b8', '#2e2a20', '#8a6a34', ['AMITY HARVEST', 'FESTIVAL'], 'amity'],
        choose: ['#1d1f21', '#e4e1d8', '#8a8f94', ['FACTION', 'BEFORE BLOOD'], 'seal'],
        dauntless: ['#1d1f21', '#e4e1d8', '#8a3a30', ['DAUNTLESS', 'HOLD THE LINE'], 'dauntless'],
      };
      const p = posters[kind] || posters.factions;
      c.fillStyle = p[0]; c.fillRect(0, 0, w, h);
      c.fillStyle = p[2]; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10);
      const ecv = makeCanvas(72, 72);
      emblem(p[4], ecv.getContext('2d'), 72, 72, p[2] === '#8a8f94' ? '#e4e1d8' : p[2], null);
      c.drawImage(ecv, (w - 72) / 2, 28);
      c.strokeStyle = p[1]; c.lineWidth = 2; c.strokeRect(6, 6, w - 12, h - 12);
      c.fillStyle = p[1]; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 15px Georgia, "Times New Roman", serif';
      p[3].forEach((ln, i) => { let sz = 15; c.font = 'bold ' + sz + 'px Georgia, "Times New Roman", serif'; while (sz > 9 && c.measureText(ln).width > w - 24) { sz--; c.font = 'bold ' + sz + 'px Georgia, "Times New Roman", serif'; } c.fillText(ln, w / 2, 124 + i * 20); });
      c.fillRect(24, 168, w - 48, 2);
      noise(c, w, h, U.rng(key), 8);
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, { wrap: 'clamp' });
      tex.magFilter = THREE.LinearFilter;
      cache[key] = tex;
      return tex;
    },
    // generic canvas texture from a painter fn (not cached unless key)
    custom(key, w, h, painter, opts) {
      if (key && cache[key]) return cache[key];
      const cv = makeCanvas(w, h);
      const c = cv.getContext('2d');
      painter(c, w, h, U.rng(key || 'custom'));
      const tex = new THREE.CanvasTexture(cv);
      Tex.finalize(tex, opts || { wrap: 'clamp' });
      tex.userData.canvas = cv;
      if (key) cache[key] = tex;
      return tex;
    },
    refreshFilters() {
      const f = Tex.filterMode();
      for (const k in cache) {
        if (cache[k].magFilter !== THREE.LinearFilter || k.indexOf(':') < 0) {
          cache[k].magFilter = k.indexOf(':') >= 0 ? cache[k].magFilter : f;
          cache[k].needsUpdate = true;
        }
      }
    },
  };
  DV.Tex = Tex;
})();
