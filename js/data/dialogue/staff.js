/* ==========================================================================
   DIVERGENT — Tier 2 staff dialogue trees
   kade, rhea, brann, marion, wren, ines, willow, gus, ruth
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const T = (id, tree) => DV.DialogueDB.add(id, tree);
  const bye = { text: 'Goodbye.', end: true };
  const clearSecurity = (c) => {
    if (c.flag('security_cleared')) return;
    c.setFlag('security_cleared');
    c.setObj('aptitude_day', 'security', 'done', 'Cleared security at the checkpoint.');
    c.xp(15, 'Security cleared');
  };

  /* ------------------------------ KADE ------------------------------ */
  T('kade', {
    entry: [
      { if: (c) => !c.flag('security_cleared'), node: 'checkpoint' },
      { if: (c) => c.aptDone() && !c.mem('postTest'), node: 'post' },
      { node: 'hub' },
    ],
    nodes: {
      checkpoint: {
        text: (c) => (c.firstTime ? 'Candidate. Stop there. Name and faction.' : 'Back again. Name and faction — still need it.'),
        choices: [
          { text: '{name}. I was raised {upbringing}.', to: 'cp_name' },
          { text: 'I\'m here for the aptitude test.', to: 'cp_obvious' },
          { text: 'Why do you need to know?', to: 'cp_why' },
        ],
      },
      cp_obvious: { text: 'Everyone\'s here for the test. That\'s why there\'s a line of terrified sixteen-year-olds and one bored Dauntless. Name.', next: 'cp_name', nextText: '{name}. Raised {upbringing}.' },
      cp_why: { text: 'Because I\'m the one with the scanner and you\'re the one who wants to go through it. Name.', onEnter: (c) => c.addRel(-1, true), next: 'cp_name', nextText: '...{name}. Raised {upbringing}.' },
      cp_name: {
        text: (c) => (c.outfit() === 'neutral'
          ? '{upbringing}-raised, in candidate greys. Brave or stupid. We\'ll find out which. Step through the arch — slowly — arms out.'
          : '{name}. Raised {upbringing}. Step through the arch — slowly — arms out.'),
        choices: [
          { text: 'Arms out. Got it.', to: 'cp_scan' },
          { text: 'Your scanner isn\'t even switched on.', check: { attr: 'perception', dc: 5 }, to: 'cp_scan_per' },
          { text: 'Long shift already?', check: { attr: 'charisma', dc: 6 }, to: 'cp_cha' },
          { text: 'Do I look like a threat?', to: 'cp_threat' },
        ],
      },
      cp_threat: { text: 'Everyone looks like a threat. That\'s the job. Arms.', next: 'cp_scan', nextText: '(Hold your arms out.)' },
      cp_scan_per: {
        text: '[He grins for the first time.] Most people don\'t notice. It\'s for show. The real check is me, looking at you. ...You pass.',
        onEnter: (c) => { c.addRel(5); c.setMem('noticedScanner', true); },
        next: 'cp_scan', nextText: 'Good to know.',
      },
      cp_cha: {
        text: 'Since six. Three candidates cried, one tried to bite me, and an Erudite kid asked whether the arch emits radiation. You\'re the first one who asked about me. [He waves you through.]',
        onEnter: (c) => c.addRel(8),
        next: 'cp_scan', nextText: 'Hang in there.',
      },
      cp_scan: {
        text: '*The barrier arm lifts.* Clear. Reception is through there, on the right — Marion. Grey, kind eyes, terrifying memory. Don\'t make her repeat herself.',
        onEnter: clearSecurity,
        choices: [
          { text: 'Thanks.', end: true },
          { text: 'What\'s it like guarding a testing center?', to: 'job' },
        ],
      },
      hub: {
        text: (c) => c.greet({ first: 'Moving along?', again: 'Something you need, candidate?', friend: '{name}. Still upright. Good.', cold: 'Keep it short.' }),
        choices: [
          { text: 'What\'s it like guarding a testing center?', to: 'job' },
          { text: 'You don\'t talk like Dauntless. You talk like Candor.', check: { attr: 'perception', dc: 6 }, to: 'past', once: 'kadepast' },
          { text: 'Any advice for the test?', to: 'advice', if: (c) => !c.aptDone() },
          { text: 'Have you seen an Abnegation boy hiding somewhere?', to: 'elias', if: (c) => c.qActive('cold_feet') && !c.flag('elias_convinced') },
          { text: 'Rook Delaney dared me to steal staff coffee.', to: 'coffee', if: (c) => c.qActive('initiation') && !c.has('coffee') },
          { text: 'I finished my test.', to: 'post', if: (c) => c.aptDone() && !c.mem('postTest') },
          bye,
        ],
      },
      job: {
        text: 'Boring, mostly. Nobody attacks a testing center. We\'re here because if somebody\'s result goes "sideways," the Erudite want a Dauntless in the room. Don\'t ask me what sideways means. I don\'t ask either.',
        next: 'hub', nextText: 'Sideways?',
      },
      past: {
        text: '[A pause.] ...Who told you that? Nobody told you that. [He sighs.] Born Candor. Transferred at sixteen. Don\'t spread it around — not because it\'s a secret, but because the Candor will want to "discuss my feelings about it."',
        onEnter: (c) => { c.addRel(4); c.setMem('toldPast', true); c.xp(10); },
        next: 'hub', nextText: 'Your secret\'s safe.',
      },
      advice: { text: 'Whatever they show you, it isn\'t real. Your body won\'t believe that. Tell it anyway. And breathe through your nose — the mouth-breathers always panic first.', next: 'hub', nextText: 'Noted.' },
      elias: { text: 'Thorne kid? Went into the washroom by the checkpoint around quarter to nine. Didn\'t come out. Not my business unless he climbs into the vents.', onEnter: (c) => c.qlog('cold_feet', 'Kade saw Elias go into the washroom by the checkpoint.'), next: 'hub', nextText: 'Thanks.' },
      coffee: { text: 'Ha! Brann will eat you alive. ...Do it anyway. Tip: Brann watches the door, not the machine. And he never sits facing the kitchenette.', onEnter: (c) => c.setFlag('coffee_tip'), next: 'hub', nextText: 'Good tip.' },
      post: {
        text: (c) => {
          c.setMem('postTest', true);
          const r = c.recorded();
          if (r === 'dauntless') return 'You\'re walking straight. Good sign. ...Dauntless, huh? Don\'t tell me. You\'ve got the look.';
          if (c.divergent()) return 'You\'re walking straight. Good sign. You also look like someone who\'s been told a secret. Get some water.';
          return 'You\'re walking straight. Good sign. Most come out of there like they\'ve been hit by a train.';
        },
        next: 'hub', nextText: 'Thanks, Kade.',
      },
    },
  });

  /* ------------------------------ RHEA ------------------------------ */
  (function () {
    const t = DV.AmbientDialogue.build(DV.NPCData.get('rhea_stone'));
    const baseEntry = t.entry;
    t.entry = (c) => (!c.flag('security_cleared') ? 'clear' : baseEntry(c));
    t.nodes.clear = {
      text: 'Not cleared yet? Kade\'s supposed to — ugh. Fine. Arms out. [She pats the air around you without touching anything.] Done. You\'re clear. Go bother Marion.',
      onEnter: clearSecurity,
      next: 'hub', nextText: 'Thanks.',
    };
    DV.DialogueDB.add('rhea', t);
  })();

  /* ------------------------------ BRANN ------------------------------ */
  T('brann', {
    entry: [
      { if: (c) => c.flag('coffee_caught') && !c.mem('scolded'), node: 'angry' },
      { node: 'start' },
    ],
    nodes: {
      start: {
        text: (c) => c.greet({ first: 'This is the staff room. You\'re not staff.', again: 'You again. Still not staff.', friend: 'Kid. Sit, if you want. Don\'t touch the coffee.', cold: 'What.' }),
        choices: [
          { text: 'Is that coffee?', to: 'coffee' },
          { text: 'What do you do here?', to: 'job' },
          { text: 'I bet I could arm-wrestle you.', check: { attr: 'strength', dc: 7 }, to: 'arm', once: 'arm' },
          { text: 'Sorry, I was looking for someone.', to: 'leave' },
          bye,
        ],
      },
      leave: { text: 'Look somewhere else.', end: true },
      job: { text: 'Security office. Eight camera feeds, four of which work. I watch them. Then I come in here and watch the coffee. The coffee is more interesting.', next: 'start', nextText: 'Sounds thrilling.' },
      coffee: {
        text: 'It\'s MY coffee. Staff ration. Candidates get water. There\'s a cooler in the hall. Lovely cooler. Go visit it.',
        choices: [
          { text: 'Rook Delaney dared me to steal a cup. I\'d rather just ask.', check: { attr: 'charisma', dc: 6 }, to: 'ask_ok', if: (c) => c.qActive('initiation') && !c.has('coffee') },
          { text: 'Could I have a little? Please?', to: 'ask_plain', if: (c) => !c.has('coffee') },
          { text: 'Never mind.', to: 'start' },
        ],
      },
      ask_ok: {
        text: '...Delaney. Of course. [He snorts.] Fine. One cup. And you tell that loudmouth you ASKED. Honesty\'s braver than theft, whatever they teach in the Pit.',
        onEnter: (c) => {
          c.give('coffee');
          c.setFlag('coffee_asked');
          c.setObj('initiation', 'coffee', 'done', 'Brann gave you a cup of coffee when you asked honestly.');
          c.activate('initiation', 'return');
          c.addRel(6);
        },
        next: 'start', nextText: 'Thanks, Brann.',
      },
      ask_plain: {
        text: (c) => (c.rel() >= 10 ? '[He grumbles, pours half a cup, and slides it over.] Don\'t make it a habit.' : 'No.'),
        onEnter: (c) => {
          if (c.rel() >= 10) {
            c.give('coffee');
            if (c.qActive('initiation')) { c.setFlag('coffee_asked'); c.setObj('initiation', 'coffee', 'done'); c.activate('initiation', 'return'); }
          }
        },
        next: 'start', nextText: 'Okay.',
      },
      arm: {
        text: '[He looks you up and down, slowly.] ...You might last three seconds. That\'s two more than most. Come back after initiation, if you go that way.',
        onEnter: (c) => { c.addRel(5); c.rep('dauntless', 2); },
        next: 'start', nextText: 'Deal.',
      },
      angry: {
        text: 'Thief. I saw that. Out — before I write you up and send the report to whichever faction is unlucky enough to get you.',
        onEnter: (c) => c.setMem('scolded', true),
        choices: [
          { text: 'Sorry. It was a dare.', to: 'angry_sorry' },
          { text: 'Worth it.', end: true, effect: (c) => { c.addRel(-4); c.rep('dauntless', 1); } },
        ],
      },
      angry_sorry: { text: '[He grunts.] Delaney. Figures. Get out of my break room.', onEnter: (c) => c.addRel(3), end: true },
    },
  });

  /* ------------------------------ MARION ------------------------------ */
  T('marion', {
    entry: [
      { if: (c) => !c.flag('security_cleared') && !c.flag('checked_in'), node: 'not_cleared' },
      { if: (c) => !c.flag('checked_in'), node: 'checkin' },
      { if: (c) => c.qActive('paper_trail') && c.has('signed_form'), node: 'pt_return' },
      { if: (c) => c.aptDone() && !c.mem('postTest'), node: 'post' },
      { node: 'hub' },
    ],
    nodes: {
      not_cleared: { text: 'Security first, dear. The checkpoint is behind you — the Dauntless at the arch will see to you. Then come back and I\'ll check you in.', end: true },
      checkin: {
        text: (c) => (c.firstTime ? 'Good morning. Name, please.' : 'Ready to check in now? Name, please.'),
        choices: [
          { text: '{name}.', to: 'ci_name' },
          { text: 'You look exhausted. Have you been here all night?', check: { attr: 'perception', dc: 5 }, to: 'ci_tired', once: 'tired' },
        ],
      },
      ci_tired: {
        text: '...Since five. The lists don\'t print themselves, and the Erudite only trust paper they can\'t edit. [A small, surprised smile.] Thank you for noticing. Most don\'t.',
        onEnter: (c) => c.addRel(6),
        next: 'ci_name', nextText: 'I\'m {name}.',
      },
      ci_name: {
        text: '{name}... yes. Here you are. Room Four — technician Ashgrove. Here is your card; keep it on you. You\'ll be called over the speakers when Room Four is ready. Nadia has a lovely clear voice — you can\'t miss it.',
        onEnter: (c) => {
          if (c.flag('checked_in')) return;
          c.setFlag('checked_in');
          c.setFlag('checkin_time', c.time());
          c.give('candidate_card');
          c.setObj('aptitude_day', 'checkin', 'done', 'Checked in with Marion. Assigned to Testing Room 4, technician J. Ashgrove.');
          c.xp(10);
        },
        choices: [
          { text: 'How long will I have to wait?', to: 'wait' },
          { text: 'Is it all right that I\'m in neutral clothes?', to: 'neutral', if: (c) => c.outfit() === 'neutral' },
          { text: 'Thank you.', to: 'hub' },
        ],
      },
      wait: { text: 'Usually half an hour. Sometimes longer. Explore if you like — the hall, the washroom, the administration corridor. Not the staff areas. And if the waiting gets to you, sit on a bench and rest your eyes; time passes quicker that way.', next: 'hub', nextText: 'Thanks.' },
      neutral: { text: 'It\'s allowed. It\'s rare. Some candidates think the plain clothes make them harder to read. [Gently.] Nothing makes you harder to read in there, dear.', next: 'hub', nextText: 'I see.' },
      hub: {
        text: (c) => c.greet({ first: 'Yes, dear?', again: 'Yes, dear?', helped: '{name}. Thank you again for earlier — my knees are grateful.', friend: '{name}. What can I do for you?' }),
        choices: [
          { text: 'Is there anything I can do to help?', to: 'pt_offer', if: (c) => !c.qStarted('paper_trail') },
          { text: 'Where is Testing Room 4?', to: 'where', if: (c) => !c.aptDone() },
          { text: 'Can I go in now?', to: 'cango', if: (c) => !c.flag('tr4_open') && !c.aptDone() },
          { text: 'What\'s in the envelope?', to: 'pt_what', if: (c) => c.qActive('paper_trail') && c.has('sealed_envelope') },
          { text: 'Have you seen Elias Thorne?', to: 'elias', if: (c) => c.qActive('cold_feet') },
          { text: 'Has anyone turned in a little wooden bird?', to: 'bird', if: (c) => c.qActive('lost_bird') && !c.has('wooden_bird') },
          { text: 'Do you know anything about "Protocol D"?', to: 'pd', if: (c) => c.qActive('protocol_d') },
          bye,
        ],
      },
      where: { text: 'North through the double doors, into the testing wing — fourth door on the left. It stays locked until you\'re called.', next: 'hub', nextText: 'Thanks.' },
      cango: { text: 'Not until you\'re called, dear. Room Four is being prepared. If the wait is too much, sit on a bench and rest your eyes.', next: 'hub', nextText: 'All right.' },
      pt_offer: {
        text: 'Help? [She hesitates, then lowers her voice.] Actually — I can\'t leave the desk, and this needs to reach Director Wren. Administration wing — west through the hall, end of the corridor. It\'s sealed. It should stay sealed.',
        choices: [
          { text: 'I\'ll take it.', to: 'pt_take' },
          { text: 'Why can\'t Nadia take it?', to: 'pt_nadia' },
          { text: 'Not right now.', to: 'hub' },
        ],
      },
      pt_nadia: { text: 'Nadia reads things. She can\'t help it — she\'s Candor; to her, a sealed envelope is a lie waiting to be exposed. [A tired smile.] I trust you more than Nadia\'s curiosity.', next: 'pt_offer', nextText: 'I see.' },
      pt_take: {
        text: 'Thank you, {name}. Straight to the Director, please. Into his hand.',
        onEnter: (c) => { c.startQuest('paper_trail'); c.give('sealed_envelope'); },
        next: 'hub', nextText: 'Into his hand.',
      },
      pt_what: { text: 'Schedule amendments. Names. Things that aren\'t mine to discuss and aren\'t yours to know. [She meets your eyes.] Please.', next: 'hub', nextText: 'Understood.' },
      pt_return: {
        text: (c) => (c.flag('read_envelope')
          ? 'You\'re back — and that\'s the Director\'s signature. [She takes the form, turns the empty envelope over in her fingers.] ...The seal was lifted.'
          : 'You\'re back — and that\'s the Director\'s signature. Thank you, {name}. You\'ve saved my knees a very long walk.'),
        onEnter: (c) => { c.take('signed_form'); },
        choices: (c) => (c.flag('read_envelope')
          ? [
            { text: 'I read it. I\'m sorry.', to: 'pt_confess', tag: 'Truth' },
            { text: 'It must have come loose on the way.', to: 'pt_lie_ok', check: { attr: 'charisma', dc: 6, roll: true }, fail: 'pt_lie_bad', tag: 'Lie', skill: 'deception' },
          ]
          : [{ text: 'Happy to help.', to: 'pt_done' }]),
      },
      pt_confess: {
        text: '[A long silence.] ...Thank you for telling me. Then you know why it should have stayed sealed. Be careful who you tell, {name}. Some names on that list have parents who would do anything — and some have no one at all.',
        onEnter: (c) => { c.addRel(-2, true); c.addTrust(8); c.rep('candor', 2); },
        next: 'pt_done', nextText: 'I\'ll be careful.',
      },
      pt_lie_ok: { text: '[She studies the seal, then lets it go.] Cheap glue. The Erudite ration everything but paperwork.', next: 'pt_done', nextText: '...Right.' },
      pt_lie_bad: { text: '...Of course it did. [Her voice is very even.] Thank you for delivering it.', onEnter: (c) => { c.addRel(-8); c.setMem('caughtLie', true); }, next: 'pt_done', nextText: '...' },
      pt_done: {
        text: 'Here — a ration bar. Abnegation don\'t give rewards, so consider it lunch.',
        onEnter: (c) => { c.give('ration_bar'); c.completeQuest('paper_trail', c.flag('read_envelope') ? 'read' : 'sealed'); c.helped(); c.addRel(8, true); },
        next: 'hub', nextText: 'Thank you, Marion.',
      },
      elias: { text: 'Thorne. Room Four, eleven-thirty — after you. He checked in very pale. If he isn\'t ready by noon he\'ll be marked absent, and then Oversight decides when and how he\'s tested. Nobody wants that. Especially not his father.', onEnter: (c) => c.qlog('cold_feet', 'Marion: Elias must be ready by noon or he\'ll be marked absent.'), next: 'hub', nextText: 'I understand.' },
      bird: { text: 'Lost things go to Gus — the custodian. He keeps them in a bin in the storage room. He doesn\'t like being asked. Ask nicely.', onEnter: (c) => { c.activate('lost_bird', 'storage', 'Marion says lost items go to Gus the custodian, who keeps them in the storage room.'); }, next: 'hub', nextText: 'Thanks.' },
      pd: { text: '[Her pen stops.] I file what I\'m given, dear. And I was never given that. [Quietly.] Ruth might have been. Ruth has been here longer than the paint.', onEnter: (c) => c.qlog('protocol_d', 'Marion suggested Ruth Calloway, the records keeper, might know about Protocol D.'), next: 'hub', nextText: 'Thank you.' },
      post: {
        text: 'You\'re through. Sit somewhere quiet for a bit — the courtyard is open to you now, east wing. And {name}? Whatever they told you in there, tomorrow is still yours.',
        onEnter: (c) => c.setMem('postTest', true),
        next: 'hub', nextText: 'Thank you.',
      },
    },
  });

  /* ------------------------------ WREN ------------------------------ */
  T('wren', {
    entry: [
      { if: (c) => c.qActive('paper_trail') && c.has('sealed_envelope'), node: 'pt_deliver' },
      { if: (c) => c.aptDone() && !c.mem('postTest'), node: 'post' },
      { if: (c) => c.firstTime, node: 'intro' },
      { node: 'hub' },
    ],
    nodes: {
      intro: {
        text: 'A candidate. In my office. Either you are lost, or you are curious. I prefer the second.',
        choices: [
          { text: 'I\'m curious.', to: 'curious' },
          { text: 'I\'m lost.', to: 'lost' },
        ],
      },
      curious: { text: 'Good. Curiosity is the only virtue all five factions secretly share. Only Erudite are honest enough to admit it.', onEnter: (c) => c.addRel(3), next: 'hub', nextText: '...' },
      lost: { text: 'Then allow me: everything west of the waiting hall is administration. Everything interesting in administration is locked.', next: 'hub', nextText: 'Good to know.' },
      hub: {
        text: (c) => c.greet({ first: 'Yes?', again: 'Candidate {name}. Again.', friend: '{name}. Come in.', cold: 'Make it brief.' }),
        choices: [
          { text: 'What does a facility director do?', to: 'job' },
          { text: 'What happens if a result is irregular?', to: 'irregular' },
          { text: 'What is Protocol D?', to: 'pd', if: (c) => c.qActive('protocol_d') && !c.mem('askedPD') },
          { text: 'Is there a way into the records archive?', to: 'records', if: (c) => c.qActive('protocol_d') },
          bye,
        ],
      },
      job: { text: 'I ensure that forty-one sixteen-year-olds are measured accurately, safely, and without... irregularity. Then I report to Oversight, who report to people who report to no one. It\'s a very tall staircase.', next: 'hub', nextText: 'I see.' },
      irregular: {
        text: '[He smiles.] "Irregular" is a word technicians use when a machine coughs. We recalibrate. We re-test. The city does not run on coughs.',
        choices: [
          { text: 'You paused before you said "re-test."', check: { attr: 'perception', dc: 7 }, to: 'irr_per' },
          { text: 'Okay.', to: 'hub' },
        ],
      },
      irr_per: {
        text: 'Did I? [A thin smile.] You notice things. That is either an asset or a problem, candidate. Which would you like it to be?',
        onEnter: (c) => { c.setFlag('wren_watching'); c.xp(10); },
        choices: [
          { text: 'An asset.', to: 'hub', effect: (c) => c.addRel(2) },
          { text: 'That depends on who I\'m an asset to.', to: 'hub', effect: (c) => { c.addRel(-3); c.setMem('defiant', true); } },
        ],
      },
      pd: {
        text: '[A very small pause.] Where did you hear that? ...No matter. It is an administrative procedure for data integrity. Dull. Exceedingly dull. Don\'t let anyone make it sound otherwise.',
        onEnter: (c) => { c.setMem('askedPD', true); c.setFlag('asked_wren_pd'); c.addRel(-3, true); c.qlog('protocol_d', 'Dr. Wren called Protocol D "an administrative procedure for data integrity." He did not like being asked.'); },
        next: 'hub', nextText: 'Of course.',
      },
      records: { text: 'Ruth Calloway keeps the archive. She keeps it very well. [He glances, briefly, at his own desk drawer.] Is there something else?', onEnter: (c) => c.setFlag('wren_drawer_hint'), next: 'hub', nextText: 'No, Director.' },
      pt_deliver: {
        text: (c) => (c.flag('read_envelope')
          ? 'From Marion? [He turns the envelope over. His thumb finds the lifted seal. He looks at you for a long, quiet moment — and says nothing.] Take this back to her.'
          : 'From Marion? Thank you. [He breaks the seal, reads, signs something with a looping flourish.] Take this back to her, would you?'),
        onEnter: (c) => {
          c.take('sealed_envelope');
          c.give('signed_form');
          c.setObj('paper_trail', 'deliver', 'done', 'Delivered the envelope to Dr. Wren.');
          c.activate('paper_trail', 'return');
          if (c.flag('read_envelope')) c.setFlag('wren_watching');
        },
        choices: [
          { text: 'What\'s in it?', to: 'pt_what' },
          { text: 'I hope everyone on that list gets a fair test.', check: { attr: 'charisma', dc: 7 }, to: 'pt_fair', if: (c) => c.flag('read_envelope') },
          { text: 'Of course.', end: true },
        ],
      },
      pt_what: { text: 'Names.', end: true },
      pt_fair: { text: '[A long look over his glasses.] Everyone gets precisely the test they need, {name}. Good day.', onEnter: (c) => { c.setMem('defiant', true); c.rep('candor', 2); }, end: true },
      post: {
        text: (c) => {
          c.setMem('postTest', true);
          if (c.divergent()) return 'Ah. Candidate {name}. Room Four. Ashgrove recorded your result as {recorded}. [He studies your face for a long moment.] Clean. Unremarkable. Congratulations.';
          return 'Candidate {name}. Your result is filed — {recorded}. A sensible outcome. Good day.';
        },
        choices: (c) => (c.divergent()
          ? [
            { text: 'Thank you, Director.', end: true },
            { text: 'Is something wrong, Director?', check: { attr: 'resolve', dc: 6 }, to: 'post_res' },
            { text: '(Look away.)', to: 'post_fail' },
          ]
          : [bye]),
      },
      post_res: { text: 'Not at all. [He smiles.] You\'re very calm for someone who has just been inside their own head. Most candidates aren\'t. Good day.', onEnter: (c) => c.practice('composure', 2), end: true },
      post_fail: { text: '[You feel his eyes on you all the way to the door.] ...Good day, candidate.', onEnter: (c) => c.setFlag('wren_suspicious'), end: true },
    },
  });

  /* ------------------------------ INES ------------------------------ */
  T('ines', {
    entry: [
      { if: (c) => c.has('staff_keycard'), node: 'keycard' },
      { if: (c) => c.firstTime, node: 'intro' },
      { node: 'hub' },
    ],
    nodes: {
      intro: {
        text: 'Not now — sorry — are you a candidate? You shouldn\'t be back here. Unless — have you seen a keycard? White. Blue lanyard. CALDER.',
        onEnter: (c) => c.setFlag('ines_lost_card'),
        choices: [
          { text: 'I\'ll keep an eye out.', to: 'eye' },
          { text: 'What does it open?', to: 'opens' },
          { text: 'Have you checked Lost & Found?', to: 'lf' },
        ],
      },
      eye: { text: 'Thank you. Truly. If the Director finds out I lost it on a testing day...', onEnter: (c) => c.addRel(2), end: true },
      opens: { text: 'Everything I\'m responsible for. The proctor station. The observation gallery. If it\'s found by the wrong person...', next: 'intro_more', nextText: 'Have you checked Lost & Found?' },
      intro_more: { text: 'Lost & Found — Gus — no, I can\'t leave the station and he hates being asked by staff. If you see it, please. Please.', end: true },
      lf: { text: 'Lost & Found! Of course — Gus keeps a bin in storage — no, I can\'t leave my post, and he hates when staff ask. If you see it there... please bring it to me.', onEnter: (c) => c.addRel(2), end: true },
      hub: {
        text: (c) => c.greet({ first: 'Yes?', again: 'Yes? I\'m — sorry. Busy.', friend: '{name}! Hello. What do you need?', cold: 'What now?' }),
        choices: [
          { text: 'What does a proctor do?', to: 'job' },
          { text: 'Why watch the tests from behind a mirror?', to: 'mirror' },
          { text: 'Did you find your keycard?', to: 'card', if: (c) => c.flag('ines_lost_card') && !c.qDone('finders_keepers') },
          { text: 'You warned me about Room Four. Why?', to: 'why_warn', if: (c) => c.flag('ines_warned') && !c.mem('explainedWarn') },
          bye,
        ],
      },
      job: { text: 'Schedules. Observation. Reports. I watch the tests from the gallery and write down what the technicians say they see. Then I watch the technicians.', next: 'hub', nextText: 'Watch the technicians?' },
      mirror: { text: 'So candidates behave as if no one is watching. Which I suppose makes it a test of the test. [She frowns.] I\'ve never liked that.', next: 'hub', nextText: 'I see.' },
      card: { text: 'No. I\'m using the spare from the security office, which means Brann knows, which means everyone will know by lunch.', next: 'hub', nextText: 'Bad luck.' },
      why_warn: { text: '[She lowers her voice.] Because the Director doesn\'t watch empty rooms for fun. Whatever Room Four is for this week, it isn\'t only testing. That\'s all I know. That\'s more than I should.', onEnter: (c) => c.setMem('explainedWarn', true), next: 'hub', nextText: 'Thank you.' },
      keycard: {
        text: 'That\'s — that\'s my keycard! Where did you —',
        choices: [
          { text: 'Lost & Found. Here you go.', to: 'kc_return' },
          { text: 'I borrowed it to look around the gallery first.', to: 'kc_confess', if: (c) => c.flag('used_keycard'), tag: 'Truth' },
          { text: 'Finders keepers.', to: 'kc_keep' },
        ],
      },
      kc_return: {
        text: '[She closes her eyes in relief.] Thank you. Thank you. Listen — I shouldn\'t say this. The Director has been watching Room Four all week. I don\'t know why. Just... be yourself in there. Truly yourself. Not who you think they want.',
        onEnter: (c) => {
          c.take('staff_keycard');
          c.completeQuest('finders_keepers', 'returned');
          c.addRel(15);
          c.helped();
          c.setFlag('ines_warned');
          c.give('peppermint', 2);
        },
        next: 'hub', nextText: 'I will.',
      },
      kc_confess: {
        text: 'You WHAT? [She presses her fingers to her eyes.] ...Thank you for telling me. Please never tell anyone else. Ever. [She takes the card.] And — be careful in Room Four. The Director watches it.',
        onEnter: (c) => {
          c.take('staff_keycard');
          c.completeQuest('finders_keepers', 'confessed');
          c.addRel(6);
          c.addTrust(8);
          c.rep('candor', 2);
          c.setFlag('ines_warned');
        },
        next: 'hub', nextText: 'Sorry.',
      },
      kc_keep: {
        text: '[Her face goes cold.] I\'ll be reporting it stolen, then. Good luck explaining that to security.',
        onEnter: (c) => { c.addRel(-12); c.insulted(); c.setFlag('kept_keycard'); c.failQuest('finders_keepers', 'You kept the keycard. Ines will report it stolen.'); },
        end: true,
      },
    },
  });

  /* ------------------------------ WILLOW ------------------------------ */
  T('willow', {
    entry: [
      { if: (c) => c.aptDone() && !c.mem('postTest'), node: 'post' },
      { if: (c) => c.firstTime, node: 'intro' },
      { node: 'hub' },
    ],
    nodes: {
      intro: { text: 'Hello, love. Not feeling well? Or just curious? Both are allowed in here.', next: 'hub', nextText: 'Just looking around.' },
      hub: {
        text: (c) => c.greet({ first: 'What can I do for you?', again: 'Back again, love?', helped: 'There\'s my helper.', friend: '{name}! Sit, sit.' }),
        choices: [
          { text: 'I\'m nervous about the test.', to: 'nervous', if: (c) => !c.aptDone() },
          { text: 'Do many candidates end up in here?', to: 'many' },
          { text: 'Do you know Elias Thorne?', to: 'elias', if: (c) => c.qActive('cold_feet') && !c.flag('elias_convinced') },
          { text: 'Pip Hollis lost something precious.', to: 'pip', if: (c) => c.qActive('lost_bird') && !c.has('wooden_bird') },
          { text: 'Tell me about Amity.', to: 'amity' },
          bye,
        ],
      },
      nervous: {
        text: (c) => (c.mem('gaveTea') ? 'You\'ve had my tea already, love. The rest is just breathing. In for four, out for six.' : 'Of course you are. Here — calming tea. An Amity recipe. It won\'t change what you are; it\'ll just let you meet it standing up.'),
        onEnter: (c) => { if (!c.mem('gaveTea')) { c.give('calming_tea'); c.setMem('gaveTea', true); c.addRel(3, true); } },
        next: 'hub', nextText: 'Thank you.',
      },
      many: { text: 'One in five. Fainting, crying, shaking. A Dauntless boy this morning fainted before the serum was even in. One girl wouldn\'t stop laughing. All normal. The simulation goes deep.', next: 'hub', nextText: 'That\'s reassuring. Sort of.' },
      elias: {
        text: 'The Thorne boy. He came in at eight asking if a person could be "disqualified for being wrong." I told him there\'s no wrong. He didn\'t believe me. His father sits on the Council — leaders\' children carry the whole sector on their backs. If you find him, don\'t push. Ask him what HE wants. I\'d bet nobody has.',
        onEnter: (c) => { c.setFlag('willow_hint'); c.qlog('cold_feet', 'Willow: Elias asked whether a person could be "disqualified for being wrong." Don\'t push him — ask what he wants.'); },
        next: 'hub', nextText: 'I\'ll remember that.',
      },
      pip: { text: 'The bird! Her grandmother carved it. Anything dropped in this building ends up with Gus eventually — he keeps a bin in the storage room. He\'s gruff, but he\'s soft on the young ones.', onEnter: (c) => c.activate('lost_bird', 'storage', 'Willow says lost things end up with Gus, in the storage room.'), next: 'hub', nextText: 'Thanks.' },
      amity: { text: 'Orchards and long tables and arguments settled by singing. We\'re not soft, whatever the Dauntless say. It takes a great deal of strength to choose peace every single day.', next: 'hub', nextText: 'I believe that.' },
      post: {
        text: 'There you are. How do you feel?',
        onEnter: (c) => c.setMem('postTest', true),
        choices: [
          { text: 'Fine.', to: 'post_fine' },
          { text: 'Strange. Like I\'m still half in there.', to: 'post_strange' },
          { text: 'I\'m fine. (Hide how shaken you are.)', check: { attr: 'resolve', dc: 5 }, to: 'post_hide', if: (c) => c.divergent() },
        ],
      },
      post_fine: { text: 'Mm. Your hands say otherwise. Sit for a minute anyway. Humor an old nurse.', next: 'hub', nextText: 'All right.' },
      post_strange: { text: 'That\'s the serum leaving. Sit, drink, breathe. If you see things that aren\'t there in the next hour — tell me. Not the Erudite. Me.', onEnter: (c) => c.addRel(3), next: 'hub', nextText: 'I will.' },
      post_hide: { text: '[She watches you for a moment, then pats your hand.] Good. Keep that face on, whatever it\'s hiding. It\'s a good face.', onEnter: (c) => { c.practice('composure', 2); c.addTrust(5); }, next: 'hub', nextText: '...Thank you.' },
    },
  });

  /* ------------------------------ GUS ------------------------------ */
  T('gus', {
    entry: [
      { if: (c) => c.firstTime, node: 'intro' },
      { node: 'hub' },
    ],
    nodes: {
      intro: { text: '*He keeps mopping.* ...Something you need, or are you just admiring the floor?', next: 'hub', nextText: 'It\'s a very clean floor.' },
      hub: {
        text: (c) => c.greet({ first: '*mops*', again: '*mops* ...You again.', helped: 'Honest one. What?', friend: '{name}. *He leans on the mop.*', cold: '*He doesn\'t look up.*' }),
        choices: [
          { text: 'What\'s it like, working here?', to: 'work' },
          { text: 'What do you hear, mopping around everyone?', to: 'hear', check: { attr: 'charisma', dc: 5 }, if: (c) => !c.mem('heard') },
          { text: 'Have you found a little wooden bird?', to: 'bird', if: (c) => c.qActive('lost_bird') && !c.has('wooden_bird') && !c.has('storage_key') && !c.flag('lostfound_searched') },
          { text: 'Here\'s your storage key back.', to: 'key_back', if: (c) => c.has('storage_key') },
          { text: 'I found a note in your closet.', to: 'note', if: (c) => c.has('gus_note') },
          { text: 'Have you always been factionless?', to: 'past', check: { attr: 'perception', dc: 6 }, if: (c) => !c.mem('toldPast') },
          { text: 'Have you seen an Abnegation boy hiding?', to: 'elias', if: (c) => c.qActive('cold_feet') && !c.flag('elias_convinced') },
          bye,
        ],
      },
      work: { text: 'Quiet. People step around me like I\'m furniture. Furniture hears things.', next: 'hub', nextText: 'What kind of things?' },
      hear: {
        text: 'That the Director gets twitchy when a result doesn\'t fit. That the archive has a box with one letter on it. That technicians say "D" the way you\'d say a swear word. Mop\'s got good ears.',
        onEnter: (c) => { c.setMem('heard', true); c.addRel(3); if (c.qActive('protocol_d')) c.qlog('protocol_d', 'Gus: there\'s a box in the records archive with a single letter on it. Technicians say "D" like a swear word.'); },
        next: 'hub', nextText: 'Interesting.',
      },
      bird: {
        text: 'Might have. Everything I sweep up goes in the bin in the storage room. Room\'s locked. Don\'t look at me like that. I\'ve got floors.',
        onEnter: (c) => c.activate('lost_bird', 'storage', 'Gus keeps found items in the Lost & Found bin in the locked storage room.'),
        choices: [
          { text: 'It belongs to a scared Amity kid. Her grandmother carved it.', check: { attr: 'charisma', dc: 5 }, to: 'bird_key' },
          { text: 'It\'s Lost and FOUND, not Lost and Kept. Candidates can claim property.', check: { attr: 'intelligence', dc: 6 }, to: 'bird_key_int' },
          { text: 'Please? I\'d owe you one.', to: 'bird_key', if: (c) => c.rel() >= 10 },
          { text: 'Never mind.', to: 'hub' },
        ],
      },
      bird_key: {
        text: '...Hm. [He unhooks a brass key from his belt.] Storage. Bring it back, or I\'ll know where to find you.',
        onEnter: (c) => { c.give('storage_key'); c.addRel(5); },
        next: 'hub', nextText: 'I will. Thank you.',
      },
      bird_key_int: {
        text: '[A dry snort.] Erudite logic. You sound like someone I used to know. [He hands over a brass key.] Storage. Bring it back.',
        onEnter: (c) => { c.give('storage_key'); c.addRel(3); },
        next: 'hub', nextText: 'Thanks.',
      },
      key_back: {
        text: 'Honest. Rarer than you\'d think around here. [He hooks the key back on his belt.] Closet\'s open to you, if you ever need a quiet place to hide. Everyone needs one today.',
        onEnter: (c) => { c.take('storage_key'); c.addRel(8); c.helped(); c.setFlag('closet_open'); },
        next: 'hub', nextText: 'Thanks, Gus.',
      },
      note: {
        text: '...Give that here. [He reads it, folds it small, and pockets it.] Old business. You didn\'t read it. Right?',
        onEnter: (c) => c.take('gus_note'),
        choices: [
          { text: 'Right.', to: 'hub', effect: (c) => c.addRel(6) },
          { text: 'Who\'s "E."?', check: { attr: 'charisma', dc: 7 }, to: 'note_e' },
        ],
      },
      note_e: { text: 'Someone who still remembers me. Someone who kept a file I shouldn\'t want back. [He looks at the mop.] Leave it there, kid.', onEnter: (c) => { c.addRel(4); c.setFlag('gus_e'); }, next: 'hub', nextText: 'Okay.' },
      past: {
        text: 'No. [Long pause.] Twenty years ago I wore blue. I failed initiation by asking the wrong question, too loudly, in front of the wrong people. Now I mop the floors of the people who failed me. Funny, how that works out.',
        onEnter: (c) => { c.setMem('toldPast', true); c.setFlag('gus_was_erudite'); c.addRel(5); c.xp(10); },
        next: 'past2', nextText: 'What was the question?',
      },
      past2: { text: '"What happens to the ones who fit more than one box?" [He goes back to mopping.] Don\'t ask it loudly, kid. Don\'t ask it at all.', next: 'hub', nextText: '...' },
      elias: { text: 'Washroom by the checkpoint. Third time today I\'ve mopped around his shoes.', onEnter: (c) => c.qlog('cold_feet', 'Gus: Elias is in the washroom by the checkpoint.'), next: 'hub', nextText: 'Thanks.' },
    },
  });

  /* ------------------------------ RUTH ------------------------------ */
  T('ruth', {
    entry: [
      { if: (c) => c.firstTime, node: 'intro' },
      { node: 'hub' },
    ],
    nodes: {
      intro: { text: 'Good morning, child. You\'re a long way from the waiting hall.', next: 'hub', nextText: 'Just exploring.' },
      hub: {
        text: (c) => c.greet({ first: 'Yes?', again: 'Yes, child?', friend: '{name}. Sit a moment.', helped: '{name}. Marion speaks well of you.' }),
        choices: [
          { text: 'What do you keep in the archive?', to: 'archive' },
          { text: 'Could I see the archive?', to: 'see', if: (c) => !c.has('records_key') && !c.flag('ruth_gave_key') },
          { text: 'What is Protocol D?', to: 'pd', if: (c) => c.qActive('protocol_d') && !c.mem('askedPD') },
          bye,
        ],
      },
      archive: { text: 'Every result from every test since the founding. Names, dates, technicians. Paper doesn\'t forget, and paper doesn\'t lie — unless someone lies to it first.', next: 'hub', nextText: 'Does that happen?' },
      see: {
        text: 'No.',
        choices: [
          { text: 'Someone I care about might be on a list in there. I need to know.', check: { attr: 'charisma', dc: 7 }, to: 'give' },
          { text: 'I was raised Abnegation, like you. The truth belongs to everyone.', to: 'give', if: (c) => c.upbringing() === 'abnegation' },
          { text: 'I helped Marion today. She\'ll vouch for me.', to: 'give', if: (c) => c.qDone('paper_trail') },
          { text: 'All right.', to: 'hub' },
        ],
      },
      give: {
        text: '[She studies you for a long, long time.] ...Abnegation says the truth belongs to everyone. The Erudite say it belongs to whoever can use it. [She slides a small steel key across the desk, and does not look at it.] I didn\'t give you this. I\'m an old woman who drops things.',
        onEnter: (c) => { c.give('records_key'); c.setFlag('ruth_gave_key'); c.addRel(5); c.activate('protocol_d', 'archive', 'Ruth Calloway quietly gave you the Records Archive key.'); },
        next: 'hub', nextText: 'Thank you, Ruth.',
      },
      pd: {
        text: '[Her hands go very still.] Where did you hear that word? ...Some files are kept because no one has the courage to burn them. That is all I will say in an open office.',
        onEnter: (c) => { c.setMem('askedPD', true); c.activate('protocol_d', 'archive', 'Ruth reacted to "Protocol D" — the file must be in the Records Archive.'); },
        next: 'hub', nextText: '...',
      },
    },
  });
})();
