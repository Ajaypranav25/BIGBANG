import { NOISE_GLSL } from '../../shaders/noise'

export const globeVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vObjNormal;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main(){
  vUv = uv;
  vObjNormal = normalize(position);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position,1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

export const globeFragment = /* glsl */ `
${NOISE_GLSL}
uniform sampler2D uAtlas;
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform float uCols;
uniform float uRows;
uniform float uFrameA;
uniform float uFrameB;
uniform float uFrameMix;
uniform float uPaleo;
uniform float uProtoLand;
uniform float uModern;
uniform float uMagma;
uniform float uOcean;
uniform float uArchean;
uniform float uIceNorth;
uniform float uIceSouth;
uniform float uVegetation;
uniform float uNightLights;
uniform float uDust;
uniform float uFire;
uniform float uRing;
uniform vec3 uImpactDir;
uniform float uTraps;
uniform vec3 uTrapsDir;
uniform vec3 uSunDir;
uniform float uTime;

varying vec2 vUv;
varying vec3 vObjNormal;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

float atlasSample(float frame, vec2 uv){
  float col = mod(frame, uCols);
  float row = floor(frame / uCols);
  vec2 cell = vec2(1.0/uCols, 1.0/uRows);
  vec2 inset = vec2(clamp(uv.x, 0.002, 0.998), clamp(uv.y, 0.004, 0.996));
  vec2 a = vec2((col + inset.x) * cell.x, 1.0 - (row + 1.0 - inset.y) * cell.y);
  return texture2D(uAtlas, a).r;
}

void main(){
  vec3 n = normalize(vObjNormal);
  float lat = asin(clamp(n.y,-1.0,1.0)) * 57.2958;

  // ---------- land mask ----------
  float paleoMask = mix(atlasSample(uFrameA, vUv), atlasSample(uFrameB, vUv), uFrameMix);
  float detail = fbm(n*7.0) * 0.12;
  float paleoLand = smoothstep(0.47, 0.53, paleoMask + detail*0.5);
  float protoN = fbm(n*1.7 + vec3(3.1,1.7,0.2)) + 0.25*fbm(n*5.0);
  float protoT = 0.62 - uProtoLand*1.6;
  float protoLand = uProtoLand > 0.001 ? smoothstep(protoT-0.02, protoT+0.02, protoN) : 0.0;
  float land = mix(protoLand, paleoLand, uPaleo);
  float shelf = mix(smoothstep(protoT-0.25, protoT, protoN), smoothstep(0.2, 0.5, paleoMask), uPaleo) * (1.0 - land);

  // ---------- surface colours (deep time) ----------
  float tex = fbm(n*12.0);
  float mtn = smoothstep(0.2, 0.6, fbm(n*4.0+11.0));
  vec3 barren = mix(vec3(0.42,0.34,0.28), vec3(0.62,0.38,0.22), smoothstep(-0.3,0.4,tex));
  barren = mix(barren, vec3(0.55,0.52,0.5), mtn*0.5);
  float desert = smoothstep(10.0, 22.0, abs(lat)) * (1.0 - smoothstep(30.0, 40.0, abs(lat)));
  vec3 green = mix(vec3(0.1,0.26,0.1), vec3(0.32,0.38,0.17), smoothstep(-0.3,0.5,tex));
  vec3 landCol = mix(barren, green, uVegetation * (1.0 - 0.75*desert));
  vec3 deep = mix(vec3(0.015,0.06,0.17), vec3(0.03,0.13,0.1), uArchean);
  vec3 shallow = mix(vec3(0.05,0.3,0.38), vec3(0.1,0.3,0.2), uArchean);
  vec3 sea = mix(deep, shallow, shelf*0.8);
  vec3 dryWorld = vec3(0.2,0.17,0.16) * (0.7 + 0.5*tex); // before oceans
  sea = mix(dryWorld, sea, uOcean);
  vec3 albedo = mix(sea, landCol, land);

  // ---------- modern Earth (Blue Marble) ----------
  vec3 day = texture2D(uDay, vUv).rgb;
  albedo = mix(albedo, day, uModern);
  float water = mix(1.0 - land, 1.0 - smoothstep(0.08, 0.2, length(day - vec3(0.02,0.06,0.15))), uModern);

  // ---------- ice ----------
  float iceNoise = fbm(n*6.0)*7.0;
  float northIce = smoothstep(uIceNorth-1.5, uIceNorth+1.5, lat + iceNoise);
  float southIce = smoothstep(uIceSouth-1.5, uIceSouth+1.5, -lat + iceNoise);
  float ice = max(northIce, southIce);
  albedo = mix(albedo, vec3(0.86,0.9,0.95) * (0.92 + 0.08*tex), ice);
  water *= (1.0 - ice);

  // ---------- lighting ----------
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunDir);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndl = dot(N, L);
  float diffuse = smoothstep(-0.15, 0.6, ndl);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N,H),0.0), 140.0) * water * smoothstep(0.0,0.2,ndl) * 0.35;
  float dim = 1.0 - 0.8*uDust;
  vec3 col = albedo * diffuse * dim * vec3(1.0,0.97,0.92) + spec * vec3(1.0,0.9,0.75) * dim;

  // ---------- night side ----------
  float night = 1.0 - smoothstep(-0.25, 0.08, ndl);
  vec3 lights = texture2D(uNight, vUv).rgb;
  col += lights * vec3(1.0,0.78,0.45) * 1.8 * uNightLights * night;

  // ---------- magma ocean ----------
  float lavaN = fbm(n*5.0 + vec3(0.0, uTime*0.03, 0.0));
  float cracks = (1.0 - smoothstep(0.0, 0.07, abs(lavaN)));
  vec3 crust = vec3(0.08,0.04,0.035) * (0.8+0.4*tex);
  vec3 lava = vec3(1.0,0.32,0.05) * 2.4;
  vec3 magma = mix(crust*(0.3+diffuse), lava, cracks + 0.3*smoothstep(0.25,0.6,lavaN));
  col = mix(col, magma, uMagma);

  // ---------- impact & large igneous provinces ----------
  float d = acos(clamp(dot(n, normalize(uImpactDir)), -1.0, 1.0));
  float front = uRing * 3.1;
  float dr = (d - front)/0.05;
  float ring = exp(-dr*dr) * (1.0 - uRing) * step(0.001, uRing);
  float fireN = fbm(n*9.0 + uTime*0.1);
  float fire = uFire * land * smoothstep(-0.1, 0.4, fireN) * (1.0 - smoothstep(front - 0.3, front + 0.2, d));
  // char the ground first so the emission reads as fire, not as a pale tint after tone mapping
  col *= 1.0 - 0.8*clamp(fire, 0.0, 1.0);
  col += vec3(1.0,0.32,0.06) * (ring*2.4 + fire*1.3);
  float crater = exp(-(d*d)/0.0025) * step(0.001, uRing);
  col = mix(col, vec3(1.0,0.55,0.18)*3.0, crater * (1.0-uRing*0.6));

  float td = acos(clamp(dot(n, normalize(uTrapsDir)), -1.0, 1.0));
  float field = uTraps * (1.0 - smoothstep(0.0, 0.26, td));
  float flows = smoothstep(0.0, 0.45, fbm(n*16.0 + uTime*0.04));
  col = mix(col, vec3(0.06,0.03,0.025), field*0.85);                 // basalt plateau
  col += vec3(1.0,0.22,0.03) * field * (0.35 + 1.6*flows);          // active fissures

  gl_FragColor = vec4(col, 1.0);
}`

export const atmosphereVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main(){
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position,1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

export const atmosphereFragment = /* glsl */ `
uniform vec3 uSunDir;
uniform float uHaze;
uniform float uDust;
uniform float uMagma;
uniform float uStrength;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main(){
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormal);
  float rim = pow(1.0 - abs(dot(N, V)), 2.6);
  float lit = smoothstep(-0.35, 0.5, dot(N, normalize(uSunDir)));
  vec3 blue = vec3(0.32,0.58,1.0);
  vec3 haze = vec3(1.0,0.58,0.22);
  vec3 dust = vec3(0.35,0.26,0.2);
  vec3 steam = vec3(1.0,0.45,0.25);
  vec3 c = mix(blue, haze, uHaze);
  c = mix(c, steam, uMagma);
  c = mix(c, dust, uDust);
  float a = rim * (lit*0.95 + 0.05) * uStrength * (1.0 + uHaze*0.6 + uDust*1.4);
  gl_FragColor = vec4(c*a, a);
}`

export const cloudFragment = /* glsl */ `
${NOISE_GLSL}
uniform sampler2D uClouds;
uniform vec3 uSunDir;
uniform float uModern;
uniform float uTime;
uniform float uCover;
uniform float uDust;
varying vec2 vUv;
varying vec3 vObjNormal;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main(){
  vec3 n = normalize(vObjNormal);
  float drift = uTime*0.004;
  vec3 q = vec3(n.x*cos(drift)-n.z*sin(drift), n.y, n.x*sin(drift)+n.z*cos(drift));
  float proc = smoothstep(0.0, 0.75, fbm(q*2.6) + 0.3*fbm(q*8.0) + (uCover-0.5)) * 0.75;
  float tex = texture2D(uClouds, vUv).r;
  float c = mix(proc, tex, uModern*0.85);
  float lit = smoothstep(-0.2, 0.4, dot(normalize(vWorldNormal), normalize(uSunDir)));
  vec3 col = mix(vec3(1.0), vec3(0.45,0.38,0.32), uDust) * (0.08 + 0.92*lit);
  gl_FragColor = vec4(col*c, c*0.85);
}`
