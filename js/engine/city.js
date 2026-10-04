/* ==========================================================================
   DIVERGENT — the city beyond the fence
   A procedural Chicago-like city that fills the world outside a zone: street
   grid, brick walk-ups and concrete offices near by, glass towers downtown
   around the Hub, ruins and skeleton frames, the elevated L with a train
   that runs past, the dried-up marsh to the east with the old Ferris wheel.

   Everything is generated from a seed into a handful of merged meshes (one
   per facade style, plus one untextured), so the whole city costs about six
   draw calls. A shared shader does:
   - aerial haze: distance fades to the sky colour, thinner higher up, so far
     towers read as pale silhouettes instead of vanishing into fog;
   - cloud shadows: the same drifting noise as the cloud deck above, so the
     shadows you see sliding over the rooftops match the clouds;
   - windows: a few lit at random (more at dusk).
   Low clouds drift between the towers and partly hide their tops.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const CLOUD_SCALE = 560; // metres per tile of the cloud noise
  const WIND = [0.0062, 0.0021]; // cloud drift in noise tiles per second (≈ 3.6 m/s)

  /* ------------------------------ textures ------------------------------ */
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function tex(c, opts) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = (opts && opts.mag) || THREE.NearestFilter;
    t.minFilter = (opts && opts.min) || THREE.NearestMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 2;
    return t;
  }
  function speckle(g, w, h, r, n, a) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = 'rgba(' + (r() < 0.5 ? '0,0,0' : '255,255,255') + ',' + (a * r()).toFixed(3) + ')';
      g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + Math.floor(r() * 2), 1 + Math.floor(r() * 2));
    }
  }
  function streaks(g, w, h, r, n, a) {
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * w), y = Math.floor(r() * h), len = 6 + Math.floor(r() * 30);
      g.fillStyle = 'rgba(20,18,16,' + (a * (0.4 + r() * 0.6)).toFixed(3) + ')';
      g.fillRect(x, y, 1 + Math.floor(r() * 2), len);
    }
  }
  // Each facade tile is 4 bays × 4 floors (64 px per cell). WIN is the window rectangle of a
  // cell in uv space (x0, y0, x1, y1), used by the shader for lit windows.
  const STYLES = {
    office: {
      bay: 3.4, floor: 3.5, lit: 0.07, win: [0, 0.28, 1, 0.69],
      paint(g, r) {
        g.fillStyle = '#8b8b86'; g.fillRect(0, 0, 256, 256);
        speckle(g, 256, 256, r, 2200, 0.16);
        for (let f = 0; f < 4; f++) {
          const y = f * 64;
          g.fillStyle = '#2c3439'; g.fillRect(0, y + 20, 256, 26);
          g.fillStyle = 'rgba(120,140,150,0.25)'; g.fillRect(0, y + 20, 256, 6);
          g.fillStyle = '#55595b';
          for (let x = 0; x < 256; x += 16) g.fillRect(x, y + 20, 2, 26);
          g.fillStyle = '#6c6c68'; g.fillRect(0, y + 60, 256, 4);
        }
        streaks(g, 256, 256, r, 70, 0.18);
      },
    },
    brick: {
      bay: 3.2, floor: 3.2, lit: 0.09, win: [18 / 64, 18 / 64, 46 / 64, 50 / 64],
      paint(g, r) {
        g.fillStyle = '#6e4234'; g.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 4) {
          g.fillStyle = 'rgba(40,24,18,0.45)'; g.fillRect(0, y, 256, 1);
          for (let x = (y / 4) % 2 ? 0 : 6; x < 256; x += 12) g.fillRect(x, y, 1, 4);
        }
        for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(' + (r() < 0.5 ? '150,80,60' : '60,30,24') + ',0.35)'; g.fillRect(Math.floor(r() * 21) * 12, Math.floor(r() * 64) * 4, 11, 3); }
        for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
          const x = b * 64, y = f * 64;
          g.fillStyle = '#a49d90'; g.fillRect(x + 16, y + 10, 32, 4); // lintel
          g.fillStyle = '#d4ccbc'; g.fillRect(x + 18, y + 14, 28, 32); // frame
          g.fillStyle = '#262c30'; g.fillRect(x + 20, y + 16, 24, 28);
          g.fillStyle = '#c8c0b0'; g.fillRect(x + 20, y + 29, 24, 2); // sash
          g.fillStyle = 'rgba(140,160,170,0.22)'; g.fillRect(x + 20, y + 16, 24, 6);
          g.fillStyle = '#9a948a'; g.fillRect(x + 16, y + 46, 32, 3); // sill
        }
        streaks(g, 256, 256, r, 40, 0.15);
      },
    },
    glass: {
      bay: 3.0, floor: 3.7, lit: 0.06, win: [0, 0.14, 1, 1],
      paint(g, r) {
        // steel-blue curtain wall: sky reflected at the top of each floor, darker below
        const sky = g.createLinearGradient(0, 0, 256, 256);
        sky.addColorStop(0, '#5a6670'); sky.addColorStop(1, '#3e4850');
        g.fillStyle = sky; g.fillRect(0, 0, 256, 256);
        for (let f = 0; f < 4; f++) {
          const y = f * 64;
          const grd = g.createLinearGradient(0, y, 0, y + 56);
          grd.addColorStop(0, 'rgba(150,165,175,0.35)'); grd.addColorStop(0.5, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(10,14,18,0.35)');
          g.fillStyle = grd; g.fillRect(0, y, 256, 56);
          g.fillStyle = '#272d32'; g.fillRect(0, y + 56, 256, 8);
          g.fillStyle = '#20252a';
          for (let x = 0; x < 256; x += 16) g.fillRect(x, y, 2, 64);
        }
        // a few panes missing
        for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(12,14,16,0.85)'; g.fillRect(Math.floor(r() * 16) * 16 + 2, Math.floor(r() * 4) * 64, 14, 56); }
      },
    },
    derelict: {
      bay: 3.3, floor: 3.4, lit: 0.015, win: [12 / 64, 20 / 64, 52 / 64, 48 / 64],
      paint(g, r) {
        g.fillStyle = '#76726b'; g.fillRect(0, 0, 256, 256);
        speckle(g, 256, 256, r, 3000, 0.22);
        for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
          const x = b * 64, y = f * 64, k = r();
          g.fillStyle = k < 0.55 ? '#131313' : k < 0.8 ? '#5e4f3d' : '#2b3236';
          g.fillRect(x + 12, y + 16, 40, 28);
          if (k >= 0.55 && k < 0.8) { g.fillStyle = 'rgba(30,20,10,0.6)'; for (let p = 0; p < 4; p++) g.fillRect(x + 12, y + 19 + p * 7, 40, 1); }
          if (r() < 0.3) { g.fillStyle = 'rgba(15,12,10,0.6)'; g.fillRect(x + 12, y + 44, 40 * r(), 14); } // scorch
        }
        g.fillStyle = 'rgba(40,36,30,0.5)';
        for (let f = 0; f < 4; f++) g.fillRect(0, f * 64 + 60, 256, 4);
        streaks(g, 256, 256, r, 140, 0.3);
      },
    },
  };
  const ORDER = ['office', 'brick', 'glass', 'derelict'];

  // tileable value noise → fbm (cloud shadows and the cloud deck share it)
  function noiseTexture(seed) {
    const N = 256, c = canvas(N, N), g = c.getContext('2d');
    const img = g.createImageData(N, N);
    const r = U.rng(seed);
    const lattice = (P) => { const a = new Float32Array(P * P); for (let i = 0; i < a.length; i++) a[i] = r(); return a; };
    const octs = [[4, 0.5], [8, 0.25], [16, 0.13], [32, 0.07], [64, 0.05]].map(([P, w]) => ({ P, w, L: lattice(P) }));
    const sm = (t) => t * t * (3 - 2 * t);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0;
      for (const o of octs) {
        const fx = (x / N) * o.P, fy = (y / N) * o.P;
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0);
        const L = o.L, P = o.P;
        const a = L[(y0 % P) * P + (x0 % P)], b = L[(y0 % P) * P + ((x0 + 1) % P)];
        const cc = L[((y0 + 1) % P) * P + (x0 % P)], d = L[((y0 + 1) % P) * P + ((x0 + 1) % P)];
        v += o.w * ((a + (b - a) * tx) * (1 - ty) + (cc + (d - cc) * tx) * ty);
      }
      const i = (y * N + x) * 4, q = Math.round(U.clamp(v, 0, 1) * 255);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = q;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return tex(c, { mag: THREE.LinearFilter, min: THREE.LinearMipmapLinearFilter });
  }
  // soft cloud puff with alpha (low clouds between the towers)
  function puffTexture(seed) {
    const W = 128, H = 64, c = canvas(W, H), g = c.getContext('2d');
    const img = g.createImageData(W, H);
    const r = U.rng(seed);
    const blobs = [];
    for (let i = 0; i < 14; i++) blobs.push([0.15 + r() * 0.7, 0.35 + r() * 0.35, 0.08 + r() * 0.16]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      let a = 0;
      for (const [bx, by, br] of blobs) {
        const dx = (u - bx) / br, dy = ((v - by) / br) * 0.5;
        a += Math.max(0, 1 - (dx * dx + dy * dy * 4));
      }
      a = U.clamp(a * 0.75, 0, 1) * (1 - Math.pow(Math.abs(u - 0.5) * 2, 3)) * Math.min(1, (1 - v) * 3);
      const i = (y * W + x) * 4;
      const shade = 200 + Math.round(40 * (1 - v));
      img.data[i] = shade; img.data[i + 1] = shade + 2; img.data[i + 2] = shade + 6;
      img.data[i + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }
  function trainTexture() {
    const c = canvas(128, 64), g = c.getContext('2d');
    g.fillStyle = '#9ea4a8'; g.fillRect(0, 0, 128, 64);
    for (let y = 0; y < 64; y += 3) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, y, 128, 1); }
    g.fillStyle = '#4a2a20'; g.fillRect(0, 44, 128, 5); // stripe
    g.fillStyle = '#1e2428';
    for (let x = 6; x < 128; x += 20) g.fillRect(x, 14, 14, 18);
    g.fillStyle = '#5c6266'; g.fillRect(60, 10, 10, 44); // door
    g.fillStyle = 'rgba(160,180,190,0.3)';
    for (let x = 6; x < 128; x += 20) g.fillRect(x, 14, 14, 5);
    g.fillStyle = '#2a2a2a'; g.fillRect(0, 58, 128, 6);
    const t = tex(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  /* ------------------------------ shaders ------------------------------ */
  const VERT = [
    'attribute float aSeed;',
    'varying vec2 vUv; varying vec3 vCol; varying vec3 vWP; varying float vSeed;',
    'void main() {',
    '  vUv = uv; vCol = color; vSeed = aSeed;',
    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
    '  vWP = wp.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}',
  ].join('\n');
  const FRAG = [
    'uniform sampler2D map; uniform sampler2D noise;',
    'uniform vec3 hazeColor; uniform float hazeK; uniform float time; uniform vec2 wind; uniform float cloudScale; uniform float shadowAmt;',
    'uniform vec4 winRect; uniform float litChance; uniform float litAmt; uniform float useMap; uniform vec3 ambient;',
    'varying vec2 vUv; varying vec3 vCol; varying vec3 vWP; varying float vSeed;',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'void main() {',
    '  vec3 c = vCol * ambient;',
    '  if (useMap > 0.5) {',
    '    c *= texture2D(map, vUv * 0.25).rgb;',
    '    vec2 cell = floor(vUv); vec2 f = fract(vUv);',
    '    float win = step(winRect.x, f.x) * step(f.x, winRect.z) * step(winRect.y, f.y) * step(f.y, winRect.w);',
    '    float on = step(1.0 - litChance * (1.0 + litAmt * 2.0), hash(cell + vSeed));',
    '    c = mix(c, vec3(1.0, 0.8, 0.5), win * on * (0.25 + 0.75 * litAmt));',
    '  }',
    '  float n = texture2D(noise, vWP.xz / cloudScale + wind * time).r;',
    '  c *= 1.0 - shadowAmt * smoothstep(0.5, 0.68, n);',
    '  float d = distance(vWP, cameraPosition);',
    '  float h = (1.0 - exp(-d * hazeK)) * (1.0 - 0.2 * clamp(vWP.y / 220.0, 0.0, 1.0));',
    '  gl_FragColor = vec4(mix(c, hazeColor, clamp(h, 0.0, 0.97)), 1.0);',
    '}',
  ].join('\n');
  // the overcast deck: same noise as the shadows, fading into the haze at the horizon
  const DECK_FRAG = [
    'uniform sampler2D noise; uniform vec3 hazeColor; uniform vec3 lightCol; uniform vec3 darkCol; uniform float time; uniform vec2 wind; uniform float cloudScale; uniform float cover;',
    'varying vec2 vUv; varying vec3 vCol; varying vec3 vWP; varying float vSeed;',
    'void main() {',
    '  vec2 p = vWP.xz / cloudScale + wind * time;',
    '  float n = texture2D(noise, p).r * 0.7 + texture2D(noise, p * 2.7 - wind * time * 0.6).r * 0.3;',
    '  float a = smoothstep(0.42 - cover, 0.74 - cover, n);',
    '  vec3 col = mix(lightCol, darkCol, smoothstep(0.5, 0.85, n));',
    '  float d = distance(vWP.xz, cameraPosition.xz);',
    '  col = mix(col, hazeColor, smoothstep(250.0, 900.0, d));',
    '  gl_FragColor = vec4(col, a * (1.0 - smoothstep(700.0, 1000.0, d)) * 0.92);',
    '}',
  ].join('\n');
  // cloud shadows over the zone's own outdoor floors: a multiply pass just above the ground
  const SHADE_FRAG = [
    'uniform sampler2D noise; uniform float time; uniform vec2 wind; uniform float cloudScale; uniform float shadowAmt;',
    'varying vec2 vUv; varying vec3 vCol; varying vec3 vWP; varying float vSeed;',
    'void main() {',
    '  float n = texture2D(noise, vWP.xz / cloudScale + wind * time).r;',
    '  gl_FragColor = vec4(vec3(1.0 - shadowAmt * smoothstep(0.5, 0.68, n)), 1.0);',
    '}',
  ].join('\n');
  const PUFF_VERT = [
    'varying vec2 vUv; varying vec3 vWP;',
    'void main() {',
    '  vUv = uv;',
    '  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);',
    '  vWP = wp.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}',
  ].join('\n');
  const PUFF_FRAG = [
    'uniform sampler2D map; uniform vec3 hazeColor; uniform float hazeK; uniform float opacity; uniform vec3 tint;',
    'varying vec2 vUv; varying vec3 vWP;',
    'void main() {',
    '  vec4 t = texture2D(map, vUv);',
    '  float d = distance(vWP, cameraPosition);',
    '  vec3 c = mix(t.rgb * tint, hazeColor, clamp((1.0 - exp(-d * hazeK)) * 0.8, 0.0, 0.9));',
    '  gl_FragColor = vec4(c, t.a * opacity);',
    '}',
  ].join('\n');

  /* ------------------------------ geometry ------------------------------ */
  // Accumulates quads for one material group.
  class Group {
    constructor() { this.pos = []; this.uv = []; this.col = []; this.seed = []; this.idx = []; }
    get n() { return this.pos.length / 3; }
    // p: 4 points [x,y,z]; uv: 4 [u,v]; c: 4 colours [r,g,b] (or one); want: desired normal
    quad(p, uv, c, want, seed) {
      const ax = p[1][0] - p[0][0], ay = p[1][1] - p[0][1], az = p[1][2] - p[0][2];
      const bx = p[3][0] - p[0][0], by = p[3][1] - p[0][1], bz = p[3][2] - p[0][2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const flip = nx * want[0] + ny * want[1] + nz * want[2] < 0;
      const base = this.n;
      for (let k = 0; k < 4; k++) {
        this.pos.push(p[k][0], p[k][1], p[k][2]);
        this.uv.push(uv ? uv[k][0] : 0, uv ? uv[k][1] : 0);
        const cc = c.length === 4 && Array.isArray(c[0]) ? c[k] : c;
        this.col.push(cc[0], cc[1], cc[2]);
        this.seed.push(seed || 0);
      }
      if (flip) this.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
      else this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    geometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.setAttribute('aSeed', new THREE.Float32BufferAttribute(this.seed, 1));
      g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
      g.computeBoundingSphere();
      return g;
    }
  }

  const SUN = [0.55, 0, -0.83];
  const shadeN = (nx, nz) => 0.74 + 0.26 * (0.5 + 0.5 * (nx * SUN[0] + nz * SUN[2]));
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  /* ------------------------------ the builder ------------------------------ */
  class Builder {
    constructor(seed) {
      this.r = U.rng(seed);
      this.g = { plain: new Group() };
      for (const s of ORDER) this.g[s] = new Group();
    }
    rand(a, b) { return a + (b - a) * this.r(); }
    // a box from y0 to y1; style = facade style or null (plain colour)
    box(cx, cz, w, d, y0, y1, rot, style, tint, seed, o) {
      o = o || {};
      const g = this.g[style || 'plain'];
      const S = style ? STYLES[style] : null;
      const c = Math.cos(rot || 0), s = Math.sin(rot || 0);
      const P = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
      const pts = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
      const lens = [w, d, w, d];
      for (let k = 0; k < 4; k++) {
        const A = pts[k], B = pts[(k + 1) % 4];
        const mx = (A[0] + B[0]) / 2 - cx, mz = (A[1] + B[1]) / 2 - cz;
        const ml = Math.hypot(mx, mz) || 1;
        const nx = mx / ml, nz = mz / ml;
        const sh = shadeN(nx, nz);
        // darker at street level (grime / ambient occlusion)
        const lo = mul(tint, sh * (y0 < 0.5 ? 0.72 : 1)), hi = mul(tint, sh * (y1 > 14 || y0 > 0.5 ? 1.02 : 0.95));
        let uv = null;
        if (S) {
          const u1 = lens[k] / S.bay;
          uv = [[0, y0 / S.floor], [u1, y0 / S.floor], [u1, y1 / S.floor], [0, y1 / S.floor]];
        }
        g.quad([[A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]]], uv, [lo, lo, hi, hi], [nx, 0, nz], seed);
      }
      if (!o.noTop) {
        const top = o.roof || mul(tint, 0.62);
        const rg = this.g.plain;
        rg.quad([[pts[0][0], y1, pts[0][1]], [pts[1][0], y1, pts[1][1]], [pts[2][0], y1, pts[2][1]], [pts[3][0], y1, pts[3][1]]], null, style ? top : mul(tint, 1.06), [0, 1, 0], seed);
      }
    }
    // flat quad on the ground (or at height y)
    flat(x0, z0, x1, z1, y, col) {
      this.g.plain.quad([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], null, col, [0, 1, 0], 0);
    }
    // an n-sided prism (water towers, tanks, pillars)
    prism(cx, cz, r, y0, y1, n, col, cap) {
      const g = this.g.plain;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
        const ax = cx + Math.cos(a0) * r, az = cz + Math.sin(a0) * r, bx = cx + Math.cos(a1) * r, bz = cz + Math.sin(a1) * r;
        const nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
        const sh = shadeN(nx, nz);
        g.quad([[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]], null, mul(col, sh), [nx, 0, nz], 0);
        if (cap) g.quad([[ax, y1, az], [bx, y1, bz], [cx, y1 + cap, cz], [cx, y1 + cap, cz]], null, mul(col, sh * 0.9), [nx, 1, nz], 0);
      }
    }
    meshes(material) {
      const out = [];
      for (const k of ['plain', ...ORDER]) {
        const g = this.g[k];
        if (!g.n) continue;
        const m = new THREE.Mesh(g.geometry(), material(k));
        m.name = 'city_' + k;
        m.frustumCulled = false;
        out.push(m);
      }
      return out;
    }
  }

  /* ------------------------------ city layout ------------------------------ */
  function generate(o) {
    const B = new Builder(o.seed || 7);
    const r = B.r;
    const [cx0, cz0, cx1, cz1] = o.campus;
    const centre = [(cx0 + cx1) / 2, (cz0 + cz1) / 2];
    const R = o.radius || 560;
    const hub = o.hub;
    const marshX = o.marshX || 1e9;
    const keep = o.keepClear || [];
    const inRect = (x, z, q, pad) => x > q[0] - (pad || 0) && x < q[2] + (pad || 0) && z > q[1] - (pad || 0) && z < q[3] + (pad || 0);

    // ground: asphalt, block pads, marsh beyond the city
    B.flat(-R - 400, -R - 400, marshX, R + 400, -0.08, [0.27, 0.27, 0.27]);
    B.flat(marshX, -R - 400, marshX + 1400, R + 400, -0.08, [0.33, 0.32, 0.25]);
    for (let i = 0; i < 40; i++) {
      const x = marshX + 30 + r() * 900, z = -R + r() * R * 2, w = 20 + r() * 120, d = 10 + r() * 50;
      B.flat(x, z, x + w, z + d, -0.06, [0.24, 0.27, 0.27]); // standing water
    }
    // the shore: broken pier pilings along the edge of the marsh
    for (let z = -R; z < R; z += 9 + r() * 14) if (r() < 0.6) B.box(marshX + 6 + r() * 20, z, 0.8, 0.8, -0.1, 1 + r() * 3, 0, null, [0.3, 0.27, 0.22], 0, {});

    // street grid: centre lines, each a number (default width) or [centre, width]
    const SW = o.street || 12;
    const lines = (a) => a.map((v) => (Array.isArray(v) ? v : [v, SW]));
    const xs = lines(o.gridX), zs = lines(o.gridZ);
    const blocks = [];
    for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < zs.length; j++) {
      const b = [xs[i][0] + xs[i][1] / 2, zs[j][0] + zs[j][1] / 2, xs[i + 1][0] - xs[i + 1][1] / 2, zs[j + 1][0] - zs[j + 1][1] / 2];
      blocks.push(b);
    }
    for (const b of blocks) {
      const bx = (b[0] + b[2]) / 2, bz = (b[1] + b[3]) / 2;
      if (Math.hypot(bx - centre[0], bz - centre[1]) > R) continue;
      if (b[0] >= marshX - 10) continue;
      // sidewalk pad
      B.flat(b[0], b[1], Math.min(b[2], marshX - 4), b[3], -0.05, [0.36, 0.36, 0.35]);
      if (inRect(bx, bz, [cx0, cz0, cx1, cz1])) continue; // the zone itself
      if (keep.some((q) => inRect(bx, bz, q))) continue; // vacant lots dressed by the zone
      fillBlock(B, [b[0], b[1], Math.min(b[2], marshX - 6), b[3]], { centre, hub, keep, o });
    }

    // hand-placed buildings (filling the zone's own block around the playable area)
    for (const e of o.extras || []) {
      const tint = e.tint || [1, 1, 1];
      B.box(e.x, e.z, e.w, e.d, 0, e.h, e.rot || 0, e.style || null, tint, e.seed || 0, e.roof ? { roof: e.roof } : {});
      if (e.parapet !== false && e.style && e.style !== 'glass') B.box(e.x, e.z, e.w + 0.5, e.d + 0.5, e.h, e.h + 0.6, e.rot || 0, null, mul(tint, 0.5), 0, {});
      if (e.waterTower) waterTower(B, e.x + e.waterTower[0], e.z + e.waterTower[1], e.h + 0.6);
    }
    if (hub) theHub(B, hub[0], hub[1]);
    if (o.ferris) ferrisWheel(B, o.ferris[0], o.ferris[1], centre);
    if (o.track) elevatedTrack(B, o.track);
    return B;
  }

  function fillBlock(B, b, ctx) {
    const r = B.r;
    const w = b[2] - b[0], d = b[3] - b[1];
    if (w < 8 || d < 8) return;
    // split into lots along the longer side, two rows if deep
    const along = w >= d ? 'x' : 'z';
    const L = along === 'x' ? w : d, D = along === 'x' ? d : w;
    const rows = D > 44 ? 2 : 1;
    for (let row = 0; row < rows; row++) {
      let t = 0;
      while (t < L - 6) {
        const lw = Math.min(L - t, 12 + r() * 22);
        const ld = D / rows;
        let lx, lz, lotW, lotD;
        if (along === 'x') { lx = b[0] + t + lw / 2; lz = b[1] + ld * row + ld / 2; lotW = lw; lotD = ld; }
        else { lz = b[1] + t + lw / 2; lx = b[0] + ld * row + ld / 2; lotW = ld; lotD = lw; }
        t += lw;
        lot(B, lx, lz, lotW, lotD, ctx);
      }
    }
  }

  function lot(B, x, z, w, d, ctx) {
    const r = B.r;
    const { centre, hub } = ctx;
    const dc = Math.hypot(x - centre[0], z - centre[1]);
    const dh = hub ? Math.hypot(x - hub[0], z - hub[1]) : 1e9;
    if (hub && dh < 50) return; // the Hub's plaza
    if (r() < 0.08) { // empty lot: rubble mound
      B.box(x, z, w * 0.6, d * 0.5, -0.05, 0.6 + r() * 1.6, r() * 3, null, [0.36, 0.35, 0.33], 0, {});
      return;
    }
    const seed = Math.floor(r() * 1000);
    const bw = w - 1 - r() * 3, bd = d - 1 - r() * 3;
    const downtown = Math.exp(-Math.pow(dh / 150, 2));
    const far = U.clamp((dc - 90) / 240, 0, 1); // 0 next to the zone → 1 well away from it
    let h, style;
    if (downtown > 0.3 && r() < 0.85) {
      h = 30 + downtown * (50 + r() * 150);
      style = r() < 0.5 ? 'glass' : r() < 0.72 ? 'office' : 'derelict';
    } else {
      h = 8 + r() * 14 + far * r() * 24 + (r() < 0.05 * far ? 25 + r() * 40 : 0);
      style = r() < 0.48 ? 'brick' : r() < 0.6 ? 'office' : 'derelict';
    }
    h = Math.min(h, 16 + far * 320); // the neighbourhood around the zone stays low
    const k = 0.88 + r() * 0.16;
    const tint = [k * (1 + (r() - 0.5) * 0.05), k, k * (1 + (r() - 0.5) * 0.06)];
    const ruined = style === 'derelict' && r() < 0.5;
    const S = STYLES[style];
    h = Math.max(S.floor * 2, Math.round(h / S.floor) * S.floor);
    if (h > 50 && !ruined && r() < 0.6) {
      // setback tower
      const h1 = Math.round((h * (0.45 + r() * 0.2)) / S.floor) * S.floor;
      B.box(x, z, bw, bd, 0, h1, 0, style, tint, seed);
      const w2 = bw * (0.62 + r() * 0.2), d2 = bd * (0.62 + r() * 0.2);
      B.box(x, z, w2, d2, h1, h, 0, style, tint, seed + 7);
      B.box(x, z, w2 * 0.5, d2 * 0.5, h, h + 4, 0, null, [0.3, 0.3, 0.31], 0, {});
      if (r() < 0.5) B.box(x + w2 * 0.2, z, 0.5, 0.5, h + 4, h + 18 + r() * 20, 0, null, [0.25, 0.25, 0.26], 0, {});
      return;
    }
    if (ruined) {
      // the top floors are gone: a jagged break and a skeleton of slabs and columns
      const solid = Math.max(S.floor * 2, Math.round((h * (0.35 + r() * 0.35)) / S.floor) * S.floor);
      B.box(x, z, bw, bd, 0, solid, 0, style, tint, seed, { roof: [0.2, 0.19, 0.18] });
      const frameTop = h;
      const slab = [0.38, 0.37, 0.35];
      // corner columns carry the frame; one corner has sheared off lower
      const cols = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const tops = cols.map((c, i) => (i === Math.floor(r() * 4) ? solid + (frameTop - solid) * (0.3 + r() * 0.3) : frameTop));
      cols.forEach(([kx, kz], i) => B.box(x + kx * (bw / 2 - 0.5), z + kz * (bd / 2 - 0.5), 0.9, 0.9, solid, tops[i], 0, null, slab, 0, {}));
      const lowTop = Math.min(...tops);
      for (let y = solid + S.floor; y <= frameTop; y += S.floor) {
        if (r() < 0.2) continue;
        // above the broken column only part of the slab survives
        const part = y > lowTop ? 0.45 + r() * 0.2 : 1;
        B.box(x + (y > lowTop ? bw * (1 - part) * 0.5 * (tops[0] === lowTop || tops[3] === lowTop ? 1 : -1) : 0), z, bw * part, bd, y - 0.45, y, 0, null, slab, 0, {});
      }
      return;
    }
    B.box(x, z, bw, bd, 0, h, 0, style, tint, seed);
    // cornice / parapet
    if (style === 'brick' || style === 'office') B.box(x, z, bw + 0.6, bd + 0.6, h, h + 0.7, 0, null, mul(tint, style === 'brick' ? 0.48 : 0.55), 0, {});
    // broken roofline on derelicts
    if (style === 'derelict') for (let k = 0; k < 3; k++) B.box(x + (r() - 0.5) * bw * 0.7, z + (r() - 0.5) * bd * 0.7, 1 + r() * 4, 1 + r() * 4, h, h + 1 + r() * 3, 0, null, [0.4, 0.39, 0.37], 0, {});
    // rooftop clutter
    if (style === 'brick' && r() < 0.35) waterTower(B, x + (r() - 0.5) * bw * 0.4, z + (r() - 0.5) * bd * 0.4, h + 0.7);
    if (r() < 0.5) B.box(x + (r() - 0.5) * bw * 0.5, z + (r() - 0.5) * bd * 0.5, 2 + r() * 3, 1.5 + r() * 2, h, h + 1.6, 0, null, [0.42, 0.42, 0.42], 0, {});
    if (style === 'glass' && h > 60) B.box(x, z, 0.5, 0.5, h, h + 14 + r() * 20, 0, null, [0.25, 0.25, 0.26], 0, {});
  }

  function waterTower(B, x, z, y) {
    const legs = [0.33, 0.29, 0.25];
    for (const [kx, kz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.box(x + kx * 1.1, z + kz * 1.1, 0.22, 0.22, y, y + 3.2, 0, null, legs, 0, {});
    B.prism(x, z, 1.7, y + 3.2, y + 6.4, 8, [0.42, 0.33, 0.26], 1.2);
  }

  // the Hub: a bundle of nine black glass tubes stepping up to two antennas
  function theHub(B, x, z) {
    const T = 17;
    const H = [[118, 178, 118], [178, 236, 160], [96, 160, 96]];
    const tint = [0.7, 0.72, 0.76];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const h = H[i][j];
      B.box(x + (i - 1) * T, z + (j - 1) * T, T, T, 0, h, 0, 'glass', tint, 900 + i * 3 + j, { roof: [0.16, 0.16, 0.17] });
      B.box(x + (i - 1) * T, z + (j - 1) * T, T * 0.98, T * 0.98, h - 1.2, h, 0, null, [0.14, 0.14, 0.15], 0, { });
    }
    B.box(x - 4, z, 1.6, 1.6, 236, 236 + 52, 0, null, [0.6, 0.6, 0.6], 0, {});
    B.box(x + 4, z, 1.6, 1.6, 236, 236 + 46, 0, null, [0.6, 0.6, 0.6], 0, {});
    B.box(x, z, 26, 26, 0, 6, 0, null, [0.3, 0.3, 0.3], 0, {}); // podium
  }

  // the Ferris wheel on the old pier, stopped for decades
  function ferrisWheel(B, x, z, centre) {
    const face = Math.atan2(centre[0] - x, centre[1] - z); // wheel plane faces the zone
    const R = 38, cy = 46, n = 40, col = [0.62, 0.6, 0.56];
    const ax = Math.cos(face), az = -Math.sin(face); // axis along the wheel plane (horizontal)
    const P = (a, rr, off) => [x + ax * Math.cos(a) * rr + Math.sin(face) * off, cy + Math.sin(a) * rr, z + az * Math.cos(a) * rr + Math.cos(face) * off];
    const beam = (p, q, t) => {
      // thin square beam from p to q
      const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      // perpendicular offsets: one along the wheel's facing normal, one within the plane
      const nx = Math.sin(face) * t, nz = Math.cos(face) * t;
      const px = (-dy * ax) / len * t, py = (dx * ax + dz * az) / len * t, pz = (-dy * az) / len * t;
      const g = B.g.plain;
      const quadS = (o1, o2, sh) => g.quad([[p[0] + o1[0], p[1] + o1[1], p[2] + o1[2]], [q[0] + o1[0], q[1] + o1[1], q[2] + o1[2]], [q[0] + o2[0], q[1] + o2[1], q[2] + o2[2]], [p[0] + o2[0], p[1] + o2[1], p[2] + o2[2]]], null, mul(col, sh), [o1[0] + o2[0], o1[1] + o2[1], o1[2] + o2[2]], 0);
      const a = [nx, 0, nz], b = [px, py, pz], na = [-nx, 0, -nz], nb = [-px, -py, -pz];
      const add = (u, v) => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
      quadS(add(a, b), add(a, nb), 1.0);
      quadS(add(na, b), add(na, nb), 0.8);
      quadS(add(a, b), add(na, b), 0.95);
      quadS(add(a, nb), add(na, nb), 0.7);
    };
    for (const off of [-1.5, 1.5]) {
      for (let k = 0; k < n; k++) beam(P((k / n) * Math.PI * 2, R, off), P(((k + 1) / n) * Math.PI * 2, R, off), 0.35);
      for (let k = 0; k < 16; k++) beam(P(0, 0, off), P((k / 16) * Math.PI * 2, R, off), 0.18);
    }
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2, p = P(a, R + 0.5, 0);
      B.box(p[0], p[2], 2.4, 2.4, p[1] - 3.2, p[1] - 0.6, face, null, k % 3 === 0 ? [0.45, 0.2, 0.16] : [0.5, 0.48, 0.44], 0, {});
    }
    // A-frame legs and the hub
    for (const off of [-4, 4]) {
      const foot = (s) => [x + ax * s * 22 + Math.sin(face) * off, 0, z + az * s * 22 + Math.cos(face) * off];
      beam(foot(-1), P(0, 0, off), 0.6);
      beam(foot(1), P(0, 0, off), 0.6);
    }
    beam(P(0, 0, -4.5), P(0, 0, 4.5), 1.0);
    B.box(x, z, 60, 22, -0.05, 1.2, face, null, [0.32, 0.31, 0.29], 0, {}); // the pier deck
  }

  // the elevated L: deck on steel bents, running the length of the street
  function elevatedTrack(B, t) {
    const steel = [0.3, 0.29, 0.28], dark = [0.2, 0.2, 0.2];
    const cz = (t.z0 + t.z1) / 2, W = t.z1 - t.z0;
    for (let x = t.x0; x < t.x1; x += 60) {
      const x1 = Math.min(t.x1, x + 60);
      const cx = (x + x1) / 2, len = x1 - x;
      B.box(cx, cz, len, W, t.y - 0.9, t.y, 0, null, steel, 0, {});
      B.box(cx, t.z0 + 0.15, len, 0.3, t.y, t.y + 0.9, 0, null, dark, 0, { noTop: false }); // side girders
      B.box(cx, t.z1 - 0.15, len, 0.3, t.y, t.y + 0.9, 0, null, dark, 0, {});
      for (const rz of [t.z0 + 1.1, t.z0 + 2.2, t.z1 - 2.2, t.z1 - 1.1]) B.box(cx, rz, len, 0.12, t.y, t.y + 0.18, 0, null, [0.42, 0.4, 0.38], 0, {});
    }
    for (let x = t.x0; x <= t.x1; x += t.span || 15) {
      for (const z of [t.z0 + 0.6, t.z1 - 0.6]) B.box(x, z, 0.55, 0.55, 0, t.y - 0.9, 0, null, steel, 0, {});
      B.box(x, cz, 0.6, W, t.y - 1.6, t.y - 0.9, 0, null, steel, 0, {});
    }
  }

  function trainMesh(cars) {
    const g = new Group();
    const L = 14.2, W = 2.9, H = 3.2, gap = 0.7;
    for (let k = 0; k < cars; k++) {
      const x0 = k * (L + gap), x1 = x0 + L;
      const body = [0.92, 0.93, 0.94];
      // sides (textured), ends and roof (plain via uv into the stripe area)
      for (const [z, nz] of [[-W / 2, -1], [W / 2, 1]]) g.quad([[x0, 0.5, z], [x1, 0.5, z], [x1, 0.5 + H, z], [x0, 0.5 + H, z]], [[0, 0], [1, 0], [1, 1], [0, 1]], mul(body, nz < 0 ? 0.85 : 1), [0, 0, nz], 0);
      for (const [x, nx] of [[x0, -1], [x1, 1]]) g.quad([[x, 0.5, -W / 2], [x, 0.5, W / 2], [x, 0.5 + H, W / 2], [x, 0.5 + H, -W / 2]], [[0.02, 0.3], [0.08, 0.3], [0.08, 0.9], [0.02, 0.9]], mul(body, 0.8), [nx, 0, 0], 0);
      g.quad([[x0, 0.5 + H, -W / 2], [x1, 0.5 + H, -W / 2], [x1, 0.5 + H, W / 2], [x0, 0.5 + H, W / 2]], [[0.02, 0.95], [0.08, 0.95], [0.08, 0.99], [0.02, 0.99]], mul(body, 0.72), [0, 1, 0], 0);
      g.quad([[x0 + 1, 0, -W / 2 + 0.2], [x1 - 1, 0, -W / 2 + 0.2], [x1 - 1, 0.5, -W / 2 + 0.2], [x0 + 1, 0.5, -W / 2 + 0.2]], [[0.5, 0.02], [0.6, 0.02], [0.6, 0.06], [0.5, 0.06]], [0.3, 0.3, 0.3], [0, 0, -1], 0);
      g.quad([[x0 + 1, 0, W / 2 - 0.2], [x1 - 1, 0, W / 2 - 0.2], [x1 - 1, 0.5, W / 2 - 0.2], [x0 + 1, 0.5, W / 2 - 0.2]], [[0.5, 0.02], [0.6, 0.02], [0.6, 0.06], [0.5, 0.06]], [0.3, 0.3, 0.3], [0, 0, 1], 0);
    }
    const geo = g.geometry();
    geo.translate(-(cars * (L + gap)) / 2, 0, 0);
    return { geo, length: cars * (L + gap) };
  }

  /* ------------------------------ public ------------------------------ */
  const City = {
    active: null,
    // o: { seed, campus:[x0,z0,x1,z1], gridX:[], gridZ:[], street, radius, hub:[x,z], marshX,
    //      ferris:[x,z], track:{x0,x1,z0,z1,y,span}, keepClear:[[x0,z0,x1,z1]], haze, sky... }
    build(o) {
      const t0 = performance.now();
      const B = generate(o);
      const group = new THREE.Group();
      group.name = 'city';
      group.position.y = o.y || 0; // e.g. the city far below a rooftop
      const noise = noiseTexture(o.seed || 7);
      const hazeColor = new THREE.Color(o.haze || 0x9aa1a7);
      const shared = {
        noise: { value: noise },
        hazeColor: { value: hazeColor },
        hazeK: { value: o.hazeK || 0.0042 },
        time: { value: 0 },
        wind: { value: new THREE.Vector2(WIND[0], WIND[1]) },
        cloudScale: { value: CLOUD_SCALE },
        shadowAmt: { value: o.shadowAmt === undefined ? 0.34 : o.shadowAmt },
        litAmt: { value: o.lit || 0 },
        ambient: { value: new THREE.Color(o.ambient === undefined ? 0xffffff : o.ambient) },
      };
      const maps = {};
      for (const s of ORDER) {
        const c = canvas(256, 256);
        STYLES[s].paint(c.getContext('2d'), U.rng(31 + ORDER.indexOf(s)));
        maps[s] = tex(c);
      }
      const mats = {};
      const material = (k) => {
        const S = STYLES[k];
        const m = new THREE.ShaderMaterial({
          uniforms: Object.assign({}, shared, {
            map: { value: S ? maps[k] : noise },
            useMap: { value: S ? 1 : 0 },
            winRect: { value: new THREE.Vector4(...(S ? S.win : [0, 0, 0, 0])) },
            litChance: { value: S ? S.lit : 0 },
          }),
          vertexShader: VERT,
          fragmentShader: FRAG,
          vertexColors: true,
          fog: false,
        });
        mats[k] = m;
        return m;
      };
      for (const m of B.meshes(material)) group.add(m);

      // the cloud deck overhead (follows the camera)
      const deck = new THREE.Mesh(
        new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(Math.PI / 2),
        new THREE.ShaderMaterial({
          uniforms: Object.assign({}, shared, {
            lightCol: { value: new THREE.Color(o.cloudLight || 0xc9cdd1) },
            darkCol: { value: new THREE.Color(o.cloudDark || 0x7d838a) },
            cover: { value: o.cover === undefined ? 0.06 : o.cover },
          }),
          vertexShader: VERT,
          fragmentShader: DECK_FRAG,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        })
      );
      deck.geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(new Float32Array(4), 1));
      deck.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(12).fill(1), 3));
      deck.position.y = o.deckY || 240;
      deck.renderOrder = -5;
      deck.frustumCulled = false;
      group.add(deck);

      // the same shadows sliding across the playable outdoor floors
      if (o.exterior && o.exterior.length) {
        const sg = new Group();
        for (const [x0, z0, x1, z1] of o.exterior) sg.quad([[x0, 0.02, z0], [x1, 0.02, z0], [x1, 0.02, z1], [x0, 0.02, z1]], null, [1, 1, 1], [0, 1, 0], 0);
        const shade = new THREE.Mesh(sg.geometry(), new THREE.ShaderMaterial({
          uniforms: { noise: shared.noise, time: shared.time, wind: shared.wind, cloudScale: shared.cloudScale, shadowAmt: { value: (o.shadowAmt === undefined ? 0.34 : o.shadowAmt) * 0.8 } },
          vertexShader: VERT,
          fragmentShader: SHADE_FRAG,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          blending: THREE.MultiplyBlending,
          premultipliedAlpha: true,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
          fog: false,
        }));
        shade.renderOrder = 1;
        shade.name = 'city_cloudshade';
        group.add(shade);
      }

      // low clouds drifting between the towers
      const puffs = o.puffs === undefined ? 18 : o.puffs;
      let scud = null;
      const scudState = [];
      if (puffs) {
        const pm = new THREE.ShaderMaterial({
          uniforms: { map: { value: puffTexture((o.seed || 7) + 3) }, hazeColor: shared.hazeColor, hazeK: shared.hazeK, opacity: { value: 0.78 }, tint: { value: new THREE.Color(o.puffTint === undefined ? 0xffffff : o.puffTint) } },
          vertexShader: PUFF_VERT,
          fragmentShader: PUFF_FRAG,
          transparent: true,
          depthWrite: false,
          fog: false,
        });
        scud = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), pm, puffs);
        scud.frustumCulled = false;
        scud.renderOrder = 2;
        const r = U.rng((o.seed || 7) + 11);
        const hub = o.hub || [0, 0];
        const [cx0, cz0, cx1, cz1] = o.campus;
        const cc = [(cx0 + cx1) / 2, (cz0 + cz1) / 2];
        for (let i = 0; i < puffs; i++) {
          // most hang around downtown, a few anywhere on the ring
          const nearHub = i < puffs * 0.6;
          const a = r() * Math.PI * 2, d = nearHub ? r() * 160 : 220 + r() * 260;
          scudState.push({
            x: (nearHub ? hub[0] : cc[0]) + Math.cos(a) * d,
            z: (nearHub ? hub[1] : cc[1]) + Math.sin(a) * d,
            y: nearHub ? 95 + r() * 110 : 70 + r() * 90,
            w: 110 + r() * 160,
            h: 34 + r() * 40,
            speed: 0.7 + r() * 0.6,
          });
        }
        this._m4 = new THREE.Matrix4();
        group.add(scud);
      }

      // the train on the L
      let train = null;
      if (o.track) {
        const tm = trainMesh(o.trainCars || 4);
        const mesh = new THREE.Mesh(tm.geo, new THREE.MeshBasicMaterial({ map: trainTexture(), vertexColors: true, fog: true }));
        mesh.visible = false;
        mesh.frustumCulled = false;
        group.add(mesh);
        train = { mesh, length: tm.length, state: 'wait', t: o.trainFirst === undefined ? 25 : o.trainFirst, x: 0, dir: 1, speed: 13, track: o.track, sound: null, horn: false };
      }

      const inst = {
        group,
        shared,
        deck,
        scud,
        scudState,
        train,
        mats,
        centre: [(o.campus[0] + o.campus[2]) / 2, (o.campus[1] + o.campus[3]) / 2],
        stats: { buildMs: Math.round(performance.now() - t0), tris: B ? Object.keys(B.g).reduce((s, k) => s + B.g[k].idx.length / 3, 0) : 0 },
        update(dt, camera) { City.update(this, dt, camera); },
        // sample how shaded by clouds a point is right now (0 = clear .. 1 = full shadow)
        cloudShadeAt(x, z) { return City.cloudShadeAt(this, x, z); },
      };
      inst.noiseData = readNoise(noise);
      City.active = inst;
      return inst;
    },

    update(inst, dt, camera) {
      const S = inst.shared;
      S.time.value += dt;
      if (camera) {
        inst.deck.position.x = camera.position.x;
        inst.deck.position.z = camera.position.z;
      }
      // low clouds: drift with the wind, wrap around, keep facing the zone
      if (inst.scud) {
        const m = this._m4, c = inst.centre;
        const wl = Math.hypot(WIND[0], WIND[1]), wx = WIND[0] / wl, wz = WIND[1] / wl;
        const q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
        inst.scudState.forEach((st, i) => {
          st.x += wx * st.speed * 3.6 * dt;
          st.z += wz * st.speed * 3.6 * dt;
          const dx = st.x - c[0], dz = st.z - c[1];
          if (Math.hypot(dx, dz) > 560) { st.x = c[0] - dx * 0.9; st.z = c[1] - dz * 0.9; }
          e.set(0, Math.atan2(c[0] - st.x, c[1] - st.z), 0);
          q.setFromEuler(e);
          p.set(st.x, st.y, st.z);
          s.set(st.w, st.h, 1);
          m.compose(p, q, s);
          inst.scud.setMatrixAt(i, m);
        });
        inst.scud.instanceMatrix.needsUpdate = true;
      }
      if (inst.train) this.updateTrain(inst, dt, camera);
    },

    updateTrain(inst, dt, camera) {
      const T = inst.train, tr = T.track;
      if (T.state === 'wait') {
        T.t -= dt;
        if (T.t <= 0) {
          T.state = 'run';
          T.dir = Math.random() < 0.5 ? 1 : -1;
          T.x = T.dir > 0 ? tr.x0 - T.length : tr.x1 + T.length;
          T.speed = 11 + Math.random() * 4;
          T.horn = Math.random() < 0.4;
          T.mesh.visible = true;
          T.mesh.position.set(T.x, tr.y, T.dir > 0 ? tr.z0 + 1.65 : tr.z1 - 1.65);
          T.mesh.rotation.y = 0;
        }
        return;
      }
      T.x += T.dir * T.speed * dt;
      T.mesh.position.x = T.x;
      // sound follows the train (and comes through the walls, muffled, when you're inside)
      if (DV.Audio && DV.Audio.ready && camera) {
        const d = Math.hypot(T.x - camera.position.x, T.mesh.position.z - camera.position.z);
        if (!T.sound && d < 420) T.sound = DV.Audio.mover('train');
        if (T.sound) T.sound.update(T.x, T.mesh.position.z, T.speed);
        if (T.horn && d < 260) { T.horn = false; DV.Audio.play('horn', { bus: 'outdoor', volume: 0.9 }); }
      }
      if ((T.dir > 0 && T.x > tr.x1 + T.length) || (T.dir < 0 && T.x < tr.x0 - T.length)) {
        T.state = 'wait';
        T.t = 55 + Math.random() * 80;
        T.mesh.visible = false;
        if (T.sound) { T.sound.stop(); T.sound = null; }
      }
    },

    cloudShadeAt(inst, x, z) {
      const nd = inst.noiseData;
      if (!nd) return 0;
      const t = inst.shared.time.value;
      let u = x / CLOUD_SCALE + WIND[0] * t, v = z / CLOUD_SCALE + WIND[1] * t;
      u -= Math.floor(u); v -= Math.floor(v);
      // canvas row 0 is the top of the texture (v = 1 with flipY)
      const px = Math.floor(u * 256) % 256, py = Math.floor((1 - v) * 256) % 256;
      const n = nd[(py * 256 + px) * 4] / 255;
      return U.clamp((n - 0.5) / 0.18, 0, 1);
    },

    dispose(inst) {
      if (!inst) return;
      inst.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      if (inst.train && inst.train.sound) inst.train.sound.stop();
      if (City.active === inst) City.active = null;
    },
  };
  function readNoise(t) {
    try {
      const c = t.image;
      return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    } catch (e) {
      return null;
    }
  }
  City.STYLES = STYLES;
  DV.City = City;
})();
