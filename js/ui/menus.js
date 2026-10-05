/* ==========================================================================
   DIVERGENT — menus: main menu, pause, settings, save/load, credits, wait
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const el = U.el;
  // the colour each faction reads in on the menu (Candor's black would vanish: its white instead)
  const FC = { abnegation: '#c9c7bb', dauntless: '#e0553a', erudite: '#8fb6e3', candor: '#ecebe4', amity: '#e8b84a' };
  // what's in each bowl at the Choosing
  const BOWLS = { abnegation: 'grey stones', dauntless: 'burning coals', erudite: 'water', candor: 'glass', amity: 'earth' };

  const Menus = {
    /* ------------------------------ main menu ------------------------------ */
    showMain() {
      this.hideAll();
      const m = el('div', null, null, DV.UI.root);
      m.id = 'mainmenu';
      // (the highlights reel plays behind all of this: js/ui/menuReel.js; between highlights it dips
      // to black under the menu, with the next faction's mark)
      m.innerHTML =
        '<div class="reel-wipe"><div class="black"></div><div class="card"><canvas width="168" height="168"></canvas><div class="cn"></div><div class="cv"></div></div>' +
        '<div class="loading"><div class="lt">Loading</div><div class="lb"><i></i></div></div></div>' +
        '<div class="shade"></div>' +
        '<div class="mm-left"><div class="logo"><div class="title">DIVERGENT</div>' +
        '<div class="rule"><i></i><canvas width="52" height="52"></canvas><i></i></div>' +
        '<div class="subtitle">The City</div><div class="motto">Faction before blood</div></div><div class="items"></div></div>' +
        '<div class="reel-cap"><div class="cap-head"><span class="cap-name"></span><span class="cap-virtue"></span></div>' +
        '<div class="cap-row"><div class="cap-em"><canvas width="92" height="92"></canvas></div><div class="cap-body"><div class="cap-line"></div>' +
        '<div class="cap-meta"><span class="cap-time"></span><span class="cap-place"></span><span class="cap-n"></span></div></div></div></div>' +
        '<div class="mm-bottom"><div class="lbl"><i></i>The Choosing<i></i></div><div class="sigils"></div></div>' +
        '<div class="mm-foot"><span class="foot"></span><span class="keys"></span></div>';
      DV.Tex.drawEmblem(m.querySelector('.rule canvas').getContext('2d'), 'seal', 52, '#b8873e');
      DV.UI.ornate(m.querySelector('.reel-cap'));
      // the bowls of the Choosing, in the reel's order (and the city first); each cuts to its highlight
      const sig = m.querySelector('.sigils');
      (DV.Reel ? DV.Reel.SEGMENTS : []).forEach((S) => {
        const f = S.faction || '';
        const b = el('div', 'bowl', '<canvas width="132" height="108"></canvas><span class="bn"></span><span class="pr"><i></i></span>', sig);
        b.dataset.f = f;
        b.querySelector('.bn').textContent = f ? DV.Factions.name(f) : 'The City';
        b.title = f ? DV.Factions.name(f) + ' — ' + BOWLS[f] + ' (' + DV.Factions.get(f).virtue + ')' : 'The City — ' + S.place;
        if (f) b.style.setProperty('--fc', FC[f]);
        this.drawBowl(b.querySelector('canvas').getContext('2d'), f, 132, 108);
        b.onmouseenter = () => DV.Audio.play('hover');
        b.onclick = () => { DV.Audio.init(); DV.Audio.play('click'); if (DV.Reel) DV.Reel.jump(S.id); };
      });
      m.querySelector('.keys').innerHTML = '<span class="kc">↑↓</span>Choose<span class="kc">Enter</span>Confirm<span class="kc">←→</span>Factions';
      const latest = DV.Save.latest();
      const items = [
        ['New Game', () => DV.Game.newGame()],
        ['Continue', () => DV.Game.loadSlot(latest.slot), !latest],
        ['Load Game', () => this.showSaveLoad('load')],
        ['Settings', () => this.showSettings()],
        ['Credits', () => this.showCredits()],
      ];
      const box = m.querySelector('.items');
      const buttons = [];
      for (const [label, fn, dis] of items) {
        const it = el('div', 'mm-item' + (dis ? ' disabled' : ''), label, box);
        it.onmouseenter = () => { DV.Audio.play('hover'); this.focusMain(buttons.indexOf(it), true); };
        it.onclick = () => { DV.Audio.init(); DV.Audio.play('click'); fn(); };
        buttons.push(it);
      }
      DV.UI.ornate(box); // (its corners after the buttons: they're the menu's children, in order)
      this.mainButtons = buttons;
      this.mainFocus = -1;
      // the keyboard: up and down (or W and S) through the buttons, Enter to choose, left and right
      // through the factions' highlights, Esc out of a panel
      this.mainKeys = (e) => {
        if (!this.main || DV.Game.state !== 'mainmenu') return;
        if (document.querySelector('.modal')) return; // (a question being asked: it has the keys)
        const k = e.code;
        if (this.sideEl) { if (k === 'Escape') { e.preventDefault(); DV.Audio.play('back'); this.closeSide(); } return; }
        const step = k === 'ArrowDown' || k === 'KeyS' || (k === 'Tab' && !e.shiftKey) ? 1 : k === 'ArrowUp' || k === 'KeyW' || (k === 'Tab' && e.shiftKey) ? -1 : 0;
        if (step) { e.preventDefault(); this.focusMain(this.mainFocus < 0 && step < 0 ? 0 : this.mainFocus + step); DV.Audio.play('hover'); return; }
        if ((k === 'Enter' || k === 'Space' || k === 'NumpadEnter') && this.mainFocus >= 0) { e.preventDefault(); this.mainButtons[this.mainFocus].click(); return; }
        if ((k === 'ArrowLeft' || k === 'ArrowRight' || k === 'KeyA' || k === 'KeyD') && DV.Reel && DV.Reel.running) {
          e.preventDefault();
          const S = DV.Reel.SEGMENTS, i = DV.Reel.i + (k === 'ArrowRight' || k === 'KeyD' ? 1 : -1);
          DV.Audio.init(); DV.Audio.play('click');
          DV.Reel.jump(S[(i + S.length) % S.length].id);
        }
      };
      window.addEventListener('keydown', this.mainKeys);
      m.querySelector('.foot').textContent = DV.Config.VERSION + '  \u00b7  A private, non-commercial fan prototype set in the Divergent universe' + (DV.Save.available() ? '' : '  \u00b7  WARNING: browser storage unavailable \u2014 saving disabled');
      this.main = m;
    },
    // the highlighted button (the mouse and the keyboard share it; disabled ones are skipped)
    focusMain(i, fromMouse) {
      const B = this.mainButtons || [];
      if (!B.length) return;
      if (!fromMouse) {
        const dir = i < this.mainFocus ? -1 : 1;
        i = ((i % B.length) + B.length) % B.length;
        for (let n = 0; n < B.length && B[i].classList.contains('disabled'); n++) i = (((i + dir) % B.length) + B.length) % B.length;
      }
      this.mainFocus = i;
      B.forEach((b, j) => b.classList.toggle('kfocus', j === i));
    },
    hideMain() {
      if (this.mainKeys) { window.removeEventListener('keydown', this.mainKeys); this.mainKeys = null; }
      if (DV.Reel) DV.Reel.stop(false);
      if (DV.MenuTheme) DV.MenuTheme.stop();
      if (this.main) { this.main.remove(); this.main = null; }
    },

    // the bowls of the Choosing, seen a little from above (f: the faction, '' for the city's own mark)
    drawBowl(g, f, W, H) {
      g.clearRect(0, 0, W, H);
      if (!f) { this.drawCity(g, W, H); return; }
      const cx = W / 2, rx = W * 0.4, ry = W * 0.1, ty = H * 0.56, deep = H * 0.3, ix = rx - 3, iy = ry - 1.6;
      const rnd = U.rng('bowl-' + f), TAU = Math.PI * 2;
      // its shadow on the table
      g.fillStyle = 'rgba(0, 0, 0, 0.55)';
      g.beginPath(); g.ellipse(cx, ty + deep + 2, rx * 0.66, ry * 0.6, 0, 0, TAU); g.fill();
      // the body: steel, warm in the lamplight
      const met = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
      met.addColorStop(0, '#221f1b'); met.addColorStop(0.18, '#6f685d'); met.addColorStop(0.34, '#e2d9c6'); met.addColorStop(0.5, '#9a9284');
      met.addColorStop(0.8, '#3d3934'); met.addColorStop(1, '#1a1815');
      g.fillStyle = met; g.strokeStyle = '#000'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(cx, ty, rx, deep, 0, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
      // the rim, all round, and the dark inside
      const rim = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
      rim.addColorStop(0, '#5d574e'); rim.addColorStop(0.3, '#f4ecda'); rim.addColorStop(0.7, '#a8a090'); rim.addColorStop(1, '#4a453e');
      g.fillStyle = rim;
      g.beginPath(); g.ellipse(cx, ty, rx, ry, 0, 0, TAU); g.fill();
      g.fillStyle = '#15120e';
      g.beginPath(); g.ellipse(cx, ty, ix, iy, 0, 0, TAU); g.fill();
      // what's in it (clipped to the bowl's mouth, and the heap above it)
      g.save();
      g.beginPath(); g.ellipse(cx, ty, ix, iy, 0, 0, Math.PI); g.lineTo(cx - ix, 0); g.lineTo(cx + ix, 0); g.closePath(); g.clip();
      const heap = (n, lift, each) => {
        const P = [];
        for (let i = 0; i < n; i++) {
          const h = Math.pow(rnd(), 1.5);
          P.push([cx + (rnd() * 2 - 1) * (ix - 6) * (1 - h * 0.7), ty + iy * 0.5 * (rnd() * 2 - 1) - h * lift, h]);
        }
        P.sort((a, b) => a[1] - b[1]).forEach((p) => each(p[0], p[1], p[2]));
      };
      if (f === 'abnegation') {
        // grey stones
        g.fillStyle = '#3c3a36'; g.beginPath(); g.ellipse(cx, ty, ix, iy, 0, 0, TAU); g.fill();
        heap(30, ry * 2.4, (x, y) => {
          const r = W * (0.035 + rnd() * 0.025), v = 92 + Math.floor(rnd() * 70), a = rnd() - 0.5;
          g.fillStyle = 'rgb(' + v + ',' + (v - 3) + ',' + (v - 9) + ')';
          g.beginPath(); g.ellipse(x, y, r * 1.3, r * 0.85, a, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(0, 0, 0, 0.55)'; g.lineWidth = 1; g.stroke();
          g.fillStyle = 'rgba(255, 255, 255, 0.2)'; g.beginPath(); g.ellipse(x - r * 0.4, y - r * 0.3, r * 0.45, r * 0.25, a, 0, TAU); g.fill();
        });
      } else if (f === 'erudite') {
        // water, brimming
        const w = g.createLinearGradient(0, ty - iy, 0, ty + iy);
        w.addColorStop(0, '#a9d6f6'); w.addColorStop(0.4, '#4c8bcb'); w.addColorStop(1, '#14365e');
        g.fillStyle = w; g.beginPath(); g.ellipse(cx, ty, ix, iy, 0, 0, TAU); g.fill();
        for (let k = 1; k <= 3; k++) {
          g.strokeStyle = 'rgba(235, 248, 255, ' + (0.42 - k * 0.1) + ')'; g.lineWidth = 1.2;
          g.beginPath(); g.ellipse(cx + 5, ty + 1, ix * k / 3.6, iy * k / 3.6, 0, 0, TAU); g.stroke();
        }
        g.fillStyle = 'rgba(255, 255, 255, 0.7)'; g.beginPath(); g.ellipse(cx - ix * 0.42, ty - iy * 0.3, ix * 0.16, iy * 0.2, -0.1, 0, TAU); g.fill();
      } else if (f === 'dauntless') {
        // burning coals
        const glow = g.createRadialGradient(cx, ty, 2, cx, ty, ix);
        glow.addColorStop(0, '#ff8a2a'); glow.addColorStop(0.5, '#9a3210'); glow.addColorStop(1, '#2a0d05');
        g.fillStyle = glow; g.beginPath(); g.ellipse(cx, ty, ix, iy, 0, 0, TAU); g.fill();
        heap(34, ry * 1.4, (x, y) => {
          const r = W * (0.025 + rnd() * 0.02), hot = rnd();
          g.fillStyle = hot > 0.72 ? '#ffb347' : hot > 0.45 ? '#e2531c' : '#2c130a';
          g.beginPath();
          for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + rnd() * 0.6; g.lineTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 0.8); }
          g.closePath(); g.fill();
        });
        g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 4; k++) {
          const x = cx + (k - 1.5) * ix * 0.42 + (rnd() - 0.5) * 6, b0 = ty - 1, fh = H * (0.24 + rnd() * 0.2), fw = W * (0.05 + rnd() * 0.03);
          const fl = g.createLinearGradient(0, b0, 0, b0 - fh);
          fl.addColorStop(0, 'rgba(255, 110, 30, 0.95)'); fl.addColorStop(0.5, 'rgba(255, 180, 70, 0.6)'); fl.addColorStop(1, 'rgba(255, 230, 150, 0)');
          g.fillStyle = fl;
          g.beginPath(); g.moveTo(x - fw, b0); g.quadraticCurveTo(x - fw, b0 - fh * 0.55, x + (rnd() - 0.5) * fw, b0 - fh); g.quadraticCurveTo(x + fw, b0 - fh * 0.55, x + fw, b0); g.closePath(); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
      } else if (f === 'candor') {
        // glass
        g.fillStyle = '#1d2326'; g.beginPath(); g.ellipse(cx, ty, ix, iy, 0, 0, TAU); g.fill();
        heap(26, ry * 2.1, (x, y) => {
          const r = W * (0.04 + rnd() * 0.03), a = rnd() * TAU;
          const pts = [0, 1, 2].map((k) => [x + Math.cos(a + k * 2.1 + rnd() * 0.5) * r, y + Math.sin(a + k * 2.1 + rnd() * 0.5) * r * 0.6]);
          g.fillStyle = 'rgba(' + (200 + Math.floor(rnd() * 40)) + ', 232, 240, ' + (0.45 + rnd() * 0.35) + ')';
          g.beginPath(); pts.forEach((p) => g.lineTo(p[0], p[1])); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(255, 255, 255, 0.85)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); g.stroke();
        });
        g.fillStyle = '#fff';
        for (let k = 0; k < 3; k++) { const x = cx + (rnd() - 0.5) * ix * 1.2, y = ty - rnd() * ry * 1.8; g.fillRect(x - 3, y - 0.5, 6, 1); g.fillRect(x - 0.5, y - 3, 1, 6); }
      } else if (f === 'amity') {
        // earth, and something growing in it
        const e = g.createLinearGradient(0, ty - ry * 2.2, 0, ty + iy);
        e.addColorStop(0, '#8d6239'); e.addColorStop(1, '#3f2614');
        g.fillStyle = e;
        g.beginPath(); g.ellipse(cx, ty, ix, ry * 2.2, 0, Math.PI, TAU); g.ellipse(cx, ty, ix, iy, 0, 0, Math.PI); g.fill();
        for (let k = 0; k < 60; k++) {
          const x = cx + (rnd() * 2 - 1) * ix * 0.9, y = ty + iy * 0.6 - rnd() * ry * 2.4;
          g.fillStyle = rnd() > 0.5 ? 'rgba(30, 16, 6, 0.55)' : 'rgba(190, 140, 90, 0.35)'; g.fillRect(x, y, 2, 2);
        }
        g.strokeStyle = '#5f9a34'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx + 3, ty - ry * 1.9); g.quadraticCurveTo(cx + 1, ty - ry * 3, cx + 4, ty - ry * 3.6); g.stroke();
        g.fillStyle = '#7fc04a';
        g.beginPath(); g.ellipse(cx - 3, ty - ry * 3.3, 6, 3, 0.5, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(cx + 10, ty - ry * 3.5, 6, 3, -0.5, 0, TAU); g.fill();
      }
      g.restore();
      // the front of the rim, over what's inside
      g.strokeStyle = rim; g.lineWidth = 3;
      g.beginPath(); g.ellipse(cx, ty, rx - 1.5, ry - 0.8, 0, 0, Math.PI); g.stroke();
      g.strokeStyle = '#000'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(cx, ty, rx, ry, 0, 0, TAU); g.stroke();
      g.beginPath(); g.ellipse(cx, ty, ix, iy, 0, Math.PI, TAU); g.stroke();
    },
    // the city's mark: the skyline with the Hub in the middle, the Fence along the bottom
    drawCity(g, W, H, col) {
      g.clearRect(0, 0, W, H);
      col = col || '#d8a24a';
      const base = H * 0.8, u = W / 100;
      const sky = g.createLinearGradient(0, base - H * 0.62, 0, base);
      sky.addColorStop(0, col); sky.addColorStop(1, '#5a3f1c');
      const B = [[8, 10, 26], [17, 9, 37], [25, 11, 30], [35, 8, 46], [43, 13, 64], [56, 9, 42], [64, 12, 33], [76, 8, 49], [84, 9, 28]];
      for (const [x, w, h] of B) {
        g.fillStyle = sky; g.fillRect(x * u, base - h * H / 100, w * u, h * H / 100);
        g.fillStyle = 'rgba(20, 12, 4, 0.75)';
        for (let yy = base - h * H / 100 + 4; yy < base - 4; yy += 5) for (let xx = x * u + 2; xx < (x + w) * u - 2; xx += 4) g.fillRect(xx, yy, 1.5, 2);
      }
      // the Hub's two masts
      g.fillStyle = col;
      g.fillRect(46 * u, base - 64 * H / 100 - 12, 1.6 * u, 12); g.fillRect(52 * u, base - 64 * H / 100 - 9, 1.6 * u, 9);
      // the Fence
      g.fillStyle = '#3a2a14'; g.fillRect(4 * u, base, 92 * u, 2);
      g.fillStyle = col;
      for (let x = 4; x <= 96; x += 6) g.fillRect(x * u, base - 3, 1, H * 0.12 + 3);
      g.fillRect(4 * u, base + H * 0.04, 92 * u, 1); g.fillRect(4 * u, base + H * 0.1, 92 * u, 1);
    },

    /* ------------------------------ pause ------------------------------ */
    showPause() {
      this.hidePause();
      const p = el('div', null, '<div class="panel pz"><div class="panel-title">Paused</div><div class="pz-body"><div class="items"></div><div class="pz-sheet"></div></div>' +
        '<div class="pz-foot"><span><span class="kc">Esc</span>Resume</span><span class="ver"></span></div></div>', DV.UI.root);
      p.id = 'pause';
      DV.UI.ornate(p.querySelector('.pz'));
      const sim = DV.Game.inSimulation();
      const items = [
        ['Resume', () => DV.Game.resume()],
        ['Save Game', () => this.showSaveLoad('save'), sim],
        ['Load Game', () => this.showSaveLoad('load')],
        ['Settings', () => this.showSettings()],
        ['Controls', () => this.showControls()],
        ...(DV.Dev && DV.Dev.on() ? [['Developer', () => DV.Dev.open()]] : []),
        ['Quit to Main Menu', () => DV.UI.confirm('Quit', 'Return to the main menu? Unsaved progress will be lost.', () => DV.Game.quitToMenu())],
      ];
      const box = p.querySelector('.items');
      for (const [label, fn, dis] of items) {
        const it = el('div', 'mm-item' + (dis ? ' disabled' : ''), label, box);
        it.onmouseenter = () => DV.Audio.play('hover');
        it.onclick = () => { DV.Audio.play('click'); fn(); };
      }
      if (sim) el('div', 'pz-note', 'You cannot save during the simulation.', box);
      this.pauseSheet(p.querySelector('.pz-sheet'), sim);
      p.querySelector('.ver').textContent = DV.Config.VERSION;
      this.pause = p;
    },
    // the right of the pause window: who you are, where and when, and what you're doing
    pauseSheet(sh, sim) {
      const pl = DV.State.data.player, F = DV.Factions;
      const who = el('div', 'pz-who', null, sh);
      const em = el('div', 'pz-em', '<canvas width="96" height="96"></canvas>', who);
      DV.Tex.drawEmblem(em.firstChild.getContext('2d'), pl.faction || 'seal', 96, pl.faction ? FC[pl.faction] || F.get(pl.faction).accent : '#b8873e');
      const nx = DV.Stats.xpForLevel(pl.level + 1), pct = Math.round(U.clamp(pl.xp / Math.max(1, nx), 0, 1) * 100);
      el('div', 'pz-id', '<div class="nm">' + U.esc(pl.name || 'Initiate') + '</div><div class="sub">Level ' + pl.level + ' · ' +
        (pl.faction ? F.name(pl.faction) : 'Undecided') + (pl.upbringing && pl.upbringing !== pl.faction ? ' · raised ' + F.name(pl.upbringing) : '') + '</div>' +
        '<div class="bar xp" title="Experience ' + pl.xp + ' / ' + nx + '"><i style="width:' + pct + '%"></i></div>', who);
      const kv = (k, v) => el('div', 'kv', '<span class="k">' + k + '</span><span class="v">' + v + '</span>', sh);
      if (sim) {
        el('div', 'h', 'The Simulation', sh);
        el('div', 'desc', 'The serum is still in you. Nothing here is real, and nothing here can be saved until it ends.', sh);
        return;
      }
      el('div', 'h', 'Where', sh);
      const zone = DV.World.current, place = zone && zone.placeName ? zone.placeName(DV.Player.x, DV.Player.z) : null;
      kv('PLACE', place ? U.esc(place.name) + (place.sub ? ' <span class="faint">· ' + U.esc(place.sub) + '</span>' : '') : '—');
      kv('DAY', 'Day ' + DV.Clock.day() + ' <span class="faint">·</span> ' + DV.Clock.str());
      el('div', 'h', 'Current Task', sh);
      const cur = DV.Quests.current();
      if (cur) {
        el('div', 'pz-q', U.esc(cur.quest.title), sh);
        el('div', 'obj', U.esc(DV.Quests.objText(cur.obj)), sh);
      } else el('div', 'faint', 'Nothing pressing.', sh).style.fontSize = '13px';
      el('div', 'h', 'Condition', sh);
      const st = Math.round(DV.Player.stamina);
      el('div', 'pz-bar', '<span class="k">STAMINA</span><div class="bar stamina"><i style="width:' + st + '%"></i></div><span class="v">' + st + '</span>', sh);
    },
    hidePause() {
      if (this.pause) { this.pause.remove(); this.pause = null; }
    },

    /* ------------------------------ save / load ------------------------------ */
    showSaveLoad(mode) {
      this.closeSide();
      const p = this.side(mode === 'save' ? 'Save Game' : 'Load Game');
      const body = p.querySelector('.body');
      const render = () => {
        body.innerHTML = '';
        if (!DV.Save.available()) { el('div', 'bad', 'Browser storage (localStorage) is unavailable. Saving is disabled in this browser mode.', body); return; }
        for (const s of DV.Save.slots()) {
          if (mode === 'save' && s.slot === 'auto') continue;
          const row = el('div', 'slot', null, body);
          el('span', 'sl', s.label, row);
          const info = el('span', 'si', null, row);
          if (s.summary) {
            const sm = s.summary;
            info.innerHTML = '<div class="a">' + U.esc(sm.name) + ' — Level ' + sm.level + ' — ' + U.esc(sm.location || '') + '</div><div class="b">Day ' + sm.day + ' ' + sm.time +
              ' · played ' + U.formatDuration(sm.playTime) + ' · saved ' + new Date(sm.saved).toLocaleString() + (sm.faction ? ' · ' + U.esc(sm.faction) : sm.result ? ' · ' + U.esc(sm.result) : '') + '</div>';
          } else info.innerHTML = '<div class="b">— empty —</div>';
          row.onclick = () => {
            DV.Audio.play('click');
            if (mode === 'save') {
              const go = () => { const r = DV.Save.write(s.slot); DV.UI.notify(r.message, r.ok ? 'info' : 'quest_fail'); render(); };
              if (s.summary) DV.UI.confirm('Overwrite', 'Overwrite ' + s.label + '?', go);
              else go();
            } else if (s.summary) {
              DV.UI.confirm('Load', 'Load ' + s.label + '? Unsaved progress will be lost.', () => { this.closeSide(); DV.Game.loadSlot(s.slot); });
            }
          };
          if (s.summary && s.slot !== 'auto') {
            const del = el('span', 'btn small', 'Delete', row);
            del.onclick = (e) => { e.stopPropagation(); DV.UI.confirm('Delete', 'Delete ' + s.label + '?', () => { DV.Save.remove(s.slot); render(); }); };
          }
        }
      };
      render();
    },

    /* ------------------------------ settings ------------------------------ */
    showSettings() {
      this.closeSide();
      const p = this.side('Settings');
      const body = p.querySelector('.body');
      const S = DV.Settings;
      const range = (label, key, min, max, step) => {
        const r = el('div', 'row', '<label>' + label + '</label>', body);
        const i = el('input', null, null, r);
        i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = S.get(key);
        i.oninput = () => { S.set(key, parseFloat(i.value)); };
      };
      const toggle = (label, key) => {
        const r = el('div', 'row', '<label>' + label + '</label>', body);
        const t = el('span', 'toggle' + (S.get(key) ? ' on' : ''), S.get(key) ? 'ON' : 'OFF', r);
        t.onclick = () => { S.set(key, !S.get(key)); t.classList.toggle('on', S.get(key)); t.textContent = S.get(key) ? 'ON' : 'OFF'; DV.Audio.play('click'); };
      };
      const select = (label, key, opts) => {
        const r = el('div', 'row', '<label>' + label + '</label>', body);
        const s = el('select', null, null, r);
        for (const [v, n] of opts) { const o = el('option', null, n, s); o.value = v; if (S.get(key) === v) o.selected = true; }
        s.onchange = () => { S.set(key, s.value); DV.Audio.play('click'); };
      };
      el('div', 'h', 'Controls', body);
      range('Mouse sensitivity', 'mouseSensitivity', 0.2, 3, 0.05);
      toggle('Invert vertical look', 'invertY');
      toggle('In-game cursor (menus keep the mouse captured)', 'softCursor');
      el('div', 'h', 'Video', body);
      select('Render resolution', 'renderScale', [['ultra', 'Ultra retro (360p)'], ['retro', 'Retro (480p) — default'], ['crisp', 'Crisp (720p)'], ['native', 'Native']]);
      select('Texture filtering', 'textureFilter', [['retro', 'Nearest (crunchy)'], ['smooth', 'Bilinear (smooth)']]);
      toggle('PS1 vertex wobble (characters)', 'vertexWobble');
      select('Draw distance', 'drawDistance', [['near', 'Near'], ['normal', 'Normal'], ['far', 'Far']]);
      toggle('Show FPS', 'showFps');
      el('div', 'h', 'Audio', body);
      range('Master volume', 'masterVolume', 0, 1, 0.05);
      range('Music volume', 'musicVolume', 0, 1, 0.05);
      toggle('Main menu theme song (streams from SoundCloud / YouTube)', 'menuTheme');
      range('Effects & ambience', 'sfxVolume', 0, 1, 0.05);
      toggle('Spoken PA announcements (speech synthesis)', 'paVoice');
      toggle('Room reverb', 'reverb');
      select('Ambience detail', 'ambienceDetail', [['high', 'High'], ['low', 'Low']]);
      el('div', 'h', 'Gameplay', body);
      toggle('Quest markers on compass', 'questMarkers');
      select('Dialogue text speed', 'textSpeed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']]);
      select('Clock speed (an in-game hour takes…)', 'clockSpeed', [['slow', '12 minutes (slow)'], ['normal', '6 minutes — default'], ['fast', '3 minutes (fast)']]);
      el('div', 'h', 'Developer', body);
      toggle('Dev menu (press ` in game, or Pause → Developer)', 'devMenu');
      const reset = el('span', 'btn', 'Reset to defaults', p.querySelector('.foot'));
      reset.onclick = () => DV.UI.confirm('Reset', 'Reset all settings to defaults?', () => { S.reset(); this.showSettings(); });
      p.querySelector('.foot').insertBefore(reset, p.querySelector('.foot').firstChild);
    },
    showControls() {
      this.closeSide();
      const p = this.side('Controls');
      p.querySelector('.body').innerHTML = [
        ['W A S D / Arrows', 'Move'], ['Mouse', 'Look / orbit camera (click to capture; or hold a button and drag)'], ['Mouse wheel', 'Zoom camera'],
        ['Shift', 'Run (uses stamina)'], ['Space', 'Jump (uses stamina)'], ['C', 'Crouch / sneak (quieter; Shift or C to stand)'], ['E', 'Interact · talk · take · sit'], ['Tab', 'RPG menu (Character, Skills, Inventory, Quests, Reputation, Map)'],
        ['M', 'Map'], ['J', 'Quests'], ['I', 'Inventory'], ['T', 'Wait (anywhere you\'re free to: pick how long, or until something)'], ['Dialogue', 'Move the mouse or scroll to choose, click / E / Enter to confirm (or 1-9)'], ['Esc', 'Pause / close windows'],
        ['Fights', 'LMB / J jab · RMB / K cross · F / L kick · hold Shift block · Space + direction dodge · hold Q yield'],
        ['Range', 'Mouse aim · LMB fire · hold RMB sights · hold Shift hold your breath'], ['Knives', 'Hold LMB to wind up, release to throw'],
        ['Activities', 'Each one shows its keys along the bottom of the screen'],
      ].map(([k, v]) => '<div class="kv"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>').join('');
    },

    /* ------------------------------ credits ------------------------------ */
    showCredits() {
      this.closeSide();
      const p = this.side('Credits');
      p.querySelector('.body').innerHTML = '<div class="credits">' +
        '<p><b class="accent">DIVERGENT — Build 4: The City</b></p>' +
        '<p>A private, non-commercial fan-game prototype inspired by the <i>Divergent</i> series by Veronica Roth. Not affiliated with or endorsed by the author, publishers or film studios. All characters, locations and story in this prototype are original.</p>' +
        '<div class="sep"></div>' +
        '<p><span class="accent">Design, code, writing & procedural art</span><br>Built with HTML, CSS, JavaScript and Three.js (r149, MIT License).</p>' +
        '<p><span class="accent">Inspirations</span><br>The Elder Scrolls III: Morrowind · early MMORPG world design · Dreamcast & PS2-era environments · PS1 character art.</p>' +
        '<p><span class="accent">Technology notes</span><br>Every texture, character, sound and piece of music is generated procedurally at runtime — no external assets are required to play. The one exception is the main menu\'s theme song, which streams from SoundCloud (or YouTube) in the service\'s own player when you\'re online: it isn\'t part of the game, and with no connection the menu plays its own music.</p>' +
        '<p><span class="accent">Main menu theme</span><br>' + U.esc(DV.Config.MENU_THEME.title || '') + ', streamed from SoundCloud: all rights remain with its artists and uploader.</p>' +
        '<div class="sep"></div><p class="dim">Faction before blood.</p></div>';
    },

    /* ------------------------------ wait menu ------------------------------ */
    showWait() {
      this.closeSide();
      const Wt = DV.Wait, plan = Wt.plan();
      const p = el('div', 'panel', '<div class="panel-title">Rest & Wait</div><div class="body"></div><div class="foot"></div>', DV.UI.root);
      p.id = 'waitmenu';
      DV.UI.ornate(p);
      const body = p.querySelector('.body');
      // whole hours, or (late in the day) whatever's left before midnight
      const steps = [];
      for (let h = 1; h * 60 <= plan.max; h++) steps.push(h * 60);
      if (!steps.length || plan.max - steps[steps.length - 1] >= 15) steps.push(Math.floor(plan.max));
      let k = 0;
      body.innerHTML = '<div class="dim">Day ' + DV.Clock.day() + ' · ' + DV.Clock.str() + '. How long will you wait?</div>' +
        '<div class="ctr"><span class="btn small minus">−</span><span class="hrs"></span><span class="btn small plus">+</span></div>' +
        '<div class="until dim"></div><div class="warn"></div><div class="quick"></div>' +
        (plan.max < 12 * 60 ? '<div class="note faint">The night is for sleeping: find your bed.</div>' : '');
      const hrsEl = body.querySelector('.hrs'), untilEl = body.querySelector('.until'), warnEl = body.querySelector('.warn');
      const upd = () => {
        const m = steps[k];
        hrsEl.textContent = DV.Wait.span(m);
        untilEl.textContent = 'until ' + DV.U.formatTime(plan.now + m) + (plan.stops.some((s) => s.t <= plan.now + m) ? ' (or until you\'re needed)' : '');
        const w = Wt.warnings(m);
        warnEl.innerHTML = w.map((x) => '<div>' + DV.U.esc(x) + '</div>').join('');
      };
      upd();
      this.waitStep = (d) => { k = Math.max(0, Math.min(steps.length - 1, k + d)); upd(); DV.Audio.play('click'); };
      body.querySelector('.minus').onclick = () => this.waitStep(-1);
      body.querySelector('.plus').onclick = () => this.waitStep(1);
      const go = (mins, opts) => { p.remove(); this.waitEl = null; this.waitGo = null; DV.Wait.start(mins, opts); };
      // until something: the call, a meal, the evening
      const quick = body.querySelector('.quick');
      for (const t of plan.targets) {
        const b = el('span', 'btn small', DV.U.esc(t.label) + ' <span class="faint">' + DV.U.formatTime(t.t) + '</span>', quick);
        b.onclick = () => go(0, { until: t.t });
      }
      const foot = p.querySelector('.foot');
      const w = el('span', 'btn', 'Wait', foot);
      w.onclick = () => go(steps[k]);
      this.waitGo = () => go(steps[k]);
      const c = el('span', 'btn', 'Cancel', foot);
      c.onclick = () => { p.remove(); this.waitEl = null; this.waitGo = null; DV.Game.closeOverlay(); };
      this.waitEl = p;
    },

    /* ------------------------------ helpers ------------------------------ */
    side(title) {
      const p = el('div', 'panel side', '<div class="panel-title"></div><div class="body scroll"></div><div class="foot"></div>', DV.UI.root);
      p.querySelector('.panel-title').textContent = title;
      p.style.zIndex = 30;
      DV.UI.ornate(p);
      const back = el('span', 'btn', 'Back', p.querySelector('.foot'));
      back.onclick = () => { DV.Audio.play('back'); this.closeSide(); };
      this.sideEl = p;
      return p;
    },
    closeSide() {
      if (this.sideEl) { this.sideEl.remove(); this.sideEl = null; return true; }
      if (this.waitEl && this.waitEl.parentNode) { this.waitEl.remove(); this.waitEl = null; return true; }
      return false;
    },
    hideAll() {
      this.hideMain();
      this.hidePause();
      this.closeSide();
    },
  };
  Menus.FC = FC;
  DV.Menus = Menus;
})();
