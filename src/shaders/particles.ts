export const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uSpeed;
uniform float uParallax;
uniform float uOpacity;
uniform vec2 uBox;
uniform vec2 uPointer;

attribute vec4 aRandom;

varying float vAlpha;
varying float vMix;

void main() {
  vec3 p = position;
  float t = uTime * uSpeed;
  float halfY = uBox.y * 0.5;

  // Rise slowly and wrap vertically inside the layer's box
  p.y = mod(p.y + halfY + t * (0.35 + aRandom.x), uBox.y) - halfY;
  float wrappedY = p.y;

  // Gentle sway
  p.x += sin(t * 0.8 + aRandom.y * 6.2831853) * 0.35;
  p.z += cos(t * 0.6 + aRandom.w * 6.2831853) * 0.3;

  // Pointer parallax (stronger on nearer layers)
  p.x += uPointer.x * uParallax;
  p.y -= uPointer.y * uParallax * 0.6;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = uSize * (0.5 + aRandom.z);
  gl_PointSize = size * uPixelRatio * (6.0 / max(-mv.z, 0.1));

  float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aRandom.x * 1.6) + aRandom.y * 6.2831853);
  // Fade near the wrap boundary so particles never visibly pop
  float edge = smoothstep(0.0, 0.08, 0.5 - abs(wrappedY) / uBox.y);

  vAlpha = twinkle * edge * uOpacity;
  vMix = aRandom.w;
}
`

export const particleFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;

varying float vAlpha;
varying float vMix;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;

  float soft = 1.0 - smoothstep(0.0, 0.5, d);
  float a = soft * soft * vAlpha;

  gl_FragColor = vec4(mix(uColorA, uColorB, vMix), a);
  #include <colorspace_fragment>
}
`