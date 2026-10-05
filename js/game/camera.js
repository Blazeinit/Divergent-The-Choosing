/* ==========================================================================
   DIVERGENT — third person camera rig
   Smooth follow with mouse orbit, vertical limits, zoom, wall/ceiling
   collision, a dialogue framing mode and scripted cinematic shots.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const C = DV.Config.CAMERA;

  class CameraRig {
    constructor(camera) {
      this.camera = camera;
      this.yaw = 0; // heading the camera looks toward
      this.pitch = 0.22;
      this.dist = C.distance;
      this.curDist = C.distance;
      this.mode = 'follow';
      this.pos = new THREE.Vector3();
      this.look = new THREE.Vector3();
      this.pivot = new THREE.Vector3();
      this.shot = null; // cinematic {pos, look}
      this.shake = 0;
      this.initialized = false;
    }

    handleMouse(dx, dy) {
      const s = 0.0024 * DV.Settings.get('mouseSensitivity');
      this.yaw -= dx * s;
      this.pitch += dy * s * (DV.Settings.get('invertY') ? -1 : 1);
      this.pitch = U.clamp(this.pitch, C.minPitch, C.maxPitch);
    }
    zoom(w) {
      this.dist = U.clamp(this.dist + w * 0.35, C.minDistance, C.maxDistance);
    }
    snapBehind(rot) {
      this.yaw = rot;
    }
    setDialogue(playerPos, npcPos, npcHeadY, seated) {
      this.mode = 'dialogue';
      this.dlg = { p: playerPos.clone(), n: npcPos.clone(), h: npcHeadY || 1.6, seated: !!seated };
    }
    setShot(pos, look, instant) {
      this.mode = 'shot';
      this.shot = { pos: pos.clone(), look: look.clone() };
      if (instant) {
        this.pos.copy(pos);
        this.look.copy(look);
      }
    }
    // a moving camera driven every frame by an activity (a fight, the shooting range):
    // it chases the wanted position at `lambda` and won't end up inside a wall
    // `anchor`: a point known to be in the open (the player's head) that the wall check runs from
    setTrack(pos, look, lambda, instant, anchor) {
      if (this.mode !== 'track' || instant) { this.pos.copy(pos); this.look.copy(look); }
      this.mode = 'track';
      this.track = { pos: pos.clone(), look: look.clone(), lambda: lambda || 8, anchor: anchor ? anchor.clone() : null };
    }
    follow(instant) {
      if (this.mode !== 'follow' && !instant) this.blendT = 0.7;
      if (instant) { this.initialized = false; this.blendT = 0; }
      this.mode = 'follow';
    }

    update(dt, target, zone) {
      const cam = this.camera;
      let desiredPos, desiredLook, lambda = C.followLambda;
      if (this.mode === 'follow' && target) {
        const ph = C.pivotHeight * (target.scale || 1) * (target.pivotScale || 1);
        // follow jumps only partly so the view doesn't bob
        // (flying with the dev menu's noclip: the camera goes where you go, through walls too)
        const fly = DV.Dev && DV.Dev.on() && DV.Dev.flags.noclip;
        const tx = target.x, ty = (target.y || 0) * (fly ? 1 : 0.6) + ph, tz = target.z;
        if (!this.initialized || this.pivot.distanceToSquared(new THREE.Vector3(tx, ty, tz)) > 9) this.pivot.set(tx, ty, tz);
        else {
          const k = 1 - Math.exp(-lambda * dt);
          this.pivot.x += (tx - this.pivot.x) * k;
          this.pivot.y += (ty - this.pivot.y) * k;
          this.pivot.z += (tz - this.pivot.z) * k;
        }
        const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
        const dir = new THREE.Vector3(-Math.sin(this.yaw) * cp, sp, -Math.cos(this.yaw) * cp);
        // collision
        let d = this.dist;
        if (zone && !fly) {
          const hit = zone.colliders.raycast(this.pivot.x, this.pivot.y, this.pivot.z, dir.x, dir.y, dir.z, d + 0.3);
          if (hit < d + 0.3) d = Math.max(0.35, hit - 0.3);
        }
        // fast in, slow out
        this.curDist = d < this.curDist ? U.damp(this.curDist, d, 30, dt) : U.damp(this.curDist, d, 4, dt);
        desiredPos = this.pivot.clone().addScaledVector(dir, this.curDist);
        // stay below ceilings and above floor
        if (zone && !fly) {
          const room = zone.roomAt(desiredPos.x, desiredPos.z);
          if (room && !room.exterior) desiredPos.y = Math.min(desiredPos.y, room.h - 0.2);
        }
        desiredPos.y = Math.max(desiredPos.y, 0.3);
        desiredLook = this.pivot.clone();
        desiredLook.y -= 0.05;
        if (!this.initialized) {
          this.pos.copy(desiredPos);
          this.look.copy(desiredLook);
          this.initialized = true;
        }
        // the pivot is already smoothed; position follows it exactly so collision stays correct
        if (this.blendT > 0) {
          this.blendT -= dt;
          const k = 1 - Math.exp(-9 * dt);
          this.pos.lerp(desiredPos, k);
          this.look.lerp(desiredLook, k);
        } else {
          this.pos.copy(desiredPos);
          this.look.copy(desiredLook);
        }
      } else if (this.mode === 'dialogue' && this.dlg) {
        const p = this.dlg.p, n = this.dlg.n;
        const dir = new THREE.Vector3(n.x - p.x, 0, n.z - p.z);
        const len = dir.length() || 1;
        dir.divideScalar(len);
        const right = new THREE.Vector3(-dir.z, 0, dir.x);
        const back = this.dlg.seated ? 1.7 : 0.95, side = this.dlg.seated ? 0.95 : 0.62;
        desiredPos = new THREE.Vector3(p.x, 0, p.z).addScaledVector(dir, -back).addScaledVector(right, -side);
        desiredPos.y = this.dlg.h + (this.dlg.seated ? 0.35 : 0.08);
        desiredLook = new THREE.Vector3(n.x, this.dlg.h - 0.05, n.z).addScaledVector(right, -0.15);
        if (zone) {
          // pull in if the over-the-shoulder spot is inside a wall
          const ox = p.x, oz = p.z, oy = this.dlg.h;
          const v = desiredPos.clone().sub(new THREE.Vector3(ox, oy, oz));
          const vl = v.length();
          v.divideScalar(vl);
          const hit = zone.colliders.raycast(ox, oy, oz, v.x, v.y, v.z, vl + 0.2);
          if (hit < vl + 0.2) desiredPos = new THREE.Vector3(ox, oy, oz).addScaledVector(v, Math.max(0.2, hit - 0.25));
          const room = zone.roomAt(desiredPos.x, desiredPos.z);
          if (room && !room.exterior) desiredPos.y = Math.min(desiredPos.y, room.h - 0.2);
        }
        const k = 1 - Math.exp(-5 * dt);
        this.pos.lerp(desiredPos, k);
        this.look.lerp(desiredLook, k);
      } else if (this.mode === 'track' && this.track) {
        const T = this.track;
        let want = T.pos;
        if (zone) {
          // pull in toward the anchor (or the look point) if the wanted spot is behind a wall
          const A = T.anchor || T.look;
          const v = want.clone().sub(A);
          const vl = v.length();
          if (vl > 0.01) {
            v.divideScalar(vl);
            const hit = zone.colliders.raycast(A.x, A.y, A.z, v.x, v.y, v.z, vl + 0.2);
            if (hit < vl + 0.2) want = A.clone().addScaledVector(v, Math.max(0.3, hit - 0.25));
          }
        }
        const k = 1 - Math.exp(-T.lambda * dt);
        this.pos.lerp(want, k);
        this.look.lerp(T.look, Math.min(1, k * 1.6));
      } else if (this.mode === 'shot' && this.shot) {
        const k = 1 - Math.exp(-3 * dt);
        this.pos.lerp(this.shot.pos, k);
        this.look.lerp(this.shot.look, k);
      }
      cam.position.copy(this.pos);
      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - dt);
        const s = this.shake * 0.08;
        cam.position.x += (Math.random() - 0.5) * s;
        cam.position.y += (Math.random() - 0.5) * s;
      }
      cam.lookAt(this.look);
    }
  }

  DV.CameraRig = CameraRig;
})();
