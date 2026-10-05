/* ==========================================================================
   DIVERGENT — Build 3: Dauntless initiation, Stage One
   The rules of the week: who is in the class, what happens when (the
   training plan), how a session runs when you show up for it, how
   everything you do turns into points, the rankings board, and the cut.

   Days 3–5 are training days, three blocks each (the range, the bags,
   knives, sparring, ranked fights). Turn up to a block while it's on and
   the instructor runs it with you; turn up late and it costs you; don't
   turn up and it costs you more. Everyone else in the class is training
   too, on their own schedules, and their scores are worked out from who
   they are (with a little luck). Day 6, 08:00: the final rankings, and the
   bottom two are cut — factionless. Then Stage Two begins.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const T = U.parseTime;

  /* ------------------------------ the class ------------------------------ */
  // `base`: who they were on Aptitude Day (they're only here if they chose Dauntless)
  const CLASS = [
    { id: 'd_ella', base: 'young_ella', range: 84, knives: 80, power: 0.86, style: 'boxer', born: true, bunk: 'bunk_n1_lo' },
    { id: 'd_kat', base: 'kat_malone', range: 78, knives: 72, power: 0.74, style: 'boxer', born: true, bunk: 'bunk_n0_hi' },
    { id: 'd_nate', base: 'nate_russo', range: 72, knives: 60, power: 0.72, style: 'wild', born: true, bunk: 'bunk_n0_lo' },
    { id: 'd_josh', base: 'josh_miller', range: 58, knives: 54, power: 0.8, style: 'brawler', bunk: 'bunk_n3_lo' },
    { id: 'd_marcus', base: null, range: 70, knives: 66, power: 0.56, style: 'cautious', bunk: 'bunk_n3_hi' },
    { id: 'd_bryce', base: null, range: 50, knives: 44, power: 0.6, style: 'brawler', bunk: 'bunk_n4_lo' },
    { id: 'd_joey', base: 'joey_brennan', range: 46, knives: 50, power: 0.5, style: 'novice', born: true, bunk: 'bunk_n2_lo' },
    { id: 'd_daniel', base: 'daniel_webb', range: 36, knives: 42, power: 0.3, style: 'novice', bunk: 'bunk_s3_lo' },
  ];
  const STAT = { // how they fight (strength, agility, resolve, perception, melee)
    d_ella: { strength: 6, agility: 8, resolve: 7, perception: 6, melee: 48 },
    d_kat: { strength: 6, agility: 7, resolve: 6, perception: 6, melee: 42 },
    d_nate: { strength: 6, agility: 6, resolve: 5, perception: 4, melee: 40 },
    d_josh: { strength: 8, agility: 4, resolve: 6, perception: 4, melee: 40 },
    d_marcus: { strength: 4, agility: 6, resolve: 5, perception: 7, melee: 30 },
    d_bryce: { strength: 6, agility: 4, resolve: 4, perception: 3, melee: 30 },
    d_joey: { strength: 6, agility: 3, resolve: 4, perception: 4, melee: 25 },
    d_daniel: { strength: 3, agility: 4, resolve: 5, perception: 6, melee: 18 },
  };

  /* ------------------------------ the week ------------------------------ */
  const PLAN = {
    3: [
      { id: 'range', kind: 'range', t0: '08:00', t1: '10:00', title: 'Firearms', where: 'the range' },
      { id: 'bags', kind: 'bags', t0: '10:00', t1: '12:00', title: 'Hand to hand', where: 'the bags' },
      { id: 'spar', kind: 'spar', t0: '13:30', t1: '16:30', title: 'Sparring', where: 'the ring' },
    ],
    4: [
      { id: 'knives', kind: 'knives', t0: '08:00', t1: '10:00', title: 'Knives', where: 'the knife wall' },
      { id: 'range2', kind: 'range', t0: '10:00', t1: '12:00', title: 'Firearms', where: 'the range', ranked: true },
      { id: 'fight1', kind: 'fight', t0: '13:30', t1: '16:30', title: 'Fights', where: 'the ring', ranked: true },
    ],
    5: [
      { id: 'knives2', kind: 'knives', t0: '08:00', t1: '10:00', title: 'Knives', where: 'the knife wall', ranked: true, lesson: true },
      { id: 'bags2', kind: 'bags', t0: '10:00', t1: '12:00', title: 'Hand to hand', where: 'the bags' },
      { id: 'fight2', kind: 'fight', t0: '13:30', t1: '16:30', title: 'Fights', where: 'the ring', ranked: true },
    ],
    6: [
      { id: 'cut', kind: 'cut', t0: '08:00', t1: '09:30', title: 'Final rankings', where: 'the rankings board' },
      { id: 'fear', kind: 'fear', t0: '10:00', t1: '12:00', title: 'Stage Two', where: 'the Simulation Room' },
    ],
  };
  const MEALS = [['07:00', '07:45'], ['12:30', '13:15'], ['19:00', '20:00']];
  // where the class spends its free time (none of these are the members' usual places)
  const FREE = ['dorm_table_c0', 'dorm_table_c1', 'dorm_table_c2', 'dorm_table_c3', 'pit_bench_w_s0', 'pit_bench_w_s1', 'pit_bench_w_s2', 'pit_bench_e_s0', 'pit_bench_e_s1', 'pit_bench_e_s2',
    'rail0', 'rail1', 'rail3', 'hang0', 'hang1', 'hang2', 'hang3', 'hang4', 'hang5', 'hang6', 'hang7'];
  const FIRST = 3, LAST = 6, CUT = 2;

  const I = {
    CLASS, PLAN, STAT, FIRST, LAST, CUT, FREE, MEALS,

    /* ---------------- state ---------------- */
    st() {
      const s = DV.State.data.story || (DV.State.data.story = {});
      if (!s.init) s.init = { blocks: {}, pts: { player: 0 }, log: [], posted: null, cut: null, expelled: {}, training: {}, flags: {} };
      return s.init;
    },
    active() { return DV.District.currentId() === 'dauntless'; },
    day() { return DV.Clock.day(); },

    /* ---------------- the class ---------------- */
    member(id) { return CLASS.find((c) => c.id === id) || null; },
    here(id) {
      const c = this.member(id);
      if (!c) return false;
      if (this.st().expelled[id]) return false;
      if (this.st().cut && this.st().cut.indexOf(id) >= 0) return false;
      return !c.base || (DV.Hub && DV.Hub.choiceOf(c.base) === 'dauntless');
    },
    // still in the class at all (the cut and the expelled are gone)
    roster() { return CLASS.filter((c) => this.here(c.id)); },
    nameOf(id) {
      if (id === 'player') return (DV.State.data.story && DV.State.data.story.dauntlessName) || DV.State.data.player.name;
      const d = DV.NPCData.get(id);
      return d ? d.name : id;
    },
    first(id) { return this.nameOf(id).split(' ')[0]; },
    // the weakest in the class: Daniel if he came, Joey if he didn't
    underdog() { return this.here('d_daniel') ? 'd_daniel' : 'd_joey'; },

    /* ---------------- the plan ---------------- */
    blocks(day) { return PLAN[day === undefined ? this.day() : day] || []; },
    key(b, day) { return 'd' + (day === undefined ? this.day() : day) + ':' + b.id; },
    status(b, day) { return this.st().blocks[this.key(b, day)] || null; },
    // the block that's on right now (if any)
    current() {
      const m = DV.Clock.minutes();
      return this.blocks().find((b) => m >= T(b.t0) && m < T(b.t1)) || null;
    },
    // the next block you still have to do today (on now, or later)
    pending() {
      const m = DV.Clock.minutes();
      return this.blocks().find((b) => m < T(b.t1) && !this.status(b)) || null;
    },
    meal() {
      const m = DV.Clock.minutes();
      return MEALS.find(([a, b]) => m >= T(a) && m < T(b)) || null;
    },
    canSleep() {
      const m = DV.Clock.minutes();
      return m >= T('20:30') || m < T('04:00');
    },

    /* ---------------- points ---------------- */
    award(who, pts, why, b) {
      const s = this.st();
      s.pts[who] = Math.round((s.pts[who] || 0) + pts);
      s.log.push({ d: this.day(), b: b ? b.id : null, who, pts: Math.round(pts), why });
      if (s.log.length > 400) s.log.shift();
      if (who === 'player' && pts) DV.UI.notify((pts > 0 ? '+' : '') + Math.round(pts) + ' ranking points — ' + why, pts > 0 ? 'rep_up' : 'rep_down');
    },
    points(who) { return this.st().pts[who] || 0; },
    rankings() {
      const rows = this.roster().map((c) => ({ id: c.id, name: this.nameOf(c.id), pts: this.points(c.id) }));
      if (!this.st().playerCut) rows.push({ id: 'player', name: this.nameOf('player'), pts: this.points('player'), you: true });
      rows.sort((a, b) => b.pts - a.pts || (a.you ? -1 : 1));
      return rows;
    },
    rankOf(who) { return this.rankings().findIndex((r) => r.id === who) + 1; },
    // write the rankings up on the board (and remember them)
    post(title, withCut) {
      const rows = this.rankings();
      const cutAt = withCut ? Math.max(0, rows.length - CUT) : null;
      this.st().posted = { title, day: this.day(), rows: rows.map((r) => ({ id: r.id, pts: r.pts })), cutAt };
      this.drawBoard();
      return rows;
    },
    drawBoard() {
      const z = DV.World.current;
      if (!z || !z.rankBoard) return;
      const p = this.st().posted;
      if (!p) { z.rankBoard.draw('STAGE ONE', [], null); return; }
      const rows = p.rows.map((r) => ({ name: this.nameOf(r.id), pts: r.pts, you: r.id === 'player' }));
      z.rankBoard.draw(p.title, rows, p.cutAt);
    },

    /* ---------------- everyone else's day ---------------- */
    rng(tag) { return U.rng(String(DV.State.data.meta.created || 1) + ':' + tag); },
    // when a block ends, everybody else gets their scores for it
    simulate(b, day) {
      const key = this.key(b, day);
      const s = this.st();
      if (s.flags['sim:' + key]) return;
      s.flags['sim:' + key] = true;
      const r = this.rng(key);
      const rost = this.roster();
      if (b.kind === 'range' || b.kind === 'knives') {
        for (const c of rost) {
          let skill = c[b.kind === 'range' ? 'range' : 'knives'];
          if (c.id === this.underdog()) skill += (s.training[c.id] || 0) * 6;
          const score = U.clamp(skill + (r() - 0.5) * 30, 5, 100);
          this.award(c.id, score * 1.5, b.title, b);
        }
      } else if (b.kind === 'bags') {
        for (const c of rost) this.award(c.id, 30 + Math.round(r() * 20), b.title, b);
      } else if (b.kind === 'spar') {
        for (const c of rost) this.award(c.id, 40 + Math.round(r() * 30), b.title, b);
      } else if (b.kind === 'fight') {
        for (const [a, o] of this.pairings(b, day)) {
          if (a === 'player' || o === 'player') continue;
          if (!o) { this.award(a, 70, 'No opponent', b); continue; }
          const pa = this.power(a), po = this.power(o);
          const aWins = r() < pa / (pa + po);
          const w = aWins ? a : o, l = aWins ? o : a;
          this.award(w, 150 + Math.round(r() * 40), 'Won a fight', b);
          this.award(l, 40 + Math.round(r() * 40), 'Lost a fight', b);
          (s.fights || (s.fights = [])).push({ d: day === undefined ? this.day() : day, w, l });
        }
      }
    },
    power(id) {
      const c = this.member(id);
      let p = c ? c.power : 0.5;
      if (id === this.underdog()) p += (this.st().training[id] || 0) * 0.12;
      return p;
    },
    // who fights whom: you get a set opponent; everyone else is matched with the person nearest them in the rankings
    opponentFor(b, day) {
      const d = day === undefined ? this.day() : day;
      if (b.id === 'spar') return this.here('d_joey') ? 'd_joey' : this.roster()[0].id;
      if (d === 4) return this.here('d_bryce') ? 'd_bryce' : 'd_marcus';
      return this.here('d_josh') ? 'd_josh' : 'd_marcus';
    },
    pairings(b, day) {
      const me = this.opponentFor(b, day);
      const rest = this.roster().filter((c) => c.id !== me).map((c) => c.id);
      rest.sort((x, y) => this.points(y) - this.points(x));
      const out = [['player', me]];
      for (let i = 0; i < rest.length; i += 2) out.push([rest[i], rest[i + 1] || null]);
      return out;
    },

    /* ---------------- your sessions ---------------- */
    // a station (a lane, a bag, the knife line, the ring) or the instructor was used: start the block if it's on
    canStart(kind) {
      const b = this.current();
      if (!b || this.status(b) === 'done' || this.status(b) === 'missed') return null;
      if (kind && b.kind !== kind) return null;
      if (this.busy) return null;
      return b;
    },
    begin(b, station) {
      if (this.busy) return;
      this.busy = b;
      const late = DV.Clock.minutes() > T(b.t0) + 20;
      if (late && !this.st().blocks[this.key(b) + ':late']) {
        this.st().blocks[this.key(b) + ':late'] = true;
        this.award('player', -25, 'Late for ' + b.title.toLowerCase(), b);
        DV.Reputation.addRel('d_mark', -3, true);
      }
      const mark = DV.NPCs.get('d_mark');
      const say = (t, secs) => { if (mark && mark.present) { mark.say(t, secs || 3.6); DV.UI.subtitle('Mark Rivera', t, secs || 3.6); } };
      const done = (res) => this.finish(b, res || {});
      const Tr = DV.Training;
      const opts = { ranked: !!b.ranked, block: b, say };
      switch (b.kind) {
        case 'range': Tr.range(Object.assign(opts, { lane: station && station.lane }), done); break;
        case 'bags': Tr.bags(Object.assign(opts, { bag: station && station.bag }), done); break;
        case 'knives':
          if (b.lesson && !this.st().flags.lessonDone && DV.StageOne) { this.busy = null; DV.StageOne.knifeLesson(b); return; }
          Tr.knives(opts, done);
          break;
        case 'spar':
        case 'fight': this.ringFight(b, done); break;
        default: this.busy = null;
      }
    },
    finish(b, res) {
      const s = this.st();
      this.busy = null;
      s.blocks[this.key(b)] = 'done';
      // your points for it
      let pts = 0, why = b.title;
      if (b.kind === 'range' || b.kind === 'knives') { pts = (res.score || 0) * 1.5; why = b.title + ' — ' + Math.round(res.score || 0) + '/100'; }
      else if (b.kind === 'bags') pts = 20 + Math.round((res.score || 0) * 0.4);
      else if (b.kind === 'spar') pts = 40 + (res.winner === 'player' ? 30 : 0) - (res.how === 'yield' ? 20 : 0);
      else if (b.kind === 'fight') {
        const perf = U.clamp(((res.dealt || 0) - (res.taken || 0) * 0.5) / 3, 0, 60);
        if (res.winner === 'player') { pts = 150 + Math.min(50, perf); why = 'Won your fight'; }
        else if (res.how === 'yield') { pts = 10; why = 'Yielded'; }
        else { pts = 40 + perf; why = 'Lost your fight'; }
        (s.fights || (s.fights = [])).push({ d: this.day(), w: res.winner === 'player' ? 'player' : this.opponentFor(b), l: res.winner === 'player' ? this.opponentFor(b) : 'player', you: true });
      }
      if (pts) this.award('player', pts, why, b);
      this.simulate(b);
      DV.Stats.addXP(b.ranked ? 40 : 25, b.title);
      DV.Events.emit('initiation:block', { block: b, result: res });
      if (DV.StageOne && DV.StageOne.onBlockDone) DV.StageOne.onBlockDone(b, res);
      // the rest of the session passes
      const next = this.blocks().find((x) => T(x.t0) >= T(b.t1) && !this.status(x));
      const sameHalf = next && T(next.t0) < T('12:30') === T(b.t0) < T('12:30');
      const to = sameHalf ? T(next.t0) + 1 : T(b.t1);
      this.passTime(to, sameHalf ? 'Later' : null);
    },
    // skip ahead (fade out, the clock moves on, everyone is where they should be, fade in)
    passTime(to, label, then) {
      const G = DV.Game;
      if (DV.Clock.minutes() >= to) { if (then) then(); return; }
      G.state = 'transition';
      DV.UI.fade(1, 700).then(() => {
        DV.Clock.skipTo(to);
        DV.NPCAI.syncAll();
        // standing where you finished, everyone else moves on
        G.state = 'playing';
        DV.Input.requestLock();
        DV.UI.fade(0, 900);
        DV.UI.narrate((label ? label + ' · ' : '') + DV.Clock.str(), 2.2);
        if (then) then();
      });
    },
    // the ring: your opponent steps in, the rest of the class gathers round
    ringFight(b, done) {
      const z = DV.World.current;
      const oppId = this.opponentFor(b);
      const npc = DV.NPCs.get(oppId);
      const R = z.ring;
      const st = STAT[oppId] || {};
      const style = Object.assign({}, DV.Combat.styles[this.member(oppId).style] || {});
      // a sparring partner goes easy on you
      if (b.kind === 'spar') Object.assign(style, { aggression: style.aggression * 0.7, punish: style.punish * 0.6 });
      const stats = Object.assign({}, st);
      if (oppId === this.underdog()) stats.melee += (this.st().training[oppId] || 0) * 10;
      DV.Combat.fight({
        opponent: { name: this.nameOf(oppId), npc, stats, ai: style },
        ring: R,
        start: { player: [R.cx, R.cz + 1.4], opponent: [R.cx, R.cz - 1.4] },
        title: b.kind === 'spar' ? 'SPAR' : 'FIGHT',
        timeLimit: b.kind === 'spar' ? 90 : 150,
        allowYield: true,
        onEvent: (type, data) => this.crowd(type, data),
      }, (res) => {
        // patched up afterwards if you need it
        if (res.winner !== 'player' && res.how === 'ko') DV.State.setFlag('was_knocked_out_d' + this.day());
        done(res);
      });
    },
    // the class watching from the ring's edge
    crowd(type, data) {
      if (type === 'hit' && data.heavy) DV.Audio.play('murmur', { secs: 0.9, volume: 0.6 });
      if (type === 'knockdown' || type === 'ko') DV.Audio.play('roar', { secs: 1.6, volume: 0.6 });
      if (type === 'hit' && Math.random() < 0.25) {
        const watchers = DV.NPCs.all.filter((n) => n.present && n.def.zone === 'd_compound' && n.def.role === 'initiate' && !n.activity && n.dist < 12);
        const w = U.pick(watchers);
        if (w) w.say(data.att.isPlayer ? U.pick(['Again!', 'Ooh!', 'Keep your hands up!', 'That\'s it!']) : U.pick(['Get up, get up!', 'Move your feet!', 'Hands up!', 'Ouch.']), 1.6);
      }
    },
    // what happens at a station when nothing's on: practice (skills, no points)
    practice(kind, it) {
      const Tr = DV.Training;
      const opts = { ranked: false, practice: true };
      if (kind === 'range') Tr.range(Object.assign(opts, { lane: it.lane }), () => {});
      else if (kind === 'bags') Tr.bags(Object.assign(opts, { bag: it.bag }), (res) => { if (DV.StageOne && DV.StageOne.onPractice) DV.StageOne.onPractice('bags', res); });
      else if (kind === 'knives') Tr.knives(opts, () => {});
    },

    /* ---------------- the clock ---------------- */
    onMinute(m) {
      const d = this.day();
      if (d < FIRST || d > LAST) return;
      const s = this.st();
      for (const b of this.blocks()) {
        const k = this.key(b);
        // the call
        if (m === T(b.t0) - 10 && !s.flags['call:' + k]) { s.flags['call:' + k] = true; this.call(b); }
        // too late: missed it
        if (m >= T(b.t1) && !s.blocks[k] && this.busy !== b && b.kind !== 'cut' && b.kind !== 'fear') {
          s.blocks[k] = 'missed';
          this.award('player', b.ranked ? -100 : -60, 'Missed ' + b.title.toLowerCase(), b);
          DV.Reputation.addRel('d_mark', -6, true);
          DV.Reputation.add('dauntless', -3);
          this.simulate(b);
          DV.UI.notify('You missed ' + b.title.toLowerCase() + '. Somebody noticed.', 'quest_fail');
        }
      }
    },
    call(b) {
      const lines = {
        range: 'Initiates! Training Room, ten minutes. Bring your eyes and leave your nerves.',
        bags: 'Bags in ten. Wrap your hands or don\'t — your knuckles, your problem.',
        spar: 'Training Room! Sparring in ten minutes. Pair up and nobody gets hurt. Much.',
        knives: 'Knife wall in ten minutes, initiates. Count your fingers now so you can count them again after.',
        fight: 'Training Room! The ring, ten minutes. The pairings are on the board. These count.',
        cut: 'All initiates to the Training Room. Final rankings.',
        fear: 'Initiates: the Simulation Room. Stage Two.',
      };
      DV.Audio.play('chime');
      setTimeout(() => DV.UI.subtitle('PA', lines[b.kind] || ('Initiates — ' + b.title + '.'), 6), 1200);
    },

    /* ---------------- everyone's schedules ---------------- */
    // a day for someone in the class, built from the plan: bunk, breakfast, the blocks, meals, the evening, bunk
    classSchedule(id) {
      const c = this.member(id);
      const idx = CLASS.indexOf(c);
      const d = this.day();
      const L = [];
      const seat = (meal) => 'dt' + ((idx + meal) % 4) + (idx % 2 ? '_a' : '_b') + ((idx * 3 + meal) % 7);
      L.push({ t: '00:00', do: 'go', to: c.bunk, act: 'lie' });
      if (d < 2 || d > 6) return L;
      L.push({ t: '06:40', do: 'wander', room: 'dorm' });
      L.push({ t: '07:00', do: 'go', to: seat(0), act: 'sit' });
      const plan = this.blocks(d);
      for (const b of plan) {
        if (b.t0 === '13:30') L.push({ t: '12:30', do: 'go', to: seat(1), act: 'sit' });
        L.push(...this.blockSchedule(b, id, idx));
      }
      if (d >= 3 && d <= 5) {
        if (!plan.some((b) => b.t0 === '13:30')) L.push({ t: '12:30', do: 'go', to: seat(1), act: 'sit' });
      } else if (d === 2) L.push({ t: '13:00', do: 'go', to: seat(1), act: 'sit' });
      if (d === 6) { L.push({ t: '12:30', do: 'go', to: seat(1), act: 'sit' }); }
      // the afternoon off, the evening: everyone somewhere different (2·idx is distinct mod the list's length)
      const FREE = I.FREE;
      const free = (slot) => FREE[(idx * 2 + d + slot * 5) % FREE.length];
      if (d === 2) L.push({ t: '11:10', do: 'go', to: free(3) });
      L.push({ t: '16:40', do: 'go', to: free(0) });
      L.push({ t: '18:00', do: 'go', to: free(1) });
      L.push({ t: '19:00', do: 'go', to: seat(2), act: 'sit' });
      L.push({ t: '20:00', do: 'go', to: free(2) });
      L.push({ t: '21:30', do: 'go', to: free(4) });
      L.push({ t: '22:40', do: 'go', to: c.bunk, act: 'lie' });
      L.sort((a, b) => T(a.t) - T(b.t));
      return L;
    },
    blockSchedule(b, id, idx) {
      const out = [];
      const t0 = T(b.t0), t1 = T(b.t1);
      const at = (m) => U.formatTime(m);
      const n = CLASS.length;
      if (b.kind === 'range') {
        // three lanes, the rest waiting their turn at the line; swap every 25 minutes
        for (let m = t0, r = 0; m < t1; m += 25, r++) {
          const k = (idx + r * 3) % n;
          out.push(k < 3 ? { t: at(m), do: 'go', to: 'lane' + k, act: 'aim' } : { t: at(m), do: 'go', to: 'line' + (k % 8), act: 'arms_crossed' });
        }
      } else if (b.kind === 'bags') {
        for (let m = t0, r = 0; m < t1; m += 30, r++) {
          const k = (idx + r * 4) % n;
          out.push(k < 4 ? { t: at(m), do: 'go', to: 'bag' + k, act: 'bagwork' } : k < 5 ? { t: at(m), do: 'go', to: 'weights0' } : { t: at(m), do: 'go', to: 'line' + (k % 8), act: 'idle' });
        }
      } else if (b.kind === 'knives') {
        for (let m = t0, r = 0; m < t1; m += 20, r++) {
          const k = (idx + r * 2) % n;
          out.push(k < 2 ? { t: at(m), do: 'go', to: 'knife' + k, act: 'throwing' } : { t: at(m), do: 'go', to: 'line' + (k % 8), act: 'arms_crossed' });
        }
      } else if (b.kind === 'spar' || b.kind === 'fight') {
        const spots = ['ringside0', 'ringside1', 'ringside2', 'ringside3', 'ringside4', 'ringside5', 'ring_bench_s0', 'ring_bench_s1', 'ring_bench_s2', 'ring_bench_s3', 'side_bench_s0', 'side_bench_s1'];
        out.push({ t: at(t0 - 5), do: 'go', to: spots[idx % spots.length], act: spots[idx % spots.length].indexOf('bench') >= 0 ? 'sit' : 'arms_crossed' });
      } else if (b.kind === 'cut') {
        out.push({ t: at(t0 - 5), do: 'go', to: 'line' + (idx % 8), act: 'idle' });
      } else if (b.kind === 'fear') {
        // waiting their turn in a line in the training hall, the Simulation Room door across the way
        out.push({ t: at(t0 - 5), do: 'go', to: 'line' + (idx % 8), act: 'arms_crossed' });
      }
      return out;
    },
    // where the instructor is: wherever the block is
    markSchedule() {
      const d = this.day();
      const L = [{ t: '06:20', do: 'arrive', to: 'dorm_door_in', act: 'arms_crossed' }, { t: '07:05', do: 'go', to: 'mark_dining' }];
      const where = { range: 'mark_range', bags: 'mark_bags', knives: 'mark_knives', spar: 'mark_ring', fight: 'mark_ring', cut: 'mark_brief', fear: 'sim_mark' };
      if (!this.blocks(d).length) {
        // no training (the day you arrive): about the compound
        return [{ t: '06:20', do: 'arrive', to: 'mark_dining' }, { t: '11:00', do: 'go', to: 'pit_c2', act: 'arms_crossed' }, { t: '12:35', do: 'go', to: 'mark_dining' }, { t: '14:00', do: 'go', to: 'mark_brief', act: 'arms_crossed' }, { t: '17:00', do: 'go', to: 'pit_c2', act: 'arms_crossed' }, { t: '19:05', do: 'go', to: 'mark_dining' }, { t: '20:30', do: 'go', to: 'mark_rail', act: 'lean' }, { t: '23:15', do: 'leave' }];
      }
      for (const b of this.blocks(d)) {
        L.push({ t: U.formatTime(T(b.t0) - 12), do: 'go', to: where[b.kind] || 'mark_brief', act: 'arms_crossed' });
        L.push({ t: b.t1, do: 'go', to: T(b.t1) < T('12:30') ? 'mark_brief' : 'pit_c2', act: 'arms_crossed' });
      }
      L.push({ t: '12:35', do: 'go', to: 'mark_dining' });
      L.push({ t: '19:05', do: 'go', to: 'mark_dining' });
      L.push({ t: '20:30', do: 'go', to: 'mark_rail', act: 'lean' });
      L.push({ t: '23:15', do: 'leave' });
      L.sort((a, b) => T(a.t) - T(b.t));
      // de-duplicate times (later entries win)
      return L.filter((e, i) => !L.slice(i + 1).some((x) => x.t === e.t));
    },
    danaSchedule() {
      const d = this.day();
      const L = [];
      const plan = this.blocks(d);
      const big = plan.filter((b) => b.ranked || b.kind === 'cut' || b.kind === 'fight');
      for (const b of big) {
        L.push({ t: U.formatTime(T(b.t0) - 8), do: 'arrive', to: b.kind === 'cut' ? 'mark_ring' : 'dana_watch', act: 'arms_crossed' });
        L.push({ t: U.formatTime(Math.min(T(b.t1), T(b.t0) + 75)), do: 'leave' });
      }
      return L;
    },

    /* ---------------- the end of Stage One ---------------- */
    // the bottom of the board is cut (you might be)
    makeCut() {
      const s = this.st();
      if (s.cut) return s.cut;
      const rows = this.rankings();
      const out = rows.slice(rows.length - CUT).map((r) => r.id);
      s.cut = out.filter((id) => id !== 'player');
      if (out.indexOf('player') >= 0) s.playerCut = true;
      return out;
    },
  };

  /* ------------------------------ world actions ------------------------------ */
  Object.assign(DV.Actions, {
    sleep() {
      if (!I.active()) return { message: 'Not here.' };
      if (DV.StageOne && DV.StageOne.beforeSleep && DV.StageOne.beforeSleep()) return null;
      if (!I.canSleep()) {
        // a rest instead: an hour or two on your bunk
        if (!DV.Wait.start(60, { quiet: true })) return null;
        return { message: 'You lie on your bunk and stare at the rock ceiling for an hour. It doesn\'t get any lower.' };
      }
      DV.District.sleep({});
      return null;
    },
    bag(game, it) {
      const b = I.canStart('bags');
      if (b) I.begin(b, it); else I.practice('bags', it);
      return null;
    },
    range(game, it) {
      const b = I.canStart('range');
      if (b) I.begin(b, it); else I.practice('range', it);
      return null;
    },
    knife_line(game, it) {
      const b = I.canStart('knives');
      if (b) I.begin(b, it); else I.practice('knives', it);
      return null;
    },
    ring(game, it) {
      const b = I.canStart('spar') || I.canStart('fight');
      if (b) { I.begin(b, it); return null; }
      return { message: 'The ring is for fights. Your name isn\'t up.' };
    },
    rankings() {
      const p = I.st().posted;
      const rows = I.rankings();
      if (!p) return { read: { title: 'Rankings Board', text: 'Chalk dust and nothing else yet. The first rankings go up after the first fights.\n\nRight now, counting everything you\'ve done, you\'d be ' + ordinal(I.rankOf('player')) + ' of ' + rows.length + '.' } };
      const lines = p.rows.map((r, i) => (i === p.cutAt ? '— — — — — — — — the cut — — — — — — — —\n' : '') + String(i + 1).padStart(2, ' ') + '.  ' + I.nameOf(r.id) + (r.id === 'player' ? '   ◄ you' : '') + '   ' + r.pts);
      return { read: { title: p.title, text: lines.join('\n') + '\n\n' + (p.cutAt !== null && p.cutAt !== undefined ? 'Below the line is factionless.' : 'Stage One ends with a ranking. The ranking ends with a cut.') } };
    },
  });
  function ordinal(n) { return n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'); }
  I.ordinal = ordinal;

  DV.Initiation = I;
})();
