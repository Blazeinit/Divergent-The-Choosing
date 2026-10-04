// The reception line: candidates arrive in waves, queue on slots, step up as the line moves,
// get a badge pressed and handed over by the clerk, and only then head for the security arch.
const L = require('./lib.js');
L.run('reception line & name badges', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const start = await ev(() => DV.Reception.line.map((n) => ({ id: n.id, x: n.x, z: n.z, badge: !!n.badgeOn, mode: n.mode })));
  T.ok(start.length >= 3, start.length + ' candidates already waiting in line at 08:00');
  T.ok(start.every((n) => !n.badge && n.mode === 'queued'), 'nobody in line has a badge yet');
  const gaps = start.slice(1).map((n, i) => Math.hypot(n.x - start[i].x, n.z - start[i].z));
  T.ok(gaps.every((g) => g > 0.9 && g < 1.2), 'they stand one behind another (' + gaps.map((g) => g.toFixed(2)).join(', ') + ' m)');
  // the player pushing in gets a comment from the line
  const cut = await ev(() => { const before = DV.Reception.line.map((n) => n.bark && n.bark.text).join('|'); QA.talk('martha_bell'); QA.end(); return DV.Reception.line.some((n) => n.bark && /line|first/i.test(n.bark.text)); });
  T.ok(cut, 'cutting in at the desk gets a "there\'s a line" from someone waiting');
  // fast-forward half an hour of the morning
  const r = await ev(() => {
    const out = { overlaps: [], noBadgeAtArch: [], maxLine: 0, poses: { clerkBadge: 0, candBadge: 0 }, stepUps: 0 };
    const orig = DV.Checkpoint.holdTick.bind(DV.Checkpoint);
    DV.Checkpoint.holdTick = (n, dt) => { if (n.def.role === 'candidate' && !n.badgeOn && out.noBadgeAtArch.indexOf(n.id) < 0) out.noBadgeAtArch.push(n.id); return orig(n, dt); };
    const slotOf = {};
    for (let k = 0; k < 7200; k++) {
      DV.Game.state = 'playing';
      DV.Game.update(0.05); DV.World.update(0.05, DV.Game.camera);
      DV.Player.place(30, 24, 0);
      const line = DV.Reception.line;
      out.maxLine = Math.max(out.maxLine, line.length);
      for (const n of line) { if (slotOf[n.id] !== undefined && n.lineSlot < slotOf[n.id]) out.stepUps++; slotOf[n.id] = n.lineSlot; }
      const m = DV.NPCs.get('martha_bell');
      if (m.poseOverride === 'badge') out.poses.clerkBadge++;
      if (DV.Reception.serving && DV.Reception.serving.poseOverride === 'badge') out.poses.candBadge++;
      if (k % 100 === 0) {
        const q = line.filter((n) => n.mode === 'queued');
        for (let a = 0; a < q.length; a++) for (let b = a + 1; b < q.length; b++) if (Math.hypot(q[a].x - q[b].x, q[a].z - q[b].z) < 0.6) out.overlaps.push(DV.Clock.str() + ' ' + q[a].id + '/' + q[b].id);
      }
    }
    DV.Checkpoint.holdTick = orig;
    out.served = DV.Reception.log;
    out.t = DV.Clock.str();
    const past = DV.NPCs.all.filter((n) => n.def.role === 'candidate' && n.present && !n.inLine);
    out.candidatesBadged = past.filter((n) => n.badgeOn).length;
    out.candidatesPresent = past.length;
    out.stillInLine = DV.Reception.line.length;
    return out;
  });
  T.log('simulated to ' + r.t + '; longest line ' + r.maxLine + '; served ' + r.served.length + ' (' + r.served.map((s) => s.id.split('_')[0] + '@' + s.t).join(', ') + ')');
  T.ok(r.served.length >= 10, 'the clerk served ' + r.served.length + ' people');
  T.ok(r.served.filter((s) => !/gideon/.test(s.id)).every((s) => s.badge), 'every candidate served walked away with a badge');
  T.ok(r.stepUps > 5, 'the line shuffles forward as people are served (' + r.stepUps + ' step-ups)');
  T.ok(r.poses.clerkBadge > 0 && r.poses.candBadge > 0, 'the badge is visibly handed over (clerk and candidate reach out)');
  T.ok(!r.overlaps.length, 'nobody stands inside anybody else in line', r.overlaps.slice(0, 5));
  T.ok(!r.noBadgeAtArch.length, 'no candidate reaches the security arch without a badge', r.noBadgeAtArch);
  T.eq(r.candidatesBadged, r.candidatesPresent, 'every candidate past the desk is wearing a badge at ' + r.t + ' (' + r.stillInLine + ' still in line)');
  T.noErrors(errs);
});
