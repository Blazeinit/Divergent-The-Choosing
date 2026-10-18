/* ==========================================================================
   DIVERGENT — the Codex (pure data)
   What you learn about the city by living in it. Each entry opens when its
   `when(S)` is true (DV.Codex checks as you play); S is a small view of the
   save: S.flag(n), S.been(zoneId), S.sector(id), S.knows(faction) (raised in
   it, chose it, met one of its people or walked its streets), S.read(item),
   S.quest(id) (its state), S.apt (the aptitude record), S.player.
   The faction manifestos come from DV.Factions (js/data/factions.js).
   Documents you read are added by themselves (category 'documents').
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  const categories = [
    ['factions', 'The Factions'],
    ['test', 'The Test'],
    ['city', 'The City'],
    ['initiation', 'Initiation'],
    ['documents', 'Documents'],
  ];

  const entries = [
    /* ---------------- the factions: one manifesto each ---------------- */
    ...['abnegation', 'dauntless', 'erudite', 'candor', 'amity'].map((f) => ({
      id: 'manifesto_' + f, cat: 'factions', faction: f,
      title: () => 'The ' + DV.Factions.name(f) + ' Manifesto',
      text: () => DV.Factions.get(f).manifesto,
      when: (S) => S.knows(f),
    })),
    {
      id: 'manifesto_factionless', cat: 'factions', faction: 'factionless', title: 'What the Factionless Say',
      text: () => DV.Factions.get('factionless').manifesto,
      when: (S) => S.sector('factionless') || S.player.faction === 'factionless' || S.flag('gus_e'),
    },
    {
      id: 'faction_before_blood', cat: 'factions', title: 'Faction Before Blood',
      text: 'The founders\' rule, written over the door of every faction headquarters and said at every Choosing: once you choose, your faction comes first, before your family.\n\n' +
        'A transfer can visit home on Visiting Day — if their new faction allows it and their family can bear it. Most families come once. Some never come. ' +
        'Abnegation parents are taught that missing a child is a kind of selfishness, and they miss them anyway.\n\n' +
        'In practice the rule cuts both ways. Leave the faction that raised you and its people stop owing you anything: what you knew there, you have to earn back.',
      when: (S) => S.flag('transferred') || !!S.player.faction || S.quest('aptitude_day') === 'complete',
    },
    {
      id: 'standing', cat: 'factions', title: 'Standing',
      text: 'Every faction keeps its own ledger of you, and none of them show it to you. You find out what they think from what they call you.\n\n' +
        'A Dauntless guard calls a stranger "Outsider" and a friend "Daredevil"; the Candor say "Witness" until they decide whether you lie. ' +
        'Members are called by the member\'s word for them — Initiate first, and more if they last.\n\n' +
        'Standing opens doors that a faction would never admit are doors: what its people will tell you, which of its habits it will teach you, how hard a check pushes back.',
      when: () => true,
    },

    /* ---------------- the test ---------------- */
    {
      id: 'aptitude_test', cat: 'test', title: 'The Aptitude Test',
      text: 'At sixteen every child in the city sits the aptitude test: a serum, a chair, and an hour inside a simulation built to find out what kind of person you are when nobody is watching.\n\n' +
        'The technician is always a volunteer from another faction, so nobody can be accused of recruiting. The result is private, and it is not binding. ' +
        'The next day, at the Choosing Ceremony, you may choose any faction you like.\n\n' +
        'Almost everyone chooses the faction the test gave them. Almost everyone chooses the faction they were raised in. Usually those are the same.',
      when: () => true,
    },
    {
      id: 'the_serum', cat: 'test', title: 'The Serum',
      text: 'A clear liquid, administered at the neck. The simulation serum contains transmitters that carry the scenario to the brain, and a sedative that keeps the body in the chair while the mind runs.\n\n' +
        'Erudite make it. Erudite measure it. Nobody outside Erudite has ever been shown the formula, and nobody outside Erudite has ever been allowed to ask why.',
      when: (S) => S.apt.status !== 'not_started',
    },
    {
      id: 'simulations', cat: 'test', title: 'Simulations',
      text: 'A simulation feels real because, to the brain, it is real: the cold of the water, the weight of the knife, the dog\'s breath. What you choose there is what you would choose anywhere.\n\n' +
        'Most people never know they are dreaming. They react the way the serum expects them to, the simulation reads the reaction, and it ends when it has what it needs.\n\n' +
        'Almost nobody ever stops in the middle of one and thinks: this isn\'t real.',
      when: (S) => S.apt.status === 'complete',
    },
    {
      id: 'inconclusive', cat: 'test', title: 'Inconclusive',
      text: 'Sometimes a result doesn\'t come back as one faction. It comes back as two, or three, nearly tied — and the simulations show a mind that knew it was in one.\n\n' +
        'The word for it is never said out loud in the Testing Center. Technicians who see it are told to report it and record something else. ' +
        'The ones who care about you record something else and don\'t report it.\n\n' +
        'Divergent. The test couldn\'t sort you. The city has never liked things it can\'t sort.',
      when: (S) => S.apt.result === 'inconclusive' || !!S.apt.divergent,
    },
    {
      id: 'protocol_d', cat: 'test', title: 'Protocol D',
      text: 'An Erudite procedure for "irregular aptitude results". The irregular are to be reported within the hour; the technician must not tell the candidate; the receiving faction\'s liaison monitors them through initiation.\n\n' +
        'Dr. Pierce calls it data integrity. The word "monitored" is underlined twice, in pencil, in the only copy you have seen.',
      when: (S) => S.read('protocol_file') || S.flag('asked_pierce_pd'),
    },

    /* ---------------- the city ---------------- */
    {
      id: 'testing_center', cat: 'city', title: 'The Testing Center',
      text: 'A faction-neutral building on Lake Street: grey stone outside, white corridors inside, a waiting hall full of benches and sixteen-year-olds trying not to look at each other.\n\n' +
        'Abnegation run the front desk, Dauntless the checkpoint, Erudite everything behind the locked doors. It is the only building in the city where all five factions work under one roof, one day a year.',
      when: (S) => S.been('testing_center'),
    },
    {
      id: 'the_hub', cat: 'city', title: 'The Hub',
      text: 'The tallest building in the city, black glass to the clouds. The Choosing Ceremony is held there every year, in a hall with five bowls on a table: grey stones, burning coals, water, glass, and earth.\n\n' +
        'You cut your palm and let it bleed into the bowl of the faction you choose. The blood is the vow. The cut is the last thing your family ever does for you.',
      when: (S) => S.been('hub_hall') || !!S.player.faction,
    },
    {
      id: 'the_pit', cat: 'city', title: 'The Pit',
      text: 'The Dauntless compound is underground, carved into the rock under the city: a great cavern of paths without railings, a chasm of rushing water at the bottom, and the whole faction living loud above it.\n\n' +
        'Initiates come in through a hole in a rooftop. There is a net at the bottom. Nobody tells you that before you jump.',
      when: (S) => S.been('d_pit') || S.been('d_compound') || S.player.faction === 'dauntless',
    },
    {
      id: 'merciless_mart', cat: 'city', title: 'The Merciless Mart',
      text: 'Candor headquarters: an old department store with a scale of justice over the door and a floor of black-and-white tiles. ' +
        'Everything happens in the open, in front of everyone. The courtrooms have no doors.',
      when: (S) => S.been('cand_lobby') || S.sector('candor') || S.player.faction === 'candor',
    },
    {
      id: 'erudite_hq', cat: 'city', title: 'Erudite Headquarters',
      text: 'Glass and steel, and a library on every floor. The lights never go out; somebody is always awake, measuring something. ' +
        'The Order Office runs its patrols and its drones from here, and its records of everyone.',
      when: (S) => S.been('eru_hall') || S.sector('erudite') || S.player.faction === 'erudite',
    },
    {
      id: 'abnegation_sector', cat: 'city', title: 'The Abnegation Sector',
      text: 'Grey houses in grey rows, every one the same size, every door unlocked. There are no shops and no signs. ' +
        'The council meets in a plain hall at the centre. The factionless come to the back doors on Tuesdays and nobody writes down their names.',
      when: (S) => S.sector('abnegation') || S.been('abn_street') || S.player.upbringing === 'abnegation',
    },
    {
      id: 'the_fence', cat: 'city', title: 'The Fence',
      text: 'A wall round the city and its farms, with towers, floodlights and Dauntless guards facing outward. Nobody you know has ever been through the gate. ' +
        'Amity trucks go out to the far fields under escort and come back before dark.\n\n' +
        'The guards say it keeps something out. They never say what.',
      when: (S) => S.sector('farm') || S.been('amity_farm'),
    },
    {
      id: 'the_marsh', cat: 'city', title: 'The Marsh',
      text: 'Where the lake used to be: reeds, mud flats and a long flat light to the horizon. The old piers still stand in it, going nowhere.',
      when: (S) => S.sector('marsh'),
    },
    {
      id: 'circle_line', cat: 'city', title: 'The Circle Line',
      text: 'The underground railway still runs, on Erudite timetables and Abnegation maintenance. The trains are old and clean and nobody talks in them. ' +
        'The Dauntless ride the elevated tracks instead, on the outside of the cars.',
      when: (S) => S.been('metro'),
    },
    {
      id: 'order_office', cat: 'city', title: 'The Office of Public Order',
      text: 'Erudite\'s police: patrols of Dauntless hired for the work, Erudite supervisors with tablets, and the drones. They stop people at random and ask two questions, name and faction, and check your face against the answer.\n\n' +
        'Get noticed too often and they take you in for a couple of hours. Nobody is ever charged with anything. Everyone comes out quieter.',
      when: (S) => (S.d.world.order && (S.d.world.order.stops || S.d.world.order.notice)) || S.sector('downtown'),
    },

    /* ---------------- initiation ---------------- */
    {
      id: 'the_choosing', cat: 'initiation', title: 'The Choosing',
      text: 'The day after the test. Every sixteen-year-old in the city, in alphabetical order, in front of everyone they have ever known. ' +
        'Most choose the bowl they were raised beside. The ones who don\'t are called transfers, and the hall makes a sound when they do it.',
      when: (S) => !!S.player.faction || S.been('hub_hall'),
    },
    {
      id: 'initiation', cat: 'initiation', title: 'Initiation',
      text: 'Choosing is a promise. Initiation is where the faction checks you meant it. Every faction runs its own, and every faction cuts the ones who fail.\n\n' +
        'The cut don\'t go home. Home isn\'t theirs any more. They go factionless.',
      when: (S) => !!S.player.faction,
    },
    {
      id: 'fear_landscape', cat: 'initiation', title: 'Fear Simulations',
      text: 'Dauntless Stage Two: the serum again, but this time it finds the fear that is already yours and puts you inside it until your heart slows down.\n\n' +
        'Initiates are ranked on how fast they calm down. The very fast are watched. The ones who simply stop the simulation, as if they knew it wasn\'t real, are watched more closely still.',
      when: (S) => S.been('fear_tank') || S.been('fear_beam') || S.flag('stage_two'),
    },
    {
      id: 'the_cut', cat: 'initiation', title: 'The Cut',
      text: 'At the end of Stage One the board is read out. Those below the red line leave the compound that night with what they came in wearing.',
      when: (S) => S.player.faction === 'factionless' || S.flag('cut_read'),
    },
  ];

  DV.CodexData = { categories, entries };
})();
