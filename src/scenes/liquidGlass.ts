import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform, Vector2, Vector4 } from 'three'

/** How many glass shapes the shader can lens at once. */
export const MAX_GLASS = 24

/**
 * Real liquid glass, rendered in the WebGL pipeline instead of with CSS blur.
 *
 * Each glass element on the page is described by its on-screen rounded rectangle. Inside a shape:
 *  - near the rim, the scene is refracted outward-in, as through the curved bezel of a thick glass
 *    slab: light from just beyond the edge bends into view, stretched along the rim
 *  - colour separates slightly where the bending is strongest (chromatic dispersion)
 *  - the middle stays crisp, with a touch of magnification (no blur anywhere)
 *  - a thin specular rim catches a light from the upper left, with a fainter back-light opposite
 * Coordinates are CSS pixels with y down, matching getBoundingClientRect().
 */
const fragment = /* glsl */ `
#define MAX_GLASS ${MAX_GLASS}
uniform vec4 uRects[MAX_GLASS];   // x, y (top-left), width, height — CSS px
uniform vec4 uShape[MAX_GLASS];   // corner radius, refraction px, bezel width px, legibility tint
uniform int uCount;
uniform vec2 uViewport;
uniform float uTime;

// signed distance + outward gradient of a rounded box (Inigo Quilez)
vec3 sdgRoundBox(vec2 p, vec2 b, float r) {
  vec2 w = abs(p) - (b - r);
  float g = max(w.x, w.y);
  vec2 q = max(w, 0.0);
  float l = length(q);
  vec2 grad = sign(p) * ((g > 0.0) ? q / max(l, 1e-5) : ((w.x > w.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0)));
  return vec3((g > 0.0) ? l - r : g - r, grad);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uCount == 0) { outputColor = inputColor; return; }
  vec2 px = vec2(uv.x * uViewport.x, (1.0 - uv.y) * uViewport.y);
  vec2 offset = vec2(0.0);
  float bend = 0.0;
  float tint = 0.0;
  float rim = 0.0;
  float glow = 0.0;
  vec2 light = normalize(vec2(-0.55, -0.85));
  // a slow sweep keeps the highlight alive, like light moving across real glass
  vec2 sweep = normalize(vec2(cos(uTime * 0.35), sin(uTime * 0.35)));

  for (int i = 0; i < MAX_GLASS; i++) {
    if (i >= uCount) break;
    vec4 R = uRects[i];
    vec4 S = uShape[i];
    vec2 halfSize = R.zw * 0.5;
    vec2 centre = R.xy + halfSize;
    float radius = min(S.x, min(halfSize.x, halfSize.y));
    vec3 dg = sdgRoundBox(px - centre, halfSize, radius);
    float d = dg.x;
    if (d > 2.0) continue;
    vec2 n = dg.yz;

    if (d < 0.0) {
      float t = clamp(-d / S.z, 0.0, 1.0);
      float k = pow(1.0 - t, 2.4);                 // strongest right at the rim
      offset += n * S.y * k;                        // sample from beyond the edge
      offset += (centre - px) * 0.018 * (1.0 - k);  // gentle magnification in the clear middle
      bend = max(bend, k);
      tint = max(tint, S.w);
      glow += 0.05 * k * k;
    }
    float band = exp(-(d * d) / 1.3);
    float key = max(dot(n, light), 0.0);
    float back = max(dot(n, -light), 0.0);
    float moving = 0.25 * pow(max(dot(n, sweep), 0.0), 6.0);
    rim = max(rim, band * (0.22 + 0.78 * key + 0.35 * back + moving));
  }

  vec3 col = inputColor.rgb;
  if (bend > 0.0 || tint > 0.0) {
    vec2 o = vec2(offset.x, -offset.y) / uViewport;
    float dispersion = 0.09 * bend;
    col.r = texture2D(inputBuffer, uv + o * (1.0 + dispersion)).r;
    col.g = texture2D(inputBuffer, uv + o).g;
    col.b = texture2D(inputBuffer, uv + o * (1.0 - dispersion)).b;
    col *= 1.0 - tint;
  }
  col += vec3(glow);
  col += vec3(0.95, 0.97, 1.0) * rim * 0.6;
  outputColor = vec4(col, inputColor.a);
}
`

export class LiquidGlassEffect extends Effect {
  constructor() {
    super('LiquidGlassEffect', fragment, {
      blendFunction: BlendFunction.SRC,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uRects', new Uniform(Array.from({ length: MAX_GLASS }, () => new Vector4()))],
        ['uShape', new Uniform(Array.from({ length: MAX_GLASS }, () => new Vector4()))],
        ['uCount', new Uniform(0)],
        ['uViewport', new Uniform(new Vector2(1, 1))],
        ['uTime', new Uniform(0)],
      ]),
    })
  }
}

/** Glass tiers, matching the landing page's CSS classes. */
const TIERS = {
  // tint darkens what is seen through the glass a little, so text on it stays legible
  'liquid-glass': { refraction: 16, bezel: 18, tint: 0.3 },
  'liquid-glass-strong': { refraction: 30, bezel: 30, tint: 0.28 },
} as const

const radiusCache = new WeakMap<Element, number>()

/**
 * Read every visible glass element's rounded rectangle into the effect's uniforms.
 * Runs every frame so hover scaling and layout changes are tracked exactly.
 */
export function syncGlass(effect: LiquidGlassEffect, width: number, height: number, time: number): void {
  const u = effect.uniforms
  ;(u.get('uViewport')!.value as Vector2).set(width, height)
  u.get('uTime')!.value = time
  const rects = u.get('uRects')!.value as Vector4[]
  const shapes = u.get('uShape')!.value as Vector4[]
  const nodes = document.querySelectorAll<HTMLElement>('.liquid-glass, .liquid-glass-strong')
  let n = 0
  for (const el of nodes) {
    if (n >= MAX_GLASS) break
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > height) continue
    let radius = radiusCache.get(el)
    if (radius === undefined) {
      radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
      radiusCache.set(el, radius)
    }
    const tier = el.classList.contains('liquid-glass-strong') ? TIERS['liquid-glass-strong'] : TIERS['liquid-glass']
    const bezel = Math.min(tier.bezel, r.width / 2, r.height / 2)
    rects[n].set(r.left, r.top, r.width, r.height)
    shapes[n].set(Math.min(radius, r.width / 2, r.height / 2), tier.refraction * (bezel / tier.bezel), bezel, tier.tint)
    n++
  }
  u.get('uCount')!.value = n
}
