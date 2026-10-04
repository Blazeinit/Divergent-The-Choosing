/* ==========================================================================
   DIVERGENT — core utilities
   Global namespace, math helpers, seeded RNG, event bus, DOM helpers.
   Every other file attaches itself to window.DV.
   ========================================================================== */
(function () {
  'use strict';
  const DV = (window.DV = window.DV || {});

  const U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    invLerp: (a, b, v) => (b === a ? 0 : (v - a) / (b - a)),
    smooth: (t) => t * t * (3 - 2 * t),
    // frame-rate independent exponential smoothing
    damp: (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt)),
    wrapAngle(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    },
    dampAngle(a, b, lambda, dt) {
      const d = U.wrapAngle(b - a);
      return a + d * (1 - Math.exp(-lambda * dt));
    },
    dist2(ax, az, bx, bz) {
      const dx = ax - bx, dz = az - bz;
      return dx * dx + dz * dz;
    },
    dist(ax, az, bx, bz) {
      return Math.sqrt(U.dist2(ax, az, bx, bz));
    },
    // angle (rotation.y) that makes an object at a face toward b. Three.js: forward is +z.
    yawTo(ax, az, bx, bz) {
      return Math.atan2(bx - ax, bz - az);
    },
    hashString(s) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    },
    // mulberry32 seeded RNG
    rng(seed) {
      let a = (typeof seed === 'string' ? U.hashString(seed) : seed >>> 0) || 1;
      const f = function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      f.range = (lo, hi) => lo + f() * (hi - lo);
      f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
      f.pick = (arr) => arr[Math.floor(f() * arr.length)];
      f.chance = (p) => f() < p;
      return f;
    },
    rand: (lo, hi) => lo + Math.random() * (hi - lo),
    randInt: (lo, hi) => Math.floor(lo + Math.random() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
    // "08:30" -> 510 minutes
    parseTime(s) {
      if (typeof s === 'number') return s;
      const p = String(s).split(':');
      return parseInt(p[0], 10) * 60 + parseInt(p[1] || '0', 10);
    },
    // minutes -> "08:30"
    formatTime(m) {
      m = ((Math.floor(m) % 1440) + 1440) % 1440;
      const h = Math.floor(m / 60), mm = m % 60;
      return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
    },
    formatDuration(sec) {
      sec = Math.floor(sec);
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
      return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
    },
    deepClone: (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o))),
    // merge src into dst for keys missing in dst (used when loading older saves)
    fillDefaults(dst, src) {
      for (const k in src) {
        if (!(k in dst)) dst[k] = U.deepClone(src[k]);
        else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') {
          U.fillDefaults(dst[k], src[k]);
        }
      }
      return dst;
    },
    capitalize: (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s),
    hexToRgb(hex) {
      const c = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16);
      return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
    },
    rgbToCss(r, g, b) {
      return 'rgb(' + Math.round(U.clamp(r, 0, 1) * 255) + ',' + Math.round(U.clamp(g, 0, 1) * 255) + ',' + Math.round(U.clamp(b, 0, 1) * 255) + ')';
    },
    shadeHex(hex, f) {
      const [r, g, b] = U.hexToRgb(hex);
      return U.rgbToCss(r * f, g * f, b * f);
    },
    // DOM helper
    el(tag, cls, html, parent) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html !== undefined && html !== null) e.innerHTML = html;
      if (parent) parent.appendChild(e);
      return e;
    },
    esc(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    // point inside axis aligned rect {x0,z0,x1,z1}
    inRect(x, z, r) {
      return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
    },
  };
  DV.U = U;

  /* ----------------------------- Event bus ------------------------------ */
  const listeners = {};
  DV.Events = {
    on(name, fn) {
      (listeners[name] = listeners[name] || []).push(fn);
      return fn;
    },
    off(name, fn) {
      const l = listeners[name];
      if (!l) return;
      const i = l.indexOf(fn);
      if (i >= 0) l.splice(i, 1);
    },
    emit(name, data) {
      const l = listeners[name];
      if (!l) return;
      for (const fn of l.slice()) {
        try {
          fn(data);
        } catch (e) {
          console.error('[Events] handler for', name, 'failed:', e);
        }
      }
    },
  };

  DV.log = function () {
    if (DV.Config && DV.Config.DEBUG) console.log.apply(console, ['[DV]'].concat([].slice.call(arguments)));
  };
})();
