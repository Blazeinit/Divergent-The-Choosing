/* ==========================================================================
   DIVERGENT — loose things: a small rigid-body world
   Street things that aren't bolted down (bins, newspaper boxes, traffic
   cones, crates, rubbish bags) are bodies here. You and the people walking
   past push them about, cars knock them flying, and they slide, rock, tip
   over, roll, bump into walls and each other, and settle.

   The model is the constrained one games use for props:
     - on the ground a body slides with friction; thrown up, it falls and
       bounces a little;
     - a knock above its base rocks it on the edge of its base (a pendulum
       about that edge, under gravity): past the tipping point it falls over
       and lands, short of it it rocks back and settles;
     - on its side, a round thing rolls across its axis, anything else slides;
     - against walls (the zone's colliders) and each other it's a circle in
       plan, and bounces off a little;
     - when nothing about it has moved for a moment it sleeps, until
       something touches it again.
   Steady pushing (walking into it) shoves a body along; only a knock
   (running into it, a car) tips it.

   They're all drawn in one vertex-coloured mesh, rebuilt only when
   something has moved (one draw call for every loose thing in the city).

     const W = DV.Physics.world(zone, { mat, piece })   piece(kind) → geometry
     W.add(kind, x, z, yaw)       → a body
     W.knock(b, vx, vz, height)   a sudden change of velocity, applied that high up
     W.step(dt, { player, peds, cars })
     W.view(px, pz, hidden)       what's drawn (near you, and not from deep indoors)
     DV.Physics.SHAPES            the kinds of thing, and how they behave
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const G = 9.8, H = 1 / 120, MAX_SUB = 14;
  const MU = 0.55, MU_ROLL = 0.13, E_WALL = 0.3, E_BODY = 0.35, E_GROUND = 0.22;
  const SHOW_R = 230, SIM_R = 80, PLAYER_M = 70, VMAX = 22, VMAX_UP = 9;

  // r: radius in plan (round) or w × d (boxes); h: height; m: mass (kg); hp: where a person's
  // knock lands on it; round: rolls on its side
  const SHAPES = {
    bin: { round: true, r: 0.28, h: 1.0, m: 18, hp: 0.75 },
    news: { w: 1.06, d: 0.45, h: 1.02, m: 45, hp: 0.8 },
    cone: { round: true, r: 0.2, h: 0.72, m: 3, hp: 0.5, com: 0.32 },
    crate: { w: 0.62, d: 0.62, h: 0.6, m: 16, hp: 0.5 },
    bag: { round: true, r: 0.27, h: 0.55, m: 6, hp: 0.4, soft: true },
  };

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _a = new THREE.Vector3(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);

  class World {
    constructor(zone, o) {
      this.zone = zone;
      this.o = o || {};
      this.bodies = [];
      this.hash = new Map(); // (where bodies are, for neighbours: rebuilt each step from the awake ones)
      this.dirty = true;
      this.drawn = [];
      this.mesh = null;
      this.tmp = [];
      this.t = 0;
      this.stats = { steps: 0, awake: 0, drawn: 0, rebuilds: 0 };
    }
    add(kind, x, z, yaw) {
      const S = SHAPES[kind];
      if (!S) return null;
      const b = {
        kind, S, x, z, y: 0, yaw: yaw || 0, vx: 0, vz: 0, vy: 0,
        tip: 0, w: 0, dir: 0, down: false, spin: 0, // (tipping: tip angle, its rate, which way; lying down; rolled)
        asleep: true, still: 0, home: [x, z, yaw || 0], id: this.bodies.length,
      };
      // tipping about the edge of its base: half-width to the edge, the centre of mass's height,
      // and the moment of inertia about the edge (per kg)
      b.hc = S.com || S.h / 2;
      this.bodies.push(b);
      this.dirty = true;
      return b;
    }
    // the half-width of the base towards the way it's tipping (a box goes over onto a face)
    base(b) {
      const S = b.S;
      if (S.round) return S.r;
      const a = Math.abs(Math.cos(b.dir - b.yaw));
      return a > 0.7 ? S.d / 2 : S.w / 2;
    }
    // where it is in plan, and how big (lying down: the middle of it, end to end)
    plan(b) {
      if (!b.down && b.tip < 0.35) return [b.x, b.z, b.S.round ? b.S.r : Math.max(b.S.w, b.S.d) * 0.48];
      const k = Math.sin(b.tip) * (b.S.h / 2);
      return [b.x + Math.sin(b.dir) * k, b.z + Math.cos(b.dir) * k, Math.max(b.S.round ? b.S.r : Math.min(b.S.w, b.S.d) / 2, (b.S.h / 2) * Math.sin(b.tip) * 0.95)];
    }
    wake(b) { if (b.asleep) { b.asleep = false; b.still = 0; } }

    // a knock: a change of velocity (vx, vz) given at height hp. It moves it, and (hard enough, high
    // enough) rocks it over on the edge of its base
    knock(b, vx, vz, hp, pop) {
      this.wake(b);
      const S = b.S, sp = Math.hypot(vx, vz);
      if (sp < 1e-4) return;
      b.vx += vx; b.vz += vz;
      if (pop) b.vy = Math.max(b.vy, Math.min(pop, VMAX_UP));
      // (nothing in a street goes faster than a car can throw it)
      const v = Math.hypot(b.vx, b.vz);
      if (v > VMAX) { b.vx *= VMAX / v; b.vz *= VMAX / v; }
      if (b.down || S.soft) return;
      const dir = Math.atan2(vx, vz);
      // a box goes over onto one of its faces: the nearest to the way it was pushed
      const d = S.round ? dir : b.yaw + Math.round((dir - b.yaw) / (Math.PI / 2)) * (Math.PI / 2);
      if (b.tip < 0.02) b.dir = d;
      const along = Math.cos(dir - b.dir); // (a knock from the other side rocks it back)
      const bh = this.base(b), L2 = bh * bh + b.hc * b.hc, I = (4 / 3) * L2;
      b.w += (sp * along * Math.min(hp, S.h)) / I * 0.9 * Math.sqrt(25 / S.m);
    }

    /* ---------------- the step ---------------- */
    step(dt, ctx) {
      ctx = ctx || {};
      dt = Math.min(dt, 0.12);
      const P = ctx.player;
      // who's awake: near anything that moves, or moving
      const awake = [];
      for (const b of this.bodies) {
        if (P && Math.abs(b.x - P.x) > SIM_R && Math.abs(b.z - P.z) > SIM_R) continue;
        if (!b.asleep) { awake.push(b); continue; }
        if (this.touched(b, ctx)) { this.wake(b); awake.push(b); }
      }
      this.stats.awake = awake.length;
      if (!awake.length) return;
      const n = Math.min(MAX_SUB, Math.max(1, Math.ceil(dt / H))), h = dt / n;
      for (const b of awake) { b.px = b.x; b.pz = b.z; }
      for (let s = 0; s < n; s++) {
        for (const b of awake) this.integrate(b, h);
        this.contacts(awake, ctx, h);
      }
      for (const b of awake) {
        const moving = Math.hypot(b.vx, b.vz) > 0.03 || Math.abs(b.w) > 0.04 || b.y > 0.001 || Math.abs(b.vy) > 0.05 || (b.tip > 0.001 && !b.down);
        if (moving || Math.abs(b.x - b.px) + Math.abs(b.z - b.pz) > 0.001) this.dirty = true; // (a shove moves it too)
        if (moving) b.still = 0;
        else if ((b.still += dt) > 0.6) { b.asleep = true; b.vx = b.vz = b.vy = b.w = 0; }
      }
      this.stats.steps++;
    }
    // something near enough to touch it (you, someone, a car, another body moving)
    touched(b, ctx) {
      const [x, z, r] = this.plan(b);
      const P = ctx.player;
      if (P && Math.hypot(P.x - x, P.z - z) < r + P.r + 0.05 && Math.hypot(P.vx, P.vz) > 0.05) return true;
      for (const p of ctx.peds || []) if (Math.hypot(p.x - x, p.z - z) < r + 0.32) return true;
      for (const c of ctx.cars || []) if (c.speed > 0.2 && Math.hypot(c.x - x, c.z - z) < r + c.v.length / 2 + 0.5) return true;
      for (const o of this.bodies) if (o !== b && !o.asleep && Math.abs(o.x - x) < 2 && Math.abs(o.z - z) < 2) { const q = this.plan(o); if (Math.hypot(q[0] - x, q[1] - z) < r + q[2] + 0.05) return true; }
      return false;
    }
    integrate(b, h) {
      const S = b.S;
      // up and down (a car can throw it)
      if (b.y > 0 || b.vy > 0) {
        b.vy -= G * h;
        b.y += b.vy * h;
        if (b.y <= 0) { b.y = 0; b.vy = b.vy < -1.2 ? -b.vy * E_GROUND : 0; if (b.vy && DV.Audio && DV.Audio.ready) this.sound(b, 0.4); }
      }
      // along the ground: friction (rolling, if it's round and on its side)
      if (b.y <= 0.001) {
        if (b.down && S.round) {
          // across its axis it rolls; along it, it slides
          const ax = Math.cos(b.dir), az = -Math.sin(b.dir); // (the roll's way: square to the axis)
          let va = b.vx * ax + b.vz * az, vu = b.vx * Math.sin(b.dir) + b.vz * Math.cos(b.dir);
          va = slow(va, MU_ROLL * G * h); vu = slow(vu, MU * G * h);
          b.vx = ax * va + Math.sin(b.dir) * vu; b.vz = az * va + Math.cos(b.dir) * vu;
          b.spin -= (va / S.r) * h;
        } else {
          const sp = Math.hypot(b.vx, b.vz);
          if (sp > 0) { const k = slow(sp, (S.soft ? 1.4 : MU) * G * h) / sp; b.vx *= k; b.vz *= k; }
        }
      }
      b.x += b.vx * h; b.z += b.vz * h;
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
          else { b.w = 0; b.down = true; this.sound(b, 0.5); }
        }
      }
    }
    contacts(list, ctx, h) {
      const C = this.zone.colliders, P = ctx.player;
      for (const b of list) {
        let [x, z, r] = this.plan(b);
        const ox = x, oz = z;
        // walls, buildings, posts, parked cars (anything standing that's taller than it is low)
        const near = C.query(x - r - 0.1, z - r - 0.1, x + r + 0.1, z + r + 0.1, this.tmp);
        for (const q of near) {
          if (!q.enabled || q.y1 < 0.35 || q.y0 > b.y + 1.5 || q.y1 <= b.y + 0.05) continue; // (in the air: over anything lower than it)
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
          if (vn < 0) { b.vx -= (1 + E_WALL) * vn * dx; b.vz -= (1 + E_WALL) * vn * dz; if (vn < -1.5) this.sound(b, 0.6); }
        }
        // each other
        for (const o of this.bodies) {
          if (o === b || Math.abs(o.x - b.x) > 2.5 || Math.abs(o.z - b.z) > 2.5) continue;
          const [qx, qz, qr] = this.plan(o);
          let dx = x - qx, dz = z - qz;
          const d = Math.hypot(dx, dz);
          if (d >= r + qr || d < 1e-6) continue;
          dx /= d; dz /= d;
          const pen = r + qr - d, wb = o.S.m / (b.S.m + o.S.m);
          x += dx * pen * wb;
          o.x -= dx * pen * (1 - wb); o.z -= dz * pen * (1 - wb);
          z += dz * pen * wb;
          const vn = (b.vx - o.vx) * dx + (b.vz - o.vz) * dz;
          if (vn < 0) {
            const j = (-(1 + E_BODY) * vn) / (1 / b.S.m + 1 / o.S.m);
            b.vx += (j / b.S.m) * dx; b.vz += (j / b.S.m) * dz;
            this.wake(o);
            o.vx -= (j / o.S.m) * dx; o.vz -= (j / o.S.m) * dz;
            if (-vn > 1.6) this.knock(o, -dx * -vn * 0.3, -dz * -vn * 0.3, o.S.h * 0.5);
          }
        }
        // you: you push it (walking shoves it along; running into it knocks it over), and it pushes back
        if (P) this.pusher(b, x, z, r, P, P.r, PLAYER_M, P.hp || b.S.hp, true);
        for (const p of ctx.peds || []) if (Math.abs(p.x - x) < 1.5 && Math.abs(p.z - z) < 1.5) this.pusher(b, x, z, r, p, 0.28, 60, b.S.hp, false);
        // cars: they knock it out of the way (and it doesn't slow them)
        for (const c of ctx.cars || []) this.car(b, c);
        // (keep what the plan moved)
        const mx = x - ox, mz = z - oz;
        b.x += mx; b.z += mz;
        [x, z] = [b.x, b.z];
      }
      // and you're not left standing in something that couldn't move
      if (P) for (const b of list) {
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
      const pvx = p.vx || 0, pvz = p.vz || 0;
      const vrel = (pvx - b.vx) * dx + (pvz - b.vz) * dz;
      // out of the way of them
      const pen = r + pr - d;
      b.x += dx * pen; b.z += dz * pen;
      if (vrel <= 0) return;
      const share = pm / (pm + b.S.m);
      // a knock (faster than a walk) tips it; a walk just shoves it along
      if (vrel > 3.2 && !b.down) {
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
        this.sound(b, Math.min(1, vrel / 8));
      }
    }
    sound(b, k) {
      const now = performance.now();
      if (!DV.Audio || !DV.Audio.ready || (b.sndT && now - b.sndT < 140)) return;
      b.sndT = now;
      DV.Audio.play(b.S.soft ? 'hop' : 'land', { x: b.x, z: b.z, range: 25, volume: 0.25 + 0.5 * k });
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
      // standing: where it is, which way it faces (and rolled about its own axis, if it's rolled)
      _q.setFromAxisAngle(_a.set(0, 1, 0), b.yaw + b.spin);
      out.compose(_v.set(b.x, b.y, b.z), _q, _one);
      if (b.tip > 1e-4) {
        // over on the edge of its base: turned about that edge
        const e = this.base(b), sx = Math.sin(b.dir), sz = Math.cos(b.dir);
        _p.set(b.x + sx * e, b.y, b.z + sz * e);
        _m.makeTranslation(-_p.x, -_p.y, -_p.z).premultiply(new THREE.Matrix4().makeRotationAxis(_a.set(sz, 0, -sx), b.tip)).premultiply(new THREE.Matrix4().makeTranslation(_p.x, _p.y, _p.z));
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
    SHAPES,
    world(zone, o) { return new World(zone, o); },
  };
})();
