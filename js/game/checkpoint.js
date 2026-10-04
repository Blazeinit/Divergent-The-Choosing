/* ==========================================================================
   DIVERGENT — security checkpoint
   The barrier arm in the scanner arch between the lobby and the waiting hall.
   - The player is blocked until they show their name badge (security_cleared).
   - NPCs heading in stop at the arm, show a badge (candidates) or tap a
     keycard (staff), the arm lifts for them and drops behind. NPCs heading
     out trip the exit sensor and walk straight through.
   - Pushing at the closed arm gets a red light, a buzzer and a word from the
     guard. Ducking under it is an Agility check that only works while the
     guard is busy with someone else.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const GX = 40, GZ = 41; // arm line (the arch spans x 39.4..40.6)
  const STOP = [GX, GZ + 0.85]; // where an inbound NPC waits to be checked
  const BAND = 2.2; // half-width of the corridor between the railings

  const CP = {
    zone: null,
    parts: null,
    openT: 0,
    current: null, // NPC currently being checked
    currentT: 0,
    light: 'idle',
    lightT: 0,
    denyCd: 0,

    attach(zone, parts) {
      this.zone = zone;
      this.parts = parts;
      this.openT = 0;
      this.current = null;
      this.light = 'idle';
      this.lightT = 0;
      for (const n of DV.NPCs.all) this.resetNpc(n);
    },
    active() {
      return !!(this.zone && DV.World.current === this.zone);
    },
    cleared() {
      return !!DV.State.flag('security_cleared');
    },

    // the guard at the arch: Dean, or whoever covers his post
    guard() {
      const post = this.zone && this.zone.spot('guard_post');
      if (!post) return null;
      for (const id of ['dean_walsh', 'jess_thompson']) {
        const n = DV.NPCs.get(id);
        if (n && n.present && n.mode !== 'walking' && U.dist(n.x, n.z, post.x, post.z) < 2.2) return n;
      }
      return null;
    },
    // a guard who is checking someone else's badge isn't watching the arm
    distracted() {
      return !this.guard() || !!this.current;
    },

    flash(state, secs) {
      this.light = state;
      this.lightT = secs || 1;
    },
    open(secs) {
      if (this.openT <= 0) DV.Audio.play('scanner', { volume: 0.6, x: GX, z: GZ });
      this.openT = Math.max(this.openT, secs);
      this.flash('green', Math.max(0.9, secs));
    },
    deny(line) {
      if (this.denyCd > 0) return;
      this.denyCd = 3;
      this.flash('red', 1.2);
      DV.Audio.play('buzzer', { volume: 0.8, x: GX, z: GZ });
      const g = this.guard();
      if (g && line) g.say(line, 3.5);
    },
    denyLine() {
      return DV.State.flag('checked_in')
        ? 'Badge first. Show it to me, not the arm.'
        : 'Whoa — reception first. Desk\'s behind you, east side of the lobby.';
    },

    /* ------------------------------ NPCs ------------------------------ */
    resetNpc(n) {
      if (this.current === n) this.current = null;
      n.gatePath = null;
      n.gateStopIdx = -1;
      n.gateHold = false;
      n.gateShow = false;
      n.gateT = 0;
    },
    // called from NPCAI.followPath before an NPC moves. Returns true to hold still this tick.
    npcStep(npc, dt) {
      const p = npc.path;
      if (npc.gatePath !== p) {
        if (this.current === npc) this.current = null;
        npc.gatePath = p;
        npc.gateStopIdx = -1;
        npc.gateHold = false;
        npc.gateShow = false;
        npc.gateT = 0;
      }
      if (!p) return false;
      const tgt = p[npc.pathIdx];
      if (!tgt) return false;
      // being checked / waiting for the guard
      if (npc.gateHold) return this.holdTick(npc, dt);
      const north = tgt[1] < npc.z;
      const crosses = (npc.z > GZ) !== (tgt[1] > GZ);
      if (crosses) {
        const t = (GZ - npc.z) / (tgt[1] - npc.z || 1e-6);
        const xAt = npc.x + (tgt[0] - npc.x) * t;
        if (Math.abs(xAt - GX) < BAND) {
          if (north && npc.gateStopIdx === -1) {
            // queue for the arm: insert the check point as the next waypoint
            if (U.dist(npc.x, npc.z, STOP[0], STOP[1]) > 0.15) p.splice(npc.pathIdx, 0, [STOP[0], STOP[1]]);
            npc.gateStopIdx = npc.pathIdx;
          } else if (!north && U.dist(npc.x, npc.z, GX, GZ) < 1.8) {
            this.open(1.4); // exit sensor
          }
        }
      }
      // keep a polite gap behind whoever is at the arm
      if (npc.gateStopIdx === npc.pathIdx) {
        const d = U.dist(npc.x, npc.z, STOP[0], STOP[1]);
        for (const o of DV.NPCs.all) {
          if (o === npc || !o.present || !(o.gateHold || o === this.current)) continue;
          if (U.dist(o.x, o.z, STOP[0], STOP[1]) < d && U.dist(o.x, o.z, npc.x, npc.z) < 1.15) {
            npc.speed = 0;
            return true;
          }
        }
        if (d < 0.14) {
          npc.gateHold = true;
          npc.gateT = -1;
          npc.x = STOP[0]; npc.z = STOP[1];
          return this.holdTick(npc, dt);
        }
      }
      return false;
    },
    holdTick(npc, dt) {
      npc.speed = 0;
      npc.rot = U.dampAngle(npc.rot, Math.PI, 8, dt);
      if (npc.gateT < 0) {
        // wait for the previous person to clear the arm
        if (this.current && this.current !== npc) return true;
        this.current = npc;
        this.currentT = 0;
        npc.gateT = npc.def.role === 'staff' ? 0.8 : 1.7;
        npc.gateShow = true;
        const g = this.guard();
        if (g && npc.def.role !== 'staff' && Math.random() < 0.35) g.say(U.pick(['Badge.', 'Next.', 'Arms out.', 'Go ahead.']), 2);
        return true;
      }
      npc.gateT -= dt;
      if (npc.gateT > 0) return true;
      // checked: the arm lifts, carry on through
      npc.gateHold = false;
      npc.gateShow = false;
      npc.gateStopIdx = -2; // done for this path
      npc.pathIdx++;
      this.open(2.2);
      return false;
    },
    // NPCs who should be wearing a candidate badge (checked in at reception)
    wearsBadge(npc) {
      if (npc.def.role !== 'candidate') return false;
      if (npc.badgeOn) return true;
      // anyone north of the arch has been through reception and security
      return npc.z < GZ;
    },

    /* ------------------------------ per frame ------------------------------ */
    update(dt) {
      if (!this.active() || !this.parts) return;
      const p = DV.Player;
      const cleared = this.cleared();
      this.openT = Math.max(0, this.openT - dt);
      this.denyCd = Math.max(0, this.denyCd - dt);
      if (this.current) {
        this.currentT += dt;
        const c = this.current;
        if (!c.present || c.z < GZ - 0.7 || this.currentT > 6) this.current = null;
      }
      const playerNear = U.dist(p.x, p.z, GX, GZ) < 2.3;
      const open = this.openT > 0 || (cleared && playerNear);
      this.parts.block.enabled = !cleared;
      const target = open ? 1.35 : 0;
      this.parts.pivot.rotation.z += (target - this.parts.pivot.rotation.z) * Math.min(1, dt * 4);
      // pushing at the closed arm
      if (!cleared && Math.abs(p.x - GX) < 0.9 && p.z > GZ + 0.1 && p.z < GZ + 0.75 && p.speed > 0.2 && DV.Game.state === 'playing') {
        this.deny(this.denyLine());
      }
      // scanner lamp
      this.lightT = Math.max(0, this.lightT - dt);
      if (this.lightT <= 0) this.light = 'idle';
      const col = this.light === 'green' ? 0x38ff6a : this.light === 'red' ? (Math.floor(this.lightT * 8) % 2 ? 0xff2a20 : 0x601010) : 0x8a6418;
      for (const m of this.parts.lamps) m.material.color.setHex(col);
    },
  };

  /* ------------------------------ actions ------------------------------ */
  // using the badge from the inventory while standing at the arch
  DV.Actions = DV.Actions || {};
  DV.Actions.showBadge = function (game) {
    const near = DV.World.current && DV.World.current.id === 'testing_center' && U.dist(DV.Player.x, DV.Player.z, GX, GZ + 1) < 3.2;
    const g = CP.guard();
    if (near && g && !CP.cleared()) {
      if (DV.RPGMenu.isOpen()) DV.RPGMenu.close();
      game.state = 'playing';
      game.talkTo(g, true, { node: 'cp_badge' });
      return { ok: true };
    }
    const def = DV.Items.get('name_badge');
    return { ok: true, read: { title: def.name, text: def.badgeText.replace('{name}', DV.State.data.player.name.toUpperCase()) } };
  };
  DV.Actions.duckBarrier = function () {
    DV.Dialogue.startScene('cp_duck', { speaker: '' });
    return null;
  };

  DV.Checkpoint = CP;
})();
