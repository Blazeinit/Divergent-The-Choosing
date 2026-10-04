/* ==========================================================================
   DIVERGENT — Build 2, chapter 3 (Dauntless): getting in
   The Dauntless don't walk to their compound. You run for a moving train
   and jump into an open door; ride it across the city; jump from the train
   onto a roof (too early or too late and you fall, or ride on to nowhere);
   then step off a ledge into the dark — into the net — and the Pit.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const PL = () => DV.State.data.player;
  const isTransfer = () => PL().upbringing !== 'dauntless';
  // who's with you: the Dauntless initiates from the ceremony
  // the initiates who chose Dauntless with you, in black now
  const initiates = () => (DV.Hub ? DV.Hub.initiatesOf('dauntless') : []);
  const adult = (app, h) => { app.height = (app.height || 1) * (h || 1.05); return app; };
  const member = (i, sex) => adult(DV.Character.fromFaction('dauntless', sex || (i % 2 ? 'f' : 'm'), 'member:' + i, { age: 20 + ((i * 7) % 20) }));
  const LEADER = () => adult(DV.Character.fromFaction('dauntless', 'f', 'dana-cole', { age: 34 }), 1.07);
  const INSTRUCTOR = () => adult(DV.Character.fromFaction('dauntless', 'm', 'mark-rivera', { age: 19 }), 1.08);
  DV.DauntlessCast = { LEADER, INSTRUCTOR, member }; // (the same faces again in the Build 3 compound)

  /* ============================== 1. the run ============================== */
  const RUN = { len: 460, trainZ: 4.7, cars: 6, speed: 6.2 };
  (function defineRun() {
    const props = [];
    for (let x = 6; x < RUN.len; x += 12) props.push({ type: 'railing', x, z: 0.06, len: 12, h: 1.1 });
    DV.Zones.define('l_platform', {
      name: 'The L',
      region: 'Elevated tracks · north line',
      chapter: true,
      noDiscover: true,
      bounds: { x0: -4, z0: -4, x1: RUN.len + 4, z1: 10 },
      buildingHeight: 1,
      fog: { color: 0x98a0a6, near: 45, far: 320 },
      sky: { top: 0x5b6773, horizon: 0x9ca3a9, ground: 0x585b5d, skyline: false },
      exterior: { sunDir: [0.45, 0.8, -0.35], sunColor: [0.85, 0.85, 0.82], ambient: [0.5, 0.52, 0.56] },
      rooms: [{ id: 'walkway', name: 'Track Walkway', x0: 0, z0: 0, x1: RUN.len, z1: 2.4, exterior: true, floor: 'grate', edge: 'none' }],
      doors: [],
      props,
      spawn: { x: 20, z: 1.2, rot: Math.PI / 2 },
      build(ctx) {
        const city = DV.City.build({
          seed: 77, y: -7.4,
          campus: [-30, -3, RUN.len + 30, 9],
          gridX: [-546, -470, -394, -318, -242, -166, -90, -14, 62, 138, 214, 290, 366, 442, 518, 594, 670],
          gridZ: [-460, -396, -332, -268, -204, -140, -76, -18, [4.7, 14], 30, 94, 158, 222, 286, 350, 414],
          radius: 560, hub: [240, -330], marshX: 900,
          track: { x0: -900, x1: 1300, z0: 2.4, z1: 7.0, y: 7.4, span: 15 },
          train: false,
          haze: 0x98a0a6,
        });
        ctx.add(city.group);
        ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
      },
    });
  })();
  // the boarding train: six cars, a dark open door in the middle of each
  function makeBoardingTrain(cars) {
    const mesh = DV.City.trainMesh(cars);
    const L = mesh.userData.length, carL = L / cars;
    const doors = [];
    const black = new THREE.MeshBasicMaterial({ color: 0x0b0b0c, fog: true });
    for (let k = 0; k < cars; k++) {
      const cx = -L / 2 + k * carL + 7.1;
      const q = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.3), black);
      q.position.set(cx, 0.5 + 1.2, -1.46);
      q.rotation.y = Math.PI;
      mesh.add(q);
      doors.push(cx);
    }
    mesh.userData.doors = doors;
    return mesh;
  }

  DV.Chapter.define('dauntless_run', {
    zone: 'l_platform',
    title: 'THE TRAIN\nDAY 2 · 10:40',
    day: 2,
    time: '10:40',
    start(Ch, zone) {
      DV.Audio.setMusic('dauntless');
      DV.Quests.activate('new_faction', 'arrive', 'Run alongside the train and jump into an open door.');
      Ch.checkpoint('run');
      const train = makeBoardingTrain(RUN.cars);
      train.position.set(-85, 0, RUN.trainZ);
      zone.group.add(train);
      Ch.addObject({ isObject3D: false, dispose() { if (train.parent) train.parent.remove(train); } });
      Ch.train = train;
      Ch.trainX = -85;
      Ch.boarded = false;
      // the others, waiting to run
      const people = initiates().slice(0, 5);
      Ch.runners = [];
      people.forEach((p, i) => Ch.runners.push(Ch.actor({ id: p.id, name: p.name, app: p.app, x: 24 + i * 3.2, z: 0.7 + (i % 2) * 0.9, rot: -Math.PI / 2, action: 'idle' })));
      for (let i = 0; i < 4; i++) Ch.runners.push(Ch.actor({ id: 'm' + i, name: 'Dauntless', app: member(i), x: 40 + i * 4, z: 1.2 + (i % 2) * 0.6, rot: -Math.PI / 2, action: 'idle' }));
      Ch.after(1.0, () => { DV.Audio.play('horn', { volume: 1 }); Ch.say(Ch.runners[0], 'Here it comes! Don\'t think — RUN!', 3); });
      Ch.after(2.5, () => DV.UI.notify('Run alongside the train (hold Shift) and jump (Space) into an open door.', 'info'));
    },
    update(Ch, dt, zone) {
      const P = DV.Player;
      if (Ch.boarded) return;
      Ch.trainX += RUN.speed * dt;
      Ch.train.position.x = Ch.trainX;
      const L = Ch.train.userData.length;
      // sound rides with the train
      if (!Ch.trainSound && DV.Audio.ready) Ch.trainSound = DV.Audio.mover('train');
      if (Ch.trainSound) Ch.trainSound.update(Ch.trainX, RUN.trainZ, RUN.speed);
      // the others start running when the train draws level, and dive in through a door
      for (const a of Ch.runners) {
        if (a.ghost) continue;
        const front = Ch.trainX + L / 2;
        if (front > a.x - 6 && !a.running) { a.running = true; }
        if (a.running) {
          a.queue = [[a.x + 5.4 * dt * 4, a.z]]; a.spd = 5.4;
          const door = Ch.train.userData.doors.find((d) => Math.abs(Ch.trainX + d - a.x) < 0.35);
          if (door !== undefined && Ch.trainX + L / 2 > a.x + 4) { a.ghost = true; a.model.root.visible = false; DV.Audio.play('land', { x: a.x, z: a.z, volume: 0.6 }); }
        }
      }
      // you: jump while level with an open door, close to the edge
      if (P.justJumped && P.z > 1.4) {
        const door = Ch.train.userData.doors.find((d) => Math.abs(Ch.trainX + d - P.x) < 0.75);
        if (door !== undefined) return this.board(Ch);
      }
      // missed it
      if (Ch.trainX - L / 2 > P.x + 4 && !Ch.flag('missed')) {
        Ch.setFlag('missed');
        Ch.scene('dauntless_missed');
      }
    },
    board(Ch) {
      Ch.boarded = true;
      DV.Stats.practice('athletics', 2);
      DV.Stats.addXP(25, 'Caught the train');
      DV.Reputation.add('dauntless', 3);
      if (Ch.trainSound) { Ch.trainSound.stop(); Ch.trainSound = null; }
      Ch.cut(true);
      DV.Player.cineAction = 'jump';
      DV.Audio.play('land', { volume: 1 });
      DV.Game.rig.shake = 0.3;
      DV.UI.fade(1, 600).then(() => DV.Chapter.goto('dauntless_train', { fadeOut: 10 }));
    },
    onDialogueEnd(Ch, e) {
      if (e.tree === 'dauntless_missed' && !Ch.boarded) {
        if (DV.Chapter.retry) { DV.Chapter.retry = false; DV.Chapter.goto('dauntless_run'); }
      }
    },
  });
  DV.DialogueDB.add('dauntless_missed', {
    entry: 'start',
    nodes: {
      start: {
        speaker: '',
        text: '[The last car clatters past and away down the line. Somewhere ahead, a cheer goes up from the open doors. You are standing on the tracks alone.]\n\nThe Dauntless don\'t wait for anyone. Miss the train, and you are factionless.',
        choices: [
          { text: 'Run for the next one. (Try again)', end: true, effect: () => { DV.Chapter.retry = true; } },
        ],
      },
    },
  });

  /* ============================== 2. the ride ============================== */
  const RIDE = { speed: 11, roofAt: 26, doorX: 7.1 };
  (function defineCar() {
    const props = [
      { type: 'bench', x: 3.3, z: 2.32, rotDeg: 180, len: 4.2, seatable: false, back: false, wood: 'metal_painted' },
      { type: 'bench', x: 10.9, z: 2.32, rotDeg: 180, len: 4.2, seatable: false, back: false, wood: 'metal_painted' },
      { type: 'bench', x: 3.0, z: 0.38, rotDeg: 0, len: 3.6, seatable: false, back: false, wood: 'metal_painted' },
      { type: 'bench', x: 11.2, z: 0.38, rotDeg: 0, len: 3.6, seatable: false, back: false, wood: 'metal_painted' },
      { type: 'pipes', x: 7.1, z: 1.35, len: 13.4, y: 2.15, n: 1 },
    ];
    DV.Zones.define('l_car', {
      name: 'The L',
      region: 'Riding the train',
      chapter: true,
      noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 16, z1: 5 },
      buildingHeight: 2.6,
      facade: 'metal_painted',
      fog: { color: 0x98a0a6, near: 45, far: 320 },
      sky: { top: 0x5b6773, horizon: 0x9ca3a9, ground: 0x585b5d, skyline: false },
      exterior: { sunDir: [0.45, 0.8, -0.35], sunColor: [0.85, 0.85, 0.82], ambient: [0.5, 0.52, 0.56] },
      rooms: [{ id: 'car', name: 'Train Car', x0: 0, z0: 0, x1: 14.2, z1: 2.7, h: 2.4, floor: 'metal_plate', wall: 'metal_painted', ceiling: 'metal', light: { ambient: [0.4, 0.41, 0.43], color: [0.92, 0.96, 1], intensity: 0.7, spacing: 3.5, range: 4.5, fixture: 'tube' } }],
      doors: [{ id: 'car_door', x: RIDE.doorX, z: 0, dir: 'x', w: 1.4, type: 'opening', h: 2.1 }],
      windows: [1.6, 4.0, 10.2, 12.6].flatMap((x) => [{ id: 'cw_s' + x, x, z: 0, dir: 'x', w: 1.4, sill: 1.0, top: 1.9 }, { id: 'cw_n' + x, x, z: 2.7, dir: 'x', w: 1.4, sill: 1.0, top: 1.9 }]),
      props,
      spawn: { x: 8.4, z: 1.2, rot: Math.PI },
      build(ctx) {
        // the city streams past: we move it, not the car
        const city = DV.City.build({
          seed: 78, y: -7.45,
          campus: [-20, -4, 40, 7],
          gridX: [-546, -470, -394, -318, -242, -166, -90, -14, 62, 138, 214, 290, 366, 442, 518, 594],
          gridZ: [-460, -396, -332, -268, -204, -140, -76, -14, [1.35, 9], 22, 86, 150, 214, 278, 342, 406],
          radius: 620, hub: [120, 300], marshX: 900,
          keepClear: [[-25, -70, 50, -2]], // (the block where the roof is, in the city's own coordinates)
          track: { x0: -900, x1: 1300, z0: -0.9, z1: 3.6, y: 7.4, span: 15 },
          train: false,
          haze: 0x98a0a6,
        });
        ctx.add(city.group);
        ctx.zone.city = city;
        ctx.zone.cityX0 = 280; // starts this far ahead and slides back past the car
        city.group.position.x = ctx.zone.cityX0;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
        // the roof you're aiming for: a flat gravel top level with the floor of the car
        const brick = DV.Tex.get('brick').clone(); brick.needsUpdate = true; brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(10, 14);
        const grav = DV.Tex.get('gravel').clone(); grav.needsUpdate = true; grav.wrapS = grav.wrapT = THREE.RepeatWrapping; grav.repeat.set(18, 8);
        const side = new THREE.MeshBasicMaterial({ map: brick, color: 0x9a9894, fog: true });
        const top = new THREE.MeshBasicMaterial({ map: grav, color: 0xbab6b0, fog: true });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(30, 40, 13), [side, side, top, side, side, side]);
        // (in the city's space: y so its top sits 0.9 m under the car floor, edge just off the door)
        // the city starts 280 m ahead and slides back at the train's speed: this puts the
        // roof alongside the door RIDE.roofAt seconds into the ride
        roof.position.set(RIDE.doorX - ctx.zone.cityX0 + RIDE.roofAt * RIDE.speed, -20.9 + 7.45, -1.0 - 6.5);
        city.group.add(roof);
        const parapet = new THREE.Mesh(new THREE.BoxGeometry(30, 0.6, 0.3), side);
        parapet.position.set(roof.position.x, -0.6 + 7.45, -13.8);
        city.group.add(parapet);
        ctx.zone.roof = roof;
      },
    });
  })();

  DV.Chapter.define('dauntless_train', {
    zone: 'l_car',
    day: 2,
    time: '10:44',
    start(Ch, zone) {
      DV.Audio.setMusic('dauntless');
      DV.Quests.activate('new_faction', 'arrive', 'Ride the train. When the roof comes up — jump.');
      Ch.checkpoint('ride');
      zone.city.group.position.x = zone.cityX0;
      Ch.rideT = 0;
      Ch.jumped = false;
      const ppl = initiates();
      const spots = [[2.4, 2.25, Math.PI, 'sit'], [4.2, 2.25, Math.PI, 'sit'], [11.6, 0.45, 0, 'sit'], [12.6, 1.3, -Math.PI / 2, 'hang'], [5.4, 1.3, Math.PI / 2, 'hang'], [10.0, 2.25, Math.PI, 'sit']];
      Ch.inits = ppl.slice(0, spots.length).map((p, i) => Ch.actor({ id: p.id, name: p.name, app: p.app, x: spots[i][0], z: spots[i][1], rot: spots[i][2], action: spots[i][3] }));
      Ch.member = Ch.actor({ id: 'rita', name: 'Rita Vance', app: member(9, 'f'), x: RIDE.doorX + 0.9, z: 0.55, rot: Math.PI, action: 'hang' });
      if (!Ch.ridingSound && DV.Audio.ready) Ch.ridingSound = DV.Audio.mover('train');
      Ch.addObject({ update() {}, dispose() { if (Ch.ridingSound) { Ch.ridingSound.stop(); Ch.ridingSound = null; } } });
      const say = (who, line, t) => () => { if (who) Ch.say(who, DV.Dialogue.fill(line, {}), t || 3); return (t || 3) + 0.4; };
      const byId = (id) => Ch.inits.find((a) => a.id === id) || Ch.inits[0];
      const transfer = isTransfer();
      Ch.seq([
        () => 1.2,
        say(byId('nate_russo'), 'WOOOO! We made it!'),
        say(byId('kat_malone'), 'You made it. Barely. I watched.'),
        say(byId('joey_brennan'), transfer ? 'A transfer, on the first try? Huh. Didn\'t have you down for that.' : 'Dauntless-born. Bet you\'ve done this a hundred times.'),
        say(byId('josh_miller'), 'For the record — I\'m terrified. Candor. We say it out loud.', 3.4),
        say(Ch.member, 'Listen up! This train doesn\'t stop for initiates. We get off on the roof up ahead.', 3.6),
        say(Ch.member, 'You jump when I say jump. Stay on, and you ride it to the end of the line — factionless.', 3.8),
      ], 'banter');
      DV.UI.notify('Stand in the open door. When the roof comes alongside — jump (Space or E).', 'info');
      Ch.interact({
        id: 'roof_jump', kind: 'action', x: RIDE.doorX, y: 1.2, z: 0.5, radius: 1.2, label: 'Jump', name: 'Open Door',
        cond: () => !Ch.jumped,
        onUse: () => this.jump(Ch, zone),
      });
    },
    // where the roof is relative to the door right now (world x of its near and far edges)
    roofSpan(zone) {
      const r = zone.roof, gx = zone.city.group.position.x;
      return [gx + r.position.x - 15, gx + r.position.x + 15];
    },
    update(Ch, dt, zone) {
      if (Ch.jumped) return;
      Ch.rideT += dt;
      zone.city.group.position.x -= RIDE.speed * dt;
      if (Ch.ridingSound) Ch.ridingSound.update(DV.Player.x + 2, DV.Player.z + 3, RIDE.speed);
      // the car sways
      DV.Game.rig.shake = Math.max(DV.Game.rig.shake, 0.04 + 0.03 * Math.sin(Ch.rideT * 9));
      const [x0, x1] = this.roofSpan(zone);
      const dx = RIDE.doorX;
      const open = x0 < dx - 0.6 && x1 > dx + 0.6;
      // the call
      if (!Ch.flag('ready') && x0 - dx < RIDE.speed * 5) { Ch.setFlag('ready'); Ch.say(Ch.member, 'Roof coming up! Get to the door!', 3); }
      if (!Ch.flag('jumpcall') && open) {
        Ch.setFlag('jumpcall');
        Ch.say(Ch.member, 'JUMP!', 1.6);
        DV.UI.subtitle('Rita Vance', 'JUMP!', 1.6);
        // the others go, one after another
        Ch.inits.forEach((a, i) => Ch.after(0.25 + i * 0.3, () => { if (Ch.jumped && !a.ghost) return; a.ghost = true; a.model.root.visible = false; }));
        Ch.after(0.15, () => { Ch.member.ghost = true; Ch.member.model.root.visible = false; });
      }
      // Space in the doorway jumps too
      const P = DV.Player;
      if (P.justJumped && P.z < 0.9 && Math.abs(P.x - dx) < 0.9) this.jump(Ch, zone);
      // rode past it
      if (x1 < dx - 2 && !Ch.flag('lost')) { Ch.setFlag('lost'); Ch.jumped = true; this.fail(Ch, 'late'); }
    },
    jump(Ch, zone) {
      if (Ch.jumped) return;
      Ch.jumped = true;
      const [x0, x1] = this.roofSpan(zone);
      const dx = RIDE.doorX;
      DV.Player.place(dx, 0.4, Math.PI);
      if (x0 < dx - 0.4 && x1 > dx + 0.4) {
        // made it
        DV.Stats.practice('athletics', 2);
        DV.Stats.addXP(30, 'The roof jump');
        DV.Reputation.add('dauntless', 3);
        Ch.cut(true);
        DV.Player.cineAction = 'jump';
        DV.Audio.play('whoosh');
        DV.UI.fade(1, 500).then(() => DV.Chapter.goto('dauntless_roof', { fadeOut: 10 }));
      } else this.fail(Ch, x0 > dx ? 'early' : 'late');
    },
    fail(Ch, why) {
      Ch.cut(true);
      DV.Player.cineAction = why === 'early' ? 'fall' : 'idle';
      DV.Audio.play(why === 'early' ? 'whoosh' : 'error');
      DV.UI.fade(1, 900).then(() => {
        DV.Chapter.failWhy = why;
        Ch.cut(false);
        Ch.scene('dauntless_fell');
        DV.UI.fade(0, 500);
      });
    },
    onDialogueEnd(Ch, e) {
      if (e.tree === 'dauntless_fell') DV.Chapter.goto('dauntless_train', { step: 'ride' });
    },
  });
  DV.DialogueDB.add('dauntless_fell', {
    entry: 'start',
    nodes: {
      start: {
        speaker: '',
        text: () => (DV.Chapter.failWhy === 'early'
          ? '[You jump too soon. There is no roof under you yet — only the gap between buildings, and the street, a very long way down.]\n\nThat\'s how initiates die on the first day. It happens every year.'
          : '[The roof slides past. By the time you move, it\'s gone, and the train is carrying you away from the others, toward the end of the line.]\n\nThe Dauntless won\'t come back for you.'),
        choices: [{ text: 'Try again.', end: true }],
      },
    },
  });

  /* ============================== 3. the roof ============================== */
  (function defineRoof() {
    const props = [
      { type: 'vent', x: 5, z: 12, rotDeg: 0 },
      { type: 'duct', x: 20, z: 6, len: 6, rotDeg: 90 },
      { type: 'crate', x: 22, z: 15, size: 1.0, stack: true },
      { type: 'barrel', x: 3, z: 3, mat: 'rust' },
    ];
    DV.Zones.define('d_roof', {
      name: 'Rooftop',
      region: 'Above the Dauntless compound',
      chapter: true,
      noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 28, z1: 42 },
      buildingHeight: 1,
      fog: { color: 0x98a0a6, near: 45, far: 320 },
      sky: { top: 0x5b6773, horizon: 0x9ca3a9, ground: 0x585b5d, skyline: false },
      exterior: { sunDir: [0.45, 0.8, -0.35], sunColor: [0.85, 0.85, 0.82], ambient: [0.5, 0.52, 0.56] },
      rooms: [{ id: 'roof', name: 'Rooftop', x0: 0, z0: 0, x1: 26, z1: 18, exterior: true, floor: 'gravel', edge: 'wall', edgeH: 0.9, edgeMat: 'concrete' }],
      doors: [],
      props,
      spawn: { x: 7, z: 4, rot: 0.4 },
      build(ctx) {
        const city = DV.City.build({
          seed: 79, y: -26,
          campus: [-12, -10, 40, 50],
          gridX: [-546, -470, -394, -318, -242, -166, -90, -18, 46, 120, 196, 272, 348, 424, 500],
          gridZ: [-460, -396, -332, -268, -204, -140, -76, -16, 56, 120, 184, 248, 312, 376, 440],
          radius: 560, hub: [-180, 330], marshX: 600, ferris: [640, 40],
          track: { x0: -900, x1: 900, z0: -14, z1: -9.4, y: 7.4 + 26, span: 15 },
          trainFirst: 1.5,
          haze: 0x98a0a6,
        });
        ctx.add(city.group);
        ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
        // below the ledge: a lower roof with a black hole in it
        const grav = DV.Tex.get('gravel').clone(); grav.needsUpdate = true; grav.wrapS = grav.wrapT = THREE.RepeatWrapping; grav.repeat.set(16, 14);
        const conc = DV.Tex.get('concrete_dark').clone(); conc.needsUpdate = true; conc.wrapS = conc.wrapT = THREE.RepeatWrapping; conc.repeat.set(10, 10);
        const top = new THREE.MeshBasicMaterial({ map: grav, color: 0x9a968f, fog: true });
        const side = new THREE.MeshBasicMaterial({ map: conc, fog: true });
        const lower = new THREE.Group();
        const mk = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 20, d), [side, side, top, side, side, side]); m.position.set(x, -7 - 10, z); lower.add(m); };
        // a roof 7 m down with a 5 × 5 m hole at (13, 27)
        mk(26, 6.5, 13, 21.25); mk(26, 10.5, 13, 34.75); mk(10.5, 5, 5.25, 27); mk(10.5, 5, 20.75, 27);
        const hole = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 5), new THREE.MeshBasicMaterial({ color: 0x020202 }));
        hole.position.set(13, -7.2, 27);
        lower.add(hole);
        ctx.add(lower);
        // the building you're standing on
        const wall = new THREE.Mesh(new THREE.BoxGeometry(26.4, 26, 18.4), new THREE.MeshBasicMaterial({ map: conc, color: 0x8a8884, fog: true }));
        wall.position.set(13, -13.05, 9);
        ctx.add(wall);
      },
    });
  })();

  DV.Chapter.define('dauntless_roof', {
    zone: 'd_roof',
    day: 2,
    time: '10:52',
    start(Ch, zone) {
      DV.Audio.setMusic('none');
      DV.Quests.activate('new_faction', 'arrive', 'Get into the compound. The only way in is down.');
      Ch.checkpoint('roof');
      Ch.jumpedFirst = false;
      const ppl = initiates();
      Ch.inits = ppl.slice(0, 7).map((p, i) => Ch.actor({ id: p.id, name: p.name, app: p.app, x: 9 + (i % 4) * 2.2, z: 6 + Math.floor(i / 4) * 2.4, rot: 0, action: i === 2 ? 'crouch' : 'idle' }));
      Ch.members = [0, 1, 2].map((i) => Ch.actor({ id: 'rm' + i, name: 'Dauntless', app: member(i + 20), x: 3 + i * 1.5, z: 9 + i, rot: 0.6, action: 'arms_crossed' }));
      Ch.leader = Ch.actor({ id: 'dana', name: 'Dana Cole', app: LEADER(), x: 13, z: 17.55, y: 0.9, rot: Math.PI, action: 'idle' });
      // the landing
      DV.Player.place(6.5, 3.6, 0.4);
      Ch.cut(true);
      DV.Player.cineAction = 'crouch';
      Ch.shot([4, 2.0, 0.8], [7.5, 0.6, 4.8], true);
      DV.Audio.play('land', { volume: 1 });
      DV.Game.rig.shake = 0.35;
      const say = (who, line, t) => () => { Ch.say(who, DV.Dialogue.fill(line, {}), t || 3.4); return (t || 3.4) + 0.3; };
      Ch.seq([
        () => 1.2,
        () => { DV.Player.cineAction = null; Ch.say(Ch.inits[2] || Ch.inits[0], 'Ow. Ow. I\'m fine. Ow.', 2.2); return 1.4; },
        () => { Ch.shot([13, 2.4, 9], [13, 2.0, 17.6]); return 1.0; },
        say(Ch.leader, 'Listen up! I\'m Dana Cole. I\'m one of the leaders of your new faction.'),
        say(Ch.leader, 'Seven floors below this ledge is the members\' entrance to our compound.'),
        say(Ch.leader, 'If you can\'t make yourself jump off it, you don\'t belong with us.'),
        say(Ch.leader, 'Initiates have the honour of going first. So.', 2.8),
        () => { Ch.cut(false); Ch.say(Ch.leader, 'Who\'s first?', 3); Ch.setFlag('open'); Ch.openT = 0; },
      ], 'roof');
      Ch.interact({
        id: 'ledge', kind: 'action', x: 13, y: 1.0, z: 17.2, radius: 1.6,
        label: () => (Ch.flag('someoneJumped') ? 'Jump' : 'Jump first'), name: 'The Ledge',
        cond: () => Ch.flag('open') && !Ch.flag('mejump'),
        onUse: () => this.leap(Ch, zone),
      });
    },
    update(Ch, dt) {
      if (!Ch.flag('open') || Ch.flag('mejump')) return;
      Ch.openT += dt;
      // nobody moves... then Nate goes
      if (!Ch.flag('someoneJumped') && Ch.openT > 13) {
        Ch.setFlag('someoneJumped');
        const n = Ch.inits.find((a) => a.id === 'nate_russo') || Ch.inits[0];
        if (!n) return;
        Ch.say(n, 'Fine. ME.', 1.6);
        n.walk([[13, 16.4], [13, 17.4]], 2.0, (a) => { a.y = 0.9; Ch.say(a, 'WOOOOOOO—', 1.8); Ch.after(0.6, () => { a.ghost = true; a.model.root.visible = false; DV.Audio.play('whoosh', { volume: 0.6 }); }); });
        // the rest follow, one by one
        Ch.inits.filter((a) => a !== n).forEach((a, i) => Ch.after(6 + i * 3.5, () => {
          if (Ch.flag('mejump')) return;
          a.walk([[13, 16.4], [13, 17.4]], 1.6, (b) => { b.y = 0.9; Ch.after(0.9, () => { b.ghost = true; b.model.root.visible = false; }); });
        }));
      }
    },
    leap(Ch, zone) {
      Ch.setFlag('mejump');
      const first = !Ch.flag('someoneJumped');
      DV.State.setFlag('first_jumper', first);
      if (first) { DV.Aptitude && DV.Stats.practice('composure', 2); DV.Reputation.add('dauntless', 5); DV.Stats.addXP(40, 'First jumper'); }
      Ch.cut(true);
      const P = DV.Player;
      P.place(13, 17.2, 0);
      P.y = 0.9;
      P.syncModel();
      P.cineAction = 'idle';
      Ch.shot([13, 2.6, 13.6], [13, 0.5, 22]);
      Ch.leader.say(first ? 'Well, look at that.' : 'Go on.', 2);
      Ch.seq([
        () => 1.4,
        () => { P.cineAction = 'fall'; DV.Audio.play('whoosh'); Ch.fallV = 0; Ch.falling = true; Ch.shot([13, 3, 18.5], [13, -6, 24]); return 1.5; },
        () => { DV.UI.fade(1, 400); return 0.6; },
        () => { Ch.falling = false; DV.Chapter.goto('dauntless_pit', { fadeOut: 10, step: 'net', noTitle: true }); },
      ], 'leap');
      Ch.addObject({ update(dt) { if (!Ch.falling) return; Ch.fallV += 9.8 * dt; P.y -= Ch.fallV * dt; P.z += 2.2 * dt; P.syncModel(); } });
    },
  });

  /* ============================== 4. the net, and the Pit ============================== */
  // soft-edged gradients for the light shafts and the pools of daylight they make
  // (shared and kept: built once, reused each time the Pit is built)
  const glowTex = {};
  const gradTex = (kind) => {
    if (glowTex[kind]) return glowTex[kind];
    const w = 64, h = kind === 'shaft' ? 128 : 64;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let a;
        if (kind === 'shaft') {
          const u = x / (w - 1), v = y / (h - 1); // v = 0 at the roof
          a = Math.pow(Math.sin(Math.PI * u), 1.6) * Math.min(1, v * 8) * Math.pow(1 - v, 0.7);
        } else {
          const dx = (x + 0.5) / w * 2 - 1, dy = (y + 0.5) / h * 2 - 1;
          a = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
          a = a * a * (3 - 2 * a);
        }
        const i = (y * w + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    return (glowTex[kind] = new THREE.CanvasTexture(c));
  };
  (function definePit() {
    // paths cut into the long walls: [height, z from, z to, wall x]; a lantern hangs by every doorway
    const SHELVES = [[4.5, -13.2, 18, 13.6], [9, -13.2, 18, 13.6], [4.5, -13.2, 18, 60.4], [9, -13.2, 18, 60.4], [13.5, -13.2, 10, 60.4]];
    const LANTERNS = [];
    for (const [y, z0, z1, x] of SHELVES) for (let z = z0 + 3; z < z1 - 2; z += 6.5) LANTERNS.push({ x, y, z, warm: (z * 7) % 3 >= 1.5 });
    // the Pit, as parts: the Build 2 arrival uses them as they are, and the Build 3 compound builds around them
    function pitProps() {
      const props = [];
      const add = (type, x, z, o) => props.push(Object.assign({ type, x, z }, o || {}));
      for (let x = 15; x < 60; x += 6) add('railing', x + 3, 19.85, { len: 6, h: 1.15 });
      add('crate', 16, -12, { size: 1, stack: true });
      add('barrel', 59, -12.5, {});
      add('barrel', 58.2, -11.8, { mat: 'rust' });
      add('pipes', 37, -13.8, { len: 44, y: 5, n: 3 });
      add('poster', 13.1, -4, { rotDeg: 90, kind: 'dauntless' });
      return props;
    }
    function pitRooms() {
      return [
        { id: 'net_room', name: 'The Net', x0: 0, z0: 0, x1: 10, z1: 10, h: 7, floor: 'concrete_dark', wall: 'rock', ceiling: 'rock', light: { ambient: [0.1, 0.1, 0.12], color: [0.85, 0.9, 1], intensity: 0.6, spacing: 9, range: 6, fixture: 'bulb', extra: [{ x: 5, z: 5, y: 6.5, intensity: 1.0, range: 7, color: [0.9, 0.92, 1] }] } },
        { id: 'pit_tunnel', name: 'Tunnel', x0: 10, z0: 3.5, x1: 13, z1: 6.5, h: 3, floor: 'concrete_dark', wall: 'rock', ceiling: 'rock', light: { ambient: [0.12, 0.13, 0.17], color: [0.55, 0.7, 1], intensity: 0.8, spacing: 3, range: 4, fixture: 'bulb' } },
        {
          // the glass roof is built in build(): daylight from above, lamps along the paths
          id: 'the_pit', name: 'The Pit', x0: 13, z0: -14, x1: 61, z1: 20, h: 18, floor: 'rock', wall: 'rock', noCeiling: true,
          light: { ambient: [0.42, 0.45, 0.52], color: [1, 0.8, 0.55], intensity: 0.95, spacing: 0, range: 11, fixture: 'none', extra: [
            ...LANTERNS.map((l) => ({ x: l.x + (l.x < 30 ? 0.7 : -0.7), y: l.y + 2.4, z: l.z + 1.2, intensity: 0.75, range: 6.5, color: l.warm ? [1, 0.75, 0.45] : [0.55, 0.7, 1] })),
            { x: 37, z: 19, y: 2, intensity: 0.9, range: 12, color: [0.45, 0.65, 1] },
            { x: 20, z: 19, y: 2, intensity: 0.7, range: 10, color: [0.45, 0.65, 1] },
            { x: 54, z: 19, y: 2, intensity: 0.7, range: 10, color: [0.45, 0.65, 1] },
            // daylight through the roof
            { x: 37, z: 2, y: 14, intensity: 0.75, range: 26, color: [0.8, 0.87, 1] },
            { x: 22, z: -4, y: 12, intensity: 0.5, range: 18, color: [0.8, 0.87, 1] },
            { x: 52, z: 8, y: 12, intensity: 0.5, range: 18, color: [0.8, 0.87, 1] },
          ] },
        },
      ];
    }
    function pitDoors() {
      return [
        { id: 'net_tunnel', x: 10, z: 5, dir: 'z', w: 2.4, type: 'opening' },
        { id: 'tunnel_pit', x: 13, z: 5, dir: 'z', w: 2.4, type: 'opening' },
        { id: 'chasm', x: 37, z: 20, dir: 'x', w: 46, type: 'opening' },
      ];
    }
    function buildPit(ctx) {
      const zone = ctx.zone;
      const rock = DV.Tex.get('rock').clone(); rock.needsUpdate = true; rock.wrapS = rock.wrapT = THREE.RepeatWrapping;
      const rockMat = (rx, ry, col) => { const t = rock.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshBasicMaterial({ map: t, color: col || 0x8a8a92, fog: true }); };
      // the net
      const nt = DV.Tex.get('chainlink').clone(); nt.needsUpdate = true; nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(10, 10);
      const net = new THREE.Mesh(new THREE.PlaneGeometry(6, 6, 6, 6), new THREE.MeshBasicMaterial({ map: nt, color: 0x2a2a2a, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, fog: true }));
      net.rotation.x = -Math.PI / 2;
      net.position.set(5, 1.3, 5.5);
      ctx.add(net);
      zone.net = net;
      // a shaft of light down from the hole
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.6, 6, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfd0ff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.set(5, 4, 5.5);
      ctx.add(beam);
      // the chasm: a long drop beyond the railing, the river roaring at the bottom
      const far = new THREE.Mesh(new THREE.PlaneGeometry(48, 36.4), rockMat(12, 9, 0x6a6e78));
      far.position.set(37, 0.2, 27.5); far.rotation.y = Math.PI;
      ctx.add(far);
      for (const [x, ry] of [[13, Math.PI / 2], [61, -Math.PI / 2]]) {
        const side = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 18.4), rockMat(2, 5, 0x6a6e78));
        side.position.set(x, 9.2, 23.75); side.rotation.y = ry;
        ctx.add(side);
      }
      const drop = new THREE.Mesh(new THREE.BoxGeometry(48, 16, 7.5), [rockMat(2, 4), rockMat(2, 4), rockMat(1, 1, 0x000000), rockMat(1, 1, 0x000000), rockMat(12, 4, 0x55585f), rockMat(12, 4, 0x55585f)]);
      drop.material.forEach((m) => { m.side = THREE.BackSide; });
      drop.position.set(37, -8, 23.75);
      ctx.add(drop);
      const water = new THREE.Mesh(new THREE.PlaneGeometry(48, 7.5, 1, 1), new THREE.MeshBasicMaterial({ map: (() => { const t = DV.Tex.get('water').clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 2); return t; })(), color: 0x6f8aa8, fog: true }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(37, -12, 23.75);
      ctx.add(water);
      ctx.update((dt) => { water.material.map.offset.x -= dt * 0.35; water.material.map.offset.y += dt * 0.05; });
      // spray
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(48, 6), new THREE.MeshBasicMaterial({ color: 0xc8d4e2, transparent: true, opacity: 0.12, depthWrite: false }));
      mist.position.set(37, -8, 22); ctx.add(mist);
      // paths cut into the walls, with doorways to shops and quarters
      const ledge = rockMat(6, 1, 0x7c7c84);
      const dark = new THREE.MeshBasicMaterial({ color: 0x07080a, fog: true });
      const glow = new THREE.MeshBasicMaterial({ color: 0x8ab0ff, fog: true });
      const warm = new THREE.MeshBasicMaterial({ color: 0xffc070, fog: true });
      for (const [y, z0, z1, x] of SHELVES) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, z1 - z0), ledge);
        shelf.position.set(x + (x < 30 ? 0.6 : -0.6), y, (z0 + z1) / 2);
        ctx.add(shelf);
        for (let z = z0 + 3; z < z1 - 2; z += 6.5) {
          const d = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), dark);
          d.position.set(x + (x < 30 ? 0.02 : -0.02), y + 1.3, z); d.rotation.y = x < 30 ? Math.PI / 2 : -Math.PI / 2;
          ctx.add(d);
          const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), (z * 7) % 3 >= 1.5 ? warm : glow);
          l.position.set(x + (x < 30 ? 0.08 : -0.08), y + 2.8, z + 1.2);
          ctx.add(l);
        }
      }
      for (const [x, z, h] of [[16, -13.4, 18], [37, -13.6, 18], [58, -13.4, 18]]) {
        const pipe = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, 0.4), new THREE.MeshBasicMaterial({ color: 0x1c1d22, fog: true }));
        pipe.position.set(x, h / 2, z); ctx.add(pipe);
      }
      // blue lamps along the railing
      for (let x = 16; x < 60; x += 5) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), glow);
        lamp.position.set(x, 1.25, 19.85); ctx.add(lamp);
      }
      // the glass roof, out over the chasm too: pale daylight through grimy panes on an iron frame
      const RX0 = 13, RX1 = 61, RZ0 = -14, RZ1 = 27.5, RY = 18;
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(RX1 - RX0, RZ1 - RZ0), new THREE.MeshBasicMaterial({ color: 0xa9bccb, fog: false }));
      sky.rotation.x = Math.PI / 2;
      sky.position.set((RX0 + RX1) / 2, RY + 0.3, (RZ0 + RZ1) / 2);
      ctx.add(sky);
      const iron = ctx.M('metal_painted'), B = ctx.B;
      for (let x = RX0; x <= RX1 + 0.01; x += 4) B.box(iron, x, RY - 0.35, (RZ0 + RZ1) / 2, 0.22, 0.35, RZ1 - RZ0);
      for (let z = RZ0; z <= RZ1 + 0.01; z += 4.5) B.box(iron, (RX0 + RX1) / 2, RY - 0.25, z, RX1 - RX0, 0.25, 0.18);
      for (const x of [25, 37, 49]) B.box(iron, x, RY - 1.1, (RZ0 + RZ1) / 2, 0.35, 0.75, RZ1 - RZ0); // trusses
      // shafts of daylight slanting down to the floor, and the pools where they land
      const sun = new THREE.Vector3(-0.22, 1, -0.16).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const shaftMat = new THREE.MeshBasicMaterial({ map: gradTex('shaft'), color: 0xe4ecff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const poolMat = new THREE.MeshBasicMaterial({ map: gradTex('pool'), color: 0xd8e2f2, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
      const shafts = [];
      for (const [x, z, w] of [[22, -6, 3.2], [33, 3, 4.2], [46, -3, 3.6], [41, 13, 3], [27, 12, 2.6], [54, 9, 3]]) {
        const len = RY / sun.y;
        const g = new THREE.Group();
        for (let k = 0; k < 2; k++) {
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, len), shaftMat.clone());
          pl.rotation.y = k * Math.PI / 2;
          g.add(pl);
        }
        g.quaternion.setFromUnitVectors(up, sun);
        g.position.set(x + sun.x * len / 2, RY / 2, z + sun.z * len / 2);
        ctx.add(g);
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, w * 1.2), poolMat.clone());
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(x, 0.03, z);
        ctx.add(pool);
        shafts.push({ g, pool, ph: x * 0.37 + z * 0.11 });
      }
      // dust turning over in the light
      const N = 260, dust = new Float32Array(N * 3), seed = [];
      for (let i = 0; i < N; i++) {
        const s = shafts[i % shafts.length], h = 0.5 + ((i * 7919) % 1000) / 1000 * 15;
        const bx = s.pool.position.x + sun.x * h / sun.y, bz = s.pool.position.z + sun.z * h / sun.y;
        seed.push([bx + (((i * 31) % 100) / 100 - 0.5) * 2.4, h, bz + (((i * 57) % 100) / 100 - 0.5) * 2.4, i * 1.7]);
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.BufferAttribute(dust, 3));
      const motes = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xeaf0ff, size: 0.05, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      motes.frustumCulled = false;
      ctx.add(motes);
      let t = 0;
      ctx.update((dt) => {
        t += dt;
        // clouds passing over the glass: the shafts dim and brighten together with their pools
        for (const s of shafts) {
          const k = 0.65 + 0.35 * Math.sin(t * 0.13 + s.ph) * Math.sin(t * 0.071 + s.ph * 1.7);
          s.g.children[0].material.opacity = s.g.children[1].material.opacity = 0.2 * k;
          s.pool.material.opacity = 0.22 * k;
        }
        for (let i = 0; i < N; i++) {
          const d = seed[i], ph = d[3];
          dust[i * 3] = d[0] + Math.sin(t * 0.21 + ph) * 0.5;
          dust[i * 3 + 1] = d[1] + Math.sin(t * 0.13 + ph * 1.3) * 0.6;
          dust[i * 3 + 2] = d[2] + Math.cos(t * 0.17 + ph * 0.7) * 0.5;
        }
        dg.attributes.position.needsUpdate = true;
      });
    }
    DV.DauntlessPit = { SHELVES, LANTERNS, rooms: pitRooms, doors: pitDoors, props: pitProps, build: buildPit };
    DV.Zones.define('d_pit', {
      name: 'The Pit',
      region: 'Dauntless compound',
      chapter: true,
      underground: true,
      relaxed: true,
      chasm: { z: 20 },
      noDiscover: true,
      bounds: { x0: -2, z0: -16, x1: 64, z1: 30 },
      buildingHeight: 18,
      facade: 'rock',
      fog: { color: 0x1a212c, near: 45, far: 170 },
      sky: { visible: false, skyline: false, top: 0x000000, horizon: 0x000000, ground: 0x000000 },
      charLight: { ambient: 0.5, hemi: 0.45, dir: 0.5, dirColor: 0xdfe8ff },
      rooms: pitRooms(),
      doors: pitDoors(),
      props: pitProps(),
      spawn: { x: 5, z: 2.4, rot: 0 },
      build: buildPit,
    });
  })();

  DV.Chapter.define('dauntless_pit', {
    zone: 'd_pit',
    title: 'THE PIT\nDAUNTLESS COMPOUND',
    day: 2,
    time: '11:05',
    canPass() { return true; },
    start(Ch, zone, opts) {
      const P = DV.Player;
      Ch.mark = Ch.actor({ id: 'mark', name: 'Mark Rivera', app: INSTRUCTOR(), x: 5, z: 1.6, rot: 0, action: 'arms_crossed' });
      // members up on the paths and along the railing
      Ch.crowdM = Ch.crowd([
        { x: 20, z: 17.8, rot: Math.PI }, { x: 24, z: 18.2, rot: Math.PI }, { x: 31, z: 17.5, rot: 2.6 }, { x: 44, z: 18, rot: Math.PI }, { x: 50, z: 17.4, rot: -2.6 },
        { x: 18, z: -6, rot: 1.2 }, { x: 22, z: -9, rot: 0.6 }, { x: 52, z: -8, rot: -0.7 }, { x: 56, z: -2, rot: -1.4 },
        { x: 30, z: 4, rot: 0 }, { x: 33, z: 3, rot: 0.3 }, { x: 46, z: 6, rot: -0.4 },
      ], { faction: 'dauntless', prefix: 'pit_', seed: 'pit', adults: true });
      Ch.crowdM.forEach((a) => { a.name = 'Dauntless'; a.lookAt([15, 5]); });
      // the others who jumped before you
      const ppl = initiates();
      Ch.inits = ppl.slice(0, 6).map((p, i) => Ch.actor({ id: p.id, name: p.name, app: p.app, x: 2 + (i % 3) * 1.3, z: 8 + Math.floor(i / 3) * 1.0, rot: Math.PI, action: 'idle' }));
      if (DV.State.flag('first_jumper')) Ch.inits.forEach((a) => { a.model.root.visible = false; a.ghost = true; });
      if (opts.step === 'pit' || opts.step === 'pit_walk') return this.inPit(Ch, zone, true);
      if (opts.step === 'done') { // (a save from after the welcome: Build 3 goes on in the compound)
        Ch.mark.place(37, 17.2); Ch.mark.face(37, 5);
        Ch.inits.forEach((a, i) => a.place(31 + (i % 3) * 2.2, 12.5 + Math.floor(i / 3) * 1.4, Math.PI));
        DV.Player.place(34, 9, 0.2);
        setTimeout(() => DV.District.enter('dauntless', { spawn: [34, 9, 0.2], instant: true }), 0);
        return;
      }
      Ch.checkpoint('net');
      DV.Quests.activate('new_faction', 'arrive', 'You\'re in. Get out of the net.');
      // in the net
      P.place(5, 5.5, 0);
      P.y = 1.3;
      P.syncModel();
      P.cineAction = 'lie';
      Ch.cut(true);
      Ch.shot([3.2, 4.2, 3.0], [5, 1.2, 5.5], true);
      DV.UI.fade(0, 900);
      DV.Audio.play('land', { volume: 1 });
      DV.Game.rig.shake = 0.4;
      Ch.seq([
        () => 1.6,
        () => { Ch.mark.action = 'point'; Ch.say(Ch.mark, 'Grab my hand.', 2); return 1.8; },
        () => { DV.UI.fade(1, 300); return 0.4; },
        () => { P.y = 0; P.place(5, 2.4, Math.PI); P.cineAction = null; Ch.mark.action = 'arms_crossed'; Ch.mark.face(P.x, P.z); Ch.shot([6.6, 1.8, 3.6], [5, 1.5, 1.6], true); DV.UI.fade(0, 400); return 0.6; },
        () => { Ch.cut(false); DV.Game.rig.setShot(new THREE.Vector3(6.6, 1.8, 3.6), new THREE.Vector3(5, 1.5, 1.6)); Ch.scene('dauntless_name'); },
      ], 'net');
    },
    onDialogueEnd(Ch, e) {
      if (e.tree !== 'dauntless_name') return;
      const zone = DV.World.current;
      DV.Game.rig.follow();
      const first = DV.State.flag('first_jumper');
      const nm = DV.State.data.story.dauntlessName || DV.State.data.player.name;
      Ch.say(Ch.mark, first ? 'First jumper — ' + nm + '!' : 'Next one down: ' + nm + '!', 3);
      DV.Audio.play('roar', { secs: 2.2, volume: 0.9 });
      for (const a of Ch.crowdM) { a.action = 'cheer'; Ch.after(2.5, () => { a.action = 'idle'; }); }
      DV.Quests.activate('new_faction', 'arrive', 'Follow Mark into the Pit.');
      Ch.mark.walk([[11.5, 5], [16, 5], [33, 12], [37, 17.2]], 1.5, (a) => { a.face(37, 5); a.action = 'arms_crossed'; });
      Ch.inits.forEach((a, i) => { if (!a.ghost) a.walk([[11.5, 5], [16, 5], [31 + (i % 3) * 2.2, 12.5 + Math.floor(i / 3) * 1.4]], 1.4, (b) => b.face(37, 17)); });
      Ch.checkpoint('pit_walk');
      Ch.setFlag('walking');
    },
    update(Ch, dt) {
      if (Ch.flag('walking') && !Ch.flag('speech') && DV.Player.x > 22) { Ch.setFlag('speech'); this.inPit(Ch, DV.World.current, false); }
    },
    inPit(Ch, zone, resumed) {
      if (resumed) {
        Ch.mark.place(37, 17.2); Ch.mark.face(37, 5); Ch.mark.action = 'arms_crossed';
        Ch.inits.forEach((a, i) => a.place(31 + (i % 3) * 2.2, 12.5 + Math.floor(i / 3) * 1.4, Math.PI));
        DV.Player.place(34, 11, 0.2);
      }
      Ch.checkpoint('pit');
      const say = (line, t) => () => { Ch.say(Ch.mark, DV.Dialogue.fill(line, {}), t || 3.6); return (t || 3.6) + 0.4; };
      Ch.seq([
        () => 1.2,
        say('This is the Pit. It\'s loud, it\'s cold, and as of today it\'s home — for the ones who make it.'),
        say('Behind me is the chasm. The river down there has been cutting through rock for a thousand years. It doesn\'t care about you.'),
        say('Every year somebody tries to prove something on that railing. Don\'t be somebody.'),
        say('Initiation starts at dawn. Eat. Find a bunk. Sleep if you can.', 3.2),
        () => { DV.Audio.setMusic('dauntless'); },
        () => {
          DV.Build2.dressFor('dauntless', 'Mark tosses you a bundle of black: a jacket, boots, a shirt that has clearly been somebody else\'s first.');
          DV.Quests.setObj('new_faction', 'arrive', 'done', 'You made it into the Dauntless compound.');
          DV.Quests.complete('new_faction', 'dauntless');
          Ch.checkpoint('done');
          Ch.banner('WELCOME TO DAUNTLESS', 'INITIATION BEGINS AT DAWN.', 'Click or press any key to continue · Build 3: Stage One', () => {
            // the Pit becomes the whole compound, with everyone in it (Build 3)
            const P = DV.Player;
            DV.District.enter('dauntless', { spawn: [P.x, P.z, P.rot], fadeOut: 700, fadeIn: 1000 });
          });
        },
      ], 'speech');
    },
  });

  DV.DialogueDB.add('dauntless_name', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Mark Rivera', faction: 'dauntless',
        text: () => (DV.State.flag('first_jumper')
          ? '[He hauls you upright and looks you over, eyebrows up.] First jumper. Huh. Didn\'t see that coming. What\'s your name?'
          : '[He hauls you upright.] Keep moving, there\'s more coming down behind you. Name?'),
        choices: [
          { text: () => DV.State.data.player.name + '.', end: true, effect: () => { DV.State.data.story.dauntlessName = DV.State.data.player.name; } },
          { text: () => 'Just "' + DV.State.data.player.name.charAt(0).toUpperCase() + '".', end: true, effect: () => { DV.State.data.story.dauntlessName = DV.State.data.player.name.charAt(0).toUpperCase(); DV.State.setFlag('dauntless_new_name'); }, tag: 'A new start' },
          { text: 'Does it matter?', to: 'matter' },
        ],
      },
      matter: {
        speaker: 'Mark Rivera', faction: 'dauntless',
        text: 'Here? It\'s the only thing you brought with you. Think about it on the way down — you get to pick it once.',
        choices: [
          { text: () => DV.State.data.player.name + '.', end: true, effect: () => { DV.State.data.story.dauntlessName = DV.State.data.player.name; } },
          { text: () => 'Just "' + DV.State.data.player.name.charAt(0).toUpperCase() + '".', end: true, effect: () => { DV.State.data.story.dauntlessName = DV.State.data.player.name.charAt(0).toUpperCase(); DV.State.setFlag('dauntless_new_name'); } },
        ],
      },
    },
  });
})();
