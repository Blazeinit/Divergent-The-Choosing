// Draw calls and triangles in the heaviest views (software rendering, so fps here is only a
// rough smoke number — the draw-call budget is what we gate on).
const L = require('./lib.js');
L.run('render budget', async (p, T, errs) => {
  await L.quickStart(p);
  const views = [['lobby (busiest)', 40, 57], ['waiting hall', 40, 30], ['testing room 4', 48.5, 14.5], ['break room', 74, 26]];
  for (const [label, x, z] of views) {
    const r = await p.evaluate(([x, z]) => new Promise((res) => { DV.Player.place(x, z, Math.PI); DV.Game.rig.yaw = Math.PI; setTimeout(() => { const i = DV.Game.renderer.info.render; res({ calls: i.calls, tris: i.triangles, fps: DV.Game.fps }); }, 1500); }), [x, z]);
    T.ok(r.calls < 230, label + ': ' + r.calls + ' draw calls, ' + Math.round(r.tris / 1000) + 'k tris (' + r.fps + ' fps in software GL)');
  }
  T.noErrors(errs);
});
