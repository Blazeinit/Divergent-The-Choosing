/* ==========================================================================
   DIVERGENT — character creation
   Step 1: identity & appearance (live 3D model, rotatable)
   Step 2: attribute allocation (pool, descriptions)
   Step 3: confirm
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const el = U.el;

  const Creator = {
    step: 0,
    data: null,

    defaults() {
      return {
        name: '',
        sex: 'f',
        upbringing: 'abnegation',
        skin: 2,
        face: 0,
        hair: 'ponytail',
        hairColor: 1,
        build: 'average',
        height: 1.0,
        eyes: 0,
        attrs: { strength: 3, agility: 3, intelligence: 3, perception: 3, charisma: 3, resolve: 3 },
        selAttr: 'strength',
      };
    },
    appearance() {
      const d = this.data;
      return {
        sex: d.sex,
        seed: 777,
        height: d.height,
        build: d.build,
        skin: DV.SkinTones[d.skin],
        face: d.face,
        eyes: DV.EyeColors[d.eyes],
        hair: d.hair,
        hairColor: DV.HairColors[d.hairColor].hex,
        age: 16,
        beard: 'none',
        outfit: U.deepClone(DV.Character.OUTFITS.neutral),
      };
    },
    pointsLeft() {
      const used = Object.values(this.data.attrs).reduce((a, b) => a + b, 0) - DV.RPG.ATTR_BASE * 6;
      return DV.RPG.ATTR_POOL - used;
    },

    open() {
      this.data = this.defaults();
      this.step = 0;
      this.root = el('div', null, null, DV.UI.root);
      this.root.id = 'creator';
      this.render();
      DV.Game.creatorPreview(this.appearance());
    },
    close() {
      if (this.root) this.root.remove();
      this.root = null;
    },
    refreshModel() {
      DV.Game.creatorPreview(this.appearance());
    },

    render() {
      const r = this.root;
      r.innerHTML = '';
      const left = el('div', 'panel left', null, r);
      const steps = el('div', 'steps', null, left);
      ['Appearance', 'Attributes', 'Confirm'].forEach((s, i) => el('span', i === this.step ? 'on' : '', (i + 1) + '. ' + s, steps));
      el('div', 'panel-title', ['Who are you?', 'What are you capable of?', 'Ready?'][this.step], left);
      const body = el('div', 'body scroll', null, left);
      const right = el('div', 'panel right', null, r);
      el('div', 'panel-title', ['Upbringing', 'Attribute', 'Summary'][this.step], right);
      const rbody = el('div', 'body scroll', null, right);
      el('div', 'center-hint', 'Drag to rotate · Wheel to zoom', r);
      const foot = el('div', 'foot', null, left);
      const back = el('span', 'btn', this.step === 0 ? 'Main Menu' : 'Back', foot);
      back.onclick = () => { DV.Audio.play('back'); if (this.step === 0) DV.Game.quitToMenu(); else { this.step--; this.render(); } };
      const next = el('span', 'btn', this.step === 2 ? 'Begin' : 'Next', foot);
      next.onclick = () => this.next();
      this['step' + this.step](body, rbody);
    },
    next() {
      if (this.step === 0 && !this.data.name.trim()) {
        DV.UI.notify('Enter a name first.', 'quest_fail');
        DV.Audio.play('error');
        const i = this.root.querySelector('input');
        if (i) i.focus();
        return;
      }
      if (this.step === 1 && this.pointsLeft() > 0) {
        DV.UI.confirm('Unspent points', 'You still have ' + this.pointsLeft() + ' attribute point(s) to spend. Continue anyway?', () => { this.step = 2; this.render(); });
        return;
      }
      DV.Audio.play('click');
      if (this.step < 2) { this.step++; this.render(); return; }
      this.finish();
    },
    finish() {
      const d = this.data;
      const p = DV.State.data.player;
      p.name = d.name.trim().slice(0, 18);
      p.sex = d.sex;
      p.upbringing = d.upbringing;
      p.appearance = this.appearance();
      p.attributes = Object.assign({}, d.attrs);
      p.outfit = 'neutral';
      this.close();
      DV.Game.startNewGameAfterCreation();
    },

    /* ------------------------------ step 0: appearance ------------------------------ */
    step0(body, rbody) {
      const d = this.data;
      el('div', 'h', 'Name', body);
      const inp = el('input', null, null, body);
      inp.type = 'text';
      inp.maxLength = 18;
      inp.placeholder = 'Enter your name';
      inp.value = d.name;
      inp.oninput = () => { d.name = inp.value.replace(/[<>]/g, ''); };
      inp.onkeydown = (e) => e.stopPropagation();
      setTimeout(() => inp.focus(), 50);
      el('div', 'h', 'Body', body);
      this.seg(body, 'Sex', [['f', 'Female'], ['m', 'Male']], () => d.sex, (v) => {
        d.sex = v;
        if (v === 'm' && ['ponytail', 'bun', 'braids', 'long'].indexOf(d.hair) >= 0) d.hair = 'short';
        if (v === 'f' && ['buzzed', 'short'].indexOf(d.hair) >= 0) d.hair = 'ponytail';
      });
      this.seg(body, 'Build', [['slim', 'Slim'], ['average', 'Average'], ['athletic', 'Athletic'], ['heavy', 'Heavy']], () => d.build, (v) => (d.build = v));
      this.cycle(body, 'Height', () => ({ 0.94: 'Short', 0.97: 'Below avg.', 1: 'Average', 1.03: 'Tall', 1.06: 'Very tall' }[d.height] || 'Average'), (dir) => {
        const hs = [0.94, 0.97, 1, 1.03, 1.06];
        d.height = hs[U.clamp(hs.indexOf(d.height) + dir, 0, hs.length - 1)];
      });
      this.swatch(body, 'Skin tone', DV.SkinTones, () => d.skin, (i) => (d.skin = i));
      el('div', 'h', 'Face & Hair', body);
      this.cycle(body, 'Face', () => DV.Character.FACES[d.face].name, (dir) => (d.face = (d.face + dir + DV.Character.FACES.length) % DV.Character.FACES.length));
      this.swatch(body, 'Eyes', DV.EyeColors, () => d.eyes, (i) => (d.eyes = i));
      const hairs = DV.Character.HAIRSTYLES;
      this.cycle(body, 'Hairstyle', () => U.capitalize(d.hair), (dir) => (d.hair = hairs[(hairs.indexOf(d.hair) + dir + hairs.length) % hairs.length]));
      this.swatch(body, 'Hair color', DV.HairColors.map((h) => h.hex), () => d.hairColor, (i) => (d.hairColor = i));
      el('div', 'sep', null, body);
      el('div', 'faint', 'All candidates may test in neutral garments. Your family\'s clothes will be in your bag.', body).style.fontSize = '12px';
      // upbringing
      el('div', 'desc', 'Every candidate was born into a faction. Your upbringing colors how some people see you — it does not decide who you are, and it does not touch your attributes.', rbody);
      el('div', 'sep', null, rbody);
      for (const u of DV.RPG.upbringings) {
        const it = el('div', 'list-item' + (d.upbringing === u.id ? ' on' : ''), null, rbody);
        const cv = document.createElement('canvas');
        cv.width = cv.height = 64;
        cv.className = 'icon';
        cv.style.width = cv.style.height = '34px';
        DV.Tex.drawEmblem(cv.getContext('2d'), u.id, 64, u.id === 'candor' ? '#e8e6e0' : DV.Factions.get(u.id).accent, '#0d0d0d');
        it.appendChild(cv);
        el('div', null, '<div style="font-family:var(--serif);letter-spacing:0.1em">' + u.name + '</div><div class="dim" style="font-size:12px">' + U.esc(u.desc) + '</div>', it);
        it.onclick = () => { d.upbringing = u.id; DV.Audio.play('click'); this.render(); };
      }
    },
    seg(body, label, opts, get, set) {
      const row = el('div', 'opt', '<span class="ol">' + label + '</span>', body);
      const seg = el('div', 'seg', null, row);
      for (const [v, n] of opts) {
        const s = el('span', get() === v ? 'on' : '', n, seg);
        s.onclick = () => { set(v); DV.Audio.play('click'); this.refreshModel(); this.render(); };
      }
    },
    cycle(body, label, get, change) {
      const row = el('div', 'opt', '<span class="ol">' + label + '</span>', body);
      const l = el('span', 'arrow', '◄', row);
      const v = el('span', 'ov', get(), row);
      const r = el('span', 'arrow', '►', row);
      const go = (dir) => { change(dir); v.textContent = get(); DV.Audio.play('click'); this.refreshModel(); };
      l.onclick = () => go(-1);
      r.onclick = () => go(1);
    },
    swatch(body, label, colors, get, set) {
      const row = el('div', 'opt', '<span class="ol">' + label + '</span>', body);
      const sw = el('div', 'swatches', null, row);
      colors.forEach((c, i) => {
        const s = el('span', 'sw' + (get() === i ? ' on' : ''), null, sw);
        s.style.background = c;
        s.onclick = () => { set(i); DV.Audio.play('click'); this.refreshModel(); sw.querySelectorAll('.sw').forEach((x, k) => x.classList.toggle('on', k === i)); };
      });
    },

    /* ------------------------------ step 1: attributes ------------------------------ */
    step1(body, rbody) {
      const d = this.data;
      const pool = el('div', 'pool', null, body);
      const descBox = rbody;
      const paint = () => {
        pool.innerHTML = 'Points remaining: <b>' + this.pointsLeft() + '</b>';
        rows.forEach(([row, at]) => {
          const v = d.attrs[at.id];
          row.querySelector('.val').textContent = v;
          let pips = '';
          for (let i = 1; i <= 10; i++) pips += '<i class="' + (i <= v ? 'on' : '') + '"></i>';
          row.querySelector('.pips').innerHTML = pips;
          row.classList.toggle('sel', d.selAttr === at.id);
        });
        const at = DV.RPG.attributes.find((x) => x.id === d.selAttr);
        descBox.innerHTML = '<div class="h">' + at.name + ' (' + at.abbr + ')</div><div class="attrdesc">' + U.esc(at.desc) + '</div><div class="sep"></div><div class="faint" style="font-size:12px">Dialogue and world checks look like <span class="accent">[' + at.name.toUpperCase() + ' 6]</span>. If yours is lower, the option is shown greyed out.</div>' +
          '<div class="sep"></div><div class="h">Skills it feeds</div>' + DV.RPG.skills.filter((s) => s.attrs.indexOf(at.id) >= 0).map((s) => '<div class="kv"><span class="k">' + s.name + '</span></div>').join('');
      };
      const rows = [];
      for (const at of DV.RPG.attributes) {
        const row = el('div', 'attr-row', '<span class="nm">' + at.name + '</span>', body);
        const minus = el('span', 'pm', '−', row);
        el('span', 'val', '', row);
        const plus = el('span', 'pm', '+', row);
        el('span', 'pips', '', row);
        minus.onclick = () => { if (d.attrs[at.id] > DV.RPG.ATTR_BASE - 1 && d.attrs[at.id] > 1) { d.attrs[at.id]--; d.selAttr = at.id; DV.Audio.play('click'); paint(); } };
        plus.onclick = () => { if (this.pointsLeft() > 0 && d.attrs[at.id] < DV.RPG.ATTR_MAX_CREATE) { d.attrs[at.id]++; d.selAttr = at.id; DV.Audio.play('click'); paint(); } else DV.Audio.play('error'); };
        row.onmouseenter = () => { d.selAttr = at.id; paint(); };
        rows.push([row, at]);
      }
      el('div', 'sep', null, body);
      el('div', 'faint', 'Every attribute starts at ' + DV.RPG.ATTR_BASE + '. Spend ' + DV.RPG.ATTR_POOL + ' points (max ' + DV.RPG.ATTR_MAX_CREATE + ' at creation). You may lower an attribute to 2 to gain a point. Faction and attributes are separate: a strong Candor, a clever Dauntless — all valid.', body).style.fontSize = '12px';
      const presets = el('div', null, null, body);
      presets.style.marginTop = '8px';
      for (const [name, a] of [['Balanced', [5, 5, 5, 5, 5, 5]], ['Bruiser', [8, 6, 3, 4, 4, 5]], ['Thinker', [3, 4, 8, 7, 4, 4]], ['Talker', [3, 4, 5, 6, 8, 4]], ['Steady', [5, 4, 4, 5, 4, 8]]]) {
        const b = el('span', 'btn small', name, presets);
        b.onclick = () => { DV.RPG.attributes.forEach((at, i) => (d.attrs[at.id] = a[i])); DV.Audio.play('click'); paint(); };
      }
      paint();
    },

    /* ------------------------------ step 2: confirm ------------------------------ */
    step2(body, rbody) {
      const d = this.data;
      const kv = (p, k, v) => el('div', 'kv', '<span class="k">' + k + '</span><span class="v">' + v + '</span>', p);
      kv(body, 'NAME', U.esc(d.name));
      kv(body, 'SEX', d.sex === 'f' ? 'Female' : 'Male');
      kv(body, 'RAISED', DV.Factions.name(d.upbringing));
      kv(body, 'BUILD', U.capitalize(d.build));
      kv(body, 'FACE', DV.Character.FACES[d.face].name);
      kv(body, 'HAIR', U.capitalize(d.hair));
      el('div', 'sep', null, body);
      for (const at of DV.RPG.attributes) kv(body, at.name.toUpperCase(), d.attrs[at.id]);
      el('div', 'desc', 'Today is your aptitude test. Tomorrow, at the Choosing Ceremony, you will choose the faction you belong to for the rest of your life.<br><br>The test will tell you what you are.<br><br><span class="accent">It does not decide what you become.</span>', rbody);
    },
  };
  DV.Creator = Creator;
})();
