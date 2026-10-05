/* ==========================================================================
   DIVERGENT — extras
   The people a place is full of who aren't anyone in particular: members
   around a fire barrel, leaning on the railing, walking the paths cut into
   the rock, eating in the hall. They aren't scheduled NPCs (no dialogue
   trees, no AI): a zone lists them in sets, each with the hours it's out and
   the rooms it can be seen from, and they stand, sit, talk among themselves,
   or walk their loop. Speak to one (E) and they'll answer; brush past a
   group and someone says something. They're solid.

     DV.Extras.attach(zone, {
       faction, seed, lines: [..], banter: [..],
       sets: [{ id, when: [['17:30', '23:59'], …], rooms: [room ids], people: [
         { x, z, rot, act, y?, seatY?, face?: [x, z], walk?: [[x, z], …], speed? } ] }],
     })
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  class Crowd {
    constructor(zone, def) {
      this.zone = zone;
      this.def = def;
      this.r = U.rng(def.seed || 9);
      this.people = [];
      this.sets = def.sets.map((s) => Object.assign({ on: false, win: (s.when || [['00:00', '23:59']]).map(([a, b]) => [U.parseTime(a), U.parseTime(b)]) }, s));
      for (const s of this.sets) s.people.forEach((p, i) => this.people.push(Object.assign({ set: s, id: s.id + ':' + i, model: null, i, t: this.r() * 10, bark: null, barkT: 4 + this.r() * 12, seg: 0, segT: 0, talkT: 0 }, p)));
      // one interactable that follows whoever's nearest
      this.it = { id: 'extra:talk', kind: 'action', x: 0, y: 1.2, z: 0, radius: 1.8, label: 'Talk to', name: () => (this.near ? this.near.name : ''), cond: () => !!this.near, onUse: () => this.talk(this.near) };
      zone.interactables.push(this.it);
      this.made = 0;
      this.barkT = 3;
    }
    active(s, m) { return s.win.some(([a, b]) => (a <= b ? m >= a && m <= b : m >= a || m <= b)); }
    // can you see this set from where you are? (its rooms; and not too far)
    seen(s, room) { return !s.rooms || (room && s.rooms.indexOf(room.id) >= 0); }
    make(p) {
      const sex = this.r() < 0.45 ? 'f' : 'm';
      const age = 18 + Math.floor(this.r() * 26);
      const app = DV.Character.fromFaction(p.faction || this.def.faction, sex, 'extra:' + this.zone.id + ':' + p.id, { age });
      p.model = DV.Character.create(app);
      p.app = app;
      p.name = (this.def.title || 'Dauntless') + ' ' + (sex === 'f' ? 'woman' : 'man');
      this.zone.group.add(p.model.root);
      p.model.root.visible = false;
      if (p.walk) { p.x = p.walk[0][0]; p.z = p.walk[0][1]; }
    }
    talk(p) {
      if (!p) return;
      const L = this.def.lines || ['…'];
      p.lineK = ((p.lineK === undefined ? Math.floor(this.r() * L.length) : p.lineK) + 1) % L.length;
      this.say(p, L[p.lineK], 4.5);
      p.listen = 4.5;
    }
    say(p, text, secs) { p.bark = { text, until: performance.now() + (secs || 3) * 1000 }; }
    update(dt) {
      const P = DV.Player, m = DV.Clock.minutes();
      const room = this.zone.roomAt(P.x, P.z);
      const cam = DV.Game && DV.Game.camera;
      this.near = null;
      let nd = 1.7;
      this.barkT -= dt;
      for (const s of this.sets) s.on = this.active(s, m);
      for (const p of this.people) {
        const s = p.set;
        const vis = s.on && this.seen(s, room) && Math.hypot(p.x - P.x, p.z - P.z) < 75;
        if (!vis) { if (p.model) p.model.root.visible = false; continue; }
        // made on demand, a couple a frame
        if (!p.model) { if (this.made >= 2) continue; this.make(p); this.made++; }
        const root = p.model.root;
        root.visible = true;
        let speed = 0;
        if (p.listen > 0) p.listen -= dt;
        // walkers go round their loop (and stop for you)
        if (p.walk && !(p.listen > 0)) {
          const a = p.walk[p.seg], b = p.walk[(p.seg + 1) % p.walk.length];
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
          const blocked = Math.hypot(P.x - p.x, P.z - p.z) < 1.1 && ((P.x - p.x) * (b[0] - a[0]) + (P.z - p.z) * (b[1] - a[1])) > 0;
          speed = blocked ? 0 : p.speed || 1.25;
          p.segT += (speed * dt) / len;
          if (p.segT >= 1) { p.segT = 0; p.seg = (p.seg + 1) % p.walk.length; }
          const a2 = p.walk[p.seg], b2 = p.walk[(p.seg + 1) % p.walk.length];
          p.x = a2[0] + (b2[0] - a2[0]) * p.segT; p.z = a2[1] + (b2[1] - a2[1]) * p.segT;
          p.rot = U.dampAngle(p.rot === undefined ? 0 : p.rot, Math.atan2(b2[0] - a2[0], b2[1] - a2[1]), 8, dt);
        } else if (p.listen > 0) p.rot = U.dampAngle(p.rot, Math.atan2(P.x - p.x, P.z - p.z), 6, dt);
        else if (p.face) p.rot = Math.atan2(p.face[0] - p.x, p.face[1] - p.z);
        root.position.set(p.x, p.y || 0, p.z);
        root.rotation.y = p.rot || 0;
        // people in a group take turns to talk
        p.talkT -= dt;
        if (p.act === 'talk' && p.talkT <= 0) { p.talking = !p.talking; p.talkT = p.talking ? 1.5 + this.r() * 3 : 1 + this.r() * 4; }
        const d = Math.hypot(p.x - P.x, p.z - P.z);
        // banter, now and then, when you're about
        p.barkT -= dt;
        if (p.barkT <= 0) {
          p.barkT = 10 + this.r() * 18;
          if (d < 12 && this.barkT <= 0 && this.def.banter && (p.act === 'talk' || p.act === 'cheer' || p.act === 'clap' || p.act === 'sit_cheer')) { this.say(p, U.pick(this.def.banter), 2.6); this.barkT = 4; }
        }
        if (d < nd && !(p.y > 0.5)) { nd = d; this.near = p; }
        // far ones animate less often
        p.t += dt;
        if (d > 26 && p.t < 0.15) continue;
        const adt = p.t;
        p.t = 0;
        const act = speed > 0 ? 'idle' : p.act === 'talk' ? 'idle' : p.act || 'idle';
        p.model.animate(adt, { speed, action: act, seatY: p.seatY, lookYaw: 0, talking: !!(p.talking || (p.bark && p.bark.until > performance.now())) });
        const L = this.zone.lightAt(p.x, p.z);
        p.model.setTint(U.clamp(L[0] * 0.9, 0.25, 1.3), U.clamp(L[1] * 0.9, 0.25, 1.3), U.clamp(L[2] * 0.9, 0.25, 1.3));
      }
      this.made = 0;
      if (this.near) { this.it.x = this.near.x; this.it.z = this.near.z; }
      void cam;
    }
    bodies(px, pz, r) {
      const out = [];
      for (const p of this.people) if (p.model && p.model.root.visible && !(p.y > 0.5) && Math.abs(p.x - px) < r && Math.abs(p.z - pz) < r) out.push({ x: p.x, z: p.z, r: 0.28 });
      return out;
    }
    barkSources() {
      const now = performance.now();
      return this.people.filter((p) => p.bark && p.bark.until > now && p.model && p.model.root.visible).map((p) => ({ id: p.id, name: p.name, bark: p.bark, x: p.x, z: p.z, headY: () => (p.y || 0) + 1.62 * ((p.app && p.app.height) || 1) * (/^sit/.test(p.act) && !p.walk ? 0.72 : 1) }));
    }
    count() { return this.people.filter((p) => p.model && p.model.root.visible).length; }
  }

  DV.Extras = {
    attach(zone, def) {
      const c = new Crowd(zone, def);
      zone.extras = c;
      return c;
    },
  };
})();
