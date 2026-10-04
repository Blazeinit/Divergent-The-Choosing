/* ==========================================================================
   DIVERGENT — input
   Keyboard state, edge-triggered presses, mouse deltas, pointer lock with a
   drag-to-look fallback so the camera never depends on pointer lock alone.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  const Input = {
    keys: {},
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
        if (block.indexOf(e.code) >= 0) e.preventDefault();
        if (!this.keys[e.code]) this.pressed[e.code] = true;
        this.keys[e.code] = true;
        DV.Events.emit('input:key', e.code);
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
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
