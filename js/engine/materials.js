/* ==========================================================================
   DIVERGENT — shared material library
   Static environment uses MeshBasicMaterial + baked vertex lighting.
   Dynamic objects and characters use Lambert with scene lights.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const cache = {};

  // shared uniform for PS1 vertex snapping (characters only)
  const snapUniform = { value: new THREE.Vector2(0, 0) };

  const Mat = {
    snapUniform,
    /**
     * key format: "texture" or "texture:mode"
     * modes: lit (default, baked vertex light), emit (full bright), alpha (cutout),
     *        alphalit (cutout + baked), glass (transparent tint), dbl (double sided lit)
     */
    get(key) {
      if (cache[key]) return cache[key];
      const [tex, mode] = key.split(':');
      let m;
      const map = DV.Tex.get(tex);
      switch (mode) {
        case 'emit':
          m = new THREE.MeshBasicMaterial({ map, fog: true });
          m.userData.baked = false;
          break;
        case 'alpha':
          m = new THREE.MeshBasicMaterial({ map, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, fog: true });
          m.userData.baked = true;
          break;
        case 'glass':
          m = new THREE.MeshBasicMaterial({ color: 0x9fb8c0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: true });
          m.userData.baked = false;
          m.userData.transparent = true;
          break;
        case 'dbl':
          m = new THREE.MeshBasicMaterial({ map, vertexColors: true, side: THREE.DoubleSide, fog: true });
          m.userData.baked = true;
          break;
        default:
          m = new THREE.MeshBasicMaterial({ map, vertexColors: true, fog: true });
          m.userData.baked = true;
      }
      m.name = key;
      cache[key] = m;
      return m;
    },
    // Material from an arbitrary texture (signs, posters, banners). Baked-lit by default.
    fromTexture(key, tex, opts) {
      if (cache[key]) return cache[key];
      opts = opts || {};
      const m = new THREE.MeshBasicMaterial({
        map: tex,
        vertexColors: !opts.emit,
        fog: true,
        transparent: !!opts.transparent,
        alphaTest: opts.alphaTest || 0,
        side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      });
      m.userData.baked = !opts.emit;
      m.name = key;
      cache[key] = m;
      return m;
    },
    // Dynamic lit material (doors, props that move, pickups).
    lit(key, texName, color) {
      const k = 'lit|' + key;
      if (cache[k]) return cache[k];
      const m = new THREE.MeshLambertMaterial({ map: texName ? DV.Tex.get(texName) : null, color: color === undefined ? 0xffffff : color });
      m.name = k;
      cache[k] = m;
      return m;
    },
    basic(key, color, opts) {
      const k = 'basic|' + key;
      if (cache[k]) return cache[k];
      const m = new THREE.MeshBasicMaterial(Object.assign({ color, fog: true }, opts || {}));
      m.name = k;
      cache[k] = m;
      return m;
    },
    // Adds PS1 style vertex snapping to a material.
    applyWobble(mat) {
      if (mat.userData.wobble) return mat;
      mat.userData.wobble = true;
      mat.onBeforeCompile = function (shader) {
        shader.uniforms.uSnap = snapUniform;
        shader.vertexShader = 'uniform vec2 uSnap;\n' + shader.vertexShader.replace(
          '#include <project_vertex>',
          '#include <project_vertex>\n' +
            'if (uSnap.x > 0.0) { vec4 sp = gl_Position; sp.xy = floor((sp.xy / sp.w) * uSnap + 0.5) / uSnap * sp.w; gl_Position = sp; }'
        );
      };
      mat.customProgramCacheKey = function () {
        return 'ps1wobble';
      };
      return mat;
    },
    updateWobble() {
      const on = DV.Settings.get('vertexWobble');
      snapUniform.value.set(on ? 200 : 0, on ? 150 : 0);
    },
    refreshFilters() {
      DV.Tex.refreshFilters();
    },
  };
  DV.Mat = Mat;
  Mat.updateWobble();
  DV.Events.on('settings:changed', () => Mat.updateWobble());
})();
