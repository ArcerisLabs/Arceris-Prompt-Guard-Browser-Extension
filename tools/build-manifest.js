/* manifest.json'u sağlayıcı listesinden üretir: node tools/build-manifest.js */
const fs = require('fs'), path = require('path');
globalThis.chrome = { storage: {} };
require('../src/engine.js'); require('../src/rules.js'); require('../src/storage.js');
const matches = [];
for (const p of globalThis.PGStore.PROVIDERS) {
  for (const h of p.hosts) {
    if (p.path) matches.push(`*://${h}${p.path}*`);
    else matches.push(`*://${h}/*`, `*://*.${h}/*`);
  }
}
const manifest = {
  manifest_version: 3,
  name: '__MSG_extName__',
  short_name: '__MSG_extShortName__',
  default_locale: 'en',
  homepage_url: 'https://arceris.ai/',
  version: '1.3.0',
  description: '__MSG_extDesc__',
  icons: { 16: 'icons/icon16.png', 32: 'icons/icon32.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' },
  action: { default_popup: 'src/popup.html', default_title: 'Arceris Prompt Guard', default_icon: { 16: 'icons/icon16.png', 32: 'icons/icon32.png' } },
  options_ui: { page: 'src/options.html', open_in_tab: true },
  background: { service_worker: 'src/background.js', scripts: ['src/background.js'] },
  permissions: ['storage', 'scripting'],
  host_permissions: matches,
  optional_host_permissions: ['*://*/*'],
  content_scripts: [
    { matches, js: ['src/engine.js', 'src/rules.js', 'src/storage.js', 'src/content.js'], run_at: 'document_start' },
    { matches, js: ['src/highlight-main.js'], run_at: 'document_start', world: 'MAIN' }
  ],
  minimum_chrome_version: '121',
  browser_specific_settings: {
    gecko: { id: 'prompt-guard@arceris.ai', strict_min_version: '128.0', data_collection_permissions: { required: ['none'] } }
  }
};
fs.writeFileSync(path.join(__dirname, '../manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest.json yazıldı:', matches.length, 'eşleşme deseni');
