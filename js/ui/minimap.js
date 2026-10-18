/* ==========================================================================
   DIVERGENT — the minimap, and waypoints
   A round map in the corner of the HUD that turns with the camera: the
   streets, the blocks, every building's footprint (drawn once from the
   city, a metre to the pixel), the Circle Line's stations, the landmarks,
   your objective and your waypoint (pinned to the rim when they're further
   off than the map shows, with the distance), north on the rim, and you in
   the middle. Indoors (or underground) it shows the rooms round you.

   Waypoints: click a spot on the city map (Tab → Map → City) to set one;
   click it again to clear it. It's marked on the minimap, on the compass,
   and in the street as a pillar of light you can see over the rooftops. It
   clears itself when you get there.

     DV.Waypoint.set(x, z) / clear() / get()
     DV.Minimap.update(game)              (from the HUD, every frame)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const SIZE = 180, R = SIZE / 2 - 4; // the dial, and the radius of what it shows (px)
  const CITY_PPM = 1.15, ROOM_PPM = 7; // pixels per metre: out in the city, indoors
  const BASE_HALF = 1200; // the base image covers the Fence and a little more (1 px a metre)

  /* ---------------- waypoints ---------------- */
  const Waypoint = {
    get() { const w = DV.State.data && DV.State.data.world && DV.State.data.world.waypoint; return w || null; },
    set(x, z) {
      DV.State.data.world.waypoint = { x: +x.toFixed(1), z: +z.toFixed(1) };
      const L = DV.CityMap && DV.CityMap.locate ? DV.CityMap.locate(x, z) : null;
      DV.UI.notify('Waypoint set' + (L ? ': ' + L.name : '') + '.');
      DV.Audio.play('click');
      DV.Events.emit('waypoint', DV.State.data.world.waypoint);
    },
    clear(quiet) {
      if (!this.get()) return;
      DV.State.data.world.waypoint = null;
      if (!quiet) DV.UI.notify('Waypoint cleared.');
      DV.Events.emit('waypoint', null);
    },
    // out in the city (where waypoints are)
    here() { const z = DV.World.current; return !!z && z.id === 'testing_center' && !!z.city; },
    distance() { const w = this.get(); return w && this.here() ? Math.hypot(w.x - DV.Player.x, w.z - DV.Player.z) : null; },
    // the beacon in the street: a tall pale shaft and a ring on the ground, seen over the rooftops
    beacon() {
      if (this._b) return this._b;
      const g = new THREE.Group();
      g.name = 'waypoint_beacon';
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 90, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      shaft.position.y = 45;
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 32), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06;
      g.add(shaft, ring);
      g.renderOrder = 7;
      g.visible = false;
      this._b = { g, shaft, ring };
      return this._b;
    },
    update(dt) {
      const B = this.beacon(), G = DV.Game, w = this.get();
      if (!B.g.parent && G && G.scene) G.scene.add(B.g);
      const show = !!w && this.here() && !G.inSimulation() && !(G.ctrl && G.ctrl());
      B.g.visible = show;
      if (!show) return;
      B.g.position.set(w.x, 0, w.z);
      const d = Math.hypot(w.x - DV.Player.x, w.z - DV.Player.z);
      this._t = (this._t || 0) + dt;
      B.shaft.material.opacity = U.clamp(d / 40, 0.06, 0.24) * (0.85 + 0.15 * Math.sin(this._t * 2.4));
      B.ring.scale.setScalar(1 + 0.12 * Math.sin(this._t * 3));
      if (d < 7) { this.clear(true); DV.UI.notify('You\'ve reached your waypoint.', 'quest'); DV.Audio.play('chime', { volume: 0.3 }); }
    },
  };

  /* ---------------- the minimap ---------------- */
  const Minimap = {
    el: null, cv: null, base: null, t: 0,
    ensure() {
      if (this.el) return true;
      const hud = document.getElementById('hud');
      if (!hud) return false;
      const el = document.createElement('div');
      el.id = 'hud-minimap';
      el.innerHTML = '<canvas width="' + SIZE + '" height="' + SIZE + '"></canvas><div class="mm-ring"></div><div class="mm-n">N</div><div class="mm-label"></div>';
      hud.appendChild(el);
      this.el = el;
      this.cv = el.querySelector('canvas');
      this.n = el.querySelector('.mm-n');
      this.label = el.querySelector('.mm-label');
      return true;
    },
    // the city once, a metre to the pixel: ground, farmland, streets, pavements, blocks, every building
    buildBase(zone) {
      const CM = DV.CityMap, N = BASE_HALF * 2;
      const cv = document.createElement('canvas');
      cv.width = cv.height = N;
      const g = cv.getContext('2d');
      const ox = CM.centre[0] - BASE_HALF, oz = CM.centre[1] - BASE_HALF;
      const X = (x) => x - ox, Y = (z) => z - oz;
      const rect = (q, col) => { g.fillStyle = col; g.fillRect(X(q[0]), Y(q[1]), q[2] - q[0], q[3] - q[1]); };
      g.fillStyle = '#141309'; g.fillRect(0, 0, N, N);
      g.save();
      g.beginPath(); g.arc(X(CM.centre[0]), Y(CM.centre[1]), CM.fence, 0, Math.PI * 2); g.clip();
      g.fillStyle = '#1f2717'; g.fillRect(0, 0, N, N);
      const FM = CM.farms();
      const CROP = { wheat: '#4e4a2a', green: '#2b3b1b', plough: '#3c3020', pasture: '#2f3d20', fallow: '#3f3d2c', stubble: '#4a462c', corn: '#323e18', cabbage: '#2c3c23', beans: '#283819' };
      for (const f of FM.fields) rect(f.r, CROP[f.crop] || '#2b3b1b');
      for (const q of FM.roads) rect(q, '#5a4e3a');
      g.fillStyle = '#262a20'; g.beginPath(); g.arc(X(CM.centre[0]), Y(CM.centre[1]), CM.edge, 0, Math.PI * 2); g.fill();
      const NET = CM.roadNet();
      for (const q of NET.strips) rect(q.r, '#4a4840');
      // the blocks (their pavements show round them), then the roads over everything
      for (const b of DV.WorldMap.blocks()) rect(b.r, '#56534a');
      for (const q of NET.roads) rect(q.r, q.kind !== 'out' ? '#2a2b2e' : '#4a4234');
      g.fillStyle = '#10201f'; g.fillRect(X(CM.marshX), 0, N, N);
      // every building: its footprint, a shade lighter than the block
      const sol = (zone.city && zone.city.walk && zone.city.walk.solids) || [];
      for (const q of sol) {
        if (q[4] < 2.4 || q[2] - q[0] < 1.5 || q[3] - q[1] < 1.5) continue;
        rect(q, q[4] > 20 ? '#8a8578' : '#79756a');
      }
      // the Testing Center's grounds
      const cp = CM.campus;
      rect(cp, '#8a7650');
      g.restore();
      // the Fence
      g.strokeStyle = '#a8946a'; g.lineWidth = 6;
      g.beginPath(); g.arc(X(CM.centre[0]), Y(CM.centre[1]), CM.fence, 0, Math.PI * 2); g.stroke();
      this.base = { cv, ox, oz };
    },
    update(game) {
      if (!this.ensure()) return;
      const zone = DV.World.current, sim = game.inSimulation && game.inSimulation();
      const show = !!zone && !sim && DV.Settings.get('minimap') !== false;
      this.el.classList.toggle('hidden', !show);
      if (!show) return;
      const now = performance.now();
      if (now - this.t < 66) return; // (fifteen times a second is plenty)
      this.t = now;
      const g = this.cv.getContext('2d');
      const P = DV.Player, yaw = game.rig ? game.rig.yaw : P.rot;
      const city = zone.id === 'testing_center' && zone.city && zone.city.walk && !zone.roomAt(P.x, P.z);
      const ppm = city ? CITY_PPM : ROOM_PPM;
      // the map turns so the way the camera faces is up
      const turn = -Math.PI / 2 - Math.atan2(Math.cos(yaw), Math.sin(yaw));
      g.save();
      g.clearRect(0, 0, SIZE, SIZE);
      g.beginPath(); g.arc(SIZE / 2, SIZE / 2, R, 0, Math.PI * 2); g.clip();
      g.fillStyle = city ? '#141309' : '#0d0e10';
      g.fillRect(0, 0, SIZE, SIZE);
      g.translate(SIZE / 2, SIZE / 2);
      g.rotate(turn);
      if (city) {
        if (!this.base) this.buildBase(zone);
        const B = this.base;
        g.imageSmoothingEnabled = true;
        g.drawImage(B.cv, (B.ox - P.x) * ppm, (B.oz - P.z) * ppm, B.cv.width * ppm, B.cv.height * ppm);
      } else this.drawRooms(g, zone, ppm);
      const toMap = (x, z) => [(x - P.x) * ppm, (z - P.z) * ppm];
      // what's out there: stations, landmarks, home (only out in the city), the objective, the waypoint
      const marks = [];
      if (city) {
        if (DV.Metro) for (const s of DV.Metro.STATIONS) marks.push({ x: s.x, z: s.z, kind: 'metro' });
        if (DV.Shops) for (const S of DV.Shops.STORES) marks.push({ x: S.x, z: S.z, kind: 'shop', S });
        for (const l of DV.CityMap.landmarks) marks.push({ x: l.x, z: l.z, kind: 'land' });
      }
      const cur = DV.Quests.current && DV.Quests.current();
      const tp = cur && DV.Settings.get('questMarkers') ? DV.UI.targetPos(DV.Quests.objTarget(cur.obj)) : null;
      if (tp) marks.push({ x: tp[0], z: tp[1], kind: 'quest', pin: true });
      const wp = Waypoint.get();
      if (wp && city) marks.push({ x: wp.x, z: wp.z, kind: 'wp', pin: true });
      g.rotate(-turn); // (icons stay upright: place them by the turned position)
      const c = Math.cos(turn), s = Math.sin(turn);
      for (const m of marks) {
        let [mx, mz] = toMap(m.x, m.z);
        let px = mx * c - mz * s, py = mx * s + mz * c;
        const d = Math.hypot(px, py);
        if (d > R - 8) { if (!m.pin) continue; px *= (R - 8) / d; py *= (R - 8) / d; }
        this.icon(g, px, py, m.kind, m);
      }
      // you: an arrow the way you're facing (relative to the camera)
      const rel = P.rot - yaw;
      g.rotate(-rel);
      g.fillStyle = '#f2e6c4'; g.strokeStyle = '#1a1712'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
      g.restore();
      // north on the rim
      const na = turn - Math.PI / 2; // (north is -z: straight up before the turn)
      this.n.style.left = SIZE / 2 + Math.cos(na) * (R - 1) - 6 + 'px';
      this.n.style.top = SIZE / 2 + Math.sin(na) * (R - 1) - 8 + 'px';
      // the waypoint's (or the objective's) distance under the dial
      const wd = Waypoint.distance();
      const txt = wd !== null ? '◆ ' + Math.round(wd) + ' m' : '';
      if (this._lt !== txt) { this._lt = txt; this.label.textContent = txt; }
    },
    icon(g, x, y, kind, m) {
      if (kind === 'shop') {
        // a shop: its letter on a tile in its sector's colour (dimmed while it's shut)
        const open = DV.Shops.isOpen(m.S);
        g.globalAlpha = open ? 1 : 0.55;
        g.fillStyle = '#1a1712'; g.fillRect(x - 5.5, y - 5.5, 11, 11);
        g.strokeStyle = m.S.colour; g.lineWidth = 1.5; g.strokeRect(x - 5.5, y - 5.5, 11, 11);
        g.fillStyle = '#f0e6c8'; g.font = 'bold 9px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(m.S.letter, x, y + 0.5);
        g.globalAlpha = 1;
      } else if (kind === 'metro') {
        g.fillStyle = '#14181c'; g.strokeStyle = '#c0582a'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#e8e4d8'; g.fillRect(x - 5.5, y - 1, 11, 2);
      } else if (kind === 'land') {
        g.fillStyle = '#e8d9b0'; g.strokeStyle = '#1a1712'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 4, y); g.lineTo(x, y + 4); g.lineTo(x - 4, y); g.closePath(); g.fill(); g.stroke();
      } else if (kind === 'quest') {
        g.fillStyle = '#ffd36a'; g.strokeStyle = '#2a1e08'; g.lineWidth = 1.5;
        star(g, x, y, 6.5, 3); g.fill(); g.stroke();
      } else if (kind === 'wp') {
        g.fillStyle = '#8fd8ff'; g.strokeStyle = '#0a1a24'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x, y - 6.5); g.lineTo(x + 5, y); g.lineTo(x, y + 6.5); g.lineTo(x - 5, y); g.closePath(); g.fill(); g.stroke();
      }
    },
    // indoors: the rooms round you (the ones you've been in, lit; the rest dim), and the doors
    drawRooms(g, zone, ppm) {
      const P = DV.Player, vis = (DV.State.zoneState(zone.id) || {}).visited || {};
      for (const r of zone.rooms) {
        if (r.noMap) continue;
        const seen = vis[r.id] || r.exterior || zone.id === 'metro';
        g.fillStyle = r.exterior ? '#2a2e26' : seen ? '#4a4840' : '#24231f';
        g.fillRect((r.x0 - P.x) * ppm, (r.z0 - P.z) * ppm, (r.x1 - r.x0) * ppm, (r.z1 - r.z0) * ppm);
        g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
        g.strokeRect((r.x0 - P.x) * ppm, (r.z0 - P.z) * ppm, (r.x1 - r.x0) * ppm, (r.z1 - r.z0) * ppm);
      }
      g.fillStyle = '#a89068';
      for (const d of zone.doors || []) {
        const D = d.def || d;
        if (D.x === undefined) continue;
        g.fillRect((D.x - P.x) * ppm - 2, (D.z - P.z) * ppm - 2, 4, 4);
      }
    },
  };
  function star(g, x, y, ro, ri) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? ri : ro, a = -Math.PI / 2 + (i * Math.PI) / 5; if (i) g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath();
  }

  DV.Waypoint = Waypoint;
  DV.Minimap = Minimap;
})();
