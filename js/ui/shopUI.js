/* ==========================================================================
   DIVERGENT — Build 7: the trading panel
   What opens when you ask a shopkeeper "let me see what you have": the
   shop's name and hours across the top, your scrip, two lists side by side —
   what's on their shelves (with the price, and how many are left) and what
   you're carrying that they'd take (with what they'll give) — and the item
   you've picked, with its description and a Buy or Sell button under it.

     ↑ ↓ (W S)  pick      ← → (A D)  their shelves / your bag
     Enter / E   buy or sell          Esc / Tab   done
   The mouse (or the in-game cursor) clicks the rows and the buttons.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const el = U.el;

  const UI = {
    el: null, S: null, side: 'buy', sel: { buy: 0, sell: 0 }, msg: '',
    isOpen() { return !!this.el; },
    open(S) {
      const G = DV.Game;
      if (this.el) this.close(true);
      this.S = S;
      this.side = 'buy';
      this.sel = { buy: 0, sell: 0 };
      this.msg = DV.Shops.canTrade(S) || '';
      G.state = 'shop';
      DV.Input.clearMovement();
      if (!DV.Cursor.enabled()) DV.Input.exitLock();
      const p = (this.el = el('div', 'panel', '<div class="panel-title"></div><div class="sh-head"></div><div class="sh-cols"><div class="sh-col buy"><div class="sh-h">For sale</div><div class="sh-list"></div></div><div class="sh-col sell"><div class="sh-h">Yours to sell</div><div class="sh-list"></div></div></div><div class="sh-detail"></div><div class="foot"></div>', DV.UI.root));
      p.id = 'shop';
      DV.UI.ornate(p);
      DV.Audio.play('open');
      this.render();
      DV.Events.emit('shop:open', { shop: S.id });
    },
    close(silent) {
      if (!this.el) return;
      this.el.remove();
      this.el = null;
      const G = DV.Game;
      if (G.state === 'shop') G.state = 'playing';
      DV.Input.clearMovement();
      DV.Input.takeMouse();
      if (G.state === 'playing') DV.Input.requestLock();
      if (!silent) DV.Audio.play('back');
      this.S = null;
    },
    lists() { return { buy: DV.Shops.forSale(this.S), sell: DV.Shops.sellable(this.S) }; },
    // the item picked on the current side
    current() { const L = this.lists()[this.side]; return L.length ? L[U.clamp(this.sel[this.side], 0, L.length - 1)] : null; },
    act() {
      const it = this.current();
      if (!it) return;
      const r = this.side === 'buy' ? DV.Shops.buy(this.S, it.id) : DV.Shops.sell(this.S, it.id);
      this.msg = r.message || '';
      if (!r.ok) DV.Audio.play('error');
      this.render();
    },
    pick(side, i) { this.side = side; this.sel[side] = i; DV.Audio.play('click'); this.render(); },
    render() {
      const S = this.S, p = this.el;
      if (!p || !S) return;
      const K = S.keeper, open = DV.Shops.isOpen(S);
      p.querySelector('.panel-title').textContent = S.name;
      p.querySelector('.sh-head').innerHTML = '<span class="dim">' + U.esc(K.name) + ', ' + U.esc(K.title.toLowerCase()) + ' · ' + U.esc(S.street) + ' · open ' + DV.Shops.hoursStr(S) + (open ? '' : ' <span class="bad">(closed)</span>') + '</span>' +
        '<span class="sh-purse"><span class="faint">YOUR SCRIP</span> <b>' + DV.Wallet.get() + '</b></span>';
      const L = this.lists();
      for (const side of ['buy', 'sell']) {
        const list = p.querySelector('.sh-col.' + side + ' .sh-list');
        list.innerHTML = '';
        p.querySelector('.sh-col.' + side).classList.toggle('on', this.side === side);
        if (!L[side].length) el('div', 'faint sh-none', side === 'buy' ? 'The shelves are bare.' : (S.buys ? 'Nothing they\'d take.' : U.esc(S.noBuy || 'They don\'t buy.')), list);
        this.sel[side] = U.clamp(this.sel[side], 0, Math.max(0, L[side].length - 1));
        L[side].forEach((it, i) => {
          const can = side === 'buy' ? it.qty > 0 && DV.Wallet.can(it.price) : true;
          const row = el('div', 'list-item sh-row' + (this.side === side && this.sel[side] === i ? ' on' : '') + (can ? '' : ' dim'), null, list);
          row.dataset.id = it.id;
          row.appendChild(DV.RPGMenu.itemIcon(it.def || { icon: { shape: 'scrip', color: '#c83a2a' } }, 22));
          el('span', 'sh-name', U.esc(it.name), row);
          el('span', 'qty', it.service ? (it.done ? 'done' : '') : '×' + it.qty, row);
          el('span', 'sh-price', String(it.price), row);
          row.onclick = () => this.pick(side, i);
        });
      }
      const it = this.current(), d = p.querySelector('.sh-detail');
      d.innerHTML = '';
      if (it) {
        const desc = it.service ? it.service.desc : it.def.desc;
        el('div', 'sh-dn', U.esc(it.name) + ' <span class="faint">— ' + (this.side === 'buy' ? 'costs ' : 'they\'ll give you ') + DV.Wallet.str(it.price) + '</span>', d);
        el('div', 'desc', U.esc(desc || ''), d);
      } else el('div', 'faint', this.side === 'sell' && S.buys ? U.esc(S.buys.why || '') : 'Nothing picked.', d);
      if (this.msg) el('div', 'sh-msg', U.esc(this.msg), d);
      const foot = p.querySelector('.foot');
      foot.innerHTML = '';
      const go = el('span', 'btn' + (it ? '' : ' disabled'), this.side === 'buy' ? 'Buy' : 'Sell', foot);
      go.onclick = () => this.act();
      el('span', 'faint sh-keys', '<span class="kc">↑↓</span>pick <span class="kc">←→</span>shelves / yours <span class="kc">E</span>' + (this.side === 'buy' ? 'buy' : 'sell') + ' <span class="kc">Esc</span>done', foot);
      const done = el('span', 'btn', 'Done', foot);
      done.onclick = () => this.close();
    },
    update(dt, input) {
      if (!this.el) { DV.Game.state = 'playing'; return; }
      if (input.consume('Escape') || input.consume('Tab')) { this.close(); return; }
      const L = this.lists();
      const up = input.consume('ArrowUp') | input.consume('KeyW'), dn = input.consume('ArrowDown') | input.consume('KeyS');
      const lf = input.consume('ArrowLeft') | input.consume('KeyA'), rt = input.consume('ArrowRight') | input.consume('KeyD');
      if (lf || rt) { this.side = lf ? 'buy' : 'sell'; DV.Audio.play('click'); this.render(); }
      if (up || dn) { const n = L[this.side].length; if (n) { this.sel[this.side] = (this.sel[this.side] + (dn ? 1 : -1) + n) % n; DV.Audio.play('click'); this.render(); } }
      if (input.consume('Enter') | input.consume('KeyE') | input.consume('Space')) this.act();
      input.takeMouse(); input.takeWheel();
    },
  };

  DV.ShopUI = UI;
})();
