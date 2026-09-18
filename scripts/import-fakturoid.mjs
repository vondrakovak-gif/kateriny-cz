#!/usr/bin/env node
/**
 * Import faktur z Fakturoid za rok 2026 do Upstash Redis
 *
 * Spuštění:
 *   UPSTASH_URL="https://..." UPSTASH_TOKEN="..." node scripts/import-fakturoid.mjs
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';

const CLIENT_ID = 'd5d60e8694b97d42de891d0b7e681b074adce077';
const CLIENT_SECRET = 'aefcd6f329ff014f4aedadf1c76b0a8900eaddea';
const SLUG = 'katerinavondrakova';
const REDIRECT_PORT = 3456;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const FAKTUROID_API = `https://app.fakturoid.cz/api/v2/accounts/${SLUG}`;

const UPSTASH_URL = process.env.UPSTASH_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN;

// ── 1. OAuth2: získání access tokenu ──────────────────────────────────────────

async function getAccessToken() {
  const code = await getAuthCode();
  const resp = await fetch('https://app.fakturoid.cz/api/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'User-Agent': 'kateriny-cz-import (vondrakovak@gmail.com)',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!resp.ok) throw new Error(`Token error: ${resp.status} ${await resp.text()}`);
  const { access_token } = await resp.json();
  return access_token;
}

function getAuthCode() {
  return new Promise((resolve, reject) => {
    const url = `https://app.fakturoid.cz/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`;
    console.log('\n📋 Otevři tuto URL v prohlížeči a přihlas se:\n');
    console.log('  ' + url + '\n');

    // Pokus o automatické otevření prohlížeče
    const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    import('child_process').then(({ exec }) => exec(`${open} "${url}"`)).catch(() => {});

    const server = createServer((req, resHttp) => {
      const u = new URL(req.url, 'http://localhost');
      const code = u.searchParams.get('code');
      if (!code) { resHttp.end('Chybí code.'); return; }
      resHttp.end('<h2>✅ Autorizace proběhla. Můžeš zavřít tuto stránku.</h2>');
      server.close();
      resolve(code);
    });
    server.listen(REDIRECT_PORT, () => console.log(`⏳ Čekám na autorizaci na portu ${REDIRECT_PORT}...`));
    server.on('error', reject);
    setTimeout(() => { server.close(); reject(new Error('Timeout')); }, 120_000);
  });
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
    if (!resp.ok) throw new Error(`Faktury error: ${resp.status} ${await resp.text()}`);
    const data = await resp.json();
    if (!data.length) break;

    // Filtr: jen rok 2026
    const rok2026 = data.filter(f => f.issued_on?.startsWith('2026'));
    faktury.push(...rok2026);

    // Pokud jsou na stránce faktury starší než 2026, skončíme
    if (data.some(f => f.issued_on < '2026-01-01')) break;
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
  const celkemBezDph = dph > 0 ? Math.round(celkemSDph / (1 + dph / 100) * 100) / 100 : celkemSDph;

  const adresa = [f.client_street, `${f.client_zip} ${f.client_city}`, f.client_country !== 'CZ' ? f.client_country : '']
    .filter(Boolean).join(', ');

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

async function saveToRedis(faktury) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.log('\n⚠️  UPSTASH_URL nebo UPSTASH_TOKEN nejsou nastaveny.');
    console.log('   Faktury jsou uloženy do fakturoid-export.json');
    writeFileSync('fakturoid-export.json', JSON.stringify(faktury, null, 2));
    return;
  }

  console.log(`\n💾 Ukládám ${faktury.length} faktur do Redis...`);
  for (const f of faktury) {
    // SET faktura:{cislo}
    await redisCmd('SET', [`faktura:${f.cislo}`, JSON.stringify(f)]);
    // Přidat do indexu (pokud ještě není)
    const idx = await redisCmd('LRANGE', ['faktury:index', '0', '-1']);
    if (!idx.result?.includes(f.cislo)) {
      await redisCmd('LPUSH', ['faktury:index', f.cislo]);
    }
    process.stdout.write('.');
  }
  console.log('\n✅ Hotovo!');
}

async function redisCmd(cmd, args) {
  const resp = await fetch(`${UPSTASH_URL}/${[cmd, ...args].map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  return resp.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log('🔑 Přihlašování k Fakturoid...');
  const token = await getAccessToken();
  console.log('✅ Token získán.\n📥 Stahuji faktury za rok 2026...');

  const raw = await fetchFaktury(token);
  console.log(`✅ Staženo ${raw.length} faktur.`);

  const faktury = raw.map(convert);

  // Vždy uložit JSON zálohu
  writeFileSync('fakturoid-export.json', JSON.stringify(faktury, null, 2));
  console.log('📄 JSON záloha: fakturoid-export.json');

  await saveToRedis(faktury);
})().catch(e => { console.error('❌ Chyba:', e.message); process.exit(1); });
