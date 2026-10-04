/* ==========================================================================
   DIVERGENT — save / load (localStorage)
   Slots 1..N + an autosave slot. Each save stores a summary (for the load
   menu) and the full versioned state. NPC runtime positions are stored so
   the world resumes exactly; schedules re-sync anything stale.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const PFX = DV.Config.SAVE_PREFIX;

  const Save = {
    key(slot) {
      return PFX + 'slot_' + slot;
    },
    slots() {
      const out = [{ slot: 'auto', label: 'Autosave' }];
      for (let i = 1; i <= DV.Config.SAVE_SLOTS; i++) out.push({ slot: String(i), label: 'Slot ' + i });
      return out.map((s) => Object.assign(s, { summary: this.peek(s.slot) }));
    },
    peek(slot) {
      try {
        const raw = localStorage.getItem(this.key(slot));
        if (!raw) return null;
        const d = JSON.parse(raw);
        return d.summary || null;
      } catch (e) {
        return null;
      }
    },
    available() {
      try {
        const k = PFX + '__probe';
        localStorage.setItem(k, '1');
        localStorage.removeItem(k);
        return true;
      } catch (e) {
        return false;
      }
    },
    snapshot() {
      const game = DV.Game;
      const st = DV.State.data;
      // player position
      if (game.homeZoneId() === (DV.World.current && DV.World.current.id)) {
        st.player.pos = { x: +DV.Player.x.toFixed(2), z: +DV.Player.z.toFixed(2), rot: +DV.Player.rot.toFixed(3) };
      }
      st.player.stamina = Math.round(DV.Player.stamina);
      st.npcRuntime = DV.NPCs.serialize();
      st.questsTracked = DV.Quests.tracked;
      return U.deepClone(st);
    },
    write(slot) {
      if (DV.Game.inSimulation()) return { ok: false, message: 'You cannot save during the simulation.' };
      try {
        const state = this.snapshot();
        const zone = DV.World.current;
        const room = zone ? zone.roomAt(DV.Player.x, DV.Player.z) : null;
        const summary = {
          name: state.player.name,
          level: state.player.level,
          location: room ? room.name : zone ? zone.def.name : '',
          time: U.formatTime(state.world.time),
          day: state.world.day,
          playTime: Math.round(state.meta.playTime),
          saved: Date.now(),
          result: state.aptitude.status === 'complete' ? DV.Aptitude.displayResult() : null,
          faction: state.player.faction ? DV.Factions.name(state.player.faction) : null, // Build 2: after the Choosing
        };
        localStorage.setItem(this.key(slot), JSON.stringify({ version: DV.State.SAVE_VERSION, summary, state }));
        localStorage.setItem(PFX + 'last', slot);
        return { ok: true, message: slot === 'auto' ? 'Autosaved.' : 'Game saved to slot ' + slot + '.' };
      } catch (e) {
        console.error('Save failed', e);
        return { ok: false, message: 'Save failed: ' + (e && e.message ? e.message : 'storage unavailable') };
      }
    },
    read(slot) {
      try {
        const raw = localStorage.getItem(this.key(slot));
        if (!raw) return null;
        const d = JSON.parse(raw);
        return DV.State.migrate(d.state);
      } catch (e) {
        console.error('Load failed', e);
        return null;
      }
    },
    remove(slot) {
      localStorage.removeItem(this.key(slot));
    },
    // most recent save of any slot (for CONTINUE)
    latest() {
      let best = null;
      for (const s of this.slots()) {
        if (s.summary && (!best || s.summary.saved > best.summary.saved)) best = s;
      }
      return best;
    },
  };
  DV.Save = Save;
})();
