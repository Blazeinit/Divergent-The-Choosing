// Invisible walls: nothing stops you that you can't see. A slab of rubble turned at an angle in an
// empty lot (the one by the old FURNITURE sign) used to stop you a metre short of it, because its
// collider was its bounding box. Every collider the city puts up is checked against the footprint
// of what it actually built, and the Testing Center's own colliders against the triangles drawn
// where they stand. Then the player walks it: up to that rubble from every side, out of the front
// plaza through the gate onto Lake Street and along it into the city, and into the plaza's fence,
// which stops you where it stands.
const L = require('./lib.js');
L.run('invisible walls', async (p, T, errs) => {
  await p.evaluate(() => { DV.City.auditNext = true; }); // (the city lists everything it puts up)
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => {
    DV.State.setFlag('results_discussed'); DV.State.setFlag('security_cleared'); DV.Inventory.add('name_badge', 1, true);
    // walk in a straight line towards (x, z), the way a player holds W; returns where you got to
    window.walkLine = (x, z, maxSecs) => {
      const P = DV.Player;
      let t = 0, last = [P.x, P.z], stuck = 0;
      while (t < (maxSecs || 30)) {
        const dx = x - P.x, dz = z - P.z;
        if (Math.hypot(dx, dz) < 0.4) break;
        DV.Game.rig.yaw = Math.atan2(dx, dz);
        DV.Input.keys.KeyW = true; QA.step(0.05); t += 0.05;
        if (Math.hypot(P.x - last[0], P.z - last[1]) < 0.003) { if (++stuck > 30) break; } else stuck = 0;
        last = [P.x, P.z];
      }
      DV.Input.keys.KeyW = false;
      return { at: [+P.x.toFixed(2), +P.z.toFixed(2)], d: +Math.hypot(P.x - x, P.z - z).toFixed(2), stuck: stuck > 30 };
    };
    // how far (x, z) is from a convex footprint [[x, z] × 4] (0 inside it)
    window.toFootprint = (x, z, pts) => {
      let best = 1e9, pos = 0, neg = 0;
      for (let k = 0; k < pts.length; k++) {
        const [ax, az] = pts[k], [bx, bz] = pts[(k + 1) % pts.length];
        const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2));
        best = Math.min(best, Math.hypot(x - ax - ex * t, z - az - ez * t));
        if ((x - ax) * ez - (z - az) * ex > 0) pos++; else neg++; // (which side of each edge: inside is the same side of all four)
      }
      return pos === pts.length || neg === pts.length ? 0 : best;
    };
  });

  /* ---------------- the city: every collider stands inside what it was built for ---------------- */
  const city = await ev(() => {
    const c = DV.World.current.city, W = c.walk, C = c.centre;
    const bad = [];
    let n = 0, turned = 0, worst = 0;
    for (const q of W.solids) {
      const mx = (q[0] + q[2]) / 2, mz = (q[1] + q[3]) / 2;
      if (Math.hypot(mx - C[0], mz - C[1]) > W.limit + 2 || mx > W.shore + 2) continue; // (past the cordon, out on the marsh: nobody gets there)
      n++;
      const a = c.audit[q[5]];
      if (!a) { bad.push(['no source', ...q.slice(0, 4).map((v) => +v.toFixed(2))]); continue; }
      // how far its corners stand outside the footprint of the box it was made for
      const pts = a[8] || [[a[0], a[1]], [a[2], a[1]], [a[2], a[3]], [a[0], a[3]]];
      const out = Math.max(...[[q[0], q[1]], [q[2], q[1]], [q[2], q[3]], [q[0], q[3]]].map(([x, z]) => toFootprint(x, z, pts)));
      const isTurned = Math.abs(pts[1][0] - pts[0][0]) > 0.01 && Math.abs(pts[1][1] - pts[0][1]) > 0.01;
      if (isTurned) { turned++; worst = Math.max(worst, out); }
      if (out > 0.25) bad.push([a[6], +out.toFixed(2), ...q.slice(0, 4).map((v) => +v.toFixed(2))]);
    }
    return { n, bad: bad.slice(0, 6), nBad: bad.length, turned, worst: +worst.toFixed(2) };
  });
  T.ok(city.n > 5000 && city.nBad === 0, 'every one of the city\'s ' + city.n + ' colliders within reach stands inside the thing it was built for (' + city.nBad + ' stand out of it by more than 25 cm)', city.bad);
  T.ok(city.turned > 500 && city.worst <= 0.25, city.turned + ' of them are for things turned at an angle (rubble, cabins, barns, the checkpoint\'s blocks), and those hug them: none stands out more than ' + city.worst + ' m');

  /* ---------------- the Testing Center: every collider has something drawn in it ---------------- */
  const zone = await ev(() => {
    const zone = DV.World.current;
    QA.tp(40, 70, 0); QA.step(1);
    // the triangles of everything the zone draws (not the city's merged meshes, nor people);
    // meshes hidden at a distance (parked cars, vans) count: they're there when you get close
    const tris = [], v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    zone.group.updateMatrixWorld(true);
    zone.group.traverse((m) => {
      if (!m.isMesh || m.isSkinnedMesh || m.isInstancedMesh || /^city_/.test(m.name)) return;
      const g = m.geometry, pos = g.attributes.position, idx = g.index, n = idx ? idx.count : pos.count;
      for (let i = 0; i + 2 < n; i += 3) {
        for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(m.matrixWorld);
        tris.push([Math.min(v[0].x, v[1].x, v[2].x), Math.min(v[0].y, v[1].y, v[2].y), Math.min(v[0].z, v[1].z, v[2].z), Math.max(v[0].x, v[1].x, v[2].x), Math.max(v[0].y, v[1].y, v[2].y), Math.max(v[0].z, v[1].z, v[2].z)]);
      }
    });
    const S = 4, grid = new Map();
    tris.forEach((t, i) => { for (let a = Math.floor(t[0] / S); a <= Math.floor(t[3] / S); a++) for (let b = Math.floor(t[2] / S); b <= Math.floor(t[5] / S); b++) { const k = a * 100003 + b; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); } });
    const bad = [];
    let n = 0;
    for (const b of zone.colliders.boxes) {
      if (!b.enabled || b.playerOnly || b.tag === 'city') continue; // (the city's are checked above)
      const e = 0.08, y0 = Math.max(b.y0, 0.05), y1 = Math.min(b.y1, 2.2);
      if (y1 <= y0) continue;
      n++;
      let hit = false;
      for (let a = Math.floor((b.x0 - e) / S); a <= Math.floor((b.x1 + e) / S) && !hit; a++) for (let c = Math.floor((b.z0 - e) / S); c <= Math.floor((b.z1 + e) / S) && !hit; c++) {
        for (const i of grid.get(a * 100003 + c) || []) { const t = tris[i]; if (t[3] >= b.x0 - e && t[0] <= b.x1 + e && t[5] >= b.z0 - e && t[2] <= b.z1 + e && t[4] >= y0 && t[1] <= y1) { hit = true; break; } }
      }
      if (!hit) bad.push([b.tag, +b.x0.toFixed(2), +b.z0.toFixed(2), +b.x1.toFixed(2), +b.z1.toFixed(2)]);
    }
    return { n, bad };
  });
  T.ok(zone.n > 500 && zone.bad.length === 0, 'every one of the Testing Center\'s ' + zone.n + ' walls, props and cars has something drawn where it stops you', zone.bad.slice(0, 6));

  /* ---------------- walking it: the rubble in the empty lot by the FURNITURE sign ---------------- */
  const lot = await ev(() => {
    const c = DV.World.current.city, g = c.group.children.find((m) => m.name === 'city_ghost');
    const pos = g.geometry.attributes.position, uv = g.geometry.attributes.uv;
    // the painted signs: which picture (GHOST[k]) and where; FURNITURE is k = 4
    const signs = [];
    for (let i = 0; i < pos.count; i += 4) signs.push({ k: Math.round(uv.getX(i) / 2) + 2 * Math.round(3 - uv.getY(i)), x: (pos.getX(i) + pos.getX(i + 1)) / 2, z: (pos.getZ(i) + pos.getZ(i + 1)) / 2 });
    // ... with a turned slab of rubble in the lot in front of it, nearest the Testing Center
    const rubble = c.audit.filter((a) => a[7] && a[8] && a[4] < 0 && a[5] < 2.4 && a[5] > 0.85 && Math.abs(a[8][1][0] - a[8][0][0]) > 0.05 && Math.abs(a[8][1][1] - a[8][0][1]) > 0.05);
    let best = null;
    for (const s of signs.filter((q) => q.k === 4)) for (const a of rubble) {
      const mx = (a[0] + a[2]) / 2, mz = (a[1] + a[3]) / 2, d = Math.hypot(mx - s.x, mz - s.z), far = Math.hypot(mx - 40, mz - 40);
      if (d < 14 && (!best || far < best.far)) best = { a, far, sign: [+s.x.toFixed(1), +s.z.toFixed(1)] };
    }
    if (!best) return null;
    const [x0, z0, x1, z1, , , , , pts] = best.a, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    // walk at it from eight sides, from 5 m out past its corners
    const out = [];
    const R = DV.Config.PLAYER.radius;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, r = Math.max(x1 - x0, z1 - z0) / 2 + 5;
      const sx = mx + Math.cos(a) * r, sz = mz + Math.sin(a) * r;
      const zone = DV.World.current;
      if (!zone.walkable(sx, sz) || zone.colliders.blocked(sx, sz, 0.4, 'player')) continue;
      QA.tp(sx, sz, 0);
      const w = walkLine(mx, mz, 8);
      out.push({ from: k, gap: +(toFootprint(DV.Player.x, DV.Player.z, pts) - R).toFixed(2), stuck: w.stuck });
    }
    return { sign: best.sign, rubble: [+mx.toFixed(1), +mz.toFixed(1)], walks: out };
  });
  T.ok(lot && lot.walks.length >= 3, 'the empty lot by the FURNITURE sign (' + (lot && lot.sign) + '): its turned slab of rubble at ' + (lot && lot.rubble), lot);
  const gaps = lot ? lot.walks.map((w) => w.gap) : [];
  T.ok(lot && gaps.every((g) => g < 0.3 && g > -0.2), 'walking up to it from ' + gaps.length + ' sides, you stop against it, not short of it (gaps ' + gaps.join(', ') + ' m)', lot && lot.walks);

  /* ---------------- walking it: out of the front plaza onto Lake Street ---------------- */
  const plaza = await ev(() => {
    const r = {};
    // out through the open gate, onto the pavement, and along Lake Street past the end of the
    // Testing Center's map, both ways
    QA.tp(40, 70, 0); r.gate = walkLine(40, 78.2, 12);
    r.west = walkLine(4, 78.2, 20); r.westPlace = DV.World.current.roomAt(DV.Player.x, DV.Player.z) ? 'room' : 'city';
    QA.tp(40, 70, 0); walkLine(40, 78.2, 12); r.east = walkLine(76, 78.2, 20);
    // into the plaza's fence from inside and outside: it stops you where it stands
    QA.tp(30, 72, 0); r.fenceIn = walkLine(30, 79, 6);
    QA.tp(30, 78.2, 0); r.fenceOut = walkLine(30, 72, 6);
    QA.tp(26, 68, 0); r.fenceW = walkLine(18, 68, 6);
    return r;
  });
  T.ok(plaza.gate.d < 0.6 && plaza.west.d < 0.6 && plaza.east.d < 0.6 && plaza.westPlace === 'city', 'out of the front plaza through the gate, and along Lake Street both ways past the end of the Testing Center\'s map', plaza);
  const fz = 76, R = await ev(() => DV.Config.PLAYER.radius);
  T.ok(Math.abs(plaza.fenceIn.at[1] - (fz - 0.08 - R)) < 0.12 && Math.abs(plaza.fenceOut.at[1] - (fz + 0.08 + R)) < 0.12 && Math.abs(plaza.fenceW.at[0] - (22 + 0.08 + R)) < 0.12,
    'the plaza\'s fence stops you right where it stands (inside at z ' + plaza.fenceIn.at[1] + ', outside at ' + plaza.fenceOut.at[1] + ', the west side at x ' + plaza.fenceW.at[0] + ')', plaza);
  T.noErrors(errs);
});
