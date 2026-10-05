/* ==========================================================================
   DIVERGENT — menus: main menu, pause, settings, save/load, credits, wait
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const el = U.el;

  const Menus = {
    /* ------------------------------ main menu ------------------------------ */
    showMain() {
      this.hideAll();
      const m = el('div', 'y2k', null, DV.UI.root);
      m.id = 'mainmenu';
      // (the highlights reel plays behind all of this: js/ui/menuReel.js)
      m.innerHTML =
        '<div class="reel-wipe"><div class="band"></div><div class="band"></div><div class="band"></div><div class="band"></div><div class="band"></div><div class="band"></div>' +
        '<div class="flash"></div><div class="loading">LOADING <span>&#9646;&#9646;&#9646;</span></div></div>' +
        '<div class="scan"></div><div class="frame"><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i></div>' +
        '<div class="mm-left"><div class="logo"><div class="title" data-text="DIVERGENT">DIVERGENT</div>' +
        '<div class="subtitle"><span class="pill">BUILD 4</span><span class="sub">The City</span></div></div><div class="items"></div></div>' +
        '<div class="feed"><span class="live">&#9679; LIVE</span> FACTION FEED <b class="feed-n">01 / 06</b></div>' +
        '<div class="reel-cap"><div class="cap-orb"><canvas width="64" height="64"></canvas></div><div class="cap-body">' +
        '<div class="cap-head"><span class="cap-name"></span><span class="cap-virtue"></span></div><div class="cap-line"></div>' +
        '<div class="cap-meta"><span class="cap-time"></span><span class="cap-place"></span></div></div></div>' +
        '<div class="mm-bottom"><div class="sigils"></div><div class="reel-dots"></div></div>' +
        '<div class="ticker"><div class="foot"></div><div class="tk-win"><div class="tk"></div></div></div>';
      // the sigils: an orb for the city and one for each faction; each cuts the reel to its highlight
      const sig = m.querySelector('.sigils');
      const orb = (f, title) => {
        const o = el('div', 'orb', null, sig);
        o.dataset.f = f || '';
        o.title = title;
        const c = document.createElement('canvas');
        c.width = c.height = 84;
        const g = c.getContext('2d');
        if (f) DV.Tex.drawEmblem(g, f, 84, f === 'candor' ? '#f2f0ea' : DV.Factions.get(f).accent);
        else { g.fillStyle = '#e6eef6'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('\u2726', 42, 46); }
        o.appendChild(c);
        if (f) o.style.setProperty('--fc', DV.Factions.get(f).accent);
        o.onmouseenter = () => DV.Audio.play('hover');
        o.onclick = () => { DV.Audio.init(); DV.Audio.play('click'); if (DV.Reel) DV.Reel.jump(f || 'city'); };
      };
      orb(null, 'The City');
      for (const f of DV.Factions.testable) orb(f, DV.Factions.name(f) + ' \u2014 ' + DV.Factions.get(f).virtue);
      const dots = m.querySelector('.reel-dots');
      (DV.Reel ? DV.Reel.SEGMENTS : []).forEach((S) => {
        const d = el('span', 'dot', '<i></i>', dots);
        d.title = S.faction ? DV.Factions.name(S.faction) : S.name;
        d.onclick = () => { DV.Audio.init(); DV.Audio.play('click'); DV.Reel.jump(S.id); };
      });
      const motto = 'FACTION BEFORE BLOOD \u2726 ' + DV.Factions.testable.map((f) => DV.Factions.name(f).toUpperCase() + ' \u00b7 ' + String(DV.Factions.get(f).virtue).toUpperCase()).join(' \u2726 ') + ' \u2726 ';
      m.querySelector('.tk').textContent = motto + motto;
      const latest = DV.Save.latest();
      const items = [
        ['New Game', () => DV.Game.newGame()],
        ['Continue', () => DV.Game.loadSlot(latest.slot), !latest],
        ['Load Game', () => this.showSaveLoad('load')],
        ['Settings', () => this.showSettings()],
        ['Credits', () => this.showCredits()],
      ];
      const box = m.querySelector('.items');
      for (const [label, fn, dis] of items) {
        const it = el('div', 'mm-item' + (dis ? ' disabled' : ''), label, box);
        it.onmouseenter = () => DV.Audio.play('hover');
        it.onclick = () => { DV.Audio.init(); DV.Audio.play('click'); fn(); };
      }
      m.querySelector('.foot').textContent = DV.Config.VERSION + '  \u00b7  A private, non-commercial fan prototype set in the Divergent universe' + (DV.Save.available() ? '' : '  \u00b7  WARNING: browser storage unavailable \u2014 saving disabled');
      this.main = m;
    },
    hideMain() {
      if (DV.Reel) DV.Reel.stop(false);
      if (DV.MenuTheme) DV.MenuTheme.stop();
      if (this.main) { this.main.remove(); this.main = null; }
    },

    /* ------------------------------ pause ------------------------------ */
    showPause() {
      this.hidePause();
      const p = el('div', null, '<div class="panel"><div class="panel-title">Paused</div><div class="items"></div></div>', DV.UI.root);
      p.id = 'pause';
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
      if (sim) el('div', 'faint', 'You cannot save during the simulation.', box).style.cssText = 'font-size:11px;margin-top:6px';
      this.pause = p;
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
  DV.Menus = Menus;
})();
