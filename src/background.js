/* Prompt Guard — arka plan: kullanıcının eklediği özel alan adları için içerik betiğini kaydeder.
 * Chrome'da service worker, Firefox'ta event page olarak çalışır. */
(function () {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const SCRIPT_ID = 'pg-custom-domains';
  const FILES = ['src/engine.js', 'src/rules.js', 'src/storage.js', 'src/content.js'];

  async function syncCustomScripts() {
    try {
      const got = await api.storage.local.get('pg_settings');
      const domains = (got.pg_settings && got.pg_settings.customDomains) || [];
      const matches = [];
      for (const d of domains) {
        const origins = ['*://' + d + '/*', '*://*.' + d + '/*'];
        // İzni verilmemiş alan adlarını kaydetmeye çalışma.
        if (await api.permissions.contains({ origins })) matches.push(...origins);
      }
      const ids = [SCRIPT_ID, SCRIPT_ID + '-main'];
      const existing = await api.scripting.getRegisteredContentScripts({ ids });
      if (existing.length) await api.scripting.unregisterContentScripts({ ids: existing.map((x) => x.id) });
      if (matches.length) {
        await api.scripting.registerContentScripts([
          { id: SCRIPT_ID, matches, js: FILES, runAt: 'document_start', persistAcrossSessions: true },
          { id: SCRIPT_ID + '-main', matches, js: ['src/highlight-main.js'], runAt: 'document_start', world: 'MAIN', persistAcrossSessions: true }
        ]);
      }
    } catch (e) {
      console.warn('[Prompt Guard] özel alan adları kaydedilemedi:', e);
    }
  }

  api.runtime.onInstalled.addListener(syncCustomScripts);
  api.runtime.onStartup.addListener(syncCustomScripts);
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.pg_settings) {
      const a = JSON.stringify((changes.pg_settings.oldValue || {}).customDomains || []);
      const b = JSON.stringify((changes.pg_settings.newValue || {}).customDomains || []);
      if (a !== b) syncCustomScripts();
    }
  });
  api.permissions.onAdded.addListener(syncCustomScripts);
  api.permissions.onRemoved.addListener(syncCustomScripts);
})();
