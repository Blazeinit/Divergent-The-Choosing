// Physics: the loose things in the city (bins, newspaper boxes, cones, crates, rubbish bags) are
// bodies, drawn together in one mesh. Walking into a bin shoves it along and it stays up; running
// into one knocks it over, and it comes down on the ground (never through it), stops and sleeps.
// Knocked hard at a wall it stops at the wall; on its side it rolls across its axis far more than
// it slides along it; bodies knock each other on; a car knocks one flying (up off the road, over)
// and isn't slowed by it; people walking past shove them aside; a huge knock on a slow frame
// doesn't blow up. You: a sprint at a thin wall at 10 frames a second never carries you through
// it, you're never left standing inside something pinned against a wall, and walking along a wall
// you slide along it. The traffic's bodies dip under braking and settle.
const L = require('./lib.js');
L.run('physics: loose things, you, and the traffic', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => {
    DV.State.setFlag('results_discussed'); DV.State.setFlag('security_cleared');
    DV.Player.place(-200, 150, 0); QA.step(0.6);
    const z = DV.World.current;
    window.W = z.physics;
    // an open spot on a pavement near (x, z): nothing standing within r of it
    window.openNear = (x, zz, r) => {
      for (let d = 0; d < 60; d += 1.5) for (let a = 0; a < 16; a++) {
        const px = x + Math.cos(a / 16 * 6.283) * d, pz = zz + Math.sin(a / 16 * 6.283) * d;
        if (z.walkable(px, pz) && !z.colliders.blocked(px, pz, r, 'player') && !W.bodies.some((b) => Math.hypot(b.x - px, b.z - pz) < r + 0.6)) return [px, pz];
      }
      return null;
    };
    window.settle = (b, secs) => { for (let t = 0; t < (secs || 5) && !b.asleep; t += 0.05) W.step(0.05, {}); return b.asleep; };
  });

  // there, and drawn as one
  const there = await ev(() => {
    const kinds = {};
    for (const b of W.bodies) kinds[b.kind] = (kinds[b.kind] || 0) + 1;
    const meshes = []; DV.World.current.group.traverse((o) => { if (o.name === 'loose_things') meshes.push(o); });
    return { kinds, n: W.bodies.length, meshes: meshes.length, drawn: W.stats.drawn };
  });
  T.ok(there.n > 30 && there.kinds.bin > 5 && there.kinds.news > 2 && there.kinds.bag > 2, 'loose things round you: ' + JSON.stringify(there.kinds));
  T.ok(there.meshes === 1 && there.drawn > 20, 'all drawn in one mesh (' + there.drawn + ' of them: one draw call)');

  // you, walking and running into a bin
  const bump = await ev(() => {
    const out = {};
    for (const [k, run] of [['walk', false], ['run', true]]) {
      const at = openNear(-200, 150, 3.2);
      const b = W.add('bin', at[0], at[1], 0);
      const P = DV.Player;
      P.place(at[0] - 3, at[1], Math.PI / 2); DV.Game.rig.yaw = Math.PI / 2;
      P.stamina = 100; P.exhausted = false;
      let maxTip = 0, minY = 0;
      DV.Input.keys.KeyW = true; if (run) DV.Input.keys.ShiftLeft = true;
      for (let t = 0; t < 1.4; t += 0.05) { QA.step(0.05); maxTip = Math.max(maxTip, b.tip); minY = Math.min(minY, b.y); }
      DV.Input.keys.KeyW = false; DV.Input.keys.ShiftLeft = false;
      const slept = settle(b, 6);
      out[k] = { maxTip: +maxTip.toFixed(2), down: b.down, y: b.y, minY, slept, moved: +Math.hypot(b.x - at[0], b.z - at[1]).toFixed(2), finite: [b.x, b.z, b.tip].every(isFinite) };
    }
    return out;
  });
  T.ok(bump.walk.moved > 0.3 && !bump.walk.down && bump.walk.maxTip < 0.8, 'walking into a bin shoves it along (' + bump.walk.moved + ' m) and it stays up', bump.walk);
  T.ok(bump.run.down && bump.run.maxTip > 1.5, 'running into one knocks it over', bump.run);
  T.ok(bump.run.y === 0 && bump.run.minY >= 0 && bump.run.slept && bump.run.finite, 'it comes down on the ground (never through it), stops and sleeps', bump.run);

  // knocked hard at a wall: it stops at the wall
  const wall = await ev(() => {
    const z = DV.World.current, P = DV.Player;
    // a building face near you: walk a line until something solid's ahead
    const at = openNear(-200, 150, 1.2);
    let dir = null;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { for (let d = 1; d < 12; d += 0.25) if (z.colliders.blocked(at[0] + dx * d, at[1] + dz * d, 0.3, 'player')) { dir = [dx, dz, d]; break; } if (dir) break; }
    const b = W.add('news', at[0], at[1], Math.atan2(dir[0], dir[1]));
    W.knock(b, dir[0] * 14, dir[1] * 14, 0.2);
    settle(b, 8);
    const [x, zz, r] = W.plan(b);
    const near = z.colliders.query(x - r, zz - r, x + r, zz + r, []).filter((q) => q.enabled && q.y1 >= 0.35 && q.y0 <= 1.5);
    let worst = 0;
    for (const q of near) { const cx = Math.max(q.x0, Math.min(x, q.x1)), cz = Math.max(q.z0, Math.min(zz, q.z1)); worst = Math.max(worst, r - Math.hypot(x - cx, zz - cz)); }
    void P;
    return { wallAt: dir[2], travelled: +Math.hypot(b.x - at[0], b.z - at[1]).toFixed(2), pen: +worst.toFixed(3) };
  });
  T.ok(wall.pen < 0.03 && wall.travelled < wall.wallAt + 0.6, 'knocked hard at a wall it stops at the wall (in by ' + wall.pen + ' m, ' + wall.travelled + ' m from where it was, the wall ' + wall.wallAt + ' m off)', wall);

  // on its side: rolls across its axis, slides along it
  const roll = await ev(() => {
    const out = {};
    for (const k of ['across', 'along']) {
      const at = openNear(-200, 150, 4);
      const b = W.add('bin', at[0], at[1], 0);
      b.down = true; b.tip = Math.PI / 2; b.dir = 0; b.asleep = false; // (lying with its axis along +z)
      if (k === 'across') W.knock(b, 2.5, 0, 0); else W.knock(b, 0, 2.5, 0);
      const x0 = b.x, z0 = b.z;
      settle(b, 8);
      out[k] = +Math.hypot(b.x - x0, b.z - z0).toFixed(2);
      out[k + 'Spin'] = +Math.abs(b.spin).toFixed(2);
    }
    return out;
  });
  T.ok(roll.across > roll.along * 2 && roll.acrossSpin > 1 && roll.alongSpin < 0.2, 'a bin on its side rolls across its axis (' + roll.across + ' m, turning as it goes) far more than it slides along it (' + roll.along + ' m)', roll);

  // one into another; a car; someone walking past
  const others = await ev(() => {
    const at = openNear(-200, 150, 3);
    const a = W.add('bin', at[0], at[1], 0), b = W.add('bin', at[0] + 1.2, at[1], 0);
    W.knock(a, 4, 0, 0);
    for (let t = 0; t < 2; t += 0.05) W.step(0.05, {});
    const chain = +Math.hypot(b.x - b.home[0], b.z - b.home[1]).toFixed(2);
    // a car coming along at 10 m/s, a cone in its way
    const at2 = openNear(-160, 150, 3), cone = W.add('cone', at2[0], at2[1], 0);
    const car = { x: at2[0] - 6, z: at2[1], hx: 1, hz: 0, speed: 10, turn: null, v: { length: 4.4, width: 1.8 } };
    let maxY = 0, maxV = 0;
    for (let t = 0; t < 2.5; t += 0.02) { car.x += car.speed * 0.02; W.step(0.02, { cars: [car] }); maxY = Math.max(maxY, cone.y); maxV = Math.max(maxV, Math.hypot(cone.vx, cone.vz)); }
    settle(cone, 6);
    // someone walking into a bin
    const at3 = openNear(-240, 150, 3), bin = W.add('bin', at3[0], at3[1], 0);
    const ped = { x: at3[0] - 1.5, z: at3[1], vx: 1.3, vz: 0 };
    for (let t = 0; t < 2; t += 0.05) { ped.x += ped.vx * 0.05; W.step(0.05, { peds: [ped] }); }
    return { chain, cone: { maxY: +maxY.toFixed(2), maxV: +maxV.toFixed(1), down: cone.down, ahead: cone.x > at2[0] + 2 }, carSpeed: car.speed, ped: +Math.hypot(bin.x - at3[0], bin.z - at3[1]).toFixed(2), binUp: !bin.down };
  });
  T.ok(others.chain > 0.3, 'a bin knocked into another sends it on (' + others.chain + ' m)');
  T.ok(others.cone.maxV > 8 && others.cone.maxY > 0.1 && others.cone.down && others.cone.ahead && others.carSpeed === 10, 'a car at 10 m/s knocks a cone flying (up off the road and over) and isn\'t slowed by it', others.cone);
  T.ok(others.ped > 0.5 && others.binUp, 'someone walking into a bin shoves it aside (' + others.ped + ' m) without knocking it over');

  // a huge knock on a slow frame
  const wild = await ev(() => {
    const at = openNear(-200, 150, 2), b = W.add('crate', at[0], at[1], 0);
    W.knock(b, 60, 40, 0.5, 20);
    const v0 = Math.hypot(b.vx, b.vz), up0 = b.vy;
    for (let k = 0; k < 60; k++) W.step(0.25, {});
    return { ok: [b.x, b.y, b.z, b.vx, b.vz, b.vy, b.tip, b.w].every(isFinite), v0: +v0.toFixed(1), up0, y: b.y, far: +Math.hypot(b.x - at[0], b.z - at[1]).toFixed(1), asleep: b.asleep };
  });
  T.ok(wild.v0 <= 22 && wild.up0 <= 9, 'a knock of 72 m/s is held to what a car could do (' + wild.v0 + ' m/s, ' + wild.up0 + ' up)');
  T.ok(wild.ok && wild.y === 0 && wild.asleep, 'and on slow frames it doesn\'t blow up: it lands, slides to a stop (' + wild.far + ' m off) and sleeps', wild);

  // you: a sprint at a thin wall at 10 frames a second
  const thin = await ev(() => {
    const z = DV.World.current, P = DV.Player, at = openNear(-200, 150, 4);
    const wallB = z.colliders.add(at[0] + 1.5, at[1] - 3, at[0] + 1.6, at[1] + 3, { y1: 3 }); // 10 cm thick
    P.place(at[0] - 1, at[1], Math.PI / 2); DV.Game.rig.yaw = Math.PI / 2;
    P.vx = 9; P.vz = 0; P.stamina = 100; P.exhausted = false;
    DV.Input.keys.KeyW = true; DV.Input.keys.ShiftLeft = true;
    let crossed = false;
    for (let t = 0; t < 2; t += 0.1) { QA.step(0.1); if (P.x > at[0] + 1.55) crossed = true; }
    DV.Input.keys.KeyW = false; DV.Input.keys.ShiftLeft = false;
    const stoppedAt = P.x - (at[0] + 1.5);
    wallB.enabled = false;
    return { crossed, stoppedAt: +stoppedAt.toFixed(2) };
  });
  T.ok(!thin.crossed && thin.stoppedAt < -0.25, 'a sprint at a 10 cm wall at 10 frames a second never carries you through it (stopped ' + -thin.stoppedAt + ' m short of its face)', thin);
  // you, pushing something that's against a wall
  const pinned = await ev(() => {
    const z = DV.World.current, P = DV.Player, at = openNear(-200, 150, 4);
    const wallB = z.colliders.add(at[0] + 1.2, at[1] - 3, at[0] + 1.6, at[1] + 3, { y1: 3 });
    const b = W.add('news', at[0] + 0.6, at[1], Math.PI / 2);
    P.place(at[0] - 1.5, at[1], Math.PI / 2); DV.Game.rig.yaw = Math.PI / 2;
    DV.Input.keys.KeyW = true;
    let worst = 0;
    for (let t = 0; t < 3; t += 0.05) { QA.step(0.05); const [x, zz, r] = W.plan(b); worst = Math.max(worst, r + DV.Config.PLAYER.radius - Math.hypot(P.x - x, P.z - zz)); }
    DV.Input.keys.KeyW = false;
    wallB.enabled = false;
    return { worst: +worst.toFixed(3) };
  });
  T.ok(pinned.worst < 0.08, 'pushing a newspaper box that\'s up against a wall, you\'re never left standing inside it (' + pinned.worst + ' m at worst)', pinned);
  // sliding along a wall
  const slide = await ev(() => {
    const z = DV.World.current, P = DV.Player, at = openNear(-200, 150, 5);
    const wallB = z.colliders.add(at[0] - 4, at[1] + 0.5, at[0] + 4, at[1] + 0.8, { y1: 3 });
    P.place(at[0] - 2, at[1], 0); DV.Game.rig.yaw = Math.atan2(1, 1); // (into it at 45°)
    const x0 = P.x;
    DV.Input.keys.KeyW = true;
    for (let t = 0; t < 1.5; t += 0.05) QA.step(0.05);
    DV.Input.keys.KeyW = false;
    wallB.enabled = false;
    return { along: +(P.x - x0).toFixed(2), into: +(P.z - at[1]).toFixed(2) };
  });
  T.ok(slide.along > 1.2 && slide.into < 0.2, 'walking into a wall at an angle, you slide along it (' + slide.along + ' m along, not through it)', slide);

  // the traffic on its springs
  const susp = await ev(() => {
    const life = DV.World.current.streetLife;
    const mesh = new THREE.Object3D(), root = new THREE.Object3D();
    const c = { speed: 12, v: { mesh, root } };
    life.suspension(c, 12, 0.05);
    let dip = 0;
    for (let k = 0; k < 10; k++) { const was = c.speed; c.speed = Math.max(0, c.speed - 6 * 0.05); life.suspension(c, was, 0.05); dip = Math.max(dip, mesh.rotation.x); }
    for (let k = 0; k < 40; k++) life.suspension(c, c.speed, 0.05);
    return { dip: +dip.toFixed(3), after: +mesh.rotation.x.toFixed(4) };
  });
  T.ok(susp.dip > 0.01 && Math.abs(susp.after) < 0.003, 'braking, a car\'s nose dips (' + susp.dip + ' rad) and settles when it stops', susp);
  T.noErrors(errs);
});
