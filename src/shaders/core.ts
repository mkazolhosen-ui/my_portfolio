import { noiseGLSL } from './noise'

/* ---------- Energy shell: noise-displaced sphere with fresnel rim glow ---------- */

export const shellVertex = /* glsl */ `
uniform float uTime;
uniform float uDisplace;

varying vec3 vNormalV;
varying vec3 vViewDir;
varying vec3 vObjPos;
varying float vNoise;

${noiseGLSL}

void main() {
  float n = snoise(position * 1.4 + vec3(0.0, uTime * 0.22, uTime * 0.12));
  vec3 displaced = position + normal * n * uDisplace;

  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);

  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  vObjPos = position;
  vNoise = n;

  gl_Position = projectionMatrix * mv;
}
`

export const shellFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uIntensity;

varying vec3 vNormalV;
varying vec3 vViewDir;
varying vec3 vObjPos;
varying float vNoise;

void main() {
  vec3 N = normalize(vNormalV);
  vec3 V = normalize(vViewDir);

  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);
  float n01 = vNoise * 0.5 + 0.5;

  // Thin scan bands drifting across the surface
  float scan = sin(vObjPos.y * 16.0 + vNoise * 3.0 - uTime * 1.1);
  scan = smoothstep(0.88, 1.0, scan);

  float glow = fres * (0.55 + 0.75 * n01);
  float a = (glow + scan * (0.10 + 0.5 * fres)) * uIntensity;

  vec3 col = mix(uColorA, uColorB, clamp(fres + vNoise * 0.3, 0.0, 1.0));

  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}
`

/* ---------- Filament network: travelling pulses of light ---------- */

export const filamentVertex = /* glsl */ `
varying vec3 vPos;

void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const filamentFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uBase;

varying vec3 vPos;

void main() {
  float h = normalize(vPos).y;
  float wave = sin(h * 5.0 - uTime * 1.4);
  float pulse = pow(max(wave, 0.0), 10.0);

  float a = uBase + pulse * 0.65;

  gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}
`