/* ==========================================================================
   DIVERGENT — dialogue engine
   Data-driven trees (js/data/dialogue/*.js). The engine resolves entry
   nodes, conditions, attribute checks, effects and NPC memory, and emits
   events the dialogue UI renders. Also used for non-NPC choice scenes
   (simulations, keypads, terminals) via startScene().
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  DV.DialogueDB = {
    trees: {},
    add(id, tree) {
      tree.id = id;
      this.trees[id] = tree;
      return tree;
    },
    get(id) {
      return this.trees[id];
    },
  };

  function makeCtx(session) {
    const id = session.npcId;
    const st = id ? DV.State.npc(id) : { rel: 0, trust: 0, mem: {}, chosen: {} };
    const def = id ? DV.NPCData.get(id) : null;
    const c = {
      session,
      id,
      def,
      s: st,
      get npc() { return id && DV.NPCs ? DV.NPCs.get(id) : null; },
      get name() { return DV.State.data.player.name; },
      get player() { return DV.State.data.player; },
      firstTime: !st.mem.met,
      // memory
      mem: (k) => st.mem[k],
      setMem: (k, v) => { st.mem[k] = v === undefined ? true : v; },
      incMem: (k, n) => { st.mem[k] = (st.mem[k] || 0) + (n || 1); return st.mem[k]; },
      other: (otherId) => DV.State.npc(otherId),
      otherMem: (otherId, k) => DV.State.npc(otherId).mem[k],
      // relationship
      rel: () => (id ? DV.Reputation.disposition(id) : 0),
      rawRel: () => st.rel,
      addRel: (d, silent) => (id ? DV.Reputation.addRel(id, d, silent) : 0),
      trust: () => st.trust,
      addTrust: (d) => { st.trust = U.clamp(st.trust + d, -100, 100); },
      helped: () => { st.mem.helped = true; },
      insulted: () => { st.mem.insulted = true; },
      // flags
      flag: (n) => DV.State.flag(n),
      setFlag: (n, v) => DV.State.setFlag(n, v),
      // quests
      q: (qid) => DV.Quests.state(qid),
      qActive: (qid) => DV.Quests.isActive(qid),
      qDone: (qid) => DV.Quests.isDone(qid),
      qFailed: (qid) => DV.Quests.isFailed(qid),
      qStarted: (qid) => DV.Quests.started(qid),
      qObj: (qid, o) => DV.Quests.obj(qid, o),
      startQuest: (qid) => DV.Quests.start(qid),
      setObj: (qid, o, s, log) => DV.Quests.setObj(qid, o, s || 'done', log),
      activate: (qid, o, log) => DV.Quests.activate(qid, o, log),
      completeQuest: (qid, outcome, log) => DV.Quests.complete(qid, outcome, log),
      failQuest: (qid, reason) => DV.Quests.fail(qid, reason),
      qlog: (qid, text) => DV.Quests.log(qid, text),
      // items
      has: (it, n) => DV.Inventory.has(it, n),
      give: (it, n) => DV.Inventory.add(it, n),
      take: (it, n) => DV.Inventory.remove(it, n),
      // reputation
      rep: (f, d) => DV.Reputation.add(f, d),
      repOf: (f) => DV.Reputation.get(f),
      // stats
      attr: (a) => DV.Stats.attr(a),
      skill: (s) => DV.Stats.skill(s),
      practice: (s, n) => DV.Stats.practice(s, n),
      xp: (n, why) => DV.Stats.addXP(n, why),
      // time
      time: () => DV.Clock.minutes(),
      after: (t) => DV.Clock.minutes() >= U.parseTime(t),
      before: (t) => DV.Clock.minutes() < U.parseTime(t),
      clock: () => DV.Clock.str(),
      // aptitude
      apt: (w, label) => DV.Aptitude && DV.Aptitude.record(w, label),
      aptDone: () => DV.State.data.aptitude.status === 'complete',
      result: () => DV.State.data.aptitude.result,
      recorded: () => DV.State.data.aptitude.recordedAs,
      divergent: () => !!DV.State.data.aptitude.divergent,
      // misc
      upbringing: () => DV.State.data.player.upbringing,
      outfit: () => DV.State.data.player.outfit,
      note: (t) => DV.State.note(t),
      notify: (t) => DV.Events.emit('notify', { text: t, kind: 'info' }),
      action: (name, arg) => DV.Actions && DV.Actions[name] && DV.Actions[name](DV.Game, arg),
      goto: (node) => { session.redirect = node; },
      end: () => { session.redirect = '__end'; },
      sound: (n) => DV.Audio.play(n),
      // standard memory-aware greeting
      greet(v) {
        const r = c.rel();
        if (st.mem.insulted && r < 0 && v.insulted) return v.insulted;
        if (st.mem.helped && v.helped && !c.firstTime) return v.helped;
        if (c.firstTime) return v.first;
        if (r >= 30 && v.friend) return v.friend;
        if (r <= -15 && v.cold) return v.cold;
        return v.again || v.first;
      },
    };
    return c;
  }

  function resolveText(t, c) {
    if (typeof t === 'function') t = t(c);
    if (Array.isArray(t)) {
      const v = t.find((x) => !x.if || x.if(c));
      t = v ? (typeof v.text === 'function' ? v.text(c) : v.text) : '';
    }
    return fill(String(t || ''), c);
  }
  function fill(s, c) {
    const p = DV.State.data.player;
    return s
      .replace(/\{name\}/g, p.name)
      .replace(/\{NAME\}/g, p.name.toUpperCase())
      .replace(/\{npc\}/g, c.def ? c.def.name : '')
      .replace(/\{time\}/g, DV.Clock.str())
      .replace(/\{upbringing\}/g, DV.Factions.name(p.upbringing))
      .replace(/\{result\}/g, DV.State.data.aptitude.result ? DV.Factions.name(DV.State.data.aptitude.result) : '')
      .replace(/\{recorded\}/g, DV.State.data.aptitude.recordedAs ? DV.Factions.name(DV.State.data.aptitude.recordedAs) : '');
  }

  const D = {
    active: null,
    makeCtx,
    fill,

    isActive() {
      return !!this.active;
    },

    treeFor(npcId) {
      const def = DV.NPCData.get(npcId);
      if (!def) return null;
      let tid = def.dialogue || 'ambient:' + npcId;
      let tree = DV.DialogueDB.get(tid);
      if (!tree && DV.AmbientDialogue) tree = DV.DialogueDB.add(tid, DV.AmbientDialogue.build(def));
      return tree;
    },

    /** Begin a conversation with an NPC. */
    start(npcId, opts) {
      const tree = this.treeFor(npcId);
      if (!tree) { console.warn('[Dialogue] no tree for', npcId); return false; }
      return this.begin(tree, Object.assign({ npcId }, opts || {}));
    },

    /** Begin a non-NPC scene (simulation choices, terminals). opts: {speaker, faction, onEnd, node} */
    startScene(treeId, opts) {
      const tree = DV.DialogueDB.get(treeId);
      if (!tree) { console.warn('[Dialogue] no scene', treeId); return false; }
      return this.begin(tree, Object.assign({ npcId: null }, opts || {}));
    },

    begin(tree, opts) {
      if (this.active) this.end(true);
      const session = { tree, npcId: opts.npcId, opts, node: null, history: [], redirect: null };
      session.c = makeCtx(session);
      this.active = session;
      if (opts.npcId) {
        const st = DV.State.npc(opts.npcId);
        st.mem.timesTalked = (st.mem.timesTalked || 0) + 1;
      }
      let entry = opts.node;
      if (!entry) {
        if (typeof tree.entry === 'function') entry = tree.entry(session.c);
        else if (Array.isArray(tree.entry)) {
          const e = tree.entry.find((x) => !x.if || x.if(session.c));
          entry = e && e.node;
        }
      }
      entry = entry || 'start';
      DV.Events.emit('dialogue:start', { npcId: opts.npcId, tree: tree.id, scene: !opts.npcId });
      this.goto(entry);
      return true;
    },

    goto(nodeId) {
      const s = this.active;
      if (!s) return;
      if (nodeId === '__end') { this.end(); return; }
      const node = s.tree.nodes[nodeId];
      if (!node) {
        console.error('[Dialogue] missing node', s.tree.id, nodeId);
        this.end();
        return;
      }
      s.node = nodeId;
      s.history.push(nodeId);
      s.redirect = null;
      const c = s.c;
      if (node.onEnter) node.onEnter(c);
      if (s.redirect) { const r = s.redirect; s.redirect = null; this.goto(r); return; }
      s.view = this.buildView(node, c);
      DV.Events.emit('dialogue:node', s.view);
    },

    buildView(node, c) {
      const s = this.active;
      const def = c.def;
      let speaker = node.speaker || (s.opts && s.opts.speaker) || (def ? def.name : '');
      if (typeof speaker === 'function') speaker = speaker(c);
      let faction = node.faction || (s.opts && s.opts.faction) || (def ? def.faction : '');
      if (typeof faction === 'function') faction = faction(c);
      const text = resolveText(node.text, c);
      let raw = typeof node.choices === 'function' ? node.choices(c) : node.choices || [];
      if (node.shared && s.tree.shared && s.tree.shared[node.shared]) raw = raw.concat(s.tree.shared[node.shared]);
      if (!raw.length) {
        if (node.next) raw = [{ text: node.nextText || 'Continue.', to: node.next }];
        else raw = [{ text: node.endText || (s.npcId ? 'Goodbye.' : 'Continue.'), end: true }];
      }
      const choices = [];
      raw.forEach((ch, i) => {
        if (ch.if && !ch.if(c)) return;
        const onceKey = ch.once ? s.tree.id + ':' + (typeof ch.once === 'string' ? ch.once : s.node + ':' + i) : null;
        if (onceKey && c.s.chosen && c.s.chosen[onceKey]) return;
        let label = resolveText(ch.text, c);
        let enabled = true, checkLabel = null, checkPass = null;
        if (ch.check) {
          const a = ch.check.attr;
          const dc = ch.check.dc;
          const attrDef = DV.RPG.attributes.find((x) => x.id === a);
          checkLabel = '[' + (attrDef ? attrDef.name.toUpperCase() : a.toUpperCase()) + ' ' + dc + ']';
          checkPass = DV.Stats.check(a, dc);
          if (!checkPass && !ch.check.roll) enabled = false;
        }
        if (ch.req && !ch.req(c)) enabled = false;
        choices.push({ index: choices.length, label, enabled, checkLabel, checkPass, tag: ch.tag || null, raw: ch, onceKey });
      });
      if (!choices.some((x) => x.enabled)) choices.push({ index: choices.length, label: s.npcId ? 'Goodbye.' : 'Continue.', enabled: true, raw: { end: true } });
      return { speaker, faction, factionName: faction ? DV.Factions.name(faction) : '', text, choices, npcId: s.npcId, nodeId: s.node, mood: node.mood || null, portrait: node.portrait };
    },

    choose(index) {
      const s = this.active;
      if (!s || !s.view) return;
      const ch = s.view.choices[index];
      if (!ch || !ch.enabled) return;
      const raw = ch.raw;
      const c = s.c;
      if (ch.onceKey) c.s.chosen[ch.onceKey] = true;
      DV.Events.emit('dialogue:choice', { label: ch.label, npcId: s.npcId, raw });
      let target = raw.to;
      if (raw.check) {
        const pass = DV.Stats.check(raw.check.attr, raw.check.dc);
        DV.Audio.play(pass ? 'check_ok' : 'check_fail');
        if (pass) {
          const sk = raw.check.skill || { strength: 'intimidation', agility: 'athletics', intelligence: 'logic', perception: 'observation', charisma: 'persuasion', resolve: 'composure' }[raw.check.attr];
          if (sk) DV.Stats.practice(sk, 1);
          DV.Stats.addXP(raw.check.xp || 10);
        } else target = raw.fail || target;
      }
      if (raw.skill) DV.Stats.practice(raw.skill, 1);
      if (raw.apt && DV.Aptitude) DV.Aptitude.record(raw.apt, raw.aptLabel || ch.label);
      if (raw.effect) raw.effect(c);
      if (raw.xp) DV.Stats.addXP(raw.xp);
      if (s !== this.active) return; // effect may have ended / replaced the dialogue
      if (s.redirect) { const r = s.redirect; s.redirect = null; if (r === '__end') { this.end(); return; } this.goto(r); return; }
      if (raw.end || !target) { this.end(); return; }
      this.goto(target);
    },

    end(silent) {
      const s = this.active;
      if (!s) return;
      this.active = null;
      if (s.npcId) {
        const st = DV.State.npc(s.npcId);
        st.mem.met = true;
        st.mem.lastTalk = DV.Clock.total();
      }
      const node = s.tree.nodes[s.node];
      if (node && node.onExit) node.onExit(s.c);
      if (s.tree.onEnd) s.tree.onEnd(s.c);
      if (!silent) DV.Events.emit('dialogue:end', { npcId: s.npcId, tree: s.tree.id });
      if (s.opts && s.opts.onEnd) s.opts.onEnd(s.c);
    },
  };

  DV.Dialogue = D;
})();
