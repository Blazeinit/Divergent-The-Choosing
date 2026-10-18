/* =============================================================================
   The Waterfront: the lake that's left.

   East of the city the old lake has gone to marsh, but not all of it. Pools
   lie among the reeds near the shore, and further out there is open water, a
   long channel the Fence's wall closes off. This module gives it life:

   - the water itself: one shader over the whole of it. Ripples that move with
     the wind, the sky in it (and the sun's glint when it's low), murk below,
     foam where it laps the reeds, and the wakes boats leave;
   - boats: a Dauntless patrol launch on its rounds (its searchlight sweeping
     after dark), an Amity supply barge, a factionless fishing skiff, a patched
     sailboat, rowboats tied at the jetty, and a trawler half sunk in the mud;
   - the jetty: Lake Street runs out over the water on a boardwalk to the old
     Ferris wheel. Walt and Iris fish off the end of it, gulls wheel overhead;
   - fishing: borrow Walt's spare rod and cast a line (a carp, an eel, a boot,
     once in a long while a sealed bottle with a note in it).

     DV.Waterfront.attach(zone, city)   (js/zones/testingCenter.js)
============================================================================= */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // the jetty: out from the end of Lake Street, a platform at the end under the wheel
  const WALK = [410, 82, 434, 86], PLAT = [434, 76.5, 442, 91.5], STEPS = [442, 81, 447.4, 87], DECK = 0.06;
  // the wheel's own deck, out on the water: an old concrete pier 60 m by 22, turned to face the city,
  // its top 1.15 m up (built by js/engine/city.js). Up the steps from the jetty and you're on it
  const PIER = { x: 458, z: 84, hl: 30, hw: 11, top: 1.15 };
  PIER.face = Math.atan2(40 - PIER.x, 35 - PIER.z);
  const pc = Math.cos(PIER.face), ps = Math.sin(PIER.face);
  const onPier = (x, z, m) => { const dx = x - PIER.x, dz = z - PIER.z, lx = dx * pc - dz * ps, lz = dx * ps + dz * pc; return Math.abs(lx) < PIER.hl - (m || 0) && Math.abs(lz) < PIER.hw - (m || 0); };
  const pierXZ = (lx, lz) => [PIER.x + lx * pc + lz * ps, PIER.z - lx * ps + lz * pc]; // (lz -11: the side facing the open water)
  const stepY = (x) => U.clamp((x - STEPS[0]) / (STEPS[2] - 0.6 - STEPS[0]), 0, 1) * PIER.top;
  const inR = (x, z, r, m) => x > r[0] + (m || 0) && x < r[2] - (m || 0) && z > r[1] + (m || 0) && z < r[3] - (m || 0);

  /* ---------------- the water ---------------- */
  const WATER_VERT = [
    'varying vec3 vW;',
    '#include <fog_pars_vertex>',
    'void main() {',
    '  vec4 w = modelMatrix * vec4(position, 1.0);',
    '  vW = w.xyz;',
    '  vec4 mvPosition = viewMatrix * w;',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  #include <fog_vertex>',
    '}',
  ].join('\n');
  const WATER_FRAG = [
    'uniform float time; uniform vec3 skyTop; uniform vec3 skyHor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float glow; uniform float light;',
    'uniform vec4 boats[6];',
    'varying vec3 vW;',
    '#include <fog_pars_fragment>',
    'float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.07 + vec2(3.1, 1.7); a *= 0.5; } return s; }',
    // the surface: two sets of ripples running different ways, as a height
    'float surf(vec2 p) { return vn(p * 0.55 + vec2(time * 0.35, time * 0.12)) * 0.6 + vn(p * 1.3 - vec2(time * 0.2, -time * 0.42)) * 0.3 + vn(p * 3.1 + vec2(-time * 0.6, time * 0.5)) * 0.1; }',
    'void main() {',
    '  vec2 p = vW.xz;',
    // where there's water: pools among the reeds by the shore, opening into the channel; round the jetty, open
    '  float open = smoothstep(470.0, 640.0, p.x);',
    '  float jetty = 1.0 - smoothstep(18.0, 46.0, length((p - vec2(436.0, 84.0)) * vec2(0.7, 1.0)));',
    '  float m = fbm(p * 0.012) + fbm(p * 0.05) * 0.25 + open * 0.9 + jetty * 0.8;',
    '  if (m < 0.62) discard;',
    // the ripples as a normal; a wake behind each boat, a bow wave in front
    '  float e = 0.25, h0 = surf(p);',
    '  vec3 N = normalize(vec3(h0 - surf(p + vec2(e, 0.0)), 0.9, h0 - surf(p + vec2(0.0, e))));',
    '  float foam = 0.0;',
    '  for (int i = 0; i < 6; i++) {',
    '    vec4 b = boats[i];',
    '    if (b.w <= 0.01) continue;',
    '    vec2 d = p - b.xy, f = vec2(sin(b.z), cos(b.z));',
    '    float u = dot(d, f), v = dot(d, vec2(f.y, -f.x));',
    '    if (u < 2.0 && u > -90.0) {',
    '      float arm = abs(abs(v) - (-u + 1.0) * 0.36);',
    '      float k = exp(-arm * 1.6) * exp(u * 0.035) * min(b.w / 4.0, 1.0);',
    '      float trail = exp(-abs(v) * 1.2) * exp(u * 0.05) * min(b.w / 5.0, 1.0) * step(u, 0.0);',
    '      foam += (k * 0.8 + trail * 0.45) * (0.6 + 0.4 * vn(p * 2.5 + time * 1.5));',
    '      N = normalize(N + vec3(v, 0.0, u) * 0.0 + vec3(sin(arm * 6.0 - time * 5.0) * k * 0.25, 0.0, 0.0));',
    '    }',
    '  }',
    // the light: the sky reflected (more of it at a glancing angle), murk under it, the sun's glint
    '  vec3 V = normalize(cameraPosition - vW);',
    '  vec3 R = reflect(-V, N);',
    '  float F = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);',
    '  vec3 sky = mix(skyHor, skyTop, clamp(R.y * 1.6, 0.0, 1.0));',
    '  vec3 deep = mix(vec3(0.05, 0.075, 0.07), vec3(0.09, 0.12, 0.11), open) * light;',
    '  vec3 c = mix(deep, sky, clamp(F * 1.15, 0.0, 1.0));',
    '  float s = pow(max(dot(R, normalize(sunDir)), 0.0), 180.0);',
    '  c += sunCol * s * (0.6 + glow * 2.0);',
    // lapping at the reeds: a band of foam at the edge of the pools
    '  float edge = 1.0 - smoothstep(0.62, 0.7, m);',
    '  foam += edge * (0.5 + 0.5 * vn(p * 1.7 + time * 0.8));',
    '  c = mix(c, vec3(0.78, 0.8, 0.76) * light, clamp(foam, 0.0, 0.85));',
    '  gl_FragColor = vec4(c, 1.0);',
    '  #include <fog_fragment>',
    '}',
  ].join('\n');

  /* ---------------- the boats ---------------- */
  const WOOD = [0.42, 0.3, 0.2], WOOD_D = [0.25, 0.18, 0.12], RUST = [0.4, 0.22, 0.13], TAR = [0.08, 0.08, 0.08];
  // a hull from stations along its length: half-beam b and depth d at each u (bow at +L/2), the
  // sheer at y top; the sides, the bottom, the transom and the inside, all in the hull's colour
  function hull(M, L, B, top, keel, col, inside, opts) {
    opts = opts || {};
    const n = 12, pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = -L / 2 + t * L;
      // fuller astern, fine at the bow
      const k = t < 0.55 ? 1 - Math.pow((0.55 - t) / 0.55, 3) * (opts.punt ? 0.05 : 0.25) : 1 - Math.pow((t - 0.55) / 0.45, opts.punt ? 3 : 1.6);
      pts.push({ u, b: Math.max(0.02, (B / 2) * k), y1: top + (opts.sheer || 0.12) * Math.pow(Math.abs(t - 0.45) * 2, 2), y0: keel * (opts.punt ? 0.95 : 0.4 + 0.6 * Math.min(k, 1)) });
    }
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1];
      for (const s of [-1, 1]) {
        const A = [s * a.b, a.y1, a.u], Bq = [s * b.b, b.y1, b.u], C = [s * b.b * 0.35, b.y0, b.u], D = [s * a.b * 0.35, a.y0, a.u];
        if (s > 0) { M.quad(A, D, C, Bq, col); M.quad(A, Bq, C, D, inside); } else { M.quad(A, Bq, C, D, col); M.quad(A, D, C, Bq, inside); }
        // the bottom, to the keel
        const E = [0, a.y0 - 0.02, a.u], F2 = [0, b.y0 - 0.02, b.u];
        if (s > 0) M.quad(D, E, F2, C, col); else M.quad(D, C, F2, E, col);
      }
      // the gunwale: a rail along the top
      for (const s of [-1, 1]) M.quad([s * a.b, a.y1 + 0.05, a.u], [s * b.b, b.y1 + 0.05, b.u], [s * b.b, b.y1 - 0.02, b.u], [s * a.b, a.y1 - 0.02, a.u], opts.rail || mixC(col, [0.9, 0.88, 0.8], 0.25));
    }
    // the transom
    const t0 = pts[0];
    M.quad([-t0.b, t0.y1, t0.u], [t0.b, t0.y1, t0.u], [t0.b * 0.35, t0.y0, t0.u], [-t0.b * 0.35, t0.y0, t0.u], col);
    M.quad([-t0.b, t0.y1, t0.u], [-t0.b * 0.35, t0.y0, t0.u], [t0.b * 0.35, t0.y0, t0.u], [t0.b, t0.y1, t0.u], inside);
    // the floor inside
    M.box(0, keel * 0.3 + 0.02, -L * 0.05, B * 0.55, 0.03, L * 0.7, inside);
    return pts;
  }
  const mixC = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const KINDS = {
    rowboat(M, col) {
      hull(M, 3.8, 1.35, 0.32, -0.28, col, mixC(col, [0, 0, 0], 0.45));
      for (const u of [-0.2, 0.7]) M.box(0, 0.2, u, 1.15, 0.05, 0.28, WOOD);
      for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(0.025, 0.025, 2.4, 5); g.rotateZ(Math.PI / 2 + s * 0.25); g.rotateY(s * 0.5); g.translate(s * 0.9, 0.22, 0.1); M.add(g, WOOD_D); M.box(s * 1.85, 0.0, 0.1 + s * 0.55, 0.1, 0.02, 0.4, WOOD_D); }
      return { L: 3.8, draft: 0.12 };
    },
    skiff(M) {
      hull(M, 5.6, 1.8, 0.5, -0.35, [0.3, 0.36, 0.34], [0.22, 0.2, 0.18]);
      M.box(0, 0.32, -2.4, 0.34, 0.5, 0.4, [0.12, 0.12, 0.12]); // the outboard
      M.box(0, -0.1, -2.62, 0.08, 0.6, 0.08, [0.1, 0.1, 0.1]);
      M.box(0.3, 0.32, -0.6, 0.9, 0.3, 0.8, [0.5, 0.42, 0.28]); // a net in a heap
      M.box(-0.4, 0.3, 1.0, 0.5, 0.25, 0.4, [0.5, 0.48, 0.42]); // a bucket and a crate
      return { L: 5.6, draft: 0.18 };
    },
    patrol(M) {
      hull(M, 8.6, 2.6, 0.9, -0.55, [0.12, 0.12, 0.13], [0.2, 0.2, 0.21], { rail: [0.5, 0.12, 0.1] });
      M.box(0, 0.9, -0.6, 1.9, 1.15, 2.6, [0.16, 0.16, 0.17]); // the wheelhouse
      M.box(0, 1.5, 0.75, 1.7, 0.5, 0.06, [0.12, 0.16, 0.2]); // its screen
      M.box(0, 2.08, -0.6, 2.0, 0.08, 2.8, [0.1, 0.1, 0.1]);
      M.box(0, 2.35, -1.2, 0.08, 0.6, 0.08, [0.3, 0.3, 0.3]); // the mast, the light
      M.box(0, 2.18, 0.4, 0.34, 0.3, 0.42, [0.55, 0.55, 0.52]);
      M.box(0, 2.18, 0.62, 0.26, 0.22, 0.02, [1, 0.96, 0.82], { emit: true });
      for (const s of [-1, 1]) M.box(s * 1.31, 0.55, 1.6, 0.02, 0.18, 1.6, [0.6, 0.1, 0.08]); // the red band
      return { L: 8.6, draft: 0.3, light: [0, 2.2, 0.7] };
    },
    barge(M) {
      M.box(0, -0.3, 0, 4.6, 1.2, 14, [0.24, 0.2, 0.17]);
      M.box(0, 0.3, 0, 4.7, 0.12, 14.1, [0.32, 0.26, 0.2]);
      for (let k = 0; k < 8; k++) M.box((k % 2 ? 0.9 : -0.9), 0.36 + Math.floor(k / 4) * 0.62, -4 + (k % 4) * 2.4, 1.6, 0.6, 1.9, k % 3 ? [0.55, 0.42, 0.26] : [0.36, 0.48, 0.3]); // crates, sacks
      M.box(0, 0.9, -6.2, 2.4, 1.3, 1.4, [0.42, 0.38, 0.3]); // a shelter at the stern
      M.box(0, 1.6, -6.2, 2.6, 0.08, 1.6, [0.3, 0.28, 0.24]);
      return { L: 14, draft: 0.4 };
    },
    sailboat(M) {
      hull(M, 6.4, 2.1, 0.6, -0.5, [0.78, 0.76, 0.7], [0.4, 0.34, 0.26]);
      M.box(0, 3.2, 0.4, 0.09, 6.0, 0.09, [0.35, 0.3, 0.24]); // mast
      M.box(0, 0.9, -0.6, 0.06, 0.06, 3.2, [0.35, 0.3, 0.24]); // boom
      // the sail: a patched triangle, both faces
      const A = [0, 6.0, 0.45], Bq = [0, 0.95, 0.42], C = [0, 0.95, -2.2];
      M.quad(A, Bq, C, C, [0.84, 0.8, 0.7]); M.quad(A, C, Bq, Bq, [0.8, 0.76, 0.66]);
      const a2 = [0.01, 3.2, -0.6], b2 = [0.01, 2.2, -0.2], c2 = [0.01, 2.2, -1.2];
      M.quad(a2, b2, c2, c2, [0.62, 0.5, 0.36]); // a patch
      return { L: 6.4, draft: 0.25 };
    },
    wreck(M) {
      hull(M, 16, 4.6, 1.6, -1.2, RUST, [0.22, 0.13, 0.08], { sheer: 0.4, rail: [0.3, 0.17, 0.1] });
      M.box(0, 2.0, -2.4, 3.2, 2.4, 4.2, [0.36, 0.22, 0.14]); // the wheelhouse, gutted
      M.box(0, 3.3, -2.4, 3.4, 0.12, 4.4, [0.3, 0.18, 0.11]);
      M.box(0, 4.6, 1.6, 0.18, 4.0, 0.18, [0.3, 0.2, 0.13]); // the derrick
      M.box(0, 5.6, 3.4, 0.1, 0.1, 3.8, [0.3, 0.2, 0.13]);
      return { L: 16, draft: 0.9 };
    },
  };
  const geoCache = {};
  function boatMesh(kind, col) {
    const key = kind + (col ? col.join(',') : '');
    if (!geoCache[key]) { const M = new DV.Vehicles.MB(); const info = KINDS[kind](M, col); geoCache[key] = { geo: M.geometry(), info }; }
    return geoCache[key];
  }

  /* ---------------- the jetty, the reeds ---------------- */
  function buildJetty(zone, M) {
    const plank = [0.4, 0.33, 0.25], pile = [0.2, 0.17, 0.13], rail = [0.3, 0.26, 0.2];
    // the deck: boards across the walk, then the platform
    for (let x = WALK[0]; x < WALK[2]; x += 0.42) M.box(x + 0.2, DECK - 0.04, (WALK[1] + WALK[3]) / 2, 0.38, 0.08, WALK[3] - WALK[1], mixC(plank, [0, 0, 0], ((x * 7.3) % 1) * 0.18));
    for (let z = PLAT[1]; z < PLAT[3]; z += 0.42) M.box((PLAT[0] + PLAT[2]) / 2, DECK - 0.04, z + 0.2, PLAT[2] - PLAT[0], 0.08, 0.38, mixC(plank, [0, 0, 0], ((z * 5.1) % 1) * 0.18));
    // piles under it, down into the water
    const piles = [];
    for (let x = WALK[0] + 6; x <= WALK[2]; x += 3) for (const z of [WALK[1], WALK[3]]) piles.push([x, z]);
    for (let z = PLAT[1]; z <= PLAT[3]; z += 3) for (const x of [PLAT[0], PLAT[2]]) piles.push([x, z]);
    for (const [x, z] of piles) { const g = new THREE.CylinderGeometry(0.13, 0.14, 1.1, 7); g.translate(x, -0.45, z); M.add(g, pile); }
    // the railings: posts and a top rail, open where the walk meets the platform, with mooring cleats
    const railRun = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.2));
      for (let k = 0; k <= n; k++) { const t = k / n; M.box(x0 + (x1 - x0) * t, DECK + 0.5, z0 + (z1 - z0) * t, 0.1, 1.0, 0.1, rail); }
      M.box((x0 + x1) / 2, DECK + 1.0, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.1, 0.07, Math.abs(z1 - z0) + 0.1, rail);
      M.box((x0 + x1) / 2, DECK + 0.55, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.06, 0.05, Math.abs(z1 - z0) + 0.06, rail);
      // and solid, to walk into (but not to the camera)
      zone.colliders.add(Math.min(x0, x1) - 0.06, Math.min(z0, z1) - 0.06, Math.max(x0, x1) + 0.06, Math.max(z0, z1) + 0.06, { y1: 1.05, camera: false, tag: 'jetty' });
    };
    railRun(WALK[0] + 6, WALK[1], PLAT[0], WALK[1]);
    railRun(WALK[0] + 6, WALK[3], PLAT[0], WALK[3]);
    railRun(PLAT[0], PLAT[1], PLAT[0], WALK[1]);
    railRun(PLAT[0], WALK[3], PLAT[0], PLAT[3]);
    railRun(PLAT[0], PLAT[1], PLAT[2], PLAT[1]);
    railRun(PLAT[0], PLAT[3], PLAT[2], PLAT[3]);
    railRun(PLAT[2], PLAT[1], PLAT[2], STEPS[1]);
    railRun(PLAT[2], STEPS[3], PLAT[2], PLAT[3]);
    // the steps up onto the wheel's pier, with a rail each side
    const nS = 6;
    for (let k = 0; k < nS; k++) { const x0 = STEPS[0] + k * (STEPS[2] - STEPS[0]) / nS, x1 = x0 + (STEPS[2] - STEPS[0]) / nS, y = (k + 1) / nS * PIER.top; M.box((x0 + x1) / 2, y / 2 - 0.05, (STEPS[1] + STEPS[3]) / 2, x1 - x0, y + 0.1, STEPS[3] - STEPS[1], mixC(plank, [0, 0, 0], k % 2 ? 0.1 : 0)); }
    for (const z of [STEPS[1], STEPS[3]]) {
      for (let k = 0; k <= 3; k++) { const x = STEPS[0] + k * (STEPS[2] - STEPS[0]) / 3; M.box(x, stepY(x) + 0.5, z, 0.1, 1.0 + 0.1, 0.1, rail); }
      M.quad([STEPS[0], DECK + 1.0, z], [STEPS[2], PIER.top + 1.0, z], [STEPS[2], PIER.top + 0.93, z], [STEPS[0], DECK + 0.93, z], rail);
      M.quad([STEPS[0], DECK + 1.0, z], [STEPS[0], DECK + 0.93, z], [STEPS[2], PIER.top + 0.93, z], [STEPS[2], PIER.top + 1.0, z], rail);
    }
    // the pier itself: weathered boards over the concrete, a rail round its edge (open at the steps)
    for (let lz = -PIER.hw + 0.25; lz < PIER.hw; lz += 0.5) {
      const a = pierXZ(-PIER.hl + 0.3, lz - 0.23), b = pierXZ(PIER.hl - 0.3, lz - 0.23), c = pierXZ(PIER.hl - 0.3, lz + 0.23), d = pierXZ(-PIER.hl + 0.3, lz + 0.23);
      const col = mixC([0.38, 0.33, 0.27], [0, 0, 0], ((lz * 13.7) % 1 + 1) % 1 * 0.2);
      M.quad([a[0], PIER.top + 0.012, a[1]], [d[0], PIER.top + 0.012, d[1]], [c[0], PIER.top + 0.012, c[1]], [b[0], PIER.top + 0.012, b[1]], col);
      M.quad([a[0], PIER.top + 0.012, a[1]], [b[0], PIER.top + 0.012, b[1]], [c[0], PIER.top + 0.012, c[1]], [d[0], PIER.top + 0.012, d[1]], col);
    }
    const edge = [];
    for (let lx = -PIER.hl + 0.4; lx <= PIER.hl - 0.4; lx += 2.5) { edge.push([lx, -PIER.hw + 0.3]); edge.push([lx, PIER.hw - 0.3]); }
    for (let lz = -PIER.hw + 0.3; lz <= PIER.hw - 0.3; lz += 2.5) { edge.push([-PIER.hl + 0.4, lz]); edge.push([PIER.hl - 0.4, lz]); }
    for (const [lx, lz] of edge) { const [x, z] = pierXZ(lx, lz); if (Math.abs(z - 84) < 3.6 && x < 450) continue; M.box(x, PIER.top + 0.5, z, 0.1, 1.0, 0.1, rail); }
    const railSide = (l0, l1, fixed, alongX) => {
      const p0 = alongX ? pierXZ(l0, fixed) : pierXZ(fixed, l0), p1 = alongX ? pierXZ(l1, fixed) : pierXZ(fixed, l1);
      for (const y of [0.95, 0.55]) { M.quad([p0[0], PIER.top + y + 0.05, p0[1]], [p1[0], PIER.top + y + 0.05, p1[1]], [p1[0], PIER.top + y, p1[1]], [p0[0], PIER.top + y, p0[1]], rail); M.quad([p0[0], PIER.top + y + 0.05, p0[1]], [p0[0], PIER.top + y, p0[1]], [p1[0], PIER.top + y, p1[1]], [p1[0], PIER.top + y + 0.05, p1[1]], rail); }
    };
    railSide(-PIER.hl + 0.4, PIER.hl - 0.4, -PIER.hw + 0.3, true);
    railSide(-PIER.hl + 0.4, PIER.hl - 0.4, -PIER.hw + 0.3 + 2 * PIER.hw - 0.6, true);
    railSide(-PIER.hw + 0.3, PIER.hw - 0.3, -PIER.hl + 0.4, false);
    railSide(-PIER.hw + 0.3, PIER.hw - 0.3, PIER.hl - 0.4, false);
    // lamps on the jetty (old, two still lit), a bench, crates and a coil of rope, a sign
    for (const [x, z] of [[422, 81.8], [434, 86.2], [441.6, 76.8], pierXZ(-14, -10.6), pierXZ(14, -10.6)]) { M.box(x, DECK + 1.6, z, 0.12, 3.2, 0.12, [0.16, 0.16, 0.16]); M.box(x, DECK + 3.2, z, 0.34, 0.2, 0.34, [0.18, 0.18, 0.18]); M.box(x, DECK + 3.08, z, 0.26, 0.04, 0.26, [1, 0.88, 0.6], { emit: true }); }
    M.box(440, DECK + 0.25, 90.6, 2.0, 0.08, 0.5, plank); M.box(440, DECK + 0.12, 90.6, 0.1, 0.24, 0.4, pile); M.box(439.2, DECK + 0.12, 90.6, 0.1, 0.24, 0.4, pile); M.box(440.8, DECK + 0.12, 90.6, 0.1, 0.24, 0.4, pile);
    zone.colliders.add(438.9, 90.3, 441.1, 90.9, { y1: 0.4, camera: false, tag: 'jetty' });
    M.box(444.6, DECK + 0.35, 90.4, 0.9, 0.7, 0.9, [0.5, 0.4, 0.26]); M.box(444.6, DECK + 0.95, 90.4, 0.6, 0.5, 0.6, [0.46, 0.36, 0.22]);
    zone.colliders.add(444.1, 89.9, 445.1, 90.9, { y1: 1.2, camera: false, tag: 'jetty' });
    { const g = new THREE.CylinderGeometry(0.4, 0.4, 0.16, 12); g.translate(436, DECK + 0.08, 77.6); M.add(g, [0.55, 0.48, 0.34]); } // a coil of rope
    return { piles };
  }
  // reed beds along the shore and round the pools: crossed blades, a few thousand in one mesh
  function buildReeds(M, r) {
    const cols = [[0.42, 0.42, 0.26], [0.36, 0.38, 0.22], [0.5, 0.46, 0.3], [0.3, 0.32, 0.2]];
    for (let i = 0; i < 900; i++) {
      const x = 419 + Math.pow(r(), 1.7) * 220, z = 84 + (r() - 0.5) * 520;
      if (inR(x, z, [WALK[0] - 1, WALK[1] - 3, PLAT[2] + 8, WALK[3] + 3]) || inR(x, z, [PLAT[0] - 3, PLAT[1] - 6, PLAT[2] + 6, PLAT[3] + 6]) || onPier(x, z, -3)) continue;
      const h = 0.9 + r() * 1.4, w = 0.5 + r() * 0.5, a = r() * Math.PI, c = cols[Math.floor(r() * cols.length)];
      for (const da of [0, Math.PI / 2]) {
        const dx = Math.cos(a + da) * w / 2, dz = Math.sin(a + da) * w / 2, lean = (r() - 0.5) * 0.3;
        M.quad([x - dx, -0.05, z - dz], [x + dx, -0.05, z + dz], [x + dx * 0.2 + lean, h, z + dz * 0.2], [x - dx * 0.2 + lean, h, z - dz * 0.2], c);
        M.quad([x - dx, -0.05, z - dz], [x - dx * 0.2 + lean, h, z - dz * 0.2], [x + dx * 0.2 + lean, h, z + dz * 0.2], [x + dx, -0.05, z + dz], mixC(c, [0, 0, 0], 0.2));
      }
    }
  }

  /* ---------------- the gulls ---------------- */
  function gulls(n) {
    const pos = new Float32Array(n * 9 * 2), col = new Float32Array(n * 9 * 2);
    for (let i = 0; i < col.length; i += 3) { col[i] = 0.86; col[i + 1] = 0.86; col[i + 2] = 0.84; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true }));
    mesh.frustumCulled = false;
    const birds = [];
    for (let i = 0; i < n; i++) birds.push({ cx: 440 + Math.random() * 160, cz: 40 + Math.random() * 100, r: 12 + Math.random() * 40, y: 8 + Math.random() * 16, a: Math.random() * 6.3, w: (0.25 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1), f: Math.random() * 6 });
    return { mesh, birds, update(t, dt) {
      let k = 0;
      for (const b of birds) {
        b.a += b.w * dt * (12 / b.r);
        const x = b.cx + Math.cos(b.a) * b.r, z = b.cz + Math.sin(b.a) * b.r, y = b.y + Math.sin(t * 0.3 + b.f) * 1.5;
        const hx = -Math.sin(b.a) * Math.sign(b.w), hz = Math.cos(b.a) * Math.sign(b.w); // heading
        const sx = hz, sz = -hx, flap = Math.sin(t * 6 + b.f) * 0.35, s = 0.55;
        // two triangles: the wings, from the body out, tips up and down with the beat
        const body = [x + hx * 0.25, y, z + hz * 0.25], tail = [x - hx * 0.25, y, z - hz * 0.25];
        for (const side of [-1, 1]) {
          const tip = [x + sx * side * s * 1.8 - hx * 0.1, y + flap * s * 1.6, z + sz * side * s * 1.8 - hz * 0.1];
          for (const v of [body, tail, tip]) { pos[k++] = v[0]; pos[k++] = v[1]; pos[k++] = v[2]; }
        }
      }
      g.attributes.position.needsUpdate = true;
    } };
  }

  const Waterfront = {
    attach(zone, city) {
      const out = { boats: [], t: 0, r: U.rng(9091), people: [], fishing: null };
      const group = new THREE.Group();
      group.name = 'waterfront';
      zone.group.add(group);
      // the water
      const W = DV.World.sky.userData.dome.material.uniforms;
      const boatsU = [];
      for (let i = 0; i < 6; i++) boatsU.push(new THREE.Vector4(0, 0, 0, 0));
      const mat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, skyTop: { value: new THREE.Color() }, skyHor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0.4, 0.5, 0.3) }, sunCol: { value: new THREE.Color(1, 1, 1) }, glow: { value: 0.3 }, light: { value: 1 }, boats: { value: boatsU } }]),
        vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, fog: true,
      });
      mat.uniforms.boats.value = boatsU;
      const plane = new THREE.PlaneGeometry(760, 2280, 1, 1);
      plane.rotateX(-Math.PI / 2);
      const water = new THREE.Mesh(plane, mat);
      water.position.set(418 + 380, -0.03, 35);
      water.name = 'water';
      group.add(water);
      // the jetty and the reeds, in one mesh with the moored and the stranded
      const M = new DV.Vehicles.MB();
      buildJetty(zone, M);
      buildReeds(M, out.r);
      const still = new THREE.Mesh(M.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
      still.name = 'jetty';
      group.add(still);
      if (city.walk && city.walk.mats) city.walk.mats.push(still.material);
      // you can walk out on it (and off the end of Lake Street onto it)
      const walk0 = city.walkable.bind(city);
      city.walkable = (x, z) => walk0(x, z) || inR(x, z, [WALK[0], WALK[1], WALK[2] + 1, WALK[3]], 0.25) || inR(x, z, PLAT, 0.25) || inR(x, z, [STEPS[0] - 1, STEPS[1], STEPS[2] + 1.5, STEPS[3]], 0.3) || onPier(x, z, 0.6);
      // and up the steps and onto the pier: the ground there is the boards
      const ground0 = zone.groundAt.bind(zone);
      zone.groundAt = (x, z) => (inR(x, z, STEPS, -0.05) ? stepY(x) : onPier(x, z, -0.2) ? PIER.top : ground0(x, z));
      for (const c of zone.colliders.boxes) if (c.tag === 'city' && (c.y1 || 0) < 1.3 && onPier((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2, -1.5)) c.enabled = false; // (the deck's own blocks)
      for (const c of zone.colliders.boxes) if (c.x0 < WALK[0] + 9 && c.x1 > WALK[0] && c.z0 < WALK[3] && c.z1 > WALK[1] && c.tag !== 'jetty' && c.x0 > 405) c.enabled = false; // (the shore wall's gap)
      // the boats: moving ones on their courses, moored ones bobbing, the wreck in the mud
      const boatMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
      if (city.walk && city.walk.mats) city.walk.mats.push(boatMat);
      const add = (kind, o) => {
        const m = boatMesh(kind, o.col);
        const root = new THREE.Group(), mesh = new THREE.Mesh(m.geo, boatMat);
        root.add(mesh); group.add(root);
        const b = Object.assign({ kind, root, info: m.info, x: 0, z: 0, rot: 0, speed: 0, ph: out.r() * 6.3 }, o);
        out.boats.push(b);
        return b;
      };
      const m1 = pierXZ(-8, -13.2), m2 = pierXZ(-2, -13.4), m3 = pierXZ(16, -13.2);
      add('rowboat', { moor: [437.6, 74.6, Math.PI / 2 - 0.1], col: [0.55, 0.3, 0.2] });
      add('rowboat', { moor: [m1[0], m1[1], PIER.face + 0.08], col: [0.3, 0.42, 0.5] });
      add('rowboat', { moor: [m2[0], m2[1], PIER.face - 0.1], col: [0.62, 0.58, 0.48] });
      add('skiff', { moor: [m3[0], m3[1], PIER.face + Math.PI + 0.05] });
      add('wreck', { moor: [548, 150, 0.9], sunk: { y: -0.9, roll: 0.22, pitch: -0.08 } });
      out.patrol = add('patrol', { loop: { cx: 640, cz: 84, rx: 140, rz: 210, v: 7.5 } });
      add('sailboat', { loop: { cx: 860, cz: 240, rx: 150, rz: 120, v: 3.6, dir: -1 } });
      const barge = add('barge', { line: { x: 760, z0: -260, z1: 420, v: 2.4 } });
      out.skiff = add('skiff', { drift: { cx: 515, cz: 120, r: 28 } });
      // a figure in the skiff, and one at the barge's tiller
      for (const [b, f, act, at] of [[out.skiff, 'factionless', 'sit', [0, 0.26, -1.6]], [barge, 'amity', 'idle', [0, 0.36, -5.4]], [out.patrol, 'dauntless', 'idle', [0.5, 0.15, -0.4]]]) {
        const m = DV.Character.create(DV.Character.fromFaction(f, 'm', 'boat:' + b.kind, { age: 40 }));
        m.root.position.set(...at); b.root.add(m.root);
        out.people.push({ m, act, seatY: 0.26 });
      }
      // the patrol's searchlight, after dark: a long open cone, additive
      const cone = new THREE.CylinderGeometry(0.2, 9, 60, 16, 1, true);
      cone.translate(0, -30, 0); cone.rotateX(-Math.PI / 2 + 0.06);
      const beam = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: 0xfff1cc, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      beam.position.set(0, 2.2, 0.7); beam.visible = false;
      out.patrol.root.add(beam);
      out.beam = beam;
      // the gulls
      out.gulls = gulls(14);
      group.add(out.gulls.mesh);
      // Walt and Iris, fishing off the end of the jetty
      this.anglers(zone, out, group);
      this.fishSpot(zone, out);
      out.update = (dt) => this.update(zone, out, mat, W, boatsU, dt);
      out.sleep = () => {};
      zone.waterfront = out;
      return out;
    },

    anglers(zone, out, group) {
      const rodGeo = (() => { const g = new THREE.CylinderGeometry(0.008, 0.02, 2.6, 5); g.translate(0, 1.3, 0); return g; })();
      const rodMat = new THREE.MeshBasicMaterial({ color: 0x2a2018, fog: true });
      const folk = [
        { id: 'walt', name: 'Walt Kessler · Fisherman', f: 'factionless', sex: 'm', age: 66, at: pierXZ(-6, -10.2), rot: Math.PI / 2 + 0.25 },
        { id: 'iris', name: 'Iris Doyle · Fisherman', f: 'amity', sex: 'f', age: 52, at: pierXZ(9, -10.2), rot: Math.PI / 2 - 0.3 },
      ];
      for (const p of folk) {
        [p.x, p.z] = p.at;
        p.m = DV.Character.create(DV.Character.fromFaction(p.f, p.sex, 'angler:' + p.id, { age: p.age }));
        p.m.root.position.set(p.x, PIER.top + 0.01, p.z); p.m.root.rotation.y = p.rot;
        group.add(p.m.root);
        const rod = new THREE.Mesh(rodGeo, rodMat);
        rod.rotation.set(1.05, 0, 0); rod.position.set(0, -0.05, 0.05);
        p.m.attach('handR', rod);
        // the line, from the tip to the water
        const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        p.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xbfbfb8, transparent: true, opacity: 0.6, fog: true }));
        p.line.frustumCulled = false;
        group.add(p.line); p.rod = rod;
        p.it = { id: 'wf:' + p.id, kind: 'action', x: p.x - 0.8, y: 1.2, z: p.z, radius: 1.8, label: 'Talk to', name: p.name, onUse: () => this.talk(out, p) };
        zone.interactables.push(p.it);
        out.people.push({ m: p.m, act: 'idle', angler: p });
      }
      out.anglers = folk;
    },
    talk(out, p) {
      const S = DV.State.data, wf = (S.waterfront = S.waterfront || { fish: 0, given: 0, rod: false, bottle: false });
      const say = (t) => DV.UI.subtitle(p.name.split(' ·')[0], t, 5.5);
      if (p.id === 'walt') {
        if (!wf.rod) {
          wf.rod = true;
          DV.Inventory.add('fishing_rod', 1);
          say('Nothing bites since the lake went, they say. They\'re wrong. Here. My spare. Cast off the rail at the end, and when the line jumps, pull.');
          return;
        }
        const fish = DV.Inventory.count('carp') + DV.Inventory.count('marsh_eel');
        if (fish > 0) {
          const give = DV.Inventory.has('carp') ? 'carp' : 'marsh_eel';
          DV.Inventory.remove(give, 1); wf.given++;
          DV.Reputation.add('amity', 1); DV.Audio.play('item');
          const lines = ['That\'ll feed the Kessler table tonight. And the Hayes kids next door.', 'The factionless don\'t get a ration card. We get the lake. What\'s left of it.', 'Good fish. Watch for the patrol launch, though. They count what you take, some nights.', 'My father fished here when it was a lake. You could see the far shore. You can\'t now. They built the wall on it.'];
          say(lines[Math.min(wf.given - 1, lines.length - 1)]);
          if (wf.given === 3) { DV.Inventory.add('ration_bar', 2); DV.UI.notify('Walt gives you two ration bars from his coat. "Fair trade."', 'quest'); }
          return;
        }
        say(U.pick(['Patience is the whole trick. That and a worm.', 'The launch goes round every few minutes. Dauntless. They wave, sometimes. Sometimes they don\'t.', 'That wreck out there was the Margaret K. Ran aground the winter they drained it. Nobody came for her.', 'Bring me what you catch, if you\'ve no use for it. There\'s families on Wacker eat on less.']));
      } else {
        say(U.pick(['Amity sends the barge in twice a week. Produce in, nothing out. Funny sort of trade.', 'I come out here to be quiet. Don\'t take it personally.', 'There\'s eels under the jetty. Fat ones. Fish the shadow.', 'They say there\'s more water past the wall. I\'ve never been. Nobody has.']));
      }
    },

    // the fishing spot: the rail at the end of the platform
    fishSpot(zone, out) {
      const it = {
        id: 'wf:fish', kind: 'action', x: pierXZ(2, -10.2)[0], y: PIER.top + 1.0, z: pierXZ(2, -10.2)[1], radius: 1.8, name: 'The pier rail',
        get label() { const f = out.fishing; return !DV.Inventory.has('fishing_rod') ? 'Look out over the water' : !f ? 'Cast a line' : f.bite ? 'Pull!' : 'Reel in'; },
        onUse: () => this.fishUse(out),
      };
      zone.interactables.push(it);
    },
    fishUse(out) {
      const P = DV.Player;
      if (!DV.Inventory.has('fishing_rod')) { DV.UI.subtitle('', 'Grey water out to the wall. A launch on its rounds; the wheel overhead, stopped for good.', 4); return; }
      const f = out.fishing;
      if (!f) {
        out.fishing = { t: 4 + out.r() * 8, bite: false, window: 0 };
        P.pinned = true; P.action = 'idle';
        DV.Audio.play('whoosh', { volume: 0.5 }); setTimeout(() => DV.Audio.play('splash', { volume: 0.4 }), 450);
        DV.UI.notify('You cast out. Wait for a bite, then pull (E). Move to give up.');
        return;
      }
      if (f.bite) this.land(out);
      else { out.fishing = null; P.pinned = false; DV.UI.notify('You reel in. Nothing.'); }
    },
    land(out) {
      const P = DV.Player, wf = (DV.State.data.waterfront = DV.State.data.waterfront || { fish: 0, given: 0, rod: true, bottle: false });
      out.fishing = null; P.pinned = false;
      const r = out.r(), luck = (DV.Stats ? DV.Stats.attr('perception') || 5 : 5) / 100; // (a sharp eye lands more carp)
      let what = r < 0.5 + luck ? 'carp' : r < 0.74 ? 'marsh_eel' : r < 0.9 ? 'old_boot' : 'message_bottle';
      if (what === 'message_bottle' && wf.bottle) what = 'carp';
      if (what === 'message_bottle') wf.bottle = true;
      wf.fish++;
      DV.Inventory.add(what, 1);
      DV.Audio.play('splash', { volume: 0.6 }); DV.Audio.play('item');
      if (DV.Stats && DV.Stats.practice) DV.Stats.practice('observation', 0.5);
      DV.Events.emit('waterfront:catch', { what });
    },

    update(zone, out, mat, W, boatsU, dt) {
      out.t += dt;
      const t = out.t, P = DV.Player, cam = DV.Game && DV.Game.camera;
      const u = mat.uniforms;
      u.time.value = t;
      u.skyTop.value.copy(W.top.value); u.skyHor.value.copy(W.horizon.value);
      u.sunDir.value.copy(W.sunDir.value); u.sunCol.value.copy(W.sunCol.value); u.glow.value = W.glow.value;
      const hl = W.horizon.value; u.light.value = U.clamp((hl.r + hl.g + hl.b) / 1.8, 0.2, 1);
      const near = cam ? cam.position.x > 300 : true; // (nobody in the west of the city can see any of this)
      const tod = DV.World.tod, dark = tod ? tod.lit > 0.55 : false;
      // the boats
      let bi = 0;
      for (const b of out.boats) {
        const pr = b.x, pz = b.z;
        if (b.moor) { b.x = b.moor[0]; b.z = b.moor[1]; b.rot = b.moor[2] + Math.sin(t * 0.3 + b.ph) * 0.04; }
        else if (b.loop) {
          const L = b.loop; b.a = (b.a === undefined ? out.r() * 6.3 : b.a) + (L.dir || 1) * L.v * dt / ((L.rx + L.rz) / 2);
          b.x = L.cx + Math.cos(b.a) * L.rx; b.z = L.cz + Math.sin(b.a) * L.rz;
        } else if (b.line) {
          const L = b.line; b.s = b.s === undefined ? out.r() : b.s; b.dir = b.dir || 1;
          b.s += b.dir * L.v * dt / (L.z1 - L.z0); if (b.s > 1 || b.s < 0) { b.dir = -b.dir; b.s = U.clamp(b.s, 0, 1); }
          b.x = L.x + Math.sin(b.s * 9) * 6; b.z = L.z0 + (L.z1 - L.z0) * b.s;
        } else if (b.drift) {
          // the skiff: motors a little way, stops to fish, motors on
          const D = b.drift; b.wait = (b.wait || 0) - dt;
          if (!b.goal || (b.wait <= 0 && Math.hypot(b.goal[0] - b.x, b.goal[1] - b.z) < 1)) { b.goal = [D.cx + (out.r() - 0.5) * 2 * D.r, D.cz + (out.r() - 0.5) * 2 * D.r]; b.wait = 12 + out.r() * 20; if (!b.x) { b.x = D.cx; b.z = D.cz; } }
          const dx = b.goal[0] - b.x, dz = b.goal[1] - b.z, d = Math.hypot(dx, dz);
          if (d > 1) { const s = Math.min(d, 3.2 * dt); b.x += dx / d * s; b.z += dz / d * s; }
        }
        if (!b.moor) {
          const vx = (b.x - pr) / Math.max(dt, 1e-3), vz = (b.z - pz) / Math.max(dt, 1e-3), sp = Math.hypot(vx, vz);
          b.speed = U.damp(b.speed, pr ? sp : 0, 3, dt);
          if (sp > 0.2) b.rot = U.dampAngle(b.rot, Math.atan2(vx, vz), 1.5, dt);
        }
        // afloat: bob, pitch and roll on the swell (more for the small ones); the wreck sits in the mud
        const small = 4 / (b.info.L + 2);
        const y = b.sunk ? b.sunk.y : Math.sin(t * 1.3 + b.ph) * 0.05 * small * 2 - b.info.draft * 0.2;
        b.root.position.set(b.x, y, b.z);
        b.root.rotation.set(b.sunk ? b.sunk.pitch : Math.sin(t * 0.9 + b.ph) * 0.03 * small + (b.speed > 1 ? -0.02 : 0), b.rot, b.sunk ? b.sunk.roll : Math.sin(t * 1.1 + b.ph * 2) * 0.045 * small);
        if (bi < 6 && !b.moor) { boatsU[bi].set(b.x, b.z, b.rot, b.speed); bi++; }
      }
      for (; bi < 6; bi++) boatsU[bi].set(0, 0, 0, 0);
      // the searchlight sweeps after dark
      out.beam.visible = dark && near;
      if (out.beam.visible) { out.beam.rotation.y = Math.sin(t * 0.25) * 0.9; }
      // the people aboard and on the jetty
      for (const q of out.people) if (near) q.m.animate(dt, { speed: 0, action: q.act, seatY: q.seatY || 0.45 });
      if (out.anglers) for (const p of out.anglers) {
        if (!near) continue;
        // a line from the rod's tip down to the float
        p.rod.updateMatrixWorld(true);
        const tip = new THREE.Vector3(0, 2.6, 0).applyMatrix4(p.rod.matrixWorld);
        const a = p.line.geometry.attributes.position;
        a.setXYZ(0, tip.x, tip.y, tip.z); a.setXYZ(1, tip.x + 2.2, -0.02 + Math.sin(t * 1.4 + p.x) * 0.02, tip.z + Math.sin(p.rot) * 0.4); a.needsUpdate = true;
      }
      if (near) out.gulls.update(t, dt);
      out.gulls.mesh.visible = near;
      // and now and then a gull's cry, the slap of the water under the jetty
      out.cry = (out.cry || 5) - dt;
      if (out.cry < 0 && P && P.x > 380) { out.cry = 6 + out.r() * 10; const g = out.gulls.birds[Math.floor(out.r() * out.gulls.birds.length)]; DV.Audio.play('gull', { x: g.cx, z: g.cz, range: 120 }); }
      // fishing
      const f = out.fishing;
      if (f) {
        if (Math.hypot(P.vx || 0, P.vz || 0) > 0.5) { out.fishing = null; P.pinned = false; DV.UI.notify('You reel in and give up.'); return; }
        f.t -= dt;
        if (!f.bite && f.t <= 0) { f.bite = true; f.window = 1.4; DV.Audio.play('splash', { volume: 0.5 }); DV.UI.notify('The line jumps! Pull (E)!', 'quest'); }
        else if (f.bite) { f.window -= dt; if (f.window <= 0) { f.bite = false; f.t = 3 + out.r() * 7; DV.UI.notify('It\'s gone. Wait for the next one.'); } }
      }
    },
  };

  // what comes out of the lake
  Object.assign(DV.Items.defs, {
    fishing_rod: { name: 'Fishing Rod', cat: 'misc', usable: false, desc: 'Walt Kessler\'s spare: a jointed cane rod, the reel taped where it cracked. Cast it off the end of the jetty.', icon: { shape: 'key', color: '#6b5134' } },
    carp: { name: 'Marsh Carp', cat: 'consumable', stack: true, usable: true, desc: 'A bronze carp out of the marsh. Edible, Walt swears. Eat it (restores some stamina), or give it to someone who needs it more.', use: { type: 'stamina', amount: 25 }, icon: { shape: 'bar', color: '#a0844a' } },
    marsh_eel: { name: 'Marsh Eel', cat: 'consumable', stack: true, usable: true, desc: 'Long, dark, still twisting. Iris says they grill well. (Restores stamina.)', use: { type: 'stamina', amount: 35 }, icon: { shape: 'bar', color: '#3e4a3a' } },
    old_boot: { name: 'Old Boot', cat: 'misc', stack: true, usable: false, desc: 'A Dauntless boot, black, the sole half off. Somebody lost it, or lost the person in it.', icon: { shape: 'token', color: '#1d1d1f' } },
    message_bottle: { name: 'Sealed Bottle', cat: 'misc', usable: true, desc: 'Green glass, the cork waxed shut, a rolled paper inside. It has been in the water a long time.', use: { type: 'read', title: 'A NOTE IN A BOTTLE', text: 'If you are reading this, the water still reaches the city.\n\nWe went over the wall at the north tower in the ninth year. There is more lake past it than there ever was on this side. There are lights on the far shore at night. Not ours.\n\nThey will tell you there is nothing out here. They are lying, or they have never looked.\n\n- M.K.' }, icon: { shape: 'bottle', color: '#4f7a4a' } },
  });
  for (const id of ['fishing_rod', 'carp', 'marsh_eel', 'old_boot', 'message_bottle']) DV.Items.defs[id].id = id;

  DV.Waterfront = Waterfront;
})();
