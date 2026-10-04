/* ==========================================================================
   DIVERGENT — attributes, skills, experience and levels
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
    skill(id) {
      const xp = DV.State.data.player.skillXP[id] || 0;
      return U.clamp(this.skillBase(id) + Math.floor(xp / 10), 0, 100);
    },
    // use-based skill growth
    practice(id, amount) {
      const sx = DV.State.data.player.skillXP;
      const before = this.skill(id);
      sx[id] = (sx[id] || 0) + (amount || 1) * 2.5;
      const after = this.skill(id);
      if (after > before) {
        DV.Events.emit('notify', { text: this.skillDef(id).name + ' increased to ' + after, kind: 'skill' });
      }
    },
    xpForLevel(l) {
      const t = DV.RPG.levelXP;
      return l < t.length ? t[l] : t[t.length - 1] + (l - t.length + 1) * 1000;
    },
    addXP(n, reason) {
      const p = DV.State.data.player;
      p.xp += n;
      if (reason) DV.Events.emit('notify', { text: '+' + n + ' XP — ' + reason, kind: 'xp' });
      while (p.xp >= this.xpForLevel(p.level + 1)) {
        p.level += 1;
        p.unspent += 1;
        DV.Audio.play('levelup');
        DV.Events.emit('notify', { text: 'LEVEL ' + p.level + ' — an attribute point is available (TAB → Character).', kind: 'level' });
        DV.Events.emit('player:levelup', p.level);
      }
    },
    spendPoint(attrId) {
      const p = DV.State.data.player;
      if (p.unspent <= 0 || p.attributes[attrId] >= DV.RPG.ATTR_MAX) return false;
      p.attributes[attrId] += 1;
      p.unspent -= 1;
      DV.Events.emit('player:stats');
      return true;
    },
    // dialogue / world checks: deterministic gate
    check(attr, dc) {
      return this.attr(attr) >= dc;
    },
    addBuff(id, attr, amount, minutes, label) {
      DV.State.data.player.buffs[id] = { attr, amount, until: DV.Clock.total() + minutes, label };
      DV.Events.emit('player:stats');
    },
  };
})();
