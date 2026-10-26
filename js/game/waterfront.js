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
  // the landing: a timber quay north of the jetty where the ferry ties up (LAND), its berth, its route
  // out along the channel to the Water Gate in the Fence and back
  const LAND = [416.2, 101.5, 438.2, 114.5], BERTH = [441.7, 108];
  const ROUTE = [BERTH, [452, 109], [480, 112], [640, 118], [880, 98], [1080, 88], [1136, 84.5]];
  const GATE_A = Math.atan2(84 - 35, 1166 - 40); // (the Water Gate's angle round the ring)
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
    'uniform float time; uniform vec3 skyTop; uniform vec3 skyHor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float glow; uniform float light; uniform float skyTime; uniform float clouds;',
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
    '  float lane = (1.0 - smoothstep(9.0, 22.0, abs(p.y - 107.0))) * step(418.5, p.x) * (1.0 - smoothstep(560.0, 660.0, p.x));',
    '  float m = fbm(p * 0.012) + fbm(p * 0.05) * 0.25 + open * 0.9 + jetty * 0.8 + lane * 0.9;',
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
    // the clouds overhead, in the water (the same layer the sky draws)
    '  if (R.y > 0.0) { vec2 cuv = R.xz / (R.y + 0.14) * 1.4 + vec2(skyTime * 0.010, skyTime * 0.0035); float cn = fbm(cuv);',
    '    float cov = smoothstep(1.05 - clouds, 1.4 - clouds, cn) * smoothstep(0.0, 0.22, R.y);',
    '    sky = mix(sky, mix(mix(skyTop, skyHor, 0.35) * 0.66, skyHor * 1.1 + sunCol * glow * 0.2, 0.5), cov * 0.85); }',
    // the city and the wall on the far shore, a dark band low in the reflection
    '  sky = mix(sky, sky * 0.55, smoothstep(0.08, 0.0, R.y) * 0.8);',
    // murk out in the channel; shallows by the reeds, browner and lighter
    '  float shallow = smoothstep(0.85, 0.62, m);',
    '  vec3 deep = mix(mix(vec3(0.05, 0.075, 0.07), vec3(0.08, 0.11, 0.105), open), vec3(0.16, 0.15, 0.1), shallow * 0.8) * light;',
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
    // the Amity ferry: a beamy launch, a deckhouse with a band of windows, benches aft
    ferry(M) {
      hull(M, 13, 4.2, 0.9, -0.6, [0.2, 0.32, 0.24], [0.3, 0.27, 0.22], { rail: [0.78, 0.74, 0.62], sheer: 0.18 });
      M.box(0, 0.62, 0, 3.7, 0.08, 11.6, [0.42, 0.36, 0.27]); // the deck
      M.box(0, 1.6, 1.6, 3.2, 1.9, 4.6, [0.8, 0.77, 0.66]); // the deckhouse
      M.box(0, 1.95, 1.6, 3.24, 0.62, 4.64, [0.1, 0.12, 0.13]); // its windows
      M.box(0, 2.62, 1.6, 3.5, 0.14, 4.9, [0.22, 0.32, 0.24]);
      M.box(0, 3.6, 2.8, 0.1, 2.0, 0.1, [0.3, 0.3, 0.3]); M.box(0, 4.6, 2.8, 0.22, 0.22, 0.22, [1, 0.9, 0.6], { emit: true });
      for (const z of [-2.0, -3.4, -4.8]) for (const sd of [-1, 1]) { M.box(sd * 1.15, 1.0, z, 1.1, 0.08, 0.45, [0.5, 0.4, 0.28]); M.box(sd * 1.15, 0.8, z, 0.08, 0.36, 0.4, [0.3, 0.25, 0.2]); }
      for (const sd of [-1, 1]) M.box(sd * 2.02, 0.85, 0.6, 0.06, 0.5, 9.0, [0.7, 0.66, 0.55]); // the rail
      M.box(0, 0.95, 5.6, 0.6, 0.6, 0.6, [0.6, 0.45, 0.26]); // a crate at the bow
      return { L: 13, draft: 0.3, seats: [[-1.15, -2.0], [1.15, -2.0], [-1.15, -3.4], [1.15, -3.4], [-1.15, -4.8], [1.15, -4.8]] };
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
    const cols = [[0.56, 0.54, 0.34], [0.48, 0.5, 0.3], [0.62, 0.56, 0.38], [0.44, 0.46, 0.28]];
    for (let i = 0; i < 900; i++) {
      const x = 419 + Math.pow(r(), 2.2) * 90, z = 84 + (r() - 0.5) * 520;
      if (inR(x, z, [WALK[0] - 1, WALK[1] - 3, PLAT[2] + 8, WALK[3] + 3]) || inR(x, z, [PLAT[0] - 3, PLAT[1] - 6, PLAT[2] + 6, PLAT[3] + 6]) || onPier(x, z, -3) || (Math.abs(z - 107) < 22 && x < 640)) continue;
      const h = 0.9 + r() * 1.4, w = 0.5 + r() * 0.5, a = r() * Math.PI, c = cols[Math.floor(r() * cols.length)];
      for (const da of [0, Math.PI / 2]) {
        const dx = Math.cos(a + da) * w / 2, dz = Math.sin(a + da) * w / 2, lean = (r() - 0.5) * 0.3;
        M.quad([x - dx, -0.05, z - dz], [x + dx, -0.05, z + dz], [x + dx * 0.2 + lean, h, z + dz * 0.2], [x - dx * 0.2 + lean, h, z - dz * 0.2], c);
        M.quad([x - dx, -0.05, z - dz], [x - dx * 0.2 + lean, h, z - dz * 0.2], [x + dx * 0.2 + lean, h, z + dz * 0.2], [x + dx, -0.05, z + dz], mixC(c, [0, 0, 0], 0.2));
      }
    }
  }


  /* ---------------- the wheel ---------------- */
  // The Ferris wheel on the old pier, stopped since before the Fence: twin rims trussed together,
  // spokes to a hub on two A-frames, the gondolas still hanging (most of them), paint gone to rust,
  // a maintenance ladder up one leg and along a spoke to the top (the climb: see Waterfront.climb).
  const WH = { R: 38, cy: 47.2, n: 48, gap: 1.6 };
  function beam(M, p, q, t, col) {
    const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]), len = d.length();
    if (len < 1e-3) return;
    const g = new THREE.BoxGeometry(t, t, len);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize())));
    g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
    M.add(g, col);
  }
  function buildWheel(M, L) {
    const face = PIER.face, ax = Math.cos(face), az = -Math.sin(face), nx = Math.sin(face), nz = Math.cos(face);
    const x0 = PIER.x, z0 = PIER.z, cy = WH.cy, R = WH.R;
    // a point on the wheel: angle a round the rim, radius r, off the wheel's plane by o
    const P = (a, r, o) => [x0 + ax * Math.cos(a) * r + nx * o, cy + Math.sin(a) * r, z0 + az * Math.cos(a) * r + nz * o];
    const rust = [0.44, 0.27, 0.17], paint = [0.68, 0.64, 0.57], dark = [0.24, 0.17, 0.12];
    const tone = (k) => mixC(paint, rust, 0.35 + 0.5 * (((k * 7.31) % 1 + 1) % 1)); // (flaking: no two members the same)
    const n = WH.n;
    for (const o of [-WH.gap, WH.gap]) {
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
        beam(M, P(a0, R, o), P(a1, R, o), 0.42, tone(k));
        beam(M, P(a0, R - 2.4, o), P(a1, R - 2.4, o), 0.3, tone(k + 3));
        beam(M, P(a0, R, o), P(a1, R - 2.4, o), 0.16, tone(k + 5)); // (the truss between the rims)
      }
      for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; beam(M, P(a, 1.4, o * 1.6), P(a, R - 2.4, o), 0.2, tone(k + 11)); }
    }
    for (let k = 0; k < n; k += 2) { const a = (k / n) * Math.PI * 2; beam(M, P(a, R, -WH.gap), P(a, R, WH.gap), 0.2, tone(k + 17)); }
    // the hub and its axle
    { const g = new THREE.CylinderGeometry(1.7, 1.7, 7.2, 16); g.rotateX(Math.PI / 2); g.rotateY(face); g.translate(x0, cy, z0); M.add(g, dark); }
    { const g = new THREE.CylinderGeometry(0.7, 0.7, 11, 12); g.rotateX(Math.PI / 2); g.rotateY(face); g.translate(x0, cy, z0); M.add(g, [0.2, 0.2, 0.2]); }
    // the A-frames: two legs a side, braced, on footings on the pier
    const feet = [];
    for (const o of [-5, 5]) {
      for (const s of [-1, 1]) {
        const foot = [x0 + ax * s * 21 + nx * o, PIER.top, z0 + az * s * 21 + nz * o];
        feet.push(foot);
        beam(M, foot, P(0, 0, o * 0.9), 0.9, mixC(rust, dark, 0.2));
        M.box(foot[0], PIER.top + 0.3, foot[2], 2.4, 0.6, 2.4, [0.36, 0.35, 0.33]);
      }
      for (let h = 8; h < cy - 4; h += 8) {
        const k = h / cy, a = [x0 + ax * -21 * (1 - k) + nx * o, PIER.top + h, z0 + az * -21 * (1 - k) + nz * o], b = [x0 + ax * 21 * (1 - k) + nx * o, PIER.top + h, z0 + az * 21 * (1 - k) + nz * o];
        beam(M, a, b, 0.35, mixC(rust, dark, 0.3));
      }
    }
    // the ladder: up the near leg (the one on the city side, west) to the hub, then a spoke to the top
    const legFoot = feet[0], hub = P(0, 0, -5 * 0.9 + 0.6);
    const lad = (p, q, step) => {
      const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], len = Math.hypot(...d), m = Math.floor(len / step);
      for (const side of [-0.3, 0.3]) beam(M, [p[0] + ax * side, p[1], p[2] + az * side], [q[0] + ax * side, q[1], q[2] + az * side], 0.06, [0.5, 0.48, 0.42]);
      for (let i = 1; i < m; i++) { const t = i / m, c = [p[0] + d[0] * t, p[1] + d[1] * t, p[2] + d[2] * t]; beam(M, [c[0] - ax * 0.3, c[1], c[2] - az * 0.3], [c[0] + ax * 0.3, c[1], c[2] + az * 0.3], 0.05, [0.5, 0.48, 0.42]); }
    };
    const lf = [legFoot[0] - nx * 0.7, legFoot[1] + 0.2, legFoot[2] - nz * 0.7], top = P(Math.PI / 2, R + 0.5, -WH.gap - 0.6);
    lad(lf, [hub[0] - nx * 0.7, hub[1], hub[2] - nz * 0.7], 0.42);
    lad([hub[0] - nx * 0.7, hub[1], hub[2] - nz * 0.7], top, 0.42);
    // the gondolas: closed cabins hanging under the rim between the two rims (three gone, one askew)
    const cabCols = [[0.62, 0.22, 0.16], [0.24, 0.42, 0.44], [0.74, 0.7, 0.6], [0.5, 0.36, 0.2]];
    const lights = [];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2 + 0.06, pv = P(a, R + 0.6, 0);
      lights.push(P(a + 0.13, R + 0.2, WH.gap + 0.3), P(a + 0.13, R + 0.2, -WH.gap - 0.3));
      if (k === 5 || k === 13 || k === 19) { beam(M, P(a, R + 0.6, -0.6), [pv[0], pv[1] - 1.4, pv[2]], 0.08, rust); continue; } // (only the hanger left)
      const tilt = k === 9 ? 0.45 : 0, c = mixC(cabCols[k % 4], rust, 0.35);
      const cx = pv[0] + ax * Math.sin(tilt) * 1.8, cyy = pv[1] - 1.9 * Math.cos(tilt) - 0.4, cz = pv[2] + az * Math.sin(tilt) * 1.8;
      beam(M, pv, [cx, cyy + 1.3, cz], 0.1, dark);
      const g = new THREE.BoxGeometry(2.3, 2.1, 2.0); g.rotateZ(tilt); g.rotateY(face); g.translate(cx, cyy, cz); M.add(g, c);
      const w = new THREE.BoxGeometry(2.34, 0.7, 2.04); w.rotateZ(tilt); w.rotateY(face); w.translate(cx, cyy + 0.3, cz); M.add(w, [0.09, 0.1, 0.11]);
      const r2 = new THREE.CylinderGeometry(0.5, 1.4, 0.5, 6); r2.rotateZ(tilt); r2.rotateY(face); r2.translate(cx, cyy + 1.3, cz); M.add(r2, mixC(c, dark, 0.3));
    }
    // the ticket booth at the foot, boarded up, and the pier's old sign
    const tb = pierXZ(-20, 3);
    M.box(tb[0], PIER.top + 1.3, tb[1], 2.4, 2.6, 2.4, [0.5, 0.2, 0.16]);
    M.box(tb[0], PIER.top + 2.75, tb[1], 2.9, 0.3, 2.9, [0.3, 0.28, 0.25]);
    M.box(tb[0], PIER.top + 1.5, tb[1], 2.44, 0.8, 2.44, [0.4, 0.33, 0.24]);
    // the rim lights: a separate mesh, lit after dark (a few have died)
    const LM = new DV.Vehicles.MB();
    lights.forEach((q, i) => { if ((i * 37) % 11 !== 3) LM.box(q[0], q[1], q[2], 0.28, 0.28, 0.28, i % 5 === 0 ? [1, 0.5, 0.3] : [1, 0.86, 0.55], { emit: true }); });
    L.lights = LM;
    L.ladder = { foot: lf, hub: [hub[0] - nx * 0.7, hub[1], hub[2] - nz * 0.7], top, face, out: [-nx, -nz] };
    return L;
  }

  /* ---------------- the landing and the Water Gate ---------------- */
  function buildLanding(zone, M) {
    const plank = [0.4, 0.33, 0.25], pile = [0.2, 0.17, 0.13], rail = [0.3, 0.26, 0.2];
    for (let x = LAND[0]; x < LAND[2]; x += 0.42) M.box(x + 0.2, DECK - 0.04, (LAND[1] + LAND[3]) / 2, 0.38, 0.08, LAND[3] - LAND[1], mixC(plank, [0, 0, 0], ((x * 5.7) % 1) * 0.2));
    for (let z = LAND[1]; z <= LAND[3]; z += 2.6) for (const x of [LAND[0] + 3, LAND[2]]) { const g = new THREE.CylinderGeometry(0.16, 0.17, 1.4, 7); g.translate(x, -0.6, z); M.add(g, pile); }
    // bollards along the edge, a fender of old tyres, rails at the ends
    for (let z = LAND[1] + 1.2; z < LAND[3]; z += 3.4) { M.box(LAND[2] - 0.3, DECK + 0.25, z, 0.32, 0.5, 0.32, [0.16, 0.16, 0.16]); M.box(LAND[2] - 0.3, DECK + 0.52, z, 0.44, 0.08, 0.44, [0.16, 0.16, 0.16]); }
    for (let z = LAND[1] + 2.5; z < LAND[3] - 1; z += 2.2) { const g = new THREE.TorusGeometry(0.34, 0.13, 6, 10); g.rotateY(Math.PI / 2); g.translate(LAND[2] + 0.08, -0.1, z); M.add(g, [0.08, 0.08, 0.08]); }
    for (const z of [LAND[1], LAND[3]]) {
      for (let x = LAND[0] + 3; x <= LAND[2]; x += 2.2) M.box(x, DECK + 0.5, z, 0.1, 1.0, 0.1, rail);
      M.box((LAND[0] + 3 + LAND[2]) / 2, DECK + 1.0, z, LAND[2] - LAND[0] - 3, 0.07, 0.1, rail);
      zone.colliders.add(LAND[0] + 3, z - 0.08, LAND[2], z + 0.08, { y1: 1.05, camera: false, tag: 'jetty' });
    }
    // the harbour office: a shed with a lit window and its board, the ferry's timetable chalked up
    M.box(424.5, 1.5, 111.6, 5.2, 3.0, 4.2, [0.46, 0.42, 0.36]);
    M.box(424.5, 3.15, 111.6, 5.8, 0.3, 4.8, [0.24, 0.22, 0.2]);
    M.box(427.12, 1.7, 111.6, 0.05, 0.9, 1.6, [1, 0.86, 0.6], { emit: true });
    M.box(427.12, 0.95, 109.8, 0.06, 1.9, 0.9, [0.2, 0.16, 0.12]); // its door
    M.box(427.2, 2.65, 111.6, 0.08, 0.6, 3.6, [0.12, 0.2, 0.16]); // the board over it
    zone.colliders.add(421.8, 109.4, 427.2, 113.8, { y1: 3, tag: 'jetty' });
    // the crane: a mast, a jib out over the water, the hook; cargo stacked beside it
    const cx = 435.6, cz = 113.2;
    M.box(cx, 3.2, cz, 0.5, 6.4, 0.5, [0.55, 0.38, 0.14]);
    beam(M, [cx, 6.2, cz], [cx + 6.5, 5.2, cz - 2.5], 0.32, [0.55, 0.38, 0.14]);
    beam(M, [cx, 6.6, cz], [cx + 6.5, 5.2, cz - 2.5], 0.06, [0.2, 0.2, 0.2]);
    beam(M, [cx + 6.3, 5.2, cz - 2.4], [cx + 6.3, 2.2, cz - 2.4], 0.03, [0.2, 0.2, 0.2]);
    M.box(cx + 6.3, 2.0, cz - 2.4, 0.3, 0.3, 0.3, [0.25, 0.25, 0.25]);
    zone.colliders.add(cx - 0.4, cz - 0.4, cx + 0.4, cz + 0.4, { y1: 6, tag: 'jetty' });
    for (let k = 0; k < 7; k++) { const x = 429 + (k % 3) * 1.3, z = 103.6 + Math.floor(k / 3) * 1.2, y = k === 6 ? 1.1 : 0.4; M.box(x, DECK + y, z, 1.1, 0.8, 1.0, k % 2 ? [0.55, 0.42, 0.26] : [0.4, 0.5, 0.32]); }
    zone.colliders.add(428.3, 103, 432.4, 106.6, { y1: 1.6, camera: false, tag: 'jetty' });
    for (const [x, z] of [[419.5, 102.4], [419.5, 113.6], [437.4, 102.4]]) { M.box(x, DECK + 1.6, z, 0.12, 3.2, 0.12, [0.16, 0.16, 0.16]); M.box(x, DECK + 3.2, z, 0.34, 0.2, 0.34, [0.18, 0.18, 0.18]); M.box(x, DECK + 3.08, z, 0.26, 0.04, 0.26, [1, 0.88, 0.6], { emit: true }); }
  }
  // the Water Gate: where the lake meets the Fence. Two towers in the water against the wall's inner
  // face, a bridge between them, the lock's steel doors (shut, unless the ferry's cargo is going
  // through), floodlights, red lamps up the towers. Erudite's: the cameras on it never sleep
  function buildGate(M) {
    const R = DV.CityMap.wall.inner - 7, c = DV.CityMap.centre, ga = GATE_A;
    const at = (a, r) => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r], tx = -Math.sin(ga), tz = Math.cos(ga);
    const [gx, gz] = at(ga, R), rot = Math.atan2(tx, tz);
    const conc = [0.5, 0.49, 0.46], dark = [0.18, 0.19, 0.2], steel = [0.32, 0.34, 0.36];
    const box = (x, z, w, h, d, y, col, o) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateY(rot); g.translate(x, y + h / 2, z); M.add(g, col, o); };
    for (const sd of [-1, 1]) {
      const x = gx + tx * sd * 19, z = gz + tz * sd * 19;
      box(x, z, 12, 58, 13, -2, conc);
      box(x, z, 12.6, 0.8, 13.6, 56, dark);
      box(x, z, 10, 5, 11, 56.8, [0.56, 0.58, 0.6]);
      box(x, z, 10.2, 1.4, 11.2, 58.6, [0.08, 0.1, 0.12]); // its windows, all round
      for (let y = 8; y < 56; y += 8) box(x - Math.cos(ga) * 6.2, z - Math.sin(ga) * 6.2, 0.5, 0.5, 0.5, y, [1, 0.15, 0.1], { emit: true });
    }
    box(gx, gz, 26, 4, 8, 40, dark); // the bridge
    box(gx, gz, 26, 1, 8.4, 44, steel);
    box(gx + Math.cos(ga) * 3, gz + Math.sin(ga) * 3, 26, 38, 1.6, -2, steel); // the lock doors
    for (let k = -5; k <= 5; k++) box(gx + Math.cos(ga) * 2.1 + tx * k * 2.3, gz + Math.sin(ga) * 2.1 + tz * k * 2.3, 0.4, 38, 0.4, -2, dark);
    box(gx - Math.cos(ga) * 1, gz - Math.sin(ga) * 1, 22, 1.2, 0.3, 36, [1, 0.85, 0.5], { emit: true }); // the floodlight bar
    // a pontoon in front, where the ferry ties up while its cargo is checked
    box(gx - Math.cos(ga) * 14, gz - Math.sin(ga) * 14, 30, 0.6, 6, -0.3, [0.3, 0.28, 0.25]);
    return { x: gx, z: gz };
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
      // (the moving things, people and birds: only drawn when you're near enough to see them)
      const dyn = new THREE.Group(); dyn.name = 'waterfront_life'; group.add(dyn);
      out.group = dyn; out.root = group;
      // the water
      const W = DV.World.sky.userData.dome.material.uniforms;
      const boatsU = [];
      for (let i = 0; i < 6; i++) boatsU.push(new THREE.Vector4(0, 0, 0, 0));
      const mat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { skyTime: { value: 0 }, clouds: { value: 0.55 }, time: { value: 0 }, skyTop: { value: new THREE.Color() }, skyHor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0.4, 0.5, 0.3) }, sunCol: { value: new THREE.Color(1, 1, 1) }, glow: { value: 0.3 }, light: { value: 1 }, boats: { value: boatsU } }]),
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
      { const g = new THREE.BoxGeometry(2 * PIER.hl, 1.2, 2 * PIER.hw); g.rotateY(PIER.face); g.translate(PIER.x, PIER.top - 0.6, PIER.z); M.add(g, [0.34, 0.33, 0.31]); } // (the pier's concrete)
      buildLanding(zone, M);
      out.gate = buildGate(M);
      const wheel = buildWheel(M, {});
      out.ladder = wheel.ladder;
      const wl = new THREE.Mesh(wheel.lights.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
      wl.name = 'wheel_lights'; wl.visible = false; group.add(wl); out.wheelLights = wl;
      const still = new THREE.Mesh(M.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
      still.name = 'jetty';
      group.add(still);
      if (city.walk && city.walk.mats) city.walk.mats.push(still.material);
      // you can walk out on it (and off the end of Lake Street onto it)
      const walk0 = city.walkable.bind(city);
      city.walkable = (x, z) => walk0(x, z) || inR(x, z, LAND, 0.25) || inR(x, z, [WALK[0], WALK[1], WALK[2] + 1, WALK[3]], 0.25) || inR(x, z, PLAT, 0.25) || inR(x, z, [STEPS[0] - 1, STEPS[1], STEPS[2] + 1.5, STEPS[3]], 0.3) || onPier(x, z, 0.6);
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
        root.add(mesh); dyn.add(root);
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
      out.skiff = add('skiff', { drift: { cx: 515, cz: 150, r: 28 } });
      // the ferry, on its timetable: tied up at the landing, out to the Water Gate, back
      out.ferry = add('ferry', { route: ROUTE, phase: 'docked', t: 20, s: 0 });
      out.ferry.x = BERTH[0]; out.ferry.z = BERTH[1]; out.ferry.rot = 0;
      this.ferryFolk(zone, out, dyn);
      zone.interactables.push({ id: 'wf:ferry', kind: 'action', x: LAND[2] - 0.6, y: 1.2, z: BERTH[1], radius: 2.4, name: 'The Amity ferry',
        get label() { const f = out.ferry; return out.ride ? 'Get off' : f.phase === 'docked' ? 'Board (to the Water Gate and back)' : 'The ferry is out (' + (f.phase === 'gate' ? 'at the Water Gate' : 'on the water') + ')'; },
        onUse: () => this.board(out) });
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
      dyn.add(out.gulls.mesh);
      // Walt and Iris, fishing off the end of the jetty
      this.anglers(zone, out, dyn);
      this.fishSpot(zone, out);
      // the climb: the ladder up the wheel
      const lf = out.ladder.foot;
      zone.interactables.push({ id: 'wf:climb', kind: 'action', x: lf[0] - out.ladder.out[0] * 0.6, y: PIER.top + 1.2, z: lf[2] - out.ladder.out[1] * 0.6, radius: 1.8, label: 'Climb', name: 'The Ferris wheel (ladder)', cond: () => !out.climb, onUse: () => this.climb(out) });
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
    // three passengers who come and go with the ferry (more than that and the landing is a crowd)
    ferryFolk(zone, out, group) {
      out.folk = [['amity', 'f'], ['abnegation', 'm'], ['factionless', 'm']].map(([f, sex], i) => {
        const m = DV.Character.create(DV.Character.fromFaction(f, sex, 'ferry:' + i, { age: 24 + i * 17 }));
        m.root.visible = false; group.add(m.root);
        return { m, i, st: 'aboard', x: 0, z: 0, rot: 0 };
      });
      for (const q of out.folk) { out.ferry.root.add(q.m.root); q.m.root.visible = true; const st = out.ferry.info.seats[q.i * 2]; q.m.root.position.set(st[0], 0.62, st[1]); }
    },
    folkStep(out, dt) {
      const f = out.ferry, door = [427.6, 109.8], gang = [LAND[2] - 0.8, BERTH[1]];
      for (const q of out.folk) {
        const m = q.m;
        if (q.st === 'aboard') { m.animate(dt, { speed: 0, action: 'sit', seatY: 0.4 }); m.root.rotation.y = 0; continue; }
        if (q.st === 'gone') continue;
        const goal = q.st === 'off' ? (q.leg ? door : gang) : (q.leg ? gang : door);
        const dx = goal[0] - q.x, dz = goal[1] - q.z, d = Math.hypot(dx, dz);
        if (d < 0.3) {
          if (!q.leg) { q.leg = 1; continue; }
          if (q.st === 'off') { q.st = 'gone'; m.root.visible = false; continue; }
          // aboard again: onto a seat
          q.st = 'aboard'; f.root.add(m.root); const st = f.info.seats[q.i * 2 + 1]; m.root.position.set(st[0], 0.62, st[1]); continue;
        }
        const k = Math.min(d, 1.3 * dt); q.x += dx / d * k; q.z += dz / d * k; q.rot = Math.atan2(dx, dz);
        m.root.position.set(q.x, DECK + 0.01, q.z); m.root.rotation.y = q.rot;
        m.animate(dt, { speed: 1.3, action: 'idle' });
      }
    },
    // on and off the ferry
    board(out) {
      const G = DV.Game, P = DV.Player, f = out.ferry;
      if (out.ride) {
        if (f.phase !== 'docked') { DV.UI.notify('Not out here. Wait until she ties up.'); return; }
        out.ride = null; P.cineAction = null; G.state = 'playing';
        P.place(LAND[2] - 1.6, BERTH[1], -Math.PI / 2); G.rig.follow(true);
        return;
      }
      if (f.phase !== 'docked') { DV.UI.notify('The ferry is out. She runs out to the Water Gate and back; wait on the landing.'); return; }
      out.ride = { seat: f.info.seats[5] };
      G.state = 'cutscene'; DV.Input.clearMovement(); P.cineAction = 'sit';
      DV.UI.notify('Aboard. She sails when the bell goes. E to get off while she\'s tied up.');
    },
    rideStep(out, dt) {
      const G = DV.Game, P = DV.Player, f = out.ferry, st = out.ride.seat, inp = DV.Input;
      const c = Math.cos(f.rot), sn = Math.sin(f.rot); // (the seat, turned with the boat: not its matrix, which only updates when drawn)
      P.x = f.x + st[0] * c + st[1] * sn; P.y = f.root.position.y + 0.62; P.z = f.z - st[0] * sn + st[1] * c; P.rot = f.rot; P.syncModel();
      const hx = Math.sin(f.rot), hz = Math.cos(f.rot);
      out.orbit = (out.orbit || 0) + dt * 0.05;
      const a = Math.sin(out.orbit) * 0.9;
      G.rig.setTrack(new THREE.Vector3(f.x - hx * 16 * Math.cos(a) + hz * 16 * Math.sin(a), 6.5, f.z - hz * 16 * Math.cos(a) - hx * 16 * Math.sin(a)), new THREE.Vector3(f.x + hx * 8, 1.5, f.z + hz * 8), 2.5);
      if (f.phase === 'docked' && inp.consume('KeyE')) this.board(out);
    },
    // up the ladder to the top of the wheel, the way they climbed it in the dark: a puppet on a path
    climb(out) {
      const G = DV.Game, P = DV.Player, L = out.ladder;
      const path = [[L.foot[0] + L.out[0] * 0.45, L.foot[1], L.foot[2] + L.out[1] * 0.45], [L.hub[0] + L.out[0] * 0.45, L.hub[1] - 1.6, L.hub[2] + L.out[1] * 0.45], [L.top[0] + L.out[0] * 0.45, L.top[1] - 1.6, L.top[2] + L.out[1] * 0.45]];
      const segs = []; let total = 0;
      for (let i = 0; i + 1 < path.length; i++) { const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1], path[i + 1][2] - path[i][2]); segs.push(d); total += d; }
      out.climb = { path, segs, total, d: 0, at: 'up', back: [P.x, P.z, P.rot] };
      G.state = 'cutscene'; DV.Input.clearMovement();
      P.cineAction = 'hang'; P.rot = Math.atan2(-L.out[0], -L.out[1]);
      DV.UI.notify('Up the ladder. (Space: climb faster.)');
    },
    climbStep(out, dt) {
      const G = DV.Game, P = DV.Player, c = out.climb, L = out.ladder, inp = DV.Input;
      if (c.at === 'up') {
        c.d = Math.min(c.total, c.d + (inp.down('Space') ? 5 : 2.2) * dt);
        let d = c.d, i = 0;
        while (i < c.segs.length - 1 && d > c.segs[i]) { d -= c.segs[i]; i++; }
        const a = c.path[i], b = c.path[i + 1], k = Math.min(1, d / c.segs[i]);
        P.x = a[0] + (b[0] - a[0]) * k; P.y = a[1] + (b[1] - a[1]) * k; P.z = a[2] + (b[2] - a[2]) * k;
        P.syncModel();
        // the camera: back off the wheel and a little below, looking up the climb
        G.rig.setTrack(new THREE.Vector3(P.x + L.out[0] * 6, P.y - 1.5, P.z + L.out[1] * 6), new THREE.Vector3(P.x, P.y + 1.4, P.z), 4);
        if (c.d >= c.total) {
          c.at = 'top'; c.t = 0;
          DV.Audio.play('windgust', { volume: 0.8 });
          DV.UI.narrate('THE TOP OF THE WHEEL', 3);
          if (out.onTop) out.onTop(c); // (the night game wants to know: js/zones/ctf.js)
          else setTimeout(() => DV.UI.subtitle('', 'The whole city, inside the Fence. The Hub\'s towers. The marsh, grey to the wall. And past the wall, nothing you were ever told about.', 7), 1800);
          const st = DV.State.data;
          if (!DV.State.flag('wheel_climbed')) { DV.State.setFlag('wheel_climbed'); if (DV.Stats) { DV.Stats.addXP(60, 'Climbed the Ferris wheel'); DV.Stats.practice('composure', 2); DV.Stats.practice('athletics', 2); } }
          void st;
        }
      } else {
        // at the top: the view turns slowly round the city; E (or any move) to climb down
        c.t += dt;
        // (the view swings slowly across the city; or, when something down there matters, it looks there)
        if (out.lookAt) {
          // (out past the truss toward it, so the wheel's own beams aren't in the way)
          const L2 = out.lookAt, dx = L2[0] - P.x, dz = L2[2] - P.z, d = Math.hypot(dx, dz) || 1, k = out.lookFrom || 0;
          G.rig.setTrack(new THREE.Vector3(P.x + dx / d * k, P.y + 1.2, P.z + dz / d * k), new THREE.Vector3(L2[0], L2[1], L2[2]), 1.2);
        }
        else { const a = PIER.face + Math.sin(c.t * 0.07) * 1.2; G.rig.setTrack(new THREE.Vector3(P.x - Math.sin(a) * 4, P.y + 2.4, P.z - Math.cos(a) * 4), new THREE.Vector3(P.x + Math.sin(a) * 200, P.y - 46, P.z + Math.cos(a) * 200), 1.5); }
        if (c.t > (out.topMin || 2) && (inp.consume('KeyE') || inp.consume('KeyW') || inp.consume('KeyS') || inp.consume('Space'))) {
          G.state = 'transition';
          DV.UI.fade(1, 600).then(() => {
            P.cineAction = null; P.place(L.foot[0] - L.out[0] * 1.6, L.foot[2] - L.out[1] * 1.6, Math.atan2(-L.out[0], -L.out[1]) + Math.PI);
            G.rig.follow(true); out.climb = null; G.state = 'playing'; DV.UI.fade(0, 700);
            if (out.onDown) out.onDown();
          });
        }
      }
    },
    // the ferry's in: the passengers come off and walk up to the office; the next lot come down
    arrived(out) {
      const f = out.ferry;
      f.root.updateMatrixWorld(true);
      out.folk.forEach((q, i) => {
        if (q.st === 'aboard') {
          const w = new THREE.Vector3(); q.m.root.getWorldPosition(w);
          out.group.add(q.m.root); q.x = w.x; q.z = w.z; q.st = 'off'; q.leg = 0;
          q.m.root.position.set(q.x, DECK, q.z);
        }
        // and a little later, three more (the same three, from the office door) come down to board
        setTimeout(() => { if (q.st === 'gone') { q.st = 'on'; q.leg = 0; q.x = 427.6; q.z = 109.8 + i * 0.6; q.m.root.visible = true; out.group.add(q.m.root); } }, 14000 + i * 3000);
      });
      DV.Audio.play('clank', { x: f.x, z: f.z, range: 60 });
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
      u.sunDir.value.copy(W.sunDir.value); u.sunCol.value.copy(W.sunCol.value); u.glow.value = W.glow.value; u.skyTime.value = W.time.value; u.clouds.value = W.clouds.value;
      const hl = W.horizon.value; u.light.value = U.clamp((hl.r + hl.g + hl.b) / 1.8, 0.2, 1);
      const camRoom = cam && zone.roomAt(cam.position.x, cam.position.z), indoors = !!camRoom && !camRoom.exterior;
      const near = (cam ? cam.position.x > 300 : true) && !indoors; // (nobody in the west of the city, or indoors, can see any of this)
      out.root.visible = !indoors; out.group.visible = near || !!out.ride;
      if (out.climb) this.climbStep(out, dt);
      if (out.ride) this.rideStep(out, dt);
      if (near) this.folkStep(out, dt);
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
        } else if (b.route) {
          // the timetable: tied up, out to the gate, a wait there while the cargo's checked, back
          const R2 = b.route;
          if (!b.len) { b.len = []; b.total = 0; for (let i = 0; i + 1 < R2.length; i++) { const d = Math.hypot(R2[i + 1][0] - R2[i][0], R2[i + 1][1] - R2[i][1]); b.len.push(d); b.total += d; } }
          if (b.phase === 'docked' || b.phase === 'gate') {
            b.t -= dt;
            if (b.t <= 0) {
              b.phase = b.phase === 'docked' ? 'out' : 'back'; b.v = 0;
              DV.Audio.play('horn', { x: b.x, z: b.z, range: 260, volume: 0.6 });
            }
          } else {
            const toGo = b.phase === 'out' ? b.total - b.s : b.s;
            b.v = Math.min(6.5, (b.v || 0) + 0.8 * dt, Math.max(0.6, toGo * 0.35));
            b.s = U.clamp(b.s + (b.phase === 'out' ? 1 : -1) * b.v * dt, 0, b.total);
            if (toGo < 0.2) {
              b.phase = b.phase === 'out' ? 'gate' : 'docked'; b.t = b.phase === 'gate' ? 26 : 48; b.v = 0;
              if (b.phase === 'docked') this.arrived(out);
              else if (out.ride) { DV.UI.narrate('THE WATER GATE', 3); setTimeout(() => DV.UI.subtitle('Deckhand', 'This is as far as anybody goes. The crates go through. We don\'t. Never have.', 6), 1500); }
            }
          }
          let d = b.s, i = 0;
          while (i < b.len.length - 1 && d > b.len[i]) { d -= b.len[i]; i++; }
          const k = U.clamp(d / b.len[i], 0, 1);
          b.x = R2[i][0] + (R2[i + 1][0] - R2[i][0]) * k; b.z = R2[i][1] + (R2[i + 1][1] - R2[i][1]) * k;
          if (b.phase === 'docked') b.rot = U.dampAngle(b.rot, 0, 0.8, dt);
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
          if (sp > 0.2 && !(b.route && b.phase === 'docked')) b.rot = U.dampAngle(b.rot, Math.atan2(vx, vz) + (b.route && b.phase === 'back' ? 0 : 0), 1.5, dt);
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
      out.wheelLights.visible = dark && near && Math.sin(t * 13.1) > -0.97; // (and they flicker)
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

  // the pieces, for the places that have the same pier in them (the night game: js/zones/ctf.js)
  Waterfront.parts = { PIER, WALK, PLAT, STEPS, LAND, DECK, pierXZ, onPier, stepY, inR, buildJetty, buildReeds, buildWheel, buildLanding, mixC };
  DV.Waterfront = Waterfront;
})();
