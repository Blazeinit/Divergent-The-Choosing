/* ==========================================================================
   DIVERGENT — player controller
   Camera-relative WASD movement, running with stamina, collision against
   the zone and NPC bodies, procedural animation, footsteps, sitting.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const P = DV.Config.PLAYER;

  function surfaceFor(room) {
    if (!room) return 'concrete';
    if (room.surface) return room.surface;
    const f = room.floor || '';
    if (/carpet|fabric/.test(f)) return 'carpet';
    if (/grass|dirt/.test(f)) return 'grass';
    if (/metal/.test(f)) return 'metal';
    if (/wood/.test(f)) return 'wood';
    if (/tile|terrazzo|marble/.test(f)) return 'tile';
    return 'concrete';
  }

  const Player = {
    model: null,
    x: 0, z: 0, y: 0,
    rot: 0,
    vx: 0, vz: 0,
    speed: 0,
    stamina: P.staminaMax,
    exhausted: false,
    state: 'free', // free | sitting | locked
    seat: null,
    action: 'idle',
    lastSafe: [0, 0],
    stepPhase: 0,
    runTime: 0,
    moveScale: 1, // simulations can slow movement (water)
    get scale() {
      return this.model ? this.model.scale : 1;
    },

    create(appearance) {
      if (this.model) this.model.dispose();
      this.model = DV.Character.create(appearance);
      this.model.root.name = 'player';
      return this.model;
    },
    setAppearance(appearance) {
      const parent = this.model && this.model.root.parent;
      if (this.model) this.model.dispose();
      this.model = DV.Character.create(appearance);
      if (parent) parent.add(this.model.root);
      this.syncModel();
    },
    place(x, z, rot) {
      this.x = x; this.z = z;
      this.rot = rot || 0;
      this.vx = this.vz = 0;
      this.state = 'free';
      this.seat = null;
      this.action = 'idle';
      this.lastSafe = [x, z];
      this.syncModel();
    },
    syncModel() {
      if (!this.model) return;
      this.model.root.position.set(this.x, this.y, this.z);
      this.model.root.rotation.y = this.rot;
    },

    sit(spot) {
      this.state = 'sitting';
      this.seat = spot;
      this.x = spot.x; this.z = spot.z;
      this.rot = spot.rot;
      this.vx = this.vz = 0;
      this.action = spot.act === 'recline' ? 'recline' : 'sit';
      this.syncModel();
    },
    standUp() {
      if (this.state !== 'sitting') return;
      const s = this.seat;
      if (s && s.occupant === 'player') s.occupant = null;
      this.state = 'free';
      this.seat = null;
      this.action = 'idle';
      if (s) {
        this.x = s.ax !== undefined ? s.ax : s.x + Math.sin(s.rot) * 0.6;
        this.z = s.az !== undefined ? s.az : s.z + Math.cos(s.rot) * 0.6;
      }
      this.syncModel();
    },

    /**
     * ctx: { input, rig, zone, npcs (array of {x,z,r}), enabled }
     */
    update(dt, ctx) {
      const input = ctx.input, rig = ctx.rig, zone = ctx.zone;
      let mx = 0, mz = 0;
      if (ctx.enabled) {
        const f = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
        const r = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
        if (f || r) {
          const fy = rig.yaw;
          const fx = Math.sin(fy), fz = Math.cos(fy);
          mx = fx * f - fz * r;
          mz = fz * f + fx * r;
          const l = Math.hypot(mx, mz);
          mx /= l; mz /= l;
        }
      }
      if (this.state === 'sitting') {
        if (mx || mz) this.standUp();
        else {
          this.model.animate(dt, { speed: 0, action: this.action, seatY: this.seat ? this.seat.seatY : 0.45, lookYaw: ctx.lookYaw || 0 });
          this.regen(dt);
          return;
        }
      }
      if (this.state === 'locked') { mx = mz = 0; }

      const wantRun = ctx.enabled && (input.down('ShiftLeft') || input.down('ShiftRight')) && (mx || mz);
      const athletics = DV.Stats ? DV.Stats.skill('athletics') : 20;
      let canRun = !this.exhausted && this.stamina > 0;
      const running = wantRun && canRun;
      const speedBonus = 1 + U.clamp((athletics - 20) / 200, 0, 0.18);
      const target = (running ? P.runSpeed * speedBonus : P.walkSpeed) * this.moveScale;
      const tvx = mx * target, tvz = mz * target;
      const a = 1 - Math.exp(-P.accel * dt);
      this.vx += (tvx - this.vx) * a;
      this.vz += (tvz - this.vz) * a;
      if (!mx && !mz && Math.hypot(this.vx, this.vz) < 0.05) { this.vx = 0; this.vz = 0; }

      // stamina
      if (running) {
        const drain = P.staminaDrain * (1 - U.clamp((athletics - 20) / 160, 0, 0.4));
        this.stamina = Math.max(0, this.stamina - drain * dt);
        this.runTime += dt;
        if (this.stamina <= 0) this.exhausted = true;
        if (this.runTime > 3 && DV.Stats) { DV.Stats.practice('athletics', 0.6); this.runTime = 0; }
      } else this.regen(dt);

      // integrate + collide
      let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
      if (zone) {
        [nx, nz] = zone.colliders.resolveCircle(nx, nz, P.radius, 'player');
        if (ctx.npcs) {
          for (const n of ctx.npcs) {
            const dx = nx - n.x, dz = nz - n.z;
            const rr = P.radius + (n.r || 0.28);
            const d2 = dx * dx + dz * dz;
            if (d2 < rr * rr && d2 > 1e-6) {
              const d = Math.sqrt(d2);
              nx = n.x + (dx / d) * rr;
              nz = n.z + (dz / d) * rr;
            }
          }
          [nx, nz] = zone.colliders.resolveCircle(nx, nz, P.radius, 'player');
        }
        // never leave the authored map
        if (zone.roomIndexAt(nx, nz) < 0) {
          nx = this.lastSafe[0];
          nz = this.lastSafe[1];
          this.vx = this.vz = 0;
        } else {
          this.lastSafe[0] = nx;
          this.lastSafe[1] = nz;
        }
      }
      const moved = Math.hypot(nx - this.x, nz - this.z);
      this.x = nx; this.z = nz;
      this.speed = dt > 0 ? moved / dt : 0;
      if (mx || mz) {
        const want = Math.atan2(mx, mz);
        this.rot = U.dampAngle(this.rot, want, P.turnRate, dt);
      }
      this.syncModel();
      this.model.animate(dt, { speed: this.speed, action: 'idle', lookYaw: ctx.lookYaw || 0 });

      // footsteps
      if (this.speed > 0.3) {
        const ph = this.model.phase;
        const step = Math.floor(ph / Math.PI);
        if (step !== this.stepPhase) {
          this.stepPhase = step;
          const room = zone ? zone.roomAt(this.x, this.z) : null;
          DV.Audio.play('step', { surface: this.surfaceOverride || surfaceFor(room), volume: running ? 1 : 0.7 });
        }
      }
    },
    regen(dt) {
      this.stamina = Math.min(P.staminaMax, this.stamina + P.staminaRegen * dt);
      if (this.exhausted && this.stamina > 25) this.exhausted = false;
    },
  };
  Player.surfaceFor = surfaceFor;
  DV.Player = Player;
})();
