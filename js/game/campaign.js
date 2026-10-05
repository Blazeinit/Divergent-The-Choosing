/* ==========================================================================
   DIVERGENT — the campaign (Build 5): "The Chalk Year"
   What happens after the first week (or Stage One and Two): the murders the
   city blames on a man with chalk, the Quiet, the red folder, and a vote at
   the Hub. The full story is in docs/CAMPAIGN.md.

   This file is the director: it knows the acts and episodes, who has been
   given the case, what proof the player holds, who trusts them, and how it
   ends. The episodes themselves (js/zones/camp_*.js) are Chapters that call
   DV.Campaign.give / clue / trust / complete.

     DV.Campaign.begin(f)           the first week (or Stage Two) is over: Act II opens
     DV.Campaign.available()        is there a case or a chapter to take?
     DV.Campaign.takeNext()         the card: "your next assignment" → start it
     DV.Campaign.start(id) / complete(id, outcome) / home()
     DV.Campaign.give(piece, how) / has / count / proofCount
     DV.Campaign.clue(id, text, { suspect }) / suspectScore(who)
     DV.Campaign.trust(who, d, why) / trustOf(who) / kill(who, why)
     DV.Campaign.eligible(ending) / finish(ending)

   Saved in DV.State.data.story.campaign (made on first use, so older saves
   load as they were).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  /* ------------------------------ the proof ------------------------------ */
  // `hard`: one of the five pieces the cases give (the ending's "proof" counts those)
  const PIECES = {
    chalk: { name: 'The night log and the chalk', from: 'Night Duty', faction: 'dauntless', hard: true, text: 'A night-duty log initialled "D.C." and a tin of the chalk the circles are drawn with. The Order\'s Calibration Team draws them after the dead are found, not before.' },
    ledger: { name: 'Marta\'s statement and the Hollis ledger', from: 'The Sister', faction: 'candor', hard: true, text: 'A sealed statement from a living victim of the Quiet, and the dispensary ledger that shows what her brother had to steal to keep her breathing. It names who signed for lot 33.' },
    lot33: { name: 'Dr. Park\'s calibration notes', from: 'Lot Thirty-Three', faction: 'erudite', hard: true, text: 'Series 7 calibration notes. The dose that was raised on purpose, the failure rate in the Divergent, and the lot number the Directorate pulled when it went wrong.' },
    tally: { name: 'Joan\'s tally', from: 'The Tally', faction: 'abnegation', hard: true, text: 'Forty names in a plain hand, each ticked or crossed. Set against the red folder it is the same list, and every one of the crossed names is a circle in the road.' },
    manifest: { name: 'The dispensary manifests', from: 'The Bread', faction: 'amity', hard: true, text: 'Delivery manifests with the same lot numbers as the calibration room, on their way into Amity\'s peace tin. It is in the food.' },
    page: { name: 'Your own page of the red folder', from: 'Erudite week', hard: false, text: 'The page you tore out of the red folder in Dr. Park\'s office: your name, "access: EASY", "follow-up recommended".' },
    witness: { name: 'Claire Dawson\'s word', from: 'The Testing Center', hard: false, text: 'The proctor who warned you will say, in front of anyone, that results are overridden by hand at Sector 4.' },
  };

  /* ------------------------------ the allies ------------------------------ */
  // name, which faction they belong to, and the flags that start them off trusting you
  const ALLIES = {
    rosa: { name: 'Rosa Medina', faction: 'candor', seed: { rosa_protects: 2, rosa_knows: 0, lied_to_rosa: -1 } },
    park: { name: 'Dr. Helen Park', faction: 'erudite', seed: { park_ally: 2, park_interested: 1 } },
    joan: { name: 'Elder Joan Hayes', faction: 'abnegation', seed: { joan_protects: 2, opened_joan_envelope: -1 } },
    aaron: { name: 'Aaron Hayes', faction: 'abnegation', seed: { joan_protects: 1 } },
    ezra: { name: 'Ezra', faction: 'factionless', seed: { ezra_contact: 2 } },
    mary: { name: 'Mary Ellis', faction: 'amity', seed: { mary_doubts: 2, knows_peace_bread: 1 } },
    mark: { name: 'Mark Rivera', faction: 'dauntless', seed: { mark_warned: 1, mark_knows_josh: 1 } },
    claire: { name: 'Claire Dawson', faction: 'erudite', seed: { claire_ally: 2, claire_hinted: 1 } },
    ama: { name: 'Dr. Ama Mensah', faction: 'dauntless', seed: {} },
    nina: { name: 'Nina Kaur', faction: 'dauntless', seed: { nina_warned: 1 } },
    bo: { name: 'Bo Kaminski', faction: 'dauntless', seed: { rode_zip_line: 1 } },
    tess: { name: 'Tess Navarro', faction: 'dauntless', seed: {} },
    dale: { name: 'Dale Hollis', faction: 'candor', seed: { hollis_spared: 2, hollis_sentenced: -2 } },
    marta: { name: 'Marta Hollis', faction: 'candor', seed: {} },
  };

  /* ------------------------------ the episodes ------------------------------ */
  // `faction`: whose case it is (null = everyone). The chapter of the same id is defined in js/zones/camp_*.js.
  // `needs`: the ids that must be done first (all of them). `day`/`time`: when it is (the chapter sets the clock).
  const EPISODES = [
    { id: 'camp_d1', act: 2, faction: 'dauntless', title: 'Night Duty', day: 7, time: '21:30', needs: [], summary: 'Dana Cole has put you on the night patrol, and the Order has asked for Dauntless on the sixth circle. Ride out with Bo under the drones.' },
    { id: 'camp_d2', act: 2, faction: 'dauntless', title: 'The Night Log', day: 8, time: '22:30', needs: ['camp_d1'], summary: 'The chalk was dry before the body was cold. Somebody signs the night log. Find out whose initials they are, and what to do with them.' },
    { id: 'camp_c1', act: 2, faction: 'candor', title: 'The Sister', day: 7, time: '09:00', needs: [], summary: 'Dale Hollis stole medicine for a sister nobody had heard of. Rosa wants her found, and she wants you to do it, because you are the one he told.' },
    { id: 'camp_c2', act: 2, faction: 'candor', title: 'Sealed', day: 8, time: '15:00', needs: ['camp_c1'], summary: 'Marta Hollis will give her statement to the tribunal and to no one else. The tribunal has its seal on more than the statement.' },
    { id: 'camp_e1', act: 2, faction: 'erudite', title: 'Lot Thirty-Three', day: 7, time: '10:00', needs: [], summary: 'Dr. Park wants her calibration notes checked before the Directorate sees them. They are in the archive, three floors down, in a room you are not meant to enter.' },
    { id: 'camp_e2', act: 2, faction: 'erudite', title: 'The Calibration Room', day: 8, time: '23:00', needs: ['camp_e1'], summary: 'The notes are one thing. The room they describe is another. Dr. Pierce has a key and an appointment, and so do you.' },
    { id: 'camp_a1', act: 2, faction: 'abnegation', title: 'The Tally', day: 7, time: '16:00', needs: [], summary: 'Joan has a list of forty names, a cellar to keep it in and a plan that needs another pair of hands. She has chosen yours.' },
    { id: 'camp_a2', act: 2, faction: 'abnegation', title: 'The Sweep', day: 9, time: '20:30', needs: ['camp_a1'], summary: 'The Order comes down the grey street with a clipboard before curfew. One family on the list has not been moved. There is time for one thing.' },
    { id: 'camp_m1', act: 2, faction: 'amity', title: 'The Dispensary', day: 7, time: '14:00', needs: [], summary: 'Mary lets you into the dispensary store, because you asked about the bread and she cannot lie to a face she likes. The shelves have numbers on them.' },
    { id: 'camp_m2', act: 2, faction: 'amity', title: 'The Night Truck', day: 9, time: '22:00', needs: ['camp_m1'], summary: 'A truck comes to the farm gate at ten with crates that are not for the farm. The manifests are in the cab.' },
    { id: 'camp_x1', act: 3, faction: null, title: 'The Seventh Circle', day: 10, time: '06:10', needs: ['@case'], summary: 'The seventh circle is on a pavement you know, and someone you know is inside it. A lieutenant in a plain coat is already there.' },
    { id: 'camp_x2', act: 3, faction: null, title: 'Under the Tracks', day: 10, time: '20:00', needs: ['camp_x1'], summary: 'Ezra\'s refuge under the L: a stove, a map table and everyone who trusts you enough to come. Put the proof on the table. Then work out who told.' },
    { id: 'camp_x3', act: 3, faction: null, title: 'The Night of the Scan', day: 11, time: '21:00', needs: ['camp_x2'], summary: 'The Order sweeps the grey street for the list. The drones are out. Every family you save is one the Directorate does not have.' },
    { id: 'camp_z1', act: 4, faction: null, title: 'The Hearing', day: 12, time: '10:00', needs: ['camp_x3'], summary: 'The Council votes on the Continuity Act in the Choosing Hall. Dean Vance will speak first. You will have a minute, and whatever is on the table.' },
  ];
  const ENDINGS = {
    open_air: { name: 'Open Air', line: 'The vote fails. The Directorate stands in the light, and the city starts to argue about it for the first time.' },
    the_quiet: { name: 'The Quiet', line: 'The Act passes. You are protected, and used. The city is calm, and well lit, and silent.' },
    under_the_tracks: { name: 'Under the Tracks', line: 'You vanish with Ezra. The Act passes without you. Down below, the circle keeps moving people out.' },
    beyond_the_fence: { name: 'Beyond the Fence', line: 'You take the proof and the flagged through the gate. The Fence shuts behind you. What is on the other side is for another year.' },
    the_quiet_passes: { name: 'The Quiet Passes', line: 'The Act passes. The Divergent are collected. A tin of bread on a doorstep, and a circle of chalk.' },
  };

  /* ------------------------------ the director ------------------------------ */
  const C = {
    PIECES, ALLIES, EPISODES, ENDINGS,
    VERSION: 1,

    st() {
      const s = DV.State.data.story = DV.State.data.story || {};
      if (!s.campaign) s.campaign = { started: false, faction: null, act: 1, ep: {}, pieces: {}, clues: [], trust: {}, dead: [], saved: 0, ending: null, seeded: false, outcomes: {} };
      return s.campaign;
    },
    started() { return !!this.st().started; },
    faction() { return this.st().faction || DV.State.data.player.faction; },
    flag(n) { return !!DV.State.flag(n); },

    /* ---- opening ---- */
    // the first week (or Stage Two) is over: the Act opens. Safe to call more than once.
    begin(f) {
      const st = this.st();
      if (st.started) return false;
      st.started = true;
      st.faction = f || DV.State.data.player.faction;
      st.act = 2;
      this.seedTrust();
      DV.State.setFlag('camp_started');
      if (!DV.Quests.started('camp_main')) DV.Quests.start('camp_main', true);
      DV.Quests.setObj('camp_main', 'case', 'active');
      DV.State.note('The first weeks are over. Six people in this city have been found inside a circle of chalk. The Order says it is one man. I am not sure I believe it.');
      DV.Events.emit('campaign:begin', { faction: st.faction });
      return true;
    },
    // the first-week end banners call this once they're dismissed
    afterBanner(f) {
      if (!this.begin(f)) return;
      DV.UI.notify('A new case: The Chalk Year. Your mentor has asked to see you.', 'quest');
    },
    // how much each ally trusts you at the start: what you did in the first weeks decides
    seedTrust() {
      const st = this.st();
      if (st.seeded) return;
      st.seeded = true;
      for (const id of Object.keys(ALLIES)) {
        let v = 1;
        for (const [fl, d] of Object.entries(ALLIES[id].seed || {})) if (DV.State.flag(fl)) v += d;
        // your own faction's people start closer
        if (ALLIES[id].faction === this.faction()) v += 1;
        st.trust[id] = U.clamp(v, 0, 5);
      }
    },

    /* ---- trust ---- */
    trustOf(who) { const t = this.st().trust[who]; return t === undefined ? 1 : t; },
    trust(who, d, why) {
      const st = this.st();
      const v = U.clamp((st.trust[who] === undefined ? 1 : st.trust[who]) + d, 0, 5);
      st.trust[who] = v;
      if (why) st.clues.push({ id: 'trust:' + who + ':' + st.clues.length, text: (ALLIES[who] ? ALLIES[who].name : who) + (d >= 0 ? ' trusts you more: ' : ' trusts you less: ') + why, day: DV.Clock.day(), kind: 'trust' });
      DV.Events.emit('campaign:trust', { who, value: v });
      return v;
    },
    isDead(who) { return this.st().dead.indexOf(who) >= 0; },
    kill(who, why) {
      const st = this.st();
      if (st.dead.indexOf(who) < 0) st.dead.push(who);
      DV.State.setFlag('camp_dead_' + who);
      DV.State.note((ALLIES[who] ? ALLIES[who].name : who) + ' is dead. ' + (why || ''));
      DV.UI.notify((ALLIES[who] ? ALLIES[who].name : who) + ' is dead.', 'info');
    },
    // who will turn up at Under the Tracks (trusts you, alive)
    comes(who) { return !this.isDead(who) && this.trustOf(who) >= 3; },

    /* ---- the proof ---- */
    has(id) { return !!this.st().pieces[id]; },
    howGot(id) { const p = this.st().pieces[id]; return p ? p.how : null; },
    count() { return Object.keys(this.st().pieces).length; },
    // the five pieces the cases give
    proofCount() { return Object.keys(this.st().pieces).filter((k) => PIECES[k] && PIECES[k].hard).length; },
    give(id, how) {
      const st = this.st();
      const def = PIECES[id];
      if (!def) { console.warn('[Campaign] unknown piece', id); return false; }
      if (st.pieces[id]) { if (how === 'kept' && st.pieces[id].how !== 'kept') st.pieces[id].how = 'kept'; return false; }
      st.pieces[id] = { how: how || 'kept', day: DV.Clock.day() };
      DV.State.setFlag('camp_piece_' + id);
      DV.State.note('Proof: ' + def.name + (how === 'handed' ? ' (testimony only: I handed it over)' : '') + '.');
      DV.UI.notify('Proof: ' + def.name, 'quest');
      DV.Audio.play('paper');
      DV.Events.emit('campaign:piece', { id, how });
      return true;
    },

    /* ---- clues and the leak ---- */
    clue(id, text, o) {
      const st = this.st();
      if (st.clues.some((c) => c.id === id)) return false;
      st.clues.push({ id, text, day: DV.Clock.day(), suspect: (o && o.suspect) || null, kind: (o && o.kind) || 'clue' });
      DV.State.note(text);
      if (!o || !o.silent) DV.UI.notify('Casebook updated.', 'info');
      DV.Events.emit('campaign:clue', { id });
      return true;
    },
    hasClue(id) { return this.st().clues.some((c) => c.id === id); },
    suspectScore(who) { return this.st().clues.filter((c) => c.suspect === who).length; },
    // every clue that points at someone, by suspect
    suspects() {
      const out = {};
      for (const c of this.st().clues) if (c.suspect) out[c.suspect] = (out[c.suspect] || 0) + 1;
      return out;
    },

    /* ---- the episodes ---- */
    episode(id) { return EPISODES.find((e) => e.id === id) || null; },
    epState(id) { return this.st().ep[id] || 'new'; },
    done(id) { return this.epState(id) === 'done'; },
    // an episode is open when it's the player's own case (or everyone's), not done, and what it needs is done
    open(e) {
      if (this.done(e.id)) return false;
      if (e.faction && e.faction !== this.faction()) return false;
      return (e.needs || []).every((n) => (n === '@case' ? this.caseDone() : this.done(n)));
    },
    // both chapters of the player's own case are done
    caseDone() {
      const own = EPISODES.filter((e) => e.act === 2 && e.faction === this.faction());
      return own.length > 0 && own.every((e) => this.done(e.id));
    },
    next() {
      if (!this.started() || this.st().ending) return null;
      return EPISODES.find((e) => this.open(e)) || null;
    },
    available() { return !!this.next(); },
    // the card at the mentor / the board
    takeNext() {
      const e = this.next();
      if (!e) { DV.UI.notify('Nothing new on the board today.', 'info'); return; }
      const missing = !DV.Chapter.get(e.id);
      const lines = [e.summary, '', 'Day ' + e.day + ' · ' + e.time];
      if (missing) lines.push('', '(This part of the story is not in this build yet.)');
      DV.UI.confirm('ACT ' + ['', 'I', 'II', 'III', 'IV'][e.act] + ' — ' + e.title.toUpperCase(), lines.join('\n'), () => { if (!missing) this.start(e.id); }, null, missing ? ['Close', 'Not yet'] : ['Take it', 'Not yet']);
    },
    takeNextSoon() { setTimeout(() => this.takeNext(), 250); },
    // from a Dialogue choice: the line a mentor says when there is a case
    mentorLine() { const e = this.next(); return e ? '[The case] ' + e.title : 'About the circles...'; },
    start(id, opts) {
      const e = this.episode(id);
      if (!e) throw new Error('Unknown campaign episode ' + id);
      const st = this.st();
      st.ep[id] = 'active';
      st.act = Math.max(st.act, e.act);
      DV.State.setFlag('camp_' + id.replace('camp_', '') + '_started');
      DV.Chapter.start(id, Object.assign({ epId: id, fadeOut: 1500, fadeIn: 1500 }, opts || {}));
    },
    // an episode's last beat: marks it done, the banner, and then on to what's next
    complete(id, outcome, o) {
      o = o || {};
      const e = this.episode(id);
      const st = this.st();
      st.ep[id] = 'done';
      if (outcome !== undefined) st.outcomes[id] = outcome;
      DV.State.setFlag('camp_' + id.replace('camp_', '') + '_done');
      if (e) {
        if (e.act === 2 && this.caseDone()) DV.Quests.setObj('camp_main', 'case', 'done');
        if (id === 'camp_x1') DV.Quests.setObj('camp_main', 'x1', 'done');
        if (id === 'camp_x2') DV.Quests.setObj('camp_main', 'x2', 'done');
        if (id === 'camp_x3') DV.Quests.setObj('camp_main', 'x3', 'done');
        if (id === 'camp_z1') DV.Quests.setObj('camp_main', 'z1', 'done');
        this.openObjectives();
      }
      if (DV.Chapter.active) DV.Chapter.checkpoint('end');
      const after = () => {
        DV.Save.write('auto');
        if (o.then) o.then();
        else if (!o.stay) this.home();
      };
      const nx = this.next();
      const l3 = nx ? 'Click or press any key to carry on · next: ' + nx.title : 'Click or press any key to carry on';
      if (o.banner === false) after();
      else DV.UI.banner(o.l1 || (e ? e.title.toUpperCase() : 'CASE') + ' COMPLETE', o.l2 || '', o.l3 || l3, after);
    },
    openObjectives() {
      const n = this.next();
      if (!n) return;
      const map = { 2: 'case', 3: n.id === 'camp_x1' ? 'x1' : n.id === 'camp_x2' ? 'x2' : 'x3', 4: 'z1' };
      DV.Quests.setObj('camp_main', map[n.act], 'active');
    },
    // back to your headquarters, free to walk about: the next case is on offer at your mentor
    home() {
      const f = this.faction();
      if (f === 'dauntless') DV.District.enter('dauntless', { fadeOut: 1000 });
      else DV.Chapter.start('week_' + f, { step: 'end', keepClock: true, fadeOut: 1200, fadeIn: 1200, noTitle: true });
    },

    /* ---- the end ---- */
    // which endings the player can have now
    eligible(id) {
      const proof = this.proofCount();
      const hard = ['chalk', 'ledger', 'lot33', 'tally'].filter((p) => this.has(p)).length;
      switch (id) {
        case 'open_air': return proof >= 4 && hard >= 2 && !!DV.State.flag('camp_leak_named');
        case 'beyond_the_fence': return this.count() >= 2;
        case 'under_the_tracks': return true;
        case 'the_quiet': return !!DV.State.flag('camp_vance_offer');
        case 'the_quiet_passes': return true;
      }
      return false;
    },
    finish(id) {
      const st = this.st();
      const def = ENDINGS[id];
      if (!def) throw new Error('Unknown ending ' + id);
      st.ending = id;
      DV.State.setFlag('camp_ending_' + id);
      DV.State.note('The Chalk Year: ' + def.name + '. ' + def.line);
      DV.Quests.complete('camp_main', id);
      return def;
    },

    /* ---- for the Casebook ---- */
    summary() {
      const st = this.st();
      const lines = [];
      lines.push('Six people have been found inside a circle of chalk, in five sectors. The Order says it is one man, and has put drones over the city between nine and six.');
      if (this.hasClue('red_folder_names')) lines.push('The dead are on a list the Testing Center keeps: the red folder, "Protocol D".');
      if (this.has('lot33') || this.hasClue('lot33_note')) lines.push('The Directorate has a serum, Series 7, "the Quiet". It was raised past the safe dose on purpose.');
      if (this.has('manifest')) lines.push('Its lot numbers are in the peace tin: it is going into the food.');
      if (this.has('chalk')) lines.push('The chalk is drawn afterwards, by the Order\'s own people.');
      if (st.act >= 3) lines.push('A vote at the Hub will make all of it law.');
      return lines;
    },
  };
  DV.Campaign = C;

  /* ------------------------------ the main quest ------------------------------ */
  DV.QuestDB.add({
    id: 'camp_main', title: 'The Chalk Year', type: 'main', giver: null,
    summary: 'Six people have been found inside a circle of chalk. The Order says it is one murderer. The dead have something in common, and so do you.',
    startText: 'The first weeks are over. The city has a murderer, a curfew and a sky full of drones.',
    objectives: [
      { id: 'case', text: 'Work your faction\'s case (ask your mentor about the circles)' },
      { id: 'x1', text: 'The seventh circle', hidden: true },
      { id: 'x2', text: 'Meet the others under the tracks', hidden: true },
      { id: 'x3', text: 'The night of the scan', hidden: true },
      { id: 'z1', text: 'The Hearing at the Hub', hidden: true },
    ],
    rewards: { xp: 600 },
    completeText: 'The year ends. What the city knows about itself has changed.',
  });
})();
