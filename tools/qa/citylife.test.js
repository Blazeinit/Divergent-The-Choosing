// The city going about its day (js/game/citylife.js): scenes on the pavement near you, by sector and
// hour; nobody standing in a wall, a road or street furniture; a stallholder hands you something; by
// night only the Dauntless crews and the factionless fires; nothing of it drawn from inside.
const L = require('./lib.js');
L.run('city life: scenes on the pavements', async (p, T, errs) => {
  const ev = (fn, a) => p.evaluate(fn, a);
  await L.quickStart(p);
  const go = (x, z, h) => ev(([x, z, h]) => {
    DV.Clock.skipTo(h * 60);
    const W = DV.World.current.streetLife.walk; let best = null, bd = 1e9;
    for (const e of W.edgesNear(x, z, 40)) { if (W.edges[e].cross) continue; const A = W.nodes[W.edges[e].a]; const d = Math.hypot(A.x - x, A.z - z); if (d < bd) { bd = d; best = A; } }
    DV.Player.place(best.x, best.z, 0);
  }, [x, z, h]);
  const check = () => ev(() => {
    const cl = DV.CityLife.active(), zone = DV.World.current, CM = DV.CityMap, bad = [];
    const inRoad = (x, z) => CM.avenues.some((a) => Math.abs(x - a.x) < a.w / 2 - 0.2) && false || CM.avenues.some((a) => Math.abs(x - a.x) < a.w / 2 - 0.2 && !CM.streets.some((s) => Math.abs(z - s.z) < 40) ) || CM.streets.some((s) => { const r = CM.road(s); return z > r[0] + 0.2 && z < r[1] - 0.2; }) || CM.avenues.some((a) => Math.abs(x - a.x) < a.w / 2 - 0.2);
    for (const sc of cl.scenes) for (const q of sc.people) {
      if (!q.child && zone.colliders.blocked(q.x, q.z, 0.15, 'npc')) bad.push([sc.kind, 'in something solid', Math.round(q.x), Math.round(q.z)]);
      if (inRoad(q.x, q.z)) bad.push([sc.kind, 'in the road', Math.round(q.x), Math.round(q.z)]);
    }
    return { scenes: cl.scenes.map((s) => s.kind), people: cl.info().people, bad };
  });
  // around the city by day
  const seen = new Set();
  let people = 0, bad = [];
  for (const [x, z, h] of [[96, 352, 13], [-318, -54, 11], [-128, 290, 15], [280, 290, 14], [330, -124, 16]]) {
    await go(x, z, h);
    await p.waitForTimeout(1800);
    const c = await check();
    c.scenes.forEach((k) => seen.add(k));
    people += c.people; bad = bad.concat(c.bad);
  }
  T.ok(seen.size >= 5 && people >= 20, 'five sectors by day: ' + seen.size + ' kinds of scene, ' + people + ' people at them (' + [...seen].join(', ') + ')');
  T.ok(!bad.length, 'nobody standing in a wall or in the road', bad.slice(0, 6));
  // a stallholder (or the volunteer with the bread) hands you something, once
  await go(-128, 290, 12);
  await p.waitForTimeout(1500);
  const gift = await ev(() => {
    const cl = DV.CityLife.active();
    for (let tries = 0; tries < 30; tries++) {
      const sc = cl.scenes.find((s) => s.gift && !s.gave);
      if (sc) { const v = sc.people.find((q) => q.role === 'vendor'); const n0 = DV.Inventory.list().length; v.it.onUse(); v.it.onUse(); return { kind: sc.kind, item: sc.gift, has: DV.Inventory.has(sc.gift), count: (DV.Inventory.list().find((e) => e.id === sc.gift) || {}).qty, n0, bark: !!v.bark }; }
      for (const s of cl.scenes) cl.release(s);
      cl.scenes = []; DV.Clock.skipTo(12 * 60);
      for (let k = 0; k < 6; k++) cl.spawn(DV.Player.x, DV.Player.z, true);
    }
    return null;
  });
  T.ok(gift && gift.has && gift.count === 1 && gift.bark, 'a stallholder says something and hands you something, once (' + (gift && gift.item) + ')', gift);
  // by night: only the crews and the fires
  await go(-300, 352, 23);
  await p.waitForTimeout(400);
  const night = await ev(() => { const cl = DV.CityLife.active(); for (const s of cl.scenes) cl.release(s); cl.scenes = []; cl.first = true; return 1; }).then(() => p.waitForTimeout(1500)).then(() => check());
  T.ok(night.scenes.every((k) => k === 'crew' || k === 'fire') && night.scenes.length <= 1, 'after ten at night, only the fires (and the Dauntless): ' + night.scenes.join(', '), night);
  // nothing of it from inside the Testing Center
  await ev(() => { DV.Player.place(40, 57, Math.PI); });
  await p.waitForTimeout(800);
  T.ok(await ev(() => { const cl = DV.CityLife.active(); return !cl.shown && cl.scenes.every((s) => s.people.every((q) => !q.model.root.visible)); }), 'none of it drawn from inside the Testing Center');
  T.noErrors(errs);
});
