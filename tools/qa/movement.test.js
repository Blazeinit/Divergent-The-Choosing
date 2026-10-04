// Crouch (C) and jump (Space): stamina cost, exhaustion, crouch speed and camera, stealth,
// and jumps that clear knee-high clutter but never gates or the security arm.
const L = require('./lib.js');
L.run('crouch & jump', async (p, T, errs) => {
  await L.quickStart(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  await ev(() => { QA.tp(40, 50, 0); DV.Player.stamina = 100; });
  await p.keyboard.press('Space');
  try { await p.waitForFunction(() => !DV.Player.onGround, null, { timeout: 5000 }); } catch (e) { /* asserted below */ }
  const air = await ev(() => [DV.Player.onGround, DV.Player.y, DV.Player.stamina]);
  T.ok(!air[0] && air[1] > 0, 'Space jumps (y ' + air[1].toFixed(2) + ')');
  T.ok(air[2] < 90 && air[2] > 80, 'a jump costs stamina (100 → ' + air[2].toFixed(0) + ')');
  await p.waitForFunction(() => DV.Player.onGround, null, { timeout: 4000 });
  const peak = await ev(() => { const g = 10.5, v = DV.Config.PLAYER.jumpSpeed; return (v * v) / (2 * g); });
  T.ok(peak > 0.6 && peak < 0.95, 'jump height ≈ ' + peak.toFixed(2) + ' m, and you land again');
  const tired = await ev(() => { DV.Player.stamina = 5; return DV.Player.tryJump(); });
  T.eq(tired, false, 'too little stamina: no jump');
  // crouch
  await ev(() => { DV.Player.stamina = 100; DV.Player.crouched = false; QA.tp(40, 54, Math.PI); DV.Game.rig.yaw = Math.PI; });
  await p.keyboard.press('KeyC');
  try { await p.waitForFunction(() => DV.Player.crouched, null, { timeout: 5000 }); } catch (e) { /* asserted below */ }
  // let the crouch settle in game time (stepped, so a slow software-GL frame rate can't starve it)
  const c = await ev(() => { QA.step(0.6); return [DV.Player.crouched, DV.Player.pivotScale]; });
  T.ok(c[0] && c[1] < 0.8, 'C crouches and lowers the camera (pivot × ' + c[1].toFixed(2) + ')');
  const crouchDist = await ev(() => { const z0 = DV.Player.z; DV.Input.keys.KeyW = true; QA.step(1.5); DV.Input.keys.KeyW = false; return z0 - DV.Player.z; });
  T.ok(crouchDist > 0.4 && crouchDist < 2.2, 'crouch-walking is slow (' + crouchDist.toFixed(2) + ' m in 1.5 s)');
  // stealth: a staff member who would hear you walking can't hear you sneaking
  const stealth = await ev(() => {
    const b = DV.NPCs.get('frank_kowalski');
    b.present = true; b.mode = 'acting'; b.path = null; b.x = 71.5; b.z = 25.5; b.lookYaw = 0;
    DV.Player.place(71.5, 27.4, 0); b.rot = 0; // Frank faces away (+z is behind… he faces the player's back)
    b.rot = Math.PI; // facing away from the player, who stands 1.9 m behind him
    DV.State.data.player.attributes.agility = 4;
    DV.Player.crouched = false; DV.Player.speed = 1;
    const heard = DV.Story.watchers(8, 120).length;
    DV.Player.crouched = true;
    const sneaking = DV.Story.watchers(8, 120).length;
    return [heard, sneaking];
  });
  T.ok(stealth[0] > 0 && stealth[1] === 0, 'clumsy footsteps behind someone get noticed; sneaking up does not (' + stealth.join(' vs ') + ')');
  // jumping never gets you over the security arm
  await ev(() => { DV.Player.crouched = false; DV.State.data.player.attributes.agility = 6; DV.Player.stamina = 100; QA.tp(40, 41.8, Math.PI); DV.Game.rig.yaw = Math.PI; });
  await ev(() => { DV.Input.keys.KeyW = true; for (let i = 0; i < 3; i++) { DV.Input.pressed.Space = true; QA.step(0.5); } DV.Input.keys.KeyW = false; });
  T.ok(await ev(() => DV.Player.z > 41.1 && !DV.State.flag('security_cleared')), 'you can\'t jump the security arm');
  T.noErrors(errs);
});
