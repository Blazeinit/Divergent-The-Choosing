/* ==========================================================================
   DIVERGENT — configuration constants and persistent user settings
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  DV.Config = {
    VERSION: 'Build 4 — v0.4.0',
    DEBUG: /[?&]debug=1/.test(location.search),

    // 1 real second = TIME_SCALE game seconds (the fallback: the player picks the
    // clock speed in Settings, see DV.Clock.SPEEDS)
    TIME_SCALE: 10,
    START_TIME: '08:00',

    GRID: 0.5, // navigation / collision raster size (meters)

    PLAYER: {
      radius: 0.32,
      walkSpeed: 2.35,
      runSpeed: 5.1,
      accel: 14,
      turnRate: 11,
      staminaMax: 100,
      staminaDrain: 9, // per second while running
      staminaRegen: 14,
      crouchSpeed: 1.15,
      jumpSpeed: 3.9, // m/s upward (≈0.75 m hop)
      jumpCost: 14, // stamina per jump
      gravity: 10.5,
    },

    CAMERA: {
      fov: 62,
      distance: 4.0,
      minDistance: 1.6,
      maxDistance: 6.0,
      pivotHeight: 1.55,
      minPitch: -1.05,
      maxPitch: 0.62,
      followLambda: 14,
    },

    NPC: {
      radius: 0.3,
      walkSpeed: 1.35,
      fullUpdateDist: 22, // full AI + animation
      midUpdateDist: 40, // reduced rate
      cullDist: 52, // beyond this the mesh is hidden
      talkRange: 2.4,
    },

    INTERACT_RANGE: 2.1,
    // the main menu's theme song, streamed in the service's own player (js/ui/menuTheme.js). Tried in
    // turn: file (a copy of your own, e.g. 'assets/audio/menu_theme.mp3': plays offline and from disk),
    // then the SoundCloud track, then the YouTube video; the synth music if none will play
    MENU_THEME: {
      file: null,
      soundcloud: 'https://soundcloud.com/amaruprod/paul-van-dyk-nothing-but-you-cirrus-mix-amaru-deconstruction',
      youtube: 'RmJCKRJx9Dc',
      title: 'Paul van Dyk \u2014 Nothing But You (Cirrus Mix, Amaru deconstruction)',
    },
    SAVE_PREFIX: 'divergent_b1_',
    SAVE_SLOTS: 6,
  };

  /* -------------------------- persistent settings -------------------------- */
  const SETTINGS_KEY = DV.Config.SAVE_PREFIX + 'settings';
  const defaults = {
    mouseSensitivity: 1.0,
    softCursor: true, // in-game cursor: menus keep the mouse captured
    invertY: false,
    renderScale: 'retro', // 'ultra' | 'retro' | 'crisp' | 'native'
    vertexWobble: true, // PS1-style vertex snapping on characters
    textureFilter: 'retro', // 'retro' (nearest) | 'smooth'
    masterVolume: 0.8,
    musicVolume: 0.5,
    menuTheme: true, // the main menu's theme song (streams from SoundCloud or YouTube; the synth music otherwise)
    sfxVolume: 0.8,
    paVoice: false, // speech synthesis for PA announcements
    reverb: true, // room reverb on world sounds
    ambienceDetail: 'high', // 'high' | 'low' (fewer ambient one-shots and accents)
    questMarkers: true,
    textSpeed: 'normal', // 'slow' | 'normal' | 'fast' | 'instant'
    clockSpeed: 'normal', // 'slow' (an hour every 12 minutes) | 'normal' (6) | 'fast' (3)
    devMenu: false, // the developer menu (` or Pause → Developer), for testing
    showFps: false,
    drawDistance: 'normal', // 'near' | 'normal' | 'far'
  };

  DV.Settings = {
    defaults,
    data: Object.assign({}, defaults),
    load() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) Object.assign(this.data, JSON.parse(raw));
      } catch (e) {
        console.warn('Settings could not be loaded', e);
      }
      return this.data;
    },
    save() {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('Settings could not be saved', e);
      }
      DV.Events.emit('settings:changed', this.data);
    },
    get(k) {
      return this.data[k];
    },
    set(k, v) {
      this.data[k] = v;
      this.save();
    },
    reset() {
      this.data = Object.assign({}, defaults);
      this.save();
    },
  };
  DV.Settings.load();
})();
