/* Prompt Guard — açılır pencere */
(async function () {
  'use strict';
  try {
    const t = localStorage.getItem('pg_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* yok say */ }
  const Store = globalThis.PGStore, api = Store.api;
  const $ = (s) => document.querySelector(s);
  const data = await Store.load();
  const settings = data.settings;

  async function renderSite() {
    let url = null;
    try {
      const tabs = await api.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].url) url = new URL(tabs[0].url);
    } catch (e) { /* erişim yok */ }
    const p = url ? Store.providerFor(url, settings) : null;
    const modes = { warn: 'Uyar', block: 'Engelle', monitor: 'Yalnızca izle' };
    $('#site').classList.toggle('on', !!p && settings.enabled);
    if (!settings.enabled) { $('#siteTitle').textContent = 'Koruma kapalı'; $('#siteSub').textContent = 'Hiçbir sitede tarama yapılmıyor.'; }
    else if (p) { $('#siteTitle').textContent = p.name + ' korunuyor'; $('#siteSub').textContent = 'Mod: ' + modes[settings.mode] + ' · ' + data.rules.filter((r) => r.enabled).length + ' kural etkin'; }
    else { $('#siteTitle').textContent = 'Bu site izlenmiyor'; $('#siteSub').textContent = 'Eklemek için Ayarlar > Sağlayıcılar.'; }
  }

  $('#enabled').checked = settings.enabled;
  $('#enabled').addEventListener('change', async (e) => { settings.enabled = e.target.checked; await Store.saveSettings(settings); renderSite(); });
  $('#sDetected').textContent = data.stats.detected;
  $('#sMasked').textContent = data.stats.masked;
  $('#sBypassed').textContent = data.stats.bypassed;
  $('#openOptions').addEventListener('click', () => { api.runtime.openOptionsPage(); window.close(); });
  renderSite();
})();
