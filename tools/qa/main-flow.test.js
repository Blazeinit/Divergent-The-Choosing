// The main quest end to end: reception → badge → security → PA call → Room 4 → serum →
// three simulations (an ordinary run) → results → completion banner → save.
const L = require('./lib.js');
L.run('main quest: Aptitude Day', async (p, T, errs) => {
  await L.quickStart(p, { strength: 5, agility: 5, intelligence: 7, perception: 7, charisma: 6, resolve: 6 });
  const ev = (fn, a) => p.evaluate(fn, a);
  T.eq(await ev(() => QA.talk('kade_mercer')), 'no_badge', 'security turns you away before check-in');
  await ev(() => QA.end());
  T.ok(await ev(() => QA.checkIn()), 'reception issues the name badge');
  T.eq(await ev(() => [QA.obj('aptitude_day', 'checkin'), QA.obj('aptitude_day', 'security')]), ['done', 'active'], 'check-in done, security next');
  T.ok(await ev(() => QA.clearSecurity()), 'showing the badge clears security');
  T.eq(await ev(() => QA.obj('aptitude_day', 'wait')), 'active', 'now waiting to be called');
  await ev(() => { QA.tp(30, 30); DV.Clock.skipTo(DV.Story.callTime() + 1); DV.NPCAI.syncAll(); });
  await p.waitForTimeout(1500);
  T.ok(await ev(() => !!DV.State.flag('tr4_open')), 'the PA calls you to Room 4');
  await ev(() => QA.tp(48.5, 14.5));
  await p.waitForTimeout(500);
  await ev(() => { QA.talk('juno_ashgrove'); for (let i = 0; i < 8 && DV.Dialogue.active; i++) { const v = DV.Dialogue.active.view; const en = v.choices.filter((c) => c.enabled); DV.Dialogue.choose((en.find((c) => /ready|right answer|nice to meet|in the serum/i.test(c.label)) || en[0]).index); } QA.end(); });
  await ev(() => { DV.Actions.testChair(DV.Game, {}); QA.pick('do it'); QA.pick('...'); });
  await p.waitForFunction(() => DV.World.current.id === 'sim_platform' && DV.Game.state === 'playing', null, { timeout: 20000 });
  T.ok(true, 'the serum takes you into simulation I');
  // I — rod, child behind you, strike the dog
  await ev(() => { QA.tp(30, 4.4); DV.Sim.scene('sim1_table'); QA.pick('steel rod'); });
  await ev(() => QA.step(14));
  await ev(() => { const c = DV.Sim.child; if (c) { QA.tp(c.x + 1.2, c.z); DV.Sim.scene('sim1_child'); QA.pick('behind me'); } const d = DV.Sim.dog; QA.tp(d.x + 2, d.z); DV.Sim.scene('sim1_dog'); QA.pick('strike'); });
  await ev(() => QA.step(7)); // run the scenario's game-time timers (software GL can be slow)
  await p.waitForFunction(() => DV.World.current.id === 'sim_flood' && DV.Game.state === 'playing', null, { timeout: 30000 });
  T.ok(true, 'simulation II loads');
  // II — clipboard, crowbar, free Hester, close the valve, calm Corwin, code 53, out
  await ev(() => {
    QA.tp(6.5, 2.2); DV.Sim.scene('sim2_clipboard'); QA.pick('put it down');
    QA.tp(8.6, 7.6); DV.Interaction.extra.find((x) => x.id === 'f_crowbar').onUse();
    QA.tp(4.5, 4.6); DV.Sim.scene('sim2_hester'); QA.pick('crowbar');
    QA.tp(1.2, 8.2); DV.Sim.scene('sim2_valve'); QA.pick('wrench');
    const c = DV.Sim.corwin; QA.tp(c.x - 1, c.z); DV.Sim.scene('sim2_corwin'); QA.pick('code is on'); QA.pick('...');
    QA.tp(13.3, 6.0); DV.Sim.scene('sim2_keypad'); QA.pick('count the pipes'); QA.pick('53');
  });
  T.ok(await ev(() => DV.Sim.flag('doorOpen') && DV.Sim.flag('hesterFree')), 'woman freed and the keypad opens with 53');
  await ev(() => { QA.tp(16, 5); QA.step(4); });
  await p.waitForFunction(() => DV.World.current.id === 'sim_tribunal' && DV.Game.state === 'playing', null, { timeout: 30000 });
  T.ok(true, 'simulation III loads');
  // III — sit, answer the tribunal
  await ev(() => { QA.tp(10, 12); DV.Sim.scene('sim3_chair'); QA.pick('sit'); });
  await p.waitForFunction(() => DV.Dialogue.active && DV.Dialogue.active.node === 'q1', null, { timeout: 10000 });
  const picks = await ev(() => QA.seq(['tester', 'waiting hall', 'punish me', 'legal document', 'wired', '...']));
  T.ok(picks.every((x) => /^ok/.test(x)), 'tribunal answered', picks);
  await ev(() => QA.step(4));
  await p.waitForFunction(() => DV.World.current.id === 'testing_center' && DV.Dialogue.active, null, { timeout: 30000 });
  const res = await ev(() => ({ r: DV.State.data.aptitude.result, node: QA.node() }));
  T.ok(res.r && res.r !== 'inconclusive', 'a single-faction result (' + res.r + ')');
  T.eq(res.node, 'results', 'Juno opens with your results');
  await ev(() => { for (let k = 0; k < 8 && DV.Dialogue.active; k++) { const v = DV.Dialogue.active.view; const en = v.choices.filter((c) => c.enabled); DV.Dialogue.choose((en.find((c) => !/record it as/i.test(c.label)) || en[0]).index); } });
  await p.waitForTimeout(1500);
  const fin = await ev(() => ({ q: QA.q('aptitude_day'), banner: !!document.getElementById('banner'), state: DV.Game.state, slip: DV.Inventory.has('result_slip') }));
  T.eq(fin.q, 'complete', 'Aptitude Day complete');
  T.ok(fin.banner && fin.state === 'banner', '"APTITUDE TEST COMPLETE" banner shows');
  await L.shot(p, 'main_banner');
  await p.waitForTimeout(1800); // the banner ignores keys for its first 1.5s
  await p.keyboard.press('Space');
  await p.waitForTimeout(800);
  T.eq(await ev(() => DV.Game.state), 'playing', 'free roam continues after the banner');
  T.ok(await ev(() => DV.Save.write('1').ok), 'saves after the test');
  T.noErrors(errs);
});
