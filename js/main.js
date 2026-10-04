/* ==========================================================================
   DIVERGENT — entry point
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;

  function boot() {
    if (!window.THREE) {
      document.body.innerHTML = '<div style="color:#e8dcc0;font-family:Georgia,serif;padding:40px;line-height:1.6">' +
        '<h2>DIVERGENT could not start</h2><p>Three.js failed to load. The game ships with a local copy at <code>js/lib/three.min.js</code> — make sure that file exists.</p></div>';
      return;
    }
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) throw new Error('WebGL unavailable');
    } catch (e) {
      document.body.innerHTML = '<div style="color:#e8dcc0;font-family:Georgia,serif;padding:40px">WebGL is not available in this browser. Please use a recent Chrome, Edge or Firefox with hardware acceleration enabled.</div>';
      return;
    }
    DV.Game.init();
    window.DV = DV; // exposed for debugging / QA tools
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
