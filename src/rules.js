/* Prompt Guard — varsayılan kural seti (PII / PHI / PCI).
 * Desende 1. yakalama grubu varsa yalnızca o kısım "hassas değer" sayılır ve maskelenir;
 * bu sayede "MRN: 12345" gibi bağlam anahtar kelimeli kurallar yazılabilir.
 * Tüm kurallar Ayarlar > Kurallar sekmesinden düzenlenebilir. */
(function (root) {
  'use strict';
  const R = String.raw;
  const rules = [];
  function add(id, name, category, severity, pattern, o) {
    o = o || {};
    rules.push({
      id, name, category, severity, pattern,
      flags: o.flags || '', validator: o.validator || '',
      enabled: o.enabled !== false, label: o.label || id.toUpperCase(),
      description: o.desc || '', builtin: true
    });
  }

  /* ───────────────────────────── PII ───────────────────────────── */
  add('email', 'E-posta adresi', 'PII', 'medium',
    R`(?<![\w.+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![\w-])`,
    { label: 'EMAIL' });
  add('phone_tr_mobile', 'Telefon (TR cep)', 'PII', 'medium',
    R`(?<![\d+])(?:\+?90[\s.-]?|0)?\(?5\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}(?!\d)`,
    { label: 'TELEFON', desc: '05xx xxx xx xx, +90 5xx…, 5xxxxxxxxx' });
  add('phone_tr_land', 'Telefon (TR sabit hat)', 'PII', 'medium',
    R`(?<![\d+])(?:\+?90[\s.-]?|0)\(?[2-4]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}(?!\d)`,
    { label: 'TELEFON' });
  add('phone_us', 'Telefon (ABD/Kanada)', 'PII', 'medium',
    R`(?<![\d+.-])(?:\+?1[\s.-]?)?(?:\([2-9]\d{2}\)\s?|[2-9]\d{2}[\s.-])[2-9]\d{2}[\s.-]\d{4}(?![\d-])`,
    { label: 'TELEFON', desc: 'Ayraçlı biçimler: (415) 555-2671, 415-555-2671' });
  add('phone_uk', 'Telefon (UK cep)', 'PII', 'medium',
    R`(?<![\d+])(?:\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}(?!\d)`, { label: 'TELEFON' });
  add('phone_intl', 'Telefon (uluslararası, + ile)', 'PII', 'medium',
    R`(?<![\w+])\+[1-9](?:[\s.\-()]{0,2}\d){7,14}(?!\d)`, { label: 'TELEFON', desc: 'E.164 benzeri' });
  add('tckn', 'T.C. Kimlik No', 'PII', 'high',
    R`(?<!\d)[1-9]\d{10}(?!\d)`, { validator: 'tckn', label: 'TCKN', desc: '11 hane + sağlama basamakları' });
  add('vkn', 'Vergi Kimlik No (TR)', 'PII', 'high',
    R`(?:vergi\s*(?:kimlik)?\s*(?:no|numaras[ıi])?|VKN)\s*[:#=]?\s*(\d{10})(?!\d)`,
    { flags: 'i', validator: 'vkn', label: 'VKN', desc: 'Anahtar kelime + 10 hane + sağlama' });
  add('us_ssn', 'ABD SSN', 'PII', 'high',
    R`(?<![\d-])(?!000|666|9\d{2})\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}(?![\d-])`, { label: 'SSN' });
  add('us_ssn_ctx', 'ABD SSN (ayraçsız, bağlamlı)', 'PII', 'high',
    R`(?:SSN|social\s*security(?:\s*(?:number|no|#))?)\s*[:#=]?\s*((?!000|666|9\d{2})\d{3}-?(?!00)\d{2}-?(?!0000)\d{4})(?!\d)`,
    { flags: 'i', label: 'SSN' });
  add('us_itin', 'ABD ITIN', 'PII', 'high',
    R`(?<![\d-])9\d{2}[- ](?:5\d|6[0-5]|7\d|8[0-8]|9[0-24-9])[- ]\d{4}(?![\d-])`, { label: 'ITIN' });
  add('us_ein', 'ABD EIN (bağlamlı)', 'PII', 'medium',
    R`(?:EIN|employer\s*id(?:entification)?(?:\s*(?:number|no))?|tax\s*id)\s*[:#=]?\s*(\d{2}-?\d{7})(?!\d)`,
    { flags: 'i', label: 'EIN' });
  add('passport', 'Pasaport No (bağlamlı)', 'PII', 'high',
    R`(?:passport|pasaport)\s*(?:no|number|numaras[ıi]|#)?\.?\s*[:#=]?\s*([A-Z]{1,2}\d{6,8}|\d{8,9})(?![A-Za-z0-9])`,
    { flags: 'i', label: 'PASAPORT' });
  add('driver_license', 'Ehliyet / Sürücü belgesi No (bağlamlı)', 'PII', 'medium',
    R`(?:driver'?s?\s*licen[sc]e|driving\s*licen[sc]e|ehliyet|sürücü\s*belgesi)\s*(?:no|number|numaras[ıi]|#)?\.?\s*[:#=]?\s*((?=[A-Z0-9-]*\d)[A-Z0-9-]{5,16})(?![A-Za-z0-9])`,
    { flags: 'i', label: 'EHLIYET' });
  add('uk_nino', 'UK National Insurance No', 'PII', 'high',
    R`(?<![A-Za-z0-9])(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D](?![A-Za-z0-9])`,
    { label: 'NINO' });
  add('ca_sin', 'Kanada SIN', 'PII', 'high',
    R`(?<![\d-])\d{3}[- ]\d{3}[- ]\d{3}(?![\d-])`, { validator: 'luhn', label: 'SIN' });
  add('in_aadhaar', 'Hindistan Aadhaar', 'PII', 'high',
    R`(?<![\d-])[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?![\d-])`, { validator: 'verhoeff', label: 'AADHAAR' });
  add('in_pan', 'Hindistan PAN', 'PII', 'high',
    R`(?<![A-Za-z0-9])[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z](?![A-Za-z0-9])`, { label: 'PAN_IN' });
  add('br_cpf', 'Brezilya CPF', 'PII', 'high',
    R`(?<![\d.])\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)`, { validator: 'cpf', label: 'CPF' });
  add('br_cnpj', 'Brezilya CNPJ', 'PII', 'medium',
    R`(?<![\d.])\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}(?!\d)`, { validator: 'cnpj', label: 'CNPJ' });
  add('es_dni', 'İspanya DNI', 'PII', 'high',
    R`(?<![A-Za-z0-9])\d{8}-?[A-HJ-NP-TV-Z](?![A-Za-z0-9])`, { validator: 'dni_es', label: 'DNI' });
  add('es_nie', 'İspanya NIE', 'PII', 'high',
    R`(?<![A-Za-z0-9])[XYZ]-?\d{7}-?[A-HJ-NP-TV-Z](?![A-Za-z0-9])`, { validator: 'nie_es', label: 'NIE' });
  add('it_cf', 'İtalya Codice Fiscale', 'PII', 'high',
    R`(?<![A-Za-z0-9])[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z](?![A-Za-z0-9])`, { label: 'CODICE_FISCALE' });
  add('fr_nir', 'Fransa NIR (INSEE)', 'PII', 'high',
    R`(?<!\d)[12]\s?\d{2}\s?(?:0[1-9]|1[0-2]|[2-9]\d)\s?(?:\d{2}|2[AB])\s?\d{3}\s?\d{3}\s?\d{2}(?!\d)`,
    { validator: 'nir_fr', label: 'NIR' });
  add('de_steuerid', 'Almanya Steuer-ID (bağlamlı)', 'PII', 'high',
    R`(?:Steuer-?ID|Steueridentifikationsnummer|IdNr\.?)\s*[:#=]?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})(?!\d)`,
    { flags: 'i', label: 'STEUER_ID' });
  add('nl_bsn', 'Hollanda BSN (bağlamlı)', 'PII', 'high',
    R`(?:BSN|burgerservicenummer|sofinummer)\s*[:#=]?\s*(\d{9})(?!\d)`, { flags: 'i', validator: 'bsn', label: 'BSN' });
  add('pl_pesel', 'Polonya PESEL (bağlamlı)', 'PII', 'high',
    R`PESEL\s*[:#=]?\s*(\d{11})(?!\d)`, { flags: 'i', validator: 'pesel', label: 'PESEL' });
  add('se_pnr', 'İsveç Personnummer', 'PII', 'high',
    R`(?<![\d-])(?:19|20)?\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[-+]\d{4}(?![\d-])`,
    { validator: 'se_pnr', label: 'PERSONNUMMER' });
  add('za_id', 'Güney Afrika Kimlik No (bağlamlı)', 'PII', 'high',
    R`(?:ID\s*(?:number|no)|identity\s*number|RSA\s*ID)\.?\s*[:#=]?\s*(\d{13})(?!\d)`,
    { flags: 'i', validator: 'luhn', label: 'ZA_ID' });
  add('mx_curp', 'Meksika CURP', 'PII', 'high',
    R`(?<![A-Za-z0-9])[A-Z][AEIOUX][A-Z]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HM](?:AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d(?![A-Za-z0-9])`,
    { label: 'CURP' });
  add('sg_nric', 'Singapur NRIC/FIN', 'PII', 'high',
    R`(?<![A-Za-z0-9])[STFGM]\d{7}[A-Z](?![A-Za-z0-9])`, { label: 'NRIC' });
  add('cn_id', 'Çin Kimlik No', 'PII', 'high',
    R`(?<!\d)[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dX](?![\dXx])`,
    { validator: 'china_id', label: 'CN_ID' });
  add('au_tfn', 'Avustralya TFN (bağlamlı)', 'PII', 'high',
    R`(?:TFN|tax\s*file\s*number)\s*[:#=]?\s*(\d{3}\s?\d{3}\s?\d{3})(?!\d)`, { flags: 'i', validator: 'tfn_au', label: 'TFN' });
  add('kr_rrn', 'Güney Kore RRN', 'PII', 'high',
    R`(?<![\d-])\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])-[1-8]\d{6}(?![\d-])`, { label: 'RRN' });
  add('jp_mynumber', 'Japonya My Number (bağlamlı)', 'PII', 'high',
    R`(?:マイナンバー|個人番号|my\s*number)\s*[:#=：]?\s*(\d{4}[ -]?\d{4}[ -]?\d{4})(?!\d)`, { flags: 'i', label: 'MY_NUMBER' });
  add('dob', 'Doğum tarihi (bağlamlı)', 'PII', 'medium',
    R`(?:DOB|D\.O\.B\.?|date\s*of\s*birth|birth\s*date|birthday|born\s*on|doğum\s*tarihi|d\.\s?tarihi)\s*[:=-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})`,
    { flags: 'i', label: 'DOGUM_TARIHI' });
  add('full_name_ctx', 'Ad Soyad (bağlamlı)', 'PII', 'medium',
    R`(?:[Aa]d[ıi]?\s*[Ss]oyad[ıi]?|AD\s*SOYAD|[Ff]ull\s*[Nn]ame|[Ff]irst\s*and\s*[Ll]ast\s*[Nn]ame|İsim\s*Soyisim)\s*[:=]\s*(\p{Lu}[\p{L}'.-]+(?:[ \t]+\p{Lu}[\p{L}'.-]+){1,3})`,
    { flags: 'u', label: 'AD_SOYAD', desc: '"Ad Soyad: …" gibi etiketli isimler' });
  add('maiden_name', 'Anne kızlık soyadı (bağlamlı)', 'PII', 'high',
    R`(?:anne(?:sinin)?\s*kızlık\s*soyadı|mother'?s\s*maiden\s*name)\s*[:=]\s*(\p{L}{2,30})`,
    { flags: 'iu', label: 'KIZLIK_SOYADI' });
  add('password_ctx', 'Parola / şifre (bağlamlı)', 'PII', 'high',
    R`(?:password|passwd|pwd|parola|şifre|sifre)\s*[:=]\s*(\S{4,})`, { flags: 'i', label: 'PAROLA' });
  add('address_tr', 'Adres (TR: Mah./Cad./Sok. … No)', 'PII', 'medium',
    R`(?<![\p{L}])[\p{L}0-9. ]{2,40}(?:Mah(?:allesi|\.)|Cad(?:desi|\.)|Sok(?:ağı|ak|\.)|Sk\.|Bulvarı|Blv\.)[^\n]{0,60}?\bNo\s*[:.]?\s*\d{1,4}(?:\s*/\s*\d{1,4})?`,
    { flags: 'iu', label: 'ADRES' });
  add('address_us', 'Adres (ABD sokak adresi)', 'PII', 'medium',
    R`(?<![\w-])\d{1,6}\s+(?:[A-Z][a-z]+\.?\s){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Circle|Highway|Hwy)\b\.?`,
    { label: 'ADRES' });
  add('uk_postcode', 'UK posta kodu', 'PII', 'low',
    R`(?<![A-Za-z0-9])(?:GIR ?0AA|[A-PR-UWYZ](?:\d{1,2}|[A-HK-Y]\d{1,2}|\d[A-HJKPSTUW]|[A-HK-Y]\d[ABEHMNPRV-Y]) ?\d[ABD-HJLNP-UW-Z]{2})(?![A-Za-z0-9])`,
    { enabled: false, label: 'POSTA_KODU', desc: 'Gürültülü olabilir; varsayılan kapalı' });
  add('ipv4', 'IPv4 adresi', 'PII', 'low',
    R`(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?![\d.])`, { label: 'IP' });
  add('ipv6', 'IPv6 adresi', 'PII', 'low',
    R`(?<![\w:])(?:(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}|(?:[A-F0-9]{1,4}:){2,7}:(?:[A-F0-9]{1,4}(?::[A-F0-9]{1,4}){0,5})?)(?![\w:])`,
    { flags: 'i', label: 'IP' });
  add('mac', 'MAC adresi', 'PII', 'low',
    R`(?<![\w:-])(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}(?![\w:-])`, { flags: 'i', label: 'MAC' });
  add('gps', 'GPS koordinatı', 'PII', 'low',
    R`(?<![\d.])[-+]?(?:[1-8]?\d\.\d{4,}|90\.0{4,})\s*,\s*[-+]?(?:180\.0{4,}|(?:1[0-7]\d|[1-9]?\d)\.\d{4,})(?![\d.])`, { label: 'KONUM' });
  add('vin', 'Araç şasi no (VIN)', 'PII', 'low',
    R`(?<![A-Za-z0-9])(?=[A-HJ-NPR-Z0-9]{17}(?![A-Za-z0-9]))(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-HJ-NPR-Z0-9]{17}`, { label: 'VIN' });
  add('plate_tr', 'Araç plakası (TR)', 'PII', 'low',
    R`(?<![A-Za-z0-9])(?:0[1-9]|[1-7]\d|8[01])\s?[A-PR-VYZ]{1,3}\s?\d{2,4}(?![A-Za-z0-9])`,
    { enabled: false, label: 'PLAKA', desc: 'Gürültülü olabilir; varsayılan kapalı' });

  /* ───────────────────────────── PCI / Finans ───────────────────────────── */
  add('cc_visa', 'Kredi kartı — Visa', 'PCI', 'high',
    R`(?<![\d-])4\d{3}(?:[ -]?\d{4}){3}(?![\d-])`, { validator: 'luhn', label: 'KART_NO' });
  add('cc_mastercard', 'Kredi kartı — Mastercard', 'PCI', 'high',
    R`(?<![\d-])(?:5[1-5]\d{2}|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)(?:[ -]?\d{4}){3}(?![\d-])`, { validator: 'luhn', label: 'KART_NO' });
  add('cc_amex', 'Kredi kartı — American Express', 'PCI', 'high',
    R`(?<![\d-])3[47]\d{2}[ -]?\d{6}[ -]?\d{5}(?![\d-])`, { validator: 'luhn', label: 'KART_NO' });
  add('cc_discover', 'Kredi kartı — Discover', 'PCI', 'high',
    R`(?<![\d-])(?:6011|65\d{2}|64[4-9]\d)(?:[ -]?\d{4}){3}(?![\d-])`, { validator: 'luhn', label: 'KART_NO' });
  add('cc_diners', 'Kredi kartı — Diners Club', 'PCI', 'high',
    R`(?<![\d-])3(?:0[0-5]|[68]\d)\d[ -]?\d{6}[ -]?\d{4}(?![\d-])`, { validator: 'luhn', label: 'KART_NO' });
  add('cc_jcb', 'Kredi kartı — JCB', 'PCI', 'high',
    R`(?<![\d-])35(?:2[89]|[3-8]\d)(?:[ -]?\d{4}){3}(?![\d-])`, { validator: 'luhn', label: 'KART_NO' });
  add('cc_unionpay', 'Kredi kartı — UnionPay', 'PCI', 'high',
    R`(?<![\d-])62\d{2}(?:[ -]?\d{4}){3}(?:[ -]?\d{1,3})?(?![\d-])`, { validator: 'luhn', label: 'KART_NO' });
  add('cc_troy', 'Kredi kartı — Troy', 'PCI', 'high',
    R`(?<![\d-])9792(?:[ -]?\d{4}){3}(?![\d-])`, { validator: 'luhn', label: 'KART_NO' });
  add('cc_maestro', 'Banka kartı — Maestro', 'PCI', 'high',
    R`(?<![\d-])(?:5018|5020|5038|5893|6304|6759|676[1-3])[ -]?\d{4}[ -]?\d{4}(?:[ -]?\d{1,7})?(?![\d-])`, { validator: 'luhn', label: 'KART_NO' });
  add('cc_generic', 'Kart numarası (genel, 13–19 hane)', 'PCI', 'medium',
    R`(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d-])`, { validator: 'luhn', label: 'KART_NO', desc: 'Marka kurallarına uymayan, Luhn geçerli numaralar' });
  add('cvv', 'CVV / CVC (bağlamlı)', 'PCI', 'high',
    R`(?:CVV2?|CVC2?|CAV2?|CID|güvenlik\s*kodu|security\s*code)\s*[:#=]?\s*(\d{3,4})(?!\d)`, { flags: 'i', label: 'CVV' });
  add('card_expiry', 'Kart son kullanma tarihi (bağlamlı)', 'PCI', 'medium',
    R`(?:exp(?:iry|iration|ires)?(?:\s*date)?|valid\s*thru|son\s*kullanma(?:\s*tarihi)?|SKT)\.?\s*[:=]?\s*((?:0[1-9]|1[0-2])\s?[/-]\s?(?:20)?\d{2})(?!\d)`,
    { flags: 'i', label: 'KART_SKT' });
  add('card_pin', 'Kart PIN / şifresi (bağlamlı)', 'PCI', 'high',
    R`(?:(?<![A-Za-z])PIN(?:\s*(?:code|kodu))?|kart\s*şifresi)\s*[:=]\s*(\d{4,6})(?!\d)`, { flags: 'i', label: 'PIN' });
  add('track1', 'Manyetik şerit — Track 1', 'PCI', 'high',
    R`%B\d{12,19}\^[^^\n]{2,26}\^\d{4}[^?\n]*\?`, { label: 'TRACK_DATA' });
  add('track2', 'Manyetik şerit — Track 2', 'PCI', 'high',
    R`;\d{12,19}=\d{4}\d*\?`, { label: 'TRACK_DATA' });
  add('iban', 'IBAN', 'PCI', 'high',
    R`(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?(?![A-Za-z0-9])`,
    { validator: 'iban', label: 'IBAN', desc: 'Tüm ülkeler, mod-97 doğrulamalı' });
  add('swift', 'SWIFT / BIC (bağlamlı)', 'PCI', 'low',
    R`(?:SWIFT|BIC)(?:\s*(?:code|kodu))?\s*[:=]?\s*([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)(?![A-Za-z0-9])`, { label: 'SWIFT' });
  add('aba_routing', 'ABA routing no (bağlamlı)', 'PCI', 'medium',
    R`(?:routing|ABA|RTN)(?:\s*(?:number|no|#))?\.?\s*[:#=]?\s*(\d{9})(?!\d)`, { flags: 'i', validator: 'aba', label: 'ROUTING_NO' });
  add('bank_account', 'Banka hesap no (bağlamlı)', 'PCI', 'medium',
    R`(?:account|acct|hesap)\s*(?:number|no|numaras[ıi]|#)\.?\s*[:#=]?\s*(\d{6,17})(?!\d)`, { flags: 'i', label: 'HESAP_NO' });
  add('btc_address', 'Bitcoin adresi', 'PCI', 'low',
    R`(?<![A-Za-z0-9])(?:bc1[ac-hj-np-z02-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})(?![A-Za-z0-9])`, { label: 'KRIPTO_ADRES' });
  add('eth_address', 'Ethereum adresi', 'PCI', 'low',
    R`(?<![A-Za-z0-9])0x[a-fA-F0-9]{40}(?![A-Za-z0-9])`, { label: 'KRIPTO_ADRES' });

  /* ───────────────────────────── PHI ───────────────────────────── */
  add('mrn', 'Hasta / tıbbi kayıt no — MRN (bağlamlı)', 'PHI', 'high',
    R`(?:MRN|medical\s*record(?:\s*(?:number|no|#))?|patient\s*(?:id|number|no)|hasta\s*(?:no|numaras[ıi]|dosya\s*no)|protokol\s*(?:no|numaras[ıi]))\.?\s*[:#=]?\s*((?=[A-Z0-9-]*\d)[A-Z0-9-]{4,15})(?![A-Za-z0-9])`,
    { flags: 'i', label: 'MRN' });
  add('patient_name', 'Hasta adı (bağlamlı)', 'PHI', 'high',
    R`(?:[Pp]atient(?:\s*[Nn]ame)?|PATIENT|[Hh]asta(?:\s*[Aa]d[ıi])?(?:\s*[Ss]oyad[ıi])?|HASTA)\s*[:=]\s*(\p{Lu}[\p{L}'.-]+(?:[ \t]+\p{Lu}[\p{L}'.-]+){1,3})`,
    { flags: 'u', label: 'HASTA_ADI' });
  add('health_plan_id', 'Sağlık sigortası / poliçe / üye no (bağlamlı)', 'PHI', 'high',
    R`(?:member\s*id|subscriber\s*id|policy\s*(?:number|no|#)|insurance\s*(?:id|number|no)|group\s*(?:number|no)|health\s*plan\s*(?:id|no)|sigorta\s*(?:no|numaras[ıi])|poliçe\s*(?:no|numaras[ıi])|SGK\s*(?:sicil\s*)?(?:no|numaras[ıi]))\.?\s*[:#=]?\s*((?=[A-Z0-9-]*\d)[A-Z0-9-]{5,20})(?![A-Za-z0-9])`,
    { flags: 'i', label: 'SIGORTA_NO' });
  add('us_npi', 'ABD NPI — sağlık hizmeti sağlayıcı no (bağlamlı)', 'PHI', 'medium',
    R`NPI(?:\s*(?:number|no|#))?\.?\s*[:#=]?\s*([12]\d{9})(?!\d)`, { flags: 'i', validator: 'npi', label: 'NPI' });
  add('us_dea', 'ABD DEA numarası', 'PHI', 'medium',
    R`(?<![A-Za-z0-9])[ABCDFGHJKLMPRSTUX][A-Z9]\d{7}(?![A-Za-z0-9])`, { validator: 'dea', label: 'DEA' });
  add('us_mbi', 'ABD Medicare MBI', 'PHI', 'high',
    R`(?<![A-Za-z0-9])[1-9][AC-HJKMNP-RT-Y][AC-HJKMNP-RT-Y0-9]\d-?[AC-HJKMNP-RT-Y][AC-HJKMNP-RT-Y0-9]\d-?[AC-HJKMNP-RT-Y]{2}\d{2}(?![A-Za-z0-9])`,
    { label: 'MEDICARE_ID' });
  add('uk_nhs', 'UK NHS numarası', 'PHI', 'high',
    R`(?<![\d-])\d{3}[ -]\d{3}[ -]\d{4}(?![\d-])`, { validator: 'nhs', label: 'NHS_NO' });
  add('uk_nhs_ctx', 'UK NHS numarası (ayraçsız, bağlamlı)', 'PHI', 'high',
    R`NHS(?:\s*(?:number|no|#))?\.?\s*[:#=]?\s*(\d{10})(?!\d)`, { flags: 'i', validator: 'nhs', label: 'NHS_NO' });
  add('icd10', 'ICD-10 tanı kodu', 'PHI', 'medium',
    R`(?<![A-Za-z0-9.])[A-TV-Z]\d[0-9AB]\.[0-9A-KXZ]{1,4}(?![A-Za-z0-9])`, { label: 'ICD10', desc: 'Noktalı biçim: E11.9, F32.1' });
  add('icd10_ctx', 'ICD-10 tanı kodu (bağlamlı)', 'PHI', 'medium',
    R`(?:ICD(?:-?10)?(?:\s*(?:code|kodu))?|tanı\s*kodu|diagnosis\s*code)\s*[:#=]?\s*([A-TV-Z]\d[0-9AB](?:\.?[0-9A-KXZ]{1,4})?)(?![A-Za-z0-9])`,
    { flags: 'i', label: 'ICD10' });
  add('cpt_ctx', 'CPT işlem kodu (bağlamlı)', 'PHI', 'low',
    R`CPT(?:\s*code)?\s*[:#=]?\s*(\d{4}[0-9FTU])(?![A-Za-z0-9])`, { flags: 'i', label: 'CPT' });
  add('ndc', 'NDC ilaç kodu', 'PHI', 'low',
    R`(?<![\d-])(?:\d{4}-\d{4}-\d{2}|\d{5}-\d{3}-\d{2}|\d{5}-\d{4}-\d{1,2})(?![\d-])`, { label: 'NDC' });
  add('blood_type', 'Kan grubu (bağlamlı)', 'PHI', 'low',
    R`(?:blood\s*(?:type|group)|kan\s*grubu)\s*[:=]?\s*((?:AB|A|B|O|0)\s?(?:Rh\s?)?(?:[+-]|pozitif|negatif|positive|negative))`,
    { flags: 'i', label: 'KAN_GRUBU' });
  add('care_dates', 'Yatış / taburcu / hizmet tarihi (bağlamlı)', 'PHI', 'medium',
    R`(?:admission|admitted|discharged?|date\s*of\s*service|DOS|yatış|taburcu|muayene)\s*(?:date|tarihi)?\s*[:=-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})`,
    { flags: 'i', label: 'SAGLIK_TARIHI' });
  add('diagnosis_ctx', 'Tanı / teşhis ifadesi (bağlamlı)', 'PHI', 'medium',
    R`(?:diagnosis|diagnosed\s*with|tanı|teşhis|ön\s*tanı)\s*[:=]\s*([^\n;]{3,80})`, { flags: 'i', label: 'TANI' });
  add('medication_ctx', 'İlaç / reçete ifadesi (bağlamlı)', 'PHI', 'low',
    R`(?:medications?|prescribed|prescription|Rx|reçete|kullandığı\s*ilaçlar?|ilaç)\s*[:=]\s*([^\n;]{3,80})`, { flags: 'i', label: 'ILAC' });
  add('lab_result_ctx', 'Laboratuvar sonucu (bağlamlı)', 'PHI', 'low',
    R`(?<![A-Za-z])(?:HbA1c|glucose|glukoz|hemoglobin|creatinine|kreatinin|TSH|LDL|HDL|PSA|WBC|CRP)\s*[:=]\s*(\d+(?:[.,]\d+)?\s*(?:mg/dL|mmol/L|g/dL|%|mIU/L|ng/mL|U/L)?)`,
    { flags: 'i', label: 'LAB_SONUCU' });
  add('health_keywords', 'Hassas sağlık durumu anahtar kelimeleri', 'PHI', 'low',
    R`(?<![\p{L}])(?:HIV|AIDS|hepatit(?:is)?\s?[BC]|kanser|cancer|kemoterapi|chemotherapy|şizofreni|schizophrenia|bipolar|epilepsi|epilepsy|tüberküloz|tuberculosis|kürtaj|abortion|intihar\s*girişimi|suicide\s*attempt)(?![\p{L}])`,
    { flags: 'iu', enabled: false, label: 'SAGLIK_DURUMU', desc: 'Tek başına kimlik içermez; varsayılan kapalı' });

  root.PG = Object.assign(root.PG || {}, { DEFAULT_RULES: rules });
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
