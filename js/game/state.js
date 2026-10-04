/* ==========================================================================
   DIVERGENT — game state model
   Everything that must survive save/load lives in DV.State.data. Systems
   read/write through small helpers so the shape stays versionable.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const SAVE_VERSION = 1;

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
      // if (d.version < 2) { ...; d.version = 2; }
      U.fillDefaults(d, blank());
      return d;
    },
  };
})();
