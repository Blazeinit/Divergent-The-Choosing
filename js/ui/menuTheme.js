/* ==========================================================================
   DIVERGENT — the main menu's theme song
   The main menu plays a theme song streamed from YouTube, in YouTube's own
   embedded player, which sits on the menu as a little "Now Playing" window
   (YouTube's terms want the player seen, 200 × 200 or more, and the track
   stays where it was published: none of it is copied into the game).
   Browsers won't play sound before you've clicked or pressed something, so
   it starts muted and the first click or key turns it up. While it plays,
   the built-in synth music steps aside; when it can't play (the setting is
   off, you're offline, the page was opened straight from disk rather than
   served, or YouTube says no) the synth carries on as before.

   A copy of your own works too, offline and from disk: put it in assets/audio/
   and set DV.Config.MENU_THEME.file to its path.

     DV.MenuTheme.start([{ force }])   the main menu opens (force: skip the checks; QA)
     DV.MenuTheme.stop([now])          it closes: fades out (now: at once)
     DV.MenuTheme.state()              { mode, playing, muted, title, error, volume }
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const API = 'https://www.youtube.com/iframe_api';
  const W = 356, H = 200; // (the embed's smallest allowed side is 200)

  const T = {
    mode: 'builtin', player: null, audio: null, el: null, playing: false, muted: true, title: '', error: null, tok: 0, queue: [],

    // why it can't stream here ('' if it can)
    blocked() {
      const C = DV.Config.MENU_THEME || {};
      if (!DV.Settings.get('menuTheme')) return 'off';
      if (C.file) return '';
      if (!C.youtube) return 'no theme set';
      if (location.protocol === 'file:') return 'the page was opened from disk (YouTube needs it served: see the README)';
      if (navigator.onLine === false) return 'offline';
      return '';
    },
    volume() { const S = DV.Settings.data; return Math.round(100 * U.clamp(S.masterVolume * S.musicVolume * 1.4, 0, 1)); },
    state() { return { mode: this.mode, playing: this.playing, muted: this.muted, title: this.title, error: this.error, volume: this.volume(), on: !!this.el }; },

    start(o) {
      o = o || {};
      this.wanted = !!DV.Settings.get('menuTheme');
      this.stop(true);
      const why = o.force ? '' : this.blocked();
      this.error = why || null;
      if (why) { this.mode = 'builtin'; return false; }
      const tok = ++this.tok, C = DV.Config.MENU_THEME || {};
      this.playing = false; this.muted = true; this.title = '';
      this.window();
      if (C.file) this.fromFile(C.file, tok);
      else this.fromYouTube(C.youtube, tok);
      // the first click or key anywhere turns it up
      this.gesture = () => this.unmute();
      window.addEventListener('pointerdown', this.gesture, true);
      window.addEventListener('keydown', this.gesture, true);
      return true;
    },

    /* ---------------- YouTube's player ---------------- */
    fromYouTube(id, tok) {
      this.mode = 'youtube';
      this.api(() => {
        if (tok !== this.tok || !this.el) return; // (the menu's gone)
        this.player = new window.YT.Player(this.el.querySelector('.mt-slot'), {
          width: W, height: H, videoId: id,
          playerVars: { autoplay: 1, mute: 1, loop: 1, playlist: id, controls: 1, playsinline: 1, rel: 0, fs: 0, iv_load_policy: 3 },
          events: {
            onReady: () => {
              if (tok !== this.tok) return;
              const d = this.player.getVideoData ? this.player.getVideoData() : null;
              this.setTitle(d && d.title ? d.title + (d.author ? ' — ' + d.author : '') : 'Main theme');
              this.player.setVolume(this.volume());
              this.player.playVideo();
              // (already clicked something on the way here: sound on straight away)
              if (navigator.userActivation && navigator.userActivation.hasBeenActive) this.unmute();
            },
            onStateChange: (e) => {
              if (tok !== this.tok) return;
              this.playing = e.data === 1;
              if (e.data === 0) { this.player.seekTo(0); this.player.playVideo(); } // (round again)
              this.sync();
            },
            onError: (e) => { if (tok === this.tok) this.fail('YouTube wouldn\'t play it here (error ' + e.data + ')'); },
          },
        });
      }, tok);
    },
    // the IFrame API, loaded once
    api(cb, tok) {
      if (window.YT && window.YT.Player) { cb(); return; }
      this.queue.push(cb);
      if (document.getElementById('yt-api')) return;
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); const q = this.queue; this.queue = []; q.forEach((f) => f()); };
      const s = document.createElement('script');
      s.id = 'yt-api'; s.src = API; s.async = true;
      s.onerror = () => { s.remove(); this.queue = []; if (tok === this.tok) this.fail('couldn\'t reach YouTube'); };
      document.head.appendChild(s);
    },

    /* ---------------- or a copy of your own ---------------- */
    fromFile(src, tok) {
      this.mode = 'file';
      const a = new Audio(src);
      a.loop = true; a.muted = true; a.volume = this.volume() / 100;
      a.onplaying = () => { if (tok === this.tok) { this.playing = true; this.sync(); } };
      a.onpause = () => { if (tok === this.tok) { this.playing = false; this.sync(); } };
      a.onerror = () => { if (tok === this.tok) this.fail('couldn\'t open ' + src); };
      this.audio = a;
      this.setTitle(String(src).split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' '));
      this.el.querySelector('.mt-slot').innerHTML = '<div class="mt-disc"></div>';
      a.play().catch(() => {}); // (muted, so it may start; with sound it waits for a click)
    },

    /* ---------------- sound on, and who has the music ---------------- */
    unmute() {
      this.dropGesture();
      if (this.mode === 'youtube' && this.player && this.player.unMute) {
        this.player.unMute(); this.player.setVolume(this.volume());
        if (!this.playing) this.player.playVideo();
      } else if (this.mode === 'file' && this.audio) {
        this.audio.muted = false; this.audio.volume = this.volume() / 100;
        this.audio.play().catch(() => {});
      } else return;
      this.muted = false;
      if (this.el) this.el.classList.remove('muted');
      this.sync();
    },
    toggleMute() {
      if (this.muted) { this.unmute(); return; }
      this.muted = true;
      if (this.player && this.player.mute) this.player.mute();
      if (this.audio) this.audio.muted = true;
      if (this.el) this.el.classList.add('muted');
      this.sync();
    },
    // while the theme is audible on the main menu, the synth keeps quiet
    sync() {
      if (!DV.Game || DV.Game.state !== 'mainmenu') return;
      DV.Audio.setMusic(this.el && this.playing && !this.muted ? 'none' : 'menu');
    },
    applyVolume() {
      if (this.player && this.player.setVolume) this.player.setVolume(this.volume());
      if (this.audio) this.audio.volume = this.volume() / 100;
    },
    fail(why) {
      this.error = why;
      this.mode = 'builtin';
      this.stop(true);
      this.error = why;
      if (DV.Game && DV.Game.state === 'mainmenu') DV.Audio.setMusic('menu');
    },
    dropGesture() {
      if (!this.gesture) return;
      window.removeEventListener('pointerdown', this.gesture, true);
      window.removeEventListener('keydown', this.gesture, true);
      this.gesture = null;
    },

    stop(now) {
      this.dropGesture();
      this.tok++;
      const p = this.player, a = this.audio, el = this.el;
      this.player = null; this.audio = null; this.el = null; this.playing = false;
      if (!p && !a && !el) return;
      const kill = () => { try { if (p && p.destroy) p.destroy(); } catch (e) { /* (already gone) */ } if (a) { a.pause(); a.src = ''; } if (el) el.remove(); };
      if (now || this.muted) { kill(); return; }
      // a short fade, the window going with it (out of the menu, which is about to go)
      if (el) { (DV.UI.root || document.body).appendChild(el); el.classList.add('leaving'); }
      let v = this.volume();
      const step = Math.max(1, v / 10);
      const iv = setInterval(() => {
        v -= step;
        if (v <= 0) { clearInterval(iv); kill(); return; }
        if (p && p.setVolume) p.setVolume(v);
        if (a) a.volume = v / 100;
      }, 80);
    },

    /* ---------------- the window ---------------- */
    window() {
      const host = document.getElementById('mainmenu') || DV.UI.root;
      const el = document.createElement('div');
      el.className = 'mm-theme muted';
      el.innerHTML = '<div class="mt-bar"><span class="mt-led"></span><span class="mt-k">NOW PLAYING</span><span class="mt-title">Main theme</span>' +
        '<span class="mt-btn mt-mute" title="Sound on / off">♪</span><span class="mt-btn mt-close" title="Turn the menu theme off (Settings brings it back)">✕</span></div>' +
        '<div class="mt-screen"><div class="mt-slot"></div></div><div class="mt-hint">Click anywhere for sound</div>';
      el.querySelector('.mt-mute').onclick = (e) => { e.stopPropagation(); DV.Audio.play('click'); this.toggleMute(); };
      el.querySelector('.mt-close').onclick = (e) => { e.stopPropagation(); DV.Audio.play('click'); DV.Settings.set('menuTheme', false); };
      host.appendChild(el);
      this.el = el;
    },
    setTitle(t) {
      this.title = t;
      const e = this.el && this.el.querySelector('.mt-title');
      if (e) { e.textContent = t; e.title = t; }
    },
  };

  // the setting, and the volumes, changed from the menu's own Settings
  // (only the theme's own switch starts or stops it: changing anything else leaves it be)
  DV.Events.on('settings:changed', () => {
    T.applyVolume();
    const want = !!DV.Settings.get('menuTheme');
    if (T.wanted === undefined || want === T.wanted) return;
    T.wanted = want;
    if (!DV.Game || DV.Game.state !== 'mainmenu') return;
    if (want && !T.el) T.start();
    else if (!want && T.el) { T.stop(true); DV.Audio.setMusic('menu'); }
  });

  DV.MenuTheme = T;
})();
