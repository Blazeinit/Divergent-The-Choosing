/* ==========================================================================
   DIVERGENT — loose things: a small rigid-body world
   Street things that aren't bolted down (bins, newspaper boxes, traffic
   cones, crates, rubbish bags, drink cans, a ball) are bodies here. You and
   the people walking past push them about, cars knock them flying, and they
   fall, bounce, slide, rock, tip over, roll, bump into walls and each other,
   come to rest on top of things, and settle.

   The model is the constrained one games use for props:
     - each body has a height: it stands on whatever's under its middle (the
       ground, a low step or pallet, the top of a crate or a newspaper box);
       when that goes, it falls, and it lands with a bounce that's its own
       (a ball a lot, a crate a little, a rubbish bag not at all);
     - on what it's standing on it slides with friction (relative to that:
       a crate on a crate you shove comes along);
     - a knock above its base rocks it on the edge of its base (a pendulum
       about that edge, under gravity): past the tipping point it falls over
       and lands, short of it it rocks back and settles;
     - on its side, a round thing rolls across its axis (a cone rolls round
       its tip, in a circle), anything else slides; a ball rolls any way and
       turns as it goes;
     - against walls (the zone's colliders) and each other it's a circle in
       plan, and bounces off a little; a lip lower than LIP it rides up onto;
     - when nothing about it has moved for a moment it sleeps, until
       something touches it again. Only what's awake (and near you) is
       stepped, and neighbours are found through its own spatial hash.
   Walking into a body shoves it along, running into it knocks it over; a
   light thing (a can, a ball) is kicked off your foot; landing from a jump
   next to things bumps them; cars knock them flying.

   They're all drawn in one vertex-coloured mesh, rebuilt only when
   something has moved (one draw call for every loose thing in the city).

     const W = DV.Physics.world(zone, { mat, piece })   piece(kind) → geometry
     W.add(kind, x, z, yaw [, y])  → a body (y: put down on top of something)
     W.remove(b)
     W.knock(b, vx, vz, height)   a sudden change of velocity, applied that high up
     W.thump(x, z, k)             something heavy landing there (you, off a jump)
     W.standAt(x, z, upTo)        the top of what you could stand on there (or null)
     W.step(dt, { player, peds, cars })
     W.view(px, pz, hidden)       what's drawn (near you, and not from deep indoors)
     DV.Physics.SHAPES            the kinds of thing, and how they behave
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const G = 9.8, H = 1 / 120, MAX_SUB = 14;
  const MU = 0.55, MU_ROLL = 0.13, MU_BALL = 0.12, E_WALL = 0.3, E_BODY = 0.35;
  const SHOW_R = 230, SIM_R = 80, PLAYER_M = 70, VMAX = 22, VMAX_UP = 9;
  const LIP = 0.12; // a body rides up onto anything no higher than this over what it stands on (a kerb, a pallet)
  const CELL = 2; // the bodies' own hash (nothing reaches further than the next cell)

  // r: radius in plan (round) or w × d (boxes); h: height; m: mass (kg); hp: where a person's
  // knock lands on it; e: how much of a fall it bounces back; round: rolls on its side; ball:
  // rolls any way; stand: flat on top (things rest on it, you can stand on it); kick: light
  // enough to fly off your foot (how much faster than you); snd: what it sounds like
  const SHAPES = {
    bin: { round: true, r: 0.28, h: 1.0, m: 18, hp: 0.75, e: 0.3, snd: 'bin' },
    news: { w: 1.06, d: 0.45, h: 1.02, m: 45, hp: 0.8, e: 0.12, snd: 'clank', stand: true },
    cone: { round: true, r: 0.2, h: 0.72, m: 3, hp: 0.5, com: 0.32, e: 0.35, snd: 'cone', cone: true },
    crate: { w: 0.62, d: 0.62, h: 0.6, m: 16, hp: 0.5, e: 0.25, snd: 'crate', stand: true },
    bag: { round: true, r: 0.27, h: 0.55, m: 6, hp: 0.4, soft: true, e: 0, snd: 'hop' },
    can: { round: true, r: 0.045, h: 0.13, m: 0.4, hp: 0.1, e: 0.4, snd: 'tin', kick: 2.1 },
    ball: { ball: true, r: 0.12, h: 0.24, m: 0.45, hp: 0.12, e: 0.72, snd: 'ball', kick: 1.7 },
  };

  const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _a = new THREE.Vector3(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);

  class World {
    constructor(zone, o) {
      this.zone = zone;
      this.o = o || {};
      this.bodies = [];
      this.cells = new Map(); // where the bodies are, by 2 m cell (for neighbours, and what's touched)
      this.live = new Set(); // the ones awake
      this.dirty = true;
      this.drawn = [];
      this.mesh = null;
      this.tmp = [];
      this.nb = [];
      this.nb2 = [];
      this.nb3 = [];
      this.t = 0;
      this.stats = { steps: 0, awake: 0, drawn: 0, rebuilds: 0, ms: 0 };
    }
    add(kind, x, z, yaw, y) {
      const S = SHAPES[kind];
      if (!S) return null;
      const b = {
        kind, S, x, z, y: y || 0, yaw: yaw || 0, vx: 0, vz: 0, vy: 0, wy: 0,
        tip: 0, w: 0, dir: 0, down: false, spin: 0, // (tipping: tip angle, its rate, which way; lying down; rolled)
        sup: y || 0, on: null, g: 0, q: S.ball ? new THREE.Quaternion() : null, // (what it stands on: how high, which body; a ball's turn)
        asleep: true, still: 0, home: [x, z, yaw || 0], id: this.bodies.length, cell: null,
      };
      // tipping about the edge of its base: the centre of mass's height
      b.hc = S.com || S.h / 2;
      this.bodies.push(b);
      this.file(b);
      this.dirty = true;
      return b;
    }
    remove(b) {
      const i = this.bodies.indexOf(b);
      if (i < 0) return;
      this.bodies.splice(i, 1);
      this.unfile(b);
      this.live.delete(b);
      for (const o of this.bodies) if (o.on === b) { o.on = null; this.wake(o); }
      this.dirty = true;
    }

    /* ---- the hash ---- */
    key(x, z) { return Math.floor(x / CELL) * 100003 + Math.floor(z / CELL); }
    file(b) {
      const k = this.key(b.x, b.z);
      if (k === b.cell) return;
      this.unfile(b);
      let l = this.cells.get(k);
      if (!l) this.cells.set(k, (l = []));
      l.push(b);
      b.cell = k;
    }
    unfile(b) {
      const l = b.cell === null ? null : this.cells.get(b.cell);
      const i = l ? l.indexOf(b) : -1;
      if (i >= 0) { l[i] = l[l.length - 1]; l.pop(); }
      b.cell = null;
    }
    // every body in the cells within R of (x, z)
    around(x, z, R, out) {
      out.length = 0;
      const i0 = Math.floor((x - R) / CELL), i1 = Math.floor((x + R) / CELL), j0 = Math.floor((z - R) / CELL), j1 = Math.floor((z + R) / CELL);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const l = this.cells.get(i * 100003 + j); if (l) for (const b of l) out.push(b); }
      return out;
    }

    /* ---- its shape, as it stands ---- */
    // the half-width of the base towards the way it's tipping (a box goes over onto a face)
    base(b) {
      const S = b.S;
      if (S.round || S.ball) return S.r;
      const a = Math.abs(Math.cos(b.dir - b.yaw));
      return a > 0.7 ? S.d / 2 : S.w / 2;
    }
    // where it is in plan, and how big (lying down: the middle of it, end to end)
    plan(b) {
      const S = b.S;
      if (S.ball) return [b.x, b.z, S.r];
      if (!b.down && b.tip < 0.35) return [b.x, b.z, S.round ? S.r : Math.max(S.w, S.d) * 0.48];
      const k = Math.sin(b.tip) * (S.h / 2);
      return [b.x + Math.sin(b.dir) * k, b.z + Math.cos(b.dir) * k, Math.max(S.round ? S.r : Math.min(S.w, S.d) / 2, (S.h / 2) * Math.sin(b.tip) * 0.95)];
    }
    // how tall it is now (over on its side: how thick it is lying there)
    top(b) {
      const S = b.S;
      if (S.ball) return S.h;
      const lying = S.round ? 2 * S.r : Math.min(S.w, S.d);
      return S.h + (lying - S.h) * Math.sin(Math.min(b.tip, Math.PI / 2));
    }
    // could o carry something whose middle is at (x, z)? (flat on top, still, and under it)
    carries(o, x, z) {
      const S = o.S;
      if (!S.stand || o.y > o.sup + 0.02) return false;
      if (o.down || o.tip > 0.05) {
        // (over on a face, a crate's still a crate: anything else isn't somewhere to put things)
        if (o.kind !== 'crate' || !o.down) return false;
        const q = this.plan(o);
        return Math.hypot(x - q[0], z - q[1]) < q[2] * 0.9;
      }
      const dx = x - o.x, dz = z - o.z, c = Math.cos(o.yaw), s = Math.sin(o.yaw);
      return Math.abs(dx * c - dz * s) < S.w / 2 + 0.03 && Math.abs(dx * s + dz * c) < S.d / 2 + 0.03;
    }
    // the top of whatever could be stood on at (x, z) no higher than upTo (null: nothing)
    standAt(x, z, upTo) {
      let best = null;
      for (const o of this.around(x, z, 1, this.nb3)) {
        if (!o.S.stand) continue;
        const t = o.y + this.top(o);
        if (t > upTo || (best !== null && t <= best) || !this.carries(o, x, z)) continue;
        best = t;
      }
      return best;
    }
    wake(b) { if (b.asleep) { b.asleep = false; b.still = 0; } this.live.add(b); }
    sleep(b) { b.asleep = true; b.vx = b.vz = b.vy = b.w = b.wy = 0; this.live.delete(b); }

    // a knock: a change of velocity (vx, vz) given at height hp. It moves it, and (hard enough, high
    // enough) rocks it over on the edge of its base
    knock(b, vx, vz, hp, pop) {
      this.wake(b);
      const sp = Math.hypot(vx, vz);
      if (sp < 1e-4) return;
      b.vx += vx; b.vz += vz;
      if (pop) b.vy = Math.max(b.vy, Math.min(pop, VMAX_UP));
      // (nothing in a street goes faster than a car can throw it)
      const v = Math.hypot(b.vx, b.vz);
      if (v > VMAX) { b.vx *= VMAX / v; b.vz *= VMAX / v; }
      this.rock(b, vx / sp, vz / sp, sp, hp);
    }
    // the turning half of a knock: sp m/s given at height hp, the way (nx, nz)
    rock(b, nx, nz, sp, hp) {
      const S = b.S;
      if (b.down || S.soft || S.ball) return;
      const dir = Math.atan2(nx, nz);
      // a box goes over onto one of its faces: the nearest to the way it was pushed
      const d = S.round ? dir : b.yaw + Math.round((dir - b.yaw) / (Math.PI / 2)) * (Math.PI / 2);
      if (b.tip < 0.02) b.dir = d;
      const along = Math.cos(dir - b.dir); // (a knock from the other side rocks it back)
      const bh = this.base(b), L2 = bh * bh + b.hc * b.hc, I = (4 / 3) * L2;
      b.w += (sp * along * Math.min(hp, S.h)) / I * 0.9 * Math.sqrt(25 / Math.max(S.m, 1.5));
    }
    // something heavy coming down at (x, z) (you, off a jump: k is how fast you landed): what's
    // round you jumps, rocks or rolls away
    thump(x, z, k) {
      if (!(k > 1)) return;
      const R = 1.8;
      for (const b of this.around(x, z, R, this.nb3)) {
        const q = this.plan(b);
        const dx = q[0] - x, dz = q[1] - z, d = Math.hypot(dx, dz);
        if (d > R + q[2] || this.carries(b, x, z)) continue; // (not the crate you landed on)
        const f = 1 - U.clamp((d - q[2]) / R, 0, 1), nx = d > 0.05 ? dx / d : 0, nz = d > 0.05 ? dz / d : 0;
        this.wake(b);
        if (b.S.m < 10) {
          b.vy = Math.max(b.vy, Math.min(3.2, k * 0.32 * f * Math.sqrt(2 / Math.max(b.S.m, 0.4))));
          b.vx += nx * k * 0.25 * f; b.vz += nz * k * 0.25 * f;
        } else if (nx || nz) this.rock(b, nx, nz, k * 0.35 * f, b.S.h * 0.6);
      }
    }

    /* ---------------- the step ---------------- */
    step(dt, ctx) {
      ctx = ctx || {};
      dt = Math.min(dt, 0.12);
      const t0 = performance.now();
      this.t += dt;
      const P = ctx.player;
      this.touched(ctx);
      const awake = [];
      for (const b of this.live) {
        // (far from you it stops where it is)
        if (P && (Math.abs(b.x - P.x) > SIM_R || Math.abs(b.z - P.z) > SIM_R)) { this.sleep(b); continue; }
        awake.push(b);
      }
      this.stats.awake = awake.length;
      if (!awake.length) return;
      const n = Math.min(MAX_SUB, Math.max(1, Math.ceil(dt / H))), h = dt / n;
      const Z = this.zone;
      for (const b of awake) { b.px = b.x; b.pz = b.z; b.py = b.y; b.g = Z.groundAt ? Z.groundAt(b.x, b.z) : 0; }
      for (let s = 0; s < n; s++) {
        for (const b of awake) this.integrate(b, h);
        this.contacts(awake, ctx, h);
        for (const b of awake) this.file(b);
      }
      for (const b of awake) {
        const moving = Math.hypot(b.vx, b.vz) > 0.03 || Math.abs(b.w) > 0.04 || b.y > b.sup + 0.001 || Math.abs(b.vy) > 0.05 || (b.tip > 0.001 && !b.down);
        if (moving || Math.abs(b.x - b.px) + Math.abs(b.z - b.pz) + Math.abs(b.y - b.py) > 0.001) this.dirty = true; // (a shove moves it too)
        if (moving) b.still = 0;
        else if ((b.still += dt) > 0.6) this.sleep(b);
      }
      this.stats.steps++;
      this.stats.ms = performance.now() - t0;
    }
    // wake what's touched: by you, by someone walking, in front of a car, by anything moving (or
    // what was standing on it)
    touched(ctx) {
      const P = ctx.player, nb = this.nb2;
      const touch = (x, z, rr, under) => {
        for (const b of this.around(x, z, rr + 1.2, nb)) {
          if (!b.asleep) continue;
          if (b.on === under && under) { this.wake(b); continue; }
          const q = this.plan(b);
          if (Math.hypot(q[0] - x, q[1] - z) < q[2] + rr) this.wake(b);
        }
      };
      if (P && Math.hypot(P.vx, P.vz) > 0.05) touch(P.x, P.z, P.r + 0.05);
      for (const p of ctx.peds || []) if (!P || Math.abs(p.x - P.x) + Math.abs(p.z - P.z) < SIM_R) touch(p.x, p.z, 0.32);
      for (const c of ctx.cars || []) if (c.speed > 0.2 && (!P || Math.abs(c.x - P.x) + Math.abs(c.z - P.z) < SIM_R)) touch(c.x, c.z, c.v.length / 2 + 0.5);
      for (const o of [...this.live]) { const q = this.plan(o); touch(q[0], q[1], q[2] + 0.05, o); }
    }
    integrate(b, h) {
      const S = b.S;
      // up and down: falling, bouncing, coming to rest on what's under it (or riding up a lip)
      if (b.y > b.sup + 1e-4 || b.vy > 0) {
        b.vy -= G * h;
        b.y += b.vy * h;
        if (b.y <= b.sup) {
          const hit = -b.vy;
          b.y = b.sup;
          b.vy = hit > 0.9 ? hit * S.e : 0;
          if (hit > 1.1) this.sound(b, Math.min(1, hit / 7));
          if (b.on) this.wake(b.on);
          b.wy *= 0.5;
        }
      } else { b.y = b.sup; b.vy = 0; }
      // along what it's standing on: friction (rolling, if it's round and on its side, or a ball)
      if (b.y <= b.sup + 0.001) {
        const o = b.on, ux = o ? o.vx : 0, uz = o ? o.vz : 0;
        let vx = b.vx - ux, vz = b.vz - uz;
        if (S.ball) {
          const sp = Math.hypot(vx, vz);
          if (sp > 0) { const k = slow(sp, MU_BALL * G * h) / sp; vx *= k; vz *= k; }
        } else if (b.down && S.round) {
          // across its axis it rolls; along it, it slides
          let ax = Math.cos(b.dir), az = -Math.sin(b.dir); // (the roll's way: square to the axis)
          let va = vx * ax + vz * az, vu = vx * Math.sin(b.dir) + vz * Math.cos(b.dir);
          va = slow(va, MU_ROLL * G * h); vu = slow(vu, MU * G * h);
          // (a cone rolls round its tip: its base goes round a circle as long as it is)
          if (S.cone) { b.dir -= (va / 0.68) * h; ax = Math.cos(b.dir); az = -Math.sin(b.dir); }
          vx = ax * va + Math.sin(b.dir) * vu; vz = az * va + Math.cos(b.dir) * vu;
          b.spin -= (va / S.r) * h;
        } else {
          const sp = Math.hypot(vx, vz);
          if (sp > 0) { const k = slow(sp, (S.soft ? 1.4 : MU) * G * h) / sp; vx *= k; vz *= k; }
        }
        b.vx = vx + ux; b.vz = vz + uz;
        b.wy *= Math.max(0, 1 - 7 * h);
        if (Math.abs(b.wy) < 0.05) b.wy = 0;
      }
      b.x += b.vx * h; b.z += b.vz * h;
      b.yaw += b.wy * h;
      if (S.ball) {
        // a ball turns as it rolls (and keeps turning in the air)
        const sp = Math.hypot(b.vx, b.vz);
        if (sp > 1e-3) { _q.setFromAxisAngle(_a.set(b.vz / sp, 0, -b.vx / sp), (sp / S.r) * h); b.q.premultiply(_q); }
        return;
      }
      // rocking on the edge of its base: a pendulum about that edge, under gravity
      if (!b.down && (b.tip > 0 || b.w > 0)) {
        const bh = this.base(b), L = Math.hypot(bh, b.hc), th0 = Math.atan2(bh, b.hc), I = (4 / 3) * L * L;
        b.w += ((G * L) / I) * Math.sin(b.tip - th0) * h;
        b.w *= 1 - 0.4 * h; // (a little loss at the edge)
        b.tip += b.w * h;
        if (b.tip <= 0) {
          // back on its base: a little rock, then still
          b.tip = 0;
          b.w = b.w < -0.7 ? -b.w * 0.25 : 0;
        } else if (b.tip >= Math.PI / 2) {
          // over: it lands on its side (and bounces, if it came down hard)
          b.tip = Math.PI / 2;
          if (b.w > 2.2) { b.w = -b.w * 0.18; this.sound(b, 0.8); }
          else {
            b.w = 0; b.down = true; this.sound(b, 0.5);
            // (a round thing never lands quite square: it goes off rolling one way or the other)
            if (S.round && !S.soft) { const k = (b.id % 2 ? 1 : -1) * (0.35 + 0.1 * (b.id % 3)); b.vx += Math.cos(b.dir) * k; b.vz -= Math.sin(b.dir) * k; }
          }
        }
      }
    }
    contacts(list, ctx, h) {
      const C = this.zone.colliders, P = ctx.player;
      for (const b of list) {
        const S = b.S;
        let [x, z, r] = this.plan(b);
        const ox = x, oz = z, bt = b.y + this.top(b);
        let sup = b.g, on = null;
        // walls, buildings, posts, parked cars (anything standing in its way); what's low enough
        // under its middle, it stands on
        const near = C.query(x - r - 0.1, z - r - 0.1, x + r + 0.1, z + r + 0.1, this.tmp);
        for (const q of near) {
          if (!q.enabled || q.playerOnly) continue;
          if (q.y1 <= b.y + LIP) {
            const e = r * 0.5;
            if (q.y1 > sup && x > q.x0 - e && x < q.x1 + e && z > q.z0 - e && z < q.z1 + e) sup = q.y1;
            continue;
          }
          if (q.y0 >= bt - 0.02) continue; // (over it)
          const cx = U.clamp(x, q.x0, q.x1), cz = U.clamp(z, q.z0, q.z1);
          let dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
          if (d >= r) continue;
          if (d < 1e-6) { // (inside it: out the shortest way)
            const m = Math.min(x - q.x0, q.x1 - x, z - q.z0, q.z1 - z);
            if (m === x - q.x0) { dx = -1; dz = 0; } else if (m === q.x1 - x) { dx = 1; dz = 0; } else if (m === z - q.z0) { dx = 0; dz = -1; } else { dx = 0; dz = 1; }
            d = 0;
          } else { dx /= d; dz /= d; }
          const pen = r - d;
          x += dx * pen; z += dz * pen;
          const vn = b.vx * dx + b.vz * dz;
          if (vn < 0) { const e = S.ball ? 0.7 : E_WALL; b.vx -= (1 + e) * vn * dx; b.vz -= (1 + e) * vn * dz; if (vn < -1.5) this.sound(b, Math.min(1, -vn / 6)); }
        }
        // each other: on top of one (resting on it), or side by side (out of each other's way)
        for (const o of this.around(x, z, 1.6, this.nb)) {
          if (o === b) continue;
          const ot = o.y + this.top(o);
          if (ot <= b.y + LIP && ot > sup && this.carries(o, x, z)) { sup = ot; on = o; continue; }
          if (ot <= b.y + 0.02 || o.y >= bt - 0.02) continue; // (one over the other)
          const [qx, qz, qr] = this.plan(o);
          let dx = x - qx, dz = z - qz;
          const d = Math.hypot(dx, dz);
          if (d >= r + qr || d < 1e-6) continue;
          dx /= d; dz /= d;
          const pen = r + qr - d, wb = o.S.m / (S.m + o.S.m);
          x += dx * pen * wb; z += dz * pen * wb;
          o.x -= dx * pen * (1 - wb); o.z -= dz * pen * (1 - wb);
          this.wake(o);
          const vn = (b.vx - o.vx) * dx + (b.vz - o.vz) * dz;
          if (vn < 0) {
            const j = (-(1 + E_BODY) * vn) / (1 / S.m + 1 / o.S.m);
            b.vx += (j / S.m) * dx; b.vz += (j / S.m) * dz;
            o.vx -= (j / o.S.m) * dx; o.vz -= (j / o.S.m) * dz;
            if (-vn > 1.6) { this.knock(o, dx * vn * 0.3, dz * vn * 0.3, o.S.h * 0.5); if (-vn > 2.5) this.sound(b, Math.min(1, -vn / 6)); }
          }
        }
        b.sup = sup; b.on = on;
        // you: you push it (walking shoves it along; running into it knocks it over or kicks it),
        // and it pushes back; not when you're over it (standing on it)
        if (P && (P.y || 0) < bt - 0.08 && (P.y || 0) + 1.6 > b.y) this.pusher(b, x, z, r, P, P.r, PLAYER_M, P.hp || S.hp, true);
        if (b.y < 1.6) for (const p of ctx.peds || []) if (Math.abs(p.x - x) < 1.5 && Math.abs(p.z - z) < 1.5) this.pusher(b, x, z, r, p, 0.28, 60, S.hp, false);
        // cars: they knock it out of the way (and it doesn't slow them)
        if (b.y < 1.4) for (const c of ctx.cars || []) if (Math.abs(c.x - x) + Math.abs(c.z - z) < c.v.length + 2) this.car(b, c);
        // (keep what the plan moved)
        b.x += x - ox; b.z += z - oz;
      }
      // and you're not left standing in something that couldn't move
      if (P) for (const b of list) {
        if ((P.y || 0) >= b.y + this.top(b) - 0.08) continue;
        const [x, z, r] = this.plan(b);
        let dx = P.x - x, dz = P.z - z;
        const d = Math.hypot(dx, dz), rr = r + P.r;
        if (d < rr && d > 1e-6) { dx /= d; dz /= d; const pen = rr - d; P.x += dx * pen * 0.6; P.z += dz * pen * 0.6; if (P.push) P.push(dx * pen * 0.6, dz * pen * 0.6); }
      }
    }
    // a kinematic pusher (you, someone walking past) against a body
    pusher(b, x, z, r, p, pr, pm, hp, you) {
      let dx = x - p.x, dz = z - p.z;
      const d = Math.hypot(dx, dz);
      if (d >= r + pr || d < 1e-6) return;
      dx /= d; dz /= d;
      const S = b.S, pvx = p.vx || 0, pvz = p.vz || 0;
      const vrel = (pvx - b.vx) * dx + (pvz - b.vz) * dz;
      // out of the way of them
      const pen = r + pr - d;
      b.x += dx * pen; b.z += dz * pen;
      if (vrel <= 0) return;
      const share = pm / (pm + S.m);
      if (S.kick && vrel > 1.6) {
        // something light: it flies off the foot (up, too, at a run), once a touch
        if (b.kickT !== undefined && this.t - b.kickT < 0.3) return;
        b.kickT = this.t;
        this.wake(b);
        const v = vrel * share * (vrel > 3 ? S.kick : 1.3);
        b.vx += dx * v; b.vz += dz * v;
        if (vrel > 3) b.vy = Math.max(b.vy, Math.min(VMAX_UP, vrel * (S.ball ? 0.55 : 0.3)));
        const sp = Math.hypot(b.vx, b.vz);
        if (sp > VMAX) { b.vx *= VMAX / sp; b.vz *= VMAX / sp; }
        this.rock(b, dx, dz, v, S.h);
        this.sound(b, Math.min(1, vrel / 5));
      } else if (vrel > 3.2 && !b.down) {
        // a knock (faster than a walk) tips it; a walk just shoves it along
        this.knock(b, dx * vrel * share * 1.2, dz * vrel * share * 1.2, hp);
        if (you) this.sound(b, Math.min(1, vrel / 6));
      } else { this.wake(b); b.vx += dx * vrel * share; b.vz += dz * vrel * share; if (vrel > 2.2 && !b.down) this.knock(b, dx * (vrel - 2.2), dz * (vrel - 2.2), hp * 0.6); }
      // and they feel the weight of it
      if (you && p.slow) p.slow(dx, dz, vrel * (1 - share));
    }
    car(b, c) {
      if (c.speed < 0.2 && !c.turn) return;
      const [x, z, r] = this.plan(b);
      // in the car's own frame: along it and across it
      const dx = x - c.x, dz = z - c.z;
      const a = dx * c.hx + dz * c.hz, s = dx * c.hz - dz * c.hx;
      const hl = c.v.length / 2, hw = c.v.width / 2;
      if (Math.abs(a) > hl + r || Math.abs(s) > hw + r) return;
      // the nearest side of it: pushed out that way
      const ca = U.clamp(a, -hl, hl), cs = U.clamp(s, -hw, hw);
      let na = a - ca, ns = s - cs;
      let d = Math.hypot(na, ns);
      if (d < 1e-6) { if (hl - Math.abs(a) < hw - Math.abs(s)) { na = Math.sign(a) || 1; ns = 0; } else { na = 0; ns = Math.sign(s) || 1; } d = 0; }
      else { na /= d; ns /= d; }
      const nx = na * c.hx + ns * c.hz, nz = na * c.hz - ns * c.hx;
      const pen = r - d;
      b.x += nx * pen; b.z += nz * pen;
      const vcx = c.hx * c.speed, vcz = c.hz * c.speed;
      const vrel = (vcx - b.vx) * nx + (vcz - b.vz) * nz;
      if (vrel > 0.3) {
        this.knock(b, nx * vrel * 1.35, nz * vrel * 1.35, 0.55, vrel > 4 ? vrel * 0.22 : 0);
        // (thrown, it spins)
        if (vrel > 4) b.wy += (((b.id * 7919) % 13) / 6.5 - 1) * vrel * 0.9;
        this.sound(b, Math.min(1, vrel / 8));
      }
    }
    sound(b, k) {
      const now = performance.now();
      if (!DV.Audio || !DV.Audio.ready || (b.sndT && now - b.sndT < 120)) return;
      b.sndT = now;
      DV.Audio.play(b.S.snd || 'land', { x: b.x, z: b.z, range: 25, volume: 0.25 + 0.6 * k });
    }

    /* ---------------- drawing: one mesh, rebuilt when something moved ---------------- */
    view(px, pz, hidden) {
      // which are near enough to see (looked at again every half second, or when something moved)
      const now = performance.now() / 1000;
      if (this.dirty || !this.lastView || now - this.lastView > 0.5 || Math.hypot(px - this.lastP[0], pz - this.lastP[1]) > 20) {
        this.lastView = now; this.lastP = [px, pz];
        const want = this.bodies.filter((b) => Math.abs(b.x - px) < SHOW_R && Math.abs(b.z - pz) < SHOW_R);
        if (this.dirty || want.length !== this.drawn.length || want.some((b, i) => b !== this.drawn[i])) { this.drawn = want; this.rebuild(); }
      }
      if (this.mesh) this.mesh.visible = !hidden && this.drawn.length > 0;
    }
    matrix(b, out) {
      // a ball: turned however it's rolled (built round its middle)
      if (b.q) return out.compose(_v.set(b.x, b.y + b.S.r, b.z), b.q, _one);
      // standing: where it is, which way it faces (and rolled about its own axis, if it's rolled)
      _q.setFromAxisAngle(_a.set(0, 1, 0), b.yaw + b.spin);
      out.compose(_v.set(b.x, b.y, b.z), _q, _one);
      if (b.tip > 1e-4) {
        // over on the edge of its base: turned about that edge
        const e = this.base(b), sx = Math.sin(b.dir), sz = Math.cos(b.dir);
        _p.set(b.x + sx * e, b.y, b.z + sz * e);
        _m.makeTranslation(-_p.x, -_p.y, -_p.z).premultiply(_m2.makeRotationAxis(_a.set(sz, 0, -sx), b.tip)).premultiply(_m2.makeTranslation(_p.x, _p.y, _p.z));
        out.premultiply(_m);
      }
      return out;
    }
    rebuild() {
      this.dirty = false;
      this.stats.rebuilds++;
      let n = 0;
      for (const b of this.drawn) n += this.o.piece(b.kind).attributes.position.count;
      if (!this.mesh || this.cap < n) {
        if (this.mesh) { this.mesh.geometry.dispose(); this.zone.group.remove(this.mesh); }
        this.cap = Math.max(1024, Math.ceil(n * 1.5));
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
        this.mesh = new THREE.Mesh(g, this.o.mat);
        this.mesh.name = 'loose_things';
        this.zone.group.add(this.mesh);
      }
      const pos = this.mesh.geometry.attributes.position.array, col = this.mesh.geometry.attributes.color.array;
      let o = 0;
      const M = new THREE.Matrix4();
      for (const b of this.drawn) {
        const g = this.o.piece(b.kind), p = g.attributes.position.array, c = g.attributes.color.array, m = this.matrix(b, M).elements;
        for (let i = 0; i < p.length; i += 3, o += 3) {
          const x = p[i], y = p[i + 1], z = p[i + 2];
          pos[o] = m[0] * x + m[4] * y + m[8] * z + m[12];
          pos[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
          pos[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
          col[o] = c[i]; col[o + 1] = c[i + 1]; col[o + 2] = c[i + 2];
        }
      }
      const g = this.mesh.geometry;
      g.setDrawRange(0, o / 3);
      g.attributes.position.needsUpdate = true;
      g.attributes.color.needsUpdate = true;
      g.computeBoundingSphere();
      this.stats.drawn = this.drawn.length;
    }
    dispose() { if (this.mesh) { this.mesh.geometry.dispose(); if (this.mesh.parent) this.mesh.parent.remove(this.mesh); this.mesh = null; } }
  }
  // take `by` off a speed, down to nothing (not past it)
  function slow(v, by) { return v > by ? v - by : v < -by ? v + by : 0; }

  DV.Physics = {
    SHAPES, LIP,
    world(zone, o) { return new World(zone, o); },
  };
})();
