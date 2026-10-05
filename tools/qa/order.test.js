// Erudite's police (js/game/order.js): the Order Station on Armitage with its guards and vans, patrols
// on the pavements, drones over the streets; a word with an officer, a stop (name and faction), a
// drone's scan, and what happens when the Office has noticed you too much (two hours at the station).
const L = require('./lib.js');
L.run('public order: the station, patrols, drones, stops', async (p, T, errs) => {
  const ev = (fn, a) => p.evaluate(fn, a);
  await L.quickStart(p);
  await ev(() => { DV.Clock.skipTo(15 * 60); DV.Player.place(207, -392, Math.PI); DV.Game.rig.yaw = Math.PI; DV.Game.rig.follow(true); });
  await p.waitForFunction(() => { const o = DV.Order.active(); return o && o.posts.length === 4 && o.squads.length >= 1; }, null, { timeout: 60000 }).catch(() => {});
  const i0 = await ev(() => ({ info: DV.Order.active().info(), lm: !!DV.CityMap.landmark('order_station'), vans: DV.World.current.group.children.filter((c) => c.userData && c.userData.vehicle === 'van').length, calls: DV.Game.renderer.info.render.calls }));
  T.ok(i0.lm && i0.info.posts === 4 && i0.vans >= 3, 'the Order Station: its guards at the door and the gate, the vans in the yard', i0);
  T.ok(i0.info.squads >= 1, 'a patrol out on the pavements near you', i0.info);
  T.ok(i0.calls < 230, 'in front of the station: ' + i0.calls + ' draw calls');
  // a word with an officer
  const talk = await ev(() => { const o = DV.Order.active(); const m = o.squads[0].members[0]; o.talkTo(m); return { on: DV.Dialogue.isActive(), tree: DV.Dialogue.active && DV.Dialogue.active.tree.id, state: DV.Game.state }; });
  T.ok(talk.on && talk.tree === 'order_officer' && talk.state === 'dialogue', 'E on an officer: a word with them', talk);
  const said = await ev(() => [QA.pick('Who gives you'), QA.pick('Right')]);
  T.ok(said.every((x) => /^ok/.test(x)), 'who gives the orders (Erudite runs it; Dauntless walks it)', said);
  await ev(() => QA.end());
  // a stop: name and faction
  const stop = await ev(() => {
    const o = DV.Order.active(), sq = o.squads[0];
    sq.mode = 'walk'; sq.lead.x = DV.Player.x + 3; sq.lead.z = DV.Player.z;
    o.callStop(sq);
    return sq.mode;
  });
  T.ok(stop === 'approach', 'a patrol calls you over');
  await p.waitForFunction(() => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'order_stop', null, { timeout: 20000 }).catch(() => {});
  const s1 = await ev(() => ({ on: DV.Dialogue.isActive() && DV.Dialogue.active.tree.id, stops: DV.Order.active().info().stops }));
  T.ok(s1.on === 'order_stop' && s1.stops === 1, 'they walk up and ask: name and faction', s1);
  await ev(() => { DV.State.data.world.order.notice = 30; });
  const ans = await ev(() => QA.pick('[Tell him]'));
  const s2 = await ev(() => ({ notice: DV.Order.notice(), cleared: DV.State.data.world.order.cleared }));
  T.ok(/^ok/.test(ans) && s2.cleared === 1 && s2.notice < 30, 'tell them, and you\'re clear (the Office notices you less)', s2);
  await ev(() => QA.end());
  // a drone looks at you
  await ev(() => { const o = DV.Order.active(); o.scanCool = 0; if (!o.drones.length) o.spawnDrone(DV.Player.x, DV.Player.z, true); const d = o.drones[0]; d.x = DV.Player.x + 4; d.z = DV.Player.z; d.y = 7; o.startScan(d, 'player'); });
  await p.waitForFunction(() => DV.State.data.world.order.scans >= 1, null, { timeout: 30000 }).catch(() => {});
  T.ok(await ev(() => DV.State.data.world.order.scans === 1), 'a drone comes down over you, scans you, and goes back up');
  // by day the drones only fly their rounds; after nine at night they come down and look at people
  const day = await ev(() => {
    const o = DV.Order.active(); DV.Clock.skipTo(15 * 60);
    let n = 0, seen = false;
    while (n++ < 400) { for (const d of o.drones) { d.scanT = 0; d.x = DV.Player.x + 3; d.z = DV.Player.z; } o.updateDrones(0.05, DV.Player.x, DV.Player.z); if (o.scanning) seen = true; }
    return { seen, hours: DV.Order.scanHours() };
  });
  T.ok(!day.seen && !day.hours, 'by day (15:00) no drone scans anybody', day);
  const night = await ev(() => {
    const o = DV.Order.active(); DV.Clock.skipTo(21 * 60 + 30); o.scanCool = 0;
    let n = 0, seen = false;
    while (n++ < 400 && !seen) { for (const d of o.drones) { if (d.mode === 'patrol') { d.scanT = 0; d.x = DV.Player.x + 3; d.z = DV.Player.z; } } o.updateDrones(0.05, DV.Player.x, DV.Player.z); if (o.scanning) seen = true; }
    if (o.scanning) o.endScan(o.scanning);
    return { seen, hours: DV.Order.scanHours() };
  });
  T.ok(night.seen && night.hours, 'after nine (21:30) they come down and scan people', night);
  // too much notice: two hours at the station
  const t0 = await ev(() => DV.Clock.total());
  await ev(() => DV.Order.active().addNotice(100, 'QA'));
  await p.waitForFunction(() => DV.Game.state === 'playing' && !DV.Order.active().detaining, null, { timeout: 20000 }).catch(() => {});
  const det = await ev(() => { const S = DV.CityMap.landmark('order_station'); return { state: DV.Game.state, detained: DV.State.data.world.order.detained, notice: DV.Order.notice(), dt: Math.round(DV.Clock.total()), d: Math.hypot(DV.Player.x - S.x, DV.Player.z - S.z) }; });
  T.ok(det.state === 'playing' && det.detained === 1 && det.notice < 50 && det.d < 30 && det.dt - t0 >= 115, 'notice it enough and you lose two hours at the Order Station, and come out at its door', Object.assign(det, { t0 }));
  // the HUD shows it while it's up
  T.ok(await ev(() => !document.querySelector('#hud-vitals .noticewrap').classList.contains('hidden')), 'the HUD shows the Office\'s notice while it\'s up');
  // after curfew there are more of them about
  await ev(() => DV.Clock.skipTo(23 * 60));
  await p.waitForFunction(() => DV.Order.active().drones.length >= 4, null, { timeout: 60000 }).catch(() => {});
  T.ok(await ev(() => DV.Order.curfew() && DV.Order.active().drones.length >= 4), 'after curfew, more drones overhead');
  T.noErrors(errs);
});
