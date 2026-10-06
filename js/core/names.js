/* ==========================================================================
   DIVERGENT — names
   Everybody in the city has a name. The people the story is about have theirs
   written down (js/data/npcs*.js); this is for everyone else: the crowd at the
   Choosing, the people on the pavements, the farm hands, the extras in the Pit.

     DV.Names.person(faction, sex, seed, used?) → 'Maya Okafor'
     DV.Names.first(faction, sex, seed)         → 'Maya'
     DV.Names.pool(faction, sex)                → the first names a faction draws on

   The same seed always gives the same name; `used` (a Set) makes a whole crowd
   unique (and never repeats the name of anyone in the story).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // first names, by sex, with each faction's flavour on top: plain and old for Abnegation,
  // learned and a little formal for Erudite, direct for Candor, warm for Amity, short and hard for Dauntless
  const FIRST = {
    f: {
      common: ['Maya', 'Ines', 'Rhea', 'Lena', 'Odette', 'Priya', 'Nadia', 'Carla', 'Zoe', 'Hana', 'Greta', 'Alma', 'Dina', 'Leah', 'Mira', 'Talia', 'Yara', 'Esme', 'Noor', 'Paloma', 'Sunita', 'Tamsin', 'Vera', 'Willa', 'Imani', 'Joelle', 'Kira', 'Lourdes', 'Marisol', 'Neve'],
      abnegation: ['Edith', 'Martha', 'Agnes', 'Ada', 'Hester', 'Ione', 'Mabel', 'Ellen', 'Naomi', 'Tabitha', 'Winifred', 'Clara', 'Lydia', 'Phoebe', 'Rachel', 'Judith'],
      erudite: ['Beatrix', 'Cordelia', 'Philippa', 'Lucia', 'Octavia', 'Sylvie', 'Thea', 'Vivian', 'Anneliese', 'Delphine', 'Imogen', 'Marguerite', 'Rosalind', 'Seraphine'],
      candor: ['Joan', 'Dolores', 'Frances', 'Gwen', 'Harriet', 'Irene', 'Jo', 'Karen', 'Louise', 'Nell', 'Olive', 'Pat', 'Rita', 'Sadie', 'Trudy'],
      amity: ['Daisy', 'Poppy', 'Hazel', 'Rose', 'Fern', 'Iris', 'Juniper', 'Lily', 'Marigold', 'Sage', 'Wren', 'Willow', 'Clover', 'Dahlia', 'Jessamine'],
      dauntless: ['Roxy', 'Jax', 'Kat', 'Lux', 'Mack', 'Nyx', 'Pru', 'Rue', 'Sloane', 'Tori', 'Vex', 'Zed', 'Ash', 'Blaze', 'Cass'],
    },
    m: {
      common: ['Luca', 'Mateo', 'Idris', 'Jonas', 'Anton', 'Rafael', 'Felix', 'Hugo', 'Omar', 'Pavel', 'Santiago', 'Tomas', 'Viktor', 'Wendell', 'Yusuf', 'Dario', 'Emeka', 'Giorgio', 'Haruto', 'Ibrahim', 'Joaquin', 'Kofi', 'Leonid', 'Mikael', 'Nikolai', 'Oren', 'Paulo', 'Quentin', 'Rui', 'Soren'],
      abnegation: ['Silas', 'Eli', 'Amos', 'Caleb', 'Ezekiel', 'Gideon', 'Isaac', 'Jonah', 'Micah', 'Obadiah', 'Reuben', 'Simeon', 'Tobias', 'Walter', 'Abel', 'Josiah'],
      erudite: ['Anselm', 'Cornelius', 'Desmond', 'Evander', 'Florian', 'Lucian', 'Leopold', 'Maximilian', 'Percival', 'Rupert', 'Sebastian', 'Theodore', 'Ambrose', 'Julian'],
      candor: ['Frank', 'Hank', 'Gus', 'Leo', 'Mort', 'Ned', 'Ray', 'Sam', 'Stan', 'Ted', 'Vic', 'Walt', 'Abe', 'Ben', 'Cal'],
      amity: ['Rowan', 'Basil', 'Clay', 'Forrest', 'Heath', 'Linden', 'Moss', 'Oakley', 'Reed', 'River', 'Sorrel', 'Tarn', 'Aspen', 'Briar', 'Hollis'],
      dauntless: ['Rex', 'Dane', 'Gage', 'Jett', 'Knox', 'Maverick', 'Nash', 'Ryker', 'Stone', 'Trace', 'Vance', 'Zane', 'Colt', 'Dash', 'Hawk'],
    },
  };
  const LAST = ['Abara', 'Adler', 'Aguilar', 'Alder', 'Amsel', 'Banerjee', 'Barrow', 'Bellamy', 'Brandt', 'Calloway', 'Cardoso', 'Carver', 'Chandra', 'Cho', 'Cortez', 'Dawes', 'Demir', 'Dunmore', 'Ellery', 'Esposito', 'Farrow', 'Feld', 'Fontaine', 'Garza', 'Gill', 'Haddad', 'Halloran', 'Hart', 'Hobbs', 'Iyer', 'Jansen', 'Kaplan', 'Keane', 'Khan', 'Kovac', 'Lacey', 'Lindgren', 'Lowe', 'Maddox', 'Marlow', 'Mbeki', 'Mercer', 'Nakamura', 'Navarro', 'Nwosu', 'Okafor', 'Ostrow', 'Pace', 'Palmer', 'Pratt', 'Quill', 'Rahman', 'Rask', 'Rowe', 'Saito', 'Salazar', 'Sato', 'Sharpe', 'Sloane', 'Stroud', 'Tamura', 'Thorne', 'Ueda', 'Valdez', 'Voss', 'Wade', 'Whitlock', 'Wolfe', 'Yoon', 'Zaman', 'Ashby', 'Beck', 'Crane', 'Doyle', 'Eames', 'Finch', 'Gantry', 'Hale', 'Ingram', 'Joyce', 'Kerr', 'Lund', 'Moss', 'Nolan', 'Orr', 'Pruitt', 'Quinn', 'Rudd', 'Shaw', 'Tate', 'Underhill', 'Vickers', 'Wray', 'York'];
  // Abnegation keep to plain surnames; Amity take from the land
  const LAST_FLAVOUR = {
    abnegation: ['Ashby', 'Beck', 'Crane', 'Doyle', 'Hale', 'Joyce', 'Kerr', 'Moss', 'Orr', 'Shaw', 'Tate', 'Wade', 'York', 'Pratt', 'Rowe', 'Lund'],
    amity: ['Alder', 'Barrow', 'Fontaine', 'Hart', 'Lacey', 'Marlow', 'Thorne', 'Wray', 'Farrow', 'Ellery', 'Finch', 'Carver'],
  };

  let reserved = null;
  const taken = () => {
    if (reserved) return reserved;
    reserved = new Set();
    try {
      for (const d of (DV.NPCData && DV.NPCData.list) || []) reserved.add(d.name);
      for (const c of (DV.Hub && DV.Hub.CANDIDATES) || []) if (c.name) reserved.add(c.name);
    } catch (e) { /* the roster isn't loaded yet: only the story's own names are skipped */ }
    return reserved;
  };

  function pool(faction, sex) {
    const s = FIRST[sex === 'f' ? 'f' : 'm'];
    return (s[faction] || []).concat(s.common);
  }
  function first(faction, sex, seed) {
    const r = U.rng('fn:' + faction + ':' + sex + ':' + seed);
    const p = pool(faction, sex);
    // the faction's own names are a little more likely than the common ones
    const own = (FIRST[sex === 'f' ? 'f' : 'm'][faction] || []).length;
    return r() < 0.6 && own ? p[Math.floor(r() * own)] : p[Math.floor(r() * p.length)];
  }
  function last(faction, seed) {
    const r = U.rng('ln:' + faction + ':' + seed);
    const fl = LAST_FLAVOUR[faction];
    return fl && r() < 0.55 ? fl[Math.floor(r() * fl.length)] : LAST[Math.floor(r() * LAST.length)];
  }
  function person(faction, sex, seed, used) {
    for (let k = 0; k < 24; k++) {
      const s = k ? seed + '#' + k : seed;
      const n = first(faction, sex, s) + ' ' + last(faction, s + '|' + sex);
      if (taken().has(n) || (used && used.has(n))) continue;
      if (used) used.add(n);
      return n;
    }
    return first(faction, sex, seed) + ' ' + last(faction, seed);
  }

  DV.Names = { person, first, pool, LAST };
})();
