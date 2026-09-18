#!/usr/bin/env node
/**
 * Import faktur z Fakturoid za rok 2026 do Upstash Redis
 *
 * Spuštění:
 *   FAKTUROID_TOKEN="tvůj-api-token" node scripts/import-fakturoid.mjs
 *
 * API token najdeš na: app.fakturoid.cz → jméno vpravo nahoře → Nastavení → API
 */

import { writeFileSync } from 'fs';

const EMAIL = 'vondrakovak@gmail.com';
const API_TOKEN = process.env.FAKTUROID_TOKEN || '';
const SLUG = 'katerinavondrakova';
const FAKTUROID_API = `https://app.fakturoid.cz/api/v2/accounts/${SLUG}`;
const UPSTASH_URL = 'https://lucky-hare-82542.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAAUJuAAIgcDI4MjYyNDA2OTcxMmI0MDgyODlkZTMzOTQwNDVlMmU5Yw';

if (!API_TOKEN) {
  console.error('❌ Chybí FAKTUROID_TOKEN. Spusť:');
  console.error('   FAKTUROID_TOKEN="tvůj-token" node scripts/import-fakturoid.mjs');
  console.error('\nAPI token najdeš na: app.fakturoid.cz → jméno vpravo nahoře → Nastavení → API');
  process.exit(1);
}

const AUTH = 'Basic ' + Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');
const HEADERS = {
  Authorization: AUTH,
  'User-Agent': 'kateriny-cz-import (vondrakovak@gmail.com)',
};

// ── 1. Stažení faktur z Fakturoid ─────────────────────────────────────────────

async function fetchFaktury() {
  const faktury = [];
  let page = 1;

  while (true) {
    const resp = await fetch(
      `${FAKTUROID_API}/invoices.json?since=2026-01-01&page=${page}`,
      { headers: HEADERS }
    );
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Fakturoid API ${resp.status}: ${text}`);
    }
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) break;

    const rok2026 = data.filter(f => f.issued_on?.startsWith('2026'));
    faktury.push(...rok2026);

    if (data.some(f => (f.issued_on ?? '') < '2026-01-01')) break;
    page++;
  }

  return faktury;
}

// ── 2. Převod Fakturoid → náš formát ─────────────────────────────────────────

function convert(f) {
  const polozky = (f.lines ?? []).map(l => ({
    popis: l.name ?? '',
    mnozstvi: parseFloat(l.quantity) || 1,
    jednotka: l.unit_name ?? 'ks',
    cenaJednotka: parseFloat(l.unit_price) || 0,
    celkem: Math.round((parseFloat(l.quantity) || 1) * (parseFloat(l.unit_price) || 0) * 100) / 100,
  }));

  const celkemSDph = parseFloat(f.total) || 0;
  const dph = parseFloat(f.vat_rate) || 0;
  const celkemBezDph = dph > 0
    ? Math.round(celkemSDph / (1 + dph / 100) * 100) / 100
    : celkemSDph;

  const adresaCasti = [
    f.client_street,
    [f.client_zip, f.client_city].filter(Boolean).join(' '),
    f.client_country && f.client_country !== 'CZ' ? f.client_country : '',
  ].filter(Boolean);

  return {
    id: String(f.number),
    cislo: String(f.number),
    variabilniSymbol: String(f.variable_symbol || f.number).replace(/\D/g, ''),
    datum: f.issued_on ?? '',
    datumSplatnosti: f.due_on ?? '',
    klient: {
      nazev: f.client_name ?? '',
      ico: f.client_registration_no ?? '',
      dic: f.client_vat_no ?? '',
      adresa: adresaCasti.join(', '),
      email: f.client_email ?? '',
    },
    polozky,
    celkemBezDph,
    dph,
    celkemSDph,
    zaplaceno: f.status === 'paid',
    datumZaplaceni: f.paid_at ?? '',
    poznamka: f.note ?? '',
  };
}

// ── 3. Uložení do Upstash Redis ───────────────────────────────────────────────

async function redisCmd(cmd, args) {
  const url = `${UPSTASH_URL}/${[cmd, ...args].map(encodeURIComponent).join('/')}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  return resp.json();
}

async function saveToRedis(faktury) {
  console.log(`\n💾 Ukládám ${faktury.length} faktur do Redis...`);
  const idx = await redisCmd('LRANGE', ['faktury:index', '0', '-1']);
  const existujici = new Set(idx.result ?? []);

  for (const f of faktury) {
    await redisCmd('SET', [`faktura:${f.cislo}`, JSON.stringify(f)]);
    if (!existujici.has(f.cislo)) {
      await redisCmd('LPUSH', ['faktury:index', f.cislo]);
      existujici.add(f.cislo);
    }
    process.stdout.write('.');
  }
  console.log('\n✅ Hotovo!');
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log('📥 Stahuji faktury za rok 2026 z Fakturoid...');
  const raw = await fetchFaktury();
  console.log(`✅ Staženo ${raw.length} faktur.`);

  if (raw.length === 0) {
    console.log('ℹ️  Žádné faktury za rok 2026 nenalezeny.');
    return;
  }

  const faktury = raw.map(convert);

  writeFileSync('fakturoid-export.json', JSON.stringify(faktury, null, 2));
  console.log('📄 JSON záloha uložena: fakturoid-export.json');

  await saveToRedis(faktury);
})().catch(e => { console.error('❌ Chyba:', e.message); process.exit(1); });
