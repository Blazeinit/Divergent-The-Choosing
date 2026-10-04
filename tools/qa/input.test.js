// Mouse capture: the pointer stays locked through dialogue (mouse/wheel/click choose), and is
// taken back automatically after clicking a choice or closing the Tab menu.
// This covers the classic mode (in-game cursor off); cursor.test.js covers the default.
// Headless Chromium can't really lock the pointer, so the lock calls are stubbed and counted.
const L = require('./lib.js');
L.run('mouse capture & dialogue input', async (p, T, errs) => {
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
    DV.Settings.set('softCursor', false);
  });
  const a = await ev(() => { QA.talk('martha_bell'); return [DV.Game.state, DV.Input.locked, LK.exit, document.querySelector('#dialogue .dhint').textContent]; });
  T.ok(a[0] === 'dialogue' && a[1] && a[2] === 0, 'talking keeps the mouse captured', a);
  T.ok(/scroll to choose/i.test(a[3]), 'hint explains mouse controls: "' + a[3] + '"');
  await p.waitForTimeout(200);
  const s0 = await ev(() => DV.DialogueUI.sel);
  await ev(() => { DV.Input.mouseDY += 140; });
  await p.waitForFunction((s0) => DV.DialogueUI.sel !== s0, s0, { timeout: 5000 }).catch(() => {});
  const s1 = await ev(() => DV.DialogueUI.sel);
  T.ok(s1 !== s0, 'moving the mouse moves the highlight (' + s0 + ' → ' + s1 + ')');
  await ev(() => { DV.Input.wheel -= 1; });
  await p.waitForFunction((s0) => DV.DialogueUI.sel === s0, s0, { timeout: 5000 }).catch(() => {});
  T.eq(await ev(() => DV.DialogueUI.sel), s0, 'scrolling moves it back');
  const before = await ev(() => QA.node());
  await ev(() => { DV.Input.pressed.MouseLeft = true; });
  await p.waitForFunction((b) => QA.node() !== b, before, { timeout: 5000 }).catch(() => {});
  const after = await ev(() => QA.node());
  T.ok(after !== before, 'a click confirms the highlighted response (' + before + ' → ' + after + ')');
  await ev(() => { for (let i = 0; i < 6 && DV.Dialogue.active; i++) { const v = DV.Dialogue.active.view; const en = v.choices.filter((c) => c.enabled); DV.DialogueUI.sel = en[en.length - 1].index; DV.Input.pressed.MouseLeft = true; DV.Game.update(0.016); } });
  const b = await ev(() => [DV.Game.state, DV.Input.locked, LK.exit]);
  T.ok(b[0] === 'playing' && b[1] && b[2] === 0, 'after the conversation the mouse is still captured — no re-click', b);
  // cursor free (e.g. after opening the inventory): clicking a choice re-captures on the way out
  await ev(() => { DV.Input.locked = false; QA.talk('dean_walsh'); });
  for (let i = 0; i < 10; i++) {
    if (!(await ev(() => !!DV.Dialogue.active))) break;
    const sel = (await p.$('#dialogue .choice.end:not(.dis)')) ? '#dialogue .choice.end:not(.dis) >> nth=0' : '#dialogue .choice:not(.dis) >> nth=-1';
    await p.click(sel);
    await p.waitForTimeout(150);
  }
  const fr = await ev(() => [DV.Game.state, DV.Input.locked, QA.node()]);
  T.ok(fr[0] === 'playing' && fr[1], 'clicking a choice with a free cursor re-captures the mouse when the dialogue ends', fr);
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => DV.Game.state === 'menu', null, { timeout: 5000 }).catch(() => {});
  T.ok(await ev(() => DV.Game.state === 'menu' && !DV.Input.locked), 'Tab frees the cursor for the menu');
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => DV.Game.state === 'playing', null, { timeout: 5000 }).catch(() => {});
  T.ok(await ev(() => DV.Game.state === 'playing' && DV.Input.locked), 'closing the menu captures it again');
  T.noErrors(errs);
});
