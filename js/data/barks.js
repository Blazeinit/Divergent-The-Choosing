/* ==========================================================================
   DIVERGENT — ambient barks, NPC↔NPC conversations, PA announcements
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const greet = {
    abnegation: ['Good morning.', 'Is there anything you need?', '*nods politely*', 'Peace be with you today.', 'Mind the step.'],
    dauntless: ['Hey.', 'Don\'t look so scared.', 'What are you staring at?', 'Big day, huh?', '*cracks knuckles*', 'You lost?'],
    erudite: ['Hm.', 'Excuse me — I\'m thinking.', 'Morning. Statistically, a good one.', 'Do you know where the proctor went?', '*adjusts glasses*'],
    candor: ['You look nervous.', 'Morning. You\'ve got something on your sleeve. Just kidding.', 'Hi. Honestly? I hate waiting.', 'Hello.', 'You\'re staring.'],
    amity: ['Hello, friend!', 'Lovely morning, isn\'t it?', 'Breathe. It helps.', 'Good morning!', 'You\'ll be all right.'],
    factionless: ['...', 'Watch the wet floor.', '*keeps working*', 'Morning.', 'Don\'t mind me.'],
  };
  const greetKnown = {
    abnegation: ['Hello again, {name}.', 'Still here, {name}?'],
    dauntless: ['{name}. Still standing?', 'Back again, huh.'],
    erudite: ['Ah, {name}.', '{name}. Any new observations?'],
    candor: ['{name}. You look less nervous now. Slightly.', 'Hey, {name}.'],
    amity: ['{name}! Nice to see you again.', 'Hello again, {name}!'],
    factionless: ['{name}.', 'You again.'],
  };
  const postTest = {
    candidate: ['How was yours? No — don\'t tell me. We\'re not supposed to.', 'You came out pale. Everyone does.', 'Did it feel real to you?', 'Mine felt like a dream I can\'t shake.'],
    staff: ['Go easy on yourself today.', 'Results are a guide, not a sentence.', 'Drink some water. Simulations dehydrate you.'],
  };

  // Conversations: arrays of [speakerIndex, line]. Keyed loosely by faction pair.
  const convos = {
    'dauntless|dauntless': [
      [[0, 'Bet you I\'m out of there in ten minutes.'], [1, 'Bet you puke on the technician.'], [0, 'At least I\'d do it bravely.']],
      [[0, 'You hear the trains this morning?'], [1, 'Jumped one on the way here. Obviously.'], [0, 'Liar.'], [1, 'Prove it.']],
      [[0, 'What if it says Erudite?'], [1, 'Then the test is broken.'], [0, 'Yeah. Yeah, obviously.']],
    ],
    'erudite|erudite': [
      [[0, 'The serum acts on the hippocampus. I read the abstract.'], [1, 'The public abstract is edited.'], [0, 'Edited by whom?'], [1, 'By people smarter than the public.']],
      [[0, 'Three scenarios. Maybe four.'], [1, 'Sample size of rumors is too small to say.'], [0, 'Fair.']],
    ],
    'candor|candor': [
      [[0, 'You look terrible.'], [1, 'Thank you. You look worse.'], [0, 'I know.']],
      [[0, 'I think the test is mostly about whether you lie to yourself.'], [1, 'Then I\'ll ace it.'], [0, 'That sounded like a lie.']],
    ],
    'amity|amity': [
      [[0, 'Did you bring anything for luck?'], [1, 'Just bread. Bread is always lucky.'], [0, 'That\'s true, actually.']],
      [[0, 'My mother said to breathe slower than I want to.'], [1, 'Mine said to sing. I\'m not going to sing.'], [0, 'Maybe a little.']],
    ],
    'abnegation|abnegation': [
      [[0, 'Did you eat this morning?'], [1, 'I gave mine to my brother.'], [0, 'Take half of mine. Please.']],
      [[0, 'Whatever the result, we serve.'], [1, 'Whatever the result.'], [0, '...Are you nervous?'], [1, 'Yes.']],
    ],
    staff: [
      [[0, 'Room three is still offline.'], [1, 'Calibration again?'], [0, 'Something in the serum lot. Don\'t ask me.']],
      [[0, 'How many today?'], [1, 'Forty-one in our sector. Seven left.'], [0, 'Coffee first.']],
      [[0, 'Pierce wants every inconclusive flagged in person.'], [1, 'There won\'t be any.'], [0, 'There never are. Officially.']],
      [[0, 'Did you see the Amity kid crying?'], [1, 'They all cry. The Dauntless ones just hide it worse.']],
    ],
    mixed: [
      [[0, 'What faction are you from?'], [1, 'Can\'t you tell?'], [0, 'I can. I was being polite.']],
      [[0, 'Are you staying, after? In your faction?'], [1, 'We\'re not supposed to talk about it.'], [0, 'That\'s not an answer.'], [1, 'No. It isn\'t.']],
      [[0, 'Do you think they watch us? During it?'], [1, 'The mirrors aren\'t just mirrors.'], [0, 'That\'s a rumor.'], [1, 'Is it?']],
      [[0, 'I heard someone left the city once.'], [1, 'Nobody leaves the city.'], [0, 'That\'s what I said.']],
      [[0, 'My sister says the test lies.'], [1, 'Tests can\'t lie.'], [0, 'People can.']],
    ],
  };

  // PA announcements (random rotation). Scheduled main-quest ones are in the game logic.
  const pa = [
    'Candidates are reminded that discussion of aptitude results is strictly prohibited.',
    'The courtyard is open to candidates who have completed testing.',
    'Testing Room Three remains out of service. Group schedules have been adjusted.',
    'Please keep the central aisle of the waiting hall clear.',
    'Staff member Gus Novak, please report to the east corridor.',
    'Water is available at the stations in the waiting hall. Please hydrate before testing.',
    'A reminder: the Choosing Ceremony will take place tomorrow at the Hub. Faction before blood.',
    'Will the owner of a blue lanyard left at reception please collect it.',
    'Candidates experiencing distress after testing may visit the infirmary in the east wing.',
    'The simulation cannot harm you. Please follow your technician\'s instructions.',
  ];

  DV.Barks = {
    greet,
    convos,
    pa,
    greeting(npc) {
      // later places bring their own small talk
      if (npc.def.greetFn) { const g = npc.def.greetFn(npc); if (g) return DV.Dialogue.fill(g, { def: npc.def }); }
      const f = npc.def.faction || 'abnegation';
      const st = DV.State.npc(npc.id);
      if (npc.def.barks && Math.random() < 0.45) return DV.Dialogue.fill(U.pick(npc.def.barks), { def: npc.def });
      if (DV.State.data.aptitude.status === 'complete' && Math.random() < 0.4) {
        return U.pick(postTest[npc.def.role === 'staff' ? 'staff' : 'candidate']);
      }
      const p = DV.State.data.player;
      if (p.outfit !== 'neutral' && Math.random() < 0.3) {
        if (p.outfit === f) return U.pick(['Nice to see those colors.', 'You look like home.', 'Good — wear it proudly.']);
        return U.pick(['Interesting choice of clothes.', 'Those aren\'t testing garments.', 'Hm. ' + DV.Factions.name(p.outfit) + ' colors, today?']);
      }
      if (st.mem.met) return DV.Dialogue.fill(U.pick(greetKnown[f] || greetKnown.abnegation), { def: npc.def });
      if (st.mem.insulted) return U.pick(['...', 'Keep walking.', 'Oh. You.']);
      return U.pick(greet[f] || greet.abnegation);
    },
    conversation(a, b) {
      let pool;
      if (a.def.convos || b.def.convos) {
        const own = (a.def.convos || []).concat(b.def.convos || []);
        if (own.length) return U.pick(own).slice();
      }
      if (a.def.role === 'staff' && b.def.role === 'staff') pool = convos.staff;
      else if (a.def.faction === b.def.faction && convos[a.def.faction + '|' + b.def.faction]) pool = convos[a.def.faction + '|' + b.def.faction].concat(convos.mixed.slice(0, 1));
      else pool = convos.mixed;
      if (a.def.convo && Math.random() < 0.6) pool = [a.def.convo];
      return U.pick(pool).slice();
    },
  };
})();
