/* ==========================================================================
   DIVERGENT — Build 7: the shops
   Eight shops in the city you can walk into (the list, their keepers and
   their goods: js/data/shops.js; their insides: js/zones/shops.js).

   Up in the street each one is a real shopfront set into a building: the
   door (snapped onto the building as the city built it, the way the Circle
   Line's entrances are), its windows either side (lit and full of goods while
   it's open, dark with the blind down when it's shut), the name on the
   fascia over it, an OPEN or CLOSED card in the door. All eight are one mesh,
   and it's only drawn when you're out in the streets near one. E at the door
   goes in, if it's open; the pavement in front is kept clear of the street
   furniture. The inside is its own small zone, built the first time you walk
   in. Walk back out through the door (or E at it) and you're on the pavement.

   The keeper keeps the shop's hours (in a quarter of an hour before opening,
   a break in the back after one, gone at closing). Talk to them to trade:
   buy what's on the shelves (it sells out; it's restocked every morning),
   sell back what they deal in, ask for an hour's odd job (once a day), and
   at Ortega's, sit for a tattoo. At closing time you're shown out. Nothing
   stays open past the curfew at 21:00.

     DV.Shops.attachCity(zone, city)  the shopfronts (js/zones/testingCenter.js)
     DV.Shops.enter(id) / exit()       in off the street / back out to it
     DV.Shops.buy / sell / service      what the trading panel calls (js/ui/shopUI.js)
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const STORES = DV.ShopData.list;
  const FACE = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
  const FROT = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 };
  const T = (s) => U.parseTime(s);
  const get = (id) => DV.ShopData.get(typeof id === 'string' ? id : id && id.id);
  const bell = () => { const A = DV.Audio; if (A && A.ready) try { A.tone(1760, 0.5, 'sine', 0.05, 0); A.tone(2350, 0.4, 'sine', 0.03, 0); } catch (e) { /* not ready */ } };

  const Shops = {
    STORES,
    here: null, // the shop you're in
    get,
    zoneId: (S) => 'shop_' + get(S).id,
    inShop() { return !!this.here && !!DV.World.current && DV.World.current.id === 'shop_' + this.here.id; },

    /* ---------------- the clock ---------------- */
    isOpen(S, m) { S = get(S); m = m === undefined ? DV.Clock.minutes() : m; return m >= T(S.hours[0]) && m < T(S.hours[1]); },
    hoursStr(S) { S = get(S); return S.hours[0] + '–' + S.hours[1]; },
    closeAt(S) { return T(get(S || this.here).hours[1]); },

    /* ---------------- the money ---------------- */
    price(S, id) { const d = DV.Items.get(id); return d ? Math.max(1, Math.round((d.value || 1) * (get(S).mark || 1))) : 0; },
    buysItem(S, id) {
      S = get(S);
      const d = DV.Items.get(id), b = S.buys;
      if (!b || !d || d.quest || !(d.value > 0)) return false;
      return !!(b.all || (b.ids && b.ids.indexOf(id) >= 0) || (b.cats && b.cats.indexOf(d.cat) >= 0));
    },
    sellPrice(S, id) { const d = DV.Items.get(id); return this.buysItem(S, id) ? Math.max(1, Math.floor(d.value * get(S).buys.rate)) : 0; },
    // the shop's own day: the shelves restocked each morning, the job and the charity once a day
    state(S) {
      S = get(S);
      const all = DV.State.data.shops || (DV.State.data.shops = {}), day = DV.Clock.day();
      let s = all[S.id];
      if (!s || s.day !== day) {
        const stock = {};
        for (const [id, n] of S.stock) stock[id] = n;
        s = all[S.id] = { day, stock, job: s ? s.job : 0, charity: s ? s.charity : 0 };
      }
      return s;
    },
    // what's for sale: [{ id, name, price, qty, service }]
    forSale(S) {
      S = get(S);
      const st = this.state(S), tat = DV.State.data.player.tattoos || [];
      const out = S.stock.map(([id]) => ({ id, name: DV.Items.get(id).name, price: this.price(S, id), qty: st.stock[id] || 0, def: DV.Items.get(id) }));
      for (const v of S.services || []) out.push({ id: v.id, name: v.name, price: v.price, qty: tat.indexOf(v.slot) >= 0 ? 0 : 1, service: v, done: tat.indexOf(v.slot) >= 0 });
      return out;
    },
    // what you could sell them: [{ id, name, price, qty }]
    sellable(S) {
      return DV.Inventory.list().filter((e) => this.buysItem(S, e.id) && !DV.Inventory.equipped(e.id)).map((e) => ({ id: e.id, name: DV.Items.get(e.id).name, price: this.sellPrice(S, e.id), qty: e.qty, def: DV.Items.get(e.id) }));
    },
    keeperHere(S) { const n = DV.NPCs.get(get(S).keeper.id); return !!(n && n.present); },
    canTrade(S) {
      S = get(S);
      if (!this.isOpen(S)) return S.name + ' is closed.';
      if (!this.keeperHere(S)) return 'There\'s nobody at the counter.';
      return '';
    },
    buy(S, id) {
      S = get(S);
      const why = this.canTrade(S);
      if (why) return { ok: false, message: why };
      const v = (S.services || []).find((q) => q.id === id);
      if (v) return this.service(S, v);
      const st = this.state(S), d = DV.Items.get(id), p = this.price(S, id);
      if (!d || !(st.stock[id] > 0)) return { ok: false, message: 'They\'re out of that.' };
      if (!DV.Wallet.spend(p, S.short)) return { ok: false, message: 'You can\'t afford it: ' + DV.Wallet.str(p) + ', and you have ' + DV.Wallet.str() + '.' };
      st.stock[id]--;
      DV.Inventory.add(id, 1, true);
      DV.Audio.play('item');
      DV.Events.emit('shop:bought', { shop: S.id, id, price: p });
      return { ok: true, message: 'Bought: ' + d.name + ' for ' + DV.Wallet.str(p) + '.' };
    },
    sell(S, id) {
      S = get(S);
      const why = this.canTrade(S);
      if (why) return { ok: false, message: why };
      if (!S.buys) return { ok: false, message: S.noBuy || 'They don\'t buy.' };
      if (!this.buysItem(S, id) || !DV.Inventory.has(id) || DV.Inventory.equipped(id)) return { ok: false, message: 'They won\'t take that.' };
      const p = this.sellPrice(S, id), d = DV.Items.get(id);
      DV.Inventory.remove(id, 1, true);
      DV.Wallet.add(p, null, true);
      const st = this.state(S);
      if (st.stock[id] !== undefined) st.stock[id]++; // (back on the shelf)
      DV.Audio.play('click');
      DV.Events.emit('shop:sold', { shop: S.id, id, price: p });
      return { ok: true, message: 'Sold: ' + d.name + ' for ' + DV.Wallet.str(p) + '.' };
    },
    // the tattoo chair: forty minutes and you don't get to flinch
    service(S, v) {
      const pl = DV.State.data.player, tat = pl.tattoos || (pl.tattoos = []);
      if (tat.indexOf(v.slot) >= 0) return { ok: false, message: 'You already have one there.' };
      if (this.closeAt(S) - DV.Clock.minutes() < 45) return { ok: false, message: '"Not now. That\'s forty minutes in the chair, and it\'s nearly curfew."' };
      if (!DV.Wallet.spend(v.price, v.name)) return { ok: false, message: 'You can\'t afford it: ' + DV.Wallet.str(v.price) + ', and you have ' + DV.Wallet.str() + '.' };
      tat.push(v.slot);
      DV.Clock.skip(40);
      DV.Game.refreshPlayerAppearance();
      DV.Stats.addXP(15, 'A tattoo');
      DV.Reputation.add('dauntless', 2);
      DV.State.note('Got a tattoo at Ortega\'s on State Street: ' + v.name.replace(/^Tattoo: /, '') + '.');
      DV.Events.emit('shop:service', { shop: S.id, id: v.id });
      return { ok: true, message: 'Forty minutes in the chair. ' + v.name.replace(/^Tattoo: /, '').replace(/^./, (c) => c.toUpperCase()) + ', black and raw. (' + DV.Wallet.str(v.price) + ')' };
    },
    // an hour's odd job, once a day, if there's an hour left before closing
    jobOpen(S) {
      S = get(S);
      return !!S.job && this.inShop() && this.here.id === S.id && this.isOpen(S) && this.state(S).job !== DV.Clock.day() && DV.Clock.minutes() + 60 <= this.closeAt(S);
    },
    doJob(S) {
      S = get(S);
      if (!this.jobOpen(S)) return false;
      this.state(S).job = DV.Clock.day();
      DV.UI.fade(1, 250).then(() => DV.UI.fade(0, 700));
      DV.Clock.skip(60);
      DV.Wallet.add(S.job.pay, S.short + ', an hour\'s work');
      if (S.job.gift) DV.Inventory.add(S.job.gift, 1);
      DV.Stats.addXP(10, 'An honest hour');
      if (S.faction && S.faction !== 'factionless') DV.Reputation.add(S.faction, 1);
      return true;
    },
    // Abnegation feed whoever comes to the door: short of scrip, a ration bar, once a day
    charityOK(S) { S = get(S); return !!S.charity && this.inShop() && this.here.id === S.id && DV.Wallet.get() < 3 && this.state(S).charity !== DV.Clock.day(); },
    giveCharity(S) { S = get(S); if (!this.charityOK(S)) return; this.state(S).charity = DV.Clock.day(); DV.Inventory.add(S.charity.item, 1); },

    /* ---------------- talking to the keeper ---------------- */
    dialogue(S) {
      const K = S.keeper, me = this;
      const menu = [
        { text: 'Let me see what you have.', if: () => me.isOpen(S), effect: () => { me.pendingTrade = S.id; }, end: true },
        { text: () => 'Any work going? [an hour, ' + S.job.pay + ' scrip]', if: () => me.jobOpen(S), to: 'job' },
        { text: 'I\'m short of scrip today.', if: () => me.charityOK(S), to: 'charity' },
        { text: 'What is this place?', to: 'about' },
        { text: 'Heard anything?', to: 'rumor' },
        { text: 'Goodbye.', end: true },
      ];
      return {
        entry: (c) => (!me.isOpen(S) ? 'closed' : c.firstTime ? 'first' : 'again'),
        nodes: {
          first: { text: K.first, choices: menu },
          again: { text: K.again, choices: menu },
          more: { text: 'Anything else?', choices: menu },
          about: { text: K.about, choices: menu },
          rumor: { text: K.rumor, choices: menu },
          job: { text: S.job ? S.job.ask : '', choices: [{ text: 'I\'ll do it.', effect: () => me.doJob(S), to: 'job_done' }, { text: 'Not now.', to: 'more' }] },
          job_done: { text: S.job ? S.job.done : '', choices: menu },
          charity: { text: S.charity ? S.charity.text : '', onEnter: () => me.giveCharity(S), choices: menu },
          closed: { text: K.closed, choices: [{ text: 'Goodbye.', end: true }] },
        },
      };
    },

    /* ---------------- up in the city ---------------- */
    // set each door flush on a real building front near where the map puts it (as the Circle Line's
    // entrances are): the nearest building whose face is on that building line and wide enough, and
    // not on anybody's front door or a station entrance
    snap(city) {
      const sol = (city && city.walk && city.walk.solids) || [];
      const homes = Object.values((DV.CityMap && DV.CityMap.homes) || {});
      const stations = (DV.Metro && DV.Metro.STATIONS) || [];
      for (const S of STORES) {
        if (!S.snapped) {
          const ax = S.face === 'e' || S.face === 'w';
          let best = null, bd = 1e9;
          for (const q of sol) {
            if (q[4] < 3 || Math.abs(q[0] - S.x) > 45 || Math.abs(q[1] - S.z) > 45) continue;
            const face = S.face === 'w' ? q[0] : S.face === 'e' ? q[2] : S.face === 'n' ? q[1] : q[3];
            if (Math.abs(face - (ax ? S.x : S.z)) > 3) continue;
            const a0 = ax ? q[1] : q[0], a1 = ax ? q[3] : q[2];
            if (a1 - a0 < 5.6) continue;
            const want = ax ? S.z : S.x, t = U.clamp(want, a0 + 2.8, a1 - 2.8), d = Math.abs(t - want) + Math.abs(face - (ax ? S.x : S.z)) * 0.5;
            const at = ax ? [face, t] : [t, face];
            if (homes.some((h) => Math.hypot(h.x - at[0], h.z - at[1]) < 14)) continue;
            if (stations.some((m) => Math.hypot(m.x - at[0], m.z - at[1]) < 9)) continue;
            if (d < bd) { bd = d; best = { at, w: a1 - a0, t0: a0, t1: a1 }; }
          }
          if (best) { S.x = best.at[0]; S.z = best.at[1]; S.front = Math.min(best.t1 - (ax ? S.z : S.x), (ax ? S.z : S.x) - best.t0) * 2; }
          S.snapped = true;
        }
        if (DV.CityMap) DV.CityMap.zones['shop_' + S.id] = [S.x, S.z];
      }
    },
    // the pavement in front of each door (nothing is put down there)
    clearRects() {
      return STORES.map((S) => {
        const f = FACE[S.face], al = [-f[1], f[0]];
        const pts = [[-2.4, -0.2], [2.4, -0.2], [-2.4, 2.8], [2.4, 2.8]].map(([a, o]) => [S.x + al[0] * a + f[0] * o, S.z + al[1] * a + f[1] * o]);
        return [Math.min(...pts.map((q) => q[0])), Math.min(...pts.map((q) => q[1])), Math.max(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[1]))];
      });
    },
    attachCity(zone, city) {
      this.snap(city);
      if (!this._listening) {
        this._listening = true;
        // "let me see what you have": the trading panel, once the conversation is over
        DV.Events.on('dialogue:end', () => {
          const id = this.pendingTrade;
          this.pendingTrade = null;
          if (id && this.inShop() && this.here.id === id && DV.ShopUI) DV.ShopUI.open(get(id));
        });
        DV.Events.on('clock:minute', () => { if (this.inShop()) this.onMinute(); });
      }
      const front = (this.front = buildFronts(STORES));
      zone.group.add(front.mesh);
      STORES.forEach((S) => {
        const f = FACE[S.face];
        zone.interactables.push({
          id: 'shop_in_' + S.id, kind: 'action', x: S.x + f[0] * 1.0, y: 1.2, z: S.z + f[1] * 1.0, radius: 2.2,
          get label() { return Shops.isOpen(S) ? 'Go in' : 'Closed (opens ' + S.hours[0] + ')'; },
          name: S.name + ' — ' + S.short,
          cond: () => !DV.Game.ctrl(),
          onUse: () => Shops.enter(S.id),
        });
      });
      const out = { front, t: 1 };
      // the windows and the card in the door on the clock; drawn only out in the streets near one
      out.update = (dt) => {
        out.t += dt;
        const cam = DV.Game && DV.Game.camera, P = DV.Player;
        const room = zone.roomAt(P.x, P.z);
        let near = false;
        if (cam && !(room && !room.exterior)) for (const S of STORES) if (Math.abs(S.x - cam.position.x) < 160 && Math.abs(S.z - cam.position.z) < 160) { near = true; break; }
        front.mesh.visible = near;
        if (!near || out.t < 0.5) return;
        out.t = 0;
        front.light(STORES.map((S) => this.isOpen(S)), DV.World.todLight === undefined ? 1 : DV.World.todLight);
      };
      zone.shops = out;
      return out;
    },

    /* ---------------- in and out ---------------- */
    enter(id) {
      const S = get(id), G = DV.Game;
      if (!S) return false;
      if (G.ctrl()) { DV.UI.notify('Not now.'); return false; }
      if (!this.isOpen(S)) { DV.Audio.play('locked'); DV.UI.notify(S.name + ' is closed. Open ' + this.hoursStr(S) + '.'); return false; }
      this.fromZone = DV.World.current ? DV.World.current.id : 'testing_center';
      G.state = 'transition';
      DV.Input.clearMovement();
      DV.Audio.play('door', { volume: 0.5 });
      DV.UI.fade(1, 500).then(() => { try { this.arrive(S); } catch (e) { DV.UI.showError((e && e.stack) || String(e)); } });
      return true;
    },
    arrive(S) {
      const G = DV.Game, P = DV.Player;
      const zone = DV.World.activate('shop_' + S.id); // (built here, the first time)
      DV.NPCs.attach(zone.id);
      if (!P.model.root.parent) G.scene.add(P.model.root);
      if (P.seat) { P.seat.occupant = null; P.seat = null; }
      P.state = 'free'; P.pinned = false; P.cineAction = null; P.crouched = false; P.vx = P.vz = 0;
      for (const sid in zone.spots) zone.spots[sid].occupant = null;
      this.here = S;
      this.armed = false;
      this.closing = null;
      DV.NPCAI.syncAll();
      P.place(0, 1.2, 0);
      G.rig.yaw = 0; G.rig.pitch = 0.2; G.rig.follow(true);
      G.triggerState = {}; G.lastRoom = null;
      this.notePos(S);
      G.state = 'playing';
      G.updateAmbience(true);
      DV.UI.fade(0, 700);
      bell();
      setTimeout(() => DV.UI.narrate(S.name.toUpperCase() + '\nOPEN ' + this.hoursStr(S), 2.4), 250);
      if (!DV.State.flag('shops_shown')) {
        DV.State.setFlag('shops_shown');
        setTimeout(() => DV.UI.notify('Talk to whoever\'s behind the counter to buy and sell; you pay in ration scrip (your purse is in the Inventory). Walk back out through the door for the street.', 'quest'), 2600);
      }
      DV.Events.emit('shop:enter', { shop: S.id });
    },
    // where a save made in here puts you: on the pavement outside the door
    notePos(S) {
      const f = FACE[S.face];
      DV.State.data.player.pos = { x: +(S.x + f[0] * 1.6).toFixed(2), z: +(S.z + f[1] * 1.6).toFixed(2), rot: +FROT[S.face].toFixed(3) };
    },
    exit(opts) {
      opts = opts || {};
      const G = DV.Game, S = this.here;
      if (!S || G.state === 'transition') return;
      const f = FACE[S.face], sx = S.x + f[0] * 1.6, sz = S.z + f[1] * 1.6, rot = FROT[S.face];
      if (DV.ShopUI && DV.ShopUI.isOpen()) DV.ShopUI.close(true);
      if (DV.Dialogue.isActive()) DV.Dialogue.end();
      G.state = 'transition';
      DV.Input.clearMovement();
      bell();
      DV.UI.fade(1, 500).then(() => {
        try {
          this.here = null;
          const back = this.fromZone || 'testing_center';
          if (back === DV.District.zoneId()) DV.District.enter(DV.District.currentId(), { spawn: [sx, sz, rot], instant: true, fadeIn: 700, noSave: true });
          else {
            DV.World.activate(back);
            DV.NPCs.attach(back);
            DV.NPCAI.syncAll();
            DV.Player.place(sx, sz, rot);
            G.rig.yaw = rot; G.rig.follow(true);
            G.state = 'playing';
            G.updateAmbience(true);
            DV.UI.fade(0, 700);
          }
          if (opts.why) setTimeout(() => DV.UI.notify(opts.why), 300);
          DV.Events.emit('shop:exit', { shop: S.id });
        } catch (e) { DV.UI.showError((e && e.stack) || String(e)); }
      });
    },

    /* ---------------- while you're in one ---------------- */
    buildInside(ctx, S) {
      const zone = ctx.zone;
      // out to the street: E at the door (or just walk out through it: see update)
      ctx.interact({ id: 'shop_exit', kind: 'action', x: 0, y: 1.2, z: 0.55, radius: 1.5, label: 'Out to the street', name: S.street, bias: -0.2, onUse: () => this.exit() });
      // the people browsing, by the hour
      const sh = S.shoppers;
      const crowd = sh ? DV.Extras.attach(zone, { faction: sh.faction, seed: S.id.length * 31, lines: sh.lines, sets: sh.sets.map((q) => Object.assign({ rooms: ['sh_' + S.id] }, q)) }) : null;
      ctx.update((dt) => {
        if (crowd) crowd.update(dt);
        this.update(dt, S);
      });
      this.tintWindow(S, true);
    },
    leftInside(S) {
      if (DV.ShopUI && DV.ShopUI.isOpen()) DV.ShopUI.close(true);
      void S;
    },
    update(dt, S) {
      const G = DV.Game, P = DV.Player;
      if (!this.inShop() || this.here !== S) return;
      this._wt = (this._wt || 0) + dt;
      if (this._wt > 2) { this._wt = 0; this.tintWindow(S); }
      if (G.state !== 'playing') return;
      // walk back out through the door (once you've come in off it)
      if (P.z > 2.0) this.armed = true;
      if (this.armed && P.z < 0.62 && Math.abs(P.x) < 0.8) { this.exit(); return; }
      // closing time: the keeper shows you out
      if (this.closing && DV.Clock.total() >= this.closing) {
        this.closing = null;
        this.exit({ why: S.short + ': closed for the night. Open ' + this.hoursStr(S) + '.' });
      }
    },
    onMinute() {
      const S = this.here;
      if (!S) return;
      if (!DV.Wait.running) DV.NPCAI.onMinute();
      if (!this.isOpen(S) && !this.closing) {
        const n = DV.NPCs.get(S.keeper.id);
        if (n && n.present) n.say(S.keeper.closing, 5);
        DV.UI.notify(S.keeper.name + ': "' + S.keeper.closing + '"');
        this.closing = DV.Clock.total() + 2;
        if (DV.ShopUI && DV.ShopUI.isOpen()) DV.ShopUI.close(true);
        if (DV.Dialogue.isActive()) DV.Dialogue.end();
      }
    },

    /* ---------------- the street, through the shop's windows ---------------- */
    windowMat(id) {
      const S = get(id);
      return DV.Mat.fromTexture('shopwin|' + S.id, DV.Tex.custom('shopwin|' + S.id, 128, 128, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#dfe6ea'); g.addColorStop(0.55, '#b8c0c4'); g.addColorStop(0.56, '#8a8e8e'); g.addColorStop(1, '#6a6c6a');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        // the buildings across the street, blurred by the glass
        c.fillStyle = 'rgba(80,82,84,0.55)';
        for (let k = 0; k < 6; k++) c.fillRect(k * 22 - 4, 18 + (k * 13) % 20, 24, 56);
        c.fillStyle = 'rgba(40,40,42,0.35)'; c.fillRect(0, 70, w, 4);
        // the shop's name painted on the glass, from the inside: back to front
        c.save(); c.scale(-1, 1); c.fillStyle = 'rgba(200,160,70,0.9)'; c.font = 'bold 13px Georgia, serif'; c.textAlign = 'center';
        c.fillText(S.short.toUpperCase(), -w / 2, 14); c.restore();
      }), { emit: true });
    },
    // as bright as the day outside (the street lamps' orange at night)
    tintWindow(S) {
      const m = this.windowMat(S), t = DV.Clock.minutes();
      const day = U.clamp(Math.sin(((t - 330) / 840) * Math.PI) * 1.6, 0, 1);
      m.color.setRGB(0.22 + 0.9 * day, 0.18 + 0.92 * day, 0.12 + 0.94 * day);
    },
  };

  /* ---------------- the shopfronts: every one in a single mesh ---------------- */
  // a canvas atlas (the frame, the door, a window lit and full and the same with its blind down, the
  // OPEN and CLOSED cards, the step's stone, and a fascia for each shop with its name), and the
  // geometry, vertex-coloured: the windows and the cards are re-coloured and re-mapped as the shops
  // open and shut, and everything else darkens with the evening
  function buildFronts(list) {
    const A = DV.MetroKit.canvasTex(512, 512), c = A.ctx;
    c.fillStyle = '#2c2824'; c.fillRect(0, 0, 64, 128); // the frame
    // the door: wood, a glass panel, a brass handle
    c.fillStyle = '#4a3020'; c.fillRect(64, 0, 64, 128);
    c.fillStyle = '#20282c'; c.fillRect(72, 10, 48, 62);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(74, 12, 12, 58);
    c.fillStyle = '#b89a50'; c.fillRect(114, 76, 4, 12);
    c.fillStyle = '#3a2618'; c.fillRect(70, 84, 52, 2); c.fillRect(70, 104, 52, 2);
    // the window, open: a warm room, shelves of goods behind the glass, the sheen of the street on it
    c.fillStyle = '#d8a858'; c.fillRect(128, 0, 128, 128);
    const gl = c.createRadialGradient(192, 30, 4, 192, 50, 110); gl.addColorStop(0, 'rgba(255,240,200,0.8)'); gl.addColorStop(1, 'rgba(120,70,30,0.6)');
    c.fillStyle = gl; c.fillRect(128, 0, 128, 128);
    for (let k = 0; k < 4; k++) {
      c.fillStyle = '#5a3a20'; c.fillRect(132, 28 + k * 24, 120, 3);
      for (let j = 0; j < 12; j++) { c.fillStyle = ['#8a2a20', '#2a4a6a', '#e8d8b0', '#4a6a2a', '#6a5a3a'][(j * 3 + k) % 5]; c.fillRect(134 + j * 10, 16 + k * 24, 7, 12 - ((j + k) % 3) * 2); }
    }
    c.fillStyle = 'rgba(255,255,255,0.1)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(150 + k * 34, 0); c.lineTo(170 + k * 34, 0); c.lineTo(140 + k * 34, 128); c.lineTo(128 + k * 34, 128); c.fill(); }
    // the window, shut: dark glass, the blind down, a line of light under it
    c.fillStyle = '#14181a'; c.fillRect(256, 0, 128, 128);
    c.fillStyle = '#3a3630'; c.fillRect(260, 0, 120, 96);
    for (let y = 4; y < 96; y += 6) { c.fillStyle = '#2a2622'; c.fillRect(260, y, 120, 1); }
    c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(256, 100, 128, 20);
    // the cards in the door
    const card = (y, text, ink) => { c.fillStyle = '#e8e2d0'; c.fillRect(384, y, 64, 32); c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(387, y + 3, 58, 26); c.fillStyle = ink; c.font = 'bold 15px "Arial Narrow", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 416, y + 17); };
    card(0, 'OPEN', '#1a5a2a'); card(32, 'CLOSED', '#8a2018');
    c.drawImage(DV.Tex.get('concrete').image, 0, 0, 64, 64, 448, 0, 64, 64); // the step
    // a fascia for each shop: its name in the shop's own colours
    list.forEach((S, k) => {
      const y = 128 + k * 44;
      c.fillStyle = S.faction === 'candor' ? '#101010' : S.faction === 'amity' ? '#5a2018' : S.faction === 'erudite' ? '#1c2c48' : S.faction === 'dauntless' ? '#141414' : S.faction === 'factionless' ? '#2a2620' : S.id === 'diner' ? '#7a2018' : S.id === 'clinic' ? '#f0f0ea' : '#3a3834';
      c.fillRect(0, y, 512, 44);
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, y, 512, 2); c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(0, y + 42, 512, 2);
      c.fillStyle = S.id === 'clinic' ? '#8a2018' : S.faction === 'dauntless' ? '#e8502a' : S.faction === 'candor' ? '#f0eee6' : '#e8d8a8';
      let size = 26; c.font = 'bold ' + size + 'px Georgia, "Times New Roman", serif';
      while (size > 12 && c.measureText(S.sign).width > 490) { size--; c.font = 'bold ' + size + 'px Georgia, "Times New Roman", serif'; }
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(S.sign, 256, y + 23);
    });
    A.tex.needsUpdate = true;
    const R = { frame: [0, 0, 64, 128], door: [64, 0, 64, 128], open: [128, 0, 128, 128], shut: [256, 0, 128, 128], cOpen: [384, 0, 64, 32], cShut: [384, 32, 64, 32], step: [448, 0, 64, 64] };
    const uvOf = (r) => { const [u0, v0, w, h] = r; return [[u0 / 512, 1 - (v0 + h) / 512], [(u0 + w) / 512, 1 - (v0 + h) / 512], [(u0 + w) / 512, 1 - v0 / 512], [u0 / 512, 1 - v0 / 512]]; };
    const pos = [], uv = [], col = [], base = [], live = []; // live: per shop, the windows' and the card's vertex ranges
    const m = new THREE.Matrix4(), v = new THREE.Vector3();
    const quad = (p0, p1, p2, p3, r, shade) => {
      const P = [p0, p1, p2, p3].map((p) => v.set(p[0], p[1], p[2]).applyMatrix4(m).toArray()), Tq = uvOf(r), at = pos.length / 3;
      for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...P[i]); uv.push(...Tq[i]); col.push(shade, shade, shade); base.push(shade); }
      return at;
    };
    const box = (x, y, z, sx, sy, sz, r) => {
      const x0 = x - sx / 2, x1 = x + sx / 2, y0 = y, y1 = y + sy, z0 = z - sz / 2, z1 = z + sz / 2;
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], r, 0.92);
      quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], r, 0.72);
      quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], r, 0.72);
      quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], r, 1.0);
      quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], r, 0.5);
    };
    list.forEach((S, k) => {
      m.makeRotationY(FROT[S.face]).setPosition(S.x, 0, S.z);
      const fw = U.clamp((S.front || 7) - 0.6, 4.2, 6.4), ww = U.clamp(fw / 2 - 1.05, 0.9, 2.0);
      box(0, 0, 0.3, 1.8, 0.12, 0.6, R.step);
      for (const s of [-1, 1]) box(s * 0.72, 0, 0.06, 0.16, 2.5, 0.12, R.frame);
      box(0, 2.4, 0.06, 1.6, 0.14, 0.12, R.frame);
      quad([-0.64, 0.12, 0.02], [0.64, 0.12, 0.02], [0.64, 2.4, 0.02], [-0.64, 2.4, 0.02], R.door, 0.95);
      const win = [];
      for (const s of [-1, 1]) {
        const cx = s * (0.85 + ww / 2);
        box(cx, 0.45, 0.07, ww + 0.16, 0.12, 0.16, R.frame); // the sill
        box(cx, 2.3, 0.05, ww + 0.16, 0.1, 0.1, R.frame);
        for (const e of [-1, 1]) box(cx + e * (ww / 2 + 0.04), 0.45, 0.05, 0.08, 1.95, 0.1, R.frame);
        win.push(quad([cx - ww / 2, 0.57, 0.03], [cx + ww / 2, 0.57, 0.03], [cx + ww / 2, 2.3, 0.03], [cx - ww / 2, 2.3, 0.03], R.open, 1.0));
      }
      const card = quad([0.08, 1.5, 0.035], [0.42, 1.5, 0.035], [0.42, 1.67, 0.035], [0.08, 1.67, 0.035], R.cOpen, 1.0);
      // the fascia board with the shop's name over it all
      box(0, 2.62, 0.08, fw, 0.62, 0.16, R.frame);
      quad([-fw / 2 + 0.06, 2.66, 0.165], [fw / 2 - 0.06, 2.66, 0.165], [fw / 2 - 0.06, 3.2, 0.165], [-fw / 2 + 0.06, 3.2, 0.165], [0, 128 + k * 44, 512, 44], 1.0);
      live.push({ win, card });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: A.tex, vertexColors: true, fog: true }));
    mesh.name = 'shopfronts';
    const isLive = new Uint8Array(pos.length / 3);
    for (const L of live) for (const at of L.win.concat([L.card])) for (let i = 0; i < 6; i++) isLive[at + i] = 1;
    let last = '';
    const setUV = (at, r) => { const Tq = uvOf(r), a = geo.attributes.uv; [0, 1, 2, 0, 2, 3].forEach((i, j) => a.setXY(at + j, Tq[i][0], Tq[i][1])); a.needsUpdate = true; };
    return {
      mesh, live,
      // open: [bool] per shop; k: the daylight (0.45 at night .. 1)
      light(open, k) {
        const key = open.join() + ':' + k.toFixed(2);
        if (key === last) return;
        last = key;
        const a = geo.attributes.color;
        for (let i = 0; i < base.length; i++) if (!isLive[i]) a.setXYZ(i, base[i] * k, base[i] * k, base[i] * k);
        live.forEach((L, s) => {
          // an open shop's window is lit from inside whatever the hour; a shut one is as dark as the street
          const w = open[s] ? 1.05 : 0.8 * k;
          for (const at of L.win) { setUV(at, open[s] ? R.open : R.shut); for (let i = 0; i < 6; i++) a.setXYZ(at + i, w, w * 0.97, w * 0.92); }
          setUV(L.card, open[s] ? R.cOpen : R.cShut);
          for (let i = 0; i < 6; i++) a.setXYZ(L.card + i, k, k, k);
        });
        a.needsUpdate = true;
      },
    };
  }

  DV.Shops = Shops;
})();
