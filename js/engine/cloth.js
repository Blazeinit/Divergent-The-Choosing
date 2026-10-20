/* ==========================================================================
   DIVERGENT — cloth
   A garment that hangs free, simulated: the skirts of a long coat as a grid of
   points (rings round the body, from the waist down to the hem), the top two
   rings held at the hips, the rest falling under gravity, each tied to its
   neighbours by a length it keeps (down the coat, round it, and a softer one
   two rows down so it doesn't fold like paper), pulled gently back toward the
   shape it was cut to (leather holds a shape), and pushed out of the body:
   the hips, the thighs and shins, the forearms and hands (capsules along the
   bones). So it trails when you set off, swings on when you stop, opens round
   a stride, parts at the front over the legs and at the back vent, and never
   goes through the person wearing it.

   It's its own mesh (one draw call), drawn both sides: the outside the cloth,
   the inside its lining, darker, so it reads as a coat someone has on, not a
   shape painted on them.

     DV.Cloth.skirt(model, spec)   → { update(dt), dispose() }  (js/engine/character.js)
       spec: { y0, y1 (waist, hem: bind space), rx0, rz0, rx1, rz1 (radii there), cols, rows,
               gap (the front opening, radians), vent (back vent from this row), color, lining,
               uv: [u0, v0, u1, v1] (the cloth in the character's texture) }
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const STEP = 1 / 60, ITER = 4, GRAV = 9.8, DAMP = 0.982;
  const PIN_ROWS = 2;
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const mInv = new THREE.Matrix4();

  class Skirt {
    constructor(model, o) {
      this.m = model;
      this.o = o;
      const C = (this.C = o.cols || 16), R = (this.R = o.rows || 9), n = C * R;
      this.rest = new Float32Array(n * 3); // where each point was cut: bind space (the mesh's own, unscaled)
      this.p = new Float32Array(n * 3); // now (world)
      this.q = new Float32Array(n * 3); // a step ago
      this.t = new Float32Array(n * 3); // where it would be, held rigidly to the hips (the shape it keeps to)
      this.inv = new Float32Array(n); // 0: held
      this.acc = 0;
      this.ready = false;
      const gap = o.gap || 0.5, ang = (c) => gap / 2 + ((Math.PI * 2 - gap) * c) / (C - 1);
      for (let r = 0; r < R; r++) {
        const k = r / (R - 1), f = Math.pow(k, 1.3);
        const rx = U.lerp(o.rx0, o.rx1, f), rz = U.lerp(o.rz0, o.rz1, f);
        for (let c = 0; c < C; c++) {
          const i = r * C + c, a = ang(c);
          // (a ragged hem: torn short here and there)
          const y = U.lerp(o.y0, o.y1, k) + (o.ragged && r === R - 1 ? [0, 0.07, 0.02, 0.1, 0, 0.04, 0.12, 0.03][c % 8] : 0);
          this.rest[i * 3] = Math.sin(a) * rx;
          this.rest[i * 3 + 1] = y;
          this.rest[i * 3 + 2] = Math.cos(a) * rz;
          this.inv[i] = r < PIN_ROWS ? 0 : 1;
        }
      }
      // the lengths it keeps: down, round (not across the front opening, nor the back vent below
      // its top), across the diagonals, and two rows down (softer: its stiffness)
      const cons = [];
      const link = (i, j, s) => cons.push(i, j, Math.hypot(this.rest[i * 3] - this.rest[j * 3], this.rest[i * 3 + 1] - this.rest[j * 3 + 1], this.rest[i * 3 + 2] - this.rest[j * 3 + 2]), s);
      const back = (C - 1) / 2; // (the back's middle, between two columns when C is even)
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const i = r * C + c;
        if (r + 1 < R) link(i, i + C, 1);
        if (r + 2 < R) link(i, i + 2 * C, 0.35);
        const vent = r >= (o.vent || R) && Math.abs(c + 0.5 - back) < 0.6;
        if (c + 1 < C && !vent) {
          link(i, i + 1, 1);
          if (r + 1 < R) { link(i, i + C + 1, 0.5); link(i + 1, i + C, 0.5); }
        }
      }
      this.cons = new Float32Array(cons);
      // the mesh
      const geo = new THREE.BufferGeometry();
      this.pos = new Float32Array(n * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      const uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
      const base = U.hexToRgb(o.color || '#1d1d1f'), trim = o.trim ? U.hexToRgb(o.trim) : null, [u0, w0, u1, w1] = o.uv || [0.75, 0.97, 0.75, 0.97];
      const patch = (r, c) => o.patches && ((r >= 3 && r <= 4 && c >= 3 && c <= 4) || (r >= 5 && r <= 6 && c >= 11 && c <= 12));
      const PATCH = [[0.42, 0.36, 0.26], [0.3, 0.33, 0.38]];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const i = r * C + c;
        uv[i * 2] = u0 + ((u1 - u0) * c) / (C - 1);
        uv[i * 2 + 1] = w0 + (w1 - w0) * U.clamp(this.rest[i * 3 + 1] / 1.9, 0, 1);
        // (darker toward the hem and along the front edges: the weight of it, the edge's thickness)
        const edge = c === 0 || c === C - 1;
        const k = (r === R - 1 ? 0.78 : 1 - (r / R) * 0.08) * (edge && !trim ? 0.84 : 1);
        const cc = edge && trim ? trim : patch(r, c) ? PATCH[c < 8 ? 0 : 1] : base;
        col[i * 3] = cc[0] * k; col[i * 3 + 1] = cc[1] * k; col[i * 3 + 2] = cc[2] * k;
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const idx = [];
      for (let r = 0; r + 1 < R; r++) for (let c = 0; c + 1 < C; c++) {
        const a = r * C + c, b = a + 1, d = a + C, e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
      // (wound to face outward: check one, flip all if it faces in)
      {
        const P = (i) => v1.set(this.rest[i * 3], this.rest[i * 3 + 1], this.rest[i * 3 + 2]).clone();
        const a = P(idx[0]), b = P(idx[1]), c = P(idx[2]);
        const nrm = b.sub(a).cross(c.sub(a)), mid = a.clone();
        if (nrm.x * mid.x + nrm.z * mid.z < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
      }
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const lining = new THREE.Color(o.lining || '#3a1616');
      const mat = new THREE.MeshLambertMaterial({ map: model.bodyMat.map, vertexColors: true, side: THREE.DoubleSide });
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.lining = { value: lining };
        sh.fragmentShader = 'uniform vec3 lining;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = lining * (0.55 + 0.45 * diffuseColor.g / max(vColor.g, 0.05));');
      };
      mat.customProgramCacheKey = () => 'cloth-lined';
      this.mat = mat;
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.name = 'cloth';
      this.mesh.frustumCulled = false;
      model.root.add(this.mesh);
      // what the cloth is kept out of: [bone a, bone b (or null: a point), radius, reach past b]
      this.caps = [
        ['hips', 'spine', 0.14, 0], ['uLegL', 'lLegL', 0.082, 0], ['uLegR', 'lLegR', 0.082, 0],
        ['lLegL', 'footL', 0.066, 0], ['lLegR', 'footR', 0.066, 0],
        ['lArmL', 'handL', 0.05, 0.6], ['lArmR', 'handR', 0.05, 0.6],
      ].map(([a, b, r, x]) => ({ a: model.bones[DV.Character.BI[a]], b: model.bones[DV.Character.BI[b]], r, x, A: new THREE.Vector3(), B: new THREE.Vector3() }));
      this.hips = model.bones[DV.Character.BI.hips];
      this.hipsBind = new THREE.Vector3().fromArray(model.bp.hips);
    }
    // where the cut shape would be now, held rigidly to the hips (world)
    targets() {
      const M = this.hips.matrixWorld, n = this.C * this.R;
      for (let i = 0; i < n; i++) {
        v1.set(this.rest[i * 3] - this.hipsBind.x, this.rest[i * 3 + 1] - this.hipsBind.y, this.rest[i * 3 + 2] - this.hipsBind.z).applyMatrix4(M);
        this.t[i * 3] = v1.x; this.t[i * 3 + 1] = v1.y; this.t[i * 3 + 2] = v1.z;
      }
    }
    reset() {
      this.p.set(this.t); this.q.set(this.t);
      this.ready = true;
    }
    update(dt) {
      const m = this.m;
      if (!m.root.visible) { this.ready = false; return; }
      m.root.updateMatrixWorld(true);
      this.targets();
      // (first time, or put somewhere else: start hanging as cut)
      if (!this.ready || Math.hypot(this.p[0] - this.t[0], this.p[2] - this.t[2]) > 1.5) this.reset();
      const sc = m.scale || 1;
      for (const c of this.caps) {
        c.a.getWorldPosition(c.A); c.b.getWorldPosition(c.B);
        if (c.x) c.B.addScaledVector(v1.subVectors(c.B, c.A), c.x);
        c.rr = (c.r + 0.012) * sc;
      }
      this.floor = m.root.getWorldPosition(v3).y + 0.02;
      this.acc = Math.min(this.acc + dt, STEP * 3);
      while (this.acc >= STEP) { this.step(); this.acc -= STEP; }
      // into the root's frame for drawing
      mInv.copy(m.root.matrixWorld).invert();
      const n = this.C * this.R, P = this.p, O = this.pos;
      for (let i = 0; i < n; i++) {
        v1.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(mInv);
        O[i * 3] = v1.x; O[i * 3 + 1] = v1.y; O[i * 3 + 2] = v1.z;
      }
      const g = this.mesh.geometry;
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
    }
    step() {
      const P = this.p, Q = this.q, T = this.t, W = this.inv, n = this.C * this.R, R = this.R, C = this.C;
      const gy = -GRAV * STEP * STEP;
      for (let i = 0; i < n; i++) {
        const k = i * 3;
        if (!W[i]) { Q[k] = P[k]; Q[k + 1] = P[k + 1]; Q[k + 2] = P[k + 2]; P[k] = T[k]; P[k + 1] = T[k + 1]; P[k + 2] = T[k + 2]; continue; }
        const x = P[k], y = P[k + 1], z = P[k + 2];
        P[k] += (x - Q[k]) * DAMP; P[k + 1] += (y - Q[k + 1]) * DAMP + gy; P[k + 2] += (z - Q[k + 2]) * DAMP;
        Q[k] = x; Q[k + 1] = y; Q[k + 2] = z;
      }
      const L = this.cons, nc = L.length;
      for (let it = 0; it < ITER; it++) {
        // the lengths
        for (let j = 0; j < nc; j += 4) {
          const a = L[j] * 3, b = L[j + 1] * 3, rest = L[j + 2], s = L[j + 3];
          const wa = W[L[j]], wb = W[L[j + 1]], w = wa + wb;
          if (!w) continue;
          const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
          const f = ((d - rest) / d) * s / w;
          P[a] += dx * f * wa; P[a + 1] += dy * f * wa; P[a + 2] += dz * f * wa;
          P[b] -= dx * f * wb; P[b + 1] -= dy * f * wb; P[b + 2] -= dz * f * wb;
        }
        // back toward the shape it was cut to (more so higher up: the waist holds, the hem moves)
        for (let i = C * PIN_ROWS; i < n; i++) {
          const r = Math.floor(i / C), s = 0.05 * (1 - (r / R) * 0.75), k = i * 3;
          P[k] += (T[k] - P[k]) * s; P[k + 1] += (T[k + 1] - P[k + 1]) * s; P[k + 2] += (T[k + 2] - P[k + 2]) * s;
        }
        // out of the body, and above the floor
        for (const c of this.caps) {
          const ax = c.A.x, ay = c.A.y, az = c.A.z, bx = c.B.x - ax, by = c.B.y - ay, bz = c.B.z - az;
          const bb = bx * bx + by * by + bz * bz || 1e-6, rr = c.rr;
          for (let i = C * PIN_ROWS; i < n; i++) {
            const k = i * 3, px = P[k] - ax, py = P[k + 1] - ay, pz = P[k + 2] - az;
            const t = U.clamp((px * bx + py * by + pz * bz) / bb, 0, 1);
            const dx = px - bx * t, dy = py - by * t, dz = pz - bz * t, d2 = dx * dx + dy * dy + dz * dz;
            if (d2 >= rr * rr) continue;
            const d = Math.sqrt(d2) || 1e-6, push = (rr - d) / d;
            P[k] += dx * push; P[k + 1] += dy * push; P[k + 2] += dz * push;
          }
        }
        for (let i = C * PIN_ROWS; i < n; i++) if (P[i * 3 + 1] < this.floor) P[i * 3 + 1] = this.floor;
      }
    }
    dispose() {
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mat.dispose();
    }
  }

  DV.Cloth = {
    skirt(model, spec) { return new Skirt(model, spec); },
  };
})();
