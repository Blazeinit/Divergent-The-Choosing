// Old saves load into the current version with relationships, memory and quest state intact:
// a Build 1 (v1) save — first NPC ids, the candidate card — goes through every rename step.
const L = require('./lib.js');
L.run('save migration v1 → current', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  // build a v1 save by hand from the current state, using the old ids/names
  await ev(() => {
    QA.checkIn(); QA.clearSecurity();
    DV.State.npc('ben_fischer').rel = 23; DV.State.npc('ben_fischer').mem.met = true;
    DV.State.npc('nora_kelly').mem.favour = 'owed';
    DV.State.setFlag('talked_to_ben_fischer', true);
    DV.State.setFlag('daniel_convinced', true);
    const st = DV.Save.snapshot();
    let json = JSON.stringify(st);
    // undo the renames newest first: v3 → v2 → v1
    for (const table of [DV.State.RENAMES_V3, DV.State.RENAMES_V2]) {
      for (const [oldId, newId, oldName, newName] of table) {
        json = json.split(newId).join(oldId);
        if (newName) json = json.split(newName).join(oldName);
      }
    }
    const old = JSON.parse(json);
    old.version = 1;
    delete old.world.flags.badge_shown;
    localStorage.setItem(DV.Config.SAVE_PREFIX + 'slot_5', JSON.stringify({ version: 1, summary: { name: 'Old', saved: Date.now() }, state: old }));
  });
  const raw = await ev(() => localStorage.getItem(DV.Config.SAVE_PREFIX + 'slot_5'));
  T.ok(/theo_vance/.test(raw) && /candidate_card/.test(raw), 'v1 save written with the old ids');
  const m = await ev(() => {
    const d = DV.Save.read('5');
    return { v: d.version, theo: !!d.npcs.theo_vance || !!d.npcs.edmund_kell, edmund: d.npcs.ben_fischer, nora: d.npcs.nora_kelly, flag: d.world.flags.talked_to_ben_fischer, conv: d.world.flags.daniel_convinced, oldConv: d.world.flags.elias_convinced, badge: d.inventory.items.some((i) => i.id === 'name_badge'), card: JSON.stringify(d).indexOf('candidate_card') >= 0, shown: d.world.flags.badge_shown };
  });
  T.eq(m.v, 3, 'migrated to version 3');
  T.ok(!m.theo && m.edmund && m.edmund.rel === 23 && m.edmund.mem.met, 'theo_vance → edmund_kell → ben_fischer keeps relationship and memory', m.edmund);
  T.ok(m.nora && m.nora.mem.favour === 'owed', 'iris_kwan → nora_halloran → nora_kelly keeps memory');
  T.ok(m.flag, 'flags that mention an id are renamed too');
  T.ok(m.conv && !m.oldConv, 'story flags named after a character follow the rename (elias_convinced → daniel_convinced)');
  T.ok(m.badge && !m.card, 'candidate card → name badge');
  T.ok(m.shown, 'players already past security count as having shown their badge');
  // and it actually loads
  await ev(() => DV.Game.loadSlot('5'));
  await p.waitForFunction(() => DV.Game.state === 'playing', null, { timeout: 30000 });
  T.ok(await ev(() => DV.State.npc('ben_fischer').rel === 23 && DV.Player.model.tagOn), 'the migrated save loads and plays');
  T.noErrors(errs);
});
