/* ==========================================================================
   DIVERGENT — the main menu's theme song
   The main menu plays a theme song streamed from SoundCloud (or, failing
   that, YouTube) in the service's own embedded player, which sits on the
   menu as a little "Now Playing" window: the track stays where it was
   published, none of it is copied into the game, and the player is there
   to be seen (YouTube's terms ask for that, at 200 × 200 or more).
   Browsers won't play sound before you've clicked or pressed something, so
   the first click or key starts it. While the theme is up the built-in
   synth music keeps quiet; when it can't play (the setting is off, you're
   offline, the page was opened straight from disk rather than served, or
   neither service will play it here) the synth carries on as before.

   The sources, tried in turn (DV.Config.MENU_THEME):
     file        a copy of your own in assets/audio/ (plays offline, and from disk)
     soundcloud  a track's page on SoundCloud
     youtube     a video's id on YouTube

     DV.MenuTheme.start([{ force }])   the main menu opens (force: skip the checks; QA)
     DV.MenuTheme.stop([now])          it closes: fades out (now: at once)
     DV.MenuTheme.state()              { mode, playing, muted, title, error, volume, on }
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const YT_API = 'https://www.youtube.com/iframe_api';
  const SC_API = 'https://w.soundcloud.com/player/api.js';
  const W = 356, H = 200; // (the player's window: YouTube's smallest allowed side is 200)
  const PATIENCE = 15000; // ms for a service to answer before the next is tried

  const T = {
    mode: 'builtin', player: null, el: null, playing: false, muted: true, title: '', error: null, tok: 0, queues: {},

    // why it can't play here ('' if it can)
    blocked() {
      const C = DV.Config.MENU_THEME || {};
      if (!DV.Settings.get('menuTheme')) return 'off';
      if (C.file) return '';
      if (!C.soundcloud && !C.youtube) return 'no theme set';
      if (location.protocol === 'file:') return 'the page was opened from disk (the theme streams, so it needs the page served: see the README)';
      if (navigator.onLine === false) return 'offline';
      return '';
    },
    volume() { const S = DV.Settings.data; return Math.round(100 * U.clamp(S.masterVolume * S.musicVolume * 1.4, 0, 1)); },
    state() { return { mode: this.mode, playing: this.playing, muted: this.muted, title: this.title, error: this.error, volume: this.volume(), on: !!this.el }; },
    activated() { return !!(navigator.userActivation && navigator.userActivation.hasBeenActive); },

    start(o) {
      o = o || {};
      this.wanted = !!DV.Settings.get('menuTheme');
      this.stop(true);
      const why = o.force ? '' : this.blocked();
      this.error = why || null;
      if (why) { this.mode = 'builtin'; return false; }
      const C = DV.Config.MENU_THEME || {};
      this.sources = [];
      if (C.file) this.sources.push(['file', C.file]);
      if (C.soundcloud) this.sources.push(['soundcloud', C.soundcloud]);
      if (C.youtube) this.sources.push(['youtube', C.youtube]);
      this.errors = [];
      this.muted = true;
      this.window();
      this.setTitle(C.title || 'Main theme');
      this.sync();
      // the first click or key anywhere starts it
      this.gesture = () => this.unmute();
      window.addEventListener('pointerdown', this.gesture, true);
      window.addEventListener('keydown', this.gesture, true);
      this.next();
      return true;
    },
    // the next source on the list (why: what went wrong with the last)
    next(why) {
      if (why) this.errors.push(why);
      clearTimeout(this.watch);
      this.kill(this.player);
      this.player = null; this.playing = false; this.ready = false;
      const s = this.sources.shift();
      if (!s) {
        const err = this.errors.join('; ');
        this.stop(true);
        this.error = err; this.mode = 'builtin';
        if (DV.Game && DV.Game.state === 'mainmenu') DV.Audio.setMusic('menu');
        return;
      }
      const tok = ++this.tok, [kind, v] = s;
      this.mode = kind;
      const scr = this.el.querySelector('.mt-screen');
      scr.innerHTML = '<div class="mt-slot"></div>';
      this.el.dataset.src = kind;
      this['from_' + kind](v, tok, scr.firstChild);
      this.watch = setTimeout(() => { if (tok === this.tok && !this.ready) this.next(kind + ' didn\'t answer'); }, PATIENCE);
    },
    // a player's ready: its title, its volume, and sound if you've already clicked
    isReady(tok, title) {
      if (tok !== this.tok) return;
      this.ready = true;
      clearTimeout(this.watch);
      if (title) this.setTitle(title);
      this.player.setVolume(this.volume());
      if (!this.muted || this.activated()) this.unmute();
    },
    // (a service's script, loaded once)
    load(id, src, ready, cb, tok) {
      if (ready()) { cb(); return; }
      (this.queues[id] = this.queues[id] || []).push(cb);
      if (document.getElementById(id)) return;
      const flush = () => { const q = this.queues[id] || []; this.queues[id] = []; q.forEach((f) => f()); };
      if (id === 'yt-api') { const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) prev(); flush(); }; }
      const s = document.createElement('script');
      s.id = id; s.src = src; s.async = true;
      if (id !== 'yt-api') s.onload = flush;
      s.onerror = () => { s.remove(); this.queues[id] = []; if (tok === this.tok) this.next('couldn\'t reach ' + (id === 'yt-api' ? 'YouTube' : 'SoundCloud')); };
      document.head.appendChild(s);
    },

    /* ---------------- SoundCloud's player ---------------- */
    scSrc(url) {
      return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(String(url).replace('//m.soundcloud.com/', '//soundcloud.com/')) +
        '&auto_play=false&visual=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&sharing=false&download=false&buying=false';
    },
    from_soundcloud(url, tok, slot) {
      const f = document.createElement('iframe');
      f.width = W; f.height = H; f.title = 'SoundCloud'; f.allow = 'autoplay; encrypted-media';
      f.setAttribute('frameborder', '0');
      f.src = this.scSrc(url);
      slot.replaceWith(f);
      this.load('sc-api', SC_API, () => !!(window.SC && window.SC.Widget), () => {
        if (tok !== this.tok) return;
        const w = window.SC.Widget(f), E = window.SC.Widget.Events;
        this.player = {
          setVolume: (v) => w.setVolume(v),
          on: () => { w.setVolume(this.volume()); w.play(); },
          off: () => w.pause(),
          destroy: () => { try { w.pause(); } catch (e) { /* (gone) */ } f.remove(); },
        };
        w.bind(E.READY, () => w.getCurrentSound((s) => this.isReady(tok, s && s.title ? s.title + (s.user && s.user.username ? ' — ' + s.user.username : '') : '')));
        w.bind(E.PLAY, () => { if (tok === this.tok) { this.playing = true; this.sync(); } });
        w.bind(E.PAUSE, () => { if (tok === this.tok) { this.playing = false; this.sync(); } });
        w.bind(E.FINISH, () => { if (tok === this.tok && !this.muted) { w.seekTo(0); w.play(); } }); // (round again)
        w.bind(E.ERROR, () => { if (tok === this.tok) this.next('SoundCloud wouldn\'t play it here'); });
      }, tok);
    },

    /* ---------------- YouTube's player ---------------- */
    from_youtube(id, tok, slot) {
      this.load('yt-api', YT_API, () => !!(window.YT && window.YT.Player), () => {
        if (tok !== this.tok) return;
        let yt = null;
        const ok = () => { const d = yt.getVideoData ? yt.getVideoData() : null; this.isReady(tok, d && d.title ? d.title + (d.author ? ' — ' + d.author : '') : ''); };
        yt = new window.YT.Player(slot, {
          width: W, height: H, videoId: id,
          playerVars: { autoplay: 1, mute: 1, loop: 1, playlist: id, controls: 1, playsinline: 1, rel: 0, fs: 0, iv_load_policy: 3 },
          events: {
            onReady: ok,
            onStateChange: (e) => {
              if (tok !== this.tok) return;
              this.playing = e.data === 1;
              if (e.data === 0) { yt.seekTo(0); yt.playVideo(); } // (round again)
              this.sync();
            },
            onError: (e) => { if (tok === this.tok) this.next('YouTube wouldn\'t play it here (error ' + e.data + ')'); },
          },
        });
        this.player = {
          setVolume: (v) => yt.setVolume(v),
          on: () => { yt.unMute(); yt.setVolume(this.volume()); yt.playVideo(); },
          off: () => yt.mute(),
          destroy: () => yt.destroy(),
        };
      }, tok);
    },

    /* ---------------- or a copy of your own ---------------- */
    from_file(src, tok, slot) {
      const a = new Audio(src);
      a.loop = true;
      a.onplaying = () => { if (tok === this.tok) { this.playing = true; this.sync(); } };
      a.onpause = () => { if (tok === this.tok) { this.playing = false; this.sync(); } };
      a.onerror = () => { if (tok === this.tok) this.next('couldn\'t open ' + src); };
      a.oncanplay = () => { a.oncanplay = null; this.isReady(tok, ''); };
      slot.innerHTML = '<div class="mt-disc"></div>';
      this.setTitle((DV.Config.MENU_THEME || {}).title || String(src).split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' '));
      this.player = {
        setVolume: (v) => { a.volume = v / 100; },
        on: () => { a.volume = this.volume() / 100; a.play().catch(() => {}); },
        off: () => a.pause(),
        destroy: () => { a.pause(); a.removeAttribute('src'); a.load(); },
      };
    },

    /* ---------------- sound on and off ---------------- */
    unmute() {
      this.dropGesture();
      this.muted = false;
      if (this.el) this.el.classList.remove('muted');
      if (this.player && this.ready) this.player.on();
      this.sync();
    },
    toggleMute() {
      if (this.muted) { this.unmute(); return; }
      this.muted = true;
      if (this.player) this.player.off();
      if (this.el) this.el.classList.add('muted');
      this.sync();
    },
    // while the theme's up (or getting there) the synth keeps quiet; you can mute it and have quiet
    sync() {
      if (!DV.Game || DV.Game.state !== 'mainmenu') return;
      DV.Audio.setMusic(this.el ? 'none' : 'menu');
    },
    applyVolume() { if (this.player && this.ready && !this.muted) this.player.setVolume(this.volume()); },
    dropGesture() {
      if (!this.gesture) return;
      window.removeEventListener('pointerdown', this.gesture, true);
      window.removeEventListener('keydown', this.gesture, true);
      this.gesture = null;
    },
    kill(p) { try { if (p) p.destroy(); } catch (e) { /* (already gone) */ } },

    stop(now) {
      this.dropGesture();
      clearTimeout(this.watch);
      this.tok++;
      const p = this.player, el = this.el, fade = !now && p && this.ready && !this.muted;
      this.player = null; this.el = null; this.playing = false; this.ready = false; this.sources = [];
      if (!p && !el) return;
      if (!fade) { this.kill(p); if (el) el.remove(); return; }
      // a short fade, the window going with it (out of the menu, which is about to go)
      if (el) { (DV.UI.root || document.body).appendChild(el); el.classList.add('leaving'); }
      let v = this.volume();
      const step = Math.max(1, v / 10);
      const iv = setInterval(() => {
        v -= step;
        if (v <= 0) { clearInterval(iv); this.kill(p); if (el) el.remove(); return; }
        try { p.setVolume(v); } catch (e) { /* (gone) */ }
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
