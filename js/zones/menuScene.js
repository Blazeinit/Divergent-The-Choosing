/* ==========================================================================
   DIVERGENT — ZONE: main menu backdrop (a rooftop over the city at dusk)
   Across the street and down a little, a row of roofs makes a line the
   Dauntless run at dusk: out of a stairhouse, over an air-conditioner,
   across an alley, a kong over a vent, up a wall, and a flip down onto the
   last roof. DV.MenuCourse lays the line out (DV.Freerun) for the menu's
   highlights reel (js/ui/menuReel.js).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const P = [];
  const add = (type, x, z, o) => P.push(Object.assign({ type, x, z }, o || {}));
  for (let x = -9; x <= 9; x += 3) add('railing', x, -8.9, { len: 3, h: 1.1 });
  add('railing', -10, -5, { len: 8, rotDeg: 90, h: 1.1 });
  add('railing', 10, -5, { len: 8, rotDeg: 90, h: 1.1 });
  ['abnegation', 'dauntless', 'erudite', 'candor', 'amity'].forEach((f, i) => add('flagpole', -6 + i * 3, -7.5, { faction: f }));
  add('rubble', -7, 3, { n: 8 });
  add('rubble', 6, 4, { n: 6 });
  add('barrel', 8, 1, { mat: 'rust' });
  add('barrel', 8.6, 1.8, {});
  add('crate', -8, -1, { size: 0.9, stack: true });
  add('electrical_panel', -3, 7.85, { rotDeg: 180 });
  add('pipes', 0, 7.6, { len: 18, y: 0.6, n: 3 });
  add('lamp_post', 4, -6.5, {});
  add('wall_block', 0, 8, { w: 20, h: 3, d: 0.3, mat: 'brick' });

  /* ------------------------------ the line ------------------------------ */
  const CY = -36; // the city's ground, below this roof
  // the roofs, west to east (world y of each top)
  const ROOFS = [
    { id: 'r1', x0: 30, x1: 42.5, y: -1.5, style: 'brick', tint: [0.8, 0.6, 0.52] },
    { id: 'r2', x0: 46, x1: 58, y: -2.7, style: 'loft', tint: [0.72, 0.66, 0.58] },
    { id: 'r3', x0: 58, x1: 68, y: -0.1, style: 'stone', tint: [0.82, 0.8, 0.76], tower: [1.5, -4.2] },
    { id: 'r4', x0: 71.5, x1: 84, y: -4.5, style: 'brick', tint: [0.6, 0.48, 0.44] },
  ];
  const Z0 = -43, Z1 = -31; // their depth
  // what stands on them: b = [x0, z0, x1, z1, y0, y1] (the first three are on the line)
  const ON = [
    { id: 'stairhouse', b: [30.4, -39.4, 32.8, -34.6, -1.5, 1.1], tint: [0.5, 0.48, 0.46], through: true }, // (they come out of it)
    { id: 'aircon', b: [37.4, -39.0, 38.6, -35.4, -1.5, -0.45], tint: [0.62, 0.63, 0.6] },
    { id: 'vent', b: [52.0, -39.2, 53.0, -35.2, -2.7, -1.75], tint: [0.45, 0.46, 0.48] },
    { id: 'door', b: [32.8, -38.9, 32.86, -35.1, -1.5, 0.6], tint: [0.05, 0.05, 0.06], through: true }, // (its open door)
    { id: 'skylight', b: [47.5, -42.2, 50.2, -40.4, -2.7, -2.2], tint: [0.3, 0.36, 0.4] },
    { id: 'planter', b: [60, -33.0, 62.5, -31.6, -0.1, 0.6], tint: [0.36, 0.3, 0.24] },
    { id: 'aircon2', b: [80.6, -42.4, 82.4, -40.2, -4.5, -3.4], tint: [0.6, 0.6, 0.58] },
    { id: 'vent2', b: [40.2, -42.6, 41.2, -41.4, -1.5, -0.1], tint: [0.4, 0.4, 0.42] },
  ];
  const LANES = [-36.0, -37.2, -38.4];

  function cityParts() {
    const extras = [], boxes = [];
    const local = (y) => y - CY;
    for (const r of ROOFS) {
      const e = { x: (r.x0 + r.x1) / 2, z: (Z0 + Z1) / 2, w: r.x1 - r.x0, d: Z1 - Z0, h: local(r.y), style: r.style, tint: r.tint, parapet: false, roof: [0.22, 0.21, 0.2], seed: 40 + extras.length };
      if (r.tower) e.waterTower = r.tower;
      extras.push(e);
      // a low wall along the front and back of each roof (not the ends: that's where they jump)
      for (const z of [Z0 + 0.15, Z1 - 0.15]) boxes.push({ x: e.x, z, w: e.w, d: 0.3, y0: local(r.y), y1: local(r.y) + 0.8, tint: r.tint.map((c) => c * 0.7) });
    }
    for (const o of ON) {
      const [x0, z0, x1, z1, y0, y1] = o.b;
      boxes.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, y0: local(y0), y1: local(y1), tint: o.tint });
    }
    // the block behind, taller, against the sky
    extras.push({ x: 37, z: -58, w: 16, d: 22, h: 46, style: 'stone', tint: [0.78, 0.76, 0.72], seed: 61 });
    extras.push({ x: 55, z: -59, w: 14, d: 20, h: 56, style: 'loft', tint: [0.66, 0.6, 0.56], seed: 62 });
    extras.push({ x: 72, z: -57, w: 16, d: 22, h: 42, style: 'brick', tint: [0.7, 0.56, 0.5], seed: 63, waterTower: [3, 4] });
    return { extras, boxes };
  }

  DV.MenuCourse = {
    ROOFS, ON, LANES, Z0, Z1,
    // runner i's line (each keeps to a lane, so they never run through each other)
    course(i) {
      const z = LANES[i % LANES.length], endX = 81.5 - (i % LANES.length) * 1.4;
      const c = DV.Freerun.course({ x: 31.4, y: -1.5, z, heading: Math.PI / 2 });
      return c.run(36.4, z) // out of the stairhouse
        .vault(-0.45, 3.2) // a speed vault over the air-conditioner
        .run(42.2, z)
        .leap(47.4, -2.7, z, 0.6) // across the alley, a storey down…
        .roll() // …and roll out of it
        .run(51.0, z)
        .kong(-1.75, 3.2) // a kong over the vent
        .land(0.8)
        .run(57.55, z)
        .climb(-0.1, 0.9) // up the wall to the next roof
        .run(67.6, z)
        .flip(73.4, -4.5, z, 1.0) // the big one: two storeys down, with a front flip
        .roll()
        .run(endX, z)
        .pause(6, 'cheer', -1.1); // and a look back at the city
    },
    // what you'd stand on at (x, z): the highest top there (QA: runners keep to these)
    top(x, z) {
      let best = null;
      const pick = (y) => { if (best === null || y > best) best = y; };
      for (const r of ROOFS) if (x >= r.x0 && x <= r.x1 && z >= Z0 && z <= Z1) pick(r.y);
      for (const o of ON) { const b = o.b; if (!o.through && x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]) pick(b[5]); }
      return best;
    },
  };

  DV.Zones.define('menu_bg', {
    name: 'Rooftop',
    bounds: { x0: -12, z0: -12, x1: 12, z1: 10 },
    buildingHeight: 3,
    fog: { color: 0x3a2e2c, near: 30, far: 170 },
    sky: { top: 0x1b2134, horizon: 0xa8603a, ground: 0x2a1e1a, skyline: false },
    exterior: { sunDir: [-0.6, 0.35, -0.7], sunColor: [0.75, 0.42, 0.25], ambient: [0.25, 0.24, 0.3] },
    charLight: { ambient: 0.35, hemi: 0.4, dir: 0.7, dirColor: 0xffa070 },
    rooms: [{ id: 'roof', name: 'Rooftop', x0: -10, z0: -9, x1: 10, z1: 8, exterior: true, floor: 'concrete_dark', edge: 'none', light: { ambient: [0.3, 0.27, 0.3] } }],
    doors: [],
    props: P,
    spots: {},
    // the city spread out below the roof at dusk: lit windows, the Hub against the sunset
    build(ctx) {
      const parts = cityParts();
      const city = DV.City.build({
        seed: 4242,
        y: CY,
        campus: [-16, -14, 16, 14],
        gridX: [-546, -470, -394, -318, -242, -166, -90, -22, 22, 90, 166, 242, 318, 394, 470, 546],
        gridZ: [-588, -524, -460, -396, -332, -268, -204, -140, -76, -20, 20, 84, 148],
        radius: 600,
        hub: [60, -400],
        track: { x0: -720, x1: 720, z0: -70, z1: -65.4, y: 7.4, span: 15 },
        trainFirst: 6,
        // the runners' block is the zone's own
        keepClear: [[26, -72, 86, -24]],
        extras: [{ x: 0, z: 0, w: 24, d: 21, h: 35.9, style: 'brick', tint: [0.8, 0.75, 0.75], parapet: false, seed: 5 }].concat(parts.extras),
        boxes: parts.boxes,
        haze: 0x5a4044,
        hazeK: 0.0036,
        ambient: 0x7a6670,
        lit: 1,
        shadowAmt: 0.18,
        cloudLight: 0xc48a68,
        cloudDark: 0x3e3040,
        puffTint: 0xa07468,
        cover: 0.0,
      });
      ctx.add(city.group);
      ctx.zone.city = city;
      ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
      // birds heading home over the city at dusk
      DV.Wildlife.attach(ctx.zone, { seed: 8, circlers: { n: 9, centre: [0, -150], r: 90, y: 22 } });
    },
    onExit(zone) {
      if (zone.city && zone.city.train && zone.city.train.sound) { zone.city.train.sound.stop(); zone.city.train.sound = null; }
    },
  });
})();
