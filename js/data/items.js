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
      badgeText: 'APTITUDE TESTING CENTER — SECTOR 4\n\nCANDIDATE 4-17: {name}\nGROUP: 4\nROOM: 4\nTECHNICIAN: J. ASHGROVE\n\nWear this badge where it can be seen at all times. Present it at security. Do not discuss your results with other candidates.',
      icon: { shape: 'card', color: '#e8e0c8' },
    },
    wooden_bird: {
      name: 'Carved Wooden Bird', cat: 'quest', quest: true,
      desc: 'A small bird carved from pale wood, worn smooth by a thumb. Initials on the base: P.H.',
      icon: { shape: 'token', color: '#c8a070' },
    },
    sealed_envelope: {
      name: 'Sealed Envelope', cat: 'quest', quest: true, usable: true,
      desc: 'Addressed to Dr. C. Wren, Administration. The seal is cheap — it would lift with a fingernail.',
      use: { type: 'action', action: 'readEnvelope' }, icon: { shape: 'paper', color: '#e8e0c8' },
    },
    signed_form: {
      name: 'Signed Schedule Amendment', cat: 'quest', quest: true,
      desc: 'A schedule amendment with Dr. Wren\'s looping signature. For Marion at reception.',
      icon: { shape: 'paper', color: '#e0e8f0' },
    },
    staff_keycard: {
      name: 'Proctor\'s Keycard', cat: 'quest', quest: true,
      desc: 'A white plastic keycard on a frayed blue lanyard. CALDER, I. — PROCTOR ACCESS. It opens the Proctor Station and Observation Gallery.',
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
  };

  for (const id in items) items[id].id = id;
  DV.Items = {
    defs: items,
    get(id) {
      return items[id];
    },
  };
})();
