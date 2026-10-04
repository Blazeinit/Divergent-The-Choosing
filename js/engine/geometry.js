/* ==========================================================================
   DIVERGENT — StaticBatch
   Collects static environment geometry, bakes per-vertex lighting into
   vertex colors (PS2/Dreamcast style), and merges everything that shares a
   material into a single mesh. One draw call per material per zone.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  const _v = new THREE.Vector3();
  const _n = new THREE.Vector3();

  class StaticBatch {
    /**
     * @param {object} lighting object with sample(px,py,pz,nx,ny,nz,roomId) -> [r,g,b]
     */
    constructor(lighting) {
      this.lighting = lighting;
      this.groups = new Map();
      this.stack = [];
      this.matrix = new THREE.Matrix4();
      this.normalMatrix = new THREE.Matrix3();
      this.room = null;
      this.maxEdge = 0; // >0 subdivides quads larger than this (for lighting gradients)
      this.triCount = 0;
    }

    /* ------------------------- transform stack ------------------------- */
    push(x, y, z, rotY, scale) {
      this.stack.push(this.matrix.clone());
      const m = new THREE.Matrix4();
      m.compose(
        new THREE.Vector3(x || 0, y || 0, z || 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY || 0, 0)),
        new THREE.Vector3(scale || 1, scale || 1, scale || 1)
      );
      this.matrix.multiply(m);
      this.normalMatrix.getNormalMatrix(this.matrix);
      return this;
    }
    pushEuler(x, y, z, rx, ry, rz) {
      this.stack.push(this.matrix.clone());
      const m = new THREE.Matrix4();
      m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
      this.matrix.multiply(m);
      this.normalMatrix.getNormalMatrix(this.matrix);
      return this;
    }
    pop() {
      this.matrix = this.stack.pop() || new THREE.Matrix4();
      this.normalMatrix.getNormalMatrix(this.matrix);
      return this;
    }

    group(mat) {
      let g = this.groups.get(mat.uuid);
      if (!g) {
        g = { mat, pos: [], nor: [], uv: [], col: [] };
        this.groups.set(mat.uuid, g);
      }
      return g;
    }

    /* ------------------------- primitives ------------------------- */
    // Adds one triangle given local-space positions & uvs. Normal is computed (flat).
    tri(mat, a, b, c, ua, ub, uc, tint) {
      const g = this.group(mat);
      const pa = _v.set(a[0], a[1], a[2]).applyMatrix4(this.matrix).toArray();
      const pb = _v.set(b[0], b[1], b[2]).applyMatrix4(this.matrix).toArray();
      const pc = _v.set(c[0], c[1], c[2]).applyMatrix4(this.matrix).toArray();
      // flat normal in world space
      const e1x = pb[0] - pa[0], e1y = pb[1] - pa[1], e1z = pb[2] - pa[2];
      const e2x = pc[0] - pa[0], e2y = pc[1] - pa[1], e2z = pc[2] - pa[2];
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const baked = mat.userData.baked !== false;
      for (const [p, u] of [[pa, ua], [pb, ub], [pc, uc]]) {
        g.pos.push(p[0], p[1], p[2]);
        g.nor.push(nx, ny, nz);
        g.uv.push(u[0], u[1]);
        if (baked && this.lighting) {
          const L = this.lighting.sample(p[0], p[1], p[2], nx, ny, nz, this.room);
          if (tint) g.col.push(L[0] * tint[0], L[1] * tint[1], L[2] * tint[2]);
          else g.col.push(L[0], L[1], L[2]);
        } else if (tint) g.col.push(tint[0], tint[1], tint[2]);
        else g.col.push(1, 1, 1);
      }
      this.triCount++;
    }

    // Quad p0..p3 counter-clockwise when viewed from the front. Optional subdivision.
    quad(mat, p0, p1, p2, p3, u0, u1, u2, u3, opts) {
      const sub = (opts && opts.sub) || this.maxEdge;
      const tint = opts && opts.tint;
      if (sub > 0) {
        const lenA = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
        const lenB = Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]);
        const na = Math.max(1, Math.min(48, Math.ceil(lenA / sub)));
        const nb = Math.max(1, Math.min(48, Math.ceil(lenB / sub)));
        if (na > 1 || nb > 1) {
          const P = (s, t) => {
            const a = [0, 1, 2].map((k) => p0[k] + (p1[k] - p0[k]) * s);
            const b = [0, 1, 2].map((k) => p3[k] + (p2[k] - p3[k]) * s);
            return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t);
          };
          const UV = (s, t) => {
            const a = [u0[0] + (u1[0] - u0[0]) * s, u0[1] + (u1[1] - u0[1]) * s];
            const b = [u3[0] + (u2[0] - u3[0]) * s, u3[1] + (u2[1] - u3[1]) * s];
            return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          };
          for (let i = 0; i < na; i++) {
            for (let j = 0; j < nb; j++) {
              const s0 = i / na, s1 = (i + 1) / na, t0 = j / nb, t1 = (j + 1) / nb;
              const q0 = P(s0, t0), q1 = P(s1, t0), q2 = P(s1, t1), q3 = P(s0, t1);
              const w0 = UV(s0, t0), w1 = UV(s1, t0), w2 = UV(s1, t1), w3 = UV(s0, t1);
              this.tri(mat, q0, q1, q2, w0, w1, w2, tint);
              this.tri(mat, q0, q2, q3, w0, w2, w3, tint);
            }
          }
          return;
        }
      }
      this.tri(mat, p0, p1, p2, u0, u1, u2, tint);
      this.tri(mat, p0, p2, p3, u0, u2, u3, tint);
    }

    /**
     * Axis aligned box in local space. (x,z) = center, y = bottom.
     * opts: { faces: {top,bottom,px,nx,pz,nz} materials, skip: {top:1,...}, uv:'world'|'unit', uvScale, sub, tint }
     */
    box(mat, x, y, z, sx, sy, sz, opts) {
      opts = opts || {};
      const hx = sx / 2, hz = sz / 2;
      const x0 = x - hx, x1 = x + hx, y0 = y, y1 = y + sy, z0 = z - hz, z1 = z + hz;
      const faces = opts.faces || {};
      const skip = opts.skip || {};
      const unit = opts.uv === 'unit';
      const M = (k) => faces[k] || mat;
      const W = (m) => (opts.uvScale || (m.map && m.map.userData.world) || 1);
      const sub = opts.sub || 0;
      const tint = opts.tint;
      const q = (k, a, b, c, d, ua, ub, uc, ud) => {
        if (skip[k]) return;
        this.quad(M(k), a, b, c, d, ua, ub, uc, ud, { sub, tint });
      };
      let w;
      // +Y top
      w = W(M('top'));
      q('top', [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0],
        unit ? [0, 0] : [x0 / w, -z1 / w], unit ? [1, 0] : [x1 / w, -z1 / w], unit ? [1, 1] : [x1 / w, -z0 / w], unit ? [0, 1] : [x0 / w, -z0 / w]);
      // -Y bottom
      w = W(M('bottom'));
      q('bottom', [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
        unit ? [0, 0] : [x0 / w, z0 / w], unit ? [1, 0] : [x1 / w, z0 / w], unit ? [1, 1] : [x1 / w, z1 / w], unit ? [0, 1] : [x0 / w, z1 / w]);
      // +Z (front)
      w = W(M('pz'));
      q('pz', [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
        unit ? [0, 0] : [x0 / w, y0 / w], unit ? [1, 0] : [x1 / w, y0 / w], unit ? [1, 1] : [x1 / w, y1 / w], unit ? [0, 1] : [x0 / w, y1 / w]);
      // -Z (back)
      w = W(M('nz'));
      q('nz', [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0],
        unit ? [0, 0] : [-x1 / w, y0 / w], unit ? [1, 0] : [-x0 / w, y0 / w], unit ? [1, 1] : [-x0 / w, y1 / w], unit ? [0, 1] : [-x1 / w, y1 / w]);
      // +X
      w = W(M('px'));
      q('px', [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1],
        unit ? [0, 0] : [-z1 / w, y0 / w], unit ? [1, 0] : [-z0 / w, y0 / w], unit ? [1, 1] : [-z0 / w, y1 / w], unit ? [0, 1] : [-z1 / w, y1 / w]);
      // -X
      w = W(M('nx'));
      q('nx', [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0],
        unit ? [0, 0] : [z0 / w, y0 / w], unit ? [1, 0] : [z1 / w, y0 / w], unit ? [1, 1] : [z1 / w, y1 / w], unit ? [0, 1] : [z0 / w, y1 / w]);
    }

    // Vertical cylinder/prism. (x,z) center, y bottom.
    cyl(mat, x, y, z, rTop, rBot, h, segs, opts) {
      opts = opts || {};
      segs = segs || 8;
      const w = (mat.map && mat.map.userData.world) || 1;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const b0 = [x + c0 * rBot, y, z + s0 * rBot], b1 = [x + c1 * rBot, y, z + s1 * rBot];
        const t0 = [x + c0 * rTop, y + h, z + s0 * rTop], t1 = [x + c1 * rTop, y + h, z + s1 * rTop];
        const u0 = (i / segs) * (Math.PI * 2 * Math.max(rTop, rBot)) / w, u1 = ((i + 1) / segs) * (Math.PI * 2 * Math.max(rTop, rBot)) / w;
        if (!opts.noSides) this.quad(mat, b1, b0, t0, t1, [u1, y / w], [u0, y / w], [u0, (y + h) / w], [u1, (y + h) / w], { tint: opts.tint });
        if (!opts.noTop && rTop > 0) this.tri(opts.topMat || mat, [x, y + h, z], t1, t0, [0.5, 0.5], [0.5 + c1 * 0.5, 0.5 + s1 * 0.5], [0.5 + c0 * 0.5, 0.5 + s0 * 0.5], opts.tint);
        if (opts.bottom && rBot > 0) this.tri(mat, [x, y, z], b0, b1, [0.5, 0.5], [0.5 + c0 * 0.5, 0.5 + s0 * 0.5], [0.5 + c1 * 0.5, 0.5 + s1 * 0.5], opts.tint);
      }
    }

    // Horizontal cylinder along X (pipes). center (x,y,z), length along x.
    pipeX(mat, x, y, z, len, r, segs) {
      segs = segs || 6;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const p = (a, xx) => [xx, y + Math.cos(a) * r, z + Math.sin(a) * r];
        this.quad(mat, p(a0, x - len / 2), p(a1, x - len / 2), p(a1, x + len / 2), p(a0, x + len / 2),
          [0, i / segs], [0, (i + 1) / segs], [len, (i + 1) / segs], [len, i / segs]);
      }
    }
    pipeZ(mat, x, y, z, len, r, segs) {
      segs = segs || 6;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const p = (a, zz) => [x + Math.sin(a) * r, y + Math.cos(a) * r, zz];
        this.quad(mat, p(a1, z - len / 2), p(a0, z - len / 2), p(a0, z + len / 2), p(a1, z + len / 2),
          [0, (i + 1) / segs], [0, i / segs], [len, i / segs], [len, (i + 1) / segs]);
      }
    }

    // Upright textured panel facing +Z in local space (signs, posters). (x,y) = center.
    panel(mat, x, y, z, w, h, opts) {
      const hw = w / 2, hh = h / 2;
      this.quad(mat, [x - hw, y - hh, z], [x + hw, y - hh, z], [x + hw, y + hh, z], [x - hw, y + hh, z], [0, 0], [1, 0], [1, 1], [0, 1], opts);
      if (opts && opts.back) this.quad(opts.back, [x + hw, y - hh, z], [x - hw, y - hh, z], [x - hw, y + hh, z], [x + hw, y + hh, z], [0, 0], [1, 0], [1, 1], [0, 1]);
    }

    // Flat horizontal rect (decals on floors) facing up.
    flat(mat, x0, z0, x1, z1, y, opts) {
      const unit = opts && opts.uv === 'unit';
      const w = (mat.map && mat.map.userData.world) || 1;
      this.quad(mat, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0],
        unit ? [0, 0] : [x0 / w, -z1 / w], unit ? [1, 0] : [x1 / w, -z1 / w], unit ? [1, 1] : [x1 / w, -z0 / w], unit ? [0, 1] : [x0 / w, -z0 / w], opts);
    }

    /* ------------------------- output ------------------------- */
    build() {
      const group = new THREE.Group();
      group.name = 'static';
      for (const g of this.groups.values()) {
        if (!g.pos.length) continue;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(g.col, 3));
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, g.mat);
        mesh.matrixAutoUpdate = false;
        if (g.mat.userData.transparent) mesh.renderOrder = 5;
        group.add(mesh);
      }
      return group;
    }
  }

  DV.StaticBatch = StaticBatch;
})();
