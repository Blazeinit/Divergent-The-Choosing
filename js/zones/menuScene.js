/* ==========================================================================
   DIVERGENT — ZONE: main menu backdrop (a rooftop over the city at dusk)
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
      const city = DV.City.build({
        seed: 4242,
        y: -36,
        campus: [-16, -14, 16, 14],
        gridX: [-546, -470, -394, -318, -242, -166, -90, -22, 22, 90, 166, 242, 318, 394, 470, 546],
        gridZ: [-588, -524, -460, -396, -332, -268, -204, -140, -76, -20, 20, 84, 148],
        radius: 600,
        hub: [60, -400],
        track: { x0: -720, x1: 720, z0: -70, z1: -65.4, y: 7.4, span: 15 },
        trainFirst: 6,
        extras: [{ x: 0, z: 0, w: 24, d: 21, h: 35.9, style: 'brick', tint: [0.8, 0.75, 0.75], parapet: false, seed: 5 }],
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
