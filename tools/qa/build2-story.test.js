// Build 2, the story path: after your results the gate opens and the bus takes you home;
// dinner with your family (choices set flags); a save made at night reloads at night; the
// night before; the Choosing Ceremony — names called in order, the other candidates choosing
// according to Aptitude Day, your turn at the knife and the bowls; and out the doors with
// your new faction.
const L = require('./lib.js');
L.run('Build 2: home & the Choosing', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  // step game time until a condition holds (or give up)
  await ev(() => { window.until = (cond, max) => { let n = 0; while (!cond() && n++ < (max || 4000)) QA.step(0.05); return cond(); }; });
  // walk from the plaza straight at the front gate for four seconds; how far south do you get?
  const walkOut = () => ev(() => {
    QA.end(); DV.Player.place(40, 73.2, 0); DV.Game.rig.yaw = 0; DV.Game.rig.follow(true);
    for (let n = 0; n < 80; n++) { DV.Input.keys.KeyW = true; QA.step(0.05); }
    DV.Input.keys.KeyW = false;
    return +DV.Player.z.toFixed(2);
  });
  const before = await walkOut();
  T.ok(before < 76, 'before your results, the front gate holds you in (z ' + before + ')');
  // the results are in (as if Claire had just finished with you)
  await ev(() => {
    const a = DV.State.data.aptitude;
    a.status = 'complete'; a.result = 'erudite'; a.recordedAs = 'erudite';
    DV.State.setFlag('results_discussed');
    DV.State.setFlag('daniel_tested'); // you got Daniel to his test on Aptitude Day
    DV.Quests.complete('aptitude_day', 'erudite');
    DV.Build2.beginGoingHome();
  });
  const g = await ev(() => { QA.step(0.2); const z = DV.World.current; return { q: DV.Quests.obj('the_choosing', 'leave'), gate: z.gateBlock.enabled, bus: DV.Build2.canGoHome() }; });
  T.ok(g.q === 'active' && !g.gate && g.bus, 'after the results: "The Choosing" starts, the front gate opens and the bus waits', g);
  const after = await walkOut();
  T.ok(after > 77, 'and you can walk out through it to the street (z ' + after + ')');
  // ride home
  await ev(() => { const it = DV.World.current.interactables.find((i) => i.id === 'bus_home'); it.onUse(DV.Game, it); QA.pick('take me home'); });
  const home = await L.until(p, () => DV.Chapter.active && DV.Chapter.id === 'home' && DV.Game.state === 'playing');
  T.ok(home, 'the bus takes you home');
  const h = await ev(() => ({ zone: DV.World.current.id, mom: !!DV.Chapter.mom, dad: !!DV.Chapter.dad, obj: DV.Quests.obj('the_choosing', 'dinner'), day: DV.Clock.day(), t: DV.Clock.str() }));
  T.ok(h.zone === 'home_erudite' && h.mom && h.dad && h.obj === 'active', 'home: your family\'s house (' + h.zone + '), both parents, dinner on the table', h);
  // dinner
  await ev(() => { const it = DV.Interaction.extra.find((i) => i.id === 'h_dinner_seat'); it.onUse(DV.Game, it); until(() => DV.Dialogue.isActive(), 200); });
  const d = await ev(() => [QA.pick('...'), QA.pick('what if'), QA.pick(''), QA.pick('thank you'), QA.pick('how did you choose'), QA.pick(''), QA.pick(''), QA.pick('tired'), QA.view()]);
  T.ok(d.slice(0, 8).every((x) => /^ok/.test(x)), 'dinner: talk about leaving and about your parents\' own Choosing', d);
  await ev(() => QA.pick('goodnight'));
  const fl = await ev(() => { QA.step(1); return { leave: !!DV.State.flag('home_asked_leave'), origin: !!DV.State.flag('home_parent_transfer'), dinner: DV.Quests.obj('the_choosing', 'dinner'), sleep: DV.Quests.obj('the_choosing', 'sleep'), step: DV.Chapter.step }; });
  T.ok(fl.leave && fl.origin && fl.dinner === 'done' && fl.sleep === 'active' && fl.step === 'night', 'what you said is remembered; time for bed (checkpoint: night)', fl);
  // save at night, load, and you're back at night — not at dinner
  T.ok(await ev(() => DV.Save.write('3').ok), 'saved during the night chapter');
  await ev(() => DV.Game.loadSlot('3'));
  await p.waitForFunction(() => DV.Chapter.active && DV.Chapter.id === 'home' && DV.Game.state === 'playing', null, { timeout: 30000 });
  const re = await ev(() => ({ step: DV.Chapter.step, sleep: !!DV.Interaction.extra.find((i) => i.id === 'h_sleep'), seat: !!DV.Interaction.extra.find((i) => i.id === 'h_dinner_seat'), asked: !!DV.State.flag('home_asked_leave') }));
  T.ok(re.step === 'night' && re.sleep && !re.seat && re.asked, 'loading resumes at bedtime with dinner already eaten', re);
  // sleep, and the night before
  await ev(() => { const it = DV.Interaction.extra.find((i) => i.id === 'h_sleep'); it.onUse(DV.Game, it); until(() => DV.Dialogue.isActive(), 400); });
  T.ok(/^ok/.test(await ev(() => QA.pick('coals'))), 'lying awake, you keep thinking about the coals');
  await ev(() => QA.pick('sleep'));
  const cer = await L.until(p, () => DV.Chapter.active && DV.Chapter.id === 'ceremony' && DV.Chapter.seqs.length > 0, 40000);
  T.ok(cer, 'morning: the Choosing Ceremony');
  const c0 = await ev(() => { const C = DV.Chapter; return { leaning: DV.State.data.story.leaning, day: DV.Clock.day(), t: DV.Clock.str(), actors: C.actors.length, order: C.order.map((x) => x.last).join(','), daniel: C.cands.find((a) => a.id === 'daniel_webb').cand.to, jenna: C.cands.find((a) => a.id === 'jenna_morales').cand.to, seated: DV.Player.state === 'sitting' && DV.Player.pinned }; });
  T.ok(c0.leaning === 'dauntless' && c0.day === 2 && c0.t === '10:00', 'day 2, 10:00 — and your leaning is remembered', c0);
  T.ok(c0.actors > 130 && c0.seated, 'the hall is full (' + c0.actors + ' people) and you are seated among the candidates');
  T.ok(/Young,Webb,Ward,Vickers,Thorne,Tester/.test(c0.order), 'names are called in reverse alphabetical order, yours included: ' + c0.order.split(',').slice(0, 6).join(', ') + '…');
  T.ok(c0.daniel === 'dauntless' && c0.jenna === 'candor', 'Daniel faces the coals because you got him to his test; Jenna stays Candor', c0);
  // hurry along to your turn
  const turn = await ev(() => until(() => DV.Chapter.myTurn, 6000) && { init: DV.Chapter.initCount, pinned: DV.Player.pinned });
  T.ok(turn && turn.init.dauntless >= 2 && turn.init.abnegation >= 1, 'three names in, they call yours', turn);
  await ev(() => QA.step(2));
  const cut = await ev(() => { DV.Player.place(23, 13.6, Math.PI); QA.step(0.1); DV.Interaction.update(DV.World.current, DV.Player); const id = DV.Interaction.current && DV.Interaction.current.id; DV.Interaction.use(DV.Game); QA.step(4); return id; });
  T.eq(cut, 'cer_knife', 'you take the knife');
  const bowl = await ev(() => { DV.Player.place(DV.Hub.BOWLS.dauntless, 13.35, Math.PI); QA.step(0.1); DV.Interaction.update(DV.World.current, DV.Player); const id = DV.Interaction.current && DV.Interaction.current.id; DV.Interaction.use(DV.Game); return [id, DV.Dialogue.active ? DV.Dialogue.active.view.text : '']; });
  T.ok(bowl[0] === 'cer_bowl_dauntless' && /kept coming back to/.test(bowl[1]) && /leave Erudite/.test(bowl[1]), 'over the coals: the moment remembers last night and what you\'d leave behind', bowl[1]);
  await ev(() => { QA.pick('let your blood'); QA.step(8); });
  const ch = await ev(() => ({ faction: DV.State.data.player.faction, transfer: !!DV.State.flag('transferred'), rep: DV.Reputation.get('dauntless'), choose: DV.Quests.obj('the_choosing', 'choose'), follow: DV.Quests.obj('the_choosing', 'follow') }));
  T.ok(ch.faction === 'dauntless' && ch.transfer && ch.rep > 0 && ch.choose === 'done' && ch.follow === 'active', 'your blood falls on the coals: Dauntless, a transfer', ch);
  // take your place, the rest choose, the doors open
  const end = await ev(() => { const s = DV.Chapter.mySpot; DV.Player.place(s.x, s.z, s.rot); QA.step(0.5); const ok = until(() => DV.Chapter.flag('finale'), 6000); QA.step(2); return { ok, q: DV.Quests.q('the_choosing').state, nf: DV.Quests.obj('new_faction', 'arrive'), leave: !!DV.Interaction.extra.find((i) => i.id === 'cer_leave'), exit: DV.Chapter.canPass('hub_exit') }; });
  T.ok(end.ok && end.q === 'complete' && end.nf === 'active', 'everyone has chosen; "The Choosing" complete', end);
  T.ok(end.leave && end.exit, 'the doors open and the Dauntless run for it');
  await ev(() => { const it = DV.Interaction.extra.find((i) => i.id === 'cer_leave'); it.onUse(DV.Game, it); });
  T.ok(await L.until(p, () => DV.Chapter.id === 'dauntless_run' && DV.Game.state === 'playing'), 'down to the tracks');
  T.noErrors(errs);
});
