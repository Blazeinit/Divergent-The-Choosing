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
        const k = emit ? 1 : 0.55 + 0.38 * Math.max(0, d) + 0.1 * Math.max(0, n[i + 1]);
        this.col.push(c[0] * k, c[1] * k, c[2] * k);
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
  const GLASS = [0.1, 0.12, 0.14], GLASS_HI = [0.22, 0.27, 0.31], TYRE = [0.07, 0.07, 0.075], HUB = [0.55, 0.56, 0.57];
  const TRIM = [0.13, 0.13, 0.14], CHROME = [0.66, 0.67, 0.68], HEAD = [1.0, 0.97, 0.86], TAIL = [0.75, 0.08, 0.06], AMBER = [0.95, 0.62, 0.15];
  // the city's cars are old: faded paint, mostly
  const PAINT = [0x6e7b72, 0x8a8478, 0x5a6470, 0x7a5a4a, 0x9a9488, 0x4a5550, 0x8f7a5a, 0x5e5e62, 0x9aa0a4, 0x6a4a44, 0x3e4a5a, 0xa89a7a];

  // wheels: the tyre's outer face just proud of the body side, a hub disc on it, and a dark
  // wheel arch painted on the side around it (the body is solid, so the arch is a decal)
  function wheelSet(M, axles, W, r, w, body, opts) {
    const wheels = [];
    const archTop = (opts && opts.archTop) || r * 2 + 0.1;
    for (const z of axles) for (const side of [-1, 1]) {
      const x = side * (W / 2 - w / 2 + 0.035);
      const flat = opts && opts.wreck && side === 1 && z === axles[0];
      const ry = flat ? r * 0.8 : r;
      M.box(side * (W / 2 + 0.006), archTop / 2 + 0.02, z, 0.012, archTop - 0.04, r * 2.35, TRIM);
      M.box(side * (W / 2 - 0.1), archTop / 2 + 0.02, z, 0.2, archTop - 0.04, r * 2.3, TYRE); // the dark inside of the arch
      M.wheel(x, ry, z, ry, w, TYRE, 10);
      M.wheel(x + side * (w / 2 + 0.006), ry, z, r * 0.55, 0.012, opts && opts.wreck ? [0.35, 0.28, 0.22] : HUB, 8);
      wheels.push({ x, z, r });
    }
    void body;
    return wheels;
  }

  /* ---------------- the models ---------------- */
  const KINDS = {
    // a city bus: two-tone, a destination board, two doors on the kerb side
    bus(M, o) {
      const L = 11.2, W = 2.5, H = 3.05, r = 0.5;
      const body = o.color ? hex(o.color) : [0.78, 0.78, 0.74], skirt = mix(body, [0.12, 0.2, 0.18], 0.7), stripe = o.stripe ? hex(o.stripe) : [0.72, 0.52, 0.14];
      const y0 = 0.35;
      M.box(0, y0 + 0.45, 0, W, 0.9, L, skirt); // lower body
      M.box(0, y0 + 0.9 + (H - 0.9 - y0 - 0.15) / 2, 0, W, H - 0.9 - y0 - 0.15, L - 0.3, body); // upper body
      M.box(0, H - 0.08, 0, W - 0.16, 0.16, L - 0.6, mix(body, [1, 1, 1], 0.12)); // roof cap
      M.box(0, H + 0.12, -1.6, 1.6, 0.24, 2.4, [0.6, 0.6, 0.6]); // a/c unit
      M.box(0, y0 + 1.0, 0, W + 0.02, 0.12, L - 0.2, stripe); // livery stripe
      // windscreen: raked, in two panes, and the destination board above it
      M.prism([-W / 2 + 0.08, W / 2 - 0.08, L / 2 - 0.12, L / 2 + 0.02, y0 + 1.05], [-W / 2 + 0.1, W / 2 - 0.1, L / 2 - 0.3, L / 2 - 0.16, H - 0.55], GLASS_HI);
      M.box(0, (y0 + 1.05 + H - 0.55) / 2 + 0.02, L / 2 - 0.08, 0.06, H - 0.55 - y0 - 1.05, 0.08, TRIM);
      M.box(0, H - 0.36, L / 2 - 0.1, W - 0.4, 0.3, 0.06, [0.05, 0.05, 0.05]);
      M.box(0, H - 0.36, L / 2 - 0.06, W - 0.7, 0.2, 0.02, AMBER, { emit: true });
      // side windows with pillars, and the rear window
      for (const side of [-1, 1]) {
        const x = side * (W / 2 + 0.005);
        M.box(x, y0 + 1.75, -0.6, 0.02, 1.0, L - 2.6, GLASS);
        for (let k = 0; k <= 7; k++) M.box(x + side * 0.005, y0 + 1.75, -L / 2 + 0.7 + k * 1.3, 0.03, 1.02, 0.12, body);
      }
      M.box(0, y0 + 1.75, -L / 2 - 0.005, W - 0.5, 1.0, 0.02, GLASS);
      // doors on the right-hand side (local -x when +z is the front), the kerb side: front and middle
      for (const dz of [L / 2 - 1.1, -0.4]) {
        M.box(-W / 2 - 0.012, y0 + 1.15, dz, 0.02, 2.2, 1.1, GLASS_HI);
        M.box(-W / 2 - 0.02, y0 + 1.15, dz, 0.02, 2.2, 0.05, TRIM);
      }
      // lights, bumpers, mirrors
      for (const s of [-1, 1]) {
        M.box(s * (W / 2 - 0.3), y0 + 0.55, L / 2 + 0.03, 0.34, 0.18, 0.04, HEAD, { emit: true });
        M.box(s * (W / 2 - 0.25), y0 + 0.7, -L / 2 - 0.03, 0.18, 0.4, 0.04, TAIL, { emit: true });
        M.box(s * (W / 2 + 0.25), H - 0.9, L / 2 - 0.3, 0.05, 0.35, 0.12, TRIM);
        M.box(s * (W / 2 + 0.12), H - 0.75, L / 2 - 0.3, 0.3, 0.04, 0.04, TRIM);
      }
      M.box(0, y0 + 0.12, L / 2 + 0.06, W, 0.22, 0.14, TRIM);
      M.box(0, y0 + 0.12, -L / 2 - 0.06, W, 0.22, 0.14, TRIM);
      M.box(0, y0 + 0.25, -L / 2 - 0.02, 0.9, 0.35, 0.04, [0.3, 0.3, 0.3]); // engine grille
      const wheels = wheelSet(M, [L / 2 - 2.3, -L / 2 + 2.6], W, r, 0.32, body, Object.assign({ archTop: y0 + 0.95 }, o));
      return { length: L, width: W, height: H + 0.24, wheels };
    },
    // a four-door saloon
    sedan(M, o) {
      const L = 4.6, W = 1.78, r = 0.33;
      const body = o.color ? hex(o.color) : hex(PAINT[o.seed % PAINT.length]);
      const yb = 0.3, yt = 0.92, roof = 1.42;
      M.box(0, (yb + yt) / 2, 0, W, yt - yb, L, body); // lower body
      M.prism([-W / 2, W / 2, L / 2 - 1.3, L / 2, yt], [-W / 2 + 0.04, W / 2 - 0.04, L / 2 - 1.25, L / 2 - 0.05, yt + 0.05], body); // bonnet, a little domed
      M.prism([-W / 2, W / 2, -L / 2, -L / 2 + 0.9, yt], [-W / 2 + 0.04, W / 2 - 0.04, -L / 2 + 0.05, -L / 2 + 0.88, yt + 0.04], body); // boot lid
      // the cabin: raked screens front and back, glass all round, pillars
      M.cabin([-W / 2 + 0.06, W / 2 - 0.06, -1.42, 1.0, yt], [-W / 2 + 0.2, W / 2 - 0.2, -0.82, 0.25, roof], yt + 0.07, roof - 0.07, body, GLASS, { bz: -0.25 });
      for (const s of [-1, 1]) {
        M.box(s * (W / 2 - 0.32), 0.74, L / 2 + 0.006, 0.34, 0.13, 0.02, HEAD, { emit: true });
        M.box(s * (W / 2 - 0.28), 0.78, -L / 2 - 0.006, 0.36, 0.13, 0.02, TAIL, { emit: true });
        M.box(s * (W / 2 + 0.07), 1.0, 0.88, 0.12, 0.08, 0.1, body); // mirror
        M.box(s * (W / 2 + 0.003), 0.8, 0.15, 0.008, 0.03, 0.12, CHROME); // door handles
        M.box(s * (W / 2 + 0.003), 0.8, -0.75, 0.008, 0.03, 0.12, CHROME);
        M.box(s * (W / 2 + 0.003), 0.55, 0, 0.006, 0.04, L - 1.6, mix(body, [0, 0, 0], 0.35)); // rubbing strip
      }
      M.box(0, 0.62, L / 2 + 0.006, 0.72, 0.18, 0.02, [0.16, 0.16, 0.17]); // grille
      M.box(0, 0.4, L / 2 + 0.03, W - 0.02, 0.14, 0.1, o.wreck ? [0.3, 0.25, 0.2] : CHROME);
      M.box(0, 0.42, -L / 2 - 0.03, W - 0.02, 0.14, 0.1, o.wreck ? [0.3, 0.25, 0.2] : CHROME);
      M.box(0, 0.62, -L / 2 - 0.006, 0.42, 0.12, 0.01, [0.85, 0.83, 0.72]); // number plate
      const wheels = wheelSet(M, [L / 2 - 0.85, -L / 2 + 0.95], W, r, 0.2, body, Object.assign({ archTop: 0.8 }, o));
      return { length: L, width: W, height: roof, wheels };
    },
    // a small hatchback
    hatch(M, o) {
      const L = 3.9, W = 1.66, r = 0.3;
      const body = o.color ? hex(o.color) : hex(PAINT[(o.seed * 7 + 3) % PAINT.length]);
      const yb = 0.28, yt = 0.88, roof = 1.42;
      M.box(0, (yb + yt) / 2, 0, W, yt - yb, L, body);
      M.prism([-W / 2, W / 2, L / 2 - 1.0, L / 2, yt], [-W / 2 + 0.04, W / 2 - 0.04, L / 2 - 0.95, L / 2 - 0.06, yt + 0.06], body);
      M.cabin([-W / 2 + 0.06, W / 2 - 0.06, -L / 2 + 0.05, 0.9, yt], [-W / 2 + 0.18, W / 2 - 0.18, -L / 2 + 0.18, 0.1, roof], yt + 0.07, roof - 0.07, body, GLASS, { bz: -0.45 });
      for (const s of [-1, 1]) {
        M.box(s * (W / 2 - 0.3), 0.7, L / 2 + 0.006, 0.28, 0.12, 0.02, HEAD, { emit: true });
        M.box(s * (W / 2 - 0.16), 0.95, -L / 2 - 0.006, 0.16, 0.24, 0.02, TAIL, { emit: true });
        M.box(s * (W / 2 + 0.06), 0.98, 0.72, 0.1, 0.08, 0.09, body);
        M.box(s * (W / 2 + 0.003), 0.78, 0.0, 0.008, 0.03, 0.12, CHROME);
      }
      M.box(0, 0.6, L / 2 + 0.006, 0.6, 0.14, 0.02, [0.16, 0.16, 0.17]);
      M.box(0, 0.38, L / 2 + 0.03, W - 0.02, 0.14, 0.08, TRIM);
      M.box(0, 0.4, -L / 2 - 0.03, W - 0.02, 0.14, 0.08, TRIM);
      M.box(0, 0.62, -L / 2 - 0.006, 0.4, 0.12, 0.01, [0.85, 0.83, 0.72]);
      const wheels = wheelSet(M, [L / 2 - 0.7, -L / 2 + 0.75], W, r, 0.19, body, Object.assign({ archTop: 0.74 }, o));
      return { length: L, width: W, height: roof, wheels };
    },
    // a box van (Erudite labs, the Abnegation supply runs)
    van(M, o) {
      const L = 5.2, W = 1.95, r = 0.36, H = 2.25;
      const body = o.color ? hex(o.color) : [0.82, 0.82, 0.8];
      M.box(0, 0.32 + (H - 0.32) / 2, -0.45, W, H - 0.32, L - 0.9, body); // box
      M.box(0, 0.32 + 0.4, L / 2 - 0.45, W, 0.8, 0.9, body); // nose
      M.prism([-W / 2 + 0.05, W / 2 - 0.05, L / 2 - 0.9, L / 2 - 0.1, 1.12], [-W / 2 + 0.08, W / 2 - 0.08, L / 2 - 0.92, L / 2 - 0.6, H - 0.1], GLASS_HI);
      for (const s of [-1, 1]) {
        M.box(s * (W / 2 + 0.005), 1.55, L / 2 - 1.3, 0.02, 0.6, 0.75, GLASS);
        M.box(s * (W / 2 - 0.3), 0.75, L / 2 + 0.005, 0.3, 0.14, 0.02, HEAD, { emit: true });
        M.box(s * (W / 2 - 0.15), 0.95, -L / 2 - 0.005, 0.14, 0.3, 0.02, TAIL, { emit: true });
        M.box(s * (W / 2 + 0.1), 1.55, L / 2 - 0.75, 0.12, 0.22, 0.1, TRIM);
      }
      if (o.stripe) M.box(0, 1.25, -0.45, W + 0.02, 0.18, L - 1.0, hex(o.stripe));
      M.box(0, 0.38, L / 2 + 0.04, W, 0.16, 0.1, TRIM);
      M.box(0, 0.38, -L / 2 - 0.04, W, 0.16, 0.1, TRIM);
      M.box(0, 1.3, -L / 2 - 0.005, 0.02, 1.7, 0.01, TRIM); // rear doors' seam
      const wheels = wheelSet(M, [L / 2 - 0.95, -L / 2 + 1.0], W, r, 0.22, body, Object.assign({ archTop: 0.95 }, o));
      return { length: L, width: W, height: H, wheels };
    },
    // a flatbed pickup (Amity, bringing produce in)
    pickup(M, o) {
      const L = 5.3, W = 1.9, r = 0.37;
      const body = o.color ? hex(o.color) : [0.62, 0.22, 0.16];
      M.box(0, 0.75, L / 2 - 0.8, W, 0.85, 1.6, body); // bonnet
      M.box(0, 0.55, -0.2, W, 0.45, L - 0.4, [0.2, 0.18, 0.16]); // chassis
      M.prism([-W / 2 + 0.05, W / 2 - 0.05, 0.05, 1.55, 1.17], [-W / 2 + 0.1, W / 2 - 0.1, 0.1, 1.0, 1.9], GLASS);
      M.prism([-W / 2 + 0.1, W / 2 - 0.1, 0.1, 1.0, 1.86], [-W / 2 + 0.1, W / 2 - 0.1, 0.1, 1.0, 1.9], body);
      M.box(0, 0.95, 0.03, W, 0.95, 0.12, body); // cab back
      M.box(0, 0.85, -1.3, W, 0.12, 2.4, [0.5, 0.36, 0.22]); // the bed (planks)
      for (const s of [-1, 1]) M.box(s * (W / 2 - 0.04), 1.05, -1.3, 0.08, 0.4, 2.4, body);
      M.box(0, 1.05, -2.48, W, 0.4, 0.08, body);
      if (o.load !== false) for (let k = 0; k < 4; k++) M.box(-0.45 + (k % 2) * 0.9, 1.15 + Math.floor(k / 2) * 0.42, -0.85 - (k % 2) * 0.9, 0.7, 0.4, 0.62, [0.62, 0.48, 0.28]); // crates of apples
      for (const s of [-1, 1]) {
        M.box(s * (W / 2 - 0.3), 0.9, L / 2 + 0.005, 0.28, 0.14, 0.02, HEAD, { emit: true });
        M.box(s * (W / 2 - 0.15), 0.95, -L / 2 + 0.25, 0.14, 0.2, 0.02, TAIL, { emit: true });
      }
      M.box(0, 0.45, L / 2 + 0.03, W, 0.15, 0.1, CHROME);
      const wheels = wheelSet(M, [L / 2 - 0.9, -L / 2 + 1.05], W, r, 0.24, body, Object.assign({ archTop: 0.9 }, o));
      return { length: L, width: W, height: 1.9, wheels };
    },
    // an open patrol jeep (Dauntless)
    jeep(M, o) {
      const L = 4.1, W = 1.8, r = 0.4;
      const body = o.color ? hex(o.color) : [0.16, 0.16, 0.17];
      M.box(0, 0.85, 0, W, 0.75, L, body);
      M.box(0, 1.25, L / 2 - 1.2, W - 0.1, 0.06, 0.06, TRIM);
      M.prism([-W / 2 + 0.05, W / 2 - 0.05, L / 2 - 1.35, L / 2 - 1.25, 1.22], [-W / 2 + 0.05, W / 2 - 0.05, L / 2 - 1.45, L / 2 - 1.38, 1.75], GLASS_HI); // the screen
      for (const s of [-1, 1]) {
        M.box(s * (W / 2 - 0.05), 1.45, -0.8, 0.06, 0.06, 1.6, TRIM); // roll bar sides
        M.box(s * (W / 2 - 0.05), 1.85, -0.1, 0.06, 0.8, 0.06, TRIM);
        M.box(s * (W / 2 - 0.35), 1.02, L / 2 + 0.005, 0.22, 0.22, 0.02, HEAD, { emit: true });
        M.box(s * (W / 2 - 0.15), 1.0, -L / 2 - 0.005, 0.12, 0.14, 0.02, TAIL, { emit: true });
      }
      M.box(0, 2.25, -0.1, W - 0.04, 0.06, 0.06, TRIM);
      M.box(0, 1.25, -0.6, W - 0.3, 0.5, 0.5, [0.22, 0.22, 0.22]); // seats
      M.box(0, 1.0, -L / 2 - 0.25, 0.7, 0.7, 0.3, [0.2, 0.2, 0.2]); // spare
      M.box(0, 0.62, L / 2 + 0.06, W, 0.18, 0.12, TRIM);
      const wheels = wheelSet(M, [L / 2 - 0.8, -L / 2 + 0.8], W, r, 0.28, body, Object.assign({ archTop: 0.98 }, o));
      return { length: L, width: W, height: 2.3, wheels };
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
