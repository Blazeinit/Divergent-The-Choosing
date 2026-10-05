// Build 4: the city outside the gate. Out through the gate on foot and along the streets; the
// buildings, the Testing Center's walls, the marsh and the Fence keep you in; the HUD names the
// street and the sector; the street furniture is there and solid; people walk the pavements and
// talk when spoken to; the traffic keeps to its lanes and stops (and honks) for you, and you
// can't walk through a car; the walk home ends at your own door; the world map draws the city
// and where you are; and a game saved out in the streets loads back there.
const L = require('./lib.js');
const DV_WALL = () => '1128–1136 m';
L.run('build 4: the walkable city', async (p, T, errs) => {
  await p.evaluate(() => { DV.City.auditNext = true; }); // (the city lists everything it puts up)
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
  // (the scenes on the pavements stand where they like: these walks want the pavements clear)
  await ev(() => { if (DV.World.current.cityLife) DV.World.current.cityLife.off = true; });
  // (down the clear lane between the L's two rows of columns)
  const out = await ev(() => { QA.tp(40, 72, 0); const a = walkLine(40, 88.9, 20); const b = walkLine(118, 88.9, 40); return { a, b, place: DV.World.current.placeName(DV.Player.x, DV.Player.z), room: !!DV.World.current.roomAt(DV.Player.x, DV.Player.z) }; });
  T.ok(out.a.d < 0.6 && out.b.d < 0.6 && !out.room, 'out through the gate, over the road and east along Lake Street under the L, past the end of the Testing Center\'s own map', out);
  T.ok(/Lake St/.test(out.place.name) && out.place.sub === 'Testing District', 'the HUD names the street and the sector (' + out.place.name + ' · ' + out.place.sub + ')');
  const south = await ev(() => { walkLine(101.6, 88.9, 10); return walkLine(101.6, 140, 30); });
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
    // the Fence, west of everything: you get as far as the cordon in front of it, never to the wall
    const C = DV.CityMap.centre, F = DV.CityMap.fence, CR = DV.CityMap.wall.cordon;
    QA.tp(C[0] - CR + 8, C[1], -Math.PI / 2); r.fence = walkLine(C[0] - F - 20, C[1], 10);
    r.fenceDist = +Math.hypot(DV.Player.x - C[0], DV.Player.z - C[1]).toFixed(1);
    // and at the gate, along Madison Street: the checkpoint's barrier is as far as anyone gets
    const g = DV.CityMap.fenceGate;
    QA.tp(g.x + 40, g.z, -Math.PI / 2); r.gate = walkLine(g.x - 10, g.z, 20);
    r.gateDist = +Math.hypot(DV.Player.x - C[0], DV.Player.z - C[1]).toFixed(1);
    // the marsh: the shore wall
    QA.tp(405, 82, Math.PI / 2); r.marsh = walkLine(440, 82, 10);
    return r;
  });
  T.ok(walls.campus.at[1] < -0.2, 'the Testing Center\'s walls are solid from outside (stopped at z ' + walls.campus.at[1] + ')', walls.campus);
  T.ok(walls.house.at[0] < DV_HOUSE_FACE() && !walls.houseInside, 'houses are solid: you stop at the front wall', walls.house);
  T.ok(walls.fenceDist < 1110 && walls.fenceDist > 1104, 'the Fence, out past the farms: you can walk up to its cordon, no further (' + walls.fenceDist + ' m out; the wall is at ' + DV_WALL() + ')', walls.fence);
  T.ok(walls.gateDist < 1110 && walls.gateDist > 1104, 'not even at the gate: the checkpoint stops you (' + walls.gateDist + ' m out)', walls.gate);
  T.ok(walls.marsh.at[0] < 417, 'the shore wall keeps you off the marsh (x ' + walls.marsh.at[0] + ')', walls.marsh);
  // the Fence: the wall, its towers, the gatehouse, the cordon, their lamps
  const wall = await ev(() => {
    const zone = DV.World.current, CM = DV.CityMap, C = CM.centre, W = CM.wall;
    const ring = (r0, r1) => zone.city.walk.solids.filter((q) => { const d = Math.hypot((q[0] + q[2]) / 2 - C[0], (q[1] + q[3]) / 2 - C[1]); return d > r0 && d < r1; });
    const wallBits = ring(W.inner - 4, W.outer + 4), tall = wallBits.filter((q) => q[4] >= 40);
    let gap = 0; // the widest gap round the ring, in degrees (there shouldn't be one)
    const angs = wallBits.filter((q) => q[4] >= W.height - 0.5).map((q) => Math.atan2((q[1] + q[3]) / 2 - C[1], (q[0] + q[2]) / 2 - C[0])).sort((a, b) => a - b);
    for (let i = 1; i < angs.length; i++) gap = Math.max(gap, angs[i] - angs[i - 1]);
    gap = Math.max(gap, angs[0] + Math.PI * 2 - angs[angs.length - 1]);
    const lamps = zone.lamps.filter((l) => Math.hypot(l[0] - C[0], l[2] - C[1]) > W.cordon - 5);
    return { pieces: wallBits.length, towers: tall.length, gapDeg: +(gap * 180 / Math.PI).toFixed(1), limit: +zone.city.walk.limit.toFixed(1), lamps: lamps.length, red: lamps.filter((l) => l[3] && l[3][1] < 0.3).length, truck: Math.hypot(CM.homes.amity.x - C[0], CM.homes.amity.z - C[1]) };
  });
  T.ok(wall.pieces > 300 && wall.towers >= 14 && wall.gapDeg < 6, 'the Fence: a wall right round the city (' + wall.pieces + ' pieces, no gap wider than ' + wall.gapDeg + '°), ' + wall.towers + ' towers over it (the gate\'s two among them)', wall);
  T.ok(wall.lamps > 50 && wall.red > 20 && wall.limit < 1110 && wall.truck < wall.limit, 'floodlights along the cordon and red lamps on the wall (' + wall.lamps + '); the Amity truck waits at the city\'s edge', wall);
  // Amity's farmland, between the city and the Fence: you can walk out into it
  const farm = await ev(() => {
    const zone = DV.World.current, CM = DV.CityMap, F = CM.farms(), C = CM.centre;
    const out = { roads: F.roads.length, fields: F.fields.length, orchards: F.orchards.length, steads: F.steads.length };
    // every field between the city's edge and the cordon, none in the marsh
    out.badFields = F.fields.filter((f) => [[f.r[0], f.r[1]], [f.r[2], f.r[3]]].some(([x, z]) => { const d = Math.hypot(x - C[0], z - C[1]); return d < CM.edge || d > CM.wall.cordon || x > CM.marshX; })).length;
    // walk out past the city's edge along Madison St, onto the farms
    QA.tp(-470, 278.5, -Math.PI / 2); const w = walkLine(-700, 278.5, 120);
    out.walked = w; out.place = zone.placeName(DV.Player.x, DV.Player.z);
    out.amity = CM.landmark('amity');
    out.amityInside = Math.hypot(out.amity.x - C[0], out.amity.z - C[1]) < CM.wall.cordon;
    return out;
  });
  T.ok(farm.fields > 200 && farm.orchards > 10 && farm.steads > 10 && farm.badFields === 0, 'Amity\'s farmland inside the Fence: ' + farm.fields + ' fields, ' + farm.orchards + ' orchards, ' + farm.steads + ' farms, the section roads (' + farm.roads + ')', farm);
  T.ok(farm.walked.d < 0.6 && /Amity Farmland/.test(farm.place.sub) && farm.amityInside, 'you can walk out of the city onto the farms (' + farm.place.name + ' · ' + farm.place.sub + '), and Amity\'s headquarters is inside the Fence', farm);

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

  /* ---------------- nothing in the road ---------------- */
  const road = await ev(() => {
    const CM = DV.CityMap, z = DV.World.current, city = z.city, c = city.centre, edge = city.walk.edge, end = CM.marshX - 4;
    // every carriageway, kerb to kerb: the city's streets and junctions (where they run between blocks:
    // past the last ones they stop at a kerb), the roads out of the city (the gate road, the tracks),
    // and the farm roads
    const roads = [], net = CM.roadNet();
    for (const q of net.roads) roads.push([q.kind === 'out' ? 'a road out' : 'a ' + q.kind, q.r[0], q.r[1], q.r[2], q.r[3]]);
    for (const q of CM.farms().roads) roads.push(['a farm road', q[0], q[1], q[2], q[3]]);
    const cp = CM.campus, hits = [];
    const on = (x0, z0, x1, z1) => roads.find((q) => Math.min(x1, q[3]) - Math.max(x0, q[1]) > 0.05 && Math.min(z1, q[4]) - Math.max(z0, q[2]) > 0.05);
    void edge;
    for (const [x0, z0, x1, z1, y0, y1, part] of city.audit || []) {
      if (y0 > 2.4 || y1 < 0.12) continue; // (overhead, or paint)
      if (x0 > cp[0] - 1 && x1 < cp[2] + 1 && z0 > cp[1] - 1 && z1 < cp[3] + 1) continue; // (the Testing Center's own grounds)
      if (x0 > end) continue; // (out in the marsh)
      const q = on(x0, z0, x1, z1);
      if (q) hits.push([part, q[0], +((x0 + x1) / 2).toFixed(1), +((z0 + z1) / 2).toFixed(1), +(x1 - x0).toFixed(1), +(z1 - z0).toFixed(1)]);
    }
    // and the street furniture (parked cars aside: they're in the parking lane)
    const kitHits = [];
    for (const ch of z.streetKit.chunks.values()) for (const it of ch.items) if (!it.car && it.x < end && on(it.x - 0.2, it.z - 0.2, it.x + 0.2, it.z + 0.2)) kitHits.push([it.name, +it.x.toFixed(1), +it.z.toFixed(1)]);
    const hub = CM.landmark('hub'), comp = CM.landmark('dauntless_compound');
    return { boxes: (city.audit || []).length, hits, kitHits, hub: [hub.x, hub.z], comp: [comp.x, comp.w] };
  });
  T.ok(road.boxes > 10000 && road.hits.length === 0, 'nothing the city puts up stands in a road or a farm road (' + road.boxes + ' pieces checked): not the Hub, not the Dauntless compound, not a hedge', road.hits.slice(0, 8));
  T.ok(road.kitHits.length === 0, 'and none of the street furniture is off the pavement', road.kitHits.slice(0, 8));

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
    QA.tp(128, 82, 0);
    // wait for a car coming down Lake Street (one-way, westbound) towards you, through the lights at
    // Clinton (x 170) and on along the block you're in
    const lake = life.lanes.filter((l) => l.line.name === 'Lake St');
    let car = null;
    for (let i = 0; i < 900 && !car; i++) {
      // (traffic comes and goes at random: put some on Lake Street, upstream, if there's none)
      if (i % 50 === 0 && !life.cars.some((c) => c.lane.line.name === 'Lake St' && c.x > 128)) life.spawnCar(128, 82, (l) => l.line.name === 'Lake St');
      QA.step(0.1, [128, 76.9]);
      car = life.cars.find((c) => c.lane.line.name === 'Lake St' && !c.turn && c.x > 140 && c.x < 162 && c.speed > 2);
    }
    if (!car) return { none: true, cars: life.cars.length, lake: lake.length };
    // stand in its lane and wait
    QA.tp(128, car.z, 0);
    let honks = 0;
    const real = DV.Audio.play.bind(DV.Audio);
    DV.Audio.play = (n, o) => { if (n === 'carhorn' && o && o.x !== undefined) honks++; return real(n, o); };
    let minGap = 99;
    for (let i = 0; i < 500; i++) { QA.step(0.05, [128, car.z]); minGap = Math.min(minGap, car.x - car.v.length / 2 - 128); }
    DV.Audio.play = real;
    const stopped = car.speed < 0.1;
    // step out of the way: it drives on
    QA.tp(128, 77.2, 0);
    const x0 = car.x;
    QA.step(4, [128, 77.2]);
    // and you can't stand inside one
    const c2 = life.cars.find((c) => Math.hypot(c.x - 128, c.z - 80) < 200 && !c.turn) || car;
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

  /* ---------------- junctions: markings, signals, the traffic and the people at them ---------------- */
  const junc = await ev(() => {
    const zone = DV.World.current, R = zone.roads, kit = zone.streetKit;
    QA.tp(102.5, 168, Math.PI); QA.step(0.5);
    // never green both ways, and every phase comes round
    const seen = new Set();
    let both = 0;
    const t0 = R.t;
    for (let t = 0; t < DV.Roads.CYCLE; t += 0.5) { R.t = t0 + t; for (const j of R.junctions.slice(0, 40)) { const x = R.light(j, 'x'), z = R.light(j, 'z'); if (x && x !== 'r' && z && z !== 'r') both++; if (x) seen.add('x' + x); if (R.walk(j, 'x') === 'walk' && R.light(j, 'x') !== 'g') both++; } }
    R.t = t0;
    let paint = 0, lamps = 0;
    for (const c of kit.chunks.values()) if (c.built && Math.hypot(c.cx - 102, c.cz - 168) < 150) { paint += c.paint.length; lamps += c.items.filter((it) => it.name === 'sig_pole').length; }
    return { j: R.junctions.length, sig: R.junctions.filter((j) => j.signal).length, dead: R.junctions.filter((j) => j.dead).length, both, seen: [...seen].sort(), paint, poles: lamps, sigLamps: kit.sig ? kit.sig.lamps.length : 0 };
  });
  T.ok(junc.j > 150 && junc.sig > 120 && junc.dead > 0, junc.j + ' junctions: ' + junc.sig + ' with working signals, ' + junc.dead + ' dark (the ruins, some of the Dauntless sector)', junc);
  T.ok(junc.both === 0 && junc.seen.join() === 'xa,xg,xr', 'a signal is never green (or amber) both ways, and walks only with its green', junc);
  T.ok(junc.paint > 200 && junc.poles > 8 && junc.sigLamps > 100, 'paint on the roads round you (' + junc.paint + ' marks: crossings, stop lines, the double yellow), signal poles (' + junc.poles + ') and their lamps', junc);
  // the traffic at the lights: stops at the line on red, goes on green; turns; never runs into another car
  const lights = await ev(() => {
    const zone = DV.World.current, R = zone.roads, life = zone.streetLife, P = DV.Player;
    QA.tp(102.5, 168, Math.PI);
    const ran = [], stops = [];
    let turns = 0, overlap = 0, minGap = 99;
    const was = new Map();
    for (let i = 0; i < 1600; i++) {
      QA.step(0.05, [102.5, 168]);
      for (const c of life.cars) {
        if (!c.turn && was.get(c) === 'turning') turns++;
        was.set(c, c.turn ? 'turning' : 'lane');
        if (c.turn) continue;
        const nj = life.nextJunction(c);
        if (!nj) continue;
        const light = R.light(nj.j, c.lane.axis), stopD = nj.d - DV.Roads.CW - DV.Roads.STOP;
        // over the line on red (it was well short of it a moment ago)
        if (light === 'r' && stopD < -0.6 && stopD > -3 && c.prevStop > 0.5) ran.push({ x: Math.round(c.x), z: Math.round(c.z), stopD: +stopD.toFixed(2), was: +c.prevStop.toFixed(2) });
        if (light === 'r' && c.speed === 0 && stopD > -0.4 && stopD < 1.2) stops.push(+stopD.toFixed(2));
        c.prevStop = stopD;
      }
      for (let a = 0; a < life.cars.length; a++) for (let b = a + 1; b < life.cars.length; b++) {
        const A = life.cars[a], Bc = life.cars[b];
        const d = Math.hypot(A.x - Bc.x, A.z - Bc.z);
        minGap = Math.min(minGap, d);
        if (d < Math.min(A.v.width, Bc.v.width) * 0.9) overlap++;
      }
    }
    return { ran: ran.slice(0, 5), nRan: ran.length, stops: stops.length, turns, overlap, minGap: +minGap.toFixed(2), cars: life.cars.length };
  });
  T.ok(lights.stops > 20 && lights.nRan === 0, 'cars stop at the line on red (' + lights.stops + ' car-frames waiting at it), and none runs a red', lights);
  T.ok(lights.turns >= 2, 'cars turn at the junctions (' + lights.turns + ' turns in 80 s)', lights);
  T.ok(lights.overlap === 0, 'and never drive into each other (closest ' + lights.minGap + ' m between centres)', lights);
  // people cross on the white man (and wait for it)
  const walkers = await ev(() => {
    const zone = DV.World.current, R = zone.roads, life = zone.streetLife;
    let starts = 0, bad = 0, waits = 0;
    const real = life.mayCross.bind(life);
    life.mayCross = (e) => { const ok = real(e); if (e.j && e.j.signal) { if (ok) { starts++; if (R.walk(e.j, e.axis) !== 'walk') bad++; } else waits++; } return ok; };
    for (let i = 0; i < 2400 && starts < 2; i++) QA.step(0.05, [102.5, 168]);
    life.mayCross = real;
    return { starts, bad, waits };
  });
  T.ok(walkers.starts > 0 && walkers.bad === 0, 'people wait at the kerb and cross on the white man (' + walkers.starts + ' crossings, ' + walkers.waits + ' waits)', walkers);
  // the city's edge: the traffic turns back into the city at the end of a street (or, with nowhere
  // to go, waits till you can't see it), never off the end of one onto open ground
  const edgeCars = await ev(() => {
    const life = DV.World.current.streetLife, net = DV.CityMap.roadNet();
    const off = [], forced = new Set(), vanished = [];
    let frames = 0;
    for (const [px, pz] of [[-552, 100], [-14, -531], [60, 543], [-400, 478]]) {
      QA.tp(px, pz, 0); QA.step(0.2, [px, pz]);
      for (let i = 0; i < 300; i++) { // (a minute in all)
        if (i % 25 === 0) life.spawnCar(px, pz);
        const before = life.cars.slice();
        QA.step(0.05, [px, pz]);
        for (const c of life.cars) {
          frames++;
          if (c.plan && c.plan.forced) forced.add(c.id);
          if (!net.onRoad(c.x, c.z, 0.3)) off.push([c.kind, +c.x.toFixed(1), +c.z.toFixed(1), c.turn ? 'turning' : c.lane.line.name]);
        }
        for (const c of before) if (life.cars.indexOf(c) < 0 && Math.hypot(c.x - px, c.z - pz) < 150 && life.inView(c)) vanished.push([c.kind, Math.round(c.x), Math.round(c.z)]);
      }
    }
    return { frames, off: off.slice(0, 6), nOff: off.length, forced: forced.size, vanished: vanished.slice(0, 6) };
  });
  T.ok(edgeCars.frames > 1000 && edgeCars.nOff === 0, 'at the city\'s edge the traffic stays on the streets (' + edgeCars.frames + ' car-frames over a minute, none off the road network)', edgeCars);
  T.ok(edgeCars.forced > 0 && edgeCars.vanished.length === 0, 'at the end of a street they turn back into the city (' + edgeCars.forced + ' had to), and none vanishes in front of you', edgeCars);
  // turning across a crossing with people on it: never through anyone
  const busyJ = await ev(() => {
    const zone = DV.World.current, life = zone.streetLife, R = zone.roads, W = life.walk;
    const J = R.junctions.find((j) => j.av.name === 'Halsted St' && j.st.name === 'Randolph St');
    const at = [J.box[2] + 2.3, J.box[3] + 2.3]; // (on the corner)
    QA.tp(at[0], at[1], 0);
    const hits = [], was = new Map();
    // (and people making for its crossings: every few seconds somebody comes up to one of its corners
    // meaning to cross, and waits there for the white man)
    const crossings = W.edges.map((e, k) => k).filter((k) => { const e = W.edges[k], a = W.nodes[e.a], b = W.nodes[e.b]; return e.cross && Math.abs((a.x + b.x) / 2 - J.x) < 12 && Math.abs((a.z + b.z) / 2 - J.z) < 12; });
    const sendOne = (k) => {
      const ce = W.edges[crossings[k % crossings.length]], n = k % 2 ? ce.a : ce.b, ei = W.nodes[n].edges.find((q) => !W.edges[q].cross);
      const p = life.peds.find((q) => !W.edges[q.edge].cross && Math.hypot(q.x - J.x, q.z - J.z) > 14);
      if (!p || ei === undefined) return;
      const e = W.edges[ei];
      Object.assign(p, { edge: ei, to: n, from: e.a === n ? e.b : e.a, t: Math.max(0, e.len - 3), waitFor: crossings[k % crossings.length], waitT: 0, listen: 0, wait: 0 });
      life.place(p);
    };
    let onCross = 0, here = 0, yielded = 0, turns = 0;
    for (let i = 0; i < 3000; i++) { // (two and a half minutes)
      if (i % 50 === 0) life.spawnCar(at[0], at[1], (l) => l.line === J.av || l.line === J.st);
      if (i % 40 === 0) sendOne(i / 40);
      QA.step(0.05, at);
      for (const c of life.cars) {
        if (c.why === 'crossing') yielded++;
        if (!c.turn && was.get(c)) turns++;
        was.set(c, !!c.turn);
      }
      for (const p of life.peds) {
        if (!W.edges[p.edge].cross) continue;
        onCross++;
        if (Math.abs(p.x - J.x) < 16 && Math.abs(p.z - J.z) < 16) here++;
        for (const c of life.cars) if (life.inCar(c, p.x, p.z, 0.25)) hits.push([c.kind, c.turn ? 'turning' : 'straight', +p.x.toFixed(1), +p.z.toFixed(1)]);
      }
    }
    return { crossings: crossings.length, onCross, here, yielded, turns, hits: hits.slice(0, 6), nHits: hits.length };
  });
  T.ok(busyJ.here > 50 && busyJ.turns >= 3 && busyJ.nHits === 0, 'a busy junction for two and a half minutes: no car ever drives over anyone on a crossing (' + busyJ.here + ' person-frames on its crossings, ' + busyJ.turns + ' turns, ' + busyJ.yielded + ' car-frames yielding)', busyJ);
  // a car turning right waits for somebody on the crossing it's turning into (you, then a passer-by),
  // then goes round once they're off it
  const turnWait = await ev(() => {
    const zone = DV.World.current, life = zone.streetLife, R = zone.roads, W = life.walk, P = DV.Player;
    const J = R.junctions.find((j) => j.av.name === 'Halsted St' && j.st.name === 'Randolph St');
    // (westbound on Randolph, right into Halsted: north, over the crossing on its north side)
    const A = life.lanes.find((l) => l.line === J.st && l.dir === -1 && l.s1 > J.box[2] + 40), T = life.laneFrom(J, 'z', -1);
    const cr = life.crossingRect(J, 'z', -1), mid = (cr[1] + cr[3]) / 2;
    // (on its far side: the other lane, not in the turning car's own path)
    const spot = [T.c - 5, mid], corner = [J.box[2] + 2.3, J.box[3] + 2.3];
    // (the street's lights kept on green, and nobody else about: no other cars, nobody else coming to cross)
    const hold = () => { R.t = DV.Roads.CYCLE * 20 - J.offset + 1; life.carT = 99; life.pedT = 99; };
    const out = {};
    for (const who of ['you', 'npc']) {
      for (const c of life.cars.splice(0)) life.releaseCar(c);
      for (const p of life.peds.slice(1)) { life.releasePed(p); life.peds.splice(life.peds.indexOf(p), 1); }
      hold();
      const car = life.carAt(A, J.box[2] + 34, { kind: 'sedan' });
      car.planJ = J; car.plan = life.turnPlan(car, life.nextJunction(car), 'right', T);
      let ped = null;
      if (who === 'npc') {
        // somebody stopped on the crossing (talking to someone), till they walk on
        ped = life.peds.find((p) => Math.hypot(p.x - corner[0], p.z - corner[1]) < 70) || life.peds[0];
        const ei = W.edges.findIndex((e) => { if (!e.cross) return false; const a = W.nodes[e.a], b = W.nodes[e.b]; return Math.abs((a.z + b.z) / 2 - mid) < 0.6 && Math.abs((a.x + b.x) / 2 - J.x) < 2; });
        // (walking west, away from the car's path, once they go on)
        const e = W.edges[ei], a = W.nodes[e.a], b = W.nodes[e.b], east = a.x > b.x ? e.a : e.b;
        Object.assign(ped, { edge: ei, from: east, to: east === e.a ? e.b : e.a, t: W.nodes[east].x - spot[0], listen: 60, wait: 0, waitFor: undefined });
        life.place(ped);
      }
      const stand = who === 'you' ? spot : corner;
      let waited = 0, hits = 0, i = 0;
      const person = () => (who === 'you' ? [P.x, P.z] : [ped.x, ped.z]);
      for (; i < 600 && waited < 5; i++) {
        hold(); QA.step(0.05, stand);
        if (car.speed === 0 && car.why === 'crossing') waited += 0.05;
        if (life.inCar(car, ...person(), 0.25)) hits++;
      }
      const waitedAt = { turning: !!car.turn, x: +car.x.toFixed(1), z: +car.z.toFixed(1) };
      // they get off the crossing: you step back onto the corner, the passer-by walks on
      if (ped) ped.listen = 0;
      let done = false;
      for (i = 0; i < 400 && !done; i++) {
        hold(); QA.step(0.05, corner);
        if (life.inCar(car, ...person(), 0.25)) hits++;
        done = !car.turn && car.lane === T;
      }
      out[who] = { waited: +waited.toFixed(2), waitedAt, hits, done, cars: life.cars.length };
    }
    return out;
  });
  T.ok(turnWait.you.waited >= 5 && turnWait.you.hits === 0 && turnWait.you.done, 'a car turning right waits for you on the crossing it turns into (' + turnWait.you.waited + ' s), then goes round once you step off', turnWait.you);
  T.ok(turnWait.npc.waited >= 5 && turnWait.npc.hits === 0 && turnWait.npc.done, 'and for a passer-by stopped on it, then goes once they\'ve walked on (' + turnWait.npc.waited + ' s)', turnWait.npc);

  /* ---------------- the world map ---------------- */
  const map = await ev(() => {
    QA.tp(150, 82, 0); QA.step(0.2);
    DV.Game.openRPGMenu('map');
    const cv = document.getElementById('map-canvas');
    DV.WorldMap.draw(cv);
    const W = DV.WorldMap, T0 = W.T;
    const tipAt = (x, z) => W.tip(T0.w / 2 + (x - T0.cx) * T0.s, T0.h / 2 + (z - T0.cz) * T0.s);
    const r = { view: DV.RPGMenu.mapView, you: W.you(), hits: W._hits.map((h) => h.tip), tipHub: tipAt(DV.CityMap.hub[0], DV.CityMap.hub[1]), tipStreet: tipAt(-200, 150), tipOut: tipAt(-1250, 35), tipFarm: tipAt(-700, 35) };
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
  T.ok(/Hub/.test(map.tipHub) && /&|Ave|St|Rd/.test(map.tipStreet) && /Amity Farmland/.test(map.tipFarm) && /Fence/.test(map.tipOut), 'hovering names what\'s there: ' + [map.tipHub, map.tipStreet, map.tipFarm, map.tipOut].join(' | '));
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
