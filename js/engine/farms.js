/* ==========================================================================
   DIVERGENT — the farms, and the ground between the city and them
   Amity's farmland is worked land: the crops standing in their rows (wheat,
   corn, cabbages, beans up their poles), orchards in lines, hedgerows and
   fences with gates in them, ditches along the roads, hay out on the stubble,
   scarecrows, and the farms themselves: the house with its porch, the barn,
   the silo and the bins, the machine shed with the old tractor in it, the
   windpump over its trough, the coop, a pond, the hives, a greenhouse or a
   row of polytunnels. Between the last streets and the farms is the city's
   ragged edge: depots and warehouses, a rail yard, gas stations, allotments,
   factionless camps round their fire barrels, overgrown lots, billboards, the
   poles and their wires. In the city, its empty lots: a garden, a market, the
   wrecks. Along the shore, the reeds and the old jetties.

   It's all placed up front (just data, from DV.CityMap.farms() and roadNet())
   and built in chunks as you come near: one mesh a chunk, all on one material
   (a little atlas of pixel textures in bands: the crops and the reeds are
   cards in it), in three reaches: buildings, trees and hedges from far off,
   crops and fences nearer, the clutter close to. The windpumps' wheels turn
   (one instanced mesh), and the grass and wildflowers come up round you
   (another). Solid things are colliders, and the city's road audit lists them.

     const kit = DV.Farms.attach(zone, city)    (zone.farms)
     kit.update(px, pz, dt)                     every frame, with the camera's position
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // the reaches: [chunk size, built within, shown within]
  const TIERS = { far: [256, 760, 720], mid: [128, 360, 330], near: [64, 150, 130] };
  const SUN = (() => { const v = [0.45, 0.8, 0.35], l = Math.hypot(...v); return v.map((q) => q / l); })();
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

  /* ---------------- the atlas: bands of pixel texture, each tiling across ---------------- */
  // [top row, height, metres the band's width covers]: the cards (cut out) together at the top, then
  // the solid surfaces; u runs across a band and repeats, v stays inside it
  const AH = 1280;
  const BANDS = {
    wheat: [4, 56, 3], corn: [64, 112, 4], beans: [180, 56, 2], cabbage: [240, 28, 2], greens: [272, 24, 2],
    grass: [300, 28, 1.2], flowers: [332, 28, 1.2], reeds: [364, 56, 2], chain: [424, 28, 2],
    hedge: [484, 60, 3], leaves: [548, 60, 2], white: [612, 12, 4], planks: [628, 60, 2.4], siding: [692, 44, 2.4],
    corr: [740, 44, 1.6], shingle: [788, 44, 2], hay: [836, 28, 1], canvas: [868, 28, 2], stripes: [900, 12, 1.2],
    glass: [916, 44, 2], plastic: [964, 28, 2], gravel: [996, 24, 2],
    ad0: [1024, 64, 8], ad1: [1088, 64, 8], ad2: [1152, 64, 8], ad3: [1216, 64, 8],
  };
  // v at t (0 at the band's foot, 1 at its top), a pixel in from its edges
  const bandV = (b, t) => { const B = BANDS[b]; return 1 - (B[0] + B[1] - 1.5 - t * (B[1] - 3)) / AH; };

  function paintAtlas(g, w, h, r) {
    const px = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), ww, hh); };
    const pick = (a) => a[Math.floor(r() * a.length)];
    const fill = (b, c) => { const B = BANDS[b]; px(0, B[0], w, B[1], c); };
    const speck = (b, n, cols, s) => { const B = BANDS[b]; for (let i = 0; i < n; i++) px(r() * w, B[0] + r() * B[1], s || 1, s || 1, pick(cols)); };
    // (wraps round at the band's sides, so it tiles)
    const blob = (b, x, y, ww, hh, c) => { const B = BANDS[b]; for (const ox of [-w, 0, w]) px(x + ox, Math.max(B[0], y), ww, Math.min(hh, B[0] + B[1] - y), c); };
    let B;
    // wheat: stalks close together, the ears darker at their tops
    B = BANDS.wheat;
    for (let x = 0; x < w; x++) {
      if (r() < 0.12) continue;
      const top = B[0] + B[1] * (0.08 + r() * 0.3), col = pick(['#c8a650', '#b89640', '#d6b660', '#a88a3a']);
      px(x, top, 1, B[0] + B[1] - top, col);
      px(x - (r() < 0.5 ? 1 : 0), top - 1, 2, 6, pick(['#a0802c', '#b08c34', '#8c7028']));
      if (r() < 0.3) px(x, top - 4, 1, 3, '#d8c070');
      if (r() < 0.25) px(x + 1, B[0] + B[1] * (0.6 + r() * 0.3), 2, 1, '#7a8a3a');
    }
    // corn: tall stalks, the leaves arching off them, tassels, a cob now and then
    B = BANDS.corn;
    for (let x = 3; x < w; x += 18 + Math.floor(r() * 7)) {
      const top = B[0] + 6 + r() * 14, base = B[0] + B[1];
      px(x, top, 2, base - top, pick(['#56702c', '#4a6426', '#5e7a30']));
      for (let k = 0; k < 7; k++) {
        const y0 = base - (B[1] * (0.15 + k * 0.11)), dir = k % 2 ? 1 : -1, len = 9 + r() * 14;
        for (let s = 0; s < len; s++) blob('corn', x + dir * s, y0 - 4 * Math.sin((s / len) * 2.2) + s * 0.25, 2, 2, s < len * 0.7 ? '#5e7e32' : '#748c3a');
      }
      for (let k = 0; k < 4; k++) px(x - 2 + k * 1.3, top - 6 + r() * 3, 1, 7, '#d2c27a');
      if (r() < 0.7) { px(x + 2, base - B[1] * 0.5, 3, 9, '#c8c060'); px(x + 2, base - B[1] * 0.5 - 2, 2, 3, '#8a6a3a'); }
    }
    // beans: a climbing mass of leaves, white flowers, pods
    B = BANDS.beans;
    for (let i = 0; i < 1300; i++) { const y = B[0] + B[1] * (0.1 + 0.9 * Math.sqrt(r())); blob('beans', r() * w, y, 3 + (r() < 0.5 ? 1 : 0), 3, pick(['#3e5a22', '#4c6a28', '#58782e', '#36501e'])); }
    for (let i = 0; i < 70; i++) px(r() * w, B[0] + B[1] * (0.2 + r() * 0.7), 2, 2, pick(['#e8e4d8', '#e0a8b0']));
    for (let i = 0; i < 60; i++) px(r() * w, B[0] + B[1] * (0.3 + r() * 0.6), 1, 5, '#6c8a34');
    // cabbages: round heads along the row, the outer leaves spread at their feet
    B = BANDS.cabbage;
    for (let x = 0; x < w; x += 20 + Math.floor(r() * 6)) {
      const base = B[0] + B[1];
      for (let s = -11; s <= 11; s++) px(x + s, base - 5 + Math.abs(s) * 0.25, 1, 5, '#4a6a3a');
      for (let yy = 0; yy < 16; yy++) { const hw = Math.round(8 * Math.sqrt(1 - Math.pow((yy - 8) / 8.5, 2))); px(x - hw, base - 4 - yy, hw * 2, 1, yy > 9 ? '#9cba8a' : '#7a9c6c'); }
      px(x - 1, base - 18, 1, 12, '#6a8a5c');
    }
    // greens (potatoes, lettuces): low leafy clumps
    B = BANDS.greens;
    for (let x = 0; x < w; x += 12 + Math.floor(r() * 6)) for (let i = 0; i < 26; i++) { const a = r() * Math.PI, d = r() * 8; blob('greens', x + Math.cos(a) * d, B[0] + B[1] - 3 - Math.sin(a) * d * 1.6, 3, 3, pick(['#4e7030', '#5e8236', '#3e5c26'])); }
    // grass, and grass with the wildflowers in it
    for (const b of ['grass', 'flowers']) {
      B = BANDS[b];
      for (let i = 0; i < 260; i++) {
        const x = r() * w, len = B[1] * (0.3 + r() * 0.7), lean = (r() - 0.5) * 0.5, col = pick(['#5a7030', '#6c823a', '#4e6428', '#7e8c44', '#8a8a4a']);
        for (let s = 0; s < len; s++) px(x + lean * s, B[0] + B[1] - 1 - s, 1, 1, col);
      }
      if (b === 'flowers') for (let i = 0; i < 46; i++) { const x = r() * w, y = B[0] + 2 + r() * B[1] * 0.45; px(x, y, 2, 2, pick(['#f0eee0', '#e8d040', '#b060c0', '#d03828', '#f0f0f0'])); px(x, y + 2, 1, B[0] + B[1] - y - 2, '#5a7030'); }
    }
    // reeds: thin and tall, the bulrushes' brown heads
    B = BANDS.reeds;
    for (let i = 0; i < 220; i++) {
      const x = r() * w, len = B[1] * (0.6 + r() * 0.4), lean = (r() - 0.5) * 0.25;
      for (let s = 0; s < len; s++) px(x + lean * s, B[0] + B[1] - 1 - s, 1, 1, s > len * 0.8 ? '#a8a060' : pick(['#6a7438', '#7a8040', '#5c6630']));
      if (r() < 0.2) px(x + lean * len * 0.8 - 1, B[0] + B[1] - len * 0.85, 3, 7, '#5a3c22');
    }
    // chain-link: wire diamonds
    B = BANDS.chain;
    for (let y = 0; y < B[1]; y++) for (let x = 0; x < w; x++) if ((x + y) % 7 === 0 || (x - y + 700) % 7 === 0) px(x, B[0] + y, 1, 1, (x + y) % 3 ? '#8a8c88' : '#6c6e6a');
    // the hedge: leaves, ragged along the top
    B = BANDS.hedge;
    px(0, B[0] + 8, w, B[1] - 8, '#2e4220');
    for (let x = 0; x < w; x += 2) { const t = B[0] + r() * 9; px(x, t, 2, B[0] + 9 - t, '#34482a'); }
    for (let i = 0; i < 1400; i++) blob('hedge', r() * w, B[0] + 6 + r() * (B[1] - 6), 3, 3, pick(['#3a5226', '#466030', '#2a3c1c', '#52683a', '#3e4a24']));
    // leaves: a tree's crown, fruit in it
    fill('leaves', '#3a5626');
    for (let i = 0; i < 1500; i++) blob('leaves', r() * w, BANDS.leaves[0] + r() * BANDS.leaves[1], 3, 3, pick(['#46642e', '#527036', '#304a20', '#5c7a3c', '#3c5a28']));
    for (let i = 0; i < 70; i++) blob('leaves', r() * w, BANDS.leaves[0] + r() * BANDS.leaves[1], 3, 3, pick(['#b8382a', '#c84a2c', '#a83024', '#d0a030']));
    fill('white', '#ffffff');
    // planks: weathered boards, upright, gaps and nails
    B = BANDS.planks;
    for (let x = 0; x < w; x += 16) {
      const k = 150 + Math.floor(r() * 50);
      px(x, B[0], 16, B[1], 'rgb(' + k + ',' + k + ',' + k + ')');
      px(x, B[0], 1, B[1], '#505050');
      for (const y of [4, B[1] / 2, B[1] - 5]) px(x + 3, B[0] + y, 1, 1, '#404040'), px(x + 12, B[0] + y, 1, 1, '#404040');
      for (let i = 0; i < 8; i++) px(x + 2 + r() * 12, B[0] + r() * B[1], 1, 4 + r() * 10, 'rgba(60,60,60,0.25)');
    }
    for (let i = 0; i < 26; i++) blob('planks', r() * w, B[0] + B[1] * 0.6 + r() * B[1] * 0.4, 6 + r() * 10, 4, 'rgba(40,40,40,0.18)');
    // siding: clapboards, the shadow under each
    B = BANDS.siding;
    fill('siding', '#d8d8d4');
    for (let y = 0; y < B[1]; y += 6) { px(0, B[0] + y + 5, w, 1, '#8a8a86'); px(0, B[0] + y, w, 1, '#ececea'); }
    for (let i = 0; i < 14; i++) px(r() * w, B[0] + Math.floor(r() * 7) * 6, 1, 5, '#a0a09c');
    for (let i = 0; i < 300; i++) px(r() * w, B[0] + r() * B[1], 1, 1, pick(['#c4c4c0', '#e4e4e0']));
    // corrugated iron: the ribs, rust running down from the fixings
    B = BANDS.corr;
    for (let x = 0; x < w; x++) { const k = [190, 160, 120, 150][x % 4]; px(x, B[0], 1, B[1], 'rgb(' + k + ',' + k + ',' + (k + 4) + ')'); }
    for (let i = 0; i < 22; i++) { const x = r() * w; px(x, B[0] + r() * 6, 2, 8 + r() * 26, 'rgba(140,70,30,0.45)'); }
    px(0, B[0] + B[1] - 6, w, 6, 'rgba(60,50,40,0.25)');
    // shingles: rows of them, staggered
    B = BANDS.shingle;
    for (let y = 0; y < B[1]; y += 7) for (let x = (y / 7) % 2 ? -7 : 0; x < w; x += 14) { const k = 120 + Math.floor(r() * 50); px(x, B[0] + y, 13, 6, 'rgb(' + k + ',' + k + ',' + k + ')'); px(x, B[0] + y + 6, 14, 1, '#404040'); }
    // hay and straw
    fill('hay', '#c8b06a');
    for (let i = 0; i < 900; i++) px(r() * w, BANDS.hay[0] + r() * BANDS.hay[1], r() < 0.5 ? 3 : 1, r() < 0.5 ? 1 : 3, pick(['#e0c880', '#a89050', '#d4bc74', '#8c7840']));
    // canvas: a coarse weave, stains
    fill('canvas', '#c4c0b4');
    for (let y = 0; y < BANDS.canvas[1]; y++) for (let x = (y % 2); x < w; x += 2) px(x, BANDS.canvas[0] + y, 1, 1, '#b4b0a4');
    for (let i = 0; i < 12; i++) blob('canvas', r() * w, BANDS.canvas[0] + r() * 20, 8 + r() * 14, 6, 'rgba(80,70,50,0.18)');
    // the market's awnings: red and yellow
    B = BANDS.stripes;
    for (let x = 0; x < w; x += 32) { px(x, B[0], 16, B[1], '#b4382a'); px(x + 16, B[0], 16, B[1], '#d8a634'); }
    // greenhouse glass: panes in white frames, the green behind them
    B = BANDS.glass;
    fill('glass', '#9cb6b8');
    for (let i = 0; i < 40; i++) blob('glass', r() * w, B[0] + B[1] * 0.55 + r() * B[1] * 0.4, 6 + r() * 10, 5, 'rgba(60,110,50,0.5)');
    for (let i = 0; i < 30; i++) px(r() * w, B[0] + r() * B[1], 3, 3, 'rgba(255,255,255,0.25)');
    for (let x = 0; x < w; x += 32) px(x, B[0], 2, B[1], '#e4e8e0');
    for (let y = 0; y < B[1]; y += 22) px(0, B[0] + y, w, 2, '#e4e8e0');
    // a polytunnel's plastic: milky, ribbed, the plants inside showing
    B = BANDS.plastic;
    fill('plastic', '#d6dad0');
    for (let i = 0; i < 30; i++) blob('plastic', r() * w, B[0] + B[1] * 0.5 + r() * B[1] * 0.5, 8 + r() * 12, 6, 'rgba(90,130,70,0.35)');
    for (let x = 0; x < w; x += 64) px(x, B[0], 2, B[1], '#a8aca4');
    // gravel and hard earth
    fill('gravel', '#8a847a');
    for (let i = 0; i < 1600; i++) px(r() * w, BANDS.gravel[0] + r() * BANDS.gravel[1], 1, 1, pick(['#6a645a', '#a49e92', '#7a7468', '#5a554e', '#b0aa9c']));
    // the billboards: four old adverts, faded and peeling
    const ad = (b, bg, fg, text, sub) => {
      const A = BANDS[b];
      px(0, A[0], w, A[1], bg);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 22px Georgia, serif'; g.fillText(text, w / 2, A[0] + 24);
      g.font = 'bold 11px Arial, sans-serif'; g.fillText(sub, w / 2, A[0] + 48);
      px(0, A[0], w, 2, '#2a2824'); px(0, A[0] + A[1] - 2, w, 2, '#2a2824');
      for (let i = 0; i < 9; i++) px(r() * w, A[0] + r() * A[1], 6 + r() * 26, 4 + r() * 12, 'rgba(150,146,136,0.85)'); // (peeled)
      for (let i = 0; i < 400; i++) px(r() * w, A[0] + r() * A[1], 1, 1, 'rgba(255,255,255,0.12)');
    };
    ad('ad0', '#d8b44a', '#8a2a1c', 'AMITY · PEACE & PLENTY', 'FRESH FROM THE FARMS · EVERY DAY AT THE MARKET');
    ad('ad1', '#2c4c78', '#e8ecf0', 'KNOWLEDGE IS PROGRESS', 'ERUDITE · THE LIBRARY IS OPEN TO ALL');
    ad('ad2', '#2a2a2a', '#e0d4b4', 'FACTION BEFORE BLOOD', 'THE CHOOSING · SECTOR HALLS · ALL ARE WELCOME');
    ad('ad3', '#e0e0d8', '#1a1a1a', 'THE TRUTH IS PLAIN', 'CANDOR · MERCILESS MART · STATE & WASHINGTON');
    void h;
  }
  let atlasTex = null;
  function atlas() {
    if (atlasTex) return atlasTex;
    DV.Tex.defs.farm_atlas = { w: 256, h: AH, world: 1, painter: paintAtlas, opts: { wrap: 'repeatX', alpha: true } };
    atlasTex = DV.Tex.get('farm_atlas');
    return atlasTex;
  }

  /* ---------------- building geometry: triangles in world space, coloured and lit ---------------- */
  // Everything is placed in a local frame (fb.at(x, z, rot): +z local faces rot), lit by its facing
  // against the sun, the cards (cut out) evenly; uvs into the atlas's bands.
  class FB {
    constructor() { this.p = []; this.c = []; this.t = []; this.at(0, 0, 0); }
    get count() { return this.p.length / 3; }
    at(x, z, rot) { this.ox = x; this.oz = z; this.cs = Math.cos(rot || 0); this.sn = Math.sin(rot || 0); this.rot = rot || 0; return this; }
    W(lx, y, lz) { return [this.ox + lx * this.cs + lz * this.sn, y, this.oz - lx * this.sn + lz * this.cs]; }
    shade(a, b, c, want) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      if (want && nx * want[0] + ny * want[1] + nz * want[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
      return 0.55 + 0.38 * Math.max(0, nx * SUN[0] + ny * SUN[1] + nz * SUN[2]) + 0.1 * Math.max(0, ny);
    }
    tri(a, b, c, ta, tb, tc, col, k) {
      this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      this.t.push(ta[0], ta[1], tb[0], tb[1], tc[0], tc[1]);
      for (let i = 0; i < 3; i++) this.c.push(col[0] * k, col[1] * k, col[2] * k);
    }
    // a quad of world points; want: which way it faces (for its light), or null for a card
    quad(a, b, c, d, t, col, want) {
      const k = want === null ? 0.9 : this.shade(a, b, c, want || [0, 1, 0]);
      this.tri(a, b, c, t[0], t[1], t[2], col, k);
      this.tri(a, c, d, t[0], t[2], t[3], col, k);
    }
    // uvs for a rectangle in a band: u from u0 over len metres, v over the band
    uv(band, u0, len, t0, t1) { const w = BANDS[band][2], u1 = u0 + len / w; return [[u0, bandV(band, t0 === undefined ? 0 : t0)], [u1, bandV(band, t0 === undefined ? 0 : t0)], [u1, bandV(band, t1 === undefined ? 1 : t1)], [u0, bandV(band, t1 === undefined ? 1 : t1)]]; }
    // a box in the frame: centre (lx, lz), y0 up to y0 + h, w along local x, d along local z, turned by r
    // o: { top: band (default white; false for none), u0 }
    box(lx, y0, lz, w, h, d, r, col, band, o) {
      o = o || {};
      const c = Math.cos(r || 0), s = Math.sin(r || 0), y1 = y0 + h;
      const P = (ax, az) => this.W(lx + ax * c + az * s, 0, lz - ax * s + az * c);
      const pts = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
      const lens = [w, d, w, d], cx = (pts[0][0] + pts[2][0]) / 2, cz = (pts[0][2] + pts[2][2]) / 2, u0 = o.u0 || 0;
      for (let k = 0; k < 4; k++) {
        const A = pts[k], B = pts[(k + 1) % 4], want = [(A[0] + B[0]) / 2 - cx, 0, (A[2] + B[2]) / 2 - cz];
        this.quad([A[0], y0, A[2]], [B[0], y0, B[2]], [B[0], y1, B[2]], [A[0], y1, A[2]], this.uv(band || 'white', u0, lens[k]), col, want);
      }
      if (o.top !== false) { const tb = o.top || 'white'; this.quad([pts[0][0], y1, pts[0][2]], [pts[1][0], y1, pts[1][2]], [pts[2][0], y1, pts[2][2]], [pts[3][0], y1, pts[3][2]], this.uv(tb, u0, w), o.topCol || col, [0, 1, 0]); }
      if (o.bottom) this.quad([pts[0][0], y0, pts[0][2]], [pts[1][0], y0, pts[1][2]], [pts[2][0], y0, pts[2][2]], [pts[3][0], y0, pts[3][2]], this.uv('white', 0, 1), mul(col, 0.6), [0, -1, 0]);
    }
    // an upright cylinder (or cone, r1 0) round (lx, lz); o: { cap: 'flat' | a cone's height, band }
    cyl(lx, y0, lz, r0, r1, h, seg, col, band, o) {
      o = o || {};
      const C = this.W(lx, 0, lz), y1 = y0 + h, bw = BANDS[band || 'white'][2];
      for (let k = 0; k < seg; k++) {
        const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
        const A0 = [C[0] + Math.cos(a0) * r0, y0, C[2] + Math.sin(a0) * r0], B0 = [C[0] + Math.cos(a1) * r0, y0, C[2] + Math.sin(a1) * r0];
        const A1 = [C[0] + Math.cos(a0) * r1, y1, C[2] + Math.sin(a0) * r1], B1 = [C[0] + Math.cos(a1) * r1, y1, C[2] + Math.sin(a1) * r1];
        const u0 = (k * 2 * Math.PI * Math.max(r0, r1)) / seg / bw, du = (2 * Math.PI * Math.max(r0, r1)) / seg / bw, b = band || 'white';
        const want = [Math.cos((a0 + a1) / 2), (r0 - r1) / Math.max(h, 0.01), Math.sin((a0 + a1) / 2)];
        this.quad(A0, B0, B1, A1, [[u0, bandV(b, 0)], [u0 + du, bandV(b, 0)], [u0 + du, bandV(b, 1)], [u0, bandV(b, 1)]], col, want);
        if (o.cap === 'flat') this.tri([C[0], y1, C[2]], A1, B1, [0.5, bandV('white', 0.5)], [0.5, bandV('white', 0.5)], [0.5, bandV('white', 0.5)], o.capCol || col, this.shade([C[0], y1, C[2]], A1, B1, [0, 1, 0]));
        else if (typeof o.cap === 'number') {
          const T = [C[0], y1 + o.cap, C[2]], cb = o.capBand || b;
          this.tri(A1, B1, T, [u0, bandV(cb, 0)], [u0 + du, bandV(cb, 0)], [u0 + du / 2, bandV(cb, 1)], o.capCol || col, this.shade(A1, B1, T, [want[0], 1, want[2]]));
        }
      }
    }
    // a cylinder lying along local x (a bale, a wheel, a pipe): centre (lx, y, lz), turned by r
    cylX(lx, y, lz, rad, len, seg, r, col, band, endCol) {
      const c = Math.cos(r || 0), s = Math.sin(r || 0), b = band || 'white', bw = BANDS[b][2];
      const P = (ax, ay, az) => this.W(lx + ax * c + az * s, y + ay, lz - ax * s + az * c);
      const ring = (ax) => { const out = []; for (let k = 0; k <= seg; k++) { const a = (k / seg) * Math.PI * 2; out.push(P(ax, Math.cos(a) * rad, Math.sin(a) * rad)); } return out; };
      const L = ring(-len / 2), R = ring(len / 2), ax = P(1, 0, 0), o = P(0, 0, 0), dx = [ax[0] - o[0], 0, ax[2] - o[2]];
      for (let k = 0; k < seg; k++) {
        const a = ((k + 0.5) / seg) * Math.PI * 2, want = [Math.sin(a) * -s * 0 + (P(0, Math.cos(a), Math.sin(a))[0] - o[0]), Math.cos(a), P(0, Math.cos(a), Math.sin(a))[2] - o[2]];
        const u0 = (k * 2 * Math.PI * rad) / seg / bw, du = (2 * Math.PI * rad) / seg / bw;
        this.quad(L[k], R[k], R[k + 1], L[k + 1], [[u0, bandV(b, 0)], [u0, bandV(b, 1)], [u0 + du, bandV(b, 1)], [u0 + du, bandV(b, 0)]], col, want);
        // the ends
        const cL = P(-len / 2, 0, 0), cR = P(len / 2, 0, 0), ec = endCol || col, eu = (p2) => [0.5 + (p2[1] - y) / (2 * bw), bandV(b, 0.5)];
        this.tri(cL, L[k], L[k + 1], eu(cL), eu(L[k]), eu(L[k + 1]), ec, this.shade(cL, L[k], L[k + 1], [-dx[0], 0, -dx[2]]));
        this.tri(cR, R[k + 1], R[k], eu(cR), eu(R[k + 1]), eu(R[k]), ec, this.shade(cR, R[k + 1], R[k], dx));
      }
    }
    // a lumpy ball (a crown of leaves, a bush): an icosahedron, squashed by sy
    ball(lx, y, lz, r, sy, col, band, detail) {
      const g = new THREE.IcosahedronGeometry(r, detail || 0).toNonIndexed(), p = g.attributes.position.array, C = this.W(lx, y, lz), b = band || 'white', bw = BANDS[b][2];
      for (let i = 0; i < p.length; i += 9) {
        const v = [0, 1, 2].map((k) => [C[0] + p[i + k * 3], C[1] + p[i + k * 3 + 1] * sy, C[2] + p[i + k * 3 + 2]]);
        const t = v.map((q) => [(q[0] + q[2]) / bw, bandV(b, U.clamp(0.5 + (q[1] - C[1]) / (2 * r * sy), 0, 1))]);
        this.tri(v[0], v[1], v[2], t[0], t[1], t[2], col, this.shade(v[0], v[1], v[2], [v[0][0] - C[0], v[0][1] - C[1], v[0][2] - C[2]]));
      }
      g.dispose();
    }
    // a card: an upright cut-out quad from (ax, az) to (bx, bz), in the frame
    card(ax, az, bx, bz, y0, y1, col, band, u0) {
      const A = this.W(ax, 0, az), B = this.W(bx, 0, bz), len = Math.hypot(B[0] - A[0], B[2] - A[2]);
      this.quad([A[0], y0, A[2]], [B[0], y0, B[2]], [B[0], y1, B[2]], [A[0], y1, A[2]], this.uv(band, u0 || 0, len), col, null);
    }
    // a flat patch on the ground (world coords), in strips the band's width deep so it tiles both ways
    flat(x0, z0, x1, z1, y, col, band) {
      const b = band || 'white', bw = BANDS[b][2];
      for (let z = z0; z < z1 - 0.01; z += bw) {
        const za = z, zb = Math.min(z1, z + bw), t1 = (zb - za) / bw;
        this.quad([x0, y, za], [x1, y, za], [x1, y, zb], [x0, y, zb], [[x0 / bw, bandV(b, 0)], [x1 / bw, bandV(b, 0)], [x1 / bw, bandV(b, t1)], [x0 / bw, bandV(b, t1)]], col, [0, 1, 0]);
      }
    }
    // a sloped (or any) quad given in the frame: four [lx, y, lz]
    lquad(a, b, c, d, col, band, len, want, u0) {
      const A = this.W(...a), B = this.W(...b), C2 = this.W(...c), D = this.W(...d);
      const w = want ? (() => { const q = this.W(want[0], 0, want[2]), o = this.W(0, 0, 0); return [q[0] - o[0], want[1], q[2] - o[2]]; })() : null;
      this.quad(A, B, C2, D, this.uv(band || 'white', u0 || 0, len || Math.hypot(B[0] - A[0], B[2] - A[2], B[1] - A[1])), col, w);
    }
    ltri(a, b, c, col, band, want) {
      const A = this.W(...a), B = this.W(...b), C2 = this.W(...c), bw = BANDS[band || 'white'][2], b2 = band || 'white';
      const t = (q) => [(q[0] + q[2]) / bw, bandV(b2, U.clamp(q[1] / 8, 0, 1))];
      const o = this.W(0, 0, 0), wq = this.W(want[0], 0, want[2]);
      this.tri(A, B, C2, t(A), t(B), t(C2), col, this.shade(A, B, C2, [wq[0] - o[0], want[1], wq[2] - o[2]]));
    }
    // a built geometry (a car, a street piece: vertex-coloured, no uvs) set down in the frame
    merge(geo, lx, lz, r, k) {
      const p = geo.attributes.position.array, cl = geo.attributes.color.array, c = Math.cos(r || 0), s = Math.sin(r || 0), wv = bandV('white', 0.5);
      for (let i = 0; i < p.length; i += 3) {
        const q = this.W(lx + p[i] * c + p[i + 2] * s, p[i + 1], lz - p[i] * s + p[i + 2] * c);
        this.p.push(q[0], q[1], q[2]);
        this.t.push(0.5, wv);
        this.c.push(cl[i] * (k || 1), cl[i + 1] * (k || 1), cl[i + 2] * (k || 1));
      }
    }
    geometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.t, 2));
      g.computeBoundingSphere();
      return g;
    }
  }

  /* ---------------- the colours of things ---------------- */
  const WOOD = [0.55, 0.43, 0.3], WOOD_D = [0.38, 0.29, 0.2], OLDWOOD = [0.6, 0.57, 0.52], BARK = [0.32, 0.25, 0.18], STEEL = [0.5, 0.52, 0.54];
  const DARK = [0.13, 0.13, 0.14], RUST = [0.5, 0.3, 0.2], CONC = [0.62, 0.6, 0.56], SOIL = [0.33, 0.25, 0.18], GLASSD = [0.16, 0.2, 0.24];
  const HOUSE = [[0.86, 0.84, 0.76], [0.92, 0.9, 0.82], [0.8, 0.78, 0.66], [0.78, 0.82, 0.74], [0.74, 0.62, 0.48]];
  const ROOF = [[0.36, 0.34, 0.32], [0.44, 0.3, 0.24], [0.32, 0.38, 0.32], [0.4, 0.38, 0.36]];
  const CROPC = { wheat: [1.0, 0.92, 0.66], corn: [0.92, 1.0, 0.8], beans: [0.9, 1.0, 0.82], cabbage: [0.9, 1.0, 0.95], green: [0.95, 1.0, 0.9], stubble: [0.98, 0.92, 0.72] };

  /* ---------------- the pieces: each builds itself into a chunk's geometry ---------------- */
  // it: { k, x, z, rot, s (a seed 0..1), ... }; the builder's frame is set to (x, z, rot) for it
  const BUILD = {
    // a farmhouse: two storeys of clapboard on a stone footing, a shingled roof with its chimney, a
    // porch along the front (+z), windows in white frames
    farmhouse(f, it) {
      const w = it.w || 9, d = it.d || 7.5, st = it.storeys || 2, sh = 2.8, h = st * sh, col = HOUSE[Math.floor(it.s * HOUSE.length)], roof = ROOF[Math.floor(it.s * 7) % ROOF.length];
      f.box(0, 0, 0, w + 0.3, 0.5, d + 0.3, 0, CONC, 'gravel', { top: false });
      for (let k = 0; k < st; k++) f.box(0, 0.5 + k * sh, 0, w, sh, d, 0, col, 'siding', { top: false, u0: k * 0.37 });
      gableRoof(f, 0, 0, w, d, 0.5 + h, 2.6, 'x', roof, col, 'shingle', 'siding');
      f.box(w / 2 - 1.4, 0.5 + h - 1, -d / 4, 0.8, 4.4, 0.8, 0, [0.5, 0.28, 0.22], 'planks', { top: 'white', topCol: DARK });
      // windows (frames proud of the wall, the dark glass in them) and the door
      const win = (lx, y, lz, rot) => { f.box(lx, y - 0.08, lz, 1.22, 1.56, 0.08, rot, [0.92, 0.92, 0.9]); f.box(lx, y, lz, 1.0, 1.4, 0.1, rot, GLASSD); };
      for (let k = 0; k < st; k++) {
        const y = 1.4 + k * sh;
        for (const sx of [-1, 1]) win(sx * w * 0.3, y, d / 2 + 0.02, 0);
        win(0, y, -d / 2 - 0.02, 0);
        for (const sx of [-1, 1]) win(sx * (w / 2 + 0.02), y, 0, Math.PI / 2);
        if (k === 0) f.box(0, 0.5, d / 2 + 0.03, 1.1, 2.15, 0.08, 0, [0.4, 0.26, 0.18], 'planks');
      }
      // the porch: boards, posts, its own roof, steps down
      f.box(0, 0, d / 2 + 1.25, w * 0.82, 0.55, 2.5, 0, WOOD, 'planks', { top: 'planks' });
      for (let k = 0; k < 4; k++) f.box(-w * 0.38 + (k * w * 0.76) / 3, 0.55, d / 2 + 2.35, 0.14, 2.3, 0.14, 0, [0.9, 0.9, 0.86]);
      f.lquad([-w * 0.43, 3.0, d / 2], [w * 0.43, 3.0, d / 2], [w * 0.43, 2.7, d / 2 + 2.7], [-w * 0.43, 2.7, d / 2 + 2.7], roof, 'shingle', w * 0.86, [0, 1, 1]);
      f.box(0, 0, d / 2 + 2.9, 1.6, 0.28, 0.6, 0, CONC);
      f.box(-w * 0.3, 0.55, d / 2 + 1.0, 0.6, 0.45, 0.5, 0.4, WOOD_D); // (a chair)
    },
    // the barn: plank walls under a gambrel roof, the big doors on the end (+z) braced in white, the
    // hayloft door over them, a cupola on the ridge, a lean-to down one side
    barn(f, it) {
      const w = 11, d = 16, h = 4.6, col = it.red ? [0.6, 0.2, 0.15] : [0.6, 0.58, 0.54], trim = [0.9, 0.88, 0.84], roof = it.red ? [0.34, 0.33, 0.33] : [0.42, 0.36, 0.3];
      f.box(0, 0, 0, w, h, d, 0, col, 'planks', { top: false });
      // the gambrel: steep below, shallow above; the ends filled in
      const e = w / 2 + 0.35, m = w * 0.3, ym = h + 2.7, yr = h + 4.2;
      for (const sx of [-1, 1]) {
        f.lquad([sx * e, h - 0.15, -d / 2 - 0.3], [sx * e, h - 0.15, d / 2 + 0.3], [sx * m, ym, d / 2 + 0.3], [sx * m, ym, -d / 2 - 0.3], roof, 'corr', d + 0.6, [sx, 0.4, 0]);
        f.lquad([sx * m, ym, -d / 2 - 0.3], [sx * m, ym, d / 2 + 0.3], [0, yr, d / 2 + 0.3], [0, yr, -d / 2 - 0.3], roof, 'corr', d + 0.6, [sx * 0.3, 1, 0]);
      }
      for (const sz of [-1, 1]) {
        const z = (sz * d) / 2;
        f.lquad([-w / 2, h, z], [w / 2, h, z], [m, ym, z], [-m, ym, z], col, 'planks', w, [0, 0, sz]);
        f.lquad([-m, ym, z], [m, ym, z], [0, yr, z], [0, yr, z], col, 'planks', w * 0.6, [0, 0, sz]);
      }
      // the doors, braced, and the loft door over them
      f.box(0, 0, d / 2 + 0.04, 4.6, 3.9, 0.1, 0, mul(col, 0.8), 'planks');
      for (const sx of [-1, 1]) {
        f.box(sx * 2.3, 0, d / 2 + 0.1, 0.18, 3.9, 0.06, 0, trim);
        f.box(sx * 1.15, 1.95, d / 2 + 0.1, 0.16, 4.3, 0.05, sx * 0.53, trim);
      }
      f.box(0, 3.82, d / 2 + 0.1, 4.8, 0.18, 0.06, 0, trim);
      f.box(0, 5.2, d / 2 + 0.05, 1.7, 1.6, 0.1, 0, mul(col, 0.7), 'planks');
      f.box(0, 5.1, d / 2 + 0.1, 1.9, 0.12, 0.06, 0, trim);
      f.box(0, 6.7, d / 2 + 0.1, 1.9, 0.12, 0.06, 0, trim);
      f.box(0, 7.1, d / 2 + 0.6, 0.15, 0.15, 1.2, 0, WOOD_D); // (the hay hook's beam)
      // the cupola, and its little roof
      f.box(0, yr - 0.3, 0, 1.4, 1.3, 1.4, 0, trim, 'planks', { top: false });
      f.cyl(0, yr + 1.0, 0, 1.1, 0, 0.9, 4, roof, 'corr');
      // the lean-to
      f.box(-w / 2 - 2, 0, -d * 0.15, 4, 3.1, d * 0.6, 0, mul(col, 0.9), 'planks', { top: false });
      f.lquad([-w / 2 - 4.3, 2.9, -d * 0.45 - 0.2], [-w / 2 - 4.3, 2.9, d * 0.15 + 0.2], [-w / 2, 3.9, d * 0.15 + 0.2], [-w / 2, 3.9, -d * 0.45 - 0.2], roof, 'corr', d * 0.6, [-0.5, 1, 0]);
    },
    // a silo: a tall corrugated drum under a dome, the ladder up it, the chute
    silo(f, it) {
      const r = it.r || 2.4, h = it.h || 13, col = it.s < 0.5 ? [0.76, 0.76, 0.76] : [0.7, 0.66, 0.58];
      f.cyl(0, 0, 0, r, r, h, 12, col, it.s < 0.5 ? 'corr' : 'white');
      f.cyl(0, h, 0, r, r * 0.7, 0.9, 12, mul(col, 0.95), 'corr');
      f.cyl(0, h + 0.9, 0, r * 0.7, 0.2, 0.8, 12, mul(col, 0.9), 'corr', { cap: 'flat' });
      for (const sx of [-0.25, 0.25]) f.box(sx, 0.4, r + 0.15, 0.06, h - 0.3, 0.06, 0, DARK);
      for (let y = 0.8; y < h; y += 0.5) f.box(0, y, r + 0.15, 0.5, 0.04, 0.05, 0, DARK);
      f.box(r * 0.7, 1.2, r * 0.7, 0.6, 2.6, 0.6, 0.78, mul(col, 0.8), 'corr');
      for (let y = 2; y < h; y += 2.6) f.cyl(0, y, 0, r + 0.04, r + 0.04, 0.12, 12, mul(col, 0.7));
    },
    // grain bins: low corrugated drums with conical roofs
    bin(f, it) {
      const r = it.r || 2.1, h = it.h || 4.2, col = [0.78, 0.79, 0.8];
      f.cyl(0, 0, 0, r, r, h, 14, col, 'corr', { cap: 1.5, capBand: 'corr', capCol: mul(col, 0.92) });
      f.cyl(0, h + 1.5, 0, 0.35, 0.35, 0.35, 6, mul(col, 0.8), 'white', { cap: 'flat' });
      f.box(0, 0, r + 0.03, 0.9, 1.6, 0.06, 0, mul(col, 0.7), 'corr');
    },
    // the machine shed: three corrugated walls, the roof, open at the front with the tractor inside
    shed(f, it) {
      const w = it.w || 10, d = it.d || 6, h = 3.6, col = [0.62, 0.6, 0.58];
      f.box(0, 0, -d / 2, w, h, 0.15, 0, col, 'corr');
      for (const sx of [-1, 1]) f.box((sx * w) / 2, 0, 0, 0.15, h, d, 0, col, 'corr');
      for (let k = 1; k < 3; k++) f.box(-w / 2 + (k * w) / 3, 0, d / 2 - 0.1, 0.18, h + 0.3, 0.18, 0, WOOD_D);
      f.lquad([-w / 2 - 0.3, h - 0.2, -d / 2 - 0.3], [w / 2 + 0.3, h - 0.2, -d / 2 - 0.3], [w / 2 + 0.3, h + 0.5, d / 2 + 0.5], [-w / 2 - 0.3, h + 0.5, d / 2 + 0.5], [0.5, 0.36, 0.28], 'corr', w + 0.6, [0, 1, 0.3]);
      f.box(0, 0, 0, w, 0.04, d, 0, mul(SOIL, 0.8), 'gravel');
      tractor(f, -w / 4, 0.4, 0.2 + it.s * 0.3, it.s);
      f.box(w / 4, 0, -d / 2 + 0.6, 1.4, 0.9, 0.8, 0, WOOD, 'planks'); // (a workbench)
      f.cyl(w / 3, 0, 0.5, 0.3, 0.3, 0.9, 8, RUST, 'corr', { cap: 'flat' });
    },
    // the windpump: a lattice tower, its head and tail (the wheel turns: see the kit's rotors), a tank
    // on a stand beside it and the trough it fills
    windpump(f, it) {
      const H = 9;
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const A = [sx * 1.3, 0, sz * 1.3], B2 = [sx * 0.3, H, sz * 0.3];
        f.lquad([A[0] - 0.05, 0, A[2]], [A[0] + 0.05, 0, A[2]], [B2[0] + 0.05, H, B2[2]], [B2[0] - 0.05, H, B2[2]], STEEL, 'white', 0.1, [sx, 0, sz]);
        f.lquad([A[0], 0, A[2] - 0.05], [A[0], 0, A[2] + 0.05], [B2[0], H, B2[2] + 0.05], [B2[0], H, B2[2] - 0.05], STEEL, 'white', 0.1, [sx, 0, sz]);
      }
      for (const y of [2.5, 5, 7.4]) { const e = 1.3 - (y / H) * 1.0; for (const [ax, az, bx, bz] of [[-e, -e, e, -e], [e, -e, e, e], [e, e, -e, e], [-e, e, -e, -e]]) f.lquad([ax, y, az], [bx, y, bz], [bx, y + 0.06, bz], [ax, y + 0.06, az], STEEL, 'white', 1, null); }
      f.box(0, H - 0.1, 0, 1.2, 0.12, 1.2, 0, WOOD_D, 'planks');
      f.box(0, H, 0.2, 0.4, 0.5, 0.9, 0, STEEL);
      f.box(0, H + 0.2, -1.3, 0.06, 0.06, 2.0, 0, STEEL);
      f.lquad([0, H - 0.2, -2.1], [0, H - 0.2, -3.1], [0, H + 1.0, -3.1], [0, H + 0.6, -2.1], [0.86, 0.84, 0.8], 'white', 1, [1, 0, 0]);
      f.box(0, 0, 0, 0.12, H, 0.12, 0, STEEL); // (the pump rod)
      // the tank on its stand, the trough
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) f.box(2.8 + sx * 0.9, 0, 2.6 + sz * 0.9, 0.14, 1.6, 0.14, 0, WOOD_D);
      f.cyl(2.8, 1.6, 2.6, 1.25, 1.25, 1.5, 12, [0.6, 0.62, 0.6], 'corr', { cap: 'flat', capCol: [0.5, 0.52, 0.5] });
      f.box(0.5, 0, 3.2, 2.6, 0.6, 0.8, 0, CONC, 'gravel', { top: false });
      f.box(0.5, 0.48, 3.2, 2.4, 0.04, 0.6, 0, [0.2, 0.28, 0.3]);
    },
    // a haystack: a round stack, thatched over
    haystack(f, it) {
      const r = 2 + it.s * 0.6;
      f.cyl(0, 0, 0, r * 0.9, r, 1.8, 10, [0.92, 0.84, 0.6], 'hay', { cap: 1.9 + it.s * 0.6, capBand: 'hay', capCol: [0.8, 0.72, 0.5] });
    },
    // round bales out on the stubble (and a stack of square ones)
    bale(f, it) {
      const k = 0.9 + it.s * 0.2;
      f.cylX(0, 0.72, 0, 0.75, 1.2, 9, 0, mul([0.94, 0.84, 0.58], k), 'hay', mul([0.86, 0.76, 0.5], k));
    },
    bales(f, it) {
      for (let k = 0; k < 6; k++) { const row = k < 3 ? 0 : k < 5 ? 1 : 2, i = k < 3 ? k : k < 5 ? k - 3 : 0; f.box(-1 + i * 1.02 + row * 0.5, row * 0.48, 0, 1.0, 0.46, 0.5, 0, [0.9, 0.8, 0.54], 'hay', { top: 'hay' }); }
    },
    // a hedge: leafy, uneven along its top, thicker in places
    hedge(f, it) {
      const along = it.w > it.d, L = along ? it.w : it.d, n = Math.max(1, Math.round(L / 3));
      for (let k = 0; k < n; k++) {
        const a = -L / 2 + (k * L) / n, b = -L / 2 + ((k + 1) * L) / n, h = 1.35 + hash(it.x + k, it.z) * 0.7, th = (along ? it.d : it.w) * (0.85 + hash(it.z + k, it.x) * 0.3);
        const col = mix([0.78, 0.92, 0.7], [0.66, 0.8, 0.58], hash(k, it.x * 3));
        if (along) f.box((a + b) / 2, 0, 0, b - a + 0.2, h, th, 0, col, 'hedge', { top: 'hedge', u0: k * 0.31 });
        else f.box(0, 0, (a + b) / 2, th, h, b - a + 0.2, 0, col, 'hedge', { top: 'hedge', u0: k * 0.31 });
      }
    },
    // a big tree: an oak in the hedge, the willow by the pond, the one on the green
    oak(f, it) {
      const s = it.size || 1;
      f.cyl(0, 0, 0, 0.42 * s, 0.3 * s, 3.4 * s, 7, BARK, 'planks');
      const col = mix([0.72, 0.86, 0.62], [0.6, 0.72, 0.5], it.s);
      f.ball(0, 5.4 * s, 0, 3.4 * s, 0.8, col, 'leaves');
      f.ball(1.9 * s, 4.6 * s, 0.8 * s, 2.4 * s, 0.8, mul(col, 0.95), 'leaves');
      f.ball(-1.6 * s, 4.9 * s, -1.0 * s, 2.5 * s, 0.8, mul(col, 1.05), 'leaves');
    },
    willow(f, it) {
      f.cyl(0, 0, 0, 0.4, 0.3, 2.6, 7, BARK, 'planks');
      f.cyl(0, 1.2, 0, 3.6, 1.2, 4.6, 9, [0.74, 0.88, 0.6], 'hedge', { cap: 'flat', capCol: [0.62, 0.74, 0.5] });
    },
    // a fruit tree in an orchard row: trunk, two crowns of leaves with the fruit in them
    fruit(f, it) {
      f.cyl(0, 0, 0, 0.16, 0.12, 1.6, 6, BARK, 'planks');
      const col = mix([0.86, 0.98, 0.78], [0.72, 0.84, 0.66], it.s);
      f.ball(0, 2.5, 0, 1.55, 0.85, col, 'leaves');
      f.ball(0.5, 3.1, -0.3, 1.05, 0.85, mul(col, 1.05), 'leaves');
    },
    // a glass greenhouse, and a polytunnel
    greenhouse(f, it) {
      const w = 6, d = it.d || 12, h = 2.3;
      f.box(0, 0, 0, w + 0.2, 0.35, d + 0.2, 0, CONC, 'white', { top: false });
      f.box(0, 0.35, 0, w, h, d, 0, [1, 1, 1], 'glass', { top: false });
      gableRoof(f, 0, 0, w, d, 0.35 + h, 1.6, 'z', [0.96, 0.98, 0.96], [1, 1, 1], 'glass', 'glass', 0.05);
      f.box(0, 0.35, d / 2 + 0.02, 1.0, 2.0, 0.06, 0, [0.85, 0.86, 0.84]);
    },
    tunnel(f, it) {
      const r = 2.7, L = it.d || 16, seg = 8, col = [0.96, 0.97, 0.94];
      for (let k = 0; k < seg; k++) {
        const a0 = (k / seg) * Math.PI, a1 = ((k + 1) / seg) * Math.PI;
        f.lquad([Math.cos(a0) * r, Math.sin(a0) * r, -L / 2], [Math.cos(a0) * r, Math.sin(a0) * r, L / 2], [Math.cos(a1) * r, Math.sin(a1) * r, L / 2], [Math.cos(a1) * r, Math.sin(a1) * r, -L / 2], col, 'plastic', L, [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0]);
      }
      for (const sz of [-1, 1]) for (let k = 0; k < seg; k++) {
        const a0 = (k / seg) * Math.PI, a1 = ((k + 1) / seg) * Math.PI;
        f.ltri([0, 0, (sz * L) / 2], [Math.cos(a0) * r, Math.sin(a0) * r, (sz * L) / 2], [Math.cos(a1) * r, Math.sin(a1) * r, (sz * L) / 2], mul(col, 0.92), 'plastic', [0, 0, sz]);
      }
      f.box(0, 0, L / 2 + 0.02, 1.1, 2.0, 0.06, 0, WOOD_D, 'planks');
    },
    // the chicken coop and its wire run
    coop(f, it) {
      f.box(0, 0.4, 0, 2.2, 1.3, 1.6, 0, [0.7, 0.62, 0.5], 'planks', { top: false });
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) f.box(sx * 1.0, 0, sz * 0.7, 0.12, 0.4, 0.12, 0, WOOD_D);
      f.lquad([-1.3, 1.95, -1.0], [1.3, 1.95, -1.0], [1.3, 1.6, 1.0], [-1.3, 1.6, 1.0], [0.4, 0.34, 0.3], 'corr', 2.6, [0, 1, 0.3]);
      f.lquad([0.3, 0.05, 2.0], [0.9, 0.05, 2.0], [0.9, 0.55, 0.8], [0.3, 0.55, 0.8], WOOD, 'planks', 0.6, [0, 1, 1]);
      const R = [[-2.5, 0.85, 2.5, 0.85], [2.5, 0.85, 2.5, 4.5], [2.5, 4.5, -2.5, 4.5], [-2.5, 4.5, -2.5, 0.85]];
      for (const [ax, az, bx, bz] of R) { f.card(ax, az, bx, bz, 0, 1.3, [0.9, 0.9, 0.9], 'chain'); f.box(ax, 0, az, 0.1, 1.35, 0.1, 0, WOOD_D); }
    },
    // a scarecrow: a post and its arms, an old coat, a sack for a head, a hat
    scarecrow(f, it) {
      const coat = [[0.5, 0.2, 0.16], [0.24, 0.3, 0.42], [0.4, 0.38, 0.28]][Math.floor(it.s * 3)];
      f.box(0, 0, 0, 0.1, 2.2, 0.1, 0, WOOD_D);
      f.box(0, 1.55, 0, 1.6, 0.08, 0.08, 0, WOOD_D);
      f.box(0, 0.95, 0, 0.55, 0.75, 0.28, 0, coat, 'canvas');
      for (const sx of [-1, 1]) f.box(sx * 0.5, 1.45, 0, 0.42, 0.18, 0.2, 0, coat, 'canvas');
      f.ball(0, 1.98, 0, 0.22, 1.1, [0.86, 0.78, 0.56], 'hay');
      f.cyl(0, 2.15, 0, 0.36, 0.36, 0.04, 8, [0.24, 0.2, 0.16], 'white', { cap: 'flat' });
      f.cyl(0, 2.19, 0, 0.18, 0.15, 0.2, 8, [0.24, 0.2, 0.16], 'white', { cap: 'flat' });
      for (const sx of [-1, 1]) f.card(sx * 0.72, -0.05, sx * 0.95, 0.05, 1.3, 1.6, [0.9, 0.82, 0.56], 'hay');
    },
    // a post-and-rail fence: posts, two rails, along local x for it.len
    fence(f, it) {
      const L = it.len, n = Math.max(1, Math.round(L / 2.5)), col = mix(OLDWOOD, WOOD, it.s);
      for (let k = 0; k <= n; k++) f.box(-L / 2 + (k * L) / n, 0, 0, 0.13, 1.25, 0.13, 0, mul(col, 0.92), 'planks');
      for (const y of [0.55, 1.0]) f.box(0, y, 0.08, L, 0.1, 0.05, 0, col, 'planks', { top: false });
    },
    // a wire fence: posts and strands
    wire(f, it) {
      const L = it.len, n = Math.max(1, Math.round(L / 3.2));
      for (let k = 0; k <= n; k++) f.box(-L / 2 + (k * L) / n, 0, 0, 0.09, 1.15, 0.09, 0, WOOD_D);
      for (const y of [0.45, 0.75, 1.05]) f.box(0, y, 0, L, 0.025, 0.025, 0, [0.42, 0.42, 0.4], 'white', { top: false });
    },
    // a field gate: five bars and a brace, on its posts (it.open: swung back)
    gate(f, it) {
      const col = [0.72, 0.7, 0.64];
      for (const sx of [-1, 1]) f.box(sx * 1.85, 0, 0, 0.18, 1.4, 0.18, 0, WOOD_D, 'planks');
      f.at(it.x + Math.cos(it.rot) * -1.75, it.z + Math.sin(it.rot) * 1.75, it.rot + (it.open ? -1.3 : 0));
      for (let k = 0; k < 5; k++) f.box(1.75, 0.25 + k * 0.24, 0, 3.4, 0.08, 0.05, 0, col, 'planks', { top: false });
      f.box(0.1, 0.2, 0, 0.1, 1.15, 0.06, 0, col);
      f.box(3.4, 0.2, 0, 0.1, 1.15, 0.06, 0, col);
      f.box(1.75, 0.7, 0.03, 3.6, 0.08, 0.04, 0.28, col);
    },
    // a stone well with its little roof and bucket
    well(f, it) {
      f.cyl(0, 0, 0, 0.85, 0.85, 0.8, 10, [0.6, 0.58, 0.54], 'gravel', { cap: 'flat', capCol: [0.12, 0.13, 0.13] });
      for (const sx of [-1, 1]) f.box(sx * 0.75, 0.8, 0, 0.12, 1.4, 0.12, 0, WOOD_D);
      f.box(0, 2.1, 0, 1.7, 0.1, 0.1, 0, WOOD_D);
      gableRoof(f, 0, 0, 1.9, 1.3, 2.2, 0.6, 'x', [0.38, 0.32, 0.28], WOOD_D, 'shingle', 'planks');
      f.cyl(0.2, 1.3, 0, 0.16, 0.18, 0.3, 6, [0.4, 0.4, 0.38]);
    },
    // a stone trough, and an old bathtub that does instead
    trough(f, it) {
      f.box(0, 0, 0, 2.4, 0.6, 0.75, 0, CONC, 'gravel', { top: false });
      f.box(0, 0.5, 0, 2.2, 0.05, 0.55, 0, [0.2, 0.27, 0.28]);
    },
    // hives: white boxes on stands, lids on
    hives(f, it) {
      const n = it.n || 5;
      for (let k = 0; k < n; k++) {
        const x = -((n - 1) * 1.3) / 2 + k * 1.3, col = [[0.92, 0.9, 0.84], [0.84, 0.86, 0.74], [0.9, 0.84, 0.66]][k % 3];
        f.box(x, 0, 0, 0.5, 0.35, 0.5, 0, WOOD_D);
        f.box(x, 0.35, 0, 0.55, 0.62, 0.48, 0, col, 'planks');
        f.box(x, 0.97, 0, 0.66, 0.09, 0.58, 0, mul(col, 0.8));
      }
    },
    // a farm cart: a plank bed on two wheels, its shafts down; a load on it sometimes
    cart(f, it) {
      const col = mix(WOOD, OLDWOOD, it.s);
      f.box(0, 0.75, 0, 1.4, 0.12, 2.4, 0, col, 'planks', { top: 'planks' });
      for (const sx of [-1, 1]) f.box(sx * 0.68, 0.87, 0, 0.06, 0.35, 2.4, 0, mul(col, 0.9), 'planks');
      f.box(0, 0.87, -1.18, 1.4, 0.35, 0.06, 0, mul(col, 0.9), 'planks');
      for (const sx of [-1, 1]) { f.cylX(sx * 0.8, 0.62, 0.2, 0.6, 0.09, 10, 0, WOOD_D); f.box(sx * 0.4, 0.1, 2.0, 0.08, 0.08, 2.2, -0.3 * 0, WOOD_D); }
      f.box(0, 0, 2.9, 0.12, 0.6, 0.12, 0, WOOD_D);
      if (it.load === 'hay') f.box(0, 0.93, 0, 1.3, 0.8, 2.2, 0, [0.9, 0.82, 0.56], 'hay', { top: 'hay' });
      else if (it.load) for (let k = 0; k < 4; k++) crate(f, (k % 2 ? 0.33 : -0.33), 0.93, (k < 2 ? 0.5 : -0.5), it.load);
    },
    // an old tractor (out on the farm, or left in a field)
    tractor(f, it) { tractor(f, 0, 0, 0, it.s); },
    wheelbarrow(f, it) {
      f.lquad([-0.35, 0.45, -0.3], [0.35, 0.45, -0.3], [0.3, 0.75, 0.55], [-0.3, 0.75, 0.55], [0.4, 0.46, 0.42], 'white', 0.7, [0, 1, 0]);
      f.box(0, 0.3, 0.15, 0.6, 0.45, 0.7, 0, [0.42, 0.48, 0.44], 'corr');
      f.cylX(0, 0.2, -0.45, 0.2, 0.08, 8, 0, DARK);
      for (const sx of [-1, 1]) f.box(sx * 0.22, 0.45, 0.85, 0.05, 0.05, 0.8, 0, WOOD_D);
    },
    // crates of produce, stacked by the barn or the road, ready to go in to the city
    crates(f, it) {
      const fruit = ['apple', 'cabbage', 'carrot', 'pear'][Math.floor(it.s * 4)];
      for (let k = 0; k < (it.n || 4); k++) crate(f, (k % 2) * 0.66 - 0.33, Math.floor(k / 4) * 0.42, (Math.floor(k / 2) % 2) * 0.5 - 0.25, fruit);
    },
    churns(f, it) {
      for (let k = 0; k < 3; k++) f.cyl(k * 0.45 - 0.45, 0, (k % 2) * 0.2, 0.18, 0.15, 0.62, 8, [0.72, 0.74, 0.76], 'white', { cap: 0.08 });
    },
    // a washing line between two posts, the washing on it
    washing(f, it) {
      for (const sx of [-1, 1]) f.box(sx * 3, 0, 0, 0.1, 2.0, 0.1, 0, WOOD_D);
      f.box(0, 1.92, 0, 6, 0.02, 0.02, 0, [0.6, 0.6, 0.58], 'white', { top: false });
      const cols = [[0.86, 0.84, 0.78], [0.7, 0.26, 0.2], [0.86, 0.66, 0.24], [0.5, 0.56, 0.62], [0.9, 0.9, 0.88]];
      for (let k = 0; k < 5; k++) { const x = -2.4 + k * 1.15; f.card(x - 0.35, 0, x + 0.35, 0, 1.92 - 0.55 - (k % 2) * 0.25, 1.92, cols[(k + Math.floor(it.s * 5)) % 5], 'canvas'); }
    },
    // a kitchen garden: a few short rows by the house
    veg(f, it) {
      const w = it.w || 6, d = it.d || 4;
      f.box(0, 0, 0, w, 0.12, d, 0, SOIL, 'gravel', { top: 'gravel', topCol: SOIL });
      for (let k = 0; k < Math.floor(d / 0.7); k++) { const z = -d / 2 + 0.4 + k * 0.7; f.card(-w / 2 + 0.3, z, w / 2 - 0.3, z, 0.12, 0.45, [0.92, 1, 0.9], k % 3 === 2 ? 'cabbage' : 'greens', k * 0.3); }
    },
    woodpile(f, it) {
      f.box(0, 0, 0, 2.2, 1.0, 0.7, 0, [0.5, 0.38, 0.26], 'planks', { top: 'planks' });
      f.box(0, 1.0, 0, 2.4, 0.06, 0.9, 0, [0.4, 0.34, 0.3], 'corr');
    },
    mailbox(f, it) {
      f.box(0, 0, 0, 0.1, 1.0, 0.1, 0, WOOD_D);
      f.box(0, 1.0, 0.05, 0.28, 0.24, 0.48, 0, [0.5, 0.52, 0.5]);
    },
    // a pond: still water (the kit's water), a muddy rim, reeds along part of it
    pond(f, it) {
      const r = it.r || 5, n = 14;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, rr = (a) => r * (0.85 + 0.15 * Math.sin(a * 3 + it.s * 6));
        const P = (a, rad, y) => [Math.cos(a) * rad, y, Math.sin(a) * rad];
        f.lquad(P(a0, rr(a0) + 1.1, 0.142), P(a1, rr(a1) + 1.1, 0.142), P(a1, rr(a1), 0.143), P(a0, rr(a0), 0.143), [0.36, 0.3, 0.22], 'gravel', 2, [0, 1, 0]);
        f.ltri([0, 0.146, 0], P(a0, rr(a0), 0.146), P(a1, rr(a1), 0.146), [0.2, 0.27, 0.27], 'white', [0, 1, 0]);
        if (k % 3 !== 0) { const a = (a0 + a1) / 2, rad = rr(a) + 0.2; f.card(Math.cos(a - 0.12) * rad, Math.sin(a - 0.12) * rad, Math.cos(a + 0.12) * rad, Math.sin(a + 0.12) * rad, 0.1, 1.4 + hash(k, it.x) * 0.6, [0.9, 0.95, 0.85], 'reeds', k * 0.3); }
      }
    },
    // the bit of a field that's ditch: water down the middle, its banks
    ditch(f, it) {
      const L = it.len;
      f.box(0, 0.125, 0, L, 0.04, 1.0, 0, [0.4, 0.33, 0.24], 'gravel', { top: 'gravel', topCol: [0.4, 0.33, 0.24] });
      f.box(0, 0.125, 0, L, 0.05, 0.45, 0, [0.22, 0.28, 0.27], 'white', { top: 'white' });
      for (let k = 0; k < L / 3; k++) f.card(-L / 2 + k * 3 + 0.4, 0.42, -L / 2 + k * 3 + 1.6, 0.48, 0.12, 0.7, [0.9, 0.95, 0.8], 'reeds', k * 0.2);
    },

    /* ---- the city's edge ---- */
    // a warehouse: corrugated walls, a low roof, roller doors and a dock along the front (+z), an office
    warehouse(f, it) {
      const w = it.w, d = it.d, h = 6 + it.s * 2.5, col = [[0.62, 0.64, 0.66], [0.5, 0.56, 0.6], [0.6, 0.5, 0.42], [0.66, 0.62, 0.54]][Math.floor(it.s * 4)];
      f.box(0, 0, 0, w, h, d, 0, col, 'corr', { top: false });
      gableRoof(f, 0, 0, w, d, h, 1.4, 'x', mul(col, 0.7), col, 'corr', 'corr', 0.3);
      const n = Math.max(1, Math.floor(w / 7));
      for (let k = 0; k < n; k++) {
        const x = -w / 2 + (k + 0.5) * (w / n);
        f.box(x, 1.2, d / 2 + 0.04, 3.4, 3.6, 0.1, 0, mul(col, 0.62), 'corr');
        f.box(x, 4.8, d / 2 + 0.06, 3.8, 0.2, 0.12, 0, DARK);
      }
      f.box(0, 0, d / 2 + 1.0, w * 0.9, 1.2, 2.0, 0, CONC, 'gravel', { top: 'gravel', topCol: CONC });
      for (let k = 0; k < n; k++) f.box(-w / 2 + (k + 0.5) * (w / n), 0.5, d / 2 + 2.05, 0.4, 0.5, 0.15, 0, DARK);
      f.box(w / 2 + 2.2, 0, d / 2 - 3, 4.4, 3.2, 6, 0, [0.7, 0.68, 0.6], 'siding');
      for (let k = 0; k < 2; k++) f.box(w / 2 + 1.0 + k * 2.2, 1.3, d / 2 + 0.02, 1.4, 1.1, 0.1, 0, GLASSD);
    },
    // a shipping container (or two stacked)
    container(f, it) {
      const cols = [[0.56, 0.24, 0.18], [0.24, 0.36, 0.5], [0.3, 0.42, 0.3], [0.6, 0.56, 0.5], [0.66, 0.46, 0.2]];
      for (let k = 0; k < (it.stack || 1); k++) {
        const col = cols[Math.floor(hash(it.x + k, it.z) * cols.length)];
        f.box(k * 0.3, k * 2.6, 0, 6.1, 2.6, 2.44, k * 0.05, col, 'corr', { top: 'corr' });
        f.box(3.06 + k * 0.3, k * 2.6 + 0.1, 0, 0.06, 2.4, 2.3, k * 0.05, mul(col, 0.8), 'planks');
      }
    },
    // the rail yard: the tracks (rails on sleepers on ballast), it.len long along local x
    track(f, it) {
      const L = it.len;
      f.box(0, 0, 0, L, 0.2, 3.6, 0, [0.55, 0.52, 0.48], 'gravel', { top: 'gravel', topCol: [0.5, 0.48, 0.44] });
      for (let x = -L / 2 + 0.4; x < L / 2; x += 0.75) f.box(x, 0.2, 0, 0.24, 0.12, 2.5, 0, [0.3, 0.24, 0.18], 'planks');
      for (const sz of [-0.72, 0.72]) f.box(0, 0.32, sz, L, 0.16, 0.08, 0, [0.42, 0.36, 0.3], 'white', { topCol: [0.7, 0.7, 0.72] });
    },
    boxcar(f, it) {
      const L = 13, col = [[0.48, 0.26, 0.18], [0.36, 0.3, 0.26], [0.5, 0.42, 0.3]][Math.floor(it.s * 3)];
      for (const sx of [-1, 1]) { f.box(sx * 4.4, 0.45, 0, 2.2, 0.5, 2.0, 0, DARK); for (const wx of [-0.7, 0.7]) for (const sz of [-0.72, 0.72]) f.cylX(sx * 4.4 + wx, 0.86 + 0 - 0.4, sz, 0.42, 0.12, 8, Math.PI / 2 * 0, DARK); }
      f.box(0, 1.05, 0, L, 0.25, 2.9, 0, DARK);
      f.box(0, 1.3, 0, L, 2.9, 2.9, 0, col, it.s < 0.5 ? 'planks' : 'corr', { top: false });
      f.lquad([-L / 2 - 0.1, 4.2, -1.55], [L / 2 + 0.1, 4.2, -1.55], [L / 2 + 0.1, 4.45, 0], [-L / 2 - 0.1, 4.45, 0], mul(col, 0.8), 'corr', L, [0, 1, -0.5]);
      f.lquad([-L / 2 - 0.1, 4.45, 0], [L / 2 + 0.1, 4.45, 0], [L / 2 + 0.1, 4.2, 1.55], [-L / 2 - 0.1, 4.2, 1.55], mul(col, 0.8), 'corr', L, [0, 1, 0.5]);
      for (const sz of [-1, 1]) { f.box(0, 1.5, sz * 1.47, 3.2, 2.5, 0.08, 0, mul(col, 0.8), 'planks'); f.box(0, 4.0, sz * 1.5, 3.6, 0.1, 0.1, 0, DARK); }
      for (const sx of [-1, 1]) f.box(sx * (L / 2 + 0.3), 0.9, 0, 0.6, 0.25, 0.3, 0, DARK);
    },
    bufferstop(f, it) {
      f.box(0, 0, 0, 0.6, 1.2, 2.4, 0, [0.2, 0.2, 0.2]);
      f.box(0.32, 0.8, 0, 0.12, 0.35, 2.0, 0, [0.7, 0.6, 0.2]);
    },
    // a signal cabin: a box of windows up a flight of stairs
    cabin(f, it) {
      f.box(0, 0, 0, 3.4, 2.6, 3.0, 0, [0.6, 0.48, 0.36], 'planks', { top: false });
      f.box(0, 2.6, 0, 3.6, 1.6, 3.2, 0, [0.7, 0.66, 0.56], 'siding', { top: false });
      for (const sz of [-1, 1]) f.box(0, 3.0, sz * 1.62, 3.0, 0.9, 0.06, 0, GLASSD);
      gableRoof(f, 0, 0, 3.6, 3.2, 4.2, 1.0, 'x', [0.32, 0.3, 0.3], [0.7, 0.66, 0.56], 'shingle', 'siding');
      f.lquad([2.0, 0, -1.2], [2.6, 0, -1.2], [2.6, 2.6, 1.2], [2.0, 2.6, 1.2], WOOD_D, 'planks', 0.6, [1, 1, 0]);
    },
    // a gas station: the canopy on its pillars over two islands of pumps, the kiosk, the price sign
    gas(f, it) {
      const w = 13, d = 8;
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) f.box(sx * (w / 2 - 1.2), 0, sz * (d / 2 - 1), 0.4, 4.6, 0.4, 0, [0.8, 0.8, 0.78]);
      f.box(0, 4.6, 0, w, 0.25, d, 0, [0.86, 0.86, 0.84], 'white', { bottom: true });
      f.box(0, 4.85, 0, w + 0.1, 0.55, d + 0.1, 0, [0.62, 0.16, 0.12], 'white');
      for (const sx of [-1, 1]) {
        f.box(sx * 2.4, 0, 0, 1.0, 0.18, 5.6, 0, CONC, 'gravel', { top: 'gravel', topCol: CONC });
        for (const sz of [-1.4, 1.4]) { f.box(sx * 2.4, 0.18, sz, 0.55, 1.5, 0.4, 0, [0.82, 0.8, 0.76]); f.box(sx * 2.4, 1.2, sz, 0.58, 0.32, 0.42, 0, [0.62, 0.16, 0.12]); f.box(sx * 2.4 + 0.3, 1.0, sz, 0.05, 0.25, 0.25, 0, GLASSD); }
      }
      f.box(0, 0, -d / 2 - 4.5, 8, 3.2, 5, 0, [0.82, 0.8, 0.72], 'siding', { top: false });
      f.box(0, 3.2, -d / 2 - 4.5, 8.4, 0.4, 5.4, 0, [0.62, 0.16, 0.12]);
      f.box(-1.2, 0.6, -d / 2 - 1.98, 4.4, 1.9, 0.08, 0, GLASSD);
      f.box(2.0, 0, -d / 2 - 1.98, 1.0, 2.2, 0.08, 0, [0.5, 0.5, 0.48]);
      f.box(w / 2 + 2.2, 0, 0, 0.3, 7.5, 0.3, 0, STEEL);
      f.box(w / 2 + 2.2, 5.6, 0, 0.3, 2.4, 2.8, 0, [0.86, 0.84, 0.8]);
      f.box(w / 2 + 2.36, 6.9, 0, 0.04, 0.8, 2.4, 0, [0.62, 0.16, 0.12]);
      for (let k = 0; k < 3; k++) f.box(w / 2 + 2.36, 5.8 + k * 0.32, 0, 0.04, 0.2, 1.6, 0, DARK);
    },
    // the market: stalls under red and yellow awnings, produce on the counters
    stall(f, it) {
      const w = it.w || 3;
      f.box(0, 0, 0, w, 0.9, 1.0, 0, WOOD, 'planks', { top: 'planks' });
      for (const sx of [-1, 1]) for (const sz of [-0.45, 0.45]) f.box((sx * (w - 0.1)) / 2, 0, sz, 0.08, sz < 0 ? 2.5 : 2.2, 0.08, 0, WOOD_D);
      f.lquad([-w / 2 - 0.1, 2.5, -0.65], [w / 2 + 0.1, 2.5, -0.65], [w / 2 + 0.1, 2.1, 1.15], [-w / 2 - 0.1, 2.1, 1.15], [1, 1, 1], 'stripes', w + 0.2, [0, 1, 1]);
      for (let k = 0; k < Math.floor(w / 0.7); k++) crate(f, -w / 2 + 0.4 + k * 0.7, 0.9, 0, ['apple', 'cabbage', 'carrot', 'pear', 'bread'][(k + Math.floor(it.s * 5)) % 5], 0.8);
    },
    // a tent: canvas over a ridge pole, a tarp sheet sometimes
    tent(f, it) {
      const col = [[0.62, 0.58, 0.46], [0.4, 0.46, 0.5], [0.5, 0.52, 0.36], [0.6, 0.4, 0.3]][Math.floor(it.s * 4)];
      const w = 2.4, d = 3, h = 1.6;
      for (const sx of [-1, 1]) f.lquad([sx * w / 2, 0.05, -d / 2], [sx * w / 2, 0.05, d / 2], [0, h, d / 2], [0, h, -d / 2], col, 'canvas', d, [sx, 0.7, 0]);
      f.ltri([-w / 2, 0.05, -d / 2], [w / 2, 0.05, -d / 2], [0, h, -d / 2], mul(col, 0.9), 'canvas', [0, 0, -1]);
      f.ltri([-w / 2, 0.05, d / 2], [-0.2, 0.05, d / 2], [0, h, d / 2], mul(col, 0.9), 'canvas', [0, 0, 1]);
      f.ltri([0.2, 0.05, d / 2], [w / 2, 0.05, d / 2], [0, h, d / 2], mul(col, 0.9), 'canvas', [0, 0, 1]);
    },
    // a shack of scrap: corrugated sheets for walls and a roof weighed down with tyres
    shack(f, it) {
      const w = 3.2, d = 2.6, col = mix([0.56, 0.44, 0.36], [0.5, 0.52, 0.54], it.s);
      f.box(0, 0, -d / 2, w, 2.1, 0.08, 0.02, col, 'corr');
      for (const sx of [-1, 1]) f.box((sx * w) / 2, 0, 0, 0.08, 2.0, d, sx * 0.03, mul(col, 0.92), 'corr');
      f.box(-w / 4, 0, d / 2, w / 2, 1.9, 0.08, 0, mul(col, 0.85), 'planks');
      f.lquad([-w / 2 - 0.3, 2.2, -d / 2 - 0.3], [w / 2 + 0.3, 2.2, -d / 2 - 0.3], [w / 2 + 0.3, 1.9, d / 2 + 0.6], [-w / 2 - 0.3, 1.9, d / 2 + 0.6], mul([0.5, 0.36, 0.28], 0.9), 'corr', w, [0, 1, 0.3]);
      f.cylX(-0.6, 2.25, 0, 0.32, 0.22, 8, 0.3, DARK);
      f.lquad([w / 2, 1.9, d / 2 + 0.6], [w / 2 + 2.4, 0.2, d / 2 + 1.6], [w / 2 + 2.4, 0.2, d / 2 - 1.4], [w / 2, 1.9, -d / 2], [0.3, 0.4, 0.56], 'canvas', 3, [1, 1, 0]);
    },
    // a fire barrel (it glows after dark: see the kit's fires)
    firebarrel(f, it) {
      f.cyl(0, 0, 0, 0.32, 0.3, 0.9, 9, [0.42, 0.26, 0.18], 'corr', { cap: 'flat', capCol: [0.25, 0.14, 0.08] });
      for (let k = 0; k < 3; k++) f.box(Math.cos(k * 2.1) * 0.12, 0.85, Math.sin(k * 2.1) * 0.12, 0.08, 0.2, 0.3, k, [0.2, 0.15, 0.1]);
    },
    mattress(f, it) { f.box(0, 0, 0, 1.0, 0.18, 1.9, 0, [0.7, 0.66, 0.58], 'canvas', { top: 'canvas' }); },
    trolley(f, it) {
      f.box(0, 0.5, 0, 0.55, 0.45, 0.85, 0, [0.6, 0.62, 0.62], 'chain', { top: false });
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) f.box(sx * 0.22, 0, sz * 0.35, 0.04, 0.5, 0.04, 0, STEEL);
      f.box(0, 1.0, -0.45, 0.55, 0.04, 0.04, 0, STEEL);
    },
    // rubble: a low heap of broken concrete and brick
    rubble(f, it) {
      const w = it.w || 3, d = it.d || 2.5;
      for (let k = 0; k < 5; k++) { const a = hash(it.x + k, it.z) * 6.28, r = hash(it.z + k, it.x) * 0.35; f.box(Math.cos(a) * w * r, 0, Math.sin(a) * d * r, w * (0.35 + hash(k, it.x) * 0.3), 0.3 + hash(k, it.z) * 0.7 * (1 - r), d * (0.35 + hash(it.x, k) * 0.3), a, k % 2 ? [0.5, 0.48, 0.44] : [0.5, 0.36, 0.3], 'gravel', { top: 'gravel' }); }
    },
    tyres(f, it) { for (let k = 0; k < 3; k++) f.cyl(0, k * 0.22, 0, 0.42, 0.42, 0.22, 10, DARK, 'white', { cap: 'flat', capCol: [0.06, 0.06, 0.06] }); },
    bush(f, it) { f.ball(0, 0.6, 0, 1.1 + it.s * 0.6, 0.7, mix([0.62, 0.74, 0.52], [0.74, 0.8, 0.56], it.s), 'leaves'); },
    // a billboard on its legs, facing +z: one of the old adverts
    billboard(f, it) {
      const w = 8, h = 2, y = 4.2;
      for (const sx of [-2.4, 2.4]) f.box(sx, 0, -0.3, 0.3, y + h, 0.3, 0, WOOD_D, 'planks');
      f.box(0, y - 0.35, 0.25, w, 0.08, 0.6, 0, [0.3, 0.3, 0.3]);
      f.box(0, y - 0.15, -0.1, w + 0.3, h + 0.3, 0.2, 0, [0.3, 0.3, 0.3], 'planks');
      f.lquad([-w / 2, y, 0.02], [w / 2, y, 0.02], [w / 2, y + h, 0.02], [-w / 2, y + h, 0.02], [0.92, 0.92, 0.9], 'ad' + (it.ad || 0), 8, [0, 0, 1]);
      for (const sx of [-2.6, 2.6]) { f.box(sx, y + h + 0.1, 0.4, 0.08, 0.08, 0.8, 0, STEEL); f.box(sx, y + h - 0.05, 0.85, 0.3, 0.15, 0.25, 0, DARK); }
    },
    // a utility pole: a crossarm, the insulators
    pole(f, it) {
      f.cyl(0, 0, 0, 0.15, 0.12, 9.2, 6, [0.36, 0.28, 0.2], 'planks');
      f.box(0, 8.4, 0, 2.2, 0.14, 0.14, 0, [0.36, 0.28, 0.2]);
      for (const sx of [-0.9, 0, 0.9]) f.cyl(sx, 8.54, 0, 0.06, 0.05, 0.16, 5, [0.6, 0.62, 0.58]);
    },
    // the wires between two poles: three, sagging (it.to: the next pole)
    wires(f, it) {
      const [bx, bz] = it.to, ax = it.x, az = it.z, L = Math.hypot(bx - ax, bz - az), hx = (bx - ax) / L, hz = (bz - az) / L;
      for (const sx of [-0.9, 0, 0.9]) {
        const ox = -hz * sx, oz = hx * sx, pts = [];
        for (let k = 0; k <= 4; k++) { const t = k / 4; pts.push([ax + (bx - ax) * t + ox, 8.68 - Math.sin(t * Math.PI) * 0.55, az + (bz - az) * t + oz]); }
        for (let k = 0; k < 4; k++) { const A = pts[k], B2 = pts[k + 1]; f.quad([A[0], A[1], A[2]], [B2[0], B2[1], B2[2]], [B2[0], B2[1] + 0.035, B2[2]], [A[0], A[1] + 0.035, A[2]], f.uv('white', 0, 1), [0.12, 0.12, 0.12], null); }
      }
    },
    // a low chain-link fence, it.len along local x, a top rail
    chainfence(f, it) {
      const L = it.len, n = Math.max(1, Math.round(L / 3));
      for (let k = 0; k <= n; k++) f.cyl(-L / 2 + (k * L) / n, 0, 0, 0.05, 0.05, 2.1, 5, STEEL);
      f.card(-L / 2, 0, L / 2, 0, 0.05, 2.0, [0.95, 0.95, 0.95], 'chain');
      f.box(0, 2.0, 0, L, 0.05, 0.05, 0, STEEL, 'white', { top: false });
    },
    // allotment plots: beds edged in boards, soil, the crops in rows, a shed and a water butt
    plot(f, it) {
      const w = it.w, d = it.d, crops = ['greens', 'cabbage', 'beans', 'greens'];
      f.box(0, 0, 0, w, 0.22, d, 0, mul(WOOD, 0.9), 'planks', { top: 'gravel', topCol: SOIL });
      const crop = crops[Math.floor(it.s * 4)], tall = crop === 'beans' ? 1.6 : crop === 'cabbage' ? 0.4 : 0.35;
      for (let k = 0; k < Math.floor(w / 0.8); k++) { const x = -w / 2 + 0.45 + k * 0.8; f.card(x, -d / 2 + 0.3, x, d / 2 - 0.3, 0.22, 0.22 + tall, [0.92, 1, 0.9], crop, k * 0.17); if (crop === 'beans') f.box(x, 0.2, 0, 0.04, 1.7, d - 0.6, 0, WOOD_D, 'white', { top: false }); }
    },
    gardenshed(f, it) {
      f.box(0, 0, 0, 2.0, 2.0, 1.6, 0, mix([0.42, 0.5, 0.4], [0.6, 0.48, 0.36], it.s), 'planks', { top: false });
      f.lquad([-1.15, 2.25, -0.95], [1.15, 2.25, -0.95], [1.15, 1.95, 0.95], [-1.15, 1.95, 0.95], [0.3, 0.3, 0.28], 'corr', 2.3, [0, 1, 0.3]);
      f.box(0.3, 0, 0.81, 0.8, 1.7, 0.05, 0, mul(WOOD_D, 0.9), 'planks');
      f.cyl(-1.4, 0, 0.4, 0.35, 0.35, 0.9, 8, [0.24, 0.34, 0.26], 'white', { cap: 'flat' });
    },
    // a bench (the shore, the gardens)
    bench(f, it) {
      f.box(0, 0.42, 0.1, 1.8, 0.06, 0.42, 0, WOOD, 'planks');
      f.box(0, 0.62, -0.12, 1.8, 0.32, 0.05, 0, WOOD, 'planks');
      for (const sx of [-0.75, 0.75]) f.box(sx, 0, 0.05, 0.06, 0.45, 0.4, 0, DARK);
    },
    // the marsh's edge: a rotten jetty out over the water, a boat on its side in the reeds
    jetty(f, it) {
      const L = it.len;
      for (let x = 0.3; x < L; x += 0.6) if (hash(x, it.z) > 0.12) f.box(x, -0.05 + 0.45, 0, 0.5, 0.06, 1.8 - hash(it.z, x) * 0.4, (hash(x, it.x) - 0.5) * 0.1, mul(OLDWOOD, 0.7), 'planks');
      for (let x = 0; x < L; x += 2.4) for (const sz of [-0.85, 0.85]) f.box(x, -0.3, sz, 0.18, 1.0 + hash(x, sz) * 0.4, 0.18, 0, mul(BARK, 0.9));
    },
    boat(f, it) {
      const col = [[0.4, 0.46, 0.5], [0.6, 0.56, 0.48], [0.5, 0.3, 0.24]][Math.floor(it.s * 3)];
      f.lquad([-2.0, -0.1, -0.7], [2.0, -0.1, -0.7], [2.3, 0.55, -0.95], [-2.0, 0.55, -0.95], col, 'planks', 4, [0, 0.3, -1]);
      f.lquad([-2.0, -0.1, 0.7], [2.0, -0.1, 0.7], [2.3, 0.55, 0.95], [-2.0, 0.55, 0.95], col, 'planks', 4, [0, 0.3, 1]);
      f.lquad([2.0, -0.1, -0.7], [2.0, -0.1, 0.7], [2.3, 0.55, 0.95], [2.3, 0.55, -0.95], mul(col, 0.9), 'planks', 1.4, [1, 0.2, 0]);
      f.lquad([-2.0, -0.1, -0.7], [-2.0, -0.1, 0.7], [-2.0, 0.55, 0.95], [-2.0, 0.55, -0.95], mul(col, 0.9), 'planks', 1.4, [-1, 0, 0]);
      f.box(0, 0.15, 0, 0.3, 0.06, 1.6, 0, WOOD);
    },
    reeds(f, it) {
      const n = it.n || 4;
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI + it.s, r = 0.9 + hash(k, it.x) * 0.6; f.card(-Math.cos(a) * r, -Math.sin(a) * r, Math.cos(a) * r, Math.sin(a) * r, -0.1, 1.5 + hash(it.z, k) * 0.7, [0.9, 0.95, 0.85], 'reeds', k * 0.37); }
    },
    // a parked (or long-dead) vehicle
    vehicle(f, it) {
      const m = DV.Vehicles.model(it.kind || 'pickup', { seed: Math.floor(it.s * 997), wreck: !!it.wreck, color: it.color });
      f.merge(m.geo, 0, 0, 0, 1);
    },
    // the crop standing in a field: cards along the rows the ground's texture shows, a few across
    // (it.r: the part of the field this chunk has)
    crop(f, it) {
      const fl = it.field, [x0, z0, x1, z1] = it.r, along = fl.r[2] - fl.r[0] >= fl.r[3] - fl.r[1], c = fl.crop, col = mul(CROPC[c] || [1, 1, 1], 0.92 + fl.k * 0.12);
      const spec = { wheat: ['wheat', 0.95, 0.75, 3], corn: ['corn', 2.1, 1.5, 4.5], beans: ['beans', 1.7, 1.5, 0], cabbage: ['cabbage', 0.42, 0.75, 0], green: ['greens', 0.34, 0.75, 0], stubble: ['wheat', 0.22, 0.75, 0] }[c];
      if (!spec) return;
      const [band, h, step, cross] = spec, y = 0.13;
      f.at(0, 0, 0);
      // (the rows sit on the texture's ridges: every 0.75 m across the field, from the world's origin)
      const a0 = along ? z0 : x0, a1 = along ? z1 : x1, s0 = along ? x0 : z0, s1 = along ? x1 : z1, m = 0.75 * 0.62;
      for (let t = Math.ceil((a0 - m) / step) * step + m; t < a1 - 0.2; t += step) {
        if (t < a0 + 0.2) continue;
        const hh = h * (0.9 + hash(t, s0) * 0.2);
        if (along) f.card(s0 + 0.2, t, s1 - 0.2, t, y, y + hh, col, band, t * 0.37);
        else f.card(t, s0 + 0.2, t, s1 - 0.2, y, y + hh, col, band, t * 0.37);
        // beans: up their poles
        if (c === 'beans') for (let s = s0 + 0.6; s < s1 - 0.4; s += 2.2) { const p = along ? [s, t] : [t, s]; f.box(p[0], y, p[1], 0.05, h + 0.4, 0.05, 0.3, WOOD_D, 'white', { top: false }); }
      }
      if (cross) for (let s = Math.ceil(s0 / cross) * cross + 1.3; s < s1 - 0.5; s += cross) {
        if (along) f.card(s, a0 + 0.3, s, a1 - 0.3, y, y + h * 0.92, mul(col, 0.95), band, s * 0.21);
        else f.card(a0 + 0.3, s, a1 - 0.3, s, y, y + h * 0.92, mul(col, 0.95), band, s * 0.21);
      }
    },
  };
  // a gabled roof over a w × d box topping out at y, the ridge along 'x' or 'z' (local), overhanging
  function gableRoof(f, lx, lz, w, d, y, rh, ridge, roofCol, wallCol, roofBand, wallBand, ov) {
    ov = ov === undefined ? 0.4 : ov;
    if (ridge === 'x') {
      const hw = w / 2 + ov, hd = d / 2 + ov;
      for (const sz of [-1, 1]) f.lquad([lx - hw, y - 0.1, lz + sz * hd], [lx + hw, y - 0.1, lz + sz * hd], [lx + hw, y + rh, lz], [lx - hw, y + rh, lz], roofCol, roofBand, w + ov * 2, [0, 1, sz]);
      for (const sx of [-1, 1]) f.ltri([lx + (sx * w) / 2, y, lz - d / 2], [lx + (sx * w) / 2, y, lz + d / 2], [lx + (sx * w) / 2, y + rh * 0.95, lz], wallCol, wallBand, [sx, 0, 0]);
    } else {
      const hw = w / 2 + ov, hd = d / 2 + ov;
      for (const sx of [-1, 1]) f.lquad([lx + sx * hw, y - 0.1, lz - hd], [lx + sx * hw, y - 0.1, lz + hd], [lx, y + rh, lz + hd], [lx, y + rh, lz - hd], roofCol, roofBand, d + ov * 2, [sx, 1, 0]);
      for (const sz of [-1, 1]) f.ltri([lx - w / 2, y, lz + (sz * d) / 2], [lx + w / 2, y, lz + (sz * d) / 2], [lx, y + rh * 0.95, lz + (sz * d) / 2], wallCol, wallBand, [0, 0, sz]);
    }
  }
  // an old tractor, its big wheels behind, faded paint
  function tractor(f, lx, lz, r, s) {
    const col = [[0.6, 0.22, 0.16], [0.3, 0.42, 0.26], [0.5, 0.46, 0.4], [0.24, 0.32, 0.44]][Math.floor(s * 4)], c = Math.cos(r), sn = Math.sin(r);
    const P = (ax, az) => [lx + ax * c + az * sn, lz - ax * sn + az * c];
    let p = P(0, 0.9);
    f.box(p[0], 0.75, p[1], 0.85, 0.85, 1.9, r, col, 'white', { topCol: mul(col, 1.05) });
    p = P(0, -0.4);
    f.box(p[0], 0.55, p[1], 0.7, 0.75, 0.9, r, mul(col, 0.7));
    for (const sx of [-1, 1]) {
      p = P(sx * 0.82, -0.55); f.cylX(p[0], 0.78, p[1], 0.78, 0.42, 12, r, DARK, 'white', [0.36, 0.34, 0.3]);
      p = P(sx * 0.62, 1.6); f.cylX(p[0], 0.42, p[1], 0.42, 0.24, 10, r, DARK, 'white', [0.36, 0.34, 0.3]);
      p = P(sx * 0.82, -0.55); f.box(p[0], 1.45, p[1], 0.5, 0.08, 1.3, r, col);
    }
    p = P(0, -0.65); f.box(p[0], 1.3, p[1], 0.5, 0.12, 0.45, r, DARK);
    p = P(0, -0.35); f.box(p[0], 1.35, p[1], 0.05, 0.5, 0.05, r, DARK);
    p = P(0.25, 1.4); f.cyl(p[0], 1.6, p[1], 0.06, 0.06, 0.9, 6, DARK);
  }
  // a crate (of fruit: apples, pears, carrots, cabbages, bread), at (lx, y, lz) in the frame
  function crate(f, lx, y, lz, fruit, k) {
    const s = k || 1, col = { apple: [0.72, 0.18, 0.12], pear: [0.7, 0.68, 0.3], carrot: [0.84, 0.44, 0.14], cabbage: [0.5, 0.66, 0.42], bread: [0.72, 0.52, 0.3] }[fruit] || [0.6, 0.6, 0.5];
    f.box(lx, y, lz, 0.6 * s, 0.36 * s, 0.45 * s, 0, WOOD, 'planks', { top: false });
    f.box(lx, y + 0.3 * s, lz, 0.54 * s, 0.1 * s, 0.4 * s, 0, col, 'leaves', { top: 'leaves', topCol: col });
  }
  const hash = (a, b) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); };

  // what each piece takes up on the ground, and how high: [lx, lz, w, d] boxes in its frame (its
  // colliders, and its place: nothing else goes down on top of it). [] for nothing solid.
  const FOOT = {
    farmhouse: (it) => [[0, 0, (it.w || 9) + 0.3, (it.d || 7.5) + 0.3, 7], [0, (it.d || 7.5) / 2 + 1.3, (it.w || 9) * 0.82, 2.6, 0.55]],
    barn: () => [[0, 0, 11, 16, 8], [-7.5, -2.4, 4, 9.6, 3.6]],
    silo: (it) => [[0, 0, (it.r || 2.4) * 2, (it.r || 2.4) * 2, 13]],
    bin: (it) => [[0, 0, (it.r || 2.1) * 2, (it.r || 2.1) * 2, 5]],
    shed: (it) => [[0, -(it.d || 6) / 2, it.w || 10, 0.3, 3.6], [-(it.w || 10) / 2, 0, 0.3, it.d || 6, 3.6], [(it.w || 10) / 2, 0, 0.3, it.d || 6, 3.6], [-(it.w || 10) / 4, 0.4, 1.8, 3.4, 1.6]],
    windpump: () => [[0, 0, 2.8, 2.8, 9], [2.8, 2.6, 2.6, 2.6, 3], [0.5, 3.2, 2.6, 0.8, 0.6]],
    haystack: () => [[0, 0, 4.6, 4.6, 3.5]],
    bale: () => [[0, 0, 1.25, 1.55, 1.5]],
    bales: () => [[0, 0, 3.3, 0.6, 1.4]],
    hedge: (it) => [[0, 0, it.w, it.d, 1.6]],
    oak: (it) => [[0, 0, 0.9 * (it.size || 1), 0.9 * (it.size || 1), 6]],
    willow: () => [[0, 0, 0.8, 0.8, 4]],
    fruit: () => [[0, 0, 0.34, 0.34, 2.5]],
    greenhouse: (it) => [[0, 0, 6.2, (it.d || 12) + 0.2, 4]],
    tunnel: (it) => [[0, 0, 5.6, it.d || 16, 2.7]],
    coop: () => [[0, 0, 2.4, 1.8, 1.9], [0, 2.67, 5.1, 3.8, 1.3]],
    scarecrow: () => [[0, 0, 0.3, 0.3, 2.2]],
    fence: (it) => [[0, 0.04, it.len, 0.2, 1.25]],
    wire: (it) => [[0, 0, it.len, 0.12, 1.15]],
    gate: (it) => (it.open ? [[-1.85, 0, 0.3, 0.3, 1.4], [1.85, 0, 0.3, 0.3, 1.4]] : [[0, 0, 3.9, 0.2, 1.4]]),
    well: () => [[0, 0, 1.8, 1.8, 2.8]],
    trough: () => [[0, 0, 2.4, 0.75, 0.6]],
    hives: (it) => [[0, 0, (it.n || 5) * 1.3, 0.66, 1.06]],
    cart: () => [[0, 0.3, 1.8, 3.3, 1.4]],
    tractor: () => [[0, 0.5, 2.2, 3.4, 2.2]],
    wheelbarrow: () => [[0, 0.2, 0.7, 1.5, 0.8]],
    crates: () => [[0, 0, 1.3, 1.0, 0.8]],
    churns: () => [[0, 0, 1.3, 0.6, 0.7]],
    washing: () => [[-3, 0, 0.2, 0.2, 2], [3, 0, 0.2, 0.2, 2]],
    veg: () => [],
    woodpile: () => [[0, 0, 2.4, 0.9, 1.1]],
    mailbox: () => [[0, 0, 0.3, 0.5, 1.2]],
    pond: (it) => [[0, 0, (it.r || 5) * 1.8, (it.r || 5) * 1.8, 0.2]],
    ditch: () => [],
    warehouse: (it) => [[0, 0, it.w, it.d, 8], [0, it.d / 2 + 1, it.w * 0.9, 2, 1.2], [it.w / 2 + 2.2, it.d / 2 - 3, 4.4, 6, 3.2]],
    container: () => [[0, 0, 6.2, 2.5, 2.6]],
    track: () => [],
    boxcar: () => [[0, 0, 13.6, 3.0, 4.4]],
    bufferstop: () => [[0, 0, 0.7, 2.4, 1.2]],
    cabin: () => [[0, 0, 3.6, 3.2, 4.2], [2.3, 0, 0.8, 2.4, 2.6]],
    gas: () => [[-5.3, -3, 0.5, 0.5, 4.6], [5.3, -3, 0.5, 0.5, 4.6], [5.3, 3, 0.5, 0.5, 4.6], [-5.3, 3, 0.5, 0.5, 4.6], [-2.4, 0, 1, 5.6, 1.8], [2.4, 0, 1, 5.6, 1.8], [0, -8.5, 8, 5, 3.4], [8.7, 0, 0.4, 0.4, 7.5]],
    stall: (it) => [[0, 0, it.w || 3, 1.1, 1.0]],
    tent: () => [[0, 0, 2.5, 3.1, 1.6]],
    shack: () => [[0, 0, 3.4, 2.8, 2.2]],
    firebarrel: () => [[0, 0, 0.7, 0.7, 0.9]],
    mattress: () => [],
    trolley: () => [[0, 0, 0.6, 0.9, 1.0]],
    rubble: (it) => [[0, 0, (it.w || 3) * 0.8, (it.d || 2.5) * 0.8, 0.9]],
    tyres: () => [[0, 0, 0.85, 0.85, 0.66]],
    bush: (it) => [[0, 0, 1.6 + it.s, 1.6 + it.s, 1.2]],
    billboard: () => [[-2.4, -0.3, 0.3, 0.3, 6.3], [2.4, -0.3, 0.3, 0.3, 6.3]],
    pole: () => [[0, 0, 0.3, 0.3, 9]],
    wires: () => [],
    chainfence: (it) => [[0, 0, it.len, 0.12, 2.1]],
    plot: (it) => [[0, 0, it.w, it.d, 0.22]],
    gardenshed: () => [[0, 0, 2.1, 1.7, 2.2], [-1.4, 0.4, 0.7, 0.7, 0.9]],
    bench: () => [[0, 0.05, 1.8, 0.45, 0.5]],
    jetty: () => [],
    boat: () => [],
    reeds: () => [],
    vehicle: (it) => { const i = DV.Vehicles.model(it.kind || 'pickup', { seed: Math.floor(it.s * 997), wreck: !!it.wreck, color: it.color }).info; return [[0, 0, i.width, i.length, i.height]]; },
    crop: () => [],
  };
  // which reach each piece is drawn from
  const TIER = {
    farmhouse: 'far', barn: 'far', silo: 'far', bin: 'far', shed: 'far', windpump: 'far', haystack: 'far', bale: 'far', hedge: 'far', oak: 'far', willow: 'far',
    fruit: 'far', greenhouse: 'far', tunnel: 'far', warehouse: 'far', container: 'far', boxcar: 'far', cabin: 'far', gas: 'far', billboard: 'far', pole: 'far', wires: 'far', scarecrow: 'far',
    shack: 'mid', tent: 'mid', crop: 'mid', fence: 'mid', wire: 'mid', gate: 'mid', coop: 'mid', well: 'mid', hives: 'mid', cart: 'mid', tractor: 'mid', bales: 'mid', washing: 'mid',
    veg: 'mid', woodpile: 'mid', pond: 'mid', ditch: 'mid', track: 'mid', bufferstop: 'mid', stall: 'mid', chainfence: 'mid', plot: 'mid', gardenshed: 'mid', jetty: 'mid', boat: 'mid',
    reeds: 'mid', vehicle: 'mid', rubble: 'mid', bush: 'mid', trough: 'mid',
    wheelbarrow: 'near', crates: 'near', churns: 'near', mailbox: 'near', firebarrel: 'near', mattress: 'near', trolley: 'near', tyres: 'near', bench: 'near',
  };

  /* ---------------- the kit: placing it all, building and showing the chunks ---------------- */
  class Kit {
    constructor(zone, city) {
      this.zone = zone;
      this.city = city;
      this.chunks = { far: new Map(), mid: new Map(), near: new Map() };
      this.items = 0;
      this.rotors = [];
      this.fires = [];
      this.animals = []; // (where the farm life puts its beasts: { kind, rect, n })
      this.spots = []; // (where the farm life puts people at work: { x, z, rot, act })
      const L = zone.openAir || zone.lighting.sample(zone.bx0 - 50, 1.3, zone.bz0 - 50, 0, 1, 0, null, true);
      this.mat = new THREE.MeshBasicMaterial({ map: atlas(), vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, fog: true, color: new THREE.Color(U.clamp(L[0] * 0.95, 0.3, 1.2), U.clamp(L[1] * 0.95, 0.3, 1.2), U.clamp(L[2] * 0.95, 0.3, 1.2)) });
      // (the hour darkens it with the streets: see World.timeOfDay)
      if (city.walk && city.walk.mats) city.walk.mats.push(this.mat);
      this.occ = new Map(); // (what's down already, by 8 m cell)
      this.blockers = [];
      this.place();
      this.rotorMesh();
    }

    /* ---- where things may go ---- */
    cellsOf(q, fn) { for (let i = Math.floor(q[0] / 8); i <= Math.floor(q[2] / 8); i++) for (let j = Math.floor(q[1] / 8); j <= Math.floor(q[3] / 8); j++) fn(i * 100003 + j); }
    taken(q) {
      let hit = false;
      this.cellsOf(q, (k) => { if (hit) return; const l = this.occ.get(k); if (l) for (const r of l) if (q[0] < r[2] && q[2] > r[0] && q[1] < r[3] && q[3] > r[1]) { hit = true; return; } });
      return hit;
    }
    claim(q) { this.cellsOf(q, (k) => { let l = this.occ.get(k); if (!l) this.occ.set(k, (l = [])); l.push(q); }); }
    // the boxes an item takes up, in the world: [x0, z0, x1, z1, y1]
    footprint(it) {
      const c = Math.cos(it.rot), s = Math.sin(it.rot), out = [];
      for (const [lx, lz, w, d, h] of (FOOT[it.k] || (() => []))(it)) {
        const x = it.x + lx * c + lz * s, z = it.z - lx * s + lz * c, ex = (Math.abs(w * c) + Math.abs(d * s)) / 2, ez = (Math.abs(w * s) + Math.abs(d * c)) / 2;
        out.push([x - ex, z - ez, x + ex, z + ez, h]);
      }
      return out;
    }
    // put a piece down if it fits (nothing under it, no road, inside the Fence and off the marsh):
    // it.force skips the check (things that belong together: a farm's own buildings, laid out)
    put(it, opts) {
      opts = opts || {};
      it.rot = it.rot || 0;
      it.s = it.s === undefined ? this.r() : it.s;
      const fp = this.footprint(it), pad = opts.pad === undefined ? 0.3 : opts.pad;
      if (!opts.force) for (const q of fp) {
        const g = [q[0] - pad, q[1] - pad, q[2] + pad, q[3] + pad];
        if (this.taken(g) || this.off(g, opts)) return false;
      }
      for (const q of fp) this.claim(q);
      this.add(it, fp);
      return true;
    }
    // somewhere nothing may stand: a road (the city's, the roads out, the farm roads), a pavement, a
    // block, the Testing Center, a landmark's ground, the Fence's cordon, the marsh
    off(q, opts) {
      const c = this.c0, cx = (q[0] + q[2]) / 2, cz = (q[1] + q[3]) / 2;
      if (q[2] > this.shore - 0.5 && !(opts && opts.marsh)) return true;
      if (Math.hypot(Math.max(Math.abs(q[0] - c[0]), Math.abs(q[2] - c[0])), Math.max(Math.abs(q[1] - c[1]), Math.abs(q[3] - c[1]))) > this.cordon - 8 && Math.hypot(cx - c[0], cz - c[1]) > this.cordon - 12) return true;
      let hit = false;
      this.cellsOf(q, (k) => { if (hit) return; const l = this.block.get(k); if (l) for (const r of l) if (q[0] < r[2] && q[2] > r[0] && q[1] < r[3] && q[3] > r[1]) { hit = true; return; } });
      return hit;
    }
    add(it, fp) {
      const tier = TIER[it.k] || 'mid', size = TIERS[tier][0];
      const i = Math.floor(it.x / size), j = Math.floor(it.z / size), key = i * 100003 + j;
      let ch = this.chunks[tier].get(key);
      if (!ch) this.chunks[tier].set(key, (ch = { tier, cx: (i + 0.5) * size, cz: (j + 0.5) * size, items: [], mesh: null, built: false }));
      ch.items.push(it);
      this.items++;
      const zone = this.zone, audit = this.city.audit;
      for (const q of fp || []) {
        if (q[4] > 0.5) zone.colliders.add(q[0], q[1], q[2], q[3], { y1: q[4], tag: 'farm', camera: q[4] > 2.2 });
        if (q[4] > 0.8) this.city.walk.solids.push(q.slice()); // (so the streets' furniture keeps off it)
        if (audit) audit.push([q[0], q[1], q[2], q[3], 0, q[4], 'farms:' + it.k, 1]);
      }
      if (it.k === 'windpump') this.rotors.push([it.x + Math.sin(it.rot) * 0.75, 9.25, it.z + Math.cos(it.rot) * 0.75, it.rot, it.s * 6]);
      if (it.k === 'firebarrel') this.fires.push([it.x, 1.2, it.z, [1, 0.6, 0.25]]);
    }

    place() {
      const CM = DV.CityMap, F = CM.farms(), net = CM.roadNet();
      this.r = U.rng(9091);
      this.c0 = CM.centre; this.cordon = CM.wall.cordon; this.shore = this.city.walk.shore;
      // where nothing goes: every road, pavement and block, the zone's grounds, the landmarks and homes
      this.block = new Map();
      const no = (q) => { const r = [q[0], q[1], q[2], q[3]]; this.cellsOf(r, (k) => { let l = this.block.get(k); if (!l) this.block.set(k, (l = [])); l.push(r); }); };
      for (const q of net.roads) no(q.r);
      for (const q of F.roads) no(q);
      for (const pd of this.city.walk.pads) no(pd.r);
      for (let i = -1; i < net.nx; i++) for (let j = -1; j < net.nz; j++) if (net.built(i, j)) no(net.cell(i, j));
      no(this.city.walk.campus);
      for (const l of CM.landmarks) if (l.w) no([l.x - l.w / 2 - 6, l.z - l.d / 2 - 6, l.x + l.w / 2 + 6, l.z + l.d / 2 + 6]);
      // (the Order Station's block is its own: nothing of ours goes near it)
      const os = CM.landmark('order_station');
      if (os) no([os.x - 40, os.z - 34, os.x + 40, os.z + 34]);
      for (const q of this.city.walk.solids) no(q);
      this.placeFarms(F);
      this.placeEdge(net);
      this.placeLots(this.city.walk.lots || []);
      this.placeShore();
    }

    /* ---- the farms ---- */
    placeFarms(F) {
      const r = this.r;
      // the fields: the crop (in each mid chunk the field reaches), a scarecrow, the bales on the
      // stubble, a tractor at work, a gate onto the road
      F.fields.forEach((fl, n) => {
        const [x0, z0, x1, z1] = fl.r, along = x1 - x0 >= z1 - z0;
        if (CROPC[fl.crop] && fl.crop !== 'plough') {
          const S = TIERS.mid[0];
          for (let i = Math.floor(x0 / S); i <= Math.floor((x1 - 0.01) / S); i++) for (let j = Math.floor(z0 / S); j <= Math.floor((z1 - 0.01) / S); j++) {
            const q = [Math.max(x0, i * S), Math.max(z0, j * S), Math.min(x1, (i + 1) * S), Math.min(z1, (j + 1) * S)];
            if (q[2] - q[0] > 0.5 && q[3] - q[1] > 0.5) this.add({ k: 'crop', x: (q[0] + q[2]) / 2, z: (q[1] + q[3]) / 2, rot: 0, s: 0, field: fl, r: q });
          }
          this.claim([x0, z0, x1, z1]);
        }
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, rr = () => [x0 + 3 + r() * (x1 - x0 - 6), z0 + 3 + r() * (z1 - z0 - 6)];
        if ((fl.crop === 'corn' || fl.crop === 'wheat' || fl.crop === 'cabbage' || fl.crop === 'beans') && r() < 0.3) { const [x, z] = rr(); this.put({ k: 'scarecrow', x, z, rot: r() * 6 }, { pad: 0, force: true }); }
        if (fl.crop === 'stubble') {
          // the bales where the baler dropped them, in lines down the field
          const n2 = 5 + Math.floor(r() * 9);
          for (let k = 0; k < n2; k++) { const t = (k + 0.5) / n2, x = along ? x0 + 4 + t * (x1 - x0 - 8) : x0 + 4 + r() * (x1 - x0 - 8), z = along ? z0 + 4 + r() * (z1 - z0 - 8) : z0 + 4 + t * (z1 - z0 - 8); this.put({ k: 'bale', x, z, rot: r() * 3 }, { pad: 0.2 }); }
          if (r() < 0.25) this.put({ k: 'cart', x: mx, z: mz, rot: r() * 6, load: 'hay' }, { force: true });
        }
        if (fl.crop === 'plough' && r() < 0.25) this.put({ k: 'tractor', x: x0 + 4, z: z0 + 4, rot: along ? Math.PI / 2 : 0 });
        if (fl.crop === 'pasture') {
          // a pasture: fenced, a gate onto the nearest road, a trough; the beasts (DV.FarmLife)
          this.fenceRound([x0 + 0.6, z0 + 0.6, x1 - 0.6, z1 - 0.6], 'fence');
          this.put({ k: 'trough', x: mx + (r() - 0.5) * 6, z: mz + (r() - 0.5) * 6, rot: r() * 3 }, { pad: 0.5 });
          const kind = r() < 0.55 ? 'cow' : r() < 0.75 ? 'goat' : 'sheep';
          this.animals.push({ kind, rect: [x0 + 2, z0 + 2, x1 - 2, z1 - 2], n: kind === 'cow' ? 4 + Math.floor(r() * 6) : 7 + Math.floor(r() * 9) });
        }
        if (fl.crop === 'fallow' && r() < 0.4) this.put({ k: 'bush', x: mx, z: mz, rot: 0 });
        if (fl.crop !== 'pasture' && r() < 0.18) this.ditchBy(fl);
        // people at work in it (DV.FarmLife), along a row
        if (fl.crop !== 'fallow' && fl.crop !== 'pasture' && fl.crop !== 'stubble') for (let k = 0; k < 2; k++) { const [x, z] = rr(); this.spots.push({ x, z, rot: along ? (r() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : r() < 0.5 ? 0 : Math.PI, act: fl.crop === 'plough' ? 'sweep' : 'garden', where: 'field' }); }
        void n;
      });
      // the hedgerows (thickened to fill the gap between the quarters), an oak in them now and then
      for (const [x0, z0, x1, z1] of F.hedges) {
        const along = x1 - x0 > z1 - z0, c = along ? (z0 + z1) / 2 + 0.2 : (x0 + x1) / 2 + 0.2;
        const q = along ? [x0, c - 0.65, x1, c + 0.65] : [c - 0.65, z0, c + 0.65, z1];
        this.put({ k: 'hedge', x: (q[0] + q[2]) / 2, z: (q[1] + q[3]) / 2, w: q[2] - q[0], d: q[3] - q[1], rot: 0 }, { force: true });
        const L = along ? x1 - x0 : z1 - z0;
        for (let t = 10 + r() * 20; t < L - 6; t += 22 + r() * 30) if (r() < 0.45) { const x = along ? x0 + t : c, z = along ? c : z0 + t; this.put({ k: 'oak', x, z, rot: r() * 6, size: 0.75 + r() * 0.45 }, { force: true }); }
      }
      // the orchards: fruit trees in rows; hives along one side of some; ladders and baskets out
      for (const o of F.orchards) {
        const [x0, z0, x1, z1] = o.r;
        let trees = 0;
        for (let x = x0 + 3; x < x1 - 2; x += 8) for (let z = z0 + 3; z < z1 - 2; z += 7) {
          if (this.put({ k: 'fruit', x: x + (r() - 0.5) * 0.6, z: z + (r() - 0.5) * 0.6, rot: r() * 6 }, { pad: 0.6 })) trees++;
          if (r() < 0.05) this.spots.push({ x: x + 1.3, z, rot: -Math.PI / 2, act: 'pick', where: 'orchard' });
          if (r() < 0.04) this.put({ k: 'crates', x: x + 3.5, z: z + 3, rot: r() * 3, n: 3 + Math.floor(r() * 4) });
        }
        if (r() < 0.35) this.put({ k: 'hives', x: (x0 + x1) / 2, z: z0 - 0.2, rot: 0, n: 4 + Math.floor(r() * 5) }, { pad: 0.2 });
        if (r() < 0.4) this.put({ k: 'cart', x: x1 - 3, z: z1 - 4, rot: r() * 6, load: 'apple' });
        void trees;
      }
      for (const st of F.steads) this.stead(st);
      // Amity's own: polytunnels and greenhouses out round the headquarters, the drive in
      const am = DV.CityMap.landmark('amity');
      for (let k = 0; k < 5; k++) this.put({ k: 'tunnel', x: am.x - 30 + k * 7, z: am.z + am.d / 2 + 24, rot: 0, d: 16 });
      for (let k = 0; k < 2; k++) this.put({ k: 'greenhouse', x: am.x + 22 + k * 9, z: am.z + am.d / 2 + 22, rot: 0, d: 14 });
      for (let k = 0; k < 3; k++) this.put({ k: 'stall', x: am.x + am.w / 2 + 10, z: am.z - 9 + k * 4.5, rot: -Math.PI / 2, w: 3 });
      for (let k = 0; k < 6; k++) this.spots.push({ x: am.x - 30 + k * 7 + 2.2 * (k % 2 ? 1 : -1), z: am.z + am.d / 2 + 18, rot: 0, act: 'garden', where: 'tunnels' });
    }
    // a fence round a rectangle (post and rail, or wire), a gate in the side nearest a road
    fenceRound(q, kind) {
      const [x0, z0, x1, z1] = q, r = this.r, gateSide = Math.floor(r() * 4);
      const sides = [[x0, z0, x1, z0, 0], [x1, z0, x1, z1, Math.PI / 2], [x1, z1, x0, z1, Math.PI], [x0, z1, x0, z0, -Math.PI / 2]];
      sides.forEach(([ax, az, bx, bz, rot], k) => {
        const L = Math.hypot(bx - ax, bz - az), hx = (bx - ax) / L, hz = (bz - az) / L;
        const runs = k === gateSide ? [[0, L / 2 - 2], [L / 2 + 2, L]] : [[0, L]];
        for (const [a, b] of runs) for (let t = a; t < b - 0.5; t += 24) {
          const e = Math.min(b, t + 24), m = (t + e) / 2;
          this.put({ k: kind, x: ax + hx * m, z: az + hz * m, rot: -rot, len: e - t }, { force: true });
        }
        if (k === gateSide) this.put({ k: 'gate', x: ax + hx * (L / 2), z: az + hz * (L / 2), rot: -rot, open: r() < 0.5 }, { force: true });
      });
    }
    // a ditch down the side of a field (the verge along the road side has no room: the field's edge)
    ditchBy(fl) {
      const [x0, z0, x1, z1] = fl.r, along = x1 - x0 >= z1 - z0, side = this.r() < 0.5 ? 0 : 1;
      const x = along ? (x0 + x1) / 2 : side ? x1 - 0.6 : x0 + 0.6, z = along ? (side ? z1 - 0.6 : z0 + 0.6) : (z0 + z1) / 2;
      this.add({ k: 'ditch', x, z, rot: along ? 0 : Math.PI / 2, len: (along ? x1 - x0 : z1 - z0) - 1, s: 0 });
    }
    // a farm: laid out in its own frame (+z towards its road), the yard round it
    stead(st) {
      const r = U.rng(st.seed * 7 + 3), F = (lx, lz) => [st.x + lx * Math.cos(st.rot) + lz * Math.sin(st.rot), st.z - lx * Math.sin(st.rot) + lz * Math.cos(st.rot)];
      const one = (k, lx, lz, rot, more, force) => { const [x, z] = F(lx, lz); return this.put(Object.assign({ k, x, z, rot: st.rot + (rot || 0), s: r() }, more || {}), { force: force !== false }); };
      one('farmhouse', -9, 4, 0, { storeys: r() < 0.6 ? 2 : 1, w: 9, d: 7.5 });
      one('barn', 5.5, -2.5, Math.PI / 2, { red: st.barn === 'red' }, true);
      one('silo', 13.5, 6.5, 0, { h: 11 + r() * 4 });
      one('bin', 13.5, -7, 0); one('bin', 8, -9.5, 0, { r: 1.8, h: 3.6 });
      // the rest is the yard's: whatever fits
      const yard = st.yard, rr = () => [yard[0] + 3 + r() * (yard[2] - yard[0] - 6), yard[1] + 3 + r() * (yard[3] - yard[1] - 6)];
      const any = (k, more, tries) => { for (let n = 0; n < (tries || 8); n++) { const [x, z] = rr(); if (this.put(Object.assign({ k, x, z, rot: r() * 6.28, s: r() }, more || {}), { pad: 0.8 })) return [x, z]; } return null; };
      this.claim([st.x - 17, st.z - 12, st.x + 17, st.z + 12]);
      let p = F(-1, 12);
      this.put({ k: 'windpump', x: p[0], z: p[1], rot: st.rot, s: r() }, { pad: 0.5 });
      p = F(-15, -6); this.put({ k: 'shed', x: p[0], z: p[1], rot: st.rot + Math.PI / 2, w: 10, d: 6, s: r() }, { pad: 0.5 });
      p = F(-5, 13); this.put({ k: 'well', x: p[0], z: p[1], rot: st.rot, s: r() }, { pad: 0.3 });
      p = F(-15, 10); this.put({ k: 'coop', x: p[0], z: p[1], rot: st.rot, s: r() }, { pad: 0.3 });
      this.animals.push({ kind: 'chicken', rect: [Math.min(F(-17.5, 11)[0], F(-12.5, 15)[0]), Math.min(F(-17.5, 11)[1], F(-12.5, 15)[1]), Math.max(F(-17.5, 11)[0], F(-12.5, 15)[0]), Math.max(F(-17.5, 11)[1], F(-12.5, 15)[1])], n: 5 + Math.floor(r() * 6) });
      p = F(-9, 13.5); this.put({ k: 'mailbox', x: p[0], z: p[1], rot: st.rot, s: r() }, { pad: 0.2 });
      p = F(1, 6); this.put({ k: 'crates', x: p[0], z: p[1], rot: st.rot + r(), n: 4 + Math.floor(r() * 5) }, { pad: 0.3 });
      p = F(2.5, 8); this.put({ k: 'churns', x: p[0], z: p[1], rot: st.rot }, { pad: 0.3 });
      p = F(-3, 7); this.put({ k: 'wheelbarrow', x: p[0], z: p[1], rot: st.rot + r() * 6 }, { pad: 0.2 });
      p = F(-9, -3.5); this.put({ k: 'woodpile', x: p[0], z: p[1], rot: st.rot }, { pad: 0.2 });
      p = F(-9, -8); this.put({ k: 'washing', x: p[0], z: p[1], rot: st.rot, s: r() }, { pad: 0.3 });
      this.spots.push({ x: F(0, 4)[0], z: F(0, 4)[1], rot: st.rot + Math.PI / 2, act: 'carry', where: 'yard', to: F(-6, 4) });
      any('haystack'); if (r() < 0.6) any('haystack');
      any('cart', { load: ['hay', 'apple', 'cabbage', null][Math.floor(r() * 4)] });
      if (r() < 0.6) any('veg', { w: 6, d: 4 }, 6);
      if (r() < 0.35) any('pond', { r: 4 + r() * 2.5 }, 10) && null;
      const pond = this.lastPond;
      void pond;
      if (r() < 0.25) any('hives', { n: 3 + Math.floor(r() * 4) });
      if (r() < 0.3) any('greenhouse', { d: 10 + Math.floor(r() * 3) * 2 }, 10);
      else if (r() < 0.4) for (let k = 0; k < 2 + Math.floor(r() * 3); k++) any('tunnel', { d: 14 }, 10);
      if (r() < 0.5) any('tractor');
      for (let k = 0; k < 4; k++) any('fruit');
      // goats in a corner paddock, or a cow or two
      if (r() < 0.5) {
        const y = st.yard, q = st.quarter < 2 ? [y[0] + 2, y[3] - 16, y[2] - 2, y[3] - 2] : [y[0] + 2, y[1] + 2, y[2] - 2, y[1] + 16];
        if (!this.taken([q[0] + 1, q[1] + 1, q[2] - 1, q[3] - 1])) { this.fenceRound(q, 'fence'); this.claim(q); this.animals.push({ kind: r() < 0.6 ? 'goat' : 'cow', rect: [q[0] + 1.2, q[1] + 1.2, q[2] - 1.2, q[3] - 1.2], n: 2 + Math.floor(r() * 4) }); }
      }
    }

    /* ---- the city's edge: the open ground past the last streets ---- */
    placeEdge(net) {
      const r = this.r, CM = DV.CityMap;
      for (const lot of net.lots) {
        const [x0, z0, x1, z1] = lot.r, w = x1 - x0, d = z1 - z0;
        if (w < 6 || d < 6) continue;
        // which side faces the street (it's dressed facing it): the first frontage, or the nearest to the city
        const f = lot.front, c = CM.centre;
        const face = f[3] ? 0 : f[1] ? Math.PI : f[0] ? -Math.PI / 2 : f[2] ? Math.PI / 2 : Math.atan2(c[0] - (x0 + x1) / 2, c[1] - (z0 + z1) / 2);
        const d0 = lot.d, q = r();
        let kind;
        if (w < 12 || d < 12) kind = 'verge';
        else if (d0 === 'factionless') kind = q < 0.6 ? 'camp' : 'overgrown';
        else if (d0 === 'dauntless') kind = q < 0.4 ? 'railyard' : q < 0.75 ? 'depot' : 'overgrown';
        else if (d0 === 'abnegation') kind = q < 0.55 ? 'allotments' : q < 0.75 ? 'depot' : 'overgrown';
        else if (d0 === 'erudite') kind = q < 0.5 ? 'depot' : q < 0.7 ? 'railyard' : 'overgrown';
        else kind = q < 0.4 ? 'depot' : q < 0.6 ? 'overgrown' : q < 0.8 ? 'allotments' : 'camp';
        // a gas station where a road leaves the city; the market where Madison does
        if (kind !== 'verge' && this.nearOut(lot.r, net, 14) && r() < 0.6) kind = 'gas';
        const gz = CM.gateRoad();
        if (kind !== 'verge' && Math.abs((z0 + z1) / 2 - gz.z) < 50 && x1 < -400) kind = 'market';
        lot.kind = kind;
        this.dressLot(kind, lot.r, face, d0);
      }
      // the poles and their wires: along the outside of the last streets, and out along the roads out
      for (const s of net.strips) for (const k of s.kerbs) {
        const along = k[5] !== 0, a = along ? Math.min(k[0], k[2]) : Math.min(k[1], k[3]), b = along ? Math.max(k[0], k[2]) : Math.max(k[1], k[3]);
        // (on the far side of the pavement from the kerb, a metre into the ground beyond it)
        const off = (along ? -k[5] : -k[4]) * (DV.CityMap.sidewalk + 1.0), line = (along ? k[1] : k[0]) + off;
        this.poleRun(along ? [a, line] : [line, a], along ? [b, line] : [line, b]);
      }
      for (const o of net.out) { const q = o.parts[1], v = o.axis === 'z'; this.poleRun(v ? [q[0] - 1.5, q[1]] : [q[0], q[1] - 1.5], v ? [q[0] - 1.5, q[3]] : [q[2], q[1] - 1.5]); }
    }
    nearOut(q, net, m) { return net.out.some((o) => o.parts.some((p) => q[0] - m < p[2] && q[2] + m > p[0] && q[1] - m < p[3] && q[3] + m > p[1])); }
    // a line of poles from a to b, the wires slung between them (where a pole can't go, the line breaks)
    poleRun(a, b) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 20) return;
      const n = Math.max(1, Math.round(L / 34)), rot = Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2;
      let prev = null;
      for (let k = 0; k <= n; k++) {
        const x = a[0] + ((b[0] - a[0]) * k) / n, z = a[1] + ((b[1] - a[1]) * k) / n;
        const key = Math.round(x / 6) + ':' + Math.round(z / 6);
        if (this.poles && this.poles.has(key)) { prev = this.poles.get(key); continue; }
        if (this.put({ k: 'pole', x, z, rot }, { pad: 0.2 })) {
          (this.poles || (this.poles = new Map())).set(key, [x, z]);
          if (prev) this.add({ k: 'wires', x: prev[0], z: prev[1], to: [x, z], rot: 0, s: 0 });
          prev = [x, z];
        } else prev = null;
      }
    }
    // a lot's dressing, by what it is, facing its street (face: the way its front looks)
    dressLot(kind, q, face, sector) {
      const r = this.r, [x0, z0, x1, z1] = q, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
      const turned = Math.abs(Math.sin(face)) > 0.5, W = turned ? d : w, D = turned ? w : d; // (across its front, and back from it)
      const F = (lx, lz) => [cx + lx * Math.cos(face) + lz * Math.sin(face), cz - lx * Math.sin(face) + lz * Math.cos(face)];
      const at = (k, lx, lz, rot, more, opts) => { const [x, z] = F(lx, lz); return this.put(Object.assign({ k, x, z, rot: face + (rot || 0) }, more || {}), opts || { pad: 0.6 }); };
      const scatter = (k, n, more, opts) => { for (let i = 0; i < n; i++) for (let t = 0; t < 6; t++) { const x = x0 + 2 + r() * (w - 4), z = z0 + 2 + r() * (d - 4); if (this.put(Object.assign({ k, x, z, rot: r() * 6.28 }, typeof more === 'function' ? more() : more || {}), opts || { pad: 0.5 })) break; } };
      const ground = (band, col) => this.add({ k: 'patch', x: cx, z: cz, rot: 0, s: 0, q: [x0 + 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5], band, col });
      // (the front fence, along the street side, with a gap for a gate)
      const frontFence = (kind2) => { const L = W - 4; for (const sx of [-1, 1]) at(kind2, (sx * (L / 4 + 2.5)), D / 2 - 1, 0, { len: L / 2 - 3 }, { force: true }); };
      if (kind === 'depot') {
        ground('gravel', [0.62, 0.6, 0.56]);
        const ww = Math.min(W - 10, 22 + r() * 14), dd = Math.min(D - 14, 14 + r() * 8);
        if (ww > 12 && dd > 8) at('warehouse', -W / 2 + ww / 2 + 3, -D / 2 + dd / 2 + 2, 0, { w: ww, d: dd });
        frontFence('chainfence');
        scatter('container', 2 + Math.floor(r() * 3), () => ({ stack: r() < 0.3 ? 2 : 1 }));
        scatter('vehicle', 1 + Math.floor(r() * 2), () => ({ kind: r() < 0.5 ? 'van' : 'pickup', wreck: r() < 0.3 }));
        scatter('crates', 2, () => ({ n: 4 + Math.floor(r() * 4) }));
        scatter('tyres', 2);
        if (r() < 0.5) at('billboard', W / 2 - 6, D / 2 - 3, 0, { ad: Math.floor(r() * 4) });
      } else if (kind === 'railyard') {
        ground('gravel', [0.58, 0.55, 0.5]);
        const along = w > d, L = (along ? w : d) - 6, n = Math.max(1, Math.min(4, Math.floor(((along ? d : w) - 6) / 5)));
        for (let k = 0; k < n; k++) {
          const off = -((n - 1) * 5) / 2 + k * 5, x = along ? cx : cx + off, z = along ? cz + off : cz;
          this.add({ k: 'track', x, z, rot: along ? 0 : Math.PI / 2, len: L, s: 0 });
          const cars = Math.floor(r() * 3);
          for (let m = 0; m < cars; m++) { const t = -L / 2 + 8 + m * 14 + r() * 4; if (t < L / 2 - 7) this.put({ k: 'boxcar', x: along ? cx + t : x, z: along ? z : cz + t, rot: along ? 0 : Math.PI / 2, s: r() }, { force: true }); }
          this.put({ k: 'bufferstop', x: along ? cx + L / 2 + 0.6 : x, z: along ? z : cz + L / 2 + 0.6, rot: along ? 0 : Math.PI / 2 }, { force: true });
          this.claim(along ? [cx - L / 2, z - 1.8, cx + L / 2, z + 1.8] : [x - 1.8, cz - L / 2, x + 1.8, cz + L / 2]);
        }
        scatter('cabin', 1);
        scatter('container', 2);
      } else if (kind === 'gas') {
        ground('gravel', [0.66, 0.64, 0.6]);
        at('gas', 0, D / 2 - 7, 0, {});
        const [px, pz] = F(-2.4 + (r() < 0.5 ? 0 : 4.8), D / 2 - 7 + 1.4);
        if (r() < 0.7) this.put({ k: 'vehicle', x: px + 1.6, z: pz, rot: face + Math.PI / 2, kind: r() < 0.5 ? 'sedan' : 'pickup', s: r() }, { pad: 0.1 });
        scatter('tyres', 2);
        if (r() < 0.6) at('billboard', 0, -D / 2 + 3, 0, { ad: Math.floor(r() * 4) });
      } else if (kind === 'allotments') {
        ground('gravel', [0.5, 0.44, 0.36]);
        const pw = 4, pd = 6;
        for (let lx = -W / 2 + 3; lx + pw < W / 2 - 2; lx += pw + 1.4) for (let lz = -D / 2 + 3; lz + pd < D / 2 - 3; lz += pd + 1.6) {
          if (r() < 0.12) { at('gardenshed', lx + pw / 2, lz + pd / 2, r() < 0.5 ? 0 : Math.PI / 2, { s: r() }); continue; }
          at('plot', lx + pw / 2, lz + pd / 2, 0, { w: pw, d: pd, s: r() }, { pad: 0.2 });
          if (r() < 0.12) this.spots.push({ x: F(lx + pw / 2, lz - 0.6)[0], z: F(lx + pw / 2, lz - 0.6)[1], rot: face, act: 'garden', where: 'allotment', faction: sector === 'abnegation' ? 'abnegation' : null });
        }
        frontFence('wire');
        scatter('scarecrow', 1);
        scatter('bench', 1);
      } else if (kind === 'camp') {
        ground('gravel', [0.46, 0.42, 0.36]);
        const n = 3 + Math.floor(r() * 5);
        for (let i = 0; i < n; i++) scatter(r() < 0.6 ? 'tent' : 'shack', 1, () => ({ s: r() }), { pad: 1.0 });
        scatter('firebarrel', 1 + Math.floor(r() * 2), null, { pad: 1.5 });
        scatter('mattress', 2); scatter('trolley', 2); scatter('rubble', 2, () => ({ w: 3 + r() * 3, d: 2 + r() * 3 }));
        scatter('vehicle', 1, () => ({ kind: r() < 0.5 ? 'sedan' : 'van', wreck: true }));
        scatter('tyres', 2); scatter('crates', 1, { n: 3 });
      } else if (kind === 'market') {
        ground('gravel', [0.6, 0.56, 0.48]);
        for (let i = 0; i < 4; i++) at('stall', -W / 2 + 5 + i * 5, D / 2 - 5, 0, { w: 3.2, s: r() }, { pad: 0.4 });
        scatter('cart', 2, () => ({ load: ['apple', 'cabbage', 'hay'][Math.floor(r() * 3)] }));
        scatter('crates', 3, () => ({ n: 4 + Math.floor(r() * 4) }));
        scatter('vehicle', 1, { kind: 'pickup', color: 0x6a8a3a });
        for (let i = 0; i < 3; i++) this.spots.push({ x: F(-W / 2 + 5 + i * 5, D / 2 - 3.6)[0], z: F(-W / 2 + 5 + i * 5, D / 2 - 3.6)[1], rot: face, act: 'give', where: 'market' });
        at('billboard', 0, -D / 2 + 3, 0, { ad: 0 });
      } else if (kind === 'overgrown' || kind === 'verge') {
        const n = kind === 'verge' ? 1 : 3;
        scatter('rubble', n, () => ({ w: 2 + r() * 4, d: 2 + r() * 3 }));
        scatter('bush', n + 1, () => ({ s: r() }));
        if (r() < 0.6) scatter('vehicle', 1, () => ({ kind: ['sedan', 'hatch', 'van'][Math.floor(r() * 3)], wreck: true }));
        if (kind === 'overgrown' && r() < 0.6) scatter('oak', 1, () => ({ size: 0.6 + r() * 0.4 }));
        if (kind === 'overgrown' && r() < 0.5) at('billboard', 0, D / 2 - 4, 0, { ad: Math.floor(r() * 4) });
        scatter('tyres', 1);
      }
    }

    /* ---- the city's empty lots: a garden, a market, the wrecks ---- */
    placeLots(lots) {
      const r = this.r;
      for (const lt of lots) {
        const face = Math.atan2(lt.face[0], lt.face[1]), sec = lt.sector, q = r();
        const kind = sec === 'factionless' || sec === 'dauntless' ? (q < 0.6 ? 'wrecks' : 'overgrown') : sec === 'downtown' || sec === 'candor' ? (q < 0.5 ? 'market' : 'garden') : q < 0.55 ? 'garden' : 'overgrown';
        const rect = [lt.x - lt.w / 2 + 0.4, lt.z - lt.d / 2 + 0.4, lt.x + lt.w / 2 - 0.4, lt.z + lt.d / 2 - 0.4];
        this.cityLot(kind, rect, face, sec);
      }
    }
    cityLot(kind, q, face, sector) {
      const r = this.r, [x0, z0, x1, z1] = q, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, turned = Math.abs(Math.sin(face)) > 0.5, W = turned ? z1 - z0 : x1 - x0, D = turned ? x1 - x0 : z1 - z0;
      const F = (lx, lz) => [cx + lx * Math.cos(face) + lz * Math.sin(face), cz - lx * Math.sin(face) + lz * Math.cos(face)];
      const at = (k, lx, lz, rot, more) => { const [x, z] = F(lx, lz); return this.put(Object.assign({ k, x, z, rot: face + (rot || 0) }, more || {}), { pad: 0.3, city: true }); };
      this.add({ k: 'patch', x: cx, z: cz, rot: 0, s: 0, q: [x0, z0, x1, z1], band: 'gravel', col: kind === 'garden' ? [0.46, 0.4, 0.32] : [0.56, 0.54, 0.5], y: 0.03 });
      if (kind === 'garden') {
        for (let lx = -W / 2 + 1.5; lx + 2.2 < W / 2 - 1; lx += 3.2) for (let lz = -D / 2 + 1.5; lz + 3 < D / 2 - 2.5; lz += 4.2) at('plot', lx + 1.1, lz + 1.5, 0, { w: 2.2, d: 3, s: r() });
        at('bench', 0, D / 2 - 1.2, Math.PI, {});
        at('gardenshed', W / 2 - 1.6, -D / 2 + 1.4, 0, { s: r() });
        if (W > 6) at('wire', 0, D / 2 - 0.3, 0, { len: W - 1 });
        if (r() < 0.5) this.spots.push({ x: F(0, 0)[0], z: F(0, 0)[1], rot: face, act: 'garden', where: 'garden', faction: sector === 'abnegation' ? 'abnegation' : null });
      } else if (kind === 'market') {
        for (let lx = -W / 2 + 2; lx + 3 < W / 2 - 0.5; lx += 4) at('stall', lx + 1.5, D / 2 - 1.6, 0, { w: 3, s: r() });
        at('crates', -W / 4, 0, r(), { n: 6 });
        at('cart', W / 4, -D / 4, r() * 6, { load: 'cabbage' });
      } else {
        at('vehicle', -W / 5, 0, Math.PI / 2 + (r() - 0.5) * 0.6, { kind: ['sedan', 'hatch', 'van'][Math.floor(r() * 3)], wreck: true, s: r() });
        if (D > 10) at('vehicle', W / 5, D / 4, (r() - 0.5) * 0.8, { kind: 'sedan', wreck: true, s: r() });
        at('rubble', 0, -D / 4, 0, { w: W * 0.4, d: D * 0.25 });
        at('tyres', W / 3, -D / 3, 0, {});
        at('bush', -W / 3, D / 3, 0, { s: r() });
        if (kind === 'overgrown' && W > 9) at('billboard', 0, -D / 2 + 1.2, 0, { ad: Math.floor(r() * 4) });
      }
    }

    /* ---- the shore: the reeds along the marsh, the jetties, a boat ---- */
    placeShore() {
      const CM = DV.CityMap, c = CM.centre, X = CM.marshX - 3, r = this.r, zr = Math.sqrt(Math.max(0, Math.pow(CM.wall.cordon - 30, 2) - (X - c[0]) * (X - c[0])));
      for (let z = c[1] - zr; z < c[1] + zr; z += 4 + r() * 6) {
        this.put({ k: 'reeds', x: X + 2.5 + r() * 9, z, rot: 0, n: 3 + Math.floor(r() * 3) }, { marsh: true, pad: 0 });
        if (r() < 0.03) this.put({ k: 'jetty', x: X + 0.6, z, rot: 0, len: 14 + r() * 20 }, { marsh: true, force: true });
        else if (r() < 0.03) this.put({ k: 'boat', x: X + 6 + r() * 8, z, rot: r() * 6, s: r() }, { marsh: true, force: true });
      }
      // benches along the shore promenade, looking out over it
      for (let z = c[1] - zr + 20; z < c[1] + zr - 20; z += 30 + r() * 30) this.put({ k: 'bench', x: X - 1.6, z, rot: Math.PI / 2 }, { pad: 0.3 });
    }

    /* ---- building and showing ---- */
    rotorMesh() {
      // the windpumps' wheels: twelve sails round a hub, one instanced mesh for all of them
      const f = new FB();
      f.cyl(0, -0.15, 0, 0.18, 0.18, 0.3, 6, DARK);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        const P = (rad, w, dz) => [Math.cos(a + w) * rad, Math.sin(a + w) * rad, dz];
        f.quad(P(0.3, -0.04, 0.0), P(1.5, -0.1, 0.05), P(1.5, 0.12, -0.05), P(0.3, 0.06, 0.0), f.uv('white', 0, 1), [0.82, 0.8, 0.76], null);
        void c; void s;
      }
      f.cyl(0, -0.02, 0, 1.52, 1.52, 0.04, 16, [0.4, 0.38, 0.36]);
      // (lying in the wheel's plane: x and y, turning about z)
      const g = f.geometry(), p = g.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) { const y = p[i + 1], z = p[i + 2]; p[i + 1] = -z; p[i + 2] = y; }
      g.computeBoundingSphere();
      this.rotor = new THREE.InstancedMesh(g, this.mat, Math.max(1, this.rotors.length));
      this.rotor.count = 0;
      this.rotor.frustumCulled = false;
      this.rotor.name = 'farm_windpumps';
      this.zone.group.add(this.rotor);
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    }
    buildChunk(ch) {
      const f = new FB();
      for (const it of ch.items) {
        f.at(it.x, it.z, it.rot || 0);
        if (it.k === 'patch') { patch(f, it); continue; }
        const b = BUILD[it.k];
        if (b) b(f, it);
      }
      if (f.count) {
        ch.mesh = new THREE.Mesh(f.geometry(), this.mat);
        ch.mesh.name = 'farm_' + ch.tier;
        ch.mesh.frustumCulled = true;
        this.zone.group.add(ch.mesh);
      }
      ch.built = true;
    }
    // every frame, with the camera's position: build what's come into reach (a few at a time, the
    // nearest first), show what's within sight of it, turn the wheels
    update(px, pz, dt) {
      const room = this.zone.roomAt(px, pz);
      // (indoors, nothing of this is drawn: you can't see it from in there)
      const hidden = !!(room && !room.exterior);
      if (this.city.walk.rows) this.city.walk.rows.visible = !hidden;
      let budget = this.warmed ? 1 : 64, t0 = performance.now();
      for (const tier of ['far', 'mid', 'near']) {
        const [, buildR, showR] = TIERS[tier];
        let want = null, wd = 1e9;
        for (const ch of this.chunks[tier].values()) {
          const d = Math.hypot(ch.cx - px, ch.cz - pz);
          if (!ch.built) { if (d < buildR && d < wd) { wd = d; want = ch; } continue; }
          if (ch.mesh) ch.mesh.visible = !hidden && d < showR;
        }
        if (want && budget > 0) { this.buildChunk(want); budget--; if (want.mesh) want.mesh.visible = !hidden && wd < TIERS[tier][2]; }
      }
      // (just arrived: everything in reach at once, so nothing pops in where you stand)
      if (!this.warmed) {
        for (const tier of ['far', 'mid', 'near']) for (const ch of this.chunks[tier].values()) if (!ch.built && Math.hypot(ch.cx - px, ch.cz - pz) < TIERS[tier][2] && performance.now() - t0 < 4000) { this.buildChunk(ch); if (ch.mesh) ch.mesh.visible = !hidden; }
        this.warmed = true;
      }
      if (this.last && Math.hypot(px - this.last[0], pz - this.last[1]) > 60) this.warmed = false;
      this.last = [px, pz];
      // the windpumps' wheels near you, turning in the wind
      this.spin = (this.spin || 0) + (dt || 0) * 1.6;
      let n = 0;
      if (!hidden) for (const [x, y, z, rot, ph] of this.rotors) {
        if (Math.abs(x - px) + Math.abs(z - pz) > 600) continue;
        this._e.set(0, rot, this.spin + ph);
        this._q.setFromEuler(this._e);
        this._p.set(x, y, z);
        this._m.compose(this._p, this._q, this._s);
        this.rotor.setMatrixAt(n++, this._m);
      }
      this.rotor.count = n;
      this.rotor.visible = n > 0;
      if (n) this.rotor.instanceMatrix.needsUpdate = true;
      this.hidden = hidden;
    }
    stats() {
      const out = { items: this.items, rotors: this.rotors.length, animals: this.animals.length, spots: this.spots.length };
      for (const t of ['far', 'mid', 'near']) { const l = [...this.chunks[t].values()]; out[t] = l.length; out[t + 'Built'] = l.filter((c) => c.built).length; }
      return out;
    }
    dispose() {
      for (const t of ['far', 'mid', 'near']) for (const ch of this.chunks[t].values()) if (ch.mesh) { ch.mesh.geometry.dispose(); if (ch.mesh.parent) ch.mesh.parent.remove(ch.mesh); }
      if (this.rotor) { this.rotor.geometry.dispose(); if (this.rotor.parent) this.rotor.parent.remove(this.rotor); }
      this.mat.dispose();
    }
  }
  // a patch of ground (gravel, trodden earth) under a lot's things
  function patch(f, it) {
    const [x0, z0, x1, z1] = it.q, y = it.y || (Math.hypot((x0 + x1) / 2 - DV.CityMap.centre[0], (z0 + z1) / 2 - DV.CityMap.centre[1]) > DV.CityMap.edge - 14 ? 0.15 : 0.02);
    f.at(0, 0, 0);
    f.flat(x0, z0, x1, z1, y, it.col || [0.6, 0.58, 0.54], it.band || 'gravel');
  }

  DV.Farms = {
    BANDS, bandV, FB,
    attach(zone, city) {
      const kit = new Kit(zone, city);
      zone.farms = kit;
      // the fire barrels' glow after dark (the street lamps' halos and pools)
      if (kit.fires.length) zone.lamps = (zone.lamps || []).concat(kit.fires);
      return kit;
    },
    // the atlas material's texture (the farm life's beasts share it)
    atlas,
  };
})();
