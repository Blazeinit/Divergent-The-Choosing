// The Chalk Year, walked for real: in every episode the player can walk from where they start to every
// person and object (and the person to speak to at the end), through real movement and collision.
const L = require('./lib.js');
const EPS = ['camp_d1', 'camp_d2', 'camp_c1', 'camp_c2', 'camp_e1', 'camp_e2', 'camp_a1', 'camp_a2', 'camp_m1', 'camp_m2', 'camp_x1', 'camp_x2', 'camp_x3', 'camp_z1'];
L.run('the campaign: everything in every episode can be walked to', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  for (const id of EPS) {
    await p.evaluate((id) => {
      const b = DV.UI.root.querySelector('#banner'); if (b) b.remove(); DV.UI.modalOpen = null;
      const a = DV.State.data.aptitude; a.status = 'complete'; a.result = 'candor'; a.recordedAs = 'candor'; a.divergent = true;
      DV.State.data.story.campaign = null; DV.Build2.setFaction('candor'); DV.Campaign.begin('candor');
      for (const k of Object.keys(DV.Campaign.ALLIES)) DV.Campaign.st().trust[k] = 3;
      DV.Chapter.start(id, { instant: true, noFadeIn: true, noTitle: true });
      QA.step(3);
    }, id);
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
        for (const it of DV.Interaction.extra) { if (it.id !== 'camp_finale' && it.cond && !it.cond()) continue; targets.push([it.id, val(it.x), val(it.z), it.radius || 1.4]); }
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
      T.ok(res.bad.length === 0 && res.ok > 0, id + ': all ' + res.ok + ' people, things and the finale in ' + res.zone + ' can be walked to', res);
    }
    T.noErrors(errs);
  });
