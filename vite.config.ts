import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const firestorePkg = path.dirname(require.resolve('@firebase/firestore/package.json'))
const firestoreEsm = path.join(firestorePkg, 'dist', 'index.esm2017.js')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    conditions: ['import', 'module', 'browser', 'default'],
    alias: [
      { find: '@firebase/firestore', replacement: firestoreEsm },
    ],
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/firestore', '@cesium/engine'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
  },
})