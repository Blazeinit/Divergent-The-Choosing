// The trials of the other four factions, Day 6: Erudite's Gallery B (the transmitter serum, the
// intercom), Abnegation's bread line (an Order patrol coming down the street), Amity's second supper
// (the quarrel that stops when the bread goes round, the tin, the basket), and Candor's Hearing as a
// full scene (the new questions, the room watching, a Divergent player holding one answer in). Each
// ends on its banner and comes home to the week's free roam.
const L = require('./lib.js');
L.run('the trials: Erudite, Abnegation, Amity, Candor', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const banner = async () => {
    const ok = await L.until(p, () => !!document.getElementById('banner'), 90000, 0.5);
    const t = ok ? await ev(() => ({ b1: document.querySelector('#banner .b1').textContent, b2: document.querySelector('#banner .b2').textContent })) : null;
    await p.waitForTimeout(1700); // (a banner ignores clicks for its first second and a half)
    await ev(() => { const b = document.getElementById('banner'); if (b) b.click(); });
    return t;
  };

  /* ---------------- Erudite: Gallery B ---------------- */
  await ev(() => DV.Dev.jump('trial', 'erudite'));
  T.ok(await L.until(p, () => DV.Chapter.id === 'trial_erudite', 60000), 'Erudite: Dr. Park takes you down to Gallery B');
  await ev(() => QA.step(26)); await L.shot(p, 'trial_erudite_gallery');
  T.ok(await L.until(p, () => DV.Chapter.flag('free'), 90000, 1.0), 'behind the glass: the transmitter serum, and a Dauntless volunteer doing as a voice tells him, wide awake');
  const seen = await ev(() => { const r = [B.use('sl_vials'), B.use('sl_monitor')]; DV.UI.closeReading(); return r; });
  T.ok(seen.every((x) => /^used/.test(x)) && await ev(() => DV.State.flag('saw_transmitter_serum') && DV.State.flag('saw_divergent_nonresponse')), 'the vials ("tracker", one for every member) and the monitor (subject seven: no response)');
  T.ok(await L.until(p, () => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'tr_park_cover', 30000, 0.3), 'the intercom: someone upstairs has noticed the gallery isn\'t empty');
  await ev(() => { QA.pick('note-taker'); QA.end(); });
  const pk = await ev(() => { B.use('talk_park'); return [QA.pick('leash'), QA.pick(''), QA.pick('seen enough')]; });
  T.ok(pk.every((x) => /^ok/.test(x)), 'Dr. Park: "It\'s both."', pk);
  const eb = await banner();
  T.ok(eb && eb.b1 === 'GALLERY B' && /VIALS/.test(eb.b2), 'Erudite: ' + (eb && eb.b2), eb);
  T.ok(await L.until(p, () => DV.Chapter.id === 'week_erudite' && DV.Chapter.step === 'end' && DV.Game.state === 'playing', 90000), '…and home to the lab, free to walk about');
  T.ok(await ev(() => DV.Trials.done('erudite') && DV.Campaign.hasClue('s9_tracker')), 'remembered: the trial, and the clue in the Casebook');

  /* ---------------- Abnegation: the bread line ---------------- */
  await ev(() => DV.Dev.jump('trial', 'abnegation'));
  T.ok(await L.until(p, () => DV.Chapter.id === 'trial_abnegation' && DV.Game.state === 'playing', 60000), 'Abnegation: Joan\'s cart at the corner, and the queue');
  await ev(() => { for (let i = 0; i < 3; i++) { B.use('bl_give'); QA.step(1.8); } });
  T.ok(await L.until(p, () => DV.Chapter.patrolOn, 40000, 0.5), 'an Order patrol comes down the street');
  await ev(() => QA.step(6)); await L.shot(p, 'trial_abnegation_patrol');
  const pt = await ev(() => { B.use('bl_patrol'); const r = [QA.pick('bread'), QA.end()]; return { r, stall: DV.Chapter.stall }; });
  T.ok(pt.stall > 0, 'you talk the supervisor down: "It\'s bread. It isn\'t a meeting."', pt);
  await ev(() => { for (let i = 0; i < 12; i++) { B.use('bl_give'); QA.step(1.8); } });
  T.ok(await L.until(p, () => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'tr_joan', 40000, 0.4), 'every loaf handed out; Joan folds the cloth');
  await ev(() => { QA.pick('Thursday'); });
  const ab = await banner();
  T.ok(ab && /10 OF 10 FED/.test(ab.b2) && await ev(() => !!DV.State.flag('breadline_all')), 'Abnegation: ' + (ab && ab.b2), ab);
  await L.until(p, () => DV.Chapter.id === 'week_abnegation' && DV.Game.state === 'playing', 90000);

  /* ---------------- Amity: the second supper ---------------- */
  await ev(() => DV.Dev.jump('trial', 'amity'));
  T.ok(await L.until(p, () => DV.Chapter.id === 'trial_amity', 60000), 'Amity: the long tables, and a quarrel over a spade');
  await ev(() => QA.step(14)); await L.shot(p, 'trial_amity_quarrel');
  T.ok(await L.until(p, () => DV.Interaction.extra.some((i) => i.id === 'pb_bread'), 120000, 2.0), 'the bread goes round; the quarrel stops mid-sentence; the basket comes to you');
  const am = await ev(() => { const r = [B.use('pb_tin')]; DV.UI.closeReading(); r.push(B.use('pb_bread'), QA.pick('Eat')); return { r, flag: !!DV.State.flag('knows_peace_bread'), noticed: !!DV.State.flag('noticed_peace_bread') }; });
  T.ok(am.flag && am.noticed && /^ok/.test(am.r[2]), 'you noticed — and the tin by Mary\'s elbow says SERIES 7, FOR THE BREAD; you eat it anyway', am);
  await ev(() => QA.step(3)); await L.shot(p, 'trial_amity_bread');
  T.ok(await ev(() => !!document.querySelector('.peace-hud') && /sepia/.test(DV.Game.renderer.domElement.style.filter)), 'everything goes the colour of honey');
  T.ok(await L.until(p, () => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'tr_mary', 60000, 0.5), 'Mary sits down beside you');
  await ev(() => { QA.pick('choose'); QA.pick(''); });
  const mb = await banner();
  T.ok(mb && /ATE IT/.test(mb.b2), 'Amity: ' + (mb && mb.b2), mb);
  await L.until(p, () => DV.Chapter.id === 'week_amity' && DV.Game.state === 'playing', 90000);
  T.eq(await ev(() => DV.Game.renderer.domElement.style.filter), '', 'and the picture comes back to normal');

  /* ---------------- Candor: the Hearing ---------------- */
  await ev(() => { DV.State.data.aptitude.divergent = true; DV.State.data.aptitude.status = 'complete'; DV.Dev.jump('trial', 'candor'); });
  T.ok(await L.until(p, () => DV.Chapter.id === 'week_candor' && DV.Chapter.step === 'hearing' && DV.Game.state === 'playing', 60000), 'Candor: the Hearing');
  await ev(() => { QA.step(2.5); B.use('hr_chair'); QA.step(4); });
  await L.shot(p, 'trial_candor_hearing');
  T.ok(await L.until(p, () => DV.Activity.is('serum'), 40000, 0.4), 'the chair, the room, the needle');
  const sr = await ev(() => {
    let n = 0, qs = [], room = false;
    while (DV.Activity.current && n++ < 9000) {
      const A = DV.Activity.current;
      if (A.cur && qs.indexOf(A.cur.q.id) < 0) qs.push(A.cur.q.id);
      if (A.phase === 'answer' && A.cur && A.cur.q.id === 'apt' && A.cur.mode === 'truth') { DV.Input.keys.Space = true; if (A.cur.held >= 2.05) { DV.Input.keys.Space = false; DV.Input.pressed.KeyE = true; } } else DV.Input.keys.Space = false;
      if (document.querySelector('.serum-room')) room = true;
      QA.step(0.05);
    }
    DV.Input.keys.Space = false;
    return { qs, room, s: DV.FirstWeek.was('serum') };
  });
  T.ok(sr.qs.indexOf('family') >= 0 && sr.qs.indexOf('other') >= 0 && sr.room, 'the questions go on: your family, the faction you wish you\'d chosen — and the room watching you on screen', sr);
  T.ok(sr.s && sr.s.lies === 1 && !sr.s.fought, 'a Divergent player holds one answer in, quietly', sr.s);
  T.noErrors(errs);
});
