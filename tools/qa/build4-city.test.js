// Build 4: the city outside the gate. Out through the gate on foot and along the streets; the
// buildings, the Testing Center's walls, the marsh and the Fence keep you in; the HUD names the
// street and the sector; the street furniture is there and solid; people walk the pavements and
// talk when spoken to; the traffic keeps to its lanes and stops (and honks) for you, and you
// can't walk through a car; the walk home ends at your own door; the world map draws the city
// and where you are; and a game saved out in the streets loads back there.
const L = require('./lib.js');
L.run('build 4: the walkable city', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => {
    DV.State.setFlag('results_discussed'); DV.State.setFlag('security_cleared'); DV.Inventory.add('name_badge', 1, true);
    DV.Build2.beginGoingHome();
    // walk in a straight line towards (x, z), the way a player holds W; returns where you got to
    window.walkLine = (x, z, maxSecs) => {
      const P = DV.Player;
      let t = 0, last = [P.x, P.z], stuck = 0;
      while (t < (maxSecs || 30)) {
        const dx = x - P.x, dz = z - P.z;
        if (Math.hypot(dx, dz) < 0.4) break;
        DV.Game.rig.yaw = Math.atan2(dx, dz);
        DV.Input.keys.KeyW = true; QA.step(0.05); t += 0.05;
        if (Math.hypot(P.x - last[0], P.z - last[1]) < 0.003) { if (++stuck > 40) break; } else stuck = 0;
        last = [P.x, P.z];
      }
      DV.Input.keys.KeyW = false;
      return { at: [+P.x.toFixed(2), +P.z.toFixed(2)], d: +Math.hypot(P.x - x, P.z - z).toFixed(2), stuck: stuck > 40 };
    };
    window.inSolid = (x, z, r) => DV.World.current.city.walk.solids.some((q) => x + r > q[0] && x - r < q[2] && z + r > q[1] && z - r < q[3]);
  });

  /* ---------------- out of the gate, along the streets ---------------- */
  // (over the crossing to the far pavement under the L, and along it: the road's for the traffic)
  const out = await ev(() => { QA.tp(40, 72, 0); const a = walkLine(40, 88, 20); const b = walkLine(118, 88, 40); return { a, b, place: DV.World.current.placeName(DV.Player.x, DV.Player.z), room: !!DV.World.current.roomAt(DV.Player.x, DV.Player.z) }; });
  T.ok(out.a.d < 0.6 && out.b.d < 0.6 && !out.room, 'out through the gate, over the road and east along Lake Street under the L, past the end of the Testing Center\'s own map', out);
  T.ok(/Lake St/.test(out.place.name) && out.place.sub === 'Testing District', 'the HUD names the street and the sector (' + out.place.name + ' · ' + out.place.sub + ')');
  const south = await ev(() => { walkLine(101.6, 88, 10); return walkLine(101.6, 140, 30); });
  T.ok(south.d < 0.6, 'and south down Halsted Street, on the pavement', south);

  /* ---------------- what keeps you in ---------------- */
  const walls = await ev(() => {
    const r = {};
    // the Testing Center from outside: its wall on Fulton Street
    QA.tp(40, -4, 0); r.campus = walkLine(40, 8, 6);
    // a house in the Abnegation sector: from the pavement into its front wall
    const h = DV.CityMap.homes.abnegation;
    QA.tp(h.x, h.z, Math.PI / 2); r.house = walkLine(h.x + 6, h.z, 6);
    r.houseInside = inSolid(DV.Player.x, DV.Player.z, 0.05);
    // the Fence, west of everything
    const C = DV.CityMap.centre, F = DV.CityMap.fence;
    QA.tp(C[0] - F + 8, C[1], -Math.PI / 2); r.fence = walkLine(C[0] - F - 20, C[1], 10);
    r.fenceDist = +Math.hypot(DV.Player.x - C[0], DV.Player.z - C[1]).toFixed(1);
    // the marsh: the shore wall
    QA.tp(405, 82, Math.PI / 2); r.marsh = walkLine(440, 82, 10);
    return r;
  });
  T.ok(walls.campus.at[1] < -0.2, 'the Testing Center\'s walls are solid from outside (stopped at z ' + walls.campus.at[1] + ')', walls.campus);
  T.ok(walls.house.at[0] < DV_HOUSE_FACE() && !walls.houseInside, 'houses are solid: you stop at the front wall', walls.house);
  T.ok(walls.fenceDist < 622 && walls.fenceDist > 600, 'the Fence: you can walk up to it, not through it (' + walls.fenceDist + ' m out)', walls.fence);
  T.ok(walls.marsh.at[0] < 417, 'the shore wall keeps you off the marsh (x ' + walls.marsh.at[0] + ')', walls.marsh);
  // the L's columns stand on the pavement, never in a road (the deck spans each junction from its corners)
  const lcols = await ev(() => {
    const CM = DV.CityMap, t = CM.track;
    const cols = DV.World.current.city.walk.solids.filter((q) => q[2] - q[0] < 0.7 && q[3] - q[1] < 0.7 && q[1] > t.z0 - 0.2 && q[3] < t.z1 + 0.2);
    const xs = [...new Set(cols.map((q) => (q[0] + q[2]) / 2))].sort((a, b) => a - b);
    let gap = 0;
    for (let i = 1; i < xs.length; i++) gap = Math.max(gap, xs[i] - xs[i - 1]);
    const lane = (z) => (CM.lake.road[0] < z && z < CM.lake.road[1]);
    return { n: cols.length, inRoad: cols.filter((q) => CM.avenues.some((a) => Math.abs((q[0] + q[2]) / 2 - a.x) < a.w / 2 + 0.3) || lane((q[1] + q[3]) / 2)).length, gap: +gap.toFixed(1) };
  });
  T.ok(lcols.n > 100 && lcols.inRoad === 0 && lcols.gap < 22, 'the L\'s columns all stand on the pavement, none in a road (longest span ' + lcols.gap + ' m)', lcols);
  function DV_HOUSE_FACE() { return -309.6 + 0.8 + 0.01; } // (the house's front wall, east of the pavement point)

  /* ---------------- the street furniture ---------------- */
  const kit = await ev(() => {
    QA.tp(150, 82, Math.PI / 2); QA.step(2);
    const z = DV.World.current, k = z.streetKit, life = z.streetLife;
    k.warm(DV.Player.x, DV.Player.z);
    const built = [...k.chunks.values()].filter((c) => c.built);
    const items = built.flatMap((c) => c.items);
    const bad = items.filter((it) => !it.car && inSolid(it.x, it.z, 0.05)).map((it) => it.name + '@' + it.x.toFixed(1) + ',' + it.z.toFixed(1));
    // parked cars stay out of the traffic lanes
    const inLane = [];
    for (const c of k.parked) {
      const hx = (Math.abs(Math.sin(c.rot)) * c.l + Math.abs(Math.cos(c.rot)) * c.w) / 2, hz = (Math.abs(Math.cos(c.rot)) * c.l + Math.abs(Math.sin(c.rot)) * c.w) / 2;
      for (const l of life.lanes) {
        const across = l.axis === 'x' ? c.z : c.x, along = l.axis === 'x' ? c.x : c.z, ha = l.axis === 'x' ? hz : hx;
        if (along < l.s0 || along > l.s1) continue;
        if (Math.abs(across - l.c) < ha + 0.85) { inLane.push(c.kind + '@' + c.x.toFixed(1) + ',' + c.z.toFixed(1)); break; }
      }
    }
    const names = {};
    for (const it of items) names[it.name] = (names[it.name] || 0) + 1;
    return { chunks: built.length, items: items.length, names, bad, inLane: inLane.slice(0, 6), parked: k.parked.length };
  });
  T.ok(kit.chunks > 4 && kit.names.lamp > 10 && kit.names.car > 3 && kit.names.signpost > 2, 'street furniture round you: ' + JSON.stringify(kit.names));
  T.ok(kit.bad.length === 0, 'none of it stands inside a building or the L\'s columns', kit.bad);
  T.ok(kit.inLane.length === 0, 'parked cars (' + kit.parked + ' in the city) are all at the kerb, clear of the traffic lanes', kit.inLane);
  const lamp = await ev(() => {
    const k = DV.World.current.streetKit;
    const it = [...k.chunks.values()].filter((c) => c.built).flatMap((c) => c.items).find((q) => q.name === 'lamp' && Math.hypot(q.x - DV.Player.x, q.z - DV.Player.z) < 90);
    QA.tp(it.x + 3 * Math.sin(it.rot + Math.PI), it.z + 3 * Math.cos(it.rot + Math.PI), it.rot);
    const r = walkLine(it.x + 3 * Math.sin(it.rot), it.z + 3 * Math.cos(it.rot), 4);
    return { r, d: +Math.hypot(DV.Player.x - it.x, DV.Player.z - it.z).toFixed(2) };
  });
  T.ok(lamp.d > 0.3 || lamp.r.d < 0.6, 'lamp posts are solid (walking into one, you go round or stop: ' + lamp.d + ' m from it)', lamp);

  /* ---------------- people ---------------- */
  const ppl = await ev(() => {
    DV.Clock.skipTo(DV.U.parseTime('12:00'));
    QA.tp(100, 300, 0); QA.step(5);
    const life = DV.World.current.streetLife, pads = DV.World.current.city.walk.pads;
    const onPad = (x, z) => pads.some((pd) => x > pd.r[0] - 0.05 && x < pd.r[2] + 0.05 && z > pd.r[1] - 0.05 && z < pd.r[3] + 0.05);
    const off = life.peds.filter((q) => !onPad(q.x, q.z) && !life.walk.edges[q.edge].cross).map((q) => q.name + '@' + q.x.toFixed(1) + ',' + q.z.toFixed(1));
    const walls = life.peds.filter((q) => inSolid(q.x, q.z, 0.15)).length;
    const facs = {};
    for (const q of life.peds) facs[q.f] = (facs[q.f] || 0) + 1;
    // in the Abnegation sector, nearly everyone is in grey
    QA.tp(-330, -12, 0); QA.step(6); QA.step(6);
    const abn = life.peds.filter((q) => Math.hypot(q.x + 330, q.z + 12) < 60);
    return { n: life.peds.length, off: off.slice(0, 5), walls, facs, abnN: abn.length, abnGrey: abn.filter((q) => q.f === 'abnegation').length, crossings: life.walk.edges.filter((e) => e.cross).length };
  });
  T.ok(ppl.n >= 12, 'downtown at noon: ' + ppl.n + ' people about, ' + JSON.stringify(ppl.facs));
  T.ok(ppl.off.length === 0 && ppl.walls === 0, 'they keep to the pavements (and the crossings), never in a wall', ppl);
  T.ok(ppl.abnN >= 4 && ppl.abnGrey / ppl.abnN >= 0.6, 'in the Abnegation sector it\'s mostly grey (' + ppl.abnGrey + '/' + ppl.abnN + ')');
  T.ok(ppl.crossings > 100, 'the pavements join up across the streets (' + ppl.crossings + ' crossings)');
  const talk = await ev(() => {
    const life = DV.World.current.streetLife, P = DV.Player;
    const q = life.peds.slice().sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
    QA.tp(q.x + Math.sin(q.wantRot) * 1.1, q.z + Math.cos(q.wantRot) * 1.1, q.wantRot + Math.PI);
    DV.Game.rig.yaw = DV.Player.rot; QA.step(0.05);
    DV.Interaction.update(DV.World.current, P);
    const it = DV.Interaction.current;
    if (it) DV.Interaction.use(DV.Game);
    QA.step(0.3);
    const lines = DV.StreetLife.LINES[q.f];
    return { it: it && it.id, name: it && it.name, said: q.bark && q.bark.text, known: !!(q.bark && lines.indexOf(q.bark.text) >= 0), stopped: q.listen > 0, bark: DV.StreetLife.active().barkSources().indexOf(q) >= 0 };
  });
  T.ok(talk.it && /^street:/.test(talk.it) && talk.known && talk.stopped, 'talk to a passer-by (' + talk.name + '): they stop and say something — "' + talk.said + '"', talk);
  T.ok(talk.bark, 'and it shows over their head');
  const block = await ev(() => {
    // walk straight at someone: they step round you, and you can't walk through them
    const life = DV.World.current.streetLife, P = DV.Player;
    const q = life.peds.find((a) => !life.walk.edges[a.edge].cross && Math.hypot(a.x - P.x, a.z - P.z) < 40) || life.peds[0];
    let minD = 9;
    for (let i = 0; i < 60; i++) {
      const fx = Math.sin(q.wantRot), fz = Math.cos(q.wantRot);
      if (i === 0) QA.tp(q.x + fx * 3, q.z + fz * 3, q.wantRot + Math.PI);
      DV.Game.rig.yaw = Math.atan2(q.x - P.x, q.z - P.z);
      DV.Input.keys.KeyW = true; QA.step(0.05);
      minD = Math.min(minD, Math.hypot(q.x - P.x, q.z - P.z));
    }
    DV.Input.keys.KeyW = false;
    return { minD: +minD.toFixed(2), side: +q.side.toFixed(2) };
  });
  T.ok(block.minD > 0.45, 'people are solid: walking into one you stop at their shoulder (' + block.minD + ' m)', block);

  /* ---------------- traffic ---------------- */
  const cars = await ev(() => {
    const life = DV.World.current.streetLife, P = DV.Player;
    QA.tp(150, 82, 0);
    // wait for a car coming down Lake Street (one-way, westbound) towards you
    const lake = life.lanes.filter((l) => l.line.name === 'Lake St');
    let car = null;
    for (let i = 0; i < 400 && !car; i++) {
      QA.step(0.1, [150, 76.9]);
      car = life.cars.find((c) => c.lane.line.name === 'Lake St' && c.x > 165 && c.x < 260);
    }
    if (!car) return { none: true, cars: life.cars.length, lake: lake.length };
    // stand in its lane and wait
    QA.tp(150, car.z, 0);
    let honks = 0;
    const real = DV.Audio.play.bind(DV.Audio);
    DV.Audio.play = (n, o) => { if (n === 'carhorn' && o && o.x !== undefined) honks++; return real(n, o); };
    let minGap = 99;
    for (let i = 0; i < 500; i++) { QA.step(0.05, [150, car.z]); minGap = Math.min(minGap, car.x - car.v.length / 2 - 150); }
    DV.Audio.play = real;
    const stopped = car.speed < 0.1;
    // step out of the way: it drives on
    QA.tp(150, 77.2, 0);
    const x0 = car.x;
    QA.step(4, [150, 77.2]);
    // and you can't stand inside one
    const c2 = life.cars.find((c) => Math.hypot(c.x - 150, c.z - 80) < 200) || car;
    QA.tp(c2.x, c2.z, 0); QA.step(0.05, null);
    const ex = (c2.lane.axis === 'x' ? c2.v.length : c2.v.width) / 2, ez = (c2.lane.axis === 'x' ? c2.v.width : c2.v.length) / 2;
    const inside = Math.abs(P.x - c2.x) < ex && Math.abs(P.z - c2.z) < ez;
    return { lakeDirs: lake.map((l) => l.dir), stopped, minGap: +minGap.toFixed(2), honks, droveOn: x0 - car.x, inside, kind: car.kind };
  });
  T.ok(!cars.none, 'traffic comes down Lake Street', cars);
  T.ok(cars.lakeDirs && cars.lakeDirs.every((d) => d === -1), 'Lake Street is one-way, westbound, under the L');
  T.ok(cars.stopped && cars.minGap > 0.5, 'a ' + cars.kind + ' stops for you standing in the road (' + cars.minGap + ' m short)', cars);
  T.ok(cars.honks >= 1, 'and leans on the horn (' + cars.honks + ')');
  T.ok(cars.droveOn > 5, 'step aside and it drives on (' + (cars.droveOn || 0).toFixed(1) + ' m)');
  T.ok(cars.inside === false, 'you can\'t stand inside a car: it pushes you out');

  /* ---------------- indoors, the street isn't drawn ---------------- */
  const hidden = await ev(() => {
    const life = DV.World.current.streetLife;
    QA.tp(40, 30, 0); QA.step(0.3);
    const inHall = { shown: life.shown, kit: DV.World.current.streetKit.hidden };
    QA.tp(40, 70, 0); QA.step(0.3);
    return { inHall, plaza: life.shown };
  });
  T.ok(hidden.inHall.shown === false && hidden.inHall.kit === true && hidden.plaza === true, 'deep inside the Testing Center the streets aren\'t drawn; from the plaza they are', hidden);

  /* ---------------- the world map ---------------- */
  const map = await ev(() => {
    QA.tp(150, 82, 0); QA.step(0.2);
    DV.Game.openRPGMenu('map');
    const cv = document.getElementById('map-canvas');
    DV.WorldMap.draw(cv);
    const W = DV.WorldMap, T0 = W.T;
    const tipAt = (x, z) => W.tip(T0.w / 2 + (x - T0.cx) * T0.s, T0.h / 2 + (z - T0.cz) * T0.s);
    const r = { view: DV.RPGMenu.mapView, you: W.you(), hits: W._hits.map((h) => h.tip), tipHub: tipAt(96, 360), tipStreet: tipAt(-200, 150), tipOut: tipAt(-700, 35) };
    const z0 = W.zoom;
    QA.click('#rpgmenu .btn', '+');
    r.zoomed = W.zoom > z0;
    QA.click('#rpgmenu .btn', 'Fit');
    r.fit = W.zoom === 1;
    QA.click('#rpgmenu .btn', 'Local');
    r.local = DV.RPGMenu.mapView;
    DV.RPGMenu.close();
    return r;
  });
  T.ok(map.view === 'city' && map.you && map.you[0] === 150, 'out in the streets the map opens on the city, with you on it', map.you);
  T.ok(['Aptitude Testing Center', 'The Hub', 'Merciless Mart', 'Erudite Headquarters', 'The Dauntless Compound', 'The Fence Gate'].every((n) => map.hits.indexOf(n) >= 0), 'the landmarks are marked', map.hits);
  T.ok(/Hub/.test(map.tipHub) && /&|Ave|St|Rd/.test(map.tipStreet) && /Fence/.test(map.tipOut), 'hovering names what\'s there: ' + [map.tipHub, map.tipStreet, map.tipOut].join(' | '));
  T.ok(map.zoomed && map.fit && map.local === 'local', 'zoom in, fit the city again, and switch back to the local map');

  /* ---------------- saved in the streets, loaded in the streets ---------------- */
  const sv = await ev(() => {
    QA.tp(-150.5, 150, 1.0); QA.step(0.2);
    const w = DV.Save.write('2');
    QA.tp(40, 30, 0); QA.step(0.2);
    return { w: !!(w && w.ok) };
  });
  await ev(() => DV.Game.loadSlot('2'));
  await L.until(p, () => DV.Game.state === 'playing', 30000);
  const ld = await ev(() => { QA.step(0.5); const P = DV.Player, z = DV.World.current; return { at: [+P.x.toFixed(1), +P.z.toFixed(1)], zone: z.id, walk: z.walkable(P.x, P.z), place: z.placeName(P.x, P.z), peds: z.streetLife.peds.length }; });
  T.ok(sv.w && ld.zone === 'testing_center' && Math.abs(ld.at[0] + 150.5) < 0.2 && Math.abs(ld.at[1] - 150) < 0.2 && ld.walk, 'a game saved out in the city loads back where you stood (' + ld.place.name + ')', ld);

  /* ---------------- the walk home ---------------- */
  const home = await ev(() => {
    const h = DV.CityMap.homes[DV.State.data.player.upbringing];
    const r = { up: DV.State.data.player.upbringing };
    QA.tp(60, 82, 0); r.t0 = DV.Build2.homeTarget();
    QA.tp(h.x + (h.face === 'e' ? 1.2 : -1.2), h.z, h.face === 'e' ? -Math.PI / 2 : Math.PI / 2);
    DV.Game.rig.yaw = DV.Player.rot; QA.step(0.1);
    r.t1 = DV.Build2.homeTarget();
    DV.Interaction.update(DV.World.current, DV.Player);
    r.it = DV.Interaction.current && DV.Interaction.current.id;
    DV.Interaction.use(DV.Game);
    r.node = QA.node();
    r.pick = QA.pick('go inside');
    return r;
  });
  T.ok(home.t0.x === 47 && home.t1.x !== 47, 'the objective marker points at the bus, then at your door once that\'s nearer', [home.t0, home.t1]);
  T.ok(home.it === 'home_door_' + home.up && home.node && /^ok/.test(home.pick), 'walked all the way to your own front door (' + home.up + ') and in', home);
  T.ok(await L.until(p, () => DV.Chapter.active && DV.Chapter.id === 'home' && DV.Game.state === 'playing', 40000), 'home: the evening at home begins');
  const after = await ev(() => ({ leave: DV.Quests.obj('the_choosing', 'leave'), log: JSON.stringify(DV.Quests.q('the_choosing')).indexOf('walked home') >= 0, you: DV.WorldMap.you() }));
  T.ok(after.leave === 'done' && after.log, 'the quest log says you walked home', after);
  T.ok(after.you && after.you[2] === null && after.you[0] === 237.6, 'and the world map marks your home as where you are', after.you);
  T.noErrors(errs);
});
