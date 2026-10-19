/* ==========================================================================
   DIVERGENT — attributes, skills, experience and levels
   Experience comes from the sources in DV.RPG.xpSources (award), or a bare
   addXP from a quest or a scene. Each level brings an attribute point and a
   perk point (two at the milestones) and a fanfare (player:levelup). Checks
   read an attribute plus whatever perks and standing add (checkValue).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  DV.Stats = {
    attr(id) {
      const p = DV.State.data.player;
      let v = p.attributes[id] || 0;
      const b = p.buffs || {};
      for (const k in b) if (b[k] && b[k].attr === id && b[k].until > DV.Clock.total()) v += b[k].amount;
      return v;
    },
    baseAttr(id) {
      return DV.State.data.player.attributes[id] || 0;
    },
    skillDef(id) {
      return DV.RPG.skills.find((s) => s.id === id);
    },
    skillBase(id) {
      const d = this.skillDef(id);
      if (!d) return 0;
      const avg = d.attrs.reduce((a, k) => a + this.baseAttr(k), 0) / d.attrs.length;
      return Math.round(5 + avg * 6);
    },
    // trained level (attributes + practice), before perks
    skillTrained(id) {
      const xp = DV.State.data.player.skillXP[id] || 0;
      return U.clamp(this.skillBase(id) + Math.floor(xp / 10), 0, 100);
    },
    skill(id) {
      return U.clamp(this.skillTrained(id) + (DV.Perks ? DV.Perks.mod('skill.' + id) : 0), 0, 100);
    },
    // progress toward the next point of a skill (0..1)
    skillFrac(id) {
      const xp = DV.State.data.player.skillXP[id] || 0;
      return (xp % 10) / 10;
    },
    // use-based skill growth
    practice(id, amount) {
      const sx = DV.State.data.player.skillXP;
      const before = this.skillTrained(id);
      sx[id] = (sx[id] || 0) + (amount || 1) * 2.5 * (1 + (DV.Perks ? DV.Perks.mod('practice.gain') : 0));
      const after = this.skillTrained(id);
      if (after > before) {
        DV.Events.emit('notify', { text: this.skillDef(id).name + ' increased to ' + this.skill(id), kind: 'skill' });
        // a skill crossing a perk tier: say so (the tree has something new for you)
        const T = DV.PerkData && DV.PerkData.SKILL_TIERS;
        if (T && T.some((t) => before < t && after >= t)) DV.Events.emit('notify', { text: this.skillDef(id).name + ': a new tier of perks is open (TAB → Skills & Perks).', kind: 'level' });
        DV.Events.emit('player:skill', { id, value: after });
      }
    },
    xpForLevel(l) {
      const t = DV.RPG.levelXP;
      return l < t.length ? t[l] : t[t.length - 1] + (l - t.length + 1) * 2000;
    },
    maxLevel() { return DV.RPG.MAX_LEVEL || 20; },
    addXP(n, reason) {
      const p = DV.State.data.player;
      n = Math.max(0, Math.round(n * (1 + (DV.Perks ? DV.Perks.mod('xp.gain') : 0))));
      if (!n) return 0;
      p.xp += n;
      if (reason) DV.Events.emit('notify', { text: '+' + n + ' XP — ' + reason, kind: 'xp' });
      DV.Events.emit('player:xp', { n, reason: reason || null });
      while (p.level < this.maxLevel() && p.xp >= this.xpForLevel(p.level + 1)) {
        p.level += 1;
        const ap = DV.RPG.attrPointsAt(p.level), pp = DV.RPG.perkPointsAt(p.level);
        p.unspent += ap;
        p.perkPoints = (p.perkPoints === undefined ? DV.RPG.PERK_START : p.perkPoints) + pp;
        DV.Audio.play('fanfare');
        DV.Events.emit('notify', { text: 'LEVEL ' + p.level + ' — ' + ap + ' attribute point' + (ap > 1 ? 's' : '') + ' and ' + pp + ' perk point' + (pp > 1 ? 's' : '') + ' (TAB).', kind: 'level' });
        DV.State.note('Reached level ' + p.level + '.');
        DV.Events.emit('player:levelup', { level: p.level, attr: ap, perk: pp });
        if (DV.Perks) DV.Perks.changed();
      }
      return n;
    },
    /* experience from a named source (DV.RPG.xpSources): `once` sources pay a key a single time.
       mult scales the table's amount (a harder check, a better score). Returns what was paid. */
    award(src, key, reason, mult) {
      const S = DV.RPG.xpSources[src];
      if (!S || !S.xp) return 0;
      const p = DV.State.data.player;
      if (S.once) {
        const k = src + ':' + (key || '');
        const seen = p.xpSeen || (p.xpSeen = {});
        if (seen[k]) return 0;
        seen[k] = DV.State.data.world.day;
      }
      let n = S.xp * (mult === undefined ? 1 : mult);
      if ((src === 'discovery' || src === 'sector') && DV.Perks) n *= 1 + DV.Perks.mod('xp.discovery');
      return this.addXP(n, reason === null ? null : reason || S.label);
    },
    spendPoint(attrId) {
      const p = DV.State.data.player;
      if (p.unspent <= 0 || p.attributes[attrId] >= DV.RPG.ATTR_MAX) return false;
      p.attributes[attrId] += 1;
      p.unspent -= 1;
      DV.Events.emit('player:stats');
      return true;
    },
    // an attribute as a check sees it: the value, plus perks and standing (ctx: {faction, tree, choice, npcId})
    checkValue(attr, ctx) {
      return this.attr(attr) + (DV.Perks ? DV.Perks.checkBonus(attr, ctx).total : 0);
    },
    // dialogue / world checks: deterministic gate
    check(attr, dc, ctx) {
      return this.checkValue(attr, ctx) >= dc;
    },
    addBuff(id, attr, amount, minutes, label) {
      DV.State.data.player.buffs[id] = { attr, amount, until: DV.Clock.total() + minutes, label };
      DV.Events.emit('player:stats');
    },
  };
})();
