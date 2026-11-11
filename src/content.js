/* Prompt Guard — içerik betiği: gönderimi yakalar, tarar, uyarır/maskeler. */
(function () {
  'use strict';
  if (window.__promptGuardLoaded) return;
  window.__promptGuardLoaded = true;

  const PG = globalThis.PG, Store = globalThis.PGStore;
  const EDITABLE = 'textarea, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]';
  const BUTTON = 'button, [role="button"], input[type="submit"]';
  const APPROVE_MS = 120000;
  const CAT_LABEL = { PII: 'PII', PHI: 'PHI', PCI: 'PCI', CUSTOM: 'Özel' };
  const SEV_LABEL = { low: 'Düşük', medium: 'Orta', high: 'Yüksek' };

  let settings = null, compiled = [], provider = null;
  let lastEditable = null, modalOpen = false, badgeTimer = null, badgeCtx = null, badgePoll = null;
  const approved = new Map(); // değer → geçerlilik bitişi
  let generated = [];         // maskeleme sırasında üretilen rastgele değerler (yeniden uyarı vermesin)

  /* ───────── ayarlar ───────── */
  async function reload() {
    try {
      const data = await Store.load();
      settings = data.settings;
      compiled = PG.compile(data.rules).compiled;
      if (!isActive()) hideBadge();
      if (!isActive() || !settings.restoreResponses || settings.maskStyle !== 'scramble') stopRestore();
    } catch (e) { settings = null; }
  }
  function isActive() {
    if (!settings || !settings.enabled) return false;
    provider = Store.providerFor(location, settings);
    return !!provider;
  }

  /* ───────── metin okuma / yazma ───────── */
  function getText(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
    return (el.innerText || el.textContent || '').replace(/ /g, ' ');
  }
  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function editableFromEvent(e) {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    for (const n of path) {
      if (n && n.nodeType === 1 && n.matches && n.matches(EDITABLE)) return outermostEditable(n);
    }
    return null;
  }
  function outermostEditable(el) {
    // İç içe contenteditable varsa en dıştakini al (editör kökü).
    let cur = el, top = el;
    while (cur && cur.parentElement) {
      cur = cur.parentElement;
      if (cur.matches && cur.matches(EDITABLE) && cur.isContentEditable) top = cur;
    }
    return top;
  }
  function findComposer() {
    if (lastEditable && lastEditable.isConnected && getText(lastEditable).trim()) return lastEditable;
    let best = null, bestLen = 0;
    document.querySelectorAll(EDITABLE).forEach((el) => {
      if (!isVisible(el)) return;
      const n = getText(el).trim().length;
      if (n > bestLen) { best = el; bestLen = n; }
    });
    return best;
  }
  function scanText(text) {
    const now = Date.now();
    for (const [k, t] of approved) if (t < now) approved.delete(k);
    return PG.scan(text, compiled, { minSeverity: settings.minSeverity, allowlist: settings.allowlist })
      .filter((f) => !approved.has(f.value) && !generated.some((g) => g.includes(f.value)));
  }
  const maskOpts = (replacements, pairs) => ({
    style: settings.maskStyle, keepStart: Number(settings.keepStart), keepEnd: Number(settings.keepEnd), replacements, pairs
  });

  /* ───────── cevaplarda orijinale geri çevirme ─────────
   * Eşleme yalnızca bu sekmenin belleğinde tutulur; diske yazılmaz, sayfa yenilenince silinir.
   * Yalnızca metin düğümünün içeriği yerinde değiştirilir (uzunluk aynı kaldığı için güvenli);
   * altı çizili gösterim DOM'a dokunmayan CSS Highlight API ile highlight-main.js içinde yapılır. */
  const RESTORE_MIN = 6;
  const RESTORE_SKIP = EDITABLE + ', script, style, noscript, textarea, #prompt-guard-host';
  const restoreMap = new Map();   // rastgele değer → orijinal
  let restoreRe = null, restoreTimer = null, observer = null;

  function rememberPairs(pairs) {
    if (!settings.restoreResponses) return;
    for (const p of pairs) if (p.fake.length >= RESTORE_MIN && p.fake !== p.original) restoreMap.set(p.fake, p.original);
    while (restoreMap.size > 500) restoreMap.delete(restoreMap.keys().next().value);
    if (!restoreMap.size) return;
    const keys = Array.from(restoreMap.keys()).sort((a, b) => b.length - a.length);
    restoreRe = new RegExp(keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
    if (!observer) {
      observer = new MutationObserver(scheduleRestore);
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    }
    scheduleRestore();
  }
  function stopRestore() {
    if (observer) { observer.disconnect(); observer = null; }
    clearTimeout(restoreTimer); restoreTimer = null;
    if (restoreMap.size) document.dispatchEvent(new CustomEvent('pg-restore-clear'));
    restoreMap.clear(); restoreRe = null;
  }
  function scheduleRestore() {
    if (restoreTimer) return;
    restoreTimer = setTimeout(() => { restoreTimer = null; runRestore(); }, 300);
  }
  function runRestore() {
    if (!restoreRe || !settings || !settings.restoreResponses || !document.body) return;
    restoreRe.lastIndex = 0;
    if (!restoreRe.test(document.body.textContent || '')) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = [];
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue.length < RESTORE_MIN) continue;
      restoreRe.lastIndex = 0;
      if (restoreRe.test(n.nodeValue) && n.parentElement && !n.parentElement.closest(RESTORE_SKIP)) hits.push(n);
    }
    for (const node of hits) {
      const used = new Set();
      node.nodeValue = node.nodeValue.replace(restoreRe, (m) => {
        const o = restoreMap.get(m);
        if (o) used.add(o);
        return o || m;
      });
      // Altını çizmesi için sayfa dünyasındaki yardımcıya haber ver (highlight-main.js).
      if (used.size && node.parentElement) {
        node.parentElement.dispatchEvent(new CustomEvent('pg-restored', { bubbles: true, detail: JSON.stringify(Array.from(used)) }));
      }
    }
  }

  function setText(el, text) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.focus();
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    selectAll(el);
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) { /* devam */ }
    if (!ok) pasteInto(el, text);
  }
  function selectAll(el) {
    el.focus();
    const sel = window.getSelection(), range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges(); sel.addRange(range);
  }
  function pasteInto(el, text) {
    try {
      selectAll(el);
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    } catch (e) { /* desteklenmiyor */ }
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function applyMask(ctx) {
    const { el, findings } = ctx;
    const current = getText(el);
    const fresh = current === ctx.text ? findings : scanText(current);
    const reps = [], pairs = [];
    const maskedText = PG.mask(current, fresh, maskOpts(reps, pairs));
    generated = generated.concat(reps).slice(-500);
    rememberPairs(pairs);
    const leaked = () => {
      const now = getText(el);
      return now.trim() === '' || scanText(now).some((f) => fresh.some((x) => x.value === f.value));
    };
    setText(el, maskedText);
    await sleep(80);
    if (leaked() && !(el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
      pasteInto(el, maskedText);
      await sleep(80);
    }
    if (leaked()) {
      let copied = false;
      try { await navigator.clipboard.writeText(maskedText); copied = true; } catch (e) { /* izin yok */ }
      toast(copied
        ? 'Bu editörde otomatik maskeleme yapılamadı. Maskelenmiş metin panoya kopyalandı; alanı temizleyip yapıştırın.'
        : 'Bu editörde otomatik maskeleme yapılamadı. Lütfen hassas verileri elle silin.', true);
      return;
    }
    Store.bump('masked', fresh.length);
    toast(fresh.length + ' hassas veri maskelendi. Kontrol edip gönderebilirsiniz.');
    hideBadge();
  }

  /* ───────── gönder butonu sezgisi ───────── */
  function extraSelectors() {
    return String(settings.extraSendSelectors || '').split('\n').map((s) => s.trim()).filter(Boolean);
  }
  function isSendButton(b) {
    if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return false;
    for (const sel of extraSelectors()) { try { if (b.matches(sel)) return true; } catch (e) { /* geçersiz seçici */ } }
    const txt = (b.innerText || b.value || '').trim();
    const s = [b.getAttribute('aria-label'), b.getAttribute('data-testid'), b.getAttribute('title'),
      b.id, b.getAttribute('name'), b.getAttribute('data-element-id'), txt.length <= 24 ? txt : '']
      .filter(Boolean).join(' ').toLowerCase();
    if (/stop|cancel|iptal|durdur|voice|microphone|dictat|attach|upload|dosya/.test(s)) return false;
    if (/send|submit|gönder|gonder|envoyer|senden|enviar|invia|отправ|发送|送信/.test(s)) return true;
    if ((b.type === 'submit') && b.form && b.form.querySelector(EDITABLE)) return true;
    return false;
  }
  function buttonFromEvent(e) {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    for (const n of path) if (n && n.nodeType === 1 && n.matches && n.matches(BUTTON)) return n;
    return null;
  }
  function findSendButton(el) {
    let scope = el;
    for (let i = 0; i < 8 && scope; i++) {
      scope = scope.parentElement;
      if (!scope) break;
      const btn = Array.from(scope.querySelectorAll(BUTTON)).find((b) => isSendButton(b) && isVisible(b));
      if (btn) return btn;
    }
    return null;
  }

  /* ───────── yakalama ───────── */
  function guard(e, el, trigger) {
    if (!el) return;
    const text = getText(el);
    if (!text.trim()) return;
    const findings = scanText(text);
    if (!findings.length) return;
    Store.bump('detected', findings.length);
    if (settings.mode === 'monitor') { showBadge(el, findings); return; }
    e.preventDefault();
    e.stopImmediatePropagation();
    if (settings.mode === 'block') Store.bump('blocked');
    showModal({ el, text, findings, trigger, review: false });
  }

  function onKeydown(e) {
    if (modalOpen || !isActive()) return;
    if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.isComposing || e.keyCode === 229) return;
    const el = editableFromEvent(e);
    if (!el) return;
    guard(e, el, { kind: 'key', ctrl: e.ctrlKey, meta: e.metaKey });
  }
  function onClick(e) {
    if (modalOpen || !isActive() || e.button !== 0) return;
    const btn = buttonFromEvent(e);
    if (!btn || !isSendButton(btn)) return;
    guard(e, findComposer(), { kind: 'click', button: btn });
  }
  function onSubmit(e) {
    if (modalOpen || !isActive()) return;
    const form = e.target;
    const el = form && form.querySelector ? form.querySelector(EDITABLE) : null;
    if (el) guard(e, el, { kind: 'submit', form });
  }
  function onFocusIn(e) { const el = editableFromEvent(e); if (el) lastEditable = el; }
  function onInput(e) {
    const el = editableFromEvent(e);
    if (!el) return;
    lastEditable = el;
    if (!isActive() || !settings.liveBadge) return;
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => refreshBadge(el), 350);
  }

  function resend(ctx) {
    const t = ctx.trigger || {};
    const btn = (t.button && t.button.isConnected) ? t.button : findSendButton(ctx.el);
    if (btn) { btn.click(); return; }
    if (t.form && typeof t.form.requestSubmit === 'function') { t.form.requestSubmit(); return; }
    ctx.el.focus();
    ctx.el.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true,
      ctrlKey: !!t.ctrl, metaKey: !!t.meta
    }));
    toast('Onaylandı. Mesaj gönderilmediyse tekrar gönderin.');
  }

  /* ───────── arayüz (shadow DOM) ───────── */
  let host = null, shadow = null;
  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    .wrap { --bg:#fff; --low:#fafbfd; --fg:#0c1626; --muted:#56657e; --dim:#8494ac; --line:#dde3ec; --line2:#e9edf3; --soft:#eaeef5;
      --primary:#14448c; --primary-dim:#1f5aae; --primary-bg:#e7eef9; --primary-fg:#fff; --danger:#b32d3f; --danger-bg:#fbe8ea;
      --warn:#9a5b06; --warn-bg:#fbeedc; --shadow:0 6px 20px #0c16261a; color: var(--fg); }
    @media (prefers-color-scheme: dark) {
      .wrap { --bg:#0e1523; --low:#131c2c; --fg:#e4ebf5; --muted:#93a3bc; --dim:#64748e; --line:#22304a; --line2:#1a2536; --soft:#1a2536;
        --primary:#4c8df6; --primary-dim:#6ba2f8; --primary-bg:#4c8df624; --primary-fg:#06101f; --danger:#f2687f; --danger-bg:#f2687f21;
        --warn:#e0a33c; --warn-bg:#e0a33c21; --shadow:0 8px 28px #0000008c; }
    }
    .overlay { position: fixed; inset: 0; z-index: 2147483647; background: #0c162680; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .dialog { width: min(560px, 100%); max-height: min(640px, 90vh); display: flex; flex-direction: column; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; }
    .bar { flex: none; height: 44px; display: flex; align-items: center; gap: 10px; padding: 0 20px; background: var(--low); border-bottom: 1px solid var(--line); }
    .wm { font-family: "Cabinet Grotesk", "IBM Plex Sans", system-ui, sans-serif; font-weight: 800; letter-spacing: -0.045em; font-size: 20px; line-height: 1; }
    .pchip { border: 1px solid var(--line); border-radius: 3px; background: var(--soft); height: 18px; display: inline-flex; align-items: center; padding: 0 7px; color: var(--muted); font-size: 11px; font-weight: 500; }
    .head { padding: 16px 20px 14px; display: flex; gap: 12px; align-items: flex-start; }
    .icon { flex: none; width: 32px; height: 32px; border-radius: 5px; background: var(--warn-bg); color: var(--warn); display: grid; place-items: center; font-size: 17px; font-weight: 700; }
    h2 { margin: 0; font-size: 15px; line-height: 1.35; font-weight: 600; letter-spacing: -.01em; }
    .sub { margin: 4px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--muted); }
    .list { margin: 0; padding: 0; overflow: auto; list-style: none; border-top: 1px solid var(--line2); border-bottom: 1px solid var(--line2); }
    .item { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 6px 20px; border-bottom: 1px solid var(--line2); font-size: 13px; }
    .item:last-child { border-bottom: 0; }
    .item:hover { background: var(--soft); }
    .chip { flex: none; display: inline-flex; align-items: center; gap: 6px; height: 20px; padding: 0 8px; border-radius: 3px; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; background: var(--soft); color: var(--muted); border: 1px solid var(--line); }
    .chip::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .chip.high { color: var(--danger); background: var(--danger-bg); border-color: color-mix(in srgb, var(--danger) 45%, transparent); }
    .chip.medium { color: var(--warn); background: var(--warn-bg); border-color: color-mix(in srgb, var(--warn) 45%, transparent); }
    .name { flex: 1; min-width: 0; font-weight: 600; }
    .name small { display: block; color: var(--dim); font-size: 11.5px; font-weight: 400; }
    .val { flex: none; max-width: 42%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: var(--muted); }
    .foot { padding: 12px 20px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; background: var(--low); }
    button { appearance: none; height: 34px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); padding: 0 14px; border-radius: 5px; font-size: 12.5px; font-weight: 500; cursor: pointer; }
    button:hover { background: var(--soft); }
    button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    button.primary { background: var(--primary); color: var(--primary-fg); border-color: var(--primary); }
    button.primary:hover { background: var(--primary-dim); border-color: var(--primary-dim); }
    button.danger { color: var(--danger); border-color: var(--danger); background: transparent; margin-right: auto; }
    button.danger:hover { background: var(--danger-bg); }
    .badge { position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 12px; border-radius: 5px; background: var(--bg); color: var(--warn); border: 1px solid color-mix(in srgb, var(--warn) 45%, transparent); border-left: 3px solid var(--warn); font-size: 12.5px; font-weight: 600; box-shadow: var(--shadow); }
    .badge:hover { background: var(--warn-bg); }
    .toast { position: fixed; right: 16px; bottom: 56px; z-index: 2147483647; max-width: min(380px, 92vw); padding: 10px 14px; border-radius: 5px; background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-left: 3px solid var(--primary); font-size: 12.5px; line-height: 1.45; box-shadow: var(--shadow); }
    .toast.warn { border-left-color: var(--danger); }
  `;
  function ui() {
    if (host && host.isConnected) return shadow.querySelector('.wrap');
    host = document.createElement('div');
    host.id = 'prompt-guard-host';
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style'); style.textContent = CSS;
    const wrap = document.createElement('div'); wrap.className = 'wrap';
    shadow.append(style, wrap);
    document.documentElement.appendChild(host);
    return wrap;
  }
  function h(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function showModal(ctx) {
    closeModal();
    modalOpen = true;
    const wrap = ui();
    const overlay = h('div', 'overlay');
    const dialog = h('div', 'dialog');
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Hassas veri tespit edildi');

    const head = h('div', 'head');
    head.append(h('div', 'icon', '!'));
    const ht = h('div');
    ht.append(h('h2', null, 'Bu mesajda ' + ctx.findings.length + ' hassas veri bulundu'));
    const where = provider ? provider.name : location.hostname;
    ht.append(h('p', 'sub', ctx.review
      ? 'Aşağıdaki veriler ' + where + ' sitesine gönderilmek üzere yazılmış. Maskeleyebilir veya düzenlemeye dönebilirsiniz.'
      : settings.mode === 'block'
        ? 'Gönderim durduruldu. Engelleme modunda hassas veriler kaldırılmadan ' + where + ' sitesine gönderilemez.'
        : 'Gönderim durduruldu. Verileri maskeleyebilir, mesajı düzenleyebilir veya olduğu gibi gönderebilirsiniz.'));
    head.append(ht);

    const list = h('ul', 'list');
    const groups = new Map();
    for (const f of ctx.findings) {
      const k = f.ruleId + '\u0000' + f.value;
      if (groups.has(k)) groups.get(k).count++; else groups.set(k, { f, count: 1 });
    }
    let shown = 0;
    for (const { f, count } of groups.values()) {
      if (shown++ >= 60) break;
      const li = h('li', 'item');
      li.append(h('span', 'chip ' + f.severity, CAT_LABEL[f.category] || f.category));
      const name = h('span', 'name', f.name + (count > 1 ? ' ×' + count : ''));
      name.append(h('small', null, 'Önem: ' + (SEV_LABEL[f.severity] || f.severity) + (settings.maskStyle === 'scramble' ? ' · ortası rastgele değiştirilir' : ' · yerine [' + f.label + '] yazılır')));
      li.append(name, h('span', 'val', PG.preview(f.value)));
      list.append(li);
    }

    const foot = h('div', 'foot');
    if (!ctx.review && settings.mode === 'warn') {
      const send = h('button', 'danger', 'Yine de gönder');
      send.addEventListener('click', () => {
        const until = Date.now() + APPROVE_MS;
        ctx.findings.forEach((f) => approved.set(f.value, until));
        Store.bump('bypassed');
        closeModal(); hideBadge();
        resend(ctx);
      });
      foot.append(send);
    }
    const edit = h('button', null, 'Düzenlemeye dön');
    edit.addEventListener('click', () => { closeModal(); try { ctx.el.focus(); } catch (e) { /* yok say */ } });
    const maskBtn = h('button', 'primary', 'Maskele');
    maskBtn.addEventListener('click', () => { closeModal(); applyMask(ctx); });
    foot.append(edit, maskBtn);

    const bar = h('div', 'bar');
    bar.append(h('span', 'wm', 'arceris'), h('span', 'pchip', 'Prompt Guard'));
    dialog.append(bar, head, list, foot);
    overlay.append(dialog);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
    overlay.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { closeModal(); try { ctx.el.focus(); } catch (err) { /* yok say */ } }
      if (e.key === 'Tab') {
        const btns = Array.from(foot.querySelectorAll('button'));
        const i = btns.indexOf(shadow.activeElement);
        e.preventDefault();
        btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
      }
    });
    wrap.append(overlay);
    maskBtn.focus();
  }
  function closeModal() {
    modalOpen = false;
    if (shadow) shadow.querySelectorAll('.overlay').forEach((n) => n.remove());
  }

  let toastTimer = null;
  function toast(msg, warn) {
    const wrap = ui();
    wrap.querySelectorAll('.toast').forEach((n) => n.remove());
    const t = h('div', 'toast' + (warn ? ' warn' : ''), msg);
    t.setAttribute('role', 'status');
    wrap.append(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), warn ? 8000 : 4000);
  }

  function refreshBadge(el) {
    if (!isActive() || !el || !el.isConnected) { hideBadge(); return; }
    const text = getText(el);
    const findings = text.trim() ? scanText(text) : [];
    if (findings.length) showBadge(el, findings); else hideBadge();
  }
  function showBadge(el, findings) {
    if (!settings.liveBadge && settings.mode !== 'monitor') return;
    const wrap = ui();
    let b = wrap.querySelector('.badge');
    if (!b) {
      b = h('button', 'badge');
      b.addEventListener('click', () => {
        if (!badgeCtx) return;
        const text = getText(badgeCtx.el), f = scanText(text);
        if (f.length) showModal({ el: badgeCtx.el, text, findings: f, trigger: null, review: true }); else hideBadge();
      });
      wrap.append(b);
    }
    b.textContent = findings.length + ' hassas veri';
    b.title = 'Arceris Prompt Guard: ayrıntıları görmek için tıklayın';
    badgeCtx = { el };
    if (!badgePoll) badgePoll = setInterval(() => { if (badgeCtx) refreshBadge(badgeCtx.el); }, 1500);
  }
  function hideBadge() {
    badgeCtx = null;
    if (badgePoll) { clearInterval(badgePoll); badgePoll = null; }
    if (shadow) shadow.querySelectorAll('.badge').forEach((n) => n.remove());
  }

  /* ───────── başlat ───────── */
  window.addEventListener('keydown', onKeydown, true);
  window.addEventListener('click', onClick, true);
  window.addEventListener('submit', onSubmit, true);
  window.addEventListener('focusin', onFocusIn, true);
  window.addEventListener('input', onInput, true);
  reload();
  Store.onChange(reload);
})();
