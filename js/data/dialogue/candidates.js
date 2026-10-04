/* ==========================================================================
   DIVERGENT — candidate dialogue trees
   mara (Tier 3), elias (Tier 3), pip (Tier 2), rook (Tier 2)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const T = (id, tree) => DV.DialogueDB.add(id, tree);
  const bye = { text: 'Goodbye.', end: true };

  /* ============================== MARA VOSS ============================== */
  T('mara', {
    entry: [
      { if: (c) => c.qActive('protocol_d') && c.has('protocol_file') && c.qObj('protocol_d', 'report') !== 'done', node: 'pd_report' },
      { if: (c) => c.aptDone() && !c.mem('discussedResult') && c.after('10:52'), node: 'post' },
      { if: (c) => c.mem('insulted') && c.rawRel() < 0, node: 'cold' },
      { if: (c) => c.firstTime, node: 'intro' },
      { node: 'hub' },
    ],
    nodes: {
      intro: {
        text: (c) => (c.outfit() === 'neutral'
          ? 'You look nervous. First aptitude test? [She glances at your plain clothes.] ...And you\'re the one in candidate greys. Bold. Or a disguise.'
          : 'You look nervous. First aptitude test?'),
        choices: [
          { text: 'What happens inside?', to: 'inside' },
          { text: 'You don\'t look nervous.', to: 'notnervous', once: 'notnervous' },
          { text: 'Tell me about Candor.', to: 'candor' },
          { text: 'You\'re hiding something.', check: { attr: 'perception', dc: 6 }, to: 'hiding', once: 'hiding' },
          { text: 'Everyone\'s nervous, genius. It\'s everyone\'s first test.', to: 'rude', tag: 'Rude' },
          bye,
        ],
      },
      inside: { text: 'Nobody knows. That\'s the point — and the problem. They inject you, you dream, and a stranger decides what kind of person you are. Then they tell you you\'re free to ignore it. Which is either generous or a lie.', next: 'hub', nextText: 'Which do you think?' },
      notnervous: { text: 'I am. I just don\'t decorate it. [A beat.] Mara. Mara Voss.', onEnter: (c) => { c.addRel(3); c.setMem('gaveName', true); }, next: 'hub', nextText: '{name}.' },
      candor: { text: 'We say what\'s true. People think that makes us cruel. Mostly it makes us tired. Do you know how much effort everyone else spends lying? It\'s exhausting just to watch.', next: 'hub', nextText: 'I can imagine.' },
      rude: { text: 'Wow. Okay. [She turns back to the status board.] Noted.', onEnter: (c) => { c.addRel(-8); c.insulted(); }, end: true },
      hiding: {
        text: '[Her eyes narrow — then she almost smiles.] Good. Most people only see the clothes. [Quietly.] I overheard something this morning. The Director, to a proctor: "Anything irregular goes under Protocol D." Then they saw me and stopped talking. Grown-ups lower their voices for two reasons: shame and fear. I want to know which. Help me?',
        onEnter: (c) => c.addRel(4),
        choices: [
          { text: 'I\'m in.', to: 'pd_start' },
          { text: 'Why do you care so much?', to: 'pd_why' },
          { text: 'Not interested.', to: 'pd_no' },
        ],
      },
      pd_why: { text: 'Because tomorrow we all choose. And I\'d like to know what we\'re choosing between — not just what they\'ve painted on the doors.', next: 'hiding_again', nextText: 'Fair enough.' },
      hiding_again: {
        text: 'So. Will you help?',
        choices: [
          { text: 'I\'m in.', to: 'pd_start' },
          { text: 'Not interested.', to: 'pd_no' },
        ],
      },
      pd_no: { text: 'Fine. If you change your mind, I\'ll be the one listening at doors.', onEnter: (c) => c.addRel(-1, true), next: 'hub', nextText: '...' },
      pd_start: {
        text: 'Good. Ask around — quietly. Staff who have been here forever hear everything: the custodian, the records keeper. And the Director himself, if you\'re brave or stupid. I\'ll keep my ears open in the hall.',
        onEnter: (c) => { c.startQuest('protocol_d'); c.addRel(5); c.setMem('partner', true); },
        next: 'hub', nextText: 'Quietly. Got it.',
      },
      hub: {
        text: (c) => c.greet({
          first: 'Back again?',
          again: 'Back again?',
          helped: 'I still owe you for earlier. I don\'t forget debts — it\'s a Candor thing.',
          friend: '{name}. Good. Talk to me.',
          cold: 'What.',
        }),
        choices: [
          { text: 'What do you think of the test?', to: 'think', if: (c) => !c.aptDone() },
          { text: 'You seemed to be listening for something earlier.', check: { attr: 'charisma', dc: 5 }, to: 'hiding', if: (c) => !c.qStarted('protocol_d') },
          { text: 'Any leads on Protocol D?', to: 'pd_leads', if: (c) => c.qActive('protocol_d') && !c.has('protocol_file') },
          { text: 'Wren called it "data integrity."', to: 'pd_wren', if: (c) => c.qActive('protocol_d') && c.flag('asked_wren_pd') && !c.mem('heardWren') },
          { text: 'I read something I shouldn\'t have. A list.', to: 'envelope', if: (c) => c.flag('read_envelope') && !c.flag('told_mara_envelope') },
          { text: 'What will you choose tomorrow?', to: 'choose' },
          { text: 'Do you know Elias Thorne?', to: 'elias', if: (c) => c.qActive('cold_feet') },
          { text: 'I\'m sorry about earlier.', to: 'apology', if: (c) => c.mem('insulted') },
          bye,
        ],
      },
      think: { text: 'I think it measures what you do when you think nobody\'s judging. Which is funny, because everybody in here is being judged. Including the people doing the judging.', next: 'hub', nextText: 'Cynical.' },
      pd_leads: { text: 'Gus the custodian hears everything. Ruth Calloway runs the archive and she flinched when I said "Protocol." The Director lowered his voice. Start there. If it\'s written down, it\'s in that archive.', next: 'hub', nextText: 'I\'ll keep looking.' },
      pd_wren: { text: '"Data integrity." [She laughs, once, without humor.] That\'s what people say when they mean "people." Keep going.', onEnter: (c) => { c.setMem('heardWren', true); c.addRel(2); }, next: 'hub', nextText: 'I will.' },
      envelope: {
        text: 'Tell me. Exactly. Don\'t soften it.',
        choices: [
          { text: 'A list of candidates for "additional review under Protocol D." Elias Thorne was on it.', to: 'envelope_truth', tag: 'Truth' },
          { text: 'Actually — never mind. It wasn\'t important.', to: 'envelope_back' },
        ],
      },
      envelope_truth: {
        text: '...Thorne. The Council\'s son. [She goes quiet.] Then it isn\'t about data at all. It\'s about people — and it starts before the test. They expect some of us to come out "irregular." Thank you. For not softening it.',
        onEnter: (c) => {
          c.setFlag('told_mara_envelope');
          c.addRel(8);
          c.addTrust(8);
          c.rep('candor', 2);
          if (c.qActive('protocol_d')) c.activate('protocol_d', 'archive', 'You told Mara about the list. She thinks the answer is in the Records Archive.');
        },
        next: 'hub', nextText: '...',
      },
      envelope_back: { text: '[She stares.] You don\'t start a sentence like that and walk away. ...Fine. When you\'re ready.', onEnter: (c) => c.addRel(-2, true), next: 'hub', nextText: '...' },
      choose: {
        text: (c) => (c.aptDone() && c.mem('sharedHers')
          ? 'Candor. Probably. I like knowing where I stand. Even if I now know the floor isn\'t as solid as they said.'
          : 'Candor, probably. I like knowing where I stand. ...Ask me again after my test.'),
        next: 'hub', nextText: 'I will.',
      },
      elias: { text: 'Council son. Quiet. Treats every word like it costs money. If he\'s scared, it isn\'t of the test — it\'s of disappointing someone. Find out who.', next: 'hub', nextText: 'Good advice.' },
      apology: { text: '[She weighs it.] Accepted. Probationally.', onEnter: (c) => { c.addRel(7); c.setMem('insulted', false); }, next: 'hub', nextText: 'Fair.' },
      cold: {
        text: 'What.',
        choices: [
          { text: 'I\'m sorry about before.', to: 'apology' },
          { text: 'Nothing.', end: true },
        ],
      },
      pd_report: {
        text: 'You found it? [She is already reaching.] Show me.',
        choices: [
          { text: 'Here. Read it yourself.', to: 'pd_read', tag: 'Truth' },
          { text: 'It\'s nothing. Just paperwork.', to: 'pd_lie', tag: 'Lie' },
          { text: 'Some things are safer not knowing. Trust me on this one.', check: { attr: 'charisma', dc: 6 }, to: 'pd_withhold' },
        ],
      },
      pd_read: {
        text: '[She reads it twice. Her jaw tightens on "monitored."] They\'re not measuring us. They\'re sorting us — and some of us get a shadow that follows us into initiation. [She hands it back.] Keep it hidden. And {name}? Thank you for not lying to me. I\'d have known.',
        onEnter: (c) => {
          c.setObj('protocol_d', 'report', 'done', 'You showed Mara the Protocol D file.');
          c.completeQuest('protocol_d', 'shared');
          c.addRel(15);
          c.addTrust(12);
          c.helped();
          c.setFlag('mara_knows_pd');
          c.note('Mara Voss and I found Protocol D: candidates with irregular results are "monitored through initiation."');
        },
        next: 'hub', nextText: 'We\'re in this together now.',
      },
      pd_lie: {
        text: '[She looks at you for a long, unblinking moment.] You\'re lying. You\'re either bad at it or you wanted me to know. Either way — fine. Keep your secrets. I\'ll find it myself.',
        onEnter: (c) => {
          c.addRel(-12);
          c.setMem('caughtLie', true);
          c.practice('deception', 1);
          c.failQuest('protocol_d', 'You lied to Mara about the file. She saw through it.');
        },
        end: true,
      },
      pd_withhold: {
        text: '[A long breath through her nose.] ...Fine. But you owe me the truth someday. I\'m writing that down. Literally — I have a list.',
        onEnter: (c) => {
          c.setObj('protocol_d', 'report', 'done', 'You told Mara you found it, but kept the contents to yourself.');
          c.completeQuest('protocol_d', 'withheld');
          c.addRel(2);
          c.setMem('owedTruth', true);
        },
        next: 'hub', nextText: 'Someday.',
      },
      post: {
        text: (c) => (c.after('10:52') ? 'You\'re out. You look like you\'ve seen a ghost. Was it a ghost? Mine was a courtroom. I won. I think.' : 'You\'re out. You look like you\'ve seen a ghost. Mine hasn\'t happened yet.'),
        onEnter: (c) => c.setMem('discussedResult', true),
        choices: (c) => {
          const out = [];
          if (c.divergent()) {
            out.push({ text: 'My result was... inconclusive.', to: 'post_div', tag: 'Truth' });
            out.push({ text: 'It was {recorded}.', to: 'post_lie', tag: 'Lie', skill: 'deception' });
          } else out.push({ text: 'My result was {result}.', to: 'post_normal' });
          out.push({ text: 'We\'re not supposed to talk about results.', to: 'post_rules' });
          out.push({ text: 'What was yours?', to: 'post_hers', if: () => c.after('10:52') });
          return out;
        },
      },
      post_normal: {
        text: (c) => ({
          abnegation: 'Abnegation. [She tilts her head.] I can see it. You held the door for two people this morning and didn\'t notice you did it.',
          dauntless: 'Dauntless. Huh. You don\'t swagger. That\'s either very good or very bad for them.',
          erudite: 'Erudite. That tracks. You look at rooms like you\'re counting the exits.',
          candor: 'Candor? [A real smile.] Then I\'ll see you at our tables. Bring thick skin.',
          amity: 'Amity. [She considers that seriously.] You do make people less afraid. I hadn\'t put a word to it.',
        }[c.result()] || 'Huh.'),
        next: 'hub', nextText: 'Do you think it fits?',
      },
      post_div: {
        text: '[She goes very still.] ...Inconclusive. Like "irregular." [She glances around the room before she speaks again, low and fast.] Don\'t say that word to anyone else. Not even to me, next time. I mean it, {name}.',
        onEnter: (c) => { c.setFlag('mara_knows_divergent'); c.addTrust(12); c.addRel(5); c.note('I told Mara my result was inconclusive.'); },
        next: 'hub', nextText: 'I won\'t.',
      },
      post_lie: {
        text: (c) => (c.attr('charisma') >= 7 ? '{recorded}. Okay. [She nods slowly.] Okay.' : '[Her eyes flick across your face.] Mm-hm. {recorded}. Sure.'),
        onEnter: (c) => { if (c.attr('charisma') < 7) c.setMem('suspectsResult', true); },
        next: 'hub', nextText: '...',
      },
      post_rules: { text: 'Since when do you follow rules? ...Fine. Fair. I\'m not supposed to want to know, either.', next: 'hub', nextText: '...' },
      post_hers: {
        text: 'Candor. Obviously. [Pause.] It also said Erudite. A little. The technician said "that\'s normal" too quickly. I don\'t think he was being honest. [Dry.] Which is ironic, given his clothes.',
        onEnter: (c) => { c.setMem('sharedHers', true); c.addTrust(6); },
        next: 'hub', nextText: 'Your secret\'s safe.',
      },
    },
  });

  /* ============================== ELIAS THORNE ============================== */
  const eliasConvinced = (style) => (c) => {
    c.setFlag('elias_convinced');
    c.setFlag('elias_style', style);
    c.setObj('cold_feet', 'convince', 'done', {
      gentle: 'You told Elias his father would rather have an honest son than a perfect one. He agreed to test.',
      logic: 'You reasoned with Elias: skipping the test invites exactly the review he fears. He agreed to test.',
      courage: 'You admitted you were scared too. Elias agreed to face the test with you in mind.',
      truth: 'You told Elias his name is on a review list. He decided he would rather be seen walking in.',
      pushed: 'You pushed Elias into going. He went — stiffly.',
    }[style]);
    c.activate('cold_feet', 'after');
    if (style === 'pushed') { c.addRel(-10); c.setMem('pushed', true); c.practice('intimidation', 1); } else { c.addRel(12); c.helped(); c.practice('empathy', 1); }
    if (c.npc) DV.NPCAI.refresh(c.npc, false);
  };
  T('elias', {
    entry: [
      { if: (c) => c.flag('elias_tested') && !c.mem('thanked'), node: 'after' },
      { if: (c) => c.flag('elias_tested'), node: 'after_hub' },
      { if: (c) => c.flag('elias_missed'), node: 'missed' },
      { if: (c) => c.flag('elias_convinced'), node: 'waiting' },
      { if: (c) => c.before('08:45') && !c.qStarted('cold_feet'), node: 'bench' },
      { if: (c) => !c.qStarted('cold_feet'), node: 'found' },
      { node: 'hub' },
    ],
    nodes: {
      bench: {
        text: 'Oh — I\'m sorry, was I in your way? [He makes himself smaller on the bench.]',
        choices: [
          { text: 'Nervous?', to: 'bench_nerv' },
          { text: 'I\'m {name}.', to: 'bench_name', once: 'bname' },
          bye,
        ],
      },
      bench_nerv: { text: 'No. Yes. Abnegation don\'t — it\'s fine. Thank you for asking. Truly.', next: 'bench', nextText: '...' },
      bench_name: { text: 'Elias. Thorne. It\'s — nice to meet you. [He says it like a rule he was taught.]', onEnter: (c) => c.setMem('gaveName', true), next: 'bench', nextText: 'Nice to meet you too.' },
      found: {
        text: '[He\'s crouched in the corner by the stalls, knees drawn up. He startles.] Please — I\'m fine. I\'m just... waiting. Here.',
        onEnter: (c) => { c.startQuest('cold_feet'); },
        choices: [
          { text: 'You don\'t look fine.', to: 'notfine' },
          { text: 'Your test is at 11:30. Hiding won\'t make it go away.', to: 'time' },
          { text: 'Why are you hiding?', to: 'why' },
          { text: 'I\'ll leave you alone.', end: true },
        ],
      },
      notfine: { text: 'Abnegation are always fine. That\'s practically the motto. "Service before self, and also, always fine."', next: 'hub', nextText: '...' },
      time: { text: '[Quietly.] I know when it is. I\'ve known for a week. I\'ve known for sixteen years, really.', next: 'hub', nextText: 'Then why are you here?' },
      hub: {
        text: (c) => (c.flag('elias_reason') ? '[He looks up.] You came back.' : '[He hugs his knees tighter.] ...Yes?'),
        choices: [
          { text: 'Why are you hiding?', to: 'why', if: (c) => !c.flag('elias_reason') },
          { text: 'Willow said you asked if someone could be "disqualified for being wrong."', to: 'reason', if: (c) => c.flag('willow_hint') && !c.flag('elias_reason') },
          { text: 'Your father would rather have an honest son than a perfect one.', check: { attr: 'charisma', dc: 6 }, to: 'conv_gentle', if: (c) => c.flag('elias_reason') },
          { text: 'The test reads tendencies, not loyalty. And skipping it gets you "reviewed" anyway — you\'d be giving them exactly what you fear.', check: { attr: 'intelligence', dc: 6 }, to: 'conv_logic', if: (c) => c.flag('elias_reason') },
          { text: 'I\'m scared too. Everyone goes in scared. That\'s the only way anyone goes in.', check: { attr: 'resolve', dc: 6 }, to: 'conv_courage', if: (c) => c.flag('elias_reason') },
          { text: 'I\'ve seen a list. Your name is on it — "additional review." Hiding won\'t protect you.', to: 'conv_truth', if: (c) => c.flag('elias_reason') && c.flag('read_envelope'), tag: 'Truth' },
          { text: 'Get up. You\'re Abnegation — think of the people waiting on you.', to: 'conv_push', if: (c) => c.flag('elias_reason'), tag: 'Intimidate' },
          { text: 'Then don\'t go. Choose tomorrow without the test.', to: 'dontgo', if: (c) => c.flag('elias_reason') && !c.mem('toldDontGo') },
          { text: 'I\'ll come back.', end: true },
        ],
      },
      why: {
        text: 'I\'m not hiding. I\'m... collecting myself.',
        choices: [
          { text: 'You\'ve been "collecting yourself" for an hour.', check: { attr: 'perception', dc: 5 }, to: 'reason' },
          { text: 'I\'m not going anywhere. You can tell me.', check: { attr: 'charisma', dc: 5 }, to: 'reason' },
          { text: 'Okay. Collect faster.', to: 'pushed_early' },
          { text: 'I\'ll come back later.', end: true },
        ],
      },
      pushed_early: { text: '...Thank you for your concern. [He turns his face to the wall.]', onEnter: (c) => c.addRel(-5), end: true },
      reason: {
        text: '[A long breath.] My father sits on the Council. Everyone knows what our family is supposed to be. If the test says I\'m not Abnegation — if it says anything else — everyone will know I never really was. [Smaller.] And there are rumors. Results that come back "wrong." Candidates who get "reviewed." Whose families stop saying their names.',
        onEnter: (c) => {
          c.setFlag('elias_reason');
          c.setObj('cold_feet', 'find', 'done', 'Elias is hiding because his father is on the Council, and he fears what the test might reveal — and what happens to "wrong" results.');
          c.setObj('cold_feet', 'learn', 'done');
          c.activate('cold_feet', 'convince');
          c.addTrust(5);
        },
        next: 'hub', nextText: '...',
      },
      conv_gentle: { text: '[He is quiet for a long time.] ...He would. He would, wouldn\'t he. He\'d hate that I doubted it. [He wipes his face with his sleeve.] All right. Room Four, eleven-thirty. I\'ll go sit in the hall like a normal person. Thank you, {name}. Truly.', onEnter: eliasConvinced('gentle'), end: true },
      conv_logic: { text: '[He blinks.] ...That\'s — horribly true. If I hide, I\'m the irregular one before the test even starts. [He stands, unsteadily.] All right. Eleven-thirty. Thank you. I think.', onEnter: eliasConvinced('logic'), end: true },
      conv_courage: { text: '[He looks at you as if you\'ve handed him something heavy and warm.] You too? ...All right. If you can, I can. Eleven-thirty. I\'ll be in the hall. Thank you, {name}.', onEnter: eliasConvinced('courage'), end: true },
      conv_truth: { text: '[He goes white.] Then it doesn\'t matter what I do. [Long pause.] ...Or it matters more. If they\'re watching, I\'d rather they see me walk in than drag me out. [He gets up.] Thank you for telling me. Nobody tells me things.', onEnter: (c) => { eliasConvinced('truth')(c); c.addTrust(10); c.setFlag('elias_knows_list'); }, end: true },
      conv_push: { text: '[He flinches like you struck him. Then he stands, very straight.] ...You\'re right. Of course you\'re right. I\'ll go. [He doesn\'t look at you as he passes.]', onEnter: eliasConvinced('pushed'), end: true },
      dontgo: {
        text: '[He stares at you.] ...You can\'t. It\'s mandatory. If I don\'t test, they test me anyway — somewhere worse, with people watching. [Quieter.] But thank you. Nobody\'s ever suggested I had a choice about anything.',
        onEnter: (c) => { c.setMem('toldDontGo', true); c.addRel(3); },
        next: 'hub', nextText: '...',
      },
      waiting: {
        text: (c) => (c.mem('pushed') ? '[He nods once, stiffly.] I\'m here. Eleven-thirty. You can stop checking.' : 'I\'m still here. Eleven-thirty. I keep checking the clock. [A small smile.] The clock keeps checking me back.'),
        choices: [
          { text: 'You\'ll be fine.', to: 'w_fine' },
          { text: 'What will you choose tomorrow?', to: 'w_choose' },
          bye,
        ],
      },
      w_fine: { text: 'Abnegation are always fine. [This time it sounds like a joke.]', next: 'waiting', nextText: 'Ha.' },
      w_choose: { text: 'Abnegation. I think. Or I think I think. Ask me again after.', next: 'waiting', nextText: 'I will.' },
      after: {
        text: (c) => (c.mem('pushed')
          ? '[He looks dazed, but steadier.] I did it. You were right to push me. I didn\'t like it. I\'m glad you did. [Pause.] The technician said "Abnegation." Then she looked at me like she wanted to say more — and didn\'t.'
          : '[He looks dazed, but steadier.] I did it. It was... a room full of people and only one door. I held it open. [Quietly.] The technician — Ashgrove — said "Abnegation." And then she looked at me like she wanted to say more. And didn\'t.'),
        onEnter: (c) => {
          c.setMem('thanked', true);
          c.setObj('cold_feet', 'after', 'done', 'Elias took his test. The technician recorded Abnegation.');
          c.completeQuest('cold_feet', c.mem('pushed') ? 'pushed' : 'supported');
        },
        choices: [
          { text: 'I\'m glad you went.', to: 'after_hub' },
          { text: 'She looked like she wanted to say more?', to: 'after_more' },
        ],
      },
      after_more: { text: 'Like she was deciding something. Then she wrote on her clipboard for a long time. [He shakes his head.] I\'m probably imagining it. I imagine a lot of things.', onEnter: (c) => c.setFlag('elias_maybe_divergent'), next: 'after_hub', nextText: '...' },
      after_hub: {
        text: 'Thank you for today, {name}. Whatever you choose tomorrow — I hope it\'s yours.',
        choices: [
          { text: 'What will you choose?', to: 'after_choose' },
          bye,
        ],
      },
      after_choose: { text: 'Abnegation. Probably. Because I want to, now — not because I\'m afraid not to. That\'s different. You made it different.', next: 'after_hub', nextText: 'Good.' },
      missed: { text: '[He doesn\'t look up.] Noon came and went. They\'ll test me at the Hub now. "Under supervision." [Quietly.] It\'s fine. Abnegation are always fine.', end: true },
    },
  });

  /* ============================== PIP HOLLIS ============================== */
  T('pip', {
    entry: [
      { if: (c) => c.flag('kept_bird'), node: 'kept' },
      { if: (c) => c.has('wooden_bird'), node: 'return' },
      { if: (c) => c.qDone('lost_bird'), node: 'thanks' },
      { if: (c) => c.firstTime || !c.qStarted('lost_bird'), node: 'intro' },
      { node: 'hub' },
    ],
    nodes: {
      intro: {
        text: (c) => (c.firstTime ? 'Oh! Hello! Sorry — you haven\'t seen a little bird, have you? Wooden. About this big. [She holds up a thumb.] It\'s silly. Sorry.' : 'Oh — hello again! Still no bird. Sorry. I keep saying sorry.'),
        choices: [
          { text: 'What kind of bird?', to: 'bird' },
          { text: 'Sorry, I haven\'t.', to: 'no' },
          { text: 'It\'s just a carving. Focus on your test.', to: 'harsh', tag: 'Rude' },
        ],
      },
      no: { text: 'That\'s all right! Thank you for listening. Most people don\'t.', end: true },
      harsh: { text: '...Right. You\'re right. Sorry. [She looks at the floor.]', onEnter: (c) => { c.addRel(-6); c.insulted(); }, end: true },
      bird: {
        text: 'A wren. My grandmother carved it the winter before she passed. She said it would keep me brave. I had it on the bus, and in the lobby, and then at security, and then... I didn\'t.',
        choices: [
          { text: 'I\'ll help you look.', to: 'start' },
          { text: 'Have you asked the staff?', to: 'staff' },
        ],
      },
      staff: { text: 'I don\'t want to be a bother. Everyone\'s so busy being important today.', next: 'start', nextText: 'I\'ll help you look.' },
      start: {
        text: 'You would? Oh — thank you. Thank you! I\'ll look in the hall. You could... look everywhere else? Is that too much? That\'s too much.',
        onEnter: (c) => { c.startQuest('lost_bird'); c.addRel(6); },
        next: 'hub', nextText: 'It\'s fine. I\'ll find it.',
      },
      hub: {
        text: (c) => c.greet({ first: 'Any luck? Don\'t worry if not.', again: 'Any luck? Don\'t worry if not. It\'s only a bird.', friend: 'Hello, friend!', cold: '...Hello.' }),
        choices: [
          { text: 'Where did you last have it?', to: 'last' },
          { text: 'You emptied your pockets at security? Then someone swept it up.', check: { attr: 'perception', dc: 5 }, to: 'insight', if: (c) => c.mem('heardLast') && c.qObj('lost_bird', 'storage') === 'hidden' },
          { text: 'Nervous about the test?', to: 'nervous', if: (c) => !c.aptDone() },
          { text: 'Tell me about Amity.', to: 'amity' },
          bye,
        ],
      },
      last: { text: 'In the lobby, by the kiosk. Then I went through security — the guard made me empty my pockets into a tray — and then I was so flustered checking in that... I don\'t know.', onEnter: (c) => c.setMem('heardLast', true), next: 'hub', nextText: 'Hm.' },
      insight: { text: 'Swept — the custodian! Gus! He sweeps up everything. Oh — I\'d never dare ask him. He looks like a bear that\'s tired of bees.', onEnter: (c) => { c.activate('lost_bird', 'storage', 'Pip emptied her pockets at security. The custodian, Gus, sweeps up everything — and keeps it in the storage room.'); c.xp(10); }, next: 'hub', nextText: 'I\'ll ask him.' },
      nervous: { text: 'Terrified! But Amity say fear is just excitement that forgot to breathe. So I\'m breathing. Very loudly. Sorry.', next: 'hub', nextText: 'Keep breathing.' },
      amity: { text: 'Orchards and long tables and everyone talking at once. We settle arguments with songs. Well — we try. Sometimes the songs become arguments.', next: 'hub', nextText: 'Sounds nice.' },
      return: {
        text: '[Her eyes go wide.] You found it! You — that\'s it, that\'s really it!',
        choices: [
          { text: 'Here. It\'s yours.', to: 'give' },
          { text: 'Before I give it back — what\'s it worth to you?', to: 'bargain' },
          { text: 'I looked everywhere. No luck, sorry. (Keep the bird)', to: 'keep', tag: 'Lie', skill: 'deception' },
        ],
      },
      give: {
        text: '[She cups it in both hands like it might fly away.] Thank you. You don\'t know — thank you. Here — take this, I brought two. You need it more than me now. I don\'t need anything now.',
        onEnter: (c) => {
          c.take('wooden_bird');
          c.give('calming_tea');
          c.setObj('lost_bird', 'return', 'done');
          c.completeQuest('lost_bird', 'returned');
          c.addRel(20);
          c.helped();
        },
        next: 'thanks', nextText: 'Good luck today, Pip.',
      },
      bargain: {
        text: '...Oh. I — I have a peppermint? And tea? That\'s all I have.',
        choices: [
          { text: 'Deal. Hand them over.', to: 'bargain_take' },
          { text: 'Keep your tea. I was joking. Here.', to: 'give' },
        ],
      },
      bargain_take: {
        text: '[She hands them over quickly and takes the bird.] Thank you. [She says it more quietly than she means to.]',
        onEnter: (c) => {
          c.take('wooden_bird');
          c.give('calming_tea');
          c.give('peppermint');
          c.setObj('lost_bird', 'return', 'done');
          c.completeQuest('lost_bird', 'bargained');
          c.addRel(5);
          c.rep('amity', -3);
        },
        end: true,
      },
      keep: {
        text: 'Oh. [Her face does something brave and small.] Thank you for trying. Really. Grandmother would say things go where they\'re needed.',
        onEnter: (c) => { c.setFlag('kept_bird'); c.failQuest('lost_bird', 'You kept the carved bird and told Pip you hadn\'t found it.'); },
        end: true,
      },
      thanks: {
        text: (c) => (c.aptDone() ? 'My brave little bird came in with me. I think it helped. Don\'t tell the Erudite — they\'ll want to study it.' : 'My brave little bird is back. I\'ll be brave for both of us now.'),
        choices: [bye],
      },
      kept: {
        text: (c) => (c.flag('returned_late') ? 'Thank you for giving it back. Even late. Especially late.' : 'Still no sign of it. That\'s all right. Grandmother would say things go where they\'re needed. [She smiles bravely.]'),
        choices: [
          { text: 'Actually... I did find it. I\'m sorry. Here.', to: 'late', if: (c) => c.has('wooden_bird'), tag: 'Truth' },
          bye,
        ],
      },
      late: {
        text: '[She stares at the bird, then at you.] You had it the whole time? [She takes it gently.] ...Thank you for giving it back. People don\'t usually come back to say sorry.',
        onEnter: (c) => { c.take('wooden_bird'); c.setFlag('returned_late'); c.addRel(8); c.rep('amity', 2); },
        end: true,
      },
    },
  });

  /* ============================== ROOK DELANEY ============================== */
  T('rook', {
    entry: [
      { if: (c) => c.qActive('initiation') && c.has('coffee') && c.qObj('initiation', 'return') === 'active', node: 'coffee' },
      { if: (c) => c.flag('coffee_caught') && !c.mem('heardCaught'), node: 'caught' },
      { if: (c) => c.firstTime, node: 'intro' },
      { node: 'hub' },
    ],
    nodes: {
      intro: {
        text: 'Hey. Neutral clothes. Either you\'re very brave or very lost. Which is it?',
        choices: [
          { text: 'Brave.', to: 'brave' },
          { text: 'Lost.', to: 'lost' },
          { text: 'Who\'s asking?', to: 'who' },
        ],
      },
      brave: { text: 'Prove it.', next: 'dare', nextText: 'How?' },
      lost: { text: 'Ha! Honest. Candor\'d like you. [He grins.] Still. Want to be brave for a minute?', next: 'dare', nextText: 'Depends.' },
      who: { text: 'Rook Delaney. Future legend. Current candidate. You?', next: 'dare', nextText: '{name}.' },
      dare: {
        text: 'Here\'s a dare. Staff break room, east wing. Coffee machine. STAFF coffee — the real stuff, not this water-cooler swill. Get me a cup without anyone catching you.',
        choices: [
          { text: 'You\'re on.', to: 'accept', if: (c) => !c.qStarted('initiation') },
          { text: 'Why would I do that?', to: 'why' },
          { text: 'No.', to: 'refuse' },
        ],
      },
      why: { text: 'Because tomorrow you choose. And today\'s the last day nobody\'s watching. Supposedly. [He winks at the ceiling cameras.]', next: 'dare', nextText: 'Hm.' },
      accept: { text: 'YES. Okay. Rules: nobody sees you take it. Brann\'s usually in there and he\'s the size of a train. If you get caught, I never met you.', onEnter: (c) => { c.startQuest('initiation'); c.addRel(5); }, next: 'hub', nextText: 'Got it.' },
      refuse: { text: 'Your loss. Offer stands, though. I\'m a generous legend.', onEnter: (c) => c.addRel(-2, true), next: 'hub', nextText: '...' },
      hub: {
        text: (c) => c.greet({ first: 'What\'s up?', again: 'What\'s up, neutral?', friend: '{name}! My accomplice!', cold: 'Oh. You.' }),
        choices: [
          { text: 'About that dare...', to: 'dare', if: (c) => !c.qStarted('initiation') },
          { text: 'Where exactly is the coffee?', to: 'where', if: (c) => c.qActive('initiation') && !c.has('coffee') },
          { text: 'What\'s Dauntless really like?', to: 'dauntless' },
          { text: 'I could take you.', check: { attr: 'strength', dc: 7 }, to: 'take', once: 'take' },
          { text: 'Nervous about the test?', to: 'nervous', if: (c) => !c.aptDone() },
          bye,
        ],
      },
      where: { text: 'East passage, past the infirmary, into the staff corridor — door on the right that says STAFF ROOM. Machine\'s on the counter. Wait till nobody\'s looking. Or till Brann goes back to his monitors.', next: 'hub', nextText: 'Okay.' },
      dauntless: { text: 'Loud. Fast. Honest about being scared — just loudly. You jump off the train because you\'re scared, not because you aren\'t. Nobody outside gets that.', next: 'hub', nextText: 'Huh.' },
      take: { text: 'Ha! [He sizes you up.] ...Maybe. Ask me after initiation. If you\'re in black, we\'ll find out.', onEnter: (c) => { c.addRel(6); c.rep('dauntless', 2); }, next: 'hub', nextText: 'Deal.' },
      nervous: { text: 'Nervous? Nah. Okay, my hands are doing a thing. Ignore my hands.', next: 'hub', nextText: 'Ignored.' },
      coffee: {
        text: 'Is that —? Did you actually —?',
        choices: [
          { text: 'Swiped it right under their noses.', to: 'stole', if: (c) => c.flag('coffee_stolen') },
          { text: 'I asked Brann. He gave it to me.', to: 'asked', if: (c) => c.flag('coffee_asked') },
          { text: 'It\'s from the machine. Don\'t ask questions.', to: 'stole', if: (c) => !c.flag('coffee_stolen') && !c.flag('coffee_asked') },
        ],
      },
      stole: {
        text: 'LEGEND. [He drinks it in one go and immediately regrets it.] Hot. Very hot. Worth it. You\'re definitely Dauntless. Or a thief. Same thing some days.',
        onEnter: (c) => {
          c.take('coffee');
          c.setObj('initiation', 'return', 'done');
          c.completeQuest('initiation', 'stolen');
          c.rep('dauntless', 4);
          c.addRel(15);
          c.helped();
        },
        next: 'hub', nextText: 'Told you.',
      },
      asked: {
        text: 'You ASKED? [He stares.] ...That\'s either the most boring thing I\'ve ever heard, or the bravest. Brann once bit a guy. [He takes the cup.] Fine. Points for nerve.',
        onEnter: (c) => {
          c.take('coffee');
          c.setObj('initiation', 'return', 'done');
          c.completeQuest('initiation', 'asked');
          c.rep('candor', 2);
          c.addRel(6);
        },
        next: 'hub', nextText: 'Honesty\'s braver than theft.',
      },
      caught: {
        text: 'HA! I heard Brann roar from the hall. Respect for trying. Most people don\'t even try.',
        onEnter: (c) => { c.setMem('heardCaught', true); c.addRel(4); },
        next: 'hub', nextText: 'Thanks. I think.',
      },
    },
  });
})();
