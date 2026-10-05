/* ==========================================================================
   DIVERGENT — Build 3: the training room
   Three activities (see activity.js) the instructor runs you through:

   THE RANGE   — a pistol, a paper silhouette thirteen metres away. Your
                 aim sways with your breathing (PERCEPTION, RESOLVE and the
                 Firearms skill steady it; hold Shift to hold your breath, for
                 a while). Round one stands still, round two moves, round
                 three only turns to face you for a moment.
   THE KNIVES  — hold to wind up, release to throw. Too little or too much
                 and the handle hits the board instead of the point (AGILITY
                 and the Throwing skill widen the window). Then step back.
   THE BAGS    — a drill called out on a beat: jab, cross, kick, and when
                 the bag swings back at you, block. It's the fight controls,
                 learned the way you'd learn them.

   Each hands back { score: 0..100, … }.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const S = () => DV.Stats;
  const fwdOf = (rot) => new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
  const rightOf = (rot) => new THREE.Vector3(-Math.cos(rot), 0, Math.sin(rot));
  // the player's model in the pose an activity wants
  const pose = (dt, s) => {
    const P = DV.Player;
    P.syncModel();
    const z = DV.World.current;
    if (z) { const L = z.lightAt(P.x, P.z); P.model.setTint(U.clamp(L[0] * 0.9, 0.3, 1.25), U.clamp(L[1] * 0.9, 0.3, 1.25), U.clamp(L[2] * 0.9, 0.3, 1.25)); }
    P.model.animate(dt, s);
  };
  // game-time timers for an activity (they pause with the game, and QA can step them)
  const timers = {
    after(t, fn) { (this._tm || (this._tm = [])).push({ t, fn }); },
    tick(dt) {
      if (!this._tm || !this._tm.length) return;
      const due = [];
      this._tm = this._tm.filter((x) => ((x.t -= dt) > 0 ? true : (due.push(x), false)));
      for (const x of due) x.fn();
    },
  };
  const setFov = (f) => { const c = DV.Game.camera; if (Math.abs(c.fov - f) > 0.01) { c.fov = f; c.updateProjectionMatrix(); } };
  const baseFov = () => DV.Config.CAMERA.fov;

  /* ============================== the range ============================== */
  // the pistol in your hands (DV.Arms), lit like the lane you're standing in
  function makePistol() {
    const g = DV.Arms.pistol();
    const z = DV.World.current, P = DV.Player;
    if (z) { const L = z.lightAt(P.x, P.z); DV.Arms.tint(g, [L[0] * 1.2, L[1] * 1.2, L[2] * 1.2]); }
    g.scale.setScalar(1.25); // (held things read a little big, the way the rest of the world does)
    return g;
  }

  class Range {
    constructor(o) { this.id = 'range'; this.o = o; }
    begin(A) {
      const o = this.o, z = DV.World.current, P = DV.Player;
      this.A = A;
      this.lane = o.lane || nearest(z.targets || [], P);
      if (!this.lane) { A.finish({ score: 0 }); return; }
      const st = this.lane.stand;
      P.place(st.x, st.z, st.rot);
      this.rot = st.rot;
      this.ay = 0; this.ap = 0.02; this.recoil = 0; this.recoilV = 0; this.t = 0;
      this.breath = 1; this.holding = false; this.shaky = 0;
      this.rounds = o.practice ? [{ kind: 'static', shots: 6 }, { kind: 'moving', shots: 6 }] : [{ kind: 'static', shots: 6 }, { kind: 'moving', shots: 6 }, { kind: 'snap', shots: 5 }];
      this.r = 0; this.shots = 0; this.cool = 0; this.total = 0; this.max = 0; this.hits = 0; this.bulls = 0; this.heads = 0; this.fired = 0;
      this.roundT = 0; this.snapT = 0; this.facing = true; this.zoom = 0;
      this.face = this.lane.face; this.face0 = this.face.position.clone(); this.faceRot0 = this.face.rotation.y;
      this.gun = makePistol();
      DV.Game.scene.add(this.gun);
      this.ray = new THREE.Raycaster();
      // HUD
      const h = U.el('div', 'tr-hud', '<div class="tr-box"><div class="tr-title"></div><div class="tr-line"></div><div class="tr-score"></div></div><div class="tr-cross"><i></i><b></b></div><div class="tr-breath hidden"><div class="lbl">Breath</div><div class="fh-bar"><i></i></div></div>', A.hud);
      this.h = h;
      A.keys('<b>Mouse</b> aim · <b>LMB</b> fire · hold <b>RMB</b> sights · hold <b>Shift</b> hold your breath');
      this.startRound();
      if (o.say) o.say(o.practice ? 'Range is open. Go on.' : U.pick(['Feet apart. Both hands. Squeeze, don\'t pull.', 'It\'s going to kick. Let it. Then bring it back.', 'Thirteen metres. Paper doesn\'t shoot back. Yet.']), 3.4);
    }
    startRound() {
      const R = this.rounds[this.r];
      this.shots = R.shots; this.roundT = 0; this.scoredThisFace = false;
      this.face.position.copy(this.face0); this.face.rotation.y = this.faceRot0; this.facing = true;
      if (R.kind === 'snap') { this.facing = false; this.face.rotation.y = this.faceRot0 + Math.PI / 2; this.snapT = 1.2; this.exposures = 0; }
      this.A.announce('ROUND ' + (this.r + 1) + (R.kind === 'moving' ? ' · MOVING' : R.kind === 'snap' ? ' · SNAP SHOTS' : ''), 1.4);
      DV.Audio.play('reload', { volume: 0.8 });
      this.max += R.kind === 'snap' ? R.shots * 10 : R.shots * 10;
    }
    update(dt, input, A) {
      this.tick(dt);
      const P = DV.Player, R = this.rounds[Math.min(this.r, this.rounds.length - 1)];
      this.t += dt; this.roundT += dt;
      this.cool -= dt;
      // aim
      const [mx, my] = input.takeMouse();
      input.takeWheel();
      const sens = 0.0016 * DV.Settings.get('mouseSensitivity') * (this.zoom > 0.5 ? 0.55 : 1);
      this.ay = U.clamp(this.ay - mx * sens, -0.45, 0.45);
      this.ap = U.clamp(this.ap - my * sens * (DV.Settings.get('invertY') ? -1 : 1), -0.25, 0.3);
      // breathing: sway shrinks with skill; holding your breath steadies it, for a few seconds
      const steady = U.clamp(1.3 - S().attr('perception') * 0.035 - S().attr('resolve') * 0.03 - S().skill('firearms') / 260, 0.25, 1.2);
      const wantHold = input.down('ShiftLeft') || input.down('ShiftRight');
      if (wantHold && this.breath > 0 && this.shaky <= 0) { this.holding = true; this.breath = Math.max(0, this.breath - dt / 3.2); if (this.breath <= 0) this.shaky = 2.2; }
      else { this.holding = false; this.breath = Math.min(1, this.breath + dt / 2.5); }
      this.shaky = Math.max(0, this.shaky - dt);
      const amp = 0.013 * steady * (this.holding ? 0.22 : 1) * (this.shaky > 0 ? 2.2 : 1) * (DV.Player.exhausted ? 1.6 : 1);
      const t = this.t;
      const sx = amp * (Math.sin(t * 1.3) * 0.6 + Math.sin(t * 2.9 + 1.3) * 0.4);
      const sy = amp * (Math.sin(t * 1.05 + 2) * 0.55 + Math.sin(t * 2.3) * 0.45) * 0.8;
      // recoil kicks up and settles back
      this.recoilV += (-this.recoil * 60 - this.recoilV * 11) * dt;
      this.recoil += this.recoilV * dt;
      this.zoom = U.damp(this.zoom, input.down('MouseRight') ? 1 : 0, 10, dt);
      setFov(U.lerp(baseFov(), 34, this.zoom));
      // the round's target behaviour
      if (R.kind === 'moving') {
        const k = Math.sin(this.roundT * 1.15) * 0.42 + Math.sin(this.roundT * 0.47) * 0.12;
        const right = rightOf(this.rot);
        this.face.position.copy(this.face0).addScaledVector(right, k);
      } else if (R.kind === 'snap') {
        this.snapT -= dt;
        if (this.snapT <= 0) {
          if (this.facing) { this.facing = false; this.snapT = U.rand(0.8, 1.8); if (this.exposures >= R.shots) { this.nextRound(); return; } }
          else { this.facing = true; this.snapT = 1.7; this.exposures++; this.scoredThisFace = false; DV.Audio.play('clank', { volume: 0.5, x: this.face0.x, z: this.face0.z }); }
        }
        this.face.rotation.y = U.dampAngle(this.face.rotation.y, this.faceRot0 + (this.facing ? 0 : Math.PI / 2), 22, dt);
      }
      // where you're looking
      const yaw = this.rot + this.ay + sx, pitch = this.ap + sy + this.recoil;
      const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const sc = P.scale;
      const fw = fwdOf(this.rot), rt = rightOf(this.rot);
      const eye = new THREE.Vector3(P.x, 1.62 * sc, P.z).addScaledVector(rt, U.lerp(0.68, 0.26, this.zoom)).addScaledVector(fw, U.lerp(-0.62, -0.2, this.zoom)).add(new THREE.Vector3(0, 0.12, 0));
      DV.Game.rig.setTrack(eye, eye.clone().addScaledVector(dir, 12), 30, this.t < 0.05, new THREE.Vector3(P.x, 1.6 * sc, P.z));
      this.dir = dir; this.eye = eye;
      // pose + the pistol between your hands, pointing where you are
      P.rot = U.dampAngle(P.rot, this.rot + this.ay, 12, dt);
      pose(dt, { speed: 0, action: 'aim', aimPitch: pitch * 0.9, recoil: Math.max(0, this.recoil * 4) });
      // at the hip it's in your hands; down the sights it comes up in front of your eye
      // (in the grip: between the wrists, the right hand's a little more)
      const hand = P.model.boneWorld('handR', this._hr || (this._hr = new THREE.Vector3())).lerp(P.model.boneWorld('handL', this._hl || (this._hl = new THREE.Vector3())), 0.4).addScaledVector(dir, 0.07 * sc).add(new THREE.Vector3(0, -0.01, 0));
      const sight = eye.clone().addScaledVector(dir, 0.55).add(new THREE.Vector3(0, -0.085, 0));
      const gp = hand.lerp(sight, this.zoom);
      this.gun.position.copy(gp);
      this.gun.lookAt(gp.clone().add(dir));
      this.gun.userData.flash.opacity = Math.max(0, this.gun.userData.flash.opacity - dt * 14);
      // fire
      if ((input.consume('MouseLeft') || input.consume('KeyJ')) && this.cool <= 0 && !this.ending) this.fire();
      this.hud();
    }
    fire() {
      const R = this.rounds[this.r];
      if (this.shots <= 0) { DV.Audio.play('dryfire'); return; }
      this.shots--; this.fired++;
      this.cool = 0.32;
      DV.Audio.play('gunshot', { volume: 0.9 });
      this.gun.userData.flash.opacity = 1;
      this.recoilV += 1.6 * U.clamp(1.25 - S().attr('strength') * 0.04 - S().skill('firearms') / 400, 0.5, 1.2);
      DV.Game.rig.shake = Math.max(DV.Game.rig.shake, 0.06);
      S().practice('firearms', 0.35);
      // what did it hit?
      this.ray.set(this.eye, this.dir);
      const faces = (DV.World.current.targets || []).map((l) => l.face);
      const hit = this.ray.intersectObjects(faces, false)[0];
      let pts = 0, label = 'MISS';
      if (hit && hit.object === this.face && (R.kind !== 'snap' || (this.facing && !this.scoredThisFace))) {
        const u = hit.uv.x * 64, v = (1 - hit.uv.y) * 96;
        const dh = Math.hypot(u - 32, v - 20), db = Math.hypot(u - 32, v - 58);
        if (dh < 5) { pts = 10; label = 'HEAD'; this.heads++; }
        else if (dh < 11) { pts = 7; label = 'HEAD'; this.heads++; }
        else if (db < 6) { pts = 10; label = 'BULL'; this.bulls++; }
        else if (db < 13) { pts = 8; label = '8'; }
        else if (db < 20) { pts = 6; label = '6'; }
        else if (u > 12 && u < 52 && v > 33) { pts = 4; label = '4'; }
        else { pts = 1; label = 'PAPER'; }
        if (pts > 1) this.hits++;
        if (R.kind === 'snap') this.scoredThisFace = true;
        this.hole(hit);
        DV.Audio.play('paper', { x: this.face.position.x, z: this.face.position.z, volume: 0.8 });
      } else if (hit && hit.object !== this.face) {
        label = 'WRONG LANE';
        this.hole(hit);
      } else if (hit && R.kind === 'snap') {
        label = 'TOO SLOW';
      } else if (Math.random() < 0.3) DV.Audio.play('ricochet', { volume: 0.5 });
      this.total += pts;
      this.A.announce(label + (pts ? '  +' + pts : ''), 0.6, pts >= 8 ? 'good' : pts ? '' : 'bad');
      if (this.shots <= 0 && R.kind !== 'snap') this.after(0.7, () => this.nextRound());
      else if (this.shots <= 0 && R.kind === 'snap') this.nextRound();
    }
    hole(hit) {
      const f = hit.object;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.022), new THREE.MeshBasicMaterial({ color: 0x0c0c0c, fog: true }));
      const lp = f.worldToLocal(hit.point.clone());
      m.position.set(lp.x, lp.y, 0.003);
      f.add(m);
      if (f.children.length > 60) { const old = f.children[0]; f.remove(old); old.geometry.dispose(); }
    }
    nextRound() {
      if (this.ending) return;
      if (this.r + 1 >= this.rounds.length) { this.done(); return; }
      this.r++;
      this.startRound();
    }
    done() {
      if (this.ending) return;
      this.ending = true;
      const score = Math.round(U.clamp(this.total / Math.max(1, this.max) * 100, 0, 100));
      this.A.announce(score + ' / 100', 2, score >= 60 ? 'good' : '');
      const o = this.o;
      if (o.say) o.say(score >= 80 ? 'Huh. Again tomorrow, and do it exactly like that.' : score >= 55 ? 'Not bad. Stop flinching before it goes off.' : score >= 30 ? 'You hit the paper. That\'s a start.' : 'The target is the white thing. Down there.', 3.2);
      this.after(1.6, () => this.A.finish({ score, hits: this.hits, bulls: this.bulls, heads: this.heads, fired: this.fired }));
    }
    hud() {
      const R = this.rounds[this.r];
      if (!R) return;
      const q = (s) => this.h.querySelector(s);
      q('.tr-title').textContent = this.o.practice ? 'THE RANGE · PRACTICE' : 'THE RANGE';
      q('.tr-line').textContent = 'Round ' + (this.r + 1) + '/' + this.rounds.length + ' · Shots ' + this.shots;
      q('.tr-score').textContent = 'Score ' + this.total;
      const b = q('.tr-breath');
      b.classList.toggle('hidden', this.breath >= 1 && !this.holding);
      b.querySelector('i').style.width = Math.round(this.breath * 100) + '%';
      b.classList.toggle('shaky', this.shaky > 0);
    }
    end() {
      if (this.gun) DV.Game.scene.remove(this.gun); // (its geometry is shared: DV.Arms)
      if (this.face) { this.face.position.copy(this.face0); this.face.rotation.y = this.faceRot0; }
      setFov(baseFov());
    }
  }

  /* ============================== the knives ============================== */
  function makeKnife() {
    const g = DV.Arms.knife();
    const z = DV.World.current, P = DV.Player;
    if (z) DV.Arms.tint(g, z.lightAt(P.x, P.z));
    return g;
  }

  class Knives {
    constructor(o) { this.id = 'knives'; this.o = o; }
    begin(A) {
      const o = this.o, z = DV.World.current;
      this.A = A;
      const boards = z.knifeBoards || [];
      this.board = o.board || nearest(boards, DV.Player) || boards[0];
      if (!this.board) { A.finish({ score: 0 }); return; }
      this.rounds = o.practice ? [{ dist: 6.3, n: 6 }] : [{ dist: 6.3, n: 6 }, { dist: 7.8, n: 6 }];
      this.r = -1; this.total = 0; this.max = 0; this.stuck = 0; this.thrown = 0; this.bulls = 0;
      this.flying = []; this.knives = [];
      this.ay = 0; this.ap = 0; this.t = 0; this.charge = -1; this.throwT = 0;
      this.dir = new THREE.Vector3();
      const h = U.el('div', 'tr-hud', '<div class="tr-box"><div class="tr-title"></div><div class="tr-line"></div><div class="tr-score"></div></div><div class="tr-cross small"><i></i><b></b></div><div class="tr-power"><div class="band"></div><div class="fill"></div><div class="lbl">Power</div></div>', A.hud);
      this.h = h;
      A.keys('<b>Mouse</b> aim · hold <b>LMB</b> wind up, release to throw · the point has to arrive first');
      this.nextRound();
      if (o.say) o.say(o.practice ? 'Wall\'s free. Mind your fingers.' : 'Wrist stiff, elbow leads. Watch how far it turns before it gets there.', 3.4);
    }
    nextRound() {
      this.r++;
      if (this.r >= this.rounds.length) { this.done(); return; }
      const R = this.rounds[this.r];
      this.left = R.n;
      this.max += R.n * 10;
      const b = this.board, P = DV.Player;
      // stand back from the board, square to it
      const n = new THREE.Vector3(Math.sin(b.rot), 0, Math.cos(b.rot)); // the board faces you along its normal
      P.place(b.x + n.x * R.dist, b.z + n.z * R.dist, Math.atan2(-n.x, -n.z));
      this.rot = P.rot;
      this.dist = R.dist;
      // the power that gets the point there first, and how much slack you have
      this.ideal = 0.5 + (R.dist - 6.3) * 0.13;
      this.slack = U.clamp(0.055 + S().attr('agility') * 0.006 + S().skill('throwing') / 900, 0.06, 0.16) * (this.r > 0 ? 0.85 : 1);
      this.A.announce('ROUND ' + (this.r + 1) + ' · ' + R.dist.toFixed(1) + ' M', 1.4);
      for (const k of this.knives) { if (k.parent) k.parent.remove(k); }
      this.knives = [];
    }
    update(dt, input, A) {
      this.tick(dt);
      const P = DV.Player;
      this.t += dt;
      const [mx, my] = input.takeMouse();
      input.takeWheel();
      const sens = 0.0016 * DV.Settings.get('mouseSensitivity');
      this.ay = U.clamp(this.ay - mx * sens, -0.25, 0.25);
      this.ap = U.clamp(this.ap - my * sens * (DV.Settings.get('invertY') ? -1 : 1), -0.2, 0.2);
      const amp = 0.006 * U.clamp(1.3 - S().attr('perception') * 0.04 - S().attr('agility') * 0.03, 0.3, 1.2);
      const sx = amp * Math.sin(this.t * 1.7), sy = amp * Math.sin(this.t * 1.3 + 1);
      const yaw = this.rot + this.ay + sx, pitch = this.ap + sy;
      this.dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const sc = P.scale, fw = fwdOf(this.rot), rt = rightOf(this.rot);
      const eye = new THREE.Vector3(P.x, 1.62 * sc, P.z).addScaledVector(rt, 0.7).addScaledVector(fw, -0.75).add(new THREE.Vector3(0, 0.1, 0));
      this.eye = eye;
      DV.Game.rig.setTrack(eye, eye.clone().addScaledVector(this.dir, 10), 26, this.t < 0.05, new THREE.Vector3(P.x, 1.6 * sc, P.z));
      // wind up while held, throw on release
      const held = input.down('MouseLeft') || input.down('KeyJ');
      if (held && this.charge < 0 && this.left > 0 && !this.ending && this.throwT <= 0) { this.charge = 0; this.chargeDir = 1; }
      if (this.charge >= 0) {
        this.charge += this.chargeDir * dt / 1.05;
        if (this.charge >= 1) { this.charge = 1; this.chargeDir = -1; }
        if (this.charge <= 0 && this.chargeDir < 0) { this.charge = 0; this.chargeDir = 1; }
        if (!held) { this.throwKnife(this.charge); this.charge = -1; this.throwT = 0.0001; }
      }
      input.consume('MouseLeft');
      if (this.throwT > 0) { this.throwT += dt / 0.28; if (this.throwT >= 1) this.throwT = 0; }
      const tt = this.charge >= 0 ? 0.55 * Math.min(1, this.charge * 1.6) : this.throwT > 0 ? 0.55 + this.throwT * 0.45 : 0;
      P.rot = U.dampAngle(P.rot, this.rot + this.ay, 10, dt);
      pose(dt, { speed: 0, action: tt > 0 ? 'throw' : 'idle', throwT: tt });
      this.updateFlying(dt);
      this.hud();
      if (this.left <= 0 && !this.flying.length && !this.wait) {
        this.wait = true;
        this.after(1.1, () => { this.wait = false; this.nextRound(); });
      }
    }
    throwKnife(power) {
      this.left--; this.thrown++;
      S().practice('throwing', 0.4);
      DV.Audio.play('knife_throw', { volume: 0.8 });
      const P = DV.Player, sc = P.scale;
      const start = new THREE.Vector3(P.x, 1.75 * sc, P.z).addScaledVector(rightOf(this.rot), 0.25);
      // where it's going: the board's plane along your aim
      const b = this.board;
      const n = new THREE.Vector3(Math.sin(b.rot), 0, Math.cos(b.rot));
      const planeP = new THREE.Vector3(b.x, b.y, b.z);
      const denom = this.dir.dot(n);
      let hitP = null;
      if (Math.abs(denom) > 1e-4) {
        const tHit = planeP.clone().sub(this.eye).dot(n) / denom;
        if (tHit > 0) hitP = this.eye.clone().addScaledVector(this.dir, tHit);
      }
      if (!hitP) hitP = this.eye.clone().addScaledVector(this.dir, this.dist);
      // weak throws drop
      hitP.y -= Math.max(0, 0.45 - power) * 0.9;
      const k = makeKnife();
      DV.Game.scene.add(k);
      const dist = start.distanceTo(hitP);
      const off = Math.abs(power - this.ideal);
      const stick = off <= this.slack;
      const fromCentre = Math.hypot(hitP.x - b.x, hitP.y - b.y, hitP.z - b.z);
      this.flying.push({ k, start, end: hitP, t: 0, dur: dist / (9 + power * 6), spin: (dist / 1.55 + (power - this.ideal) * 2.2) * Math.PI * 2, stick, onBoard: fromCentre <= b.r * 0.98, fromCentre, power });
    }
    updateFlying(dt) {
      for (const f of this.flying.slice()) {
        f.t += dt / f.dur;
        if (f.landed) {
          // a bounced knife falling to the floor
          f.vy -= 9.8 * dt;
          f.k.position.x += f.vx * dt; f.k.position.z += f.vz * dt; f.k.position.y += f.vy * dt;
          f.k.rotation.x += 12 * dt;
          if (f.k.position.y <= 0.02) { f.k.position.y = 0.02; f.k.rotation.x = Math.PI / 2; this.flying.splice(this.flying.indexOf(f), 1); this.knives.push(f.k); DV.Audio.play('knife_bounce', { volume: 0.35, x: f.k.position.x, z: f.k.position.z }); }
          continue;
        }
        const t = Math.min(1, f.t);
        const p = f.start.clone().lerp(f.end, t);
        p.y += Math.sin(Math.PI * t) * 0.12;
        f.k.position.copy(p);
        f.k.lookAt(f.end);
        f.k.rotateX(f.spin * t);
        if (t >= 1) this.land(f);
      }
    }
    land(f) {
      const b = this.board;
      let pts = 0, label;
      if (f.onBoard && f.stick) {
        // point first, into the wood
        const r = f.fromCentre;
        pts = r < 0.1 ? 10 : r < 0.22 ? 8 : r < 0.34 ? 6 : r < 0.46 ? 4 : 2;
        label = pts === 10 ? 'BULL' : String(pts);
        if (pts === 10) this.bulls++;
        this.stuck++;
        DV.Audio.play('knife_stick', { x: b.x, z: b.z });
        f.k.position.copy(f.end);
        const n = new THREE.Vector3(Math.sin(b.rot), 0, Math.cos(b.rot));
        f.k.lookAt(f.end.clone().sub(n));
        f.k.rotateX(U.rand(-0.15, 0.15)); f.k.rotateY(U.rand(-0.15, 0.15));
        f.k.position.addScaledVector(n, 0.07);
        this.flying.splice(this.flying.indexOf(f), 1);
        this.knives.push(f.k);
      } else {
        // handle first (or the wall): it clatters away
        label = !f.onBoard ? 'MISSED THE BOARD' : f.power < this.ideal ? 'TOO SOFT' : 'TOO HARD';
        DV.Audio.play('knife_bounce', { x: b.x, z: b.z });
        f.landed = true;
        const n = new THREE.Vector3(Math.sin(b.rot), 0, Math.cos(b.rot));
        f.vx = n.x * 1.6 + U.rand(-0.5, 0.5); f.vz = n.z * 1.6 + U.rand(-0.5, 0.5); f.vy = 1.2;
      }
      this.total += pts;
      this.A.announce(label + (pts ? '  +' + pts : ''), 0.7, pts >= 8 ? 'good' : pts ? '' : 'bad');
    }
    done() {
      if (this.ending) return;
      this.ending = true;
      const score = Math.round(U.clamp(this.total / Math.max(1, this.max) * 100, 0, 100));
      this.A.announce(score + ' / 100', 2, score >= 60 ? 'good' : '');
      if (this.o.say) this.o.say(score >= 75 ? 'Good hands. Don\'t let it go to your head.' : score >= 45 ? 'Better than most on their first day.' : 'You\'re throwing the handle. Again tomorrow.', 3);
      this.after(1.5, () => this.A.finish({ score, stuck: this.stuck, thrown: this.thrown, bulls: this.bulls }));
    }
    hud() {
      const q = (s) => this.h.querySelector(s);
      const R = this.rounds[this.r];
      if (!R) return;
      q('.tr-title').textContent = this.o.practice ? 'THE KNIFE WALL · PRACTICE' : 'THE KNIFE WALL';
      q('.tr-line').textContent = 'Round ' + (this.r + 1) + '/' + this.rounds.length + ' · Knives ' + this.left;
      q('.tr-score').textContent = 'Score ' + this.total;
      const pw = q('.tr-power');
      pw.querySelector('.fill').style.height = Math.round(Math.max(0, this.charge) * 100) + '%';
      const band = pw.querySelector('.band');
      band.style.bottom = Math.round((this.ideal - this.slack) * 100) + '%';
      band.style.height = Math.round(this.slack * 200) + '%';
    }
    end() {
      for (const f of this.flying) if (f.k.parent) f.k.parent.remove(f.k);
      // the knives stay in the board (and on the floor) until somebody collects them
      const keep = this.knives.slice();
      setTimeout(() => keep.forEach((k) => { if (k.parent) k.parent.remove(k); }), 60000);
    }
  }

  /* ============================== the bags ============================== */
  const CUES = {
    jab: { label: 'JAB', key: 'LMB', move: 'jab' },
    cross: { label: 'CROSS', key: 'RMB', move: 'cross' },
    kick: { label: 'KICK', key: 'F', move: 'kick' },
    block: { label: 'BLOCK!', key: 'Shift', move: 'block' },
  };
  class Bags {
    constructor(o) { this.id = 'bags'; this.o = o; }
    begin(A) {
      const o = this.o, z = DV.World.current, P = DV.Player;
      this.A = A;
      this.bag = o.bag || nearest(z.bags || [], P);
      if (!this.bag) { A.finish({ score: 0 }); return; }
      const b = this.bag;
      // stand off the bag, facing it
      const ang = Math.atan2(P.x - b.x, P.z - b.z);
      const R = 0.82;
      P.place(b.x + Math.sin(ang) * R, b.z + Math.cos(ang) * R, ang + Math.PI);
      this.rot = P.rot;
      // the drill: a pattern on a beat that gets quicker
      const n = o.practice ? 16 : 24;
      const pat = ['jab', 'jab', 'cross', 'jab', 'cross', 'kick', 'block', 'jab', 'jab', 'cross', 'cross', 'kick', 'jab', 'block', 'cross', 'jab', 'kick', 'jab', 'cross', 'block', 'jab', 'cross', 'kick', 'cross'];
      this.cues = [];
      let t = 2.0;
      for (let i = 0; i < n; i++) {
        const gap = U.lerp(1.15, 0.72, i / n);
        this.cues.push({ id: pat[i % pat.length], t, hit: null });
        t += gap;
      }
      this.t = 0; this.idx = 0; this.score = 0; this.combo = 0; this.best = 0; this.perfect = 0;
      this.move = null; this.moveT = 0;
      const h = U.el('div', 'tr-hud', '<div class="tr-box"><div class="tr-title"></div><div class="tr-line"></div><div class="tr-score"></div></div><div class="bag-cue"><div class="ring"></div><div class="lab"></div><div class="key"></div></div><div class="bag-next"></div>', A.hud);
      this.h = h;
      A.keys('<b>LMB</b> Jab · <b>RMB</b> Cross · <b>F</b> Kick · hold <b>Shift</b> Block — on the beat');
      if (o.say) o.say(o.practice ? 'Bag\'s yours. Keep your hands up.' : 'I call it, you throw it. On my count, not yours.', 3);
    }
    update(dt, input, A) {
      this.tick(dt);
      const P = DV.Player, b = this.bag;
      this.t += dt;
      input.takeMouse(); input.takeWheel();
      const cue = this.cues[this.idx];
      // inputs
      let pressed = null;
      if (input.consume('MouseLeft') || input.consume('KeyJ')) pressed = 'jab';
      if (input.consume('MouseRight') || input.consume('KeyK')) pressed = 'cross';
      if (input.consume('KeyF') || input.consume('KeyL')) pressed = 'kick';
      const blocking = input.down('ShiftLeft') || input.down('ShiftRight');
      if (cue) {
        const dtc = this.t - cue.t;
        if (pressed && dtc > -0.35) {
          const ok = pressed === cue.id;
          const err = Math.abs(dtc);
          this.grade(cue, ok ? (err < 0.1 ? 3 : err < 0.22 ? 2 : 1) : 0, pressed);
        } else if (pressed) {
          this.throwMove(pressed, false); // swung early, at nothing
        } else if (cue.id === 'block' && dtc >= -0.05 && dtc < 0.3 && blocking) {
          this.grade(cue, dtc < 0.12 ? 3 : 2, 'block');
        } else if (dtc > 0.35) {
          this.grade(cue, 0, null);
        }
      } else if (!this.ending) this.done();
      // the move being thrown
      let ext = 0, mv = blocking ? 'block' : 'stance';
      if (this.move) {
        this.moveT += dt;
        const d = 0.32;
        ext = this.moveT < 0.08 ? -0.3 : this.moveT < 0.16 ? 1 : 1 - (this.moveT - 0.16) / (d - 0.16);
        mv = this.move;
        if (this.moveT >= d) this.move = null;
      }
      P.rot = U.dampAngle(P.rot, this.rot, 12, dt);
      pose(dt, { speed: 0, action: 'idle', fight: { move: mv, ext } });
      // camera off to the side
      const fw = fwdOf(this.rot), rt = rightOf(this.rot);
      const mid = new THREE.Vector3((P.x + b.x) / 2, 1.2, (P.z + b.z) / 2);
      DV.Game.rig.setTrack(mid.clone().addScaledVector(rt, 2.5).addScaledVector(fw, -1.4).add(new THREE.Vector3(0, 0.45, 0)), mid, 8, this.t < 0.05, mid);
      this.hud();
    }
    throwMove(id, onBeat) {
      if (id === 'block') return;
      this.move = CUES[id].move; this.moveT = 0;
      if (onBeat) {
        const b = this.bag, ang = this.rot;
        const k = id === 'kick' ? 0.5 : id === 'cross' ? 0.4 : 0.25;
        b.vx += Math.sin(ang) * k * 0.6; b.vz += Math.cos(ang) * k * 0.6;
        DV.Audio.play('bag_hit', { x: b.x, z: b.z, volume: id === 'jab' ? 0.7 : 1 });
      } else DV.Audio.play('swing', { volume: 0.4 });
    }
    grade(cue, g, pressed) {
      cue.hit = g;
      this.idx++;
      if (cue.id === 'block') {
        if (g) { DV.Audio.play('block', { volume: 0.8 }); }
        else { DV.Audio.play('punch', { volume: 0.6 }); DV.Game.rig.shake = 0.18; const b = this.bag; b.vx -= Math.sin(this.rot) * 0.3; b.vz -= Math.cos(this.rot) * 0.3; }
      } else if (pressed) this.throwMove(pressed, g > 0);
      if (g) { this.combo++; this.best = Math.max(this.best, this.combo); if (g === 3) this.perfect++; S().practice('melee', 0.12); }
      else this.combo = 0;
      this.score += g;
      this.A.announce(g === 3 ? 'PERFECT' : g === 2 ? 'GOOD' : g === 1 ? 'LATE' : pressed ? 'WRONG' : 'MISS', 0.45, g >= 2 ? 'good' : g ? '' : 'bad');
    }
    done() {
      this.ending = true;
      const score = Math.round(this.score / (this.cues.length * 3) * 100);
      this.A.announce(score + ' / 100', 2, score >= 60 ? 'good' : '');
      if (this.o.say) this.o.say(score >= 75 ? 'Good. Now do it with someone hitting back.' : score >= 45 ? 'Your feet are lazy. Your hands will follow them.' : 'You\'re punching the air next to it.', 3);
      this.after(1.5, () => this.A.finish({ score, best: this.best, perfect: this.perfect }));
    }
    hud() {
      const q = (s) => this.h.querySelector(s);
      q('.tr-title').textContent = this.o.practice ? 'THE BAGS · PRACTICE' : 'THE BAGS';
      q('.tr-line').textContent = 'Combo ' + this.combo + ' · Best ' + this.best;
      q('.tr-score').textContent = Math.min(this.idx, this.cues.length) + ' / ' + this.cues.length;
      const cue = this.cues[this.idx];
      const box = q('.bag-cue');
      if (!cue) { box.classList.add('hidden'); return; }
      const dtc = cue.t - this.t;
      box.classList.toggle('hidden', dtc > 1.1);
      const k = U.clamp(dtc / 1.1, 0, 1);
      box.querySelector('.ring').style.transform = 'translate(-50%,-50%) scale(' + (1 + k * 1.6).toFixed(3) + ')';
      box.querySelector('.lab').textContent = CUES[cue.id].label;
      box.querySelector('.key').textContent = CUES[cue.id].key;
      box.className = 'bag-cue ' + cue.id + (dtc < 0.1 ? ' now' : '');
      const nx = this.cues[this.idx + 1];
      q('.bag-next').textContent = nx ? 'next: ' + CUES[nx.id].label : '';
    }
    end() {}
  }

  function nearest(list, P) {
    let best = null, bd = 1e9;
    for (const it of list) {
      const x = it.stand ? it.stand.x : it.x, z = it.stand ? it.stand.z : it.z;
      const d = Math.hypot(x - P.x, z - P.z);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  for (const C of [Range, Knives, Bags]) Object.assign(C.prototype, timers);
  DV.Training = {
    range(o, cb) { DV.Activity.start(new Range(o || {}), cb); },
    knives(o, cb) { DV.Activity.start(new Knives(o || {}), cb); },
    bags(o, cb) { DV.Activity.start(new Bags(o || {}), cb); },
    Range, Knives, Bags,
  };
})();
