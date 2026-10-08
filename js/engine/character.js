/* ==========================================================================
   DIVERGENT — procedural PS1-style characters
   Characters are assembled from reusable angular components (heads, hair,
   body types, clothing pieces) into ONE rigidly skinned mesh per character
   (2 draw calls: body + face texture). Animation is procedural.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  /* ----------------------------- data tables ----------------------------- */
  // 'tag' is the clip-on name badge: its own bone so it can be shown/hidden (scaled to
  // nothing) without a separate mesh or draw call
  const BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'uArmL', 'lArmL', 'handL', 'uArmR', 'lArmR', 'handR', 'uLegL', 'lLegL', 'footL', 'uLegR', 'lLegR', 'footR', 'tag'];
  const BI = {};
  BONES.forEach((b, i) => (BI[b] = i));

  const FACES = [
    { name: 'Oval', w: 1.0, h: 1.0, d: 1.0, jaw: 0.84, chin: 0.015, eyes: 'round', brow: 'flat', nose: 'small', mouth: 'neutral' },
    { name: 'Square', w: 1.07, h: 0.98, d: 1.0, jaw: 1.0, chin: 0.0, eyes: 'narrow', brow: 'thick', nose: 'wide', mouth: 'thin' },
    { name: 'Round', w: 1.08, h: 0.95, d: 1.03, jaw: 0.93, chin: 0.0, eyes: 'wide', brow: 'arched', nose: 'button', mouth: 'full' },
    { name: 'Long', w: 0.93, h: 1.08, d: 1.0, jaw: 0.86, chin: 0.02, eyes: 'heavy', brow: 'angled', nose: 'long', mouth: 'neutral' },
    { name: 'Heart', w: 1.02, h: 1.0, d: 1.0, jaw: 0.74, chin: 0.03, eyes: 'round', brow: 'arched', nose: 'small', mouth: 'smile' },
    { name: 'Angular', w: 0.98, h: 1.03, d: 0.98, jaw: 0.96, chin: 0.01, eyes: 'narrow', brow: 'angled', nose: 'long', mouth: 'frown', cheek: true },
    { name: 'Soft', w: 1.04, h: 0.97, d: 1.02, jaw: 0.88, chin: 0.0, eyes: 'heavy', brow: 'flat', nose: 'wide', mouth: 'full', freckles: true },
    { name: 'Sharp', w: 0.96, h: 1.02, d: 0.98, jaw: 0.8, chin: 0.035, eyes: 'wide', brow: 'thick', nose: 'narrow', mouth: 'smirk' },
  ];
  const HAIRSTYLES = ['short', 'buzzed', 'slicked', 'medium', 'long', 'ponytail', 'messy', 'bun', 'braids', 'undercut', 'mohawk', 'bald'];
  const BODY = {
    slim: { sw: 0.92, tw: 0.86, td: 0.88, limb: 0.86, hip: 0.92 },
    average: { sw: 1.0, tw: 1.0, td: 1.0, limb: 1.0, hip: 1.0 },
    athletic: { sw: 1.13, tw: 1.02, td: 1.04, limb: 1.12, hip: 0.98 },
    heavy: { sw: 1.1, tw: 1.3, td: 1.32, limb: 1.2, hip: 1.22, belly: true },
  };

  /* ----------------------------- free-running ----------------------------- */
  // Key poses for parkour: { bone: [x, y, z] }, hy (hips raised or lowered, metres). Bones not
  // named are straight. (x: legs and arms forward/up are negative; knees and the spine bend
  // positive. z: out to the side is + on the left, − on the right.)
  const PK_POSES = {
    // pushing off the right foot, the left knee driving, the arms swinging up
    takeoff: { uLegL: [-1.4, 0, 0.04], lLegL: [1.3, 0, 0], uLegR: [0.45, 0, -0.04], lLegR: [0.25, 0, 0], footR: [0.5, 0, 0], uArmL: [-1.9, 0, 0.25], uArmR: [-1.6, 0, -0.25], lArmL: [-0.6, 0, 0], lArmR: [-0.6, 0, 0], spine: [0.25, 0, 0], head: [-0.1, 0, 0] },
    // running through the air: a long stride, the arms up and out for balance
    stride: { uLegL: [-1.15, 0, 0.05], lLegL: [0.35, 0, 0], uLegR: [0.45, 0, -0.05], lLegR: [1.5, 0, 0], uArmL: [-2.3, 0, 0.55], uArmR: [-2.1, 0, -0.55], lArmL: [-0.3, 0, 0], lArmR: [-0.3, 0, 0], spine: [0.1, 0, 0], head: [-0.15, 0, 0] },
    // both feet reaching for the landing
    reach: { uLegL: [-1.25, 0, 0.08], lLegL: [0.7, 0, 0], uLegR: [-1.05, 0, -0.08], lLegR: [0.9, 0, 0], uArmL: [-1.5, 0, 0.35], uArmR: [-1.5, 0, -0.35], lArmL: [-0.4, 0, 0], lArmR: [-0.4, 0, 0], spine: [0.35, 0, 0], head: [0.15, 0, 0] },
    // stepping off a height: legs together, arms high
    drop: { uLegL: [-0.45, 0, 0.08], uLegR: [-0.3, 0, -0.08], lLegL: [0.55, 0, 0], lLegR: [0.45, 0, 0], uArmL: [-2.4, 0, 0.75], uArmR: [-2.4, 0, -0.75], lArmL: [-0.3, 0, 0], lArmR: [-0.3, 0, 0], spine: [0.05, 0, 0], head: [0.35, 0, 0] },
    // soaking up a landing: deep in the knees, hands forward
    squat: { hy: -0.45, uLegL: [-1.45, 0, 0.12], uLegR: [-1.45, 0, -0.12], lLegL: [2.0, 0, 0], lLegR: [2.0, 0, 0], footL: [-0.5, 0, 0], footR: [-0.5, 0, 0], uArmL: [-1.2, 0, 0.35], uArmR: [-1.2, 0, -0.35], lArmL: [-0.5, 0, 0], lArmR: [-0.5, 0, 0], spine: [0.55, 0, 0], head: [-0.3, 0, 0] },
    // coming up out of it into the run
    rise: { hy: -0.15, uLegL: [-0.8, 0, 0.05], uLegR: [-0.3, 0, -0.05], lLegL: [1.1, 0, 0], lLegR: [0.7, 0, 0], uArmL: [-0.6, 0, 0.15], uArmR: [0.3, 0, -0.15], lArmL: [-1.2, 0, 0], lArmR: [-1.2, 0, 0], spine: [0.35, 0, 0] },
    // balled up for a roll or a flip
    tuck: { hy: -0.6, uLegL: [-2.2, 0, 0.12], uLegR: [-2.2, 0, -0.12], lLegL: [2.4, 0, 0], lLegR: [2.4, 0, 0], footL: [-0.4, 0, 0], footR: [-0.4, 0, 0], uArmL: [-1.1, 0, 0.3], uArmR: [-1.1, 0, -0.3], lArmL: [-1.5, 0, 0], lArmR: [-1.5, 0, 0], spine: [0.9, 0, 0], chest: [0.25, 0, 0], head: [0.7, 0, 0] },
    // a kong vault: diving at the obstacle, arms out for it…
    dive: { uLegL: [0.35, 0, 0.06], uLegR: [0.5, 0, -0.06], lLegL: [0.6, 0, 0], lLegR: [0.4, 0, 0], uArmL: [-2.6, 0, 0.2], uArmR: [-2.6, 0, -0.2], lArmL: [-0.1, 0, 0], lArmR: [-0.1, 0, 0], spine: [0.75, 0, 0], head: [-0.6, 0, 0] },
    // …then pushing off it and pulling the knees through
    push: { uLegL: [-1.9, 0, 0.15], uLegR: [-1.9, 0, -0.15], lLegL: [2.0, 0, 0], lLegR: [2.0, 0, 0], uArmL: [-0.5, 0, 0.25], uArmR: [-0.5, 0, -0.25], lArmL: [-0.2, 0, 0], lArmR: [-0.2, 0, 0], spine: [0.5, 0, 0], head: [-0.3, 0, 0] },
    // a speed vault: the left hand planted, the legs swung over to the right
    sidevault: { uLegL: [-1.35, 0, -0.55], uLegR: [-1.15, 0, -0.75], lLegL: [0.7, 0, 0], lLegR: [1.0, 0, 0], uArmL: [-0.75, 0, 0.1], lArmL: [-0.05, 0, 0], uArmR: [-1.3, 0, -1.05], lArmR: [-0.4, 0, 0], spine: [0.25, 0, -0.32], head: [0.1, 0.3, 0] },
    // up a wall: a foot on it, both arms up for the ledge
    reachup: { uLegL: [-1.55, 0, 0.05], lLegL: [1.5, 0, 0], uLegR: [0.25, 0, -0.05], lLegR: [0.4, 0, 0], uArmL: [-2.95, 0, 0.15], uArmR: [-2.95, 0, -0.15], lArmL: [-0.15, 0, 0], lArmR: [-0.15, 0, 0], spine: [-0.12, 0, 0], head: [-0.45, 0, 0] },
    // hanging off it, pulling up
    hang: { uLegL: [-0.5, 0, 0.05], lLegL: [1.0, 0, 0], uLegR: [-0.2, 0, -0.05], lLegR: [0.6, 0, 0], uArmL: [-2.5, 0, 0.25], uArmR: [-2.5, 0, -0.25], lArmL: [-1.6, 0, 0], lArmR: [-1.6, 0, 0], spine: [0.1, 0, 0], head: [-0.2, 0, 0] },
    // pressing up over the top, a knee onto it
    mantle: { uLegL: [-2.0, 0, 0.1], lLegL: [2.2, 0, 0], uLegR: [0.15, 0, -0.05], lLegR: [0.6, 0, 0], uArmL: [-0.25, 0, 0.3], uArmR: [-0.25, 0, -0.3], lArmL: [-0.1, 0, 0], lArmR: [-0.1, 0, 0], spine: [0.75, 0, 0], head: [0.1, 0, 0] },
  };
  // each move: [t, pose, { sp: the whole body turned over (radians, forwards), pv: about a point
  // this high off the feet }] keys, t running 0 → 1. The bones ease between keys; the turn is
  // even (a roll mustn't stall half way over).
  const TAU = Math.PI * 2;
  const PK_MOVES = {
    leap: [[0, 'takeoff'], [0.22, 'stride'], [0.68, 'stride'], [1, 'reach']],
    drop: [[0, 'takeoff'], [0.25, 'drop'], [0.75, 'drop'], [1, 'reach']],
    land: [[0, 'squat'], [0.4, 'squat'], [1, 'rise']],
    roll: [[0, 'squat', { sp: 0, pv: 0.45 }], [0.12, 'tuck', { sp: 0, pv: 0.45 }], [0.8, 'tuck', { sp: TAU, pv: 0.45 }], [1, 'rise', { sp: TAU, pv: 0.45 }]],
    vault: [[0, 'takeoff'], [0.3, 'sidevault'], [0.65, 'sidevault'], [1, 'reach']],
    kong: [[0, 'takeoff', { sp: 0, pv: 0.9 }], [0.3, 'dive', { sp: 0.55, pv: 0.9 }], [0.55, 'push', { sp: 0.3, pv: 0.9 }], [0.82, 'reach', { sp: 0, pv: 0.9 }], [1, 'reach', { sp: 0, pv: 0.9 }]],
    climb: [[0, 'takeoff'], [0.18, 'reachup'], [0.3, 'hang'], [0.55, 'hang'], [0.78, 'mantle'], [1, 'rise']],
    flip: [[0, 'takeoff', { sp: 0, pv: 0.45 }], [0.18, 'tuck', { sp: 0.35, pv: 0.45 }], [0.78, 'tuck', { sp: TAU - 0.3, pv: 0.45 }], [1, 'reach', { sp: TAU, pv: 0.45 }]],
  };
  const PK_BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'uArmL', 'lArmL', 'handL', 'uArmR', 'lArmR', 'handR', 'uLegL', 'lLegL', 'footL', 'uLegR', 'lLegR', 'footR'];
  const ZERO3 = [0, 0, 0];

  /* ----------------------------- face textures ----------------------------- */
  const faceCache = {};
  function shade(hex, f) {
    const [r, g, b] = U.hexToRgb(hex);
    return U.rgbToCss(r * f, g * f, b * f);
  }
  function faceTexture(app) {
    const f = FACES[app.face % FACES.length];
    const key = [app.skin, app.face, app.eyes, app.sex, app.age > 35 ? 'old' : 'y', app.beard || '', app.hairColor, app.faceless ? 'fl' : '', app.makeup ? 'mk' : ''].join('|');
    if (faceCache[key]) return faceCache[key];
    const S = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    const skin = app.skin;
    c.fillStyle = skin;
    c.fillRect(0, 0, S, S);
    if (app.faceless) {
      // mirrored mask for simulation figures
      const g = c.createLinearGradient(0, 0, S, S);
      g.addColorStop(0, '#c9d2d6'); g.addColorStop(0.5, '#f2f6f7'); g.addColorStop(1, '#8e999e');
      c.fillStyle = g; c.fillRect(0, 0, S, S);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(18, 26, 10, 2); c.fillRect(36, 26, 10, 2);
    } else {
      // shading: temples, jaw, under the brows
      c.fillStyle = shade(skin, 0.86);
      c.fillRect(0, 0, 6, S); c.fillRect(S - 6, 0, 6, S);
      c.fillStyle = shade(skin, 0.9);
      c.fillRect(6, 54, S - 12, 10);
      if (f.cheek) { c.fillStyle = shade(skin, 0.85); c.fillRect(12, 38, 6, 8); c.fillRect(46, 38, 6, 8); }
      const ey = 27, exL = 19, exR = 45;
      const brow = app.hairColor && app.hairColor !== '#ddd3b8' ? shade(app.hairColor, 0.9) : shade(skin, 0.5);
      // brows
      c.fillStyle = brow;
      const bw = f.brow === 'thick' ? 2 : 1;
      for (const [ex, s] of [[exL, -1], [exR, 1]]) {
        if (f.brow === 'angled') { c.fillRect(ex - 4, ey - 6 + (s < 0 ? 1 : 0), 4, bw); c.fillRect(ex, ey - 6 + (s < 0 ? 0 : 1), 4, bw); }
        else if (f.brow === 'arched') { c.fillRect(ex - 4, ey - 5, 2, bw); c.fillRect(ex - 2, ey - 6, 4, bw); c.fillRect(ex + 2, ey - 5, 2, bw); }
        else c.fillRect(ex - 4, ey - 6, 8, bw);
      }
      // eye sockets
      c.fillStyle = shade(skin, 0.9);
      c.fillRect(exL - 4, ey - 3, 9, 6); c.fillRect(exR - 4, ey - 3, 9, 6);
      // eyes
      const eh = f.eyes === 'narrow' ? 2 : f.eyes === 'wide' ? 4 : 3;
      for (const ex of [exL, exR]) {
        c.fillStyle = '#ece8e0';
        c.fillRect(ex - 3, ey - Math.floor(eh / 2), 7, eh);
        c.fillStyle = app.eyes || '#3a2a1a';
        c.fillRect(ex - 1, ey - Math.floor(eh / 2), 3, eh);
        c.fillStyle = '#0c0a08';
        c.fillRect(ex, ey - Math.floor(eh / 2) + (eh > 2 ? 1 : 0), 1, 1);
        c.fillStyle = app.sex === 'f' || f.eyes === 'heavy' ? '#1a1410' : shade(skin, 0.45);
        c.fillRect(ex - 3, ey - Math.floor(eh / 2) - 1, 7, 1);
        if (f.eyes === 'heavy') { c.fillStyle = shade(skin, 0.75); c.fillRect(ex - 3, ey - Math.floor(eh / 2) - 2, 7, 1); }
      }
      // nose
      c.fillStyle = shade(skin, 0.8);
      const nl = f.nose === 'long' ? 13 : f.nose === 'button' ? 8 : 10;
      c.fillRect(31, ey + 1, 1, nl);
      c.fillStyle = shade(skin, 0.7);
      const nw = f.nose === 'wide' ? 4 : f.nose === 'narrow' ? 2 : 3;
      c.fillRect(32 - nw - 1, ey + nl, nw, 2); c.fillRect(33, ey + nl, nw, 2);
      // mouth
      const my = ey + nl + 7;
      const lip = app.sex === 'f' && app.makeup !== false ? '#9a4a48' : shade(skin, 0.62);
      c.fillStyle = lip;
      const mw = f.mouth === 'full' ? 12 : f.mouth === 'thin' ? 9 : 10;
      c.fillRect(32 - mw / 2, my, mw, f.mouth === 'full' ? 3 : 2);
      c.fillStyle = shade(skin, 0.42);
      c.fillRect(32 - mw / 2, my + (f.mouth === 'full' ? 1 : 0), mw, 1);
      if (f.mouth === 'smile') { c.fillRect(32 - mw / 2 - 1, my - 1, 1, 1); c.fillRect(32 + mw / 2, my - 1, 1, 1); }
      if (f.mouth === 'frown') { c.fillRect(32 - mw / 2 - 1, my + 2, 1, 1); c.fillRect(32 + mw / 2, my + 2, 1, 1); }
      if (f.mouth === 'smirk') { c.fillRect(32 + mw / 2, my - 1, 2, 1); }
      // cheeks
      if (app.sex === 'f') { c.fillStyle = 'rgba(200,90,80,0.18)'; c.fillRect(12, 34, 7, 5); c.fillRect(45, 34, 7, 5); }
      if (f.freckles || app.freckles) {
        c.fillStyle = shade(skin, 0.7);
        const r = U.rng(key);
        for (let k = 0; k < 14; k++) c.fillRect(14 + Math.floor(r() * 36), 31 + Math.floor(r() * 8), 1, 1);
      }
      if (app.age > 35) {
        c.fillStyle = shade(skin, 0.78);
        c.fillRect(20, 14, 24, 1); c.fillRect(22, 17, 20, 1);
        c.fillRect(24, ey + nl + 3, 1, 6); c.fillRect(39, ey + nl + 3, 1, 6);
        c.fillRect(exL - 6, ey, 2, 1); c.fillRect(exR + 5, ey, 2, 1);
      }
      if (app.beard === 'stubble' || app.beard === 'short' || app.beard === 'full') {
        c.fillStyle = app.hairColor ? shade(app.hairColor, 1.0) : '#2a1d14';
        c.globalAlpha = app.beard === 'stubble' ? 0.28 : 0.6;
        const r = U.rng(key + 'b');
        for (let k = 0; k < 220; k++) {
          const x = 10 + Math.floor(r() * 44), y = ey + nl + 2 + Math.floor(r() * (S - ey - nl - 2));
          if (y > my - 2 && y < my + 3 && x > 32 - mw / 2 - 1 && x < 32 + mw / 2 + 1) continue;
          c.fillRect(x, y, 1, 1);
        }
        c.globalAlpha = 1;
      }
      if (app.scar) { c.fillStyle = shade(skin, 0.65); c.fillRect(exR + 2, ey - 4, 1, 9); }
    }
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 8, 8);
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    faceCache[key] = tex;
    return tex;
  }

  /* ----------------------------- mesh builder ----------------------------- */
  // Body and face share one material (one draw call per character): the face
  // texture reserves an 8x8 white block in its top-left corner, and every
  // vertex-coloured body triangle samples it.
  const WHITE_UV = [4 / 64, 1 - 4 / 64];
  class Builder {
    constructor() {
      this.g = [
        { pos: [], nor: [], col: [], uv: [], si: [] },
        { pos: [], nor: [], col: [], uv: [], si: [] },
      ];
    }
    tri(group, bone, a, b, c, col, ua, ub, uc) {
      const G = this.g[group];
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      const cc = typeof col === 'string' ? U.hexToRgb(col) : col;
      for (const [p, u] of [[a, ua], [b, ub], [c, uc]]) {
        G.pos.push(p[0], p[1], p[2]);
        G.nor.push(nx, ny, nz);
        G.col.push(cc[0], cc[1], cc[2]);
        G.uv.push(u ? u[0] : WHITE_UV[0], u ? u[1] : WHITE_UV[1]);
        G.si.push(bone);
      }
    }
    quad(bone, a, b, c, d, col) {
      this.tri(0, bone, a, b, c, col);
      this.tri(0, bone, a, c, d, col);
    }
    // tapered prism from p0 to p1 (bottom ring rx0/rz0, top ring rx1/rz1)
    prism(bone, col, p0, p1, rx0, rz0, rx1, rz1, sides, opts) {
      opts = opts || {};
      sides = sides || 6;
      const ax = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const al = Math.hypot(ax[0], ax[1], ax[2]) || 1;
      const a = [ax[0] / al, ax[1] / al, ax[2] / al];
      let helper = Math.abs(a[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0];
      // basis: u ~ x, v ~ z for vertical prisms
      let u = [helper[1] * a[2] - helper[2] * a[1], helper[2] * a[0] - helper[0] * a[2], helper[0] * a[1] - helper[1] * a[0]];
      if (Math.abs(a[1]) > 0.9) u = [1, 0, 0];
      const ul = Math.hypot(...u) || 1;
      u = [u[0] / ul, u[1] / ul, u[2] / ul];
      let v = [a[1] * u[2] - a[2] * u[1], a[2] * u[0] - a[0] * u[2], a[0] * u[1] - a[1] * u[0]];
      if (Math.abs(a[1]) > 0.9) v = [0, 0, a[1] > 0 ? -1 : 1];
      const off = opts.offset || 0;
      const ring = (p, rx, rz, k) => {
        const ang = (k / sides) * Math.PI * 2 + Math.PI / sides + off;
        const cx = Math.cos(ang) * rx, cz = Math.sin(ang) * rz;
        return [p[0] + u[0] * cx + v[0] * cz, p[1] + u[1] * cx + v[1] * cz, p[2] + u[2] * cx + v[2] * cz];
      };
      const cols = Array.isArray(col) && typeof col[0] !== 'number' ? col : null;
      for (let k = 0; k < sides; k++) {
        const b0 = ring(p0, rx0, rz0, k), b1 = ring(p0, rx0, rz0, k + 1);
        const t0 = ring(p1, rx1, rz1, k), t1 = ring(p1, rx1, rz1, k + 1);
        const cc = cols ? cols[k % cols.length] : col;
        this.tri(0, bone, b0, t1, b1, cc);
        this.tri(0, bone, b0, t0, t1, cc);
        if (opts.capTop !== false) this.tri(0, bone, p1, t1, t0, opts.topCol || cc);
        if (opts.capBottom) this.tri(0, bone, p0, b0, b1, opts.botCol || cc);
      }
    }
    box(bone, col, cx, cy, cz, sx, sy, sz, rotY) {
      const hx = sx / 2, hy = sy / 2, hz = sz / 2;
      const cr = Math.cos(rotY || 0), sr = Math.sin(rotY || 0);
      const P = (x, y, z) => [cx + x * cr + z * sr, cy + y, cz - x * sr + z * cr];
      const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
      const f = [[4, 5, 6, 7], [1, 0, 3, 2], [5, 1, 2, 6], [0, 4, 7, 3], [7, 6, 2, 3], [0, 1, 5, 4]];
      for (const q of f) this.quad(bone, v[q[0]], v[q[1]], v[q[2]], v[q[3]], col);
    }
    build() {
      const all = { pos: [], nor: [], col: [], uv: [], si: [] };
      const groups = [];
      let start = 0;
      for (let gi = 0; gi < 2; gi++) {
        const G = this.g[gi];
        const n = G.pos.length / 3;
        all.pos.push(...G.pos); all.nor.push(...G.nor); all.col.push(...G.col); all.uv.push(...G.uv); all.si.push(...G.si);
        groups.push([start, n, gi]);
        start += n;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(all.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(all.nor, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(all.col, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(all.uv, 2));
      const si = new Uint16Array(all.si.length * 4), sw = new Float32Array(all.si.length * 4);
      for (let i = 0; i < all.si.length; i++) { si[i * 4] = all.si[i]; sw[i * 4] = 1; }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      void groups; // single material: no draw groups
      geo.computeBoundingSphere();
      geo.boundingSphere.radius *= 1.35;
      return geo;
    }
  }

  // rounded box triangles (spherified cube). Returns [{a,b,c, na,nb,nc}] with normalized coords.
  function roundedBox(n, w, h, d, round, shape) {
    const faces = [
      [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
      [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
      [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
      [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
      [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
      [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    ];
    const out = [];
    const P = (N, Uv, Vv, u, v) => {
      const p = [N[0] + Uv[0] * u + Vv[0] * v, N[1] + Uv[1] * u + Vv[1] * v, N[2] + Uv[2] * u + Vv[2] * v];
      const l = Math.hypot(p[0], p[1], p[2]);
      const q = [p[0] / l * 1.15, p[1] / l * 1.15, p[2] / l * 1.15];
      const r = [U.lerp(p[0], q[0], round), U.lerp(p[1], q[1], round), U.lerp(p[2], q[2], round)];
      const nrm = [p[0], p[1], p[2]];
      let x = r[0] * w / 2, y = r[1] * h / 2, z = r[2] * d / 2;
      if (shape) [x, y, z] = shape(x, y, z, nrm);
      return { p: [x, y, z], n: nrm };
    };
    for (const [N, Uv, Vv] of faces) {
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const u0 = -1 + (2 * i) / n, u1 = -1 + (2 * (i + 1)) / n, v0 = -1 + (2 * j) / n, v1 = -1 + (2 * (j + 1)) / n;
        const a = P(N, Uv, Vv, u0, v0), b = P(N, Uv, Vv, u1, v0), c = P(N, Uv, Vv, u1, v1), d2 = P(N, Uv, Vv, u0, v1);
        out.push([a, b, c], [a, c, d2]);
      }
    }
    return out;
  }

  /* ----------------------------- assembly ----------------------------- */
  function buildGeometry(app) {
    const B = new Builder();
    const body = BODY[app.build] || BODY.average;
    const fem = app.sex === 'f';
    const child = !!app.child;
    const o = app.outfit || {};
    const skin = app.skin || '#d8a27c';
    const top = o.topColor || '#888888', top2 = o.topColor2 || shadeHex(top, 1.25);
    const bottom = o.bottomColor || '#555555', shoe = o.shoeColor || '#222222';
    const hair = app.hairColor || '#2e1f15';
    const topStyle = o.top || 'shirt';
    const botStyle = o.bottom || 'pants';
    const acc = o.acc || [];

    const SW = (fem ? 0.172 : 0.2) * body.sw; // shoulder half width
    const HW = (fem ? 0.112 : 0.1) * body.hip;
    const L = body.limb;
    const TW = body.tw, TD = body.td;

    // key heights (male base)
    const yHip = 0.93, yWaist = 1.06, yChest = 1.24, yShoulder = 1.45, yNeck = 1.47, yHeadBase = 1.56;
    const yKnee = 0.5, yAnkle = 0.085, yElbow = 1.16, yWrist = 0.92;

    // --- skeleton positions (world/bind space) ---
    const bp = {
      root: [0, 0, 0], hips: [0, yHip + 0.02, 0], spine: [0, yWaist, 0], chest: [0, yChest, 0], neck: [0, yNeck, 0], head: [0, yHeadBase, 0],
      uArmL: [SW, yShoulder - 0.02, 0], lArmL: [SW + 0.01, yElbow, 0], handL: [SW + 0.015, yWrist, 0.0],
      uArmR: [-SW, yShoulder - 0.02, 0], lArmR: [-SW - 0.01, yElbow, 0], handR: [-SW - 0.015, yWrist, 0.0],
      uLegL: [HW * 0.95, yHip, 0], lLegL: [HW * 0.95, yKnee, 0.01], footL: [HW * 0.95, yAnkle, 0],
      uLegR: [-HW * 0.95, yHip, 0], lLegR: [-HW * 0.95, yKnee, 0.01], footR: [-HW * 0.95, yAnkle, 0],
      tag: [-0.075 * TW, yChest + 0.08, 0.125 * TD + 0.012],
    };

    const sleeveLong = ['shirt', 'jacket', 'blazer', 'robe', 'cardigan', 'hoodie', 'labcoat', 'tunic', 'sweater', 'vest'].indexOf(topStyle) >= 0;
    const sleeveShort = topStyle === 'tshirt';
    const armUpperCol = topStyle === 'tank' ? skin : topStyle === 'vest' ? top2 : top;
    const armLowerCol = sleeveLong ? (topStyle === 'vest' ? top2 : top) : skin;
    const legCol = botStyle === 'shorts' ? skin : bottom;
    const boots = o.shoes === 'boots';

    // --- legs ---
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      const x = HW * 0.95 * s;
      const lr = 0.068 * L * (fem ? 1.04 : 1);
      B.prism(BI['uLeg' + side], legCol, [x, yKnee, 0.005], [x, yHip + 0.02, 0], lr * 0.78, lr * 0.85, lr, lr * 1.05, 6, { capTop: false });
      const shin = boots ? shoe : (botStyle === 'skirt' || botStyle === 'shorts' ? skin : legCol);
      if (boots) {
        B.prism(BI['lLeg' + side], legCol, [x, 0.3, 0.008], [x, yKnee, 0.008], lr * 0.66, lr * 0.68, lr * 0.74, lr * 0.78, 6, { capTop: false });
        B.prism(BI['lLeg' + side], shoe, [x, yAnkle, 0.0], [x, 0.31, 0.008], lr * 0.66, lr * 0.7, lr * 0.74, lr * 0.76, 6, { capTop: false });
      } else {
        B.prism(BI['lLeg' + side], shin, [x, yAnkle, 0.0], [x, yKnee, 0.008], lr * 0.5, lr * 0.55, lr * 0.72, lr * 0.76, 6, { capTop: false });
      }
      // foot / shoe
      const fw = 0.05 * L, fl = boots ? 0.27 : 0.25;
      B.box(BI['foot' + side], shoe, x, yAnkle / 2 + 0.005, 0.06, fw * 2, yAnkle + 0.01, fl);
      if (boots) B.box(BI['foot' + side], shadeHex(shoe, 0.6), x, 0.012, 0.06, fw * 2 + 0.01, 0.025, fl + 0.01);
    }
    // --- pelvis ---
    B.prism(BI.hips, bottom, [0, yHip - 0.06, 0], [0, yWaist + 0.01, 0], HW * 1.75 * TW, 0.1 * TD, 0.15 * TW * (fem ? 0.92 : 1), 0.1 * TD, 8, { capBottom: true });
    // --- torso ---
    const waistCol = topStyle === 'robe' || topStyle === 'tunic' || topStyle === 'labcoat' ? top : top;
    B.prism(BI.spine, waistCol, [0, yWaist - 0.02, 0], [0, yChest + 0.01, 0], 0.15 * TW * (fem ? 0.9 : 1), 0.1 * TD, 0.165 * TW * (fem ? 0.92 : 1), 0.11 * TD, 8, { capTop: false });
    if (body.belly) B.prism(BI.spine, waistCol, [0, yWaist + 0.02, 0.03], [0, yChest - 0.02, 0.03], 0.15 * TW, 0.11 * TD, 0.15 * TW, 0.11 * TD, 8);
    B.prism(BI.chest, top, [0, yChest - 0.01, 0], [0, yShoulder + 0.02, 0], 0.165 * TW * (fem ? 0.92 : 1), 0.11 * TD, SW * 0.95, 0.095 * TD, 8, { topCol: shadeHex(top, 0.9) });
    if (fem && !child) {
      B.prism(BI.chest, top, [0, yChest + 0.04, 0.06 * TD], [0, yChest + 0.15, 0.065 * TD], 0.11 * TW, 0.05, 0.12 * TW, 0.045, 6);
    }
    // --- neck & shoulders ---
    B.prism(BI.neck, skin, [0, yNeck - 0.03, 0.0], [0, yHeadBase + 0.03, 0.005], 0.045, 0.045, 0.042, 0.043, 6, { capTop: false });
    // --- arms ---
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      const ar = 0.046 * L * (fem ? 0.9 : 1);
      const x0 = SW * s;
      B.box(BI.chest, top, x0 * 0.9, yShoulder - 0.03, 0, 0.1 * body.sw, 0.08, 0.11 * TD); // shoulder cap
      if (sleeveShort) {
        B.prism(BI['uArm' + side], top, [x0 + 0.005 * s, yShoulder - 0.17, 0], [x0, yShoulder - 0.01, 0], ar * 1.15, ar * 1.15, ar * 1.2, ar * 1.2, 6, { capBottom: true });
        B.prism(BI['uArm' + side], skin, [x0 + 0.01 * s, yElbow, 0], [x0 + 0.005 * s, yShoulder - 0.17, 0], ar * 0.9, ar * 0.9, ar, ar, 6, { capTop: false });
      } else {
        B.prism(BI['uArm' + side], armUpperCol, [x0 + 0.01 * s, yElbow, 0], [x0, yShoulder - 0.01, 0], ar * 0.9, ar * 0.9, ar * 1.05, ar * 1.05, 6, { capTop: false });
      }
      B.prism(BI['lArm' + side], armLowerCol, [x0 + 0.015 * s, yWrist + 0.01, 0], [x0 + 0.01 * s, yElbow + 0.01, 0], ar * 0.72, ar * 0.72, ar * 0.88, ar * 0.88, 6, { capTop: false, capBottom: true, botCol: skin });
      if (sleeveLong && !acc.includes('rolled')) B.prism(BI['lArm' + side], shadeHex(armLowerCol, 0.8), [x0 + 0.015 * s, yWrist + 0.01, 0], [x0 + 0.015 * s, yWrist + 0.04, 0], ar * 0.78, ar * 0.78, ar * 0.78, ar * 0.78, 6);
      // hand + thumb
      B.box(BI['hand' + side], skin, x0 + 0.017 * s, yWrist - 0.075, 0.005, 0.035, 0.15, 0.075);
      B.box(BI['hand' + side], skin, x0 + 0.012 * s - 0.0, yWrist - 0.045, 0.045, 0.025, 0.06, 0.025);
      // tattoos
      if (o.tattoos && o.tattoos.indexOf('arm' + side) >= 0) {
        const ink = '#1d2a33';
        const ac = sleeveLong ? null : armLowerCol;
        if (!sleeveLong) {
          B.prism(BI['lArm' + side], ink, [x0 + 0.013 * s, yWrist + 0.07, 0], [x0 + 0.012 * s, yWrist + 0.1, 0], ar * 0.78, ar * 0.78, ar * 0.84, ar * 0.84, 6, { capTop: false });
          B.prism(BI['lArm' + side], ink, [x0 + 0.013 * s, yWrist + 0.13, 0], [x0 + 0.012 * s, yWrist + 0.145, 0], ar * 0.8, ar * 0.8, ar * 0.85, ar * 0.85, 6, { capTop: false });
        }
        if (armUpperCol === skin || sleeveShort) {
          B.prism(BI['uArm' + side], ink, [x0 + 0.008 * s, yElbow + 0.08, 0], [x0 + 0.006 * s, yElbow + 0.12, 0], ar * 0.97, ar * 0.97, ar * 1.0, ar * 1.0, 6, { capTop: false });
          B.box(BI['uArm' + side], ink, x0 + 0.03 * s + 0.018 * s, yElbow + 0.04, 0.0, 0.01, 0.07, 0.05);
        }
        void ac;
      }
    }
    // --- clothing overlays ---
    const coat = (col, yBottom, open) => {
      B.prism(BI.chest, col, [0, yChest - 0.01, 0], [0, yShoulder + 0.03, 0], 0.175 * TW, 0.12 * TD, SW * 1.0, 0.105 * TD, 8, { capTop: true });
      B.prism(BI.hips, col, [0, yBottom, 0], [0, yChest, 0], (topStyle === 'robe' ? 0.22 : 0.19) * TW, 0.15 * TD, 0.168 * TW, 0.115 * TD, 8, { capTop: false, capBottom: false });
      if (open) {
        B.box(BI.chest, top2, 0, (yChest + yShoulder) / 2 - 0.02, 0.112 * TD + 0.004, 0.06, yShoulder - yChest - 0.04, 0.01);
        B.box(BI.hips, top2, 0, (yBottom + yChest) / 2 + 0.05, 0.13 * TD + 0.01, 0.04, yChest - yBottom - 0.1, 0.01);
      }
    };
    if (topStyle === 'robe') coat(top, 0.36, false);
    else if (topStyle === 'tunic') coat(top, 0.66, false);
    else if (topStyle === 'labcoat') coat(o.coatColor || '#e9e9e4', 0.5, true);
    if (topStyle === 'jacket' || topStyle === 'blazer' || topStyle === 'hoodie' || topStyle === 'cardigan') {
      // bulkier shell + open front
      B.prism(BI.chest, top, [0, yChest - 0.02, 0], [0, yShoulder + 0.025, 0], 0.172 * TW, 0.118 * TD, SW * 0.99, 0.103 * TD, 8, { capTop: true });
      B.prism(BI.spine, top, [0, yHip + 0.02, 0], [0, yChest + 0.01, 0], 0.163 * TW, 0.115 * TD, 0.17 * TW, 0.117 * TD, 8, { capTop: false });
      if (topStyle !== 'hoodie') {
        // inner shirt V
        const iy0 = yChest + 0.02, iy1 = yShoulder + 0.01, iz = 0.118 * TD + 0.004;
        B.tri(0, BI.chest, [-0.045, iy1, iz], [0.0, iy0 - 0.02, iz + 0.002], [0.045, iy1, iz], top2);
        B.tri(0, BI.chest, [-0.045, iy1, iz], [0.045, iy1, iz], [0.0, iy0 - 0.02, iz + 0.002], top2);
        B.box(BI.spine, top2, 0, (yHip + yChest) / 2, 0.118 * TD, 0.03, yChest - yHip - 0.04, 0.008);
        // collar
        B.prism(BI.neck, shadeHex(top, 0.85), [0, yNeck - 0.04, -0.005], [0, yNeck + 0.03, -0.01], 0.07, 0.065, 0.065, 0.06, 6, { capTop: false });
      } else {
        B.box(BI.chest, shadeHex(top, 0.9), 0, yShoulder + 0.02, -0.09, 0.2, 0.12, 0.08); // hood
        B.box(BI.spine, shadeHex(top, 0.85), 0, yWaist + 0.04, 0.12 * TD, 0.18 * TW, 0.1, 0.01); // pocket
      }
    }
    if (topStyle === 'vest') {
      // shirt collar + V showing beneath the vest
      const iy0 = yChest + 0.04, iy1 = yShoulder + 0.02, iz = 0.096 * TD + 0.012;
      B.tri(0, BI.chest, [-0.05, iy1, iz], [0.0, iy0, iz + 0.004], [0.05, iy1, iz], top2);
      B.tri(0, BI.chest, [-0.05, iy1, iz], [0.05, iy1, iz], [0.0, iy0, iz + 0.004], top2);
      B.prism(BI.neck, top2, [0, yNeck - 0.035, 0], [0, yNeck + 0.01, -0.005], 0.06, 0.058, 0.058, 0.055, 6, { capTop: false });
      B.box(BI.chest, top2, SW * 0.9, yShoulder - 0.03, 0, 0.1, 0.081, 0.111 * TD);
      B.box(BI.chest, top2, -SW * 0.9, yShoulder - 0.03, 0, 0.1, 0.081, 0.111 * TD);
    }
    if (topStyle === 'shirt' || topStyle === 'cardigan') {
      B.prism(BI.neck, shadeHex(top, 0.9), [0, yNeck - 0.035, 0], [0, yNeck + 0.01, -0.005], 0.06, 0.058, 0.058, 0.055, 6, { capTop: false });
    }
    // skirts
    if (botStyle === 'skirt') B.prism(BI.hips, bottom, [0, 0.56, 0], [0, yWaist, 0], 0.2 * TW, 0.15 * TD, 0.155 * TW, 0.105 * TD, 8, { capTop: false, capBottom: true });
    if (botStyle === 'longskirt') B.prism(BI.hips, bottom, [0, 0.16, 0], [0, yWaist, 0], 0.25 * TW, 0.2 * TD, 0.155 * TW, 0.105 * TD, 8, { capTop: false, capBottom: true });
    // belt
    if (acc.includes('belt') || topStyle === 'tank' || topStyle === 'tshirt') B.prism(BI.hips, '#1a1612', [0, yWaist - 0.035, 0], [0, yWaist + 0.0, 0], 0.158 * TW, 0.106 * TD, 0.158 * TW, 0.106 * TD, 8);
    // tie
    if (acc.includes('tie')) {
      B.box(BI.chest, o.tieColor || '#101010', 0, yChest + 0.06, 0.12 * TD + 0.008, 0.035, 0.24, 0.008);
      B.box(BI.spine, o.tieColor || '#101010', 0, yChest - 0.03, 0.118 * TD + 0.012, 0.04, 0.1, 0.008);
    }
    if (acc.includes('scarf')) B.prism(BI.neck, top2, [0, yNeck - 0.06, 0.01], [0, yNeck + 0.02, 0.0], 0.085, 0.08, 0.075, 0.07, 6);
    if (acc.includes('patches')) {
      const r = U.rng(JSON.stringify(o));
      for (let k = 0; k < 3; k++) {
        const pc = U.pick(['#7a6a4a', '#4a5a6a', '#6a3a2a', '#8a8a6a']);
        B.box(k === 2 ? BI.uLegL : BI.chest, pc, k === 2 ? HW : (r() - 0.5) * 0.18, k === 2 ? 0.75 : yChest + 0.05 + r() * 0.1, k === 2 ? 0.07 : 0.115 * TD, 0.06, 0.06, 0.01);
      }
    }
    if (acc.includes('badge')) B.box(BI.chest, '#c8b060', 0.08, yChest + 0.12, 0.12 * TD + 0.004, 0.03, 0.04, 0.008);
    // staff ID on a lanyard
    if (acc.includes('lanyard')) {
      const lz = 0.12 * TD + 0.006, lc = o.lanyardColor || '#2f5f9e';
      B.prism(BI.chest, lc, [0.055, yNeck - 0.02, 0.05], [0.006, yChest - 0.02, lz], 0.006, 0.004, 0.006, 0.004, 4);
      B.prism(BI.chest, lc, [-0.055, yNeck - 0.02, 0.05], [-0.006, yChest - 0.02, lz], 0.006, 0.004, 0.006, 0.004, 4);
      B.box(BI.chest, '#e9e7df', 0, yChest - 0.075, lz + 0.004, 0.055, 0.075, 0.006);
      B.box(BI.chest, lc, 0, yChest - 0.05, lz + 0.006, 0.055, 0.016, 0.006);
    }
    // candidate name badge (hidden until checked in; see CharacterModel.setTag)
    if (app.nameTag) {
      const t = bp.tag;
      // dark plastic sleeve, white card, blue header band, photo square, black clip (boxes are centred)
      B.box(BI.tag, '#1c1c20', t[0], t[1] - 0.03, t[2] - 0.002, 0.098, 0.074, 0.006);
      B.box(BI.tag, '#f4f2ea', t[0], t[1] - 0.029, t[2] + 0.001, 0.086, 0.062, 0.006);
      B.box(BI.tag, '#2a56a8', t[0], t[1] - 0.006, t[2] + 0.002, 0.086, 0.014, 0.007);
      B.box(BI.tag, '#7a7f86', t[0] - 0.024, t[1] - 0.037, t[2] + 0.003, 0.026, 0.026, 0.006);
      B.box(BI.tag, '#101010', t[0], t[1] + 0.009, t[2] - 0.001, 0.022, 0.014, 0.012);
    }
    if (acc.includes('armband')) B.prism(BI.uArmL, o.armbandColor || '#c4432c', [SW, yShoulder - 0.13, 0], [SW, yShoulder - 0.09, 0], 0.052, 0.052, 0.052, 0.052, 6);
    if (o.tattoos && o.tattoos.indexOf('neck') >= 0) B.box(BI.neck, '#1d2a33', 0.032, yNeck + 0.04, 0.02, 0.012, 0.05, 0.03);

    // --- head ---
    buildHead(B, app, yHeadBase);

    return { geo: B.build(), bp };
  }

  function shadeHex(hex, f) {
    const [r, g, b] = U.hexToRgb(hex);
    const c = (v) => Math.round(U.clamp(v * f, 0, 1) * 255);
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1);
  }

  function buildHead(B, app, yBase) {
    const f = FACES[(app.face || 0) % FACES.length];
    const child = !!app.child;
    const hs = child ? 1.12 : 1.06;
    const w = 0.158 * f.w * hs * (app.sex === 'f' ? 0.96 : 1), h = 0.225 * f.h * hs * (app.sex === 'f' ? 0.97 : 1), d = 0.192 * f.d * hs;
    const cy = yBase + h * 0.47, cz = 0.012;
    const jaw = f.jaw, chin = f.chin;
    const shape = (x, y, z) => {
      if (y < 0) {
        const t = Math.min(1, -y / (h / 2));
        x *= U.lerp(1, jaw, t);
        z *= U.lerp(1, 0.9, t);
        if (z > 0) z += chin * t;
      }
      if (y > h * 0.3) z *= 0.97;
      return [x, y, z];
    };
    const tris = roundedBox(3, w, h, d, 0.55, shape);
    const skin = app.skin || '#d8a27c';
    const skinRGB = U.hexToRgb(skin);
    for (const [a, b, c] of tris) {
      const pa = [a.p[0], a.p[1] + cy, a.p[2] + cz], pb = [b.p[0], b.p[1] + cy, b.p[2] + cz], pc = [c.p[0], c.p[1] + cy, c.p[2] + cz];
      const front = a.n[2] > 0.99 && b.n[2] > 0.99 && c.n[2] > 0.99;
      if (front) {
        const UVf = (p) => [U.clamp(0.5 + p[0] / (w * 1.02), 0, 1), U.clamp(0.5 + (p[1] - cy) / (h * 1.0), 0, 1)];
        B.tri(1, BI.head, pa, pb, pc, [1, 1, 1], UVf(pa), UVf(pb), UVf(pc));
      } else {
        B.tri(0, BI.head, pa, pb, pc, skinRGB);
      }
    }
    // nose
    if (!app.faceless) {
      const ny = cy - h * 0.02, nz = cz + d * 0.5 * 1.05;
      const nl = f.nose === 'long' ? 0.045 : 0.035, np = f.nose === 'button' ? 0.018 : 0.024;
      const nw = f.nose === 'wide' ? 0.02 : 0.015;
      const top = [0, ny + 0.012, nz - 0.004], tip = [0, ny - nl + 0.01, nz + np], lb = [-nw, ny - nl + 0.002, nz - 0.002], rb = [nw, ny - nl + 0.002, nz - 0.002];
      const nc = U.hexToRgb(shadeHex(skin, 0.96));
      B.tri(0, BI.head, top, lb, tip, nc);
      B.tri(0, BI.head, top, tip, rb, nc);
      B.tri(0, BI.head, lb, rb, tip, U.hexToRgb(shadeHex(skin, 0.75)));
      // ears
      for (const s of [1, -1]) B.box(BI.head, shadeHex(skin, 0.92), s * (w / 2 + 0.004), cy - 0.005, cz - 0.01, 0.018, 0.05, 0.03);
    }
    const o = app.outfit || {};
    if (o.piercings && o.piercings.length) {
      for (const p of o.piercings) {
        if (p === 'ear') { B.box(BI.head, '#c8c8c8', w / 2 + 0.015, cy - 0.03, cz - 0.005, 0.008, 0.012, 0.008); B.box(BI.head, '#c8c8c8', -w / 2 - 0.015, cy - 0.025, cz - 0.005, 0.008, 0.012, 0.008); }
        if (p === 'brow') B.box(BI.head, '#d0d0d0', 0.045, cy + 0.03, cz + d * 0.47, 0.006, 0.014, 0.008);
        if (p === 'nose') B.box(BI.head, '#d0d0d0', 0.012, cy - 0.03, cz + d * 0.53, 0.006, 0.006, 0.006);
        if (p === 'lip') B.box(BI.head, '#d0d0d0', 0.012, cy - h * 0.29, cz + d * 0.47, 0.006, 0.008, 0.006);
      }
    }
    if ((o.acc || []).includes('glasses')) {
      const gy = cy + 0.015, gz = cz + d * 0.53, col = o.glassesColor || '#1c1c1c';
      for (const s of [1, -1]) {
        B.box(BI.head, col, s * 0.036, gy + 0.015, gz, 0.042, 0.006, 0.006);
        B.box(BI.head, col, s * 0.036, gy - 0.014, gz, 0.042, 0.005, 0.006);
        B.box(BI.head, col, s * 0.057, gy, gz, 0.005, 0.03, 0.006);
        B.box(BI.head, col, s * 0.015, gy, gz, 0.005, 0.03, 0.006);
        B.box(BI.head, col, s * (w / 2 + 0.002), gy + 0.012, cz + 0.02, 0.005, 0.005, d * 0.6);
      }
      B.box(BI.head, col, 0, gy + 0.008, gz, 0.024, 0.005, 0.006);
    }
    buildHair(B, app, w, h, d, cy, cz);
    // beard geometry
    if (app.beard === 'short' || app.beard === 'full') {
      const bc = U.hexToRgb(app.hairColor || '#2e1f15');
      const s = app.beard === 'full' ? 1.08 : 1.04;
      const tris2 = roundedBox(3, w * s, h * s, d * s, 0.55, shape);
      for (const [a, b, c] of tris2) {
        const ny = (a.n[1] + b.n[1] + c.n[1]) / 3, nz = (a.n[2] + b.n[2] + c.n[2]) / 3;
        if (ny < (app.beard === 'full' ? -0.35 : -0.6) && nz > -0.3) {
          B.tri(0, BI.head, [a.p[0], a.p[1] + cy, a.p[2] + cz], [b.p[0], b.p[1] + cy, b.p[2] + cz], [c.p[0], c.p[1] + cy, c.p[2] + cz], bc);
        }
      }
    }
  }

  function buildHair(B, app, w, h, d, cy, cz) {
    const style = app.hair || 'short';
    if (style === 'bald') return;
    const hc = U.hexToRgb(app.hairColor || '#2e1f15');
    const dye = app.hairDye ? U.hexToRgb(app.hairDye) : null;
    const skinMix = (k) => {
      const s = U.hexToRgb(app.skin || '#d8a27c');
      return [U.lerp(hc[0], s[0], k), U.lerp(hc[1], s[1], k), U.lerp(hc[2], s[2], k)];
    };
    const r = U.rng((app.seed || 1) + style);
    const shell = (scale, keep, col, jitter, sy) => {
      const tris = roundedBox(3, w * scale, h * scale * (sy || 1), d * scale, 0.6);
      for (const [a, b, c] of tris) {
        const n = [(a.n[0] + b.n[0] + c.n[0]) / 3, (a.n[1] + b.n[1] + c.n[1]) / 3, (a.n[2] + b.n[2] + c.n[2]) / 3];
        if (!keep(n[0], n[1], n[2])) continue;
        const J = (p, nn) => {
          if (!jitter) return [p[0], p[1] + cy + (sy ? (h * (sy - 1)) / 2 : 0), p[2] + cz];
          const k = jitter * (0.5 + 0.5 * Math.sin(nn[0] * 13 + nn[1] * 7 + nn[2] * 5));
          return [p[0] * (1 + k), p[1] * (1 + k * 0.6) + cy, p[2] * (1 + k) + cz];
        };
        B.tri(0, BI.head, J(a.p, a.n), J(b.p, b.n), J(c.p, c.n), col);
      }
    };
    const frontCut = (ny, nz, hairline) => !(nz > 0.45 && ny < hairline);
    const topCol = dye && (style === 'mohawk' || style === 'undercut') ? dye : hc;
    switch (style) {
      case 'buzzed':
        shell(1.035, (x, y, z) => y > -0.05 && frontCut(y, z, 0.62) && !(Math.abs(x) > 0.8 && y < 0.25 && z > -0.3), skinMix(0.45));
        break;
      case 'short':
        shell(1.07, (x, y, z) => (y > 0.0 && frontCut(y, z, 0.6)) || (z < -0.35 && y > -0.55) || (Math.abs(x) > 0.75 && y > -0.1 && z < 0.3), hc);
        break;
      case 'slicked':
        shell(1.06, (x, y, z) => (y > 0.05 && frontCut(y, z, 0.7)) || (z < -0.3 && y > -0.6) || (Math.abs(x) > 0.8 && y > 0.0 && z < 0.2), hc, 0, 0.98);
        shell(1.1, (x, y, z) => y > 0.6 && z > -0.2, [hc[0] * 1.1, hc[1] * 1.1, hc[2] * 1.1]);
        break;
      case 'medium':
        shell(1.08, (x, y, z) => (y > -0.05 && frontCut(y, z, 0.6)) || (Math.abs(x) > 0.55 && y > -0.7 && z < 0.55) || (z < -0.2 && y > -0.85), hc);
        break;
      case 'messy':
        shell(1.09, (x, y, z) => (y > -0.1 && frontCut(y, z, 0.45)) || (Math.abs(x) > 0.55 && y > -0.6 && z < 0.5) || (z < -0.2 && y > -0.75), hc, 0.12);
        break;
      case 'long':
      case 'braids':
        shell(1.08, (x, y, z) => (y > -0.05 && frontCut(y, z, 0.58)) || (Math.abs(x) > 0.55 && y > -0.85 && z < 0.5) || (z < -0.2 && y > -0.9), hc);
        if (style === 'long') {
          // back panel falls to the shoulder blades
          B.prism(BI.head, hc, [0, cy - h * 0.95, cz - d * 0.4], [0, cy - h * 0.1, cz - d * 0.45], w * 0.5, d * 0.16, w * 0.55, d * 0.2, 6);
          for (const s of [1, -1]) B.prism(BI.head, hc, [s * w * 0.45, cy - h * 0.75, cz - d * 0.05], [s * w * 0.5, cy - h * 0.1, cz - d * 0.05], 0.022, 0.035, 0.025, 0.04, 5);
        } else {
          for (const s of [1, -1]) B.prism(BI.head, hc, [s * w * 0.45, cy - h * 1.35, cz + d * 0.1], [s * w * 0.5, cy - h * 0.3, cz - d * 0.05], 0.016, 0.016, 0.022, 0.022, 5);
        }
        break;
      case 'ponytail':
        shell(1.06, (x, y, z) => (y > -0.05 && frontCut(y, z, 0.62)) || (z < -0.3 && y > -0.6) || (Math.abs(x) > 0.75 && y > -0.2 && z < 0.3), hc, 0, 0.98);
        B.prism(BI.head, hc, [0, cy - h * 0.75, cz - d * 0.78], [0, cy + h * 0.05, cz - d * 0.58], 0.018, 0.018, 0.035, 0.035, 5);
        B.box(BI.head, '#2a2a2a', 0, cy + h * 0.02, cz - d * 0.6, 0.04, 0.025, 0.04);
        break;
      case 'bun':
        shell(1.055, (x, y, z) => (y > -0.05 && frontCut(y, z, 0.64)) || (z < -0.3 && y > -0.55) || (Math.abs(x) > 0.75 && y > -0.15 && z < 0.3), hc, 0, 0.98);
        B.prism(BI.head, hc, [0, cy + h * 0.12, cz - d * 0.62], [0, cy + h * 0.32, cz - d * 0.72], 0.045, 0.04, 0.035, 0.03, 6, { capBottom: true });
        break;
      case 'undercut':
        shell(1.03, (x, y, z) => y > -0.1 && frontCut(y, z, 0.62), skinMix(0.5));
        shell(1.12, (x, y, z) => y > 0.45 && z > -0.6, topCol, 0.06);
        break;
      case 'mohawk':
        shell(1.03, (x, y, z) => y > -0.1 && frontCut(y, z, 0.62), skinMix(0.55));
        for (let k = 0; k < 5; k++) {
          const zz = cz + d * (0.38 - k * 0.2);
          const yy = cy + h * (0.5 - Math.abs(k - 1.5) * 0.04);
          B.prism(BI.head, topCol, [0, yy - 0.02, zz], [0, yy + 0.07 + r() * 0.02, zz - 0.02], 0.016, 0.03, 0.006, 0.012, 4);
        }
        break;
      default:
        shell(1.07, (x, y, z) => y > 0.0 && frontCut(y, z, 0.6), hc);
    }
    if (dye && style !== 'mohawk' && style !== 'undercut') {
      // dyed streak
      B.prism(BI.head, dye, [w * 0.15, cy + h * 0.28, cz + d * 0.38], [w * 0.2, cy + h * 0.52, cz + d * 0.2], 0.012, 0.012, 0.016, 0.016, 4);
    }
    if ((app.outfit && app.outfit.acc || []).includes('flower')) {
      const fc = U.hexToRgb(app.outfit.flowerColor || '#e8c030');
      B.box(BI.head, fc, w * 0.5, cy + h * 0.28, cz + d * 0.1, 0.03, 0.03, 0.03);
      B.box(BI.head, [0.9, 0.9, 0.85], w * 0.52, cy + h * 0.28, cz + d * 0.1, 0.012, 0.012, 0.012);
    }
  }

  /* ----------------------------- shared shadow ----------------------------- */
  let shadowGeo = null, shadowMat = null;
  function blobShadow() {
    if (!shadowGeo) {
      shadowGeo = new THREE.PlaneGeometry(0.9, 0.9);
      shadowGeo.rotateX(-Math.PI / 2);
      const tex = DV.Tex.custom('blobshadow', 64, 64, (c, w, h) => {
        const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(0,0,0,0.55)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      });
      shadowMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true });
    }
    const m = new THREE.Mesh(shadowGeo, shadowMat);
    m.position.y = 0.015;
    m.renderOrder = 1;
    return m;
  }

  /* ----------------------------- model class ----------------------------- */
  class CharacterModel {
    constructor(app) {
      this.app = app;
      this.root = new THREE.Group();
      this.root.name = 'character';
      this.phase = Math.random() * 6;
      this.idleT = Math.random() * 10;
      this.pose = new Float32Array(BONES.length * 3);
      this.hipY = 0; this.hipZ = 0;
      this.look = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };
      this.tint = new THREE.Color(1, 1, 1);
      this.build();
    }
    build() {
      const app = this.app;
      const { geo, bp } = buildGeometry(app);
      this.bodyMat = new THREE.MeshLambertMaterial({ map: faceTexture(app), vertexColors: true, side: THREE.DoubleSide, flatShading: true });
      DV.Mat.applyWobble(this.bodyMat);
      // bones
      const bones = [];
      const parents = { root: null, hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', uArmL: 'chest', lArmL: 'uArmL', handL: 'lArmL', uArmR: 'chest', lArmR: 'uArmR', handR: 'lArmR', uLegL: 'hips', lLegL: 'uLegL', footL: 'lLegL', uLegR: 'hips', lLegR: 'uLegR', footR: 'lLegR', tag: 'chest' };
      for (const name of BONES) {
        const b = new THREE.Bone();
        b.name = name;
        const p = bp[name], pp = parents[name] ? bp[parents[name]] : [0, 0, 0];
        b.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
        if (parents[name]) bones[BI[parents[name]]].add(b);
        bones.push(b);
      }
      this.bones = bones;
      this.bindPos = bones.map((b) => b.position.clone());
      const mesh = new THREE.SkinnedMesh(geo, this.bodyMat);
      mesh.add(bones[0]);
      mesh.updateMatrixWorld(true);
      mesh.bind(new THREE.Skeleton(bones));
      mesh.frustumCulled = true;
      this.mesh = mesh;
      this.root.add(mesh);
      this.shadow = blobShadow();
      this.root.add(this.shadow);
      const hs = app.child ? 0.62 : (app.sex === 'f' ? 0.955 : 1) * (app.height || 1);
      this.mesh.scale.setScalar(hs);
      this.scale = hs;
      this.setTag(!!this.tagOn);
    }
    // show/hide the clip-on name badge (only exists on models built with app.nameTag)
    setTag(on) {
      this.tagOn = !!on;
      const b = this.bones && this.bones[BI.tag];
      if (b) b.scale.setScalar(on ? 1 : 0.0001);
    }
    rebuild(app) {
      this.dispose(true);
      this.app = app;
      this.root.remove(this.mesh);
      this.root.remove(this.shadow);
      this.build();
    }
    setTint(r, g, b) {
      this.tint.setRGB(r, g, b);
      this.bodyMat.color.copy(this.tint);
    }
    setVisible(v) {
      this.root.visible = v;
    }
    dispose(keepRoot) {
      if (this.mesh) {
        this.mesh.geometry.dispose();
        this.bodyMat.dispose();
      }
      if (!keepRoot && this.root.parent) this.root.parent.remove(this.root);
    }
    // hold something (a pistol, a knife) in a hand: the object follows the bone
    attach(boneName, obj) {
      const b = this.bones[BI[boneName]];
      if (b) b.add(obj);
      return obj;
    }
    detach(obj) { if (obj && obj.parent) obj.parent.remove(obj); }
    boneWorld(boneName, out) {
      out = out || new THREE.Vector3();
      this.bones[BI[boneName]].getWorldPosition(out);
      return out;
    }
    headWorldPos(out) {
      out = out || new THREE.Vector3();
      this.bones[BI.head].getWorldPosition(out);
      out.y += 0.12 * this.scale;
      return out;
    }

    /**
     * s: { speed (m/s), action, seatY, lookYaw, lookPitch, talking }
     */
    animate(dt, s) {
      const P = this.pose;
      P.fill(0);
      const speed = s.speed || 0;
      const act = s.action || 'idle';
      this.idleT += dt;
      let hipY = 0, hipZ = 0, rootRx = 0;
      const set = (bone, x, y, z) => { const i = BI[bone] * 3; P[i] = x; P[i + 1] = y || 0; P[i + 2] = z || 0; };
      const add = (bone, x, y, z) => { const i = BI[bone] * 3; P[i] += x; P[i + 1] += y || 0; P[i + 2] += z || 0; };
      const it = this.idleT;
      // someone working a heavy bag: jab, cross, breathe, round and round
      if (act === 'bagwork' && !s.fight) {
        const cyc = (it * 1.6 + this.seedPhase()) % 3, fr = cyc % 1;
        s = Object.assign({}, s, { fight: { move: cyc < 1 ? 'jab' : cyc < 2 ? 'cross' : 'stance', ext: cyc < 2 ? Math.sin(Math.PI * fr) : 0 } });
      }
      let pkSpin = 0, pkPivot = 0.5;
      if (s.pk) {
        // free-running: the move drives the whole body (see parkourPose)
        const r = this.parkourPose(s.pk, set);
        hipY = r.hipY; pkSpin = r.spin; pkPivot = r.pivot;
      } else if (s.fight && act !== 'lie') {
        // hand to hand: a guard, footwork, and whatever move the fight system is driving
        const r = this.fightPose(dt, s, set, add);
        hipY = r.hipY;
      } else if (speed > 0.05 && (act === 'idle' || act === 'walk' || act === 'run' || act === 'talk' || act === 'sneak' || act === 'carry' || act === 'read')) {
        const run = U.clamp((speed - 2.6) / 2.0, 0, 1);
        const rate = U.lerp(4.6, 3.0, run);
        this.phase += speed * rate * dt;
        const ph = this.phase;
        const amp = U.lerp(0.48, 0.85, run) * U.clamp(speed / 1.2, 0.35, 1);
        const sn = Math.sin(ph), cs = Math.cos(ph);
        set('uLegL', sn * amp, 0, 0);
        set('uLegR', -sn * amp, 0, 0);
        set('lLegL', Math.max(0, Math.sin(ph + 1.2)) * U.lerp(0.75, 1.4, run), 0, 0);
        set('lLegR', Math.max(0, Math.sin(ph + 1.2 + Math.PI)) * U.lerp(0.75, 1.4, run), 0, 0);
        set('footL', -sn * 0.25, 0, 0);
        set('footR', sn * 0.25, 0, 0);
        const aamp = U.lerp(0.42, 0.8, run) * U.clamp(speed / 1.2, 0.35, 1);
        set('uArmL', -sn * aamp, 0, 0.07);
        set('uArmR', sn * aamp, 0, -0.07);
        set('lArmL', -U.lerp(0.28, 1.35, run) - Math.max(0, -sn) * 0.25, 0, 0);
        set('lArmR', -U.lerp(0.28, 1.35, run) - Math.max(0, sn) * 0.25, 0, 0);
        set('spine', U.lerp(0.04, 0.2, run), sn * 0.06, 0);
        set('chest', 0, -sn * 0.1, 0);
        set('hips', 0, sn * 0.08, 0);
        hipY = -Math.abs(cs) * U.lerp(0.025, 0.05, run) + 0.01;
        set('head', -U.lerp(0.02, 0.12, run), 0, 0);
        if (act === 'carry') {
          // a crate held in both arms in front, leaning back against the weight
          set('uArmL', -0.55, 0, 0.12); set('uArmR', -0.55, 0, -0.12);
          set('lArmL', -1.25, 0, 0); set('lArmR', -1.25, 0, 0);
          set('spine', -0.04, sn * 0.04, 0);
        } else if (act === 'read') {
          // walking with your nose in a book
          set('uArmL', -0.5, 0, 0.12); set('lArmL', -1.2, -0.4, 0);
          set('uArmR', -0.3, 0, -0.1); set('lArmR', -1.0, 0.3, 0);
          set('head', 0.3, 0, 0);
        }
        if (act === 'sneak') {
          // crouch-walk: knees bent, hips low, leaning in, arms tucked forward
          hipY -= 0.3 * this.scaleY();
          add('uLegL', -0.85, 0, 0); add('uLegR', -0.85, 0, 0);
          add('lLegL', 1.2, 0, 0); add('lLegR', 1.2, 0, 0);
          add('footL', -0.35, 0, 0); add('footR', -0.35, 0, 0);
          set('spine', 0.38, 0, 0);
          set('uArmL', -0.45 - sn * 0.15, 0, 0.12); set('uArmR', -0.45 + sn * 0.15, 0, -0.12);
          set('lArmL', -0.9, 0, 0); set('lArmR', -0.9, 0, 0);
          set('head', -0.25, 0, 0);
        }
      } else {
        // idle family
        const br = Math.sin(it * 1.7) * 0.02;
        set('chest', -br, 0, 0);
        set('uArmL', 0.02 + br, 0, 0.08 + Math.sin(it * 0.5) * 0.015);
        set('uArmR', 0.02 + br, 0, -0.08 - Math.sin(it * 0.5) * 0.015);
        set('lArmL', -0.12, 0, 0);
        set('lArmR', -0.12, 0, 0);
        set('hips', 0, 0, Math.sin(it * 0.35) * 0.025);
        set('spine', 0, 0, -Math.sin(it * 0.35) * 0.025);
        set('uLegL', 0, 0, 0.02);
        set('uLegR', 0, 0, -0.02);
        if (act === 'sit' || act === 'work' || act === 'recline' || act === 'sit_clap' || act === 'sit_cheer' || act === 'sit_touch' || act === 'sit_fold' || act === 'sit_slump' || act === 'sit_strum') {
          const sy = s.seatY || 0.45;
          hipY = sy + 0.08 - 0.95 * this.scaleY();
          hipZ = -0.06;
          set('uLegL', -1.5, 0, 0.06);
          set('uLegR', -1.5, 0, -0.06);
          set('lLegL', 1.45, 0, 0);
          set('lLegR', 1.45, 0, 0);
          set('hips', 0, 0, 0);
          set('spine', 0, 0, 0);
          if (act === 'work') {
            set('uArmL', -0.75, 0, 0.12); set('uArmR', -0.75, 0, -0.12);
            set('lArmL', -0.75 + Math.sin(it * 11) * 0.05, 0, 0); set('lArmR', -0.75 + Math.sin(it * 13 + 1) * 0.05, 0, 0);
            set('spine', 0.12, 0, 0);
            set('head', 0.15, 0, 0);
          } else if (act === 'recline') {
            set('spine', -0.5, 0, 0);
            set('uLegL', -1.2, 0, 0.06); set('uLegR', -1.2, 0, -0.06);
            set('lLegL', 0.8, 0, 0); set('lLegR', 0.8, 0, 0);
            set('uArmL', -0.25, 0, 0.18); set('uArmR', -0.25, 0, -0.18);
            set('lArmL', -0.6, 0, 0); set('lArmR', -0.6, 0, 0);
            set('head', 0.25, 0, 0);
          } else if (act === 'sit_clap') {
            const k = Math.sin(it * 13 + this.seedPhase()) * 0.18;
            set('uArmL', -0.75, 0, 0.12 + k); set('uArmR', -0.75, 0, -0.12 - k);
            set('lArmL', -1.0, -0.5, 0); set('lArmR', -1.0, 0.5, 0);
          } else if (act === 'sit_touch') {
            // a tell: one hand goes up to the back of the neck, the eyes go down
            set('uArmR', -2.3, 0, -0.55); set('lArmR', -1.9, 0.3, 0);
            set('uArmL', -0.4, 0, 0.1); set('lArmL', -0.8, 0, 0);
            set('spine', 0.1, 0, 0); set('head', 0.22, 0, 0);
          } else if (act === 'sit_fold') {
            // arms folded, leaning back from the table
            set('uArmL', -0.35, 0.0, 0.25); set('uArmR', -0.35, 0, -0.25);
            set('lArmL', -1.75, -0.6, 0); set('lArmR', -1.75, 0.6, 0);
            set('spine', -0.12, 0, 0);
          } else if (act === 'sit_slump') {
            // the serum: heavy-limbed, head lolling, swaying a little
            set('uArmL', -0.1, 0, 0.16); set('uArmR', -0.1, 0, -0.16);
            set('lArmL', -0.3, 0, 0); set('lArmR', -0.3, 0, 0);
            set('spine', 0.22 + Math.sin(it * 0.9) * 0.05, 0, Math.sin(it * 0.6) * 0.06);
            set('head', 0.35 + Math.sin(it * 0.7) * 0.08, 0, Math.sin(it * 0.5) * 0.1);
          } else if (act === 'sit_strum') {
            this.strumArms(set, it);
          } else if (act === 'sit_cheer') {
            const k = Math.max(0, Math.sin(it * 7 + this.seedPhase())) * 0.4;
            set('uArmL', -2.7 + k, 0, 0.35); set('uArmR', -2.7 + k, 0, -0.35);
            set('lArmL', -0.3, 0, 0); set('lArmR', -0.3, 0, 0);
            set('spine', -0.1, 0, 0);
          } else {
            set('uArmL', -0.4, 0, 0.1); set('uArmR', -0.4, 0, -0.1);
            set('lArmL', -0.8, 0, 0); set('lArmR', -0.8, 0, 0);
            set('spine', 0.06, 0, 0);
          }
        } else if (act === 'clap') {
          const k = Math.sin(it * 13 + this.seedPhase()) * 0.18;
          set('uArmL', -0.75, 0, 0.12 + k); set('uArmR', -0.75, 0, -0.12 - k);
          set('lArmL', -1.0, -0.5, 0); set('lArmR', -1.0, 0.5, 0);
        } else if (act === 'cheer') {
          // fists up, pumping (Dauntless)
          const k = Math.max(0, Math.sin(it * 7 + this.seedPhase())) * 0.45;
          set('uArmL', -2.75 + k, 0, 0.35); set('uArmR', -2.75 + k, 0, -0.35);
          set('lArmL', -0.25, 0, 0); set('lArmR', -0.25, 0, 0);
          set('spine', -0.12, 0, 0); set('head', -0.25, 0, 0);
          hipY = Math.max(0, Math.sin(it * 7 + this.seedPhase())) * 0.05;
        } else if (act === 'cut') {
          // left palm up, the right hand drawing the knife across it
          set('uArmL', -0.95, 0, 0.1); set('lArmL', -0.6, 0.9, 0);
          set('uArmR', -0.9, 0, -0.2); set('lArmR', -1.0 + Math.sin(it * 2.2) * 0.25, -0.6, 0);
          set('head', 0.45, 0, 0); set('spine', 0.12, 0, 0);
        } else if (act === 'bowl') {
          // a hand held out over a bowl
          set('uArmL', -1.2, 0, 0.05); set('lArmL', -0.35, 0.6, 0);
          set('head', 0.4, 0, 0); set('spine', 0.18, 0, 0);
        } else if (act === 'fall') {
          // arms and legs flung out
          set('uArmL', -2.2 + Math.sin(it * 9) * 0.3, 0, 0.9); set('uArmR', -2.2 - Math.sin(it * 9) * 0.3, 0, -0.9);
          set('lArmL', -0.3, 0, 0); set('lArmR', -0.3, 0, 0);
          set('uLegL', -0.5 + Math.sin(it * 7) * 0.3, 0, 0.25); set('uLegR', -0.3 - Math.sin(it * 7) * 0.3, 0, -0.25);
          set('lLegL', 0.8, 0, 0); set('lLegR', 0.6, 0, 0);
          set('spine', -0.2, 0, 0); set('head', -0.3, 0, 0);
        } else if (act === 'hang') {
          // one hand up on a strap / handle, swaying with the train
          set('uArmR', -2.9, 0, -0.15); set('lArmR', -0.2, 0, 0);
          set('uArmL', 0.1, 0, 0.12);
          set('spine', Math.sin(it * 1.7) * 0.04, 0, Math.sin(it * 1.3) * 0.05);
        } else if (act === 'lie') {
          rootRx = -Math.PI / 2;
          set('uArmL', 0, 0, 0.12); set('uArmR', 0, 0, -0.12);
        } else if (act === 'sneak') {
          // crouched, still
          hipY = -0.34 * this.scaleY();
          set('uLegL', -1.05, 0, 0.12); set('uLegR', -1.05, 0, -0.12);
          set('lLegL', 1.55, 0, 0); set('lLegR', 1.55, 0, 0);
          set('footL', -0.5, 0, 0); set('footR', -0.5, 0, 0);
          set('spine', 0.4, 0, 0);
          set('uArmL', -0.55, 0, 0.15); set('uArmR', -0.55, 0, -0.15);
          set('lArmL', -0.9, 0, 0); set('lArmR', -0.9, 0, 0);
          set('head', -0.3, 0, 0);
        } else if (act === 'jump') {
          // airborne: knees tucked, arms out for balance
          set('uLegL', -0.75, 0, 0.06); set('uLegR', -0.35, 0, -0.06);
          set('lLegL', 1.15, 0, 0); set('lLegR', 0.8, 0, 0);
          set('footL', -0.3, 0, 0); set('footR', 0.1, 0, 0);
          set('uArmL', -0.55, 0, 0.45); set('uArmR', -0.55, 0, -0.45);
          set('lArmL', -0.5, 0, 0); set('lArmR', -0.5, 0, 0);
          set('spine', 0.08, 0, 0);
        } else if (act === 'crouch' || act === 'kneel' || act === 'cower') {
          hipY = -0.42;
          set('uLegL', -1.3, 0, 0.1); set('uLegR', -0.4, 0, -0.1);
          set('lLegL', 1.6, 0, 0); set('lLegR', 1.9, 0, 0);
          set('footL', -0.2, 0, 0); set('footR', 0.9, 0, 0);
          set('spine', 0.3, 0, 0);
          if (act === 'cower') { set('uArmL', -1.9, 0, 0.3); set('uArmR', -1.9, 0, -0.3); set('lArmL', -1.6, 0, 0); set('lArmR', -1.6, 0, 0); set('head', 0.4, 0, 0); }
          else { set('uArmR', -0.9, 0, -0.1); set('lArmR', -0.3, 0, 0); }
        } else if (act === 'type') {
          set('uArmL', -0.7, 0, 0.14); set('uArmR', -0.7, 0, -0.14);
          set('lArmL', -0.8 + Math.sin(it * 11) * 0.06, 0, 0); set('lArmR', -0.8 + Math.sin(it * 13 + 1) * 0.06, 0, 0);
          set('spine', 0.14, 0, 0);
          set('head', 0.22, 0, 0);
        } else if (act === 'guard') {
          set('uArmL', 0.3, 0, 0.05); set('uArmR', 0.3, 0, -0.05);
          set('lArmL', -0.5, 0, 0); set('lArmR', -0.5, 0, 0);
          set('chest', -0.03, 0, 0);
        } else if (act === 'arms_crossed' || act === 'lean') {
          set('uArmL', -0.35, 0.0, 0.25); set('uArmR', -0.35, 0, -0.25);
          set('lArmL', -1.75, -0.6, 0); set('lArmR', -1.75, 0.6, 0);
        } else if (act === 'clipboard' || act === 'read') {
          set('uArmL', -0.5, 0, 0.12); set('lArmL', -1.2, -0.4, 0);
          set('uArmR', -0.3, 0, -0.1); set('lArmR', -1.0, 0.3, 0);
          set('head', 0.3, 0, 0);
        } else if (act === 'badge') {
          // holding a badge out for the guard / tapping a keycard
          set('uArmR', -1.1, 0, -0.12); set('lArmR', -0.45, 0, 0);
          set('head', 0.18, 0, 0);
        } else if (act === 'wave') {
          set('uArmR', -2.6, 0, -0.3); set('lArmR', -0.4 + Math.sin(it * 8) * 0.4, 0, 0);
        } else if (act === 'point') {
          set('uArmR', -1.5, 0, -0.1); set('lArmR', -0.1, 0, 0);
        } else if (act === 'mop' || act === 'garden' || act === 'sweep') {
          set('spine', 0.35 + Math.sin(it * 2) * 0.1, 0, 0);
          set('uArmL', -0.8 + Math.sin(it * 2) * 0.3, 0, 0.1); set('uArmR', -0.9 + Math.sin(it * 2) * 0.3, 0, -0.1);
          set('lArmL', -0.5, 0, 0); set('lArmR', -0.5, 0, 0);
        } else if (act === 'aim') {
          // a pistol held out in both hands; s.aimPitch tilts the arms up or down
          const ap = U.clamp(s.aimPitch || 0, -0.6, 0.6);
          set('uArmR', -1.52 - ap, 0, 0.04); set('lArmR', -0.06, 0, 0);
          set('uArmL', -1.38 - ap, 0, -0.42); set('lArmL', -0.32, 0, 0);
          set('spine', 0.04, -0.12, 0); set('head', 0.08 - ap * 0.8, -0.05, 0);
          set('uLegL', -0.12, 0, 0.05); set('uLegR', 0.1, 0, -0.05);
          if (s.recoil) { add('uArmR', s.recoil * 0.5, 0, 0); add('uArmL', s.recoil * 0.45, 0, 0); add('head', -s.recoil * 0.1, 0, 0); }
        } else if (act === 'throw' || act === 'throwing') {
          // overarm knife throw; s.throwT 0..1 (or a slow loop for someone practising)
          const tt = act === 'throwing' ? (it * 0.45 + this.seedPhase()) % 1 : U.clamp(s.throwT || 0, 0, 1);
          const back = tt < 0.55 ? tt / 0.55 : 1 - (tt - 0.55) / 0.15;
          const fwd = tt < 0.55 ? 0 : U.clamp((tt - 0.55) / 0.2, 0, 1);
          set('uArmR', U.lerp(-0.6, -2.7, U.clamp(back, 0, 1)) + fwd * 1.6, 0, -0.15); set('lArmR', -1.4 + fwd * 1.3, 0, 0);
          set('uArmL', -1.1 + fwd * 0.5, 0, -0.2 + fwd * 0.4); set('lArmL', -0.4, 0, 0);
          set('spine', -0.12 * back + 0.25 * fwd, 0.35 * back - 0.4 * fwd, 0);
          set('uLegL', -0.3, 0, 0.06); set('uLegR', 0.25, 0, -0.06); set('lLegL', 0.2, 0, 0);
        } else if (act === 'strum') {
          this.strumArms(set, it);
          set('spine', 0, 0, Math.sin(it * 1.6) * 0.04);
          set('uLegL', 0, 0, 0.06); set('uLegR', 0, 0, -0.06);
        } else if (act === 'carry') {
          set('uArmL', -0.55, 0, 0.12); set('uArmR', -0.55, 0, -0.12);
          set('lArmL', -1.25, 0, 0); set('lArmR', -1.25, 0, 0);
          set('spine', -0.04, 0, 0);
        } else if (act === 'give') {
          // handing something over (a loaf, a parcel), then reaching back for the next
          const c = (it * 0.38 + this.seedPhase()) % 1;
          let e = c < 0.35 ? c / 0.35 : c < 0.6 ? 1 : 1 - (c - 0.6) / 0.4;
          e = e * e * (3 - 2 * e);
          set('uArmR', U.lerp(-0.5, -1.35, e), 0, -0.1); set('lArmR', U.lerp(-1.3, -0.25, e), 0, 0);
          set('uArmL', U.lerp(-0.45, -1.2, e), 0, 0.15); set('lArmL', U.lerp(-1.3, -0.35, e), 0, 0);
          set('spine', 0.08 + 0.14 * e, 0, 0); set('head', 0.2, 0, 0);
        } else if (act === 'pick') {
          // up into the branches for one, down into the basket on your hip with it
          const c = (it * 0.3 + this.seedPhase()) % 1;
          let e = c < 0.45 ? c / 0.45 : c < 0.6 ? 1 : 1 - (c - 0.6) / 0.4;
          e = e * e * (3 - 2 * e);
          set('uArmR', U.lerp(-0.9, -2.85, e), 0, -0.2); set('lArmR', U.lerp(-1.1, -0.2, e), 0, 0);
          set('uArmL', -0.25, 0, 0.3); set('lArmL', -1.3, 0, 0);
          set('head', U.lerp(0.2, -0.45, e), 0, 0); set('spine', U.lerp(0.05, -0.12, e), 0, 0);
        } else if (act === 'shelve') {
          // a book back onto a high shelf, another under the arm
          const e = 0.5 + 0.5 * Math.sin(it * 0.9 + this.seedPhase());
          set('uArmR', -2.2 - 0.4 * e, 0, -0.1); set('lArmR', -0.3, 0, 0);
          set('uArmL', -0.45, 0, 0.12); set('lArmL', -1.3, -0.3, 0);
          set('head', -0.35, 0, 0);
        } else if (act === 'argue') {
          // making a point: jabbing a finger, then palms open (well?)
          const c = (it * 0.5 + this.seedPhase()) % 2;
          if (c < 1.2) {
            const j = Math.max(0, Math.sin(c * Math.PI * 2.5)) * 0.25;
            set('uArmR', -1.4 + j, 0, -0.1); set('lArmR', -0.15 - j, 0, 0);
            set('uArmL', 0.05, 0, 0.1); set('lArmL', -0.3, 0, 0);
            set('spine', 0.1, 0, 0); set('head', -0.08, 0, 0);
          } else {
            set('uArmL', -0.7, 0.3, 0.5); set('uArmR', -0.7, -0.3, -0.5);
            set('lArmL', -0.9, 0, 0); set('lArmR', -0.9, 0, 0);
            set('spine', -0.05, 0, 0); set('head', 0.05, 0, 0.08);
          }
          add('head', Math.sin(it * 2.3) * 0.05, Math.sin(it * 1.1) * 0.08, 0);
        } else if (act === 'dance') {
          // round the fire: stepping side to side, hands up
          const ph = it * 2.6 + this.seedPhase(), sn = Math.sin(ph);
          hipY = Math.abs(Math.sin(ph)) * 0.05 - 0.04;
          set('hips', 0, sn * 0.25, 0); set('spine', 0, -sn * 0.1, sn * 0.12);
          set('uArmL', -2.3 + Math.sin(ph * 2) * 0.3, 0, 0.5); set('uArmR', -2.3 - Math.sin(ph * 2) * 0.3, 0, -0.5);
          set('lArmL', -0.4, 0, 0); set('lArmR', -0.4, 0, 0);
          set('uLegL', -0.35 * Math.max(0, sn), 0, 0.05); set('lLegL', 0.7 * Math.max(0, sn), 0, 0);
          set('uLegR', -0.35 * Math.max(0, -sn), 0, -0.05); set('lLegR', 0.7 * Math.max(0, -sn), 0, 0);
        } else if (act === 'pace') {
          // nervous fidget
          set('uArmL', -0.5, 0, 0.2); set('uArmR', -0.5, 0, -0.2);
          set('lArmL', -1.5 + Math.sin(it * 6) * 0.15, -0.5, 0); set('lArmR', -1.5, 0.5, 0);
          set('head', 0.25 + Math.sin(it * 0.8) * 0.1, 0, 0);
        }
        // standing about: the weight shifts from one leg to the other, and every few seconds a small
        // thing people do (a look round, a glance at the wrist, a hand to the back of the neck, a stretch)
        if (act === 'idle' && speed <= 0.05 && !s.talking && !s.fight && !s.still) {
          const sp = this.seedPhase(), w = Math.sin(it * 0.21 + sp * 3);
          add('hips', 0, 0, w * 0.045); add('spine', 0, 0, -w * 0.035); add('chest', 0, 0, -w * 0.015);
          if (w > 0) { add('uLegL', -0.06 * w, 0, 0); add('lLegL', 0.14 * w, 0, 0); } else { add('uLegR', 0.06 * w, 0, 0); add('lLegR', -0.14 * w, 0, 0); }
          const cyc = ((it * 0.085 + sp) % 1 + 1) % 1, win = (a, b) => (cyc > a && cyc < b ? Math.sin(((cyc - a) / (b - a)) * Math.PI) : 0);
          const look = win(0.02, 0.12), wrist = win(0.4, 0.47), neck = win(0.7, 0.77), stretch = win(0.9, 0.95);
          if (look) add('head', 0.03 * look, Math.sin(cyc * 60) * 0.5 * look, 0);
          if (wrist) { add('uArmL', -0.75 * wrist, 0, 0.1 * wrist); add('lArmL', -1.3 * wrist, 0.6 * wrist, 0); add('head', 0.35 * wrist, 0.15 * wrist, 0); }
          if (neck) { add('uArmR', -2.0 * neck, 0, -0.35 * neck); add('lArmR', -1.7 * neck, 0.3 * neck, 0); add('head', 0.12 * neck, 0, 0); }
          if (stretch) { add('uArmL', -0.3 * stretch, 0, 0.5 * stretch); add('uArmR', -0.3 * stretch, 0, -0.5 * stretch); add('spine', -0.12 * stretch, 0, 0); add('head', -0.2 * stretch, 0, 0); }
        }
        // asleep: a slow breath
        if (act === 'lie') add('chest', Math.sin(it * 1.3) * 0.04, 0, 0);
        if (s.talking && !/^sit/.test(act) && act !== 'work' && act !== 'lie' && act !== 'recline') {
          add('uArmR', -0.35 - Math.max(0, Math.sin(it * 3.1)) * 0.5, 0, -0.1);
          add('lArmR', -0.6 - Math.sin(it * 4.3) * 0.3, 0, 0);
          if (Math.sin(it * 1.3) > 0.3) { add('uArmL', -0.4, 0, 0.1); add('lArmL', -0.7, 0, 0); }
          add('head', Math.sin(it * 2.3) * 0.05, Math.sin(it * 1.1) * 0.08, 0);
        } else if (s.talking) {
          add('head', Math.sin(it * 2.3) * 0.05, Math.sin(it * 1.1) * 0.06, 0);
        }
      }
      // head look-at (relative yaw/pitch)
      this.look.tYaw = U.clamp(s.lookYaw || 0, -1.1, 1.1);
      this.look.tPitch = U.clamp(s.lookPitch || 0, -0.5, 0.5);
      this.look.yaw = U.damp(this.look.yaw, this.look.tYaw, 6, dt);
      this.look.pitch = U.damp(this.look.pitch, this.look.tPitch, 6, dt);
      add('head', this.look.pitch, this.look.yaw * 0.7, 0);
      add('neck', 0, this.look.yaw * 0.3, 0);

      // apply with damping (fighting snaps between poses much faster)
      const k = 1 - Math.exp(-(s.fight ? 30 : s.pk ? 24 : 14) * dt);
      for (let i = 1; i < BONES.length; i++) {
        const b = this.bones[i];
        b.rotation.x += (P[i * 3] - b.rotation.x) * k;
        b.rotation.y += (P[i * 3 + 1] - b.rotation.y) * k;
        b.rotation.z += (P[i * 3 + 2] - b.rotation.z) * k;
      }
      this.hipY += (hipY - this.hipY) * k;
      this.hipZ += (hipZ - this.hipZ) * k;
      const hips = this.bones[BI.hips];
      hips.position.y = this.bindPos[BI.hips].y + this.hipY / this.mesh.scale.y;
      hips.position.z = this.bindPos[BI.hips].z + this.hipZ;
      const lying = act === 'lie';
      if (s.pk) {
        // a roll or a flip turns the whole body over about its middle (pkPivot up from the feet),
        // set outright: easing towards it would unwind a full turn backwards
        const th = Math.atan2(Math.sin(pkSpin), Math.cos(pkSpin)), c = pkPivot * this.scale;
        this.mesh.rotation.x = th;
        this.mesh.position.y = c * (1 - Math.cos(th));
        this.mesh.position.z = -c * Math.sin(th);
      } else {
        this.mesh.rotation.x += (rootRx - this.mesh.rotation.x) * k;
        this.mesh.position.y += ((lying ? (s.seatY || 0.6) + 0.12 : 0) - this.mesh.position.y) * k;
        this.mesh.position.z += ((lying ? 0.85 * this.scale : 0) - this.mesh.position.z) * k;
      }
      // (no blob shadow in the air: it would hang under the feet)
      this.shadow.visible = !this.noShadow && !lying && !this.shadowFar && !(s.pk && s.pk.air);
    }
    /**
     * Free-running. s.pk = { move, t, air } with t running 0 → 1 through the move:
     *   leap · drop · land · roll · vault · kong · climb · flip   (see PK_MOVES)
     * Where the body goes (the arc, the landing) is the caller's: DV.Freerun moves the root.
     */
    parkourPose(pk, set) {
      const keys = PK_MOVES[pk.move] || PK_MOVES.land;
      const t = U.clamp(pk.t || 0, 0, 1);
      let i = 0;
      while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
      const a = keys[i], b = keys[i + 1];
      const u = b[0] > a[0] ? U.clamp((t - a[0]) / (b[0] - a[0]), 0, 1) : 1;
      const w = u * u * (3 - 2 * u);
      const A = PK_POSES[a[1]], B = PK_POSES[b[1]];
      for (const n of PK_BONES) {
        const p = A[n] || ZERO3, q = B[n] || ZERO3;
        set(n, p[0] + (q[0] - p[0]) * w, p[1] + (q[1] - p[1]) * w, p[2] + (q[2] - p[2]) * w);
      }
      const ea = a[2] || {}, eb = b[2] || {};
      const sa = ea.sp || 0, sb = eb.sp === undefined ? sa : eb.sp;
      return {
        hipY: ((A.hy || 0) + ((B.hy || 0) - (A.hy || 0)) * w) * this.scaleY(),
        spin: sa + (sb - sa) * u,
        pivot: ea.pv || eb.pv || 0.5,
      };
    }
    /**
     * The fighting family. s.fight = { move, ext, side, sway } where move is
     * stance | jab | cross | hook | kick | block | dodge | hit | stagger | getup | win,
     * ext runs from about -0.4 (chambered: the tell) through 1 (fully extended) back to 0,
     * side is the dodge / flinch direction, and s.speed / s.strafe drive the footwork.
     * Left foot and left hand lead.
     */
    fightPose(dt, s, set, add) {
      const f = s.fight, it = this.idleT, mv = f.move || 'stance';
      const e = f.ext || 0, ex = Math.max(0, e), ch = Math.max(0, -e); // extension / chamber
      const sy = this.scaleY();
      let hipY = (-0.075 + Math.sin(it * 6.2 + this.seedPhase()) * 0.012) * sy; // bouncing on the balls of the feet
      // stance: lead shoulder turned toward the opponent, knees soft, fists up by the chin
      set('hips', 0, -0.32, 0);
      set('spine', 0.12, -0.06, 0);
      set('chest', 0, 0, 0);
      set('uLegL', -0.32, 0.3, 0.06); set('lLegL', 0.42, 0, 0); set('footL', -0.1, 0, 0);
      set('uLegR', 0.24, 0.3, -0.14); set('lLegR', 0.5, 0, 0); set('footR', -0.3, 0, 0);
      set('uArmL', -0.62, 0, -0.2); set('lArmL', -2.15, 0, 0);
      set('uArmR', -0.5, 0, 0.32); set('lArmR', -2.3, 0, 0);
      set('head', 0.14, 0.2, 0);
      // footwork: a short shuffle when moving, legs opening and closing when stepping sideways
      const spd = s.speed || 0;
      if (spd > 0.08) {
        this.phase += spd * 6.5 * dt;
        const ph = this.phase, a = U.clamp(spd / 1.6, 0.3, 1);
        add('uLegL', Math.sin(ph) * 0.28 * a, 0, Math.abs(s.strafe || 0) * Math.sin(ph) * 0.18);
        add('uLegR', -Math.sin(ph) * 0.28 * a, 0, -Math.abs(s.strafe || 0) * Math.sin(ph) * 0.18);
        add('lLegL', Math.max(0, Math.sin(ph + 1)) * 0.45 * a, 0, 0);
        add('lLegR', Math.max(0, -Math.sin(ph + 1)) * 0.45 * a, 0, 0);
        hipY -= Math.abs(Math.cos(ph)) * 0.025 * sy;
      }
      switch (mv) {
        case 'jab': // lead hand straight out; the shoulder rolls in behind it
          set('uArmL', U.lerp(-0.62, -1.52, ex) + ch * 0.25, 0, U.lerp(-0.2, -0.05, ex));
          set('lArmL', U.lerp(-2.15, -0.12, ex) - ch * 0.25, 0, 0);
          add('hips', 0, -0.16 * ex, 0); add('spine', 0.06 * ex, -0.1 * ex, 0);
          add('head', 0, -0.1 * ex, 0);
          break;
        case 'cross': // rear hand: pulled back and turned away first (the tell), then thrown through
          set('uArmR', U.lerp(-0.5, -1.5, ex) + ch * 0.55, 0, U.lerp(0.32, 0.12, ex));
          set('lArmR', U.lerp(-2.3, -0.1, ex) - ch * 0.15, 0, 0);
          add('hips', 0, 0.75 * ex - 0.3 * ch, 0); add('spine', 0.14 * ex, 0.3 * ex - 0.2 * ch, 0);
          add('uLegR', -0.15 * ex, 0, 0); add('footR', 0.25 * ex, 0, 0);
          break;
        case 'hook': // lead hand swings round at shoulder height, elbow up
          set('uArmL', U.lerp(-0.62, -1.25, ex), U.lerp(0, -0.4, ex), U.lerp(-0.2, 0.95, ex) + ch * 0.5);
          set('lArmL', U.lerp(-2.15, -1.5, ex), 0, 0);
          add('hips', 0, 0.55 * ex - 0.35 * ch, 0); add('spine', 0.08, 0.35 * ex - 0.25 * ch, 0);
          break;
        case 'kick': { // rear knee up (the tell), then the foot driven straight out
          const kn = Math.max(ch * 2.2, ex);
          set('uLegR', U.lerp(0.24, -1.55, Math.min(1, kn)), 0, -0.05);
          set('lLegR', ex > 0 ? U.lerp(1.9, 0.12, ex) : U.lerp(0.5, 1.9, Math.min(1, ch * 2.2)), 0, 0);
          set('footR', U.lerp(-0.3, 0.45, ex), 0, 0);
          add('spine', -0.32 * Math.min(1, kn), 0.15, 0);
          add('hips', 0, 0.25 * Math.min(1, kn), 0);
          add('uArmL', 0.2 * ex, 0, 0.2 * ex); add('uArmR', 0.35 * ex, 0, -0.25 * ex);
          hipY += 0.04 * sy * Math.min(1, kn);
          break;
        }
        case 'block': // forearms up in front of the face, chin tucked
          set('uArmL', -0.98, 0, -0.42); set('lArmL', -2.55, 0, 0);
          set('uArmR', -0.98, 0, 0.42); set('lArmR', -2.55, 0, 0);
          add('spine', 0.22, 0.2, 0); add('head', 0.22, -0.15, 0);
          hipY -= 0.05 * sy;
          break;
        case 'dodge': { // slip to one side (or lean back from it)
          const sd = f.side || 0;
          if (sd) { add('spine', 0.2, 0, -0.45 * sd * ex); add('hips', 0, 0, -0.18 * sd * ex); add('uLegL', 0, 0, 0.25 * ex); add('uLegR', 0, 0, -0.25 * ex); add('head', 0, 0, -0.25 * sd * ex); }
          else { add('spine', -0.35 * ex, 0, 0); add('head', -0.2 * ex, 0, 0); add('uLegR', 0.35 * ex, 0, 0); }
          hipY -= 0.08 * sy * ex;
          break;
        }
        case 'hit': { // head snapped back, guard knocked open
          const sd = f.side || 1;
          add('head', -0.55 * ex, 0.35 * sd * ex, 0.2 * sd * ex); add('spine', -0.3 * ex, 0.2 * sd * ex, 0.12 * sd * ex);
          set('uArmL', -0.3, 0, 0.25 * ex); set('lArmL', U.lerp(-2.15, -1.2, ex), 0, 0);
          set('uArmR', -0.25, 0, -0.25 * ex); set('lArmR', U.lerp(-2.3, -1.1, ex), 0, 0);
          break;
        }
        case 'stagger': { // guard down, swaying, knees going
          const w = Math.sin(it * 5.3) * 0.22;
          set('uArmL', -0.15, 0, 0.12); set('lArmL', -0.7, 0, 0);
          set('uArmR', -0.1, 0, -0.12); set('lArmR', -0.6, 0, 0);
          add('spine', 0.18, 0, w); add('head', 0.35, 0, w * 1.3);
          add('uLegL', -0.2, 0, 0); add('lLegL', 0.4, 0, 0); add('lLegR', 0.5, 0, 0);
          hipY -= 0.12 * sy;
          break;
        }
        case 'getup': // on one knee, pushing back up
          hipY = U.lerp(-0.45, -0.08, ex) * sy;
          set('uLegL', U.lerp(-1.3, -0.32, ex), 0, 0.1); set('lLegL', U.lerp(1.6, 0.42, ex), 0, 0);
          set('uLegR', U.lerp(-0.4, 0.24, ex), 0, -0.1); set('lLegR', U.lerp(1.9, 0.5, ex), 0, 0); set('footR', U.lerp(0.9, -0.3, ex), 0, 0);
          set('spine', U.lerp(0.5, 0.12, ex), 0, 0); set('uArmR', -0.9 * (1 - ex), 0, -0.1);
          break;
        case 'win': // arms up
          set('uArmL', -2.7, 0, 0.3); set('lArmL', -0.3, 0, 0); set('uArmR', -2.7, 0, -0.3); set('lArmR', -0.3, 0, 0);
          set('hips', 0, 0, 0); set('spine', -0.1, 0, 0); set('head', -0.25, 0, 0);
          hipY = Math.max(0, Math.sin(it * 7)) * 0.04;
          break;
      }
      return { hipY };
    }
    // a fixed per-character phase so a crowd doesn't clap or cheer in unison
    // a guitar across the body: the left hand on the neck, the right strumming
    strumArms(set, it) {
      set('uArmL', -0.9, 0, 0.55); set('lArmL', -1.35, 0.3, 0);
      set('uArmR', -0.45, 0, -0.2); set('lArmR', -1.5 + Math.sin(it * 9) * 0.18, 0, 0);
      set('head', 0.25 + Math.sin(it * 1.2) * 0.05, 0, 0.06);
    }
    seedPhase() {
      if (this._ph === undefined) this._ph = Math.random() * Math.PI * 2;
      return this._ph;
    }
    scaleY() {
      return this.mesh ? this.mesh.scale.y : 1;
    }
  }

  /* ----------------------------- generation ----------------------------- */
  function fromFaction(faction, sex, seed, overrides) {
    const r = U.rng(seed || 'x');
    const st = DV.FactionStyle[faction] || DV.FactionStyle.neutral;
    const fem = sex === 'f';
    const app = {
      sex,
      seed: typeof seed === 'string' ? U.hashString(seed) : seed,
      height: 0.94 + r() * 0.12,
      build: r.pick(['slim', 'average', 'average', 'athletic', 'heavy', 'average', 'slim']),
      skin: r.pick(DV.SkinTones),
      face: r.int(0, FACES.length - 1),
      eyes: r.pick(DV.EyeColors),
      hair: r.pick(fem ? st.hairF : st.hairM),
      hairColor: r.pick(DV.HairColors.slice(0, 9)).hex,
      age: 16,
      beard: 'none',
      outfit: {
        top: r.pick(st.tops),
        topColor: r.pick(st.topColors),
        topColor2: null,
        bottom: r.pick(fem ? st.bottomsF : st.bottoms),
        bottomColor: r.pick(st.bottomColors),
        shoes: faction === 'dauntless' || faction === 'factionless' ? 'boots' : r.chance(0.2) ? 'boots' : 'shoes',
        shoeColor: r.pick(st.shoeColors),
        acc: [],
        tattoos: [],
        piercings: [],
      },
    };
    const o = app.outfit;
    if (faction === 'candor') {
      // black & white contrast: pick an inner/outer opposite
      const dark = r.chance(0.6);
      o.topColor = dark ? r.pick(['#1b1b1b', '#141414']) : r.pick(['#f0efe9', '#e6e5df']);
      o.topColor2 = dark ? '#f0efe9' : '#1b1b1b';
      o.bottomColor = r.chance(0.8) ? '#151515' : '#ebeae4';
      if (o.top === 'blazer' || r.chance(0.4)) o.acc.push('tie');
      o.tieColor = dark ? '#101010' : '#151515';
    }
    if (faction === 'erudite') {
      o.topColor2 = r.chance(0.5) ? '#e8eef5' : '#8fb6e3';
      if (r.chance(st.glassesChance)) o.acc.push('glasses');
      if (r.chance(0.2)) o.acc.push('tie'), (o.tieColor = '#1f3d68');
    }
    if (faction === 'amity') {
      o.topColor2 = r.pick(['#e0a526', '#d9822b', '#f0d890']);
      if (r.chance(0.5)) o.acc.push('flower'), (o.flowerColor = r.pick(['#e8c030', '#e05030', '#f0f0e0']));
    }
    if (faction === 'abnegation') {
      o.topColor2 = '#a8a79f';
      if (r.chance(st.glassesChance)) o.acc.push('glasses');
    }
    if (faction === 'dauntless') {
      o.topColor2 = r.pick(['#3a1d1a', '#1a1a1a', '#5a1a14', '#2a2a30']);
      if (r.chance(st.dyeChance)) app.hairDye = r.pick(st.dyeColors);
      if (r.chance(st.tattooChance)) o.tattoos = r.pick([['armL'], ['armR'], ['armL', 'armR'], ['armR', 'neck'], ['neck']]);
      if (r.chance(st.piercingChance)) o.piercings = r.pick([['ear'], ['ear', 'brow'], ['nose'], ['lip', 'ear'], ['brow']]);
      if (o.top === 'tank' || o.top === 'tshirt') o.tattoos = o.tattoos.length ? o.tattoos : ['armL'];
    }
    if (faction === 'factionless') {
      o.acc.push('patches');
      o.topColor2 = r.pick(st.topColors);
      if (!fem && r.chance(0.5)) app.beard = r.pick(['stubble', 'short', 'full']);
    }
    if (!fem && faction !== 'abnegation' && faction !== 'factionless' && r.chance(0.08)) app.beard = 'stubble';
    if (overrides) deepAssign(app, overrides);
    if (app.age > 30 && overrides && !overrides.hairColor && r.chance(0.4)) app.hairColor = r.pick(['#8d8a85', '#5a4a3a', '#d9d7d2']);
    return app;
  }
  function deepAssign(dst, src) {
    for (const k in src) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') deepAssign(dst[k], src[k]);
      else dst[k] = src[k];
    }
    return dst;
  }

  // Outfit presets the player can wear (clothing items)
  const OUTFITS = {
    neutral: { top: 'shirt', topColor: '#cfc9bb', topColor2: '#e3ddcf', bottom: 'pants', bottomColor: '#8f8a7f', shoes: 'shoes', shoeColor: '#4b4740', acc: [] },
    abnegation: { top: 'robe', topColor: '#7d7d78', topColor2: '#a8a79f', bottom: 'pants', bottomColor: '#5f5f5b', shoes: 'shoes', shoeColor: '#3b3a37', acc: [] },
    dauntless: { top: 'jacket', topColor: '#1d1d1f', topColor2: '#3a1d1a', bottom: 'pants', bottomColor: '#1a1a1c', shoes: 'boots', shoeColor: '#121212', acc: [] },
    erudite: { top: 'blazer', topColor: '#2f5f9e', topColor2: '#e8eef5', bottom: 'pants', bottomColor: '#1d2f4e', shoes: 'shoes', shoeColor: '#1b1b22', acc: [] },
    candor: { top: 'blazer', topColor: '#1b1b1b', topColor2: '#f0efe9', bottom: 'pants', bottomColor: '#151515', shoes: 'shoes', shoeColor: '#0f0f0f', acc: ['tie'] },
    amity: { top: 'tunic', topColor: '#c0392b', topColor2: '#e0a526', bottom: 'pants', bottomColor: '#7a5531', shoes: 'shoes', shoeColor: '#5a3e24', acc: [] },
  };

  DV.Character = {
    BONES,
    FACES,
    HAIRSTYLES,
    BODY_TYPES: Object.keys(BODY),
    OUTFITS,
    Model: CharacterModel,
    create(app) {
      return new CharacterModel(app);
    },
    fromFaction,
    shadeHex,
    deepAssign,
  };
})();
