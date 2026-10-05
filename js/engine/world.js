/* ==========================================================================
   DIVERGENT — zone builder & world manager
   A zone is pure data (rooms, doors, windows, props, spots, triggers).
   This file turns that data into: baked-lit static geometry, walls with
   door/window openings, colliders, a navigation grid, a light grid for
   dynamic objects, and dynamic door objects.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const G = DV.Config.GRID;
  const T = 0.2; // wall thickness
  const NG = DV.NavGrid;
  const OPEN_AIR = -2; // a batch "room" for things out in the weather over the rooms (the roof)

  /* ------------------------------ registry ------------------------------ */
  DV.Zones = {
    defs: {},
    define(id, def) {
      def.id = id;
      this.defs[id] = def;
      return def;
    },
    get(id) {
      return this.defs[id];
    },
  };

  /* ------------------------------ lighting ------------------------------ */
  class Lighting {
    constructor(zone) {
      this.zone = zone;
      this.rooms = zone.rooms;
      const ext = zone.def.exterior || {};
      this.sunDir = new THREE.Vector3().fromArray(ext.sunDir || [0.4, 0.8, 0.35]).normalize();
      this.sunColor = ext.sunColor || [0.55, 0.53, 0.5];
      this.skyAmbient = ext.ambient || [0.55, 0.56, 0.6];
    }
    sample(px, py, pz, nx, ny, nz, roomIdx, omni) {
      let r = roomIdx !== null && roomIdx !== undefined && roomIdx >= 0 ? this.rooms[roomIdx] : null;
      // (OPEN_AIR: up on the roof, over the rooms but under the sky: lit by the sun, not their lamps)
      if (!r && roomIdx !== OPEN_AIR) {
        const ri = this.zone.roomIndexAt(px, pz);
        r = ri >= 0 ? this.rooms[ri] : null;
      }
      let cr, cg, cb;
      if (!r || r.exterior) {
        const amb = (r && r.light && r.light.ambient) || this.skyAmbient;
        const ndl = omni ? 0.7 : Math.max(0, nx * this.sunDir.x + ny * this.sunDir.y + nz * this.sunDir.z);
        const sky = omni ? 0.15 : Math.max(0, ny) * 0.15;
        cr = amb[0] + this.sunColor[0] * ndl + sky;
        cg = amb[1] + this.sunColor[1] * ndl + sky;
        cb = amb[2] + this.sunColor[2] * ndl + sky * 1.2;
        // exterior lights (lamps) still count
        if (r && r.lights) {
          const add = this.accum(r, px, py, pz, nx, ny, nz, omni);
          cr += add[0]; cg += add[1]; cb += add[2];
        }
      } else {
        const amb = r.light.ambient;
        cr = amb[0]; cg = amb[1]; cb = amb[2];
        const add = this.accum(r, px, py, pz, nx, ny, nz, omni);
        cr += add[0]; cg += add[1]; cb += add[2];
      }
      // cheap ambient occlusion where walls meet the floor
      if (!omni && Math.abs(ny) < 0.5 && py < 0.45) {
        const f = 0.62 + 0.38 * (py / 0.45);
        cr *= f; cg *= f; cb *= f;
      }
      if (!omni && ny < -0.5) { cr *= 0.85; cg *= 0.85; cb *= 0.85; } // ceilings slightly darker
      return [Math.min(cr, 1.6), Math.min(cg, 1.6), Math.min(cb, 1.6)];
    }
    accum(r, px, py, pz, nx, ny, nz, omni) {
      let cr = 0, cg = 0, cb = 0;
      for (const l of r.lights) {
        const dx = l.x - px, dy = l.y - py, dz = l.z - pz;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > l.range) continue;
        const a = 1 - d / l.range;
        const att = a * a;
        let ndl = 1;
        if (!omni && d > 1e-4) {
          ndl = (nx * dx + ny * dy + nz * dz) / d;
          ndl = U.clamp((ndl + 0.3) / 1.3, 0, 1);
        }
        const k = att * ndl * l.intensity;
        cr += l.color[0] * k; cg += l.color[1] * k; cb += l.color[2] * k;
      }
      return [cr, cg, cb];
    }
  }

  /* -------------------------------- Zone -------------------------------- */
  class Zone {
    constructor(def) {
      this.def = def;
      this.id = def.id;
      this.built = false;
      this.group = new THREE.Group();
      this.group.name = 'zone:' + def.id;
      this.colliders = new DV.CollisionWorld();
      this.doors = [];
      this.doorMap = {};
      this.spots = {};
      this.interactables = [];
      this.triggers = [];
      this.updaters = [];
      this.pickups = [];
      this.rooms = [];
      this.roomMap = {};
    }

    roomIndexAt(x, z) {
      if (this.nav) return this.nav.roomAt(x, z);
      for (let i = 0; i < this.rooms.length; i++) if (U.inRect(x, z, this.rooms[i])) return i;
      return -1;
    }
    roomAt(x, z) {
      const i = this.roomIndexAt(x, z);
      return i >= 0 ? this.rooms[i] : null;
    }
    // can someone stand at (x, z)? the authored rooms, or (where the zone has a walkable city
    // round it) the open streets outside them; buildings out there are colliders
    walkable(x, z) {
      return this.roomIndexAt(x, z) >= 0 || !!(this.city && this.city.walk && this.city.walkable(x, z));
    }
    // what the HUD and the save slots call the place at (x, z)
    placeName(x, z) {
      const room = this.roomAt(x, z);
      if (room) return { name: room.name, sub: this.def.region || '' };
      if (this.city && this.city.walk && DV.CityMap) return DV.CityMap.locate(x, z);
      return { name: this.def.name, sub: this.def.region || '' };
    }
    spot(id) {
      return this.spots[id] || null;
    }

    /* ----------------------------- build ----------------------------- */
    build() {
      const t0 = performance.now();
      const def = this.def;
      const b = def.bounds;
      this.bx0 = b.x0; this.bz0 = b.z0;
      this.W = Math.round((b.x1 - b.x0) / G);
      this.H = Math.round((b.z1 - b.z0) / G);

      // rooms
      def.rooms.forEach((r, idx) => {
        const room = Object.assign({}, r);
        room.index = idx;
        room.h = r.h || 3.2;
        room.wall = r.wall || 'paint_wall';
        room.floor = r.floor || 'concrete';
        room.ceiling = r.ceiling || 'ceiling_tile';
        room.light = Object.assign({ ambient: [0.38, 0.38, 0.4], color: [1, 0.97, 0.9], intensity: 0.8, spacing: 4, range: 6.5, fixture: 'panel' }, r.light || {});
        this.rooms.push(room);
        this.roomMap[r.id] = room;
      });

      // nav grid + room raster
      const nav = (this.nav = new DV.NavGrid(b.x0, b.z0, this.W, this.H, G));
      this.rooms.forEach((r, idx) => {
        const i0 = Math.round((r.x0 - b.x0) / G), i1 = Math.round((r.x1 - b.x0) / G);
        const j0 = Math.round((r.z0 - b.z0) / G), j1 = Math.round((r.z1 - b.z0) / G);
        for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) {
          if (!nav.inside(i, j)) continue;
          const k = nav.idx(i, j);
          nav.room[k] = idx;
          nav.walk[k] = r.noWalk ? 0 : 1;
        }
      });

      // lights
      this.placeLights();
      this.lighting = new Lighting(this);
      const batch = (this.batch = new DV.StaticBatch(this.lighting));

      // floors, ceilings, fixtures
      batch.maxEdge = 1.25;
      for (const r of this.rooms) {
        batch.room = r.index;
        if (!r.noFloor) batch.flat(DV.Mat.get(r.floor), r.x0, r.z0, r.x1, r.z1, r.floorY || 0);
        if (!r.exterior && !r.noCeiling) {
          const cm = DV.Mat.get(r.ceiling);
          const w = (cm.map && cm.map.userData.world) || 1;
          batch.quad(cm, [r.x0, r.h, r.z0], [r.x1, r.h, r.z0], [r.x1, r.h, r.z1], [r.x0, r.h, r.z1],
            [r.x0 / w, r.z0 / w], [r.x1 / w, r.z0 / w], [r.x1 / w, r.z1 / w], [r.x0 / w, r.z1 / w]);
        }
      }
      batch.maxEdge = 0;
      this.buildFixtures();

      // walls + openings
      batch.maxEdge = 1.1;
      this.buildWalls();
      batch.maxEdge = 0;

      // props
      this.ctx = this.makeCtx();
      for (const p of def.props || []) this.buildProp(p);
      if (def.build) def.build(this.ctx);
      // a roof over the rooms, for a building the city (or the sky) looks down on (def.roof; a zone
      // that needs it sooner builds its own from build(): see buildRoof)
      if (def.roof && !this.roof) this.buildRoof(def.roof === true ? {} : def.roof);

      // doors (dynamic)
      for (const d of def.doors || []) this.buildDoor(d);
      this.buildPickups();

      // spots defined directly in the zone
      for (const id in def.spots || {}) this.addSpot(id, def.spots[id]);

      // rasterize prop colliders into nav
      this.rasterizeColliders();
      // wall proximity costs: keep NPCs away from walls
      for (let k = 0; k < nav.walk.length; k++) if (nav.walk[k] && nav.edges[k]) nav.cost[k] += 0.6;
      // compute approach points for spots
      for (const id in this.spots) {
        const s = this.spots[id];
        const a = s.approach ? nav.nearestWalkable(s.approach[0], s.approach[1], 5) || nav.nearestWalkable(s.x, s.z, 6) : nav.nearestWalkable(s.x, s.z, 6);
        s.ax = a ? a[0] : s.x;
        s.az = a ? a[1] : s.z;
      }

      // triggers
      for (const t of def.triggers || []) {
        const tr = Object.assign({ inside: false, fired: false }, t);
        if (t.room && this.roomMap[t.room]) {
          const r = this.roomMap[t.room];
          tr.rect = { x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1 };
        }
        this.triggers.push(tr);
      }

      // light grid for characters
      this.buildLightGrid();

      const mesh = batch.build();
      this.group.add(mesh);
      this.staticMesh = mesh;
      this.batch = null; // free arrays
      this.built = true;
      DV.log('Zone', this.id, 'built in', Math.round(performance.now() - t0), 'ms', 'tris', batch.triCount);
      this.stats = { ms: Math.round(performance.now() - t0), tris: batch.triCount };
    }

    placeLights() {
      for (const r of this.rooms) {
        r.lights = [];
        const L = r.light;
        const y = r.exterior ? 4.2 : r.h - 0.08;
        if (L.list) {
          for (const e of L.list) {
            r.lights.push({ x: e[0], y: e[3] !== undefined ? e[3] : y, z: e[1], intensity: e[2] !== undefined && e[2] !== null ? e[2] : L.intensity, range: L.range, color: L.color, fixture: L.fixture });
          }
        } else if (!r.exterior && L.fixture !== 'none' && L.spacing > 0) {
          const w = r.x1 - r.x0, d = r.z1 - r.z0;
          const nx = Math.max(1, Math.round(w / L.spacing)), nz = Math.max(1, Math.round(d / L.spacing));
          for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
            r.lights.push({ x: r.x0 + ((i + 0.5) * w) / nx, y, z: r.z0 + ((j + 0.5) * d) / nz, intensity: L.intensity, range: L.range, color: L.color, fixture: L.fixture });
          }
        }
        if (L.extra) for (const e of L.extra) r.lights.push(Object.assign({ y, range: L.range, color: L.color, intensity: L.intensity, fixture: 'none' }, e));
      }
    }

    buildFixtures() {
      const B = this.batch;
      const panel = DV.Mat.get('light_panel:emit');
      const frame = DV.Mat.get('metal');
      for (const r of this.rooms) {
        if (r.exterior) continue;
        B.room = r.index;
        r.lights.forEach((l, li) => {
          if (l.fixture === 'none') return;
          const y = r.h;
          const flicker = r.light.flicker && r.light.flicker.indexOf(li) >= 0;
          if (l.fixture === 'tube') {
            B.box(frame, l.x, y - 0.1, l.z, 0.22, 0.1, 1.5);
            if (!flicker) B.quad(panel, [l.x - 0.07, y - 0.101, l.z - 0.7], [l.x + 0.07, y - 0.101, l.z - 0.7], [l.x + 0.07, y - 0.101, l.z + 0.7], [l.x - 0.07, y - 0.101, l.z + 0.7], [0, 0], [1, 0], [1, 1], [0, 1]);
          } else if (l.fixture === 'bulb') {
            B.box(frame, l.x, y - 0.35, l.z, 0.04, 0.35, 0.04);
            if (!flicker) B.box(panel, l.x, y - 0.5, l.z, 0.16, 0.16, 0.16, { uv: 'unit' });
          } else {
            B.box(frame, l.x, y - 0.04, l.z, 1.3, 0.04, 0.7);
            if (!flicker) B.quad(panel, [l.x - 0.6, y - 0.041, l.z - 0.3], [l.x + 0.6, y - 0.041, l.z - 0.3], [l.x + 0.6, y - 0.041, l.z + 0.3], [l.x - 0.6, y - 0.041, l.z + 0.3], [0, 0], [1, 0], [1, 1], [0, 1]);
          }
          if (flicker) {
            // dynamic flickering tube
            const geo = l.fixture === 'tube' ? new THREE.PlaneGeometry(0.14, 1.4) : new THREE.PlaneGeometry(1.2, 0.6);
            const m = new THREE.MeshBasicMaterial({ map: DV.Tex.get('light_panel'), fog: true });
            const mesh = new THREE.Mesh(geo, m);
            mesh.rotation.x = Math.PI / 2;
            mesh.position.set(l.x, y - 0.045, l.z);
            this.group.add(mesh);
            let t = Math.random() * 10;
            this.updaters.push((dt) => {
              t += dt;
              const on = Math.sin(t * 17) + Math.sin(t * 5.3) * 0.8 + Math.sin(t * 0.7) * 1.6 > -0.6;
              m.color.setScalar(on ? 1 : 0.25);
            });
          }
        });
      }
    }

    /* ----------------------------- the roof ----------------------------- */
    // The roof, for a building the city looks down on: a flat deck over every room indoors, at the
    // top of its outside walls, a parapet round the edge with a coping on it, and what lives up
    // there: the stair's bulkhead, the plant, vents, a water tank. It's over the ceilings, so
    // nothing indoors ever sees it, and it's lit by the sky, not by the rooms' lamps.
    //   o: { y: the walls' top (default: each room's), slab, parapet (its height),
    //        cover: [[x0, z0, x1, z1]] more ground under the same roof (a shell round the rooms),
    //        party: [[x0, z0, x1, z1]] taller buildings next door (no parapet against them),
    //        bulkhead: [x, z], tank: [x, z] | false, plant: how many units, deck: material }
    // Returns { rects: [[x0, z0, x1, z1, y]] } (the deck, for the cloud shadows).
    buildRoof(o) {
      o = o || {};
      const nav = this.nav, W = this.W, H = this.H, B = this.batch, def = this.def;
      const bh = def.buildingHeight || 8;
      const slab = o.slab === undefined ? 0.35 : o.slab, ph = o.parapet === undefined ? 0.8 : o.parapet;
      const inR = (x, z, q) => x > q[0] && x < q[2] && z > q[1] && z < q[3];
      const cx = (i) => this.bx0 + (i + 0.5) * G, cz = (j) => this.bz0 + (j + 0.5) * G;
      // the top of the walls over each cell (0: open to the sky)
      const top = new Float32Array(W * H);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i, ri = nav.room[k];
        if (ri >= 0) {
          const r = this.rooms[ri];
          if (!r.exterior && !r.noCeiling && !r.noRoof) top[k] = o.y || Math.max(r.h, bh);
        } else if ((o.cover || []).some((q) => inR(cx(i), cz(j), q))) top[k] = o.y || bh;
      }
      const at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? top[j * W + i] : 0);
      const party = (i, j) => (o.party || []).some((q) => inR(cx(i), cz(j), q));
      B.room = OPEN_AIR;
      // the deck: the biggest rectangles of one height
      const rects = [], seen = new Uint8Array(W * H);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i, h = top[k];
        if (!h || seen[k]) continue;
        let i1 = i, j1 = j;
        while (i1 + 1 < W && !seen[k + i1 + 1 - i] && top[k + i1 + 1 - i] === h) i1++;
        const rowOk = (jj) => { for (let q = i; q <= i1; q++) if (seen[jj * W + q] || top[jj * W + q] !== h) return false; return true; };
        while (j1 + 1 < H && rowOk(j1 + 1)) j1++;
        for (let jj = j; jj <= j1; jj++) for (let q = i; q <= i1; q++) seen[jj * W + q] = 1;
        rects.push([this.bx0 + i * G, this.bz0 + j * G, this.bx0 + (i1 + 1) * G, this.bz0 + (j1 + 1) * G, h + slab]);
      }
      const deck = DV.Mat.get(o.deck || 'concrete_dark'), cap = DV.Mat.get('concrete'), face = DV.Mat.get(def.facade || 'facade');
      for (const q of rects) B.flat(deck, q[0], q[1], q[2], q[3], q[4]);
      // the parapet and its coping, along every edge the roof drops away from (or steps down from)
      const pin = 0.22, pout = 0.12; // its thickness inside the wall line, and its lip out past it
      for (const orient of ['h', 'v']) {
        const nLines = orient === 'h' ? H + 1 : W + 1, nAlong = orient === 'h' ? W : H;
        const cell = (line, s, hi) => (orient === 'h' ? [s, hi ? line : line - 1] : [hi ? line : line - 1, s]);
        for (let line = 0; line < nLines; line++) {
          let run = null;
          const flush = () => {
            if (!run) return;
            const { s0, s1, hi, h, base } = run;
            // how far past each end: round an outside corner, into an inside one
            const ext = (s, beyond) => {
              const inC = at(...cell(line, s, hi)) >= h || party(...cell(line, s, hi));
              const outC = at(...cell(line, s, !hi)) >= h || party(...cell(line, s, !hi));
              return !inC ? 1 : outC ? 2 : 0;
            };
            const e0 = ext(s0 - 1), e1 = ext(s1 + 1);
            const c = (orient === 'h' ? this.bz0 : this.bx0) + line * G, so = hi ? -1 : 1; // (so: which way is out)
            const a0 = (orient === 'h' ? this.bx0 : this.bz0) + s0 * G, a1 = (orient === 'h' ? this.bx0 : this.bz0) + (s1 + 1) * G;
            const piece = (inner, outer, y0, y1, grow, mat) => {
              const d0 = e0 === 1 ? outer : e0 === 2 ? inner : 0, d1 = e1 === 1 ? outer : e1 === 2 ? inner : 0;
              const p0 = a0 - d0 - (e0 ? grow : 0), p1 = a1 + d1 + (e1 ? grow : 0);
              const q0 = c - so * inner, q1 = c + so * outer, lo = Math.min(q0, q1), wd = Math.abs(q1 - q0);
              const outF = orient === 'h' ? (so > 0 ? 'pz' : 'nz') : so > 0 ? 'px' : 'nx';
              const inF = { pz: 'nz', nz: 'pz', px: 'nx', nx: 'px' }[outF];
              const faces = { top: cap, bottom: cap, [outF]: mat, [inF]: cap };
              const skip = { bottom: 1 };
              if (orient === 'h') B.box(cap, (p0 + p1) / 2, y0, lo + wd / 2, p1 - p0, y1 - y0, wd, { faces, skip });
              else B.box(cap, lo + wd / 2, y0, (p0 + p1) / 2, wd, y1 - y0, p1 - p0, { faces, skip });
            };
            const y1 = h + slab + ph;
            piece(pin, pout, base, y1, 0, face);
            piece(pin + 0.05, pout + 0.07, y1, y1 + 0.09, 0.06, cap); // the coping: a lip both sides
            run = null;
          };
          for (let s = 0; s < nAlong; s++) {
            const a = at(...cell(line, s, false)), b = at(...cell(line, s, true));
            let want = null;
            if (a > b && !party(...cell(line, s, true))) want = { hi: false, h: a, base: b ? b + slab : a };
            else if (b > a && !party(...cell(line, s, false))) want = { hi: true, h: b, base: a ? a + slab : b };
            if (run && want && want.hi === run.hi && want.h === run.h && want.base === run.base) { run.s1 = s; continue; }
            flush();
            if (want) run = Object.assign({ s0: s, s1: s }, want);
          }
          flush();
        }
      }
      this.roofKit(o, rects, top, slab);
      this.roof = { rects };
      return this.roof;
    }

    // what stands on a flat roof: the stair's bulkhead, the plant on its curbs, vents and stacks, and
    // an old water tank on its stand
    roofKit(o, rects, top, slab) {
      const B = this.batch, W = this.W, H = this.H;
      const r = U.rng(U.hashString(this.id + ':roof'));
      const M = (k) => DV.Mat.get(k);
      const conc = M('concrete'), metal = M('metal'), dark = M('metal_dark'), face = M(this.def.facade || 'facade');
      const area = rects.reduce((s, q) => s + (q[2] - q[0]) * (q[3] - q[1]), 0);
      const placed = [];
      // is the deck clear and level under x0..x1 × z0..z1 (keeping off the parapet by m)?
      const clear = (x0, z0, x1, z1, y, m) => {
        if (placed.some((q) => x1 + 0.9 > q[0] && x0 - 0.9 < q[2] && z1 + 0.9 > q[1] && z0 - 0.9 < q[3])) return false;
        const i0 = Math.floor((x0 - m - this.bx0) / G), i1 = Math.ceil((x1 + m - this.bx0) / G) - 1;
        const j0 = Math.floor((z0 - m - this.bz0) / G), j1 = Math.ceil((z1 + m - this.bz0) / G) - 1;
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          if (i < 0 || j < 0 || i >= W || j >= H || top[j * W + i] + slab !== y) return false;
        }
        return true;
      };
      // somewhere on the deck for a w × d thing (near (x, z) if given)
      const find = (w, d, near) => {
        const big = rects.filter((q) => q[2] - q[0] > w + 2.4 && q[3] - q[1] > d + 2.4);
        if (!big.length) return null;
        for (let tries = 0; tries < 60; tries++) {
          let x, z, y;
          if (near && tries < 30) {
            const q = rects.find((q) => near[0] >= q[0] && near[0] <= q[2] && near[1] >= q[1] && near[1] <= q[3]);
            if (!q) { near = null; continue; }
            x = near[0] + (tries ? (r() - 0.5) * 3 : 0); z = near[1] + (tries ? (r() - 0.5) * 3 : 0); y = q[4];
          } else {
            // pick a rectangle by its area, then a spot in it
            let t = r() * big.reduce((s, q) => s + (q[2] - q[0]) * (q[3] - q[1]), 0), q = big[0];
            for (const b of big) { t -= (b[2] - b[0]) * (b[3] - b[1]); if (t <= 0) { q = b; break; } }
            x = U.lerp(q[0] + w / 2 + 1.2, q[2] - w / 2 - 1.2, r()); z = U.lerp(q[1] + d / 2 + 1.2, q[3] - d / 2 - 1.2, r()); y = q[4];
          }
          x = Math.round(x * 4) / 4; z = Math.round(z * 4) / 4;
          if (clear(x - w / 2, z - d / 2, x + w / 2, z + d / 2, y, 1.0)) { placed.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]); return [x, y, z]; }
        }
        return null;
      };
      // the stairs come up into a bulkhead: a little rendered hut with a steel door, a lamp over it,
      // and a path of pavers out across the deck
      const bk = find(3.2, 3.8, o.bulkhead);
      if (bk) {
        const [x, y, z] = bk;
        B.box(face, x, y, z, 3.2, 2.7, 3.8, { faces: { top: M('concrete_dark') }, skip: { bottom: 1 } });
        B.box(conc, x, y + 2.7, z, 3.45, 0.12, 4.05, { skip: { bottom: 1 } });
        B.box(dark, x, y, z + 1.92, 1.0, 2.1, 0.06, { skip: { bottom: 1 } }); // the door
        B.box(metal, x + 0.32, y + 1.0, z + 1.97, 0.1, 0.05, 0.05); // its handle
        B.box(metal, x, y + 2.3, z + 1.93, 0.3, 0.16, 0.12); // the lamp over it
        for (let k = 0; k < 9 && clear(x - 0.4, z + 2.2 + k, x + 0.4, z + 2.9 + k, y, 0.3); k++) B.flat(conc, x - 0.4, z + 2.2 + k, x + 0.4, z + 2.9 + k, y + 0.02);
      }
      // a big roof has a plant room too: a penthouse with louvres down its sides
      if (area > 1500) {
        const pt = find(7.5, 5.5, o.penthouse);
        if (pt) {
          const [x, y, z] = pt;
          B.box(face, x, y, z, 7.2, 3.4, 5.2, { faces: { px: M('vent'), nx: M('vent'), top: M('concrete_dark') }, skip: { bottom: 1 } });
          B.box(conc, x, y + 3.4, z, 7.5, 0.14, 5.5, { skip: { bottom: 1 } });
          B.box(dark, x + 1.6, y, z + 2.62, 2.2, 2.6, 0.06, { skip: { bottom: 1 } }); // the double doors
          B.box(metal, x - 1.8, y + 3.54, z, 1.6, 0.9, 1.6, { faces: { px: M('vent'), nx: M('vent'), pz: M('vent'), nz: M('vent') }, skip: { bottom: 1 } });
        }
        // and a radio mast, with its rungs
        const ms = find(1.2, 1.2);
        if (ms) {
          const [x, y, z] = ms;
          B.box(conc, x, y, z, 1.2, 0.3, 1.2, { skip: { bottom: 1 } });
          B.box(dark, x, y + 0.3, z, 0.14, 8.5, 0.14, { skip: { bottom: 1 } });
          for (const yy of [4.2, 6.4, 8.2]) B.box(dark, x, y + yy, z, 1.4 - yy * 0.1, 0.06, 0.06);
        }
      }
      // the plant: air handlers on concrete curbs, louvred sides and fans on top, a duct down into
      // the roof; and the odd condenser
      const nPlant = o.plant !== undefined ? o.plant : U.clamp(Math.round(area / 220), 0, 12);
      for (let n = 0; n < nPlant; n++) {
        const big = r() < 0.55, w = big ? 3.4 : 1.8, d = big ? 1.9 : 1.2, h = big ? 1.7 : 1.1;
        const at = find(w + 0.3, d + 0.3);
        if (!at) break;
        const [x, y, z] = at;
        B.box(conc, x, y, z, w + 0.3, 0.16, d + 0.3, { skip: { bottom: 1 } });
        B.box(metal, x, y + 0.16, z, w, h, d, { faces: { pz: M('vent'), nz: M('vent') }, skip: { bottom: 1 } });
        for (const k of big ? [-1, 1] : [0]) {
          B.cyl(dark, x + k * w * 0.24, y + 0.16 + h, z, 0.5, 0.5, 0.16, 8);
          B.box(metal, x + k * w * 0.24, y + 0.3 + h, z, 0.9, 0.03, 0.06); // the fan guard
        }
        if (big) {
          B.box(metal, x + (w / 2 + 0.3), y, z, 0.6, 0.7, 0.55, { skip: { bottom: 1 } });
          B.box(metal, x + (w / 2 + 0.3), y + 0.7, z, 0.75, 0.06, 0.7);
        }
      }
      // the deck's expansion joints: low curbs, on a 12 m grid
      const JOINT = [0.7, 0.7, 0.68];
      for (const q of rects) {
        for (let jx = Math.ceil(q[0] / 12) * 12; jx < q[2] - 0.5; jx += 12) if (jx > q[0] + 0.5) B.box(conc, jx, q[4], (q[1] + q[3]) / 2, 0.24, 0.1, q[3] - q[1], { skip: { bottom: 1 }, tint: JOINT });
        for (let jz = Math.ceil(q[1] / 12) * 12; jz < q[3] - 0.5; jz += 12) if (jz > q[1] + 0.5) B.box(conc, (q[0] + q[2]) / 2, q[4], jz, q[2] - q[0], 0.1, 0.24, { skip: { bottom: 1 }, tint: JOINT });
      }
      // vents and stacks: soil pipes with their caps, mushroom vents
      const nVent = U.clamp(Math.round(area / 60), 0, 24);
      for (let n = 0; n < nVent; n++) {
        const at = find(0.5, 0.5);
        if (!at) break;
        const [x, y, z] = at;
        if (r() < 0.5) {
          B.cyl(dark, x, y, z, 0.08, 0.08, 0.5 + r() * 0.5, 6);
        } else {
          B.box(metal, x, y, z, 0.36, 0.5, 0.36, { skip: { bottom: 1 } });
          B.box(metal, x, y + 0.56, z, 0.56, 0.07, 0.56, {});
          B.box(dark, x, y + 0.5, z, 0.3, 0.06, 0.3, { skip: { bottom: 1 } });
        }
      }
      // the water tank: a timber tub banded with steel on a stand, its conical lid
      if (o.tank !== false && (o.tank || area > 900)) {
        const tk = find(3.4, 3.4, o.tank);
        if (tk) {
          const [x, y, z] = tk, wood = M('wood');
          for (const [kx, kz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.box(dark, x + kx * 1.3, y, z + kz * 1.3, 0.16, 2.9, 0.16);
          for (const yy of [0.9, 2.0]) { B.box(dark, x, y + yy, z - 1.3, 2.6, 0.08, 0.06); B.box(dark, x, y + yy, z + 1.3, 2.6, 0.08, 0.06); B.box(dark, x - 1.3, y + yy, z, 0.06, 0.08, 2.6); B.box(dark, x + 1.3, y + yy, z, 0.06, 0.08, 2.6); }
          B.box(dark, x, y + 2.9, z, 3.0, 0.12, 3.0);
          B.cyl(wood, x, y + 3.02, z, 1.55, 1.6, 3.0, 10, { topMat: wood });
          for (const yy of [0.3, 1.2, 2.1, 2.8]) B.cyl(dark, x, y + 3.02 + yy, z, 1.62, 1.62, 0.07, 10, { noTop: true });
          B.cyl(dark, x, y + 6.02, z, 0, 1.7, 0.9, 10);
          B.box(dark, x + 1.62, y + 3.0, z, 0.05, 3.1, 0.4); // the ladder up its side
        }
      }
    }

    /* ----------------------------- walls ----------------------------- */
    openingAt(orient, mx, mz) {
      const list = this.def.doors || [];
      const wins = this.def.windows || [];
      const test = (o) => {
        const w = o.w || 1.5;
        if (orient === 'h') {
          return o.dir === 'x' && Math.abs(o.z - mz) < 0.01 && mx > o.x - w / 2 && mx < o.x + w / 2;
        }
        return o.dir === 'z' && Math.abs(o.x - mx) < 0.01 && mz > o.z - w / 2 && mz < o.z + w / 2;
      };
      for (const d of list) if (test(d)) return d;
      for (const w of wins) if (test(w)) { w.isWindow = true; return w; }
      return null;
    }

    connected(A, B) {
      if (A < 0 || B < 0) return false;
      const ra = this.rooms[A], rb = this.rooms[B];
      return (ra.connect && ra.connect.indexOf(rb.id) >= 0) || (rb.connect && rb.connect.indexOf(ra.id) >= 0);
    }

    buildWalls() {
      const nav = this.nav, W = this.W, H = this.H;
      const room = (i, j) => (nav.inside(i, j) ? nav.room[nav.idx(i, j)] : -1);
      // classify edges
      const hE = new Array((H + 1) * W).fill(null); // index j*W+i : boundary z=z0+j*G between (i,j-1) & (i,j)
      const vE = new Array((W + 1) * H).fill(null); // index i*H+j : boundary x=x0+i*G between (i-1,j) & (i,j)
      for (let j = 0; j <= H; j++) for (let i = 0; i < W; i++) {
        const A = room(i, j - 1), B = room(i, j);
        if (A === B || (A < 0 && B < 0) || this.connected(A, B)) continue;
        const op = this.openingAt('h', this.bx0 + (i + 0.5) * G, this.bz0 + j * G);
        hE[j * W + i] = { A, B, op };
      }
      for (let i = 0; i <= W; i++) for (let j = 0; j < H; j++) {
        const A = room(i - 1, j), B = room(i, j);
        if (A === B || (A < 0 && B < 0) || this.connected(A, B)) continue;
        const op = this.openingAt('v', this.bx0 + i * G, this.bz0 + (j + 0.5) * G);
        vE[i * H + j] = { A, B, op };
      }
      const wallish = (e) => e && (!e.op || e.op.isWindow || e.op.type === 'sealed');
      // nav edge bits
      for (let j = 0; j <= H; j++) for (let i = 0; i < W; i++) {
        const e = hE[j * W + i];
        if (!e) continue;
        if (wallish(e)) {
          if (nav.inside(i, j - 1)) nav.edges[nav.idx(i, j - 1)] |= NG.S;
          if (nav.inside(i, j)) nav.edges[nav.idx(i, j)] |= NG.N;
        } else if (e.op && e.op.lock) {
          const lk = nav.lockId(e.op.lock);
          if (nav.inside(i, j - 1)) nav.lock[nav.idx(i, j - 1)] = lk;
          if (nav.inside(i, j)) nav.lock[nav.idx(i, j)] = lk;
        }
      }
      for (let i = 0; i <= W; i++) for (let j = 0; j < H; j++) {
        const e = vE[i * H + j];
        if (!e) continue;
        if (wallish(e)) {
          if (nav.inside(i - 1, j)) nav.edges[nav.idx(i - 1, j)] |= NG.E;
          if (nav.inside(i, j)) nav.edges[nav.idx(i, j)] |= NG.W;
        } else if (e.op && e.op.lock) {
          const lk = nav.lockId(e.op.lock);
          if (nav.inside(i - 1, j)) nav.lock[nav.idx(i - 1, j)] = lk;
          if (nav.inside(i, j)) nav.lock[nav.idx(i, j)] = lk;
        }
      }
      // corner posts
      const posts = new Set();
      for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
        const hl = i > 0 ? hE[j * W + i - 1] : null, hr = i < W ? hE[j * W + i] : null;
        const vu = j > 0 ? vE[i * H + j - 1] : null, vd = j < H ? vE[i * H + j] : null;
        const hasH = wallish(hl) || wallish(hr), hasV = wallish(vu) || wallish(vd);
        if (hasH && hasV) posts.add(i + ',' + j);
      }
      this._posts = posts;
      const postH = {};
      // horizontal runs
      const keyOf = (e) => (e ? e.A + '|' + e.B + '|' + (e.op ? e.op.id || e.op.uid || (e.op.uid = 'op' + Math.random()) : '') : null);
      for (let j = 0; j <= H; j++) {
        let run = null;
        const flush = () => {
          if (!run) return;
          const h = this.wallSegment('h', run.i0, run.i1 + 1, j, run.e, posts);
          for (const pi of [run.i0, run.i1 + 1]) {
            const k = pi + ',' + j;
            if (posts.has(k)) postH[k] = Math.max(postH[k] || 0, h);
          }
          run = null;
        };
        for (let i = 0; i < W; i++) {
          const e = hE[j * W + i];
          const k = keyOf(e);
          if (run && k === run.k && !posts.has(i + ',' + j)) { run.i1 = i; continue; }
          flush();
          if (e) run = { k, e, i0: i, i1: i };
        }
        flush();
      }
      for (let i = 0; i <= W; i++) {
        let run = null;
        const flush = () => {
          if (!run) return;
          const h = this.wallSegment('v', run.j0, run.j1 + 1, i, run.e, posts);
          for (const pj of [run.j0, run.j1 + 1]) {
            const k = i + ',' + pj;
            if (posts.has(k)) postH[k] = Math.max(postH[k] || 0, h);
          }
          run = null;
        };
        for (let j = 0; j < H; j++) {
          const e = vE[i * H + j];
          const k = keyOf(e);
          if (run && k === run.k && !posts.has(i + ',' + j)) { run.j1 = j; continue; }
          flush();
          if (e) run = { k, e, j0: j, j1: j };
        }
        flush();
      }
      // posts
      const B = this.batch;
      for (const k of posts) {
        const [i, j] = k.split(',').map(Number);
        const x = this.bx0 + i * G, z = this.bz0 + j * G;
        const h = postH[k] || 3;
        const faces = {};
        for (const [f, ox, oz] of [['px', 1, 0], ['nx', -1, 0], ['pz', 0, 1], ['nz', 0, -1]]) {
          const ri = this.roomIndexAt(x + ox * 0.3, z + oz * 0.3);
          faces[f] = this.faceMat(ri, h);
        }
        B.room = this.roomIndexAt(x + 0.3, z + 0.3);
        B.box(faces.px, x, 0, z, T, h, T, { faces, skip: { bottom: 1 } });
        this.colliders.add(x - T / 2, z - T / 2, x + T / 2, z + T / 2, { y0: 0, y1: h, tag: 'wall' });
      }
    }

    // material for a wall face that looks into room index ri
    faceMat(ri, h) {
      if (ri >= 0) {
        const r = this.rooms[ri];
        if (!r.exterior) return DV.Mat.get(r.wall);
        return DV.Mat.get(r.facade || this.def.facade || 'facade');
      }
      return DV.Mat.get('concrete_dark');
    }

    heightFor(A, B) {
      const R = (k) => (k >= 0 ? this.rooms[k] : null);
      const ra = R(A), rb = R(B);
      const intA = ra && !ra.exterior, intB = rb && !rb.exterior;
      if (intA || intB) {
        let h = Math.max(intA ? ra.h : 0, intB ? rb.h : 0);
        if (!intA || !intB) h = Math.max(h, this.def.buildingHeight || 8);
        return { h, style: 'wall' };
      }
      const ext = ra && rb ? (ra.edgeH || 3) >= (rb.edgeH || 3) ? ra : rb : ra || rb;
      return { h: ext.edgeH || 3, style: ext.edge || 'wall', ext };
    }

    /**
     * orient 'h': boundary z = z0 + line*G, from a*G to b*G along x.
     * orient 'v': boundary x = x0 + line*G, from a*G to b*G along z.
     */
    wallSegment(orient, a, b, line, e, posts) {
      const B = this.batch;
      const { h: Hh, style, ext } = this.heightFor(e.A, e.B);
      const op = e.op;
      const startPost = orient === 'h' ? posts.has(a + ',' + line) : posts.has(line + ',' + a);
      const endPost = orient === 'h' ? posts.has(b + ',' + line) : posts.has(line + ',' + b);
      let s0 = (orient === 'h' ? this.bx0 : this.bz0) + a * G;
      let s1 = (orient === 'h' ? this.bx0 : this.bz0) + b * G;
      if (startPost) s0 += T / 2;
      if (endPost) s1 -= T / 2;
      const c = (orient === 'h' ? this.bz0 : this.bx0) + line * G;
      // a face that looks out of the map (the outside of the building) gets the facade, not the
      // paint of the room on the other side
      const outside = DV.Mat.get(this.def.facade || 'facade');
      const matA = style === 'fence' ? null : e.A >= 0 ? this.faceMat(e.A, Hh) : outside;
      const matB = style === 'fence' ? null : e.B >= 0 ? this.faceMat(e.B, Hh) : outside;
      // perimeter walls between exterior areas use their own material
      let mA = matA, mB = matB;
      if (ext && style === 'wall') { mA = mB = DV.Mat.get(ext.edgeMat || 'concrete'); }

      // helper to emit a box piece of this wall between heights y0..y1 along s0..s1
      const piece = (p0, p1, y0, y1, capStart, capEnd, collide, camera) => {
        if (p1 - p0 < 0.001 || y1 - y0 < 0.001) return;
        let faces, cx, cz, sx, sz;
        if (orient === 'h') {
          faces = { nz: mA, pz: mB, top: mA, px: mA, nx: mA, bottom: mA };
          cx = (p0 + p1) / 2; cz = c; sx = p1 - p0; sz = T;
        } else {
          faces = { nx: mA, px: mB, top: mA, pz: mA, nz: mA, bottom: mA };
          cx = c; cz = (p0 + p1) / 2; sx = T; sz = p1 - p0;
        }
        const skip = { bottom: y0 < 0.01 };
        if (orient === 'h') { if (!capStart) skip.nx = 1; if (!capEnd) skip.px = 1; } else { if (!capStart) skip.nz = 1; if (!capEnd) skip.pz = 1; }
        // per-face lighting room: emit two passes so each side bakes from its own room
        const roomA = e.A >= 0 ? e.A : e.B, roomB = e.B >= 0 ? e.B : e.A;
        const sideA = orient === 'h' ? 'nz' : 'nx', sideB = orient === 'h' ? 'pz' : 'px';
        const skipA = Object.assign({}, skip, { [sideB]: 1 });
        const skipB = { top: 1, bottom: 1, px: 1, nx: 1, pz: 1, nz: 1 };
        delete skipB[sideB];
        B.room = roomA;
        B.box(faces[sideA], cx, y0, cz, sx, y1 - y0, sz, { faces, skip: skipA, sub: 1.1 });
        B.room = roomB;
        B.box(faces[sideB], cx, y0, cz, sx, y1 - y0, sz, { faces, skip: skipB, sub: 1.1 });
        if (collide) {
          if (orient === 'h') this.colliders.add(p0, c - T / 2, p1, c + T / 2, { y0, y1, tag: 'wall', camera: camera !== false });
          else this.colliders.add(c - T / 2, p0, c + T / 2, p1, { y0, y1, tag: 'wall', camera: camera !== false });
        }
      };

      if (style === 'none') return 0;
      if (style === 'fence') {
        // a gate in a fence: the door itself is the barrier (it has its own mesh and collider)
        if (op && !op.isWindow) return Hh;
        this.buildFence(orient, s0, s1, c, Hh, ext);
        return Hh;
      }

      if (!op) {
        piece(s0, s1, 0, Hh, !startPost, !endPost, true);
      } else if (op.isWindow) {
        const sill = op.sill === undefined ? 0.9 : op.sill;
        const top = op.top === undefined ? 2.3 : op.top;
        piece(s0, s1, 0, sill, true, true, true);
        piece(s0, s1, top, Hh, true, true, true);
        this.buildWindowGlass(orient, s0, s1, c, sill, top, op, e);
      } else {
        const dh = op.h || (op.type === 'opening' ? Hh : 2.35);
        if (dh < Hh) piece(s0, s1, dh, Hh, true, true, true);
        this.buildDoorFrame(orient, s0, s1, c, dh, op, e);
      }
      return Hh;
    }

    buildFence(orient, s0, s1, c, h, ext) {
      const B = this.batch;
      const post = DV.Mat.get('metal_dark');
      const mesh = DV.Mat.get('chainlink:alpha');
      const len = s1 - s0;
      const n = Math.max(1, Math.round(len / 2.5));
      B.room = ext ? ext.index : null;
      for (let k = 0; k <= n; k++) {
        const s = s0 + (len * k) / n;
        if (orient === 'h') B.box(post, s, 0, c, 0.08, h, 0.08);
        else B.box(post, c, 0, s, 0.08, h, 0.08);
      }
      const w = 0.5;
      if (orient === 'h') {
        B.quad(mesh, [s0, 0, c], [s1, 0, c], [s1, h, c], [s0, h, c], [s0 / w, 0], [s1 / w, 0], [s1 / w, h / w], [s0 / w, h / w]);
        B.box(post, (s0 + s1) / 2, h - 0.05, c, len, 0.05, 0.06);
        this.colliders.add(s0, c - 0.08, s1, c + 0.08, { y0: 0, y1: h, tag: 'wall', camera: false });
      } else {
        B.quad(mesh, [c, 0, s1], [c, 0, s0], [c, h, s0], [c, h, s1], [s1 / w, 0], [s0 / w, 0], [s0 / w, h / w], [s1 / w, h / w]);
        B.box(post, c, h - 0.05, (s0 + s1) / 2, 0.06, 0.05, len);
        this.colliders.add(c - 0.08, s0, c + 0.08, s1, { y0: 0, y1: h, tag: 'wall', camera: false });
      }
      // barbed wire on top
      if (ext && ext.barbed) {
        if (orient === 'h') B.box(post, (s0 + s1) / 2, h + 0.15, c, len, 0.02, 0.02);
        else B.box(post, c, h + 0.15, (s0 + s1) / 2, 0.02, 0.02, len);
      }
    }

    buildWindowGlass(orient, s0, s1, c, sill, top, op, e) {
      const B = this.batch;
      const frame = DV.Mat.get(op.frame || 'metal_dark');
      const glassKey = op.oneWay ? null : 'white:glass';
      const roomA = e.A >= 0 ? e.A : e.B, roomB = e.B >= 0 ? e.B : e.A;
      B.room = roomA;
      // frame pieces
      if (orient === 'h') {
        B.box(frame, (s0 + s1) / 2, sill - 0.04, c, s1 - s0, 0.06, T + 0.1);
        B.box(frame, (s0 + s1) / 2, top - 0.02, c, s1 - s0, 0.04, T + 0.04);
        B.box(frame, s0 + 0.03, sill, c, 0.06, top - sill, T + 0.04);
        B.box(frame, s1 - 0.03, sill, c, 0.06, top - sill, T + 0.04);
        const n = Math.max(1, Math.round((s1 - s0) / 1.6));
        for (let k = 1; k < n; k++) B.box(frame, s0 + ((s1 - s0) * k) / n, sill, c, 0.05, top - sill, 0.08);
      } else {
        B.box(frame, c, sill - 0.04, (s0 + s1) / 2, T + 0.1, 0.06, s1 - s0);
        B.box(frame, c, top - 0.02, (s0 + s1) / 2, T + 0.04, 0.04, s1 - s0);
        B.box(frame, c, sill, s0 + 0.03, T + 0.04, top - sill, 0.06);
        B.box(frame, c, sill, s1 - 0.03, T + 0.04, top - sill, 0.06);
        const n = Math.max(1, Math.round((s1 - s0) / 1.6));
        for (let k = 1; k < n; k++) B.box(frame, c, sill, s0 + ((s1 - s0) * k) / n, 0.08, top - sill, 0.05);
      }
      // glass
      if (op.oneWay) {
        // one-way mirror: transparent from the observer side (A), mirror from the other (B)
        const see = DV.Mat.fromTexture('oneway_see', DV.Tex.get('glass_dark'), { emit: true, transparent: true });
        see.opacity = 0.35; see.depthWrite = false;
        const mir = DV.Mat.get('mirror');
        if (orient === 'h') {
          B.room = roomA;
          // faces -z (toward A at z < c)
          B.quad(see, [s1, sill, c - 0.01], [s0, sill, c - 0.01], [s0, top, c - 0.01], [s1, top, c - 0.01], [0, 0], [1, 0], [1, 1], [0, 1]);
          B.room = roomB;
          B.quad(mir, [s0, sill, c + 0.01], [s1, sill, c + 0.01], [s1, top, c + 0.01], [s0, top, c + 0.01], [0, 0], [1, 0], [1, 1], [0, 1]);
        } else {
          B.room = roomA;
          B.quad(see, [c - 0.01, sill, s0], [c - 0.01, sill, s1], [c - 0.01, top, s1], [c - 0.01, top, s0], [0, 0], [1, 0], [1, 1], [0, 1]);
          B.room = roomB;
          B.quad(mir, [c + 0.01, sill, s1], [c + 0.01, sill, s0], [c + 0.01, top, s0], [c + 0.01, top, s1], [0, 0], [1, 0], [1, 1], [0, 1]);
        }
      } else {
        const gm = DV.Mat.get(glassKey);
        if (orient === 'h') B.quad(gm, [s0, sill, c], [s1, sill, c], [s1, top, c], [s0, top, c], [0, 0], [1, 0], [1, 1], [0, 1]);
        else B.quad(gm, [c, sill, s1], [c, sill, s0], [c, top, s0], [c, top, s1], [0, 0], [1, 0], [1, 1], [0, 1]);
      }
      // collider across the glass
      if (orient === 'h') this.colliders.add(s0, c - T / 2, s1, c + T / 2, { y0: sill, y1: top, tag: 'wall', camera: true });
      else this.colliders.add(c - T / 2, s0, c + T / 2, s1, { y0: sill, y1: top, tag: 'wall', camera: true });
    }

    buildDoorFrame(orient, s0, s1, c, dh, op, e) {
      if (op.type === 'opening' && !op.frame) return;
      const B = this.batch;
      const fm = DV.Mat.get(op.frameMat || 'metal_dark');
      const d = T + 0.08;
      B.room = e.A >= 0 ? e.A : e.B;
      if (orient === 'h') {
        B.box(fm, s0 + 0.04, 0, c, 0.08, dh, d);
        B.box(fm, s1 - 0.04, 0, c, 0.08, dh, d);
        B.box(fm, (s0 + s1) / 2, dh - 0.08, c, s1 - s0, 0.08, d);
      } else {
        B.box(fm, c, 0, s0 + 0.04, d, dh, 0.08);
        B.box(fm, c, 0, s1 - 0.04, d, dh, 0.08);
        B.box(fm, c, dh - 0.08, (s0 + s1) / 2, d, 0.08, s1 - s0);
      }
      // jamb colliders (thin) so characters don't clip frames
      if (orient === 'h') {
        this.colliders.add(s0, c - d / 2, s0 + 0.08, c + d / 2, { y0: 0, y1: dh, tag: 'wall', camera: false });
        this.colliders.add(s1 - 0.08, c - d / 2, s1, c + d / 2, { y0: 0, y1: dh, tag: 'wall', camera: false });
      } else {
        this.colliders.add(c - d / 2, s0, c + d / 2, s0 + 0.08, { y0: 0, y1: dh, tag: 'wall', camera: false });
        this.colliders.add(c - d / 2, s1 - 0.08, c + d / 2, s1, { y0: 0, y1: dh, tag: 'wall', camera: false });
      }
      // plaque labels on both sides
      if (op.label) {
        const tex = DV.Tex.sign(op.label, { w: 256, h: 48, bg: op.signBg || '#26343a', color: '#eae6d6', size: 20 });
        const sm = DV.Mat.fromTexture('sign|' + op.label + '|' + (op.signBg || ''), tex, {});
        const y = dh + 0.25;
        const sw = Math.min(1.6, Math.max(1.0, op.label.length * 0.075));
        if (orient === 'h') {
          B.room = e.B >= 0 ? e.B : e.A;
          B.push((s0 + s1) / 2, 0, c + T / 2 + 0.012, 0); B.panel(sm, 0, y, 0, sw, 0.3); B.pop();
          B.room = e.A >= 0 ? e.A : e.B;
          B.push((s0 + s1) / 2, 0, c - T / 2 - 0.012, Math.PI); B.panel(sm, 0, y, 0, sw, 0.3); B.pop();
        } else {
          B.room = e.B >= 0 ? e.B : e.A;
          B.push(c + T / 2 + 0.012, 0, (s0 + s1) / 2, Math.PI / 2); B.panel(sm, 0, y, 0, sw, 0.3); B.pop();
          B.room = e.A >= 0 ? e.A : e.B;
          B.push(c - T / 2 - 0.012, 0, (s0 + s1) / 2, -Math.PI / 2); B.panel(sm, 0, y, 0, sw, 0.3); B.pop();
        }
      }
    }

    /* ----------------------------- doors ----------------------------- */
    buildDoor(d) {
      if (d.type === 'opening' || !d.type) return;
      const w = d.w || 1.5, h = d.h || 2.35;
      const horizontal = d.dir === 'x';
      const tint = this.lighting.sample(d.x, 1.2, d.z, 0, 1, 0, null, true);
      const tcol = new THREE.Color(U.clamp(tint[0], 0.25, 1.25), U.clamp(tint[1], 0.25, 1.25), U.clamp(tint[2], 0.25, 1.25));
      const root = new THREE.Group();
      root.position.set(d.x, 0, d.z);
      if (!horizontal) root.rotation.y = Math.PI / 2;
      const panels = [];
      const details = []; // small parts hidden at distance (saves draw calls)
      const mkPanel = (pw, matKey, glass) => {
        let mat;
        if (glass) {
          mat = new THREE.MeshBasicMaterial({ color: 0xa8c4cc, transparent: true, opacity: 0.3, depthWrite: false, fog: true });
        } else {
          mat = new THREE.MeshBasicMaterial({ map: DV.Tex.get(matKey), color: tcol, fog: true });
        }
        const g = new THREE.Group();
        const geo = new THREE.BoxGeometry(pw, h - 0.1, glass ? 0.03 : 0.06);
        const m = new THREE.Mesh(geo, mat);
        m.position.y = (h - 0.1) / 2;
        g.add(m);
        if (glass) {
          const fm = new THREE.MeshBasicMaterial({ map: DV.Tex.get('metal'), color: tcol, fog: true });
          const bar = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.08, 0.06), fm);
          bar.position.y = 1.0; g.add(bar);
          const top = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.06, 0.06), fm);
          top.position.y = h - 0.13; g.add(top);
          const side = new THREE.Mesh(new THREE.BoxGeometry(0.05, h - 0.1, 0.06), fm);
          side.position.set(-pw / 2 + 0.025, (h - 0.1) / 2, 0); g.add(side);
          const side2 = side.clone(); side2.position.x = pw / 2 - 0.025; g.add(side2);
          details.push(bar, side, side2);
        } else {
          // handle + small window strip
          const hm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.75, 0.72).multiply(tcol), fog: true });
          const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.14), hm);
          handle.position.set(pw / 2 - 0.15, 1.05, 0);
          g.add(handle);
          details.push(handle);
          if (d.window !== false && d.type !== 'gate') {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.07), new THREE.MeshBasicMaterial({ color: 0x1e2a2e, fog: true }));
            win.position.set(0, 1.55, 0);
            g.add(win);
            details.push(win);
          }
        }
        root.add(g);
        panels.push({ g, w: pw });
        return g;
      };
      if (d.type === 'double' || d.type === 'glass') {
        mkPanel(w / 2, d.mat || 'metal_painted', d.type === 'glass');
        mkPanel(w / 2, d.mat || 'metal_painted', d.type === 'glass');
      } else if (d.type === 'gate') {
        const mat = DV.Mat.get('chainlink:alpha').clone();
        mat.vertexColors = false;
        mat.color = tcol;
        const g = new THREE.Group();
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        pl.position.y = h / 2;
        g.add(pl);
        const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.3, 0.3), fog: true });
        for (const yy of [0.05, h - 0.05]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), fm); bar.position.y = yy; g.add(bar); }
        root.add(g);
        panels.push({ g, w });
      } else {
        mkPanel(w - 0.04, d.mat || (d.type === 'sealed' ? 'metal_dark' : 'metal_painted'), false);
      }
      // status light
      let lamp = null;
      if (d.lock || d.type === 'sealed') {
        lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, T + 0.12), new THREE.MeshBasicMaterial({ color: 0xd03020 }));
        lamp.position.set(w / 2 + 0.2, 1.55, 0);
        root.add(lamp);
        details.push(lamp);
      }
      this.group.add(root);
      const door = {
        def: d,
        id: d.id,
        root,
        panels,
        lamp,
        open: 0,
        target: 0,
        w,
        horizontal,
        lock: d.lock || null,
        sealed: d.type === 'sealed',
        collider: null,
        holdOpen: 0,
        details,
        detailOn: true,
      };
      // collider covering the doorway while closed
      const hw = w / 2;
      if (horizontal) door.collider = this.colliders.add(d.x - hw, d.z - 0.12, d.x + hw, d.z + 0.12, { y0: 0, y1: h, tag: 'door', camera: true });
      else door.collider = this.colliders.add(d.x - 0.12, d.z - hw, d.x + 0.12, d.z + hw, { y0: 0, y1: h, tag: 'door', camera: true });
      this.positionDoor(door);
      this.doors.push(door);
      if (d.id) this.doorMap[d.id] = door;
      // interactable for locked / sealed doors
      if (d.lock || d.type === 'sealed') {
        this.interactables.push({
          id: 'door:' + d.id,
          kind: 'door',
          door,
          x: d.x, y: 1.2, z: d.z,
          radius: Math.max(1.6, w * 0.8),
          get label() {
            return door.open > 0.5 ? null : 'Try door';
          },
          name: d.label || 'Door',
        });
      }
    }

    // door handles, windows, frames and status lamps are separate little meshes:
    // only draw them near the camera (they're a few pixels wide past ~16m)
    cullDetails(cam) {
      this.detailT = (this.detailT || 0) + 1;
      if (this.detailT % 6) return;
      for (const door of this.doors) {
        const on = Math.hypot(door.def.x - cam.x, door.def.z - cam.z) < 16;
        if (on === door.detailOn) continue;
        door.detailOn = on;
        for (const m of door.details) m.visible = on;
      }
    }

    buildPickups() {
      for (const p of this.def.pickups || []) {
        const item = DV.Items.get(p.item);
        if (!item) { console.warn('[Zone] pickup with unknown item', p); continue; }
        const shape = (item.icon && item.icon.shape) || 'box';
        let geo;
        if (shape === 'cup' || shape === 'bottle') geo = new THREE.CylinderGeometry(0.035, 0.03, 0.1, 6);
        else if (shape === 'paper' || shape === 'card') geo = new THREE.BoxGeometry(0.2, 0.012, 0.15);
        else if (shape === 'key') geo = new THREE.BoxGeometry(0.08, 0.015, 0.03);
        else geo = new THREE.BoxGeometry(0.1, 0.06, 0.08);
        geo.translate(0, (geo.parameters.height || 0.05) / 2, 0);
        const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: (item.icon && item.icon.color) || '#cccccc' }));
        mesh.position.set(p.x, p.y || 0, p.z);
        mesh.rotation.y = p.rot || 0.4;
        this.group.add(mesh);
        const it = {
          id: 'pickup:' + p.id, kind: 'pickup', pickup: p, mesh,
          x: p.x, y: (p.y || 0) + 0.1, z: p.z, radius: 1.4, label: 'Take', name: item.name, hidden: p.hidden || 0,
        };
        this.interactables.push(it);
        this.pickups.push(it);
      }
    }
    refreshPickups(zs) {
      for (const pk of this.pickups) {
        const taken = !!(zs && zs.taken[pk.pickup.id]);
        pk.mesh.visible = !taken;
        pk.disabled = taken;
      }
    }

    positionDoor(door) {
      const o = door.open;
      if (door.panels.length === 2) {
        const pw = door.w / 2;
        door.panels[0].g.position.x = -pw / 2 - o * pw * 0.95;
        door.panels[1].g.position.x = pw / 2 + o * pw * 0.95;
      } else if (door.panels.length === 1) {
        door.panels[0].g.position.x = -o * door.w * 0.95;
      }
      if (door.collider) door.collider.enabled = o < 0.7;
    }

    /* ----------------------------- props ----------------------------- */
    makeCtx() {
      const zone = this;
      const ctx = {
        zone,
        get B() { return zone.batch; },
        M: (k) => DV.Mat.get(k),
        prop: null,
        // world transform of a local point for the current prop
        toWorld(lx, lz) {
          const p = ctx.prop;
          const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
          return [p.x + lx * c + lz * s, p.z - lx * s + lz * c];
        },
        // collider from a local rect (prop space)
        collide(lx0, lz0, lx1, lz1, opts) {
          const pts = [ctx.toWorld(lx0, lz0), ctx.toWorld(lx1, lz0), ctx.toWorld(lx1, lz1), ctx.toWorld(lx0, lz1)];
          const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
          return zone.colliders.add(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), Object.assign({ tag: 'prop' }, opts || {}));
        },
        spot(id, lx, lz, lrot, act, extra) {
          const [x, z] = ctx.toWorld(lx, lz);
          extra = Object.assign({}, extra || {});
          lrot = lrot || 0;
          // approach point: in front of seats, behind work stations, or explicit
          let al = extra.approachLocal;
          if (!al && (act === 'sit' || act === 'recline')) al = [lx + Math.sin(lrot) * 0.7, lz + Math.cos(lrot) * 0.7];
          if (!al && (act === 'work' || act === 'type' || act === 'behind')) al = [lx - Math.sin(lrot) * 0.65, lz - Math.cos(lrot) * 0.65];
          if (al) extra.approach = ctx.toWorld(al[0], al[1]);
          delete extra.approachLocal;
          const s = Object.assign({ x, z, rot: (ctx.prop.rot || 0) + lrot, act: act || 'stand' }, extra);
          zone.addSpot(id, s);
          return s;
        },
        interact(obj) {
          zone.interactables.push(obj);
          return obj;
        },
        add(obj3d) {
          zone.group.add(obj3d);
          return obj3d;
        },
        update(fn) {
          zone.updaters.push(fn);
        },
        light(x, z) {
          return zone.lighting.sample(x, 1.2, z, 0, 1, 0, null, true);
        },
      };
      return ctx;
    }

    buildProp(p) {
      const fn = DV.Props.get(p.type);
      if (!fn) {
        console.warn('[Zone] unknown prop type', p.type);
        return;
      }
      const ctx = this.ctx;
      ctx.prop = Object.assign({ rot: 0, y: 0 }, p);
      if (p.rotDeg !== undefined) ctx.prop.rot = (p.rotDeg * Math.PI) / 180;
      const B = this.batch;
      B.room = this.roomIndexAt(p.x, p.z);
      B.push(p.x, p.elev || 0, p.z, ctx.prop.rot); // p.elev raises the whole prop; p.y is prop-specific
      try {
        fn(ctx, ctx.prop, B);
      } catch (e) {
        console.error('[Zone] prop build failed', p, e);
      }
      B.pop();
    }

    addSpot(id, s) {
      const spot = Object.assign({ id, rot: 0, act: 'stand' }, s);
      if (spot.rotDeg !== undefined) spot.rot = (spot.rotDeg * Math.PI) / 180;
      spot.room = this.roomAt(spot.x, spot.z);
      this.spots[id] = spot;
      return spot;
    }

    rasterizeColliders() {
      const nav = this.nav;
      const G = nav.cell;
      for (const b of this.colliders.boxes) {
        if (b.tag !== 'prop' || b.playerOnly) continue;
        if (b.y0 > 1.0 || b.y1 < 0.2) continue;
        // thin barriers (railings, stanchion tape, partitions) are narrower than a cell and
        // would slip between cell centres: block the cell edges they lie on instead
        const bw = b.x1 - b.x0, bd = b.z1 - b.z0;
        if (Math.min(bw, bd) < 0.3 && Math.max(bw, bd) >= 0.3) {
          if (bd < bw) {
            const jb = Math.round((((b.z0 + b.z1) / 2) - nav.z0) / G); // boundary between rows jb-1 | jb
            for (let i = nav.ci(b.x0); i <= nav.ci(b.x1); i++) {
              const cx0 = nav.x0 + i * G, ov = Math.min(cx0 + G, b.x1) - Math.max(cx0, b.x0);
              if (ov < 0.1) continue;
              if (nav.inside(i, jb - 1)) nav.edges[nav.idx(i, jb - 1)] |= 4; // S
              if (nav.inside(i, jb)) nav.edges[nav.idx(i, jb)] |= 1; // N
            }
          } else {
            const ib = Math.round((((b.x0 + b.x1) / 2) - nav.x0) / G); // boundary between cols ib-1 | ib
            for (let j = nav.cj(b.z0); j <= nav.cj(b.z1); j++) {
              const cz0 = nav.z0 + j * G, ov = Math.min(cz0 + G, b.z1) - Math.max(cz0, b.z0);
              if (ov < 0.1) continue;
              if (nav.inside(ib - 1, j)) nav.edges[nav.idx(ib - 1, j)] |= 2; // E
              if (nav.inside(ib, j)) nav.edges[nav.idx(ib, j)] |= 8; // W
            }
          }
        }
        const pad = 0.12;
        const i0 = nav.ci(b.x0 - pad), i1 = nav.ci(b.x1 + pad), j0 = nav.cj(b.z0 - pad), j1 = nav.cj(b.z1 + pad);
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
          if (!nav.inside(i, j)) continue;
          const cx = nav.cx(i), cz = nav.cz(j);
          if (cx > b.x0 - pad && cx < b.x1 + pad && cz > b.z0 - pad && cz < b.z1 + pad) nav.walk[nav.idx(i, j)] = 0;
        }
      }
    }

    buildLightGrid() {
      const S = 1.0;
      const w = Math.ceil((this.def.bounds.x1 - this.bx0) / S), h = Math.ceil((this.def.bounds.z1 - this.bz0) / S);
      this.lg = { w, h, S, data: new Float32Array(w * h * 3) };
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const x = this.bx0 + (i + 0.5) * S, z = this.bz0 + (j + 0.5) * S;
        const L = this.lighting.sample(x, 1.3, z, 0, 1, 0, null, true);
        const k = (j * w + i) * 3;
        this.lg.data[k] = L[0]; this.lg.data[k + 1] = L[1]; this.lg.data[k + 2] = L[2];
      }
    }
    lightAt(x, z, out) {
      const g = this.lg;
      out = out || [1, 1, 1];
      if (!g) { out[0] = out[1] = out[2] = 1; return out; }
      const fi = Math.floor((x - this.bx0) / g.S), fj = Math.floor((z - this.bz0) / g.S);
      const walk = this.city && this.city.walk;
      if (walk && (fi < 0 || fj < 0 || fi >= g.w || fj >= g.h)) {
        // out in the city, past the zone's light grid: open air
        const L = this.openAir || (this.openAir = this.lighting.sample(this.bx0 - 50, 1.3, this.bz0 - 50, 0, 1, 0, null, true));
        out[0] = L[0]; out[1] = L[1]; out[2] = L[2];
      } else {
        const i = U.clamp(fi, 0, g.w - 1), j = U.clamp(fj, 0, g.h - 1);
        const k = (j * g.w + i) * 3;
        out[0] = g.data[k]; out[1] = g.data[k + 1]; out[2] = g.data[k + 2];
      }
      // outdoors, people darken a little as a cloud shadow passes over them
      if (this.city) {
        const room = this.roomAt(x, z);
        if ((room && room.exterior) || (!room && walk)) {
          const s = 1 - 0.24 * this.city.cloudShadeAt(x, z);
          out[0] *= s; out[1] *= s; out[2] *= s;
        }
      }
      return out;
    }

    /* ----------------------------- runtime ----------------------------- */
    // agents: [{x,z,access(lock)->bool, isPlayer}]
    updateDoors(dt, agents) {
      for (const door of this.doors) {
        if (door.sealed) { door.target = 0; }
        else {
          let want = false;
          const d = door.def;
          for (const a of agents) {
            const dx = a.x - d.x, dz = a.z - d.z;
            if (dx * dx + dz * dz > 4.2) continue;
            if (!door.lock || a.access(door.lock, door)) { want = true; break; }
          }
          if (want) door.holdOpen = 0.6;
          else door.holdOpen -= dt;
          door.target = door.holdOpen > 0 ? 1 : 0;
        }
        const prev = door.open;
        door.open = U.clamp(door.open + Math.sign(door.target - door.open) * dt * 2.6, 0, 1);
        if (door.open !== prev) {
          if (prev === 0 || (prev === 1 && door.open < 1)) DV.Events.emit('door:move', { door, opening: door.target > 0.5 });
          this.positionDoor(door);
        }
        if (door.lamp) {
          const unlocked = door.lock && DV.Game && DV.Game.doorUnlocked && DV.Game.doorUnlocked(this.id, door);
          door.lamp.material.color.setHex(door.sealed ? 0xd03020 : unlocked ? 0x30c050 : 0xd03020);
        }
      }
    }

    update(dt) {
      for (const fn of this.updaters) fn(dt);
    }
  }

  DV.Zone = Zone;

  /* ----------------------------- sky / backdrop ----------------------------- */
  // The sky dome: the zone's three colours (overhead, horizon, below), with a pale band of haze
  // along the horizon, a soft glow where the sun is behind the overcast, and stars when it's
  // dark enough to see them. Drawn first, around the camera, no fog.
  const SKY_VERT = [
    'varying vec3 vDir;',
    'void main() {',
    '  vDir = normalize(position);',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}',
  ].join('\n');
  const SKY_FRAG = [
    'uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunCol;',
    'uniform float glow; uniform float stars; uniform float haze;',
    'varying vec3 vDir;',
    'float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }',
    'void main() {',
    '  vec3 d = normalize(vDir);',
    '  vec3 c = d.y >= 0.0 ? mix(horizon, top, pow(d.y, 0.6)) : mix(horizon, ground, min(1.0, -d.y * 3.0));',
    // a band of haze where the sky meets the city
    '  c = mix(c, horizon * 1.06 + 0.02, haze * exp(-abs(d.y) * 14.0));',
    // the sun behind the cloud: a wide soft glow, a brighter core
    '  float s = max(dot(d, normalize(sunDir)), 0.0);',
    '  c += sunCol * glow * (0.55 * pow(s, 5.0) + 0.45 * pow(s, 48.0));',
    // stars, high up, when it is dark
    '  if (stars > 0.0 && d.y > 0.06) {',
    '    vec3 cell = floor(d * 260.0);',
    '    float h = hash(cell);',
    '    float tw = step(0.9965, h) * (0.5 + 0.5 * hash(cell + 7.0));',
    '    c += vec3(0.85, 0.88, 1.0) * tw * stars * smoothstep(0.06, 0.3, d.y);',
    '  }',
    '  gl_FragColor = vec4(c, 1.0);',
    '}',
  ].join('\n');
  function buildSky() {
    const g = new THREE.Group();
    g.name = 'sky';
    const geo = new THREE.SphereGeometry(180, 32, 16);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color(0x4a5868) }, horizon: { value: new THREE.Color(0x9aa2a8) }, ground: { value: new THREE.Color(0x3a3a3a) },
        sunDir: { value: new THREE.Vector3(0.4, 0.5, 0.3) }, sunCol: { value: new THREE.Color(1, 0.96, 0.88) },
        glow: { value: 0.2 }, stars: { value: 0 }, haze: { value: 0.35 },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const dome = new THREE.Mesh(geo, mat);
    dome.renderOrder = -10;
    g.add(dome);
    const skyTex = DV.Tex.get('skyline');
    skyTex.repeat.set(3, 1);
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(150, 150, 70, 32, 1, true),
      new THREE.MeshBasicMaterial({ map: skyTex, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false, color: 0x8a9098 })
    );
    cyl.position.y = 22;
    cyl.renderOrder = -9;
    g.add(cyl);
    // far haze layer (second skyline, lighter)
    const cyl2 = new THREE.Mesh(
      new THREE.CylinderGeometry(165, 165, 60, 32, 1, true),
      new THREE.MeshBasicMaterial({ map: skyTex, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false, color: 0xb4bac2, opacity: 0.5 })
    );
    cyl2.position.y = 18;
    cyl2.rotation.y = 1.3;
    cyl2.renderOrder = -10;
    g.add(cyl2);
    g.userData = { dome, cyl, cyl2 };
    return g;
  }
  function setSkyColors(sky, top, horizon, ground) {
    const u = sky.userData.dome.material.uniforms;
    u.top.value.set(top);
    u.horizon.value.set(horizon);
    u.ground.value.set(ground || horizon);
    // a dark sky shows its stars
    const lum = (c) => 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
    u.stars.value = U.clamp((0.08 - lum(u.top.value)) / 0.06, 0, 1);
  }

  /* ----------------------------- the time of day ----------------------------- */
  // Out of doors on the clock (zones with def.timeOfDay): the sky, the fog, the city's haze and
  // its lit windows follow the hour. [minute, sky brightness, horizon tint, sun glow, stars,
  // lit windows]. Daytime is the zone's own colours, untouched.
  const TOD = [
    [0, 0.16, [0.3, 0.33, 0.42], 0, 1, 1],
    [330, 0.18, [0.32, 0.34, 0.44], 0, 0.9, 1],
    [400, 0.62, [1.06, 0.84, 0.74], 0.55, 0.15, 0.6],
    [470, 1, [1, 1, 1], 0.3, 0, 0.1],
    [1020, 1, [1, 1, 1], 0.3, 0, 0.1],
    [1110, 0.93, [1.1, 0.96, 0.84], 0.6, 0, 0.3],
    [1170, 0.72, [1.18, 0.8, 0.64], 0.85, 0.02, 0.7],
    [1230, 0.4, [0.66, 0.52, 0.56], 0.3, 0.35, 1],
    [1290, 0.2, [0.32, 0.34, 0.44], 0, 0.9, 1],
    [1440, 0.16, [0.3, 0.33, 0.42], 0, 1, 1],
  ];
  function todAt(m) {
    for (let i = 0; i + 1 < TOD.length; i++) {
      const a = TOD[i], b = TOD[i + 1];
      if (m >= a[0] && m <= b[0]) {
        const k = (m - a[0]) / (b[0] - a[0] || 1);
        const L = (x, y) => x + (y - x) * k;
        return { sky: L(a[1], b[1]), tint: [L(a[2][0], b[2][0]), L(a[2][1], b[2][1]), L(a[2][2], b[2][2])], glow: L(a[3], b[3]), stars: L(a[4], b[4]), lit: L(a[5], b[5]) };
      }
    }
    return { sky: 1, tint: [1, 1, 1], glow: 0.3, stars: 0, lit: 0.1 };
  }
  // the sun's way across the sky: up in the east at six, south at one, down in the west at eight
  function sunAt(m, out) {
    const t = U.clamp((m - 360) / 840, -0.15, 1.15);
    const az = t * Math.PI, el = Math.max(-0.1, Math.sin(t * Math.PI) * 0.95);
    return out.set(Math.cos(az) * Math.cos(el), Math.sin(el) + 0.04, Math.sin(az) * Math.cos(el)).normalize();
  }

  /* ------------------------------ World ------------------------------ */
  DV.World = {
    scene: null,
    zones: {},
    current: null,
    init(scene) {
      this.scene = scene;
      this.sky = buildSky();
      scene.add(this.sky);
      this.ambient = new THREE.AmbientLight(0xffffff, 0.55);
      this.hemi = new THREE.HemisphereLight(0xdfe6ff, 0x3a3530, 0.45);
      this.dir = new THREE.DirectionalLight(0xfff4e0, 0.55);
      this.dir.position.set(3, 10, 6);
      scene.add(this.ambient, this.hemi, this.dir);
    },
    getZone(id) {
      if (!this.zones[id]) {
        const def = DV.Zones.get(id);
        if (!def) throw new Error('Unknown zone ' + id);
        const z = new Zone(def);
        z.build();
        this.zones[id] = z;
      }
      return this.zones[id];
    },
    activate(id) {
      const zone = this.getZone(id);
      if (this.current === zone) return zone;
      if (this.current) {
        this.scene.remove(this.current.group);
        if (this.current.def.onExit) this.current.def.onExit(this.current);
      }
      this.current = zone;
      this.scene.add(zone.group);
      this.applyAtmosphere(zone);
      if (zone.def.onEnter) zone.def.onEnter(zone);
      DV.Events.emit('zone:activated', zone);
      return zone;
    },
    applyAtmosphere(zone) {
      const d = zone.def;
      const fog = d.fog || { color: 0x6f7378, near: 20, far: 70 };
      const dd = DV.Settings.get('drawDistance');
      const mul = dd === 'near' ? 0.7 : dd === 'far' ? 1.5 : 1;
      if (!this.scene.fog) this.scene.fog = new THREE.Fog(fog.color, fog.near * mul, fog.far * mul);
      // zones with an outdoor haze blend between the two as you go in and out (see update)
      const fo = d.fogOutdoor;
      this.fogBlend = fo ? { a: { c: new THREE.Color(fog.color), near: fog.near * mul, far: fog.far * mul }, b: { c: new THREE.Color(fo.color), near: fo.near * mul, far: fo.far * mul }, k: -1 } : null;
      this.scene.fog.color.setHex(fog.color);
      this.scene.fog.near = fog.near * mul;
      this.scene.fog.far = fog.far * mul;
      this.scene.background = new THREE.Color(fog.color);
      const sky = d.sky || {};
      setSkyColors(this.sky, sky.top || 0x4a5868, sky.horizon || 0x9aa2a8, sky.ground || 0x3a3a3a);
      const su = this.sky.userData.dome.material.uniforms;
      su.sunDir.value.fromArray((d.exterior && d.exterior.sunDir) || [0.4, 0.5, 0.3]);
      su.glow.value = sky.glow !== undefined ? sky.glow : 0.22;
      su.sunCol.value.set(sky.sun || 0xfff2dc);
      this.base = { top: su.top.value.clone(), horizon: su.horizon.value.clone(), ground: su.ground.value.clone(), stars: su.stars.value, glow: su.glow.value, fog: new THREE.Color(fog.color), fogOut: fo ? new THREE.Color(fo.color) : null, lights: [this.ambient.intensity, this.hemi.intensity, this.dir.intensity] };
      this.tod = null;
      this.todLight = undefined;
      this.sky.userData.cyl.visible = sky.skyline !== false;
      this.sky.userData.cyl2.visible = sky.skyline !== false;
      this.sky.userData.cyl.material.color.setHex(sky.skylineTint || 0x8a9098);
      this.sky.visible = sky.visible !== false;
      const cl = d.charLight || {};
      this.ambient.intensity = cl.ambient === undefined ? 0.5 : cl.ambient;
      this.hemi.intensity = cl.hemi === undefined ? 0.45 : cl.hemi;
      this.dir.intensity = cl.dir === undefined ? 0.5 : cl.dir;
      if (cl.dirColor) this.dir.color.setHex(cl.dirColor);
      else this.dir.color.setHex(0xfff4e0);
      this.base.lights = [this.ambient.intensity, this.hemi.intensity, this.dir.intensity];
    },
    // the hour, out of doors (zones on the clock only): sky, fog, the city's haze, lit windows
    timeOfDay(zone) {
      if (!zone.def.timeOfDay || !this.base || !DV.Clock) return;
      const m = DV.Clock.minutes();
      if (this.tod && Math.abs(this.tod.m - m) < 0.5) return;
      const T = todAt(m), B = this.base, u = this.sky.userData.dome.material.uniforms;
      this.tod = Object.assign({ m }, T);
      const tint = (c, base, k) => c.copy(base).multiplyScalar(k).multiply(new THREE.Color(T.tint[0], T.tint[1], T.tint[2]));
      u.top.value.copy(B.top).multiplyScalar(T.sky * (T.sky < 1 ? 0.85 : 1));
      tint(u.horizon.value, B.horizon, 0.35 + 0.65 * T.sky);
      u.ground.value.copy(B.ground).multiplyScalar(T.sky);
      u.glow.value = T.glow;
      u.stars.value = Math.max(B.stars, T.stars);
      sunAt(m, u.sunDir.value);
      u.sunCol.value.setRGB(1, 0.9 + 0.08 * T.sky, 0.75 + 0.2 * T.sky);
      const fb = this.fogBlend;
      if (fb && B.fogOut) { tint(fb.b.c, B.fogOut, 0.3 + 0.7 * T.sky); tint(fb.a.c, B.fog, 0.6 + 0.4 * T.sky); fb.k = -1; }
      const city = zone.city;
      if (city) {
        if (!city.baseHaze) city.baseHaze = city.shared.hazeColor.value.clone();
        tint(city.shared.hazeColor.value, city.baseHaze, 0.3 + 0.7 * T.sky);
        city.shared.ambient.value.setScalar(0.38 + 0.62 * T.sky);
        city.shared.litAmt.value = T.lit;
      }
      if (zone.streetKit) zone.streetKit.dim(0.4 + 0.6 * T.sky);
      // the lamps come on at dusk (and go off once it's light)
      if (zone.lamps && !zone.lampGlow) zone.lampGlow = DV.StreetKit.glow(zone, zone.lamps);
      DV.StreetKit.lampsOn((T.lit - 0.28) / 0.42, zone);
      if (city) {
        // the streets themselves, the signs, and the clouds overhead
        const k = 0.35 + 0.65 * T.sky;
        for (const mt of (city.walk ? city.walk.mats : []).concat(city.walk ? city.walk.signs.map((q) => q.material) : [])) {
          if (!mt.userData.base) mt.userData.base = mt.color.clone();
          mt.color.copy(mt.userData.base).multiplyScalar(k);
        }
        const du = city.deck.material.uniforms;
        if (!city.baseDeck) city.baseDeck = [du.lightCol.value.clone(), du.darkCol.value.clone()];
        tint(du.lightCol.value, city.baseDeck[0], 0.25 + 0.75 * T.sky);
        tint(du.darkCol.value, city.baseDeck[1], 0.25 + 0.75 * T.sky);
      }
      this.todLight = 0.45 + 0.55 * T.sky;
    },
    // remove a zone from the cache so it rebuilds next time (used by simulations)
    dispose(id) {
      const z = this.zones[id];
      if (!z) return;
      if (this.current === z) { this.scene.remove(z.group); this.current = null; }
      if (z.city && DV.City) DV.City.dispose(z.city);
      z.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      delete this.zones[id];
    },
    update(dt, camera) {
      if (this.sky && camera) this.sky.position.set(camera.position.x, 0, camera.position.z);
      if (this.current) this.timeOfDay(this.current);
      const fb = this.fogBlend;
      if (fb && camera && this.current) {
        const room = this.current.roomAt(camera.position.x, camera.position.z);
        // (up over the roof, flying, is out of doors too)
        const want = !room || room.exterior || camera.position.y > room.h + 0.5 ? 1 : 0;
        fb.k = fb.k < 0 ? want : U.damp(fb.k, want, 2.2, dt);
        const f = this.scene.fog;
        f.color.copy(fb.a.c).lerp(fb.b.c, fb.k);
        f.near = U.lerp(fb.a.near, fb.b.near, fb.k);
        f.far = U.lerp(fb.a.far, fb.b.far, fb.k);
        this.scene.background.copy(f.color);
        // the evening light on people out of doors
        if (this.todLight !== undefined && this.base && this.base.lights) {
          const k = U.lerp(1, this.todLight, fb.k);
          this.ambient.intensity = this.base.lights[0] * k; this.hemi.intensity = this.base.lights[1] * k; this.dir.intensity = this.base.lights[2] * k;
        }
      }
      if (this.current) {
        this.current.update(dt);
        if (camera) this.current.cullDetails(camera.position);
      }
    },
  };
})();
