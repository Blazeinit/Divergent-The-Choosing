// One-way doors: the proctors' doors let you out from inside without the keycard (you've handed it
// back), but not back in from the corridor.
const L = require('./lib.js');
L.run('doors: out of the proctor station without the card, not back in', async (p, T, errs) => {
  const ev = (fn, a) => p.evaluate(fn, a);
  await L.quickStart(p);
  const r = await ev(() => {
    const z = DV.World.current, door = z.doors.find((d) => d.def.id === 'proctor_door'), gal = z.doors.find((d) => d.def.id === 'gallery_door');
    DV.Inventory.add('staff_keycard');
    const withCard = (DV.Player.place(19, 18, Math.PI), DV.Story.playerCanPass('proctor', door));
    DV.Inventory.remove('staff_keycard', 1);
    DV.Player.place(19, 13, 0);
    const outFromOffice = DV.Story.playerCanPass('proctor', door);
    DV.Player.place(30, 6, -Math.PI / 2);
    const outFromGallery = DV.Story.playerCanPass('proctor', gal);
    DV.Player.place(19, 18, Math.PI);
    const backIn = DV.Story.playerCanPass('proctor', door);
    return { withCard, outFromOffice, outFromGallery, backIn };
  });
  T.ok(r.withCard, 'with the keycard, in from the corridor', r);
  T.ok(r.outFromOffice && r.outFromGallery, 'without it, the doors still let you out (from the station, and from the gallery)', r);
  T.ok(!r.backIn, 'but not back in from the corridor', r);
  // and for real: walk out through it
  await ev(() => { DV.Player.place(19, 14.6, 0); DV.Game.rig.yaw = 0; });
  await p.keyboard.down('KeyW'); await L.until(p, () => DV.Player.z > 16.4, 9000); await p.keyboard.up('KeyW');
  const out = await ev(() => ({ z: +DV.Player.z.toFixed(2), room: (DV.World.current.roomAt(DV.Player.x, DV.Player.z) || {}).id }));
  T.ok(out.z > 16.1 && out.room === 'tc_corr', 'walking at it from inside, you go through into the corridor', out);
  T.noErrors(errs);
});
