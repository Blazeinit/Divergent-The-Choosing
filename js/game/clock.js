/* ==========================================================================
   DIVERGENT — in-game clock
   Minutes since midnight (float) stored in DV.State.data.world.time.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  DV.Clock = {
    paused: false,
    lastMinute: -1,
    minutes() {
      return DV.State.data.world.time;
    },
    day() {
      return DV.State.data.world.day;
    },
    // monotonic minutes (for timers that must survive midnight)
    total() {
      return DV.State.data.world.day * 1440 + DV.State.data.world.time;
    },
    str() {
      return U.formatTime(this.minutes());
    },
    update(dt) {
      if (this.paused) return;
      this.advance((dt * DV.Config.TIME_SCALE) / 60);
    },
    advance(mins) {
      const w = DV.State.data.world;
      w.time += mins;
      while (w.time >= 1440) {
        w.time -= 1440;
        w.day += 1;
        DV.Events.emit('clock:newDay', w.day);
      }
      const m = Math.floor(w.time);
      if (m !== this.lastMinute) {
        this.lastMinute = m;
        DV.Events.emit('clock:minute', m);
      }
    },
    // fast-forward (waiting); returns minutes skipped
    skipTo(targetMinutes) {
      const now = this.minutes();
      let delta = targetMinutes - now;
      if (delta < 0) delta += 1440;
      this.advance(delta);
      DV.Events.emit('clock:skipped', delta);
      return delta;
    },
    skip(mins) {
      this.advance(mins);
      DV.Events.emit('clock:skipped', mins);
    },
    after(t) {
      return this.minutes() >= U.parseTime(t);
    },
    period() {
      const m = this.minutes();
      if (m < 360) return 'night';
      if (m < 720) return 'morning';
      if (m < 1020) return 'afternoon';
      if (m < 1260) return 'evening';
      return 'night';
    },
  };
})();
