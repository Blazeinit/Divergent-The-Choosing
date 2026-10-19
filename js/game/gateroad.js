/* ==========================================================================
   DIVERGENT — Lake Street outside the gate
   The stretch of Lake Street in front of the Testing Center, laid again as
   one surface: the city's own asphalt (the same texture, the same scale, so
   it runs on into the street either side without a seam), with everything on
   it painted into one texture over that: the continental crossing at the
   gate, the stop line before it, the bus bay with BUS in it, the lane
   lines, the arrows (one-way, westbound), SLOW for the crossing, the
   crossings and stop line at the junctions either end, and the wear (tyre
   polish down the lane, patched trenches, cracks, oil, two manhole covers).

   It lies a hair over the city's asphalt and is drawn pulled further toward
   you, so the two never fight for the same pixels (the old decals did: the
   crossing flickered, and from up high it was gone). The road paint the
   streets have elsewhere, and the clouds' shadows, still draw over it.

     DV.GateRoad.attach(zone, city)   (js/zones/testingCenter.js)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // the street between its two junctions, kerb to kerb (DV.CityMap.roadNet: x -8..88, z 78.8..86.4)
  const R = [-8, 78.8, 88, 86.4];
  const PX = 44; // texels a metre along the street (the texture: 4096 × 336)

  const GateRoad = {
    R,
    // the paint, the patches and the wear: an RGBA texture (alpha: how much of it covers the asphalt)
    texture() {
      const W = Math.round((R[2] - R[0]) * PX), H = Math.round((R[3] - R[1]) * PX);
      const c = document.createElement('canvas'); c.width = 4096; c.height = 336;
      const g = c.getContext('2d');
      g.scale(c.width / W, c.height / H);
      const r = U.rng('gateroad');
      // world (x, z) → canvas px
      const X = (x) => (x - R[0]) * PX, Z = (z) => (z - R[1]) * PX;
      const rect = (x0, z0, x1, z1, col) => { g.fillStyle = col; g.fillRect(X(x0), Z(z0), (x1 - x0) * PX, (z1 - z0) * PX); };
      const WHITE = 'rgba(214,214,204,0.93)', YELLOW = 'rgba(206,158,46,0.92)';

      /* -- the road itself: patches, polish, cracks, oil (under the paint) -- */
      // trench patches: darker, squarer, newer asphalt where a pipe went in
      for (const [x0, z0, x1, z1] of [[2, 78.8, 9.5, 82.7], [29, 83.4, 35, 86.4], [60, 78.8, 71, 80.6], [-6, 82.2, 88, 82.9]]) {
        rect(x0, z0, x1, z1, 'rgba(18,18,20,0.32)');
        g.strokeStyle = 'rgba(10,10,12,0.5)'; g.lineWidth = 3; g.strokeRect(X(x0), Z(z0), (x1 - x0) * PX, (z1 - z0) * PX);
      }
      // the tyres' tracks down the driving lane: polished darker
      for (const zc of [81.95, 83.35]) {
        const gr = g.createLinearGradient(0, Z(zc - 0.45), 0, Z(zc + 0.45));
        gr.addColorStop(0, 'rgba(12,12,14,0)'); gr.addColorStop(0.5, 'rgba(12,12,14,0.26)'); gr.addColorStop(1, 'rgba(12,12,14,0)');
        g.fillStyle = gr; g.fillRect(0, Z(zc - 0.45), X(R[2]), 0.9 * PX);
      }
      // oil, where cars wait at the stop lines and in the bus bay
      for (const [x, z, n] of [[43.6, 82.6, 4], [-3, 82.7, 5], [51, 80.1, 6], [20, 79.9, 2], [27, 85.5, 2]]) {
        for (let i = 0; i < n; i++) {
          const ox = x + (r() - 0.5) * 2.2, oz = z + (r() - 0.5) * 0.9, rr = (0.15 + r() * 0.35) * PX;
          const gr = g.createRadialGradient(X(ox), Z(oz), 1, X(ox), Z(oz), rr);
          gr.addColorStop(0, 'rgba(6,6,8,0.55)'); gr.addColorStop(1, 'rgba(6,6,8,0)');
          g.fillStyle = gr; g.beginPath(); g.ellipse(X(ox), Z(oz), rr * 1.5, rr, 0, 0, 6.283); g.fill();
        }
      }
      // cracks: wandering lines, branching
      g.lineCap = 'round';
      const crack = (x, z, len, a) => {
        g.strokeStyle = 'rgba(8,8,9,' + (0.45 + r() * 0.3) + ')'; g.lineWidth = 1.2 + r() * 1.6;
        g.beginPath(); g.moveTo(X(x), Z(z));
        for (let s = 0; s < len; s += 0.25) {
          a += (r() - 0.5) * 0.9; x += Math.cos(a) * 0.25; z += Math.sin(a) * 0.25;
          if (z < R[1] + 0.1 || z > R[3] - 0.1) break;
          g.lineTo(X(x), Z(z));
          if (r() < 0.04) { g.stroke(); crack(x, z, len * 0.4 * r(), a + (r() < 0.5 ? 1 : -1)); g.beginPath(); g.moveTo(X(x), Z(z)); }
        }
        g.stroke();
      };
      for (let i = 0; i < 26; i++) crack(R[0] + r() * (R[2] - R[0]), R[1] + 0.3 + r() * (R[3] - R[1] - 0.6), 1.5 + r() * 5, r() * 6.283);
      // along the kerbs: grit and dead leaves gathered in the gutter
      for (const z of [R[1], R[3] - 0.35]) {
        const gr = g.createLinearGradient(0, Z(z), 0, Z(z + 0.35));
        const k = z === R[1] ? [0.4, 0] : [0, 0.4];
        gr.addColorStop(0, 'rgba(58,52,44,' + k[0] + ')'); gr.addColorStop(1, 'rgba(58,52,44,' + k[1] + ')');
        g.fillStyle = gr; g.fillRect(0, Z(z), X(R[2]), 0.35 * PX);
      }

      /* -- the paint -- */
      // the crossing at the gate: continental bars, along the traffic, across the road
      for (let t = R[1] + 0.5; t + 0.5 <= R[3] - 0.35; t += 1.05) rect(38.15, t, 41.85, t + 0.55, WHITE);
      // the stop line before it (the traffic comes from the east), and SLOW painted up the lane ahead of that
      rect(43.0, 81.3, 43.45, R[3] - 0.25, WHITE);
      this.words(g, 'SLOW', X(49.5), Z(82.62), 2.2 * PX, 2.6 * PX);
      // the bus bay at the kerb outside the gate: a yellow box, dashed, BUS STOP in it
      g.strokeStyle = YELLOW; g.lineWidth = 0.14 * PX; g.setLineDash([0.9 * PX, 0.6 * PX]);
      g.strokeRect(X(44.1), Z(R[1] + 0.12), (58.6 - 44.1) * PX, (81.2 - R[1] - 0.12) * PX);
      g.setLineDash([]);
      this.words(g, 'BUS', X(51.3), Z(80.05), 1.8 * PX, 2.0 * PX, YELLOW);
      // the parking lanes' edges, both kerbs (dashed; not across the crossing or the bus bay)
      const dashed = (x0, x1, z) => { for (let x = x0; x < x1 - 0.3; x += 4.6) rect(x, z - 0.06, Math.min(x1, x + 2.6), z + 0.06, WHITE); };
      dashed(-3.0, 37.6, 81.25); dashed(59.2, 84.0, 81.25);
      dashed(-3.0, 37.6, 84.0); dashed(42.4, 84.0, 84.0);
      // the arrows down the lane: one way, west
      for (const x of [22, 66]) this.arrow(g, X(x), Z(82.62), PX, WHITE);
      // the junctions either end: their crossings (the city's style), and the stop line before the west one
      for (const [c0, c1] of [[-8, -4.8], [84.8, 88]]) for (let t = R[1] + 0.5; t + 0.5 <= R[3] - 0.35; t += 1.05) rect(c0 + 0.15, t, c1 - 0.15, t + 0.55, WHITE);
      rect(-3.8, R[1] + 0.25, -3.35, R[3] - 0.25, WHITE);
      // manhole covers (round, ribbed, darker)
      for (const [x, z] of [[29.5, 82.1], [61, 84.4]]) {
        g.fillStyle = 'rgba(22,22,24,0.95)'; g.beginPath(); g.arc(X(x), Z(z), 0.43 * PX, 0, 6.283); g.fill();
        g.strokeStyle = 'rgba(70,68,64,0.9)'; g.lineWidth = 2; g.beginPath(); g.arc(X(x), Z(z), 0.4 * PX, 0, 6.283); g.stroke();
        for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(X(x - 0.3), Z(z + k * 0.09)); g.lineTo(X(x + 0.3), Z(z + k * 0.09)); g.stroke(); }
      }

      /* -- the paint's wear: flaked off where the tyres run -- */
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 2600; i++) {
        const x = R[0] + r() * (R[2] - R[0]), z = R[1] + r() * (R[3] - R[1]);
        const lane = Math.min(Math.abs(z - 81.95), Math.abs(z - 83.35)) < 0.5 ? 1 : 0.35;
        if (r() > lane) continue;
        g.fillStyle = 'rgba(0,0,0,' + (0.3 + r() * 0.5) + ')';
        g.beginPath(); g.arc(X(x), Z(z), (0.03 + r() * 0.1) * PX, 0, 6.283); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      return tex;
    },
    // letters painted on the road, to read from a driver's seat coming west: the word runs across the
    // lane (from the driver's left, +z, to the right), each letter drawn out long down it
    words(g, text, cx, cz, across, along, col) {
      g.save();
      g.translate(cx, cz);
      g.rotate(-Math.PI / 2);
      g.fillStyle = col || 'rgba(214,214,204,0.93)';
      g.font = 'bold 100px Arial, Helvetica, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const m = g.measureText(text).width;
      g.scale(across / m, along / 100);
      g.fillText(text, 0, 0);
      g.restore();
    },
    // a straight-ahead arrow pointing west (-x), PX a metre
    arrow(g, x, z, px, col) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x - 2.6 * px, z);
      g.lineTo(x - 1.2 * px, z - 0.55 * px); g.lineTo(x - 1.2 * px, z - 0.16 * px);
      g.lineTo(x + 2.4 * px, z - 0.16 * px); g.lineTo(x + 2.4 * px, z + 0.16 * px);
      g.lineTo(x - 1.2 * px, z + 0.16 * px); g.lineTo(x - 1.2 * px, z + 0.55 * px);
      g.closePath(); g.fill();
    },

    attach(zone, city) {
      const base = DV.Mat.get('asphalt'), wa = (base.map && base.map.userData.world) || 1;
      const L = (city.walk && city.walk.light) || zone.lighting.sample(-60, 0.5, -60, 0, 1, 0, null, true);
      const k = 0.82, col = [L[0] * k, L[1] * k, L[2] * k];
      // the surface: a strip of quads (so the fog and the vertex light don't stretch over 96 m)
      const pos = [], uv = [], puv = [], cols = [], idx = [];
      const Y = 0.008, STEP = 8;
      for (let x = R[0]; x < R[2] - 1e-6; x += STEP) {
        const x1 = Math.min(R[2], x + STEP), n = pos.length / 3;
        for (const [px, pz] of [[x, R[1]], [x1, R[1]], [x1, R[3]], [x, R[3]]]) {
          pos.push(px, Y, pz);
          uv.push(px / wa, -pz / wa); // (the city's asphalt: the same tiling, in world metres)
          puv.push((px - R[0]) / (R[2] - R[0]), 1 - (pz - R[1]) / (R[3] - R[1]));
          cols.push(col[0], col[1], col[2]);
        }
        idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setAttribute('puv', new THREE.Float32BufferAttribute(puv, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
      geo.setIndex(idx);
      geo.computeBoundingSphere();
      const paint = this.texture();
      const mat = new THREE.MeshBasicMaterial({ map: base.map, vertexColors: true, fog: true,
        // (over the city's asphalt, which is pulled toward you by -0.5/-1: pulled harder, and a hair higher)
        polygonOffset: true, polygonOffsetFactor: -1.2, polygonOffsetUnits: -2.5 });
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.paintMap = { value: paint };
        sh.vertexShader = 'attribute vec2 puv;\nvarying vec2 vPuv;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvPuv = puv;');
        sh.fragmentShader = 'uniform sampler2D paintMap;\nvarying vec2 vPuv;\n' + sh.fragmentShader.replace('#include <map_fragment>', [
          '#include <map_fragment>',
          'vec4 pnt = texture2D(paintMap, vPuv);',
          // (the paint and the grime over the asphalt; the paint a little brighter than the vertex light lets it be)
          'diffuseColor.rgb = mix(diffuseColor.rgb, diffuse * pnt.rgb / max(vColor.rgb, vec3(0.35)), pnt.a);',
        ].join('\n'));
      };
      mat.customProgramCacheKey = () => 'gateroad';
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = 'gate_road';
      mesh.renderOrder = 0;
      zone.group.add(mesh);
      // the hour darkens it with the rest of the streets (js/engine/world.js timeOfDay)
      if (city.walk && city.walk.mats) city.walk.mats.push(mat);
      return mesh;
    },
  };
  DV.GateRoad = GateRoad;
})();
