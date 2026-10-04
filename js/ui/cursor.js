/* ==========================================================================
   DIVERGENT — in-game cursor
   A cursor drawn by the game, separate from the browser's. It appears
   whenever a window is up (dialogue, the Tab menu, the wait menu, reading,
   banners, pause, the main menu and the character creator).

   Two modes:
   - captured: the mouse stays pointer-locked, so it can't leave the game
     window or end up on a second monitor. The cursor moves by raw mouse
     deltas, and hover, click, wheel, slider-drag and dropdown input are
     passed on to whatever page element is under it.
   - free: when the browser has released the mouse (Esc / pause, menus,
     no pointer lock available), it follows the real pointer and the system
     cursor is hidden, so the game's cursor is the only one on screen.

   The setting "In-game cursor" turns it off and restores the old behaviour:
   menus release the mouse and the system cursor is used.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const ARROW =
    '<svg width="26" height="30" viewBox="0 0 26 30" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="vcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe6a6"/><stop offset="0.55" stop-color="#d8a24a"/><stop offset="1" stop-color="#7a5418"/></linearGradient></defs>' +
    '<path d="M2 2 L2 23 L7.5 18 L11.5 27 L15.5 25.2 L11.6 16.6 L19 16.4 Z" fill="#000" transform="translate(1.6 1.6)" opacity="0.55"/>' +
    '<path d="M2 2 L2 23 L7.5 18 L11.5 27 L15.5 25.2 L11.6 16.6 L19 16.4 Z" fill="url(#vcg)" stroke="#120d05" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<path d="M4 6 L4 18.5 L7.2 15.6" fill="none" stroke="#fff6dc" stroke-width="1" opacity="0.7"/>' +
    '</svg>';

  const C = {
    el: null,
    tipEl: null,
    x: 0,
    y: 0,
    active: false, // a window is up and the in-game cursor is showing
    captured: false, // ...and the mouse is pointer-locked (synthetic events)
    hoverEl: null,
    downEl: null,
    rangeEl: null,
    seen: false, // the real pointer has been inside the window (free mode)

    enabled() {
      return DV.Settings.get('softCursor') !== false;
    },

    init() {
      this.x = window.innerWidth / 2;
      this.y = window.innerHeight * 0.55;
      const el = document.createElement('div');
      el.id = 'vcursor';
      el.innerHTML = ARROW;
      document.body.appendChild(el);
      this.el = el;
      const tip = document.createElement('div');
      tip.id = 'vcursor-tip';
      document.body.appendChild(tip);
      this.tipEl = tip;
      // free mode: follow the real pointer
      document.addEventListener('mousemove', (e) => {
        if (DV.Input.locked) return;
        this.x = e.clientX;
        this.y = e.clientY;
        this.seen = true;
        this.place();
      });
      document.documentElement.addEventListener('mouseleave', () => { if (!DV.Input.locked) this.seen = false; });
      document.addEventListener('mousedown', () => { if (!DV.Input.locked) this.el.classList.add('down'); });
      window.addEventListener('mouseup', () => this.el.classList.remove('down'));
      DV.Events.on('settings:changed', () => this.applySetting());
      this.applySetting();
    },
    applySetting() {
      document.documentElement.classList.toggle('vcur', this.enabled());
      if (!this.enabled()) this.setActive(false);
    },

    // should the cursor show right now?
    wanted(game) {
      if (!this.enabled() || !game) return false;
      const s = game.state;
      if (s === 'loading' || s === 'transition') return false;
      // a fight or the range has the mouse for aiming; a puzzle-type activity asks for the cursor
      if (s === 'activity') return !!DV.UI.modalOpen || !!(DV.Activity.current && DV.Activity.current.cursor);
      if (s === 'playing') {
        if (DV.UI.modalOpen) return true;
        // free mouse while walking about: show it so you can see where you'll click (not while drag-looking)
        return !DV.Input.locked && !DV.Input.dragging;
      }
      return true;
    },

    update(game) {
      const on = this.wanted(game);
      this.setActive(on);
      if (!on) return;
      this.captured = DV.Input.locked;
      this.el.classList.toggle('hidden', !this.captured && !this.seen);
      if (this.captured) this.hover(); // the page under the cursor can change without it moving
      this.style();
    },
    setActive(on) {
      if (on === this.active) return;
      this.active = on;
      if (!this.el) return;
      this.el.classList.toggle('on', on);
      if (!on) {
        this.clearHover();
        this.tipEl.classList.remove('on');
        this.endRange();
        this.downEl = null;
        // drop any mouse movement that piled up while the cursor had it
        DV.Input.takeMouse();
      }
    },

    place() {
      if (!this.el) return;
      this.el.style.transform = 'translate(' + Math.round(this.x) + 'px,' + Math.round(this.y) + 'px)';
      if (this.tipEl.classList.contains('on')) this.tipEl.style.transform = 'translate(' + Math.round(this.x + 18) + 'px,' + Math.round(this.y + 22) + 'px)';
    },

    /* ---------- captured mode: called by DV.Input ---------- */
    moveBy(dx, dy) {
      this.x = U.clamp(this.x + dx, 0, window.innerWidth - 2);
      this.y = U.clamp(this.y + dy, 0, window.innerHeight - 2);
      this.place();
      this.hover();
      const t = this.hoverEl;
      if (t) t.dispatchEvent(this.ev('mousemove', true));
      if (this.rangeEl) this.dragRange();
    },
    // returns true when the click was handled as a click on the page
    onDown(e) {
      if (!this.active || !this.captured || e.button !== 0) return false;
      this.el.classList.add('down');
      const t = this.target();
      if (!t || t === DV.Input.canvas) return false; // clicking the 3D view: normal game input
      this.downEl = t;
      t.dispatchEvent(this.ev('mousedown', true));
      const range = t.closest && t.closest('input[type=range]');
      if (range) { this.rangeEl = range; this.dragRange(); }
      return true;
    },
    onUp(e) {
      this.el.classList.remove('down');
      if (!this.active || !this.captured || e.button !== 0) { this.endRange(); return; }
      const down = this.downEl;
      this.downEl = null;
      if (this.rangeEl) { this.endRange(); return; }
      if (!down) return;
      const t = this.target();
      if (t) t.dispatchEvent(this.ev('mouseup', true));
      if (!t || !(t === down || down.contains(t) || t.contains(down))) return;
      const sel = down.closest && down.closest('select');
      if (sel) { this.cycleSelect(sel, 1); return; }
      const field = down.closest && down.closest('input:not([type=range]), textarea');
      if (field && field.type !== 'checkbox' && field.type !== 'radio') { field.focus(); return; }
      down.dispatchEvent(this.ev('click', true));
    },
    onWheel(e) {
      if (!this.active || !this.captured) return false;
      const t = this.target();
      if (!t || t === DV.Input.canvas) return false;
      const sel = t.closest && t.closest('select');
      if (sel) { this.cycleSelect(sel, Math.sign(e.deltaY)); return true; }
      for (let s = t; s && s !== document.body; s = s.parentElement) {
        if (s.scrollHeight > s.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(s).overflowY)) {
          s.scrollTop += e.deltaY;
          return true;
        }
      }
      return false; // nothing to scroll: let the game have it (dialogue uses it to move the highlight)
    },

    /* ---------- helpers ---------- */
    target() {
      return document.elementFromPoint(this.x, this.y);
    },
    ev(type, bubbles) {
      const e = new MouseEvent(type, { bubbles, cancelable: true, view: window, clientX: this.x, clientY: this.y, screenX: this.x, screenY: this.y, button: 0, buttons: type === 'mouseup' || type === 'mousemove' ? 0 : 1, detail: type === 'click' ? 1 : 0 });
      e.vcursor = true; // DV.Input ignores the events the cursor itself sends
      return e;
    },
    // synthesise :hover, mouseover/out and mouseenter/leave as the cursor crosses elements
    hover() {
      const el = this.target();
      if (el === this.hoverEl) return;
      const old = this.hoverEl;
      this.hoverEl = el;
      const chain = (e) => { const a = []; for (; e && e !== document.documentElement; e = e.parentElement) a.push(e); return a; };
      const oc = chain(old), nc = chain(el);
      if (old) old.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, view: window, clientX: this.x, clientY: this.y, relatedTarget: el }));
      for (const e of oc) if (nc.indexOf(e) < 0) { e.classList.remove('vhover'); e.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false, view: window, clientX: this.x, clientY: this.y, relatedTarget: el })); }
      if (el) el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, view: window, clientX: this.x, clientY: this.y, relatedTarget: old }));
      for (let i = nc.length - 1; i >= 0; i--) {
        const e = nc[i];
        if (oc.indexOf(e) < 0) { e.classList.add('vhover'); e.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, view: window, clientX: this.x, clientY: this.y, relatedTarget: old })); }
      }
    },
    clearHover() {
      for (let e = this.hoverEl; e && e !== document.documentElement; e = e.parentElement) e.classList.remove('vhover');
      for (const e of document.querySelectorAll('.vhover')) e.classList.remove('vhover');
      this.hoverEl = null;
    },
    // cursor look: brighter over things you can click, plus a tooltip for data-tip
    style() {
      let hot = false, tip = '';
      const start = this.captured ? this.hoverEl : this.target();
      for (let e = start; e && e !== document.body; e = e.parentElement) {
        if (!tip && e.dataset && e.dataset.tip) tip = e.dataset.tip;
        if (!hot && (e.onclick || /^(SELECT|INPUT|BUTTON|A|TEXTAREA)$/.test(e.tagName) || (e.classList && (e.classList.contains('choice') && !e.classList.contains('dis'))))) hot = true;
        if (e.classList && e.classList.contains('dis')) { hot = false; break; }
      }
      this.el.classList.toggle('hot', hot);
      if (tip !== this.tip) {
        this.tip = tip;
        this.tipEl.textContent = tip;
        this.tipEl.classList.toggle('on', !!tip);
        this.place();
      }
    },
    dragRange() {
      const r = this.rangeEl;
      if (!r) return;
      const b = r.getBoundingClientRect();
      const min = parseFloat(r.min || 0), max = parseFloat(r.max || 100), step = parseFloat(r.step || 1) || 1;
      let v = min + U.clamp((this.x - b.left) / Math.max(1, b.width), 0, 1) * (max - min);
      v = Math.round((v - min) / step) * step + min;
      const s = String(+v.toFixed(6));
      if (r.value !== s) {
        r.value = s;
        r.dispatchEvent(new Event('input', { bubbles: true }));
      }
    },
    endRange() {
      if (!this.rangeEl) return;
      this.rangeEl.dispatchEvent(new Event('change', { bubbles: true }));
      this.rangeEl = null;
    },
    cycleSelect(sel, d) {
      const n = sel.options.length;
      if (!n || !d) return;
      sel.selectedIndex = (sel.selectedIndex + d + n) % n;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      sel.dispatchEvent(new Event('input', { bubbles: true }));
    },
  };
  DV.Cursor = C;
})();
