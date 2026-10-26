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
          // (the trees' crowns: they bend with the wind, above head height)
          if (tex === 'grass') Mat.sway(m);
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
    // The wind, for what bends in it: (dir x, dir z, strength 0..1, time) (set by js/game/leaves.js)
    wind: { value: new THREE.Vector4(0.94, 0.34, 0.4, 0) },
    // what's above head height leans downwind and sways, more in a gust (the geometry is in world space:
    // the static batches and the street kit). green: only what's green (the street kit's one material
    // has the trees' leaves in it with everything else)
    swayChunk(green) {
      return [
        '#include <begin_vertex>',
        '{',
        '  vec4 swW = modelMatrix * vec4(transformed, 1.0);',
        '  float swH = max(0.0, swW.y - 1.9);',
        green ? '  #ifdef USE_COLOR\n  if (color.g < color.r * 1.06 || color.g < color.b * 1.06) swH = 0.0;\n  #endif' : '',
        '  float swS = uWind.z;',
        '  float swP = sin(uWind.w * 1.7 + swW.x * 0.31 + swW.z * 0.23) + 0.5 * sin(uWind.w * 3.9 + swW.x * 0.9);',
        '  transformed.xz += uWind.xy * swH * (swS * 0.07 + swP * 0.025 * (0.3 + swS));',
        '}',
      ].join('\n');
    },
    sway(mat, green) {
      const prev = mat.onBeforeCompile;
      mat.onBeforeCompile = function (sh, r) {
        if (prev) prev.call(this, sh, r);
        sh.uniforms.uWind = Mat.wind;
        sh.vertexShader = 'uniform vec4 uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', Mat.swayChunk(green));
      };
      const key = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
      mat.customProgramCacheKey = () => key + '|sway' + (green ? 'g' : '');
      return mat;
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
