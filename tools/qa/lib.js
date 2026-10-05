/* ==========================================================================
   DIVERGENT — headless QA harness (dev tool, not part of the game)
   Drives the real game in headless Chromium (software WebGL) through
   Playwright. Each *.test.js file is standalone and exits non-zero on
   failure; run.js runs them all.
   ========================================================================== */
'use strict';
const path = require('path');
const fs = require('fs');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('Playwright is required: install it (npm i -g playwright) or point NODE_PATH at a global node_modules that has it.');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = 'file://' + path.join(ROOT, 'index.html');
const OUT = path.join(__dirname, 'out');
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'];

exports.ROOT = ROOT;

// open the game; collects console errors/warnings and page exceptions
exports.open = async (opts) => {
  opts = opts || {};
  const launch = { args: ARGS };
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launch);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text());
    else if (opts.log) console.log('  [page]', m.text());
  });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto(PAGE);
  await page.waitForFunction(() => window.DV && DV.Game && DV.Game.state === 'mainmenu', null, { timeout: 30000 });
  return { browser, page, errs };
};

// skip the creator: build a character through the API and enter the world
exports.quickStart = async (page, attrs) => {
  await page.evaluate((attrs) => {
    DV.State.reset();
    // the lowest render resolution: software GL is fill-rate bound, and tests don't need pixels
    DV.Settings.data.renderScale = 'ultra';
    DV.Game.resize();
    const pl = DV.State.data.player;
    pl.name = 'Tester'; pl.sex = 'm'; pl.upbringing = 'erudite';
    pl.appearance = DV.Character.fromFaction('neutral', 'm', 'tester');
    Object.assign(pl.attributes, attrs || { strength: 5, agility: 6, intelligence: 7, perception: 7, charisma: 7, resolve: 7 });
    DV.Menus.hideAll(); DV.Game.hideMenuFigures();
    DV.Inventory.add('neutral_garments', 1, true); DV.Inventory.add('clothes_erudite', 1, true);
    DV.Game.enterWorld(false);
  }, attrs);
  await page.waitForFunction(() => DV.Game.state === 'playing', null, { timeout: 30000 });
  await exports.helpers(page);
};

// in-page helpers (window.QA)
exports.helpers = (page) => page.evaluate(() => {
  window.QA = {
    pick(sub) {
      const v = DV.Dialogue.active && DV.Dialogue.active.view;
      if (!v) return 'NO DIALOGUE';
      const ch = v.choices.find((c) => c.enabled && c.label.toLowerCase().indexOf(sub.toLowerCase()) >= 0);
      if (!ch) return 'NO CHOICE "' + sub + '" in ' + v.nodeId + ': ' + v.choices.map((c) => c.label + (c.enabled ? '' : '(x)')).join(' | ');
      DV.Dialogue.choose(ch.index);
      return 'ok ' + (DV.Dialogue.active ? DV.Dialogue.active.node : 'END');
    },
    seq(list) { return list.map((s) => QA.pick(s)); },
    end() { if (DV.Dialogue.active) DV.Dialogue.end(); if (DV.Game.state === 'dialogue') DV.Game.state = 'playing'; },
    node() { return DV.Dialogue.active ? DV.Dialogue.active.node : null; },
    talk(id) {
      QA.end();
      const n = DV.NPCs.get(id);
      if (!n.present) return id + ' NOT PRESENT';
      DV.Player.place(n.x + 0.9, n.z + 0.9, 0);
      DV.Game.talkTo(n, true);
      return QA.node() || 'no dialogue';
    },
    view() { const v = DV.Dialogue.active && DV.Dialogue.active.view; return v ? v.nodeId + ' :: ' + v.text.slice(0, 90) + ' || ' + v.choices.map((c) => c.label + (c.enabled ? '' : '(x)')).join(' | ') : null; },
    // teleport; the camera comes too (behind you, the way you face: left where it was, it looks off at
    // whatever it last looked at, and a screenshot shows nothing of where you are)
    tp(x, z, rot) {
      DV.Player.place(x, z, rot || 0);
      const G = DV.Game;
      if (G.state === 'playing' || G.state === 'menu') { G.rig.yaw = rot || 0; G.rig.pitch = 0.18; G.rig.follow(true); }
    },
    // frame a shot: stand at (x, z) with the camera behind you looking at (tx, tz), a little to one side
    // so you're not in the way of what you're photographing (side: metres, + to the right)
    shotAt(x, z, tx, tz, side) {
      const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz) || 1, yaw = Math.atan2(dx, dz);
      const px = x - (dz / d) * (side || 0), pz = z + (dx / d) * (side || 0);
      DV.Player.place(px, pz, yaw);
      DV.Game.rig.yaw = yaw + (side ? Math.atan2(side, d) * 0.5 : 0); DV.Game.rig.pitch = 0.12; DV.Game.rig.follow(true);
    },
    skip(t) { QA.end(); DV.Clock.skipTo(DV.U.parseTime(t)); DV.NPCAI.syncAll(); return DV.Clock.str(); },
    q(id) { const q = DV.Quests.q(id); return q ? q.state : 'none'; },
    obj(id, o) { return DV.Quests.obj(id, o); },
    act(name, id) { QA.end(); const zone = DV.World.current; const it = zone.interactables.find((i) => i.id === id) || { id }; const r = DV.Actions[name](DV.Game, it); if (DV.UI.modalOpen === 'reading') DV.UI.closeReading(); return r ? (r.message || (r.read && r.read.title) || 'r') : null; },
    door(id) { QA.end(); const d = DV.World.current.doorMap[id]; DV.Game.tryDoor(d); return DV.Story.playerCanPass(d.lock, d); },
    // step the simulation without rendering (fast-forward game time)
    step(secs, keepPlayerAt) {
      const n = Math.round(secs / 0.05);
      for (let i = 0; i < n; i++) {
        DV.Game.update(0.05);
        DV.World.update(0.05, DV.Game.camera);
        if (keepPlayerAt) DV.Player.place(keepPlayerAt[0], keepPlayerAt[1], 0);
      }
    },
    // click a page element the way the player would: through the in-game cursor while the
    // mouse is captured (Playwright's real clicks land at screen coordinates, not on the
    // game's cursor), or a plain click when the mouse is free
    click(sel, text) {
      const el = [...document.querySelectorAll(sel)].find((e) => !text || e.textContent.indexOf(text) >= 0);
      if (!el) return 'NO ' + sel + (text ? ' "' + text + '"' : '');
      const r = el.getBoundingClientRect();
      if (DV.Cursor.active && DV.Input.locked) {
        DV.Cursor.moveBy(r.left + r.width / 2 - DV.Cursor.x, r.top + r.height / 2 - DV.Cursor.y);
        DV.Input.canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
        window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
      } else el.click();
      return 'ok';
    },
    checkIn() { QA.talk('martha_bell'); QA.pick('{name}'.replace('{name}', DV.State.data.player.name)); QA.end(); return DV.Inventory.has('name_badge'); },
    clearSecurity() { QA.talk('dean_walsh'); QA.seq(['show your name badge', 'arms out']); QA.end(); return !!DV.State.flag('security_cleared'); },
  };
});

