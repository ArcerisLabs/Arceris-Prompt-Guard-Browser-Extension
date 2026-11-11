/* Kural seti testi: node tests/rules.test.js */
const path = require('path');
require(path.join(__dirname, '../src/engine.js'));
require(path.join(__dirname, '../src/rules.js'));
const PG = globalThis.PG;

// Geçerli bir VKN üret (sağlama basamağını hesapla)
function mkVkn(first9) {
  for (let c = 0; c < 10; c++) if (PG.VALIDATORS.vkn(first9 + c)) return first9 + c;
}
const VKN = mkVkn('123456789');

// kural id → [eşleşmesi gereken örnekler], beklenen değer verilirse [metin, değer]
const POS = {
  email: [['bana ali.veli+test@ornek.com.tr adresinden yaz', 'ali.veli+test@ornek.com.tr']],
  phone_tr_mobile: ['0532 123 45 67', '+90 532 123 45 67', '5321234567', '0(532)1234567'],
  phone_tr_land: ['0212 555 12 34', '+90 312 555 12 34'],
  phone_us: ['(415) 555-2671', '415-555-2671', '+1 415 555 2671'],
  phone_uk: ['+44 7911 123456', '07911 123456'],
  phone_intl: ['+49 30 12345678', '+33 1 23 45 67 89'],
  tckn: [['TC: 10000000146 olan', '10000000146']],
  vkn: [['Vergi No: ' + VKN, VKN], ['VKN ' + VKN, VKN]],
  us_ssn: ['123-45-6789', '078 05 1120'],
  us_ssn_ctx: [['SSN: 123456789', '123456789']],
  us_itin: ['912-70-1234'],
  us_ein: [['EIN: 12-3456789', '12-3456789']],
  passport: [['Pasaport No: U12345678', 'U12345678'], ['passport number 123456789', '123456789']],
  driver_license: [['Ehliyet no: 123456', '123456'], ["driver's license: D1234567", 'D1234567']],
  uk_nino: ['AB123456C', 'AB 12 34 56 C'],
  ca_sin: ['046 454 286'],
  in_aadhaar: ['2341 2341 2346'],
  in_pan: ['ABCPE1234F'],
  br_cpf: ['529.982.247-25'],
  br_cnpj: ['11.222.333/0001-81'],
  es_dni: ['12345678Z'],
  es_nie: ['X1234567L'],
  it_cf: ['RSSMRA85T10A562S'],
  fr_nir: ['1 84 12 76 451 089 46'],
  de_steuerid: [['Steuer-ID: 12 345 678 901', '12 345 678 901']],
  nl_bsn: [['BSN: 111222333', '111222333']],
  pl_pesel: [['PESEL 44051401359', '44051401359']],
  se_pnr: ['811228-9874'],
  za_id: [['ID number: 8001015009087', '8001015009087']],
  mx_curp: ['GOMC850101HDFRRL09'],
  sg_nric: ['S1234567D'],
  cn_id: ['11010519491231002X'],
  au_tfn: [['TFN: 123 456 782', '123 456 782']],
  kr_rrn: ['900101-1234567'],
  jp_mynumber: [['My Number: 1234 5678 9012', '1234 5678 9012']],
  dob: [['Doğum tarihi: 12.05.1985', '12.05.1985'], ['DOB 1985-05-12', '1985-05-12']],
  full_name_ctx: [['Ad Soyad: Ayşe Yılmaz', 'Ayşe Yılmaz'], ['Full name: John A. Smith', 'John A. Smith']],
  maiden_name: [['Anne kızlık soyadı: Öztürk', 'Öztürk']],
  password_ctx: [['şifre: Gizli!2024', 'Gizli!2024'], ['password=hunter22', 'hunter22']],
  address_tr: ['Atatürk Mah. Cumhuriyet Cad. No: 12/3 Kadıköy'],
  address_us: ['1600 Pennsylvania Avenue', '742 Evergreen Terrace'],
  uk_postcode: ['SW1A 1AA'],
  ipv4: ['192.168.1.254'],
  ipv6: ['2001:0db8:85a3:0000:0000:8a2e:0370:7334', '2001:db8:85a3::8a2e:370:7334'],
  mac: ['00:1A:2B:3C:4D:5E'],
  gps: ['41.008240, 28.978359'],
  vin: ['1HGCM82633A004352'],
  plate_tr: ['34 ABC 123'],
  cc_visa: ['4111 1111 1111 1111', '4532015112830366'],
  cc_mastercard: ['5555-5555-5555-4444', '2223000048400011'],
  cc_amex: ['378282246310005', '3714 496353 98431'],
  cc_discover: ['6011111111111117'],
  cc_diners: ['30569309025904'],
  cc_jcb: ['3530111333300000'],
  cc_unionpay: ['6200000000000005'],
  cc_troy: ['9792030394440796'],
  cc_maestro: ['6759649826438453'],
  cc_generic: ['8171999927660000'],
  cvv: [['CVV: 123', '123'], ['güvenlik kodu 4567', '4567']],
  card_expiry: [['SKT: 09/27', '09/27'], ['exp 12/2028', '12/2028']],
  card_pin: [['PIN: 4821', '4821']],
  track1: ['%B4111111111111111^DOE/JOHN^25121010000000000000?'],
  track2: [';4111111111111111=25121010000000000?'],
  iban: ['TR33 0006 1005 1978 6457 8413 26', 'GB82WEST12345698765432', 'DE89 3704 0044 0532 0130 00'],
  swift: [['SWIFT: TGBATRIS', 'TGBATRIS'], ['BIC DEUTDEFF500', 'DEUTDEFF500']],
  aba_routing: [['Routing number: 021000021', '021000021']],
  bank_account: [['Hesap no: 12345678', '12345678'], ['account number 000123456789', '000123456789']],
  btc_address: ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'],
  eth_address: ['0x742d35Cc6634C0532925a3b844Bc454e4438f44e'],
  mrn: [['MRN: 00123456', '00123456'], ['Hasta no: H-45821', 'H-45821'], ['Protokol No 2024-11873', '2024-11873']],
  patient_name: [['Hasta: Mehmet Öz', 'Mehmet Öz'], ['Patient name: Jane Doe', 'Jane Doe']],
  health_plan_id: [['Member ID: XYZ123456789', 'XYZ123456789'], ['Poliçe no: 98765432', '98765432']],
  us_npi: [['NPI: 1234567893', '1234567893']],
  us_dea: ['AB1234563'],
  us_mbi: ['1EG4-TE5-MK73', '1EG4TE5MK73'],
  uk_nhs: ['943 476 5919'],
  uk_nhs_ctx: [['NHS number: 9434765919', '9434765919']],
  icd10: ['E11.9', 'F32.1', 'S72.001A'],
  icd10_ctx: [['ICD-10: I10', 'I10'], ['Tanı kodu: J45', 'J45']],
  cpt_ctx: [['CPT code 99213', '99213']],
  ndc: ['0777-3105-02', '50242-040-62'],
  blood_type: [['Kan grubu: A Rh+', 'A Rh+'], ['blood type O negative', 'O negative']],
  care_dates: [['Taburcu tarihi: 03.11.2026', '03.11.2026'], ['Admitted 2026-10-28', '2026-10-28']],
  diagnosis_ctx: [['Tanı: Tip 2 diyabet', 'Tip 2 diyabet']],
  medication_ctx: [['Reçete: Metformin 1000 mg 2x1', 'Metformin 1000 mg 2x1']],
  lab_result_ctx: [['HbA1c: 7.8 %', '7.8 %'], ['Glukoz = 142 mg/dL', '142 mg/dL']],
  health_keywords: ['HIV', 'şizofreni']
};

