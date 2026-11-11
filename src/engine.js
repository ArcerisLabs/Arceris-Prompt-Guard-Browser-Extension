/* Prompt Guard — tespit motoru: doğrulayıcılar, derleme, tarama, maskeleme.
 * İçerik betiği, ayarlar sayfası ve Node testleri tarafından ortak kullanılır. */
(function (root) {
  'use strict';

  const digits = (s) => String(s).replace(/\D/g, '');
  const toInts = (s) => digits(s).split('').map(Number);

  function luhn(s) {
    const d = toInts(s);
    if (d.length < 2) return false;
    let sum = 0, dbl = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = d[i];
      if (dbl) { n *= 2; if (n > 9) n -= 9; }
      sum += n; dbl = !dbl;
    }
    return sum % 10 === 0;
  }

  const VH_D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const VH_P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];

  const VALIDATORS = {
    luhn: (s) => { const n = digits(s).length; return n >= 9 && luhn(s) && !/^(\d)\1+$/.test(digits(s)); },
    tckn: (s) => {
      const d = toInts(s);
      if (d.length !== 11 || d[0] === 0) return false;
      const odd = d[0] + d[2] + d[4] + d[6] + d[8];
      const even = d[1] + d[3] + d[5] + d[7];
      const c10 = (((odd * 7 - even) % 10) + 10) % 10;
      const c11 = (odd + even + d[9]) % 10;
      return d[9] === c10 && d[10] === c11;
    },
    vkn: (s) => {
      const d = toInts(s);
      if (d.length !== 10 || /^0+$/.test(digits(s))) return false;
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        const t = (d[i] + 9 - i) % 10;
        sum += t === 9 ? 9 : (t * Math.pow(2, 9 - i)) % 9;
      }
      return (10 - (sum % 10)) % 10 === d[9];
    },
    iban: (s) => {
      const v = String(s).replace(/\s+/g, '').toUpperCase();
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false;
      const r = v.slice(4) + v.slice(0, 4);
      let rem = 0;
      for (const ch of r) {
        const n = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
        for (const c of n) rem = (rem * 10 + Number(c)) % 97;
      }
      return rem === 1;
    },
    nhs: (s) => {
      const d = toInts(s);
      if (d.length !== 10) return false;
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += d[i] * (10 - i);
      let c = 11 - (sum % 11);
      if (c === 11) c = 0;
      return c !== 10 && c === d[9];
    },
    npi: (s) => { const v = digits(s); return v.length === 10 && luhn('80840' + v); },
    dea: (s) => {
      const d = toInts(String(s).slice(2));
      if (d.length !== 7) return false;
      return (d[0] + d[2] + d[4] + 2 * (d[1] + d[3] + d[5])) % 10 === d[6];
    },
    aba: (s) => {
      const d = toInts(s);
      if (d.length !== 9) return false;
      return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + d[2] + d[5] + d[8]) % 10 === 0;
    },
    cpf: (s) => {
      const d = toInts(s);
      if (d.length !== 11 || /^(\d)\1+$/.test(digits(s))) return false;
      const chk = (n) => { let t = 0; for (let i = 0; i < n; i++) t += d[i] * (n + 1 - i); const r = (t * 10) % 11; return r === 10 ? 0 : r; };
      return chk(9) === d[9] && chk(10) === d[10];
    },
    cnpj: (s) => {
      const d = toInts(s);
      if (d.length !== 14 || /^(\d)\1+$/.test(digits(s))) return false;
      const w1 = [5,4,3,2,9,8,7,6,5,4,3,2], w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
      const chk = (w) => { let t = 0; w.forEach((x, i) => { t += x * d[i]; }); const r = t % 11; return r < 2 ? 0 : 11 - r; };
      return chk(w1) === d[12] && chk(w2) === d[13];
    },
    verhoeff: (s) => {
      const d = toInts(s).reverse();
      if (d.length < 2) return false;
      let c = 0;
      d.forEach((n, i) => { c = VH_D[c][VH_P[i % 8][n]]; });
      return c === 0;
    },
    pesel: (s) => {
      const d = toInts(s);
      if (d.length !== 11) return false;
      const w = [1,3,7,9,1,3,7,9,1,3];
      let sum = 0; w.forEach((x, i) => { sum += x * d[i]; });
      return (10 - (sum % 10)) % 10 === d[10];
    },
    dni_es: (s) => {
      const v = String(s).toUpperCase().replace(/[^0-9A-Z]/g, '');
      const m = /^(\d{8})([A-Z])$/.exec(v);
      return !!m && 'TRWAGMYFPDXBNJZSQVHLCKE'[Number(m[1]) % 23] === m[2];
    },
    nie_es: (s) => {
      const v = String(s).toUpperCase().replace(/[^0-9A-Z]/g, '');
      const m = /^([XYZ])(\d{7})([A-Z])$/.exec(v);
      return !!m && 'TRWAGMYFPDXBNJZSQVHLCKE'[Number('XYZ'.indexOf(m[1]) + m[2]) % 23] === m[3];
    },
    bsn: (s) => {
      const d = toInts(s);
      if (d.length !== 9) return false;
      let sum = 0;
      for (let i = 0; i < 8; i++) sum += d[i] * (9 - i);
      sum -= d[8];
      return sum !== 0 && sum % 11 === 0;
    },
    china_id: (s) => {
      const v = String(s).toUpperCase();
      if (!/^\d{17}[\dX]$/.test(v)) return false;
      const w = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
      let sum = 0;
      for (let i = 0; i < 17; i++) sum += Number(v[i]) * w[i];
      return '10X98765432'[sum % 11] === v[17];
    },
    nir_fr: (s) => {
      let v = String(s).toUpperCase().replace(/\s+/g, '');
      if (v.length !== 15) return false;
      v = v.replace('2A', '19').replace('2B', '18');
      if (!/^\d{15}$/.test(v)) return false;
      let rem = 0;
      for (const c of v.slice(0, 13)) rem = (rem * 10 + Number(c)) % 97;
      return 97 - rem === Number(v.slice(13));
    },
    se_pnr: (s) => { const v = digits(s); return v.length >= 10 && luhn(v.slice(-10)); },
    tfn_au: (s) => {
      const d = toInts(s);
      if (d.length !== 9) return false;
      const w = [1,4,3,7,5,8,6,9,10];
      let sum = 0; w.forEach((x, i) => { sum += x * d[i]; });
      return sum % 11 === 0;
    }
  };

  const VALIDATOR_LABELS = {
    '': 'Yok (yalnızca regex)',
    luhn: 'Luhn (kart, SIN, vb.)',
    tckn: 'T.C. Kimlik No sağlaması',
    vkn: 'Vergi Kimlik No sağlaması',
    iban: 'IBAN mod-97',
    nhs: 'NHS mod-11',
    npi: 'NPI (Luhn + 80840)',
    dea: 'DEA sağlaması',
    aba: 'ABA routing sağlaması',
    cpf: 'CPF sağlaması',
    cnpj: 'CNPJ sağlaması',
    verhoeff: 'Verhoeff (Aadhaar)',
    pesel: 'PESEL sağlaması',
    dni_es: 'İspanya DNI harfi',
    nie_es: 'İspanya NIE harfi',
    bsn: 'BSN 11-testi',
    china_id: 'Çin kimlik sağlaması',
    nir_fr: 'Fransa NIR anahtarı',
    se_pnr: 'İsveç personnummer (Luhn)',
    tfn_au: 'Avustralya TFN sağlaması'
  };

  const SEVERITY_RANK = { low: 1, medium: 2, high: 3 };
  const MAX_TEXT = 300000;
  const MAX_MATCHES_PER_RULE = 300;

  function buildRegex(pattern, flags) {
    const f = new Set(String(flags || '').replace(/[^imsu]/g, '').split(''));
    f.add('g'); f.add('d');
    return new RegExp(pattern, Array.from(f).join(''));
  }

  /** Etkin kuralları derler. { compiled, errors } döndürür. */
  function compile(rules) {
    const compiled = [], errors = [];
    for (const rule of rules || []) {
      if (!rule || !rule.enabled) continue;
      try {
        compiled.push({ rule, re: buildRegex(rule.pattern, rule.flags) });
      } catch (e) {
        errors.push({ id: rule.id, name: rule.name, error: String(e && e.message || e) });
      }
    }
    return { compiled, errors };
  }

  /** Metni tarar. Desende 1. yakalama grubu varsa değer olarak o alınır. */
  function scan(text, compiled, opts) {
    opts = opts || {};
    text = String(text || '');
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);
    const minRank = SEVERITY_RANK[opts.minSeverity] || 1;
    const allow = opts.allowlist && opts.allowlist.length
      ? new Set(opts.allowlist.map((x) => String(x).trim().toLowerCase()).filter(Boolean)) : null;
    const cands = [];
    let order = 0;
    for (const { rule, re } of compiled) {
      if ((SEVERITY_RANK[rule.severity] || 1) < minRank) continue;
      re.lastIndex = 0;
      let m, n = 0;
      while ((m = re.exec(text)) !== null && n < MAX_MATCHES_PER_RULE) {
        if (m[0] === '') { re.lastIndex++; continue; }
        let start = m.index, end = m.index + m[0].length, value = m[0];
        if (m[1] !== undefined && m.indices && m.indices[1]) {
          start = m.indices[1][0]; end = m.indices[1][1]; value = m[1];
        }
        if (rule.validator && VALIDATORS[rule.validator] && !VALIDATORS[rule.validator](value)) continue;
        if (allow && allow.has(value.trim().toLowerCase())) continue;
        n++;
        cands.push({
          ruleId: rule.id, name: rule.name, category: rule.category, severity: rule.severity || 'medium',
          label: rule.label || String(rule.id).toUpperCase(), validator: rule.validator || '', start, end, value,
          _p: (SEVERITY_RANK[rule.severity] || 1) * 1e6 + (rule.validator ? 5e5 : 0) + Math.min(end - start, 4e5), _o: order++
        });
      }
    }
    // Çakışan eşleşmelerde önceliği yüksek olan kalır.
    cands.sort((a, b) => b._p - a._p || a._o - b._o);
    const kept = [];
    for (const c of cands) {
      if (!kept.some((k) => c.start < k.end && k.start < c.end)) kept.push(c);
    }
    kept.sort((a, b) => a.start - b.start);
    kept.forEach((k) => { delete k._p; delete k._o; });
    return kept;
  }

  const rnd = (n) => Math.floor(Math.random() * n);
  const UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', LOW = 'abcdefghijklmnopqrstuvwxyz';

  /** Baştaki/sondaki karakterleri korur, ortadaki rakam ve harfleri rastgele değiştirir.
   *  Ayraçlar (boşluk, tire, @, nokta…) ve uzunluk aynı kalır. */
  function scrambleOnce(value, keepStart, keepEnd) {
    const chars = Array.from(String(value));
    const idx = [];
    chars.forEach((c, i) => { if (/[\p{L}\p{N}]/u.test(c)) idx.push(i); });
    let ks = keepStart, ke = keepEnd;
    if (idx.length < ks + ke + 2) { ks = Math.min(ks, Math.floor(idx.length / 4)); ke = Math.min(ke, Math.floor(idx.length / 4)); }
    for (let k = ks; k < idx.length - ke; k++) {
      const c = chars[idx[k]];
      if (/\p{N}/u.test(c)) chars[idx[k]] = String(rnd(10));
      else chars[idx[k]] = (c === c.toUpperCase() && c !== c.toLowerCase()) ? UP[rnd(26)] : LOW[rnd(26)];
    }
    return chars.join('');
  }
  /** Sonuç özgün değerden farklı olmalı ve sağlama kontrolünden geçmemeli
   *  (başka birinin geçerli numarasını üretmemek için). Olmazsa null döner. */
  function scramble(value, keepStart, keepEnd, validator) {
    const check = validator && VALIDATORS[validator];
    for (let i = 0; i < 30; i++) {
      const out = scrambleOnce(value, keepStart, keepEnd);
      if (out !== value && !(check && check(out))) return out;
    }
    return null;
  }

  /** Bulguları değiştirir. opts.style: 'label' → [ETİKET], 'scramble' → ortası rastgele.
   *  opts.replacements dizisi verilirse üretilen değerler oraya eklenir. */
  function mask(text, findings, opts) {
    opts = opts || {};
    const ks = Number.isFinite(opts.keepStart) ? Math.max(0, opts.keepStart) : 2;
    const ke = Number.isFinite(opts.keepEnd) ? Math.max(0, opts.keepEnd) : 3;
    let out = String(text || '');
    const sorted = findings.slice().sort((a, b) => b.start - a.start);
    for (const f of sorted) {
      let rep = opts.style === 'scramble' ? scramble(f.value, ks, ke, f.validator) : null;
      if (rep === null) rep = '[' + f.label + ']';
      else {
        if (opts.replacements) opts.replacements.push(rep);
        if (opts.pairs) opts.pairs.push({ fake: rep, original: f.value });
      }
      out = out.slice(0, f.start) + rep + out.slice(f.end);
    }
    return out;
  }

  /** Değerin kısmen gizlenmiş önizlemesi (uyarı penceresinde gösterilir). */
  function preview(value) {
    const v = String(value).replace(/\s+/g, ' ').trim();
    if (v.length <= 4) return '•'.repeat(v.length);
    const keep = v.length > 10 ? 2 : 1;
    return v.slice(0, keep) + '•'.repeat(Math.min(v.length - keep * 2, 12)) + v.slice(-keep);
  }

  const api = { VALIDATORS, VALIDATOR_LABELS, SEVERITY_RANK, buildRegex, compile, scan, mask, scramble, preview, luhn };
  root.PG = Object.assign(root.PG || {}, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
