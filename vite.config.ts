import fs from 'node:fs'
import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.ts'
import pkg from './package.json' with { type: 'json' }

const { name, version } = pkg

// Ensure PDF.js worker is present in public/assets
function ensurePdfWorkerPlugin(): Plugin {
  return {
    name: 'ensure-pdf-worker',
    buildStart() {
      const targetDir = path.resolve(import.meta.dirname, 'public/assets')
      const targetFile = path.join(targetDir, 'pdf.worker.mjs')
      const sourceFile = path.resolve(import.meta.dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')

      if (!fs.existsSync(targetFile) && fs.existsSync(sourceFile)) {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true })
        }
        fs.copyFileSync(sourceFile, targetFile)
      }
    },
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  plugins: [
    ensurePdfWorkerPlugin(),
    vue(),
    crx({ manifest }),
    zip({ outDir: 'release', outFileName: `crx-${name}-${version}.zip` }),
  ],
  server: {
    cors: {
      origin: [
        /chrome-extension:\/\//,
      ],
    },
  },
})
