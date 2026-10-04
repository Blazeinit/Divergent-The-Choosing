// Build 3, Dauntless, days 5–6: the story end of Stage One. The knife lesson at the board
// (and the scar), the second ranked fight against Josh, the ambush at the chasm that night
// (the struggle, the fight, Nate, the infirmary, Mark), Day 6's cut, and the first fear
// simulation — ending on STAGE ONE COMPLETE.
const L = require('./lib.js');
L.run('Build 3: Dauntless, days 5–6 (Stage One)', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => {
    DV.State.data.player.upbringing = 'erudite';
    DV.State.setFlag('daniel_tested');
    DV.Build2.setFaction('dauntless'); DV.Build2.dressFor('dauntless');
    DV.State.data.world.day = 5; DV.State.data.world.time = DV.U.parseTime('07:40');
    DV.District.enter('dauntless', { spawn: [3, -4, 0], instant: true });
  });
  T.ok(await L.until(p, () => DV.World.current && DV.World.current.id === 'd_compound' && DV.Game.state === 'playing', 30000), 'Day 5 in the compound');
  // days 3 and 4 counted as played, well
  await ev(() => { const I = DV.Initiation; for (const d of [3, 4]) for (const b of I.blocks(d)) { I.st().blocks[I.key(b, d)] = 'done'; I.award('player', 110, b.title, b); I.simulate(b, d); } DV.Quests.setObj('stage_one', 'bunk', 'done'); DV.Quests.activate('stage_one', 'train'); });
  // the knife lesson
  await ev(() => { B.at('08:01'); B.use('knife_line'); });
  T.ok(await L.until(p, () => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'knife_lesson', 30000), '08:00: Mark wants a volunteer for the board');
  await ev(() => QA.pick('do it'));
  T.ok(await L.until(p, () => DV.Activity.current && DV.Activity.current.id === 'knives', 30000), 'you stand at the board and don\'t flinch…');
  T.ok(await ev(() => !!DV.State.flag('took_the_board') && !!DV.State.flag('ear_scar')), '…and leave with a nick out of your ear');
  await ev(() => B.finishActivity());
  await L.until(p, () => DV.Game.state === 'playing' && !DV.Activity.active(), 8000);
  await ev(() => { B.use('bag:bag0'); B.finishActivity(); });
  await L.until(p, () => DV.Game.state === 'playing' && !DV.Activity.active(), 8000);
  // Josh
  const josh = await ev(() => { B.at('13:31'); B.use('ring_step'); QA.step(1.3); const F = DV.Activity.current; const who = F && F.them && F.them.name; B.finishActivity(); return who; });
  T.ok(/Josh/.test(josh || ''), '13:30: the second ranked fight — Josh (' + josh + ')');
  await L.until(p, () => DV.Game.state === 'playing' && !DV.Activity.active(), 8000);
  // the ambush
  await ev(() => { DV.State.setFlag('ally_nate'); B.at('22:20'); DV.Player.place(30, 6, 0); QA.step(1); });
  T.ok(await L.until(p, () => DV.Activity.current && DV.Activity.current.id === 'struggle', 30000), '22:20, by the chasm: hands on you in the dark');
  await ev(() => { const A = DV.Activity.current; let n = 0, k = 0; while (DV.Activity.current === A && n++ < 400) { DV.Input.pressed[k++ % 2 ? 'KeyA' : 'KeyD'] = true; QA.step(0.05); } });
  T.ok(await L.until(p, () => DV.Activity.current && DV.Activity.current.id === 'fight', 30000), 'you break free — and it\'s Josh');
  await ev(() => B.finishActivity());
  T.ok(await L.until(p, () => DV.Dialogue.isActive() && DV.Dialogue.active.npcId === 'd_mark', 40000), 'the infirmary; Mark wants names');
  await ev(() => { QA.pick('just josh'); QA.end(); });
  const after = await ev(() => ({ q: DV.Quests.q('bad_blood') && DV.Quests.q('bad_blood').state, josh: DV.Initiation.here('d_josh') }));
  T.ok(after.q === 'complete' && !after.josh, 'Josh is gone from the compound by morning', after);
  // Day 6: the cut
  await ev(() => { QA.step(2); DV.Actions.sleep(); });
  T.ok(await L.until(p, () => DV.Game.state === 'playing' && DV.Clock.day() === 6, 20000), 'Day 6');
  await ev(() => { B.at('08:00'); DV.Player.place(28.5, -26, Math.PI); QA.step(1.5); });
  T.ok(await L.until(p, () => DV.Game.state === 'playing' && !DV.StageOne.seqs.length && DV.Initiation.st().cut, 60000), '08:00: the final rankings, and the cut');
  const cut = await ev(() => ({ cut: DV.Initiation.st().cut, me: !!DV.Initiation.st().playerCut, stage2: DV.Quests.obj('stage_one', 'stage2') }));
  T.ok(cut.cut && cut.cut.length >= 1 && !cut.me && cut.stage2 === 'active', 'below the line: ' + (cut.cut || []).join(', ') + ' — not you', cut);
  // the fear simulation
  await ev(() => { B.at('10:01'); B.use('fear_chair_use'); });
  T.ok(await L.until(p, () => DV.Chapter.id === 'fear_sim' && DV.Game.state === 'playing', 40000), '10:00: the chair, the needle, the simulation');
  const fear = await ev(() => {
    let n = 0; const I = DV.Input, Ch = DV.Chapter;
    QA.step(10);
    while (Ch.id === 'fear_sim' && !Ch.done && n++ < 4000) {
      const P = DV.Player;
      if (Ch.v === 'beam') { I.keys.KeyW = P.x < 9; I.keys.Space = P.x >= 9; I.keys.KeyA = (P.z - 3) + Ch.windV * 0.4 > 0.06; I.keys.KeyD = (P.z - 3) + Ch.windV * 0.4 < -0.06; DV.Game.rig.yaw = Math.PI / 2; }
      else I.keys.Space = true;
      QA.step(0.05);
    }
    for (const k of ['KeyW', 'KeyA', 'KeyD', 'Space']) I.keys[k] = false;
    return { done: Ch.done, v: Ch.v };
  });
  T.ok(fear.done, 'the ' + fear.v + ': slow your heart, and it lets you go', fear);
  T.ok(await L.until(p, () => !!document.getElementById('banner'), 60000), 'the debrief…');
  const end = await ev(() => ({ b1: document.querySelector('#banner .b1').textContent, b2: document.querySelector('#banner .b2').textContent, q: DV.Quests.q('stage_one').state, zone: DV.World.current.id }));
  T.ok(end.b1 === 'STAGE ONE COMPLETE' && /RANKED/.test(end.b2) && end.q === 'complete' && end.zone === 'd_compound', '…STAGE ONE COMPLETE · ' + end.b2, end);
  T.noErrors(errs);
});
