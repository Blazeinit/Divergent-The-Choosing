/* ==========================================================================
   DIVERGENT — Build 2 glue
   The bridge from Aptitude Day into the Choosing: the gate opens after your
   results, the bus home, your faction once you've chosen it, and who the
   other candidates choose (which depends on what happened between you on
   Aptitude Day).
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  const FACTIONS = ['abnegation', 'amity', 'candor', 'dauntless', 'erudite'];
  // what lies in each bowl at the ceremony
  const BOWL = {
    abnegation: { what: 'grey stones', verb: 'over the grey stones', color: 0x8a8a86 },
    erudite: { what: 'water', verb: 'over the water', color: 0x3a6fa8 },
    candor: { what: 'glass', verb: 'over the glass', color: 0xd8dde0 },
    amity: { what: 'earth', verb: 'over the earth', color: 0x5a4028 },
    dauntless: { what: 'burning coals', verb: 'over the coals', color: 0xd0501c },
  };

  const B2 = {
    FACTIONS,
    BOWL,

    /* ---------------- leaving the Testing Center ---------------- */
    beginGoingHome() {
      if (!DV.State.flag('results_discussed') || DV.Quests.started('the_choosing')) return;
      DV.Quests.start('the_choosing');
      DV.Story.pa('Candidates who have completed testing may now leave the building. The northbound bus departs from the front gate.');
    },
    canGoHome() {
      return DV.Quests.isActive('the_choosing') && DV.Quests.obj('the_choosing', 'leave') !== 'done' && DV.World.current && DV.World.current.id === DV.Game.homeZoneId();
    },
    rideHome() {
      DV.Dialogue.startScene('ride_home');
    },

    /* ---------------- the choice ---------------- */
    setFaction(f) {
      const st = DV.State.data;
      st.player.faction = f;
      st.story = st.story || {};
      st.story.chosen = f;
      const transfer = f !== st.player.upbringing;
      DV.State.setFlag('chose_' + f);
      if (transfer) DV.State.setFlag('transferred');
      DV.Reputation.add(f, transfer ? 12 : 15);
      if (transfer) DV.Reputation.add(st.player.upbringing, -6);
      DV.State.note('The Choosing: you chose ' + DV.Factions.name(f) + (transfer ? ', leaving ' + DV.Factions.name(st.player.upbringing) + ' behind.' : ', the faction you were raised in.'));
      DV.Events.emit('faction:chosen', { faction: f, transfer });
    },
    chosen() {
      return DV.State.data.story && DV.State.data.story.chosen;
    },
    // your new faction hands you its clothes, and you put them on
    dressFor(f, how) {
      const id = 'clothes_' + f;
      if (!DV.Items.get(id)) return;
      if (!DV.Inventory.has(id)) DV.Inventory.add(id, 1, true);
      if (DV.State.data.player.outfit !== f) DV.Inventory.use(id);
      DV.UI.notify(how || 'You change into ' + DV.Items.get(id).name + '.', 'info');
    },
    // your parents look the same at dinner and at the ceremony
    parentApp(which) {
      const pl = DV.State.data.player, f = pl.upbringing;
      const app = DV.Character.fromFaction(f, which === 'mom' ? 'f' : 'm', which + ':' + pl.name + f, { age: which === 'mom' ? 44 : 47 });
      app.height = (app.height || 1) * 1.06;
      return app;
    },
  };

  // the bus at the curb
  DV.DialogueDB.add('ride_home', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Bus Driver', faction: 'abnegation',
        text: '[The northbound bus idles at the curb, half empty. The driver, in Abnegation grey, nods you aboard.]\n\nLast run before curfew. Going home?',
        choices: [
          { text: 'Yes. Take me home.', end: true, effect: () => { DV.Chapter.start('home'); } },
          { text: 'Not yet.', end: true },
        ],
      },
    },
  });

  DV.Build2 = B2;
})();
