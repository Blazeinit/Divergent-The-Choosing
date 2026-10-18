/* ==========================================================================
   DIVERGENT — the city's side quests (data)
   Six stories out on the streets, one to a part of the city, each with a
   person who asks, people who know more, a choice that costs somebody
   something, and flags the Chalk Year reads afterwards (js/game/campaign.js
   seeds its allies' trust from them; the Casebook takes their clues).

     Last Seen at Hub Central   Toby Kerr (factionless)   the Hub → Merciless Mart → the ruins
     The Night Sheets           Gordon Lyle (Erudite)     Erudite HQ → California station
     Scan Lines                 Iris Dunn (Candor)        Merciless Mart → a drone on Randolph St
     The Ration Card            Ellen Pruitt (Abnegation) California Ave → the Council Hall → Kedzie
     The Gap                    Sid Garrett (Dauntless)   State & Grand → a fire escape, six floors up
     Apples After Dark          Hank Barlow (Amity)       the city's edge → the Hancock → Pulaski

   The people here are NPCs of the Testing Center's zone that nobody
   schedules (`lazy`, `when: false`): js/game/cityquests.js stands them where
   their story says. Their dialogue is js/data/dialogue/city.js.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const CQ = DV.CityQuests;
  const F = (n) => DV.State.flag(n);
  const Q = DV.Quests;
  const act = (q, o) => Q.obj(q, o) === 'active';

  /* ------------------------------ the people ------------------------------ */
  // (built only when you're near: DV.CityQuests makes the model)
  const person = (d) => DV.NPCData.add(Object.assign({ role: 'city', tier: 2, zone: 'testing_center', lazy: true, when: () => false, access: [] }, d));
  const child = (f, sex, seed, age, o) => () => { const a = DV.Character.fromFaction(f, sex, seed, Object.assign({ age }, o || {})); a.child = true; return a; };
  // a Dauntless guard on Order duty: black, the Office's blue armband, a badge (as js/game/order.js dresses them)
  const orderGuard = (seed) => () => {
    const a = DV.Character.fromFaction('dauntless', 'm', seed, { age: 31 });
    Object.assign(a.outfit, { top: 'vest', topColor: '#1b1d22', topColor2: '#262a31', bottom: 'pants', bottomColor: '#17181b', shoes: 'boots', shoeColor: '#0e0e10', acc: ['armband', 'belt', 'badge'], armbandColor: '#3a78d8', tattoos: [], piercings: [] });
    return a;
  };

  person({ id: 'toby_kerr', name: 'Toby Kerr', age: 11, sex: 'm', faction: 'factionless', title: 'Factionless boy, Hub Central steps', dialogue: 'cq_toby',
    personality: 'Eleven, small for it, and older than that in the face. Has been waiting on the station steps since yesterday afternoon.',
    appearanceFn: child('factionless', 'm', 'toby_kerr', 11, { hair: 'messy', hairColor: '#3a2a1c' }) });
  person({ id: 'nell_kerr', name: 'Nell Kerr', age: 15, sex: 'f', faction: 'factionless', title: 'Factionless, Toby\'s sister', dialogue: 'cq_nell',
    personality: 'Quick, proud, frightened and hiding it badly. Feeds her brother by stripping copper out of places it shouldn\'t come out of.',
    appearance: { hair: 'ponytail', hairColor: '#4a3020', height: 0.93, build: 'slim' } });
  person({ id: 'walt_simms', name: 'Walt Simms', age: 63, sex: 'm', faction: 'candor', title: 'Ticket clerk, Merciless Mart station', dialogue: 'cq_walt',
    personality: 'Forty years in a ticket booth. Knows every regular by face and most by name. Candor to the bone, which means he never lies and doesn\'t always talk.',
    appearance: { hair: 'short', hairColor: '#b8b8b0', build: 'heavy' } });
  person({ id: 'gordon_lyle', name: 'Gordon Lyle', age: 46, sex: 'm', faction: 'erudite', title: 'Records clerk, Office of Public Order', dialogue: 'cq_gordon',
    personality: 'A careful man who has made one careless decision too many. Files patrol rotas for the Order and sells copies on the side.',
    appearance: { hair: 'short', hairColor: '#4a3a2a', build: 'average' } });
  person({ id: 'agnes_rudd', name: 'Agnes Rudd', age: 54, sex: 'f', faction: 'abnegation', title: 'On the bench by California station', dialogue: 'cq_agnes',
    personality: 'Knits on the same bench every afternoon. Moves people the Order wants out of the city, and has never once said so out loud.',
    appearance: { hair: 'bun', hairColor: '#8a8478' } });
  person({ id: 'iris_dunn', name: 'Iris Dunn', age: 33, sex: 'f', faction: 'candor', title: 'Reporter, the Candor Daily', dialogue: 'cq_iris',
    personality: 'Writes the stories the Candor Daily is afraid to print, then argues until it prints them. Believes the truth is owed to everyone, including people who would rather not have it.',
    appearance: { hair: 'short', hairColor: '#1c1612' } });
  person({ id: 'ellen_pruitt', name: 'Ellen Pruitt', age: 71, sex: 'f', faction: 'abnegation', title: 'California Avenue', dialogue: 'cq_ellen',
    personality: 'A widow who would sooner go hungry than be a bother, and has. Raising a grandson on one ration card.',
    appearance: { hair: 'bun', hairColor: '#d8d4cc', height: 0.94 } });
  person({ id: 'lydia_crane', name: 'Lydia Crane', age: 38, sex: 'f', faction: 'abnegation', title: 'Volunteer, Abnegation Council Hall', dialogue: 'cq_lydia',
    personality: 'Hands out bread at the Council Hall three mornings a week. Notices everyone and accuses no one.',
    appearance: { hair: 'bun', hairColor: '#5a4030' } });
  person({ id: 'danny_ruiz', name: 'Danny Ruiz', age: 14, sex: 'm', faction: 'factionless', title: 'Factionless, Kedzie Avenue', dialogue: 'cq_danny',
    personality: 'Fourteen and the man of the house. His mother was Abnegation once. He has a six-year-old brother and no ration card.',
    appearance: { hair: 'messy', hairColor: '#1a1410', height: 0.92, build: 'slim' } });
  person({ id: 'sid_garrett', name: 'Sid Garrett', age: 17, sex: 'm', faction: 'dauntless', title: 'Dauntless initiate, State & Grand', dialogue: 'cq_sid',
    personality: 'Loud about everything except the one thing he didn\'t manage. Bandaged hand. Watches the roofs.',
    appearance: { hair: 'buzzed', hairColor: '#2a1d14', build: 'athletic' } });
  person({ id: 'mikey_garrett', name: 'Mikey Garrett', age: 13, sex: 'm', faction: 'dauntless', title: 'Sid\'s brother', dialogue: 'cq_mikey',
    personality: 'Thirteen, born Dauntless, and desperate to be as brave as his brother thinks he is.',
    appearanceFn: child('dauntless', 'm', 'mikey_garrett', 13, { hair: 'buzzed', hairColor: '#2a1d14' }) });
  person({ id: 'hank_barlow', name: 'Hank Barlow', age: 56, sex: 'm', faction: 'amity', title: 'Amity driver, Madison Street', dialogue: 'cq_hank',
    personality: 'Drives apples in and empty crates out, every day for thirty years. Never raises his voice and never asks anyone why they need a ride.',
    appearance: { hair: 'short', hairColor: '#8a6a4a', build: 'heavy', height: 1.04 } });
  person({ id: 'lena_ross', name: 'Lena Ross', age: 29, sex: 'f', faction: 'erudite', title: 'Under the Hancock building', dialogue: 'cq_lena',
    personality: 'A laboratory technician from the fourth floor of Erudite headquarters who refused to sign something. Has not slept properly in a week.',
    appearance: { hair: 'long', hairColor: '#2a1c14', build: 'slim' } });
  person({ id: 'officer_kemp', name: 'Officer Kemp', age: 31, sex: 'm', faction: 'dauntless', title: 'Order checkpoint, Madison & Pulaski', dialogue: 'cq_kemp',
    personality: 'Dauntless on Order duty. Would rather be anywhere else, and lets you know it.',
    appearanceFn: orderGuard('officer_kemp') });

  /* ------------------------------ where they stand ------------------------------ */
  // at: [x, z, facing]. when(): true (stand at `at`), false (not out there), or another [x, z, facing]
  const live = (q) => Q.started(q) && !Q.isDone(q) && !Q.isFailed(q);
  CQ.person('toby_kerr', { at: [121.5, 334, 0], barks: ['Did you come up from the trains?', 'Have you seen a girl in a red scarf?', 'Excuse me — please — excuse me...'], barkIf: () => !Q.started('cq_sister') });
  CQ.person('nell_kerr', {
    at: [-253, 330, 0],
    when: () => {
      if (F('cq_nell_turned_in')) return false;
      // home again: on the steps with her brother
      if (Q.isDone('cq_sister') && (F('cq_nell_home') || F('cq_nell_found'))) return [123.4, 334.3, -0.3];
      if (Q.isDone('cq_sister')) return false;
      return true;
    },
  });
  CQ.person('walt_simms', { at: [-118.5, 269, Math.PI / 2], barks: ['Circle Line, both ways. Mind the gates.', 'Paper\'s yesterday\'s. Still true.'] });
  CQ.person('gordon_lyle', { at: [262, 288.5, Math.PI], when: () => !F('cq_sheets_reported') && !F('cq_gordon_gone'), barks: ['You there. You look like you walk a lot.', 'Do you walk a lot?'], barkIf: () => !Q.started('cq_sheets') });
  CQ.person('agnes_rudd', { at: [-310, -53, -Math.PI / 2], when: () => !F('cq_agnes_taken') });
  CQ.person('iris_dunn', { at: [-128, 288.5, Math.PI], barks: ['Do the drones ever stop over you?', 'You — have you been scanned this week?'], barkIf: () => !Q.started('cq_scan') });
  CQ.person('ellen_pruitt', { at: [-308.5, -22.5, -Math.PI / 2], barks: ['Good afternoon.', 'Don\'t let me keep you.'], barkIf: () => !Q.started('cq_card') });
  CQ.person('lydia_crane', { at: [-280, -93.5, 0] });
  CQ.person('danny_ruiz', { at: [-382.5, -155, -Math.PI / 2], act: 'lean' });
  CQ.person('sid_garrett', { at: [313, -158, Math.PI / 2], act: 'lean', barks: ['You look like you\'ve never jumped anything in your life.', 'Hey. You. Brave enough for a roof?'], barkIf: () => !Q.started('cq_gap') });
  CQ.person('mikey_garrett', {
    at: [313, -181, Math.PI / 2],
    // down from the roof with you (and, if Sid knows, with his brother)
    when: () => (F('cq_gap_told') ? [314.6, -157.2, Math.PI / 2] : F('cq_gap_mikey_down') && !Q.isDone('cq_gap')),
  });
  CQ.person('hank_barlow', { at: [-489, 284, -2.3], barks: ['Apple? Everyone wants an apple.', 'Afternoon!'], barkIf: () => !Q.started('cq_apples') });
  CQ.person('lena_ross', { at: [208, 229.5, Math.PI], when: () => !F('cq_lena_reported') && !Q.isDone('cq_apples') });
  CQ.person('officer_kemp', { at: [-463.5, 287, -Math.PI / 2], act: 'guard', when: () => live('cq_apples') && !F('cq_checkpoint_gone') });

  /* ------------------------------ things ------------------------------ */
  // the drone that came down on Randolph Street: on its back in the gutter, one rotor bent
  CQ.object('drone', {
    x: 111, z: 142, y: 0.3, radius: 2.0, kind: 'action', label: 'Look at', name: 'Downed Drone',
    show: () => !F('cq_drone_taken'),
    cond: () => !F('cq_drone_taken'),
    onUse: () => DV.Dialogue.startScene('cq_drone', { speaker: 'Randolph Street', faction: 'erudite' }),
    rot: 0.5, mx: 111.3, mz: 142.6,
    mesh(M) {
      const body = [0.16, 0.17, 0.19], arm = [0.25, 0.26, 0.28], blue = [0.23, 0.47, 0.85];
      M.push(0, 0.12, 0, 0, 0.15, 3.0); // (upside down, tipped on one arm)
      M.box(0, 0, 0, 0.5, 0.16, 0.62, body);
      M.box(0, 0.1, -0.04, 0.32, 0.06, 0.36, [0.3, 0.32, 0.36]);
      M.box(0, 0, 0, 0.52, 0.05, 0.12, blue);
      for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        M.push(x * 0.3, 0.02, z * 0.33, Math.atan2(x, z), 0, x > 0 && z > 0 ? 0.6 : 0);
        M.box(0, 0, 0.12, 0.06, 0.05, 0.3, arm);
        M.box(0, 0.05, 0.28, 0.36, 0.01, 0.05, [0.1, 0.1, 0.11]);
        M.pop();
      }
      M.pop();
      M.box(0.9, 0.01, -0.3, 0.9, 0.01, 0.06, [0.85, 0.8, 0.2]); // (a strip of Order tape)
    },
  });
  // the fire escape up the side of the warehouse on State Street: six floors of it to the roof
  CQ.object('fire_escape', {
    x: 313, z: -184.5, y: 1.2, radius: 1.8, kind: 'action', label: 'Climb', name: 'Fire Escape',
    cond: () => act('cq_gap', 'climb'),
    onUse: () => DV.Dialogue.startScene('cq_roof', { speaker: 'The Roof', faction: 'dauntless' }),
    mx: 312.85, mz: -184.5,
    mesh(M) {
      const iron = [0.22, 0.17, 0.14], rust = [0.38, 0.2, 0.12];
      for (let k = 0; k < 6; k++) {
        const y = 3.2 + k * 3.1;
        M.box(0.55, y, 0, 1.1, 0.06, 2.6, iron); // the landing
        M.box(1.08, y + 0.5, 0, 0.04, 0.04, 2.6, rust); // its rail
        for (const z of [-1.27, 1.27]) M.box(1.08, y + 0.25, z, 0.04, 0.5, 0.04, rust);
        // the ladder to the next one (or, from the first, the drop ladder to the street)
        M.push(0.75, y - 1.55, k % 2 ? 0.7 : -0.7, 0, k % 2 ? -0.5 : 0.5, 0);
        for (const x of [-0.18, 0.18]) M.box(x, 0, 0, 0.04, 3.2, 0.04, iron);
        for (let r = 0; r < 9; r++) M.box(0, -1.4 + r * 0.35, 0, 0.36, 0.03, 0.03, rust);
        M.pop();
      }
    },
  });
  // the Office of Public Order's front desk, through the door on Armitage Avenue
  CQ.object('order_desk', {
    x: 207, z: -404.5, y: 1.2, radius: 2.0, kind: 'action', label: 'Report', name: 'Order Station — Front Desk',
    cond: () => DV.CityQuests.reportable(),
    onUse: () => DV.Dialogue.startScene('cq_desk', { speaker: 'Desk Sergeant', faction: 'dauntless' }),
  });
  // something worth telling the Office about?
  CQ.reportable = () => act('cq_sister', 'desk') || Q.isActive('cq_sheets') || (Q.isActive('cq_scan') && DV.Inventory.has('drone_log_card'));

  /* ------------------------------ clues for the Casebook ------------------------------ */
  CQ.clueText('scan', 'A drone\'s log card from Randolph Street: most scans take two seconds, but some are held for ten and filed "APTITUDE ANOMALY — FORWARD: DIRECTORATE". The drones are looking for the Divergent.');
  CQ.clueText('lena', 'Lena Ross, a technician from the fourth floor of Erudite headquarters, refused to sign a batch release for something called Series 7. She was told it was "for calm". For food.');
  CQ.clueText('gordon', 'The Order feeds false patrol rotas to the people who move families out of the city, to catch them on the night the streets look empty. A lieutenant in a plain coat gave Gordon Lyle the page to sell.');

  /* ------------------------------ items ------------------------------ */
  const items = {
    tin_whistle: {
      name: 'Tin Whistle', cat: 'misc', usable: true,
      desc: 'A dented tin whistle on a bootlace. Toby Kerr\'s, until he gave it to you.',
      use: { type: 'read', title: 'Tin Whistle', text: 'Two notes, one high and one low. "That\'s how Nell knows it\'s me," he said. "If you ever need one of us. Under the tracks, they all know that whistle."' },
      icon: { shape: 'token', color: '#a8a8a0' },
    },
    copper_wire: {
      name: 'Coil of Copper Wire', cat: 'quest', quest: true,
      desc: 'Signal cable stripped out of a Circle Line junction box, coiled tight and wrapped in a rag. Heavier than it looks.',
      icon: { shape: 'token', color: '#c07a3a' },
    },
    night_sheets: {
      name: 'Gordon\'s Envelope', cat: 'quest', quest: true, usable: true,
      desc: 'A plain envelope, unsealed: a copy of the Office of Public Order\'s night rota for the coming week.',
      use: { type: 'action', action: 'cqReadSheets' }, icon: { shape: 'paper', color: '#dfe6ee' },
    },
    drone_log_card: {
      name: 'Drone Log Card', cat: 'quest', quest: true, usable: true,
      desc: 'A grey card the size of a stamp, from the belly of an Order drone. Its last night on Randolph Street, in rows of numbers.',
      use: { type: 'action', action: 'cqReadCard' }, icon: { shape: 'card', color: '#5a6068', color2: '#3a78d8' },
    },
    candor_special: {
      name: 'The Candor Daily (late edition)', cat: 'misc', usable: true,
      desc: 'Iris Dunn\'s front page, still smelling of ink.',
      use: { type: 'action', action: 'cqReadSpecial' }, icon: { shape: 'paper', color: '#e8e6de' },
    },
    ellen_card: {
      name: 'Ellen Pruitt\'s Ration Card', cat: 'quest', quest: true,
      desc: 'A grey card stamped ABNEGATION — HOUSEHOLD OF TWO, with a week of squares still to be punched.',
      icon: { shape: 'card', color: '#9a968c' },
    },
    grey_scarf: {
      name: 'Grey Knitted Scarf', cat: 'misc', usable: true,
      desc: 'Plain grey wool, long enough to go round twice. Ellen Pruitt knitted it for her grandson, who has three.',
      use: { type: 'read', title: 'Grey Knitted Scarf', text: 'There is a darned patch near one end, done so neatly you have to look for it.\n\nIt is very warm.' },
      icon: { shape: 'shirt', color: '#8d8d86' },
    },
    red_cloth: {
      name: 'Strip of Red Cloth', cat: 'misc', usable: true,
      desc: 'Torn from the bundle tied to a water tank six floors over State Street.',
      use: { type: 'read', title: 'Strip of Red Cloth', text: 'Somebody has written on it in marker, very small, the way initiates write things they don\'t want laughed at: "I DID IT ANYWAY."' },
      icon: { shape: 'token', color: '#b82a1c' },
    },
    amity_honey: {
      name: 'Jar of Amity Honey', cat: 'consumable', stack: true, usable: true,
      desc: 'Dark orchard honey in a jar with a cloth lid. Hank Barlow\'s, from his own hives. Steadies you. (+1 Resolve, 2 hours)',
      use: { type: 'buff', attr: 'resolve', amount: 1, minutes: 120, label: 'Honeyed', sound: 'drink' }, icon: { shape: 'bottle', color: '#d89a28' },
    },
    order_chit: {
      name: 'Order Commendation Chit', cat: 'misc', usable: true,
      desc: 'A printed slip from the Office of Public Order\'s front desk, stamped and initialled.',
      use: { type: 'read', title: 'Office of Public Order', text: 'CITIZEN COMMENDATION\n\nThe bearer has assisted the Office in the maintenance of public order and is to be shown every courtesy.\n\n(It has your name on it, spelled right. They knew how to spell it before you told them.)' },
      icon: { shape: 'paper', color: '#c8d4e8' },
    },
  };
  for (const id in items) { items[id].id = id; DV.Items.defs[id] = items[id]; }

  /* ------------------------------ the quests ------------------------------ */
  const QD = (d) => DV.QuestDB.add(Object.assign({ type: 'side' }, d));
  QD({
    id: 'cq_sister', title: 'Last Seen at Hub Central', giver: 'toby_kerr',
    summary: 'Toby Kerr, a factionless boy of eleven, has been waiting on the steps of Hub Central since yesterday. His sister Nell went down to the Circle Line to sell something at Merciless Mart and never came back up.',
    objectives: [
      { id: 'mart', text: 'Ask the ticket clerk at Merciless Mart station (one stop west of Hub Central on the Circle Line)', target: { npc: 'walt_simms' } },
      { id: 'ruins', text: 'Look for Nell in the factionless ruins west of the Mart', hidden: true, target: { npc: 'nell_kerr' } },
      { id: 'desk', text: 'Tell the Order where the copper thief is hiding (Order Station, Armitage Avenue)', hidden: true, target: { x: 207, z: -404.5 } },
      { id: 'toby', text: 'Go back to Toby at Hub Central', hidden: true, target: { npc: 'toby_kerr' } },
    ],
    rewards: { xp: 120 },
    completeText: 'Toby isn\'t waiting on the steps any more.',
  });
  QD({
    id: 'cq_sheets', title: 'The Night Sheets', giver: 'gordon_lyle',
    summary: 'Gordon Lyle files patrol rotas for the Office of Public Order and sells copies to people who need to know where the patrols won\'t be. He is watched, and he needs a courier.',
    objectives: [
      { id: 'carry', text: 'Take Gordon\'s envelope to Agnes, on the bench by California station (Abnegation sector)', target: { npc: 'agnes_rudd' } },
      { id: 'gordon', text: 'Go back to Gordon at Erudite Headquarters', hidden: true, target: { npc: 'gordon_lyle' } },
    ],
    rewards: { xp: 120 },
    completeText: 'The night sheets have gone where they were going.',
  });
  QD({
    id: 'cq_scan', title: 'Scan Lines', giver: 'iris_dunn',
    summary: 'Iris Dunn writes for the Candor Daily. The Office says a drone scan reads your face and nothing else. She has eleven people who say otherwise, and no proof.',
    objectives: [
      { id: 'drone', text: 'Find the drone that came down on Randolph Street, by Halsted (Testing District)', target: { x: 111, z: 142 } },
      { id: 'iris', text: 'Bring what you found to Iris outside the Merciless Mart', hidden: true, target: { npc: 'iris_dunn' } },
    ],
    rewards: { xp: 130 },
    completeText: 'What the drones keep is out of the alley, one way or another.',
  });
  QD({
    id: 'cq_card', title: 'The Ration Card', giver: 'ellen_pruitt',
    summary: 'Ellen Pruitt lost her ration card at the bread line by the Council Hall. She will not report it, because Abnegation do not complain. Without it there is no bread for her and her grandson this week.',
    objectives: [
      { id: 'lydia', text: 'Ask Lydia, the volunteer at the Abnegation Council Hall, about the bread line', target: { npc: 'lydia_crane' } },
      { id: 'danny', text: 'Find the boy who ran west along Grand Avenue toward Kedzie', hidden: true, target: { npc: 'danny_ruiz' } },
      { id: 'ellen', text: 'Go back to Ellen Pruitt on California Avenue', hidden: true, target: { npc: 'ellen_pruitt' } },
      { id: 'return', text: 'Take the card back to Danny, and say you found it in the street', hidden: true, target: { npc: 'danny_ruiz' } },
    ],
    rewards: { xp: 110 },
    completeText: 'Somebody will eat this week who might not have.',
  });
  QD({
    id: 'cq_gap', title: 'The Gap', giver: 'sid_garrett',
    summary: 'Six floors over State Street there is a four-metre gap between two warehouse roofs. Every initiate who crosses it ties a strip of red cloth to the water tank on the far side. Sid Garrett didn\'t make it. He has dared you to.',
    objectives: [
      { id: 'climb', text: 'Climb the fire escape on State Street, south of the station, and cross the gap', target: { x: 313, z: -184.5 } },
      { id: 'sid', text: 'Go back to Sid at State & Grand', hidden: true, target: { npc: 'sid_garrett' } },
    ],
    rewards: { xp: 100 },
    completeText: 'You came down off the roof.',
  });
  QD({
    id: 'cq_apples', title: 'Apples After Dark', giver: 'hank_barlow',
    summary: 'Hank Barlow drives an Amity truck out to the farms every night after curfew. Tonight there is a woman to go out under the apple crates, and a new Order checkpoint at Pulaski that has started opening them.',
    objectives: [
      { id: 'lena', text: 'Tell the woman waiting under the Hancock building that the truck leaves at ten', target: { npc: 'lena_ross' } },
      { id: 'checkpoint', text: 'Find out about the Order checkpoint at Madison & Pulaski', parallel: true, target: { npc: 'officer_kemp' } },
      { id: 'hank', text: 'Go back to Hank at his truck on Madison Street', hidden: true, target: { npc: 'hank_barlow' } },
    ],
    rewards: { xp: 130 },
    completeText: 'The truck went out to the farms at ten.',
  });
  // both errands done: back to the truck
  CQ.applesCheck = () => {
    const done = (o) => Q.obj('cq_apples', o) === 'done' || Q.obj('cq_apples', o) === 'failed';
    if (done('lena') && done('checkpoint')) Q.activate('cq_apples', 'hank');
  };

  /* ------------------------------ things you can read ------------------------------ */
  const A = DV.Actions = DV.Actions || {};
  // the rota: anyone who reads it can see what's missing
  A.cqReadSheets = () => {
    DV.State.setFlag('cq_sheets_read');
    return { read: { title: 'Office of Public Order — Night Rota (copy)', text: 'NIGHT DUTY · 21:00–06:00 · SECTORS 1–7\n\nMON  Abnegation: units 4, 9 (Western–Kedzie)   Candor: 2   Testing: 6\nTUE  Abnegation: units 4, 9   Candor: 2, 11   Testing: 6\nWED  Abnegation: units 4, 9   Candor: 2   Testing: 6, 12\nTHU  Abnegation: — NO UNIT ASSIGNED —   Candor: 2, 11   Testing: 6\nFRI  Abnegation: units 4, 9   Candor: 2   Testing: 6\n\nDrones: rounds as standing order 7. Scans as standing order 7(b).\n\n(Every night of the week the grey streets have two units walking them. On Thursday night, none at all.)' } };
  };
  // the card from the drone: the rows of a night, and the line that matters
  A.cqReadCard = () => {
    DV.State.setFlag('cq_card_read');
    const p = DV.State.data.player, div = !!DV.State.data.aptitude.divergent, me = (p.name || 'CANDIDATE').toUpperCase();
    const rows = [
      '21:02  SCAN  WARD, S.         ABNEGATION   2.0s  STANDARD',
      '21:09  SCAN  MORALES, J.      ' + (DV.State.flag('pd_shared') ? 'ERUDITE      ' : 'CANDOR       ') + '9.6s  APTITUDE ANOMALY  > FWD DIRECTORATE',
      '21:14  SCAN  ' + (me + '              ').slice(0, 17) + (p.faction ? (p.faction.toUpperCase() + '          ').slice(0, 13) : 'UNDECIDED    ') + (div ? '10.2s APTITUDE ANOMALY  > FWD DIRECTORATE' : '2.1s  STANDARD'),
      '21:31  SCAN  OKAFOR, M.       CANDOR       1.9s  STANDARD',
      '21:40  SCAN  WEBB, D.         ABNEGATION   9.9s  APTITUDE ANOMALY  > FWD DIRECTORATE',
      '21:52  FAULT ROTOR 3 · ALT LOSS · GROUND CONTACT',
    ];
    if (Q.isActive('cq_scan')) CQ.clue('scan');
    return { read: { title: 'Drone Log Card — Unit 7-14', text: 'OFFICE OF PUBLIC ORDER · UNIT 7-14 · ROUND: RANDOLPH / HALSTED\n\n' + rows.join('\n') + '\n\nStanding order 7(b): holds over two seconds are logged with the subject\'s aptitude record.\n\n' + (div ? '(Your own name is the third line. Ten seconds. The same words as the others.)' : '(Your own name is on it too, two seconds, STANDARD. The ones held for ten all have the same words after them.)') } };
  };
  // Iris's front page, as she ran it
  A.cqReadSpecial = () => {
    const red = DV.State.flag('cq_scan_redacted');
    return { read: { title: 'The Candor Daily — Late Edition', text: 'DRONES KEEP MORE THAN YOUR FACE\nBy Iris Dunn\n\nThe Office of Public Order says a drone scan reads a citizen\'s face, name and faction, and nothing else. A log card recovered from a drone that came down on Randolph Street this week shows otherwise. Most scans last two seconds. Some last ten, and each of those is filed with the citizen\'s aptitude record and marked for the Erudite Directorate.\n\n' + (red ? 'This paper has seen the names on the card. It has not printed them, at the request of the person who brought it to us. That is the first time this paper has agreed to such a request. It may not be the last.' : 'The names on the card are printed in full on page two. If yours is among them, this paper believes you have a right to know why.') + '\n\nThe Office declined to comment.' } };
  };
})();
