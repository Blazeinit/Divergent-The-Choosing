/* ==========================================================================
   DIVERGENT — the Circle Line: what a station and a train are made of
   Geometry only (js/game/metro.js runs them). Both are built once, baked
   (vertex light from their own lamps, PS2 style) and merged a material at a
   time, and both MOVE: on the platform the trains run in and out past you;
   aboard, the train holds still and the station (and the tunnel, lamp by
   lamp) slides past the windows instead, so you can walk the length of a
   train at forty miles an hour with ordinary collision.

   Layout, in the metro zone's coordinates (x along the tracks, +z south):
     track A (inner loop, trains heading +x)  z 0 .. 4.4    car centre z 2.75
     the island platform                      z 4.5 .. 13.5 x -50 .. 50
     track B (outer loop, trains heading -x)  z 13.6 .. 18  car centre z 15.25
     the ticket hall (gates at x -50, the stairs up at x -64)  x -64 .. -50
     the tunnels run on to x ±270, a lamp every 10 m
   Platform screen doors stand along both edges of the platform, a door
   opposite each door of a stopped train.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const K = {
    cars: 3, carL: 18, cplr: 0.6, // three cars, 18 m each, 0.6 m between
    outW: 1.4, inW: 1.25, // half widths: outside the body, inside the walls
    ceilY: 2.22, roofY: 2.5, bodyY0: -0.95,
    track: { A: { z: 2.75, dir: 1, side: 1 }, B: { z: 15.25, dir: -1, side: -1 } }, // side: which way the platform is from the car
    psd: { A: 4.38, B: 13.62 },
    plat: { x0: -50, x1: 50, z0: 4.5, z1: 13.5 },
    hall: { x0: -64, x1: -50 },
    bed: -1.15, // the track bed, under the platform's edge
    ceil: 4.6, tunH: 3.8, tunnel: 270, lampP: 10,
    bore: { A: [0, 4.42], B: [13.58, 18] },
    doorX: [-4.6, 4.6], doorW: 1.4, doorH: 1.95,
    gateX: -50,
    lanes: [5.6, 7.0, 8.4, 9.8, 11.2, 12.6], // ticket-gate lanes (z)
    benches: [-36, -12, 12, 36], columns: [-42, -30, -18, -6, 6, 18, 30, 42],
    stairs: { z0: 7.4, z1: 10.6, x: -64, steps: 22, rise: 4.3, run: 0.34, land: 2.6 },
  };
  // the stairs up to the street: the flight rises west from the hall's west wall to a landing at the top
  // (street level, 4.3 m up), where the daylight is. stairY is the slope you walk up (it meets the step
  // nosings); a step is solid under it
  K.stairs.foot = K.hall.x0 - 0.3;
  K.stairs.top = K.stairs.foot - K.stairs.steps * K.stairs.run;
  K.stairs.out = K.stairs.top - K.stairs.land; // (the doorway at the top: the street beyond)
  K.stairCeil = (x) => { const S = K.stairs, q = (K.hall.x0 - S.top) / 4; if (x >= K.hall.x0) return K.ceil; if (x <= S.top) return S.rise + 2.7; const k = Math.floor((K.hall.x0 - x) / q); return Math.max(K.ceil, K.stairY(K.hall.x0 - (k + 1) * q) + 2.7); };
  K.stairY = (x) => { const S = K.stairs, r = S.rise / S.steps; return Math.max(0, Math.min(S.rise, (S.foot - x) / S.run * r + r * 0.7)); };
  K.trainLen = K.cars * K.carL + (K.cars - 1) * K.cplr;
  K.half = K.trainLen / 2;
  K.carX = (k) => (k - (K.cars - 1) / 2) * (K.carL + K.cplr);
  K.doors = () => { const out = []; for (let k = 0; k < K.cars; k++) for (const d of K.doorX) out.push(K.carX(k) + d); return out; };
  // the seats along each wall, between the doors (car-local x ranges)
  K.seatRuns = [[-8.55, -5.55], [-3.65, 3.65], [5.55, 8.55]];
  K.SEAT_W = 0.62;

  /* ---------------- baked light from a list of lamps ---------------- */
  class Lit {
    constructor(ambient, fn) { this.ambient = ambient; this.lights = []; this.cells = new Map(); this.fn = fn || null; }
    add(x, y, z, range, c, i) {
      const l = { x, y, z, r: range, c, i: i === undefined ? 1 : i };
      this.lights.push(l);
      const c0 = Math.floor((x - range) / 8), c1 = Math.floor((x + range) / 8);
      for (let k = c0; k <= c1; k++) { let a = this.cells.get(k); if (!a) this.cells.set(k, (a = [])); a.push(l); }
      return l;
    }
    sample(px, py, pz, nx, ny, nz) {
      const a = this.fn ? this.fn(px, py, pz, nx, ny, nz) : this.ambient;
      let r = a[0], g = a[1], b = a[2];
      const list = this.cells.get(Math.floor(px / 8));
      if (list) for (const l of list) {
        const dx = l.x - px, dy = l.y - py, dz = l.z - pz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > l.r * l.r) continue;
        const d = Math.sqrt(d2) || 1;
        const lam = Math.max(0, (dx * nx + dy * ny + dz * nz) / d) * 0.75 + 0.25;
        const att = Math.pow(1 - d / l.r, 1.6) * l.i * lam;
        r += l.c[0] * att; g += l.c[1] * att; b += l.c[2] * att;
      }
      return [Math.min(r, 1.35), Math.min(g, 1.35), Math.min(b, 1.35)];
    }
  }

  const M = (k) => DV.Mat.get(k);
  function canvasTex(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = DV.Tex.aniso || 1;
    return { cv, ctx: cv.getContext('2d'), tex };
  }
  function flatMat(tex, opts) {
    const m = new THREE.MeshBasicMaterial(Object.assign({ map: tex, fog: true }, opts || {}));
    m.userData.baked = false;
    return m;
  }
  function bakedMat(texName, color) {
    const m = new THREE.MeshBasicMaterial({ map: DV.Tex.get(texName), vertexColors: true, fog: true, color: color || 0xffffff });
    m.userData.baked = true;
    return m;
  }

  /* ======================================================================
     the station (with its two tunnels, out to ±270 m)
     ====================================================================== */
  function buildStation(collide) {
    const L = new Lit([0.2, 0.2, 0.22], (px, py, pz) => {
      // the station box is lit; out in the tunnels it's dark between the lamps
      const inSt = px > K.hall.x0 - 12 && px < K.plat.x1 + 2;
      return inSt ? [0.3, 0.3, 0.31] : [0.07, 0.07, 0.08];
    });
    const WARM = [1, 0.95, 0.84], COOL = [0.92, 0.97, 1], TUN = [1, 0.86, 0.62];
    // lamps: two rows of fittings over the platform, a row over each track, the hall, the stairs, and the tunnels
    for (let x = K.plat.x0 + 2; x <= K.plat.x1 - 2; x += 4) { L.add(x, 4.0, 6.6, 7.5, COOL, 0.55); L.add(x, 4.0, 11.4, 7.5, COOL, 0.55); }
    for (let x = K.plat.x0 + 4; x <= K.plat.x1 - 4; x += 8) { L.add(x, 4.2, 1.2, 8, COOL, 0.45); L.add(x, 4.2, 16.8, 8, COOL, 0.45); }
    for (let x = K.hall.x0 + 2; x < K.hall.x1; x += 4) L.add(x, 3.8, 9, 7.5, WARM, 0.6);
    L.add(-70, 4.4, 9, 9, [1, 1, 0.95], 0.9); L.add(K.stairs.out + 0.8, 6.2, 9, 7, [1, 1, 0.96], 1.0); // daylight down the stairs, and at the top
    const lamps = [];
    for (let x = -K.tunnel + 5; x < K.tunnel; x += K.lampP) {
      if (x > K.plat.x0 - 2 && x < K.plat.x1 + 2) continue;
      L.add(x, 2.6, 0.5, 7, TUN, 0.75); L.add(x, 2.6, 17.5, 7, TUN, 0.75);
      lamps.push(x);
    }
    const B = new DV.StaticBatch(L);
    const tile = M('tile_white'), floor = M('terrazzo'), ceil = M('ceiling_concrete'), conc = M('concrete_dark'), concL = M('concrete'), metal = M('metal'), mdark = M('metal_dark'), glass = M('white:glass'), lamp = M('light_panel:emit');
    const accent = bakedMat('tile_white', 0x8a8478);
    const accentMetal = bakedMat('metal_painted', 0x8a8478);
    const T = K.tunnel;

    /* ---- the track beds and rails (the whole length) ---- */
    for (const key of ['A', 'B']) {
      const [z0, z1] = K.bore[key], tz = K.track[key].z;
      for (let x = -T; x < T; x += 30) {
        const x1 = Math.min(T, x + 30);
        B.quad(M('gravel'), [x, K.bed, z1], [x1, K.bed, z1], [x1, K.bed, z0], [x, K.bed, z0], [x / 3, -z1 / 3], [x1 / 3, -z1 / 3], [x1 / 3, -z0 / 3], [x / 3, -z0 / 3], { sub: 3 });
        B.quad(M('rail_track'), [x, K.bed + 0.02, tz + 1.0], [x1, K.bed + 0.02, tz + 1.0], [x1, K.bed + 0.02, tz - 1.0], [x, K.bed + 0.02, tz - 1.0], [0, x / 2], [0, x1 / 2], [1, x1 / 2], [1, x / 2], { sub: 3 });
        for (const s of [-0.72, 0.72]) B.box(metal, (x + x1) / 2, K.bed, tz + s, x1 - x, 0.16, 0.07);
        // the third rail, under its wooden cover, on the side away from the platform
        B.box(M('wood'), (x + x1) / 2, K.bed, tz - K.track[key].side * 1.25, x1 - x, 0.22, 0.12);
      }
    }

    /* ---- the station box (x -50 .. 50; the hall -64 .. -50) ---- */
    const X0 = K.plat.x0, X1 = K.plat.x1;
    // outer walls behind the tracks: dark at the bottom, tiled above, a band of the line's colour
    for (const [zw, face] of [[0, 1], [18, -1]]) {
      const zz = zw + (face > 0 ? -0.15 : 0.15);
      for (let x = X0; x < X1; x += 10) {
        B.box(conc, x + 5, K.bed, zz, 10, 0.3 - K.bed, 0.3, { sub: 1.2 });
        B.box(tile, x + 5, 0.3, zz, 10, 2.3, 0.3, { sub: 1.2 });
        B.box(accent, x + 5, 2.6, zz, 10, 0.32, 0.3, { sub: 1.2 });
        B.box(tile, x + 5, 2.92, zz, 10, K.ceil - 2.92, 0.3, { sub: 1.2 });
      }
    }
    // the platform: its slab and its edges dropping to the track bed
    for (let x = X0; x < X1; x += 10) {
      B.quad(floor, [x, 0, K.plat.z1], [x + 10, 0, K.plat.z1], [x + 10, 0, K.plat.z0], [x, 0, K.plat.z0], [x / 2, -K.plat.z1 / 2], [(x + 10) / 2, -K.plat.z1 / 2], [(x + 10) / 2, -K.plat.z0 / 2], [x / 2, -K.plat.z0 / 2], { sub: 1.5 });
      // the strip under the screen doors and the bumpy warning line before them
      B.flat(M('tactile'), x, K.plat.z0, x + 10, K.plat.z0 + 0.45, 0.004);
      B.flat(M('tactile'), x, K.plat.z1 - 0.45, x + 10, K.plat.z1, 0.004);
      B.box(conc, x + 5, K.bed, K.psd.A - 0.06, 10, -K.bed, 0.26);
      B.box(conc, x + 5, K.bed, K.psd.B + 0.06, 10, -K.bed, 0.26);
    }
    // the ceiling over the whole box, with deep beams every 6 m and the light fittings
    for (let x = K.hall.x0; x < X1; x += 6) {
      const x1 = Math.min(X1, x + 6);
      B.quad(ceil, [x, K.ceil, 0], [x1, K.ceil, 0], [x1, K.ceil, 18], [x, K.ceil, 18], [x / 3, 0], [x1 / 3, 0], [x1 / 3, 6], [x / 3, 6], { sub: 2 });
      B.box(concL, x, K.ceil - 0.45, 9, 0.35, 0.45, 18);
    }
    for (let x = X0 + 1; x < X1 - 1; x += 8) for (const z of [6.6, 11.4]) {
      B.box(mdark, x + 3, 4.05, z, 6.4, 0.08, 0.32);
      B.box(lamp, x + 3, 4.0, z, 6.2, 0.05, 0.22);
    }
    for (let x = X0 + 4; x < X1 - 4; x += 8) for (const z of [1.2, 16.8]) B.box(lamp, x, 4.25, z, 1.6, 0.06, 0.2);
    // the east end: a wall across the platform, a service door in it
    B.box(tile, X1 + 0.15, 0, 9, 0.3, K.ceil, 9.4, { sub: 1.2 });
    B.box(accent, X1 + 0.0, 2.6, 9, 0.02, 0.32, 9.4);
    B.box(mdark, X1 - 0.02, 0, 11.2, 0.06, 2.1, 1.0);
    // above each tunnel mouth: wall from the tunnel's crown up to the ceiling
    for (const xe of [X0, X1]) for (const key of ['A', 'B']) {
      const [z0, z1] = K.bore[key];
      B.box(tile, xe + (xe > 0 ? 0.15 : -0.15), K.tunH, (z0 + z1) / 2, 0.3, K.ceil - K.tunH, z1 - z0);
    }
    // the columns down the middle, tiled, with the band of colour
    for (const x of K.columns) {
      B.box(tile, x, 0, 9, 0.62, 2.6, 0.62);
      B.box(accent, x, 2.6, 9, 0.64, 0.32, 0.64);
      B.box(tile, x, 2.92, 9, 0.62, K.ceil - 2.92, 0.62);
      collide(x - 0.31, 8.69, x + 0.31, 9.31, { y1: K.ceil, tag: 'st' });
    }
    // benches between the columns, back to back
    const seats = [];
    for (const x of K.benches) {
      B.box(mdark, x, 0, 9, 2.6, 0.06, 0.1);
      for (const s of [-1, 1]) {
        B.box(mdark, x - 1.1, 0, 9 + s * 0.3, 0.06, 0.42, 0.5); B.box(mdark, x + 1.1, 0, 9 + s * 0.3, 0.06, 0.42, 0.5);
        B.box(M('wood'), x, 0.42, 9 + s * 0.32, 2.5, 0.05, 0.46);
        B.box(M('wood'), x, 0.55, 9 + s * 0.07, 2.5, 0.42, 0.05);
        for (let k = 0; k < 3; k++) seats.push({ x: x - 0.8 + k * 0.8, z: 9 + s * 0.36, rot: s > 0 ? 0 : Math.PI, act: 'sit', seatY: 0.45, ax: x - 0.8 + k * 0.8, az: 9 + s * 1.05 });
      }
      collide(x - 1.3, 8.45, x + 1.3, 9.55, { y1: 0.95, camera: false, tag: 'st' });
    }

    /* ---- the platform screen doors ---- */
    const doorsX = K.doors();
    const psdPanels = (zl, key) => {
      // posts, glass panes and the header, with a gap at every door
      const edges = [X0];
      for (const dx of doorsX) edges.push(dx - 0.8, dx + 0.8);
      edges.push(X1);
      for (let i = 0; i < edges.length; i += 2) {
        const a = edges[i], b = edges[i + 1];
        if (b - a < 0.05) continue;
        for (let x = a; x < b - 0.01; x += 1.8) {
          const x1 = Math.min(b, x + 1.8);
          B.box(glass, (x + x1) / 2, 0.06, zl, x1 - x, 2.1, 0.03);
          B.box(metal, x1 - 0.03, 0, zl, 0.06, 2.6, 0.08);
        }
        B.box(metal, a + 0.03, 0, zl, 0.06, 2.6, 0.08);
        collide(a, zl - 0.06, b, zl + 0.06, { y1: 2.6, tag: 'st' });
      }
      // the header along the whole run: the line's colour, door numbers over the doors
      B.box(accentMetal, 0, 2.2, zl, X1 - X0, 0.42, 0.16);
      B.box(mdark, 0, 0, zl, X1 - X0, 0.06, 0.2);
      void key;
    };
    psdPanels(K.psd.A, 'A');
    psdPanels(K.psd.B, 'B');

    /* ---- the ticket hall, the gates and the stairs up ---- */
    const HX0 = K.hall.x0;
    for (let x = HX0; x < X0; x += 7) {
      B.quad(floor, [x, 0, 13.5], [x + 7, 0, 13.5], [x + 7, 0, 4.5], [x, 0, 4.5], [x / 2, -13.5 / 2], [(x + 7) / 2, -13.5 / 2], [(x + 7) / 2, -4.5 / 2], [x / 2, -4.5 / 2], { sub: 1.5 });
    }
    // the hall's side walls (with the tunnels on their far side)
    for (const [zw, s] of [[K.bore.A[1], 1], [K.bore.B[0], -1]]) {
      B.box(tile, (HX0 + X0) / 2, 0, zw + s * 0.06, X0 - HX0, 2.6, 0.2, { sub: 1.2 });
      B.box(accent, (HX0 + X0) / 2, 2.6, zw + s * 0.06, X0 - HX0, 0.32, 0.2);
      B.box(tile, (HX0 + X0) / 2, 2.92, zw + s * 0.06, X0 - HX0, K.ceil - 2.92, 0.2);
      // (and from the bed up on the track side, under the hall floor)
      B.box(conc, (HX0 + X0) / 2, K.bed, zw + s * 0.06, X0 - HX0, -K.bed, 0.2);
      collide(HX0, s > 0 ? zw - 0.1 : zw - 0.16, X0, s > 0 ? zw + 0.16 : zw + 0.1, { y1: K.ceil, tag: 'st' });
    }
    // the west wall, with the stairs up in the middle of it
    const S = K.stairs;
    B.box(tile, HX0 - 0.15, 0, (K.bore.A[1] + S.z0) / 2, 0.3, K.ceil, S.z0 - K.bore.A[1]);
    B.box(tile, HX0 - 0.15, 0, (S.z1 + K.bore.B[0]) / 2, 0.3, K.ceil, K.bore.B[0] - S.z1);
    collide(HX0 - 0.3, 4.4, HX0, S.z0, { y1: K.ceil, tag: 'st' });
    collide(HX0 - 0.3, S.z1, HX0, 13.6, { y1: K.ceil, tag: 'st' });
    // the flight: 22 steps up to the light, a nosing on each, a landing at the top
    const steps = S.steps, rise = S.rise / steps, run = S.run, top = S.top, out = S.out, zc = (S.z0 + S.z1) / 2, sw = S.z1 - S.z0;
    for (let k = 0; k < steps; k++) {
      B.box(concL, S.foot - k * run - run / 2, 0, zc, run, rise * (k + 1), sw);
      B.box(metal, S.foot - k * run - 0.03, rise * (k + 1) - 0.02, zc, 0.06, 0.03, sw - 0.1);
    }
    B.box(floor, (top + out) / 2, 0, zc, top - out, S.rise, sw);
    for (const z of [S.z0, S.z1]) {
      const sg = z === S.z0 ? -1 : 1;
      B.box(tile, (HX0 + out) / 2, 0, z + sg * 0.1, HX0 - out + 0.3, S.rise + 2.9, 0.2);
      B.box(accent, (HX0 + out) / 2, S.rise + 2.6, z + sg * 0.1 - sg * 0.004, HX0 - out + 0.3, 0.3, 0.2);
      // the handrails, on brackets, following the flight (and level along the landing)
      const n = 6;
      for (let k = 0; k < n; k++) {
        const x0 = S.foot - (k / n) * (S.foot - top), x1 = S.foot - ((k + 1) / n) * (S.foot - top);
        const y0 = K.stairY(x0) + 0.95, y1 = K.stairY(x1) + 0.95, zr = z - sg * 0.08, r = 0.025, len = Math.hypot(x1 - x0, y1 - y0);
        for (const [a0, b0, a1, b1] of [[r, -r, r, r], [r, r, -r, r], [-r, r, -r, -r], [-r, -r, r, -r]]) {
          const P = [[x0, y0 + a0, zr + b0], [x1, y1 + a0, zr + b0], [x1, y1 + a1, zr + b1], [x0, y0 + a1, zr + b1]];
          B.quad(metal, P[0], P[1], P[2], P[3], [0, 0], [len, 0], [len, 0.1], [0, 0.1]);
          B.quad(metal, P[3], P[2], P[1], P[0], [0, 0.1], [len, 0.1], [len, 0], [0, 0]);
        }
        B.box(metal, x0, y0 - 0.12, z - sg * 0.04, 0.03, 0.12, 0.08);
      }
      B.pipeX(metal, (top + out) / 2, S.rise + 0.95, z - sg * 0.08, top - out, 0.03, 5);
      // (the walls of the stairway: for the camera too)
      collide(out - 0.3, sg < 0 ? z - 0.3 : z, S.foot, sg < 0 ? z : z + 0.3, { y1: S.rise + 3, tag: 'st' });
    }
    // the ceiling: stepped up the flight, level over the landing
    for (let k = 0; k < 4; k++) {
      const x0 = HX0 - k * (HX0 - top) / 4, x1 = HX0 - (k + 1) * (HX0 - top) / 4, y = K.stairCeil((x0 + x1) / 2), yn = k < 3 ? K.stairCeil(x1 - 0.1) : S.rise + 2.7;
      B.box(ceil, (x0 + x1) / 2, y, zc, x0 - x1 + 0.02, 0.2, sw);
      if (yn > y) B.box(ceil, x1, y, zc, 0.1, yn - y + 0.2, sw); // (the step up to the next)
    }
    B.box(ceil, (top + out) / 2, S.rise + 2.7, zc, top - out, 0.2, sw);
    for (const x of [top + 1.2, top - 1.3, (HX0 + top) / 2]) B.box(lamp, x, K.stairCeil(x) - 0.03, zc, 0.9, 0.04, 0.3);
    // and the street at the top: daylight in a doorway, the frame round it, a sign over it
    B.box(M('white:emit'), out - 0.05, S.rise, zc, 0.1, 2.6, sw);
    B.box(mdark, out + 0.06, S.rise + 2.5, zc, 0.12, 0.2, sw);
    collide(out - 0.3, S.z0 - 0.3, out, S.z1 + 0.3, { y1: S.rise + 3, tag: 'st' });
    // the gates: cabinets between the lanes (the flaps are separate: they open)
    const cab = M('metal_painted');
    const cabZ = [4.9, 6.3, 7.7, 9.1, 10.5, 11.9, 13.1];
    for (const z of cabZ) {
      B.box(cab, K.gateX, 0, z, 1.5, 1.0, 0.36);
      B.box(M('crt_green:emit'), K.gateX - 0.55, 1.0, z, 0.12, 0.02, 0.16);
      collide(K.gateX - 0.75, z - 0.18, K.gateX + 0.75, z + 0.18, { y1: 1.0, camera: false, tag: 'st' });
    }
    // ticket machines and the Order's notice on the south wall, a booth on the north
    for (const x of [-61.5, -59.5]) {
      B.box(M('metal_painted'), x, 0, 13.15, 1.0, 1.8, 0.5);
      B.box(M('crt_blue:emit'), x, 1.1, 12.89, 0.5, 0.36, 0.02);
      collide(x - 0.5, 12.9, x + 0.5, 13.5, { y1: 1.8, tag: 'st' });
    }
    B.box(M('glass_dark'), -60, 0, 4.85, 4.2, 2.4, 0.7);
    B.box(mdark, -60, 2.4, 4.85, 4.3, 0.2, 0.8);
    collide(-62.1, 4.4, -57.9, 5.2, { y1: 2.6, tag: 'st' });

    /* ---- the tunnels: x beyond the station box, each track in its own bore ---- */
    for (const key of ['A', 'B']) {
      const [z0, z1] = K.bore[key], side = K.track[key].side;
      const outer = side > 0 ? z0 : z1, inner = side > 0 ? z1 : z0; // (the wall away from the platform, and the wall between the bores)
      const segs = [[-T, X0], [X1, T]];
      for (const [a, b] of segs) {
        for (let x = a; x < b; x += 10) {
          const x1 = Math.min(b, x + 10);
          for (const zw of [outer, inner]) {
            const zz = zw + (zw === Math.min(z0, z1) ? -0.15 : 0.15);
            B.box(conc, (x + x1) / 2, K.bed, zz, x1 - x, K.tunH - K.bed, 0.3, { sub: 2.2 });
          }
          B.box(conc, (x + x1) / 2, K.tunH, (z0 + z1) / 2, x1 - x, 0.3, z1 - z0 + 0.6, { sub: 2.2 });
          // ribs every 5 m, a cable tray along the outer wall
          for (let r = x; r < x1; r += 5) B.box(concL, r, K.tunH - 0.3, (z0 + z1) / 2, 0.3, 0.3, z1 - z0);
          B.pipeX(mdark, (x + x1) / 2, 2.95, outer + (side > 0 ? 0.12 : -0.12), x1 - x, 0.05, 4);
          B.pipeX(mdark, (x + x1) / 2, 3.15, outer + (side > 0 ? 0.12 : -0.12), x1 - x, 0.04, 4);
        }
      }
    }
    // the tunnel lamps, each in a cage on the outer wall
    for (const x of lamps) {
      B.box(M('plastic_orange:emit'), x, 2.52, 0.08, 0.32, 0.16, 0.12);
      B.box(M('plastic_orange:emit'), x, 2.52, 17.92, 0.32, 0.16, 0.12);
    }
    // signals at the platform ends
    for (const [x, z] of [[X1 + 8, 0.2], [X0 - 8, 17.8]]) {
      B.box(mdark, x, 1.6, z, 0.3, 0.8, 0.2);
      B.box(M('crt_green:emit'), x, 2.1, z + (z < 9 ? 0.11 : -0.11), 0.14, 0.14, 0.02);
    }

    const group = B.build();
    group.name = 'metro_station';
    group.matrixAutoUpdate = true;

    /* ---- signs that change with the station (unbaked: canvas) ---- */
    const name = canvasTex(512, 96);
    const nameMat = flatMat(name.tex);
    const board = canvasTex(512, 160);
    const boardMat = flatMat(board.tex);
    const way = canvasTex(512, 64);
    const wayMat = flatMat(way.tex);
    const SB = new DV.StaticBatch(null);
    // the station's name on the walls across each track, every 12.5 m (and on the columns)
    for (let x = X0 + 6; x < X1 - 3; x += 12.5) {
      SB.push(x, 1.75, 0.01, 0); SB.panel(nameMat, 0, 0, 0, 3.4, 0.64); SB.pop();
      SB.push(x, 1.75, 17.99, Math.PI); SB.panel(nameMat, 0, 0, 0, 3.4, 0.64); SB.pop();
    }
    for (const x of [K.columns[1], K.columns[3], K.columns[4], K.columns[6]]) for (const s of [-1, 1]) {
      SB.push(x, 1.9, 9 + s * 0.32, s > 0 ? 0 : Math.PI); SB.panel(nameMat, 0, 0, 0, 0.6, 0.6 * 96 / 512); SB.pop();
    }
    // the departure boards, hanging over the platform, two-sided
    for (const x of [-24, 0, 24]) {
      SB.push(x, 3.35, 9, 0); SB.panel(boardMat, 0, 0, 0.06, 2.4, 0.75); SB.pop();
      SB.push(x, 3.35, 9, Math.PI); SB.panel(boardMat, 0, 0, 0.06, 2.4, 0.75); SB.pop();
    }
    // wayfinding: over the gates, facing the platform, and over the stairs
    SB.push(K.gateX + 0.4, 2.7, 9, Math.PI / 2); SB.panel(wayMat, 0, 0, 0, 5.2, 0.65); SB.pop();
    SB.push(HX0 + 0.05, 3.1, 9, Math.PI / 2); SB.panel(wayMat, 0, 0, 0, 3.0, 0.38); SB.pop();
    const signs = SB.build();
    for (const m of signs.children) m.matrixAutoUpdate = false;
    group.add(signs);
    // the hanging rods for the boards
    const rods = new DV.StaticBatch(L);
    for (const x of [-24, 0, 24]) for (const s of [-1, 1]) rods.box(mdark, x + s * 1.0, 3.72, 9, 0.04, K.ceil - 3.72, 0.04);
    // CCTV: one over each end of the platform, one over the gates (the Office of Public Order watches the trains)
    for (const [x, z, r] of [[X0 + 3, 9, 0], [X1 - 3, 9, Math.PI], [K.gateX - 4, 6, Math.PI / 2]]) {
      rods.push(x, K.ceil - 0.5, z, r);
      rods.box(mdark, 0, 0.1, 0, 0.06, 0.4, 0.06); rods.box(M('plastic'), 0.1, 0, 0, 0.3, 0.14, 0.14); rods.box(M('crt_green:emit'), 0.26, 0.05, 0, 0.01, 0.04, 0.04);
      rods.pop();
    }
    const rg = rods.build();
    for (const m of rg.children) group.add(m);

    // the screen doors and the gate flaps: instanced (they slide; one draw call each)
    const psdGeo = new THREE.BoxGeometry(0.8, 2.08, 0.03);
    psdGeo.translate(0, 1.1, 0);
    const psdMat = new THREE.MeshBasicMaterial({ color: 0xbfd2d8, transparent: true, opacity: 0.32, depthWrite: false, fog: true, side: THREE.DoubleSide });
    const psd = new THREE.InstancedMesh(psdGeo, psdMat, doorsX.length * 4);
    psd.renderOrder = 6;
    psd.frustumCulled = false;
    group.add(psd);
    const flapGeo = new THREE.BoxGeometry(0.03, 0.75, 0.42);
    flapGeo.translate(0, 0.6, 0);
    const flapMat = new THREE.MeshBasicMaterial({ color: 0xc8d4d8, transparent: true, opacity: 0.45, depthWrite: false, fog: true });
    const flaps = new THREE.InstancedMesh(flapGeo, flapMat, K.lanes.length * 2);
    flaps.renderOrder = 6;
    flaps.frustumCulled = false;
    group.add(flaps);
    const _m = new THREE.Matrix4();
    const st = {
      group, seats, accent, accentMetal, name, board, way, doorsX, psd, flaps,
      // k 0..1 per track: the screen doors' opening
      setPSD(key, k) {
        const zl = K.psd[key], i0 = key === 'A' ? 0 : doorsX.length * 2;
        doorsX.forEach((dx, i) => {
          _m.makeTranslation(dx - 0.4 - k * 0.78, 0, zl); psd.setMatrixAt(i0 + i * 2, _m);
          _m.makeTranslation(dx + 0.4 + k * 0.78, 0, zl); psd.setMatrixAt(i0 + i * 2 + 1, _m);
        });
        psd.instanceMatrix.needsUpdate = true;
      },
      // the gate flaps: open[i] 0..1 per lane
      setFlaps(open) {
        K.lanes.forEach((z, i) => {
          const k = open[i] || 0;
          _m.makeRotationY(k * Math.PI / 2).setPosition(K.gateX, 0, z - 0.22 - k * 0.04); flaps.setMatrixAt(i * 2, _m);
          _m.makeRotationY(-k * Math.PI / 2).setPosition(K.gateX, 0, z + 0.22 + k * 0.04); flaps.setMatrixAt(i * 2 + 1, _m);
        });
        flaps.instanceMatrix.needsUpdate = true;
      },
    };
    st.setPSD('A', 0); st.setPSD('B', 0);
    st.setFlaps([]);
    return st;
  }

  /* ======================================================================
     a train: three cars, walk-through, seats along the walls
     (built at the origin, heading +x; the metro places it on its track)
     ====================================================================== */
  function buildTrain(key, colour) {
    const side = K.track[key].side; // +1: the doors that open are on the +z side
    const W = K.outW, I = K.inW;
    const L = new Lit([0.5, 0.5, 0.52], (px, py, pz, nx, ny, nz) => {
      // inside: bright and even under the light strips; outside: the dull shine of painted metal
      if (Math.abs(pz) < I + 0.02 && py < K.ceilY + 0.01 && py > -0.01) {
        const up = 0.86 + 0.14 * U.clamp(py / K.ceilY, 0, 1);
        return [0.86 * up, 0.87 * up, 0.9 * up];
      }
      const k = 0.52 + 0.18 * Math.max(0, ny) + 0.06 * Math.abs(nz);
      return [k, k, k * 1.03];
    });
    const B = new DV.StaticBatch(L);
    const body = M('metal_painted'), wall = M('paint_white'), mdark = M('metal_dark'), metal = M('metal'), glass = M('white:glass'), lamp = M('light_panel:emit');
    const floor = M('terrazzo');
    const seatM = bakedMat('fabric_blue', 0xffffff), stripe = bakedMat('white', colour || 0xc0582a);
    const seats = [], holds = [], doors = [];
    const doorTop = K.doorH;
    for (let k = 0; k < K.cars; k++) {
      const cx = K.carX(k), x0 = cx - K.carL / 2, x1 = cx + K.carL / 2;
      // floor, underframe, bogies
      B.box(floor, cx, -0.12, 0, K.carL, 0.12, I * 2);
      B.box(mdark, cx, K.bodyY0, 0, K.carL - 0.2, -K.bodyY0 - 0.12, W * 2 - 0.1);
      for (const bx of [x0 + 2.6, x1 - 2.6]) {
        B.box(M('black'), bx, K.bodyY0 - 0.2, 0, 2.4, 0.5, W * 2 - 0.5);
        for (const wx of [-0.8, 0.8]) for (const wz of [-0.72, 0.72]) { B.push(bx + wx, K.bodyY0 - 0.2, wz, 0); B.box(mdark, 0, 0, 0, 0.7, 0.42, 0.12); B.pop(); }
      }
      // roof, ceiling, light strips
      B.box(mdark, cx, K.ceilY, 0, K.carL, K.roofY - K.ceilY, W * 2, { faces: { bottom: wall } });
      B.box(metal, cx, K.roofY, 0, K.carL - 0.6, 0.1, W * 2 - 0.5);
      for (const lz of [-0.55, 0.55]) B.box(lamp, cx, K.ceilY - 0.04, lz, K.carL - 1.2, 0.04, 0.2);
      // the sides: lower panel, window band (piers and glass), the band over the windows; door gaps both sides
      for (const s of [-1, 1]) {
        const zo = s * (W + I) / 2, th = W - I;
        const faces = s > 0 ? { pz: body, nz: wall, top: wall, bottom: body, px: body, nx: body } : { nz: body, pz: wall, top: wall, bottom: body, px: body, nx: body };
        const gaps = K.doorX.map((d) => [cx + d - K.doorW / 2, cx + d + K.doorW / 2]);
        const runs = [[x0, gaps[0][0]], [gaps[0][1], gaps[1][0]], [gaps[1][1], x1]];
        for (const [a, b] of runs) {
          B.box(body, (a + b) / 2, 0, zo, b - a, 0.95, th, { faces });
          B.box(body, (a + b) / 2, 1.85, zo, b - a, K.ceilY - 1.85, th, { faces });
          // windows: piers at the ends, glass between
          const n = Math.max(1, Math.round((b - a) / 3.4));
          for (let w = 0; w <= n; w++) {
            const px = a + ((b - a) * w) / n;
            B.box(body, U.clamp(px, a + 0.15, b - 0.15), 0.95, zo, 0.3, 0.9, th, { faces });
          }
          B.box(glass, (a + b) / 2, 0.95, zo, b - a - 0.2, 0.9, 0.02);
          // the line's stripe along the outside, under the windows
          B.box(stripe, (a + b) / 2, 0.78, s * (W + 0.005), b - a, 0.1, 0.01);
        }
        // over each doorway
        for (const [a, b] of gaps) B.box(body, (a + b) / 2, doorTop, zo, b - a, K.ceilY - doorTop, th, { faces });
        // the doors that stay shut (the side away from the platform): panels with windows, a seam
        if (s !== side) for (const [a, b] of gaps) {
          B.box(body, (a + b) / 2, 0, zo, b - a, 0.95, th * 0.6, { faces });
          B.box(glass, (a + b) / 2, 0.95, zo, b - a, 0.9, 0.02);
          B.box(body, (a + b) / 2, 1.85, zo, b - a, doorTop - 1.85, th * 0.6, { faces });
          B.box(mdark, (a + b) / 2, 0, zo + s * 0.01, 0.02, doorTop, th * 0.7);
        }
        // seats along the wall, between the doors
        for (const [ra, rb] of K.seatRuns) {
          const a = cx + ra, b = cx + rb, zs = s * (I - 0.23);
          B.box(mdark, (a + b) / 2, 0, zs, b - a, 0.38, 0.42);
          B.box(seatM, (a + b) / 2, 0.38, zs - s * 0.01, b - a, 0.08, 0.46);
          B.box(seatM, (a + b) / 2, 0.46, s * (I - 0.05), b - a, 0.5, 0.08);
          // glass screens at the ends of each run, by the doors
          for (const e of [a, b]) if (Math.abs(e - x0) > 0.5 && Math.abs(e - x1) > 0.5) {
            B.box(metal, e, 0, s * (I - 0.3), 0.03, 1.15, 0.6);
            B.box(glass, e, 0.4, s * (I - 0.3), 0.02, 0.7, 0.55);
          }
          const n = Math.floor((b - a) / K.SEAT_W);
          for (let i = 0; i < n; i++) {
            const sx = a + (b - a) * ((i + 0.5) / n);
            seats.push({ x: sx, z: s * (I - 0.26), rot: s > 0 ? Math.PI : 0, act: 'sit', seatY: 0.46, ax: sx, az: s * (I - 0.95), car: k, side: s });
          }
        }
        // the grab rail over the seats, with straps
        B.pipeX(metal, cx, 1.92, s * 0.5, K.carL - 1.0, 0.018, 5);
        for (let x = x0 + 1.2; x < x1 - 1.0; x += 0.55) { B.box(M('plastic'), x, 1.66, s * 0.5, 0.02, 0.26, 0.02); B.box(M('plastic'), x, 1.62, s * 0.5, 0.09, 0.05, 0.02); }
        // standing places along the aisle (hold the rail overhead)
        for (const hx of [-2.6, -1.3, 0, 1.3, 2.6]) holds.push({ x: cx + hx, z: s * 0.36, rot: s > 0 ? 0 : Math.PI, act: 'hang', seatY: 0, car: k });
      }
      // poles in each door vestibule, floor to ceiling
      for (const d of K.doorX) {
        B.cyl(metal, cx + d, 0, 0, 0.022, 0.022, K.ceilY, 6, { noTop: true });
        holds.push({ x: cx + d - 0.32, z: 0, rot: Math.PI / 2, act: 'hang', seatY: 0, car: k, pole: true });
        holds.push({ x: cx + d + 0.32, z: 0, rot: -Math.PI / 2, act: 'hang', seatY: 0, car: k, pole: true });
        doors.push(cx + d);
      }
      // the car ends: walls with a walk-through opening to the next car
      for (const [ex, sgn] of [[x0, -1], [x1, 1]]) {
        const outerEnd = (k === 0 && sgn < 0) || (k === K.cars - 1 && sgn > 0);
        const wx = ex - sgn * 0.06;
        if (outerEnd) continue;
        B.box(wall, wx, 0, -(I + 0.55) / 2, 0.12, K.ceilY, I - 0.55);
        B.box(wall, wx, 0, (I + 0.55) / 2, 0.12, K.ceilY, I - 0.55);
        B.box(wall, wx, 1.95, 0, 0.12, K.ceilY - 1.95, 1.1);
        // the gangway between the cars
        if (sgn > 0) {
          B.box(floor, ex + K.cplr / 2, -0.1, 0, K.cplr + 0.1, 0.1, 1.1);
          for (const gz of [-0.58, 0.58]) B.box(M('black'), ex + K.cplr / 2, 0, gz, K.cplr + 0.1, 2.0, 0.06);
          B.box(M('black'), ex + K.cplr / 2, 1.98, 0, K.cplr + 0.1, 0.06, 1.2);
        }
      }
    }
    // the cabs at the two ends: a bulkhead with a door, the front with its windscreen and lamps
    const half = K.half, cabD = 1.3;
    for (const sgn of [-1, 1]) {
      const bx = sgn * (half - cabD);
      B.box(wall, bx, 0, -0.72, 0.1, K.ceilY, 1.06, { });
      B.box(wall, bx, 0, 0.72, 0.1, K.ceilY, 1.06, { });
      B.box(mdark, bx, 0, 0, 0.08, 1.95, 0.38);
      B.box(wall, bx, 1.95, 0, 0.1, K.ceilY - 1.95, 0.4);
      // the cab (you never go in: dark glass over a desk)
      B.box(body, sgn * (half - 0.05), K.bodyY0, 0, 0.1, 1.95 - K.bodyY0, W * 2);
      B.box(M('glass_dark'), sgn * (half - 0.03), 1.0, 0, 0.06, 0.95, W * 2 - 0.5);
      B.box(body, sgn * (half - 0.05), 1.95, 0, 0.1, K.roofY - 1.95, W * 2);
      const front = sgn === K.track[key].dir;
      for (const lz of [-0.95, 0.95]) B.box(M(front ? 'light_panel:emit' : 'mat_red'), sgn * (half + 0.0), 0.35, lz, 0.04, 0.16, 0.3);
      B.box(stripe, sgn * (half + 0.0), 0.72, 0, 0.03, 0.12, W * 2 - 0.1);
    }
    const group = B.build();
    group.name = 'metro_train_' + key;
    group.matrixAutoUpdate = true;
    // the destination board on each front, and the next-station display at each car end (canvas)
    const disp = canvasTex(256, 48);
    const dispMat = flatMat(disp.tex);
    const map = canvasTex(1024, 64);
    const mapMat = flatMat(map.tex);
    const SB = new DV.StaticBatch(null);
    for (const sgn of [-1, 1]) { SB.push(sgn * (half + 0.03), 2.12, 0, sgn > 0 ? Math.PI / 2 : -Math.PI / 2); SB.panel(dispMat, 0, 0, 0, 1.4, 0.26); SB.pop(); }
    for (let k = 0; k < K.cars; k++) {
      const cx = K.carX(k);
      for (const sgn of [-1, 1]) {
        const ex = sgn * (K.carL / 2 - 0.13) + cx;
        const atCab = (k === 0 && sgn < 0) || (k === K.cars - 1 && sgn > 0);
        const xx = atCab ? sgn * (half - cabD - 0.06) : ex;
        SB.push(xx, 2.06, 0, sgn > 0 ? -Math.PI / 2 : Math.PI / 2); SB.panel(dispMat, 0, 0, 0, 0.9, 0.17); SB.pop();
      }
      // the route map over the windows, each side, each run of seats
      for (const s of [-1, 1]) for (const [ra, rb] of K.seatRuns) {
        if (rb - ra < 5) continue;
        SB.push(cx + (ra + rb) / 2, 2.0, s * (I - 0.01), s > 0 ? Math.PI : 0); SB.panel(mapMat, 0, 0, 0, rb - ra - 0.4, 0.22); SB.pop();
      }
    }
    const extra = SB.build();
    for (const m of extra.children) group.add(m);
    // the doors that open: two leaves per doorway, instanced
    const leafGeo = new THREE.BoxGeometry(K.doorW / 2, K.doorH, W - I);
    leafGeo.translate(0, K.doorH / 2, 0);
    const lc = canvasTex(64, 128);
    { const c = lc.ctx; c.fillStyle = '#9a9c9c'; c.fillRect(0, 0, 64, 128); c.fillStyle = '#2a3034'; c.fillRect(10, 22, 44, 48); c.fillStyle = '#bcc0c0'; c.fillRect(0, 0, 64, 4); c.fillStyle = '#c0582a'; c.fillRect(0, 84, 64, 6); lc.tex.needsUpdate = true; }
    const leafMat = new THREE.MeshBasicMaterial({ map: lc.tex, color: 0xb8b8b8, fog: true });
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, doors.length * 2);
    leaves.frustumCulled = false;
    group.add(leaves);
    const _m = new THREE.Matrix4();
    const zd = side * (W + I) / 2;
    const T = {
      key, group, seats, holds, doors, disp, map, leaves,
      setDoors(k) {
        doors.forEach((dx, i) => {
          _m.makeTranslation(dx - K.doorW / 4 - k * (K.doorW / 2 - 0.04), 0, zd); leaves.setMatrixAt(i * 2, _m);
          _m.makeTranslation(dx + K.doorW / 4 + k * (K.doorW / 2 - 0.04), 0, zd); leaves.setMatrixAt(i * 2 + 1, _m);
        });
        leaves.instanceMatrix.needsUpdate = true;
      },
      // the colliders, in the train's own frame (the metro adds the track's z and the berth)
      boxes() {
        const out = [];
        const dz = side * (W + I) / 2;
        // the wall with the doors in it, and the shut side
        const edges = [-half + cabD];
        for (const dx of doors) edges.push(dx - K.doorW / 2, dx + K.doorW / 2);
        edges.push(half - cabD);
        for (let i = 0; i < edges.length; i += 2) out.push({ x0: edges[i], z0: dz - 0.09, x1: edges[i + 1], z1: dz + 0.09, y1: K.ceilY, tag: 'wall' });
        out.push({ x0: -half + cabD, z0: -side * W - 0.02, x1: half - cabD, z1: -side * I, y1: K.ceilY, tag: 'wall', flip: true });
        for (const dx of doors) out.push({ x0: dx - K.doorW / 2, z0: dz - 0.09, x1: dx + K.doorW / 2, z1: dz + 0.09, y1: K.ceilY, tag: 'door', door: dx });
        // the cab bulkheads
        for (const sgn of [-1, 1]) out.push({ x0: sgn * (half - cabD) - 0.08, z0: -W, x1: sgn * (half - cabD) + 0.08, z1: W, y1: K.ceilY, tag: 'wall' });
        // the car ends between cars (the gangway open)
        for (let k = 0; k < K.cars - 1; k++) {
          const ex = K.carX(k) + K.carL / 2 + K.cplr / 2;
          out.push({ x0: ex - K.cplr / 2 - 0.15, z0: -W, x1: ex + K.cplr / 2 + 0.15, z1: -0.55, y1: K.ceilY, tag: 'wall' });
          out.push({ x0: ex - K.cplr / 2 - 0.15, z0: 0.55, x1: ex + K.cplr / 2 + 0.15, z1: W, y1: K.ceilY, tag: 'wall' });
        }
        // seats (you sit on them with E; otherwise they're in the way) and the poles
        for (let k = 0; k < K.cars; k++) for (const s of [-1, 1]) for (const [ra, rb] of K.seatRuns) {
          const cx = K.carX(k);
          out.push({ x0: cx + ra, z0: s > 0 ? I - 0.47 : -I, x1: cx + rb, z1: s > 0 ? I : -I + 0.47, y1: 0.5, camera: false, tag: 'seat' });
        }
        for (const dx of doors) out.push({ x0: dx - 0.05, z0: -0.05, x1: dx + 0.05, z1: 0.05, y1: K.ceilY, camera: false, tag: 'pole' });
        return out;
      },
    };
    T.setDoors(0);
    return T;
  }

  /* ---------------- the street entrances (on building fronts) ---------------- */
  // every entrance in the city in one mesh over one small atlas (one draw call for the lot): a portal
  // set into the facade, stone posts and lintel, a canopy with a light under it, the line's roundel
  // and the station's name over it, and the dark stairway going down. Each: { x, z, rot, name } with
  // local +z out to the street.
  function buildEntrances(list, colour) {
    const A = canvasTex(512, 512), c = A.ctx;
    const hex = '#' + new THREE.Color(colour).getHexString();
    const stone = DV.Tex.get('concrete_panel').image;
    c.drawImage(stone, 0, 0, 128, 128);
    c.fillStyle = '#2a2c2e'; c.fillRect(128, 0, 64, 64);
    c.fillStyle = '#070707'; c.fillRect(192, 0, 32, 32);
    c.fillStyle = '#f2eedc'; c.fillRect(224, 0, 32, 32);
    // the stairway seen from the street: dark, the first few steps catching the canopy light
    const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#0a0a0a'); g.addColorStop(1, '#1c1c1a');
    c.fillStyle = g; c.fillRect(320, 0, 64, 64);
    for (let k = 0; k < 5; k++) { c.fillStyle = 'rgba(160,156,146,' + (0.5 - k * 0.09) + ')'; c.fillRect(320, 60 - k * 7, 64, 2); }
    // the roundel for the posts
    c.fillStyle = '#101418'; c.fillRect(256, 0, 64, 64);
    c.strokeStyle = hex; c.lineWidth = 9; c.beginPath(); c.arc(288, 32, 22, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#e8e4d8'; c.fillRect(262, 27, 52, 10);
    // a row for each station's name
    list.forEach((e, k) => {
      const y = 128 + k * 64;
      const T = { ctx: c, cv: { width: 512, height: 64 }, tex: A.tex };
      c.save(); c.translate(0, y); drawRoundel(T, e.name.toUpperCase(), colour, 'CIRCLE LINE'); c.restore();
    });
    A.tex.needsUpdate = true;
    const R = { stone: [0, 0, 128, 128], metal: [128, 0, 64, 64], black: [192, 0, 32, 32], light: [224, 0, 32, 32], totem: [256, 0, 64, 64], stairs: [320, 0, 64, 64] };
    const pos = [], uv = [], col = [];
    const m = new THREE.Matrix4(), v = new THREE.Vector3();
    const quad = (p0, p1, p2, p3, r, shade) => {
      const [u0, v0, w, h] = r, U0 = u0 / 512, U1 = (u0 + w) / 512, V0 = 1 - (v0 + h) / 512, V1 = 1 - v0 / 512;
      const P = [p0, p1, p2, p3].map((p) => v.set(p[0], p[1], p[2]).applyMatrix4(m).toArray());
      const T = [[U0, V0], [U1, V0], [U1, V1], [U0, V1]];
      for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...P[i]); uv.push(...T[i]); col.push(shade, shade, shade); }
    };
    const box = (x, y, z, sx, sy, sz, r) => {
      const x0 = x - sx / 2, x1 = x + sx / 2, y0 = y, y1 = y + sy, z0 = z - sz / 2, z1 = z + sz / 2;
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], r, 0.92);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], r, 0.6);
      quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], r, 0.76);
      quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], r, 0.76);
      quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], r, 1.0);
      quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], r, 0.55);
    };
    list.forEach((e, k) => {
      m.makeRotationY(e.rot).setPosition(e.x, 0, e.z);
      box(-1.75, 0, 0.18, 0.5, 3.2, 0.36, R.stone);
      box(1.75, 0, 0.18, 0.5, 3.2, 0.36, R.stone);
      box(0, 2.8, 0.18, 4.0, 0.6, 0.36, R.stone);
      box(0, 3.12, 0.85, 4.4, 0.12, 1.4, R.metal);
      quad([-1.8, 3.11, 1.3], [1.8, 3.11, 1.3], [1.8, 3.11, 0.4], [-1.8, 3.11, 0.4], R.light, 1.15); // (the light under the canopy, facing down)
      quad([-1.5, 0.01, 0.03], [1.5, 0.01, 0.03], [1.5, 2.8, 0.03], [-1.5, 2.8, 0.03], R.stairs, 1.0);
      quad([-1.7, 3.33, 0.4], [1.7, 3.33, 0.4], [1.7, 3.77, 0.4], [-1.7, 3.77, 0.4], [0, 128 + k * 64, 512, 64], 1.0);
      for (const s of [-1, 1]) quad([s * 1.75 - 0.21, 2.14, 0.37], [s * 1.75 + 0.21, 2.14, 0.37], [s * 1.75 + 0.21, 2.56, 0.37], [s * 1.75 - 0.21, 2.56, 0.37], R.totem, 1.0);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: A.tex, vertexColors: true, fog: true }));
    mesh.name = 'metro_entrances';
    return mesh;
  }
  // the station's name on its sign: a dark panel, a ring of the line's colour, the name across it
  function drawRoundel(T, name, colour, sub) {
    const c = T.ctx, w = T.cv.width, h = T.cv.height;
    const hex = '#' + new THREE.Color(colour).getHexString();
    c.fillStyle = '#14181c'; c.fillRect(0, 0, w, h);
    c.fillStyle = hex; c.fillRect(0, h - 10, w, 10); c.fillRect(0, 0, w, 4);
    c.strokeStyle = hex; c.lineWidth = 9; c.beginPath(); c.arc(h * 0.5, h * 0.5, h * 0.3, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#e8e4d8'; c.fillRect(h * 0.12, h * 0.44, h * 0.76, h * 0.12);
    c.fillStyle = '#ece8dc';
    let size = 44;
    c.font = 'bold ' + size + 'px "Arial Narrow", Arial, sans-serif';
    while (size > 14 && c.measureText(name).width > w - h - 20) { size--; c.font = 'bold ' + size + 'px "Arial Narrow", Arial, sans-serif'; }
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(name, h + 4, h * 0.44);
    if (sub) { c.font = '15px "Arial Narrow", Arial, sans-serif'; c.fillStyle = '#9a968c'; c.fillText(sub, h + 6, h * 0.78); }
    T.tex.needsUpdate = true;
  }

  DV.MetroKit = { K, Lit, buildStation, buildTrain, buildEntrances, drawRoundel, canvasTex };
})();
