// Build 2, after the ceremony: the Dauntless way in (catch the moving train, jump to the roof,
// step off the ledge into the net, the Pit) including the ways it goes wrong, and the arrival in
// each of the other four factions — each ending on the Build 2 banner, and a save made after it
// loading back into free roam rather than replaying the scene.
const L = require('./lib.js');
L.run('Build 2: getting into your faction', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const start = (id, f) => ev(([id, f]) => {
    const b = DV.UI.root.querySelector('#banner'); if (b) b.remove(); DV.UI.modalOpen = null;
    DV.State.data.player.upbringing = 'erudite';
    DV.Build2.setFaction(f);
    if (!DV.Quests.started('new_faction')) DV.Quests.start('new_faction');
    else DV.State.data.quests.new_faction.state = 'active';
    DV.Chapter.start(id, { instant: true });
  }, [id, f]);

  /* ---------- Dauntless: missing the train ---------- */
  await start('dauntless_run', 'dauntless');
  await L.until(p, () => DV.Chapter.id === 'dauntless_run' && DV.Game.state === 'playing');
  const miss = await ev(() => { let n = 0; while (!DV.Dialogue.isActive() && n++ < 2000) QA.step(0.05); return [DV.Chapter.flag('missed'), DV.Dialogue.active && DV.Dialogue.active.tree.id]; });
  T.ok(miss[0] && miss[1] === 'dauntless_missed', 'stand still and the train leaves without you', miss);
  await ev(() => QA.pick('try again'));
  T.ok(await L.until(p, () => DV.Chapter.id === 'dauntless_run' && !DV.Chapter.flag('missed') && DV.Chapter.trainX < 0), 'and the next one comes along');
  /* ---------- catching it ---------- */
  const run = await ev(() => {
    const C = DV.Chapter, P = DV.Player;
    let w = 0; while (w++ < 800 && C.trainX + C.train.userData.length / 2 < P.x + 2) QA.step(0.05);
    DV.Input.keys.KeyW = true; DV.Input.keys.ShiftLeft = true; DV.Game.rig.yaw = Math.PI / 2;
    let n = 0, armed = true;
    while (n++ < 900 && !C.boarded) {
      QA.step(0.05);
      P.z = Math.max(P.z, 2.0);
      const near = C.train.userData.doors.some((d) => Math.abs(C.trainX + d - P.x) < 0.3);
      if (near && armed) { DV.Input.pressed.Space = true; armed = false; } else if (!near) armed = true;
    }
    DV.Input.keys.KeyW = false; DV.Input.keys.ShiftLeft = false;
    return C.boarded;
  });
  T.ok(run, 'run alongside the train and jump in through an open door');
  T.ok(await L.until(p, () => DV.Chapter.id === 'dauntless_train' && DV.Game.state === 'playing'), 'riding the train with the other initiates');
  /* ---------- the roof: too early, then right ---------- */
  const early = await ev(() => { QA.step(2); const it = DV.Interaction.extra.find((i) => i.id === 'roof_jump'); it.onUse(DV.Game, it); return DV.Chapter.jumped; });
  T.ok(early, 'jumping before the roof arrives…');
  T.ok(await L.until(p, () => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'dauntless_fell'), '…is a fall between the buildings');
  await ev(() => QA.pick('try again'));
  T.ok(await L.until(p, () => DV.Chapter.id === 'dauntless_train' && DV.Game.state === 'playing' && !DV.Chapter.jumped && DV.Chapter.rideT < 1), 'and you get another go');
  const roof = await ev(() => {
    const C = DV.Chapter, z = DV.World.current;
    let n = 0;
    while (n++ < 1200 && !C.jumped) { QA.step(0.05); const [x0, x1] = C.script.roofSpan(z); if (x0 < 5.5 && x1 > 8.7) { const it = DV.Interaction.extra.find((i) => i.id === 'roof_jump'); it.onUse(DV.Game, it); } }
    return C.jumped && !C.flag('lost');
  });
  T.ok(roof, 'jump when the roof is alongside');
  T.ok(await L.until(p, () => DV.Chapter.id === 'dauntless_roof' && DV.Game.state === 'playing' && DV.Chapter.flag('open'), 60000), 'on the roof: "Who\'s first?"');
  /* ---------- first jumper ---------- */
  const ledge = await ev(() => { const it = DV.Interaction.extra.find((i) => i.id === 'ledge'); const label = it.label(); it.onUse(DV.Game, it); return label; });
  T.eq(ledge, 'Jump first', 'nobody moves — you step up first');
  T.ok(await L.until(p, () => DV.Chapter.id === 'dauntless_pit' && DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'dauntless_name'), 'down into the dark, the net, a hand: "What\'s your name?"');
  const name = await ev(() => { QA.pick('just'); QA.step(1); return [DV.State.data.story.dauntlessName, !!DV.State.flag('first_jumper')]; });
  T.ok(name[0] === 'T' && name[1], 'first jumper — and you go by "' + name[0] + '" now');
  await ev(() => { DV.Player.place(30, 9, 0.3); });
  T.ok(await L.until(p, () => !!document.getElementById('banner'), 60000), 'the Pit, the chasm, Mark\'s welcome — WELCOME TO DAUNTLESS');
  T.eq(await ev(() => DV.Quests.q('new_faction').state), 'complete', 'Build 2 complete (Dauntless)');

  /* ---------- the other four ---------- */
  const tasks = {
    abnegation: () => { QA.step(14); for (let i = 0; i < 3; i++) { const c = DV.Interaction.extra.find((x) => x.id === 'bread_crate'); c.onUse(DV.Game, c); const g = DV.Interaction.extra.find((x) => x.id === 'give' + i); g.onUse(DV.Game, g); } },
    erudite: () => { const it = DV.Interaction.extra.find((x) => x.id === 'park_talk'); it.onUse(DV.Game, it); QA.pick('eighty from the hub.'); QA.end(); },
    candor: () => { const it = DV.Interaction.extra.find((x) => x.id === 'circle'); it.onUse(DV.Game, it); ['no.', '', 'private', '', 'honestly', ''].forEach((x) => QA.pick(x)); },
    amity: () => { for (const id of ['apple_tree', 'share_mary', 'fire_sit']) { const it = DV.Interaction.extra.find((x) => x.id === id); it.onUse(DV.Game, it); } },
  };
  for (const f of ['abnegation', 'erudite', 'candor', 'amity']) {
    await start('arrival_' + f, f);
    await L.until(p, () => DV.Chapter.id && DV.Chapter.id.indexOf('arrival_') === 0 && DV.Game.state === 'playing');
    await ev((src) => (0, eval)('(' + src + ')')(), tasks[f].toString());
    const ok = await L.until(p, () => !!document.getElementById('banner') && DV.Quests.q('new_faction').state === 'complete', 60000);
    const step = await ev(() => DV.Chapter.step);
    T.ok(ok && step === 'done', DV_name(f) + ': arrival, welcome, banner');
    // a save after the welcome loads as free roam
    await ev(() => { const b = DV.UI.root.querySelector('#banner'); if (b) b.remove(); DV.UI.modalOpen = null; DV.Game.state = 'playing'; DV.Save.write('4'); DV.Game.loadSlot('4'); });
    await L.until(p, () => DV.Chapter.active && DV.Game.state === 'playing');
    const re = await ev(() => ({ id: DV.Chapter.id, step: DV.Chapter.step, tasks: DV.Interaction.extra.length, seqs: DV.Chapter.seqs.length, banner: !!document.getElementById('banner') }));
    T.ok(re.id === 'arrival_' + f && re.step === 'done' && re.tasks === 0 && re.seqs === 0 && !re.banner, DV_name(f) + ': loading that save puts you back there, free to look around', re);
  }
  T.noErrors(errs);
});
function DV_name(f) { return f.charAt(0).toUpperCase() + f.slice(1); }
