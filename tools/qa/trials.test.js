// The trials, Dauntless: every fear of Stage Two played to its own way out (the barn, the loose board,
// the window, the gun put down, your own fear, the glass that breaks from a fingertip), a session in
// the chair with the debrief and the board in the Pit (and the Chalk Year waiting its turn), a save in
// the middle of a session, Stage Three in front of the leaders with the ranking and the job, and
// Capture the Flag at the old pier (the train, the wheel, the flag). The faction trials are in
// trials-factions.test.js.
const L = require('./lib.js');
L.run('the trials: Stage Two, Stage Three, Capture the Flag', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  // drive the game in chunks, letting the page's own timers (fades, white flashes) run between them
  const drive = async (fn, arg, max) => {
    for (let i = 0; i < (max || 400); i++) {
      const r = await ev(fn, arg);
      if (r === 'done') return true;
      await p.waitForTimeout(r === 'wait' ? 250 : 25);
    }
    return false;
  };
  const inCompound = () => L.until(p, () => DV.World.current && DV.World.current.id === 'd_compound' && DV.Game.state === 'playing', 60000, 0.5);
  // the bot in a fear: whatever way out it's been told to take (breathing is the fallback)
  const fearBot = (mode) => {
    const Ch = DV.Chapter, I = DV.Input, P = DV.Player;
    if (Ch.id !== 'fear_land') { I.keys.Space = false; I.keys.KeyQ = false; return DV.World.current && DV.World.current.id === 'd_compound' ? 'done' : 'wait'; }
    if (Ch.done || !Ch.mod) return 'wait';
    for (let i = 0; i < 30 && !Ch.done; i++) {
      const f = Ch.fid;
      I.keys.Space = false;
      if (mode === 'faced' && f === 'crows') { P.place(0, 25.6, 0); if (Ch.t > 6) B.use('crows_door'); }
      else if (mode === 'faced' && f === 'box') { if (Ch.seeBoard) { const w = DV.World.current.box.w; P.place(0.3, -w + 0.5, Math.PI); B.use('box_board'); } }
      else if (mode === 'faced' && f === 'fire') { P.crouched = true; P.place(0.7, 2.75, -Math.PI / 2); if (Ch.t > 3) B.use('fire_window'); }
      else if (f === 'family') { I.keys.Space = true; I.keys.KeyQ = Ch.count !== null; }
      else if (mode === 'aware') { if (Ch.awareOffered && !Ch.aware) I.pressed.KeyR = true; }
      else { if (f === 'crows' && !P.crouched) P.crouched = true; I.keys.Space = true; }
      QA.step(0.05);
    }
    return 'in';
  };

  /* ---------------- each fear, its own way out ---------------- */
  const plan = [['crows', 'faced'], ['box', 'faced'], ['fire', 'faced'], ['family', 'refused'], ['own', 'calm'], ['tank', 'aware']];
  for (const [f, mode] of plan) {
    await ev(([f, mode]) => { if (mode === 'aware') DV.State.data.aptitude.divergent = true; DV.Dev.jump('fear', f); }, [f, mode]);
    const inside = await L.until(p, () => DV.Chapter.id === 'fear_land' && DV.Game.state === 'playing' && !!DV.Chapter.mod, 60000);
    const zone = await ev(() => DV.World.current.id);
    if (f === 'crows' || f === 'fire') { await ev(() => QA.step(5)); await L.shot(p, 'trial_' + f); }
    const out = await drive(fearBot, mode, 500);
    const r = await ev((f) => DV.Fear.st().results.filter((x) => x.fear === f).pop() || null, f);
    T.ok(inside && out && r && r.pts > 0 && (mode === 'calm' ? /calm|hidden/.test(r.how) : r.how === mode), 'Stage Two · ' + f + ' (' + zone + '): ' + (r ? r.how + ' in ' + r.secs + 's, ' + r.pts + ' points' : 'no result'), r);
    await inCompound();
    await ev(() => QA.step(12));
  }
  await ev(() => { DV.State.data.aptitude.divergent = false; });

  /* ---------------- a session in the chair ---------------- */
  await ev(() => DV.Dev.jump('stage2', 2));
  await inCompound();
  const pre = await ev(() => { B.at('10:01'); return { ready: DV.StageTwo.chairReady(), next: DV.StageTwo.next(), d1: DV.Campaign.next() && DV.Campaign.next().id }; });
  T.ok(pre.ready && pre.next.n === 2 && !pre.d1, 'Day 7, 10:00: the chair is ready for the second session — and Dana\'s Night Duty waits for it', pre);
  await ev(() => { DV.Player.place(30.5, -18.3, Math.PI); B.use('fear_chair_use'); });
  T.ok(await L.until(p, () => DV.Chapter.id === 'fear_land' && DV.Chapter.fid === 'crows', 90000, 0.5), 'the needle, and the first fear of the session: the crows');
  await drive(() => { const Ch = DV.Chapter; if (Ch.fid === 'box' && !Ch.done && DV.Game.state === 'playing') return 'done'; if (Ch.id === 'fear_land' && !Ch.done && Ch.mod) { DV.Player.crouched = true; DV.Input.keys.Space = true; for (let i = 0; i < 30 && !Ch.done; i++) QA.step(0.05); return 'in'; } DV.Input.keys.Space = false; return 'wait'; }, null, 400);
  await ev(() => { DV.Input.keys.Space = false; QA.step(1); DV.Save.write('4'); DV.Game.loadSlot('4'); });
  const resumed = await L.until(p, () => DV.Chapter.id === 'fear_land' && DV.Game.state === 'playing' && !!DV.Chapter.mod, 90000);
  const rs = await ev(() => ({ fid: DV.Chapter.fid, step: DV.Chapter.step, run: DV.Fear.st().run && DV.Fear.st().run.i }));
  T.ok(resumed && rs.fid === 'box' && rs.run === 1, 'a save in the middle of a session loads back into the same fear (the box, second of two)', rs);
  T.ok(await drive(fearBot, 'calm', 500), 'the box: breathe, and the lid lifts');
  await inCompound();
  T.ok(await L.until(p, () => DV.Quests.obj('stage_two', 'session2') === 'done', 60000, 0.5), 'the debrief: Mark reads the times; the session goes in the book');
  const post = await ev(() => { QA.step(2); const t = DV.Actions.pitboard().read.text; return { board: t, d1: DV.Campaign.next() && DV.Campaign.next().id, title: DV.World.current.pitBoard ? 'ok' : 'none' }; });
  T.ok(/◄ you/.test(post.board) && post.title === 'ok', 'Stage Two times on the board in the Pit, yours among them');
  T.eq(post.d1, 'camp_d1', 'and now Dana sends for you: Night Duty is on offer');
  await ev(() => QA.shotAt(16, -3.6, 13, -3.6));
  await L.shot(p, 'trial_pitboard');

  /* ---------------- Stage Three ---------------- */
  await ev(() => DV.Dev.jump('stage2', 'final'));
  await inCompound();
  await ev(() => { B.at('10:01'); DV.Player.place(30.5, -18.3, Math.PI); B.use('fear_chair_use'); });
  T.ok(await L.until(p, () => DV.StageTwo.guests.length > 0, 30000, 0.2), 'Stage Three: the leaders in the Simulation Room, and a guest from Erudite');
  await ev(() => QA.step(9)); await L.shot(p, 'trial_stage3_leaders');
  T.ok(await L.until(p, () => DV.Chapter.id === 'fear_land' && DV.Fear.st().run && DV.Fear.st().run.kind === 'final', 90000, 0.5), 'the serum, and every fear in a row');
  const n0 = await ev(() => DV.Fear.st().results.length);
  T.ok(await drive(fearBot, 'calm', 1600), 'six fears, one after another');
  const fin = await ev((n0) => ({ fears: DV.Fear.st().results.slice(n0).map((r) => r.fear), final: !!DV.Fear.st().final }), n0);
  T.ok(fin.final && fin.fears.join(',') === DV_FINAL(), 'Stage Three: ' + fin.fears.join(' → '), fin);
  T.ok(await L.until(p, () => DV.Dialogue.isActive() && DV.Dialogue.active.tree.id === 's3_jobs', 90000, 0.5), 'the results in the Pit: Dana reads the board, and asks what you\'ll do');
  await L.shot(p, 'trial_stage3_jobs');
  const job = await ev(() => { const v = DV.Dialogue.active.view; const c = v.choices.find((x) => x.enabled); DV.Dialogue.choose(c.index); return DV.Fear.st().job; });
  T.ok(await L.until(p, () => !!document.getElementById('banner'), 60000, 0.5), 'the tracker, the roar, and the banner');
  const end = await ev(() => ({ b1: document.querySelector('#banner .b1').textContent, b2: document.querySelector('#banner .b2').textContent, q: DV.Quests.state('stage_two'), tracker: !!DV.State.flag('stage3_tracker'), job: DV.State.flag('job_' + DV.Fear.st().job) }));
  T.ok(end.b1 === 'INITIATION COMPLETE' && /MEMBER/.test(end.b2) && end.q === 'complete' && end.tracker && end.job && job, 'INITIATION COMPLETE · ' + end.b2, end);
  await p.waitForTimeout(1700);
  await ev(() => { document.getElementById('banner').click(); });
  await p.waitForTimeout(1800);
  await ev(() => { DV.UI.closeReading(); const b = document.getElementById('banner'); if (b) b.click(); });

  /* ---------------- Capture the Flag ---------------- */
  await ev(() => DV.Dev.jump('ctf'));
  T.ok(await L.until(p, () => DV.Chapter.id === 'ctf' && DV.Chapter.step === 'train', 60000), 'the night game: the train out to the old pier');
  await ev(() => QA.step(18)); await L.shot(p, 'trial_ctf_train');
  T.ok(await L.until(p, () => DV.Chapter.step === 'play' && DV.Game.state === 'playing', 120000, 1.0), 'off the train, the teams picked, out along the jetty to the pier');
  const teams = await ev(() => ({ ours: DV.Chapter.players.filter((a) => a.team === 'ours').length, theirs: DV.Chapter.players.filter((a) => a.team === 'theirs').length, roles: [...new Set(DV.Chapter.players.map((a) => a.role))].sort().join(',') }));
  T.ok(teams.ours >= 4 && teams.theirs >= 4 && /escort/.test(teams.roles) && /guard/.test(teams.roles) && /raid/.test(teams.roles), 'two teams with roles: ' + teams.roles, teams);
  await ev(() => B.use('ctf_climb'));
  T.ok(await L.until(p, () => DV.Chapter.spotted, 60000, 0.4), 'up the wheel\'s ladder in the dark: their flag, spotted from the top');
  await ev(() => QA.step(3)); await L.shot(p, 'trial_ctf_wheel');
  await ev(() => { DV.Input.pressed.KeyE = true; QA.step(0.3); });
  await L.until(p, () => DV.Game.state === 'playing' && !DV.Chapter.climbing, 30000, 0.3);
  // a minute of the game: the paint flies, people are out
  const fight = await ev(() => { QA.step(40); const C = DV.Chapter; return { out: C.score.ours + C.score.theirs, over: C.over }; });
  T.ok(fight.out > 0 || fight.over, 'the paint flies: ' + fight.out + ' tagged in a minute', fight);
  const won = await ev(() => { const C = DV.Chapter; if (C.over) return 'over'; const fs = C.flagSpot; DV.Player.place(fs[0] + 1, fs[1] + 1, 0); QA.step(0.2); B.use('ctf_take'); if (DV.Dialogue.isActive()) QA.pick('Take it'); return 'taken'; });
  T.ok(await L.until(p, () => !!document.getElementById('banner'), 60000, 0.5), 'the flag: ' + won);
  const cb = await ev(() => document.querySelector('#banner .b1').textContent);
  await L.shot(p, 'trial_ctf_flag');
  await p.waitForTimeout(1700);
  await ev(() => { document.getElementById('banner').click(); });
  T.ok(await inCompound(), 'the train home: back in the compound before midnight');
  const ctf = await ev(() => ({ s: DV.Fear.st().ctf, q: DV.Quests.state('capture_flag'), day: DV.Clock.day() }));
  T.ok(ctf.s.done && ctf.q === 'complete' && ctf.day === 3 && /CAPTURE THE FLAG/.test(cb), cb + ' — remembered (' + JSON.stringify(ctf.s) + ')', ctf);

  /* ---------------- older saves ---------------- */
  const mig = await ev(() => {
    const st = DV.Save.snapshot();
    st.version = 4; delete st.story.stage2;
    st.quests.stage_one = { state: 'complete', objectives: {}, log: [] };
    st.story.init = st.story.init || {}; st.story.init.fear = { how: 'calm', secs: 80, fear: 'drowning', id: 'tank' };
    const a = DV.State.migrate(JSON.parse(JSON.stringify(st)));
    st.story.campaign = { ep: { camp_d1: 'done' } };
    const b = DV.State.migrate(JSON.parse(JSON.stringify(st)));
    return { v: a.version, s1: a.story.stage2.sessions[1] && a.story.stage2.sessions[1].results[0].fear, legacyA: a.story.stage2.legacy, legacyB: b.story.stage2.legacy };
  });
  T.ok(mig.s1 === 'tank' && !mig.legacyA && mig.legacyB && mig.v === await ev(() => DV.State.SAVE_VERSION), 'an older save: the first fear becomes Stage Two\'s first session; one already into the Chalk Year carries on as it was', mig);

  T.noErrors(errs);
  function DV_FINAL() { return 'crows,tank,box,fire,own,family'; }
});
