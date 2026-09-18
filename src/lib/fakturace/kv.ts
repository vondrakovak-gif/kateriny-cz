import type { Faktura } from './types';

const PREFIX = 'faktura:';
const INDEX_KEY = 'faktury:index';

function getConfig() {
  const url = (import.meta.env.KV_REST_API_URL || import.meta.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const token = import.meta.env.KV_REST_API_TOKEN || import.meta.env.UPSTASH_REDIS_REST_TOKEN || '';
  if (!url || !token) throw new Error('KV_REST_API_URL nebo KV_REST_API_TOKEN není nastaveno');
  return { url, token };
}

async function redis<T>(cmd: string, args: (string | number)[]): Promise<T> {
  const { url, token } = getConfig();
  const parts = [cmd, ...args].map(a => encodeURIComponent(String(a)));
  const resp = await fetch(`${url}/${parts.join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Redis HTTP ${resp.status}: ${await resp.text()}`);
  const json = await resp.json() as { result: T; error?: string };
  if (json.error) throw new Error(`Redis error: ${json.error}`);
  return json.result;
}

export async function getFaktury(): Promise<Faktura[]> {
  const cisla = await redis<string[]>('LRANGE', [INDEX_KEY, 0, -1]);
  if (!cisla?.length) return [];
  const faktury = await Promise.all(cisla.map(c => redis<string | null>('GET', [`${PREFIX}${c}`])));
  return faktury
    .filter((v): v is string => typeof v === 'string')
    .map(v => JSON.parse(v) as Faktura);
}

export async function getFaktura(cislo: string): Promise<Faktura | null> {
  const raw = await redis<string | null>('GET', [`${PREFIX}${cislo}`]);
  return raw ? JSON.parse(raw) as Faktura : null;
}

export async function saveFaktura(faktura: Faktura): Promise<void> {
  await redis('SET', [`${PREFIX}${faktura.cislo}`, JSON.stringify(faktura)]);
  const existujici = await redis<string[]>('LRANGE', [INDEX_KEY, 0, -1]);
  if (!existujici?.includes(faktura.cislo)) {
    await redis('LPUSH', [INDEX_KEY, faktura.cislo]);
  }
}

export async function updateFaktura(faktura: Faktura): Promise<void> {
  await redis('SET', [`${PREFIX}${faktura.cislo}`, JSON.stringify(faktura)]);
}

export async function deleteFaktura(cislo: string): Promise<void> {
  await redis('DEL', [`${PREFIX}${cislo}`]);
  await redis('LREM', [INDEX_KEY, 0, cislo]);
}

export async function updateZaplaceno(cislo: string, zaplaceno: boolean, datum?: string): Promise<void> {
  const faktura = await getFaktura(cislo);
  if (!faktura) return;
  faktura.zaplaceno = zaplaceno;
  faktura.datumZaplaceni = datum ?? '';
  await redis('SET', [`${PREFIX}${cislo}`, JSON.stringify(faktura)]);
}
