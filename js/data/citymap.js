/* ==========================================================================
   DIVERGENT — the city map
   One canonical layout of the city, in the Testing Center's coordinates
   (metres; +x east, +z south; the Testing Center's front gate is at 40, 76).
   The city outside the Testing Center's gate is generated from this, the HUD
   names the street and the district you're in from it, and the world map in
   the menu draws it. Every other place in the game (the Hub, the compounds,
   the faction homes) has a spot on it.

   Districts: the faction sectors. Each has a centre and a radius (where its
   look fades out), what its blocks are built like, and who walks its streets.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // north–south streets (x = const), west to east
  const AVENUES = [
    [-546, 'Cicero Ave'], [-470, 'Pulaski Rd'], [-394, 'Kedzie Ave'], [-318, 'California Ave'], [-242, 'Western Ave'],
    [-166, 'Damen Ave'], [-90, 'Ashland Ave'], [-14, 'Racine Ave'], [94, 'Halsted St'], [170, 'Clinton St'],
    [246, 'Wells St'], [322, 'State St'], [398, 'Michigan Ave'],
  ];
  // east–west streets (z = const), north to south; Lake Street runs under the L, past the gate
  const STREETS = [
    [-524, 'Belmont Ave'], [-460, 'Fullerton Ave'], [-396, 'Armitage Ave'], [-332, 'North Ave'], [-268, 'Division St'],
    [-204, 'Chicago Ave'], [-140, 'Grand Ave'], [-76, 'Kinzie St'], [-12, 'Fulton St'], [83.5, 'Lake St', 17],
    [150, 'Randolph St'], [214, 'Washington St'], [278, 'Madison St'], [342, 'Monroe St'], [406, 'Adams St'],
    [470, 'Jackson Blvd'], [534, 'Van Buren St'],
  ];

  const M = {
    seed: 1871,
    centre: [40, 35],
    radius: 580, // where the blocks stop
    // where the city's streets end and Amity's farmland begins
    edge: 640,
    // the Fence: a wall round the city and its farmland (the centre line of it), and the cordon in
    // front of it that nobody goes past (a security fence, a patrol road, floodlights)
    fence: 1132,
    wall: { inner: 1128, outer: 1136, height: 18, top: 34.5, towers: 20, cordon: 1110 },
    marshX: 420, // the dried-up lake: the marsh
    hub: [132, 374], // (in the middle of its block, Halsted to Clinton, Monroe to Adams: not on a junction)
    ferris: [458, 84],
    street: 12, // default street width, kerb to kerb
    sidewalk: 3.2, // pavement between the kerb and the building fronts
    // the Testing Center's own grounds (the city leaves them to the zone; round them, pavement)
    campus: [-2, 0, 82, 76],
    // the L: one line along Lake Street, columns along the far pavement
    track: { x0: -720, x1: 720, z0: 86.6, z1: 91.2, y: 7.4, span: 15 },
    avenues: AVENUES.map(([x, name, w]) => ({ x, name, w: w || 12 })),
    streets: STREETS.map(([z, name, w]) => ({ z, name, w: w || 12 })),
    // Lake Street is narrower than its right of way: the kerbs are at 78.8 and 86.4 and the L's
    // columns stand on the wide far pavement; one-way, westbound
    lake: { z: 83.5, road: [78.8, 86.4], oneWay: -1 },

    districts: [
      { id: 'testing', name: 'Testing District', short: 'Sector 4', faction: null, c: [40, 30], r: 150, label: [40, -70], color: '#8a8478',
        peds: { abnegation: 3, erudite: 3, candor: 2, amity: 2, dauntless: 2, factionless: 1 }, density: 0.7 },
      { id: 'downtown', name: 'Downtown', short: 'The Hub', faction: null, c: [96, 360], r: 170, label: [96, 452], color: '#6a7480',
        peds: { erudite: 3, candor: 3, abnegation: 2, dauntless: 2, amity: 1, factionless: 1 }, density: 1.0 },
      { id: 'erudite', name: 'Erudite Sector', short: 'Erudite', faction: 'erudite', c: [290, 300], r: 125, label: [318, 386], color: '#2f5f9a',
        peds: { erudite: 8, candor: 1, abnegation: 1 }, density: 0.8 },
      { id: 'candor', name: 'Candor Sector', short: 'Candor', faction: 'candor', c: [-130, 300], r: 115, label: [-110, 214], color: '#d8d8d0',
        peds: { candor: 8, erudite: 1, abnegation: 1 }, density: 0.8 },
      { id: 'abnegation', name: 'Abnegation Sector', short: 'Abnegation', faction: 'abnegation', c: [-320, -60], r: 210, label: [-330, -176], color: '#9a968c',
        peds: { abnegation: 9, factionless: 1 }, density: 0.55 },
      { id: 'factionless', name: 'The Factionless Ruins', short: 'Ruins', faction: 'factionless', c: [-300, 360], r: 150, label: [-300, 440], color: '#5a5048',
        peds: { factionless: 9, abnegation: 1 }, density: 0.4 },
      { id: 'dauntless', name: 'Dauntless Sector', short: 'Dauntless', faction: 'dauntless', c: [330, -130], r: 140, label: [318, -232], color: '#a03024',
        peds: { dauntless: 9, factionless: 1 }, density: 0.55 },
    ],

    // places worth a name on the map (and a building to go with most of them)
    landmarks: [
      { id: 'testing_center', name: 'Aptitude Testing Center', x: 40, z: 35, icon: 'seal' },
      { id: 'hub', name: 'The Hub', x: 132, z: 374, icon: 'hub' },
      { id: 'merciless_mart', name: 'Merciless Mart', x: -128, z: 310, w: 50, d: 40, icon: 'candor' },
      { id: 'erudite_hq', name: 'Erudite Headquarters', x: 284, z: 310, w: 52, d: 40, icon: 'erudite' },
      { id: 'abnegation_hall', name: 'Abnegation Council Hall', x: -280, z: -108, w: 34, d: 26, icon: 'abnegation' },
      { id: 'dauntless_compound', name: 'The Dauntless Compound', x: 356, z: -108, w: 48, d: 30, icon: 'dauntless' }, // (with the roof they jump from on its west side)
      { id: 'ferris', name: 'The Old Pier', x: 458, z: 84, icon: 'wheel' },
      { id: 'hancock', name: 'The Hancock Building', x: 208, z: 246, w: 30, d: 30, icon: 'tower' },
      { id: 'fence_gate', name: 'The Fence Gate', x: -1065.6, z: 278, icon: 'gate' },
      { id: 'amity', name: 'Amity Headquarters', x: -720, z: 420, w: 84, d: 64, icon: 'amity', farm: true },
      // the Office of Public Order: Erudite's police, Dauntless guards under Erudite command (js/game/order.js);
      // its front faces Armitage Avenue
      { id: 'order_station', name: 'Order Station', x: 208, z: -428, w: 54, d: 42, icon: 'order', face: 1 },
    ],

    // where each faction's families live: the point on the pavement outside the front door, and
    // which way the door faces (the house stands behind it). The walk home ends there.
    homes: {
      abnegation: { x: -309.6, z: -27.5, face: 'w', kind: 'house', row: -1, street: 'California Ave' },
      erudite: { x: 237.6, z: 252, face: 'e', kind: 'flats', street: 'Wells St' },
      candor: { x: -157.6, z: 256, face: 'w', kind: 'flats', street: 'Damen Ave' },
      dauntless: { x: 254.4, z: -118, face: 'w', kind: 'flats', street: 'Wells St' },
      amity: { x: -497, z: 278, gate: true, street: 'Madison St' }, // the Amity truck back to the farms waits where Madison Street leaves the city
    },

    // every zone's place on the map (zones not listed have none: simulations, the menu)
    zones: {
      hub_hall: 'hub', hancock_roof: 'hancock',
      abn_street: 'abnegation_hall', abn_night: 'abnegation_hall', abn_home: 'home:abnegation', home_abnegation: 'home:abnegation',
      eru_hall: 'erudite_hq', eru_lab: 'erudite_hq', home_erudite: 'home:erudite',
      cand_lobby: 'merciless_mart', cand_upper: 'merciless_mart', home_candor: 'home:candor',
      amity_farm: 'amity', amity_day: 'amity', home_amity: 'amity',
      d_compound: 'dauntless_compound', d_pit: 'dauntless_compound', d_roof: 'dauntless_compound', home_dauntless: 'home:dauntless',
      l_platform: [150, 89], l_car: [150, 89],
    },

    /* ---------------- lookups ---------------- */
    // the district at (x, z): the one whose centre you're deepest inside, with how deep (0..1)
    district(x, z) {
      // out past the city's edge: Amity's farmland
      if (x < this.marshX - 4 && Math.hypot(x - this.centre[0], z - this.centre[1]) > this.edge) return { d: null, k: 0, farm: true };
      let best = null, bk = 0;
      for (const d of this.districts) {
        const k = 1 - Math.hypot(x - d.c[0], z - d.c[1]) / d.r;
        if (k > bk) { bk = k; best = d; }
      }
      if (x > this.marshX - 4) return { d: null, k: 0, marsh: true };
      return { d: best, k: bk };
    },
    // the street you're standing in or beside (within the kerb + pavement), and the cross street
    streetAt(x, z) {
      let ns = null, ew = null, bx = 1e9, bz = 1e9;
      for (const a of this.avenues) { const d = Math.abs(x - a.x); if (d < a.w / 2 + this.sidewalk + 1 && d < bx) { bx = d; ns = a; } }
      for (const s of this.streets) { const d = Math.abs(z - s.z); if (d < s.w / 2 + this.sidewalk + 1 && d < bz) { bz = d; ew = s; } }
      return { ns, ew };
    },
    nearestLandmark(x, z, within) {
      let best = null, bd = within || 40;
      for (const l of this.landmarks) { const d = Math.hypot(x - l.x, z - l.z); if (d < bd) { bd = d; best = l; } }
      return best;
    },
    // what the HUD says out in the city: the street (or the corner) and the district
    locate(x, z) {
      const lm = this.nearestLandmark(x, z, 34);
      const { ns, ew } = this.streetAt(x, z);
      const dd = this.district(x, z);
      const sub = dd.marsh ? 'The Marsh' : dd.farm ? 'Amity Farmland' : dd.d && dd.k > 0.08 ? dd.d.name : 'The City';
      let name;
      if (Math.hypot(x - this.centre[0], z - this.centre[1]) > this.wall.cordon - 26) name = 'The Fence';
      else if (dd.farm) name = lm ? lm.name : 'The Farms';
      else if (lm && !lm.outside) name = lm.name;
      else if (ns && ew) name = ew.name + ' & ' + ns.name;
      else if (ns || ew) name = (ns || ew).name;
      else name = dd.marsh ? 'The Marsh' : 'Side Street';
      return { name, sub };
    },
    // a zone's place on the map: [x, z] or null
    zoneLocation(zoneId) {
      if (zoneId === 'testing_center') return [40, 35];
      const v = this.zones[zoneId];
      if (!v) return null;
      if (Array.isArray(v)) return v;
      if (v.indexOf('home:') === 0) { const h = this.homes[v.slice(5)]; return h ? [h.x, h.z] : null; }
      const l = this.landmarks.find((q) => q.id === v);
      return l ? [l.x, l.z] : null;
    },
    landmark(id) { return this.landmarks.find((q) => q.id === id) || null; },
    // the street grid the city generator wants: numbers, or [centre, width]
    gridX() { return this.avenues.map((a) => (a.w === this.street ? a.x : [a.x, a.w])); },
    gridZ() { return this.streets.map((s) => (s.road ? { c: s.z, w: s.w, road: s.road } : s.w === this.street ? s.z : [s.z, s.w])); },
    // the kerbs of a street: [near, far] across it
    road(line) {
      if (line.road) return line.road;
      const c = line.x !== undefined ? line.x : line.z;
      return [c - line.w / 2, c + line.w / 2];
    },
    // the Fence's watchtowers: their angles round the ring (none at the gate, which has its own)
    towerAngles() {
      const gate = this.fenceGate, ga = Math.atan2(gate.z - this.centre[1], gate.x - this.centre[0]);
      const out = [];
      for (let k = 0; k < this.wall.towers; k++) {
        const a = ga + ((k + 0.5) / this.wall.towers) * Math.PI * 2;
        out.push(Math.atan2(Math.sin(a), Math.cos(a)));
      }
      return out;
    },
    // Amity's farmland, between the city's edge and the Fence (worked out once, the same for the
    // generator and the map): section roads carrying on every other line of the city's grid, the
    // parcels between them in quarters, each one strips of crops, an orchard, or a farmstead
    farms() {
      if (this._farms) return this._farms;
      const r = U.rng(4071), c = this.centre, E = this.edge + 3, O = this.wall.cordon - 4, mx = this.marshX - 4;
      const rad = (x, z) => Math.hypot(x - c[0], z - c[1]);
      const inRing = (q) => [[q[0], q[1]], [q[2], q[1]], [q[2], q[3]], [q[0], q[3]]].every(([x, z]) => rad(x, z) > E && rad(x, z) < O && x < mx);
      const amity = this.landmark('amity'), keep = [amity.x - amity.w / 2 - 14, amity.z - amity.d / 2 - 14, amity.x + amity.w / 2 + 14, amity.z + amity.d / 2 + 14];
      const hits = (q, k) => q[2] > k[0] && q[0] < k[2] && q[3] > k[1] && q[1] < k[3];
      // the grid carried on past the city, every other line
      const ext = (vals, step, lo, hi) => {
        const out = vals.slice();
        for (let v = vals[0] - step; v > lo; v -= step) out.unshift(v);
        for (let v = vals[vals.length - 1] + step; v < hi; v += step) out.push(v);
        return out.filter((_, i) => i % 2 === 0);
      };
      const gx = ext(this.avenues.map((a) => a.x), 76, c[0] - O - 80, c[0] + O + 80), gz = ext(this.streets.map((q) => q.z), 64, c[1] - O - 70, c[1] + O + 70);
      // the roads: each line, where it runs through the farmland (out of the city, up to the cordon)
      const roads = [];
      const span = (d) => { const a = d < E ? Math.sqrt(E * E - d * d) : 0, b = Math.sqrt(Math.max(0, O * O - d * d)); return d >= O ? [] : a ? [[a, b], [-b, -a]] : [[-b, b]]; };
      for (const x of gx) { if (x > mx - 3) continue; for (const [a, b] of span(Math.abs(x - c[0]))) roads.push([x - 3, c[1] + a, x + 3, c[1] + b]); }
      for (const z of gz) for (const [a, b] of span(Math.abs(z - c[1]))) { const x0 = c[0] + a, x1 = Math.min(c[0] + b, mx); if (x1 - x0 > 4) roads.push([x0, z - 3, x1, z + 3]); }
      // the parcels between them
      const CROPS = [['wheat', 0.3], ['green', 0.25], ['plough', 0.2], ['pasture', 0.15], ['fallow', 0.1]];
      const crop = () => { let q = r(); for (const [k, w] of CROPS) { q -= w; if (q <= 0) return k; } return 'green'; };
      const fields = [], orchards = [], steads = [], hedges = [];
      for (let i = 0; i + 1 < gx.length; i++) for (let j = 0; j + 1 < gz.length; j++) {
        const P = [gx[i] + 4, gz[j] + 4, gx[i + 1] - 4, gz[j + 1] - 4];
        const hx = (P[0] + P[2]) / 2, hz = (P[1] + P[3]) / 2;
        let stead = r() < 0.32 ? Math.floor(r() * 4) : -1;
        [[P[0], P[1], hx - 1, hz - 1], [hx + 1, P[1], P[2], hz - 1], [P[0], hz + 1, hx - 1, P[3]], [hx + 1, hz + 1, P[2], P[3]]].forEach((q, k) => {
          if (!inRing(q) || hits(q, keep)) { if (k === stead) stead = -1; return; }
          if (k === stead) {
            // the farm: by the road, in the corner of its quarter nearest the parcel's
            const cx = k % 2 ? q[2] - 16 : q[0] + 16, cz = k < 2 ? q[1] + 14 : q[3] - 14;
            steads.push({ x: cx, z: cz, rot: k < 2 ? Math.PI : 0, seed: Math.floor(r() * 1000), barn: r() < 0.5 ? 'red' : 'grey' });
            const along = q[2] - q[0] > q[3] - q[1];
            // the rest of the quarter: one strip of crop
            fields.push({ r: along ? [k % 2 ? q[0] : q[0] + 34, q[1], k % 2 ? q[2] - 34 : q[2], q[3]] : [q[0], k < 2 ? q[1] + 30 : q[1], q[2], k < 2 ? q[3] : q[3] - 30], crop: crop() });
            return;
          }
          if (r() < 0.17) { orchards.push({ r: [q[0] + 6, q[1] + 6, q[2] - 6, q[3] - 6] }); return; }
          // strips of crops along the longer side
          const along = q[2] - q[0] > q[3] - q[1], n = 2 + Math.floor(r() * 2), L = along ? q[3] - q[1] : q[2] - q[0];
          for (let m = 0; m < n; m++) {
            const a = (L / n) * m + (m ? 0.6 : 0), b = (L / n) * (m + 1) - (m < n - 1 ? 0.6 : 0);
            fields.push({ r: along ? [q[0], q[1] + a, q[2], q[1] + b] : [q[0] + a, q[1], q[0] + b, q[3]], crop: crop() });
          }
          // (a hedge on the quarter's far side: on the verge, clear of any road by 20 cm)
          if (r() < 0.4) hedges.push(along ? [q[0], q[3] + 0.2, q[2], q[3] + 0.8] : [q[2] + 0.2, q[1], q[2] + 0.8, q[3]]);
        });
      }
      return (this._farms = { roads, fields, orchards, steads, hedges });
    },
    inside(x, z, pad) { return Math.hypot(x - this.centre[0], z - this.centre[1]) < this.fence - (pad || 0); },
  };
  M.fenceGate = M.landmark('fence_gate');
  Object.assign(M.streets.find((q) => q.z === M.lake.z), { road: M.lake.road, oneWay: M.lake.oneWay });
  void U;
  DV.CityMap = M;
})();
