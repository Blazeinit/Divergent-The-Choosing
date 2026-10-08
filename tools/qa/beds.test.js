// Everyone sleeps the right way round: in the Dauntless dormitory at two in the morning every initiate is
// lying along their bunk, head at the pillow end, and stays that way (talked to, or after a while).
const L = require('./lib.js');
L.run('beds: sleepers lie along the bed, head to the pillow', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  await p.evaluate(() => {
    DV.State.data.player.upbringing = 'erudite'; DV.State.setFlag('daniel_tested');
    DV.Build2.setFaction('dauntless'); DV.Build2.dressFor('dauntless');
    DV.State.data.story.dauntlessName = 'Tess';
    DV.State.data.world.day = 3; DV.State.data.world.time = DV.U.parseTime('02:00');
    DV.District.enter('dauntless', { spawn: [-1, -9, 0], instant: true });
  });
  await L.until(p, () => DV.World.current && DV.World.current.id === 'd_compound' && DV.Game.state === 'playing', 40000);
  const probe = () => p.evaluate(() => {
    DV.Player.place(-1, -9, 0);
    QA.step(4, [-1, -9]);
    const out = { n: 0, bad: [] };
    for (const n of DV.NPCs.all) {
      if (!n.present || !n.model || n.action !== 'lie' || !n.spot) continue;
      n.model.root.updateMatrixWorld(true);
      const head = n.model.boneWorld('head'), hips = n.model.boneWorld('hips');
      const dx = head.x - hips.x, dz = head.z - hips.z, len = Math.hypot(dx, dz) || 1;
      const ex = -Math.sin(n.spot.rot), ez = -Math.cos(n.spot.rot);
      const cos = (dx * ex + dz * ez) / len;
      out.n++;
      if (cos < 0.93) out.bad.push([n.id, n.spot.id, +cos.toFixed(2)]);
    }
    return out;
  });
  await p.evaluate(() => { DV.NPCAI.syncAll(); QA.step(20, [-1, -9]); });
  const a = await probe();
  T.ok(a.n >= 10 && a.bad.length === 0, a.n + ' initiates asleep, every one along the bunk with the head at the pillow end', a);
  // talk to one: they don't turn over to face you
  const b = await p.evaluate(() => {
    const n = DV.NPCs.all.find((x) => x.present && x.action === 'lie');
    const r0 = n.rot; DV.Player.place(n.x + 0.9, n.z + 0.6, 0); DV.Game.talkTo(n, true); QA.step(2); QA.end();
    return { id: n.id, r0, r1: n.rot };
  });
  T.ok(Math.abs(b.r1 - b.r0) < 0.05, 'woken to talk, a sleeper stays lying the way the bed lies', b);
  await p.evaluate(() => QA.step(30, [-1, -9]));
  const c = await probe();
  T.ok(c.bad.length === 0, 'and half a minute later still nobody is sideways', c);
  T.noErrors(errs);
});
