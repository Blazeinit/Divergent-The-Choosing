/* ==========================================================================
   DIVERGENT — dialogue: the city's side quests
   Trees for the people in js/data/cityquests.js, and the scenes you walk
   into out there (a drone in the gutter, a roof six floors up, the Order's
   front desk). Each story has a way through without a check, a check that
   makes it kinder or quicker, and a choice that costs somebody.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const T = (id, tree) => DV.DialogueDB.add(id, tree);
  const Q = DV.Quests;
  const CQ = DV.CityQuests;
  const F = (n) => !!DV.State.flag(n);
  const set = (n, v) => DV.State.setFlag(n, v);
  const act = (q, o) => Q.obj(q, o) === 'active';
  const live = (q) => Q.isActive(q);
  const has = (id) => DV.Inventory.has(id);
  const give = (id, n) => { DV.Inventory.add(id, n || 1); };
  const take = (id, n) => { if (DV.Inventory.has(id)) DV.Inventory.remove(id, n || 1); };
  const rep = (f, d) => DV.Reputation.add(f, d);
  const feed = (to) => ({ text: () => '[Give ' + to + ' ' + CQ.foodName().replace(/^(Amity|Abnegation) /, 'your ') + ']', if: () => !!CQ.food() });

  /* ============================== LAST SEEN AT HUB CENTRAL ============================== */
  T('cq_toby', {
    entry: () => (!Q.started('cq_sister') ? 'start' : Q.isDone('cq_sister') ? 'after' : act('cq_sister', 'toby') ? 'report' : 'waiting'),
    nodes: {
      start: {
        text: (c) => (c.firstTime ? '[A thin boy in a man\'s coat, the sleeves turned back four times, stands at the top of the Hub Central steps looking at everyone who comes up out of the station.] Did you come up from the trains? Did you see a girl down there? Red scarf. About this tall. [He holds a hand a little above his own head.] She\'s my sister.' : '[Toby is still on the steps.] You came back. Have you seen her?'),
        choices: [
          { text: 'When did you last see her?', to: 'when', once: true },
          { text: 'Why not ask the Order to look for her?', to: 'order', once: true },
          Object.assign(feed('him'), { to: 'food', once: 'toby_food' }),
          { text: 'I\'ll look for her. What\'s her name?', to: 'accept' },
          { text: 'Sorry. I can\'t help.', end: true },
        ],
      },
      when: { text: 'Yesterday. Four o\'clock. She had a bag of — stuff, to sell at Merciless Mart. She went down those stairs and said she\'d be back up before the gates shut. [He looks at the stairs.] The gates shut at nine. I waited.', next: 'start', nextText: 'I see.' },
      order: { text: '[He laughs, once, like an old man.] We\'re factionless. The Order doesn\'t look for us. It looks at us.', next: 'start', nextText: '...' },
      food: {
        text: '[He takes it without saying thank you, then remembers and says it twice. He eats half and puts the other half inside his coat.] For Nell. For when she\'s back.',
        onEnter: (c) => { CQ.giveFood(); c.addRel(10, true); rep('factionless', 1); },
        next: 'start', nextText: '...',
      },
      accept: {
        text: 'Nell. Nell Kerr. [He says it carefully, as if it matters that you get it right.] Merciless Mart is one stop that way on the trains. There\'s an old man in the ticket booth, Walt. He gives Nell yesterday\'s paper when nobody\'s bought it. He\'d know.',
        onEnter: (c) => c.startQuest('cq_sister'), endText: 'I\'ll find her.',
      },
      waiting: {
        text: '[He hasn\'t moved from the steps.] Did you find her?',
        choices: [
          { text: 'What was in the bag she took?', to: 'bag', once: true },
          { text: 'You know where she gets the things she sells.', check: { attr: 'perception', dc: 5 }, to: 'wire', fail: 'wire_no', once: true },
          { text: 'Not yet. Stay here, where she knows to find you.', end: true },
        ],
      },
      bag: { text: 'Stuff. [He looks at his shoes.] Things people don\'t want any more.', next: 'waiting', nextText: '...' },
      wire: { text: '...Wire. Copper. She gets it out of the metal boxes in the tunnels, on the bit of line the trains don\'t use. Only she says they DO use it, some of them. [Quiet.] Don\'t tell anyone.', onEnter: (c) => c.setFlag('cq_toby_wire'), next: 'waiting', nextText: 'I won\'t.' },
      wire_no: { text: 'I don\'t know. [He does.]', next: 'waiting', nextText: '...' },
      report: {
        text: () => (F('cq_nell_turned_in') ? '[Toby is on his feet before you reach the steps. His face is wet.] Walt came by. He says the Order took a girl out of the ruins. A girl in a red scarf. [He looks at you.] Was it her? Did you find her first?' : '[He sees you coming and stops breathing.] Well?'),
        choices: [
          { text: 'She\'s coming home tonight. She said to wait here.', if: () => F('cq_nell_home'), to: 'home' },
          { text: 'She\'s gone to the Abnegation sector. The bread line at the Council Hall will take her in. Meet her there.', if: () => F('cq_nell_shelter'), to: 'shelter' },
          { text: 'She\'s in the ruins west of the Mart, by the fires. She\'s scared to cross the city. Go to her at dusk, and walk, don\'t run.', if: () => F('cq_nell_seen') && !F('cq_nell_home') && !F('cq_nell_shelter') && !F('cq_nell_turned_in'), to: 'found' },
          { text: '[Lie] I never found her. I\'m sorry.', if: () => F('cq_nell_turned_in'), check: { attr: 'charisma', dc: 6 }, to: 'lie_ok', fail: 'lie_bad', skill: 'deception' },
          { text: 'It was me. I told them where she was.', if: () => F('cq_nell_turned_in'), to: 'truth' },
        ],
      },
      home: {
        text: '[He\'s already looking past you at the stairs, as if she might come up them now.] She said that? She said wait here? [He sits down on the step, hard, as if his legs have stopped.] Okay. Okay. I\'ll wait. [He pulls something on a bootlace out of his coat and holds it out.] My whistle. Two notes. Under the tracks, everybody knows it\'s us. You have it.',
        onEnter: (c) => { c.give('tin_whistle'); c.addRel(20, true); rep('factionless', 6); CQ.ally('ezra', 1, 'You brought a factionless girl home to her brother.'); c.completeQuest('cq_sister', 'home', 'Nell is coming home. Toby gave you his whistle: under the tracks, they know its two notes.'); },
        endText: 'Look after her.',
      },
      shelter: {
        text: 'The grey people? [He thinks about it.] They\'re all right. They give you bread and they don\'t make you say thank you. [He\'s halfway down the steps.] I\'m going now. Walking. [He turns round at the bottom.] Thank you!',
        onEnter: (c) => { c.addRel(15, true); rep('factionless', 4); rep('abnegation', 2); CQ.ally('ezra', 1, 'You sent a factionless girl to the Abnegation instead of the Order.'); c.completeQuest('cq_sister', 'shelter', 'Nell has gone to the Abnegation at the Council Hall. Toby has gone to meet her.'); },
        endText: '...',
      },
      found: {
        text: '[He\'s off the steps before you finish, and back again.] West of the Mart. By the fires. [He grips your sleeve.] Thank you. I\'ll get her. She listens to me. Mostly.',
        onEnter: (c) => { c.addRel(10, true); rep('factionless', 3); c.completeQuest('cq_sister', 'found', 'You told Toby where his sister is hiding. He has gone to bring her home.'); },
        endText: 'Walk. Don\'t run.',
      },
      lie_ok: {
        text: '[He looks at you for a long time. Then he nods, because he wants to believe you more than he wants to know.] Okay. [He sits back down on the step. He\'s still sitting there when you look back from the corner.]',
        onEnter: (c) => { c.setFlag('cq_lied_to_toby'); rep('factionless', -4); c.completeQuest('cq_sister', 'turned_in', 'The Order has Nell Kerr. Toby thinks you never found her.'); },
        endText: '...',
      },
      lie_bad: {
        text: '[He looks at you, at your hands, and back.] You\'re lying. Everybody who comes up those stairs lies to me. [He spits on the step next to your shoe and walks away down Monroe Street without running.]',
        onEnter: (c) => { c.setFlag('cq_lied_to_toby'); c.addRel(-40, true); rep('factionless', -10); c.completeQuest('cq_sister', 'turned_in', 'The Order has Nell Kerr. Toby knows it was you.'); },
        endText: '...',
      },
      truth: {
        text: '[He doesn\'t cry. He goes very still, the way factionless children learn to.] Why? [He doesn\'t wait for an answer.] Did they pay you? They pay people. [He turns away.] I hope it was enough.',
        onEnter: (c) => { c.addRel(-30, true); rep('factionless', -8); c.completeQuest('cq_sister', 'turned_in', 'The Order has Nell Kerr, and you told Toby so to his face.'); },
        endText: '...',
      },
      after: {
        text: () => (F('cq_nell_turned_in') ? '[Toby doesn\'t look at you.]' : F('cq_nell_shelter') ? 'Nell\'s with the grey people. She says their bread\'s better than ours. [He grins.] It isn\'t.' : '[Toby and Nell sit together on the steps, sharing something out of a paper bag. Toby waves at you with the whole of his arm.]'),
        endText: '...',
      },
    },
  });

  // the man in the booth at Merciless Mart
  const toRuins = (c) => { if (Q.obj('cq_sister', 'mart') !== 'done') c.setObj('cq_sister', 'mart', 'done'); Q.activate('cq_sister', 'ruins'); };
  T('cq_walt', {
    entry: () => (live('cq_sister') && act('cq_sister', 'mart') ? 'nell' : 'start'),
    nodes: {
      start: {
        text: '[An old Candor man in a ticket-booth jacket, a stack of yesterday\'s papers under his arm.] Circle Line, both ways round. Gates shut at nine. What do you want to know?',
        choices: [
          { text: 'Are the trains running all right?', to: 'trains', once: true },
          { text: 'I\'ve brought something back for the line.', if: () => has('copper_wire'), to: 'wire_back' },
          { text: 'Nothing. Thanks.', end: true },
        ],
      },
      trains: { text: 'Mostly. On Tuesday the outer loop ran blind for an hour between here and California. Somebody\'s been pulling the signal cable out of the junction boxes and selling it for the copper. [He shakes his head.] Blind trains in a tunnel. Nobody died. Nobody\'s died yet.', next: 'start', nextText: 'I see.' },
      wire_back: {
        text: '[He unwraps the rag and looks at the coil for a long time.] That\'s from a junction box, that is. [He puts it under the counter.] I\'ll tell the line it turned up in lost property. Which it has. [He looks at you straight.] I won\'t ask where from, and you won\'t have to lie to me.',
        onEnter: (c) => { take('copper_wire'); c.setFlag('cq_copper_returned'); c.addRel(15, true); rep('candor', 3); c.xp(20, 'The signal cable went back'); },
        next: 'start', nextText: 'Thank you, Walt.',
      },
      nell: {
        text: '[An old Candor man in a ticket-booth jacket, yesterday\'s papers under his arm.] A girl in a red scarf. [He doesn\'t pretend not to know who you mean.] What\'s she to you?',
        choices: [
          { text: 'Her little brother has been on the steps at Hub Central since yesterday.', to: 'tell' },
          { text: '[Lie] I\'m with the Order. Where did she go?', check: { attr: 'charisma', dc: 7 }, to: 'lie_ok', fail: 'lie_bad', skill: 'deception' },
        ],
      },
      tell: {
        text: 'Toby. Little Toby. [He sighs through his nose.] She came through yesterday with a bag of copper wire she had no business having. Signal cable, out of the junction boxes on the outer loop; I\'d bet my booth on it. A drone on the platform stopped over her and held, the way they\'ve started doing, and she ran. Up the stairs and west, toward the ruins, where they keep the fires going.\n\n[He taps the papers.] And you should know, since you\'re looking: the Order\'s put a notice up at the station on Armitage. A reward for whoever names the copper thief. Somebody will.',
        onEnter: (c) => { toRuins(c); c.setFlag('cq_walt_told'); c.addRel(8, true); },
        endText: 'Thank you, Walt.',
      },
      lie_ok: {
        text: '[He looks at you for a long time over the papers.] West. The ruins. [He turns his back to straighten a timetable that doesn\'t need it.] Candor don\'t lie to the Order, officer. We just don\'t say much.',
        onEnter: (c) => { toRuins(c); c.setFlag('cq_walt_lied'); rep('candor', -2); },
        endText: '...',
      },
      lie_bad: {
        text: 'You\'re not Order. Order don\'t ask, they tell. [He snorts.] And you\'re not Candor, or you\'d know better than to try that on me. [He jerks his head west.] She ran that way. Everybody who runs goes that way. Now go and do whatever it is you\'re really doing.',
        onEnter: (c) => { toRuins(c); c.addRel(-15, true); rep('candor', -3); },
        endText: '...',
      },
    },
  });

  // Nell, in a doorway in the ruins
  const nellDone = (c, how) => {
    c.setFlag('cq_nell_' + how);
    if (Q.obj('cq_sister', 'ruins') !== 'done') c.setObj('cq_sister', 'ruins', 'done');
    Q.activate('cq_sister', 'toby');
  };
  const nellChoices = [
    { text: 'Signal cable. Walt at the Mart told me. Trains run blind without it.', to: 'wire', once: 'nell_wire', if: () => F('cq_walt_told') || F('cq_toby_wire') },
    { text: 'Come home. I\'ll walk ahead of you all the way.', check: { attr: 'charisma', dc: 6 }, to: 'home', fail: 'home_no', once: 'nell_home' },
    { text: 'Give me the wire. I\'ll take it back to the station, and there\'s nothing to catch you with.', check: { attr: 'charisma', dc: 5 }, to: 'give_wire', fail: 'home_no', once: 'nell_give' },
    { text: 'There\'s a bread line at the Abnegation Council Hall. They take people in and don\'t ask questions.', to: 'shelter' },
    Object.assign(feed('her'), { to: 'food', once: 'nell_food' }),
    { text: 'Stay here, then. I\'ll tell Toby where you are.', to: 'stay' },
    { text: '[Lie] Wait here. I\'ll come back with something to eat.', to: 'betray', tag: 'lie' },
  ];
  T('cq_nell', {
    entry: () => {
      if (Q.isDone('cq_sister')) return 'after';
      if (live('cq_sister') && Q.obj('cq_sister', 'ruins') !== 'done') return 'start';
      if (live('cq_sister')) return F('cq_nell_betray') && !F('cq_nell_turned_in') ? 'waiting' : 'gone';
      return 'stranger';
    },
    nodes: {
      stranger: {
        text: '[A girl in a red scarf sits in a doorway with a burlap bag between her boots. She watches you go by and says nothing.]',
        choices: [{ text: 'Are you all right?', to: 'stranger2' }, { text: '[Walk on.]', end: true }],
      },
      stranger2: { text: 'Fine. Keep walking.', endText: '...' },
      start: {
        text: '[A girl in a red scarf, fifteen at most, sitting in a doorway with a burlap bag between her boots. She\'s on her feet before you\'ve finished walking up, the bag behind her.] Stay there. Who sent you?',
        onEnter: (c) => { c.setFlag('cq_nell_seen'); if (act('cq_sister', 'mart')) c.setObj('cq_sister', 'mart', 'done'); },
        choices: [
          { text: 'Toby. He\'s been on the steps at Hub Central since yesterday.', to: 'toby' },
          { text: 'Nobody. I\'m just walking.', to: 'nobody' },
        ],
      },
      nobody: {
        text: 'Then walk. [She doesn\'t sit down until you\'ve turned away. Then:] Wait. Are you going east? Past Hub Central?',
        choices: [{ text: 'I could be. Your brother\'s there. Toby.', to: 'toby' }],
      },
      toby: {
        text: '[Her face goes. She sits down again on the step, hard.] He waited? Since yesterday? The idiot. [She wipes her nose on the end of the scarf.] I can\'t go back past the stations. A drone stopped over me on the platform and held. Ten seconds, I counted. It\'s got my face now. And when they find out what was in the bag —',
        choices: nellChoices,
      },
      ask: { text: '[She waits, arms folded, the bag between her boots.]', choices: nellChoices },
      wire: { text: '[She lifts her chin.] Old boxes on the old line. They said nobody used it. [Less sure:] They said. [She looks at the bag.] It\'s eight days of bread for Toby. Do you know what eight days of bread is?', next: 'ask', nextText: '...' },
      food: {
        text: '[She looks at it as if it might be a trick, then eats it in four bites standing up.] ...Thanks.',
        onEnter: (c) => { CQ.giveFood(); c.addRel(10, true); },
        next: 'ask', nextText: '...',
      },
      home: {
        text: '[She looks at you, at the bag, and east, where the rest of the city is.] ...If a drone comes, I\'m running and you\'re on your own. [She shoulders the bag.] Not with you. Behind you, a street back. Go and tell him I\'m coming. I\'ll be on the steps before the lamps are lit.',
        onEnter: (c) => { nellDone(c, 'home'); c.addRel(10, true); }, endText: 'I\'ll tell him.',
      },
      give_wire: {
        text: '[She holds the bag a moment longer than she needs to. Then she takes out a coil of copper wrapped in a rag and puts it in your hands.] Eight days of bread. [She lets go of it.] Fine. Then there\'s nothing on me but my face, and they can\'t hang a face. Tell Toby I\'m coming. I\'ll be on the steps before the lamps are lit.',
        onEnter: (c) => { c.give('copper_wire'); c.setFlag('cq_wire_given'); nellDone(c, 'home'); c.addRel(10, true); }, endText: 'I\'ll tell him.',
      },
      home_no: { text: '[She shakes her head.] You don\'t know what they do to people they want. I\'m not walking past three stations with this on my back. [She sits down again.]', next: 'ask', nextText: '...' },
      shelter: {
        text: 'The grey ones? [She thinks about it.] They gave me bread once and didn\'t look at my coat. [She stands and shoulders the bag.] All right. Tell Toby to meet me at the Council Hall. Tell him to walk, not run. Running is what they notice.',
        onEnter: (c) => nellDone(c, 'shelter'), endText: 'I\'ll tell him.',
      },
      stay: {
        text: '[She nods, already back in the doorway.] Tell him to come at dusk. Not before. And tell him to walk.',
        onEnter: (c) => nellDone(c, 'found'), endText: 'I will.',
      },
      betray: {
        text: '[She looks at you, and you watch her decide to believe you.] ...Bread, if you can. Not apples. [She sits back down in the doorway with the bag between her boots.] I\'ll be here.',
        onEnter: (c) => { c.setFlag('cq_nell_betray'); c.setObj('cq_sister', 'ruins', 'done'); Q.activate('cq_sister', 'desk'); },
        endText: '[Walk away.]',
      },
      waiting: {
        text: '[She\'s still in the doorway.] Did you bring anything?',
        choices: [
          { text: '[Tell her the truth] I was going to sell you to the Order. Go home. Now.', to: 'warned' },
          { text: 'Not yet.', end: true },
        ],
      },
      warned: {
        text: '[For a second she just looks at you. Then she\'s up, the bag on her back, and gone between two buildings without a sound. Over her shoulder, not loud:] Tell Toby. Dusk.',
        onEnter: (c) => { c.setFlag('cq_nell_warned'); c.setFlag('cq_nell_found'); if (act('cq_sister', 'desk')) c.setObj('cq_sister', 'desk', 'failed'); Q.activate('cq_sister', 'toby'); },
        endText: '...',
      },
      gone: { text: '[Nell is packing the bag.] Go on. Tell him.', endText: '...' },
      after: { text: '[Nell sits on the steps with an arm round her brother.] You again. [Not unkindly.] He hasn\'t stopped talking about you.', endText: '...' },
    },
  });

  /* ============================== THE ORDER'S FRONT DESK ============================== */
  const chit = () => { if (!has('order_chit')) give('order_chit'); };
  const reportSheets = (agnes) => {
    set('cq_sheets_reported');
    if (agnes) set('cq_agnes_taken');
    take('night_sheets');
    chit();
    CQ.notice(-25);
    rep('erudite', 3); rep('abnegation', agnes ? -10 : -3);
    if (agnes) CQ.ally('joan', -2, 'You gave the Order a name from Joan\'s network.');
    Q.complete('cq_sheets', 'reported', agnes ? 'You reported Gordon Lyle and Agnes Rudd at the Order Station. The sergeant already knew about Gordon. He didn\'t know about Agnes.' : 'You reported Gordon Lyle at the Order Station. The sergeant already knew all about him.');
  };
  T('cq_desk', {
    entry: 'start',
    nodes: {
      start: {
        text: '[Through the Order Station\'s glass doors there\'s a front desk with a bell, a ledger and a Dauntless sergeant in a blue armband, who looks up as if he\'s been expecting you.] Office of Public Order. Either you\'ve got something to report, or you\'re lost.',
        choices: [
          { text: 'The copper thief from the Circle Line. She\'s hiding in the ruins west of the Mart.', if: () => act('cq_sister', 'desk'), to: 'nell' },
          { text: 'There\'s a clerk selling copies of your patrol rotas. Gordon Lyle.', if: () => live('cq_sheets'), to: 'gordon' },
          { text: 'I found the drone that came down on Randolph Street.', if: () => live('cq_scan') && has('drone_log_card'), to: 'card' },
          { text: 'I\'m lost.', end: true },
        ],
      },
      nell: {
        text: '[He writes it down word for word and turns the ledger round for you to sign.] The ruins. West of the Mart. By the fires. [He presses the bell under the desk without looking at it.] The Office thanks you, citizen. There\'s a commendation for information leading to — well. You\'ll have it.',
        onEnter: (c) => {
          c.setFlag('cq_nell_turned_in'); chit();
          c.setObj('cq_sister', 'desk', 'done'); Q.activate('cq_sister', 'toby');
          CQ.notice(-30); rep('erudite', 4); rep('factionless', -10);
          CQ.ally('ezra', -2, 'You gave a factionless girl to the Order.');
          c.note('I told the Order where to find Nell Kerr. They gave me a slip of paper with my name on it.');
        },
        endText: '[Sign it.]',
      },
      gordon: {
        text: '[He doesn\'t write anything down.] Lyle. Records. [A small smile.] Thank you, citizen. The Office is well aware of Mr. Lyle. Mr. Lyle sells what the Office gives him to sell.',
        choices: [
          { text: 'And the woman he sells them to. Agnes, on the bench at California station.', to: 'agnes' },
          { text: 'That\'s all.', to: 'gordon_end' },
        ],
      },
      gordon_end: { text: 'Then you\'ve done your duty. [He slides a printed slip across the desk.] A commendation. You\'ll find it opens doors.', onEnter: () => reportSheets(false), endText: '...' },
      agnes: { text: '[Now he writes.] Agnes. California. [He looks up.] That one we didn\'t have. [The slip he slides across has been stamped twice.]', onEnter: () => reportSheets(true), endText: '...' },
      card: {
        text: '[He holds out his hand for it, and you put it in his palm.] Unit 7-14. We wondered where that had got to. [He drops the card in a drawer and locks it.] The Office thanks you, citizen. Whatever you think you read on that, you didn\'t.',
        onEnter: (c) => {
          take('drone_log_card'); c.setFlag('cq_scan_returned'); chit();
          CQ.notice(-30); rep('erudite', 4); rep('candor', -3);
          c.completeQuest('cq_scan', 'returned', 'You handed the drone\'s log card in at the Order Station. Iris Dunn will wait outside the Mart for a story that isn\'t coming.');
        },
        endText: '...',
      },
    },
  });

  /* ============================== THE NIGHT SHEETS ============================== */
  T('cq_gordon', {
    entry: () => (!Q.started('cq_sheets') ? 'start' : !live('cq_sheets') ? 'after' : act('cq_sheets', 'gordon') ? 'report' : 'waiting'),
    nodes: {
      start: {
        text: '[A man in a creased blue coat stands with his back to the headquarters wall, eating a sandwich and watching the street. An Office of Public Order pass hangs from his lanyard, turned face in.] You look like you walk a lot. Do you walk a lot?',
        choices: [{ text: 'Depends who\'s asking.', to: 'who' }, { text: 'I\'m just passing.', end: true }],
      },
      who: {
        text: 'Gordon Lyle. I file things for the Office of Public Order. Patrol rotas, mostly: which unit walks which street, at what hour, all week. [He pats his coat.] There are people in this city who would give a lot to know where the patrols won\'t be.',
        choices: [{ text: 'Who buys them?', to: 'buyers', once: true }, { text: 'You sell the Order\'s rotas?', to: 'sell' }, { text: 'Not my business.', end: true }],
      },
      buyers: { text: 'People who need to cross the city after nine without being asked their name. You\'d be surprised who. [He chews.] Or you wouldn\'t.', next: 'who', nextText: '...' },
      sell: {
        text: 'Copies. The Office prints forty a week and nobody counts them. [He lowers his voice.] Only I\'m watched, coming and going, and I need a courier. My regular buyer\'s in the Abnegation sector: a woman called Agnes, on the bench outside California station, every afternoon. Give her the envelope and say Gordon sends his regards.',
        choices: [
          { text: 'What\'s in it for me?', to: 'pay', once: true },
          { text: 'What\'s in it for her?', to: 'her', once: true },
          { text: 'All right. Give it here.', to: 'accept' },
          { text: 'No. Find someone else.', end: true },
        ],
      },
      pay: { text: 'Two ration bars when you come back. [He sees your face.] I\'m a clerk. That\'s a week of my lunches.', next: 'sell', nextText: '...' },
      her: { text: 'Families. [He looks at the street, not at you.] People whose names have gone onto a list. Agnes moves them before the Order collects them. The sheets tell her which night the streets will be empty.', next: 'sell', nextText: '...' },
      accept: {
        text: '[He takes an envelope out of his coat and holds it out without looking at it.] It isn\'t sealed. Erudite don\'t seal things; we assume people will read them. [He goes back to the sandwich.] Don\'t run. People who run get stopped.',
        onEnter: (c) => { c.startQuest('cq_sheets'); c.give('night_sheets'); }, endText: 'California station. Agnes.',
      },
      waiting: {
        text: '[Gordon doesn\'t look at you.] Not here. Not until it\'s done.',
        choices: [
          { text: 'Why does Thursday say "no unit assigned"?', if: () => F('cq_sheets_read'), check: { attr: 'intelligence', dc: 6 }, to: 'thursday', fail: 'thursday_no', once: true },
          { text: 'I\'m going.', end: true },
        ],
      },
      thursday: { text: '[He stops chewing.] Clerical error. [He swallows.] They happen. [He doesn\'t believe it either, and he can see that you can see that.]', next: 'waiting', nextText: '...' },
      thursday_no: { text: 'Then it\'s an easy night for her. [He looks away.]', next: 'waiting', nextText: '...' },
      report: {
        text: () => (F('cq_sheets_warned') ? '[Gordon\'s sandwich is gone. He\'s been eating his nails instead.] Well? Did she take it?' : '[Gordon\'s sandwich is gone.] Well?'),
        choices: [
          { text: 'She took it. She didn\'t open it.', if: () => !F('cq_sheets_warned'), to: 'paid' },
          { text: 'She read it. Thursday is empty on her streets, and she knows that isn\'t a gift. Who gave you that page?', if: () => F('cq_sheets_warned'), to: 'confront' },
        ],
      },
      paid: {
        text: '[He lets out a breath he\'s been holding since you left.] Good. Good. [Two ration bars, out of his coat.] That\'s that, then. [He\'s already looking at the street again.] Don\'t come by here for a while.',
        onEnter: (c) => {
          c.give('ration_bar', 2); rep('erudite', 1);
          if (F('cq_sheets_read')) c.setFlag('cq_sheets_trap');
          c.completeQuest('cq_sheets', 'delivered', F('cq_sheets_read') ? 'Gordon paid you two ration bars. You knew what was on the Thursday line, and you said nothing.' : 'Gordon paid you two ration bars. You never read what you carried.');
        },
        endText: '...',
      },
      confront: {
        text: '[He looks at you for a long moment.] Clerical error.',
        choices: [
          { text: 'Families were going to walk out on Thursday night straight into the Order, Gordon.', check: { attr: 'charisma', dc: 6 }, to: 'confess', fail: 'deny' },
          { text: 'The Office prints forty copies and nobody counts them. Somebody counted yours.', check: { attr: 'intelligence', dc: 6 }, to: 'confess', fail: 'deny' },
          { text: 'Fine. Keep your clerical error.', to: 'deny' },
        ],
      },
      deny: {
        text: '[He folds the sandwich paper into a very small square.] I don\'t know what you\'re talking about. [He walks away up Wells Street without looking back. He isn\'t at the wall the next day, or the day after.]',
        onEnter: (c) => { c.setFlag('cq_gordon_gone'); c.completeQuest('cq_sheets', 'warned', 'Agnes knows the Thursday page was a trap. Gordon Lyle wouldn\'t say who gave it to him, and nobody has seen him since.'); },
        endText: '...',
      },
      confess: {
        text: '[His hands start to shake, and he puts them in his pockets.] A month ago a lieutenant in a plain coat sat down on that bench. Polite. A very good listener. He knew how many copies I\'d sold, and to whom. He said I could carry on, as long as some weeks I sold the page he gave me. [He looks at the pavement.] I didn\'t ask what Thursday was for. I made very sure not to ask.',
        onEnter: (c) => { c.setFlag('cq_gordon_confessed'); CQ.clue('gordon'); },
        choices: [
          { text: 'Then stop. Go to Agnes\'s people, and get out of it.', to: 'quit' },
          { text: 'Keep selling. But from now on you tell me which pages are his.', to: 'owned' },
        ],
      },
      quit: {
        text: '[He nods slowly, like a man agreeing to have a tooth out.] There\'s a woman at the Hall who\'ll know where to send me. [He presses two ration bars into your hand.] For carrying it. And for reading it. [He goes, and doesn\'t look back.]',
        onEnter: (c) => { c.give('ration_bar', 2); c.setFlag('cq_gordon_out'); c.setFlag('cq_gordon_gone'); rep('abnegation', 3); rep('erudite', -2); c.completeQuest('cq_sheets', 'warned', 'Agnes knows the Thursday page was a trap. Gordon Lyle has gone to the Abnegation to be moved out himself.'); },
        endText: 'Good luck, Gordon.',
      },
      owned: {
        text: '[He looks at you as if he\'s seeing you properly for the first time.] You\'d make a lieutenant yourself, in a better coat. [He nods.] All right. When a page isn\'t mine, there\'ll be a pencil line on the envelope. That\'s all you\'ll get.',
        onEnter: (c) => { c.setFlag('cq_gordon_owned'); rep('erudite', -1); c.completeQuest('cq_sheets', 'warned', 'Agnes knows the Thursday page was a trap. Gordon Lyle still sells the Order\'s rotas, and now he marks the ones that are lies.'); },
        endText: 'A pencil line.',
      },
      after: { text: () => (F('cq_gordon_owned') ? '[Gordon doesn\'t look up from his sandwich.] Nothing marked this week.' : '[Gordon doesn\'t look up from his sandwich.] Nothing this week.'), endText: '...' },
    },
  });

  T('cq_agnes', {
    entry: () => (live('cq_sheets') && act('cq_sheets', 'carry') ? 'start' : 'idle'),
    nodes: {
      idle: {
        text: '[A woman in grey on the bench by the station entrance, knitting something long and grey. She smiles the Abnegation smile.] Good afternoon.',
        choices: [
          { text: 'Did Wednesday go all right?', if: () => F('cq_sheets_warned'), to: 'wednesday', once: true },
          { text: 'Good afternoon.', end: true },
        ],
      },
      wednesday: { text: '[The needles don\'t stop.] It was a quiet night. Thank you for asking.', endText: '...' },
      start: {
        text: '[A woman in grey on the bench by the station entrance, knitting something long and grey. She smiles the Abnegation smile.] Good afternoon.',
        choices: [{ text: 'Gordon sends his regards.', to: 'regards' }, { text: 'Good afternoon.', end: true }],
      },
      regards: {
        text: '[The needles stop.] Does he. [She holds out a hand for the envelope without looking at it, the way you\'d take a cup from someone.]',
        choices: [
          { text: 'Who are you moving?', to: 'who', once: true },
          { text: 'Before you take it: read Thursday.', if: () => F('cq_sheets_read'), to: 'warn' },
          { text: 'Check it before you trust it. Gordon couldn\'t look me in the eye.', if: () => !F('cq_sheets_read'), check: { attr: 'perception', dc: 7 }, to: 'warn', fail: 'quiet_fail', once: true },
          { text: '[Hand it over and say nothing.]', to: 'quiet' },
        ],
      },
      who: { text: 'People whose names are on a list they never asked to be on. [The needles start again.] That\'s all you need, and more than you should have.', next: 'regards', nextText: '...' },
      quiet_fail: { text: '[She looks at you mildly.] Gordon never looks anyone in the eye. He\'s Erudite. [She holds her hand out again.]', next: 'regards', nextText: '...' },
      quiet: {
        text: () => (F('cq_sheets_read') ? '[She tucks the envelope into her knitting bag without opening it.] Thank you. [You know what\'s on the Thursday line. She doesn\'t. She goes back to her knitting.]' : '[She tucks the envelope into her knitting bag without opening it.] Thank you. Tell him... no. Tell him nothing.'),
        onEnter: (c) => { take('night_sheets'); c.setFlag('cq_sheets_delivered'); c.setObj('cq_sheets', 'carry', 'done'); Q.activate('cq_sheets', 'gordon'); },
        endText: '...',
      },
      warn: {
        text: '[She unfolds it and reads it the way Abnegation read everything, all the way through, without moving her lips. Her face doesn\'t change. Abnegation faces don\'t.] Two units on our streets every night of the week. And on Thursday, the one night we\'d use, none at all. [She folds it very small.] That isn\'t a gift. [It goes into the knitting bag.] We\'ll go on Wednesday, quietly, and on Thursday night nobody on our street will so much as open a window. Thank you.',
        onEnter: (c) => { take('night_sheets'); c.setFlag('cq_sheets_warned'); c.setFlag('cq_sheets_delivered'); c.addRel(20, true); rep('abnegation', 5); CQ.ally('joan', 1, 'You warned Joan\'s people off a trap in the Order\'s rota.'); c.setObj('cq_sheets', 'carry', 'done'); Q.activate('cq_sheets', 'gordon'); },
        endText: '...',
      },
    },
  });

  /* ============================== SCAN LINES ============================== */
  const scans = () => { const o = DV.State.data.world.order; return !!(o && o.scans > 0); };
  T('cq_iris', {
    entry: () => (!Q.started('cq_scan') ? 'start' : !live('cq_scan') ? 'after' : act('cq_scan', 'iris') ? 'report' : 'waiting'),
    nodes: {
      start: {
        text: (c) => (c.firstTime ? '[A woman in a black coat with a white collar, a notebook open on her forearm, stopping people as they come out of the Mart.] You. You\'re not Candor, are you? Good. Candor all tell me the same thing. Do the drones ever stop over you?' : '[Iris turns a page.] Changed your mind about the drones?'),
        choices: [
          { text: 'One scanned me. It said "identity confirmed".', if: scans, to: 'scanned', once: true },
          { text: 'Why do you want to know?', to: 'why' },
          { text: 'Not interested.', end: true },
        ],
      },
      scanned: { text: 'How long did it hold? Two seconds? [She writes it down before you can answer.] Most people say two. Some say ten.', next: 'why', nextText: 'And?' },
      why: {
        text: 'Because the Office says a scan reads your face, your name and your faction, and nothing else. I\'ve got eleven people who say a drone held on them for ten seconds, not two, and every one of the eleven had an aptitude result somebody argued about. [She taps the notebook.] That isn\'t news. That\'s eleven people. News is proof.',
        choices: [{ text: 'What would proof look like?', to: 'proof' }, { text: 'Good luck with it.', end: true }],
      },
      proof: {
        text: 'A drone came down two nights ago in the Testing District. Clipped a shop sign on Randolph Street, by Halsted, and dropped on the pavement. The Order taped it off and then forgot about it, because they forget everything that isn\'t moving. Inside it there\'s a log card. [She looks at you.] I\'m Candor. If I take it, I have to say I took it.',
        choices: [
          { text: 'That\'s stealing from the Office of Public Order.', to: 'theft', once: true },
          { text: 'What does a log card hold?', check: { attr: 'intelligence', dc: 5 }, to: 'card', fail: 'card_no', once: true },
          { text: 'And if I take it, you don\'t have to say who.', to: 'accept' },
          { text: 'Find somebody else.', end: true },
        ],
      },
      theft: { text: 'It\'s the truth, lying in the gutter getting rained on. [She shrugs.] Call it what you like. I\'ll call it what it is.', next: 'proof', nextText: '...' },
      card: { text: 'Time, place, name, how long it held, and a code for why. [She\'s watching you closely now.] You know more about Erudite machines than you let on. Good.', onEnter: (c) => c.addRel(5, true), next: 'proof', nextText: '...' },
      card_no: { text: 'Numbers. Find it and I\'ll tell you what they mean.', next: 'proof', nextText: '...' },
      accept: {
        text: 'Randolph Street, by Halsted. Don\'t let a patrol see you at it, and don\'t read it on the train. [She closes the notebook.] When you\'ve got it, bring it to me before you show anyone. Even if it scares you. Especially then.',
        onEnter: (c) => c.startQuest('cq_scan'), endText: 'Randolph and Halsted.',
      },
      waiting: { text: '[Iris looks up from the notebook.] Randolph and Halsted. The gutter. Go on.', endText: '...' },
      report: {
        text: '[She sees the card before you\'ve got it out of your pocket.] Is that it? [She holds out her hand, then stops herself.] Tell me what\'s on it first. In your own words.',
        choices: [
          { text: 'Every name, every hold, and the word "Directorate". Print all of it.', if: () => has('drone_log_card'), to: 'all' },
          { text: 'Print it. But take the names out.', if: () => has('drone_log_card'), to: 'redact' },
          { text: '[Lie] It\'s blank. The fall wiped it.', if: () => has('drone_log_card'), check: { attr: 'charisma', dc: 7 }, to: 'lie_ok', fail: 'lie_bad', skill: 'deception' },
          { text: 'Not yet.', end: true },
        ],
      },
      all: {
        text: (c) => (c.divergent() ? '[She reads it standing up, right there on the Mart steps, and her lips move.] Ten seconds. Ten seconds and "forward: Directorate". [She looks up.] Your name\'s on here. You understand that once it\'s printed, everybody knows what they think you are? [She waits. You don\'t say anything. She nods.] Then it\'s printed. Late edition. You\'ll have the first copy.' : '[She reads it standing right there on the Mart steps, and her lips move.] Ten seconds. And "forward: Directorate", every time. [She looks up, and for once she hasn\'t got anything to say. Then she has.] Late edition. Page one. You\'ll have the first copy.'),
        onEnter: (c) => {
          take('drone_log_card'); c.setFlag('cq_scan_printed'); CQ.clue('scan'); c.give('candor_special');
          CQ.notice(20, 'The Office of Public Order reads the late edition.'); rep('candor', 8); rep('erudite', -5); c.addRel(25, true);
          CQ.ally('rosa', 1, 'You gave the Candor Daily the drones\' log, names and all.');
          c.completeQuest('cq_scan', 'printed', 'The Candor Daily printed the drone\'s log, names and all.');
        },
        endText: '...',
      },
      redact: {
        text: '[Her mouth goes thin.] Candor print names. That\'s what we\'re for. [She looks at the card a long time.] ...But there\'s a boy on here who isn\'t seventeen yet. [She tears a strip off her notebook and writes NO NAMES on it.] Fine. The numbers will have to do the shouting. Late edition.',
        onEnter: (c) => {
          take('drone_log_card'); c.setFlag('cq_scan_redacted'); CQ.clue('scan'); c.give('candor_special');
          CQ.notice(10, 'The Office of Public Order reads the late edition.'); rep('candor', 4); c.addRel(10, true);
          c.completeQuest('cq_scan', 'redacted', 'The Candor Daily printed the drone\'s log without the names on it.');
        },
        endText: '...',
      },
      lie_ok: {
        text: '[She looks at you the way Candor look at everyone, waiting for the lie to show. It doesn\'t.] ...Blank. [She closes the notebook.] Then I\'ve got eleven people and no story. Thanks for trying. [The card stays in your pocket.]',
        onEnter: (c) => { c.setFlag('cq_scan_kept'); CQ.clue('scan'); rep('candor', -3); c.completeQuest('cq_scan', 'kept', 'You kept the drone\'s log card, and told Iris Dunn it was blank.'); },
        endText: '...',
      },
      lie_bad: {
        text: '[She laughs, not nicely.] You\'re a terrible liar. It\'s almost Candor of you. [She turns away to stop someone else coming out of the Mart.] Keep it, then. I hope it\'s worth what it costs you.',
        onEnter: (c) => { c.setFlag('cq_scan_kept'); CQ.clue('scan'); rep('candor', -6); c.addRel(-20, true); c.completeQuest('cq_scan', 'kept', 'You kept the drone\'s log card. Iris Dunn knows you lied to her about it.'); },
        endText: '...',
      },
      after: {
        text: () => (F('cq_scan_printed') || F('cq_scan_redacted') ? '[Iris is stopping people on the steps again.] Sold out by noon. The Office has asked to see me. I\'ve said yes. [She grins.] I\'m going to take notes.' : F('cq_scan_returned') ? '[Iris doesn\'t look up.] The gutter on Randolph Street was empty when I went to look. Somebody took it back to the Office. [Now she looks.] I don\'t need to ask, do I?' : '[Iris gives you the look Candor save for liars, and goes back to her notebook.]'),
        endText: '...',
      },
    },
  });

  // the drone in the gutter
  const gotCard = (c) => { c.setFlag('cq_drone_taken'); c.give('drone_log_card'); c.setObj('cq_scan', 'drone', 'done'); Q.activate('cq_scan', 'iris'); };
  T('cq_drone', {
    entry: () => (live('cq_scan') && !F('cq_drone_taken') ? 'start' : 'look'),
    nodes: {
      look: { text: '[A downed Order drone on its back in the gutter, one rotor arm bent double, the Office\'s blue band round its belly. Order tape has blown loose and wrapped itself round a lamppost. Nobody is paying it any attention.]', endText: '[Leave it.]' },
      start: {
        text: '[A drone the size of a dinner tray lies on its back in the gutter by a shuttered shopfront, one rotor arm bent double, the Office\'s blue band round its belly. Order tape has blown loose and wrapped itself round a lamppost. Under the belly is a small service panel held by two screws.]',
        choices: [
          { text: 'Find the release under the blue band and slide the card out cleanly.', check: { attr: 'intelligence', dc: 6 }, to: 'clean', fail: 'clumsy' },
          { text: 'Lever the panel off with your fingers.', check: { attr: 'strength', dc: 5 }, to: 'rough', fail: 'clumsy' },
          { text: 'Stamp on it until something comes loose.', to: 'kick' },
          { text: 'Leave it alone.', end: true },
        ],
      },
      clumsy: { text: '[Your fingers slip on the panel. Something inside the drone clicks and whirrs, and its one good rotor twitches. You both stop moving. It doesn\'t do it again.]', next: 'start', nextText: '...' },
      clean: { text: '[A catch under the blue band gives with a click, and the panel lifts. Inside, in a little sprung slot, is a grey card the size of a stamp. It slides out into your palm. Nobody on the street looks at you twice.]', onEnter: gotCard, endText: '[Pocket it.]' },
      rough: { text: '[The panel comes off with a crack and a cut finger. Inside, in a little sprung slot, is a grey card the size of a stamp.]', onEnter: gotCard, endText: '[Pocket it.]' },
      kick: {
        text: '[Three kicks and the panel skids across the pavement. So does most of the drone. The card is in the wreckage, and you pocket it. Up the street a whistle goes, and a man in a shop doorway is looking straight at you.]',
        onEnter: (c) => { gotCard(c); CQ.notice(12, 'Someone on Randolph Street saw you kicking an Order drone.'); },
        endText: '[Walk. Don\'t run.]',
      },
    },
  });

  /* ============================== THE RATION CARD ============================== */
  T('cq_ellen', {
    entry: () => (!Q.started('cq_card') ? 'start' : !live('cq_card') ? 'after' : act('cq_card', 'ellen') ? 'report' : act('cq_card', 'return') ? 'wait_return' : 'waiting'),
    nodes: {
      start: {
        text: (c) => '[An old woman in grey sits on her front step with a bowl of peas in her lap that she hasn\'t touched. She smiles at you as you pass, the way Abnegation always do.] ' + (c.upbringing() === 'abnegation' ? 'Oh, it\'s you, from up the street. You\'ve grown. Good afternoon.' : 'Good afternoon. Don\'t let me keep you.'),
        choices: [{ text: 'Are you all right?', to: 'ok' }, { text: 'Good afternoon.', end: true }],
      },
      ok: {
        text: 'Oh — yes. Quite all right. [She shells a pea. Then she puts it back.] I\'ve been careless, that\'s all. My ration card was in my coat at the bread line this morning, and now it isn\'t. It will turn up. Things do.',
        choices: [{ text: 'How will you eat without it?', to: 'eat' }, { text: 'I\'ll look for it.', to: 'accept' }, { text: 'I hope it does.', end: true }],
      },
      eat: {
        text: 'I\'ll manage. My grandson eats at the school on weekdays, and I don\'t need much. [Firmly.] You mustn\'t make a fuss. Somebody else\'s need is always greater than mine.',
        choices: [{ text: 'Then I won\'t make a fuss. I\'ll just look.', to: 'accept' }, { text: 'All right.', end: true }],
      },
      accept: {
        text: '[She looks embarrassed to be helped, which is the most Abnegation thing about her.] If you insist. Lydia was handing out the bread at the Council Hall. She sees everyone. But you\'re not to accuse anybody, do you hear? Not on my account.',
        onEnter: (c) => c.startQuest('cq_card'), endText: 'I won\'t.',
      },
      waiting: { text: '[Ellen has shelled about four peas.] You\'re very kind. You needn\'t.', endText: '...' },
      report: {
        text: '[She sees you coming and puts the bowl down.]',
        choices: [
          { text: 'Here. A boy had it. He took it for his little brother.', if: () => has('ellen_card'), to: 'truth' },
          { text: 'Here. I found it in the street.', if: () => has('ellen_card'), to: 'back_lie' },
          { text: 'A boy took it. His brother\'s six and can\'t eat at the school. I let him keep it.', if: () => F('cq_card_kept_danny'), to: 'let' },
          { text: '[Lie] I couldn\'t find it. I\'m sorry.', if: () => F('cq_card_kept_danny'), to: 'lost' },
        ],
      },
      truth: {
        text: '[She turns the card over in her fingers.] For his brother. [A long pause.] Then he must have it. [She holds it out to you.] He won\'t take it from me; they never do. Take it back to him, and say you found it in the street.',
        choices: [{ text: 'I\'ll take it to him.', to: 'send' }, { text: 'You need it too. Keep it.', to: 'keep' }],
      },
      send: {
        text: 'Thank you. [She picks the bowl up again, and this time she shells the peas.] Don\'t tell him who it was. That would spoil it for him.',
        onEnter: (c) => { c.setFlag('cq_card_sent'); c.setObj('cq_card', 'ellen', 'done'); Q.activate('cq_card', 'return'); }, endText: 'I won\'t.',
      },
      keep: {
        text: '[She doesn\'t argue; Abnegation don\'t, with a gift.] ...Then I\'ll put an extra loaf by for the line on Thursday. Somebody will take it. [She goes inside and comes back out with a grey scarf, folded.] It was for my grandson. He has three.',
        onEnter: (c) => { take('ellen_card'); c.give('grey_scarf'); rep('abnegation', 4); c.completeQuest('cq_card', 'returned', 'Ellen Pruitt has her ration card back, and a loaf will go spare at the bread line on Thursday.'); }, endText: 'Thank you.',
      },
      back_lie: {
        text: '[She takes it, and smiles, and doesn\'t ask where in the street.] There. I said it would turn up. [She goes inside and comes back out with a grey scarf, folded.] It was for my grandson. He has three. You\'re not to say no.',
        onEnter: (c) => { take('ellen_card'); c.give('grey_scarf'); rep('abnegation', 4); c.completeQuest('cq_card', 'returned', 'Ellen Pruitt has her ration card back.'); }, endText: 'Thank you.',
      },
      let: {
        text: '[She nods slowly, and something in her face lets go.] Then that\'s where it should be. [She picks up the bowl.] Thank you for not making him give it back. I\'d only have had to give it to him again, and he\'d never have taken it from me. [She goes in and comes out with a grey scarf.] For you. I knit too many.',
        onEnter: (c) => { c.setFlag('cq_card_given'); c.give('grey_scarf'); rep('abnegation', 8); CQ.ally('joan', 1, 'You let a hungry boy keep an Abnegation widow\'s card, and she thanked you for it.'); c.completeQuest('cq_card', 'given', 'Danny Ruiz kept the card. Ellen Pruitt says that\'s where it should be.'); }, endText: '...',
      },
      lost: {
        text: 'Oh well. [She smiles at you as if you\'ve done her a kindness, which makes it worse.] Thank you for looking. Somebody needed it more, I expect.',
        onEnter: (c) => { c.setFlag('cq_lied_to_ellen'); rep('abnegation', 1); c.completeQuest('cq_card', 'lost', 'You told Ellen Pruitt you couldn\'t find her card.'); }, endText: '...',
      },
      wait_return: { text: 'Go on. He\'ll be hungry.', endText: '...' },
      after: { text: '[Ellen is shelling peas. She nods to you.]', endText: '...' },
    },
  });

  T('cq_lydia', {
    entry: () => (live('cq_card') && act('cq_card', 'lydia') ? 'ask' : 'start'),
    nodes: {
      start: { text: '[A woman in grey with her sleeves rolled up, stacking empty bread crates against the Council Hall\'s wall.] The bread\'s finished for today, I\'m afraid. Tuesday.', endText: 'Thank you.' },
      ask: {
        text: '[She stacks another crate.] Ellen\'s card? Oh, no. [She stops.] There was a boy. Factionless, patched coat, fourteen or so. He came through the line twice and I gave him bread both times, because you do. He stood very close to Ellen. [She hesitates. Abnegation don\'t accuse.] I\'m not saying it was him. I\'m saying he went west along Grand Avenue afterwards, toward Kedzie, and he was running.',
        onEnter: (c) => { c.setObj('cq_card', 'lydia', 'done'); Q.activate('cq_card', 'danny'); },
        choices: [
          { text: 'You know his name.', check: { attr: 'perception', dc: 5 }, to: 'name', fail: 'name_no' },
          { text: 'Thank you.', end: true },
        ],
      },
      name: { text: '...Danny. Danny Ruiz. His mother was one of us, before. [Quietly.] Be kind. He has a little brother.', onEnter: (c) => c.setFlag('cq_know_danny'), endText: 'I will.' },
      name_no: { text: 'I don\'t ask their names. It makes them feel watched.', endText: '...' },
    },
  });

  const gotEllen = (c, how) => { c.give('ellen_card'); c.setFlag('cq_card_' + how); c.setObj('cq_card', 'danny', 'done'); Q.activate('cq_card', 'ellen'); };
  const dannyChoices = [
    Object.assign(feed('him'), { text: () => '[Hold out ' + CQ.foodName().replace(/^(Amity|Abnegation) /, 'your ') + '] Swap you.', to: 'trade' }),
    { text: 'Hand it over. Now.', check: { attr: 'strength', dc: 6 }, to: 'force', fail: 'force_no', once: 'danny_force' },
    { text: 'Nobody\'s going to the Order. I just want to know why.', check: { attr: 'charisma', dc: 6 }, to: 'why', fail: 'shut', once: 'danny_talk' },
    { text: 'Forget it.', end: true },
  ];
  T('cq_danny', {
    entry: () => {
      if (Q.isDone('cq_card')) return 'after';
      if (live('cq_card') && act('cq_card', 'return')) return 'returned';
      if (live('cq_card') && Q.obj('cq_card', 'danny') !== 'done' && !act('cq_card', 'ellen')) return 'start';
      return 'idle';
    },
    nodes: {
      idle: { text: '[A boy in a patched coat leans in a doorway, eating bread out of the paper very slowly to make it last.] What.', endText: 'Nothing.' },
      start: {
        text: '[A boy in a patched coat leans in a doorway, eating bread out of the paper very slowly to make it last.] What.',
        onEnter: (c) => { if (act('cq_card', 'lydia')) c.setObj('cq_card', 'lydia', 'done'); },
        choices: [
          { text: 'Danny? Lydia at the Hall says you came through the bread line twice.', if: () => F('cq_know_danny'), to: 'why' },
          { text: 'You took an old woman\'s ration card at the bread line.', to: 'accuse' },
          { text: 'Nothing.', end: true },
        ],
      },
      accuse: { text: '[He\'s off the wall, quick. The bread goes inside his coat.] Prove it.', choices: dannyChoices },
      shut: { text: '[He shrugs, and leans back against the wall.] Don\'t know what you\'re talking about. [He watches you sideways, the way you\'d watch a dog.]', choices: dannyChoices },
      force: {
        text: '[You take a step and he flinches, and hates that he flinched. The card comes out of his coat and hits you in the chest.] Take it. Go on. Take it to her. [He doesn\'t say anything else. He doesn\'t need to.]',
        onEnter: (c) => { gotEllen(c, 'forced'); rep('factionless', -6); c.addRel(-25, true); }, endText: '...',
      },
      force_no: { text: '[You step in. He doesn\'t step back. He\'s done this before and you haven\'t, and after a moment you\'re the one who looks away.]', next: 'shut', nextText: '...' },
      why: {
        text: '[He sits down on the step.] My brother\'s six. They don\'t let factionless kids eat at the school. That card\'s a week of bread for him. [He looks at the street.] She\'s got a grandson at the school. She said so in the line. I heard her.',
        choices: [
          Object.assign(feed('him'), { text: () => '[Give him ' + CQ.foodName().replace(/^(Amity|Abnegation) /, 'your ') + '] Take this instead, and give me the card.', to: 'trade' }),
          { text: 'It\'s still hers. Give it back, and I\'ll ask the Abnegation to feed your brother.', check: { attr: 'charisma', dc: 6 }, to: 'promise', fail: 'shut' },
          { text: 'She\'d want you to keep it, if she knew. Keep it.', to: 'keep' },
        ],
      },
      trade: {
        text: '[He looks at it, and at you, and does the sum.] ...Fine. [He swaps the card for it without touching your hand.] Tell her I\'m sorry. No. Don\'t tell her anything.',
        onEnter: (c) => { CQ.giveFood(); gotEllen(c, 'traded'); rep('factionless', 3); }, endText: '...',
      },
      promise: {
        text: '[He looks at you for a long time.] You don\'t know me. [But the card comes out of his coat anyway.] The grey ones at the Hall might give him something, if somebody asked. Somebody who isn\'t me.',
        onEnter: (c) => { gotEllen(c, 'promised'); rep('factionless', 2); }, endText: 'I\'ll ask.',
      },
      keep: {
        text: '[He stares at you.] Why? [You don\'t have a good answer. He doesn\'t seem to need one. He puts the rest of the bread away for later.]',
        onEnter: (c) => { c.setFlag('cq_card_kept_danny'); c.setObj('cq_card', 'danny', 'done'); Q.activate('cq_card', 'ellen'); rep('factionless', 4); c.addRel(20, true); }, endText: '...',
      },
      returned: {
        text: '[Danny is in the same doorway.] What now.',
        choices: [{ text: 'I found this in the street. Somebody must have dropped it.', if: () => has('ellen_card'), to: 'gift' }, { text: 'Nothing.', end: true }],
      },
      gift: {
        text: '[He looks at the card, then at you, for a long time.] In the street. [He takes it.] Right. [It goes inside his coat, next to the bread.] Tell whoever dropped it — [He stops.] No. Don\'t tell her anything.',
        onEnter: (c) => { take('ellen_card'); c.setFlag('cq_card_given'); c.addRel(20, true); rep('factionless', 6); rep('abnegation', 8); CQ.ally('joan', 1, 'You carried an Abnegation widow\'s ration card to a factionless boy, the way she asked.'); c.completeQuest('cq_card', 'given', 'Ellen Pruitt sent her ration card to the boy who took it. He knows where it came from.'); },
        endText: '...',
      },
      after: { text: () => (F('cq_card_given') ? '[Danny nods to you from his doorway. That\'s all, and it\'s a lot.]' : '[Danny looks straight through you.]'), endText: '...' },
    },
  });

  /* ============================== THE GAP ============================== */
  T('cq_sid', {
    entry: () => (!Q.started('cq_gap') ? 'start' : !live('cq_gap') ? 'after' : act('cq_gap', 'sid') ? 'report' : 'waiting'),
    nodes: {
      start: {
        text: (c) => '[A Dauntless boy with a shaved head and a bandaged hand leans by the station entrance, bouncing on his toes, watching the roofs instead of the street.] You look like you\'ve never jumped anything in your life.' + (c.player.faction === 'dauntless' ? ' [He sees your blacks.] Oh. Initiate. Then you\'ve heard of the Gap.' : ''),
        choices: [{ text: 'Try me.', to: 'dare' }, { text: 'What happened to your hand?', to: 'hand', once: true }, { text: 'Probably not.', end: true }],
      },
      hand: { text: 'The Gap. [He grins too wide.] It won.', next: 'dare', nextText: 'What gap?' },
      dare: {
        text: 'Warehouse on State, just south of here. Fire escape up the front. Six floors up there\'s a gap to the next roof: four metres, a long way down, no net. Everybody who crosses ties a strip of red cloth on the water tank on the far side. [He holds up the bandaged hand.] Bring me one of those strips and I\'ll tell the whole Pit you did it.',
        choices: [
          { text: 'Why don\'t you go back and do it properly?', to: 'coward', once: true },
          { text: 'That\'s a stupid way to die.', to: 'stupid', once: true },
          { text: 'You\'re on.', to: 'accept' },
          { text: 'Not today.', end: true },
        ],
      },
      coward: { text: '[The grin goes.] I will. Tomorrow. [He looks up at the roofs.] Are you doing it or not?', next: 'dare', nextText: '...' },
      stupid: { text: 'Every way to die is stupid. That one\'s got a view.', next: 'dare', nextText: '...' },
      accept: {
        text: 'Fire escape\'s on the front, south of here, rusted to hell. Don\'t trust the fourth landing; it moves. [He bounces on his toes.] Go on. I\'ll be right here.',
        onEnter: (c) => c.startQuest('cq_gap'), endText: 'Six floors.',
      },
      waiting: { text: '[Sid points south with the bandaged hand.] Fire escape. Six floors. What are you waiting for?', endText: '...' },
      report: {
        text: '[Sid is off the wall before you reach him.] Well? Did you do it?',
        choices: [
          { text: 'Here\'s your cloth.', if: () => F('cq_gap_mikey_down') && has('red_cloth'), to: 'secret' },
          { text: 'Your brother was up there, on the far roof. He couldn\'t get back. He\'s down now.', if: () => F('cq_gap_mikey_down'), to: 'tell' },
          { text: 'I went up. I came back down. [Say nothing about the kid.]', if: () => F('cq_gap_mikey_down') && !has('red_cloth'), to: 'down' },
          { text: 'Here\'s your cloth.', if: () => F('cq_gap_left_kid'), to: 'left_quiet' },
          { text: 'There\'s a kid stuck on the far roof. Your brother, I think.', if: () => F('cq_gap_left_kid'), to: 'left_tell' },
          { text: 'Your brother is stuck on the far roof. He can\'t get back across.', if: () => F('cq_gap_get_help'), to: 'help' },
        ],
      },
      secret: {
        text: '[He takes the strip and turns it over, and for a second he looks about twelve.] You did it. You actually — [He shoves it back into your hand.] Keep it. It\'s yours. I\'ll paint your name up in the Pit myself. [He doesn\'t see, over his shoulder, a smaller boy in too-big black slip out from by the fire escape and walk off very fast the other way.]',
        onEnter: (c) => { c.setFlag('cq_gap_crossed'); rep('dauntless', 6); c.addRel(15, true); CQ.ally('bo', 1, 'You crossed the Gap over State Street.'); c.completeQuest('cq_gap', 'secret', 'You crossed the Gap and kept a thirteen-year-old\'s secret. Sid is painting your name up in the Pit.'); },
        endText: '...',
      },
      tell: {
        text: '[All the colour goes out of his face.] Mikey? Mikey\'s THIRTEEN. He hasn\'t even — [He\'s already moving. Then he stops and grabs your arm.] You got him down? [You nod. He lets go.] ...I owe you. I owe you a lot. [He runs.]',
        onEnter: (c) => { c.setFlag('cq_gap_told'); if (F('cq_gap_crossed_roof')) c.setFlag('cq_gap_crossed'); rep('dauntless', 4); c.addRel(25, true); if (F('cq_gap_crossed_roof')) CQ.ally('bo', 1, 'You crossed the Gap over State Street, and brought a boy back with you.'); c.completeQuest('cq_gap', 'told', 'You told Sid his little brother had been stuck on the roof. Sid owes you.'); },
        endText: '...',
      },
      down: {
        text: '[He looks at your face and laughs, but not unkindly.] Yeah. It does that. [He holds up the bandaged hand.] Welcome to the club.',
        onEnter: (c) => { rep('dauntless', -1); c.completeQuest('cq_gap', 'down', 'You came back without a cloth, and kept a thirteen-year-old\'s secret.'); }, endText: '...',
      },
      left_quiet: {
        text: '[He grabs the strip.] You DID it! [He\'s laughing.] I\'ll paint your name up in the Pit tonight. [You hear later that somebody from the Pit cut the chain on the far stairs at midnight and carried a thirteen-year-old down. Nobody asked how long he\'d been up there.]',
        onEnter: (c) => { c.setFlag('cq_gap_crossed'); rep('dauntless', 4); c.note('I crossed the Gap. I left a kid on the far roof to do it.'); c.completeQuest('cq_gap', 'left', 'You crossed the Gap. You left a kid on the far roof, and said nothing.'); },
        endText: '...',
      },
      left_tell: {
        text: '[He goes white.] You left him UP there? [He\'s already running for the fire escape. Over his shoulder:] Keep your cloth!',
        onEnter: (c) => { c.setFlag('cq_gap_crossed'); rep('dauntless', 2); c.addRel(-10, true); c.completeQuest('cq_gap', 'left', 'You crossed the Gap and left Sid\'s brother on the far roof. You told Sid, at least.'); },
        endText: '...',
      },
      help: {
        text: '[He doesn\'t say anything. He just runs. Ten minutes later he comes back with a thirteen-year-old under one arm, both of them shaking.] He\'s my brother. [Gruff.] He\'s an idiot. [He looks at you.] You didn\'t even cross. You could have. [He shakes his head.] Thanks.',
        onEnter: (c) => { c.setFlag('cq_gap_told'); rep('dauntless', 2); rep('abnegation', 2); c.addRel(20, true); c.completeQuest('cq_gap', 'help', 'You didn\'t cross. You came down and got Sid for his brother.'); }, endText: '...',
      },
      after: { text: () => (F('cq_gap_told') ? '[Sid has one hand on his little brother\'s shoulder and doesn\'t seem to be letting go.] Mikey says hello. Mikey\'s grounded until he\'s forty.' : '[Sid salutes you with the bandaged hand.]'), endText: '...' },
    },
  });

  T('cq_mikey', {
    entry: () => (F('cq_gap_told') ? 'with_sid' : 'start'),
    nodes: {
      start: {
        text: '[The kid from the roof, at the foot of the fire escape, still shaking a little.] You won\'t tell him. Right? You won\'t.',
        choices: [{ text: 'I won\'t.', end: true, effect: (c) => c.setMem('promised') }, { text: 'He\'d want to know.', to: 'want' }],
      },
      want: { text: '[He goes red to the ears.] He\'d want to KILL me.', endText: '...' },
      with_sid: { text: '[Mikey won\'t look at you. He\'s grinning anyway.] He\'s not even that mad. He\'s mostly mad.', endText: '...' },
    },
  });

  // six floors up
  const roofDone = () => { Q.setObj('cq_gap', 'climb', 'done'); Q.activate('cq_gap', 'sid'); };
  const kidChoices = [
    { text: 'Hold on. I\'m coming over.', check: { attr: 'agility', dc: 7, roll: true }, to: 'over', fail: 'over_hard' },
    { text: 'There\'s a plank by the tank. Push it across and crawl. Look at me, not down.', check: { attr: 'resolve', dc: 6 }, to: 'plank', fail: 'plank_no', if: () => !F('cq_gap_plank_lost') },
    { text: 'Stay there. Don\'t move. I\'ll get help.', to: 'help' },
  ];
  T('cq_roof', {
    entry: 'start',
    nodes: {
      start: {
        text: '[Six flights of rusted ladder, and up here the wind has nothing to stop it. The gap is what Sid said it was: four metres of nothing over an alley full of bins, and on the far roof a water tank hung with strips of red cloth that crack in the wind.]\n\n[And on the far parapet, flat on his stomach and holding on with both arms, there\'s a kid. Twelve, thirteen. Dauntless black that\'s too big for him. He isn\'t looking at you. He\'s looking down.]',
        choices: [
          { text: 'Hey. Don\'t look down. Look at me.', to: 'kid' },
          { text: '[Ignore him. Take a run at the gap.]', check: { attr: 'agility', dc: 7, roll: true }, to: 'over', fail: 'over_hard' },
        ],
      },
      kid: {
        text: '[He looks at you. His face is white.] I\'m fine. I\'m FINE. I jumped it. I just — I can\'t jump it back. [His voice cracks.] Don\'t tell Sid. He\'s my brother. He\'ll kill me.',
        onEnter: (c) => c.setFlag('cq_gap_met_mikey'),
        choices: kidChoices,
      },
      over: {
        text: '[Six steps of run-up, and you don\'t let yourself think about the seventh. Then there\'s no roof under you, and then there is, and you\'re rolling across gravel with your heart trying to get out through your mouth.]',
        onEnter: (c) => c.setFlag('cq_gap_crossed_roof'), next: 'far', nextText: '[Get up.]',
      },
      over_hard: {
        text: '[You land short. Your chest hits the parapet, your hands find the edge and hold, and for a long second the alley is right there under your boots. Then you\'re up and over, scraped raw and shaking.]',
        onEnter: (c) => { c.setFlag('cq_gap_crossed_roof'); DV.Player.stamina = Math.min(DV.Player.stamina, 15); DV.Stats.addBuff('cq_torn_hands', 'agility', -1, 120, 'Torn hands'); },
        next: 'far', nextText: '[Get up.]',
      },
      far: {
        text: '[The red cloth snaps beside your head. The kid stares at you as if you\'ve stepped out of a story.] The stairs on this side are chained. The only way down is back over.',
        choices: [
          { text: 'Take my hand. We jump together, on three.', to: 'together' },
          { text: '[Pull a strip of cloth off the tank and jump back alone.]', to: 'alone' },
        ],
      },
      together: {
        text: '[You count. On three he doesn\'t move. On the second three he does. You land in a heap on the near roof with the kid on top of you and a strip of red cloth in your fist that you don\'t remember grabbing. He\'s laughing and crying at the same time. At the bottom of the ladder he says "Don\'t tell Sid" once more, and sits down on the kerb like his legs have stopped working.]',
        onEnter: (c) => { c.give('red_cloth'); c.setFlag('cq_gap_mikey_down'); roofDone(); }, endText: '[Climb down.]',
      },
      alone: {
        text: '[You pull a strip of red cloth off the tank and jump back without looking at him. Behind you he calls something. The wind takes most of it.]',
        onEnter: (c) => { c.give('red_cloth'); c.setFlag('cq_gap_left_kid'); roofDone(); }, endText: '[Climb down.]',
      },
      plank: {
        text: '[It takes him a long time. He doesn\'t look down once, because you don\'t let him; you talk the whole way, about nothing, about trains. When he\'s over he sits on the gravel and puts his head between his knees. Then he digs in his pocket and holds out a strip of red cloth.] I took one. Before. Before I couldn\'t get back. [He pushes it at you.] You have it. I didn\'t earn it.',
        choices: [{ text: '[Take it.]', to: 'plank_take' }, { text: 'Keep it. You got across, didn\'t you? Once.', to: 'plank_keep' }],
      },
      plank_take: { text: '[He nods as if that\'s right. At the bottom of the ladder he says "Don\'t tell Sid" one more time, and sits down on the kerb.]', onEnter: (c) => { c.give('red_cloth'); c.setFlag('cq_gap_mikey_down'); roofDone(); }, endText: '[Climb down.]' },
      plank_keep: { text: '[He looks at the cloth, and puts it back in his pocket very carefully, as if it might break. At the bottom of the ladder he says "Don\'t tell Sid" one more time, and sits down on the kerb.]', onEnter: (c) => { c.setFlag('cq_gap_mikey_down'); c.setFlag('cq_gap_mikey_kept'); rep('dauntless', 1); roofDone(); }, endText: '[Climb down.]' },
      plank_no: { text: '[You push the plank out. Halfway across it tips and goes end over end into the bins six floors down. The kid makes a sound you\'ll remember.]', onEnter: (c) => c.setFlag('cq_gap_plank_lost'), next: 'kid2', nextText: '...' },
      kid2: { text: '[He\'s holding on tighter than before.] Okay. Okay. What now?', choices: kidChoices },
      help: { text: '[You tell him to hold on, and not to move, and not to look down. He says something that might be okay. You go down the ladder a lot faster than you came up it.]', onEnter: (c) => { c.setFlag('cq_gap_get_help'); roofDone(); }, endText: '[Climb down.]' },
    },
  });

  /* ============================== APPLES AFTER DARK ============================== */
  T('cq_hank', {
    entry: () => (!Q.started('cq_apples') ? 'start' : !live('cq_apples') ? 'after' : act('cq_apples', 'hank') ? 'report' : 'waiting'),
    nodes: {
      start: {
        text: '[A big man in a faded red shirt sits on the tailgate of an Amity truck stacked with empty apple crates, peeling an apple in one long curl.] Afternoon! You want an apple? Everyone wants an apple.',
        choices: [
          { text: 'Thank you.', to: 'apple', once: true },
          { text: 'Do you drive out to the farms every day?', to: 'drive' },
          { text: 'Goodbye.', end: true },
        ],
      },
      apple: { text: '[He tosses it to you underarm.] Picked yesterday. Tell me it isn\'t the best apple you\'ve had this year.', onEnter: (c) => c.give('apple'), next: 'start', nextText: 'It is.' },
      drive: {
        text: 'Every day, and every night at ten, with the Office\'s pass in the window. [The peel breaks. He looks at it.] Only this week the Office has put a checkpoint at Pulaski, back up the road, and they\'ve started opening the crates. Thirty years, and nobody ever opened my crates.',
        choices: [{ text: 'What\'s in the crates?', to: 'what' }, { text: 'Safe driving.', end: true }],
      },
      what: {
        text: '[He lowers his voice, which for an Amity man is like anyone else whispering.] Tonight? A woman. Erudite. She came to the orchard gate last week asking for work, with hands that had never pulled a weed, and she cried when Mary gave her bread. [He shrugs.] She\'s waiting under the Hancock building for a ride she isn\'t sure is coming. I can\'t leave the truck. Somebody needs to tell her it\'s coming. And somebody needs to find out who\'s on that checkpoint, and what it would take.',
        choices: [
          { text: 'Why is she running?', to: 'why', once: true },
          { text: 'If the Order finds her under your apples, you\'re both finished.', to: 'risk', once: true },
          { text: 'I\'ll do it.', to: 'accept' },
          { text: 'Not my business.', end: true },
        ],
      },
      why: { text: 'Didn\'t ask. Amity don\'t ask. [He picks up the broken peel.] She asked me whether the bread at the farm had anything in it. I said flour. She looked at me as if I\'d said something sad.', next: 'what', nextText: '...' },
      risk: { text: 'Then they\'ll find an old man who gave a girl a lift. [He smiles.] I\'ve been finished before. It\'s never as bad as people think.', next: 'what', nextText: '...' },
      accept: {
        text: '[He beams, as if you\'ve agreed to come to supper.] Blue coat, library book she isn\'t reading, under the Hancock overhang on the Wells side. Tell her the apples are early this year; she\'ll know. And the checkpoint\'s at Pulaski. Be nice to whoever it is. Everyone\'s nicer than they look.',
        onEnter: (c) => c.startQuest('cq_apples'), endText: 'The apples are early this year.',
      },
      waiting: { text: '[Hank checks the tyres again.] Ten o\'clock. Plenty of time. Plenty.', endText: '...' },
      report: {
        text: () => (F('cq_lena_reported') ? '[Hank is sitting on the tailgate. He isn\'t peeling anything.]' : '[Hank has checked the tyres three times.] Well?'),
        choices: [
          { text: 'She\'ll be here at ten. And the checkpoint won\'t be a problem.', if: () => !F('cq_lena_reported'), to: 'good' },
          { text: '...', if: () => F('cq_lena_reported'), to: 'reported' },
        ],
      },
      good: {
        text: () => '[He lets out a breath like a man setting down a sack.] Then the apples go out with one extra apple. [He takes a jar with a cloth lid out of the cab and puts it in your hands.] Honey. From my own hives. Don\'t tell anyone where you got it, or I\'ll have the whole Council at the truck.' + (F('cq_lena_series7') ? ' [Quieter.] She told you, didn\'t she. What she ran from. [He nods at the jar.] That\'s honey. Just honey. I promise you.' : ''),
        onEnter: (c) => { c.give('amity_honey'); c.setFlag('cq_lena_out'); rep('amity', 8); c.addRel(20, true); CQ.ally('mary', 1, 'You helped Hank Barlow drive a frightened woman out to the farms.'); c.completeQuest('cq_apples', 'out', 'At ten o\'clock Hank\'s truck went out to the farms with one extra apple under the crates.'); },
        endText: 'Safe driving.',
      },
      reported: {
        text: 'They took her off the pavement under the Hancock building an hour ago. A van, two of them, very quick. [He looks at you, and there\'s no anger in it, which is worse.] Somebody told them where she\'d be waiting. [He gets down off the tailgate.] I\'ll drive out at ten with apples. Just apples. Go on home.',
        onEnter: (c) => { rep('amity', -6); c.addRel(-30, true); c.completeQuest('cq_apples', 'reported', 'The Order took Lena Ross off the pavement under the Hancock building, because you told them where she was.'); },
        endText: '...',
      },
      after: { text: () => (F('cq_lena_out') ? '[Hank waves an apple at you.] She\'s planting beans. Terrible at it. Happiest I\'ve seen anybody.' : '[Hank nods to you politely, the way you\'d nod to a stranger.]'), endText: '...' },
    },
  });

  const lenaTold = (c) => { if (Q.obj('cq_apples', 'lena') !== 'done') c.setObj('cq_apples', 'lena', 'done'); CQ.applesCheck(); };
  T('cq_lena', {
    entry: () => (live('cq_apples') && act('cq_apples', 'lena') ? 'start' : 'idle'),
    nodes: {
      idle: { text: () => (live('cq_apples') && Q.objDone('cq_apples', 'lena') ? '[She doesn\'t look up from the book, but she smiles.] Ten o\'clock.' : '[A woman in a thin blue coat reads under the Hancock overhang.] Excuse me. I\'m waiting for someone.'), endText: '...' },
      start: {
        text: '[A woman in a blue coat too thin for the weather sits under the Hancock building\'s overhang with a library book she isn\'t reading. She closes it on her finger when you stop.] I\'m waiting for someone.',
        choices: [
          { text: 'Who are you running from?', check: { attr: 'charisma', dc: 6 }, to: 'why', fail: 'why_no', once: true },
          { text: 'You\'re the woman from the fourth floor. Everybody\'s looking for you.', to: 'scare', once: true },
          { text: 'The apples are early this year.', to: 'told' },
        ],
      },
      why: {
        text: '[She looks at you for a long moment.] My name is Lena Ross. I was a laboratory technician on the fourth floor of headquarters until Monday, when they asked me to sign a batch release for a compound called Series 7, and I asked what it was for. [Very quietly.] They said "calm". They said "food". I didn\'t sign. People who don\'t sign, on the fourth floor, get visited.',
        onEnter: (c) => { c.setFlag('cq_lena_series7'); CQ.clue('lena'); },
        choices: [{ text: 'Then go. The apples are early this year.', to: 'told' }],
      },
      why_no: { text: 'From nobody. I\'m waiting for a friend. [She opens the book again, upside down, and doesn\'t notice.]', next: 'start2', nextText: '...' },
      scare: {
        text: '[She goes white.] I don\'t know what you mean. [Her hand is on the book so hard the knuckles show.] Are you — are you with them?',
        choices: [{ text: 'No. Hank sent me. The apples are early this year.', to: 'told' }],
      },
      start2: { text: '[She waits.]', choices: [{ text: 'The apples are early this year.', to: 'told' }] },
      told: {
        text: '[She stands. She\'s shaking, and trying hard to make it look like the cold.] Ten. At the truck. Thank you. [She tucks the book under her arm.] If anyone asks, you never saw a woman in blue.',
        onEnter: lenaTold, endText: 'What woman?',
      },
    },
  });

  const kempDone = (c, how) => { c.setFlag('cq_checkpoint_' + how); if (Q.obj('cq_apples', 'checkpoint') !== 'done') c.setObj('cq_apples', 'checkpoint', 'done'); CQ.applesCheck(); };
  T('cq_kemp', {
    entry: () => (live('cq_apples') && Q.obj('cq_apples', 'checkpoint') === 'active' ? 'start' : 'idle'),
    nodes: {
      idle: { text: '[Officer Kemp leans on the lamppost.] Road\'s open. Move along.', endText: '...' },
      start: {
        text: '[A Dauntless guard in the Office\'s blue armband leans on a lamppost at the Pulaski junction, a folding barrier at his feet and a clipboard under his arm.] Road\'s open till ten. After ten, every truck out gets opened. Orders.',
        choices: [
          { text: 'Whose orders?', to: 'who', once: true },
          { text: 'You don\'t want to be opening forty crates of apples at ten at night.', check: { attr: 'charisma', dc: 7 }, to: 'soft', fail: 'soft_no', once: true },
          { text: '[Hold out an apple] Hank says this is for the long night.', if: () => has('apple'), to: 'bribe' },
          { text: 'Can I see that order? ...It\'s dated tomorrow.', if: () => F('cq_kemp_who'), check: { attr: 'intelligence', dc: 6 }, to: 'paper', fail: 'paper_no', once: true },
          { text: 'There\'s a woman going out under the apple crates tonight. Erudite. She\'s waiting under the Hancock building.', to: 'betray' },
          { text: 'Nothing.', end: true },
        ],
      },
      who: { text: 'Office of Public Order. Somebody on the fourth floor at Erudite lost something, and they think it\'s going out with the apples. [He holds up the clipboard.] Signed and everything.', onEnter: (c) => c.setFlag('cq_kemp_who'), next: 'start', nextText: '...' },
      soft: { text: '[He looks down the road at the crates stacked on Hank\'s truck, and sighs through his nose.] ...I really don\'t. [He makes a mark on the clipboard.] I\'ll open the first three. If the first three are apples, it\'s apples. Tell Hank to pack the back carefully.', onEnter: (c) => kempDone(c, 'soft'), endText: 'I\'ll tell him.' },
      soft_no: { text: 'Don\'t care what I want. [He taps the clipboard.] Orders are orders.', next: 'start', nextText: '...' },
      bribe: { text: '[He takes it like a man who\'s been bribed with apples before, and bites it.] ...Tell Hank I\'ll be reading my clipboard at ten. It\'s a very interesting clipboard.', onEnter: (c) => { take('apple'); kempDone(c, 'bribed'); }, endText: '...' },
      paper: { text: '[He frowns at the clipboard, then at the date, then at you.] ...Tomorrow. [He swears quietly, folds the barrier and tucks it under his arm.] Then I\'m standing in the cold for nothing. [He walks off toward the city without looking back.]', onEnter: (c) => { c.setFlag('cq_checkpoint_gone'); kempDone(c, 'paper'); }, endText: '...' },
      paper_no: { text: '[He pulls the clipboard back.] It says what it says.', next: 'start', nextText: '...' },
      betray: {
        text: '[He\'s already lifting the radio off his belt.] Is there, now. [Into the radio:] Unit nine. The Hancock building, Wells side. A woman in a blue coat. [He looks at you.] The Office thanks you, citizen. There\'ll be a chit for that.',
        onEnter: (c) => {
          c.setFlag('cq_lena_reported'); chit();
          if (Q.obj('cq_apples', 'lena') !== 'done') Q.setObj('cq_apples', 'lena', 'failed');
          CQ.notice(-40); rep('erudite', 5); rep('amity', -10);
          CQ.ally('mary', -1, 'You gave the Order a woman Amity was hiding.');
          kempDone(c, 'reported');
        },
        endText: '...',
      },
    },
  });

  /* ============================== OUT OF HEADQUARTERS ============================== */
  // (the stairs up from the Pit: js/zones/compound.js; the mentors' line: each week's mentor tree)
  T('cq_go_out', {
    entry: 'start',
    nodes: {
      start: {
        text: '[A long flight of stairs cut into the rock, and a door at the top with daylight round the edges. Beyond it, the Dauntless sector, and the rest of the city.]',
        choices: [
          { text: 'Go up into the city.', end: true, effect: () => CQ.goOutSoon() },
          { text: 'Not now.', end: true },
        ],
      },
    },
  });
})();
