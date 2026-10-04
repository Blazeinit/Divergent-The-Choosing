// Build 3, Dauntless, days 2–4: the compound as a living district. Arriving on Day 2, the
// class about the Pit, sleeping in your bunk; Day 3's blocks (the range, the bags, sparring
// Joey) scored and posted; the evening with Daniel at the bags; Day 4's knives, range and
// ranked fight; the board at 17:00; the zip line off the Hancock building with Bo — and a
// save made in the middle of a day loading back to the same place and time.
const L = require('./lib.js');
L.run('Build 3: Dauntless, days 2–4', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => {
    DV.State.data.player.upbringing = 'erudite';
    DV.State.setFlag('daniel_tested');
    DV.Build2.setFaction('dauntless'); DV.Build2.dressFor('dauntless');
    DV.State.data.story.dauntlessName = 'Tess';
    DV.State.data.world.day = 2; DV.State.data.world.time = DV.U.parseTime('11:20');
    DV.District.enter('dauntless', { spawn: [34, 9, 0.2], instant: true });
  });
  T.ok(await L.until(p, () => DV.World.current && DV.World.current.id === 'd_compound' && DV.Game.state === 'playing', 30000), 'Day 2: into the compound after the Pit');
  const d2 = await ev(() => { QA.step(1); const here = DV.NPCs.all.filter((n) => n.def.zone === 'd_compound' && n.present); return { district: DV.District.currentId(), q: DV.Quests.isActive('stage_one'), n: here.length, mark: DV.NPCs.get('d_mark').present }; });
  T.ok(d2.district === 'dauntless' && d2.q && d2.n >= 10 && d2.mark, 'the district is alive: Stage One active, ' + d2.n + ' people about, Mark among them', d2);
  // Day 2 → sleep → Day 3
  await ev(() => { B.at('21:00'); DV.Actions.sleep(); });
  T.ok(await L.until(p, () => DV.Game.state === 'playing' && DV.Clock.day() === 3, 30000), 'sleep in your bunk: Day 3, 06:30');
  T.eq(await ev(() => DV.Quests.obj('stage_one', 'bunk')), 'done', 'the first night in the dormitory');
  // the range
  const r1 = await ev(() => { B.at('08:02'); const u = B.use('range:lane1'); const id = DV.Activity.current && DV.Activity.current.id; B.finishActivity(); return [u, id]; });
  T.ok(r1[1] === 'range', 'Day 3, 08:00: the range', r1);
  await L.until(p, () => DV.Game.state === 'playing' && !DV.Activity.active(), 8000);
  const bags = await ev(() => { B.use('bag:bag2'); const id = DV.Activity.current && DV.Activity.current.id; B.finishActivity(); return id; });
  T.eq(bags, 'bags', '10:00: the bags');
  await L.until(p, () => DV.Game.state === 'playing' && !DV.Activity.active(), 8000);
  const spar = await ev(() => { B.at('13:31'); B.use('ring_step'); QA.step(1.2); const F = DV.Activity.current; const who = F && F.them && F.them.name; B.finishActivity(); return who; });
  T.ok(/Joey/.test(spar || ''), '13:30: sparring — against Joey (' + spar + ')');
  await L.until(p, () => DV.Game.state === 'playing' && !DV.Activity.active(), 8000);
  const blocks = await ev(() => ({ b: DV.Initiation.st().blocks, pts: DV.Initiation.points('player') }));
  T.ok(blocks.b['d3:range'] === 'done' && blocks.b['d3:bags'] === 'done' && blocks.pts > 0, 'the day\'s blocks are done and scored (' + blocks.pts + ' points)', blocks);
  // a save mid-district
  // (no clock jump here: the spar runs to the end of its block, and skipping back to an earlier hour would roll into tomorrow)
  const saved = await ev(() => { QA.end(); DV.Player.place(30, 6, 0.4); QA.step(0.5); DV.Save.write('4'); return { t: DV.Clock.str(), d: DV.Clock.day(), pts: DV.Initiation.points('player') }; });
  await ev(() => DV.Game.loadSlot('4'));
  T.ok(await L.until(p, () => DV.World.current && DV.World.current.id === 'd_compound' && DV.Game.state === 'playing', 30000), 'a save made in the compound loads back into the compound');
  const loaded = await ev(() => ({ t: DV.Clock.str(), d: DV.Clock.day(), x: DV.Player.x, z: DV.Player.z, district: DV.District.currentId(), npcs: DV.NPCs.all.filter((n) => n.def.zone === 'd_compound' && n.present).length, pts: DV.Initiation.points('player') }));
  T.ok(saved.d === 3 && loaded.d === saved.d && loaded.t === saved.t && Math.abs(loaded.x - 30) < 0.5 && loaded.district === 'dauntless' && loaded.npcs >= 8 && loaded.pts === saved.pts, 'same day (' + saved.d + '), same time (' + saved.t + '), same place, same people, same points', { saved, loaded });
  await L.b3(p);
  // the evening: Daniel asks for help
  const dan = await ev(() => { B.at('19:40'); QA.talk('d_daniel'); return [QA.pick('don\'t want to fight'), QA.pick('show you')]; });
  T.ok(dan.every((x) => /^ok/.test(x)), 'after dinner, Daniel can\'t throw a punch without apologising — you offer to help', dan);
  T.ok(await ev(() => DV.Quests.isActive('hands_up')), '…"Hands Up" begins');
  // Day 4
  await ev(() => { QA.end(); B.at('22:50'); DV.Actions.sleep(); });
  T.ok(await L.until(p, () => DV.Game.state === 'playing' && DV.Clock.day() === 4, 30000), 'Day 4');
  const kn = await ev(() => { B.at('08:01'); B.use('knife_line'); QA.step(0.6); const id = DV.Activity.current && DV.Activity.current.id; B.finishActivity(); return id; });
  T.eq(kn, 'knives', '08:00: the knife wall');
  await L.until(p, () => DV.Game.state === 'playing' && !DV.Activity.active(), 8000);
  const r2 = await ev(() => { B.use('range:lane2'); const id = DV.Activity.current && DV.Activity.current.id; B.finishActivity(); return id; });
  T.eq(r2, 'range', '10:00: the range, ranked this time');
  await L.until(p, () => DV.Game.state === 'playing' && !DV.Activity.active(), 8000);
  const f1 = await ev(() => { B.at('13:31'); B.use('ring_step'); QA.step(1.3); const F = DV.Activity.current; const who = F && F.them && F.them.name; B.finishActivity(); return who; });
  T.ok(/Bryce/.test(f1 || ''), '13:30: the first ranked fight — Bryce (' + f1 + ')');
  await L.until(p, () => DV.Game.state === 'playing' && !DV.Activity.active(), 8000);
  const board = await ev(() => { B.at('17:01'); QA.step(1); const r = DV.Actions.rankings(); if (DV.UI.modalOpen === 'reading') DV.UI.closeReading(); return r && r.read && r.read.text; });
  T.ok(/Tess|Tester/.test(board || '') && (board || '').split('\n').length >= 8, 'the rankings go up on the board at 17:00');
  // the zip line
  const bo = await ev(() => { B.at('19:30'); QA.talk('d_bo'); return [QA.pick('zip line'), QA.pick('absolutely')]; });
  T.ok(bo.every((x) => /^ok/.test(x)), 'Bo: "the zip line, tonight — you in?"', bo);
  await ev(() => { QA.end(); B.at('21:25'); DV.Player.place(24.5, -12.5, 0); QA.step(4); });
  T.ok(await L.until(p, () => DV.Chapter.id === 'zip_line' && DV.Game.state === 'playing' && DV.Chapter.flag('ready'), 40000), 'up the Hancock building at night');
  await ev(() => { B.use('harness'); QA.step(2); });
  T.ok(await L.until(p, () => DV.Activity.current && DV.Activity.current.id === 'zipride', 8000), 'into the harness, and off the edge');
  const ride = await ev(() => { const A = DV.Activity.current; let n = 0; while (DV.Activity.current === A && n++ < 2000) { DV.Input.keys.KeyS = A.c && (A.c.len - A.s) < 22; QA.step(0.05); } DV.Input.keys.KeyS = false; return DV.Quests.q('zip_line').state; });
  T.eq(ride, 'complete', 'the ride, braking before the end of the cable');
  T.ok(await L.until(p, () => DV.World.current.id === 'd_compound' && DV.Game.state === 'playing', 40000), 'back in the compound before midnight');
  T.noErrors(errs);
});
