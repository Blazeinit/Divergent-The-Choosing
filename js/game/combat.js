/* ==========================================================================
   DIVERGENT — hand-to-hand fighting (Build 3)
   One on one, in a ring, until somebody can't get up. Every attack has a
   wind-up you can read (the tell), a moment where it lands, and a recovery
   where you're open. Block soaks damage and eats stamina; a dodge has a few
   frames where nothing touches you. Hits wear down balance as well as
   health: lose your balance and you stagger, lose it when you're hurt and
   you go down.

   Your attributes are your body: STRENGTH hits harder and takes more,
   AGILITY makes everything quicker and the dodge safer, RESOLVE holds your
   balance and your guard, PERCEPTION lets you read an opponent's tells,
   and the Melee skill grows every time you fight.

     DV.Combat.fight(opts, onDone)
       opts: { opponent: { name, npc?|actor?|model?, app?, stats, ai, x, z },
               ring: { x0, z0, x1, z1 }, start: { player:[x,z], opponent:[x,z] },
               title, allowYield, timeLimit, onEvent(type, data) }
       onDone(result): { winner: 'player'|'opponent'|'draw', how: 'ko'|'yield'|'decision',
                         dealt, taken, landed, thrown, counters, blocked, dodged, knockdowns, time }
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // timings (seconds) at average agility; reach is centre to centre
  const MOVES = {
    jab: { name: 'Jab', windup: 0.12, active: 0.08, recover: 0.22, dmg: 6, poise: 11, stam: 6, reach: 1.22, lunge: 0.2, kind: 'light', chamber: 0.15, hitT: 0.13 },
    cross: { name: 'Cross', windup: 0.3, active: 0.09, recover: 0.36, dmg: 13, poise: 25, stam: 12, reach: 1.22, lunge: 0.36, kind: 'heavy', chamber: 0.45, hitT: 0.34 },
    hook: { name: 'Hook', windup: 0.34, active: 0.1, recover: 0.4, dmg: 15, poise: 28, stam: 14, reach: 1.02, lunge: 0.3, kind: 'heavy', chamber: 0.5, hitT: 0.36 },
    kick: { name: 'Kick', windup: 0.36, active: 0.12, recover: 0.5, dmg: 12, poise: 36, stam: 15, reach: 1.52, lunge: 0.12, kind: 'kick', chamber: 0.45, hitT: 0.4, push: 0.65 },
  };
  const AI_DEFAULT = {
    aggression: 0.55, // how readily they open up
    reaction: 0.3, // seconds to read your wind-up
    block: 0.4, // chance to block what they read
    dodge: 0.2, // chance to slip it instead
    punish: 0.55, // chance to hit you while you're open
    feint: 0.08,
    guard: 0.35, // how much of the time they keep a guard up when you're close
    range: 1.08,
    combos: [['jab'], ['jab', 'jab'], ['jab', 'cross'], ['cross'], ['jab', 'hook'], ['kick']],
    weights: null,
    style: 'balanced',
  };
  const FREE = { idle: 1, block: 1 };

  class Fighter {
    constructor(o) {
      this.name = o.name || '';
      this.isPlayer = !!o.isPlayer;
      this.model = o.model;
      this.x = o.x; this.z = o.z; this.rot = o.rot || 0;
      this.st = Object.assign({ strength: 4, agility: 4, resolve: 4, perception: 4, melee: 25 }, o.stats || {});
      this.hpMax = Math.round(100 + this.st.strength * 4 + this.st.resolve * 4);
      this.hp = this.hpMax;
      this.hpTrail = this.hpMax;
      this.stam = o.stamina !== undefined ? o.stamina : 100;
      this.poise = 100;
      this.state = 'idle';
      this.t = 0;
      this.dur = 0;
      this.move = null; this.moveId = null; this.phase = null; this.serial = 0;
      this.hitDone = false; this.whiffed = false; this.connected = false;
      this.vx = 0; this.vz = 0; this.speed = 0; this.strafe = 0;
      this.ext = 0; this.side = 1; this.inv = 0; this.flash = 0;
      this.dodgeDir = [0, 0];
      this.exhausted = false;
      this.ai = o.ai ? Object.assign({}, AI_DEFAULT, o.ai) : null;
      if (this.ai) Object.assign(this.ai, { cool: 0.8, queue: [], reactIn: null, react: null, seen: -1, strafeDir: Math.random() < 0.5 ? 1 : -1, strafeT: 0, blockT: 0, guardT: 0, guardRoll: 0.6, recent: [], counterIn: null, wasHit: false });
      this.s = { dealt: 0, taken: 0, landed: 0, thrown: 0, counters: 0, blocked: 0, dodged: 0, knockdowns: 0 };
      this.downs = 0;
    }
    // STR and the Melee skill hit harder; RESOLVE takes it better; AGILITY is quicker
    get dmgMul() { return 0.74 + this.st.strength * 0.052 + (this.st.melee || 20) / 420; }
    get armor() { return U.clamp(1.1 - this.st.resolve * 0.022, 0.84, 1.06); }
    get quick() { return U.clamp(1.12 - this.st.agility * 0.026, 0.82, 1.1) * (this.exhausted ? 1.25 : 1); }
    get footSpeed() { return (1.45 + this.st.agility * 0.055) * (this.exhausted ? 0.75 : 1); }
    get busy() { return !FREE[this.state]; }
    get down() { return this.state === 'down' || this.state === 'ko'; }
    useStam(n) {
      this.stam = Math.max(0, this.stam - n);
      if (this.stam <= 0.5) this.exhausted = true;
    }
  }

  const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
  const facing = (a, b) => { const yaw = U.yawTo(a.x, a.z, b.x, b.z); return Math.cos(U.wrapAngle(yaw - a.rot)); };

  /* ------------------------------ the fight ------------------------------ */
  class Fight {
    constructor(opts) {
      this.id = 'fight';
      this.opts = opts;
      this.events = [];
      this.time = 0;
      this.over = null;
      this.camYaw = 0.72;
      this.yieldT = 0;
      this.buffer = null;
      this.tellT = 0;
    }
    begin(A) {
      const o = this.opts, P = DV.Player, zone = DV.World.current;
      this.A = A;
      this.zone = zone;
      this.ring = o.ring;
      const S = DV.Stats;
      const sp = (o.start && o.start.player) || [P.x, P.z];
      const so = (o.start && o.start.opponent) || [P.x, P.z + 2];
      this.me = new Fighter({
        name: DV.State.data.story && DV.State.data.story.dauntlessName ? DV.State.data.story.dauntlessName : DV.State.data.player.name,
        isPlayer: true, model: P.model, x: sp[0], z: sp[1],
        stats: { strength: S.attr('strength'), agility: S.attr('agility'), resolve: S.attr('resolve'), perception: S.attr('perception'), melee: S.skill('melee') },
        stamina: Math.max(60, P.stamina),
      });
      // the opponent: an NPC from the district, a chapter actor, or a model made for the fight
      const op = o.opponent;
      this.opNpc = op.npc || null;
      this.opActor = op.actor || null;
      let model = op.model || (this.opNpc && this.opNpc.ensureModel(DV.Game.scene)) || (this.opActor && this.opActor.model);
      this.ownModel = false;
      if (!model) { model = DV.Character.create(op.app); DV.Game.scene.add(model.root); this.ownModel = true; }
      if (this.opNpc) { this.opNpc.activity = true; DV.NPCAI.releaseSpot(this.opNpc); }
      if (this.opActor) this.opActor.activity = true;
      model.root.visible = true;
      this.them = new Fighter({ name: op.name, model, x: so[0], z: so[1], stats: op.stats, ai: op.ai || {} });
      this.me.rot = U.yawTo(sp[0], sp[1], so[0], so[1]);
      this.them.rot = U.yawTo(so[0], so[1], sp[0], sp[1]);
      this.fighters = [this.me, this.them];
      // the camera starts behind your shoulder
      this.placeCamera(0, true);
      this.buildHUD(A);
      this.state = 'intro';
      this.introT = 0;
      A.announce(o.title || 'FIGHT', 1.6);
      DV.Audio.play('bell', { volume: 0.9 });
      this.emit('start');
    }
    emit(type, data) { if (this.opts.onEvent) { try { this.opts.onEvent(type, data || {}, this); } catch (e) { console.error(e); } } }

    /* ---------------- HUD ---------------- */
    buildHUD(A) {
      const h = U.el('div', 'fight-hud', null, A.hud);
      h.innerHTML =
        '<div class="fh-side me"><div class="fh-name"></div><div class="fh-bar hp"><b></b><i></i></div><div class="fh-bar st"><i></i></div></div>' +
        '<div class="fh-mid"><div class="fh-clock"></div></div>' +
        '<div class="fh-side them"><div class="fh-name"></div><div class="fh-bar hp"><b></b><i></i></div><div class="fh-tell"></div></div>' +
        '<div class="fh-yield hidden"><div class="lbl">Yielding…</div><div class="fh-bar"><i></i></div></div>';
      h.querySelector('.me .fh-name').textContent = this.me.name;
      h.querySelector('.them .fh-name').textContent = this.them.name;
      this.hud = h;
      this.q = (s) => h.querySelector(s);
      A.keys('<b>LMB</b> Jab · <b>RMB</b> Cross · <b>F</b> Kick · hold <b>Shift</b> Block · <b>Space</b>+dir Dodge' + (this.opts.allowYield !== false ? ' · hold <b>Q</b> Yield' : ''));
    }
    updateHUD() {
      const me = this.me, th = this.them;
      for (const [f, sel] of [[me, '.me'], [th, '.them']]) {
        f.hpTrail = Math.max(f.hp, f.hpTrail - (f.hpTrail > f.hp ? 0.45 : 0));
        this.q(sel + ' .hp i').style.width = U.clamp(f.hp / f.hpMax * 100, 0, 100) + '%';
        this.q(sel + ' .hp b').style.width = U.clamp(f.hpTrail / f.hpMax * 100, 0, 100) + '%';
      }
      const st = this.q('.me .st i');
      st.style.width = U.clamp(me.stam, 0, 100) + '%';
      st.parentNode.classList.toggle('out', me.exhausted);
      const lim = this.opts.timeLimit || 150;
      const left = Math.max(0, lim - this.time);
      this.q('.fh-clock').textContent = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
      const y = this.q('.fh-yield');
      y.classList.toggle('hidden', this.yieldT <= 0);
      if (this.yieldT > 0) y.querySelector('i').style.width = Math.min(100, this.yieldT / 1.3 * 100) + '%';
      const tell = this.q('.fh-tell');
      tell.classList.toggle('on', this.tellT > 0);
    }
    // PERCEPTION reads the tell: what's coming, while it's still coming
    tell(f) {
      if (f.isPlayer) return;
      const per = this.me.st.perception;
      const need = f.move.kind === 'light' ? 7 : 4;
      if (per < need) return;
      const el = this.q('.fh-tell');
      el.textContent = (f.move.kind === 'kick' ? '▼ ' : f.move.kind === 'heavy' ? '◆ ' : '· ') + f.move.name.toUpperCase();
      el.className = 'fh-tell on ' + f.move.kind;
      this.tellT = f.dur + 0.1;
    }

    /* ---------------- per frame ---------------- */
    update(dt, input, A) {
      const me = this.me, th = this.them;
      if (this.state === 'intro') {
        this.introT += dt;
        input.takeMouse();
        if (this.introT > 1.1) this.state = 'fight';
      } else if (this.state === 'fight') {
        this.time += dt;
        this.playerInput(dt, input);
        this.aiThink(th, me, dt);
        // time's up: the instructor calls it on who did more damage
        if (this.time >= (this.opts.timeLimit || 150)) this.finishFight(me.s.dealt > th.s.dealt * 1.1 ? 'player' : th.s.dealt > me.s.dealt * 1.1 ? 'opponent' : 'draw', 'decision');
      } else if (this.state === 'outro') {
        this.outroT += dt;
        input.takeMouse();
        if (this.outroT > 2.6) { A.finish(this.result()); return; }
      }
      this.tickTimers(dt);
      for (const f of this.fighters) this.step(f, dt);
      this.separate();
      this.tellT -= dt;
      for (const f of this.fighters) this.animate(f, dt);
      this.placeCamera(dt, false);
      this.updateHUD();
      DV.Player.stamina = me.stam;
    }

    playerInput(dt, input) {
      const me = this.me, th = this.them;
      // footwork relative to the opponent
      const f = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
      const r = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
      me.want = [f, r];
      // the camera can be nudged round a little with the mouse
      const [mx] = input.takeMouse();
      input.takeWheel();
      if (mx) this.camYaw = U.clamp(this.camYaw - mx * 0.0022 * DV.Settings.get('mouseSensitivity'), -1.4, 1.6);
      // block (held)
      me.blockHeld = input.down('ShiftLeft') || input.down('ShiftRight');
      // attacks (buffered briefly so a press during a recovery isn't lost)
      if (input.consume('MouseLeft') || input.consume('KeyJ')) this.buffer = { id: 'jab', t: 0.28 };
      if (input.consume('MouseRight') || input.consume('KeyK')) this.buffer = { id: 'cross', t: 0.28 };
      if (input.consume('KeyF') || input.consume('KeyL')) this.buffer = { id: 'kick', t: 0.28 };
      if (input.consume('Space')) {
        const dir = r ? [0, r] : f > 0 ? [0, Math.random() < 0.5 ? 1 : -1] : [-1, 0];
        this.buffer = { id: 'dodge', dir, t: 0.2 };
      }
      if (this.buffer) {
        this.buffer.t -= dt;
        if (this.buffer.t <= 0) this.buffer = null;
        else if (this.canAct(me, this.buffer.id)) {
          const b = this.buffer;
          if (b.id === 'dodge' ? this.dodge(me, b.dir) : this.attack(me, b.id)) this.buffer = null;
        }
      }
      // yield: hold Q
      if (this.opts.allowYield !== false && input.down('KeyQ') && !me.down) {
        this.yieldT += dt;
        if (this.yieldT >= 1.3) this.finishFight('opponent', 'yield');
      } else this.yieldT = Math.max(0, this.yieldT - dt * 3);
    }
    // free to start something new — or, after a punch that landed, cancelling the tail of its
    // recovery into a *different* one (jab, cross: a combination; jab, jab, jab: no)
    canAct(f, next) {
      if (f.state === 'idle' || f.state === 'block') return true;
      return f.state === 'attack' && f.phase === 'recover' && f.connected && next !== f.moveId && next !== 'dodge' && f.t > f.dur * 0.35;
    }

    /* ---------------- moves ---------------- */
    attack(f, id) {
      const mv = MOVES[id];
      if (!mv) return false;
      if (f.exhausted && mv.kind !== 'light') return false;
      if (f.stam < mv.stam * 0.5) return false;
      f.useStam(mv.stam);
      f.state = 'attack'; f.move = mv; f.moveId = id; f.phase = 'windup'; f.t = 0; f.dur = mv.windup * f.quick;
      f.hitDone = false; f.whiffed = false; f.connected = false; f.serial++;
      f.s.thrown++;
      if (mv.kind !== 'light') DV.Audio.play('scuff', { x: f.x, z: f.z, volume: 0.6 });
      this.tell(f);
      return true;
    }
    dodge(f, dir) {
      if (f.exhausted || f.stam < 8) return false;
      f.useStam(11);
      f.state = 'dodge'; f.t = 0; f.dur = 0.34;
      f.dodgeDir = dir; // [forward, right] in the fighter's frame
      f.side = dir[1] || 0;
      f.inv = 0.2 + f.st.agility * 0.009;
      DV.Audio.play('scuff', { x: f.x, z: f.z, volume: 0.8 });
      return true;
    }
    setState(f, s, dur) { f.state = s; f.t = 0; f.dur = dur; f.move = null; f.phase = null; }

    step(f, dt) {
      const other = f === this.me ? this.them : this.me;
      f.t += dt;
      f.inv = Math.max(0, f.inv - dt);
      f.flash = Math.max(0, f.flash - dt);
      let mvx = 0, mvz = 0, moveSpd = 0;
      // stamina: back slowly while you keep moving, quicker standing off, none while swinging
      if (f.state === 'idle') f.stam = Math.min(100, f.stam + (f.speed > 0.2 ? 11 : 16) * dt);
      else if (f.state === 'block') f.stam = Math.min(100, f.stam + 5 * dt);
      if (f.exhausted && f.stam > 32) f.exhausted = false;
      f.poise = Math.min(100, f.poise + (6 + f.st.resolve * 1.2) * dt * (f.state === 'idle' || f.state === 'block' ? 1 : 0.3));
      switch (f.state) {
        case 'idle':
        case 'block': {
          // footwork (both): f.want = [forward, right]
          const w = f.want || [0, 0];
          if (w[0] || w[1]) {
            const yaw = U.yawTo(f.x, f.z, other.x, other.z);
            const fx = Math.sin(yaw), fz = Math.cos(yaw);
            mvx = fx * w[0] - fz * w[1];
            mvz = fz * w[0] + fx * w[1];
            const l = Math.hypot(mvx, mvz); mvx /= l; mvz /= l;
            moveSpd = f.footSpeed * (f.state === 'block' ? 0.5 : 1) * (w[0] < 0 ? 0.85 : 1);
          }
          f.strafe = w[1] || 0;
          if (f.state === 'idle' && f.blockHeld && !f.exhausted) { f.state = 'block'; f.t = 0; }
          else if (f.state === 'block' && (!f.blockHeld || f.exhausted)) { f.state = 'idle'; f.t = 0; }
          break;
        }
        case 'attack': {
          const mv = f.move;
          if (f.phase === 'windup' && f.t >= f.dur) { f.phase = 'active'; f.t = 0; f.dur = mv.active; DV.Audio.play('swing', { x: f.x, z: f.z, volume: mv.kind === 'light' ? 0.5 : 0.8 }); }
          else if (f.phase === 'active') {
            // drive in behind it
            const l = mv.lunge / mv.active * dt;
            mvx = Math.sin(f.rot); mvz = Math.cos(f.rot); moveSpd = l / Math.max(dt, 1e-4);
            if (!f.hitDone) this.tryHit(f, other);
            if (f.t >= f.dur) {
              if (!f.hitDone) { f.whiffed = true; f.hitDone = true; }
              f.phase = 'recover'; f.t = 0; f.dur = mv.recover * f.quick * (f.whiffed ? 1.25 : 1) + (f.blockedBy ? 0.12 : 0);
              f.blockedBy = false;
            }
          } else if (f.phase === 'recover' && f.t >= f.dur) {
            f.state = 'idle'; f.t = 0; f.move = null; f.phase = null;
          }
          break;
        }
        case 'dodge': {
          const k = 1 - f.t / f.dur;
          const yaw = f.rot, fx = Math.sin(yaw), fz = Math.cos(yaw);
          const d = f.dodgeDir;
          mvx = fx * d[0] - fz * d[1]; mvz = fz * d[0] + fx * d[1];
          const l = Math.hypot(mvx, mvz) || 1; mvx /= l; mvz /= l;
          moveSpd = 4.6 * Math.max(0, k) * (d[1] ? 1 : 0.85);
          if (f.t >= f.dur) this.setState(f, 'idle', 0);
          break;
        }
        case 'hit':
          if (f.push) { mvx = f.push[0]; mvz = f.push[1]; moveSpd = f.push[2] * Math.max(0, 1 - f.t / f.dur) * 2.4; }
          if (f.t >= f.dur) { f.push = null; this.setState(f, 'idle', 0); }
          break;
        case 'stagger':
          if (f.t >= f.dur) { f.poise = 70; this.setState(f, 'idle', 0); }
          break;
        case 'down':
          if (f.t >= f.dur) { this.setState(f, 'getup', 0.8); }
          break;
        case 'getup':
          if (f.t >= f.dur) { f.poise = 100; this.setState(f, 'idle', 0); f.inv = 0.4; }
          break;
        case 'ko':
        case 'win':
          break;
      }
      // move, smoothed
      const a = 1 - Math.exp(-14 * dt);
      f.vx += (mvx * moveSpd - f.vx) * a;
      f.vz += (mvz * moveSpd - f.vz) * a;
      if (f.down) { f.vx *= 0.8; f.vz *= 0.8; }
      let nx = f.x + f.vx * dt, nz = f.z + f.vz * dt;
      const R = this.ring;
      if (R) { nx = U.clamp(nx, R.x0 + 0.4, R.x1 - 0.4); nz = U.clamp(nz, R.z0 + 0.4, R.z1 - 0.4); }
      if (this.zone) [nx, nz] = this.zone.colliders.resolveCircle(nx, nz, 0.3, f.isPlayer ? 'player' : 'npc', 0);
      f.speed = Math.hypot(nx - f.x, nz - f.z) / Math.max(dt, 1e-4);
      f.x = nx; f.z = nz;
      // keep squared up to the other one (committed while swinging)
      if (!f.down && f.state !== 'win') {
        const want = U.yawTo(f.x, f.z, other.x, other.z);
        const rate = f.state === 'attack' && f.phase !== 'windup' ? 2.5 : f.state === 'stagger' ? 2 : 11;
        f.rot = U.dampAngle(f.rot, want, rate, dt);
      }
    }
    separate() {
      const a = this.me, b = this.them;
      if (a.down || b.down) return;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = 0.7;
      if (d < min && d > 1e-4) {
        const push = (min - d) / 2;
        a.x -= dx / d * push; a.z -= dz / d * push;
        b.x += dx / d * push; b.z += dz / d * push;
      }
    }

    tryHit(att, def) {
      const mv = att.move;
      if (def.down || def.state === 'win') return;
      const d = dist(att, def);
      if (d > mv.reach + 0.05) return;
      if (facing(att, def) < 0.55) return;
      att.hitDone = true;
      const away = [(def.x - att.x) / (d || 1), (def.z - att.z) / (d || 1)];
      // slipped it
      if (def.inv > 0) {
        att.whiffed = true;
        def.s.dodged++;
        DV.Audio.play('whiff', { x: def.x, z: def.z });
        if (def.isPlayer) DV.Stats.practice('athletics', 0.3);
        this.emit('dodge', { by: def });
        return;
      }
      // blocked (facing the hit)
      if (def.state === 'block' && facing(def, att) > 0.3) {
        const chip = mv.kind === 'light' ? 0.1 : mv.kind === 'heavy' ? 0.22 : 0.3;
        const raw = mv.dmg * att.dmgMul;
        this.damage(att, def, raw * chip);
        // a guard shrugs off jabs, feels a cross, and a kick is what breaks it
        def.useStam(raw * (mv.kind === 'light' ? 0.55 : mv.kind === 'heavy' ? 1.25 : 2.6) * U.clamp(1.2 - def.st.resolve * 0.035, 0.75, 1.15));
        def.s.blocked++;
        att.connected = true;
        att.blockedBy = true; // (their recovery runs long: the defender gets a beat to answer)
        if (def.ai && Math.random() < def.ai.punish) def.ai.counterIn = U.rand(0.05, 0.14);
        DV.Audio.play('block', { x: def.x, z: def.z, volume: mv.kind === 'light' ? 0.7 : 1 });
        if (def.isPlayer) DV.Stats.practice('melee', 0.15);
        if (def.exhausted) {
          // the guard caves in
          this.setState(def, 'stagger', 1.1);
          DV.Audio.play('punch_heavy', { x: def.x, z: def.z, volume: 0.7 });
          this.A.announce('GUARD BROKEN', 1.1, def.isPlayer ? 'bad' : '');
          this.emit('guardbreak', { def });
        } else {
          def.push = [away[0], away[1], mv.kind === 'kick' ? 0.5 : 0.12];
          def.vx += away[0] * (mv.kind === 'kick' ? 2.2 : 0.7); def.vz += away[1] * (mv.kind === 'kick' ? 2.2 : 0.7);
        }
        this.emit('block', { att, def });
        return;
      }
      // a clean hit — worth more if they were winding up something of their own
      const counter = def.state === 'attack' && def.phase === 'windup';
      const dmg = mv.dmg * att.dmgMul * def.armor * (counter ? 1.4 : 1) * (att.exhausted ? 0.7 : 1) * U.rand(0.9, 1.1);
      this.damage(att, def, dmg);
      att.connected = true;
      att.s.landed++;
      if (counter) { att.s.counters++; if (att.isPlayer) this.A.announce('COUNTER', 0.8, 'good'); }
      def.poise -= mv.poise * (counter ? 1.5 : 1) * U.clamp(1.15 - def.st.resolve * 0.03, 0.8, 1.1);
      def.flash = 0.16;
      def.side = Math.random() < 0.5 ? 1 : -1;
      const heavy = mv.kind !== 'light';
      DV.Audio.play(heavy ? 'punch_heavy' : 'punch', { x: def.x, z: def.z });
      if (heavy || counter) { this.A.freeze(0.07); DV.Game.rig.shake = Math.max(DV.Game.rig.shake, def.isPlayer ? 0.3 : 0.16); }
      else this.A.freeze(0.035);
      if (att.isPlayer) DV.Stats.practice('melee', heavy ? 0.5 : 0.3);
      this.emit('hit', { att, def, dmg, heavy, counter });
      if (def.hp <= 0) { this.knockout(def, att); return; }
      if (def.poise <= 0) {
        if (def.hp < def.hpMax * 0.45 || def.downs > 0 && def.hp < def.hpMax * 0.6) this.knockdown(def, away);
        else { this.setState(def, 'stagger', 0.9); this.emit('stagger', { def }); if (def.isPlayer) this.A.announce('STAGGERED', 0.9, 'bad'); }
        return;
      }
      // flinch (a heavy hit knocks you back a step)
      this.setState(def, 'hit', mv.hitT);
      def.push = [away[0], away[1], mv.push || (heavy ? 0.3 : 0.12)];
    }
    damage(att, def, n) {
      def.hp = Math.max(0, def.hp - n);
      att.s.dealt += n;
      def.s.taken += n;
    }
    knockdown(def, away) {
      def.downs++;
      def.s.knockdowns++;
      this.setState(def, 'down', 2.0 + def.downs * 0.4);
      def.poise = 100;
      def.vx = away[0] * 2.5; def.vz = away[1] * 2.5;
      DV.Audio.play('land', { x: def.x, z: def.z, volume: 1 });
      this.A.announce(def.isPlayer ? 'YOU\'RE DOWN' : 'KNOCKDOWN', 1.4, def.isPlayer ? 'bad' : 'good');
      this.emit('knockdown', { def });
      // three times down and the instructor stops it
      if (def.downs >= 3) this.after(1.2, () => this.finishFight(def.isPlayer ? 'opponent' : 'player', 'ko'));
    }
    knockout(def, att) {
      this.setState(def, 'ko', 99);
      def.vx *= 0.3; def.vz *= 0.3;
      DV.Audio.play('land', { x: def.x, z: def.z, volume: 1 });
      this.A.freeze(0.16);
      DV.Game.rig.shake = 0.35;
      this.emit('ko', { def, att });
      this.finishFight(def.isPlayer ? 'opponent' : 'player', 'ko');
    }
    // game-time timers (they stop when the game is paused)
    after(t, fn) { (this.timers || (this.timers = [])).push({ t, fn }); }
    tickTimers(dt) {
      if (!this.timers || !this.timers.length) return;
      const due = [];
      this.timers = this.timers.filter((x) => ((x.t -= dt) > 0 ? true : (due.push(x), false)));
      for (const x of due) x.fn();
    }

    result() {
      const s = this.me.s;
      return Object.assign({ winner: this.over.winner, how: this.over.how, time: Math.round(this.time), hpLeft: Math.round(this.me.hp), opponentHpLeft: Math.round(this.them.hp) }, {
        dealt: Math.round(s.dealt), taken: Math.round(s.taken), landed: s.landed, thrown: s.thrown, counters: s.counters, blocked: s.blocked, dodged: s.dodged, knockdowns: this.them.s.knockdowns, wentDown: s.knockdowns,
      });
    }

    /* ---------------- the opponent ---------------- */
    aiThink(F, P, dt) {
      const ai = F.ai;
      if (!ai) return;
      F.want = [0, 0];
      F.blockHeld = false;
      // remember how often you've been swinging (the last four seconds)
      if (P.state === 'attack' && P.phase === 'windup' && P.serial !== ai.seenAtk) { ai.seenAtk = P.serial; ai.recent.push(this.time); }
      while (ai.recent.length && this.time - ai.recent[0] > 4) ai.recent.shift();
      const spam = ai.recent.length >= 5;
      if (F.down || F.state === 'stagger') { ai.queue.length = 0; ai.reactIn = null; ai.counterIn = null; return; }
      if (F.state === 'hit') { ai.wasHit = true; ai.queue.length = 0; return; }
      const d = dist(F, P);
      ai.cool -= dt; ai.blockT -= dt; ai.strafeT -= dt; ai.guardT -= dt; ai.guardRoll -= dt;
      const hurt = F.hp / F.hpMax;
      // just got hit: cover up, or fire straight back
      if (ai.wasHit) {
        ai.wasHit = false;
        const r = Math.random();
        if (r < ai.guard + 0.25 + (spam ? 0.25 : 0)) ai.blockT = U.rand(0.45, 0.9);
        else if (r < ai.guard + 0.25 + ai.punish * 0.5 && d < 1.3) ai.counterIn = 0.02;
      }
      // 1. read the wind-up of a big one (a jab is too quick to read; that's what the guard is for)
      if (P.state === 'attack' && P.phase === 'windup' && P.serial !== ai.seen) {
        ai.seen = P.serial;
        const rnd = Math.random(), tired = F.exhausted ? 0.5 : 1, light = P.move.kind === 'light';
        const bl = ai.block * tired * (light ? 0.6 : 1) + (spam ? 0.2 : 0);
        const dg = ai.dodge * tired * (light ? 0.4 : 1);
        ai.react = rnd < bl ? 'block' : rnd < bl + dg ? 'dodge' : null;
        ai.reactIn = ai.react ? ai.reaction * U.rand(0.7, 1.25) * (light ? 0.6 : 1) : null;
      }
      if (ai.reactIn !== null) {
        ai.reactIn -= dt;
        if (ai.reactIn <= 0) {
          const live = P.state === 'attack' && P.phase !== 'recover';
          if (live && (F.state === 'idle' || F.state === 'block')) {
            if (ai.react === 'block') ai.blockT = Math.max(ai.blockT, 0.4);
            else if (ai.react === 'dodge') this.dodge(F, [d < 1.0 ? -1 : 0, Math.random() < 0.5 ? 1 : -1]);
          }
          ai.reactIn = null;
        }
      }
      if (F.state === 'attack' || F.state === 'dodge') {
        // feint: start a big one and pull out of it to draw a reaction
        if (F.state === 'attack' && F.phase === 'windup' && F.feinting && F.t > F.dur * 0.6) { F.feinting = false; this.setState(F, 'idle', 0); ai.cool = 0.15; }
        return;
      }
      // the quickest punch that will land before the player can move again
      const answer = () => {
        const left = P.state === 'attack' && P.phase === 'recover' ? P.dur - P.t : P.state === 'hit' || P.state === 'stagger' ? P.dur - P.t : 0;
        return left > MOVES.cross.windup * F.quick + 0.03 && !F.exhausted ? 'cross' : 'jab';
      };
      // 2. answer: you swung into their guard, or left yourself open
      if (ai.counterIn !== null) {
        ai.counterIn -= dt;
        if (ai.counterIn <= 0) {
          ai.counterIn = null;
          if (d < 1.3 && this.attack(F, answer())) { ai.blockT = 0; ai.queue = Math.random() < 0.4 ? ['jab'] : []; return; }
        }
      }
      // 3. carry on a combination
      if (ai.queue.length && ai.blockT <= 0) {
        const id = ai.queue.shift();
        if (d < MOVES[id].reach + 0.25 && this.attack(F, id)) return;
        ai.queue.length = 0;
      }
      // 4. punish an opening
      const open = (P.state === 'attack' && P.phase === 'recover' && P.whiffed) || P.state === 'stagger' || P.state === 'getup' || P.exhausted;
      if (open && d < 1.3 && ai.blockT <= 0.15 && Math.random() < ai.punish * dt * 7) {
        if (this.attack(F, P.exhausted && !F.exhausted ? 'cross' : answer())) { ai.queue = Math.random() < 0.5 ? ['jab'] : []; return; }
      }
      // 5. hold the guard (and don't drop it with a punch on its way in)
      const incoming = P.state === 'attack' && P.phase !== 'recover' && d < P.move.reach + 0.3;
      if (F.state === 'block' && incoming && ai.blockT < 0.12) ai.blockT = 0.12;
      if (ai.blockT > 0 && !F.exhausted) {
        F.blockHeld = true;
        if (F.state === 'idle') { F.state = 'block'; F.t = 0; }
        F.want = [d > ai.range + 0.4 ? 1 : 0, ai.strafeDir * 0.5];
        return;
      }
      if (ai.guardRoll <= 0) {
        ai.guardRoll = U.rand(0.6, 1.4);
        if (d < 1.7 && Math.random() < ai.guard + (spam ? 0.3 : 0) + (hurt < 0.4 ? 0.1 : 0)) ai.blockT = U.rand(0.5, 1.2);
      }
      // 6. open up when in range
      const wantRange = ai.range * (hurt < 0.35 && ai.style !== 'brawler' ? 1.25 : 1);
      // (against someone swinging non-stop, a smart fighter covers up and answers instead of trading)
      const trade = !spam || ai.style === 'brawler' || Math.random() < 0.25;
      if (trade && ai.cool <= 0 && d < 1.5 && F.stam > 18 && !incoming && Math.random() < ai.aggression * dt * 2.6 * (hurt < 0.3 && ai.style === 'cautious' ? 0.5 : 1)) {
        let combo = U.pick(ai.combos);
        if (P.state === 'block' && Math.random() < 0.5) combo = Math.random() < 0.6 ? ['kick'] : ['jab', 'kick']; // a turtle gets kicked
        if (F.exhausted) combo = ['jab'];
        ai.queue = combo.slice();
        const first = ai.queue.shift();
        if (d < MOVES[first].reach + 0.12 && this.attack(F, first)) {
          if (MOVES[first].kind !== 'light' && Math.random() < ai.feint) F.feinting = true;
          ai.cool = U.rand(0.35, 0.9);
          return;
        }
        ai.queue.length = 0;
        ai.cool = 0.2;
      }
      // 7. footwork: hold the range they like, circle, back off when tired
      let fw = 0;
      if (d > wantRange + 0.3) fw = 1;
      else if (d < wantRange - 0.25 || (F.stam < 25 && d < 1.6)) fw = -1;
      if (ai.strafeT <= 0) { ai.strafeT = U.rand(0.8, 2.4); ai.strafeDir = Math.random() < 0.25 ? 0 : Math.random() < 0.5 ? 1 : -1; }
      // don't get backed onto the ropes: circle off them
      const R = this.ring;
      if (R && fw < 0) {
        const bx = F.x - (P.x - F.x) * 0.6, bz = F.z - (P.z - F.z) * 0.6;
        if (bx < R.x0 + 0.8 || bx > R.x1 - 0.8 || bz < R.z0 + 0.8 || bz > R.z1 - 0.8) { fw = 0; if (!ai.strafeDir) ai.strafeDir = 1; }
      }
      F.want = [fw, ai.strafeDir];
    }

    /* ---------------- presentation ---------------- */
    animate(f, dt) {
      const m = f.model;
      m.root.position.set(f.x, 0, f.z);
      m.root.rotation.y = f.rot;
      let move = 'stance', ext = 0;
      switch (f.state) {
        case 'attack': {
          move = f.moveId;
          const mv = f.move;
          if (f.phase === 'windup') ext = -mv.chamber * U.clamp(f.t / Math.max(f.dur, 1e-3), 0, 1) - 0.05;
          else if (f.phase === 'active') ext = 1;
          else ext = 1 - U.clamp(f.t / Math.max(f.dur, 1e-3), 0, 1);
          break;
        }
        case 'block': move = 'block'; break;
        case 'dodge': move = 'dodge'; ext = Math.sin(Math.PI * U.clamp(f.t / f.dur, 0, 1)); break;
        case 'hit': move = 'hit'; ext = 1 - U.clamp(f.t / f.dur, 0, 1) * 0.8; break;
        case 'stagger': move = 'stagger'; break;
        case 'getup': move = 'getup'; ext = U.clamp(f.t / f.dur, 0, 1); break;
        case 'win': move = 'win'; break;
      }
      const lying = f.state === 'down' || f.state === 'ko';
      // the world's light on them, plus a red flash when they're hit
      const L = this.zone ? this.zone.lightAt(f.x, f.z) : [1, 1, 1];
      const fl = f.flash > 0 ? f.flash / 0.16 : 0;
      m.setTint(U.clamp(L[0] * 0.9, 0.3, 1.3) + fl * 0.8, U.clamp(L[1] * 0.9, 0.3, 1.3) - fl * 0.2, U.clamp(L[2] * 0.9, 0.3, 1.3) - fl * 0.2);
      m.animate(dt, { speed: lying ? 0 : f.speed, strafe: f.strafe, action: lying ? 'lie' : 'idle', seatY: 0.02, fight: lying ? null : { move, ext, side: f.side } });
    }
    placeCamera(dt, instant) {
      const me = this.me, th = this.them;
      // from them, past your shoulder and well off to the side, so you can see both of you
      const yaw = U.yawTo(th.x, th.z, me.x, me.z) + this.camYaw;
      const sep = Math.hypot(th.x - me.x, th.z - me.z);
      const dist = 3.0 + Math.min(1.4, Math.max(0, sep - 1.1) * 0.7);
      const pos = new THREE.Vector3(me.x + Math.sin(yaw) * dist, 2.05, me.z + Math.cos(yaw) * dist);
      const look = new THREE.Vector3(me.x * 0.38 + th.x * 0.62, 1.05, me.z * 0.38 + th.z * 0.62);
      DV.Game.rig.setTrack(pos, look, 6, instant, new THREE.Vector3(me.x, 1.5, me.z));
      // ease the nudge back toward the default angle
      if (!instant) this.camYaw += (0.72 - this.camYaw) * Math.min(1, dt * 0.6);
    }

  }
  Fight.prototype.finishFight = function (winner, how) {
    if (this.state !== 'fight') return;
    this.state = 'outro';
    this.outroT = 0;
    this.over = { winner, how };
    const me = this.me, th = this.them;
    const w = winner === 'player' ? me : winner === 'opponent' ? th : null;
    if (w && !w.down) { w.state = 'win'; w.t = 0; w.move = null; }
    for (const f of this.fighters) if (f !== w && !f.down) { f.state = 'idle'; f.t = 0; f.move = null; }
    DV.Audio.play('bell', { volume: 0.9 });
    this.A.announce(how === 'yield' ? 'YIELDED' : how === 'decision' ? (winner === 'draw' ? 'DRAW' : winner === 'player' ? 'YOU TAKE IT' : 'THEY TAKE IT') : winner === 'player' ? 'YOU WIN' : 'KNOCKED OUT', 2.2, winner === 'player' ? 'good' : 'bad');
    if (winner === 'player') DV.Stats.practice('melee', 2);
    this.emit('end', this.over);
  };
  // DV.Activity calls end(A) when it cleans up: hand the fighters back
  Fight.prototype.end = function () { this.release(); };
  Fight.prototype.release = function () {
    const P = DV.Player, me = this.me, th = this.them;
    if (!me) return;
    P.x = me.x; P.z = me.z; P.rot = me.rot; P.vx = P.vz = 0;
    P.lastSafe = [P.x, P.z];
    P.syncModel();
    if (this.opNpc) {
      const n = this.opNpc;
      n.activity = false;
      n.x = th.x; n.z = th.z; n.rot = th.rot;
      n.mode = 'acting'; n.action = th.state === 'ko' ? 'crouch' : 'idle';
      n.taskKey = null;
    }
    if (this.opActor) { const a = this.opActor; a.activity = false; a.x = th.x; a.z = th.z; a.rot = th.rot; a.sync(); }
    if (this.ownModel) th.model.dispose();
    P.model.setTint(1, 1, 1);
  };

  DV.Combat = {
    MOVES,
    Fighter,
    Fight,
    fight(opts, onDone) {
      const f = new Fight(opts);
      DV.Activity.start(f, onDone);
      return f;
    },
    // opponents' fighting styles, built from who they are
    styles: {
      brawler: { aggression: 0.75, reaction: 0.36, block: 0.2, dodge: 0.1, punish: 0.5, feint: 0.02, guard: 0.15, range: 1.0, combos: [['cross'], ['hook'], ['jab', 'hook'], ['cross', 'hook'], ['kick']], style: 'brawler' },
      boxer: { aggression: 0.6, reaction: 0.26, block: 0.45, dodge: 0.25, punish: 0.7, feint: 0.12, guard: 0.38, range: 1.1, combos: [['jab'], ['jab', 'jab'], ['jab', 'cross'], ['jab', 'jab', 'cross'], ['jab', 'hook']], style: 'boxer' },
      cautious: { aggression: 0.35, reaction: 0.3, block: 0.55, dodge: 0.2, punish: 0.6, feint: 0.05, guard: 0.55, range: 1.25, combos: [['jab'], ['kick'], ['jab', 'cross']], style: 'cautious' },
      wild: { aggression: 0.85, reaction: 0.45, block: 0.1, dodge: 0.15, punish: 0.35, feint: 0, guard: 0.05, range: 0.95, combos: [['hook'], ['cross', 'hook'], ['jab', 'cross', 'hook'], ['kick', 'cross']], style: 'brawler' },
      novice: { aggression: 0.4, reaction: 0.5, block: 0.3, dodge: 0.05, punish: 0.3, feint: 0, guard: 0.22, range: 1.05, combos: [['jab'], ['cross'], ['jab', 'cross']], style: 'balanced' },
    },
  };
})();
