/* ==========================================================================
   DIVERGENT — soundscape
   Decides what the player should hear where they stand and hands the levels
   to DV.Audio: the room's reverb, indoor room tone vs. outdoor air (muffled
   through walls, bleeding in through open doors and windows), room accents
   (tube buzz, the simulation core's hum, the boiler, vending compressors,
   clock ticks, washroom drips), the hour (crickets from dusk to first
   light), the city's traffic, and outdoor one-shots (crows and gulls by day,
   the wind getting up, a distant elevated train, flag ropes clinking against
   their poles, horns and dogs out in the streets).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // room id → reverb profile (anything unlisted falls back on its size/materials)
  const ROOM_REVERB = {
    lobby: 'atrium', hall: 'hall', courtyard: 'yard', plaza: 'exterior', street: 'exterior',
    tc_corr: 'corridor', acorr: 'corridor', scorr: 'corridor', wpass: 'corridor', epass: 'corridor',
    restroom: 'tiled', checkpoint: 'concrete', storage: 'concrete', maint: 'concrete', closet: 'concrete',
    // the Dauntless compound
    the_pit: 'atrium', training: 'hall', dining: 'hall', dorm: 'concrete', dorm_wash: 'tiled', net_room: 'concrete',
    pit_tunnel: 'corridor', dorm_corr: 'corridor', tr_corr: 'corridor', quarters: 'corridor', tattoo: 'office', infirmary: 'office', sim_room: 'office',
  };
  const HUM_ROOMS = { tc_corr: 0.45, gallery: 0.6, proctor: 0.5, tr1: 0.7, tr2: 0.7, tr3: 0.8, tr4: 0.7, tr5: 0.7, tr6: 0.8, closet: 0.6 };

  const S = {
    zone: null,
    acc: 0,
    timers: { bird: 5, train: 50, flag: 2, drip: 1.5, tick: 1, cityHorn: 12, dog: 30, wind: 9 },

    reverbFor(room) {
      if (!room) return 'exterior';
      if (ROOM_REVERB[room.id]) return ROOM_REVERB[room.id];
      if (/^tr\d/.test(room.id)) return 'tiled';
      if (room.exterior) return 'exterior';
      if (/carpet/.test(room.floor || '')) return 'office';
      const area = (room.x1 - room.x0) * (room.z1 - room.z0);
      return area > 120 ? 'hall' : 'office';
    },

    // exterior openings for the current zone (built once per zone)
    openings(zone) {
      if (this.zone === zone && this._open) return this._open;
      this.zone = zone;
      const list = [];
      const d = zone.doorMap || {};
      if (d.main_doors) list.push({ x: 40, z: 60, door: d.main_doors, range: 16 });
      if (d.court_door) list.push({ x: 64, z: 48, door: d.court_door, range: 12 });
      for (const w of zone.def.windows || []) {
        if (w.oneWay) continue;
        // exterior windows only: one side of the window must be outside
        const off = w.dir === 'x' ? [[0, 0.6], [0, -0.6]] : [[0.6, 0], [-0.6, 0]];
        const outside = off.some(([ox, oz]) => { const r = zone.roomAt(w.x + ox, w.z + oz); return !r || r.exterior; });
        if (outside) list.push({ x: w.x, z: w.z, window: true, range: 7 + (w.w || 2) });
      }
      // things that make noise
      const P = zone.def.props || [];
      this._clocks = P.filter((p) => p.type === 'clock').map((p) => [p.x, p.z]);
      this._hummers = P.filter((p) => /vending|water_cooler|coffee_machine|kitchenette/.test(p.type)).map((p) => [p.x, p.z]);
      this._flags = P.filter((p) => p.type === 'flagpole').map((p) => [p.x, p.z]);
      this._sinks = P.filter((p) => p.type === 'sinks').map((p) => [p.x, p.z]);
      this._open = list;
      return list;
    },
    nearest(list, x, z) {
      let best = null, bd = 1e9;
      for (const q of list || []) { const d = Math.hypot(q[0] - x, q[1] - z); if (d < bd) { bd = d; best = q; } }
      return best ? { p: best, d: bd } : null;
    },

    // is a sound at (x, z) on the other side of a wall from the listener?
    occluded(x, z) {
      const zone = DV.World.current;
      if (!zone || !zone.roomAt) return false;
      const a = zone.roomAt(DV.Player.x, DV.Player.z), b = zone.roomAt(x, z);
      // through an outside wall (you're in and it's out in the street, or the other way): 'wall'
      // (heavily muffled); between two rooms: true; in the same space: false
      const ain = !!a && !a.exterior, bin = !!b && !b.exterior;
      if (ain !== bin) return 'wall';
      if (!a || !b || a === b) return false;
      if (a.exterior && b.exterior) return false;
      // big open connections (lobby ↔ checkpoint ↔ hall) don't muffle much
      const open = { 'lobby|checkpoint': 1, 'checkpoint|hall': 1, 'hall|wpass': 1, 'hall|epass': 1, 'hall|tc_corr': 1 };
      return !open[a.id + '|' + b.id] && !open[b.id + '|' + a.id];
    },

    update(dt) {
      const A = DV.Audio;
      if (!A.ready) return;
      const zone = DV.World.current;
      if (!zone) return;
      const game = DV.Game;
      if (game.state === 'mainmenu' || game.state === 'creator' || game.state === 'intro') return;
      // simulations and other single-bed zones
      if (zone.def.ambience) {
        A.stopBeds();
        A.setAmbience(zone.def.ambience);
        A.setReverb(zone.def.reverb || 'office');
        A.paOutdoor = false;
        return;
      }
      A.setAmbience(null);
      this.acc += dt;
      for (const k in this.timers) this.timers[k] -= dt;
      if (this.acc < 0.12) return; // ~8 updates a second is plenty for ambience
      const step = this.acc;
      this.acc = 0;

      const p = DV.Player;
      const room = zone.roomAt(p.x, p.z);
      const outside = !room || !!room.exterior;
      const detail = DV.Settings.get('ambienceDetail') !== 'low';
      A.setReverb(this.reverbFor(room));
      A.paOutdoor = outside;

      // how much of the outside reaches in (and the inside spills out)
      let bleed = 0, spill = 0;
      for (const o of this.openings(zone)) {
        const d = Math.hypot(o.x - p.x, o.z - p.z);
        if (d > o.range) continue;
        const near = 1 - d / o.range;
        const open = o.door ? o.door.open : 0;
        if (outside) { if (o.door) spill = Math.max(spill, near * (0.15 + 0.85 * open)); }
        else bleed = Math.max(bleed, near * (o.window ? 0.3 : 0.25 + 0.75 * open));
      }
      const L = {
        indoor: outside ? spill * 0.45 : 1,
        // (indoors the street is a low murmur through the walls, until you're by an open door)
        outdoor: outside ? 1 : 0.05 + bleed * 0.6,
        cutoff: outside ? 16000 : 260 + bleed * bleed * 5000,
        crowd: Math.min(0.09, A.crowdLevel * 0.012) * (outside ? 0.5 : 1),
        buzz: 0, hum: 0, boiler: 0, server: 0, vend: 0,
      };
      if (room && !outside) {
        const li = room.light || {};
        if (li.fixture === 'tube' || li.flicker) L.buzz = li.flicker ? 0.9 : 0.55;
        L.hum = HUM_ROOMS[room.id] || 0;
        if (room.id === 'maint') L.boiler = 1;
        else if (room.id === 'scorr') L.boiler = U.clamp(1 - Math.hypot(66 - p.x, 44 - p.z) / 9, 0, 1) * 0.35;
        if (room.id === 'closet') L.server = 0.8;
        else if (room.id === 'secoffice') L.server = 0.35;
        // the simulation core door hums through the corridor
        L.hum = Math.max(L.hum, U.clamp(1 - Math.hypot(70 - p.x, 18 - p.z) / 10, 0, 1) * (room.id === 'tc_corr' || room.id === 'closet' ? 1 : 0.35));
      }
      // underground: no sky, but a river at the bottom of the chasm you can hear from anywhere in the Pit
      if (zone.def.underground) {
        L.outdoor = 0;
        const ch = zone.def.chasm;
        if (ch) {
          const d = Math.max(0, ch.z - p.z);
          const inPit = room && (room.id === 'the_pit' || room.id === 'net_room');
          L.boiler = U.clamp(1 - d / 34, 0, 1) * (inPit ? 1 : 0.25) * 0.9;
        }
      }
      // the hour, out of doors: crickets from dusk to first light (zones on the clock)
      const m = DV.Clock.minutes();
      const nightK = zone.def.timeOfDay ? U.clamp(Math.min((m - 1200) / 60, (330 - m + (m < 720 ? 0 : 1440)) / 50), 0, 1) : 0;
      if (nightK > 0 && !zone.def.underground) L.night = nightK * (outside ? 0.9 : 0.5);
      // out in the streets: people about make a murmur, louder where it's busy
      const life = zone.streetLife;
      if (life && outside && life.shown !== false) {
        let near = 0;
        for (const q of life.peds) if (Math.abs(q.x - p.x) < 14 && Math.abs(q.z - p.z) < 14) near++;
        L.crowd = Math.max(L.crowd, Math.min(0.07, near * 0.008));
        // traffic: a few streets off all day (quieter at night), and the cars going by you
        let cd = 1e9;
        for (const c of life.cars) { const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < cd) cd = d; }
        L.traffic = (0.32 - 0.2 * nightK) + 0.55 * U.clamp(1 - cd / 36, 0, 1);
      }
      const hum = this.nearest(this._hummers, p.x, p.z);
      if (hum && hum.d < 3.5) L.vend = (1 - hum.d / 3.5) * (outside ? 0.3 : 1);
      if (!detail) { L.buzz *= 0.5; L.vend = 0; }
      A.setBeds(L);

      if (!detail) return;
      // clock ticks
      const clk = this.nearest(this._clocks, p.x, p.z);
      if (clk && clk.d < 4.5 && this.timers.tick <= 0) {
        this.timers.tick = 1;
        A.play('tick', { x: clk.p[0], z: clk.p[1], volume: 1 - clk.d / 4.5, range: 6 });
      }
      // washroom drips
      if (room && room.id === 'restroom' && this.timers.drip <= 0) {
        this.timers.drip = U.rand(1.2, 4.5);
        const s = this._sinks[0] || [p.x, p.z];
        A.play('drip', { x: s[0], z: s[1] + U.rand(-0.8, 0.8), volume: 0.8 });
      }
      // flag ropes on the plaza poles
      const fl = this.nearest(this._flags, p.x, p.z);
      if (fl && fl.d < 14 && this.timers.flag <= 0) {
        this.timers.flag = U.rand(1.5, 4.5);
        const q = U.pick(this._flags);
        A.play('clink', { x: q[0], z: q[1], volume: 0.9, range: 18 });
      }
      if (zone.def.underground) return;
      // the city round you: a horn a few streets off, a dog somewhere
      if (life && !room) {
        if (this.timers.cityHorn <= 0) { this.timers.cityHorn = U.rand(14, 40); A.play('carhorn', { bus: 'outdoor', volume: U.rand(0.18, 0.4), big: Math.random() < 0.3 }); }
        if (this.timers.dog <= 0) { this.timers.dog = U.rand(25, 70); A.play('bark', { bus: 'outdoor', volume: U.rand(0.15, 0.35) }); }
      }
      // the wind gets up now and then (you hear it best out in it)
      if (this.timers.wind <= 0) {
        this.timers.wind = U.rand(14, 38);
        if (outside || bleed > 0.2) A.play('windgust', { bus: 'outdoor', volume: U.rand(0.5, 1), dur: U.rand(3.5, 6.5) });
      }
      // the city beyond the fence (muffled indoors by the outdoor layer's filter): birds by day
      if (this.timers.bird <= 0) {
        this.timers.bird = U.rand(7, 18);
        if (nightK < 0.5) A.play(Math.random() < 0.65 ? 'caw' : 'gull', { bus: 'outdoor', volume: U.rand(0.5, 1) });
      }
      // (a zone with a visible L train plays that one as it passes instead)
      const zn = DV.World.current;
      if (this.timers.train <= 0 && !(zn && zn.city && zn.city.train)) {
        this.timers.train = U.rand(70, 150);
        A.play('train', { bus: 'outdoor', volume: U.rand(0.6, 1) });
        if (Math.random() < 0.45) setTimeout(() => A.play('horn', { bus: 'outdoor', volume: 0.8 }), 2500);
      }
      void step;
    },
  };

  DV.Soundscape = S;
})();
