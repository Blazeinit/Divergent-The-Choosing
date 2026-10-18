/* ==========================================================================
   DIVERGENT — the Codex: lore entries opened by play
   Watches what you do (flags, quests, places, reading, the Choosing) and
   opens entries from js/data/codex.js as their conditions come true. What's
   open, and what you've read, lives in DV.State.data.codex.
   The very first check on a new or loaded game is silent, so a save doesn't
   arrive to a dozen "New in the Codex" toasts.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  const C = {
    st() {
      const d = DV.State.data;
      return d.codex || (d.codex = { open: {}, init: false });
    },
    // the view of the save that conditions read
    view() {
      const d = DV.State.data, w = d.world, pl = d.player;
      const met = {};
      for (const id in d.npcs) if (d.npcs[id].mem && d.npcs[id].mem.met) { const def = DV.NPCData && DV.NPCData.get(id); if (def && def.faction) met[def.faction] = true; }
      const seenRead = pl.xpSeen || {};
      return {
        d, player: pl, apt: d.aptitude,
        flag: (n) => !!w.flags[n],
        been: (z) => !!w.zones[z],
        sector: (id) => !!(w.visited && w.visited[id]),
        knows: (f) => pl.upbringing === f || pl.faction === f || !!met[f] || !!(w.visited && w.visited[f]),
        read: (it) => !!seenRead['read:' + it] || !!(C.st().open['doc_' + it]),
        quest: (id) => { const q = d.quests[id]; return q ? q.state : null; },
      };
    },
    entries() {
      const out = DV.CodexData.entries.slice();
      // every document you've read is kept
      for (const id in this.st().open) {
        if (id.indexOf('doc_') !== 0) continue;
        const it = DV.Items.get(id.slice(4));
        if (it && it.use && it.use.type === 'read') out.push({ id, cat: 'documents', title: it.use.title || it.name, text: it.use.text.replace('{name}', DV.State.data.player.name.toUpperCase()) });
      }
      return out;
    },
    get(id) { return this.entries().find((e) => e.id === id); },
    title(e) { return typeof e.title === 'function' ? e.title() : e.title; },
    text(e) { return typeof e.text === 'function' ? e.text() : e.text; },
    isOpen(id) { return !!this.st().open[id]; },
    unread() { const o = this.st().open; return Object.keys(o).filter((k) => !o[k].read); },
    markRead(id) { const r = this.st().open[id]; if (r && !r.read) { r.read = true; DV.Events.emit('codex:changed'); } },
    open(id, silent) {
      const st = this.st();
      if (st.open[id]) return false;
      st.open[id] = { day: DV.State.data.world.day, t: DV.State.data.world.time, read: !!silent };
      if (!silent) {
        const e = this.get(id);
        DV.Events.emit('notify', { text: 'New in the Codex: ' + (e ? this.title(e) : id), kind: 'info' });
        DV.Stats.award('codex', id, null);
      }
      DV.Events.emit('codex:changed');
      return true;
    },
    // check every closed entry's condition
    refresh() {
      if (!DV.CodexData || !DV.State.data) return;
      const st = this.st(), silent = !st.init;
      const S = this.view();
      for (const e of DV.CodexData.entries) {
        if (st.open[e.id]) continue;
        let ok = false;
        try { ok = !!e.when(S); } catch (err) { ok = false; }
        if (ok) this.open(e.id, silent);
      }
      st.init = true;
    },
    soon() {
      if (this._t) return;
      this._t = setTimeout(() => { this._t = null; this.refresh(); }, 50);
    },
    init() {
      const later = () => this.soon();
      for (const ev of ['flag:changed', 'quest:changed', 'dialogue:end', 'faction:chosen', 'zone:activated', 'district:enter', 'chapter:start', 'activity:end', 'metro:enter']) DV.Events.on(ev, later);
      DV.Events.on('clock:minute', (m) => { if (m % 10 === 0) later(); });
      DV.Events.on('item:read', (id) => {
        DV.Stats.award('read', id, 'Read ' + ((DV.Items.get(id) || {}).name || 'a document'));
        this.open('doc_' + id, !this.st().init);
      });
    },
  };
  DV.Codex = C;
})();
