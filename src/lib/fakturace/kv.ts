import { kv } from '@vercel/kv';
import type { Faktura } from './types';

const PREFIX = 'faktura:';
const INDEX_KEY = 'faktury:index';

export async function getFaktury(): Promise<Faktura[]> {
  const cisla: string[] = (await kv.lrange(INDEX_KEY, 0, -1)) ?? [];
  if (cisla.length === 0) return [];
  const faktury = await Promise.all(cisla.map(c => kv.get<Faktura>(`${PREFIX}${c}`)));
  return faktury.filter(Boolean) as Faktura[];
}

export async function getFaktura(cislo: string): Promise<Faktura | null> {
  return kv.get<Faktura>(`${PREFIX}${cislo}`);
}

export async function saveFaktura(faktura: Faktura): Promise<void> {
  await kv.set(`${PREFIX}${faktura.cislo}`, faktura);
  // přidat do indexu jen pokud tam ještě není
  const existujici: string[] = (await kv.lrange(INDEX_KEY, 0, -1)) ?? [];
  if (!existujici.includes(faktura.cislo)) {
    await kv.lpush(INDEX_KEY, faktura.cislo);
  }
}

export async function updateZaplaceno(cislo: string, zaplaceno: boolean, datum?: string): Promise<void> {
  const faktura = await getFaktura(cislo);
  if (!faktura) return;
  faktura.zaplaceno = zaplaceno;
  faktura.datumZaplaceni = datum ?? '';
  await kv.set(`${PREFIX}${cislo}`, faktura);
}
