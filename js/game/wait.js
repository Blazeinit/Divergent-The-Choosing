/* ==========================================================================
   DIVERGENT — waiting
   T: let the time go by. Anywhere you're free to (not in a chapter or a
   simulation, not mid-fight, mid-jump or on a zip line), pick how long, or
   pick a time ("until the call", "until lunch"), and the day goes by in a
   time-lapse: the light moves, people come and go. Every minute still
   happens on the way, so whatever was due happens, and anything you need to
   be at (a call to training, the PA calling your name, a meeting you agreed
   to) stops the wait there. Esc / E / T stops it early. Waiting won't take
   you past midnight: for the night, find your bed.

     DV.Wait.can()                → '' if you can wait here, else why not
     DV.Wait.plan()               → { now, max, targets: [{ t, label }], stops: [{ t, why }] }
     DV.Wait.warnings(mins)       → what you'd miss by waiting that long
     DV.Wait.start(mins, opts)    → begin the time-lapse (state 'waiting')
     DV.Wait.update(dt, input)    — per frame while waiting
     DV.Wait.stop(why)            — end it early
     DV.Wait.running              → the wait in progress, or null

   A district script can add to the plan:
     waitStops(now)   → [{ t, why }]   times a wait stops at (minutes, today)
     waitTargets(now) → [{ t, label }] quick "until…" choices
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const T = (s) => U.parseTime(s);
  const DAY_END = 1439; // 23:59: the night is for sleeping
  const MAX = 12 * 60;

  // the times of day anyone might wait for
  const TIMES = [['07:00', 'morning'], ['12:00', 'noon'], ['17:00', 'the evening'], ['21:00', 'night']];

  const W = {
    running: null,

    can() {
      const G = DV.Game, P = DV.Player;
      if (G.state !== 'playing' && G.state !== 'wait') return 'Not now.';
      if (G.ctrl() || G.inSimulation()) return 'You can\'t wait now.';
      if (DV.Activity && DV.Activity.active()) return 'Not now.';
      if (DV.Dialogue.isActive()) return 'Not now.';
      if (!DV.World.current) return 'Not now.';
      if (P.pinned || P.cineAction || !P.onGround) return 'Not now.';
      if (DV.Clock.minutes() >= DAY_END - 1) return 'It\'s late. Find your bed.';
      return '';
    },

    // the choices and the interruptions, from where (and when) you are
    plan() {
      const now = DV.Clock.minutes();
      const max = Math.max(0, Math.min(MAX, DAY_END - now));
      const stops = [], targets = [];
      const sc = DV.District.script();
      if (sc && sc.waitStops) for (const s of sc.waitStops(now) || []) stops.push(s);
      if (sc && sc.waitTargets) for (const t of sc.waitTargets(now) || []) targets.push(t);
      // the Testing Center: the PA calls your name
      if (DV.District.currentId() === 'testing_center' && DV.Story.callTime) {
        const c = DV.Story.callTime();
        if (isFinite(c) && !DV.State.flag('tr4_open')) {
          stops.push({ t: c, why: 'The PA crackles. It\'s your name.' });
          targets.push({ t: c, label: 'Until you\'re called', key: 'called' });
        }
      }
      // the plain times of day, when there's room for them
      for (const [s, name] of TIMES) {
        const t = T(s);
        if (t > now + 20 && t <= now + max && !targets.some((x) => Math.abs(x.t - t) < 45)) targets.push({ t, label: 'Until ' + name });
      }
      const ok = (x) => x.t > now + 0.5 && x.t <= now + max;
      return {
        now, max,
        stops: stops.filter(ok).sort((a, b) => a.t - b.t),
        targets: targets.filter(ok).sort((a, b) => a.t - b.t).slice(0, 4),
      };
    },

    // what you'd miss (a district script knows what's on)
    warnings(mins) {
      const sc = DV.District.script();
      if (!sc || !sc.waitWarnings) return [];
      const now = DV.Clock.minutes();
      return sc.waitWarnings(now, now + mins) || [];
    },

    /* ---------------- the time-lapse ---------------- */
    // mins: how long; opts: { until, quiet, then }
    start(mins, opts) {
      opts = opts || {};
      const G = DV.Game;
      const why = this.can();
      if (why && !opts.force) { DV.UI.notify(why); G.closeOverlay(); return false; }
      const p = this.plan();
      if (opts.until !== undefined) mins = opts.until - p.now;
      mins = Math.min(mins, opts.force ? MAX : p.max);
      if (!(mins > 0)) { G.closeOverlay(); return false; }
      // the first thing due on the way stops it there
      let stop = null;
      for (const s of p.stops) if (s.t - p.now <= mins + 0.01) { stop = s; break; }
      if (stop) mins = stop.t - p.now;
      // roughly a second for an hour, never more than four
      const dur = U.clamp(mins / 70, 0.8, 4);
      this.running = { left: mins, total: mins, rate: mins / dur, from: DV.Clock.minutes(), stop, sync: 0, then: opts.then, quiet: opts.quiet };
      G.state = 'waiting';
      DV.Menus.closeSide();
      DV.Input.clearMovement();
      DV.Input.requestLock();
      DV.Player.vx = 0; DV.Player.vz = 0;
      this.show(true);
      DV.UI.fade(0.42, 350);
      DV.Audio.play('whoosh', { volume: 0.25 });
      return true;
    },

    update(dt, input) {
      const r = this.running, G = DV.Game;
      if (!r) { G.state = 'playing'; return; }
      if (input.consume('Escape') || input.consume('KeyT') || input.consume('KeyE')) { this.stop('You stop waiting.'); return; }
      // you can still look about
      const [mx, my] = input.takeMouse();
      if (mx || my) G.rig.handleMouse(mx, my);
      input.takeWheel();
      // (by the wall clock when frames are slow, so a long wait doesn't drag at a low frame rate)
      const now = performance.now();
      const real = r.last ? Math.min(0.25, (now - r.last) / 1000) : dt;
      r.last = now;
      // every minute on the way happens, one at a time (calls, the missed, the PA)
      let step = r.rate * Math.max(dt, real);
      while (step > 1e-6 && r.left > 1e-6) {
        const d = Math.min(1, step, r.left);
        DV.Clock.advance(d);
        step -= d; r.left -= d; r.sync += d;
        // something took over (a scene, a voice, trouble): it's theirs now
        if (G.state !== 'waiting') { this.abort(); return; }
      }
      // the crowd catches up in jumps, like a time-lapse
      if (r.sync >= 20) { r.sync = 0; this.syncNPCs(); }
      // the rest of the world goes on (the district's own business can interrupt)
      G.updateWorldSystems(dt, G.zone(), false);
      DV.District.update(dt);
      if (G.state !== 'waiting') { this.abort(); return; }
      const P = DV.Player;
      P.model.animate(dt, { speed: 0, action: P.action, seatY: P.seat ? P.seat.seatY : 0.45 });
      this.draw();
      if (r.left <= 1e-6) this.finish();
    },

    syncNPCs() {
      DV.NPCAI.syncAll();
      // the player's seat may have been "taken" by a snapping NPC — keep the player's claim
      if (DV.Player.seat) DV.Player.seat.occupant = 'player';
    },

    stop(why) {
      if (!this.running) return;
      this.running.stopWhy = why;
      this.running.left = 0;
      this.finish();
    },

    // the wait is over: the crowd settles where it should be, and you get the time
    finish() {
      const r = this.running, G = DV.Game;
      if (!r) return;
      this.running = null;
      const waited = Math.round(DV.Clock.minutes() - r.from + (DV.Clock.minutes() < r.from ? 1440 : 0));
      G.state = 'transition';
      DV.UI.fade(1, 220).then(() => {
        this.show(false);
        this.syncNPCs();
        if (waited >= 30) { DV.Player.stamina = DV.Config.PLAYER.staminaMax; DV.Player.exhausted = false; }
        DV.Events.emit('clock:skipped', waited);
        if (G.state === 'transition') { G.state = 'playing'; DV.Input.requestLock(); }
        G.hintTimer = 0;
        const t = DV.Clock.str();
        if (r.stopWhy) DV.UI.notify(r.stopWhy + ' It\'s ' + t + '.');
        else if (r.stop) DV.UI.notify(r.stop.why + ' It\'s ' + t + '.', 'quest');
        else if (!r.quiet) DV.UI.notify('You wait ' + W.span(waited) + '. It\'s ' + t + '.');
        DV.UI.fade(0, 650);
        if (r.then) r.then(waited);
      });
    },

    // something else took over mid-wait (a cutscene, a conversation): get out of its way
    abort() {
      const r = this.running;
      this.running = null;
      this.show(false);
      if (DV.UI.fader && parseFloat(DV.UI.fader.style.opacity) < 0.9) DV.UI.fade(0, 300);
      if (r && r.then) r.then(Math.round(r.total - r.left));
    },

    span(m) {
      m = Math.round(m);
      if (m < 60) return m + (m === 1 ? ' minute' : ' minutes');
      const h = Math.floor(m / 60), mm = m % 60;
      return h + (h === 1 ? ' hour' : ' hours') + (mm ? ' ' + mm + ' min' : '');
    },

    /* ---------------- the time-lapse readout ---------------- */
    show(on) {
      let el = document.getElementById('waitlapse');
      if (!on) { if (el) el.remove(); return; }
      if (!el) {
        el = document.createElement('div');
        el.id = 'waitlapse';
        el.innerHTML = '<div class="wl-k">Waiting</div><div class="wl-t"></div><div class="wl-bar"><i></i></div><div class="wl-u"></div><div class="wl-h">Esc — stop</div>';
        DV.UI.root.appendChild(el);
      }
      const r = this.running;
      el.querySelector('.wl-u').textContent = r ? 'until ' + U.formatTime((r.from + r.total) % 1440) : '';
      this.draw();
    },
    draw() {
      const el = document.getElementById('waitlapse'), r = this.running;
      if (!el || !r) return;
      const t = DV.Clock.str();
      const te = el.querySelector('.wl-t');
      if (te.textContent !== t) te.textContent = t;
      el.querySelector('.wl-bar i').style.width = Math.round((1 - r.left / r.total) * 100) + '%';
    },
  };

  DV.Wait = W;
})();
