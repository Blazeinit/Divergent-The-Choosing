/* ==========================================================================
   DIVERGENT — item definitions
   category: clothing | consumable | quest | misc
   use: { type: 'equip'|'stamina'|'buff'|'read', ... }
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  const items = {
    /* ---------------- clothing ---------------- */
    neutral_garments: {
      name: 'Neutral Testing Garments', cat: 'clothing', usable: true,
      desc: 'Plain undyed shirt and trousers issued to candidates who choose to test without their faction colors. Few do.',
      use: { type: 'equip', outfit: 'neutral' }, icon: { shape: 'shirt', color: '#cfc9bb' },
    },
    clothes_abnegation: {
      name: 'Abnegation Greys', cat: 'clothing', usable: true,
      desc: 'Your family\'s clothes. Loose grey fabric, no ornament, carefully mended at the cuffs.',
      use: { type: 'equip', outfit: 'abnegation' }, icon: { shape: 'shirt', color: '#7d7d78' },
    },
    clothes_dauntless: {
      name: 'Dauntless Blacks', cat: 'clothing', usable: true,
      desc: 'A black jacket that smells faintly of smoke and train oil. Heavy boots.',
      use: { type: 'equip', outfit: 'dauntless' }, icon: { shape: 'shirt', color: '#1d1d1f' },
    },
    clothes_erudite: {
      name: 'Erudite Blues', cat: 'clothing', usable: true,
      desc: 'A pressed blue blazer. Blue calms the mind, your parents said. It has never calmed yours.',
      use: { type: 'equip', outfit: 'erudite' }, icon: { shape: 'shirt', color: '#2f5f9e' },
    },
    clothes_candor: {
      name: 'Candor Black & White', cat: 'clothing', usable: true,
      desc: 'Black jacket, white shirt, black tie. Clean lines. Nothing to hide.',
      use: { type: 'equip', outfit: 'candor' }, icon: { shape: 'shirt', color: '#1b1b1b', color2: '#f0efe9' },
    },
    clothes_amity: {
      name: 'Amity Harvest Clothes', cat: 'clothing', usable: true,
      desc: 'A red tunic and brown trousers, soft from a hundred washes in orchard water.',
      use: { type: 'equip', outfit: 'amity' }, icon: { shape: 'shirt', color: '#c0392b' },
    },

    /* ---------------- consumables ---------------- */
    water_cup: {
      name: 'Paper Cup of Water', cat: 'consumable', stack: true, usable: true,
      desc: 'Lukewarm, slightly metallic. Restores stamina.',
      use: { type: 'stamina', amount: 40, sound: 'drink' }, icon: { shape: 'cup', color: '#d8e4ec' },
    },
    ration_bar: {
      name: 'Ration Bar', cat: 'consumable', stack: true, usable: true,
      desc: 'Pressed grain and dried fruit from Amity orchards, wrapped in grey paper. Restores a lot of stamina.',
      use: { type: 'stamina', amount: 70 }, icon: { shape: 'bar', color: '#b8955a' },
    },
    coffee: {
      name: 'Staff Coffee', cat: 'consumable', stack: true, usable: true,
      desc: 'Strong, bitter, strictly for staff. Sharpens the senses for a while. (+1 Perception, 1 hour)',
      use: { type: 'buff', attr: 'perception', amount: 1, minutes: 60, label: 'Caffeinated', sound: 'drink' }, icon: { shape: 'cup', color: '#5a3a22' },
    },
    calming_tea: {
      name: 'Amity Calming Tea', cat: 'consumable', stack: true, usable: true,
      desc: 'A paper sachet of something floral steeped in hot water. Steadies the nerves. (+1 Resolve, 2 hours)',
      use: { type: 'buff', attr: 'resolve', amount: 1, minutes: 120, label: 'Calm', sound: 'drink' }, icon: { shape: 'cup', color: '#e0a526' },
    },
    // what the city's stalls and volunteers hand out (js/game/citylife.js)
    apple: {
      name: 'Amity Apple', cat: 'consumable', stack: true, usable: true,
      desc: 'Red, a little bruised, picked this morning in the orchards inside the Fence. Restores some stamina.',
      use: { type: 'stamina', amount: 25 }, icon: { shape: 'token', color: '#b8281c' },
    },
    bread_roll: {
      name: 'Abnegation Bread', cat: 'consumable', stack: true, usable: true,
      desc: 'A plain brown roll, still warm, handed out on the pavement by a volunteer in grey. Restores stamina.',
      use: { type: 'stamina', amount: 35 }, icon: { shape: 'bar', color: '#c58d4c' },
    },
    candor_paper: {
      name: 'The Candor Daily', cat: 'misc', stack: true, usable: true,
      desc: 'Today\'s paper. Every word of it, they swear, true.',
      use: { type: 'read', title: 'The Candor Daily', text: 'COUNCIL MEETS ON CHOOSING DAY ARRANGEMENTS\n\nThe Abnegation-led council confirmed today that the Choosing Ceremony will be held at the Hub as in every year. Erudite representatives asked, again, that the ceremony be "reviewed for efficiency". The request was noted.\n\nORDER OFFICE EXTENDS NIGHT PATROLS\n\nThe Office of Public Order will keep drones over the streets after nine each night "until further notice". Asked why, a spokesman said only that citizens should stay indoors after dark and report anything unusual. Asked whether this had anything to do with the body found by the river last week, he said he would not comment on rumours.\n\nLETTERS: "My neighbour waters his plants at four in the morning. I have told him to his face. He says I am too honest. There is no such thing." \u2014 R., Sector 2' },
      icon: { shape: 'paper', color: '#e8e6de' },
    },
    peppermint: {
      name: 'Peppermint', cat: 'consumable', stack: true, usable: true,
      desc: 'A hard white candy. Small comfort. Restores a little stamina.',
      use: { type: 'stamina', amount: 15 }, icon: { shape: 'token', color: '#f0f0f0' },
    },

    /* ---------------- quest items ---------------- */
    name_badge: {
      name: 'Name Badge 4-17', cat: 'quest', quest: true, usable: true,
      desc: 'A laminated clip-on badge, still warm from the reception press. Your name, your group, your room. Show it at the security arch; keep it on all day.',
      use: { type: 'action', action: 'showBadge' },
      badgeText: 'APTITUDE TESTING CENTER — SECTOR 4\n\nCANDIDATE 4-17: {name}\nGROUP: 4\nROOM: 4\nTECHNICIAN: C. DAWSON\n\nWear this badge where it can be seen at all times. Present it at security. Do not discuss your results with other candidates.',
      icon: { shape: 'card', color: '#e8e0c8' },
    },
    wooden_bird: {
      name: 'Carved Wooden Bird', cat: 'quest', quest: true,
      desc: 'A small bird carved from pale wood, worn smooth by a thumb. Initials on the base: L.B.',
      icon: { shape: 'token', color: '#c8a070' },
    },
    sealed_envelope: {
      name: 'Sealed Envelope', cat: 'quest', quest: true, usable: true,
      desc: 'Addressed to Dr. A. Pierce, Administration. The seal is cheap — it would lift with a fingernail.',
      use: { type: 'action', action: 'readEnvelope' }, icon: { shape: 'paper', color: '#e8e0c8' },
    },
    signed_form: {
      name: 'Signed Schedule Amendment', cat: 'quest', quest: true,
      desc: 'A schedule amendment with Dr. Pierce\'s looping signature. For Martha at reception.',
      icon: { shape: 'paper', color: '#e0e8f0' },
    },
    staff_keycard: {
      name: 'Proctor\'s Keycard', cat: 'quest', quest: true,
      desc: 'A white plastic keycard on a frayed blue lanyard. LIN, S. — PROCTOR ACCESS. It opens the Proctor Station and Observation Gallery.',
      icon: { shape: 'card', color: '#f0f0f0', color2: '#3b72b6' },
    },
    storage_key: {
      name: 'Storage Room Key', cat: 'quest', quest: true,
      desc: 'A brass key on a ring with a paper tag: STORAGE. Gus would like it back.',
      icon: { shape: 'key', color: '#c8a040' },
    },
    records_key: {
      name: 'Records Archive Key', cat: 'quest', quest: true,
      desc: 'A small steel key labeled RECORDS in neat Abnegation handwriting.',
      icon: { shape: 'key', color: '#a8a8a8' },
    },
    protocol_file: {
      name: 'File: PROTOCOL D', cat: 'quest', quest: true, usable: true,
      desc: 'A thin grey folder stamped RESTRICTED — ERUDITE OVERSIGHT.',
      use: { type: 'read', title: 'PROTOCOL D (excerpt)', text: 'PROTOCOL D — HANDLING OF IRREGULAR APTITUDE RESULTS\n\n1. Any result showing equal aptitude for more than one faction is to be reported to Erudite Oversight within one hour.\n2. The administering technician must NOT inform the candidate of the irregularity.\n3. Candidates flagged under Protocol D will be "monitored through initiation" by the receiving faction\'s liaison.\n4. Technicians who fail to report are subject to review.\n\nAuthorized: J. M. — Erudite Oversight\n\n(Someone has underlined "monitored" twice in pencil.)' },
      icon: { shape: 'paper', color: '#8d8d86' },
    },
    result_slip: {
      name: 'Aptitude Result Slip', cat: 'quest', quest: true, usable: true,
      desc: 'Your official aptitude result, stamped by your technician.',
      use: { type: 'action', action: 'readResultSlip' }, icon: { shape: 'paper', color: '#f0e8d0' },
    },

    /* ---------------- miscellaneous ---------------- */
    grey_handkerchief: {
      name: 'Grey Handkerchief', cat: 'misc', usable: true,
      desc: 'Plain grey cotton. Your mother pressed it into your hand this morning without a word.',
      use: { type: 'read', title: 'Grey Handkerchief', text: 'Folded inside is a slip of paper in your mother\'s careful hand:\n\n"Whatever you see in there, you are still ours. — M."' },
      icon: { shape: 'paper', color: '#8d8d86' },
    },
    leather_band: {
      name: 'Leather Wrist Band', cat: 'misc', usable: true,
      desc: 'A scuffed black band your older cousin wore through initiation. He said it was lucky. He also said a lot of things.',
      use: { type: 'read', title: 'Leather Wrist Band', text: 'Scratched into the inside with a knife point:\n\n"JUMP FIRST. THINK LATER."' },
      icon: { shape: 'token', color: '#2a2018' },
    },
    pocket_notebook: {
      name: 'Pocket Notebook', cat: 'misc', usable: true,
      desc: 'Your study notes on the aptitude test, mostly rumors written as if they were facts.',
      use: { type: 'read', title: 'Pocket Notebook', text: '- The test uses a serum. It doesn\'t hurt (allegedly).\n- Three scenarios? Some say two. Some say five.\n- "The sim reads WHAT you do, not what you think."\n- Rumor: some results come back "inconclusive." Nobody will say what happens then.\n- Technicians are volunteers from OTHER factions. Don\'t try to charm them.' },
      icon: { shape: 'book', color: '#3b72b6' },
    },
    tie_pin: {
      name: 'Silver Tie Pin', cat: 'misc', usable: true,
      desc: 'A gift from your father: a small pair of scales.',
      use: { type: 'read', title: 'Silver Tie Pin', text: 'Engraved on the back, very small:\n\n"Say it plainly."' },
      icon: { shape: 'token', color: '#c8c8c8' },
    },
    dried_flower: {
      name: 'Pressed Marigold', cat: 'misc', usable: true,
      desc: 'A flattened orange flower from the orchard path, kept between two sheets of wax paper.',
      use: { type: 'read', title: 'Pressed Marigold', text: 'It still smells faintly of home: wet earth, woodsmoke, apples.\n\nYou feel a little steadier.' },
      icon: { shape: 'token', color: '#e08a1e' },
    },
    testing_pamphlet: {
      name: 'Aptitude Testing Pamphlet', cat: 'misc', usable: true,
      desc: 'A folded grey pamphlet from the lobby kiosk.',
      use: { type: 'read', title: 'Your Aptitude Test — A Guide for Candidates', text: 'WHAT IS THE APTITUDE TEST?\nA simulation administered by a trained technician. It measures your tendencies — not your worth.\n\nWHAT HAPPENS AFTERWARD?\nYou will be told your result. You are NOT bound by it. Tomorrow, at the Choosing Ceremony, you alone decide your faction.\n\nIMPORTANT\n• Do not discuss results with other candidates.\n• Follow all staff instructions.\n• The simulation cannot harm you.\n\nFACTION BEFORE BLOOD.' },
      icon: { shape: 'paper', color: '#a8a79f' },
    },
    gus_note: {
      name: 'Folded Note', cat: 'misc', usable: true,
      desc: 'A note found in the janitor\'s closet, written on the back of a ration wrapper.',
      use: { type: 'read', title: 'Folded Note', text: 'G —\nThey are moving the archive boxes again on Thursday. If you want your old file, take it before then. Nobody will miss one folder from twenty years ago.\nDon\'t be proud about it.\n— E.' },
      icon: { shape: 'paper', color: '#c8b88a' },
    },
    simulation_vial: {
      name: 'Empty Serum Vial', cat: 'misc', usable: false,
      desc: 'A tiny glass vial with a blue residue. The label reads SIM-A / LOT 33. You should probably not have this.',
      icon: { shape: 'bottle', color: '#3b72b6' },
    },
    /* ---------------- Build 7: what the city's shops sell (js/data/shops.js) ---------------- */
    // the ration depot (Abnegation)
    ration_tin: {
      name: 'Tin of Beans', cat: 'consumable', stack: true, usable: true,
      desc: 'Haricot beans in water, from the Amity canning shed. The label is a stamp: a sheaf of wheat and a date. Restores stamina.',
      use: { type: 'stamina', amount: 45 }, icon: { shape: 'tin', color: '#9a968c' },
    },
    grey_soap: {
      name: 'Bar of Grey Soap', cat: 'misc', stack: true,
      desc: 'Lye and tallow, cut from a slab with a wire. It smells of nothing, which is the point.',
      icon: { shape: 'bar', color: '#bdbab0' },
    },
    mending_kit: {
      name: 'Mending Kit', cat: 'misc', stack: true,
      desc: 'A tin with needles, grey thread on a card, two spare buttons and a thimble. Nothing in Abnegation is thrown away while it can still be sewn.',
      icon: { shape: 'tin', color: '#6f6c64' },
    },
    tallow_candle: {
      name: 'Tallow Candle', cat: 'misc', stack: true,
      desc: 'For when the power is rationed. It burns for about four hours and smokes the whole time.',
      icon: { shape: 'bottle', color: '#e8e0c4' },
    },
    // the print shop (Candor)
    evening_standard: {
      name: 'The Evening Standard', cat: 'misc', stack: true, usable: true,
      desc: 'The late edition, still smelling of ink. Candor print the corrections on the front page.',
      use: { type: 'read', title: 'The Evening Standard', text: 'CORRECTION\n\nYesterday this paper reported that the Erudite water report was "late". It was not late. It was eleven days late. We regret the error.\n\nBREAD QUEUES LONGER IN SECTOR 9\n\nThe Abnegation depot on Grand Avenue served four hundred and twelve people on Tuesday, a clerk told this paper, "and turned nobody away, though we were down to the heels of the loaves by four". Asked where the shortfall comes from, he said: "Ask the people who count the lorries."\n\nTHE DAUNTLESS ARE LOUD, SAY NEIGHBOURS\n\nResidents near State Street complain of shouting, running on rooftops and a train horn sounded "for no reason at all" at two in the morning. A Dauntless spokesman said the reason was that it was funny.' },
      icon: { shape: 'paper', color: '#dcd8cc' },
    },
    ruled_notebook: {
      name: 'Ruled Notebook', cat: 'misc', stack: true,
      desc: 'Forty pages, ruled feint, stitched not glued. Candor sell them by the hundred: everyone there writes down what was said.',
      icon: { shape: 'book', color: '#2a2a2a' },
    },
    pencil: {
      name: 'Pencil', cat: 'misc', stack: true,
      desc: 'Cedar and graphite, sharpened with a knife. The end has been chewed by somebody before you.',
      icon: { shape: 'key', color: '#c8a050' },
    },
    crossword_book: {
      name: 'Book of Crosswords', cat: 'misc', usable: true,
      desc: 'Sixty puzzles from the Candor Daily, bound with a staple. A few are already filled in, in pen, wrongly.',
      use: { type: 'read', title: 'Book of Crosswords', text: 'PUZZLE 14\n\n1 across. Faction that cannot tell a lie, or will not (6)\n4 across. What the Dauntless call a fall from a train (2 words, 1 and 5)\n7 down. Erudite colour (4)\n9 down. What the factionless are, the council says, "for now" (8)\n\nIn the margin, in pen: "CANDOR. A SHORT. BLUE. FORGOTTEN." The last one has been crossed out and written again, harder.' },
      icon: { shape: 'book', color: '#d8d4c8' },
    },
    // the bookshop and lab supply (Erudite)
    marsh_guide: {
      name: 'A Field Guide to the Marsh', cat: 'misc', usable: true,
      desc: 'Erudite\'s survey of the dried lake bed: the reeds, the birds, the rusted boats, and which of the mud will hold your weight.',
      use: { type: 'read', title: 'A Field Guide to the Marsh', text: 'INTRODUCTION\n\nThe body of water that once lay east of the city receded within living memory of the first Erudite surveyors. What remains is a marsh of some forty square kilometres: reed beds, standing pools, and the hulls of vessels whose names can still be read.\n\nThe visitor is advised:\n• The ground east of the old pier will not bear a person after rain.\n• The gulls are not afraid of you.\n• The Fence is further than it looks.\n\nPLATE 7: A heron, standing in a pool. Somebody has drawn a Dauntless tattoo on its leg in biro.' },
      icon: { shape: 'book', color: '#4a6a5a' },
    },
    logic_primer: {
      name: 'Logic: A Primer', cat: 'misc', usable: true,
      desc: 'The book every Erudite child reads at eight and pretends at twelve not to have needed.',
      use: { type: 'read', title: 'Logic: A Primer', text: 'CHAPTER ONE: WHAT FOLLOWS\n\nIf every Candor tells the truth, and Rosa is Candor, then Rosa tells the truth.\n\nThis is valid. It may not be true. The difference between the two is the subject of this book, and of most arguments you will ever have.\n\nEXERCISE: "All the factionless are idle. Lou mends radios all day. Therefore Lou is not factionless." Which premise is false? (Answer overleaf.)\n\nOverleaf, in a child\'s hand: "THE FIRST ONE."' },
      icon: { shape: 'book', color: '#2f5f9e' },
    },
    focus_tablets: {
      name: 'Focus Tablets', cat: 'consumable', stack: true, usable: true,
      desc: 'Erudite dispensary, white tin, twelve tablets. "For sustained concentration." They taste of chalk. (+1 Intelligence, 90 minutes)',
      use: { type: 'buff', attr: 'intelligence', amount: 1, minutes: 90, label: 'Focused' }, icon: { shape: 'tin', color: '#e8eef4' },
    },
    chalk_box: {
      name: 'Box of Chalk', cat: 'misc', stack: true,
      desc: 'Twelve white sticks in a card box. Every Erudite lecture theatre goes through a box a day.',
      icon: { shape: 'card', color: '#f0f0ea', color2: '#2f5f9e' },
    },
    ink_bottle: {
      name: 'Bottle of Ink', cat: 'misc', stack: true,
      desc: 'Blue-black, Erudite standard. The cap is stiff and the bottle always leaks a little.',
      icon: { shape: 'bottle', color: '#1c2a4a' },
    },
    // the tattoo parlour and gear (Dauntless)
    energy_bar: {
      name: 'Dauntless Energy Bar', cat: 'consumable', stack: true, usable: true,
      desc: 'Oats, syrup and too much salt, pressed into a black wrapper. Initiates eat four a day. Restores a lot of stamina.',
      use: { type: 'stamina', amount: 60 }, icon: { shape: 'bar', color: '#2a2a2c' },
    },
    hand_wraps: {
      name: 'Hand Wraps', cat: 'misc', stack: true,
      desc: 'Four metres of black cotton each, for under the gloves. Somebody else\'s blood has washed out of them, mostly.',
      icon: { shape: 'bar', color: '#1a1a1a' },
    },
    fingerless_gloves: {
      name: 'Fingerless Gloves', cat: 'misc',
      desc: 'Black leather, the knuckles reinforced. For gripping the rungs on the side of a moving train.',
      icon: { shape: 'shirt', color: '#262422' },
    },
    // the produce market (Amity)
    amity_peach: {
      name: 'Amity Peach', cat: 'consumable', stack: true, usable: true,
      desc: 'Soft and warm from the truck. You will get juice on your sleeve. Restores some stamina.',
      use: { type: 'stamina', amount: 25 }, icon: { shape: 'token', color: '#e8904a' },
    },
    honey_jar: {
      name: 'Jar of Honey', cat: 'consumable', stack: true, usable: true,
      desc: 'From the hives behind the orchards. A spoonful steadies you. (+1 Resolve, 1 hour)',
      use: { type: 'buff', attr: 'resolve', amount: 1, minutes: 60, label: 'Sweetened' }, icon: { shape: 'jar', color: '#d8a030' },
    },
    amity_loaf: {
      name: 'Amity Loaf', cat: 'consumable', stack: true, usable: true,
      desc: 'A round brown loaf with a cross cut in the top. Some say Amity bake something into it that makes you agreeable. Restores a lot of stamina.',
      use: { type: 'stamina', amount: 60 }, icon: { shape: 'bar', color: '#a8743c' },
    },
    // the pawn and repair shop (the factionless)
    wind_torch: {
      name: 'Wind-up Torch', cat: 'misc',
      desc: 'Crank it for a minute, get five minutes of yellow light. The handle squeaks. Mended twice, by the look of the solder.',
      icon: { shape: 'bottle', color: '#c8b040' },
    },
    folding_knife: {
      name: 'Folding Knife', cat: 'misc',
      desc: 'A short blade with a bone handle. Not a weapon, the man said. A tool. He said it twice.',
      icon: { shape: 'key', color: '#c8c0b0' },
    },
    valve_radio: {
      name: 'Valve Radio', cat: 'misc', usable: true,
      desc: 'A small wooden radio with a cloth grille, rebuilt from three others. It only picks up the city\'s band.',
      use: { type: 'read', title: 'Valve Radio', text: 'You turn the dial. Hiss, then a voice, very close:\n\n"...reminds all citizens that curfew begins at twenty-one hundred. Report anything unusual to the Office of Public Order..."\n\nFurther along, under the hiss, somebody is playing a piano badly and laughing. Then nothing.' },
      icon: { shape: 'card', color: '#6a4a2a', color2: '#c8b890' },
    },
    // the diner
    diner_coffee: {
      name: 'Diner Coffee', cat: 'consumable', stack: true, usable: true,
      desc: 'In a paper cup with a lid that doesn\'t fit. It has been on the hot plate since six. (+1 Perception, 1 hour)',
      use: { type: 'buff', attr: 'perception', amount: 1, minutes: 60, label: 'Caffeinated', sound: 'drink' }, icon: { shape: 'cup', color: '#4a2e1c' },
    },
    egg_sandwich: {
      name: 'Egg Sandwich', cat: 'consumable', stack: true, usable: true,
      desc: 'Two slices of grey bread and an egg fried hard, wrapped in wax paper. Restores a lot of stamina.',
      use: { type: 'stamina', amount: 50 }, icon: { shape: 'bar', color: '#e8d890' },
    },
    soup_cup: {
      name: 'Cup of Soup', cat: 'consumable', stack: true, usable: true,
      desc: 'Potato and leek, to take away. Thin, hot, and salted for people who work outside. Restores stamina.',
      use: { type: 'stamina', amount: 45, sound: 'drink' }, icon: { shape: 'cup', color: '#c8b878' },
    },
    chocolate_cake: {
      name: 'Slice of Chocolate Cake', cat: 'consumable', stack: true, usable: true,
      desc: 'Black, dense and absurd. The Dauntless come across town for it and won\'t say so. (+1 Resolve, 2 hours)',
      use: { type: 'buff', attr: 'resolve', amount: 1, minutes: 120, label: 'Cake' }, icon: { shape: 'bar', color: '#3a2216' },
    },
    // the clinic and pharmacy
    aspirin: {
      name: 'Aspirin', cat: 'consumable', stack: true, usable: true,
      desc: 'Two white tablets folded in a paper twist. The headache goes, and the edge with it. (+1 Resolve, 1 hour)',
      use: { type: 'buff', attr: 'resolve', amount: 1, minutes: 60, label: 'Steadied' }, icon: { shape: 'paper', color: '#f0f0f0' },
    },
    bandage_roll: {
      name: 'Roll of Bandage', cat: 'misc', stack: true,
      desc: 'Cotton crepe, five metres, with two safety pins. Everyone who walks the city at night should carry one, the nurse says.',
      icon: { shape: 'token', color: '#e8e4d8' },
    },
    electrolyte_salts: {
      name: 'Electrolyte Salts', cat: 'consumable', stack: true, usable: true,
      desc: 'A sachet to stir into water. Salty, sweet, faintly orange. Restores a lot of stamina.',
      use: { type: 'stamina', amount: 55, sound: 'drink' }, icon: { shape: 'cup', color: '#e8a050' },
    },
    iron_tonic: {
      name: 'Iron Tonic', cat: 'consumable', stack: true, usable: true,
      desc: 'A brown bottle of something red and metallic. "For the blood," the label says, and nothing else. (+1 Strength, 2 hours)',
      use: { type: 'buff', attr: 'strength', amount: 1, minutes: 120, label: 'Iron in the blood' }, icon: { shape: 'bottle', color: '#7a2a1c' },
    },
  };

  // what things are worth, in ration scrip: a shop sells near this and buys back for less
  // (js/data/shops.js). No value: nobody will buy it (water, quest items, the clothes you were issued).
  const VALUE = {
    water_cup: 0, ration_bar: 3, coffee: 2, calming_tea: 2, apple: 1, bread_roll: 1, candor_paper: 1, peppermint: 1,
    grey_handkerchief: 1, leather_band: 3, pocket_notebook: 2, tie_pin: 6, dried_flower: 1, testing_pamphlet: 0, gus_note: 0, simulation_vial: 2,
    ration_tin: 2, grey_soap: 1, mending_kit: 3, tallow_candle: 1,
    evening_standard: 1, ruled_notebook: 2, pencil: 1, crossword_book: 3,
    marsh_guide: 7, logic_primer: 5, focus_tablets: 4, chalk_box: 1, ink_bottle: 2,
    energy_bar: 2, hand_wraps: 3, fingerless_gloves: 6,
    amity_peach: 1, honey_jar: 3, amity_loaf: 2,
    wind_torch: 6, folding_knife: 5, valve_radio: 9,
    diner_coffee: 1, egg_sandwich: 2, soup_cup: 2, chocolate_cake: 3,
    aspirin: 2, bandage_roll: 2, electrolyte_salts: 2, iron_tonic: 4,
  };
  for (const id in VALUE) if (items[id]) items[id].value = VALUE[id];

  for (const id in items) items[id].id = id;
  DV.Items = {
    defs: items,
    get(id) {
      return items[id];
    },
  };
})();
