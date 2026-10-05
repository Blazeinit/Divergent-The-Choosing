/* ==========================================================================
   DIVERGENT — wildlife & small motion
   Things that make the outside feel alive:
   - pigeons on the plaza: they peck and hop about in little flocks, scatter
     with a clatter of wings when you run at them (or walk right through),
     sit it out on a lamp post, the shelter roof or the L, then drift back down;
   - crows and gulls wheeling high over the city, calling from where they are;
   - scraps of paper skittering across the plaza in the gusts;
   - flags that actually fly (see DV.Wildlife.flag, used by the flagpole prop).
   All birds are one instanced mesh; their wings flap and their heads bob in
   the vertex shader, so a whole sky of them costs a single draw call.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  /* ------------------------------ wind ------------------------------ */
  // one shared, gusty wind for flags, litter and gliding birds
  const Wind = {
    t: 0,
    strength: 0.5, // 0 calm .. 1 strong
    dir: [0.94, 0.34],
    update(dt) {
      this.t += dt;
      const t = this.t;
      this.strength = U.clamp(0.45 + 0.25 * Math.sin(t * 0.13) + 0.2 * Math.sin(t * 0.47 + 1.3) * Math.max(0, Math.sin(t * 0.09)), 0.1, 1);
    },
  };

  /* ------------------------------ bird mesh ------------------------------ */
  function birdGeometry() {
    const pos = [], col = [], part = [];
    const tri = (a, b, c, ca, pa, cb, cc) => {
      const cs = [ca, cb || ca, cc || ca];
      [a, b, c].forEach((v, k) => { pos.push(v[0], v[1], v[2]); col.push(cs[k][0], cs[k][1], cs[k][2]); part.push(pa[0], pa[1], pa[2]); });
    };
    const B0 = [0, 0, 0], NECK = [2, 0, 0], HEAD = [3, 0, 0];
    const back = [0.4, 0.42, 0.48], belly = [0.52, 0.53, 0.57], irid = [0.34, 0.47, 0.42], irid2 = [0.44, 0.36, 0.47];
    // body: four hexagonal rings from neck to tail, capped
    const rings = [[0.12, 0.158, 0.036, 0.04], [0.06, 0.135, 0.078, 0.066], [-0.03, 0.128, 0.072, 0.056], [-0.11, 0.124, 0.036, 0.03]];
    const R = rings.map(([z, cy, rx, ry]) => { const pts = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; pts.push([Math.cos(a) * rx, cy + Math.sin(a) * ry, z]); } return pts; });
    const shade = (k, i) => { const up = Math.sin((i / 6) * Math.PI * 2 + Math.PI / 6) > 0; if (k === 0) return i % 2 ? irid : irid2; return up ? back : belly; };
    for (let k = 0; k < 3; k++) for (let i = 0; i < 6; i++) {
      const a = R[k][i], b = R[k][(i + 1) % 6], c = R[k + 1][(i + 1) % 6], d = R[k + 1][i];
      const pa = k === 0 ? NECK : B0, pb = B0;
      // ring 0 follows the head a little when pecking (part 2)
      pos.push(...a, ...b, ...c); col.push(...shade(k, i), ...shade(k, i + 1), ...shade(k + 1, i + 1)); part.push(...pa, ...pa, ...pb);
      pos.push(...a, ...c, ...d); col.push(...shade(k, i), ...shade(k + 1, i + 1), ...shade(k + 1, i)); part.push(...pa, ...pb, ...pb);
    }
    const front = [0, 0.168, 0.15], tailEnd = [0, 0.12, -0.15];
    for (let i = 0; i < 6; i++) {
      tri(front, R[0][(i + 1) % 6], R[0][i], irid, NECK, shade(0, i + 1), shade(0, i));
      tri(tailEnd, R[3][i], R[3][(i + 1) % 6], back, B0);
    }
    // head: a little octahedron, beak, dark eye spots
    const hc = [0, 0.205, 0.155], hr = 0.032, head = [0.33, 0.35, 0.41];
    const top = [0, hc[1] + hr, hc[2]], bot = [0, hc[1] - hr * 0.8, hc[2]], hl = [-hr, hc[1], hc[2]], hrr = [hr, hc[1], hc[2]], hf = [0, hc[1], hc[2] + hr], hb = [0, hc[1], hc[2] - hr];
    for (const [a, b] of [[hl, hf], [hf, hrr], [hrr, hb], [hb, hl]]) { tri(top, a, b, head, HEAD); tri(bot, b, a, head, HEAD); }
    tri([-0.008, 0.205, 0.183], [0.008, 0.205, 0.183], [0, 0.196, 0.212], [0.3, 0.27, 0.26], HEAD);
    tri([-0.032, 0.212, 0.16], [-0.033, 0.204, 0.168], [-0.033, 0.214, 0.17], [0.85, 0.5, 0.2], HEAD);
    tri([0.032, 0.212, 0.16], [0.033, 0.214, 0.17], [0.033, 0.204, 0.168], [0.85, 0.5, 0.2], HEAD);
    // tail fan with a dark band
    tri([0, 0.125, -0.12], [-0.06, 0.118, -0.25], [0.06, 0.118, -0.25], [0.38, 0.4, 0.45], B0, [0.18, 0.18, 0.2], [0.18, 0.18, 0.2]);
    // legs
    const leg = [0.72, 0.42, 0.42];
    for (const s of [-1, 1]) {
      tri([s * 0.022, 0.1, 0.0], [s * 0.022, 0.0, 0.01], [s * 0.034, 0.1, -0.005], leg, B0);
      tri([s * 0.022, 0.0, 0.01], [s * 0.022, 0.0, 0.045], [s * 0.03, 0.0, 0.01], leg, B0);
    }
    // wings: root along the body, tip out to the side; two dark bars and dark primaries
    for (const s of [-1, 1]) {
      const W = [1, s, 0], Wt = [1, s, 1];
      const rf = [s * 0.06, 0.16, 0.05], rb = [s * 0.06, 0.16, -0.08], mid = [s * 0.17, 0.16, 0.02], tp = [s * 0.29, 0.16, -0.06];
      const cov = [0.47, 0.49, 0.54], bar = [0.2, 0.2, 0.23], prim = [0.2, 0.2, 0.22];
      pos.push(...rf, ...mid, ...rb); col.push(...cov, ...bar, ...cov); part.push(...W, ...W, ...W);
      pos.push(...mid, ...tp, ...rb); col.push(...bar, ...prim, ...cov); part.push(...W, ...Wt, ...W);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 3));
    return g;
  }
  const BIRD_VERT = [
    'attribute vec3 aPart; attribute vec4 aState; attribute vec3 aTint;',
    'varying vec3 vCol;',
    '#include <fog_pars_vertex>',
    'void main() {',
    '  vec3 p = position;',
    '  if (aPart.x > 0.5 && aPart.x < 1.5) {',
    '    float sp = abs(p.x) - 0.06;',
    '    // folded: the wing lies back along the body',
    '    p.x = sign(p.x) * (0.06 + sp * mix(0.1, 1.0, aState.y));',
    '    p.z -= (1.0 - aState.y) * aPart.z * 0.1;',
    '    float d = abs(p.x) - 0.06;',
    '    p.y += sin(aState.x) * d;',
    '    p.x -= sign(p.x) * (1.0 - cos(aState.x)) * d;',
    '  }',
    '  if (aPart.x > 1.5) { float k = aPart.x > 2.5 ? 1.0 : 0.55; p.y -= aState.z * 0.06 * k; p.z += aState.z * 0.03 * k; }',
    '  vCol = color * aTint;',
    '  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(p, 1.0);',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  #include <fog_vertex>',
    '}',
  ].join('\n');
  const BIRD_FRAG = [
    'uniform vec3 light;',
    'varying vec3 vCol;',
    '#include <fog_pars_fragment>',
    'void main() {',
    '  gl_FragColor = vec4(min(vCol * light, vec3(1.0)), 1.0);',
    '  #include <fog_fragment>',
    '}',
  ].join('\n');

  /* ------------------------------ litter ------------------------------ */
  function litterTexture() {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#d8d2c4'; g.fillRect(2, 4, 28, 22);
    g.fillStyle = 'rgba(60,60,60,0.5)';
    for (let y = 8; y < 24; y += 3) g.fillRect(5, y, 18 + ((y * 7) % 6), 1);
    g.fillStyle = 'rgba(120,100,70,0.3)'; g.fillRect(2, 18, 28, 8);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    return t;
  }

  // one instance per zone (the menu rooftop and the Testing Center each have their own)
  const proto = {
    // o = { flocks:[{x0,z0,x1,z1,n}], perches:[[x,y,z]], circlers:{n, centre, r, y}, litter:{rect, n} }
    init(zone, o) {
      const ctx = zone.ctx;
      this.zone = zone;
      const r = U.rng(o.seed || 99);
      const birds = [];
      this.flocks = [];
      for (const f of o.flocks || []) {
        const flock = { rect: [f.x0, f.z0, f.x1, f.z1], scared: 0 };
        this.flocks.push(flock);
        const cx = U.lerp(f.x0, f.x1, 0.2 + r() * 0.6), cz = U.lerp(f.z0, f.z1, 0.2 + r() * 0.6);
        for (let i = 0; i < f.n; i++) {
          birds.push({
            // (on their patch: a strip of pavement is narrower than the scatter)
            kind: 'pigeon', flock, x: U.clamp(cx + (r() - 0.5) * 2.4, f.x0 + 0.2, f.x1 - 0.2), z: U.clamp(cz + (r() - 0.5) * 2.4, f.z0 + 0.2, f.z1 - 0.2), y: 0, rot: r() * 6.28,
            state: 'ground', t: r() * 2, act: null, actT: 0, flap: 0, spread: 0, peck: 0, scale: 1.1 + r() * 0.18,
            tint: r() < 0.12 ? [0.95, 0.78, 0.66] : r() < 0.2 ? [1.45, 1.45, 1.4] : r() < 0.35 ? [0.7, 0.7, 0.72] : [1, 1, 1],
          });
        }
      }
      const C = o.circlers;
      if (C) {
        for (let i = 0; i < C.n; i++) {
          const gull = i % 3 === 2;
          birds.push({
            kind: gull ? 'gull' : 'crow', state: 'circle', cx: C.centre[0] + (r() - 0.5) * 80, cz: C.centre[1] + (r() - 0.5) * 80,
            cr: C.r * (0.6 + r() * 0.8), cy: C.y + r() * 25, ang: r() * 6.28, spd: (gull ? 0.09 : 0.13) * (r() < 0.5 ? -1 : 1),
            x: 0, y: 0, z: 0, rot: 0, flap: 0, spread: 1, peck: 0, glide: 0, t: r() * 5, scale: gull ? 2.5 : 1.9,
            tint: gull ? [1.65, 1.65, 1.6] : [0.32, 0.31, 0.34], call: 8 + r() * 25,
          });
        }
      }
      this.birds = birds;
      this.perches = (o.perches || []).map((p) => ({ x: p[0], y: p[1], z: p[2], taken: 0 }));
      // one instanced mesh for every bird
      const geo = birdGeometry();
      const n = birds.length;
      this.state = new Float32Array(n * 4);
      this.tints = new Float32Array(n * 3);
      birds.forEach((b, i) => { this.tints.set(b.tint, i * 3); });
      geo.setAttribute('aState', new THREE.InstancedBufferAttribute(this.state, 4));
      geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(this.tints, 3));
      const mat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { light: { value: new THREE.Color(0.95, 0.95, 0.97) } }]),
        vertexShader: BIRD_VERT,
        fragmentShader: BIRD_FRAG,
        vertexColors: true,
        side: THREE.DoubleSide,
        fog: true,
      });
      this.mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
      this.mesh.count = n;
      this.mesh.frustumCulled = false;
      this.mesh.name = 'birds';
      ctx.add(this.mesh);
      // litter
      if (o.litter) {
        const L = o.litter;
        const lm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.24, 0.18), new THREE.MeshBasicMaterial({ map: litterTexture(), side: THREE.DoubleSide, fog: true, color: 0xb8b4ac }), L.n);
        lm.frustumCulled = false;
        lm.name = 'litter';
        this.litter = { mesh: lm, rect: L.rect, items: [] };
        for (let i = 0; i < L.n; i++) this.litter.items.push({ x: U.lerp(L.rect[0], L.rect[2], r()), z: U.lerp(L.rect[1], L.rect[3], r()), y: 0.01, rx: r() * 6, ry: r() * 6, vx: 0, vz: 0, vy: 0, air: 0 });
        ctx.add(lm);
      }
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
      this.log = { scatters: 0, landings: 0, perched: 0 };
      ctx.update((dt) => this.update(dt));
    },

    /* ---------------- update ---------------- */
    update(dt) {
      Wind.update(dt);
      const zone = this.zone;
      if (!zone || DV.World.current !== zone) return;
      const P = DV.Player;
      const threats = [];
      if (P) threats.push({ x: P.x, z: P.z, run: P.speed > 3.2, speed: P.speed || 0, player: true });
      for (const n of DV.NPCs.all) if (n.present && n.mode === 'walking' && n.lod !== 'far') threats.push({ x: n.x, z: n.z, run: false, speed: 1.3 });
      // a scare spreads through the whole flock for a moment (game time, so pausing holds it)
      for (const f of this.flocks) if (f.scared > 0) f.scared = Math.max(0, f.scared - dt);
      const m = this._m, q = this._q, e = this._e, p = this._p, s = this._s;
      this.birds.forEach((b, i) => {
        if (b.state === 'circle') this.circle(b, dt);
        else this.pigeon(b, dt, threats);
        // pose
        e.set(b.pitch || 0, b.rot, b.bank || 0, 'YXZ');
        q.setFromEuler(e);
        p.set(b.x, b.y, b.z);
        s.set(b.scale, b.scale, b.scale);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(i, m);
        this.state[i * 4] = b.flap;
        this.state[i * 4 + 1] = b.spread;
        this.state[i * 4 + 2] = b.peck;
      });
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.geometry.attributes.aState.needsUpdate = true;
      // birds pick up a little of the local light (cloud shadows, the courtyard, dusk)
      if (this.zone.city) {
        const sh = 1 - 0.2 * this.zone.city.cloudShadeAt(P ? P.x : 0, P ? P.z : 0);
        this.mesh.material.uniforms.light.value.setRGB(0.95 * sh, 0.95 * sh, 0.97 * sh);
      }
      if (this.litter) this.updateLitter(dt, threats);
    },

    // crows and gulls: wide lazy circles, alternating flapping and gliding
    circle(b, dt) {
      b.t += dt;
      b.ang += b.spd * dt * (1 + 0.15 * Math.sin(b.t * 0.3));
      const wob = Math.sin(b.t * 0.21) * 8;
      const x = b.cx + Math.cos(b.ang) * (b.cr + wob), z = b.cz + Math.sin(b.ang) * (b.cr + wob);
      const y = b.cy + Math.sin(b.t * 0.17) * 4;
      if (b.x || b.z) b.rot = Math.atan2(x - b.x, z - b.z);
      b.x = x; b.z = z; b.y = y;
      b.bank = -Math.sign(b.spd) * 0.35;
      b.pitch = 0;
      b.glide -= dt;
      if (b.glide < -1.6) b.glide = 2 + Math.random() * 4;
      b.flap = b.glide > 0 ? U.damp(b.flap, -0.15, 3, dt) : Math.sin(b.t * (b.kind === 'gull' ? 6 : 8)) * 0.85;
      b.spread = 1;
      b.call -= dt;
      if (b.call <= 0) {
        b.call = 14 + Math.random() * 30;
        const cam = DV.Game && DV.Game.camera;
        if (cam && Math.hypot(b.x - cam.position.x, b.z - cam.position.z) < 90) DV.Audio.play(b.kind === 'gull' ? 'gull' : 'caw', { x: b.x, z: b.z, range: 95, volume: 0.9, occluded: !this.outdoorsCam() });
      }
    },
    outdoorsCam() {
      const cam = DV.Game && DV.Game.camera;
      if (!cam) return true;
      const room = this.zone.roomAt(cam.position.x, cam.position.z);
      return !room || room.exterior;
    },

    pigeon(b, dt, threats) {
      b.t -= dt;
      switch (b.state) {
        case 'ground': {
          // something coming? (running at them, or walking right into the flock)
          let fear = null;
          for (const th of threats) {
            const d = Math.hypot(th.x - b.x, th.z - b.z);
            if (d < 1.1 || (th.run && d < 3.4) || (th.player && th.speed > 1.8 && d < 1.7)) { fear = th; break; }
          }
          if (fear || b.flock.scared > 0) { this.takeOff(b, fear); return; }
          b.spread = U.damp(b.spread, 0, 8, dt);
          b.flap = 0;
          if (b.t <= 0) {
            const k = Math.random();
            b.act = k < 0.45 ? 'peck' : k < 0.8 ? 'hop' : 'turn';
            b.actT = 0;
            b.t = b.act === 'peck' ? 0.5 + Math.random() * 1.2 : b.act === 'hop' ? 0.28 : 0.3;
            if (b.act === 'turn') b.turnTo = b.rot + (Math.random() - 0.5) * 2.4;
            if (b.act === 'hop') {
              // stay on open ground inside the flock's patch
              const [x0, z0, x1, z1] = b.flock.rect;
              const nx = b.x + Math.sin(b.rot) * 0.3, nz = b.z + Math.cos(b.rot) * 0.3;
              if (nx < x0 || nx > x1 || nz < z0 || nz > z1 || !this.zone.nav.isWalkable(nx, nz)) { b.act = 'turn'; b.turnTo = Math.atan2((x0 + x1) / 2 - b.x, (z0 + z1) / 2 - b.z); }
            }
            if (Math.random() < 0.012) DV.Audio.play('coo', { x: b.x, z: b.z, range: 9, volume: 0.8 });
          }
          b.actT += dt;
          if (b.act === 'peck') { b.peck = Math.max(0, Math.sin(b.actT * 11)); }
          else b.peck = U.damp(b.peck, 0, 10, dt);
          if (b.act === 'hop' && b.t > 0) {
            b.x += Math.sin(b.rot) * 1.1 * dt;
            b.z += Math.cos(b.rot) * 1.1 * dt;
            b.y = Math.sin((1 - b.t / 0.28) * Math.PI) * 0.04;
          } else b.y = 0;
          if (b.act === 'turn') b.rot = U.dampAngle(b.rot, b.turnTo, 10, dt);
          b.pitch = 0;
          b.bank = 0;
          break;
        }
        case 'fly': {
          b.u += dt / b.dur;
          const u = Math.min(1, b.u);
          // quadratic bezier from → ctrl → to
          const a = (1 - u) * (1 - u), c = 2 * (1 - u) * u, d = u * u;
          const nx = a * b.from[0] + c * b.ctrl[0] + d * b.to[0];
          const ny = a * b.from[1] + c * b.ctrl[1] + d * b.to[1];
          const nz = a * b.from[2] + c * b.ctrl[2] + d * b.to[2];
          const dx = nx - b.x, dz = nz - b.z;
          if (Math.abs(dx) + Math.abs(dz) > 1e-4) b.rot = Math.atan2(dx, dz);
          b.pitch = U.clamp(-(ny - b.y) / Math.max(1e-3, Math.hypot(dx, dz)) * 0.6, -0.6, 0.6);
          b.x = nx; b.y = ny; b.z = nz;
          b.spread = U.damp(b.spread, 1, 14, dt);
          b.ft = (b.ft || 0) + dt;
          // fast beats on take-off, a glide in the middle, braking beats to land
          const beat = u < 0.35 || u > 0.82 ? 15 : 7;
          b.flap = u > 0.45 && u < 0.75 ? U.damp(b.flap, 0.1, 6, dt) : Math.sin(b.ft * beat) * 1.0;
          b.peck = 0;
          if (u >= 1) this.land(b);
          break;
        }
        case 'perch': {
          b.spread = U.damp(b.spread, 0, 8, dt);
          b.flap = 0;
          b.pitch = 0;
          b.peck = U.damp(b.peck, 0, 4, dt);
          if (Math.random() < dt * 0.3) b.rot += (Math.random() - 0.5) * 1.2;
          if (b.t <= 0) {
            // come back down if nothing's about
            const P = DV.Player, [x0, z0, x1, z1] = b.flock.rect;
            const gx = U.lerp(x0, x1, 0.2 + Math.random() * 0.6), gz = U.lerp(z0, z1, 0.2 + Math.random() * 0.6);
            if (!P || Math.hypot(P.x - gx, P.z - gz) > 5) {
              if (b.perch) b.perch.taken--;
              b.perch = null;
              this.flyTo(b, [gx, 0, gz], 1.6 + Math.random() * 0.8);
            } else b.t = 4 + Math.random() * 6;
          }
          break;
        }
      }
    },
    takeOff(b, fear) {
      const flock = b.flock;
      if (flock.scared <= 0) {
        flock.scared = 0.45; // the rest of the flock goes up with it
        this.log.scatters++;
        DV.Audio.play('flap', { x: b.x, z: b.z, range: 26, volume: 1 });
      }
      // a free perch, else a loop round to the far side of the patch
      const free = this.perches.filter((p) => p.taken < 3);
      let to;
      if (free.length && Math.random() < 0.8) {
        free.sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z));
        const pk = free[Math.floor(Math.random() * Math.min(3, free.length))];
        pk.taken++;
        b.perch = pk;
        to = [pk.x + (Math.random() - 0.5) * 0.5, pk.y, pk.z + (Math.random() - 0.5) * 0.5];
      } else {
        const [x0, z0, x1, z1] = flock.rect;
        const away = fear ? Math.atan2(b.x - fear.x, b.z - fear.z) : Math.random() * 6.28;
        to = [U.clamp(b.x + Math.sin(away) * 9, x0 + 1, x1 - 1), 0, U.clamp(b.z + Math.cos(away) * 9, z0 + 1, z1 - 1)];
        b.perch = null;
      }
      this.flyTo(b, to, 1.4 + Math.random() * 0.9);
    },
    flyTo(b, to, dur) {
      b.state = 'fly';
      b.from = [b.x, b.y, b.z];
      b.to = to;
      const mx = (b.x + to[0]) / 2, mz = (b.z + to[2]) / 2;
      b.ctrl = [mx + (Math.random() - 0.5) * 3, Math.max(b.y, to[1]) + 2.5 + Math.random() * 2.5, mz + (Math.random() - 0.5) * 3];
      b.u = 0;
      b.dur = dur;
      b.ft = Math.random();
    },
    land(b) {
      b.x = b.to[0]; b.y = b.to[1]; b.z = b.to[2];
      if (b.perch) { b.state = 'perch'; b.t = 18 + Math.random() * 40; this.log.perched++; }
      else { b.state = 'ground'; b.t = 0.6 + Math.random(); b.y = 0; }
      b.pitch = 0;
      this.log.landings++;
    },

    updateLitter(dt, threats) {
      const L = this.litter, w = Wind.strength, m = this._m, q = this._q, e = this._e, p = this._p, s = this._s;
      const [x0, z0, x1, z1] = L.rect;
      L.items.forEach((it, i) => {
        const gust = Math.max(0, w - 0.55) * 4;
        // a strong gust lifts and tumbles it; otherwise it slides a little or lies still
        if (it.y <= 0.012 && gust > 0.2 && Math.random() < dt * gust * 0.8) { it.vy = 0.6 + Math.random() * 1.2 * gust; it.air = 1; }
        for (const th of threats) if (th.run && Math.hypot(th.x - it.x, th.z - it.z) < 0.8 && it.y <= 0.012) { it.vy = 1.4; it.air = 1; }
        const drag = it.air ? 1.6 : 0.35 * gust;
        it.vx = U.damp(it.vx, Wind.dir[0] * w * 2.4 * (it.air ? 1 : 0.4), drag, dt);
        it.vz = U.damp(it.vz, Wind.dir[1] * w * 2.4 * (it.air ? 1 : 0.4), drag, dt);
        if (it.y > 0.012 || it.vy > 0) {
          it.vy -= 3.2 * dt;
          it.y += it.vy * dt;
          it.rx += dt * 7; it.ry += dt * 5;
          if (it.y <= 0.01) { it.y = 0.01; it.vy = 0; it.air = 0; it.rx = Math.round(it.rx / Math.PI) * Math.PI; }
        } else if (gust < 0.2) { it.vx *= 0.9; it.vz *= 0.9; }
        it.x += it.vx * dt; it.z += it.vz * dt;
        // blown out of the patch: comes back in on the upwind side
        if (it.x > x1) it.x = x0; if (it.x < x0) it.x = x1;
        if (it.z > z1) it.z = z0; if (it.z < z0) it.z = z1;
        e.set(-Math.PI / 2 + (it.air ? Math.sin(it.rx) * 1.2 : 0), it.ry, 0);
        q.setFromEuler(e);
        p.set(it.x, it.y, it.z);
        s.set(1, 1, 1);
        m.compose(p, q, s);
        L.mesh.setMatrixAt(i, m);
      });
      L.mesh.instanceMatrix.needsUpdate = true;
    },

  };

  const W = {
    wind: Wind,
    flags: [],
    // called from a zone's build()
    attach(zone, o) {
      const w = Object.create(proto);
      w.init(zone, o);
      zone.wildlife = w;
      return w;
    },

    /* ---------------- flags ---------------- */
    // a cloth flag that flies from a pole: returns a mesh whose vertices are animated by update
    flag(ctx, prop, tex, light) {
      const SEG = 12, ROWS = 4, fl = 1.5, fy0 = 5.95, fy1 = 6.85;
      const geo = new THREE.PlaneGeometry(1, 1, SEG, ROWS);
      const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, fog: true });
      if (light) mat.color.setRGB(U.clamp(light[0], 0.3, 1.1), U.clamp(light[1], 0.3, 1.1), U.clamp(light[2], 0.3, 1.1));
      // the banner texture is tall; it's laid on its side along the flag
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, 1 - v, 1 - u); }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(prop.x, 0, prop.z);
      mesh.rotation.y = prop.rot || 0;
      mesh.frustumCulled = false;
      ctx.add(mesh);
      const pos = geo.attributes.position;
      const base = [];
      for (let i = 0; i < pos.count; i++) base.push([pos.getX(i) + 0.5, pos.getY(i) + 0.5]); // u along, v up (0..1)
      const phase = (prop.x * 1.7 + prop.z) % 6.28;
      const f = { mesh, pos, base, phase, t: 0 };
      ctx.update((dt) => {
        f.t += dt;
        const w = Wind.strength, t = f.t;
        // only animate when it can be seen nearby (cheap anyway: 65 vertices)
        for (let i = 0; i < base.length; i++) {
          const [u, v] = base[i];
          const amp = (0.1 + 0.22 * w) * u;
          const wave = Math.sin(t * (4 + 5 * w) - u * 5.5 + phase + v * 0.6);
          const droop = (1 - w) * 0.35 * u * u;
          pos.setXYZ(i, 0.05 + u * fl * (1 - 0.05 * Math.abs(wave) * u), fy0 + v * (fy1 - fy0) - droop + Math.sin(t * 3 + u * 4 + phase) * 0.03 * u, wave * amp);
        }
        pos.needsUpdate = true;
      });
      this.flags.push(f);
      return f;
    },
  };
  DV.Wildlife = W;
})();
