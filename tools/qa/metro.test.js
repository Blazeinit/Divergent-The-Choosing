// The Circle Line: six stations under the city, two loops on a timetable. Down a street entrance, through
// the gates, a train runs in; walk aboard through the open doors (real movement and collision), sit, the
// doors shut and it goes. Walk the cars end to end through the gangways; the shut doors hold you in; stand
// without holding on and the train throws you about; hold a pole and it doesn't. The next station comes
// up, people get off and on (the commuters' rules: let them off first, leave a gap if you can), you walk
// off, it leaves without you; up the stairs and you're in the street at that station's entrance. A save
// made underground loads in the street; after curfew the gates are shut; people come and go from the
// entrances in the city; it all draws in budget.
const L = require('./lib.js');
L.run('the Circle Line: stations, trains, riding, commuters', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const calls = () => p.evaluate(() => new Promise((res) => setTimeout(() => res(DV.Game.renderer.info.render.calls), 900)));
  await ev(() => {
    window.__subs = [];
    const o = DV.UI.subtitle;
    DV.UI.subtitle = function (w, t, s) { window.__subs.push((w || '') + ': ' + t); return o.call(this, w, t, s); };
    DV.State.data.world.time = DV.U.parseTime('08:05');
  });

  /* ---- the network, up in the city ---- */
  const net = await ev(() => {
    const M = DV.Metro, z = DV.World.current, kit = z.streetKit;
    const F = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
    return M.STATIONS.map((S) => {
      const f = F[S.face];
      let items = 0;
      for (const c of kit.chunks.values()) for (const it of c.items) if (Math.abs(it.x - (S.x + f[0] * 1.2)) < 2.2 && Math.abs(it.z - (S.z + f[1] * 1.2)) < 2.2 && Math.abs((it.x - S.x) * f[0] + (it.z - S.z) * f[1]) < 2.4) items++;
      return { id: S.id, building: z.colliders.blocked(S.x - f[0] * 1.0, S.z - f[1] * 1.0, 0.2, 'npc'), door: !!z.interactables.find((i) => i.id === 'metro_in_' + S.id), street: z.walkable(S.x + f[0] * 1.5, S.z + f[1] * 1.5), items };
    });
  });
  T.ok(net.length === 6 && net.every((s) => s.building && s.door && s.street), 'six stations, each entrance set into a real building front, on the pavement', net);
  T.ok(net.every((s) => s.items === 0), 'nothing on the street stands in front of an entrance', net.map((s) => s.id + ':' + s.items));

  /* ---- down the stairs ---- */
  T.eq(await ev(() => B.use('metro_in_halsted')), 'used metro_in_halsted', 'go down at Halsted');
  T.ok(await L.until(p, () => DV.World.current.id === 'metro' && DV.Game.state === 'playing', 30000), 'the ticket hall at the foot of the stairs');
  const hall = await ev(() => ({ place: DV.World.current.placeName(DV.Player.x, DV.Player.z).name, here: DV.Metro.STATIONS[DV.Metro.here].id, people: DV.Metro.people.length, nA: DV.Metro.trains.A.nextAt - DV.Clock.total(), nB: DV.Metro.trains.B.nextAt - DV.Clock.total() }));
  T.ok(hall.here === 'halsted' && /Halsted/.test(hall.place) && hall.people > 3, 'Halsted, with people waiting on the platform (' + hall.people + ')', hall);
  T.ok(hall.nA >= 0 && hall.nA <= 5 && hall.nB >= 0 && hall.nB <= 8, 'the next trains each way are due within the rush-hour headway', hall);
  // you come in at the top of the stairs (street level) and walk down them to the hall
  const down = await ev(() => { const P = DV.Player, y0 = P.y; DV.Game.rig.yaw = Math.PI / 2; DV.Input.keys.KeyW = true; let mid = null; for (let i = 0; i < 60; i++) { QA.step(0.1); if (i === 15) mid = P.y; } DV.Input.keys.KeyW = false; return { y0: +y0.toFixed(2), mid: +mid.toFixed(2), y1: +P.y.toFixed(2), x: +P.x.toFixed(1) }; });
  T.ok(down.y0 > 4 && down.mid > 0.3 && down.mid < 4 && down.y1 === 0 && down.x > -64, 'walk down the stairs from the street to the ticket hall', down);
  const c1 = await calls();
  T.ok(c1 < 170, 'the station draws in ' + c1 + ' calls');
  // through the gates on foot
  const gate = await ev(() => { const P = DV.Player; QA.tp(-58, 7.0, Math.PI / 2); DV.Input.keys.KeyW = true; QA.step(4); DV.Input.keys.KeyW = false; return { x: +P.x.toFixed(2), z: +P.z.toFixed(2) }; });
  T.ok(gate.x > -49, 'walk through a ticket gate onto the platform (the flaps open for you)', gate);

  /* ---- a train in; walk aboard ---- */
  const arr = await ev(() => {
    const M = DV.Metro, A = M.trains.A;
    QA.tp(-4.6, 6.2, Math.PI);
    let n = 0; while (!(A.state === 'dwell' && A.doorK >= 1) && n++ < 3000) QA.step(0.1);
    return { st: A.state, doorK: A.doorK, psdOff: !M.boxes.psdA[A.kit.doors[2]].enabled, doorOff: !M.boxes.doorA[A.kit.doors[2]].enabled, riders: M.people.filter((a) => a.frame === 'A').length, x: A.x };
  });
  T.ok(arr.st === 'dwell' && arr.x === 0 && arr.psdOff && arr.doorOff, 'an inner-loop train runs in and stops; its doors and the screen doors open together', arr);
  const pa1 = await L.until(p, () => window.__subs.some((s) => /approaching/.test(s)), 20000); // (the PA speaks a moment after the doors: give a slow software-GL frame time)
  T.ok(pa1, 'the PA calls it in', await ev(() => window.__subs.slice(-3)));
  const walk = await ev(() => {
    const M = DV.Metro, A = M.trains.A, P = DV.Player, dx = A.kit.doors[2];
    QA.tp(dx, 5.6, Math.PI);
    DV.Input.keys.KeyW = true; QA.step(1.6); DV.Input.keys.KeyW = false;
    return { x: +P.x.toFixed(2), z: +P.z.toFixed(2), aboard: M.playerAboard(A) };
  });
  T.ok(walk.aboard && walk.z < 4.0, 'walk straight in through the open doors', walk);
  const sit = await ev(() => {
    const A = DV.Metro.trains.A, P = DV.Player;
    const s = A.seats.find((q) => !q.occupant && Math.abs(q.x - P.x) < 5);
    B.use('seat:' + s.id);
    return { state: P.state, action: P.action, seat: s.id };
  });
  T.ok(sit.state === 'sitting' && sit.action === 'sit', 'sit down on a seat (E)', sit);
  const go = await ev(() => { const M = DV.Metro; let n = 0; while (M.mode !== 'ride' && n++ < 600) QA.step(0.1); return { mode: M.mode, to: M.ride && M.STATIONS[M.ride.to].id, D: M.ride && M.ride.D, stats: Object.assign({}, M.stats) }; });
  T.ok(go.mode === 'ride' && go.to === 'state', 'the doors shut with you aboard: you ride, towards State & Grand', go);
  T.ok(await L.until(p, () => window.__subs.some((s) => /next station is State/.test(s)), 5000), '"The next station is State & Grand."');

  /* ---- riding ---- */
  const ride = await ev(() => {
    const M = DV.Metro, A = M.trains.A, P = DV.Player;
    QA.step(2);
    const out = { off0: M.offset };
    // stand up; the train is accelerating: you stagger back down the car
    DV.Input.keys.KeyS = true; QA.step(0.1); DV.Input.keys.KeyS = false; P.standUp && P.standUp();
    QA.tp(0, 2.75, Math.PI / 2);
    const x0 = P.x; QA.step(1.5);
    out.lurch = +(P.x - x0).toFixed(2); out.accel = +A.accel.toFixed(2);
    // the shut doors hold you in
    const dx = A.kit.doors[3];
    QA.tp(dx, 3.4, 0); DV.Input.keys.KeyW = true; QA.step(1.5); DV.Input.keys.KeyW = false;
    out.door = +P.z.toFixed(2);
    // the length of the train: from the first car to the second, through the gangway
    QA.tp(-16, 3.17, Math.PI / 2); DV.Input.keys.KeyW = true; QA.step(5); DV.Input.keys.KeyW = false; // (beside the poles in the doorways)
    out.walked = +P.x.toFixed(2);
    // hold on: the next lurch doesn't move you
    const h = A.holds.find((q) => !q.occupant && q.pole);
    B.use('hold:' + h.id);
    out.hold = P.action;
    out.offMid = +M.offset.toFixed(1);
    return out;
  });
  T.ok(ride.off0 < -1, 'the station slides away past the windows (' + ride.off0.toFixed(1) + ' m)', ride);
  T.ok(ride.lurch < -0.1 && ride.accel > 0.3, 'standing without holding on, you stagger as it pulls away (' + ride.lurch + ' m)', ride);
  T.ok(ride.door < 4.0, 'the shut doors hold you in', ride);
  T.ok(ride.walked > -9, 'walk on through the gangway into the next car (to x ' + ride.walked + ')', ride);
  T.eq(ride.hold, 'hang', 'hold on to a pole (E): standing, one hand up');
  const c2 = await calls();
  T.ok(c2 < 170, 'riding draws in ' + c2 + ' calls');
  const arrive = await ev(() => {
    const M = DV.Metro, P = DV.Player, A = M.trains.A;
    const x0 = P.x; let n = 0, moved = 0;
    while (M.ride.phase === 'run' && n++ < 2000) { QA.step(0.1); moved = Math.max(moved, Math.abs(P.x - x0)); }
    QA.step(4);
    return { phase: M.ride.phase, here: M.STATIONS[M.here].id, place: DV.World.current.placeName(-30, 9).name, moved: +moved.toFixed(2), off: M.offset, doorK: A.doorK, pos: DV.State.data.player.pos, stats: Object.assign({}, M.stats) };
  });
  T.ok(arrive.phase === 'dwell' && arrive.here === 'state' && /State/.test(arrive.place) && arrive.off === 0, 'State & Grand: the train stops at the platform, doors open', arrive);
  T.ok(arrive.moved < 0.05, 'holding on, the braking doesn\'t move you', arrive);
  T.ok(await L.until(p, () => window.__subs.some((s) => /Arriving at State/.test(s)), 5000), '"Arriving at State & Grand."');
  // the commuters: off first, then on
  const people = await ev(() => { const M = DV.Metro; QA.step(9); return Object.assign({}, M.stats); });
  T.ok(people.alighted > 0 && people.boarded > 0, 'people get off, then people get on (' + people.alighted + ' off, ' + people.boarded + ' on so far)', people);
  T.ok(people.gap >= people.squeezed, 'they take a seat with a gap beside it when there is one (' + people.gap + ' with a gap, ' + people.squeezed + ' squeezed in)', people);

  /* ---- off, and the train goes on without you ---- */
  const off = await ev(() => {
    const M = DV.Metro, A = M.trains.A, P = DV.Player;
    P.standUp();
    const dx = A.kit.doors[2];
    QA.tp(dx, 3.0, 0); DV.Input.keys.KeyW = true; QA.step(1.8); DV.Input.keys.KeyW = false;
    const onPlat = P.z > 4.5;
    let n = 0; while (M.mode !== 'platform' && n++ < 400) QA.step(0.1);
    QA.step(6);
    return { onPlat, z: +P.z.toFixed(2), mode: M.mode, tr: A.state, x: +A.x.toFixed(1) };
  });
  T.ok(off.onPlat && off.mode === 'platform' && (off.tr === 'depart' || off.tr === 'none') && Math.abs(off.x) > 5, 'walk off; the doors shut and it leaves without you', off);

  /* ---- save underground: it loads in the street ---- */
  const save = await ev(() => { const r = DV.Save.write('6'); return r.ok; });
  T.ok(save, 'save on the platform');

  /* ---- up the stairs ---- */
  T.eq(await ev(() => B.use('metro_exit')), 'used metro_exit', 'up to the street');
  T.ok(await L.until(p, () => DV.World.current.id === 'testing_center' && DV.Game.state === 'playing', 30000), 'back up in the city');
  const up = await ev(() => { const S = DV.Metro.STATIONS[1], P = DV.Player; return { d: +Math.hypot(P.x - S.x, P.z - S.z).toFixed(2), street: DV.World.current.placeName(P.x, P.z).name }; });
  T.ok(up.d < 3.5 && /State/.test(up.street), 'at the State & Grand entrance, on State St (' + up.d + ' m)', up);
  // people come and go from the entrance
  const city = await ev(() => { const z = DV.World.current, S = DV.Metro.STATIONS[1]; let most = 0; for (let i = 0; i < 300; i++) { QA.step(0.1, [S.x + 6, S.z + 3]); most = Math.max(most, z.metro.peds.length); } return { most }; });
  T.ok(city.most > 0, 'commuters come up out of the entrance and go down into it (' + city.most + ' at once)', city);
  const c3 = await calls();
  T.ok(c3 < 230, 'the city by an entrance draws in ' + c3 + ' calls');
  // the save made underground
  await ev(() => DV.Game.loadSlot('6'));
  T.ok(await L.until(p, () => DV.World.current && DV.World.current.id === 'testing_center' && DV.Game.state === 'playing', 40000), 'the save made on the platform loads');
  const ld = await ev(() => { const S = DV.Metro.STATIONS[1], P = DV.Player; return { d: +Math.hypot(P.x - S.x, P.z - S.z).toFixed(2) }; });
  T.ok(ld.d < 3.5, '…in the street, at the entrance to that station (' + ld.d + ' m)', ld);

  /* ---- curfew ---- */
  const cf = await ev(() => {
    DV.State.data.world.time = DV.U.parseTime('21:40');
    const it = DV.World.current.interactables.find((i) => i.id === 'metro_in_hub');
    const label = it.label;
    B.use('metro_in_hub');
    QA.step(1);
    return { label, zone: DV.World.current.id };
  });
  T.ok(cf.label === 'Closed (curfew)' && cf.zone === 'testing_center', 'after curfew the entrances are shut', cf);
  T.noErrors(errs);
});
