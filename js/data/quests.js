/* ==========================================================================
   DIVERGENT — quest definitions (Builds 1 & 2)
   Objectives are revealed in order unless `hidden` (revealed by scripts)
   or `parallel` (active immediately). `target` drives the compass marker:
   { npc: id } | { spot: id } | { room: id } | { door: id } | { x, z }
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const Q = (d) => DV.QuestDB.add(d);

  Q({
    id: 'aptitude_day', title: 'Aptitude Day', type: 'main', giver: null,
    summary: 'Today you take the aptitude test. Tomorrow, at the Choosing Ceremony, you choose the faction you will belong to for the rest of your life.',
    startText: 'You arrived at the Sector 4 Aptitude Testing Center just before eight. Candidates check in at reception, show their name badge at security, and wait to be called.',
    objectives: [
      { id: 'checkin', text: 'Check in at Reception (lobby, east desk)', target: { npc: 'martha_bell' } },
      { id: 'security', text: 'Show your name badge at the security checkpoint', target: { npc: 'dean_walsh' } },
      { id: 'wait', text: 'Wait to be called (explore, talk, or rest on a bench)', target: { room: 'hall' } },
      { id: 'report', text: 'Report to Testing Room 4', target: { door: 'tr4_door' } },
      { id: 'technician', text: 'Speak with your technician, Claire Dawson', target: { npc: 'claire_dawson' } },
      { id: 'simulation', text: 'Complete the aptitude simulation', target: { x: 48.5, z: 11.6 } },
      { id: 'results', text: 'Discuss your results with Claire', target: { npc: 'claire_dawson' } },
    ],
    rewards: { xp: 150 },
    completeText: 'The aptitude test is over. Whatever the result, the choice is still yours. Tomorrow, at the Choosing Ceremony.',
  });

  Q({
    id: 'lost_bird', title: 'The Wooden Bird', type: 'side', giver: 'lucy_barnes',
    summary: 'Lucy Barnes, an Amity candidate, lost a small carved bird her grandmother made. She is too embarrassed to ask the staff for help.',
    objectives: [
      { id: 'find', text: 'Find Lucy\'s carved wooden bird', target: { room: 'hall' } },
      { id: 'storage', text: 'Search the Lost & Found bin in the Storage Room', hidden: true, target: { x: 59.4, z: 35.1 } },
      { id: 'return', text: 'Return the bird to Lucy', hidden: true, target: { npc: 'lucy_barnes' } },
    ],
    rewards: { xp: 70, rep: { amity: 6 } },
    completeText: 'You returned the carved bird to Lucy.',
  });

  Q({
    id: 'cold_feet', title: 'Cold Feet', type: 'side', giver: 'daniel_webb',
    summary: 'An Abnegation candidate, Daniel Webb, has been hiding in the washroom instead of waiting to be called. His test is scheduled for 11:30 in Room 4. If he is not ready by noon, he will be marked absent.',
    objectives: [
      { id: 'find', text: 'Find out why Daniel Webb is hiding', target: { npc: 'daniel_webb' } },
      { id: 'learn', text: 'Learn what Daniel is really afraid of', hidden: true, target: { npc: 'daniel_webb' } },
      { id: 'convince', text: 'Help Daniel face his test before 12:00', hidden: true, target: { npc: 'daniel_webb' } },
      { id: 'after', text: 'Check on Daniel after his test', hidden: true, target: { npc: 'daniel_webb' } },
    ],
    rewards: { xp: 110, rep: { abnegation: 8 } },
    completeText: 'Daniel took his test.',
  });

  Q({
    id: 'paper_trail', title: 'Paper Trail', type: 'side', giver: 'martha_bell',
    summary: 'Martha Bell at Reception needs a sealed envelope carried to Director Pierce\'s office. She cannot leave her desk.',
    objectives: [
      { id: 'deliver', text: 'Deliver the sealed envelope to Dr. Pierce (Director\'s Office, Administration)', target: { npc: 'alan_pierce' } },
      { id: 'return', text: 'Bring the signed amendment back to Martha', hidden: true, target: { npc: 'martha_bell' } },
    ],
    rewards: { xp: 60, rep: { abnegation: 5 } },
    completeText: 'You delivered the envelope and returned with Dr. Pierce\'s signature.',
  });

  Q({
    id: 'initiation', title: 'Initiation Starts Early', type: 'side', giver: 'nate_russo',
    summary: 'Nate Russo, a Dauntless candidate, dared you to steal a cup of staff coffee from the Staff Break Room without getting caught.',
    objectives: [
      { id: 'coffee', text: 'Take a cup of staff coffee from the Break Room — unseen', target: { x: 69, z: 23 } },
      { id: 'return', text: 'Bring the coffee to Nate', hidden: true, target: { npc: 'nate_russo' } },
    ],
    rewards: { xp: 50, rep: { dauntless: 6 } },
    completeText: 'You answered Nate\'s dare.',
  });

  Q({
    id: 'protocol_d', title: 'Protocol D', type: 'side', giver: 'jenna_morales',
    summary: 'Jenna Morales overheard the Director say "Protocol D" to a proctor. Staff go quiet when it is mentioned. She wants to know what it is — and she has asked for your help.',
    objectives: [
      { id: 'ask', text: 'Find out what "Protocol D" means', target: { npc: 'jenna_morales' } },
      { id: 'archive', text: 'Get into the Records Archive (Administration)', hidden: true, target: { door: 'rec_door' } },
      { id: 'file', text: 'Find the Protocol D file in the archive', hidden: true, target: { x: 1.2, z: 44.35 } },
      { id: 'report', text: 'Tell Jenna what you found', hidden: true, target: { npc: 'jenna_morales' } },
    ],
    rewards: { xp: 120, rep: { candor: 6 } },
    completeText: 'You and Jenna now know what Protocol D is. Neither of you can unknow it.',
  });

  Q({
    id: 'finders_keepers', title: 'Finders Keepers', type: 'side', giver: null,
    summary: 'In the Lost & Found bin you found a proctor\'s keycard belonging to "LIN, S." It opens the Proctor Station and the Observation Gallery.',
    objectives: [
      { id: 'return', text: 'Return the keycard to Proctor Sarah Lin — or keep it', target: { npc: 'sarah_lin' } },
    ],
    rewards: { xp: 40, rep: { erudite: 5 } },
    completeText: 'You returned the keycard to Sarah Lin.',
  });
  /* ------------------------------ Build 2 ------------------------------ */
  Q({
    id: 'the_choosing', title: 'The Choosing', type: 'main', giver: null,
    summary: 'The test is over. Tonight you go home to your family. Tomorrow, at the Choosing Ceremony in the Hub, you cut your palm and let your blood fall into one of five bowls — and that faction is yours for the rest of your life.',
    startText: 'Candidates who have finished testing may go home. Buses leave from the street outside the front gate.',
    objectives: [
      { id: 'leave', text: 'Go home — the bus waits outside the front gate', target: { x: 47, z: 78.6 } },
      { id: 'dinner', text: 'Have dinner with your family', hidden: true, target: { x: 3.4, z: 3.6 } },
      { id: 'sleep', text: 'Get some sleep — your room is at the back', hidden: true, target: { x: 15.4, z: 8.9 } },
      { id: 'ceremony', text: 'The Choosing Ceremony: wait for your name', hidden: true, target: { x: 22, z: 14 } },
      { id: 'choose', text: 'Cut your palm and choose a faction', hidden: true, target: { x: 22, z: 14 } },
      { id: 'follow', text: 'Follow your new faction', hidden: true },
    ],
    rewards: { xp: 200 },
    completeText: 'You chose. Faction before blood.',
  });
  /* ------------------------------ Build 3: Dauntless ------------------------------ */
  const Ini = () => DV.Initiation;
  const trainText = () => {
    const I = Ini();
    if (!I) return 'Training';
    const d = DV.Clock.day(), m = DV.Clock.minutes();
    if (d < I.FIRST) return 'Training starts on Day ' + I.FIRST + ' at 08:00. Get some sleep.';
    const b = I.pending();
    if (b) {
      const now = m >= DV.U.parseTime(b.t0);
      return 'Day ' + d + ' — ' + b.title + ', ' + b.where + (now ? ' (now, until ' + b.t1 + ')' : ' at ' + b.t0);
    }
    if (m >= DV.U.parseTime('20:30') || m < DV.U.parseTime('04:00')) return 'Day ' + d + ' is done. Sleep — your bunk is in the dormitory.';
    return 'Day ' + d + ' — free until the morning. Dinner at 19:00; lights out 23:00.';
  };
  const trainTarget = () => {
    const I = Ini();
    if (!I) return null;
    const b = I.pending();
    if (b && DV.Clock.minutes() >= DV.U.parseTime(b.t0) - 40) return b.kind === 'fear' ? { x: 30.5, z: -15 } : { room: 'training' };
    if (I.canSleep()) return { x: 1.75, z: -2.3 };
    return null;
  };
  Q({
    id: 'stage_one', title: 'Stage One', type: 'main', giver: null,
    summary: 'Dauntless initiation, stage one: the body. Three days of guns, knives and fists, and a ranking at the end of it. The bottom of the board doesn\'t become Dauntless. It doesn\'t become anything.',
    startText: 'Mark Rivera: "Initiation starts at dawn. Eat. Find a bunk. Sleep if you can."',
    objectives: [
      { id: 'bunk', text: 'Find your bunk in the dormitory (west of the Pit) and get some sleep', target: { x: 1.75, z: -2.3 } },
      { id: 'train', text: trainText, target: trainTarget, hidden: true },
      { id: 'final', text: 'Final rankings — Training Room, Day 6, 08:00', hidden: true, target: { room: 'training' } },
      { id: 'stage2', text: 'Stage Two: report to the Simulation Room (north side of the Pit)', hidden: true, target: { x: 30.5, z: -15 } },
    ],
    rewards: { xp: 250, rep: { dauntless: 10 } },
    completeText: 'You made it through Stage One. Stage Two is in your head.',
  });
  Q({
    id: 'hands_up', title: 'Hands Up', type: 'side', giver: null,
    summary: 'Somebody in the class is going to be cut, and everyone can see who. He can\'t throw a punch without apologising. You could teach him — in the evenings, at the bags, when nobody\'s ranking anything.',
    objectives: [
      { id: 'ask', text: () => 'Talk to ' + (Ini() ? Ini().first(Ini().underdog()) : 'him') + ' about the fights', target: () => ({ npc: Ini() ? Ini().underdog() : 'd_daniel' }) },
      { id: 'train', text: () => 'Work the bags with ' + (Ini() ? Ini().first(Ini().underdog()) : 'him') + ' after dinner (20:00–22:00) — ' + ((Ini() && Ini().st().training[Ini().underdog()]) || 0) + '/2', hidden: true, target: { x: 18.5, z: -28.3 } },
      { id: 'fight', text: () => 'See ' + (Ini() ? Ini().first(Ini().underdog()) : 'him') + ' through the final rankings', hidden: true, target: { room: 'training' } },
    ],
    rewards: { xp: 120, rep: { dauntless: 3, abnegation: 4 } },
    completeText: 'You taught someone to keep their hands up.',
  });
  Q({
    id: 'ink', title: 'Ink', type: 'side', giver: 'd_nina',
    summary: 'Nina Kaur runs the tattoo parlour on the east side of the Pit. Everyone gets one eventually. Joey Brennan has been working up to his for three years.',
    objectives: [
      { id: 'visit', text: 'Visit Nina\'s tattoo parlour (east side of the Pit)', target: { x: 63, z: -6 } },
      { id: 'design', text: 'Choose your first tattoo', hidden: true, target: { npc: 'd_nina' } },
    ],
    rewards: { xp: 60, rep: { dauntless: 5 } },
    completeText: 'Your first tattoo. It stings for days and you keep looking at it.',
  });
  Q({
    id: 'zip_line', title: 'The Zip Line', type: 'side', giver: 'd_bo',
    summary: 'Bo Kaminski runs the zip line off the top of the Hancock building, after dark, for members — and for initiates he likes the look of.',
    objectives: [
      { id: 'meet', text: 'Meet Bo by the Training Passage at 21:30', target: { x: 24, z: -12.5 } },
      { id: 'ride', text: 'Ride the zip line', hidden: true },
    ],
    rewards: { xp: 80, rep: { dauntless: 8 } },
    completeText: 'You flew over the city in the dark, screaming, and it was the best thing that has ever happened to you.',
  });
  Q({
    id: 'bad_blood', title: 'Bad Blood', type: 'side', giver: null,
    summary: 'Josh Miller has decided initiation is a contest of who can make someone else fall. He\'s chosen who. Then he started watching you.',
    objectives: [
      { id: 'notice', text: () => 'Josh is going after ' + (Ini() ? Ini().first(Ini().underdog()) : 'someone') + '. Do something about it — or don\'t', target: { npc: 'd_josh' } },
      { id: 'chasm', text: 'Survive the night', hidden: true },
      { id: 'after', text: 'Decide what to do about Josh', hidden: true, target: { npc: 'd_mark' } },
    ],
    rewards: { xp: 100, rep: { dauntless: 4 } },
    completeText: 'Josh Miller won\'t be standing behind anyone at the railing again.',
  });

  Q({
    id: 'new_faction', title: 'Initiate', type: 'main', giver: null,
    summary: 'Your first day in your new faction.',
    objectives: [
      { id: 'arrive', text: 'Arrive with your new faction', target: null },
    ],
    rewards: { xp: 100 },
    completeText: 'You made it in. What happens next is up to you.',
  });
})();
