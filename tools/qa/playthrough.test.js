// Played the way a person plays it: no teleports, no reaching into the story's state. The player
// walks (WASD along a nav path, colliding with everything), presses E, and reads dialogue at a
// human pace (a second or more per line, with real time passing between choices). This is the
// suite that catches what fast-forwarded tests can't:
//   - Claire's results talk read slowly: the completion banner must wait for the talk to end, and
//     the camera must come back afterwards (it used to stay stuck in the conversation framing);
//   - out of the Testing Center on foot, through the front gate, to the bus;
//   - the Choosing Ceremony for each of the five factions: hurry the names, walk to the knife,
//     walk to a bowl, choose, walk over to your new faction (through the crowd of initiates, who
//     used to block you short of your place so the ceremony waited forever), and leave with them.
const L = require('./lib.js');
L.run('playthrough: walked and read like a player', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => {
    // walk to (x, z) along the nav path with the movement keys; stops if the game takes the controls
    window.walkTo = (x, z, maxSteps) => {
      const P = DV.Player, zone = DV.World.current;
      // (standing up out of a chair can leave you on a cell the nav grid calls blocked: start from the nearest open one)
      const from = zone.nav.nearestWalkable(P.x, P.z, 2) || [P.x, P.z];
      const path = zone.nav.findPath(from[0], from[1], x, z, (lock, door) => DV.Story.playerCanPass(lock, door)) || [[x, z]];
      if (Math.hypot(from[0] - P.x, from[1] - P.z) > 0.05) path.unshift([from[0], from[1]]);
      const pts = path.map((q) => (Array.isArray(q) ? q : [q.x, q.z]));
      let n = 0, stuck = 0, last = [P.x, P.z];
      for (const [tx, tz] of pts) {
        while (n++ < (maxSteps || 2400)) {
          const dx = tx - P.x, dz = tz - P.z;
          if (Math.hypot(dx, dz) < 0.3) break;
          DV.Game.rig.yaw = Math.atan2(dx, dz);
          DV.Input.keys.KeyW = true; QA.step(0.05);
          if (DV.Game.state !== 'playing') break;
          if (Math.hypot(P.x - last[0], P.z - last[1]) < 0.004) {
            // somebody in the way (a candidate at the arch, a guard in a doorway): wait a moment, like a person would
            if (++stuck % 30 === 0) { DV.Input.keys.KeyW = false; QA.step(1.5); }
            if (stuck > 300) break;
          } else stuck = 0;
          last = [P.x, P.z];
        }
        if (stuck > 300 || DV.Game.state !== 'playing') break;
      }
      DV.Input.keys.KeyW = false;
      return { at: [+P.x.toFixed(2), +P.z.toFixed(2)], d: +Math.hypot(P.x - x, P.z - z).toFixed(2), stuck: stuck > 300, gs: DV.Game.state };
    };
    window.pressE = () => { DV.Interaction.update(DV.World.current, DV.Player); const it = DV.Interaction.current; DV.Input.pressed.KeyE = true; QA.step(0.05); return it ? it.id : null; };
  });

  /* ---------- Claire's results, read slowly ---------- */
  await ev(() => {
    const a = DV.State.data.aptitude; a.status = 'complete'; a.result = 'erudite'; a.recordedAs = 'erudite';
    DV.State.setFlag('tr4_open');
    DV.State.setFlag('security_cleared'); DV.Inventory.add('name_badge', 1, true); // (checked in and through the arch this morning)
    const chair = DV.World.current.spot('tr4_chair');
    DV.Player.place(chair.x, chair.z, chair.rot); DV.Game.sitOn(chair, true);
    DV.NPCAI.syncAll();
    DV.Game.talkTo(DV.NPCs.get('claire_dawson'), true);
  });
  for (let k = 0; k < 8; k++) {
    const more = await ev(() => { if (!DV.Dialogue.active) return false; const v = DV.Dialogue.active.view; const en = v.choices.filter((c) => c.enabled); DV.Dialogue.choose((en.find((c) => !/record it as/i.test(c.label)) || en[0]).index); return true; });
    if (!more) break;
    await p.waitForTimeout(1300); // reading
  }
  T.ok(await L.until(p, () => !!document.getElementById('banner'), 8000), 'APTITUDE TEST COMPLETE appears — after the conversation, not over it');
  await p.waitForTimeout(1700); await p.keyboard.press('Space'); await p.waitForTimeout(700);
  const cam = await ev(() => { const r = DV.Game.rig; const y0 = r.yaw; DV.Input.mouseDX += 240; QA.step(0.1); return { st: DV.Game.state, mode: r.mode, turned: Math.abs(r.yaw - y0) > 0.05 }; });
  T.ok(cam.st === 'playing' && cam.mode === 'follow' && cam.turned, 'the camera is yours again: behind you, turning with the mouse', cam);

  /* ---------- out through the gate to the bus ---------- */
  await ev(() => { if (DV.Player.state === 'sitting') DV.Player.standUp(); });
  const gate = await ev(() => walkTo(45.6, 78.6, 6000));
  T.ok(gate.d < 0.6 && !gate.stuck, 'walked from Testing Room 4 out through the front gate to the bus stop', gate);
  T.eq(await ev(() => pressE()), 'bus_home', 'the bus: "Ride home"');
  await ev(() => QA.end());

  /* ---------- the Choosing Ceremony, five times ---------- */
  for (const f of ['dauntless', 'abnegation', 'amity', 'candor', 'erudite']) {
    await ev(() => {
      DV.State.setFlag('results_discussed');
      if (!DV.Quests.started('the_choosing')) DV.Build2.beginGoingHome();
      else DV.State.data.quests.the_choosing.state = 'active';
      DV.Chapter.start('ceremony', { instant: true });
    });
    await L.until(p, () => DV.Chapter.active && DV.Chapter.id === 'ceremony' && DV.Game.state !== 'transition', 40000);
    const turn = await ev(() => { let n = 0; while (!DV.Chapter.myTurn && n++ < 20000) { DV.Input.keys.Space = true; QA.step(0.05); } DV.Input.keys.Space = false; QA.step(2); return DV.Chapter.myTurn && DV.Game.state === 'playing' && !DV.Player.pinned; });
    T.ok(turn, f + ': hold Space through the names — then yours, and you can move');
    const knife = await ev(() => { walkTo(23, 13.55); return pressE(); });
    await ev(() => { let n = 0; while (DV.Game.state !== 'playing' && n++ < 400) QA.step(0.05); });
    const bowl = await ev((f) => { walkTo(DV.Hub.BOWLS[f], 13.35); return pressE(); }, f);
    T.ok(knife === 'cer_knife' && bowl === 'cer_bowl_' + f, f + ': walk to the knife, then to the bowl', [knife, bowl]);
    await ev(() => { QA.pick('let your blood'); QA.step(0.3); let n = 0; while (DV.Game.state !== 'playing' && n++ < 1000) QA.step(0.05); });
    // walk over to your faction; the crowd stops you short, and that has to be enough
    const join = await ev(() => { const s = DV.Chapter.mySpot; const r = walkTo(s.x, s.z); let n = 0; while (!DV.Chapter.flag('placed') && n++ < 400) QA.step(0.05); return { walk: r, placed: DV.Chapter.flag('placed'), faction: DV.State.data.player.faction }; });
    T.ok(join.placed && join.faction === f, f + ': walk over to your new faction and you take your place among them (got to ' + join.walk.d + ' m)', join);
    const fin = await ev(() => { let n = 0; while (!DV.Chapter.flag('finale') && n++ < 20000) { DV.Input.keys.Space = true; QA.step(0.05); } DV.Input.keys.Space = false; QA.step(7); return DV.Chapter.flag('finale') && !DV.Player.pinned && DV.Game.state === 'playing'; });
    T.ok(fin, f + ': the last names, the finale, and the factions file out');
    const out = await ev(() => { walkTo(23, 34.0); return pressE(); });
    T.eq(out, 'cer_leave', f + ': out through the doors with them');
    T.ok(await L.until(p, () => DV.Chapter.id !== 'ceremony' && DV.Game.state === 'playing', 30000), f + ': …into ' + (f === 'dauntless' ? 'the run for the train' : 'the arrival'));
    await ev(() => { QA.end(); const b = document.getElementById('banner'); if (b) b.remove(); DV.UI.modalOpen = null; });
  }
  T.noErrors(errs);
});
