// The city's shops (Build 7): eight of them, one or two to a sector, each with its door set into a real
// building front and the pavement in front of it clear. For every one: walk up the pavement to the door
// (real movement), go in, find the keeper at the counter on the shop's hours, talk to them, open the
// trading panel, buy something by clicking it (the scrip comes off, the stock goes down), sell something
// back (or be told they don't buy), and walk back out through the door onto the pavement. Then: an odd
// job for an hour's pay, a tattoo at Ortega's, the hours (shut doors after closing, and being shown out
// at closing time), a save made in a shop loading on the pavement outside it, the map's shop marks, and
// the draw calls: inside a shop, by a shopfront, and the Testing Center's lobby with the city built.
const L = require('./lib.js');
L.run('the shops: doors, keepers, trading, hours', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const calls = () => p.evaluate(() => new Promise((res) => setTimeout(() => res(DV.Game.renderer.info.render.calls), 900)));
  await ev(() => { DV.State.data.world.time = DV.U.parseTime('12:00'); window.__F = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }; window.__R = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 }; });

  /* ---- the shops, up in the city ---- */
  const net = await ev(() => {
    const z = DV.World.current, kit = z.streetKit;
    return DV.Shops.STORES.map((S) => {
      const f = __F[S.face];
      let items = 0;
      for (const c of kit.chunks.values()) for (const it of c.items) if (Math.abs(it.x - (S.x + f[0] * 1.2)) < 2.0 && Math.abs(it.z - (S.z + f[1] * 1.2)) < 2.0 && Math.abs((it.x - S.x) * f[0] + (it.z - S.z) * f[1]) < 2.4) items++;
      return { id: S.id, building: z.colliders.blocked(S.x - f[0] * 1.0, S.z - f[1] * 1.0, 0.2, 'npc'), door: !!z.interactables.find((i) => i.id === 'shop_in_' + S.id), street: z.walkable(S.x + f[0] * 1.5, S.z + f[1] * 1.5) && !z.colliders.blocked(S.x + f[0] * 1.3, S.z + f[1] * 1.3, 0.35, 'player'), items, sector: DV.CityMap.locate(S.x + f[0] * 2, S.z + f[1] * 2).sub, zoneBuilt: !!DV.World.zones['shop_' + S.id] };
    });
  });
  T.ok(net.length >= 8 && net.every((s) => s.building && s.door && s.street), net.length + ' shops, each door set into a real building front, on the pavement', net);
  T.ok(net.every((s) => s.items === 0), 'nothing on the street stands in front of a shop door', net.map((s) => s.id + ':' + s.items));
  const sectors = [...new Set(net.map((s) => s.sector))];
  T.ok(sectors.length >= 6, 'spread across the city: ' + sectors.join(', '));
  T.ok(net.every((s) => !s.zoneBuilt), 'no shop\'s inside is built until somebody walks in');
  const front = await ev(() => ({ one: DV.World.current.group.children.filter((o) => o.name === 'shopfronts').length }));
  T.eq(front.one, 1, 'all the shopfronts are one mesh');

  /* ---- every shop: walk to the door, in, the keeper, buy, sell, out ---- */
  const bought = {};
  for (const id of net.map((s) => s.id)) {
    // up the pavement to the door, on foot
    const walk = await ev((id) => {
      const S = DV.Shops.get(id), f = __F[S.face], P = DV.Player;
      QA.tp(S.x + f[0] * 6, S.z + f[1] * 6, __R[S.face] + Math.PI);
      DV.Input.keys.KeyW = true;
      let n = 0, d = 9;
      while (n++ < 60) { QA.step(0.1); d = Math.hypot(P.x - (S.x + f[0]), P.z - (S.z + f[1])); if (d < 1.2) break; }
      DV.Input.keys.KeyW = false;
      QA.step(0.2);
      DV.Interaction.update(DV.World.current, P);
      const it = DV.Interaction.current;
      return { d: +d.toFixed(2), it: it && it.id, label: it && (typeof it.label === 'function' ? it.label() : it.label) };
    }, id);
    T.ok(walk.d < 1.6 && walk.it === 'shop_in_' + id && walk.label === 'Go in', id + ': walk up the pavement to the door ("' + walk.label + '")', walk);
    await ev(() => DV.Interaction.use(DV.Game));
    T.ok(await L.until(p, () => DV.World.current.id.indexOf('shop_') === 0 && DV.Game.state === 'playing', 30000), id + ': in through the door');
    const inside = await ev((id) => {
      const z = DV.World.current, S = DV.Shops.get(id), n = DV.NPCs.get(S.keeper.id), c = z.spot(id + '_counter');
      return { zone: z.id, place: z.placeName(DV.Player.x, DV.Player.z).name, keeper: n.present, atCounter: n.present ? +Math.hypot(n.x - c.x, n.z - c.z).toFixed(2) : null, tris: z.stats.tris, pos: DV.State.data.player.pos };
    }, id);
    T.ok(inside.zone === 'shop_' + id && inside.keeper && inside.atCounter < 0.6, id + ': ' + inside.place + ', the keeper behind the counter (' + inside.tris + ' tris)', inside);
    const c1 = await calls();
    T.ok(c1 < 140, id + ': inside draws in ' + c1 + ' calls');
    // up to the counter, and talk
    const talk = await ev((id) => {
      const z = DV.World.current, S = DV.Shops.get(id), c = z.spot(id + '_customer'), P = DV.Player;
      QA.tp(c.x, c.z - 1.6, 0);
      DV.Input.keys.KeyW = true; QA.step(1.0); DV.Input.keys.KeyW = false; QA.step(0.2);
      DV.Interaction.update(z, P);
      const it = DV.Interaction.current;
      if (!it || it.kind !== 'npc') return { it: it && it.id, z: P.z };
      DV.Interaction.use(DV.Game);
      const v = QA.view();
      const r = QA.pick('see what you have');
      return { keeper: it.npc.id === S.keeper.id, v: v && v.slice(0, 60), r, state: DV.Game.state, panel: DV.ShopUI.isOpen() };
    }, id);
    T.ok(talk.keeper && talk.state === 'shop' && talk.panel, id + ': talk to the keeper; "Let me see what you have." opens the trading panel', talk);
    // buy: click the first thing in stock, then Buy
    const buy = await ev((id) => {
      const S = DV.Shops.get(id), it = DV.Shops.forSale(S).find((q) => q.qty > 0 && !q.service && DV.Wallet.can(q.price));
      const w0 = DV.Wallet.get(), n0 = DV.Inventory.count(it.id), q0 = it.qty;
      const a = QA.click('#shop .sh-col.buy .sh-row', it.name), b = QA.click('#shop .foot .btn', 'Buy');
      const after = DV.Shops.forSale(S).find((q) => q.id === it.id);
      return { item: it.id, a, b, paid: w0 - DV.Wallet.get(), price: it.price, got: DV.Inventory.count(it.id) - n0, stock: q0 - after.qty, msg: DV.ShopUI.msg };
    }, id);
    T.ok(buy.paid === buy.price && buy.got === 1 && buy.stock === 1, id + ': buy ' + buy.item + ' for ' + buy.price + ' scrip ("' + buy.msg + '")', buy);
    bought[id] = buy.item;
    // sell: something they deal in (what's just been bought, or something given for it), by clicking it
    const sell = await ev((id) => {
      const S = DV.Shops.get(id);
      if (!S.buys) { DV.ShopUI.pick('sell', 0); return { none: true, list: DV.Shops.sellable(S).length, msg: DV.Shops.sell(S, 'apple').message }; }
      let it = DV.Shops.sellable(S)[0];
      if (!it) { const want = S.buys.ids ? S.buys.ids[0] : 'ration_bar'; DV.Inventory.add(want, 1, true); DV.ShopUI.render(); it = DV.Shops.sellable(S)[0]; }
      const w0 = DV.Wallet.get(), n0 = DV.Inventory.count(it.id);
      const a = QA.click('#shop .sh-col.sell .sh-row', it.name), b = QA.click('#shop .foot .btn', 'Sell');
      return { item: it.id, a, b, got: DV.Wallet.get() - w0, price: it.price, gone: n0 - DV.Inventory.count(it.id), msg: DV.ShopUI.msg };
    }, id);
    if (sell.none) T.ok(sell.list === 0 && /pawn/.test(sell.msg), id + ': they don\'t buy ("' + sell.msg + '")', sell);
    else T.ok(sell.got === sell.price && sell.price > 0 && sell.gone === 1, id + ': sell ' + sell.item + ' back for ' + sell.price + ' scrip', sell);
    // done, and back out through the door on foot
    const out = await ev(() => {
      QA.click('#shop .foot .btn', 'Done');
      const st = DV.Game.state;
      QA.tp(0, 2.6, Math.PI);
      DV.Input.keys.KeyW = true;
      let n = 0; while (DV.Game.state === 'playing' && n++ < 40) QA.step(0.1);
      DV.Input.keys.KeyW = false;
      return { st, now: DV.Game.state };
    });
    T.ok(out.st === 'playing' && out.now === 'transition', id + ': close the panel and walk out through the door', out);
    T.ok(await L.until(p, () => DV.World.current.id === 'testing_center' && DV.Game.state === 'playing', 30000), id + ': back in the street');
    const st = await ev((id) => {
      const S = DV.Shops.get(id), P = DV.Player, f = __F[S.face];
      return { d: +Math.hypot(P.x - (S.x + f[0] * 1.6), P.z - (S.z + f[1] * 1.6)).toFixed(2), street: DV.World.current.placeName(P.x, P.z).name, walk: DV.World.current.walkable(P.x, P.z) };
    }, id);
    T.ok(st.d < 0.5 && st.walk, id + ': on the pavement outside its door, on ' + st.street, st);
  }

  /* ---- an odd job, and a tattoo ---- */
  const job = await ev(() => { B.use('shop_in_market'); return 1; });
  await L.until(p, () => DV.World.current.id === 'shop_market' && DV.Game.state === 'playing', 30000);
  const j = await ev(() => {
    const S = DV.Shops.get('market'), n = DV.NPCs.get(S.keeper.id);
    const t0 = DV.Clock.minutes(), w0 = DV.Wallet.get(), a0 = DV.Inventory.count('apple');
    QA.talk(n.id);
    const r = QA.pick('any work');
    const r2 = QA.pick('do it');
    const v = QA.view();
    QA.end();
    return { r, r2, v: v && v.slice(0, 50), mins: Math.round(DV.Clock.minutes() - t0), pay: DV.Wallet.get() - w0, apple: DV.Inventory.count('apple') - a0, again: DV.Shops.jobOpen(S) };
  });
  T.ok(j.mins === 60 && j.pay === 5 && j.apple === 1 && !j.again, 'an odd job at the market: an hour sorting apples, 5 scrip and an apple, once a day', j);
  void job;
  await ev(() => DV.Shops.exit());
  await L.until(p, () => DV.World.current.id === 'testing_center' && DV.Game.state === 'playing', 30000);
  await ev(() => B.use('shop_in_tattoo'));
  await L.until(p, () => DV.World.current.id === 'shop_tattoo' && DV.Game.state === 'playing', 30000);
  const tat = await ev(() => {
    const S = DV.Shops.get('tattoo');
    DV.Wallet.add(12, 'test', true);
    const w0 = DV.Wallet.get(), t0 = DV.Clock.minutes();
    const r = DV.Shops.buy(S, 'tattoo_armR');
    const again = DV.Shops.buy(S, 'tattoo_armR');
    return { r, again: again.ok, paid: w0 - DV.Wallet.get(), mins: Math.round(DV.Clock.minutes() - t0), tattoos: DV.State.data.player.tattoos.slice() };
  });
  T.ok(tat.r.ok && !tat.again && tat.paid === 12 && tat.mins === 40 && tat.tattoos.indexOf('armR') >= 0, 'a tattoo at Ortega\'s: forty minutes in the chair, 12 scrip, and it stays', tat);

  /* ---- a save made in a shop loads on the pavement outside it ---- */
  T.ok(await ev(() => DV.Save.write('6').ok), 'save in the tattoo parlour');
  await ev(() => DV.Game.loadSlot('6'));
  T.ok(await L.until(p, () => DV.World.current && DV.World.current.id === 'testing_center' && DV.Game.state === 'playing', 40000), 'the save loads');
  const ld = await ev(() => { const S = DV.Shops.get('tattoo'), P = DV.Player; return { d: +Math.hypot(P.x - S.x, P.z - S.z).toFixed(2), tattoos: DV.State.data.player.tattoos.slice(), scrip: DV.Wallet.get() }; });
  T.ok(ld.d < 2.5 && ld.tattoos.indexOf('armR') >= 0, '…on the pavement outside Ortega\'s, tattoo and all (' + ld.d + ' m)', ld);

  /* ---- the hours ---- */
  const shut = await ev(() => {
    DV.State.data.world.time = DV.U.parseTime('17:30');
    const it = DV.World.current.interactables.find((i) => i.id === 'shop_in_market');
    const label = it.label;
    B.use('shop_in_market');
    QA.step(1);
    const after = DV.World.current.id;
    DV.State.data.world.time = DV.U.parseTime('21:10');
    const open = DV.Shops.STORES.filter((S) => DV.Shops.isOpen(S)).map((S) => S.id);
    return { label, after, open, latest: Math.max(...DV.Shops.STORES.map((S) => DV.U.parseTime(S.hours[1]))) };
  });
  T.ok(shut.label === 'Closed (opens 07:00)' && shut.after === 'testing_center', 'after closing the market\'s door is shut ("' + shut.label + '")', shut);
  T.ok(!shut.open.length && shut.latest <= DV_CURFEW(), 'nothing is open past the curfew at 21:00', shut);
  // in at a minute to closing: the keeper calls time and you're shown out
  await ev(() => { DV.State.data.world.time = DV.U.parseTime('16:58'); B.use('shop_in_market'); });
  await L.until(p, () => DV.World.current.id === 'shop_market' && DV.Game.state === 'playing', 30000);
  const close = await ev(() => {
    window.__notes = [];
    const o = DV.UI.notify; DV.UI.notify = function (t, k) { window.__notes.push(t); return o.call(this, t, k); };
    let n = 0; while (DV.World.current.id === 'shop_market' && DV.Game.state === 'playing' && n++ < 600) QA.step(0.1);
    return { n, t: DV.Clock.str(), state: DV.Game.state, notes: window.__notes.slice() };
  });
  T.ok(close.state === 'transition' && close.notes.some((x) => /That's five/.test(x)), 'at five the market\'s keeper calls time, and shows you out (' + close.t + ')', close);
  T.ok(await L.until(p, () => DV.World.current.id === 'testing_center' && DV.Game.state === 'playing', 30000), '…back on Randolph Street');

  /* ---- the maps ---- */
  const maps = await ev(() => {
    const cv = document.createElement('canvas'); cv.width = 900; cv.height = 600; cv.style.width = '900px'; cv.style.height = '600px'; document.body.appendChild(cv);
    DV.WorldMap.zoom = 3; DV.WorldMap.cx = 40; DV.WorldMap.cz = 60;
    DV.WorldMap.draw(cv);
    const hits = (DV.WorldMap._hits || []).filter((h) => /open \d\d:\d\d/.test(h.tip)).map((h) => h.tip.split(' — ')[0]);
    cv.remove();
    return { hits };
  });
  T.ok(maps.hits.length >= 2 && maps.hits.some((h) => /Produce/.test(h)), 'the City map marks the shops, with their hours (' + maps.hits.join(', ') + ')', maps);

  /* ---- the draw calls ---- */
  await ev(() => { DV.State.data.world.time = DV.U.parseTime('12:00'); const S = DV.Shops.get('market'); QA.tp(S.x - 6, S.z - 5, Math.PI * 0.75); });
  const c2 = await calls();
  T.ok(c2 < 230, 'by the market\'s front on Randolph Street: ' + c2 + ' draw calls');
  const lobby = await ev(() => new Promise((res) => { DV.Player.place(40, 57, Math.PI); DV.Game.rig.yaw = Math.PI; setTimeout(() => { const m = DV.World.current.group.children.find((o) => o.name === 'shopfronts'); res({ calls: DV.Game.renderer.info.render.calls, front: m.visible }); }, 1500); }));
  T.ok(lobby.calls < 230 && !lobby.front, 'in the lobby the shopfronts aren\'t drawn: ' + lobby.calls + ' draw calls', lobby);
  T.noErrors(errs);
});
function DV_CURFEW() { return 21 * 60; }
