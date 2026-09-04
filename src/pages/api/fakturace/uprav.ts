export const prerender = false;

import type { APIRoute } from 'astro';
import { getFaktura, updateFaktura, deleteFaktura, saveFaktura } from '../../../lib/fakturace/kv';
import type { Faktura, Polozka } from '../../../lib/fakturace/types';

export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();
  const puvodniCislo = data.get('puvodniCislo')?.toString() ?? '';
  const noveCislo = data.get('cislo')?.toString() ?? '';

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

  const puvodna = await getFaktura(puvodniCislo);

  const faktura: Faktura = {
    id: noveCislo,
    cislo: noveCislo,
    variabilniSymbol: data.get('variabilniSymbol')?.toString() ?? noveCislo.replace(/\D/g, ''),
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
    zaplaceno: puvodna?.zaplaceno ?? false,
    datumZaplaceni: puvodna?.datumZaplaceni,
    poznamka: data.get('poznamka')?.toString() ?? '',
  };

  // Pokud se změnilo číslo, smaž starou a ulož novou
  if (puvodniCislo !== noveCislo) {
    await deleteFaktura(puvodniCislo);
    await saveFaktura(faktura);
  } else {
    await updateFaktura(faktura);
  }

  return redirect(`/fakturace/${encodeURIComponent(noveCislo)}`);
};
