/* ==========================================================================
   DIVERGENT — Build 2, chapter 1: the night before
   Home, after the test. The same small house in every sector, dressed the
   way your family's faction lives: Abnegation's bare grey rooms and the
   mirror behind a panel, Erudite's books on every surface, Candor's black
   and white, Amity's warm wood and bread, a Dauntless flat in the compound.
   Dinner with your parents (what you tell them about the test matters),
   then bed — and the night before the Choosing.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  /* ------------------------------ how each faction lives ------------------------------ */
  const STYLE = {
    abnegation: {
      wall: 'paint_wall', floor: 'wood', ceiling: 'paint_white', facade: 'concrete_panel',
      light: { ambient: [0.26, 0.25, 0.24], color: [1, 0.86, 0.66], intensity: 0.75, spacing: 4, range: 5.5, fixture: 'bulb' },
      sofa: 'fabric_grey', rug: 'carpet_grey', top: 'wood', banner: 'abnegation',
      sector: 'Abnegation sector', street: 'Grey houses, all the same, all lights out by ten.',
    },
    erudite: {
      wall: 'paint_blue', floor: 'carpet_blue', ceiling: 'paint_white', facade: 'facade',
      light: { ambient: [0.3, 0.32, 0.36], color: [0.88, 0.94, 1], intensity: 0.9, spacing: 3.5, range: 5.5, fixture: 'tube' },
      sofa: 'fabric_blue', rug: 'carpet_blue', top: 'wood_light', banner: 'erudite',
      sector: 'Erudite quarter', street: 'Every window on the street is lit. Nobody here sleeps before midnight.',
    },
    candor: {
      wall: 'paint_white', floor: 'marble_check', ceiling: 'paint_white', facade: 'concrete',
      light: { ambient: [0.34, 0.34, 0.34], color: [1, 0.98, 0.94], intensity: 0.9, spacing: 3.5, range: 5.5 },
      sofa: 'black', rug: 'carpet_dark', top: 'white', banner: 'candor',
      sector: 'Candor district', street: 'Somebody two doors down is arguing, cheerfully, at full volume.',
    },
    amity: {
      wall: 'wood_panel', floor: 'wood_light', ceiling: 'wood', facade: 'brick',
      light: { ambient: [0.32, 0.27, 0.2], color: [1, 0.82, 0.58], intensity: 0.85, spacing: 3.5, range: 6, fixture: 'bulb' },
      sofa: 'fabric_grey', rug: 'carpet_red', top: 'wood', banner: 'amity',
      sector: 'the Amity guest house in town', street: 'The farm truck leaves at dawn. Someone is still singing in the yard.',
    },
    dauntless: {
      wall: 'concrete_dark', floor: 'metal_plate', ceiling: 'ceiling_concrete', facade: 'concrete_dark',
      light: { ambient: [0.18, 0.2, 0.26], color: [0.7, 0.82, 1], intensity: 0.85, spacing: 4, range: 5.5, fixture: 'bulb' },
      sofa: 'black', rug: 'carpet_dark', top: 'metal_dark', banner: 'dauntless',
      sector: 'the Dauntless compound', street: 'Through the wall: the river in the chasm, and somebody laughing much too loud.',
    },
  };
  const ORDER = ['abnegation', 'erudite', 'candor', 'amity', 'dauntless'];

  /* ------------------------------ the house ------------------------------ */
  function defineHome(f) {
    const S = STYLE[f];
    const P = [];
    const add = (type, x, z, o) => P.push(Object.assign({ type, x, z }, o || {}));
    // kitchen & dining
    add('kitchenette', 6.2, 0.4, { len: 3 });
    add('table', 3.4, 3.6, { w: 2.0, d: 0.9, chairs: 4, id: 'dinner', top: S.top, chairTex: f === 'candor' ? 'black' : f === 'dauntless' ? 'metal_dark' : 'wood' });
    add('dinner_set', 3.4, 3.6, { faction: f });
    add('clock', 7.98, 3.5, { rotDeg: -90, y: 2.1 });
    // living room
    add('sofa', 3.0, 11.45, { rotDeg: 180, len: 2.2, fabric: S.sofa });
    add('rug', 3.8, 9.2, { w: 3.4, d: 2.4, mat: S.rug });
    add('banner', 4.6, 11.92, { rotDeg: 180, faction: S.banner, y: 2.3, h: 1.2 });
    add('plant', 7.4, 11.4, { size: f === 'amity' ? 1.1 : 0.7 });
    if (f === 'erudite') { add('shelf', 0.3, 10.8, { rotDeg: 90, len: 1.8, d: 0.4 }); add('shelf', 7.7, 6.8, { rotDeg: -90, len: 1.0, d: 0.4 }); add('crt_tv', 6.4, 6.5, {}); }
    else if (f === 'amity') { add('plant', 0.6, 11.3, { size: 1.0 }); add('plant', 7.3, 6.6, { size: 0.9 }); add('barrel', 7.4, 5.2, {}); }
    else if (f === 'dauntless') { add('pipes', 4, 11.75, { len: 8, y: 2.4, n: 2 }); add('crate', 0.6, 11.3, { size: 0.8, stack: true }); add('poster', 7.95, 7.0, { rotDeg: -90, kind: 'dauntless' }); }
    else if (f === 'candor') { add('noticeboard', 0.12, 10.6, { rotDeg: 90, title: 'Clippings', text: 'CANDOR STANDARD — "COUNCIL VOTE WAS RIGGED," SAYS COUNCILWOMAN (SHE WAS RIGHT)\n\nA crossword, finished in pen.\n\nA note in your mother\'s hand: "Say it to their face or don\'t say it."' }); }
    else { add('shelf', 0.3, 11.0, { rotDeg: 90, len: 1.2, d: 0.35, levels: 2 }); }
    // hall
    add('rug', 9.75, 6, { w: 1.8, d: 7, mat: S.rug });
    // your room
    add('bed', 15.4, 8.9, { id: 'home_bed', blanket: f });
    add('table', 12.9, 11.45, { w: 1.2, d: 0.55, chairs: 0, top: S.top });
    add('chair', 12.9, 10.8, { style: f === 'dauntless' ? 'office' : 'wood', rotDeg: 180, noCollide: true });
    if (f === 'erudite' || f === 'candor') add('paper_stack', 12.6, 11.5, { n: 3, elev: 0.74 });
    add('shelf', 11.8, 7.0, { rotDeg: 90, len: 1.0, d: 0.35, levels: 3 });

    const rooms = [
      { id: 'h_kitchen', name: 'Kitchen', x0: 0, z0: 0, x1: 8, z1: 6, h: 2.9, floor: S.floor, wall: S.wall, ceiling: S.ceiling, light: S.light },
      { id: 'h_living', name: 'Living Room', x0: 0, z0: 6, x1: 8, z1: 12, h: 2.9, floor: S.floor, wall: S.wall, ceiling: S.ceiling, light: Object.assign({}, S.light, { intensity: S.light.intensity * 0.8 }) },
      { id: 'h_hall', name: 'Hall', x0: 8, z0: 0, x1: 11.5, z1: 12, h: 2.9, floor: S.floor, wall: S.wall, ceiling: S.ceiling, light: Object.assign({}, S.light, { spacing: 4.5, intensity: S.light.intensity * 0.7 }) },
      { id: 'h_bedroom', name: 'Your Room', x0: 11.5, z0: 6, x1: 16, z1: 12, h: 2.9, floor: S.floor, wall: S.wall, ceiling: S.ceiling, light: Object.assign({}, S.light, { intensity: S.light.intensity * 0.65 }) },
      { id: 'h_parents', name: 'Your Parents\' Room', x0: 11.5, z0: 0, x1: 16, z1: 6, h: 2.9, floor: S.floor, wall: S.wall, ceiling: S.ceiling, light: Object.assign({}, S.light, { intensity: 0.3 }) },
    ];
    DV.Zones.define('home_' + f, {
      name: 'Home',
      region: S.sector,
      chapter: true,
      noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 18, z1: 14 },
      buildingHeight: 3.2,
      facade: S.facade,
      fog: { color: 0x0d0f14, near: 22, far: 90 },
      fogOutdoor: { color: 0x141821, near: 30, far: 260 },
      sky: { top: 0x05070d, horizon: 0x1a1f2b, ground: 0x08090c, skyline: false },
      exterior: { sunDir: [-0.3, 0.6, -0.5], sunColor: [0.18, 0.2, 0.3], ambient: [0.08, 0.09, 0.13] },
      charLight: { ambient: 0.45, hemi: 0.35, dir: 0.35, dirColor: 0xffd8a8 },
      rooms,
      doors: [
        { id: 'h_k_hall', x: 8, z: 3, dir: 'z', w: 1.4, type: 'opening' },
        { id: 'h_l_hall', x: 8, z: 9, dir: 'z', w: 1.6, type: 'opening' },
        { id: 'h_k_l', x: 4, z: 6, dir: 'x', w: 2.8, type: 'opening' },
        { id: 'h_bed_door', x: 11.5, z: 9, dir: 'z', w: 1.0 },
        { id: 'h_parents_door', x: 11.5, z: 3, dir: 'z', w: 1.0, type: 'sealed', label: '', lockMsg: 'Your parents\' room. You haven\'t gone in without knocking since you were six.' },
        { id: 'h_front', x: 9.75, z: 0, dir: 'x', w: 1.1, type: 'sealed', label: '', lockMsg: 'It\'s late. Curfew is at ten, and the Choosing is in the morning.' },
      ],
      windows: [
        { id: 'h_win_k', x: 2.6, z: 0, dir: 'x', w: 1.8, sill: 1.05, top: 2.2 },
        { id: 'h_win_l', x: 0, z: 8.6, dir: 'z', w: 2.0, sill: 0.8, top: 2.2 },
        { id: 'h_win_b', x: 16, z: 7.4, dir: 'z', w: 1.4, sill: 0.9, top: 2.2 },
      ],
      props: P,
      spots: {
        mom_stove: { x: 6.2, z: 1.05, rot: Math.PI },
        dad_sofa: { x: 2.6, z: 11.0, rot: Math.PI },
      },
      spawn: { x: 9.75, z: 0.9, rot: 0 },
      build(ctx) {
        // the street outside the windows, at night
        const city = DV.City.build({
          seed: 300 + ORDER.indexOf(f),
          campus: [-10, -10, 24, 20],
          gridX: [-470, -394, -318, -242, -166, -90, -16, 28, 90, 166, 242, 318, 394, 470],
          gridZ: [-460, -396, -332, -268, -204, -140, -76, -16, 24, 76, 140, 204, 268, 332, 396],
          radius: 480,
          hub: [140, -320],
          haze: 0x141821,
          hazeK: 0.004,
          ambient: 0x2a2d3a,
          lit: 1,
          shadowAmt: 0.0,
          cloudLight: 0x262a36,
          cloudDark: 0x0d0f15,
          puffTint: 0x30343f,
          puffs: 8,
          cover: 0.05,
        });
        ctx.add(city.group);
        ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
        // things to look at
        const look = (id, x, z, name, text) => ctx.interact({ id, kind: 'examine', x, y: 1.2, z, radius: 1.3, label: 'Examine', name, title: name, text });
        look('h_window_view', 15.6, 7.4, 'Window', 'Your street, at night. ' + S.street + '\n\nFar off, over the rooftops, the Hub is still lit all the way to the top. Tomorrow you will be up there.');
        if (f === 'abnegation') look('h_mirror', 8.2, 7.0, 'Sliding Panel', 'The only mirror in the house is behind this panel. You are allowed one look, on the second day of each month, while your mother cuts your hair.\n\nTonight you slide it open anyway, and your own face looks back — older than you expected.');
        if (f === 'erudite') look('h_books', 0.7, 10.8, 'Bookshelf', 'APPLIED LOGIC, VOL. III. A HISTORY OF THE FENCE. A field guide to bird calls, which nobody in your family has ever needed.\n\nYour father writes in the margins. One note, underlined twice: "Curiosity is not a flaw."');
        if (f === 'candor') look('h_sign', 4.6, 11.6, 'Framed Saying', 'Hand-lettered, in your grandmother\'s writing: "THE TRUTH IS WORTH THE TROUBLE."\n\nUnderneath, much smaller, in your father\'s: "Usually."');
        if (f === 'amity') look('h_guitar', 0.8, 10.2, 'Guitar', 'Your mother\'s old guitar, missing its high string since spring. Everyone keeps meaning to fix it. Nobody minds that nobody has.');
        if (f === 'dauntless') look('h_flash', 7.6, 7.0, 'Tattoo Flash', 'Your father\'s sketches for the parlor, pinned to the wall: a flame, a hawk, a set of scales — "for the Candor transfers, they love that one" — and, in a corner, the five faction symbols together in a circle.\n\nHe told you never to get that one done.');
        look('h_clock', 7.7, 3.5, 'Clock', 'Twenty to eight. Thirteen hours until the Choosing.');
      },
    });
  }
  ORDER.forEach(defineHome);

  // the meal on the table, faction-appropriate
  DV.Props.define('dinner_set', (ctx, p, B) => {
    const plate = ctx.M('white'), dark = ctx.M('metal_dark');
    for (const [x, z] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) {
      B.cyl(plate, x, 0.75, z, 0.13, 0.13, 0.015, 8);
      B.box(dark, x + 0.18, 0.75, z, 0.02, 0.006, 0.18);
    }
    const f = p.faction;
    const food = ctx.M(f === 'amity' ? 'wood_light' : f === 'dauntless' ? 'rust' : f === 'erudite' ? 'paint_blue' : 'paint_warm');
    B.cyl(food, 0, 0.75, 0, 0.2, 0.16, 0.08, 8); // the dish everyone is sharing
    B.box(ctx.M('wood_light'), -0.75, 0.75, 0, 0.25, 0.06, 0.14); // bread
    B.cyl(ctx.M('glass_dark'), 0.8, 0.75, 0, 0.05, 0.05, 0.22, 6); // water jug
  });

  /* ------------------------------ the family ------------------------------ */
  // one parent in every family was born somewhere else — they transferred at their own Choosing
  const ORIGIN = {
    abnegation: { who: 'Dad', from: 'erudite', story: 'I was born Erudite. I knew more facts than anyone in my year and I was miserable. Abnegation was the first place that ever asked me what I could do for somebody else.' },
    erudite: { who: 'Mom', from: 'amity', story: 'I was born Amity. I left because I wanted to know why things were the way they were — not just how to feel about them. Your grandparents still send me jam. I still don\'t know what to say about that.' },
    candor: { who: 'Dad', from: 'dauntless', story: 'I was born Dauntless. Turned out I was braver with words than with heights. Your grandfather didn\'t speak to me for a year. Then he did, and he never stopped.' },
    amity: { who: 'Mom', from: 'candor', story: 'I was born Candor. I got tired of being right all the time, and I wanted to be kind for a while. I\'m still working on it.' },
    dauntless: { who: 'Mom', from: 'abnegation', story: 'I was born Abnegation. Grey clothes, no mirrors. I jumped off a train the day after my Choosing and never once looked back.' },
  };
  const OPEN = {
    abnegation: [['Dad', 'Sit, sit. Your mother made the chicken last — she said you\'d need it more than we would.'], ['Mom', 'We won\'t ask you about the test. It isn\'t ours to know.']],
    erudite: [['Dad', 'Well? Statistically, most candidates test into their home faction. Seventy-one percent last year.'], ['Mom', 'They\'re not permitted to discuss it, and you know that. Eat something.']],
    candor: [['Mom', 'Out with it. How did it go? And don\'t dress it up.'], ['Dad', 'Let them eat first. Then interrogate.']],
    amity: [['Mom', 'There you are! Sit, sit — the bread\'s still warm.'], ['Dad', 'Whatever happened today, you\'re home now. That\'s the part that matters.']],
    dauntless: [['Dad', 'Look who survived a whole day without punching anyone.'], ['Mom', 'Did you, though?']],
  };
  const QUIET = {
    abnegation: ['Mom', 'Good. That\'s right. ... Eat. You\'ve barely touched it.'],
    erudite: ['Dad', 'Of course. Of course. I only — of course.'],
    candor: ['Mom', 'Hm. You\'re allowed to keep it, you know. It\'s just strange, in this house.'],
    amity: ['Mom', 'Then we won\'t make you. More soup?'],
    dauntless: ['Dad', 'Fair. Rules are rules. Even the stupid ones.'],
  };
  const LEAVE = {
    abnegation: [['Dad', 'Then you\'ll do some good, wherever you go. That was always the point.'], ['Mom', 'We will miss you at this table. That\'s allowed to be true too.']],
    erudite: [['Mom', 'Then think it through. And then think it through again, and then choose.'], ['Dad', 'And write to us. Logically, letters are permitted.']],
    candor: [['Mom', 'Then you tell us so. Tomorrow, to our faces, with your hand over the bowl.'], ['Dad', 'And we\'ll tell you we\'re proud of you. Because we will be.']],
    amity: [['Mom', 'We\'d miss you. And we\'d be happy for you. Both at once.'], ['Dad', 'People leave and the orchard still grows. You\'ll always know where it is.']],
    dauntless: [['Dad', 'Then you\'d better be brave enough to say it out loud.'], ['Mom', 'Being brave isn\'t only jumping. Sometimes it\'s walking away from the edge.']],
  };
  const fam = (f) => STYLE[f];
  void fam;

  const D = DV.DialogueDB;
  const F = () => DV.State.data.player.upbringing;
  const say = (k) => (c) => OPEN[F()][k][1];
  const who = (k) => () => OPEN[F()][k][0];
  const told = (c) => {
    const rec = c.recorded() || c.result();
    if (!rec || rec === 'inconclusive') return 'Hm.';
    return rec === F() ? 'Then you\'re — then you might stay. If you want to. It\'s still your choice. It\'s only your choice.' : DV.Factions.name(rec) + '. Well. That\'s — that\'s a result. It isn\'t a sentence. Tests are tests.';
  };
  D.add('home_dinner', {
    entry: 'open',
    nodes: {
      open: { speaker: who(0), text: say(0), next: 'open2', nextText: '...' },
      open2: { speaker: who(1), text: say(1), choices: () => topics() },
      more: { speaker: 'Mom', text: 'More potatoes? There\'s more.', choices: () => topics() },
      quiet: {
        speaker: () => QUIET[F()][0], text: () => QUIET[F()][1],
        onEnter: (c) => { c.setFlag('home_quiet'); DV.Stats.practice('composure', 1); },
        next: 'more', nextText: '...',
      },
      told: {
        speaker: 'Mom', text: told,
        onEnter: (c) => { c.setFlag('home_told'); if (c.divergent()) c.apt({ deception: 1 }, 'told family the recorded result'); },
        next: 'told2', nextText: '...',
      },
      told2: { speaker: 'Dad', text: 'Whatever it said, tomorrow is yours. That\'s the whole point of the ceremony.', next: 'more', nextText: 'I know.' },
      divergent: {
        speaker: 'Mom',
        text: 'Stop. Don\'t — don\'t finish that sentence. Not here. Not to anyone. Do you understand me?',
        onEnter: (c) => c.setFlag('home_divergent_warned'),
        next: 'divergent2', nextText: '...Yes.',
      },
      divergent2: {
        speaker: 'Mom',
        text: '[She puts her fork down. Her hands are not quite steady.] Your grandmother used to say the same thing about herself, very quietly, after dark. Tomorrow you choose, and then you keep your head down. Whatever you are, you are still ours.',
        next: 'more', nextText: 'Okay.',
      },
      origin: {
        speaker: () => ORIGIN[F()].who, text: () => ORIGIN[F()].story,
        onEnter: (c) => c.setFlag('home_parent_transfer'),
        next: 'origin2', nextText: 'You never told me that.',
      },
      origin2: { speaker: () => (ORIGIN[F()].who === 'Mom' ? 'Dad' : 'Mom'), text: 'Faction before blood — it\'s what they say at the ceremony. They don\'t say the next part: we would still be your parents. Whatever you choose.', next: 'more', nextText: '...' },
      leave: {
        speaker: () => LEAVE[F()][0][0], text: () => LEAVE[F()][0][1],
        onEnter: (c) => { c.setFlag('home_asked_leave'); DV.Stats.practice('empathy', 1); },
        next: 'leave2', nextText: '...',
      },
      leave2: { speaker: () => LEAVE[F()][1][0], text: () => LEAVE[F()][1][1], next: 'more', nextText: 'Thank you.' },
      night: {
        speaker: 'Mom',
        text: 'Go on, then. Bed. We\'ll walk you to the Hub in the morning — all of us, together. That part, at least, we get to keep.',
        onEnter: (c) => c.setFlag('home_dinner_done'),
        endText: 'Goodnight.',
      },
    },
  });
  // the topics you can raise, each once
  function topics() {
    const fl = (n) => DV.State.flag(n);
    const out = [];
    if (!fl('home_quiet') && !fl('home_told')) out.push({ text: 'It went fine. I\'m not supposed to talk about it.', to: 'quiet' });
    if (!fl('home_told') && !fl('home_quiet') && DV.State.data.aptitude.status === 'complete') out.push({ text: (c) => 'My result was ' + DV.Factions.name(DV.State.data.aptitude.recordedAs || DV.State.data.aptitude.result) + '.', to: 'told', tag: 'Honest' });
    if (DV.State.data.aptitude.divergent && !fl('home_divergent_warned')) out.push({ text: 'It wasn\'t clear. The technician said I was —', to: 'divergent', tag: 'Divergent' });
    if (!fl('home_parent_transfer')) out.push({ text: 'How did you choose? At your Choosing?', to: 'origin' });
    if (!fl('home_asked_leave')) out.push({ text: 'What if I don\'t stay?', to: 'leave' });
    out.push({ text: 'I\'m tired. I should get some sleep.', to: 'night' });
    return out;
  }

  // lying awake: which bowl you keep coming back to
  D.add('home_night', {
    entry: 'start',
    nodes: {
      start: {
        speaker: '',
        text: '[You lie awake. The house ticks and settles. Tomorrow there will be five bowls on a table: grey stones, water, glass, earth, and burning coals.]\n\nYou keep thinking about —',
        choices: [
          { text: 'The grey stones. Hands that give things away.', to: 'end', effect: () => lean('abnegation') },
          { text: 'The water. Questions that have answers.', to: 'end', effect: () => lean('erudite') },
          { text: 'The glass. Saying the true thing out loud.', to: 'end', effect: () => lean('candor') },
          { text: 'The earth. Somewhere quiet, where nobody fights.', to: 'end', effect: () => lean('amity') },
          { text: 'The coals. The train, the jump, the fear.', to: 'end', effect: () => lean('dauntless') },
          { text: 'None of them. All of them. That\'s the problem.', to: 'end', effect: () => lean('none') },
        ],
      },
      end: { speaker: '', text: '[Sometime after midnight, you sleep.]', endText: 'Sleep.' },
    },
  });
  function lean(f) {
    DV.State.data.story = DV.State.data.story || {};
    DV.State.data.story.leaning = f;
  }

  /* ------------------------------ the chapter ------------------------------ */
  DV.Chapter.define('home', {
    zone: () => 'home_' + (STYLE[DV.State.data.player.upbringing] ? DV.State.data.player.upbringing : 'abnegation'),
    get title() { return 'HOME\n' + STYLE[F()].sector.replace(/^the /, '').toUpperCase() + ' · 19:40'; },
    day: 1,
    time: '19:40',
    start(C, zone, opts) {
      const f = F();
      const pl = DV.State.data.player;
      if (DV.Quests.obj('the_choosing', 'leave') !== 'done') DV.Quests.setObj('the_choosing', 'leave', 'done', 'You rode the bus home through the dusk.');
      // the parents
      const mom = C.actor({ id: 'mom', name: 'Mom', app: DV.Build2.parentApp('mom'), x: 6.2, z: 1.05, rot: Math.PI, action: 'idle' });
      const dad = C.actor({ id: 'dad', name: 'Dad', app: DV.Build2.parentApp('dad'), x: 2.9, z: 2.85, rot: 0, action: 'sit' });
      void pl;
      C.mom = mom; C.dad = dad;
      // you, the dinner table
      const seat = zone.spot('dinner_c1');
      const momSeat = zone.spot('dinner_c2'), dadSeat = zone.spot('dinner_c0');
      dad.place(dadSeat.x, dadSeat.z, dadSeat.rot);
      DV.Audio.setMusic('home');
      if (opts.step === 'night') { this.toNight(C, zone, true); return; }
      DV.Quests.activate('the_choosing', 'dinner', 'You are home. Your family is waiting with dinner.');
      C.checkpoint('dinner');
      C.after(1.6, () => C.say(mom, f === 'dauntless' ? 'That you? Wash the soot off — dinner\'s on.' : 'Is that you? Wash your hands — dinner\'s ready.', 3.5));
      C.after(5.5, () => C.say(dad, 'Come and sit down.', 2.5));
      C.interact({
        id: 'h_dinner_seat', kind: 'action', x: seat.x, y: 0.8, z: seat.z, radius: 1.6, label: 'Sit down to dinner', name: 'Your Chair',
        cond: () => !C.flag('ate'),
        onUse: () => this.dinner(C, zone, seat, momSeat),
      });
      // talk to them before you sit
      for (const a of [mom, dad]) C.interact({ id: 'h_talk_' + a.id, kind: 'action', x: () => a.x, y: 1.4, z: () => a.z, radius: 1.5, label: 'Talk to', name: a.name, bias: 0.5, cond: () => !C.flag('ate'), onUse: () => C.say(a, a === mom ? 'Sit, love. Then talk.' : 'Food first. Big day tomorrow.', 2.6) });
    },
    dinner(C, zone, seat, momSeat) {
      C.setFlag('ate');
      C.removeInteract('h_dinner_seat');
      DV.Game.sitOn(seat, true);
      DV.Player.pinned = true;
      const mom = C.mom;
      mom.walk([[momSeat.x, momSeat.z - 0.6], [momSeat.x, momSeat.z]], 1.2, (a) => { a.rot = momSeat.rot; a.action = 'sit'; });
      C.seq([
        () => { C.cut(true); C.shot([seat.x + 1.6, 1.55, seat.z + 1.4], [seat.x + 0.2, 0.95, seat.z - 1.0]); return 2.2; },
        () => { C.mom.lookAt([seat.x, seat.z]); C.dad.lookAt([seat.x, seat.z]); C.cut(false); DV.Game.rig.setShot(new THREE.Vector3(seat.x + 1.35, 1.5, seat.z + 1.25), new THREE.Vector3(seat.x + 0.2, 0.9, seat.z - 1.0)); C.scene('home_dinner'); },
      ]);
    },
    onDialogueEnd(C, e) {
      const zone = DV.World.current;
      if (e.tree === 'home_dinner' && DV.State.flag('home_dinner_done')) {
        DV.Game.rig.follow();
        DV.Player.pinned = false;
        DV.Quests.setObj('the_choosing', 'dinner', 'done', 'Dinner with your family. ' + (DV.State.flag('home_asked_leave') ? 'They said they would love you whatever you choose.' : DV.State.flag('home_told') ? 'You told them your result.' : 'You kept the test to yourself.'));
        this.toNight(C, zone, false);
      } else if (e.tree === 'home_dinner') {
        // left the table mid-conversation: pick it back up
        DV.Game.rig.follow();
        DV.Player.pinned = false;
        C.interact({ id: 'h_dinner_seat2', kind: 'action', x: zone.spot('dinner_c1').x, y: 0.8, z: zone.spot('dinner_c1').z, radius: 1.6, label: 'Sit back down', name: 'Dinner', cond: () => !DV.State.flag('home_dinner_done'), onUse: () => { C.removeInteract('h_dinner_seat2'); DV.Game.sitOn(zone.spot('dinner_c1'), true); DV.Player.pinned = true; C.scene('home_dinner', { node: 'more' }); } });
      }
      if (e.tree === 'home_night') this.sleep(C);
    },
    toNight(C, zone, resumed) {
      const mom = C.mom, dad = C.dad;
      C.checkpoint('night');
      DV.Quests.activate('the_choosing', 'sleep', 'Time for bed. The Choosing is in the morning.');
      if (resumed) { mom.place(6.2, 1.05, Math.PI); dad.place(2.6, 11.0, Math.PI); dad.action = 'sit'; }
      else {
        mom.action = 'idle';
        mom.walk([[5.6, 1.7], [6.2, 1.05]], 1.1, (a) => { a.rot = Math.PI; a.action = 'mop'; });
        dad.walk([[3.4, 5.4], [2.6, 10.4], [2.6, 11.0]], 1.0, (a) => { a.rot = Math.PI; a.action = 'sit'; });
        C.after(2.5, () => C.say(dad, 'Sleep well. Or try to.', 2.5));
      }
      const bed = zone.spot('home_bed');
      C.interact({
        id: 'h_sleep', kind: 'action', x: 15.4, y: 0.7, z: 8.9, radius: 1.6, label: 'Go to sleep', name: 'Your Bed',
        onUse: () => {
          C.removeInteract('h_sleep');
          C.cut(true);
          DV.Player.place(15.4, 10.1, Math.PI);
          DV.Game.sitOn(bed, true);
          DV.Player.action = 'lie';
          C.shot([13.2, 2.3, 11.4], [15.4, 0.6, 8.9]);
          C.seq([
            () => 1.5,
            () => { DV.UI.fade(0.75, 1500); return 1.6; },
            () => { C.cut(false); C.shot([13.4, 2.0, 11.2], [15.4, 0.7, 8.9]); C.scene('home_night'); },
          ], 'sleep');
        },
      });
    },
    sleep(C) {
      DV.Audio.setMusic('none');
      DV.Quests.setObj('the_choosing', 'sleep', 'done', 'The night before the Choosing.');
      C.cut(true);
      DV.UI.fade(1, 1800).then(() => {
        DV.UI.narrate('DAY 2\nTHE CHOOSING', 4);
        C.after(3.8, () => DV.Chapter.goto('ceremony', { fadeOut: 10 }));
      });
    },
    update(C, dt) {
      // keep the family looking at you at the table
      if (DV.Player.state === 'sitting' && C.mom && C.mom.action === 'sit') C.mom.lookAt([DV.Player.x, DV.Player.z]);
    },
  });
  DV.Home = { STYLE, ORIGIN };
})();
