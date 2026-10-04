// Draw calls and triangles in the heaviest views (software rendering, so fps here is only a
// rough smoke number — the draw-call budget is what we gate on).
const L = require('./lib.js');
L.run('render budget', async (p, T, errs) => {
  await L.quickStart(p);
  const views = [['lobby (busiest)', 40, 57, Math.PI], ['waiting hall', 40, 30, Math.PI], ['testing room 4', 48.5, 14.5, Math.PI], ['break room', 74, 26, Math.PI], ['front plaza, looking at the city', 40, 70, 0]];
  for (const [label, x, z, yaw] of views) {
    const r = await p.evaluate(([x, z, yaw]) => new Promise((res) => { DV.Player.place(x, z, yaw); DV.Game.rig.yaw = yaw; setTimeout(() => { const i = DV.Game.renderer.info.render; res({ calls: i.calls, tris: i.triangles, fps: DV.Game.fps }); }, 1500); }), [x, z, yaw]);
    T.ok(r.calls < 230, label + ': ' + r.calls + ' draw calls, ' + Math.round(r.tris / 1000) + 'k tris (' + r.fps + ' fps in software GL)');
  }
  T.noErrors(errs);
});
