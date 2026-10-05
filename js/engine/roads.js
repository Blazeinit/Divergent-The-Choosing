/* ==========================================================================
   DIVERGENT — the roads
   The street grid as a network: every junction inside the Fence (where an
   avenue crosses a street), its kerbs, whether it has working signals (the
   ruins' went dark years ago, and some of the Dauntless sector's are down),
   and what each signal shows right now. Traffic stops at the line on red,
   people cross on the white man, and the lamps on the poles say the same.

   The cycle (seconds): the street (traffic along x) gets green, then amber,
   then a moment of all-red; then the avenue (along z) the same. Each junction
   runs it from an offset, so a car keeping to the limit along a street meets
   a run of greens (a green wave).

     const R = DV.Roads.build(city, blocked, opts)   (StreetKit makes it: zone.roads)
     R.junctions           [{ id, x, z, av, st, box: [x0, z0, x1, z1], signal, district, offset }]
     R.light(j, axis)      'g' | 'a' | 'r'  for traffic moving along axis 'x' or 'z' (null: no signal)
     R.walk(j, axis)       'walk' | 'flash' | 'stop' for people crossing along that axis (null: no signal)
     R.along(line)         the junctions on a street or avenue, in order
     R.update(dt)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const GREEN = 12.5, AMBER = 3, CLEAR = 1.5;
  const CYCLE = 2 * (GREEN + AMBER + CLEAR);
  const CW = 3.2; // a crossing's width, out from the junction's kerb line
  const STOP = 1.0; // the stop line, back from the crossing

  class Roads {
    constructor(city, blocked, opts) {
      opts = opts || {};
      const CM = DV.CityMap, c = city.centre || CM.centre;
      this.t = opts.t0 || 0;
      this.junctions = [];
      this.byLine = new Map();
      const lim = (city.walk ? city.walk.edge || city.walk.limit : CM.edge) - 14, shore = city.walk ? city.walk.shore : CM.marshX;
      const campus = city.walk ? city.walk.campus : CM.campus;
      const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
      for (const av of CM.avenues) {
        const [ax0, ax1] = CM.road(av);
        for (const st of CM.streets) {
          const [sz0, sz1] = CM.road(st);
          const x = av.x, z = st.z;
          if (Math.hypot(x - c[0], z - c[1]) > lim || ax1 > shore - 2) continue;
          // not on the Testing Center's own grounds, and not where something's built over it (the Hub)
          if (ax1 > campus[0] - 1 && ax0 < campus[2] + 1 && sz1 > campus[1] - 1 && sz0 < campus[3] + 1) continue;
          if (blocked && blocked(x, z, 1.5)) continue;
          const dd = CM.district(x, z), district = dd.d && dd.k > 0.2 ? dd.d.id : 'testing';
          // the ruins' signals went dark years ago; a third of the Dauntless sector's are down
          const dead = district === 'factionless' || (district === 'dauntless' && hash(x, z) < 0.35);
          // a green wave along the streets (≈ 11 m/s between junctions), a looser one up the avenues
          const offset = ((-x / 11 + z / 23) % CYCLE + CYCLE) % CYCLE;
          const j = { id: this.junctions.length, x, z, av, st, box: [ax0, sz0, ax1, sz1], signal: !dead, dead, district, offset };
          this.junctions.push(j);
          this.on(av, j); this.on(st, j);
        }
      }
      for (const [line, list] of this.byLine) list.sort((a, b) => (line.x !== undefined ? a.z - b.z : a.x - b.x));
    }
    on(line, j) { let l = this.byLine.get(line); if (!l) this.byLine.set(line, (l = [])); l.push(j); }
    along(line) { return this.byLine.get(line) || []; }
    update(dt) { this.t += dt; }
    // where in the cycle a junction is: [phase axis, seconds into it, seconds left of its green]
    phase(j) {
      const t = (this.t + j.offset) % CYCLE, half = GREEN + AMBER + CLEAR;
      return t < half ? { axis: 'x', u: t } : { axis: 'z', u: t - half };
    }
    light(j, axis) {
      if (!j.signal) return null;
      const p = this.phase(j);
      if (p.axis !== axis) return 'r';
      return p.u < GREEN ? 'g' : p.u < GREEN + AMBER ? 'a' : 'r';
    }
    // how long the green has left (0 unless it's green for this axis)
    greenLeft(j, axis) {
      if (!j.signal) return 0;
      const p = this.phase(j);
      return p.axis === axis && p.u < GREEN ? GREEN - p.u : 0;
    }
    // people walk with the traffic going their way: the white man for most of the green, then
    // the flashing hand (finish crossing, don't start), then the hand
    walk(j, axis) {
      if (!j.signal) return null;
      const left = this.greenLeft(j, axis);
      return left > 5 ? 'walk' : left > 0 ? 'flash' : 'stop';
    }
    // the junction a point is in, or next to (within r of its box)
    near(x, z, r) {
      for (const j of this.junctions) { const b = j.box; if (x > b[0] - r && x < b[2] + r && z > b[1] - r && z < b[3] + r) return j; }
      return null;
    }
  }

  DV.Roads = {
    CW, STOP, CYCLE, GREEN, AMBER,
    build(city, blocked, opts) { return new Roads(city, blocked, opts); },
  };
})();
