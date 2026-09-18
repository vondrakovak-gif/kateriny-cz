#!/usr/bin/env node
/**
 * Nahraje 16 faktur za rok 2026 přímo do Upstash Redis.
 * Spuštění: node scripts/push-faktury-redis.mjs
 */

const UPSTASH_URL   = 'https://lucky-hare-82542.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAAUJuAAIgcDI4MjYyNDA2OTcxMmI0MDgyODlkZTMzOTQwNDVlMmU5Yw';

const faktury = [
  {
    id: '2026-0001', cislo: '2026-0001', variabilniSymbol: '20260001',
    datum: '2026-01-31', datumSplatnosti: '2026-02-14',
    klient: { nazev: 'PLASTIA s.r.o.', ico: '60720981', dic: 'CZ60720981', adresa: 'Na Pankráci 332/14, 14000 Praha - Nusle', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 35000, celkem: 35000 }],
    celkemBezDph: 35000, dph: 0, celkemSDph: 35000,
    zaplaceno: true, datumZaplaceni: '2026-02-11', poznamka: '',
  },
  {
    id: '2026-0003', cislo: '2026-0003', variabilniSymbol: '20260003',
    datum: '2026-02-28', datumSplatnosti: '2026-03-14',
    klient: { nazev: 'PLASTIA s.r.o.', ico: '60720981', dic: 'CZ60720981', adresa: 'Na Pankráci 332/14, 14000 Praha - Nusle', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 35000, celkem: 35000 }],
    celkemBezDph: 35000, dph: 0, celkemSDph: 35000,
    zaplaceno: true, datumZaplaceni: '2026-03-14', poznamka: '',
  },
  {
    id: '2026-0006', cislo: '2026-0006', variabilniSymbol: '20260006',
    datum: '2026-03-02', datumSplatnosti: '2026-03-12',
    klient: { nazev: 'LINKMAN MEDIA s.r.o.', ico: '27249492', dic: 'CZ27249492', adresa: 'Na Šťáhlavce 1105/16, 16000 Praha - Dejvice', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 2550, celkem: 2550 }],
    celkemBezDph: 2550, dph: 0, celkemSDph: 2550,
    zaplaceno: true, datumZaplaceni: '2026-03-12', poznamka: '',
  },
  {
    id: '2026-0009', cislo: '2026-0009', variabilniSymbol: '20260009',
    datum: '2026-03-31', datumSplatnosti: '2026-04-14',
    klient: { nazev: 'PLASTIA s.r.o.', ico: '60720981', dic: 'CZ60720981', adresa: 'Na Pankráci 332/14, 14000 Praha - Nusle', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 35000, celkem: 35000 }],
    celkemBezDph: 35000, dph: 0, celkemSDph: 35000,
    zaplaceno: true, datumZaplaceni: '2026-04-14', poznamka: '',
  },
  {
    id: '2026-0010', cislo: '2026-0010', variabilniSymbol: '20260010',
    datum: '2026-04-20', datumSplatnosti: '2026-04-30',
    klient: { nazev: 'LINKMAN MEDIA s.r.o.', ico: '27249492', dic: 'CZ27249492', adresa: 'Na Šťáhlavce 1105/16, 16000 Praha - Dejvice', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 7905, celkem: 7905 }],
    celkemBezDph: 7905, dph: 0, celkemSDph: 7905,
    zaplaceno: true, datumZaplaceni: '2026-04-27', poznamka: '',
  },
  {
    id: '2026-0011', cislo: '2026-0011', variabilniSymbol: '20260011',
    datum: '2026-04-27', datumSplatnosti: '2026-05-07',
    klient: { nazev: 'Destinační společnost Tepna Vysočiny, z. s.', ico: '22523715', dic: 'CZ22523715', adresa: 'Divadelní 1365/4, 58601 Jihlava', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 17000, celkem: 17000 }],
    celkemBezDph: 17000, dph: 0, celkemSDph: 17000,
    zaplaceno: true, datumZaplaceni: '2026-05-04', poznamka: '',
  },
  {
    id: '2026-0012', cislo: '2026-0012', variabilniSymbol: '20260012',
    datum: '2026-04-30', datumSplatnosti: '2026-05-14',
    klient: { nazev: 'PLASTIA s.r.o.', ico: '60720981', dic: 'CZ60720981', adresa: 'Na Pankráci 332/14, 14000 Praha - Nusle', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 42000, celkem: 42000 }],
    celkemBezDph: 42000, dph: 0, celkemSDph: 42000,
    zaplaceno: true, datumZaplaceni: '2026-05-14', poznamka: '',
  },
  {
    id: '2026-0013', cislo: '2026-0013', variabilniSymbol: '20260013',
    datum: '2026-05-29', datumSplatnosti: '2026-06-28',
    klient: { nazev: 'České Budějovice - Evropské hlavní město kultury 2028, z.ú.', ico: '19311052', dic: 'CZ19311052', adresa: 'nám. Přemysla Otakara II. 1/1, 37001 České Budějovice', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 5500, celkem: 5500 }],
    celkemBezDph: 5500, dph: 0, celkemSDph: 5500,
    zaplaceno: true, datumZaplaceni: '2026-06-28', poznamka: '',
  },
  {
    id: '2026-0014', cislo: '2026-0014', variabilniSymbol: '20260014',
    datum: '2026-05-29', datumSplatnosti: '2026-06-08',
    klient: { nazev: 'Goat Labs s.r.o.', ico: '17709288', dic: '', adresa: 'Nové sady 988/2, 60200 Brno', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 18905, celkem: 18905 }],
    celkemBezDph: 18905, dph: 0, celkemSDph: 18905,
    zaplaceno: true, datumZaplaceni: '2026-06-08', poznamka: '',
  },
  {
    id: '2026-0015', cislo: '2026-0015', variabilniSymbol: '20260015',
    datum: '2026-05-31', datumSplatnosti: '2026-06-14',
    klient: { nazev: 'PLASTIA s.r.o.', ico: '60720981', dic: 'CZ60720981', adresa: 'Na Pankráci 332/14, 14000 Praha - Nusle', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 42000, celkem: 42000 }],
    celkemBezDph: 42000, dph: 0, celkemSDph: 42000,
    zaplaceno: true, datumZaplaceni: '2026-06-14', poznamka: '',
  },
  {
    id: '2026-0016', cislo: '2026-0016', variabilniSymbol: '20260016',
    datum: '2026-06-08', datumSplatnosti: '2026-06-18',
    klient: { nazev: 'LINKMAN MEDIA s.r.o.', ico: '27249492', dic: 'CZ27249492', adresa: 'Na Šťáhlavce 1105/16, 16000 Praha - Dejvice', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 7480, celkem: 7480 }],
    celkemBezDph: 7480, dph: 0, celkemSDph: 7480,
    zaplaceno: true, datumZaplaceni: '2026-06-18', poznamka: '',
  },
  {
    id: '2026-0017', cislo: '2026-0017', variabilniSymbol: '20260017',
    datum: '2026-06-30', datumSplatnosti: '2026-07-14',
    klient: { nazev: 'PLASTIA s.r.o.', ico: '60720981', dic: 'CZ60720981', adresa: 'Na Pankráci 332/14, 14000 Praha - Nusle', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 42000, celkem: 42000 }],
    celkemBezDph: 42000, dph: 0, celkemSDph: 42000,
    zaplaceno: true, datumZaplaceni: '2026-07-14', poznamka: '',
  },
  {
    id: '2026-0018', cislo: '2026-0018', variabilniSymbol: '20260018',
    datum: '2026-07-09', datumSplatnosti: '2026-07-19',
    klient: { nazev: 'Goat Labs s.r.o.', ico: '17709288', dic: '', adresa: 'Nové sady 988/2, 60200 Brno', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 3515, celkem: 3515 }],
    celkemBezDph: 3515, dph: 0, celkemSDph: 3515,
    zaplaceno: true, datumZaplaceni: '2026-07-19', poznamka: '',
  },
  {
    id: '2026-0019', cislo: '2026-0019', variabilniSymbol: '20260019',
    datum: '2026-07-31', datumSplatnosti: '2026-08-14',
    klient: { nazev: 'PLASTIA s.r.o.', ico: '60720981', dic: 'CZ60720981', adresa: 'Na Pankráci 332/14, 14000 Praha - Nusle', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 42000, celkem: 42000 }],
    celkemBezDph: 42000, dph: 0, celkemSDph: 42000,
    zaplaceno: true, datumZaplaceni: '2026-08-14', poznamka: '',
  },
  {
    id: '2026-0021', cislo: '2026-0021', variabilniSymbol: '20260021',
    datum: '2026-08-31', datumSplatnosti: '2026-09-14',
    klient: { nazev: 'PLASTIA s.r.o.', ico: '60720981', dic: 'CZ60720981', adresa: 'Na Pankráci 332/14, 14000 Praha - Nusle', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 42000, celkem: 42000 }],
    celkemBezDph: 42000, dph: 0, celkemSDph: 42000,
    zaplaceno: true, datumZaplaceni: '2026-09-14', poznamka: '',
  },
  {
    id: '2026-0020', cislo: '2026-0020', variabilniSymbol: '20260020',
    datum: '2026-09-10', datumSplatnosti: '2026-10-01',
    klient: { nazev: 'České Budějovice - Evropské hlavní město kultury 2028, z.ú.', ico: '19311052', dic: 'CZ19311052', adresa: 'nám. Přemysla Otakara II. 1/1, 37001 České Budějovice', email: '' },
    polozky: [{ popis: 'Služby', mnozstvi: 1, jednotka: 'ks', cenaJednotka: 17700, celkem: 17700 }],
    celkemBezDph: 17700, dph: 0, celkemSDph: 17700,
    zaplaceno: false, datumZaplaceni: '', poznamka: '',
  },
];

async function redis(cmd, args) {
  const url = `${UPSTASH_URL}/${[cmd, ...args].map(encodeURIComponent).join('/')}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
  return r.json();
}

(async () => {
  console.log(`Nahrávám ${faktury.length} faktur do Redis...`);
  const idx = await redis('LRANGE', ['faktury:index', '0', '-1']);
  const existujici = new Set(idx.result ?? []);

  for (const f of faktury) {
    await redis('SET', [`faktura:${f.cislo}`, JSON.stringify(f)]);
    if (!existujici.has(f.cislo)) {
      await redis('LPUSH', ['faktury:index', f.cislo]);
      existujici.add(f.cislo);
    }
    process.stdout.write(` ${f.cislo}`);
  }
  console.log('\n✅ Hotovo! Jdi na kateriny.cz/fakturace');
})().catch(e => { console.error('Chyba:', e.message); process.exit(1); });
