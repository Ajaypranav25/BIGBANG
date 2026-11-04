import type { Material } from 'three'
import { NOISE_GLSL } from '../../../shaders/noise'
import { surfaceUniforms } from './uniforms'

/**
 * Small composable shader patches injected into built-in (lit) materials via onBeforeCompile,
 * so we keep three's lighting, fog and tone mapping while animating geometry on the GPU.
 *
 * Patches must not redeclare `uTime` / `uLocal` / `instOrigin()` — the base header provides them.
 */
export interface ShaderPatch {
  readonly id: string
  readonly uniforms?: Record<string, { value: unknown }>
  /** after `#include <common>` in the vertex shader (declarations) */
  readonly vertexHead?: string
  /** after `#include <beginnormal_vertex>` — may modify `objectNormal` */
  readonly vertexNormal?: string
  /** after `#include <begin_vertex>` — may modify `transformed` (local space) */
  readonly vertexBegin?: string
  /** after `#include <fog_vertex>` — end of main(), `transformed` and `objectNormal` in scope */
  readonly vertexPost?: string
  readonly fragmentHead?: string
  /** after `#include <color_fragment>` — may modify `diffuseColor` */
  readonly fragmentColor?: string
  /** after `#include <emissivemap_fragment>` — may modify `totalEmissiveRadiance` */
  readonly fragmentEmissive?: string
}

const VERTEX_BASE = /* glsl */ `
uniform float uTime;
uniform float uLocal;
vec3 instOrigin() {
#ifdef USE_INSTANCING
  return (modelMatrix * instanceMatrix[3]).xyz;
#else
  return modelMatrix[3].xyz;
#endif
}
`

const FRAGMENT_BASE = /* glsl */ `
uniform float uTime;
`

export const GUARDED_NOISE = `#ifndef SURFACE_NOISE\n#define SURFACE_NOISE\n${NOISE_GLSL}\n#endif\n`

function after(src: string, chunk: string, code: string): string {
  const tag = `#include <${chunk}>`
  return src.includes(tag) ? src.replace(tag, `${tag}\n${code}\n`) : src
}

/** Concatenate one hook's code across patches, preserving patch order. */
const gather = (patches: readonly ShaderPatch[], pick: (p: ShaderPatch) => string | undefined): string =>
  patches
    .map(pick)
    .filter((s): s is string => Boolean(s))
    .join('\n')

export function patchMaterial<M extends Material>(material: M, patches: readonly ShaderPatch[]): M {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = surfaceUniforms.uTime
    shader.uniforms.uLocal = surfaceUniforms.uLocal
    for (const p of patches) if (p.uniforms) Object.assign(shader.uniforms, p.uniforms)

    let vs = after(shader.vertexShader, 'common', `${VERTEX_BASE}\n${gather(patches, (p) => p.vertexHead)}`)
    vs = after(vs, 'beginnormal_vertex', gather(patches, (p) => p.vertexNormal))
    vs = after(vs, 'begin_vertex', gather(patches, (p) => p.vertexBegin))
    vs = after(vs, 'fog_vertex', gather(patches, (p) => p.vertexPost))

    let fs = after(shader.fragmentShader, 'common', `${FRAGMENT_BASE}\n${gather(patches, (p) => p.fragmentHead)}`)
    fs = after(fs, 'color_fragment', gather(patches, (p) => p.fragmentColor))
    fs = after(fs, 'emissivemap_fragment', gather(patches, (p) => p.fragmentEmissive))

    shader.vertexShader = vs
    shader.fragmentShader = fs
  }
  const key = `surface:${patches.map((p) => p.id).join('|')}`
  material.customProgramCacheKey = () => key
  return material
}

/* ------------------------------------------------------------------ */
/* Patch library                                                        */
/* ------------------------------------------------------------------ */

/**
 * Instance appears/disappears with chapter progress.
 * Requires an instanced `aLife` vec2 attribute: (appearAt, vanishAt) in chapter-local 0…1.
 */
export const lifePatch: ShaderPatch = {
  id: 'life',
  vertexHead: 'attribute vec2 aLife;',
  vertexBegin: `transformed *= smoothstep(aLife.x, aLife.x + 0.05, uLocal) * (1.0 - smoothstep(aLife.y, aLife.y + 0.05, uLocal));`,
}

/** Wind / current sway that grows with height above the local origin. */
export function swayPatch(amplitude: number, frequency: number, height: number): ShaderPatch {
  return {
    id: 'sway',
    uniforms: {
      uSwayAmp: { value: amplitude },
      uSwayFreq: { value: frequency },
      uSwayInvH: { value: 1 / height },
    },
    vertexHead: 'uniform float uSwayAmp; uniform float uSwayFreq; uniform float uSwayInvH;',
    vertexBegin: /* glsl */ `{
      vec3 so = instOrigin();
      float sh = clamp(position.y * uSwayInvH, 0.0, 1.6);
      float sw = sh * sh;
      float sp = dot(so.xz, vec2(0.071, 0.093));
      float gust = 0.65 + 0.35 * sin(uTime * 0.27 + so.x * 0.015 + so.z * 0.011);
      transformed.x += (sin(uTime * uSwayFreq + sp) * 0.75 + sin(uTime * uSwayFreq * 2.7 + sp * 1.9) * 0.25) * uSwayAmp * sw * gust;
      transformed.z += cos(uTime * uSwayFreq * 0.83 + sp * 1.3) * uSwayAmp * 0.55 * sw * gust;
    }`,
  }
}

