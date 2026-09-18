#!/usr/bin/env node
/**
 * Import faktur z Fakturoid za rok 2026 do Upstash Redis
 * Používá OAuth2 Client Credentials Flow
 *
 * Spuštění (ve složce kateriny-cz):
 *   node scripts/import-fakturoid.mjs
 */

import { writeFileSync } from 'fs';

const CLIENT_ID     = 'd5d60e8694b97d42de891d0b7e681b074adce077';
const CLIENT_SECRET = 'aefcd6f329ff014f4aedadf1c76b0a8900eaddea';
const SLUG          = 'katerinavondrakova';
const FAKTUROID_API = `https://app.fakturoid.cz/api/v2/accounts/${SLUG}`;
const TOKEN_URL     = 'https://app.fakturoid.cz/api/v2/oauth/token';
const UPSTASH_URL   = 'https://lucky-hare-82542.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAAUJuAAIgcDI4MjYyNDA2OTcxMmI0MDgyODlkZTMzOTQwNDVlMmU5Yw';

// ── 1. Získání access tokenu (Client Credentials) ─────────────────────────────

async function getToken() {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'User-Agent': 'kateriny-cz-import (vondrakovak@gmail.com)',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  if (!resp.ok) throw new Error(`Token error ${resp.status}: ${await resp.text()}`);
  const { access_token } = await resp.json();
  return access_token;
}

// ── 2. Stažení faktur z Fakturoid ─────────────────────────────────────────────

async function fetchFaktury(token) {
  const faktury = [];
  let page = 1;

  while (true) {
    const resp = await fetch(
      `${FAKTUROID_API}/invoices.json?since=2026-01-01&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'kateriny-cz-import (vondrakovak@gmail.com)',
        },
      }
    );
    if (!resp.ok) throw new Error(`Faktury ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) break;

    faktury.push(...data.filter(f => f.issued_on?.startsWith('2026')));
    if (data.some(f => (f.issued_on ?? '') < '2026-01-01')) break;
    page++;
  }

  return faktury;
}

// ── 3. Převod Fakturoid → náš formát ─────────────────────────────────────────

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

  const adresa = [
    f.client_street,
    [f.client_zip, f.client_city].filter(Boolean).join(' '),
    f.client_country && f.client_country !== 'CZ' ? f.client_country : '',
  ].filter(Boolean).join(', ');

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
      adresa,
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

// ── 4. Uložení do Upstash Redis ───────────────────────────────────────────────

async function redisCmd(cmd, args) {
  const url = `${UPSTASH_URL}/${[cmd, ...args].map(encodeURIComponent).join('/')}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
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
  console.log('\n✅ Faktury uloženy do Redis!');
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log('🔑 Získávám přístupový token z Fakturoid...');
  const token = await getToken();
  console.log('✅ Token OK\n📥 Stahuji faktury za rok 2026...');

  const raw = await fetchFaktury(token);
  console.log(`✅ Staženo: ${raw.length} faktur`);

  if (raw.length === 0) {
    console.log('ℹ️  Žádné faktury za rok 2026 nenalezeny.');
    return;
  }

  const faktury = raw.map(convert);
  writeFileSync('fakturoid-export.json', JSON.stringify(faktury, null, 2));
  console.log('📄 Záloha: fakturoid-export.json');

  await saveToRedis(faktury);
  console.log(`\n🎉 Hotovo! ${faktury.length} faktur je nyní v systému na kateriny.cz/fakturace`);
})().catch(e => { console.error('❌ Chyba:', e.message); process.exit(1); });
