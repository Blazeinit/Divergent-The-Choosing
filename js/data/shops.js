/* ==========================================================================
   DIVERGENT — Build 7: the city's shops (data)
   Eight shops you can walk into, one or two to a sector, each with its door
   on a real building front, its hours, the person who keeps it, what it
   sells (and what it'll buy back), an odd job for an hour's pay, and an
   inside (js/zones/shops.js builds it the first time you go in).

     { id, name, sign, short, faction, district, street,
       x, z, face            the door: on the building line, facing n/s/e/w onto the street
                              (js/game/shops.js snaps it to the building as the city built it)
       hours: [open, close]  the clock (DV.Clock); nothing stays open past the curfew at 21:00
       mark                   the price: an item's value (js/data/items.js) times this
       stock: [[item, qty]]  what's on the shelves each morning (it sells out)
       services: [..]        not goods: the tattoo chair
       buys: { ids | cats | all, rate }   what the keeper will take, and for what share of its value
       keeper: an NPC (js/data/npcs.js shape) with its lines; job: { pay, ask, done, gift }
       shoppers: people browsing (DV.Extras sets), by the hour }

   Money is ration scrip (DV.Wallet, js/game/inventory.js): your faction's allowance, paid for
   quests and odd jobs, spent here.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  const STORES = [
    /* ---------------- Abnegation: the ration depot on Grand Avenue ---------------- */
    {
      id: 'depot', name: 'Sector 9 Ration Depot', sign: 'RATION DEPOT  ·  SECTOR 9', short: 'Ration Depot', letter: 'R', colour: '#9a968c',
      faction: 'abnegation', district: 'Abnegation Sector', street: 'Grand Ave', x: -198.6, z: -149.2, face: 's',
      hours: ['07:00', '18:00'], mark: 0.8,
      stock: [['ration_bar', 12], ['bread_roll', 20], ['ration_tin', 10], ['grey_soap', 8], ['mending_kit', 4], ['tallow_candle', 10]],
      buys: { cats: ['consumable'], rate: 0.5, why: 'We take food back. Someone will need it.' },
      keeper: {
        id: 'shop_thomas_kerr', name: 'Thomas Kerr', age: 58, sex: 'm', faction: 'abnegation', title: 'Depot Clerk',
        personality: 'Patient, exact, tired. Counts everything twice and gives most of it away.',
        appearance: { build: 'slim', hair: 'short', hairColor: '#8a8478', height: 0.98 },
        first: '[He looks up from a ledger and closes it over one finger.] Good morning. Rations are on the left, soap and thread on the right. If you\'re short, say so. Nobody here will ask why.',
        again: 'Back again. Take what you need. Only what you need.',
        about: 'The depot feeds whoever comes to the door: Abnegation, factionless, the odd Candor who\'s lost a bet. The lorries come in from Amity at six. We count them in and we count them out, and the scrip is how the counting comes out right. If you have none, you still eat.',
        rumor: 'Four lorries came on Monday. The manifest said five. I wrote it down and gave the page to the council. Nobody has asked me about it since.',
        closed: 'We\'re shut, I\'m afraid. Seven in the morning. Come early: the bread goes first.',
        closing: 'It\'s six. I\'m sorry — I have to lock up and take the ledger to the hall.',
        barks: ['Only what you need.', 'One each, please.', 'Mind the step.'],
      },
      job: { pay: 6, ask: 'There\'s a delivery in the back that wants stacking. Oats, mostly. An hour\'s work, and the office pays six scrip for it.', done: '[You stack sixty sacks of oats in rows of ten, the way he shows you. He counts them twice.] Sixty. Thank you. It\'s written down, so it\'s yours.' },
      charity: { item: 'ration_bar', text: '[He looks at your hands, then at the shelf.] Here. A ration bar. No — put the scrip away. You haven\'t enough to make it worth either of us counting.' },
      shoppers: { faction: 'abnegation', lines: ['After you.', 'They\'ve run out of the brown bread again.', 'I\'m only here for my neighbour.'], sets: [{ id: 'queue', when: [['07:30', '17:30']], people: [{ x: -3.2, z: 4.2, rot: -1.2, act: 'idle' }, { x: 2.6, z: 5.4, rot: Math.PI, act: 'idle' }] }] },
    },

    /* ---------------- Candor: the print shop and newsstand on Monroe Street ---------------- */
    {
      id: 'printshop', name: 'Hale & Daughter, Printers', sign: 'HALE & DAUGHTER  ·  PRINTERS  ·  NEWS', short: 'Print Shop', letter: 'N', colour: '#d8d8d0',
      faction: 'candor', district: 'Candor Sector', street: 'Monroe St', x: -126.4, z: 351.7, face: 'n',
      hours: ['06:00', '20:00'], mark: 1,
      stock: [['candor_paper', 30], ['evening_standard', 24], ['ruled_notebook', 10], ['pencil', 16], ['crossword_book', 4]],
      buys: { ids: ['candor_paper', 'evening_standard', 'ruled_notebook', 'pencil', 'crossword_book', 'pocket_notebook'], rate: 0.4, why: 'Paper I\'ll take back. It\'s all pulp in the end.' },
      keeper: {
        id: 'shop_gloria_hale', name: 'Gloria Hale', age: 52, sex: 'f', faction: 'candor', title: 'Printer',
        personality: 'Blunt, ink to the elbows, impossible to embarrass. Prints the corrections on the front page.',
        appearance: { build: 'average', hair: 'bun', hairColor: '#4a4440', height: 0.97 },
        first: 'You\'re dripping on my floor. [She doesn\'t look up from the type tray.] Papers on the rack, notebooks under the counter, and the press is not for touching. What do you want?',
        again: 'You again. Good. Most people only come in to complain about what we printed.',
        about: 'We print the Daily at four in the morning and the Standard at four in the afternoon. Everything in them is true. Some of it is also boring. That\'s the price of the first thing.',
        rumor: 'An Erudite came in last week and asked who wrote the piece about the lorries. I told him: I did. He asked for my source. I told him no. He said "for now" on his way out. Write that down.',
        closed: 'Shut. The press runs at four; the door opens at six.',
        closing: 'Eight o\'clock. Out you go — I\'ve the morning edition to set.',
        barks: ['Mind the ink.', 'That\'s yesterday\'s. Today\'s is on top.', 'Don\'t lean on the rack.'],
      },
      job: { pay: 7, ask: 'The afternoon edition needs folding, and my daughter\'s at the Mart. Fold three hundred and I\'ll pay you seven.', done: '[Three hundred papers, folded in thirds. There\'s ink to your wrists.] Not bad. Crooked, but not bad. Seven.' },
      shoppers: { faction: 'candor', lines: ['Have you read this? It\'s outrageous. It\'s all true, but it\'s outrageous.', 'I\'m only looking at the headlines.', 'She spelled my name wrong in the letters page. On purpose.'], sets: [{ id: 'rack', when: [['06:30', '19:30']], people: [{ x: 3.4, z: 3.0, rot: Math.PI / 2, act: 'read' }] }] },
    },

    /* ---------------- Erudite: the bookshop and lab supply on Washington Street ---------------- */
    {
      id: 'bookshop', name: 'Lang\'s Books & Scientific', sign: 'LANG\'S  ·  BOOKS & SCIENTIFIC SUPPLY', short: 'Bookshop', letter: 'B', colour: '#2f5f9a',
      faction: 'erudite', district: 'Erudite Sector', street: 'Washington St', x: 299, z: 224.9, face: 'n',
      hours: ['08:00', '20:00'], mark: 1.2,
      stock: [['marsh_guide', 3], ['logic_primer', 4], ['focus_tablets', 8], ['chalk_box', 12], ['ink_bottle', 10], ['ruled_notebook', 6]],
      buys: { ids: ['marsh_guide', 'logic_primer', 'crossword_book', 'pocket_notebook', 'ruled_notebook', 'ink_bottle', 'chalk_box', 'focus_tablets', 'simulation_vial'], rate: 0.45, why: 'Books, glassware and reagents. In good condition, mind.' },
      keeper: {
        id: 'shop_victor_lang', name: 'Victor Lang', age: 61, sex: 'm', faction: 'erudite', title: 'Bookseller',
        personality: 'Precise, dry, curious about everyone. Sells books to people who could read them free, and knows why they pay.',
        appearance: { build: 'slim', hair: 'short', hairColor: '#c8c4bc', height: 1.0, outfit: { acc: ['glasses'] } },
        first: 'Ah. A customer, or someone sheltering from the street? [He sets down a loupe.] Books to the left, by subject and then by author. Glassware and reagents to the right, and you will ask before you touch either.',
        again: 'Welcome back. I\'ve reshelved the natural history. You\'ll notice it\'s better.',
        about: 'Forty years selling books to Erudite who could read them free at headquarters. They come here because the library at headquarters keeps a log of what you borrow. I don\'t.',
        rumor: 'The lab orders from headquarters have tripled since the spring. Syringes, mostly, and a reagent I\'m not supposed to know the name of. I know the name of everything I sell.',
        closed: 'We\'re closed. Eight o\'clock. Knowledge keeps; so will you.',
        closing: 'It\'s eight. I lock the door at eight, not five past. Thank you.',
        barks: ['Spines out, please.', 'That one is not for sale. It is for reading.', 'Hm.'],
      },
      job: { pay: 5, ask: 'A crate of returns wants cataloguing: title, author, condition, on the cards. An hour, five scrip, and you may read what you like while you do it.', done: '[You write out forty-one cards. He checks six at random and finds nothing wrong.] Good. Very good, actually. Here.' },
      shoppers: { faction: 'erudite', lines: ['This edition has a misprint on page forty. I\'m buying it for that.', 'Shh.', 'Do you know if he has the second volume?'], sets: [{ id: 'reader', when: [['09:00', '19:30']], people: [{ x: -2.4, z: 3.6, rot: -Math.PI / 2, act: 'read' }] }] },
    },

    /* ---------------- Dauntless: the tattoo parlour and gear shop on State Street, by Grand ---------------- */
    {
      id: 'tattoo', name: 'Ortega\'s Ink & Gear', sign: 'ORTEGA\'S  ·  INK & GEAR', short: 'Tattoo & Gear', letter: 'T', colour: '#a03024',
      faction: 'dauntless', district: 'Dauntless Sector', street: 'State St', x: 311.7, z: -120.8, face: 'e',
      hours: ['11:00', '21:00'], mark: 1.1,
      stock: [['energy_bar', 16], ['hand_wraps', 6], ['fingerless_gloves', 3]],
      services: [
        { id: 'tattoo_armR', slot: 'armR', name: 'Tattoo: flames, right forearm', price: 12, desc: 'Black flames from the wrist to the elbow. It takes forty minutes and you don\'t get to flinch.' },
        { id: 'tattoo_armL', slot: 'armL', name: 'Tattoo: birds, left forearm', price: 12, desc: 'Three ravens in flight, one for each of something. He won\'t say what; you choose.' },
        { id: 'tattoo_neck', slot: 'neck', name: 'Tattoo: a mark behind the ear', price: 8, desc: 'Small, sharp, and easy to hide under a collar. For people who aren\'t sure yet.' },
      ],
      buys: { ids: ['energy_bar', 'hand_wraps', 'fingerless_gloves', 'leather_band', 'folding_knife'], rate: 0.4, why: 'Gear, if it\'s still got some life in it.' },
      keeper: {
        id: 'shop_danny_ortega', name: 'Danny Ortega', age: 30, sex: 'm', faction: 'dauntless', title: 'Tattoo Artist',
        personality: 'Laconic, steady-handed, kinder than he lets on. Has seen every kind of nerve in that chair.',
        appearance: { build: 'athletic', hair: 'buzzed', hairColor: '#141210', height: 1.04, outfit: { top: 'tank', topColor: '#161617', tattoos: ['armL', 'armR', 'neck'], piercings: ['ear', 'brow'] } },
        first: '[He doesn\'t stop drawing.] Flash is on the wall. Gear\'s in the case. If you\'re here to stare at the needles, stare quietly.',
        again: 'Back for more? They always come back.',
        about: 'Half the compound\'s ink came out of this chair. The other half came out of the Pit, and you can tell. Gloves, wraps, bars for the run. The tattoos are twelve scrip and you don\'t get to cry.',
        rumor: 'Initiates come in the week before the cut asking for something that\'ll make them look braver. I tell them all the same thing: it\'s the face, not the arm.',
        closed: 'Shut. Curfew. Even we go home. Some of us.',
        closing: 'That\'s nine. Curfew. Go on — the Order vans don\'t care how brave you are.',
        barks: ['Don\'t touch the machine.', 'Breathe out.', 'Yeah?'],
      },
      job: { pay: 8, ask: 'Floor needs scrubbing and the needles need boiling. An hour. Eight scrip. Don\'t drink the green bottle.', done: '[You boil the needles, scrub the floor, and do not drink the green bottle.] Clean. Huh. Here.' },
      shoppers: { faction: 'dauntless', lines: ['I\'m getting the whole back done. Eventually.', 'It doesn\'t hurt. It doesn\'t. Stop looking at me.', 'Move, I\'m looking at the flash.'], sets: [{ id: 'flash', when: [['12:00', '20:30']], people: [{ x: -3.6, z: 2.6, rot: -Math.PI / 2, act: 'arms_crossed' }, { x: -2.9, z: 3.4, rot: -2.2, act: 'idle' }] }] },
    },

    /* ---------------- Amity: the produce market on Randolph Street ---------------- */
    {
      id: 'market', name: 'Amity Produce Market', sign: 'AMITY PRODUCE  ·  FRESH FROM THE FARMS', short: 'Produce Market', letter: 'M', colour: '#c0392b',
      faction: 'amity', district: 'Testing District', street: 'Randolph St', x: 74, z: 159.2, face: 'n',
      hours: ['07:00', '17:00'], mark: 0.9,
      stock: [['apple', 30], ['amity_peach', 24], ['honey_jar', 6], ['amity_loaf', 10], ['calming_tea', 8]],
      buys: { ids: ['apple', 'amity_peach', 'honey_jar', 'amity_loaf', 'calming_tea', 'dried_flower', 'bread_roll'], rate: 0.4, why: 'Anything that grew. It goes back to the farm fund.' },
      keeper: {
        id: 'shop_hazel_moore', name: 'Hazel Moore', age: 40, sex: 'f', faction: 'amity', title: 'Market Keeper',
        personality: 'Warm, talkative, sharper than she seems. Gives away almost as much as she sells.',
        appearance: { build: 'average', hair: 'braids', hairColor: '#7e4a22', height: 0.96 },
        first: 'Oh — hello! Come in, come in out of the street. [She wipes her hands on her apron.] Everything came in on the truck this morning. Have a look, and if you can\'t decide, I\'ll decide for you.',
        again: 'There you are again! The peaches are good today. They\'re good every day, but today especially.',
        about: 'The truck comes in at dawn and goes back before dark. We sell what the city wants and give away what it needs. The scrip goes to the farm fund, and the rest goes to whoever\'s hungry, which is mostly the same people.',
        rumor: 'The Dauntless at the gate have started counting the crates on the truck. They never used to. Our council says it\'s nothing. Our council says everything\'s nothing.',
        closed: 'We\'re closed, love. The truck\'s gone home. Seven tomorrow.',
        closing: 'That\'s five! The truck won\'t wait, and neither will I. Off you go — take an apple.',
        barks: ['Smell that.', 'Two for one, if you smile.', 'Mind the crates, love.'],
      },
      job: { pay: 5, ask: 'Help me sort the windfalls? Bruised ones in the soup barrel, good ones out front. An hour, five scrip, and as many bruised apples as you can eat.', done: '[You sort four crates of apples. She was right about the bruised ones.] There. Wasn\'t that nice? Here — and one for the walk.', gift: 'apple' },
      shoppers: { faction: 'amity', lines: ['Isn\'t it lovely in here?', 'I come every day. For the smell, mostly.', 'Peace be with you.'], sets: [{ id: 'bins', when: [['07:30', '16:30']], people: [{ x: 2.2, z: 3.2, rot: 0.6, act: 'idle' }, { x: -3.0, z: 5.0, rot: Math.PI / 2, act: 'idle' }] }] },
    },

    /* ---------------- the factionless: repairs and pawn on Western Avenue, in the ruins ---------------- */
    {
      id: 'pawn', name: 'Gaines\' Repairs', sign: 'GAINES  ·  REPAIRS  ·  BOUGHT & SOLD', short: 'Pawn & Repair', letter: 'P', colour: '#7a6a58',
      faction: 'factionless', district: 'The Factionless Ruins', street: 'Western Ave', x: -231.4, z: 361, face: 'w',
      hours: ['09:00', '20:30'], mark: 1.3,
      stock: [['wind_torch', 2], ['folding_knife', 2], ['valve_radio', 1], ['tallow_candle', 6], ['mending_kit', 2]],
      buys: { all: true, rate: 0.5, why: 'I buy anything that isn\'t stolen. I don\'t ask if it\'s stolen.' },
      keeper: {
        id: 'shop_lou_gaines', name: 'Lou Gaines', age: 66, sex: 'm', faction: 'factionless', title: 'Repairman',
        personality: 'Wary, wry, clever with his hands. Cut from Erudite forty years ago and never says why.',
        appearance: { build: 'heavy', hair: 'messy', hairColor: '#9a948a', height: 0.97 },
        first: '[A man in three coats squints at you over a radio with its back off.] Buying or selling? I buy anything that isn\'t stolen. I don\'t ask if it\'s stolen.',
        again: 'You. Still alive. Good for business.',
        about: 'I mend what the factions throw out and sell it back to whoever\'ll pay. Radios, torches, a kettle now and then. The factionless don\'t draw rations, so we get our scrip the hard way. This is the hard way.',
        rumor: 'There\'s people down the tunnels under Western, meeting. Organising, they call it. A woman runs it, they say. Nobody says her name, and I don\'t ask.',
        closed: 'Closed. Even out here there\'s a curfew, and the Order\'s vans don\'t care whose shop it is.',
        closing: 'Half eight. I\'m putting the shutter down. You don\'t want to be out here when the vans come.',
        barks: ['Don\'t touch that, it\'s live.', 'Everything\'s for sale. Except the stove.', 'Hm? No.'],
      },
      job: { pay: 7, ask: 'Got a box of dead radios. Strip \'em for the valves. Gently. An hour, seven scrip.', done: '[You pull thirty valves out of nine radios. Two break.] Two broke. Twenty-eight\'s good. Here.' },
      shoppers: { faction: 'factionless', lines: ['Don\'t look at me.', 'He gave me two scrip for a kettle. Two.', 'You lost? You look lost.'], sets: [{ id: 'haggle', when: [['10:00', '19:30']], people: [{ x: 3.0, z: 4.4, rot: -Math.PI / 2, act: 'arms_crossed' }] }] },
    },

    /* ---------------- downtown: the diner on Clinton Street ---------------- */
    {
      id: 'diner', name: 'Clinton Street Diner', sign: 'CLINTON STREET DINER  ·  OPEN EARLY', short: 'Diner', letter: 'D', colour: '#c89a3a',
      faction: null, district: 'Downtown', street: 'Clinton St', x: 160.8, z: 297, face: 'e',
      hours: ['06:00', '20:30'], mark: 1,
      stock: [['diner_coffee', 40], ['egg_sandwich', 16], ['soup_cup', 16], ['chocolate_cake', 8]],
      buys: null,
      noBuy: 'This isn\'t a pawn shop, hon. Try Gaines, over in the ruins, if you\'re that hard up.',
      keeper: {
        id: 'shop_margie_dolan', name: 'Margie Dolan', age: 55, sex: 'f', faction: 'candor', title: 'Diner Owner',
        personality: 'Loud, quick, fond of everyone and fooled by nobody. Calls the whole city "hon".',
        appearance: { build: 'heavy', hair: 'ponytail', hairColor: '#b8682a', height: 0.95 },
        first: 'Sit anywhere, hon, it\'s all the same stool. [She\'s already pouring a coffee you didn\'t ask for.] Coffee\'s a scrip, the cake is three, and if you\'re Dauntless the cake is four because you\'ll take two.',
        again: 'Look who it is. The usual?',
        about: 'Thirty years on this corner. Council clerks at breakfast, Erudite at lunch arguing over the salt, Dauntless at night until the curfew throws them out. Everybody eats. That\'s the whole philosophy.',
        rumor: 'Two Order officers sat in that booth Tuesday for three hours on one coffee each, watching the street. I charged them for the booth.',
        closed: 'Kitchen\'s closed, hon. Six in the morning. I\'ll have the pot on.',
        closing: 'Half eight, hon — I\'m turning the sign. Get home before the curfew.',
        barks: ['Order up!', 'Sit, sit.', 'More coffee, hon?'],
      },
      job: { pay: 6, ask: 'Dishes. There\'s always dishes. An hour, six scrip, and a slice of cake if you don\'t break anything.', done: '[You wash, dry and stack what feels like every plate in the city. You break nothing.] Not one! Here. And the cake — I said I would.', gift: 'chocolate_cake' },
      shoppers: { faction: 'erudite', lines: ['The salt is in the wrong place. It\'s always in the wrong place.', 'Mm. Don\'t talk to me before my coffee.', 'Is it true about the cake? It is. It\'s true.'], sets: [{ id: 'booths', when: [['06:30', '20:00']], people: [{ x: 4.0, z: 1.42, rot: 0, act: 'sit', seatY: 0.45, faction: 'erudite' }, { x: 4.4, z: 5.68, rot: Math.PI, act: 'sit', seatY: 0.45, faction: 'candor' }] }] },
    },

    /* ---------------- the Testing District: the clinic and pharmacy on Halsted Street ---------------- */
    {
      id: 'clinic', name: 'Halsted Street Clinic', sign: 'HALSTED STREET CLINIC  ·  PHARMACY', short: 'Clinic & Pharmacy', letter: '+', colour: '#c84a3a',
      faction: 'abnegation', district: 'Testing District', street: 'Halsted St', x: 84.8, z: -30, face: 'e',
      hours: ['08:00', '19:00'], mark: 1,
      stock: [['aspirin', 12], ['bandage_roll', 10], ['electrolyte_salts', 12], ['iron_tonic', 4]],
      buys: { ids: ['aspirin', 'bandage_roll', 'electrolyte_salts', 'iron_tonic', 'focus_tablets'], rate: 0.4, why: 'Medicine I\'ll take back, if it\'s sealed. Somebody will need it.' },
      keeper: {
        id: 'shop_ann_holloway', name: 'Ann Holloway', age: 45, sex: 'f', faction: 'abnegation', title: 'Nurse',
        personality: 'Brisk, gentle hands, no patience for fuss. Notices everything a body is trying not to say.',
        appearance: { build: 'slim', hair: 'bun', hairColor: '#5a4a3a', height: 0.98 },
        first: '[A woman in grey with her sleeves rolled up looks you over, top to bottom, the way nurses do.] Are you hurt? No? Then it\'s the pharmacy counter you want: tablets, salts, bandages. If you are hurt, sit down over there and wait.',
        again: 'Still in one piece? Good.',
        about: 'Abnegation run the clinic; Erudite send the medicines, and a doctor twice a week. We see whoever walks in. Factionless, mostly, and Dauntless initiates who fell off something.',
        rumor: 'We\'ve had three initiates in this month with the same burn on the back of the neck. Each said it was a training accident. The Dauntless don\'t usually lie about where they got hurt. They\'re usually proud of it.',
        closed: 'The clinic\'s shut, unless it\'s an emergency. Is it? Then eight o\'clock.',
        closing: 'It\'s seven. I\'m closing up. If anything hurts in the night, there\'s a bell by the side door.',
        barks: ['Sit, please.', 'Wash your hands.', 'Next.'],
      },
      job: { pay: 5, ask: 'Bandages want rolling, and the shelves want counting against the list. An hour, five scrip.', done: '[You roll forty bandages and find the list two bottles of aspirin short. She writes it down.] Thank you. That\'s the third time this month.' },
      shoppers: { faction: 'factionless', lines: ['I\'m waiting. I\'ve been waiting since eight.', 'It\'s nothing. It\'s my wrist. It\'s nothing.', 'She\'s kind. Don\'t tell her I said so.'], sets: [{ id: 'waiting', when: [['08:30', '18:30']], people: [{ x: -4.4, z: 3.4, rot: Math.PI / 2, act: 'sit', seatY: 0.45 }] }] },
    },
  ];

  // the keepers: people (DV.NPCData), living in their shop's own zone, on the shop's hours
  const at = (m) => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0'); };
  for (const S of STORES) {
    const K = S.keeper, open = DV.U.parseTime(S.hours[0]), close = DV.U.parseTime(S.hours[1]);
    // in a quarter of an hour before the door opens; a short break in the back after one; gone at closing
    const brk = Math.max(open + 60, Math.min(close - 60, 13 * 60));
    DV.NPCData.add({
      id: K.id, name: K.name, age: K.age, sex: K.sex, faction: K.faction, role: 'shop', tier: 2, zone: 'shop_' + S.id, shop: S.id,
      title: K.title + ' — ' + S.name, personality: K.personality, appearance: K.appearance, seed: K.id,
      schedule: [
        { t: at(open - 15), do: 'arrive', to: S.id + '_counter', act: 'type' },
        { t: at(brk), do: 'go', to: S.id + '_back', act: 'clipboard' },
        { t: at(brk + 15), do: 'go', to: S.id + '_counter', act: 'type' },
        { t: at(close), do: 'leave' },
      ],
      barks: K.barks,
      buildDialogue: () => (DV.Shops ? DV.Shops.dialogue(S) : null),
    });
  }

  DV.ShopData = { list: STORES, get: (id) => STORES.find((s) => s.id === id) || null };
})();
