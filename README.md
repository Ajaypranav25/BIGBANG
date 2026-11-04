# Origins: from the Big Bang to 2026

A cinematic, interactive 3D journey through 13.787 billion years. Scroll (or swipe, or press ← →) and the camera
travels through the first instant of the universe, the cosmic web, the birth of the Milky Way and the Sun, a molten
Earth, drifting continents, the history of life, the dinosaurs, our ancestors and human history, ending in 2026.
Everything is driven by real data.

## Run

```bash
bun install          # npm install also works
bun run dev          # http://localhost:5173
bun run test         # unit tests (time mapping, physics/climate models, choreography)
bun run build        # production build in dist/
```

Asset pipelines (outputs are committed, so you only need these to regenerate):

```bash
bun run fetch:paleo      # GPlates plate reconstructions → public/textures/paleo-atlas.jpg
bun run fetch:textures   # planet/Sun/Moon/Milky Way textures → public/textures/
```

## Controls

| Action | Mouse / keyboard | Touch |
|---|---|---|
| Travel through time | Scroll, ↑ ↓, Page Up/Down, or drag the dial | Vertical swipe |
| Jump chapters | ← → | Chapters sheet |
| Look around (full 360° in every scene) | Drag | Horizontal drag, then any direction |
| Zoom | Ctrl + scroll, + / − | Pinch |
| Reset the view | Double-click or R | Reset button in the top bar |

Space scenes orbit their subject, the Earth chapters orbit the planet while keeping the shot's framing, and the landscapes turn the view around where you stand.

## How it works

| Layer | Where | Notes |
|---|---|---|
| Time | `src/time/` | Scroll progress maps to time with a per-chapter scale (`linear`, `log` years ago, or `tau` = log time since the Big Bang). A mutable frame clock eases toward the target; React only re-renders on chapter changes. |
| Chapters | `src/data/chapters.ts` | 19 chapters. Each picks a scene (`cosmos`, `solar`, `earth`, `surface`) and gets a share of the scroll track. |
| Cosmos | `src/scenes/cosmos/` | Up to 200k GPU particles that morph from singularity → inflation → quark–gluon plasma → CMB → dark ages → cosmic web → first stars → reionization → a barred spiral galaxy, with the Gaia–Enceladus merger. |
| Solar | `src/scenes/solar/` | Molecular-cloud collapse, a supernova trigger, a protoplanetary disk with ring gaps, T Tauri jets, and planets on real orbits (Kepler speeds). |
| Earth | `src/scenes/earth/` | One globe shader: magma ocean, proto-cratons, GPlates continents (0–1000 Ma), ice ages, vegetation, the Theia and Chicxulub impacts, the Siberian and Deccan traps, migration routes, cities lighting up, and satellites. |
| Surface | `src/scenes/surface/` | Dioramas for Cambrian seas, Carboniferous coal forests, the Mesozoic and the Pliocene savanna. |
| UI | `src/ui/` | Chapter cards, event feed, live instrument readouts, and a scrubbable dial with ICS period colours. |

## Data sources

- **Cosmology:** Planck 2018 VI. The universe's temperature, scale factor and redshift come from integrating the Friedmann equation (radiation + matter + Λ).
- **Plate tectonics:** GPlates Web Service, model MERDITH2021 (Merdith et al. 2021, *Earth-Science Reviews* 214). Paleo-positions of Chicxulub, the Deccan Traps and the Siberian Traps are reconstructed from the same model.
- **Geologic time:** ICS International Chronostratigraphic Chart.
- **Climate and atmosphere:** Foster, Royer & Lunt 2017 (CO₂); EPICA/Vostok ice cores; NOAA/Scripps Mauna Loa; Berner (GEOCARBSULF); Lyons et al. 2014 (O₂).
- **Earth–Moon system:** Williams 2000; Mitchell & Kirscher 2023; Eulenfeld & Heubeck 2023; lunar laser ranging.
- **Sun:** Gough 1981 luminosity evolution; CAI age from Connelly et al. 2012.
- **Human dispersal:** see `src/scenes/earth/migrations.ts` for site-level citations.
- **Population:** HYDE 3.2; UN World Population Prospects 2024.
- **Events and settlements:** every entry in `src/data/events.ts` and `src/data/settlements.ts` carries its own citation.

## Design system

The interface uses the Queue-Management design system: `src/design/app.css` is a verbatim copy, and the icons and theme logic are ported to TypeScript in `src/design/`. It follows the system light/dark setting, with a toggle in the top bar. `src/styles.css` only positions the floating chrome over the 3D stage, using the system's tokens.

The landing page (`src/ui/Landing.tsx`, `src/ui/landing.css`) is a deliberate exception. It uses a grayscale liquid-glass hero (Poppins with Source Serif 4 italics, lucide icons) floating over the live 3D scene, which plays as an attract loop of the slowly orbiting young Milky Way.

## Assets and credits

- Planet, Sun, Moon and Milky Way textures: [Solar System Scope](https://www.solarsystemscope.com/textures/), CC BY 4.0, based on NASA imagery.
- Creature models (`src/assets/models/*.glb`): built for this project in Blender 5.2 from scripted metaball skeletons with keyframed gait cycles. The helpers are in `assets/blender/`.
- Everything else is procedural GLSL.
