/* ==========================================================================
   DIVERGENT — Build 3: Stage One, the story of the week
   The Dauntless compound as a district (DV.District), and everything that
   happens in it besides training: the morning calls, the rankings going
   up, teaching the weakest initiate to fight, Nina's needle, Mark's knife
   lesson, Josh Miller deciding someone should fall into the chasm, the
   cut, and the door to Stage Two.
   Scenes in the district are directed here: NPCs are borrowed from their
   schedules ("puppets"), the camera takes shots, and a small sequencer
   runs the beats (the same idea as DV.Chapter, without leaving the zone).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const T = U.parseTime;
  const I = () => DV.Initiation;
  const st = () => DV.Initiation.st();
  const flag = (n) => !!st().flags[n];
  const setFlag = (n, v) => { st().flags[n] = v === undefined ? true : v; };
  const npc = (id) => DV.NPCs.get(id);
  const near = (id, r) => { const n = npc(id); return !!(n && n.present && Math.hypot(n.x - DV.Player.x, n.z - DV.Player.z) < (r || 8)); };
  const roomId = () => { const z = DV.World.current, r = z && z.roomAt(DV.Player.x, DV.Player.z); return r ? r.id : null; };

  const SO = {
    seqs: [],
    timers: [],

    /* ============================== district hooks ============================== */
    start(fromLoad, opts) {
      DV.Audio.setMusic('none');
      I().drawBoard();
      this.seqs = []; this.timers = []; this.puppets = {};
      if (!DV.Quests.started('stage_one')) {
        DV.Quests.start('stage_one');
        DV.Quests.tracked = 'stage_one';
      }
      if (!flag('arrived')) {
        setFlag('arrived');
        DV.UI.notify('The Dauntless compound is yours to explore. Your bunk is in the dormitory, west of the Pit.', 'info');
        this.after(2.5, () => { const m = npc('d_mark'); if (m && m.present && m.dist < 25) { m.say('Initiates! Bunks are west, past the noticeboard. Training Room\'s north. Eight sharp.', 5); } });
      }
      // a load in the middle of a scene: put everyone back on their schedules
      for (const n of DV.NPCs.all) if (n.def.zone === 'd_compound') { n.scripted = false; const s = DV.State.npc(n.id); if (s.override && !s.override.keep) delete s.override; }
      if (opts && opts.then === 'debrief') this.after(2.4, () => this.debrief(opts.fearRes || {}));
    },
    update(dt) {
      this.tick(dt);
      this.runSeqs(dt);
      const I_ = I();
      const d = DV.Clock.day(), m = DV.Clock.minutes();
      if (DV.Game.state !== 'playing') return;
      // the first night: once you've found your bunk, the objective says so
      if (DV.Quests.obj('stage_one', 'bunk') === 'active' && Math.hypot(DV.Player.x - 1.75, DV.Player.z + 2.3) < 2.5 && !flag('found_bunk')) {
        setFlag('found_bunk');
        DV.UI.notify('Your bunk. Lower one, south wall, by the door. Somebody has scratched FIRST NIGHT IS THE WORST into the frame.', 'info');
      }
      // the cut: the class is waiting for you in the training room
      if (d === 6 && m >= T('08:00') && m < T('09:30') && !flag('cut_done') && roomId() === 'training' && !this.seqs.length) this.cutScene();
      if (d === 6 && m >= T('09:30') && !flag('cut_done')) this.cutScene(true);
      // the chasm at night
      if (this.ambushReady() && roomId() === 'the_pit') this.ambush();
      // the zip line: Bo's waiting
      if (DV.Quests.obj('zip_line', 'meet') === 'active' && m >= T('21:20') && m < T('22:40') && Math.hypot(DV.Player.x - 24.5, DV.Player.z + 12.5) < 3.2 && !this.seqs.length) this.zipLine();
      // Joey, waiting for courage outside the parlour
      if (DV.State.flag('joey_ink') && !DV.State.flag('joey_inked') && roomId() === 'tattoo' && !flag('joey_called')) {
        setFlag('joey_called');
        this.borrow('d_joey', { do: 'go', to: 'ink_wait', act: 'pace' });
        this.after(5, () => { const j = npc('d_joey'); if (j) j.say('Okay. Okay. I\'m here. I\'m fine. I\'m — is that a needle?', 3.5); });
      }
    },
    onMinute(m) {
      I().onMinute(m);
      const d = DV.Clock.day();
      // the rankings go up after the fights
      if ((d === 4 || d === 5) && m >= T('17:00') && !flag('posted_d' + d)) {
        setFlag('posted_d' + d);
        I().post('RANKINGS · DAY ' + d, false);
        DV.Audio.play('chime');
        setTimeout(() => DV.UI.subtitle('PA', 'Initiates: the rankings are up in the Training Room.', 5), 1000);
        const r = I().rankOf('player'), n = I().rankings().length;
        DV.UI.notify('Rankings posted. You\'re ' + I().ordinal(r) + ' of ' + n + (r > n - I().CUT ? ' — below the line.' : '.'), r > n - I().CUT ? 'quest_fail' : 'info');
      }
      // the underdog doesn't show up at the bags after ten
      if (m >= T('22:00') && this.underdogBooked) { this.underdogBooked = false; this.release(I().underdog()); }
      // someone's watching the railing for you
      if (d === 5 && m >= T('21:00') && !flag('warned_night') && DV.Quests.started('bad_blood') && I().here('d_josh')) {
        setFlag('warned_night');
        DV.UI.notify('Josh, Bryce and Marcus left the dining hall together. Nobody saw where they went.', 'info');
      }
    },
    onNewDay(day, info) {
      const I_ = I();
      if (day >= I_.FIRST && DV.Quests.obj('stage_one', 'bunk') === 'active') DV.Quests.setObj('stage_one', 'bunk', 'done', 'First night in the dormitory.');
      if (day >= I_.FIRST && day <= 5) DV.Quests.activate('stage_one', 'train');
      if (day === 6 && DV.Quests.obj('stage_one', 'train') !== 'done') { DV.Quests.setObj('stage_one', 'train', 'done', 'Three days of training, done.'); DV.Quests.activate('stage_one', 'final'); }
      // the morning call
      const lines = {
        3: 'UP! Up, up. Training Room, eight o\'clock. Eat something first — I\'ll know if you didn\'t.',
        4: 'Up! Knives this morning, fights this afternoon. The fights count. Eat.',
        5: 'Up. Knives again. Then the bags. Then the ring. Then the board. Move.',
        6: 'Up. Last day of Stage One. Training Room, eight. Rankings. [He doesn\'t say the rest.]',
      };
      if (lines[day] && info && info.slept) this.after(1.6, () => { const mk = npc('d_mark'); if (mk && mk.present) { mk.say(lines[day], 5); DV.UI.subtitle('Mark Rivera', lines[day], 5); } });
      if (day === 6) this.after(4, () => DV.UI.notify('Today the bottom two are cut. Training Room, 08:00.', 'quest'));
    },
    onTrigger(id, inside) {
      if (!inside) return;
      if (id === 't_tattoo' && DV.Quests.isActive('ink') && DV.Quests.obj('ink', 'visit') === 'active') DV.Quests.setObj('ink', 'visit', 'done', 'You found Nina\'s parlour.');
      if (id === 't_tattoo' && !DV.Quests.started('ink')) DV.Quests.start('ink'), DV.Quests.setObj('ink', 'visit', 'done', 'You wandered into Nina\'s parlour.');
      if (id === 't_training' && !flag('saw_training')) { setFlag('saw_training'); DV.UI.notify('The Training Room. The range, the knife wall, the bags, the ring — and the board, still blank.', 'info'); }
    },
    onDialogueEnd(e) {
      const I_ = I();
      if (I_.deferStart) {
        const b = I_.deferStart;
        I_.deferStart = null;
        if (I_.canStart() === b) setTimeout(() => I_.begin(b, null), 50);
      }
      if (this.onDlg) { const f = this.onDlg; this.onDlg = null; f(e); }
    },
    playerCanPass(lock) {
      if (lock === 'simroom') return DV.Quests.obj('stage_one', 'stage2') === 'active' || DV.Quests.obj('stage_one', 'stage2') === 'done';
      if (lock === 'members') return false;
      return undefined;
    },
    beforeSleep() {
      // (nothing stops you sleeping — but on the night of the ambush, getting to bed means crossing the Pit)
      return false;
    },

    /* ============================== the scene kit ============================== */
    after(t, fn) { this.timers.push({ t, fn }); },
    tick(dt) {
      if (!this.timers.length) return;
      const due = [];
      this.timers = this.timers.filter((x) => ((x.t -= dt) > 0 ? true : (due.push(x), false)));
      for (const x of due) x.fn();
    },
    seq(beats, name) { const s = { beats: beats.slice(), i: 0, wait: 0, until: null, name }; this.seqs.push(s); return s; },
    runSeqs(dt) {
      for (const s of this.seqs.slice()) {
        let g = 0;
        while (g++ < 40) {
          if (s.wait > 0) { s.wait -= dt; dt = 0; if (s.wait > 0) break; }
          if (s.until) { if (!s.until()) break; s.until = null; }
          if (s.i >= s.beats.length) { this.seqs.splice(this.seqs.indexOf(s), 1); break; }
          const r = s.beats[s.i++](this);
          if (typeof r === 'number') s.wait = r;
          else if (typeof r === 'function') s.until = r;
          if (this.seqs.indexOf(s) < 0) break;
        }
      }
    },
    // take someone off their schedule and stand them exactly here, doing this
    puppet(id, x, z, rot, action) {
      const n = npc(id);
      if (!n) return null;
      n.ensureModel(DV.Game.scene);
      DV.NPCAI.releaseSpot(n);
      n.present = true; n.scripted = true; n.path = null; n.mode = 'acting';
      n.x = x; n.z = z; n.rot = rot; n.action = action || 'idle';
      n.model.root.visible = true;
      DV.NPCAI.syncModel(n);
      return n;
    },
    walkPuppet(id, x, z, spd) {
      const n = npc(id);
      if (!n) return;
      n.walkTarget = [x, z]; n.walkSpd = spd || 1.4;
    },
    // send someone somewhere through their schedule (they path there themselves)
    borrow(id, entry) {
      const s = DV.State.npc(id);
      s.override = entry;
      const n = npc(id);
      if (n) { n.scripted = false; n.taskKey = null; DV.NPCAI.refresh(n, false); }
    },
    release(id) {
      const n = npc(id);
      const s = DV.State.npc(id);
      delete s.override;
      if (n) { n.scripted = false; n.walkTarget = null; n.taskKey = null; DV.NPCAI.refresh(n, false); }
    },
    releaseAll() { for (const n of DV.NPCs.all) if (n.def.zone === 'd_compound' && (n.scripted || DV.State.npc(n.id).override)) this.release(n.id); },
    say(id, text, secs) { const n = npc(id); if (!n) return; n.say(text, secs || 3.4); DV.UI.subtitle(n.def.name, text, secs || 3.4); },
    cut(on) {
      const G = DV.Game;
      DV.UI.letterbox(!!on);
      if (on) { G.state = 'cutscene'; DV.Input.clearMovement(); }
      else { if (G.state === 'cutscene') G.state = 'playing'; G.rig.follow(); DV.Input.clearMovement(); DV.Input.takeMouse(); }
    },
    shot(pos, look, instant) { DV.Game.rig.setShot(new THREE.Vector3(pos[0], pos[1], pos[2]), new THREE.Vector3(look[0], look[1], look[2]), instant); },
    fadeTo(fn, ms) { const G = DV.Game; const prev = G.state; G.state = 'transition'; DV.UI.fade(1, ms || 600).then(() => { G.state = prev === 'transition' ? 'playing' : prev; fn(); DV.UI.fade(0, 700); }); },

    /* ============================== hands up: teaching the underdog ============================== */
    underdogToBags() {
      const m = DV.Clock.minutes();
      if (m < T('20:00') || m >= T('22:00')) return;
      this.underdogBooked = true;
      this.borrow(I().underdog(), { do: 'go', to: 'bag2', act: 'bagwork' });
    },
    // you've finished a session at a bag: if he's at the bags with you, that counts
    onPractice(kind, res) {
      const id = I().underdog();
      const m = DV.Clock.minutes();
      if (kind !== 'bags' || DV.Quests.obj('hands_up', 'train') !== 'active' || m < T('19:50') || m >= T('22:10') || !near(id, 7)) return;
      const s = st();
      if (s.flags['trained_d' + DV.Clock.day()]) { DV.UI.notify(I().first(id) + ' is spent for tonight. Tomorrow.', 'info'); return; }
      s.flags['trained_d' + DV.Clock.day()] = true;
      s.training[id] = (s.training[id] || 0) + 1;
      const n = s.training[id];
      DV.Reputation.addRel(id, 6);
      const lines = id === 'd_daniel'
        ? ['[Daniel hits the bag and it actually moves. He looks at his fist like it belongs to someone else.] I didn\'t say sorry. Did you notice I didn\'t say sorry?', '[By the end he\'s breathing hard, hands up, chin down, the way you showed him.] Again tomorrow? — No. Tomorrow\'s the ring. [He nods to himself.] Hands up.']
        : ['[Joey hits the bag and laughs so hard he has to stop.] It went! It went all the way over there! Sorry, bag.', '[Joey\'s guard stays up for a whole minute.] Look at that. Look at me. My dad\'s going to cry. Good crying.'];
      DV.UI.subtitle(DV.NPCData.get(id).name, lines[Math.min(n, 2) - 1], 6);
      DV.Stats.addXP(30, 'Taught ' + I().first(id));
      DV.Stats.practice('persuasion', 1);
      if (n >= 2) { DV.Quests.setObj('hands_up', 'train', 'done', 'Two evenings at the bags. ' + I().first(id) + ' keeps his hands up now.'); DV.Quests.activate('hands_up', 'fight'); }
      else DV.Quests.log('hands_up', 'One evening at the bags with ' + I().first(id) + '.');
    },

    /* ============================== ink ============================== */
    tattoo(design) {
      const P = DV.Player;
      const z = DV.World.current;
      const chair = z.spot('tat_client');
      this.cut(true);
      this.fadeTo(() => {
        if (chair) { P.place(chair.x, chair.z, chair.rot); P.cineAction = 'recline'; }
        this.shot([64.2, 2.1, -4.6], [66.2, 0.8, -6], true);
        this.seq([
          () => { DV.UI.subtitle('', '[The needle sounds like a wasp in a jar. Then it feels like one.]', 4); for (let k = 0; k < 6; k++) setTimeout(() => DV.Audio.play('buzzer', { volume: 0.25 }), k * 600); return 4.2; },
          () => { this.say('d_nina', U.pick(['Breathe. You\'re doing better than Joey.', 'Nearly. Don\'t look yet.', 'Hold still — there. Beautiful.']), 3.4); return 3.6; },
          () => {
            DV.Clock.skip(45);
            const pl = DV.State.data.player;
            pl.tattoos = pl.tattoos || [];
            if (pl.tattoos.indexOf(design.slot) < 0) pl.tattoos.push(design.slot);
            pl.tattooDesigns = (pl.tattooDesigns || []).concat([design.id]);
            DV.Game.refreshPlayerAppearance();
            P.cineAction = null;
            P.place(64.6, -5.4, -Math.PI / 2);
            DV.Quests.setObj('ink', 'design', 'done', 'Nina inked ' + design.name.toLowerCase() + ' on your ' + design.where + '.');
            DV.Quests.complete('ink');
            if (design.id === 'five') DV.State.setFlag('tattoo_five');
            this.cut(false);
            DV.UI.notify('New tattoo: ' + design.name + ' (' + design.where + ').', 'item');
          },
        ], 'ink');
      }, 500);
    },
    joeyInk(calm) {
      DV.State.setFlag('joey_inked');
      this.release('d_joey');
      if (calm) {
        DV.Reputation.addRel('d_joey', 10);
        DV.UI.subtitle('', '[Joey stares at you the entire time, white-knuckled, and doesn\'t go down once. When it\'s done he cries a little. Good crying.]', 6);
        this.after(6, () => this.say('d_joey', 'I did it. I DID it. Look! It\'s a — what is it?', 3.5));
        DV.Stats.practice('empathy', 2);
      } else {
        DV.UI.subtitle('', '[Nina gets as far as the outline before Joey goes over like a felled tree. He takes a stool and a tray of ink with him.]', 6);
        DV.Audio.play('land', { volume: 1 });
        this.after(6, () => this.say('d_nina', 'Every. Single. Time. Help me get him onto the sofa.', 3.5));
        DV.Reputation.addRel('d_joey', 3);
      }
      DV.Stats.addXP(20, 'Joey\'s tattoo');
    },

    /* ============================== bad blood ============================== */
    startBadBlood(passive) {
      if (DV.Quests.started('bad_blood') || !I().here('d_josh')) return;
      DV.Quests.start('bad_blood');
      DV.Quests.log('bad_blood', passive ? 'You told ' + I().first(I().underdog()) + ' to keep his head down. Josh noticed nobody stopped him.' : 'You said you\'d deal with Josh.');
    },
    reportJosh(mode) {
      const s = st();
      if (mode === 'all') {
        s.expelled.d_josh = true;
        I().award('d_bryce', -120, 'Disciplined'); I().award('d_marcus', -120, 'Disciplined');
        DV.Quests.setObj('bad_blood', 'after', 'done', 'You named all three. Josh was gone by morning; Bryce and Marcus lost a day\'s ranking.');
      } else if (mode === 'josh') {
        s.expelled.d_josh = true;
        DV.Quests.setObj('bad_blood', 'after', 'done', 'You named Josh. He was gone by morning, and nobody said where.');
      } else {
        DV.Reputation.add('dauntless', 4);
        DV.State.setFlag('josh_spared');
        DV.Quests.setObj('bad_blood', 'after', 'done', 'You said nothing. Josh knows it. Everyone knows it.');
      }
      DV.Quests.complete('bad_blood', mode);
      if (s.expelled.d_josh) { const j = npc('d_josh'); if (j) DV.NPCAI.despawn(j); }
    },
    ambushReady() {
      const d = DV.Clock.day(), m = DV.Clock.minutes();
      if (d !== 5 || m < T('22:15') || flag('ambushed') || DV.Activity.active() || this.seqs.length) return false;
      if (!I().here('d_josh') || !I().here('d_bryce') || !I().here('d_marcus')) return false;
      return DV.Quests.started('bad_blood') || DV.State.flag('josh_targets_you') || I().rankOf('player') < I().rankOf('d_josh');
    },
    ambush() {
      setFlag('ambushed');
      if (!DV.Quests.started('bad_blood')) DV.Quests.start('bad_blood');
      DV.Quests.setObj('bad_blood', 'notice', 'done', 'Josh came for you.');
      DV.Quests.activate('bad_blood', 'chasm');
      const P = DV.Player;
      this.cut(true);
      this.fadeTo(() => {
        P.place(40, 19.25, 0);
        P.cineAction = 'bowl';
        this.puppet('d_josh', 40.1, 17.7, 0, 'arms_crossed');
        this.puppet('d_bryce', 39.35, 18.75, 0.5, 'point');
        this.puppet('d_marcus', 40.7, 18.75, -0.5, 'point');
        this.shot([43.4, 2.2, 16.2], [40, 1.1, 19.3], true);
        DV.Audio.play('heartbeat', { volume: 1 });
        this.seq([
          () => { DV.UI.subtitle('', '[A hand over your mouth. Two more on your arms. They walk you to the railing before your feet find the floor.]', 4.6); return 4.8; },
          () => { this.say('d_josh', 'Shh. Shh. Look down. Go on — look how far it is.', 3.4); this.shot([40.4, 2.5, 18.7], [40, -9, 24], false); DV.Audio.play('heartbeat'); return 3.8; },
          () => { this.say('d_josh', 'Bottom two goes factionless. Or — accidents happen. Every year somebody slips. Right, Marcus?', 4); return 4.2; },
          () => { this.say('d_marcus', 'Statistically.', 2); return 2.2; },
          () => { this.struggle(); },
        ], 'ambush');
      }, 450);
    },
    struggle() {
      DV.UI.letterbox(false);
      const need = Math.round(U.clamp(27 - DV.Stats.attr('strength') * 1.5 - DV.Stats.attr('agility') * 0.7 - DV.Stats.attr('resolve') * 0.4, 9, 24));
      DV.Activity.start(new Struggle(need, 6.5), (res) => {
        if (res.ok) this.brokeFree();
        else this.overTheEdge();
      });
    },
    brokeFree() {
      DV.Stats.addXP(30, 'Broke free');
      DV.Stats.practice('athletics', 2);
      const P = DV.Player;
      P.cineAction = null;
      this.cut(true);
      // shove one off, the other lets go; Josh is all that's left
      this.puppet('d_bryce', 38.2, 18.2, 0.8, 'crouch');
      this.puppet('d_marcus', 41.9, 17.6, -0.9, 'idle');
      this.shot([44, 1.9, 15.5], [40, 1.1, 18.2], true);
      this.seq([
        () => { DV.Audio.play('punch_heavy'); DV.Game.rig.shake = 0.3; DV.UI.subtitle('', '[You drive an elbow back into Bryce and he folds. Marcus lets go — calculating, already stepping away.]', 4); return 4; },
        () => { this.say('d_josh', 'Fine. FINE. Let\'s do this properly, then.', 2.8); return 2.6; },
        () => {
          this.cut(false);
          const josh = npc('d_josh');
          josh.scripted = false;
          DV.Combat.fight({
            opponent: { name: 'Josh Miller', npc: josh, stats: Object.assign({}, I().STAT.d_josh, { melee: 46 }), ai: Object.assign({}, DV.Combat.styles.brawler, { aggression: 0.85 }) },
            ring: { x0: 33, z0: 12.5, x1: 47, z1: 19.4 },
            start: { player: [40, 18.6], opponent: [40, 16.4] },
            title: 'NO RULES', timeLimit: 75, allowYield: false,
          }, (res) => this.rescue(res.winner === 'player' ? 'won' : 'lost'));
        },
      ], 'brawl');
    },
    overTheEdge() {
      const P = DV.Player;
      this.cut(true);
      P.place(40, 20.45, Math.PI);
      P.y = -0.95;
      P.syncModel();
      P.cineAction = 'hang';
      this.shot([41.6, -1.2, 23.4], [40, 0.2, 20.2], true);
      DV.Game.rig.shake = 0.45;
      DV.Audio.play('heartbeat', { volume: 1 });
      this.seq([
        () => { DV.UI.subtitle('', '[Over. Your fingers find the bottom rail. Below you the river is a sound, not a place.]', 4.2); return 4.2; },
        () => { this.say('d_josh', 'Let go. Come on. It\'s easier.', 3); DV.Audio.play('heartbeat'); return 3.2; },
        () => { this.rescue('hung'); },
      ], 'edge');
    },
    rescue(how) {
      const P = DV.Player;
      const s = DV.State.data.world.flags;
      // who comes: a friend you made, the instructor you warned, or whoever's walking past
      const who = s.ally_nate && I().here('d_nate') ? 'd_nate' : s.ally_kat && I().here('d_kat') ? 'd_kat' : s.mark_knows_josh ? 'd_mark' : 'd_shay';
      this.cut(true);
      const r = this.puppet(who, 30, 10, 0.7, 'idle');
      if (who === 'd_nate' && s.ally_kat && I().here('d_kat')) this.puppet('d_kat', 29, 9, 0.7, 'idle');
      this.walkPuppet(who, 39.2, 17.6, 4.6);
      if (who === 'd_nate' && s.ally_kat) this.walkPuppet('d_kat', 41.2, 17.4, 4.4);
      const shout = { d_nate: 'HEY! GET OFF THEM!', d_kat: 'Josh! Step away from the railing. Now.', d_mark: 'MILLER!', d_shay: 'Patrol! Off the railing, all of you!' }[who];
      if (how !== 'hung') this.shot([44, 2.2, 14.5], [39, 1, 17.5], true);
      this.seq([
        () => { this.say(who, shout, 2.4); DV.Audio.play('roar', { secs: 0.8, volume: 0.4 }); return 2.2; },
        () => {
          // they scatter
          this.walkPuppet('d_josh', 16, 0, 4.6); this.walkPuppet('d_bryce', 16, -2, 4.4); this.walkPuppet('d_marcus', 17, 2, 4.2);
          if (how === 'hung') {
            P.place(40, 19.2, Math.PI); P.y = 0; P.cineAction = 'crouch'; P.syncModel();
            this.shot([43.5, 1.6, 16.5], [40, 0.7, 19.0], true);
            DV.UI.subtitle('', '[Hands under your arms. You\'re hauled back over the rail and dumped on the rock floor, and the floor has never felt so good.]', 4.5);
          }
          return 3.4;
        },
        () => { this.say(who, who === 'd_mark' ? 'Infirmary. Now. Don\'t argue.' : who === 'd_shay' ? 'You\'re bleeding. Infirmary, initiate. Go.' : 'Are you — you\'re okay. You\'re okay. Infirmary. Come on.', 3); return 3; },
        () => this.infirmary(who),
      ], 'rescue');
      if (how === 'won') DV.Stats.addXP(40, 'Beat Josh at the railing');
      if (how === 'won') DV.Reputation.add('dauntless', 3);
    },
    infirmary(who) {
      const P = DV.Player;
      this.fadeTo(() => {
        for (const id of ['d_josh', 'd_bryce', 'd_marcus', 'd_nate', 'd_kat', 'd_shay']) { const n = npc(id); if (n && n.scripted) this.release(id); }
        DV.Clock.skipTo(T('23:40'));
        DV.NPCAI.syncAll();
        const bed = DV.World.current.spot('inf_bed1');
        P.place(65.5, 7.4, Math.PI); P.y = 0; P.cineAction = null;
        if (bed) DV.Game.sitOn(bed, true);
        this.puppet('d_ama', 66.4, 6.3, 2.6, 'arms_crossed');
        this.puppet('d_mark', 64.4, 6.6, Math.PI * 0.75, 'arms_crossed');
        if (who === 'd_nate' || who === 'd_kat') this.puppet(who, 63.2, 5.8, 0.6, 'arms_crossed');
        DV.Quests.setObj('bad_blood', 'chasm', 'done', 'You survived the night at the chasm.');
        DV.Quests.activate('bad_blood', 'after');
        this.cut(false);
        DV.Game.rig.follow(true);
        this.seq([
          () => { this.say('d_ama', 'Cracked rib, maybe. Bruised everything, definitely. You\'ll live. Somebody tell me who did this.', 4); return 4.2; },
          () => { const mk = npc('d_mark'); mk.scripted = false; mk.mode = 'acting'; DV.Game.talkTo(mk, true, { node: 'after_named' }); },
        ], 'inf');
        this.onDlg = () => { this.after(1, () => { this.releaseAll(); P.standUp && P.standUp(); DV.Save.write('auto'); DV.UI.notify('Get some sleep. Tomorrow is the last day of Stage One.', 'info'); }); };
      }, 900);
    },

    /* ============================== Mark's knife lesson (Day 5) ============================== */
    knifeLesson(b) {
      const u = I().underdog();
      setFlag('lesson_started');
      this.cut(true);
      this.fadeTo(() => {
        const P = DV.Player;
        P.place(37.2, -36.6, Math.PI / 2);
        this.puppet('d_mark', 37.6, -38.4, Math.PI / 2, 'arms_crossed');
        this.puppet(u, 38.6, -35.6, Math.PI, 'pace');
        if (I().here('d_josh')) this.puppet('d_josh', 36.0, -35.4, 2.2, 'arms_crossed');
        this.shot([35.2, 2.0, -34.8], [41, 1.3, -38], true);
        this.seq([
          () => { this.say('d_mark', 'Today we learn what it costs to trust the person holding the knife. Somebody stands in front of the board. I throw.', 4.4); return 4.6; },
          () => { this.say('d_mark', I().first(u) + '. You flinched yesterday. Board.', 2.6); return 2.8; },
          () => { this.say(u, u === 'd_daniel' ? 'I — no. No. I\'m sorry. I can\'t.' : 'Ha. Yeah. No. No, I don\'t think so, Mark.', 3); return 3.2; },
          () => { this.say('d_mark', 'Then you\'re out of the class. Board, or door. Choose.', 3); return 3.2; },
          () => { this.onDlg = (e) => { if (e.tree === 'knife_lesson') this.lessonGo(); }; DV.Dialogue.startScene('knife_lesson'); DV.Game.onSceneStart(); },
        ], 'lesson');
      }, 600);
    },
    lessonGo() {
      const u = I().underdog();
      const me = DV.State.flag('took_the_board');
      const P = DV.Player;
      const z = DV.World.current;
      const board = (z.knifeBoards || [])[0];
      this.cut(true);
      if (me) { P.place(43.3, -38.4, -Math.PI / 2); P.cineAction = 'idle'; this.puppet(u, 38.6, -35.6, Math.PI, 'arms_crossed'); }
      else this.puppet(u, 43.3, -38.4, -Math.PI / 2, 'cower');
      this.shot([40.5, 1.6, -35.6], [43.2, 1.3, -38.4], true);
      const mark = npc('d_mark');
      const knives = [];
      const throwOne = (dx, dy) => () => {
        if (mark) mark.action = 'throwing';
        DV.Audio.play('knife_throw', { volume: 0.7 });
        const k = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.17), new THREE.MeshBasicMaterial({ color: 0xc8ccd0 })); blade.position.z = 0.085; k.add(blade);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.11), new THREE.MeshBasicMaterial({ color: 0x1a1a1a })); handle.position.z = -0.055; k.add(handle);
        k.position.set(43.82, (board ? board.y : 1.5) + dy, -38.4 + dx);
        k.rotation.y = Math.PI / 2;
        DV.Game.scene.add(k); knives.push(k);
        setTimeout(() => DV.Audio.play('knife_stick', { x: 43.8, z: -38.4 }), 220);
        return 1.6;
      };
      this.seq([
        () => { this.say('d_mark', me ? 'Brave. Or stupid. Hold still and we\'ll find out which.' : 'Hands at your sides. Eyes open.', 3); return 3.2; },
        throwOne(0.35, 0.35), throwOne(-0.35, 0.1), throwOne(0.38, -0.3),
        () => {
          if (me) { DV.UI.subtitle('', '[The last one is close enough that you feel the air move, and then something warm runs down your ear.]', 4.2); DV.Game.rig.shake = 0.25; DV.State.setFlag('ear_scar'); }
          else { this.say(u, u === 'd_daniel' ? '...[a sound that isn\'t quite a word]' : 'Okay. Okay okay okay.', 2.5); if (I().here('d_josh')) this.after(1.2, () => this.say('d_josh', 'Ha! Look at his face!', 2.2)); }
          return throwOne(-0.05, 0.62)();
        },
        () => { this.say('d_mark', me ? 'Done. Nobody else today. [Under his breath, walking past:] Don\'t do that again.' : 'Done. Pick up your knives, the rest of you. Rounds of six.', 3.4); return 3.6; },
        () => {
          for (const k of knives) { DV.Game.scene.remove(k); }
          P.cineAction = null;
          setFlag('lessonDone');
          this.releaseAll();
          if (me) { I().award('player', 40, 'Took the board for ' + I().first(u)); DV.Reputation.add('dauntless', 4); DV.Reputation.addRel(u, 10); DV.Reputation.addRel('d_mark', 4, true); }
          else DV.Reputation.addRel(u, -2, true);
          this.cut(false);
          // and now the actual knives
          const b2 = I().blocks().find((x) => x.id === 'knives2');
          if (b2) I().begin(b2, null);
        },
      ], 'lesson2');
    },

    /* ============================== the zip line ============================== */
    zipLine() {
      DV.Quests.setObj('zip_line', 'meet', 'done', 'You met Bo at the Training Passage.');
      DV.Quests.activate('zip_line', 'ride');
      this.say('d_bo', 'You came! Good. Train leaves in four minutes, and so do we. Run!', 3);
      this.after(2.6, () => DV.Chapter.start('zip_line', {}));
    },

    /* ============================== the cut (Day 6) ============================== */
    cutScene(absent) {
      if (flag('cut_done')) return;
      setFlag('cut_done');
      const I_ = I();
      const rows = I_.post('FINAL RANKINGS', true);
      const cut = I_.makeCut();
      const youCut = cut.indexOf('player') >= 0;
      const u = I_.underdog();
      DV.Quests.setObj('stage_one', 'final', 'done', 'The final rankings went up.');
      if (absent) {
        // you weren't there: you hear about it
        DV.UI.notify('The final rankings went up while you were somewhere else. Cut: ' + cut.map((id) => I_.nameOf(id)).join(' and ') + '.', 'quest');
        this.afterCut(cut, youCut);
        return;
      }
      this.cut(true);
      const P = DV.Player;
      P.place(28.5, -25.6, Math.PI);
      this.puppet('d_dana', 27.6, -23.0, Math.PI, 'arms_crossed');
      this.puppet('d_mark', 29.4, -23.0, Math.PI, 'arms_crossed');
      this.shot([26, 2.4, -27.8], [28.4, 1.7, -22.6], true);
      DV.Audio.setMusic('none');
      const beats = [
        () => { this.say('d_dana', 'Stage One is over. The rankings are final. Rivera?', 3); return 3.2; },
        () => { this.say('d_mark', 'Final rankings, Stage One.', 2.2); this.shot([28.4, 1.95, -24.8], [28.4, 1.95, -22.1], false); return 3.6; },
        () => { this.shot([26.5, 2.0, -24.5], [28.4, 1.3, -27], false); this.say('d_dana', 'Two of you will leave the compound today. You won\'t be Dauntless. You won\'t be anything else either.', 4.2); return 4.4; },
      ];
      cut.forEach((id, k) => beats.push(() => {
        DV.Audio.play('murmur', { secs: 1.2, volume: 0.5 });
        this.say('d_dana', I_.nameOf(id) + '.', 2.2);
        const n = id !== 'player' ? npc(id) : null;
        if (n && n.present) { n.action = 'cower'; }
        return 2.6;
      }));
      if (youCut) {
        beats.push(() => { DV.UI.subtitle('', '[It takes you a moment to understand that the name was yours.]', 4); this.shot([29.6, 1.75, -26.6], [28.5, 1.6, -25.6], false); return 4.2; });
        beats.push(() => this.factionless());
      } else {
        beats.push(() => { this.say('d_mark', 'The rest of you: Simulation Room, ten o\'clock. Stage Two. [He doesn\'t look at the two who are leaving.]', 4.4); return 4.6; });
        beats.push(() => { this.cut(false); this.afterCut(cut, false); });
      }
      this.seq(beats, 'cut');
    },
    afterCut(cut, youCut) {
      const I_ = I();
      const u = I_.underdog();
      const s = st();
      // the ones who are cut walk out through the members' quarters
      for (const id of cut) if (id !== 'player') { this.borrow(id, { do: 'leave', keep: true }); }
      this.after(40, () => { for (const id of cut) if (id !== 'player') { delete DV.State.npc(id).override; const n = npc(id); if (n) DV.NPCAI.despawn(n); } });
      // the underdog
      if (DV.Quests.isActive('hands_up')) {
        if (cut.indexOf(u) >= 0) DV.Quests.fail('hands_up', I_.first(u) + ' was cut. He shook your hand on the way out, and kept his chin up the whole way to the door.');
        else { DV.Quests.setObj('hands_up', 'fight', 'done', I_.first(u) + ' made it through Stage One.'); DV.Quests.complete('hands_up'); }
      }
      if (cut.indexOf(u) >= 0 && I_.here) this.after(4, () => { const n = npc(u); if (n && n.present) n.say(u === 'd_daniel' ? 'It\'s all right. Really. I was always going to be — it\'s all right.' : 'Hey. Hey, don\'t. I\'ll be fine. I\'m big, remember?', 5); });
      if (youCut) return;
      DV.Reputation.add('dauntless', 6);
      DV.Quests.activate('stage_one', 'stage2');
      DV.Save.write('auto');
    },
    factionless() {
      const G = DV.Game;
      this.cut(true);
      G.state = 'transition';
      DV.UI.fade(1, 1800).then(() => {
        this.releaseAll();
        DV.State.data.player.faction = 'factionless';
        DV.State.setFlag('cut_stage_one');
        DV.Reputation.add('dauntless', -20, true);
        DV.Reputation.add('factionless', 10, true);
        DV.Quests.fail('stage_one', 'You were cut at the end of Stage One. Factionless.');
        DV.UI.letterbox(false);
        G.state = 'banner';
        if (!DV.Cursor.enabled()) DV.Input.exitLock();
        DV.UI.banner('FACTIONLESS', 'THE CUT IS FINAL.', 'You walk out through the members\' quarters in the clothes you\'re wearing. Click or press any key · Build 3 ending (load an earlier save to try again)', () => {
          DV.UI.modalOpen = null;
          G.state = 'playing';
          DV.UI.fade(0, 1200);
          // out into the city: the grey streets, where the factionless wait for Abnegation's bread
          DV.Chapter.start('factionless_epilogue', { instant: true });
        });
      });
    },

    /* ============================== Stage Two: the chair ============================== */
    sitFearChair() {
      if (DV.Quests.obj('stage_one', 'stage2') !== 'active') return;
      this.cut(true);
      const chair = DV.World.current.spot('fear_chair');
      if (chair) DV.Game.sitOn(chair, true);
      this.shot([32.4, 2.0, -17.2], [30.5, 1.0, -19.3], true);
      const tech = npc('d_greg') && npc('d_greg').present ? 'd_greg' : 'd_mark';
      this.seq([
        () => { this.say(tech, tech === 'd_greg' ? 'Serum. Your neck, please. You\'ll feel a pinch, and then you\'ll feel a great deal more than a pinch.' : 'Serum. Neck. It\'ll be over before you know it. That\'s a lie. Lie back.', 4.6); return 4.8; },
        () => { DV.Audio.play('whoosh'); DV.Audio.setMusic('sim'); DV.UI.fade(1, 2200, true).then(() => { this.cut(false); DV.Chapter.start('fear_sim', { instant: true, noFadeIn: false }); }); },
      ], 'chair');
    },
    // back from the simulation
    afterFear(res) {
      const s = st();
      s.fear = res;
      DV.District.enter('dauntless', { spawn: [30.5, -17.6, Math.PI], time: U.formatTime(T('10:00') + Math.round(10 + (res.secs || 300) / 60 * 5)), title: 'STAGE TWO\nYOUR FIRST SIMULATION', then: 'debrief', fearRes: res });
    },
    debrief(res) {
      const mark = npc('d_mark');
      const aware = res.aware;
      const warned = DV.State.flag('mark_warned') || DV.State.flag('nina_warned');
      if (aware) { DV.State.setFlag('sim_aware'); if (!warned) DV.State.setFlag('sim_flagged'); }
      const line = aware
        ? (warned ? '[Mark leans over the monitor, between you and the technician, and deletes something with two keystrokes.] Equipment fault. Again, Lindqvist? Get it looked at.' : '[The technician is staring at his screen.] Four minutes from full panic to resting heart rate. That\'s… atypical. I\'ll have to note that. [Mark goes very still.]')
        : res.secs < 240 ? 'Under four minutes. That\'s good. That\'s very good. [Mark doesn\'t smile, but nearly.]' : 'You got there. That\'s all it asks. Next time, faster.';
      DV.UI.subtitle(aware ? '' : 'Mark Rivera', line, 7);
      if (mark && mark.present) mark.lookYaw = 0;
      DV.Quests.setObj('stage_one', 'stage2', 'done', 'Your first fear simulation: ' + (res.fear || 'something') + '.');
      DV.Quests.complete('stage_one', aware ? 'aware' : 'normal');
      DV.Stats.addXP(80, 'Stage Two, first simulation');
      this.after(7.5, () => this.buildComplete());
    },
    buildComplete() {
      const G = DV.Game;
      G.state = 'banner';
      if (!DV.Cursor.enabled()) DV.Input.exitLock();
      const r = I().rankOf('player'), n = I().st().posted ? I().st().posted.rows.length : I().rankings().length;
      DV.UI.banner('STAGE ONE COMPLETE', 'RANKED ' + I().ordinal(r).toUpperCase() + ' OF ' + n + ' · FACE YOUR FEARS.', 'Click or press any key to keep exploring the compound · Build 3 complete', () => {
        DV.UI.modalOpen = null;
        G.state = 'playing';
        DV.Input.requestLock();
        DV.Save.write('auto');
        DV.UI.notify('Autosaved. Build 3 is complete — the compound is yours. Stage Two continues in Build 4.', 'info');
      });
    },
  };

  /* ------------------------------ the struggle at the railing ------------------------------ */
  class Struggle {
    constructor(need, secs) { this.id = 'struggle'; this.need = need; this.secs = secs; }
    begin(A) {
      this.A = A; this.t = 0; this.n = 0; this.last = null; this.prog = 0;
      const h = U.el('div', 'tr-hud', '<div class="struggle"><div class="lbl">BREAK FREE</div><div class="fh-bar"><i></i></div><div class="keys">alternate <b>A</b> and <b>D</b> — or hammer <b>Space</b></div></div>', A.hud);
      this.h = h;
      A.announce('STRUGGLE', 1.2, 'bad');
      // from out over the drop, looking back at you bent over the railing
      DV.Game.rig.setShot(new THREE.Vector3(41.2, 0.4, 23.2), new THREE.Vector3(40, 1.2, 19.2), true);
    }
    update(dt, input, A) {
      this.t += dt;
      input.takeMouse();
      let hit = false;
      if (input.consume('KeyA') && this.last !== 'A') { this.last = 'A'; hit = true; }
      if (input.consume('KeyD') && this.last !== 'D') { this.last = 'D'; hit = true; }
      if (input.consume('Space')) hit = true;
      if (hit) { this.n++; DV.Audio.play('scuff', { volume: 0.7 }); DV.Game.rig.shake = 0.12; }
      this.prog = U.clamp(this.n / this.need - this.t * 0.03, 0, 1);
      this.h.querySelector('i').style.width = Math.round(this.prog * 100) + '%';
      const P = DV.Player;
      P.model.animate(dt, { speed: 0, action: 'bowl' });
      if (this.prog >= 1) { A.finish({ ok: true }); return; }
      if (this.t >= this.secs) A.finish({ ok: false });
    }
    end() {}
  }
  SO.Struggle = Struggle;

  /* ------------------------------ the knife lesson's one choice ------------------------------ */
  DV.DialogueDB.add('knife_lesson', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Mark Rivera', faction: 'dauntless',
        text: () => '[' + I().first(I().underdog()) + ' isn\'t moving. Everyone is looking at him, and then — because you\'ve moved, or because you haven\'t — at you.]',
        choices: [
          { text: '"I\'ll do it. Throw at me."', end: true, effect: () => { DV.State.setFlag('took_the_board'); DV.Stats.practice('composure', 2); } },
          { text: '(Stay where you are.)', end: true },
        ],
      },
    },
  });

  /* ------------------------------ the district ------------------------------ */
  DV.District.define('dauntless', {
    zone: 'd_compound', name: 'Dauntless Compound',
    spawn: { x: 3, z: -4, rot: Math.PI },
    bed: { x: 1.75, z: -2.3, rot: 0 },
    wake: '06:30',
    script: SO,
  });

  // the chair in the Simulation Room
  DV.Actions.fear_chair = () => { SO.sitFearChair(); return null; };

  DV.StageOne = SO;
})();
