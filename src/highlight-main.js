/* Prompt Guard — geri çevrilen değerlerin altını çizen küçük yardımcı (sayfa dünyasında çalışır).
 * CSS Highlight API içerik betiklerinin yalıtılmış dünyasında kullanılamadığı için ayrı dosyadır.
 * DOM'a dokunmaz; yalnızca içerik betiğinin bildirdiği öğelerdeki metin aralıklarını işaretler. */
(function () {
  'use strict';
  if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
  const NAME = 'pg-restored';
  const items = new Map(); // öğe → değer kümesi
  let styled = false, timer = null;

  function paint() {
    timer = null;
    const ranges = [];
    for (const [el, vals] of items) {
      if (!el.isConnected) { items.delete(el); continue; }
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = n.nodeValue;
        for (const v of vals) {
          for (let i = t.indexOf(v); i !== -1; i = t.indexOf(v, i + v.length)) {
            const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + v.length); ranges.push(r);
          }
        }
      }
    }
    if (!ranges.length) { CSS.highlights.delete(NAME); return; }
    if (!styled) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('::highlight(' + NAME + ') { text-decoration: underline dotted; }');
        document.adoptedStyleSheets = document.adoptedStyleSheets.concat(sheet);
        styled = true;
      } catch (e) { return; }
    }
    CSS.highlights.set(NAME, new Highlight(...ranges));
  }

  document.addEventListener('pg-restored', (e) => {
    const el = e.target;
    if (!el || el.nodeType !== 1 || typeof e.detail !== 'string') return;
    let vals;
    try { vals = JSON.parse(e.detail); } catch (err) { return; }
    if (!Array.isArray(vals)) return;
    if (items.size > 2000) items.clear();
    const set = items.get(el) || new Set();
    vals.forEach((v) => { if (typeof v === 'string' && v.length >= 6 && v.length <= 300) set.add(v); });
    items.set(el, set);
    if (!timer) timer = setTimeout(paint, 60);
  }, true);
  document.addEventListener('pg-restore-clear', () => { items.clear(); CSS.highlights.delete(NAME); }, true);
})();
