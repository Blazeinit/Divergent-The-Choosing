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
      if (!c) this.chunks.set(k, (c = { i, j, cx: (i + 0.5) * CHUNK, cz: (j + 0.5) * CHUNK, items: [], blades: [], mesh: null, signs: null }));
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
        if (pd.edge[2] && pd.edge[1] && r() < dz.signal) this.add(dz.broken && r() < dz.broken ? 'signal_down' : 'signal', x1 - 0.6, z0 + 0.6, -Math.PI / 2, { r: 0.2 });
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
      if (!this.add('signpost', x, z, 0, { r: 0.1 })) return;
      const c = this.chunk(x, z);
      c.blades.push({ x, z, y: 2.95, along: 'x', name: ew }, { x, z, y: 2.72, along: 'z', name: ns });
    }

    /* ---------------- building and showing the chunks ---------------- */
    buildChunk(c) {
      const M = new DV.Vehicles.MB();
      const zone = this.zone;
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
          const rad = { lamp: 0.12, lamp_dead: 0.12, signal: 0.1, tree: 0.18, tree_bare: 0.17, stump: 0.2, hydrant: 0.18, bin: 0.28, signpost: 0.06, busstop: 0.06, bench: 0, news: 0.5, signal_down: 0 }[it.name];
          if (rad) zone.colliders.add(it.x - rad, it.z - rad, it.x + rad, it.z + rad, { y1: it.name === 'hydrant' || it.name === 'stump' ? 0.7 : 3, tag: 'city', camera: false });
          if (it.name === 'bench') zone.colliders.addRotated(it.x, it.z, 0.9, 0.25, it.rot, { y1: 0.5, tag: 'city', camera: false });
        }
      }
      if (M.count) {
        c.mesh = new THREE.Mesh(M.geometry(), this.mat);
        c.mesh.name = 'street_chunk';
        zone.group.add(c.mesh);
      }
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
        if (pos.length) {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
          c.signs = new THREE.Mesh(g, this.signMat);
          c.signs.name = 'street_signs';
          zone.group.add(c.signs);
        }
      }
      c.built = true;
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
        if (c.signs) c.signs.visible = vis;
      }
      if (want) this.buildChunk(want);
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
      }
      this.mat.dispose();
      this.signMat.dispose();
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
      return kit;
    },
  };
})();
