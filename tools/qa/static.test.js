// Data validation: schedules, spots, nav reachability, dialogue graph, quests, interactables, zones.
const L = require('./lib.js');
L.run('static data validation', async (p, T, errs) => {
  const r = await p.evaluate(() => {
    const out = { missing: [], noPath: [], conflicts: [], dlg: [], quests: [], interact: [], zones: [] };
    const zone = DV.World.getZone('testing_center');
    // every person lives somewhere: the Testing Center (Build 1) or the Dauntless compound (Build 3)
    const zones = {};
    const Z = (id) => zones[id] || (zones[id] = DV.World.getZone(id));
    const zoneOf = (d) => Z(d.zone || 'testing_center');
    // schedules written per day (the class, the instructor) are checked for every day of the week
    const listsOf = (d) => {
      if (d.scheduleFn) {
        const w = DV.State.data.world, d0 = w.day, out = [];
        for (const day of [2, 3, 4, 5, 6]) { w.day = day; out.push({ day, list: d.scheduleFn(DV.NPCs.get(d.id)) || [] }); }
        w.day = d0;
        return out;
      }
      return (d.schedules ? d.schedules.map((s) => s.list) : [d.schedule || []]).map((list) => ({ day: d.onlyDay || 1, list }));
    };
    for (const d of DV.NPCData.list) {
      const z = zoneOf(d);
      const arrive = z.spot(d.home || 'arrive');
      for (const { list } of listsOf(d)) for (const e of list) {
        const ids = [];
        if (e.to) ids.push(e.to);
        if (e.route) ids.push(...e.route);
        if (e.room && !z.roomMap[e.room]) out.missing.push('room ' + e.room + ' (' + d.id + ')');
        if (e.with && !DV.NPCData.get(e.with)) out.missing.push('talk partner ' + e.with + ' (' + d.id + ')');
        for (const id of ids) {
          const s = z.spot(id);
          if (!s) { out.missing.push('spot ' + id + ' (' + d.id + ')'); continue; }
          const npc = DV.NPCs.get(d.id); const access = (l) => npc.canAccess(l);
          if (!z.nav.findPath(arrive.x, arrive.z, s.ax, s.az, access)) out.noPath.push(d.id + ' -> ' + id);
        }
      }
    }
    // no two people booked into one spot at once (per zone, per day)
    const uses = {};
    for (const d of DV.NPCData.list) {
      for (const { day, list: L0 } of listsOf(d)) {
        const list = d.schedules && !d.scheduleFn ? d.schedules[d.schedules.length - 1].list : L0;
        list.forEach((e, i) => {
          if (!e.to || e.do === 'leave') return;
          const t0 = DV.U.parseTime(e.t), t1 = list[i + 1] ? DV.U.parseTime(list[i + 1].t) : 1440;
          const k = (d.zone || 'testing_center') + ':' + day + ':' + e.to;
          (uses[k] = uses[k] || []).push([d.id, t0, t1]);
        });
      }
    }
    for (const id in uses) {
      if (/reception_q/.test(id)) continue; // the reception line is a queue by design
      const u = uses[id];
      for (let a = 0; a < u.length; a++) for (let b = a + 1; b < u.length; b++) {
        if (u[a][0] !== u[b][0] && u[a][1] < u[b][2] && u[b][1] < u[a][2]) out.conflicts.push(id + ': ' + u[a][0] + ' / ' + u[b][0]);
      }
    }
    for (const id in DV.DialogueDB.trees) {
      const t = DV.DialogueDB.trees[id];
      if (Array.isArray(t.entry)) for (const e of t.entry) if (e.node && !t.nodes[e.node]) out.dlg.push(id + ' entry ' + e.node);
      for (const nid in t.nodes) {
        const n = t.nodes[nid];
        if (n.next && !t.nodes[n.next]) out.dlg.push(id + ':' + nid + ' next ' + n.next);
        if (Array.isArray(n.choices)) for (const ch of n.choices) if (ch.to && !t.nodes[ch.to]) out.dlg.push(id + ':' + nid + ' -> ' + ch.to);
      }
    }
    for (const d of DV.NPCData.list) if (!DV.Dialogue.treeFor(d.id)) out.dlg.push('no tree for ' + d.id);
    const homes = [zone, Z('d_compound')];
    for (const qid of DV.QuestDB.order) for (const o of DV.QuestDB.get(qid).objectives) {
      const t = (typeof o.target === 'function' ? o.target() : o.target) || {};
      if (t.npc && !DV.NPCData.get(t.npc)) out.quests.push(qid + ' npc ' + t.npc);
      if (t.door && !homes.some((z) => z.doorMap[t.door])) out.quests.push(qid + ' door ' + t.door);
      if (t.room && !homes.some((z) => z.roomMap[t.room])) out.quests.push(qid + ' room ' + t.room);
    }
    for (const id of ['cand_upper', 'eru_lab']) homes.push(DV.World.getZone(id));
    for (const z of homes) for (const it of z.interactables) {
      const w = z.nav.nearestWalkable(it.x, it.z, 4);
      if (!w || DV.U.dist(w[0], w[1], it.x, it.z) > (it.radius || 2) + 0.3) out.interact.push(z.id + ':' + it.id);
    }
    for (const id of ['sim_platform', 'sim_flood', 'sim_tribunal', 'd_compound', 'hancock_roof', 'fear_tank', 'fear_beam', 'cand_upper', 'eru_lab', 'abn_night', 'abn_home', 'amity_day']) {
      try { const z = DV.World.getZone(id); out.zones.push(id + ' ' + z.stats.tris + ' tris'); } catch (e) { out.zones.push('FAIL ' + id + ' ' + e.message); }
    }
    out.hub = zone.stats.tris + ' tris, ' + Object.keys(zone.spots).length + ' spots, built in ' + zone.stats.ms + 'ms; compound: ' + Z('d_compound').stats.tris + ' tris, ' + Object.keys(Z('d_compound').spots).length + ' spots';
    return out;
  });
  T.ok(!r.missing.length, 'every schedule spot / room / partner exists', r.missing);
  T.ok(!r.noPath.length, 'every schedule spot is reachable for its NPC', r.noPath);
  T.ok(!r.conflicts.length, 'no two NPCs book the same spot at once', r.conflicts);
  T.ok(!r.dlg.length, 'dialogue graph has no dangling links', r.dlg);
  T.ok(!r.quests.length, 'quest objective targets exist', r.quests);
  T.ok(!r.interact.length, 'every interactable can be reached', r.interact);
  T.ok(!r.zones.some((z) => /FAIL/.test(z)), 'simulation and Build 3 zones build: ' + r.zones.join(', '));
  T.log('hub: ' + r.hub);
  T.noErrors(errs);
});
