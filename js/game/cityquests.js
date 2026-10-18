/* ==========================================================================
   DIVERGENT — the city's own stories
   Side quests out on the streets, between the Testing Center and the Fence.
   The stories themselves (who, what they say, what it costs) are data in
   js/data/cityquests.js and js/data/dialogue/city.js; this is what puts
   the people on the pavement and the things in the alleys, and lets you
   out of your headquarters to find them.

   The people are ordinary NPCs of the Testing Center's zone (DV.NPCData,
   with a dialogue tree, memory and a relationship), but nobody schedules
   them: each stands where its story puts it (`at`), when its story says
   (`when`), built only when you're near enough to see them, and gone again
   when you've walked on. They turn to you when you talk, and call out to
   you now and then if they've something to ask.

   When is the city yours? Once your results are in on Aptitude Day (the
   gate opens and the bus waits), and again between cases in the Chalk
   Year: your mentor (or the stairs up from the Pit) lets you go out, and
   you come back through your own sector's door.

     DV.CityQuests.person(id, { at: [x, z, rot], act, when(), barks, barkIf() })
     DV.CityQuests.object(id, { x, z, y, radius, label, name, cond(), onUse(), mesh(M) })
     DV.CityQuests.attach(zone, city)     the city (js/zones/testingCenter.js)
     DV.CityQuests.free()                 the streets are yours right now
     DV.CityQuests.where(id)              where someone stands (for the compass), or null
     DV.CityQuests.canGoOut() / goOut()   between cases: out into the city, and back
     DV.CityQuests.ally(who, d, why) / clue(id) / notice(n, why) / food()
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const BUILD = 110, DROP = 170; // (a person's model is made this near, and let go this far)
  const FROT = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 };
  const FOOD = ['ration_bar', 'bread_roll', 'apple'];
  // the door back to each faction's headquarters, from the street outside its sector's homes
  const BACK = { dauntless: 'The Dauntless Compound', erudite: 'Erudite Headquarters', candor: 'The Merciless Mart', abnegation: 'Abnegation Sector', amity: 'Amity Truck' };

  const propMat = () => new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });

  const CQ = {
    people: {},
    objects: {},
    clues: {},
    person(id, def) { def.id = id; this.people[id] = def; return def; },
    object(id, def) { def.id = id; this.objects[id] = def; return def; },
    // a clue the Casebook takes (now, or when the Chalk Year opens): { text, suspect }
    clueText(id, text, o) { this.clues[id] = Object.assign({ text }, o || {}); },

    /* ---------------- is the city yours? ---------------- */
    free() {
      const z = DV.World.current;
      return !!z && z.id === 'testing_center' && !!z.city && !!DV.State.flag('results_discussed');
    },
    // where someone stands right now (null: not out there)
    placeOf(id) {
      const d = this.people[id];
      if (!d || !this.free()) return null;
      const w = d.when ? d.when() : true;
      if (!w) return null;
      return Array.isArray(w) ? w : d.at;
    },
    where(id) { const a = this.placeOf(id); return a ? [a[0], a[1]] : null; },
    // is anyone of ours standing about here? (the pavement scenes keep clear of them)
    crowded(x, z, r) {
      for (const id in this.people) {
        const n = DV.NPCs.get(id);
        if (n && n.present && Math.abs(n.x - x) < r && Math.abs(n.z - z) < r) return true;
      }
      return false;
    },

    /* ---------------- consequences the campaign reads ---------------- */
    // trust from one of the Chalk Year's allies (now if it has begun; otherwise the flag that seeds it does)
    ally(who, d, why) {
      const C = DV.Campaign;
      if (C && C.started() && C.st().seeded) C.trust(who, d, why);
    },
    // a clue for the Casebook: now, or the day the case opens
    clue(id) {
      DV.State.setFlag('cq_clue_' + id);
      const C = DV.Campaign, def = this.clues[id];
      if (C && C.started() && def) C.clue('cq_' + id, def.text, { suspect: def.suspect || null });
    },
    // the Office of Public Order takes notice of you (or forgets you a little)
    notice(n, why) {
      const o = DV.Order && DV.Order.current;
      if (o && o.addNotice) { o.addNotice(n, why); return; }
      const w = DV.State.data.world, st = w.order || (w.order = { notice: 0, stops: 0, scans: 0, detained: 0, cleared: 0 });
      st.notice = U.clamp(st.notice + n, 0, 100);
    },
    // the first thing in your pockets that someone hungry could eat
    food() { return FOOD.find((id) => DV.Inventory.has(id)) || null; },
    foodName() { const f = this.food(); return f ? DV.Items.get(f).name : 'something'; },
    giveFood() { const f = this.food(); if (f) DV.Inventory.remove(f, 1); return f; },

    /* ---------------- out of headquarters, into the city ---------------- */
    // between cases in the Chalk Year (not in the middle of one; not once it has ended)
    canGoOut() {
      const C = DV.Campaign;
      return !!(C && C.started() && !C.st().ending && DV.State.data.player.faction);
    },
    // your own sector's front door (the Amity truck, for Amity), and which way the street is
    door(f) {
      const h = DV.CityMap.homes[f] || DV.CityMap.homes.abnegation;
      return { x: h.x, z: h.z, rot: h.gate ? Math.PI / 2 : FROT[h.face] !== undefined ? FROT[h.face] : 0 };
    },
    goOut() {
      if (!this.canGoOut()) return false;
      const f = DV.State.data.player.faction, d = this.door(f);
      const sub = { dauntless: 'DAUNTLESS SECTOR', erudite: 'ERUDITE SECTOR', candor: 'CANDOR SECTOR', abnegation: 'ABNEGATION SECTOR', amity: 'MADISON STREET · THE CITY\'S EDGE' }[f] || 'THE CITY';
      DV.State.setFlag('cq_out', DV.Clock.total());
      DV.District.enter('testing_center', { spawn: [d.x, d.z, d.rot], title: 'THE CITY\n' + sub, fadeOut: 1000 });
      if (!DV.State.flag('cq_out_told')) {
        DV.State.setFlag('cq_out_told');
        setTimeout(() => DV.UI.notify('Between cases the city is yours. When you\'re done, the way back is the door you came out of: ' + (BACK[f] || 'your sector') + '.', 'quest'), 4200);
      }
      return true;
    },
    goOutSoon() { setTimeout(() => this.goOut(), 250); },
    // the line at your mentor, or anyone at headquarters who'd let you go
    mentorChoice() {
      return { text: 'I\'m going out into the city for a while.', if: () => CQ.canGoOut(), end: true, effect: () => CQ.goOutSoon() };
    },

    /* ---------------- the city: people and things ---------------- */
    attach(zone, city) {
      const c = new CityStories(zone, city);
      zone.cityStories = c;
      return c;
    },
    active() { const z = DV.World.current; return z && z.cityStories ? z.cityStories : null; },
  };

  class CityStories {
    constructor(zone, city) {
      this.zone = zone; this.city = city;
      this.r = U.rng(7311);
      this.meshes = [];
      // the things you use: a fire escape, a drone in the gutter, the Order's front desk
      for (const id in CQ.objects) {
        const o = CQ.objects[id];
        const it = { id: 'cq:' + id, kind: o.kind || 'action', x: o.x, y: o.y || 1.1, z: o.z, radius: o.radius || 1.8, label: o.label, name: o.name, cond: () => CQ.free() && (!o.cond || o.cond()), onUse: () => o.onUse(this) };
        zone.interactables.push(it);
        if (o.mesh) {
          const M = new DV.Vehicles.MB();
          o.mesh(M, this);
          const m = new THREE.Mesh(M.geometry(), propMat());
          m.position.set(o.mx !== undefined ? o.mx : o.x, 0, o.mz !== undefined ? o.mz : o.z);
          m.rotation.y = o.rot || 0;
          const L = zone.lightAt(o.x, o.z);
          m.material.color.setRGB(U.clamp(L[0] * 0.95, 0.35, 1.2), U.clamp(L[1] * 0.95, 0.35, 1.2), U.clamp(L[2] * 0.95, 0.35, 1.2));
          m.visible = false;
          zone.group.add(m);
          this.meshes.push({ o, m });
        }
      }
      // the way back to headquarters, between cases: your own sector's door
      for (const f in BACK) {
        const d = CQ.door(f);
        zone.interactables.push({
          id: 'cq_back_' + f, kind: 'action', x: d.x, y: 1.2, z: d.z, radius: 2.4, label: 'Go back', name: BACK[f], bias: 0.3,
          cond: () => CQ.canGoOut() && DV.State.data.player.faction === f,
          onUse: () => DV.Campaign.home(),
        });
      }
    }

    /* ---- every frame ---- */
    update(dt) {
      const P = DV.Player, free = CQ.free(), now = performance.now();
      const room = this.zone.roomAt(P.x, P.z), inside = !!(room && !room.exterior);
      for (const { o, m } of this.meshes) {
        const show = free && !inside && (!o.show || o.show()) && Math.hypot(o.x - P.x, o.z - P.z) < 160;
        if (m.visible !== show) m.visible = show;
      }
      for (const id in CQ.people) {
        const d = CQ.people[id], n = DV.NPCs.get(id);
        if (!n) continue;
        const at = free ? CQ.placeOf(id) : null;
        if (!at) {
          if (n.present) { n.present = false; n.mode = 'absent'; }
          if (n.model && (!free || Math.hypot(n.x - P.x, n.z - P.z) > 30)) this.drop(n);
          continue;
        }
        // (moved by the story: a sister now standing with her brother, a boy at the foot of a ladder)
        if (!n.present || n.at !== at) {
          n.at = at; n.x = at[0]; n.z = at[1]; n.rot = at[2] || 0;
          n.x0 = n.x; n.z0 = n.z; n.rot0 = n.rot;
        }
        n.present = true; n.scripted = true; n.path = null; n.walkTarget = null;
        if (n.mode !== 'talking') n.mode = 'acting';
        n.action = d.act || 'idle';
        n.seatY = d.seatY || 0.45;
        const dist = Math.hypot(n.x - P.x, n.z - P.z);
        if (!n.model && dist < BUILD && !inside) { n.ensureModel(DV.NPCs.scene); n.model.root.visible = false; DV.NPCAI.syncModel(n); }
        else if (n.model && dist > DROP) { this.drop(n); continue; }
        if (!n.model) continue;
        // they turn to you when you're talking to them (or right in front of them), and back after
        const talking = DV.Game && DV.Game.npcSpeaking === id;
        const want = talking || dist < 2.2 ? Math.atan2(P.x - n.x, P.z - n.z) : n.rot0;
        if (!/^sit/.test(n.action)) n.rot = U.dampAngle(n.rot, want, 5, dt);
        if (inside) n.model.root.visible = false;
        // something to ask you, called out as you go by
        n.cqBark = (n.cqBark === undefined ? 3 + this.r() * 5 : n.cqBark) - dt;
        if (n.cqBark <= 0 && dist < 10 && !talking && d.barks && (!d.barkIf || d.barkIf()) && !(n.bark && n.bark.until > now)) {
          n.say(d.barks[Math.floor(this.r() * d.barks.length)], 4);
          n.cqBark = 14 + this.r() * 12;
        }
      }
    }
    drop(n) {
      if (!n.model) return;
      if (n.model.root.parent) n.model.root.parent.remove(n.model.root);
      n.model.dispose();
      n.model = null;
    }
    info() {
      const out = {};
      for (const id in CQ.people) { const n = DV.NPCs.get(id); if (n && n.present) out[id] = { x: +n.x.toFixed(1), z: +n.z.toFixed(1), model: !!n.model }; }
      return out;
    }
  }

  // a clue held over from Aptitude Day: the Casebook gets it when the Chalk Year opens
  DV.Events.on('campaign:begin', () => {
    const C = DV.Campaign;
    for (const id in CQ.clues) if (DV.State.flag('cq_clue_' + id)) C.clue('cq_' + id, CQ.clues[id].text, { suspect: CQ.clues[id].suspect || null, silent: true });
  });

  DV.CityQuests = CQ;
})();
