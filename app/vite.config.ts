import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const BUILT = new Date().toISOString()
/** The version in src/version.ts, so the built site can say which one it is. */
const VERSION = /APP_VERSION = '([^']+)'/.exec(readFileSync(new URL('./src/version.ts', import.meta.url), 'utf8'))?.[1]

export default defineConfig({
  plugins: [
    react(),
    {
      // version.json: an open app asks it whether a newer version is out (hooks/use-update-check.ts)
      name: 'playbook-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: VERSION, built: BUILT }) })
      },
    },
  ],
  base: '/gm-setlist/',
  define: {
    __BUILD_TIME__: JSON.stringify(BUILT),
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
  },
})
