/* ==========================================================================
   DIVERGENT — arms
   The Dauntless pistol, their rifle, and a throwing knife, built the way the
   vehicles are: low-poly solids with vertex colours shaded by a fixed sun,
   one mesh (one draw call) each, so they sit in the world like everything
   else instead of looking like grey boxes. +z is the muzzle (the point, for
   the knife); the origin is the hand: the grip, or the knife's handle.

     DV.Arms.pistol()   → THREE.Group, with .userData.flash (muzzle flash material)
     DV.Arms.rifle()    → THREE.Group
     DV.Arms.knife()    → THREE.Group
     DV.Arms.geometry(kind) → the shared geometry, for merging (racks)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  // (a touch lighter than the real thing: the rooms they're in are dim)
  const STEEL = [0.34, 0.35, 0.38], STEEL_HI = [0.52, 0.53, 0.56], BLUED = [0.22, 0.23, 0.26];
  const GRIP = [0.16, 0.14, 0.12], GRIP_HI = [0.26, 0.23, 0.2], TRIM = [0.1, 0.1, 0.11];
  const WOOD = [0.36, 0.22, 0.12], WOOD_DK = [0.25, 0.15, 0.08], BLADE = [0.72, 0.74, 0.77], BLADE_HI = [0.88, 0.9, 0.92];
  const SIGHT = [0.9, 0.9, 0.85];

  const BUILD = {
    // a service pistol: slide with serrations and an ejection port, sights, the frame, the
    // trigger guard and trigger, a grip with panels, the magazine's base
    pistol(M) {
      // slide (it overhangs the frame at the muzzle) and its serrations at the back
      M.box(0, 0.032, 0.035, 0.03, 0.03, 0.19, STEEL);
      M.box(0, 0.048, 0.035, 0.024, 0.004, 0.18, STEEL_HI);
      for (let k = 0; k < 5; k++) M.box(0, 0.032, -0.045 + k * 0.007, 0.032, 0.026, 0.0025, BLUED);
      M.box(0.0155, 0.036, 0.05, 0.002, 0.013, 0.04, TRIM); // ejection port
      M.box(0, 0.032, 0.131, 0.012, 0.012, 0.004, TRIM); // the muzzle
      // sights, with their dots
      M.box(0, 0.051, 0.122, 0.005, 0.007, 0.008, BLUED); M.box(0, 0.053, 0.1265, 0.002, 0.002, 0.001, SIGHT, { emit: true });
      M.box(0, 0.051, -0.054, 0.016, 0.008, 0.008, BLUED); M.box(0, 0.053, -0.0585, 0.012, 0.002, 0.001, SIGHT, { emit: true });
      // frame and dust cover under the slide
      M.box(0, 0.011, 0.03, 0.026, 0.014, 0.16, BLUED);
      // trigger guard (a ring of three bars) and the trigger
      M.box(0, -0.016, 0.03, 0.006, 0.004, 0.05, BLUED);
      M.box(0, -0.004, 0.055, 0.006, 0.026, 0.005, BLUED);
      M.box(0, 0.0, 0.026, 0.004, 0.02, 0.005, TRIM);
      // the grip, raked back, with panels and the magazine's base plate
      M.push(0, 0.006, -0.03, 0, 0.26, 0);
      M.box(0, -0.042, -0.006, 0.028, 0.085, 0.036, GRIP);
      for (const s of [-1, 1]) M.box(s * 0.0145, -0.042, -0.006, 0.002, 0.07, 0.03, GRIP_HI);
      M.box(0, -0.088, -0.006, 0.03, 0.008, 0.04, BLUED);
      M.pop();
      M.box(0, 0.042, -0.06, 0.012, 0.012, 0.012, BLUED); // hammer
    },
    // a carbine for the armoury racks and the guards on the Fence
    rifle(M) {
      M.box(0, 0.0, 0.2, 0.04, 0.07, 0.32, BLUED); // receiver
      M.box(0, 0.045, 0.22, 0.03, 0.02, 0.22, STEEL); // top rail
      for (let k = 0; k < 6; k++) M.box(0, 0.058, 0.13 + k * 0.03, 0.026, 0.006, 0.012, BLUED);
      M.box(0, 0.0, 0.54, 0.05, 0.06, 0.36, GRIP); // handguard
      for (let k = 0; k < 4; k++) M.box(0, 0.0, 0.42 + k * 0.08, 0.052, 0.05, 0.015, TRIM);
      const g = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6); g.rotateX(Math.PI / 2); g.translate(0, 0.005, 0.86); M.add(g, STEEL); // barrel
      M.box(0, 0.006, 1.0, 0.024, 0.024, 0.03, TRIM); // muzzle device
      M.box(0, 0.055, 0.68, 0.006, 0.04, 0.01, BLUED); // front sight
      M.push(0, -0.07, 0.24, 0, -0.18, 0); M.box(0, 0, 0, 0.032, 0.14, 0.05, BLUED); M.pop(); // magazine
      M.push(0, -0.06, 0.08, 0, 0.32, 0); M.box(0, 0, 0, 0.03, 0.1, 0.04, GRIP); M.pop(); // pistol grip
      M.box(0, -0.035, 0.12, 0.006, 0.006, 0.07, BLUED); // trigger guard
      M.box(0, 0.0, -0.1, 0.044, 0.08, 0.28, WOOD); // stock
      M.box(0, -0.035, -0.23, 0.046, 0.1, 0.03, WOOD_DK); // butt
      M.box(0, 0.02, -0.08, 0.046, 0.012, 0.2, WOOD_DK);
    },
    // a throwing knife: a pointed blade of diamond section, a short guard, a cord-wrapped handle
    knife(M) {
    const L = 0.17, W = 0.032, T = 0.006;
    const tri = (a, b, c, col) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
      M.add(g, col);
    };
    // the blade: a flat diamond section running to a point at +z
    const tip = [0, 0, L], b0 = [0, W / 2, 0.01], b1 = [0, -W / 2, 0.01], s0 = [T / 2, 0, 0.01], s1 = [-T / 2, 0, 0.01];
    tri(b0, s0, tip, BLADE_HI); tri(s0, b1, tip, BLADE); tri(b1, s1, tip, BLADE_HI); tri(s1, b0, tip, BLADE);
    tri(b0, s1, s0, BLADE); tri(b1, s0, s1, BLADE);
    M.box(0, 0, 0.008, 0.012, 0.05, 0.008, STEEL); // guard
    M.box(0, 0, -0.045, 0.014, 0.024, 0.09, GRIP); // handle
    for (let k = 0; k < 6; k++) M.box(0, 0, -0.082 + k * 0.014, 0.016, 0.026, 0.005, k % 2 ? [0.42, 0.12, 0.08] : GRIP_HI); // the cord wrap
    M.box(0, 0, -0.094, 0.012, 0.018, 0.008, STEEL); // pommel
    },
  };

  const geos = {};
  const mat = () => mat.m || (mat.m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  const A = {
    geometry(kind) {
      if (!geos[kind]) {
        const M = new DV.Vehicles.MB();
        BUILD[kind](M);
        geos[kind] = M.geometry();
      }
      return geos[kind];
    },
    mesh(kind) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(this.geometry(kind), mat()));
      return g;
    },
    pistol() {
      const g = this.mesh('pistol');
      // the muzzle flash: two crossed additive planes
      const fm = new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), fm);
      flash.position.set(0, 0.032, 0.2);
      g.add(flash);
      const f2 = flash.clone(); f2.rotation.y = Math.PI / 2; g.add(f2);
      g.userData.flash = fm;
      return g;
    },
    rifle() { return this.mesh('rifle'); },
    knife() { return this.mesh('knife'); },
    // light an arms mesh like the place it's in (they're vertex-coloured, unlit)
    tint(g, L) {
      g.traverse((o) => {
        if (!o.isMesh || o.material.blending === THREE.AdditiveBlending) return;
        if (o.material === mat.m) o.material = o.material.clone();
        o.material.color.setRGB(Math.min(1.3, Math.max(0.35, L[0])), Math.min(1.3, Math.max(0.35, L[1])), Math.min(1.3, Math.max(0.35, L[2])));
      });
    },
  };
  DV.Arms = A;
})();