// Build 3 bots (window.B): play a fight, finish a training activity, use an interactable,
// jump the clock — enough to drive the Dauntless district and the faction weeks headless
exports.b3 = (page) => page.evaluate(() => {
  window.B = {
    // a fighter who guards the heavy shots, slips the kicks and punishes recoveries
    fightBot(maxN) {
      const A = DV.Activity.current; if (!A || A.id !== 'fight') return 'no fight';
      const I = DV.Input; let n = 0;
      while (DV.Activity.current === A && n++ < (maxN || 4000)) {
        if (A.state === 'fight') {
          const d = Math.hypot(A.me.x - A.them.x, A.me.z - A.them.z), t = A.them;
          I.keys.KeyW = d > 1.05; I.keys.ShiftLeft = false; I.keys.KeyD = false;
          if (t.state === 'attack' && t.phase === 'windup' && t.move.kind !== 'light') { if (t.move.kind === 'kick' || n % 2) { I.pressed.Space = true; I.keys.KeyD = true; } else I.keys.ShiftLeft = true; }
          else if ((t.state === 'attack' && t.phase === 'recover') || t.state === 'stagger' || t.state === 'hit') { if (n % 3 === 0) I.pressed[n % 2 ? 'MouseLeft' : 'MouseRight'] = true; }
          else if (t.state === 'block') { if (n % 12 === 0) I.pressed.KeyF = true; }
          else if (n % 9 === 0) I.pressed.MouseLeft = true;
        }
        QA.step(0.05);
      }
      for (const k of ['KeyW', 'ShiftLeft', 'KeyD']) I.keys[k] = false;
      return 'fight over';
    },
    finishActivity(maxN) {
      const A = DV.Activity.current; if (!A) return null; let n = 0;
      if (A.id === 'fight') return B.fightBot(maxN);
      while (DV.Activity.current === A && n++ < (maxN || 3000)) {
        if (A.id === 'range' && A.eye) { const tp = A.face.getWorldPosition(new THREE.Vector3()); const w = tp.sub(A.eye).normalize(); A.ay = DV.U.wrapAngle(Math.atan2(w.x, w.z) - A.rot); A.ap = Math.asin(w.y) - (A.recoil || 0); if (A.cool <= 0 && A.facing !== false) DV.Input.pressed.MouseLeft = true; }
        if (A.id === 'knives' && A.eye) { const b = A.board; const w = new THREE.Vector3(b.x, b.y, b.z).sub(A.eye).normalize(); A.ay = DV.U.wrapAngle(Math.atan2(w.x, w.z) - A.rot); A.ap = Math.asin(w.y); if (A.charge < 0 && A.left > 0 && A.throwT <= 0 && !A.flying.length) DV.Input.keys.MouseLeft = true; if (A.charge >= 0 && Math.abs(A.charge - A.ideal) < 0.03) DV.Input.keys.MouseLeft = false; }
        if (A.id === 'bags') { const c = A.cues[A.idx]; if (c && Math.abs(A.t - c.t) < 0.05) { if (c.id === 'jab') DV.Input.pressed.MouseLeft = true; else if (c.id === 'cross') DV.Input.pressed.MouseRight = true; else if (c.id === 'kick') DV.Input.pressed.KeyF = true; } DV.Input.keys.ShiftLeft = !!(c && c.id === 'block' && A.t - c.t > -0.02); }
        QA.step(0.05);
      }
      DV.Input.keys.MouseLeft = false; DV.Input.keys.ShiftLeft = false;
      return 'done ' + A.id;
    },
    // use an interactable (zone or chapter) as if standing at it
    use(id) {
      const z = DV.World.current;
      const it = z.interactables.find((i) => i.id === id) || DV.Interaction.extra.find((i) => i.id === id);
      if (!it) return 'no ' + id;
      if (it.cond && !it.cond()) return 'not now: ' + id;
      if (DV.Interaction.extra.indexOf(it) >= 0) { it.onUse(DV.Game, it); return 'used ' + id; }
      DV.Player.place(typeof it.x === 'function' ? it.x() : it.x, typeof it.z === 'function' ? it.z() : it.z, 0);
      DV.Interaction.current = it; DV.Interaction.use(DV.Game);
      return 'used ' + id;
    },
    at(t) { QA.end(); DV.Clock.skipTo(DV.U.parseTime(t)); DV.NPCAI.syncAll(); QA.step(0.3); return DV.Clock.str(); },
    // step until a condition holds (a dialogue opens, an activity starts)
    wait(fn, secs) { let n = 0; const max = Math.round((secs || 30) / 0.05); while (!fn() && n++ < max) QA.step(0.05); return !!fn(); },
    readBody() { const b = document.querySelector('#reading .body'); const t = b && b.textContent; DV.UI.closeReading(); return t; },
  };
});

