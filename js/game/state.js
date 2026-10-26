/* ==========================================================================
   DIVERGENT — game state model
   Everything that must survive save/load lives in DV.State.data. Systems
   read/write through small helpers so the shape stays versionable.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const SAVE_VERSION = 5;

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
  // v3 replaced the remaining invented, "fantasy" names with ordinary ones — ids, display
  // names and the flags/memory keys that embedded a first name.
  const RENAMES_V3 = [
    ['juno_ashgrove', 'claire_dawson', 'Juno Ashgrove', 'Claire Dawson'],
    ['kade_mercer', 'dean_walsh', 'Kade Mercer', 'Dean Walsh'],
    ['rae_dunmore', 'jess_thompson', 'Rae Dunmore', 'Jess Thompson'],
    ['brann_holt', 'frank_kowalski', 'Brann Holt', 'Frank Kowalski'],
    ['marion_hale', 'martha_bell', 'Marion Hale', 'Martha Bell'],
    ['cassius_wren', 'alan_pierce', 'Dr. Cassius Wren', 'Dr. Alan Pierce'],
    ['ines_calder', 'sarah_lin', 'Ines Calder', 'Sarah Lin'],
    ['cyrus_albright', 'kevin_shah', 'Cyrus Albright', 'Kevin Shah'],
    ['gideon_royce', 'tom_garza', 'Gideon Royce', 'Tom Garza'],
    ['matthias_lowell', 'paul_becker', 'Matthias Lowell', 'Paul Becker'],
    ['willow_fairbrook', 'rose_murphy', 'Willow Fairbrook', 'Rose Murphy'],
    ['josiah_pell', 'walter_grant', 'Josiah Pell', 'Walter Grant'],
    ['gus_ferro', 'gus_novak', 'Gus Ferro', 'Gus Novak'],
    ['delia_strand', 'denise_carter', 'Delia Strand', 'Denise Carter'],
    ['lydia_ashworth', 'emily_shaw', 'Lydia Ashworth', 'Emily Shaw'],
    ['ruth_calloway', 'ruth_abbott', 'Ruth Calloway', 'Ruth Abbott'],
    ['sorrel_gale', 'leo_brooks', 'Sorrel Gale', 'Leo Brooks'],
    ['mara_voss', 'jenna_morales', 'Mara Voss', 'Jenna Morales'],
    ['elias_thorne', 'daniel_webb', 'Elias Thorne', 'Daniel Webb'],
    ['pip_hollis', 'lucy_barnes', 'Pip Hollis', 'Lucy Barnes'],
    ['rook_delaney', 'nate_russo', 'Rook Delaney', 'Nate Russo'],
    ['edmund_kell', 'ben_fischer', 'Edmund Kell', 'Ben Fischer'],
    ['cordelia_wynn', 'grace_chen', 'Cordelia Wynn', 'Grace Chen'],
    ['mags_tierney', 'kat_malone', 'Mags Tierney', 'Kat Malone'],
    ['ty_brennan', 'joey_brennan', 'Ty \\"Torch\\" Brennan', 'Joey Brennan'],
    ['rafe_dorsey', 'josh_miller', 'Rafe Dorsey', 'Josh Miller'],
    ['nora_halloran', 'nora_kelly', 'Nora Halloran', 'Nora Kelly'],
    ['samuel_penrose', 'samuel_ward', 'Samuel Penrose', 'Samuel Ward'],
    ['hannah_merrick', 'hannah_lewis', 'Hannah Merrick', 'Hannah Lewis'],
    ['juniper_nash', 'abby_morgan', 'Juniper Nash', 'Abby Morgan'],
    ['elias_convinced', 'daniel_convinced'],
    ['elias_missed', 'daniel_missed'],
    ['elias_tested', 'daniel_tested'],
    ['elias_style', 'daniel_style'],
    ['elias_reason', 'daniel_reason'],
    ['elias_knows_list', 'daniel_knows_list'],
    ['elias_maybe_divergent', 'daniel_maybe_divergent'],
    ['eliasConvinced', 'danielConvinced'],
    ['wren_watching', 'pierce_watching'],
    ['took_wren_key', 'took_pierce_key'],
    ['asked_wren_pd', 'asked_pierce_pd'],
    ['wren_drawer_hint', 'pierce_drawer_hint'],
    ['wren_suspicious', 'pierce_suspicious'],
    ['pd_wren', 'pd_pierce'],
    ['heardWren', 'heardPierce'],
    ['juno_hinted', 'claire_hinted'],
    ['asked_juno_pd', 'asked_claire_pd'],
    ['juno_ally', 'claire_ally'],
    ['mara_knows_pd', 'jenna_knows_pd'],
    ['told_mara_envelope', 'told_jenna_envelope'],
    ['mara_knows_divergent', 'jenna_knows_divergent'],
    ['ines_lost_card', 'sarah_lost_card'],
    ['ines_warned', 'sarah_warned'],
    ['willow_hint', 'rose_hint'],
    ['kadepast', 'deanpast'],
  ];

  function blank() {
    return {
      version: SAVE_VERSION,
      meta: { created: Date.now(), playTime: 0, chapter: 'Aptitude Day' },
      story: { chapter: null }, // Build 2: the current story chapter + checkpoint, your faction choice, leanings
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
        // v4: perks ({id: {day, t}}), perk points, and which once-only experience you've had (DV.Stats.award)
        perks: {},
        perkPoints: DV.RPG.PERK_START,
        xpSeen: {},
        faction: null, // null = UNDECIDED until the Choosing Ceremony
        outfit: 'neutral',
        pos: { x: 0, z: 0, rot: 0 },
        zone: 'testing_center',
        stamina: 100,
        buffs: {},
        // Build 7: ration scrip, the city's money: every citizen's faction issues an allowance, and
        // work (quests, jobs at the shops) earns more. Spent and earned at the shops (js/game/shops.js)
        scrip: 25,
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
      shops: {}, // Build 7: per shop: { day, stock: {item: qty}, job: day, … } (js/game/shops.js)
      codex: { open: {}, init: false }, // v4: lore entries you've opened ({id: {day, t, read}})
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
      // the same person in a later place (Nate at the Testing Center, Nate in the Pit) shares one memory
      const alias = DV.NPCData && DV.NPCData.get(id);
      if (alias && alias.memOf) id = alias.memOf;
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
      // ids and names appear as keys and values all over the state (npcs, runtime,
      // schedules partners, flags, journal) — rewrite the serialized form once per step
      const rename = (d, table) => {
        let json = JSON.stringify(d);
        for (const [from, to, fromName, toName] of table) {
          // match the id even inside other identifiers (talked_to_theo_vance) but not inside longer ids
          json = json.replace(new RegExp('(^|[^A-Za-z0-9])' + from + '(?![A-Za-z0-9])', 'g'), '$1' + to);
          if (fromName) json = json.split(fromName).join(toName);
        }
        return JSON.parse(json);
      };
      if (d.version < 2) {
        d = rename(d, RENAMES_V2);
        // the badge check at security is new in v2: anyone already past security showed theirs
        if (d.world && d.world.flags && d.world.flags.security_cleared) d.world.flags.badge_shown = true;
        d.version = 2;
      }
      if (d.version < 3) {
        d = rename(d, RENAMES_V3);
        d.version = 3;
      }
      // v4 added perks, perk points and the Codex. An older save gets the perk points its levels
      // would have earned (one to start, one a level, one more at each milestone), keeps every
      // attribute point it hadn't spent, and counts the rooms and sectors it had already found as
      // discovered (so walking back into them pays nothing twice). Its Codex opens quietly on load.
      if (d.version < 4) {
        const p = d.player || (d.player = {});
        const lvl = Math.max(1, p.level || 1);
        let pts = DV.RPG.PERK_START;
        for (let l = 2; l <= lvl; l++) pts += DV.RPG.perkPointsAt(l);
        p.perks = p.perks || {};
        p.perkPoints = pts;
        const seen = p.xpSeen || (p.xpSeen = {});
        const w = d.world || {};
        for (const z in w.zones || {}) for (const r in (w.zones[z] && w.zones[z].visited) || {}) seen['discovery:' + z + ':' + r] = 0;
        for (const id in w.visited || {}) seen['sector:' + id] = 0;
        d.codex = { open: {}, init: false };
        d.version = 4;
      }
      // v5: Stage Two runs over several days, with Stage Three after it (js/game/stagetwo.js). A save from
      // before that keeps its own story: past the cut with the Chalk Year already under way, it carries on
      // as it was (legacy); past the cut and no further, the first fear becomes Stage Two's first session
      if (d.version < 5) {
        const story = d.story || {}, init = story.init, camp = story.campaign;
        const s1 = d.quests && d.quests.stage_one && d.quests.stage_one.state === 'complete';
        if (init && s1 && !story.stage2) {
          const begun = !!(camp && camp.ep && Object.keys(camp.ep).some((k) => camp.ep[k] !== 'new'));
          story.stage2 = { sessions: {}, results: [], run: null, final: null, job: null, ctf: null, legacy: begun, board: null, notes: {} };
          if (init.fear) {
            const f = init.fear, r = { fear: f.id || (f.fear === 'drowning' ? 'tank' : 'beam'), how: f.how, secs: f.secs, aware: !!f.aware };
            story.stage2.sessions[1] = { day: 6, results: [r], pts: 0 };
            story.stage2.results.push(Object.assign({ day: 6, kind: 'session', session: 1 }, r));
          }
          d.story = story;
        }
        d.version = 5;
      }
      U.fillDefaults(d, blank());
      return d;
    },
    RENAMES_V2,
    RENAMES_V3,
  };
})();
