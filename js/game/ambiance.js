/* ==========================================================================
   DIVERGENT — the city's mood: the things that make it feel watched
   - the public address: a chime and a calm voice, every few minutes, when
     you're out of doors (curfew reminders by day; scan notices by night);
   - searchlights: after dark, slow beams sweep the cloud from the top of the
     Hub and the roof of the Order station;
   - far-off sirens at night.
   Attached by a city zone: DV.Ambiance.attach(ctx, zone, { hub: [x, z], order: [x, z] }).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const DAY = [
    'Citizens: the curfew begins at twenty-one hundred hours. Plan your journeys accordingly.',
    'Report unusual behaviour to the Order. A quiet city is a safe city.',
    'Faction before blood. Your faction is your family. Your city is your faction.',
    'The Directorate reminds you: aptitude is not destiny. Choice is.',
    'Ration collection for the Abnegation sector: Thursday, eight hundred hours, Wacker Street depot.',
    'Sector scans continue tonight in Sectors three to nine. Remain indoors after curfew.',
    'Amity harvest tonics are available at your faction dispensary. Sleep well. Work well.',
    'Lost or unattended packages must be reported. Do not touch them.',
  ];
  const NIGHT = [
    'Curfew is in effect. Return to your faction housing.',
    'Drones are scanning this sector. If approached, remain where you are.',
    'A dangerous individual remains at large. Do not travel alone. Do not open your door to strangers.',
    'Patrols are operating in this area. Carry your faction identification.',
  ];

  const A = {
    attach(ctx, zone, o) {
      o = o || {};
      const st = { paT: U.rand(40, 80), sirenT: U.rand(60, 140), k: -1, beams: [] };
      // the searchlights: long open cones, additive, drawn against the cloud
      const mat = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const geo = new THREE.CylinderGeometry(0.8, 26, 520, 14, 1, true);
      geo.translate(0, 260, 0);
      const group = new THREE.Group();
      group.name = 'searchlights';
      const add = (x, y, z, n, phase) => {
        for (let i = 0; i < n; i++) {
          const pivot = new THREE.Group();
          pivot.position.set(x, y, z);
          const m = new THREE.Mesh(geo, mat);
          m.frustumCulled = false;
          pivot.add(m);
          group.add(pivot);
          st.beams.push({ pivot, yaw: phase + (i * Math.PI * 2) / n, tilt: 0.42 + i * 0.12, speed: 0.13 + i * 0.05 });
        }
      };
      if (o.hub) add(o.hub[0], 238, o.hub[1], 3, 0.3);
      if (o.order) add(o.order[0], 15, o.order[1], 1, 2.1);
      group.visible = false;
      zone.group.add(group);
      ctx.update((dt) => this.update(dt, zone, st, group, mat));
      return st;
    },
    // 0 by day, 1 at night (dusk and dawn between)
    night() {
      const m = DV.Clock.minutes();
      if (m >= 21 * 60 || m < 5 * 60) return 1;
      if (m >= 19.5 * 60) return (m - 19.5 * 60) / 90;
      if (m < 6.5 * 60) return 1 - (m - 5 * 60) / 90;
      return 0;
    },
    outdoors(zone) {
      const P = DV.Player, r = zone.roomAt(P.x, P.z);
      return !r || r.exterior;
    },
    update(dt, zone, st, group, mat) {
      const G = DV.Game;
      if (DV.World.current !== zone) return;
      const n = this.night();
      // the beams
      const want = U.clamp(n, 0, 1);
      if (Math.abs(want - st.k) > 0.01) { st.k = want; mat.opacity = 0.075 * want; group.visible = want > 0.02; }
      if (group.visible) for (const b of st.beams) { b.yaw += b.speed * dt; b.pivot.rotation.set(b.tilt * Math.cos(b.yaw * 0.7), b.yaw, b.tilt * Math.sin(b.yaw)); }
      if (!G || G.state !== 'playing' || G.inSimulation() || (DV.Chapter && DV.Chapter.active) || DV.Dialogue.isActive()) return;
      const out = this.outdoors(zone);
      // the PA
      st.paT -= dt;
      if (st.paT <= 0) {
        st.paT = U.rand(150, 260);
        if (out) {
          const L = n > 0.5 ? NIGHT : DAY;
          const line = L[Math.floor(Math.random() * L.length)];
          DV.Audio.play('chime', { volume: 0.55 });
          setTimeout(() => DV.UI.subtitle('City PA', line, 7), 1300);
          DV.Events.emit('ambiance:pa', { line });
        }
      }
      // sirens, far off, at night
      if (n > 0.6) {
        st.sirenT -= dt;
        if (st.sirenT <= 0) { st.sirenT = U.rand(90, 210); DV.Audio.play('siren', { volume: out ? 1 : 0.4 }); }
      }
    },
    DAY, NIGHT,
  };
  DV.Ambiance = A;
})();
