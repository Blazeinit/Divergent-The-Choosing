/* ==========================================================================
   DIVERGENT — RPG menu (TAB)
   CHARACTER · SKILLS & PERKS · FACTIONS · JOURNAL · INVENTORY · CODEX · MAP
   (and the CASE, once The Chalk Year has begun)
   Character is a paper doll round the game's own render of you; Skills &
   Perks draws every tree (js/data/perks.js) to learn from; Factions shows
   standing, titles, the faction's tree and its manifesto; the Journal keeps
   quests, notes and where experience comes from; the Codex the lore you've
   picked up. Q / E turn the pages, 1–8 jump to one, the arrows and Enter work
   inside a page, and every page answers the mouse (and the game's cursor).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const el = U.el;

  const TABS = [
    ['character', 'Character'],
    ['skills', 'Skills & Perks'],
    ['factions', 'Factions'],
    ['quests', 'Journal'],
    ['inventory', 'Inventory'],
    ['codex', 'Codex'],
    ['map', 'Map'],
    ['case', 'Case'], // (once The Chalk Year has begun)
  ];
  const ALIAS = { reputation: 'factions', journal: 'quests', perks: 'skills' };
  // the line at the foot of each page
  const FOOT = { character: 'Faction before blood', skills: 'What you practise, you become', factions: 'Every faction keeps a ledger of you', quests: 'Write it down, or it didn\'t happen', inventory: 'Carry only what you need', codex: 'Knowledge is order', map: 'The city, from above' };

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
      case 'tin': g.fillRect(4, 4, 8, 9); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(4, 4, 8, 1); g.fillRect(4, 12, 8, 1); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(5, 7, 6, 3); break;
      case 'jar': g.fillRect(4, 5, 8, 9); g.fillStyle = '#d8d0c0'; g.fillRect(5, 3, 6, 2); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(5, 6, 1, 6); break;
      case 'scrip': g.fillRect(2, 4, 12, 8); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(3, 5, 10, 1); g.fillRect(3, 10, 10, 1); g.beginPath(); g.arc(8, 8, 2, 0, 6.3); g.fill(); break;
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
    } else if (id === 'codex') {
      P([[4, 9], [19, 12], [19, 35], [4, 32]]); g.fill(); P([[36, 9], [21, 12], [21, 35], [36, 32]]); g.fill();
      g.fillStyle = 'rgba(40, 24, 8, 0.8)'; g.shadowColor = 'transparent';
      for (let y = 17; y < 30; y += 4) { g.fillRect(7, y, 9, 1.4); g.fillRect(24, y, 9, 1.4); }
    } else if (id === 'factions' || id === 'reputation') {
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
    selTree: 'athletics',
    selPerk: null,
    selFaction: null,
    selCodex: null,
    journalView: 'quests',

    init() {
      const p = el('div', 'panel hidden', null, DV.UI.root);
      p.id = 'rpgmenu';
      p.innerHTML = '<div class="rm-head"><div class="rm-em"><canvas width="96" height="96"></canvas></div><div class="rm-id"><div class="nm"></div><div class="sub"></div></div>' +
        '<div class="rm-pts"></div>' +
        '<div class="rm-xp"><div class="k">Experience <span class="xv"></span></div><div class="bar xp"><i></i></div></div><div class="rm-where"><div class="pl"></div><div class="tm"></div></div></div>' +
        '<div class="tabs"></div><div class="content"></div><div class="foot"><span><span class="kc">Tab</span>Close<span class="kc">Q</span><span class="kc">E</span>Page<span class="kc">1</span>–<span class="kc np">7</span>' +
        '<span class="kc">↑↓←→</span>Choose<span class="kc">Enter</span>Select<span class="kc">M</span>Map</span><span class="ft"></span></div><div class="rm-tip hidden"></div>';
      DV.UI.ornate(p);
      this.el = p;
      this.tipEl = p.querySelector('.rm-tip');
      const tabs = p.querySelector('.tabs');
      TABS.forEach(([id, name], i) => {
        const t = el('div', 'tab', null, tabs);
        t.appendChild(tabIcon(id));
        el('span', 'tl', name.toUpperCase(), t);
        el('span', 'dot', '●', t);
        t.dataset.id = id;
        t.title = name + ' [' + (i + 1) + ']';
        t.onmouseenter = () => DV.Audio.play('hover');
        t.onclick = () => { this.show(id); };
      });
      const rr = () => { if (this.isOpen()) this.render(); };
      DV.Events.on('inventory:changed', () => { if (this.isOpen() && (this.tab === 'inventory' || this.tab === 'character')) this.render(); });
      DV.Events.on('player:stats', () => { if (this.isOpen() && this.tab === 'character') this.render(); });
      DV.Events.on('perks:changed', rr);
      DV.Fanfare.init();
    },
    isOpen() {
      return !this.el.classList.contains('hidden');
    },
    open(tab) {
      this.el.classList.remove('hidden');
      DV.Audio.play('open');
      if (DV.Codex) DV.Codex.refresh();
      this.show(tab || this.tab, true);
    },
    close() {
      this.el.classList.add('hidden');
      this.tip(null);
      DV.Audio.play('back');
    },
    // the pages you can turn to right now (the Case only once The Chalk Year has begun)
    tabs() {
      const camp = !!(DV.Campaign && DV.Campaign.started());
      return TABS.map((t) => t[0]).filter((id) => id !== 'case' || camp);
    },
    show(tab, quiet) {
      tab = ALIAS[tab] || tab;
      if (this.tabs().indexOf(tab) < 0) tab = 'character';
      if (!quiet && tab !== this.tab) DV.Audio.play('page');
      this.tab = tab;
      this.tip(null);
      this.el.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.id === tab));
      this.render();
    },
    step(d) {
      const ts = this.tabs(), i = ts.indexOf(this.tab);
      this.show(ts[(i + d + ts.length) % ts.length]);
    },
    refreshTabDots() {
      const camp = !!(DV.Campaign && DV.Campaign.started());
      this.el.querySelector('.tab[data-id=case]').style.display = camp ? '' : 'none';
      this.el.querySelector('.kc.np').textContent = camp ? '8' : '7';
      this.el.querySelector('.tab[data-id=case]').classList.toggle('new', camp && DV.Campaign.available() && this.tab !== 'case');
      const unread = DV.Quests.all().some((x) => x.q.unread);
      this.el.querySelector('.tab[data-id=quests]').classList.toggle('new', unread);
      const p = DV.State.data.player;
      this.el.querySelector('.tab[data-id=character]').classList.toggle('new', p.unspent > 0);
      this.el.querySelector('.tab[data-id=skills]').classList.toggle('new', DV.Perks.points() > 0 && this.anyAvailable());
      this.el.querySelector('.tab[data-id=codex]').classList.toggle('new', DV.Codex.unread().length > 0 && this.tab !== 'codex');
    },
    anyAvailable() {
      return DV.PerkData.trees.some((t) => t.perks.some((x) => DV.Perks.canUnlock(x.id).ok));
    },
    // the head of the window: your mark, your name and standing, points to spend, how far to the next level, where and when
    head() {
      const p = DV.State.data.player, F = DV.Factions, h = this.el.querySelector('.rm-head');
      const cv = h.querySelector('.rm-em canvas'), key = (p.faction || 'seal');
      if (cv.dataset.k !== key) { cv.dataset.k = key; DV.Tex.drawEmblem(cv.getContext('2d'), key, 96, p.faction ? (DV.Menus.FC[p.faction] || F.get(p.faction).accent) : '#b8873e'); }
      h.querySelector('.nm').textContent = p.name || 'Initiate';
      const title = p.faction && DV.FactionStanding.titles[p.faction] ? ' · ' + DV.Reputation.standing(p.faction).title : '';
      h.querySelector('.sub').textContent = 'Level ' + p.level + ' · ' + (p.faction ? F.name(p.faction) : 'Undecided') + title + (p.upbringing && p.upbringing !== p.faction ? ' · raised ' + F.name(p.upbringing) : '');
      const pts = h.querySelector('.rm-pts');
      pts.innerHTML = (p.unspent > 0 ? '<span class="pt a" data-tip="Attribute points: spend them on the Character page">' + p.unspent + '<i>ATTR</i></span>' : '') + (DV.Perks.points() > 0 ? '<span class="pt k" data-tip="Perk points: spend them on the Skills & Perks page">' + DV.Perks.points() + '<i>PERK</i></span>' : '');
      const lo = DV.Stats.xpForLevel(p.level), nx = DV.Stats.xpForLevel(p.level + 1), max = p.level >= DV.Stats.maxLevel();
      h.querySelector('.xv').textContent = max ? p.xp + ' · MAX' : p.xp + ' / ' + nx;
      h.querySelector('.bar.xp i').style.width = (max ? 100 : Math.round(U.clamp((p.xp - lo) / Math.max(1, nx - lo), 0, 1) * 100)) + '%';
      const zone = DV.World.current, sim = DV.Game.inSimulation();
      const place = zone && zone.placeName && !sim ? zone.placeName(DV.Player.x, DV.Player.z) : null;
      h.querySelector('.pl').textContent = sim ? 'The Simulation' : place ? place.name : '';
      h.querySelector('.tm').textContent = sim ? '' : 'Day ' + DV.Clock.day() + '  ·  ' + DV.Clock.str();
    },
    render() {
      this.refreshTabDots();
      this.head();
      const c = this.el.querySelector('.content');
      const keep = c.querySelector('.col.scrollkeep');
      const scroll = keep ? keep.scrollTop : 0;
      c.innerHTML = '';
      c.dataset.tab = this.tab;
      this.el.querySelector('.ft').textContent = FOOT[this.tab] || 'Faction before blood';
      this['render_' + this.tab](c);
      const k2 = c.querySelector('.col.scrollkeep');
      if (k2 && this._lastTab === this.tab) k2.scrollTop = scroll;
      this._lastTab = this.tab;
    },

    /* ------------------------------ tooltips ------------------------------ */
    // a rich tooltip that follows the cursor (the game's or the system's)
    tip(html, e) {
      const t = this.tipEl;
      if (!t) return;
      if (!html) { t.classList.add('hidden'); return; }
      t.innerHTML = html;
      t.classList.remove('hidden');
      if (e) this.placeTip(e);
    },
    placeTip(e) {
      const t = this.tipEl, r = this.el.getBoundingClientRect();
      let x = e.clientX - r.left + 18, y = e.clientY - r.top + 20;
      const w = t.offsetWidth, h = t.offsetHeight;
      if (x + w > r.width - 6) x = e.clientX - r.left - w - 14;
      if (y + h > r.height - 6) y = r.height - h - 6;
      t.style.left = Math.max(6, x) + 'px'; t.style.top = Math.max(6, y) + 'px';
    },
    tipOn(node, html) {
      node.addEventListener('mouseenter', (e) => this.tip(typeof html === 'function' ? html() : html, e));
      node.addEventListener('mousemove', (e) => { if (!this.tipEl.classList.contains('hidden')) this.placeTip(e); });
      node.addEventListener('mouseleave', () => this.tip(null));
    },

    /* ------------------------------ CHARACTER ------------------------------ */
    // a paper doll (you, as the game draws you, with what you wear and carry in its slots),
    // the attributes to spend points on, and what they add up to
    render_character(c) {
      const p = DV.State.data.player;
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col doll-col', null, cols), b = el('div', 'col', null, cols), d = el('div', 'col scrollkeep', null, cols);
      a.style.width = '36%'; b.style.width = '34%'; d.style.flex = '1';
      const doll = el('div', 'doll', null, a);
      const left = el('div', 'slots', null, doll);
      const fr = el('div', 'portrait', '<canvas width="168" height="216"></canvas><div class="plate"><span class="pn"></span><span class="pf"></span></div>', doll);
      const right = el('div', 'slots', null, doll);
      fr.querySelector('.pn').textContent = p.name;
      fr.querySelector('.pf').textContent = p.faction ? (DV.FactionStanding.titles[p.faction] ? DV.Reputation.standing(p.faction).title : DV.Factions.name(p.faction)) : 'Undecided';
      if (!portrait(fr.querySelector('canvas'))) fr.classList.add('none');
      const has = (id) => id && DV.Inventory.has(id) && DV.Items.get(id);
      const up = DV.RPG.upbringings.find((u) => u.id === p.upbringing);
      const wornId = p.outfit === 'neutral' ? 'neutral_garments' : 'clothes_' + p.outfit;
      const pocket = DV.Inventory.list().map((e) => DV.Items.get(e.id)).find((x) => x && x.cat === 'consumable');
      const slot = (box, label, def, empty) => {
        const s = el('div', 'slot' + (def ? '' : ' empty'), null, box);
        if (def) s.appendChild(itemIcon(def, 34)); else el('span', 'ph', '◇', s);
        el('span', 'sl', label, s);
        this.tipOn(s, def ? '<b>' + U.esc(def.name) + '</b><div class="tk">' + label + '</div><div>' + U.esc(def.desc) + '</div>' : '<b>' + label + '</b><div>' + empty + '</div>');
        if (def) s.onclick = () => { this.selItem = def.id; this.show('inventory'); };
      };
      slot(left, 'Worn', has(wornId) || DV.Items.get(wornId), 'Nothing.');
      slot(left, 'Keepsake', has(up && up.item), 'Something from home, if you kept it.');
      slot(left, 'Credentials', has('staff_keycard') || has('name_badge'), 'No badge. Martha at the front desk has yours.');
      slot(right, 'Pocket', pocket, 'Nothing to eat or drink.');
      slot(right, 'Papers', has('result_slip') || has('protocol_file') || has('sealed_envelope'), 'No papers.');
      const fm = el('div', 'slot mark', null, right);
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; fm.appendChild(cv);
      const fk = p.faction || 'seal';
      DV.Tex.drawEmblem(cv.getContext('2d'), fk, 64, p.faction ? (DV.Menus.FC[p.faction] || DV.Factions.get(p.faction).accent) : '#8a6630');
      el('span', 'sl', 'Faction', fm);
      this.tipOn(fm, () => p.faction ? '<b>' + DV.Factions.name(p.faction) + '</b><div class="tk">' + U.esc(DV.Factions.get(p.faction).motto) + '</div><div>' + U.esc(DV.Reputation.standing(p.faction).title) + '</div>' : '<b>Undecided</b><div>You choose at the Ceremony.</div>');
      fm.onclick = () => { this.selFaction = p.faction || p.upbringing; this.show('factions'); };

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
      const describe = (at) => {
        const sk = DV.RPG.skills.filter((s) => s.attrs.indexOf(at.id) >= 0).map((s) => s.name);
        descBox.innerHTML = '<div class="h">' + at.name + '</div><div class="desc">' + U.esc(at.desc) + '</div><div class="kv"><span class="k">GOVERNS</span><span class="v">' + (sk.join(', ') || '—') + '</span></div>';
      };
      const rows = [];
      for (const at of DV.RPG.attributes) {
        const base = DV.Stats.baseAttr(at.id), cur = DV.Stats.attr(at.id);
        const row = el('div', 'attr-row' + (this.selAttr === at.id ? ' sel' : ''), null, b);
        rows.push(row);
        let pips = '';
        for (let i = 1; i <= 10; i++) pips += '<i class="' + (i <= base ? 'on' : i <= cur ? 'buff' : '') + '"></i>';
        row.innerHTML = '<span class="nm">' + at.name + '</span><span class="val">' + cur + '</span><span class="pips">' + pips + '</span>';
        row.dataset.attr = at.id;
        if (p.unspent > 0 && base < DV.RPG.ATTR_MAX) {
          const plus = el('span', 'btn small', '+', row);
          plus.onclick = (e) => { e.stopPropagation(); this.spend(at.id); };
        }
        row.onmouseenter = () => { this.selAttr = at.id; rows.forEach((r) => r.classList.toggle('sel', r === row)); describe(at); };
      }
      el('div', 'sep', null, b);
      // what your numbers add up to
      el('div', 'h', 'In Practice', b);
      const S = DV.Stats, st = (k) => S.attr(k);
      const hp = Math.round(100 + st('strength') * 4 + st('resolve') * 4);
      const dmg = (0.74 + st('strength') * 0.052 + S.skill('melee') / 420) * (1 + DV.Perks.mod('melee.dmg'));
      kv(b, 'IN A FIGHT', hp + ' health · ×' + dmg.toFixed(2) + ' damage');
      kv(b, 'RUNNING', Math.round(100 * (1 - U.clamp((S.skill('athletics') - 20) / 160, 0, 0.4)) * Math.max(0.2, 1 + DV.Perks.mod('sprint.drain'))) + '% stamina cost');
      kv(b, 'PERKS', Object.keys(p.perks || {}).length + ' learned' + (DV.Perks.dormant().length ? ' · <span class="bad">' + DV.Perks.dormant().length + ' dormant</span>' : ''));
      el('div', 'faint', 'Attributes gate dialogue and world checks. Faction never limits them — any build can choose any faction. Hover for what each one governs; Enter or + spends a point.', b).style.fontSize = '12px';
      describe(DV.RPG.attributes.find((x) => x.id === this.selAttr));

      el('div', 'h', 'Level ' + p.level, d);
      const lo = S.xpForLevel(p.level), nx = S.xpForLevel(p.level + 1);
      el('div', 'cond', '<span class="k">NEXT LEVEL</span><div class="bar xp"><i style="width:' + Math.round(U.clamp((p.xp - lo) / Math.max(1, nx - lo), 0, 1) * 100) + '%"></i></div><span class="v">' + (p.level >= S.maxLevel() ? 'MAX' : nx - p.xp) + '</span>', d);
      el('div', 'faint', 'Each level: ' + DV.RPG.attrPointsAt() + ' attribute point and 1 perk point (2 at levels ' + DV.RPG.PERK_MILESTONES.join(', ') + ').', d).style.fontSize = '11.5px';
      el('div', 'h', 'Condition', d);
      const sm = Math.round(DV.Player.stamina);
      el('div', 'cond', '<span class="k">STAMINA</span><div class="bar stamina"><i style="width:' + sm + '%"></i></div><span class="v">' + sm + '</span>', d);
      const buffs = p.buffs || {};
      let any = false;
      for (const k in buffs) if (buffs[k] && buffs[k].until > DV.Clock.total()) { any = true; kv(d, U.esc(buffs[k].label), '+' + buffs[k].amount + ' ' + U.capitalize(buffs[k].attr), 'good'); }
      if (!any) kv(d, 'EFFECTS', 'None', 'dim');
      el('div', 'h', 'Journal', d);
      const jn = DV.State.data.journal.slice(-5).reverse();
      if (!jn.length) el('div', 'log', 'Nothing noted yet.', d);
      for (const j of jn) el('div', 'log', '<b>' + U.formatTime(j.t) + '</b>' + U.esc(j.text), d);
    },
    spend(attr) {
      if (DV.Stats.spendPoint(attr)) { DV.Audio.play('levelup'); this.render(); return true; }
      DV.Audio.play('error');
      return false;
    },
    outfitName(o) {
      if (o === 'neutral') return 'Neutral Testing Garments';
      const it = DV.Items.get('clothes_' + o);
      return it ? it.name : o;
    },

    /* ------------------------------ SKILLS & PERKS ------------------------------ */
    // the trees you can see: every skill, the five factions, and Divergent if the test couldn't sort you
    trees() { return DV.PerkData.trees.filter((t) => DV.Perks.treeVisible(t)); },
    render_skills(c) {
      const K = DV.Perks, D = DV.PerkData;
      const trees = this.trees();
      if (!trees.find((t) => t.id === this.selTree)) this.selTree = trees[0].id;
      const tree = D.tree(this.selTree);
      if (!this.selPerk || !tree.perks.find((x) => x.id === this.selPerk)) this.selPerk = (tree.perks.find((x) => K.status(x.id) === 'available') || tree.perks[0]).id;
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col tree-list scrollkeep', null, cols);
      a.style.width = '29%';
      const b = el('div', 'col tree-view', null, cols);
      b.style.flex = '1';
      el('div', 'h', 'Perk points: <span class="' + (K.points() ? 'good' : 'dim') + '">' + K.points() + '</span>', a);
      const group = (title, list) => {
        el('div', 'tgrp', title, a);
        for (const t of list) {
          const learned = t.perks.filter((x) => K.owned(x.id)).length, avail = t.perks.some((x) => K.canUnlock(x.id).ok);
          const row = el('div', 'list-item tree-row' + (t.id === this.selTree ? ' on' : '') + (avail ? ' avail' : ''), null, a);
          row.dataset.tree = t.id;
          el('span', 'tg', t.glyph, row);
          el('span', 'tn', U.esc(K.treeName(t)), row);
          const v = t.kind === 'skill' ? DV.Stats.skill(t.skill) : t.kind === 'faction' ? DV.Reputation.standing(t.faction).title : 'Lv ' + DV.State.data.player.level;
          el('span', 'tv', '<b>' + U.esc(String(v)) + '</b><i>' + '◆'.repeat(learned) + '◇'.repeat(t.perks.length - learned) + '</i>', row);
          if (t.kind === 'skill') { const fb = el('span', 'tfrac', '<i style="width:' + Math.round(DV.Stats.skillFrac(t.skill) * 100) + '%"></i>', row); void fb; }
          row.onmouseenter = () => DV.Audio.play('hover', { volume: 0.4 });
          row.onclick = () => { this.selTree = t.id; this.selPerk = null; DV.Audio.play('click'); this.render(); };
        }
      };
      group('Skills', trees.filter((t) => t.kind === 'skill'));
      group('Factions', trees.filter((t) => t.kind !== 'skill'));

      // the tree: its name, what it is, three tiers of perks joined to the tier below
      const head = el('div', 'tv-head', null, b);
      el('span', 'tvg', tree.glyph, head);
      const hd = el('div', null, null, head);
      el('div', 'tvn', U.esc(K.treeName(tree)), hd);
      let sub = '';
      if (tree.kind === 'skill') {
        const sd = DV.Stats.skillDef(tree.skill);
        sub = 'Skill ' + DV.Stats.skill(tree.skill) + ' · governed by ' + sd.attrs.map((x) => U.capitalize(x)).join(' + ') + ' · ' + U.esc(sd.desc);
      } else if (tree.kind === 'faction') {
        const st = DV.Reputation.standing(tree.faction);
        sub = U.esc(DV.Factions.get(tree.faction).motto) + ' · Standing: ' + U.esc(st.title) + ' (' + st.label + (st.member ? ', member' : '') + ') · ' + U.esc(tree.blurb);
      } else sub = U.esc(tree.blurb);
      el('div', 'tvs', sub, hd);
      const grid = el('div', 'tiers', null, b);
      if (tree.faction) grid.dataset.f = tree.faction; else if (tree.kind === 'divergent') grid.dataset.f = 'divergent';
      for (let tier = 3; tier >= 1; tier--) {
        const open = K.tierOpen(tree, tier);
        const row = el('div', 'tier' + (open ? ' open' : ''), null, grid);
        el('div', 'tl', '<b>' + ['I', 'II', 'III'][tier - 1] + '</b><span>' + (open ? 'Open' : U.esc(K.tierNeeds(tree, tier))) + '</span>', row);
        const nodes = el('div', 'nodes', null, row);
        for (const pk of tree.perks.filter((x) => x.tier === tier)) {
          const s = K.status(pk.id);
          const n = el('div', 'pk ' + s + (pk.id === this.selPerk ? ' sel' : ''), null, nodes);
          n.dataset.perk = pk.id;
          el('span', 'pg', tree.glyph, n);
          el('span', 'pn', U.esc(pk.name), n);
          el('span', 'ps', { owned: 'Learned', dormant: 'Dormant', available: 'Learn · 1 pt', locked: 'Locked' }[s], n);
          this.tipOn(n, () => this.perkTip(pk));
          n.onclick = () => {
            if (this.selPerk === pk.id && K.status(pk.id) === 'available') { this.learn(pk.id); return; }
            this.selPerk = pk.id; DV.Audio.play('click'); this.render();
          };
          n.ondblclick = () => this.learn(pk.id);
        }
      }
      // the selected perk, and the button that learns it
      const pk = D.perk(this.selPerk), s = K.status(pk.id), can = K.canUnlock(pk.id);
      const det = el('div', 'pk-detail ' + s, null, b);
      el('div', 'pdn', U.esc(pk.name) + ' <span class="ptier">Tier ' + ['I', 'II', 'III'][pk.tier - 1] + '</span>', det);
      el('div', 'desc', U.esc(pk.desc), det);
      el('div', 'pdr', s === 'owned' ? '<span class="good">Learned.</span>' : s === 'dormant' ? '<span class="bad">Dormant: you no longer stand where this needs you. ' + U.esc(K.tierNeeds(tree, pk.tier)) + '.</span>' : can.ok ? 'Costs 1 perk point.' : '<span class="bad">' + U.esc(can.why) + '</span>', det);
      if (s === 'available') { const btn = el('span', 'btn learn', 'Learn [Enter]', det); btn.onclick = () => this.learn(pk.id); }
    },
    perkTip(pk) {
      const K = DV.Perks, s = K.status(pk.id), tree = DV.PerkData.tree(pk.tree), can = K.canUnlock(pk.id);
      return '<b>' + U.esc(pk.name) + '</b><div class="tk">' + U.esc(K.treeName(tree)) + ' · Tier ' + ['I', 'II', 'III'][pk.tier - 1] + '</div><div>' + U.esc(pk.desc) + '</div>' +
        '<div class="ts ' + s + '">' + (s === 'owned' ? 'Learned' : s === 'dormant' ? 'Dormant — ' + U.esc(K.tierNeeds(tree, pk.tier)) : can.ok ? 'Click again (or Enter) to learn' : U.esc(can.why)) + '</div>';
    },
    learn(id) {
      const r = DV.Perks.unlock(id);
      if (!r.ok) { DV.Audio.play('error'); DV.UI.notify(r.why); return false; }
      this.render();
      const n = this.el.querySelector('.pk[data-perk="' + id + '"]');
      if (n) n.classList.add('just');
      return true;
    },

    /* ------------------------------ FACTIONS ------------------------------ */
    render_factions(c) {
      const p = DV.State.data.player, F = DV.Factions;
      const list = F.order;
      if (!this.selFaction || list.indexOf(this.selFaction) < 0) this.selFaction = p.faction || p.upbringing || 'abnegation';
      const f = this.selFaction, fd = F.get(f), st = DV.Reputation.standing(f);
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col', null, cols);
      a.style.width = '31%';
      el('div', 'h', 'Faction Standing', a);
      for (const id of list) {
        const s = DV.Reputation.standing(id);
        const row = el('div', 'list-item fac-row' + (id === f ? ' on' : ''), null, a);
        row.dataset.f = id;
        const cv = document.createElement('canvas'); cv.width = cv.height = 48; cv.className = 'em';
        DV.Tex.drawEmblem(cv.getContext('2d'), id, 48, id === 'candor' ? '#e8e6e0' : F.get(id).accent, '#0d0d0d');
        row.appendChild(cv);
        el('span', 'fn', '<b>' + F.name(id) + '</b><i>' + U.esc(s.title) + (s.member ? ' · member' : '') + '</i>', row);
        el('span', 'fv ' + (s.value > 0 ? 'good' : s.value < 0 ? 'bad' : 'dim'), (s.value > 0 ? '+' : '') + s.value, row);
        row.onmouseenter = () => DV.Audio.play('hover', { volume: 0.4 });
        row.onclick = () => { this.selFaction = id; DV.Audio.play('click'); this.render(); };
      }
      el('div', 'sep', null, a);
      el('div', 'faint', 'Standing shifts how a faction\'s people treat you, which of their perks you can learn, and how their checks push back. Members start two ranks ahead; those raised in a faction one, until they choose another.', a).style.fontSize = '11.5px';

      const b = el('div', 'col fac-page scrollkeep', null, cols);
      b.style.flex = '1';
      b.dataset.f = f;
      const top = el('div', 'fac-top', null, b);
      const big = document.createElement('canvas'); big.width = big.height = 112; big.className = 'fem';
      DV.Tex.drawEmblem(big.getContext('2d'), f, 112, f === 'candor' ? '#e8e6e0' : fd.accent, '#0d0d0d');
      top.appendChild(big);
      const id = el('div', 'fid', null, top);
      el('div', 'fnm', fd.name.toUpperCase(), id);
      el('div', 'fvt', U.esc(fd.virtue) + (fd.motto && fd.motto !== '—' ? ' · “' + U.esc(fd.motto) + '”' : ''), id);
      const rel = st.member ? (st.transfer ? 'Member · transfer from ' + F.name(p.upbringing) : 'Member · born to it') : st.raised ? (p.faction ? 'Raised here · left for ' + F.name(p.faction) : 'Raised here') : 'Outsider';
      el('div', 'frel', rel, id);
      el('div', 'ftitle', 'They call you <b>' + U.esc(st.title) + '</b> · ' + st.label, id);
      // the standing bar: -100..100 with the tier boundaries marked
      const bar = el('div', 'stand', null, b);
      const pct = (v) => ((v + 100) / 200) * 100;
      for (const lim of DV.FactionStanding.limits.slice(0, -1)) el('i', 'tick', null, bar).style.left = pct(lim) + '%';
      const fill = el('b', 'fill ' + (st.value >= 0 ? 'pos' : 'neg'), null, bar);
      fill.style.left = pct(Math.min(0, st.value)) + '%'; fill.style.width = Math.abs(st.value) / 2 + '%';
      el('span', 'you', null, bar).style.left = pct(st.value) + '%';
      const titles = DV.FactionStanding.titles[f];
      const lab = el('div', 'stand-l', null, b);
      titles.forEach((t, i) => { const s = el('span', i === st.idx ? 'on' : '', U.esc(t), lab); s.style.left = pct(((i === 0 ? -100 : DV.FactionStanding.limits[i - 1]) + (i === 6 ? 100 : DV.FactionStanding.limits[i])) / 2) + '%'; });
      el('div', 'fnext', st.next ? 'Next: <b>' + U.esc(st.next.title) + '</b> at ' + (st.next.at > 0 ? '+' : '') + st.next.at + ' (' + (st.next.at - st.value) + ' to go)' : 'They can think no better of you.', b);
      // their tree
      const tree = DV.PerkData.tree(f);
      if (tree) {
        el('div', 'h', 'The ' + fd.name + ' Way', b);
        const learned = tree.perks.filter((x) => DV.Perks.owned(x.id));
        const rank = DV.Perks.treeRank(f);
        el('div', 'kv', '<span class="k">TIERS OPEN</span><span class="v">' + ([1, 2, 3].filter((t) => rank >= t).map((t) => ['I', 'II', 'III'][t - 1]).join(' · ') || 'None yet') + '</span>', b);
        el('div', 'kv', '<span class="k">PERKS LEARNED</span><span class="v">' + (learned.length ? learned.map((x) => U.esc(x.name) + (DV.Perks.active(x.id) ? '' : ' <span class="bad">(dormant)</span>')).join(', ') : 'None') + '</span>', b);
        const go = el('span', 'btn small', 'Open the tree', b);
        go.style.marginTop = '6px';
        go.onclick = () => { this.selTree = f; this.selPerk = null; this.show('skills'); };
      }
      // their words
      el('div', 'h', 'Manifesto', b);
      const known = DV.Codex.isOpen('manifesto_' + f);
      if (known) {
        el('div', 'manifesto', U.esc(fd.manifesto.split('\n\n')[0]) + '<span class="more"> …</span>', b);
        const rd = el('span', 'btn small', 'Read it in the Codex', b);
        rd.onclick = () => { this.selCodex = 'manifesto_' + f; this.show('codex'); };
      } else el('div', 'faint', 'You don\'t know their words yet. Meet their people, or walk their streets.', b);
      // their people you know
      el('div', 'h', 'People You Know', b);
      const ppl = DV.NPCData.list.filter((d) => d.faction === f && DV.State.data.npcs[d.id] && DV.State.data.npcs[d.id].mem.met);
      if (!ppl.length) el('div', 'faint', 'Nobody yet.', b);
      for (const d of ppl) {
        const disp = DV.Reputation.disposition(d.id);
        el('div', 'kv', '<span class="k">' + U.esc(d.name) + '</span><span class="v" style="color:' + (disp >= 10 ? 'var(--good)' : disp <= -15 ? 'var(--danger)' : 'var(--dim)') + '">' + DV.Reputation.dispositionLabel(disp) + '</span>', b);
      }
    },

    /* ------------------------------ JOURNAL ------------------------------ */
    render_quests(c) {
      const sub = el('div', 'subtabs jtabs', null, c);
      for (const [id, nm] of [['quests', 'Quests'], ['notes', 'Notes'], ['xp', 'Experience']]) {
        const t = el('div', 'subtab' + (this.journalView === id ? ' on' : ''), nm, sub);
        t.onclick = () => { this.journalView = id; DV.Audio.play('click'); this.render(); };
      }
      const body = el('div', 'jbody', null, c);
      if (this.journalView === 'notes') return this.render_notes(body);
      if (this.journalView === 'xp') return this.render_xp(body);
      const cols = el('div', 'cols', null, body);
      const a = el('div', 'col scrollkeep', null, cols);
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
          it.dataset.quest = x.id;
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
        const rw = def.rewards || {};
        if (rw.xp || rw.rep) el('div', 'kv', '<span class="k">REWARD</span><span class="v">' + [rw.xp ? rw.xp + ' XP' : '', ...Object.keys(rw.rep || {}).map((f) => DV.Factions.name(f) + ' ' + (rw.rep[f] > 0 ? '+' : '') + rw.rep[f])].filter(Boolean).join(' · ') + '</span>', d);
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
    render_notes(c) {
      const col = el('div', 'col notes scrollkeep', null, c);
      col.style.flex = '1';
      el('div', 'h', 'Notes', col);
      const jn = DV.State.data.journal.slice().reverse();
      if (!jn.length) el('div', 'faint', 'Nothing noted yet.', col);
      let day = null;
      for (const j of jn) {
        if (j.day !== day) { day = j.day; el('div', 'nday', 'Day ' + (day || 1), col); }
        el('div', 'log', '<b>' + U.formatTime(j.t) + '</b>' + U.esc(j.text), col);
      }
    },
    // where experience comes from (DV.RPG.xpSources), and how far you've come
    render_xp(c) {
      const p = DV.State.data.player;
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col scrollkeep', null, cols);
      a.style.width = '55%';
      el('div', 'h', 'Where Experience Comes From', a);
      const X = DV.RPG.xpSources;
      for (const k in X) {
        const s = X[k];
        el('div', 'xps', '<span class="xn">' + U.esc(s.label) + '</span><span class="xa">' + (s.xp ? s.xp + ' XP' + (s.once ? ' · once' : '') : '') + '</span><div class="xd">' + U.esc(s.note) + '</div>', a);
      }
      const b = el('div', 'col', null, cols);
      b.style.flex = '1';
      el('div', 'h', 'Progress', b);
      const kv = (k, v) => el('div', 'kv', '<span class="k">' + k + '</span><span class="v">' + v + '</span>', b);
      kv('LEVEL', p.level + ' of ' + DV.Stats.maxLevel());
      kv('EXPERIENCE', p.xp);
      kv('NEXT LEVEL AT', p.level >= DV.Stats.maxLevel() ? '—' : DV.Stats.xpForLevel(p.level + 1));
      const seen = p.xpSeen || {};
      const cnt = (src) => Object.keys(seen).filter((k) => k.indexOf(src + ':') === 0).length;
      kv('PLACES DISCOVERED', cnt('discovery') + cnt('sector'));
      kv('DOCUMENTS READ', cnt('read'));
      kv('LIES SEEN THROUGH', cnt('lie'));
      kv('PERKS LEARNED', Object.keys(p.perks || {}).length);
      el('div', 'h', 'Levels Ahead', b);
      for (let l = p.level + 1; l <= Math.min(DV.Stats.maxLevel(), p.level + 4); l++) kv('LEVEL ' + l, DV.Stats.xpForLevel(l) + ' XP · +' + DV.RPG.attrPointsAt(l) + ' attr · +' + DV.RPG.perkPointsAt(l) + ' perk');
    },

    /* ------------------------------ INVENTORY ------------------------------ */
    render_inventory(c) {
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col scrollkeep', null, cols);
      a.style.width = '46%';
      const st = el('div', 'subtabs', null, a);
      const cats = [['all', 'All'], ['clothing', 'Clothing'], ['consumable', 'Consumables'], ['quest', 'Quest Items'], ['misc', 'Miscellaneous']];
      if (DV.Perks.on('craft')) cats.push(['bench', 'Workbench']);
      else if (this.invCat === 'bench') this.invCat = 'all';
      for (const [id, nm] of cats) {
        const t = el('div', 'subtab' + (this.invCat === id ? ' on' : ''), nm, st);
        t.onclick = () => { this.invCat = id; DV.Audio.play('click'); this.render(); };
      }
      // your purse: ration scrip, what the shops take
      const purse = el('div', 'list-item inv-purse', null, a);
      purse.appendChild(itemIcon({ icon: { shape: 'scrip', color: '#c8b890' } }));
      el('span', null, 'Ration Scrip <span class="faint">— spent at the city\'s shops</span>', purse);
      el('span', 'qty', String(DV.Wallet.get()), purse);
      const list = this.invCat === 'all' ? DV.Inventory.list() : DV.Inventory.byCategory(this.invCat);
      if (!list.length) el('div', 'faint', 'Nothing here.', a).style.padding = '8px';
      const detail = el('div', 'col', null, cols);
      detail.style.flex = '1';
      if (this.invCat === 'bench') return this.render_bench(a, detail);
      const list = this.invCat === 'all' ? DV.Inventory.list() : DV.Inventory.byCategory(this.invCat);
      if (!list.length) el('div', 'faint', 'Nothing here.', a).style.padding = '8px';
      if (this.selItem && !DV.Inventory.has(this.selItem)) this.selItem = null;
      for (const e of list) {
        const def = DV.Items.get(e.id);
        if (!def) continue;
        const it = el('div', 'list-item' + (this.selItem === e.id ? ' on' : ''), null, a);
        it.dataset.item = e.id;
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
          const b = el('span', 'btn' + (DV.Inventory.equipped(def.id) ? ' disabled' : ''), label + ' [Enter]', btns);
          b.onclick = () => this.useItem(def.id);
        }
        if (!def.quest && def.cat !== 'clothing') {
          const d = el('span', 'btn', 'Discard', btns);
          d.onclick = () => DV.UI.confirm('Discard', 'Throw away the ' + def.name + '?', () => { DV.Inventory.remove(def.id, 1); this.render(); });
        }
      } else el('div', 'faint', 'Select an item.', detail);
    },
    useItem(id) {
      const def = DV.Items.get(id);
      if (!def || !def.usable) return;
      const r = DV.Inventory.use(def.id);
      if (r.message) DV.UI.notify(r.message);
      if (r.read) DV.UI.showReading(r.read.title, r.read.text);
      if (DV.Dialogue.isActive()) this.close();
      this.render();
    },
    // Erudite's Applied Chemistry: what you can make from what you carry
    render_bench(a, detail) {
      const K = DV.Perks;
      el('div', 'h', 'Workbench', a);
      if (!this.selRecipe) this.selRecipe = K.recipes()[0].id;
      for (const r of K.recipes()) {
        const can = K.canCraft(r.id), out = DV.Items.get(r.out);
        const it = el('div', 'list-item' + (this.selRecipe === r.id ? ' on' : '') + (can.ok ? '' : ' dimmed'), null, a);
        it.dataset.recipe = r.id;
        it.appendChild(itemIcon(out));
        el('span', null, U.esc(r.name), it);
        it.onclick = () => { this.selRecipe = r.id; DV.Audio.play('click'); this.render(); };
      }
      const r = K.recipes().find((x) => x.id === this.selRecipe), out = DV.Items.get(r.out), can = K.canCraft(r.id);
      const head = el('div', null, null, detail);
      head.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:6px';
      head.appendChild(itemIcon(out, 48));
      el('div', null, '<div class="h" style="margin:0;border:none">' + U.esc(out.name) + '</div><div class="faint" style="font-size:11px">' + U.esc(r.desc) + '</div>', head);
      el('div', 'desc', U.esc(out.desc), detail);
      el('div', 'h', 'Needs', detail);
      for (const id in r.needs) { const have = DV.Inventory.count(id); el('div', 'kv', '<span class="k">' + U.esc(DV.Items.get(id).name) + '</span><span class="v ' + (have >= r.needs[id] ? 'good' : 'bad') + '">' + have + ' / ' + r.needs[id] + '</span>', detail); }
      const b = el('span', 'btn' + (can.ok ? '' : ' disabled'), 'Make it [Enter]', detail);
      b.style.marginTop = '8px';
      b.onclick = () => this.craft(r.id);
      if (!can.ok) el('div', 'faint', U.esc(can.why), detail);
    },
    craft(rid) {
      const r = DV.Perks.craft(rid);
      if (!r.ok) { DV.Audio.play('error'); DV.UI.notify(r.why); }
      this.render();
      return r.ok;
    },

    /* ------------------------------ CODEX ------------------------------ */
    render_codex(c) {
      const X = DV.Codex, cats = DV.CodexData.categories;
      const all = X.entries();
      const open = all.filter((e) => X.isOpen(e.id));
      if (!this.selCodex || !X.isOpen(this.selCodex)) this.selCodex = open.length ? (open.find((e) => !X.st().open[e.id].read) || open[0]).id : null;
      const cols = el('div', 'cols', null, c);
      const a = el('div', 'col codex-list scrollkeep', null, cols);
      a.style.width = '32%';
      el('div', 'h', 'Codex · ' + open.length + ' entr' + (open.length === 1 ? 'y' : 'ies'), a);
      for (const [cid, cname] of cats) {
        const inCat = all.filter((e) => e.cat === cid);
        const known = inCat.filter((e) => X.isOpen(e.id));
        if (!inCat.length && cid !== 'documents') continue;
        el('div', 'tgrp', cname + ' <span class="faint">' + known.length + (cid === 'documents' ? '' : ' / ' + inCat.length) + '</span>', a);
        for (const e of inCat) {
          const isOpen = X.isOpen(e.id);
          const row = el('div', 'list-item cx' + (e.id === this.selCodex ? ' on' : '') + (isOpen ? '' : ' locked') + (isOpen && !X.st().open[e.id].read ? ' unread' : ''), null, a);
          row.dataset.entry = e.id;
          el('span', null, isOpen ? U.esc(X.title(e)) : '— not yet known —', row);
          if (isOpen) row.onclick = () => { this.selCodex = e.id; DV.Audio.play('page'); this.render(); };
        }
        if (cid === 'documents' && !known.length) el('div', 'faint', 'Letters and papers you read are kept here.', a).style.cssText = 'font-size:11.5px;padding:2px 8px';
      }
      const b = el('div', 'col codex-page', null, cols);
      b.style.flex = '1';
      if (!this.selCodex) { el('div', 'faint', 'Nothing learned yet.', b); return; }
      const e = X.get(this.selCodex);
      X.markRead(e.id);
      const cat = cats.find((x) => x[0] === e.cat);
      el('div', 'cxc', cat ? cat[1] : '', b);
      el('div', 'cxt', U.esc(X.title(e)), b);
      if (e.faction) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 72; cv.className = 'cxe';
        DV.Tex.drawEmblem(cv.getContext('2d'), e.faction, 72, e.faction === 'candor' ? '#e8e6e0' : DV.Factions.get(e.faction).accent, '#0d0d0d');
        b.appendChild(cv);
      }
      el('div', 'cxb', U.esc(X.text(e)).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>') + '</p>', b);
      this.refreshTabDots();
    },

    /* ------------------------------ keyboard ------------------------------ */
    // ↑↓ / W S move through the list a page has, ← → / A D through a tree's perks, Enter / Space picks
    nav(dy, dx, go) {
      const t = this.tab;
      const cycle = (arr, cur, d) => arr[(Math.max(0, arr.indexOf(cur)) + d + arr.length) % arr.length];
      if (t === 'character') {
        const ids = DV.RPG.attributes.map((x) => x.id);
        if (dy) { this.selAttr = cycle(ids, this.selAttr, dy); DV.Audio.play('hover'); this.render(); }
        if (go) this.spend(this.selAttr);
      } else if (t === 'skills') {
        if (dy) { this.selTree = cycle(this.trees().map((x) => x.id), this.selTree, dy); this.selPerk = null; DV.Audio.play('hover'); this.render(); }
        if (dx) {
          const tr = DV.PerkData.tree(this.selTree), order = tr.perks.slice().sort((p1, p2) => p1.tier - p2.tier).map((x) => x.id);
          this.selPerk = cycle(order, this.selPerk, dx); DV.Audio.play('hover'); this.render();
        }
        if (go && this.selPerk) { if (DV.Perks.status(this.selPerk) === 'available') this.learn(this.selPerk); else DV.Audio.play('error'); }
      } else if (t === 'factions') {
        if (dy) { this.selFaction = cycle(DV.Factions.order, this.selFaction, dy); DV.Audio.play('hover'); this.render(); }
        if (go && DV.PerkData.tree(this.selFaction)) { this.selTree = this.selFaction; this.selPerk = null; this.show('skills'); }
      } else if (t === 'quests') {
        if (dx) { this.journalView = cycle(['quests', 'notes', 'xp'], this.journalView, dx); DV.Audio.play('click'); this.render(); }
        if (dy && this.journalView === 'quests') { const ids = [...this.el.querySelectorAll('[data-quest]')].map((x) => x.dataset.quest); if (ids.length) { this.selQuest = cycle(ids, this.selQuest, dy); this.render(); } }
        if (go && this.selQuest && DV.Quests.isActive(this.selQuest)) { DV.Quests.tracked = this.selQuest; DV.Audio.play('click'); this.render(); }
      } else if (t === 'inventory') {
        if (dx) { const cats = [...this.el.querySelectorAll('.subtab')].map((x, i) => i); const ids = ['all', 'clothing', 'consumable', 'quest', 'misc'].concat(DV.Perks.on('craft') ? ['bench'] : []); void cats; this.invCat = cycle(ids, this.invCat, dx); DV.Audio.play('click'); this.render(); }
        if (this.invCat === 'bench') {
          if (dy) { this.selRecipe = cycle(DV.Perks.recipes().map((x) => x.id), this.selRecipe, dy); this.render(); }
          if (go) this.craft(this.selRecipe);
        } else {
          if (dy) { const ids = [...this.el.querySelectorAll('[data-item]')].map((x) => x.dataset.item); if (ids.length) { this.selItem = cycle(ids, this.selItem, dy); DV.Audio.play('hover'); this.render(); } }
          if (go && this.selItem) this.useItem(this.selItem);
        }
      } else if (t === 'codex') {
        if (dy) { const ids = [...this.el.querySelectorAll('.cx:not(.locked)')].map((x) => x.dataset.entry); if (ids.length) { this.selCodex = cycle(ids, this.selCodex, dy); DV.Audio.play('page'); this.render(); } }
      }
    },

    update(input) {
      const ts = this.tabs();
      for (let k = 1; k <= TABS.length; k++) if (input.consume('Digit' + k) && ts[k - 1]) this.show(ts[k - 1]);
      if (input.consume('KeyQ') || input.consume('PageUp')) this.step(-1);
      if (input.consume('KeyE') || input.consume('PageDown')) this.step(1);
      const map = this.tab === 'map';
      const up = input.consume('ArrowUp') | (!map && input.consume('KeyW')), down = input.consume('ArrowDown') | (!map && input.consume('KeyS'));
      const lf = input.consume('ArrowLeft') | (!map && input.consume('KeyA')), rt = input.consume('ArrowRight') | (!map && input.consume('KeyD'));
      const go = input.consume('Enter') | input.consume('Space');
      if (up || down || lf || rt || go) this.nav(down ? 1 : up ? -1 : 0, rt ? 1 : lf ? -1 : 0, !!go);
      // the city map: + and − zoom, and the "you" ring pulses
      if (this.tab === 'map' && this._redrawCity) {
        const cv = document.getElementById('map-canvas');
        if (input.consume('Equal') || input.consume('NumpadAdd')) DV.WorldMap.zoomBy(1.4, cv.width / 2, cv.height / 2);
        if (input.consume('Minus') || input.consume('NumpadSubtract')) DV.WorldMap.zoomBy(1 / 1.4, cv.width / 2, cv.height / 2);
        this._mapT = (this._mapT || 0) + 1;
        if (this._mapT % 3 === 0) this._redrawCity();
      }
    },

    /* ------------------------------ (unchanged pages) ------------------------------ */
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
  };
  M.itemIcon = itemIcon;
  DV.RPGMenu = M;

  /* ------------------------------ the level-up fanfare ------------------------------ */
  // a bronze plate that drops in at the top of the screen when you level: what you reached,
  // what it brought, and a reminder where to spend it. It never takes the controls.
  DV.Fanfare = {
    el: null,
    init() {
      const f = el('div', 'hidden', '<div class="lv-rays"></div><div class="lv-k">Level Up</div><div class="lv-n"></div><div class="lv-g"></div><div class="lv-h">TAB — Character &amp; Skills</div>', DV.UI.root);
      f.id = 'levelup';
      DV.UI.ornate(f);
      this.el = f;
      DV.Events.on('player:levelup', (e) => this.show(e));
    },
    show(e) {
      const f = this.el;
      f.querySelector('.lv-n').textContent = e.level;
      const gains = ['+' + e.attr + ' attribute point' + (e.attr > 1 ? 's' : ''), '+' + e.perk + ' perk point' + (e.perk > 1 ? 's' : '')];
      f.querySelector('.lv-g').innerHTML = gains.map((g) => '<span>' + g + '</span>').join('');
      f.classList.remove('hidden', 'on');
      void f.offsetWidth;
      f.classList.add('on');
      clearTimeout(this._t);
      this._t = setTimeout(() => this.hide(), 5200);
      this.shown = (this.shown || 0) + 1;
    },
    hide() { this.el.classList.remove('on'); clearTimeout(this._h); this._h = setTimeout(() => { if (!this.el.classList.contains('on')) this.el.classList.add('hidden'); }, 700); },
  };
})();
