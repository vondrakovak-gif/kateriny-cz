export const prerender = false;

import type { APIRoute } from 'astro';
import { saveFaktura } from '../../../lib/fakturace/kv';
import type { Faktura, Polozka } from '../../../lib/fakturace/types';

export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();

  const popisy = data.getAll('popis[]').map(String);
  const mnozstvi = data.getAll('mnozstvi[]').map(v => parseFloat(String(v)) || 0);
  const jednotky = data.getAll('jednotka[]').map(String);
  const ceny = data.getAll('cenaJednotka[]').map(v => parseFloat(String(v)) || 0);

  const polozky: Polozka[] = popisy.map((popis, i) => ({
    popis,
    mnozstvi: mnozstvi[i],
    jednotka: jednotky[i],
    cenaJednotka: ceny[i],
    celkem: Math.round(mnozstvi[i] * ceny[i] * 100) / 100,
  }));

  const cislo = data.get('cislo')?.toString() ?? '';
  const faktura: Faktura = {
    id: cislo,
    cislo,
    variabilniSymbol: data.get('variabilniSymbol')?.toString() ?? cislo.replace(/\D/g, ''),
    datum: data.get('datum')?.toString() ?? '',
    datumSplatnosti: data.get('datumSplatnosti')?.toString() ?? '',
    klient: {
      nazev: data.get('klientNazev')?.toString() ?? '',
      ico: data.get('klientIco')?.toString() ?? '',
      dic: data.get('klientDic')?.toString() ?? '',
      adresa: data.get('klientAdresa')?.toString() ?? '',
      email: data.get('klientEmail')?.toString() ?? '',
    },
    polozky,
    celkemBezDph: parseFloat(data.get('celkemBezDph')?.toString() ?? '0') || 0,
    dph: parseFloat(data.get('dph')?.toString() ?? '0') || 0,
    celkemSDph: parseFloat(data.get('celkemSDph')?.toString() ?? '0') || 0,
    zaplaceno: false,
    poznamka: data.get('poznamka')?.toString() ?? '',
  };

  try {
    await saveFaktura(faktura);
  } catch (e) {
    console.error('Chyba při ukládání do KV:', e);
  }

  return redirect(`/fakturace/${encodeURIComponent(faktura.cislo)}`);
};
