// The main menu: the Y2K front end and the factions' highlights reel behind it. The menu has its
// chrome logo, gel buttons, an orb per faction and the reel's progress; the reel opens on the city
// with the Dauntless coming out onto the roofs across the street; the free-running line keeps to
// what's there (every step on a roof or an obstacle, nothing run through, everything cleared,
// three lanes that never meet) and has every move in it (vault, leap, roll, kong, climb, flip),
// and the flip turns the body right over; each faction's highlight plays in its own place, with
// its people at their routine, inside the draw-call budget; the wipe covers the screen before a
// place is swapped (and built, the first time); an orb cuts to its faction; the reel goes on by
// itself; New Game from the middle of it puts you on the rooftop for the creator, with nothing of
// the reel left behind; and quitting back to the menu starts it again. The theme song streams in
// YouTube's own player, in view, muted until the first click, with the menu's music stepping aside,
// the volume from Settings, its own music back if YouTube says no, and a fade on the way out.
const L = require('./lib.js');
L.run('main menu: the Y2K front end and the highlights reel', async (p, T, errs) => {
  const ev = (fn, a) => p.evaluate(fn, a);
  // the reel, run on faster than real time (software GL is slow)
  const spin = (secs, until) => ev(([secs, until]) => {
    let n = 0;
    while (n < secs / 0.05) { DV.Reel.update(0.05); n++; if (until && (0, eval)('(' + until + ')')()) break; }
    return DV.Reel.info();
  }, [secs, until ? until.toString() : null]);
  const settle = () => spin(30, () => !DV.Reel.trans);

  // the menu
  const ui = await ev(() => {
    const m = document.getElementById('mainmenu');
    return {
      y2k: m.classList.contains('y2k'), title: m.querySelector('.title').textContent,
      items: [...m.querySelectorAll('.mm-item')].map((e) => e.textContent),
      orbs: m.querySelectorAll('.sigils .orb').length, dots: m.querySelectorAll('.reel-dots .dot').length,
      cap: m.querySelector('.reel-cap .cap-name').textContent, capOn: m.querySelector('.reel-cap').classList.contains('show'),
      foot: m.querySelector('.foot').textContent, ticker: m.querySelector('.tk').textContent.length,
      chrome: getComputedStyle(m.querySelector('.title')).backgroundClip || getComputedStyle(m.querySelector('.title')).webkitBackgroundClip,
    };
  });
  T.ok(ui.y2k && ui.title === 'DIVERGENT' && ui.items.join('|') === 'New Game|Continue|Load Game|Settings|Credits', 'the menu: the logo and its five buttons', ui);
  T.ok(ui.chrome === 'text', 'the logo is chrome (a gradient clipped to the letters)', ui.chrome);
  T.ok(ui.orbs === 6 && ui.dots === 6 && ui.ticker > 40 && /Build 4/.test(ui.foot), 'an orb for the city and each faction, the reel\'s progress, the ticker and the version line');
  T.ok(ui.cap === 'The City' && ui.capOn, 'the reel opens on the city: "' + ui.cap + '"');

  // the theme song. Opened from disk, as here, YouTube won't play: the menu keeps its own music
  const th0 = await ev(() => ({ st: DV.MenuTheme.state(), script: !!document.getElementById('yt-api'), win: !!document.querySelector('.mm-theme') }));
  T.ok(!th0.st.on && !th0.script && !th0.win && /disk/.test(th0.st.error), 'the theme song: from disk it doesn\'t try YouTube (it needs the page served), and the menu plays its own music', th0.st);
  // served, it streams in YouTube's own player (stood in for here: no YouTube from the test machine)
  await ev(() => {
    // (as if nobody's clicked anything yet: headless Chrome counts the page as already used)
    Object.defineProperty(navigator, 'userActivation', { value: { hasBeenActive: false, isActive: false }, configurable: true });
    window.__yt = { calls: [] };
    const log = (n, a) => window.__yt.calls.push([n, a]);
    window.YT = { Player: function (slot, o) {
      const f = document.createElement('iframe'); f.width = o.width; f.height = o.height; slot.replaceWith(f);
      this.o = o; window.__yt.p = this;
      this.getVideoData = () => ({ title: 'Theme Song', author: 'Someone' });
      for (const n of ['setVolume', 'playVideo', 'unMute', 'mute', 'seekTo']) this[n] = (a) => log(n, a);
      this.destroy = () => { log('destroy'); f.remove(); };
      setTimeout(() => o.events.onReady({ target: this }), 0);
    } };
    DV.MenuTheme.start({ force: true });
  });
  await p.waitForTimeout(150);
  const th1 = await ev(() => {
    const f = document.querySelector('.mm-theme iframe'), r = f.getBoundingClientRect(), P = window.__yt.p;
    return { st: DV.MenuTheme.state(), w: r.width, h: r.height, id: P.o.videoId, vars: P.o.playerVars, title: document.querySelector('.mm-theme .mt-title').textContent, hint: getComputedStyle(document.querySelector('.mm-theme .mt-hint')).display };
  });
  T.ok(th1.id === 'RmJCKRJx9Dc' && th1.vars.autoplay === 1 && th1.vars.mute === 1 && th1.vars.loop === 1 && th1.vars.playlist === th1.id, 'served, the theme plays in YouTube\'s player: starting muted (browsers want a click first), round and round', th1.vars);
  T.ok(th1.w >= 200 && th1.h >= 200 && th1.title === 'Theme Song — Someone' && th1.hint === 'block' && th1.st.muted, 'in a Now Playing window: the player in full view (' + th1.w + '×' + th1.h + '), the song\'s title, "click anywhere for sound"', th1);
  await p.mouse.click(700, 440); // (anywhere on the menu)
  await ev(() => window.__yt.p.o.events.onStateChange({ data: 1 }));
  const th2 = await ev(() => ({ st: DV.MenuTheme.state(), unmuted: window.__yt.calls.some((c) => c[0] === 'unMute'), vol: window.__yt.calls.filter((c) => c[0] === 'setVolume').pop(), synth: DV.Audio.ready ? DV.Audio.musicKind : DV.Audio.pendingMusic, hint: getComputedStyle(document.querySelector('.mm-theme .mt-hint')).display }));
  T.ok(th2.unmuted && !th2.st.muted && th2.st.playing && th2.vol && th2.vol[1] === th2.st.volume && th2.hint === 'none', 'the first click turns it up (to ' + th2.st.volume + ', from the master and music volumes)', th2);
  T.eq(th2.synth, 'none', 'and while it plays the menu\'s own music steps aside');
  const th3 = await ev(() => { DV.Settings.set('musicVolume', 0.25); const v = window.__yt.calls.filter((c) => c[0] === 'setVolume').pop()[1]; DV.Settings.set('musicVolume', 0.5); return { v, on: !!document.querySelector('.mm-theme') }; });
  T.ok(th3.v === 28 && th3.on, 'turning the music down in Settings turns it down too (' + th3.v + '), and leaves it playing');
  // YouTube says no (an embed it won't allow, say): the menu's own music again
  const th4 = await ev(() => { window.__yt.p.o.events.onError({ data: 150 }); return { st: DV.MenuTheme.state(), win: !!document.querySelector('.mm-theme'), synth: DV.Audio.ready ? DV.Audio.musicKind : DV.Audio.pendingMusic }; });
  T.ok(!th4.win && /150/.test(th4.st.error) && th4.synth === 'menu', 'if YouTube won\'t play it, the window goes and the menu\'s own music comes back', th4);
  // the window's ✕: off (and Settings has it)
  await ev(() => DV.MenuTheme.start({ force: true }));
  await p.waitForTimeout(150);
  await p.click('.mm-theme .mt-close');
  const th5 = await ev(() => ({ setting: DV.Settings.get('menuTheme'), win: !!document.querySelector('.mm-theme'), synth: DV.Audio.ready ? DV.Audio.musicKind : DV.Audio.pendingMusic }));
  T.ok(th5.setting === false && !th5.win && th5.synth === 'menu', 'its ✕ turns the theme off (the setting goes off with it)', th5);
  await ev(() => DV.Settings.set('menuTheme', true));
  T.ok(await ev(() => !document.querySelector('.mm-theme') && DV.Settings.get('menuTheme')), 'and Settings turns it back on (here, from disk, that still means the menu\'s own music)');

  // the city, and the Dauntless coming out onto the roofs
  const city = await ev(() => ({ info: DV.Reel.info(), cam: DV.Game.camera.position.toArray() }));
  T.ok(city.info.running && city.info.zone === 'menu_bg' && city.info.actors === 3, 'over the city from the rooftop, three Dauntless on the roofs across the street', city.info);

  // the line itself
  const line = await ev(() => {
    const C = DV.MenuCourse, out = { moves: [], bad: [], lanes: [], ends: [] };
    for (let i = 0; i < 3; i++) {
      const c = C.course(i), zs = new Set();
      for (const s of c.segs) if (i === 0) out.moves.push(s.move || s.kind);
      for (let t = 0; t <= c.duration; t += 0.02) {
        const s = c.at(t), top = C.top(s.x, s.z);
        zs.add(s.z.toFixed(3));
        const ground = s.kind === 'run' || s.kind === 'slide' || s.kind === 'still';
        // on the ground: on something; in the air: never inside anything (the legs clear what's vaulted)
        if (ground && (top === null || Math.abs(s.y - top) > 0.03)) out.bad.push(['ground', i, t.toFixed(2), s.kind, s.x.toFixed(2), s.y.toFixed(2), top]);
        if (!ground && top !== null && s.y + (s.move === 'vault' || s.move === 'kong' ? 0.55 : 0.02) < top) out.bad.push(['inside', i, t.toFixed(2), s.move, s.x.toFixed(2), s.y.toFixed(2), top]);
      }
      out.lanes.push(zs.size);
      const e = c.at(c.duration);
      out.ends.push([e.x, e.y, C.top(e.x, e.z), e.action]);
    }
    return out;
  });
  T.ok(['vault', 'leap', 'roll', 'kong', 'land', 'climb', 'flip'].every((m) => line.moves.includes(m)), 'the line: ' + line.moves.join(' → '));
  T.ok(line.bad.length === 0, 'every step is on a roof or an obstacle, and nothing is run through (sampled every 20 ms, three runners)', line.bad.slice(0, 6));
  T.ok(line.lanes.every((n) => n === 1), 'each keeps to a lane of their own: they never run through each other');
  T.ok(line.ends.every(([x, y, top, a]) => x > 71.5 && Math.abs(y - top) < 0.01 && a === 'cheer'), 'all three finish on the last roof, cheering', line.ends);
  // the flip turns the body over; the roll too; the kong pitches it forward
  const tumble = await ev(() => {
    const m = DV.Character.create(DV.Character.fromFaction('dauntless', 'm', 'qa-runner'));
    const r = DV.Freerun.runner(m, DV.MenuCourse.course(0));
    const c = r.course, find = (mv) => c.segs.find((s) => s.move === mv);
    const peak = (mv) => { const s = find(mv); let best = 0, air = true; for (let t = 0; t < c.duration; t += 1 / 60) { r.update(t, 1 / 60); if (t > s.t0 && t < s.t0 + s.dur) { best = Math.max(best, Math.abs(m.mesh.rotation.x)); if (mv === 'flip' && t > s.t0 + 0.1 && t < s.t0 + s.dur - 0.1 && m.shadow.visible) air = false; } } return { best, air }; };
    const out = { flip: peak('flip'), roll: peak('roll'), kong: peak('kong') };
    r.update(c.duration, 1 / 60);
    for (let k = 0; k < 30; k++) r.update(c.duration, 1 / 60);
    out.after = m.mesh.rotation.x;
    const finite = m.bones.every((b) => isFinite(b.rotation.x) && isFinite(b.rotation.y) && isFinite(b.rotation.z));
    m.dispose();
    return Object.assign(out, { finite });
  });
  T.ok(tumble.flip.best > 3.0 && tumble.roll.best > 3.0, 'the flip and the roll turn the body right over (' + tumble.flip.best.toFixed(2) + ', ' + tumble.roll.best.toFixed(2) + ' rad)');
  T.ok(tumble.kong.best > 0.35 && tumble.kong.best < 1, 'the kong pitches it forward over the vent (' + tumble.kong.best.toFixed(2) + ')');
  T.ok(tumble.flip.air && Math.abs(tumble.after) < 0.01 && tumble.finite, 'no shadow under them in the air; upright again after; every bone sane');
  // the routines the highlights use
  const acts = await ev(() => {
    const m = DV.Character.create(DV.Character.fromFaction('amity', 'f', 'qa-acts'));
    const bad = [];
    for (const a of ['give', 'carry', 'pick', 'strum', 'sit_strum', 'argue', 'dance', 'shelve', 'sweep', 'read']) {
      for (let k = 0; k < 40; k++) m.animate(1 / 30, { action: a, speed: a === 'carry' || a === 'read' ? (k % 2) * 1.2 : 0, seatY: 0.4 });
      if (!m.bones.every((b) => isFinite(b.rotation.x) && isFinite(b.rotation.z))) bad.push(a);
    }
    m.dispose();
    return bad;
  });
  T.ok(acts.length === 0, 'the routines (handing out, carrying, picking, playing, arguing, dancing, shelving) all animate', acts);

  // each faction's highlight
  const budget = 230;
  for (const [id, zone, minActors] of [['dauntless', 'menu_bg', 3], ['abnegation', 'abn_street', 9], ['erudite', 'eru_hall', 12], ['candor', 'cand_lobby', 11], ['amity', 'amity_farm', 8]]) {
    const built = await ev((z) => !!DV.World.zones[z], zone);
    T.ok(await ev((id) => DV.Reel.jump(id), id), 'cut to ' + id);
    // the wipe covers the screen before the place changes (and before it's built)
    const cover = await ev(() => {
      let n = 0, seen = null;
      while (n++ < 400 && DV.Reel.trans && DV.Reel.trans.phase === 'cover') DV.Reel.update(0.02);
      const tr = DV.Reel.trans;
      if (tr) {
        const bands = [...document.querySelectorAll('#mainmenu .reel-wipe .band')].map((b) => parseFloat(/translateX\(([-\d.]+)vw/.exec(b.style.transform)[1]));
        seen = { phase: tr.phase, bands, zone: DV.World.current.id, loading: getComputedStyle(document.querySelector('#mainmenu .reel-wipe .loading')).display };
      }
      return seen;
    });
    T.ok(cover && cover.bands.every((x) => Math.abs(x) < 1), id + ': the wipe covers the screen before the cut (' + (cover ? cover.zone : '?') + ' still behind it)', cover);
    if (!built) T.ok(cover && cover.phase === 'load' && cover.loading === 'block', id + ': not built yet, so it says LOADING and builds behind the wipe', cover);
    const s = await settle();
    const seg = await ev(() => {
      DV.Reel.update(0.05);
      const r = DV.Reel.info(), cam = DV.Game.camera, z = DV.World.current, b = z.def.bounds;
      DV.World.update(0.016, cam);
      DV.Game.renderer.render(DV.Game.scene, cam);
      const inScene = DV.Reel.actors.filter((a) => a.m.root.parent === DV.Game.scene).length;
      return {
        r, calls: DV.Game.renderer.info.render.calls, inScene,
        camIn: cam.position.x > b.x0 - 90 && cam.position.x < b.x1 + 90 && cam.position.z > b.z0 - 90 && cam.position.z < b.z1 + 90,
        cap: document.querySelector('#mainmenu .reel-cap .cap-name').textContent,
        orb: (document.querySelector('#mainmenu .orb.on') || { dataset: {} }).dataset.f,
        acts: [...new Set(DV.Reel.actors.map((a) => a.action))].join(' '),
      };
    });
    T.ok(seg.r.id === id && seg.r.zone === zone && !seg.r.wiping, id + ': in ' + zone, s);
    T.ok(seg.inScene >= minActors, id + ': ' + seg.inScene + ' people at it (' + seg.acts + ')');
    T.ok(seg.calls < budget, id + ': ' + seg.calls + ' draw calls');
    T.ok(seg.cap.toLowerCase() === id && seg.orb === id && seg.camIn, id + ': the caption and the orb say so, and the camera\'s in the place', seg);
  }
  // an orb, clicked
  await p.click('#mainmenu .orb[data-f="candor"]');
  T.ok(await ev(() => !!DV.Reel.trans && DV.Reel.trans.to === DV.Reel.SEGMENTS.findIndex((s) => s.id === 'candor')), 'clicking Candor\'s orb cuts to Candor');
  await settle();
  // and on by itself, round to the start
  const next = await ev(() => { DV.Reel.t = DV.Reel.SEGMENTS[DV.Reel.i].dur - 0.1; return DV.Reel.info().id; });
  const after = await spin(30, () => DV.Reel.info().id !== 'candor' && !DV.Reel.trans);
  T.ok(next === 'candor' && after.id === 'amity', 'when a highlight ends the reel goes on to the next by itself (' + next + ' → ' + after.id + ')');
  const wrap = await ev(() => { DV.Reel.t = DV.Reel.SEGMENTS[DV.Reel.i].dur - 0.1; return 1; }).then(() => spin(30, () => DV.Reel.info().id !== 'amity' && !DV.Reel.trans));
  T.ok(wrap.id === 'city' && wrap.zone === 'menu_bg', 'and after Amity, back to the city');

  // New Game from the middle of it, away from the rooftop
  await ev(() => DV.Reel.jump('erudite'));
  await settle();
  await ev(() => { window.__yt.calls = []; DV.MenuTheme.start({ force: true }); });
  await p.waitForTimeout(150);
  await ev(() => { DV.MenuTheme.unmute(); window.__yt.p.o.events.onStateChange({ data: 1 }); });
  const roots = await ev(() => { window.__reelRoots = DV.Reel.actors.map((a) => a.m.root); return window.__reelRoots.length; });
  await p.click('#mainmenu .mm-item:has-text("New Game")');
  await p.waitForTimeout(400);
  const ng = await ev(() => ({ state: DV.Game.state, zone: DV.World.current.id, running: DV.Reel.running, left: window.__reelRoots.filter((r) => r.parent).length, wipe: !!document.querySelector('#mainmenu') }));
  T.ok(ng.state === 'creator' && ng.zone === 'menu_bg' && !ng.running, 'New Game from the reading hall: the creator, on the rooftop', ng);
  T.ok(roots > 0 && ng.left === 0 && !ng.wipe, 'and nothing of the reel left behind (' + roots + ' people gone, the menu gone)');
  await p.waitForTimeout(1500);
  const fade = await ev(() => ({ vols: window.__yt.calls.filter((c) => c[0] === 'setVolume').map((c) => c[1]), destroyed: window.__yt.calls.some((c) => c[0] === 'destroy'), win: !!document.querySelector('.mm-theme') }));
  T.ok(fade.vols.length > 3 && fade.vols[fade.vols.length - 1] < fade.vols[0] && fade.destroyed && !fade.win, 'the theme fades out as the menu goes, and its player is gone', fade.vols.join(' '));
  // back to the menu: the reel starts again
  await ev(() => { DV.Creator.close(); DV.Game.showMainMenu(); });
  await p.waitForTimeout(300);
  const back = await ev(() => DV.Reel.info());
  T.ok(back.running && back.id === 'city' && back.zone === 'menu_bg' && back.actors === 3, 'back to the main menu: the reel starts over, on the city', back);
  T.noErrors(errs);
});
