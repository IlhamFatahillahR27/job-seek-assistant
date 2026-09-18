import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Job Seek Assistant',
  version: pkg.version,
  description: 'AI-Powered Job Application Assistant with CV Grounding and Gmail Integration',
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
    default_title: 'Buka Job Seek Assistant',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [{
    js: ['src/content/main.ts'],
    matches: ['https://*/*'],
  }],
  permissions: [
    'sidePanel',
    'storage',
    'activeTab',
  ],
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
})
