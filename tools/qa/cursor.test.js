// In-game cursor: windows keep the mouse captured and show the game's own cursor, which drives
// hover, clicks, sliders and dropdowns; with the browser's mouse free it replaces the system cursor.
// Headless Chromium can't really lock the pointer, so the lock calls are stubbed and counted and
// locked mouse movement is sent as synthetic movementX/Y events.
const L = require('./lib.js');
L.run('in-game cursor', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => {
    window.LK = { req: 0, exit: 0 };
    const I = DV.Input;
    I.requestLock = function () { LK.req++; this.locked = true; };
    const ex = I.exitLock.bind(I);
    I.exitLock = function () { LK.exit++; ex(); };
    I.locked = true;
    DV.Settings.set('textSpeed', 'instant');
    // move the captured cursor onto an element (or a point) with raw mouse deltas
    window.moveTo = (sel, fx) => {
      let x, y;
      if (typeof sel === 'string') {
        const el = document.querySelector(sel);
        if (!el) return 'NO ' + sel;
        const r = el.getBoundingClientRect();
        x = r.left + r.width * (fx === undefined ? 0.5 : fx); y = r.top + r.height / 2;
      } else [x, y] = sel;
      let n = 0;
      while ((Math.abs(DV.Cursor.x - x) > 0.5 || Math.abs(DV.Cursor.y - y) > 0.5) && n++ < 40) {
        const dx = Math.max(-300, Math.min(300, x - DV.Cursor.x)), dy = Math.max(-300, Math.min(300, y - DV.Cursor.y));
        document.dispatchEvent(new MouseEvent('mousemove', { movementX: dx, movementY: dy, bubbles: true }));
      }
      return 'ok';
    };
    window.click = () => {
      DV.Input.canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
    };
  });
  // wait for two rendered game frames (software GL is slow, so a fixed timeout isn't enough)
  const frame = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  // --- Tab menu: captured mouse, game cursor
  await p.keyboard.press('Tab'); await frame();
  const a = await ev(() => ({ st: DV.Game.state, locked: DV.Input.locked, exit: LK.exit, on: DV.Cursor.active, cap: DV.Cursor.captured, vis: getComputedStyle(document.getElementById('vcursor')).display }));
  T.ok(a.st === 'menu' && a.locked && a.exit === 0, 'Tab opens the menu without releasing the mouse', a);
  T.ok(a.on && a.cap && a.vis === 'block', 'the in-game cursor shows in captured mode', a);
  const yaw0 = await ev(() => DV.Game.rig.yaw);
  T.eq(await ev(() => moveTo('#rpgmenu .tab:nth-child(3)')), 'ok', 'cursor moves with raw mouse deltas');
  await frame();
  const h = await ev(() => ({ hov: document.querySelector('#rpgmenu .tab:nth-child(3)').classList.contains('vhover'), hot: document.getElementById('vcursor').classList.contains('hot'), yaw: DV.Game.rig.yaw }));
  T.ok(h.hov && h.hot, 'hovering a tab highlights it and the cursor lights up', h);
  T.ok(Math.abs(h.yaw - yaw0) < 1e-6, 'moving the cursor does not turn the camera');
  const tabName = await ev(() => { const t = document.querySelector('#rpgmenu .tab:nth-child(3)'); click(); return [t.textContent, DV.RPGMenu.tab]; });
  T.ok(/inventory/i.test(tabName[0]) ? tabName[1] === 'inventory' : !!tabName[1], 'a click lands on the tab under the cursor (' + tabName.join(' → ') + ')');
  // wheel over a scrollable list
  const sc = await ev(() => {
    const box = [...document.querySelectorAll('#rpgmenu *')].find((e) => e.scrollHeight > e.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
    if (!box) return 'none';
    const r = box.getBoundingClientRect();
    moveTo([r.left + 20, r.top + 20]);
    const before = box.scrollTop;
    DV.Input.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
    return box.scrollTop - before;
  });
  T.ok(sc === 'none' || sc > 0, 'scrolling the wheel scrolls the list under the cursor (' + sc + ')');
  await p.keyboard.press('Tab'); await frame();
  const b = await ev(() => { const y = DV.Game.rig.yaw; document.dispatchEvent(new MouseEvent('mousemove', { movementX: 80, movementY: 0, bubbles: true })); DV.Game.update(0.016); return { st: DV.Game.state, on: DV.Cursor.active, turned: Math.abs(DV.Game.rig.yaw - y) > 1e-4, hov: document.querySelectorAll('.vhover').length }; });
  T.ok(b.st === 'playing' && !b.on && b.turned && b.hov === 0, 'closing the menu hides the cursor and the mouse looks around again', b);

  // --- dialogue: point and click
  await ev(() => QA.talk('martha_bell')); await frame();
  const d0 = await ev(() => ({ on: DV.Cursor.active, hint: document.querySelector('#dialogue .dhint').textContent, node: QA.node(), n: document.querySelectorAll('#dialogue .choice:not(.dis)').length }));
  T.ok(d0.on && /click a response/i.test(d0.hint), 'dialogue shows the cursor: "' + d0.hint + '"');
  const d1 = await ev(() => { const els = [...document.querySelectorAll('#dialogue .choice')]; const i = els.findIndex((e, k) => k > 0 && !e.classList.contains('dis')); moveTo('#dialogue .choice:nth-child(' + (i + 1) + ')'); return [i, DV.DialogueUI.sel]; });
  T.ok(d1[0] > 0 && d1[1] === d1[0], 'hovering a response highlights it (' + d1.join(' = ') + ')');
  await ev(() => click()); await frame();
  T.ok(await ev((n) => QA.node() !== n, d0.node), 'clicking it picks it');
  await ev(() => { moveTo([30, 30]); click(); }); await frame();
  T.ok(await ev(() => !!DV.Dialogue.active), 'clicking the 3D view does not pick a response by accident');
  await ev(() => QA.end()); await frame();

  // --- sliders and dropdowns under a captured mouse (settings panel)
  await ev(() => { DV.Game.pause(); DV.Input.locked = true; DV.Menus.showSettings(); }); await frame();
  const r = await ev(() => {
    const range = document.querySelector('.side input[type=range]');
    const v0 = DV.Settings.get('mouseSensitivity');
    moveTo('.side input[type=range]', 0.1);
    DV.Input.canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
    const rr = range.getBoundingClientRect();
    moveTo([rr.left + rr.width * 0.9, rr.top + rr.height / 2]);
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
    const v1 = DV.Settings.get('mouseSensitivity');
    const sel = document.querySelector('.side select');
    const s0 = sel.value;
    moveTo('.side select'); click();
    return { v0, v1, s0, s1: sel.value, rs: DV.Settings.get('renderScale') };
  });
  T.ok(r.v1 > r.v0 + 1, 'dragging a slider with the cursor changes the setting (' + r.v0 + ' → ' + r.v1 + ')');
  T.ok(r.s1 !== r.s0 && r.rs === r.s1, 'clicking a dropdown steps to the next option (' + r.s0 + ' → ' + r.s1 + ')');
  await ev(() => { DV.Settings.set('mouseSensitivity', 1); DV.Settings.set('renderScale', 'retro'); });

  // --- free mouse (after Esc): the game's cursor follows the real pointer, system cursor hidden
  await ev(() => { DV.Input.locked = false; }); await p.mouse.move(400, 260); await p.mouse.move(420, 300); await frame();
  const f = await ev(() => ({ on: DV.Cursor.active, cap: DV.Cursor.captured, x: DV.Cursor.x, y: DV.Cursor.y, sys: getComputedStyle(document.querySelector('.side') || document.body).cursor, vis: getComputedStyle(document.getElementById('vcursor')).display }));
  T.ok(f.on && !f.cap && f.x === 420 && f.y === 300 && f.vis === 'block', 'with the mouse free the game cursor follows the pointer', f);
  T.eq(f.sys, 'none', 'and the system cursor is hidden');
  await ev(() => { DV.Menus.closeSide(); DV.Game.resume(); }); await frame();

  // --- setting off: the old behaviour (menus free the mouse, system cursor)
  await ev(() => { DV.Settings.set('softCursor', false); DV.Input.locked = true; LK.exit = 0; });
  await p.keyboard.press('Tab'); await frame();
  const o = await ev(() => ({ st: DV.Game.state, locked: DV.Input.locked, exit: LK.exit, on: DV.Cursor.active, cls: document.documentElement.classList.contains('vcur'), vis: getComputedStyle(document.getElementById('vcursor')).display }));
  T.ok(o.st === 'menu' && !o.locked && o.exit === 1 && !o.on && !o.cls && o.vis === 'none', 'with the setting off, menus free the mouse and use the system cursor', o);
  await p.keyboard.press('Tab'); await frame();
  T.noErrors(errs);
});
