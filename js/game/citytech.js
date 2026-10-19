/* =============================================================================
   The city's machinery: Erudite's eyes and voice, and the power to run them.

   The city in the films is old brick and new steel. The steel is Erudite's:
   - surveillance pylons on the corners: a slim mast, a camera head, a red lamp
     that blinks in time all over the city, and cables slung pole to pole;
   - the screens: great panels on the building fronts over the main streets,
     cycling the city's notices (the factions, the curfew, the census, the
     Choosing) in Erudite blue, brighter after dark;
   - the turbines along the top of the Fence, turning in the wind off the
     plain, and the masts between them.
   All of it built once into a few meshes: a handful of draw calls.

     DV.CityTech.attach(zone, city)   (js/zones/testingCenter.js)
============================================================================= */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // the notices: one row of the screens' atlas each
  const SLIDES = [
    ['FACTION BEFORE BLOOD', 'FIVE FACTIONS · ONE CITY'],
    ['CURFEW 21:00', 'THE STREETS CLOSE AT NINE · CARRY YOUR CARD'],
    ['THE CENSUS CONTINUES', 'REPORT WHAT DOES NOT FIT'],
    ['THE CHOOSING', 'YOUR FUTURE IS BEFORE YOU · CHOOSE WISELY'],
    ['KNOWLEDGE IS PEACE', 'ERUDITE HEADQUARTERS · WELLS ST'],
    ['THE FENCE PROTECTS US', 'WHAT IS OUTSIDE STAYS OUTSIDE'],
  ];
  function screenTexture() {
    const W = 512, H = 64 * SLIDES.length, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    SLIDES.forEach(([a, b], k) => {
      const y = k * 64;
      const g = c.createLinearGradient(0, y, 0, y + 64); g.addColorStop(0, '#0d2236'); g.addColorStop(1, '#06121e');
      c.fillStyle = g; c.fillRect(0, y, W, 64);
      c.fillStyle = 'rgba(80,160,220,0.18)'; for (let s = y; s < y + 64; s += 3) c.fillRect(0, s, W, 1); // (the scan lines)
      c.strokeStyle = '#3d8fd0'; c.lineWidth = 2; c.strokeRect(4, y + 4, W - 8, 56);
      // the Erudite eye
      c.strokeStyle = '#8fd0ff'; c.lineWidth = 3; c.beginPath(); c.ellipse(36, y + 32, 20, 12, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#8fd0ff'; c.beginPath(); c.arc(36, y + 32, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e8f4ff'; c.font = 'bold 26px "Arial Narrow", Arial, sans-serif'; c.textBaseline = 'middle';
      c.fillText(a, 70, y + 24);
      c.fillStyle = '#7fb6dc'; c.font = '14px "Arial Narrow", Arial, sans-serif';
      c.fillText(b, 71, y + 47);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  const Tech = {
    attach(zone, city) {
      const out = { t: 0 };
      const CM = DV.CityMap, net = CM.roadNet(), roads = net.roads.filter((q) => q.kind !== 'out').map((q) => q.r);
      const inRoad = (x, z, m) => roads.some((q) => x > q[0] - m && x < q[2] + m && z > q[1] - m && z < q[3] + m);
      const kit = zone.streetKit;
      // (and off the lines people walk along the pavements: js/game/streetlife.js, js/game/lives.js)
      const W = zone.streetLife && zone.streetLife.walk;
      const onWalk = (x, z, r) => W && W.edgesNear(x, z, r + 2).some((ei) => {
        const e = W.edges[ei], A = W.nodes[e.a], B = W.nodes[e.b], len = e.len || Math.hypot(B.x - A.x, B.z - A.z) || 1;
        const t = U.clamp(((x - A.x) * (B.x - A.x) + (z - A.z) * (B.z - A.z)) / (len * len), 0, 1);
        return Math.hypot(A.x + (B.x - A.x) * t - x, A.z + (B.z - A.z) * t - z) < r;
      });
      const free = (x, z, r) => !inRoad(x, z, 0.6) && !zone.colliders.blocked(x, z, r, 'npc') && !(kit && kit.blocked && kit.blocked(x, z, r + 0.4)) && city.walkable(x, z) && !onWalk(x, z, r + 0.75);
      const M = new DV.Vehicles.MB(), LED = new DV.Vehicles.MB();
      const steel = [0.26, 0.28, 0.3], band = [0.18, 0.36, 0.56], head = [0.16, 0.17, 0.18];
      // the pylons: one corner of every other junction (a hash picks which), clear of everything
      const poles = [];
      let k = 0;
      for (const q of net.roads) {
        if (q.kind !== 'junction') continue;
        const b = q.r, cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2;
        if (Math.hypot(cx - CM.centre[0], cz - CM.centre[1]) > CM.edge - 20) continue;
        k++;
        const corners = [];
        for (const o of [1.7, 2.6, 3.5]) corners.push([b[0] - o, b[1] - o], [b[2] + o, b[1] - o], [b[0] - o, b[3] + o], [b[2] + o, b[3] + o]);
        const start = k % 4;
        for (let i = 0; i < corners.length; i++) {
          const [x, z] = corners[(start + i) % corners.length];
          if (!free(x, z, 0.35)) continue;
          poles.push([x, z]);
          const g = new THREE.CylinderGeometry(0.09, 0.16, 9.2, 6); g.translate(x, 4.6, z); M.add(g, steel);
          M.box(x, 3.2, z, 0.36, 0.5, 0.36, band); M.box(x, 3.2, z, 0.38, 0.06, 0.38, [0.5, 0.75, 0.95], { emit: true });
          // the head: an arm, a camera box with its lens, looking down the street
          const ang = Math.atan2(cx - x, cz - z), fx = Math.sin(ang), fz = Math.cos(ang);
          M.box(x + fx * 0.45, 9.0, z + fz * 0.45, 0.12 + Math.abs(fz) * 0.8, 0.1, 0.12 + Math.abs(fx) * 0.8, steel);
          M.box(x + fx * 0.85, 8.85, z + fz * 0.85, 0.34, 0.3, 0.34, head);
          M.box(x + fx * 1.03, 8.85, z + fz * 1.03, 0.16, 0.16, 0.16, [0.05, 0.06, 0.08]);
          LED.box(x + fx * 0.85, 9.05, z + fz * 0.85, 0.09, 0.09, 0.09, [1, 0.12, 0.08], { emit: true });
          zone.colliders.add(x - 0.18, z - 0.18, x + 0.18, z + 0.18, { y1: 9, tag: 'city', camera: false });
          break;
        }
      }
      // the cables: pole to the nearest pole along a street, sagging, one line mesh for the lot
      const lines = [];
      for (const p of poles) {
        let best = null, bd = 1e9;
        for (const q of poles) { if (q === p) continue; const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd && d > 30 && d < 140 && (Math.abs(q[0] - p[0]) < 3 || Math.abs(q[1] - p[1]) < 3)) { bd = d; best = q; } }
        if (!best) continue;
        const n = 10;
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n, sag = (t) => 8.4 - Math.sin(t * Math.PI) * Math.min(3, bd * 0.035);
          lines.push(p[0] + (best[0] - p[0]) * t0, sag(t0), p[1] + (best[1] - p[1]) * t0, p[0] + (best[0] - p[0]) * t1, sag(t1), p[1] + (best[1] - p[1]) * t1);
        }
      }
      const group = new THREE.Group(); group.name = 'citytech'; zone.group.add(group);
      const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
      const ledMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
      const lm = new THREE.Mesh(LED.geometry(), ledMat); lm.name = 'pylon_leds'; group.add(lm);
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
      const cables = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x141414, fog: true })); cables.name = 'cables'; group.add(cables);
      if (city.walk && city.walk.mats) city.walk.mats.push(mat);
      out.ledMat = ledMat; out.poles = poles;

      // the screens: on the street faces of the tallest buildings along the main lines, high up
      const sol = (city.walk && city.walk.solids) || [];
      const tex = screenTexture(), rows = SLIDES.length;
      const pos = [], uv = [], slot = [];
      const picked = [];
      const cand = sol.filter((q) => q[4] > 16 && q[2] - q[0] > 12 && q[3] - q[1] > 12 && Math.hypot((q[0] + q[2]) / 2 - CM.centre[0], (q[1] + q[3]) / 2 - CM.centre[1]) < CM.edge - 40 && q[2] < CM.marshX - 20);
      cand.sort((a, b) => b[4] - a[4]);
      for (const q of cand) {
        if (picked.length >= 22) break;
        const mx = (q[0] + q[2]) / 2, mz = (q[1] + q[3]) / 2;
        if (picked.some((p) => Math.hypot(p[0] - mx, p[1] - mz) < 90)) continue;
        // the face onto the nearest road
        const faces = [[q[0] - 0.12, mz, -1, 0], [q[2] + 0.12, mz, 1, 0], [mx, q[1] - 0.12, 0, -1], [mx, q[3] + 0.12, 0, 1]];
        const f = faces.find(([x, z, nx, nz]) => inRoad(x + nx * 8, z + nz * 8, 0));
        if (!f) continue;
        picked.push([mx, mz]);
        const [x, z, nx, nz] = f, w = 18, h = 4.6, y = Math.min(q[4] - 3, 12 + (picked.length % 3) * 2.5), tx = -nz, tz = nx;
        const row = picked.length % rows;
        const A = [x - tx * w / 2, y, z - tz * w / 2], B = [x + tx * w / 2, y, z + tz * w / 2], C = [B[0], y + h, B[2]], D = [A[0], y + h, A[2]];
        const flip = nx + nz < 0 ? 0 : 1; // (wind it to face out)
        const tri = flip ? [A, B, C, A, C, D] : [A, C, B, A, D, C];
        const tuv = flip ? [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]] : [[1, 0], [0, 1], [0, 0], [1, 0], [1, 1], [0, 1]];
        for (let i = 0; i < 6; i++) { pos.push(...tri[i]); uv.push(tuv[i][0], tuv[i][1]); slot.push(row); }
        // a steel frame round it, and the brackets
        M.box(x + nx * 0.1, y - 0.2, z + nz * 0.1, Math.abs(tz) * (w + 0.6) + Math.abs(tx) * 0.3, 0.3, Math.abs(tx) * (w + 0.6) + Math.abs(tz) * 0.3, steel);
      }
      if (pos.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setAttribute('slot', new THREE.Float32BufferAttribute(slot, 1));
        const sm = new THREE.ShaderMaterial({
          uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: tex }, time: { value: 0 }, rows: { value: rows }, bright: { value: 1 } }]),
          vertexShader: 'attribute float slot; varying vec2 vUv; varying float vSlot;\n#include <fog_pars_vertex>\nvoid main() { vUv = uv; vSlot = slot; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
          fragmentShader: 'uniform sampler2D map; uniform float time; uniform float rows; uniform float bright; varying vec2 vUv; varying float vSlot;\n#include <fog_pars_fragment>\nvoid main() {\n  float k = mod(floor(time / 7.0) + vSlot, rows);\n  vec2 uv = vec2(vUv.x, (rows - 1.0 - k + vUv.y) / rows);\n  vec3 c = texture2D(map, uv).rgb * bright;\n  c *= 0.9 + 0.1 * sin(time * 40.0 + vUv.y * 300.0);\n  gl_FragColor = vec4(c, 1.0);\n#include <fog_fragment>\n}',
          fog: true, side: THREE.DoubleSide,
        });
        sm.uniforms.map.value = tex;
        const screens = new THREE.Mesh(g, sm); screens.name = 'screens'; group.add(screens);
        out.screenMat = sm;
      }
      const pm = new THREE.Mesh(M.geometry(), mat); pm.name = 'pylons'; group.add(pm); // (the pylons and the screens' frames)
      // the turbines on the Fence: masts on the walkway, three blades each, turning (one instanced mesh)
      const c = CM.centre, WR = CM.wall.inner + 2, top = CM.wall.top || 34.5, n = 64;
      const TM = new DV.Vehicles.MB();
      const rotorGeo = (() => { const R2 = new DV.Vehicles.MB(); for (let b = 0; b < 3; b++) { const g = new THREE.BoxGeometry(0.5, 7.5, 0.12); g.translate(0, 3.9, 0); g.rotateZ((b / 3) * Math.PI * 2); R2.add(g, [0.78, 0.78, 0.76]); } const g = new THREE.CylinderGeometry(0.45, 0.45, 0.7, 8); g.rotateX(Math.PI / 2); R2.add(g, [0.5, 0.5, 0.5]); return R2.geometry(); })();
      const rotors = new THREE.InstancedMesh(rotorGeo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }), n);
      const towers = CM.towerAngles();
      const hubs = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        if (towers.some((t) => Math.abs(Math.atan2(Math.sin(a - t), Math.cos(a - t))) < 0.03)) continue;
        const x = c[0] + Math.cos(a) * WR, z = c[1] + Math.sin(a) * WR;
        const g = new THREE.CylinderGeometry(0.35, 0.6, 14, 6); g.translate(x, top + 7, z); TM.add(g, [0.62, 0.62, 0.6]);
        TM.box(x, top + 14.2, z, 1.2, 1.0, 2.2, [0.58, 0.58, 0.56]);
        TM.box(x, top + 14.9, z, 0.2, 0.2, 0.2, [1, 0.15, 0.1], { emit: true });
        hubs.push([x, top + 14.2, z, a]);
      }
      const tm = new THREE.Mesh(TM.geometry(), mat); tm.name = 'turbine_masts'; group.add(tm);
      rotors.count = hubs.length; rotors.name = 'turbine_rotors'; rotors.frustumCulled = false; group.add(rotors);
      out.rotors = rotors; out.hubs = hubs;
      out.dummy = new THREE.Object3D();
      out.update = (dt) => {
        out.t += dt;
        // (indoors, none of it: the Testing Center's lobby is the busiest view in the game)
        const cam = DV.Game && DV.Game.camera, room = cam && zone.roomAt(cam.position.x, cam.position.z);
        group.visible = !(room && !room.exterior);
        if (!group.visible) return;
        const t = out.t;
        // every eye in the city blinks together
        const on = (t % 1.6) < 0.18;
        ledMat.color.setScalar(on ? 1.6 : 0.25);
        if (out.screenMat) {
          out.screenMat.uniforms.time.value = t;
          const lit = DV.World.tod ? DV.World.tod.lit : 0.1;
          out.screenMat.uniforms.bright.value = 0.85 + lit * 0.6;
        }
        // the turbines: facing in off the plain, turning (only redrawn every other frame: they're far)
        out.flip = !out.flip;
        if (out.flip) {
          const d = out.dummy;
          hubs.forEach(([x, y, z, a], i) => { d.position.set(x - Math.cos(a) * 1.3, y, z - Math.sin(a) * 1.3); d.rotation.set(0, -a + Math.PI / 2, t * 1.4 + i * 0.7); d.updateMatrix(); rotors.setMatrixAt(i, d.matrix); });
          rotors.instanceMatrix.needsUpdate = true;
        }
      };
      zone.citytech = out;
      return out;
    },
  };
  DV.CityTech = Tech;
})();
