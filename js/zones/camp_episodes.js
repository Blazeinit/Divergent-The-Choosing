/* ==========================================================================
   DIVERGENT — the campaign's episodes (Build 5): "The Chalk Year"
   Fourteen short chapters (docs/CAMPAIGN.md): the five factions' cases (two
   chapters each; you play your own), then the seventh circle, the meeting
   under the tracks, the night of the scan and the hearing.

   They are made the same way, from data: a small zone, people to talk to,
   things to look at, one risk (someone coming), one choice with a price. The
   engine below turns that into a Chapter that checkpoints, saves what you've
   seen and does what the campaign director (js/game/campaign.js) expects:
   clues, trust, proof, and DV.Campaign.complete at the end.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const FW = () => DV.FirstWeek;
  const K = () => DV.Campaign;
  const adult = (f, sex, seed, age, h) => { const a = DV.Character.fromFaction(f, sex, seed, { age: age || 40 }); a.height = (a.height || 1) * (h || 1.04); return a; };
  const flag = (n) => !!DV.State.flag(n);

  const ACTS = { 2: 'ACT II\nFACTION BEFORE BLOOD', 3: 'ACT III\nTHE CIRCLE CLOSES', 4: 'ACT IV\nTHE CONTINUITY VOTE' };

  /* ------------------------------ what you've seen ------------------------------ */
  const prog = (id) => { const s = K().st(); s.prog = s.prog || {}; return s.prog[id] || (s.prog[id] = { seen: {}, risk: null, outcome: null }); };
  const seen = (id, k) => !!prog(id).seen[k];
  const mark = (id, k) => { prog(id).seen[k] = true; };
  const cur = () => DV.Chapter.id;

  // an effect written as data: { clue: [id, text, suspect?], trust: [[who, d, why?]], flag: 'x' | ['x'], give: [piece, how], saved: 1, out: 'name' }
  function fx(f) {
    if (!f) return;
    const C = K();
    if (f.clue) for (const c of (Array.isArray(f.clue[0]) ? f.clue : [f.clue])) C.clue(c[0], c[1], c[2] ? { suspect: c[2] } : undefined);
    if (f.trust) for (const t of f.trust) C.trust(t[0], t[1], t[2]);
    if (f.flag) for (const n of [].concat(f.flag)) DV.State.setFlag(n);
    if (f.give) C.give(f.give[0], f.give[1]);
    if (f.saved) C.st().saved = (C.st().saved || 0) + f.saved;
    if (f.out) prog(cur()).outcome = f.out;
    if (f.kill) C.kill(f.kill[0], f.kill[1]);
  }

  /* ------------------------------ zones ------------------------------ */
  const SKY = {
    night: { fog: { color: 0x0c1018, near: 28, far: 150 }, sky: { top: 0x04060c, horizon: 0x161c2a, ground: 0x05070a, skyline: false }, ext: { sunDir: [0.3, 0.8, 0.2], sunColor: [0.1, 0.11, 0.16], ambient: [0.14, 0.15, 0.2] }, amb: [0.14, 0.15, 0.2] },
    dawn: { fog: { color: 0x5a6068, near: 30, far: 160 }, sky: { top: 0x4a525c, horizon: 0x9a9890, ground: 0x4a4a48, skyline: false }, ext: { sunDir: [0.5, 0.5, 0.3], sunColor: [0.7, 0.66, 0.6], ambient: [0.34, 0.34, 0.36] }, amb: [0.34, 0.34, 0.36] },
    day: { fog: { color: 0x7d858c, near: 40, far: 200 }, sky: { top: 0x5b6773, horizon: 0x9ca3a9, ground: 0x585b5d, skyline: false }, ext: { sunDir: [0.5, 0.8, 0.3], sunColor: [0.85, 0.84, 0.8], ambient: [0.46, 0.46, 0.48] }, amb: [0.46, 0.46, 0.48] },
  };
  function zone(id, o) {
    const k = SKY[o.sky || 'day'];
    const room = o.outdoor
      ? { id: id + '_room', name: o.name, x0: 0, z0: 0, x1: o.w, z1: o.d, exterior: true, floor: o.floor || 'asphalt', edge: 'wall', edgeH: 2.6, edgeMat: o.edgeMat || 'concrete', light: { ambient: k.amb, list: o.lamps || [], range: 9, color: [1, 0.84, 0.58] } }
      : { id: id + '_room', name: o.name, x0: 0, z0: 0, x1: o.w, z1: o.d, h: o.h || 3.2, floor: o.floor || 'tile_floor', wall: o.wall || 'paint_white', ceiling: o.ceiling || 'ceiling_tile', light: { ambient: o.amb || [0.4, 0.4, 0.4], color: o.lightColor || [1, 0.97, 0.9], intensity: o.intensity || 0.85, spacing: 4.5, range: 6.5, fixture: o.fixture } };
    DV.Zones.define(id, Object.assign({
      name: o.name, region: o.region, chapter: true, noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: o.w + 2, z1: o.d + 2 },
      buildingHeight: o.outdoor ? 0 : 5, roof: o.outdoor ? undefined : true,
      fog: k.fog, sky: k.sky, exterior: k.ext,
      rooms: [room], doors: [], windows: [],
      props: (o.props || []).slice(),
      spawn: o.spawn,
      build(ctx) { if (o.build) o.build(ctx); },
    }, o.outdoor ? {} : {}));
  }
  // a chalk circle: a ring of short white strokes on the ground
  DV.Props.define('chalk_circle', (ctx, p, B) => {
    const R = p.r || 1.3, n = 26, m = ctx.M('white');
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      B.push(Math.cos(a) * R, 0.02, Math.sin(a) * R, -a);
      B.box(m, 0, 0, 0, 0.11, 0.035, 0.5);
      B.pop();
    }
  });

  /* ------------------------------ dialogue from data ------------------------------ */
  // a person with things to say: opts [{ q, a, fx, key, if, check, once }]
  function talkTree(epId, id, speaker, faction, intro, opts) {
    const nodes = {
      start: {
        speaker, faction,
        text: typeof intro === 'function' ? intro : () => intro,
        choices: opts.map((o, i) => ({
          text: o.q,
          to: 'a' + i,
          check: o.check,
          if: () => (o.once === false || !seen(epId, id + ':' + i)) && (!o.if || o.if()),
        })).concat([{ text: 'That is all.', end: true }]),
      },
    };
    opts.forEach((o, i) => {
      nodes['a' + i] = { speaker, faction, text: typeof o.a === 'function' ? o.a : () => o.a, onEnter: () => { mark(epId, id + ':' + i); fx(o.fx); }, next: 'start', nextText: 'Go on.' };
    });
    DV.DialogueDB.add(epId + '_' + id, { entry: 'start', nodes });
  }
  // a choice with a price: each option sets what it costs, then the scene ends
  function choiceTree(epId, speaker, faction, text, options) {
    DV.DialogueDB.add(epId + '_choice', {
      entry: 'start',
      nodes: {
        start: {
          speaker, faction,
          text: typeof text === 'function' ? text : () => text,
          choices: options.map((o) => ({ text: o.q, if: o.if, check: o.check, end: true, effect: () => { fx(o.fx); if (o.line) DV.UI.notify(o.line, 'info'); } })),
        },
      },
    });
  }

  /* ------------------------------ the engine ------------------------------ */
  function episode(E) {
    zone(E.zone.id, E.zone);
    DV.QuestDB.add({
      id: E.id, title: E.title, type: 'main', giver: null, summary: E.summary,
      startText: E.start,
      objectives: [{ id: 'look', text: E.goal, target: E.goalAt }, { id: 'end', text: E.endGoal, hidden: true, target: E.finale && { x: E.finale.x, z: E.finale.z } }],
      rewards: { xp: 150 }, completeText: E.done,
    });
    for (const [aid, a] of Object.entries(E.actors || {})) if (a.talk) talkTree(E.id, aid, a.name, a.faction, a.talk.intro, a.talk.opts);
    if (E.risk && E.risk.caught) talkTree(E.id, 'caught', E.risk.actor.name, E.risk.actor.faction, E.risk.caught.text, [{ q: E.risk.caught.q, a: E.risk.caught.a, fx: E.risk.caught.fx, once: false }]);
    choiceTree(E.id, E.finale.speaker, E.finale.faction, E.finale.text, E.finale.options);

    const needMet = () => (E.need || []).every((k) => seen(E.id, k));
    const riskDone = () => !E.risk || !!prog(E.id).risk;
    const isOver = () => !!prog(E.id).over;

    DV.Chapter.define(E.id, {
      zone: E.zone.id, day: E.day, time: E.time,
      title: E.title.toUpperCase() + '\n' + E.where,
      canPass() { return true; },
      start(Ch, zone, opts) {
        FW().fresh(Ch);
        DV.Audio.setMusic(E.music || 'calm');
        if (!DV.Quests.started(E.id)) DV.Quests.start(E.id);
        DV.Quests.tracked = E.id;
        Ch.E = E; Ch.riskStarted = false;
        this.scene(Ch, zone, opts);
      },
      scene(Ch, zone) {
        Ch.checkpoint('scene');
        const P = DV.Player;
        const SP = zone.def.spawn;
        FW().placePlayer(SP.x, SP.z, SP.rot || 0);
        // the people
        Ch.cast = {};
        for (const [aid, a] of Object.entries(E.actors || {})) {
          if (a.when && !a.when()) continue;
          const act = Ch.actor({ id: aid, name: a.name, faction: a.faction, app: adult(a.faction, a.sex || 'm', a.seed || aid, a.age || 40, a.h), x: a.x, z: a.z, rot: a.rot || 0, action: a.action || 'idle', seatY: a.seatY });
          Ch.cast[aid] = act;
          if (a.talk) {
            Ch.interact({
              id: 'talk_' + aid, kind: 'action', x: () => act.x, y: 1.4, z: () => act.z, radius: 1.7, label: a.label || 'Talk to', name: () => act.name,
              cond: () => !isOver() && (!a.cond || a.cond()),
              onUse: () => { act.face(P.x, P.z); mark(E.id, aid); Ch.scene(E.id + '_' + aid, { speaker: act.name, faction: a.faction }); },
            });
          }
        }
        // the things
        for (const t of E.things || []) {
          Ch.interact({
            id: 'look_' + t.id, kind: 'action', x: t.x, y: 1.0, z: t.z, radius: t.r || 1.5, label: t.label || 'Examine', name: t.name,
            cond: () => !isOver() && (!t.cond || t.cond()),
            onUse: () => {
              if (t.use) { t.use(Ch); return; }
              const first = !seen(E.id, t.id);
              mark(E.id, t.id);
              DV.Audio.play('paper');
              const text = typeof t.text === 'function' ? t.text() : t.text;
              DV.UI.showReading(t.name, text, () => { if (first && t.fx) fx(t.fx); if (first && t.after) t.after(Ch); });
            },
          });
        }
        // the end: a conversation with a price
        const F = E.finale;
        Ch.interact({
          id: 'camp_finale', kind: 'action', x: F.x, y: 1.3, z: F.z, radius: 1.8, label: F.label, name: F.name,
          cond: () => !isOver() && needMet() && riskDone(),
          onUse: () => {
            const who = Ch.cast[F.actor]; if (who) who.face(P.x, P.z);
            Ch.scene(E.id + '_choice', { speaker: F.speaker, faction: F.faction });
          },
        });
        if (E.setup) E.setup(Ch, zone);
        if (needMet() && !prog(E.id).risk && !E.risk) { /* nothing to wait for */ }
        // the first time in: an establishing shot (and the act's title card when a new act begins)
        const pr = prog(E.id);
        const after = () => { if (E.open) Ch.scene(E.id + '_' + E.open.actor, { speaker: E.actors[E.open.actor].name, faction: E.actors[E.open.actor].faction }); else DV.UI.narrate(E.hint, 5); };
        if (!pr.intro) {
          pr.intro = true;
          const st = K().st(), act = (K().episode(E.id) || {}).act || 2;
          const card = act > (st.cardAct || 1) ? ACTS[act] : null;
          if (card) st.cardAct = act;
          const W = E.zone.w, D = E.zone.d, H = E.zone.outdoor ? 7.5 : Math.min(2.7, (E.zone.h || 3.2) - 0.45);
          const focus = (E.things && E.things[0]) || E.finale;
          Ch.cut(true);
          Ch.shot([0.8, H, 0.8], [W / 2, 0.6, D / 2], true);
          Ch.seq([
            () => { if (card) DV.UI.narrate(card, 4.4); else DV.UI.narrate(E.title.toUpperCase(), 3.2); return card ? 4.2 : 3.0; },
            () => { Ch.shot([U.clamp(focus.x + 2.6, 0.6, W - 0.6), 1.7, U.clamp(focus.z + 2.6, 0.6, D - 0.6)], [focus.x, 0.9, focus.z]); return 2.6; },
            () => { Ch.cut(false); FW().placePlayer(SP.x, SP.z, SP.rot || 0); },
            () => 0.6,
            after,
          ], 'intro');
        } else Ch.after(1.2, after);
      },
      update(Ch) {
        const pr = prog(E.id);
        if (needMet() && DV.Quests.obj(E.id, 'look') !== 'done') {
          DV.Quests.setObj(E.id, 'look', 'done');
          DV.Quests.setObj(E.id, 'end', 'active');
          DV.UI.notify(E.risk ? E.risk.warn : 'You have what you came for. ' + E.finale.label + '.', 'info');
        }
        // the risk: someone coming, and you've been caught at your work (or you've stepped away from it)
        if (E.risk && needMet() && !pr.risk && !Ch.riskStarted && !DV.Dialogue.isActive() && !Ch.cutscene) {
          Ch.riskStarted = true;
          const R = E.risk;
          const a = Ch.actor({ id: 'risk', name: R.actor.name, faction: R.actor.faction, app: adult(R.actor.faction, R.actor.sex || 'm', R.actor.seed || 'risk', R.actor.age || 40, R.actor.h), x: R.from[0], z: R.from[1], rot: 0, action: 'idle' });
          Ch.cast.risk = a;
          DV.Audio.play('step', { volume: 0.7, x: R.from[0], z: R.from[1], range: 30 });
          Ch.after(R.delay || 2, () => {
            DV.UI.notify(R.warn, 'info');
            a.walk([R.to], R.speed || 1.1, (who) => {
              const P = DV.Player, A = R.area;
              const inside = P.x >= A[0] && P.x <= A[2] && P.z >= A[1] && P.z <= A[3];
              who.face(P.x, P.z);
              if (inside) {
                pr.risk = 'caught';
                fx(R.caughtFx);
                if (R.caught) Ch.scene(E.id + '_caught', { speaker: who.name, faction: R.actor.faction });
              } else {
                pr.risk = 'clear';
                fx(R.clearFx);
                Ch.say(who, R.clearLine, 3.2);
              }
            });
          });
        }
      },
      onDialogueEnd(Ch, e) {
        if (e.tree === E.id + '_choice') {
          prog(E.id).over = true;
          const out = prog(E.id).outcome || 'done';
          if (E.finish) Ch.after(0.4, () => E.finish(Ch, out));
          else Ch.after(0.4, () => K().complete(E.id, out, { l2: E.banner }));
        }
      },
      bodies() { return []; },
    });
  }

  DV.CampEp = { episode, zone, talkTree, choiceTree, fx, prog, seen, mark, adult };
})();
