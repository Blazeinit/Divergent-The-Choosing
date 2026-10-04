// A player who does nothing in the simulations still gets through: the dog lunges,
// the water rises to the drowning scene, and refusing to sit still starts the trial.
const L = require('./lib.js');
L.run('simulations with an idle player', async (p, T, errs) => {
  await L.quickStart(p, { strength: 5, agility: 5, intelligence: 5, perception: 5, charisma: 5, resolve: 4 });
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => DV.Game.beginAptitudeTest());
  await p.waitForFunction(() => DV.World.current.id === 'sim_platform' && DV.Game.state === 'playing', null, { timeout: 20000 });
  let dog = null;
  for (let i = 0; i < 40 && !dog; i++) { await ev(() => QA.step(5)); dog = await ev(() => (DV.Sim.dog && DV.Sim.dog.mode === 'lunge') || DV.World.current.id !== 'sim_platform' ? 'lunge' : null); }
  T.eq(dog, 'lunge', 'I: ignored, the dog eventually lunges');
  await ev(() => QA.step(7));
  await p.waitForFunction(() => DV.World.current.id === 'sim_flood' && DV.Game.state === 'playing', null, { timeout: 30000 });
  let drown = null;
  for (let i = 0; i < 40 && !drown; i++) { await ev(() => QA.step(5)); drown = await ev(() => (DV.Dialogue.active && DV.Dialogue.active.tree === DV.DialogueDB.get('sim2_drown')) ? 'drown' : null); }
  T.eq(drown, 'drown', 'II: the water closes over your head');
  T.ok(await ev(() => /^ok/.test(QA.pick('panic'))), 'II: panic ends the scenario');
  await ev(() => QA.step(4));
  await p.waitForFunction(() => DV.World.current.id === 'sim_tribunal' && DV.Game.state === 'playing', null, { timeout: 30000 });
  let trial = null;
  for (let i = 0; i < 20 && !trial; i++) { await ev(() => QA.step(2)); await p.waitForTimeout(100); trial = await ev(() => QA.node()); }
  T.eq(trial, 'q1', 'III: refusing to sit, the trial starts anyway');
  T.ok(await ev(() => DV.State.data.aptitude.choices.some((c) => /refused to sit/.test(c.label || c))), 'III: refusing to sit was recorded');
  await ev(() => { for (let k = 0; k < 8 && DV.Dialogue.active; k++) { const v = DV.Dialogue.active.view; const en = v.choices.filter((c) => c.enabled); DV.Dialogue.choose(en[en.length - 1].index); } });
  await p.waitForFunction(() => DV.World.current.id === 'testing_center', null, { timeout: 30000 });
  T.ok(await ev(() => !!DV.State.data.aptitude.result), 'back in Room 4 with a computed result');
  T.noErrors(errs);
});
