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
      // Abnegation's Service Before Self: good opinion grows faster
      if (delta > 0 && DV.Perks) delta = Math.round(delta * (1 + DV.Perks.mod('rep.gain')));
      const before = this.standing(f).idx;
      r[f] = U.clamp(r[f] + delta, -100, 100);
      const now = this.standing(f);
      if (!silent && now.idx !== before && DV.FactionStanding.titles[f]) {
        DV.Events.emit('notify', { text: DV.Factions.name(f) + ' now call you ' + now.title + ' (' + now.label + ').', kind: now.idx > before ? 'level' : 'rep_down' });
      }
      if (!silent && delta) {
        DV.Events.emit('notify', { text: DV.Factions.name(f) + ' reputation ' + (delta > 0 ? 'increased' : 'decreased'), kind: delta > 0 ? 'rep_up' : 'rep_down' });
      }
      DV.Events.emit('reputation:changed', { faction: f, value: r[f] });
    },
    label(v) {
      for (const [lim, name] of TIERS) if (v < lim) return name;
      return 'Admired';
    },
    tierName(idx) { return TIERS[U.clamp(idx, 0, TIERS.length - 1)][1]; },
    /* Where you stand with a faction: the tier (0..6, Hostile..Admired), its rank (-3..3, Neutral 0),
       what they call you (a member is called by the member's title once they're at least Neutral),
       and how far to the next title. */
    standing(f) {
      const v = this.get(f), S = DV.FactionStanding;
      let idx = S.limits.findIndex((lim) => v < lim);
      if (idx < 0) idx = S.limits.length - 1;
      const rank = S.ranks[idx], p = DV.State.data.player;
      const member = p.faction === f, titles = S.titles[f];
      const transfer = member && p.upbringing !== f;
      let title = titles ? titles[idx] : TIERS[idx][1];
      if (member && rank >= 0 && S.member[f]) title = S.member[f][Math.min(rank, 3)];
      const next = idx < S.limits.length - 1 ? { at: S.limits[idx], title: member && rank + 1 >= 0 && S.member[f] ? S.member[f][Math.min(rank + 1, 3)] : titles ? titles[idx + 1] : TIERS[idx + 1][1], label: TIERS[idx + 1][1] } : null;
      const from = idx > 0 ? S.limits[idx - 1] : -100;
      return { value: v, idx, rank, label: TIERS[idx][1], title, member, transfer, raised: p.upbringing === f, next, from };
    },
    // personal relationship helpers
    rel(npcId) {
      return DV.State.npc(npcId).rel;
    },
    addRel(npcId, delta, silent) {
      const s = DV.State.npc(npcId);
      let d = delta;
      if (delta > 0 && DV.Stats) d = Math.round(delta * (1 + (DV.Stats.skill('persuasion') - 20) / 150) * (1 + (DV.Perks ? DV.Perks.mod('rel.gain') : 0)));
      // Mend Fences, Selfless Reputation: people sour on you more slowly (but never not at all)
      if (delta < 0 && DV.Perks && DV.Perks.mod('rel.loss')) d = Math.min(-1, Math.round(delta * Math.max(0.2, 1 + DV.Perks.mod('rel.loss'))));
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
      // Rapport; Kindness Is Law (nobody stays hostile for long)
      if (DV.Perks) {
        d += DV.Perks.mod('disp.all');
        if (DV.Perks.defines('disp.floor')) d = Math.max(d, DV.Perks.mod('disp.floor'));
      }
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
