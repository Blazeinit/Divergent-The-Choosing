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
    ['case', 'Case'], // (once The Chalk Year has begun)
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

  // the tabs' icons, engraved in bronze: a bust, a star, a satchel, a scroll, the seal, a folded map
  function tabIcon(id) {
    const c = document.createElement('canvas');
    c.width = c.height = 40;
    c.className = 'ti';
    const g = c.getContext('2d');
    const gold = g.createLinearGradient(0, 4, 0, 36);
    gold.addColorStop(0, '#f7dc9c'); gold.addColorStop(0.5, '#c8954a'); gold.addColorStop(1, '#7a5426');
    g.fillStyle = gold; g.strokeStyle = gold; g.lineWidth = 3; g.lineJoin = 'round'; g.lineCap = 'round';
    g.shadowColor = 'rgba(0, 0, 0, 0.9)'; g.shadowOffsetY = 1.5;
    const P = (pts) => { g.beginPath(); pts.forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); };
    if (id === 'character') {
      g.beginPath(); g.arc(20, 13, 7, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(6, 36); g.quadraticCurveTo(7, 22, 20, 22); g.quadraticCurveTo(33, 22, 34, 36); g.closePath(); g.fill();
    } else if (id === 'skills') {
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 7 : 16; g.lineTo(20 + Math.cos(a) * r, 21 + Math.sin(a) * r); }
      g.closePath(); g.fill();
    } else if (id === 'inventory') {
      g.beginPath(); g.moveTo(13, 14); g.quadraticCurveTo(13, 5, 20, 5); g.quadraticCurveTo(27, 5, 27, 14); g.stroke();
      P([[7, 14], [33, 14], [31, 35], [9, 35]]); g.fill();
      g.fillStyle = 'rgba(40, 24, 8, 0.8)'; g.shadowColor = 'transparent'; g.fillRect(10, 19, 20, 2); g.fillRect(18, 19, 4, 6);
    } else if (id === 'quests') {
      g.fillRect(10, 8, 20, 24);
      g.beginPath(); g.arc(10, 10, 4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(30, 30, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(40, 24, 8, 0.8)'; g.shadowColor = 'transparent';
      for (let y = 13; y < 28; y += 4) g.fillRect(14, y, 12, 1.6);
    } else if (id === 'reputation') {
      g.beginPath(); g.moveTo(20, 4); g.lineTo(34, 9); g.quadraticCurveTo(34, 28, 20, 37); g.quadraticCurveTo(6, 28, 6, 9); g.closePath(); g.fill();
      g.fillStyle = 'rgba(40, 24, 8, 0.85)'; g.shadowColor = 'transparent';
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * Math.PI * 2) / 5; g.beginPath(); g.arc(20 + Math.cos(a) * 6.5, 19 + Math.sin(a) * 6.5, 2.2, 0, Math.PI * 2); g.fill(); }
    } else if (id === 'case') {
      g.beginPath(); g.arc(17, 17, 10, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(25, 25); g.lineTo(34, 34); g.stroke();
      g.fillStyle = 'rgba(240, 220, 170, 0.35)'; g.shadowColor = 'transparent'; g.beginPath(); g.arc(14, 14, 3, 0, Math.PI * 2); g.fill();
    } else if (id === 'map') {
      P([[5, 9], [14, 5], [26, 9], [35, 5], [35, 31], [26, 35], [14, 31], [5, 35]]); g.fill();
      g.strokeStyle = 'rgba(40, 24, 8, 0.85)'; g.lineWidth = 1.6; g.shadowColor = 'transparent';
      g.beginPath(); g.moveTo(14, 5); g.lineTo(14, 31); g.moveTo(26, 9); g.lineTo(26, 35); g.stroke();
    }
    return c;
  }

  // you, as you stand: drawn by the game's own renderer into a small target and read back into a
  // canvas (kept until what you look like changes)
  let portraitOf = null, portraitImg = null;
  function portrait(cv) {
    const R = DV.Game.renderer, app = DV.Player.model && DV.Player.model.app, w = cv.width, h = cv.height;
    if (!R || !app) return false;
    const g = cv.getContext('2d');
    if (portraitOf === app && portraitImg) { g.clearRect(0, 0, w, h); g.drawImage(portraitImg, 0, 0, w, h); return true; }
    const m = DV.Character.create(app);
    for (let i = 0; i < 30; i++) m.animate(0.05, { speed: 0, action: 'idle' });
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff0d8, 0x2a2420, 0.8));
    const key = new THREE.DirectionalLight(0xffe0b0, 0.85); key.position.set(2, 2.8, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xa8c0ff, 0.5); rim.position.set(-2.5, 2, -2.5); scene.add(rim);
    m.root.rotation.y = 0.38; // (a three-quarter turn)
    scene.add(m.root);
    m.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m.root), ht = Math.max(1.2, box.max.y - box.min.y);
    const cam = new THREE.PerspectiveCamera(22, w / h, 0.1, 40);
    const d = (ht * 1.0) / (2 * Math.tan((22 * Math.PI) / 360));
    cam.position.set(0.3, box.min.y + ht * 0.6, d); cam.lookAt(0, box.min.y + ht * 0.53, 0);
    const rt = new THREE.WebGLRenderTarget(w, h);
    const was = R.getRenderTarget(), col = R.getClearColor(new THREE.Color()), alpha = R.getClearAlpha();
    let ok = true;
    try {
      R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, cam);
      const px = new Uint8Array(w * h * 4);
      R.readRenderTargetPixels(rt, 0, 0, w, h, px);
      const img = g.createImageData(w, h);
      for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      g.putImageData(img, 0, 0);
      portraitImg = document.createElement('canvas'); portraitImg.width = w; portraitImg.height = h;
      portraitImg.getContext('2d').drawImage(cv, 0, 0);
      portraitOf = app;
    } catch (e) { ok = false; }
    R.setRenderTarget(was); R.setClearColor(col, alpha);
    rt.dispose(); m.dispose();
    return ok;
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
      p.innerHTML = '<div class="rm-head"><div class="rm-em"><canvas width="96" height="96"></canvas></div><div class="rm-id"><div class="nm"></div><div class="sub"></div></div>' +
        '<div class="rm-xp"><div class="k">Experience <span class="xv"></span></div><div class="bar xp"><i></i></div></div><div class="rm-where"><div class="pl"></div><div class="tm"></div></div></div>' +
        '<div class="tabs"></div><div class="content"></div><div class="foot"><span><span class="kc">Tab</span>Close<span class="kc">1</span>\u2013<span class="kc np">6</span>Pages' +
        '<span class="kc">I</span>Inventory<span class="kc">J</span>Journal<span class="kc">M</span>Map</span><span class="ft"></span></div>';
      DV.UI.ornate(p);
      this.el = p;
      const tabs = p.querySelector('.tabs');
      TABS.forEach(([id, name], i) => {
        const t = el('div', 'tab', null, tabs);
        t.appendChild(tabIcon(id));
        el('span', 'tl', name.toUpperCase(), t);
        el('span', 'dot', '\u25cf', t);
        t.dataset.id = id;
        t.title = name + ' [' + (i + 1) + ']';
        t.onmouseenter = () => DV.Audio.play('hover');
        t.onclick = () => { DV.Audio.play('click'); this.show(id); };
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
      const camp = !!(DV.Campaign && DV.Campaign.started());
      this.el.querySelector('.tab[data-id=case]').style.display = camp ? '' : 'none';
      this.el.querySelector('.kc.np').textContent = camp ? '7' : '6';
      this.el.querySelector('.tab[data-id=case]').classList.toggle('new', camp && DV.Campaign.available() && this.tab !== 'case');
      const unread = DV.Quests.all().some((x) => x.q.unread);
      this.el.querySelector('.tab[data-id=quests]').classList.toggle('new', unread);
      this.el.querySelector('.tab[data-id=character]').classList.toggle('new', DV.State.data.player.unspent > 0);
    },
    // the head of the window: your mark, your name and standing, how far to the next level, where and when
    head() {
      const p = DV.State.data.player, F = DV.Factions, h = this.el.querySelector('.rm-head');
      const cv = h.querySelector('.rm-em canvas'), key = (p.faction || 'seal');
      if (cv.dataset.k !== key) { cv.dataset.k = key; DV.Tex.drawEmblem(cv.getContext('2d'), key, 96, p.faction ? (DV.Menus.FC[p.faction] || F.get(p.faction).accent) : '#b8873e'); }
      h.querySelector('.nm').textContent = p.name || 'Initiate';
      h.querySelector('.sub').textContent = 'Level ' + p.level + ' \u00b7 ' + (p.faction ? F.name(p.faction) : 'Undecided') + (p.upbringing && p.upbringing !== p.faction ? ' \u00b7 raised ' + F.name(p.upbringing) : '');
      const nx = DV.Stats.xpForLevel(p.level + 1);
      h.querySelector('.xv').textContent = p.xp + ' / ' + nx;
      h.querySelector('.bar.xp i').style.width = Math.round(U.clamp(p.xp / Math.max(1, nx), 0, 1) * 100) + '%';
      const zone = DV.World.current, sim = DV.Game.inSimulation();
      const place = zone && zone.placeName && !sim ? zone.placeName(DV.Player.x, DV.Player.z) : null;
      h.querySelector('.pl').textContent = sim ? 'The Simulation' : place ? place.name : '';
      h.querySelector('.tm').textContent = sim ? '' : 'Day ' + DV.Clock.day() + '  \u00b7  ' + DV.Clock.str();
    },
    render() {
      this.refreshTabDots();
      this.head();
      const c = this.el.querySelector('.content');
      c.innerHTML = '';
      c.dataset.tab = this.tab;
      this.el.querySelector('.ft').textContent = 'Faction before blood';
      this['render_' + this.tab](c);
    },

    /* ------------------------------ CHARACTER ------------------------------ */
    render_character(c) {
      const p = DV.State.data.player;
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col', null, cols), b = el('div', 'col', null, cols), d = el('div', 'col', null, cols);
      a.style.width = '33%'; b.style.width = '37%'; d.style.flex = '1';
      // the portrait, in a frame, with a nameplate
      const fr = el('div', 'portrait', '<canvas width="168" height="216"></canvas><div class="plate"><span class="pn"></span><span class="pf"></span></div>', a);
      fr.querySelector('.pn').textContent = p.name;
      fr.querySelector('.pf').textContent = p.faction ? DV.Factions.name(p.faction) + ' initiate' : 'Undecided';
      if (!portrait(fr.querySelector('canvas'))) fr.classList.add('none');
      el('div', 'h', 'Identity', a);
      const kv = (box, k, v, cls) => el('div', 'kv', '<span class="k">' + k + '</span><span class="v ' + (cls || '') + '">' + v + '</span>', box);
      kv(a, 'SEX', p.sex === 'f' ? 'Female' : 'Male');
      kv(a, 'RAISED', DV.Factions.name(p.upbringing));
      kv(a, 'CANDIDATE NO.', DV.State.flag('checked_in') ? '4-17 · Group 4 · Room 4' : 'Not checked in', DV.State.flag('checked_in') ? null : 'dim');
      kv(a, 'CURRENT FACTION', p.faction ? DV.Factions.name(p.faction).toUpperCase() : 'UNDECIDED', p.faction ? 'accent' : 'dim');
      kv(a, 'APTITUDE RESULT', DV.Aptitude.displayResult(), DV.State.data.aptitude.status === 'complete' ? 'accent' : 'dim');
      kv(a, 'WEARING', U.esc(this.outfitName(p.outfit)));

      el('div', 'h', 'Attributes' + (p.unspent > 0 ? ' — <span class="good">' + p.unspent + ' point' + (p.unspent > 1 ? 's' : '') + ' to spend</span>' : ''), b);
      const descBox = el('div', 'descbox', null, d);
      const describe = (at) => { descBox.innerHTML = '<div class="h">' + at.name + '</div><div class="desc">' + U.esc(at.desc) + '</div>'; };
      for (const at of DV.RPG.attributes) {
        const base = DV.Stats.baseAttr(at.id), cur = DV.Stats.attr(at.id);
        const row = el('div', 'attr-row' + (this.selAttr === at.id ? ' sel' : ''), null, b);
        let pips = '';
        for (let i = 1; i <= 10; i++) pips += '<i class="' + (i <= base ? 'on' : i <= cur ? 'buff' : '') + '"></i>';
        row.innerHTML = '<span class="nm">' + at.name + '</span><span class="val">' + cur + '</span><span class="pips">' + pips + '</span>';
        if (p.unspent > 0 && base < DV.RPG.ATTR_MAX) {
          const plus = el('span', 'btn small', '+', row);
          plus.onclick = (e) => { e.stopPropagation(); if (DV.Stats.spendPoint(at.id)) { DV.Audio.play('levelup'); this.render(); } };
        }
        row.onmouseenter = () => { this.selAttr = at.id; b.querySelectorAll('.attr-row').forEach((r) => r.classList.toggle('sel', r === row)); describe(at); };
      }
      el('div', 'sep', null, b);
      el('div', 'faint', 'Attributes gate dialogue and world checks. Faction never limits them — any build can choose any faction.', b).style.fontSize = '12px';
      describe(DV.RPG.attributes.find((x) => x.id === this.selAttr));

      el('div', 'h', 'Condition', d);
      const st = Math.round(DV.Player.stamina);
      el('div', 'cond', '<span class="k">STAMINA</span><div class="bar stamina"><i style="width:' + st + '%"></i></div><span class="v">' + st + '</span>', d);
      const buffs = p.buffs || {};
      let any = false;
      for (const k in buffs) if (buffs[k] && buffs[k].until > DV.Clock.total()) { any = true; kv(d, U.esc(buffs[k].label), '+' + buffs[k].amount + ' ' + U.capitalize(buffs[k].attr), 'good'); }
      if (!any) kv(d, 'EFFECTS', 'None', 'dim');
      el('div', 'h', 'Journal', d);
      const jn = DV.State.data.journal.slice(-5).reverse();
      if (!jn.length) el('div', 'log', 'Nothing noted yet.', d);
      for (const j of jn) el('div', 'log', '<b>' + U.formatTime(j.t) + '</b>' + U.esc(j.text), d);
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

    /* ------------------------------ CASE ------------------------------ */
    // The Chalk Year: what you know, what you hold, who stands with you, and what you've noted
    render_case(c) {
      const K = DV.Campaign, st = K.st();
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col', null, cols);
      a.style.width = '52%';
      el('div', 'h', 'The Case', a);
      for (const line of K.summary()) el('div', 'faint', line, a).style.cssText = 'margin:0 0 6px;font-size:13px;color:var(--text)';
      const nx = K.next();
      const nxl = el('div', 'faint', nx ? 'Next: ' + nx.title + ' (Day ' + nx.day + ')' : st.ending ? 'The Chalk Year is over: ' + K.ENDINGS[st.ending].name + '.' : 'Nothing on the board.', a);
      nxl.style.cssText = 'margin:8px 0 2px;color:var(--accent-2)';
      el('div', 'sep', null, a);
      el('div', 'h', 'Proof', a);
      for (const id of Object.keys(K.PIECES)) {
        const d = K.PIECES[id], got = st.pieces[id];
        if (!got && !d.hard) continue; // (the optional pieces appear once you hold them)
        const row = el('div', 'kv', null, a);
        row.innerHTML = '<span class="k" style="' + (got ? '' : 'opacity:.45') + '">' + (got ? '\u25c6 ' : '\u25c7 ') + U.esc(got ? d.name : 'Not yet found \u00b7 ' + (d.faction ? DV.Factions.name(d.faction) : '')) + '</span><span class="v" style="color:' + (got ? (got.how === 'handed' ? 'var(--dim)' : 'var(--good)') : 'var(--dim)') + '">' + (got ? (got.how === 'handed' ? 'testimony' : 'in hand') : '') + '</span>';
        if (got) row.title = d.text;
      }
      const b = el('div', 'col', null, cols);
      b.style.flex = '1';
      el('div', 'h', 'People', b);
      const met = Object.keys(K.ALLIES).filter((id) => K.isDead(id) || (st.trust[id] !== undefined && (K.ALLIES[id].faction === K.faction() || (DV.State.data.npcs[id] && DV.State.data.npcs[id].mem && DV.State.data.npcs[id].mem.met) || st.act >= 3)));
      for (const id of met) {
        const d = K.ALLIES[id], dead = K.isDead(id), v = K.trustOf(id);
        const row = el('div', 'kv', null, b);
        row.innerHTML = '<span class="k">' + U.esc(d.name) + ' <span class="faint">\u00b7 ' + (d.faction === 'factionless' ? 'Factionless' : DV.Factions.name(d.faction)) + '</span></span><span class="v" style="letter-spacing:2px;color:' + (dead ? 'var(--danger)' : v >= 3 ? 'var(--good)' : 'var(--dim)') + '">' + (dead ? 'dead' : '\u25cf'.repeat(v) + '\u25cb'.repeat(5 - v)) + '</span>';
      }
      if (!met.length) el('div', 'faint', 'Nobody yet.', b);
      el('div', 'sep', null, b);
      el('div', 'h', 'Notes', b);
      const notes = st.clues.filter((x) => x.kind !== 'trust').slice(-7).reverse();
      if (!notes.length) el('div', 'faint', 'Nothing written down.', b);
      for (const n of notes) { const r = el('div', 'faint', 'Day ' + n.day + ' \u2014 ' + n.text, b); r.style.cssText = 'margin:0 0 5px;font-size:12px;color:var(--text)'; }
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
      for (let k = 1; k <= TABS.length; k++) if (input.consume('Digit' + k) && (TABS[k - 1][0] !== 'case' || (DV.Campaign && DV.Campaign.started()))) this.show(TABS[k - 1][0]);
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
