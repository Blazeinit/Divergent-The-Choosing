// Random walk through every NPC's dialogue tree (30 runs each) looking for exceptions and dead ends.
const L = require('./lib.js');
L.run('dialogue fuzz (all NPCs)', async (p, T, errs) => {
  await L.quickStart(p);
  const r = await p.evaluate(() => {
    const rep = { errors: [], nodes: 0, npcs: 0 };
    const origErr = console.error;
    const logged = [];
    console.error = function () { logged.push([].slice.call(arguments).join(' ')); origErr.apply(console, arguments); };
    for (const d of DV.NPCData.list) {
      const seen = new Set();
      for (let run = 0; run < 30; run++) {
        try {
          if (!DV.Dialogue.start(d.id)) { rep.errors.push('cannot start ' + d.id); break; }
          for (let k = 0; k < 14 && DV.Dialogue.active; k++) {
            const v = DV.Dialogue.active.view;
            seen.add(v.nodeId);
            const en = v.choices.filter((c) => c.enabled);
            if (!en.length) { rep.errors.push('dead end ' + d.id + ':' + v.nodeId); break; }
            const nonEnd = en.filter((c) => !(c.raw && c.raw.end));
            const pool = nonEnd.length && Math.random() < 0.85 ? nonEnd : en;
            DV.Dialogue.choose(pool[Math.floor(Math.random() * pool.length)].index);
          }
          if (DV.Dialogue.active) DV.Dialogue.end();
        } catch (e) { rep.errors.push(d.id + ' threw ' + e.message); if (DV.Dialogue.active) DV.Dialogue.end(); }
      }
      rep.nodes += seen.size;
      rep.npcs++;
    }
    console.error = origErr;
    rep.logged = logged.slice(0, 10);
    return rep;
  });
  T.ok(!r.errors.length, 'no exceptions or dead ends across ' + r.npcs + ' NPCs (' + r.nodes + ' nodes visited)', r.errors.slice(0, 10));
  T.ok(!r.logged.length, 'no missing-node errors', r.logged);
  T.noErrors(errs, [/missing node/]);
});
