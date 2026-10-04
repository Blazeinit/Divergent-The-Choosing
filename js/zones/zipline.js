/* ==========================================================================
   DIVERGENT — Build 3: the zip line (an optional night out with Bo)
   The train, a hundred floors in a service lift, a roof in the wind, and a
   steel cable that drops toward the lights of the city. You're strapped in
   face down. Spread your arms, look around — and brake when the end comes
   up at you, or don't.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const ANCHOR = new THREE.Vector3(10, 2.3, 5);
  const END = new THREE.Vector3(10 + 560, -292, 5 + 230);

  (function defineRoof() {
    const props = [
      { type: 'vent', x: 3, z: 8, rotDeg: 0 },
      { type: 'duct', x: 4, z: 2, len: 4, rotDeg: 90 },
      { type: 'crate', x: 2, z: 5, size: 0.9, stack: true },
      { type: 'barrel', x: 13, z: 9, mat: 'rust' },
    ];
    DV.Zones.define('hancock_roof', {
      name: 'The Hancock Building',
      region: 'A hundred floors up',
      chapter: true,
      noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 16, z1: 12 },
      buildingHeight: 1,
      fog: { color: 0x0c1220, near: 120, far: 1100 },
      sky: { top: 0x04060c, horizon: 0x1a2236, ground: 0x05070a, skyline: false },
      exterior: { sunDir: [0.3, 0.8, 0.2], sunColor: [0.15, 0.17, 0.25], ambient: [0.22, 0.24, 0.32] },
      charLight: { ambient: 0.35, hemi: 0.3, dir: 0.4, dirColor: 0x8aa0ff },
      ambience: 'outdoor',
      reverb: 'exterior',
      rooms: [{ id: 'roof', name: 'Roof', x0: 0, z0: 0, x1: 14, z1: 10, exterior: true, floor: 'gravel', edge: 'wall', edgeH: 1.0, edgeMat: 'concrete', light: { ambient: [0.22, 0.24, 0.32], list: [[11, 5, 0.9, 2.6], [3, 3, 0.6, 2.4]], range: 7, color: [1, 0.85, 0.6] } }],
      doors: [],
      props,
      spawn: { x: 4, z: 5, rot: Math.PI / 2 },
      build(ctx) {
        const city = DV.City.build({
          seed: 913, y: -300,
          campus: [-20, -20, 30, 30],
          gridX: [-546, -470, -394, -318, -242, -166, -90, -26, 40, 120, 196, 272, 348, 424, 500, 576, 652],
          gridZ: [-460, -396, -332, -268, -204, -140, -76, -26, 40, 120, 184, 248, 312, 376, 440],
          radius: 900, hub: [380, -120], marshX: 760, ferris: [820, 120],
          haze: 0x0c1220, hazeK: 0.0014, ambient: 0x3a4466, lit: 1, shadowAmt: 0,
          cloudLight: 0x2a3048, cloudDark: 0x0a0c14, puffTint: 0x30364c, cover: 0.0,
        });
        ctx.add(city.group);
        ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
        // the tower under you
        const conc = DV.Tex.get('concrete_dark').clone(); conc.needsUpdate = true; conc.wrapS = conc.wrapT = THREE.RepeatWrapping; conc.repeat.set(4, 60);
        const tower = new THREE.Mesh(new THREE.BoxGeometry(14.4, 300, 10.4), new THREE.MeshBasicMaterial({ map: conc, color: 0x50545c, fog: true }));
        tower.position.set(7, -150.05, 5);
        ctx.add(tower);
        // the antennae everyone climbs and nobody is allowed to
        for (const [x, z, h] of [[2.5, 1.5, 22], [11.5, 8.5, 18]]) {
          const a = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), new THREE.MeshBasicMaterial({ color: 0x22252c, fog: true }));
          a.position.set(x, h / 2, z); ctx.add(a);
          const blink = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
          blink.position.set(x, h + 0.2, z); ctx.add(blink);
          ctx.update(() => { blink.visible = (performance.now() / 700 | 0) % 2 === 0; });
        }
        // the cable: anchor frame, then steel all the way down into the dark
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.3), new THREE.MeshBasicMaterial({ color: 0x2a2c30, fog: true }));
        frame.position.set(ANCHOR.x - 0.4, 1.3, ANCHOR.z); ctx.add(frame);
        const dir = END.clone().sub(ANCHOR), len = dir.length();
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0x8a8e96, fog: true }));
        cable.position.copy(ANCHOR).addScaledVector(dir, 0.5);
        cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        ctx.add(cable);
        // the landing: a lit roof far below, people waiting with torches
        const pad = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 24), new THREE.MeshBasicMaterial({ color: 0x3a3836, fog: true }));
        pad.position.set(END.x + 12, END.y - 3.2, END.z + 4); ctx.add(pad);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow.rotation.x = -Math.PI / 2; glow.position.set(END.x + 12, END.y - 2.15, END.z + 4); ctx.add(glow);
        ctx.zone.cable = { a: ANCHOR, b: END, len };
        ctx.interact({ id: 'harness', kind: 'action', x: ANCHOR.x - 1.2, y: 1, z: ANCHOR.z, radius: 1.8, label: 'Strap in', name: 'Zip Line Harness', cond: () => DV.Chapter.id === 'zip_line' && DV.Chapter.flag('ready'), onUse: () => DV.Chapter.script.ride(DV.Chapter) });
      },
      onExit(zone) {
        if (zone.city && zone.city.train && zone.city.train.sound) { zone.city.train.sound.stop(); zone.city.train.sound = null; }
      },
    });
  })();

  /* ------------------------------ the ride ------------------------------ */
  class Ride {
    constructor(onEnd) { this.id = 'zipride'; this.onEnd = onEnd; }
    begin(A) {
      this.A = A; this.s = 0; this.v = 0; this.t = 0; this.spread = 0; this.braked = false; this.brakeAt = null; this.yawOff = 0; this.whoops = 0;
      const c = DV.World.current.cable;
      this.c = c;
      this.dir = c.b.clone().sub(c.a).normalize();
      const h = U.el('div', 'tr-hud', '<div class="tr-box"><div class="tr-title">THE ZIP LINE</div><div class="tr-line"></div><div class="tr-score"></div></div><div class="zip-brake hidden">BRAKE — hold S</div>', A.hud);
      this.h = h;
      A.keys('<b>Mouse</b> look · hold <b>Space</b> spread your arms · hold <b>S</b> to brake at the end');
      A.announce('GO', 1.2);
      DV.Audio.play('whoosh', { volume: 1 });
      this.wind = 0;
    }
    update(dt, input, A) {
      this.t += dt;
      const c = this.c;
      const [mx] = input.takeMouse(); input.takeWheel();
      this.yawOff = U.clamp(this.yawOff - mx * 0.002 * DV.Settings.get('mouseSensitivity'), -1.4, 1.4);
      this.yawOff *= Math.pow(0.6, dt);
      const spreading = input.down('Space');
      this.spread = U.damp(this.spread, spreading ? 1 : 0, 6, dt);
      if (spreading && this.whoops < 2 && Math.random() < dt * 0.6) { this.whoops++; DV.Audio.play('roar', { secs: 1.2, volume: 0.35 }); }
      const left = c.len - this.s;
      const braking = input.down('KeyS') || input.down('ArrowDown');
      if (left < 90 && !this.brakeShown) { this.brakeShown = true; this.h.querySelector('.zip-brake').classList.remove('hidden'); }
      // gravity along the cable, drag (more with your arms out), the brake
      let a = 9.8 * (-this.dir.y) - this.v * this.v * (0.0032 + this.spread * 0.0018);
      if (braking && left < 90) { a -= 14; if (!this.brakeAt) this.brakeAt = left; }
      this.v = Math.max(braking && left < 90 ? 0 : 3, this.v + a * dt);
      this.s += this.v * dt;
      // the end of the line
      if (this.s >= c.len - 1.5 || (this.v <= 0.2 && left < 90)) { this.finish(); return; }
      const pos = c.a.clone().addScaledVector(this.dir, this.s);
      const P = DV.Player;
      P.x = pos.x; P.z = pos.z; P.y = pos.y - 1.85;
      P.rot = Math.atan2(this.dir.x, this.dir.z);
      P.syncModel();
      P.model.animate(dt, { speed: 0, action: this.spread > 0.5 ? 'fall' : 'hang' });
      // the camera rides behind and a little above, swinging with the mouse
      const back = this.dir.clone().multiplyScalar(-1);
      const side = new THREE.Vector3(-this.dir.z, 0, this.dir.x).normalize();
      const yaw = this.yawOff;
      const off = back.clone().multiplyScalar(Math.cos(yaw) * 3.4).addScaledVector(side, Math.sin(yaw) * 3.4);
      const cam = new THREE.Vector3(P.x, P.y + 1.6, P.z).add(off).add(new THREE.Vector3(0, 0.9, 0));
      const look = new THREE.Vector3(P.x, P.y + 0.6, P.z).addScaledVector(this.dir, 6);
      DV.Game.rig.setTrack(cam, look, 14, this.t < 0.05);
      DV.Game.rig.shake = Math.max(DV.Game.rig.shake, Math.min(0.05, this.v / 900));
      this.h.querySelector('.tr-line').textContent = Math.round(this.v * 3.6) + ' km/h';
      this.h.querySelector('.tr-score').textContent = Math.max(0, Math.round(left)) + ' m';
      this.wind += dt;
      if (this.wind > 0.7) { this.wind = 0; DV.Audio.play('gust', { volume: U.clamp(this.v / 30, 0.2, 1) }); }
    }
    finish() {
      if (this.done) return;
      this.done = true;
      const left = this.c.len - this.s;
      const how = !this.brakeAt ? 'slam' : left > 25 ? 'short' : 'clean';
      this.A.announce(how === 'clean' ? 'PERFECT LANDING' : how === 'slam' ? 'OOF' : 'TOO EARLY', 1.6, how === 'clean' ? 'good' : '');
      DV.Audio.play(how === 'slam' ? 'punch_heavy' : 'land', { volume: 1 });
      DV.Game.rig.shake = how === 'slam' ? 0.5 : 0.15;
      this.A.finish({ how, top: Math.round(this.top || 0) });
    }
    end() {}
  }

  DV.Chapter.define('zip_line', {
    zone: 'hancock_roof',
    title: 'THE HANCOCK BUILDING\nA HUNDRED FLOORS UP',
    start(Ch, zone, opts) {
      DV.Audio.setMusic('none');
      const P = DV.Player;
      const day = DV.Clock.day();
      DV.State.data.world.time = U.parseTime('22:20');
      Ch.bo = Ch.actor({ id: 'bo', name: 'Bo Kaminski', app: DV.NPCs.get('d_bo').appearance(), x: 9, z: 6.4, rot: -Math.PI / 2, action: 'idle' });
      // the members who came along, and your friends if you made any
      const crew = [];
      const fl = (n) => !!DV.State.flag(n);
      if (DV.Initiation.here('d_nate')) crew.push({ id: 'd_nate', x: 5.5, z: 7.4 });
      if (DV.Initiation.here('d_kat') && (fl('ally_kat') || DV.Reputation.rel('d_kat') >= 10)) crew.push({ id: 'd_kat', x: 6.6, z: 7.9 });
      crew.push({ id: 'd_tess', x: 7.4, z: 2.6 }, { id: 'd_ike', x: 4.2, z: 2.4 }, { id: 'd_jada', x: 5.2, z: 2.0 });
      Ch.crew = crew.map((c) => { const def = DV.NPCData.get(c.id); const a = Ch.actor({ id: c.id, name: def.name, app: DV.NPCs.get(c.id).appearance(), x: c.x, z: c.z, rot: 0, action: 'idle' }); a.face(9, 5); return a; });
      P.place(4, 5, Math.PI / 2);
      Ch.cut(true);
      Ch.shot([2, 2.4, 8.6], [10, 1.2, 4.6], true);
      Ch.seq([
        () => 1.0,
        () => { Ch.voice('', '[A train, a hundred floors in a groaning service lift, and a roof in the wind. The city is a field of lights in every direction, all the way to the fence.]', 5); return 5.2; },
        () => { Ch.say(Ch.bo, 'Harness clips to the pulley, pulley rides the cable, cable goes down there. [He points at the dark.] You go face first. You scream if you want. Everybody screams.', 5); return 5.2; },
        () => { const n = Ch.crew.find((a) => a.id === 'd_nate'); if (n) Ch.say(n, 'I\'m not going to scream. I\'m going to SING.', 2.6); return 2.8; },
        () => { Ch.say(Ch.bo, 'Initiate goes first. That\'s the rule. I just made it.', 3); return 3.1; },
        () => { Ch.cut(false); Ch.setFlag('ready'); Ch.hint = 'Walk to the harness by the cable and press E'; },
      ], 'roof');
    },
    ride(Ch) {
      if (Ch.flag('riding')) return;
      Ch.setFlag('riding');
      Ch.hint = null;
      DV.Audio.play('clank', { volume: 0.8 });
      Ch.say(Ch.bo, 'Clipped in. Three, two —', 1.6);
      Ch.after(1.4, () => DV.Activity.start(new Ride(), (res) => this.landed(Ch, res)));
    },
    landed(Ch, res) {
      const P = DV.Player;
      DV.Quests.setObj('zip_line', 'ride', 'done', res.how === 'clean' ? 'You flew over the city and braked perfectly at the bottom.' : res.how === 'slam' ? 'You flew over the city and hit the end stop hard enough to see stars.' : 'You flew over the city and braked so early they had to haul you in.');
      DV.Quests.complete('zip_line', res.how);
      DV.Reputation.add('dauntless', res.how === 'clean' ? 4 : 2);
      DV.State.setFlag('rode_zip_line');
      DV.Stats.practice('composure', 1.5);
      Ch.cut(true);
      Ch.shot([P.x - 6, P.y + 2.5, P.z - 4], [P.x, P.y + 0.4, P.z], true);
      Ch.seq([
        () => { Ch.voice('', res.how === 'slam' ? '[You hit the end stop like a sack of flour and hang there laughing, upside down, while somebody below you cheers.]' : '[For the length of the cable you are not an initiate, not a transfer, not a number on a board. You are just fast.]', 5); return 5.2; },
        () => { Ch.voice('Bo Kaminski', 'Welcome to Dauntless. Properly, this time.', 3.5); return 3.6; },
        () => {
          // the train back, and bed
          const t = U.parseTime('23:50');
          DV.District.enter('dauntless', { spawn: [1.75, -3.4, 0], time: U.formatTime(t), fadeOut: 1400 });
        },
      ], 'end');
    },
  });

  /* ------------------------------ styles for the ride ------------------------------ */
  const css = document.createElement('style');
  css.textContent = '.zip-brake { position: absolute; left: 50%; top: 62%; transform: translateX(-50%); font-family: var(--serif); font-size: 22px; letter-spacing: 0.24em; color: #ff8a6a; text-shadow: 0 2px 0 #000; animation: zipblink 0.5s steps(2) infinite; } @keyframes zipblink { 50% { opacity: 0.35; } }';
  document.head.appendChild(css);
})();
