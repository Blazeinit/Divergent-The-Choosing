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
    // walked all the way to your own front door (or, from Amity, to the truck at the Fence gate)
    walkHome() {
      DV.Dialogue.startScene(DV.State.data.player.upbringing === 'amity' ? 'truck_home' : 'walk_home');
    },
    // where the objective marker points: the bus stop, or your door once you're nearer to it
    homeTarget() {
      const bus = { x: 47, z: 78.6 };
      const CM = DV.CityMap, h = CM && CM.homes[DV.State.data.player.upbringing];
      const zone = DV.World.current;
      if (!h || !zone || zone.id !== 'testing_center') return bus;
      const P = DV.Player;
      return Math.hypot(P.x - h.x, P.z - h.z) < Math.hypot(P.x - bus.x, P.z - bus.z) ? { x: h.x, z: h.z } : bus;
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

  // the walk home ends at the door
  DV.DialogueDB.add('walk_home', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Home',
        text: () => {
          const f = DV.State.data.player.upbringing;
          return f === 'abnegation' ? '[Your street. Grey houses, all the same, all lit the same; yours is the one with the light on in the kitchen. The door is never locked.]'
            : f === 'erudite' ? '[The lobby of your building smells of floor polish and someone\'s reheated coffee. Your floor. Your door. Through it, voices discussing something precisely.]'
              : f === 'candor' ? '[Your building\'s door, the black-and-white tiles in the hall. Somebody upstairs is arguing — honestly, loudly — about whose turn it is to sweep.]'
                : '[The stairwell is dark and loud with music from somewhere. Your door has a dent in it from the time your brother kicked it shut.]';
        },
        choices: [
          { text: 'Go inside.', end: true, effect: () => { DV.Chapter.start('home', { walked: true }); } },
          { text: 'Not yet.', end: true },
        ],
      },
    },
  });
  DV.DialogueDB.add('truck_home', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Amity Driver', faction: 'amity',
        text: '[An Amity truck idles inside the Fence gate, its bed half full of empty apple crates. The driver waves you over with a smile.]\n\nHeading back to the farms? Climb up — there\'s room on the crates.',
        choices: [
          { text: 'Climb up. Take me home.', end: true, effect: () => { DV.Chapter.start('home', { walked: true }); } },
          { text: 'Not yet.', end: true },
        ],
      },
    },
  });

  DV.Build2 = B2;
})();
