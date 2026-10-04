// Every side quest end to end, plus lockpicking, the Tab menu, pause, waiting on a bench,
// and a save → page reload → Continue round trip.
const L = require('./lib.js');
L.run('side quests, menus, save/load', async (p, T, errs) => {
  await L.quickStart(p, { strength: 5, agility: 6, intelligence: 6, perception: 6, charisma: 7, resolve: 6 });
  const ev = (fn, a) => p.evaluate(fn, a);
  // lockpicking the records archive (Agility 8, nobody watching)
  const pick = await ev(() => { DV.State.data.player.attributes.agility = 8; QA.tp(11, 43); QA.door('rec_door'); const a = QA.pick('hairpin'); const t = QA.view(); QA.end(); DV.State.data.player.attributes.agility = 6; return [a, t, DV.State.zoneState('testing_center').doors.rec_door]; });
  T.ok(pick[2] === 'unlocked', 'lockpick [AGILITY 8] opens the records archive', pick);
  // reception (+ Paper Trail) and security
  await ev(() => { QA.talk('martha_bell'); QA.seq(['tester', 'thank you', 'anything i can do', 'take it']); QA.end(); });
  T.ok(await ev(() => DV.Inventory.has('name_badge') && DV.Inventory.has('sealed_envelope')), 'checked in; Martha hands over the sealed envelope');
  T.ok(await ev(() => QA.clearSecurity()), 'security cleared');
  // THE WOODEN BIRD (Lucy → Gus → storage → back to Lucy)
  await ev(() => QA.skip('08:20'));
  const pip = await ev(() => { QA.talk('lucy_barnes'); const a = QA.seq(['what kind', 'help you look', 'fine', 'where did you last']); a.push(QA.pick('')); a.push(QA.pick('swept it up')); QA.end(); return a; });
  T.ok(pip.every((x) => /^ok/.test(x)), 'Lucy asks for help; [PERCEPTION 5] works out who swept it up', pip);
  const gus = await ev(() => { QA.talk('gus_novak'); const a = QA.seq(['clean floor', 'wooden bird', 'amity kid']); QA.end(); return [a, DV.Inventory.has('storage_key')]; });
  T.ok(gus[1], 'Gus lends the storage key [CHARISMA 5]', gus[0]);
  await ev(() => { QA.door('storage_door'); QA.tp(59.4, 35.4); QA.act('lostfound', 'lostfound'); });
  T.ok(await ev(() => DV.Inventory.has('wooden_bird') && DV.Inventory.has('staff_keycard')), 'Lost & Found: the bird (and a proctor\'s keycard)');
  await ev(() => { QA.talk('lucy_barnes'); QA.seq(["it's yours", 'good luck']); QA.end(); QA.talk('gus_novak'); QA.seq(['storage key back', 'thanks, gus']); QA.end(); });
  T.eq(await ev(() => [QA.q('lost_bird'), DV.State.flag('closet_open')]), ['complete', true], 'The Wooden Bird complete; Gus opens his closet to you');
  // FINDERS KEEPERS
  await ev(() => { QA.talk('sarah_lin'); QA.pick('lost & found. here'); QA.end(); });
  T.eq(await ev(() => QA.q('finders_keepers')), 'complete', 'Finders Keepers: keycard returned');
  // PAPER TRAIL (read it, deliver, confess)
  await ev(() => { DV.Inventory.use('sealed_envelope'); QA.pick('lift the seal'); QA.pick('fold'); QA.end(); QA.talk('alan_pierce'); QA.pick('of course'); QA.end(); QA.talk('martha_bell'); QA.pick('i read it'); QA.pick('careful'); QA.end(); });
  T.eq(await ev(() => [DV.State.flag('read_envelope'), QA.q('paper_trail')]), [true, 'complete'], 'Paper Trail: read, delivered, confessed');
  // PROTOCOL D (Jenna, Ruth, the archive box)
  await ev(() => { QA.talk('jenna_morales'); QA.pick('hiding something'); QA.pick("i'm in"); QA.end(); QA.talk('jenna_morales'); QA.pick('a list'); QA.pick('additional review'); QA.end(); });
  const ruth = await ev(() => { QA.talk('ruth_abbott'); const a = QA.seq(['just exploring', 'could i see', 'someone i care']); QA.end(); return [a, DV.Inventory.has('records_key')]; });
  T.ok(ruth[1], 'Ruth gives you the archive key [CHARISMA 7]', ruth[0]);
  await ev(() => { QA.door('rec_door'); QA.tp(2, 44.35); });
  await p.waitForTimeout(400);
  await ev(() => { QA.act('protocolBox', 'protocol_box'); QA.talk('jenna_morales'); QA.pick('read it yourself'); QA.end(); });
  T.eq(await ev(() => QA.q('protocol_d')), 'complete', 'Protocol D complete');
  // INITIATION STARTS EARLY (Nate's coffee dare)
  await ev(() => { QA.talk('nate_russo'); QA.seq(['brave', 'how', "you're on"]); QA.end(); });
  const coffee = await ev(() => { QA.tp(69, 23.0); return [QA.act('coffee', 'coffee:brk_coffee'), DV.State.flag('coffee_stolen')]; });
  T.ok(coffee[1], 'coffee stolen unseen', coffee[0]);
  await ev(() => { QA.talk('nate_russo'); QA.pick('swiped'); QA.end(); });
  T.eq(await ev(() => QA.q('initiation')), 'complete', 'Initiation Starts Early complete');
  // caught version: Frank turned toward you
  const caught = await ev(() => {
    DV.Inventory.remove('coffee');
    QA.tp(69, 23.0);
    // stand Frank in the break room, looking straight at the coffee machine
    const b = DV.NPCs.get('frank_kowalski');
    b.present = true; b.mode = 'acting'; b.path = null;
    b.x = 71.5; b.z = 25.5; b.lookYaw = 0;
    b.rot = DV.U.yawTo(b.x, b.z, DV.Player.x, DV.Player.z);
    return [QA.act('coffee', 'coffee:brk_coffee'), !!DV.State.flag('coffee_caught'), DV.Inventory.has('coffee')];
  });
  T.ok(caught[1] && !caught[2], 'a staff member watching catches a second theft', caught);
  // COLD FEET (Daniel)
  await ev(() => QA.skip('09:05'));
  const el = await ev(() => { QA.talk('daniel_webb'); const a = QA.seq(['why are you hiding', 'collecting yourself', '...', 'honest son']); QA.end(); return [a, DV.State.flag('daniel_convinced')]; });
  T.ok(el[1], 'Daniel convinced to go back', el[0]);
  await ev(() => { QA.skip('11:31'); QA.skip('12:16'); DV.Story.onMinute(DV.U.parseTime('12:16')); });
  await ev(() => { QA.talk('daniel_webb'); QA.pick('glad you went'); QA.end(); });
  T.eq(await ev(() => QA.q('cold_feet')), 'complete', 'Cold Feet complete (Daniel tested at 11:30)');
  // Tab menu, pause
  await ev(() => QA.end());
  await p.keyboard.press('Tab'); await p.waitForTimeout(300);
  T.eq(await ev(() => DV.Game.state), 'menu', 'Tab opens the RPG menu');
  for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6']) { await p.keyboard.press(k); await p.waitForTimeout(250); }
  try { await p.waitForFunction(() => DV.RPGMenu.tab === 'map', null, { timeout: 2000 }); } catch (e) { /* asserted below */ }
  T.eq(await ev(() => DV.RPGMenu.tab), 'map', 'number keys switch tabs');
  await L.shot(p, 'side_map');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  T.ok(await ev(() => DV.Game.state === 'paused' && !!document.getElementById('pause')), 'Esc pauses');
  await p.click('#pause .mm-item:has-text("Resume")'); await p.waitForTimeout(300);
  T.eq(await ev(() => DV.Game.state), 'playing', 'Resume returns to play');
  // sit and wait an hour
  await ev(() => { QA.tp(30, 33); DV.Game.sitOn(DV.World.current.spot('hb_w3a_s3')); });
  const t0 = await ev(() => DV.Clock.minutes());
  await p.keyboard.press('KeyT'); await p.waitForTimeout(300);
  // the wait menu keeps the mouse captured, so click through the in-game cursor
  T.eq(await ev(() => QA.click('#waitmenu .btn', 'Wait')), 'ok', 'Wait clicked with the in-game cursor');
  await p.waitForTimeout(2000);
  T.ok(await ev((t0) => DV.Clock.minutes() - t0 >= 59, t0), 'waiting on a bench passes the hour');
  // save, reload, continue
  T.ok(await ev(() => DV.Save.write('2').ok), 'saved to slot 2');
  const snap = () => ({ t: DV.Clock.str(), q: DV.Quests.all().map((x) => x.id + ':' + x.q.state).join(','), inv: DV.Inventory.list().map((i) => i.id).sort().join(','), flags: Object.keys(DV.State.data.world.flags).length, rel: DV.State.npc('lucy_barnes').rel, badge: DV.Player.model.tagOn });
  const before = await ev(snap);
  await p.reload();
  await p.waitForFunction(() => window.DV && DV.Game && DV.Game.state === 'mainmenu', null, { timeout: 30000 });
  await p.click('.mm-item:has-text("Continue")');
  await p.waitForFunction(() => DV.Game.state === 'playing', null, { timeout: 30000 });
  const after = await ev(snap);
  T.eq(after, before, 'Continue restores time, quests, inventory, flags, relationships and the badge');
  T.noErrors(errs);
});
