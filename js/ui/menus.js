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
      const m = el('div', null, null, DV.UI.root);
      m.id = 'mainmenu';
      m.innerHTML = '<div class="title">DIVERGENT</div><div class="subtitle">Initiation</div><div class="sigils"></div><div class="items"></div><div class="foot"></div>';
      const sig = m.querySelector('.sigils');
      for (const f of DV.Factions.testable) {
        const c = document.createElement('canvas');
        c.width = c.height = 84;
        DV.Tex.drawEmblem(c.getContext('2d'), f, 84, f === 'candor' ? '#e8e6e0' : DV.Factions.get(f).accent);
        c.title = DV.Factions.name(f) + ' — ' + DV.Factions.get(f).virtue;
        sig.appendChild(c);
      }
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
      m.querySelector('.foot').textContent = DV.Config.VERSION + '  ·  A private, non-commercial fan prototype set in the Divergent universe' + (DV.Save.available() ? '' : '  ·  WARNING: browser storage unavailable — saving disabled');
      this.main = m;
    },
    hideMain() {
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
      range('Effects & ambience', 'sfxVolume', 0, 1, 0.05);
      toggle('Spoken PA announcements (speech synthesis)', 'paVoice');
      toggle('Room reverb', 'reverb');
      select('Ambience detail', 'ambienceDetail', [['high', 'High'], ['low', 'Low']]);
      el('div', 'h', 'Gameplay', body);
      toggle('Quest markers on compass', 'questMarkers');
      select('Dialogue text speed', 'textSpeed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']]);
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
        ['M', 'Map'], ['J', 'Quests'], ['I', 'Inventory'], ['T', 'Wait (while seated)'], ['Dialogue', 'Move the mouse or scroll to choose, click / E / Enter to confirm (or 1-9)'], ['Esc', 'Pause / close windows'],
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
        '<p><b class="accent">DIVERGENT — Build 3: Initiation</b></p>' +
        '<p>A private, non-commercial fan-game prototype inspired by the <i>Divergent</i> series by Veronica Roth. Not affiliated with or endorsed by the author, publishers or film studios. All characters, locations and story in this prototype are original.</p>' +
        '<div class="sep"></div>' +
        '<p><span class="accent">Design, code, writing & procedural art</span><br>Built with HTML, CSS, JavaScript and Three.js (r149, MIT License).</p>' +
        '<p><span class="accent">Inspirations</span><br>The Elder Scrolls III: Morrowind · early MMORPG world design · Dreamcast & PS2-era environments · PS1 character art.</p>' +
        '<p><span class="accent">Technology notes</span><br>Every texture, character, sound and piece of music is generated procedurally at runtime — no external assets are required to play.</p>' +
        '<div class="sep"></div><p class="dim">Faction before blood.</p></div>';
    },

    /* ------------------------------ wait menu ------------------------------ */
    showWait() {
      this.closeSide();
      const p = el('div', 'panel', '<div class="panel-title">Rest & Wait</div><div class="body"></div><div class="foot"></div>', DV.UI.root);
      p.id = 'waitmenu';
      const body = p.querySelector('.body');
      let hrs = 1;
      const canUntilCalled = isFinite(DV.Story.callTime()) && !DV.State.flag('tr4_open');
      body.innerHTML = '<div class="dim">It is ' + DV.Clock.str() + '. How long will you wait?</div><div class="hrs"></div><div></div>';
      const hrsEl = body.querySelector('.hrs');
      const upd = () => { hrsEl.textContent = hrs + (hrs === 1 ? ' hour' : ' hours'); };
      upd();
      const ctr = body.lastChild;
      const minus = el('span', 'btn small', '−', ctr);
      const plus = el('span', 'btn small', '+', ctr);
      minus.onclick = () => { hrs = Math.max(1, hrs - 1); upd(); };
      plus.onclick = () => { hrs = Math.min(12, hrs + 1); upd(); };
      const foot = p.querySelector('.foot');
      if (canUntilCalled) {
        const uc = el('span', 'btn', 'Until called', foot);
        uc.onclick = () => { p.remove(); DV.Game.waitUntil(DV.Story.callTime()); };
      }
      const w = el('span', 'btn', 'Wait', foot);
      w.onclick = () => { p.remove(); DV.Game.waitMinutes(hrs * 60); };
      const c = el('span', 'btn', 'Cancel', foot);
      c.onclick = () => { p.remove(); DV.Game.closeOverlay(); };
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
