/* ==========================================================================
   DIVERGENT — Build 3: Candor, the first week ("The Whole Truth")
   Day 3   The Hollis case. A crate of medicine is missing from the Candor
           dispensary and the night clerk says he was home in bed. Read the
           evidence, then sit across the table from him and listen: he
           pauses, he looks at the door, his hand goes to his neck — or it
           doesn't. Challenge the lie with the right piece of paper, let the
           truth stand. Then tell Rosa what you found. All of it, or not.
   Day 3   Evening: the truth game in the dormitory.
   Day 5   The Hearing. Truth serum, a chair in the middle of the room, and
           every Candor in the building on the benches. Whatever you are, it
           comes out — unless you can hold it in, and nobody sees you try.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const FW = () => DV.FirstWeek;

  const PL = () => DV.State.data.player;
  const APT = () => DV.State.data.aptitude;
  const adult = (f, sex, seed, age, h) => { const a = DV.Character.fromFaction(f, sex, seed, { age: age || 40 }); a.height = (a.height || 1) * (h || 1.05); return a; };

  /* ============================== the zone ============================== */
  (function () {
    const props = [];
    const add = (type, x, z, o) => props.push(Object.assign({ type, x, z }, o || {}));
    // the evidence room
    add('table', 4.5, 4.6, { w: 2.6, d: 1.1, chairs: 0, top: 'wood' });
    add('filing_cabinet', 0.5, 2.5, { rotDeg: 90, n: 3 });
    add('file_shelf', 4.5, 9.6, { rotDeg: 180, len: 3.2 });
    add('noticeboard', 8.85, 5, { rotDeg: -90, w: 2.2, h: 1.1 });
    // the interview room: a table, two chairs, a mirror that isn't one
    add('table', 14.5, 5, { w: 1.5, d: 0.9, chairs: 0, top: 'black' });
    add('chair', 14.5, 3.95, { style: 'wood', rotDeg: 0, noCollide: true });
    add('chair', 14.5, 6.05, { style: 'wood', rotDeg: 180, noCollide: true });
    add('mirror', 19.85, 5, { rotDeg: -90, w: 3.2, h: 1.6 });
    // the initiates' dormitory
    for (let k = 0; k < 4; k++) { add('bed', 21.2, 1.6 + k * 2.3, { rotDeg: 90 }); add('bed', 30.8, 1.6 + k * 2.3, { rotDeg: -90 }); }
    add('table', 26, 5, { w: 1.8, d: 1.0, chairs: 4, top: 'wood', id: 'cu_game' });
    // the corridor
    add('noticeboard', 7, 13.35, { rotDeg: 180, w: 2.4, h: 1.0 });
    add('bench', 9, 10.3, { len: 2.0, seatable: false });
    // the Hearing Room: benches in a ring round one chair
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + 0.31;
      if (Math.abs(Math.sin(a) + 1) < 0.25) continue; // leave the doorway side open
      add('bench', 16 + Math.cos(a) * 7.2, 22 + Math.sin(a) * 6.0, { id: 'hb' + k, rotDeg: (Math.atan2(-Math.cos(a), -Math.sin(a)) * 180) / Math.PI, len: 3.0, seatable: false });
    }
    add('chair', 16, 22, { style: 'wood', rotDeg: 0, noCollide: true });
    add('serum_tray', 17.1, 22.3, {});
    add('floor_emblem', 16, 22, { size: 4.2, color: '#e8e6e0', bg: '#111111' });
    add('emblem', 16, 29.9, { rotDeg: 180, faction: 'candor', y: 4.2, size: 3.0 });
    for (const x of [3, 29]) add('column', x, 27, { h: 7, size: 0.8, mat: 'white' });
    DV.Zones.define('cand_upper', {
      name: 'The Merciless Mart',
      region: 'Candor headquarters, the upper floors',
      chapter: true, noDiscover: true,
      bounds: { x0: -2, z0: -2, x1: 34, z1: 32 },
      buildingHeight: 12,
      fog: { color: 0x3a3a3a, near: 40, far: 160 },
      sky: { top: 0x5b6773, horizon: 0x9ca3a9, ground: 0x585b5d, skyline: false },
      rooms: [
        { id: 'cu_evid', name: 'Evidence Room', x0: 0, z0: 0, x1: 9, z1: 10, h: 3.2, floor: 'tile_floor', wall: 'paint_white', ceiling: 'ceiling_tile', light: { ambient: [0.42, 0.42, 0.42], color: [1, 1, 0.95], intensity: 0.85, spacing: 4, range: 6 } },
        { id: 'cu_interview', name: 'Interview Room', x0: 9, z0: 0, x1: 20, z1: 10, h: 3.2, floor: 'carpet_dark', wall: 'paint_white', ceiling: 'ceiling_tile', light: { ambient: [0.3, 0.3, 0.32], color: [1, 0.98, 0.92], intensity: 1.0, spacing: 6, range: 6 } },
        { id: 'cu_dorm', name: 'Initiates\' Dormitory', x0: 20, z0: 0, x1: 32, z1: 10, h: 3.2, floor: 'marble_check', wall: 'paint_white', ceiling: 'ceiling_tile', light: { ambient: [0.36, 0.36, 0.38], color: [1, 0.96, 0.88], intensity: 0.8, spacing: 4, range: 6 } },
        { id: 'cu_corr', name: 'Corridor', x0: 0, z0: 10, x1: 32, z1: 13.5, h: 3.2, floor: 'marble_check', wall: 'paint_white', ceiling: 'ceiling_tile', light: { ambient: [0.4, 0.4, 0.4], color: [1, 1, 0.97], intensity: 0.8, spacing: 5, range: 6 } },
        { id: 'cu_hearing', name: 'Hearing Room', x0: 0, z0: 13.5, x1: 32, z1: 30, h: 7, floor: 'marble_check', wall: 'paint_white', ceiling: 'paint_white', light: { ambient: [0.46, 0.46, 0.46], color: [1, 1, 0.97], intensity: 0.95, spacing: 5, range: 8 } },
      ],
      doors: [
        { id: 'cu_ev_door', x: 4.5, z: 10, dir: 'x', w: 1.2, type: 'wood' },
        { id: 'cu_iv_door', x: 14.5, z: 10, dir: 'x', w: 1.2, type: 'wood' },
        { id: 'cu_dm_door', x: 26, z: 10, dir: 'x', w: 1.2, type: 'wood' },
        { id: 'cu_hr_door', x: 16, z: 13.5, dir: 'x', w: 3, type: 'glass' },
      ],
      windows: [{ id: 'cu_w1', x: 0, z: 22, dir: 'z', w: 6, sill: 1.0, top: 6 }, { id: 'cu_w2', x: 32, z: 22, dir: 'z', w: 6, sill: 1.0, top: 6 }],
      props,
      spawn: { x: 24, z: 7.6, rot: 2.49 },
      build(ctx) {
        const city = DV.City.build({ seed: 503, campus: [-20, -20, 52, 50], gridX: [-470, -394, -318, -242, -166, -90, -26, 58, 134, 210, 286, 362, 438], gridZ: [-460, -396, -332, -268, -204, -140, -76, -26, 56, 120, 184, 248, 312, 376], radius: 520, hub: [-160, -260], haze: 0x9aa0a6 });
        ctx.add(city.group); ctx.zone.city = city;
        ctx.update((dt) => city.update(dt, DV.Game && DV.Game.camera));
        ctx.interact({ id: 'cu_notice', kind: 'examine', x: 7, y: 1.5, z: 13.0, radius: 1.6, label: 'Read', name: 'Noticeboard', title: 'Noticeboard', text: 'INITIATES — WEEK ONE\n\nDAY 3   Casework. Evidence room 08:00. Interviews from 10:00.\nDAY 4   Casework (cont.). Reading: The Manifesto, chapters 1–4.\nDAY 5   THE HEARING. 10:00. Attendance is not optional. Nothing is optional.\n\nReminder: there is no such thing as a white lie. There is a lie, and there is a person too lazy to tell the truth.\n\n(Underneath, in pencil: "who keeps taking the last coffee. we will find out.")' });
      },
    });
  })();

  /* ============================== the case ============================== */
  // what Dale Hollis says across the table, one statement at a time
  const STATEMENTS = [
    { text: 'My name is Dale Hollis. I\'ve been night clerk at the dispensary for six years.', lie: false, cue: null },
    { text: 'I locked up at ten o\'clock, same as always. Ten on the dot.', lie: true, ev: 'ledger', cue: 'his eyes flick to the door', crack: 'Twenty to eleven. All right. I was — tidying. I lost track.', wrong: 'The ledger says otherwise, doesn\'t it. Fine.' },
    { text: 'I caught the ten o\'clock train home and I was in bed by eleven.', lie: true, ev: 'ticket', cue: 'a pause a beat too long before he starts', crack: '...Quarter past eleven. I missed the ten. I missed the ten-thirty too.', wrong: '[He shrugs.] You can say that. Can you prove it?' },
    { text: 'I never touched the stores cabinet. I don\'t even carry that key.', lie: true, ev: 'ledger', cue: 'his hand goes to the back of his neck', crack: '[He looks at his initials in the cabinet log for a long time.] I carry the key.', wrong: 'Says who?' },
    { text: 'Anybody could have taken that crate. The back door hasn\'t locked properly in a year.', lie: false, cue: 'he rubs the back of his neck', nervous: true, defend: 'It hasn\'t! Ask anyone who works nights. Ask maintenance — I\'ve filed three requests.' },
    { text: 'I don\'t know anybody who needs those medicines. Why would I?', lie: true, ev: 'note', cue: 'he swallows, and won\'t look at you', crack: '[He sees the note and something in his face gives way.] That\'s — where did you — that\'s my sister\'s writing.', wrong: 'No. Nobody.' },
    { text: 'I have never lied to Candor in my life.', lie: true, ev: 'any', cue: 'he folds his arms, and leans away from the table', crack: '[A short, awful laugh.] No. I suppose I have now.', wrong: 'Never.' },
  ];
  const EVIDENCE = {
    ledger: { key: '1', name: 'The dispensary ledger', short: 'Ledger' },
    ticket: { key: '2', name: 'The train ticket from his coat', short: 'Ticket' },
    note: { key: '3', name: 'The note sewn into his coat lining', short: 'Note' },
  };
  const ev = () => FW().st().evidence || (FW().st().evidence = {});

  /* ------------------------------ the interview (an activity) ------------------------------ */
  class Interview {
    constructor(o) { this.id = 'interview'; this.o = o; }
    begin(A) {
      const P = DV.Player, o = this.o;
      this.A = A;
      this.dale = o.dale;
      P.place(14.5, 3.95, 0);
      this.dale.place(14.5, 6.05, Math.PI);
      this.dale.action = 'sit';
      this.i = -1; this.phase = 'start'; this.t = 1.2;
      this.res = { cracked: 0, pressed: 0, wrong: 0, missed: 0, lies: STATEMENTS.filter((s) => s.lie).length, notes: [] };
      this.pressure = 0;
      this.found = Object.keys(EVIDENCE).filter((k) => ev()[k]);
      DV.Game.rig.setTrack(new THREE.Vector3(15.25, 1.5, 2.95), new THREE.Vector3(14.45, 1.12, 6.1), 5, true, new THREE.Vector3(14.5, 1.3, 4.6));
      const h = U.el('div', 'iv-hud', '<div class="tr-box"><div class="tr-title">INTERVIEW · DALE HOLLIS</div><div class="tr-line iv-n"></div><div class="iv-press"><span>Pressure</span><div class="fh-bar"><i></i></div></div></div><div class="iv-cue"></div><div class="iv-pick hidden"></div>', A.hud);
      this.h = h;
      this.keysIdle();
      A.announce('LISTEN', 1.4);
    }
    keysIdle() { this.A.keys('Watch him. <b>LMB</b> / <b>E</b> challenge what he just said · <b>RMB</b> / <b>Space</b> let it stand'); }
    q(sel) { return this.h.querySelector(sel); }
    cue(text) {
      const c = this.q('.iv-cue');
      c.textContent = text ? '[' + text + ']' : '';
      c.classList.toggle('on', !!text);
    }
    // can you see it? Perception and Observation decide whether you notice the tell
    sees(s) {
      if (!s.cue) return false;
      if (s.nervous) return true; // he's nervous anyway — everyone notices that
      const k = DV.Stats.attr('perception') + DV.Stats.skill('observation') / 25;
      return k >= 6 || (k >= 4.5 && this.i % 2 === 1);
    }
    nextStatement() {
      this.i++;
      this.cue(null);
      if (this.i >= STATEMENTS.length) { this.wrapUp(); return; }
      const s = STATEMENTS[this.i];
      this.q('.iv-n').textContent = 'Statement ' + (this.i + 1) + ' of ' + STATEMENTS.length;
      // the beat before he answers: a liar takes longer, and looks somewhere else first
      this.phase = 'pause';
      this.t = s.lie ? U.rand(1.1, 1.6) : U.rand(0.4, 0.7);
      this.dale.action = 'sit';
      this.dale.lookAt(s.lie && this.i !== 6 ? [19.5, 10] : null);
      if (s.lie || s.nervous) this.after(this.t * 0.5, () => { if (this.sees(s)) this.cue(s.cue); });
    }
    speak() {
      const s = STATEMENTS[this.i];
      this.phase = 'speak';
      this.t = 1.4 + s.text.length / 16;
      this.dale.lookAt(null);
      this.dale.say(s.text, this.t, true);
      DV.UI.subtitle('Dale Hollis', s.text, this.t);
      if (s.lie || s.nervous) {
        const act = this.i === 6 ? 'sit_fold' : this.i === 1 ? 'sit' : 'sit_touch';
        this.after(this.t * 0.35, () => { if (this.phase === 'speak') this.dale.action = act; });
        if (this.i === 1 || this.i === 5) this.after(this.t * 0.55, () => { if (this.phase === 'speak') this.dale.lookAt([19.5, 10]); });
      }
    }
    window() {
      this.phase = 'window';
      this.t = 3.2;
      this.dale.lookAt(null);
      if (this.dale.action === 'sit_touch') this.dale.action = 'sit';
    }
    challenge() {
      const s = STATEMENTS[this.i];
      this.phase = 'pick';
      const p = this.q('.iv-pick');
      const opts = this.found.map((k) => '<div><b>' + EVIDENCE[k].key + '</b> ' + EVIDENCE[k].name + '</div>').join('');
      p.innerHTML = '<div class="iv-ph">Challenge: "' + U.esc(s.text.length > 60 ? s.text.slice(0, 58) + '…' : s.text) + '"</div>' + opts + '<div><b>0</b> No paper — just tell him it isn\'t true</div><div class="dim"><b>Space</b> never mind, let it stand</div>';
      p.classList.remove('hidden');
      this.A.keys('<b>1</b>–<b>3</b> show him the evidence · <b>0</b> just say it · <b>Space</b> back down');
      DV.Audio.play('paper', { volume: 0.6 });
    }
    resolve(choice) {
      const s = STATEMENTS[this.i];
      this.q('.iv-pick').classList.add('hidden');
      this.keysIdle();
      this.cue(null);
      let line, score = 0;
      if (choice === 'stand') {
        if (s.lie) { this.res.missed++; this.res.notes.push('let statement ' + (this.i + 1) + ' stand'); }
        this.reply(null);
        return;
      }
      if (!s.lie) {
        // the truth, challenged: he digs in, and trusts you less
        this.res.wrong++;
        this.pressure = Math.max(0, this.pressure - 18);
        line = s.defend || 'That\'s the truth. Write it down.';
        score = -1;
        DV.Audio.play('check_fail', { volume: 0.5 });
        if (this.o.rosa) this.after(this.t + 0.2, () => {});
        this.res.notes.push('challenged the truth (statement ' + (this.i + 1) + ')');
        this.reply(line, 'wrong');
        void score;
        return;
      }
      const right = choice !== 'none' && (s.ev === 'any' ? this.res.cracked + this.res.pressed >= 2 || choice !== 'none' : choice === s.ev);
      if (right) {
        this.res.cracked++;
        this.pressure = Math.min(100, this.pressure + 24);
        if (s.ev === 'note' || choice === 'note') this.res.motive = true;
        DV.Audio.play('check_ok', { volume: 0.55 });
        this.dale.action = 'sit';
        this.reply(s.crack, 'crack');
      } else {
        // you knew it was a lie, but you couldn't show him: it rattles him, it doesn't break him
        this.res.pressed++;
        this.pressure = Math.min(100, this.pressure + (choice === 'none' ? 10 : 6));
        this.reply(s.wrong, 'press');
      }
    }
    reply(line, kind) {
      this.phase = 'reply';
      if (!line) { this.t = 0.5; return; }
      this.t = 1.2 + line.length / 17;
      this.dale.say(line, this.t, true);
      DV.UI.subtitle('Dale Hollis', line, this.t);
      if (kind === 'crack') this.A.announce('CAUGHT', 1.0, 'good');
      else if (kind === 'wrong') this.A.announce('THAT WAS TRUE', 1.2, 'bad');
    }
    wrapUp() {
      const r = this.res;
      r.confessed = r.cracked >= 3 || (r.cracked >= 2 && this.pressure >= 60);
      // marks: two for a lie caught with the right paper, one for a lie called without it, minus one for each truth you called a lie
      r.points = U.clamp(r.cracked * 2 + r.pressed - r.wrong, 0, r.lies * 2);
      this.phase = 'done';
      this.dale.action = r.confessed ? 'sit_touch' : 'sit_fold';
      this.A.announce(r.confessed ? 'HE BREAKS' : 'HE HOLDS', 1.6, r.confessed ? 'good' : 'bad');
      this.after(1.8, () => this.A.finish(r));
    }
    update(dt, input, A) {
      this.tick(dt);
      FW().pose(dt, { action: 'sit', seatY: 0.45 });
      this.q('.iv-press .fh-bar i').style.width = this.pressure.toFixed(0) + '%';
      if (this.phase === 'done') return;
      this.t -= dt;
      if (this.phase === 'start') { if (this.t <= 0) this.nextStatement(); return; }
      if (this.phase === 'pause') { if (this.t <= 0) this.speak(); return; }
      if (this.phase === 'pick') {
        for (const k of this.found) if (input.consume('Digit' + EVIDENCE[k].key) || input.consume('Numpad' + EVIDENCE[k].key)) { this.resolve(k); return; }
        if (input.consume('Digit0') || input.consume('Numpad0')) { this.resolve('none'); return; }
        if (input.consume('Space') || input.consume('MouseRight')) { this.q('.iv-pick').classList.add('hidden'); this.keysIdle(); this.phase = 'window'; this.t = Math.max(this.t, 1.2); }
        input.consume('MouseLeft'); input.consume('KeyE');
        return;
      }
      // you can call it while he's still talking, or in the moment after
      if (this.phase === 'speak' || this.phase === 'window') {
        if (input.consume('MouseLeft') || input.consume('KeyE')) { this.challenge(); return; }
        if (this.phase === 'window' && (input.consume('Space') || input.consume('MouseRight'))) { this.resolve('stand'); return; }
      }
      if (this.t > 0) return;
      if (this.phase === 'speak') this.window();
      else if (this.phase === 'window') this.resolve('stand');
      else if (this.phase === 'reply') this.nextStatement();
    }
    end() { this.dale.lookAt(null); }
  }
  Object.assign(Interview.prototype, { after(t, fn) { FW().timers.after.call(this, t, fn); }, tick(dt) { FW().timers.tick.call(this, dt); } });

  /* ------------------------------ the serum (an activity) ------------------------------ */
  // Rosa asks; your mouth answers. Hold Space to clamp your jaw shut; hold long enough and
  // there's room to say something else. Most people can't, for long. Some people can.
  class Serum {
    constructor(o) { this.id = 'serum'; this.o = o; }
    begin(A) {
      const P = DV.Player;
      this.A = A;
      P.place(16, 22, 0);
      this.div = !!APT().divergent;
      this.will = 100; this.strain = 0; this.visible = 0;
      this.qs = this.o.questions;
      this.i = -1; this.answers = [];
      this.phase = 'onset'; this.t = 2.4;
      DV.Game.rig.setTrack(new THREE.Vector3(13.4, 1.75, 25.6), new THREE.Vector3(16, 1.0, 22), 3, true, new THREE.Vector3(16, 1.4, 23));
      const h = U.el('div', 'serum-hud', '<div class="serum-haze"></div><div class="serum-q"></div><div class="serum-a"></div><div class="serum-will"><span>Will</span><div class="fh-bar"><i></i></div></div>', A.hud);
      this.h = h;
      A.keys('hold <b>Space</b> to clench your jaw');
      DV.Audio.play('heartbeat', { volume: 0.5 });
    }
    q(sel) { return this.h.querySelector(sel); }
    drain() {
      if (this.div) return 6;
      const res = DV.Stats.attr('resolve');
      return U.lerp(46, 24, U.clamp((res - 3) / 7, 0, 1));
    }
    ask() {
      this.i++;
      if (this.i >= this.qs.length) { this.done(); return; }
      const Q = this.qs[this.i];
      this.cur = { q: Q, typed: 0, held: 0, mode: 'truth', text: Q.truth };
      this.phase = 'asking';
      this.t = 1.3 + Q.q.length / 18;
      this.q('.serum-q').textContent = Q.q;
      this.q('.serum-a').textContent = '';
      this.q('.serum-a').className = 'serum-a';
      if (this.o.rosa) this.o.rosa.say(Q.q, this.t + 1, true);
      this.will = Math.min(100, this.will + 22);
    }
    done() {
      this.phase = 'end';
      this.q('.serum-q').textContent = '';
      this.after(1.6, () => this.A.finish({ answers: this.answers, strain: this.strain, visible: this.visible, div: this.div }));
    }
    update(dt, input, A) {
      this.tick(dt);
      FW().pose(dt, { action: 'sit_slump', seatY: 0.45 });
      this.q('.serum-will .fh-bar i').style.width = this.will.toFixed(0) + '%';
      this.q('.serum-haze').style.opacity = (0.55 + Math.sin(A.t * 1.3) * 0.12).toFixed(3);
      if (this.phase === 'end') return;
      this.t -= dt;
      if (this.phase === 'onset') { if (this.t <= 0) this.ask(); return; }
      if (this.phase === 'asking') { if (this.t <= 0) { this.phase = 'answer'; this.t = 0; } return; }
      if (this.phase === 'between') { if (this.t <= 0) this.ask(); return; }
      // answering: the words come out on their own unless you hold them in
      const C = this.cur, Q = C.q;
      const hold = input.down('Space') && this.will > 0 && C.mode === 'truth';
      if (hold) {
        this.will = Math.max(0, this.will - this.drain() * dt);
        C.held += dt; this.strain += dt;
        this.visible += dt * (this.div ? 0.3 : 1);
        if (this.will <= 0) { A.announce('IT COMES OUT ANYWAY', 1.4, 'bad'); DV.Audio.play('check_fail', { volume: 0.5 }); }
      } else this.will = Math.min(100, this.will + 4 * dt);
      const canLie = C.mode === 'truth' && Q.lie && C.held >= 2.0 && this.will > 12;
      A.keys(canLie ? 'hold <b>Space</b> to clench your jaw · <b>E</b> say something else' : 'hold <b>Space</b> to clench your jaw');
      if (canLie && input.consume('KeyE')) {
        C.mode = 'lie'; C.text = Q.lie; C.typed = 0;
        this.will = Math.max(0, this.will - 25);
        this.q('.serum-a').className = 'serum-a lie';
        DV.Audio.play('glitch', { volume: 0.4 });
      }
      input.consume('KeyE');
      if (!hold) C.typed += dt * (C.mode === 'lie' ? 11 : 15);
      const n = Math.min(C.text.length, Math.floor(C.typed));
      this.q('.serum-a').textContent = '"' + C.text.slice(0, n) + (n < C.text.length ? '▌' : '"');
      this.q('.serum-a').classList.toggle('held', hold);
      if (n >= C.text.length) {
        this.answers.push({ id: Q.id, said: C.mode, held: C.held });
        if (Q.after) Q.after(C.mode, this);
        this.phase = 'between';
        this.t = 3.2;
      }
    }
    end() {}
  }
  Object.assign(Serum.prototype, { after(t, fn) { FW().timers.after.call(this, t, fn); }, tick(dt) { FW().timers.tick.call(this, dt); } });

  /* ============================== the week ============================== */
  const STEPS = {
    case: { day: 3, time: '07:50', title: 'CANDOR\nTHE FIRST WEEK · DAY 3' },
    evening: { day: 3, time: '20:40', title: 'DAY 3 · EVENING' },
    hearing: { day: 5, time: '09:40', title: 'DAY 5\nTHE HEARING' },
    end: { day: 5, time: '12:10' },
  };
  const step = (o) => STEPS[(o && o.step) || 'case'] || STEPS.case;
  // the class: the people from your Aptitude Day who chose Candor, and one who was born to it
  const OWEN = { id: 'owen_price', name: 'Owen Price', app: adult('candor', 'm', 'owen-price', 16, 1.0), bias: 66 };
  const peers = () => FW().classOf('candor', [OWEN]).map((p) => Object.assign({ bias: { nora_kelly: 74, grace_chen: 70, jenna_morales: 78, patel_arjun: 58, quinn_tyler: 61 }[p.id] || 64 }, p));

  DV.Chapter.define('week_candor', {
    zone: 'cand_upper',
    day: (o) => step(o).day,
    time: (o) => step(o).time,
    title: (o) => step(o).title,
    canPass() { return true; },
    start(Ch, zone, opts) {
      FW().fresh(Ch);
      const s = opts.step || 'case';
      DV.Audio.setMusic(s === 'hearing' ? 'none' : 'calm');
      Ch.rosa = Ch.actor({ id: 'rosa', name: 'Rosa Medina', faction: 'candor', app: adult('candor', 'f', 'rosa-medina', 45, 1.03), x: 26, z: 11.6, rot: 0, action: 'arms_crossed' });
      Ch.peers = peers().slice(0, 6);
      if (!DV.Quests.started('week_candor')) DV.Quests.start('week_candor');
      DV.Quests.tracked = 'week_candor';
      this[s] ? this[s](Ch, zone, opts) : this.case(Ch, zone, opts);
    },
    // a peer by id (or the n-th one)
    peer(Ch, id) { return Ch.peerActors && Ch.peerActors.find((a) => a.id === id); },

    /* ---------------- Day 3: the Hollis case ---------------- */
    case(Ch, zone, opts) {
      Ch.checkpoint('case');
      // the others, getting ready / at the evidence table
      const spots = [[22.4, 2.4, 'idle'], [29.6, 4.4, 'idle'], [3.2, 6.2, 'read'], [6.0, 6.0, 'read'], [22.4, 7.2, 'idle'], [29.6, 7.9, 'arms_crossed']];
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'candor', app: p.app, x: spots[i][0], z: spots[i][1], rot: i % 2 ? -Math.PI / 2 : Math.PI / 2, action: spots[i][2] }));
      // Dale Hollis, waiting in the interview room
      Ch.dale = Ch.actor({ id: 'dale', name: 'Dale Hollis', faction: 'candor', app: adult('candor', 'm', 'dale-hollis', 51, 1.02), x: 14.5, z: 6.05, rot: Math.PI, action: 'sit' });
      this.placeEvidence(Ch);
      const e = ev();
      if (!FW().was('briefed')) {
        Ch.seq([
          () => 1.4,
          () => { Ch.rosa.face(DV.Player.x, DV.Player.z); },
          FW().say(Ch, Ch.rosa, 'Up. All of you. You\'ve had two days of being new. That\'s over.', 3.4),
          FW().say(Ch, Ch.rosa, 'Last night a crate of medicine walked out of our dispensary. The night clerk, Dale Hollis, says he locked up at ten and went home.', 4.6),
          FW().say(Ch, Ch.rosa, 'The evidence is on the table at the end of the corridor. He\'s in the interview room. Read first. Then go and listen to him. Really listen.', 4.8),
          () => { FW().note('briefed'); DV.Quests.setObj('week_candor', 'evidence', 'active'); Ch.rosa.walk([[26, 12], [12, 12], [10.6, 8.2]], 1.3, (a) => { a.face(14.5, 6); a.action = 'arms_crossed'; }); },
        ], 'brief');
      } else Ch.rosa.place(10.6, 8.2, 0.8);
      // peers have things to say this morning
      this.peerTalk(Ch);
      Ch.interact({
        id: 'iv_sit', kind: 'action', x: 14.5, y: 0.8, z: 3.6, radius: 1.3, label: 'Sit down across from him', name: 'Dale Hollis',
        cond: () => DV.Quests.obj('week_candor', 'interview') === 'active' && !FW().was('hollis'),
        onUse: () => this.interview(Ch),
      });
      // reporting to Rosa
      FW().talkTo(Ch, Ch.rosa, () => (FW().was('hollis') && !FW().was('verdict') ? 'cand_verdict' : 'cand_rosa'), { id: 'rosa_talk' });
      if (e.ledger && e.ticket && e.report) DV.Quests.activate('week_candor', 'interview');
      if (FW().was('hollis') && !FW().was('verdict')) { DV.Quests.activate('week_candor', 'verdict'); Ch.dale.action = 'sit_fold'; }
      // (a save from after the verdict: on to the evening)
      if (FW().was('verdict')) Ch.after(1.0, () => FW().next(Ch, 'evening', STEPS.evening.title));
    },
    placeEvidence(Ch) {
      // the case file, the ledger and his coat laid out on the evidence table
      const g = new THREE.Group();
      const paper = new THREE.MeshLambertMaterial({ color: 0xe8e4d8 }), book = new THREE.MeshLambertMaterial({ color: 0x2a2a2e }), coat = new THREE.MeshLambertMaterial({ color: 0x1c1c1e });
      const m = (geo, mat, x, y, z, ry) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.y = ry || 0; g.add(o); return o; };
      m(new THREE.BoxGeometry(0.32, 0.05, 0.42), book, 3.7, 0.765, 4.55, 0.1);
      m(new THREE.BoxGeometry(0.3, 0.012, 0.4), paper, 4.6, 0.746, 4.4, -0.2);
      m(new THREE.BoxGeometry(0.75, 0.08, 0.5), coat, 5.4, 0.78, 4.7, 0.3);
      Ch.addObject(g);
      const e = ev();
      const read = (key, title, text) => () => { e[key] = true; DV.Stats.practice('observation', 0.5); DV.UI.showReading(title, text, () => this.checkEvidence(Ch)); };
      Ch.interact({ id: 'ev_report', kind: 'action', x: 4.6, y: 0.9, z: 4.0, radius: 1.2, label: 'Read', name: 'Incident Report', onUse: read('report', 'Incident Report — Dispensary, Night of Day 2', 'MISSING: one crate, sealed, from the stores cabinet.\n  fever tablets ×40 · antibiotic course ×6 · rehydration salts ×20\n\nCabinet found locked at 06:00 by the day clerk. No forced entry.\nBack door: faulty latch (maintenance request outstanding).\n\nSTATEMENT OF THE NIGHT CLERK, D. HOLLIS:\n"I locked up at ten, the same as always, and caught the ten o\'clock train. I was in bed by eleven. I never went near the stores cabinet — I don\'t carry that key. I don\'t know who would want it."') });
      Ch.interact({ id: 'ev_ledger', kind: 'action', x: 3.7, y: 0.9, z: 4.0, radius: 1.2, label: 'Read', name: 'Dispensary Ledger', onUse: read('ledger', 'Dispensary Ledger', 'NIGHT OF DAY 2\n\n  20:02   Night clerk on — D.H.\n  21:15   Prescription collected (Sector 3) — D.H.\n  22:31   STORES CABINET OPENED — D.H.\n  22:34   STORES CABINET CLOSED — D.H.\n  22:40   Night clerk off — D.H.\n\nThe initials are the same small, careful hand every time. Whoever opened the cabinet had the key; the cabinet log says it was the night clerk.') });
      Ch.interact({ id: 'ev_coat', kind: 'action', x: 5.4, y: 0.9, z: 4.0, radius: 1.2, label: () => (e.ticket ? 'Search the lining' : 'Search the pockets'), name: 'Hollis\'s Coat',
        cond: () => !e.note && !(e.ticket && e.liningTried),
        onUse: () => {
          if (!e.ticket) { read('ticket', 'His Coat — Breast Pocket', 'A rail ticket: HUB → SECTOR 9, NORTHBOUND.\nPunched at the Hub barrier: 23:15.\n\nThe ten o\'clock train doesn\'t leave at quarter past eleven.')(); return; }
          // the lining: you have to know to look, or have the eye for it
          e.liningTried = true;
          const k = DV.Stats.attr('perception') + DV.Stats.skill('observation') / 25;
          if (k >= 6 || e.tipped) {
            DV.Audio.play('paper');
            if (k >= 6) DV.Stats.practice('observation', 1);
            read('note', 'A Note, Sewn into the Lining', 'Folded small, the paper soft from handling. A woman\'s handwriting, Abnegation-plain:\n\n"Dale — Tilly\'s fever is worse. Four days now. The clinic has nothing left, they say Erudite hasn\'t sent the order. I wouldn\'t ask if there were anyone else. Please. — M."\n\nOn the back, in his careful clerk\'s hand: a list. Fever tablets. Antibiotics. Salts.')();
          } else DV.UI.showReading('His Coat — the Lining', 'You run your hands over the lining. A seam that might have been mended, a loose thread. Nothing you can be sure of.');
        } });
    },
    checkEvidence(Ch) {
      const e = ev();
      if (e.ledger && e.ticket && e.report && DV.Quests.obj('week_candor', 'interview') !== 'active' && !FW().was('hollis')) {
        DV.Quests.setObj('week_candor', 'evidence', 'done', 'The ledger, the ticket, the statement' + (e.note ? ' — and a note sewn into his coat.' : '.'));
        DV.Quests.activate('week_candor', 'interview');
      }
      // a second look, once you've been told where
      if (e.tipped && !e.note) e.liningTried = false;
    },
    peerTalk(Ch) {
      const nora = this.peer(Ch, 'nora_kelly') || Ch.peerActors[0];
      if (nora) FW().talkTo(Ch, nora, 'cand_nora', { id: 'talk_nora' });
      const owen = this.peer(Ch, 'owen_price');
      if (owen) FW().talkTo(Ch, owen, 'cand_owen', { id: 'talk_owen' });
    },
    interview(Ch) {
      Ch.rosa.place(10.8, 2.0, 0.9); Ch.rosa.action = 'arms_crossed';
      DV.Quests.setObj('week_candor', 'evidence', 'done');
      DV.Activity.start(new Interview({ dale: Ch.dale, rosa: Ch.rosa }), (r) => {
        FW().note('hollis', { cracked: r.cracked, pressed: r.pressed, wrong: r.wrong, missed: r.missed, confessed: r.confessed, motive: !!r.motive });
        FW().mark('interview', r.points, r.lies * 2, 'The Hollis interview: ' + r.cracked + ' of ' + r.lies + ' lies caught with the evidence, ' + r.wrong + ' truth' + (r.wrong === 1 ? '' : 's') + ' called a lie.');
        DV.Quests.setObj('week_candor', 'interview', 'done', r.confessed ? 'Dale Hollis broke. He took the crate.' : 'Dale Hollis held to his story.');
        FW().placePlayer(14.5, 3.3, 0);
        Ch.scene('cand_hollis_end');
      });
    },
    onDialogueEnd(Ch, e) {
      if (e.tree === 'cand_hollis_end') { DV.Quests.activate('week_candor', 'verdict'); Ch.say(Ch.rosa, 'My office is the corridor. Come and tell me what you found.', 3.4); Ch.rosa.walk([[11.5, 8.5], [12, 11.6]], 1.3, (a) => a.face(14.5, 10)); }
      if (e.tree === 'cand_verdict' && FW().was('verdict')) {
        Ch.seq([
          () => 1.0,
          FW().say(Ch, Ch.rosa, 'Go and eat. Tonight the others will want to play the game. Play it. It\'s practice for Friday.', 4.0),
          () => FW().next(Ch, 'evening', STEPS.evening.title),
        ], 'after_verdict');
      }
      if (e.tree === 'cand_truth_game' && FW().was('game_played')) {
        DV.Quests.activate('week_candor', 'serum');
        Ch.after(1.2, () => this.rosaVisit(Ch));
      }
    },

    /* ---------------- Day 3, evening: the truth game ---------------- */
    evening(Ch) {
      Ch.checkpoint('evening');
      FW().placePlayer(24, 7.6, 2.49);
      DV.Quests.setObj('week_candor', 'verdict', 'done');
      Ch.rosa.place(23.5, 11.8, 0.6); Ch.rosa.action = 'arms_crossed';
      const seats = [[25.4, 4.2, 0], [26.6, 4.2, 0], [25.4, 5.8, Math.PI], [26.6, 5.8, Math.PI], [22.4, 2.4, Math.PI / 2], [29.6, 7.9, -Math.PI / 2]];
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'candor', app: p.app, x: seats[i][0], z: seats[i][1], rot: seats[i][2], action: i < 4 ? 'sit' : 'lie', seatY: i < 4 ? 0.45 : 0.62 }));
      this.peerTalk(Ch);
      if (!FW().was('game_played')) {
        Ch.interact({ id: 'join_game', kind: 'action', x: 26, y: 0.8, z: 6.6, radius: 1.5, label: 'Join the game', name: 'The Truth Game', cond: () => !FW().was('game_played'), onUse: () => { DV.Player.place(26, 6.6, Math.PI); Ch.scene('cand_truth_game'); } });
        Ch.after(1.6, () => { const o = this.peer(Ch, 'owen_price'); if (o) Ch.say(o, 'There they are. Sit. We\'re playing. Nobody\'s allowed to say "pass".', 3.6); });
      } else {
        DV.Quests.activate('week_candor', 'serum');
        if (!FW().was('rosa_night')) Ch.after(1.5, () => this.rosaVisit(Ch));
      }
      FW().sleepSpot(Ch, { x: 21.2, z: 8.5, to: 'hearing', title: STEPS.hearing.title, label: 'Sleep (until the Hearing)', cond: () => FW().was('rosa_night') });
    },
    rosaVisit(Ch) {
      // she's been listening at the door, as Candor do
      Ch.rosa.walk([[26, 11.4], [26, 8.8]], 1.3, (a) => a.face(DV.Player.x, DV.Player.z));
      Ch.seq([
        () => () => !Ch.rosa.moving,
        () => { Ch.scene('cand_rosa_night'); },
      ], 'rosa_visit');
    },

    /* ---------------- Day 5: the Hearing ---------------- */
    hearing(Ch, zone) {
      Ch.checkpoint('hearing');
      // (a save from after the serum: straight to the standings)
      if (FW().was('serum')) { Ch.setFlag('sat'); Ch.after(0.5, () => this.finish(Ch)); }
      DV.Quests.activate('week_candor', 'serum');
      // every Candor in the building, on the benches; the initiates on the two nearest the door
      const seats = [];
      for (let k = 0; k < 10; k++) for (let j = 0; j < 4; j++) { const sp = zone.spot('hb' + k + '_s' + j); if (sp) seats.push(sp); }
      const byDoor = seats.slice().sort((a, b) => a.z - b.z);
      const mine = byDoor.slice(0, Ch.peers.length);
      const theirs = seats.filter((sp) => mine.indexOf(sp) < 0 && (sp.x * 7 + sp.z * 3) % 5 > 0.9);
      Ch.crowdH = Ch.crowd(theirs.map((sp) => ({ x: sp.x, z: sp.z, rot: sp.rot, action: 'sit' })), { faction: 'candor', seed: 'hearing', adults: true });
      Ch.crowdH.forEach((a) => { a.name = 'Candor'; });
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'candor', app: p.app, x: mine[i].x, z: mine[i].z, rot: mine[i].rot, action: 'sit' }));
      Ch.rosa.place(16, 24.6, Math.PI); Ch.rosa.action = 'arms_crossed';
      FW().placePlayer(16, 12.2, 0);
      Ch.interact({ id: 'hr_chair', kind: 'action', x: 16, y: 0.8, z: 21.4, radius: 1.6, label: 'Sit in the chair', name: 'The Chair', cond: () => !Ch.flag('sat'), onUse: () => this.serum(Ch) });
      Ch.after(2.0, () => Ch.say(Ch.rosa, 'Initiate {name}. The chair, please.'.replace('{name}', PL().name), 3.4));
    },
    serum(Ch) {
      Ch.setFlag('sat');
      DV.Player.place(16, 22, 0);
      Ch.cut(true);
      Ch.shot([14.2, 1.7, 24.6], [16, 1.0, 22]);
      for (const a of Ch.crowdH) a.lookAt([16, 22]);
      Ch.rosa.walk([[16.9, 22.9]], 1.0, (a) => a.face(16, 22));
      Ch.seq([
        () => 1.2,
        FW().say(Ch, Ch.rosa, 'The serum will make you feel heavy. Don\'t fight it. Nobody can fight it.', 3.8),
        () => { DV.Audio.play('drink', { volume: 0.4 }); DV.UI.notify('A needle in the side of your neck. Cold, then warm, then heavy.', 'info'); return 2.6; },
        () => { Ch.rosa.walk([[16, 24.6]], 1.0, (a) => a.face(16, 22)); return 1.4; },
        () => { Ch.cut(false); DV.Activity.start(new Serum({ rosa: Ch.rosa, questions: this.questions(Ch) }), (r) => this.afterSerum(Ch, r)); },
      ], 'serum');
    },
    // what Rosa asks, and what you would say if you could stop yourself
    questions(Ch) {
      const div = !!APT().divergent, h = FW().was('hollis') || {}, v = FW().was('verdict');
      const recorded = DV.Factions.name(APT().recordedAs || APT().result || 'candor');
      const q = [
        { id: 'name', q: 'What is your name?', truth: PL().name + '.' },
        { id: 'worst', q: 'What is the worst thing you have ever done?', truth: FW().worstThing(), lie: 'Nothing worth telling. I\'ve always followed the rules.' },
        {
          id: 'hollis', q: 'In the Hollis case. Did you leave anything out of your report?',
          truth: v === 'omitted' ? 'Yes. He did it for his sister\'s little girl. I had the note. I didn\'t tell you.' : v === 'lied' ? 'I told you he didn\'t do it. He did. I lied to you.' : 'No. I told you everything I knew.',
          lie: v === 'omitted' || v === 'lied' ? 'No. I told you everything I knew.' : null,
        },
      ];
      if (div) q.push({ id: 'apt', q: 'What did your aptitude test say? Really say?', truth: 'Inconclusive. It couldn\'t decide. They called it — Divergent.', lie: recorded + '. It said ' + recorded + '.' });
      else {
        const p = Ch.peers.find((x) => x.id !== 'owen_price') || Ch.peers[0];
        q.push({ id: 'trust', q: 'Who in this room do you trust least?', truth: (FW().was('trust_least') || (p ? p.name : 'Owen Price')) + '. I don\'t know why. I just do.', lie: 'Nobody. I trust all of them.' });
      }
      q.push({ id: 'why', q: 'Last one. Why did you choose Candor?', truth: FW().was('why_candor') || 'Because I\'d rather know. Even when it hurts. Especially then.' });
      return q;
    },
    afterSerum(Ch, r) {
      const lies = r.answers.filter((a) => a.said === 'lie');
      const apt = r.answers.find((a) => a.id === 'apt');
      const fought = r.visible >= 2.8;
      FW().note('serum', { lies: lies.length, fought, strain: Math.round(r.strain * 10) / 10 });
      // Candor marks you for what came out of your mouth — and for letting it
      const honest = r.answers.filter((a) => a.said === 'truth').length;
      FW().mark('serum', honest * 2 + (r.strain < 0.5 ? 2 : 0) - (fought && lies.length ? 2 : 0), r.answers.length * 2 + 2, 'The Hearing: ' + honest + ' of ' + r.answers.length + ' answers true' + (fought ? ', and everyone saw you fight it.' : '.'));
      if (apt && apt.said === 'truth') { DV.State.setFlag('divergence_exposed'); FW().note('exposed', true); }
      if (apt && apt.said === 'lie') { DV.State.setFlag('resisted_truth_serum'); }
      if (fought) DV.State.setFlag('seen_fighting_serum');
      FW().placePlayer(16, 21.0, Math.PI);
      for (const a of Ch.crowdH) a.action = apt && apt.said === 'truth' ? 'sit' : lies.length ? 'sit' : 'sit_clap';
      DV.Audio.play(apt && apt.said === 'truth' ? 'murmur' : lies.length && fought ? 'murmur' : 'applause', { secs: 2.4 });
      const lines = apt && apt.said === 'truth'
        ? ['[The room goes very quiet. Somebody on the benches says the word again, under their breath.]', 'That\'s enough. The Hearing is over. Everyone out — now. Not you, {name}.']
        : fought && lies.length
          ? ['[A murmur round the benches. They saw your jaw lock. They saw your hands.]', 'Interesting. That\'s all for today.']
          : lies.length
            ? ['[Nobody seems to notice anything. Rosa\'s eyes stay on you a moment too long.]', 'Thank you, initiate. That will do.']
            : ['[Applause — Candor applause, brisk and approving. You told them everything.]', 'Every word. Thank you, initiate.'];
      Ch.seq([
        () => { DV.UI.subtitle('', lines[0], 4); return 4.2; },
        FW().say(Ch, Ch.rosa, lines[1].replace('{name}', PL().name), 3.8),
        () => { if ((apt && apt.said === 'truth') || (r.div && apt && apt.said === 'lie')) { Ch.scene('cand_rosa_after'); return () => !DV.Dialogue.isActive(); } return 0; },
        () => this.finish(Ch),
      ], 'after_serum');
    },
    finish(Ch) {
      FW().passTo('12:10');
      const pct = FW().pct();
      const st = FW().standings('candor', pct, Ch.peers);
      FW().note('rank', st.place);
      const exposed = FW().was('exposed'), s = FW().was('serum') || {};
      DV.UI.showReading('Week One — Standings', 'Rosa reads them out in the corridor, in order, with no softening at all.\n\n' + FW().standingsText(st.rows) + '\n\n' + (st.place === 1 ? '"First. Don\'t let it go to your head; it\'s a small room."' : st.place <= 3 ? '"Good. Not good enough to stop trying."' : '"You\'ll do better. Or you won\'t, and we\'ll both know."'), () => {
        const l2 = 'RANKED ' + FW().ordinal(st.place).toUpperCase() + ' OF ' + st.n + ' · ' + (exposed ? 'EVERYONE HEARD THE WORD.' : s.lies && APT().divergent ? 'YOU HELD IT IN.' : s.fought ? 'THEY SAW YOU FIGHT IT.' : 'EVERY WORD TRUE.');
        FW().complete(Ch, 'candor', l2, exposed ? 'exposed' : s.lies ? 'held' : 'truthful');
      });
    },
    end(Ch) {
      // a save after the banner: the corridor, free to look round
      Ch.rosa.place(16, 11.8, 0);
      Ch.peerActors = Ch.peers.map((p, i) => Ch.actor({ id: p.id, name: p.name, faction: 'candor', app: p.app, x: 22.4 + (i % 2) * 7.2, z: 2.4 + Math.floor(i / 2) * 2.3, rot: i % 2 ? -Math.PI / 2 : Math.PI / 2, action: 'idle' }));
      FW().placePlayer(16, 12, Math.PI);
      this.peerTalk(Ch);
      FW().talkTo(Ch, Ch.rosa, 'cand_rosa', { id: 'rosa_talk' });
    },
  });

  DV.WeekCandor = { STATEMENTS, EVIDENCE, Interview, Serum };

  /* ============================== dialogue ============================== */
  const R = { speaker: 'Rosa Medina', faction: 'candor' };
  const r = (o) => Object.assign({}, R, o);
  const H = () => FW().was('hollis') || {};
  DV.DialogueDB.add('cand_rosa', {
    entry: 'start',
    nodes: {
      start: r({
        text: () => (FW().was('verdict') ? 'Go on. I\'ve got nothing else for you today.' : 'Evidence first. Then him. I\'ll be watching from the corner of the room, and I won\'t help.'),
        choices: [
          { text: 'How do I know when he\'s lying?', to: 'how', if: () => !FW().was('verdict') },
          { text: 'What happens to him?', to: 'happens', if: () => !FW().was('verdict') },
          { text: 'Nothing. Sorry.', end: true },
        ],
      }),
      how: r({ text: 'You don\'t, for certain. People look at doors because doors are there. But a liar has to think, and thinking takes time — watch the gap before he answers. Watch his hands. And don\'t call something a lie unless you can show him why.', next: 'start', nextText: 'Understood.' }),
      happens: r({ text: 'That depends on what you tell me. That\'s the part of this job nobody likes.', next: 'start', nextText: '...' }),
    },
  });
  DV.DialogueDB.add('cand_hollis_end', {
    entry: (c) => (H().confessed ? 'broke' : 'held'),
    nodes: {
      broke: {
        speaker: 'Dale Hollis', faction: 'candor',
        text: () => (H().motive ? '[He\'s looking at the note.] Tilly is six. Four days of fever. The clinic in Sector 3 had nothing, and Erudite keeps losing the order, and I had a key. I\'d do it again. Write that down too.' : 'I took it. Yes. All right? I took the crate. [He won\'t say any more than that.]'),
        choices: [
          { text: 'Why did you take it?', to: 'why', if: () => !H().motive },
          { text: '[CHARISMA 7] "I\'m not here to hurt you. Tell me who it was for."', to: 'why_open', check: { attr: 'charisma', dc: 7 }, if: () => !H().motive, effect: () => { const h = H(); h.motive = true; } },
          { text: 'Thank you for telling the truth.', end: true },
        ],
      },
      why: { speaker: 'Dale Hollis', faction: 'candor', text: 'That\'s my business. You caught me. That\'s what you came for.', endText: '...' },
      why_open: { speaker: 'Dale Hollis', faction: 'candor', text: '[A long breath.] My sister\'s girl. Tilly. She\'s six and she\'s had a fever for four days, and there\'s nothing at the clinic. I had a key. That\'s all it is.', endText: 'I understand.' },
      held: {
        speaker: 'Dale Hollis', faction: 'candor',
        text: 'Are we done? I\'ve told you what happened. [He folds his arms. Whatever he did, he\'s not going to say it to you.]',
        endText: 'We\'re done.',
      },
    },
  });
  DV.DialogueDB.add('cand_verdict', {
    entry: 'start',
    nodes: {
      start: r({
        text: () => 'Well? You were in there ' + (H().confessed ? 'long enough to break him.' : 'and he didn\'t break.') + ' Tell me what happened. All of it.',
        choices: [
          { text: 'He took the crate. He lied about the time, the train and the key.', to: 'plain', if: () => H().confessed, effect: () => { FW().note('verdict', H().motive ? 'omitted' : 'plain'); FW().mark('verdict', H().motive ? 1 : 3, 4); } },
          { text: 'He took it for his sister\'s sick daughter. Everything he said was a lie except the back door.', to: 'full', if: () => H().confessed && H().motive, effect: () => { FW().note('verdict', 'full'); FW().mark('verdict', 4, 4); } },
          { text: '[CHARISMA 7] The whole truth — and ask for leniency. He returns what\'s left and works the rest off.', to: 'mercy', if: () => H().confessed && H().motive, check: { attr: 'charisma', dc: 7 }, effect: () => { FW().note('verdict', 'full'); FW().note('hollis_spared'); DV.State.setFlag('hollis_spared'); FW().mark('verdict', 4, 4); DV.Reputation.add('abnegation', 2); } },
          { text: 'I couldn\'t break him. I think he took it, but I can\'t prove it.', to: 'honest', if: () => !H().confessed, effect: () => { FW().note('verdict', 'unproven'); FW().mark('verdict', 2, 4); } },
          { text: 'He didn\'t do it. Somebody came in through the back door.', to: 'lie', effect: () => { FW().note('verdict', 'lied'); FW().mark('verdict', 0, 4); DV.State.setFlag('lied_to_rosa'); } },
        ],
      }),
      plain: r({ text: () => (H().motive ? 'Good. Clean. [She writes it down.] Was there anything else? ...No? Then he\'ll go before the council.' : 'Good. Clean. He\'ll go before the council, and they\'ll decide what to do with him.'), end: true, endText: '...', onEnter: () => { DV.State.setFlag('hollis_sentenced'); } }),
      full: r({ text: 'For a child. [She stops writing.] That doesn\'t make it not stealing. It does make it a different conversation. Thank you for bringing me all of it — most of them leave out the part that makes it hard.', endText: 'Thank you.', onEnter: () => { DV.Stats.addXP(30, 'The whole truth'); DV.Reputation.add('candor', 3); } }),
      mercy: r({ text: '[She looks at you for a long time.] Truth and mercy in the same breath. We\'re supposed to be bad at that. All right — I\'ll put it to the council that way, with your name on it.', endText: 'Thank you.', onEnter: () => { DV.Stats.addXP(40, 'Truth and mercy'); DV.Reputation.add('candor', 4); } }),
      honest: r({ text: 'Then that\'s what we write. "Not proven." It\'s an honest answer. It\'s not a satisfying one. Learn to live with the difference.', endText: 'Understood.' }),
      lie: r({ text: () => (H().confessed ? '[She tilts her head.] That\'s interesting, because I was in the corner of the room when he confessed. [A pause.] I\'m going to write down what you said, initiate. Exactly what you said.' : '[She tilts her head, and writes something down.] We\'ll see.'), endText: '...', onEnter: () => DV.Reputation.add('candor', H().confessed ? -8 : -3) }),
    },
    onEnd: () => { if (FW().was('verdict')) DV.Quests.setObj('week_candor', 'verdict', 'done', 'You reported the Hollis case to Rosa.'); },
  });
  DV.DialogueDB.add('cand_nora', {
    entry: (c) => (FW().was('game_played') ? 'night' : 'start'),
    nodes: {
      start: {
        speaker: 'Nora Kelly', faction: 'candor',
        text: () => (ev().ticket && !ev().note ? 'You found the ticket. Did you check the lining? Candor clerks sew things in. Old habit — the pockets get searched, the lining doesn\'t.' : 'Ask me something. I like questions. I like them better when they\'re hard.'),
        choices: [
          { text: 'Thanks. I\'ll look.', end: true, if: () => ev().ticket && !ev().note, effect: () => { ev().tipped = true; ev().liningTried = false; } },
          { text: 'What do you make of Hollis?', to: 'hollis', if: () => !FW().was('hollis') },
          { text: 'How do you like Candor, now you\'re in it?', to: 'like' },
          { text: 'Later.', end: true },
        ],
      },
      hollis: { speaker: 'Nora Kelly', faction: 'candor', text: 'I think he\'s a decent man who did a stupid thing for a good reason, and I think that\'s the hardest kind to interview. Decent men are terrible liars. You\'ll feel sorry for him. Don\'t let it make you sloppy.', next: 'start', nextText: '...' },
      like: { speaker: 'Nora Kelly', faction: 'candor', text: 'I\'ve been interrogating people at the dinner table since I could talk. Now I get marks for it. [Deadpan.] It\'s like being told your worst habit is a vocation.', next: 'start', nextText: 'Ha.' },
      night: { speaker: 'Nora Kelly', faction: 'candor', text: 'Friday, the serum. My mother says it feels like being very drunk and very honest at the same time. She says it with a face I don\'t like.', endText: '...' },
    },
  });
  DV.DialogueDB.add('cand_owen', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Owen Price', faction: 'candor',
        text: () => (PL().upbringing === 'candor' ? 'Look who stayed! Your mother cried at the ceremony, by the way. Happy crying. Mostly.' : 'The transfer! What\'s it like, saying exactly what you think? Bet it\'s horrible. You\'ll love it.'),
        choices: [
          { text: 'Do you ever not say what you think?', to: 'never' },
          { text: 'Any advice for the Hearing?', to: 'hearing' },
          { text: 'See you later, Owen.', end: true },
        ],
      },
      never: { speaker: 'Owen Price', faction: 'candor', text: 'Once. When I was nine. I told my aunt I liked her soup. It\'s haunted me. [He means it.]', next: 'start', nextText: 'Ha.' },
      hearing: { speaker: 'Owen Price', faction: 'candor', text: 'Don\'t fight it. Everyone says that. My cousin fought it, and they all saw, and now everyone wonders what he was hiding — which is worse than whatever it was. Probably.', next: 'start', nextText: '...' },
    },
  });
  DV.DialogueDB.add('cand_truth_game', {
    entry: 'start',
    nodes: {
      start: {
        speaker: 'Owen Price', faction: 'candor',
        text: 'Rules: you get asked, you answer. No "pass". Arjun went first and admitted he still sleeps with a sock his grandmother knitted, so the bar is low. {name}: why Candor? The real reason.',
        choices: [
          { text: 'Because I\'d rather know. Even when it hurts.', to: 'q2', effect: () => FW().note('why_candor', 'Because I\'d rather know. Even when it hurts. Especially then.') },
          { text: 'Because everyone I grew up with lied about small things, all the time, and I hated it.', to: 'q2', effect: () => FW().note('why_candor', 'Because everyone I grew up with lied about small things, and it made me feel like I was going mad.') },
          { text: '[RESOLVE 6] Honestly? Because I was scared of the other bowls.', to: 'q2', check: { attr: 'resolve', dc: 6 }, effect: () => { FW().note('why_candor', 'Because I was scared of the other four. This one only asks you to be honest.'); DV.Reputation.add('candor', 2); } },
        ],
      },
      q2: {
        speaker: 'Nora Kelly', faction: 'candor',
        text: 'My turn. Who in this room would you trust least with a secret?',
        choices: [
          { text: 'Owen. He\'s told us four of his own already tonight.', to: 'q3', effect: () => FW().note('trust_least', 'Owen Price') },
          { text: 'You, Nora. You\'d use it.', to: 'nora_hurt', effect: () => FW().note('trust_least', 'Nora Kelly') },
          { text: 'Myself.', to: 'q3', effect: () => { FW().note('trust_least', 'Me. Myself. I keep things.'); DV.Stats.practice('composure', 1); } },
          { text: '"Pass."', to: 'pass' },
        ],
      },
      nora_hurt: { speaker: 'Nora Kelly', faction: 'candor', text: '[She thinks about it.] ...Yes. Fair. I would.', next: 'q3', nextText: '...' },
      pass: { speaker: 'Owen Price', faction: 'candor', text: 'No passing! That\'s the one rule! [Everyone boos. Somebody throws a pillow. You have to answer anyway.]', next: 'q2', nextText: 'Fine.' },
      q3: {
        speaker: 'Owen Price', faction: 'candor',
        text: 'Last round. What\'s the one thing you\'re hoping nobody asks you on Friday?',
        choices: [
          { text: 'Something about my aptitude test.', to: 'apt', if: () => !!APT().divergent, effect: () => FW().note('hinted_apt') },
          { text: 'Something about my family.', to: 'fam' },
          { text: 'Nothing. I\'ve got nothing to hide.', to: 'nothing', effect: () => { if (APT().divergent || DV.State.flag('coffee_stolen') || DV.State.flag('read_envelope')) FW().note('game_lie'); } },
        ],
      },
      apt: { speaker: 'Nora Kelly', faction: 'candor', text: '[Nora looks at you a second longer than the others do.] Hm. That\'s a strange one to be scared of. It\'s just a test.', next: 'close', nextText: 'It\'s just a test.' },
      fam: { speaker: 'Owen Price', faction: 'candor', text: 'Ohh. Yeah. They always ask about family. [He says it kindly, for Owen.]', next: 'close', nextText: '...' },
      nothing: { speaker: 'Owen Price', faction: 'candor', text: '[The whole table groans.] Everybody has something. You\'ll find out Friday.', next: 'close', nextText: '...' },
      close: { speaker: 'Owen Price', faction: 'candor', text: 'Good game. Bed. Friday\'s the Hearing, and nobody wants to be the one who yawns in the chair.', endText: 'Good night.' },
    },
    onEnd: () => { FW().note('game_played'); FW().mark('game', 1, 1); },
  });
  DV.DialogueDB.add('cand_rosa_night', {
    onEnd: () => { FW().note('rosa_night'); DV.UI.notify('Sleep when you\'re ready — your bunk is in the corner.', 'info'); },
    entry: (c) => (DV.State.flag('told_candor_divergent') || FW().was('hinted_apt') ? 'warn' : 'plain'),
    nodes: {
      plain: r({ text: () => 'I heard some of that. [She doesn\'t apologise for listening.] ' + (FW().was('game_lie') ? 'You said you had nothing to hide. I\'ve been doing this for twenty years: everybody has something. Friday, it comes out.' : 'Friday\'s the Hearing. Sleep. You\'ll want your head clear before we fill it with serum.'), endText: 'Good night.' }),
      warn: r({
        text: () => (DV.State.flag('told_candor_divergent') ? '[She keeps her voice low.] Your first day, in the circle, you said a word. I told you never to say it here again. Friday, you won\'t get a choice — the serum asks, and you answer.' : '[She keeps her voice low.] "Something about my aptitude test." I heard. Friday, the serum asks, and you answer.') + ' Some people can hold things in, under it. Very few. If you\'re one of them — don\'t let anyone see you trying.',
        choices: [
          { text: 'Why are you telling me this?', to: 'why' },
          { text: 'I don\'t know what you mean.', to: 'dont', effect: () => DV.Reputation.add('candor', -1) },
          { text: 'Thank you.', to: 'thanks' },
        ],
      }),
      why: r({ text: 'Because I believe in the truth, and I\'ve seen what some people do with it. [She stands.] Good night, initiate.', end: true, endText: 'Good night.', onEnter: () => DV.State.setFlag('rosa_protects') }),
      dont: r({ text: 'Of course you don\'t. Good night.', endText: 'Good night.' }),
      thanks: r({ text: 'Don\'t thank me. I haven\'t done anything. [She means: and I never said this.]', endText: 'Good night.', onEnter: () => DV.State.setFlag('rosa_protects') }),
    },
  });
  DV.DialogueDB.add('cand_rosa_after', {
    entry: (c) => (FW().was('exposed') ? 'exposed' : 'held'),
    nodes: {
      exposed: r({
        text: '[The Hearing Room has emptied. Rosa shuts the doors herself.] There were sixty people on those benches. By tonight there will be six hundred who heard it from one of them. I can\'t stop that. What I can do is tell you: don\'t go anywhere alone. Not for a while.',
        choices: [
          { text: 'What are they going to do to me?', to: 'what' },
          { text: 'Can you help me?', to: 'help' },
        ],
      }),
      what: r({ text: 'I don\'t know. That\'s the truth, and I hate it. Some people think your kind are a mistake in the tests. Some people think you\'re something worse. Erudite will want to know. Erudite always wants to know.', endText: '...', onEnter: () => DV.State.setFlag('rosa_protects') }),
      help: r({ text: 'I can make the minutes of today\'s Hearing very boring. [A thin smile.] It won\'t be enough. It\'s what I have.', endText: 'Thank you.', onEnter: () => DV.State.setFlag('rosa_protects') }),
      held: r({
        text: '[After the others have gone, she sits on the bench next to you.] I\'ve put that needle in four hundred necks. I watch the hands, always. Yours didn\'t move. [Quietly.] Nobody holds against the serum. Nobody — except one kind of person.',
        choices: [
          { text: 'I told the truth.', to: 'truth' },
          { text: 'Are you going to report it?', to: 'report' },
        ],
      }),
      truth: r({ text: 'You\'re in Candor, initiate. Don\'t lie to me twice in one morning. [She gets up.] I won\'t say anything. Learn to make your hands move. People expect to see a struggle.', endText: '...', onEnter: () => DV.State.setFlag('rosa_knows') }),
      report: r({ text: 'To whom? [She means it as a real question.] No. But I\'m not the only person who watches hands. Learn to make yours move, next time. People expect to see a struggle.', endText: 'I will.', onEnter: () => DV.State.setFlag('rosa_knows') }),
    },
  });
})();
