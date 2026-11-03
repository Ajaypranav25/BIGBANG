import { NOISE_GLSL } from '../../shaders/noise'

const COLOR_GLSL = /* glsl */ `
vec3 heatColor(float h){
  vec3 c0 = vec3(0.22,0.04,0.05);
  vec3 c1 = vec3(0.75,0.18,0.06);
  vec3 c2 = vec3(1.0,0.52,0.18);
  vec3 c3 = vec3(1.0,0.82,0.55);
  vec3 c4 = vec3(1.0,0.97,0.92);
  if (h < 0.25) return mix(c0,c1,h/0.25);
  if (h < 0.5) return mix(c1,c2,(h-0.25)/0.25);
  if (h < 0.75) return mix(c2,c3,(h-0.5)/0.25);
  return mix(c3,c4,(h-0.75)/0.25);
}
// Planck CMB map palette: deep blue (cold) → cream → red (hot)
vec3 cmbColor(float f){
  float t = clamp(f*0.5+0.5,0.0,1.0);
  vec3 a = vec3(0.02,0.12,0.75);
  vec3 b = vec3(0.35,0.7,1.0);
  vec3 c = vec3(1.0,0.93,0.78);
  vec3 d = vec3(1.0,0.55,0.15);
  vec3 e = vec3(0.75,0.08,0.05);
  if (t < 0.25) return mix(a,b,t/0.25);
  if (t < 0.5) return mix(b,c,(t-0.25)/0.25);
  if (t < 0.75) return mix(c,d,(t-0.5)/0.25);
  return mix(d,e,(t-0.75)/0.25);
}
`

export const particleVertex = /* glsl */ `
${NOISE_GLSL}
${COLOR_GLSL}
attribute vec4 aSeed;
attribute vec3 aBall;
attribute vec3 aWeb;
attribute vec3 aGal;
attribute float aKind;

uniform float uTime;
uniform float uBallRadius;
uniform float uTurb;
uniform float uHeat;
uniform float uCmb;
uniform float uDark;
uniform float uWebMix;
uniform float uGalMix;
uniform float uSpin;
uniform float uMerge;
uniform float uStars;
uniform float uReion;
uniform float uSize;
uniform float uPixelRatio;

varying vec3 vColor;
varying float vAlpha;

vec3 rotY(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(c*p.x - s*p.z, p.y, s*p.x + c*p.z); }

void main(){
  // --- primordial ball (expanding, turbulent plasma) ---
  vec3 ball = aBall * uBallRadius;
  if (uTurb > 0.001) {
    vec3 q = aBall*2.2 + vec3(0.0, uTime*0.25, 0.0);
    ball += vec3(snoise(q), snoise(q+17.1), snoise(q+41.7)) * uTurb * uBallRadius * 0.07;
  }
  float fluct = snoise(aBall*4.0) * 0.7 + snoise(aBall*9.0) * 0.3;

  // --- cosmic web: matter drains out of voids into filaments, staggered per particle ---
  float w = smoothstep(aSeed.x*0.45, aSeed.x*0.45+0.55, uWebMix);
  vec3 p = mix(ball, aWeb, w);

  // --- galaxy: barred spiral with a satellite merger ---
  vec3 gal = aGal;
  float kind = aKind;
  if (kind > 3.5 && kind < 4.5) {
    float m = uMerge;
    float R = mix(27.0, 1.2, m);
    float ang = m*9.0 + 0.8;
    vec3 orbitP = vec3(cos(ang)*R, sin(m*6.0)*5.0*(1.0-m), sin(ang)*R);
    vec3 clump = aBall * mix(1.4, 3.5, m);
    gal = mix(orbitP + clump, aGal, smoothstep(0.72, 1.0, m));
  } else if (kind > 5.5) {
    gal = aWeb * 2.4; // distant field galaxies
  }
  float r = length(gal.xz);
  float diff = (kind < 0.5) ? 0.45 : 0.12/(1.0 + 0.2*r);
  if (kind < 5.5) gal = rotY(gal, uSpin + diff*uTime*0.6);
  float g = smoothstep(aSeed.y*0.4, aSeed.y*0.4+0.6, uGalMix);
  p = mix(p, gal, g);

  // --- colour ---
  vec3 col = mix(heatColor(uHeat), cmbColor(fluct), uCmb);
  col *= mix(1.0, 0.1, uDark);
  col += vec3(0.25,0.35,1.0) * uReion * 0.35 * w;

  float isStar = step(0.982, aSeed.z);
  float flick = 0.75 + 0.25*sin(uTime*3.0 + aSeed.w*40.0);
  float starAmt = isStar * uStars * flick;
  col = mix(col, vec3(0.55,0.72,1.0)*3.5, starAmt);

  vec3 galCol;
  float galSize = 1.0;
  if (kind < 0.5) { galCol = vec3(1.0,0.8,0.52)*1.25; galSize = 1.1; }
  else if (kind < 1.5) { galCol = mix(vec3(0.55,0.72,1.0), vec3(0.95,0.96,1.0), aSeed.w)*1.35; galSize = 1.15; }
  else if (kind < 2.5) { galCol = vec3(0.9,0.85,0.78)*0.65; }
  else if (kind < 3.5) { galCol = vec3(0.85,0.75,0.65)*0.35; galSize = 0.8; }
  else if (kind < 4.5) { galCol = vec3(1.0,0.86,0.7)*0.9; }
  else if (kind < 5.5) { galCol = mix(vec3(1.0,0.35,0.55), vec3(0.6,0.75,1.0), step(0.55, aSeed.w))*1.2; galSize = 1.35; }
  else { galCol = mix(vec3(0.75,0.82,1.0), vec3(1.0,0.85,0.7), aSeed.z)*0.8; galSize = 0.7; }
  col = mix(col, galCol, g);

  vColor = col;
  vAlpha = 1.0;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float size = uSize * (0.55 + aSeed.y*0.9) * mix(1.0, galSize, g) * (1.0 + starAmt*2.2);
  gl_PointSize = clamp(size * uPixelRatio * 42.0 / -mv.z, 0.6, 48.0);
  gl_Position = projectionMatrix * mv;
}
`

export const particleFragment = /* glsl */ `
uniform float uIntensity;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord*2.0-1.0;
  float d = dot(c,c);
  if (d > 1.0) discard;
  float a = exp(-d*3.5) * vAlpha * uIntensity;
  gl_FragColor = vec4(min(vColor*a, vec3(64.0)), a);
}
`

export const fogVertex = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`

export const fogFragment = /* glsl */ `
${NOISE_GLSL}
${COLOR_GLSL}
uniform float uTime;
uniform float uHeat;
uniform float uFog;
uniform float uCmb;
varying vec3 vDir;
void main(){
  float n = fbm(vDir*3.0 + vec3(0.0, uTime*0.05, uTime*0.03));
  vec3 plasma = heatColor(uHeat) * (0.55 + 0.45*n);
  float f = fbm(vDir*5.0)*1.1 + snoise(vDir*14.0)*0.25;
  vec3 cmb = cmbColor(f) * 0.9;
  vec3 col = mix(plasma, cmb, uCmb);
  float a = uFog * (0.55 + 0.35*n);
  gl_FragColor = vec4(col*a, a);
}
`
