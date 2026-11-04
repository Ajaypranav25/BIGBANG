import type { Biome } from '../../data/chapters'
import { CoalForest } from './biomes/CoalForest'
import { Mesozoic } from './biomes/Mesozoic'
import { PaleozoicSea } from './biomes/PaleozoicSea'
import { Savanna } from './biomes/Savanna'
import { useSurfaceClock } from './shared/uniforms'

/**
 * Ground-level dioramas for the life chapters. Mounted by the Director inside the <Canvas>
 * (keyed by biome). Each biome owns its sky, fog, lights and camera path, and drives `rig`.
 */
export function SurfaceScene({ biome }: { biome: Biome }) {
  useSurfaceClock()
  switch (biome) {
    case 'paleozoic-sea':
      return <PaleozoicSea />
    case 'coal-forest':
      return <CoalForest />
    case 'mesozoic':
      return <Mesozoic />
    case 'savanna':
      return <Savanna />
  }
}
