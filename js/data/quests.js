/* ==========================================================================
   DIVERGENT — quest definitions (Build 1)
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
      { id: 'checkin', text: 'Check in at Reception (lobby, east desk)', target: { npc: 'marion_hale' } },
      { id: 'security', text: 'Show your name badge at the security checkpoint', target: { npc: 'kade_mercer' } },
      { id: 'wait', text: 'Wait to be called (explore, talk, or rest on a bench)', target: { room: 'hall' } },
      { id: 'report', text: 'Report to Testing Room 4', target: { door: 'tr4_door' } },
      { id: 'technician', text: 'Speak with your technician, Juno Ashgrove', target: { npc: 'juno_ashgrove' } },
      { id: 'simulation', text: 'Complete the aptitude simulation', target: { x: 48.5, z: 11.6 } },
      { id: 'results', text: 'Discuss your results with Juno', target: { npc: 'juno_ashgrove' } },
    ],
    rewards: { xp: 150 },
    completeText: 'The aptitude test is over. Whatever the result, the choice is still yours. Tomorrow, at the Choosing Ceremony.',
  });

  Q({
    id: 'lost_bird', title: 'The Wooden Bird', type: 'side', giver: 'pip_hollis',
    summary: 'Pip Hollis, an Amity candidate, lost a small carved bird her grandmother made. She is too embarrassed to ask the staff for help.',
    objectives: [
      { id: 'find', text: 'Find Pip\'s carved wooden bird', target: { room: 'hall' } },
      { id: 'storage', text: 'Search the Lost & Found bin in the Storage Room', hidden: true, target: { x: 59.4, z: 35.1 } },
      { id: 'return', text: 'Return the bird to Pip', hidden: true, target: { npc: 'pip_hollis' } },
    ],
    rewards: { xp: 70, rep: { amity: 6 } },
    completeText: 'You returned the carved bird to Pip.',
  });

  Q({
    id: 'cold_feet', title: 'Cold Feet', type: 'side', giver: 'elias_thorne',
    summary: 'An Abnegation candidate, Elias Thorne, has been hiding in the washroom instead of waiting to be called. His test is scheduled for 11:30 in Room 4. If he is not ready by noon, he will be marked absent.',
    objectives: [
      { id: 'find', text: 'Find out why Elias Thorne is hiding', target: { npc: 'elias_thorne' } },
      { id: 'learn', text: 'Learn what Elias is really afraid of', hidden: true, target: { npc: 'elias_thorne' } },
      { id: 'convince', text: 'Help Elias face his test before 12:00', hidden: true, target: { npc: 'elias_thorne' } },
      { id: 'after', text: 'Check on Elias after his test', hidden: true, target: { npc: 'elias_thorne' } },
    ],
    rewards: { xp: 110, rep: { abnegation: 8 } },
    completeText: 'Elias took his test.',
  });

  Q({
    id: 'paper_trail', title: 'Paper Trail', type: 'side', giver: 'marion_hale',
    summary: 'Marion Hale at Reception needs a sealed envelope carried to Director Wren\'s office. She cannot leave her desk.',
    objectives: [
      { id: 'deliver', text: 'Deliver the sealed envelope to Dr. Wren (Director\'s Office, Administration)', target: { npc: 'cassius_wren' } },
      { id: 'return', text: 'Bring the signed amendment back to Marion', hidden: true, target: { npc: 'marion_hale' } },
    ],
    rewards: { xp: 60, rep: { abnegation: 5 } },
    completeText: 'You delivered the envelope and returned with Dr. Wren\'s signature.',
  });

  Q({
    id: 'initiation', title: 'Initiation Starts Early', type: 'side', giver: 'rook_delaney',
    summary: 'Rook Delaney, a Dauntless candidate, dared you to steal a cup of staff coffee from the Staff Break Room without getting caught.',
    objectives: [
      { id: 'coffee', text: 'Take a cup of staff coffee from the Break Room — unseen', target: { x: 69, z: 23 } },
      { id: 'return', text: 'Bring the coffee to Rook', hidden: true, target: { npc: 'rook_delaney' } },
    ],
    rewards: { xp: 50, rep: { dauntless: 6 } },
    completeText: 'You answered Rook\'s dare.',
  });

  Q({
    id: 'protocol_d', title: 'Protocol D', type: 'side', giver: 'mara_voss',
    summary: 'Mara Voss overheard the Director say "Protocol D" to a proctor. Staff go quiet when it is mentioned. She wants to know what it is — and she has asked for your help.',
    objectives: [
      { id: 'ask', text: 'Find out what "Protocol D" means', target: { npc: 'mara_voss' } },
      { id: 'archive', text: 'Get into the Records Archive (Administration)', hidden: true, target: { door: 'rec_door' } },
      { id: 'file', text: 'Find the Protocol D file in the archive', hidden: true, target: { x: 1.2, z: 44.35 } },
      { id: 'report', text: 'Tell Mara what you found', hidden: true, target: { npc: 'mara_voss' } },
    ],
    rewards: { xp: 120, rep: { candor: 6 } },
    completeText: 'You and Mara now know what Protocol D is. Neither of you can unknow it.',
  });

  Q({
    id: 'finders_keepers', title: 'Finders Keepers', type: 'side', giver: null,
    summary: 'In the Lost & Found bin you found a proctor\'s keycard belonging to "CALDER, I." It opens the Proctor Station and the Observation Gallery.',
    objectives: [
      { id: 'return', text: 'Return the keycard to Proctor Ines Calder — or keep it', target: { npc: 'ines_calder' } },
    ],
    rewards: { xp: 40, rep: { erudite: 5 } },
    completeText: 'You returned the keycard to Ines Calder.',
  });
})();
