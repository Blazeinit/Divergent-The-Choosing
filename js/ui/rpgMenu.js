/* ==========================================================================
   DIVERGENT — RPG menu (TAB)
   CHARACTER · SKILLS · INVENTORY · QUESTS · REPUTATION · MAP
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const el = U.el;

  const TABS = [
    ['character', 'Character'],
    ['skills', 'Skills'],
    ['inventory', 'Inventory'],
    ['quests', 'Quests'],
    ['reputation', 'Reputation'],
    ['map', 'Map'],
  ];

  function itemIcon(def, size) {
    size = size || 28;
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    c.className = 'icon';
    c.style.width = c.style.height = size + 'px';
    const g = c.getContext('2d');
    const ic = def.icon || { shape: 'box', color: '#888' };
    g.fillStyle = '#0c0c0c'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = ic.color;
    switch (ic.shape) {
      case 'shirt':
        g.fillRect(4, 4, 8, 10); g.fillRect(1, 4, 3, 5); g.fillRect(12, 4, 3, 5);
        g.fillStyle = ic.color2 || 'rgba(0,0,0,0.35)'; g.fillRect(7, 4, 2, 5);
        break;
      case 'cup': g.fillRect(5, 5, 6, 8); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(5, 5, 6, 2); break;
      case 'bar': g.fillRect(2, 6, 12, 5); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(2, 10, 12, 1); break;
      case 'card': g.fillRect(2, 4, 12, 8); g.fillStyle = ic.color2 || '#555'; g.fillRect(3, 5, 4, 3); g.fillRect(8, 9, 5, 1); break;
      case 'paper': g.fillRect(4, 2, 8, 12); g.fillStyle = 'rgba(0,0,0,0.4)'; for (let y = 5; y < 13; y += 2) g.fillRect(5, y, 6, 1); break;
      case 'key': g.fillRect(3, 6, 4, 4); g.fillRect(7, 7, 7, 2); g.fillRect(11, 9, 1, 2); g.fillRect(13, 9, 1, 2); break;
      case 'book': g.fillRect(3, 3, 10, 11); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(4, 4, 1, 9); break;
      case 'bottle': g.fillRect(6, 3, 4, 2); g.fillRect(5, 5, 6, 8); break;
      case 'token': g.beginPath(); g.arc(8, 8, 5, 0, 6.3); g.fill(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(6, 7, 4, 2); break;
      default: g.fillRect(3, 3, 10, 10);
    }
    return c;
  }

  const M = {
    el: null,
    tab: 'character',
    invCat: 'all',
    selItem: null,
    selQuest: null,
    selAttr: 'strength',

    init() {
      const p = el('div', 'panel hidden', null, DV.UI.root);
      p.id = 'rpgmenu';
      p.innerHTML = '<div class="tabs"></div><div class="content"></div><div class="foot"><span>TAB — close · 1-6 — tabs</span><span class="ft"></span></div>';
      this.el = p;
      const tabs = p.querySelector('.tabs');
      TABS.forEach(([id, name], i) => {
        const t = el('div', 'tab', name.toUpperCase(), tabs);
        t.dataset.id = id;
        t.onclick = () => { DV.Audio.play('click'); this.show(id); };
        void i;
      });
      DV.Events.on('inventory:changed', () => { if (this.isOpen() && this.tab === 'inventory') this.render(); });
      DV.Events.on('player:stats', () => { if (this.isOpen() && this.tab === 'character') this.render(); });
    },
    isOpen() {
      return !this.el.classList.contains('hidden');
    },
    open(tab) {
      this.el.classList.remove('hidden');
      DV.Audio.play('open');
      this.show(tab || this.tab);
    },
    close() {
      this.el.classList.add('hidden');
      DV.Audio.play('back');
    },
    show(tab) {
      this.tab = tab;
      this.el.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.id === tab));
      this.render();
    },
    refreshTabDots() {
      const qt = this.el.querySelector('.tab[data-id=quests]');
      const unread = DV.Quests.all().some((x) => x.q.unread);
      qt.innerHTML = 'QUESTS' + (unread ? ' <span class="dot">●</span>' : '');
      const ct = this.el.querySelector('.tab[data-id=character]');
      ct.innerHTML = 'CHARACTER' + (DV.State.data.player.unspent > 0 ? ' <span class="dot">●</span>' : '');
    },
    render() {
      this.refreshTabDots();
      const c = this.el.querySelector('.content');
      c.innerHTML = '';
      const p = DV.State.data.player;
      this.el.querySelector('.ft').textContent = p.name + ' · Level ' + p.level + ' · Day ' + DV.Clock.day() + ' ' + DV.Clock.str();
      this['render_' + this.tab](c);
    },

    /* ------------------------------ CHARACTER ------------------------------ */
    render_character(c) {
      const p = DV.State.data.player;
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col', null, cols);
      a.style.width = '34%';
      const em = document.createElement('canvas');
      em.width = em.height = 96;
      em.style.cssText = 'width:72px;height:72px;float:right;margin:2px 0 6px 8px;';
      DV.Tex.drawEmblem(em.getContext('2d'), p.faction || 'seal', 96, p.faction ? DV.Factions.get(p.faction).accent : '#8a7a5a');
      a.appendChild(em);
      el('div', 'h', 'Identity', a);
      const kv = (k, v, cls) => el('div', 'kv', '<span class="k">' + k + '</span><span class="v ' + (cls || '') + '">' + v + '</span>', a);
      kv('NAME', U.esc(p.name));
      kv('LEVEL', p.level);
      const nx = DV.Stats.xpForLevel(p.level + 1);
      kv('EXPERIENCE', p.xp + ' / ' + nx);
      kv('SEX', p.sex === 'f' ? 'Female' : 'Male');
      kv('RAISED', DV.Factions.name(p.upbringing));
      kv('CANDIDATE NO.', DV.State.flag('checked_in') ? '4-17 · Group 4 · Room 4' : 'Not checked in', DV.State.flag('checked_in') ? null : 'dim');
      kv('CURRENT FACTION', p.faction ? DV.Factions.name(p.faction).toUpperCase() : 'UNDECIDED', p.faction ? 'accent' : 'dim');
      kv('APTITUDE RESULT', DV.Aptitude.displayResult(), DV.State.data.aptitude.status === 'complete' ? 'accent' : 'dim');
      kv('WEARING', U.esc(this.outfitName(p.outfit)));
      el('div', 'h', 'Condition', a);
      kv('STAMINA', Math.round(DV.Player.stamina) + ' / 100');
      const buffs = p.buffs || {};
      let any = false;
      for (const k in buffs) if (buffs[k] && buffs[k].until > DV.Clock.total()) { any = true; kv(U.esc(buffs[k].label), '+' + buffs[k].amount + ' ' + U.capitalize(buffs[k].attr), 'good'); }
      if (!any) kv('EFFECTS', 'None', 'dim');
      el('div', 'h', 'Journal', a);
      const jn = DV.State.data.journal.slice(-5).reverse();
      if (!jn.length) el('div', 'log', 'Nothing noted yet.', a);
      for (const j of jn) el('div', 'log', '<b>' + U.formatTime(j.t) + '</b>' + U.esc(j.text), a);

      const b = el('div', 'col', null, cols);
      b.style.width = '38%';
      el('div', 'h', 'Attributes' + (p.unspent > 0 ? ' — <span class="good">' + p.unspent + ' point' + (p.unspent > 1 ? 's' : '') + ' to spend</span>' : ''), b);
      for (const at of DV.RPG.attributes) {
        const base = DV.Stats.baseAttr(at.id), cur = DV.Stats.attr(at.id);
        const row = el('div', 'attr-row', null, b);
        let pips = '';
        for (let i = 1; i <= 10; i++) pips += '<i class="' + (i <= base ? 'on' : i <= cur ? 'buff' : '') + '"></i>';
        row.innerHTML = '<span class="nm">' + at.name + '</span><span class="val">' + cur + '</span><span class="pips">' + pips + '</span>';
        if (p.unspent > 0 && base < DV.RPG.ATTR_MAX) {
          const plus = el('span', 'btn small', '+', row);
          plus.onclick = (e) => { e.stopPropagation(); if (DV.Stats.spendPoint(at.id)) { DV.Audio.play('levelup'); this.render(); } };
        }
        row.onmouseenter = () => { this.selAttr = at.id; descBox.innerHTML = '<div class="h">' + at.name + '</div><div class="desc">' + U.esc(at.desc) + '</div>'; };
      }
      el('div', 'sep', null, b);
      el('div', 'faint', 'Attributes gate dialogue and world checks. Faction never limits them — any build can choose any faction.', b).style.fontSize = '12px';

      const d = el('div', 'col', null, cols);
      d.style.flex = '1';
      const descBox = el('div', null, null, d);
      const at0 = DV.RPG.attributes.find((x) => x.id === this.selAttr);
      descBox.innerHTML = '<div class="h">' + at0.name + '</div><div class="desc">' + U.esc(at0.desc) + '</div>';
    },
    outfitName(o) {
      if (o === 'neutral') return 'Neutral Testing Garments';
      const it = DV.Items.get('clothes_' + o);
      return it ? it.name : o;
    },

    /* ------------------------------ SKILLS ------------------------------ */
    render_skills(c) {
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col', null, cols);
      a.style.width = '55%';
      el('div', 'h', 'Skills', a);
      const desc = el('div', 'col', null, cols);
      desc.style.flex = '1';
      for (const s of DV.RPG.skills) {
        const v = DV.Stats.skill(s.id);
        const row = el('div', 'attr-row', null, a);
        row.innerHTML = '<span class="nm">' + s.name + '</span><span class="val">' + v + '</span><span class="pips"><i style="flex:none;width:' + v * 1.6 + 'px" class="on"></i></span>';
        row.onmouseenter = () => {
          desc.innerHTML = '<div class="h">' + s.name + '</div><div class="desc">' + U.esc(s.desc) + '</div><div class="sep"></div><div class="kv"><span class="k">GOVERNED BY</span><span class="v">' +
            s.attrs.map((x) => U.capitalize(x)).join(' + ') + '</span></div><div class="kv"><span class="k">BASE (FROM ATTRIBUTES)</span><span class="v">' + DV.Stats.skillBase(s.id) + '</span></div><div class="kv"><span class="k">TRAINED</span><span class="v">+' + (v - DV.Stats.skillBase(s.id)) + '</span></div>';
        };
      }
      desc.innerHTML = '<div class="h">Skills</div><div class="desc">Skills grow by doing. Run to train Athletics; examine the world to train Observation; win arguments to train Persuasion. Each skill starts from the attributes that govern it.</div>';
    },

    /* ------------------------------ INVENTORY ------------------------------ */
    render_inventory(c) {
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col', null, cols);
      a.style.width = '46%';
      const st = el('div', 'subtabs', null, a);
      const cats = [['all', 'All'], ['clothing', 'Clothing'], ['consumable', 'Consumables'], ['quest', 'Quest Items'], ['misc', 'Miscellaneous']];
      for (const [id, nm] of cats) {
        const t = el('div', 'subtab' + (this.invCat === id ? ' on' : ''), nm, st);
        t.onclick = () => { this.invCat = id; this.render(); };
      }
      const list = this.invCat === 'all' ? DV.Inventory.list() : DV.Inventory.byCategory(this.invCat);
      if (!list.length) el('div', 'faint', 'Nothing here.', a).style.padding = '8px';
      const detail = el('div', 'col', null, cols);
      detail.style.flex = '1';
      if (this.selItem && !DV.Inventory.has(this.selItem)) this.selItem = null;
      for (const e of list) {
        const def = DV.Items.get(e.id);
        if (!def) continue;
        const it = el('div', 'list-item' + (this.selItem === e.id ? ' on' : ''), null, a);
        it.appendChild(itemIcon(def));
        el('span', null, U.esc(def.name) + (DV.Inventory.equipped(e.id) ? ' <span class="good">(worn)</span>' : ''), it);
        if (e.qty > 1) el('span', 'qty', '×' + e.qty, it);
        it.onclick = () => { this.selItem = e.id; DV.Audio.play('click'); this.render(); };
      }
      if (!this.selItem && list.length) this.selItem = list[0].id;
      const def = this.selItem && DV.Items.get(this.selItem);
      if (def) {
        const head = el('div', null, null, detail);
        head.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:6px';
        head.appendChild(itemIcon(def, 48));
        el('div', null, '<div class="h" style="margin:0;border:none">' + U.esc(def.name) + '</div><div class="faint" style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase">' +
          { clothing: 'Clothing', consumable: 'Consumable', quest: 'Quest Item', misc: 'Miscellaneous' }[def.cat] + (def.quest ? ' · cannot be discarded' : '') + '</div>', head);
        el('div', 'desc', U.esc(def.desc), detail);
        el('div', 'sep', null, detail);
        const btns = el('div', null, null, detail);
        if (def.usable) {
          const label = def.use.type === 'equip' ? (DV.Inventory.equipped(def.id) ? 'Wearing' : 'Wear') : def.use.type === 'read' || def.use.type === 'action' ? 'Read / Inspect' : 'Use';
          const b = el('span', 'btn' + (DV.Inventory.equipped(def.id) ? ' disabled' : ''), label, btns);
          b.onclick = () => {
            const r = DV.Inventory.use(def.id);
            if (r.message) DV.UI.notify(r.message);
            if (r.read) DV.UI.showReading(r.read.title, r.read.text);
            if (DV.Dialogue.isActive()) this.close();
            this.render();
          };
        }
        if (!def.quest && def.cat !== 'clothing') {
          const d = el('span', 'btn', 'Discard', btns);
          d.onclick = () => DV.UI.confirm('Discard', 'Throw away the ' + def.name + '?', () => { DV.Inventory.remove(def.id, 1); this.render(); });
        }
      } else el('div', 'faint', 'Select an item.', detail);
    },

    /* ------------------------------ QUESTS ------------------------------ */
    render_quests(c) {
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col', null, cols);
      a.style.width = '38%';
      const all = DV.Quests.all();
      const groups = [['Active', (x) => DV.Quests.isActive(x.id)], ['Completed', (x) => x.q.state === 'complete'], ['Failed', (x) => x.q.state === 'failed']];
      if (!this.selQuest || !DV.Quests.started(this.selQuest)) this.selQuest = DV.Quests.tracked || (all[0] && all[0].id);
      for (const [nm, f] of groups) {
        const list = all.filter(f);
        if (!list.length) continue;
        el('div', 'h', nm, a);
        for (const x of list) {
          const st = DV.Quests.displayState(x.id);
          const it = el('div', 'list-item' + (this.selQuest === x.id ? ' on' : ''), null, a);
          el('span', null, (x.def.type === 'main' ? '★ ' : '') + U.esc(x.def.title), it);
          const s = el('span', 'st', st, it);
          s.style.color = st === 'UPDATED' ? '#ffd36a' : st === 'COMPLETE' ? 'var(--good)' : st === 'FAILED' ? 'var(--danger)' : 'var(--dim)';
          it.onclick = () => { this.selQuest = x.id; DV.Audio.play('click'); this.render(); };
        }
      }
      if (!all.length) el('div', 'faint', 'No quests yet.', a).style.padding = '8px';
      const d = el('div', 'col', null, cols);
      d.style.flex = '1';
      if (this.selQuest) {
        const def = DV.QuestDB.get(this.selQuest), q = DV.Quests.q(this.selQuest);
        DV.Quests.markRead(this.selQuest);
        el('div', 'h', U.esc(def.title) + ' — ' + DV.Quests.displayState(this.selQuest), d);
        el('div', 'desc', U.esc(def.summary), d);
        el('div', 'h', 'Objectives', d);
        for (const o of def.objectives) {
          const s = q.objectives[o.id];
          if (s === 'hidden') continue;
          el('div', 'obj ' + (s === 'done' ? 'done' : s === 'failed' ? 'failed' : ''), U.esc(DV.Quests.objText(o)), d);
        }
        if (DV.Quests.isActive(this.selQuest)) {
          const tb = el('span', 'btn small', DV.Quests.tracked === this.selQuest ? 'Tracked' : 'Track', d);
          tb.style.marginTop = '6px';
          tb.onclick = () => { DV.Quests.tracked = this.selQuest; this.render(); };
        }
        el('div', 'h', 'Log', d);
        for (const l of q.log.slice().reverse()) el('div', 'log', '<b>' + U.formatTime(l.t) + '</b>' + U.esc(l.text), d);
      }
      this.refreshTabDots();
    },

    /* ------------------------------ REPUTATION ------------------------------ */
    render_reputation(c) {
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col', null, cols);
      a.style.width = '52%';
      el('div', 'h', 'Faction Standing', a);
      for (const f of DV.Factions.order) {
        const v = DV.Reputation.get(f);
        const fd = DV.Factions.get(f);
        const row = el('div', 'rep-row', null, a);
        const cv = document.createElement('canvas');
        cv.width = cv.height = 72;
        cv.className = 'em';
        DV.Tex.drawEmblem(cv.getContext('2d'), f, 72, f === 'candor' ? '#e8e6e0' : fd.accent, '#0d0d0d');
        row.appendChild(cv);
        el('span', 'rn', fd.name, row);
        const bar = el('span', 'rb', '<span class="mid"></span>', row);
        const fill = el('i', null, null, bar);
        const pct = Math.abs(v) / 2;
        fill.style.cssText = v >= 0 ? 'left:50%;width:' + pct + '%;background:linear-gradient(180deg,#a8d88a,#4e8a37)' : 'right:50%;width:' + pct + '%;background:linear-gradient(180deg,#e07060,#8a2a1c)';
        el('span', 'rl', DV.Reputation.label(v) + ' (' + (v > 0 ? '+' : '') + v + ')', row);
        row.title = fd.description;
      }
      el('div', 'sep', null, a);
      el('div', 'faint', 'Reputation shifts how members of each faction treat you. Tomorrow you choose one of them — or none of them.', a).style.fontSize = '12px';
      const b = el('div', 'col', null, cols);
      b.style.flex = '1';
      el('div', 'h', 'People You Know', b);
      const known = DV.NPCData.list.filter((d) => DV.State.data.npcs[d.id] && DV.State.data.npcs[d.id].mem.met);
      if (!known.length) el('div', 'faint', 'You haven\'t really spoken to anyone yet.', b);
      for (const d of known) {
        const disp = DV.Reputation.disposition(d.id);
        const row = el('div', 'kv', null, b);
        row.innerHTML = '<span class="k">' + U.esc(d.name) + ' <span class="faint">· ' + DV.Factions.name(d.faction) + '</span></span><span class="v" style="color:' +
          (disp >= 10 ? 'var(--good)' : disp <= -15 ? 'var(--danger)' : 'var(--dim)') + '">' + DV.Reputation.dispositionLabel(disp) + '</span>';
      }
    },

    /* ------------------------------ MAP ------------------------------ */
    // two maps: the place you're in (its rooms), and the whole city (DV.WorldMap)
    render_map(c) {
      const zone = DV.World.current;
      const wrap = el('div', 'col', null, c);
      wrap.style.cssText = 'flex:1;padding:0;position:relative';
      const cv = document.createElement('canvas');
      cv.id = 'map-canvas';
      wrap.appendChild(cv);
      const info = el('div', null, null, wrap);
      info.style.cssText = 'position:absolute;left:10px;top:8px;font-family:var(--serif);letter-spacing:0.1em;color:var(--accent);font-size:13px;pointer-events:none';
      if (!zone || DV.Game.inSimulation()) {
        info.textContent = 'NO MAP AVAILABLE';
        return;
      }
      // out in the streets (or anywhere the city map knows), the city's the map you want
      const here = zone.roomAt(DV.Player.x, DV.Player.z);
      const inCity = zone.city && zone.city.walk && (!here || here.noMap);
      if (!this.mapView) this.mapView = inCity ? 'city' : 'local';
      if (inCity && this._mapZone !== 'city:' + zone.id) this.mapView = 'city';
      this._mapZone = inCity ? 'city:' + zone.id : zone.id;
      const bar = el('div', null, null, wrap);
      bar.style.cssText = 'position:absolute;right:10px;top:6px;display:flex;gap:6px';
      const btn = (label, on, fn) => { const b = el('span', 'btn small' + (on ? ' on' : ''), label, bar); b.onclick = () => { DV.Audio.play('click'); fn(); }; return b; };
      btn('Local', this.mapView === 'local', () => { this.mapView = 'local'; this.render(); });
      btn('City', this.mapView === 'city', () => { this.mapView = 'city'; this.render(); });
      if (this.mapView === 'city') {
        const W = DV.WorldMap, redraw = () => W.draw(cv);
        btn('+', false, () => { W.zoomBy(1.4, cv.width / 2, cv.height / 2); redraw(); });
        btn('−', false, () => { W.zoomBy(1 / 1.4, cv.width / 2, cv.height / 2); redraw(); });
        btn('Fit', false, () => { W.reset(); redraw(); });
        const me = W.you();
        info.textContent = 'THE CITY' + (me ? ' — YOU ARE AT ' + me[3].toUpperCase() : '');
        requestAnimationFrame(redraw);
        W.attach(cv, redraw);
        this._redrawCity = redraw;
        return;
      }
      this._redrawCity = null;
      info.textContent = (zone.def.name + ' — ' + (zone.def.region || '')).toUpperCase();
      requestAnimationFrame(() => this.drawMap(cv, zone));
      cv.onmousemove = (e) => {
        if (!this._mo) return; // not drawn yet
        const r = cv.getBoundingClientRect();
        const wx = (e.clientX - r.left - this._mo[0]) / this._ms + zone.bx0;
        const wz = (e.clientY - r.top - this._mo[1]) / this._ms + zone.bz0;
        const room = zone.roomAt(wx, wz);
        const vis = room && (DV.State.zoneState(zone.id).visited[room.id] || room.exterior);
        const tip = room && !room.noMap ? (vis ? room.name : 'Unexplored') : '';
        if (DV.Cursor.enabled()) cv.dataset.tip = tip; else cv.title = tip;
      };
    },
    drawMap(cv, zone) {
      const w = (cv.width = cv.clientWidth || 800), h = (cv.height = cv.clientHeight || 500);
      const g = cv.getContext('2d');
      const b = zone.def.bounds;
      const s = Math.min((w - 40) / (b.x1 - b.x0), (h - 40) / (b.z1 - b.z0));
      const ox = (w - (b.x1 - b.x0) * s) / 2, oy = (h - (b.z1 - b.z0) * s) / 2;
      this._ms = s; this._mo = [ox, oy];
      const X = (x) => ox + (x - zone.bx0) * s, Y = (z) => oy + (z - zone.bz0) * s;
      g.fillStyle = '#0b0c0d'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.03)';
      for (let x = Math.ceil(b.x0 / 4) * 4; x < b.x1; x += 4) { g.beginPath(); g.moveTo(X(x), oy); g.lineTo(X(x), h - oy); g.stroke(); }
      for (let z = Math.ceil(b.z0 / 4) * 4; z < b.z1; z += 4) { g.beginPath(); g.moveTo(ox, Y(z)); g.lineTo(w - ox, Y(z)); g.stroke(); }
      const vis = DV.State.zoneState(zone.id).visited;
      for (const r of zone.rooms) {
        if (r.noMap) continue;
        const seen = vis[r.id] || r.exterior;
        g.fillStyle = seen ? (r.exterior ? 'rgba(90,110,80,0.35)' : r.staffOnly ? 'rgba(120,70,50,0.45)' : 'rgba(150,130,95,0.38)') : 'rgba(40,40,40,0.5)';
        g.fillRect(X(r.x0), Y(r.z0), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
        g.strokeStyle = seen ? '#cfb27a' : '#3a3a3a';
        g.lineWidth = 1;
        g.strokeRect(X(r.x0) + 0.5, Y(r.z0) + 0.5, (r.x1 - r.x0) * s - 1, (r.z1 - r.z0) * s - 1);
        if (seen && (r.x1 - r.x0) * s > 40) {
          g.fillStyle = '#e8dcc0';
          g.font = Math.max(9, Math.min(12, s * 1.2)) + 'px Trebuchet MS';
          g.textAlign = 'center';
          const words = r.name.toUpperCase();
          g.fillText(words.length * 6 > (r.x1 - r.x0) * s ? words.split(' ')[0] : words, X((r.x0 + r.x1) / 2), Y((r.z0 + r.z1) / 2) + 4);
        }
      }
      // doors
      for (const d of zone.doors) {
        g.fillStyle = d.lock ? (DV.Story.playerCanPass(d.lock, d) ? '#7fd07f' : '#d05040') : d.sealed ? '#803020' : '#cfcfcf';
        const hw = (d.w / 2) * s;
        if (d.horizontal) g.fillRect(X(d.def.x) - hw, Y(d.def.z) - 1.5, hw * 2, 3);
        else g.fillRect(X(d.def.x) - 1.5, Y(d.def.z) - hw, 3, hw * 2);
      }
      // known NPCs
      for (const n of DV.NPCs.all) {
        if (!n.present || !DV.State.npc(n.id).mem.met) continue;
        g.fillStyle = DV.Factions.get(n.def.faction).accent;
        g.fillRect(X(n.x) - 2, Y(n.z) - 2, 4, 4);
      }
      // quest target
      const cur = DV.Quests.current();
      if (cur) {
        const p = DV.UI.targetPos(DV.Quests.objTarget(cur.obj));
        if (p) { g.fillStyle = '#ffd36a'; g.font = '14px serif'; g.textAlign = 'center'; g.fillText('★', X(p[0]), Y(p[1]) + 5); }
      }
      // player
      const px = X(DV.Player.x), py = Y(DV.Player.z), r = DV.Player.rot;
      g.save();
      g.translate(px, py);
      g.rotate(-r + Math.PI);
      g.fillStyle = '#ffe08a';
      g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(0, 3); g.lineTo(-5, 6); g.closePath(); g.fill();
      g.restore();
      g.fillStyle = '#a39a89';
      g.font = '11px Trebuchet MS';
      g.textAlign = 'left';
      g.fillText('■ staff area   ■ public   ★ objective   ▲ you   red door: locked · green: you have access', 12, h - 10);
    },

    update(input) {
      for (let k = 1; k <= TABS.length; k++) if (input.consume('Digit' + k)) this.show(TABS[k - 1][0]);
      // the city map: + and − zoom, and the "you" ring pulses
      if (this.tab === 'map' && this._redrawCity) {
        const cv = document.getElementById('map-canvas');
        if (input.consume('Equal') || input.consume('NumpadAdd')) DV.WorldMap.zoomBy(1.4, cv.width / 2, cv.height / 2);
        if (input.consume('Minus') || input.consume('NumpadSubtract')) DV.WorldMap.zoomBy(1 / 1.4, cv.width / 2, cv.height / 2);
        this._mapT = (this._mapT || 0) + 1;
        if (this._mapT % 3 === 0) this._redrawCity();
      }
    },
  };
  M.itemIcon = itemIcon;
  DV.RPGMenu = M;
})();