// Hiçbir kuralın (kapalı olanlar dahil) eşleşmemesi gereken metinler
const NEG = [
  'Merhaba, bana Python ile bir for döngüsü yazar mısın?',
  'Toplam 12345678901 adet ürün satıldı',            // TCKN sağlaması tutmaz
  '4111 1111 1111 1112 numarası geçersiz',            // Luhn tutmaz
  'TR33 0006 1005 1978 6457 8413 27',                  // IBAN mod-97 tutmaz
  'Sürüm 2.1 yayınlandı, 2026 yılında 350 kişi katıldı',
  'ehliyet sınavı ne zaman? pasaport başvurusu nasıl yapılır?',
  'std::vector<int> v; a = b + c;',
  'Toplantı 14:30:00 saatinde, bütçe 1.250.000 TL',
  '123-45-678 ve 000-12-3456 SSN değildir'
];

let fail = 0, pass = 0;
const all = PG.DEFAULT_RULES.map((r) => Object.assign({}, r, { enabled: true }));
const { compiled, errors } = PG.compile(all);
if (errors.length) { fail += errors.length; console.log('DERLEME HATASI', errors); }

// Her kural tek başına: örneklerini yakalamalı
for (const rule of all) {
  const samples = POS[rule.id];
  if (!samples) { fail++; console.log('ÖRNEK YOK:', rule.id); continue; }
  const one = PG.compile([rule]).compiled;
  for (const s of samples) {
    const [text, want] = Array.isArray(s) ? s : [s, null];
    const f = PG.scan(text, one);
    const ok = f.length >= 1 && (want === null ? true : f.some((x) => x.value === want));
    if (ok) pass++; else { fail++; console.log('KAÇIRDI:', rule.id, JSON.stringify(text), '→', JSON.stringify(f.map((x) => x.value))); }
  }
}
for (const id of Object.keys(POS)) if (!all.some((r) => r.id === id)) { fail++; console.log('BİLİNMEYEN KURAL:', id); }

