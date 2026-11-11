/* Prompt Guard — sağlayıcı listesi ve ayar deposu (storage.local). */
(function (root) {
  'use strict';
  const api = root.browser || root.chrome;

  // path verilirse yalnızca o yol önekinde etkin olur.
  const PROVIDERS = [
    { id: 'chatgpt', name: 'ChatGPT', hosts: ['chatgpt.com', 'chat.openai.com'] },
    { id: 'openai_platform', name: 'OpenAI Platform', hosts: ['platform.openai.com'] },
    { id: 'claude', name: 'Claude', hosts: ['claude.ai'] },
    { id: 'claude_console', name: 'Claude Console', hosts: ['console.anthropic.com', 'platform.claude.com'] },
    { id: 'gemini', name: 'Gemini', hosts: ['gemini.google.com'] },
    { id: 'aistudio', name: 'Google AI Studio', hosts: ['aistudio.google.com'] },
    { id: 'notebooklm', name: 'NotebookLM', hosts: ['notebooklm.google.com'] },
    { id: 'copilot', name: 'Microsoft Copilot', hosts: ['copilot.microsoft.com', 'm365.cloud.microsoft'] },
    { id: 'github_copilot', name: 'GitHub Copilot Chat', hosts: ['github.com'], path: '/copilot' },
    { id: 'perplexity', name: 'Perplexity', hosts: ['perplexity.ai'] },
    { id: 'deepseek', name: 'DeepSeek', hosts: ['chat.deepseek.com'] },
    { id: 'grok', name: 'Grok', hosts: ['grok.com'] },
    { id: 'mistral', name: 'Mistral Le Chat', hosts: ['chat.mistral.ai'] },
    { id: 'meta', name: 'Meta AI', hosts: ['meta.ai'] },
    { id: 'poe', name: 'Poe', hosts: ['poe.com'] },
    { id: 'huggingchat', name: 'HuggingChat', hosts: ['huggingface.co'], path: '/chat' },
    { id: 'you', name: 'You.com', hosts: ['you.com'] },
    { id: 'phind', name: 'Phind', hosts: ['phind.com'] },
    { id: 'qwen', name: 'Qwen', hosts: ['chat.qwen.ai'] },
    { id: 'kimi', name: 'Kimi', hosts: ['kimi.com', 'kimi.moonshot.cn'] },
    { id: 'doubao', name: 'Doubao', hosts: ['doubao.com'] },
    { id: 'zai', name: 'Z.ai', hosts: ['chat.z.ai'] },
    { id: 'groq', name: 'Groq', hosts: ['chat.groq.com', 'console.groq.com'] },
    { id: 'openrouter', name: 'OpenRouter', hosts: ['openrouter.ai'] },
    { id: 'cohere', name: 'Cohere', hosts: ['coral.cohere.com', 'dashboard.cohere.com'] },
    { id: 'pi', name: 'Pi', hosts: ['pi.ai'] },
    { id: 'characterai', name: 'Character.AI', hosts: ['character.ai'] },
    { id: 'duckai', name: 'Duck.ai', hosts: ['duck.ai'] },
    { id: 'lmarena', name: 'LMArena', hosts: ['lmarena.ai'] },
    { id: 'manus', name: 'Manus', hosts: ['manus.im'] },
    { id: 'genspark', name: 'Genspark', hosts: ['genspark.ai'] },
    { id: 'venice', name: 'Venice', hosts: ['venice.ai'] }
  ];

  const DEFAULT_SETTINGS = {
    enabled: true,
    mode: 'warn',            // warn | block | monitor
    minSeverity: 'low',      // low | medium | high
    liveBadge: true,
    maskStyle: 'scramble',   // scramble: ortayı rastgele değiştir | label: [ETİKET] yaz
    keepStart: 2,            // korunacak baştaki karakter sayısı
    keepEnd: 3,              // korunacak sondaki karakter sayısı
    restoreResponses: false, // sayfadaki cevaplarda rastgele değeri orijinaline çevir (yalnızca bellekte)
    allowlist: [],           // yok sayılacak değerler
    extraSendSelectors: '',  // satır başına bir CSS seçici
    disabledProviders: [],
    customDomains: [],
    deletedBuiltins: []
  };

  const K = { settings: 'pg_settings', rules: 'pg_rules', stats: 'pg_stats' };
  const clone = (x) => JSON.parse(JSON.stringify(x));

  function mergeRules(stored, deleted) {
    const defaults = clone(root.PG.DEFAULT_RULES);
    if (!Array.isArray(stored)) return defaults;
    const have = new Set(stored.map((r) => r.id));
    const gone = new Set(deleted || []);
    // Yeni sürümle gelen yerleşik kurallar eklenir; kullanıcının düzenledikleri korunur.
    return stored.concat(defaults.filter((r) => !have.has(r.id) && !gone.has(r.id)));
  }

  async function load() {
    const got = await api.storage.local.get([K.settings, K.rules, K.stats]);
    const settings = Object.assign(clone(DEFAULT_SETTINGS), got[K.settings] || {});
    const rules = mergeRules(got[K.rules], settings.deletedBuiltins);
    const stats = Object.assign({ detected: 0, masked: 0, bypassed: 0, blocked: 0 }, got[K.stats] || {});
    return { settings, rules, stats };
  }
  const saveSettings = (s) => api.storage.local.set({ [K.settings]: s });
  const saveRules = (r) => api.storage.local.set({ [K.rules]: r });
  const resetStats = () => api.storage.local.set({ [K.stats]: { detected: 0, masked: 0, bypassed: 0, blocked: 0 } });

  async function bump(key, n) {
    try {
      const got = await api.storage.local.get(K.stats);
      const st = Object.assign({ detected: 0, masked: 0, bypassed: 0, blocked: 0 }, got[K.stats] || {});
      st[key] = (st[key] || 0) + (n || 1);
      await api.storage.local.set({ [K.stats]: st });
    } catch (e) { /* uzantı yeniden yüklendiyse sessizce geç */ }
  }

  function onChange(cb) {
    api.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes[K.settings] || changes[K.rules])) cb();
    });
  }

  function hostMatches(host, domain) {
    host = String(host || '').toLowerCase(); domain = String(domain || '').toLowerCase();
    return host === domain || host.endsWith('.' + domain);
  }

  /** Verilen konum için etkin sağlayıcıyı döndürür (yoksa null). */
  function providerFor(loc, settings) {
    for (const p of PROVIDERS) {
      if (settings.disabledProviders.includes(p.id)) continue;
      if (!p.hosts.some((h) => hostMatches(loc.hostname, h))) continue;
      if (p.path && !loc.pathname.startsWith(p.path)) continue;
      return p;
    }
    for (const d of settings.customDomains || []) {
      if (hostMatches(loc.hostname, d)) return { id: 'custom:' + d, name: d, hosts: [d], custom: true };
    }
    return null;
  }

  function normalizeDomain(input) {
    let d = String(input || '').trim().toLowerCase();
    d = d.replace(/^[a-z]+:\/\//, '').replace(/^\*\./, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '');
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) || d === 'localhost' ? d : '';
  }
  const originPatterns = (d) => ['*://' + d + '/*', '*://*.' + d + '/*'];

  root.PGStore = {
    api, PROVIDERS, DEFAULT_SETTINGS, KEYS: K, load, saveSettings, saveRules, resetStats, bump,
    onChange, providerFor, hostMatches, normalizeDomain, originPatterns, clone
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
