// A whole day of NPC schedules (08:00–17:30), fast-forwarded twice — from a quiet room and
// from the busy lobby: no stuck walkers, no teleports, no unreachable spots, no shared seats.
const L = require('./lib.js');
L.run('NPC schedules over a full day', async (p, T, errs) => {
  for (const [label, px, pz] of [['player in a sealed room', 41.5, 11], ['player in the lobby', 36, 56]]) {
    await L.quickStart(p);
    const r = await p.evaluate(async ([px, pz]) => {
      DV.State.setFlag('security_cleared'); DV.State.setFlag('checked_in'); DV.State.setFlag('checkin_time', 480);
      const track = {}, issues = [], jumps = [];
      DV.NPCAI.noPath = 0;
      const until = DV.U.parseTime('17:30');
      while (DV.Clock.minutes() < until && DV.Clock.minutes() > 400) {
        for (let i = 0; i < 100; i++) {
          DV.Game.state = 'playing';
          if (DV.Dialogue.active) DV.Dialogue.end();
          const before = DV.NPCs.all.map((n) => [n.x, n.z, n.mode]);
          DV.Game.update(0.05); DV.World.update(0.05, DV.Game.camera);
          DV.NPCs.all.forEach((n, k) => {
            const d = Math.hypot(n.x - before[k][0], n.z - before[k][1]);
            if (d > 2.5 && n.present && before[k][2] === 'walking' && n.mode !== 'absent') jumps.push(DV.Clock.str() + ' ' + n.id + ' ' + d.toFixed(1) + 'm');
          });
          DV.Player.place(px, pz, 0);
        }
        const zone = DV.World.current;
        for (const n of DV.NPCs.all) {
          if (!n.present) continue;
          const t = track[n.id] || (track[n.id] = { x: n.x, z: n.z, still: 0, bs: 0, out: 0 });
          const moved = Math.hypot(n.x - t.x, n.z - t.z);
          t.still = n.mode === 'walking' && moved < 0.05 && !n.gateHold ? t.still + 1 : 0;
          if (t.still === 6) issues.push(DV.Clock.str() + ' stuck walking ' + n.id);
          t.bs = n.mode === 'blockedSpot' ? t.bs + 1 : 0;
          if (t.bs === 24) issues.push(DV.Clock.str() + ' waited 10+ min for a spot: ' + n.id);
          t.out = zone.roomAt(n.x, n.z) ? 0 : t.out + 1;
          if (t.out === 3) issues.push(DV.Clock.str() + ' outside the building: ' + n.id);
          t.x = n.x; t.z = n.z;
        }
        await new Promise((r) => setTimeout(r, 0));
      }
      const seats = {}, dup = [];
      for (const n of DV.NPCs.all) if (n.present && n.mode === 'acting' && ['sit', 'work', 'type', 'recline'].includes(n.action)) { const k = n.x.toFixed(1) + ',' + n.z.toFixed(1); if (seats[k]) dup.push(seats[k] + '+' + n.id); seats[k] = n.id; }
      return { issues, jumps: jumps.slice(0, 10), noPath: DV.NPCAI.noPath, dup, t: DV.Clock.str() };
    }, [px, pz]);
    T.log(label + ': simulated to ' + r.t);
    T.ok(!r.issues.length, label + ': nobody stuck or lost', r.issues.slice(0, 10));
    T.ok(!r.jumps.length, label + ': no walkers teleported', r.jumps);
    T.eq(r.noPath, 0, label + ': every walk found a path');
    T.ok(!r.dup.length, label + ': no two NPCs in one seat', r.dup);
  }
  T.noErrors(errs);
});
