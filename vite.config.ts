import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) requires the function form
        manualChunks(id: string) {
          if (/node_modules[\\/]three[\\/]/.test(id)) return 'three'
          if (/node_modules[\\/](@react-three|postprocessing|three-stdlib)[\\/]/.test(id)) return 'r3f'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { include: ['src/time/**', 'src/data/**', 'src/lib/**'], reporter: ['text'] },
  },
})
