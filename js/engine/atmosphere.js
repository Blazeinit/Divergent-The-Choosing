/* =============================================================================
   Atmosphere: the fog every material shares.

   three's own fog is a flat wall of colour at a distance. Out of doors this one
   also lies low: a haze that thickens near the ground and thins with height, so
   a street fades into the murk while the tops of the towers still read against
   the sky. (Indoors, where the fog is short, it's the plain fog as before.)
   Patched into the shared shader chunks, so it costs nothing per material and
   every lit, basic, sprite and custom shader that uses the fog chunks gets it.
============================================================================= */
(function () {
  'use strict';
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = [
    '#ifdef USE_FOG',
    '  varying float vFogDepth;',
    '  varying float vFogY;',
    '#endif',
  ].join('\n');
  // (the height in the world, from the view-space position: the view matrix turned back)
  C.fog_vertex = [
    '#ifdef USE_FOG',
    '  vFogDepth = - mvPosition.z;',
    '  vFogY = dot( viewMatrix[1].xyz, mvPosition.xyz ) + cameraPosition.y;',
    '#endif',
  ].join('\n');
  C.fog_pars_fragment = [
    '#ifdef USE_FOG',
    '  uniform vec3 fogColor;',
    '  varying float vFogDepth;',
    '  varying float vFogY;',
    '  #ifdef FOG_EXP2',
    '    uniform float fogDensity;',
    '  #else',
    '    uniform float fogNear;',
    '    uniform float fogFar;',
    '  #endif',
    '#endif',
  ].join('\n');
  C.fog_fragment = [
    '#ifdef USE_FOG',
    '  #ifdef FOG_EXP2',
    '    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );',
    '  #else',
    '    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );',
    // the low haze (open air only: a long fog): thick at the kerb, gone by the fifth floor
    '    float hz = smoothstep( 90.0, 190.0, fogFar ) * 0.75;',
    '    float lowH = ( 1.0 - exp( - vFogDepth * 2.4 / fogFar ) ) * exp( - max( vFogY, 0.0 ) * 0.05 );',
    '    fogFactor = fogFactor + ( 1.0 - fogFactor ) * lowH * hz;',
    // (and high up, a little less of the flat fog: the skyline stands out of the murk)
    '    fogFactor *= 1.0 - hz * 0.5 * smoothstep( 14.0, 70.0, vFogY ) * ( 1.0 - smoothstep( fogFar * 0.9, fogFar * 1.6, vFogDepth ) );',
    '  #endif',
    '  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, clamp( fogFactor, 0.0, 1.0 ) );',
    '#endif',
  ].join('\n');
})();
