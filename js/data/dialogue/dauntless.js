/* ==========================================================================
   DIVERGENT — Build 3: dialogue in the Dauntless compound
   Mark Rivera (instructor), Dana Cole (leader), Nina Kaur (tattoos),
   Dr. Ama Mensah (infirmary), Bo Kaminski (the zip line), and the class:
   Nate, Kat, Joey, Ella, Josh and Daniel. The ones you met on Aptitude
   Day remember it.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const T = (id, tree) => DV.DialogueDB.add(id, tree);
  const I = () => DV.Initiation;
  const dname = () => (DV.State.data.story && DV.State.data.story.dauntlessName) || DV.State.data.player.name;
  const under = () => (I() ? I().underdog() : 'd_daniel');
  const underName = () => (I() ? I().first(under()) : 'Daniel');
  const evening = (c) => c.after('19:30') || c.before('04:00');
  const divergent = () => !!DV.State.data.aptitude.divergent;
  const rankLine = () => {
    const i = I(), r = i.rankOf('player'), n = i.rankings().length;
    return { r, n, bottom: r > n - i.CUT };
  };

  /* ============================== MARK RIVERA ============================== */
  T('d_mark', {
    entry: 'start',
    nodes: {
      start: {
        text: (c) => {
          const b = I().canStart();
          if (!c.mem('met_compound')) {
            c.setMem('met_compound');
            return (c.flag('first_jumper') ? '[He looks at you the way people look at a dog that has just stood up on its hind legs.] First jumper. ' : '') + dname() + '. Found your bunk yet? West side of the Pit, past the noticeboard. Training Room is north. Eight o\'clock means seven fifty-five.';
          }
          if (b && c.rawRel() > -20) return b.title + '. It\'s on. Now. And you\'re standing here talking to me — why?';
          if (c.mem('insulted') && c.rel() < 0) return 'You again. Make it quick.';
          if (evening(c) && DV.World.current && DV.World.current.roomAt(DV.Player.x, DV.Player.z) && DV.World.current.roomAt(DV.Player.x, DV.Player.z).id === 'the_pit') return '[He doesn\'t look away from the chasm.] Initiate.';
          return c.greet({ first: 'Initiate.', again: U.pick(['Initiate.', 'What.', 'Make it quick.', 'Yes?']), friend: 'You again. Good. What do you need?', cold: 'What.' });
        },
        choices: (c) => [
          { text: 'I\'m ready.', end: true, if: () => !!I().canStart() && ['range', 'bags', 'knives', 'spar', 'fight'].indexOf(I().canStart().kind) >= 0, effect: () => { I().deferStart = I().canStart(); } },
          { text: 'What\'s on today?', to: 'today' },
          { text: 'How am I doing?', to: 'doing', if: () => c.day() >= 3 },
          { text: 'What happens to the ones who get cut?', to: 'cut', once: 'cut' },
          { text: 'Josh has been going after ' + underName() + '.', to: 'josh', if: () => DV.Quests.isActive('bad_blood') && !c.flag('mark_knows_josh') },
          { text: 'They came for me at the chasm. It was Josh.', to: 'after_named', if: () => DV.Quests.obj('bad_blood', 'after') === 'active' },
          { text: 'Can I ask you something?', to: 'personal', if: () => evening(c) || c.rel() >= 10, once: 'personal' },
          { text: 'Why did you transfer?', to: 'personal2', if: () => c.mem('personal1') && c.rel() >= 12, once: 'personal2' },
          { text: '[PERCEPTION 6] You keep watching me in training. Why?', to: 'watched', check: { attr: 'perception', dc: 6 }, if: () => c.day() >= 4 && divergent() && !c.flag('mark_warned'), xp: 20 },
          { text: 'Nothing.', end: true },
        ],
        // (c.day used above)
      },
      today: {
        text: (c) => {
          const i = I();
          const bl = i.blocks();
          if (!bl.length) return c.day() < i.FIRST ? 'Today? Today you eat, you find a bunk, you sleep. Tomorrow at eight you find out what you\'re made of.' : 'Nothing on the board. Enjoy it. It won\'t last.';
          const lines = bl.map((b) => {
            const s = i.status(b);
            return '· ' + b.t0 + '–' + b.t1 + '  ' + b.title + (b.ranked ? ' (ranked)' : '') + (s === 'done' ? '  ✓' : s === 'missed' ? '  — missed' : '');
          });
          return 'Today:\n' + lines.join('\n') + '\n\nMeals at seven, half twelve and seven. Lights out at eleven.';
        },
        next: 'start', nextText: 'Got it.',
      },
      doing: {
        text: (c) => {
          const { r, n, bottom } = rankLine();
          const s = I().st();
          // their weakest thing
          const by = {};
          for (const e of s.log) if (e.who === 'player' && e.b) by[e.b.replace(/\d+$/, '')] = (by[e.b.replace(/\d+$/, '')] || 0) + e.pts;
          const worst = Object.keys(by).sort((a, b) => by[a] - by[b])[0];
          const tip = { range: 'Your shooting is costing you. Breathe out, stop, squeeze.', knives: 'You\'re throwing the handle. Watch the spin, not the board.', fight: 'You fight like you\'re apologising. Stop it.', spar: 'In the ring you watch their fists. Watch their shoulders.', bags: 'Your feet are lazy at the bags. Lazy feet, slow hands.' }[worst] || 'Keep doing what you\'re doing. Do it harder.';
          return (bottom ? '[He doesn\'t soften it.] Right now? You\'re ' + I().ordinal(r) + ' of ' + n + '. That\'s below the line. Below the line is factionless. ' : r <= 3 ? 'You\'re ' + I().ordinal(r) + ' of ' + n + '. Don\'t let me catch you enjoying it. ' : I().ordinal(r) + ' of ' + n + '. Middle of the pack is still in the pack. ') + tip;
        },
        next: 'start', nextText: 'Understood.',
      },
      cut: {
        text: 'Factionless. You walk out the front door in the clothes you\'re wearing, and you don\'t come back, and nobody in this city will give you a job or a bed because of a number on a chalkboard. [A beat.] So don\'t be the number at the bottom of the chalkboard.',
        next: 'start', nextText: '...Right.',
      },
      josh: {
        text: '[His jaw works.] I can\'t make Josh Miller kind. I can make sure he isn\'t cruel in my training room. Out there — [he nods at the Pit] — out there, you walk in twos. Hear me? After dark, in twos.',
        choices: [
          { text: 'That\'s it? That\'s all you\'ll do?', to: 'josh2', effect: (c) => { c.setFlag('mark_knows_josh'); } },
          { text: 'In twos. Got it.', end: true, effect: (c) => { c.setFlag('mark_knows_josh'); c.addRel(2, true); } },
        ],
      },
      josh2: { text: 'That\'s all I\'m allowed to do. [Quieter.] It isn\'t all I\'ll do. Go.', endText: 'Going.', onEnter: (c) => c.addRel(3, true) },
      after_named: {
        text: 'Josh. [He doesn\'t ask if you\'re sure.] Bryce and Marcus?',
        choices: [
          { text: 'All three of them.', to: 'expel', effect: () => DV.StageOne && DV.StageOne.reportJosh('all') },
          { text: 'Just Josh. The others just did what he said.', to: 'expel', effect: () => DV.StageOne && DV.StageOne.reportJosh('josh') },
          { text: 'Forget it. Dauntless handle their own.', to: 'handle', effect: () => DV.StageOne && DV.StageOne.reportJosh('none') },
        ],
      },
      expel: { text: 'Leave it with me. [He\'s already walking toward the leaders\' wing.] And — initiate. You went to the railing alone after I told you not to. Next time I\'ll let them drop you.', endText: '...Thanks.' },
      handle: { text: '[He looks at you a long time.] That\'s a very Dauntless thing to say. It\'s also a stupid one. Your call.', endText: 'My call.' },
      personal: {
        text: (c) => { c.setMem('personal1'); return '[He doesn\'t look at you.] You get one.'; },
        choices: [
          { text: 'Were you scared? Your first week?', to: 'p_scared' },
          { text: 'Do you like this? Training us?', to: 'p_like' },
          { text: 'Where did you come from?', to: 'p_from' },
        ],
      },
      p_scared: { text: 'Every minute. You think it stops. It doesn\'t stop. You just get better at doing things anyway. That\'s all brave is. Doing it anyway.', endText: 'Doing it anyway.', onEnter: (c) => c.addRel(4, true) },
      p_like: { text: 'I like the ones who make it. I don\'t sleep the night of the cut. [A shrug.] So: half and half.', endText: 'Half and half.', onEnter: (c) => c.addRel(4, true) },
      p_from: { text: 'Candor. Don\'t tell anyone, they\'ll expect me to be honest. [Almost a smile.]', endText: 'Your secret\'s safe.', onEnter: (c) => c.addRel(4, true) },
      personal2: {
        text: 'Because in Candor, I told the truth about someone, once, the way I was raised to — every word of it true — and it cost them everything they had. Here, at least, when I hurt somebody, I do it in front of them. [He pushes off the railing.] That\'s more than you get. Go to bed.',
        endText: 'Goodnight, Mark.', onEnter: (c) => { c.addRel(6, true); c.setMem('told_why'); },
      },
      watched: {
        text: '[For a moment he doesn\'t say anything at all. Then, very low:] Because you do things in an order nobody taught you. You look at the target, then the room, then the target. Most people never look at the room. [He glances at the leaders\' wing.] Stage Two is simulations. They put a serum in your neck and they watch your heart and they watch what you do.',
        choices: [
          { text: 'And what should I do?', to: 'watched2' },
          { text: 'I don\'t know what you\'re talking about.', to: 'watched_deny' },
        ],
      },
      watched2: {
        text: 'Be frightened. When it\'s a nightmare, have the nightmare. Don\'t fix it. Don\'t see through it. Don\'t do anything a frightened sixteen-year-old wouldn\'t do. [He steps back, louder:] And keep your elbow in at the bags, it\'s embarrassing.',
        endText: '...I understand.', onEnter: (c) => { c.setFlag('mark_warned'); c.addRel(6, true); },
      },
      watched_deny: { text: 'Good. Keep not knowing. Keep it up in there too. [Louder:] Bags, eight o\'clock. Don\'t be late.', endText: 'Yes, sir.', onEnter: (c) => { c.setFlag('mark_warned'); c.addRel(3, true); } },
    },
  });

  /* ============================== DANA COLE ============================== */
  T('d_dana', {
    entry: 'start',
    nodes: {
      start: {
        text: (c) => (c.firstTime ? '[She looks up from Mark\'s clipboard as if you\'re a line on it.] The transfer. ' + dname() + ', isn\'t it? I watched your jump. Efficient.' : 'Initiate.'),
        choices: (c) => [
          { text: 'Why cut anyone at all?', to: 'why' },
          { text: 'Josh Miller is bullying people.', to: 'josh', if: () => DV.Quests.isActive('bad_blood'), once: 'josh' },
          { text: 'Mark says you were Erudite.', to: 'eru', once: 'eru' },
          { text: 'How am I doing?', to: 'doing', if: () => c.day() >= 4 },
          { text: 'Nothing. Sorry.', end: true },
        ],
      },
      why: { text: 'A faction is only as brave as the least brave person in it. Stage One finds that person. [Pleasantly.] We\'d rather it was in a training room than on the fence with a gun.', next: 'start', nextText: '...I see.' },
      josh: { text: 'Initiation is meant to be hard, initiate. If the strong prey on the weak, perhaps the weak should consider being stronger. [She makes a small note.] Was there anything else?', next: 'start', nextText: 'No.', onEnter: (c) => c.addRel(-3, true) },
      eru: { text: 'Born. I chose otherwise, the way you did. Erudite taught me how to measure things. Dauntless gave me something worth measuring. [Smiles.] You\'ll find I\'m very good at it.', next: 'start', nextText: 'I believe you.' },
      doing: { text: (c) => { const { r, n, bottom } = rankLine(); return 'You\'re ' + I().ordinal(r) + ' of ' + n + '. ' + (bottom ? 'Below the line. I\'d find that motivating.' : r <= 2 ? 'Near the top. Interesting — for a transfer.' : 'Unremarkable. Which is not a criticism, yet.'); }, next: 'start', nextText: 'Thank you.' },
    },
  });

  /* ============================== NINA KAUR ============================== */
  const DESIGNS = [
    { id: 'ravens', name: 'Three ravens in flight', where: 'collarbone', slot: 'neck', note: 'One for each fear you mean to beat.' },
    { id: 'flame', name: 'The Dauntless flame', where: 'forearm', slot: 'armR', note: 'Everybody gets one. Everybody should.' },
    { id: 'wings', name: 'A pair of open wings', where: 'shoulder', slot: 'armL', note: 'For the jump. You never forget the first one.' },
    { id: 'blade', name: 'A throwing knife, point down', where: 'forearm', slot: 'armL', note: 'Point first. Always point first.' },
    { id: 'five', name: 'The five faction symbols, together', where: 'back of the neck', slot: 'neck', note: 'Hm. That one people notice.' },
  ];
  T('d_nina', {
    entry: 'start',
    nodes: {
      start: {
        text: (c) => {
          if (DV.Quests.isActive('ink') && DV.Quests.obj('ink', 'visit') === 'active') DV.Quests.setObj('ink', 'visit', 'done', 'You found Nina\'s parlour.');
          if (c.firstTime) return '[A woman with ink-blue nails and three ravens climbing her collarbone looks up from a stencil.] An initiate. Come in. Sit if you\'re sitting, look if you\'re looking — don\'t touch the needles. I\'m Nina.';
          if (c.mem('inked')) return 'How\'s it healing? Don\'t pick it. Everybody picks it.';
          return 'Back again. Decided?';
        },
        choices: (c) => [
          { text: 'I want a tattoo.', to: 'design', if: () => !c.mem('inked') },
          { text: 'Joey wants one. He\'s… working up to it.', to: 'joey', if: () => c.flag('joey_ink') && !c.flag('joey_inked') && DV.NPCs.get('d_joey') && DV.NPCs.get('d_joey').present && DV.NPCs.get('d_joey').dist < 9 },
          { text: 'What do your ravens mean?', to: 'ravens', once: 'ravens' },
          { text: 'What did you do before this?', to: 'before', once: 'before' },
          { text: 'You said aptitude tests. Like it meant something.', to: 'div', if: () => c.mem('told_before') && divergent() && !c.flag('nina_warned') },
          { text: 'Just looking.', end: true },
        ],
      },
      design: {
        text: 'Here\'s what I do for initiates. [She flips a sketchbook round.] First one\'s free. Second one you pay for in stories.',
        choices: () => DESIGNS.map((d) => ({ text: d.name + ' (' + d.where + ')', to: 'confirm', effect: (c) => { c.setMem('design', d.id); } })).concat([{ text: 'Not yet.', to: 'start' }]),
      },
      confirm: {
        text: (c) => { const d = DESIGNS.find((x) => x.id === c.mem('design')); return d.note + ' ' + (d.id === 'five' ? '[She pauses, needle up.] People will ask why you\'ve got all five. Have an answer ready that isn\'t the true one. ' : '') + 'Sit. This is going to sting. Then it\'s going to sting more. Then it\'ll be beautiful.'; },
        choices: [
          { text: 'Do it.', end: true, effect: (c) => { const d = DESIGNS.find((x) => x.id === c.mem('design')); DV.StageOne && DV.StageOne.tattoo(d); c.setMem('inked'); c.addRel(5, true); } },
          { text: 'Actually — something else.', to: 'design' },
        ],
      },
      joey: {
        text: '[Joey looms in the doorway, grey. Nina doesn\'t even look up.] Brennan. Third time this year. Sit down before you fall down.',
        choices: [
          { text: '"You\'ve got this, Joey. Look at me, not the needle."', end: true, effect: () => DV.StageOne && DV.StageOne.joeyInk(true) },
          { text: '"Just do it fast, Nina."', end: true, effect: () => DV.StageOne && DV.StageOne.joeyInk(false) },
        ],
      },
      ravens: { text: 'Fears. Three of them. You\'ll find out about fears soon enough — Stage Two. I beat mine one at a time and every time I did, I came here and drew another bird. [She taps the third.] This one took me four years.', next: 'start', nextText: 'Four years.', onEnter: (c) => c.addRel(2, true) },
      before: { text: 'Before this I gave aptitude tests. Sector Two. For a while. [Her needle stops.] Then I stopped. And now I draw birds on people. It\'s better work.', next: 'start', nextText: 'Why did you stop?', onEnter: (c) => c.setMem('told_before') },
      div: {
        text: '[She puts the needle down and pushes the door shut with her boot.] Who gave you your test?',
        choices: [
          { text: 'Claire Dawson. Sector Four.', to: 'div2' },
          { text: 'Why does it matter?', to: 'div2' },
        ],
      },
      div2: {
        text: 'Claire. [Something like relief.] Then she told you what you are, and she told you not to say it, and you haven\'t. Good. Listen: Stage Two is a simulation. They put the serum in your neck and they watch your heart rate — and they watch what you DO. A normal initiate is frightened inside a simulation. A normal initiate never realises it\'s a simulation at all.',
        choices: [
          { text: 'And if I do realise?', to: 'div3' },
          { text: 'I don\'t know what you mean.', to: 'div3' },
        ],
      },
      div3: { text: 'Then don\'t show it. Be afraid. Take your time. Get out of it the long way, the way they expect. [She opens the door again, bright:] And keep it out of the sun for a week!', endText: 'Thank you, Nina.', onEnter: (c) => { c.setFlag('nina_warned'); c.addRel(6, true); } },
    },
  });

  /* ============================== DR. AMA MENSAH ============================== */
  T('d_ama', {
    entry: 'start',
    nodes: {
      start: {
        text: (c) => (c.flag('was_knocked_out_d' + c.day()) ? '[She shines a light in each of your eyes.] You were out for four minutes, you know. Follow my finger. Good. Idiot. Good.' : c.firstTime ? 'Sit. What did you do? — No, let me guess. Knuckles. It\'s always knuckles the first week.' : 'You again. What is it this time?'),
        choices: (c) => [
          { text: 'Can you patch me up?', to: 'patch' },
          { text: 'Do you see a lot of initiates?', to: 'seen', once: 'seen' },
          { text: 'You weren\'t born Dauntless, were you?', to: 'amity', once: 'amity' },
          { text: 'I\'m fine. Thanks.', end: true },
        ],
      },
      patch: { text: '[Tape, ice, something that stings and then doesn\'t.] There. Stamina\'s a resource, not a personality. Sleep tonight.', next: 'start', nextText: 'Thanks, Doc.', onEnter: (c) => { DV.Player.stamina = 100; DV.Player.exhausted = false; c.addRel(1, true); } },
      seen: { text: (c) => 'Every year, the same week. Knuckles, ribs, a nose or two. ' + underName() + ' has been in twice already this week, and I don\'t think the bags did it. [She looks at you over her glasses.] If you\'re his friend, be his friend at night too.', next: 'start', nextText: 'I will.', onEnter: (c) => { if (!DV.Quests.started('bad_blood')) DV.StageOne && DV.StageOne.startBadBlood(); } },
      amity: { text: 'Amity. Twenty years ago. I hit someone at my first harvest festival — he deserved it — and I realised I wasn\'t sorry. [A small smile.] So I came here to learn how to put people back together after it. Turns out I\'m better at that half.', next: 'start', nextText: 'Me too, maybe.', onEnter: (c) => c.addRel(3, true) },
    },
  });

  /* ============================== BO KAMINSKI ============================== */
  T('d_bo', {
    entry: 'start',
    nodes: {
      start: {
        text: (c) => (c.firstTime ? 'Initiate! You\'ve got the look. The "I jumped off a roof yesterday and I\'d do it again" look. I\'m Bo.' : 'There they are!'),
        choices: (c) => [
          { text: 'People say you run a zip line.', to: 'zip', if: () => !DV.Quests.started('zip_line') && c.day() >= 4 && c.day() <= 5 },
          { text: 'When are we going?', to: 'when', if: () => DV.Quests.obj('zip_line', 'meet') === 'active' },
          { text: 'What\'s it like?', to: 'like', once: 'like' },
          { text: 'See you, Bo.', end: true },
        ],
      },
      zip: {
        text: 'People say a lot of things. [Grins.] Tonight. Half past nine, by the Training Passage. We take the train to the Hancock building, we go up a hundred floors, and then we come down a lot faster than that. Members only. And you. Interested?',
        choices: [
          { text: 'Absolutely.', to: 'yes', effect: () => { DV.Quests.start('zip_line'); DV.Reputation.add('dauntless', 1, true); } },
          { text: 'I\'ve got training in the morning.', to: 'no' },
        ],
      },
      yes: { text: 'That\'s what I like to hear. Half nine. Don\'t be late, the train isn\'t.', endText: 'Half nine.' },
      no: { text: 'Yeah, and you\'ll have training every morning for the rest of your life. Offer\'s open till half nine.', next: 'start', nextText: 'I\'ll think about it.' },
      when: { text: 'Half nine, by the Training Passage. North side of the Pit. Wear something you don\'t mind screaming in.', endText: 'Right.' },
      like: { text: 'Like falling, except somebody planned it. You go so fast the city stops being a city and turns into lights. Best two minutes you\'ll ever have. Every time.', next: 'start', nextText: 'Every time?' },
    },
  });

  /* ============================== the class: a helping hand for the weakest ============================== */
  // shared by Daniel and (if Daniel never came) Joey
  const underdogChoices = (c, id) => [
    { text: 'You don\'t want to fight, do you?', to: 'ud_fight', if: () => under() === id && !DV.Quests.started('hands_up') && c.day() >= 3 },
    { text: 'Bags tonight? After dinner.', to: 'ud_tonight', if: () => under() === id && DV.Quests.obj('hands_up', 'train') === 'active' },
    { text: 'Is Josh giving you trouble?', to: 'ud_josh', if: () => under() === id && !DV.Quests.started('bad_blood') && c.day() >= 3 && I().here('d_josh') },
  ];
  const underdogNodes = (who) => ({
    ud_fight: {
      text: who === 'd_daniel'
        ? '[He studies his hands, bandaged across the knuckles.] I\'ve never hit anyone. Not once in my life. We don\'t — at home, you don\'t. And on Day Four they\'re going to put me in that ring and I\'m going to stand there and apologise until somebody knocks me down.'
        : '[Joey laughs, then doesn\'t.] I\'m big, right? Everybody thinks big means… But I don\'t like it. Hitting. I\'ve never liked it. Dauntless-born and I can\'t throw a punch. My dad\'s going to be in the crowd.',
      choices: [
        { text: 'Then let me show you. Evenings, at the bags. Nobody watching.', to: 'ud_yes', effect: () => DV.Quests.start('hands_up') },
        { text: 'Everybody\'s scared. You\'ll be fine.', to: 'ud_fine' },
      ],
    },
    ud_yes: {
      text: who === 'd_daniel' ? 'You — would you? [Abnegation pours out of him: he almost refuses on reflex. Then:] Yes. Please. After dinner. Thank you. I\'ll — I\'ll try not to apologise.' : 'Seriously? After dinner? Yeah. Yeah! Okay. Don\'t laugh at me. Laugh a little.',
      endText: 'After dinner, then.',
      onEnter: (c) => { DV.Quests.setObj('hands_up', 'ask', 'done', 'You offered to train ' + underName() + ' in the evenings.'); DV.Quests.activate('hands_up', 'train'); c.addRel(8, true); },
    },
    ud_fine: { text: 'Sure. [He doesn\'t believe you either.]', endText: '...', onEnter: (c) => c.addRel(-2, true) },
    ud_tonight: { text: (c) => (c.after('20:00') && c.before('22:00') ? 'Now? Yes. I\'ll — I\'ll be at the bags. Give me a minute.' : 'After dinner. Eight o\'clock, the bags. I\'ll be there. I\'ll be there early.'), endText: 'See you there.', onEnter: () => DV.StageOne && DV.StageOne.underdogToBags() },
    ud_josh: {
      text: who === 'd_daniel'
        ? '[A flinch he tries to turn into a shrug.] He calls me "Stiff". Knocks my tray. Last night somebody put my mattress in the shower. It\'s fine. It\'s nothing. In Abnegation you\'re taught that being humiliated is a small price for —' : '[He rubs his ribs.] He keeps "accidentally" walking into me. Three times today. Big guy, Josh. I\'m bigger. Doesn\'t matter, does it? You have to want to.',
      choices: [
        { text: 'It\'s not nothing. I\'ll deal with him.', end: true, effect: () => DV.StageOne && DV.StageOne.startBadBlood() },
        { text: 'Keep your head down. It\'ll pass.', end: true, effect: (c) => { c.addRel(-3, true); DV.StageOne && DV.StageOne.startBadBlood(true); } },
      ],
    },
  });

  /* ============================== DANIEL WEBB ============================== */
  T('d_daniel', {
    entry: 'start',
    nodes: Object.assign({
      start: {
        text: (c) => {
          if (!c.mem('met_compound')) {
            c.setMem('met_compound');
            if (c.flag('daniel_convinced')) return '[He stares at you, and then he laughs — once, surprised out of him.] You. You talked me into my test, and then I walked past the stones and chose the coals and I thought, well, at least nobody I know will see me die. And here you are.';
            return 'Oh — hello. Daniel. Webb. Abnegation — I mean. Not anymore. I don\'t know what to call myself yet.';
          }
          if (c.after('20:00') && c.before('22:00') && DV.Quests.obj('hands_up', 'train') === 'active') return 'Hands up, right? Hands up.';
          return c.greet({ first: 'Hello.', again: U.pick(['Hello again.', 'Oh — hi.', 'Hi. Sorry. Hi.']), friend: 'Hey! You.' });
        },
        choices: (c) => underdogChoices(c, 'd_daniel').concat([
          { text: 'Why did you choose Dauntless?', to: 'why', once: 'why' },
          { text: 'Have you talked to your family?', to: 'family', once: 'family', if: () => c.day() >= 3 },
          { text: 'How are you holding up?', to: 'how' },
          { text: 'See you.', end: true },
        ]),
      },
      why: { text: (c) => (c.flag('daniel_convinced') ? 'Because of what you said, on Aptitude Day. That I could be afraid and do it anyway. I wanted to find out if that was true about me. [Small smile.] Jury\'s out.' : 'I don\'t know. Because I was so afraid of it. Because every day in grey I was a little bit afraid, and I wanted to be afraid of something big instead, all at once.'), next: 'start', nextText: 'That makes sense.', onEnter: (c) => c.addRel(3, true) },
      family: { text: 'Visiting Day isn\'t until Stage Two. My father won\'t come. He\'ll want to. He won\'t, because it would be selfish. [He swallows.] That\'s Abnegation. You love someone exactly enough not to visit them.', next: 'start', nextText: 'I\'m sorry, Daniel.', onEnter: (c) => c.addRel(3, true) },
      how: {
        text: (c) => {
          const t = I().st().training.d_daniel || 0;
          if (t >= 2) return 'Better. Honestly better. I hit the bag and it moved and I didn\'t say sorry to it. That\'s progress, Josh would say. Josh would say something worse.';
          const { r, n } = rankLine();
          return 'I\'m ' + I().ordinal(I().rankOf('d_daniel')) + '. Out of ' + n + '. [He makes himself say it.] Below the line. Everyone can count.';
        },
        next: 'start', nextText: '...',
      },
    }, underdogNodes('d_daniel')),
  });

  /* ============================== JOEY BRENNAN ============================== */
  T('d_joey', {
    entry: 'start',
    nodes: Object.assign({
      start: {
        text: (c) => (c.firstTime ? 'Hey! Hey. Joey. We were at the testing place — I was the one laughing too loud. I do that. Welcome to the Pit! It\'s louder than it looks.' : c.greet({ first: 'Hey!', again: U.pick(['Hey!', 'Oh, hey!', 'Hi! You eaten?']), friend: 'Buddy!' })),
        choices: (c) => underdogChoices(c, 'd_joey').concat([
          { text: 'Getting a tattoo?', to: 'ink', if: () => !c.flag('joey_ink') && !c.flag('joey_inked'), once: 'ink' },
          { text: 'What\'s it like growing up here?', to: 'grow', once: 'grow' },
          { text: 'Catch you later.', end: true },
        ]),
      },
      ink: {
        text: 'Ha! Ha. Yes. Absolutely. I\'m going to. [He has gone the colour of the rock.] I\'ve been going to for three years. It\'s the needles. Everybody here has a hundred. I see one and I go — [he mimes going down like a tree]. Would you — if I went to Nina\'s, would you come? Catch me, maybe?',
        choices: [
          { text: 'I\'ll come. I\'ll even catch you.', end: true, effect: (c) => { c.setFlag('joey_ink'); c.addRel(5, true); if (!DV.Quests.started('ink')) DV.Quests.start('ink'); DV.UI.notify('Joey will meet you at Nina\'s tattoo parlour.', 'info'); } },
          { text: 'You\'re on your own there, Joey.', to: 'ink_no' },
        ],
      },
      ink_no: { text: 'Yeah. Yeah, no, that\'s fair. That\'s fair.', next: 'start', nextText: 'Sorry.', onEnter: (c) => c.addRel(-2, true) },
      grow: { text: 'Loud! Everything\'s loud. I learned to swim in the river under the chasm — don\'t tell anyone, it\'s not allowed. My mum works the fence. My dad\'s in the armoury with Ike. Everyone\'s family here. Even you, now, sort of. If you make it. [Beat.] You\'ll make it.', next: 'start', nextText: 'Thanks, Joey.', onEnter: (c) => c.addRel(3, true) },
    }, underdogNodes('d_joey')),
  });

  /* ============================== NATE RUSSO ============================== */
  T('d_nate', {
    entry: 'start',
    nodes: {
      start: {
        text: (c) => {
          if (!c.mem('met_compound')) {
            c.setMem('met_compound');
            const q = DV.State.data.quests.initiation;
            if (q && q.outcome === 'stolen') return 'THE COFFEE THIEF! [He hugs you before you can stop him.] I told you! I said, that one\'s Dauntless, they just don\'t know it yet! ' + (c.flag('first_jumper') ? 'And then you jumped FIRST. I\'m never forgiving you for that.' : '');
            if (q && q.outcome === 'asked') return 'Huh. The one who asked permission. [He grins anyway.] Didn\'t think you\'d make the roof. Glad you did.';
            return 'Hey — you were at the Testing Center! The neutral clothes! ' + (c.flag('first_jumper') ? 'And now you\'re the FIRST JUMPER. Who ARE you?' : 'Welcome to the best place in the city.');
          }
          return c.greet({ first: 'Hey!', again: U.pick(['Hey!', 'What\'s up?', 'You!']), friend: 'My favourite transfer!' });
        },
        choices: (c) => [
          { text: 'What was it like, growing up here?', to: 'grow', once: 'grow' },
          { text: 'Josh is trouble.', to: 'josh', if: () => DV.Quests.isActive('bad_blood') && !c.flag('ally_nate') },
          { text: 'Spar with me? Just practice.', to: 'spar', if: () => evening(c) && !c.mem('spar_d' + c.day()) },
          { text: 'You going on Bo\'s zip line?', to: 'zip', if: () => DV.Quests.started('zip_line') && !DV.Quests.isDone('zip_line'), once: 'zip' },
          { text: 'Later, Nate.', end: true },
        ],
      },
      grow: { text: 'Best. Childhood. Ever. Jumped my first train at eight. Broke my arm at eight and a half. Learned to shoot before I could read properly. [He looks at the chasm, quieter.] My brother went over the railing when I was ten. Not an accident, not a dare. So. I don\'t sit on it. Ever.', next: 'start', nextText: 'I\'m sorry, Nate.', onEnter: (c) => c.addRel(5, true) },
      josh: {
        text: '[His whole face changes.] Josh is a walking bruise looking for a face to happen to. If he comes at you — at anyone — come and get me. I mean it. I\'m in bunk one, north side.',
        choices: [
          { text: 'I will. Thanks, Nate.', end: true, effect: (c) => { if (c.rel() >= 8) c.setFlag('ally_nate'); c.addRel(3, true); } },
          { text: 'I can handle it.', end: true, effect: (c) => c.addRel(1, true) },
        ],
      },
      spar: { text: 'Ha! Yes! Bags, not faces — Mark\'d kill us. [Ten minutes of the two of you trading combinations on the heavy bags until your arms burn.] You\'re getting it. Your feet are still dumb.', endText: 'My feet are fine.', onEnter: (c) => { c.setMem('spar_d' + c.day()); DV.Stats.practice('melee', 2); c.addRel(4, true); DV.Clock.skip(20); } },
      zip: { text: 'Am I GOING? I\'ve been going since I was twelve. Bo just doesn\'t know it. Half nine. I\'ll scream louder than you.', next: 'start', nextText: 'We\'ll see.' },
    },
  });

  /* ============================== KAT MALONE ============================== */
  T('d_kat', {
    entry: 'start',
    nodes: {
      start: {
        text: (c) => (c.firstTime ? '[She looks you over, unimpressed and not unkind.] Kat. You were at the Testing Center. You\'re the one Nate won\'t shut up about.' : c.greet({ first: 'Hey.', again: U.pick(['Hey.', 'Mm.', 'What?']), friend: 'Hey, you.' })),
        choices: (c) => [
          { text: 'Any advice for the ring?', to: 'ring', once: 'ring' },
          { text: 'You and Nate — family?', to: 'nate', once: 'nate' },
          { text: 'Josh is coming after people.', to: 'josh', if: () => DV.Quests.isActive('bad_blood') && !c.flag('ally_kat') },
          { text: 'Where are you on the board?', to: 'board', if: () => !!I().st().posted },
          { text: 'See you.', end: true },
        ],
      },
      ring: { text: 'Watch their shoulders, not their hands. The shoulder goes before the fist does. And when you\'re tired — and you will be — back off, block, breathe. Tired people throw big slow things. Make them.', next: 'start', nextText: 'Shoulders. Got it.', onEnter: (c) => { c.addRel(3, true); DV.Stats.practice('melee', 0.5); } },
      nate: { text: 'Our mums were in the same initiate class. I\'ve been pulling him off railings since we were four. [Eye-roll that is mostly affection.] He\'s an idiot. He\'s my idiot. Hurt him and I\'ll find you.', next: 'start', nextText: 'Noted.' },
      josh: {
        text: '[She doesn\'t look surprised.] Yeah. Saw him at the railing last night with his two shadows, measuring the drop with his eyes. People like Josh want an audience. Don\'t give him one alone.',
        choices: [
          { text: 'Will you have my back?', end: true, effect: (c) => { if (c.rel() >= 10) { c.setFlag('ally_kat'); DV.UI.notify('Kat Malone will look out for you.', 'info'); } else DV.UI.notify('Kat shrugs. You haven\'t earned that yet.', 'info'); } },
          { text: 'Thanks for the warning.', end: true, effect: (c) => c.addRel(2, true) },
        ],
      },
      board: { text: (c) => { const r = I().rankOf('d_kat'); return I().ordinal(r) + '. ' + (r <= 2 ? 'And Ella\'s ahead of me. For now.' : 'Which is fine. Which is not fine.'); }, next: 'start', nextText: '...' },
    },
  });

  /* ============================== ELLA YOUNG ============================== */
  T('d_ella', {
    entry: 'start',
    nodes: {
      start: {
        text: (c) => (c.firstTime ? 'Ella. [A handshake, brief and exact.] Called first at the ceremony. I intend to keep the habit.' : c.greet({ first: 'Hello.', again: 'Hello.', friend: 'Oh. Hello.', cold: 'Mm.' })),
        choices: (c) => [
          { text: 'You\'re top of the board.', to: 'top', if: () => !!I().st().posted && I().rankOf('d_ella') === 1 },
          { text: 'I\'m ahead of you.', to: 'behind', if: () => !!I().st().posted && I().rankOf('player') < I().rankOf('d_ella') },
          { text: 'Do you think the cut is fair?', to: 'fair', once: 'fair' },
          { text: 'Good luck.', end: true },
        ],
      },
      top: { text: 'I\'m aware. [Not smug — informational.] I\'ve been training for this since I was six. It would be embarrassing to be anywhere else.', next: 'start', nextText: 'Sure.' },
      behind: { text: '[A pause.] Yes. You are. [She looks at you properly for the first time.] Well done. It won\'t last. But well done.', next: 'start', nextText: 'We\'ll see.', onEnter: (c) => c.addRel(4, true) },
      fair: { text: 'Fair to whom? It\'s fair to the faction. A Dauntless who can\'t fight is a Dauntless who gets someone killed on the fence. [She glances, once, at ' + underName() + '.] I\'m not cruel. I just know how counting works.', next: 'start', nextText: 'That\'s cold.', onEnter: (c) => c.addRel(-1, true) },
    },
  });

  /* ============================== JOSH MILLER ============================== */
  T('d_josh', {
    entry: 'start',
    nodes: {
      start: {
        text: (c) => {
          if (c.firstTime) return 'Oh, it\'s the neutral one. From the Testing Center. [Booming laugh, too loud for the room.] Look at you in black. Like a kid in their dad\'s jacket. I\'m kidding! Honesty. Candor thing. You\'ll get used to it.';
          if (c.flag('josh_backed_off')) return '[He doesn\'t meet your eyes.] What.';
          return U.pick(['What do you want?', 'Look who it is.', 'Help you with something?']);
        },
        choices: (c) => [
          { text: 'Leave ' + underName() + ' alone.', to: 'leave', if: () => DV.Quests.isActive('bad_blood') && !c.flag('josh_confronted') },
          { text: 'What\'s your problem, Josh?', to: 'problem', once: 'problem' },
          { text: 'You were Candor. What happened to "honest"?', to: 'candor', once: 'candor' },
          { text: 'Nothing.', end: true },
        ],
      },
      leave: {
        text: '[Marcus and Bryce drift closer.] Or what? You\'ll tell Mark? Mark can\'t do anything. Dana won\'t. [He leans in.] Bottom two goes factionless. I\'m not going factionless. Somebody else is. Might as well be the one who cries.',
        choices: [
          { text: '[STRENGTH 7] Touch him again and you\'ll find out how deep the chasm is.', check: { attr: 'strength', dc: 7 }, to: 'str_ok', fail: 'str_fail' },
          { text: '[CHARISMA 6] You\'re scared of the bottom two. Everyone is. Fight the board, not him.', check: { attr: 'charisma', dc: 6 }, to: 'cha_ok', fail: 'cha_fail' },
          { text: 'You\'re a coward, Josh.', to: 'insult' },
          { text: '...Forget it.', end: true },
        ],
      },
      str_ok: { text: '[For a second something flickers — he measures you, and doesn\'t like the number.] ...Whatever. He\'s not worth it anyway. [He walks off. Bryce follows. Marcus doesn\'t, for a moment — he\'s watching you, recalculating.]', endText: '...', onEnter: (c) => { c.setFlag('josh_backed_off'); c.setFlag('josh_confronted'); c.setFlag('josh_targets_you'); DV.Stats.practice('intimidation', 2); DV.Quests.log('bad_blood', 'You faced Josh down. He backed off ' + underName() + ' — and started watching you instead.'); } },
      str_fail: { text: '[He laughs right in your face.] You? Look at your arms. [He shoves you, hard, into the wall. Bryce laughs a beat late.] Go to bed, transfer.', endText: '...', onEnter: (c) => { c.setFlag('josh_confronted'); c.setFlag('josh_targets_you'); DV.Game.rig.shake = 0.3; DV.Audio.play('punch', { volume: 0.6 }); } },
      cha_ok: { text: '[It lands. You see it land.] ...Shut up. [But he doesn\'t say anything else, and later you notice he isn\'t at ' + underName() + '\'s table anymore.]', endText: '...', onEnter: (c) => { c.setFlag('josh_backed_off'); c.setFlag('josh_confronted'); c.setFlag('josh_shamed'); c.setFlag('josh_targets_you'); DV.Stats.practice('persuasion', 2); DV.Quests.log('bad_blood', 'You talked Josh down in front of his friends. He won\'t forgive that.'); } },
      cha_fail: { text: 'Oh, a speech! Did they teach you that in your little grey — or whatever — house? [Bryce laughs.] Nice try.', endText: '...', onEnter: (c) => c.setFlag('josh_confronted') },
      insult: { text: '[The room goes quiet around you.] Say that again. [You don\'t have to; he heard. He smiles.] Okay. Okay. We\'ll see who\'s a coward.', endText: '...', onEnter: (c) => { c.setFlag('josh_confronted'); c.setFlag('josh_targets_you'); c.addRel(-10, true); DV.Reputation.add('dauntless', 1, true); } },
      problem: { text: 'My problem? I don\'t have a problem. I\'m the only one here who says it out loud: half this room doesn\'t belong. Stiffs. Crybabies. People who chose black because they liked the jackets. [Shrugs.] Somebody has to say it.', next: 'start', nextText: 'Right.' },
      candor: { text: 'Honest? I am honest. I\'m the most honest person in this pit. [He laughs.] Honest doesn\'t mean nice. In Candor they just never let you find that out.', next: 'start', nextText: 'That\'s convenient.' },
    },
  });

  DV.DauntlessDesigns = DESIGNS;
})();
