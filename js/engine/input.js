/* ==========================================================================
   DIVERGENT — input
   Keyboard state, edge-triggered presses, mouse deltas, pointer lock with a
   drag-to-look fallback so the camera never depends on pointer lock alone.

   Keys can be rebound (Settings 'keymap': {action's key: the key pressed for
   it}): the game always asks for the action's own key ('KeyE' to interact),
   and a press is translated to it on the way in. And a gamepad (the standard
   layout) drives the same keys: the left stick walks (pushed all the way,
   runs), the right stick looks, A jumps, X interacts, B and Start go back /
   pause, Y opens the RPG menu, Back the map, the bumpers turn pages, the
   triggers are the mouse buttons, the d-pad the arrow keys, R3 crouches.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  // what can be rebound: [the action's key, its name] (Esc can't: it's always the way out)
  const ACTIONS = [
    ['KeyW', 'Move forward'], ['KeyS', 'Move back'], ['KeyA', 'Move left'], ['KeyD', 'Move right'],
    ['ShiftLeft', 'Run · block'], ['Space', 'Jump · dodge'], ['KeyC', 'Crouch / sneak'], ['KeyE', 'Interact · talk · take'],
    ['Tab', 'RPG menu'], ['KeyM', 'Map'], ['KeyJ', 'Quests · jab'], ['KeyI', 'Inventory'], ['KeyT', 'Wait'],
    ['KeyK', 'Cross (fights)'], ['KeyL', 'Kick (fights)'], ['KeyQ', 'Yield (fights) · page back'],
  ];
  // the gamepad (standard mapping): button → key
  const PAD = { 0: 'Space', 1: 'Escape', 2: 'KeyE', 3: 'Tab', 4: 'KeyQ', 5: 'KeyE', 6: 'MouseRight', 7: 'MouseLeft', 8: 'KeyM', 9: 'Escape', 10: 'ShiftLeft', 11: 'KeyC', 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };
  const DEAD = 0.3, LOOK = 900; // (stick dead zone; right stick look speed, px a second at full tilt)

  const Input = {
    ACTIONS,
    keys: {},
    padKeys: {}, // what the gamepad is holding down (so it lets go of only its own)
    pad: null, // the connected pad's id, if any
    capture: null, // a rebind waiting for its key: fn(code)
    pressed: {},
    mouseDX: 0,
    mouseDY: 0,
    wheel: 0,
    locked: false,
    dragging: false,
    canvas: null,
    wantLock: false,
    lastLockExit: 0,
    lastUserExit: 0, // last time the PLAYER released the lock (Esc) — browsers refuse a quick re-lock after that
    clicks: 0,

    init(canvas) {
      this.canvas = canvas;
      const block = ['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'];
      window.addEventListener('keydown', (e) => {
        // let text inputs work normally
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          if (e.code === 'Escape' || e.code === 'Enter') this.pressed[e.code] = true;
          return;
        }
        if (this.capture) { e.preventDefault(); e.stopPropagation(); const f = this.capture; this.capture = null; f(e.code); return; }
        if (block.indexOf(e.code) >= 0) e.preventDefault();
        const code = this.map(e.code);
        if (!code) return;
        if (block.indexOf(code) >= 0) e.preventDefault();
        if (!this.keys[code]) this.pressed[code] = true;
        this.keys[code] = true;
        DV.Events.emit('input:key', code);
      }, true);
      window.addEventListener('keyup', (e) => {
        const code = this.map(e.code);
        if (code) this.keys[code] = false;
      });
      window.addEventListener('gamepadconnected', (e) => {
        this.pad = e.gamepad.id;
        if (DV.UI && DV.UI.notify) DV.UI.notify('Gamepad connected');
      });
      window.addEventListener('gamepaddisconnected', () => {
        this.pad = null;
        for (const k in this.padKeys) if (this.padKeys[k]) { this.keys[k] = false; this.padKeys[k] = false; }
      });
      window.addEventListener('blur', () => {
        this.keys = {};
      });
      document.addEventListener('mousemove', (e) => {
        if (e.vcursor) return;
        if (this.locked) {
          // ignore absurd spikes some browsers produce right after locking
          if (Math.abs(e.movementX) < 400 && Math.abs(e.movementY) < 400) {
            // a window is up: the movement drives the in-game cursor, not the camera
            if (DV.Cursor && DV.Cursor.active) DV.Cursor.moveBy(e.movementX, e.movementY);
            else {
              this.mouseDX += e.movementX;
              this.mouseDY += e.movementY;
            }
          }
        } else if (this.dragging) {
          this.mouseDX += e.movementX || 0;
          this.mouseDY += e.movementY || 0;
        }
      });
      canvas.addEventListener('mousedown', (e) => {
        if (e.vcursor) return;
        this.clicks++;
        // captured mouse + in-game cursor over a window: the click goes to the page under the cursor
        if (DV.Cursor && DV.Cursor.onDown(e)) return;
        this.dragging = true;
        // with the pointer captured, clicks are game input (e.g. confirm a dialogue choice)
        if (e.button === 0 && this.locked) this.pressed.MouseLeft = true;
        // both buttons as held keys too (fighting, aiming)
        if (e.button === 0) this.keys.MouseLeft = true;
        if (e.button === 2) { this.keys.MouseRight = true; if (this.locked) this.pressed.MouseRight = true; }
        DV.Events.emit('input:canvasClick', e);
      });
      window.addEventListener('mouseup', (e) => {
        if (e.vcursor) return;
        this.dragging = false;
        if (e.button === 0) this.keys.MouseLeft = false;
        if (e.button === 2) this.keys.MouseRight = false;
        if (DV.Cursor) DV.Cursor.onUp(e);
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (DV.Cursor && DV.Cursor.onWheel(e)) return; // scrolled a list under the in-game cursor
        this.wheel += Math.sign(e.deltaY);
      }, { passive: false });
      document.addEventListener('pointerlockchange', () => {
        const was = this.locked;
        this.locked = document.pointerLockElement === this.canvas;
        if (was && !this.locked) {
          this.lastLockExit = performance.now();
          if (this.wantLock) this.lastUserExit = this.lastLockExit; // we didn't ask: the player pressed Esc
          DV.Events.emit('input:lockLost', { requested: !this.wantLock });
        }
        if (this.locked) DV.Events.emit('input:locked');
      });
      document.addEventListener('pointerlockerror', () => {
        this.locked = false;
      });
    },

    // a key pressed → the action's key it stands for (null: it's been moved off this key, nothing else on it)
    map(code) {
      const km = DV.Settings && DV.Settings.get('keymap');
      if (!km) return code;
      for (const a in km) if (km[a] === code) return a;
      return km[code] && km[code] !== code ? null : code;
    },
    // the key an action is on now (for the menus and the hints to show)
    keyFor(action) {
      const km = DV.Settings && DV.Settings.get('keymap');
      return (km && km[action]) || action;
    },
    // 'KeyE' → 'E', 'ShiftLeft' → 'Left Shift', … (for showing)
    label(code) {
      if (!code) return '—';
      if (/^Key[A-Z]$/.test(code)) return code.slice(3);
      if (/^Digit\d$/.test(code)) return code.slice(5);
      const n = { ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Left Alt', AltRight: 'Right Alt', Space: 'Space', Tab: 'Tab', Enter: 'Enter', Backquote: '`', CapsLock: 'Caps Lock' }[code];
      return n || code.replace(/^Arrow/, '').replace(/^Numpad/, 'Num ');
    },
    // rebind an action to a key; a key already used by another action swaps with it
    bind(action, code) {
      const km = Object.assign({}, DV.Settings.get('keymap') || {});
      const was = km[action] || action;
      for (const a of ACTIONS.map((x) => x[0])) if (a !== action && (km[a] || a) === code) km[a] = was;
      km[action] = code;
      for (const a in km) if (km[a] === a) delete km[a];
      DV.Settings.set('keymap', km);
      this.keys = {};
    },
    // the gamepad: read once a frame, before the game does
    pollPad(dt) {
      const pads = navigator.getGamepads ? navigator.getGamepads() : null;
      let g = null;
      if (pads) for (const p of pads) if (p && p.connected) { g = p; break; }
      if (!g) return;
      const want = {};
      for (const b in PAD) if (g.buttons[b] && (g.buttons[b].pressed || g.buttons[b].value > 0.5)) want[PAD[b]] = true;
      const lx = g.axes[0] || 0, ly = g.axes[1] || 0, rx = g.axes[2] || 0, ry = g.axes[3] || 0;
      if (ly < -DEAD) want.KeyW = true;
      if (ly > DEAD) want.KeyS = true;
      if (lx < -DEAD) want.KeyA = true;
      if (lx > DEAD) want.KeyD = true;
      if (Math.hypot(lx, ly) > 0.92) want.ShiftLeft = true;
      for (const k of new Set(Object.keys(want).concat(Object.keys(this.padKeys)))) {
        const on = !!want[k];
        if (on === !!this.padKeys[k]) continue;
        this.padKeys[k] = on;
        if (on) { if (!this.keys[k]) this.pressed[k] = true; this.keys[k] = true; DV.Events.emit('input:key', k); } else this.keys[k] = false;
      }
      const sx = Math.abs(rx) > 0.15 ? rx : 0, sy = Math.abs(ry) > 0.15 ? ry : 0;
      if (sx || sy) {
        const k = LOOK * (dt || 1 / 60);
        // (the cursor only when a window's up: walking about, the stick looks, captured or not)
        const G = DV.Game, win = DV.UI && DV.UI.modalOpen || (G && G.state !== 'playing' && G.state !== 'activity');
        if (DV.Cursor && DV.Cursor.active && win) DV.Cursor.moveBy(sx * k, sy * k);
        else { this.mouseDX += sx * Math.abs(sx) * k; this.mouseDY += sy * Math.abs(sy) * k; }
      }
    },

    down(code) {
      return !!this.keys[code];
    },
    wasPressed(code) {
      return !!this.pressed[code];
    },
    consume(code) {
      const v = !!this.pressed[code];
      this.pressed[code] = false;
      return v;
    },
    takeMouse() {
      const d = [this.mouseDX, this.mouseDY];
      this.mouseDX = this.mouseDY = 0;
      return d;
    },
    takeWheel() {
      const w = this.wheel;
      this.wheel = 0;
      return w;
    },
    requestLock() {
      if (this.locked || !this.canvas || !this.canvas.requestPointerLock) return;
      // Chrome refuses a re-lock that comes too soon after the player exits with Esc
      // (re-locking after the game's own exitLock() is allowed straight away)
      if (performance.now() - this.lastUserExit < 1100) return;
      this.wantLock = true;
      try {
        const r = this.canvas.requestPointerLock();
        if (r && r.catch) r.catch(() => {});
      } catch (e) {
        /* ignore — drag fallback still works */
      }
    },
    exitLock() {
      this.wantLock = false;
      if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
      this.locked = false;
    },
    endFrame() {
      this.pressed = {};
    },
    clearMovement() {
      for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) this.keys[k] = false;
      this.mouseDX = this.mouseDY = 0;
    },
  };
  DV.Input = Input;
})();
