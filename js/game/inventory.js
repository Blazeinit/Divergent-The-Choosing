/* ==========================================================================
   DIVERGENT — inventory
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  DV.Inventory = {
    list() {
      return DV.State.data.inventory.items;
    },
    count(id) {
      const e = this.list().find((i) => i.id === id);
      return e ? e.qty : 0;
    },
    has(id, n) {
      return this.count(id) >= (n || 1);
    },
    add(id, qty, silent) {
      const def = DV.Items.get(id);
      if (!def) { console.warn('[Inventory] unknown item', id); return; }
      qty = qty || 1;
      const items = this.list();
      const e = items.find((i) => i.id === id);
      if (e && def.stack) e.qty += qty;
      else if (e && !def.stack) e.qty = Math.max(e.qty, 1);
      else items.push({ id, qty: def.stack ? qty : 1 });
      if (!silent) {
        DV.Audio.play('item');
        DV.Events.emit('notify', { text: 'Received: ' + def.name + (qty > 1 ? ' ×' + qty : ''), kind: 'item' });
      }
      DV.Events.emit('inventory:changed', { id, qty });
      DV.Events.emit('item:added', id);
    },
    remove(id, qty, silent) {
      const items = this.list();
      const i = items.findIndex((x) => x.id === id);
      if (i < 0) return false;
      items[i].qty -= qty || 1;
      if (items[i].qty <= 0) items.splice(i, 1);
      if (!silent) {
        const def = DV.Items.get(id);
        DV.Events.emit('notify', { text: 'Removed: ' + (def ? def.name : id), kind: 'item' });
      }
      DV.Events.emit('inventory:changed', { id, qty: -(qty || 1) });
      return true;
    },
    byCategory(cat) {
      return this.list().filter((e) => {
        const d = DV.Items.get(e.id);
        return d && d.cat === cat;
      });
    },
    equipped(id) {
      const d = DV.Items.get(id);
      return d && d.use && d.use.type === 'equip' && DV.State.data.player.outfit === d.use.outfit;
    },
    /** Uses an item. Returns { ok, message, read } */
    use(id) {
      const def = DV.Items.get(id);
      if (!def || !def.usable || !this.has(id)) return { ok: false, message: 'You can\'t use that.' };
      if (DV.Game && DV.Game.inSimulation && DV.Game.inSimulation()) return { ok: false, message: 'Your thoughts are elsewhere.' };
      const u = def.use;
      switch (u.type) {
        case 'equip': {
          if (DV.State.data.player.outfit === u.outfit) return { ok: false, message: 'You are already wearing that.' };
          DV.State.data.player.outfit = u.outfit;
          DV.Game.refreshPlayerAppearance();
          DV.Audio.play('open');
          DV.Events.emit('player:outfit', u.outfit);
          return { ok: true, message: 'You change into your ' + def.name + '.' };
        }
        case 'stamina': {
          DV.Player.stamina = Math.min(DV.Config.PLAYER.staminaMax, DV.Player.stamina + u.amount);
          DV.Player.exhausted = false;
          this.remove(id, 1, true);
          DV.Audio.play(u.sound || 'item');
          return { ok: true, message: 'You consume the ' + def.name + '. (+' + u.amount + ' stamina)' };
        }
        case 'buff': {
          DV.Stats.addBuff(id, u.attr, u.amount, u.minutes, u.label);
          this.remove(id, 1, true);
          DV.Audio.play(u.sound || 'item');
          return { ok: true, message: 'You consume the ' + def.name + '. ' + u.label + ': +' + u.amount + ' ' + DV.U.capitalize(u.attr) + '.' };
        }
        case 'read': {
          const text = u.text.replace('{name}', DV.State.data.player.name.toUpperCase());
          if (DV.Quests) DV.Events.emit('item:read', id);
          return { ok: true, read: { title: u.title || def.name, text } };
        }
        case 'action': {
          const fn = DV.Actions && DV.Actions[u.action];
          if (fn) return fn(DV.Game, { item: id }) || { ok: true };
          return { ok: false, message: 'Nothing happens.' };
        }
      }
      return { ok: false, message: 'Nothing happens.' };
    },
  };
})();
