// The Chalk Year, every episode played by a bot: look at everything, talk to everyone, step out of the way
// of whoever is coming, make the choice, and the episode ends (the case moves on). Then the hearing, in all
// its endings, and the walking check (everything in every episode can be walked to).
const L = require('./lib.js');
const EPS = [
  ['camp_d1', 'dauntless'], ['camp_d2', 'dauntless'], ['camp_c1', 'candor'], ['camp_c2', 'candor'], ['camp_e1', 'erudite'], ['camp_e2', 'erudite'],
  ['camp_a1', 'abnegation'], ['camp_a2', 'abnegation'], ['camp_m1', 'amity'], ['camp_m2', 'amity'], ['camp_x1', 'candor'], ['camp_x2', 'candor'], ['camp_x3', 'candor'],
];
L.run('the campaign: every episode played through', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const setup = (f) => ev((f) => {
    const b = DV.UI.root.querySelector('#banner'); if (b) b.remove(); DV.UI.modalOpen = null;
    const a = DV.State.data.aptitude; a.status = 'complete'; a.result = f; a.recordedAs = f; a.divergent = true;
    DV.State.data.story.campaign = null; DV.State.data.story.week = null;
    DV.Build2.setFaction(f);
    DV.Campaign.begin(f);
    for (const id of Object.keys(DV.Campaign.ALLIES)) DV.Campaign.st().trust[id] = 3;
  }, f);
  // one episode: everything seen, everyone talked to, the risk survived, the choice made
  const play = (id, pick) => ev(([id, pick]) => {
    DV.Dialogue.active && DV.Dialogue.end(true);
    DV.Chapter.start(id, { instant: true, noFadeIn: true, noTitle: true });
    QA.step(2);
    const out = { id, things: 0, talks: 0, finale: null, risk: null, done: false, ending: null };
    const sp = DV.World.current.def.spawn;
    for (const it of DV.Interaction.extra.slice()) {
      if (/^look_/.test(it.id)) {
        const r = B.use(it.id); if (DV.UI.modalOpen === 'reading') DV.UI.closeReading(); if (/^used/.test(r)) out.things++;
        if (DV.Dialogue.active && DV.Dialogue.active.tree.id === 'camp_x2_deduce') { QA.pick('Dana'); QA.end(); }
      }
    }
    for (const it of DV.Interaction.extra.slice()) {
      if (!/^talk_/.test(it.id)) continue;
      const r = B.use(it.id);
      if (!/^used/.test(r)) continue;
      out.talks++;
      for (let n = 0; n < 12 && DV.Dialogue.active; n++) {
        const v = DV.Dialogue.active.view;
        const ch = v.choices.find((c) => c.enabled && !/^That is all|^Go on|^Goodbye|^Continue|^I will look again|^Yes\./.test(c.label)) || v.choices.find((c) => c.enabled);
        DV.Dialogue.choose(ch.index);
      }
      QA.end();
    }
    DV.Player.place(sp.x, sp.z, sp.rot || 0);
    // the risk: someone comes; we stand at the spawn, clear of the work
    for (let i = 0; i < 400 && !(DV.Campaign.st().prog[id] && DV.Campaign.st().prog[id].risk) && DV.Chapter.E && DV.Chapter.E.risk; i++) QA.step(0.1);
    out.risk = DV.Campaign.st().prog[id] && DV.Campaign.st().prog[id].risk;
    return out;
  }, [id, pick]);
  const finish = (id, pick) => ev(([id, pick]) => {
    const F = DV.Chapter.E.finale;
    DV.Player.place(F.x, F.z + 0.9, Math.PI);
    QA.step(0.2);
    const r = B.use('camp_finale');
    if (!DV.Dialogue.active) return { r, dialogue: false };
    const v = DV.Dialogue.active.view;
    const en = v.choices.filter((c) => c.enabled);
    DV.Dialogue.choose(en[Math.min(pick || 0, en.length - 1)].index);
    for (let i = 0; i < 80 && !document.getElementById('banner') && !DV.UI.modalOpen; i++) QA.step(0.1);
    if (DV.UI.modalOpen === 'reading') DV.UI.closeReading();
    for (let i = 0; i < 40 && !document.getElementById('banner'); i++) QA.step(0.1);
    return { r, dialogue: true, banner: !!document.getElementById('banner'), done: DV.Campaign.done(id), outcome: DV.Campaign.st().outcomes[id], options: en.length };
  }, [id, pick]);

  for (const [id, f] of EPS) {
    await setup(f);
    if (id === 'camp_x2') await ev(() => { DV.Campaign.st().pieces = {}; });
    const a = await play(id);
    T.ok(a.things >= 1 && a.risk !== undefined, id + ': ' + a.things + ' things looked at, ' + a.talks + ' people talked to' + (a.risk ? ', the risk: ' + a.risk : ''), a);
    const r = await finish(id, 0);
    T.ok(r.dialogue && r.done, id + ': the choice is made and the episode ends (' + r.outcome + ')', r);
    await ev(() => { const b = document.getElementById('banner'); if (b) b.remove(); DV.UI.modalOpen = null; });
  }

  // for real: the case is offered, taken with a fade, played, and the banner brings you home
  await setup('candor');
  await ev(() => { DV.Chapter.load('week_candor', { step: 'end', instant: true, noFadeIn: true, noTitle: true }); QA.step(2); DV.State.data.world.day = 7; DV.State.data.world.time = DV.U.parseTime('08:00'); });
  const offer = await ev(() => { B.use('rosa_talk'); const c = DV.Dialogue.active.view.choices.find((x) => /The case/.test(x.label)); DV.Dialogue.choose(c.index); return true; });
  await L.until(p, () => !!document.querySelector('.panel.modal .body'), 8000);
  T.ok(await ev(() => !!document.querySelector('.panel.modal .body') && /Hollis/.test(document.querySelector('.panel.modal .body').textContent)), 'Rosa offers the case: a card with the summary and the day');
  await ev(() => document.querySelector('.panel.modal .b-yes').click());
  T.ok(await L.until(p, () => DV.Chapter.id === 'camp_c1' && DV.Game.state === 'playing', 30000), 'taking it fades into the first chapter, on the right day (' + 'Day 7' + ')');
  T.eq(await ev(() => DV.Clock.day()), 7, 'the clock is the story\'s');
  const rr = await play('camp_c1'); const ff = await finish('camp_c1', 0);
  T.ok(ff.done && ff.banner, 'the chapter ends on a banner', ff);
  // (the banner ignores clicks for its first moment and 1.5 s of real time can be slow to pass under load: keep clicking until it goes)
  T.ok(await L.until(p, () => { const b = document.getElementById('banner'); if (b && b.classList.contains('on')) b.click(); return DV.Chapter.id === 'week_candor' && DV.Chapter.step === 'end' && DV.Game.state === 'playing'; }, 30000), 'and the banner brings you back to your headquarters');
  T.eq(await ev(() => DV.Campaign.next().id), 'camp_c2', 'where the next chapter of the case is on offer');
  T.eq(await ev(() => DV.Clock.day()), 7, 'on the same day');

  // the caught branch: stay in the work when the Lieutenant arrives
  await setup('dauntless');
  const caught = await ev(() => {
    DV.Chapter.start('camp_d1', { instant: true, noFadeIn: true, noTitle: true }); QA.step(2);
    for (const it of DV.Interaction.extra.slice()) { if (/^look_/.test(it.id)) { B.use(it.id); if (DV.UI.modalOpen === 'reading') DV.UI.closeReading(); } }
    B.use('talk_bo'); while (DV.Dialogue.active) { const v = DV.Dialogue.active.view; const c = v.choices.find((x) => x.enabled && !/^That is all/.test(x.label)); if (!c) break; DV.Dialogue.choose(c.index); } QA.end();
    DV.Player.place(22, 8.6, 0);
    const t0 = DV.Campaign.trustOf('bo');
    for (let i = 0; i < 400 && !DV.Campaign.st().prog.camp_d1.risk; i++) { DV.Player.place(22, 8.6, 0); QA.step(0.1); }
    const r = { risk: DV.Campaign.st().prog.camp_d1.risk, tree: DV.Dialogue.active && DV.Dialogue.active.tree.id, bo: [t0, DV.Campaign.trustOf('bo')] };
    QA.end();
    return r;
  });
  T.ok(caught.risk === 'caught' && caught.tree === 'camp_d1_caught' && caught.bo[1] < caught.bo[0], 'standing in the circle when the Lieutenant arrives: he speaks to you, and Bo trusts you less', caught);

  // the hearing, all five ways
  const ends = [['present', 'open_air'], ['the_quiet', 'the_quiet'], ['under_the_tracks', 'under_the_tracks'], ['beyond_the_fence', 'beyond_the_fence'], ['the_quiet_passes', 'the_quiet_passes']];
  for (const [opt, want] of ends) {
    await setup('candor');
    await ev((opt) => {
      const K = DV.Campaign;
      for (const [pc, how] of [['chalk', 'kept'], ['ledger', 'kept'], ['lot33', 'kept'], ['tally', 'kept']]) K.give(pc, how);
      DV.State.setFlag('camp_leak_named');
      if (opt === 'the_quiet') DV.State.setFlag('camp_vance_offer');
      if (opt === 'the_quiet_passes') { K.st().pieces = {}; }
      for (const k of ['camp_c1', 'camp_c2', 'camp_x1', 'camp_x2', 'camp_x3']) K.st().ep[k] = 'done';
      DV.Chapter.start('camp_z1', { instant: true, noFadeIn: true, noTitle: true }); QA.step(2);
      for (const it of DV.Interaction.extra.slice()) if (/^look_|^talk_vance/.test(it.id)) { B.use(it.id); if (DV.UI.modalOpen === 'reading') DV.UI.closeReading(); QA.end(); }
    }, opt);
    const labels = { present: /^Present/, the_quiet: /^Accept/, under_the_tracks: /^Walk out/, beyond_the_fence: /^Leave by the gate/, the_quiet_passes: /^Say nothing/ };
    const res = await ev((src) => {
      const F = DV.Chapter.E.finale; DV.Player.place(F.x, F.z + 0.9, Math.PI); QA.step(0.2);
      B.use('camp_finale');
      const re = new RegExp(src);
      const c = DV.Dialogue.active && DV.Dialogue.active.view.choices.find((x) => x.enabled && re.test(x.label));
      if (!c) return { missing: true, labels: DV.Dialogue.active && DV.Dialogue.active.view.choices.map((x) => x.label) };
      DV.Dialogue.choose(c.index);
      // the last scene plays out first (the vote, counted hand by hand, or the way you leave)
      let hands = 0, cut = false;
      for (let i = 0; i < 450 && DV.UI.modalOpen !== 'reading'; i++) { QA.step(0.1); cut = cut || DV.Chapter.cutscene; hands = Math.max(hands, (DV.Chapter.cast.council || []).filter((a) => /vote$/.test(a.action)).length); }
      const read = document.querySelector('#reading .panel-title') && document.querySelector('#reading .panel-title').textContent;
      if (DV.UI.modalOpen === 'reading') DV.UI.closeReading();
      const ec = document.querySelector('#endcredits:not(.out)'); // (the last ending's roll may still be fading out)
      const credits = !!ec && /THE CHALK YEAR/.test(ec.textContent);
      return { credits, ending: DV.Campaign.st().ending, read, banner: !!document.getElementById('banner'), hands, cut, council: (DV.Chapter.cast.council || []).length };
    }, labels[opt].source);
    T.ok(res.ending === want && res.credits && res.cut, 'the hearing, ' + opt + ' → ' + want + ' (' + (res.read || '') + '): a closing scene, the epilogue, and the credits roll', res);
    if (opt === 'present') T.ok(res.council === 10 && res.hands >= 7, 'the vote is counted on screen: ' + res.hands + ' of ' + res.council + ' hands go up against the Act', res);
    if (opt === 'the_quiet_passes') T.ok(res.hands === 2, 'say nothing, and only two hands go up', res);
    await L.until(p, () => { const e = document.querySelector('#endcredits:not(.out)'); return e && e.dataset.armed === '1'; }, 8000);
    const pre = await ev(() => { const e = document.querySelectorAll('#endcredits:not(.out)'); const r = { n: e.length, armed: e[0] && e[0].dataset.armed, out: e[0] && e[0].className, modal: DV.UI.modalOpen, banner: !!document.getElementById('banner') }; if (e[0]) e[0].click(); return r; });
    const okb = await L.until(p, () => !!document.getElementById('banner'), 8000);
    T.ok(okb, '…which a click skips, to the closing banner', okb ? undefined : Object.assign(pre, await ev(() => ({ after: document.querySelectorAll('#endcredits').length, modal: DV.UI.modalOpen, state: DV.Game.state, ending: DV.Campaign.st().ending, ep: DV.Campaign.st().ep.camp_z1 }))));
    await ev(() => { const b = document.getElementById('banner'); if (b) b.remove(); DV.UI.modalOpen = null; });
  }
  T.noErrors(errs);
});
