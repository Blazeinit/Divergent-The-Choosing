/* ==========================================================================
   DIVERGENT — collision world
   Axis aligned boxes in a spatial hash. Characters are circles in XZ.
   Also provides 3D ray casts for camera collision.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  class CollisionWorld {
    constructor() {
      this.boxes = [];
      this.cell = 4;
      this.hash = new Map();
    }

    /**
     * opts: { y0, y1, camera (blocks camera, default true when tall), playerOnly, tag, enabled }
     */
    add(x0, z0, x1, z1, opts) {
      opts = opts || {};
      const b = {
        x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1),
        y0: opts.y0 || 0,
        y1: opts.y1 === undefined ? 3 : opts.y1,
        camera: opts.camera === undefined ? (opts.y1 === undefined ? true : opts.y1 > 1.6) : opts.camera,
        playerOnly: !!opts.playerOnly,
        enabled: opts.enabled === undefined ? true : opts.enabled,
        tag: opts.tag || null,
      };
      this.boxes.push(b);
      this.insert(b);
      return b;
    }

    // Adds the AABB of a rotated rectangle (local half extents hx,hz) at x,z.
    addRotated(x, z, hx, hz, rot, opts) {
      const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
      const ex = hx * c + hz * s, ez = hx * s + hz * c;
      return this.add(x - ex, z - ez, x + ex, z + ez, opts);
    }

    insert(b) {
      const cs = this.cell;
      const i0 = Math.floor(b.x0 / cs), i1 = Math.floor(b.x1 / cs);
      const j0 = Math.floor(b.z0 / cs), j1 = Math.floor(b.z1 / cs);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const k = i * 100003 + j;
        let l = this.hash.get(k);
        if (!l) { l = []; this.hash.set(k, l); }
        l.push(b);
      }
    }

    query(x0, z0, x1, z1, out) {
      out = out || [];
      out.length = 0;
      const cs = this.cell;
      const i0 = Math.floor(x0 / cs), i1 = Math.floor(x1 / cs);
      const j0 = Math.floor(z0 / cs), j1 = Math.floor(z1 / cs);
      const stamp = (this._stamp = (this._stamp || 0) + 1);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const l = this.hash.get(i * 100003 + j);
        if (!l) continue;
        for (const b of l) {
          if (b._s === stamp) continue;
          b._s = stamp;
          out.push(b);
        }
      }
      return out;
    }

    /**
     * Push a circle out of all blocking boxes. who: 'player' | 'npc'
     * Returns adjusted [x, z].
     */
    resolveCircle(x, z, r, who, feetY) {
      const list = this.query(x - r - 0.1, z - r - 0.1, x + r + 0.1, z + r + 0.1, this._tmp || (this._tmp = []));
      const fy = feetY || 0;
      for (let iter = 0; iter < 3; iter++) {
        let moved = false;
        for (const b of list) {
          if (!b.enabled) continue;
          if (b.playerOnly && who !== 'player') continue;
          // vertical overlap with a body standing at feetY (0.15 .. 1.7 above feet)
          if (b.y1 <= fy + 0.15 || b.y0 >= fy + 1.2) continue;
          const cx = U.clamp(x, b.x0, b.x1), cz = U.clamp(z, b.z0, b.z1);
          let dx = x - cx, dz = z - cz;
          const d2 = dx * dx + dz * dz;
          if (d2 >= r * r) continue;
          if (d2 > 1e-10) {
            const d = Math.sqrt(d2);
            const push = r - d;
            x += (dx / d) * push;
            z += (dz / d) * push;
          } else {
            // center inside the box: push along the axis of least penetration
            const pl = x - b.x0 + r, pr = b.x1 - x + r, pt = z - b.z0 + r, pb = b.z1 - z + r;
            const m = Math.min(pl, pr, pt, pb);
            if (m === pl) x = b.x0 - r;
            else if (m === pr) x = b.x1 + r;
            else if (m === pt) z = b.z0 - r;
            else z = b.z1 + r;
          }
          moved = true;
        }
        if (!moved) break;
      }
      return [x, z];
    }

    // true if circle overlaps any blocking box
    blocked(x, z, r, who) {
      const list = this.query(x - r, z - r, x + r, z + r, this._tmp2 || (this._tmp2 = []));
      for (const b of list) {
        if (!b.enabled) continue;
        if (b.playerOnly && who !== 'player') continue;
        if (b.y1 <= 0.15 || b.y0 >= 1.2) continue;
        const cx = U.clamp(x, b.x0, b.x1), cz = U.clamp(z, b.z0, b.z1);
        if ((x - cx) * (x - cx) + (z - cz) * (z - cz) < r * r) return true;
      }
      return false;
    }

    /**
     * 3D ray cast against camera-blocking boxes. Returns distance to first hit or maxDist.
     */
    raycast(ox, oy, oz, dx, dy, dz, maxDist) {
      const ex = ox + dx * maxDist, ez = oz + dz * maxDist;
      const list = this.query(Math.min(ox, ex) - 0.5, Math.min(oz, ez) - 0.5, Math.max(ox, ex) + 0.5, Math.max(oz, ez) + 0.5, this._tmp3 || (this._tmp3 = []));
      let best = maxDist;
      for (const b of list) {
        if (!b.enabled || !b.camera) continue;
        const t = rayBox(ox, oy, oz, dx, dy, dz, b.x0, b.y0, b.z0, b.x1, b.y1, b.z1);
        if (t >= 0 && t < best) best = t;
      }
      return best;
    }

    // 2D segment test (line of sight at eye height) used by AI perception
    segmentClear(ax, az, bx, bz, y) {
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 1e-4) return true;
      const t = this.raycast(ax, y || 1.5, az, dx / len, 0, dz / len, len);
      return t >= len - 1e-3;
    }
  }

  function rayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
    let tmin = -Infinity, tmax = Infinity;
    const axes = [[ox, dx, x0, x1], [oy, dy, y0, y1], [oz, dz, z0, z1]];
    for (const [o, d, a, b] of axes) {
      if (Math.abs(d) < 1e-9) {
        if (o < a || o > b) return -1;
      } else {
        let t1 = (a - o) / d, t2 = (b - o) / d;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return -1;
      }
    }
    if (tmax < 0) return -1;
    return tmin >= 0 ? tmin : 0;
  }

  DV.CollisionWorld = CollisionWorld;
})();
