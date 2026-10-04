/* ==========================================================================
   DIVERGENT — game state model
   Everything that must survive save/load lives in DV.State.data. Systems
   read/write through small helpers so the shape stays versionable.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const SAVE_VERSION = 2;

  // v2 renamed several NPCs (and their ids) to fit the setting, and turned the
  // candidate card into a name badge. Old saves are rewritten through this map.
  const RENAMES_V2 = [
    ['rhea_stone', 'rae_dunmore', 'Rhea Stone', 'Rae Dunmore'],
    ['felix_arden', 'cyrus_albright', 'Felix Arden', 'Cyrus Albright'],
    ['dorian_pike', 'gideon_royce', 'Dorian Pike', 'Gideon Royce'],
    ['oren_vale', 'matthias_lowell', 'Oren Vale', 'Matthias Lowell'],
    ['abel_marsh', 'josiah_pell', 'Abel Marsh', 'Josiah Pell'],
    ['nadia_cole', 'delia_strand', 'Nadia Cole', 'Delia Strand'],
    ['priya_lanell', 'lydia_ashworth', 'Priya Lanell', 'Lydia Ashworth'],
    ['theo_vance', 'edmund_kell', 'Theo Vance', 'Edmund Kell'],
    ['ada_quill', 'cordelia_wynn', 'Ada Quill', 'Cordelia Wynn'],
    ['lena_ortiz', 'mags_tierney', 'Lena Ortiz', 'Mags Tierney'],
    ['dax_romero', 'ty_brennan', 'Dax Romero', 'Ty \\"Torch\\" Brennan'],
    ['bram_kessler', 'rafe_dorsey', 'Bram Kessler', 'Rafe Dorsey'],
    ['iris_kwan', 'nora_halloran', 'Iris Kwan', 'Nora Halloran'],
    ['owen_pryce', 'samuel_penrose', 'Owen Pryce', 'Samuel Penrose'],
    ['nell_avery', 'hannah_merrick', 'Nell Avery', 'Hannah Merrick'],
    ['candidate_card', 'name_badge'],
  ];

  function blank() {
    return {
      version: SAVE_VERSION,
      meta: { created: Date.now(), playTime: 0, chapter: 'Build 1 — Aptitude Day' },
      player: {
        name: 'Candidate',
        sex: 'm',
        upbringing: 'abnegation',
        appearance: null,
        attributes: { strength: 3, agility: 3, intelligence: 3, perception: 3, charisma: 3, resolve: 3 },
        skillXP: {},
        level: 1,
        xp: 0,
        unspent: 0,
        faction: null, // null = UNDECIDED until the Choosing Ceremony
        outfit: 'neutral',
        pos: { x: 0, z: 0, rot: 0 },
        zone: 'testing_center',
        stamina: 100,
        buffs: {},
      },
      world: {
        day: 1,
        time: U.parseTime(DV.Config.START_TIME),
        flags: {},
        zones: {}, // per zone persistent state: { doors: {id:'unlocked'}, taken: {pickupId:true}, visited: {roomId:true}, used: {} }
        lastPA: 0,
        paLog: [],
      },
      inventory: { items: [] }, // [{id, qty}]
      quests: {}, // id -> {state, objectives:{id:state}, log:[], updated}
      npcs: {}, // id -> {rel, trust, mem:{}, pos, override}
      reputation: { abnegation: 0, dauntless: 0, erudite: 0, candor: 0, amity: 0, factionless: 0 },
      aptitude: {
        status: 'not_started', // not_started | in_progress | complete
        scores: { abnegation: 0, dauntless: 0, erudite: 0, candor: 0, amity: 0 },
        traits: { selflessness: 0, logic: 0, aggression: 0, peacefulness: 0, honesty: 0, observation: 0, bravery: 0, resistance: 0, compliance: 0, deception: 0 },
        divergence: 0,
        choices: [], // [{sim, id, w}]
        result: null, // faction id | 'inconclusive'
        results: [], // top factions when inconclusive
        recordedAs: null, // what the technician officially recorded
        divergent: false,
      },
      journal: [], // free-form notes (important events)
    };
  }

  DV.State = {
    SAVE_VERSION,
    data: blank(),
    blank,
    reset() {
      this.data = blank();
      return this.data;
    },
    // flags
    flag(name) {
      return this.data.world.flags[name];
    },
    setFlag(name, v) {
      this.data.world.flags[name] = v === undefined ? true : v;
      DV.Events.emit('flag:changed', { name, value: this.data.world.flags[name] });
    },
    // per-zone persistent state
    zoneState(zoneId) {
      const z = this.data.world.zones;
      if (!z[zoneId]) z[zoneId] = { doors: {}, taken: {}, visited: {}, used: {} };
      return z[zoneId];
    },
    // NPC persistent state
    npc(id) {
      const n = this.data.npcs;
      if (!n[id]) {
        const def = DV.NPCData && DV.NPCData.get(id);
        n[id] = { rel: def && def.relationship ? def.relationship : 0, trust: 0, mem: {}, chosen: {} };
      }
      return n[id];
    },
    note(text) {
      this.data.journal.push({ t: this.data.world.time, day: this.data.world.day, text });
    },
    // migrate older saves forward. Each version bump adds a step here.
    migrate(d) {
      if (!d.version) d.version = 1;
      if (d.version < 2) {
        // ids and names appear as keys and values all over the state (npcs, runtime,
        // schedules partners, flags, journal) — rewrite the serialized form once
        let json = JSON.stringify(d);
        for (const [from, to, fromName, toName] of RENAMES_V2) {
          // match the id even inside other identifiers (talked_to_theo_vance) but not inside longer ids
          json = json.replace(new RegExp('(^|[^a-z0-9])' + from + '(?![a-z0-9])', 'g'), '$1' + to);
          if (fromName) json = json.split(fromName).join(toName);
        }
        d = JSON.parse(json);
        // the badge check at security is new in v2: anyone already past security showed theirs
        if (d.world && d.world.flags && d.world.flags.security_cleared) d.world.flags.badge_shown = true;
        d.version = 2;
      }
      U.fillDefaults(d, blank());
      return d;
    },
    RENAMES_V2,
  };
})();
