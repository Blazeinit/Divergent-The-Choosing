// The RPG layer: experience and levels (the fanfare, points), spending points through the menu,
// every perk tree (skills, the five factions, Divergent), what perks do (a check that passes, Candor's
// lie mark and Cross-Examine, Amity talking someone down, a seam, a roll instead of a hard landing,
// a transfer's perks going dormant), every page of the Tab menu by keyboard and mouse, a save round
// trip, and a v3 save migrating to v4.
const L = require('./lib.js');
L.run('RPG: experience, perks, factions, menus, saves', async (p, T, errs) => {
  // PER 6: Pierce's [PERCEPTION 7] fails without help
  await L.quickStart(p, { strength: 5, agility: 6, intelligence: 7, perception: 6, charisma: 6, resolve: 6 });
  const ev = (fn, a) => p.evaluate(fn, a);

  /* ---------------- experience and levels ---------------- */
  const lv = await ev(() => {
    const pl = DV.State.data.player, r = { l0: pl.level, pp0: DV.Perks.points(), ap0: pl.unspent };
    r.disc = DV.Stats.award('discovery', 'qa:room', 'QA room');
    r.disc2 = DV.Stats.award('discovery', 'qa:room', 'QA room'); // (once only)
    r.check = DV.Stats.award('check', null, null, 1);
    r.fight = DV.Stats.award('fight_win', null, 'Fight won');
    DV.Stats.addXP(700, 'QA');
    r.l1 = pl.level; r.pp1 = DV.Perks.points(); r.ap1 = pl.unspent;
    r.fan = document.getElementById('levelup').classList.contains('on');
    r.fanN = document.querySelector('#levelup .lv-n').textContent;
    // level 5 is a milestone: two perk points
    const before = DV.Perks.points();
    DV.Stats.addXP(DV.Stats.xpForLevel(5) - pl.xp, 'QA');
    r.l5 = pl.level; r.ms = DV.Perks.points() - before;
    r.cap = (() => { DV.Stats.addXP(999999); return pl.level; })();
    return r;
  });
  T.ok(lv.disc === 10 && lv.disc2 === 0 && lv.check === 10 && lv.fight === 30, 'XP sources pay from the table, discoveries only once', lv);
  T.ok(lv.l1 === 4 && lv.pp1 === lv.pp0 + 3 && lv.ap1 === lv.ap0 + 3, 'gaining XP levels up: an attribute point and a perk point a level', lv);
  T.ok(lv.fan && lv.fanN === '4', 'the level-up fanfare plate drops in', lv);
  T.ok(lv.l5 === 5 && lv.ms === 2, 'level 5 brings a milestone perk point', lv);
  T.eq(lv.cap, 20, 'the level cap is 20');

  /* ---------------- spending an attribute point in the menu ---------------- */
  await ev(() => DV.Game.openRPGMenu('character'));
  await p.waitForTimeout(200);
  const sp = await ev(() => {
    const a0 = DV.State.data.player.attributes.charisma, u0 = DV.State.data.player.unspent;
    const row = document.querySelector('#rpgmenu .attr-row[data-attr="charisma"] .btn');
    if (!row) return 'no + button';
    row.click();
    return { a: DV.State.data.player.attributes.charisma - a0, u: u0 - DV.State.data.player.unspent, doll: document.querySelectorAll('#rpgmenu .doll .slot').length, portrait: !!document.querySelector('#rpgmenu .doll .portrait canvas') };
  });
  T.ok(sp.a === 1 && sp.u === 1, 'the + on an attribute spends a point', sp);
  T.ok(sp.doll >= 6 && sp.portrait, 'the character page is a paper doll round the portrait', sp);
  await L.shot(p, 'rpg_character');
  // reset the attributes we test against (the point went to CHA; keep PER at 6)
  await ev(() => { DV.State.data.player.attributes.perception = 6; });

  /* ---------------- perk checks: a dialogue check that passes with a perk ---------------- */
  const chk = await ev(() => {
    DV.RPGMenu.close(); DV.Game.state = 'playing';
    let r0;
    r0 = QA.talk('alan_pierce');
    if (QA.node() === 'intro') { QA.pick('curious'); QA.pick('...'); }
    QA.pick('irregular');
    const v = DV.Dialogue.active.view, c = v.choices.find((x) => /paused/.test(x.label));
    const r = { node: v.nodeId, before: c && c.enabled, r0 };
    QA.end();
    r.locked = DV.Perks.canUnlock('obs_eye');
    r.u = DV.Perks.unlock('obs_eye');
    QA.talk('alan_pierce'); QA.pick('irregular');
    const v2 = DV.Dialogue.active.view, c2 = v2.choices.find((x) => /paused/.test(x.label));
    r.after = c2 && c2.enabled; r.bonus = c2 && c2.checkBonus && c2.checkBonus.total;
    r.pick = QA.pick('paused');
    QA.end();
    return r;
  });
  T.ok(chk.node === 'irregular' && chk.before === false, '[PERCEPTION 7] is closed at Perception 6', chk);
  T.ok(chk.u.ok && chk.after && chk.bonus === 1 && /irr_per/.test(chk.pick), 'with Keen Eye (+1) the check passes', chk);

  /* ---------------- every tree, every perk ---------------- */
  const trees = await ev(() => {
    const pl = DV.State.data.player, out = { locked: {} };
    // closed before their gates: a faction tree at Neutral standing, Divergent without the result, a skill too low
    out.locked.faction = DV.Perks.canUnlock('dau_sprint').why;
    out.locked.div = DV.Perks.treeVisible('divergent');
    pl.skillXP.firearms = 0;
    out.locked.skill = DV.Perks.canUnlock('fir_still').why;
    // open them all: train every skill, stand Admired with everyone, an inconclusive result
    for (const s of DV.RPG.skills) pl.skillXP[s.id] = 600;
    for (const f of ['abnegation', 'dauntless', 'erudite', 'candor', 'amity']) DV.State.data.reputation[f] = 60;
    const a = DV.State.data.aptitude; a.status = 'complete'; a.result = 'inconclusive'; a.divergent = true; a.recordedAs = 'erudite';
    pl.perkPoints = 200;
    out.per = {};
    for (const t of DV.PerkData.trees) {
      let n = 0;
      for (const pk of t.perks.slice().sort((x, y) => x.tier - y.tier)) if (DV.Perks.owned(pk.id) || DV.Perks.unlock(pk.id).ok) n++;
      out.per[t.id] = n + '/' + t.perks.length;
    }
    out.all = DV.PerkData.trees.every((t) => t.perks.every((x) => DV.Perks.active(x.id)));
    out.count = DV.PerkData.trees.reduce((s, t) => s + t.perks.length, 0);
    out.mods = { regen: DV.Perks.mod('stamina.regen'), drain: DV.Perks.mod('sprint.drain'), fall: DV.Perks.on('fall.immune'), notice: DV.Perks.mod('notice.gain'), cha: DV.Perks.checkBonus('charisma', {}).total };
    return out;
  });
  T.ok(/standing/i.test(trees.locked.faction) && trees.locked.div === false && /Firearms 60/.test(trees.locked.skill), 'trees stay shut until standing, the result and skill open them', trees.locked);
  T.ok(trees.all && Object.values(trees.per).every((x) => x.split('/')[0] === x.split('/')[1]), 'every perk in all ' + Object.keys(trees.per).length + ' trees can be learned (' + trees.count + ' perks)', trees.per);
  T.ok(trees.mods.regen > 0.5 && trees.mods.drain < -0.5 && trees.mods.fall && trees.mods.notice < -0.8 && trees.mods.cha >= 3, 'the learned perks add up through DV.Perks.mod', trees.mods);

  /* ---------------- what perks do ---------------- */
  const fx = await ev(() => {
    const r = {};
    // Candor: the lie is marked, with its tell; Cross-Examine calls it; The Whole Truth gets it
    DV.Game.state = 'playing';
    DV.State.npc('alan_pierce').mem.postTest = true; // (past his after-the-test word)
    QA.talk('alan_pierce'); QA.pick('irregular');
    const v = DV.Dialogue.active.view;
    r.lie = !!v.lie && /smiles/.test(v.lie.tell);
    const lm = document.querySelector('#dialogue .liemark');
    r.mark = !!lm && !lm.classList.contains('hidden') && document.getElementById('dialogue').classList.contains('lying') && /DECEPTION/.test(lm.textContent);
    r.callTag = (v.choices.find((x) => /re-test anyone/.test(x.label)) || {}).ptag;
    r.call = QA.pick('re-test anyone');
    r.truth = /referred/.test(DV.Dialogue.active.view.text) && !!DV.State.flag('pierce_admitted');
    r.lieMark2 = !document.querySelector('#dialogue .liemark').classList.contains('hidden');
    QA.end();
    // ...and it isn't offered twice
    QA.talk('alan_pierce'); QA.pick('irregular');
    r.once = !DV.Dialogue.active.view.choices.some((x) => /re-test anyone/.test(x.label));
    // Erudite's Analyze: the numbers in the dialogue head
    r.analyze = /personal/.test(document.querySelector('#dialogue .disp').textContent);
    QA.end();
    // Amity's Soothing Word on someone hostile (and off Kindness Is Law's floor for the test)
    const id = 'frank_kowalski';
    delete DV.State.data.player.perks.ami_kind; DV.Perks.changed();
    DV.State.npc(id).rel = -70;
    r.d0 = DV.Reputation.disposition(id);
    const n = DV.NPCs.get(id);
    if (n && n.present) {
      QA.talk(id);
      r.calm = QA.pick('started badly');
      r.d1 = DV.Reputation.disposition(id);
      QA.end();
    } else r.calm = 'absent';
    // Divergent: a seam only you see (an Order stop)
    DV.Dialogue.startScene('order_stop', { speaker: 'Officer', faction: 'dauntless' });
    const s = DV.Dialogue.active.view.choices.find((x) => x.raw.seam);
    r.seam = !!s && /SEAM/.test(s.ptag);
    QA.end();
    // Dauntless Train-Hopper: a hard landing becomes a roll
    DV.Player.staggerT = 0; DV.Player.hardLanding({});
    r.roll = DV.Player.lastLanding === 'roll' && !(DV.Player.staggerT > 0);
    // Stealth: staff see you from less far
    r.watch = DV.Perks.mod('stealth.range');
    // a fight: the player hits harder
    const F = new DV.Combat.Fighter({ isPlayer: true, stats: { strength: 5, resolve: 5 } }), G = new DV.Combat.Fighter({ stats: { strength: 5, resolve: 5 } });
    r.dmg = F.dmgMul > G.dmgMul && F.armor < G.armor;
    // Amity's herbs each morning, Erudite's workbench
    const h0 = DV.Inventory.count('healing_herbs');
    DV.Perks.newDay();
    r.herbs = DV.Inventory.count('healing_herbs') - h0;
    DV.Inventory.add('water_cup', 1, true);
    r.craft = DV.Perks.craft('tonic').ok && DV.Inventory.has('herbal_tonic');
    return r;
  });
  T.ok(fx.lie && fx.mark, 'Ear for Lies: Pierce\'s lie is marked in the dialogue window, with its tell', fx);
  T.ok(/CANDOR/.test(fx.callTag || '') && fx.truth && fx.once, 'Cross-Examine calls the lie; The Whole Truth gets the truth, once', fx);
  T.ok(fx.analyze, 'Analyze shows disposition, personal and faction shares, and trust');
  T.ok(fx.calm === 'absent' || (/ok/.test(fx.calm) && fx.d1 > fx.d0 && fx.d1 > -15), 'Soothing Word talks a hostile NPC down', fx);
  T.ok(fx.seam, 'See the Seams: a hidden choice appears, marked');
  T.ok(fx.roll && fx.watch < 0 && fx.dmg, 'Train-Hopper rolls a hard landing; Soft Step and Pit Fighter apply', fx);
  T.ok(fx.herbs === 2 && fx.craft, 'Herb Lore gathers herbs each morning; Applied Chemistry crafts a tonic', fx);

  /* ---------------- standing, titles, transfer ---------------- */
  const tr = await ev(() => {
    const d = DV.State.data, r = {};
    // a fresh character: raised Erudite, undecided
    d.player.perks = {}; d.player.perkPoints = 5;
    for (const f in d.reputation) d.reputation[f] = 0;
    d.player.faction = null; d.player.upbringing = 'erudite';
    DV.Perks.changed();
    r.title0 = DV.Reputation.standing('erudite').title;
    r.u = DV.Perks.unlock('eru_method').ok; // (raised among them: tier I open at Neutral)
    r.act0 = DV.Perks.active('eru_method');
    DV.Reputation.add('dauntless', 30);
    r.titleD = DV.Reputation.standing('dauntless').title;
    DV.Build2.setFaction('dauntless');
    r.act1 = DV.Perks.active('eru_method');
    r.member = DV.Reputation.standing('dauntless');
    r.dauntlessIII = DV.Perks.tierOpen('dauntless', 3);
    r.dormant = DV.Perks.dormant();
    r.note = d.journal.slice(-3).map((j) => j.text).join(' | ');
    return r;
  });
  T.ok(tr.title0 === 'Pupil' && tr.u && tr.act0, 'raised Erudite: a "Pupil", with tier I of the Erudite tree open', tr);
  T.ok(tr.titleD === 'Brave' && tr.member.member && tr.member.title === 'Veteran' && tr.dauntlessIII, 'standing tiers carry titles; a member is called by the member\'s title, two ranks ahead', tr.member);
  T.ok(!tr.act1 && tr.dormant.indexOf('eru_method') >= 0 && /cost you|Leaving/.test(tr.note), 'transferring out puts the home faction\'s perks to sleep (faction before blood)', tr);

  /* ---------------- standing in conversation: a faction's tone ---------------- */
  const tone = await ev(() => {
    const d = DV.State.data;
    d.reputation.dauntless = 40;
    const n = DV.NPCs.all.find((x) => x.present && x.def.faction === 'dauntless' && DV.Dialogue.treeFor(x.id));
    if (!n) return 'no dauntless npc here';
    QA.talk(n.id);
    const c = DV.Dialogue.active && DV.Dialogue.active.view.choices.find((x) => x.ptag && /DAUNTLESS/.test(x.ptag));
    const r = { id: n.id, tag: c && c.ptag };
    if (c) { const r0 = DV.State.npc(n.id).rel; DV.Dialogue.choose(c.index); r.rel = DV.State.npc(n.id).rel - r0; }
    QA.end();
    return r;
  });
  T.ok(typeof tone === 'string' || (tone.tag && tone.rel > 0), 'standing opens a faction\'s own tone in conversation, and it warms them', tone);

  /* ---------------- the menu: every page, by keyboard and mouse ---------------- */
  await ev(() => { QA.end(); DV.Game.state = 'playing'; DV.Stats.addXP(50); });
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => DV.Game.state === 'menu', null, { timeout: 8000 });
  const seen = [];
  const pages = ['character', 'skills', 'factions', 'quests', 'inventory', 'codex', 'map'];
  for (let k = 1; k <= 7; k++) {
    await p.keyboard.press('Digit' + k);
    // (wait for each press to land: two inside one slow software-rendered frame read as one)
    await p.waitForFunction((t) => DV.RPGMenu.tab === t, pages[k - 1], { timeout: 8000 }).catch(() => {});
    seen.push(await ev(() => DV.RPGMenu.tab + ':' + document.querySelector('#rpgmenu .content').children.length));
  }
  T.eq(seen.map((x) => x.split(':')[0]), ['character', 'skills', 'factions', 'quests', 'inventory', 'codex', 'map'], 'digits 1–7 turn to each page');
  T.ok(seen.every((x) => +x.split(':')[1] > 0), 'every page draws', seen);
  await p.keyboard.press('KeyQ'); await p.waitForFunction(() => DV.RPGMenu.tab === 'codex', null, { timeout: 8000 }).catch(() => {});
  await p.keyboard.press('KeyQ'); await p.waitForFunction(() => DV.RPGMenu.tab === 'inventory', null, { timeout: 8000 }).catch(() => {});
  T.eq(await ev(() => DV.RPGMenu.tab), 'inventory', 'Q turns back a page');
  await p.keyboard.press('KeyE'); await p.waitForFunction(() => DV.RPGMenu.tab === 'codex', null, { timeout: 8000 }).catch(() => {});
  T.eq(await ev(() => DV.RPGMenu.tab), 'codex', 'E turns forward a page');
  const cx = await ev(() => ({ open: Object.keys(DV.State.data.codex.open).length, title: (document.querySelector('#rpgmenu .cxt') || {}).textContent, rows: document.querySelectorAll('#rpgmenu .cx').length }));
  T.ok(cx.open >= 5 && cx.title && cx.rows > cx.open - 1, 'the Codex lists what you\'ve learned and what you haven\'t', cx);
  await L.shot(p, 'rpg_codex');
  // skills: ↓ to the next tree, → through its perks, Enter learns
  await ev(() => { DV.State.data.player.perkPoints = 3; DV.RPGMenu.selTree = 'athletics'; DV.RPGMenu.show('skills'); });
  await p.keyboard.press('ArrowDown'); await p.waitForFunction(() => DV.RPGMenu.selTree === 'melee', null, { timeout: 8000 }).catch(() => {});
  const k1 = await ev(() => DV.RPGMenu.selTree);
  await p.keyboard.press('ArrowRight'); await p.waitForFunction(() => DV.RPGMenu.selPerk === 'mel_heavy', null, { timeout: 8000 }).catch(() => {});
  await p.keyboard.press('ArrowLeft'); await p.waitForFunction(() => DV.RPGMenu.selPerk === 'mel_guard', null, { timeout: 8000 }).catch(() => {});
  const before = await ev(() => ({ sel: DV.RPGMenu.selPerk, st: DV.Perks.status(DV.RPGMenu.selPerk) }));
  await p.keyboard.press('Enter'); await p.waitForFunction((id) => DV.Perks.owned(id), before.sel, { timeout: 8000 }).catch(() => {});
  const k2 = await ev((id) => ({ st: DV.Perks.status(id), just: !!document.querySelector('#rpgmenu .pk.just'), nodes: document.querySelectorAll('#rpgmenu .pk').length }), before.sel);
  T.ok(k1 === 'melee' && before.st === 'available' && k2.st === 'owned' && k2.just && k2.nodes === 3, 'Skills & Perks: arrows choose a tree and a perk, Enter learns it', { k1, before, k2 });
  // the mouse: hover a perk for its tooltip, click (twice) to learn
  const ms = await ev(() => {
    DV.RPGMenu.selTree = 'stealth'; DV.RPGMenu.selPerk = 'sth_quiet'; DV.RPGMenu.render();
    const n = document.querySelector('#rpgmenu .pk[data-perk="sth_soft"]');
    n.dispatchEvent(new MouseEvent('mouseenter', { clientX: 400, clientY: 300 }));
    const tip = document.querySelector('#rpgmenu .rm-tip');
    const r = { tip: !tip.classList.contains('hidden') && /Soft Step/.test(tip.textContent) };
    n.dispatchEvent(new MouseEvent('mouseleave'));
    n.click(); document.querySelector('#rpgmenu .pk[data-perk="sth_soft"]').click();
    r.st = DV.Perks.status('sth_soft');
    return r;
  });
  T.ok(ms.tip && ms.st === 'owned', 'a perk\'s tooltip shows on hover, and two clicks learn it', ms);
  await L.shot(p, 'rpg_skills');
  // factions, the journal's pages, the workbench
  const pg = await ev(() => {
    const r = {};
    DV.RPGMenu.selFaction = 'dauntless'; DV.RPGMenu.show('factions');
    r.fac = document.querySelector('#rpgmenu .fac-page').innerText;
    DV.RPGMenu.show('quests');
    QA.click('#rpgmenu .subtab', 'Experience');
    r.xp = document.querySelector('#rpgmenu .jbody').innerText;
    QA.click('#rpgmenu .subtab', 'Notes');
    r.notes = document.querySelectorAll('#rpgmenu .notes .log').length;
    DV.State.data.reputation.erudite = 60; // (a transfer's Erudite perks only wake for standing)
    DV.Perks.p().perks.eru_chem = { day: 1 }; DV.Perks.changed();
    DV.RPGMenu.invCat = 'bench'; DV.RPGMenu.show('inventory');
    r.bench = document.querySelectorAll('#rpgmenu [data-recipe]').length;
    DV.State.data.reputation.erudite = -6; DV.Perks.changed(); // (and back: Erudite has forgotten you again)
    return r;
  });
  T.ok(/DAUNTLESS/.test(pg.fac) && /Veteran|Leader/.test(pg.fac) && /Manifesto/i.test(pg.fac), 'Factions: standing, title and manifesto', pg.fac.slice(0, 200));
  T.ok(/Where Experience Comes From/i.test(pg.xp) && /Discovery/.test(pg.xp) && pg.notes > 0, 'the Journal: quests, notes and the experience table', pg);
  T.ok(pg.bench === 3, 'the Workbench appears with Applied Chemistry', pg);
  await ev(() => { DV.RPGMenu.show('factions'); });
  await L.shot(p, 'rpg_factions');
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => DV.Game.state === 'playing', null, { timeout: 8000 }).catch(() => {});
  T.eq(await ev(() => DV.Game.state), 'playing', 'Tab closes the menu');

  /* ---------------- save / load ---------------- */
  const sv = await ev(() => {
    const d = DV.State.data;
    const want = { perks: Object.keys(d.player.perks).sort().join(','), pts: d.player.perkPoints, lvl: d.player.level, seen: Object.keys(d.player.xpSeen).length, codex: Object.keys(d.codex.open).length, rep: d.reputation.dauntless };
    const w = DV.Save.write('3');
    d.player.perks = {}; d.player.perkPoints = 0; d.codex.open = {};
    const back = DV.Save.read('3');
    const got = { perks: Object.keys(back.player.perks).sort().join(','), pts: back.player.perkPoints, lvl: back.player.level, seen: Object.keys(back.player.xpSeen).length, codex: Object.keys(back.codex.open).length, rep: back.reputation.dauntless };
    return { ok: w.ok, want, got };
  });
  T.ok(sv.ok && JSON.stringify(sv.want) === JSON.stringify(sv.got), 'a save keeps perks, perk points, level, once-only XP, the Codex and standing', sv);
  await ev(() => DV.Game.loadSlot('3'));
  await p.waitForFunction(() => DV.Game.state === 'playing', null, { timeout: 30000 });
  const ld = await ev(() => ({ owned: DV.Perks.owned('sth_soft'), dormant: DV.Perks.dormant().indexOf('eru_method') >= 0, pts: DV.Perks.points() }));
  T.ok(ld.owned && ld.dormant, 'it loads back and plays, perks (and dormant ones) intact', ld);

  /* ---------------- an old (v3) save ---------------- */
  const mg = await ev(() => {
    const st = DV.Save.snapshot();
    st.version = 3;
    st.player.level = 5; st.player.xp = 1000;
    delete st.player.perks; delete st.player.perkPoints; delete st.player.xpSeen; delete st.codex;
    st.world.zones.testing_center = st.world.zones.testing_center || { doors: {}, taken: {}, visited: {}, used: {} };
    st.world.zones.testing_center.visited.waiting_hall = true;
    localStorage.setItem(DV.Config.SAVE_PREFIX + 'slot_6', JSON.stringify({ version: 3, summary: { name: 'Old', saved: Date.now() }, state: st }));
    const d = DV.Save.read('6');
    return { v: d.version, pts: d.player.perkPoints, perks: d.player.perks, seen: Object.keys(d.player.xpSeen).indexOf('discovery:testing_center:waiting_hall') >= 0, codex: d.codex };
  });
  T.ok(mg.v === 4 && mg.pts === 6 && JSON.stringify(mg.perks) === '{}', 'a v3 save migrates to v4 with the perk points its five levels earned', mg);
  T.ok(mg.seen && mg.codex && mg.codex.init === false, '...rooms it had found count as discovered, and its Codex opens quietly', mg);
  await ev(() => DV.Game.loadSlot('6'));
  await p.waitForFunction(() => DV.Game.state === 'playing', null, { timeout: 30000 });
  const ml = await ev(() => { DV.Codex.refresh(); return { codex: Object.keys(DV.State.data.codex.open).length, unread: DV.Codex.unread().length, lvl: DV.State.data.player.level }; });
  T.ok(ml.codex > 0 && ml.unread === 0 && ml.lvl === 5, 'the migrated save loads and plays; its Codex fills in silently', ml);
  await ev(() => DV.Game.openRPGMenu('skills'));
  await p.waitForTimeout(200);
  T.ok(await ev(() => document.querySelectorAll('#rpgmenu .pk').length === 3), 'the menu works on the migrated save');
  T.noErrors(errs);
});
