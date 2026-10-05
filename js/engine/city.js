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
  // the Testing Center's own outside: concrete panels, a ribbon of narrow windows on each floor
  STYLES.institution = {
    bay: 3.6, floor: 3.6, lit: 0.02, win: [0.06, 0.52, 0.94, 0.7], noShops: true,
    paint(g, r) {
      g.fillStyle = '#9c9a94'; g.fillRect(0, 0, 256, 256);
      speckle(g, 256, 256, r, 2600, 0.14);
      for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
        const x = b * 64, y = f * 64;
        g.fillStyle = 'rgba(' + (r() < 0.5 ? '255,255,250' : '30,30,28') + ',' + (r() * 0.06).toFixed(3) + ')'; g.fillRect(x, y, 64, 64);
        g.fillStyle = '#22282c'; g.fillRect(x + 4, y + 19, 56, 14); // the window ribbon
        g.fillStyle = 'rgba(150,165,170,0.25)'; g.fillRect(x + 4, y + 19, 56, 4);
        g.fillStyle = '#7f7d77'; g.fillRect(x, y + 33, 64, 2); // sill
      }
      g.fillStyle = '#76746e';
      for (let k = 0; k <= 4; k++) { g.fillRect(k * 64 - 1, 0, 2, 256); g.fillRect(0, k * 64 - 1, 256, 2); g.fillRect(0, k * 64 + 46, 256, 1); }
      streaks(g, 256, 256, r, 90, 0.2);
    },
  };
  // Chicago greystone: pale limestone, tall windows with heavy lintels and sills, rusticated joints
  STYLES.stone = {
    bay: 3.0, floor: 3.4, lit: 0.08, win: [20 / 64, 12 / 64, 44 / 64, 50 / 64],
    paint(g, r) {
      g.fillStyle = '#a49e90'; g.fillRect(0, 0, 256, 256);
      speckle(g, 256, 256, r, 2600, 0.12);
      for (let y = 0; y < 256; y += 16) { g.fillStyle = 'rgba(60,56,50,0.22)'; g.fillRect(0, y, 256, 1); }
      for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
        const x = b * 64, y = f * 64;
        g.fillStyle = '#8a8478'; g.fillRect(x + 16, y + 4, 32, 8); // lintel
        g.fillStyle = '#b8b2a4'; g.fillRect(x + 18, y + 12, 28, 40);
        g.fillStyle = '#23282b'; g.fillRect(x + 20, y + 13, 24, 37);
        g.fillStyle = '#9a9488'; g.fillRect(x + 20, y + 30, 24, 2); // sash
        g.fillStyle = 'rgba(150,165,170,0.2)'; g.fillRect(x + 20, y + 13, 24, 7);
        g.fillStyle = '#7e786c'; g.fillRect(x + 15, y + 50, 34, 4); // sill
      }
      streaks(g, 256, 256, r, 60, 0.18);
    },
  };
  // an industrial loft: dark brick piers between wide steel windows of small panes
  STYLES.loft = {
    bay: 4.2, floor: 4.0, lit: 0.05, win: [6 / 64, 10 / 64, 58 / 64, 48 / 64],
    paint(g, r) {
      g.fillStyle = '#5c3a2e'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 4) { g.fillStyle = 'rgba(30,18,14,0.45)'; g.fillRect(0, y, 256, 1); }
      for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
        const x = b * 64, y = f * 64;
        g.fillStyle = '#3e4246'; g.fillRect(x + 6, y + 10, 52, 38);
        g.fillStyle = '#20262a';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) g.fillRect(x + 8 + i * 12.5, y + 12 + j * 12, 11, 10);
        if (r() < 0.25) { g.fillStyle = 'rgba(160,170,170,0.35)'; g.fillRect(x + 8 + Math.floor(r() * 4) * 12.5, y + 12 + Math.floor(r() * 3) * 12, 11, 10); } // a pane boarded or missing
        g.fillStyle = '#8a7a66'; g.fillRect(x + 4, y + 48, 56, 4); // sill
      }
      streaks(g, 256, 256, r, 90, 0.22);
    },
  };
  // painted signs on the blank side walls above lower roofs: a hundred years of faded adverts
  const GHOST = ['GROCERY', 'FRESH BREAD', 'HOTEL ROSE', 'CITY ICE CO.', 'FURNITURE', 'STAR LAUNDRY', 'DRUGS · SODA', 'THE DAILY'];
  STYLES.ghost = {
    bay: 1, floor: 1, lit: 0, win: [0, 0, 0, 0], noShops: true,
    paint(g, r) {
      // 2 × 4 tiles of 128 × 64: brick, a faded panel, the words
      for (let k = 0; k < 8; k++) {
        const x = (k % 2) * 128, y = Math.floor(k / 2) * 64;
        g.fillStyle = '#6e4234'; g.fillRect(x, y, 128, 64);
        for (let yy = 0; yy < 64; yy += 4) { g.fillStyle = 'rgba(40,24,18,0.4)'; g.fillRect(x, y + yy, 128, 1); }
        const panel = ['#d8d0b8', '#c8b088', '#9aa8a0', '#d0c8b0'][k % 4];
        g.globalAlpha = 0.55 + r() * 0.2;
        g.fillStyle = panel; g.fillRect(x + 6, y + 8, 116, 48);
        g.fillStyle = ['#7a2a20', '#2a3a5a', '#3a4a2a', '#5a3a1a'][k % 4];
        g.font = 'bold ' + (GHOST[k].length > 10 ? 15 : 19) + 'px Georgia, serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(GHOST[k], x + 64, y + 30);
        g.fillRect(x + 20, y + 44, 88, 3);
        g.globalAlpha = 1;
        // weathered: the brick showing through the paint
        for (let i = 0; i < 140; i++) { g.fillStyle = 'rgba(110,66,52,' + (0.3 + r() * 0.5).toFixed(2) + ')'; g.fillRect(x + r() * 128, y + r() * 64, 2 + r() * 5, 1 + r() * 3); }
      }
    },
  };
  // the Fence: poured concrete in 4 m formwork panels, tie holes in rows, pour lines, a hundred
  // years of weather running down it (rust from the ties, black from the top)
  STYLES.bastion = {
    bay: 4, floor: 4.5, lit: 0, win: [0, 0, 0, 0], noShops: true,
    paint(g, r) {
      g.fillStyle = '#6c6a65'; g.fillRect(0, 0, 256, 256);
      speckle(g, 256, 256, r, 3600, 0.13);
      for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
        const x = b * 64, y = f * 64, k = r();
        g.fillStyle = 'rgba(' + (k < 0.5 ? '255,255,250' : '20,20,18') + ',' + (0.03 + r() * 0.05).toFixed(3) + ')'; g.fillRect(x, y, 64, 64);
        g.fillStyle = 'rgba(30,30,28,0.55)'; g.fillRect(x, y, 64, 2); g.fillRect(x, y, 2, 64); // the panel joints
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, y + 31, 64, 1); // a pour line
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
          const hx = x + 12 + i * 20, hy = y + 18 + j * 28;
          g.fillStyle = '#34322f'; g.fillRect(hx, hy, 3, 3); // the tie holes
          if (r() < 0.35) { g.fillStyle = 'rgba(110,60,30,' + (0.2 + r() * 0.3).toFixed(2) + ')'; g.fillRect(hx, hy + 3, 2, 6 + r() * 26); } // rust running from them
        }
      }
      // black streaks running down from the top
      for (let i = 0; i < 70; i++) { const x = Math.floor(r() * 256), len = 30 + r() * 140; g.fillStyle = 'rgba(15,15,14,' + (0.08 + r() * 0.18).toFixed(2) + ')'; g.fillRect(x, 256 - len, 2 + Math.floor(r() * 4), len); }
    },
  };
  const ORDER = ['office', 'brick', 'glass', 'derelict', 'institution', 'stone', 'loft', 'ghost', 'bastion'];

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
    'uniform float street; uniform float shabby;',
    'varying vec2 vUv; varying vec3 vCol; varying vec3 vWP; varying float vSeed;',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'void main() {',
    // (the seed is a whole number per building, but interpolating it across a face can leave it a
    // hair off, which the hash turns into a different window on every pixel: round it)
    '  float back = step(9999.5, vSeed);',
    '  float sd = floor(mod(vSeed, 10000.0) + 0.5);',
    '  vec3 c = vCol * ambient;',
    '  if (useMap > 0.5) {',
    '    vec2 cell = floor(vUv); vec2 f = fract(vUv);',
    '    if (street > 0.5 && back < 0.5 && cell.y < 0.5 && vWP.y > -0.2) {',
    // the ground floor, seen from the pavement: a stone plinth, shop windows or boarded-up
    // ones, a door every few bays, a fascia over them; some shops lit at dusk
    '      float hb = hash(vec2(cell.x, sd)); float hs = hash(vec2(floor(cell.x / 3.0), sd + 7.0));',
    '      vec3 stone = vCol * ambient * 0.62;',
    '      vec3 fascia = mix(vec3(0.22, 0.2, 0.18), vec3(0.42, 0.16, 0.12), step(0.7, hs)) * mix(1.0, 0.6, step(0.4, hs) * step(hs, 0.55));',
    '      fascia = mix(fascia, vec3(0.15, 0.24, 0.3), step(0.85, hs));',
    '      float glassA = step(0.14, f.y) * step(f.y, 0.74) * step(0.07, f.x) * step(f.x, 0.93);',
    '      float doorA = step(hb, 0.22) * step(0.32, f.x) * step(f.x, 0.68) * step(f.y, 0.74);',
    '      float boarded = step(1.0 - shabby, hash(vec2(cell.x * 1.7, sd + 3.0)));',
    '      vec3 glass = mix(vec3(0.09, 0.11, 0.12), vec3(0.2, 0.24, 0.26), smoothstep(0.4, 0.74, f.y));',
    '      vec3 board = vec3(0.4, 0.33, 0.24) * (0.85 + 0.15 * step(0.5, fract(f.x * 6.0)));',
    '      vec3 shut = vec3(0.32, 0.32, 0.31) * (0.8 + 0.2 * step(0.5, fract(f.y * 22.0)));',
    '      vec3 win = mix(glass, mix(shut, board, step(0.5, hb)), boarded);',
    '      float lit = step(0.72, hs) * (1.0 - boarded) * litAmt;',
    '      win = mix(win, vec3(0.95, 0.78, 0.48), lit * 0.85);',
    '      c = stone;',
    '      c = mix(c, fascia, step(0.79, f.y) * step(f.y, 0.95));',
    '      c = mix(c, win * ambient, glassA);',
    '      c = mix(c, vec3(0.17, 0.15, 0.13) * ambient, doorA);',
    '      c *= 0.9 + 0.1 * step(0.03, f.x) * step(f.x, 0.97);',
    '    } else {',
    '    c *= texture2D(map, vUv * 0.25).rgb;',
    '    float win = step(winRect.x, f.x) * step(f.x, winRect.z) * step(winRect.y, f.y) * step(f.y, winRect.w);',
    '    float on = step(1.0 - litChance * (1.0 + litAmt * 2.0), hash(cell + sd));',
    '    c = mix(c, vec3(1.0, 0.8, 0.5), win * on * (0.25 + 0.75 * litAmt));',
    '    }',
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
      // triangles by what they're for (city.stats.parts: where the budget goes)
      this.part = 'other';
      this.parts = {};
    }
    rand(a, b) { return a + (b - a) * this.r(); }
    // a box from y0 to y1; style = facade style or null (plain colour)
    box(cx, cz, w, d, y0, y1, rot, style, tint, seed, o) {
      o = o || {};
      this.parts[this.part] = (this.parts[this.part] || 0) + 8 + (o.noTop ? 0 : 2) + (o.bottom ? 2 : 0);
      const g = this.g[style || 'plain'];
      const S = style ? STYLES[style] : null;
      const c = Math.cos(rot || 0), s = Math.sin(rot || 0);
      const P = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
      const pts = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
      // (QA: everything placed, and by what)
      if (this.audit) { const xs = pts.map((q) => q[0]), zs = pts.map((q) => q[1]); this.audit.push([Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), y0, y1, this.part, o.solid === false ? 0 : 1]); }
      // a walkable city keeps the footprint of everything standing on the ground: the zone
      // turns them into colliders (rotated ones by their bounding box)
      if (this.solids && o.solid !== false && y0 <= 0.3 && y1 - y0 > 0.8) {
        const xs = pts.map((q) => q[0]), zs = pts.map((q) => q[1]);
        this.solids.push([Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), y1]);
      }
      const lens = [w, d, w, d];
      for (let k = 0; k < 4; k++) {
        if (o.noEnds && (k === 0 || k === 2)) continue; // (the faces at its ends, across d: hidden where segments meet)
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
        // (o.shops: the faces that front a street; the rest, backs and party walls, get none)
        const fs = o.shops && !o.shops.some((q) => q[0] * nx + q[1] * nz > 0.7) ? seed + 10000 : seed;
        g.quad([[A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]]], uv, [lo, lo, hi, hi], [nx, 0, nz], fs);
      }
      // seen from below (awnings, landings, bays, cornices): the underside
      if (o.bottom) this.g.plain.quad([[pts[0][0], y0, pts[0][1]], [pts[1][0], y0, pts[1][1]], [pts[2][0], y0, pts[2][1]], [pts[3][0], y0, pts[3][1]]], null, mul(tint, 0.42), [0, -1, 0], 0);
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
      if (this.audit) this.audit.push([cx - r, cz - r, cx + r, cz + r, y0, y1, this.part, 1]);
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
    if (o.audit) B.audit = [];
    const r = B.r;
    const [cx0, cz0, cx1, cz1] = o.campus;
    const centre = o.centre || [(cx0 + cx1) / 2, (cz0 + cz1) / 2];
    const R = o.radius || 560;
    const hub = o.hub;
    const marshX = o.marshX || 1e9;
    const keep = o.keepClear || [];
    const walk = o.walk || null;
    const inRect = (x, z, q, pad) => x > q[0] - (pad || 0) && x < q[2] + (pad || 0) && z > q[1] - (pad || 0) && z < q[3] + (pad || 0);
    if (walk) { B.solids = []; B.pads = []; B.avoid = []; B.signs = []; B.fence = []; B.yards = []; }

    // ground: asphalt, block pads, marsh beyond the city (a walkable city lays its own,
    // textured, ground in build(): see walkGround)
    if (!walk) B.flat(-R - 400, -R - 400, marshX, R + 400, -0.08, o.ground || [0.27, 0.27, 0.27]);
    const MZ = walk ? Math.max(R + 400, walk.fence + 260) : R + 400; // (the marsh runs on to the Fence)
    B.flat(marshX, -MZ, marshX + 1400, MZ, -0.08, [0.33, 0.32, 0.25]);
    for (let i = 0; i < 40; i++) {
      const x = marshX + 30 + r() * 900, z = -R + r() * R * 2, w = 20 + r() * 120, d = 10 + r() * 50;
      B.flat(x, z, x + w, z + d, -0.06, [0.24, 0.27, 0.27]); // standing water
    }
    // the shore: broken pier pilings along the edge of the marsh
    for (let z = -R; z < R; z += 9 + r() * 14) if (r() < 0.6) B.box(marshX + 6 + r() * 20, z, 0.8, 0.8, -0.1, 1 + r() * 3, 0, null, [0.3, 0.27, 0.22], 0, { solid: false });

    // landmarks and homes claim their ground before the blocks fill up
    if (walk) {
      for (const l of walk.landmarks || []) if (l.w) B.avoid.push([l.x - l.w / 2 - 4, l.z - l.d / 2 - 4, l.x + l.w / 2 + 4, l.z + l.d / 2 + 4]);
      for (const f in walk.homes || {}) { const h = walk.homes[f], e = h.kind === 'house' ? 32 : 18; if (!h.gate) B.avoid.push([h.x - e, h.z - e, h.x + e, h.z + e]); }
    }

    // street grid: centre lines, each a number (default width), [centre, width], or
    // { c, w, road: [kerb, kerb] } when the kerbs aren't where the width says (Lake Street)
    const SW = o.street || 12;
    const lines = (a) => a.map((v) => (Array.isArray(v) ? { c: v[0], w: v[1] } : typeof v === 'number' ? { c: v, w: SW } : v));
    const xs = lines(o.gridX), zs = lines(o.gridZ);
    const kerbLo = (L) => (L.road ? L.road[1] : L.c + L.w / 2); // the kerb on the far (+) side of a street
    const kerbHi = (L) => (L.road ? L.road[0] : L.c - L.w / 2); // the kerb on the near (−) side
    const blocks = [];
    for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < zs.length; j++) {
      const b = [xs[i].c + xs[i].w / 2, zs[j].c + zs[j].w / 2, xs[i + 1].c - xs[i + 1].w / 2, zs[j + 1].c - zs[j + 1].w / 2];
      b.pad = [kerbLo(xs[i]), kerbLo(zs[j]), kerbHi(xs[i + 1]), kerbHi(zs[j + 1])];
      blocks.push(b);
    }
    const campus = [cx0, cz0, cx1, cz1];
    for (const b of blocks) {
      const bx = (b[0] + b[2]) / 2, bz = (b[1] + b[3]) / 2;
      if (Math.hypot(bx - centre[0], bz - centre[1]) > R) continue;
      if (b[0] >= marshX - 10) continue;
      const isCampus = inRect(bx, bz, campus);
      if (!walk) {
        // sidewalk pad
        B.flat(b[0], b[1], Math.min(b[2], marshX - 4), b[3], -0.05, o.padColor || [0.36, 0.36, 0.35]);
      } else {
        // the pavement: kerb to kerb around the block (the zone's own grounds keep the old pad
        // under them, and get pavement only where the block reaches past them)
        const pd = [b.pad[0], b.pad[1], Math.min(b.pad[2], marshX - 4), b.pad[3]];
        const dd = districtOf(o, bx, bz);
        if (isCampus) {
          B.flat(Math.max(pd[0], cx0), Math.max(pd[1], cz0), Math.min(pd[2], cx1), Math.min(pd[3], cz1), -0.05, o.padColor || [0.36, 0.36, 0.35]);
          for (const q of rectMinus(pd, campus)) B.pads.push({ r: q, d: dd && dd.d.id, edge: [q[0] <= pd[0], q[1] <= pd[1], q[2] >= pd[2], q[3] >= pd[3]] });
        } else B.pads.push({ r: pd, d: dd && dd.d.id, edge: [true, true, true, true], block: b });
      }
      if (isCampus) continue; // the zone itself
      if (keep.some((q) => inRect(bx, bz, q))) continue; // vacant lots dressed by the zone
      let fb = [b[0], b[1], Math.min(b[2], marshX - 6), b[3]];
      // walking: the buildings stand back from the kerb behind a pavement (never nearer the
      // street than they used to)
      if (walk) {
        const sw = walk.sidewalk || 3;
        fb = [Math.max(fb[0], b.pad[0] + sw), Math.max(fb[1], b.pad[1] + sw), Math.min(fb[2], b.pad[2] - sw), Math.min(fb[3], b.pad[3] - sw)];
      }
      fillBlock(B, fb, { centre, hub, keep, o, block: fb });
    }

    // hand-placed buildings (filling the zone's own block around the playable area)
    B.part = 'extras';
    for (const e of o.extras || []) {
      const tint = e.tint || [1, 1, 1];
      B.box(e.x, e.z, e.w, e.d, 0, e.h, e.rot || 0, e.style || null, tint, e.seed || 0, e.roof ? { roof: e.roof } : {});
      if (e.parapet !== false && e.style && e.style !== 'glass') B.box(e.x, e.z, e.w + 0.5, e.d + 0.5, e.h, e.h + 0.6, e.rot || 0, null, mul(tint, 0.5), 0, {});
      if (e.waterTower) waterTower(B, e.x + e.waterTower[0], e.z + e.waterTower[1], e.h + (e.parapet === false ? 0 : 0.6));
    }
    // and anything else the zone wants standing up there (o.boxes: [{ x, z, w, d, y0, y1, rot, style, tint, roof }])
    for (const b of o.boxes || []) B.box(b.x, b.z, b.w, b.d, b.y0 || 0, b.y1, b.rot || 0, b.style || null, b.tint || [0.5, 0.5, 0.5], b.seed || 0, b.roof ? { roof: b.roof } : {});
    B.part = 'the Hub';
    if (hub && !o.noHubTower) theHub(B, hub[0], hub[1]); // (not when you're standing inside it)
    B.part = 'the Ferris wheel';
    if (o.ferris) ferrisWheel(B, o.ferris[0], o.ferris[1], centre);
    B.part = 'the L';
    if (o.track) elevatedTrack(B, o.track, xs, walk ? walk.sidewalk || 3 : 0);
    B.part = 'other';
    if (walk) {
      for (const l of walk.landmarks || []) if (LANDMARKS[l.id]) { B.part = 'landmark:' + l.id; LANDMARKS[l.id](B, l); }
      for (const f in walk.homes || {}) { B.part = 'home:' + f; homeFor(B, f, walk.homes[f]); }
      B.part = 'other';
      theFence(B, centre, walk, walk.gate, marshX);
      if (walk.edge) farmland(B, centre);
      for (const sg of walk.signs || []) sign(B, sg.x, sg.y, sg.z, sg.rot, sg.w, sg.h, sg.tex);
    }
    return B;
  }

  // a rectangle with another cut out of it: up to four strips
  function rectMinus(a, c) {
    const out = [];
    if (c[2] <= a[0] || c[0] >= a[2] || c[3] <= a[1] || c[1] >= a[3]) return [a];
    if (c[1] > a[1]) out.push([a[0], a[1], a[2], c[1]]);
    if (c[3] < a[3]) out.push([a[0], c[3], a[2], a[3]]);
    const z0 = Math.max(a[1], c[1]), z1 = Math.min(a[3], c[3]);
    if (c[0] > a[0]) out.push([a[0], z0, c[0], z1]);
    if (c[2] < a[2]) out.push([c[2], z0, a[2], z1]);
    return out.filter((q) => q[2] - q[0] > 0.2 && q[3] - q[1] > 0.2);
  }

  // which district (x, z) is in, and how deep inside it (0 at the edge .. 1 at the centre)
  function districtOf(o, x, z) {
    const ds = o.districts;
    if (!ds) return null;
    let best = null, bk = 0;
    for (const d of ds) { const k = 1 - Math.hypot(x - d.c[0], z - d.c[1]) / d.r; if (k > bk) { bk = k; best = d; } }
    return best ? { d: best, k: bk } : null;
  }

  // A block, filled the way a city like this one actually filled up (the logic GTA IV's Liberty
  // City and Mafia's Lost Heaven follow too): a lane down the middle of a deep block (the alley:
  // bins, back stairs, the poles and their wires), lots of a standard width (7.6 m, the old
  // 25-foot lot) fronting the street on each side of it, built right up to the pavement so each
  // side of the street is one continuous wall. Neighbours keep roughly to each other's height;
  // the corners stand taller (the bank, the hotel, the shop with flats over it). Where one
  // building rises over the next, its blank side wall still carries an old painted sign.
  function fillBlock(B, b, ctx) {
    const r = B.r;
    const w = b[2] - b[0], d = b[3] - b[1];
    if (w < 8 || d < 8) return;
    const ax = w >= d ? 'x' : 'z'; // the rows run along the longer side
    const L = ax === 'x' ? w : d, D = ax === 'x' ? d : w;
    const alley = D >= 32 ? 5.5 : 0;
    const rows = alley || D > 26 ? 2 : 1;
    const ld = (D - alley) / rows;
    const bx = (b[0] + b[2]) / 2, bz = (b[1] + b[3]) / 2;
    const big = ctx.hub ? Math.exp(-Math.pow(Math.hypot(bx - ctx.hub[0], bz - ctx.hub[1]) / 150, 2)) : 0;
    for (let row = 0; row < rows; row++) {
      const lots = [];
      for (let t = 0; t < L - 0.5;) {
        const mods = big > 0.3 ? 2 + Math.floor(r() * 4) : 1 + Math.floor(r() * r() * 4);
        let lw = Math.min(L - t, mods * 7.6);
        if (L - t - lw < 7) lw = L - t; // (the last lot takes what's left)
        lots.push([t, lw]);
        t += lw;
      }
      // row 0 faces the street on the low side, row 1 the one on the high side
      const f = row === 0 ? -1 : 1, face = ax === 'x' ? [0, f] : [f, 0];
      const d0 = row === 0 ? (ax === 'x' ? b[1] : b[0]) : (ax === 'x' ? b[3] : b[2]) - ld;
      const placed = [];
      let prev = null;
      lots.forEach(([t0, lw], i) => {
        const a0 = (ax === 'x' ? b[0] : b[1]) + t0;
        const lx = ax === 'x' ? a0 + lw / 2 : d0 + ld / 2, lz = ax === 'x' ? d0 + ld / 2 : a0 + lw / 2;
        const info = { face, axis: ax, corner: i === 0 || i === lots.length - 1, cornerSide: i === 0 ? -1 : i === lots.length - 1 ? 1 : 0, prev, alley: !!alley, through: rows === 1 };
        const res = lot(B, lx, lz, ax === 'x' ? lw : ld, ax === 'x' ? ld : lw, ctx, info);
        prev = res && res.h ? res.h : null;
        placed.push(res);
      });
      // a blank side wall over a lower neighbour: what's left of an old painted sign
      for (let i = 0; i < placed.length; i++) for (const k of [-1, 1]) {
        const A = placed[i], N = placed[i + k];
        if (!A || !A.wall || i + k < 0 || i + k >= placed.length) continue;
        const nh = N ? N.h : 0;
        if (A.h - nh > 7 && r() < 0.5) ghostSign(B, A, k, nh, r);
      }
    }
    if (alley) alleyway(B, b, ax, ld, r, big < 0.3);
  }

  // one lot: a faction sector's own kind of building, an empty lot, or the city's: a walk-up, a
  // loft, an office block or (downtown) a tower, sized to the neighbourhood and its neighbours
  function lot(B, x, z, w, d, ctx, info) {
    info = info || {};
    const r = B.r;
    const { centre, hub } = ctx;
    const dc = Math.hypot(x - centre[0], z - centre[1]);
    const dh = hub ? Math.hypot(x - hub[0], z - hub[1]) : 1e9;
    if (hub && dh < 50) return null; // the Hub's plaza
    if (B.avoid && B.avoid.some((q) => x + w / 2 > q[0] && x - w / 2 < q[2] && z + d / 2 > q[1] && z - d / 2 < q[3])) return null; // a landmark's ground
    // a faction's sector builds its own way (fading out towards its edges)
    const dd = districtOf(ctx.o, x, z);
    if (dd && SECTOR[dd.d.id] && r() < Math.min(1, dd.k * 2.4)) { B.part = 'sector:' + dd.d.id; SECTOR[dd.d.id](B, x, z, w, d, ctx); return null; }
    if (r() < 0.06) { // an empty lot: a rubble mound
      B.box(x, z, w * 0.6, d * 0.5, -0.05, 0.6 + r() * 1.6, r() * 3, null, [0.36, 0.35, 0.33], 0, {});
      return { h: 0 };
    }
    const seed = Math.floor(r() * 1000);
    const downtown = Math.exp(-Math.pow(dh / 150, 2));
    const far = U.clamp((dc - 90) / 240, 0, 1); // 0 next to the zone → 1 well away from it
    let h, type;
    if (downtown > 0.3 && r() < 0.85) { h = 30 + downtown * (50 + r() * 150); type = h > 48 ? 'tower' : 'office'; }
    else {
      h = 9 + r() * 9 + far * r() * 18 + (r() < 0.05 * far ? 25 + r() * 40 : 0);
      type = h > 30 ? 'office' : h > 17 ? (r() < 0.6 ? 'loft' : 'office') : 'walkup';
    }
    h = Math.min(h, 16 + far * 320); // the neighbourhood around the zone stays low
    // a street wall, not a bar chart: close to the neighbour (towers excepted); corners stand taller
    if (info.prev && type !== 'tower') h = U.lerp(info.prev, h, 0.5);
    if (info.corner && type !== 'tower') h = Math.min(h * 1.15 + 3, 16 + far * 320 + 6);
    const q = r();
    const style = type === 'walkup' ? (q < 0.6 ? 'brick' : q < 0.9 ? 'stone' : 'derelict')
      : type === 'loft' ? (q < 0.7 ? 'loft' : 'brick')
      : type === 'office' ? (q < 0.55 ? 'office' : q < 0.85 ? 'stone' : 'derelict')
      : q < 0.6 ? 'glass' : 'office';
    const k = 0.88 + r() * 0.16;
    const tint = [k * (1 + (r() - 0.5) * 0.05), k, k * (1 + (r() - 0.5) * 0.06)];
    const ruined = style === 'derelict' && r() < 0.5;
    // built up to the pavement; a yard behind (on the alley), towers and offices take the whole lot
    let bx = x, bz = z, bw = w - 0.04, bd = d - 0.04;
    if (info.face && type !== 'tower') {
      const [fx, fz] = info.face, depth = (fx ? w : d) - (info.alley ? 0.8 + r() * 2.6 : 0.4 + r() * 1.2);
      if (fx) { bw = depth; bx = x + fx * ((w - depth) / 2); } else { bd = depth; bz = z + fz * ((d - depth) / 2); }
    }
    const hb = building(B, bx, bz, bw, bd, h, style, tint, seed, ruined, Object.assign({ type }, info));
    return { h: hb, x: bx, z: bz, w: bw, d: bd, axis: info.axis, tint, wall: !ruined && type !== 'tower' };
  }

  // one building: a block with its cornice (and a belt course over the shops), bays, awnings,
  // fire escapes, and a roof with things on it; a tower on a podium; or a ruin whose top floors
  // are gone. Returns how tall it came out.
  function building(B, x, z, bw, bd, h, style, tint, seed, ruined, info) {
    info = info || {};
    const r = B.r;
    B.part = 'buildings';
    const S = STYLES[style];
    h = Math.max(S.floor * 2, Math.round(h / S.floor) * S.floor);
    if (h > 48 && !ruined && (info.type === 'tower' || r() < 0.6)) return tower(B, x, z, bw, bd, h, style, tint, seed);
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
      return h;
    }
    // shops on the street front (and round the corner on a corner lot); plain walls behind
    let shops = null;
    if (info.face) {
      shops = [info.face];
      if (info.through) shops.push([-info.face[0], -info.face[1]]); // (a shallow block: a street on both sides)
      if (info.cornerSide) shops.push(info.axis === 'x' ? [info.cornerSide, 0] : [0, info.cornerSide]);
    }
    B.box(x, z, bw, bd, 0, h, 0, style, tint, seed, { shops });
    const masonry = style === 'brick' || style === 'stone' || style === 'loft';
    let top = h;
    B.part = 'cornices';
    if (masonry || style === 'office') {
      // a belt course over the shopfronts, the cornice (and on the old ones a deeper one over it)
      if (h > S.floor * 2.5) B.box(x, z, bw + 0.24, bd + 0.24, S.floor - 0.05, S.floor + 0.28, 0, null, mul(tint, style === 'stone' ? 0.8 : 0.6), 0, { noTop: true });
      B.box(x, z, bw + 0.3, bd + 0.3, h, h + 0.55, 0, null, mul(tint, style === 'brick' || style === 'loft' ? 0.5 : 0.62), 0, {});
      top = h + 0.55;
      if (masonry && r() < 0.5) { B.box(x, z, bw + 0.9, bd + 0.9, h + 0.55, h + 0.85, 0, null, mul(tint, 0.44), 0, { bottom: true }); top = h + 0.85; }
      // a loft's stepped parapet: the middle of the front stands up over the rest
      if (style === 'loft' && info.face && r() < 0.6) {
        const [fx, fz] = info.face, W = fx ? bd : bw;
        B.box(x + fx * (bw / 2 - 0.25), z + fz * (bd / 2 - 0.25), fx ? 0.5 : W * 0.4, fx ? W * 0.4 : 0.5, top, top + 1.6, 0, null, mul(tint, 0.5), 0, {});
      }
    }
    // the broken roofline of a derelict
    if (style === 'derelict') for (let k = 0; k < 3; k++) B.box(x + (r() - 0.5) * bw * 0.7, z + (r() - 0.5) * bd * 0.7, 1 + r() * 4, 1 + r() * 4, h, h + 1 + r() * 3, 0, null, [0.4, 0.39, 0.37], 0, {});
    if (info.face) frontage(B, x, z, bw, bd, h, style, tint, seed, info);
    roofTop(B, x, z, bw, bd, top, h, style);
    return h;
  }

  // the front (and the back, on an alley): bays up a greystone, awnings over the shops, a
  // tenement's fire escape; back porches and stairs down to the alley
  function frontage(B, x, z, bw, bd, h, style, tint, seed, info) {
    const r = B.r, S = STYLES[style], fl = S.floor;
    B.part = 'frontage';
    const [fx, fz] = info.face, W = fx ? bd : bw, D = fx ? bw : bd;
    // a point on the front (side = 1) or the back (side = −1): u along the face, out from it
    const at = (side) => (u, out) => [x + side * fx * (D / 2 + out) + (fx ? 0 : u), z + side * fz * (D / 2 + out) + (fz ? 0 : u)];
    const front = at(1), lo = (a, b) => (fx ? [a, b] : [b, a]); // [w, d] of something a across the face, b deep
    if ((style === 'stone' || style === 'brick') && h <= 26 && W >= 7 && r() < 0.5) {
      const n = W >= 14 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? (r() - 0.5) * (W - 4) * 0.5 : (i ? 1 : -1) * (W / 4);
        const [px, pz] = front(u, 0.35), [sw, sd] = lo(0.7, 3.2);
        B.box(px, pz, sw, sd, fl, h - 0.3, 0, style, tint, seed + 3 + i, { bottom: true });
      }
    }
    if (style !== 'glass' && style !== 'derelict' && r() < 0.45) {
      const cols = [[0.22, 0.3, 0.24], [0.42, 0.16, 0.14], [0.2, 0.22, 0.32], [0.5, 0.42, 0.3], [0.32, 0.29, 0.26], [0.36, 0.3, 0.12]];
      const col = cols[Math.floor(r() * cols.length)], aw = Math.min(W - 1.2, 3 + r() * 4), u = (r() - 0.5) * Math.max(0, W - aw - 1);
      let [px, pz] = front(u, 0.6), [sw, sd] = lo(1.2, aw);
      B.box(px, pz, sw, sd, 2.78, 2.9, 0, null, col, 0, { bottom: true });
      [px, pz] = front(u, 1.18); [sw, sd] = lo(0.06, aw);
      B.box(px, pz, sw, sd, 2.46, 2.9, 0, null, mul(col, 0.8), 0, { noTop: true });
    }
    if ((style === 'brick' || style === 'derelict') && h >= fl * 3 && h <= 22 && r() < 0.15) fireEscape(B, front, fx, W, h, fl, r);
    if (info.alley && (style === 'brick' || style === 'stone' || style === 'loft') && h <= 22 && r() < 0.3) fireEscape(B, at(-1), fx, W, h, fl, r);
  }
  // landings on each floor with a rail, and ladders down between them, zig-zagging
  function fireEscape(B, at, fx, W, h, fl, r) {
    const was = B.part;
    B.part = 'fire escapes';
    const u0 = (r() - 0.5) * Math.max(0, W - 5), ew = 3.4, col = [0.15, 0.15, 0.16];
    const lo = (a, b) => (fx ? [a, b] : [b, a]);
    let n = 0;
    for (let y = fl; y < h - 1; y += fl, n++) {
      let [px, pz] = at(u0, 0.55), [sw, sd] = lo(1.1, ew);
      B.box(px, pz, sw, sd, y - 0.07, y + 0.03, 0, null, col, 0, { bottom: true });
      [px, pz] = at(u0, 1.08); [sw, sd] = lo(0.04, ew);
      B.box(px, pz, sw, sd, y + 0.03, y + 0.95, 0, null, col, 0, { noTop: true });
      if (n > 0) {
        const side = (n % 2 ? 1 : -1) * (ew / 2 - 0.45);
        [px, pz] = at(u0 + side, 0.55); [sw, sd] = lo(0.05, 0.45);
        B.box(px, pz, sw, sd, y - fl + 0.03, y - 0.07, 0, null, col, 0, { noTop: true });
      }
    }
    B.part = was;
  }
  // the roof: the stair's bulkhead, plant, the water tower (half the old roofs have one), chimneys,
  // a loft's skylights, an aerial
  function roofTop(B, x, z, bw, bd, y, h, style) {
    const r = B.r;
    B.part = 'roofs';
    const spot = (k) => [x + (r() - 0.5) * bw * k, z + (r() - 0.5) * bd * k];
    if (bw > 6 && bd > 6 && r() < 0.4) { const [sx, sz] = spot(0.5); B.box(sx, sz, 2.4, 3, y, y + 2.7, 0, null, [0.42, 0.4, 0.38], 0, {}); }
    if ((style === 'brick' && r() < 0.24) || (style === 'loft' && r() < 0.5) || (style === 'stone' && r() < 0.1)) { const [wx, wz] = spot(0.4); waterTower(B, wx, wz, y); }
    const n = style === 'glass' || style === 'office' ? 1 + Math.floor(r() * 2) : r() < 0.35 ? 1 : 0;
    for (let i = 0; i < n; i++) { const [px, pz] = spot(0.6); B.box(px, pz, 1.2 + r() * 2.5, 1 + r() * 2, y, y + 0.9 + r() * 1.2, 0, null, [0.46, 0.46, 0.45], 0, {}); }
    if ((style === 'brick' || style === 'stone') && r() < 0.3) for (let i = 0; i < 1 + Math.floor(r() * 2); i++) B.box(x + (r() < 0.5 ? -1 : 1) * (bw / 2 - 0.7), z + (r() - 0.5) * bd * 0.7, 0.7, 0.9, y - 0.3, y + 1.5, 0, null, [0.45, 0.27, 0.2], 0, {});
    if (style === 'loft') for (let i = 0; i < Math.min(3, Math.floor(bd / 8)); i++) B.box(x, z - bd / 2 + 3.5 + i * 7, bw * 0.5, 1.6, y, y + 0.55, 0, null, [0.3, 0.34, 0.36], 0, {});
    if (r() < 0.15) { const [ax2, az2] = spot(0.7); B.box(ax2, az2, 0.08, 0.08, y, y + 3 + r() * 3, 0, null, [0.25, 0.25, 0.26], 0, {}); }
    void h;
  }
  // downtown: a podium on the street, a tower set back from it, stepping in twice to a crown
  function tower(B, x, z, bw, bd, h, style, tint, seed) {
    const r = B.r, fl = STYLES[style].floor;
    const pod = (3 + Math.floor(r() * 2)) * 3.4;
    B.box(x, z, bw, bd, 0, pod, 0, r() < 0.6 ? 'stone' : 'office', mul(tint, 0.96), seed + 1);
    B.box(x, z, bw + 0.3, bd + 0.3, pod, pod + 0.5, 0, null, mul(tint, 0.55), 0, {});
    const set = 2 + r() * 3;
    const w1 = Math.max(bw * 0.6, bw - set * 2), d1 = Math.max(bd * 0.6, bd - set * 2);
    const h1 = Math.max(pod + fl * 4, Math.round((h * (0.6 + r() * 0.15)) / fl) * fl);
    B.box(x, z, w1, d1, pod + 0.5, h1, 0, style, tint, seed);
    const w2 = w1 * (0.74 + r() * 0.12), d2 = d1 * (0.74 + r() * 0.12), h2 = Math.max(h1 + fl * 2, Math.round((h * (0.86 + r() * 0.06)) / fl) * fl);
    B.box(x, z, w2, d2, h1, h2, 0, style, tint, seed + 7);
    const w3 = w2 * 0.76, d3 = d2 * 0.76;
    B.box(x, z, w3, d3, h2, Math.max(h, h2 + fl), 0, style, tint, seed + 13);
    const top = Math.max(h, h2 + fl);
    B.box(x, z, w3 * 0.6, d3 * 0.6, top, top + 4, 0, null, [0.3, 0.3, 0.31], 0, {});
    if (top > 90 && r() < 0.6) B.box(x + w3 * 0.15, z, 0.6, 0.6, top + 4, top + 18 + r() * 30, 0, null, [0.25, 0.25, 0.26], 0, {});
    return top;
  }
  // an old painted sign on a blank side wall (k: which side, −1/+1 along the row; nh: the
  // neighbour's roof, which it starts just above)
  function ghostSign(B, A, k, nh, r) {
    const along = A.axis, span = along === 'x' ? A.d : A.w;
    const sw = Math.min(span - 2, 12);
    if (sw < 5) return;
    const y0 = nh + 1.2, y1 = Math.min(A.h - 1.2, y0 + sw * 0.5);
    if (y1 - y0 < 2.5) return;
    const t = Math.floor(r() * 8), col = t % 2, row = Math.floor(t / 2);
    const u0 = col * 0.5 * 4, u1 = (col * 0.5 + 0.5) * 4, v0 = (1 - (row + 1) * 0.25) * 4, v1 = (1 - row * 0.25) * 4;
    const tint = mul(A.tint, 0.95);
    let p;
    if (along === 'x') {
      const px = A.x + k * (A.w / 2 + 0.04), c = A.z, a = c + (k > 0 ? 1 : -1) * sw / 2, b = c - (k > 0 ? 1 : -1) * sw / 2;
      p = [[px, y0, a], [px, y0, b], [px, y1, b], [px, y1, a]];
      B.g.ghost.quad(p, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], [tint, tint, tint, tint], [k, 0, 0], 0);
    } else {
      const pz = A.z + k * (A.d / 2 + 0.04), c = A.x, a = c - (k > 0 ? 1 : -1) * sw / 2, b = c + (k > 0 ? 1 : -1) * sw / 2;
      p = [[a, y0, pz], [b, y0, pz], [b, y1, pz], [a, y1, pz]];
      B.g.ghost.quad(p, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], [tint, tint, tint, tint], [0, 0, k], 0);
    }
  }
  // the alley: dumpsters against the back walls, wooden poles carrying the wires down it
  function alleyway(B, b, ax, ld, r, poles) {
    B.part = 'alleys';
    const a0 = ax === 'x' ? b[0] : b[1], a1 = ax === 'x' ? b[2] : b[3];
    const c0 = (ax === 'x' ? b[1] : b[0]) + ld, c1 = c0 + 5.5;
    const P = (s, t) => (ax === 'x' ? [s, t] : [t, s]);
    const bin = [0.17, 0.25, 0.19], wood = [0.27, 0.21, 0.15];
    for (let s = a0 + 6 + r() * 10; s < a1 - 6; s += 16 + r() * 22) {
      const side = r() < 0.5, [x, z] = P(s, side ? c0 + 0.75 : c1 - 0.75);
      const [w, d] = ax === 'x' ? [1.9, 1.2] : [1.2, 1.9];
      B.box(x, z, w, d, 0, 1.3, 0, null, mul(bin, 0.85 + r() * 0.3), 0, {});
    }
    let last = null;
    if (poles) for (let s = a0 + 4; s < a1 - 2; s += 36) {
      const [x, z] = P(s, c0 + 0.35);
      B.box(x, z, 0.26, 0.26, 0, 8.6, 0, null, wood, 0, {});
      B.box(x, z, ax === 'x' ? 0.14 : 1.8, ax === 'x' ? 1.8 : 0.14, 7.9, 8.04, 0, null, wood, 0, { noTop: true });
      // the wire, pole to pole
      if (last !== null) { const [wx, wz] = P((last + s) / 2, c0 + 0.35); B.box(wx, wz, ax === 'x' ? s - last : 0.03, ax === 'x' ? 0.03 : s - last, 7.75, 7.78, 0, null, [0.08, 0.08, 0.08], 0, { noTop: true }); }
      last = s;
    }
  }

  /* ---------------- the faction sectors ---------------- */
  const tintK = (r, k, spread) => { const a = k + (r() - 0.5) * spread; return [a, a, a]; };
  const SECTOR = {
    // Abnegation: rows of small grey houses, all alike, each in its patch of yard, facing the street
    abnegation(B, x, z, w, d, ctx) {
      const r = B.r, b = ctx.block;
      const pitch = 11.5;
      const nx = Math.max(1, Math.floor(w / pitch)), nz = Math.max(1, Math.floor(d / pitch));
      const hw = Math.min(7.2, w / nx - 2.4), hd = Math.min(8.6, d / nz - 2.4);
      if (hw < 4.5 || hd < 4.5) return;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const hx = x - w / 2 + (i + 0.5) * (w / nx), hz = z - d / 2 + (j + 0.5) * (d / nz);
        // the front door faces the nearest street
        const de = [hz - b[1], b[2] - hx, b[3] - hz, hx - b[0]];
        const k = de.indexOf(Math.min(...de));
        const rot = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][k];
        const along = k === 0 || k === 2; // the front runs along x
        house(B, hx, hz, along ? hw : hd, along ? hd : hw, r() < 0.25 ? 6.2 : 3.4, rot, mul([0.62, 0.62, 0.6], 0.92 + r() * 0.1), Math.floor(r() * 1000));
      }
    },
    // the factionless: what's left of the city nobody looks after; most lots burnt out or fallen in
    factionless(B, x, z, w, d) {
      const r = B.r;
      if (r() < 0.28) {
        for (let k = 0; k < 3; k++) B.box(x + (r() - 0.5) * w * 0.5, z + (r() - 0.5) * d * 0.5, w * (0.2 + r() * 0.3), d * (0.2 + r() * 0.3), -0.05, 0.5 + r() * 2.2, r() * 3, null, [0.33, 0.31, 0.29], 0, {});
        return;
      }
      const seed = Math.floor(r() * 1000);
      const bw = w - 1 - r() * 3, bd = d - 1 - r() * 3;
      const style = r() < 0.72 ? 'derelict' : 'brick';
      building(B, x, z, bw, bd, 7 + r() * 22, style, tintK(r, 0.8, 0.1), seed, r() < 0.72);
    },
    // Erudite: glass and clean stone, taller, a little blue
    erudite(B, x, z, w, d) {
      const r = B.r;
      const seed = Math.floor(r() * 1000);
      const bw = w - 1.5 - r() * 2, bd = d - 1.5 - r() * 2;
      const k = 0.95 + r() * 0.08;
      building(B, x, z, bw, bd, 22 + r() * 58, r() < 0.55 ? 'glass' : 'office', [k * 0.94, k * 0.98, k * 1.06], seed, false);
    },
    // Candor: offices in black and white, mid-height, everything squared off
    candor(B, x, z, w, d) {
      const r = B.r;
      const seed = Math.floor(r() * 1000);
      const bw = w - 1 - r() * 2, bd = d - 1 - r() * 2;
      const q = r();
      building(B, x, z, bw, bd, 16 + r() * 36, q < 0.55 ? 'office' : q < 0.8 ? 'brick' : 'glass', tintK(r, q < 0.5 ? 1.02 : 0.78, 0.06), seed, false);
    },
    // Dauntless: the old industrial edge by the tracks: warehouses, loading docks, rust
    dauntless(B, x, z, w, d) {
      const r = B.r;
      const seed = Math.floor(r() * 1000);
      const bw = w - 1 - r() * 2, bd = d - 1 - r() * 2;
      if (r() < 0.5) {
        // a warehouse: wide and low, a sawtooth of roof lights
        const h = 7 + r() * 5;
        B.box(x, z, bw, bd, 0, h, 0, r() < 0.5 ? 'derelict' : 'office', tintK(r, 0.78, 0.08), seed);
        for (let k = 0; k < Math.floor(bd / 6); k++) B.box(x, z - bd / 2 + 3 + k * 6, bw * 0.9, 1.2, h, h + 1.4, 0, null, [0.28, 0.29, 0.3], 0, {});
        return;
      }
      building(B, x, z, bw, bd, 9 + r() * 22, r() < 0.55 ? 'brick' : 'derelict', tintK(r, 0.82, 0.1), seed, r() < 0.3);
    },
  };

  // a small house: plain walls, a gabled roof, a door and windows on the front (+z local)
  function house(B, x, z, w, d, h, rot, col, seed) {
    B.box(x, z, w, d, 0, h, rot, null, col, seed, { noTop: true });
    gable(B, x, z, w, d, h, 1.9, rot, mul(col, 0.52), col, seed);
    const c = Math.cos(rot), s = Math.sin(rot);
    const P = (lx, ly, lz) => [x + lx * c + lz * s, ly, z - lx * s + lz * c];
    const g = B.g.plain, fz = d / 2 + 0.03, n = [s, 0, c];
    const q = (x0, y0, x1, y1, cc) => g.quad([P(x0, y0, fz), P(x1, y0, fz), P(x1, y1, fz), P(x0, y1, fz)], null, cc, n, seed);
    q(-0.5, 0, 0.5, 2.1, [0.3, 0.29, 0.27]); // the door
    q(-0.75, 2.1, 0.75, 2.25, mul(col, 0.7)); // its lintel
    const win = [0.13, 0.15, 0.17];
    for (const y of h > 5 ? [1.0, 3.9] : [1.0]) { q(-w / 2 + 0.8, y, -w / 2 + 1.9, y + 1.2, win); q(w / 2 - 1.9, y, w / 2 - 0.8, y + 1.2, win); }
    // windows down the sides
    for (const sx of [-1, 1]) {
      const nx = [sx * c, 0, -sx * s], wx = sx * (w / 2 + 0.03);
      for (const lz of [-d / 4, d / 4]) g.quad([P(wx, 1.0, lz - 0.55), P(wx, 1.0, lz + 0.55), P(wx, 2.2, lz + 0.55), P(wx, 2.2, lz - 0.55)], null, win, nx, seed);
    }
    // a step up to the door, and the yard round the house (bare earth and tired grass)
    B.box(x + s * (d / 2 + 0.4), z + c * (d / 2 + 0.4), 1.6, 0.8, 0, 0.16, rot, null, [0.5, 0.5, 0.48], 0, { solid: false });
    if (B.yards) B.yards.push([x, z, w + 3.4, d + 3.4, rot]);
  }
  // a gabled roof over a w × d box whose walls top out at y; the ridge runs front to back
  function gable(B, x, z, w, d, y, rh, rot, roofCol, wallCol, seed) {
    const g = B.g.plain, c = Math.cos(rot), s = Math.sin(rot);
    const P = (lx, ly, lz) => [x + lx * c + lz * s, ly, z - lx * s + lz * c];
    const N = (lx, ly, lz) => [lx * c + lz * s, ly, -lx * s + lz * c];
    const ov = 0.35, hw = w / 2 + ov, hd = d / 2 + ov;
    const sl = Math.atan2(rh, w / 2);
    g.quad([P(-hw, y - 0.1, -hd), P(0, y + rh, -hd), P(0, y + rh, hd), P(-hw, y - 0.1, hd)], null, mul(roofCol, 0.92), N(-Math.sin(sl), Math.cos(sl), 0), seed);
    g.quad([P(hw, y - 0.1, hd), P(0, y + rh, hd), P(0, y + rh, -hd), P(hw, y - 0.1, -hd)], null, mul(roofCol, 1.1), N(Math.sin(sl), Math.cos(sl), 0), seed);
    for (const sz of [1, -1]) {
      const zz = sz * d / 2;
      const nn = N(0, 0, sz); // shaded like the wall below it
      g.quad([P(-w / 2, y, zz), P(w / 2, y, zz), P(0, y + rh * 0.95, zz), P(0, y + rh * 0.95, zz)], null, mul(wallCol, shadeN(nn[0], nn[2]) * 0.95), nn, seed);
    }
  }

  /* ---------------- landmarks (a walkable city only) ---------------- */
  // a sign: a textured quad the build turns into its own little mesh (faction emblems, names)
  //   at: centre [x, y, z]; rot: facing (+z local); w, h; tex: () => THREE.Texture
  function sign(B, x, y, z, rot, w, h, tex, emit) { B.signs.push({ x, y, z, rot, w, h, tex, emit: !!emit }); }
  // a few indexed planes as one geometry (positions, normals, uvs; indices offset)
  function mergePlanes(geos) {
    const P = [], N = [], T = [], I = [];
    let base = 0;
    for (const g of geos) {
      P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array); T.push(...g.attributes.uv.array);
      for (const i of g.index.array) I.push(i + base);
      base += g.attributes.position.count;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    m.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    m.setAttribute('uv', new THREE.Float32BufferAttribute(T, 2));
    m.setIndex(I);
    return m;
  }
  const ORDER_BANNER = () => DV.Tex.banner('erudite'); // (one picture, so the station's banners are one mesh)
  const LANDMARKS = {
    // Amity's headquarters out on the farms: a long meeting hall of warm timber, the great
    // greenhouse, cabins round a green with an old oak in the middle, and an arch over the road in
    // with its name on (it faces the city)
    amity(B, l) {
      const { x, z, w, d } = l, wood = [0.64, 0.47, 0.31], rot = Math.PI / 2; // (the front: +x)
      house(B, x - 14, z, 30, 13, 6.5, rot, wood, 811);
      house(B, x - 16, z + d / 2 - 10, 34, 13, 5, rot, [0.7, 0.8, 0.76], 812); // the greenhouse
      house(B, x - 16, z - d / 2 + 10, 26, 11, 4.6, rot, mul(wood, 0.92), 813);
      for (let i = 0; i < 6; i++) {
        const a = -1.1 + (i / 5) * 2.2, cx = x + 12 + Math.cos(a) * 15, cz = z + Math.sin(a) * 20;
        house(B, cx, cz, 6, 5.4, 3, Math.atan2(x + 12 - cx, z - cz), mul(wood, 0.9 + (i % 3) * 0.05), 820 + i);
      }
      // the oak on the green, where they meet
      B.box(x + 12, z, 1.1, 1.1, 0, 7, 0, null, [0.3, 0.22, 0.15], 0, {});
      B.prism(x + 12, z, 7.5, 5.5, 11.5, 9, [0.3, 0.44, 0.2], 3.4);
      // the arch over the road in
      for (const sd of [-1, 1]) B.box(x + w / 2 + 2, z + sd * 4.2, 0.5, 0.5, 0, 5.4, 0, null, wood, 0, {});
      B.box(x + w / 2 + 2, z, 0.6, 9.4, 5.4, 6.2, 0, null, mul(wood, 0.8), 0, {});
      sign(B, x + w / 2 + 2.32, 4.6, z, Math.PI / 2, 4.4, 1.0, () => DV.Tex.sign('AMITY', { w: 256, h: 64, bg: '#5a3e24', color: '#f0e0b0', size: 34 }));
      sign(B, x - 14 + 6.6, 4.4, z, Math.PI / 2, 3, 3, () => DV.Tex.emblem('amity', '#f0d890', '#4a3a24', 256));
    },
    // Merciless Mart: Candor's headquarters, a dark block with the scales over the doors
    merciless_mart(B, l) {
      const { x, z, w, d } = l;
      const f = l.face || -1, fr = f > 0 ? 0 : Math.PI; // the front: +z (1) or −z (−1)
      B.box(x, z, w, d, 0, 30.8, 0, 'office', [0.5, 0.5, 0.52], 701);
      B.box(x, z, w + 0.8, d + 0.8, 30.8, 31.6, 0, null, [0.2, 0.2, 0.21], 0, {});
      B.box(x, z, w * 0.6, d * 0.6, 31.6, 44, 0, 'office', [0.46, 0.46, 0.48], 702);
      // the entrance: a deep black portico, and the scales above it
      B.box(x, z + f * (d / 2 + 2), 18, 4, 5.6, 6.4, 0, null, [0.08, 0.08, 0.09], 0, { solid: false });
      for (const k of [-8, -2.7, 2.7, 8]) B.box(x + k, z + f * (d / 2 + 3.6), 0.7, 0.7, 0, 5.6, 0, null, [0.85, 0.85, 0.82], 0, {});
      sign(B, x, 15, z + f * (d / 2 + 0.06), fr, 13, 13, () => DV.Tex.emblem('candor', '#f2f0ea', '#151515', 256));
      sign(B, x, 7.6, z + f * (d / 2 + 4.06), fr, 16, 1.6, () => DV.Tex.sign('MERCILESS MART', { w: 512, h: 52, bg: '#101010', color: '#f2f0ea', size: 34, border: false }));
    },
    // Erudite Headquarters: the old library: stone, a colonnade, a pediment, blue glass behind
    erudite_hq(B, l) {
      const { x, z, w, d } = l;
      const f = l.face || -1, fr = f > 0 ? 0 : Math.PI;
      const stone = [0.86, 0.84, 0.8];
      B.box(x, z - f * 4, w, d - 8, 0, 17.6, 0, 'office', stone, 703);
      B.box(x, z - f * 4, w + 0.8, d - 7.2, 17.6, 18.6, 0, null, mul(stone, 0.75), 0, {});
      B.box(x, z + f * (d / 2 - 3), w - 6, 6, 0, 1.2, 0, null, mul(stone, 0.9), 0, {}); // the steps
      for (let k = 0; k < 10; k++) B.prism(x - w / 2 + 5 + k * ((w - 10) / 9), z + f * (d / 2 - 1.2), 0.7, 1.2, 14.4, 8, mul(stone, 1.02), 0);
      B.box(x, z + f * (d / 2 - 1.2), w - 6, 3, 14.4, 16.2, 0, null, mul(stone, 0.96), 0, { solid: false });
      gable(B, x, z + f * (d / 2 - 1.2), w - 6, 3, 16.2, 3.6, 0, mul(stone, 0.7), mul(stone, 0.95), 0);
      B.box(x + w * 0.22, z - f * d * 0.2, w * 0.4, d * 0.4, 18.6, 72, 0, 'glass', [0.8, 0.88, 1.0], 704);
      sign(B, x, 17.9, z + f * (d / 2 + 0.36), fr, 8, 8, () => DV.Tex.emblem('erudite', '#dfe8f2', '#1f3d68', 256));
      sign(B, x, 13.6, z + f * (d / 2 + 0.36), fr, 22, 1.5, () => DV.Tex.sign('ERUDITE HEADQUARTERS', { w: 512, h: 36, bg: '#cfcac0', color: '#1f3d68', size: 26, border: false }));
    },
    // the Abnegation council hall: a plain grey meeting house; nothing on it but the emblem
    abnegation_hall(B, l) {
      const { x, z, w, d } = l;
      const grey = [0.64, 0.64, 0.62];
      B.box(x, z, w, d, 0, 7.4, 0, null, grey, 705, { noTop: true });
      gable(B, x, z, d, w, 7.4, 4.2, Math.PI / 2, mul(grey, 0.5), grey, 0);
      const g = B.g.plain, dark = [0.14, 0.15, 0.16];
      for (let k = 0; k < 6; k++) { const wx = x - w / 2 + 3 + k * ((w - 6) / 5); g.quad([[wx - 0.7, 1.6, z + d / 2 + 0.03], [wx + 0.7, 1.6, z + d / 2 + 0.03], [wx + 0.7, 4.4, z + d / 2 + 0.03], [wx - 0.7, 4.4, z + d / 2 + 0.03]], null, dark, [0, 0, 1], 0); }
      g.quad([[x - 1.4, 0, z + d / 2 + 0.04], [x + 1.4, 0, z + d / 2 + 0.04], [x + 1.4, 3.2, z + d / 2 + 0.04], [x - 1.4, 3.2, z + d / 2 + 0.04]], null, [0.32, 0.3, 0.27], [0, 0, 1], 0);
      sign(B, x, 5.6, z + d / 2 + 0.06, 0, 2.6, 2.6, () => DV.Tex.emblem('abnegation', '#d8d4c8', '#5a5a56', 256));
    },
    // the Dauntless compound: a glass building over the Pit; a hole in a roof next door
    dauntless_compound(B, l) {
      // the glass front of the compound, and against its west wall the old block whose roof they
      // jump from (inside the block: State Street runs past it, not under it)
      const { x, z, w, d } = l, R = 8, gx = x + R / 2, gw = w - R;
      B.box(gx, z, gw, d, 0, 11.1, 0, 'glass', [0.55, 0.55, 0.58], 706, { roof: [0.12, 0.12, 0.13] });
      B.box(gx, z, gw + 0.6, d + 0.6, 11.1, 11.8, 0, null, [0.14, 0.14, 0.15], 0, {});
      B.box(x - w / 2 + R / 2, z, R, d, 0, 18, 0, 'derelict', [0.6, 0.58, 0.56], 707);
      sign(B, gx, 8.5, z + d / 2 + 0.06, 0, 6, 6, () => DV.Tex.emblem('dauntless', '#e8502a', '#151515', 256));
    },
    // the Order Station: Erudite's police. A four-storey concrete office block with a
    // band of blue glass, a glass porch under a canopy with PUBLIC ORDER on it, Erudite banners, a
    // radio mast and a drone pad on the roof; the motor pool behind a fence on the east (the vans,
    // the guards and the drones are js/game/order.js's), the drone shed on the west
    order_station(B, l) {
      const { x, z, w, d } = l;
      const f = l.face || 1, fr = f > 0 ? 0 : Math.PI;
      const conc = [0.8, 0.8, 0.82], blue = [0.42, 0.58, 0.86], dark = [0.16, 0.17, 0.19];
      const front = z + f * (d / 2), mz = z - f * 3.5, md = 24, mw = 34, H = 14.4;
      // the block, its cornice, and the glass band across the top floor
      B.box(x - 1, mz, mw, md, 0, H, 0, 'office', conc, 731);
      B.box(x - 1, mz, mw + 0.6, md + 0.6, H, H + 0.7, 0, null, mul(conc, 0.6), 0, {});
      B.box(x - 1, mz + f * (md / 2 + 0.05), mw, 0.3, H - 3.4, H - 0.3, 0, 'glass', blue, 732, { solid: false });
      B.box(x - 1, mz + f * (md / 2 + 0.25), mw + 0.4, 0.5, H - 3.6, H - 3.4, 0, null, dark, 0, { solid: false, bottom: true });
      // the porch: blue glass, a deep canopy on two piers, steps up to it
      const pz = mz + f * (md / 2 + 1.6);
      B.box(x - 1, pz, 12, 3.2, 0, 4.4, 0, 'glass', mul(blue, 1.05), 733);
      B.box(x - 1, pz + f * 2.4, 16, 5.2, 4.4, 5.0, 0, null, dark, 0, { solid: false, bottom: true });
      for (const sd of [-1, 1]) B.box(x - 1 + sd * 7.4, pz + f * 4.4, 0.7, 0.7, 0, 4.4, 0, null, mul(conc, 0.9), 0, {});
      B.box(x - 1, pz + f * 3.0, 9, 2.2, 0, 0.18, 0, null, mul(conc, 0.85), 0, { solid: false });
      // the forecourt: a stripe of blue paving to the door, concrete planters each side
      B.flat(x - 2.4, Math.min(pz + f * 4.1, front), x + 0.4, Math.max(pz + f * 4.1, front), 0.01, [0.3, 0.38, 0.52]);
      for (const sd of [-1, 1]) B.box(x - 1 + sd * 12.5, front - f * 3, 5, 1.6, 0, 0.9, 0, null, mul(conc, 0.85), 0, {});
      // the banners down the front, either side of the porch, and the flagpoles at the kerb
      const banner = ORDER_BANNER;
      for (const sd of [-1, 1]) {
        sign(B, x - 1 + sd * 11, 9.4, mz + f * (md / 2 + 0.08), fr, 2.2, 5.6, banner);
        B.box(x - 1 + sd * 16, front - f * 1.2, 0.2, 0.2, 0, 9, 0, null, [0.7, 0.7, 0.72], 0, {});
        sign(B, x - 1 + sd * 16 + 0.7, 7.6, front - f * 1.2, fr + Math.PI / 2, 1.3, 2.4, banner);
      }
      sign(B, x - 1, 7.3, mz + f * (md / 2 + 0.07), fr, 3.4, 3.4, () => DV.Tex.emblem('erudite', '#dfe8f2', '#1f3d68', 256));
      sign(B, x - 1, 4.72, pz + f * 5.03, fr, 12, 0.56, () => DV.Tex.sign('PUBLIC ORDER  ·  SECTOR ONE', { w: 512, h: 28, bg: '#14181e', color: '#cfe0f8', size: 20, border: false }), true);
      // the notice board by the door: the curfew, in the Erudite way
      sign(B, x - 1 + 4.4, 1.9, pz + f * 1.7, fr, 1.6, 1.1, () => DV.Tex.sign('CURFEW\n22:00–06:00', { w: 128, h: 88, bg: '#1f3d68', color: '#eef3fa', size: 22 }));
      // on the roof: the radio mast, the drone pad, the plant
      const ry = H + 0.7, rx0 = x - 1 + mw / 2 - 4, rz0 = mz - f * (md / 2 - 4);
      B.box(rx0, rz0, 2.4, 2.4, ry, ry + 1.4, 0, null, dark, 0, {});
      for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) B.box(rx0 + dx, rz0 + dz, 0.14, 0.14, ry + 1.4, ry + 16, 0, null, [0.55, 0.55, 0.58], 0, {});
      for (let k = 0; k < 6; k++) B.box(rx0, rz0, 1.1, 1.1, ry + 3 + k * 2.2, ry + 3.12 + k * 2.2, 0, null, [0.5, 0.5, 0.53], 0, { solid: false });
      const pad = [x - 6, mz + f * 2], pr = 4.2;
      B.flat(pad[0] - pr, pad[1] - pr, pad[0] + pr, pad[1] + pr, ry + 0.02, [0.18, 0.2, 0.24]);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, cx = pad[0] + Math.cos(a) * (pr - 0.7), cz = pad[1] + Math.sin(a) * (pr - 0.7);
        B.flat(cx - 0.32, cz - 0.32, cx + 0.32, cz + 0.32, ry + 0.04, [0.32, 0.5, 0.9]);
      }
      B.box(x + 8, mz - f * 3, 5, 3.4, ry, ry + 1.8, 0, null, [0.46, 0.46, 0.48], 0, {});
      B.box(x - 15, mz - f * 6, 3, 3, ry, ry + 2.6, 0, null, mul(conc, 0.7), 0, {});
      // the drone shed on the west: a low block with a wide roller door onto the forecourt
      const sx = x - w / 2 + 4.5;
      B.box(sx, z - f * 2, 8, 22, 0, 5.2, 0, 'office', mul(conc, 0.95), 734);
      B.box(sx, z - f * 2 + f * 11.05, 6, 0.1, 0, 3.8, 0, null, [0.26, 0.28, 0.3], 0, { solid: false });
      // the motor pool on the east: a concrete barrier wall with steel rails on posts above it, a
      // gatehouse, a striped barrier arm
      const px0 = x + w / 2 - 9.5, px1 = x + w / 2 - 0.4, pz0 = z - d / 2 + 0.8, pz1 = front - 0.6;
      for (const [ax, az, bx, bz] of [[px0, pz0, px1, pz0], [px1, pz0, px1, pz1], [px0, pz0, px0, pz1 - 7]]) {
        const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 3));
        const cx = (ax + bx) / 2, cz = (az + bz) / 2, lw = Math.max(0.5, Math.abs(bx - ax)), ld = Math.max(0.5, Math.abs(bz - az));
        B.box(cx, cz, lw, ld, 0, 1.0, 0, null, mul(conc, 0.78), 0, {});
        for (let k = 0; k <= n; k++) B.box(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, 0.12, 0.12, 1.0, 2.7, 0, null, [0.5, 0.5, 0.52], 0, { solid: false });
        for (const ry0 of [1.75, 2.55]) B.box(cx, cz, Math.max(0.08, Math.abs(bx - ax)), Math.max(0.08, Math.abs(bz - az)), ry0, ry0 + 0.08, 0, null, [0.46, 0.47, 0.5], 0, { solid: false });
      }
      B.box(px0 - 1.4, pz1 - 4, 2.2, 2.4, 0, 2.6, 0, null, mul(conc, 0.9), 0, { roof: dark });
      B.box(px0 - 1.4, pz1 - 4, 2.6, 2.8, 2.6, 2.8, 0, null, dark, 0, { solid: false });
      B.box(px0 - 0.1, pz1 - 1.2, 0.3, 0.3, 0, 1.1, 0, null, [0.3, 0.3, 0.3], 0, {});
      for (let k = 0; k < 6; k++) B.box(px0 + 0.4 + k * 1.05, pz1 - 1.2, 1.05, 0.12, 1.0, 1.12, 0, null, k % 2 ? [0.85, 0.85, 0.85] : [0.75, 0.16, 0.12], 0, { solid: false });
      // floodlights on the corners of the yard
      for (const [lx, lz] of [[px0, pz0], [px1, pz0]]) {
        B.box(lx, lz, 0.22, 0.22, 0, 7, 0, null, [0.4, 0.4, 0.42], 0, {});
        B.box(lx, lz, 1.1, 0.5, 7, 7.5, 0, null, [0.2, 0.2, 0.22], 0, { solid: false });
      }
    },
    // the Hancock: a dark tapering tower with two antennas, the zip line's top
    hancock(B, l) {
      const { x, z, w, d } = l;
      const col = [0.42, 0.42, 0.45];
      let y = 0;
      for (let k = 0; k < 6; k++) {
        const t = 1 - k * 0.07, y1 = y + 32;
        B.box(x, z, w * t, d * t, y, y1, 0, 'glass', col, 708 + k);
        y = y1;
      }
      B.box(x, z, w * 0.55, d * 0.55, y, y + 3, 0, null, [0.15, 0.15, 0.16], 0, {});
      B.box(x - 4, z, 1.2, 1.2, y + 3, y + 70, 0, null, [0.3, 0.3, 0.3], 0, {});
      B.box(x + 4, z, 1.2, 1.2, y + 3, y + 70, 0, null, [0.3, 0.3, 0.3], 0, {});
    },
  };

  // a home: the house or block of flats behind its front door (home.x, home.z is the pavement
  // outside it, home.face the way the door faces)
  function homeFor(B, faction, h) {
    if (h.gate) return;
    const rot = { n: Math.PI, e: Math.PI / 2, s: 0, w: -Math.PI / 2 }[h.face || 's'];
    const fx = Math.sin(rot), fz = Math.cos(rot);
    if (h.kind === 'house') {
      const w = 7.2, d = 8.6;
      const cx = h.x - fx * (0.8 + d / 2), cz = h.z - fz * (0.8 + d / 2);
      house(B, cx, cz, w, d, 3.4, rot, [0.62, 0.62, 0.6], 811);
      // the neighbours, just the same (h.row: which way along the street the row runs)
      for (const k of [1, 2]) house(B, cx + fz * k * 11.5 * (h.row || 1), cz - fx * k * 11.5 * (h.row || 1), w, d, 3.4, rot, [0.6, 0.6, 0.58], 812 + k);
      return;
    }
    // a block of flats with a lit entrance
    const w = 16, d = 13, ht = { erudite: 25.9, candor: 22.2, dauntless: 16.0 }[faction] || 19.2;
    const style = faction === 'erudite' ? 'office' : 'brick';
    const cx = h.x - fx * (0.8 + d / 2), cz = h.z - fz * (0.8 + d / 2);
    B.box(cx, cz, w, d, 0, ht, rot, style, faction === 'candor' ? [0.82, 0.82, 0.82] : [0.95, 0.92, 0.9], 820);
    B.box(cx, cz, w + 0.6, d + 0.6, ht, ht + 0.7, rot, null, [0.35, 0.33, 0.3], 0, {});
    // the door: a recess, a canopy and a light (h.x/z is right in front of it)
    const P = (along, out, y) => [h.x + fz * along - fx * out, y, h.z - fx * along - fz * out];
    const g = B.g.plain, n = [fx, 0, fz];
    g.quad([P(-0.8, 0.77, 0), P(0.8, 0.77, 0), P(0.8, 0.77, 2.4), P(-0.8, 0.77, 2.4)], null, [0.18, 0.16, 0.14], n, 0);
    B.box(h.x - fx * 0.3, h.z - fz * 0.3, Math.abs(fz) * 2.6 + Math.abs(fx) * 1.1, Math.abs(fx) * 2.6 + Math.abs(fz) * 1.1, 2.6, 2.75, 0, null, [0.25, 0.25, 0.26], 0, { solid: false });
  }

  // the Fence: a ring of chain-link and concrete with watchtowers, and the gate out to Amity
  //   (the chain-link itself is a textured band the build makes from B.fence)
  // The Fence, the way the film shows it: not a fence at all but a wall round the whole city,
  // eighteen metres of poured concrete with buttresses up its inner face, a walkway along the top,
  // and on it a steel frame carrying the electrified mesh another sixteen metres up, razor wire
  // along the crest, red lamps on the posts. Watchtowers stand over it; the gate to Amity is a
  // gatehouse with two towers and doors you could drive a train through. In front of it, a
  // cordon nobody crosses: a security fence (signs every so often), a strip of open ground, the
  // patrol road, floodlights. You can walk up to the cordon and look; that's all.
  function theFence(B, c, Wd, gate, marshX) {
    const WL = Wd.wall, R = Wd.fence, IR = WL.inner, OR = WL.outer, H = WL.height, TOP = WL.top, CR = WL.cordon;
    const ga = gate ? Math.atan2(gate[1] - c[1], gate[0] - c[0]) : 99;
    const conc = [0.62, 0.61, 0.58], steel = [0.21, 0.21, 0.22], dark = [0.12, 0.12, 0.13];
    const at = (a, r) => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
    const near = (a, b, m) => { let d = Math.abs(a - b) % (Math.PI * 2); d = Math.min(d, Math.PI * 2 - d); return d * R < m; };
    const towers = DV.CityMap.towerAngles();
    const lamps = (B.lamps = B.lamps || []);
    // a strip in a vertical plane between two points (both faces): the frame's diagonal braces
    const strip = (p0, y0, p1, y1, wdt, col, nx, nz) => {
      const g = B.g.plain;
      const q = [[p0[0], y0 - wdt / 2, p0[1]], [p1[0], y1 - wdt / 2, p1[1]], [p1[0], y1 + wdt / 2, p1[1]], [p0[0], y0 + wdt / 2, p0[1]]];
      g.quad(q, null, col, [nx, 0, nz], 0);
      g.quad(q, null, mul(col, 0.8), [-nx, 0, -nz], 0);
    };
    const n = Math.round((Math.PI * 2 * R) / 30);
    B.part = 'the Fence';
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, mid = (a0 + a1) / 2;
      const chord = 2 * R * Math.sin(Math.PI / n) + 0.1;
      const ux = Math.cos(mid), uz = Math.sin(mid); // out from the city
      if (near(mid, ga, 22)) continue; // the gatehouse stands here (its towers meet the next segment)
      // the wall itself: the concrete, and its top
      const [wx, wz] = at(mid, (IR + OR) / 2);
      B.box(wx, wz, OR - IR, chord * (OR / R), 0, H, -mid, 'bastion', conc, 300 + (k % 40), { noEnds: true, roof: [0.4, 0.39, 0.37] });
      // up its inner face: a buttress at every joint (deep at the foot, stepping in halfway), a
      // ledge at nine metres, vents low down
      const [bx, bz] = at(a0, IR - 1.5), [bx2, bz2] = at(a0, IR - 0.9);
      B.box(bx, bz, 3, 2.6, 0, 8.5, -a0, 'bastion', mul(conc, 0.96), 341, {});
      B.box(bx2, bz2, 1.8, 2.2, 8.5, H - 0.4, -a0, 'bastion', mul(conc, 0.96), 342, {});
      const [lx, lz] = at(mid, IR - 0.25);
      B.box(lx, lz, 0.5, chord * 0.98, 8.6, 9.2, -mid, null, mul(conc, 0.7), 0, { noEnds: true, bottom: true });
      if (k % 3 === 0) { const [vx, vz] = at(mid + 0.004, IR - 0.06); B.box(vx, vz, 0.12, 1.6, 2.2, 3.1, -mid, null, dark, 0, { noTop: true }); }
      // on top: the walkway's rail on the city side, a parapet on the far side
      const [rx, rz] = at(mid, IR + 0.3), [px, pz] = at(mid, OR - 0.4);
      B.box(rx, rz, 0.08, chord, H, H + 1.1, -mid, null, steel, 0, { noTop: true, noEnds: true });
      B.box(px, pz, 0.8, chord * (OR / R), H, H + 1.4, -mid, null, mul(conc, 0.85), 0, { noEnds: true });
      // the frame: a post at every joint, girders, a cross-brace in each bay, the mesh, the razor wire
      const [sx, sz] = at(a0, R);
      B.box(sx, sz, 0.9, 0.6, H, TOP + 0.4, -a0, null, steel, 0, {});
      const [gx, gz] = at(mid, R);
      for (const y of [H + 7.5, TOP - 0.3]) B.box(gx, gz, 0.6, chord, y - 0.3, y + 0.3, -mid, null, steel, 0, { noEnds: true, bottom: true });
      const p0 = at(a0, R - 0.35), p1 = at(a1, R - 0.35);
      strip(p0, H + 0.6, p1, TOP - 0.8, 0.32, steel, -ux, -uz);
      strip(p0, TOP - 0.8, p1, H + 0.6, 0.32, steel, -ux, -uz);
      const m0 = at(a0, R + 0.05), m1 = at(a1, R + 0.05);
      B.fence.push([m0[0], m0[1], m1[0], m1[1], H + 0.4, TOP - 0.4]);
      const [cx2, cz2] = at(mid, R);
      B.box(cx2, cz2, 0.7, chord, TOP + 0.1, TOP + 0.75, -mid, null, mul(steel, 0.8), 0, { noEnds: true });
      // a red lamp on every third post
      if (k % 3 === 0) lamps.push([sx, TOP + 0.6, sz, [1, 0.12, 0.08], true]);
    }
    // the watchtowers: a shaft up out of the wall, a cabin with windows all round, a roof, an aerial,
    // a searchlight looking in over the city
    for (const ta of towers) {
      const [tx, tz] = at(ta, R);
      B.box(tx, tz, 13, 11, 0, 44, -ta, 'bastion', conc, 360, {});
      B.box(tx, tz, 13.6, 11.6, 44, 44.6, -ta, null, mul(conc, 0.7), 0, { bottom: true });
      B.box(tx, tz, 12, 10, 44.6, 48.1, -ta, 'office', [0.62, 0.64, 0.66], 361, {});
      B.box(tx, tz, 14, 12, 48.1, 48.7, -ta, null, dark, 0, { bottom: true });
      const [ax2, az2] = at(ta + 0.004, R + 2);
      B.box(ax2, az2, 0.2, 0.2, 48.7, 60, -ta, null, steel, 0, {});
      lamps.push([ax2, 60.2, az2, [1, 0.12, 0.08], true]);
      const [lx, lz] = at(ta, R - 6.6);
      B.box(lx, lz, 1.2, 1.4, 45.4, 46.4, -ta, null, dark, 0, {});
      lamps.push([at(ta, R - 7.4)[0], 45.9, at(ta, R - 7.4)[1], null, true]);
    }
    // the gate: a gatehouse across the wall, two towers, the opening, the doors (shut)
    if (gate) {
      const [ox, oz] = at(ga, R);
      for (const sd of [-1, 1]) {
        const ta = ga + (sd * 15.5) / R, [tx, tz] = at(ta, R);
        B.box(tx, tz, 14, 11, 0, 44, -ga, 'bastion', conc, 370, {});
        B.box(tx, tz, 14.6, 11.6, 44, 44.6, -ga, null, mul(conc, 0.7), 0, { bottom: true });
        B.box(tx, tz, 13, 10, 44.6, 48.1, -ga, 'office', [0.62, 0.64, 0.66], 371, {});
        B.box(tx, tz, 15, 12, 48.1, 48.7, -ga, null, dark, 0, { bottom: true });
        const [lx, lz] = at(ta, IR - 2.4);
        lamps.push([lx, 16, lz, null, false]);
      }
      // over the opening: the lintel, and the frame carried on across it
      B.box(ox, oz, OR - IR + 2, 21, 16, H + 2, -ga, 'bastion', conc, 372, {});
      B.box(ox, oz, 0.9, 21, H + 2, TOP + 2, -ga, null, steel, 0, {});
      // the doors: steel leaves with ribs and bands, a hazard stripe along their foot
      const tx2 = -Math.sin(ga), tz2 = Math.cos(ga); // along the wall
      for (const sd of [-1, 1]) {
        const [dx, dz] = at(ga, R);
        const cx3 = dx + tx2 * sd * 5.1, cz3 = dz + tz2 * sd * 5.1;
        B.box(cx3, cz3, 1.2, 10.1, 0, 15.8, -ga, null, [0.26, 0.25, 0.24], 0, {});
        for (let i = -2; i <= 2; i++) B.box(cx3 - Math.cos(ga) * 0.7 + tx2 * i * 2, cz3 - Math.sin(ga) * 0.7 + tz2 * i * 2, 0.25, 0.3, 0.6, 15.4, -ga, null, [0.2, 0.19, 0.18], 0, {});
        for (const y of [4, 8, 12]) B.box(cx3 - Math.cos(ga) * 0.68, cz3 - Math.sin(ga) * 0.68, 0.18, 10.1, y, y + 0.45, -ga, null, [0.18, 0.18, 0.17], 0, { bottom: true });
        for (let i = 0; i < 10; i++) B.box(cx3 - Math.cos(ga) * 0.66 + tx2 * (i - 4.5) * 1.0, cz3 - Math.sin(ga) * 0.66 + tz2 * (i - 4.5) * 1.0, 0.1, 1.0, 0, 0.7, -ga, null, i % 2 ? [0.62, 0.5, 0.12] : dark, 0, { noTop: true });
      }
      sign(B, ox - Math.cos(ga) * 5.06, 17, oz - Math.sin(ga) * 5.06, Math.atan2(-Math.cos(ga), -Math.sin(ga)), 16, 1.4,
        () => DV.Tex.sign('THE FENCE · GATE 4 · DAUNTLESS AUTHORIZED PERSONNEL ONLY', { w: 1024, h: 72, bg: '#1b1b1a', color: '#d8c8a0', size: 30 }));
    }
    // the cordon: a security fence nobody crosses (signs on it every so often), a concrete strip
    // inside it and an apron at the foot of the wall, the patrol road between, floodlights
    B.part = 'the cordon';
    const nc = Math.round((Math.PI * 2 * CR) / 10);
    B.cordon = [];
    for (let k = 0; k < nc; k++) {
      const a0 = (k / nc) * Math.PI * 2, a1 = ((k + 1) / nc) * Math.PI * 2, mid = (a0 + a1) / 2;
      const [x0, z0] = at(a0, CR), [x1, z1] = at(a1, CR);
      if (Math.max(x0, x1) > marshX - 4) continue; // (the marsh has its own wall)
      if (near(mid, ga, 9 * (R / CR))) continue; // the checkpoint
      B.box(x0, z0, 0.14, 0.14, 0, 3.7, -a0, null, steel, 0, { solid: false });
      const [ix, iz] = at(a0, CR - 0.3);
      if (k % 2 === 0) B.box(ix, iz, 0.7, 0.08, 3.6, 3.68, -a0, null, steel, 0, { solid: false, noTop: true }); // the outrigger, leaning in
      B.fence.push([x0, z0, x1, z1, 0.15, 3.5]);
      const [wx, wz] = at(mid, CR - 0.6);
      B.box(wx, wz, 0.05, 10, 3.95, 4.0, -mid, null, dark, 0, { solid: false, noTop: true, noEnds: true }); // the barbed wire
      B.cordon.push([x0, z0, x1, z1]);
      if (k % 30 === 15) sign(B, ...(([sx, sz]) => [sx, 1.9, sz])(at(mid, CR - 0.12)), Math.atan2(-Math.cos(mid), -Math.sin(mid)), 1.9, 1.2,
        () => DV.Tex.sign('RESTRICTED\nNO ENTRY BEYOND THIS FENCE\nDAUNTLESS PATROL ZONE', { w: 256, h: 160, bg: '#c8a020', color: '#141414', borderColor: '#141414', size: 22 }));
      // floodlights over the strip, every so often
      if (k % 8 === 4) {
        const [fx, fz] = at(mid, R - 7);
        B.box(fx, fz, 0.3, 0.3, 0, 14, -mid, null, steel, 0, {});
        const [hx, hz] = at(mid, R - 7.6);
        B.box(hx, hz, 0.8, 2.2, 13.6, 14.4, -mid, null, dark, 0, {});
        lamps.push([hx, 13.7, hz, null, false]);
      }
    }
    // the checkpoint where Madison Street meets the cordon: a guard booth, the barrier arm (down),
    // concrete blocks, a sign
    if (gate) {
      const [kx, kz] = at(ga, CR), tx2 = -Math.sin(ga), tz2 = Math.cos(ga);
      const bt = [kx + tx2 * 8.5, kz + tz2 * 8.5];
      B.box(bt[0], bt[1], 2.6, 2.6, 0, 2.7, -ga, 'office', [0.58, 0.6, 0.6], 380, {});
      B.box(bt[0], bt[1], 3.1, 3.1, 2.7, 2.9, -ga, null, dark, 0, {});
      for (let i = 0; i < 8; i++) B.box(kx + tx2 * (6.9 - i * 1.6 - 0.8), kz + tz2 * (6.9 - i * 1.6 - 0.8), 0.14, 1.6, 1.0, 1.14, -ga, null, i % 2 ? [0.7, 0.68, 0.64] : [0.6, 0.12, 0.1], 0, { solid: false });
      for (const o of [-1, 1]) { const [jx, jz] = at(ga, CR - 3); B.box(jx + tx2 * o * 11, jz + tz2 * o * 11, 1.0, 3.2, 0, 0.85, -ga, null, conc, 0, {}); }
      sign(B, kx - Math.cos(ga) * 0.2 + tx2 * 8.5, 3.6, kz - Math.sin(ga) * 0.2 + tz2 * 8.5, Math.atan2(-Math.cos(ga), -Math.sin(ga)), 3.4, 0.9,
        () => DV.Tex.sign('HALT · CHECKPOINT', { w: 256, h: 64, bg: '#7a1a14', color: '#f2ead8', size: 26 }));
    }
    // the shore wall along the marsh, inside the cordon
    if (marshX < 1e8) {
      const zr = Math.sqrt(Math.max(0, CR * CR - (marshX - 3 - c[0]) * (marshX - 3 - c[0])));
      for (let z = c[1] - zr; z < c[1] + zr; z += 20) B.box(marshX - 3, z + 10, 0.6, 20, 0, 1.1, 0, null, conc, 0, {});
    }
    B.part = 'other';
  }

  // Amity's farmland between the city and the Fence (the layout is DV.CityMap.farms(), which the
  // map draws too): dirt section roads, orchards in rows, farmsteads (a house, a barn, a silo,
  // grain bins), hedgerows between the fields. The fields themselves are ground: walkMeshes.
  function farmland(B, c) {
    const F = DV.CityMap.farms(), r = U.rng(5150);
    B.part = 'the farms';
    const dirt = [0.4, 0.34, 0.26];
    for (const [x0, z0, x1, z1] of F.roads) B.g.plain.quad([[x0, 0.16, z0], [x1, 0.16, z0], [x1, 0.16, z1], [x0, 0.16, z1]], null, mul(dirt, 0.92 + r() * 0.1), [0, 1, 0], 0);
    for (const [x0, z0, x1, z1] of F.hedges) B.box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, 1.3 + r() * 0.5, 0, null, [0.2, 0.27, 0.15], 0, { solid: false });
    // orchards: rows of fruit trees (a trunk, a round crown), all kept
    let trees = 0;
    for (const o of F.orchards) {
      const [x0, z0, x1, z1] = o.r;
      for (let x = x0 + 3; x < x1 - 2 && trees < 1000; x += 8) for (let z = z0 + 3; z < z1 - 2 && trees < 1000; z += 7) {
        const tx = x + (r() - 0.5) * 0.6, tz = z + (r() - 0.5) * 0.6, k = 0.85 + r() * 0.3;
        B.box(tx, tz, 0.28, 0.28, 0, 1.7, 0, null, [0.3, 0.23, 0.16], 0, { noTop: true });
        B.prism(tx, tz, 1.5 + r() * 0.5, 1.4, 3.1 + r() * 0.6, 5, [0.3 * k, 0.42 * k, 0.2 * k], 0.9);
        trees++;
      }
    }
    // the farms
    for (const f of F.steads) {
      const { x, z, rot, seed } = f, cs = Math.cos(rot), sn = Math.sin(rot);
      const P = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
      let [hx, hz] = P(-9, 2);
      house(B, hx, hz, 8, 7, 3.4, rot, [0.74, 0.7, 0.62], seed);
      [hx, hz] = P(5, -2);
      house(B, hx, hz, 11, 16, 6.2, rot + Math.PI / 2, f.barn === 'red' ? [0.52, 0.2, 0.15] : [0.5, 0.49, 0.46], seed + 1);
      [hx, hz] = P(13, 6);
      B.prism(hx, hz, 2.4, 0, 13, 8, [0.62, 0.62, 0.64], 1.6);
      for (const k of [0, 1]) { [hx, hz] = P(13 - k * 5.5, -6); B.prism(hx, hz, 2.1, 0, 4.2, 8, [0.56, 0.57, 0.6], 1.4); }
    }
    B.part = 'other';
  }

  function waterTower(B, x, z, y) {
    const legs = [0.33, 0.29, 0.25];
    for (const [kx, kz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.box(x + kx * 1.1, z + kz * 1.1, 0.22, 0.22, y, y + 3.2, 0, null, legs, 0, {});
    B.prism(x, z, 1.7, y + 3.2, y + 6.4, 8, [0.42, 0.33, 0.26], 1.2);
  }

  // the Hub: a bundle of nine black glass tubes stepping up to two antennas
  function theHub(B, x, z) {
    const T = 14; // (nine tubes, 42 m across: it fits its block)
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

  // the elevated L: deck on steel bents, running the length of the street. The bents stand on
  // the pavement, never in a road: where an avenue crosses under, the deck spans the junction
  // from a bent on each corner (the way the Loop does it)
  function elevatedTrack(B, t, cross, sw) {
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
    for (const x of bentsAlong(t, cross, sw)) {
      for (const z of [t.z0 + 0.6, t.z1 - 0.6]) B.box(x, z, 0.55, 0.55, 0, t.y - 0.9, 0, null, steel, 0, {});
      B.box(x, cz, 0.6, W, t.y - 1.6, t.y - 0.9, 0, null, steel, 0, {});
    }
  }
  // where the bents go: every span, but out of the crossing roads and their pavements (where people
  // walk): one each side of the junction instead, just past the corner
  function bentsAlong(t, cross, sw) {
    const span = t.span || 15, roads = (cross || []).map((L) => [L.c - L.w / 2 - (sw || 0), L.c + L.w / 2 + (sw || 0)]);
    const corners = [];
    for (const [a, b] of roads) if (b > t.x0 && a < t.x1) corners.push(a - 1.3, b + 1.3);
    const out = corners.filter((x) => x >= t.x0 && x <= t.x1);
    for (let x = t.x0; x <= t.x1; x += span) {
      if (roads.some(([a, b]) => x > a - 2.5 && x < b + 2.5)) continue;
      if (corners.some((c) => Math.abs(c - x) < span * 0.45)) continue;
      out.push(x);
    }
    out.sort((a, b) => a - b);
    // (and nothing left too long unsupported: a bent halfway along a long gap, if that's not a road)
    for (let i = 0; i + 1 < out.length; i++) {
      const m = (out[i] + out[i + 1]) / 2;
      if (out[i + 1] - out[i] > span * 1.35 && !roads.some(([a, b]) => m > a - 2.5 && m < b + 2.5)) out.splice(i + 1, 0, m);
    }
    return out;
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

  /* ------------------------------ walking the streets ------------------------------ */
  // The ground of a walkable city, as textured meshes lit like the zone's own outdoor floors:
  // asphalt everywhere inside the Fence (not under the zone's grounds), pavement on every
  // block with a kerb round it, the farmland outside the Fence, the chain-link band of the
  // Fence itself, and the landmarks' signs. Returns what the zone and the street life need.
  function walkMeshes(B, o, group) {
    const W = o.walk, L = W.light || [0.9, 0.9, 0.9];
    const c = o.centre || [(o.campus[0] + o.campus[2]) / 2, (o.campus[1] + o.campus[3]) / 2];
    const campus = o.campus, R = (W.edge || W.fence) + 40, marshX = o.marshX || 1e9;
    const WL = W.wall || { cordon: W.fence, outer: W.fence };
    const out = { open: [], pads: B.pads, solids: B.solids, campus, limit: WL.cordon - 1.4, edge: W.edge || WL.cordon, shore: marshX - 3.6, fence: W.fence, wall: WL, lamps: B.lamps || [], signs: [], mats: [], farm: [] };
    const mk = (g, key, opts) => {
      const base = DV.Mat.get(key);
      const m = new THREE.MeshBasicMaterial(Object.assign({ map: base.map, vertexColors: true, fog: true }, opts || {}));
      const mesh = new THREE.Mesh(g.geometry(), m);
      mesh.name = 'city_ground_' + key;
      mesh.frustumCulled = false;
      group.add(mesh);
      out.mats.push(m);
      return mesh;
    };
    const wOf = (key) => { const t = DV.Mat.get(key).map; return (t && t.userData.world) || 1; };
    const flatQ = (g, x0, z0, x1, z1, y, col, ws) => g.quad([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], [[x0 / ws, -z0 / ws], [x1 / ws, -z0 / ws], [x1 / ws, -z1 / ws], [x0 / ws, -z1 / ws]], col, [0, 1, 0], 0);
    // asphalt: a square round the Fence, less the zone's grounds and the marsh
    const ga = new Group(), wa = wOf('asphalt');
    const sq = [c[0] - R, c[1] - R, Math.min(c[0] + R, marshX), c[1] + R];
    for (const q of rectMinus(sq, campus)) {
      // in tiles, so the big quads don't stretch the fog and the shading too far
      for (let x = q[0]; x < q[2]; x += 160) for (let z = q[1]; z < q[3]; z += 160) flatQ(ga, x, z, Math.min(q[2], x + 160), Math.min(q[3], z + 160), 0, mul(L, 0.82), wa);
      out.open.push(q);
    }
    mk(ga, 'asphalt');
    // pavements and kerbs (the pavement wins the depth test against the asphalt under it)
    const gp = new Group(), gk = new Group(), wp = wOf('pavement'), wc = wOf('concrete');
    const r = U.rng(5);
    for (const pd of B.pads) {
      const [x0, z0, x1, z1] = pd.r;
      const k = 0.94 + r() * 0.1;
      flatQ(gp, x0, z0, x1, z1, 0.012, mul(L, 0.9 * k), wp);
      const e = pd.edge; // which sides of it are kerbs (not the zone's grounds)
      const kq = (ax, az, bx, bz, nx, nz) => {
        const t = 0.07, hx = nx * 0.18, hz = nz * 0.18;
        // the kerb's top and its face down to the road
        gk.quad([[ax, t, az], [bx, t, bz], [bx + hx, t, bz + hz], [ax + hx, t, az + hz]], [[ax / wc, az / wc], [bx / wc, bz / wc], [(bx + hx) / wc, (bz + hz) / wc], [(ax + hx) / wc, (az + hz) / wc]], mul(L, 0.95), [0, 1, 0], 0);
        gk.quad([[ax + hx, 0, az + hz], [bx + hx, 0, bz + hz], [bx + hx, t, bz + hz], [ax + hx, t, az + hz]], [[ax / wc, 0], [bx / wc + bz / wc, 0], [bx / wc + bz / wc, t / wc], [ax / wc, t / wc]], mul(L, 0.72), [nx, 0, nz], 0);
      };
      if (e[1]) kq(x0, z0, x1, z0, 0, -1);
      if (e[3]) kq(x1, z1, x0, z1, 0, 1);
      if (e[0]) kq(x0, z1, x0, z0, -1, 0);
      if (e[2]) kq(x1, z0, x1, z1, 1, 0);
    }
    mk(gp, 'pavement', { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    // (the yards go in with the fields, below: one grass mesh)
    const yardQ = [];
    for (const [x, z, w, d, rot] of B.yards || []) {
      const c2 = Math.cos(rot), s2 = Math.sin(rot);
      const P = (lx, lz) => [x + lx * c2 + lz * s2, 0.05, z - lx * s2 + lz * c2];
      const k = 0.8 + r() * 0.15;
      yardQ.push([[P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)], [L[0] * k * 0.95, L[1] * k * 0.92, L[2] * k * 0.8]]);
    }
    if (W.wall) {
      // the cordon's ground: a concrete strip inside its fence, the patrol road, an apron at the wall's foot
      const ring = (r0, r1, k) => {
        const nseg = Math.round((Math.PI * 2 * r1) / 12);
        for (let i = 0; i < nseg; i++) {
          const a0 = (i / nseg) * Math.PI * 2, a1 = ((i + 1) / nseg) * Math.PI * 2;
          const P = (a, r) => [c[0] + Math.cos(a) * r, 0.03, c[1] + Math.sin(a) * r];
          const ps = [P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r1)];
          if (Math.max(ps[0][0], ps[1][0], ps[2][0], ps[3][0]) > marshX - 4) continue;
          gk.quad(ps, ps.map((q) => [q[0] / wc, q[2] / wc]), mul(L, k), [0, 1, 0], 0);
        }
      };
      ring(W.wall.cordon - 0.4, W.wall.cordon + 4, 0.78);
      ring(W.fence - 10, W.wall.inner, 0.72);
    }
    mk(gk, 'concrete', { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    // the ground past the city's edge: grass in rings (cut off cleanly at the marsh's shore), green
    // up to the Fence and dry beyond it; and on it Amity's fields, strip by strip
    const gf = new Group(), wg = wOf('grass');
    const fr = U.rng(9);
    for (const [ps, col] of yardQ) gf.quad(ps, ps.map((q) => [q[0] / wg, -q[2] / wg]), col, [0, 1, 0], 0);
    const clipX = (ps, xm) => {
      const outp = [];
      for (let i = 0; i < ps.length; i++) {
        const A = ps[i], Bp = ps[(i + 1) % ps.length], ain = A[0] <= xm, bin = Bp[0] <= xm;
        if (ain) outp.push(A);
        if (ain !== bin) { const t = (xm - A[0]) / (Bp[0] - A[0]); outp.push([xm, A[1], A[2] + (Bp[2] - A[2]) * t]); }
      }
      return outp;
    };
    const ringIn = W.edge ? W.edge - 12 : WL.outer + 2, wallOut = WL.outer + 2;
    const bands = [];
    for (let r0 = ringIn; r0 < wallOut + 420; ) { const r1 = r0 < wallOut && r0 + 110 > wallOut ? wallOut : r0 + 110; bands.push([r0, r1]); r0 = r1; }
    for (const [r0, r1] of bands) {
      const n = Math.round((Math.PI * 2 * r1) / 60);
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
        const pt = (rr, a) => [c[0] + Math.cos(a) * rr, 0.12, c[1] + Math.sin(a) * rr];
        let ps = [pt(r0, a0), pt(r0, a1), pt(r1, a1), pt(r1, a0)];
        // (inside the Fence the marsh takes over east of the shore; outside it, the ground runs on)
        if (r1 <= wallOut) ps = clipX(ps, marshX);
        if (ps.length < 3) continue;
        const outside = r0 >= wallOut - 0.5, hue = fr();
        const col = outside ? (hue < 0.5 ? [0.92, 0.84, 0.66] : [0.8, 0.74, 0.6]) : hue < 0.5 ? [0.86, 0.96, 0.72] : [0.8, 0.9, 0.7];
        const uv = (q) => [q[0] / wg / 6, -q[2] / wg / 6];
        const cc = mul(col, 0.8 * L[0]);
        if (ps.length === 3) ps.push(ps[2]);
        gf.quad(ps.slice(0, 4), ps.slice(0, 4).map(uv), cc, [0, 1, 0], 0);
        if (ps.length === 5) gf.quad([ps[0], ps[3], ps[4], ps[4]], [ps[0], ps[3], ps[4], ps[4]].map(uv), cc, [0, 1, 0], 0);
        if (r0 >= ringIn && r1 <= wallOut) out.farm.push([r0, r1, a0, a1]);
      }
    }
    if (W.edge) {
      const CROP = { wheat: [1.22, 1.08, 0.6], green: [0.8, 1.04, 0.56], plough: [0.96, 0.74, 0.52], pasture: [0.74, 0.92, 0.6], fallow: [1.02, 0.94, 0.7] };
      for (const f of DV.CityMap.farms().fields) {
        const [x0, z0, x1, z1] = f.r, y = 0.135, k = 0.9 + fr() * 0.15;
        const ps = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
        gf.quad(ps, ps.map((q) => [q[0] / wg / 3, -q[2] / wg / 3]), mul(CROP[f.crop], 0.8 * L[0] * k), [0, 1, 0], 0);
      }
    }
    // (the fields go under the marsh flats east of the shore; they're drawn first)
    const fields = mk(gf, 'grass');
    fields.renderOrder = -1;
    // the Fence's chain-link
    const gc = new Group(), wl = wOf('chainlink');
    let u = 0;
    for (const [ax, az, bx, bz, y0 = 1.3, y1 = 9.2] of B.fence) {
      const len = Math.hypot(bx - ax, bz - az);
      gc.quad([[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]], [[u / wl, y0 / wl], [(u + len) / wl, y0 / wl], [(u + len) / wl, y1 / wl], [u / wl, y1 / wl]], mul(L, y0 > 5 ? 0.55 : 0.7), [ax - c[0], 0, az - c[1]], 0);
      u = (u + len) % 64;
    }
    if (gc.n) mk(gc, 'chainlink', { alphaTest: 0.5, side: THREE.DoubleSide });
    // the landmarks' signs: one mesh for each picture, the ones close together that share it merged
    // (the Testing Center's name on its three sides, a station's banners), drawn from their middle
    const sets = [];
    for (const sgn of B.signs) {
      const near = sets.find((q) => q.tex === sgn.tex && Math.hypot(q.at[0] - sgn.x, q.at[1] - sgn.z) < 70);
      if (near) near.list.push(sgn); else sets.push({ tex: sgn.tex, at: [sgn.x, sgn.z], list: [sgn] });
    }
    for (const q of sets) {
      const m = new THREE.MeshBasicMaterial({ map: q.tex(), transparent: true, alphaTest: 0.05, fog: true, color: new THREE.Color(L[0] * 0.95, L[1] * 0.95, L[2] * 0.95) });
      const cx = q.list.reduce((a, g) => a + g.x, 0) / q.list.length, cz = q.list.reduce((a, g) => a + g.z, 0) / q.list.length;
      const geos = q.list.map((g) => new THREE.PlaneGeometry(g.w, g.h).rotateY(g.rot).translate(g.x - cx, g.y, g.z - cz));
      const geo = geos.length > 1 ? mergePlanes(geos) : geos[0];
      if (geos.length > 1) for (const g of geos) g.dispose();
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(cx, 0, cz);
      mesh.name = 'city_sign';
      group.add(mesh);
      out.signs.push(mesh);
    }
    return out;
  }

  /* ------------------------------ public ------------------------------ */
  const City = {
    active: null,
    // o: { seed, campus:[x0,z0,x1,z1], gridX:[], gridZ:[], street, radius, hub:[x,z], marshX,
    //      ferris:[x,z], track:{x0,x1,z0,z1,y,span}, keepClear:[[x0,z0,x1,z1]],
    //      extras:[{x,z,w,d,h,style,tint,parapet,waterTower}], boxes:[{x,z,w,d,y0,y1,...}], haze, sky... }
    build(o) {
      const t0 = performance.now();
      // (QA: City.auditNext asks the next walkable city to list everything it places)
      if (o.walk && this.auditNext) { o = Object.assign({ audit: true }, o); this.auditNext = false; }
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
            street: { value: o.walk && !(S && S.noShops) ? 1 : 0 },
            shabby: { value: k === 'derelict' ? 0.75 : k === 'brick' || k === 'loft' ? 0.3 : 0.12 },
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

      // a city you can walk in: textured streets and pavements, the Fence, the fields beyond it
      let walk = null;
      if (o.walk) walk = walkMeshes(B, o, group);

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

      // the same shadows sliding across the playable outdoor floors (and the streets, walking, and
      // the farmland, a little higher, over its fields)
      const shadeRects = (o.exterior || []).slice();
      if (walk) for (const q of walk.open) shadeRects.push(q);
      if (shadeRects.length) {
        const sg = new Group();
        for (const [x0, z0, x1, z1] of shadeRects) sg.quad([[x0, 0.02, z0], [x1, 0.02, z0], [x1, 0.02, z1], [x0, 0.02, z1]], null, [1, 1, 1], [0, 1, 0], 0);
        if (walk) for (const [r0, r1, a0, a1] of walk.farm) {
          const C2 = o.centre, P = (rr, a) => [C2[0] + Math.cos(a) * rr, 0.2, C2[1] + Math.sin(a) * rr];
          sg.quad([P(r0, a0), P(r0, a1), P(r1, a1), P(r1, a0)], null, [1, 1, 1], [0, 1, 0], 0);
        }
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
      if (o.track && o.train !== false) {
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
        centre: o.centre || [(o.campus[0] + o.campus[2]) / 2, (o.campus[1] + o.campus[3]) / 2],
        walk,
        // can you stand at (x, z)? (inside the Fence, this side of the marsh, outside the zone's
        // own grounds: buildings and the like are colliders, see walk.solids)
        walkable(x, z) {
          if (!walk) return false;
          const c = this.centre, dx = x - c[0], dz = z - c[1];
          if (dx * dx + dz * dz > walk.limit * walk.limit) return false;
          if (x > walk.shore) return false;
          const q = walk.campus;
          return !(x > q[0] && x < q[2] && z > q[1] && z < q[3]);
        },
        stats: { buildMs: Math.round(performance.now() - t0), tris: B ? Object.keys(B.g).reduce((s, k) => s + B.g[k].idx.length / 3, 0) : 0, parts: B ? B.parts : null },
        audit: B && B.audit, // (o.audit: every box placed, [x0, z0, x1, z1, y0, y1, part, solid])
        update(dt, camera) { City.update(this, dt, camera); },
        // sample how shaded by clouds a point is right now (0 = clear .. 1 = full shadow)
        cloudShadeAt(x, z) { return City.cloudShadeAt(this, x, z); },
      };
      inst.noiseData = readNoise(noise);
      // everything this city owns, so the zone can free it when it's torn down
      inst.owned = { textures: [noise, ...Object.values(maps)], materials: Object.values(mats) };
      group.traverse((o) => {
        if (!o.material) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (inst.owned.materials.indexOf(m) < 0) inst.owned.materials.push(m);
          if (m.map && inst.owned.textures.indexOf(m.map) < 0) inst.owned.textures.push(m.map);
          if (m.uniforms && m.uniforms.map && m.uniforms.map.value && inst.owned.textures.indexOf(m.uniforms.map.value) < 0) inst.owned.textures.push(m.uniforms.map.value);
        }
      });
      City.active = inst;
      return inst;
    },

    update(inst, dt, camera) {
      const S = inst.shared;
      S.time.value += dt;
      if (camera) {
        inst.deck.position.x = camera.position.x;
        inst.deck.position.z = camera.position.z;
        // signs are a mesh each: only the ones near enough to read are drawn
        if (inst.walk && inst.walk.signs.length) {
          inst.signT = (inst.signT || 0) - dt;
          if (inst.signT <= 0) {
            inst.signT = 0.25;
            const cx = camera.position.x, cz = camera.position.z;
            for (const m of inst.walk.signs) m.visible = Math.abs(m.position.x - cx) + Math.abs(m.position.z - cz) < 330;
          }
        }
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
      if (!inst || inst.disposed) return;
      inst.disposed = true;
      inst.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      if (inst.owned) {
        for (const m of inst.owned.materials) m.dispose();
        for (const t of inst.owned.textures) t.dispose();
      }
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
  // the L train on its own (boarding it, riding in it)
  City.trainMesh = (cars) => {
    const tm = trainMesh(cars || 4);
    const mesh = new THREE.Mesh(tm.geo, new THREE.MeshBasicMaterial({ map: trainTexture(), vertexColors: true, fog: true }));
    mesh.userData.length = tm.length;
    return mesh;
  };
  DV.City = City;
})();
