/* ==========================================================================
   DIVERGENT — player controller
   Camera-relative WASD movement, running with stamina, crouching (C) and
   jumping (Space, costs stamina), collision against the zone and NPC
   bodies, procedural animation, footsteps, sitting.

   How it feels: you get going at once at a walk and build up into a run;
   at a run your momentum carries you wide round a turn, and letting go (or
   turning back on yourself) you slide to a stop. Low ledges (a kerb, a
   step, a pallet) you just walk up; off a higher edge you fall, and you can
   still jump a moment after stepping off it (and Space pressed a moment
   before you land still jumps). You can land on things (a bench, a crate)
   and stand there. A landing dips the camera (a hard one puts you in a
   crouch and bumps the loose things round you). A car that can't stop
   knocks you down: thrown, flat on your back, and up again.
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
    coyote: 0, // (time left to jump after stepping off an edge)
    jumpBuf: 0, // (Space pressed this recently, waiting for the ground)
    stepVis: 0, // (a step up or down, eased out in how you're drawn)
    landT: 0, // (soaking up a hard landing)
    lean: 0, // (into a sprint, back in a slide)
    downK: 0, // (0 on your feet .. 1 flat on the ground: the camera comes down with you)
    get scale() {
      return this.model ? this.model.scale : 1;
    },
    // camera pivot height multiplier (lower when crouched)
    get pivotScale() {
      return 1 - 0.34 * this.crouchK - 0.5 * this.downK;
    },
    // jump: costs stamina (less with Athletics); can't jump while exhausted
    tryJump() {
      if (!(this.onGround || this.coyote > 0) || this.state !== 'free') return false;
      const athletics = DV.Stats ? DV.Stats.skill('athletics') : 20;
      const cost = P.jumpCost * (1 - U.clamp((athletics - 20) / 200, 0, 0.3)) * Math.max(0.2, 1 + (DV.Perks ? DV.Perks.mod('jump.cost') : 0));
      if (this.exhausted || this.stamina < cost) {
        if (!this.tiredT || performance.now() - this.tiredT > 2500) { this.tiredT = performance.now(); DV.UI.notify('Too winded to jump.'); }
        return false;
      }
      this.stamina -= cost;
      if (this.stamina <= 0.5) this.exhausted = true;
      this.crouched = false;
      this.vy = P.jumpSpeed * (1 + U.clamp((athletics - 20) / 400, 0, 0.12)) * (this.moveScale < 0.8 ? 0.7 : 1);
      this.onGround = false;
      this.coyote = 0; this.jumpBuf = 0;
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
      const zone = DV.World && DV.World.current;
      this.y = this.groundY = zone && zone.groundAt ? zone.groundAt(x, z) : 0; this.vy = 0; this.onGround = true;
      this.coyote = this.jumpBuf = this.stepVis = this.landT = this.lean = this.downK = 0;
      this.state = 'free';
      this.seat = null;
      this.action = 'idle';
      this.lastSafe = [x, z];
      this.syncModel();
    },
    syncModel() {
      if (!this.model) return;
      this.model.root.position.set(this.x, this.y + this.stepVis, this.z);
      this.model.root.rotation.y = this.rot;
    },

    sit(spot) {
      this.state = 'sitting';
      this.crouched = false;
      this.seat = spot;
      this.x = spot.x; this.z = spot.z;
      this.rot = spot.rot;
      this.vx = this.vz = 0;
      this.action = spot.act === 'recline' || spot.act === 'lie' || spot.act === 'hang' ? spot.act : 'sit'; // (a bed is lain on, along it, not sat on; a rail on a train is held, standing)
      this.syncModel();
    },
    standUp() {
      if (this.state !== 'sitting') return;
      const s = this.seat;
      if (s && s.occupant === 'player') s.occupant = null;
      this.state = 'free';
      this.seat = null;
      this.action = 'idle';
      if (s && s.ax === undefined && s.act === 'lie') {
        // off the side of the bed (straight ahead is the rest of the mattress)
        if (s.approach) { this.x = s.approach[0]; this.z = s.approach[1]; }
        else { this.x = s.x + Math.cos(s.rot) * 0.85; this.z = s.z - Math.sin(s.rot) * 0.85; }
      } else if (s) {
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
      // knocked off your feet: nothing to do but come down, lie there a moment and get up
      if (this.state === 'down') { this.updateDown(dt, ctx); return; }
      this.downK = Math.max(0, this.downK - dt * 2.5);
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
      // the dev menu's noclip: fly, through anything (Space up, C or Ctrl down)
      const dev = DV.Dev && DV.Dev.on() ? DV.Dev.flags : null, fly = !!(dev && dev.noclip);
      // crouch (toggle with C; sprinting stands you up) and jump (Space)
      this.justJumped = false;
      if (ctx.enabled && !fly && input.consume('KeyC') && this.onGround) this.crouched = !this.crouched;
      if (fly) this.crouched = false;
      if (wantRun && this.crouched && !this.exhausted && this.stamina > 0) this.crouched = false;
      // (pinned: Space hurries a ceremony along instead). Pressed a moment before you land, it jumps as
      // you land; a moment after you've stepped off an edge, you still jump
      if (ctx.enabled && !fly && !this.pinned && input.consume('Space')) this.jumpBuf = P.jumpBuffer;
      if (this.jumpBuf > 0) {
        if ((this.onGround || this.coyote > 0) && !fly) { this.jumpBuf = 0; this.tryJump(); }
        else this.jumpBuf -= dt;
      }
      this.crouchK += ((this.crouched ? 1 : 0) - this.crouchK) * Math.min(1, dt * 9);
      const athletics = DV.Stats ? DV.Stats.skill('athletics') : 20;
      let canRun = !this.exhausted && this.stamina > 0;
      const running = wantRun && canRun && !this.crouched;
      const speedBonus = 1 + U.clamp((athletics - 20) / 200, 0, 0.18);
      const target = (fly ? (wantRun ? 16 : 7) : (this.crouched ? P.crouchSpeed : running ? P.runSpeed * speedBonus : P.walkSpeed) * this.moveScale) * (dev ? dev.speed : 1);
      this.steer(dt, mx * target, mz * target, running, fly, !!(mx || mz));
      const K = DV.Perks;
      const speedBonus = 1 + U.clamp((athletics - 20) / 200, 0, 0.18) + (K ? K.mod('sprint.speed') : 0);
      // a hard landing knocks the wind out of you for a moment (not if you've learned to roll)
      if (this.staggerT > 0) this.staggerT -= dt;
      const stag = this.staggerT > 0 ? 0.35 : 1;
      const target = (fly ? (wantRun ? 16 : 7) : (this.crouched ? P.crouchSpeed : running ? P.runSpeed * speedBonus : P.walkSpeed) * this.moveScale * stag) * (dev ? dev.speed : 1);
      const tvx = mx * target, tvz = mz * target;
      // little steering in the air
      const a = 1 - Math.exp(-P.accel * (this.onGround || fly ? 1 : 0.22) * dt);
      this.vx += (tvx - this.vx) * a;
      this.vz += (tvz - this.vz) * a;
      if (!mx && !mz && Math.hypot(this.vx, this.vz) < 0.05) { this.vx = 0; this.vz = 0; }

      // stamina
      if (!this.onGround) { /* no regen mid-air */ } else if (running) {
        const drain = P.staminaDrain * (1 - U.clamp((athletics - 20) / 160, 0, 0.4)) * Math.max(0.2, 1 + (K ? K.mod('sprint.drain') : 0));
        this.stamina = Math.max(0, this.stamina - drain * dt);
        this.runTime += dt;
        if (this.stamina <= 0) this.exhausted = true;
        if (this.runTime > 3 && DV.Stats) { DV.Stats.practice('athletics', 0.6); this.runTime = 0; }
      } else this.regen(dt);
      if (dev && dev.stamina) { this.stamina = P.staminaMax; this.exhausted = false; }

      // vertical: jumping and landing. The ground is the room floor (0 almost everywhere, up a flight of
      // stairs it climbs), or the top of what you're standing on: something low enough to step up onto,
      // or that you came down on
      const floor = zone && zone.groundAt ? zone.groundAt(this.x, this.z) : 0;
      const ground = fly ? floor : this.floorAt(zone, this.x, this.z, this.y + (this.onGround ? P.step : 0.02), floor);
      this.groundY = ground;
      if (fly) {
        const up = ctx.enabled ? (input.down('Space') ? 1 : 0) - (input.down('KeyC') || input.down('ControlLeft') || input.down('ControlRight') ? 1 : 0) : 0;
        this.vy = up * (wantRun ? 14 : 7) * (dev.speed || 1);
        this.y = Math.max(ground, this.y + this.vy * dt);
        this.onGround = this.y <= ground + 0.01;
        if (this.onGround) this.vy = 0;
      } else if (!this.onGround) {
        this.vy -= P.gravity * dt;
        this.y += this.vy * dt;
        this.coyote = Math.max(0, this.coyote - dt);
        if (this.y <= ground && this.vy <= 0) this.land(ground, ctx);
      } else if (ground < this.y - P.stepDown) {
        // off an edge: falling (and for a moment you can still jump)
        this.onGround = false; this.vy = 0; this.coyote = P.coyote;
      } else {
        // up a step or down one: you're there at once, and drawn easing into it
        if (Math.abs(ground - this.y) > 0.06) this.stepVis = U.clamp(this.stepVis + this.y - ground, -0.45, 0.45);
        this.y = ground;
      }
      this.stepVis *= Math.exp(-14 * dt);
      if (Math.abs(this.stepVis) < 0.002) this.stepVis = 0;
      const feet = this.y - floor; // airborne: clear knee-high obstacles; on the ground: step up a ledge
        if (this.y <= ground) {
          const hard = this.vy < -4.5, fall = this.vy < -7.5; // (a fall: more than two metres or so)
          this.y = ground; this.vy = 0; this.onGround = true;
          DV.Audio.play('land', { volume: hard ? 1 : 0.7 });
          if (hard && ctx.rig) ctx.rig.shake = Math.max(ctx.rig.shake, 0.15);
          if (fall && !fly) this.hardLanding(ctx);
        }
      } else this.y = ground;
      const feet = this.y - ground; // airborne: clear knee-high obstacles

      // integrate + collide, in steps no longer than a third of your width: a slow frame (or a run)
      // can't carry you through a thin wall, a fence or a post
      let nx = this.x, nz = this.z;
      const stepUp = this.onGround ? P.step : 0;
      if (zone && !(dev && dev.noclip)) {
        const dx = this.vx * dt, dz = this.vz * dt, n = Math.min(24, Math.max(1, Math.ceil(Math.hypot(dx, dz) / (P.radius * 0.35))));
        for (let k = 0; k < n; k++) {
          let sx = nx + dx / n, sz = nz + dz / n;
          [sx, sz] = zone.colliders.resolveCircle(sx, sz, P.radius, 'player', feet, stepUp);
          if (ctx.npcs) {
            for (const o of ctx.npcs) {
              const ox = sx - o.x, oz = sz - o.z;
              const rr = P.radius + (o.r || 0.28);
              const d2 = ox * ox + oz * oz;
              if (d2 < rr * rr && d2 > 1e-6) {
                const d = Math.sqrt(d2);
                sx = o.x + (ox / d) * rr;
                sz = o.z + (oz / d) * rr;
              }
            }
            [sx, sz] = zone.colliders.resolveCircle(sx, sz, P.radius, 'player', feet, stepUp);
          }
          // never leave the map (the authored rooms, or the city's streets where there's one to walk)
          if (!zone.walkable(sx, sz)) { this.vx = this.vz = 0; break; }
          nx = sx; nz = sz;
        }
        // (what you walked into takes your speed: no running on the spot against a wall)
        if (dt > 0 && n > 0) {
          const ax = (nx - this.x) / dt, az = (nz - this.z) / dt;
          if (Math.hypot(ax, az) < Math.hypot(this.vx, this.vz) - 0.05) { this.vx = ax; this.vz = az; }
        }
        this.lastSafe[0] = nx;
        this.lastSafe[1] = nz;
      } else {
        nx = this.x + this.vx * dt;
        nz = this.z + this.vz * dt;
      }
      const moved = Math.hypot(nx - this.x, nz - this.z);
      this.x = nx; this.z = nz;
      this.speed = dt > 0 ? moved / dt : 0;
      if (mx || mz) {
        const want = Math.atan2(mx, mz);
        this.rot = U.dampAngle(this.rot, want, P.turnRate, dt);
      }
      this.syncModel();
      // (a hard landing: a moment down in a crouch, coming up out of it)
      this.landT = Math.max(0, this.landT - dt);
      const pk = this.landT > 0 && !fly ? { move: 'land', t: 1 - this.landT / 0.38 } : null;
      this.model.animate(dt, { speed: this.onGround && !fly ? this.speed : 0, action: !this.onGround && !fly ? 'jump' : this.crouchK > 0.5 ? 'sneak' : 'idle', lookYaw: ctx.lookYaw || 0, pk, lean: this.lean });

      // footsteps (quieter when sneaking; none in a slide)
      if (this.speed > 0.3 && this.onGround && !fly && !this.skidding) {
        const ph = this.model.phase;
        const step = Math.floor(ph / Math.PI);
        if (step !== this.stepPhase) {
          this.stepPhase = step;
          const room = zone ? zone.roomAt(this.x, this.z) : null;
          DV.Audio.play('step', { surface: this.surfaceOverride || surfaceFor(room), volume: running ? 1 : this.crouched ? 0.3 : 0.7 });
        }
      }
    },
    // where your speed goes, frame to frame (tvx, tvz: where you want it to be). The change is split
    // into along the way you're going (getting going, slowing) and across it (turning), each with
    // its own limit: you get going at once at a walk and build up into a run (easing off toward
    // full speed); at a walk you turn on the spot, at a run your momentum carries you wide; you stop
    // at once from a walk, and from a run (or turning back on yourself) you slide
    steer(dt, tvx, tvz, running, fly, pushing) {
      const vx = this.vx, vz = this.vz, cur = Math.hypot(vx, vz);
      if (fly || !this.onGround) {
        // (flying with the dev menu: at once; in the air: a little steering)
        const a = 1 - Math.exp(-P.accel * (fly ? 1 : 0.22) * dt);
        this.vx += (tvx - vx) * a; this.vz += (tvz - vz) * a;
        this.skidding = false;
        this.lean = U.damp(this.lean, 0, 6, dt);
        return;
      }
      let ux = 0, uz = 0;
      if (cur > 0.3) { ux = vx / cur; uz = vz / cur; }
      else if (pushing) { const tl = Math.hypot(tvx, tvz) || 1; ux = tvx / tl; uz = tvz / tl; }
      const dvx = tvx - vx, dvz = tvz - vz;
      let par = dvx * ux + dvz * uz, px = dvx - par * ux, pz = dvz - par * uz;
      const runK = U.clamp((cur - P.walkSpeed) / (P.runSpeed - P.walkSpeed), 0, 1), same = tvx * vx + tvz * vz > 0;
      const up = running ? U.lerp(P.runAccel, P.runAccel * 0.35, U.clamp(cur / (P.runSpeed * 1.2), 0, 1)) : P.walkAccel;
      const down = pushing && same ? P.easeDecel : cur > P.skidSpeed ? P.skidDecel : P.stopDecel;
      par = U.clamp(par, -down * dt, up * dt);
      const pl = Math.hypot(px, pz), gl = U.lerp(P.grip, P.runGrip, runK) * dt;
      if (pl > gl) { px *= gl / pl; pz *= gl / pl; }
      this.vx = vx + par * ux + px; this.vz = vz + par * uz + pz;
      // a slide: stopping from a run, or turning back on yourself at one (a scuff of soles as it starts)
      const skid = cur > P.skidSpeed && par < 0 && !(pushing && same);
      if (skid && !this.skidding) DV.Audio.play('skid', { volume: U.clamp(cur / 6, 0.4, 1) });
      this.skidding = skid;
      // leaning into it: forward getting going, back in a slide
      this.lean = U.damp(this.lean, skid ? -0.32 : dt > 0 ? U.clamp((par / dt) * 0.022, -0.1, 0.26) : 0, 8, dt);
    },
    // the ground at (x, z): the floor, or the top of whatever you could stand on there no higher
    // than upTo (a step, a pallet, a bench, a crate in the street)
    floorAt(zone, x, z, upTo, floor) {
      let g = floor === undefined ? (zone && zone.groundAt ? zone.groundAt(x, z) : 0) : floor;
      if (!zone || !zone.colliders || upTo <= g) return g;
      const box = zone.colliders.topAt(x, z, P.radius * 0.65, upTo - g); // (boxes stand on the floor)
      if (box > 0) g += box;
      const W = zone.physics;
      if (W) { const t = W.standAt(x, z, upTo); if (t !== null && t > g) g = t; }
      return g;
    },
    // coming down: a dip of the camera (a crouch, if it was a hard one), and the loose things round
    // you jump
    land(ground, ctx) {
      const k = -this.vy, hard = k > 4.5;
      this.y = ground; this.vy = 0; this.onGround = true; this.coyote = 0;
      DV.Audio.play('land', { volume: hard ? 1 : 0.7 });
      const rig = ctx.rig;
      if (rig && rig.dip) rig.dip(Math.min(0.3, k * 0.03));
      if (hard && rig) rig.shake = Math.max(rig.shake, 0.15);
      if (k > 5.2) { this.landT = 0.38; this.vx *= 0.55; this.vz *= 0.55; }
      const W = ctx.zone && ctx.zone.physics;
      if (W && W.thump) W.thump(this.x, this.z, k);
    },
    // hit (a car that couldn't stop): thrown the way it was going (vx, vz), over backwards, flat on
    // your back for a moment, and up again. k: how hard (its speed)
    knockDown(vx, vz, k) {
      if (this.state !== 'free' || (DV.Dev && DV.Dev.on() && DV.Dev.flags.noclip)) return false;
      this.state = 'down';
      this.crouched = false; this.jumpBuf = 0; this.skidding = false;
      this.downT = 0; this.downAir = true; this.downLand = null;
      this.rot = Math.atan2(-vx, -vz); // (facing what hit you: you go over backwards)
      this.vx = vx; this.vz = vz;
      this.vy = 1.6 + Math.min(2.6, k * 0.16);
      this.onGround = false;
      this.stamina = Math.max(0, this.stamina - 20);
      DV.Audio.play('carhit', { volume: 1 });
      DV.Events.emit('player:knocked', { x: this.x, z: this.z, k });
      if (DV.UI && DV.UI.notify) DV.UI.notify('You\'re knocked off your feet.');
      return true;
    },
    updateDown(dt, ctx) {
      const zone = ctx.zone, rig = ctx.rig, LIE = 1.5, UP = 1.1;
      this.downT += dt;
      this.downK = Math.min(1, this.downK + dt * 2.5);
      const floor = zone && zone.groundAt ? zone.groundAt(this.x, this.z) : 0;
      const ground = this.floorAt(zone, this.x, this.z, this.y + 0.02, floor);
      if (this.downAir) {
        this.vy -= P.gravity * dt;
        this.y += this.vy * dt;
        if (this.y <= ground && this.vy <= 0) {
          const k = -this.vy;
          this.y = ground; this.vy = 0; this.downAir = false; this.onGround = true; this.downLand = this.downT;
          DV.Audio.play('land', { volume: 1 });
          if (rig) { if (rig.dip) rig.dip(0.3); rig.shake = Math.max(rig.shake, 0.3); }
          const W = zone && zone.physics;
          if (W && W.thump) W.thump(this.x, this.z, k + 3);
        }
      } else this.y = ground;
      // along the ground, sliding to a stop; never through a wall, never off the map
      const sp = Math.hypot(this.vx, this.vz);
      if (!this.downAir && sp > 0) { const f = Math.max(0, sp - 7 * dt) / sp; this.vx *= f; this.vz *= f; }
      if (zone) {
        const dx = this.vx * dt, dz = this.vz * dt, n = Math.min(24, Math.max(1, Math.ceil(Math.hypot(dx, dz) / (P.radius * 0.35))));
        for (let k = 0; k < n; k++) {
          const [sx, sz] = zone.colliders.resolveCircle(this.x + dx / n, this.z + dz / n, P.radius, 'player', this.y - floor);
          if (!zone.walkable(sx, sz)) { this.vx = this.vz = 0; break; }
          this.x = sx; this.z = sz;
        }
      }
      this.speed = 0;
      // the pose: over backwards while you're thrown, flat out, then up onto your feet
      let pk = null;
      if (this.downAir || this.downT - this.downLand < LIE) pk = { move: 'knocked', t: Math.min(1, this.downT / 0.6), air: this.downAir };
      else {
        const u = (this.downT - this.downLand - LIE) / UP;
        if (u >= 1) { this.state = 'free'; this.vx = this.vz = 0; }
        else pk = { move: 'getup', t: u };
      }
      this.groundY = ground;
      this.syncModel();
      this.model.animate(dt, { speed: 0, action: 'idle', pk });
      this.regen(dt * 0.5);
    // falling hurts: the wind goes out of you and your legs won't run for a second. The Dauntless
    // learn to roll (Train-Hopper), and keep going
    hardLanding(ctx) {
      if (DV.Perks && DV.Perks.on('fall.immune')) { DV.Audio.play('hop'); this.lastLanding = 'roll'; return; }
      this.lastLanding = 'hard';
      this.stamina = Math.max(0, this.stamina - 25);
      this.staggerT = 0.9;
      if (ctx.rig) ctx.rig.shake = Math.max(ctx.rig.shake, 0.35);
      DV.Audio.play('punch', { volume: 0.5 });
    },
    regen(dt) {
      this.stamina = Math.min(P.staminaMax, this.stamina + P.staminaRegen * (1 + (DV.Perks ? DV.Perks.mod('stamina.regen') : 0)) * dt);
      if (this.exhausted && this.stamina > 25) this.exhausted = false;
    },
  };
  Player.surfaceFor = surfaceFor;
  DV.Player = Player;
})();
