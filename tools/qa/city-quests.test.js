// The city's side quests (js/game/cityquests.js, js/data/cityquests.js, js/data/dialogue/city.js): the people
// out on the streets once your results are in, every quest played start to finish through its dialogue
// (Last Seen at Hub Central, The Night Sheets, Scan Lines with the Order's front desk, The Ration Card, The
// Gap, Apples After Dark), compass targets across the city, a save and reload in the middle, and the Chalk
// Year: out of headquarters into the city between cases, the way back, and what the campaign reads.
const L = require('./lib.js');
L.run('city side quests', async (p, T, errs) => {
  const ev = (fn, a) => p.evaluate(fn, a);
  await L.quickStart(p);
  await L.b3(p);
  const setup = () => ev(() => {
    // stand next to someone (or something) out there, let the street catch up, and talk
    window.CQT = {
      meet(id) {
        QA.end();
        const a = DV.CityQuests.where(id);
        if (!a) return id + ' NOT OUT THERE';
        QA.tp(a[0] + 0.6, a[1] + 0.6, 0); QA.step(0.3);
        return QA.talk(id);
      },
      seq(id, picks) { const r = [CQT.meet(id)]; for (const s of picks) r.push(QA.pick(s)); QA.end(); return r; },
      use(id, picks) { QA.end(); const r = [B.use('cq:' + id)]; for (const s of picks) r.push(QA.pick(s)); QA.end(); return r; },
      q(id) { return DV.Quests.q(id) ? DV.Quests.q(id).state + (DV.Quests.q(id).outcome ? ':' + DV.Quests.q(id).outcome : '') : 'none'; },
    };
  });
  await setup();
  const ok = (r) => r.every((x) => /^(ok|used|talk|start|[a-z_]+$)/.test(x) && !/NO |NOT /.test(x));

  /* ---------------- before the results: nobody out there ---------------- */
  const before = await ev(() => ({ toby: DV.CityQuests.where('toby_kerr'), people: DV.NPCs.all.filter((n) => n.def.role === 'city' && n.present).length, models: DV.NPCs.all.filter((n) => n.def.role === 'city' && n.model).length }));
  T.ok(!before.toby && before.people === 0 && before.models === 0, 'before the results nobody from the city\'s stories is out, or built', before);
  await ev(() => {
    DV.State.setFlag('results_discussed'); DV.State.setFlag('security_cleared'); DV.Inventory.add('name_badge', 1, true);
    DV.Build2.beginGoingHome(); DV.Clock.skipTo(12 * 60);
  });

  /* ---------------- the people: placed, built only near you ---------------- */
  const placed = await ev(() => {
    const out = { far: null, near: null, solid: [] };
    QA.tp(40, 80, 0); QA.step(0.3);
    out.far = Object.keys(DV.CityQuests.active().info()).length;
    out.models = DV.NPCs.all.filter((n) => n.def.role === 'city' && n.model).length;
    const z = DV.World.current;
    for (const id in DV.CityQuests.people) { const a = DV.CityQuests.where(id); if (a && (z.colliders.blocked(a[0], a[1], 0.25, 'npc') || !z.walkable(a[0], a[1]))) out.solid.push(id); }
    const a = DV.CityQuests.where('toby_kerr'); QA.tp(a[0] + 4, a[1] + 4, 0); QA.step(0.5);
    out.near = !!DV.NPCs.get('toby_kerr').model; out.visible = DV.NPCs.get('toby_kerr').model && DV.NPCs.get('toby_kerr').model.root.visible;
    QA.tp(40, 80, 0); QA.step(0.3);
    out.dropped = !DV.NPCs.get('toby_kerr').model;
    return out;
  });
  T.ok(placed.far >= 10 && placed.models === 0 && placed.near && placed.visible && placed.dropped && !placed.solid.length, placed.far + ' people out on the streets once the gate opens; built when you walk up, let go when you walk off; none in a wall', placed);

  /* ---------------- LAST SEEN AT HUB CENTRAL ---------------- */
  let r = await ev(() => CQT.seq('toby_kerr', ['when did you last', '', 'what\'s her name']));
  T.ok(ok(r) && await ev(() => DV.Quests.obj('cq_sister', 'mart') === 'active'), 'Toby asks you to find his sister: Last Seen at Hub Central', r);
  const compass = await ev(() => { QA.tp(40, 80, 0); QA.step(0.2); const t = DV.UI.targetPos(DV.Quests.objTarget(DV.QuestDB.get('cq_sister').objectives[0])); return t && Math.round(Math.hypot(t[0] - 40, t[1] - 80)); });
  T.ok(compass > 200, 'the compass points across the city at Walt, a stop away on the Circle Line (' + compass + ' m)');

  /* ---------------- THE NIGHT SHEETS (and a save in the middle) ---------------- */
  r = await ev(() => CQT.seq('gordon_lyle', ['depends who', 'sell the order', 'in it for her', '', 'give it here']));
  T.ok(ok(r) && await ev(() => DV.Inventory.has('night_sheets') && DV.Quests.isActive('cq_sheets')), 'Gordon Lyle hands over the night sheets: The Night Sheets', r);
  T.ok(await ev(() => DV.Save.write('3').ok), 'saved in the street with two city quests under way');
  const snap = () => ({ q: ['cq_sister', 'cq_sheets'].map((id) => DV.Quests.state(id) + ':' + DV.Quests.obj(id, id === 'cq_sister' ? 'mart' : 'carry')), sheets: DV.Inventory.has('night_sheets'), met: DV.State.npc('toby_kerr').mem.met === true });
  const s0 = await ev(snap);
  await p.reload();
  await p.waitForFunction(() => window.DV && DV.Game && DV.Game.state === 'mainmenu', null, { timeout: 30000 });
  await ev(() => { DV.Settings.data.renderScale = 'ultra'; DV.Game.loadSlot('3'); });
  await p.waitForFunction(() => DV.Game.state === 'playing', null, { timeout: 30000 });
  await L.helpers(p); await L.b3(p); await setup();
  const s1 = await ev(snap);
  T.eq(s1, s0, 'loaded back: the quests, the envelope and who you\'ve met');
  T.ok(await ev(() => { QA.step(0.3); return !!DV.CityQuests.where('gordon_lyle') && !!DV.CityQuests.where('walt_simms'); }), 'and everyone is back out on the streets after the load');

  // Walt at the Mart, Nell in the ruins (she gives you the wire), Walt takes it back, Toby
  r = await ev(() => CQT.seq('walt_simms', ['little brother']));
  T.ok(ok(r) && await ev(() => DV.Quests.obj('cq_sister', 'ruins') === 'active'), 'Walt tells you she ran west to the ruins (and about the Order\'s reward)', r);
  r = await ev(() => CQT.seq('nell_kerr', ['toby', 'give me the wire']));
  T.ok(ok(r) && await ev(() => DV.Inventory.has('copper_wire') && DV.State.flag('cq_nell_home') && DV.Quests.obj('cq_sister', 'toby') === 'active'), 'Nell hands over the signal cable [CHARISMA 5] and will go home', r);
  r = await ev(() => CQT.seq('walt_simms', ['brought something back']));
  T.ok(await ev(() => DV.State.flag('cq_copper_returned') && !DV.Inventory.has('copper_wire')), 'the copper goes back to the line', r);
  r = await ev(() => CQT.seq('toby_kerr', ['coming home']));
  const sis = await ev(() => { QA.step(0.2); const a = DV.CityQuests.where('nell_kerr'), t = DV.CityQuests.where('toby_kerr'); return { q: CQT.q('cq_sister'), whistle: DV.Inventory.has('tin_whistle'), nell: a && Math.round(Math.hypot(a[0] - t[0], a[1] - t[1])) }; });
  T.ok(sis.q === 'complete:home' && sis.whistle && sis.nell < 4, 'Last Seen at Hub Central complete: Toby\'s whistle, and Nell on the steps beside him', sis);

  // the sheets: read them, warn Agnes, get the truth out of Gordon
  await ev(() => { const res = DV.Inventory.use('night_sheets'); window._read = res && res.read && res.read.text; });
  T.ok(await ev(() => /NO UNIT ASSIGNED/.test(window._read) && DV.State.flag('cq_sheets_read')), 'the rota reads, with a hole in Thursday');
  r = await ev(() => CQT.seq('agnes_rudd', ['regards', 'read thursday']));
  T.ok(ok(r) && await ev(() => DV.State.flag('cq_sheets_warned') && DV.Quests.obj('cq_sheets', 'gordon') === 'active'), 'Agnes reads it and calls off Thursday', r);
  r = await ev(() => CQT.seq('gordon_lyle', ['who gave you', 'families were going', 'get out of it']));
  T.ok(ok(r) && await ev(() => DV.Quests.q('cq_sheets').outcome === 'warned' && DV.State.flag('cq_clue_gordon') && DV.State.flag('cq_gordon_out') && !DV.CityQuests.where('gordon_lyle')), 'The Night Sheets complete: Gordon confesses [CHARISMA 6] who gave him the page, and quits', r);

  /* ---------------- SCAN LINES (handed in at the Order's front desk) ---------------- */
  r = await ev(() => CQT.seq('iris_dunn', ['why do you want', 'what would proof', 'stealing', '', 'you don\'t have to say']));
  T.ok(ok(r) && await ev(() => DV.Quests.obj('cq_scan', 'drone') === 'active'), 'Iris Dunn wants the drone\'s log card: Scan Lines', r);
  r = await ev(() => CQT.use('drone', ['release under the blue band']));
  T.ok(await ev(() => DV.Inventory.has('drone_log_card') && DV.Quests.obj('cq_scan', 'iris') === 'active'), 'the downed drone on Randolph Street gives up its card [INTELLIGENCE 6]', r);
  await ev(() => { const res = DV.Inventory.use('drone_log_card'); window._read = res && res.read && res.read.text; });
  T.ok(await ev(() => /DIRECTORATE/.test(window._read) && /TESTER/.test(window._read)), 'the card reads: your own name on it, and the Directorate');
  const desk0 = await ev(() => DV.Order.notice());
  r = await ev(() => CQT.use('order_desk', ['came down on randolph']));
  const desk = await ev(() => ({ q: CQT.q('cq_scan'), chit: DV.Inventory.has('order_chit'), card: DV.Inventory.has('drone_log_card'), notice: DV.Order.notice() }));
  T.ok(desk.q === 'complete:returned' && desk.chit && !desk.card && desk.notice <= desk0, 'Scan Lines complete the other way: the card handed in at the Order Station\'s front desk, for a commendation', [r, desk]);
  r = await ev(() => { CQT.meet('iris_dunn'); const v = QA.view(); QA.end(); return v; });
  T.ok(/empty when I went to look/.test(r), 'Iris knows the card went back to the Office', r);

  /* ---------------- THE RATION CARD ---------------- */
  r = await ev(() => CQT.seq('ellen_pruitt', ['all right', 'look for it']));
  T.ok(ok(r) && await ev(() => DV.Quests.obj('cq_card', 'lydia') === 'active'), 'Ellen Pruitt has lost her ration card: The Ration Card', r);
  r = await ev(() => CQT.seq('lydia_crane', ['his name']));
  T.ok(ok(r) && await ev(() => DV.State.flag('cq_know_danny') && DV.Quests.obj('cq_card', 'danny') === 'active'), 'Lydia saw a boy run west, and knows his name [PERCEPTION 5]', r);
  r = await ev(() => CQT.seq('danny_ruiz', ['danny?', 'keep it']));
  T.ok(ok(r) && await ev(() => DV.State.flag('cq_card_kept_danny') && DV.Quests.obj('cq_card', 'ellen') === 'active'), 'Danny Ruiz took it for his little brother; you let him keep it', r);
  r = await ev(() => CQT.seq('ellen_pruitt', ['let him keep it']));
  T.ok(ok(r) && await ev(() => DV.Quests.q('cq_card').outcome === 'given' && DV.Inventory.has('grey_scarf') && DV.State.flag('cq_card_given')), 'The Ration Card complete: Ellen says that\'s where it should be (and a scarf)', r);

  /* ---------------- THE GAP ---------------- */
  r = await ev(() => CQT.seq('sid_garrett', ['try me', 'you\'re on']));
  T.ok(ok(r) && await ev(() => DV.Quests.obj('cq_gap', 'climb') === 'active' && !!DV.World.current.interactables.find((i) => i.id === 'cq:fire_escape').cond()), 'Sid Garrett dares you across the Gap; the fire escape is climbable', r);
  r = await ev(() => CQT.use('fire_escape', ['look at me', 'coming over', '', 'take my hand']));
  const gap = await ev(() => ({ cloth: DV.Inventory.has('red_cloth'), down: DV.State.flag('cq_gap_mikey_down'), sid: DV.Quests.obj('cq_gap', 'sid'), mikey: !!DV.CityQuests.where('mikey_garrett') }));
  T.ok(gap.cloth && gap.down && gap.sid === 'active' && gap.mikey, 'six floors up: over the gap [AGILITY 7, a roll], and back with Sid\'s little brother and a strip of red cloth', [r, gap]);
  r = await ev(() => CQT.seq('sid_garrett', ['your brother was up there']));
  const gap2 = await ev(() => { QA.step(0.2); const m = DV.CityQuests.where('mikey_garrett'), s = DV.CityQuests.where('sid_garrett'); return { q: CQT.q('cq_gap'), crossed: DV.State.flag('cq_gap_crossed'), apart: m && Math.round(Math.hypot(m[0] - s[0], m[1] - s[1])) }; });
  T.ok(gap2.q === 'complete:told' && gap2.crossed && gap2.apart < 4, 'The Gap complete: you told Sid, and Mikey stands with his brother now', gap2);

  /* ---------------- APPLES AFTER DARK ---------------- */
  r = await ev(() => CQT.seq('hank_barlow', ['thank you', '', 'every day', 'in the crates', 'why is she', '', 'do it']));
  T.ok(ok(r) && await ev(() => DV.Quests.obj('cq_apples', 'lena') === 'active' && DV.Quests.obj('cq_apples', 'checkpoint') === 'active'), 'Hank Barlow has a passenger for the farms: Apples After Dark (two errands at once)', r);
  r = await ev(() => CQT.seq('lena_ross', ['running from', 'the apples are early']));
  T.ok(ok(r) && await ev(() => DV.State.flag('cq_lena_series7') && DV.State.flag('cq_clue_lena') && DV.Quests.objDone('cq_apples', 'lena')), 'Lena Ross tells you what she ran from [CHARISMA 6]: Series 7', r);
  r = await ev(() => CQT.seq('officer_kemp', ['whose orders', '', 'dated tomorrow']));
  T.ok(ok(r) && await ev(() => DV.State.flag('cq_checkpoint_gone') && DV.Quests.obj('cq_apples', 'hank') === 'active' && !DV.CityQuests.where('officer_kemp')), 'the checkpoint\'s order is dated tomorrow [INTELLIGENCE 6]: Officer Kemp goes home', r);
  r = await ev(() => CQT.seq('hank_barlow', ['she\'ll be here']));
  T.ok(ok(r) && await ev(() => DV.Quests.q('cq_apples').outcome === 'out' && DV.Inventory.has('amity_honey') && !DV.CityQuests.where('lena_ross')), 'Apples After Dark complete: the truck goes out at ten, and Hank\'s honey', r);

  /* ---------------- the Chalk Year: out of headquarters, and back ---------------- */
  await ev(() => {
    QA.end();
    const a = DV.State.data.aptitude; a.status = 'complete'; a.result = 'candor'; a.recordedAs = 'candor';
    DV.Build2.setFaction('candor');
    DV.Quests.complete('the_choosing');
    DV.Campaign.begin('candor');
  });
  const camp = await ev(() => ({ ezra: DV.Campaign.trustOf('ezra'), joan: DV.Campaign.trustOf('joan'), mary: DV.Campaign.trustOf('mary'), clues: ['cq_gordon', 'cq_lena', 'cq_scan'].filter((c) => DV.Campaign.hasClue(c)), out: DV.CityQuests.canGoOut() }));
  T.ok(camp.ezra >= 2 && camp.joan >= 3 && camp.mary >= 2 && camp.clues.length >= 2 && camp.out, 'the Chalk Year reads the streets: trust from what you did (Ezra ' + camp.ezra + ', Joan ' + camp.joan + ', Mary ' + camp.mary + '), clues in the Casebook (' + camp.clues.join(', ') + ')', camp);
  // home to headquarters through the door on Damen Avenue, then the mentor lets you back out
  await ev(() => { const it = DV.World.current.interactables.find((i) => i.id === 'cq_back_candor'); window._backOk = !!(it && it.cond()); it.onUse(); });
  T.ok(await ev(() => window._backOk), 'between cases, your sector\'s door takes you back to headquarters');
  T.ok(await L.until(p, () => DV.Chapter.active && DV.Chapter.id === 'week_candor' && DV.Game.state === 'playing', 150000), 'back at the Merciless Mart, where Rosa is');
  const mentor = await ev(() => { DV.Dialogue.startScene('cand_rosa', { speaker: 'Rosa Medina', faction: 'candor' }); const v = QA.view(); const res = QA.pick('out into the city'); return [v, res]; });
  T.ok(/out into the city/i.test(mentor[0]) && /^ok/.test(mentor[1]), 'Rosa lets you go out into the city', mentor);
  // (the whole city is put back up round you: give it time in software GL)
  const arrived = await L.until(p, () => DV.World.current && DV.World.current.id === 'testing_center' && DV.Game.state === 'playing', 150000);
  const outside = await ev(() => { QA.step(0.5); const h = DV.CityMap.homes.candor; return { zone: DV.World.current.id, chapter: !!DV.Chapter.active, d: Math.round(Math.hypot(DV.Player.x - h.x, DV.Player.z - h.z)), people: Object.keys(DV.CityQuests.active().info()).length, district: DV.District.currentId() }; });
  T.ok(arrived && outside.zone === 'testing_center' && !outside.chapter && outside.d < 3 && outside.people >= 6, 'out on Damen Avenue, by your sector\'s door, with the city\'s people about', outside);
  T.noErrors(errs);
});
