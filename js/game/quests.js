/* ==========================================================================
   DIVERGENT — quest engine
   Quest definitions live in js/data/quests.js. Runtime state is stored in
   DV.State.data.quests[id] = { state, objectives:{id:state}, log:[], unread, outcome }
   States: NOT_STARTED, ACTIVE, UPDATED (active + unread changes), COMPLETE, FAILED
   Objective states: hidden | active | done | failed
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  const QS = { NOT_STARTED: 'not_started', ACTIVE: 'active', UPDATED: 'updated', COMPLETE: 'complete', FAILED: 'failed' };

  DV.QuestDB = {
    defs: {},
    order: [],
    add(def) {
      this.defs[def.id] = def;
      this.order.push(def.id);
      return def;
    },
    get(id) {
      return this.defs[id];
    },
  };

  DV.Quests = {
    QS,
    tracked: null,
    q(id) {
      return DV.State.data.quests[id] || null;
    },
    state(id) {
      const q = this.q(id);
      return q ? q.state : QS.NOT_STARTED;
    },
    isActive(id) {
      const s = this.state(id);
      return s === QS.ACTIVE || s === QS.UPDATED;
    },
    isDone(id) {
      return this.state(id) === QS.COMPLETE;
    },
    isFailed(id) {
      return this.state(id) === QS.FAILED;
    },
    started(id) {
      return this.state(id) !== QS.NOT_STARTED;
    },
    obj(id, objId) {
      const q = this.q(id);
      return q ? q.objectives[objId] || 'hidden' : 'hidden';
    },
    objDone(id, objId) {
      return this.obj(id, objId) === 'done';
    },
    start(id, silent) {
      const def = DV.QuestDB.get(id);
      if (!def) { console.warn('[Quests] unknown quest', id); return; }
      if (this.started(id)) return;
      const q = { state: QS.UPDATED, objectives: {}, log: [], unread: true, startedAt: DV.Clock.minutes(), outcome: null };
      def.objectives.forEach((o, i) => {
        q.objectives[o.id] = o.hidden ? 'hidden' : i === 0 || o.parallel ? 'active' : 'hidden';
      });
      DV.State.data.quests[id] = q;
      this.log(id, def.startText || def.summary);
      if (!this.tracked || def.type === 'main') this.tracked = id;
      if (!silent) {
        DV.Audio.play('quest');
        DV.Events.emit('notify', { text: 'New quest: ' + def.title, kind: 'quest', big: true });
      }
      DV.Events.emit('quest:changed', { id, type: 'start' });
      if (def.onStart) def.onStart();
    },
    log(id, text) {
      const q = this.q(id);
      if (!q || !text) return;
      q.log.push({ t: DV.Clock.minutes(), day: DV.Clock.day(), text });
    },
    // set an objective's state; auto-reveals the next objective when one completes
    setObj(id, objId, st, logText) {
      const def = DV.QuestDB.get(id);
      if (!def) return;
      if (!this.started(id)) this.start(id);
      const q = this.q(id);
      if (q.state === QS.COMPLETE || q.state === QS.FAILED) return;
      const prev = q.objectives[objId];
      if (prev === st) return;
      q.objectives[objId] = st;
      if (st === 'done') {
        // activate the next objective that isn't finished yet (skipping ones already done,
        // e.g. when a player does things out of order)
        const idx = def.objectives.findIndex((o) => o.id === objId);
        let next = null;
        for (let i = idx + 1; i < def.objectives.length; i++) {
          if (q.objectives[def.objectives[i].id] !== 'done') { next = def.objectives[i]; break; }
        }
        if (next && !next.hidden && q.objectives[next.id] === 'hidden') q.objectives[next.id] = 'active';
      }
      if (logText) this.log(id, logText);
      q.state = QS.UPDATED;
      q.unread = true;
      const o = def.objectives.find((x) => x.id === objId);
      if (o && st !== 'hidden') {
        DV.Audio.play(st === 'failed' ? 'fail' : 'open');
        DV.Events.emit('notify', { text: (st === 'done' ? '✓ ' : st === 'failed' ? '✗ ' : '') + this.objText(o), kind: 'objective' });
      }
      DV.Events.emit('quest:changed', { id, type: 'objective', objId, state: st });
    },
    activate(id, objId, logText) {
      if (this.obj(id, objId) === 'hidden') this.setObj(id, objId, 'active', logText);
      else if (logText) this.log(id, logText);
    },
    complete(id, outcome, logText) {
      const def = DV.QuestDB.get(id);
      if (!def) return;
      if (!this.started(id)) this.start(id, true);
      const q = this.q(id);
      if (q.state === QS.COMPLETE || q.state === QS.FAILED) return;
      for (const o of def.objectives) if (q.objectives[o.id] === 'active') q.objectives[o.id] = 'done';
      q.state = QS.COMPLETE;
      q.unread = true;
      q.outcome = outcome || null;
      this.log(id, logText || def.completeText || 'Quest complete.');
      DV.Audio.play('quest');
      DV.Events.emit('notify', { text: 'Quest complete: ' + def.title, kind: 'quest', big: true });
      const rw = def.rewards || {};
      if (rw.xp) DV.Stats.addXP(rw.xp, def.title);
      if (rw.rep) for (const f in rw.rep) DV.Reputation.add(f, rw.rep[f]);
      if (rw.items) for (const it of rw.items) DV.Inventory.add(it);
      if (this.tracked === id) this.tracked = this.firstActive();
      DV.Events.emit('quest:changed', { id, type: 'complete', outcome });
      if (def.onComplete) def.onComplete(outcome);
    },
    fail(id, reason) {
      const def = DV.QuestDB.get(id);
      if (!def) return;
      if (!this.started(id)) this.start(id, true);
      const q = this.q(id);
      if (q.state === QS.COMPLETE || q.state === QS.FAILED) return;
      for (const o of def.objectives) if (q.objectives[o.id] === 'active') q.objectives[o.id] = 'failed';
      q.state = QS.FAILED;
      q.unread = true;
      this.log(id, reason || 'Quest failed.');
      DV.Audio.play('fail');
      DV.Events.emit('notify', { text: 'Quest failed: ' + def.title, kind: 'quest_fail', big: true });
      if (this.tracked === id) this.tracked = this.firstActive();
      DV.Events.emit('quest:changed', { id, type: 'fail' });
    },
    markRead(id) {
      const q = this.q(id);
      if (!q) return;
      q.unread = false;
      if (q.state === QS.UPDATED) q.state = QS.ACTIVE;
    },
    firstActive() {
      for (const id of DV.QuestDB.order) if (this.isActive(id)) return id;
      return null;
    },
    all() {
      return DV.QuestDB.order.filter((id) => this.started(id)).map((id) => ({ id, def: DV.QuestDB.get(id), q: this.q(id) }));
    },
    // current objective text + target for the HUD
    current(id) {
      id = id || this.tracked;
      if (!id || !this.isActive(id)) return null;
      const def = DV.QuestDB.get(id), q = this.q(id);
      const o = def.objectives.find((x) => q.objectives[x.id] === 'active');
      return o ? { quest: def, obj: o } : null;
    },
    // an objective's text and compass target may be written fresh as the day goes on
    objText(o) { return typeof o.text === 'function' ? o.text() : o.text; },
    objTarget(o) { return typeof o.target === 'function' ? o.target() : o.target; },
    displayState(id) {
      const s = this.state(id);
      return { not_started: 'NOT STARTED', active: 'ACTIVE', updated: 'UPDATED', complete: 'COMPLETE', failed: 'FAILED' }[s];
    },
  };
  void U;
})();