/**
 * Creatures that crawl or swim on circular paths around their instance origin, facing +Z
 * along the direction of travel, with a lateral body wave.
 * Requires an instanced `aMotion` vec4: (radius in local units, angular speed, phase, bob).
 */
export function wanderPatch(waveAmp: number, waveK: number, waveSpeed: number): ShaderPatch {
  const heading = /* glsl */ `
    float wAng = uTime * aMotion.y + aMotion.z;
    float wTh = aMotion.y >= 0.0 ? -wAng : 3.14159265 - wAng;
    float wC = cos(wTh);
    float wS = sin(wTh);`
  return {
    id: 'wander',
    uniforms: {
      uWaveAmp: { value: waveAmp },
      uWaveK: { value: waveK },
      uWaveSpeed: { value: waveSpeed },
    },
    vertexHead: 'attribute vec4 aMotion; uniform float uWaveAmp; uniform float uWaveK; uniform float uWaveSpeed;',
    vertexNormal: /* glsl */ `{
      ${heading}
      objectNormal = vec3(objectNormal.x * wC + objectNormal.z * wS, objectNormal.y, -objectNormal.x * wS + objectNormal.z * wC);
    }`,
    vertexBegin: /* glsl */ `{
      ${heading}
      float tail = clamp(-transformed.z, 0.0, 2.0);
      transformed.x += sin(transformed.z * uWaveK + uTime * uWaveSpeed + aMotion.z * 7.0) * uWaveAmp * (0.25 + tail);
      transformed = vec3(transformed.x * wC + transformed.z * wS, transformed.y, -transformed.x * wS + transformed.z * wC);
      transformed += vec3(cos(wAng) * aMotion.x, sin(uTime * 0.9 + aMotion.z * 3.0) * aMotion.w, sin(wAng) * aMotion.x);
    }`,
  }
}

/** Underwater caustics projected from above onto anything facing up. */
export function causticsPatch(strength: number, scale: number): ShaderPatch {
  return {
    id: 'caustics',
    uniforms: { uCausticStrength: { value: strength }, uCausticScale: { value: scale } },
    vertexHead: 'varying vec3 vCWorld; varying float vCUp;',
    vertexPost: /* glsl */ `{
      vec4 cw = vec4(transformed, 1.0);
      vec3 cn = objectNormal;
#ifdef USE_INSTANCING
      cw = instanceMatrix * cw;
      cn = mat3(instanceMatrix) * cn;
#endif
      vCWorld = (modelMatrix * cw).xyz;
      vCUp = normalize(mat3(modelMatrix) * cn).y;
    }`,
    fragmentHead: /* glsl */ `
      varying vec3 vCWorld; varying float vCUp;
      uniform float uCausticStrength; uniform float uCausticScale;
      ${GUARDED_NOISE}
      float causticPattern(vec2 p, float t) {
        float a = 1.0 - abs(snoise(vec3(p, t * 0.5)));
        float b = 1.0 - abs(snoise(vec3(p * 1.37 + 4.1, t * 0.43 + 7.0)));
        return pow(a, 7.0) * 0.9 + pow(b, 9.0) * 0.6 + pow(a * b, 4.0) * 0.8;
      }`,
    fragmentEmissive: /* glsl */ `{
      float cUp = clamp(vCUp * 0.8 + 0.25, 0.0, 1.0);
      float cDepth = clamp(1.0 - (12.0 - vCWorld.y) * 0.03, 0.35, 1.0);
      totalEmissiveRadiance += diffuseColor.rgb * uCausticStrength * causticPattern(vCWorld.xz * uCausticScale, uTime * 0.7) * cUp * cDepth;
    }`,
  }
}

/**
 * Procedural bark driven by a non-instanced `aPart` attribute:
 * 0 = lycopsid diamond leaf-cushions, 1 = foliage (untouched), 2 = vertical ribs with nodes, 3 = plain.
 */
export function barkPatch(scale: number): ShaderPatch {
  return {
    id: 'bark',
    uniforms: { uBarkScale: { value: scale } },
    vertexHead: 'attribute float aPart; varying vec2 vBarkUv; varying float vPart;',
    vertexBegin: 'vBarkUv = uv; vPart = aPart;',
    fragmentHead: 'varying vec2 vBarkUv; varying float vPart; uniform float uBarkScale;',
    fragmentColor: /* glsl */ `
      if (vPart < 0.5) {
        vec2 g = vBarkUv * uBarkScale;
        vec2 d = vec2(g.x + g.y, g.x - g.y);
        vec2 f = abs(fract(d) - 0.5);
        float groove = smoothstep(0.40, 0.5, max(f.x, f.y));
        float cushion = 1.0 - length(f) * 1.25;
        float scar = 1.0 - smoothstep(0.0, 0.06, length(f - vec2(0.0, 0.08)));
        diffuseColor.rgb *= (0.78 + 0.38 * cushion) * mix(1.0, 0.42, groove) * (1.0 - 0.35 * scar);
      } else if (vPart > 1.5 && vPart < 2.5) {
        float rib = abs(fract(vBarkUv.x * uBarkScale * 1.6) - 0.5) * 2.0;
        float node = smoothstep(0.92, 1.0, abs(fract(vBarkUv.y * uBarkScale * 0.25) - 0.5) * 2.0);
        diffuseColor.rgb *= (0.72 + 0.4 * smoothstep(0.0, 1.0, rib)) * (1.0 - 0.45 * node);
      }`,
  }
}
