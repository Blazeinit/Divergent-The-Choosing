// The Chalk Year, the director: the case opens when the first week ends, the mentor offers it, the
// proof and the clues and the trust are kept (and saved), the Case page shows them, and the episodes
// come in order (own case, the seventh circle, under the tracks, the night of the scan, the hearing).
const L = require('./lib.js');
L.run('the campaign: director, casebook, proof, trust, saves', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const begin = (f) => ev((f) => {
    const b = DV.UI.root.querySelector('#banner'); if (b) b.remove(); DV.UI.modalOpen = null;
    const a = DV.State.data.aptitude; a.status = 'complete'; a.result = f; a.recordedAs = f; a.divergent = true;
    DV.State.data.story.week = null; DV.State.data.story.campaign = null;
    DV.Build2.setFaction(f);
    DV.FirstWeek.begin(f);
  }, f);

  await begin('candor');
  await L.until(p, () => DV.Chapter.id === 'week_candor' && DV.Game.state === 'playing', 40000);
  T.ok(!(await ev(() => DV.Campaign.started())), 'before the first week is over there is no campaign');
  T.eq(await ev(() => DV.Campaign.next()), null, '…and nothing on offer');

  // the week ends (the banner, dismissed): the Act opens
  await ev(() => { DV.State.data.world.day = 5; DV.State.data.world.time = DV.U.parseTime('12:10'); DV.Chapter.load('week_candor', { step: 'end', instant: true, noFadeIn: true, noTitle: true }); QA.step(2); });
  await ev(() => DV.Campaign.afterBanner('candor'));
  const s0 = await ev(() => ({ started: DV.Campaign.started(), q: DV.Quests.state('camp_main'), next: DV.Campaign.next().id, act: DV.Campaign.st().act, flag: !!DV.State.flag('camp_started') }));
  T.ok(s0.started && s0.flag && /active|updated/.test(s0.q), 'the first week ends: The Chalk Year opens', s0);
  T.eq(s0.next, 'camp_c1', 'a Candor player is offered Candor\'s case first (The Sister)');
  T.eq(await ev(() => DV.Campaign.episode('camp_a1').faction), 'abnegation', 'each faction has its own case');

  // trust starts from what you did in the first weeks
  const tr = await ev(() => { DV.State.setFlag('rosa_protects'); DV.Campaign.st().seeded = false; DV.Campaign.seedTrust(); return { rosa: DV.Campaign.trustOf('rosa'), park: DV.Campaign.trustOf('park'), joan: DV.Campaign.trustOf('joan') }; });
  T.ok(tr.rosa >= 3 && tr.park >= 1 && tr.park <= 2 && tr.joan >= 1 && tr.joan <= 2, 'trust is seeded from the first week (Rosa protects you; strangers start low)', tr);
  const tr2 = await ev(() => { DV.Campaign.trust('joan', 2, 'You kept her list.'); DV.Campaign.trust('joan', 9); return [DV.Campaign.trustOf('joan'), DV.Campaign.comes('joan')]; });
  T.ok(tr2[0] === 5 && tr2[1] === true, 'trust moves and is capped at 5; someone who trusts you comes when called', tr2);
  await ev(() => DV.Campaign.kill('joan', 'test'));
  T.ok(await ev(() => !DV.Campaign.comes('joan') && DV.Campaign.isDead('joan')), 'a dead ally does not come');

  // the mentor offers the case
  const ro = await ev(() => { B.use('rosa_talk'); const v = DV.Dialogue.active && DV.Dialogue.active.view; return v ? v.choices.map((c) => c.label) : null; });
  T.ok(ro && ro.some((l) => /The case/.test(l)), 'Rosa has a line about the case once it is open', ro);
  await ev(() => QA.end());

  // the proof and the clues
  const pf = await ev(() => {
    const K = DV.Campaign, a = K.give('ledger', 'kept'), b = K.give('ledger', 'kept'), c = K.give('manifest', 'handed');
    K.clue('night_log_dc', 'The night log is initialled D.C.', { suspect: 'dana' });
    K.clue('night_log_dc', 'again');
    K.clue('park_dc', 'Dr. Park\'s notes name a Dauntless liaison: D.C.', { suspect: 'dana' });
    K.clue('mary_tin', 'A Dauntless woman collects the tin.', { suspect: 'mary' });
    return { a, b, c, count: K.count(), proof: K.proofCount(), dana: K.suspectScore('dana'), mary: K.suspectScore('mary'), clues: K.st().clues.filter((x) => x.kind === 'clue').length };
  });
  T.ok(pf.a && !pf.b && pf.c && pf.count === 2 && pf.proof === 2, 'a piece is given once (and `kept` beats `handed`)', pf);
  T.ok(pf.dana === 2 && pf.mary === 1 && pf.clues === 3, 'clues are logged once and count against the right suspect', pf);

  // the Case page
  await ev(() => { DV.RPGMenu.open('case'); });
  const page = await ev(() => { const c = document.querySelector('#rpgmenu .content'); return { text: c.textContent, tab: document.querySelector('#rpgmenu .tab[data-id=case]').style.display }; });
  T.ok(page.tab !== 'none' && /The Case/.test(page.text) && /Proof/.test(page.text) && /People/.test(page.text) && /Notes/.test(page.text), 'the Case page is in the Tab menu with the case, the proof, the people and the notes', { tab: page.tab });
  T.ok(/Marta/.test(page.text) && /D\.C\./.test(page.text) && /Rosa Medina/.test(page.text), 'it shows what you hold, what you have noted and who stands with you');
  await ev(() => { DV.RPGMenu.close(); });

  // the order of the episodes
  const ord = await ev(() => {
    const K = DV.Campaign, ids = [];
    for (let i = 0; i < 12; i++) { const n = K.next(); if (!n) break; ids.push(n.id); K.st().ep[n.id] = 'done'; }
    return { ids, openAfter: K.next() };
  });
  T.eq(ord.ids.join(','), 'camp_c1,camp_c2,camp_x1,camp_x2,camp_x3,camp_z1', 'the episodes come in order: your case, the seventh circle, under the tracks, the scan, the hearing', ord);

  // endings
  const end = await ev(() => {
    const K = DV.Campaign;
    const r = { before: K.eligible('open_air'), tracks: K.eligible('under_the_tracks'), quiet: K.eligible('the_quiet') };
    DV.State.setFlag('camp_leak_named'); K.give('chalk', 'kept'); K.give('tally', 'kept'); K.give('lot33', 'kept');
    r.after = K.eligible('open_air'); r.fence = K.eligible('beyond_the_fence');
    return r;
  });
  T.ok(!end.before && end.after && end.tracks && !end.quiet && end.fence, 'OPEN AIR needs four proofs and the leak named; the tracks are always open; THE QUIET needs Vance\'s offer', end);

  // a save keeps all of it
  await ev(() => { DV.Game.state = 'playing'; DV.Save.write('4'); });
  await ev(() => { DV.State.data.story.campaign = null; });
  await ev(() => DV.Game.loadSlot('4'));
  await L.until(p, () => DV.Game.state === 'playing', 30000);
  const back = await ev(() => ({ started: DV.Campaign.started(), proof: DV.Campaign.proofCount(), dana: DV.Campaign.suspectScore('dana'), dead: DV.Campaign.isDead('joan'), chapter: DV.Chapter.id, step: DV.Chapter.step, day: DV.Clock.day() }));
  T.ok(back.started && back.proof === 5 && back.dana === 2 && back.dead, 'a save carries the case, the proof, the clues and who is dead', back);
  T.ok(back.chapter === 'week_candor' && back.step === 'end' && back.day === 5, 'and loads back into your headquarters, free to walk about', back);

  // coming home from an episode keeps the story's own day
  await ev(() => { DV.State.data.world.day = 9; DV.State.data.world.time = DV.U.parseTime('18:00'); DV.Campaign.home(); });
  await L.until(p, () => DV.Chapter.id === 'week_candor' && DV.Chapter.step === 'end' && DV.Game.state === 'playing', 30000);
  T.eq(await ev(() => DV.Clock.day()), 9, 'coming home from an episode keeps the day (the week\'s own clock is not put back)');

  T.noErrors(errs);
});
