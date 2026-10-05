#!/usr/bin/env node
/* Runs every *.test.js in this folder (or the ones named on the command line) one after
   another and prints a summary. Exit code is non-zero if any test failed.
     node tools/qa/run.js                 # everything
     node tools/qa/run.js checkpoint audio
*/
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const all = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js')).sort();
const order = ['static', 'boot', 'dialogue', 'reception', 'checkpoint', 'main-flow', 'divergent', 'side-quests', 'sims-idle', 'movement', 'input', 'cursor', 'city', 'wildlife', 'build2-story', 'build2-factions', 'build3-combat', 'build3-dauntless', 'build3-stageone', 'build3-weeks', 'build4-city', 'build4-wait', 'physics', 'devmenu', 'menu', 'playthrough', 'audio', 'save-migration', 'npc-day', 'perf'];
all.sort((a, b) => (order.indexOf(a.replace('.test.js', '')) + 1 || 99) - (order.indexOf(b.replace('.test.js', '')) + 1 || 99));
const want = process.argv.slice(2);
const files = want.length ? all.filter((f) => want.some((w) => f.startsWith(w))) : all;

const results = [];
const t0 = Date.now();
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit', env: process.env, timeout: 15 * 60 * 1000 });
  results.push({ f, ok: r.status === 0 });
}
console.log('\n================ QA summary ================');
for (const r of results) console.log((r.ok ? '  PASS  ' : '  FAIL  ') + r.f);
const failed = results.filter((r) => !r.ok).length;
console.log('  ' + (results.length - failed) + '/' + results.length + ' passed in ' + Math.round((Date.now() - t0) / 1000) + 's');
process.exit(failed ? 1 : 0);
