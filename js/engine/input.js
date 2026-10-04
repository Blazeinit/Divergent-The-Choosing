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
        if (this.locked) {
          // ignore absurd spikes some browsers produce right after locking
          if (Math.abs(e.movementX) < 400 && Math.abs(e.movementY) < 400) {
            this.mouseDX += e.movementX;
            this.mouseDY += e.movementY;
          }
        } else if (this.dragging) {
          this.mouseDX += e.movementX || 0;
          this.mouseDY += e.movementY || 0;
        }
      });
      canvas.addEventListener('mousedown', (e) => {
        this.dragging = true;
        this.clicks++;
        DV.Events.emit('input:canvasClick', e);
      });
      window.addEventListener('mouseup', () => {
        this.dragging = false;
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('wheel', (e) => {
        this.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      }, { passive: false });
      document.addEventListener('pointerlockchange', () => {
        const was = this.locked;
        this.locked = document.pointerLockElement === this.canvas;
        if (was && !this.locked) {
          this.lastLockExit = performance.now();
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
      // Chrome refuses a re-lock that comes too soon after an exit.
      if (performance.now() - this.lastLockExit < 1100) return;
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
