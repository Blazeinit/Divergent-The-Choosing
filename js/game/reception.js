/* ==========================================================================
   DIVERGENT — reception line
   Arriving candidates (and the odd staff member signing in) join a single
   line at the lobby reception desk. Everyone holds a slot and steps forward
   as the line moves. At the front, the clerk (Martha, or Denise if Martha is
   away) asks for a name, types it in, presses a badge and hands it over —
   it appears on the candidate's chest — and the candidate heads straight
   on to wherever their day takes them next.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const SPACING = 1.05;
  const MAX_SLOTS = 10;
  const ASK = ['Next, please. Name?', 'Good morning, dear. Name?', 'Name, please.', 'Next. Your name, dear?'];
  const THANKS = ['Thanks.', 'Thank you.', 'Thanks...', '*clips it on*'];

  const R = {
    zone: null,
    line: [],
    serving: null,
    clerkNpc: null,
    phase: null,
    t: 0,
    log: [], // served people (QA / debugging)
    onServed: null,

    attach(zone) {
      this.zone = zone;
      this.line = [];
      this.serving = null;
      this.phase = null;
      this.log = [];
      this.base = null; // spots aren't resolved yet while the zone is still building
      for (const n of DV.NPCs.all) { n.inLine = false; n.served = false; n.poseOverride = null; }
    },
    active() {
      if (!this.zone || DV.World.current !== this.zone) return false;
      if (!this.base) {
        const s = this.zone.spot('reception_q1');
        if (!s) return false;
        this.base = [s.ax, s.az];
        this.rot = s.rot;
        this.back = [-Math.sin(s.rot), -Math.cos(s.rot)];
      }
      return true;
    },
    isQueueSpot(id) {
      return /^reception_q\d/.test(id || '');
    },
    slot(k) {
      k = Math.min(k, MAX_SLOTS - 1);
      const x = this.base[0] + this.back[0] * SPACING * k, z = this.base[1] + this.back[1] * SPACING * k;
      return { id: 'reception_line_' + k, x, z, ax: x, az: z, rot: this.rot };
    },

    // NPCAI hands over anyone whose schedule says "go to the reception line"
    join(npc, entry, snap) {
      if (!this.active()) return false;
      npc.served = false;
      npc.inLine = true;
      npc.lineSlot = -1;
      npc.lineSince = entry ? U.parseTime(entry.t) : DV.Clock.minutes();
      if (this.line.indexOf(npc) < 0) {
        // keep arrival order (matters when the whole line is snapped into place on load)
        let i = this.line.length;
        while (i > 0 && this.line[i - 1].lineSince > npc.lineSince) i--;
        this.line.splice(i, 0, npc);
      }
      if (snap) {
        // place everyone already in line straight onto their slots
        this.line.forEach((n, k) => {
          const s = this.slot(k);
          n.x = s.ax; n.z = s.az; n.rot = s.rot;
          n.lineSlot = k;
          n.mode = 'queued';
          n.path = null;
          n.action = 'idle';
          n.rotTarget = this.rot;
        });
      }
      return true;
    },
    leave(npc) {
      const i = this.line.indexOf(npc);
      if (i >= 0) this.line.splice(i, 1);
      npc.inLine = false;
      npc.poseOverride = null;
      if (this.serving === npc) this.endService();
    },
    // whoever is behind the desk right now
    clerk() {
      for (const [id, spot] of [['martha_bell', 'reception_1'], ['denise_carter', 'reception_2']]) {
        const n = DV.NPCs.get(id);
        const s = this.zone.spot(spot);
        if (n && n.present && n.mode !== 'walking' && U.dist(n.x, n.z, s.x, s.z) < 0.8) return n;
      }
      return null;
    },
    roomOf(npc) {
      const d = npc.def;
      const lists = d.schedules ? d.schedules.map((v) => v.list) : [d.schedule || []];
      for (const list of lists) for (const e of list) { const m = /^tr(\d)_chair/.exec(e.to || ''); if (m) return m[1]; }
      return null;
    },
    firstName(npc) {
      return npc.def.name.replace(/^Dr\. /, '').replace(/ "[^"]*"/, '');
    },

    // the player pushing in at the desk while people are waiting
    cutInLine() {
      if (!this.line.length || this.cutAt && performance.now() - this.cutAt < 60000) return;
      this.cutAt = performance.now();
      const n = this.line[Math.min(1, this.line.length - 1)];
      if (n && n.present) n.say(U.pick(['Hey — there\'s a line.', 'Um. We were here first.', 'The line starts back there, you know.']), 3);
    },

    endService() {
      if (this.clerkNpc) this.clerkNpc.poseOverride = null;
      if (this.serving) this.serving.poseOverride = null;
      this.serving = null;
      this.clerkNpc = null;
      this.phase = null;
    },

    update(dt) {
      if (!this.active()) return;
      // drop anyone who's gone (left, despawned, schedule moved them on)
      for (let i = this.line.length - 1; i >= 0; i--) {
        const n = this.line[i];
        if (!n.present || !n.inLine) { this.line.splice(i, 1); if (this.serving === n) this.endService(); }
      }
      // everyone walks to their slot; when the line moves, they step up
      this.line.forEach((n, k) => {
        if (n.mode === 'talking' || n === this.serving) return;
        if (n.lineSlot !== k) {
          n.lineSlot = k;
          DV.NPCAI.walkTo(n, this.slot(k), 'queue');
        }
      });
      this.serve(dt);
    },

    serve(dt) {
      const front = this.line[0];
      if (!this.serving) {
        if (!front || front.mode !== 'queued' || front.lineSlot !== 0) return;
        const c = this.clerk();
        if (!c || c.mode === 'talking') return;
        this.serving = front;
        this.clerkNpc = c;
        this.phase = 'ask';
        this.t = 0;
        c.say(U.pick(ASK), 2.2);
        return;
      }
      const n = this.serving, c = this.clerkNpc;
      if (!c || !c.present || c.mode === 'walking') { this.endService(); return; }
      if (c.mode === 'talking' || n.mode === 'talking') return; // the player is chatting with one of them
      this.t += dt;
      n.rot = U.dampAngle(n.rot, this.rot, 6, dt);
      const staff = n.def.role === 'staff';
      const at = { x: c.x, z: c.z, range: 14 };
      switch (this.phase) {
        case 'ask':
          if (this.t > 1.6) {
            n.say(staff ? 'Morning, ' + this.firstName(c).split(' ')[0] + '.' : this.firstName(n) + '.', 2);
            this.phase = 'type';
            this.t = 0;
          }
          break;
        case 'type':
          c.poseOverride = 'type';
          if (this.t > 0.2 && !this.typed) { this.typed = true; DV.Audio.play('keys', Object.assign({ volume: 0.7 }, at)); }
          if (this.t > 2.6) {
            this.typed = false;
            c.poseOverride = 'badge';
            if (!staff) {
              n.poseOverride = 'badge';
              const room = this.roomOf(n);
              c.say(room ? 'Here you are — Room ' + room + '. Clip it on, dear.' : 'Here you are. Clip it on, dear.', 2.8);
              DV.Audio.play('badge', Object.assign({ volume: 0.9 }, at));
            } else {
              c.say('Morning, ' + this.firstName(n).split(' ')[0] + '. Your schedule\'s in the tray.', 2.8);
            }
            this.phase = 'give';
            this.t = 0;
          }
          break;
        case 'give':
          if (this.t > 1.5) {
            if (!staff) n.badgeOn = true;
            n.served = true;
            if (Math.random() < 0.6) n.say(U.pick(THANKS), 1.6);
            this.log.push({ id: n.id, t: DV.Clock.str(), badge: !!n.badgeOn, clerk: c.id });
            if (this.onServed) this.onServed(n, c);
            this.leave(n);
            this.endService();
            // straight on to the next part of their day
            n.taskKey = null;
            DV.NPCAI.refresh(n, false);
          }
          break;
      }
    },
  };

  DV.Reception = R;
})();
