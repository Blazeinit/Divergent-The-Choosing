/* ==========================================================================
   DIVERGENT — the world map
   The whole city on one page, drawn from the city map (DV.CityMap): the
   Fence and its gate, the farmland outside, the marsh where the lake was,
   every block (tinted by the sector it's in), the main streets by name, the
   L along Lake Street, the landmarks, your family's home, and you.

   Out in the city you're an arrow where you stand. Anywhere else (the Hub,
   a compound, your home) the map marks the place you're in. Scroll or use
   the + and − buttons (or the + and − keys) to zoom, drag to pan, double-
   click to fit the city again. Hover for what's under the cursor.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const MAIN_STREETS = { 'Lake St': 1, 'Madison St': 1, 'North Ave': 1, 'Chicago Ave': 1, 'Van Buren St': 1, 'Halsted St': 1, 'State St': 1, 'Ashland Ave': 1, 'Western Ave': 1, 'Michigan Ave': 1, 'Kedzie Ave': 1 };
  const FACTIONS = ['abnegation', 'amity', 'candor', 'dauntless', 'erudite'];
  const ICON = { seal: '◎', hub: '▲', candor: '⚖', erudite: '◉', abnegation: '✋', dauntless: '✦', wheel: '❂', tower: '▮', gate: '⛩', amity: '❀' };

  const WM = {
    zoom: 1,
    cx: null,
    cz: null,
    T: null, // the last transform: { s, cx, cz, w, h }

    reset() { this.zoom = 1; this.cx = null; this.cz = null; },
    // where you are on the map: [x, z, rot|null, label]
    you() {
      const zone = DV.World.current;
      if (!zone || DV.Game.inSimulation()) return null;
      if (zone.id === 'testing_center') return [DV.Player.x, DV.Player.z, DV.Player.rot, zone.placeName(DV.Player.x, DV.Player.z).name];
      const at = DV.CityMap.zoneLocation(zone.id);
      return at ? [at[0], at[1], null, zone.def.name] : null;
    },
    blocks() {
      if (this._blocks) return this._blocks;
      const CM = DV.CityMap, out = [];
      const xs = CM.avenues, zs = CM.streets;
      for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < zs.length; j++) {
        const a = CM.road(xs[i]), b = CM.road(xs[i + 1]), c = CM.road(zs[j]), d = CM.road(zs[j + 1]);
        const q = [a[1], c[1], b[0], d[0]];
        const mx = (q[0] + q[2]) / 2, mz = (q[1] + q[3]) / 2;
        if (Math.hypot(mx - CM.centre[0], mz - CM.centre[1]) > CM.radius) continue;
        if (q[0] >= CM.marshX - 10) continue;
        q[2] = Math.min(q[2], CM.marshX - 4);
        out.push({ r: q, d: CM.district(mx, mz) });
      }
      return (this._blocks = out);
    },

    draw(cv) {
      const CM = DV.CityMap;
      const w = (cv.width = cv.clientWidth || 800), h = (cv.height = cv.clientHeight || 500);
      const g = cv.getContext('2d');
      const s = (Math.min(w, h) / (2 * (CM.fence + 50))) * this.zoom;
      const me = this.you();
      if (this.cx === null) { this.cx = CM.centre[0]; this.cz = CM.centre[1]; }
      const cx = this.cx, cz = this.cz;
      this.T = { s, cx, cz, w, h };
      const X = (x) => w / 2 + (x - cx) * s, Y = (z) => h / 2 + (z - cz) * s;
      const C = CM.centre, F = CM.fence;
      const visited = DV.State.data.world.visited || {};

      // outside the Fence: Amity's fields, in rings and wedges
      g.fillStyle = '#12140e'; g.fillRect(0, 0, w, h);
      for (let ring = 0; ring < 5; ring++) for (let k = 0; k < 36; k++) {
        const r0 = F + 8 + ring * 70, a0 = (k / 36) * Math.PI * 2, a1 = ((k + 1) / 36) * Math.PI * 2;
        g.fillStyle = (k + ring) % 3 === 0 ? 'rgba(70,82,40,0.32)' : (k + ring) % 3 === 1 ? 'rgba(92,78,44,0.28)' : 'rgba(50,62,34,0.3)';
        g.beginPath(); g.arc(X(C[0]), Y(C[1]), (r0 + 66) * s, a0, a1); g.arc(X(C[0]), Y(C[1]), r0 * s, a1, a0, true); g.closePath(); g.fill();
      }
      // inside: the city's ground
      g.save();
      g.beginPath(); g.arc(X(C[0]), Y(C[1]), F * s, 0, Math.PI * 2); g.clip();
      g.fillStyle = '#16171a'; g.fillRect(0, 0, w, h);
      // the marsh, where the lake was
      g.fillStyle = '#10201f'; g.fillRect(X(CM.marshX), 0, w, h);
      g.fillStyle = 'rgba(120,150,140,0.12)';
      for (let i = 0; i < 260; i++) { const x = CM.marshX + ((i * 37) % 240), z = C[1] - F + ((i * 211) % (2 * F)); g.fillRect(X(x), Y(z), 1.5, 1.5); }
      // the sectors, as a wash of colour
      for (const d of CM.districts) {
        const gr = g.createRadialGradient(X(d.c[0]), Y(d.c[1]), 0, X(d.c[0]), Y(d.c[1]), d.r * s);
        gr.addColorStop(0, hexA(d.color, visited[d.id] ? 0.3 : 0.18));
        gr.addColorStop(1, hexA(d.color, 0));
        g.fillStyle = gr;
        g.fillRect(X(d.c[0] - d.r), Y(d.c[1] - d.r), 2 * d.r * s, 2 * d.r * s);
      }
      // blocks
      for (const b of this.blocks()) {
        const [x0, z0, x1, z1] = b.r;
        const dd = b.d.d;
        g.fillStyle = dd && b.d.k > 0.1 ? mixHex('#3a3833', dd.color, Math.min(0.45, b.d.k * 0.7)) : '#35332e';
        g.fillRect(X(x0), Y(z0), (x1 - x0) * s, (z1 - z0) * s);
      }
      // the Testing Center's grounds
      const cp = CM.campus;
      g.fillStyle = '#6a5a38';
      g.fillRect(X(cp[0]), Y(cp[1]), (cp[2] - cp[0]) * s, (cp[3] - cp[1]) * s);
      // the Hub's plaza and tower
      g.fillStyle = '#26282c'; g.beginPath(); g.arc(X(CM.hub[0]), Y(CM.hub[1]), 50 * s, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0c0d0f'; g.fillRect(X(CM.hub[0] - 25.5), Y(CM.hub[1] - 25.5), 51 * s, 51 * s);
      // landmark footprints
      g.fillStyle = '#1b1c1f';
      for (const l of CM.landmarks) if (l.w && !l.outside) g.fillRect(X(l.x - l.w / 2), Y(l.z - l.d / 2), l.w * s, l.d * s);
      // the L along Lake Street
      const tr = CM.track, tz = (tr.z0 + tr.z1) / 2;
      g.strokeStyle = '#8f8472'; g.lineWidth = Math.max(1.5, 4.6 * s); g.setLineDash([6, 4]);
      g.beginPath(); g.moveTo(X(tr.x0), Y(tz)); g.lineTo(X(tr.x1), Y(tz)); g.stroke();
      g.setLineDash([]);
      g.restore();

      // the Fence: the ring, its towers, the gate
      g.strokeStyle = '#c9b27a'; g.lineWidth = 2;
      g.beginPath(); g.arc(X(C[0]), Y(C[1]), F * s, 0, Math.PI * 2); g.stroke();
      const n = Math.round((Math.PI * 2 * F) / 9);
      g.fillStyle = '#c9b27a';
      for (let k = 11; k < n; k += 22) { const a = ((k + 0.5) / n) * Math.PI * 2; g.fillRect(X(C[0] + Math.cos(a) * F) - 2, Y(C[1] + Math.sin(a) * F) - 2, 4, 4); }
      // the old pier and its wheel
      g.strokeStyle = '#8a8478'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(X(CM.ferris[0]), Y(CM.ferris[1]), Math.max(4, 38 * s), 0, Math.PI * 2); g.stroke();

      const font = (px, serif) => (serif ? px + 'px Georgia, serif' : px + 'px Trebuchet MS, sans-serif');
      // labels go through a placer: a label that would sit on one already placed is left out
      // (you, then the objective, home, landmarks, the sectors, and the streets last)
      const placed = [];
      const label = (text, x, y, px, serif, color, sp) => {
        g.font = font(px, serif);
        const wd = g.measureText(text).width + (sp || 0) * text.length, r = [x - wd / 2 - 2, y - px, x + wd / 2 + 2, y + 3];
        if (placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) return false;
        placed.push(r);
        g.fillStyle = color;
        if (sp) spaced(g, text, x, y, sp); else { g.textAlign = 'center'; g.fillText(text, x, y); }
        return true;
      };
      const icon = (ch, x, y, px, color) => { g.font = font(px); g.textAlign = 'center'; g.fillStyle = color; g.fillText(ch, x, y + px / 3); placed.push([x - px / 2, y - px / 2, x + px / 2, y + px / 2]); };
      this._hits = [];

      // you
      if (me) {
        const px = X(me[0]), py = Y(me[1]);
        if (me[2] !== null) {
          g.save(); g.translate(px, py); g.rotate(-me[2] + Math.PI);
          g.fillStyle = '#ffe08a'; g.strokeStyle = '#1a1408'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 7); g.lineTo(0, 3.5); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke();
          g.restore();
        } else {
          const pulse = 6 + 3 * Math.sin(performance.now() / 300);
          g.strokeStyle = '#ffe08a'; g.lineWidth = 2;
          g.beginPath(); g.arc(px, py, pulse, 0, Math.PI * 2); g.stroke();
          g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(px, py, 2.5, 0, Math.PI * 2); g.fill();
        }
        placed.push([px - 8, py - 8, px + 8, py + 8]);
        // a dark plate behind the name so it reads over anything
        g.font = font(11, true);
        const t = 'YOU — ' + me[3].toUpperCase(), tw = g.measureText(t).width;
        g.fillStyle = 'rgba(10,10,10,0.75)'; g.fillRect(px - tw / 2 - 4, py - 26, tw + 8, 15);
        label(t, px, py - 15, 11, true, '#ffe08a');
      }
      // the objective (when it's on this map)
      const cur = DV.Quests.current();
      if (cur && DV.World.current && DV.World.current.id === 'testing_center') {
        const t = DV.UI.targetPos(DV.Quests.objTarget(cur.obj));
        if (t) { icon('★', X(t[0]), Y(t[1]), 16, '#ffd36a'); this._hits.push({ x: X(t[0]), y: Y(t[1]), tip: DV.Quests.objText(cur.obj) }); }
      }
      // your family's home
      const up = DV.State.data.player && DV.State.data.player.upbringing;
      const home = up && CM.homes[up];
      if (home && !home.gate) {
        const px = X(home.x), py = Y(home.z);
        icon('⌂', px, py, 15, '#ffd36a');
        label('Home', px, py - 12, 11, true, '#ffd36a');
        this._hits.push({ x: px, y: py, tip: 'Your family\'s home — ' + home.street });
      }
      // landmarks
      for (const l of CM.landmarks) {
        const px = X(l.x), py = Y(l.z);
        if (px < -40 || py < -40 || px > w + 40 || py > h + 40) continue;
        const fac = FACTIONS.indexOf(l.icon) >= 0 ? DV.Factions.get(l.icon) : null;
        icon(ICON[l.icon] || '◆', px, py, 15, fac && fac.accent ? fac.accent : '#e8d9b0');
        label(l.name, px, py + 20, 11, true, '#e8dcc0');
        this._hits.push({ x: px, y: py, tip: l.name });
      }
      // sector names
      for (const d of CM.districts) {
        const at = d.label || d.c;
        label(d.name.toUpperCase(), X(at[0]), Y(at[1]), Math.max(11, Math.min(18, 13 * Math.sqrt(this.zoom))), true, visited[d.id] ? 'rgba(240,226,190,0.92)' : 'rgba(200,190,170,0.5)', 2);
      }
      label('THE MARSH', X(CM.marshX + 110), Y(C[1] + 40), 13, true, 'rgba(160,190,185,0.6)', 3);
      label('AMITY FARMLAND', X(C[0] - F - 40), Y(C[1] + F * 0.7 + 60), 13, true, 'rgba(170,190,120,0.55)', 2);
      // street names (the main ones until you zoom in)
      const all = this.zoom >= 1.8, sp = Math.max(9, Math.min(12, 9 * s * 3));
      for (const st of CM.streets) {
        if (!all && !MAIN_STREETS[st.name]) continue;
        const half = Math.sqrt(Math.max(0, F * F - (st.z - C[1]) * (st.z - C[1])));
        // along the street, a little in from where it leaves the Fence (or the left edge, zoomed)
        const x0 = Math.max(X(C[0] - half + 30), 60);
        label(st.name.toUpperCase(), x0 + 40, Y(st.z) + 4, sp, false, 'rgba(230,220,200,0.55)');
      }
      for (const av of CM.avenues) {
        if (!all && !MAIN_STREETS[av.name]) continue;
        const half = Math.sqrt(Math.max(0, F * F - (av.x - C[0]) * (av.x - C[0])));
        const y0 = Math.max(Y(C[1] - half + 30), 110);
        g.font = font(sp);
        const tw = g.measureText(av.name.toUpperCase()).width;
        const r = [X(av.x) - 2, y0, X(av.x) + sp + 4, y0 + tw];
        if (placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) continue;
        placed.push(r);
        g.fillStyle = 'rgba(230,220,200,0.55)';
        g.save(); g.translate(X(av.x) + 4, y0); g.rotate(Math.PI / 2); g.textAlign = 'left'; g.fillText(av.name.toUpperCase(), 0, 0); g.restore();
      }
      // a scale bar, and the key
      const bar = niceLen(110 / s);
      g.fillStyle = '#a39a89'; g.fillRect(w - 24 - bar * s, h - 26, bar * s, 2);
      g.font = font(11); g.textAlign = 'right'; g.fillText(bar + ' m', w - 24, h - 32);
      g.textAlign = 'left';
      g.fillText('▲ you   ⌂ home   ★ objective   ◎ ▲ ⚖ ◉ ✋ ✦ landmarks   — — the L   ○ the Fence', 12, h - 12);
    },

    // what's under the cursor
    tip(mx, my) {
      for (const hp of this._hits || []) if (Math.hypot(hp.x - mx, hp.y - my) < 12) return hp.tip;
      const T = this.T;
      if (!T) return '';
      const x = T.cx + (mx - T.w / 2) / T.s, z = T.cz + (my - T.h / 2) / T.s;
      const CM = DV.CityMap;
      if (Math.hypot(x - CM.centre[0], z - CM.centre[1]) > CM.fence) return 'Outside the Fence — Amity farmland';
      const L = CM.locate(x, z);
      return L.name + (L.sub && L.sub !== L.name ? ' · ' + L.sub : '');
    },
    zoomBy(k, mx, my) {
      const T = this.T;
      const nz = U.clamp(this.zoom * k, 1, 8);
      if (T && mx !== undefined) {
        // keep the point under the cursor where it is
        const x = T.cx + (mx - T.w / 2) / T.s, z = T.cz + (my - T.h / 2) / T.s;
        const s2 = (T.s / this.zoom) * nz;
        this.cx = x - (mx - T.w / 2) / s2; this.cz = z - (my - T.h / 2) / s2;
      }
      this.zoom = nz;
      if (nz === 1) { this.cx = DV.CityMap.centre[0]; this.cz = DV.CityMap.centre[1]; }
    },
    // hook the canvas up: drag to pan, wheel to zoom, double-click to fit, hover tips
    attach(cv, redraw) {
      let drag = null;
      const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.onmousedown = (e) => { drag = pos(e); };
      cv.onmouseup = cv.onmouseleave = () => { drag = null; };
      cv.onmousemove = (e) => {
        const p = pos(e);
        if (drag && this.T) {
          this.cx -= (p[0] - drag[0]) / this.T.s; this.cz -= (p[1] - drag[1]) / this.T.s;
          drag = p;
          redraw();
        }
        const t = this.tip(p[0], p[1]);
        if (DV.Cursor && DV.Cursor.enabled()) cv.dataset.tip = t; else cv.title = t;
      };
      cv.onwheel = (e) => { e.preventDefault(); const p = pos(e); this.zoomBy(e.deltaY < 0 ? 1.25 : 0.8, p[0], p[1]); redraw(); };
      cv.ondblclick = () => { this.reset(); redraw(); };
      // (the dev menu: Shift+click goes there)
      cv.onclick = (e) => {
        if (!(DV.Dev && DV.Dev.on()) || !(e.shiftKey || DV.Input.down('ShiftLeft') || DV.Input.down('ShiftRight')) || !this.T) return;
        const zone = DV.World.current;
        if (!zone || zone.id !== 'testing_center') { DV.UI.notify('Dev: the city map only goes places from the Testing Center\'s streets.'); return; }
        const p = pos(e), x = this.T.cx + (p[0] - this.T.w / 2) / this.T.s, z = this.T.cz + (p[1] - this.T.h / 2) / this.T.s;
        if (DV.Dev.go(x, z)) DV.Game.closeOverlay();
      };
    },
  };

  // (U.hexToRgb gives 0..1)
  function hexA(hex, a) { const [r, g, b] = U.hexToRgb(hex); return 'rgba(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ',' + a + ')'; }
  function mixHex(a, b, k) {
    const A = U.hexToRgb(a), B = U.hexToRgb(b);
    return 'rgb(' + Math.round((A[0] + (B[0] - A[0]) * k) * 255) + ',' + Math.round((A[1] + (B[1] - A[1]) * k) * 255) + ',' + Math.round((A[2] + (B[2] - A[2]) * k) * 255) + ')';
  }
  // letter-spaced text, centred on x
  function spaced(g, text, x, y, sp) {
    const wd = g.measureText(text).width + sp * (text.length - 1);
    let cx = x - wd / 2;
    g.textAlign = 'left';
    for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
    g.textAlign = 'center';
  }
  function niceLen(m) { for (const v of [10, 25, 50, 100, 200, 250, 500]) if (v >= m * 0.7) return v; return 1000; }

  DV.WorldMap = WM;
})();
