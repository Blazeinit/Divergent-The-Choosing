// The developer menu: off by default (no key, nothing in the pause menu); the toggle at the
// bottom of Settings turns it on; then ` opens it and Pause has a Developer entry. Go to a
// landmark; set the hour; walk through a wall with noclip and faster with ×4; the info readout,
// hiding the HUD, emptying the streets; Shift+click on the City map; and the story jumps (a
// Dauntless day, a first week, the Choosing).
const L = require('./lib.js');
L.run('the developer menu', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const press = async (k) => { await p.keyboard.press(k); await p.waitForFunction((k) => !DV.Input.pressed[k], k, { timeout: 8000 }).catch(() => {}); };
  // (straight on the element: the in-game cursor's clicks land a frame later, and it has its own suite)
  await ev(() => { window.hit = (sel, text) => { const e = [...document.querySelectorAll(sel)].find((q) => !text || q.textContent.indexOf(text) >= 0); if (!e) return 'NO ' + sel + ' ' + text; e.click(); return 'ok'; }; });
  const click = (label) => ev((label) => hit('.devmenu .btn', label), label);
  await ev(() => { DV.State.setFlag('results_discussed'); DV.State.setFlag('security_cleared'); DV.Inventory.add('name_badge', 1, true); DV.Build2.beginGoingHome(); QA.tp(40, 70, 0); QA.step(0.2); });

  // off by default
  T.eq(await ev(() => DV.Settings.get('devMenu')), false, 'off by default');
  await press('Backquote');
  T.ok(await ev(() => DV.Game.state === 'playing' && !document.querySelector('.devmenu')), '` does nothing while it\'s off');
  await press('Escape');
  T.ok(await ev(() => ![...document.querySelectorAll('#pause .mm-item')].some((e) => /Developer/.test(e.textContent))), 'and the pause menu has no Developer entry');
  // the toggle at the bottom of Settings
  await ev(() => hit('#pause .mm-item', 'Settings'));
  const st = await ev(() => { const rows = [...document.querySelectorAll('.side .row')]; const last = rows[rows.length - 1]; return { label: last.textContent, heads: [...document.querySelectorAll('.side .h')].map((h) => h.textContent) }; });
  T.ok(/Dev menu/.test(st.label) && st.heads[st.heads.length - 1] === 'Developer', 'Settings ends with Developer → Dev menu', st);
  await ev(() => { const rows = [...document.querySelectorAll('.side .row')]; hit('.side .row:last-child .toggle'); });
  T.eq(await ev(() => DV.Settings.get('devMenu')), true, 'the toggle turns it on');
  await ev(() => { DV.Menus.closeSide(); DV.Game.resume(); });
  await press('Escape');
  T.ok(await ev(() => [...document.querySelectorAll('#pause .mm-item')].some((e) => /Developer/.test(e.textContent))), 'now Pause has a Developer entry');
  await ev(() => hit('#pause .mm-item', 'Developer'));
  T.ok(await ev(() => !!document.querySelector('.devmenu')), 'which opens the dev menu');
  await ev(() => { DV.Menus.closeSide(); DV.Game.resume(); });
  await press('Backquote');
  T.ok(await ev(() => !!document.querySelector('.devmenu') && DV.Game.state === 'paused'), '` opens it too');

  // go to a landmark
  T.eq(await click('Merciless Mart'), 'ok', 'Go to: the Merciless Mart');
  const at = await ev(() => ({ state: DV.Game.state, place: DV.World.current.placeName(DV.Player.x, DV.Player.z), d: Math.hypot(DV.Player.x + 128, DV.Player.z - 310) }));
  T.ok(at.state === 'playing' && at.d < 40 && /Candor/.test(at.place.sub), 'you\'re there, back in the game (' + at.place.name + ' · ' + at.place.sub + ')', at);

  // the hour
  await press('Backquote');
  await click('21:00');
  T.eq(await ev(() => DV.Clock.str()), '21:00', 'the hour: 21:00');
  T.ok(await L.until(p, () => DV.World.current.lampGlow && DV.World.current.lampGlow.visible, 5000, 0.05), 'and the lamps come on');

  // noclip and speed
  await ev(() => hit('.devmenu .btn', 'Noclip'));
  await ev(() => hit('.devmenu .btn', '×4'));
  await ev(() => { DV.Menus.closeSide(); DV.Game.resume(); });
  const wall = await ev(() => {
    // the Testing Center's outside wall, from the pavement on Lake Street: walk north into it
    DV.Dev.go(30, 77.5, Math.PI); QA.step(0.1);
    const z0 = DV.Player.z;
    DV.Game.rig.yaw = Math.PI; DV.Input.keys.KeyW = true; QA.step(2); DV.Input.keys.KeyW = false;
    return { z0, z1: DV.Player.z, speed: DV.Dev.flags.speed };
  });
  T.ok(wall.z1 < 70, 'noclip ×4: straight through the Testing Center\'s wall (z ' + wall.z0.toFixed(1) + ' → ' + wall.z1.toFixed(1) + ')', wall);
  // flying: up with Space, and V lands you on the nearest ground you could stand on
  const fly = await ev(() => {
    DV.Dev.flags.speed = 1;
    DV.Input.keys.Space = true; QA.step(1.5); DV.Input.keys.Space = false;
    const up = DV.Player.y;
    QA.step(0.3);
    return { up, held: DV.Player.y };
  });
  T.ok(fly.up > 8 && Math.abs(fly.held - fly.up) < 0.01, 'noclip flies: Space takes you up (' + fly.up.toFixed(1) + ' m) and you stay there', fly);
  await p.keyboard.press('KeyV');
  await p.waitForFunction(() => !DV.Input.pressed.KeyV, null, { timeout: 8000 }).catch(() => {});
  const land = await ev(() => { QA.step(2); const P = DV.Player, z = DV.World.current; return { noclip: DV.Dev.flags.noclip, y: P.y, ok: z.walkable(P.x, P.z), room: (z.roomAt(P.x, P.z) || {}).id || null, x: P.x, z: P.z }; });
  T.ok(!land.noclip && land.y < 0.05 && land.ok, 'V again: noclip off, down on ground you can stand on', land);

  // the readout, hiding the HUD, empty streets
  await press('Backquote');
  await ev(() => { hit('.devmenu .btn', 'Info readout'); hit('.devmenu .btn', 'Hide HUD'); hit('.devmenu .btn', 'Empty streets'); DV.Menus.closeSide(); DV.Game.resume(); });
  await ev(() => { DV.Dev.go(60, 82); QA.step(1); });
  const w = await ev(() => ({ info: (document.getElementById('devinfo') || {}).textContent || '', hud: getComputedStyle(document.getElementById('hud')).display, peds: DV.World.current.streetLife.peds.filter((q) => q.model.root.visible).length }));
  T.ok(/testing_center/.test(w.info) && /fps/.test(w.info) && /people/.test(w.info), 'the info readout: ' + w.info.split('\n')[0]);
  T.ok(w.hud === 'none' && w.peds === 0, 'the HUD hidden, the streets empty', w);
  await ev(() => { DV.Dev.flags.hideHud = false; DV.Dev.flags.noStreet = false; QA.step(0.5); });
  T.ok(await ev(() => getComputedStyle(document.getElementById('hud')).display !== 'none' && DV.World.current.streetLife.peds.some((q) => q.model.root.visible)), 'and back');

  // Shift+click on the City map
  await ev(() => { DV.Game.openRPGMenu('map'); hit('#rpgmenu .btn', 'City'); });
  await p.waitForFunction(() => DV.WorldMap.T, null, { timeout: 5000 }).catch(() => {});
  const mp = await ev(() => {
    const cv = document.getElementById('map-canvas'), M = DV.WorldMap, Tt = M.T;
    // the screen point of the Erudite headquarters
    const x = 284, z = 310 + 26;
    const r = cv.getBoundingClientRect();
    const sx = (x - Tt.cx) * Tt.s + Tt.w / 2, sy = (z - Tt.cz) * Tt.s + Tt.h / 2;
    cv.dispatchEvent(new MouseEvent('click', { clientX: r.left + sx, clientY: r.top + sy, shiftKey: true, bubbles: true }));
    return { d: Math.hypot(DV.Player.x - x, DV.Player.z - z), state: DV.Game.state };
  });
  T.ok(mp.d < 12 && mp.state === 'playing', 'Shift+click on the City map goes there (' + mp.d.toFixed(1) + ' m off)', mp);

  // story jumps
  await press('Backquote');
  await click('Day 3');
  T.ok(await L.until(p, () => DV.World.current && DV.World.current.id === 'd_compound' && DV.Game.state === 'playing', 30000), 'Story → Dauntless Day 3: into the compound');
  T.ok(await ev(() => DV.Clock.day() === 3 && DV.Clock.str() === '07:30' && DV.District.currentId() === 'dauntless'), 'Day 3, 07:30, in the Dauntless district');
  await press('Backquote');
  T.ok(await ev(() => [...document.querySelectorAll('.devmenu .btn')].some((b) => /Transfer Dormitory|Dormitory/.test(b.textContent))), 'Go to lists the compound\'s rooms');
  await click('Candor');
  T.ok(await L.until(p, () => DV.Chapter.active && DV.Chapter.id === 'week_candor' && DV.Game.state === 'playing', 30000), 'Story → First week: Candor');
  await press('Backquote');
  await click('The Choosing');
  T.ok(await L.until(p, () => DV.Chapter.active && DV.Chapter.id === 'ceremony', 30000), 'Story → the Choosing Ceremony');

  // off again: the readout goes
  await ev(() => DV.Settings.set('devMenu', false));
  await p.waitForTimeout(300);
  await ev(() => QA.step(0.1));
  T.ok(await ev(() => !document.getElementById('devinfo') && !DV.UI.root.classList.contains('dev-nohud')), 'turned off, nothing of it is left on screen');
  T.noErrors(errs);
});
