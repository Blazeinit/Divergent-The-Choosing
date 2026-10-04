/* ==========================================================================
   DIVERGENT — faction data
   Visual language, values, colors. Used by character generation, UI,
   reputation and dialogue.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  DV.Factions = {
    order: ['abnegation', 'dauntless', 'erudite', 'candor', 'amity', 'factionless'],
    testable: ['abnegation', 'dauntless', 'erudite', 'candor', 'amity'],
    list: {
      abnegation: {
        id: 'abnegation',
        name: 'Abnegation',
        virtue: 'The Selfless',
        motto: 'Service before self.',
        color: '#8d8d86',
        accent: '#b9b8ae',
        description:
          'Abnegation believes that selfishness is the root of all conflict. Its members dress plainly in grey, govern the city, ' +
          'and dedicate their lives to the service of others. Mirrors are covered. Vanity is discouraged.',
        future: 'Community, government, service, resources, responsibility.',
      },
      dauntless: {
        id: 'dauntless',
        name: 'Dauntless',
        virtue: 'The Brave',
        motto: 'Fear is a choice.',
        color: '#2a2a2a',
        accent: '#c4432c',
        description:
          'Dauntless believes cowardice is the root of all conflict. They guard the fence, keep order in the city, ride the trains and ' +
          'train relentlessly. Black clothing, tattoos and piercings are common. They are loud, physical and unafraid.',
        future: 'Combat, parkour, physical initiation, fear simulations, security, trains.',
      },
      erudite: {
        id: 'erudite',
        name: 'Erudite',
        virtue: 'The Intelligent',
        motto: 'Knowledge is order.',
        color: '#2f5f9e',
        accent: '#8fb6e3',
        description:
          'Erudite believes ignorance is the root of all conflict. They run the city\'s research, medicine, technology and education ' +
          '— including the aptitude simulations. They dress in blue, which is said to calm the mind.',
        future: 'Research, technology, puzzles, information, simulation manipulation.',
      },
      candor: {
        id: 'candor',
        name: 'Candor',
        virtue: 'The Honest',
        motto: 'The truth sets order.',
        color: '#e8e6e0',
        accent: '#1b1b1b',
        description:
          'Candor believes duplicity is the root of all conflict. Black and white, like the truth. They run the courts and value ' +
          'blunt honesty — even when it hurts. Their members can be startlingly direct.',
        future: 'Investigation, interrogation, lie detection, legal disputes, truth serum.',
      },
      amity: {
        id: 'amity',
        name: 'Amity',
        virtue: 'The Peaceful',
        motto: 'Peace is a harvest.',
        color: '#c9762a',
        accent: '#e2b23f',
        description:
          'Amity believes aggression is the root of all conflict. They farm the land outside the city, settle disputes by consensus, ' +
          'and dress in warm reds and yellows. Kindness is their law.',
        future: 'Agriculture, community, mediation, peace, production.',
      },
      factionless: {
        id: 'factionless',
        name: 'Factionless',
        virtue: 'The Forgotten',
        motto: '—',
        color: '#6b5a48',
        accent: '#9a8873',
        description:
          'Those who failed initiation or left their faction. They live in the ruins between sectors, do the work no one else will, ' +
          'and are mostly ignored. They wear whatever they can find.',
        future: 'Survival, scavenging, underground networks, black markets.',
      },
      neutral: {
        id: 'neutral',
        name: 'Candidate',
        virtue: 'Undecided',
        motto: '',
        color: '#bdb6a6',
        accent: '#e0d9c6',
        description: 'Not yet chosen.',
      },
    },
    get(id) {
      return this.list[id] || this.list.neutral;
    },
    name(id) {
      return (this.list[id] || this.list.neutral).name;
    },
  };

  /* Clothing palettes per faction. The character generator samples from these so
     that faction determines visual language without producing clones. */
  DV.FactionStyle = {
    abnegation: {
      tops: ['robe', 'robe', 'shirt', 'tunic'],
      bottoms: ['pants', 'pants'],
      bottomsF: ['longskirt', 'longskirt', 'pants'],
      topColors: ['#7d7d78', '#8a8a84', '#6c6c68', '#96958e', '#74736d'],
      bottomColors: ['#5f5f5b', '#6a6a65', '#565652'],
      shoeColors: ['#3b3a37', '#4a4945'],
      hairM: ['short', 'buzzed', 'short'],
      hairF: ['bun', 'bun', 'ponytail'],
      accessories: [],
      tattooChance: 0,
      piercingChance: 0,
      glassesChance: 0.05,
    },
    dauntless: {
      tops: ['jacket', 'tank', 'tshirt', 'jacket', 'vest'],
      bottoms: ['pants'],
      bottomsF: ['pants', 'pants', 'skirt'],
      topColors: ['#1d1d1f', '#232325', '#2b2a2c', '#161617', '#3a1d1a'],
      bottomColors: ['#1a1a1c', '#222224', '#2a2626'],
      shoeColors: ['#121212', '#1d1a18'],
      hairM: ['mohawk', 'undercut', 'buzzed', 'messy', 'short', 'slicked'],
      hairF: ['undercut', 'messy', 'ponytail', 'short', 'mohawk', 'long'],
      dyeColors: ['#2c5fd6', '#c4232c', '#2fa84f', '#8d3ad6', '#e08a1e'],
      dyeChance: 0.35,
      accessories: [],
      tattooChance: 0.75,
      piercingChance: 0.65,
      glassesChance: 0,
    },
    erudite: {
      tops: ['blazer', 'shirt', 'cardigan', 'blazer'],
      bottoms: ['pants'],
      bottomsF: ['skirt', 'pants', 'skirt'],
      topColors: ['#2f5f9e', '#25497a', '#3b72b6', '#1f3d68', '#4a7fc1'],
      bottomColors: ['#1d2f4e', '#22385c', '#2a3b52'],
      shoeColors: ['#1b1b22', '#26272e'],
      hairM: ['slicked', 'short', 'medium', 'short'],
      hairF: ['ponytail', 'medium', 'bun', 'long'],
      accessories: [],
      tattooChance: 0,
      piercingChance: 0,
      glassesChance: 0.55,
    },
    candor: {
      tops: ['blazer', 'shirt', 'vest', 'blazer'],
      bottoms: ['pants'],
      bottomsF: ['skirt', 'pants'],
      topColors: ['#1b1b1b', '#f0efe9', '#141414', '#e6e5df'],
      bottomColors: ['#151515', '#1d1d1d', '#ebeae4'],
      shoeColors: ['#0f0f0f', '#1a1a1a'],
      hairM: ['short', 'slicked', 'medium'],
      hairF: ['long', 'medium', 'ponytail', 'short'],
      accessories: ['tie'],
      tattooChance: 0,
      piercingChance: 0.05,
      glassesChance: 0.15,
    },
    amity: {
      tops: ['tunic', 'shirt', 'tunic', 'cardigan'],
      bottoms: ['pants'],
      bottomsF: ['longskirt', 'skirt', 'longskirt'],
      topColors: ['#c0392b', '#e0a526', '#d9822b', '#b8531f', '#d4b03a', '#a8432f'],
      bottomColors: ['#7a5531', '#8c6a3f', '#6e4b2a', '#a3402c'],
      shoeColors: ['#5a3e24', '#6b4a2b'],
      hairM: ['messy', 'medium', 'long', 'short'],
      hairF: ['long', 'braids', 'messy', 'medium'],
      accessories: ['flower'],
      tattooChance: 0,
      piercingChance: 0,
      glassesChance: 0.05,
    },
    factionless: {
      tops: ['jacket', 'hoodie', 'tshirt', 'vest'],
      bottoms: ['pants'],
      bottomsF: ['pants', 'skirt'],
      topColors: ['#5b4d3e', '#4f5548', '#6a5c4c', '#3f4447', '#71614a', '#55463b'],
      bottomColors: ['#3e3a33', '#4a4339', '#35393a'],
      shoeColors: ['#2f2a24', '#3a332a'],
      hairM: ['messy', 'long', 'buzzed', 'medium'],
      hairF: ['messy', 'long', 'ponytail'],
      accessories: ['patches'],
      tattooChance: 0.2,
      piercingChance: 0.1,
      glassesChance: 0.05,
    },
    neutral: {
      tops: ['shirt'],
      bottoms: ['pants'],
      bottomsF: ['pants'],
      topColors: ['#cfc9bb'],
      bottomColors: ['#8f8a7f'],
      shoeColors: ['#4b4740'],
      hairM: ['short'],
      hairF: ['ponytail'],
      accessories: [],
      tattooChance: 0,
      piercingChance: 0,
      glassesChance: 0,
    },
  };

  DV.SkinTones = ['#f3d2b8', '#e9bf9b', '#d8a27c', '#c48a62', '#a8704a', '#8a5636', '#6e4128', '#4f2e1c'];
  DV.HairColors = [
    { id: 'black', hex: '#141210' },
    { id: 'darkbrown', hex: '#2e1f15' },
    { id: 'brown', hex: '#4e3423' },
    { id: 'chestnut', hex: '#6d3f22' },
    { id: 'auburn', hex: '#7e2f1c' },
    { id: 'red', hex: '#a2421d' },
    { id: 'dirtyblond', hex: '#8f7449' },
    { id: 'blond', hex: '#c4a565' },
    { id: 'platinum', hex: '#ddd3b8' },
    { id: 'grey', hex: '#8d8a85' },
    { id: 'white', hex: '#d9d7d2' },
  ];
  DV.EyeColors = ['#3a2a1a', '#4d3520', '#2d4d6b', '#3f6b4a', '#5a5a5a', '#6b4a2a'];
})();
