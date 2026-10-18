/* ==========================================================================
   DIVERGENT — Dauntless Stage Two and Stage Three
   After the cut, the class goes into the chair every morning. Day 6 was
   the first fear (js/zones/fearsim.js). Day 7: the crows and the box.
   Day 8: fire, your family, and the fear that's only yours. Each session
   is timed, the method is noted, and the times go up on the board in the
   Pit for everyone to read. Mark reads your times before anyone else does;
   what he does with them depends on whether you listened to him.
   Day 9 is Stage Three: every fear, one after another, in front of the
   leaders (Dana Cole, Hector Alvarez, and a guest from Erudite who watches
   the heart monitor more than the screen). The final ranking decides who
   chooses a job first, and then the new members get their "tracker".

     DV.StageTwo.applies()       a Dauntless initiate past the cut, with Stage Two still to come
     DV.StageTwo.next()          { n: 2 | 3 | 'final', day } (null when there's nothing left)
     DV.StageTwo.chairReady()    the chair will take you now
     DV.StageTwo.sit()           the needle, and the run of fears (DV.Fear.run)
     DV.StageTwo.afterRun(run)   back from the simulation: the debrief, the board
     DV.StageTwo.devSetup(day)   (the dev menu and QA) a Dauntless game at the start of Stage Two

   Saved in DV.State.data.story.stage2 (DV.Fear.st()).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const T = U.parseTime;
  const S = () => DV.StageOne;
  const I = () => DV.Initiation;
  const st = () => DV.Fear.st();
  const npc = (id) => DV.NPCs.get(id);

  const SESSIONS = { 2: ['crows', 'box'], 3: ['fire', 'family', 'own'] };
  const FINAL = ['crows', 'tank', 'box', 'fire', 'own', 'family'];
  const JOBS = [
    { id: 'leader', name: 'Leadership training', who: 'In Dana Cole\'s office, learning to run the faction.', best: 1 },
    { id: 'instructor', name: 'Instructor', who: 'Next year\'s initiates, with Mark Rivera.', best: 3 },
    { id: 'control', name: 'The control room', who: 'The cameras, the gates, and the feeds from the drones.', best: 5 },
    { id: 'order', name: 'The Order\'s night duty', who: 'Dana\'s patrols, in the city, after curfew. Erudite asked for us.', best: 99 },
    { id: 'pit', name: 'The Pit', who: 'Nina\'s parlour and the stalls. The compound\'s own life.', best: 99 },
    { id: 'fence', name: 'The Fence', who: 'Patrols on the wall, out past the farms, with Bo.', best: 99 },
  ];

  const S2 = {
    SESSIONS, FINAL, JOBS,
    guests: [],

    /* ------------------------------ where we are ------------------------------ */
    applies() {
      const s = st();
      return DV.State.data.player.faction === 'dauntless' && !s.legacy && DV.Quests.state('stage_one') === 'complete' && !I().st().playerCut;
    },
    // how many sessions are behind you (the first fear counts)
    sessionsDone() { const s = st(); return (s.sessions[1] ? 1 : 0) + (s.sessions[2] ? 1 : 0) + (s.sessions[3] ? 1 : 0); },
    finalDone() { return !!st().final || !!st().legacy; },
    next() {
      if (!this.applies()) return null;
      const s = st();
      if (!s.sessions[2]) return { n: 2, day: 7 };
      if (!s.sessions[3]) return { n: 3, day: 8 };
      if (!s.final) return { n: 'final', day: 9 };
      return null;
    },
    chairReady() {
      const nx = this.next();
      if (!nx) return false;
      const d = DV.Clock.day(), m = DV.Clock.minutes(), s = st();
      if (d < nx.day || s.lastDay === d) return false;
      return m >= T('09:40') && m < T('18:00');
    },

    /* ------------------------------ the start ------------------------------ */
    // STAGE ONE COMPLETE: the rest of Stage Two is on the plan
    begin() {
      if (!this.applies()) return;
      if (!DV.Quests.started('stage_two')) { DV.Quests.start('stage_two'); DV.Quests.tracked = 'stage_two'; }
      this.objectives();
      this.drawBoards();
    },
    objectives() {
      const s = st();
      if (!DV.Quests.started('stage_two')) return;
      const set = (o, done, why) => { if (done && DV.Quests.obj('stage_two', o) !== 'done') DV.Quests.setObj('stage_two', o, 'done', why); };
      set('first', !!s.sessions[1], 'Your first fear simulation.');
      set('session2', !!s.sessions[2], 'The crows, and the box.');
      set('session3', !!s.sessions[3], 'Fire, your family, and your own fear.');
      set('final', !!s.final, 'Stage Three, in front of the leaders.');
      set('job', !!s.job, 'You chose your job.');
      const nx = this.next();
      if (nx) DV.Quests.activate('stage_two', nx.n === 'final' ? 'final' : 'session' + nx.n);
      else if (s.final && !s.job) DV.Quests.activate('stage_two', 'job');
    },
    // the first fear (Day 6) goes into Stage Two's book
    recordFirst(res) {
      const s = st();
      if (s.sessions[1]) return;
      const r = { fear: res.id || (res.fear === 'drowning' ? 'tank' : 'beam'), how: res.how, secs: res.secs, aware: !!res.aware };
      r.pts = DV.Fear.points(r);
      s.sessions[1] = { day: DV.Clock.day(), results: [r], pts: r.pts };
      s.results.push(Object.assign({ day: DV.Clock.day(), kind: 'session', session: 1 }, r));
      s.lastDay = DV.Clock.day();
      this.score(1, [r]);
    },
    // points onto the class's board: yours, and everyone else's for the same fears
    score(tag, results, fears) {
      const s = st();
      s.pts2 = s.pts2 || {};
      let mine = 0;
      for (const r of results) mine += r.pts;
      I().award('player', mine, tag === 'final' ? 'Stage Three' : 'Stage Two — ' + results.map((r) => DV.Fear.describe(r)).join('; '));
      s.pts2.player = (s.pts2.player || 0) + mine;
      const others = DV.Fear.classRun(String(tag), fears || results.map((r) => r.fear));
      for (const id in others) { I().award(id, others[id].pts, tag === 'final' ? 'Stage Three' : 'Stage Two'); s.pts2[id] = (s.pts2[id] || 0) + others[id].pts; }
      s.secs2 = s.secs2 || {};
      s.secs2.player = (s.secs2.player || 0) + results.reduce((a, r) => a + r.secs, 0);
      for (const id in others) s.secs2[id] = (s.secs2[id] || 0) + others[id].secs;
    },
    // the Stage Two times, best first
    rows() {
      const s = st(), p = s.pts2 || {};
      const rows = I().roster().map((c) => ({ id: c.id, name: I().nameOf(c.id), pts: p[c.id] || 0 }));
      rows.push({ id: 'player', name: I().nameOf('player'), pts: p.player || 0, you: true });
      rows.sort((a, b) => b.pts - a.pts || (a.you ? -1 : 1));
      return rows;
    },
    drawBoards() {
      const z = DV.World.current;
      if (!z || z.id !== 'd_compound') return;
      const s = st();
      if (z.pitBoard) {
        if (s.final) z.pitBoard.draw('FINAL RANKINGS', I().rankings().map((r) => ({ name: r.name, pts: r.pts, you: r.id === 'player' })), null);
        else if (s.pts2) z.pitBoard.draw('STAGE TWO · FEAR', this.rows(), null);
        else z.pitBoard.draw('STAGE TWO', [], null);
      }
      if (s.final) I().post('FINAL RANKINGS', false);
    },

    /* ------------------------------ the chair ------------------------------ */
    sit() {
      const nx = this.next();
      if (!nx || !this.chairReady()) { DV.UI.notify(nx ? 'Not now. Stage Two is at ten o\'clock, in the morning.' : 'There\'s nothing more for you in that chair.'); return; }
      if (nx.n === 'final') { this.stageThree(); return; }
      const SO = S();
      SO.cut(true);
      const chair = DV.World.current.spot('fear_chair');
      if (chair) DV.Game.sitOn(chair, true);
      SO.shot([32.4, 2.0, -17.2], [30.5, 1.0, -19.3], true);
      SO.puppet('d_mark', 32.0, -16.6, -2.3, 'arms_crossed');
      const tech = npc('d_greg') ? 'd_greg' : 'd_mark';
      if (tech === 'd_greg') SO.puppet('d_greg', 32.6, -19.0, -1.8, 'type');
      const first = nx.n === 2;
      SO.seq([
        () => { SO.say(tech, first ? 'Same as last time, only more of it. Two today. They\'ll come one after another.' : 'Three today. The third one isn\'t ours. It\'s yours. The serum finds it on its own.', 4.4); return 4.6; },
        () => { SO.say('d_mark', first ? 'Times go up on the board in the Pit by lunch. Everyone reads it.' : 'Whatever you see in there, remember who put you in the chair. Not who\'s in the room with you.', 4); SO.shot([30.9, 1.6, -17.9], [30.5, 1.2, -19.2], false); return 4.2; },
        () => { DV.Audio.play('drink', { volume: 0.4 }); DV.UI.notify('The needle. Cold, then nothing.', 'info'); DV.Audio.setMusic('fear'); return 1.8; },
        () => { SO.cut(false); SO.releaseAll(); st().lastDay = DV.Clock.day(); DV.Fear.run({ kind: 'session', session: nx.n, queue: SESSIONS[nx.n] }); },
      ], 'chair2');
    },
    // back from a run of fears: into the compound for the debrief
    afterRun(run) {
      const s = st();
      if (run.kind === 'session') {
        s.sessions[run.session] = { day: DV.Clock.day(), results: run.results, pts: run.results.reduce((a, r) => a + r.pts, 0) };
        this.score(run.session, run.results);
      } else if (run.kind === 'final') {
        s.final = { day: DV.Clock.day(), results: run.results, pts: run.results.reduce((a, r) => a + r.pts, 0), secs: run.results.reduce((a, r) => a + r.secs, 0) };
        this.score('final', run.results, FINAL);
      }
      for (const r of run.results) if (r.how === 'aware') DV.State.setFlag('sim_aware');
      const secs = run.results.reduce((a, r) => a + r.secs, 0);
      const back = U.formatTime(Math.min(T('16:30'), Math.max(DV.Clock.minutes(), T('10:00')) + 12 + Math.round(secs / 60) * 4));
      const then = run.kind === 'final' ? 's3ceremony' : 's2debrief';
      DV.District.enter('dauntless', { spawn: run.kind === 'final' ? [37, 2, Math.PI] : [30.5, -17.6, Math.PI], time: run.kind === 'final' ? '13:00' : back, title: run.kind === 'final' ? 'STAGE THREE\nTHE RESULTS' : run.kind === 'single' ? 'A SIMULATION' : 'STAGE TWO\nSESSION ' + run.session, then, run });
    },
    // the district has us back (StageOne.start hands the opts on)
    onArrive(opts) {
      this.drawBoards();
      if (opts.then === 's2debrief') S().after(2.2, () => this.debrief(opts.run));
      if (opts.then === 's3ceremony') S().after(2.0, () => this.ceremony(opts.run));
    },
    debrief(run) {
      const SO = S(), res = run.results;
      const aware = res.some((r) => r.how === 'aware');
      const warned = DV.State.flag('mark_warned') || DV.State.flag('nina_warned');
      const shot = res.some((r) => r.how === 'shot'), refused = res.some((r) => r.how === 'refused' || r.how === 'defied'), out = res.some((r) => r.how === 'blackout');
      const secs = res.reduce((a, r) => a + r.secs, 0);
      SO.cut(true);
      SO.puppet('d_mark', 31.6, -16.2, -2.6, 'arms_crossed');
      if (npc('d_greg')) SO.puppet('d_greg', 32.6, -19.0, -1.8, 'type');
      SO.shot([28.6, 1.9, -15.6], [31, 1.3, -17.4], true);
      const times = res.map((r) => DV.Fear.NAMES[r.fear] + ', ' + r.secs + ' seconds').join('. ');
      const beats = [
        () => { SO.say(npc('d_greg') ? 'd_greg' : 'd_mark', run.kind === 'single' ? 'One simulation. ' + times + '.' : 'Session ' + run.session + '. ' + times + '.', 4.6); return 4.8; },
      ];
      let line;
      if (aware && warned) line = '[He leans across the technician and deletes a line with two keystrokes.] Monitor glitch. Again. [To you, not looking at you:] Slower. Next time, slower.';
      else if (aware) { line = '[He reads the screen for a long time.] That isn\'t how fast people get out of those. [Quietly:] Come and find me tonight. By the railing.'; DV.State.setFlag('sim_flagged'); }
      else if (shot) line = '[He doesn\'t say anything about the last one. He hands you a cup of water and waits until you\'ve drunk it.] It isn\'t real. It still counts as a bad day. Go and eat something.';
      else if (refused) line = 'You put the gun down. [A pause.] Plenty of people think that\'s losing. It isn\'t. Not here.';
      else if (out) line = 'You blacked out in one. That happens. It goes on the board. Tomorrow it doesn\'t.';
      else if (secs < 120) line = 'Fast. [He almost smiles.] Not too fast. Good.';
      else line = 'You got out. That\'s all it asks. The board will say the rest.';
      beats.push(() => { SO.say('d_mark', line, 6); SO.shot([30.6, 1.75, -16.4], [31.6, 1.6, -16.2], false); return 6.2; });
      // the leader hears about anything unusual: she asks for the logs
      if (aware && !warned) beats.push(() => {
        SO.puppet('d_dana', 30.5, -14.6, Math.PI, 'arms_crossed');
        SO.say('d_dana', 'Lindqvist. Copy me on this one\'s logs. All of them. [She looks at you as if you\'re a number that didn\'t add up.]', 4.6);
        if (DV.Campaign) DV.Campaign.clue('dana_sim_logs', 'Dana Cole asked the technician for copies of your simulation logs: every session, every time.', { suspect: 'dana' });
        return 4.8;
      });
      beats.push(() => {
        SO.cut(false); SO.releaseAll();
        const rows = this.rows(), r = rows.findIndex((x) => x.you) + 1;
        DV.Audio.play('chime');
        DV.UI.notify('Stage Two times are up on the board in the Pit. You\'re ' + I().ordinal(r) + ' of ' + rows.length + '.', 'info');
        this.drawBoards();
        this.objectives();
        DV.Stats.addXP(60, run.kind === 'single' ? 'A fear simulation' : 'Stage Two, session ' + run.session);
        DV.Save.write('auto');
      });
      SO.seq(beats, 's2debrief');
    },

    /* ------------------------------ Stage Three ------------------------------ */
    // the leaders: Dana and Hector from the leaders' wing, and a guest from Erudite
    guest(app, name, x, z, rot, action) {
      const m = DV.Character.create(app);
      DV.Game.scene.add(m.root);
      const g = { m, name, x, z, rot, action: action || 'arms_crossed', bark: null };
      m.root.position.set(x, 0, z); m.root.rotation.y = rot;
      this.guests.push(g);
      return g;
    },
    clearGuests() { for (const g of this.guests) { if (g.m.root.parent) g.m.root.parent.remove(g.m.root); g.m.dispose(); } this.guests = []; },
    update(dt) {
      const z = DV.World.current;
      for (const g of this.guests) {
        g.m.animate(dt, { speed: 0, action: g.action });
        if (z) { const L = z.lightAt(g.x, g.z); g.m.setTint(U.clamp(L[0] * 0.9, 0.3, 1.25), U.clamp(L[1] * 0.9, 0.3, 1.25), U.clamp(L[2] * 0.9, 0.3, 1.25)); }
      }
    },
    stageThree() {
      const SO = S();
      SO.cut(true);
      const chair = DV.World.current.spot('fear_chair');
      if (chair) DV.Game.sitOn(chair, true);
      SO.puppet('d_mark', 32.0, -16.6, -2.3, 'arms_crossed');
      SO.puppet('d_dana', 28.4, -15.2, 2.4, 'arms_crossed');
      if (npc('d_hector')) SO.puppet('d_hector', 29.2, -14.8, 2.7, 'arms_crossed');
      if (npc('d_greg')) SO.puppet('d_greg', 32.6, -19.0, -1.8, 'type');
      const pierce = DV.NPCs.get('alan_pierce');
      const g = this.guest(pierce ? pierce.appearance() : DV.Character.fromFaction('erudite', 'm', 'alan-pierce', { age: 48 }), 'Dr. Alan Pierce', 27.8, -16.4, 2.1, 'arms_crossed');
      DV.Audio.setMusic('landscape');
      SO.shot([28.2, 2.1, -18.6], [30.4, 1.2, -17], true);
      const say = (who, text, secs) => { DV.UI.subtitle(who, text, secs); };
      SO.seq([
        () => { DV.UI.narrate('STAGE THREE\nTHE FEAR LANDSCAPE', 3.6); return 3.0; },
        () => { SO.say('d_dana', 'Stage Three. Every fear you\'ve shown us, one after another, no breaks. We watch from here.', 4.4); return 4.6; },
        () => { SO.shot([29.6, 1.75, -18.4], [27.8, 1.6, -16.4], false); say('Dr. Alan Pierce', '[An Erudite in a grey suit, a guest of the leaders, with a tablet he doesn\'t look at.] Don\'t mind me. I only watch the heart.', 4.4); return 4.6; },
        () => { SO.say('d_mark', '[As he fastens the strap, low:] Six of them. Be afraid in every one. Get out of every one. That\'s all.', 4.4); SO.shot([31.2, 1.55, -17.8], [30.5, 1.2, -19.2], false); return 4.6; },
        () => { DV.Audio.play('drink', { volume: 0.4 }); return 1.6; },
        () => { SO.cut(false); SO.releaseAll(); this.clearGuests(); st().lastDay = DV.Clock.day(); DV.Fear.run({ kind: 'final', queue: FINAL, fast: true }); },
      ], 'stage3');
      void g;
    },
    // the results in the Pit, the jobs, the tracker
    ceremony(run) {
      const SO = S(), s = st();
      const R = I().rankings(), r = R.findIndex((x) => x.id === 'player') + 1, n = R.length;
      const aware = run.results.some((x) => x.how === 'aware');
      const warned = DV.State.flag('mark_warned') || DV.State.flag('nina_warned');
      s.finalRank = r;
      this.drawBoards();
      SO.cut(true);
      DV.Player.place(37, 3, Math.PI);
      SO.puppet('d_dana', 37, -2.2, 0, 'arms_crossed');
      SO.puppet('d_mark', 35.4, -1.8, 0.3, 'arms_crossed');
      if (npc('d_hector')) SO.puppet('d_hector', 38.7, -1.8, -0.3, 'arms_crossed');
      const cls = I().roster().slice(0, 8);
      cls.forEach((c, i) => SO.puppet(c.id, 33.5 + i * 1.15, 4.2 + (i % 2) * 0.8, Math.PI, 'idle'));
      SO.shot([41.5, 2.4, 7.4], [37, 1.6, 0.5], true);
      DV.Audio.setMusic('dauntless');
      DV.Audio.play('roar', { secs: 1.6, volume: 0.6 });
      const top = R.slice(0, 3).map((x) => x.name);
      const beats = [
        () => { DV.UI.narrate('THE FINAL RANKINGS', 3); SO.say('d_dana', 'Quiet! [It takes a while.] Three stages. One number. It\'s on the board behind me, and it decides what you do with the rest of your lives.', 5); return 5.2; },
        () => { SO.shot([37.6, 2.2, 0.2], [37, 1.9, -3.5], false); SO.say('d_dana', 'First: ' + top[0] + '. Second: ' + top[1] + '. Third: ' + top[2] + '.', 4); DV.Audio.play('roar', { secs: 2.4, volume: 0.9 }); return 4.4; },
      ];
      if (r > 3) beats.push(() => { SO.say('d_dana', I().nameOf('player') + ': ' + I().ordinal(r) + '.', 2.6); DV.Audio.play('applause', { secs: 1.6 }); return 2.8; });
      beats.push(() => {
        SO.shot([36.2, 1.8, 1.4], [35.4, 1.6, -1.8], false);
        SO.say('d_mark', aware && !warned ? '[He finds you in the crowd, and doesn\'t smile.] Your times were the best anybody\'s seen. That\'s exactly the problem. Watch yourself.' : aware ? '[He finds you in the crowd.] A glitch on the monitor, twice. Funny. [He means: I covered for you.] Well done.' : r <= 3 ? '[He finds you in the crowd, and nods once. From Mark, that\'s a parade.]' : '[He finds you in the crowd.] Member. That\'s the only word that matters today.', 5.5);
        return 5.7;
      });
      if (aware && !warned) beats.push(() => { DV.State.setFlag('stage3_seen'); if (DV.Campaign) DV.Campaign.clue('pierce_watched', 'Dr. Pierce came from Erudite to watch Stage Three, and took notes only on your heart.', {}); return 0; });
      beats.push(() => {
        SO.say('d_dana', 'Jobs, in the order of the board. ' + I().nameOf('player') + '?', 3);
        S().onDlg = (e) => { if (e.tree === 's3_jobs') this.afterJob(); };
        DV.Dialogue.startScene('s3_jobs', { speaker: 'Dana Cole', faction: 'dauntless' });
        DV.Game.onSceneStart();
      });
      SO.seq(beats, 's3ceremony');
    },
    choose(id) {
      const s = st(), J = JOBS.find((j) => j.id === id);
      s.job = id;
      DV.State.setFlag('job_' + id);
      DV.State.note('Initiation is over. My job: ' + J.name + '.');
      const K = DV.Campaign;
      if (id === 'leader') { DV.Reputation.addRel('d_dana', 6, true); if (K) K.clue('dana_line', 'Dana Cole\'s office has a telephone that only rings one place: the Erudite Directorate.', { suspect: 'dana' }); }
      if (id === 'instructor' && K) K.trust('mark', 1, 'You chose to teach with him.');
      if (id === 'control' && K) K.clue('control_feeds', 'In the control room, the drones\' feeds go to Erudite first and to Dauntless after.', {});
      if (id === 'order') DV.Reputation.add('dauntless', 2);
      if (id === 'pit' && K) K.trust('nina', 1, 'You chose the Pit, and her parlour.');
      if (id === 'fence' && K) K.trust('bo', 1, 'You chose the Fence, with him.');
    },
    // the others take what's left, in order of the board
    jobsBoard() {
      const s = st(), R = I().rankings(), taken = {};
      if (s.job) taken[s.job] = 'player';
      const out = [];
      for (const row of R) {
        if (row.id === 'player') { out.push(row.name + ' — ' + (JOBS.find((j) => j.id === s.job) || {}).name); continue; }
        const j = JOBS.find((x) => !taken[x.id] && (x.best >= out.length + 1)) || JOBS[3 + out.length % 3];
        taken[j.id] = row.id;
        out.push(row.name + ' — ' + j.name);
      }
      return out;
    },
    afterJob() {
      const SO = S(), s = st();
      const J = JOBS.find((j) => j.id === s.job) || JOBS[4];
      const div = !!DV.State.data.aptitude.divergent;
      SO.seq([
        () => { SO.say('d_dana', 'Members get one more thing before the party. A tracker, left arm. In case one of you falls in the chasm and we need to find what\'s left.', 5); DV.Audio.play('murmur', { secs: 1.4 }); return 5.2; },
        () => { if (npc('d_greg')) SO.puppet('d_greg', 36.4, 2.6, Math.PI * 0.8, 'idle'); DV.Audio.play('drink', { volume: 0.4 }); DV.UI.subtitle('', div ? '[A needle in your arm. The vial is Erudite blue. Something cold goes up your arm toward your heart — and stops, and fades, as if it couldn\'t find anywhere to hold on.]' : '[A needle in your arm. The vial is Erudite blue. Something cold goes up toward your shoulder, and then you can\'t feel it at all.]', 6); return 6.2; },
        () => {
          DV.State.setFlag('stage3_tracker');
          if (DV.Campaign) DV.Campaign.clue('tracker_serum', 'Every new member got a "tracker" after Stage Three, from vials marked in Erudite blue.' + (div ? ' On you it didn\'t seem to take.' : ''), {});
          SO.cut(false); SO.releaseAll();
          DV.Audio.play('roar', { secs: 2.4, volume: 0.8 });
          DV.Quests.setObj('stage_two', 'job', 'done', 'Your job: ' + J.name + '.');
          DV.Quests.complete('stage_two', s.job);
          DV.Reputation.add('dauntless', 8);
          DV.Stats.addXP(150, 'Initiation complete');
          const G = DV.Game;
          G.state = 'banner';
          if (!DV.Cursor.enabled()) DV.Input.exitLock();
          DV.UI.banner('INITIATION COMPLETE', 'RANKED ' + I().ordinal(s.finalRank || 1).toUpperCase() + ' OF ' + I().rankings().length + ' · ' + J.name.toUpperCase() + ' · MEMBER', 'Click or press any key to carry on', () => {
            DV.UI.modalOpen = null;
            G.state = 'playing';
            DV.Input.requestLock();
            DV.Save.write('auto');
            DV.UI.showReading('Jobs, in the order of the board', this.jobsBoard().join('\n') + '\n\nThe party in the Pit goes on until the drums give out.');
            DV.UI.notify(DV.Campaign && DV.Campaign.available() ? 'Dana Cole wants to see you about the circles.' : 'You are Dauntless. The compound is yours.', 'info');
          });
        },
      ], 's3jobs');
    },

    /* ------------------------------ the dev menu, and QA ------------------------------ */
    // a Dauntless game at the start of Stage Two: Stage One played and passed, the first fear behind you
    devSetup(day, o) {
      o = o || {};
      const st0 = DV.State.data;
      const a = st0.aptitude;
      if (a.status !== 'complete') { a.status = 'complete'; a.result = a.result || 'dauntless'; a.recordedAs = a.recordedAs || a.result; }
      for (const f of ['checked_in', 'security_cleared', 'results_discussed']) DV.State.setFlag(f);
      if (DV.Build2.chosen() !== 'dauntless') DV.Build2.setFaction('dauntless');
      DV.Build2.dressFor('dauntless');
      st0.story = st0.story || {};
      st0.story.dauntlessName = st0.story.dauntlessName || st0.player.name;
      const In = I(), s = In.st();
      if (!s.cut) {
        for (const d of [3, 4, 5]) for (const b of In.blocks(d)) { if (!s.blocks[In.key(b, d)]) { s.blocks[In.key(b, d)] = 'done'; In.award('player', 150, b.title, b); In.simulate(b, d); } }
        In.makeCut(); s.flags.cut_done = true; s.flags.arrived = true;
        In.post('FINAL RANKINGS', true);
      }
      if (!DV.Quests.started('stage_one')) DV.Quests.start('stage_one');
      if (DV.Quests.state('stage_one') !== 'complete') DV.Quests.complete('stage_one', 'normal');
      if (!st().sessions[1]) this.recordFirst({ id: 'beam', how: 'calm', secs: 70 });
      if (o.sessions >= 2 && !st().sessions[2]) st().sessions[2] = { day: 7, results: [], pts: 0 };
      if (o.sessions >= 3 && !st().sessions[3]) st().sessions[3] = { day: 8, results: [], pts: 0 };
      st().lastDay = 0;
      if (DV.Campaign && !DV.Campaign.started()) DV.Campaign.begin('dauntless');
      this.begin();
      DV.District.enter('dauntless', { day: day || 7, time: o.time || '09:55', spawn: o.spawn || [30.5, -16.2, Math.PI], instant: true, noSave: true });
    },
  };

  /* ------------------------------ the job, at the ceremony ------------------------------ */
  DV.DialogueDB.add('s3_jobs', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Dana Cole', faction: 'dauntless',
        text: () => { const r = st().finalRank || 1; return '[The whole Pit is listening.] ' + I().ordinal(r) + '. ' + (r === 1 ? 'You choose first. Anything on the list.' : 'You choose ' + I().ordinal(r) + '. What\'s left is still a lot.'); },
        choices: () => JOBS.map((j) => {
          const ok = (st().finalRank || 1) <= j.best;
          return { text: j.name + ' — ' + j.who + (ok ? '' : '  (gone before your turn)'), if: () => ok, end: true, effect: () => S2.choose(j.id) };
        }),
      },
    },
  });

  /* ------------------------------ the quest ------------------------------ */
  DV.QuestDB.add({
    id: 'stage_two', title: 'The Fear Landscape', type: 'main', giver: 'd_mark',
    summary: 'Stage Two: the serum, the chair, and your fears, one session a morning. Stage Three: all of them at once, in front of the leaders. The final ranking decides your job.',
    startText: 'Mark Rivera: "Simulation Room, ten o\'clock, every morning until you\'re done. The board in the Pit will tell you how you\'re doing."',
    objectives: [
      { id: 'first', text: 'Your first fear simulation' },
      { id: 'session2', text: 'Stage Two, the second session (Simulation Room, Day 7, 10:00)', target: { x: 30.5, z: -18 } },
      { id: 'session3', text: 'Stage Two, the third session (Simulation Room, Day 8, 10:00)', hidden: true, target: { x: 30.5, z: -18 } },
      { id: 'final', text: 'Stage Three, in front of the leaders (Simulation Room, Day 9, 10:00)', hidden: true, target: { x: 30.5, z: -18 } },
      { id: 'job', text: 'Choose your job', hidden: true },
    ],
    rewards: { xp: 300, rep: { dauntless: 10 } },
    completeText: 'Initiation is over. You are Dauntless, and you have a job.',
  });

  /* ------------------------------ the board in the Pit ------------------------------ */
  DV.Actions.pitboard = () => {
    const s = st();
    if (s.final) { const rows = I().rankings(); return { read: { title: 'Final Rankings', text: rows.map((r, i) => String(i + 1).padStart(2, ' ') + '.  ' + r.name + (r.id === 'player' ? '   ◄ you' : '') + '   ' + r.pts).join('\n') + '\n\nThe numbers that decided who does what for the rest of their lives, chalked up in the Pit.' } }; }
    if (!s.pts2) return { read: { title: 'Stage Two', text: 'Blank, for now. The times go up after every session in the Simulation Room, for the whole Pit to read.' } };
    const rows = S2.rows(), secs = s.secs2 || {};
    return { read: { title: 'Stage Two · Fear', text: rows.map((r, i) => String(i + 1).padStart(2, ' ') + '.  ' + r.name + (r.you ? '   ◄ you' : '') + '   ' + r.pts + '   (' + Math.round((secs[r.id] || 0) / 60) + ' min in the chair)').join('\n') + '\n\nPoints for every fear: the faster you get out, the more. How you got out counts too.' } };
  };

  /* ------------------------------ the Chalk Year waits its turn ------------------------------ */
  // a Dauntless initiate rides Night Duty after the second session, reads the Night Log after the
  // third, and only meets the seventh circle as a member (older saves, and everyone else: no change)
  if (DV.Campaign) {
    const gate = (k) => () => !S2.applies() || (k === 'final' ? S2.finalDone() : S2.sessionsDone() >= k);
    const ep = (id) => DV.Campaign.episode(id);
    if (ep('camp_d1')) ep('camp_d1').gate = gate(2);
    if (ep('camp_d2')) ep('camp_d2').gate = gate(3);
    if (ep('camp_x1')) ep('camp_x1').gate = gate('final');
  }

  DV.StageTwo = S2;
})();
