/* ==========================================================================
   DIVERGENT — Stage Two: the fear engine
   Every fear simulation runs on the same heart. The serum finds the fear;
   the technician watches one number: your pulse. It climbs with whatever
   the simulation does to you and comes down when you slow your breathing
   (hold Space, standing still), and Composure and Resolve help. Calm under
   the threat is one way out. Doing the thing the fear says you can't is
   another. A Divergent mind (or a very stubborn one) may notice that none
   of it is real, and bend it, and that is what the leaders watch for.

     DV.Fear.define(id, mod)    a fear: { title, zone, intro, start(Ch, zone), update(Ch, dt) → fear 0..2.4,
                                  threatened(Ch), hint(Ch), bend(Ch), calm?: false, end?(Ch) }
     DV.Fear.run(o)             a run of fears: { kind: 'session' | 'final' | 'single', session, queue: [ids] }
                                  (js/zones/fearscape.js plays it as the chapter 'fear_land')
     DV.Fear.begin(Ch, o)       the heart monitor, the music, the look of the simulation
     DV.Fear.heart(Ch, dt, f, o) the pulse this frame → null | 'calm' | 'aware' | 'blackout'
     DV.Fear.stop(Ch)           the monitor away, the picture back to normal
     DV.Fear.points(r)          what a fear is worth on the board: time, and how you got out
     DV.Fear.own()              the fear that's yours, read off your aptitude test

   Saved in DV.State.data.story.stage2 (made on first use, so older saves load as they were).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // how you got out, and what the board thinks of it
  const METHODS = {
    calm: { label: 'Slowed your heart', k: 1.0 },
    faced: { label: 'Faced it', k: 1.1 },
    hidden: { label: 'Hid until it passed', k: 0.9 },
    refused: { label: 'Refused', k: 1.15 },
    defied: { label: 'Defied the voice', k: 1.1 },
    aware: { label: 'Saw through it', k: 1.25 },
    shot: { label: 'Did as you were told', k: 0.55 },
    blackout: { label: 'Blacked out', k: 0.3 },
  };
  // the fears a Dauntless class meets, and what the board calls them
  const NAMES = {
    tank: 'Drowning', beam: 'Falling', crows: 'The crows', box: 'The box', fire: 'Fire', family: 'Your family', own: 'Your own fear',
  };

  const blank = () => ({ sessions: {}, results: [], run: null, final: null, job: null, ctf: null, legacy: false, board: null, notes: {} });

  const F = {
    METHODS, NAMES,
    modules: {},
    define(id, mod) { mod.id = id; this.modules[id] = mod; return mod; },
    get(id) { return this.modules[id] || null; },

    st() {
      const s = DV.State.data.story || (DV.State.data.story = {});
      if (!s.stage2) s.stage2 = blank();
      return s.stage2;
    },
    blank,

    /* ------------------------------ the run ------------------------------ */
    // start a run of fears: the chapter takes the first one, and each fear hands on to the next
    run(o) {
      const st = this.st();
      st.run = { kind: o.kind || 'single', session: o.session || 0, queue: o.queue.slice(), i: 0, results: [], fast: !!o.fast };
      const go = () => DV.Chapter.start('fear_land', { instant: true, noFadeIn: true, noTitle: true });
      if (o.instant) { go(); return; }
      DV.Game.state = 'transition';
      DV.Input.clearMovement();
      DV.UI.fade(1, 1400, true).then(go);
    },
    current() { const r = this.st().run; return r && r.queue[r.i] ? r.queue[r.i] : null; },
    // one fear is over: the next, or back to the compound
    next(res) {
      const st = this.st(), r = st.run;
      if (!r) return;
      r.results.push(res);
      st.results.push(Object.assign({ day: DV.Clock.day(), kind: r.kind, session: r.session }, res));
      r.i++;
      if (r.i < r.queue.length) {
        DV.UI.fade(1, 900, true).then(() => DV.Chapter.start('fear_land', { instant: true, noFadeIn: true, noTitle: true }));
        return;
      }
      DV.UI.fade(1, 1800, true).then(() => {
        const done = st.run;
        st.run = null;
        if (DV.StageTwo && DV.StageTwo.afterRun) DV.StageTwo.afterRun(done);
        else DV.District.enter('dauntless', {});
      });
    },

    /* ------------------------------ the monitor ------------------------------ */
    monitor(parent) {
      const h = U.el('div', 'fear-hud', '<div class="fm"><div class="bpm"><span>72</span> BPM</div><canvas width="180" height="40"></canvas><div class="lbl">Heart rate</div>' +
        '<div class="panic"><div class="pl">Panic</div><div class="pb"><i></i></div></div></div><div class="fear-title"></div><div class="fear-hint"></div><div class="fear-aware hidden"></div><div class="fear-edge"></div>', parent || DV.UI.root);
      const cv = h.querySelector('canvas'), g = cv.getContext('2d');
      const pts = new Array(90).fill(20);
      let ph = 0;
      const bar = h.querySelector('.panic i'), edge = h.querySelector('.fear-edge');
      return {
        el: h,
        set(bpm, dt, panic) {
          h.querySelector('.bpm span').textContent = Math.round(bpm);
          h.classList.toggle('high', bpm > 140);
          ph += dt * bpm / 60;
          const f = ph % 1;
          const y = f < 0.08 ? 20 - Math.sin(f / 0.08 * Math.PI) * 16 : f < 0.14 ? 20 + Math.sin((f - 0.08) / 0.06 * Math.PI) * 6 : 20;
          pts.push(y); pts.shift();
          g.clearRect(0, 0, 180, 40);
          g.strokeStyle = bpm > 140 ? '#ff6a4a' : '#7fe08a'; g.lineWidth = 1.5;
          g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(i * 2, v) : g.moveTo(0, v))); g.stroke();
          if (panic !== undefined) {
            bar.style.width = Math.round(panic * 100) + '%';
            bar.style.background = panic > 0.75 ? '#e0503a' : panic > 0.45 ? '#d8a040' : '#7fc08a';
            // the edges of the picture pulse with the beat when it's bad
            edge.style.opacity = (panic > 0.5 ? (panic - 0.5) * 1.6 * (f < 0.18 ? 1 : 0.55) : 0).toFixed(3);
          }
        },
        hint(t) { const e = h.querySelector('.fear-hint'); if (e.textContent !== t) e.textContent = t || ''; },
        title(t) { const e = h.querySelector('.fear-title'); e.textContent = t || ''; e.classList.remove('on'); void e.offsetWidth; if (t) e.classList.add('on'); },
        aware(on, text) { const e = h.querySelector('.fear-aware'); if (text) e.textContent = text; e.classList.toggle('hidden', !on); },
        remove() { h.remove(); },
      };
    },

    /* ------------------------------ the heart ------------------------------ */
    // o: { hr (to start from), music, canAware }
    begin(Ch, o) {
      o = o || {};
      Ch.hr = o.hr || 96; Ch.t = 0; Ch.calmT = 0; Ch.overT = 0; Ch.done = false; Ch.aware = false; Ch.beatT = 0; Ch.awareOffered = false; Ch.panic = 0;
      if (Ch.mon) Ch.mon.remove();
      Ch.mon = this.monitor(null);
      DV.UI.root.classList.add('fearing');
      DV.UI.simMode(true);
      DV.Audio.setMusic(o.music || 'fear');
      const div = !!DV.State.data.aptitude.divergent;
      Ch.canAware = o.canAware !== undefined ? o.canAware : div || DV.Stats.attr('resolve') >= 9;
    },
    // fear: how bad it is right now (0 nothing, ~1 frightening, 2+ unbearable)
    // o: { threatened, calm: false (calm isn't a way out of this one), breath: false (no breathing it away),
    //      harder (a multiplier), awareAfter (seconds), blackoutAfter (seconds pinned at the top) }
    heart(Ch, dt, fear, o) {
      o = o || {};
      const P = DV.Player, input = DV.Input;
      Ch.t += dt;
      const breathing = o.breath !== false && input.down('Space') && P.speed < 0.3;
      Ch.breathing = breathing;
      const comp = DV.Stats.skill('composure'), res = DV.Stats.attr('resolve');
      const target = 72 + fear * 70 * U.clamp(1.25 - comp / 160 - res * 0.03, 0.55, 1.2) * (o.harder || 1);
      if (breathing) Ch.hr -= (10 + res * 1.2) * dt;
      Ch.hr += (target - Ch.hr) * dt * (breathing ? 0.12 : 0.5);
      Ch.hr = U.clamp(Ch.hr, 60, 190);
      Ch.panic = U.clamp((Ch.hr - 70) / 110, 0, 1);
      Ch.mon.set(Ch.hr, dt, Ch.panic);
      Ch.beatT -= dt;
      if (Ch.beatT <= 0) { Ch.beatT = 60 / Ch.hr; DV.Audio.play('heartbeat', { volume: U.clamp((Ch.hr - 60) / 100, 0.15, 0.8) }); }
      DV.UI.setFear(o.vignette !== undefined ? o.vignette : U.clamp((Ch.hr - 80) / 120, 0, 0.75));
      this.look(Ch.panic);
      if (Ch.panic > 0.88 && DV.Game.rig.shake < 0.05) DV.Game.rig.shake = 0.08;
      if (breathing && Math.random() < dt * 0.3) DV.Stats.practice('composure', 0.2);
      // calm under the threat: that's how a normal simulation ends
      if (o.calm !== false && o.threatened && Ch.hr < 88) { Ch.calmT += dt; if (Ch.calmT > 3) return 'calm'; } else Ch.calmT = 0;
      // pinned at the top for too long: the simulation lets you go, and the board knows it
      if (Ch.hr >= 184) { Ch.overT += dt; if (Ch.overT > (o.blackoutAfter || 10)) return 'blackout'; } else Ch.overT = Math.max(0, Ch.overT - dt * 0.5);
      // the thing a Divergent mind notices
      if (Ch.canAware && !Ch.awareOffered && Ch.t > (o.awareAfter || 9) && Ch.hr > 110) {
        Ch.awareOffered = true;
        Ch.mon.aware(true, '[AWARE]  This isn\'t real.  — press R');
        DV.Audio.play('glitch');
        DV.UI.glitch();
      }
      if (Ch.awareOffered && !Ch.aware && input.consume('KeyR')) { Ch.aware = true; Ch.mon.aware(false); return 'aware'; }
      return null;
    },
    // the picture itself: the colour drains and the contrast climbs as it gets worse
    look(panic, extra) {
      const cv = DV.Game && DV.Game.renderer && DV.Game.renderer.domElement;
      if (!cv) return;
      const k = U.clamp(panic || 0, 0, 1);
      const f = k > 0.05 || extra ? 'saturate(' + (1 - 0.55 * k).toFixed(3) + ') contrast(' + (1 + 0.22 * k).toFixed(3) + ')' + (extra ? ' ' + extra : '') : '';
      if (cv.style.filter !== f) cv.style.filter = f;
    },
    stop(Ch) {
      if (Ch && Ch.mon) { Ch.mon.remove(); Ch.mon = null; }
      DV.UI.root.classList.remove('fearing');
      DV.UI.simMode(false);
      DV.UI.setFear(0);
      this.look(0);
    },

    /* ------------------------------ the board ------------------------------ */
    points(r) {
      const m = METHODS[r.how] || METHODS.calm;
      return Math.round(U.clamp(112 - (r.secs || 60) * 1.05, 25, 100) * m.k);
    },
    describe(r) { return (NAMES[r.fear] || r.fear) + ': ' + (METHODS[r.how] ? METHODS[r.how].label.toLowerCase() : r.how) + ', ' + r.secs + 's'; },
    // the class's times, worked out from who they are (and a little luck): { id: { secs, pts } }
    classRun(tag, fears) {
      const I = DV.Initiation, out = {};
      for (const c of I.roster()) {
        const r = I.rng('fear:' + tag + ':' + c.id), s = I.STAT[c.id] || { resolve: 5 };
        let secs = 0, pts = 0;
        for (const f of fears) {
          const t = U.clamp(150 - s.resolve * 13 + (r() - 0.5) * 60 + (f === 'family' || f === 'own' ? 25 : 0), 24, 190);
          const how = t > 170 ? 'blackout' : f === 'family' && r() < 0.3 ? 'shot' : 'calm';
          secs += Math.round(t);
          pts += this.points({ secs: t, how });
        }
        out[c.id] = { secs, pts };
      }
      return out;
    },

    /* ------------------------------ your own fear ------------------------------ */
    // read off what you did in your aptitude test: { id, line } (id: child | dog | tribunal | needle)
    own() {
      const a = DV.State.data.aptitude, t = a.traits || {};
      const said = (re) => (a.choices || []).some((c) => re.test(c.label || ''));
      if (a.divergent) return { id: 'needle', line: 'The test couldn\'t decide what you were. Somewhere in you, you know what they do with people like that.' };
      if (said(/left the child behind|did not reach the child|shut the child/)) return { id: 'child', line: 'In your test there was a child on the platform, and you didn\'t reach her. You think you\'ve forgotten.' };
      if (said(/struck the dog|froze while the dog/)) return { id: 'dog', line: 'In your test there was a dog. You remember its eyes better than you remember the room.' };
      const score = {
        child: (t.selflessness || 0) + (t.compliance || 0) + (t.peacefulness || 0) * 0.6,
        dog: (t.bravery || 0) + (t.aggression || 0) + (t.resistance || 0) * 0.6,
        tribunal: (t.honesty || 0) + (t.deception || 0) + (t.logic || 0) * 0.5 + (t.observation || 0) * 0.5,
      };
      const best = Object.keys(score).sort((x, y) => score[y] - score[x])[0];
      const lines = {
        child: 'You were tested for what you would give. The fear is what you couldn\'t.',
        dog: 'You were tested for what you would fight. The fear is what fights back.',
        tribunal: 'You were tested for what you would say. The fear is being made to say it.',
      };
      return { id: score[best] > 0 ? best : ({ abnegation: 'child', amity: 'child', dauntless: 'dog' }[a.result] || 'tribunal'), line: lines[best] };
    },
  };

  /* ------------------------------ styles ------------------------------ */
  const css = document.createElement('style');
  css.textContent = [
    '.fear-hud { position: absolute; inset: 0; pointer-events: none; }',
    '.fear-hud .fm { position: absolute; right: 16px; top: 16px; padding: 8px 12px; background: rgba(6, 10, 8, 0.75); border: 1px solid #000; box-shadow: inset 0 0 0 1px #24402a; text-align: right; }',
    '.fear-hud .bpm { font-family: var(--mono); font-size: 26px; color: #9fe8a8; }',
    '.fear-hud.high .bpm { color: #ff7a5a; }',
    '.fear-hud canvas { display: block; margin-top: 4px; }',
    '.fear-hud .lbl { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #6a8a70; }',
    '.fear-hud .panic { margin-top: 6px; display: flex; align-items: center; gap: 8px; }',
    '.fear-hud .panic .pl { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #a08070; }',
    '.fear-hud .panic .pb { flex: 1; height: 6px; background: #111; border: 1px solid #000; box-shadow: inset 0 0 0 1px #2a2a2a; }',
    '.fear-hud .panic i { display: block; height: 100%; width: 0; background: #7fc08a; transition: width 0.2s; }',
    '.fear-hint { position: absolute; left: 50%; bottom: 60px; transform: translateX(-50%); font-size: 13px; color: var(--text); background: rgba(0,0,0,0.55); padding: 5px 12px; border: 1px solid #000; white-space: nowrap; }',
    '.fear-hint:empty { display: none; }',
    '.fear-aware { position: absolute; left: 50%; top: 38%; transform: translateX(-50%); font-family: var(--serif); font-size: 22px; letter-spacing: 0.18em; color: #c8e8ff; text-shadow: 0 0 12px #4af, 0 2px 0 #000; animation: awarepulse 1.2s ease-in-out infinite; }',
    '.fear-title { position: absolute; left: 50%; top: 18%; transform: translateX(-50%); font-family: var(--serif); font-size: 30px; letter-spacing: 0.4em; color: #e8e2d4; text-shadow: 0 2px 0 #000, 0 0 18px rgba(0,0,0,0.9); opacity: 0; white-space: nowrap; }',
    '.fear-title.on { animation: feartitle 4.2s ease-in-out 1; }',
    '@keyframes feartitle { 0% { opacity: 0; letter-spacing: 0.6em; } 20% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; letter-spacing: 0.32em; } }',
    '.fear-edge { position: absolute; inset: 0; opacity: 0; box-shadow: inset 0 0 120px 40px rgba(150, 0, 0, 0.75); }',
    '@keyframes awarepulse { 50% { opacity: 0.5; } }',
  ].join('\n');
  document.head.appendChild(css);

  DV.Fear = F;
})();
