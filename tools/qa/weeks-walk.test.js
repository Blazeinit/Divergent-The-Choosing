// The first weeks, walked for real (the week bot in build3-weeks uses the game's own hooks, so it never
// has to get to anything): at every step of every chapter, the player can WALK from where they start
// to every person, object and door the step puts in the zone, through real movement and collision.
const L = require('./lib.js');
const STEPS = {
  candor: ['case', 'evening', 'hearing'],
  erudite: ['lab', 'night', 'exam'],
  abnegation: ['run', 'night', 'reflect'], // (dinner is a pinned seat, by design)
  amity: ['listen', 'circle'],
};
L.run('the first weeks: every person and object in every step can be walked to', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  for (const f of Object.keys(STEPS)) {
    for (const step of STEPS[f]) {
      await p.evaluate(([f]) => {
        const b = DV.UI.root.querySelector('#banner'); if (b) b.remove(); DV.UI.modalOpen = null;
        const a = DV.State.data.aptitude; a.status = 'complete'; a.result = f; a.recordedAs = f; a.divergent = true;
        DV.State.data.story.week = null;
        DV.Build2.setFaction(f);
        DV.FirstWeek.begin(f);
      }, [f]);
      await L.until(p, () => DV.Chapter.active && DV.Game.state === 'playing', 40000);
      await p.evaluate(([f, step]) => {
        if (f === 'erudite' && step === 'night') DV.FirstWeek.note('office_key');
        DV.Chapter.load('week_' + f, { step, instant: true, noFadeIn: true, noTitle: true });
        QA.step(3);
      }, [f, step]);
      const res = await p.evaluate(() => {
        const z = DV.World.current, P = DV.Player, out = { zone: z.id, bad: [], ok: 0 };
        const access = (lock, door) => DV.Story.playerCanPass(lock, door);
        const home = [P.x, P.z];
        const val = (v) => (typeof v === 'function' ? v() : v);
        const walk = (tx, tz) => {
          const path = z.nav.findPath(P.x, P.z, tx, tz, access);
          if (!path || !path.length) return { fail: 'no path' };
          for (const [nx, nz] of path) {
            let t = 0, stuck = 0, last = [P.x, P.z];
            while (t < 14) {
              const dx = nx - P.x, dz = nz - P.z;
              if (Math.hypot(dx, dz) < 0.45) break;
              DV.Game.rig.yaw = Math.atan2(dx, dz);
              DV.Input.keys.KeyW = true; DV.Input.keys.ShiftLeft = true; QA.step(0.05); t += 0.05;
              if (Math.hypot(P.x - last[0], P.z - last[1]) < 0.004) { if (++stuck > 24) { DV.Input.keys.KeyW = false; DV.Input.keys.ShiftLeft = false; return { fail: 'stuck' }; } } else stuck = 0;
              last = [P.x, P.z];
            }
          }
          DV.Input.keys.KeyW = false; DV.Input.keys.ShiftLeft = false;
          return { ok: true };
        };
        const targets = [];
        for (const it of z.interactables) if (it.x !== undefined && it.kind !== 'pickup' && it.kind !== 'seat' && !it.hidden) targets.push([it.id || it.kind, it.x, it.z, it.radius || 1.4]);
        for (const it of DV.Interaction.extra) { if (it.cond && !it.cond()) continue; targets.push(['x:' + (it.id || it.kind), val(it.x), val(it.z), it.radius || 1.4]); }
        for (const d of z.def.doors || []) if (!d.lock) targets.push(['door:' + d.id, d.x, d.z, 1.6]);
        for (const [id, x, zz, rad] of targets) {
          // the target is often inside a table or a person: any spot within reach of it will do
          const tries = [[x, zz]];
          const rr = Math.min(rad * 0.85, 1.2);
          for (let k = 0; k < 8; k++) tries.push([x + Math.cos(k * 0.785) * rr, zz + Math.sin(k * 0.785) * rr]);
          let reached = false;
          for (const [tx, tz] of tries) {
            P.place(home[0], home[1], 0); QA.step(0.2);
            const r = walk(tx, tz);
            if (r.fail === 'no path') continue;
            if (Math.hypot(P.x - x, P.z - zz) <= Math.max(2.6, rad + 0.4)) { reached = true; break; }
          }
          if (reached) out.ok++; else out.bad.push(id);
        }
        return out;
      });
      T.ok(res.bad.length === 0 && res.ok > 0, f + ' · ' + step + ': all ' + res.ok + ' people, objects and doors in ' + res.zone + ' can be walked to', res);
    }
  }
  T.noErrors(errs);
});
