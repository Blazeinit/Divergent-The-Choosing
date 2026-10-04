/* ==========================================================================
   DIVERGENT — interaction
   Finds the best interactable in front of the player (NPCs, doors, seats,
   pickups, examine points, actions), exposes the prompt to the HUD, and
   executes it on [E].
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const I = {
    current: null,
    extra: [], // simulation scripts register temporary interactables here

    candidates(zone, player) {
      const out = [];
      const px = player.x, pz = player.z;
      const fx = Math.sin(player.rot), fz = Math.cos(player.rot);
      const camYaw = DV.Game.rig ? DV.Game.rig.yaw : player.rot;
      const cx = Math.sin(camYaw), cz = Math.cos(camYaw);
      const consider = (it, x, z, radius) => {
        const dx = x - px, dz = z - pz;
        const d = Math.hypot(dx, dz);
        if (d > radius) return;
        const nd = d > 0.01 ? 1 / d : 0;
        const facing = Math.max((dx * fx + dz * fz) * nd, (dx * cx + dz * cz) * nd);
        if (d > 0.7 && facing < 0.15) return;
        // bias > 0 makes an interactable lose ties (e.g. ducking under the arm vs. talking to the guard)
        out.push({ it, score: d - facing * 1.2 + (it.bias || 0) });
      };
      // NPCs
      for (const n of DV.NPCs.all) {
        if (!n.present || !n.model || !n.model.root.visible || n.dist > 4) continue;
        if ((n.def.zone || 'testing_center') !== zone.id) continue;
        consider({ kind: 'npc', npc: n, label: 'Talk to', name: n.def.name }, n.x, n.z, DV.Config.NPC.talkRange);
      }
      // zone interactables
      const obs = DV.Stats.skill('observation');
      for (const it of zone.interactables) {
        if (it.disabled) continue;
        if (it.hidden && obs < it.hidden) continue;
        if (it.cond && !it.cond()) continue;
        if (it.kind === 'seat' && (DV.Player.state === 'sitting' || (it.spot.occupant && it.spot.occupant !== 'player'))) continue;
        if (it.kind === 'door' && it.door.open > 0.5) continue;
        consider(it, it.x, it.z, it.radius || DV.Config.INTERACT_RANGE);
      }
      for (const it of this.extra) {
        if (it.disabled || (it.cond && !it.cond())) continue;
        const x = typeof it.x === 'function' ? it.x() : it.x, z = typeof it.z === 'function' ? it.z() : it.z;
        consider(it, x, z, it.radius || DV.Config.INTERACT_RANGE);
      }
      out.sort((a, b) => a.score - b.score);
      return out;
    },

    update(zone, player) {
      const list = this.candidates(zone, player);
      this.current = list.length ? list[0].it : null;
      return this.current;
    },

    prompt() {
      const it = this.current;
      if (!it) return null;
      const label = typeof it.label === 'function' ? it.label() : it.label;
      if (!label) return null;
      const name = typeof it.name === 'function' ? it.name() : it.name;
      return { label, name, kind: it.kind };
    },

    use(game) {
      const it = this.current;
      if (!it) return false;
      switch (it.kind) {
        case 'npc':
          game.talkTo(it.npc);
          return true;
        case 'seat':
          game.sitOn(it.spot);
          return true;
        case 'pickup':
          game.takePickup(it);
          return true;
        case 'door':
          game.tryDoor(it.door);
          return true;
        case 'examine':
          DV.Stats.practice('observation', 0.5);
          DV.UI.showReading(it.title || it.name, it.text);
          if (!DV.State.zoneState(DV.World.current.id).used[it.id]) {
            DV.State.zoneState(DV.World.current.id).used[it.id] = true;
            DV.Stats.addXP(5);
          }
          return true;
        case 'action': {
          if (it.onUse) { it.onUse(game, it); return true; }
          const fn = DV.Actions[it.action];
          if (fn) {
            const r = fn(game, it);
            if (r && r.message) DV.UI.notify(r.message);
            if (r && r.read) DV.UI.showReading(r.read.title, r.read.text);
          } else console.warn('[Interaction] missing action', it.action);
          return true;
        }
      }
      return false;
    },
  };

  DV.Interaction = I;
  void U;
})();
