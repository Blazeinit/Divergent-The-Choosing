// The city's people and their days (js/game/lives.js): a few hundred residents with homes in their own
// sectors and jobs; a day fast-forwarded in the street: out of the door in the morning, at work at noon,
// lunch, the evening, home before the curfew (the Dauntless excepted); a routine that goes places; the
// Circle Line for the long trips; nobody standing in a building or in the road, no NaN; a fight draws a
// crowd (people out of the shops too); a siren hurries them; they talk, and remember being knocked down
// and being helped; the draw calls stay in budget.
const L = require('./lib.js');
L.run('the city\'s people: homes, work and a day by the clock', async (p, T, errs) => {
  const ev = (fn, a) => p.evaluate(fn, a);
  await L.quickStart(p);
  await L.b3(p);
  // a pavement point near (x, z)
  await ev(() => {
    window.LV = {
      lv: () => DV.World.current.lives,
      pave(x, z) {
        const W = DV.World.current.streetLife.walk; let best = null, bd = 1e9;
        for (const e of W.edgesNear(x, z, 50)) { if (W.edges[e].cross) continue; const E = W.edges[e], A = W.nodes[E.a], B = W.nodes[E.b]; const q = [(A.x + B.x) / 2, (A.z + B.z) / 2]; const d = Math.hypot(q[0] - x, q[1] - z); if (d < bd) { bd = d; best = q; } }
        return best;
      },
      // everyone drawn, and everyone out of doors anywhere: in a building, in the road, NaN?
      check() {
        const lv = LV.lv(), zone = DV.World.current, kit = lv.kit, bad = [];
        for (const a of lv.agents.values()) {
          if (!isFinite(a.x) || !isFinite(a.z) || !isFinite(a.rot)) { bad.push([a.id, 'NaN']); continue; }
          if (a.react && a.react.phase !== 'watch') continue;
          const sitting = a.seg && a.seg.k === 'at' && a.seg.act === 'sit';
          let crossing = false;
          if (a.seg && a.seg.k === 'walk' && !a.react) { const q = lv.pathAt(a.seg.path, a.s), sg = a.seg.path.segs[q.i]; crossing = !!(sg && sg.cross); }
          if (kit.built(a.x, a.z, 0.05)) bad.push([a.id, 'in a building', +a.x.toFixed(1), +a.z.toFixed(1)]);
          else if (!sitting && zone.colliders.blocked(a.x, a.z, 0.1, 'npc')) bad.push([a.id, 'in something solid', +a.x.toFixed(1), +a.z.toFixed(1), a.seg.k, a.seg.act]);
          if (!crossing && lv.onRoad(a.x, a.z, -0.3)) bad.push([a.id, 'in the road', +a.x.toFixed(1), +a.z.toFixed(1)]);
        }
        for (const q of lv.pop) {
          const w = lv.where(q);
          if (!w) { bad.push([q.id, 'no plan']); continue; }
          if (!isFinite(w.x) || !isFinite(w.z)) bad.push([q.id, 'NaN (timetable)', w.seg.k]);
          else if (w.vis && w.seg.k === 'at' && (kit.built(w.x, w.z, 0.05) || lv.onRoad(w.x, w.z, -0.3))) bad.push([q.id, 'stands in a building or the road', w.place.id]);
        }
        return { drawn: lv.agents.size, bad };
      },
    };
  });
  // ---- who lives here ----
  const pop = await ev(() => {
    const lv = LV.lv(), CM = DV.CityMap, byF = {}, jobs = {};
    let ownSector = 0, housed = 0;
    for (const q of lv.pop) {
      byF[q.f] = (byF[q.f] || 0) + 1;
      jobs[q.job.kind] = (jobs[q.job.kind] || 0) + 1;
      if (q.f === 'amity') continue;
      housed++;
      const sec = CM.districts.find((d) => d.faction === q.f);
      if (sec && q.home.front && q.home.front.d === sec.id) ownSector++;
    }
    return { n: lv.pop.length, byF, jobs, ownSector, housed, info: lv.info() };
  });
  T.ok(pop.n >= 250 && Object.keys(pop.byF).length === 6, pop.n + ' residents, from all six factions: ' + JSON.stringify(pop.byF));
  T.ok(pop.ownSector === pop.housed, 'every one of the ' + pop.housed + ' city households has its front door in its own faction\'s sector (the Amity come in from the farms)');
  T.ok(pop.info.venues >= 20 && pop.info.seats >= 60 && pop.info.stations >= 5, 'places to be: ' + pop.info.fronts + ' doors, ' + pop.info.venues + ' stalls, bread lines, fires and corners, ' + pop.info.seats + ' bench seats, ' + pop.info.stations + ' station entrances');
  T.log('jobs', JSON.stringify(pop.jobs));

  // ---- the day, from the timetable ----
  const day = await ev(() => {
    const lv = LV.lv(), d = DV.Clock.day(), at = (h, q) => lv.where(q, d, h * 60);
    let left = 0, home0 = 0, workers = 0, atWork = 0, outLate = [], dauntOut = 0, dauntAll = 0, metroLegs = 0, nightHome = 0;
    for (const q of lv.pop) {
      const early = at(5.5, q), ten = at(10, q), noon = at(12, q), nine = at(21, q), night = at(1.5 + 24, q);
      if (early.tag === 'home') home0++;
      if (early.tag === 'home' && ten.tag !== 'home') left++;
      if (q.job.kind !== 'none') { workers++; if (noon.tag === 'work') atWork++; }
      if (q.f !== 'dauntless' && nine.tag !== 'home') outLate.push(q.id + ':' + nine.tag);
      if (q.f === 'dauntless') { dauntAll++; if (at(21.5, q).tag !== 'home') dauntOut++; }
      if (night.tag === 'home') nightHome++;
      metroLegs += q.plans[d].filter((s) => s.k === 'metro').length;
    }
    // a sample routine: an office worker's day, place by place
    const s = lv.pop.find((q) => q.job.kind === 'office' && q.plans[d].some((x) => x.tag === 'lunch')) || lv.pop.find((q) => q.job.kind === 'office');
    const places = new Set(s.plans[d].filter((x) => x.k === 'at').map((x) => x.place.id));
    const routine = s.plans[d].filter((x) => x.k !== 'at' || x.t1 - x.t0 > 3).map((x) => DV.U.formatTime(x.t0 % 1440) + ' ' + (x.k === 'at' ? x.tag + ' at ' + x.place.name : x.k === 'metro' ? 'the Circle Line, ' + x.from.name + ' to ' + x.to.name : 'walking to ' + x.to.name));
    let many = 0; for (const q of lv.pop) if (new Set(q.plans[d].filter((x) => x.k === 'at').map((x) => x.place.id)).size >= 3) many++;
    return { n: lv.pop.length, left, home0, workers, atWork, outLate, dauntOut, dauntAll, metroLegs, nightHome, name: s.name, job: s.job.kind, places: places.size, routine, many };
  });
  T.ok(day.home0 === day.n, 'at half past five, all ' + day.n + ' are at home');
  T.ok(day.left >= day.n * 0.85, 'by ten in the morning ' + day.left + ' of them have left home');
  T.ok(day.atWork >= day.workers * 0.75, 'at noon, ' + day.atWork + ' of the ' + day.workers + ' with a job are at work');
  T.ok(day.outLate.length === 0, 'at the nine o\'clock curfew, everyone but the Dauntless is home', day.outLate.slice(0, 8));
  T.ok(day.dauntOut >= 5, 'the Dauntless keep their own hours: ' + day.dauntOut + ' of ' + day.dauntAll + ' still out at half past nine');
  T.ok(day.nightHome >= day.n * 0.97, 'at half past one in the morning ' + day.nightHome + ' of ' + day.n + ' are in bed');
  T.ok(day.places >= 3, day.name + ' (' + day.job + ') goes to ' + day.places + ' places in a day; ' + day.many + ' of everyone go to three or more');
  T.log(day.routine.join(' · '));
  T.ok(day.metroLegs >= 5, day.metroLegs + ' trips by the Circle Line today (the long ones)');

  // ---- the day, in the street: the Erudite sector by Wells station, fast-forwarded half an hour at a time ----
  const spot = await ev(() => LV.pave(244, 262)), downtown = await ev(() => LV.pave(98, 352));
  await ev(([x, z]) => { DV.Clock.skipTo(5 * 60 + 30); QA.tp(x, z, 0); QA.step(1); }, spot);
  let bad = [], maxDrawn = 0, outOfDoor = 0, sawWork = 0, sawCommute = 0, sawSocial = 0, sawHomeward = 0;
  for (let h = 6; h <= 22; h += 0.5) {
    const r = await ev(([h, x, z]) => {
      DV.State.data.world.time = h * 60;
      QA.tp(x, z, (h * 1.3) % 6.28);
      QA.step(2.5);
      const lv = LV.lv(), c = LV.check(), tags = {};
      let doors = 0;
      for (const a of lv.agents.values()) { tags[a.seg.tag] = (tags[a.seg.tag] || 0) + 1; if (a.seg.k === 'walk' && a.seg.from.indoor && a.s < 6) doors++; }
      return { c, tags, doors };
    }, [h, spot[0], spot[1]]);
    bad = bad.concat(r.c.bad.map((b) => [h].concat(b)));
    maxDrawn = Math.max(maxDrawn, r.c.drawn);
    outOfDoor += r.doors;
    if (r.tags.work) sawWork++;
    if (r.tags.commute) sawCommute++;
    if (r.tags.social) sawSocial++;
    if (r.tags.homeward) sawHomeward++;
  }
  T.ok(maxDrawn >= 8 && maxDrawn <= 22, 'by Wells through the day: up to ' + maxDrawn + ' of them drawn near you at once');
  T.ok(sawCommute >= 3 && sawWork >= 1 && sawSocial >= 2 && sawHomeward >= 2, 'seen in the street on their way to work (' + sawCommute + '), at work (' + sawWork + '), out in the evening (' + sawSocial + '), going home (' + sawHomeward + ') — ' + outOfDoor + ' just out of a door');
  T.ok(!bad.length, 'nobody stands in a building or in the road, nobody NaN, all day', bad.slice(0, 8));
  // across the city, by day and evening
  bad = [];
  for (const [x, z, h] of [[-318, -54, 8.25], [-128, 290, 12.75], [280, 290, 18.25], [330, -124, 20], [-300, 352, 19]]) {
    const r = await ev(([x, z, h]) => { const q = LV.pave(x, z); DV.State.data.world.time = h * 60; QA.tp(q[0], q[1], 0); QA.step(3); return LV.check(); }, [x, z, h]);
    bad = bad.concat(r.bad);
  }
  T.ok(!bad.length, 'in five sectors too', bad.slice(0, 8));

  // ---- the time-lapse (T) in the street: everyone where they should be after it ----
  const lapse = await ev(([x, z]) => { DV.State.data.world.time = 7.5 * 60; QA.tp(x, z, 0); QA.step(1); return DV.Wait.start(60); }, spot);
  await L.until(p, () => !DV.Wait.running && DV.Game.state === 'playing', 30000, 0.25);
  const after = await ev(() => { QA.step(1); const lv = LV.lv(); let off = 0; for (const a of lv.agents.values()) { const w = lv.where(a.p); if (w && w.vis && Math.hypot(w.x - a.x, w.z - a.z) > 45) off++; } return { t: DV.Clock.str(), drawn: lv.agents.size, off, c: LV.check() }; });
  T.ok(lapse && after.t >= '08:29' && after.off === 0 && !after.c.bad.length, 'an hour\'s wait in the street (to ' + after.t + '): ' + after.drawn + ' people drawn, every one where the timetable has them', after);

  // ---- the draw calls, at the busiest hour downtown ----
  const calls = await ev(([x, z]) => new Promise((res) => { DV.State.data.world.time = 8.5 * 60; QA.tp(x, z, 0.4); QA.step(2); setTimeout(() => { const i = DV.Game.renderer.info.render; res({ calls: i.calls, drawn: LV.lv().agents.size, peds: DV.World.current.streetLife.peds.length }); }, 1500); }), downtown);
  T.ok(calls.calls < 230, 'downtown at half past eight: ' + calls.calls + ' draw calls (' + calls.drawn + ' residents and ' + calls.peds + ' passers-by drawn)');

  // ---- a fight draws a crowd ----
  const crowd = await ev(() => {
    DV.State.data.world.time = 15 * 60;
    // (the busiest bit of pavement at three in the afternoon, by the timetable)
    const lv = LV.lv(), d = DV.Clock.day(), ws = lv.pop.map((q) => lv.where(q, d, 15 * 60)).filter((w) => w.place ? w.place.edge >= 0 && !w.place.away : w.vis);
    let best = null, bn = -1;
    for (const f of lv.fronts) { if (f.d !== 'downtown' && f.d !== 'testing') continue; let n = 0; for (const w of ws) if (Math.abs(w.x - f.lx) < 50 && Math.abs(w.z - f.lz) < 50) n++; if (n > bn) { bn = n; best = f; } }
    const x = best.lx, z = best.lz;
    QA.tp(x + best.ux * 6, z + best.uz * 6, 0); QA.step(3);
    const e = lv.event('fight', x + 0.3, z + 0.3, { secs: 40 });
    QA.step(34);
    let watching = 0, out = 0;
    for (const a of lv.agents.values()) if (a.react && a.react.ev === e && a.react.phase === 'watch' && Math.hypot(a.x - e.x, a.z - e.z) < 6) { watching++; if (a.outOfDoors) out++; }
    const c = LV.check();
    QA.step(10);
    let still = 0; for (const a of lv.agents.values()) if (a.react) still++;
    QA.step(80);
    let back = 0; for (const a of lv.agents.values()) if (a.react) back++;
    const staring = DV.World.current.streetLife.peds.filter((q) => q.gawk && q.gawk.until > lv.t).length;
    return { at: best.street, joined: e.n, watching, out, staring, bad: c.bad, still, back };
  });
  T.ok(crowd.watching >= 3 && crowd.watching + crowd.staring >= 5, 'a fight on ' + crowd.at + ': ' + crowd.watching + ' residents gather round to watch (' + crowd.out + ' out of the shops and offices by it), ' + crowd.staring + ' passers-by stop and stare', crowd);
  T.ok(crowd.back === 0 && !crowd.bad.length, 'and once it\'s over they go back to what they were doing', crowd);

  // ---- a siren hurries them ----
  const siren = await ev(([x, z]) => { DV.State.data.world.time = 18.25 * 60; QA.tp(x, z, 0); QA.step(3); const lv = LV.lv(); DV.Events.emit('city:siren', { curfew: true }); let h = 0; for (const a of lv.agents.values()) if (a.hurry > 0) h++; return { h, n: lv.agents.size }; }, spot);
  T.ok(siren.n > 0 && siren.h === siren.n, 'the siren: all ' + siren.h + ' of them hurry');

  // ---- you: a word, a shove (remembered), a hand with a crate (remembered) ----
  const you = await ev(() => {
    const lv = LV.lv();
    const a = [...lv.agents.values()].find((q) => !q.react && q.seg.k === 'walk') || [...lv.agents.values()][0];
    a.it.onUse();
    const said = a.bark && a.bark.text;
    const rep0 = DV.Reputation.get(a.f);
    // knock into them, running
    DV.Player.place(a.x + 0.3, a.z, 0); DV.Player.vx = 5; DV.Player.vz = 0;
    lv.mindYou(a, 0.05, performance.now());
    const M = lv.mem(a.p);
    const cold = lv.greeting(a);
    return { name: a.name, said, hurt: M.hurt, rel: M.rel, rep: DV.Reputation.get(a.f) - rep0, cold, coldList: [] };
  });
  T.ok(you.said && you.hurt === 1 && you.rel < 0 && you.rep < 0, 'talk to ' + you.name + ': "' + you.said + '"; knock them over running and they remember it (rel ' + you.rel + ', faction ' + you.rep + '): "' + you.cold + '"');
  const help = await ev(() => {
    const lv = LV.lv(), d = DV.Clock.day();
    for (const q of lv.pop) {
      if (q.job.kind !== 'haul') continue;
      const s = q.plans[d].find((x) => x.k === 'walk' && x.act === 'carry' && x.t1 - x.t0 > 3 && x.t0 > 600);
      if (!s) continue;
      s.path = s.path || lv.route(s.from, s.to);
      if (!s.path.ok) continue;
      DV.State.data.world.time = (s.t0 + s.t1) / 2;
      const pt = lv.pathAt(s.path, s.path.L / 2);
      QA.tp(pt.x + 2.5, pt.z + 2.5, 0); QA.step(1.5);
      const a = lv.agents.get(q.id);
      if (!a || !lv.canHelp(a)) continue;
      const rep0 = DV.Reputation.get(q.f), label = a.it.label;
      a.it.onUse();
      const M = lv.mem(q);
      return { name: q.name, label, said: a.bark && a.bark.text, helped: M.helped, rel: M.rel, rep: DV.Reputation.get(q.f) - rep0, warm: lv.greeting(a) };
    }
    return null;
  });
  T.ok(help && help.label === 'Help carry' && help.helped === 1 && help.rel > 0 && help.rep > 0, help ? 'help ' + help.name + ' carry a crate ("' + help.said + '"): remembered (rel ' + help.rel + ', faction +' + help.rep + '): "' + help.warm + '"' : 'no one carrying anything found', help);
  // and it's all kept in the save
  T.ok(await ev(() => !!DV.State.data.world.lives && Object.keys(DV.State.data.world.lives.mem).length >= 2 && JSON.parse(JSON.stringify(DV.State.data)).world.lives.mem), 'what they remember of you is in the save');

  // ---- rain sends them in ----
  const rain = await ev(([x, z]) => {
    DV.Weather.force(0.9);
    DV.State.data.world.time = 8.4 * 60; QA.tp(x, z, 0); QA.step(3);
    const lv = LV.lv(), z0 = DV.World.current.weather;
    let fast = 0, walk = 0;
    for (const a of lv.agents.values()) if (a.seg.k === 'walk' && !a.react) { walk++; const v0 = Math.hypot(a.vx, a.vz); if (v0 > 1.3) fast++; }
    const vis = z0 && z0.lines.visible;
    DV.Weather.force(null);
    // and the plans keep people off the benches when it's due to rain
    let benchInRain = 0;
    for (let dd = 2; dd < 12; dd++) for (const q of lv.pop.slice(0, 120)) for (const s of lv.planDay(q, dd)) if (s.k === 'at' && s.place.kind === 'bench' && DV.Weather.at(dd, s.t0) > 0.3) benchInRain++;
    return { vis, walk, fast, benchInRain };
  }, spot);
  T.ok(rain.vis && rain.walk > 0 && rain.fast >= rain.walk * 0.5 && rain.benchInRain === 0, 'rain: it\'s drawn, ' + rain.fast + ' of ' + rain.walk + ' walkers hurrying, and nobody planned onto a bench in a shower', rain);

  // ---- nothing of them from inside the Testing Center (and no more draw calls in the lobby) ----
  const inside = await ev(() => new Promise((res) => { DV.State.data.world.time = 12 * 60; DV.Player.place(40, 57, Math.PI); DV.Game.rig.yaw = Math.PI; QA.step(1); setTimeout(() => { const lv = LV.lv(); res({ shown: lv.shown, vis: [...lv.agents.values()].filter((a) => a.model.root.visible).length, calls: DV.Game.renderer.info.render.calls }); }, 1500); }));
  T.ok(!inside.shown && inside.vis === 0 && inside.calls < 230, 'none of them drawn from the Testing Center\'s lobby (' + inside.calls + ' draw calls there)');
  T.noErrors(errs);
});
