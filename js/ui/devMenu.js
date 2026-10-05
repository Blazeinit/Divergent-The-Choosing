/* ==========================================================================
   DIVERGENT — the developer menu
   For testing, not for playing: Settings → Developer → "Dev menu" turns it
   on. Then ` (the key under Esc) or Pause → Developer opens it.

   - Go to: the city's landmarks, sectors and front doors (or the rooms of
     wherever you are). Shift+click on the City map goes there too.
   - Story: jump into a point of the story (the gate open after your results,
     the evening at home, the Choosing, a Dauntless day, a first week). A jump
     patches the game you have loaded: don't save it over one you care about.
   - Time: the hour and the day, freeze the clock, run it fast.
   - You: walk through walls (noclip), run faster, never tire.
   - World: an info readout (where, when, frame cost, the street's numbers),
     hide the HUD for screenshots, empty the streets.
   - Quests & items: finish the objective you're on, give yourself anything.

     DV.Dev.on()          → the setting
     DV.Dev.flags         → { noclip, speed, stamina, overlay, hideHud, noStreet, timeMul }
     DV.Dev.open()        → the panel (from the pause menu)
     DV.Dev.go(x, z)      → teleport to the nearest place you can stand
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const el = U.el;

  const Dev = {
    flags: { noclip: false, speed: 1, stamina: false, overlay: false, hideHud: false, noStreet: false, timeMul: 1 },
    on() { return !!DV.Settings.get('devMenu'); },

    /* ---------------- the panel ---------------- */
    open() {
      if (!this.on()) return;
      const G = DV.Game;
      if (G.state === 'playing') G.pause();
      const M = DV.Menus;
      M.closeSide();
      const p = M.side('Developer');
      p.classList.add('devmenu');
      const body = p.querySelector('.body');
      const zone = DV.World.current, P = DV.Player;
      const room = zone && zone.roomAt(P.x, P.z);
      const place = zone && zone.placeName ? zone.placeName(P.x, P.z) : null;
      el('div', 'dev-where', U.esc((zone ? zone.id : '—') + (room ? ' · ' + room.id : '') + (place && !room ? ' · ' + place.name : '') + ' · x ' + P.x.toFixed(1) + ' z ' + P.z.toFixed(1) + ' · Day ' + DV.Clock.day() + ' ' + DV.Clock.str() + (G.ctrl() ? ' · chapter ' + DV.Chapter.id : ' · district ' + DV.District.currentId())), body);
      const section = (title) => el('div', 'h', title, body);
      const row = (label) => { const r = el('div', 'dev-row', label ? '<label>' + U.esc(label) + '</label>' : '', body); return el('div', 'dev-btns', null, r); };
      const btn = (r, label, fn, on) => {
        const b = el('span', 'btn small' + (on ? ' on' : ''), U.esc(label), r);
        b.onclick = () => { DV.Audio.play('click'); try { fn(b); } catch (e) { console.error(e); DV.UI.notify('Dev: ' + e.message); } };
        return b;
      };
      const toggle = (r, label, key, after) => btn(r, label, (b) => { this.flags[key] = !this.flags[key]; b.classList.toggle('on', this.flags[key]); if (after) after(); }, this.flags[key]);
      const radio = (r, opts, key, after) => {
        const bs = opts.map(([v, label]) => btn(r, label, () => { this.flags[key] = v; bs.forEach((b, k) => b.classList.toggle('on', opts[k][0] === v)); if (after) after(); }, this.flags[key] === v));
      };

      // where to go
      section('Go to');
      const places = this.places();
      for (const grp of places) {
        const r = row(grp.label);
        for (const pl of grp.list) btn(r, pl.name, () => this.goAndPlay(pl.x, pl.z, pl.rot));
      }
      if (zone && zone.id === 'testing_center') el('div', 'dev-note', 'Shift+click on the City map (Tab → Map → City) goes there too.', body);

      // the story
      section('Story (patches this game: don\'t save over a real one)');
      let r = row('Aptitude Day');
      btn(r, 'Results in, gate open', () => this.jump('gate'));
      btn(r, 'Evening at home', () => this.jump('home'));
      btn(r, 'The Choosing', () => this.jump('ceremony'));
      r = row('Dauntless');
      for (const d of [2, 3, 4, 5, 6]) btn(r, 'Day ' + d, () => this.jump('dauntless', d));
      r = row('First week');
      for (const f of ['candor', 'erudite', 'abnegation', 'amity']) btn(r, DV.Factions.name(f), () => this.jump('week', f));

      // time
      section('Time');
      r = row('Hour');
      btn(r, '−1 h', () => this.setTime(DV.Clock.minutes() - 60));
      btn(r, '+15 min', () => this.setTime(DV.Clock.minutes() + 15));
      btn(r, '+1 h', () => this.setTime(DV.Clock.minutes() + 60));
      for (const t of ['06:00', '08:00', '12:00', '17:00', '19:30', '21:00', '23:00']) btn(r, t, () => this.setTime(U.parseTime(t)));
      r = row('Day');
      btn(r, '−1', () => { DV.State.data.world.day = Math.max(1, DV.Clock.day() - 1); this.after(); });
      btn(r, '+1', () => { DV.State.data.world.day += 1; this.after(); });
      r = row('Clock');
      btn(r, 'Frozen', (b) => { DV.Clock.paused = !DV.Clock.paused; b.classList.toggle('on', DV.Clock.paused); }, DV.Clock.paused);
      radio(r, [[1, '×1'], [6, '×6'], [60, '×60']], 'timeMul');

      // you
      section('You');
      r = row('');
      toggle(r, 'Noclip (through walls)', 'noclip');
      toggle(r, 'Never tire', 'stamina');
      r = row('Speed');
      radio(r, [[1, '×1'], [2, '×2'], [4, '×4']], 'speed');

      // the world
      section('World');
      r = row('');
      toggle(r, 'Info readout', 'overlay', () => this.update(0, true));
      toggle(r, 'Hide HUD', 'hideHud', () => this.update(0, true));
      toggle(r, 'Empty streets', 'noStreet');

      // quests and items
      section('Quests & items');
      r = row('Quest');
      const cur = DV.Quests.current();
      btn(r, cur ? 'Finish: ' + DV.Quests.objText(cur.obj) : 'No objective', () => {
        const c = DV.Quests.current();
        if (c) DV.Quests.setObj(c.quest.id, c.obj.id, 'done', '(dev)');
        DV.Menus.closeSide(); this.open();
      });
      r = row('Give');
      const sel = el('select', null, null, r);
      for (const it of Object.values(DV.Items.defs).sort((a, b) => a.name.localeCompare(b.name))) { const o = el('option', null, U.esc(it.name), sel); o.value = it.id; }
      btn(r, 'Give', () => { if (sel.value) DV.Inventory.add(sel.value, 1); });
    },

    /* ---------------- where you can go ---------------- */
    places() {
      const zone = DV.World.current;
      if (!zone) return [];
      if (zone.id === 'testing_center' && zone.city && zone.city.walk) {
        const CM = DV.CityMap, out = [];
        out.push({ label: 'Testing Center', list: [{ name: 'Lobby', x: zone.def.spawn.x, z: zone.def.spawn.z, rot: zone.def.spawn.rot }, { name: 'Front gate', x: 40, z: 74, rot: 0 }, { name: 'Bus stop', x: 47, z: 77.6, rot: 0 }] });
        out.push({ label: 'Landmarks', list: CM.landmarks.filter((l) => !l.outside && l.id !== 'testing_center').map((l) => ({ name: l.name.replace(/^The /, ''), x: l.x, z: l.z + (l.d ? l.d / 2 + 6 : 14) })) });
        out.push({ label: 'Front doors', list: Object.keys(CM.homes).map((f) => ({ name: DV.Factions.name(f), x: CM.homes[f].x, z: CM.homes[f].z })) });
        out.push({ label: 'Sectors', list: CM.districts.map((d) => ({ name: d.short, x: d.c[0], z: d.c[1] })) });
        return out;
      }
      // anywhere else: its rooms
      const rooms = (zone.def.rooms || []).filter((r) => r.rect || (r.x0 !== undefined)).slice(0, 40);
      const list = rooms.map((r) => { const q = r.rect || [r.x0, r.z0, r.x1, r.z1]; return { name: r.name || r.id, x: (q[0] + q[2]) / 2, z: (q[1] + q[3]) / 2 }; });
      return list.length ? [{ label: 'Rooms', list }] : [];
    },
    // the nearest point to (x, z) you could stand on
    standable(x, z) {
      const zone = DV.World.current;
      const ok = (px, pz) => {
        if (!zone.walkable(px, pz)) return false;
        const [rx, rz] = zone.colliders.resolveCircle(px, pz, 0.4, 'player', 0);
        return Math.hypot(rx - px, rz - pz) < 0.01;
      };
      if (ok(x, z)) return [x, z];
      for (let r = 1; r <= 40; r += 1) for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (ok(px, pz)) return [px, pz];
      }
      return null;
    },
    go(x, z, rot) {
      const zone = DV.World.current, P = DV.Player;
      if (!zone) return false;
      const at = this.flags.noclip ? [x, z] : this.standable(x, z);
      if (!at) { DV.UI.notify('Dev: nowhere to stand near there.'); return false; }
      if (P.seat) { P.seat.occupant = null; P.seat = null; }
      P.place(at[0], at[1], rot === undefined ? P.rot : rot);
      P.lastSafe = [at[0], at[1]];
      DV.Game.rig.yaw = P.rot; DV.Game.rig.follow(true);
      if (zone.streetKit) zone.streetKit.warm(at[0], at[1]);
      return true;
    },
    goAndPlay(x, z, rot) {
      if (this.go(x, z, rot)) { DV.Menus.closeSide(); DV.Game.resume(); }
    },

    /* ---------------- time ---------------- */
    setTime(m) {
      const w = DV.State.data.world;
      while (m < 0) { m += 1440; w.day = Math.max(1, w.day - 1); }
      while (m >= 1440) { m -= 1440; w.day += 1; }
      w.time = m;
      this.after();
    },
    after() {
      DV.Clock.lastMinute = Math.floor(DV.State.data.world.time);
      DV.Events.emit('clock:minute', Math.floor(DV.State.data.world.time));
      DV.NPCAI.syncAll();
      if (DV.Player.seat) DV.Player.seat.occupant = 'player';
      if (DV.World.tod) DV.World.tod = null;
      DV.Menus.closeSide(); this.open();
    },

    /* ---------------- the story ---------------- */
    jump(what, arg) {
      const G = DV.Game, st = DV.State.data;
      DV.Menus.hideAll();
      if (DV.Dialogue.isActive()) DV.Dialogue.end(true);
      if (DV.Activity && DV.Activity.active()) DV.Activity.abort();
      G.state = 'playing';
      const resultsIn = () => {
        const a = st.aptitude;
        if (a.status !== 'complete') { a.status = 'complete'; a.result = a.result || st.player.upbringing; a.recordedAs = a.recordedAs || a.result; }
        for (const f of ['checked_in', 'security_cleared', 'results_discussed']) DV.State.setFlag(f);
        if (!DV.Inventory.has('name_badge')) DV.Inventory.add('name_badge', 1, true);
        if (!DV.Quests.started('the_choosing')) DV.Build2.beginGoingHome();
        else if (DV.Quests.state('the_choosing') !== 'active') st.quests.the_choosing.state = 'active';
      };
      st.story = st.story || {};
      switch (what) {
        case 'gate':
          resultsIn();
          if (DV.World.current && DV.World.current.id === 'testing_center' && !G.ctrl()) { this.go(40, 74, 0); G.resume(); }
          else DV.District.enter('testing_center', { spawn: [40, 74, 0], instant: true, time: '12:30', noSave: true });
          break;
        case 'home':
          resultsIn();
          DV.Chapter.start('home', { walked: false });
          break;
        case 'ceremony':
          resultsIn();
          DV.Chapter.start('ceremony', { instant: true });
          break;
        case 'dauntless':
          resultsIn();
          if (DV.Build2.chosen() !== 'dauntless') DV.Build2.setFaction('dauntless');
          DV.Build2.dressFor('dauntless');
          st.story.dauntlessName = st.story.dauntlessName || st.player.name;
          DV.District.enter('dauntless', { day: arg, time: arg === 2 ? '11:20' : '07:30', spawn: [34, 9, 0.2], instant: true, noSave: true });
          break;
        case 'week': {
          resultsIn();
          st.story.week = null;
          DV.Build2.setFaction(arg);
          DV.FirstWeek.begin(arg);
          break;
        }
      }
    },

    /* ---------------- every frame ---------------- */
    update(dt, force) {
      const ov = this.on() && this.flags.overlay;
      let e = document.getElementById('devinfo');
      if (ov && !e) { e = el('div', null, null, DV.UI.root); e.id = 'devinfo'; }
      if (!ov && e) e.remove();
      const hide = this.on() && this.flags.hideHud;
      DV.UI.root.classList.toggle('dev-nohud', hide);
      if (!ov) return;
      this.t = (this.t || 0) - dt;
      if (this.t > 0 && !force) return;
      this.t = 0.25;
      const G = DV.Game, zone = DV.World.current, P = DV.Player, info = G.renderer.info.render;
      const room = zone && zone.roomAt(P.x, P.z);
      const life = zone && zone.streetLife;
      const lines = [
        (zone ? zone.id : '—') + (room ? ' · ' + room.id : '') + '   x ' + P.x.toFixed(1) + '  z ' + P.z.toFixed(1) + '  rot ' + P.rot.toFixed(2),
        'Day ' + DV.Clock.day() + ' ' + DV.Clock.str() + ' ×' + DV.Clock.scale() * this.flags.timeMul + '   state ' + G.state + (G.ctrl() ? ' · ' + DV.Chapter.id + ':' + DV.Chapter.step : ''),
        G.fps + ' fps · ' + info.calls + ' calls · ' + Math.round(info.triangles / 1000) + 'k tris',
      ];
      if (life) { const s = life.stats(); lines.push(s.peds + ' people · ' + s.cars + ' cars · ' + s.lanes + ' lanes'); }
      e.textContent = lines.join('\n');
    },
  };

  DV.Dev = Dev;
})();
