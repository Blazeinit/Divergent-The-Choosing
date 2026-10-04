/* ==========================================================================
   DIVERGENT — Build 3: the people of the Dauntless compound
   The initiates are the people who chose Dauntless at the ceremony (some
   of them you met on Aptitude Day — they remember you: `memOf` shares one
   memory between the two of them). The instructor, the leader who will
   make the cut, the tattoo artist, the cook, the doctor, and members who
   spend their evenings in the Pit.
   Schedules for the class and the instructor are written fresh each day
   from the training plan (DV.Initiation).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  // (initiates live in the dormitory: that's where they set out from; staff come and go through the members' quarters)
  const add = (d) => DV.NPCData.add(Object.assign({ zone: 'd_compound', faction: 'dauntless' }, d.role === 'initiate' ? { home: 'dorm_mid' } : {}, d));
  const I = () => DV.Initiation;
  const D = () => DV.Clock.day();
  const flag = (n) => !!DV.State.flag(n);
  const inClass = (id) => () => !!(DV.Initiation && DV.Initiation.here(id));
  const classDay = (id) => (npc) => DV.Initiation.classSchedule(id);

  /* ============================== the class ============================== */
  add({
    id: 'd_nate', memOf: 'nate_russo', name: 'Nate Russo', age: 16, sex: 'm', role: 'initiate', tier: 3,
    title: 'Initiate (Dauntless-born)',
    personality: 'Loud, restless, born on the Pit floor. Takes every dare and most of the falls. Under the noise, loyal to anyone who ever took one of his dares seriously.',
    when: inClass('d_nate'), appearanceFn: () => DV.Hub.initiateApp('nate_russo', 'dauntless'),
    scheduleFn: classDay('d_nate'), dialogue: 'd_nate',
    greetFn: () => (D() >= 3 && Math.random() < 0.5 ? U.pick(['Rankings! Where are you? Top half? Liar.', 'My knuckles hurt. Yours?', 'Race you to the railing. Kidding. Unless.']) : null),
    barks: ['Did you see that? Tell me you saw that.', 'Ow. Worth it.', 'Dauntless!'],
  });
  add({
    id: 'd_kat', memOf: 'kat_malone', name: 'Kat Malone', age: 16, sex: 'f', role: 'initiate', tier: 2,
    title: 'Initiate (Dauntless-born)',
    personality: 'Cool, dry, quick. Treats Nate like a younger brother she didn\'t ask for. Knows exactly where she stands in the rankings at all times.',
    when: inClass('d_kat'), appearanceFn: () => DV.Hub.initiateApp('kat_malone', 'dauntless'),
    scheduleFn: classDay('d_kat'), dialogue: 'd_kat',
    barks: ['Keep your elbow in.', 'Mm.', 'Don\'t look down. I mean it, the first time, don\'t.'],
  });
  add({
    id: 'd_joey', memOf: 'joey_brennan', name: 'Joey Brennan', age: 16, sex: 'm', role: 'initiate', tier: 2,
    title: 'Initiate (Dauntless-born)',
    personality: 'Huge, gentle, laughs with his whole body. Grew up in the compound and still can\'t look at a needle.',
    when: inClass('d_joey'), appearanceFn: () => DV.Hub.initiateApp('joey_brennan', 'dauntless'),
    scheduleFn: classDay('d_joey'), dialogue: 'd_joey',
    barks: ['Ha! Ha. Ow.', 'You hungry? I\'m hungry.', 'Big day. Every day\'s a big day here.'],
  });
  add({
    id: 'd_ella', name: 'Ella Young', age: 16, sex: 'f', role: 'initiate', tier: 2,
    title: 'Initiate (Dauntless-born)',
    personality: 'Called first at the ceremony and has been first at everything since. Polite, precise and not your friend: it\'s a competition and she\'s winning it.',
    when: inClass('d_ella'), appearanceFn: () => DV.Hub.initiateApp('young_ella', 'dauntless'),
    scheduleFn: classDay('d_ella'), dialogue: 'd_ella',
    barks: ['Excuse me.', 'Again.', 'Fourteen metres would be harder. I asked.'],
  });
  add({
    id: 'd_josh', memOf: 'josh_miller', name: 'Josh Miller', age: 16, sex: 'm', role: 'initiate', tier: 3,
    title: 'Initiate (Candor transfer)',
    personality: 'Big, booming, raised to say what he thinks — and in Dauntless he\'s found out what he thinks is mostly cruel. Picks the weakest person in any room. Afraid of being that person.',
    when: inClass('d_josh'), appearanceFn: () => DV.Hub.initiateApp('josh_miller', 'dauntless'),
    scheduleFn: classDay('d_josh'), dialogue: 'd_josh',
    greetFn: () => (Math.random() < 0.6 ? U.pick(['Look who it is.', 'Still here? Huh.', 'Mind your step. Floor\'s slippery near the railing.', '"Initiate." Ha.']) : null),
    barks: ['What are you looking at?', 'Honesty, that\'s all it is. You\'re welcome.', 'Move.'],
  });
  add({
    id: 'd_marcus', name: 'Marcus Reed', age: 16, sex: 'm', role: 'initiate', tier: 1,
    title: 'Initiate (Erudite transfer)',
    personality: 'Erudite to the bone, Dauntless by choice. Calculating, quiet, attaches himself to whoever is strongest. Right now that\'s Josh.',
    when: inClass('d_marcus'),
    appearance: { build: 'slim', face: 3, skin: '#d9b08c', hair: 'slicked', hairColor: '#2b1d14', height: 1.0 },
    scheduleFn: classDay('d_marcus'),
    talk: {
      greet: ['...Yes?', 'You again.'],
      role: 'Initiation is a ranking problem. Most of them treat it like a fight. I treat it like a ranking problem.',
      faction: 'Erudite to Dauntless is the second most common transfer. Did you know that? Nobody ever asks what the most common is.',
      advice: 'Don\'t be in the bottom two. That\'s all the advice there is.',
      rumor: (c) => (D() >= 5 ? 'Josh says some people are "slipping" lately. I\'d stay in bright places, if I were someone.' : 'They keep the simulation room locked. Stage Two runs on serums from Erudite. I\'d like to see the formulation.'),
      extra: [{ q: 'Why do you stick with Josh?', a: 'Because he\'s going to finish high and he\'s going to remember who stood next to him. That\'s not friendship. It\'s arithmetic.' }],
    },
    barks: ['Hm.', 'Statistically, someone falls this week.', '...'],
  });
  add({
    id: 'd_bryce', name: 'Bryce Nolan', age: 16, sex: 'm', role: 'initiate', tier: 1,
    title: 'Initiate (Candor transfer)',
    personality: 'Josh\'s shadow from the same Candor block. Laughs a beat after Josh does. Not cruel by himself, which is no excuse.',
    when: inClass('d_bryce'),
    appearance: { build: 'heavy', face: 6, skin: '#e8c3a4', hair: 'buzzed', hairColor: '#8a6a3a', height: 1.04 },
    scheduleFn: classDay('d_bryce'),
    talk: {
      greet: ['Yeah?', 'What.'],
      role: 'It\'s fine. It\'s great. My hands are wrecked. It\'s great.',
      faction: 'Candor. Me and Josh both. You say what you think and you get hit for it, here. At least it\'s honest.',
      advice: 'Stay out of Josh\'s way. He\'s not — look, just stay out of his way.',
      rumor: (c) => (D() >= 4 ? 'Rankings went up. Half the room hasn\'t looked. Everybody looked.' : 'Somebody said the knives are real. Like, sharp. Who decided that?'),
    },
    barks: ['Heh.', 'Josh! Wait up.', 'My hands, man.'],
  });
  add({
    id: 'd_daniel', memOf: 'daniel_webb', name: 'Daniel Webb', age: 16, sex: 'm', role: 'initiate', tier: 3,
    title: 'Initiate (Abnegation transfer)',
    personality: 'The council member\'s son who chose the coals. Scrupulously polite, very afraid, getting thinner by the day. Has never hit anyone in his life and is about to have to.',
    when: inClass('d_daniel'), appearanceFn: () => DV.Hub.initiateApp('daniel_webb', 'dauntless'),
    scheduleFn: classDay('d_daniel'), dialogue: 'd_daniel',
    barks: ['Sorry — sorry.', 'I\'m all right. I\'m all right.', 'Is it always this loud?'],
  });

  /* ============================== the people who run it ============================== */
  add({
    id: 'd_mark', name: 'Mark Rivera', age: 19, sex: 'm', role: 'staff', tier: 3,
    title: 'Instructor — transfer initiates',
    personality: 'Three years out of his own initiation, which he finished first and never mentions. Hard because the cut is real. Notices more than he says, and says very little.',
    appearanceFn: () => DV.DauntlessCast.INSTRUCTOR(), access: ['members', 'simroom'],
    scheduleFn: () => DV.Initiation.markSchedule(), dialogue: 'd_mark',
    greetFn: () => (Math.random() < 0.5 ? U.pick(['Initiate.', 'You\'re in the way.', 'Hands up. Even here.', 'Eat something.']) : null),
    barks: ['Again.', 'Feet.', 'Don\'t watch your hands, watch theirs.'],
  });
  add({
    id: 'd_dana', name: 'Dana Cole', age: 34, sex: 'f', role: 'staff', tier: 2,
    title: 'Dauntless leader',
    personality: 'Erudite-born, Dauntless by conviction, and by now more Dauntless than anyone born to it. Believes in efficiency, rankings and the cut. Smiles like she\'s grading you.',
    appearanceFn: () => DV.DauntlessCast.LEADER(), access: ['members', 'simroom'],
    scheduleFn: () => DV.Initiation.danaSchedule(), dialogue: 'd_dana',
    barks: ['Carry on.', 'Interesting.', 'Write that down, Rivera.'],
  });
  add({
    id: 'd_nina', name: 'Nina Kaur', age: 31, sex: 'f', role: 'staff', tier: 3,
    title: 'Tattoo artist',
    personality: 'Ink under her nails, three ravens up her collarbone and a voice that drops when the door is open. Used to administer aptitude tests. Doesn\'t talk about why she stopped.',
    appearance: { build: 'average', face: 5, skin: '#b07a52', hair: 'long', hairColor: '#141210', hairDye: '#6a2a7a', height: 1.0, outfit: { top: 'tank', topColor: '#161617', bottomColor: '#1a1a1c', shoes: 'boots', tattoos: ['armL', 'armR', 'neck'], piercings: ['ear', 'nose'] } },
    access: ['members'],
    schedule: [
      { t: '09:30', do: 'arrive', to: 'tat_artist', act: 'work' },
      { t: '13:00', do: 'go', to: 'dt3_a6', act: 'sit' },
      { t: '13:40', do: 'go', to: 'tat_artist', act: 'work' },
      { t: '19:30', do: 'go', to: 'dt2_b6', act: 'sit' },
      { t: '20:10', do: 'go', to: 'tat_artist', act: 'work' },
      { t: '23:00', do: 'leave' },
    ],
    dialogue: 'd_nina',
    barks: ['Sit still or it\'ll be a seagull.', 'Mm-hm.', 'Door\'s open if you\'re brave. Ha.'],
  });
  add({
    id: 'd_hector', name: 'Hector Alvarez', age: 52, sex: 'm', role: 'staff', tier: 1,
    title: 'Cook, Dining Hall',
    personality: 'Feeds four hundred people three times a day and remembers how every one of them likes their eggs. Lost two fingers to a dare in 1990-something and tells it differently every time.',
    appearance: { build: 'heavy', face: 2, skin: '#a8704a', hair: 'buzzed', hairColor: '#7a7a76', height: 0.98, outfit: { top: 'tshirt', topColor: '#d8d4cc', bottomColor: '#1a1a1c', shoes: 'boots', tattoos: ['armL', 'armR'] } },
    access: ['members'],
    schedule: [{ t: '05:50', do: 'arrive', to: 'cook', act: 'type' }, { t: '21:30', do: 'leave' }],
    talk: {
      greet: ['Initiate! Plate. Eat.', 'Back again! Good. You\'re too thin.'],
      role: 'I cook. They eat. Everybody\'s Dauntless at a table, initiate — the bravest thing most of them do all day is try my chili.',
      faction: 'Forty years. Born up top, came down, never went back up. What would I go up there for? The sky? Overrated.',
      advice: 'Eat breakfast. The ones who skip breakfast are the ones I see in the infirmary by Thursday.',
      rumor: (c) => (D() >= 5 ? 'Late nights, raised voices by the chasm. I don\'t hear things. But I hear things.' : 'Somebody wants cake for the end of Stage One. There\'s always cake. I\'ve never once been asked, and there\'s always cake.'),
      extra: [{ q: 'What happened to your fingers?', a: 'A train, a dare and a girl called Rosa. Or a knife, a dare and a girl called Rosa. The fingers are gone either way. The girl\'s my wife. Eat your eggs.' }],
    },
    barks: ['Plates!', 'Next!', 'You call that a portion? Here.'],
  });
  add({
    id: 'd_ama', name: 'Dr. Ama Mensah', age: 44, sex: 'f', role: 'staff', tier: 2,
    title: 'Infirmary',
    personality: 'Amity-born, Dauntless for twenty years, and the only person in the compound who can make Dana Cole wait. Stitches you up and tells you exactly how stupid you were.',
    appearance: { build: 'slim', face: 4, skin: '#5a3a24', hair: 'bun', hairColor: '#141210', height: 1.0, outfit: { top: 'labcoat', topColor: '#1d1d1f', coatColor: '#e4e4dc', bottomColor: '#1a1a1c', shoes: 'boots' } },
    access: ['members'],
    schedule: [{ t: '07:00', do: 'arrive', to: 'doc', act: 'type' }, { t: '12:45', do: 'go', to: 'dt0_b6', act: 'sit' }, { t: '13:30', do: 'go', to: 'doc', act: 'type' }, { t: '23:00', do: 'leave' }],
    dialogue: 'd_ama',
    barks: ['Sit.', 'Who did this? No — don\'t tell me.', 'Ice. Twenty minutes.'],
  });

  /* ============================== members, in the Pit of an evening ============================== */
  add({
    id: 'd_bo', name: 'Bo Kaminski', age: 23, sex: 'm', role: 'member', tier: 2,
    title: 'Patrol, fence duty',
    personality: 'Lives for the drop. Organises the zip line runs from the top of the Hancock building and won\'t tell anyone how he gets the key.',
    appearance: { build: 'athletic', face: 6, skin: '#e0b896', hair: 'messy', hairColor: '#c08a3a', height: 1.05, outfit: { top: 'jacket', topColor: '#161617', topColor2: '#3a3a40', bottomColor: '#1a1a1c', shoes: 'boots', piercings: ['ear', 'lip'], tattoos: ['armR'] } },
    access: ['members'],
    schedule: [{ t: '16:30', do: 'arrive', to: 'rail4', act: 'lean' }, { t: '19:05', do: 'go', to: 'dt1_a0', act: 'sit' }, { t: '20:00', do: 'go', to: 'pit_c3' }, { t: '23:40', do: 'leave' }],
    dialogue: 'd_bo',
    barks: ['Wind\'s right tonight.', 'Initiate!', 'Ever been up the Hancock? No? You will.'],
  });
  add({
    id: 'd_shay', name: 'Shay Morrow', age: 27, sex: 'f', role: 'member', tier: 1,
    title: 'Compound patrol',
    personality: 'Walks the Pit floor all day with her hands in her jacket. Sees everything, reports almost none of it.',
    appearance: { build: 'athletic', face: 7, skin: '#d8a27c', hair: 'undercut', hairColor: '#141210', hairDye: '#c4232c', height: 1.02, outfit: { top: 'jacket', topColor: '#1d1d1f', bottomColor: '#1a1a1c', shoes: 'boots', piercings: ['brow'], acc: ['badge'] } },
    access: ['members'],
    schedule: [
      { t: '07:30', do: 'arrive', to: 'pit_c0' },
      { t: '07:35', do: 'patrol', route: ['pit_c0', 'pit_c4', 'rail1', 'pit_c5', 'rail5', 'pit_c2', 'rail3'], wait: 14 },
      { t: '12:40', do: 'go', to: 'dt2_a3', act: 'sit' },
      { t: '13:20', do: 'patrol', route: ['pit_c2', 'rail3', 'pit_c5', 'rail0', 'pit_c4', 'pit_c0'], wait: 14 },
      { t: '20:00', do: 'leave' },
    ],
    talk: {
      greet: ['Keep moving, initiate.', 'You again. Lost?'],
      role: 'Patrol. Up and down. You\'d be amazed how many people try to sleep on the railing.',
      faction: 'Abnegation-born. Don\'t look at me like that. Somebody has to be the first one off the roof.',
      advice: 'At night, walk in twos. Nobody\'s going to tell you why. I just did.',
      rumor: (c) => (D() >= 5 ? 'Couple of your class were down by the chasm after lights-out. Big one and two little ones. Up to nothing good, I\'d bet.' : 'Fence duty after Stage Three, if you make it. Best view in the city. Worst coffee.'),
    },
    barks: ['Off the railing.', 'Evening.', 'Mm.'],
  });
  add({
    id: 'd_tess', name: 'Tess Navarro', age: 21, sex: 'f', role: 'member', tier: 1,
    title: 'Member',
    personality: 'Two years a member and still can\'t believe she got in. Knows every rumour in the compound and most of them are hers.',
    appearance: { build: 'slim', face: 1, skin: '#c48a62', hair: 'ponytail', hairColor: '#3a2416', height: 0.98, outfit: { top: 'tank', topColor: '#1d1d1f', bottomColor: '#232325', shoes: 'boots', tattoos: ['armL'], piercings: ['ear', 'nose'] } },
    access: ['members'],
    schedule: [{ t: '17:30', do: 'arrive', to: 'rail5', act: 'lean' }, { t: '19:00', do: 'go', to: 'dt3_b2', act: 'sit' }, { t: '20:00', do: 'go', to: 'rail2', act: 'lean' }, { t: '23:30', do: 'leave' }],
    talk: {
      greet: ['Oh — an initiate! Hi! How\'s it going? Don\'t answer, it\'s going badly, it always is.', 'Hey, you!'],
      role: 'Me? Fence crew, mostly. I was ranked ninth out of eleven. NINTH. And now look at me. A member.',
      faction: 'Amity-born, if you can believe it. I hit someone on my first day here and cried for an hour after. Nobody tells you crying\'s allowed. It is.',
      advice: 'Get a tattoo. Seriously. It sounds stupid but it makes it real. Nina\'s the best, go see Nina.',
      rumor: (c) => (D() >= 6 ? 'Stage Two today! You get a simulation. Everyone gets a different one. Mine was moths. Don\'t laugh.' : D() >= 5 ? 'People are saying an initiate went over the railing a few years back and it wasn\'t an accident. People say a lot of things.' : 'Bo\'s doing a zip line run this week. Off the top of the Hancock building. If he asks you, say yes. If he doesn\'t, ask.'),
    },
    barks: ['Hiiii.', 'Oh, I love this part.', 'Did you hear?'],
  });
  add({
    id: 'd_jada', name: 'Jada Wells', age: 25, sex: 'f', role: 'member', tier: 1,
    title: 'Member',
    personality: 'Ike\'s partner. Sardonic, gentle with initiates in a way she\'d deny.',
    appearance: { build: 'average', face: 4, skin: '#6e4128', hair: 'braids', hairColor: '#141210', height: 1.0 },
    access: ['members'],
    schedule: [{ t: '18:00', do: 'arrive', to: 'pit_c0', with: 'd_ike' }, { t: '19:00', do: 'go', to: 'dt0_a1', act: 'sit' }, { t: '20:00', do: 'go', to: 'pit_c0', with: 'd_ike' }, { t: '23:00', do: 'leave' }],
    convos: [[[0, 'Remember our Stage One?'], [1, 'I remember you crying at the knife wall.'], [0, 'I remember YOU crying at the knife wall.'], [1, '...That\'s fair.']], [[0, 'That one keeps looking over here.'], [1, 'They\'re new. Everything\'s worth looking at.']]],
    talk: {
      greet: ['Hey, initiate.', 'Back for more wisdom?'],
      role: 'I train the little ones. Dauntless-born kids, eight, nine years old. They\'re braver than you. They\'re also smaller, so.',
      faction: 'Born here. My mum jumped first in her year. I jumped fourth. She brings it up.',
      advice: 'Don\'t fight angry. Angry\'s slow.',
      rumor: (c) => 'Ike says Dana Cole wants a smaller class this year. Fewer members, better members. Whatever that means.',
    },
  });
  add({
    id: 'd_ike', name: 'Ike Moreno', age: 26, sex: 'm', role: 'member', tier: 1,
    title: 'Member',
    personality: 'Big laugh, bigger arms, Jada\'s partner. Works the armoury.',
    appearance: { build: 'heavy', face: 1, skin: '#c48a62', hair: 'buzzed', hairColor: '#141210', height: 1.06, outfit: { top: 'tshirt', topColor: '#1d1d1f', bottomColor: '#1a1a1c', shoes: 'boots', tattoos: ['armL', 'armR', 'neck'] } },
    access: ['members'],
    schedule: [{ t: '18:00', do: 'arrive', to: 'pit_c1', with: 'd_jada' }, { t: '19:00', do: 'go', to: 'dt0_a2', act: 'sit' }, { t: '20:00', do: 'go', to: 'pit_c1', with: 'd_jada' }, { t: '23:00', do: 'leave' }],
    talk: {
      greet: ['Initiate! You still have all your fingers? Good.', 'Hey!'],
      role: 'Armoury. Those pistols you\'re shooting? I clean them. Every night. You\'re welcome.',
      faction: 'Erudite-born. Yeah. I know.',
      advice: 'At the range, breathe out and stop. Don\'t hold a big breath — let one go and shoot in the gap.',
      rumor: (c) => (D() >= 5 ? 'Your instructor\'s been in the leaders\' wing twice this week. Mark doesn\'t go up there unless somebody makes him.' : 'The rankings board used to be in the Pit, where everyone could see it. They moved it after somebody threw a chair through it.'),
    },
  });
  add({
    id: 'd_greg', name: 'Greg Lindqvist', age: 38, sex: 'm', role: 'staff', tier: 1,
    title: 'Simulation technician',
    personality: 'Erudite on loan to Dauntless for Stage Two. Polite, pale, keeps his blue tie on under the black jacket.',
    faction: 'erudite',
    appearance: { build: 'slim', face: 3, skin: '#f0d0b4', hair: 'short', hairColor: '#6d5a3a', height: 1.0, outfit: { top: 'shirt', topColor: '#2f5f9e', bottomColor: '#1d2f4e', acc: ['glasses', 'tie'], tieColor: '#16305a' } },
    access: ['members', 'simroom'],
    onlyDay: 6,
    schedule: [{ t: '09:00', do: 'arrive', to: 'sim_tech', act: 'type' }, { t: '17:00', do: 'leave' }],
    talk: {
      greet: ['Ah. An initiate. Please don\'t touch anything.', 'Hello again.'],
      role: 'The serum is a transmitter. The simulation is a stimulus. You are the variable. That\'s all I\'m permitted to say.',
      faction: 'Erudite, yes. Dauntless asks for our help with Stage Two every year. Some years they even say please.',
      advice: 'Your heart rate is the only thing I\'m measuring. Lower is better. Lower is always better.',
      rumor: (c) => 'Some candidates respond to the serum… atypically. Very rare. We\'re asked to note it. I just note it.',
    },
  });

  /* ============================== small talk for the people with no tree of their own ============================== */
  function build(def) {
    const L = def.talk || {};
    const initiate = def.role === 'initiate';
    const say = (v, c) => (typeof v === 'function' ? v(c) : v);
    const topics = (c) => {
      const ch = [];
      ch.push({ text: initiate ? 'How\'s initiation treating you?' : 'What do you do here?', to: 'role' });
      ch.push({ text: initiate ? 'Where are you from?' : 'How long have you been Dauntless?', to: 'faction' });
      if (L.advice) ch.push({ text: 'Any advice?', to: 'advice' });
      (L.extra || []).forEach((e, i) => ch.push({ text: e.q, to: 'extra' + i, if: e.if }));
      if (L.rumor) ch.push({ text: 'Heard anything?', to: 'rumor' });
      ch.push({ text: 'Get out of my way. (Shove past)', end: true, tag: 'Rude', if: () => !c.mem('insulted'), effect: (cc) => { cc.addRel(-8, true); cc.insulted(); DV.Reputation.add('dauntless', 1, true); } });
      ch.push({ text: 'See you around.', end: true });
      return ch;
    };
    const nodes = {
      start: {
        text: (c) => {
          if (c.mem('insulted') && c.rel() < 0) return 'Oh, it\'s you. Shove me again and see what happens.';
          const g = L.greet || ['Hey.', 'Hey again.'];
          return c.firstTime ? say(g[0], c) : say(g[1] || g[0], c);
        },
        choices: (c) => topics(c),
      },
      hub: { text: 'Anything else?', choices: (c) => topics(c) },
      role: { text: (c) => say(L.role, c) || 'Busy.', next: 'hub', nextText: 'Right.' },
      faction: { text: (c) => say(L.faction, c) || 'Long enough.', next: 'hub', nextText: 'Huh.' },
      advice: { text: (c) => say(L.advice, c), next: 'hub', nextText: 'Thanks.', onEnter: (c) => c.addRel(1, true) },
      rumor: { text: (c) => say(L.rumor, c), next: 'hub', nextText: 'Interesting.' },
    };
    (L.extra || []).forEach((e, i) => { nodes['extra' + i] = { text: (c) => say(e.a, c), next: 'hub', nextText: 'I see.', onEnter: (c) => c.setMem('asked_extra' + i) }; });
    return { entry: 'start', nodes };
  }
  for (const id of ['d_marcus', 'd_bryce', 'd_hector', 'd_shay', 'd_tess', 'd_jada', 'd_ike', 'd_greg']) DV.NPCData.get(id).buildDialogue = build;
  DV.CompoundTalk = { build };
  void flag;
  void I;
})();
