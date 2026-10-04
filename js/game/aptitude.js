/* ==========================================================================
   DIVERGENT — hidden aptitude system
   Simulation scripts and dialogue choices call record({...weights}, label).
   Weights may target factions directly (abnegation, dauntless, erudite,
   candor, amity), behavioural traits (mapped onto factions at scoring
   time) or `div` (simulation awareness → divergence).
   The player never sees raw values (debug mode excepted).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  const FACTIONS = ['abnegation', 'dauntless', 'erudite', 'candor', 'amity'];
  // trait → faction contribution
  const TRAIT_MAP = {
    selflessness: { abnegation: 1.0 },
    bravery: { dauntless: 1.0 },
    aggression: { dauntless: 0.6, amity: -0.5 },
    logic: { erudite: 1.0 },
    observation: { erudite: 0.6, candor: 0.3 },
    honesty: { candor: 1.0 },
    deception: { candor: -0.8, erudite: 0.2 },
    peacefulness: { amity: 1.0 },
    resistance: { dauntless: 0.5, candor: 0.3 },
    compliance: { abnegation: 0.5, amity: 0.3, dauntless: -0.3 },
  };

  const Apt = {
    FACTIONS,
    simIndex: 0,
    sims: ['sim_platform', 'sim_flood', 'sim_tribunal'],

    data() {
      return DV.State.data.aptitude;
    },
    record(w, label) {
      const a = this.data();
      if (a.status !== 'in_progress' && !(DV.Config.DEBUG && w && w.force)) {
        // choices outside the test are ignored (dialogue may reuse weights)
        return;
      }
      for (const k in w) {
        const v = w[k];
        if (k === 'div') a.divergence += v;
        else if (a.scores[k] !== undefined) a.scores[k] += v;
        else if (a.traits[k] !== undefined) a.traits[k] += v;
      }
      a.choices.push({ sim: this.sims[this.simIndex] || '?', label: label || '', w });
      if (DV.Config.DEBUG) console.log('[Aptitude]', label, JSON.stringify(w), JSON.stringify(this.totals()));
    },
    start() {
      const a = this.data();
      a.status = 'in_progress';
      a.scores = { abnegation: 0, dauntless: 0, erudite: 0, candor: 0, amity: 0 };
      for (const k in a.traits) a.traits[k] = 0;
      a.divergence = 0;
      a.choices = [];
      a.result = null;
      a.results = [];
      a.recordedAs = null;
      a.divergent = false;
      this.simIndex = 0;
    },
    totals() {
      const a = this.data();
      const t = {};
      for (const f of FACTIONS) t[f] = a.scores[f];
      for (const tr in a.traits) {
        const m = TRAIT_MAP[tr];
        if (!m) continue;
        for (const f in m) t[f] += a.traits[tr] * m[f];
      }
      return t;
    },
    compute() {
      const a = this.data();
      const t = this.totals();
      const sorted = FACTIONS.slice().sort((x, y) => t[y] - t[x]);
      const s0 = t[sorted[0]], s1 = t[sorted[1]], s2 = t[sorted[2]];
      // spread-based divergence: several factions nearly tied at a meaningful level
      let div = a.divergence;
      const close2 = s0 > 1 && s1 >= s0 * 0.86;
      const close3 = s0 > 1 && s2 >= s0 * 0.75;
      if (close2) div += 1.5;
      if (close3) div += 2.5;
      const inconclusive = div >= 6 || (close3 && s1 >= s0 * 0.85) || (close2 && div >= 3.5);
      let result, results;
      if (inconclusive) {
        result = 'inconclusive';
        results = sorted.filter((f) => t[f] >= Math.max(0.5, s0 * 0.7)).slice(0, 3);
        if (results.length < 2) results = sorted.slice(0, 2);
      } else {
        result = sorted[0];
        results = [sorted[0]];
      }
      a.result = result;
      a.results = results;
      a.divergent = inconclusive;
      a.recordedAs = inconclusive ? results[0] : result;
      a.divergenceScore = Math.round(div * 10) / 10;
      a.status = 'complete';
      if (DV.Config.DEBUG) console.log('[Aptitude] RESULT', result, results, t, 'div', div);
      return a;
    },
    finalizeRecord() {
      const a = this.data();
      if (!a.recordedAs) a.recordedAs = a.result === 'inconclusive' ? a.results[0] : a.result;
      DV.State.setFlag('aptitude_complete');
      if (a.divergent) DV.State.setFlag('divergent');
    },
    // phrases for Juno's "what did you see me do"
    highlights(n) {
      const a = this.data();
      const out = [];
      for (const ch of a.choices) {
        if (ch.label && ch.label.length < 90 && out.indexOf(ch.label) < 0) out.push(ch.label.replace(/^\[.*?\]\s*/, '').replace(/\.$/, '').toLowerCase());
      }
      // keep the most "weighty" ones
      return out.slice(-n);
    },
    // label shown in the character sheet
    displayResult() {
      const a = this.data();
      if (a.status !== 'complete') return a.status === 'in_progress' ? 'IN PROGRESS' : 'NOT YET TESTED';
      if (a.divergent) return 'INCONCLUSIVE — recorded as ' + DV.Factions.name(a.recordedAs).toUpperCase();
      return DV.Factions.name(a.result).toUpperCase();
    },
  };
  DV.Aptitude = Apt;
})();
