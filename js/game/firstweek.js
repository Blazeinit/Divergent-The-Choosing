/* ==========================================================================
   DIVERGENT — Build 3: the first week (Candor, Erudite, Abnegation, Amity)
   Dauntless gets Stage One. The other four factions get a first week each,
   built the same way:
     - a chapter that runs over several days, one step per beat (each step
       is a checkpoint: a save drops you back at the start of it),
     - a hands-on activity at its heart (an interrogation, a lab bench, a
       distribution run, a mediation),
     - the people you came in with on Aptitude Day, in their new clothes,
     - a thread about what your test really said, and a choice about it,
     - and an evaluation at the end.
   This file is the shared part: the week's score sheet, moving on a day,
   the class and the standings, the end-of-build banner, and the helpers
   the week's activities use.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // game-time timers for an activity (they pause with the game, and QA can step them)
  const timers = {
    after(t, fn) { (this._tm || (this._tm = [])).push({ t, fn }); },
    tick(dt) {
      if (!this._tm || !this._tm.length) return;
      const due = [];
      this._tm = this._tm.filter((x) => ((x.t -= dt) > 0 ? true : (due.push(x), false)));
      for (const x of due) x.fn();
    },
  };
  // the player's model in the pose an activity wants
  const pose = (dt, s) => {
    const P = DV.Player;
    P.syncModel();
    const z = DV.World.current;
    if (z) { const L = z.lightAt(P.x, P.z); P.model.setTint(U.clamp(L[0] * 0.9, 0.3, 1.25), U.clamp(L[1] * 0.9, 0.3, 1.25), U.clamp(L[2] * 0.9, 0.3, 1.25)); }
    P.model.animate(dt, s);
  };
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  // what the chapter controller owns; anything else a week puts on it is that run's own state
  const BASE = new Set(Object.keys(DV.Chapter).concat(['speed', 'hint', 'step', 'opts', 'playerWalk', 'cutscene']));

  const FW = {
    timers, pose, V3,
    FACTIONS: ['candor', 'erudite', 'abnegation', 'amity'],

    /* ---------------- the week's score sheet (saved with the story) ---------------- */
    st() {
      const s = DV.State.data.story = DV.State.data.story || {};
      return s.week || (s.week = { faction: null, marks: {}, log: [] });
    },
    // a graded piece of the week: pts out of max (re-marking replaces the old mark)
    mark(key, pts, max, why) {
      const w = this.st();
      w.marks[key] = { pts: Math.round(U.clamp(pts, 0, max)), max };
      if (why) w.log.push(why);
      DV.Events.emit('week:mark', { key, pts, max });
    },
    got(key) { const m = this.st().marks[key]; return m ? m.pts : 0; },
    // the week so far, 0..100
    pct() {
      const m = this.st().marks;
      let p = 0, t = 0;
      for (const k in m) { p += m[k].pts; t += m[k].max; }
      return t ? Math.round((p / t) * 100) : 0;
    },
    // a fact about the week the later beats (and later builds) read
    note(k, v) { this.st()[k] = v === undefined ? true : v; },
    was(k) { return this.st()[k]; },

    /* ---------------- the class ---------------- */
    // the people from your Aptitude Day who chose this faction, plus whoever was born to it
    classOf(f, born) {
      const list = DV.Hub ? DV.Hub.initiatesOf(f).map((p) => ({ id: p.id, name: p.name, app: p.app, from: p.from })) : [];
      for (const b of born || []) if (!list.some((x) => x.id === b.id)) list.push(b);
      return list;
    },
    first(name) { return String(name || '').split(' ')[0]; },
    // where you stand: everyone else's week is decided by who they are and a little luck
    standings(f, mine, peers) {
      const r = U.rng('week:' + f + ':' + DV.State.data.player.name);
      const rows = peers.map((p) => ({ name: p.name, score: Math.round(U.clamp((p.bias || 62) + (r() - 0.5) * 22, 25, 97)) }));
      rows.push({ name: DV.State.data.player.name, score: mine, you: true });
      rows.sort((a, b) => b.score - a.score || (a.you ? -1 : 1));
      return { rows, place: rows.findIndex((x) => x.you) + 1, n: rows.length };
    },
    ordinal(n) { return n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'); },
    standingsText(rows, cut) {
      return rows.map((x, i) => (i + 1 < 10 ? ' ' : '') + (i + 1) + '.  ' + (x.you ? '▶ ' : '   ') + x.name + '  —  ' + x.score + (cut && i + 1 > rows.length - cut ? '   (below the line)' : '')).join('\n');
    },

    // a week's step starts from nothing: drop whatever the last run (or the last chapter) left on the controller
    fresh(Ch) { for (const k of Object.keys(Ch)) if (!BASE.has(k)) delete Ch[k]; },

    /* ---------------- moving on ---------------- */
    // the first week begins (from the Build 2 welcome, or a save made after it)
    begin(f) {
      const w = this.st();
      if (w.faction !== f) { w.faction = f; w.marks = {}; w.log = []; }
      if (DV.State.data.player.outfit !== f && DV.Build2) DV.Build2.dressFor(f);
      DV.Chapter.start('week_' + f, { fadeOut: 1600, fadeIn: 1600 });
    },
    // on to another beat: fade to black, the new day's title, the chapter restarts at that step
    next(Ch, step, title, opts) {
      DV.Chapter.start(Ch.id, Object.assign({ step, title, fadeOut: 1500, fadeIn: 1500 }, opts || {}));
    },
    // a bed (or a bench) that moves the week on when you're ready for it
    sleepSpot(Ch, o) {
      Ch.interact({
        id: o.id || 'week_sleep', kind: 'action', x: o.x, y: 0.7, z: o.z, radius: o.radius || 1.4,
        label: o.label || 'Sleep', name: o.name || 'Your bed',
        cond: o.cond || (() => true),
        onUse: () => { if (o.before) o.before(); this.next(Ch, o.to, o.title); },
      });
    },
    // put the player somewhere, with the camera behind them
    placePlayer(x, z, rot) {
      DV.Player.place(x, z, rot);
      const G = DV.Game;
      G.rig.yaw = rot;
      G.rig.follow(true);
    },
    // the hour: the clock moves on within a step (a scene that takes the afternoon)
    passTo(t) {
      const w = DV.State.data.world;
      const m = U.parseTime(t);
      if (m > w.time) { w.time = m; DV.Clock.lastMinute = Math.floor(m); }
    },

    /* ---------------- the end of the build ---------------- */
    complete(Ch, f, l2, outcome) {
      DV.Quests.complete('week_' + f, outcome || null);
      Ch.checkpoint('end');
      DV.State.note('The end of your first week as ' + DV.Factions.name(f) + ': ' + l2.toLowerCase() + '.');
      Ch.banner('FIRST WEEK COMPLETE', l2, 'Click or press any key to keep exploring · Build 3 complete', () => {
        DV.Save.write('auto');
        DV.UI.notify('Autosaved. Build 3 is complete — your first week as ' + DV.Factions.name(f) + ' is behind you.', 'info');
      });
    },

    /* ---------------- little helpers for the week's scenes ---------------- */
    // a line from an actor, then a pause long enough to read it
    say(Ch, a, line, t) { return () => { Ch.say(a, DV.Dialogue.fill ? DV.Dialogue.fill(line, {}) : line, t || 3.6); return (t || 3.6) + 0.4; }; },
    // talk to a chapter actor: a scene tree, with the actor turning to face you
    talkTo(Ch, a, tree, o) {
      o = o || {};
      return Ch.interact({
        id: o.id || 'talk_' + a.id, kind: 'action', x: () => a.x, y: 1.4, z: () => a.z, radius: o.radius || 1.7,
        label: o.label || 'Talk to', name: () => a.name,
        cond: o.cond || (() => true),
        onUse: () => {
          a.face(DV.Player.x, DV.Player.z);
          const t = typeof tree === 'function' ? tree() : tree;
          if (t) Ch.scene(t, { speaker: a.name, faction: o.faction || a.faction });
        },
      });
    },
    // what you broke on Aptitude Day, in a sentence you'd say under the serum
    worstThing() {
      const F = (n) => DV.State.flag(n);
      if (F('took_pierce_key') || F('kept_keycard')) return 'I stole a keycard at the Testing Center and let someone else get blamed for it.';
      if (F('read_envelope')) return 'I opened somebody else\'s results envelope. I wanted to know.';
      if (F('coffee_stolen')) return 'I took coffee from the staff room at the Testing Center. It\'s stupid. I still think about it.';
      if (F('ducked_barrier')) return 'I ducked under a barrier I was told not to cross. I\'d do it again.';
      if (DV.State.data.player.upbringing !== DV.State.data.player.faction) return 'I left my family at the Choosing without telling them first. I let them find out with everyone else.';
      return 'Nothing much. I think I\'m more ashamed of that than anything.';
    },
  };

  /* ---------------- the week's quests ---------------- */
  const Q = (d) => DV.QuestDB.add(d);
  Q({
    id: 'week_candor', title: 'The Whole Truth', type: 'main', giver: null,
    summary: 'Candor initiation, the first week. Learn to hear a lie — and then sit in the chair yourself, with the serum in your arm and everyone listening.',
    startText: 'Rosa Medina: "This week you learn to listen. At the end of it, we listen to you."',
    objectives: [
      { id: 'evidence', text: 'Examine the evidence in the Hollis case (evidence room, west end of the corridor)', target: { x: 4.5, z: 5 } },
      { id: 'interview', text: 'Interview Dale Hollis (interview room)', hidden: true, target: { x: 14.5, z: 5 } },
      { id: 'verdict', text: 'Report your findings to Rosa', hidden: true, target: { x: 16, z: 18 } },
      { id: 'serum', text: 'The Hearing: the truth serum (Hearing Room, Day 5, 10:00)', hidden: true, target: { x: 16, z: 22 } },
    ],
    rewards: { xp: 200, rep: { candor: 10 } },
    completeText: 'Your first week in Candor is over. Everyone in the Hearing Room knows something about you now.',
  });
  Q({
    id: 'week_erudite', title: 'Method', type: 'main', giver: null,
    summary: 'Erudite initiation, the first week. Dr. Park doesn\'t care what you know. She cares how you find out.',
    startText: 'Dr. Helen Park: "Knowledge is cheap. Method is not. Benches, please."',
    objectives: [
      { id: 'vessels', text: 'Bench one: measure the reagent (the lab, west bench)', target: { x: 6, z: 6.5 } },
      { id: 'relays', text: 'Bench two: the relay board (the lab, east console)', hidden: true, target: { x: 17, z: 3.2 } },
      { id: 'errand', text: 'Bring Dr. Park the calibration notes from her office (21:30)', hidden: true, target: { x: 27, z: 5 } },
      { id: 'exam', text: 'The examination (the lab, Day 5, 10:00)', hidden: true, target: { x: 12, z: 8 } },
    ],
    rewards: { xp: 200, rep: { erudite: 10 } },
    completeText: 'Your first week in Erudite is over. You have more questions than you came in with. That is the point.',
  });
  Q({
    id: 'week_abnegation', title: 'Nothing for Yourself', type: 'main', giver: null,
    summary: 'Abnegation initiation, the first week. There\'s no test. There\'s the work, and how you do it, and who you do it for.',
    startText: 'Elder Joan Hayes: "There\'s never enough. That\'s the first thing to learn. The second is what to do about it."',
    objectives: [
      { id: 'distribute', text: 'Hand out the supplies on the cart — find out what each person needs first', target: { x: 8, z: 10.5 } },
      { id: 'dinner', text: 'Dinner at the Hayes house', hidden: true, target: { x: 33, z: 1.2 } },
      { id: 'envelope', text: 'Take Joan\'s envelope to Ezra at the warehouse, east end, after curfew', hidden: true, target: { x: 58, z: 8 } },
      { id: 'reflect', text: 'Sit with Joan', hidden: true, target: { x: 30, z: 13 } },
    ],
    rewards: { xp: 200, rep: { abnegation: 10 } },
    completeText: 'Your first week in Abnegation is over. Nobody thanked you for any of it. That was rather the point.',
  });
  Q({
    id: 'week_amity', title: 'Common Ground', type: 'main', giver: null,
    summary: 'Amity initiation, the first week. Two neighbours, one stream, and the whole orchard waiting to see if the new initiate can help them find a way.',
    startText: 'Mary Ellis: "We don\'t have judges. We have each other, and the circle. Go and listen to them both."',
    objectives: [
      { id: 'listen', text: 'Hear both sides: Ruth Calder (the orchard) and Tom Asher (the seedbeds)', target: { x: 30, z: 26 } },
      { id: 'channel', text: 'Walk the channel and see the water for yourself', hidden: true, target: { x: 40, z: 9 } },
      { id: 'circle', text: 'The circle: help Ruth and Tom find common ground (under the big tree)', hidden: true, target: { x: 23, z: 17 } },
      { id: 'supper', text: 'Supper with the orchard', hidden: true, target: { x: 15, z: 12 } },
    ],
    rewards: { xp: 200, rep: { amity: 10 } },
    completeText: 'Your first week in Amity is over. The water runs to both sides of the orchard.',
  });

  DV.FirstWeek = FW;
})();
