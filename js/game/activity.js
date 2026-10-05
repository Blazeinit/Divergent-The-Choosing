/* ==========================================================================
   DIVERGENT — activities (Build 3)
   An activity is a stretch of hands-on play that takes over the controls,
   the camera and the HUD for a while and then hands back a result: a fight
   in the ring, the shooting range, throwing knives, the punching bags.

     DV.Activity.start(act, onDone)
       act: { id, title, begin(A), update(dt, input, A), end(A), pause?(), resume?() }
       the activity calls A.finish(result) when it's over; onDone(result) runs after
       the camera and controls are handed back.

   While one runs the game is in state 'activity': the world (doors, NPCs,
   the chapter or district script) keeps going, the normal HUD steps aside
   (subtitles and notices stay), Esc pauses as usual.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const A = {
    current: null,
    onDone: null,
    hitStop: 0, // a few frames of freeze on a heavy impact

    active() { return !!this.current; },
    is(id) { return !!this.current && this.current.id === id; },

    start(act, onDone) {
      if (this.current) this.abort();
      const G = DV.Game;
      this.current = act;
      this.onDone = onDone || null;
      this.hitStop = 0;
      this.t = 0;
      if (DV.Dialogue.isActive()) { DV.Dialogue.end(true); if (DV.DialogueUI && DV.DialogueUI.hide) DV.DialogueUI.hide(); }
      if (DV.Player.state === 'sitting') DV.Player.standUp();
      G.state = 'activity';
      DV.Input.clearMovement();
      DV.Input.takeMouse();
      DV.Input.requestLock();
      DV.UI.root.classList.add('in-activity');
      this.hud = U.el('div', 'act-hud', null, DV.UI.root);
      this.hud.id = 'act-hud';
      try {
        act.begin(this);
      } catch (e) {
        DV.UI.showError((e && e.stack) || String(e));
        this.cleanup();
        G.state = 'playing';
        return;
      }
      DV.Events.emit('activity:start', { id: act.id });
    },

    update(dt, input) {
      const act = this.current;
      if (!act) return;
      if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.08; }
      this.t += dt;
      // an activity that finishes itself mid-update (a timer firing at the top of its update)
      // still runs the rest of that update, which puts its own camera back: so the hand-back
      // waits until the update is over
      this.inUpdate = true;
      try { act.update(dt, input, this); } finally { this.inUpdate = false; }
      if (this.pending && this.current === act) { const r = this.pending; this.pending = null; this.finish(r.result); }
    },

    // the activity is over: hand the controls back, then tell whoever started it
    finish(result) {
      const act = this.current;
      if (!act) return;
      if (this.inUpdate) { if (!this.pending) this.pending = { result }; return; }
      const cb = this.onDone;
      this.cleanup();
      const G = DV.Game;
      if (G.state === 'activity') G.state = 'playing';
      G.rig.snapBehind(DV.Player.rot);
      G.rig.follow();
      DV.Input.clearMovement();
      DV.Input.takeMouse();
      DV.Events.emit('activity:end', { id: act.id, result });
      if (cb) cb(result || {});
    },
    // quitting / loading mid-activity: no result
    abort() {
      if (!this.current) return;
      this.cleanup();
    },
    cleanup() {
      const act = this.current;
      this.current = null;
      this.onDone = null;
      this.pending = null;
      try { if (act && act.end) act.end(this); } catch (e) { console.error(e); }
      if (this.hud) { this.hud.remove(); this.hud = null; }
      DV.UI.root.classList.remove('in-activity');
    },

    /* ---------- helpers for activities ---------- */
    // a big centred word: FIGHT, KNOCKDOWN, 27 POINTS
    announce(text, secs, kind) {
      if (!this.hud) return;
      let a = this.hud.querySelector('.act-announce');
      if (!a) a = U.el('div', 'act-announce', null, this.hud);
      a.textContent = text;
      a.className = 'act-announce on' + (kind ? ' ' + kind : '');
      clearTimeout(this._annT);
      this._annT = setTimeout(() => { if (a) a.classList.remove('on'); }, (secs || 1.4) * 1000);
    },
    keys(html) {
      if (!this.hud) return;
      let k = this.hud.querySelector('.act-keys');
      if (!k) k = U.el('div', 'act-keys', null, this.hud);
      if (k._h !== html) { k._h = html; k.innerHTML = html; }
    },
    freeze(secs) { this.hitStop = Math.max(this.hitStop, secs); },
  };

  DV.Activity = A;
})();
