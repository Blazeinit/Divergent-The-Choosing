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
    // total XP required to reach level n (index = level)
    levelXP: [0, 0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500],
    upbringings: [
      { id: 'abnegation', name: 'Abnegation', desc: 'You grew up in grey, in a house without mirrors, taught to put others first.', item: 'grey_handkerchief' },
      { id: 'dauntless', name: 'Dauntless', desc: 'You grew up loud, above the Pit, where fear was something to laugh at.', item: 'leather_band' },
      { id: 'erudite', name: 'Erudite', desc: 'You grew up among libraries and laboratories, expected to know things.', item: 'pocket_notebook' },
      { id: 'candor', name: 'Candor', desc: 'You grew up in the Merciless Mart, where every lie was named out loud.', item: 'tie_pin' },
      { id: 'amity', name: 'Amity', desc: 'You grew up in the orchards beyond the city, where conflict was a thing to be soothed.', item: 'dried_flower' },
    ],
  };
})();
