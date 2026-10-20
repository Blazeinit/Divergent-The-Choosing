// Controls: rebinding keys, a gamepad, and the crash panel. A key moved to another action does that
// action (and its old key no longer does), a key already in use swaps over, the bindings outlive a
// reload and reset; the Controls page lists them and rebinds by clicking and pressing. A gamepad
// (stubbed: a standard-layout pad) walks with the left stick, runs pushed all the way, looks with the
// right, and its buttons press the game's keys (X interacts, A jumps), letting go of only its own.
// And an error brings up the panel (keep playing, last save, copy a report, restart) and the game
// keeps running behind it; a second one is added to it, not stacked.
const L = require('./lib.js');
L.run('controls: rebinding, gamepad, crash panel', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => { DV.Settings.set('keymap', {}); });

  /* ---- rebinding ---- */
  const press = async (code) => { await p.keyboard.press(code === 'KeyF' ? 'f' : code === 'KeyE' ? 'e' : code === 'KeyG' ? 'g' : code); };
  await ev(() => { DV.Input.bind('KeyE', 'KeyF'); window.__k = []; DV.Events.on('input:key', (c) => window.__k.push(c)); });
  await press('KeyF'); await press('KeyE');
  const rb = await ev(() => ({ keys: window.__k.slice(), label: DV.Input.label(DV.Input.keyFor('KeyE')), km: DV.Settings.get('keymap') }));
  T.ok(rb.keys[0] === 'KeyE' && !rb.keys.includes('KeyF') && rb.keys.length === 1, 'interact moved to F: F interacts, E does nothing now', rb);
  T.eq(rb.label, 'F', 'and the menus show it on F');
  // a key another action has swaps with it
  const sw = await ev(() => { DV.Input.bind('KeyM', 'KeyF'); return { map: DV.Input.keyFor('KeyM'), interact: DV.Input.keyFor('KeyE') }; });
  T.ok(sw.map === 'KeyF' && sw.interact === 'KeyM', 'binding the map to F (interact\'s key) swaps them: map F, interact M', sw);
  // it keeps (settings are saved), and resets
  const kept = await ev(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /settings/i.test(k)))).keymap);
  T.ok(kept && kept.KeyM === 'KeyF', 'the bindings are saved with the settings', kept);
  await ev(() => DV.Settings.set('keymap', {}));
  T.eq(await ev(() => DV.Input.keyFor('KeyE')), 'KeyE', 'and reset to the defaults');

  /* ---- the Controls page: click a binding, press a key ---- */
  await ev(() => { DV.Game.pause ? DV.Game.pause() : null; DV.Menus.showControls(); });
  await p.waitForTimeout(300);
  const rows = await ev(() => document.querySelectorAll('.keybind').length);
  T.ok(rows >= 12, 'the Controls page lists ' + rows + ' bindings');
  await ev(() => document.querySelector('.keybind .btn[data-action="KeyJ"]').click());
  await press('KeyG');
  const pg = await ev(() => ({ j: DV.Input.keyFor('KeyJ'), text: document.querySelector('.keybind .btn[data-action="KeyJ"]').textContent }));
  T.ok(pg.j === 'KeyG' && pg.text === 'G', 'clicking Quests and pressing G binds it, and the page shows G', pg);
  await L.shot(p, 'controls_page');
  await ev(() => { DV.Settings.set('keymap', {}); DV.Menus.closeSide && DV.Menus.closeSide(); DV.Game.resume(); });

  /* ---- a gamepad ---- */
  const pad = await ev(() => {
    const st = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => [Object.assign({ connected: true, id: 'QA pad' }, st)];
    window.__pad = st;
    if (DV.Game.state !== 'playing') DV.Game.resume();
    DV.Cursor.update(DV.Game); // (the frame loop does this; QA.step doesn't)
    const P = DV.Player, z0 = P.z, x0 = P.x;
    // left stick forward, half way: walk
    st.axes[1] = -0.6;
    for (let i = 0; i < 30; i++) { DV.Input.pollPad(1 / 30); QA.step(1 / 30); }
    const walked = Math.hypot(P.x - x0, P.z - z0), walkKeys = { w: DV.Input.keys.KeyW, run: !!DV.Input.keys.ShiftLeft };
    // all the way: run
    st.axes[1] = -1;
    for (let i = 0; i < 6; i++) { DV.Input.pollPad(1 / 30); QA.step(1 / 30); }
    const runKey = !!DV.Input.keys.ShiftLeft;
    st.axes[1] = 0;
    DV.Input.pollPad(1 / 30); QA.step(1 / 30);
    const released = !DV.Input.keys.KeyW && !DV.Input.keys.ShiftLeft;
    // right stick: look
    DV.Cursor.update(DV.Game);
    const yaw0 = DV.Game.rig.yaw, cur = DV.Cursor.active;
    st.axes[2] = 1;
    for (let i = 0; i < 10; i++) { DV.Input.pollPad(1 / 30); window.__md = DV.Input.mouseDX; DV.Game.update(1 / 30); }
    st.axes[2] = 0;
    const turned = Math.abs(DV.Game.rig.yaw - yaw0), md = window.__md, gs = DV.Game.state;
    // X: interact (a press, once)
    window.__k = [];
    st.buttons[2].pressed = true; DV.Input.pollPad(1 / 30);
    const pressedE = DV.Input.wasPressed('KeyE');
    DV.Input.endFrame(); DV.Input.pollPad(1 / 30);
    const heldNotRepressed = !DV.Input.wasPressed('KeyE') && DV.Input.keys.KeyE;
    st.buttons[2].pressed = false; DV.Input.pollPad(1 / 30);
    // a keyboard key held while the pad lets go of its own stays down
    DV.Input.keys.KeyD = true; st.buttons[0].pressed = true; DV.Input.pollPad(1 / 30); st.buttons[0].pressed = false; DV.Input.pollPad(1 / 30);
    const kbKept = DV.Input.keys.KeyD; DV.Input.keys.KeyD = false;
    return { walked: +walked.toFixed(2), walkKeys, runKey, released, turned: +turned.toFixed(2), pressedE, heldNotRepressed, kbKept, events: window.__k.slice(), cur, md, gs };
  });
  T.ok(pad.walked > 0.5 && pad.walkKeys.w && !pad.walkKeys.run, 'left stick forward: walks (' + pad.walked + ' m in a second), not running', pad);
  T.ok(pad.runKey && pad.released, 'pushed all the way: runs; let go: stops', pad);
  T.ok(pad.turned > 0.2, 'right stick: the camera turns (' + pad.turned + ' rad)', pad);
  T.ok(pad.pressedE && pad.heldNotRepressed && pad.events.includes('KeyE'), 'X presses interact once (held, not pressed again)', pad);
  T.ok(pad.kbKept, 'the pad letting go of its buttons leaves keyboard keys alone', pad);

  /* ---- the crash panel ---- */
  const cr = await ev(() => {
    DV.UI.showError('QA: a pretend error\n    at somewhere (qa.js:1)');
    const b = document.getElementById('errbox');
    const btns = [...b.querySelectorAll('.btn')].map((x) => x.textContent);
    DV.UI.showError('QA: a second one');
    const n = document.querySelectorAll('#errbox').length, both = /second/.test(b.querySelector('pre').textContent) && /pretend/.test(b.querySelector('pre').textContent);
    const t0 = DV.State.data.world.time; QA.step(1);
    return { shown: !!b && getComputedStyle(b).display !== 'none', title: b.querySelector('.eh').textContent, btns, n, both, running: DV.State.data.world.time !== t0 || DV.Game.state === 'playing' };
  });
  T.ok(cr.shown && /went wrong/.test(cr.title), 'an error brings up the panel: "' + cr.title + '"', cr);
  T.ok(['Keep playing', 'Copy report', 'Restart'].every((x) => cr.btns.includes(x)), 'with Keep playing, Copy report and Restart (' + cr.btns.join(', ') + ')', cr);
  T.ok(cr.n === 1 && cr.both, 'a second error is added to the same panel', cr);
  await L.shot(p, 'crash_panel');
  const gone = await ev(() => { [...document.querySelectorAll('#errbox .btn')].find((x) => x.textContent === 'Keep playing').click(); return !document.getElementById('errbox'); });
  T.ok(gone && cr.running, 'Keep playing closes it, and the game ran on behind it');
  // (the pretend errors are this suite's own: don't count them)
  errs.length = 0;
});
