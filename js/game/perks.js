/* ==========================================================================
   DIVERGENT — perks: the trees in js/data/perks.js, made to work
   What you own, what's open to you, what a perk point buys, and the sum of
   every live perk's `mods` that the game's systems ask for (mod(key)).

   A faction perk stays yours, but it only works while you still stand where
   it needs you to: transfer out of the faction you were raised in and its
   perks can go dormant until you earn the standing back. Faction before blood.

   The dialogue hooks live here too: checks (checkBonus), lines that are lies
   (lieOf — Candor sees them), and the choices only some players are offered
   (extraChoices: talking down someone hostile, a faction's own tone, calling a
   lie). Amity's herbs come each morning; Erudite's workbench is craft().
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // what each faction sounds like when you speak its language (offered once a day, by standing)
  const TONES = {
    abnegation: { say: 'Is there anything you need a hand with?', reply: '[A quick, surprised smile.] Not today. But thank you for asking — most people don\'t.' },
    dauntless: { say: 'Jumped anything worth jumping lately?', reply: '[A grin, sudden and wide.] Every day. Come up on the roof some night and find out what the city looks like from the edge.' },
    erudite: { say: 'Read anything worth arguing about?', reply: '[They brighten despite themselves.] Always. Remind me to lend you something. You\'ll hate the conclusion — that\'s how you know it\'s good.' },
    candor: { say: 'Tell me straight: how am I doing?', reply: 'Straight? Better than most. Worse than you think. [A short nod.] Ask me again tomorrow and I\'ll tell you again.' },
    amity: { say: 'Sit a minute. You look like you need it.', reply: '[They laugh, and some of the tightness goes out of their shoulders.] I do. Thank you. It\'s a strange thing, how rarely anyone says it.' },
  };

  const P = {
    rev: 0,
    _key: null,
    _mods: null,

    data() { return DV.PerkData; },
    p() {
      const pl = DV.State.data.player;
      if (!pl.perks) pl.perks = {};
      if (pl.perkPoints === undefined) pl.perkPoints = DV.RPG.PERK_START;
      return pl;
    },
    owned(id) { return !!this.p().perks[id]; },
    points() { return this.p().perkPoints || 0; },
    addPoints(n, why) {
      const pl = this.p();
      pl.perkPoints = (pl.perkPoints || 0) + n;
      if (why) DV.Events.emit('notify', { text: '+' + n + ' perk point' + (n > 1 ? 's' : '') + ' — ' + why, kind: 'level' });
      this.changed();
    },
    changed() { this.rev++; DV.Events.emit('perks:changed'); },

    /* ---------------- standing and the trees' gates ---------------- */
    isDivergent() {
      const a = DV.State.data.aptitude;
      return a.status === 'complete' && (a.result === 'inconclusive' || !!a.divergent);
    },
    member(f) { return DV.State.data.player.faction === f; },
    // raised in it and not (yet) gone anywhere else: the childhood counts for one rank
    raised(f) { const pl = DV.State.data.player; return pl.upbringing === f && (!pl.faction || pl.faction === f); },
    treeRank(f) {
      const s = DV.Reputation.standing(f);
      if (s.rank <= -2) return s.rank; // distrusted: membership doesn't save you
      return s.rank + (this.member(f) ? 2 : 0) + (this.raised(f) && !this.member(f) ? 1 : 0);
    },
    // is this tier of this tree open to you right now?
    tierOpen(tree, tier) {
      const D = this.data();
      if (typeof tree === 'string') tree = D.tree(tree);
      if (!tree) return false;
      if (tree.kind === 'skill') return DV.Stats.skill(tree.skill) >= D.SKILL_TIERS[tier - 1];
      if (tree.kind === 'faction') return this.treeRank(tree.faction) >= tier;
      if (tree.kind === 'divergent') return this.isDivergent() && DV.State.data.player.level >= D.DIV_TIERS[tier - 1];
      return false;
    },
    tierNeeds(tree, tier) {
      const D = this.data();
      if (tree.kind === 'skill') return D.RPGName(tree.skill) + ' ' + D.SKILL_TIERS[tier - 1];
      if (tree.kind === 'faction') {
        const f = tree.faction, mem = this.member(f), raised = this.raised(f) && !mem;
        const need = tier - (mem ? 2 : raised ? 1 : 0); // standing rank needed
        const T = DV.FactionStanding, idx = T.ranks.indexOf(Math.max(need, 0));
        return DV.Factions.name(f) + ' standing: ' + T.titles[f][idx] + ' (' + DV.Reputation.tierName(idx) + ')' + (mem ? ' — as a member' : raised ? ' — raised among them' : '');
      }
      if (tree.kind === 'divergent') return (this.isDivergent() ? '' : 'An inconclusive aptitude result, and ') + 'level ' + D.DIV_TIERS[tier - 1];
      return '';
    },
    treeVisible(tree) {
      if (typeof tree === 'string') tree = this.data().tree(tree);
      return tree.kind !== 'divergent' || this.isDivergent() || tree.perks.some((x) => this.owned(x.id));
    },
    // an owned perk does its work only while its tier is open (skills never close: they only grow)
    active(id) {
      if (!this.owned(id)) return false;
      const pk = this.data().perk(id);
      if (!pk) return false;
      const tree = this.data().tree(pk.tree);
      if (tree.kind === 'skill') return true;
      return this.tierOpen(tree, pk.tier);
    },
    has(id) { return this.active(id); },
    dormant() { return Object.keys(this.p().perks).filter((id) => this.data().perk(id) && !this.active(id)); },
    status(id) {
      if (this.owned(id)) return this.active(id) ? 'owned' : 'dormant';
      return this.canUnlock(id).ok ? 'available' : 'locked';
    },
    canUnlock(id) {
      const pk = this.data().perk(id);
      if (!pk) return { ok: false, why: 'No such perk.' };
      if (this.owned(id)) return { ok: false, why: 'Already learned.' };
      const tree = this.data().tree(pk.tree);
      if (!this.treeVisible(tree)) return { ok: false, why: 'This tree is closed to you.' };
      if (!this.tierOpen(tree, pk.tier)) return { ok: false, why: 'Requires ' + this.tierNeeds(tree, pk.tier) + '.' };
      if (pk.tier > 1 && !tree.perks.some((x) => x.tier === pk.tier - 1 && this.owned(x.id))) return { ok: false, why: 'Learn a tier ' + ['I', 'II'][pk.tier - 2] + ' perk of this tree first.' };
      if (this.points() < 1) return { ok: false, why: 'No perk points to spend. You earn one every level.' };
      return { ok: true, why: '' };
    },
    unlock(id) {
      const can = this.canUnlock(id);
      if (!can.ok) return can;
      const pl = this.p(), pk = this.data().perk(id);
      pl.perkPoints -= 1;
      pl.perks[id] = { day: DV.State.data.world.day, t: DV.State.data.world.time };
      DV.Audio.play('perk');
      DV.Events.emit('notify', { text: 'Perk learned: ' + pk.name, kind: 'level' });
      DV.State.note('Learned ' + pk.name + ' (' + this.treeName(pk.tree) + ').');
      if (pk.mods && pk.mods.herbs) this.giveHerbs();
      this.changed();
      return { ok: true, why: '' };
    },
    treeName(id) {
      const t = typeof id === 'string' ? this.data().tree(id) : id;
      if (!t) return '';
      if (t.kind === 'skill') return this.data().RPGName(t.skill);
      if (t.kind === 'faction') return DV.Factions.name(t.faction);
      return 'Divergent';
    },

    /* ---------------- the numbers ---------------- */
    // sum of `mods[key]` over every live perk (cached until anything that opens or closes a tier moves)
    mod(key) {
      return this.mods()[key] || 0;
    },
    on(key) { return this.mod(key) > 0; },
    defines(key) { return key in this.mods(); },
    mods() {
      const d = DV.State.data, pl = d.player, r = d.reputation;
      const k = d.meta.created + '|' + this.rev + '|' + pl.faction + '|' + pl.level + '|' + d.aptitude.result + '|' + r.abnegation + ',' + r.dauntless + ',' + r.erudite + ',' + r.candor + ',' + r.amity;
      if (k === this._key && this._data === d) return this._mods;
      const out = {};
      for (const id in pl.perks || {}) {
        if (!this.active(id)) continue;
        const m = this.data().perk(id).mods || {};
        for (const kk in m) out[kk] = (out[kk] || 0) + m[kk];
      }
      this._key = k; this._data = d; this._mods = out;
      return out;
    },
    // which live perks feed a key (for tooltips: "+1 Silver Tongue")
    sources(key) {
      const out = [];
      for (const id in this.p().perks) if (this.active(id)) { const pk = this.data().perk(id); if (pk.mods && pk.mods[key]) out.push(pk); }
      return out;
    },

    /* ---------------- checks ---------------- */
    // ctx: { faction, tree, choice, npcId }. Returns { total, parts: [[label, n]] }
    checkBonus(attr, ctx) {
      ctx = ctx || {};
      const parts = [];
      const add = (label, n) => { if (n) parts.push([label, n]); };
      const from = (key) => { for (const pk of this.sources(key)) add(pk.name, pk.mods[key]); };
      from('check.' + attr);
      from('check.all');
      const ch = ctx.choice;
      if (ch && (ch.tag === 'Lie' || ch.skill === 'deception' || (ch.check && ch.check.skill === 'deception'))) from('check.lie');
      if (ctx.tree === 'lockpick') from('check.lockpick');
      if (ctx.npcId && DV.Reputation.disposition(ctx.npcId) >= 10) from('check.friendly');
      const f = ctx.faction;
      if (f) from('checkvs.' + f);
      if (ctx.tree && /^order_/.test(ctx.tree)) from('checkvs.order');
      // standing with the faction you're talking to: respected opens doors, distrust shuts them
      if (f && DV.FactionStanding.titles[f]) {
        const s = DV.Reputation.standing(f);
        if (s.rank >= 2) add(DV.Factions.name(f) + ' standing (' + s.title + ')', 1);
        else if (s.rank <= -2) add(DV.Factions.name(f) + ' standing (' + s.title + ')', -1);
      }
      return { total: parts.reduce((a, x) => a + x[1], 0), parts };
    },

    /* ---------------- dialogue: lies, seams, and the choices perks add ---------------- */
    // the lie in a node, if there is one (node.lie: {tell, press, truth, call, back} or a function of c)
    lieOf(node, c) {
      if (!node || !node.lie) return null;
      const l = typeof node.lie === 'function' ? node.lie(c) : node.lie;
      return l || null;
    },
    // choices a perk or your standing adds to a node (session s, view-in-progress)
    extraChoices(node, c, s) {
      const out = [];
      const lie = this.lieOf(node, c);
      const nodeKey = s.tree.id + ':' + s.node;
      // Candor: call it
      if (lie && this.on('lie.call') && !(c.s.mem.liesCalled && c.s.mem.liesCalled[nodeKey])) {
        out.push({
          text: lie.call || 'That isn\'t true.', ptag: 'CANDOR · Cross-Examine', pfaction: 'candor',
          effect: (cc) => {
            (cc.s.mem.liesCalled || (cc.s.mem.liesCalled = {}))[nodeKey] = true;
            const truth = this.on('lie.truth');
            DV.Stats.award('lie', nodeKey, 'Saw through a lie');
            DV.Stats.practice('observation', 1);
            DV.Reputation.add('candor', truth ? 2 : 1, true);
            if (cc.id) { if (truth) { cc.addTrust(8); cc.addRel(2, true); } else cc.addRel(-1, true); }
            if (truth && lie.onTruth) lie.onTruth(cc);
            this.aside(s, truth ? (lie.truth || '[A long breath out.] ...All right. Not all of that was true. Leave it there — please.') : (lie.press || '[A flicker — there and gone.] I don\'t know what you mean.'), (truth && lie.truthBack) || lie.back || node.next || (node.end ? '__end' : s.node), lie.backText);
          },
        });
      }
      // only at the start of a real conversation with someone
      const entry = s.npcId && s.history.length === 1 && c.def && !s.tree.noPerks;
      if (!entry) return out;
      const disp = DV.Reputation.disposition(s.npcId);
      // Amity: talk down someone cold or hostile
      if (this.on('npc.calm') && disp <= -15 && c.s.mem.calmedDay !== DV.Clock.day()) {
        out.push({
          text: '(Breathe, and let them see it.) I think we started badly. Can we start again?', ptag: 'AMITY · Soothing Word', pfaction: 'amity',
          effect: (cc) => {
            cc.s.mem.calmedDay = DV.Clock.day();
            cc.s.mem.insulted = false;
            const need = 2 - DV.Reputation.disposition(cc.id);
            if (need > 0) cc.s.rel = U.clamp(cc.s.rel + need, -100, 100);
            DV.Stats.practice('empathy', 2);
            DV.Stats.award('check', null, null, 1);
            this.aside(s, '[Something in their shoulders comes down an inch.] ...All right. All right. Start again.', s.node, 'Thank you.');
          },
        });
      }
      // a faction's own tone, offered by standing: warmer the higher you stand
      const f = c.def.faction, tone = TONES[f];
      if (tone && c.s.mem.toneDay !== DV.Clock.day()) {
        const st = DV.Reputation.standing(f), mem = this.member(f);
        if (st.rank >= 1 || (mem && st.rank >= 0)) {
          out.push({
            text: tone.say, ptag: DV.Factions.name(f).toUpperCase() + ' · ' + st.title, pfaction: f,
            effect: (cc) => {
              cc.s.mem.toneDay = DV.Clock.day();
              cc.addRel(2 + Math.max(0, st.rank) + (mem ? 1 : 0), true);
              DV.Stats.practice('persuasion', 0.5);
              this.aside(s, tone.reply, s.node, 'Good.');
            },
          });
        }
      }
      return out;
    },
    // a short exchange a perk adds, then back where you were
    aside(s, text, back, backText) {
      const t = s.tree;
      if (!t.nodes.__perk) {
        t.nodes.__perk = {
          text: (c) => c.session.perkText || '',
          choices: (c) => [c.session.perkBack === '__end' ? { text: c.session.perkBackText || 'Goodbye.', end: true } : { text: c.session.perkBackText || 'Go on.', to: c.session.perkBack || 'start' }],
        };
      }
      s.perkText = text;
      s.perkBack = back;
      s.perkBackText = backText || null;
      s.redirect = '__perk';
    },

    /* ---------------- Amity's herbs, Erudite's bench ---------------- */
    giveHerbs() {
      DV.Inventory.add('healing_herbs', 2, true);
      DV.Events.emit('notify', { text: 'You gather two bundles of healing herbs.', kind: 'item' });
    },
    newDay() {
      if (this.on('herbs')) this.giveHerbs();
    },
    recipes() { return this.data().recipes; },
    canCraft(rid) {
      const r = this.recipes().find((x) => x.id === rid);
      if (!r) return { ok: false, why: 'No such recipe.' };
      if (!this.on('craft')) return { ok: false, why: 'Requires Applied Chemistry (Erudite).' };
      for (const id in r.needs) if (DV.Inventory.count(id) < r.needs[id]) return { ok: false, why: 'Missing ' + DV.Items.get(id).name + '.' };
      return { ok: true, why: '' };
    },
    craft(rid) {
      const can = this.canCraft(rid);
      if (!can.ok) return can;
      const r = this.recipes().find((x) => x.id === rid);
      for (const id in r.needs) DV.Inventory.remove(id, r.needs[id], true);
      DV.Inventory.add(r.out, 1, true);
      DV.Audio.play('clink');
      DV.Stats.practice('logic', 1);
      DV.Stats.award('activity', 'craft:' + rid, 'First ' + r.name);
      DV.Events.emit('notify', { text: 'Made: ' + DV.Items.get(r.out).name, kind: 'item' });
      return { ok: true, why: '' };
    },

    /* ---------------- transfers ---------------- */
    // faction before blood: the perks of the faction you left go quiet until you earn your place back
    onChosen(e) {
      this.changed();
      if (!e || !e.transfer) return;
      const home = DV.State.data.player.upbringing;
      const quiet = this.dormant().map((id) => this.data().perk(id)).filter((pk) => pk.tree === home);
      if (quiet.length) {
        DV.Events.emit('notify', { text: 'Faction before blood: your ' + DV.Factions.name(home) + ' perks lie dormant (' + quiet.map((x) => x.name).join(', ') + ').', kind: 'rep_down' });
        DV.State.note('Leaving ' + DV.Factions.name(home) + ' cost you ' + quiet.map((x) => x.name).join(', ') + ', until they trust you again.');
      }
    },

    init() {
      DV.Events.on('clock:newDay', () => this.newDay());
      DV.Events.on('faction:chosen', (e) => this.onChosen(e));
      DV.Events.on('reputation:changed', () => { this.rev++; });
    },
  };
  // the skill's display name (used in tier requirements)
  DV.PerkData.RPGName = (id) => { const s = DV.RPG.skills.find((x) => x.id === id) || DV.RPG.attributes.find((x) => x.id === id); return s ? s.name : id; };
  DV.Perks = P;
})();
