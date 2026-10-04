/* ==========================================================================
   DIVERGENT — Claire Dawson (Tier 3): briefing, serum, results
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const T = (id, tree) => DV.DialogueDB.add(id, tree);
  const bye = { text: 'Goodbye.', end: true };

  const FLAVOR = {
    abnegation: 'Every time the simulation gave you a way to protect yourself, you used it to protect someone else.',
    dauntless: 'You moved toward danger, not away from it. When you were afraid, you acted anyway.',
    erudite: 'You studied every situation before you touched it. You looked for the mechanism behind the threat.',
    candor: 'When a lie would have been easier, you told the truth — even to people who weren\'t real.',
    amity: 'You kept looking for the path where no one got hurt. Over and over, even when it was hard to find.',
  };
  const listNames = (arr) => {
    const n = arr.map((f) => DV.Factions.name(f));
    if (n.length <= 1) return n.join('');
    return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  };
  const finish = (c) => {
    if (c.flag('results_discussed')) return;
    DV.Aptitude.finalizeRecord();
    c.setFlag('results_discussed');
    c.give('result_slip');
    c.setObj('aptitude_day', 'results', 'done', c.divergent()
      ? 'Claire told you your result was inconclusive — "Divergent" — and recorded it manually as ' + DV.Factions.name(c.recorded()) + '. You must tell no one.'
      : 'Claire told you your result: ' + DV.Factions.name(c.result()) + '.');
    c.completeQuest('aptitude_day', c.divergent() ? 'divergent' : c.result());
    if (DV.Game && DV.Game.showCompletionAfterTalk) DV.Game.showCompletionAfterTalk();
  };

  T('claire', {
    entry: [
      { if: (c) => DV.State.data.aptitude.status === 'complete' && !c.flag('results_discussed'), node: 'results' },
      { if: (c) => c.flag('results_discussed'), node: 'after' },
      { if: (c) => !c.flag('tr4_open'), node: 'early' },
      { if: (c) => !c.mem('briefed'), node: 'brief' },
      { node: 'ready' },
    ],
    nodes: {
      early: {
        text: 'Oh! You\'re — not due yet, I think. Room Four isn\'t quite ready. Go on back to the hall; they\'ll call you over the speakers. [A small, distracted smile.] Try to eat something.',
        end: true,
      },
      brief: {
        text: (c) => '{name}? Come in, come in. I\'m Claire Dawson — I\'ll be administering your test. [She checks a clipboard, then looks at you properly.]' +
          (c.outfit() === 'neutral' ? ' You\'re in candidate greys. Not many do that.' : ' ' + DV.Factions.name(c.outfit()) + ' colors. Proud of them?'),
        onEnter: (c) => {
          c.setMem('briefed', true);
          if (c.qObj('aptitude_day', 'report') === 'active') c.setObj('aptitude_day', 'report', 'done');
          c.setObj('aptitude_day', 'technician', 'done', 'Met your technician, Claire Dawson, in Testing Room 4.');
        },
        next: 'ready_q', nextText: 'Nice to meet you.',
      },
      ready_q: {
        text: 'Ask me anything you like. There\'s no clock in here — whatever the speakers say.',
        choices: [
          { text: 'What happens now?', to: 'how' },
          { text: 'Can I fail?', to: 'fail' },
          { text: 'What\'s actually in the serum?', check: { attr: 'intelligence', dc: 6 }, to: 'serum', once: 'serum' },
          { text: 'You seem nervous.', check: { attr: 'perception', dc: 6 }, to: 'nervous', once: 'nervous' },
          { text: 'Were you always Erudite?', to: 'amityborn', once: 'amity' },
          { text: 'What is Protocol D?', to: 'pd', if: (c) => (c.qStarted('protocol_d') || c.flag('read_envelope')) && !c.mem('askedPD') },
          { text: 'I\'m ready.', to: 'go' },
          { text: 'Not yet. I need a minute.', to: 'notyet' },
        ],
      },
      ready: {
        text: (c) => c.greet({ first: 'Whenever you\'re ready.', again: 'Back again? Whenever you\'re ready — the chair is waiting.', friend: 'Hello again, {name}. No rush.', helped: 'No rush. Truly.' }),
        choices: [
          { text: 'I have some questions first.', to: 'ready_q' },
          { text: 'I\'m ready.', to: 'go' },
          bye,
        ],
      },
      how: { text: 'You sit in that chair. I give you an injection — a small one, sorry, it stings. Then you\'ll be in a simulation. It will feel completely real. It isn\'t. When it ends, you wake up here and we talk.', next: 'ready_q', nextText: 'Okay.' },
      fail: { text: 'No. You can\'t fail. You can only be... read. The test shows which faction your choices lean toward. It does not choose for you. Tomorrow you choose. [Firmly.] Remember that, whatever happens in there.', next: 'ready_q', nextText: 'I\'ll remember.' },
      serum: {
        text: 'A neural sensitizer and a scenario seed. It stimulates the amygdala and the hippocampus, feeds the readings to that console, and adapts the scenario in real time. You\'ll metabolize it within the hour. [She tilts her head.] Most candidates ask what the right answer is. Not what\'s in the needle.',
        onEnter: (c) => { c.setMem('knowsSerum', true); c.addRel(4); c.setFlag('knows_serum'); },
        next: 'ready_q', nextText: 'There isn\'t a right answer?',
      },
      nervous: {
        text: '[A small laugh.] Do I? Room Four has a... reputation this week. The Director likes to watch it. [Her eyes flick to the mirrored wall, then back.] Don\'t worry about that. Worry about nothing. That\'s my professional advice.',
        onEnter: (c) => { c.setFlag('claire_hinted'); c.addRel(2); },
        next: 'ready_q', nextText: '...Okay.',
      },
      amityborn: { text: 'Amity-born. Orchards, songs, sticky fingers. I transferred because I wanted to understand why people are the way they are. Now I spend my days watching sixteen-year-olds dream. [She smiles.] It\'s not so far from orchards.', onEnter: (c) => c.addRel(3), next: 'ready_q', nextText: 'That\'s nice.' },
      pd: {
        text: '[She freezes, the clipboard halfway to the desk.] Where — no. Don\'t answer that. Not in here. [She glances at the mirror.] Ask me later. If there is a later.',
        onEnter: (c) => { c.setMem('askedPD', true); c.setFlag('asked_claire_pd'); },
        next: 'ready_q', nextText: '...',
      },
      notyet: { text: 'Of course. Take whatever time you need. I\'ll be right here.', end: true },
      go: { text: 'Then sit in the chair when you\'re ready. Lean back. I\'ll do the rest.', onEnter: (c) => c.activate('aptitude_day', 'simulation'), end: true },

      /* ---------------------------- results ---------------------------- */
      results: {
        text: (c) => (c.divergent() || c.result() === 'inconclusive'
          ? '[You open your eyes. The ceiling. The console\'s hum. Claire isn\'t looking at you — she is staring at the screen, tapping a key. Then another. She glances at the mirrored wall.] ...Don\'t sit up yet. Listen to me very carefully.'
          : '[You open your eyes. The ceiling. The hum of the console. Claire is watching you, a stylus pressed to her lip.] Welcome back. Take your time. [She reads the screen.] ...Your result is ' + DV.Factions.name(c.result()) + '.'),
        choices: (c) => (c.divergent() || c.result() === 'inconclusive'
          ? [{ text: 'What\'s wrong?', to: 'd1' }, { text: 'Is something broken?', to: 'd1' }]
          : [{ text: DV.Factions.name(c.result()) + '?', to: 'r_explain' }]),
      },
      r_explain: {
        text: (c) => (FLAVOR[c.result()] || '') + ' That\'s what the simulation saw.',
        choices: [
          { text: 'That sounds right.', to: 'r_accept' },
          { text: 'I\'m not sure that\'s me.', to: 'r_doubt' },
          { text: 'Can I still choose something else?', to: 'r_choose' },
        ],
      },
      r_accept: { text: 'Then you walk into tomorrow knowing something true about yourself. Most people don\'t get that.', next: 'r_slip', nextText: '...' },
      r_doubt: { text: 'It\'s a reading, not a verdict. The simulation sees what you do under pressure. You are more than pressure.', next: 'r_slip', nextText: '...' },
      r_choose: { text: 'Yes. Always. The test is a guide. Tomorrow is a choice. Faction before blood, they say — but the choice comes before both.', next: 'r_slip', nextText: '...' },
      r_slip: {
        text: 'Here — your result slip. Go get some water. And {name}... well done.',
        onEnter: finish,
        choices: [
          { text: 'Thank you, Claire.', end: true },
          { text: 'What did you see me do in there?', to: 'saw' },
        ],
      },
      saw: {
        text: (c) => {
          const h = DV.Aptitude.highlights(3);
          return h.length ? 'I saw you ' + h.join('; I saw you ') + '. [She smiles.] The rest is yours to remember.' : 'More than I can say in one breath. The rest is yours to remember.';
        },
        end: true,
      },
      d1: {
        text: (c) => 'Your results were... inconclusive. You showed aptitude for ' + listNames(DV.State.data.aptitude.results) + '. Equally. That doesn\'t happen. It isn\'t supposed to happen.',
        choices: [
          { text: 'What does that mean?', to: 'd2' },
          { text: 'Is that bad?', to: 'd2' },
        ],
      },
      d2: {
        text: '[Barely a whisper.] The word for it is Divergent. You will never say that word aloud. Not to your friends. Not to your family. Not to anyone in this building.',
        onEnter: (c) => c.note('Claire told me the word for my result: Divergent. I must never say it aloud.'),
        choices: [
          { text: 'Why? What\'s wrong with being Divergent?', to: 'd3' },
          { text: 'Protocol D.', to: 'd_pd', if: (c) => c.flag('jenna_knows_pd') || c.has('protocol_file') || c.qDone('protocol_d') },
          { text: 'You\'re scaring me.', to: 'd3' },
        ],
      },
      d3: { text: 'People who don\'t fit in one box are hard to predict. Hard to control. The people who run this city like control very much. That is all I can safely say inside this room.', next: 'd_record', nextText: '...' },
      d_pd: { text: '[She closes her eyes.] So you\'ve seen it. Then you know exactly why I\'m about to do what I\'m about to do.', onEnter: (c) => c.addTrust(10), next: 'd_record', nextText: '...' },
      d_record: {
        text: (c) => 'I\'m going to enter your result manually. Officially — on paper, in the system, to the Director — you are ' + DV.Factions.name(c.recorded() || DV.State.data.aptitude.results[0]) + '.',
        choices: (c) => {
          const apt = DV.State.data.aptitude;
          const cur = apt.recordedAs || apt.results[0];
          const out = apt.results.filter((f) => f !== cur).map((f) => ({ text: 'Record it as ' + DV.Factions.name(f) + ' instead.', to: 'd_record', effect: () => { apt.recordedAs = f; } }));
          out.push({ text: 'Why are you protecting me?', to: 'd_why' });
          out.push({ text: 'Okay.', to: 'd_final' });
          return out;
        },
      },
      d_why: {
        text: (c) => {
          if (c.mem('insulted')) return 'Not for you. [A beat.] For the last one I didn\'t protect.';
          if (c.mem('knowsSerum')) return 'Because you asked me what was in the serum instead of what the right answer was. People like that should get to keep asking.';
          if (c.rel() >= 15) return 'Because you talked to me like a person, not a machine operator. And because someone did this for me once. A long time ago, in an orchard.';
          return 'Because someone did it for me once. A long time ago, in an orchard.';
        },
        next: 'd_final', nextText: '...',
      },
      d_final: {
        text: 'Go out the way you came. Act tired. Bored. Everyone is, afterward. And if the Director asks you anything — anything — you\'re {recorded}, you felt dizzy, and you can\'t remember much.',
        onEnter: finish,
        choices: [
          { text: 'Thank you, Claire.', end: true },
          { text: 'If anyone comes for you because of this, I\'ll help.', check: { attr: 'charisma', dc: 7 }, to: 'd_ally' },
          { text: 'Will you be okay?', to: 'd_okay' },
        ],
      },
      d_ally: { text: '[Her eyes shine for a second.] ...Then we\'ll both be very careful. Go.', onEnter: (c) => { c.addRel(10); c.setFlag('claire_ally'); }, end: true },
      d_okay: { text: 'Ask me tomorrow. [She tries to smile.] Go.', end: true },

      /* ---------------------------- after ---------------------------- */
      after: {
        text: (c) => c.greet({ first: 'How are you holding up?', again: 'How are you holding up?', friend: 'There you are. How are you holding up?' }),
        choices: [
          { text: 'What happens tomorrow?', to: 'ceremony' },
          { text: 'What else can you tell me about... my result?', to: 'div_more', if: (c) => c.divergent() },
          { text: 'Who else knows?', to: 'div_who', if: (c) => c.divergent() },
          { text: 'Do results ever surprise you?', to: 'surprise', if: (c) => !c.divergent() },
          { text: 'What is Protocol D?', to: 'pd_after', if: (c) => c.flag('asked_claire_pd') && !c.mem('pdAfter') },
          { text: 'Tell me about Amity.', to: 'amityborn2' },
          bye,
        ],
      },
      ceremony: { text: 'The Choosing Ceremony at the Hub. Five bowls: stones, water, glass, earth, coals. A knife. A drop of your blood in the bowl you choose. Faction before blood, they say — but it\'s your blood. Remember whose it is.', next: 'after', nextText: 'I will.' },
      div_more: { text: 'Not here. Not today. [She lowers her voice.] Be ordinary. Be boring. Don\'t let anyone see you do anything... twice. Some factions will be safer for you than others. I can\'t tell you which.', next: 'after', nextText: '...' },
      div_who: { text: 'You. Me. Whoever you choose to tell. Choose very, very carefully.', next: 'after', nextText: 'I will.' },
      surprise: { text: 'Every day. A Dauntless boy who held the dog\'s head in his lap. A Candor girl who lied beautifully for a stranger. People are never just one thing. The test only has to pretend they are.', next: 'after', nextText: '...' },
      pd_after: {
        text: (c) => (c.divergent()
          ? '[She checks the mirror is dark before she answers.] It\'s the procedure for people like you. Reported, labeled, watched through initiation. I didn\'t report you. That\'s all you need to know.'
          : '[She checks the mirror is dark.] A procedure for results that don\'t fit. You don\'t need to worry about it. Some people do.'),
        onEnter: (c) => c.setMem('pdAfter', true),
        next: 'after', nextText: '...',
      },
      amityborn2: { text: 'I still dream about the orchards. Rows and rows of apple trees, and nobody asking what you are. Only whether you\'re hungry.', next: 'after', nextText: 'That sounds lovely.' },
    },
  });

  // scene used when the player sits in the testing chair
  T('claire_serum', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: 'Claire Dawson', faction: 'erudite',
        text: '[She swabs the inside of your arm with something cold. The syringe is filled with a pale blue liquid.] Deep breath. This will sting, then you\'ll feel very heavy. Don\'t fight it.',
        choices: [
          { text: 'Do it.', to: 'inject' },
          { text: 'Wait — will I remember it?', check: { attr: 'resolve', dc: 5 }, to: 'remember' },
          { text: 'I\'m not ready yet.', end: true, effect: () => { DV.Player.standUp(); } },
        ],
      },
      remember: {
        speaker: 'Claire Dawson', faction: 'erudite',
        text: 'Every second. That\'s the hard part. [Softly.] And the good part.',
        choices: [
          { text: 'Do it.', to: 'inject' },
          { text: 'I\'m not ready yet.', end: true, effect: () => { DV.Player.standUp(); } },
        ],
      },
      inject: {
        speaker: 'Claire Dawson', faction: 'erudite',
        text: '[A sharp pinch. Cold spreads up your arm and into your chest. The mirrored walls begin to soften at the edges.] I\'ll see you on the other side, {name}.',
        choices: [{ text: '...', end: true, effect: () => { DV.Game.beginAptitudeTest(); } }],
      },
    },
  });
})();
