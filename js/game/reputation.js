/* ==========================================================================
   DIVERGENT — faction reputation & individual relationships
   Reputation (-100..100) per faction. NPC disposition = personal relationship
   + a share of the player's standing with that NPC's faction.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const TIERS = [
    [-60, 'Hostile'],
    [-25, 'Distrusted'],
    [-8, 'Wary'],
    [8, 'Neutral'],
    [25, 'Liked'],
    [50, 'Respected'],
    [101, 'Admired'],
  ];

  DV.Reputation = {
    get(f) {
      return DV.State.data.reputation[f] || 0;
    },
    add(f, delta, silent) {
      const r = DV.State.data.reputation;
      if (!(f in r)) return;
      r[f] = U.clamp(r[f] + delta, -100, 100);
      if (!silent && delta) {
        DV.Events.emit('notify', { text: DV.Factions.name(f) + ' reputation ' + (delta > 0 ? 'increased' : 'decreased'), kind: delta > 0 ? 'rep_up' : 'rep_down' });
      }
      DV.Events.emit('reputation:changed', { faction: f, value: r[f] });
    },
    label(v) {
      for (const [lim, name] of TIERS) if (v < lim) return name;
      return 'Admired';
    },
    // personal relationship helpers
    rel(npcId) {
      return DV.State.npc(npcId).rel;
    },
    addRel(npcId, delta, silent) {
      const s = DV.State.npc(npcId);
      let d = delta;
      if (delta > 0 && DV.Stats) d = Math.round(delta * (1 + (DV.Stats.skill('persuasion') - 20) / 150));
      s.rel = U.clamp(s.rel + d, -100, 100);
      if (!silent && d) {
        const def = DV.NPCData.get(npcId);
        DV.Events.emit('notify', { text: (def ? def.name : npcId) + (d > 0 ? ' likes that.' : ' didn\'t like that.'), kind: d > 0 ? 'rel_up' : 'rel_down' });
      }
      return s.rel;
    },
    disposition(npcId) {
      const def = DV.NPCData.get(npcId);
      const s = DV.State.npc(npcId);
      let d = s.rel;
      if (def && def.faction && DV.State.data.reputation[def.faction] !== undefined) d += DV.State.data.reputation[def.faction] / 4;
      // same upbringing → slight warmth; outfit matching the NPC's faction → slight warmth
      const p = DV.State.data.player;
      if (def && p.upbringing === def.faction) d += 4;
      if (def && p.outfit === def.faction) d += 3;
      return U.clamp(Math.round(d), -100, 100);
    },
    dispositionLabel(v) {
      if (v <= -40) return 'Hostile';
      if (v <= -15) return 'Cold';
      if (v < 10) return 'Neutral';
      if (v < 30) return 'Friendly';
      if (v < 60) return 'Warm';
      return 'Devoted';
    },
  };
})();
