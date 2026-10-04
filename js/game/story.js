/* ==========================================================================
   DIVERGENT — Build 1 story rules for the Testing Center
   Clock-driven events (PA calls, deadlines), zone triggers, world actions
   (vending, coffee theft, lockpicking, drawers, Lost & Found) and the data
   behind the testing status board. Kept separate from the engine so new
   chapters can add their own rule files.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const S = () => DV.State;
  const flag = (n) => DV.State.flag(n);
  const setFlag = (n, v) => DV.State.setFlag(n, v);
  const T = U.parseTime;

  // who tests where and when (status board + PA)
  const TEST_TABLE = [
    { room: 1, who: 'VANCE, T.', t0: '08:30', t1: '09:10' }, { room: 1, who: 'QUILL, A.', t0: '09:20', t1: '10:00' },
    { room: 1, who: 'MORGAN, J.', t0: '10:10', t1: '10:50' }, { room: 1, who: 'BARNES, P.', t0: '10:52', t1: '11:32' },
    { room: 2, who: 'ORTIZ, L.', t0: '08:30', t1: '09:10' }, { room: 2, who: 'KESSLER, B.', t0: '09:20', t1: '10:00' },
    { room: 2, who: 'MORALES, J.', t0: '10:10', t1: '10:52' }, { room: 2, who: 'KWAN, I.', t0: '11:00', t1: '11:40' },
    { room: 5, who: 'ROMERO, D.', t0: '08:30', t1: '09:10' }, { room: 5, who: 'PRYCE, O.', t0: '09:20', t1: '10:00' },
    { room: 5, who: 'RUSSO, R.', t0: '10:10', t1: '10:50' }, { room: 5, who: 'AVERY, N.', t0: '11:00', t1: '11:40' },
  ];

  const Story = {
    lastRandomPA: 0,

    pa(text, opts) {
      opts = opts || {};
      DV.Audio.play('chime');
      const t = DV.Dialogue.fill(text, {});
      setTimeout(() => {
        DV.UI.subtitle('PA', t, opts.secs || 7);
        DV.Audio.speak(t);
      }, 1300);
      DV.State.data.world.paLog.push({ t: DV.Clock.minutes(), text: t });
      if (DV.State.data.world.paLog.length > 30) DV.State.data.world.paLog.shift();
    },

    // Room 4 calls the player about half an hour after they're through security
    // (older saves only recorded the check-in time)
    callTime() {
      if (!flag('checked_in') || !flag('security_cleared')) return Infinity;
      const t = flag('cleared_time') !== undefined ? flag('cleared_time') : flag('checkin_time');
      if (t === undefined) return Infinity;
      return Math.max(t + 30, T('08:50'));
    },

    onMinute(m) {
      if (!DV.World.current || DV.World.current.id !== 'testing_center') return;
      if (DV.Game.state === 'mainmenu') return;
      const day = DV.Clock.day();
      const once = (key, fn) => {
        const k = 'pa_' + key + '_d' + day;
        if (flag(k)) return;
        setFlag(k);
        fn();
      };
      // the player's call
      if (flag('checked_in') && !flag('tr4_open') && m >= this.callTime()) {
        setFlag('tr4_open');
        setFlag('called_at', m);
        this.pa('Candidate {NAME}, please report to Testing Room Four. Candidate {NAME}, Testing Room Four.', { secs: 8 });
        DV.Quests.setObj('aptitude_day', 'wait', 'done', 'You were called to Testing Room 4 over the PA.');
        DV.Quests.activate('aptitude_day', 'report');
      }
      // reminders
      if (flag('tr4_open') && DV.Quests.obj('aptitude_day', 'report') === 'active') {
        const since = m - (flag('called_at') || m);
        if (since > 0 && since % 45 === 0) this.pa('Candidate {NAME}, your technician is waiting in Testing Room Four.');
      }
      // group calls
      if (day === 1) {
        if (m === T('08:25')) once('g1', () => this.pa('Group One candidates, please proceed to the testing wing. Rooms One, Two and Five.'));
        if (m === T('09:15')) once('g2', () => this.pa('Group Two candidates, please proceed to the testing wing.'));
        if (m === T('10:05')) once('g3', () => this.pa('Group Three candidates, please proceed to the testing wing.'));
        if (m === T('10:55')) once('g4', () => this.pa('Group Four candidates, please proceed to the testing wing.'));
        // Daniel
        if (m === T('11:15') && !flag('daniel_convinced')) once('e1', () => this.pa('Candidate Daniel Webb, please report to the testing wing. Candidate Daniel Webb.'));
        if (m === T('11:45') && !flag('daniel_convinced')) once('e2', () => this.pa('Final call for candidate Daniel Webb. Testing Room Four.'));
        if (m >= T('12:00') && !flag('daniel_convinced') && !flag('daniel_missed')) {
          setFlag('daniel_missed');
          if (DV.Quests.isActive('cold_feet')) DV.Quests.fail('cold_feet', 'Noon passed. Daniel Webb was marked absent and will be tested "under supervision" at the Hub.');
          this.refreshNPC('daniel_webb');
        }
        if (m >= T('12:10') && flag('daniel_convinced') && !flag('daniel_tested')) {
          setFlag('daniel_tested');
          this.refreshNPC('daniel_webb');
          if (DV.Quests.isActive('cold_feet')) DV.Quests.log('cold_feet', 'Daniel should be finished with his test by now — he\'ll probably be in the courtyard.');
        }
        if (m === T('12:00')) once('lunch', () => this.pa('Staff lunch rotation is now in effect. Candidates who have completed testing may use the courtyard.'));
        if (m === T('17:00')) once('close', () => this.pa('The testing center will close to candidates shortly. Please collect your belongings. The Choosing Ceremony begins tomorrow at the Hub.'));
      }
      // random announcements
      if (m - this.lastRandomPA > 50 + Math.random() * 30 && Math.random() < 0.08 && m > T('08:10')) {
        this.lastRandomPA = m;
        this.pa(U.pick(DV.Barks.pa));
      }
    },

    refreshNPC(id) {
      const n = DV.NPCs.get(id);
      if (n) { n.taskKey = null; DV.NPCAI.refresh(n, false); }
    },

    // zone triggers (called by the game when entering/leaving trigger areas)
    onTrigger(id, entered) {
      if (!entered) return;
      switch (id) {
        case 't_tr4':
          if (flag('tr4_open') && DV.Quests.obj('aptitude_day', 'report') === 'active') {
            DV.Quests.setObj('aptitude_day', 'report', 'done', 'Entered Testing Room 4.');
            DV.Quests.activate('aptitude_day', 'technician');
          }
          break;
        case 't_checkpoint_lobbyside': {
          const g = DV.Checkpoint.guard();
          if (flag('security_cleared') || !g) break;
          const now = performance.now();
          if (this.deanCalledAt && now - this.deanCalledAt < 20000) break;
          this.deanCalledAt = now;
          if (!flag('checked_in')) g.say('Reception first, candidate. No badge, no arch. Desk\'s behind you — east side.', 4.5);
          else g.say('Badge ready? Over here.', 3.5);
          break;
        }
        case 't_restroom':
          if (!DV.Quests.started('cold_feet') && DV.Clock.minutes() >= T('08:45') && !flag('daniel_convinced') && !flag('daniel_missed')) {
            DV.UI.notify('Behind the stalls, someone is breathing unevenly — trying very hard to be quiet.');
          }
          break;
        case 't_gallery':
          if (DV.Inventory.has('staff_keycard')) setFlag('used_keycard');
          if (!flag('saw_gallery')) {
            setFlag('saw_gallery');
            DV.UI.notify('Through the one-way glass you can see into every testing room. The candidates inside have no idea.');
            DV.Stats.addXP(15, 'Found the Observation Gallery');
          }
          break;
        case 't_records':
          if (DV.Quests.isActive('protocol_d')) {
            DV.Quests.setObj('protocol_d', 'archive', 'done', 'You got into the Records Archive.');
            DV.Quests.activate('protocol_d', 'file');
          }
          break;
        case 't_courtyard':
          if (!flag('saw_courtyard')) {
            setFlag('saw_courtyard');
            if (DV.State.data.aptitude.status !== 'complete') {
              const s = DV.NPCs.get('leo_brooks');
              if (s && s.present) s.say('Oh — you\'re early! Courtyard\'s meant for after. I won\'t tell.', 4);
            }
          }
          break;
      }
    },

    testingGroups() {
      const now = DV.Clock.minutes();
      const rows = [];
      for (const room of [1, 2, 4, 5]) {
        if (room === 4) {
          const a = DV.State.data.aptitude;
          let status = 'PREPARING', color = '#c8c0a8';
          if (a.status === 'complete') status = 'COMPLETE';
          else if (a.status === 'in_progress') { status = 'IN TEST'; color = '#e8a040'; }
          else if (flag('tr4_open')) { status = 'CALLED'; color = '#7fd07f'; }
          else if (flag('checked_in')) status = 'PLEASE WAIT';
          let name = 'ROOM 4  ' + (DV.State.data.player.name || '').toUpperCase().slice(0, 10);
          if (a.status === 'complete' && flag('daniel_convinced') && !flag('daniel_tested')) { name = 'ROOM 4  WEBB, D.'; status = now >= T('11:30') ? 'IN TEST' : 'NEXT ' + '11:30'; }
          rows.push({ name, status, color });
          continue;
        }
        const list = TEST_TABLE.filter((r) => r.room === room);
        const cur = list.find((r) => now >= T(r.t0) && now < T(r.t1));
        const next = list.find((r) => now < T(r.t0));
        if (cur) rows.push({ name: 'ROOM ' + room + '  ' + cur.who, status: 'IN TEST', color: '#e8a040' });
        else if (next) rows.push({ name: 'ROOM ' + room + '  ' + next.who, status: 'NEXT ' + next.t0, color: '#c8c0a8' });
        else rows.push({ name: 'ROOM ' + room, status: 'DONE', color: '#7f7f7f' });
      }
      rows.splice(2, 0, { name: 'ROOM 3', status: 'OUT OF SERVICE', color: '#d05040' });
      rows.push({ name: 'ROOM 6', status: 'RESERVED', color: '#7f7f7f' });
      return rows;
    },

    // can the player open a door with this lock?
    playerCanPass(lock, door) {
      if (!lock) return true;
      if (lock.indexOf('sim') === 0) return !!(DV.Sim && DV.Sim.canPass(lock));
      if (DV.Game.inChapter && DV.Game.inChapter()) return DV.Chapter.canPass(lock); // story chapters own their doors
      // a district's own rules (your faction's compound)
      const ds = DV.District && DV.District.scriptFor(DV.World.current);
      if (ds && ds.playerCanPass) { const r = ds.playerCanPass(lock, door); if (r !== undefined) return r; }
      const zs = DV.State.zoneState(DV.World.current ? DV.World.current.id : 'testing_center');
      if (door && zs.doors[door.id] === 'unlocked') return true;
      switch (lock) {
        case 'tr4': return !!flag('tr4_open') && DV.State.data.aptitude.status !== 'in_progress';
        case 'proctor': return DV.Inventory.has('staff_keycard');
        case 'storage': return DV.Inventory.has('storage_key');
        case 'records': return DV.Inventory.has('records_key');
        case 'custodian': return !!flag('closet_open') && door && door.id === 'closet_door';
        // the front gate: staff and the guards come and go; candidates leave once their results are in
        case 'npc': return !!flag('results_discussed') && (!door || door.id === 'gate');
        default: return false;
      }
    },

    // staff who can see the player right now (used for theft / lockpicking)
    watchers(range, coneDeg) {
      const p = DV.Player;
      const sneaking = p.crouched && p.onGround;
      if (sneaking) range = (range || 8) * 0.6; // crouched and quiet: harder to notice
      const zone = DV.World.current;
      const proom = zone.roomAt(p.x, p.z);
      const cosLim = Math.cos(((coneDeg || 110) * Math.PI) / 180 / 2);
      const out = [];
      for (const n of DV.NPCs.all) {
        if (!n.present || n.def.role !== 'staff') continue;
        if (zone.roomAt(n.x, n.z) !== proom) continue;
        const dx = p.x - n.x, dz = p.z - n.z;
        const d = Math.hypot(dx, dz);
        if (d > (range || 8)) continue;
        const fx = Math.sin(n.rot + n.lookYaw), fz = Math.cos(n.rot + n.lookYaw);
        const sees = (dx * fx + dz * fz) / Math.max(d, 0.01) > cosLim;
        const hears = !sneaking && d < 2.6 && (p.speed > 3 || DV.Stats.attr('agility') < 6);
        if ((sees && zone.colliders.segmentClear(n.x, n.z, p.x, p.z, 1.5)) || hears) out.push(n);
      }
      return out;
    },
  };

  /* ------------------------------ world actions ------------------------------ */
  DV.Actions = {
    vending(game, it) {
      const zs = DV.State.zoneState(DV.World.current.id);
      const now = DV.Clock.total();
      const last = zs.used[it.id] || -999;
      if (now - last < 60) return { message: 'The dispenser blinks: RESTOCKING. Try again later.' };
      zs.used[it.id] = now;
      DV.Audio.play('clank');
      DV.Inventory.add('ration_bar');
      return { message: 'The ration dispenser clunks out a grey-wrapped bar.' };
    },
    water(game, it) {
      DV.Audio.play('drink');
      DV.Player.stamina = DV.Config.PLAYER.staminaMax;
      DV.Player.exhausted = false;
      if (DV.Inventory.count('water_cup') < 2) {
        DV.Inventory.add('water_cup', 1, true);
        return { message: 'You drink a cup of lukewarm water (stamina restored) and take another for later.' };
      }
      return { message: 'You drink a cup of lukewarm water. Stamina restored.' };
    },
    coffee(game, it) {
      if (it.id === 'coffee:copy_coffee') return { message: 'A sign taped to the machine: BROKEN — USE THE BREAK ROOM. (And under it: "not you, candidates.")' };
      if (DV.Inventory.has('coffee')) return { message: 'You already have a cup.' };
      const zone = DV.World.current;
      const room = zone.roomAt(DV.Player.x, DV.Player.z);
      const inBreak = room && room.id === 'breakroom';
      if (inBreak) {
        const seen = Story.watchers(8, 120);
        if (seen.length) {
          const n = seen[0];
          setFlag('coffee_caught');
          n.say(n.id === 'frank_kowalski' ? 'HEY! That\'s MY coffee! Out!' : 'Excuse me! That is staff coffee!', 5);
          DV.Audio.play('error');
          DV.Reputation.addRel(n.id, -6);
          if (DV.Quests.isActive('initiation')) {
            DV.Quests.fail('initiation', 'Caught red-handed by ' + n.def.name + '.');
            DV.Reputation.add('dauntless', 1, true);
          }
          return { message: n.def.name + ' saw you.' };
        }
        DV.Inventory.add('coffee');
        DV.Stats.practice('stealth', 2);
        if (DV.Quests.isActive('initiation') && DV.Quests.obj('initiation', 'coffee') === 'active') {
          setFlag('coffee_stolen');
          DV.Quests.setObj('initiation', 'coffee', 'done', 'You poured a cup of staff coffee without anyone noticing.');
          DV.Quests.activate('initiation', 'return');
          DV.Stats.addXP(15, 'Unseen');
        }
        return { message: 'You pour a paper cup of staff coffee. Nobody notices.' };
      }
      DV.Inventory.add('coffee');
      return { message: 'You pour yourself a cup of coffee.' };
    },
    kiosk(game, it) {
      if (!DV.Inventory.has('testing_pamphlet') && !flag('took_pamphlet')) {
        setFlag('took_pamphlet');
        DV.Inventory.add('testing_pamphlet');
      }
      DV.UI.openMap();
      return null;
    },
    lostfound(game, it) {
      const found = [];
      if (!flag('lf_bird') && !DV.Quests.isDone('lost_bird') && !flag('kept_bird')) {
        setFlag('lf_bird');
        DV.Inventory.add('wooden_bird');
        found.push('a small carved wooden bird with the initials L.B.');
        if (!DV.Quests.started('lost_bird')) {
          DV.Quests.start('lost_bird');
          DV.Quests.log('lost_bird', 'Found a carved bird marked L.B. in the Lost & Found bin. The notice in the hall mentioned someone named Lucy B.');
        }
        DV.Quests.setObj('lost_bird', 'find', 'done');
        DV.Quests.setObj('lost_bird', 'storage', 'done', 'Found the carved bird in the Lost & Found bin.');
        DV.Quests.activate('lost_bird', 'return');
      }
      if (!flag('lf_card')) {
        setFlag('lf_card');
        DV.Inventory.add('staff_keycard');
        found.push('a white keycard on a blue lanyard — LIN, S.');
        DV.Quests.start('finders_keepers');
      }
      setFlag('lostfound_searched');
      DV.Stats.practice('observation', 1);
      const text = 'You rummage through the bin: odd gloves, a cracked wristwatch, a single shoe, a dog-eared Erudite primer, three umbrellas...' +
        (found.length ? '\n\nYou find ' + found.join(', and ') + '.' : '\n\nNothing else of note.');
      DV.UI.showReading('Lost & Found', text);
      return null;
    },
    pierceDrawer(game, it) {
      const dir = DV.NPCs.get('alan_pierce');
      const zone = DV.World.current;
      if (dir && dir.present && zone.roomAt(dir.x, dir.z) && zone.roomAt(dir.x, dir.z).id === 'director') {
        dir.say('Can I help you find something, candidate?', 4);
        DV.Reputation.addRel('alan_pierce', -8);
        setFlag('pierce_watching');
        return { message: 'Dr. Pierce is watching you very closely.' };
      }
      if (flag('took_pierce_key')) return { message: 'A fountain pen, ration slips, and a photograph turned face-down. Nothing else.' };
      const seen = Story.watchers(8, 120);
      if (seen.length) {
        seen[0].say('What are you doing in the Director\'s desk?', 4);
        return { message: 'Someone is watching.' };
      }
      setFlag('took_pierce_key');
      DV.Stats.practice('stealth', 2);
      if (!DV.Inventory.has('records_key')) DV.Inventory.add('records_key');
      DV.UI.showReading('Desk Drawer', 'Inside: a fountain pen, a stack of ration slips, a photograph turned face-down — a young man in Erudite blue, laughing — and a small steel key tagged RECORDS.\n\nYou take the key.');
      if (DV.Quests.isActive('protocol_d')) DV.Quests.activate('protocol_d', 'archive', 'You took the Records key from Dr. Pierce\'s drawer.');
      return null;
    },
    protocolBox(game, it) {
      if (DV.Inventory.has('protocol_file') || flag('found_protocol')) return { message: 'The box is empty now — just dust and a paperclip.' };
      setFlag('found_protocol');
      DV.Inventory.add('protocol_file');
      DV.Stats.addXP(20, 'Protocol D');
      if (!DV.Quests.started('protocol_d')) DV.Quests.start('protocol_d');
      DV.Quests.setObj('protocol_d', 'ask', 'done');
      DV.Quests.setObj('protocol_d', 'archive', 'done');
      DV.Quests.setObj('protocol_d', 'file', 'done', 'You found the Protocol D file in an archive box marked with a single letter.');
      DV.Quests.activate('protocol_d', 'report');
      return { read: { title: 'Archive Box "D"', text: 'A grey archive box, a single letter stenciled on the lid. Inside, one thin folder: PROTOCOL D — HANDLING OF IRREGULAR APTITUDE RESULTS.\n\nYou take it. (Use it from your inventory to read it.)' } };
    },
    testChair(game, it) {
      const a = DV.State.data.aptitude;
      if (a.status === 'complete') return { message: 'You\'ve already taken your test. The chair is still warm.' };
      if (!flag('tr4_open')) return { message: 'Not yet. Wait to be called.' };
      const tech = DV.NPCs.get('claire_dawson');
      if (!DV.State.npc('claire_dawson').mem.briefed) {
        if (tech) tech.say('Talk to me first — then the chair.', 3.5);
        return null;
      }
      game.sitOn(game.zone().spot('tr4_chair'), true);
      DV.Dialogue.startScene('claire_serum', { speaker: 'Claire Dawson', faction: 'erudite' });
      return null;
    },
    readEnvelope(game) {
      if (flag('read_envelope')) return { read: { title: 'Schedule Amendment', text: envelopeText() } };
      DV.Dialogue.startScene('envelope_choice', {});
      return null;
    },
    readResultSlip() {
      const a = DV.State.data.aptitude;
      let text = 'APTITUDE TESTING CENTER — SECTOR 4\n\nCANDIDATE 4-17: ' + DV.State.data.player.name.toUpperCase() + '\nRESULT: ' + DV.Factions.name(a.recordedAs || a.result).toUpperCase() + '\nTECHNICIAN: C. DAWSON\n\nThis result is advisory. The Choosing Ceremony is the sole determinant of faction membership.';
      if (a.divergent) text += '\n\n(On the back, in tiny pencil: "Tell no one. Burn this after the Ceremony. — J.")';
      return { read: { title: 'Aptitude Result Slip', text } };
    },
  };

  function envelopeText() {
    const p = DV.State.data.player;
    return 'SCHEDULE AMENDMENT — SECTOR 4 — CONFIDENTIAL\nTo: Dr. A. Pierce, Director\n\nCandidates flagged for additional review under PROTOCOL D (pre-assessment indicators):\n\n  • D. WEBB (Abnegation) — Council family. Handle discreetly.\n  • CANDIDATE 4-17, ' + p.name.toUpperCase() + ' (' + DV.Factions.name(p.upbringing) + ') — requested neutral garments. Monitor.\n  • J. MORALES (Candor) — has been asking questions of staff.\n\nTechnicians are NOT to be informed of flags.\n\n— Erudite Oversight';
  }

  DV.DialogueDB.add('envelope_choice', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: 'Sealed Envelope',
        text: 'The seal is cheap wax over cheap glue. One fingernail would lift it. Martha asked you to keep it sealed.',
        choices: [
          { text: 'Lift the seal and read it.', to: 'read' },
          { text: 'Leave it sealed.', end: true, effect: () => DV.Reputation.add('abnegation', 1, true) },
        ],
      },
      read: {
        speaker: 'Schedule Amendment',
        text: () => envelopeText(),
        onEnter: () => {
          DV.State.setFlag('read_envelope');
          DV.State.note('I read the envelope Martha gave me. Daniel, Jenna and I are flagged for "additional review under Protocol D."');
          if (DV.Quests.isActive('protocol_d')) DV.Quests.log('protocol_d', 'The envelope for Dr. Pierce listed candidates flagged under Protocol D — including Daniel Webb, Jenna Morales, and you.');
        },
        choices: [{ text: '(Fold it back into the envelope.)', end: true }],
      },
    },
  });

  DV.Story = Story;
  DV.Events.on('clock:minute', (m) => Story.onMinute(m));
  void S;
})();
