/* ==========================================================================
   DIVERGENT — perk trees (pure data)
   Every skill has a tree of three tiers, unlocked by that skill's level and
   paid for with perk points. Each of the five factions has a tree of its own,
   opened by your standing with it (members and those raised in it start
   ahead), and there is one more — Divergent — for those whose aptitude test
   came back inconclusive.

   A perk does its work through `mods`: named numbers the game's systems ask
   DV.Perks.mod(key) for. The keys and who reads them:
     check.<attr>      +N to that attribute in dialogue/world checks (Stats.checkValue)
     check.all         +N to every check
     check.lie         +N to checks on a lie (choices tagged Lie, or practising Deception)
     check.lockpick    +N to the hairpin
     check.friendly    +N to checks with someone Friendly or warmer
     checkvs.<faction> +N to checks with a member of that faction
     skill.<id>        +N to a skill's effective level
     practice.gain     skills grow this much faster (fraction)
     xp.gain           experience from every source (fraction)
     xp.discovery      extra share of experience for discoveries (fraction)
     rel.gain/rel.loss relationship changes (fraction, Reputation.addRel)
     rep.gain          faction reputation gains (fraction, Reputation.add)
     disp.all/floor    disposition +N with everyone / never below N (Reputation.disposition)
     stamina.regen     stamina regenerates faster (fraction, Player.regen)
     sprint.drain/speed  running's stamina cost / speed (fraction, Player.update)
     jump.cost         jumping's stamina cost (fraction)
     fall.immune       no hard-landing stagger (Player.update)
     stealth.range/cone  how far / how wide staff see you (fraction, Story.watchers)
     stealth.silent    nobody hears you unless you run
     melee.*           dmg, armor (damage taken), block (stamina), counter, menace, calmfoe (Combat)
     firearms.recoil/sway, throw.slack  the range and the knife wall (Training)
     sim.fear/breath/aware/slow  simulations and fear sims (Sim, FearSim)
     notice.gain/decay, div.hide  the Order Office (Order)
     npc.disp / npc.analyze  disposition shown / analysed in the dialogue window
     npc.calm          a way to talk down someone hostile (Dialogue)
     lie.detect/call/truth  Candor: see a lie, call it, hear the truth (Dialogue, DialogueUI)
     seams             hidden choices (seam: true) show up (Dialogue)
     terminal          bypass a keycard reader (Game.tryDoor)
     craft             the workbench in the inventory (Perks.craft)
     herbs             healing herbs every morning (Perks.newDay)
     vendor.extra      stallholders, volunteers and dispensers are generous (CityLife, Actions.vending)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  // skill trees: tier I at 25, II at 40, III at 60 — a trained skill, not a born one
  const SKILL_TIERS = [25, 40, 60];
  // the Divergent tree opens with the result; its deeper tiers by level
  const DIV_TIERS = [1, 4, 7];

  const sk = (skill, glyph, perks) => ({ id: skill, kind: 'skill', skill, glyph, perks });

  const trees = [
    /* ------------------------------ skills ------------------------------ */
    sk('athletics', '➶', [
      { id: 'ath_wind', tier: 1, name: 'Second Wind', desc: 'Stamina comes back a quarter faster.', mods: { 'stamina.regen': 0.25 } },
      { id: 'ath_stride', tier: 2, name: 'Long Stride', desc: 'Running costs a fifth less stamina.', mods: { 'sprint.drain': -0.2 } },
      { id: 'ath_free', tier: 3, name: 'Free Runner', desc: 'Jumping costs half the stamina. You land like you meant to.', mods: { 'jump.cost': -0.5, 'sprint.speed': 0.03 } },
    ]),
    sk('melee', '⚔', [
      { id: 'mel_guard', tier: 1, name: 'Tight Guard', desc: 'Blocking eats a quarter less stamina.', mods: { 'melee.block': -0.25 } },
      { id: 'mel_heavy', tier: 2, name: 'Heavy Hands', desc: 'Your strikes hit 12% harder.', mods: { 'melee.dmg': 0.12 } },
      { id: 'mel_counter', tier: 3, name: 'Counterpuncher', desc: 'A hit on someone winding up lands 30% harder and breaks their footing.', mods: { 'melee.counter': 0.3 } },
    ]),
    sk('stealth', '◐', [
      { id: 'sth_soft', tier: 1, name: 'Soft Step', desc: 'Staff notice you from a fifth less distance.', mods: { 'stealth.range': -0.2 } },
      { id: 'sth_quiet', tier: 2, name: 'Quiet Feet', desc: 'Nobody hears you coming unless you run.', mods: { 'stealth.silent': 1 } },
      { id: 'sth_ghost', tier: 3, name: 'Ghost', desc: 'Watchers\' eyes cover a narrower cone, and the hairpin gets +2.', mods: { 'stealth.cone': -0.25, 'check.lockpick': 2 } },
    ]),
    sk('persuasion', '❧', [
      { id: 'per_warm', tier: 1, name: 'Warm Manner', desc: 'People warm to you a fifth faster.', mods: { 'rel.gain': 0.2 } },
      { id: 'per_silver', tier: 2, name: 'Silver Tongue', desc: '+1 Charisma in every check.', mods: { 'check.charisma': 1 } },
      { id: 'per_rapport', tier: 3, name: 'Rapport', desc: 'Everyone\'s disposition toward you starts five points warmer.', mods: { 'disp.all': 5 } },
    ]),
    sk('intimidation', '✊', [
      { id: 'int_stare', tier: 1, name: 'Hard Stare', desc: '+1 Strength in checks — the kind where you loom.', mods: { 'check.strength': 1 } },
      { id: 'int_presence', tier: 2, name: 'Presence', desc: '+1 Resolve in checks. You don\'t blink first.', mods: { 'check.resolve': 1 } },
      { id: 'int_menace', tier: 3, name: 'Menace', desc: 'Opponents start a fight already rattled: less poise, and they hesitate.', mods: { 'melee.menace': 20 } },
    ]),
    sk('deception', '◭', [
      { id: 'dec_poker', tier: 1, name: 'Poker Face', desc: '+1 on any check where you\'re lying.', mods: { 'check.lie': 1 } },
      { id: 'dec_cover', tier: 2, name: 'Cover Story', desc: 'The Order Office takes 30% less notice of you.', mods: { 'notice.gain': -0.3 } },
      { id: 'dec_mask', tier: 3, name: 'The Mask', desc: 'Another +2 when lying. Nobody can tell where your face ends.', mods: { 'check.lie': 2 } },
    ]),
    sk('observation', '◉', [
      { id: 'obs_eye', tier: 1, name: 'Keen Eye', desc: '+1 Perception in checks.', mods: { 'check.perception': 1 } },
      { id: 'obs_room', tier: 2, name: 'Read the Room', desc: 'The dialogue window shows how people feel about you.', mods: { 'npc.disp': 1 } },
      { id: 'obs_map', tier: 3, name: 'Cartographer', desc: 'Discoveries pay double experience.', mods: { 'xp.discovery': 1 } },
    ]),
    sk('logic', '∴', [
      { id: 'log_method', tier: 1, name: 'Method', desc: '+1 Intelligence in checks.', mods: { 'check.intelligence': 1 } },
      { id: 'log_study', tier: 2, name: 'Quick Study', desc: 'Every skill improves a quarter faster with use.', mods: { 'practice.gain': 0.25 } },
      { id: 'log_systems', tier: 3, name: 'Systems Thinker', desc: '+10% experience from everything.', mods: { 'xp.gain': 0.1 } },
    ]),
    sk('empathy', '♡', [
      { id: 'emp_faces', tier: 1, name: 'Read Faces', desc: 'You always see someone\'s disposition while you talk.', mods: { 'npc.disp': 1 } },
      { id: 'emp_mend', tier: 2, name: 'Mend Fences', desc: 'When people sour on you, it\'s by half as much.', mods: { 'rel.loss': -0.5 } },
      { id: 'emp_kin', tier: 3, name: 'Kinship', desc: '+2 on checks with anyone who\'s Friendly or warmer.', mods: { 'check.friendly': 2 } },
    ]),
    sk('composure', '≈', [
      { id: 'com_breath', tier: 1, name: 'Box Breathing', desc: 'Slow breathing in a fear simulation brings your heart down 30% faster.', mods: { 'sim.breath': 0.3 } },
      { id: 'com_steady', tier: 2, name: 'Steady', desc: 'Fear in simulations hits 15% softer.', mods: { 'sim.fear': -0.15 } },
      { id: 'com_unshaken', tier: 3, name: 'Unshaken', desc: '+1 Resolve in checks.', mods: { 'check.resolve': 1 } },
    ]),
    sk('firearms', '⌖', [
      { id: 'fir_stance', tier: 1, name: 'Range Stance', desc: '+8 effective Firearms.', mods: { 'skill.firearms': 8 } },
      { id: 'fir_recoil', tier: 2, name: 'Recoil Control', desc: 'Each shot kicks a quarter less.', mods: { 'firearms.recoil': -0.25 } },
      { id: 'fir_still', tier: 3, name: 'Stillness', desc: 'The sights sway a quarter less.', mods: { 'firearms.sway': -0.25 } },
    ]),
    sk('throwing', '†', [
      { id: 'thr_grip', tier: 1, name: 'Blade Grip', desc: '+8 effective Throwing.', mods: { 'skill.throwing': 8 } },
      { id: 'thr_spin', tier: 2, name: 'Count the Spin', desc: 'The release window is 15% wider.', mods: { 'throw.slack': 0.15 } },
      { id: 'thr_point', tier: 3, name: 'Point First', desc: 'Another +12 Throwing. The knife goes where you look.', mods: { 'skill.throwing': 12 } },
    ]),

    /* ------------------------------ factions ------------------------------ */
    {
      id: 'dauntless', kind: 'faction', faction: 'dauntless', glyph: '♨',
      blurb: 'Bodies that don\'t hesitate. Opened by standing with the Dauntless; members start two ranks ahead.',
      perks: [
        { id: 'dau_sprint', tier: 1, name: 'Fearless Sprint', desc: 'Run like the train won\'t wait: a third less stamina, a little faster.', mods: { 'sprint.drain': -0.35, 'sprint.speed': 0.05 } },
        { id: 'dau_fall', tier: 1, name: 'Train-Hopper', desc: 'Hard landings never knock the wind out of you. You roll and keep going.', mods: { 'fall.immune': 1 } },
        { id: 'dau_stare', tier: 2, name: 'Dauntless Stare', desc: '+2 Strength in checks. People step aside before you ask.', mods: { 'check.strength': 2 } },
        { id: 'dau_pit', tier: 2, name: 'Pit Fighter', desc: 'You hit 10% harder and take 10% less.', mods: { 'melee.dmg': 0.1, 'melee.armor': -0.1 } },
        { id: 'dau_choice', tier: 3, name: 'Fear Is a Choice', desc: 'Fear in simulations is a third weaker, and +1 Resolve in checks.', mods: { 'sim.fear': -0.3, 'check.resolve': 1 } },
      ],
    },
    {
      id: 'erudite', kind: 'faction', faction: 'erudite', glyph: '☉',
      blurb: 'Minds that take things apart. Opened by standing with Erudite.',
      perks: [
        { id: 'eru_analyze', tier: 1, name: 'Analyze', desc: 'In conversation you read the numbers: disposition, trust, and how far their faction\'s opinion of you weighs on it.', mods: { 'npc.analyze': 1, 'npc.disp': 1 } },
        { id: 'eru_method', tier: 1, name: 'Scientific Method', desc: '+1 Intelligence in checks.', mods: { 'check.intelligence': 1 } },
        { id: 'eru_override', tier: 2, name: 'Override', desc: 'Keycard readers are only circuits. Bypass a reader with an Intelligence check (if nobody\'s watching).', mods: { 'terminal': 1 } },
        { id: 'eru_retain', tier: 2, name: 'Retention', desc: 'Skills grow 30% faster with use.', mods: { 'practice.gain': 0.3 } },
        { id: 'eru_chem', tier: 3, name: 'Applied Chemistry', desc: 'A workbench in your inventory: combine what you carry into tonics and stimulants.', mods: { 'craft': 1 } },
      ],
    },
    {
      id: 'candor', kind: 'faction', faction: 'candor', glyph: '⚖',
      blurb: 'Ears that hear the lie in a sentence. Opened by standing with Candor.',
      perks: [
        { id: 'can_ear', tier: 1, name: 'Ear for Lies', desc: 'When someone lies to you, the line is marked — and you see the tell that gave it away.', mods: { 'lie.detect': 1 } },
        { id: 'can_plain', tier: 1, name: 'Plain Speech', desc: '+1 Perception in checks. You look at people while they talk.', mods: { 'check.perception': 1 } },
        { id: 'can_cross', tier: 2, name: 'Cross-Examine', desc: 'Call a lie out to its face. They\'ll squirm, and you learn from it.', mods: { 'lie.call': 1 } },
        { id: 'can_witness', tier: 2, name: 'Credible Witness', desc: '+2 in checks with Erudite and the Order. Facts, stated plainly, are hard to argue with.', mods: { 'checkvs.erudite': 2, 'checkvs.order': 2 } },
        { id: 'can_truth', tier: 3, name: 'The Whole Truth', desc: 'A lie you call out gets you the truth behind it — and their respect.', mods: { 'lie.truth': 1 } },
      ],
    },
    {
      id: 'abnegation', kind: 'faction', faction: 'abnegation', glyph: '❂',
      blurb: 'Hands that give. Opened by standing with Abnegation.',
      perks: [
        { id: 'abn_trust', tier: 1, name: 'Selfless Reputation', desc: 'People trust you: relationships grow a quarter faster and sour a quarter slower.', mods: { 'rel.gain': 0.25, 'rel.loss': -0.25 } },
        { id: 'abn_plenty', tier: 1, name: 'Shared Plenty', desc: 'The city has no prices, only generosity: stallholders and volunteers hand you a second, dispensers restock twice as fast.', mods: { 'vendor.extra': 1 } },
        { id: 'abn_grey', tier: 2, name: 'Grey Coat', desc: 'Nobody looks twice at grey. The Order Office takes 40% less notice of you.', mods: { 'notice.gain': -0.4 } },
        { id: 'abn_calm', tier: 2, name: 'Calming Presence', desc: 'Crowds settle around you: the Office\'s notice fades twice as fast, and +1 Charisma with Amity and Abnegation.', mods: { 'notice.decay': 1, 'checkvs.amity': 1, 'checkvs.abnegation': 1 } },
        { id: 'abn_service', tier: 3, name: 'Service Before Self', desc: 'Every faction\'s good opinion of you grows half again as fast.', mods: { 'rep.gain': 0.5 } },
      ],
    },
    {
      id: 'amity', kind: 'faction', faction: 'amity', glyph: '☘',
      blurb: 'Voices that settle a room. Opened by standing with Amity.',
      perks: [
        { id: 'ami_soothe', tier: 1, name: 'Soothing Word', desc: 'Someone cold or hostile can be talked down: a way to start again appears in the conversation.', mods: { 'npc.calm': 1 } },
        { id: 'ami_herbs', tier: 1, name: 'Herb Lore', desc: 'Every morning you gather two bundles of healing herbs: stamina, and a calmer head.', mods: { 'herbs': 1 } },
        { id: 'ami_hands', tier: 2, name: 'Open Hands', desc: 'Opponents come at you a fifth less hard. It\'s difficult to hit someone who isn\'t angry.', mods: { 'melee.calmfoe': 0.2 } },
        { id: 'ami_harvest', tier: 2, name: 'Harvest Rhythm', desc: 'Stamina comes back 30% faster.', mods: { 'stamina.regen': 0.3 } },
        { id: 'ami_kind', tier: 3, name: 'Kindness Is Law', desc: '+1 Charisma in checks, relationships grow 30% faster, and nobody stays hostile to you for long.', mods: { 'check.charisma': 1, 'rel.gain': 0.3, 'disp.floor': -10 } },
      ],
    },
    {
      id: 'divergent', kind: 'divergent', glyph: '✵',
      blurb: 'For a mind the test couldn\'t sort. Opens when your aptitude result is inconclusive; deeper tiers at levels 4 and 7.',
      perks: [
        { id: 'div_lucid', tier: 1, name: 'Lucid', desc: 'Simulations have less hold on you: fear a quarter weaker, and you can always wake inside a fear sim.', mods: { 'sim.fear': -0.25, 'sim.aware': 1 } },
        { id: 'div_seams', tier: 1, name: 'See the Seams', desc: 'Choices nobody else is offered appear, marked ✵.', mods: { 'seams': 1 } },
        { id: 'div_many', tier: 2, name: 'Many Minds', desc: '+1 on every check. You think like all five of them.', mods: { 'check.all': 1 } },
        { id: 'div_hide', tier: 2, name: 'Hidden in Plain Sight', desc: 'Drones and the Order Office stop singling you out: 25% less notice, and your record raises no flags.', mods: { 'notice.gain': -0.25, 'div.hide': 1 } },
        { id: 'div_slow', tier: 3, name: 'Slow Time', desc: 'In a fear simulation, steady breathing slows the world around you to half speed.', mods: { 'sim.slow': 1 } },
      ],
    },
  ];

  /* Erudite's workbench (Applied Chemistry): what you can make from what you carry */
  const recipes = [
    { id: 'stim', out: 'erudite_stim', name: 'Stimulant', needs: { coffee: 1, ration_bar: 1 }, desc: 'Coffee, sugar and a ration bar\'s worth of salt, reduced.' },
    { id: 'tonic', out: 'herbal_tonic', name: 'Herbal Tonic', needs: { healing_herbs: 1, water_cup: 1 }, desc: 'Herbs steeped in water: the Amity cure, measured.' },
    { id: 'focus', out: 'focus_draught', name: 'Focus Draught', needs: { coffee: 1, healing_herbs: 1 }, desc: 'Bitter, clean, and it makes the room come into focus.' },
  ];

  DV.PerkData = {
    SKILL_TIERS,
    DIV_TIERS,
    trees,
    recipes,
    tree(id) { return trees.find((t) => t.id === id); },
    perk(id) {
      for (const t of trees) { const p = t.perks.find((x) => x.id === id); if (p) return p; }
      return null;
    },
  };
  // each perk knows its tree
  for (const t of trees) for (const p of t.perks) p.tree = t.id;
})();
