// Build 3, the other four factions: a first week each, played start to finish by a bot.
//   Candor     — the evidence, the Hollis interview (call the lies with the right paper), the
//                verdict, the truth game, the Hearing (a Divergent player holds one answer in)
//   Erudite    — the flasks and the relay board (solved with their own solvers), the night
//                errand to Dr. Park's office past the archivist, the examination
//   Abnegation — the supply run (ask first, then give), dinner, the envelope past the patrol
//   Amity      — both sides of the water dispute, the culvert dig, the circle, the bread
// Each ends on the Build 3 banner, and a save made after it loads back into free roam.
const L = require('./lib.js');
L.run('Build 3: the first week (Candor, Erudite, Abnegation, Amity)', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const begin = (f, div) => ev(([f, div]) => {
    const b = DV.UI.root.querySelector('#banner'); if (b) b.remove(); DV.UI.modalOpen = null;
    const a = DV.State.data.aptitude; a.status = 'complete'; a.result = f; a.recordedAs = f; a.divergent = div;
    DV.State.data.story.week = null;
    DV.Build2.setFaction(f);
    DV.FirstWeek.begin(f);
  }, [f, div]);
  const banner = async (f) => {
    const ok = await L.until(p, () => !!document.getElementById('banner'), 20000);
    return ok ? ev((f) => ({ b2: document.querySelector('#banner .b2').textContent, q: DV.Quests.state('week_' + f), pct: DV.FirstWeek.pct(), step: DV.Chapter.step }), f) : null;
  };
  const reload = async (f) => {
    await ev(() => { const b = DV.UI.root.querySelector('#banner'); if (b) b.remove(); DV.UI.modalOpen = null; DV.Game.state = 'playing'; DV.Save.write('4'); DV.Game.loadSlot('4'); });
    await L.until(p, () => DV.Chapter.active && DV.Game.state === 'playing', 30000);
    return ev(() => ({ id: DV.Chapter.id, step: DV.Chapter.step, banner: !!document.getElementById('banner'), seqs: DV.Chapter.seqs.length }));
  };

  /* ============================== Candor ============================== */
  await begin('candor', true);
  T.ok(await L.until(p, () => DV.Chapter.id === 'week_candor' && DV.Game.state === 'playing', 30000), 'Candor: the first week starts the morning of Day 3');
  await ev(() => QA.step(16));
  const evd = await ev(() => { const out = ['ev_report', 'ev_ledger', 'ev_coat', 'ev_coat'].map((id) => { const r = B.use(id); DV.UI.closeReading(); return r; }); return { out, e: DV.FirstWeek.st().evidence, obj: DV.Quests.obj('week_candor', 'interview') }; });
  T.ok(evd.e.ledger && evd.e.ticket && evd.e.note && evd.obj === 'active', 'Candor: the ledger, the ticket, the note in the lining — and the interview opens', evd);
  await ev(() => B.use('iv_sit'));
  const iv = await ev(() => {
    const S = DV.WeekCandor.STATEMENTS, E = DV.WeekCandor.EVIDENCE, done = {}, did = [];
    let n = 0;
    while (DV.Activity.current && DV.Activity.current.id === 'interview' && n++ < 4000) {
      const A = DV.Activity.current;
      if (A.phase === 'window' && !done[A.i]) {
        done[A.i] = true;
        const s = S[A.i];
        // call statement 5 (the back door — true) a lie, on purpose
        if (s.lie || A.i === 4) { DV.Input.pressed.MouseLeft = true; QA.step(0.05); DV.Input.pressed['Digit' + E[s.ev === 'any' || !s.ev ? 'ledger' : s.ev].key] = true; did.push('challenge'); }
        else { DV.Input.pressed.Space = true; did.push('stand'); }
      }
      QA.step(0.05);
    }
    return { did, h: DV.FirstWeek.was('hollis'), m: DV.FirstWeek.st().marks.interview, tree: DV.Dialogue.active && DV.Dialogue.active.tree.id };
  });
  T.ok(iv.h && iv.h.cracked === 5 && iv.h.wrong === 1 && iv.h.confessed && iv.h.motive, 'Candor: five lies caught with the right evidence, one truth called a lie, and he breaks', iv.h);
  T.eq(iv.m && iv.m.pts, 9, 'Candor: the interview is marked (2 per lie caught, −1 for the truth you called a lie)');
  await ev(() => { QA.pick('thank'); QA.end(); QA.step(3); });
  const vd = await ev(() => { B.use('rosa_talk'); return [DV.Dialogue.active && DV.Dialogue.active.tree.id, QA.pick('sister'), QA.pick('thank')]; });
  T.ok(vd[0] === 'cand_verdict' && /full/.test(vd[1]), 'Candor: the whole truth to Rosa, motive and all', vd);
  // a save straight after the verdict carries on to the evening when it's loaded
  await ev(() => { DV.Save.write('4'); DV.Game.loadSlot('4'); });
  T.ok(await L.until(p, () => DV.Chapter.step === 'evening' && DV.Game.state === 'playing', 40000), 'Candor: Day 3, evening, in the dormitory (via a save made right after the verdict)');
  const game = await ev(() => { B.use('join_game'); return [QA.pick('rather know'), QA.pick('myself'), QA.pick('aptitude'), QA.pick(''), QA.pick('good night')]; });
  T.ok(game.every((x) => /^ok/.test(x)), 'Candor: the truth game ("something about my aptitude test")', game);
  T.ok(await ev(() => B.wait(() => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'cand_rosa_night', 30)), 'Candor: Rosa was listening at the door');
  const warn = await ev(() => [QA.node(), QA.pick('thank'), QA.pick('')]);
  T.eq(warn[0], 'warn', 'Candor: she warns you about the serum');
  await ev(() => { QA.end(); B.use('week_sleep'); });
  T.ok(await L.until(p, () => DV.Chapter.step === 'hearing' && DV.Game.state === 'playing', 40000), 'Candor: Day 5, the Hearing');
  await ev(() => { QA.step(2.5); B.use('hr_chair'); });
  T.ok(await ev(() => B.wait(() => DV.Activity.is('serum'), 20)), 'Candor: the chair, the needle, the serum');
  const serum = await ev(() => {
    let n = 0;
    while (DV.Activity.current && n++ < 6000) {
      const A = DV.Activity.current;
      if (A.phase === 'answer' && A.cur && A.cur.q.id === 'apt' && A.cur.mode === 'truth') { DV.Input.keys.Space = true; if (A.cur.held >= 2.05) { DV.Input.keys.Space = false; DV.Input.pressed.KeyE = true; } }
      else DV.Input.keys.Space = false;
      QA.step(0.05);
    }
    DV.Input.keys.Space = false;
    return DV.FirstWeek.was('serum');
  });
  T.ok(serum && serum.lies === 1 && !serum.fought, 'Candor: a Divergent player holds one answer in — quietly', serum);
  T.ok(await ev(() => B.wait(() => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'cand_rosa_after', 20)), 'Candor: …and Rosa saw your hands not move');
  await ev(() => { QA.pick('report'); QA.pick(''); QA.end(); QA.step(1); });
  const st = await ev(() => B.readBody());
  T.ok(/Standings|order/.test('Standings ' + (st || '')) && /Tester/.test(st || ''), 'Candor: the week\'s standings, read out in the corridor');
  const cb = await banner('candor');
  T.ok(cb && /RANKED/.test(cb.b2) && /HELD IT IN/.test(cb.b2) && cb.q === 'complete' && cb.step === 'end', 'Candor: FIRST WEEK COMPLETE — ' + (cb && cb.b2), cb);
  T.ok(await ev(() => DV.State.flag('rosa_knows') && DV.State.flag('resisted_truth_serum')), 'Candor: what happened is remembered (rosa_knows, resisted_truth_serum)');
  const cr = await reload('candor');
  T.ok(cr.id === 'week_candor' && cr.step === 'end' && !cr.banner && !cr.seqs, 'Candor: a save after the banner loads back into the corridor', cr);

  /* ============================== Erudite ============================== */
  await begin('erudite', true);
  T.ok(await L.until(p, () => DV.Chapter.id === 'week_erudite' && DV.Game.state === 'playing', 30000), 'Erudite: the first week starts in the lab');
  await ev(() => { QA.step(12); B.use('bench_vessels'); });
  const vx = await ev(() => {
    const W = DV.WeekErudite;
    let n = 0, wrong = false;
    while (DV.Activity.is('vessels') && n++ < 3000) {
      const A = DV.Activity.current;
      if (!A.anim && !(A.wait > 0) && A.R) {
        let mv = W.solve(A.R.caps, A.level, A.R.target)[0];
        if (A.r === 1 && !wrong) { wrong = true; mv = [0, 2]; }
        if (mv) { DV.Input.pressed['Digit' + (mv[0] + 1)] = true; QA.step(0.05); DV.Input.pressed['Digit' + (mv[1] + 1)] = true; }
      }
      QA.step(0.05);
    }
    return DV.FirstWeek.was('vessels_done');
  });
  T.ok(vx && vx.length === 2 && vx[0].pours === vx[0].opt && vx[1].pours === vx[1].opt + 1, 'Erudite: bench one — four litres in the fewest pours, then five in one more than the fewest', vx);
  await ev(() => { QA.step(2); B.use('bench_relays'); });
  const rl = await ev(() => { const A = DV.Activity.current; const sol = DV.WeekErudite.minPresses(A.board); for (const i of sol) { A.cur = i; DV.Input.pressed.KeyE = true; QA.step(0.05); } QA.step(3); return DV.FirstWeek.was('relays_done'); });
  T.ok(rl && rl.presses === rl.min && !rl.gaveUp, 'Erudite: bench two — the relay board lit in the fewest switches', rl);
  await ev(() => QA.step(16));
  T.ok(await ev(() => DV.FirstWeek.was('office_key') && DV.Quests.obj('week_erudite', 'errand') === 'active'), 'Erudite: Dr. Park hands you her office key');
  await ev(() => B.use('week_sleep'));
  T.ok(await L.until(p, () => DV.Chapter.step === 'night' && DV.Game.state === 'playing', 40000), 'Erudite: Day 4, 21:25');
  T.ok(await ev(() => { const d = DV.World.current.doors.find((x) => x.def.id === 'el_office_door'); return DV.Story.playerCanPass(d.lock, d); }), 'Erudite: the key opens Dr. Park\'s office');
  const red = await ev(() => { DV.Player.place(27, 7, Math.PI); B.use('grey_folder'); B.use('red_folder'); const t = B.readBody(); return [t && t.indexOf('TESTER') >= 0, DV.Dialogue.active && DV.Dialogue.active.tree.id, QA.pick('tear'), QA.pick('')]; });
  T.ok(red[0] && red[1] === 'eru_red' && /ok/.test(red[2]), 'Erudite: the red folder — your own name in it, and you tear out the page', red);
  const caught = await ev(() => { B.wait(() => DV.Dialogue.isActive(), 40); return [DV.Dialogue.active && DV.Dialogue.active.tree.id, QA.pick('grey folder'), QA.pick('')]; });
  T.eq(caught[0], 'eru_caught', 'Erudite: still in the office when the archivist reaches the door — caught');
  await ev(() => { QA.end(); DV.Player.place(5, 13.5, -Math.PI / 2); QA.step(0.5); B.use('park_deliver'); });
  T.ok(await L.until(p, () => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'eru_park_night', 10000), 'Erudite: the grey folder to Dr. Park in the archive');
  await ev(() => { QA.pick('read the red'); QA.pick(''); });
  T.ok(await L.until(p, () => DV.Chapter.step === 'exam' && DV.Game.state === 'playing', 40000), 'Erudite: Day 5, the examination');
  const ex = await ev(() => { QA.step(2); B.use('exam_start'); return [QA.pick(''), QA.pick('irrelevant'), QA.pick(''), QA.pick('red folder'), QA.pick(''), QA.pick('thank')]; });
  T.ok(ex.every((x) => /^ok/.test(x)), 'Erudite: three questions — and you mention the red folder in front of everyone', ex);
  await ev(() => QA.step(1));
  const ers = await ev(() => B.readBody());
  T.ok(/Method, not memory/.test(ers || ''), 'Erudite: the results on the lab door');
  const eb = await banner('erudite');
  T.ok(eb && /RANKED/.test(eb.b2) && /POCKET/.test(eb.b2) && eb.q === 'complete', 'Erudite: FIRST WEEK COMPLETE — ' + (eb && eb.b2), eb);
  const er = await reload('erudite');
  T.ok(er.id === 'week_erudite' && er.step === 'end' && !er.banner, 'Erudite: a save after the banner loads back into free roam', er);

  /* ============================== Abnegation ============================== */
  await begin('abnegation', false);
  T.ok(await L.until(p, () => DV.Chapter.id === 'week_abnegation' && DV.Game.state === 'playing', 30000), 'Abnegation: the first week starts on the grey street');
  await ev(() => QA.step(12));
  const asked = await ev(() => {
    for (const id of ['ada', 'pell', 'marta', 'tam', 'rena', 'ivo', 'price']) {
      B.use('ask_' + id);
      const v = DV.Dialogue.active.view;
      const c = v.choices.find((x) => x.enabled && /PERCEPTION|CHARISMA|INTELLIGENCE|Let me see|Who|how long|Where|And what|Two\?/i.test(x.label));
      if (c) { DV.Dialogue.choose(c.index); const v2 = DV.Dialogue.active && DV.Dialogue.active.view; if (v2) { const c2 = v2.choices.find((x) => x.enabled && /INTELLIGENCE|CHARISMA/.test(x.label)); if (c2) DV.Dialogue.choose(c2.index); } }
      QA.end();
    }
    return DV.WeekAbnegation.run();
  });
  T.ok(Object.keys(asked.asked).length === 7 && asked.pellWhy && asked.bound && asked.priceTold, 'Abnegation: asked all seven — Pell\'s second loaf is for the warehouse kids, Ivo\'s hand bound with your shirt, Mrs. Price lost her ration card', asked);
  // a save with a loaf in your hands loads with it still there
  await ev(() => { B.use('cart'); QA.pick('loaf'); DV.Save.write('4'); DV.Game.loadSlot('4'); });
  await L.until(p, () => DV.Chapter.id === 'week_abnegation' && DV.Chapter.step === 'run' && DV.Game.state === 'playing', 30000);
  const carry = await ev(() => ({ carrying: DV.Chapter.carrying, bread: DV.WeekAbnegation.run().stock.bread, asked: Object.keys(DV.WeekAbnegation.run().asked).length }));
  T.ok(carry.carrying === 'bread' && carry.bread === 7 && carry.asked === 7, 'Abnegation: a save with a loaf in your hands loads with it still there (and everything you asked)', carry);
  await ev(() => B.use('cart')); // put it back
  const gave = await ev(() => {
    const plan = [['medicine', 'ada'], ['medicine', 'marta'], ['blanket', 'tam'], ['blanket', 'rena'], ['blanket', 'pell'], ['bread', 'ada'], ['bread', 'pell'], ['bread', 'marta'], ['bread', 'tam'], ['bread', 'rena'], ['bread', 'ivo'], ['bread', 'price'], ['bread', 'marta'], ['lunch', 'pell']];
    let ok = 0;
    for (const [what, who] of plan) { B.use('cart'); QA.pick({ bread: 'loaf', blanket: 'blanket', medicine: 'medicine', lunch: 'lunch' }[what]); if (B.use('give_' + who).indexOf('used') === 0) ok++; }
    return ok;
  });
  T.eq(gave, 14, 'Abnegation: the cart emptied, a person at a time (and your own lunch with it)');
  T.ok(await ev(() => B.wait(() => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'abn_joan_run', 60)), 'Abnegation: Joan comes over when it\'s gone');
  const run = await ev(() => { QA.pick(''); QA.end(); QA.step(1); return DV.FirstWeek.st().marks.run; });
  T.ok(run && run.pts === run.max, 'Abnegation: everyone who needed something got it (' + (run && run.pts) + '/' + (run && run.max) + ')', run);
  await ev(() => B.use('go_dinner'));
  T.ok(await L.until(p, () => DV.Chapter.step === 'dinner' && DV.Dialogue.isActive(), 40000), 'Abnegation: dinner at the Hayes house');
  const din = await ev(() => [QA.pick('Mrs. Price'), QA.pick(''), QA.pick('who are you'), QA.pick(''), QA.pick('no. thank'), QA.pick('yes')]);
  T.ok(din.every((x) => /^ok/.test(x)), 'Abnegation: speak only to ask about someone else — and take the envelope', din);
  T.ok(await L.until(p, () => DV.Chapter.step === 'night' && DV.Game.state === 'playing', 40000), 'Abnegation: Day 4, after curfew');
  const walk = await ev(() => {
    const P = DV.Player, path = [[30, 8], [57, 8.6]];
    let n = 0, stopped = false;
    for (const [tx, tz] of path) {
      while (n++ < 4000) {
        const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz);
        if (d < 0.3) break;
        P.place(P.x + (dx / d) * 0.12, P.z + (dz / d) * 0.12, Math.atan2(dx, dz));
        QA.step(0.05);
        if (DV.Dialogue.isActive()) { stopped = true; break; }
      }
      if (stopped) break;
    }
    return [stopped, DV.Dialogue.active && DV.Dialogue.active.tree.id];
  });
  T.ok(walk[0] && walk[1] === 'abn_patrol', 'Abnegation: walk down the middle of the street and the patrol\'s torch finds you', walk);
  const pat = await ev(() => [QA.pick('RESOLVE'), QA.pick('')]);
  T.ok(/refuse/.test(pat[0]), '…"It isn\'t mine to show you." [RESOLVE 7]', pat);
  await ev(() => { QA.end(); DV.Player.place(57.6, 8.6, Math.PI / 2); QA.step(1); B.use('ezra_talk'); QA.pick('what are'); QA.pick(''); DV.Save.write('4'); DV.Game.loadSlot('4'); });
  T.ok(await L.until(p, () => DV.Chapter.step === 'reflect' && DV.Game.state === 'playing', 40000), 'Abnegation: the envelope to Ezra, sealed — and home (via a save made right after)');
  const ref = await ev(() => { QA.step(1); B.use('joan_bench'); return [QA.pick('ready'), QA.pick('')]; });
  T.ok(ref.every((x) => /^ok/.test(x)), 'Abnegation: Day 5, on the bench with Joan', ref);
  const ab = await banner('abnegation');
  T.ok(ab && /READY/.test(ab.b2) && /NEVER OPENED/.test(ab.b2) && ab.q === 'complete', 'Abnegation: FIRST WEEK COMPLETE — ' + (ab && ab.b2), ab);
  const ar = await reload('abnegation');
  T.ok(ar.id === 'week_abnegation' && ar.step === 'end' && !ar.banner, 'Abnegation: a save after the banner loads back onto the street', ar);

  /* ============================== Amity ============================== */
  await begin('amity', true);
  T.ok(await L.until(p, () => DV.Chapter.id === 'week_amity' && DV.Game.state === 'playing', 30000), 'Amity: the first week starts in the orchard');
  await ev(() => QA.step(14));
  const both = await ev(() => {
    B.use('talk_ruth'); QA.pick('when'); QA.pick(''); QA.pick('mean a lot'); QA.pick(''); QA.pick('find out');
    B.use('sluice'); QA.pick('leave');
    B.use('talk_tom'); QA.pick('PERCEPTION'); QA.pick(''); QA.pick('when do'); QA.pick(''); QA.pick('see you');
    return [DV.Quests.obj('week_amity', 'listen'), DV.Quests.obj('week_amity', 'channel'), DV.FirstWeek.was('tom_half'), DV.FirstWeek.was('dawn')];
  });
  T.ok(both[0] === 'done' && both[1] === 'active' && both[2] && both[3], 'Amity: both sides heard (and Tom opened the sluice more than he said)', both);
  const dig = await ev(() => {
    B.use('culvert'); DV.UI.closeReading(); B.use('culvert');
    let n = 0;
    while (DV.Activity.is('dig') && n++ < 4000) { const A = DV.Activity.current; if (!A.done && Math.abs(A.pos - A.zc) < A.zone / 3) DV.Input.pressed.Space = true; QA.step(0.05); }
    return [DV.FirstWeek.was('dug'), DV.World.current.channel.lowerWet.visible];
  });
  T.ok(dig[0] && dig[0].hits === 8 && dig[1], 'Amity: the culvert dug out — the water reaches Ruth\'s trees', dig);
  await ev(() => { QA.step(2); B.use('to_circle'); });
  T.ok(await L.until(p, () => DV.Chapter.step === 'circle' && DV.Game.state === 'playing', 40000), 'Amity: the evening, the circle');
  await ev(() => { QA.step(2); B.use('circle_sit'); B.wait(() => DV.Dialogue.isActive(), 20); });
  const med = await ev(() => [QA.pick('with ruth'), QA.pick('afraid'), QA.pick(''), QA.pick('more than a quarter'), QA.pick(''), QA.pick('dug it out'), QA.pick(''), QA.pick('INTELLIGENCE'), QA.pick(''), QA.pick(''), DV.FirstWeek.was('mediated')]);
  T.eq(med[10], 'consensus', 'Amity: listen, reflect, the culvert, water at dawn — consensus');
  T.ok(await L.until(p, () => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 'am_bread', 20000), 'Amity: supper, and the bread');
  const bread = await ev(() => [QA.pick('PERCEPTION'), QA.pick('eat it anyway'), QA.pick(''), QA.pick('what'), QA.pick('they agreed'), QA.pick(''), DV.FirstWeek.was('bread')]);
  T.eq(bread[6], 'immune', 'Amity: a Divergent player eats the bread and feels nothing — and Mary sees');
  await ev(() => QA.step(1));
  const hands = await ev(() => B.readBody());
  T.ok(/hands go up/.test(hands || ''), 'Amity: the circle raises its hands');
  const mb = await banner('amity');
  T.ok(mb && /HANDS RAISED/.test(mb.b2) && /COMMON GROUND/.test(mb.b2) && mb.q === 'complete', 'Amity: FIRST WEEK COMPLETE — ' + (mb && mb.b2), mb);
  const mr = await reload('amity');
  T.ok(mr.id === 'week_amity' && mr.step === 'end' && !mr.banner, 'Amity: a save after the banner loads back into the orchard', mr);
  T.noErrors(errs);
});