// wait for a condition while stepping game time (survives slow software-GL frames, and
// lets real-time fades and timers run between polls)
exports.until = (page, cond, timeout, step) => page.waitForFunction(
  ([src, st]) => { const ok = (0, eval)('(' + src + ')')(); if (!ok) QA.step(st); return ok; },
  [cond.toString(), step || 0.25], { timeout: timeout || 30000, polling: 60 }
).then(() => true, () => false);

// a screenshot, once the camera has settled behind the player (it eases after a jump), with a long
// timeout (software GL takes its time on a busy frame)
exports.shot = async (page, name) => {
  fs.mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(450);
  return page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 120000 });
};

// tiny assertion collector
exports.suite = (name) => {
  const results = [];
  const t0 = Date.now();
  console.log('\n=== ' + name);
  const S = {
    ok(cond, msg, detail) {
      results.push({ ok: !!cond, msg });
      console.log((cond ? '  ✓ ' : '  ✗ ') + msg + (!cond && detail !== undefined ? '  → ' + JSON.stringify(detail) : ''));
      return !!cond;
    },
    eq(a, b, msg) { return S.ok(JSON.stringify(a) === JSON.stringify(b), msg + ' (' + JSON.stringify(a) + ')', { expected: b, got: a }); },
    log(...a) { console.log('    ', ...a); },
    noErrors(errs, ignore) {
      const real = errs.filter((e) => !(ignore || []).some((re) => re.test(e)));
      S.ok(real.length === 0, 'no console errors or page exceptions', real.slice(0, 8));
    },
    async done(browser) {
      if (browser) await browser.close();
      const failed = results.filter((r) => !r.ok);
      console.log('  ' + (failed.length ? 'FAILED ' + failed.length + '/' + results.length : 'passed ' + results.length + '/' + results.length) + '  (' + ((Date.now() - t0) / 1000).toFixed(0) + 's)');
      process.exitCode = failed.length ? 1 : 0;
    },
  };
  return S;
};

// run a test body; any thrown error is a failure
exports.run = (name, body) => {
  const S = exports.suite(name);
  let browser = null;
  (async () => {
    try {
      const o = await exports.open();
      browser = o.browser;
      await body(o.page, S, o.errs);
    } catch (e) {
      S.ok(false, 'test threw: ' + (e && e.message));
    }
    await S.done(browser);
  })();
};
