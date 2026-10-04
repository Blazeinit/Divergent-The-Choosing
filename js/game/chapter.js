/* ==========================================================================
   DIVERGENT — story chapters (Build 2)
   A chapter is a scripted stretch of the story in its own zone: the night at
   home, the Choosing Ceremony, the Dauntless run for the train, each
   faction's arrival. Like the simulations (DV.Sim) it owns the zone while it
   runs; unlike them it can play cutscenes (letterboxed, camera shots, the
   player moved by the script), stage crowds of extras, and it checkpoints so
   saving and loading drop you back at the start of the current beat.

   A chapter script:
     DV.Chapter.define(id, {
       zone: 'zone_id' | (opts) => 'zone_id',   title, time: 'HH:MM', day,
       start(C, opts)       — set the stage; opts.step resumes a checkpoint
       update(C, dt)        — per frame while active
       onTrigger(C, id, inside), onDialogueEnd(C, e), canPass(C, lock)
     });
   Helpers on C: actor(), crowd(), seq(), after(), scene(), say(), voice(),
   shot(), cut(), letterbox(), walkPlayer(), checkpoint(), goto(), banner().
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  /* ------------------------------ actors ------------------------------ */
  // a scripted character: walks a list of points, sits, cheers, talks with an overhead line
  class Actor {
    constructor(o) {
      this.id = o.id || 'actor' + Math.floor(Math.random() * 1e9);
      this.name = o.name || '';
      this.faction = o.faction || null;
      this.app = o.app;
      this.model = DV.Character.create(o.app);
      DV.Game.scene.add(this.model.root);
      this.x = o.x; this.z = o.z; this.y = o.y || 0; this.rot = o.rot || 0;
      this.action = o.action || 'idle';
      this.seatY = o.seatY || 0.45;
      this.queue = [];
      this.spd = 1.3;
      this.speed = 0;
      this.look = 0;
      this.lookAtP = null;
      this.bark = null;
      this.onArrive = null;
      this.lodT = 0;
      this.crowd = !!o.crowd;
      if (o.badge) this.model.setTag && this.model.setTag(true);
      this.sync();
    }
    // walk through points [[x,z],...]; then optionally take an action / face a point
    walk(points, spd, then) {
      this.queue = points.map((p) => p.slice());
      this.spd = spd || 1.3;
      this.onArrive = then || null;
      if (this.action === 'sit' || this.action === 'sit_clap' || this.action === 'sit_cheer') this.action = 'idle';
      return this;
    }
    run(points, then) { return this.walk(points, 4.2, then); }
    stop() { this.queue = []; this.onArrive = null; }
    get moving() { return this.queue.length > 0; }
    face(x, z) { this.rot = U.yawTo(this.x, this.z, x, z); return this; }
    lookAt(p) { this.lookAtP = p; return this; }
    place(x, z, rot) { this.x = x; this.z = z; if (rot !== undefined) this.rot = rot; this.queue = []; this.sync(); return this; }
    say(text, secs) {
      this.bark = { text, until: performance.now() + (secs || 3.2) * 1000 };
      return this;
    }
    headY() { return this.y + 1.62 * (this.app && this.app.height ? this.app.height : 1) * (this.action === 'sit' || this.action === 'sit_clap' || this.action === 'sit_cheer' ? 0.72 : 1); }
    sync() {
      this.model.root.position.set(this.x, this.y, this.z);
      this.model.root.rotation.y = this.rot;
    }
    update(dt, zone, cam) {
      this.speed = 0;
      if (this.queue.length) {
        const t = this.queue[0];
        const dx = t[0] - this.x, dz = t[1] - this.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.06) {
          this.queue.shift();
          if (!this.queue.length && this.onArrive) { const f = this.onArrive; this.onArrive = null; f(this); }
        } else {
          const s = Math.min(d, this.spd * dt);
          this.x += (dx / d) * s; this.z += (dz / d) * s;
          this.speed = s / Math.max(dt, 1e-4);
          this.rot = U.dampAngle(this.rot, Math.atan2(dx, dz), 9, dt);
        }
      }
      // head turns toward whatever it's watching
      if (this.lookAtP) {
        const want = U.yawTo(this.x, this.z, this.lookAtP[0], this.lookAtP[1]);
        this.look = U.clamp(U.wrapAngle ? U.wrapAngle(want - this.rot) : Math.atan2(Math.sin(want - this.rot), Math.cos(want - this.rot)), -1.0, 1.0);
      } else this.look = 0;
      this.sync();
      // far members of a crowd animate at a lower rate
      const far = cam && this.crowd && Math.hypot(this.x - cam.position.x, this.z - cam.position.z) > 22;
      this.lodT += dt;
      if (far && this.lodT < 0.12) return;
      const adt = this.lodT;
      this.lodT = 0;
      const act = this.queue.length ? 'idle' : this.action;
      this.model.animate(adt, { speed: this.speed, action: act, seatY: this.seatY, lookYaw: this.look, talking: !!(this.bark && this.bark.until > performance.now()) });
      if (zone) {
        const L = zone.lightAt(this.x, this.z);
        this.model.setTint(U.clamp(L[0] * 0.9, 0.25, 1.3), U.clamp(L[1] * 0.9, 0.25, 1.3), U.clamp(L[2] * 0.9, 0.25, 1.3));
      }
    }
    dispose() {
      if (this.model.root.parent) this.model.root.parent.remove(this.model.root);
      this.model.dispose();
    }
  }

  /* ------------------------------ the controller ------------------------------ */
  const C = {
    scripts: {},
    active: false,
    id: null,
    script: null,
    actors: [],
    objects: [],
    timers: [],
    seqs: [],
    flags: {},
    t: 0,
    cutscene: false,

    define(id, s) { s.id = id; this.scripts[id] = s; return s; },
    get(id) { return this.scripts[id]; },

    // start a chapter (fade out, swap zones, set the stage, fade in)
    start(id, opts) {
      opts = opts || {};
      const s = this.scripts[id];
      if (!s) throw new Error('Unknown chapter ' + id);
      const G = DV.Game;
      const go = () => {
        try {
          this.load(id, opts);
        } catch (e) {
          DV.UI.showError((e && e.stack) || String(e));
        }
      };
      if (opts.instant) { go(); return; }
      G.state = 'transition';
      DV.Input.clearMovement();
      DV.UI.fade(1, opts.fadeOut || 1200).then(go);
    },
    load(id, opts) {
      const G = DV.Game;
      const s = this.scripts[id];
      // tear down whatever was running
      if (DV.Dialogue.isActive()) DV.Dialogue.end(true);
      this.clearScene();
      if (DV.Sim && DV.Sim.active) DV.Sim.cleanup();
      const zoneId = typeof s.zone === 'function' ? s.zone(opts) : s.zone;
      const prev = DV.World.current && DV.World.current.id;
      if (prev && prev !== zoneId && DV.World.current.def.chapter) DV.World.dispose(prev);
      DV.World.dispose(zoneId);
      const zone = DV.World.activate(zoneId);
      DV.NPCs.attach(zoneId); // hides the Testing Center's people
      if (!DV.Player.model.root.parent) G.scene.add(DV.Player.model.root);
      const p = DV.Player;
      if (p.seat) { p.seat.occupant = null; p.seat = null; }
      p.state = 'free';
      p.pinned = false;
      p.cineAction = null;
      p.cineSpeed = 0;
      p.moveScale = 1;
      p.surfaceOverride = null;
      p.crouched = false;
      const sp = zone.def.spawn || { x: 0, z: 0, rot: 0 };
      p.place(sp.x, sp.z, sp.rot);
      G.rig.yaw = sp.rot;
      G.rig.pitch = 0.18;
      G.rig.follow(true);
      G.triggerState = {};
      G.lastRoom = null;
      // story clock
      const w = DV.State.data.world;
      if (s.day) w.day = s.day;
      if (s.time) w.time = U.parseTime(s.time);
      DV.Clock.lastMinute = Math.floor(w.time);
      this.active = true;
      this.id = id;
      this.script = s;
      this.flags = {};
      this.t = 0;
      this.speed = 1;
      this.step = opts.step || null;
      this.opts = opts;
      DV.State.data.story = DV.State.data.story || {};
      DV.State.data.story.chapter = { id, step: this.step };
      DV.State.data.player.zone = zoneId;
      DV.UI.simMode(false);
      DV.UI.showHUD(true);
      G.updateAmbience(true);
      G.state = 'playing';
      s.start(this, zone, opts);
      if (G.state === 'transition') G.state = 'playing';
      DV.Input.clearMovement();
      DV.Input.requestLock();
      if (!opts.noFadeIn) DV.UI.fade(0, opts.fadeIn || 1500);
      if (s.title && !opts.noTitle && !opts.step) setTimeout(() => DV.UI.narrate(s.title, 3.6), 700);
      DV.Events.emit('chapter:start', { id, step: this.step });
    },
    // move on to another chapter
    goto(id, opts) { this.start(id, opts); },
    // save point: loading a save resumes the chapter at this step
    checkpoint(step) {
      this.step = step;
      DV.State.data.story.chapter = { id: this.id, step };
      if (!DV.Game.inSimulation()) DV.Save.write('auto');
    },

    update(dt) {
      if (!this.active || !this.script) return;
      dt *= this.speed || 1; // a chapter can fast-forward (hurrying the ceremony along)
      this.t += dt;
      // game-time timers (frozen while paused)
      if (this.timers.length) {
        const due = [];
        this.timers = this.timers.filter((tm) => ((tm.t -= dt) > 0 ? true : (due.push(tm), false)));
        for (const tm of due) tm.fn();
      }
      this.runSeqs(dt);
      const zone = DV.World.current;
      const cam = DV.Game.camera;
      for (const a of this.actors) a.update(dt, zone, cam);
      if (this.script && this.script.update) this.script.update(this, dt, zone);
      for (const o of this.objects) if (o.update) o.update(dt);
      if (this.playerWalk) this.stepPlayerWalk(dt);
    },

    /* ---------- sequences: a list of beats run in order ----------
       each beat is a function called once; it may return
         a number  → wait that many seconds,
         a function → wait until it returns true,
         nothing   → go straight on.                                  */
    seq(beats, name) {
      const s = { beats: beats.slice(), i: 0, wait: 0, until: null, name: name || null };
      if (name) this.seqs = this.seqs.filter((x) => x.name !== name);
      this.seqs.push(s);
      return s;
    },
    stopSeq(name) { this.seqs = this.seqs.filter((x) => x.name !== name); },
    runSeqs(dt) {
      for (const s of this.seqs.slice()) {
        let guard = 0;
        while (guard++ < 50) {
          if (s.wait > 0) { s.wait -= dt; dt = 0; if (s.wait > 0) break; }
          if (s.until) { if (!s.until()) break; s.until = null; }
          if (s.i >= s.beats.length) { this.seqs.splice(this.seqs.indexOf(s), 1); break; }
          const r = s.beats[s.i++](this);
          if (typeof r === 'number') s.wait = r;
          else if (typeof r === 'function') s.until = r;
          if (this.seqs.indexOf(s) < 0) break; // stopped by its own beat
        }
      }
    },
    after(secs, fn) { this.timers.push({ t: secs, fn }); },

    /* ---------- stage ---------- */
    actor(o) {
      const a = new Actor(o);
      this.actors.push(a);
      return a;
    },
    actorById(id) { return this.actors.find((a) => a.id === id) || null; },
    removeActor(a) {
      const i = this.actors.indexOf(a);
      if (i >= 0) this.actors.splice(i, 1);
      a.dispose();
    },
    // seat or stand a crowd of extras: spots [{x,z,rot,action,faction}]
    crowd(spots, opts) {
      opts = opts || {};
      const out = [];
      spots.forEach((sp, i) => {
        const f = sp.faction || opts.faction || 'neutral';
        const sex = sp.sex || (Math.random() < 0.5 ? 'm' : 'f');
        const adult = sp.adult !== false && opts.adults;
        const app = DV.Character.fromFaction(f, sex, (opts.seed || 'crowd') + ':' + f + ':' + i, adult ? { age: 22 + ((i * 7) % 38) } : undefined);
        if (adult) app.height = (app.height || 1) * 1.05;
        out.push(this.actor({ id: (opts.prefix || 'x') + i, app, x: sp.x, z: sp.z, rot: sp.rot || 0, action: sp.action || opts.action || 'idle', faction: f, crowd: true, seatY: sp.seatY }));
      });
      return out;
    },
    addObject(o) {
      this.objects.push(o);
      if (o.isObject3D && !o.parent) DV.World.current.group.add(o);
      return o;
    },
    interact(it) { DV.Interaction.extra.push(it); return it; },
    removeInteract(id) { DV.Interaction.extra = DV.Interaction.extra.filter((x) => x.id !== id); },
    flag(n) { return !!this.flags[n]; },
    setFlag(n, v) { this.flags[n] = v === undefined ? true : v; },

    /* ---------- talk ---------- */
    scene(tree, opts) {
      if (DV.Dialogue.isActive()) DV.Dialogue.end(true);
      DV.Dialogue.startScene(tree, opts || {});
    },
    // a line spoken by an actor: overhead bark plus a subtitle
    say(actor, text, secs) {
      actor.say(text, secs);
      DV.UI.subtitle(actor.name, text, secs || 3.2);
    },
    // a voice with no body on screen (a speaker at a lectern, a PA, a thought)
    voice(who, text, secs) { DV.UI.subtitle(who, text, secs || 4); },

    /* ---------- cutscenes ---------- */
    // letterbox + no player control; the script drives the camera and the player
    cut(on) {
      const G = DV.Game;
      this.cutscene = !!on;
      DV.UI.letterbox(!!on);
      if (on) {
        G.state = 'cutscene';
        DV.Input.clearMovement();
      } else {
        if (G.state === 'cutscene') G.state = 'playing';
        G.rig.follow();
        DV.Input.clearMovement();
        DV.Input.takeMouse();
      }
    },
    shot(pos, look, instant) {
      DV.Game.rig.setShot(new THREE.Vector3(pos[0], pos[1], pos[2]), new THREE.Vector3(look[0], look[1], look[2]), instant);
    },
    follow() { DV.Game.rig.follow(); },
    // move the player along points during a cutscene (or a scripted moment)
    walkPlayer(points, spd, then, action) {
      this.playerWalk = { q: points.map((p) => p.slice()), spd: spd || 1.3, then: then || null, action: action || null };
    },
    stepPlayerWalk(dt) {
      const W = this.playerWalk, P = DV.Player;
      if (!W.q.length) {
        this.playerWalk = null;
        P.cineSpeed = 0;
        if (W.then) W.then();
        return;
      }
      const t = W.q[0];
      const dx = t[0] - P.x, dz = t[1] - P.z, d = Math.hypot(dx, dz);
      if (d < 0.06) { W.q.shift(); return; }
      const s = Math.min(d, W.spd * dt);
      P.x += (dx / d) * s; P.z += (dz / d) * s;
      P.rot = U.dampAngle(P.rot, Math.atan2(dx, dz), 9, dt);
      P.cineSpeed = s / Math.max(dt, 1e-4);
      P.syncModel();
    },

    /* ---------- the end of the build ---------- */
    banner(l1, l2, l3, then) {
      const G = DV.Game;
      G.state = 'banner';
      if (!DV.Cursor.enabled()) DV.Input.exitLock();
      DV.UI.banner(l1, l2, l3, () => {
        DV.UI.modalOpen = null;
        G.state = 'playing';
        DV.Input.requestLock();
        if (then) then();
      });
    },

    /* ---------- integration with the game loop ---------- */
    bodies() {
      const out = [];
      for (const a of this.actors) if (!a.ghost) out.push({ x: a.x, z: a.z, r: 0.26 });
      return out;
    },
    // people on the move open doors (seated crowds don't need to)
    agents() { return this.actors.filter((a) => a.moving && !a.ghost).slice(0, 48).map((a) => ({ x: a.x, z: a.z, access: () => true })); },
    canPass(lock) { return this.script && this.script.canPass ? this.script.canPass(this, lock) : true; },
    onTrigger(id, inside) { if (this.script && this.script.onTrigger) this.script.onTrigger(this, id, inside); },
    onDialogueEnd(e) { if (this.script && this.script.onDialogueEnd) this.script.onDialogueEnd(this, e); },
    // overhead lines for the UI
    barkSources() {
      return this.actors.filter((a) => a.bark && a.bark.until > performance.now());
    },

    clearScene() {
      for (const a of this.actors) a.dispose();
      for (const o of this.objects) { if (o.dispose) o.dispose(); else if (o.parent) o.parent.remove(o); }
      this.actors = [];
      this.objects = [];
      this.timers = [];
      this.seqs = [];
      this.playerWalk = null;
      DV.Interaction.extra = [];
      if (this.cutscene) { this.cutscene = false; DV.UI.letterbox(false); }
    },
    cleanup() {
      this.clearScene();
      const p = DV.Player;
      p.pinned = false; p.cineAction = null; p.cineSpeed = 0;
      this.active = false;
      this.script = null;
      this.id = null;
    },
  };
  C.Actor = Actor;
  DV.Chapter = C;
})();
