/* ==========================================================================
   DIVERGENT — HUD & shared UI services
   HUD (location, clock, compass, quest tracker, stamina, prompt), toast
   notifications, subtitles, overhead NPC barks, reading panels, confirm
   dialogs, screen fades, narration text and the completion banner.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const el = U.el;

  const UI = {
    root: null,
    modalOpen: null,

    init() {
      this.root = document.getElementById('ui-root');
      const r = this.root;
      // HUD
      this.hud = el('div', 'hidden', null, r);
      this.hud.id = 'hud';
      this.hud.innerHTML =
        '<div id="hud-loc" class="hud-box"><div class="loc"></div><div class="sub"></div><div class="clock"></div></div>' +
        '<div id="hud-compass" class="hud-box"><div class="strip"></div><div class="center"></div></div>' +
        '<div id="hud-quest" class="hud-box hidden"><div class="qt"></div><div class="qo"></div><div class="qd"></div></div>' +
        '<div id="hud-vitals" class="hud-box"><div class="lbl">Stamina</div><div class="bar stamina"><i></i></div><div class="fearwrap hidden"><div class="lbl">Fear</div><div class="bar fear"><i></i></div></div><div class="noticewrap hidden"><div class="lbl">Order notice</div><div class="bar notice"><i></i></div></div><div class="buffs"></div></div>' +
        '<div id="hud-prompt" class="hud-box hidden"></div>' +
        '<div id="hud-hint" class="hud-box hidden"></div>' +
        '<div id="hud-sim" class="hud-box hidden">SIMULATION</div>' +
        '<div id="hud-fps" class="hud-box hidden"></div>';
      this.subtitleEl = el('div', 'hidden', null, r);
      this.subtitleEl.id = 'hud-subtitle';
      this.notifyEl = el('div', null, null, r);
      this.notifyEl.id = 'hud-notify';
      this.barksEl = el('div', null, null, r);
      this.barksEl.id = 'barks';
      this.simfx = el('div', null, '<div class="scan hidden"></div><div class="vig"></div><div class="glitch"></div>', r);
      this.simfx.id = 'simfx';
      this.narrEl = el('div', null, null, r);
      this.narrEl.id = 'narration';
      this.fader = el('div', null, null, r);
      this.fader.id = 'fader';
      this.q = (s) => this.hud.querySelector(s);
      DV.Events.on('notify', (n) => this.notify(n.text, n.kind));
      DV.Events.on('npc:bark', () => {});
      window.addEventListener('error', (e) => this.showError(e.message + (e.filename ? '\n' + e.filename.split('/').pop() + ':' + e.lineno : '')));
      window.addEventListener('unhandledrejection', (e) => this.showError(String(e.reason)));
    },

    // a window in a bronze frame with bracket corners (css: .ornate, .orn)
    ornate(e) {
      if (!e || e.querySelector(':scope > .orn')) return e;
      e.classList.add('ornate');
      for (const c of ['tl', 'tr', 'bl', 'br']) el('i', 'orn ' + c, null, e);
      return e;
    },

    showError(msg) {
      if (!DV.Config.DEBUG && /ResizeObserver|pointer lock|Pointer lock/i.test(msg)) return;
      let b = document.getElementById('errbox');
      if (!b) { b = el('div', null, null, this.root || document.body); b.id = 'errbox'; b.onclick = () => b.remove(); }
      b.textContent = 'Error: ' + msg + '\n(click to dismiss)';
      console.error(msg);
    },

    showHUD(v) {
      this.hud.classList.toggle('hidden', !v);
      this.barksEl.classList.toggle('hidden', !v);
      this.notifyEl.classList.toggle('hidden', !v && false);
    },

    /* ------------------------------ per-frame HUD ------------------------------ */
    updateHUD(game) {
      if (this.hud.classList.contains('hidden')) return;
      const zone = DV.World.current;
      const p = DV.Player;
      const sim = game.inSimulation();
      // location & clock
      const place = zone && !sim ? zone.placeName(p.x, p.z) : null;
      const loc = place ? place.name : '';
      if (this._loc !== loc) { this._loc = loc; this.q('#hud-loc .loc').textContent = loc; }
      const sub = place ? place.sub : '';
      if (this._sub !== sub) { this._sub = sub; this.q('#hud-loc .sub').textContent = sub; }
      const clk = sim ? '' : 'Day ' + DV.Clock.day() + '  ·  ' + DV.Clock.str();
      if (this._clk !== clk) { this._clk = clk; this.q('#hud-loc .clock').textContent = clk; }
      this.q('#hud-loc').classList.toggle('hidden', sim);
      this.q('#hud-sim').classList.toggle('hidden', !sim);
      this.q('#hud-compass').classList.toggle('hidden', sim);
      // stamina / fear
      this.q('#hud-vitals .stamina i').style.width = U.clamp(p.stamina, 0, 100) + '%';
      const fearWrap = this.q('#hud-vitals .fearwrap');
      fearWrap.classList.toggle('hidden', !sim);
      if (sim) this.q('#hud-vitals .fear i').style.width = U.clamp((game.fear || 0) * 100, 0, 100) + '%';
      // how much the Office of Public Order has noticed you (out in the city, once it's anything)
      const nv = !sim && DV.Order && zone && zone.order ? DV.Order.notice() : 0;
      this.q('#hud-vitals .noticewrap').classList.toggle('hidden', nv < 10);
      if (nv >= 10) this.q('#hud-vitals .notice i').style.width = U.clamp(nv, 0, 100) + '%';
      // buffs
      const buffs = DV.State.data.player.buffs || {};
      const bl = [];
      for (const k in buffs) if (buffs[k] && buffs[k].until > DV.Clock.total()) bl.push(buffs[k].label + ' (+' + buffs[k].amount + ' ' + buffs[k].attr.slice(0, 3).toUpperCase() + ')');
      const bs = bl.join(' · ');
      if (this._buffs !== bs) { this._buffs = bs; this.q('#hud-vitals .buffs').textContent = bs; }
      // quest tracker
      const cur = DV.Quests.current();
      const qb = this.q('#hud-quest');
      if (cur && !sim) {
        qb.classList.remove('hidden');
        const otext = DV.Quests.objText(cur.obj);
        const key = cur.quest.id + cur.obj.id + otext;
        if (this._qk !== key) {
          this._qk = key;
          qb.querySelector('.qt').textContent = cur.quest.title;
          qb.querySelector('.qo').textContent = '◇ ' + otext;
        }
        const dist = this.targetDistance(DV.Quests.objTarget(cur.obj), game);
        qb.querySelector('.qd').textContent = dist !== null ? Math.round(dist) + ' m' : '';
      } else qb.classList.add('hidden');
      this.updateCompass(game, cur && !sim ? DV.Quests.objTarget(cur.obj) : null);
      // prompt
      const pr = DV.Interaction.prompt();
      const pe = this.q('#hud-prompt');
      const show = pr && game.state === 'playing' && !DV.Dialogue.isActive();
      pe.classList.toggle('hidden', !show);
      if (show) {
        const html = '<span class="key">E</span>' + U.esc(pr.label) + ' <span class="nm">' + U.esc(pr.name || '') + '</span>';
        if (this._pr !== html) { this._pr = html; pe.innerHTML = html; }
      }
      // PA / overheard subtitles sit above the dialogue window while you're talking
      const dw = DV.DialogueUI && DV.DialogueUI.el;
      const subB = dw && !dw.classList.contains('hidden') ? dw.offsetHeight + 30 : 140;
      if (this._subB !== subB) { this._subB = subB; this.subtitleEl.style.bottom = subB + 'px'; }
      // hint about mouse capture
      const hint = this.q('#hud-hint');
      const chHint = DV.Chapter && DV.Chapter.active && DV.Chapter.hint && (game.state === 'playing' || game.state === 'cutscene') ? DV.Chapter.hint : null;
      const needHint = chHint || (game.state === 'playing' && !DV.Input.locked && !DV.Input.dragging && game.hintTimer > 0);
      hint.classList.toggle('hidden', !needHint);
      if (needHint) { const t = chHint || 'Click to look around (or hold any mouse button and drag)'; if (hint.textContent !== t) hint.textContent = t; }
      // fps
      const fpsEl = this.q('#hud-fps');
      fpsEl.classList.toggle('hidden', !DV.Settings.get('showFps'));
      if (DV.Settings.get('showFps')) fpsEl.textContent = game.fps + ' fps · ' + game.renderer.info.render.calls + ' calls · ' + Math.round(game.renderer.info.render.triangles / 1000) + 'k tris';
    },

    targetPos(t) {
      if (!t) return null;
      if (t.npc) { const n = DV.NPCs.get(t.npc); return n && n.present ? [n.x, n.z] : null; }
      const zone = DV.World.current;
      if (!zone) return null;
      if (t.spot) { const s = zone.spot(t.spot); return s ? [s.x, s.z] : null; }
      if (t.door) { const d = zone.doorMap[t.door]; return d ? [d.def.x, d.def.z] : null; }
      if (t.room) { const r = zone.roomMap[t.room]; return r ? [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2] : null; }
      if (t.x !== undefined) return [t.x, t.z];
      return null;
    },
    targetDistance(t) {
      if (!DV.Settings.get('questMarkers')) return null;
      const p = this.targetPos(t);
      if (!p) return null;
      return U.dist(p[0], p[1], DV.Player.x, DV.Player.z);
    },
    updateCompass(game, target) {
      const strip = this.q('#hud-compass .strip');
      const yaw = game.rig ? game.rig.yaw : 0;
      // heading in degrees: 0 = north (-z)
      const heading = ((Math.atan2(Math.sin(yaw), -Math.cos(yaw)) * 180) / Math.PI + 360) % 360;
      const W = 360, pxPerDeg = 2.0;
      const marks = [];
      const cards = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
      for (let d = 0; d < 360; d += 15) {
        let rel = ((d - heading + 540) % 360) - 180;
        const x = W / 2 + rel * pxPerDeg;
        if (x < -10 || x > W + 10) continue;
        if (cards[d] !== undefined) marks.push('<span class="mark card" style="left:' + x + 'px">' + cards[d] + '</span>');
        else marks.push('<span class="mark" style="left:' + x + 'px">·</span>');
      }
      if (target && DV.Settings.get('questMarkers')) {
        const p = this.targetPos(target);
        if (p) {
          const dx = p[0] - DV.Player.x, dz = p[1] - DV.Player.z;
          const bearing = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
          let rel = ((bearing - heading + 540) % 360) - 180;
          rel = U.clamp(rel, -88, 88);
          marks.push('<span class="quest" style="left:' + (W / 2 + rel * pxPerDeg) + 'px">▼</span>');
        }
      }
      const html = marks.join('');
      if (this._cmp !== html) { this._cmp = html; strip.innerHTML = html; }
    },

    /* ------------------------------ barks ------------------------------ */
    updateBarks(game) {
      const cam = game.camera;
      const now = performance.now();
      const w = window.innerWidth, h = window.innerHeight;
      const v = new THREE.Vector3();
      const live = new Set();
      for (const n of DV.NPCs.all) {
        if (!n.bark || n.bark.until < now || !n.present || !n.model || !n.model.root.visible || n.dist > 16) continue;
        if (DV.Dialogue.isActive() && DV.Dialogue.active.npcId === n.id) continue;
        v.set(n.x, n.headY() + 0.35, n.z).project(cam);
        if (v.z > 1 || v.z < -1) continue;
        live.add(n.id);
        let e = this.barksEl.querySelector('[data-id="' + n.id + '"]');
        if (!e) {
          e = el('div', 'bark', null, this.barksEl);
          e.dataset.id = n.id;
        }
        const txt = '<span class="bn">' + U.esc(n.def.name) + '</span>' + U.esc(n.bark.text);
        if (e._t !== txt) { e._t = txt; e.innerHTML = txt; }
        e.style.left = ((v.x + 1) / 2) * w + 'px';
        e.style.top = ((1 - v.y) / 2) * h + 'px';
        e.style.opacity = U.clamp((n.bark.until - now) / 600, 0, 1) * U.clamp((16 - n.dist) / 4, 0.3, 1);
      }
      // chapter actors (ceremony speakers, family, initiates) and people in the street
      const others = (list, prefix, range) => {
        for (const a of list) {
          const d = Math.hypot(a.x - cam.position.x, a.z - cam.position.z);
          if (d > range || !a.name || a.bark.quiet) continue;
          v.set(a.x, a.headY() + 0.35, a.z).project(cam);
          if (v.z > 1 || v.z < -1) continue;
          const key = prefix + a.id;
          live.add(key);
          let e = this.barksEl.querySelector('[data-id="' + key + '"]');
          if (!e) { e = el('div', 'bark', null, this.barksEl); e.dataset.id = key; }
          const txt = '<span class="bn">' + U.esc(a.name) + '</span>' + U.esc(a.bark.text);
          if (e._t !== txt) { e._t = txt; e.innerHTML = txt; }
          e.style.left = ((v.x + 1) / 2) * w + 'px';
          e.style.top = ((1 - v.y) / 2) * h + 'px';
          e.style.opacity = U.clamp((a.bark.until - now) / 600, 0, 1) * U.clamp((range - d) / 5, 0.3, 1);
        }
      };
      if (DV.Chapter && DV.Chapter.active) others(DV.Chapter.barkSources(), 'ch:', 22);
      const street = DV.StreetLife && DV.StreetLife.active();
      if (street) others(street.barkSources(), 'st:', 18);
      const order = DV.Order && DV.Order.active();
      if (order) others(order.barkSources(), 'po:', 26);
      const scenes = DV.CityLife && DV.CityLife.active();
      if (scenes) others(scenes.barkSources(), 'cl:', 18);
      const zx = DV.World.current && DV.World.current.extras;
      if (zx) others(zx.barkSources(), 'ex:', 16);
      for (const e of Array.from(this.barksEl.children)) if (!live.has(e.dataset.id)) e.remove();
    },
    // cinematic bars for cutscenes
    letterbox(on) {
      let lb = document.getElementById('letterbox');
      if (!lb) {
        lb = el('div', null, '<i></i><i></i>', this.root);
        lb.id = 'letterbox';
      }
      lb.classList.toggle('on', !!on);
      document.body.classList.toggle('cutscene', !!on);
    },
    clearBarks() {
      this.barksEl.innerHTML = '';
    },

    /* ------------------------------ messages ------------------------------ */
    notify(text, kind) {
      const n = el('div', 'note ' + (kind || ''), U.esc(text), this.notifyEl);
      while (this.notifyEl.children.length > 6) this.notifyEl.firstChild.remove();
      setTimeout(() => n.classList.add('fade'), kind === 'quest' || kind === 'level' ? 5200 : 3800);
      setTimeout(() => n.remove(), kind === 'quest' || kind === 'level' ? 6000 : 4500);
    },
    subtitle(who, text, secs) {
      const s = this.subtitleEl;
      s.innerHTML = (who ? '<span class="who">[' + U.esc(who) + ']</span>' : '') + U.esc(text);
      s.classList.remove('hidden');
      clearTimeout(this._subT);
      this._subT = setTimeout(() => s.classList.add('hidden'), (secs || 5) * 1000);
    },
    // a new place: what was being said (and the old place's title) doesn't follow you
    hush() {
      clearTimeout(this._subT); clearTimeout(this._narT);
      this.subtitleEl.classList.add('hidden');
      this.narrEl.classList.remove('on');
    },
    narrate(text, secs) {
      const n = this.narrEl;
      n.textContent = text;
      n.classList.add('on');
      clearTimeout(this._narT);
      this._narT = setTimeout(() => n.classList.remove('on'), (secs || 3) * 1000);
    },

    /* ------------------------------ reading panel ------------------------------ */
    showReading(title, text, onClose) {
      this.closeReading();
      const p = el('div', 'panel', null, this.root);
      p.id = 'reading';
      p.innerHTML = '<div class="panel-title"></div><div class="body"></div><div class="foot"><span class="btn">Close [E]</span></div>';
      this.ornate(p);
      p.querySelector('.panel-title').textContent = title || '';
      p.querySelector('.body').textContent = text || '';
      p.querySelector('.btn').onclick = () => this.closeReading();
      this.modalOpen = 'reading';
      this._readingClose = onClose;
      DV.Audio.play('open');
      DV.Events.emit('ui:modal', true);
    },
    closeReading() {
      const p = document.getElementById('reading');
      if (p) p.remove();
      if (this.modalOpen === 'reading') this.modalOpen = null;
      const cb = this._readingClose;
      this._readingClose = null;
      if (cb) cb();
      DV.Events.emit('ui:modal', false);
    },
    confirm(title, text, yes, no, labels) {
      const m = el('div', 'panel modal', null, this.root);
      m.innerHTML = '<div class="panel-title"></div><div class="body"></div><div class="foot"><span class="btn b-no"></span><span class="btn b-yes"></span></div>';
      this.ornate(m);
      m.querySelector('.panel-title').textContent = title;
      m.querySelector('.body').textContent = text;
      m.querySelector('.b-yes').textContent = (labels && labels[0]) || 'Yes';
      m.querySelector('.b-no').textContent = (labels && labels[1]) || 'No';
      m.style.zIndex = 70;
      const close = () => m.remove();
      m.querySelector('.b-yes').onclick = () => { close(); DV.Audio.play('click'); if (yes) yes(); };
      m.querySelector('.b-no').onclick = () => { close(); DV.Audio.play('back'); if (no) no(); };
      return m;
    },

    /* ------------------------------ fades & effects ------------------------------ */
    fade(to, ms, white) {
      const f = this.fader;
      f.classList.toggle('white', !!white);
      f.style.transition = 'opacity ' + (ms || 800) + 'ms';
      // force reflow so the transition applies
      void f.offsetWidth;
      f.style.opacity = to;
      return new Promise((res) => setTimeout(res, (ms || 800) + 30));
    },
    setFear(v) {
      this.simfx.querySelector('.vig').style.opacity = U.clamp(v, 0, 1) * 0.9;
    },
    simMode(on) {
      this.simfx.querySelector('.scan').classList.toggle('hidden', !on);
      if (!on) this.setFear(0);
    },
    glitch() {
      const g = this.simfx.querySelector('.glitch');
      g.classList.remove('on');
      void g.offsetWidth;
      g.classList.add('on');
      DV.Audio.play('glitch');
    },
    banner(l1, l2, l3, onClose) {
      const b = el('div', null, '<div class="b1"></div><div class="b2"></div><div class="b3"></div>', this.root);
      b.id = 'banner';
      b.querySelector('.b1').textContent = l1;
      b.querySelector('.b2').textContent = l2 || '';
      b.querySelector('.b3').textContent = l3 || 'Click or press any key to continue exploring';
      setTimeout(() => b.classList.add('on'), 30);
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        b.classList.remove('on');
        setTimeout(() => b.remove(), 1400);
        window.removeEventListener('keydown', kh, true);
        if (onClose) onClose();
      };
      const kh = (e) => { if (performance.now() - t0 > 1500) { e.preventDefault(); close(); } };
      const t0 = performance.now();
      b.onclick = () => { if (performance.now() - t0 > 1500) close(); };
      window.addEventListener('keydown', kh, true);
      this.modalOpen = 'banner';
      return { close };
    },
    loading(on, tip) {
      let l = document.getElementById('loading');
      if (on) {
        if (!l) {
          l = el('div', null, '<div class="lt">Loading</div><div class="lb"><i></i></div><div class="tip"></div>', this.root);
          l.id = 'loading';
        }
        l.querySelector('.tip').textContent = tip || '';
      } else if (l) l.remove();
    },
    openMap() {
      if (DV.RPGMenu) DV.Game.openRPGMenu('map');
    },
  };
  DV.UI = UI;
})();
