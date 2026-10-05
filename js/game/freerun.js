/* ==========================================================================
   DIVERGENT — free-running
   A line over the rooftops, and the runners that take it. A course is a
   string of moves laid down from a start: runs, leaps, vaults, climbs,
   rolls and flips. Each move knows where the body goes (anything airborne
   flies a true arc under gravity, so a long leap hangs and a drop falls
   fast) and which pose it's in (character.js parkourPose). A runner puts a
   character on a course at a time, so several can take it one behind the
   other.

     const c = DV.Freerun.course({ x, y, z, heading })    heading: radians, 0 = +z
     c.run(x, z [, speed])      along the flat to (x, z)
     c.leap(x, y, z [, apex])   a running jump to (x, y, z), rising apex over the higher end
     c.drop(x, y, z)            step off a height…
     c.flip(x, y, z [, apex])   …or front-flip down
     c.land([d]) · c.roll([d])  soak up the landing, or roll out of it, going on d
     c.vault(top [, d])         a speed vault over something whose top is at y = top
     c.kong(top [, d])          a kong vault over it (diving, hands on it, knees through)
     c.climb(y [, d])           up a wall to a ledge at y, d on over the top
     c.pause(secs [, action])   stop there (a cheer, a look back)
     c.at(t)                    → { x, y, z, rot, speed, action, pk, air, kind }
     c.duration · c.segs        (each seg: { kind, move, from, to, t0, dur })

     const r = DV.Freerun.runner(model, course, { delay })
     r.update(t, dt)            places and animates the model at course time t − delay
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const G = 9.8;
  const RUN = 6.4; // m/s along the flat

  // smoothstep through [u, v] keys
  function keyed(u, keys) {
    if (u <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (u <= b[0]) return a[1] + (b[1] - a[1]) * U.smooth((u - a[0]) / (b[0] - a[0]));
    }
    return keys[keys.length - 1][1];
  }

  class Course {
    constructor(o) {
      this.p = [o.x, o.y, o.z];
      this.h = o.heading || 0;
      this.speed = o.speed || RUN;
      this.segs = [];
      this.duration = 0;
    }
    push(seg) {
      seg.t0 = this.duration;
      this.duration += seg.dur;
      this.segs.push(seg);
      this.p = seg.to.slice();
      this.h = seg.h;
      return this;
    }
    headingTo(x, z) {
      const dx = x - this.p[0], dz = z - this.p[2];
      return Math.hypot(dx, dz) > 0.01 ? Math.atan2(dx, dz) : this.h;
    }
    ahead(d) { return [this.p[0] + Math.sin(this.h) * d, this.p[2] + Math.cos(this.h) * d]; }

    run(x, z, speed) {
      const from = this.p.slice(), v = speed || this.speed;
      const d = Math.hypot(x - from[0], z - from[2]);
      return this.push({ kind: 'run', from, to: [x, from[1], z], dur: Math.max(0.05, d / v), h: this.headingTo(x, z), speed: v });
    }
    // anything airborne: a parabola from here to (x, y, z), its top `apex` over the higher end
    air(move, x, y, z, apex) {
      const from = this.p.slice();
      const top = Math.max(from[1], y) + Math.max(0, apex);
      const vy = Math.sqrt(2 * G * (top - from[1]));
      const dur = vy / G + Math.sqrt(2 * (top - y) / G);
      return this.push({ kind: 'air', move, from, to: [x, y, z], dur, vy, h: this.headingTo(x, z) });
    }
    leap(x, y, z, apex) { return this.air('leap', x, y, z, apex === undefined ? 0.7 : apex); }
    drop(x, y, z) { return this.air('drop', x, y, z, 0.12); }
    flip(x, y, z, apex) { return this.air('flip', x, y, z, apex === undefined ? 1.1 : apex); }
    // over an obstacle: the legs (a speed vault) or the whole body (a kong) just clear its top
    vault(top, d) { const [x, z] = this.ahead(d || 2.6); return this.air('vault', x, this.p[1], z, top - 0.42 - this.p[1]); }
    kong(top, d) { const [x, z] = this.ahead(d || 3.2); return this.air('kong', x, this.p[1], z, top - 0.25 - this.p[1]); }
    climb(y, d) {
      const from = this.p.slice(), [x, z] = this.ahead(d || 0.9);
      return this.push({ kind: 'climb', move: 'climb', from, to: [x, y, z], dur: 0.95 + (y - from[1]) * 0.16, h: this.h });
    }
    land(d) { const [x, z] = this.ahead(d === undefined ? 1.1 : d); return this.push({ kind: 'slide', move: 'land', from: this.p.slice(), to: [x, this.p[1], z], dur: 0.42, h: this.h }); }
    roll(d) { const [x, z] = this.ahead(d === undefined ? 2.6 : d); return this.push({ kind: 'slide', move: 'roll', from: this.p.slice(), to: [x, this.p[1], z], dur: 0.78, h: this.h }); }
    pause(secs, action, h) { return this.push({ kind: 'still', from: this.p.slice(), to: this.p.slice(), dur: secs, action: action || 'idle', h: h === undefined ? this.h : h }); }

    seg(t) {
      const S = this.segs;
      for (let i = 0; i < S.length; i++) if (t < S[i].t0 + S[i].dur) return S[i];
      return S[S.length - 1];
    }
    at(t) {
      const s = this.seg(U.clamp(t, 0, this.duration));
      const out = { x: 0, y: 0, z: 0, rot: s.h, speed: 0, action: 'idle', pk: null, air: false, kind: s.kind, move: s.move || s.kind };
      if (t < 0) { [out.x, out.y, out.z] = this.segs[0].from; out.rot = this.segs[0].h; out.kind = 'start'; return out; }
      const u = U.clamp((t - s.t0) / s.dur, 0, 1);
      const [x0, y0, z0] = s.from, [x1, y1, z1] = s.to;
      const lx = (k) => { out.x = x0 + (x1 - x0) * k; out.z = z0 + (z1 - z0) * k; };
      switch (s.kind) {
        case 'run':
          lx(u); out.y = y0; out.speed = s.speed; out.action = 'run';
          break;
        case 'air': {
          const tau = u * s.dur;
          lx(u); out.y = y0 + s.vy * tau - 0.5 * G * tau * tau;
          if (u >= 1) out.y = y1;
          out.air = true;
          out.pk = { move: s.move, t: u, air: true };
          break;
        }
        case 'climb': {
          // kick up the wall, hang off the ledge, pull up, a knee over, up onto it, and on (the
          // feet stay at the wall's face until they're level with the top)
          const H = y1 - y0;
          out.y = y0 + keyed(u, [[0, 0], [0.18, Math.min(0.9, H * 0.4)], [0.3, Math.max(0, H - 1.85)], [0.55, Math.max(0, H - 1.2)], [0.78, H - 0.7], [0.9, H], [1, H]]);
          lx(keyed(u, [[0, 0], [0.18, 0.2], [0.55, 0.25], [0.78, 0.3], [0.9, 0.45], [1, 1]]));
          out.pk = { move: 'climb', t: u, air: u > 0.12 && u < 0.85 };
          break;
        }
        case 'slide':
          // going on with what's left of the momentum: a roll keeps rolling, a landing pulls up
          lx(s.move === 'roll' ? u : 1 - (1 - u) * (1 - u)); out.y = y0;
          out.speed = Math.hypot(x1 - x0, z1 - z0) / s.dur;
          out.pk = { move: s.move, t: u, air: false };
          break;
        default: // still
          lx(0); out.y = y0; out.action = s.action;
      }
      return out;
    }
  }

  DV.Freerun = {
    G, RUN,
    course(o) { return new Course(o); },
    runner(model, course, o) {
      o = o || {};
      let rot = null;
      return {
        model, course, delay: o.delay || 0, last: null,
        update(t, dt) {
          const s = course.at(t - this.delay);
          model.root.position.set(s.x, s.y, s.z);
          // (the body turns into a new line over a few frames, not in one)
          rot = rot === null || dt > 0.3 ? s.rot : U.dampAngle(rot, s.rot, 12, dt);
          model.root.rotation.y = rot;
          model.animate(dt, { speed: s.speed, action: s.action, pk: s.pk });
          this.last = s;
          return s;
        },
        reset() { rot = null; },
      };
    },
  };
})();
