// Boot → main menu → New Game through the real UI (creator) → playable, moving.
const L = require('./lib.js');
L.run('boot & new game through the UI', async (p, T, errs) => {
  T.eq(await p.evaluate(() => DV.Game.state), 'mainmenu', 'boots to the main menu');
  await p.click('text=New Game');
  await p.waitForTimeout(800);
  T.ok(await p.isVisible('#creator'), 'character creator opens');
  await p.fill('#creator input[type=text]', 'Kestrel');
  await p.click('#creator .foot .btn:has-text("Next")');
  await p.waitForTimeout(300);
  await p.click('#creator .btn:has-text("Thinker")');
  await p.click('#creator .foot .btn:has-text("Next")');
  await p.waitForTimeout(300);
  await p.click('#creator .foot .btn:has-text("Begin")');
  await p.waitForTimeout(1200);
  await p.keyboard.press('Escape'); // skip intro
  await p.waitForFunction(() => DV.Game.state === 'playing', null, { timeout: 30000 });
  T.ok(true, 'intro skips into the world');
  const st = await p.evaluate(() => ({ name: DV.State.data.player.name, t: DV.Clock.str(), room: DV.World.current.roomAt(DV.Player.x, DV.Player.z).id, obj: DV.Quests.current() && DV.Quests.current().obj.id, npcs: DV.NPCs.all.filter((n) => n.present).length }));
  T.eq(st.name, 'Kestrel', 'name carried over');
  T.eq(st.room, 'lobby', 'starts in the entrance lobby');
  T.eq(st.obj, 'checkin', 'first objective is reception check-in');
  T.ok(st.npcs >= 15, 'NPCs present at 08:00 (' + st.npcs + ')');
  const z0 = await p.evaluate(() => DV.Player.z);
  await p.keyboard.down('KeyW'); await p.waitForTimeout(1200); await p.keyboard.up('KeyW');
  const z1 = await p.evaluate(() => DV.Player.z);
  T.ok(z0 - z1 > 0.8, 'W walks forward (' + (z0 - z1).toFixed(2) + 'm)');
  await L.shot(p, 'boot_world');
  T.noErrors(errs);
});
