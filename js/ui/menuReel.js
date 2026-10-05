/* ==========================================================================
   DIVERGENT — the main menu's highlights reel
   Behind the menu the city goes about its day, one faction at a time, the
   way an old attract mode showed a game off: the Dauntless free-running
   the rooftops at dusk, Abnegation handing bread to the factionless,
   Erudite at the reading hall's long tables, Candor arguing it out in the
   circle, Amity's harvest and the song round the fire. Each is a real place
   in the game with its own people doing their day, shot with a few camera
   moves and cut together through a dip to black. A place is built the first
   time the reel reaches it, behind the wipe (so the hitch is never seen);
   after that it's a cut.

     DV.Reel.start()       the main menu opens (game.js)
     DV.Reel.update(dt)    every frame on the main menu
     DV.Reel.stop(home)    the menu closes; home: back on the rooftop (the creator needs it)
     DV.Reel.jump(id)      straight to a faction's highlight (the menu's bowls)
     DV.Reel.SEGMENTS      [{ id, faction, zone, dur, name, virtue, line, time }]
     DV.Reel.info()        { id, t, shot, wiping, actors } (QA)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const COVER = 0.42, REVEAL = 0.5; // the wipe, in and out (seconds)

  const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  // a camera move over a shot: from (p0, looking at l0) to (p1, looking at l1), eased
  const move = (p0, p1, l0, l1, f0, f1) => (u) => {
    const k = U.smooth(u);
    return { pos: lerp3(p0, p1, k), look: lerp3(l0, l1, k), fov: f0 ? f0 + ((f1 || f0) - f0) * k : 0 };
  };
  const FOV = () => DV.Config.CAMERA.fov;
  function setFov(f) { const c = DV.Game.camera; if (Math.abs(c.fov - f) > 0.01) { c.fov = f; c.updateProjectionMatrix(); } }

  /* ------------------------------ things in hand ------------------------------ */
  const MATS = {};
  const mat = (hex) => MATS[hex] || (MATS[hex] = new THREE.MeshLambertMaterial({ color: hex, flatShading: true }));
  function box(w, h, d, hex, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(hex));
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }
  const ITEMS = {
    loaf: () => box(0.26, 0.11, 0.13, 0xc58d4c),
    book: (hex) => box(0.17, 0.035, 0.24, hex || 0x2c4a7a),
    basket() {
      const g = new THREE.Group();
      g.add(box(0.42, 0.2, 0.3, 0x8f6c3e));
      for (let k = 0; k < 4; k++) g.add(box(0.08, 0.08, 0.08, k % 2 ? 0xb02a1e : 0xc8402a, -0.12 + k * 0.08, 0.12, (k % 2) * 0.06 - 0.03));
      return g;
    },
    crate(full) {
      const g = new THREE.Group();
      g.add(box(0.6, 0.36, 0.42, 0x7a5c38, 0, 0.18, 0));
      if (full) for (let k = 0; k < 3; k++) { const l = ITEMS.loaf(); l.position.set(-0.17 + k * 0.17, 0.41, 0); l.rotation.y = Math.PI / 2; g.add(l); }
      return g;
    },
    guitar() {
      const g = new THREE.Group();
      g.add(box(0.34, 0.4, 0.09, 0x9a5426));
      g.add(box(0.1, 0.1, 0.012, 0x2a1a10, 0, 0.02, 0.05));
      g.add(box(0.05, 0.52, 0.035, 0x5a3a20, 0, 0.45, 0));
      g.add(box(0.08, 0.12, 0.04, 0x3a2414, 0, 0.75, 0));
      return g;
    },
    // an apple tree for the harvest (the orchard's own are pines along the fence)
    appleTree() {
      const g = new THREE.Group();
      g.add(box(0.3, 1.9, 0.3, 0x5a3f28, 0, 0.95, 0));
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 0), mat(0x4f7a32));
      crown.position.y = 2.75; crown.scale.set(1, 0.8, 1);
      g.add(crown);
      const r = U.rng(7);
      for (let k = 0; k < 16; k++) {
        const a = r() * Math.PI * 2, e = (r() - 0.3) * 1.1;
        g.add(box(0.11, 0.11, 0.11, 0xb8281c, Math.cos(a) * 1.3 * Math.cos(e), 2.75 + Math.sin(e) * 1.1, Math.sin(a) * 1.3 * Math.cos(e)));
      }
      return g;
    },
    log: () => box(1.5, 0.34, 0.34, 0x5a4028),
  };

  /* ------------------------------ the reel ------------------------------ */
  const R = {
    running: false, i: 0, t: 0, actors: [], props: [], cur: null, shotIx: -1, trans: null,

    start() {
      this.stop(false);
      this.running = true;
      this.G = DV.Game;
      this.trans = null;
      this.begin(0);
    },
    stop(home) {
      if (this.running) {
        this.teardown();
        this.running = false;
        this.trans = null;
        this.wipe(-1);
        setFov(FOV());
      }
      // the creator stands you on the rooftop
      if (home && DV.World.current && DV.World.current.id !== 'menu_bg') DV.World.activate('menu_bg');
    },
    // straight to a faction's highlight (or the city)
    jump(id) {
      const ix = SEGS.findIndex((s) => s.id === id || s.faction === id);
      if (!this.running || ix < 0 || this.trans) return false;
      if (ix === this.i) { this.t = 0; this.shotIx = -1; return true; }
      this.go(ix);
      return true;
    },
    info() {
      const S = SEGS[this.i];
      return { running: this.running, id: S.id, zone: DV.World.current && DV.World.current.id, t: this.t, shot: this.shotIx, wiping: !!this.trans, actors: this.actors.length };
    },

    /* ---------------- a segment ---------------- */
    begin(i) {
      this.teardown();
      this.i = i; this.t = 0; this.shotIx = -1; this.shotState = {};
      const S = SEGS[i], G = this.G;
      DV.World.activate(S.zone);
      // the people on the rooftop belong to it
      for (const m of G.menuFigures || []) {
        if (S.zone === 'menu_bg') { if (!m.root.parent) G.scene.add(m.root); } else if (m.root.parent) m.root.parent.remove(m.root);
      }
      this.cur = S.setup(this) || {};
      this.caption(S);
      DV.Events.emit('reel:segment', S.id);
    },
    teardown() {
      for (const a of this.actors) { if (a.m.root.parent) a.m.root.parent.remove(a.m.root); a.m.dispose(); }
      for (const p of this.props) {
        if (p.parent) p.parent.remove(p);
        p.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      }
      this.actors = []; this.props = []; this.cur = null;
    },
    // someone in the scene: { m, action, speed, path, ... }
    person(f, sex, seed, x, z, rot, action, o) {
      o = o || {};
      const app = DV.Character.fromFaction(f, sex, 'reel-' + seed, { age: o.age || 22 + (U.hashString(seed) % 36) });
      const m = DV.Character.create(app);
      m.root.position.set(x, o.y || 0, z);
      m.root.rotation.y = rot;
      this.G.scene.add(m.root);
      const a = { m, x, z, rot, action: action || 'idle', speed: 0, seatY: o.seatY, talking: !!o.talking, path: null, driven: !!o.driven };
      this.actors.push(a);
      return a;
    },
    // something in a hand (or on the chest), placed in that bone's frame
    hold(a, bone, obj, pos, rot) {
      obj.position.set(pos[0], pos[1], pos[2]);
      if (rot) obj.rotation.set(rot[0], rot[1], rot[2]);
      a.m.attach(bone, obj);
      this.props.push(obj);
      return obj;
    },
    prop(obj, x, y, z, ry) {
      obj.position.set(x, y, z);
      obj.rotation.y = ry || 0;
      this.G.scene.add(obj);
      this.props.push(obj);
      return obj;
    },
    // walk a line of points at a pace, then do `then`
    walk(a, pts, speed, then) { a.path = { pts, k: 0, speed, then: then || 'idle' }; a.action = a.action === 'carry' || a.action === 'read' ? a.action : 'walk'; },
    step(a, dt) {
      const p = a.path;
      if (p) {
        const [tx, tz] = p.pts[p.k], dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
        if (d < 0.05) { if (++p.k >= p.pts.length) { a.path = null; a.speed = 0; if (a.action === 'walk') a.action = p.then; } }
        else {
          const s = Math.min(d, p.speed * dt);
          a.x += (dx / d) * s; a.z += (dz / d) * s; a.speed = p.speed;
          a.rot = U.dampAngle(a.rot, Math.atan2(dx, dz), 8, dt);
        }
        a.m.root.position.x = a.x; a.m.root.position.z = a.z; a.m.root.rotation.y = a.rot;
      }
      a.m.animate(dt, { speed: a.speed, action: a.action, seatY: a.seatY, talking: a.talking });
    },

    /* ---------------- each frame ---------------- */
    update(dt) {
      if (!this.running) return;
      dt = Math.min(dt, 0.1);
      this.t += dt;
      const S = SEGS[this.i], cur = this.cur;
      if (cur.update) cur.update(this.t, dt);
      for (const a of this.actors) if (!a.driven) this.step(a, dt);
      if (S.zone === 'menu_bg') for (const m of this.G.menuFigures || []) m.animate(dt, { speed: 0, action: 'idle' });
      this.shoot(cur, dt);
      // the wipe into the next
      if (!this.trans && this.t >= S.dur - COVER) this.go((this.i + 1) % SEGS.length);
      if (this.trans) this.wiping(dt);
      this.progress();
    },
    shoot(cur, dt) {
      const shots = cur.shots || [];
      let ix = 0;
      while (ix + 1 < shots.length && this.t >= shots[ix + 1].at) ix++;
      const sh = shots[ix];
      if (!sh) return;
      if (ix !== this.shotIx) { this.shotIx = ix; this.shotState = {}; }
      const len = sh.len || ((shots[ix + 1] ? shots[ix + 1].at : SEGS[this.i].dur) - sh.at);
      const v = sh.fn(U.clamp((this.t - sh.at) / len, 0, 1), dt, this.shotState);
      const cam = this.G.camera;
      cam.position.set(v.pos[0], v.pos[1], v.pos[2]);
      cam.lookAt(v.look[0], v.look[1], v.look[2]);
      setFov(v.fov || FOV()); // (a long lens for the far roofs)
    },
    go(ix) {
      this.trans = { k: 0, to: ix, phase: 'cover' };
      this.caption(null);
      this.card(SEGS[ix]);
      if (DV.Audio.ctx) DV.Audio.play('whoosh', { volume: 0.12 });
    },
    wiping(dt) {
      const tr = this.trans;
      if (tr.phase === 'cover') {
        tr.k = Math.min(1, tr.k + dt / COVER);
        this.wipe(tr.k);
        if (tr.k >= 1) {
          // a place not built yet: say so, and build it on the next frame (once this one's on screen)
          const zid = SEGS[tr.to].zone;
          tr.phase = DV.World.zones[zid] ? 'swap' : 'load';
          if (tr.phase === 'load') this.wipe(1, true);
        }
      } else if (tr.phase === 'load') {
        tr.phase = 'swap';
      } else if (tr.phase === 'swap') {
        this.begin(tr.to);
        tr.phase = 'reveal'; tr.k = 1;
        this.wipe(1);
      } else {
        tr.k = Math.min(2, tr.k + dt / REVEAL);
        this.wipe(tr.k);
        if (tr.k >= 2) { this.trans = null; this.wipe(-1); this.caption(SEGS[this.i]); }
      }
    },

    /* ---------------- the menu's side of it ---------------- */
    // k 0 → 1: down to black (the next faction's mark coming up out of it); 1 → 2: up again; -1: gone
    wipe(k, loading) {
      const w = document.querySelector('#mainmenu .reel-wipe');
      if (!w) return;
      w.style.display = k < 0 ? 'none' : 'block';
      if (k < 0) return;
      const e = U.smooth(U.clamp(k <= 1 ? k : 2 - k, 0, 1));
      w.querySelector('.black').style.opacity = e.toFixed(3);
      w.querySelector('.card').style.opacity = U.clamp((e - 0.5) / 0.5, 0, 1).toFixed(3);
      w.querySelector('.loading').style.display = loading ? 'block' : 'none';
    },
    // the mark on the black between highlights
    card(S) {
      const c = document.querySelector('#mainmenu .reel-wipe .card');
      if (!c) return;
      const cv = c.querySelector('canvas'), g = cv.getContext('2d');
      this.mark(g, S, cv.width);
      c.querySelector('.cn').textContent = S.faction ? DV.Factions.name(S.faction) : S.name;
      c.querySelector('.cv').textContent = S.faction ? DV.Factions.get(S.faction).virtue : S.virtue;
    },
    // a faction's emblem in its colour, or the city's skyline
    mark(g, S, n) {
      g.clearRect(0, 0, n, n);
      if (S.faction) DV.Tex.drawEmblem(g, S.faction, n, DV.Menus.FC[S.faction]);
      else DV.Menus.drawCity(g, n, n);
    },
    caption(S) {
      const c = document.querySelector('#mainmenu .reel-cap');
      if (!c) return;
      if (!S) { c.classList.remove('show'); return; }
      const F = S.faction ? DV.Factions.get(S.faction) : null;
      c.dataset.faction = S.faction || 'city';
      c.querySelector('.cap-name').textContent = S.faction ? DV.Factions.name(S.faction) : S.name;
      c.querySelector('.cap-virtue').textContent = F ? F.virtue : S.virtue;
      c.querySelector('.cap-line').textContent = S.line;
      c.querySelector('.cap-time').textContent = S.time;
      c.querySelector('.cap-place').textContent = S.place;
      const cv = c.querySelector('canvas');
      this.mark(cv.getContext('2d'), S, cv.width);
      void c.offsetWidth; // (restart the slide-in)
      c.classList.add('show');
      document.querySelectorAll('#mainmenu .sigils .bowl').forEach((o) => o.classList.toggle('on', o.dataset.f === (S.faction || '')));
      const n = document.querySelector('#mainmenu .cap-n'), pad = (v) => (v < 10 ? '0' : '') + v;
      if (n) n.textContent = pad(this.i + 1) + ' / ' + pad(SEGS.length);
    },
    progress() {
      const d = document.querySelector('#mainmenu .bowl.on .pr i');
      if (d) d.style.width = Math.round(U.clamp(this.t / SEGS[this.i].dur, 0, 1) * 100) + '%';
    },
  };

  /* ------------------------------ the Dauntless on the roofs ------------------------------ */
  function runners(Rl, delay0) {
    const C = DV.MenuCourse;
    return [0, 1, 2].map((i) => {
      const a = Rl.person('dauntless', i === 1 ? 'f' : 'm', 'runner' + i, 31.4, C.LANES[i], Math.PI / 2, 'run', { driven: true, age: 18 + i });
      return DV.Freerun.runner(a.m, C.course(i), { delay: delay0 + i * 0.85 });
    });
  }

  /* ------------------------------ the segments ------------------------------ */
  const SEGS = [
    {
      id: 'city', faction: null, zone: 'menu_bg', dur: 13, time: '18:40', place: 'Above the Testing District',
      name: 'The City', virtue: 'Five factions, one city',
      line: 'Dusk over what\'s left of Chicago. Behind the Fence, five factions keep the peace.',
      setup(Rl) {
        const run = runners(Rl, 2.2);
        return {
          update(t, dt) { for (const r of run) r.update(t, dt); },
          // past the flags and across the roof to its corner, and round onto the roofs across the
          // street as the Dauntless come out onto them, closing in on a long lens
          shots: [{ at: 0, fn: move([-1.6, 3.0, 6.6], [7.0, 2.7, -4.5], [14, -0.4, -40], [60, -1.6, -37], FOV(), 30) }],
        };
      },
    },
    {
      id: 'dauntless', faction: 'dauntless', zone: 'menu_bg', dur: 14, time: '18:52', place: 'The rooftops, Sector 4',
      line: 'Free-running the roofs after training: across the alleys, up the walls, and down the long way.',
      setup(Rl) {
        const run = runners(Rl, 0);
        const lead = () => run[0].last || { x: 31.4, y: -1.5 };
        return {
          update(t, dt) { for (const r of run) r.update(t, dt); },
          shots: [
            // alongside the leader: out of the stairhouse, the vault, the first gap
            { at: 0, fn: (u, dt, st) => {
              const want = Math.max(33, lead().x - 2.0);
              st.x = st.x === undefined ? want : U.damp(st.x, want, 3.2, dt);
              return { pos: [st.x, -0.05 - u * 0.5, -29.3], look: [st.x + 4.4, -1.15 - u * 0.6, -37.6] };
            } },
            // low on the second roof, looking back: the leap and the roll come at you, the kong goes by
            { at: 3.2, fn: move([57.1, -1.8, -33.0], [56.3, -1.85, -33.5], [48.5, -1.7, -37.4], [50.2, -1.6, -37.4]) },
            // under the last gap: the flip, two storeys down
            { at: 6.6, fn: move([77.2, -3.3, -31.8], [76.4, -3.5, -32.3], [69.6, 0.4, -37.0], [71.0, -0.6, -37.0]) },
            // and up and away as they turn and look back at the city
            { at: 10.2, fn: move([73.2, -3.1, -30.6], [71.0, 0.4, -27.4], [80.2, -3.4, -37.3], [80.0, -3.2, -37.3]) },
          ],
        };
      },
    },
    {
      id: 'abnegation', faction: 'abnegation', zone: 'abn_street', dur: 11.5, time: '11:30', place: 'The grey streets',
      line: 'Bread for the factionless at the corner. Again tomorrow, and the day after.',
      setup(Rl) {
        const A = 'abnegation';
        // the trestle table, the crates, the loaves
        const table = new THREE.Group();
        table.add(box(2.2, 0.06, 0.8, 0x77756f, 0, 0.76, 0));
        for (const x of [-1, 1]) for (const z of [-0.33, 0.33]) table.add(box(0.06, 0.74, 0.06, 0x4a4a48, x, 0.37, z));
        for (let k = 0; k < 6; k++) { const l = ITEMS.loaf(); l.position.set(-0.8 + k * 0.32, 0.85, (k % 2) * 0.16 - 0.08); table.add(l); }
        Rl.prop(table, 19, 0, 13.4, 0);
        Rl.prop(ITEMS.crate(true), 17.3, 0, 14.0, 0.2);
        Rl.prop(ITEMS.crate(true), 17.4, 0.36, 14.0, -0.1);
        Rl.prop(ITEMS.crate(false), 20.9, 0, 14.4, 0.4);
        const v1 = Rl.person(A, 'f', 'vol1', 18.4, 14.3, Math.PI, 'give', { age: 52 });
        const v2 = Rl.person(A, 'm', 'vol2', 19.7, 14.3, Math.PI, 'give', { age: 24 });
        Rl.hold(v1, 'handR', ITEMS.loaf(), [0, -0.1, 0.06], [0, 0, Math.PI / 2]);
        Rl.hold(v2, 'handR', ITEMS.loaf(), [0, -0.1, 0.06], [0, 0, Math.PI / 2]);
        // the queue
        const q = [[19.0, 12.3, 0, 'badge'], [20.3, 11.6, -1.3, 'idle'], [21.5, 11.2, -1.45, 'arms_crossed'], [22.8, 11.0, -1.5, 'idle'], [24.1, 11.1, -1.55, 'idle']];
        q.forEach(([x, z, r, act], k) => Rl.person('factionless', k % 2 ? 'f' : 'm', 'fl' + k, x, z, r, act, { age: 26 + k * 9 }));
        // more bread on the way, the step swept, people going about it
        const carrier = Rl.person(A, 'm', 'carrier', 34, 13.6, -Math.PI / 2, 'carry', { age: 38 });
        Rl.hold(carrier, 'chest', ITEMS.crate(true), [0, -0.42, 0.33]);
        Rl.walk(carrier, [[21.4, 13.9]], 1.1);
        Rl.person(A, 'f', 'sweeper', 15.0, 1.3, Math.PI, 'sweep', { age: 61 });
        const w1 = Rl.person(A, 'm', 'walker1', 42, 6.2, -Math.PI / 2, 'walk', { age: 70 });
        const w2 = Rl.person(A, 'f', 'walker2', 42.6, 7.0, -Math.PI / 2, 'walk', { age: 67 });
        Rl.walk(w1, [[9, 6.2]], 0.95); Rl.walk(w2, [[9.6, 7.0]], 0.95);
        return {
          shots: [
            { at: 0, fn: move([14.5, 1.75, 6.8], [16.6, 1.75, 7.2], [21.5, 1.2, 12.4], [20.0, 1.2, 12.8]) },
            { at: 5.6, fn: move([16.8, 1.55, 10.9], [17.4, 1.5, 11.3], [19.0, 1.25, 13.4], [19.2, 1.25, 13.5]) },
          ],
        };
      },
    },
    {
      id: 'erudite', faction: 'erudite', zone: 'eru_hall', dur: 11.5, time: '14:10', place: 'Erudite HQ \u00b7 the reading hall',
      line: 'The reading hall never closes. Some of them never leave it.',
      setup(Rl) {
        const E = 'erudite', BOOKS = [0x2c4a7a, 0x7a2c2c, 0x3a5a3a, 0x8a7a50, 0x1e2e4e];
        // at the long tables (each seat a real chair: ±0.75 along, 0.9 out)
        const seats = [[8.25, 8.1, 0, 'work'], [9.75, 9.9, Math.PI, 'work'], [22.25, 8.1, 0, 'work'], [23.75, 9.9, Math.PI, 'sit_fold'], [8.25, 14.1, 0, 'work'], [22.25, 15.9, Math.PI, 'work'], [23.75, 14.1, 0, 'sit_touch']];
        seats.forEach(([x, z, r, act], k) => {
          Rl.person(E, k % 3 ? 'm' : 'f', 'reader' + k, x, z, r, act, { seatY: 0.45, age: 19 + k * 7 });
          // their books and papers on the table in front of them
          const b = ITEMS.book(BOOKS[k % BOOKS.length]);
          Rl.prop(b, x + 0.12, 0.76, z + (r === 0 ? 0.42 : -0.42), 0.3 * (k % 2 ? 1 : -1));
        });
        // at the shelves
        const sh = Rl.person(E, 'f', 'shelver', 13.5, 1.3, Math.PI, 'shelve', { age: 33 });
        Rl.hold(sh, 'handL', ITEMS.book(0x5a3a6a), [0, -0.1, 0.05], [Math.PI / 2, 0, 0]);
        // a lecture in front of the sculpture, to the newest of them
        const lec = Rl.person(E, 'm', 'lecturer', 16.0, 8.7, Math.PI, 'clipboard', { talking: true, age: 58 });
        Rl.hold(lec, 'handL', ITEMS.book(0x1e2e4e), [0, -0.1, 0.05], [Math.PI / 2, 0, 0]);
        [[14.8, 6.9], [16.1, 6.5], [17.3, 6.95]].forEach(([x, z], k) => Rl.person(E, k === 1 ? 'f' : 'm', 'student' + k, x, z, Math.atan2(16 - x, 8.7 - z), k === 2 ? 'arms_crossed' : 'idle', { age: 17 + k }));
        // two of them walking the hall, noses in books
        const w1 = Rl.person(E, 'f', 'walkreader', 29, 5.4, -Math.PI / 2, 'read', { age: 27 });
        Rl.hold(w1, 'handL', ITEMS.book(0x7a2c2c), [0, -0.1, 0.05], [Math.PI / 2, 0, 0]);
        Rl.walk(w1, [[3.5, 5.4]], 0.9, 'read');
        const w2 = Rl.person(E, 'm', 'walkreader2', 3.0, 18.6, Math.PI / 2, 'read', { age: 44 });
        Rl.hold(w2, 'handL', ITEMS.book(0x3a5a3a), [0, -0.1, 0.05], [Math.PI / 2, 0, 0]);
        Rl.walk(w2, [[29, 18.6]], 0.85, 'read');
        return {
          shots: [
            { at: 0, fn: move([2.4, 2.5, 12.0], [6.4, 2.1, 12.2], [20, 1.2, 11.6], [20, 1.1, 11.2]) },
            { at: 5.6, fn: move([11.7, 1.7, 5.8], [12.4, 1.65, 6.5], [16.0, 1.45, 8.3], [16.0, 1.45, 8.5]) },
          ],
        };
      },
    },
    {
      id: 'candor', faction: 'candor', zone: 'cand_lobby', dur: 11.5, time: '16:05', place: 'The Merciless Mart',
      line: 'Two sides of a question, in the circle, in front of everyone. Nobody leaves until it\'s the truth.',
      setup(Rl) {
        const C = 'candor';
        for (let k = 0; k < 10; k++) {
          if (k === 7) continue; // (a gap in the ring, where the camera looks in)
          const a = (k / 10) * Math.PI * 2, x = 14 + Math.cos(a) * 6.2, z = 11 + Math.sin(a) * 4.8;
          const act = k === 2 ? 'point' : k === 5 ? 'clap' : k % 3 === 0 ? 'idle' : 'arms_crossed';
          Rl.person(C, k % 2 ? 'f' : 'm', 'ring' + k, x, z, Math.atan2(14 - x, 11 - z), act, { talking: k === 4, age: 24 + k * 5 });
        }
        Rl.person(C, 'f', 'debaterA', 13.05, 11.0, Math.PI / 2, 'argue', { age: 41 });
        Rl.person(C, 'm', 'debaterB', 14.95, 11.0, -Math.PI / 2, 'argue', { age: 35 });
        Rl.person(C, 'f', 'chair', 14.0, 15.4, Math.PI, 'arms_crossed', { age: 55 });
        return {
          shots: [
            { at: 0, fn: (u) => { const a = -2.05 + U.smooth(u) * 0.7; return { pos: [14 + Math.cos(a) * 7.6, 2.7 - u * 0.4, 11 + Math.sin(a) * 7.6], look: [14, 1.2, 11.4] }; } },
            { at: 5.6, fn: move([12.1, 1.55, 8.5], [12.7, 1.55, 8.9], [14.0, 1.45, 11.0], [14.0, 1.45, 11.0]) },
          ],
        };
      },
    },
    {
      id: 'amity', faction: 'amity', zone: 'amity_farm', dur: 12.5, time: '19:30', place: 'The orchards, inside the Fence',
      line: 'The harvest in before dark, and a song round the fire after.',
      setup(Rl) {
        const M = 'amity', F = [23, 17];
        // logs round the fire, and who's sitting on them
        [[20, 'sit_clap'], [80, 'sit_strum'], [140, 'sit'], [320, 'sit_clap']].forEach(([deg, act], k) => {
          const a = (deg * Math.PI) / 180, x = F[0] + Math.cos(a) * 2.75, z = F[1] + Math.sin(a) * 2.75;
          Rl.prop(ITEMS.log(), F[0] + Math.cos(a) * 2.85, 0.17, F[1] + Math.sin(a) * 2.85, -a + Math.PI / 2);
          const p = Rl.person(M, k % 2 ? 'f' : 'm', 'fire' + k, x, z, Math.atan2(F[0] - x, F[1] - z), act, { seatY: 0.36, age: 20 + k * 11 });
          if (act === 'sit_strum') Rl.hold(p, 'chest', ITEMS.guitar(), [0.06, -0.32, 0.2], [0, 0, -1.1]);
        });
        [[175, 'f'], [345, 'm']].forEach(([deg, sex], k) => {
          const a = (deg * Math.PI) / 180, x = F[0] + Math.cos(a) * 1.95, z = F[1] + Math.sin(a) * 1.95;
          Rl.person(M, sex, 'dancer' + k, x, z, Math.atan2(F[0] - x, F[1] - z) + Math.PI, 'dance', { age: 17 + k * 4 });
        });
        // the harvest, under the apple trees
        Rl.prop(ITEMS.appleTree(), 30.2, 0, 25.6, 0.4);
        Rl.prop(ITEMS.appleTree(), 35.6, 0, 26.6, 1.3);
        const p1 = Rl.person(M, 'f', 'picker1', 29.5, 24.6, Math.atan2(30.2 - 29.5, 25.6 - 24.6), 'pick', { age: 29 });
        const p2 = Rl.person(M, 'm', 'picker2', 34.8, 25.5, Math.atan2(35.6 - 34.8, 26.6 - 25.5), 'pick', { age: 46 });
        Rl.hold(p1, 'handL', ITEMS.basket(), [0, -0.16, 0.06]);
        Rl.hold(p2, 'handL', ITEMS.basket(), [0, -0.16, 0.06]);
        const c = Rl.person(M, 'm', 'carrier', 32.1, 25.0, Math.PI, 'carry', { age: 33 });
        Rl.hold(c, 'chest', ITEMS.basket(), [0, -0.38, 0.33]);
        Rl.walk(c, [[31.6, 19.5], [31.4, 13.4]], 0.9);
        return {
          shots: [
            // the pickers under the apple trees, the basket on its way past
            { at: 0, fn: move([26.6, 1.75, 20.4], [27.5, 1.8, 21.3], [32.0, 1.7, 26.0], [32.6, 1.7, 26.2]) },
            // low across the fire to the singer
            { at: 6.2, fn: move([21.2, 1.15, 12.7], [21.7, 1.2, 13.3], [23.3, 1.05, 18.0], [23.4, 1.1, 18.2]) },
          ],
        };
      },
    },
  ];
  R.SEGMENTS = SEGS;
  DV.Reel = R;
})();
