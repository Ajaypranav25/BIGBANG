/**
 * Optional hand-made / Blender-prepared creature models.
 *
 * Drop GLB files into `src/assets/models/` using the file names below. They are discovered at
 * build time (Vite `import.meta.glob`), hashed and bundled — so a missing file simply means the
 * procedural stand-in is used, with no runtime 404s or console noise.
 *
 * Conventions for every GLB:
 *  - Y up, creature faces +Z, glTF metres.
 *  - Scale and origin do not need to be exact: on load the model is uniformly rescaled so its
 *    `measure` extent equals `meters`, then re-centred with the feet at y = 0 and the body centred on X/Z.
 *  - Animation: a clip whose name matches /walk|run|fly|swim/i is preferred, otherwise the first clip.
 *  - Callers must NOT scale the <Creature> itself to fit a species — the GLB is already normalised to
 *    `meters`. Scale only the procedural fallback, or wrap the Creature for deliberate size variants
 *    (e.g. hominin × 1.7/1.35 for Homo erectus).
 *  - Draco / meshopt compression are fine (drei's useGLTF handles both).
 */

export type ModelKey = 'sauropod' | 'trex' | 'triceratops' | 'pterosaur' | 'stegosaurus' | 'raptor' | 'hominin'

export interface ModelSpec {
  readonly file: string
  /** which bounding-box extent `meters` describes: length = Z, span = X, height = Y */
  readonly measure: 'length' | 'span' | 'height'
  readonly meters: number
}

export const MODEL_SPECS: Readonly<Record<ModelKey, ModelSpec>> = {
  /** generic diplodocid / brachiosaurid / titanosaur */
  sauropod: { file: 'sauropod.glb', measure: 'length', meters: 24 },
  /** Tyrannosaurus rex, ~12.3 m (Hutchinson et al. 2011) */
  trex: { file: 'trex.glb', measure: 'length', meters: 12.3 },
  /** Triceratops horridus, ~8–9 m */
  triceratops: { file: 'triceratops.glb', measure: 'length', meters: 8.5 },
  /** Pteranodon-like, wingspan ~6 m */
  pterosaur: { file: 'pterosaur.glb', measure: 'span', meters: 6 },
  /** Stegosaurus stenops, ~7–9 m */
  stegosaurus: { file: 'stegosaurus.glb', measure: 'length', meters: 8 },
  /** dromaeosaurid, Deinonychus-sized (~3.3 m) */
  raptor: { file: 'raptor.glb', measure: 'length', meters: 3.3 },
  /** Australopithecus afarensis ~1.1–1.5 m; the same model is scaled up for Homo erectus */
  hominin: { file: 'hominin.glb', measure: 'height', meters: 1.35 },
}

const FOUND = import.meta.glob('../../assets/models/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** URL of the bundled GLB for `key`, or null when none was provided. */
export function modelUrl(key: ModelKey): string | null {
  const file = MODEL_SPECS[key].file
  for (const [path, url] of Object.entries(FOUND)) {
    if (path.endsWith(`/${file}`)) return url
  }
  return null
}
