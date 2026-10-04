/* ==========================================================================
   DIVERGENT — districts (Build 3)
   A district is a place you live in rather than pass through: a persistent
   zone with its own clock-driven people (NPC schedules), its own rules
   (doors, triggers, events) and a bed to sleep in. The Testing Center was
   the first one; your faction's compound is the next.

     DV.District.define(id, {
       zone: 'zone_id', name, spawn: { x, z, rot },
       bed: { x, z, rot },  wake: '06:30',
       script: {
         start(fromLoad, opts)      — you've arrived / loaded in
         update(dt)                 — per frame while you're here
         onMinute(m)                — the clock ticked over
         onNewDay(day)              — you slept (or midnight passed)
         onTrigger(id, inside), onDialogueEnd(e), playerCanPass(lock, door) → bool | undefined
       },
     });
     DV.District.enter(id, opts)   — move there (from a chapter's end, a ride…)
     DV.District.sleep(opts)       — lie down; wake at the next morning's call

   Chapters (scripted set pieces) can still run from a district and hand
   back to it afterwards with DV.District.enter().
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const D = {
    defs: {},
    define(id, def) { def.id = id; this.defs[id] = def; return def; },
    get(id) { return this.defs[id]; },

    // where you live right now (saved with the game; Builds 1–2 never set it)
    currentId() { return (DV.State.data.player && DV.State.data.player.district) || 'testing_center'; },
    current() { return this.defs[this.currentId()] || null; },
    zoneId() { const d = this.current(); return d ? d.zone : 'testing_center'; },
    // standing in your district (not in a chapter or a simulation)
    here() { return !!DV.World.current && DV.World.current.id === this.zoneId() && !(DV.Game && DV.Game.ctrl()); },
    script() { const d = this.current(); return d && d.script ? d.script : null; },
    // the rules for whichever zone you're in, if it's your district
    scriptFor(zone) { return zone && zone.id === this.zoneId() ? this.script() : null; },

    /* ---------------- getting there ---------------- */
    // opts: { spawn: [x, z, rot] | spotId, day, time, fade, title, noSave }
    enter(id, opts) {
      opts = opts || {};
      const G = DV.Game;
      G.state = 'transition';
      DV.Input.clearMovement();
      const go = () => {
        try { this.arrive(id, opts); } catch (e) { DV.UI.showError((e && e.stack) || String(e)); }
      };
      if (opts.instant) go();
      else DV.UI.fade(1, opts.fadeOut || 900).then(go);
    },
    arrive(id, opts) {
      opts = opts || {};
      const G = DV.Game, st = DV.State.data, def = this.defs[id];
      if (!def) throw new Error('Unknown district ' + id);
      if (DV.Dialogue.isActive()) DV.Dialogue.end(true);
      if (DV.Activity && DV.Activity.active()) DV.Activity.abort();
      G.leaveChapter();
      if (DV.Sim && DV.Sim.active) DV.Sim.cleanup();
      st.player.district = id;
      st.player.zone = def.zone;
      st.story = st.story || {};
      st.story.chapter = null; // loading now brings you here, not back into a set piece
      if (opts.day) st.world.day = opts.day;
      if (opts.time) st.world.time = U.parseTime(opts.time);
      DV.Clock.lastMinute = Math.floor(st.world.time);
      const zone = DV.World.activate(def.zone);
      DV.NPCs.attach(def.zone);
      if (!DV.Player.model.root.parent) G.scene.add(DV.Player.model.root);
      zone.refreshPickups && zone.refreshPickups(DV.State.zoneState(def.zone));
      const P = DV.Player;
      if (P.seat) { P.seat.occupant = null; P.seat = null; }
      P.pinned = false; P.cineAction = null; P.cineSpeed = 0; P.moveScale = 1; P.surfaceOverride = null; P.crouched = false;
      this.placePlayer(zone, opts.spawn || def.spawn);
      G.rig.yaw = P.rot; G.rig.pitch = 0.18; G.rig.follow(true);
      G.triggerState = {}; G.lastRoom = null; G.staffWarned = {};
      for (const z of [zone]) for (const sid in z.spots) z.spots[sid].occupant = null;
      DV.NPCAI.syncAll();
      DV.UI.simMode(false);
      DV.UI.showHUD(true);
      DV.UI.letterbox(false);
      G.state = 'playing';
      G.updateAmbience(true);
      if (def.script && def.script.start) def.script.start(false, opts);
      DV.Input.requestLock();
      DV.UI.fade(0, opts.fadeIn || 1200);
      if (opts.title) setTimeout(() => DV.UI.narrate(opts.title, 3.6), 600);
      if (!opts.noSave) setTimeout(() => { if (G.state === 'playing') DV.Save.write('auto'); }, 1500);
      DV.Events.emit('district:enter', { id });
    },
    placePlayer(zone, at) {
      const P = DV.Player;
      if (typeof at === 'string') { const s = zone.spot(at); if (s) { P.place(s.ax !== undefined ? s.ax : s.x, s.az !== undefined ? s.az : s.z, s.rot); return; } }
      if (Array.isArray(at)) { P.place(at[0], at[1], at[2] || 0); return; }
      if (at && at.x !== undefined) { P.place(at.x, at.z, at.rot || 0); return; }
      const s = zone.def.spawn || { x: 0, z: 0, rot: 0 };
      P.place(s.x, s.z, s.rot);
    },

    /* ---------------- sleeping ---------------- */
    // lie down in your bunk: the night passes, and you wake at the morning call
    sleep(opts) {
      opts = opts || {};
      const G = DV.Game, def = this.current();
      if (!def) return;
      G.state = 'transition';
      DV.Input.clearMovement();
      DV.Audio.play('whoosh', { volume: 0.4 });
      DV.UI.fade(1, 1400).then(() => {
        const w = DV.State.data.world;
        const wake = U.parseTime(opts.wake || def.wake || '06:30');
        // past midnight already: wake the same day; otherwise the next one
        if (w.time >= U.parseTime('04:00')) w.day += 1;
        w.time = wake;
        DV.Clock.lastMinute = Math.floor(w.time);
        DV.Player.stamina = DV.Config.PLAYER.staminaMax;
        DV.Player.exhausted = false;
        const zone = DV.World.current;
        if (DV.Player.seat) { DV.Player.seat.occupant = null; DV.Player.seat = null; }
        this.placePlayer(zone, opts.at || def.bed || def.spawn);
        DV.Player.state = 'free';
        for (const sid in zone.spots) zone.spots[sid].occupant = null;
        DV.NPCAI.syncAll();
        G.rig.yaw = DV.Player.rot; G.rig.follow(true);
        DV.Events.emit('clock:newDay', w.day);
        const sc = this.script();
        if (sc && sc.onNewDay) sc.onNewDay(w.day, { slept: true });
        G.state = 'playing';
        DV.Input.requestLock();
        DV.UI.fade(0, 1600);
        setTimeout(() => DV.UI.narrate((opts.title || 'DAY ' + w.day) + '\n' + DV.Clock.str(), 3.2), 700);
        setTimeout(() => { if (G.state === 'playing') DV.Save.write('auto'); }, 1800);
        if (opts.then) opts.then();
      });
    },

    /* ---------------- hooks the game calls ---------------- */
    onMinute(m) {
      if (!this.here()) return;
      const sc = this.script();
      if (sc && sc.onMinute) sc.onMinute(m);
    },
    update(dt) {
      if (!this.here()) return;
      const sc = this.script();
      if (sc && sc.update) sc.update(dt);
    },
  };

  // the first district: the Testing Center (its rules live in story.js)
  D.define('testing_center', { zone: 'testing_center', name: 'Testing Center', script: null });

  DV.District = D;
})();
