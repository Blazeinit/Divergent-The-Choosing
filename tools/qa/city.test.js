// The city beyond the fence: it builds fast and cheap, never pokes into the playable area,
// the elevated L is gone (the Circle Line runs underground), the fog opens up outdoors, and cloud shadows
// move over the ground and darken people standing in them.
const L = require('./lib.js');
L.run('city, haze and clouds', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const st = await ev(() => { const c = DV.World.current.city; return c ? Object.assign({ meshes: c.group.children.length }, c.stats) : null; });
  T.ok(st && st.tris > 20000 && st.tris < 240000, 'the city is built (' + (st && st.tris) + ' tris in ' + (st && st.meshes) + ' meshes)');
  T.ok(st && st.buildMs < 2500, 'and builds quickly (' + (st && st.buildMs) + ' ms in software GL)');
  T.ok(await ev(() => !DV.Zones.get('testing_center').props.some((q) => q.type === 'backdrop')), 'no flat painted backdrops left');
  // no city geometry inside any playable room (above floor level)
  const bad = await ev(() => {
    const zone = DV.World.current, c = zone.city, out = [];
    const rooms = zone.def.rooms;
    c.group.children.forEach((m) => {
      if (!/^city_(plain|office|brick|glass|derelict)$/.test(m.name)) return;
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (y < 0.3) continue;
        const r = rooms.find((q) => x > q.x0 + 0.05 && x < q.x1 - 0.05 && z > q.z0 + 0.05 && z < q.z1 - 0.05);
        if (r) { out.push(m.name + ' (' + x.toFixed(1) + ',' + y.toFixed(1) + ',' + z.toFixed(1) + ') in ' + r.id); if (out.length > 5) return; }
      }
    });
    return out;
  });
  T.ok(bad.length === 0, 'nothing from the city pokes into a playable room', bad);
  // fog: light haze outside, short grey fog inside
  const fogOut = await ev(() => { QA.tp(40, 70, 0); QA.step(3); const f = DV.World.scene.fog; return [Math.round(f.far), f.color.getHexString()]; });
  const fogIn = await ev(() => { QA.tp(40, 30, 0); QA.step(3); const f = DV.World.scene.fog; return [Math.round(f.far), f.color.getHexString()]; });
  T.ok(fogOut[0] > 250 && fogIn[0] < 120, 'the fog opens up outdoors (' + fogOut.join(' ') + ') and closes in indoors (' + fogIn.join(' ') + ')');
  // clouds drift, and their shadows dim people standing in them
  const sh = await ev(() => {
    const c = DV.World.current.city, zone = DV.World.current;
    const a = c.cloudShadeAt(40, 70);
    c.update(40, DV.Game.camera);
    const b = c.cloudShadeAt(40, 70);
    // find a shaded and a clear spot in the plaza right now
    let dark = null, clear = null;
    for (let x = 23; x < 57; x += 0.5) for (let z = 61; z < 75; z += 0.5) {
      const s = c.cloudShadeAt(x, z);
      if (s > 0.8 && !dark) dark = [x, z];
      if (s === 0 && !clear) clear = [x, z];
    }
    const base = (q) => { const g = zone.lg, i = Math.floor((q[0] - zone.bx0) / g.S), j = Math.floor((q[1] - zone.bz0) / g.S); return g.data[(j * g.w + i) * 3]; };
    // let the clouds move on until part of the plaza is in shadow
    for (let k = 0; k < 40 && !dark; k++) {
      c.update(10, DV.Game.camera);
      for (let x = 23; x < 57 && !dark; x += 0.5) for (let z = 61; z < 75; z += 0.5) if (c.cloudShadeAt(x, z) > 0.8) { dark = [x, z]; break; }
    }
    const ratio = (q) => q && zone.lightAt(q[0], q[1])[0] / base(q);
    return { a, b, dark: ratio(dark), want: dark && 1 - 0.24 * c.cloudShadeAt(dark[0], dark[1]), clear: ratio(clear), inside: zone.lightAt(40, 30)[0] / base([40, 30]), deck: c.deck.visible, puffs: c.scud && c.scud.count };
  });
  T.ok(sh.a !== sh.b, 'cloud shadows move with the wind (' + sh.a.toFixed(2) + ' → ' + sh.b.toFixed(2) + ')');
  T.ok(sh.dark !== null && Math.abs(sh.dark - sh.want) < 0.01 && sh.dark < 0.85, 'people in a cloud shadow are lit darker (' + (sh.dark && sh.dark.toFixed(2)) + ')');
  T.ok((sh.clear === null || sh.clear > 0.99) && sh.inside === 1, 'but not in the clear, and never indoors', sh);
  T.ok(sh.deck && sh.puffs >= 10, 'overcast deck and ' + sh.puffs + ' low clouds');
  // the elevated L is gone from the city (the Circle Line runs under it instead): no train, no deck
  const noL = await ev(() => { const c = DV.World.current.city; return { train: !!c.train, metro: !!DV.World.current.metro && DV.World.current.metro.entrances.length }; });
  T.ok(!noL.train && noL.metro === 6, 'no elevated railway over the streets; the Circle Line\'s six entrances instead', noL);
  // the menu rooftop has its own dusk city
  T.ok(await ev(() => { const z = DV.World.getZone('menu_bg'); return !!(z.city && z.city.stats.tris > 20000 && z.city.group.position.y < -30); }), 'the main-menu rooftop looks out over a dusk city below');
  await L.shot(p, 'city_plaza');
  T.noErrors(errs);
});
