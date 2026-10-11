/* =============================================================================
   The picture: one pass over the finished frame.

   The scene is drawn to a target the size of the canvas, then onto the screen
   through a single shader: a filmic tone curve and the film's grade (a little
   cold in the shadows, warm in the light, not quite all the colour), a soft
   glow round anything bright (lamps, windows lit at night, the daylight at the
   top of the stairs), a vignette, and a fine moving grain. One extra draw call.
   Off in Settings (Film look), and it's simply the plain render.
============================================================================= */
(function () {
  'use strict';
  const DV = window.DV;
  const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const FRAG = [
    'uniform sampler2D tex; uniform vec2 px; uniform float time; uniform float grain; uniform float glowAmt; uniform float vig;',
    'varying vec2 vUv;',
    'float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }',
    'float rnd(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'void main() {',
    '  vec3 c = texture2D(tex, vUv).rgb;',
    // the glow: what's bright round about, gathered in two rings
    '  vec3 g = vec3(0.0);',
    '  for (int i = 0; i < 8; i++) {',
    '    float a = float(i) * 0.7854;',
    '    vec2 o = vec2(cos(a), sin(a)) * px;',
    '    vec3 s1 = texture2D(tex, vUv + o * 3.0).rgb, s2 = texture2D(tex, vUv + o * 8.0).rgb;',
    '    g += max(s1 - 0.72, 0.0) * 0.6 + max(s2 - 0.72, 0.0) * 0.4;',
    '  }',
    '  c += g * glowAmt / 8.0 * 2.2;',
    // the curve: a soft toe and shoulder (the blacks deep, the whites not clipped hard)
    '  c = mix(c, smoothstep(vec3(-0.03), vec3(1.06), c), 0.75);',
    // the grade: shadows to steel, lights to warm; a little colour taken out
    '  float l = luma(c);',
    '  c = mix(c, c * vec3(0.93, 0.99, 1.06), (1.0 - smoothstep(0.0, 0.45, l)) * 0.7);',
    '  c = mix(c, c * vec3(1.05, 1.01, 0.94), smoothstep(0.5, 1.0, l) * 0.6);',
    '  c = mix(vec3(l), c, 0.9);',
    // the vignette and the grain
    '  vec2 q = vUv - 0.5;',
    '  c *= 1.0 - vig * smoothstep(0.25, 0.85, dot(q, q) * 2.2);',
    '  c += (rnd(vUv * 911.0 + fract(time) * 37.0) - 0.5) * grain;',
    '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
    '}',
  ].join('\n');

  const Post = {
    rt: null, quad: null, scene: null, cam: null, t: 0,
    on() { return DV.Settings.get('filmLook') !== false; },
    ensure(renderer) {
      const s = renderer.getDrawingBufferSize(new THREE.Vector2());
      if (!this.rt) {
        this.rt = new THREE.WebGLRenderTarget(s.x, s.y, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
        this.mat = new THREE.ShaderMaterial({
          uniforms: { tex: { value: this.rt.texture }, px: { value: new THREE.Vector2(1 / s.x, 1 / s.y) }, time: { value: 0 }, grain: { value: 0.035 }, glowAmt: { value: 1 }, vig: { value: 0.32 } },
          vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
        });
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
        this.quad.frustumCulled = false;
        this.scene = new THREE.Scene();
        this.scene.add(this.quad);
        this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      } else if (this.rt.width !== s.x || this.rt.height !== s.y) {
        this.rt.setSize(s.x, s.y);
        this.mat.uniforms.px.value.set(1 / s.x, 1 / s.y);
      }
    },
    // draw the frame (with the film look, or plain)
    render(renderer, scene, camera, dt) {
      renderer.info.reset();
      if (!this.on()) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
      this.ensure(renderer);
      this.t += dt || 0;
      this.mat.uniforms.time.value = this.t;
      renderer.setRenderTarget(this.rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(this.scene, this.cam);
    },
  };
  DV.Post = Post;
})();
