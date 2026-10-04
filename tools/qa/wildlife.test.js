// Pigeons, crows and gulls, litter and flags: the flocks stay put until you run at them,
// scatter together, sit it out on a perch and come back down; walking past calmly doesn't
// spook them; the birds overhead keep circling; flags fly; litter blows about but stays put
// in the plaza; and all of it is a handful of draw calls.
const L = require('./lib.js');
L.run('wildlife & small motion', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const info = await ev(() => {
    const w = DV.World.current.wildlife;
    let birdMeshes = 0;
    DV.World.current.group.traverse((o) => { if (o.name === 'birds') birdMeshes++; });
    return { pigeons: w.birds.filter((b) => b.kind === 'pigeon').length, high: w.birds.filter((b) => b.state === 'circle').length, perches: w.perches.length, birdMeshes, flags: DV.Wildlife.flags.length };
  });
  T.ok(info.pigeons >= 20 && info.high >= 5, info.pigeons + ' pigeons on the ground, ' + info.high + ' crows and gulls overhead');
  T.eq(info.birdMeshes, 1, 'every bird is drawn in one instanced draw call');
  // left alone (player indoors), they stay on the ground
  const calm = await ev(() => {
    QA.tp(40, 30, 0);
    QA.step(20);
    const w = DV.World.current.wildlife;
    const pg = w.birds.filter((b) => b.kind === 'pigeon');
    const off = pg.filter((b) => b.state === 'ground' && !(b.x >= b.flock.rect[0] - 0.5 && b.x <= b.flock.rect[2] + 0.5 && b.z >= b.flock.rect[1] - 0.5 && b.z <= b.flock.rect[3] + 0.5));
    return { ground: pg.filter((b) => b.state === 'ground').length, total: pg.length, strays: off.length, scatters: w.log.scatters };
  });
  T.ok(calm.ground === calm.total && calm.scatters === 0, 'left alone they peck about on the ground (' + calm.ground + '/' + calm.total + ')');
  T.eq(calm.strays, 0, 'and stay on their own patch of ground');
  // walking calmly past at a couple of metres: nothing
  const walk = await ev(() => {
    const w = DV.World.current.wildlife, b0 = w.birds[0], P = DV.Player;
    // two metres clear of the nearest bird of the flock
    const mates = w.birds.filter((b) => b.flock === b0.flock);
    const xMax = Math.max(...mates.map((b) => b.x)), zMid = mates.reduce((s, b) => s + b.z, 0) / mates.length;
    P.place(xMax + 2.2, zMid, 0);
    for (let i = 0; i < 20; i++) { P.speed = 1.3; w.update(0.05); }
    return w.birds.filter((b) => b.flock === b0.flock && b.state !== 'ground').length;
  });
  T.eq(walk, 0, 'walking calmly past a couple of metres away doesn\'t spook them');
  // running at them: the whole flock goes up together, with a clatter of wings
  const run = await ev(() => {
    const w = DV.World.current.wildlife, b0 = w.birds[0], P = DV.Player, flock = b0.flock;
    P.place(b0.x - 2.5, b0.z, 0);
    for (let i = 0; i < 4; i++) { P.speed = 5; w.update(0.05); }
    const mates = w.birds.filter((b) => b.flock === flock);
    const up = mates.filter((b) => b.state === 'fly').length;
    for (let i = 0; i < 80; i++) { P.speed = 0; w.update(0.05); }
    const maxY = Math.max(...mates.map((b) => b.y));
    return { up, n: mates.length, scatters: w.log.scatters, perched: mates.filter((b) => b.state === 'perch').length, ground: mates.filter((b) => b.state === 'ground').length, maxY };
  });
  T.ok(run.up === run.n && run.scatters === 1, 'running at a flock sends all ' + run.n + ' up at once (' + run.up + ' flying)');
  T.ok(run.perched + run.ground === run.n && run.perched > 0, 'they land again — ' + run.perched + ' on perches, ' + run.ground + ' further off on the ground');
  // later, with nobody about, they drift back down to their patch
  const back = await ev(() => {
    const w = DV.World.current.wildlife, flock = w.birds[0].flock;
    DV.Player.place(40, 30, 0);
    for (let i = 0; i < 1600; i++) w.update(0.05);
    const mates = w.birds.filter((b) => b.flock === flock);
    return { ground: mates.filter((b) => b.state === 'ground').length, n: mates.length };
  });
  T.eq(back.ground, back.n, 'after a while with nobody about, the flock is back down on its patch');
  // crows and gulls keep wheeling overhead
  const high = await ev(() => {
    const w = DV.World.current.wildlife;
    const c = w.birds.filter((b) => b.state === 'circle');
    const before = c.map((b) => [b.x, b.z]);
    for (let i = 0; i < 40; i++) w.update(0.05);
    return { moved: c.every((b, i) => Math.hypot(b.x - before[i][0], b.z - before[i][1]) > 0.5), minY: Math.min(...c.map((b) => b.y)) };
  });
  T.ok(high.moved && high.minY > 20, 'crows and gulls circle high over the city (lowest ' + high.minY.toFixed(0) + ' m)');
  // flags fly; litter blows about inside the plaza
  const motion = await ev(() => {
    const f = DV.Wildlife.flags.find((x) => x.mesh.parent && x.mesh.parent.parent === DV.World.current.group || x.mesh.parent === DV.World.current.group);
    // the tip's range of motion over a couple of seconds (one pair of samples can land on the same phase)
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < 12; i++) { QA.step(0.15); const z = f.pos.getZ(f.pos.count - 1); lo = Math.min(lo, z); hi = Math.max(hi, z); }
    const z1 = lo, z2 = hi;
    const w = DV.World.current.wildlife, Lt = w.litter;
    const start = Lt.items.map((it) => [it.x, it.z]);
    DV.Wildlife.wind.t = 1.4 / 0.47; // into a gusty stretch
    for (let i = 0; i < 1200; i++) w.update(0.05);
    const moved = Lt.items.filter((it, i) => Math.hypot(it.x - start[i][0], it.z - start[i][1]) > 0.5).length;
    const [x0, z0, x1, z1r] = Lt.rect;
    const inside = Lt.items.every((it) => it.x >= x0 - 0.01 && it.x <= x1 + 0.01 && it.z >= z0 - 0.01 && it.z <= z1r + 0.01 && it.y >= 0);
    return { flag: Math.abs(z2 - z1), moved, n: Lt.items.length, inside };
  });
  T.ok(motion.flag > 0.05, 'flags fly in the wind (tip swings ' + motion.flag.toFixed(2) + ' m)');
  T.ok(motion.moved > 0 && motion.inside, motion.moved + ' of ' + motion.n + ' scraps of litter blew about, all still in the plaza');
  await L.shot(p, 'wildlife');
  T.noErrors(errs);
});