for (const text of NEG) {
  const f = PG.scan(text, compiled);
  if (f.length === 0) pass++; else { fail++; console.log('YANLIŞ POZİTİF:', JSON.stringify(text), '→', f.map((x) => x.ruleId + ':' + x.value)); }
}

// Bütünleşik senaryo: çakışma çözümü + maskeleme
const defaults = PG.compile(PG.DEFAULT_RULES).compiled;
const prompt = 'Müşteri Ad Soyad: Ayşe Yılmaz, TC 10000000146, tel 0532 123 45 67, ' +
  'kart 4111 1111 1111 1111 SKT: 09/27 CVV: 123, IBAN TR33 0006 1005 1978 6457 8413 26, e-posta ayse@ornek.com. Tanı kodu: E11.9';
const found = PG.scan(prompt, defaults);
const ids = found.map((f) => f.ruleId);
const expect = ['full_name_ctx', 'tckn', 'phone_tr_mobile', 'cc_visa', 'card_expiry', 'cvv', 'iban', 'email'];
for (const e of expect) if (ids.includes(e)) pass++; else { fail++; console.log('SENARYODA EKSİK:', e, ids); }
if (ids.some((i) => i.startsWith('icd10'))) pass++; else { fail++; console.log('SENARYODA EKSİK: icd10', ids); }
for (let i = 1; i < found.length; i++) if (found[i].start < found[i - 1].end) { fail++; console.log('ÇAKIŞMA KALDI', found[i - 1], found[i]); }
const masked = PG.mask(prompt, found);
if (/10000000146|4111|ayse@|TR33|Yılmaz/.test(masked)) { fail++; console.log('MASKE SIZDIRDI:', masked); } else pass++;
if (PG.scan(masked, defaults).length === 0) pass++; else { fail++; console.log('MASKELİ METİNDE BULGU:', PG.scan(masked, defaults)); }
if (PG.scan('ayse@ornek.com', defaults, { allowlist: ['AYSE@ornek.com'] }).length === 0) pass++; else { fail++; console.log('İZİN LİSTESİ ÇALIŞMADI'); }
if (PG.scan(prompt, defaults, { minSeverity: 'high' }).every((f) => f.severity === 'high')) pass++; else { fail++; console.log('MIN ÖNEM ÇALIŞMADI'); }

// Ortayı rastgele değiştirme
for (let i = 0; i < 200; i++) {
  const t = PG.scramble('37123456632', 2, 3, 'tckn');
  if (!(t && /^37\d{6}632$/.test(t) && t !== '37123456632' && !PG.VALIDATORS.tckn(t))) { fail++; console.log('SCRAMBLE TCKN HATALI:', t); break; }
}
pass++;
const sc = PG.scramble('4111 1111 1111 1111', 2, 3, 'luhn');
if (/^41\d{2} \d{4} \d{4} \d111$/.test(sc) && !PG.luhn(sc)) pass++; else { fail++; console.log('SCRAMBLE KART HATALI:', sc); }
const se = PG.scramble('ayse.yilmaz@ornek.com', 2, 3, '');
if (/^ay[a-z]{2}\.[a-z]{6}@[a-z]{5}\.com$/.test(se)) pass++; else { fail++; console.log('SCRAMBLE EMAIL HATALI:', se); }
const reps = [];
const sm = PG.mask(prompt, found, { style: 'scramble', keepStart: 2, keepEnd: 3, replacements: reps });
if (sm.length === prompt.length && reps.length === found.length && !/10000000146|4111 1111 1111 1111|ayse@ornek/.test(sm)) pass++; else { fail++; console.log('SCRAMBLE MASKE HATALI:', sm); }
console.log('\nRastgele maskeli örnek:', sm);

const cats = {};
PG.DEFAULT_RULES.forEach((r) => { cats[r.category] = (cats[r.category] || 0) + 1; });
console.log('\nMaskeli örnek:', masked);
console.log('Kural sayısı:', PG.DEFAULT_RULES.length, JSON.stringify(cats), '| varsayılan kapalı:', PG.DEFAULT_RULES.filter((r) => !r.enabled).map((r) => r.id).join(', '));
console.log(`\n${pass} geçti, ${fail} başarısız`);
process.exit(fail ? 1 : 0);
