/* ==========================================================================
   DIVERGENT — street furniture for a walkable city
   Every block of a walkable city (DV.City with o.walk) gets what a street has
   along its kerbs: lamp posts with their arms over the road, trees in their
   pits (bare ones too), hydrants, benches and bins, newspaper boxes, the old
   traffic signals that went dark years ago, a street-name sign on the corners
   (the names are real: they're the city map's), and cars parked along the
   kerb facing the way the traffic goes. Each sector dresses differently:
   Abnegation has neat trees and no cars to speak of, the factionless ruins
   have stumps and wrecks, downtown has newspapers and parked cars.

   It's all placed up front (just data), and built in 96 m chunks — one mesh
   for the furniture and cars (vertex-coloured, one draw call), one for the
   sign blades — when you come within reach, shown and hidden by distance.
   The pieces you'd walk into are colliders.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const CHUNK = 96, BUILD_R = 210, SHOW_R = 240;
  const STEEL = [0.24, 0.24, 0.25], DARK = [0.13, 0.13, 0.14], CONC = [0.55, 0.54, 0.51], BARK = [0.3, 0.24, 0.18];
  const LEAF = [[0.32, 0.38, 0.22], [0.36, 0.4, 0.24], [0.4, 0.38, 0.22], [0.28, 0.33, 0.22]];
  const SIG = [0.13, 0.15, 0.12]; // signal housings: the city's old dark green
  const SIG_HEADS = [[0, 3.05], [-4.05, 4.12]]; // where the heads are on a signal pole ([x, y], local)
  const PED_Y = 2.45;
  const HYDRANT = [0.72, 0.36, 0.12], BENCH = [0.42, 0.3, 0.2], BIN = [0.2, 0.27, 0.22], LAMP = [1.0, 0.95, 0.8];

  // how each sector dresses its streets (chances per slot)
  const DRESS = {
    testing: { tree: 0.35, bare: 0.4, car: 0.22, bench: 0.12, bin: 0.2, news: 0.05, signal: 0.3 },
    downtown: { tree: 0.25, bare: 0.3, car: 0.32, bench: 0.15, bin: 0.3, news: 0.18, signal: 0.6 },
    erudite: { tree: 0.55, bare: 0.1, car: 0.26, bench: 0.25, bin: 0.25, news: 0.12, signal: 0.45 },
    candor: { tree: 0.3, bare: 0.2, car: 0.26, bench: 0.15, bin: 0.25, news: 0.2, signal: 0.45 },
    abnegation: { tree: 0.6, bare: 0.15, car: 0.05, bench: 0.2, bin: 0.12, news: 0, signal: 0.15 },
    factionless: { tree: 0.25, bare: 0.85, car: 0.14, wreck: true, bench: 0.04, bin: 0.05, news: 0, signal: 0.2, broken: 0.5 },
    dauntless: { tree: 0.12, bare: 0.7, car: 0.14, jeeps: true, bench: 0.04, bin: 0.1, news: 0, signal: 0.25, broken: 0.3 },
    none: { tree: 0.3, bare: 0.5, car: 0.15, bench: 0.08, bin: 0.12, news: 0.04, signal: 0.25 },
  };

  /* ---------------- the pieces: each built once, standing at the origin, +z towards the road ---------------- */
  const pieces = {};
  function cylY(M, x, y, z, r0, r1, h, c, seg, opts) {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg || 6);
    g.translate(x, y + h / 2, z);
    M.add(g, c, opts);
  }
  const BUILD = {
    lamp(M) {
      cylY(M, 0, 0, 0, 0.1, 0.07, 6.2, STEEL);
      M.box(0, 0.25, 0, 0.32, 0.5, 0.32, STEEL);
      M.box(0, 6.1, 0.75, 0.08, 0.08, 1.5, STEEL);
      M.box(0, 6.0, 1.5, 0.28, 0.16, 0.5, DARK);
      M.box(0, 5.91, 1.5, 0.22, 0.02, 0.4, LAMP, { emit: true });
    },
    lamp_dead(M) {
      cylY(M, 0, 0, 0, 0.1, 0.07, 6.2, STEEL);
      M.box(0, 0.25, 0, 0.32, 0.5, 0.32, STEEL);
      M.box(0, 6.1, 0.75, 0.08, 0.08, 1.5, STEEL);
      M.box(0, 6.0, 1.5, 0.28, 0.16, 0.5, DARK);
    },
    tree(M, v) {
      cylY(M, 0, 0, 0, 0.16, 0.11, 2.6, BARK, 6);
      M.box(0, 0.03, 0, 1.2, 0.05, 1.2, [0.22, 0.2, 0.17]); // the pit
      const leaf = LEAF[v % LEAF.length];
      const crown = (x, y, z, r) => { const g = new THREE.IcosahedronGeometry(r, 0); g.translate(x, y, z); M.add(g, leaf); };
      crown(0, 3.6, 0, 1.55);
      crown(0.6, 3.1, 0.3, 1.0);
      crown(-0.5, 4.2, -0.2, 0.95);
    },
    tree_bare(M) {
      cylY(M, 0, 0, 0, 0.15, 0.1, 3.2, BARK, 6);
      M.box(0, 0.03, 0, 1.2, 0.05, 1.2, [0.22, 0.2, 0.17]);
      for (const [a, y, l] of [[0.4, 2.2, 1.5], [2.5, 2.6, 1.3], [4.3, 2.9, 1.2], [5.6, 3.1, 0.9]]) {
        M.push(0, y, 0, a, 0, 0.9);
        M.box(0, l / 2, 0, 0.07, l, 0.07, BARK);
        M.pop();
      }
    },
    stump(M) { cylY(M, 0, 0, 0, 0.2, 0.17, 0.5, BARK, 6); M.box(0, 0.03, 0, 1.2, 0.05, 1.2, [0.22, 0.2, 0.17]); },
    hydrant(M) {
      cylY(M, 0, 0, 0, 0.16, 0.15, 0.6, HYDRANT, 8);
      cylY(M, 0, 0.6, 0, 0.12, 0.05, 0.14, HYDRANT, 8);
      M.box(0, 0.42, 0, 0.42, 0.1, 0.1, HYDRANT);
      M.box(0, 0.03, 0, 0.36, 0.06, 0.36, DARK);
    },
    bench(M) {
      M.box(0, 0.44, 0.1, 1.8, 0.05, 0.42, BENCH);
      M.box(0, 0.7, -0.1, 1.8, 0.3, 0.04, BENCH);
      for (const x of [-0.75, 0.75]) M.box(x, 0.22, 0.05, 0.06, 0.44, 0.4, DARK);
    },
    bin(M) { cylY(M, 0, 0, 0, 0.26, 0.28, 0.95, BIN, 8); cylY(M, 0, 0.95, 0, 0.28, 0.26, 0.06, DARK, 8); },
    news(M) {
      for (const [x, c] of [[-0.28, [0.7, 0.68, 0.62]], [0.28, [0.16, 0.16, 0.17]]]) {
        M.box(x, 0.66, 0, 0.5, 0.72, 0.45, c);
        M.box(x, 0.15, 0, 0.42, 0.3, 0.38, DARK);
        M.box(x, 0.82, 0.23, 0.36, 0.22, 0.01, [0.9, 0.88, 0.8]);
      }
    },
    signpost(M) { cylY(M, 0, 0, 0, 0.05, 0.045, 3.1, [0.2, 0.3, 0.22], 6); },
    signal(M) {
      cylY(M, 0, 0, 0, 0.09, 0.07, 4.4, STEEL, 6);
      M.box(0, 4.3, 1.6, 0.09, 0.09, 3.2, STEEL);
      for (const z of [0.4, 3.0]) {
        M.box(0, 3.4, z, 0.3, 0.9, 0.26, [0.08, 0.08, 0.08]);
        for (let k = 0; k < 3; k++) M.box(0.16, 3.1 + k * 0.28, z, 0.02, 0.18, 0.18, [0.1, 0.11, 0.1]);
      }
    },
    // a working signal at a corner (+z faces the traffic coming): the pole, a head on it, and a mast
    // arm over the road (towards local −x) with a second head hanging from it
    sig_pole(M) {
      cylY(M, 0, 0, 0, 0.11, 0.09, 4.95, STEEL, 8);
      M.box(0, 0.2, 0, 0.36, 0.4, 0.36, STEEL);
      M.box(-2.45, 4.78, 0, 4.9, 0.1, 0.1, STEEL);
      M.box(-0.55, 4.45, 0, 1.1, 0.06, 0.06, STEEL); // (the arm's brace)
      for (const [hx, hy] of SIG_HEADS) {
        M.box(hx, hy, -0.15, 0.56, 1.22, 0.03, [0.06, 0.06, 0.06]); // backplate
        M.box(hx, hy, 0, 0.34, 1.0, 0.26, SIG); // housing
        for (const dy of [0.31, 0, -0.31]) M.box(hx, hy + dy + 0.12, 0.19, 0.27, 0.03, 0.13, SIG); // visors
        if (hx < 0) M.box(hx, hy + 0.58, 0, 0.06, 0.16, 0.06, STEEL); // hung from the arm
      }
    },
    // a corner with no traffic coming at it (a one-way street): just the pole, for the walk signals
    sig_post(M) {
      cylY(M, 0, 0, 0, 0.1, 0.085, 3.4, STEEL, 8);
      M.box(0, 0.2, 0, 0.34, 0.4, 0.34, STEEL);
    },
    // a walk signal (+z faces the people across the road it's for)
    ped_head(M) {
      M.box(0, PED_Y, 0.17, 0.34, 0.36, 0.2, SIG);
      M.box(0, PED_Y + 0.2, 0.25, 0.3, 0.03, 0.1, SIG);
      M.box(0, PED_Y, 0.06, 0.06, 0.06, 0.12, STEEL);
    },
    // knocked down: the stump of the pole, the rest of it lying in the gutter with its lamps
    signal_down(M) {
      cylY(M, 0, 0, 0, 0.09, 0.07, 1.1, STEEL, 6);
      M.box(0.25, 0.07, 1.9, 0.12, 0.12, 3.2, STEEL);
      M.box(0.3, 0.15, 3.3, 0.3, 0.26, 0.9, [0.08, 0.08, 0.08]);
    },
    busstop(M) {
      cylY(M, 0, 0, 0, 0.05, 0.05, 2.9, STEEL, 6);
      const g = new THREE.CylinderGeometry(0.28, 0.28, 0.03, 12); g.rotateZ(Math.PI / 2); g.translate(0, 2.62, 0); M.add(g, [0.14, 0.24, 0.34]);
      M.box(0.02, 2.62, 0, 0.036, 0.12, 0.34, [0.86, 0.84, 0.78]);
    },
  };
  function piece(name, v) {
    const key = name + (v ? ':' + v : '');
    if (!pieces[key]) {
      const M = new DV.Vehicles.MB();
      BUILD[name](M, v || 0);
      pieces[key] = M.geometry();
    }
    return pieces[key];
  }

  /* ---------------- the street-name atlas: one row per name ---------------- */
  let atlas = null;
  function signAtlas() {
    if (atlas) return atlas;
    const names = DV.CityMap.avenues.map((a) => a.name).concat(DV.CityMap.streets.map((s) => s.name));
    const ROW = 32, cv = document.createElement('canvas');
    cv.width = 256; cv.height = 1024;
    const g = cv.getContext('2d');
    const rows = {};
    names.forEach((n, i) => {
      const y = i * ROW;
      g.fillStyle = '#2a5a3a'; g.fillRect(0, y, 256, ROW);
      g.strokeStyle = 'rgba(240,240,232,0.7)'; g.lineWidth = 2; g.strokeRect(3, y + 3, 250, ROW - 6);
      g.fillStyle = '#f0f0e8'; g.font = 'bold 17px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(n.toUpperCase(), 128, y + ROW / 2 + 1);
      rows[n] = [1 - (y + ROW) / 1024, 1 - y / 1024];
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    atlas = { tex, rows };
    return atlas;
  }

  /* ---------------- the lamps at night ---------------- */
  // Each lit lamp gets a halo round its head (a point sprite) and a warm pool on the ground
  // under it (a flat additive quad). One shared pair of materials: the hour turns them all up
  // or down together (DV.StreetKit.lampsOn, from World.timeOfDay).
  let glowMats = null;
  function glowTex(soft) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (soft) { g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    else { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.85)'); g.addColorStop(0.4, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(cv);
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
    return t;
  }
  function mats() {
    if (glowMats) return glowMats;
    const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 };
    glowMats = {
      halo: new THREE.PointsMaterial(Object.assign({ size: 2.4, map: glowTex(false), vertexColors: true, sizeAttenuation: true, fog: true }, add)),
      pool: new THREE.MeshBasicMaterial(Object.assign({ map: glowTex(true), color: 0x9a7448, fog: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }, add)),
      on: 0,
    };
    return glowMats;
  }
  // heads: [[x, y, z, colour?, noPool?], …] → a THREE.Group of the halos and the pools under them
  // (a lamp high up, a red beacon on the Fence, has no pool)
  const WARM = [1, 0.84, 0.63];
  function glowGroup(heads) {
    const M = mats(), pos = [], col = [], q = [], uv = [];
    for (const [x, y, z, c, noPool] of heads) {
      pos.push(x, y - 0.12, z);
      col.push(...(c || WARM));
      if (noPool) continue;
      const R = 4.6, Y = 0.07;
      q.push(x - R, Y, z - R, x - R, Y, z + R, x + R, Y, z + R, x - R, Y, z - R, x + R, Y, z + R, x + R, Y, z - R);
      uv.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
    }
    const g = new THREE.Group();
    g.name = 'lamp_glow';
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const halo = new THREE.Points(pg, M.halo);
    halo.renderOrder = 3;
    const qg = new THREE.BufferGeometry();
    qg.setAttribute('position', new THREE.Float32BufferAttribute(q, 3));
    qg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const pool = new THREE.Mesh(qg, M.pool);
    pool.renderOrder = 2;
    g.add(pool, halo);
    g.visible = M.on > 0;
    g.userData.glow = true;
    return g;
  }

  /* ---------------- the signals' lamps ---------------- */
  // a lamp on a signal: where it is (world), which way it faces, what it's for
  function lamp(cx, cz, rot, lx, ly, lz, axis, kind, size) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return { x: cx + lx * c + lz * s, y: ly, z: cz - lx * s + lz * c, nx: s, nz: c, axis, kind, size, st: -1 };
  }
  const LAMP_COL = [[0.05, 0.05, 0.05], [1, 0.13, 0.07], [1, 0.62, 0.08], [0.25, 1, 0.55], [0.95, 0.96, 0.9], [1, 0.46, 0.1]];
  // what a lamp shows: 0 off, 1 red, 2 amber, 3 green, 4 the white man, 5 the hand
  function lampState(R, j, L) {
    if (L.kind === 'ped') { const w = R.walk(j, L.axis); return w === 'walk' ? 4 : w === 'flash' ? (Math.floor(R.t * 2) % 2 ? 5 : 0) : 5; }
    const l = R.light(j, L.axis);
    return l === L.kind ? (l === 'r' ? 1 : l === 'a' ? 2 : 3) : 0;
  }
  let sigMats = null;
  function sigMaterials() {
    if (sigMats) return sigMats;
    sigMats = {
      face: new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }),
      halo: new THREE.PointsMaterial({ size: 0.9, map: glowTex(false), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true, opacity: 0.4 }),
    };
    return sigMats;
  }

  /* ---------------- placing everything (data only) ---------------- */
  class Kit {
    constructor(zone, city, opts) {
      this.zone = zone;
      this.city = city;
      this.opts = opts || {};
      this.chunks = new Map();
      this.parked = []; // parked cars: { x, z, rot, w, l } (the traffic steers clear of them)
      this.r = U.rng(this.opts.seed || 77);
      this.solidHash = new Map();
      for (const q of city.walk.solids) this.hashRect(this.solidHash, q, q);
      const L = zone.openAir || zone.lighting.sample(zone.bx0 - 50, 1.3, zone.bz0 - 50, 0, 1, 0, null, true);
      this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, color: new THREE.Color(U.clamp(L[0] * 0.95, 0.3, 1.2), U.clamp(L[1] * 0.95, 0.3, 1.2), U.clamp(L[2] * 0.95, 0.3, 1.2)) });
      this.signMat = new THREE.MeshBasicMaterial({ map: signAtlas().tex, fog: true, color: this.mat.color.clone() });
      this.roads = DV.Roads.build(city, (x, z, r) => this.blocked(x, z, r));
      this.sigCorners = new Set();
      this.place();
    }
    hashRect(h, q, val) {
      for (let i = Math.floor(q[0] / 8); i <= Math.floor(q[2] / 8); i++) for (let j = Math.floor(q[1] / 8); j <= Math.floor(q[3] / 8); j++) {
        const k = i * 100003 + j;
        let l = h.get(k);
        if (!l) h.set(k, (l = []));
        l.push(val);
      }
    }
    // would something with this footprint stand in a building (or a column of the L)?
    blocked(x, z, r) {
      const l = this.solidHash.get(Math.floor(x / 8) * 100003 + Math.floor(z / 8));
      if (!l) return false;
      for (const q of l) if (x + r > q[0] && x - r < q[2] && z + r > q[1] && z - r < q[3]) return true;
      return false;
    }
    chunk(x, z) {
      const i = Math.floor(x / CHUNK), j = Math.floor(z / CHUNK), k = i * 100003 + j;
      let c = this.chunks.get(k);
      if (!c) this.chunks.set(k, (c = { i, j, cx: (i + 0.5) * CHUNK, cz: (j + 0.5) * CHUNK, items: [], blades: [], paint: [], mesh: null, signs: null }));
      return c;
    }
    add(name, x, z, rot, opts) {
      opts = opts || {};
      if (!opts.force && this.blocked(x, z, opts.r || 0.35)) return false;
      this.chunk(x, z).items.push({ name, x, z, rot, v: opts.v || 0, col: opts.col, car: opts.car || null });
      return true;
    }

    place() {
      const CM = DV.CityMap, r = this.r;
      const skip = this.opts.skip || null; // the zone dresses its own street
      this.placeSignals(skip);
      this.placeMarkings(skip);
      for (const pd of this.city.walk.pads) {
        const [x0, z0, x1, z1] = pd.r;
        if (skip && x1 > skip[0] && x0 < skip[2] && z1 > skip[1] && z0 < skip[3]) continue;
        if (x1 - x0 < 6 || z1 - z0 < 6) continue;
        const dz = DRESS[pd.d] || DRESS.none;
        // the four kerbs: [axis the kerb runs along, its line, from, to, which way the road is]
        const sides = [];
        if (pd.edge[1]) sides.push({ along: 'x', line: z0, a: x0, b: x1, out: -1 });
        if (pd.edge[3]) sides.push({ along: 'x', line: z1, a: x0, b: x1, out: 1 });
        if (pd.edge[0]) sides.push({ along: 'z', line: x0, a: z0, b: z1, out: -1 });
        if (pd.edge[2]) sides.push({ along: 'z', line: x1, a: z0, b: z1, out: 1 });
        for (const sd of sides) this.dressKerb(sd, dz, pd);
        // corners: a street sign on two of them, a dead signal on another
        const ewN = nearestLine(CM.streets, 'z', z0 - 6), ewS = nearestLine(CM.streets, 'z', z1 + 6);
        const nsW = nearestLine(CM.avenues, 'x', x0 - 6), nsE = nearestLine(CM.avenues, 'x', x1 + 6);
        if (pd.edge[0] && pd.edge[1] && ewN && nsW) this.cornerSign(x0 + 0.6, z0 + 0.6, ewN.name, nsW.name);
        if (pd.edge[2] && pd.edge[3] && ewS && nsE) this.cornerSign(x1 - 0.6, z1 - 0.6, ewS.name, nsE.name);
        if (pd.edge[2] && pd.edge[1] && r() < dz.signal && !this.sigCorner(x1 - 0.6, z0 + 0.6)) this.add(dz.broken && r() < dz.broken ? 'signal_down' : 'signal', x1 - 0.6, z0 + 0.6, -Math.PI / 2, { r: 0.2 });
      }
    }
    /* ---------------- signals and road markings ---------------- */
    sigCorner(x, z) { return this.sigCorners.has(Math.round(x) + ':' + Math.round(z)); }
    // every working junction: a pole on each corner. The traffic's signal is on the far right corner
    // as it comes (with a second head on the arm over its lane); walk signals face across each road
    placeSignals(skip) {
      const R = this.roads;
      for (const j of R.junctions) {
        if (!j.signal) continue;
        const [x0, z0, x1, z1] = j.box, o = 0.6;
        if (skip && x1 + o > skip[0] && x0 - o < skip[2] && z1 + o > skip[1] && z0 - o < skip[3]) { j.signal = false; continue; }
        j.lamps = [];
        // [heading of the traffic it's for, the corner]
        for (const [hx, hz, cx, cz] of [[1, 0, x1 + o, z1 + o], [-1, 0, x0 - o, z0 - o], [0, 1, x0 - o, z1 + o], [0, -1, x1 + o, z0 - o]]) {
          const line = hx ? j.st : j.av, axis = hx ? 'x' : 'z';
          const comes = !line.oneWay || line.oneWay === (hx || hz);
          const rot = Math.atan2(-hx, -hz);
          this.chunk(cx, cz).items.push({ name: comes ? 'sig_pole' : 'sig_post', x: cx, z: cz, rot, v: 0, sig: true });
          this.sigCorners.add(Math.round(cx) + ':' + Math.round(cz));
          if (comes) for (const [lx, ly] of SIG_HEADS) for (const [dy, kind] of [[0.31, 'r'], [0, 'a'], [-0.31, 'g']]) j.lamps.push(lamp(cx, cz, rot, lx, ly + dy, 0.135, axis, kind, 0.1));
          // walk signals on this corner, one facing across each road
          const sx = Math.sign(cx - j.x), sz = Math.sign(cz - j.z);
          for (const [fx, fz, ax] of [[-sx, 0, 'x'], [0, -sz, 'z']]) {
            const pr = Math.atan2(fx, fz);
            this.chunk(cx, cz).items.push({ name: 'ped_head', x: cx, z: cz, rot: pr, v: 0, sig: true });
            j.lamps.push(lamp(cx, cz, pr, 0, PED_Y, 0.275, ax, 'ped', 0.13));
          }
        }
      }
    }
    // paint: continental crossings on every arm of every junction, stop lines, the double yellow
    // down two-way streets and the parking lanes' lines; worn where nobody repaints it
    placeMarkings(skip) {
      const CM = DV.CityMap, R = this.roads, CW = DV.Roads.CW, STOP = DV.Roads.STOP;
      const WHITE = [0.6, 0.6, 0.57], YELLOW = [0.62, 0.47, 0.14];
      const WEAR = { factionless: 0.7, dauntless: 0.4, abnegation: 0.16, testing: 0.14, downtown: 0.05, erudite: 0.03, candor: 0.07 };
      const r = U.rng(31);
      const paint = (x0, z0, x1, z1, col, wear) => {
        if (skip && x1 > skip[0] && x0 < skip[2] && z1 > skip[1] && z0 < skip[3]) return;
        if (r() < wear * 0.55) return; // worn away
        const k = 1 - wear * (0.25 + r() * 0.5);
        this.chunk((x0 + x1) / 2, (z0 + z1) / 2).paint.push([x0, z0, x1, z1, col[0] * k, col[1] * k, col[2] * k]);
      };
      // a long line, in pieces (so it wears in patches, and each piece lands in the chunk it's in)
      const run = (rect, s0, s1, t0, t1, col, wear, dash, gap) => {
        for (let s = s0; s < s1 - 0.2; s += dash + (gap || 0)) rect(s, Math.min(s1, s + dash), t0, t1, col, wear);
      };
      for (const line of CM.avenues.concat(CM.streets)) {
        const js = R.along(line);
        if (!js.length) continue;
        const along = line.x !== undefined ? 'z' : 'x'; // (an avenue runs along z)
        const [k0, k1] = CM.road(line), cc = (k0 + k1) / 2, w = k1 - k0;
        const rect = (s0, s1, t0, t1, col, wear) => (along === 'x' ? paint(s0, t0, s1, t1, col, wear) : paint(t0, s0, t1, s1, col, wear));
        const span = (j) => (along === 'x' ? [j.box[0], j.box[2]] : [j.box[1], j.box[3]]);
        const wearAt = (j) => (WEAR[j.district] !== undefined ? WEAR[j.district] : 0.15);
        // which side of the road each direction's traffic keeps to (keep right)
        const side = (dir) => (line.oneWay ? [k0 + 0.25, k1 - 0.25] : (along === 'x') === (dir > 0) ? [cc + 0.1, k1 - 0.25] : [k0 + 0.25, cc - 0.1]);
        for (const j of js) {
          const [a, b] = span(j), wear = wearAt(j);
          // the crossings either side of the junction: bars along the traffic, across the road
          if (j.signal || j.district !== 'factionless') for (const [c0, c1] of [[a - CW, a], [b, b + CW]]) for (let t = k0 + 0.5; t + 0.5 <= k1 - 0.35; t += 1.05) rect(c0 + 0.15, c1 - 0.15, t, t + 0.55, WHITE, wear);
        }
        for (let i = 0; i + 1 < js.length; i++) {
          const A = js[i], Bj = js[i + 1], wear = Math.max(wearAt(A), wearAt(Bj));
          const s0 = span(A)[1] + CW, s1 = span(Bj)[0] - CW;
          if (s1 - s0 < 10 || s1 - s0 > 150) continue;
          // stop lines: where each direction's traffic comes up to a junction
          for (const dir of line.oneWay ? [line.oneWay] : [1, -1]) {
            const [t0, t1] = side(dir);
            if (dir > 0) rect(s1 - STOP - 0.45, s1 - STOP, t0, t1, WHITE, wear * 0.6);
            else rect(s0 + STOP, s0 + STOP + 0.45, t0, t1, WHITE, wear * 0.6);
          }
          const m0 = s0 + STOP + 1.2, m1 = s1 - STOP - 1.2;
          if (!line.oneWay) {
            // the double yellow
            run(rect, m0, m1, cc - 0.21, cc - 0.09, YELLOW, wear, 12);
            run(rect, m0, m1, cc + 0.09, cc + 0.21, YELLOW, wear, 12);
          }
          // the parking lanes' lines (dashed)
          if (w >= 11) { run(rect, m0 + 2, m1, k0 + 2.25, k0 + 2.37, WHITE, wear, 2.8, 5.2); run(rect, m0 + 2, m1, k1 - 2.37, k1 - 2.25, WHITE, wear, 2.8, 5.2); }
        }
      }
    }

    // along one kerb: lamps, trees, a hydrant, benches and bins, parked cars in the road beside it
    dressKerb(sd, dz, pd) {
      const r = this.r, len = sd.b - sd.a;
      // a point on the pavement `ins` in from the kerb, t along it; and the facing towards the road
      const P = (t, ins) => (sd.along === 'x' ? [t, sd.line - sd.out * ins] : [sd.line - sd.out * ins, t]);
      const face = sd.along === 'x' ? (sd.out > 0 ? 0 : Math.PI) : sd.out > 0 ? Math.PI / 2 : -Math.PI / 2;
      // lamps every 28 m, alternating which end they start from
      const lampAt = [];
      const off = 7 + r() * 6;
      for (let t = sd.a + off; t < sd.b - 4; t += 28) {
        const [x, z] = P(t, 0.55);
        if (this.add(dz.broken && r() < dz.broken ? 'lamp_dead' : 'lamp', x, z, face, { r: 0.15 })) lampAt.push(t);
      }
      // trees between them
      for (let t = sd.a + 5; t < sd.b - 5; t += 9.5) {
        if (lampAt.some((q) => Math.abs(q - t) < 3)) continue;
        if (r() > dz.tree) continue;
        const [x, z] = P(t, 0.9);
        const bare = r() < dz.bare;
        this.add(bare ? (dz.broken && r() < 0.4 ? 'stump' : 'tree_bare') : 'tree', x, z, r() * 6.28, { v: Math.floor(r() * 4), r: 0.6 });
      }
      // a hydrant near one end
      if (r() < 0.6) { const [x, z] = P(sd.a + 3.5 + r() * 2, 0.45); this.add('hydrant', x, z, face, { r: 0.2 }); }
      // benches, bins and newspaper boxes back by the building fronts
      for (let t = sd.a + 12; t < sd.b - 12; t += 14) {
        const q = r();
        if (q < dz.bench) { const [x, z] = P(t, 2.55); this.add('bench', x, z, face, { r: 0.9 }); }
        else if (q < dz.bench + dz.bin) { const [x, z] = P(t, 0.5); if (!lampAt.some((p) => Math.abs(p - t) < 1.5)) this.add('bin', x, z, face, { r: 0.3 }); }
        else if (q < dz.bench + dz.bin + dz.news) { const [x, z] = P(t, 2.6); this.add('news', x, z, face, { r: 0.6 }); }
      }
      // cars parked along the kerb, facing the way the traffic on this side goes
      this.parkAlong(sd, dz);
    }
    parkAlong(sd, dz) {
      const r = this.r, CM = DV.CityMap;
      // which street is this kerb on, and which way does its traffic go on this side?
      const line = sd.along === 'x' ? nearestLine(CM.streets, 'z', sd.line + sd.out * 5) : nearestLine(CM.avenues, 'x', sd.line + sd.out * 5);
      if (!line) return;
      // keep right: a street running along x has its westbound traffic on the north side
      let heading;
      if (line.oneWay) heading = sd.along === 'x' ? (line.oneWay > 0 ? Math.PI / 2 : -Math.PI / 2) : line.oneWay > 0 ? 0 : Math.PI;
      else if (sd.along === 'x') heading = sd.out < 0 ? Math.PI / 2 : -Math.PI / 2; // (a kerb with the road to its north is the south kerb: eastbound)
      else heading = sd.out < 0 ? Math.PI : 0; // the road to the west of an east kerb: northbound on it
      for (let t = sd.a + 9; t < sd.b - 9; t += 6.2) {
        if (r() > dz.car) continue;
        let kind = r() < 0.3 ? 'hatch' : r() < 0.85 ? 'sedan' : 'van';
        if (dz.jeeps && r() < 0.35) kind = 'jeep';
        const wreck = !!dz.wreck && r() < 0.7;
        const info = DV.Vehicles.model(kind, { seed: Math.floor(r() * 997) }).info;
        const inset = 0.28 + info.width / 2;
        const x = sd.along === 'x' ? t : sd.line + sd.out * inset, z = sd.along === 'x' ? sd.line + sd.out * inset : t;
        const rot = heading + (wreck ? (r() - 0.5) * 0.3 : (r() - 0.5) * 0.03);
        const car = { kind, seed: Math.floor(r() * 997), wreck, x, z, rot, w: info.width, l: info.length };
        if (this.add('car', x, z, rot, { car, r: 1.2 })) { this.parked.push(car); t += info.length - 4.2; }
      }
    }
    cornerSign(x, z, ew, ns) {
      // (a working signal's pole on this corner carries the names instead)
      if (!this.sigCorner(x, z) && !this.add('signpost', x, z, 0, { r: 0.1 })) return;
      const c = this.chunk(x, z);
      c.blades.push({ x, z, y: 2.95, along: 'x', name: ew }, { x, z, y: 2.72, along: 'z', name: ns });
    }

    /* ---------------- building and showing the chunks ---------------- */
    buildChunk(c) {
      const M = new DV.Vehicles.MB();
      const zone = this.zone;
      // the road paint, a hair above the asphalt (in the same mesh: no extra draw call)
      for (const q of c.paint) M.flat(q[0], q[1], q[2], q[3], 0.022, [q[4], q[5], q[6]]);
      for (const it of c.items) {
        M.push(it.x, 0, it.z, it.rot);
        if (it.car) M.merge(DV.Vehicles.model(it.car.kind, { seed: it.car.seed, wreck: it.car.wreck }).geo);
        else M.merge(piece(it.name, it.name === 'tree' ? it.v : 0));
        M.pop();
        // colliders for what you'd walk into
        if (it.car) {
          const cc = Math.abs(Math.cos(it.rot)), ss = Math.abs(Math.sin(it.rot));
          const hx = (it.car.w * cc + it.car.l * ss) / 2, hz = (it.car.w * ss + it.car.l * cc) / 2;
          zone.colliders.add(it.x - hx, it.z - hz, it.x + hx, it.z + hz, { y1: 1.5, tag: 'vehicle' });
        } else {
          const rad = { lamp: 0.12, lamp_dead: 0.12, signal: 0.1, sig_pole: 0.13, sig_post: 0.12, tree: 0.18, tree_bare: 0.17, stump: 0.2, hydrant: 0.18, bin: 0.28, signpost: 0.06, busstop: 0.06, bench: 0, news: 0.5, signal_down: 0 }[it.name];
          if (rad) zone.colliders.add(it.x - rad, it.z - rad, it.x + rad, it.z + rad, { y1: it.name === 'hydrant' || it.name === 'stump' ? 0.7 : 3, tag: 'city', camera: false });
          if (it.name === 'bench') zone.colliders.addRotated(it.x, it.z, 0.9, 0.25, it.rot, { y1: 0.5, tag: 'city', camera: false });
        }
      }
      if (M.count) {
        c.mesh = new THREE.Mesh(M.geometry(), this.mat);
        c.mesh.name = 'street_chunk';
        zone.group.add(c.mesh);
      }
      // the working lamps: the head is 1.5 m out along the arm, over the road
      const heads = c.items.filter((it) => it.name === 'lamp').map((it) => [it.x + Math.sin(it.rot) * 1.5, 5.91, it.z + Math.cos(it.rot) * 1.5]);
      if (heads.length) { c.glow = glowGroup(heads); zone.group.add(c.glow); }
      if (c.blades.length) {
        const A = signAtlas(), pos = [], uv = [];
        for (const b of c.blades) {
          const row = A.rows[b.name];
          if (!row) continue;
          const L = 1.25, H = 0.2;
          // the blade sticks out from the post along its street, readable from both sides
          const dx = b.along === 'x' ? 1 : 0, dz = b.along === 'z' ? 1 : 0;
          const ox = b.x + dx * L * 0.45, oz = b.z + dz * L * 0.45;
          const a = [ox - dx * L / 2, b.y - H / 2, oz - dz * L / 2], bb = [ox + dx * L / 2, b.y - H / 2, oz + dz * L / 2];
          const cq = [bb[0], b.y + H / 2, bb[2]], d = [a[0], b.y + H / 2, a[2]];
          for (const [p0, p1, p2, p3, u0, u1] of [[a, bb, cq, d, 0, 1], [bb, a, d, cq, 0, 1]]) {
            pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
            uv.push(u0, row[0], u1, row[0], u1, row[1], u0, row[0], u1, row[1], u0, row[1]);
          }
        }
        // (all the chunks' blades are one mesh: see blades())
        if (pos.length) { c.bladePos = pos; c.bladeUV = uv; this.bladesDirty = true; }
      }
      c.built = true;
    }
    // every built chunk's street-name blades in one mesh (one draw call, not one a chunk)
    blades() {
      this.bladesDirty = false;
      const pos = [], uv = [];
      for (const c of this.chunks.values()) if (c.bladePos) { pos.push(...c.bladePos); uv.push(...c.bladeUV); }
      if (this.bladeMesh) { this.bladeMesh.geometry.dispose(); this.zone.group.remove(this.bladeMesh); this.bladeMesh = null; }
      if (!pos.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      this.bladeMesh = new THREE.Mesh(g, this.signMat);
      this.bladeMesh.name = 'street_signs';
      this.zone.group.add(this.bladeMesh);
    }
    // the time of day: the furniture and parked cars darken with the light
    dim(k) {
      if (this.dimK === k) return;
      this.dimK = k;
      if (!this.baseCol) { this.baseCol = this.mat.color.clone(); this.baseSign = this.signMat.color.clone(); }
      this.mat.color.copy(this.baseCol).multiplyScalar(k);
      this.signMat.color.copy(this.baseSign).multiplyScalar(k);
    }
    // call every frame with the camera's position: builds at most one chunk a frame
    update(px, pz) {
      let want = null, wd = 1e9;
      for (const c of this.chunks.values()) {
        const d = Math.hypot(c.cx - px, c.cz - pz);
        if (!c.built) { if (d < BUILD_R && d < wd) { wd = d; want = c; } continue; }
        const vis = d < SHOW_R && !this.hidden;
        if (c.mesh) c.mesh.visible = vis;
        if (c.glow) c.glow.visible = vis && !!glowMats && glowMats.on > 0;
      }
      if (want) this.buildChunk(want);
      if (this.bladesDirty) this.blades();
      if (this.bladeMesh) this.bladeMesh.visible = !this.hidden;
      this.updateSignals(px, pz);
    }
    // the signals' lamps near you: one mesh (and a halo each), rebuilt as you move on, recoloured
    // only when a lamp changes
    buildSignals(px, pz) {
      const S = this.sig;
      if (S) { this.zone.group.remove(S.mesh, S.halo); S.mesh.geometry.dispose(); S.halo.geometry.dispose(); }
      const lamps = [];
      for (const j of this.roads.junctions) if (j.signal && j.lamps && Math.hypot(j.x - px, j.z - pz) < 230) for (const L of j.lamps) { L.j = j; L.st = -1; lamps.push(L); }
      const pos = new Float32Array(lamps.length * 18), hp = new Float32Array(lamps.length * 3);
      lamps.forEach((L, i) => {
        const rx = L.nz, rz = -L.nx, s = L.size, o = i * 18;
        const P = (a, b) => [L.x + rx * a + L.nx * 0.01, L.y + b, L.z + rz * a + L.nz * 0.01];
        const v = [P(-s, -s), P(s, -s), P(s, s), P(-s, -s), P(s, s), P(-s, s)];
        for (let k = 0; k < 6; k++) pos.set(v[k], o + k * 3);
        hp.set([L.x + L.nx * 0.08, L.y, L.z + L.nz * 0.08], i * 3);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(lamps.length * 18), 3));
      const hg = new THREE.BufferGeometry();
      hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
      hg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(lamps.length * 3), 3));
      const M = sigMaterials();
      const mesh = new THREE.Mesh(g, M.face), halo = new THREE.Points(hg, M.halo);
      mesh.name = 'signal_lamps'; halo.name = 'signal_halos'; halo.renderOrder = 3;
      this.zone.group.add(mesh, halo);
      this.sig = { cx: px, cz: pz, lamps, mesh, halo };
    }
    updateSignals(px, pz) {
      if (!this.sig || Math.hypot(px - this.sig.cx, pz - this.sig.cz) > 70) this.buildSignals(px, pz);
      const S = this.sig, R = this.roads;
      const night = glowMats ? glowMats.on : 0;
      S.mesh.visible = !this.hidden;
      S.halo.visible = !this.hidden && night > 0.02;
      if (this.hidden || !S.lamps.length) return;
      const col = S.mesh.geometry.attributes.color, hc = S.halo.geometry.attributes.color;
      let changed = false;
      for (let i = 0; i < S.lamps.length; i++) {
        const L = S.lamps[i], st = lampState(R, L.j, L);
        if (st === L.st) continue;
        L.st = st; changed = true;
        const c = LAMP_COL[st];
        for (let k = 0; k < 6; k++) col.array.set(c, i * 18 + k * 3);
        hc.array.set(st ? c : [0, 0, 0], i * 3);
      }
      if (changed) { col.needsUpdate = true; hc.needsUpdate = true; }
      // brighter halos after dark
      sigMaterials().halo.opacity = 0.35 + 0.55 * night;
    }
    // build everything within reach now (on arrival, so nothing pops in where you stand)
    warm(px, pz) {
      for (const c of this.chunks.values()) if (!c.built && Math.hypot(c.cx - px, c.cz - pz) < BUILD_R) this.buildChunk(c);
      this.update(px, pz);
    }
    dispose() {
      for (const c of this.chunks.values()) {
        if (c.mesh) { c.mesh.geometry.dispose(); if (c.mesh.parent) c.mesh.parent.remove(c.mesh); }
        if (c.signs) { c.signs.geometry.dispose(); if (c.signs.parent) c.signs.parent.remove(c.signs); }
        if (this.bladeMesh) { this.bladeMesh.geometry.dispose(); if (this.bladeMesh.parent) this.bladeMesh.parent.remove(this.bladeMesh); this.bladeMesh = null; }
        if (c.glow) { c.glow.children.forEach((o) => o.geometry.dispose()); if (c.glow.parent) c.glow.parent.remove(c.glow); }
      }
      this.mat.dispose();
      this.signMat.dispose();
      if (this.sig) { this.sig.mesh.geometry.dispose(); this.sig.halo.geometry.dispose(); }
    }
  }
  function nearestLine(lines, key, v) {
    let best = null, bd = 9;
    for (const l of lines) { const d = Math.abs(l[key] - v); if (d < bd) { bd = d; best = l; } }
    return best;
  }

  DV.StreetKit = {
    attach(zone, city, opts) {
      const kit = new Kit(zone, city, opts);
      zone.streetKit = kit;
      zone.roads = kit.roads;
      return kit;
    },
    // halos and pools for lamps a zone placed itself (heads: [[x, y, z], …])
    glow(zone, heads) {
      const g = glowGroup(heads);
      zone.group.add(g);
      return g;
    },
    glowTexture() { return glowTex(false); },
    // how far on the lamps are (0 by day … 1 at night)
    lampsLevel() { return glowMats ? glowMats.on : 0; },
    // 0 (day) … 1 (night): every lamp in the zone, all at once
    lampsOn(k, zone) {
      const M = mats();
      k = Math.round(U.clamp(k, 0, 1) * 100) / 100;
      if (M.on === k) return;
      M.on = k;
      M.halo.opacity = 0.9 * k;
      M.pool.opacity = 0.8 * k;
      // (the kit's chunks follow on its next update)
      if (zone && zone.lampGlow) zone.lampGlow.visible = k > 0;
    },
  };
})();
