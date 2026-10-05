/* ==========================================================================
   DIVERGENT — life on the farms
   The farms (js/engine/farms.js) lay out where the beasts and the people at
   work go; this brings them to life near you:

     cows, goats and sheep grazing their pastures, hens round the coops: one
     instanced mesh a kind, each beast wandering about in its field, head down
     to eat now and then, lifting it to look at you when you come near
     Amity in the fields by day (hoeing, picking, carrying a basket), grey
     Abnegation in the allotments, a word for you when you talk to them (E)

   Everything is made when you come within reach of it and let go after, so a
   farmland's worth of beasts and people costs a few dozen of each at a time.

     DV.FarmLife.attach(zone, kit, life)   (js/zones/testingCenter.js)
     fl.update(dt)   fl.info()   fl.barkSources()   fl.bodies(x, z, r)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const BEAST_NEAR = 120, BEAST_FAR = 150, MAX_BEASTS = 90, WORK_NEAR = 70, WORK_FAR = 95, MAX_WORKERS = 10;
  const hour = () => DV.Clock.minutes() / 60;

  /* ---------------- the beasts: low-poly, vertex-coloured, one instanced mesh a kind ---------------- */
  const BEASTS = {
    cow: { s: 1, speed: 0.5, build(M) {
      const hide = [0.92, 0.9, 0.86], patch = [0.18, 0.15, 0.13], pink = [0.85, 0.6, 0.58];
      M.box(0, 1.0, 0, 0.8, 0.75, 1.9, hide);
      M.box(0.2, 1.1, -0.2, 0.42, 0.5, 0.7, patch); M.box(-0.25, 1.15, 0.45, 0.4, 0.45, 0.5, patch);
      for (const [x, z] of [[-0.28, -0.7], [0.28, -0.7], [-0.28, 0.7], [0.28, 0.7]]) M.box(x, 0.38, z, 0.17, 0.76, 0.17, hide);
      M.box(0, 1.3, 1.15, 0.45, 0.45, 0.5, hide); M.box(0, 1.2, 1.45, 0.3, 0.26, 0.2, pink);
      M.box(-0.18, 1.58, 1.1, 0.07, 0.07, 0.07, [0.8, 0.78, 0.7]); M.box(0.18, 1.58, 1.1, 0.07, 0.07, 0.07, [0.8, 0.78, 0.7]);
      M.box(0, 0.9, -1.0, 0.07, 0.6, 0.07, hide);
    } },
    sheep: { s: 1, speed: 0.4, build(M) {
      const wool = [0.9, 0.88, 0.82], face = [0.2, 0.18, 0.16];
      M.box(0, 0.62, 0, 0.55, 0.5, 0.85, wool); M.box(0, 0.72, 0, 0.6, 0.35, 0.7, wool);
      for (const [x, z] of [[-0.17, -0.3], [0.17, -0.3], [-0.17, 0.3], [0.17, 0.3]]) M.box(x, 0.2, z, 0.08, 0.4, 0.08, face);
      M.box(0, 0.78, 0.5, 0.2, 0.22, 0.28, face);
    } },
    goat: { s: 1, speed: 0.55, build(M) {
      const hide = [0.62, 0.52, 0.4], light = [0.82, 0.76, 0.66];
      M.box(0, 0.68, 0, 0.4, 0.4, 0.85, hide); M.box(0, 0.72, 0.1, 0.42, 0.2, 0.4, light);
      for (const [x, z] of [[-0.13, -0.3], [0.13, -0.3], [-0.13, 0.3], [0.13, 0.3]]) M.box(x, 0.24, z, 0.07, 0.48, 0.07, hide);
      M.box(0, 0.95, 0.5, 0.17, 0.26, 0.3, light);
      M.box(-0.06, 1.16, 0.45, 0.04, 0.2, 0.04, [0.3, 0.26, 0.2]); M.box(0.06, 1.16, 0.45, 0.04, 0.2, 0.04, [0.3, 0.26, 0.2]);
    } },
    chicken: { s: 1, speed: 0.6, build(M) {
      const brown = [0.62, 0.34, 0.16], cream = [0.9, 0.84, 0.7], red = [0.8, 0.16, 0.1];
      M.box(0, 0.22, 0, 0.2, 0.2, 0.3, brown); M.box(0, 0.36, 0.14, 0.12, 0.2, 0.1, cream);
      M.box(0, 0.5, 0.17, 0.08, 0.1, 0.1, cream); M.box(0, 0.58, 0.17, 0.03, 0.05, 0.05, red); M.box(0, 0.5, 0.24, 0.03, 0.03, 0.05, [0.9, 0.7, 0.2]);
      M.box(0, 0.3, -0.2, 0.05, 0.2, 0.12, [0.3, 0.2, 0.12]);
      M.box(-0.04, 0.06, 0, 0.02, 0.12, 0.02, [0.9, 0.7, 0.2]); M.box(0.04, 0.06, 0, 0.02, 0.12, 0.02, [0.9, 0.7, 0.2]);
    } },
  };
  const geoOf = {};
  function geo(kind) {
    if (!geoOf[kind]) {
      const M = new DV.Vehicles.MB();
      BEASTS[kind].build(M);
      geoOf[kind] = M.geometry();
    }
    return geoOf[kind];
  }

  const LINES = {
    amity: ['Mind the rows, would you?', 'Lovely day for it.', 'We\'ll have this in before the weather turns.', 'Take an apple from the basket. Go on.', 'The city eats what we grow. They never ask how.', 'Peace be with you.'],
    abnegation: ['These go to the kitchen on Fulton Street.', 'There\'s always more weeding.', 'Is there something you need?', 'Whatever\'s left over goes to the factionless. We take only what we need.'],
    factionless: ['Don\'t tell anyone I\'m picking here.', 'There\'s plenty. They won\'t miss it.', '...'],
  };

  class FarmLife {
    constructor(zone, kit, life) {
      this.zone = zone; this.kit = kit; this.life = life;
      this.r = U.rng(3131);
      this.herds = kit.animals.map((a, i) => Object.assign({ id: i, live: null }, a));
      this.spots = kit.spots.map((q, i) => Object.assign({ id: i, live: null }, q));
      this.workers = [];
      this.pool = [];
      this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
      this.meshes = {};
      for (const k in BEASTS) {
        const m = new THREE.InstancedMesh(geo(k), this.mat, MAX_BEASTS);
        m.count = 0; m.frustumCulled = false; m.name = 'farm_beasts_' + k;
        zone.group.add(m);
        this.meshes[k] = m;
      }
      this.beasts = []; // { kind, x, z, rot, tx, tz, wait, eat, herd }
      this.M4 = new THREE.Matrix4(); this.Q = new THREE.Quaternion(); this.E = new THREE.Euler(); this.V = new THREE.Vector3(); this.S = new THREE.Vector3();
      this.t = 0;
    }

    /* ---- the beasts ---- */
    wake(h, px, pz) {
      if (this.beasts.length + h.n > MAX_BEASTS) return;
      h.live = [];
      const [x0, z0, x1, z1] = h.rect;
      for (let k = 0; k < h.n; k++) {
        const b = { kind: h.kind, x: x0 + this.r() * (x1 - x0), z: z0 + this.r() * (z1 - z0), rot: this.r() * 6.28, tx: 0, tz: 0, wait: this.r() * 5, eat: 0, herd: h, sc: 0.9 + this.r() * 0.2, ph: this.r() * 6 };
        b.tx = b.x; b.tz = b.z;
        this.beasts.push(b); h.live.push(b);
      }
      void px; void pz;
    }
    sleepHerd(h) {
      this.beasts = this.beasts.filter((b) => b.herd !== h);
      h.live = null;
    }
    updateBeasts(dt, px, pz) {
      for (const h of this.herds) {
        const cx = (h.rect[0] + h.rect[2]) / 2, cz = (h.rect[1] + h.rect[3]) / 2, d = Math.hypot(cx - px, cz - pz);
        if (!h.live && d < BEAST_NEAR) this.wake(h, px, pz);
        else if (h.live && d > BEAST_FAR) this.sleepHerd(h);
      }
      const counts = {};
      for (const b of this.beasts) {
        const [x0, z0, x1, z1] = b.herd.rect, sp = BEASTS[b.kind].speed;
        const dp = Math.hypot(b.x - px, b.z - pz);
        const scared = dp < 5;
        if (b.wait > 0) { b.wait -= dt; b.eat = Math.max(0, b.eat - dt); }
        else {
          const dx = b.tx - b.x, dz = b.tz - b.z, dd = Math.hypot(dx, dz);
          if (dd < 0.3) {
            // grazing here a while, then somewhere else in the field
            b.wait = 3 + this.r() * 9; b.eat = b.wait * 0.8;
            b.tx = U.clamp(b.x + (this.r() - 0.5) * 14, x0, x1); b.tz = U.clamp(b.z + (this.r() - 0.5) * 14, z0, z1);
          } else {
            const s = Math.min(dd, sp * (scared ? 2.4 : 1) * dt);
            b.x += (dx / dd) * s; b.z += (dz / dd) * s;
            b.rot = U.dampAngle(b.rot, Math.atan2(dx, dz), 3, dt);
          }
        }
        if (scared) { b.tx = U.clamp(b.x + (b.x - px) * 2, x0, x1); b.tz = U.clamp(b.z + (b.z - pz) * 2, z0, z1); b.wait = 0; }
        counts[b.kind] = (counts[b.kind] || 0) + 1;
      }
      // the matrices
      const idx = {}, M4 = this.M4, Q = this.Q, E = this.E, V = this.V, S = this.S;
      this.t += dt;
      for (const b of this.beasts) {
        const m = this.meshes[b.kind], i = idx[b.kind] = (idx[b.kind] || 0);
        if (i >= MAX_BEASTS) continue;
        idx[b.kind]++;
        const walking = b.wait <= 0, bob = walking ? Math.abs(Math.sin(this.t * 5 + b.ph)) * 0.04 : 0;
        // (head down while it eats: the whole body tips a little forward)
        E.set(b.eat > 0 ? 0.16 : walking ? Math.sin(this.t * 5 + b.ph) * 0.03 : 0, b.rot, 0, 'YXZ');
        Q.setFromEuler(E);
        M4.compose(V.set(b.x, bob, b.z), Q, S.set(b.sc, b.sc, b.sc));
        m.setMatrixAt(i, M4);
      }
      for (const k in this.meshes) {
        const m = this.meshes[k];
        m.count = idx[k] || 0;
        m.visible = m.count > 0 && !this.kit.hidden;
        if (m.count) m.instanceMatrix.needsUpdate = true;
      }
    }

    /* ---- the people at work ---- */
    model(f) {
      let m = this.pool.find((q) => !q.busy && q.f === f);
      if (!m) {
        if (this.pool.length >= MAX_WORKERS + 4) { const spare = this.pool.findIndex((q) => !q.busy); if (spare >= 0) { const old = this.pool.splice(spare, 1)[0]; if (old.model.root.parent) old.model.root.parent.remove(old.model.root); old.model.dispose(); } }
        const sex = this.r() < 0.5 ? 'f' : 'm', age = 18 + Math.floor(this.r() * 45);
        const app = DV.Character.fromFaction(f, sex, 'farm:' + f + ':' + (this.n = (this.n || 0) + 1), { age });
        const model = DV.Character.create(app);
        this.zone.group.add(model.root);
        m = { model, app, f, sex, age, busy: false };
        this.pool.push(m);
      }
      return m;
    }
    spawnWorker(sp) {
      const f = sp.faction || (sp.where === 'market' || sp.where === 'garden' ? (this.r() < 0.5 ? 'amity' : 'factionless') : 'amity');
      const m = this.model(f);
      m.busy = true; m.model.root.visible = !this.kit.hidden;
      const w = { id: 'fw' + sp.id, sp, m, f, model: m.model, x: sp.x, z: sp.z, rot: sp.rot, act: sp.act, bark: null, lodT: 0, t: this.r() * 6, listen: 0, k: Math.floor(this.r() * 6) };
      w.name = (f === 'amity' ? 'Amity' : f === 'abnegation' ? 'Abnegation' : 'Factionless') + (m.sex === 'f' ? ' woman' : ' man');
      w.headY = () => 1.62 * (m.app.height || 1);
      w.it = { id: 'farm:' + w.id, kind: 'action', x: w.x, y: 1.1, z: w.z, radius: 1.9, label: 'Talk to', name: w.name, onUse: () => this.talk(w) };
      this.zone.interactables.push(w.it);
      m.model.root.position.set(w.x, 0.012, w.z);
      m.model.root.rotation.y = w.rot;
      if (sp.act === 'carry' || sp.act === 'pick') {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0x8f6c3e }));
        m.model.attach(sp.act === 'carry' ? 'chest' : 'handL', b).position.set(0, sp.act === 'carry' ? -0.4 : -0.16, sp.act === 'carry' ? 0.33 : 0.06);
        w.basket = b;
      }
      sp.live = w;
      this.workers.push(w);
    }
    release(w) {
      const i = this.zone.interactables.indexOf(w.it);
      if (i >= 0) this.zone.interactables.splice(i, 1);
      if (DV.Interaction.current === w.it) DV.Interaction.current = null;
      if (w.basket) { w.m.model.root.traverse(() => {}); if (w.basket.parent) w.basket.parent.remove(w.basket); w.basket.geometry.dispose(); w.basket.material.dispose(); }
      w.m.busy = false; w.m.model.root.visible = false;
      w.sp.live = null;
    }
    say(w, text, secs) { w.bark = { text, until: performance.now() + (secs || 3.5) * 1000 }; }
    talk(w) {
      const L = LINES[w.f] || LINES.amity;
      w.k = (w.k + 1) % L.length;
      this.say(w, L[w.k], 4);
      w.listen = 4;
      DV.Stats.practice('empathy', 0.05);
    }
    updateWorkers(dt, px, pz) {
      const h = hour(), day = h >= 6.5 && h < 18.5;
      // let go of the far ones, and everybody at night
      for (let i = this.workers.length - 1; i >= 0; i--) {
        const w = this.workers[i];
        if (!day || Math.hypot(w.x - px, w.z - pz) > WORK_FAR) { this.release(w); this.workers.splice(i, 1); }
      }
      // bring up those near you (a few a second, at most)
      if (day && this.workers.length < MAX_WORKERS && !this.kit.hidden) {
        let n = 0;
        for (const sp of this.spots) {
          if (sp.live || Math.abs(sp.x - px) > WORK_NEAR || Math.abs(sp.z - pz) > WORK_NEAR) continue;
          if (Math.hypot(sp.x - px, sp.z - pz) > WORK_NEAR) continue;
          if (this.r() < 0.5) continue; // (not every spot has somebody at it)
          this.spawnWorker(sp);
          if (++n >= 2 || this.workers.length >= MAX_WORKERS) break;
        }
      }
      const now = performance.now();
      for (const w of this.workers) {
        w.t += dt;
        if (w.listen > 0) { w.listen -= dt; w.rot = U.dampAngle(w.rot, Math.atan2(px - w.x, pz - w.z), 6, dt); }
        else w.rot = U.dampAngle(w.rot, w.sp.rot, 3, dt);
        const root = w.model.root;
        root.position.set(w.x, 0.012, w.z);
        root.rotation.y = w.rot;
        w.it.x = w.x; w.it.z = w.z;
        w.lodT += dt;
        const dp = Math.hypot(w.x - px, w.z - pz);
        if (dp > 30 && w.lodT < 0.15) continue;
        const adt = w.lodT; w.lodT = 0;
        w.model.animate(adt, { speed: 0, action: w.listen > 0 ? 'idle' : w.act, talking: !!(w.bark && w.bark.until > now) });
        const L = this.zone.lightAt(w.x, w.z);
        w.model.setTint(U.clamp(L[0] * 0.9, 0.25, 1.3), U.clamp(L[1] * 0.9, 0.25, 1.3), U.clamp(L[2] * 0.9, 0.25, 1.3));
      }
      // now and then, a word
      this.barkT = (this.barkT === undefined ? 6 : this.barkT) - dt;
      if (this.barkT <= 0) {
        this.barkT = 8 + this.r() * 12;
        const near = this.workers.filter((w) => Math.hypot(w.x - px, w.z - pz) < 14);
        if (near.length) { const w = near[Math.floor(this.r() * near.length)], L = LINES[w.f] || LINES.amity; this.say(w, L[Math.floor(this.r() * L.length)], 3); }
      }
    }

    update(dt) {
      const P = DV.Player, px = P.x, pz = P.z;
      const room = this.zone.roomAt(px, pz), away = (room && !room.exterior) || (this.life && this.life.shown !== true);
      if (away) {
        // (indoors: nothing of it up)
        if (this.beasts.length || this.workers.length) { for (const h of this.herds) if (h.live) this.sleepHerd(h); for (const w of this.workers) this.release(w); this.workers = []; for (const k in this.meshes) { this.meshes[k].count = 0; this.meshes[k].visible = false; } }
        return;
      }
      this.updateBeasts(dt, px, pz);
      this.updateWorkers(dt, px, pz);
    }
    info() { return { beasts: this.beasts.length, workers: this.workers.length, herds: this.herds.length, spots: this.spots.length }; }
    barkSources() {
      const now = performance.now();
      return this.workers.filter((w) => w.bark && w.bark.until > now);
    }
    bodies(px, pz, r) {
      const out = [];
      for (const w of this.workers) if (Math.abs(w.x - px) < r && Math.abs(w.z - pz) < r) out.push({ x: w.x, z: w.z, r: 0.28 });
      return out;
    }
  }

  DV.FarmLife = {
    BEASTS,
    attach(zone, kit, life) {
      const f = new FarmLife(zone, kit, life);
      zone.farmLife = f;
      return f;
    },
    active() {
      const z = DV.World.current;
      return z && z.farmLife ? z.farmLife : null;
    },
  };
})();
