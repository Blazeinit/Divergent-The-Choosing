/* ==========================================================================
   DIVERGENT — dialogue window
   NAME / FACTION header, typewriter text, numbered responses, attribute
   check labels (greyed when unavailable), keyboard + mouse selection.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const speeds = { slow: 35, normal: 70, fast: 160, instant: 99999 };

  const DUI = {
    el: null,
    typing: false,
    sel: 0,

    init() {
      const p = U.el('div', 'panel hidden', null, DV.UI.root);
      p.id = 'dialogue';
      p.innerHTML = '<div class="dh"><span class="speaker"></span><span class="faction"></span><span class="disp"></span></div><div class="text"></div><div class="choices"></div>';
      this.el = p;
      DV.Events.on('dialogue:node', (v) => this.show(v));
      DV.Events.on('dialogue:end', () => this.hide());
    },
    show(v) {
      this.view = v;
      this.el.classList.remove('hidden');
      this.el.querySelector('.speaker').textContent = v.speaker || '';
      const fe = this.el.querySelector('.faction');
      if (v.factionName && v.faction) {
        const f = DV.Factions.get(v.faction);
        fe.textContent = v.factionName;
        fe.style.display = '';
        fe.style.color = v.faction === 'candor' ? '#111' : '#f4ecd8';
        fe.style.background = v.faction === 'candor' ? '#e8e6e0' : f.color;
      } else fe.style.display = 'none';
      // disposition hint (empathy skill)
      const de = this.el.querySelector('.disp');
      if (v.npcId && DV.Stats.skill('empathy') >= 30) {
        const d = DV.Reputation.disposition(v.npcId);
        de.textContent = 'Disposition: ' + DV.Reputation.dispositionLabel(d);
      } else if (v.npcId && DV.State.npc(v.npcId).mem.met) {
        de.textContent = '';
      } else de.textContent = '';
      // text: [bracketed stage directions] in italics
      this.full = v.text;
      this.shown = 0;
      this.typing = DV.Settings.get('textSpeed') !== 'instant';
      this.renderText();
      this.renderChoices();
      this.sel = 0;
      this.highlight();
    },
    renderText() {
      const t = this.typing ? this.full.slice(0, Math.floor(this.shown)) : this.full;
      const html = U.esc(t).replace(/\[([^\]]*)\]?/g, (m, a) => '<i>[' + a + (m.endsWith(']') ? ']' : '') + '</i>').replace(/\n/g, '<br>');
      this.el.querySelector('.text').innerHTML = html;
    },
    renderChoices() {
      const box = this.el.querySelector('.choices');
      box.innerHTML = '';
      this.view.choices.forEach((ch, i) => {
        const d = U.el('div', 'choice' + (ch.enabled ? '' : ' dis') + (ch.raw && ch.raw.end ? ' end' : ''), null, box);
        let html = '<span class="n">' + (i + 1) + '.</span><span>';
        if (ch.checkLabel) html += '<span class="chk' + (ch.checkPass ? ' pass' : '') + '">' + ch.checkLabel + '</span> ';
        if (ch.tag) html += '<span class="tag">[' + U.esc(ch.tag) + ']</span> ';
        html += U.esc(ch.label) + '</span>';
        d.innerHTML = html;
        d.onmouseenter = () => { if (ch.enabled) { this.sel = i; this.highlight(); DV.Audio.play('hover', { volume: 0.5 }); } };
        d.onclick = () => this.pick(i);
      });
      box.style.visibility = this.typing ? 'hidden' : 'visible';
    },
    highlight() {
      const items = this.el.querySelectorAll('.choice');
      items.forEach((e, i) => e.classList.toggle('sel', i === this.sel));
    },
    pick(i) {
      if (this.typing) { this.finishTyping(); return; }
      const ch = this.view && this.view.choices[i];
      if (!ch || !ch.enabled) { DV.Audio.play('error', { volume: 0.5 }); return; }
      DV.Audio.play('click');
      DV.Dialogue.choose(i);
    },
    finishTyping() {
      this.typing = false;
      this.renderText();
      this.el.querySelector('.choices').style.visibility = 'visible';
    },
    hide() {
      this.el.classList.add('hidden');
      this.view = null;
    },
    update(dt, input) {
      if (!this.view) return;
      if (this.typing) {
        const sp = speeds[DV.Settings.get('textSpeed')] || 70;
        const before = Math.floor(this.shown);
        this.shown += sp * dt;
        if (Math.floor(this.shown) !== before && Math.floor(this.shown) % 3 === 0) DV.Audio.play('type', { volume: 0.6 });
        if (this.shown >= this.full.length) this.finishTyping();
        else this.renderText();
      }
      // keyboard
      for (let k = 1; k <= 9; k++) {
        if (input.consume('Digit' + k) || input.consume('Numpad' + k)) { this.pick(k - 1); return; }
      }
      const n = this.view.choices.length;
      if (input.consume('ArrowDown') || input.consume('KeyS')) { this.step(1, n); }
      if (input.consume('ArrowUp') || input.consume('KeyW')) { this.step(-1, n); }
      if (input.consume('Enter') || input.consume('Space') || input.consume('KeyE')) {
        if (this.typing) this.finishTyping();
        else this.pick(this.sel);
      }
    },
    step(d, n) {
      for (let k = 0; k < n; k++) {
        this.sel = (this.sel + d + n) % n;
        if (this.view.choices[this.sel].enabled) break;
      }
      this.highlight();
      DV.Audio.play('hover', { volume: 0.5 });
    },
  };
  DV.DialogueUI = DUI;
})();
