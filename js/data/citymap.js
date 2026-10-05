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
      // Madison Street carries on out to the gate as the gate road: nothing's planted on it
      const G = this.gateRoad();
      const offGate = (q) => (q[1] < G.r[3] + 3 && q[3] > G.r[1] - 3 && q[0] < G.r[2] ? ((q[1] + q[3]) / 2 < G.z ? [q[0], q[1], q[2], G.r[1] - 3] : [q[0], G.r[3] + 3, q[2], q[3]]) : q);
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
          q = offGate(q);
          if (k === stead) {
            // the farm: by the road, in the corner of its quarter nearest the parcel's
            const cx = k % 2 ? q[2] - 16 : q[0] + 16, cz = k < 2 ? q[1] + 14 : q[3] - 14;
            const along = q[2] - q[0] > q[3] - q[1];
            // (its yard: the end of the quarter the crop doesn't take)
            const yard = along ? [k % 2 ? q[2] - 34 : q[0], q[1], k % 2 ? q[2] : q[0] + 34, q[3]] : [q[0], k < 2 ? q[1] : q[3] - 30, q[2], k < 2 ? q[1] + 30 : q[3]];
            steads.push({ x: cx, z: cz, rot: k < 2 ? Math.PI : 0, seed: Math.floor(r() * 1000), barn: r() < 0.5 ? 'red' : 'grey', yard, quarter: k });
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
      // what's growing in the green fields (corn, cabbages, beans up their poles, potatoes), and
      // which of the wheat is in already (stubble, the bales still out on it)
      const r2 = U.rng(4072);
      for (const f of fields) {
        const q = r2();
        if (f.crop === 'green') f.crop = q < 0.3 ? 'corn' : q < 0.5 ? 'cabbage' : q < 0.65 ? 'beans' : 'green';
        else if (f.crop === 'wheat' && q < 0.3) f.crop = 'stubble';
        f.k = r2();
      }
      return (this._farms = { roads, fields, orchards, steads, hedges, gate: G });
    },
    // Madison Street on out of the city to the Fence's gate: from the last junction it reaches
    // (Pulaski Road) to the checkpoint at the cordon
    gateRoad() {
      if (this._gate) return this._gate;
      const c = this.centre, z = this.homes.amity.z, x1 = this.avenues.find((a) => a.name === 'Pulaski Rd').x - 6;
      // (it stops short of the checkpoint's blocks, on the cordon's apron)
      const x0 = c[0] - Math.sqrt((this.wall.cordon - 6) * (this.wall.cordon - 6) - (z - c[1]) * (z - c[1]));
      return (this._gate = { z, r: [x0, z - 5, x1, z + 5] });
    },

    // The streets as a network, worked out once (the generator, the traffic, the map and the
    // tests share it). A stretch of street is real where a block stands on at least one side of
    // it; past the last blocks the road stops at a kerb with a pavement along it, and the ground
    // beyond is the edge of the farmland. Some roads go on out of the city: the farm roads that
    // carry a street's line on, and Madison Street to the gate.
    //   built(i, j), cell(i, j): the block between avenues i, i+1 and streets j, j+1 (i, j from −1:
    //     the ground past the last avenue or street)
    //   junction(i, j): { i, j, x, z, box, arms: { n, s, w, e } } or null; an arm is 1 (a street),
    //     2 (a road out of the city) or 0 (none: a kerb across it)
    //   roads: [{ r, kind: 'street' | 'junction' | 'out' }]: every carriageway, kerb to kerb
    //   strips: the pavement along the outside of the last streets ({ r, kerbs, lanes, edge })
    //   lots: the open ground past them, between the city and the farms ({ r, d, front })
    //   onRoad(x, z, pad): on a street or in a junction (the traffic's ground; not the roads out)
    roadNet() {
      if (this._net) return this._net;
      const xs = this.avenues, zs = this.streets, nx = xs.length, nz = zs.length, c = this.centre;
      const SW = this.sidewalk, INS = 1.6;
      const kx = xs.map((a) => this.road(a)), kz = zs.map((s) => this.road(s));
      // the ground past the last lines runs out to where the farm roads would be
      const W0 = xs[0].x - 76 + 3, E1 = this.marshX - 4, N0 = zs[0].z - 64 + 3, S1 = zs[nz - 1].z + 64 - 3;
      const cx0 = (i) => (i < 0 ? W0 : kx[i][1]), cx1 = (i) => (i + 1 >= nx ? E1 : kx[i + 1][0]);
      const cz0 = (j) => (j < 0 ? N0 : kz[j][1]), cz1 = (j) => (j + 1 >= nz ? S1 : kz[j + 1][0]);
      const cell = (i, j) => [cx0(i), cz0(j), cx1(i), cz1(j)];
      // (the same test the city's generator uses for where it builds)
      const built = (i, j) => {
        if (i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) return false;
        const b = [xs[i].x + xs[i].w / 2, zs[j].z + zs[j].w / 2, xs[i + 1].x - xs[i + 1].w / 2, zs[j + 1].z - zs[j + 1].w / 2];
        if (Math.hypot((b[0] + b[2]) / 2 - c[0], (b[1] + b[3]) / 2 - c[1]) > this.radius) return false;
        return b[0] < this.marshX - 10;
      };
      // a stretch of avenue i between streets j and j + 1; of street j between avenues i and i + 1
      const av = (i, j) => built(i - 1, j) || built(i, j), st = (j, i) => built(i, j - 1) || built(i, j);
      const J = new Map(), roads = [], strips = [], lots = [];
      const key = (i, j) => i * 1000 + j;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const arms = { n: av(i, j - 1) ? 1 : 0, s: av(i, j) ? 1 : 0, w: st(j, i - 1) ? 1 : 0, e: st(j, i) ? 1 : 0 };
        if (!(arms.n || arms.s || arms.w || arms.e)) continue;
        J.set(key(i, j), { i, j, x: xs[i].x, z: zs[j].z, box: [kx[i][0], kz[j][0], kx[i][1], kz[j][1]], arms });
      }
      const junction = (i, j) => J.get(key(i, j)) || null;
      for (const q of J.values()) {
        roads.push({ r: q.box, kind: 'junction' });
        // the street on from it (east, and south), to the next junction
        if (q.arms.e && q.i + 1 < nx) roads.push({ r: [q.box[2], q.box[1], kx[q.i + 1][0], q.box[3]], kind: 'street' });
        if (q.arms.s && q.j + 1 < nz) roads.push({ r: [q.box[0], q.box[3], q.box[2], kz[q.j + 1][0]], kind: 'street' });
      }
      // the roads out: each farm road that carries on a street's line runs in to the last junction
      // on it (wide as the street through the pavement, then a lane), and Madison Street to the gate
      const out = [];
      const F = this.farms(), G = this.gateRoad();
      const outRoad = (q, dir, axis, end, w) => {
        const b = q.box, m = axis === 'z' ? (dir < 0 ? b[1] : b[3]) : dir < 0 ? b[0] : b[2], m2 = m + dir * SW;
        const k = axis === 'z' ? kx[q.i] : kz[q.j], lo = (k[0] + k[1]) / 2; // (the middle of the street: Lake Street's is off its line)
        const span = (a, bb, h0, h1) => (axis === 'z' ? [h0, Math.min(a, bb), h1, Math.max(a, bb)] : [Math.min(a, bb), h0, Math.max(a, bb), h1]);
        const parts = [span(m, m2, k[0], k[1]), span(m2, end, lo - w / 2, lo + w / 2)];
        q.arms[axis === 'z' ? (dir < 0 ? 'n' : 's') : dir < 0 ? 'w' : 'e'] = 2;
        for (const r of parts) roads.push({ r, kind: 'out' });
        out.push({ junction: q, axis, dir, parts });
      };
      const outermost = (fixed, axis, dir) => {
        let best = null;
        for (const q of J.values()) if ((axis === 'z' ? q.i : q.j) === fixed && (!best || ((axis === 'z' ? q.z - best.z : q.x - best.x) * dir > 0))) best = q;
        return best;
      };
      for (const fr of F.roads) {
        const vert = fr[2] - fr[0] < fr[3] - fr[1], line = vert ? (fr[0] + fr[2]) / 2 : (fr[1] + fr[3]) / 2;
        const idx = vert ? xs.findIndex((a) => Math.abs(a.x - line) < 0.5) : zs.findIndex((s) => Math.abs(s.z - line) < 0.5);
        if (idx < 0) continue;
        // (the end of the farm road nearer the city)
        const near = vert ? (Math.abs(fr[1] - c[1]) < Math.abs(fr[3] - c[1]) ? fr[1] : fr[3]) : Math.abs(fr[0] - c[0]) < Math.abs(fr[2] - c[0]) ? fr[0] : fr[2];
        const dir = vert ? Math.sign(near - c[1]) : Math.sign(near - c[0]);
        const q = outermost(idx, vert ? 'z' : 'x', dir);
        const edge = q && (vert ? (dir < 0 ? q.box[1] : q.box[3]) : dir < 0 ? q.box[0] : q.box[2]);
        if (q && q.arms[vert ? (dir < 0 ? 'n' : 's') : dir < 0 ? 'w' : 'e'] === 0 && (near - edge) * dir > SW + 2) outRoad(q, dir, vert ? 'z' : 'x', near + dir * 2, 7);
      }
      const gi = zs.findIndex((s) => s.z === G.z), gq = outermost(gi, 'x', -1);
      if (gq && gq.arms.w === 0) outRoad(gq, -1, 'x', G.r[0], 10);
      // a farm road that passes the city by (its line isn't one of the city's) carries on across the
      // open ground between, as a track
      const lines = new Map();
      for (const fr of F.roads) {
        const vert = fr[2] - fr[0] < fr[3] - fr[1], k = (vert ? 'x' : 'z') + ((vert ? fr[0] + fr[2] : fr[1] + fr[3]) / 2);
        if (!lines.has(k)) lines.set(k, []);
        lines.get(k).push(fr);
      }
      const hitsCity = (r) => roads.some((q) => q.kind !== 'out' && r[0] < q.r[2] && r[2] > q.r[0] && r[1] < q.r[3] && r[3] > q.r[1]) ||
        [...Array(nx + 1).keys()].some((ii) => [...Array(nz + 1).keys()].some((jj) => { if (!built(ii - 1, jj - 1)) return false; const b = cell(ii - 1, jj - 1); return r[0] < b[2] && r[2] > b[0] && r[1] < b[3] && r[3] > b[1]; }));
      for (const [k, list] of lines) {
        if (list.length !== 2) continue;
        const vert = k[0] === 'x', [a, b] = list.sort((p, q) => (vert ? p[1] - q[1] : p[0] - q[0]));
        const r = vert ? [a[0], a[3] - 2, a[2], b[1] + 2] : [a[2] - 2, a[1], b[0] + 2, a[3]];
        if ((vert ? r[3] - r[1] : r[2] - r[0]) > 4 && !hitsCity(r)) roads.push({ r, kind: 'out', track: true });
      }
      // the pavement along the outside: down the side of each empty block facing a street, across the
      // mouth of each street that goes no further, and round the corners between
      const kerbsOf = (r) => {
        const ks = [];
        // (none where a road goes out of the city: the pavement drops to it, like a driveway)
        for (const q of roads) {
          if (q.kind === 'out') continue;
          const p = q.r, e = 0.02;
          const ox = Math.min(r[2], p[2]) - Math.max(r[0], p[0]), oz = Math.min(r[3], p[3]) - Math.max(r[1], p[1]);
          if (ox > 0.2 && Math.abs(r[3] - p[1]) < e) ks.push([Math.max(r[0], p[0]), r[3], Math.min(r[2], p[2]), r[3], 0, 1]);
          if (ox > 0.2 && Math.abs(r[1] - p[3]) < e) ks.push([Math.max(r[0], p[0]), r[1], Math.min(r[2], p[2]), r[1], 0, -1]);
          if (oz > 0.2 && Math.abs(r[2] - p[0]) < e) ks.push([r[2], Math.max(r[1], p[1]), r[2], Math.min(r[3], p[3]), 1, 0]);
          if (oz > 0.2 && Math.abs(r[0] - p[2]) < e) ks.push([r[0], Math.max(r[1], p[1]), r[0], Math.min(r[3], p[3]), -1, 0]);
        }
        return ks;
      };
      const strip = (r, lanes) => strips.push({ r, lanes, kerbs: null, edge: null });
      for (let i = -1; i < nx; i++) for (let j = -1; j < nz; j++) {
        if (built(i, j)) continue;
        const [x0, z0, x1, z1] = cell(i, j);
        const N = j >= 0 && st(j, i), S = j + 1 < nz && st(j + 1, i), Wd = i >= 0 && av(i, j), E = i + 1 < nx && av(i + 1, j);
        // (each lane has nodes where the crossings to the blocks opposite land)
        if (N) strip([x0, z0, x1, z0 + SW], [[[Wd ? x0 + INS : x0, z0 + INS], [x0 + INS, z0 + INS], [x1 - INS, z0 + INS], [E ? x1 - INS : x1, z0 + INS]]]);
        if (S) strip([x0, z1 - SW, x1, z1], [[[Wd ? x0 + INS : x0, z1 - INS], [x0 + INS, z1 - INS], [x1 - INS, z1 - INS], [E ? x1 - INS : x1, z1 - INS]]]);
        if (Wd) strip([x0, N ? z0 + SW : z0, x0 + SW, S ? z1 - SW : z1], [[[x0 + INS, N ? z0 + INS : z0], [x0 + INS, z0 + INS], [x0 + INS, z1 - INS], [x0 + INS, S ? z1 - INS : z1]]]);
        if (E) strip([x1 - SW, N ? z0 + SW : z0, x1, S ? z1 - SW : z1], [[[x1 - INS, N ? z0 + INS : z0], [x1 - INS, z0 + INS], [x1 - INS, z1 - INS], [x1 - INS, S ? z1 - INS : z1]]]);
        // what's left of it: open ground (the street sides it fronts, for whatever goes on it)
        // (only inside the city's edge: past it, the farms)
        const r = [x0 + (Wd ? SW : 0), z0 + (N ? SW : 0), x1 - (E ? SW : 0), z1 - (S ? SW : 0)];
        const nearest = Math.hypot(Math.max(r[0] - c[0], 0, c[0] - r[2]), Math.max(r[1] - c[1], 0, c[1] - r[3]));
        if (r[2] - r[0] > 4 && r[3] - r[1] > 4 && nearest < this.edge - 8) lots.push({ r, cell: [i, j], front: [Wd, N, E, S] });
      }
      for (const q of J.values()) {
        const [bx0, bz0, bx1, bz1] = q.box, A = q.arms;
        if (!A.n) strip([bx0, bz0 - SW, bx1, bz0], [[[bx0, bz0 - INS], [bx1, bz0 - INS]]]);
        if (!A.s) strip([bx0, bz1, bx1, bz1 + SW], [[[bx0, bz1 + INS], [bx1, bz1 + INS]]]);
        if (!A.w) strip([bx0 - SW, bz0, bx0, bz1], [[[bx0 - INS, bz0], [bx0 - INS, bz1]]]);
        if (!A.e) strip([bx1, bz0, bx1 + SW, bz1], [[[bx1 + INS, bz0], [bx1 + INS, bz1]]]);
        // the corners where two of them meet
        if (A.n !== 1 && A.e !== 1) strip([bx1, bz0 - SW, bx1 + SW, bz0], [[[bx1, bz0 - INS], [bx1 + INS, bz0 - INS], [bx1 + INS, bz0]]]);
        if (A.n !== 1 && A.w !== 1) strip([bx0 - SW, bz0 - SW, bx0, bz0], [[[bx0, bz0 - INS], [bx0 - INS, bz0 - INS], [bx0 - INS, bz0]]]);
        if (A.s !== 1 && A.e !== 1) strip([bx1, bz1, bx1 + SW, bz1 + SW], [[[bx1, bz1 + INS], [bx1 + INS, bz1 + INS], [bx1 + INS, bz1]]]);
        if (A.s !== 1 && A.w !== 1) strip([bx0 - SW, bz1, bx0, bz1 + SW], [[[bx0, bz1 + INS], [bx0 - INS, bz1 + INS], [bx0 - INS, bz1]]]);
      }
      for (const s of strips) {
        s.kerbs = kerbsOf(s.r);
        // (which of its sides is a kerb: the street furniture goes along those)
        s.edge = [s.kerbs.some((k) => k[4] < 0), s.kerbs.some((k) => k[5] < 0), s.kerbs.some((k) => k[4] > 0), s.kerbs.some((k) => k[5] > 0)];
        // (lanes collapsed to nothing at an end, where no corner turns: drop the repeated points)
        s.lanes = s.lanes.map((l) => l.filter((p, k) => !k || Math.hypot(p[0] - l[k - 1][0], p[1] - l[k - 1][1]) > 0.05));
      }
      for (const l of lots) {
        const m = [(l.r[0] + l.r[2]) / 2, (l.r[1] + l.r[3]) / 2];
        let best = null, bk = -1e9;
        for (const d of this.districts) { const k = 1 - Math.hypot(m[0] - d.c[0], m[1] - d.c[1]) / d.r; if (k > bk) { bk = k; best = d; } }
        l.d = best.id; l.k = bk;
      }
      const streetRoads = roads.filter((q) => q.kind !== 'out');
      const onRoad = (x, z, pad) => {
        pad = pad || 0;
        for (const q of streetRoads) if (x > q.r[0] - pad && x < q.r[2] + pad && z > q.r[1] - pad && z < q.r[3] + pad) return true;
        return false;
      };
      return (this._net = { built, cell, junction, junctions: [...J.values()], roads, strips, lots, out, onRoad, nx, nz });
    },
    inside(x, z, pad) { return Math.hypot(x - this.centre[0], z - this.centre[1]) < this.fence - (pad || 0); },
  };
  M.fenceGate = M.landmark('fence_gate');
  Object.assign(M.streets.find((q) => q.z === M.lake.z), { road: M.lake.road, oneWay: M.lake.oneWay });
  void U;
  DV.CityMap = M;
})();
