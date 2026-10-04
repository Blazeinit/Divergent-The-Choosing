// Soundscape: per-room reverb, indoor tone vs. outdoor air (muffled through walls, louder by
// an open door), room accents, outdoor one-shots, and the simulations' own beds.
const L = require('./lib.js');
L.run('dynamic indoor / outdoor audio', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => DV.Audio.init());
  await p.waitForTimeout(300);
  const at = async (x, z, ms) => {
    await ev(([x, z]) => { QA.end(); DV.Player.place(x, z, 0); DV.Game.updateAmbience(); }, [x, z]);
    await p.waitForTimeout(ms || 700);
    return ev(() => ({ rev: DV.Audio.revProfile, L: DV.Audio.beds.last, pa: DV.Audio.paOutdoor }));
  };
  const street = await at(40, 80);
  T.ok(street.rev === 'exterior' && street.L.outdoor === 1 && street.L.indoor < 0.1 && street.L.cutoff > 10000, 'street: open air, no room tone', street);
  T.ok(street.pa, 'outdoors the PA echoes off the buildings');
  const lobby = await at(40, 50);
  T.ok(lobby.rev === 'atrium' && lobby.L.indoor === 1 && lobby.L.outdoor < 0.6 && lobby.L.cutoff < 4000, 'lobby: big atrium reverb, outside muffled', lobby);
  const hall = await at(40, 28);
  T.ok(hall.rev === 'hall' && hall.L.outdoor <= 0.15 && hall.L.cutoff < 600, 'waiting hall: deep inside, outdoors barely there', hall);
  T.eq((await at(30, 40.5)).rev, 'tiled', 'washroom: hard tiled reverb');
  T.ok((await at(70, 44)).L.boiler > 0.9, 'maintenance: the boiler');
  T.ok((await at(66, 18)).L.hum > 0.5, 'testing corridor by the simulation core: the hum');
  const yard = await at(69, 52);
  T.ok(yard.rev === 'yard' && yard.L.outdoor === 1, 'courtyard: walled open air', yard);
  // an open main door lets the outside in
  const closed = await at(40, 54);
  await ev(() => { DV.World.current.doorMap.main_doors.holdOpen = 6; });
  await p.waitForTimeout(1500);
  const open = await ev(() => DV.Audio.beds.last);
  T.ok(open.outdoor > closed.L.outdoor && open.cutoff > closed.L.cutoff, 'opening the main doors lets outside air in (' + closed.L.outdoor.toFixed(2) + '→' + open.outdoor.toFixed(2) + ')');
  // positional one-shots and the PA chain don't throw
  await ev(() => { DV.Audio.play('door', { x: 40, z: 60 }); DV.Audio.play('step', { x: 41, z: 52, surface: 'tile' }); DV.Audio.play('caw', { bus: 'outdoor' }); DV.Story.pa('Test announcement.'); });
  await p.waitForTimeout(500);
  // simulations get their own bed + reverb
  await ev(() => DV.Game.beginAptitudeTest());
  await p.waitForFunction(() => DV.World.current.id === 'sim_platform' && DV.Game.state === 'playing', null, { timeout: 20000 });
  await p.waitForTimeout(600);
  const sim = await ev(() => [DV.Audio.revProfile, DV.Audio.ambKind, DV.Audio.beds.on]);
  T.eq(sim, ['platform', 'platform', false], 'simulation I: its own rain bed and reverb, hub layers off');
  // settings: reverb off → dry
  await ev(() => { DV.Settings.data.reverb = false; DV.Events.emit('settings:changed'); });
  T.eq(await ev(() => DV.Audio.revProfile), 'dry', 'Settings → Room reverb off makes everything dry');
  T.noErrors(errs);
});
