/* ==========================================================================
   DIVERGENT — the weather
   Rain off the lake, now and then. Each day's weather is settled from the
   day itself (the same day always rains at the same hour, so people's plans
   can allow for it): most days are dry; on some, a shower or two comes in
   for an hour or so in the afternoon or the evening. Aptitude Day is dry.

   Out of doors in the city you see it (streaks round the camera, one draw
   call) and the people in the streets hurry, and keep off the benches.

     DV.Weather.at(day, m)    0..1: how hard it's raining then (m: minutes)
     DV.Weather.now()         the same, for the clock (or a forced value)
     DV.Weather.force(k)      QA / dev: make it rain (0..1), null to let it be
     DV.Weather.attach(zone)  the streaks (a city zone)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const N = 700, BOX = 34, H = 22;
  const cache = new Map();

  const W = {
    forced: null,
    // the day's showers: [{ t0, t1, k }]
    showers(day) {
      if (cache.has(day)) return cache.get(day);
      const r = U.rng('weather:' + day), out = [];
      if (day > 1 && r() < 0.45) {
        const n = r() < 0.3 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const t0 = (9 + r() * 10) * 60, len = 35 + r() * 80;
          out.push({ t0, t1: t0 + len, k: 0.55 + r() * 0.45 });
        }
      }
      cache.set(day, out);
      if (cache.size > 8) cache.delete(cache.keys().next().value);
      return out;
    },
    at(day, m) {
      let k = 0;
      for (const s of this.showers(day)) {
        if (m < s.t0 - 10 || m > s.t1 + 10) continue;
        // (it comes on and goes off over ten minutes)
        k = Math.max(k, s.k * U.clamp(Math.min(m - s.t0 + 10, s.t1 + 10 - m) / 20, 0, 1));
      }
      return k;
    },
    now() {
      if (this.forced !== null) return this.forced;
      return DV.State && DV.State.data ? this.at(DV.Clock.day(), DV.Clock.minutes()) : 0;
    },
    force(k) { this.forced = k === null || k === undefined ? null : U.clamp(k, 0, 1); },

    /* ---- the streaks ---- */
    attach(zone) {
      const pos = new Float32Array(N * 6), seed = new Float32Array(N * 3);
      const r = U.rng(909);
      for (let i = 0; i < N; i++) { seed[i * 3] = r() * BOX * 2 - BOX; seed[i * 3 + 1] = r() * H; seed[i * 3 + 2] = r() * BOX * 2 - BOX; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xaab4bf, transparent: true, opacity: 0, depthWrite: false, fog: true });
      const lines = new THREE.LineSegments(g, mat);
      lines.name = 'rain';
      lines.frustumCulled = false;
      lines.visible = false;
      zone.group.add(lines);
      const st = { lines, seed, pos, fall: 0 };
      zone.weather = st;
      return {
        update(dt) {
          const k = W.now(), P = DV.Player, room = zone.roomAt(P.x, P.z);
          const show = k > 0.02 && (!room || room.exterior) && !(DV.Dev && DV.Dev.on() && DV.Dev.flags.noStreet);
          lines.visible = show;
          if (!show) return;
          const cam = DV.Game && DV.Game.camera;
          const cx = cam ? cam.position.x : P.x, cz = cam ? cam.position.z : P.z;
          st.fall = (st.fall + dt * 17) % H;
          const n = Math.floor(N * k);
          for (let i = 0; i < n; i++) {
            // each streak falls through the box round the camera and wraps (slanting a little with the wind)
            let y = seed[i * 3 + 1] - st.fall;
            if (y < 0) y += H;
            const x = cx + ((((seed[i * 3] + y * 0.12 - cx) % (BOX * 2)) + BOX * 3) % (BOX * 2)) - BOX;
            const z = cz + ((((seed[i * 3 + 2] - cz) % (BOX * 2)) + BOX * 3) % (BOX * 2)) - BOX;
            const o = i * 6;
            pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
            pos[o + 3] = x - 0.06; pos[o + 4] = y + 0.75; pos[o + 5] = z;
          }
          g.attributes.position.needsUpdate = true;
          g.setDrawRange(0, n * 2);
          mat.opacity = 0.18 + 0.22 * k;
        },
      };
    },
  };
  DV.Weather = W;
})();
