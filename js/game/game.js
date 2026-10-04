/* ==========================================================================
   DIVERGENT — game coordinator
   Owns the renderer, camera, main loop and the high-level state machine:
     mainmenu → creator → intro → playing ⇄ dialogue / menu / paused / reading
   and the transitions into and out of the aptitude simulations.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const HOME = 'testing_center'; // Build 1's district; DV.District knows where you live now

  const Game = {
    state: 'boot',
    renderer: null,
    scene: null,
    camera: null,
    rig: null,
    fps: 0,
    hintTimer: 0,
    staffWarned: {},
    triggerState: {},
    lastRoom: null,
    fear: 0,
    npcSpeaking: null,
    playTimeAcc: 0,
    autosaveTimer: 0,

    /* ------------------------------ boot ------------------------------ */
    init() {
      const canvas = document.getElementById('game-canvas');
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(1);
      this.renderer.outputEncoding = THREE.LinearEncoding;
      this.scene = new THREE.Scene();
      // far plane reaches the hazy city edge, the marsh and the Ferris wheel
      this.camera = new THREE.PerspectiveCamera(DV.Config.CAMERA.fov, 16 / 9, 0.08, 1100);
      this.rig = new DV.CameraRig(this.camera);
      DV.World.init(this.scene);
      DV.NPCs.init(this.scene);
      DV.Input.init(canvas);
      DV.UI.init();
      DV.Cursor.init();
      DV.DialogueUI.init();
      DV.RPGMenu.init();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      DV.Events.on('settings:changed', () => { this.resize(); if (DV.World.current) DV.World.applyAtmosphere(DV.World.current); });
      DV.Events.on('input:lockLost', (e) => { if (!e.requested && (this.state === 'playing' || this.state === 'activity')) this.pause(); });
      DV.Events.on('input:canvasClick', () => this.onCanvasClick());
      DV.Events.on('dialogue:end', (e) => this.onDialogueEnd(e));
      DV.Events.on('inventory:changed', (e) => { if (e && e.id === 'name_badge') this.refreshPlayerTag(); });
      DV.Events.on('quest:changed', (e) => { if (e.type === 'complete' && !this.inSimulation()) this.autosaveSoon(); });
      DV.Events.on('door:move', (e) => {
        const d = e.door.def;
        DV.Audio.play('door', { volume: 0.8, x: d.x, z: d.z, range: 16 });
        // outside air pushes in when an exterior door opens
        if (e.opening && (d.id === 'main_doors' || d.id === 'court_door')) DV.Audio.play('gust', { x: d.x, z: d.z, range: 14 });
      });
      DV.Events.on('clock:minute', (m) => {
        if (!DV.World.current || DV.World.current.id !== this.homeZoneId() || this.state === 'mainmenu') return;
        DV.NPCAI.onMinute();
        DV.District.onMinute(m);
      });
      document.addEventListener('visibilitychange', () => { if (document.hidden && (this.state === 'playing' || this.state === 'activity')) this.pause(); });
      this.last = performance.now();
      requestAnimationFrame((t) => this.frame(t));
      this.showMainMenu();
    },

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      const mode = DV.Settings.get('renderScale');
      const target = { ultra: 360, retro: 480, crisp: 720 }[mode];
      let scale = target ? Math.min(1, target / h) : Math.min(window.devicePixelRatio || 1, 2);
      this.renderer.setSize(Math.max(160, Math.floor(w * scale)), Math.max(120, Math.floor(h * scale)), false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    },

    zone() {
      return DV.World.current;
    },
    // the zone you live in: the Testing Center in Build 1, your faction's compound later
    homeZoneId() {
      return DV.District.zoneId();
    },
    inSimulation() {
      return !!(DV.World.current && DV.World.current.def.simulation);
    },
    inChapter() {
      return !!(DV.World.current && DV.World.current.def.chapter && DV.Chapter && DV.Chapter.active);
    },
    // whoever is scripting the current zone: a simulation, a story chapter, or nobody (the Testing Center day)
    ctrl() {
      if (this.inSimulation()) return DV.Sim || null;
      if (this.inChapter()) return DV.Chapter;
      return null;
    },
    testingGroups() {
      return DV.Story.testingGroups();
    },
    doorUnlocked(zoneId, door) {
      return DV.Story.playerCanPass(door.lock, door);
    },

    /* ------------------------------ main menu ------------------------------ */
    showMainMenu() {
      this.state = 'mainmenu';
      DV.Audio.stopBeds();
      DV.Audio.setReverb('office');
      DV.UI.showHUD(false);
      DV.UI.clearBarks();
      DV.Input.exitLock();
      if (DV.Player.model && DV.Player.model.root.parent) DV.Player.model.root.parent.remove(DV.Player.model.root);
      DV.World.activate('menu_bg');
      DV.NPCs.attach('menu_bg');
      this.menuT = 0;
      this.rig.mode = 'shot';
      this.rig.shot = null;
      DV.Menus.showMain();
      DV.Audio.setAmbience('menu');
      DV.Audio.setMusic('menu');
      // a few figures on the rooftop for atmosphere
      if (!this.menuFigures) {
        this.menuFigures = [];
        const f = [['dauntless', 'm', -2.5, -7.4, 0], ['erudite', 'f', 1.2, -7.2, 0.2], ['abnegation', 'f', 3.6, -7.6, -0.1]];
        for (const [fac, sex, x, z, r] of f) {
          const m = DV.Character.create(DV.Character.fromFaction(fac, sex, 'menu' + fac));
          m.root.position.set(x, 0, z);
          m.root.rotation.y = Math.PI + r;
          this.menuFigures.push(m);
        }
      }
      for (const m of this.menuFigures) this.scene.add(m.root);
    },
    hideMenuFigures() {
      if (this.menuFigures) for (const m of this.menuFigures) this.scene.remove(m.root);
    },

    newGame() {
      DV.State.reset();
      DV.Menus.hideMain();
      this.hideMenuFigures();
      this.state = 'creator';
      DV.Creator.open();
      DV.Audio.setMusic('calm');
    },
    // the creator shows the live model on the rooftop
    creatorPreview(app) {
      const p = DV.Player;
      const old = p.model;
      if (old && old.root.parent) old.root.parent.remove(old.root);
      p.create(app);
      p.model.root.position.set(0, 0, 0);
      p.model.root.rotation.y = this.creatorRot || 0;
      this.scene.add(p.model.root);
      p.model.setTint(1.05, 1.0, 0.98);
    },

    startNewGameAfterCreation() {
      const st = DV.State.data;
      // starting inventory
      DV.Inventory.add('neutral_garments', 1, true);
      DV.Inventory.add('clothes_' + st.player.upbringing, 1, true);
      const up = DV.RPG.upbringings.find((u) => u.id === st.player.upbringing);
      if (up) DV.Inventory.add(up.item, 1, true);
      DV.Inventory.add('water_cup', 1, true);
      DV.Reputation.add(st.player.upbringing, 10, true);
      st.meta.created = Date.now();
      this.playIntro(() => this.enterWorld(false));
    },

    playIntro(done) {
      this.state = 'intro';
      if (DV.Player.model && DV.Player.model.root.parent) DV.Player.model.root.parent.remove(DV.Player.model.root);
      DV.Audio.setMusic('menu');
      const name = DV.State.data.player.name;
      const lines = [
        'After the war, the founders built a fence around what was left of the city.',
        'They believed that the cause of the war was human nature itself —\nand that every person must cultivate the virtue that stood against it.',
        'ABNEGATION, the selfless.   DAUNTLESS, the brave.\nERUDITE, the intelligent.   CANDOR, the honest.   AMITY, the peaceful.',
        'At sixteen, every citizen takes the aptitude test.\nThe next day, at the Choosing Ceremony, they choose — for life.',
        'Faction before blood.',
        name + ', you were raised ' + DV.Factions.name(DV.State.data.player.upbringing) + '.\nYou have chosen to test in neutral clothes.',
        'Today is your aptitude test.',
      ];
      const box = U.el('div', null, '<div class="line"></div><div class="skip">Click / Space — next · Esc — skip</div>', DV.UI.root);
      box.id = 'intro';
      const line = box.querySelector('.line');
      let i = -1, timer = null, finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        window.removeEventListener('keydown', kh, true);
        box.style.transition = 'opacity 1s';
        box.style.opacity = 0;
        setTimeout(() => { box.remove(); done(); }, 1000);
      };
      const next = () => {
        clearTimeout(timer);
        i++;
        if (i >= lines.length) { finish(); return; }
        line.classList.remove('on');
        setTimeout(() => {
          line.textContent = lines[i];
          line.classList.add('on');
          DV.Audio.play('type', { volume: 2 });
        }, i === 0 ? 300 : 700);
        timer = setTimeout(next, i === 0 ? 5200 : 5600);
      };
      const kh = (e) => {
        e.preventDefault();
        if (e.code === 'Escape') finish();
        else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') next();
      };
      box.onclick = () => next();
      window.addEventListener('keydown', kh, true);
      next();
    },

    /* ------------------------------ entering the world ------------------------------ */
    enterWorld(fromLoad) {
      this.state = 'loading';
      DV.UI.loading(true, U.pick([
        'Tip: Hold Shift to run. Running indoors annoys the staff.',
        'Tip: Sit on a bench and press T to wait for time to pass.',
        'Tip: Attribute checks appear in dialogue like [PERCEPTION 6].',
        'Tip: NPCs keep their own schedules. If someone is missing, check the clock.',
        'Tip: Tab opens your character, inventory, quests, reputation and map.',
      ]));
      DV.Menus.hideAll();
      DV.UI.showHUD(false);
      setTimeout(() => {
        try {
          this.hideMenuFigures();
          const st0 = DV.State.data;
          const chap = fromLoad && st0.story && st0.story.chapter && DV.Chapter.get(st0.story.chapter.id);
          if (chap) {
            // a save made during Build 2's story: back to the start of that beat
            if (!st0.player.appearance) st0.player.appearance = DV.Character.fromFaction('neutral', st0.player.sex, 'player');
            this.refreshPlayerAppearance(true);
            this.scene.add(DV.Player.model.root);
            DV.Player.stamina = st0.player.stamina || 100;
            DV.Quests.tracked = st0.questsTracked || DV.Quests.firstActive();
            DV.UI.loading(false);
            DV.UI.showHUD(true);
            DV.UI.fade(1, 1);
            DV.Audio.setMusic('none');
            DV.Chapter.start(st0.story.chapter.id, { step: st0.story.chapter.step, instant: true, fromLoad: true });
            return;
          }
          const HZ = this.homeZoneId();
          const zone = DV.World.activate(HZ);
          DV.NPCs.attach(HZ);
          const st = DV.State.data;
          const p = DV.Player;
          if (!st.player.appearance) st.player.appearance = DV.Character.fromFaction('neutral', st.player.sex, 'player');
          this.refreshPlayerAppearance(true);
          this.scene.add(p.model.root);
          zone.refreshPickups(DV.State.zoneState(HZ));
          if (fromLoad && st.player.pos && (st.player.pos.x || st.player.pos.z)) p.place(st.player.pos.x, st.player.pos.z, st.player.pos.rot || 0);
          else { const s = zone.def.spawn; p.place(s.x, s.z, s.rot); }
          p.stamina = st.player.stamina || 100;
          this.rig.yaw = p.rot;
          this.rig.pitch = 0.18;
          this.rig.follow(true);
          this.restoreNPCs(fromLoad);
          this.staffWarned = {};
          this.triggerState = {};
          this.lastRoom = null;
          DV.Clock.lastMinute = Math.floor(DV.Clock.minutes());
          const district = DV.District.current();
          if (!fromLoad && HZ === HOME) {
            DV.Quests.start('aptitude_day');
            DV.Story.pa('Welcome to the Sector 4 Aptitude Testing Center. Candidates, please check in at reception, then present your name badge at security.');
          } else {
            DV.Quests.tracked = st.questsTracked || DV.Quests.firstActive();
            if (HZ === HOME) DV.Build2.beginGoingHome(); // a save made after the results (also from Build 1)
          }
          if (district && district.script && district.script.start) district.script.start(!!fromLoad, {});
          DV.UI.loading(false);
          DV.UI.showHUD(true);
          DV.UI.simMode(false);
          this.state = 'playing';
          this.hintTimer = 12;
          DV.Audio.setMusic('none');
          this.updateAmbience(true);
          DV.UI.fade(1, 1);
          DV.UI.fade(0, 1200);
          if (!fromLoad && HZ === HOME) setTimeout(() => DV.UI.narrate('APTITUDE TEST DAY\n' + DV.Clock.str(), 3.5), 900);
        } catch (e) {
          DV.UI.loading(false);
          DV.UI.showError((e && e.stack) || String(e));
        }
      }, 60);
    },
    // tear down a running chapter (quit / load): its zone is rebuilt next time
    leaveChapter() {
      if (!DV.Chapter || !DV.Chapter.active) return;
      const z = DV.World.current;
      DV.Chapter.cleanup();
      if (z && z.def.chapter) DV.World.dispose(z.id);
    },
    restoreNPCs(fromLoad) {
      const rt = DV.State.data.npcRuntime;
      DV.NPCAI.syncAll();
      if (fromLoad && rt) {
        // keep exact positions for NPCs that were mid-task
        for (const n of DV.NPCs.all) {
          const r = rt[n.id];
          if (!r || !n.present || !r.present) continue;
          if (n.mode === 'acting' && n.spot) continue; // seated/working NPCs are already exact
          n.x = r.x; n.z = r.z; n.rot = r.rot;
          DV.NPCAI.syncModel(n);
        }
      }
    },
    refreshPlayerAppearance(noRebuildScene) {
      const st = DV.State.data;
      const app = U.deepClone(st.player.appearance);
      app.outfit = U.deepClone(DV.Character.OUTFITS[st.player.outfit] || DV.Character.OUTFITS.neutral);
      if (st.player.outfit === 'candor') app.outfit.tieColor = '#101010';
      // your tattoos go wherever you go, whatever you wear
      if (st.player.tattoos && st.player.tattoos.length) app.outfit.tattoos = (app.outfit.tattoos || []).concat(st.player.tattoos);
      app.nameTag = true;
      const p = DV.Player;
      const parent = p.model && p.model.root.parent;
      if (p.model) p.model.dispose();
      p.create(app);
      if (parent && !noRebuildScene) parent.add(p.model.root);
      this.refreshPlayerTag();
      p.syncModel();
    },
    // the clip-on name badge appears once reception hands it over
    refreshPlayerTag() {
      const m = DV.Player.model;
      if (m) m.setTag(DV.Inventory.has('name_badge'));
    },

    /* ------------------------------ main loop ------------------------------ */
    frame(t) {
      requestAnimationFrame((tt) => this.frame(tt));
      let dt = (t - this.last) / 1000;
      this.last = t;
      if (dt > 0.05) dt = 0.05;
      if (dt <= 0) dt = 0.001;
      this.fpsAcc = (this.fpsAcc || 0) + dt;
      this.fpsN = (this.fpsN || 0) + 1;
      if (this.fpsAcc > 0.5) { this.fps = Math.round(this.fpsN / this.fpsAcc); this.fpsAcc = 0; this.fpsN = 0; }
      try {
        this.update(dt);
      } catch (e) {
        if (!this._errShown) { this._errShown = true; DV.UI.showError((e && e.stack) || String(e)); }
        console.error(e);
      }
      DV.World.update(dt, this.camera);
      DV.Soundscape.update(dt);
      DV.Cursor.update(this);
      this.renderer.render(this.scene, this.camera);
      DV.Input.endFrame();
    },

    update(dt) {
      const input = DV.Input;
      switch (this.state) {
        case 'mainmenu':
        case 'creator':
          this.updateMenuCamera(dt);
          return;
        case 'intro':
        case 'loading':
          return;
      }
      const zone = this.zone();
      // global modal keys
      if (DV.UI.modalOpen === 'reading') {
        if (input.consume('KeyE') || input.consume('Escape') || input.consume('Enter') || input.consume('Space')) DV.UI.closeReading();
      }
      if (this.state === 'playing') this.updatePlaying(dt, input, zone);
      else if (this.state === 'dialogue') {
        if (input.consume('Escape') && DV.Dialogue.active && DV.Dialogue.active.npcId && !this.inSimulation()) DV.Dialogue.end();
        else DV.DialogueUI.update(dt, input);
        this.updateWorldSystems(dt, zone, false);
        if (this.inSimulation() && DV.Sim) DV.Sim.update(dt, true);
        // keep the seated/standing player animated while talking
        DV.Player.model.animate(dt, { speed: 0, action: DV.Player.action, seatY: DV.Player.seat ? DV.Player.seat.seatY : 0.45 });
        if (this.inChapter()) DV.Chapter.update(dt);
      } else if (this.state === 'cutscene') {
        // a chapter is driving: the world and the actors carry on, the player is a puppet
        if (input.consume('Escape')) { this.pause(); return; }
        input.takeMouse(); input.takeWheel();
        this.updateWorldSystems(dt, zone, false);
        if (this.inChapter()) DV.Chapter.update(dt);
        else DV.District.update(dt);
        const P = DV.Player;
        P.model.animate(dt, { speed: P.cineSpeed || 0, action: P.cineAction || P.action, seatY: P.seat ? P.seat.seatY : 0.45 });
      } else if (this.state === 'activity') {
        // a fight, the range, the knife wall: the activity has the controls and the camera
        if (input.consume('Escape')) { this.pause(); return; }
        if (!this.ctrl()) DV.Clock.update(dt);
        DV.Activity.update(dt, input);
        this.updateWorldSystems(dt, zone, false);
        if (this.inChapter()) DV.Chapter.update(dt);
        else DV.District.update(dt);
      } else if (this.state === 'menu') {
        if (input.consume('Tab') || input.consume('Escape')) this.closeOverlay();
        else if (input.consume('KeyM') && DV.RPGMenu.tab !== 'map') DV.RPGMenu.show('map');
        else DV.RPGMenu.update(input);
      } else if (this.state === 'paused') {
        if (input.consume('Escape')) { if (!DV.Menus.closeSide()) this.resume(); }
      } else if (this.state === 'wait') {
        if (input.consume('Escape')) { DV.Menus.closeSide(); this.closeOverlay(); }
      } else if (this.state === 'transition' || this.state === 'banner') {
        // simulation transitions keep the world animating
        if (this.inSimulation() && DV.Sim) DV.Sim.update(dt, true);
        if (this.inChapter()) DV.Chapter.update(dt);
      }
      this.rig.update(dt, DV.Player, zone);
      // in a tight spot the camera can end up inside your head: hide yourself rather than fill the screen
      if (DV.Player.model) DV.Player.model.root.visible = !(this.rig.mode === 'follow' && this.rig.curDist < 0.7);
      DV.UI.updateHUD(this);
      DV.UI.updateBarks(this);
      // playtime
      if (this.state !== 'paused') DV.State.data.meta.playTime += dt;
    },

    updatePlaying(dt, input, zone) {
      if (DV.UI.modalOpen === 'reading') { this.updateWorldSystems(dt, zone, false); return; }
      // keys
      if (input.consume('Escape')) { this.pause(); return; }
      if (input.consume('Tab')) { this.openRPGMenu(); return; }
      if (input.consume('KeyM')) { this.openRPGMenu('map'); return; }
      if (input.consume('KeyJ')) { this.openRPGMenu('quests'); return; }
      if (input.consume('KeyI')) { this.openRPGMenu('inventory'); return; }
      if (input.consume('KeyT') && DV.Player.state === 'sitting' && !this.ctrl()) { this.openWait(); return; }
      if (input.consume('KeyE')) DV.Interaction.use(this);
      if (this.state !== 'playing') return;
      // camera
      const [mx, my] = input.takeMouse();
      if (mx || my) this.rig.handleMouse(mx, my);
      const w = input.takeWheel();
      if (w) this.rig.zoom(w);
      this.hintTimer -= dt;
      // clock & player
      if (!this.ctrl()) DV.Clock.update(dt); // simulations and chapters keep their own (story) time
      const bodies = DV.NPCs.bodies(DV.Player.x, DV.Player.z, 2);
      const ctl = this.ctrl();
      if (ctl) for (const b of ctl.bodies()) if (Math.abs(b.x - DV.Player.x) < 2 && Math.abs(b.z - DV.Player.z) < 2) bodies.push(b);
      DV.Player.update(dt, { input, rig: this.rig, zone, npcs: bodies, enabled: true, lookYaw: 0 });
      this.updateWorldSystems(dt, zone, true);
      DV.Interaction.update(zone, DV.Player);
      this.checkRoomAndTriggers(zone);
      if (this.inSimulation() && DV.Sim) DV.Sim.update(dt, false);
      if (this.inChapter() && this.state !== 'cutscene') DV.Chapter.update(dt);
      else DV.District.update(dt);
      // autosave
      if (this.autosaveTimer > 0) {
        this.autosaveTimer -= dt;
        if (this.autosaveTimer <= 0 && !this.inSimulation()) DV.Save.write('auto');
      }
    },

    updateWorldSystems(dt, zone, playerActive) {
      if (!zone) return;
      // doors: player + NPC agents
      const agents = DV.NPCs.agents();
      agents.push({ x: DV.Player.x, z: DV.Player.z, access: (lock, door) => DV.Story.playerCanPass(lock, door) });
      const ctl = this.ctrl();
      if (ctl) for (const a of ctl.agents()) agents.push(a);
      zone.updateDoors(dt, agents);
      if (!ctl) DV.NPCAI.update(dt, DV.Player);
      // player tint from baked light
      const L = zone.lightAt(DV.Player.x, DV.Player.z);
      this.ptint = this.ptint || [1, 1, 1];
      for (let k = 0; k < 3; k++) this.ptint[k] = U.lerp(this.ptint[k], U.clamp(L[k] * 0.9, 0.3, 1.25), Math.min(1, dt * 4));
      DV.Player.model.setTint(this.ptint[0], this.ptint[1], this.ptint[2]);
      void playerActive;
    },

    updateMenuCamera(dt) {
      this.menuT = (this.menuT || 0) + dt;
      const t = this.menuT;
      if (this.state === 'creator') {
        // turntable framing of the player model
        const m = DV.Player.model;
        if (m) {
          const input = DV.Input;
          const [mx] = input.takeMouse();
          if (input.dragging && mx) this.creatorRot = (this.creatorRot || 0) + mx * 0.01;
          const w = input.takeWheel();
          if (w) this.creatorZoom = U.clamp((this.creatorZoom || 3.2) + w * 0.3, 1.6, 5);
          m.root.rotation.y = this.creatorRot || 0;
          m.animate(dt, { speed: 0, action: 'idle' });
          const z = this.creatorZoom || 3.2;
          const ty = z < 2.4 ? 1.5 : 1.05;
          this.camera.position.set(0, ty + 0.15, z);
          this.camera.lookAt(0, ty, 0);
        }
        return;
      }
      const r = 15;
      this.camera.position.set(Math.sin(t * 0.03) * r * 0.4, 3.2 + Math.sin(t * 0.1) * 0.3, 6 + Math.cos(t * 0.03) * 2);
      this.camera.lookAt(Math.sin(t * 0.02) * 30, 4.5, -60);
      if (this.menuFigures) for (const m of this.menuFigures) m.animate(dt, { speed: 0, action: 'idle' });
    },

    /* ------------------------------ room tracking / triggers / ambience ------------------------------ */
    checkRoomAndTriggers(zone) {
      const p = DV.Player;
      const room = zone.roomAt(p.x, p.z);
      if (room !== this.lastRoom) {
        this.lastRoom = room;
        if (room && !this.inSimulation() && !zone.def.noDiscover) {
          const zs = DV.State.zoneState(zone.id);
          if (!zs.visited[room.id]) {
            zs.visited[room.id] = true;
            const minor = /corr|pass|plaza|lobby|hall|street/.test(room.id);
            if (!minor) {
              DV.UI.notify('Discovered: ' + room.name, 'info');
              DV.Stats.addXP(5);
            }
          }
        }
        this.updateAmbience();
      }
      for (const t of zone.triggers) {
        const inside = !!t.rect && U.inRect(p.x, p.z, t.rect);
        if (inside !== !!this.triggerState[t.id]) {
          this.triggerState[t.id] = inside;
          const ctl = this.ctrl();
          const ds = DV.District.scriptFor(zone);
          if (ctl) ctl.onTrigger(t.id, inside);
          else if (ds) { if (ds.onTrigger) ds.onTrigger(t.id, inside); }
          else DV.Story.onTrigger(t.id, inside);
        }
      }
    },
    // the soundscape runs every frame; this just forces an immediate refresh (room change, zone swap)
    updateAmbience() {
      if (!this.zone()) return;
      DV.Soundscape.acc = 1;
      DV.Soundscape.update(0);
    },

    /* ------------------------------ interactions ------------------------------ */
    talkTo(npc, force, opts) {
      if (!npc || !npc.present) return;
      if (!force && DV.Player.state === 'sitting' && U.dist(DV.Player.x, DV.Player.z, npc.x, npc.z) > 2.6) return;
      const ok = DV.Dialogue.start(npc.id, opts);
      if (!ok) return;
      if (npc.id === 'martha_bell' && !DV.State.flag('checked_in') && DV.Reception) DV.Reception.cutInLine();
      this.state = 'dialogue';
      this.npcSpeaking = npc.id;
      DV.NPCAI.beginTalk(npc);
      npc.bark = null;
      // the mouse stays captured: choices are picked with keys, wheel, mouse movement and click
      DV.Input.clearMovement();
      if (DV.Player.state !== 'sitting') DV.Player.rot = U.yawTo(DV.Player.x, DV.Player.z, npc.x, npc.z);
      DV.Player.syncModel();
      const pp = new THREE.Vector3(DV.Player.x, 0, DV.Player.z);
      const np = new THREE.Vector3(npc.x, 0, npc.z);
      this.rig.setDialogue(pp, np, npc.headY() - (npc.action === 'sit' || npc.action === 'work' ? 0.45 : 0), DV.Player.state === 'sitting');
      DV.Stats.practice('empathy', 0.2);
    },
    // non-NPC choice scenes (serum, envelope, simulations)
    onSceneStart() {
      this.state = 'dialogue';
      DV.Input.clearMovement();
    },
    onDialogueEnd(e) {
      const npc = e && e.npcId ? DV.NPCs.get(e.npcId) : null;
      if (npc) DV.NPCAI.endTalk(npc);
      this.npcSpeaking = null;
      if (this.state === 'dialogue') {
        this.state = 'playing';
        this.rig.snapBehind(DV.Player.state === 'sitting' ? this.rig.yaw : DV.Player.rot);
        this.rig.follow();
        DV.Input.clearMovement();
        DV.Input.takeMouse();
        // if the cursor was free (clicked a choice), take the mouse straight back
        DV.Input.requestLock();
      } else if (this.rig.mode === 'dialogue') {
        // the conversation ended while something else had the screen (a banner, a fade):
        // the camera still goes back behind you
        this.rig.follow();
      }
      // a banner the conversation asked for waits until the conversation is over
      if (this.completionPending) { this.completionPending = false; setTimeout(() => this.showCompletion(), 450); }
      if (DV.Sim && this.inSimulation()) DV.Sim.onDialogueEnd(e);
      else if (this.inChapter()) DV.Chapter.onDialogueEnd(e);
      else { const ds = DV.District.scriptFor(this.zone()); if (ds && ds.onDialogueEnd) ds.onDialogueEnd(e); }
    },
    sitOn(spot, forced) {
      if (!spot) return;
      if (spot.occupant && spot.occupant !== 'player') { DV.UI.notify('Someone is already sitting there.'); return; }
      if (DV.Player.seat && DV.Player.seat.occupant === 'player') DV.Player.seat.occupant = null;
      spot.occupant = 'player';
      DV.Player.sit(spot);
      const release = () => { if (spot.occupant === 'player') spot.occupant = null; };
      DV.Player._releaseSeat = release;
      if (!forced && !this.inSimulation()) DV.UI.notify('Sitting. Press T to wait, or move to stand up.');
    },
    takePickup(it) {
      const zs = DV.State.zoneState(this.zone().id);
      zs.taken[it.pickup.id] = true;
      it.mesh.visible = false;
      it.disabled = true;
      DV.Inventory.add(it.pickup.item, it.pickup.qty || 1);
      if (it.hidden) DV.Stats.practice('observation', 1.5);
    },
    tryDoor(door) {
      const d = door.def;
      if (door.sealed) { DV.Audio.play('locked'); DV.UI.notify(d.lockMsg || 'It won\'t open.'); return; }
      if (DV.Story.playerCanPass(door.lock, door)) {
        const zs = DV.State.zoneState(this.zone().id);
        if (door.lock === 'storage' || door.lock === 'records') {
          if (zs.doors[d.id] !== 'unlocked') DV.UI.notify('You unlock the door.');
          zs.doors[d.id] = 'unlocked';
        }
        door.holdOpen = 1.2;
        return;
      }
      DV.Audio.play('locked');
      const pick = { storage: 6, records: 8 }[door.lock];
      if (pick) {
        this.pickDoor = door;
        DV.DialogueDB.add('lockpick', {
          entry: () => 'start',
          nodes: {
            start: {
              speaker: d.label || 'Locked Door',
              text: d.lockMsg || 'Locked.',
              choices: [
                { text: 'Work the old lock open with a hairpin.', check: { attr: 'agility', dc: pick }, to: 'try' },
                { text: 'Leave it.', end: true },
              ],
            },
            try: {
              speaker: d.label || 'Locked Door',
              text: () => {
                const seen = DV.Story.watchers(9, 140);
                if (seen.length) {
                  seen[0].say('What do you think you\'re doing with that door?', 4);
                  DV.Reputation.addRel(seen[0].id, -5);
                  return 'You feel eyes on your back. ' + seen[0].def.name + ' is watching. Not now.';
                }
                DV.State.zoneState(this.zone().id).doors[d.id] = 'unlocked';
                DV.Stats.practice('stealth', 2);
                DV.Stats.addXP(15, 'Lock picked');
                if (d.id === 'rec_door' && DV.Quests.isActive('protocol_d')) DV.Quests.activate('protocol_d', 'archive');
                return 'A twist, a click. The lock gives. The door is open to you now.';
              },
              choices: [{ text: 'Continue.', end: true }],
            },
          },
        });
        DV.Dialogue.startScene('lockpick', {});
        this.onSceneStart();
        return;
      }
      DV.UI.notify(d.lockMsg || 'Locked.');
    },

    /* ------------------------------ overlays ------------------------------ */
    openRPGMenu(tab) {
      if (this.inSimulation() && tab !== 'character' && tab) { DV.UI.notify('Your thoughts are elsewhere.'); return; }
      this.state = 'menu';
      // with the in-game cursor the mouse stays captured; otherwise free it for the menu
      if (!DV.Cursor.enabled()) DV.Input.exitLock();
      DV.Input.clearMovement();
      DV.RPGMenu.open(tab);
    },
    openWait() {
      this.state = 'wait';
      if (!DV.Cursor.enabled()) DV.Input.exitLock();
      DV.Menus.showWait();
    },
    closeOverlay() {
      if (DV.RPGMenu.isOpen()) DV.RPGMenu.close();
      DV.Menus.closeSide();
      if (this.state === 'menu' || this.state === 'wait') this.state = 'playing';
      DV.Input.clearMovement();
      DV.Input.takeMouse();
      if (this.state === 'playing') DV.Input.requestLock();
      this.hintTimer = 4;
    },
    pause() {
      if (this.state === 'paused') return;
      if (DV.RPGMenu.isOpen()) DV.RPGMenu.close();
      this.prevState = this.state === 'dialogue' || this.state === 'activity' ? this.state : 'playing';
      this.state = 'paused';
      DV.Input.exitLock();
      DV.Input.clearMovement();
      DV.Menus.showPause();
    },
    resume() {
      DV.Menus.hidePause();
      DV.Menus.closeSide();
      this.state = this.prevState === 'dialogue' && DV.Dialogue.isActive() ? 'dialogue' : this.prevState === 'activity' && DV.Activity.active() ? 'activity' : 'playing';
      DV.Input.clearMovement();
      if (this.state === 'playing' || this.state === 'activity') DV.Input.requestLock();
      this.hintTimer = 4;
    },
    onCanvasClick() {
      DV.Audio.init();
      if (this.state === 'playing' && !DV.UI.modalOpen) DV.Input.requestLock();
    },

    /* ------------------------------ waiting ------------------------------ */
    waitMinutes(mins) {
      this.doWait(() => DV.Clock.skip(mins));
    },
    waitUntil(t) {
      this.doWait(() => {
        const now = DV.Clock.minutes();
        if (t > now) DV.Clock.skipTo(t);
      });
    },
    doWait(fn) {
      this.state = 'transition';
      DV.UI.fade(1, 600).then(() => {
        fn();
        DV.NPCAI.syncAll();
        // the player's seat may have been "taken" by a snapping NPC — keep the player's claim
        if (DV.Player.seat) DV.Player.seat.occupant = 'player';
        this.state = 'playing';
        DV.Input.requestLock();
        DV.UI.notify('You wait. It is now ' + DV.Clock.str() + '.');
        DV.UI.fade(0, 700);
      });
    },

    /* ------------------------------ aptitude test hand-off ------------------------------ */
    beginAptitudeTest() {
      this.state = 'transition';
      this.testStartTime = DV.Clock.minutes();
      DV.Aptitude.start();
      const chair = this.zone().spot('tr4_chair');
      if (chair) chair.occupant = 'player';
      DV.Audio.play('whoosh');
      DV.Audio.setMusic('sim');
      DV.UI.fade(1, 2200, true).then(() => DV.Sim.start());
    },
    returnFromTest() {
      this.state = 'transition';
      DV.Aptitude.compute();
      DV.UI.fade(1, 1500, true).then(() => {
        DV.Sim.cleanup();
        const zone = DV.World.activate(HOME); // (the aptitude test only happens at the Testing Center)
        DV.NPCs.attach(HOME);
        this.scene.add(DV.Player.model.root);
        DV.UI.simMode(false);
        DV.Player.moveScale = 1;
        DV.Player.surfaceOverride = null;
        DV.Clock.skipTo((this.testStartTime + 42) % 1440);
        DV.NPCAI.syncAll();
        const chair = zone.spot('tr4_chair');
        DV.Player.place(chair.x, chair.z, chair.rot);
        this.sitOn(chair, true);
        this.rig.yaw = chair.rot + Math.PI;
        this.rig.follow(true);
        for (const o of ['checkin', 'security', 'wait', 'report', 'technician']) if (DV.Quests.obj('aptitude_day', o) !== 'done') DV.Quests.q('aptitude_day').objectives[o] = 'done';
        DV.Quests.setObj('aptitude_day', 'simulation', 'done', 'You completed the simulation.');
        DV.Quests.activate('aptitude_day', 'results');
        DV.Audio.setMusic('none');
        this.updateAmbience();
        this.triggerState = {};
        this.lastRoom = null;
        DV.UI.fade(0, 2200, true).then(() => {
          this.state = 'playing';
          const tech = DV.NPCs.get('claire_dawson');
          if (tech && tech.present) this.talkTo(tech, true);
        });
      });
    },
    // the results talk is done: show the banner once the conversation closes (never over it)
    showCompletionAfterTalk() {
      if (DV.Dialogue.isActive()) this.completionPending = true;
      else setTimeout(() => this.showCompletion(), 450);
    },
    showCompletion() {
      if (this.state === 'banner' || document.getElementById('banner')) return;
      if (DV.Dialogue.isActive()) { this.completionPending = true; return; }
      this.state = 'banner';
      if (!DV.Cursor.enabled()) DV.Input.exitLock();
      DV.Audio.setMusic('calm');
      DV.UI.banner('APTITUDE TEST COMPLETE', 'YOUR CHOOSING CEREMONY AWAITS.', 'Click or press any key to keep exploring · Build 1 complete', () => {
        DV.UI.modalOpen = null;
        this.state = 'playing';
        this.rig.follow();
        DV.Input.clearMovement();
        DV.Input.requestLock();
        DV.Audio.setMusic('none');
        DV.Save.write('auto');
        DV.UI.notify('Autosaved. Explore as long as you like — when you are ready, the bus home waits outside the front gate.', 'info');
        DV.Build2.beginGoingHome();
      });
    },
    autosaveSoon() {
      this.autosaveTimer = 2;
    },

    /* ------------------------------ load / quit ------------------------------ */
    loadSlot(slot) {
      const st = DV.Save.read(slot);
      if (!st) { DV.UI.notify('Could not load that save.', 'quest_fail'); return; }
      this.completionPending = false;
      if (DV.Dialogue.isActive()) DV.Dialogue.end(true);
      if (DV.Activity.active()) DV.Activity.abort();
      if (DV.Sim && DV.Sim.active) DV.Sim.cleanup();
      this.leaveChapter();
      DV.RPGMenu.close && DV.RPGMenu.isOpen() && DV.RPGMenu.close();
      DV.DialogueUI.hide();
      DV.State.data = st;
      // reset transient world bits
      for (const n of DV.NPCs.all) { n.present = false; n.taskKey = null; n.spot = null; n.mode = 'absent'; n.path = null; }
      for (const z of Object.values(DV.World.zones)) for (const id in z.spots) z.spots[id].occupant = null;
      DV.Menus.hideAll();
      DV.Creator.close();
      this.hideMenuFigures();
      this.enterWorld(true);
    },
    quitToMenu() {
      if (DV.Dialogue.isActive()) DV.Dialogue.end(true);
      if (DV.Activity.active()) DV.Activity.abort();
      if (DV.Sim && DV.Sim.active) DV.Sim.cleanup();
      this.leaveChapter();
      DV.DialogueUI.hide();
      if (DV.RPGMenu.isOpen()) DV.RPGMenu.close();
      DV.Creator.close();
      DV.UI.simMode(false);
      DV.UI.fade(0, 10);
      DV.Menus.hideAll();
      this.showMainMenu();
    },
  };

  DV.Events.on('dialogue:start', (e) => { if (e.scene && DV.Game.state === 'playing') DV.Game.onSceneStart(); });
  DV.Game = Game;
})();
