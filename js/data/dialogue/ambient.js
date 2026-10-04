/* ==========================================================================
   DIVERGENT — Tier 1 ambient dialogue generator
   Builds a short, memory-aware tree from an NPC's `lines` block:
     greet[first, again], nervous, faction, test, role, extra[{q,a}], rumor, post
   Candidates and staff get different topic sets. Every NPC reacts to
   insults, previous meetings, the player's clothing and the test outcome.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  function factionAside(c) {
    const f = c.def.faction;
    const up = c.upbringing();
    if (up === f) return ' Same as your family, if I\'m any judge.';
    if (c.outfit() === f) return ' And you\'re wearing our colors. Huh.';
    if (c.outfit() === 'neutral') return ' You — I can\'t place. Those plain clothes do their job.';
    return '';
  }

  DV.AmbientDialogue = {
    build(def) {
      const L = def.lines || {};
      const candidate = def.role === 'candidate';
      const greet = L.greet || ['Hello.', 'Hello again.'];
      const back = (c) => c.goto('hub');
      const topics = (c) => {
        const ch = [];
        if (candidate) {
          ch.push({ text: 'Nervous about the test?', to: 'nervous', if: () => !c.aptDone() });
          ch.push({ text: 'What faction are you from?', to: 'faction' });
          ch.push({ text: 'What happens in there?', to: 'test', if: () => !c.aptDone() });
          ch.push({ text: 'How did your test go?', to: 'post', if: () => !!L.post && c.mem('sawPost') !== true && DV.NPCs.get(def.id) && c.after(testEndTime(def)) });
        } else {
          ch.push({ text: 'What do you do here?', to: 'role' });
          ch.push({ text: 'What faction are you from?', to: 'faction' });
          ch.push({ text: 'What can you tell me about the test?', to: 'test', if: () => !c.aptDone() });
          ch.push({ text: 'I just finished my test.', to: 'post', if: () => c.aptDone() && !!L.post && !c.mem('sawPost') });
        }
        (L.extra || []).forEach((e, i) => ch.push({ text: e.q, to: 'extra' + i, if: e.if }));
        if (L.rumor) ch.push({ text: 'Heard anything interesting today?', to: 'rumor' });
        ch.push({ text: 'Whatever. (Walk away rudely)', end: true, tag: 'Rude', if: () => !c.mem('insulted'), effect: (cc) => { cc.addRel(-6, true); cc.insulted(); } });
        ch.push({ text: 'Goodbye.', end: true });
        return ch;
      };
      const nodes = {
        start: {
          text: (c) => {
            if (c.mem('insulted') && c.rel() < 0) return '...Oh. You. What do you want?';
            const g = c.firstTime ? greet[0] : greet[1] || greet[0];
            return g;
          },
          choices: (c) => topics(c),
        },
        hub: { text: (c) => (c.mem('insulted') && c.rel() < 0 ? 'Anything else? Make it quick.' : 'Anything else?'), choices: (c) => topics(c) },
        nervous: { text: (c) => L.nervous || 'A little. Who isn\'t?', next: 'hub', nextText: 'I see.' },
        faction: { text: (c) => (L.faction || 'I\'m ' + DV.Factions.name(def.faction) + '.') + factionAside(c), next: 'hub', nextText: 'I see.' },
        test: { text: (c) => L.test || 'Nobody really knows until they\'re in it.', next: 'hub', nextText: 'Thanks.' },
        role: { text: (c) => L.role || 'I work here.', next: 'hub', nextText: 'I see.' },
        rumor: { text: (c) => (c.aptDone() && L.rumorPost ? L.rumorPost : L.rumor), next: 'hub', nextText: 'Interesting.' },
        post: { text: (c) => L.post, onEnter: (c) => c.setMem('sawPost', true), next: 'hub', nextText: 'I understand.' },
      };
      (L.extra || []).forEach((e, i) => {
        nodes['extra' + i] = { text: e.a, next: 'hub', nextText: 'I see.', onEnter: e.onEnter };
      });
      void back;
      return { entry: () => 'start', nodes };
    },
  };

  // when a candidate finishes their own test (for "How did your test go?")
  function testEndTime(def) {
    const s = def.schedule || [];
    const idx = s.findIndex((e) => /_chair$/.test(e.to || ''));
    if (idx >= 0 && s[idx + 1]) return s[idx + 1].t;
    return '23:59';
  }
  DV.AmbientDialogue.testEndTime = testEndTime;
})();
