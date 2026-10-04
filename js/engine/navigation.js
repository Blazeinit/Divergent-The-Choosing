/* ==========================================================================
   DIVERGENT — grid navigation
   The zone builder rasterizes rooms into a 0.5m grid. Walls live on cell
   edges (bitmask), doors carry lock ids. A* with octile heuristic, then a
   string-pulling pass so NPCs walk in natural straight lines.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  // edge bits
  const N = 1, E = 2, S = 4, W = 8; // N = -z, S = +z, E = +x, W = -x

  class BinaryHeap {
    constructor() { this.a = []; this.f = []; }
    push(n, f) {
      const a = this.a, fa = this.f;
      a.push(n); fa.push(f);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (fa[p] <= fa[i]) break;
        [a[p], a[i]] = [a[i], a[p]];
        [fa[p], fa[i]] = [fa[i], fa[p]];
        i = p;
      }
    }
    pop() {
      const a = this.a, fa = this.f;
      const top = a[0];
      const ln = a.pop(), lf = fa.pop();
      if (a.length) {
        a[0] = ln; fa[0] = lf;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < a.length && fa[l] < fa[m]) m = l;
          if (r < a.length && fa[r] < fa[m]) m = r;
          if (m === i) break;
          [a[m], a[i]] = [a[i], a[m]];
          [fa[m], fa[i]] = [fa[i], fa[m]];
          i = m;
        }
      }
      return top;
    }
    get size() { return this.a.length; }
  }

  class NavGrid {
    constructor(x0, z0, w, h, cell) {
      this.x0 = x0; this.z0 = z0; this.w = w; this.h = h; this.cell = cell;
      const n = w * h;
      this.walk = new Uint8Array(n);
      this.edges = new Uint8Array(n);
      this.cost = new Float32Array(n);
      this.lock = new Int16Array(n); // 0 = none, otherwise index into lockNames
      this.room = new Int16Array(n).fill(-1);
      this.lockNames = [null];
      this.g = new Float32Array(n);
      this.parent = new Int32Array(n);
      this.stamp = new Uint32Array(n);
      this.closed = new Uint32Array(n);
      this.search = 0;
    }
    idx(i, j) { return j * this.w + i; }
    ci(x) { return Math.floor((x - this.x0) / this.cell); }
    cj(z) { return Math.floor((z - this.z0) / this.cell); }
    cx(i) { return this.x0 + (i + 0.5) * this.cell; }
    cz(j) { return this.z0 + (j + 0.5) * this.cell; }
    inside(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h; }
    lockId(name) {
      if (!name) return 0;
      let k = this.lockNames.indexOf(name);
      if (k < 0) { this.lockNames.push(name); k = this.lockNames.length - 1; }
      return k;
    }
    isWalkable(x, z) {
      const i = this.ci(x), j = this.cj(z);
      return this.inside(i, j) && this.walk[this.idx(i, j)] === 1;
    }
    roomAt(x, z) {
      const i = this.ci(x), j = this.cj(z);
      if (!this.inside(i, j)) return -1;
      return this.room[this.idx(i, j)];
    }

    // can we step from cell a=(i,j) to orthogonal neighbor in direction bit
    canStep(i, j, dir, access) {
      const k = this.idx(i, j);
      if (this.edges[k] & dir) return false;
      let ni = i, nj = j;
      if (dir === N) nj--; else if (dir === S) nj++; else if (dir === E) ni++; else ni--;
      if (!this.inside(ni, nj)) return false;
      const nk = this.idx(ni, nj);
      if (!this.walk[nk]) return false;
      const lk = this.lock[nk];
      if (lk && !(access && access(this.lockNames[lk]))) {
        // allowed to leave a locked area if already standing inside it
        if (this.lock[k] !== lk) return false;
      }
      return true;
    }

    nearestWalkable(x, z, maxR) {
      const i0 = this.ci(x), j0 = this.cj(z);
      if (this.inside(i0, j0) && this.walk[this.idx(i0, j0)]) return [this.cx(i0), this.cz(j0)];
      const R = maxR || 12;
      let best = null, bd = Infinity;
      for (let r = 1; r <= R; r++) {
        for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
          if (Math.abs(di) !== r && Math.abs(dj) !== r) continue;
          const i = i0 + di, j = j0 + dj;
          if (!this.inside(i, j) || !this.walk[this.idx(i, j)] || this.lock[this.idx(i, j)]) continue;
          const d = (this.cx(i) - x) ** 2 + (this.cz(j) - z) ** 2;
          if (d < bd) { bd = d; best = [this.cx(i), this.cz(j)]; }
        }
        if (best) return best;
      }
      return null;
    }

    /**
     * A* path from (sx,sz) to (tx,tz). access(lockName) -> bool.
     * Returns array of [x,z] waypoints (smoothed) or null.
     */
    findPath(sx, sz, tx, tz, access) {
      let si = this.ci(sx), sj = this.cj(sz), ti = this.ci(tx), tj = this.cj(tz);
      if (!this.inside(si, sj) || !this.walk[this.idx(si, sj)]) {
        const p = this.nearestWalkable(sx, sz, 6);
        if (!p) return null;
        si = this.ci(p[0]); sj = this.cj(p[1]);
      }
      if (!this.inside(ti, tj) || !this.walk[this.idx(ti, tj)]) {
        const p = this.nearestWalkable(tx, tz, 8);
        if (!p) return null;
        ti = this.ci(p[0]); tj = this.cj(p[1]);
      }
      const start = this.idx(si, sj), goal = this.idx(ti, tj);
      if (start === goal) return [[tx, tz]];
      const s = ++this.search;
      const heap = new BinaryHeap();
      this.g[start] = 0; this.stamp[start] = s; this.parent[start] = -1;
      const H = (i, j) => {
        const dx = Math.abs(i - ti), dz = Math.abs(j - tj);
        return (dx + dz + (1.4142 - 2) * Math.min(dx, dz));
      };
      heap.push(start, H(si, sj));
      const dirs = [[0, -1, N, 1], [1, 0, E, 1], [0, 1, S, 1], [-1, 0, W, 1]];
      let found = false, iters = 0;
      while (heap.size) {
        const cur = heap.pop();
        if (this.closed[cur] === s) continue;
        this.closed[cur] = s;
        if (cur === goal) { found = true; break; }
        if (++iters > 60000) break;
        const ci = cur % this.w, cj = (cur / this.w) | 0;
        const gc = this.g[cur];
        // orthogonal
        const okDir = [false, false, false, false];
        for (let d = 0; d < 4; d++) {
          const [di, dj, bit] = dirs[d];
          if (!this.canStep(ci, cj, bit, access)) continue;
          okDir[d] = true;
          const n = this.idx(ci + di, cj + dj);
          const ng = gc + 1 + this.cost[n];
          if (this.stamp[n] !== s || ng < this.g[n]) {
            this.stamp[n] = s; this.g[n] = ng; this.parent[n] = cur;
            heap.push(n, ng + H(ci + di, cj + dj));
          }
        }
        // diagonals: need both orthogonal paths clear
        const diag = [[1, -1, 0, 1, E, N], [1, 1, 2, 1, E, S], [-1, 1, 2, 3, W, S], [-1, -1, 0, 3, W, N]];
        for (const [di, dj, a, b, bx, bz] of diag) {
          if (!okDir[a] || !okDir[b]) continue;
          // check from the two intermediate cells as well
          if (!this.canStep(ci + di, cj, bz, access) || !this.canStep(ci, cj + dj, bx, access)) continue;
          const n = this.idx(ci + di, cj + dj);
          const ng = gc + 1.4142 + this.cost[n];
          if (this.stamp[n] !== s || ng < this.g[n]) {
            this.stamp[n] = s; this.g[n] = ng; this.parent[n] = cur;
            heap.push(n, ng + H(ci + di, cj + dj));
          }
        }
      }
      if (!found) return null;
      const cells = [];
      for (let c = goal; c !== -1; c = this.parent[c]) cells.push(c);
      cells.reverse();
      const pts = cells.map((c) => [this.cx(c % this.w), this.cz((c / this.w) | 0)]);
      pts[0] = [sx, sz];
      pts[pts.length - 1] = [tx, tz];
      return this.smooth(pts, access);
    }

    // segment walk check between two points (cell transitions must be legal)
    los(ax, az, bx, bz, access, strict) {
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz);
      const steps = Math.max(1, Math.ceil(len / (this.cell * 0.35)));
      let pi = this.ci(ax), pj = this.cj(az);
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const i = this.ci(ax + dx * t), j = this.cj(az + dz * t);
        if (i === pi && j === pj) continue;
        if (!this.inside(i, j) || !this.walk[this.idx(i, j)]) return false;
        if (strict && this.edges[this.idx(i, j)] && k < steps - 1) return false;
        const di = i - pi, dj = j - pj;
        if (Math.abs(di) + Math.abs(dj) === 1) {
          const bit = di === 1 ? E : di === -1 ? W : dj === 1 ? S : N;
          if (!this.canStep(pi, pj, bit, access)) return false;
        } else {
          const bx_ = di === 1 ? E : W, bz_ = dj === 1 ? S : N;
          const ok1 = this.canStep(pi, pj, bx_, access) && this.canStep(pi + di, pj, bz_, access);
          const ok2 = this.canStep(pi, pj, bz_, access) && this.canStep(pi, pj + dj, bx_, access);
          if (!(ok1 && ok2)) return false;
        }
        pi = i; pj = j;
      }
      return true;
    }

    smooth(pts, access) {
      if (pts.length <= 2) return pts;
      const out = [pts[0]];
      let anchor = 0;
      for (let i = 2; i < pts.length; i++) {
        if (!this.los(pts[anchor][0], pts[anchor][1], pts[i][0], pts[i][1], access, true)) {
          out.push(pts[i - 1]);
          anchor = i - 1;
        }
      }
      out.push(pts[pts.length - 1]);
      return out;
    }

    randomPointInRect(r, rng, access) {
      for (let k = 0; k < 30; k++) {
        const x = r.x0 + 0.6 + (rng ? rng() : Math.random()) * Math.max(0.1, r.x1 - r.x0 - 1.2);
        const z = r.z0 + 0.6 + (rng ? rng() : Math.random()) * Math.max(0.1, r.z1 - r.z0 - 1.2);
        const i = this.ci(x), j = this.cj(z);
        if (!this.inside(i, j)) continue;
        const id = this.idx(i, j);
        if (this.walk[id] && !this.edges[id] && !this.lock[id] && this.cost[id] < 1) return [this.cx(i), this.cz(j)];
      }
      return null;
    }
  }

  NavGrid.N = N; NavGrid.E = E; NavGrid.S = S; NavGrid.W = W;
  DV.NavGrid = NavGrid;
})();
