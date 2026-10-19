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

  const N = 700, BOX = 34, H = 22, RINGS = 90, PADS = 70;
  // a unit square lying flat (the rings and the puddles are instances of it)
  const flat = () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; };
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
    // the ground's textures: a drop's ring, a puddle's soft edge
    tex(kind) {
      this._tex = this._tex || {};
      if (this._tex[kind]) return this._tex[kind];
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      if (kind === 'ring') {
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
        g.beginPath(); g.arc(32, 32, 26, 0, 6.283); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
        g.beginPath(); g.arc(32, 32, 17, 0, 6.283); g.stroke();
      } else {
        // a puddle: bright in the middle, ragged at the edge
        const gr = g.createRadialGradient(32, 32, 4, 32, 32, 31);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.62, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        g.globalCompositeOperation = 'destination-out';
        const r = U.rng(77);
        for (let i = 0; i < 9; i++) { const a = r() * 6.283, d = 22 + r() * 8; g.beginPath(); g.arc(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 4 + r() * 6, 0, 6.283); g.fill(); }
      }
      const t = new THREE.CanvasTexture(c);
      this._tex[kind] = t;
      return t;
    },

    /* ---- the streaks ---- */
    attach(zone) {
      const pos = new Float32Array(N * 6), seed = new Float32Array(N * 3);
      const r = U.rng(909);
      for (let i = 0; i < N; i++) { seed[i * 3] = r() * BOX * 2 - BOX; seed[i * 3 + 1] = r() * H; seed[i * 3 + 2] = r() * BOX * 2 - BOX; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xc4ccd6, transparent: true, opacity: 0, depthWrite: false, fog: true });
      const lines = new THREE.LineSegments(g, mat);
      lines.name = 'rain';
      lines.frustumCulled = false;
      lines.visible = false;
      zone.group.add(lines);
      // the ground: rings where the drops land round you, and puddles that gather in the low places
      // (fixed to the street, a hash of each few metres) and dry off slowly after (two draw calls)
      const ringTex = DV.Weather.tex('ring'), padTex = DV.Weather.tex('pad');
      const rings = new THREE.InstancedMesh(flat(), new THREE.MeshBasicMaterial({ map: ringTex, color: 0xc8d2dc, transparent: true, opacity: 0.55, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), RINGS);
      rings.name = 'rain_rings'; rings.frustumCulled = false; rings.visible = false; rings.renderOrder = 2;
      // a puddle: dark looking down into it, the sky in it looking along the street (Fresnel), gone in the haze
      const padMat = new THREE.ShaderMaterial({
        uniforms: { map: { value: padTex }, sky: { value: new THREE.Color(0x9aa6b2) }, deep: { value: new THREE.Color(0x0c0f12) }, wet: { value: 0 }, far: { value: 60 } },
        vertexShader: `
          varying vec2 vUv; varying vec3 vW;
          void main() {
            vUv = uv;
            vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: `
          uniform sampler2D map; uniform vec3 sky; uniform vec3 deep; uniform float wet; uniform float far;
          varying vec2 vUv; varying vec3 vW;
          void main() {
            vec3 v = normalize(cameraPosition - vW);
            float fres = 0.12 + 0.88 * pow(1.0 - clamp(v.y, 0.0, 1.0), 4.0);
            float d = length(cameraPosition.xz - vW.xz);
            float a = texture2D(map, vUv).a * wet * (0.55 + 0.4 * fres) * (1.0 - smoothstep(far * 0.6, far, d));
            gl_FragColor = vec4(mix(deep, sky, fres), a);
          }`,
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
      const pads = new THREE.InstancedMesh(flat(), padMat, PADS);
      pads.name = 'puddles'; pads.frustumCulled = false; pads.visible = false; pads.renderOrder = 1;
      zone.group.add(rings, pads);
      const ring = [];
      for (let i = 0; i < RINGS; i++) ring.push({ x: 0, z: 0, t: r() * 0.6, life: 0.45 + r() * 0.25, s: 0.18 + r() * 0.2 });
      const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
      const outside = (x, z) => { const rm = zone.roomAt(x, z); return (!rm || rm.exterior) && (!zone.walkable || zone.walkable(x, z)); };
      const st = { lines, rings, pads, seed, pos, fall: 0, wetness: 0, padCell: null };
      zone.weather = st;
      const placePads = (cx, cz) => {
        const C = 9, i0 = Math.floor(cx / C), j0 = Math.floor(cz / C);
        let n = 0;
        for (let i = i0 - 5; i <= i0 + 5 && n < PADS; i++) for (let j = j0 - 5; j <= j0 + 5 && n < PADS; j++) {
          const h = U.rng('pud:' + i + ':' + j);
          if (h() > 0.55) continue;
          const x = (i + 0.15 + h() * 0.7) * C, z = (j + 0.15 + h() * 0.7) * C;
          if (!outside(x, z)) continue;
          const w = 0.9 + h() * 2.2, l = w * (0.5 + h() * 0.6);
          m4.compose(v3.set(x, 0.045, z), q4.setFromAxisAngle(s3.set(0, 1, 0), h() * 6.28), s3.set(w, 1, l));
          pads.setMatrixAt(n++, m4);
        }
        pads.count = n;
        pads.instanceMatrix.needsUpdate = true;
      };
      return {
        update(dt) {
          const k = W.now(), P = DV.Player, room = zone.roomAt(P.x, P.z);
          const cam = DV.Game && DV.Game.camera;
          const cx = cam ? cam.position.x : P.x, cz = cam ? cam.position.z : P.z;
          const out = (!room || room.exterior) && !(DV.Dev && DV.Dev.on() && DV.Dev.flags.noStreet);
          // the streets get wet fast and dry slowly (about half an hour of the clock)
          const mins = (dt * (DV.Clock && DV.Clock.scale ? DV.Clock.scale() : 60)) / 60;
          st.wetness = k > st.wetness ? Math.min(k, st.wetness + mins / 6) : Math.max(k, st.wetness - mins / 30);
          pads.visible = out && st.wetness > 0.02;
          if (pads.visible) {
            const cell = Math.floor(cx / 18) + ':' + Math.floor(cz / 18);
            if (cell !== st.padCell) { st.padCell = cell; placePads(cx, cz); }
            const pu = padMat.uniforms;
            pu.wet.value = st.wetness;
            // (the sky in them: its horizon, a little brighter than the street round them)
            const sky = DV.World.sky && DV.World.sky.userData.dome.material.uniforms;
            if (sky) pu.sky.value.copy(sky.horizon.value).multiplyScalar(1.2);
          }
          const show = k > 0.02 && out;
          lines.visible = show;
          rings.visible = show;
          if (!show) return;
          // the rings: each one grows and fades where a drop hit, and is dropped again somewhere near
          const nr = Math.max(1, Math.floor(RINGS * k));
          let live = 0;
          for (let i = 0; i < nr; i++) {
            const g = ring[i];
            g.t += dt;
            if (g.t >= g.life) {
              g.t = 0;
              const a = Math.random() * 6.283, d = 1 + Math.sqrt(Math.random()) * 16;
              g.x = cx + Math.cos(a) * d; g.z = cz + Math.sin(a) * d;
              g.ok = outside(g.x, g.z);
            }
            if (!g.ok) continue;
            const u = g.t / g.life, sc = g.s * (0.3 + u * 1.7);
            m4.compose(v3.set(g.x, 0.055, g.z), q4.identity(), s3.set(sc, 1, sc));
            rings.setMatrixAt(live++, m4);
          }
          rings.count = live;
          rings.instanceMatrix.needsUpdate = true;
          rings.material.opacity = 0.35 + 0.25 * k;
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
          mat.opacity = 0.3 + 0.3 * k;
        },
      };
    },
  };
  DV.Weather = W;
})();
