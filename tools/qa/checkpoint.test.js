// Reception → badge → security arch: the arm blocks until the badge is shown, NPCs show
// theirs at the arm, and ducking under it works only while the guard is busy.
const L = require('./lib.js');
L.run('security checkpoint & name badge', async (p, T, errs) => {
  const ev = (fn, a) => p.evaluate(fn, a);
  await L.quickStart(p, { strength: 4, agility: 7, intelligence: 6, perception: 6, charisma: 6, resolve: 6 });
  // the arm blocks a player without clearance
  await ev(() => { QA.tp(40, 42.3, Math.PI); DV.Game.rig.yaw = Math.PI; });
  await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW');
  const blocked = await ev(() => [DV.Player.z, DV.Checkpoint.light]);
  T.ok(blocked[0] > 41.1, 'the closed arm stops you (z ' + blocked[0].toFixed(2) + ')');
  T.eq(blocked[1], 'red', 'scanner lamp flashes red');
  T.eq(await ev(() => QA.talk('dean_walsh')), 'no_badge', 'no badge → Dean sends you to reception');
  T.ok(await ev(() => { QA.end(); return QA.checkIn(); }), 'Martha issues the name badge');
  T.ok(await ev(() => DV.Player.model.tagOn), 'the badge appears on your chest');
  const kade = await ev(() => { QA.talk('dean_walsh'); return QA.view(); });
  T.ok(/\[Show your name badge\]/.test(kade), 'Dean asks for the badge', kade);
  T.ok(await ev(() => { QA.seq(['show your name badge', 'arms out']); QA.end(); return !!DV.State.flag('security_cleared') && !!DV.State.flag('badge_shown'); }), 'showing it clears security');
  await ev(() => { QA.tp(40, 42.4, Math.PI); DV.Game.rig.yaw = Math.PI; });
  // hold W for 3 s of game time, stepped directly so a slow (software-GL, loaded) frame rate can't starve it
  await ev(() => { DV.Input.keys.KeyW = true; for (let i = 0; i < 60 && DV.Player.z >= 40.6; i++) QA.step(0.05); DV.Input.keys.KeyW = false; });
  const walk = await ev(() => [+DV.Player.z.toFixed(2), DV.NPCs.all.filter((n) => n.present && Math.hypot(n.x - DV.Player.x, n.z - DV.Player.z) < 1.5).map((n) => n.id + ':' + n.mode)]);
  T.ok(walk[0] < 40.8, 'the arm lifts and you walk through', walk);
  // NPCs at the arm (half an hour of game time, fast-forwarded)
  const gate = await ev(() => {
    const held = {}, crossed = {}, prevZ = {};
    const orig = DV.Checkpoint.holdTick.bind(DV.Checkpoint);
    DV.Checkpoint.holdTick = (n, dt) => { held[n.id] = 1; return orig(n, dt); };
    for (let k = 0; k < 5000; k++) { // ~20 minutes of game time from 08:00
      DV.Game.state = 'playing';
      DV.Game.update(0.05); DV.World.update(0.05, DV.Game.camera);
      DV.Player.place(28, 24, 0);
      for (const n of DV.NPCs.all) {
        if (!n.present) continue;
        if (prevZ[n.id] > 41 && n.z <= 41 && Math.abs(n.x - 40) < 3) crossed[n.id] = 1;
        prevZ[n.id] = n.z;
      }
    }
    DV.Checkpoint.holdTick = orig;
    return { crossed: Object.keys(crossed), unchecked: Object.keys(crossed).filter((id) => !held[id]) };
  });
  T.ok(gate.crossed.length >= 3, gate.crossed.length + ' NPCs came through the arch');
  T.ok(!gate.unchecked.length, 'every one of them stopped to show a badge or keycard', gate.unchecked);
  // ducking under: caught when the guard is watching
  await L.quickStart(p, { strength: 4, agility: 7, intelligence: 6, perception: 6, charisma: 6, resolve: 6 });
  const caught = await ev(() => { QA.checkIn(); DV.Checkpoint.current = null; QA.tp(40, 41.9); DV.Actions.duckBarrier(DV.Game, {}); const r = QA.pick('duck under it'); return [r, DV.State.flag('caught_ducking'), DV.State.npc('dean_walsh').rel, DV.Player.z]; });
  T.ok(caught[1] && caught[2] < 0 && caught[3] > 42, 'Dean catches you ducking while he watches (rel ' + caught[2] + ')', caught);
  const after = await ev(() => { QA.pick('show your name badge'); return 1; });
  try { await p.waitForFunction(() => DV.Dialogue.active && DV.Dialogue.active.node === 'cp_caught', null, { timeout: 4000 }); } catch (e) { /* asserted below */ }
  const ck = await ev(() => { const n = QA.node(); const who = DV.Dialogue.active && DV.Dialogue.active.npcId; QA.pick('sorry'); QA.end(); return [n, who, !!DV.State.flag('security_cleared')]; });
  T.ok(ck[0] === 'cp_caught' && ck[2], '…then checks your badge and lets you through', ck);
  void after;
  // ducking under while he's busy with someone else
  await L.quickStart(p, { strength: 4, agility: 7, intelligence: 6, perception: 6, charisma: 6, resolve: 6 });
  const duck = await ev(() => { QA.checkIn(); DV.Checkpoint.current = DV.NPCs.get('jenna_morales'); DV.Checkpoint.currentT = 0; QA.tp(40, 41.9); DV.Actions.duckBarrier(DV.Game, {}); QA.pick('duck under it'); QA.end(); return [DV.State.flag('ducked_barrier'), DV.State.flag('security_cleared'), DV.Player.z, QA.obj('aptitude_day', 'security')]; });
  T.ok(duck[0] && duck[1] && duck[2] < 41, 'unseen while the guard checks someone else [AGILITY 7]', duck);
  // low agility: option greyed, "try it anyway" fails
  await L.quickStart(p, { strength: 6, agility: 4, intelligence: 6, perception: 6, charisma: 6, resolve: 6 });
  const low = await ev(() => { QA.tp(40, 42.6); DV.Actions.duckBarrier(DV.Game, {}); return QA.view(); });
  T.ok(/Duck under it while nobody's looking\.\(x\)/.test(low), '[AGILITY 7] option greyed out at Agility 4');
  // the badge from the inventory, next to the guard
  const inv = await ev(() => { QA.end(); QA.checkIn(); QA.tp(40, 42.6); DV.Game.openRPGMenu('inventory'); const r = DV.Inventory.use('name_badge'); return [DV.Game.state, QA.node()]; });
  T.eq(inv, ['dialogue', 'cp_badge'], 'using the badge from the inventory at the arch shows it to Dean');
  T.noErrors(errs);
});
