// Physics, part two: things with weight. Loose things fall, bounce and settle, rest on top of each
// other, roll (a kicked bin, a ball off your foot, a can), and jump when you land beside them; people
// walking step round a bin lying on the pavement. You: a walk at once, a run built up to, a slide
// when you stop from one; a ledge you walk straight up and a wall you don't; a jump a moment after
// stepping off an edge, and Space a moment before landing; you can stand on a crate. Traffic: a car
// pulls away without a jolt, stops for you when it can, and when it can't it knocks you down: thrown,
// flat on your back, up again, and the people round about stop and stare. Nothing ever NaN, and the
// step stays cheap.
const L = require('./lib.js');
L.run('physics 2: weight, stacking, rolling, movement feel, knock-downs', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => {
    DV.State.setFlag('results_discussed'); DV.State.setFlag('security_cleared');
    DV.Player.place(-200, 150, 0); QA.step(0.6);
    const z = DV.World.current;
    window.W = z.physics;
    window.openNear = (x, zz, r) => {
      for (let d = 0; d < 60; d += 1.5) for (let a = 0; a < 16; a++) {
        const px = x + Math.cos(a / 16 * 6.283) * d, pz = zz + Math.sin(a / 16 * 6.283) * d;
        if (z.walkable(px, pz) && !z.colliders.blocked(px, pz, r, 'player') && !W.bodies.some((b) => Math.hypot(b.x - px, b.z - pz) < r + 0.6)) return [px, pz];
      }
      return null;
    };
    window.tick = (dt) => { DV.Game.update(dt); DV.World.update(dt, DV.Game.camera); };
    window.settle = (b, secs) => { for (let t = 0; t < (secs || 6) && !b.asleep; t += 0.05) W.step(0.05, {}); return b.asleep; };
    window.fin = (b) => [b.x, b.y, b.z, b.vx, b.vy, b.vz, b.tip, b.w, b.yaw, b.spin].every(Number.isFinite);
    // you, running at something placed `d` ahead
    window.runAt = (b, at, d, secs) => {
      const P = DV.Player;
      P.place(at[0] - d, at[1], Math.PI / 2); DV.Game.rig.yaw = Math.PI / 2;
      P.stamina = 100; P.exhausted = false;
      DV.Input.keys.KeyW = true; DV.Input.keys.ShiftLeft = true;
      let maxY = 0;
      for (let t = 0; t < secs; t += 0.05) { QA.step(0.05); maxY = Math.max(maxY, b.y); }
      DV.Input.keys.KeyW = false; DV.Input.keys.ShiftLeft = false;
      QA.step(0.05);
      P.place(at[0] - d - 6, at[1] - 6, 0); // (out of its way)
      return maxY;
    };
  });

  // a bin you run into goes over and rolls, and comes to rest
  const bin = await ev(() => {
    const at = openNear(-200, 150, 6), b = W.add('bin', at[0], at[1], 0);
    runAt(b, at, 3, 1.1);
    settle(b, 8);
    const over = { down: b.down, rolled: +Math.abs(b.spin).toFixed(2) };
    // and kicked again where it lies, from the side (across it): it rolls away
    const [px, pz] = W.plan(b), P = DV.Player, ax = Math.cos(b.dir), az = -Math.sin(b.dir), spin0 = b.spin;
    P.place(px - ax * 2.5, pz - az * 2.5, Math.atan2(ax, az)); DV.Game.rig.yaw = Math.atan2(ax, az); P.stamina = 100; P.exhausted = false;
    DV.Input.keys.KeyW = true; DV.Input.keys.ShiftLeft = true;
    for (let t = 0; t < 0.8; t += 0.05) QA.step(0.05);
    DV.Input.keys.KeyW = false; DV.Input.keys.ShiftLeft = false;
    P.place(px - az * 6, pz + ax * 6, 0);
    settle(b, 10);
    const [qx, qz] = W.plan(b);
    return { over, down: b.down, spin: +Math.abs(b.spin - spin0).toFixed(2), travelled: +Math.hypot(qx - px, qz - pz).toFixed(2), asleep: b.asleep, y: b.y, fin: fin(b) };
  });
  T.ok(bin.over.down && bin.over.rolled > 0.2, 'a bin you run into goes over, and off rolling a little as it lands (' + bin.over.rolled + ' rad)', bin.over);
  T.ok(bin.down && bin.spin > 3 && bin.travelled > 1.5 && bin.asleep && bin.y === 0 && bin.fin, 'kicked again where it lies, it rolls away (' + bin.travelled + ' m, turning ' + bin.spin + ' rad) and comes to rest on the ground', bin);

  // a crate dropped from 3 m: falls, bounces (less each time), settles on the ground
  const drop = await ev(() => {
    const at = openNear(-200, 150, 2), b = W.add('crate', at[0], at[1], 0.3, 3);
    W.wake(b);
    let bounces = 0, peak2 = 0, prevVy = 0, minY = 9, t = 0, landedAt = null;
    for (; t < 8 && !b.asleep; t += 1 / 60) {
      W.step(1 / 60, {});
      if (prevVy < -0.5 && b.vy > 0.3) { bounces++; if (landedAt === null) landedAt = t; }
      if (bounces === 1) peak2 = Math.max(peak2, b.y);
      prevVy = b.vy; minY = Math.min(minY, b.y);
    }
    return { bounces, peak2: +peak2.toFixed(3), minY, y: b.y, asleep: b.asleep, t: +t.toFixed(2), landedAt: landedAt && +landedAt.toFixed(2), fin: fin(b) };
  });
  T.ok(drop.landedAt > 0.65 && drop.landedAt < 0.85, 'a crate dropped from 3 m falls under gravity (lands at ' + drop.landedAt + ' s; free fall says 0.78)', drop);
  T.ok(drop.bounces >= 1 && drop.peak2 > 0.02 && drop.peak2 < 0.6, 'it bounces, a little (' + drop.bounces + ' bounces, the first ' + drop.peak2 + ' m up)', drop);
  T.ok(drop.minY >= 0 && drop.y === 0 && drop.asleep && drop.fin, 'and settles on the ground, never through it, and sleeps (' + drop.t + ' s)', drop);

  // a ball bounces higher than a crate, and a rubbish bag not at all
  const balls = await ev(() => {
    const out = {};
    for (const k of ['ball', 'bag']) {
      const at = openNear(-200, 150, 2), b = W.add(k, at[0], at[1], 0, 2);
      W.wake(b);
      let up = 0, n = 0, prev = 0;
      for (let t = 0; t < 8 && !b.asleep; t += 1 / 60) { W.step(1 / 60, {}); if (prev < -0.5 && b.vy > 0.2) n++; if (n === 1) up = Math.max(up, b.y); prev = b.vy; }
      out[k] = { up: +up.toFixed(2), n, asleep: b.asleep, y: b.y };
    }
    return out;
  });
  T.ok(balls.ball.up > 0.6 && balls.ball.n >= 3 && balls.ball.asleep && balls.bag.n === 0 && balls.bag.asleep, 'dropped from 2 m a ball bounces back ' + balls.ball.up + ' m (' + balls.ball.n + ' bounces), a rubbish bag not at all', balls);

  // stacking: a crate dropped onto another rests on top of it; knock the bottom one away and it falls
  const stack = await ev(() => {
    const at = openNear(-200, 150, 3), lo = W.add('crate', at[0], at[1], 0), hi = W.add('crate', at[0] + 0.05, at[1] - 0.04, 0.2, 1.5);
    W.wake(hi);
    settle(hi, 6);
    const rest = { y: +hi.y.toFixed(3), on: hi.on === lo, asleep: hi.asleep, loMoved: +Math.hypot(lo.x - at[0], lo.z - at[1]).toFixed(3) };
    // a car-hard knock to the bottom one, low down
    W.knock(lo, 6, 0, 0.1);
    for (let t = 0; t < 8 && !(lo.asleep && hi.asleep); t += 0.05) W.step(0.05, {});
    // and one of the streets' own stacks (two crates and one on the first) is standing as it was put
    const built = W.bodies.filter((b) => b.kind === 'crate' && b.home && b.y > 0.5);
    return { rest, fell: { y: hi.y, asleep: hi.asleep, lo: lo.asleep }, built: built.length, builtOn: built.every((b) => Math.abs(b.y - DV.Physics.SHAPES.crate.h) < 0.01), fin: fin(lo) && fin(hi) };
  });
  T.ok(Math.abs(stack.rest.y - 0.6) < 0.01 && stack.rest.on && stack.rest.asleep && stack.rest.loMoved < 0.05, 'a crate dropped onto another comes to rest on top of it (at ' + stack.rest.y + ' m) and sleeps there', stack.rest);
  T.ok(stack.fell.y === 0 && stack.fell.asleep && stack.fin, 'knock the bottom one out from under it and it falls to the ground and settles', stack.fell);
  T.ok(stack.built >= 1 && stack.builtOn, 'the streets have crates stacked on crates (' + stack.built + ' near you), resting where they were put');

  // a ball off your foot at a run: up, a long way, turning as it rolls; a can goes over and rolls
  const kick = await ev(() => {
    const out = {};
    for (const k of ['ball', 'can']) {
      const at = openNear(-200, 150, 5), b = W.add(k, at[0], at[1], 0);
      const maxY = runAt(b, at, 3, 0.9);
      let far = 0, maxV = 0;
      for (let t = 0; t < 20 && !b.asleep; t += 0.05) { W.step(0.05, {}); far = Math.max(far, Math.hypot(b.x - at[0], b.z - at[1])); maxV = Math.max(maxV, Math.hypot(b.vx, b.vz)); }
      out[k] = { maxY: +maxY.toFixed(2), far: +far.toFixed(1), down: b.down, asleep: b.asleep, turned: b.q ? +(2 * Math.acos(Math.min(1, Math.abs(b.q.w)))).toFixed(2) : +Math.abs(b.spin).toFixed(2), fin: fin(b) };
    }
    return out;
  });
  T.ok(kick.ball.maxY > 0.15 && kick.ball.far > 5 && kick.ball.turned > 0.3 && kick.ball.asleep && kick.ball.fin, 'running into a ball kicks it: up off the ground (' + kick.ball.maxY + ' m), ' + kick.ball.far + ' m away, turning as it rolls, and it comes to rest', kick.ball);
  T.ok(kick.can.down && kick.can.far > 1 && kick.can.asleep && kick.can.fin, 'a can kicked at a run goes over and rolls off (' + kick.can.far + ' m)', kick.can);

  // landing from a jump beside some cans: they jump
  const thump = await ev(() => {
    const P = DV.Player, at = openNear(-200, 150, 3);
    const cans = [[0.7, 0], [-0.6, 0.4], [0, -0.8]].map(([dx, dz]) => W.add('can', at[0] + dx, at[1] + dz, 0));
    P.place(at[0], at[1], 0); P.stamina = 100; P.exhausted = false;
    DV.Input.pressed.Space = true;
    let maxY = 0;
    for (let t = 0; t < 1.6; t += 0.05) { QA.step(0.05); for (const c of cans) maxY = Math.max(maxY, c.y); }
    const ok = cans.every(fin);
    for (const c of cans) settle(c, 6);
    return { maxY: +maxY.toFixed(3), ok, asleep: cans.every((c) => c.asleep), dip: DV.Game.rig.dipY !== undefined };
  });
  T.ok(thump.maxY > 0.02 && thump.ok && thump.asleep, 'landing from a jump beside some cans makes them jump (' + thump.maxY + ' m) and they settle again', thump);

  // people walking along the pavement step round a bin lying in their way
  const dodge = await ev(() => {
    const zone = DV.World.current, life = zone.streetLife, Wk = life.walk, P = DV.Player;
    P.place(-200, 150, 0); QA.step(0.3);
    let tries = 0, res = null;
    for (const ped of life.peds.slice()) {
      const e = Wk.edges[ped.edge];
      if (e.cross || e.len - ped.t < 9 || Math.hypot(ped.x - P.x, ped.z - P.z) < 6) continue;
      if (++tries > 6) break;
      Object.assign(ped, { listen: 0, wait: 0, shock: 0, side: 0, dodge: 0, dodgeTo: 0, dodgeT: 0 });
      const A = Wk.nodes[ped.from], B = Wk.nodes[ped.to], dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len;
      const s = ped.t + 2.6, lat = ped.lat;
      const bx = A.x + dx * s - dz * lat, bz = A.z + dz * s + dx * lat;
      if (zone.colliders.blocked(bx, bz, 0.4, 'npc')) continue;
      const b = W.add('bin', bx, bz, 0);
      b.down = true; b.tip = Math.PI / 2; b.dir = Math.atan2(dx, dz) + Math.PI / 2; // (lying across their way)
      const [px, pz] = W.plan(b);
      let closest = 9, swerve = 0;
      for (let t = 0; t < 3.5; t += 0.05) {
        QA.step(0.05, [-200, 150]);
        if (life.peds.indexOf(ped) < 0) break;
        closest = Math.min(closest, Math.hypot(ped.x - px, ped.z - pz));
        swerve = Math.max(swerve, Math.abs(ped.dodge || 0));
      }
      res = { swerve: +swerve.toFixed(2), closest: +closest.toFixed(2), binMoved: +Math.hypot(W.plan(b)[0] - px, W.plan(b)[1] - pz).toFixed(2), passed: Math.abs((ped.x - A.x) * dx + (ped.z - A.z) * dz) > s + 0.5 || ped.edge !== Wk.edges.indexOf(e) };
      W.remove(b);
      break;
    }
    return res;
  });
  T.ok(dodge && dodge.swerve > 0.3 && dodge.binMoved < 0.3 && dodge.passed, 'someone walking along steps round a bin lying in their way (' + (dodge && dodge.swerve) + ' m over) instead of walking through it (it moved ' + (dodge && dodge.binMoved) + ' m)', dodge);

  // you: a walk at once, a run built up to, and a slide when you stop from one
  const feel = await ev(() => {
    const P = DV.Player, at = openNear(-200, 150, 6), sp = [];
    P.place(at[0] - 5, at[1], Math.PI / 2); DV.Game.rig.yaw = Math.PI / 2; P.stamina = 100; P.exhausted = false;
    DV.Input.keys.KeyW = true;
    QA.step(0.25);
    const walk = Math.hypot(P.vx, P.vz);
    DV.Input.keys.KeyW = false; QA.step(0.5);
    DV.Input.keys.KeyW = true; DV.Input.keys.ShiftLeft = true;
    for (let k = 0; k < 20; k++) { QA.step(0.05); sp.push(+Math.hypot(P.vx, P.vz).toFixed(2)); }
    DV.Input.keys.KeyW = false; DV.Input.keys.ShiftLeft = false;
    const x0 = P.x;
    let skid = false, t = 0;
    for (; t < 2 && Math.hypot(P.vx, P.vz) > 0; t += 0.05) { QA.step(0.05); skid = skid || P.skidding; }
    return { walk: +walk.toFixed(2), at01: sp[1], at03: sp[5], at1: sp[19], slide: +(P.x - x0).toFixed(2), skid, stopIn: +t.toFixed(2), lean: P.lean };
  });
  T.ok(feel.walk > 2.2, 'from a standstill you\'re at a walk in a quarter of a second (' + feel.walk + ' m/s)', feel);
  T.ok(feel.at01 < feel.at03 && feel.at03 < feel.at1 && feel.at1 > 5, 'a run builds up (' + feel.at01 + ' → ' + feel.at03 + ' → ' + feel.at1 + ' m/s over a second)', feel);
  T.ok(feel.skid && feel.slide > 0.6 && feel.slide < 2.2 && feel.stopIn < 1, 'letting go at a run, you slide to a stop (' + feel.slide + ' m in ' + feel.stopIn + ' s)', feel);

  // a ledge 22 cm high you walk straight up (and off again); one 60 cm high stops you
  const ledge = await ev(() => {
    const zone = DV.World.current, P = DV.Player, at = openNear(-200, 150, 5);
    const out = {};
    for (const [k, h] of [['low', 0.22], ['high', 0.6]]) {
      const box = zone.colliders.add(at[0] + 1, at[1] - 1.5, at[0] + 2.5, at[1] + 1.5, { y1: h });
      P.place(at[0] - 1, at[1], Math.PI / 2); DV.Game.rig.yaw = Math.PI / 2;
      DV.Input.keys.KeyW = true;
      let top = 0, onAt = null;
      for (let t = 0; t < 2.6; t += 0.05) { QA.step(0.05); if (P.x > at[0] + 1.3 && P.x < at[0] + 2.2) { top = Math.max(top, P.y); if (onAt === null && P.y > h - 0.01) onAt = P.x; } }
      DV.Input.keys.KeyW = false;
      out[k] = { top: +top.toFixed(3), x: +(P.x - at[0]).toFixed(2), y: +P.y.toFixed(3), onGround: P.onGround };
      box.enabled = false;
    }
    return out;
  });
  T.ok(Math.abs(ledge.low.top - 0.22) < 0.01 && ledge.low.x > 2.8 && ledge.low.y === 0, 'walking at a 22 cm ledge (a kerb, a step) you step straight up onto it (' + ledge.low.top + ' m) and down off the far side', ledge.low);
  T.ok(ledge.high.x < 0.75 && ledge.high.y === 0, 'a 60 cm one stops you (' + ledge.high.x + ' m along)', ledge.high);

  // stepping off a 1 m platform: a jump a moment later still works (coyote time); later, it doesn't.
  // Space pressed just before you land jumps as you land (the jump buffer)
  const jumps = await ev(() => {
    const zone = DV.World.current, P = DV.Player, at = openNear(-200, 150, 5);
    const box = zone.colliders.add(at[0] - 3, at[1] - 1.5, at[0], at[1] + 1.5, { y1: 1.0 });
    const off = (late) => {
      P.place(at[0] - 0.6, at[1], Math.PI / 2); P.y = 1.0; P.onGround = true; P.stamina = 100; P.exhausted = false; DV.Game.rig.yaw = Math.PI / 2;
      DV.Input.keys.KeyW = true;
      let t = 0;
      for (; t < 2 && P.onGround; t += 1 / 60) tick(1 / 60);
      DV.Input.keys.KeyW = false;
      // (the step off happened at t; wait `late` seconds, then Space)
      for (let w = 0; w < late - 1e-6; w += 1 / 60) tick(1 / 60);
      const vy0 = P.vy;
      DV.Input.pressed.Space = true;
      tick(1 / 60);
      return { left: +t.toFixed(2), jumped: P.vy > 1, vy0: +vy0.toFixed(2), vy: +P.vy.toFixed(2) };
    };
    const early = off(0.05), late = off(0.3);
    // the buffer: falling, Space 0.1 s before the ground
    P.place(at[0] + 3, at[1], 0); P.y = 1.2; P.onGround = false; P.vy = 0; P.stamina = 100;
    let pressed = false, jumpedOnLanding = false, landed = false;
    for (let t = 0; t < 1.2; t += 1 / 60) {
      const tl = Math.sqrt(Math.max(0, P.vy * P.vy + 2 * 10.5 * P.y) ) - (-P.vy); // (time to the ground ≈ this / g)
      if (!pressed && !P.onGround && tl / 10.5 < 0.1) { DV.Input.pressed.Space = true; pressed = true; }
      tick(1 / 60);
      if (pressed && !landed && P.vy > 1) { jumpedOnLanding = true; landed = true; }
    }
    // a press well before landing doesn't count
    P.place(at[0] + 3, at[1], 0); P.y = 2.2; P.onGround = false; P.vy = 0; P.stamina = 100;
    DV.Input.pressed.Space = true; tick(1 / 60);
    let rejump = false;
    for (let t = 0; t < 1.2; t += 1 / 60) { tick(1 / 60); if (P.vy > 1) rejump = true; }
    box.enabled = false;
    return { early, late, buffered: jumpedOnLanding, tooEarly: rejump };
  });
  T.ok(jumps.early.jumped && !jumps.late.jumped, 'off the edge of a platform, Space 0.05 s later still jumps (coyote time); 0.3 s later it doesn\'t', jumps);
  T.ok(jumps.buffered && !jumps.tooEarly, 'falling, Space pressed 0.1 s before you land jumps as you land; pressed a second early, it doesn\'t', jumps);

  // you can stand on a crate (jump onto it), and walk off it
  const onCrate = await ev(() => {
    // (nobody walking by to shove it while you're on it: the passers-by gone, and the residents
    // (js/game/lives.js), whose routes go where they go, left out of the physics for the moment)
    const life = DV.World.current.streetLife;
    for (const q of life.peds.splice(0)) life.releasePed(q);
    life.pedT = 99;
    const walkers0 = life.walkers;
    life.walkers = () => [];
    // (nor a car through it: the spot it finds may be out in the road)
    for (const c of life.cars.splice(0)) life.releaseCar(c);
    life.carT = 99;
    const P = DV.Player, at = openNear(-200, 150, 4), b = W.add('crate', at[0], at[1], 0);
    // (and still: placing you doesn't take away the speed the run before left you with)
    for (const k in DV.Input.keys) DV.Input.keys[k] = false;
    P.place(at[0], at[1], 0); P.y = 0.9; P.onGround = false; P.vy = 0; P.vx = 0; P.vz = 0;
    let top = 0;
    for (let t = 0; t < 0.8; t += 0.05) { QA.step(0.05); top = P.y; }
    const stood = { y: +top.toFixed(3), onGround: P.onGround, crate: +Math.hypot(b.x - at[0], b.z - at[1]).toFixed(3) };
    DV.Game.rig.yaw = 0; DV.Input.keys.KeyW = true;
    for (let t = 0; t < 1.2; t += 0.05) QA.step(0.05);
    DV.Input.keys.KeyW = false; QA.step(0.6);
    life.walkers = walkers0;
    return { stood, after: +P.y.toFixed(3) };
  });
  T.ok(Math.abs(onCrate.stood.y - 0.6) < 0.01 && onCrate.stood.onGround && onCrate.stood.crate < 0.05 && onCrate.after === 0, 'come down on a crate and you stand on it (' + onCrate.stood.y + ' m up); walk off and you drop back to the street', onCrate);

  // traffic: a car pulls away without a jolt
  const pull = await ev(() => {
    const zone = DV.World.current, life = zone.streetLife, P = DV.Player;
    P.place(-200, 150, 0);
    for (const c of life.cars.splice(0)) life.releaseCar(c);
    life.carT = 99;
    // a lane with a long straight run ahead and nobody on it
    const lane = life.lanes.filter((l) => l.s1 - l.s0 > 160).sort((a, b) => Math.abs(a.c - 150) - Math.abs(b.c - 150))[0];
    const s = lane.dir > 0 ? lane.s0 + 30 : lane.s1 - 30;
    const c = life.carAt(lane, s, { kind: 'sedan' });
    c.speed = 0; c.acc = 0;
    const keep = [lane.axis === 'x' ? s : lane.c + 30, lane.axis === 'x' ? lane.c + 30 : s];
    P.place(keep[0], keep[1], 0);
    let jerk = 0, a0 = null, prev = 0, top = 0;
    for (let k = 0; k < 60; k++) {
      const was = c.speed;
      QA.step(0.05, keep);
      const a = (c.speed - was) / 0.05;
      if (k > 0 && a >= 0 && prev >= 0) jerk = Math.max(jerk, Math.abs(a - prev) / 0.05);
      if (a0 === null) a0 = a;
      prev = a; top = Math.max(top, c.speed);
    }
    return { a0: +a0.toFixed(2), jerk: +jerk.toFixed(1), top: +top.toFixed(1), why: c.why };
  });
  T.ok(pull.a0 < 1.2 && pull.jerk < 20 && pull.top > 3, 'a car pulls away gently (' + pull.a0 + ' m/s² in its first moment, the push never changing faster than ' + pull.jerk + ' m/s³) up to ' + pull.top + ' m/s', pull);

  // a car stops for you when it can; when it can't, it knocks you down
  const traffic = await ev(() => {
    const zone = DV.World.current, life = zone.streetLife, P = DV.Player;
    const lane = life.lanes.filter((l) => l.s1 - l.s0 > 160).sort((a, b) => Math.abs(a.c - 150) - Math.abs(b.c - 150))[0];
    const pos = (s) => (lane.axis === 'x' ? [s, lane.c] : [lane.c, s]);
    const out = {};
    for (const [k, gap] of [['far', 45], ['near', 3]]) {
      for (const c of life.cars.splice(0)) life.releaseCar(c);
      life.carT = 99;
      const sp = lane.dir > 0 ? lane.s0 + 70 : lane.s1 - 70;
      const [px, pz] = pos(sp);
      P.place(px, pz, 0); P.stamina = 100;
      // somebody walking by on the pavement, to see it
      for (let i = 0; i < 6; i++) life.spawnPed(px, pz, true);
      // (who's within earshot when it happens: they're the ones who should stop and stare)
      let witnesses = [];
      const off = DV.Events.on('player:knocked', (e) => { witnesses = life.peds.filter((q) => Math.hypot(q.x - e.x, q.z - e.z) < 22); });
      const c = life.carAt(lane, sp - lane.dir * (gap + 2.3 + 0.32), { kind: 'sedan' });
      c.speed = 11; c.acc = 0;
      let down = false, downFor = 0, minGap = 99, upAt = null, finite = true, lay = 0, thrown = 0;
      for (let t = 0; t < 7; t += 0.05) {
        QA.step(0.05);
        const a = (P.x - c.x) * c.hx + (P.z - c.z) * c.hz - c.v.length / 2;
        minGap = Math.min(minGap, a);
        if (P.state === 'down') { down = true; downFor += 0.05; thrown = Math.max(thrown, P.y); if (P.model.mesh.rotation.x < -1.2) lay++; }
        else if (down && upAt === null) upAt = +t.toFixed(2);
        finite = finite && [P.x, P.y, P.z, P.vx, P.vz, c.x, c.z, c.speed].every(Number.isFinite);
      }
      DV.Events.off('player:knocked', off);
      const stared = witnesses;
      out[k] = { down, downFor: +downFor.toFixed(2), upAt, minGap: +minGap.toFixed(2), carSpeed: +c.speed.toFixed(2), why: c.why, finite, state: P.state, lay, thrown: +thrown.toFixed(2), near: stared.length, said: stared.some((q) => q.bark && q.bark.until > performance.now() - 8000), stopped: stared.filter((q) => q.shock !== undefined).length };
    }
    return out;
  });
  T.ok(!traffic.far.down && traffic.far.minGap > 0.5 && traffic.far.carSpeed === 0 && traffic.far.finite, 'a car coming at 11 m/s with 45 m to go stops short of you (' + traffic.far.minGap + ' m off)', traffic.far);
  T.ok(traffic.near.down && traffic.near.thrown > 0.1 && traffic.near.lay > 5 && traffic.near.upAt && traffic.near.state === 'free' && traffic.near.finite, 'one 3 m off can\'t stop: it knocks you down (thrown ' + traffic.near.thrown + ' m up, flat on your back, up again after ' + traffic.near.upAt + ' s)', traffic.near);
  T.ok(traffic.near.carSpeed === 0, 'and it stops (' + traffic.near.why + ')', traffic.near);
  T.ok(traffic.near.near === 0 || (traffic.near.stopped > 0 && traffic.near.said), 'the people round about stop and stare, and one says something (' + traffic.near.stopped + ' of ' + traffic.near.near + ')', traffic.near);

  // nothing NaN anywhere; the step stays cheap
  const cost = await ev(() => {
    const P = DV.Player;
    P.place(-200, 150, 0); QA.step(0.2);
    const near = W.bodies.filter((b) => Math.hypot(b.x - P.x, b.z - P.z) < 70).slice(0, 60);
    for (const [i, b] of near.entries()) W.knock(b, Math.cos(i) * 3, Math.sin(i) * 3, b.S.h * 0.6, 1);
    let worst = 0, sum = 0, n = 0;
    for (let k = 0; k < 90; k++) { const t0 = performance.now(); W.step(1 / 60, { player: { x: P.x, z: P.z, vx: 0, vz: 0, r: 0.32 } }); const d = performance.now() - t0; sum += d; n++; worst = Math.max(worst, d); }
    // asleep: what the step costs with nothing moving
    for (const b of [...W.live]) W.sleep(b);
    const t1 = performance.now();
    for (let k = 0; k < 200; k++) W.step(1 / 60, { player: { x: P.x, z: P.z, vx: 0, vz: 0, r: 0.32 } });
    const idle = (performance.now() - t1) / 200;
    const bad = W.bodies.filter((b) => !fin(b)).length;
    return { awake: near.length, avg: +(sum / n).toFixed(2), worst: +worst.toFixed(2), idle: +idle.toFixed(3), bodies: W.bodies.length, bad };
  });
  T.ok(cost.bad === 0, 'no body anywhere has a NaN or infinite position or speed (' + cost.bodies + ' bodies)');
  T.ok(cost.avg < 2.5 && cost.idle < 0.1, cost.awake + ' things knocked about at once cost ' + cost.avg + ' ms a frame on average (' + cost.worst + ' at worst); with everything asleep, ' + cost.idle + ' ms', cost);
  T.noErrors(errs);
});
