/* ==========================================================================
   DIVERGENT — procedural audio (WebAudio)
   No audio files are required: footsteps, doors, chimes, PA tones, HVAC
   ambience, crowd murmur and music pads are synthesized at runtime.
   World sounds run through a per-room convolution reverb and can be placed
   in space (distance, stereo pan, muffled through walls). The Testing Center
   soundscape is a set of persistent layers crossfaded by DV.Soundscape.
   Real assets can later be dropped into /assets/audio and routed here.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;

  // reverb profiles: decay (s to -60dB), wet send level, brightness (0 dark..1 bright), pre-delay
  const REVERBS = {
    dry: { decay: 0.3, wet: 0, bright: 0.7 },
    exterior: { decay: 0.7, wet: 0.06, bright: 0.65, pre: 0.02 },
    yard: { decay: 1.0, wet: 0.13, bright: 0.7, pre: 0.015 },
    atrium: { decay: 2.6, wet: 0.34, bright: 0.8, pre: 0.025 },
    hall: { decay: 1.9, wet: 0.27, bright: 0.72, pre: 0.018 },
    corridor: { decay: 1.3, wet: 0.22, bright: 0.8, pre: 0.008 },
    office: { decay: 0.6, wet: 0.12, bright: 0.5, pre: 0.005 },
    tiled: { decay: 1.5, wet: 0.3, bright: 1.0, pre: 0.006 },
    concrete: { decay: 1.7, wet: 0.3, bright: 0.55, pre: 0.01 },
    platform: { decay: 1.3, wet: 0.2, bright: 0.65, pre: 0.03 },
    basement: { decay: 2.3, wet: 0.38, bright: 0.45, pre: 0.012 },
    tribunal: { decay: 3.6, wet: 0.46, bright: 0.85, pre: 0.045 },
  };
  // interface sounds stay dry and centred; everything else is "in the world"
  const UI_SOUNDS = { click: 1, hover: 1, back: 1, open: 1, quest: 1, fail: 1, item: 1, levelup: 1, type: 1, glitch: 1, heartbeat: 1, whoosh: 1, error: 1, check_ok: 1, check_fail: 1 };

  const A = {
    ctx: null,
    posActive: 0,
    paOutdoor: false,
    ready: false,
    nodes: {},
    amb: null,
    musicState: null,
    crowdLevel: 0,

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (e) {
        return;
      }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.connect(c.destination);
      this.sfxBus = c.createGain();
      this.musicBus = c.createGain();
      this.ambBus = c.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.ambBus.connect(this.master);
      // world sounds: dry into the sfx bus + a send into the current room's reverb
      // (two convolvers so a room change crossfades instead of clicking)
      this.sfxIn = c.createGain();
      this.sfxIn.connect(this.sfxBus);
      this.revSend = c.createGain();
      this.revSend.gain.value = 0.15;
      this.sfxIn.connect(this.revSend);
      this.revConv = [c.createConvolver(), c.createConvolver()];
      this.revOut = [c.createGain(), c.createGain()];
      this.revOut[1].gain.value = 0;
      for (let k = 0; k < 2; k++) { this.revSend.connect(this.revConv[k]); this.revConv[k].connect(this.revOut[k]); this.revOut[k].connect(this.sfxBus); }
      this.revActive = 0;
      this.irCache = {};
      this._v = new THREE.Vector3();
      // noise buffers
      const len = c.sampleRate * 2;
      this.white = c.createBuffer(1, len, c.sampleRate);
      const w = this.white.getChannelData(0);
      for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;
      this.brown = c.createBuffer(1, len, c.sampleRate);
      const b = this.brown.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        b[i] = last * 3.5;
      }
      this.ready = true;
      this.updateVolumes();
      this.setReverb(this.pendingReverb || 'office');
      DV.Events.on('settings:changed', () => { this.updateVolumes(); const r = this.revWanted; this.revProfile = null; this.setReverb(r || 'office'); });
      if (this.pendingAmb) this.setAmbience(this.pendingAmb);
      if (this.pendingMusic) this.setMusic(this.pendingMusic);
    },
    updateVolumes() {
      if (!this.ready) return;
      const S = DV.Settings.data;
      this.master.gain.value = S.masterVolume;
      this.sfxBus.gain.value = S.sfxVolume;
      this.musicBus.gain.value = S.musicVolume * 0.6;
      this.ambBus.gain.value = S.sfxVolume * 0.9;
    },
    noiseSrc(buf, loop) {
      const s = this.ctx.createBufferSource();
      s.buffer = buf || this.white;
      s.loop = loop !== false;
      return s;
    },
    env(g, t, a, peak, d) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    },
    /* --------------------------- reverb --------------------------- */
    impulse(name) {
      if (this.irCache[name]) return this.irCache[name];
      const p = REVERBS[name] || REVERBS.office;
      const c = this.ctx, sr = c.sampleRate;
      const len = Math.floor(sr * Math.min(4, p.decay + 0.15));
      const pre = Math.floor(sr * (p.pre || 0.01));
      const buf = c.createBuffer(2, len, sr);
      const smooth = 0.12 + p.bright * 0.8; // one-pole lowpass: darker rooms lose the highs
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let lp = 0;
        for (let i = pre; i < len; i++) {
          const t = (i - pre) / sr;
          const env = Math.exp((-6.9 * t) / p.decay);
          lp += ((Math.random() * 2 - 1) - lp) * smooth;
          d[i] = lp * env;
        }
        // a few early reflections
        for (let k = 0; k < 6; k++) {
          const i = pre + Math.floor(sr * (0.004 + Math.random() * 0.05 * p.decay));
          if (i < len) d[i] += (Math.random() < 0.5 ? -1 : 1) * (0.5 - k * 0.06);
        }
      }
      this.irCache[name] = buf;
      return buf;
    },
    setReverb(name) {
      this.revWanted = name;
      if (!this.ready) { this.pendingReverb = name; return; }
      const use = DV.Settings.get('reverb') === false ? 'dry' : name;
      if (use === this.revProfile) return;
      this.revProfile = use;
      const p = REVERBS[use] || REVERBS.office;
      const c = this.ctx, t = c.currentTime;
      const next = 1 - this.revActive;
      this.revConv[next].buffer = this.impulse(use);
      this.revOut[next].gain.setTargetAtTime(1, t, 0.3);
      this.revOut[this.revActive].gain.setTargetAtTime(0, t, 0.3);
      this.revSend.gain.setTargetAtTime(p.wet, t, 0.35);
      this.revActive = next;
    },

    /* --------------------------- spatial --------------------------- */
    // returns an input node for a sound at (x, z) relative to the camera: distance
    // attenuation, stereo pan and (if another room) muffling — or null if inaudible
    spatial(x, z, opts) {
      const cam = DV.Game && DV.Game.camera;
      if (!cam) return this.sfxIn;
      const dx = x - cam.position.x, dz = z - cam.position.z;
      const d = Math.hypot(dx, dz);
      if (d > (opts.range || 32)) return null;
      if (this.posActive > 28) return null;
      this.posActive++;
      setTimeout(() => { this.posActive--; }, 2500);
      const c = this.ctx;
      const g = c.createGain();
      let vol = 1 / (1 + Math.pow(d / 5, 1.4));
      let last = g;
      const occ = opts.occluded !== undefined ? opts.occluded : DV.Soundscape && DV.Soundscape.occluded(x, z);
      if (occ) {
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 850;
        g.connect(f);
        last = f;
        vol *= 0.55;
      }
      g.gain.value = vol;
      if (c.createStereoPanner) {
        const pan = c.createStereoPanner();
        cam.getWorldDirection(this._v);
        const fx = this._v.x, fz = this._v.z, fl = Math.hypot(fx, fz) || 1;
        const r = (dx * -fz + dz * fx) / (fl * Math.max(d, 0.001));
        pan.pan.value = U.clamp(r, -1, 1) * Math.min(1, d / 2.5) * 0.85;
        last.connect(pan);
        pan.connect(opts.bus || this.sfxIn);
      } else last.connect(opts.bus || this.sfxIn);
      return g;
    },
    // public address: band-limited horn speakers + slapback; outdoors it echoes off the buildings
    paChain(dest) {
      const c = this.ctx, out = this.paOutdoor;
      const inG = c.createGain();
      inG.gain.value = out ? 0.6 : 1;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.55;
      const dl = c.createDelay(1.0);
      dl.delayTime.value = out ? 0.27 : 0.085;
      const fb = c.createGain(); fb.gain.value = out ? 0.42 : 0.22;
      const wet = c.createGain(); wet.gain.value = out ? 0.55 : 0.3;
      inG.connect(bp); bp.connect(dest); bp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(dest);
      setTimeout(() => { try { fb.disconnect(); dl.disconnect(); } catch (e) { /* noop */ } }, 7000);
      return inG;
    },

    tone(freq, dur, type, vol, when, dest) {
      const c = this.ctx;
      const t = c.currentTime + (when || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      this.env(g, t, 0.01, vol || 0.2, dur);
      o.connect(g);
      g.connect(dest || this._dest || this.sfxBus);
      o.start(t);
      o.stop(t + dur + 0.05);
      return o;
    },
    burst(filterType, freq, q, dur, vol, when, dest) {
      const c = this.ctx;
      const t = c.currentTime + (when || 0);
      const s = this.noiseSrc(this.white, false);
      const f = c.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      f.Q.value = q || 1;
      const g = c.createGain();
      this.env(g, t, 0.004, vol, dur);
      s.connect(f); f.connect(g); g.connect(dest || this._dest || this.sfxBus);
      s.start(t, Math.random() * 1.5);
      s.stop(t + dur + 0.05);
      return f;
    },

    /* ------------------------------ sfx ------------------------------ */
    play(name, opts) {
      if (!this.ready) return;
      opts = opts || {};
      const v = opts.volume === undefined ? 1 : opts.volume;
      // route: UI sounds dry; world sounds through the room reverb; positioned ones panned
      let dest = UI_SOUNDS[name] ? this.sfxBus : this.sfxIn;
      if (opts.bus === 'outdoor') dest = this.beds ? this.beds.outIn : null;
      if (opts.x !== undefined && opts.z !== undefined && dest) dest = this.spatial(opts.x, opts.z, Object.assign({}, opts, { bus: dest }));
      if (!dest) return;
      if (name === 'chime') dest = this.paChain(dest);
      this._dest = dest;
      try {
        switch (name) {
          case 'step': {
            const surf = opts.surface || 'tile';
            const f = { tile: 2400, concrete: 1400, carpet: 520, grass: 800, metal: 3000, water: 700, wood: 1100 }[surf] || 1500;
            this.burst('bandpass', f * (0.85 + Math.random() * 0.3), 1.2, surf === 'carpet' ? 0.07 : 0.05, 0.22 * v);
            if (surf === 'metal') this.tone(900 + Math.random() * 300, 0.08, 'triangle', 0.03 * v);
            if (surf === 'water') this.burst('lowpass', 900, 0.5, 0.18, 0.25 * v);
            break;
          }
          case 'click': this.tone(1200, 0.04, 'square', 0.04 * v); break;
          case 'hover': this.tone(1800, 0.025, 'square', 0.02 * v); break;
          case 'back': this.tone(600, 0.06, 'square', 0.04 * v); break;
          case 'open': this.tone(500, 0.06, 'triangle', 0.08 * v); this.tone(900, 0.08, 'triangle', 0.06 * v, 0.05); break;
          case 'door': {
            this.burst('lowpass', 500, 0.7, 0.45, 0.16 * v);
            this.burst('bandpass', 2600, 4, 0.2, 0.05 * v, 0.05);
            this.tone(70, 0.15, 'sine', 0.12 * v, 0.38);
            break;
          }
          case 'locked': this.tone(140, 0.12, 'square', 0.08 * v); this.tone(110, 0.15, 'square', 0.08 * v, 0.1); break;
          case 'chime': // PA chime: three descending tones
            [784, 659, 523].forEach((f, i) => { this.tone(f, 1.1, 'sine', 0.13 * v, i * 0.42); this.tone(f * 2, 0.6, 'sine', 0.03 * v, i * 0.42); });
            break;
          case 'quest': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.08 * v, i * 0.09)); break;
          case 'fail': [392, 330, 262].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.08 * v, i * 0.14)); break;
          case 'item': this.tone(880, 0.12, 'triangle', 0.09 * v); this.tone(1320, 0.18, 'triangle', 0.07 * v, 0.07); break;
          case 'levelup': [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.08 * v, i * 0.1)); break;
          case 'check_ok': this.tone(660, 0.12, 'triangle', 0.07 * v); this.tone(990, 0.2, 'triangle', 0.07 * v, 0.08); break;
          case 'check_fail': this.tone(300, 0.2, 'sawtooth', 0.04 * v); break;
          case 'error': this.tone(200, 0.15, 'square', 0.05 * v); break;
          case 'whoosh': {
            const f = this.burst('bandpass', 400, 0.8, 1.4, 0.25 * v);
            f.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + 1.2);
            break;
          }
          case 'glitch': for (let i = 0; i < 6; i++) this.tone(200 + Math.random() * 2000, 0.05, 'square', 0.04 * v, i * 0.05); break;
          case 'heartbeat': this.tone(55, 0.18, 'sine', 0.35 * v); this.tone(50, 0.2, 'sine', 0.28 * v, 0.24); break;
          case 'growl': {
            const c = this.ctx, t = c.currentTime;
            const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 70;
            const lfo = c.createOscillator(); lfo.frequency.value = 23; const lg = c.createGain(); lg.gain.value = 25;
            lfo.connect(lg); lg.connect(o.frequency);
            const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
            const g = c.createGain(); this.env(g, t, 0.15, 0.18 * v, 1.1);
            o.connect(f); f.connect(g); g.connect(this._dest || this.sfxBus);
            o.start(t); lfo.start(t); o.stop(t + 1.4); lfo.stop(t + 1.4);
            break;
          }
          case 'bark': this.burst('bandpass', 700, 2, 0.12, 0.35 * v); this.tone(180, 0.12, 'sawtooth', 0.12 * v); break;
          case 'yelp': { const o = this.tone(900, 0.3, 'triangle', 0.12 * v); o.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.3); break; }
          case 'hit': this.burst('lowpass', 300, 1, 0.15, 0.4 * v); this.tone(90, 0.1, 'sine', 0.3 * v); break;
          case 'clank': this.tone(1200, 0.4, 'triangle', 0.06 * v); this.tone(1800, 0.3, 'triangle', 0.04 * v); this.burst('highpass', 3000, 1, 0.1, 0.08 * v); break;
          case 'shutter': for (let i = 0; i < 10; i++) this.burst('bandpass', 900 + i * 40, 3, 0.06, 0.12 * v, i * 0.08); this.tone(60, 0.3, 'sine', 0.3 * v, 0.85); break;
          case 'splash': this.burst('lowpass', 1200, 0.5, 0.5, 0.25 * v); break;
          case 'flare': this.burst('highpass', 2500, 0.5, 1.5, 0.12 * v); break;
          case 'type': this.tone(2000 + Math.random() * 400, 0.015, 'square', 0.012 * v); break;
          case 'beep': this.tone(1000, 0.08, 'square', 0.05 * v); break;
          case 'keypad': this.tone(1400 + Math.random() * 200, 0.06, 'square', 0.04 * v); break;
          case 'gavel': this.burst('lowpass', 250, 1, 0.12, 0.6 * v); this.tone(130, 0.2, 'sine', 0.3 * v); break;
          case 'drink': this.burst('lowpass', 600, 1, 0.25, 0.1 * v); this.burst('lowpass', 500, 1, 0.25, 0.1 * v, 0.3); break;
          // ---- environment one-shots ----
          case 'gust': { // outside air pushing in through a door
            const f = this.burst('bandpass', 280, 0.6, 1.1, 0.22 * v);
            f.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.5);
            this.burst('lowpass', 160, 0.5, 0.9, 0.2 * v);
            break;
          }
          case 'caw': { // crow
            const n = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < n; i++) {
              const o = this.tone(620 + Math.random() * 60, 0.22, 'sawtooth', 0.035 * v, i * 0.32);
              o.frequency.exponentialRampToValueAtTime(430, this.ctx.currentTime + i * 0.32 + 0.2);
              this.burst('bandpass', 1300, 3, 0.18, 0.03 * v, i * 0.32);
            }
            break;
          }
          case 'gull': {
            const o = this.tone(1500, 0.55, 'sine', 0.03 * v);
            o.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.5);
            const o2 = this.tone(1350, 0.3, 'triangle', 0.02 * v, 0.6);
            o2.frequency.exponentialRampToValueAtTime(950, this.ctx.currentTime + 0.85);
            break;
          }
          case 'train': { // distant elevated train: a long swell of rumble and wheel clatter
            const c = this.ctx, t = c.currentTime;
            const s = this.noiseSrc(this.brown, true);
            const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
            const g = c.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.5 * v, t + 3.5);
            g.gain.linearRampToValueAtTime(0.45 * v, t + 6);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 11);
            s.connect(f); f.connect(g); g.connect(this._dest);
            s.start(t); s.stop(t + 11.2);
            for (let k = 0; k < 22; k++) this.burst('bandpass', 900 + Math.random() * 300, 2.5, 0.05, (0.02 + 0.03 * Math.sin((k / 22) * Math.PI)) * v, 1.5 + k * 0.36 + (k % 2) * 0.09);
            break;
          }
          case 'horn': { // train horn, far off
            [311, 370].forEach((fq) => {
              const c = this.ctx, t = c.currentTime;
              const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq;
              const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
              const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03 * v, t + 0.15); g.gain.setValueAtTime(0.03 * v, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
              o.connect(f); f.connect(g); g.connect(this._dest); o.start(t); o.stop(t + 2);
            });
            break;
          }
          case 'clink': this.tone(2300 + Math.random() * 500, 0.25, 'triangle', 0.025 * v); this.tone(3400 + Math.random() * 300, 0.12, 'sine', 0.01 * v, 0.02); break;
          case 'drip': { const o = this.tone(1900 + Math.random() * 500, 0.09, 'sine', 0.05 * v); o.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.08); break; }
          case 'tick': this.tone(3200, 0.012, 'square', 0.012 * v); break;
          case 'buzzer': this.tone(160, 0.35, 'sawtooth', 0.05 * v); this.tone(163, 0.35, 'square', 0.03 * v); break;
          case 'scanner': this.tone(880, 0.14, 'triangle', 0.07 * v); this.tone(1320, 0.22, 'triangle', 0.06 * v, 0.1); break;
        }
      } catch (e) {
        /* audio is non-critical */
      } finally {
        this._dest = null;
      }
    },

    /* ------------------- testing center soundscape beds ------------------- */
    // Persistent layers (indoor room tone, outdoor air through a lowpass, room
    // accents) whose levels the Soundscape crossfades every few frames.
    buildBeds() {
      const c = this.ctx;
      const B = { gains: {}, srcs: [] };
      const out = c.createGain();
      out.gain.value = 0.0001;
      out.connect(this.ambBus);
      B.out = out;
      const layer = (name, dest) => { const g = c.createGain(); g.gain.value = 0; g.connect(dest || out); B.gains[name] = g; return g; };
      const noise = (buf, type, f, q, vol, dest, lfoRate, lfoDepth) => {
        const s = this.noiseSrc(buf);
        const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
        const g = c.createGain(); g.gain.value = vol;
        s.connect(fl); fl.connect(g); g.connect(dest);
        if (lfoRate) { const l = c.createOscillator(); l.frequency.value = lfoRate; const lg = c.createGain(); lg.gain.value = lfoDepth; l.connect(lg); lg.connect(g.gain); l.start(); B.srcs.push(l); }
        s.start(0, Math.random()); B.srcs.push(s);
        return g;
      };
      const osc = (f, type, vol, dest, filt) => {
        const o = c.createOscillator(); o.type = type; o.frequency.value = f;
        const g = c.createGain(); g.gain.value = vol;
        if (filt) { const fl = c.createBiquadFilter(); fl.type = filt[0]; fl.frequency.value = filt[1]; fl.Q.value = filt[2] || 1; o.connect(fl); fl.connect(g); } else o.connect(g);
        g.connect(dest); o.start(); B.srcs.push(o);
      };
      // indoors: air handling
      const indoor = layer('indoor');
      noise(this.brown, 'lowpass', 280, 0.5, 0.35, indoor);
      osc(58, 'sine', 0.025, indoor);
      osc(117, 'sine', 0.008, indoor);
      // crowd murmur (level from nearby NPCs)
      const crowd = layer('crowd');
      noise(this.white, 'bandpass', 480, 1.6, 0.6, crowd, 0.31, 0.25);
      noise(this.white, 'bandpass', 900, 2.2, 0.25, crowd, 0.53, 0.12);
      // outdoors: wind, air, distant city — all through one lowpass that walls close down
      const ofilt = c.createBiquadFilter();
      ofilt.type = 'lowpass'; ofilt.frequency.value = 16000; ofilt.Q.value = 0.5;
      const outdoor = layer('outdoor');
      ofilt.connect(outdoor);
      noise(this.brown, 'lowpass', 420, 0.4, 0.5, ofilt, 0.07, 0.28);
      noise(this.white, 'bandpass', 700, 0.5, 0.022, ofilt, 0.13, 0.018);
      noise(this.brown, 'lowpass', 110, 0.4, 0.3, ofilt);
      B.ofilt = ofilt;
      B.outIn = ofilt;
      // accents
      osc(120, 'sawtooth', 0.02, layer('buzz'), ['bandpass', 2400, 3]); // fluorescent tubes
      const hum = layer('hum'); osc(110, 'sine', 0.03, hum); osc(220.5, 'sine', 0.01, hum); noise(this.brown, 'lowpass', 70, 0.4, 0.2, hum); // simulation core
      const boiler = layer('boiler'); noise(this.brown, 'lowpass', 90, 0.4, 0.6, boiler, 0.2, 0.2); osc(45, 'sine', 0.05, boiler); noise(this.white, 'bandpass', 3500, 1.2, 0.01, boiler);
      const server = layer('server'); noise(this.brown, 'lowpass', 400, 0.5, 0.25, server); noise(this.white, 'bandpass', 3000, 2, 0.02, server); osc(4100, 'sine', 0.004, server); osc(60, 'sine', 0.04, server);
      osc(98, 'square', 0.02, layer('vend'), ['lowpass', 260, 0.7]); // vending machine / cooler compressor
      this.beds = B;
    },
    setBeds(L) {
      if (!this.ready) return;
      if (!this.beds) this.buildBeds();
      const B = this.beds, t = this.ctx.currentTime;
      if (!B.on) { B.on = true; B.out.gain.setTargetAtTime(1, t, 0.8); }
      for (const k in B.gains) {
        const v = L[k] || 0;
        if (B.last && Math.abs((B.last[k] || 0) - v) < 0.004) continue;
        B.gains[k].gain.setTargetAtTime(v, t, k === 'outdoor' || k === 'indoor' ? 0.45 : 0.35);
      }
      if (!B.last || Math.abs(B.last.cutoff - L.cutoff) > 20) B.ofilt.frequency.setTargetAtTime(L.cutoff, t, 0.35);
      B.last = Object.assign({}, L);
    },
    stopBeds() {
      const B = this.beds;
      if (!B || !B.on) return;
      B.on = false;
      B.last = null;
      B.out.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.5);
    },

    /* --------------------------- ambience --------------------------- */
    setAmbience(kind) {
      if (!this.ready) { this.pendingAmb = kind; return; }
      if (this.ambKind === kind) return;
      this.ambKind = kind;
      const c = this.ctx;
      const t = c.currentTime;
      if (this.amb) {
        const old = this.amb;
        old.gain.gain.setTargetAtTime(0.0001, t, 0.4);
        setTimeout(() => old.stop(), 2000);
      }
      if (!kind || kind === 'none') { this.amb = null; return; }
      const g = c.createGain();
      g.gain.value = 0.0001;
      g.connect(this.ambBus);
      const srcs = [];
      const addNoise = (buf, type, freq, q, vol, lfoRate, lfoDepth) => {
        const s = this.noiseSrc(buf);
        const f = c.createBiquadFilter();
        f.type = type; f.frequency.value = freq; f.Q.value = q;
        const gg = c.createGain(); gg.gain.value = vol;
        s.connect(f); f.connect(gg); gg.connect(g);
        if (lfoRate) {
          const l = c.createOscillator(); l.frequency.value = lfoRate;
          const lg = c.createGain(); lg.gain.value = lfoDepth;
          l.connect(lg); lg.connect(gg.gain); l.start(); srcs.push(l);
        }
        s.start(0, Math.random()); srcs.push(s);
        return gg;
      };
      const addTone = (freq, type, vol) => {
        const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
        const gg = c.createGain(); gg.gain.value = vol;
        o.connect(gg); gg.connect(g); o.start(); srcs.push(o);
      };
      let crowd = null;
      switch (kind) {
        case 'hvac':
          addNoise(this.brown, 'lowpass', 280, 0.5, 0.35);
          addTone(58, 'sine', 0.025);
          addTone(117, 'sine', 0.008);
          crowd = addNoise(this.white, 'bandpass', 480, 1.6, 0.0, 0.31, 0.0);
          break;
        case 'server':
          addNoise(this.brown, 'lowpass', 400, 0.5, 0.5);
          addNoise(this.white, 'bandpass', 3000, 2, 0.02);
          addTone(4100, 'sine', 0.004);
          addTone(60, 'sine', 0.04);
          break;
        case 'outdoor':
          addNoise(this.brown, 'lowpass', 160, 0.4, 0.6, 0.07, 0.25);
          addNoise(this.white, 'bandpass', 600, 0.6, 0.03, 0.11, 0.02);
          crowd = addNoise(this.white, 'bandpass', 480, 1.6, 0.0, 0.31, 0.0);
          break;
        case 'platform':
          addNoise(this.white, 'highpass', 2500, 0.3, 0.05, 0.2, 0.02); // rain
          addNoise(this.brown, 'lowpass', 120, 0.4, 0.6, 0.05, 0.3);
          addTone(41, 'sine', 0.05);
          break;
        case 'flood':
          addNoise(this.white, 'lowpass', 700, 0.4, 0.12, 0.3, 0.05); // water
          addNoise(this.brown, 'lowpass', 200, 0.4, 0.5);
          addTone(49, 'triangle', 0.03);
          break;
        case 'tribunal':
          addTone(55, 'sine', 0.06);
          addTone(82.4, 'sine', 0.03);
          addTone(110.5, 'sine', 0.015);
          addNoise(this.brown, 'lowpass', 90, 0.4, 0.3);
          break;
        case 'menu':
          addNoise(this.brown, 'lowpass', 140, 0.4, 0.4, 0.06, 0.2);
          addNoise(this.white, 'bandpass', 900, 0.5, 0.012, 0.09, 0.01);
          break;
      }
      g.gain.setTargetAtTime(1, t, 0.8);
      this.amb = {
        gain: g,
        crowd,
        stop: () => {
          for (const s of srcs) try { s.stop(); } catch (e) { /* noop */ }
          try { g.disconnect(); } catch (e) { /* noop */ }
        },
      };
    },
    setCrowd(level) {
      this.crowdLevel += (level - this.crowdLevel) * 0.05;
      if (this.amb && this.amb.crowd) this.amb.crowd.gain.value = Math.min(0.09, this.crowdLevel * 0.012);
    },

    /* ----------------------------- music ----------------------------- */
    setMusic(kind) {
      if (!this.ready) { this.pendingMusic = kind; return; }
      if (this.musicKind === kind) return;
      this.musicKind = kind;
      if (this.musicState) {
        const m = this.musicState;
        m.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.8);
        clearInterval(m.timer);
        setTimeout(() => m.stop(), 3500);
        this.musicState = null;
      }
      if (!kind || kind === 'none') return;
      const c = this.ctx;
      const g = c.createGain();
      g.gain.value = 0.0001;
      g.connect(this.musicBus);
      const filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = kind === 'sim' ? 500 : 900;
      filt.Q.value = 0.7;
      filt.connect(g);
      const voices = [];
      for (let i = 0; i < 4; i++) {
        const o1 = c.createOscillator(), o2 = c.createOscillator();
        o1.type = 'sawtooth'; o2.type = 'sawtooth';
        o2.detune.value = 9;
        const vg = c.createGain(); vg.gain.value = 0.05;
        o1.connect(vg); o2.connect(vg); vg.connect(filt);
        o1.start(); o2.start();
        voices.push({ o1, o2, vg });
      }
      const progs = {
        menu: [[146.8, 174.6, 220, 293.7], [116.5, 174.6, 233.1, 293.7], [130.8, 196, 261.6, 329.6], [110, 164.8, 220, 277.2]],
        sim: [[73.4, 77.8, 110, 155.6], [69.3, 73.4, 103.8, 146.8]],
        calm: [[130.8, 196, 246.9, 329.6], [110, 164.8, 220, 261.6], [116.5, 174.6, 233.1, 293.7], [98, 146.8, 196, 246.9]],
      };
      const prog = progs[kind] || progs.menu;
      let step = 0;
      const apply = () => {
        const ch = prog[step % prog.length];
        const t = c.currentTime;
        voices.forEach((v, i) => {
          v.o1.frequency.setTargetAtTime(ch[i], t, 1.2);
          v.o2.frequency.setTargetAtTime(ch[i], t, 1.2);
        });
        filt.frequency.setTargetAtTime((kind === 'sim' ? 380 : 700) + Math.random() * 300, t, 2);
        step++;
      };
      apply();
      g.gain.setTargetAtTime(1, c.currentTime, 2);
      const timer = setInterval(apply, kind === 'sim' ? 6000 : 8000);
      this.musicState = {
        gain: g,
        timer,
        stop: () => {
          for (const v of voices) { try { v.o1.stop(); v.o2.stop(); } catch (e) { /* noop */ } }
          try { g.disconnect(); } catch (e) { /* noop */ }
        },
      };
    },

    speak(text) {
      if (!DV.Settings.get('paVoice') || !window.speechSynthesis) return;
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.92;
        u.pitch = 0.85;
        u.volume = DV.Settings.get('masterVolume') * 0.8;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) {
        /* optional */
      }
    },
  };
  DV.Audio = A;
})();
