/* ==========================================================================
   DIVERGENT — player controller
   Camera-relative WASD movement, running with stamina, crouching (C) and
   jumping (Space, costs stamina), collision against the zone and NPC
   bodies, procedural animation, footsteps, sitting.
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
    crouched: false,
    crouchK: 0, // 0 standing .. 1 fully crouched (smoothed, drives the camera)
    onGround: true,
    vy: 0,
    justJumped: false,
    get scale() {
      return this.model ? this.model.scale : 1;
    },
    // camera pivot height multiplier (lower when crouched)
    get pivotScale() {
      return 1 - 0.34 * this.crouchK;
    },
    // jump: costs stamina (less with Athletics); can't jump while exhausted
    tryJump() {
      if (!this.onGround || this.state !== 'free') return false;
      const athletics = DV.Stats ? DV.Stats.skill('athletics') : 20;
      const cost = P.jumpCost * (1 - U.clamp((athletics - 20) / 200, 0, 0.3));
      if (this.exhausted || this.stamina < cost) {
        if (!this.tiredT || performance.now() - this.tiredT > 2500) { this.tiredT = performance.now(); DV.UI.notify('Too winded to jump.'); }
        return false;
      }
      this.stamina -= cost;
      if (this.stamina <= 0.5) this.exhausted = true;
      this.crouched = false;
      this.vy = P.jumpSpeed * (1 + U.clamp((athletics - 20) / 400, 0, 0.12)) * (this.moveScale < 0.8 ? 0.7 : 1);
      this.onGround = false;
      this.justJumped = true;
      DV.Audio.play('hop', { volume: 0.8 });
      if (DV.Stats) DV.Stats.practice('athletics', 0.35);
      return true;
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
      this.y = 0; this.vy = 0; this.onGround = true;
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
      this.crouched = false;
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
      // a chapter can pin you in place (seated through the ceremony until you're called)
      if (this.pinned) { mx = mz = 0; }
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
      // crouch (toggle with C; sprinting stands you up) and jump (Space)
      this.justJumped = false;
      if (ctx.enabled && input.consume('KeyC') && this.onGround) this.crouched = !this.crouched;
      if (wantRun && this.crouched && !this.exhausted && this.stamina > 0) this.crouched = false;
      if (ctx.enabled && !this.pinned && input.consume('Space')) this.tryJump(); // (pinned: Space hurries a ceremony along instead)
      this.crouchK += ((this.crouched ? 1 : 0) - this.crouchK) * Math.min(1, dt * 9);
      const athletics = DV.Stats ? DV.Stats.skill('athletics') : 20;
      let canRun = !this.exhausted && this.stamina > 0;
      const running = wantRun && canRun && !this.crouched;
      const speedBonus = 1 + U.clamp((athletics - 20) / 200, 0, 0.18);
      const dev = DV.Dev && DV.Dev.on() ? DV.Dev.flags : null;
      const target = (this.crouched ? P.crouchSpeed : running ? P.runSpeed * speedBonus : P.walkSpeed) * this.moveScale * (dev ? dev.speed : 1);
      const tvx = mx * target, tvz = mz * target;
      // little steering in the air
      const a = 1 - Math.exp(-P.accel * (this.onGround ? 1 : 0.22) * dt);
      this.vx += (tvx - this.vx) * a;
      this.vz += (tvz - this.vz) * a;
      if (!mx && !mz && Math.hypot(this.vx, this.vz) < 0.05) { this.vx = 0; this.vz = 0; }

      // stamina
      if (!this.onGround) { /* no regen mid-air */ } else if (running) {
        const drain = P.staminaDrain * (1 - U.clamp((athletics - 20) / 160, 0, 0.4));
        this.stamina = Math.max(0, this.stamina - drain * dt);
        this.runTime += dt;
        if (this.stamina <= 0) this.exhausted = true;
        if (this.runTime > 3 && DV.Stats) { DV.Stats.practice('athletics', 0.6); this.runTime = 0; }
      } else this.regen(dt);
      if (dev && dev.stamina) { this.stamina = P.staminaMax; this.exhausted = false; }

      // vertical: jumping and landing (ground is the room floor; 0 almost everywhere)
      const groundRoom = zone ? zone.roomAt(this.x, this.z) : null;
      const ground = (groundRoom && groundRoom.floorY) || 0;
      if (!this.onGround) {
        this.vy -= P.gravity * dt;
        this.y += this.vy * dt;
        if (this.y <= ground) {
          const hard = this.vy < -4.5;
          this.y = ground; this.vy = 0; this.onGround = true;
          DV.Audio.play('land', { volume: hard ? 1 : 0.7 });
          if (hard && ctx.rig) ctx.rig.shake = Math.max(ctx.rig.shake, 0.15);
        }
      } else this.y = ground;
      const feet = this.y - ground; // airborne: clear knee-high obstacles

      // integrate + collide
      let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
      if (zone && !(dev && dev.noclip)) {
        [nx, nz] = zone.colliders.resolveCircle(nx, nz, P.radius, 'player', feet);
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
          [nx, nz] = zone.colliders.resolveCircle(nx, nz, P.radius, 'player', feet);
        }
        // never leave the map (the authored rooms, or the city's streets where there's one to walk)
        if (!zone.walkable(nx, nz)) {
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
      this.model.animate(dt, { speed: this.onGround ? this.speed : 0, action: !this.onGround ? 'jump' : this.crouchK > 0.5 ? 'sneak' : 'idle', lookYaw: ctx.lookYaw || 0 });

      // footsteps (quieter when sneaking)
      if (this.speed > 0.3 && this.onGround) {
        const ph = this.model.phase;
        const step = Math.floor(ph / Math.PI);
        if (step !== this.stepPhase) {
          this.stepPhase = step;
          const room = zone ? zone.roomAt(this.x, this.z) : null;
          DV.Audio.play('step', { surface: this.surfaceOverride || surfaceFor(room), volume: running ? 1 : this.crouched ? 0.3 : 0.7 });
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
