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
    'identity',
  ],
  host_permissions: [
    'https://generativelanguage.googleapis.com/*',
    'https://gmail.googleapis.com/*',
    'https://www.googleapis.com/*',
  ],
  oauth2: {
    client_id: '439773286903-pjobseekassistantclient.apps.googleusercontent.com',
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.send',
    ],
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
})
