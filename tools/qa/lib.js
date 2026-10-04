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
    tp(x, z, rot) { DV.Player.place(x, z, rot || 0); },
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
    checkIn() { QA.talk('marion_hale'); QA.pick('{name}'.replace('{name}', DV.State.data.player.name)); QA.end(); return DV.Inventory.has('name_badge'); },
    clearSecurity() { QA.talk('kade_mercer'); QA.seq(['show your name badge', 'arms out']); QA.end(); return !!DV.State.flag('security_cleared'); },
  };
});

exports.shot = (page, name) => {
  fs.mkdirSync(OUT, { recursive: true });
  return page.screenshot({ path: path.join(OUT, name + '.png') });
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
