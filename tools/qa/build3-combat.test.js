// Build 3, hand to hand: a fight starts as an activity (controls, camera and HUD handed over),
// a player who guards and punishes wins against a sparring partner, a player who only holds
// block loses, a player who holds Q yields — and every fight hands back a full result and the
// controls. Then the training room: the range, the knife wall and the bags each give a score.
const L = require('./lib.js');
L.run('Build 3: combat and training', async (p, T, errs) => {
  await L.quickStart(p);
  await L.b3(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  const fight = (style, stats) => ev(([style, stats]) => {
    const s = DV.World.current.spot('plaza_center');
    DV.Player.place(s.x, s.z, 0);
    window.FR = null;
    const app = DV.Character.fromFaction('dauntless', 'm', 'sparring-' + style);
    DV.Combat.fight({
      opponent: { name: 'Sparring Partner', app, stats: stats || { strength: 5, agility: 5, resolve: 5, perception: 4, melee: 25 }, ai: DV.Combat.styles[style] },
      ring: { x0: s.x - 3, z0: s.z - 3, x1: s.x + 3, z1: s.z + 3 }, start: { player: [s.x, s.z - 1.2], opponent: [s.x, s.z + 1.2] }, allowYield: true, timeLimit: 150,
    }, (res) => { window.FR = res; });
    return { state: DV.Game.state, act: DV.Activity.current && DV.Activity.current.id, hud: !!document.querySelector('.fight-hud') };
  }, [style, stats]);

  // 1. a fight takes over the game
  const f0 = await fight('novice');
  T.ok(f0.state === 'activity' && f0.act === 'fight' && f0.hud, 'a fight starts as an activity with its own HUD', f0);
  // 2. guard, slip, punish: the bot wins against a novice
  const r1 = await ev(() => { QA.step(1.3); B.fightBot(4000); return window.FR; });
  T.ok(r1 && r1.winner && r1.how && r1.time > 0 && r1.landed >= 0 && r1.thrown > 0, 'the fight hands back a full result', r1);
  T.eq(r1 && r1.winner, 'player', 'a player who guards the heavy shots and punishes recoveries beats a novice (' + (r1 && r1.how) + ' in ' + (r1 && r1.time) + 's)');
  T.ok(await ev(() => DV.Game.state === 'playing' && !DV.Activity.active() && !document.querySelector('.fight-hud')), 'and the controls come back');
  // 3. only holding block loses (stamina runs out, the guard breaks)
  await fight('boxer', { strength: 6, agility: 6, resolve: 6, perception: 5, melee: 40 });
  const r2 = await ev(() => {
    QA.step(1.3);
    let n = 0;
    while (!window.FR && n++ < 4000) { DV.Input.keys.ShiftLeft = true; QA.step(0.05); }
    DV.Input.keys.ShiftLeft = false;
    return window.FR;
  });
  T.ok(r2 && r2.winner !== 'player', 'turtling behind a guard loses to a boxer', r2);
  // 4. yielding: hold Q
  await fight('brawler');
  const r3 = await ev(() => {
    QA.step(1.3);
    let n = 0;
    while (!window.FR && n++ < 400) { DV.Input.keys.KeyQ = true; QA.step(0.05); }
    DV.Input.keys.KeyQ = false;
    return window.FR;
  });
  T.ok(r3 && r3.how === 'yield' && r3.winner === 'opponent', 'holding Q yields the fight', r3);

  // 5. the training room (in the Dauntless compound, Day 3)
  await ev(() => {
    DV.State.data.player.upbringing = 'erudite';
    DV.Build2.setFaction('dauntless'); DV.Build2.dressFor('dauntless');
    DV.State.data.world.day = 3; DV.State.data.world.time = DV.U.parseTime('07:50');
    DV.District.enter('dauntless', { spawn: [24, -24, Math.PI], instant: true });
  });
  T.ok(await L.until(p, () => DV.World.current && DV.World.current.id === 'd_compound' && DV.Game.state === 'playing', 30000), 'into the Dauntless compound');
  const range = await ev(() => { B.at('08:02'); B.use('range:lane1'); const id = DV.Activity.current && DV.Activity.current.id; window.TR = null; const A = DV.Activity.current; const cb = DV.Activity.onDone; DV.Activity.onDone = (r) => { window.TR = r; if (cb) cb(r); }; B.finishActivity(); return [id, window.TR]; });
  T.ok(range[0] === 'range' && range[1] && range[1].score >= 0 && range[1].score <= 100, 'the range: a score out of 100 (' + (range[1] && range[1].score) + ')', range);
  const bags = await ev(() => { B.at('10:05'); B.use('bag:bag2'); const id = DV.Activity.current && DV.Activity.current.id; window.TR = null; const cb = DV.Activity.onDone; DV.Activity.onDone = (r) => { window.TR = r; if (cb) cb(r); }; B.finishActivity(); return [id, window.TR]; });
  T.ok(bags[0] === 'bags' && bags[1] && bags[1].score >= 0 && bags[1].score <= 100, 'the bags: a score out of 100 (' + (bags[1] && bags[1].score) + ')', bags);
  const knives = await ev(() => {
    QA.end(); window.TR = null;
    DV.Training.knives({}, (r) => { window.TR = r; });
    const id = DV.Activity.current && DV.Activity.current.id;
    B.finishActivity();
    return [id, window.TR];
  });
  T.ok(knives[0] === 'knives' && knives[1] && knives[1].score >= 0 && knives[1].score <= 100, 'the knife wall: a score out of 100 (' + (knives[1] && knives[1].score) + ')', knives);
  T.ok(await ev(() => DV.Game.state === 'playing' && !DV.Activity.active()), 'every activity hands the controls back');
  T.noErrors(errs);
});
