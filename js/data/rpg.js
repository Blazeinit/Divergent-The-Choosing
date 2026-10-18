/* ==========================================================================
   DIVERGENT — attribute, skill and progression data
   Faction and attributes are deliberately separate: any build can join any
   faction. Attributes gate dialogue checks; skills grow through use.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  DV.RPG = {
    ATTR_BASE: 3,
    ATTR_POOL: 12,
    ATTR_MAX_CREATE: 9,
    ATTR_MAX: 10,
    attributes: [
      {
        id: 'strength', name: 'Strength', abbr: 'STR',
        desc: 'Raw physical power. Influences melee, intimidation and physical interactions — forcing doors, lifting debris, standing your ground.',
      },
      {
        id: 'agility', name: 'Agility', abbr: 'AGI',
        desc: 'Speed, balance and reflexes. Influences movement, climbing, dodging and physical challenges.',
      },
      {
        id: 'intelligence', name: 'Intelligence', abbr: 'INT',
        desc: 'Reasoning and technical knowledge. Influences puzzles, Erudite interactions and understanding the nature of a simulation.',
      },
      {
        id: 'perception', name: 'Perception', abbr: 'PER',
        desc: 'Noticing what others miss. Influences observations, clues, detecting unusual behavior and reading a room.',
      },
      {
        id: 'charisma', name: 'Charisma', abbr: 'CHA',
        desc: 'Presence and persuasion. Influences social checks, relationships and how quickly people trust you.',
      },
      {
        id: 'resolve', name: 'Resolve', abbr: 'RES',
        desc: 'Mental fortitude. Influences fear resistance, psychological pressure and control inside a simulation.',
      },
    ],
    skills: [
      { id: 'athletics', name: 'Athletics', attrs: ['agility', 'strength'], desc: 'Running speed and stamina efficiency. Improves by running.' },
      { id: 'melee', name: 'Melee', attrs: ['strength'], desc: 'Effectiveness in physical confrontations. Improves through fighting.' },
      { id: 'stealth', name: 'Stealth', attrs: ['agility', 'perception'], desc: 'Moving unseen and taking what you shouldn\'t. Improves when you go unnoticed.' },
      { id: 'persuasion', name: 'Persuasion', attrs: ['charisma'], desc: 'Bonus to relationship gains. Improves by winning people over.' },
      { id: 'intimidation', name: 'Intimidation', attrs: ['strength', 'resolve'], desc: 'Getting results through pressure. Improves by forcing the issue.' },
      { id: 'deception', name: 'Deception', attrs: ['charisma', 'intelligence'], desc: 'How convincing your lies are. Improves each time you lie successfully.' },
      { id: 'observation', name: 'Observation', attrs: ['perception'], desc: 'Spot hidden objects and details from further away. Improves by examining the world.' },
      { id: 'logic', name: 'Logic', attrs: ['intelligence'], desc: 'Insight into puzzles and systems. Improves by reasoning through problems.' },
      { id: 'empathy', name: 'Empathy', attrs: ['charisma', 'perception'], desc: 'Reading how others feel. At higher levels you sense an NPC\'s disposition. Improves by helping.' },
      { id: 'composure', name: 'Composure', attrs: ['resolve'], desc: 'Reduces fear and panic effects inside simulations. Improves under pressure.' },
      { id: 'firearms', name: 'Firearms', attrs: ['perception', 'resolve'], desc: 'A steady hand and a steady eye: less sway, quicker recovery from recoil. Improves at the range.' },
      { id: 'throwing', name: 'Throwing', attrs: ['agility', 'perception'], desc: 'Judging the spin so the point arrives first. Improves at the knife wall.' },
    ],
    // total XP required to reach level n (index = level). Twenty levels; past ten each one is a longer climb.
    levelXP: [0, 0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000],
    MAX_LEVEL: 20,
    // what a level brings: an attribute point every level, a perk point every level, and one more
    // perk point at the milestones (and one to start with, so a fresh candidate can take a first perk)
    PERK_START: 1,
    PERK_MILESTONES: [5, 10, 15, 20],
    perkPointsAt(level) {
      return 1 + (this.PERK_MILESTONES.indexOf(level) >= 0 ? 1 : 0);
    },
    attrPointsAt() {
      return 1;
    },
    /* Where experience comes from. `once` sources pay out a single time per key (a room, a
       document, a fight's opponent on a given day); the rest pay every time. DV.Stats.award(src, key)
       reads this table — a new side activity is one line here and one call where it happens. */
    xpSources: {
      quest: { label: 'Quest', note: 'Each quest pays its own reward when it\'s complete (main quests the most).' },
      discovery: { xp: 10, once: true, label: 'Discovery', note: 'A named room, office or hall the first time you walk into it.' },
      sector: { xp: 25, once: true, label: 'Discovery', note: 'A sector of the city, the farmland or the Marsh, the first time you set foot in it.' },
      check: { xp: 10, label: 'Check passed', note: 'Any attribute check you pass in conversation (harder ones pay more).' },
      lie: { xp: 15, once: true, label: 'Lie seen through', note: 'Calling out a lie with Candor\'s Cross-Examine.' },
      read: { xp: 5, once: true, label: 'Reading', note: 'A letter, a notice or a book, the first time you read it.' },
      codex: { xp: 2, once: true, label: 'Lore', note: 'A new Codex entry.' },
      fight_win: { xp: 30, label: 'Fight won', note: 'Winning a fight in the ring or out of it.' },
      fight_loss: { xp: 10, label: 'Fight lost', note: 'Losing one. You still learn something on the mat.' },
      trial: { xp: 25, label: 'Trial', note: 'A training drill or a faction trial: the range, the knives, the bags, the benches, the culvert, the interview, the serum, the zip line.' },
      activity: { xp: 15, once: true, label: 'Side activity', note: 'Something off the path: a ride on the Circle Line, a stallholder\'s gift, a lock picked, a craft made.' },
      perk: { label: 'Perk', note: 'Perks never cost experience, only perk points.' },
    },
    upbringings: [
      { id: 'abnegation', name: 'Abnegation', desc: 'You grew up in grey, in a house without mirrors, taught to put others first.', item: 'grey_handkerchief' },
      { id: 'dauntless', name: 'Dauntless', desc: 'You grew up loud, above the Pit, where fear was something to laugh at.', item: 'leather_band' },
      { id: 'erudite', name: 'Erudite', desc: 'You grew up among libraries and laboratories, expected to know things.', item: 'pocket_notebook' },
      { id: 'candor', name: 'Candor', desc: 'You grew up in the Merciless Mart, where every lie was named out loud.', item: 'tie_pin' },
      { id: 'amity', name: 'Amity', desc: 'You grew up in the orchards beyond the city, where conflict was a thing to be soothed.', item: 'dried_flower' },
    ],
  };
})();
