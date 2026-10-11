/* ==========================================================================
   DIVERGENT — vehicles
   Low-poly buses, cars, vans and trucks for the streets: proper wheels (on
   their sides, with hubs and arches), raked windscreens, pillars between the
   windows, bumpers, head and tail lights, a destination board on the bus.
   Each vehicle is one mesh with vertex colours (shaded by a fixed sun, the
   way the city's buildings are), so a parked car or a passing bus costs one
   draw call. Moving ones turn their wheels.

     DV.Vehicles.build(kind, { color, seed, wreck, sign })
       → { root: THREE.Group, length, width, height, wheels:[mesh], kind }
     DV.Vehicles.park(zone, kind, x, z, rot, opts)   — a parked one with a collider

   kinds: bus · sedan · hatch · van · pickup · jeep
   +z is the front of every vehicle; y = 0 is the road; -x is its right-hand
   side (traffic keeps right, so that's the kerb side: the bus's doors).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const SUN = new THREE.Vector3(0.45, 0.8, 0.35).normalize();

  /* ---------------- a little mesh builder: boxes, prisms, cylinders, all vertex-coloured ---------------- */
  class MB {
    constructor() { this.pos = []; this.col = []; this.mat = new THREE.Matrix4(); this.stack = []; }
    push(x, y, z, ry, rx, rz) {
      this.stack.push(this.mat.clone());
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
      this.mat.multiply(m);
    }
    pop() { this.mat = this.stack.pop(); }
    // add a three.js geometry, shaded by its face normals against a fixed sun
    add(geo, c, opts) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      g.applyMatrix4(this.mat);
      g.computeVertexNormals();
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      const emit = opts && opts.emit;
      for (let i = 0; i < p.length; i += 3) {
        this.pos.push(p[i], p[i + 1], p[i + 2]);
        const d = n[i] * SUN.x + n[i + 1] * SUN.y + n[i + 2] * SUN.z;
        // (the sun, the sky on the upward faces, and darker low down where the road shades it)
        const ao = U.clamp(0.62 + p[i + 1] * 0.75, 0.62, 1);
        const k = emit ? 1 : (0.5 + 0.36 * Math.max(0, d) + 0.16 * Math.max(0, n[i + 1])) * ao;
        const sky = emit ? 0 : Math.max(0, n[i + 1]) * 0.05;
        this.col.push(c[0] * k + sky, c[1] * k + sky, c[2] * k + sky * 1.4);
      }
      geo.dispose();
      if (g !== geo) g.dispose();
    }
    // a flat rectangle facing up, in world space (ignores push), unshaded: road paint
    flat(x0, z0, x1, z1, y, c) {
      for (const [x, z] of [[x0, z0], [x0, z1], [x1, z1], [x0, z0], [x1, z1], [x1, z0]]) { this.pos.push(x, y, z); this.col.push(c[0], c[1], c[2]); }
    }
    // a box centred on (x, y, z)
    box(x, y, z, sx, sy, sz, c, opts) {
      const g = new THREE.BoxGeometry(sx, sy, sz);
      g.translate(x, y, z);
      this.add(g, c, opts);
    }
    // a six-sided solid between a bottom rectangle and a top one (raked windscreens, sloped bonnets)
    //   b, t: [x0, x1, z0, z1, y]
    prism(b, t, c, opts) {
      const v = [
        [b[0], b[4], b[2]], [b[1], b[4], b[2]], [b[1], b[4], b[3]], [b[0], b[4], b[3]],
        [t[0], t[4], t[2]], [t[1], t[4], t[2]], [t[1], t[4], t[3]], [t[0], t[4], t[3]],
      ];
      const f = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
      const arr = [];
      for (const [a, b2, c2, d] of f) for (const k of [a, c2, b2, a, d, c2]) arr.push(v[k][0], v[k][1], v[k][2]);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      this.add(g, c, opts);
    }
    // a car's cabin: a body-coloured prism from b to t (as prism), wrapped in a band of glass
    // between heights ya..yb, with pillars at the four corners and one (or none) mid-side
    cabin(b, t, ya, yb, body, glass, o) {
      o = o || {};
      this.prism(b, t, body);
      const at = (y, e) => {
        const k = (y - b[4]) / (t[4] - b[4]);
        return [b[0] + (t[0] - b[0]) * k - e, b[1] + (t[1] - b[1]) * k + e, b[2] + (t[2] - b[2]) * k - e, b[3] + (t[3] - b[3]) * k + e, y];
      };
      const e = 0.012;
      this.prism(at(ya, e), at(yb, e), glass);
      // pillars: thin sloped posts over the glass at the corners
      const lo = at(ya, e + 0.01), hi = at(yb, e + 0.01);
      const pw = o.pillar || 0.07;
      for (const [ix, iz] of [[0, 2], [1, 2], [1, 3], [0, 3]]) {
        const sx = ix === 0 ? 1 : -1, sz = iz === 2 ? 1 : -1;
        const post = (r) => [Math.min(r[ix], r[ix] + sx * pw), Math.max(r[ix], r[ix] + sx * pw), Math.min(r[iz], r[iz] + sz * pw * 1.4), Math.max(r[iz], r[iz] + sz * pw * 1.4), r[4]];
        this.prism(post(lo), post(hi), body);
      }
      if (o.bz !== undefined) for (const side of [0, 1]) {
        const xl = lo[side], xh = hi[side], sx = side === 0 ? 1 : -1;
        this.prism([Math.min(xl, xl + sx * 0.06), Math.max(xl, xl + sx * 0.06), o.bz - 0.05, o.bz + 0.05, ya], [Math.min(xh, xh + sx * 0.06), Math.max(xh, xh + sx * 0.06), o.bz - 0.05, o.bz + 0.05, yb], body);
      }
    }
    // a wheel: a cylinder lying along x, centred at (x, y, z)
    wheel(x, y, z, r, w, c, seg) {
      const g = new THREE.CylinderGeometry(r, r, w, seg || 10);
      g.rotateZ(Math.PI / 2);
      g.translate(x, y, z);
      this.add(g, c);
    }
    // a body from its side profile (a THREE.Shape in (along the car, up)), extruded across the width
    // W with rounded edges (bevel b), centred on x = 0 (or on x = cx)
    side(shape, W, c, b, cx, opts) {
      b = b || 0;
      const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, W - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * 0.85, bevelOffset: -b * 0.85, bevelSegments: 2, curveSegments: 7 }); // (the bevel rounds in from the outline, not out past it)
      g.rotateY(-Math.PI / 2);
      g.translate(W / 2 - b + (cx || 0), 0, 0);
      this.add(g, c, opts);
    }
    // a flat piece (a window, a pillar's trim) in the car's side: a profile, t thick, its outer face at x
    slab(pts, x, t, c, opts) {
      const sh = new THREE.Shape();
      sh.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
      const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
      g.rotateY(-Math.PI / 2);
      g.translate(x > 0 ? x : x + t, 0, 0);
      this.add(g, c, opts);
    }
    // a quad given its four corners (glass in a raked windscreen); shaded like the rest
    quad(a, b, c2, d, col, opts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c2, ...a, ...c2, ...d], 3));
      this.add(g, col, opts);
    }
    // a turned part (a tyre, a rim): a lathe profile [[radius, along the axle], ...] spun round an axle
    // along x, its +along end facing side (+1 / -1), centred at (x, y, z)
    lathe(x, y, z, prof, side, c, seg) {
      const g = new THREE.LatheGeometry(prof.map(([r, a]) => new THREE.Vector2(r, a)), seg || 22);
      g.rotateZ(-side * Math.PI / 2);
      g.translate(x, y, z);
      this.add(g, c);
    }
    // append a built (non-indexed, vertex-coloured) geometry, placed by the current transform
    // and tinted by k ([r, g, b] or a number)
    merge(geo, k) {
      const p = geo.attributes.position.array, c = geo.attributes.color.array, m = this.mat.elements;
      const kr = Array.isArray(k) ? k[0] : k === undefined ? 1 : k, kg = Array.isArray(k) ? k[1] : kr, kb = Array.isArray(k) ? k[2] : kr;
      for (let i = 0; i < p.length; i += 3) {
        const x = p[i], y = p[i + 1], z = p[i + 2];
        this.pos.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
        this.col.push(c[i] * kr, c[i + 1] * kg, c[i + 2] * kb);
      }
    }
    get count() { return this.pos.length / 3; }
    geometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.computeBoundingSphere();
      return g;
    }
  }

  const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const GLASS = [0.1, 0.12, 0.14], GLASS_HI = [0.22, 0.27, 0.31], TYRE = [0.07, 0.07, 0.075], TYRE_OUT = [0.16, 0.16, 0.165], WELL = [0.025, 0.025, 0.03], HUB = [0.55, 0.56, 0.57];
  const TRIM = [0.13, 0.13, 0.14], CHROME = [0.66, 0.67, 0.68], HEAD = [1.0, 0.97, 0.86], TAIL = [0.75, 0.08, 0.06], AMBER = [0.95, 0.62, 0.15];
  // the city's cars are old: faded paint, mostly
  const PAINT = [0x6e7b72, 0x8a8478, 0x5a6470, 0x7a5a4a, 0x9a9488, 0x4a5550, 0x8f7a5a, 0x5e5e62, 0x9aa0a4, 0x6a4a44, 0x3e4a5a, 0xa89a7a];

  // wheels: the tyre's outer face just proud of the body side, a hub disc on it, and a dark
  // wheel arch painted on the side around it (the body is solid, so the arch is a decal)
  // a round-topped arch (open at the bottom), in shape space: x along the vehicle, y up
  function archShape(R, cy) {
    const s = new THREE.Shape();
    s.moveTo(-R, 0.02); s.lineTo(-R, cy); s.absarc(0, cy, R, Math.PI, 0, true); s.lineTo(R, 0.02); s.lineTo(-R, 0.02);
    return s;
  }
  function wheelSet(M, axles, W, r, w, body, opts) {
    const wheels = [];
    const archTop = (opts && opts.archTop) || r * 2 + 0.1;
    const R = Math.max(r * 1.08, Math.min(r * 1.22, archTop - r - 0.015));
    for (const z of axles) for (const side of [-1, 1]) {
      const x = side * (W / 2 - w / 2 + (opts && opts.inset !== undefined ? -opts.inset : 0.035));
      const flat = opts && opts.wreck && side === 1 && z === axles[0];
      const ry = flat ? r * 0.8 : r;
      // the wheel arch: a round-topped well cut into the side (dark), with a trim lip round it
      // (with the wheel's own disc cut out of it: the rim sits back behind the body line, and a solid well would hide it)
      const wsh = archShape(R, r), hole = new THREE.Path();
      hole.absarc(0, ry, ry * 0.93, 0, Math.PI * 2, true);
      wsh.holes.push(hole);
      if (!(opts && opts.arches)) {
        const well = new THREE.ExtrudeGeometry(wsh, { depth: 0.208, bevelEnabled: false, curveSegments: 16 });
        well.rotateY(side * Math.PI / 2);
        well.translate(side * (W / 2 - 0.2), 0, z);
        M.add(well, WELL);
        const lip = new THREE.ShapeGeometry(archShape(R + 0.05, r), 10);
        lip.rotateY(side * Math.PI / 2);
        lip.translate(side * (W / 2 + 0.004), 0, z);
        M.add(lip, TRIM);
      }
      // the tyre: a rounded sidewall, a squared-off shoulder, the tread (and the bead down to the rim)
      const h = w / 2, ri = ry * 0.6;
      M.lathe(x, ry, z, [[ry * 0.82, -h], [ry, -h * 0.55], [ry, h * 0.55], [ry * 0.95, h * 0.86], [ry * 0.82, h], [ri, h * 0.9]], side, TYRE_OUT, 16); // (the inner sidewall faces the car: none)
      // the rim: a steel dish set back in the tyre, a chrome ring and a hubcap (rust on a wreck), lug nuts
      const steel = opts && opts.wreck ? [0.35, 0.28, 0.22] : HUB, cap = opts && opts.wreck ? [0.3, 0.25, 0.2] : CHROME;
      // (the steel face: a ring set back in the rim, facing out, and the rim's inner wall round it)
      const ring = new THREE.RingGeometry(ri * 0.48, ri * 0.98, 14, 1);
      ring.rotateY(side * Math.PI / 2);
      ring.translate(x + side * h * 0.84, ry, z);
      M.add(ring, mix(steel, [0.2, 0.2, 0.21], 0.15));
      const wall = new THREE.CylinderGeometry(ri * 0.99, ri * 0.99, h * 0.14, 14, 1, true); // (seen from inside: turned inside out)
      wall.rotateZ(Math.PI / 2); wall.scale(1, 1, -1);
      wall.translate(x + side * h * 0.91, ry, z); M.add(wall, mix(steel, [0.1, 0.1, 0.1], 0.45));
      M.lathe(x, ry, z, [[ri * 0.5, h * 0.86], [0.001, h * 0.9]], side, steel, 12); // (profiles run outside-in, or the faces look inward)
      M.lathe(x, ry, z, [[ri * 1.04, h * 0.95], [ri * 0.98, h * 0.97], [ri * 0.93, h * 0.9]], side, cap, 14);
      M.lathe(x, ry, z, [[ri * 0.33, h * 0.9], [ri * 0.26, h * 0.96], [0.001, h * 1.0]], side, cap, 10); // the centre cap
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        M.box(x + side * h * 0.9, ry + Math.cos(a) * ri * 0.4, z + Math.sin(a) * ri * 0.4, 0.03, 0.035, 0.035, TRIM);
      }
      // the inside of the wheel: a dark drum behind the rim
      const drum = new THREE.CylinderGeometry(ri * 0.8, ri * 0.8, w * 0.5, 10, 1, true);
      drum.rotateZ(Math.PI / 2); drum.scale(1, 1, -1); drum.translate(x - side * h * 0.2, ry, z); M.add(drum, WELL);
      wheels.push({ x, z, r });
    }
    void body;
    return wheels;
  }

  /* ---------------- the models ---------------- */
  // A body is its side profile: the outline from the front bottom, up over the bonnet, the roof line and
  // the boot to the rear bottom, then forward along the sill with an arch cut over each wheel. It's
  // extruded across the car with rounded edges, and a dark wheel-house fills each arch. The glasshouse
  // is a second rounded piece on top, in the body colour (that's the pillars and the roof), with the
  // glass let into it. Then the lights in chrome bezels, the grille, the bumpers wrapping round the
  // corners, the door seams and handles, the mirrors, plates and wipers; a contact shadow under it all.
  function profile(top, y0, arches) {
    const sh = new THREE.Shape();
    sh.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i < top.length; i++) sh.lineTo(top[i][0], top[i][1]);
    sh.lineTo(top[top.length - 1][0], y0);
    for (const a of arches.slice().sort((p, q) => p.u - q.u)) {
      const dy = y0 - a.cy, da = Math.asin(U.clamp(dy / a.R, -1, 1)), hw = Math.sqrt(Math.max(0, a.R * a.R - dy * dy));
      sh.lineTo(a.u - hw, y0);
      sh.absarc(a.u, a.cy, a.R, Math.PI - da, da, true);
    }
    sh.lineTo(top[0][0], y0);
    sh.closePath();
    return sh;
  }
  const poly = (pts) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath(); return sh; };
  const lerp = (a, b, k) => a + (b - a) * k;
  // glass on a raked face from p0 to p1 (side profile points), across half-width hw; both ways round
  function screen(M, p0, p1, hw, col) {
    const du = p1[0] - p0[0], dv = p1[1] - p0[1], l = Math.hypot(du, dv) || 1;
    const sg = du < 0 ? 1 : -1; // (outward: forward-and-up on a windscreen, back-and-up on a rear window)
    const nu = (sg * dv) / l * 0.014, nv = (-sg * du) / l * 0.014;
    const A = [-hw, p0[1] + nv, p0[0] + nu], B = [hw, p0[1] + nv, p0[0] + nu], C = [hw, p1[1] + nv, p1[0] + nu], D = [-hw, p1[1] + nv, p1[0] + nu];
    M.quad(A, B, C, D, col); M.quad(A, D, C, B, col);
  }
  // the glasshouse: g = { a0, a1 (the windscreen's foot and head), c1, c0 (the rear window's head and foot),
  // W, b, bp (the B pillar's u, or null for two doors), cp (a third, quarter window's pillar) }
  function cabin(M, g, body, opts) {
    opts = opts || {};
    M.side(poly([g.a0, g.a1, g.c1, g.c0]), g.W, body, g.b);
    const ins = 0.085, yb = g.a0[1] + 0.05, yt = Math.min(g.a1[1], g.c1[1]) - 0.08;
    const fr = (y) => lerp(g.a0[0], g.a1[0], (y - g.a0[1]) / (g.a1[1] - g.a0[1])) - ins;
    const rr = (y) => lerp(g.c0[0], g.c1[0], (y - g.c0[1]) / (g.c1[1] - g.c0[1])) + ins;
    const cuts = [g.bp, g.cp].filter((u) => u !== null && u !== undefined).sort((p, q) => q - p);
    const wins = [];
    let front = (y) => fr(y);
    for (const u of cuts) { const f = front; wins.push([(y) => f(y), () => u + 0.05]); front = () => u - 0.05; }
    wins.push([front, (y) => rr(y)]);
    for (const [f, r] of wins) {
      const pts = [[r(yb), yb], [f(yb), yb], [f(yt), yt], [r(yt), yt]];
      if (pts[1][0] - pts[0][0] < 0.12) continue;
      for (const sd of [-1, 1]) M.slab(pts, sd * (g.W / 2 + 0.006), 0.012, opts.tint || GLASS);
    }
    screen(M, [g.a0[0] - 0.02, g.a0[1] + 0.03], [g.a1[0] + 0.03, g.a1[1] - 0.05], g.W / 2 - 0.09, GLASS_HI);
    screen(M, [g.c0[0] + 0.02, g.c0[1] + 0.03], [g.c1[0] - 0.03, g.c1[1] - 0.05], g.W / 2 - 0.1, GLASS);
    // wipers at the foot of the screen
    for (const sx of [-0.32, 0.22]) M.box(sx, g.a0[1] + 0.035, g.a0[0] - 0.08, 0.5, 0.014, 0.02, [0.06, 0.06, 0.06]);
  }
  // a light in a chrome bezel, facing +z (front) or -z (back)
  function lamp(M, x, y, z, w, h, col, face, bezel) {
    M.box(x, y, z, w + 0.04, h + 0.04, 0.03, bezel || CHROME);
    M.box(x, y, z + face * 0.016, w, h, 0.02, col, { emit: true });
  }
  function roundLamp(M, x, y, z, r, col, face) {
    const b = new THREE.CylinderGeometry(r + 0.03, r + 0.035, 0.05, 16); b.rotateX(Math.PI / 2); b.translate(x, y, z); M.add(b, CHROME);
    const l = new THREE.CylinderGeometry(r, r, 0.03, 16); l.rotateX(Math.PI / 2); l.translate(x, y, z + face * 0.02); M.add(l, col, { emit: true });
  }
  // a bumper across the end, wrapping round the corners
  function bumper(M, z, y, W, c, h) {
    const f = Math.sign(z), hh = h || 0.13;
    M.box(0, y - hh / 2, z + f * 0.035, W - 0.16, hh, 0.1, c);
    for (const sd of [-1, 1]) M.box(sd * (W / 2 - 0.06), y - hh / 2, z - f * 0.1, 0.12, hh, 0.36, c);
  }
  function seams(M, W, us, y0, y1, body) { for (const u of us) for (const sd of [-1, 1]) M.box(sd * (W / 2 + 0.002), (y0 + y1) / 2, u, 0.008, y1 - y0, 0.014, mix(body, [0, 0, 0], 0.6)); }
  function handles(M, W, us, y) { for (const u of us) for (const sd of [-1, 1]) M.box(sd * (W / 2 + 0.008), y, u, 0.014, 0.035, 0.15, CHROME); }
  function mirrors(M, W, u, y, body) {
    for (const sd of [-1, 1]) { M.box(sd * (W / 2 + 0.04), y - 0.02, u, 0.09, 0.03, 0.04, TRIM); M.box(sd * (W / 2 + 0.11), y - 0.02, u - 0.02, 0.06, 0.1, 0.14, body); M.box(sd * (W / 2 + 0.11), y - 0.02, u + 0.06, 0.05, 0.08, 0.005, [0.5, 0.56, 0.6]); }
  }
  function plate(M, z, y, face) { M.box(0, y, z, 0.44, 0.12, 0.012, [0.86, 0.84, 0.74]); M.box(0, y, z + face * 0.007, 0.36, 0.035, 0.004, [0.14, 0.14, 0.16]); }
  // the wheel-house (dark) in each arch, the floor pan, and the shadow on the road
  function underneath(M, L, W, axles, R, y0) {
    for (const u of axles) M.box(0, 0.08, u, W - 0.46, y0 + R * 0.9, 2 * R - 0.04, WELL);
    M.box(0, 0.16, 0, W - 0.36, Math.max(0.05, y0 - 0.16), L - 0.6, [0.05, 0.05, 0.055]);
    M.flat(-W / 2 - 0.1, -L / 2 - 0.12, W / 2 + 0.1, L / 2 + 0.12, 0.013, [0.03, 0.03, 0.034]);
  }
  // a spare wheel on the back (axle along z)
  function spare(M, z, y, r, w) {
    const h = w / 2, ri = r * 0.6;
    const t = new THREE.LatheGeometry([[ri, -h * 0.9], [r * 0.82, -h], [r * 0.95, -h * 0.86], [r, -h * 0.55], [r, h * 0.55], [r * 0.95, h * 0.86], [r * 0.82, h], [ri, h * 0.9]].map(([a, b]) => new THREE.Vector2(a, b)), 20);
    t.rotateX(-Math.PI / 2); t.translate(0, y, z); M.add(t, TYRE_OUT);
    const d = new THREE.CylinderGeometry(ri, ri, w * 0.8, 14); d.rotateX(Math.PI / 2); d.translate(0, y, z); M.add(d, HUB);
  }

  const KINDS = {
    // a four-door saloon (one in four an estate; some with round lamps, the older ones)
    sedan(M, o) {
      const L = 4.7, W = 1.78, r = 0.33, R = r + 0.075, y0 = 0.3;
      const body = o.color ? hex(o.color) : hex(PAINT[o.seed % PAINT.length]);
      const estate = o.seed % 4 === 3, old = o.seed % 3 === 0;
      const uF = L / 2 - 0.92, uR = -L / 2 + 1.0;
      M.side(profile([[L / 2 - 0.06, 0.34], [L / 2, 0.5], [L / 2 - 0.01, 0.74], [L / 2 - 0.1, 0.86], [L / 2 - 0.32, 0.91], [1.05, 0.96], [-1.3, 0.97], [-L / 2 + 0.25, 0.95], [-L / 2 + 0.04, 0.9], [-L / 2, 0.72], [-L / 2 + 0.02, 0.38]], y0, [{ u: uF, cy: r, R }, { u: uR, cy: r, R }]), W, body, 0.07);
      cabin(M, estate
        ? { a0: [1.02, 0.95], a1: [0.22, 1.41], c1: [-L / 2 + 0.35, 1.41], c0: [-L / 2 + 0.12, 0.95], W: W - 0.2, b: 0.06, bp: -0.3, cp: -1.3 }
        : { a0: [1.02, 0.95], a1: [0.22, 1.41], c1: [-0.84, 1.42], c0: [-1.34, 0.96], W: W - 0.2, b: 0.06, bp: -0.3 }, body);
      // the front: lamps, indicators, the grille with its bars, the bumper, the plate
      for (const sd of [-1, 1]) {
        if (old) roundLamp(M, sd * 0.6, 0.7, L / 2 - 0.02, 0.085, HEAD, 1);
        else lamp(M, sd * 0.58, 0.7, L / 2 - 0.02, 0.3, 0.12, HEAD, 1);
        lamp(M, sd * 0.66, 0.55, L / 2 - 0.01, 0.12, 0.05, AMBER, 1, TRIM);
        lamp(M, sd * 0.6, 0.72, -L / 2 + 0.02, 0.36, 0.14, TAIL, -1, TRIM);
        M.box(sd * (W / 2 + 0.003), 0.72, -L / 2 + 0.14, 0.01, 0.14, 0.2, TAIL, { emit: true }); // (round the corner)
      }
      M.box(0, 0.68, L / 2 - 0.005, 0.66, 0.18, 0.03, [0.09, 0.09, 0.1]);
      for (let k = 0; k < 4; k++) M.box(0, 0.615 + k * 0.045, L / 2 + 0.012, 0.64, 0.012, 0.015, CHROME);
      bumper(M, L / 2, 0.47, W, o.wreck ? [0.3, 0.25, 0.2] : CHROME);
      bumper(M, -L / 2, 0.49, W, o.wreck ? [0.3, 0.25, 0.2] : CHROME);
      plate(M, L / 2 + 0.09, 0.42, 1); plate(M, -L / 2 - 0.01, 0.6, -1);
      // the sides: doors, handles, mirrors, the rubbing strip between the arches, the sill
      seams(M, W, [1.0, -0.3, -0.92], 0.38, 0.95, body);
      handles(M, W, [0.08, -0.6], 0.84);
      mirrors(M, W, 0.96, 1.02, body);
      for (const sd of [-1, 1]) {
        M.box(sd * (W / 2 + 0.005), 0.6, (uF - R + uR + R) / 2, 0.01, 0.035, (uF - R) - (uR + R) - 0.1, TRIM);
        M.box(sd * (W / 2 - 0.02), y0 + 0.02, (uF - R + uR + R) / 2, 0.06, 0.05, (uF - R) - (uR + R) - 0.05, mix(body, [0, 0, 0], 0.5));
      }
      M.box(0.6, 1.2, -L / 2 + 0.55, 0.008, 0.5, 0.008, TRIM); // the aerial
      M.wheel(-0.45, 0.24, -L / 2 - 0.02, 0.03, 0.16, [0.12, 0.12, 0.12], 6); // (and the exhaust, turned along z below)
      underneath(M, L, W, [uF, uR], R, y0);
      const wheels = wheelSet(M, [uF, uR], W, r, 0.21, body, Object.assign({ arches: true, inset: 0.012 }, o));
      return { length: L, width: W, height: 1.45, wheels };
    },
    // a small hatchback
    hatch(M, o) {
      const L = 3.95, W = 1.66, r = 0.3, R = r + 0.07, y0 = 0.29;
      const body = o.color ? hex(o.color) : hex(PAINT[(o.seed * 7 + 3) % PAINT.length]);
      const uF = L / 2 - 0.74, uR = -L / 2 + 0.78;
      M.side(profile([[L / 2 - 0.05, 0.33], [L / 2, 0.48], [L / 2 - 0.02, 0.7], [L / 2 - 0.12, 0.8], [L / 2 - 0.42, 0.86], [0.8, 0.92], [-L / 2 + 0.14, 0.95], [-L / 2, 0.88], [-L / 2, 0.45], [-L / 2 + 0.03, 0.34]], y0, [{ u: uF, cy: r, R }, { u: uR, cy: r, R }]), W, body, 0.07);
      cabin(M, { a0: [0.78, 0.91], a1: [0.08, 1.38], c1: [-L / 2 + 0.3, 1.39], c0: [-L / 2 + 0.07, 0.94], W: W - 0.2, b: 0.06, bp: -0.42 }, body);
      for (const sd of [-1, 1]) {
        lamp(M, sd * 0.53, 0.68, L / 2 - 0.02, 0.26, 0.11, HEAD, 1);
        lamp(M, sd * 0.6, 0.54, L / 2 - 0.01, 0.1, 0.05, AMBER, 1, TRIM);
        lamp(M, sd * 0.64, 0.92, -L / 2 + 0.01, 0.13, 0.28, TAIL, -1, TRIM);
      }
      M.box(0, 0.64, L / 2 - 0.005, 0.52, 0.12, 0.03, [0.09, 0.09, 0.1]);
      for (let k = 0; k < 3; k++) M.box(0, 0.6 + k * 0.04, L / 2 + 0.012, 0.5, 0.01, 0.015, TRIM);
      bumper(M, L / 2, 0.46, W, mix(TRIM, body, 0.15), 0.14);
      bumper(M, -L / 2, 0.48, W, mix(TRIM, body, 0.15), 0.14);
      plate(M, L / 2 + 0.09, 0.41, 1); plate(M, -L / 2 - 0.01, 0.66, -1);
      M.box(0, 1.2, -L / 2 + 0.06, 0.04, 0.02, 0.4, [0.06, 0.06, 0.06]); // the rear wiper
      seams(M, W, [0.82, -0.44], 0.36, 0.92, body);
      handles(M, W, [-0.3], 0.82);
      mirrors(M, W, 0.74, 0.98, body);
      for (const sd of [-1, 1]) M.box(sd * (W / 2 - 0.02), y0 + 0.02, (uF - R + uR + R) / 2, 0.06, 0.05, (uF - R) - (uR + R) - 0.05, mix(body, [0, 0, 0], 0.5));
      underneath(M, L, W, [uF, uR], R, y0);
      const wheels = wheelSet(M, [uF, uR], W, r, 0.19, body, Object.assign({ arches: true, inset: 0.012 }, o));
      return { length: L, width: W, height: 1.42, wheels };
    },
    // a panel van (Erudite's labs, the Order, the Abnegation supply runs)
    van(M, o) {
      const L = 5.2, W = 1.98, r = 0.36, R = r + 0.08, y0 = 0.34, H = 2.28;
      const body = o.color ? hex(o.color) : [0.82, 0.82, 0.8];
      const uF = L / 2 - 0.95, uR = -L / 2 + 1.0;
      const sA = [L / 2 - 0.42, 1.13], sB = [L / 2 - 1.05, H - 0.1];
      M.side(profile([[L / 2 - 0.05, 0.38], [L / 2, 0.6], [L / 2 - 0.03, 1.0], sA, sB, [L / 2 - 1.3, H], [-L / 2 + 0.08, H], [-L / 2, H - 0.08], [-L / 2, 0.42], [-L / 2 + 0.03, 0.38]], y0, [{ u: uF, cy: r, R }, { u: uR, cy: r, R }]), W, body, 0.08);
      screen(M, [sA[0] - 0.03, sA[1] + 0.05], [sB[0] + 0.04, sB[1] - 0.06], W / 2 - 0.12, GLASS_HI);
      for (const sd of [-1, 1]) M.slab([[L / 2 - 1.55, 1.22], [L / 2 - 0.55, 1.22], [L / 2 - 1.02, H - 0.2], [L / 2 - 1.55, H - 0.2]], sd * (W / 2 + 0.006), 0.012, GLASS);
      if (o.stripe) for (const sd of [-1, 1]) M.slab([[-L / 2 + 0.15, 1.2], [L / 2 - 1.62, 1.2], [L / 2 - 1.62, 1.38], [-L / 2 + 0.15, 1.38]], sd * (W / 2 + 0.005), 0.01, hex(o.stripe));
      // the back: two doors with small windows, lamps up the corners
      M.box(0, (0.45 + H - 0.1) / 2, -L / 2 - 0.004, 0.012, H - 0.55, 0.008, mix(body, [0, 0, 0], 0.6));
      for (const sd of [-1, 1]) {
        M.box(sd * 0.45, 1.7, -L / 2 - 0.004, 0.6, 0.42, 0.01, GLASS);
        lamp(M, sd * (W / 2 - 0.12), 0.95, -L / 2 + 0.01, 0.12, 0.34, TAIL, -1, TRIM);
        lamp(M, sd * 0.62, 0.82, L / 2 - 0.02, 0.3, 0.14, HEAD, 1);
        lamp(M, sd * 0.84, 0.64, L / 2 - 0.01, 0.1, 0.06, AMBER, 1, TRIM);
      }
      M.box(0, 0.8, L / 2 - 0.005, 0.7, 0.22, 0.03, [0.09, 0.09, 0.1]);
      for (let k = 0; k < 4; k++) M.box(0, 0.72 + k * 0.05, L / 2 + 0.012, 0.68, 0.012, 0.015, TRIM);
      bumper(M, L / 2, 0.52, W, TRIM, 0.16); bumper(M, -L / 2, 0.52, W, TRIM, 0.16);
      plate(M, L / 2 + 0.1, 0.44, 1); plate(M, -L / 2 - 0.01, 0.65, -1);
      seams(M, W, [L / 2 - 0.5, L / 2 - 1.58], 0.42, H - 0.14, body);
      for (const sd of [-1, 1]) { M.box(sd * (W / 2 + 0.003), 1.22, 0.3, 0.008, 1.6, 0.014, mix(body, [0, 0, 0], 0.6)); M.box(sd * (W / 2 + 0.003), 1.22, -0.85, 0.008, 1.6, 0.014, mix(body, [0, 0, 0], 0.6)); M.box(sd * (W / 2 + 0.006), 1.05, -0.3, 0.012, 0.03, 1.05, TRIM); }
      handles(M, W, [L / 2 - 0.75, 0.15], 1.1);
      mirrors(M, W, L / 2 - 0.62, 1.5, TRIM);
      underneath(M, L, W, [uF, uR], R, y0);
      const wheels = wheelSet(M, [uF, uR], W, r, 0.22, body, Object.assign({ arches: true, inset: 0.012 }, o));
      return { length: L, width: W, height: H, wheels };
    },
    // a pickup with a plank bed (Amity, bringing produce in)
    pickup(M, o) {
      const L = 5.3, W = 1.92, r = 0.37, R = r + 0.08, y0 = 0.38;
      const body = o.color ? hex(o.color) : [0.62, 0.22, 0.16];
      const uF = L / 2 - 0.92, uR = -L / 2 + 1.1;
      M.side(profile([[L / 2 - 0.05, 0.42], [L / 2, 0.64], [L / 2 - 0.03, 0.95], [L / 2 - 0.22, 1.05], [0.98, 1.1], [-0.42, 1.1], [-0.42, 0.82], [-L / 2 + 0.06, 0.82], [-L / 2, 0.76], [-L / 2 + 0.02, 0.46]], y0, [{ u: uF, cy: r, R }, { u: uR, cy: r, R }]), W, body, 0.06);
      cabin(M, { a0: [0.96, 1.09], a1: [0.44, 1.86], c1: [-0.3, 1.87], c0: [-0.4, 1.09], W: W - 0.16, b: 0.05, bp: null }, body);
      // the bed: sides, the tailgate, the plank floor
      for (const sd of [-1, 1]) M.slab([[-L / 2 + 0.02, 0.8], [-0.45, 0.8], [-0.45, 1.1], [-L / 2 + 0.02, 1.1]], sd * W / 2, 0.08, body);
      M.box(0, 0.95, -L / 2 + 0.05, W - 0.04, 0.3, 0.08, body);
      M.box(0, 0.82, (-L / 2 - 0.45) / 2, W - 0.18, 0.03, L / 2 - 0.5, [0.5, 0.36, 0.22]);
      for (let k = -3; k <= 3; k++) M.box(k * 0.24, 0.85, (-L / 2 - 0.45) / 2, 0.012, 0.005, L / 2 - 0.5, [0.32, 0.22, 0.13]);
      if (o.load !== false) for (let k = 0; k < 4; k++) M.box(-0.45 + (k % 2) * 0.9, 1.04 + Math.floor(k / 2) * 0.41, -0.95 - (k % 2) * 0.9, 0.7, 0.4, 0.62, [0.62, 0.48, 0.28]); // crates of apples
      for (const sd of [-1, 1]) {
        roundLamp(M, sd * 0.66, 0.85, L / 2 - 0.02, 0.09, HEAD, 1);
        lamp(M, sd * (W / 2 - 0.1), 0.92, -L / 2 + 0.02, 0.12, 0.2, TAIL, -1, TRIM);
      }
      M.box(0, 0.8, L / 2 - 0.005, 0.86, 0.26, 0.03, CHROME);
      for (let k = 0; k < 5; k++) M.box(0, 0.7 + k * 0.05, L / 2 + 0.01, 0.8, 0.02, 0.015, [0.1, 0.1, 0.1]);
      bumper(M, L / 2, 0.55, W, o.wreck ? [0.3, 0.25, 0.2] : CHROME, 0.15);
      bumper(M, -L / 2, 0.55, W, TRIM, 0.12);
      plate(M, L / 2 + 0.1, 0.45, 1); plate(M, -L / 2 - 0.03, 0.62, -1);
      seams(M, W, [0.96, -0.4], 0.46, 1.1, body);
      handles(M, W, [-0.2], 1.0);
      mirrors(M, W, 0.92, 1.18, TRIM);
      underneath(M, L, W, [uF, uR], R, y0);
      const wheels = wheelSet(M, [uF, uR], W, r, 0.24, body, Object.assign({ arches: true, inset: 0.012 }, o));
      return { length: L, width: W, height: 1.9, wheels };
    },
    // an open patrol jeep (Dauntless): a slab-sided tub, a fold-flat screen, a roll bar, the spare on the back
    jeep(M, o) {
      const L = 4.1, W = 1.82, r = 0.42, R = r + 0.09, y0 = 0.55;
      const body = o.color ? hex(o.color) : [0.16, 0.16, 0.17];
      const uF = L / 2 - 0.8, uR = -L / 2 + 0.85;
      M.side(profile([[L / 2 - 0.03, 0.62], [L / 2, 0.92], [L / 2 - 0.05, 1.12], [L / 2 - 1.15, 1.17], [L / 2 - 1.28, 1.22], [-L / 2 + 0.05, 1.22], [-L / 2, 1.14], [-L / 2, 0.64]], y0, [{ u: uF, cy: r, R }, { u: uR, cy: r, R }]), W, body, 0.05);
      // fender flares over the arches
      for (const u of [uF, uR]) for (const sd of [-1, 1]) {
        const fl = new THREE.Shape(); fl.absarc(0, 0, R + 0.08, 0, Math.PI, false); fl.absarc(0, 0, R, Math.PI, 0, true);
        const g = new THREE.ExtrudeGeometry(fl, { depth: 0.1, bevelEnabled: false, curveSegments: 10 });
        g.rotateY(-Math.PI / 2); g.translate(sd > 0 ? W / 2 + 0.08 : -W / 2 + 0.02, r, u); M.add(g, mix(body, [0, 0, 0], 0.3));
      }
      // inside the tub: the floor, the seats
      M.box(0, 1.215, -0.55, W - 0.16, 0.02, 2.2, [0.07, 0.07, 0.075]);
      for (const sd of [-1, 1]) { M.box(sd * 0.42, 1.22, -0.25, 0.55, 0.32, 0.5, [0.2, 0.18, 0.15]); M.box(sd * 0.42, 1.54, -0.48, 0.55, 0.5, 0.1, [0.2, 0.18, 0.15]); }
      M.box(0, 1.22, -1.2, W - 0.3, 0.3, 0.5, [0.2, 0.18, 0.15]);
      // the screen in its frame, the roll bar
      const sa = [L / 2 - 1.3, 1.22], sb = [L / 2 - 1.42, 1.8];
      for (const sd of [-1, 1]) M.box(sd * (W / 2 - 0.08), 1.51, L / 2 - 1.36, 0.05, 0.6, 0.05, TRIM);
      M.box(0, 1.8, L / 2 - 1.42, W - 0.12, 0.05, 0.05, TRIM);
      screen(M, sa, sb, W / 2 - 0.12, GLASS_HI);
      for (const sd of [-1, 1]) { M.box(sd * (W / 2 - 0.06), 1.71, -0.75, 0.06, 1.0, 0.06, TRIM); M.box(sd * (W / 2 - 0.06), 2.2, -0.45, 0.06, 0.06, 0.66, TRIM); M.box(sd * (W / 2 - 0.06), 1.71, -0.15, 0.06, 1.0, 0.06, TRIM); }
      M.box(0, 2.2, -0.75, W - 0.1, 0.06, 0.06, TRIM); M.box(0, 2.2, -0.15, W - 0.1, 0.06, 0.06, TRIM);
      // the front: round lamps, the slotted grille; the bumper; the spare on the tailgate
      for (const sd of [-1, 1]) {
        roundLamp(M, sd * 0.55, 0.95, L / 2 - 0.01, 0.09, HEAD, 1);
        lamp(M, sd * (W / 2 - 0.12), 0.95, -L / 2 + 0.01, 0.1, 0.14, TAIL, -1, TRIM);
      }
      for (let k = -3; k <= 3; k++) M.box(k * 0.09, 0.92, L / 2 - 0.004, 0.035, 0.26, 0.02, [0.04, 0.04, 0.04]);
      bumper(M, L / 2, 0.66, W + 0.08, TRIM, 0.16);
      bumper(M, -L / 2, 0.66, W, TRIM, 0.14);
      spare(M, -L / 2 - 0.16, 1.0, 0.38, 0.24);
      plate(M, L / 2 + 0.1, 0.57, 1);
      underneath(M, L, W, [uF, uR], R, y0);
      const wheels = wheelSet(M, [uF, uR], W, r, 0.3, body, Object.assign({ arches: true, inset: -0.04 }, o));
      return { length: L, width: W, height: 2.3, wheels };
    },
    // a city bus: rounded at the front, two-tone, a destination board, two doors on the kerb side
    bus(M, o) {
      const L = 11.2, W = 2.5, H = 3.05, r = 0.5, R = r + 0.1, y0 = 0.35;
      const body = o.color ? hex(o.color) : [0.8, 0.79, 0.74], skirt = mix(body, [0.12, 0.2, 0.18], 0.7), stripe = o.stripe ? hex(o.stripe) : [0.72, 0.52, 0.14];
      const uF = L / 2 - 2.3, uR = -L / 2 + 2.6;
      M.side(profile([[L / 2 - 0.04, 0.38], [L / 2, 0.75], [L / 2, H - 0.45], [L / 2 - 0.3, H], [-L / 2 + 0.2, H], [-L / 2, H - 0.25], [-L / 2, 0.42]], y0, [{ u: uF, cy: r, R }, { u: uR, cy: r, R }]), W, body, 0.1);
      M.box(0, H + 0.1, -1.6, 1.6, 0.24, 2.4, mix(body, [0.4, 0.4, 0.4], 0.4)); // the heater on the roof
      // the lower band and the livery stripe, between the arches (front, middle, back)
      const segs = [[uF + R + 0.05, L / 2 - 0.05], [uR + R + 0.05, uF - R - 0.05], [-L / 2 + 0.05, uR - R - 0.05]];
      for (const [a, b] of segs) for (const sd of [-1, 1]) {
        M.slab([[a, y0 + 0.08], [b, y0 + 0.08], [b, 0.95], [a, 0.95]], sd * (W / 2 + 0.004), 0.01, skirt);
        M.slab([[a, 1.0], [b, 1.0], [b, 1.12], [a, 1.12]], sd * (W / 2 + 0.006), 0.01, stripe);
      }
      // the windows: a band down each side, posts between; the windscreen; the destination board
      for (const sd of [-1, 1]) {
        M.slab([[-L / 2 + 0.45, 1.4], [L / 2 - 1.75, 1.4], [L / 2 - 1.75, 2.42], [-L / 2 + 0.45, 2.42]], sd * (W / 2 + 0.006), 0.012, GLASS);
        for (let k = 0; k <= 7; k++) M.box(sd * (W / 2 + 0.012), 1.91, -L / 2 + 0.45 + k * ((L - 2.2) / 7), 0.012, 1.02, 0.09, body);
      }
      for (const v of [[-W / 2 + 0.12, -0.03], [0.03, W / 2 - 0.12]]) {
        const A = [v[0], 1.12, L / 2 + 0.014], B = [v[1], 1.12, L / 2 + 0.014], C = [v[1], H - 0.55, L / 2 + 0.014], D = [v[0], H - 0.55, L / 2 + 0.014];
        M.quad(A, B, C, D, GLASS_HI); M.quad(A, D, C, B, GLASS_HI);
      }
      M.box(0, H - 0.5, L / 2 - 0.02, W - 0.4, 0.3, 0.06, [0.05, 0.05, 0.05]);
      M.box(0, H - 0.47, L / 2 + 0.012, W - 0.7, 0.2, 0.02, AMBER, { emit: true });
      M.box(0, 1.7, -L / 2 - 0.012, W - 0.5, 0.8, 0.02, GLASS);
      // the doors on the kerb side (local -x): front and middle, two leaves each
      for (const dz of [L / 2 - 1.1, -0.4]) {
        M.box(-W / 2 - 0.012, y0 + 1.2, dz, 0.02, 2.2, 1.1, GLASS_HI);
        M.box(-W / 2 - 0.02, y0 + 1.2, dz, 0.02, 2.2, 0.05, TRIM);
        M.box(-W / 2 - 0.02, y0 + 1.25, dz, 0.022, 0.05, 1.12, TRIM);
      }
      for (const sd of [-1, 1]) {
        lamp(M, sd * (W / 2 - 0.32), 0.62, L / 2 - 0.01, 0.34, 0.16, HEAD, 1);
        lamp(M, sd * (W / 2 - 0.25), 0.8, -L / 2 + 0.01, 0.18, 0.4, TAIL, -1, TRIM);
        M.box(sd * (W / 2 + 0.3), H - 0.95, L / 2 - 0.3, 0.06, 0.38, 0.14, TRIM); // the mirrors on their arms
        M.box(sd * (W / 2 + 0.15), H - 0.75, L / 2 - 0.3, 0.32, 0.04, 0.04, TRIM);
      }
      bumper(M, L / 2, 0.5, W, TRIM, 0.24); bumper(M, -L / 2, 0.52, W, TRIM, 0.24);
      M.box(0, 0.3, -L / 2 - 0.02, 0.9, 0.4, 0.04, [0.28, 0.28, 0.28]); // the engine grille
      plate(M, L / 2 + 0.11, 0.48, 1);
      underneath(M, L, W, [uF, uR], R, y0);
      const wheels = wheelSet(M, [uF, uR], W, r, 0.32, body, Object.assign({ arches: true, inset: 0.02 }, o));
      return { length: L, width: W, height: H + 0.24, wheels };
    },
  };

  const mats = {};
  const material = (wreck) => {
    const k = wreck ? 'wreck' : 'paint';
    if (!mats[k]) mats[k] = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
    return mats[k];
  };
  // shared geometry per (kind, colour, wreck): a street of parked cars builds each model once
  const geoCache = {};

  const V = {
    kinds: Object.keys(KINDS),
    PAINT,
    MB, // the vertex-coloured mesh builder (street furniture uses it too)
    // the model's geometry (shared: don't dispose it) and its size: { geo, info }
    model(kind, opts) {
      opts = Object.assign({ seed: 0 }, opts || {});
      const key = kind + '|' + (opts.color || '') + '|' + (opts.stripe || '') + '|' + (opts.seed % PAINT.length) + '|' + (opts.wreck ? 1 : 0) + '|' + (opts.load === false ? 0 : 1);
      let entry = geoCache[key];
      if (!entry) {
        const M = new MB();
        const info = KINDS[kind](M, opts);
        const geo = M.geometry();
        if (opts.wreck) {
          // rust and grime: darken and redden, and sit it down on its flat tyre
          const c = geo.attributes.color.array;
          for (let i = 0; i < c.length; i += 3) { const l = (c[i] + c[i + 1] + c[i + 2]) / 3; c[i] = l * 0.62 + 0.08; c[i + 1] = l * 0.5 + 0.04; c[i + 2] = l * 0.42 + 0.02; }
        }
        entry = geoCache[key] = { geo, info };
      }
      return entry;
    },
    build(kind, opts) {
      opts = Object.assign({ seed: 0 }, opts || {});
      const entry = this.model(kind, opts);
      const root = new THREE.Group();
      const mesh = new THREE.Mesh(entry.geo, material(opts.wreck));
      mesh.frustumCulled = true;
      root.add(mesh);
      root.userData.vehicle = kind;
      return { root, mesh, kind, length: entry.info.length, width: entry.info.width, height: entry.info.height, wheels: entry.info.wheels };
    },
    // a vehicle parked in a zone: added to the zone's scene group, solid, lit like everything else there
    park(zone, kind, x, z, rot, opts) {
      const v = this.build(kind, opts);
      v.root.position.set(x, 0, z);
      v.root.rotation.y = rot || 0;
      zone.group.add(v.root);
      // tint by the baked light where it stands (indoors under a roof, outdoors in the open)
      const L = zone.lightAt(x, z);
      const m = v.mesh.material = v.mesh.material.clone();
      m.color.setRGB(U.clamp(L[0] * 0.95, 0.35, 1.2), U.clamp(L[1] * 0.95, 0.35, 1.2), U.clamp(L[2] * 0.95, 0.35, 1.2));
      // collider: the rotated footprint's bounding box (vehicles are parked square to the street)
      const c = Math.abs(Math.cos(rot || 0)), s = Math.abs(Math.sin(rot || 0));
      const hx = (v.width * c + v.length * s) / 2, hz = (v.width * s + v.length * c) / 2;
      v.collider = zone.colliders.add(x - hx, z - hz, x + hx, z + hz, { y0: 0, y1: v.height, tag: 'vehicle' });
      return v;
    },
  };
  DV.Vehicles = V;
})();
