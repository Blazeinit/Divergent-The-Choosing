/* ==========================================================================
   DIVERGENT — simulation scene trees
   Choices carry hidden `apt` weights (factions / traits / div). Labels are
   deliberately free of faction names — behaviour is tracked invisibly.
   Effects call into the running simulation script via DV.Sim.call().
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const T = (id, tree) => DV.DialogueDB.add(id, tree);
  const S = (name, arg) => () => DV.Sim.call(name, arg);
  const held = (x) => () => DV.Sim.held === x;

  /* ============================== SIM 1: THE PLATFORM ============================== */
  T('sim1_table', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: '', text: '[Two objects lie on a steel table: a length of rebar, cold and heavy — and an unlit road flare.]\n\nA voice comes from everywhere at once: "CHOOSE."',
        choices: [
          { text: 'Take the steel rod.', end: true, apt: { aggression: 0.5, bravery: 0.5 }, aptLabel: 'chose the steel rod', effect: S('take', 'rod') },
          { text: 'Take the flare.', end: true, apt: { logic: 0.5, peacefulness: 0.3 }, aptLabel: 'chose the flare', effect: S('take', 'flare') },
          { text: 'Take neither.', end: true, apt: { resistance: 0.5, peacefulness: 0.3 }, aptLabel: 'refused to choose a weapon', effect: S('take', null) },
          { text: 'Why should I choose at all? Who\'s asking?', check: { attr: 'resolve', dc: 6 }, to: 'why', apt: { resistance: 1, div: 1 }, aptLabel: 'questioned the voice' },
        ],
      },
      why: {
        speaker: '', text: '[The voice does not answer. The table is simply... gone. Somewhere at the far end of the platform, something growls.]',
        onEnter: () => DV.Sim.call('take', null),
        choices: [{ text: '...', end: true }],
      },
    },
  });

  T('sim1_dog', {
    entry: (c) => (DV.Sim.call('dogState') === 'calm' ? 'calm' : 'start'),
    nodes: {
      start: {
        speaker: '', text: (c) => {
          let t = '[The dog is huge — ribs showing, lips peeled back from yellow teeth. A low growl rolls out of its chest.]';
          if (DV.Sim.flag('observed')) t += '\n\n[Its hind leg is caught in a loop of snare wire. It isn\'t hunting. It\'s terrified.]';
          return t;
        },
        choices: [
          { text: 'Strike it with the steel rod.', if: held('rod'), end: true, apt: { aggression: 2, dauntless: 1, bravery: 1 }, aptLabel: 'struck the dog with the rod', effect: S('dogResolve', 'fought') },
          { text: 'Light the flare and drive it back.', if: held('flare'), end: true, apt: { bravery: 1, dauntless: 0.5, logic: 0.5 }, aptLabel: 'drove the dog back with fire', effect: S('dogResolve', 'flare_wave') },
          { text: 'Throw the lit flare down the platform, away from everyone.', if: held('flare'), end: true, apt: { logic: 1.5, peacefulness: 1 }, aptLabel: 'distracted the dog instead of hurting it', effect: S('dogResolve', 'flare_throw') },
          { text: 'Kneel slowly and hold out your hand.', to: 'kneel', apt: { peacefulness: 2, amity: 0.5 }, aptLabel: 'knelt and offered the dog a hand' },
          { text: 'Work the snare wire off its leg.', if: () => DV.Sim.flag('observed'), end: true, apt: { selflessness: 1, peacefulness: 1, observation: 1, logic: 0.5 }, aptLabel: 'freed the dog from the snare', effect: S('dogResolve', 'freed') },
          { text: 'Shout and make yourself huge.', check: { attr: 'strength', dc: 7 }, end: true, apt: { bravery: 1, resistance: 1 }, aptLabel: 'stood your ground and roared', effect: S('dogResolve', 'shout') },
          { text: 'Stand perfectly still and watch it.', end: true, apt: { observation: 1 }, aptLabel: 'watched the dog instead of acting', effect: S('observeNow') },
          { text: 'This isn\'t real. Stop.', check: { attr: 'resolve', dc: 7 }, end: true, apt: { div: 3 }, aptLabel: 'told the simulation to stop', effect: S('dogResolve', 'aware') },
          { text: '(Back away.)', end: true },
        ],
      },
      kneel: {
        speaker: '', text: (c) => (DV.Stats.attr('resolve') >= 5 || DV.Sim.flag('observed')
          ? '[You sink to one knee. Your hand shakes; you keep it out anyway. The dog\'s growl stutters. It stretches its neck, sniffs your fingers — and lowers its great head to the concrete.]'
          : '[You sink to one knee. The dog lunges — teeth snap an inch from your fingers — and you fall back hard. It circles, still growling.]'),
        onEnter: () => {
          if (DV.Stats.attr('resolve') >= 5 || DV.Sim.flag('observed')) DV.Sim.call('dogResolve', 'calmed');
          else { DV.Sim.call('scare'); DV.Aptitude.record({ bravery: 0.5 }, 'held your ground after the dog snapped'); }
        },
        choices: [{ text: '...', end: true }],
      },
      calm: {
        speaker: '', text: '[The dog lies still, watching you with tired eyes. Its tail thumps once against the platform.]',
        choices: [{ text: '(Leave it be.)', end: true }],
      },
    },
  });

  T('sim1_child', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: 'Little Boy', text: (c) => (DV.Sim.call('dogNear') ? '[The boy is frozen, staring at the dog, lip trembling.] "Is — is it a nice dog?"' : '"Have you seen my puppy? I heard a puppy."'),
        choices: [
          { text: 'Get behind me. Now.', end: true, apt: { selflessness: 2, bravery: 1 }, aptLabel: 'put yourself between the child and the dog', effect: S('child', 'behind') },
          { text: 'Run! The stairs — go!', end: true, apt: { selflessness: 1, logic: 0.5 }, aptLabel: 'sent the child running for the exit', effect: S('child', 'run') },
          { text: 'Take my hand. We\'re leaving together.', end: true, apt: { selflessness: 1, peacefulness: 1 }, aptLabel: 'took the child\'s hand', effect: S('child', 'follow') },
          { text: 'Stay quiet and keep still. Dogs react to movement.', end: true, apt: { logic: 1, observation: 0.5 }, aptLabel: 'told the child to keep still', effect: S('child', 'still') },
          { text: '(Leave him.)', end: true, apt: { selflessness: -1 }, aptLabel: 'left the child alone' },
        ],
      },
    },
  });

  T('sim1_clock', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: '', text: '[The station clock\'s hands are spinning — backward. The second hand ticks once every two of your heartbeats.]',
        choices: [
          { text: 'None of this is real.', check: { attr: 'perception', dc: 6 }, to: 'real', apt: { div: 2, observation: 1 }, aptLabel: 'noticed the clock running backward' },
          { text: 'Strange. (Look away.)', end: true },
        ],
      },
      real: {
        speaker: '', text: '[The words leave your mouth and the whole platform flickers, like a picture on a screen. For a heartbeat you can see the mirrored walls of Room Four behind the rain.]',
        onEnter: () => DV.UI.glitch(),
        choices: [{ text: '...', end: true }],
      },
    },
  });

  T('sim1_lever', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: '', text: '[A red emergency lever under a cracked glass guard: SECURITY SHUTTER — PLATFORM B. Above you, a rolling steel grille hangs folded in the canopy.]',
        choices: [
          { text: 'Break the guard and pull the lever.', end: true, apt: { logic: 2, erudite: 0.5 }, aptLabel: 'used the platform\'s security shutter', effect: S('shutter') },
          { text: 'Leave it.', end: true },
        ],
      },
    },
  });

  /* ============================== SIM 2: THE FLOOD ============================== */
  T('sim2_hester', {
    entry: (c) => (DV.Sim.flag('hesterFree') ? 'free' : 'start'),
    nodes: {
      start: {
        speaker: 'Old Woman', text: (c) => (DV.Sim.call('level') > 0.45 ? '[The water is at her chin. She tilts her face up to breathe.] "Please — my leg — the shelf —"' : '[An old woman is pinned beneath a toppled steel shelf, her leg twisted under it.] "Please. I can\'t move it. Please."'),
        choices: [
          { text: 'Lift the shelf off her.', check: { attr: 'strength', dc: 6 }, end: true, apt: { selflessness: 2, bravery: 0.5 }, aptLabel: 'lifted the shelf off the trapped woman', effect: S('freeHester', 'lift') },
          { text: 'Lever the shelf up with the crowbar.', if: () => DV.Sim.flag('crowbar'), end: true, apt: { selflessness: 1, logic: 1.5 }, aptLabel: 'levered the shelf up with a crowbar', effect: S('freeHester', 'lever') },
          { text: 'Give her the breathing mask.', if: () => DV.Sim.flag('hasMask'), end: true, apt: { selflessness: 2.5 }, aptLabel: 'gave your only mask to a stranger', effect: S('giveMask', 'hester') },
          { text: 'Hold her hand. Tell her it will be all right.', to: 'comfort', apt: { peacefulness: 1.5 }, aptLabel: 'comforted the trapped woman' },
          { text: 'Ask her what happened here.', to: 'what', apt: { observation: 0.5 } },
          { text: 'I\'ll find a way out first.', end: true, apt: { logic: 0.5 } },
        ],
      },
      what: {
        speaker: 'Old Woman', text: '"The pipe burst. Behind the crates, on the west wall — I heard it go. There\'s a shutoff valve back there. I couldn\'t reach it." [She coughs.] "Please."',
        onEnter: () => DV.Sim.setFlag('valveHint'),
        next: 'start', nextText: '...',
      },
      comfort: {
        speaker: 'Old Woman', text: '[Her fingers close around yours, cold and strong.] "You\'re kind. Kind doesn\'t lift shelves, dear. But it helps."',
        next: 'start', nextText: '...',
      },
      free: {
        speaker: 'Old Woman', text: '"Thank you. Thank you. I\'ll follow you — go, go, I\'m slow."',
        choices: [{ text: '...', end: true }],
      },
    },
  });

  T('sim2_corwin', {
    entry: (c) => (DV.Sim.flag('corwinHasMask') ? 'mask' : DV.Sim.flag('corwinCalm') ? 'calm' : 'start'),
    nodes: {
      start: {
        speaker: 'Young Man', text: '[A young man hammers the steel door with both fists.] "IT\'S LOCKED! Did you find a way out? Tell me! TELL ME!"',
        choices: [
          { text: 'The code is on the clipboard — the pipes and the red crates.', if: () => DV.Sim.flag('readClipboard'), to: 'told', apt: { honesty: 2 }, aptLabel: 'shared the way out honestly' },
          { text: 'I don\'t know yet. Help me look.', if: () => !DV.Sim.flag('readClipboard'), to: 'calmdown', apt: { honesty: 1, peacefulness: 0.5 }, aptLabel: 'admitted you didn\'t know yet' },
          { text: 'There\'s no way out.', to: 'lie', apt: { deception: 1.5 }, aptLabel: 'lied that there was no way out', skill: 'deception' },
          { text: 'We all get out together. Help me lift the shelf off her.', check: { attr: 'charisma', dc: 5 }, to: 'together', if: () => !DV.Sim.flag('hesterFree'), apt: { peacefulness: 2, selflessness: 1 }, aptLabel: 'got everyone working together' },
          { text: 'Stop panicking. Get a grip.', to: 'calmdown', apt: { resistance: 0.5, aggression: 0.5 }, aptLabel: 'snapped at the panicking man' },
          { text: '(Leave him.)', end: true },
        ],
      },
      told: {
        speaker: 'Young Man', text: '"Pipes — crates — okay. Okay!" [He stares at the north wall, counting under his breath.]',
        onEnter: () => DV.Sim.setFlag('corwinCalm'),
        choices: [{ text: '...', end: true }],
      },
      calmdown: {
        speaker: 'Young Man', text: '[He sags against the door, breathing hard.] "Okay. Okay. I\'m — okay."',
        onEnter: () => DV.Sim.setFlag('corwinCalm'),
        choices: [{ text: '...', end: true }],
      },
      lie: {
        speaker: 'Young Man', text: '[His face collapses.] "No. No, no, no —" [He slides down the door into the water, eyes wide.]',
        onEnter: () => DV.Sim.setFlag('corwinDespair'),
        choices: [{ text: '...', end: true }],
      },
      together: {
        speaker: 'Young Man', text: '[He looks at the old woman — really looks — for the first time.] "...Right. Right. On three." [Together you heave the shelf up. She slides free, gasping.]',
        onEnter: () => { DV.Sim.setFlag('corwinCalm'); DV.Sim.call('freeHester', 'together'); },
        choices: [{ text: '...', end: true }],
      },
      calm: {
        speaker: 'Young Man', text: '"Any luck with that door? I keep — I keep counting things. It helps."',
        choices: [{ text: '...', end: true }],
      },
      mask: {
        speaker: 'Young Man', text: '[He clutches the breathing mask to his chest.] "It\'s MINE. I found it. Don\'t — don\'t come near me."',
        choices: [
          { text: 'She\'s trapped and you\'re not. Give her the mask.', check: { attr: 'charisma', dc: 6 }, to: 'mask_give', apt: { peacefulness: 1.5, selflessness: 1 }, aptLabel: 'talked the man into giving up the mask' },
          { text: 'Take it from him.', check: { attr: 'strength', dc: 6 }, to: 'mask_take', apt: { aggression: 2, bravery: 0.5 }, aptLabel: 'took the mask by force' },
          { text: 'Keep it. You\'re scared. I understand.', end: true, apt: { peacefulness: 1, compliance: 0.5 }, aptLabel: 'let the frightened man keep the mask' },
        ],
      },
      mask_give: {
        speaker: 'Young Man', text: '[His hands shake. Then he wades over and presses the mask over the old woman\'s face.] "Sorry. I\'m sorry. I\'m sorry."',
        onEnter: () => { DV.Sim.setFlag('corwinHasMask', false); DV.Sim.call('giveMask', 'hester'); DV.Sim.setFlag('corwinCalm'); },
        choices: [{ text: '...', end: true }],
      },
      mask_take: {
        speaker: 'Young Man', text: '[You wrench it out of his grip. He stumbles back into the water, staring at you like you\'re the flood.]',
        onEnter: () => { DV.Sim.setFlag('corwinHasMask', false); DV.Sim.setFlag('hasMask'); },
        choices: [{ text: '...', end: true }],
      },
    },
  });

  T('sim2_keypad', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: 'Keypad', text: (c) => '[A greasy two-digit keypad beside the steel door. A strip of tape reads: CODE CHANGED — SEE LOG.]' +
          (DV.Sim.flag('readClipboard') ? '\n\nThe log said: supply pipes on the north wall, then red crates.' : ''),
        choices: [
          { text: 'Count the pipes and the red crates before typing.', check: { attr: 'intelligence', dc: 6 }, if: () => DV.Sim.flag('readClipboard'), to: 'counted', apt: { logic: 1, observation: 1 }, aptLabel: 'counted the room to solve the code' },
          { text: 'Enter 53.', end: true, effect: S('code', '53') },
          { text: 'Enter 35.', end: true, effect: S('code', '35') },
          { text: 'Enter 44.', end: true, effect: S('code', '44') },
          { text: 'Enter 62.', end: true, effect: S('code', '62') },
          { text: 'Smash the keypad.', end: true, apt: { aggression: 1 }, aptLabel: 'smashed the keypad', effect: S('code', 'smash') },
          { text: '(Step back.)', end: true },
        ],
      },
      counted: {
        speaker: 'Keypad', text: '[Five supply pipes run down the north wall. Three crates are painted red. Five, three.]',
        choices: [
          { text: 'Enter 53.', end: true, effect: S('code', '53') },
          { text: '(Step back.)', end: true },
        ],
      },
    },
  });

  T('sim2_clipboard', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: 'Maintenance Log', text: '"Exit code reset after the last flood. NEW CODE: number of SUPPLY pipes on the north wall, then number of RED crates. Don\'t write it down, Danny. — Facilities"',
        onEnter: () => { DV.Sim.setFlag('readClipboard'); DV.Aptitude.record({ observation: 0.5 }, 'read the maintenance log'); },
        choices: [{ text: '(Put it down.)', end: true }],
      },
    },
  });

  T('sim2_drown', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: '', text: '[The water closes over your head. Cold fills your ears. Your lungs begin to burn.]',
        choices: [
          { text: 'Claw for the ceiling. Fight.', end: true, apt: { bravery: 1, resistance: 0.5 }, aptLabel: 'fought the water to the last', effect: S('end', 'drown_fight') },
          { text: 'Breathe. It isn\'t real.', check: { attr: 'resolve', dc: 6 }, end: true, apt: { div: 3 }, aptLabel: 'breathed underwater, knowing it wasn\'t real', effect: S('end', 'drown_aware') },
          { text: '(Panic.)', end: true, apt: { compliance: 0.3 }, aptLabel: 'panicked as the water closed over you', effect: S('end', 'drown_panic') },
        ],
      },
    },
  });

  T('sim2_valve', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: '', text: '[Behind the crates, a split pipe pours black water down the wall. A rusted valve wheel sits just above the break.]',
        choices: [
          { text: 'Wrench the valve shut.', end: true, apt: { logic: 1, observation: 1 }, aptLabel: 'found and closed the burst pipe\'s valve', effect: S('valve') },
          { text: '(Leave it.)', end: true },
        ],
      },
    },
  });

  T('sim2_aware', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: '', text: '[The water is at your chest. Your heart is a fist against your ribs. Somewhere under the panic, a small, quiet thought: this room smells of nothing at all.]',
        choices: [
          { text: 'Close your eyes. None of this is real.', check: { attr: 'resolve', dc: 6 }, end: true, apt: { div: 3 }, aptLabel: 'calmed yourself inside the simulation', effect: S('drain') },
          { text: 'Keep going.', end: true },
        ],
      },
    },
  });

  /* ============================== SIM 3: THE TRIBUNAL ============================== */
  T('sim3_trial', {
    entry: () => 'q1',
    nodes: {
      q1: {
        speaker: 'The Tribunal', text: (c) => (DV.Sim.flag('sat') ? '[Three figures in black sit above you, faces hidden behind smooth mirrored masks. When the center one speaks, all three mouths move.] "STATE YOUR NAME."' : '[Three figures in black look down from the bench, their mirrored masks reflecting you, small and standing.] "You will not sit. Noted. STATE YOUR NAME."'),
        choices: [
          { text: '"{name}."', to: 'q2', apt: { honesty: 0.5, compliance: 0.5 }, aptLabel: 'gave your name to the tribunal' },
          { text: '"Why should I tell you?"', to: 'q2', apt: { resistance: 1 }, aptLabel: 'refused to give the tribunal your name' },
          { text: '(Give them a false name.)', to: 'q2', apt: { deception: 1 }, aptLabel: 'gave the tribunal a false name' },
          { text: '(Say nothing.)', to: 'q2', apt: { resistance: 0.5, peacefulness: 0.3 } },
        ],
      },
      q2: {
        speaker: 'The Tribunal', text: (c) => '"Someone has tampered with the serum supply in this facility. Lot thirty-three. You were seen in the ' + DV.Sim.call('accusePlace') + ' this morning at nine-forty. Explain yourself."',
        choices: [
          { text: '"That\'s true. I was there. But I didn\'t touch any serum."', to: 'q3', apt: { honesty: 2 }, aptLabel: 'admitted where you had been' },
          { text: '"I was never there."', to: 'q3', apt: { deception: 1.5 }, aptLabel: 'denied being where you had been' },
          { text: '"Nine-forty? I was in the waiting hall then, in front of a dozen witnesses."', check: { attr: 'perception', dc: 6 }, to: 'q3', apt: { logic: 1, observation: 2 }, aptLabel: 'picked apart the accusation' },
          { text: '"Prove it."', to: 'q3', apt: { resistance: 1, logic: 0.5 } },
          { text: '"I don\'t answer to you."', to: 'q3', apt: { resistance: 2, bravery: 0.5 }, aptLabel: 'defied the tribunal' },
          { text: '(Laugh.) "Is this a joke?"', to: 'q3', apt: { peacefulness: 0.5, div: 0.5 }, aptLabel: 'laughed at the tribunal' },
          { text: '(Glance at the mirrored masks.)', check: { attr: 'perception', dc: 7 }, to: 'glimpse', apt: { observation: 1 } },
        ],
      },
      glimpse: {
        speaker: '', text: '[In each mirrored mask you see yourself — but in all three reflections, you are not standing in front of the bench. You are behind it. Watching.]',
        choices: [
          { text: 'Walk to the mirror on the wall and look for yourself.', check: { attr: 'resolve', dc: 7 }, end: true, apt: { div: 2 }, aptLabel: 'walked out of the interrogation to look in the mirror', effect: S('breakTrial') },
          { text: '(Look away and answer.)', to: 'q3' },
        ],
      },
      q3: {
        speaker: 'The Tribunal', text: (c) => '"You did not act alone. Give us a name. We know you spoke with ' + DV.Sim.call('accuseName') + ' today. Say it, and you may go."',
        choices: [
          { text: (c) => '"It was ' + DV.Sim.call('accuseName') + '."', to: 'q4', apt: { compliance: 1.5, selflessness: -1.5, logic: 0.5 }, aptLabel: 'gave the tribunal a name' },
          { text: (c) => '"I was alone. Leave ' + DV.Sim.call('accuseName') + ' out of this."', to: 'q4', apt: { selflessness: 2, deception: 0.5 }, aptLabel: 'shielded someone else' },
          { text: '"There\'s no name, because there\'s no crime."', to: 'q4', apt: { honesty: 1.5, resistance: 0.5 }, aptLabel: 'insisted on the truth' },
          { text: '"Punish me instead. Let the others go."', to: 'q4', apt: { selflessness: 3, bravery: 1 }, aptLabel: 'offered to take the punishment for others' },
          { text: '"You\'re trying to make me turn on someone. Why?"', to: 'q4', apt: { logic: 1.5, resistance: 1 }, aptLabel: 'questioned the tribunal\'s motive' },
        ],
      },
      q4: {
        speaker: 'The Tribunal', text: '[A sheet of paper slides across the table toward you. A pen beside it.] "Sign the confession. If you sign, the others go free. If you refuse, they will be punished in your place."',
        choices: [
          { text: '"Give me the pen." (Sign.)', to: 'q5', apt: { selflessness: 2, compliance: 1.5 }, aptLabel: 'signed a false confession to spare others' },
          { text: '"I won\'t confess to something I didn\'t do."', to: 'q5', apt: { honesty: 2, resistance: 1 }, aptLabel: 'refused to sign a false confession' },
          { text: '(Tear the confession in half.)', to: 'q5', apt: { aggression: 1, resistance: 2, bravery: 1 }, aptLabel: 'tore up the confession' },
          { text: '"This isn\'t dated or witnessed. It isn\'t a legal document."', check: { attr: 'intelligence', dc: 7 }, to: 'q5', apt: { logic: 2.5 }, aptLabel: 'found the flaw in the confession' },
          { text: '"Nobody has to be punished. Can we talk about what actually happened?"', to: 'q5', apt: { peacefulness: 2.5 }, aptLabel: 'tried to mediate with the tribunal' },
        ],
      },
      q5: {
        speaker: 'The Tribunal', text: '[On a pedestal beside you, a single red button lights up.] "Then judge for us. Press the button and the guilty party will be punished. You know who it is."',
        choices: [
          { text: '(Press the button.)', to: 'verdict', apt: { compliance: 1, aggression: 1 }, aptLabel: 'pressed the button' },
          { text: '"No. I won\'t hurt anyone for you."', to: 'verdict', apt: { peacefulness: 1.5, resistance: 1 }, aptLabel: 'refused to punish anyone' },
          { text: '"That button isn\'t wired to anything."', check: { attr: 'perception', dc: 7 }, to: 'verdict', apt: { observation: 2, logic: 1 }, aptLabel: 'saw that the button was a prop' },
          { text: '"Press it yourselves, if you\'re so certain."', to: 'verdict', apt: { resistance: 1.5, bravery: 0.5 } },
        ],
      },
      verdict: {
        speaker: 'The Tribunal', text: '"THE TRIBUNAL HAS REACHED A VERDICT."\n\n[The gavel falls. The sound goes on and on, and the light over your head swells until there is nothing else.]',
        onEnter: () => DV.Audio.play('gavel'),
        choices: [{ text: '...', end: true, effect: S('end', 'verdict') }],
      },
    },
  });

  T('sim3_mirror', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: '', text: '[A tall mirror. Your reflection stares back — and does not move when you raise your hand. It is looking past you, at the bench.]',
        choices: [
          { text: 'Touch the glass.', check: { attr: 'resolve', dc: 7 }, to: 'break', apt: { div: 3 }, aptLabel: 'reached through the mirror' },
          { text: 'Look past the reflection.', check: { attr: 'perception', dc: 7 }, to: 'break', apt: { div: 3, observation: 1 }, aptLabel: 'saw through the simulation' },
          { text: '(Step back.)', end: true },
        ],
      },
      break: {
        speaker: '', text: '[The glass is warm, like skin. It gives. The tribunal, the bench, the walls — all of it ripples like a reflection in a pond. In the south wall, where there was no door, there is now a door. It is open.]',
        onEnter: () => { DV.UI.glitch(); DV.Sim.call('openDoor'); },
        choices: [{ text: '...', end: true }],
      },
    },
  });

  T('sim3_chair', {
    entry: () => 'start',
    nodes: {
      start: {
        speaker: '', text: '[A plain wooden chair in a pool of white light.]',
        choices: [
          { text: '(Sit.)', end: true, apt: { compliance: 1 }, aptLabel: 'sat when you were told to', effect: S('sit') },
          { text: '(Stay standing.)', end: true },
        ],
      },
    },
  });
})();
