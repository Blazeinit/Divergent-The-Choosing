// Build 4: waiting, and the clock. T opens the wait anywhere you're free to (standing, not just
// seated); the day goes by in a time-lapse and every minute on the way still happens (the
// rankings go up at 17:00 while you wait through it); a call to training stops the wait at the
// call, and the block isn't missed; the panel warns you about a block that's on now; Esc stops
// it early; it won't take you past midnight; you can't wait in a chapter; a scene that takes
// over mid-wait gets the screen back; the bunk rest is a time-lapse too; and the clock speed
// setting changes how fast the day goes by.
const L = require('./lib.js');
L.run('build 4: waiting and the clock', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  // (a real key press, then wait for a real frame to take it: software GL frames are slow)
  const press = async (k) => { await p.keyboard.press(k); await p.waitForFunction((k) => !DV.Input.pressed[k], k, { timeout: 8000 }).catch(() => {}); };
  const settle = () => L.until(p, () => DV.Game.state === 'playing' && !DV.Wait.running, 15000, 0.05);

  // the clock speed
  const sp = await ev(() => {
    const out = { def: DV.Settings.get('clockSpeed'), scale: DV.Clock.scale() };
    DV.Settings.data.clockSpeed = 'fast'; out.fast = DV.Clock.scale();
    const t0 = DV.Clock.total(); QA.step(3); out.fastMins = DV.Clock.total() - t0;
    DV.Settings.data.clockSpeed = 'slow'; out.slow = DV.Clock.scale();
    DV.Settings.data.clockSpeed = 'normal';
    return out;
  });
  T.ok(sp.def === 'normal' && sp.scale === 10 && sp.fast === 20 && sp.slow === 5, 'clock speed: an hour every 6 minutes by default (12 slow, 3 fast)', sp);
  T.ok(Math.abs(sp.fastMins - 1) < 0.15, 'on fast, 3 seconds is a minute of the day (' + sp.fastMins.toFixed(2) + ')');

  // T, standing in the Testing Center courtyard
  await ev(() => { QA.tp(30, 33); DV.Player.state = 'free'; QA.step(0.2); });
  const t0 = await ev(() => DV.Clock.minutes());
  await press('KeyT');
  const panel = await ev(() => ({ state: DV.Game.state, el: !!document.getElementById('waitmenu'), hrs: (document.querySelector('#waitmenu .hrs') || {}).textContent, quick: [...document.querySelectorAll('#waitmenu .quick .btn')].map((b) => b.textContent) }));
  T.ok(panel.state === 'wait' && panel.el && panel.hrs === '1 hour', 'T opens the wait standing up, not only on a bench', panel);
  T.ok(panel.quick.length >= 1, 'with quick choices: ' + panel.quick.join(' / '));
  await press('ArrowRight'); await press('ArrowRight');
  T.eq(await ev(() => document.querySelector('#waitmenu .hrs').textContent), '3 hours', '→ to wait longer');
  await press('ArrowLeft');
  await press('Enter');
  const lapse = await ev(() => ({ state: DV.Game.state, el: !!document.getElementById('waitlapse') }));
  T.ok(lapse.state === 'waiting' && lapse.el, 'Enter: the time-lapse begins', lapse);
  const mid = await ev((t0) => { QA.step(0.4); return DV.Clock.minutes() - t0; }, t0);
  T.ok(mid > 5 && mid < 119, 'the time goes by while you watch (' + Math.round(mid) + ' min so far)');
  T.ok(await settle(), 'and it ends by itself');
  const after = await ev((t0) => ({ d: DV.Clock.minutes() - t0, lapse: !!document.getElementById('waitlapse'), state: DV.Game.state }), t0);
  T.ok(after.d >= 119.5 && after.d < 122 && !after.lapse, 'two hours later, the readout gone', after);
  await p.waitForTimeout(800);
  T.ok(await ev(() => parseFloat(DV.UI.fader.style.opacity) === 0 && DV.Game.state === 'playing'), 'and the screen is back, and you\'re free to go');

  // Esc stops it early
  const t1 = await ev(() => DV.Clock.minutes());
  await ev(() => { DV.Wait.start(10 * 60); QA.step(0.5); });
  await press('Escape');
  T.ok(await settle(), 'Esc stops the wait');
  const esc = await ev((t1) => DV.Clock.minutes() - t1, t1);
  T.ok(esc > 1 && esc < 300, 'part of the way (' + Math.round(esc) + ' min of 600)');

  // midnight: waiting won't take you into tomorrow
  const night = await ev(() => {
    QA.skip('22:30'); const d = DV.Clock.day();
    const plan = DV.Wait.plan(); DV.Wait.start(12 * 60);
    return { d, max: plan.max };
  });
  T.ok(night.max === 89, 'at 22:30 there\'s an hour and a half left of the day to wait (' + night.max + ')');
  await settle();
  T.ok(await ev((d) => DV.Clock.day() === d && DV.Clock.minutes() >= 1438, night.d), 'the wait stops at midnight, the same day');
  T.ok(await ev(() => /bed/.test(DV.Wait.can())), 'and you\'re told to find your bed: "' + await ev(() => DV.Wait.can()) + '"');

  // Dauntless
  await L.b3(p);
  await ev(() => {
    DV.State.data.player.upbringing = 'erudite';
    DV.Build2.setFaction('dauntless'); DV.Build2.dressFor('dauntless');
    DV.State.data.story.dauntlessName = 'Tess';
    DV.State.data.world.day = 3; DV.State.data.world.time = DV.U.parseTime('06:40');
    DV.District.enter('dauntless', { spawn: [34, 9, 0.2], instant: true });
  });
  T.ok(await L.until(p, () => DV.World.current && DV.World.current.id === 'd_compound' && DV.Game.state === 'playing', 30000), 'Day 3 in the compound');
  const plan = await ev(() => { const pl = DV.Wait.plan(); return { stops: pl.stops.map((s) => DV.U.formatTime(s.t) + ' ' + s.why), targets: pl.targets.map((t) => t.label + ' ' + DV.U.formatTime(t.t)) }; });
  T.ok(plan.stops[0] && /^07:50 Firearms/.test(plan.stops[0]), 'the wait knows the call: ' + plan.stops[0], plan);
  T.ok(plan.targets.some((t) => /call · Firearms 07:50/.test(t)) && plan.targets.some((t) => /breakfast 07:00/.test(t)), 'quick choices: ' + plan.targets.join(' / '), plan);
  // three hours from 06:40 would run through Firearms: it stops at the call instead
  await ev(() => DV.Wait.start(3 * 60));
  T.ok(await settle(), 'wait three hours…');
  const call = await ev(() => ({ t: DV.Clock.str(), called: !!DV.Initiation.st().flags['call:d3:range'], missed: DV.Initiation.st().blocks['d3:range'] || null }));
  T.ok(call.t === '07:50' && call.called && !call.missed, '…and Mark\'s call stops you at 07:50: nothing missed', call);
  // a block that's on now
  const warn = await ev(() => { B.at('08:05'); return DV.Wait.warnings(60); });
  T.ok(warn.length === 1 && /Firearms is on now/.test(warn[0]), 'the panel warns you: "' + warn[0] + '"');
  await ev(() => { DV.Game.openWait(); });
  T.ok(await ev(() => /Firearms/.test(document.querySelector('#waitmenu .warn').textContent)), 'in red, on the panel');
  await press('Escape');
  T.eq(await ev(() => DV.Game.state), 'playing', 'Esc closes the panel');

  // every minute still happens: the board goes up at 17:00 while you wait through it (Day 4)
  const board = await ev(() => {
    const I = DV.Initiation, s = I.st();
    for (const b of I.blocks(3)) s.blocks['d3:' + b.id] = 'done';
    DV.State.data.world.day = 4;
    for (const b of I.blocks(4)) s.blocks['d4:' + b.id] = 'done';
    QA.skip('16:40'); QA.step(0.2);
    DV.Wait.start(60);
    return !!s.flags.posted_d4;
  });
  T.ok(!board, '16:40, Day 4: the board isn\'t up yet');
  await settle();
  const bd = await ev(() => ({ posted: !!DV.Initiation.st().flags.posted_d4, t: DV.Clock.str(), d: DV.Clock.day(), here: DV.District.here(), id: DV.District.currentId() }));
  T.ok(bd.posted && bd.t === '17:40', 'waited through 17:00: the rankings went up on the way', bd);

  // a scene that takes over mid-wait gets the screen back
  await ev(() => DV.Wait.start(60));
  await p.waitForTimeout(300);
  await ev(() => { QA.talk('d_mark'); });
  await p.waitForTimeout(250);
  const took = await ev(() => ({ state: DV.Game.state, running: !!DV.Wait.running, lapse: !!document.getElementById('waitlapse') }));
  T.ok(took.state === 'dialogue' && !took.running && !took.lapse, 'someone talks to you mid-wait: the wait gives way', took);
  await p.waitForTimeout(400);
  T.ok(await ev(() => parseFloat(DV.UI.fader.style.opacity) === 0), 'and the screen isn\'t left dimmed');
  await ev(() => QA.end());

  // the bunk: an hour's rest is a time-lapse too, and the calls still stop it
  const bunk = await ev(() => { DV.State.data.world.day = 5; QA.skip('07:20'); QA.step(0.2); const r = DV.Actions.sleep(); return { msg: r && r.message, state: DV.Game.state }; });
  T.ok(bunk.state === 'waiting' && /bunk/.test(bunk.msg || ''), 'before lights out the bunk is a rest', bunk);
  await settle();
  T.eq(await ev(() => DV.Clock.str()), '07:50', 'an hour, cut short by the call for knives');

  // not in a chapter
  await ev(() => { QA.end(); DV.Chapter.start('home', { walked: true }); });
  await L.until(p, () => DV.Game.state === 'playing' && DV.Game.ctrl(), 30000);
  await press('KeyT');
  T.ok(await ev(() => DV.Game.state === 'playing' && !document.getElementById('waitmenu') && /can't wait/.test(DV.Wait.can())), 'in a chapter T doesn\'t open the wait (the story keeps its own time)');

  T.noErrors(errs);
});
