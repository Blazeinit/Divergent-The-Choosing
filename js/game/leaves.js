/* ==========================================================================
   DIVERGENT — leaves on the wind
   What the trees shed: leaves let go of the crowns near you, flutter down
   (rocking side to side as a leaf does, spinning), carried off downwind,
   harder in a gust; on the ground they lie, and skitter along the paving when
   it blows, lift and tumble when it blows hard, and are kicked up when you
   run through them. Brown, ochre, yellow, a few still green.

   One instanced mesh round the camera (the trees it sheds from are the zone's
   own and the street kit's, near you), out of doors only. And the trees
   themselves bend with the wind (DV.Mat.wind: the crowns' material and the
   street kit's leaves sway above head height, more in a gust).

     DV.Leaves.attach(zone, kit)   → { update(dt) }   (js/zones/testingCenter.js)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const N = 220, NEAR = 34, GROUND_LIFE = 40;
  const COLS = [[0.52, 0.32, 0.14], [0.66, 0.46, 0.16], [0.74, 0.6, 0.2], [0.44, 0.24, 0.12], [0.58, 0.52, 0.22], [0.36, 0.42, 0.18]];

  // a leaf: a little diamond, bent along its spine
  function leafGeometry() {
    const g = new THREE.BufferGeometry();
    const p = [0, 0, -0.07, 0.035, 0.008, -0.01, 0, 0.012, 0.07, -0.035, 0.008, -0.01];
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  }

  const Leaves = {
    attach(zone, kit) {
      const W = () => DV.Wildlife && DV.Wildlife.wind;
      const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
      const mesh = new THREE.InstancedMesh(leafGeometry(), mat, N);
      mesh.name = 'leaves';
      mesh.frustumCulled = false;
      const hide = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < N; i++) mesh.setMatrixAt(i, hide);
      const col = new THREE.Color();
      for (let i = 0; i < N; i++) { const c = COLS[i % COLS.length], k = 0.85 + Math.random() * 0.3; mesh.setColorAt(i, col.setRGB(c[0] * k, c[1] * k, c[2] * k)); }
      mesh.instanceColor.needsUpdate = true;
      zone.group.add(mesh);
      // the trees: the zone's own (props) and the street kit's, found near the camera now and then
      const own = (zone.def.props || []).filter((q) => q.type === 'tree').map((q) => ({ x: q.x, z: q.z, y: 3.2 * (q.size || 1), r: 1.4 * (q.size || 1) }));
      let trees = own.slice(), seekT = 0;
      const seek = (cx, cz) => {
        trees = own.filter((t) => Math.hypot(t.x - cx, t.z - cz) < NEAR + 10);
        if (kit && kit.chunks) for (const c of kit.chunks.values()) for (const it of c.items) if (it.name === 'tree' && Math.abs(it.x - cx) < NEAR + 10 && Math.abs(it.z - cz) < NEAR + 10) trees.push({ x: it.x, z: it.z, y: 3.6, r: 1.4 });
      };
      const L = [];
      for (let i = 0; i < N; i++) L.push({ on: false });
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
      const out = { mesh, leaves: L, trees: () => trees, stats: { shed: 0, landed: 0, lifted: 0 } };
      const shed = (lf, t, onGround) => {
        const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * t.r;
        lf.on = true; lf.x = t.x + Math.cos(a) * d; lf.z = t.z + Math.sin(a) * d;
        lf.y = onGround ? 0.012 : t.y - 0.6 + Math.random() * 1.2;
        lf.vx = lf.vz = lf.vy = 0; lf.air = !onGround; lf.age = onGround ? Math.random() * GROUND_LIFE : 0;
        lf.ph = Math.random() * 6.283; lf.rot = Math.random() * 6.283; lf.spin = (Math.random() - 0.5) * 6; lf.flip = Math.random() * 6.283;
        lf.sz = 0.8 + Math.random() * 0.6;
        if (!onGround) out.stats.shed++;
      };
      out.update = (dt) => {
        const P = DV.Player, cam = DV.Game && DV.Game.camera;
        const cx = cam ? cam.position.x : P.x, cz = cam ? cam.position.z : P.z;
        const room = zone.roomAt(P.x, P.z);
        const outside = (!room || room.exterior) && !(cam && cam.position.y < -0.5);
        mesh.visible = outside;
        const wind = W(), ws = wind ? wind.strength : 0.4, wd = wind ? wind.dir : [0.94, 0.34], wt = wind ? wind.t : performance.now() / 1000;
        if (DV.Mat.wind) DV.Mat.wind.value.set(wd[0], wd[1], ws, wt);
        if (!outside) return;
        seekT -= dt;
        if (seekT <= 0) { seekT = 1.5; seek(cx, cz); }
        const gust = Math.max(0, ws - 0.5) * 2; // 0 .. 1
        // how many let go this frame: a steady trickle, a flurry in a gust
        let want = trees.length ? dt * trees.length * (0.05 + gust * 0.5) : 0;
        for (let i = 0; i < N; i++) {
          const lf = L[i];
          if (!lf.on) {
            if (want > 0 && Math.random() < want) { want -= 1; shed(lf, trees[Math.floor(Math.random() * trees.length)], false); }
            else if (trees.length && !lf.seeded) { lf.seeded = true; if (Math.random() < 0.6) shed(lf, trees[Math.floor(Math.random() * trees.length)], true); }
            if (!lf.on) { mesh.setMatrixAt(i, hide); continue; }
          }
          const W0 = ws * (1.2 + 1.8 * gust);
          if (lf.air) {
            // falling: slowly, rocking side to side as it goes, carried downwind
            lf.ph += dt * (3 + lf.sz);
            lf.vx = U.damp(lf.vx, wd[0] * W0 + Math.cos(lf.ph) * 0.5, 2.5, dt);
            lf.vz = U.damp(lf.vz, wd[1] * W0 + Math.sin(lf.ph * 0.7) * 0.4, 2.5, dt);
            lf.vy = U.damp(lf.vy, -0.75 + Math.sin(lf.ph) * 0.35 + gust * 0.5, 3, dt);
            lf.rot += lf.spin * dt; lf.flip += dt * 4;
            if (lf.y <= 0.012) { lf.y = 0.012; lf.air = false; lf.age = 0; out.stats.landed++; }
          } else {
            // on the ground: still, or sliding along in a gust; a strong one, or someone running past, lifts it
            lf.age += dt;
            const kick = P && P.speed > 3 && Math.hypot(P.x - lf.x, P.z - lf.z) < 0.9;
            if (kick || (gust > 0.4 && Math.random() < dt * gust * 0.6)) { lf.air = true; lf.vy = 1 + Math.random() * 1.6 * Math.max(gust, kick ? 0.8 : 0); lf.y = 0.05; out.stats.lifted++; }
            const slide = gust > 0.15 ? gust : 0;
            lf.vx = U.damp(lf.vx, wd[0] * W0 * 0.45 * slide, 1.5, dt);
            lf.vz = U.damp(lf.vz, wd[1] * W0 * 0.45 * slide, 1.5, dt);
            if (slide) lf.rot += dt * lf.spin * 0.4;
            lf.flip = 0;
          }
          lf.x += lf.vx * dt; lf.y += lf.air ? lf.vy * dt : 0; lf.z += lf.vz * dt;
          // gone: far off, or lain long enough (it rots into the gutter)
          if (Math.hypot(lf.x - cx, lf.z - cz) > NEAR + 12 || (!lf.air && lf.age > GROUND_LIFE) || (lf.air && lf.y > 12)) { lf.on = false; mesh.setMatrixAt(i, hide); continue; }
          e.set(lf.air ? Math.sin(lf.flip) * 1.1 : 0, lf.rot, lf.air ? Math.cos(lf.flip * 0.7) * 0.6 : 0);
          q.setFromEuler(e);
          v.set(lf.x, lf.y, lf.z);
          s.setScalar(lf.sz);
          m4.compose(v, q, s);
          mesh.setMatrixAt(i, m4);
        }
        mesh.instanceMatrix.needsUpdate = true;
      };
      zone.leaves = out;
      return out;
    },
  };
  DV.Leaves = Leaves;
})();
