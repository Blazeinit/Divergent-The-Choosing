/* ==========================================================================
   DIVERGENT — Build 3: Erudite, the first week ("Method")
   Day 3   Two benches in Dr. Park's lab. Bench one: three flasks and no
           measuring marks — get exactly four litres of reagent, then five,
           in as few pours as you can. Bench two: a relay board where every
           switch flips its neighbours too; light the whole board.
           She writes down how many moves you took, not how long.
   Day 4   Half past nine at night, Dr. Park's key in your pocket, an errand
           to her office: a grey folder on the desk. There's a red one
           beside it. Footsteps in the corridor.
   Day 5   The examination — her questions, your answers, and what you
           decide to admit you know.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const FW = () => DV.FirstWeek;

  const PL = () => DV.State.data.player;
  const APT = () => DV.State.data.aptitude;
  const adult = (f, sex, seed, age, h) => { const a = DV.Character.fromFaction(f, sex, seed, { age: age || 40 }); a.height = (a.height || 1) * (h || 1.05); return a; };

  /* ============================== the zone ============================== */
  (function () {
    const props = [];
    const add = (type, x, z, o) => props.push(Object.assign({ type, x, z }, o || {}));
    // the lab: benches, the relay console, a blackboard of somebody else's working
    add('table', 6, 7.2, { w: 3.0, d: 1.0, chairs: 0, top: 'metal' });
    add('table', 12, 7.2, { w: 3.0, d: 1.0, chairs: 0, top: 'metal', clutter: true, id: 'el_b2' });
    add('table', 6, 10.6, { w: 3.0, d: 1.0, chairs: 0, top: 'metal', clutter: true, id: 'el_b3' });
    add('console', 17, 1.6, { w: 2.0, rotDeg: 180, id: 'el_relays' });
    add('shelf', 0.5, 5, { rotDeg: 90, len: 3.6, h: 2.2, d: 0.45, levels: 4 });
    add('med_cabinet', 0.4, 9.6, { rotDeg: 90 });
    add('whiteboard', 11, 0.08, { w: 3.6, h: 1.3 });
    add('serum_tray', 20.8, 9.5, {});
    add('banner', 11, 11.9, { rotDeg: 180, faction: 'erudite', y: 3.4, h: 1.6 });
    // Dr. Park's office
    add('desk', 27, 5, { w: 1.8, d: 0.8, wood: true, id: 'park_desk', rotDeg: 180 });
    add('filing_cabinet', 31.5, 2.5, { rotDeg: -90, n: 3 });
    add('shelf', 27, 0.4, { len: 3.6, h: 2.4, d: 0.45, levels: 5 });
    add('plant', 23, 1.2, {});
    add('rug', 27, 6.5, { w: 4, d: 5, mat: 'carpet_blue' });
    // the dormitory
    for (let k = 0; k < 4; k++) { add('bed', 1.2, 16.6 + k * 2.3, { rotDeg: 90 }); add('bed', 12.8, 16.6 + k * 2.3, { rotDeg: -90 }); }
    // the library: shelves and tables, the lamps always on
    for (let x = 16; x < 33; x += 4) add('shelf', x, 25.6, { rotDeg: 180, len: 3.4, h: 3.0, d: 0.45, levels: 5 });
    for (const [x, z] of [[19, 19.5], [27, 19.5]]) add('table', x, z, { w: 3, d: 1.2, chairs: 4, top: 'wood', id: 'lib_' + x });
    add('rug', 23, 20, { w: 14, d: 6, mat: 'carpet_blue' });
    DV.Zones.define('eru_lab', {
      name: 'Erudite Headquarters',
      region: 'The laboratories, fourth floor',
      chapter: true, noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 36, z1: 28 },
      buildingHeight: 14,
      roof: true,
      fog: { color: 0x2b3440, near: 40, far: 160 },
      sky: { top: 0x5b6773, horizon: 0x9ca3a9, ground: 0x585b5d, skyline: false },
      rooms: [
        { id: 'el_lab', name: 'Laboratory 4C', x0: 0, z0: 0, x1: 22, z1: 12, h: 3.6, floor: 'tile_white', wall: 'paint_blue', ceiling: 'ceiling_tile', light: { ambient: [0.4, 0.42, 0.46], color: [0.9, 0.95, 1], intensity: 0.95, spacing: 4, range: 7, fixture: 'tube' } },
        { id: 'el_office', name: 'Dr. Park\'s Office', x0: 22, z0: 0, x1: 32, z1: 12, h: 3.6, floor: 'wood', wall: 'paint_blue', ceiling: 'ceiling_tile', light: { ambient: [0.3, 0.32, 0.36], color: [1, 0.92, 0.8], intensity: 0.7, spacing: 5, range: 6 } },
        { id: 'el_corr', name: 'Corridor', x0: 0, z0: 12, x1: 34, z1: 15, h: 3.2, floor: 'marble_check', wall: 'paint_blue', ceiling: 'ceiling_tile', light: { ambient: [0.36, 0.38, 0.42], color: [0.9, 0.95, 1], intensity: 0.75, spacing: 5, range: 6 } },
        { id: 'el_dorm', name: 'Initiates\' Dormitory', x0: 0, z0: 15, x1: 14, z1: 26, h: 3.2, floor: 'carpet_blue', wall: 'paint_white', ceiling: 'ceiling_tile', light: { ambient: [0.34, 0.35, 0.38], color: [1, 0.95, 0.88], intensity: 0.75, spacing: 4, range: 6 } },
        { id: 'el_library', name: 'Library', x0: 14, z0: 15, x1: 34, z1: 26, h: 4.5, floor: 'wood', wall: 'paint_blue', ceiling: 'ceiling_tile', light: { ambient: [0.36, 0.36, 0.4], color: [1, 0.92, 0.8], intensity: 0.85, spacing: 4, range: 7 } },
      ],
      doors: [
        { id: 'el_lab_door', x: 11, z: 12, dir: 'x', w: 2.2, type: 'glass' },
        { id: 'el_office_door', x: 27, z: 12, dir: 'x', w: 1.2, type: 'wood', lock: 'park_office', lockMsg: 'Dr. Park\'s office. Locked.' },
        { id: 'el_dorm_door', x: 7, z: 15, dir: 'x', w: 1.2, type: 'wood' },
        { id: 'el_lib_door', x: 23, z: 15, dir: 'x', w: 2.4, type: 'glass' },
      ],
      windows: [{ id: 'el_w2', x: 32, z: 6, dir: 'z', w: 4, sill: 1.0, top: 3.0 }, { id: 'el_w3', x: 34, z: 20, dir: 'z', w: 6, sill: 1.0, top: 4.0 }],
      props,
      spawn: { x: 7, z: 20, rot: Math.PI },
      build(ctx) {
        const city = DV.City.build({ seed: 502, campus: [-20, -20, 54, 46], gridX: [-470, -394, -318, -242, -166, -90, -26, 62, 138, 214, 290, 366, 442], gridZ: [-460, -396, -332, -268, -204, -140, -76, -26, 52, 116, 180, 244, 308, 372], radius: 520, hub: [180, -240], haze: 0x9aa0a6 });
        ctx.add(city.group); ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
        ctx.interact({ id: 'el_board', kind: 'examine', x: 11, y: 1.5, z: 0.7, radius: 1.6, label: 'Read', name: 'Whiteboard', title: 'Whiteboard', text: 'Somebody\'s working, half rubbed out:\n\n  dose / mass → onset 40–90 s\n  "suggestibility" ≠ compliance (!!)\n  — subjects w/ anomalous aptitude results: response FLAT?\n  — N too small. MORE DATA.\n\nUnderneath, in a different hand: "Whoever keeps writing MORE DATA: we know."' });
        ctx.interact({ id: 'el_books', kind: 'examine', x: 20, y: 1.5, z: 24.8, radius: 1.6, label: 'Read', name: 'Library Shelf', title: 'The Library', text: 'ON THE MEASUREMENT OF MINDS — a survey of the aptitude test, its design, its error rates.\n\nError rate: "negligible (< 0.1%)". In the margin, in pencil: "Negligible to whom?"\n\nA library card in the back. The last name on it is Dr. Park\'s, eleven years ago. The one before that has been cut out with a razor.' });
      },
    });
  })();

  /* ============================== bench one: the flasks ============================== */
  // breadth-first: the fewest pours from a state to any state holding the target
  function solve(caps, start, target) {
    const key = (s) => s.join(',');
    const seen = new Map([[key(start), null]]);
    const q = [start];
    while (q.length) {
      const s = q.shift();
      if (s.indexOf(target) >= 0) {
        const path = [];
        let k = key(s);
        while (seen.get(k)) { const p = seen.get(k); path.unshift(p.mv); k = p.from; }
        return path;
      }
      for (let a = 0; a < caps.length; a++) for (let b = 0; b < caps.length; b++) {
        if (a === b || !s[a] || s[b] === caps[b]) continue;
        const n = s.slice(), m = Math.min(s[a], caps[b] - s[b]);
        n[a] -= m; n[b] += m;
        const k = key(n);
        if (!seen.has(k)) { seen.set(k, { from: key(s), mv: [a, b] }); q.push(n); }
      }
    }
    return null;
  }
  const ROUNDS = [
    { caps: [8, 5, 3], start: [8, 0, 0], target: 4, unit: 'litres' },
    { caps: [10, 7, 3], start: [10, 0, 0], target: 5, unit: 'litres' },
  ];
  class Vessels {
    constructor(o) { this.id = 'vessels'; this.o = o || {}; }
    begin(A) {
      this.A = A;
      FW().placePlayer(6, 6.25, 0);
      // through your own eyes: leaning over the bench
      DV.Player.model.root.visible = false;
      DV.Game.rig.setTrack(new THREE.Vector3(6.0, 1.5, 6.05), new THREE.Vector3(6.0, 0.92, 7.2), 5, true, new THREE.Vector3(6, 1.3, 6.3));
      this.r = -1; this.results = [];
      this.freeHint = DV.Stats.attr('intelligence') >= 8;
      this.g = new THREE.Group();
      DV.World.current.group.add(this.g);
      const h = U.el('div', 'vx-hud', '<div class="tr-box"><div class="tr-title">BENCH ONE · MEASURE</div><div class="tr-line vx-goal"></div><div class="tr-line vx-n"></div></div><div class="vx-labels"></div>', A.hud);
      this.h = h;
      this.nextRound();
    }
    q(s) { return this.h.querySelector(s); }
    nextRound() {
      this.r++;
      if (this.r >= ROUNDS.length) { this.done(); return; }
      const R = this.R = ROUNDS[this.r];
      this.level = R.start.slice(); this.shown = R.start.slice();
      this.pours = 0; this.hints = 0; this.sel = -1; this.anim = null; this.solved = false;
      this.opt = solve(R.caps, R.start, R.target).length;
      // the flasks: taller for bigger, no marks on the glass
      for (const c of this.g.children.slice()) this.g.remove(c);
      this.flasks = R.caps.map((cap, i) => {
        const f = new THREE.Group();
        const h = 0.07 * cap, rad = 0.075 + cap * 0.004;
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 14, 1, true), new THREE.MeshLambertMaterial({ color: 0xcfe6f0, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
        glass.position.y = h / 2;
        const base = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.012, 14), new THREE.MeshLambertMaterial({ color: 0x9ab4c0 }));
        const liq = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.93, rad * 0.93, 1, 14), new THREE.MeshLambertMaterial({ color: 0x3a8fd0, transparent: true, opacity: 0.82, emissive: 0x0a2440 }));
        const ring = new THREE.Mesh(new THREE.RingGeometry(rad + 0.03, rad + 0.06, 20), new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.006;
        f.add(glass, base, liq, ring);
        f.position.set(5.25 + i * 0.75, 0.74, 7.15);
        f.userData = { h, liq, ring, cap };
        this.g.add(f);
        return f;
      });
      this.q('.vx-goal').textContent = 'Get exactly ' + R.target + ' ' + R.unit + ' into any flask.';
      this.q('.vx-labels').innerHTML = R.caps.map((c, i) => '<div class="vx-l" data-i="' + i + '"><b>' + (i + 1) + '</b><span>' + c + ' L flask</span><i></i></div>').join('');
      this.A.announce('ROUND ' + (this.r + 1), 1.2);
      this.A.keys('<b>1</b> <b>2</b> <b>3</b> pick up a flask, then the one to pour into · <b>R</b> start again · <b>H</b> a hint' + (this.freeHint ? ' (the first is free)' : '') + ' · hold <b>Q</b> give up');
      this.sync();
      if (this.r === 0 && this.o.say) this.o.say('No marks on the glass, no measuring jug. Exactly four. Count your pours; I am.', 3.6);
    }
    sync() {
      const R = this.R;
      this.q('.vx-n').textContent = 'Pours: ' + this.pours + (this.hints ? ' · hints: ' + this.hints : '');
      this.flasks.forEach((f, i) => {
        const u = f.userData, lv = this.shown[i];
        u.liq.visible = lv > 0.02;
        u.liq.scale.y = Math.max(0.001, (lv / u.cap) * u.h);
        u.liq.position.y = (lv / u.cap) * u.h / 2 + 0.006;
        u.ring.material.opacity = this.sel === i ? 0.9 : 0;
        const l = this.q('.vx-l[data-i="' + i + '"]');
        if (l) { l.classList.toggle('sel', this.sel === i); l.querySelector('i').textContent = this.solved && this.level[i] === R.target ? R.target + ' L ✓' : ''; }
      });
    }
    pour(a, b) {
      const R = this.R, s = this.level;
      if (a === b || !s[a] || s[b] === R.caps[b]) { DV.Audio.play('error', { volume: 0.4 }); return; }
      const m = Math.min(s[a], R.caps[b] - s[b]);
      const from = s.slice();
      s[a] -= m; s[b] += m;
      this.pours++;
      this.anim = { a, b, t: 0, from, to: s.slice() };
      DV.Audio.play('drip', { volume: 0.6 });
    }
    hint() {
      const path = solve(this.R.caps, this.level, this.R.target);
      if (!path || !path.length) return;
      if (this.freeHint) this.freeHint = false; else this.hints++;
      const [a, b] = path[0];
      this.A.announce((a + 1) + ' → ' + (b + 1), 1.6);
      DV.Audio.play('chime', { volume: 0.5 });
      this.sync();
    }
    roundDone(gaveUp) {
      const R = this.R;
      const score = gaveUp ? 20 : Math.max(30, 100 - 8 * Math.max(0, this.pours - this.opt) - 15 * this.hints);
      this.results.push({ pours: this.pours, opt: this.opt, hints: this.hints, score, gaveUp: !!gaveUp });
      this.solved = !gaveUp;
      this.sync();
      this.A.announce(gaveUp ? 'GIVEN UP' : this.pours <= this.opt ? 'PERFECT · ' + this.pours + ' POURS' : this.pours + ' POURS', 1.8, gaveUp ? 'bad' : 'good');
      if (!gaveUp) DV.Audio.play('check_ok', { volume: 0.6 });
      this.wait = 2.2;
      void R;
    }
    done() {
      const avg = Math.round(this.results.reduce((t, r) => t + r.score, 0) / this.results.length);
      this.A.finish({ score: avg, rounds: this.results });
    }
    update(dt, input, A) {
      FW().pose(dt, { action: 'idle', lookPitch: 0.35 });
      if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) this.nextRound(); return; }
      if (this.anim) {
        const an = this.anim;
        an.t += dt / 0.7;
        const k = U.clamp(an.t, 0, 1), e = k * k * (3 - 2 * k);
        for (let i = 0; i < 3; i++) this.shown[i] = U.lerp(an.from[i], an.to[i], e);
        const f = this.flasks[an.a];
        f.rotation.z = Math.sin(Math.PI * k) * (an.b > an.a ? -0.7 : 0.7);
        f.position.y = 0.74 + Math.sin(Math.PI * k) * 0.12;
        this.sync();
        if (an.t >= 1) { f.rotation.z = 0; f.position.y = 0.74; this.anim = null; if (this.level.indexOf(this.R.target) >= 0) this.roundDone(false); }
        return;
      }
      // giving up takes a deliberate hold
      if (input.down('KeyQ')) { this.quitT = (this.quitT || 0) + dt; if (this.quitT > 1.2) { this.quitT = 0; this.roundDone(true); return; } } else this.quitT = 0;
      for (let i = 0; i < 3; i++) {
        if (input.consume('Digit' + (i + 1)) || input.consume('Numpad' + (i + 1))) {
          if (this.sel < 0) { if (this.level[i] > 0) { this.sel = i; DV.Audio.play('clink', { volume: 0.5 }); } else DV.Audio.play('error', { volume: 0.4 }); }
          else if (this.sel === i) this.sel = -1;
          else { const a = this.sel; this.sel = -1; this.pour(a, i); }
          this.sync();
        }
      }
      if (input.consume('KeyR')) { this.level = this.R.start.slice(); this.shown = this.level.slice(); this.sel = -1; this.pours++; DV.Audio.play('splash', { volume: 0.4 }); this.sync(); }
      if (input.consume('KeyH')) this.hint();
    }
    end() { if (this.g.parent) this.g.parent.remove(this.g); DV.Player.model.root.visible = true; }
  }

  /* ============================== bench two: the relay board ============================== */
  const N = 4;
  // pressing a relay flips it and its four neighbours
  const press = (b, i) => { const x = i % N, y = (i / N) | 0; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N) b[ny * N + nx] ^= 1; } };
  // the fewest presses that light every relay, by trying every set (2^16 of them: quick)
  function minPresses(board) {
    let best = null;
    for (let m = 0; m < 1 << (N * N); m++) {
      let c = 0;
      for (let k = m; k; k &= k - 1) c++;
      if (best && c >= best.length) continue;
      const b = board.slice();
      for (let i = 0; i < N * N; i++) if (m & (1 << i)) press(b, i);
      if (b.every((v) => v)) { best = []; for (let i = 0; i < N * N; i++) if (m & (1 << i)) best.push(i); }
    }
    return best || [];
  }
  class Relays {
    constructor(o) { this.id = 'relays'; this.o = o || {}; }
    begin(A) {
      this.A = A;
      FW().placePlayer(17, 2.3, Math.PI);
      DV.Game.rig.setTrack(new THREE.Vector3(17.55, 1.78, 3.55), new THREE.Vector3(17.0, 1.05, 1.6), 5, true, new THREE.Vector3(17, 1.4, 2.8));
      // a lit board, scrambled by five presses: so there's an answer in five or fewer
      this.board = new Array(N * N).fill(1);
      const r = U.rng('relays:' + PL().name);
      const used = new Set();
      while (used.size < 5) used.add(Math.floor(r() * N * N));
      for (const i of used) press(this.board, i);
      this.start = this.board.slice();
      this.min = minPresses(this.board).length;
      this.presses = 0; this.hints = 0; this.cur = 5; this.over = false;
      const h = U.el('div', 'rl-hud', '<div class="tr-box"><div class="tr-title">BENCH TWO · THE RELAY BOARD</div><div class="tr-line">Light every relay. Each switch flips its neighbours too.</div><div class="tr-line rl-n"></div></div><div class="rl-board"></div>', A.hud);
      this.h = h;
      this.q('.rl-board').innerHTML = this.board.map((_, i) => '<i data-i="' + i + '"></i>').join('');
      A.keys('<b>WASD</b> / arrows move · <b>E</b> / <b>Space</b> / <b>LMB</b> flip · <b>R</b> start again · <b>H</b> a hint · hold <b>Q</b> give up');
      this.sync();
      if (this.o.say) this.o.say('Every switch flips its neighbours. You will be tempted to experiment. Think first.', 3.6);
    }
    q(s) { return this.h.querySelector(s); }
    sync() {
      this.q('.rl-n').textContent = 'Switches thrown: ' + this.presses + (this.hints ? ' · hints: ' + this.hints : '');
      const cells = this.q('.rl-board').children;
      for (let i = 0; i < cells.length; i++) cells[i].className = (this.board[i] ? 'on' : '') + (i === this.cur ? ' cur' : '') + (i === this.hintCell ? ' hint' : '');
    }
    flip(i) {
      press(this.board, i);
      this.presses++;
      this.hintCell = -1;
      DV.Audio.play('click', { volume: 0.6 });
      if (this.board.every((v) => v)) this.win(false);
      this.sync();
    }
    win(gaveUp) {
      this.over = true;
      const score = gaveUp ? 20 : Math.max(30, 100 - 6 * Math.max(0, this.presses - this.min) - 12 * this.hints);
      this.A.announce(gaveUp ? 'GIVEN UP' : this.presses <= this.min ? 'PERFECT · ' + this.presses + ' SWITCHES' : 'LIT · ' + this.presses + ' SWITCHES', 1.8, gaveUp ? 'bad' : 'good');
      if (!gaveUp) DV.Audio.play('check_ok', { volume: 0.6 });
      FW().timers.after.call(this, 2.0, () => this.A.finish({ score, presses: this.presses, min: this.min, hints: this.hints, gaveUp }));
    }
    update(dt, input) {
      FW().timers.tick.call(this, dt);
      FW().pose(dt, { action: 'type' });
      if (this.over) return;
      const mv = (dx, dy) => { const x = U.clamp((this.cur % N) + dx, 0, N - 1), y = U.clamp(((this.cur / N) | 0) + dy, 0, N - 1); this.cur = y * N + x; this.sync(); };
      if (input.consume('KeyA') || input.consume('ArrowLeft')) mv(-1, 0);
      if (input.consume('KeyD') || input.consume('ArrowRight')) mv(1, 0);
      if (input.consume('KeyW') || input.consume('ArrowUp')) mv(0, -1);
      if (input.consume('KeyS') || input.consume('ArrowDown')) mv(0, 1);
      if (input.consume('KeyE') || input.consume('Space') || input.consume('MouseLeft')) this.flip(this.cur);
      if (input.consume('KeyR')) { this.board = this.start.slice(); this.presses++; this.sync(); }
      if (input.consume('KeyH')) { const sol = minPresses(this.board); if (sol.length) { this.hints++; this.hintCell = sol[0]; DV.Audio.play('chime', { volume: 0.5 }); this.sync(); } }
      if (input.down('KeyQ')) { this.quitT = (this.quitT || 0) + dt; if (this.quitT > 1.2) this.win(true); } else this.quitT = 0;
    }
    end() {}
  }
  DV.WeekErudite = { solve, ROUNDS, Vessels, Relays, minPresses, press };

  /* ============================== the week ============================== */
  const STEPS = {
    lab: { day: 3, time: '08:30', title: 'ERUDITE\nTHE FIRST WEEK · DAY 3' },
    night: { day: 4, time: '21:25', title: 'DAY 4 · 21:25' },
    exam: { day: 5, time: '09:55', title: 'DAY 5\nTHE EXAMINATION' },
    end: { day: 5, time: '11:30' },
  };
  const step = (o) => STEPS[(o && o.step) || 'lab'] || STEPS.lab;
  const THEO = { id: 'theo_lang', name: 'Theo Lang', app: adult('erudite', 'm', 'theo-lang', 16, 1.0), bias: 80 };
  const peers = () => FW().classOf('erudite', [THEO]).map((p) => Object.assign({ bias: { ortiz_maria: 72, ben_fischer: 68, hannah_lewis: 57, jenna_morales: 76 }[p.id] || 64 }, p));
  // who else is in the red folder (from your Aptitude Day)
  const others = () => {
    const names = [];
    if (DV.State.flag('daniel_tested')) names.push('Daniel Webb');
    names.push('Hannah Lewis');
    return names;
  };

  DV.Chapter.define('week_erudite', {
    zone: 'eru_lab',
    day: (o) => step(o).day,
    time: (o) => step(o).time,
    title: (o) => step(o).title,
    canPass(Ch, lock) { return lock === 'park_office' ? !!FW().was('office_key') && Ch.step === 'night' : true; },
    start(Ch, zone, opts) {
      FW().fresh(Ch);
      const s = opts.step || 'lab';
      DV.Audio.setMusic(s === 'night' ? 'none' : 'calm');
      Ch.park = Ch.actor({ id: 'park', name: 'Dr. Helen Park', faction: 'erudite', app: adult('erudite', 'f', 'helen-park', 52, 1.02), x: 9, z: 4.5, rot: Math.PI, action: 'clipboard' });
      Ch.peers = peers().slice(0, 6);
      if (!DV.Quests.started('week_erudite')) DV.Quests.start('week_erudite');
      DV.Quests.tracked = 'week_erudite';
      (this[s] || this.lab).call(this, Ch, zone, opts);
    },
    peer(Ch, id) { return Ch.peerActors && Ch.peerActors.find((a) => a.id === id); },
    peerTalk(Ch) {
      for (const [id, tree] of [['ben_fischer', 'eru_ben'], ['hannah_lewis', 'eru_hannah'], ['theo_lang', 'eru_theo']]) {
        const a = this.peer(Ch, id);
        if (a) FW().talkTo(Ch, a, tree, { id: 'talk_' + id });
      }
    },

    /* ---------------- Day 3: the benches ---------------- */
    lab(Ch) {
      Ch.checkpoint('lab');
      FW().placePlayer(14, 9.5, -2.36);
      const spots = [[11.4, 8.0, Math.PI, 'work'], [12.8, 8.0, Math.PI, 'work'], [5.4, 11.4, Math.PI, 'read'], [6.8, 11.4, Math.PI, 'read'], [19.5, 6.5, -1.2, 'clipboard'], [3, 4, 1.2, 'read']];
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'erudite', app: p.app, x: spots[i][0], z: spots[i][1], rot: spots[i][2], action: spots[i][3] === 'work' ? 'idle' : spots[i][3] }));
      this.peerTalk(Ch);
      FW().talkTo(Ch, Ch.park, 'eru_park', { id: 'park_talk' });
      if (!FW().was('briefed')) {
        Ch.seq([
          () => 1.4,
          FW().say(Ch, Ch.park, 'Benches, please. Today we find out how you think, which is not the same as what you know.', 4.0),
          FW().say(Ch, Ch.park, 'Bench one: three flasks. Bench two: the relay board. I record the number of moves. Not the time. Take as long as you like.', 4.6),
          () => { FW().note('briefed'); },
        ], 'brief');
      }
      const b1 = () => FW().got('vessels') > 0 || FW().was('vessels_done');
      const b2 = () => FW().was('relays_done');
      Ch.interact({ id: 'bench_vessels', kind: 'action', x: 6, y: 0.9, z: 6.4, radius: 1.4, label: 'Work at bench one', name: 'Three Flasks', cond: () => !b1(), onUse: () => this.vessels(Ch) });
      Ch.interact({ id: 'bench_relays', kind: 'action', x: 17, y: 0.9, z: 2.5, radius: 1.4, label: 'Work at bench two', name: 'The Relay Board', cond: () => b1() && !b2(), onUse: () => this.relays(Ch) });
      if (b1()) DV.Quests.setObj('week_erudite', 'vessels', 'done');
      if (b2()) this.benchesDone(Ch);
    },
    vessels(Ch) {
      DV.Activity.start(new Vessels({ say: (t, s) => Ch.say(Ch.park, t, s) }), (r) => {
        FW().note('vessels_done', r.rounds);
        FW().mark('vessels', r.score, 100, 'Bench one: ' + r.rounds.map((x) => x.gaveUp ? 'gave up' : x.pours + ' pours (best ' + x.opt + ')').join(', ') + '.');
        DV.Quests.setObj('week_erudite', 'vessels', 'done', 'Bench one: ' + r.rounds.map((x) => x.gaveUp ? 'gave up' : x.pours + ' pours').join(' and ') + '.');
        DV.Quests.activate('week_erudite', 'relays');
        Ch.say(Ch.park, r.score >= 90 ? '[She makes a mark.] Efficient. Bench two.' : r.score >= 60 ? 'Correct, eventually. Bench two, please.' : 'Hm. Bench two. Think before you touch anything this time.', 3.4);
      });
    },
    relays(Ch) {
      DV.Activity.start(new Relays({ say: (t, s) => Ch.say(Ch.park, t, s) }), (r) => {
        FW().note('relays_done', { presses: r.presses, min: r.min, hints: r.hints, gaveUp: r.gaveUp });
        FW().mark('relays', r.score, 100, 'Bench two: ' + (r.gaveUp ? 'gave up.' : r.presses + ' switches (the fewest possible: ' + r.min + ').'));
        DV.Quests.setObj('week_erudite', 'relays', 'done', 'Bench two: the relay board, ' + (r.gaveUp ? 'not lit.' : 'lit in ' + r.presses + '.'));
        this.benchesDone(Ch);
      });
    },
    benchesDone(Ch) {
      if (Ch.flag('errand_given')) return;
      Ch.setFlag('errand_given');
      FW().sleepSpot(Ch, { x: 1.2, z: 17.5, to: 'night', title: STEPS.night.title, label: 'Sleep (until tomorrow night)', cond: () => !!FW().was('office_key') });
      if (FW().was('office_key')) { DV.Quests.activate('week_erudite', 'errand'); return; }
      Ch.park.walk([[9, 6]], 1.2, (a) => a.face(DV.Player.x, DV.Player.z));
      Ch.seq([
        () => 1.2,
        FW().say(Ch, Ch.park, 'That will do for today. One more thing — you, {name}.'.replace('{name}', PL().name), 3.2),
        FW().say(Ch, Ch.park, 'Tomorrow night I\'ll be in the archive late. At half past nine, bring me the calibration notes from my office: the grey folder, on the desk. Here\'s the key.', 5.0),
        () => {
          FW().note('office_key');
          DV.UI.notify('Dr. Park gives you the key to her office.', 'item');
          DV.Quests.activate('week_erudite', 'errand');
          DV.UI.notify('Rest in the dormitory when you\'re ready — the errand is tomorrow night.', 'info');
        },
      ], 'errand');
    },

    /* ---------------- Day 4, night: the office ---------------- */
    night(Ch) {
      Ch.checkpoint('night');
      DV.Quests.activate('week_erudite', 'errand');
      FW().placePlayer(23, 13.6, Math.PI / 2);
      Ch.park.place(-50, -50, 0); // she's in the archive, two floors down
      Ch.peerActors = Ch.peers.slice(0, 3).map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'erudite', app: p.app, x: [17.6, 20.4, 26.4][i], z: [18.9, 20.1, 18.9][i], rot: [0, Math.PI, 0][i], action: 'sit' }));
      this.peerTalk(Ch);
      this.office(Ch);
    },
    office(Ch) {
      const g = new THREE.Group();
      const grey = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.32), new THREE.MeshLambertMaterial({ color: 0x8a8c90 }));
      grey.position.set(26.5, 0.755, 5.05); grey.rotation.y = 0.15;
      const red = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.32), new THREE.MeshLambertMaterial({ color: 0x9a2a22 }));
      red.position.set(27.4, 0.755, 4.95); red.rotation.y = -0.2;
      g.add(grey, red);
      Ch.addObject(g);
      Ch.redMesh = red; Ch.greyMesh = grey;
      if (FW().was('grey')) grey.visible = false;
      Ch.interact({ id: 'grey_folder', kind: 'action', x: 26.5, y: 0.9, z: 5.7, radius: 1.2, label: 'Take the grey folder', name: 'Calibration Notes', cond: () => !FW().was('grey'), onUse: () => { FW().note('grey'); grey.visible = false; DV.Audio.play('paper'); DV.UI.notify('You take the grey folder: CALIBRATION NOTES — SERUM SERIES 7.', 'item'); this.footsteps(Ch); } });
      Ch.interact({ id: 'red_folder', kind: 'action', x: 27.4, y: 0.9, z: 5.7, radius: 1.2, label: () => (FW().was('red_read') ? 'Look again' : 'Open the red folder'), name: 'A Red Folder', cond: () => !FW().was('red_taken'), onUse: () => this.readRed(Ch) });
      Ch.interact({ id: 'park_deliver', kind: 'action', x: 4, y: 1, z: 13.5, radius: 1.6, label: 'Take the stairs down to the archive', name: 'Stairwell', cond: () => !!FW().was('grey') && !Ch.flag('caught_now'), onUse: () => this.deliver(Ch) });
    },
    readRed(Ch) {
      const div = !!APT().divergent;
      const first = !FW().was('red_read');
      FW().note('red_read');
      DV.State.setFlag('read_red_folder');
      DV.Audio.play('paper');
      const tech = 'C. Dawson';
      const text = 'ANOMALOUS APTITUDE RESULTS — SECTOR 4 TESTING CENTER\nFOR THE DIRECTOR. NOT FOR CIRCULATION.\n\n' +
        'Results recorded manually, or overridden, by testing staff. Each to be followed up.\n\n' +
        (div ? '  ' + PL().name.toUpperCase() + ' — recorded: ' + DV.Factions.name(APT().recordedAs || APT().result || 'erudite') + '. Technician: ' + tech + '.\n      Simulation log incomplete. Follow-up: RECOMMENDED.\n      Current faction: ERUDITE (initiate). Access: EASY.\n' : '') +
        others().map((n) => '  ' + n.toUpperCase() + ' — recorded: manual. Follow-up: pending.').join('\n') +
        '\n\nThe last page is a list of dates, a column of initials, and the words "serum response: FLAT" underlined twice.';
      DV.UI.showReading('A Red Folder', text, () => { if (first) Ch.scene('eru_red'); });
      this.footsteps(Ch);
    },
    // somebody coming along the corridor: be out of the office before he reaches the door
    footsteps(Ch) {
      if (Ch.flag('steps')) return;
      Ch.setFlag('steps');
      Ch.after(5, () => {
        DV.Audio.play('step', { volume: 0.7, x: 33, z: 13.5, range: 30 });
        DV.UI.notify('Footsteps in the corridor, coming this way.', 'info');
        Ch.voss = Ch.actor({ id: 'voss', name: 'Mr. Voss', faction: 'erudite', app: adult('erudite', 'm', 'voss-archivist', 61, 1.0), x: 33.5, z: 13.5, rot: -Math.PI / 2, action: 'idle' });
        Ch.voss.walk([[27.6, 13.5]], 0.9, () => this.atDoor(Ch));
      });
    },
    atDoor(Ch) {
      const P = DV.Player;
      const inside = P.x > 22 && P.x < 32 && P.z > 0 && P.z < 12;
      if (inside) {
        Ch.setFlag('caught_now');
        FW().note('caught');
        Ch.voss.walk([[27, 11.2]], 1.0, (a) => { a.face(P.x, P.z); Ch.scene('eru_caught'); });
      } else {
        Ch.say(Ch.voss, 'Evening. Late for an initiate.', 2.8);
        Ch.voss.walk([[12, 13.5], [0.6, 13.5]], 0.9, (a) => { a.place(-40, -40); });
      }
    },
    deliver(Ch) {
      Ch.cut(true);
      DV.UI.fade(1, 900).then(() => {
        Ch.park.place(4, 11.5, 0); Ch.park.action = 'clipboard';
        FW().placePlayer(4, 13.0, Math.PI);
        Ch.shot([5.6, 1.7, 14.2], [4, 1.3, 11.8], true);
        DV.UI.fade(0, 700);
        Ch.cut(false);
        Ch.park.face(DV.Player.x, DV.Player.z);
        Ch.scene('eru_park_night');
      });
    },

    /* ---------------- Day 5: the examination ---------------- */
    exam(Ch) {
      Ch.checkpoint('exam');
      DV.Quests.setObj('week_erudite', 'errand', 'done');
      DV.Quests.activate('week_erudite', 'exam');
      Ch.park.place(12, 9.3, Math.PI); Ch.park.action = 'clipboard';
      // the others wait either side of the lane from the door to Dr. Park (x 11–13 stays clear)
      const spots = [[8.4, 6.4], [9.7, 5.4], [14.3, 6.4], [15.6, 5.4], [8.4, 4.4], [15.6, 4.2]];
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'erudite', app: p.app, x: spots[i][0], z: spots[i][1], rot: 0, action: 'arms_crossed' }));
      FW().placePlayer(12, 2.6, 0);
      if (FW().was('exam_done')) { Ch.setFlag('examined'); Ch.after(0.5, () => this.finish(Ch)); }
      Ch.interact({ id: 'exam_start', kind: 'action', x: () => Ch.park.x, y: 1.4, z: () => Ch.park.z, radius: 2.2, label: 'Sit the examination', name: 'Dr. Helen Park', cond: () => !Ch.flag('examined'), onUse: () => { Ch.setFlag('examined'); Ch.park.face(DV.Player.x, DV.Player.z); Ch.scene('eru_exam'); } });
      Ch.after(1.6, () => Ch.say(Ch.park, 'One at a time. {name} first. Come here.'.replace('{name}', PL().name), 3.2));
    },
    onDialogueEnd(Ch, e) {
      if (e.tree === 'eru_caught' && Ch.voss) { Ch.voss.walk([[27.6, 13.5], [12, 13.5], [0.6, 13.5]], 0.9, (a) => a.place(-40, -40)); Ch.setFlag('caught_now', false); }
      if (e.tree === 'eru_park_night') {
        Ch.seq([() => 0.8, () => FW().next(Ch, 'exam', STEPS.exam.title)], 'to_exam');
      }
      if (e.tree === 'eru_exam' && FW().was('exam_done')) this.finish(Ch);
    },
    finish(Ch) {
      DV.Quests.setObj('week_erudite', 'exam', 'done');
      FW().passTo('11:30');
      const pct = FW().pct();
      const st = FW().standings('erudite', pct, Ch.peers);
      FW().note('rank', st.place);
      DV.UI.showReading('Week One — Results', 'Posted on the lab door at eleven, typed, with decimals.\n\n' + FW().standingsText(st.rows) + '\n\nAt the bottom, in Dr. Park\'s hand: "Method, not memory."', () => {
        const div = !!APT().divergent, read = FW().was('red_read'), took = FW().was('red_taken');
        const l2 = 'RANKED ' + FW().ordinal(st.place).toUpperCase() + ' OF ' + st.n + ' · ' + (read && div ? (took ? 'YOUR PAGE IS IN YOUR POCKET.' : 'YOUR NAME IS IN THE RED FOLDER.') : read ? 'YOU READ THE RED FOLDER.' : 'METHOD, NOT MEMORY.');
        FW().complete(Ch, 'erudite', l2, read ? 'read' : 'clean');
      });
    },
    end(Ch) {
      Ch.park.place(12, 9.3, Math.PI);
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'erudite', app: p.app, x: [17.6, 20.4, 26.4, 28.2, 18.6, 25.6][i], z: [18.9, 20.1, 18.9, 20.1, 20.1, 18.9][i], rot: [0, Math.PI, 0, Math.PI, Math.PI, 0][i], action: 'sit' }));
      this.peerTalk(Ch);
      FW().talkTo(Ch, Ch.park, 'eru_park', { id: 'park_talk' });
      FW().placePlayer(12, 11, Math.PI);
    },
  });

  /* ============================== dialogue ============================== */
  const P_ = { speaker: 'Dr. Helen Park', faction: 'erudite' };
  const p = (o) => Object.assign({}, P_, o);
  const V = () => FW().was('vessels_done') || [];
  const RL = () => FW().was('relays_done') || {};
  DV.DialogueDB.add('eru_park', {
    entry: 'start',
    nodes: {
      start: p({
        text: () => (FW().was('rank') ? 'You\'ve seen the results. Questions are welcome. Complaints are not.' : !FW().was('vessels_done') ? 'Bench one, please. The flasks.' : !FW().was('relays_done') ? 'Bench two. The relay board, by the window.' : 'Tomorrow night, half past nine. The grey folder. Don\'t be late; I hate waiting almost as much as I hate guessing.'),
        choices: [
          { text: 'Why count moves and not time?', to: 'moves' },
          { text: 'What are the benches for, really?', to: 'really', check: { attr: 'perception', dc: 6 } },
          { text: 'Nothing.', end: true },
        ],
      }),
      moves: p({ text: 'Because anybody can be fast. Speed is a talent. Economy is a discipline — it means you understood the problem before you touched it. Erudite can teach discipline.', next: 'start', nextText: 'I see.' }),
      really: p({ text: '[She almost smiles.] Good. Everything here is for something else. The benches measure how you search for an answer: methodically, or by flailing. Some minds do neither. They simply... see it. We are very interested in those minds.', next: 'start', nextText: '...', onEnter: () => FW().note('park_interested') }),
    },
  });
  DV.DialogueDB.add('eru_red', {
    entry: 'start',
    nodes: {
      start: {
        speaker: '', faction: 'erudite',
        text: () => (APT().divergent ? '[Your own name, typed, between two people you saw at the Testing Center. "Access: EASY." Your hands are cold.]' : '[Names you know from Aptitude Day. "Follow-up." Whatever that means, it doesn\'t sound like a welcome.]') + '\n\nThe footsteps in the corridor are getting closer.',
        choices: [
          { text: 'Tear out your page and take it.', if: () => !!APT().divergent, to: 'took', effect: () => { FW().note('red_taken'); DV.State.setFlag('took_red_page'); } },
          { text: '[INTELLIGENCE 7] Memorise every name and date, and put it back exactly as it was.', check: { attr: 'intelligence', dc: 7 }, to: 'memorised', effect: () => { FW().note('red_memorised'); DV.State.setFlag('memorised_red_folder'); } },
          { text: 'Close it. Put it back. You didn\'t see anything.', to: 'closed' },
        ],
      },
      took: { speaker: '', text: '[The paper tears quietly. You fold it small and put it inside your shirt. The folder is thinner now. Somebody will notice — eventually.]', endText: 'Get out.', onEnter: () => { if (Ch()) Ch().redMesh.visible = false; } },
      memorised: { speaker: '', text: '[Names, dates, technicians\' initials — you take them in like a page of a textbook, and square the folder back on the desk to the millimetre.]', endText: 'Get out.' },
      closed: { speaker: '', text: '[You close it. You put it back. You know you\'ll see it when you close your eyes tonight.]', endText: 'Get out.' },
    },
  });
  const Ch = () => DV.Chapter.active && DV.Chapter.id === 'week_erudite' ? DV.Chapter : null;
  DV.DialogueDB.add('eru_caught', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Mr. Voss', faction: 'erudite',
        text: () => 'Well. An initiate in Dr. Park\'s office at this hour. ' + (FW().was('red_read') && !FW().was('grey') ? '[His eyes go to the desk — to the red folder, which isn\'t quite where it was.]' : FW().was('red_read') ? '[His eyes go to the red folder on the desk, then back to you.]' : '') + ' Explain.',
        choices: [
          { text: 'Dr. Park sent me for the calibration notes. Here — the grey folder. She gave me her key.', to: 'true', if: () => !!FW().was('grey') },
          { text: 'Dr. Park sent me. I was looking for the calibration notes.', to: 'true2', if: () => !FW().was('grey') },
          { text: '[CHARISMA 7] "Thank goodness — I can\'t find the grey folder she wanted. Is it this one?"', check: { attr: 'charisma', dc: 7 }, to: 'smooth', if: () => !!FW().was('red_read') },
        ],
      },
      true: { speaker: 'Mr. Voss', faction: 'erudite', text: () => (FW().was('red_read') ? 'The grey folder. Yes. And the red one — you\'ll have touched that by accident, I\'m sure. [He doesn\'t sound sure.] I\'ll mention it to her. Go on.' : 'Then you have what you came for. Go on, then.'), endText: 'Good night.', onEnter: () => { if (FW().was('red_read')) FW().note('voss_reports'); } },
      true2: { speaker: 'Mr. Voss', faction: 'erudite', text: 'Grey. On the desk. [He points at it without taking his eyes off you.] Take it and go.', endText: 'Thank you.' },
      smooth: { speaker: 'Mr. Voss', faction: 'erudite', text: '[He relaxes a little.] Grey, initiate. The grey one. Honestly, they get younger every year. Go on.', endText: 'Thank you.', onEnter: () => DV.Stats.addXP(15, 'Quick thinking') },
    },
  });
  DV.DialogueDB.add('eru_park_night', {
    entry: 'start',
    nodes: {
      start: p({
        text: () => '[The archive is all dust and lamplight. She takes the folder without looking up.] Thank you. ' + (FW().was('voss_reports') ? '[Then she does look up.] Mr. Voss tells me my desk was disturbed.' : 'Did you have any trouble?'),
        choices: [
          { text: 'I read the red folder. I\'m sorry.', to: 'confess', if: () => !!FW().was('red_read') },
          { text: 'No trouble.', to: 'none', effect: () => { if (FW().was('red_read')) FW().note('lied_park'); } },
          { text: '[INTELLIGENCE 8] "Why do anomalies in a test with a negligible error rate need a folder for the Director?"', check: { attr: 'intelligence', dc: 8 }, to: 'question', if: () => !!FW().was('red_read') },
        ],
      }),
      confess: p({ text: '[A long pause.] Curiosity is the faction\'s whole reason for existing. I can hardly punish you for it. [She closes the grey folder.] But there are people in this building who would. Forget what you read. That is not a request.', endText: 'Yes, Dr. Park.', onEnter: () => { FW().note('told_park'); FW().mark('honesty', 10, 10); DV.Reputation.add('erudite', 2); } }),
      none: p({ text: () => (FW().was('voss_reports') ? '[She looks at you over her glasses for a long time.] Good. Then there\'s nothing to talk about. Good night, initiate.' : 'Good. Good night, initiate.'), endText: 'Good night.', onEnter: () => FW().mark('honesty', FW().was('voss_reports') ? 2 : 8, 10) }),
      question: p({ text: '[She puts her pen down.] Because the error rate is a lie we tell the council, and the anomalies are not errors. [Quietly.] You did not hear that from me, and I did not hear the question. Good night.', endText: 'Good night.', onEnter: () => { FW().note('park_ally'); DV.State.setFlag('park_ally'); FW().mark('honesty', 9, 10); } }),
    },
    onEnd: () => DV.Quests.setObj('week_erudite', 'errand', 'done', 'You brought Dr. Park the calibration notes.'),
  });
  DV.DialogueDB.add('eru_exam', {
    entry: 'q1',
    nodes: {
      q1: p({
        text: 'Bench one, the first round. Three flasks, eight, five and three; four litres. How many pours did you take?',
        choices: () => {
          const real = (V()[0] && !V()[0].gaveUp && V()[0].pours) || null;
          const out = [];
          if (real) out.push({ text: real + '.', to: 'q2', effect: () => FW().mark('exam1', 10, 10) });
          else out.push({ text: 'I didn\'t finish it.', to: 'q2', effect: () => FW().mark('exam1', 8, 10) });
          if (!real || real > 6) out.push({ text: 'Six.', to: 'q1_lie', effect: () => FW().mark('exam1', 0, 10) });
          out.push({ text: 'I don\'t remember exactly.', to: 'q1_vague', effect: () => FW().mark('exam1', 4, 10) });
          return out;
        },
      }),
      q1_lie: p({ text: '[She doesn\'t check her notes. She doesn\'t need to.] No. And now I know two things about you instead of one. Next.', next: 'q2', nextText: '...' }),
      q1_vague: p({ text: 'Then you weren\'t counting. You should always be counting. Next.', next: 'q2', nextText: '...' }),
      q2: p({
        text: 'Bench two. Does the order in which you throw the switches matter?',
        choices: [
          { text: 'Yes — each switch changes what the next one does.', to: 'q2_wrong', effect: () => FW().mark('exam2', 2, 10) },
          { text: 'No. Each switch does the same thing whenever you throw it. Throwing one twice undoes it.', to: 'q2_right', effect: () => FW().mark('exam2', 9, 10) },
          { text: '[INTELLIGENCE 7] No. Every switch is its own toggle, so the board is just a sum of them — order is irrelevant, and no switch ever needs throwing twice.', check: { attr: 'intelligence', dc: 7 }, to: 'q2_best', effect: () => FW().mark('exam2', 10, 10) },
        ],
      }),
      q2_wrong: p({ text: 'It feels that way, doesn\'t it. It isn\'t. Each switch does exactly the same thing whenever you press it. Next.', next: 'q3', nextText: '...' }),
      q2_right: p({ text: 'Correct. Next.', next: 'q3', nextText: '...' }),
      q2_best: p({ text: '[A short nod.] Never twice. Most of them get there by Day 20. Next.', next: 'q3', nextText: '...' }),
      q3: p({
        text: 'Last. Not a bench question. Suppose a test produces a result its designers can\'t explain. What is the most likely cause?',
        choices: [
          { text: 'The test is flawed.', to: 'q3_a', effect: () => FW().mark('exam3', 6, 10) },
          { text: 'The person tested is unusual.', to: 'q3_b', effect: () => FW().mark('exam3', 6, 10) },
          { text: '[INTELLIGENCE 8] There isn\'t enough data to say. I\'d want to see every other result like it before I guessed.', check: { attr: 'intelligence', dc: 8 }, to: 'q3_c', effect: () => FW().mark('exam3', 10, 10) },
          { text: 'You mean like the results in the red folder on your desk?', if: () => !!FW().was('red_read'), to: 'q3_d', effect: () => { FW().mark('exam3', 7, 10); FW().note('said_red'); DV.State.setFlag('mentioned_red_folder'); } },
        ],
      }),
      q3_a: p({ text: 'Perhaps. That\'s what the council would like to hear.', next: 'end', nextText: '...' }),
      q3_b: p({ text: '[Her pen stops for half a second.] Perhaps. That\'s what the Director would like to hear.', next: 'end', nextText: '...' }),
      q3_c: p({ text: 'Yes. That is the only honest answer, and it is the one nobody ever gives. [She writes for a long time.]', next: 'end', nextText: '...', onEnter: () => FW().note('park_interested') }),
      q3_d: p({ text: '[The room goes very still. The other initiates look at you, then at her.] ...I\'ll pretend that was a hypothetical. [Quietly, so only you hear:] Never in front of witnesses.', next: 'end', nextText: '...' }),
      end: p({ text: 'That\'s all. Results on the door at eleven.', endText: 'Thank you.', onEnter: () => FW().note('exam_done') }),
    },
  });
  DV.DialogueDB.add('eru_ben', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Ben Fischer', faction: 'erudite',
        text: () => (FW().was('relays_done') ? 'How many switches? [He asks it too casually.] I got it in — well. It doesn\'t matter. It does matter. How many?' : 'Bench one\'s a classic. Everybody knows bench one. [He looks like he doesn\'t.]'),
        choices: [
          { text: () => 'Tell him the truth: ' + ((RL().presses) || 'not many') + '.', if: () => !!FW().was('relays_done'), to: 'told' },
          { text: 'You\'re not average, Ben. You know that, right?', to: 'average' },
          { text: 'See you later.', end: true },
        ],
      },
      told: { speaker: 'Ben Fischer', faction: 'erudite', text: '[He does the arithmetic on his face before he can stop it.] Right. Good. Good for you. [He means it, mostly.]', endText: '...' },
      average: { speaker: 'Ben Fischer', faction: 'erudite', text: '[He stares at you.] ...That\'s a strange thing to say to someone. [Beat.] Thanks.', endText: 'Any time.', onEnter: () => DV.Reputation.add('erudite', 1) },
    },
  });
  DV.DialogueDB.add('eru_hannah', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Hannah Lewis', faction: 'erudite',
        text: 'I nearly chose the coals, you know. At the ceremony. My hand was over them. [She laughs, quietly.] And then I thought: but I want to know how the coals work.',
        choices: [
          { text: 'Do you regret it?', to: 'regret' },
          { text: 'Do you know your name\'s on a list in Dr. Park\'s office?', if: () => !!FW().was('red_read'), to: 'list' },
          { text: 'See you later.', end: true },
        ],
      },
      regret: { speaker: 'Hannah Lewis', faction: 'erudite', text: 'Every day, a little. Every day, a little less. I think that\'s what choosing is.', endText: '...' },
      list: { speaker: 'Hannah Lewis', faction: 'erudite', text: '[All the colour leaves her face.] What list? [She looks round the library.] Not here. Please — not here.', endText: 'Not here.', onEnter: () => { FW().note('warned_hannah'); DV.State.setFlag('warned_hannah'); } },
    },
  });
  DV.DialogueDB.add('eru_theo', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Theo Lang', faction: 'erudite',
        text: 'Erudite-born. Fourth generation. Before you ask: yes, it\'s exactly as much pressure as it sounds. [He doesn\'t look up from his notes.]',
        choices: [
          { text: 'What do you know about Dr. Park?', to: 'park' },
          { text: 'See you later, Theo.', end: true },
        ],
      },
      park: { speaker: 'Theo Lang', faction: 'erudite', text: 'She used to work for the Director. Upstairs. Then she asked for a lab with initiates in it, which nobody ever asks for. My mother says she "lost her nerve". My mother says that about a lot of people.', endText: '...' },
    },
  });
})();
