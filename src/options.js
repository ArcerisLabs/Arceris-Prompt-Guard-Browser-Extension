/* Prompt Guard — ayarlar sayfası */
(function () {
  'use strict';
  const PG = globalThis.PG, Store = globalThis.PGStore, api = Store.api;
  const $ = (s) => document.querySelector(s);
  const CAT_LABEL = { PII: 'PII', PHI: 'PHI', PCI: 'PCI', CUSTOM: 'Özel' };
  const CAT_BADGE = { PII: 'badge-info', PHI: 'badge-teal', PCI: 'badge-audit', CUSTOM: 'badge-neutral' };
  const SEV_LABEL = { low: 'Düşük', medium: 'Orta', high: 'Yüksek' };
  const SEV_BADGE = { low: 'badge-neutral', medium: 'badge-warning', high: 'badge-error' };
  const VIEWS = {
    rules: { group: 'Güvenlik', page: 'PII Kuralları' },
    providers: { group: 'Erişim', page: 'Sağlayıcılar' },
    general: { group: 'Sistem', page: 'Ayarlar' }
  };
  const SITE = 'https://arceris.ai/';
  const siteLink = (campaign) => SITE + '?utm_source=prompt-guard&utm_medium=browser-extension&utm_campaign=' + encodeURIComponent(campaign);
  // Arceris platformunda bulunan, bu eklentide olmayan özellikler (yalnızca tanıtım).
  const FEATURES = [
    { id: 'dlp', icon: 'shield', title: 'DLP Kuralları',
      desc: 'Veri kaybı önleme kurallarını tek merkezden tanımlayın; tüm ekipte aynı politika uygulansın.',
      points: ['Kurallar merkezi olarak yönetilir, kullanıcı tarafında değiştirilemez', 'Engelle, maskele, sil veya yalnızca kaydet eylemleri', 'Kural grupları ve modele göre kapsam'],
      gap: 'Eklentide kurallar her tarayıcıda ayrı tutulur ve kullanıcı tarafından kapatılabilir.' },
    { id: 'files', icon: 'science', title: 'Dosya ve Görsel Tarama',
      desc: 'AI araçlarına yüklenen dosyaları ve görselleri de denetleyin.',
      points: ['Görsellerde metin tanıma (OCR) ile hassas veri taraması', 'Dosya türüne (MIME) göre izin verme veya engelleme', 'Dosya üst verisi kuralları'],
      gap: 'Eklenti yalnızca yazılan veya yapıştırılan metni tarar; dosya ve görselleri taramaz.' },
    { id: 'shadow-ai', icon: 'hub', title: 'Shadow AI',
      desc: 'Kurumunuzda hangi AI araçlarının kullanıldığını görün.',
      points: ['Onaylanmamış AI araçlarının keşfi', 'AI varlık envanteri', 'Sağlayıcı ve model bazında görünürlük'],
      gap: 'Eklenti yalnızca listesindeki sitelerde çalışır; başka araçların kullanımını göstermez.' },
    { id: 'audit', icon: 'info', title: 'Denetim ve Raporlar',
      desc: 'Kim, hangi araca, ne zaman, ne tür veri göndermeye çalıştı; kayıt altında.',
      points: ['Denetim kayıtları', 'Kullanım analizleri ve raporlar', 'Onay akışları'],
      gap: 'Eklenti yalnızca bu tarayıcıdaki dört sayacı tutar; kayıt veya rapor üretmez.' },
    { id: 'access', icon: 'settings', title: 'Erişim Yönetimi',
      desc: 'Kimin hangi modeli, hangi sınırlarla kullanacağını belirleyin.',
      points: ['Kullanıcı, cihaz ve kimlik yönetimi', 'Model kuralları ve maliyet limitleri', 'Sistem promptları ve yol filtreleri'],
      gap: 'Eklentide kullanıcı veya ekip kavramı yoktur; ayarlar yalnızca bu tarayıcı içindir.' }
  ];
  const PAGE_SIZE = 12;
  const SAMPLE = 'Müşteri Ad Soyad: Ayşe Yılmaz, TC 10000000146, tel 0532 123 45 67.\n' +
    'Kart 4111 1111 1111 1111 SKT: 09/27 CVV: 123\nIBAN TR33 0006 1005 1978 6457 8413 26\n' +
    'E-posta ayse.yilmaz@ornek.com — Hasta no: H-45821, Tanı kodu: E11.9, Doğum tarihi: 12.05.1985';

  let settings, rules, stats;
  let filterCat = '', filterQ = '', editingId = null, page = 0;

  /* ───────── tema ───────── */
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); }
  let theme = 'light';
  try { theme = localStorage.getItem('pg_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) { /* yok say */ }
  applyTheme(theme);

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'ic'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(NS, 'use'); use.setAttribute('href', '#i-' + name);
    svg.append(use); return svg;
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }
  async function saveSettings(msg) { await Store.saveSettings(settings); renderSummary(); toast(msg || 'Kaydedildi'); }
  async function saveRules(msg) { await Store.saveRules(rules); renderSummary(); toast(msg || 'Kaydedildi'); }
  function ruleError(r) {
    try { PG.buildRegex(r.pattern, r.flags); return ''; } catch (e) { return String(e.message || e); }
  }

  /* ───────── üst bilgi ───────── */
  function renderSummary() {
    const on = rules.filter((r) => r.enabled).length;
    $('#summary').textContent = on + ' / ' + rules.length + ' kural etkin · ' +
      (Store.PROVIDERS.length - settings.disabledProviders.length + settings.customDomains.length) + ' site korunuyor';
    $('#enabled').checked = settings.enabled;
    $('#enabledLabel').textContent = settings.enabled ? 'Koruma açık' : 'Koruma kapalı';
  }

  /* ───────── gezinme ───────── */
  function renderFeature(f) {
    $('#fTitle').textContent = f.title; $('#fDesc').textContent = f.desc; $('#fGap').textContent = f.gap;
    $('#fCta').href = siteLink(f.id);
    const ul = $('#fList'); ul.textContent = '';
    f.points.forEach((p) => { const li = el('li'); li.append(icon('check'), el('span', null, p)); ul.append(li); });
  }
  function showTab(name) {
    const feat = FEATURES.find((f) => 'f-' + f.id === name);
    const view = feat ? 'feature' : (name === 'test' ? 'rules' : name);
    const navKey = feat ? name : view;
    document.querySelectorAll('.nav-item').forEach((b) => { if (b.dataset.tab === navKey) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    ['rules', 'providers', 'general', 'feature'].forEach((v) => { $('#view-' + v).hidden = v !== view; });
    $('#crumbGroup').textContent = feat ? 'Arceris Platform' : VIEWS[view].group;
    $('#crumbPage').textContent = feat ? feat.title : VIEWS[view].page;
    if (feat) renderFeature(feat);
    if (view === 'rules') {
      const inner = name === 'test' ? 'test' : 'rules';
      document.querySelectorAll('.tab[data-inner]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === inner)));
      $('#panel-rules').hidden = inner !== 'rules'; $('#panel-test').hidden = inner !== 'test';
      if (inner === 'test') runTest();
    }
    if (view === 'general') renderStats();
    try { history.replaceState(null, '', '#' + name); } catch (e) { /* yok say */ }
    window.scrollTo(0, 0);
  }

  /* ───────── kurallar ───────── */
  function visibleRules() {
    const q = filterQ.trim().toLowerCase();
    return rules.filter((r) => (!filterCat || r.category === filterCat) &&
      (!q || [r.name, r.pattern, r.label, r.id, r.description].join(' ').toLowerCase().includes(q)));
  }
  function renderRules() {
    const list = $('#ruleList'); list.textContent = '';
    const vis = visibleRules();
    const pages = Math.max(1, Math.ceil(vis.length / PAGE_SIZE));
    page = Math.min(Math.max(0, page), pages - 1);
    $('#ruleCount').textContent = vis.length + ' kural';
    $('#pageInfo').textContent = 'Sayfa ' + (page + 1) + ' / ' + pages;
    $('#prevPage').disabled = page === 0; $('#nextPage').disabled = page >= pages - 1;
    if (!vis.length) {
      const tr = el('tr'); const td = el('td', 'empty', 'Eşleşen kural yok.'); td.colSpan = 6; tr.append(td); list.append(tr); return;
    }
    for (const r of vis.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)) {
      const tr = el('tr', 'rule' + (r.enabled ? '' : ' off'));

      const tdName = el('td', 'fade');
      const nm = el('p', 'rname', r.name); nm.title = r.name; tdName.append(nm);
      const sub = [r.validator ? 'Doğrulama: ' + r.validator : '', r.builtin ? '' : 'Kullanıcı kuralı', r.description].filter(Boolean).join(' · ');
      if (sub) { const s = el('p', 'rsub', sub); s.title = sub; tdName.append(s); }

      const tdPat = el('td', 'mono fade');
      const pat = el('p', null, r.pattern); pat.title = '/' + r.pattern + '/' + (r.flags || ''); tdPat.append(pat);

      const tdCat = el('td', 'fade'); tdCat.append(el('span', 'badge ' + (CAT_BADGE[r.category] || 'badge-neutral'), CAT_LABEL[r.category] || r.category));
      const tdSev = el('td', 'fade');
      if (ruleError(r)) tdSev.append(el('span', 'badge badge-error', 'Geçersiz regex'));
      else tdSev.append(el('span', 'badge ' + SEV_BADGE[r.severity], SEV_LABEL[r.severity] || r.severity));

      const tdOn = el('td');
      const sw = el('label', 'switch'); sw.title = r.enabled ? 'Kuralı kapat' : 'Kuralı aç';
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = r.enabled;
      cb.setAttribute('aria-label', r.name + ' kuralını aç/kapat');
      cb.addEventListener('change', () => { r.enabled = cb.checked; tr.classList.toggle('off', !r.enabled); saveRules(); });
      sw.append(cb, el('span')); tdOn.append(sw);

      const tdOps = el('td', 'num'); const ops = el('div', 'row-actions');
      const edit = el('button', 'row-action'); edit.title = 'Düzenle'; edit.setAttribute('aria-label', r.name + ' kuralını düzenle'); edit.append(icon('edit'));
      edit.addEventListener('click', () => openEditor(r.id));
      const del = el('button', 'row-action row-action-danger'); del.title = 'Sil'; del.setAttribute('aria-label', r.name + ' kuralını sil'); del.append(icon('delete'));
      del.addEventListener('click', () => {
        if (!confirm('"' + r.name + '" kuralı silinsin mi?')) return;
        rules = rules.filter((x) => x.id !== r.id);
        if (r.builtin && !settings.deletedBuiltins.includes(r.id)) { settings.deletedBuiltins.push(r.id); Store.saveSettings(settings); }
        saveRules('Kural silindi'); renderRules();
      });
      ops.append(edit, del); tdOps.append(ops);

      tr.append(tdName, tdPat, tdCat, tdSev, tdOn, tdOps);
      list.append(tr);
    }
  }

  /* ───────── kural düzenleyici ───────── */
  const dlg = $('#ruleDialog');
  function formRule() {
    const flags = Array.from(document.querySelectorAll('[data-flag]')).filter((c) => c.checked).map((c) => c.dataset.flag).join('');
    return {
      name: $('#rName').value.trim(), label: $('#rLabel').value.trim(), category: $('#rCategory').value,
      severity: $('#rSeverity').value, validator: $('#rValidator').value, pattern: $('#rPattern').value,
      flags, description: $('#rDesc').value.trim()
    };
  }
  function previewRule() {
    const out = $('#rResult'); out.textContent = ''; out.className = 'result';
    const r = formRule();
    if (!r.pattern) return false;
    let compiled;
    try { compiled = [{ rule: Object.assign({ id: 'x', enabled: true }, r), re: PG.buildRegex(r.pattern, r.flags) }]; }
    catch (e) { out.className = 'result err'; out.textContent = 'Geçersiz regex: ' + (e.message || e); return false; }
    if (compiled[0].re.test('')) { out.className = 'result err'; out.textContent = 'Desen boş metinle eşleşiyor; daha kısıtlayıcı olmalı.'; return false; }
    const sample = $('#rSample').value;
    if (!sample) return true;
    const f = PG.scan(sample, compiled);
    out.append(f.length ? f.length + ' eşleşme: ' : 'Eşleşme yok.');
    f.slice(0, 12).forEach((x) => { out.append(el('mark', null, x.value), ' '); });
    return true;
  }
  function openEditor(id) {
    editingId = id;
    const r = id ? rules.find((x) => x.id === id) : { name: '', label: '', category: 'CUSTOM', severity: 'medium', validator: '', pattern: '', flags: 'i', description: '' };
    $('#ruleDialogTitle').textContent = id ? 'Kuralı düzenle' : 'Kural ekle';
    $('#rName').value = r.name; $('#rLabel').value = r.label || ''; $('#rCategory').value = r.category;
    $('#rSeverity').value = r.severity; $('#rValidator').value = r.validator || ''; $('#rPattern').value = r.pattern;
    $('#rDesc').value = r.description || ''; $('#rSample').value = '';
    document.querySelectorAll('[data-flag]').forEach((c) => { c.checked = (r.flags || '').includes(c.dataset.flag); });
    $('#rRestore').hidden = !(id && r.builtin);
    previewRule();
    dlg.showModal();
    $('#rName').focus();
  }
  function slug(s) {
    const map = { ğ: 'g', ü: 'u', ş: 's', ı: 'i', ö: 'o', ç: 'c', İ: 'i' };
    return s.replace(/[ğüşıöçİ]/g, (c) => map[c]).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'kural';
  }

  /* ───────── sağlayıcılar ───────── */
  function renderProviders() {
    const list = $('#providerList'); list.textContent = '';
    for (const p of Store.PROVIDERS) {
      const card = el('div', 'prov');
      const info = el('div'); info.append(el('b', null, p.name), el('small', null, p.hosts.join(', ') + (p.path || '')));
      const sw = el('label', 'switch');
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = !settings.disabledProviders.includes(p.id);
      cb.setAttribute('aria-label', p.name + ' için korumayı aç/kapat');
      cb.addEventListener('change', () => {
        settings.disabledProviders = settings.disabledProviders.filter((x) => x !== p.id);
        if (!cb.checked) settings.disabledProviders.push(p.id);
        saveSettings();
      });
      sw.append(cb, el('span'));
      card.append(info, sw); list.append(card);
    }
    const dl = $('#domainList'); dl.textContent = '';
    if (!settings.customDomains.length) dl.append(el('span', 'muted', 'Henüz özel alan adı eklenmedi.'));
    for (const d of settings.customDomains) {
      const chip = el('span', 'chipx', d);
      const x = el('button', null, '×'); x.title = d + ' alan adını kaldır'; x.setAttribute('aria-label', x.title);
      x.addEventListener('click', async () => {
        settings.customDomains = settings.customDomains.filter((v) => v !== d);
        await saveSettings('Alan adı kaldırıldı');
        try { await api.permissions.remove({ origins: Store.originPatterns(d) }); } catch (e) { /* yerleşik izinle çakışıyor olabilir */ }
        renderProviders();
      });
      chip.append(x); dl.append(chip);
    }
  }

  /* ───────── ayarlar ───────── */
  function renderGeneral() {
    document.querySelectorAll('input[name="mode"]').forEach((r) => { r.checked = r.value === settings.mode; });
    document.querySelectorAll('input[name="maskStyle"]').forEach((r) => { r.checked = r.value === settings.maskStyle; });
    $('#keepStart').value = settings.keepStart; $('#keepEnd').value = settings.keepEnd;
    $('#restoreResponses').checked = !!settings.restoreResponses;
    $('#restoreResponses').disabled = settings.maskStyle !== 'scramble';
    $('#minSeverity').value = settings.minSeverity;
    $('#liveBadge').checked = settings.liveBadge;
    $('#allowlist').value = settings.allowlist.join('\n');
    $('#extraSendSelectors').value = settings.extraSendSelectors || '';
  }
  async function renderStats() {
    stats = (await Store.load()).stats;
    const box = $('#stats'); box.textContent = '';
    [['detected', 'Tespit edilen'], ['masked', 'Maskelenen'], ['bypassed', 'Yine de gönderilen'], ['blocked', 'Engellenen']]
      .forEach(([k, label]) => { const s = el('div', 'stat'); s.append(el('b', null, String(stats[k] || 0)), el('span', null, label)); box.append(s); });
  }

  /* ───────── playground ───────── */
  function runTest() {
    const text = $('#testInput').value;
    const { compiled } = PG.compile(rules);
    const f = PG.scan(text, compiled, { minSeverity: settings.minSeverity, allowlist: settings.allowlist });
    $('#testCount').textContent = text ? f.length + ' bulgu' : '';
    const hl = $('#testHighlight'); hl.textContent = '';
    let pos = 0;
    for (const x of f) {
      hl.append(text.slice(pos, x.start));
      const m = el('mark', null, text.slice(x.start, x.end)); m.title = x.name + ' (' + x.category + ')';
      hl.append(m); pos = x.end;
    }
    hl.append(text.slice(pos));
    const list = $('#testFindings'); list.textContent = '';
    for (const x of f) {
      const row = el('div', 'found'); const l = el('span', 'l');
      l.append(el('span', null, x.name), el('span', 'badge ' + (CAT_BADGE[x.category] || 'badge-neutral'), CAT_LABEL[x.category] || x.category),
        el('span', 'badge ' + SEV_BADGE[x.severity], SEV_LABEL[x.severity]));
      row.append(l, el('code', null, x.value)); list.append(row);
    }
    $('#testMasked').textContent = PG.mask(text, f, { style: settings.maskStyle, keepStart: Number(settings.keepStart), keepEnd: Number(settings.keepEnd) });
  }

  /* ───────── olaylar ───────── */
  function bind() {
    document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $('#themeToggle').addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(theme);
      try { localStorage.setItem('pg_theme', theme); } catch (e) { /* yok say */ }
    });
    $('#enabled').addEventListener('change', (e) => { settings.enabled = e.target.checked; saveSettings(settings.enabled ? 'Koruma açıldı' : 'Koruma kapatıldı'); });

    $('#q').addEventListener('input', (e) => { filterQ = e.target.value; page = 0; renderRules(); });
    $('#catFilter').addEventListener('change', (e) => { filterCat = e.target.value; page = 0; renderRules(); });
    $('#prevPage').addEventListener('click', () => { page--; renderRules(); });
    $('#nextPage').addEventListener('click', () => { page++; renderRules(); });
    $('#addRule').addEventListener('click', () => openEditor(null));
    const setShown = (on) => { visibleRules().forEach((r) => { r.enabled = on; }); saveRules(); renderRules(); };
    $('#enableShown').addEventListener('click', () => setShown(true));
    $('#disableShown').addEventListener('click', () => setShown(false));
    $('#exportRules').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({ app: 'prompt-guard', version: 1, rules }, null, 2)], { type: 'application/json' });
      const a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'prompt-guard-kurallar.json';
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('#importRules').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', async (e) => {
      const file = e.target.files[0]; e.target.value = '';
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const incoming = Array.isArray(data) ? data : data.rules;
        if (!Array.isArray(incoming)) throw new Error('Dosyada "rules" dizisi yok');
        let added = 0, updated = 0, skipped = 0;
        for (const raw of incoming) {
          if (!raw || typeof raw.pattern !== 'string' || !raw.name) { skipped++; continue; }
          const r = {
            id: String(raw.id || slug(raw.name)), name: String(raw.name), category: ['PII', 'PHI', 'PCI'].includes(raw.category) ? raw.category : 'CUSTOM',
            severity: PG.SEVERITY_RANK[raw.severity] ? raw.severity : 'medium', pattern: raw.pattern,
            flags: String(raw.flags || '').replace(/[^imsu]/g, ''), validator: PG.VALIDATORS[raw.validator] ? raw.validator : '',
            enabled: raw.enabled !== false, label: String(raw.label || raw.id || slug(raw.name)).toUpperCase(),
            description: String(raw.description || ''), builtin: !!raw.builtin && PG.DEFAULT_RULES.some((d) => d.id === raw.id)
          };
          if (ruleError(r)) { skipped++; continue; }
          const i = rules.findIndex((x) => x.id === r.id);
          if (i >= 0) { rules[i] = r; updated++; } else { rules.push(r); added++; }
        }
        await saveRules(added + ' eklendi, ' + updated + ' güncellendi' + (skipped ? ', ' + skipped + ' atlandı' : ''));
        renderRules();
      } catch (err) { alert('İçe aktarılamadı: ' + (err.message || err)); }
    });
    $('#resetRules').addEventListener('click', async () => {
      if (!confirm('Tüm kurallar varsayılan haline dönsün mü? Eklediğiniz ve düzenlediğiniz kurallar silinir.')) return;
      rules = Store.clone(PG.DEFAULT_RULES); settings.deletedBuiltins = []; page = 0;
      await Store.saveSettings(settings); await saveRules('Varsayılan kurallar yüklendi'); renderRules();
    });

    ['#rPattern', '#rSample', '#rValidator'].forEach((s) => $(s).addEventListener('input', previewRule));
    document.querySelectorAll('[data-flag]').forEach((c) => c.addEventListener('change', previewRule));
    $('#rCancel').addEventListener('click', () => dlg.close());
    $('#rRestore').addEventListener('click', () => {
      const d = PG.DEFAULT_RULES.find((x) => x.id === editingId); if (!d) return;
      $('#rName').value = d.name; $('#rLabel').value = d.label; $('#rCategory').value = d.category; $('#rSeverity').value = d.severity;
      $('#rValidator').value = d.validator; $('#rPattern').value = d.pattern; $('#rDesc').value = d.description;
      document.querySelectorAll('[data-flag]').forEach((c) => { c.checked = d.flags.includes(c.dataset.flag); });
      previewRule();
    });
    $('#ruleForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!previewRule()) return;
      const f = formRule();
      if (!f.name) return;
      f.label = (f.label || slug(f.name)).toUpperCase();
      if (editingId) Object.assign(rules.find((x) => x.id === editingId), f);
      else {
        let id = 'user_' + slug(f.name), n = 2;
        while (rules.some((x) => x.id === id)) id = 'user_' + slug(f.name) + '_' + n++;
        rules.unshift(Object.assign({ id, enabled: true, builtin: false }, f));
        page = 0;
      }
      dlg.close(); await saveRules(editingId ? 'Kural güncellendi' : 'Kural eklendi'); renderRules();
    });

    $('#domainForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Store.normalizeDomain($('#domainInput').value);
      if (!d) { toast('Geçerli bir alan adı girin (ör. ornek-ai.com)'); return; }
      if (settings.customDomains.includes(d)) { toast('Bu alan adı zaten ekli'); return; }
      let granted = false;
      try { granted = await api.permissions.request({ origins: Store.originPatterns(d) }); }
      catch (err) { toast('İzin istenemedi: ' + (err.message || err)); return; }
      if (!granted) { toast('İzin verilmediği için eklenmedi'); return; }
      settings.customDomains.push(d); $('#domainInput').value = '';
      await saveSettings(d + ' eklendi. Açık sekmeleri yenileyin.'); renderProviders();
    });

    document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', () => { if (r.checked) { settings.mode = r.value; saveSettings(); } }));
    document.querySelectorAll('input[name="maskStyle"]').forEach((r) => r.addEventListener('change', () => {
      if (r.checked) { settings.maskStyle = r.value; $('#restoreResponses').disabled = r.value !== 'scramble'; saveSettings(); }
    }));
    $('#restoreResponses').addEventListener('change', (e) => { settings.restoreResponses = e.target.checked; saveSettings(); });
    ['keepStart', 'keepEnd'].forEach((k) => $('#' + k).addEventListener('change', (e) => {
      const n = Math.min(10, Math.max(0, parseInt(e.target.value, 10) || 0));
      e.target.value = n; settings[k] = n; saveSettings();
    }));
    $('#minSeverity').addEventListener('change', (e) => { settings.minSeverity = e.target.value; saveSettings(); });
    $('#liveBadge').addEventListener('change', (e) => { settings.liveBadge = e.target.checked; saveSettings(); });
    $('#allowlist').addEventListener('change', (e) => { settings.allowlist = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean); saveSettings(); });
    $('#extraSendSelectors').addEventListener('change', (e) => {
      const lines = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
      const bad = lines.filter((s) => { try { document.querySelector(s); return false; } catch (err) { return true; } });
      if (bad.length) { toast('Geçersiz seçici: ' + bad[0]); return; }
      settings.extraSendSelectors = lines.join('\n'); saveSettings();
    });
    $('#resetStats').addEventListener('click', async () => { await Store.resetStats(); renderStats(); toast('Sayaçlar sıfırlandı'); });

    $('#testInput').addEventListener('input', runTest);
    $('#testSample').addEventListener('click', () => { $('#testInput').value = SAMPLE; runTest(); });
  }

  async function init() {
    const data = await Store.load();
    settings = data.settings; rules = data.rules; stats = data.stats;
    const vs = $('#rValidator');
    Object.entries(PG.VALIDATOR_LABELS).forEach(([k, v]) => { const o = el('option', null, v); o.value = k; vs.append(o); });
    const fnav = $('#featureNav');
    FEATURES.forEach((f) => {
      const b = el('button', 'nav-item'); b.dataset.tab = 'f-' + f.id;
      const t = el('span', 'grow', f.title); const lock = icon('lock'); lock.classList.add('lock');
      b.append(icon(f.icon), t, lock); fnav.append(b);
    });
    document.querySelectorAll('a[data-site]').forEach((a) => { a.href = siteLink(a.dataset.site); });
    bind(); renderSummary(); renderRules(); renderProviders(); renderGeneral();
    const tab = location.hash.slice(1);
    showTab(['rules', 'providers', 'general', 'test'].concat(FEATURES.map((f) => 'f-' + f.id)).includes(tab) ? tab : 'rules');
  }
  init();
})();
