/* ==========================================================================
   DIVERGENT — ZONE: Aptitude Testing Center, Sector 4 (Testing District)
   Pure data: rooms, doors, windows, props, named spots, pickups, triggers.
   Coordinates in meters. +X east, +Z south. Grid = 0.5m.

   Layout (north at top):
        [Proctor][   Observation Gallery (one-way glass)   ]
        [Proctor][TR1][TR2][TR3][TR4][TR5][TR6][Closet]
   [----------------- Testing Wing Corridor ------------------]
   [Copy ][             Waiting Hall              ][Infirm][S ][Break Room]
   [Wpass==============================================Epass][t ]
   [Admin Offices]  .                              [Storage][a ][Lockers  ]
   [Dir/Conf/Recs]  [Wash][Checkpoint][SecOffice]           [f ][Maint    ]
   [Admin Corridor] [ Entrance Lobby + Reception ]          [Courtyard     ]
                    [         Front Plaza          ]
                    [====== street (gate) =========]
   Candidate flow: lobby → reception (name badge) → security arch → hall.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  const L = {
    office: { ambient: [0.34, 0.34, 0.36], color: [1, 0.96, 0.88], intensity: 0.85, spacing: 4, range: 6.5 },
    corridor: { ambient: [0.3, 0.31, 0.33], color: [0.95, 0.97, 1], intensity: 0.85, spacing: 5, range: 6, fixture: 'tube' },
    test: { ambient: [0.46, 0.49, 0.52], color: [0.9, 0.97, 1], intensity: 0.85, spacing: 3.5, range: 5.5 },
    dim: { ambient: [0.13, 0.14, 0.17], color: [0.6, 0.72, 0.95], intensity: 0.55, spacing: 7, range: 4.5, fixture: 'bulb' },
    warm: { ambient: [0.33, 0.29, 0.25], color: [1, 0.86, 0.66], intensity: 0.85, spacing: 4, range: 6.5 },
    grim: { ambient: [0.18, 0.17, 0.16], color: [1, 0.8, 0.55], intensity: 0.95, spacing: 4.5, range: 6, fixture: 'bulb' },
  };

  // The Testing Center seen from the city: everything inside its grounds that isn't a room (or a
  // neighbour's building) becomes solid concrete up to the grounds' edge, so the street sees a
  // building's face instead of the backs of the rooms' walls. Bays stay open outside the windows
  // that look out. Returns boxes for the city's extras.
  function outerShell(zone, rect, others) {
    const G = 0.5, pad = 0.16, H = 9.4; // (the rooms' outer walls stand 9 m tall)
    const [rx0, rz0, rx1, rz1] = rect;
    const nx = Math.round((rx1 - rx0) / G), nz = Math.round((rz1 - rz0) / G);
    const free = new Uint8Array(nx * nz);
    const rooms = zone.def.rooms;
    const views = (zone.def.windows || []).filter((w) => !w.oneWay).map((w) => {
      // a window with nothing on one side looks out: keep the view clear to the edge
      const out = w.dir === 'z' ? [[-0.6, 0], [0.6, 0]] : [[0, -0.6], [0, 0.6]];
      const side = out.find(([ox, oz]) => zone.roomIndexAt(w.x + ox, w.z + oz) < 0);
      if (!side) return null;
      const hw = (w.w || 2) / 2 + 0.4;
      return w.dir === 'z' ? [side[0] < 0 ? rx0 - 1 : w.x, w.z - hw, side[0] < 0 ? w.x : rx1 + 1, w.z + hw] : [w.x - hw, side[1] < 0 ? rz0 - 1 : w.z, w.x + hw, side[1] < 0 ? w.z : rz1 + 1];
    }).filter(Boolean);
    const inside = (x, z, q, p) => x > q[0] - p && x < q[2] + p && z > q[1] - p && z < q[3] + p;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = rx0 + (i + 0.5) * G, z = rz0 + (j + 0.5) * G;
      if (rooms.some((r) => inside(x, z, [r.x0, r.z0, r.x1, r.z1], pad))) continue;
      if (others.some((q) => inside(x, z, q, 0))) continue;
      if (views.some((q) => inside(x, z, q, 0))) continue;
      free[j * nx + i] = 1;
    }
    // greedy rectangles: runs along x, grown down z while the run below matches
    const out = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      if (!free[j * nx + i]) continue;
      let i1 = i;
      while (i1 + 1 < nx && free[j * nx + i1 + 1]) i1++;
      let j1 = j;
      const rowFull = (jj) => { for (let k = i; k <= i1; k++) if (!free[jj * nx + k]) return false; return true; };
      while (j1 + 1 < nz && rowFull(j1 + 1)) j1++;
      for (let jj = j; jj <= j1; jj++) for (let k = i; k <= i1; k++) free[jj * nx + k] = 0;
      const x0 = rx0 + i * G, x1 = rx0 + (i1 + 1) * G, z0 = rz0 + j * G, z1 = rz0 + (j1 + 1) * G;
      // (no top: the roof over the whole building is the zone's, see buildRoof)
      out.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, h: H, style: 'institution', tint: [0.96, 0.96, 0.95], seed: 30 + out.length, parapet: false, noTop: true });
    }
    return out;
  }

  // test rooms are 7m wide starting at x=24
  const TR = [1, 2, 3, 4, 5, 6].map((n) => ({ n, x0: 24 + (n - 1) * 7, cx: 24 + (n - 1) * 7 + 3.5 }));

  const rooms = [
    { id: 'tc_corr', name: 'Testing Wing Corridor', x0: 10, z0: 16, x1: 70, z1: 20, h: 3.2, floor: 'tile_floor', wall: 'paint_white', light: Object.assign({}, L.corridor, { flicker: [5] }) },
    { id: 'proctor', name: 'Proctor Station', x0: 14, z0: 4, x1: 24, z1: 16, h: 3.0, floor: 'carpet_grey', wall: 'paint_blue', light: L.office, staffOnly: true },
    { id: 'gallery', name: 'Observation Gallery', x0: 24, z0: 4, x1: 66, z1: 8, h: 3.0, floor: 'carpet_dark', wall: 'paint_blue', light: L.dim, staffOnly: true },
    ...TR.map((t) => ({
      id: 'tr' + t.n, name: 'Testing Room ' + t.n, x0: t.x0, z0: 8, x1: t.x0 + 7, z1: 16, h: 3.0, floor: 'tile_white', wall: 'mirror', ceiling: 'ceiling_tile',
      light: t.n === 3 || t.n === 6 ? L.dim : L.test,
    })),
    { id: 'closet', name: 'Custodial Closet', x0: 66, z0: 10, x1: 70, z1: 16, h: 3.0, floor: 'concrete', wall: 'concrete', ceiling: 'ceiling_concrete', light: Object.assign({}, L.grim, { spacing: 3 }), staffOnly: true },
    { id: 'hall', name: 'Waiting Hall', x0: 26, z0: 20, x1: 54, z1: 38, h: 5.0, floor: 'terrazzo', wall: 'paint_wall', light: { ambient: [0.36, 0.36, 0.37], color: [1, 0.96, 0.88], intensity: 0.85, spacing: 4.6, range: 7.5, flicker: [7] } },
    { id: 'restroom', name: 'Washroom', x0: 26, z0: 38, x1: 34, z1: 44, h: 3.0, floor: 'tile_small', wall: 'tile_white', light: Object.assign({}, L.corridor, { spacing: 3.5, flicker: [1] }) },
    { id: 'checkpoint', name: 'Security Checkpoint', x0: 34, z0: 38, x1: 46, z1: 44, h: 3.5, floor: 'concrete', wall: 'concrete_panel', ceiling: 'ceiling_concrete', light: Object.assign({}, L.corridor, { spacing: 4 }) },
    { id: 'secoffice', name: 'Security Office', x0: 46, z0: 38, x1: 54, z1: 44, h: 3.0, floor: 'tile_floor', wall: 'paint_white', light: Object.assign({}, L.office, { intensity: 0.6 }), staffOnly: true },
    {
      id: 'lobby', name: 'Entrance Lobby', x0: 26, z0: 44, x1: 54, z1: 60, h: 7.0, floor: 'marble_check', wall: 'concrete_panel', ceiling: 'ceiling_concrete',
      light: { ambient: [0.42, 0.42, 0.44], color: [1, 0.96, 0.9], intensity: 0.95, spacing: 5.5, range: 9.5, extra: [
        { x: 31.5, z: 58.8, y: 3.2, intensity: 0.75, range: 8, color: [0.75, 0.82, 0.95] },
        { x: 48.5, z: 58.8, y: 3.2, intensity: 0.75, range: 8, color: [0.75, 0.82, 0.95] },
        { x: 40, z: 58.8, y: 2.5, intensity: 0.6, range: 7, color: [0.75, 0.82, 0.95] },
      ] },
    },
    { id: 'plaza', name: 'Front Plaza', x0: 22, z0: 60, x1: 58, z1: 76, exterior: true, floor: 'pavement', edge: 'fence', edgeH: 3.2, barbed: true },
    { id: 'street', name: 'Lake Street', x0: 14, z0: 76, x1: 66, z1: 84, exterior: true, floor: 'asphalt', noFloor: true, edge: 'none', noMap: true },
    { id: 'wpass', name: 'West Passage', x0: 14, z0: 28, x1: 26, z1: 32, h: 3.2, floor: 'carpet_blue', wall: 'paint_blue', light: L.office, connect: ['acorr'] },
    { id: 'acorr', name: 'Administration Corridor', x0: 10, z0: 20, x1: 14, z1: 48, h: 3.2, floor: 'carpet_blue', wall: 'paint_blue', light: Object.assign({}, L.office, { spacing: 5 }), connect: ['tc_corr'] },
    { id: 'director', name: 'Director\'s Office', x0: 0, z0: 20, x1: 10, z1: 29, h: 3.2, floor: 'carpet_red', wall: 'wood_panel', light: L.warm },
    { id: 'conf', name: 'Conference Room', x0: 0, z0: 29, x1: 10, z1: 38, h: 3.2, floor: 'carpet_grey', wall: 'paint_blue', light: L.office },
    { id: 'records', name: 'Records Archive', x0: 0, z0: 38, x1: 10, z1: 48, h: 3.0, floor: 'tile_floor', wall: 'paint_white', light: Object.assign({}, L.corridor, { ambient: [0.2, 0.2, 0.22], intensity: 0.7, spacing: 3.5, flicker: [2] }), staffOnly: true },
    { id: 'copyroom', name: 'Copy Room', x0: 14, z0: 20, x1: 26, z1: 28, h: 3.0, floor: 'tile_floor', wall: 'paint_white', light: L.office },
    { id: 'offices', name: 'Administration Office', x0: 14, z0: 32, x1: 26, z1: 44, h: 3.2, floor: 'carpet_grey', wall: 'paint_blue', light: L.office },
    { id: 'epass', name: 'East Passage', x0: 54, z0: 28, x1: 62, z1: 32, h: 3.2, floor: 'tile_floor', wall: 'paint_white', light: L.corridor, connect: ['scorr'] },
    { id: 'infirmary', name: 'Infirmary', x0: 54, z0: 20, x1: 62, z1: 28, h: 3.0, floor: 'tile_white', wall: 'paint_white', light: Object.assign({}, L.test, { spacing: 4 }) },
    { id: 'storage', name: 'Storage Room', x0: 54, z0: 32, x1: 62, z1: 38, h: 3.0, floor: 'concrete', wall: 'concrete', ceiling: 'ceiling_concrete', light: L.grim, staffOnly: true },
    { id: 'scorr', name: 'Staff Corridor', x0: 62, z0: 20, x1: 66, z1: 48, h: 3.2, floor: 'tile_floor', wall: 'paint_white', light: L.corridor, connect: ['tc_corr'] },
    { id: 'breakroom', name: 'Staff Break Room', x0: 66, z0: 22, x1: 78, z1: 32, h: 3.0, floor: 'tile_floor', wall: 'paint_warm', light: L.warm, staffOnly: true },
    { id: 'lockers', name: 'Staff Lockers', x0: 66, z0: 32, x1: 78, z1: 40, h: 3.0, floor: 'tile_floor', wall: 'paint_white', light: L.corridor, staffOnly: true },
    { id: 'maint', name: 'Maintenance', x0: 66, z0: 40, x1: 78, z1: 48, h: 3.5, floor: 'metal_plate', wall: 'concrete_dark', ceiling: 'ceiling_concrete', light: L.grim, staffOnly: true },
    { id: 'courtyard', name: 'Courtyard', x0: 58, z0: 48, x1: 80, z1: 62, exterior: true, floor: 'pavement', edge: 'wall', edgeH: 4.2, edgeMat: 'brick', light: { ambient: [0.5, 0.52, 0.55] } },
  ];

  const doors = [
    // testing corridor north side
    { id: 'stair', x: 12, z: 16, dir: 'x', w: 1.5, type: 'sealed', label: 'STAIRWELL — CLOSED', lockMsg: 'A chain is looped through the handles. A sign: UPPER LEVELS CLOSED FOR TESTING DAY.' },
    { id: 'proctor_door', x: 19, z: 16, dir: 'x', w: 1.5, type: 'slide', lock: 'proctor', label: 'PROCTOR STATION', lockMsg: 'The keycard reader blinks red. PROCTOR ACCESS ONLY.' },
    ...TR.map((t) => {
      const out = t.n === 3 || t.n === 6;
      return {
        id: 'tr' + t.n + '_door', x: t.cx, z: 16, dir: 'x', w: 1.4,
        type: out ? 'sealed' : 'slide',
        lock: out ? null : t.n === 4 ? 'tr4' : 'testing',
        label: out ? 'ROOM ' + t.n + ' — OUT OF SERVICE' : 'TESTING ROOM ' + t.n,
        lockMsg: out ? 'OUT OF SERVICE. The door doesn\'t budge.' : t.n === 4 ? 'TESTING ROOM 4 — IN PREPARATION. Wait to be called.' : 'TEST IN PROGRESS. Do not enter.',
      };
    }),
    { id: 'closet_door', x: 68, z: 16, dir: 'x', w: 1.2, type: 'slide', lock: 'custodian', label: 'CUSTODIAL', lockMsg: 'Locked. A scrawled note: "Ask Gus."' },
    { id: 'core', x: 70, z: 18, dir: 'z', w: 1.5, type: 'sealed', label: 'SIMULATION CORE', lockMsg: 'SIMULATION CORE — ERUDITE AUTHORIZATION REQUIRED. A deep hum comes through the metal.' },
    // corridor south side
    { id: 'hall_n', x: 40, z: 20, dir: 'x', w: 3, type: 'double' },
    { id: 'inf_n', x: 58, z: 20, dir: 'x', w: 1.5, type: 'slide', label: 'INFIRMARY' },
    { id: 'gallery_door', x: 24, z: 6, dir: 'z', w: 1.5, type: 'slide', lock: 'proctor', label: 'OBSERVATION', lockMsg: 'PROCTOR ACCESS ONLY.' },
    // waiting hall
    { id: 'hall_w', x: 26, z: 30, dir: 'z', w: 3, type: 'opening', frame: true, h: 2.8, label: 'ADMINISTRATION' },
    { id: 'hall_e', x: 54, z: 30, dir: 'z', w: 3, type: 'opening', frame: true, h: 2.8, label: 'EAST WING — INFIRMARY — COURTYARD' },
    { id: 'hall_s', x: 40, z: 38, dir: 'x', w: 4, type: 'opening', frame: true, h: 3.0, label: 'WAITING HALL' },
    { id: 'rest_door', x: 30, z: 38, dir: 'x', w: 1.4, type: 'slide', label: 'WASHROOM' },
    // checkpoint & lobby
    { id: 'cp_s', x: 40, z: 44, dir: 'x', w: 6, type: 'opening', h: 3.0 },
    { id: 'sec_door', x: 46, z: 39.5, dir: 'z', w: 1.2, type: 'slide', lock: 'security', label: 'SECURITY', lockMsg: 'SECURITY PERSONNEL ONLY.' },
    { id: 'main_doors', x: 40, z: 60, dir: 'x', w: 4, type: 'glass', h: 2.8, label: 'APTITUDE TESTING CENTER' },
    { id: 'lobby_w', x: 26, z: 47, dir: 'z', w: 1.5, type: 'sealed', label: 'STAFF ENTRANCE', lockMsg: 'STAFF ENTRANCE — USE MAIN CHECKPOINT.' },
    { id: 'lobby_e', x: 54, z: 47, dir: 'z', w: 1.5, type: 'sealed', label: 'MAINTENANCE ACCESS', lockMsg: 'Locked from the other side.' },
    { id: 'gate', x: 40, z: 76, dir: 'x', w: 4, type: 'gate', lock: 'npc', lockMsg: 'The gate is closed. A Dauntless guard would have to open it — and nobody leaves before testing is finished.' },
    // administration
    { id: 'copy_door', x: 18.5, z: 28, dir: 'x', w: 1.5, type: 'slide', label: 'COPY ROOM' },
    { id: 'off_n', x: 21, z: 32, dir: 'x', w: 2, type: 'opening', frame: true, h: 2.5, label: 'ADMINISTRATION OFFICE' },
    { id: 'off_w', x: 14, z: 38, dir: 'z', w: 1.5, type: 'slide' },
    { id: 'dir_door', x: 10, z: 24.5, dir: 'z', w: 1.5, type: 'slide', label: 'DIRECTOR — DR. A. PIERCE' },
    { id: 'conf_door', x: 10, z: 33.5, dir: 'z', w: 1.5, type: 'slide', label: 'CONFERENCE' },
    { id: 'rec_door', x: 10, z: 43, dir: 'z', w: 1.5, type: 'slide', lock: 'records', label: 'RECORDS ARCHIVE', lockMsg: 'Locked. RECORDS — AUTHORIZED STAFF. A keyhole, not a card reader.' },
    { id: 'exit_s', x: 12, z: 48, dir: 'x', w: 1.5, type: 'sealed', label: 'EMERGENCY EXIT', lockMsg: 'EMERGENCY EXIT — ALARM WILL SOUND. Better not.' },
    // east wing
    { id: 'inf_s', x: 58, z: 28, dir: 'x', w: 1.5, type: 'slide' },
    { id: 'storage_door', x: 58, z: 32, dir: 'x', w: 1.5, type: 'slide', lock: 'storage', label: 'STORAGE', lockMsg: 'Locked. An old brass lock. The custodian would have the key.' },
    { id: 'break_door', x: 66, z: 27, dir: 'z', w: 1.5, type: 'slide', label: 'STAFF ROOM' },
    { id: 'locker_door', x: 66, z: 36, dir: 'z', w: 1.5, type: 'slide', label: 'LOCKERS — STAFF ONLY' },
    { id: 'maint_door', x: 66, z: 44, dir: 'z', w: 1.5, type: 'slide', lock: 'custodian', label: 'MAINTENANCE', lockMsg: 'Locked. Through the gap you hear a boiler breathing.' },
    { id: 'court_door', x: 64, z: 48, dir: 'x', w: 2.4, type: 'glass', label: 'COURTYARD' },
  ];

  const windows = [
    ...TR.map((t) => ({ id: 'gal_win' + t.n, x: t.cx, z: 8, dir: 'x', w: 4, sill: 1.0, top: 2.4, oneWay: true })),
    { id: 'sec_win', x: 46, z: 42.5, dir: 'z', w: 1.6, sill: 1.0, top: 2.1 },
    { id: 'lobby_win_w', x: 31.5, z: 60, dir: 'x', w: 6, sill: 0.6, top: 5.0 },
    { id: 'lobby_win_e', x: 48.5, z: 60, dir: 'x', w: 6, sill: 0.6, top: 5.0 },
    { id: 'dir_win', x: 0, z: 24.5, dir: 'z', w: 4, sill: 0.9, top: 2.4 },
    { id: 'break_win', x: 78, z: 27, dir: 'z', w: 4, sill: 0.9, top: 2.3 },
    { id: 'conf_win', x: 0, z: 33.5, dir: 'z', w: 3, sill: 0.9, top: 2.3 },
  ];

  const P = [];
  const add = (type, x, z, o) => P.push(Object.assign({ type, x, z }, o || {}));

  /* ---------------- testing corridor ---------------- */
  add('bench', 16, 19.55, { id: 'cb1', len: 2.4, rotDeg: 180 });
  add('bench', 30.5, 19.55, { id: 'cb2', len: 3, rotDeg: 180 });
  add('bench', 50, 19.55, { id: 'cb3', len: 3, rotDeg: 180 });
  add('duct', 40, 17.0, { len: 58, y: 2.75 });
  add('pipes', 40, 19.55, { len: 58, y: 3.0, n: 2 });
  add('exit_sign', 10.12, 18, { rotDeg: 90, y: 2.6 });
  add('clock', 24, 19.88, { rotDeg: 180, y: 2.5 });
  add('poster', 21, 19.88, { rotDeg: 180, kind: 'quiet' });
  add('poster', 45, 19.88, { rotDeg: 180, kind: 'test' });
  add('water_cooler', 68.9, 19.5, { rotDeg: 180, id: 'corr_water' });
  add('trash_bin', 23, 19.55);
  add('sign', 40, 18, { text: 'TESTING WING — SILENCE PLEASE', y: 2.55, w: 2.4, h: 0.32, hanging: 0.6, bg: '#22303a' });
  add('vent', 10.12, 17, { rotDeg: 90, y: 2.5 });

  /* ---------------- proctor station ---------------- */
  add('desk', 16.5, 9, { id: 'proc_desk1', rotDeg: 90, screen: 'crt_blue' });
  add('desk', 16.5, 12.5, { id: 'proc_desk2', rotDeg: 90 });
  add('console', 19.5, 4.5, { id: 'proc_console', rotDeg: 180, w: 2.2 });
  add('filing_cabinet', 22.6, 15.6, { n: 2, rotDeg: 180 });
  add('whiteboard', 14.12, 10.5, { rotDeg: 90, y: 1.55, w: 2.4 });
  add('table', 22.8, 12, { w: 1.2, d: 0.6, chairs: 0 });
  add('coffee_machine', 22.8, 12, { elev: 0.74, id: 'proc_coffee' });
  add('noticeboard', 23.88, 11, { rotDeg: -90, title: 'Proctor Notes', text: 'TODAY: Rooms 1, 2, 4, 5 active. Room 3 offline (serum lot 33 recalled). Room 6 reserved.\n\nREMINDER from Dr. Pierce: ALL irregular readings are to be escalated to me in person. No exceptions. Do not discuss irregular readings with technicians from other factions.\n\n— I.C.' });

  /* ---------------- observation gallery ---------------- */
  for (const t of TR) {
    if (t.n === 3 || t.n === 6) continue;
    add('console', t.cx, 5.0, { id: 'gal_c' + t.n, w: 1.8 });
  }
  add('chair', 37.5, 5.5, { style: 'office', rotDeg: 0 });
  add('chair', 62.5, 5.2, { style: 'office', rotDeg: 30 });
  add('sign', 30, 4.12, { text: 'OBSERVATION — ABSOLUTE SILENCE', y: 2.35, w: 2.2, h: 0.32, bg: '#1a2230' });
  add('filing_cabinet', 65.4, 5, { rotDeg: -90 });

  /* ---------------- testing rooms ---------------- */
  for (const t of TR) {
    const out = t.n === 3 || t.n === 6;
    add('test_chair', t.cx, 11.6, { id: 'tr' + t.n + '_chair', rotDeg: 180 });
    if (!out) {
      add('console', t.x0 + 5.8, 12.6, { id: 'tr' + t.n + '_tech', rotDeg: 90, w: 1.5 });
      add('serum_tray', t.x0 + 5.6, 10.0, {});
    } else {
      add('boxes', t.x0 + 1.2, 14.8, { n: 3 });
      add('crate', t.x0 + 5.5, 14.6, { size: 0.9, stack: true });
      add('sign', t.cx, 8.12, { text: 'OUT OF SERVICE', y: 2.2, w: 1.6, h: 0.3, bg: '#5a1a14' });
    }
    add('ceiling_vent', t.x0 + 1.5, 9.5, { y: 3.0 });
  }

  /* ---------------- custodial closet ---------------- */
  add('shelf', 66.45, 13, { rotDeg: 90, len: 2.4, d: 0.4, h: 2.0 });
  add('mop_bucket', 69.2, 14.9);
  add('boxes', 69.2, 11.0, { n: 2 });
  add('barrel', 69.3, 12.3, { mat: 'metal_painted' });

  /* ---------------- waiting hall ---------------- */
  const rowsW = [23.6, 26.3, 29.0, 31.7];
  rowsW.forEach((z, r) => {
    add('bench', 29.8, z, { id: 'hb_w' + r + 'a', len: 3.2, rotDeg: 180 });
    add('bench', 34.4, z, { id: 'hb_w' + r + 'b', len: 3.2, rotDeg: 180 });
  });
  [23.6, 26.3, 29.0].forEach((z, r) => {
    add('bench', 45.6, z, { id: 'hb_e' + r + 'a', len: 3.2, rotDeg: 180 });
    add('bench', 50.2, z, { id: 'hb_e' + r + 'b', len: 3.2, rotDeg: 180 });
  });
  add('column', 37.0, 34.5, { size: 0.7, h: 5, mat: 'concrete_panel' });
  add('column', 43.0, 34.5, { size: 0.7, h: 5, mat: 'concrete_panel' });
  add('bench', 50.2, 31.7, { id: 'hb_e3b', len: 3.2, rotDeg: 180 });
  add('plant', 47.3, 33.6, { size: 0.9 });
  add('status_board', 40, 20.15, { y: 3.7, w: 4.4, h: 1.5 });
  add('sign', 40, 20.12, { text: 'TESTING WING', arrow: 'up', y: 2.62, w: 2.0, h: 0.3, bg: '#22303a' });
  add('clock', 33, 20.12, { y: 3.6 });
  add('clock', 47, 20.12, { y: 3.6 });
  add('vending', 26.55, 22.6, { rotDeg: 90, id: 'vend1' });
  add('vending', 26.55, 34.6, { rotDeg: 90, id: 'vend2' });
  add('water_cooler', 53.6, 22.5, { rotDeg: -90, id: 'hall_water' });
  add('water_cooler', 36.0, 37.55, { rotDeg: 180, id: 'hall_water2' });
  add('plant', 27.2, 21.2, { size: 1.2 });
  add('plant', 52.8, 21.2, { size: 1.2 });
  add('plant', 27.3, 37.0, { size: 1.1 });
  add('plant', 52.8, 37.0, { size: 1.1 });
  add('banner', 26.15, 25.0, { faction: 'abnegation', rotDeg: 90, y: 4.7, h: 2.6 });
  add('banner', 26.15, 36.0, { faction: 'dauntless', rotDeg: 90, y: 4.7, h: 2.6 });
  add('banner', 53.85, 25.0, { faction: 'erudite', rotDeg: -90, y: 4.7, h: 2.6 });
  add('banner', 53.85, 35.5, { faction: 'candor', rotDeg: -90, y: 4.7, h: 2.6 });
  add('banner', 30.0, 20.15, { faction: 'amity', rotDeg: 0, y: 4.7, h: 2.6 });
  add('banner', 50.0, 20.15, { faction: 'factionless', rotDeg: 0, y: 4.7, h: 2.6 });
  add('noticeboard', 26.12, 27.0, { rotDeg: 90, id: 'hall_notice', title: 'Candidate Notices', text: 'APTITUDE TESTING — CANDIDATE RULES\n\n1. Check in at Reception (lobby, east desk) BEFORE security. Wear your name badge at all times.\n2. Remain in the Waiting Hall until your name or group is called.\n3. Do not enter testing rooms unaccompanied.\n4. Do NOT discuss results with other candidates.\n5. Candidates who have completed testing may use the Courtyard (East Wing).\n\nLOST SOMETHING? Ask the custodial staff. Items are kept in Storage.\n\nA handwritten addition, half torn off: "...if anyone finds a little wooden bird please tell Lucy B."' });
  add('poster', 33, 37.88, { rotDeg: 180, kind: 'factions' });
  add('poster', 44.6, 37.88, { rotDeg: 180, kind: 'test' });
  add('trash_bin', 37.3, 21.0);
  add('trash_bin', 42.7, 21.0);
  add('trash_bin', 42.6, 37.3);
  add('vent', 26.12, 32.8, { rotDeg: 90, y: 4.2 });
  add('vent', 53.88, 32.8, { rotDeg: -90, y: 4.2 });

  /* ---------------- washroom ---------------- */
  add('stalls', 31.0, 42.4, { n: 3, rotDeg: 180 });
  add('sinks', 26.42, 40.4, { n: 2, rotDeg: 90 });
  add('trash_bin', 27.0, 42.8);
  add('vent', 33.88, 39.5, { rotDeg: -90, y: 2.5 });

  /* ---------------- security checkpoint ---------------- */
  add('scanner_arch', 40, 41, {});
  add('railing', 36.7, 41, { len: 5.0 });
  add('railing', 43.3, 41, { len: 5.0 });
  add('desk', 44.4, 42.8, { id: 'cp_desk', rotDeg: -90, screen: 'crt_cctv', chair: false });
  add('sign', 40, 42.5, { text: 'SECURITY — HAVE YOUR NAME BADGE READY', y: 3.05, w: 3.4, h: 0.36, tw: 384, hanging: 0.3, bg: '#3a1a14' });
  add('stripe', 40, 41.6, { w: 1.1, d: 0.35, mat: 'tactile' });
  add('stripe', 40, 40.4, { w: 1.1, d: 0.35, mat: 'tactile' });
  add('vent', 34.12, 39.2, { rotDeg: 90, y: 2.9 });

  /* ---------------- security office ---------------- */
  add('monitor_wall', 50, 38.4, { n: 3 });
  add('desk', 50, 39.6, { id: 'sec_desk', rotDeg: 0, screen: 'crt_cctv' });
  add('lockers', 51.5, 43.65, { len: 2.4, rotDeg: 180 });
  add('filing_cabinet', 53.5, 40.5, { rotDeg: -90 });

  /* ---------------- lobby ---------------- */
  for (const [x, z] of [[31.5, 48.5], [48.5, 48.5], [31.5, 55.5], [48.5, 55.5]]) add('column', x, z, { size: 0.9, h: 7 });
  add('floor_emblem', 40, 52, { size: 5 });
  ['abnegation', 'dauntless', 'erudite', 'candor', 'amity'].forEach((f, i) => add('banner', 32 + i * 4, 56.5, { faction: f, y: 6.85, h: 3.0 }));
  add('sign', 40, 44.13, { text: 'APTITUDE TESTING CENTER — SECTOR 4', y: 4.2, w: 6.5, h: 0.9, bg: '#2a2824', color: '#e0d6b8', size: 26 });
  add('emblem', 40, 44.14, { faction: 'seal', y: 5.9, size: 1.7, color: '#d8c8a0' });
  add('kiosk', 35, 50.6, { id: 'lobby_kiosk' });
  add('bench', 27.0, 52, { id: 'lb_w', len: 3, rotDeg: 90 });
  add('bench', 53.0, 57.0, { id: 'lb_e', len: 3, rotDeg: -90 });
  // reception: candidates check in here and get their name badge BEFORE security
  add('counter', 50.8, 52.0, { len: 5, sign: 'RECEPTION', computers: 2, rotDeg: -90 });
  add('sign', 50.8, 52.0, { text: 'RECEPTION — CHECK IN FIRST', rotDeg: -90, y: 3.6, w: 3.2, h: 0.42, hanging: 3.0, bg: '#2a3236', stripe: '#b08a3a' });
  add('stanchions', 47.8, 50.2, { len: 3.2 });
  add('stanchions', 47.8, 51.8, { len: 3.2 });
  add('filing_cabinet', 53.6, 49.6, { rotDeg: -90 });
  add('poster', 53.88, 53.6, { rotDeg: -90, kind: 'test' });
  add('stanchions', 38.2, 46.3, { len: 3.2, rotDeg: 90 });
  add('stanchions', 41.8, 46.3, { len: 3.2, rotDeg: 90 });
  add('plant', 27.6, 58.8, { size: 1.3 });
  add('plant', 52.9, 59.2, { size: 1.0 });
  add('plant', 36.3, 59.0, { size: 1.0 });
  add('plant', 43.7, 59.0, { size: 1.0 });
  add('clock', 30, 44.12, { y: 3.4 });
  add('poster', 34.5, 44.12, { kind: 'choose' });
  add('poster', 45.5, 44.12, { kind: 'factions' });
  add('exit_sign', 40, 59.88, { rotDeg: 180, y: 3.1 });
  add('sign', 40, 49.2, { text: 'SECURITY — BADGES ONLY', arrow: 'up', y: 3.4, w: 2.6, h: 0.42, hanging: 3.2, bg: '#22303a' });
  add('sign', 44.6, 55.6, { text: 'CHECK-IN FIRST', arrow: 'right', y: 3.0, w: 2.2, h: 0.42, hanging: 3.6, bg: '#2a3236', stripe: '#b08a3a' });
  add('trash_bin', 36.3, 50.0);
  add('trash_bin', 43.7, 50.0);
  add('rug', 40, 58.6, { w: 4.4, d: 1.6, mat: 'carpet_dark' });

  /* ---------------- plaza & street ---------------- */
  add('monolith', 30, 68.5, { text: 'APTITUDE TESTING CENTER\nSECTOR 4 — TESTING DISTRICT' });
  [['abnegation', 25], ['dauntless', 27.5], ['erudite', 30], ['candor', 50], ['amity', 52.5]].forEach(([f, x]) => add('flagpole', x, 62.6, { faction: f }));
  add('lamp_post', 23.4, 64, {});
  add('lamp_post', 23.4, 72, {});
  add('lamp_post', 56.6, 64, { rotDeg: 180 });
  add('lamp_post', 56.6, 70, { rotDeg: 180 });
  add('planter', 35, 66.5, { w: 3, d: 1.0, flowers: true });
  add('planter', 45, 66.5, { w: 3, d: 1.0, flowers: true });
  add('bench', 26.6, 71.5, { id: 'pb1', len: 2.4, rotDeg: 90 });
  add('bench', 34.5, 72.8, { id: 'pb2', len: 2.4, rotDeg: 0 });
  for (const x of [34, 36, 44, 46]) add('bollard', x, 61.6);
  add('jersey_barrier', 33, 75.2, { len: 3 });
  add('jersey_barrier', 47, 75.2, { len: 3 });
  add('trash_bin', 37.2, 70);
  add('trash_bin', 42.8, 70);
  add('stripe', 40, 60.6, { w: 4, d: 0.4, mat: 'tactile' });
  add('rubble', 23.6, 75, { n: 7 });
  add('rubble', 56.5, 75.2, { n: 5 });

  /* ---------------- Lake Street, outside the gate ----------------
     The city lays the street itself (asphalt, the pavement along the fence, the kerbs, the far
     pavement under the L between its columns). Here: what's on it. One-way, westbound: the
     Route 5 bus stops on this side, at the kerb outside the gate. */
  add('road_paint', 40, 82.6, { kind: 'zebra', w: 4, d: 7.4 }); // the crossing at the gate
  add('road_paint', 51, 81.75, { kind: 'busbay', len: 15 });
  add('road_paint', 24, 83.6, { kind: 'arrow', rotDeg: -90 });
  add('road_paint', 66, 83.6, { kind: 'arrow', rotDeg: -90 });
  add('manhole', 29.5, 82.1);
  add('manhole', 61, 84.4);
  // the stop: shelter against the fence, the pole at the kerb where the bus's front door opens
  add('bus_shelter', 51, 76.95, { id: 'shelter', ad: 'factions' });
  add('bus_stop_sign', 44.6, 78.35, { rotDeg: 90 });
  add('street_sign', 36.9, 78.35, { a: 'W LAKE ST', b: 'TESTING CTR', oneWay: -1 });
  add('news_box', 33.9, 76.55, { n: 2 });
  add('hydrant', 57.6, 78.35);
  add('trash_bin', 47.8, 78.3);
  add('lamp_post', 30, 78.45, { rotDeg: -90 });
  add('lamp_post', 62, 78.45, { rotDeg: -90 });
  add('lamp_post', 4, 78.45, { rotDeg: -90 });
  // parked along the kerbs (the bus itself only waits here once testing is over: see build)
  add('car', 20.2, 79.85, { rotDeg: -90, kind: 'sedan', seed: 3 });
  add('car', 26.4, 79.85, { rotDeg: -90, kind: 'hatch', seed: 8 });
  add('vehicle', 63.4, 79.95, { rotDeg: -90, kind: 'van', color: 0xd6d8d8, stripe: 0x2a4a8a }); // an Erudite lab van
  add('car', 9.5, 85.45, { rotDeg: -90, kind: 'sedan', seed: 5 });
  add('vehicle', 72.5, 85.4, { rotDeg: -90, kind: 'pickup' }); // Amity, with apples
  add('rubble', 15.5, 87.6, { n: 6 });
  add('rubble', 66, 77.2, { n: 5 });
  // beyond the street: under the L tracks, a vacant lot behind a sagging fence (the city
  // itself — blocks, towers, the Hub, the L — is built by DV.City in build() below)
  add('chainlink_fence', 8, 93.4, { len: 26, lean: true });
  add('chainlink_fence', 40, 93.4, { len: 30 });
  add('chainlink_fence', 74, 93.4, { len: 24, lean: true });
  add('chainlink_fence', -7.4, 118, { len: 48, rotDeg: 90 });
  add('rubble', 20, 98, { n: 14 });
  add('rubble', 47, 104, { n: 18 });
  add('rubble', 63, 97.5, { n: 9 });
  add('rubble', 30, 112, { n: 16 });
  add('car', 12, 101, { rotDeg: 30, wreck: true, kind: 'sedan', seed: 2 });
  add('car', 70, 108, { rotDeg: -70, wreck: true, kind: 'hatch', seed: 6 });
  add('jersey_barrier', 56, 95.5, { len: 3, rotDeg: 12 });
  add('jersey_barrier', 4, 96, { len: 3, rotDeg: -20 });
  add('billboard', 42, 99, { rotDeg: 180, w: 9, h: 3.4, y: 4.6, text: 'FACTION BEFORE BLOOD', bg: '#3b3430', color: '#d9cbb0' });
  add('lamp_post', 70, 86.95, { rotDeg: 90 });
  add('lamp_post', 8, 86.95, { rotDeg: 90 });

  /* ---------------- administration ---------------- */
  add('copier', 17.5, 20.45, {});
  add('table', 22, 24, { w: 2.2, d: 1.0, chairs: 0, clutter: true });
  add('coffee_machine', 21.3, 24, { elev: 0.74, id: 'copy_coffee' });
  add('shelf', 14.4, 24.5, { rotDeg: 90, len: 3, d: 0.45 });
  add('paper_stack', 25.4, 21, { n: 6 });
  add('paper_stack', 25.5, 26.6, { n: 4 });
  add('plant', 15, 31.3, { size: 0.9 });
  add('noticeboard', 23, 28.12, { title: 'Staff Bulletin', text: 'COPY ROOM RULES\n- Toner is rationed. Abnegation volunteers have priority for printing ration lists.\n- Do not leave candidate files on the copier.\n\n"Whoever keeps taking the good stapler: Candor knows it\'s you." — N.C.' });
  add('sign', 20, 30, { text: 'ADMINISTRATION', y: 2.55, w: 2.0, h: 0.3, hanging: 0.6, bg: '#1f3d68' });
  add('poster', 13.88, 26, { rotDeg: -90, kind: 'quiet' });
  add('poster', 13.88, 44, { rotDeg: -90, kind: 'safety' });
  add('plant', 12, 47.2, { size: 0.9 });
  add('exit_sign', 12, 47.88, { rotDeg: 180, y: 2.6 });
  add('bench', 13.55, 44.6, { id: 'acb', len: 2.0, rotDeg: -90 });
  // offices
  add('cubicle', 16.5, 35, { id: 'adm_cub1' });
  add('cubicle', 19.5, 35, { id: 'adm_cub2' });
  add('cubicle', 16.5, 40, { id: 'adm_cub3' });
  add('cubicle', 19.5, 40, { id: 'adm_cub4' });
  add('desk', 23.4, 38, { id: 'adm_desk5', rotDeg: -90 });
  add('filing_cabinet', 25.4, 34, { n: 2, rotDeg: -90 });
  add('filing_cabinet', 25.4, 42.5, { n: 2, rotDeg: -90 });
  add('water_cooler', 22.5, 43.55, { rotDeg: 180, id: 'adm_water' });
  add('plant', 15, 43.2);
  add('whiteboard', 14.12, 42, { rotDeg: 90, w: 2.0 });
  add('noticeboard', 20, 43.88, { rotDeg: 180, title: 'Ration Roster', text: 'SECTOR 4 RATION DISTRIBUTION — ABNEGATION VOLUNTEERS\nMon: Factionless kitchens, east\nTue: Factionless kitchens, south\nWed: Testing District\n\nThe handwriting is small and very even. Someone has added: "We need more hands. — R.C."' });
  // director
  add('desk', 4.6, 24.5, { id: 'dir_desk', rotDeg: 90, wood: true, screen: 'crt_blue' });
  add('chair', 6.3, 23.8, { id: 'dir_chair1', style: 'wood', rotDeg: -90 });
  add('chair', 6.3, 25.2, { id: 'dir_chair2', style: 'wood', rotDeg: -90 });
  add('file_shelf', 5, 20.3, { len: 4 });
  add('file_shelf', 5, 28.7, { len: 4, rotDeg: 180 });
  add('rug', 5, 24.5, { w: 5, d: 4, mat: 'carpet_blue' });
  add('plant', 9.2, 21, { size: 1.2 });
  add('plant', 9.2, 28, { size: 1.0 });
  add('clock', 8.4, 20.12, { y: 2.4, size: 0.4 });
  add('emblem', 2.5, 28.88, { faction: 'erudite', rotDeg: 180, y: 2.6, size: 0.7, color: '#3b72b6' });
  // conference
  add('table', 5, 33.5, { id: 'conf_t', w: 5, d: 1.4, chairs: 8, top: 'wood', clutter: true });
  add('projector_screen', 0.12, 33.5, { rotDeg: 90 });
  add('whiteboard', 5, 37.88, { rotDeg: 180, w: 2.6 });
  add('plant', 9.2, 30, { size: 1.0 });
  // records
  add('file_shelf', 4.5, 40.6, { len: 6, double: true });
  add('file_shelf', 4.5, 43.1, { len: 6, double: true });
  add('file_shelf', 4.5, 45.6, { len: 6, double: true });
  add('desk', 8.6, 47.0, { id: 'rec_desk', rotDeg: 180, computer: false, chair: false });
  add('boxes', 1.0, 47.2, { n: 3 });

  /* ---------------- east wing ---------------- */
  add('sign', 58, 30, { text: 'INFIRMARY ▲  ·  STORAGE ▼  ·  STAFF ►', y: 2.55, w: 3.2, h: 0.3, hanging: 0.6, bg: '#22303a', size: 15 });
  add('plant', 61.2, 31.3, { size: 0.9 });
  // infirmary
  add('bed', 60.6, 21.6, { id: 'inf_bed1', rotDeg: -90 });
  add('bed', 60.6, 24.0, { id: 'inf_bed2', rotDeg: -90 });
  add('bed', 60.6, 26.4, { id: 'inf_bed3', rotDeg: -90 });
  add('curtain', 60.6, 22.8, { len: 2.2 });
  add('curtain', 60.6, 25.2, { len: 2.2 });
  add('desk', 55.8, 22.2, { id: 'inf_desk', rotDeg: 90, screen: 'crt_green' });
  add('med_cabinet', 54.35, 25.6, { rotDeg: 90 });
  add('chair', 57.0, 25.0, { id: 'inf_chair', rotDeg: 90 });
  add('water_cooler', 55.0, 27.45, { rotDeg: 0, id: 'inf_water' });
  // storage
  add('shelf', 54.75, 35, { rotDeg: 90, len: 4, d: 0.5 });
  add('shelf', 61.25, 35.6, { rotDeg: 90, len: 4, d: 0.5 });
  add('shelf', 57.8, 37.7, { len: 3.4, d: 0.5 });
  add('lostfound_bin', 59.4, 34.4, { id: 'lostfound' });
  add('crate', 56.6, 33.0, { size: 0.7 });
  add('boxes', 59.8, 36.6, { n: 3 });
  // staff corridor
  add('mop_bucket', 65.5, 33.4);
  add('noticeboard', 62.12, 41, { rotDeg: 90, title: 'Staff Notices', text: 'STAFF NOTICES\n\n• Technicians: serum lot 33 is RECALLED. Do not use.\n• Break room fridge will be emptied Friday. Abnegation volunteers will distribute leftovers.\n• Security reminds staff: candidates may NOT enter staff areas.\n• From the Director: "Irregular results are to be reported to me, personally, within the hour."' });
  add('sign', 64, 23, { text: 'STAFF AREA — AUTHORIZED PERSONNEL', y: 2.6, w: 2.8, h: 0.3, hanging: 0.6, bg: '#3a1a14' });
  add('exit_sign', 64, 47.88, { rotDeg: 180, y: 2.6 });
  // break room
  add('kitchenette', 70, 22.4, { len: 3 });
  add('coffee_machine', 69.0, 22.3, { elev: 0.92, id: 'brk_coffee' });
  add('table', 70, 26.6, { id: 'brk_t1', w: 1.6, d: 0.9, chairs: 4, clutter: true });
  add('table', 74.5, 26.6, { id: 'brk_t2', w: 1.6, d: 0.9, chairs: 4 });
  add('sofa', 77.35, 29.8, { id: 'brk_sofa', len: 2.2, rotDeg: -90 });
  add('crt_tv', 72, 31.6, { rotDeg: 180 });
  add('water_cooler', 66.55, 31.3, { rotDeg: 90, id: 'brk_water' });
  add('noticeboard', 66.12, 24.2, { rotDeg: 90, title: 'Break Room', text: 'LABEL YOUR FOOD.\n\n(Someone has drawn a tiny flame next to every item labeled "Frank".)' });
  add('trash_bin', 73.5, 22.5);
  add('poster', 75.5, 22.12, { kind: 'harvest' });
  // lockers
  add('lockers', 72, 32.35, { len: 8 });
  add('lockers', 72, 39.65, { len: 8, rotDeg: 180 });
  add('bench', 72, 36, { id: 'lk_bench', len: 4, back: false });
  // maintenance
  add('boiler', 74.5, 44.6, {});
  add('electrical_panel', 69.5, 40.15, {});
  add('electrical_panel', 71.0, 40.15, {});
  add('pipes', 72, 47.5, { len: 11.5, y: 3.2, n: 3 });
  add('barrel', 77.2, 41.0, {});
  add('barrel', 77.3, 42.3, { mat: 'metal_painted' });
  add('crate', 67.6, 47.0, { size: 0.9, stack: true });
  add('shelf', 66.5, 41.5, { rotDeg: 90, len: 2.0, d: 0.45 });
  // courtyard
  add('rug', 69, 55.5, { w: 8, d: 7, mat: 'grass' });
  add('rug', 61.5, 51.2, { w: 4, d: 3.4, mat: 'grass' });
  add('rug', 77.2, 51.2, { w: 4.4, d: 3.4, mat: 'grass' });
  add('fountain', 69, 55.5, { id: 'ct_fountain', r: 2.2 });
  add('tree', 60.5, 50.6, { size: 0.9 });
  add('tree', 78.2, 50.6, { size: 1.0 });
  add('tree', 60.4, 60.6, { size: 0.85 });
  add('tree', 78.4, 60.8, { size: 0.9 });
  add('garden_bed', 66, 60.7, { w: 3, d: 1.2 });
  add('garden_bed', 72.6, 60.7, { w: 4, d: 1.2 });
  add('picnic_table', 62.8, 55.5, { id: 'ct_picnic1', rotDeg: 90 });
  add('picnic_table', 75.4, 55.5, { id: 'ct_picnic2', rotDeg: 90 });
  add('bench', 72.6, 48.75, { id: 'ct_b1', len: 3 });
  add('sculpture', 67.0, 51.2, { text: 'UNITY OF THE FIVE\n\nErected in the founding year of the faction system.\n"Five virtues. One city. Each necessary; none sufficient."\n\nBeneath it, scratched small into the base by some anonymous hand: "AND THE ONES WHO FIT NONE?"' });
  add('lamp_post', 79.3, 61.2, { rotDeg: 180 });
  add('trash_bin', 64.8, 49.0);

  /* ---------------- explicit named spots ---------------- */
  const spots = {
    arrive: { x: 40, z: 80.5, rot: Math.PI },
    leave: { x: 33, z: 80.5, rot: 0 },
    plaza_center: { x: 40, z: 67, rot: 0 },
    plaza_bus: { x: 49, z: 71, rot: Math.PI / 2 },
    plaza_w: { x: 27.5, z: 66, rot: 0 },
    plaza_e: { x: 53.5, z: 66.5, rot: Math.PI },
    plaza_gate: { x: 40, z: 74, rot: 0 },
    plaza_door: { x: 40, z: 62.2, rot: 0 },
    lobby_center: { x: 40, z: 53.5, rot: Math.PI },
    lobby_w: { x: 29.5, z: 51.5, rot: Math.PI / 2 },
    lobby_e: { x: 50.8, z: 46.4, rot: -Math.PI / 2 },
    lobby_kiosk: { x: 35, z: 51.5, rot: Math.PI },
    lobby_door: { x: 40, z: 58, rot: 0 },
    lobby_q1: { x: 40, z: 45.2, rot: Math.PI },
    lobby_q2: { x: 40, z: 46.4, rot: Math.PI },
    lobby_q3: { x: 40, z: 47.6, rot: Math.PI },
    lobby_talk_a: { x: 45.2, z: 53.4, rot: -Math.PI / 2 },
    lobby_talk_b: { x: 44.0, z: 53.4, rot: Math.PI / 2 },
    guard_post: { x: 41.4, z: 42.4, rot: 0, act: 'guard' },
    cp_hallside: { x: 40, z: 39.4, rot: Math.PI },
    // reception desk (lobby, east side) — staff stand behind it facing west
    reception_1: { x: 51.95, z: 51.0, rot: -Math.PI / 2, act: 'idle' },
    reception_2: { x: 51.95, z: 53.3, rot: -Math.PI / 2, act: 'clipboard' },
    reception_q1: { x: 49.65, z: 51.0, rot: Math.PI / 2 },
    reception_q2: { x: 48.55, z: 51.0, rot: Math.PI / 2 },
    reception_q3: { x: 47.45, z: 51.0, rot: Math.PI / 2 },
    lobby_usher: { x: 43.2, z: 57.4, rot: 0, act: 'clipboard' },
    hall_c1: { x: 40, z: 30, rot: Math.PI },
    hall_c2: { x: 39.5, z: 24.5, rot: Math.PI },
    hall_board: { x: 40.5, z: 22.2, rot: Math.PI, act: 'arms_crossed' },
    hall_g1a: { x: 31.0, z: 34.3, rot: 0 },
    hall_g1b: { x: 32.3, z: 35.0, rot: -Math.PI / 2 },
    hall_g1c: { x: 31.2, z: 35.7, rot: Math.PI },
    hall_g2a: { x: 44.6, z: 31.2, rot: Math.PI / 2 },
    hall_g2b: { x: 45.9, z: 31.2, rot: -Math.PI / 2 },
    hall_vend: { x: 27.7, z: 23.4, rot: -Math.PI / 2 },
    hall_corner: { x: 52.6, z: 28.0, rot: -Math.PI / 2, act: 'arms_crossed' },
    hall_usher: { x: 38.6, z: 36.2, rot: 0, act: 'clipboard' },
    corr_w: { x: 20, z: 18, rot: Math.PI / 2 },
    corr_e: { x: 62, z: 18, rot: -Math.PI / 2 },
    corr_mid: { x: 40, z: 18.2, rot: Math.PI },
    corr_talk_a: { x: 45.0, z: 18.0, rot: Math.PI / 2 },
    corr_talk_b: { x: 46.3, z: 18.0, rot: -Math.PI / 2 },
    rest_sink: { x: 27.3, z: 40.2, rot: -Math.PI / 2 },
    daniel_hide: { x: 33.3, z: 39.0, rot: -Math.PI / 2, act: 'crouch' },
    proc_watch: { x: 22, z: 6.0, rot: Math.PI / 2 },
    gal_watch: { x: 48.5, z: 6.6, rot: 0, act: 'arms_crossed' },
    gal_watch2: { x: 41.5, z: 6.6, rot: 0, act: 'arms_crossed' },
    inf_stand: { x: 58.5, z: 24.0, rot: Math.PI / 2, act: 'clipboard' },
    storage_in: { x: 57.5, z: 34.5, rot: -Math.PI / 2 },
    closet_in: { x: 68, z: 13.2, rot: -Math.PI / 2 },
    scorr_n: { x: 64, z: 22, rot: Math.PI },
    scorr_mid: { x: 64, z: 34, rot: 0, act: 'mop' },
    scorr_s: { x: 64, z: 46.5, rot: 0 },
    epass_mid: { x: 58, z: 30, rot: Math.PI / 2 },
    brk_coffee_stand: { x: 69.0, z: 23.25, rot: Math.PI },
    brk_window: { x: 77.0, z: 26.0, rot: Math.PI / 2, act: 'arms_crossed' },
    lk_locker: { x: 69.5, z: 33.2, rot: Math.PI },
    maint_panel: { x: 70.2, z: 41.0, rot: Math.PI },
    maint_boiler: { x: 72.6, z: 44.6, rot: Math.PI / 2, act: 'mop' },
    ct_garden: { x: 72.6, z: 59.5, rot: 0, act: 'garden' },
    ct_garden2: { x: 66.0, z: 59.5, rot: 0, act: 'garden' },
    ct_corner: { x: 78.8, z: 49.2, rot: -Math.PI * 0.75, act: 'arms_crossed' },
    ct_tree: { x: 61.8, z: 52.6, rot: Math.PI / 2 },
    ct_talk_a: { x: 72.6, z: 52.2, rot: Math.PI / 2 },
    ct_talk_b: { x: 73.9, z: 52.2, rot: -Math.PI / 2 },
    ct_door: { x: 64, z: 49.4, rot: 0 },
    wpass_mid: { x: 20, z: 30, rot: 0 },
    acorr_mid: { x: 12, z: 36, rot: 0 },
    copy_spot: { x: 17.5, z: 21.4, rot: Math.PI, act: 'idle' },
    off_cooler: { x: 22.5, z: 42.7, rot: Math.PI },
    dir_window: { x: 1.0, z: 24.5, rot: -Math.PI / 2, act: 'arms_crossed' },
    conf_front: { x: 1.2, z: 33.5, rot: Math.PI / 2, act: 'talk' },
    rec_aisle: { x: 6.5, z: 41.85, rot: Math.PI, act: 'read' },
    rec_aisle2: { x: 3.5, z: 44.35, rot: 0, act: 'read' },
    sec_stand: { x: 48.0, z: 41.5, rot: Math.PI, act: 'arms_crossed' },
  };
  // standing technicians outside each active test room
  for (const t of TR) spots['corr_tr' + t.n] = { x: t.cx, z: 17.8, rot: Math.PI };

  const pickups = [
    { id: 'pk_note', item: 'gus_note', x: 69.2, y: 0.9, z: 11.0 },
    { id: 'pk_vial', item: 'simulation_vial', x: 34.2, y: 0.86, z: 5.0, hidden: 35 },
    { id: 'pk_mint1', item: 'peppermint', x: 15.6, y: 0.76, z: 39.5, hidden: 25 },
    { id: 'pk_ration_lk', item: 'ration_bar', x: 73.2, y: 0.47, z: 36.0 },
    { id: 'pk_mint2', item: 'peppermint', x: 31.3, y: 0.47, z: 72.8, hidden: 30 },
    { id: 'pk_tea', item: 'calming_tea', x: 56.0, y: 0.76, z: 21.7 },
  ];

  const triggers = [
    { id: 't_tr4', room: 'tr4' },
    { id: 't_checkpoint_lobbyside', rect: { x0: 34, z0: 41.3, x1: 46, z1: 44 } },
    { id: 't_hall', room: 'hall' },
    { id: 't_restroom', room: 'restroom' },
    { id: 't_gallery', room: 'gallery' },
    { id: 't_records', room: 'records' },
    { id: 't_courtyard', room: 'courtyard' },
    { id: 't_breakroom', room: 'breakroom' },
  ];

  DV.Zones.define('testing_center', {
    name: 'Aptitude Testing Center',
    region: 'Testing District — Sector 4',
    bounds: { x0: -2, z0: 0, x1: 82, z1: 86 },
    buildingHeight: 9,
    facade: 'facade',
    // indoors a short grey fog; outside it opens up into a light haze that matches the city's
    fog: { color: 0x5a6067, near: 24, far: 95 },
    fogOutdoor: { color: 0x98a0a6, near: 45, far: 320 },
    sky: { top: 0x5b6773, horizon: 0x9ca3a9, ground: 0x585b5d, skyline: false },
    timeOfDay: true, // the day goes by out there: afternoon light, sunset, dusk
    exterior: { sunDir: [0.35, 0.85, 0.4], sunColor: [0.42, 0.41, 0.38], ambient: [0.5, 0.52, 0.56] },
    charLight: { ambient: 0.5, hemi: 0.45, dir: 0.45 },
    rooms,
    doors,
    windows,
    props: P,
    spots,
    pickups,
    triggers,
    spawn: { x: 40, z: 57.2, rot: Math.PI },
    testRooms: TR,
    // custom build: the security turnstile and the gate blocker
    build(ctx) {
      const zone = ctx.zone;
      // player-only blocker across the street gate (NPCs come and go through it)
      // (opens once you've had your results: then the bus home waits at the curb)
      zone.gateBlock = zone.colliders.add(37.8, 75.85, 42.2, 76.15, { y0: 0, y1: 3, playerOnly: true, tag: 'gateblock' });
      ctx.update(() => { zone.gateBlock.enabled = !DV.State.flag('results_discussed'); });
      // the Route 5 bus waits at the stop once testing is over, front door open at the pole
      // (heading west, so its doors are on the kerb side)
      const bus = DV.Vehicles.park(zone, 'bus', 50.6, 80.35, -Math.PI / 2, { stripe: 0xb08a2a });
      zone.stopBus = bus;
      ctx.update(() => {
        const here = !!DV.State.flag('results_discussed');
        bus.root.visible = here;
        if (bus.collider) bus.collider.enabled = here;
      });
      ctx.interact({ id: 'bus_home', kind: 'action', x: 46.2, y: 1.2, z: 78.6, radius: 2.4, label: 'Ride home', name: 'Route 5 Bus', cond: () => DV.Build2.canGoHome(), onUse: () => DV.Build2.rideHome() });
      // security barrier arm inside the scanner arch — down until you show your name badge
      // (DV.Checkpoint drives it, and lifts it for NPCs who show theirs)
      zone.securityBlock = zone.colliders.add(39.3, 40.85, 40.7, 41.15, { y0: 0, y1: 2.4, playerOnly: true, tag: 'security' });
      const armMat = new THREE.MeshBasicMaterial({ map: DV.Tex.get('hazard'), fog: true });
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.06), armMat);
      arm.geometry.translate(0.52, 0, 0);
      const pivot = new THREE.Group();
      pivot.position.set(39.45, 1.0, 41.15);
      pivot.add(arm);
      zone.group.add(pivot);
      zone.securityArm = pivot;
      // scanner lamps on top of the arch (amber idle / green pass / red deny)
      const lamps = [];
      for (const z of [41.27, 40.73]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.03), new THREE.MeshBasicMaterial({ color: 0x8a6418, fog: true }));
        lamp.position.set(40, 2.5, z);
        zone.group.add(lamp);
        lamps.push(lamp);
      }
      DV.Checkpoint.attach(zone, { pivot, block: zone.securityBlock, lamps });
      ctx.interact({ id: 'cp_duck', kind: 'action', action: 'duckBarrier', x: 40, y: 1.0, z: 41.75, radius: 0.95, bias: 1.0, label: 'Duck under', name: 'Barrier Arm', cond: () => !DV.State.flag('security_cleared') });
      // story interactables that are not props
      ctx.interact({ id: 'dir_drawer', kind: 'action', action: 'pierceDrawer', x: 4.3, y: 0.7, z: 24.5, radius: 1.3, label: 'Search', name: 'Desk Drawer' });
      ctx.interact({ id: 'protocol_box', kind: 'action', action: 'protocolBox', x: 1.0, y: 0.8, z: 44.35, radius: 1.4, label: 'Search', name: 'Archive Box "D"' });
      ctx.interact({ id: 'tr4_chair', kind: 'action', action: 'testChair', x: 48.5, y: 0.8, z: 11.6, radius: 1.6, label: 'Sit', name: 'Testing Chair' });
      ctx.interact({ id: 'cp_monitor', kind: 'examine', x: 43.7, y: 1.1, z: 42.8, radius: 1.2, label: 'Examine', name: 'CCTV Monitors', title: 'CCTV Monitors', text: 'Grainy grey feeds: the lobby, the plaza gate, the waiting hall, the courtyard. One screen simply reads FEED 7 — GALLERY — RESTRICTED.\n\nIn the hall feed, a small figure in grey is slipping into the washroom.' });
      ctx.interact({ id: 'tr3_look', kind: 'examine', x: 41.5, y: 1.2, z: 16.4, radius: 1.0, label: 'Peer through', name: 'Room 3 Door', title: 'Testing Room 3', text: 'Through the narrow window you can see the chair under a dust sheet, and a crate stenciled SIM-A LOT 33 — RECALLED.' });
      DV.Reception.attach(zone);
      ctx.update((dt) => { DV.Checkpoint.update(dt); DV.Reception.update(dt); });

      // the city around the Testing Center: Sector 4 is on the quiet north-west edge of the
      // city; downtown and the Hub are to the south, the dried-up marsh and the old Ferris
      // wheel to the east at the far end of the street, the L right across the street
      // (the layout is the city map's: the same streets, sectors and landmarks the world map shows)
      // Once your results are in you can walk out of the gate into it, all the way to the Fence.
      const CM = DV.CityMap;
      const neighbours = [[-1, 61.5, 19, 76], [60, 63.5, 86, 76]];
      const shell = outerShell(zone, CM.campus, neighbours);
      // the roof over it all, rooms and shell: a deck, the parapet, the stair's bulkhead over the
      // closed stairwell, the plant, and a water tank you can see over the lobby from the plaza
      const roof = zone.buildRoof({
        y: 9, slab: 0.4, parapet: 0.9,
        cover: shell.map((q) => [q.x - q.w / 2, q.z - q.d / 2, q.x + q.w / 2, q.z + q.d / 2]),
        party: neighbours, bulkhead: [12, 12], tank: [48, 41],
      });
      const signTex = () => DV.Tex.sign('APTITUDE TESTING CENTER — SECTOR 4', { w: 512, h: 48, bg: '#2a2824', color: '#e0d6b8', size: 24 });
      const city = DV.City.build({
        seed: CM.seed,
        campus: CM.campus,
        centre: CM.centre,
        gridX: CM.gridX(),
        gridZ: CM.gridZ(),
        radius: CM.radius,
        hub: CM.hub,
        marshX: CM.marshX,
        ferris: CM.ferris,
        track: CM.track,
        keepClear: [[-8, 92, 88, 144]],
        extras: [
          // (their cornices stop at the plaza's fence line, z 76)
          { x: 9, z: 68.625, w: 20, d: 14.25, h: 9.6, style: 'brick', tint: [0.95, 0.92, 0.9], seed: 11 },
          { x: 73, z: 69.625, w: 26, d: 12.25, h: 12.8, style: 'brick', tint: [1.0, 0.95, 0.9], seed: 12, waterTower: [7, 0] },
          ...shell,
        ],
        haze: 0x98a0a6,
        exterior: zone.def.rooms.filter((r) => r.exterior).map((r) => [r.x0, r.z0, r.x1, r.z1]).concat(roof.rects),
        districts: CM.districts,
        walk: {
          fence: CM.fence, wall: CM.wall, edge: CM.edge, gate: [CM.fenceGate.x, CM.fenceGate.z], sidewalk: CM.sidewalk, landmarks: CM.landmarks, homes: CM.homes,
          light: zone.lighting.sample(-60, 0.5, -60, 0, 1, 0, null, true),
          // the building's name on its street sides
          signs: [
            { x: 40, y: 3.0, z: CM.campus[1] - 0.04, rot: Math.PI, w: 9, h: 0.85, tex: signTex },
            { x: CM.campus[2] + 0.04, y: 3.0, z: 12, rot: Math.PI / 2, w: 9, h: 0.85, tex: signTex },
            { x: CM.campus[0] - 0.04, y: 3.0, z: 12, rot: -Math.PI / 2, w: 9, h: 0.85, tex: signTex },
          ],
        },
      });
      ctx.add(city.group);
      zone.city = city;
      // everything standing out there is solid, the Testing Center's outside included (so you slide
      // along its walls instead of stopping dead at the edge of the grounds)
      for (const q of city.walk.solids) zone.colliders.add(q[0], q[1], q[2], q[3], { y1: q[4], tag: 'city' });
      // the Fence's floodlights and red lamps come on at dusk with the street lamps
      zone.lamps = (zone.lamps || []).concat(city.walk.lamps);
      // the walk home: your own front door, out in your sector (for Amity: the truck out to the farms, at the city's edge)
      for (const f in CM.homes) {
        const h = CM.homes[f];
        ctx.interact({
          id: 'home_door_' + f, kind: 'action', x: h.x, y: 1.2, z: h.z, radius: 2.4,
          label: h.gate ? 'Ride home' : 'Go inside', name: h.gate ? 'Amity Truck' : 'Home',
          cond: () => DV.State.data.player.upbringing === f && DV.Build2.canGoHome(),
          onUse: () => DV.Build2.walkHome(),
        });
      }
      DV.Vehicles.park(zone, 'pickup', CM.homes.amity.x + 5, CM.homes.amity.z + 3.2, -Math.PI / 2, { color: 0x6a8a3a });
      // what's on the streets (the zone dresses its own stretch of Lake Street), and who's on them
      const b = zone.def.bounds;
      const kit = DV.StreetKit.attach(zone, city, { skip: [CM.campus[0] - 6.5, b.z1 - 11, CM.campus[2] + 6.5, b.z1 + 6.5] });
      const life = DV.StreetLife.attach(zone, city, kit);
      // Erudite's police: the patrols, the guards at the Order Station, the drones (js/game/order.js)
      const order = DV.Order.attach(zone, city, life);
      ctx.update((dt) => {
        const cam = DV.Game && DV.Game.camera;
        if (cam) kit.update(cam.position.x, cam.position.z);
        life.update(dt);
        order.update(dt);
      });
      ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));

      // pigeons on the plaza, street and courtyard; crows and gulls over the city; litter
      DV.Wildlife.attach(zone, {
        seed: 4,
        flocks: [
          { x0: 23, z0: 63, x1: 37, z1: 74.5, n: 8 },
          { x0: 43, z0: 63, x1: 57, z1: 74.5, n: 6 },
          { x0: 15, z0: 76.5, x1: 37, z1: 78.5, n: 4 },
          { x0: 54, z0: 76.5, x1: 65, z1: 78.5, n: 3 },
          { x0: 59, z0: 49, x1: 79, z1: 61, n: 5 },
        ],
        perches: [
          [23.4, 4.52, 64], [23.4, 4.52, 72], [56.6, 4.52, 64], [56.6, 4.52, 70], [30, 4.52, 78.45], [62, 4.52, 78.45],
          [50.2, 2.66, 77.0], [51.8, 2.66, 77.0], [29.4, 2.22, 68.5], [30.6, 2.22, 68.5],
          [26, 3.22, 76], [54, 3.22, 76], [25, 7.04, 62.6], [52.5, 7.04, 62.6],
          [28, 8.32, 86.75], [41, 8.32, 86.75], [57, 8.32, 86.75],
          [33, 9.02, 59.9], [47, 9.02, 59.9],
          [66, 4.22, 62], [74, 4.22, 62], [80, 4.22, 54],
        ],
        circlers: { n: 7, centre: [40, 130], r: 70, y: 34 },
        litter: { rect: [23, 61, 57, 75.4], n: 8 },
      });
    },
    onExit(zone) {
      // e.g. into a simulation: the train's sound (and the traffic's) must not keep running in there
      if (zone.city && zone.city.train && zone.city.train.sound) { zone.city.train.sound.stop(); zone.city.train.sound = null; }
      if (zone.streetLife) zone.streetLife.sleep();
      if (zone.order) zone.order.sleep();
    },
  });
})();
