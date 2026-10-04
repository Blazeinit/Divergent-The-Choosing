// The divergent path: awareness choices in all three simulations → INCONCLUSIVE,
// Juno's warning, the manual record, the result slip, the character sheet.
const L = require('./lib.js');
L.run('divergent path', async (p, T, errs) => {
  await L.quickStart(p, { strength: 4, agility: 5, intelligence: 6, perception: 8, charisma: 5, resolve: 8 });
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => { QA.checkIn(); QA.clearSecurity(); DV.Game.beginAptitudeTest(); });
  await p.waitForFunction(() => DV.World.current.id === 'sim_platform' && DV.Game.state === 'playing', null, { timeout: 20000 });
  await ev(() => { QA.tp(30, 4.4); DV.Sim.scene('sim1_table'); QA.pick('why should i'); QA.pick('...'); QA.tp(34, 8); DV.Sim.scene('sim1_clock'); QA.pick('none of this'); QA.pick('...'); });
  await ev(() => QA.step(6));
  T.ok(await ev(() => /^ok/.test((() => { const d = DV.Sim.dog; QA.tp(d.x + 2, d.z); DV.Sim.scene('sim1_dog'); return QA.pick("isn't real"); })())), 'I: tell the dog it isn\'t real [RESOLVE 7]');
  await ev(() => QA.step(7)); // run the scenario's game-time timers (software GL can be slow)
  await p.waitForFunction(() => DV.World.current.id === 'sim_flood' && DV.Game.state === 'playing', null, { timeout: 30000 });
  await ev(() => { DV.Sim.level = 1.1; });
  await ev(() => QA.step(0.3));
  T.ok(await ev(() => { const it = DV.Interaction.extra.find((x) => x.id === 'f_aware'); it.onUse(); return /^ok/.test(QA.pick('close your eyes')); }), 'II: steady yourself, none of this is real');
  await ev(() => QA.step(8));
  await p.waitForFunction(() => DV.World.current.id === 'sim_tribunal' && DV.Game.state === 'playing', null, { timeout: 30000 });
  await ev(() => { QA.tp(2, 10); DV.Sim.scene('sim3_mirror'); QA.pick('touch the glass'); QA.pick('...'); });
  T.ok(await ev(() => DV.Sim.flag('doorOpen')), 'III: the mirror opens a door that shouldn\'t exist');
  await ev(() => { QA.tp(10, 19.3); QA.step(4); });
  await p.waitForFunction(() => DV.World.current.id === 'testing_center' && DV.Dialogue.active, null, { timeout: 30000 });
  const a = await ev(() => ({ r: DV.State.data.aptitude.result, rs: DV.State.data.aptitude.results, div: DV.State.data.aptitude.divergence }));
  T.eq(a.r, 'inconclusive', 'result is INCONCLUSIVE (divergence ' + a.div + ', ' + a.rs.join('/') + ')');
  const path = await ev(() => {
    const seen = [];
    let recorded = false;
    for (let k = 0; k < 12 && DV.Dialogue.active; k++) {
      const v = DV.Dialogue.active.view;
      seen.push(v.nodeId);
      const en = v.choices.filter((c) => c.enabled);
      let ch = null;
      if (v.nodeId === 'd_record' && !recorded) { recorded = true; ch = en.find((c) => /record it as/i.test(c.label)); }
      else if (v.nodeId === 'd_record') ch = en.find((c) => /okay/i.test(c.label));
      ch = ch || en.find((c) => !/record it as/i.test(c.label)) || en[0];
      DV.Dialogue.choose(ch.index);
    }
    return seen;
  });
  T.ok(['d1', 'd2', 'd_record', 'd_final'].every((n) => path.includes(n)), 'Juno: inconclusive → "Divergent" warning → manual record → farewell', path);
  await p.waitForTimeout(1200);
  const s = await ev(() => ({ div: DV.State.data.aptitude.divergent, rec: DV.State.data.aptitude.recordedAs, slip: DV.Inventory.has('result_slip'), q: QA.q('aptitude_day'), faction: DV.State.data.player.faction }));
  T.ok(s.div, 'marked divergent (hidden)');
  T.ok(!!s.rec && s.rec !== 'inconclusive', 'officially recorded as ' + s.rec);
  T.ok(s.slip, 'result slip in the inventory');
  T.eq(s.q, 'complete', 'Aptitude Day complete');
  T.eq(s.faction, null, 'current faction is still UNDECIDED');
  await p.waitForFunction(() => DV.Game.state === 'banner', null, { timeout: 10000 });
  await p.waitForTimeout(1800); // the banner ignores keys for its first 1.5s
  await p.keyboard.press('Space');
  await p.waitForFunction(() => DV.Game.state === 'playing', null, { timeout: 10000 });
  await ev(() => DV.Game.openRPGMenu('character'));
  await p.waitForTimeout(400);
  const sheet = await ev(() => document.querySelector('#rpgmenu').innerText);
  T.log(sheet.replace(/\n/g, ' | ').slice(0, 300));
  T.ok(/INCONCLUSIVE — recorded as/i.test(sheet), 'character sheet: "INCONCLUSIVE — recorded as …"');
  T.ok(/CANDIDATE NO\.\s*4-17/i.test(sheet), 'character sheet shows the candidate number');
  T.noErrors(errs);
});
