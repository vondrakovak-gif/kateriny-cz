import { Redis } from '@upstash/redis';
import type { Faktura } from './types';

function getRedis() {
  const url = import.meta.env.KV_REST_API_URL || import.meta.env.UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.KV_REST_API_TOKEN || import.meta.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('KV_REST_API_URL a KV_REST_API_TOKEN nejsou nastaveny v .env');
  }
  return new Redis({ url, token });
}

const PREFIX = 'faktura:';
const INDEX_KEY = 'faktury:index';

export async function getFaktury(): Promise<Faktura[]> {
  const redis = getRedis();
  const cisla: string[] = (await redis.lrange(INDEX_KEY, 0, -1)) ?? [];
  if (cisla.length === 0) return [];
  const faktury = await Promise.all(cisla.map(c => redis.get<Faktura>(`${PREFIX}${c}`)));
  return faktury.filter(Boolean) as Faktura[];
}

export async function getFaktura(cislo: string): Promise<Faktura | null> {
  const redis = getRedis();
  return redis.get<Faktura>(`${PREFIX}${cislo}`);
}

export async function saveFaktura(faktura: Faktura): Promise<void> {
  const redis = getRedis();
  await redis.set(`${PREFIX}${faktura.cislo}`, faktura);
  const existujici: string[] = (await redis.lrange(INDEX_KEY, 0, -1)) ?? [];
  if (!existujici.includes(faktura.cislo)) {
    await redis.lpush(INDEX_KEY, faktura.cislo);
  }
}

export async function updateZaplaceno(cislo: string, zaplaceno: boolean, datum?: string): Promise<void> {
  const redis = getRedis();
  const faktura = await getFaktura(cislo);
  if (!faktura) return;
  faktura.zaplaceno = zaplaceno;
  faktura.datumZaplaceni = datum ?? '';
  await redis.set(`${PREFIX}${cislo}`, faktura);
}
