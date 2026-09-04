export const prerender = false;

import type { APIRoute } from 'astro';
import { getFaktury } from '../../../lib/fakturace/kv';

export const GET: APIRoute = async ({ url }) => {
  const od = url.searchParams.get('od') ?? '';
  const do_ = url.searchParams.get('do') ?? '';

  let faktury = await getFaktury();

  if (od) faktury = faktury.filter(f => f.datum >= od);
  if (do_) faktury = faktury.filter(f => f.datum <= do_);

  faktury.sort((a, b) => a.cislo.localeCompare(b.cislo));

  const hlavicka = ['Číslo', 'Datum', 'Splatnost', 'Klient', 'IČO', 'Položky', 'Základ', 'DPH %', 'Celkem s DPH', 'Zaplaceno', 'Datum zaplacení', 'Poznámka'];

  const radky = faktury.map(f => [
    f.cislo,
    f.datum,
    f.datumSplatnosti,
    f.klient.nazev,
    f.klient.ico,
    f.polozky.map(p => `${p.mnozstvi} ${p.jednotka} × ${p.popis}`).join(' | '),
    String(f.celkemBezDph).replace('.', ','),
    String(f.dph),
    String(f.celkemSDph).replace('.', ','),
    f.zaplaceno ? 'ANO' : 'NE',
    f.datumZaplaceni ?? '',
    f.poznamka ?? '',
  ]);

  const csv = [hlavicka, ...radky]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const bom = '\uFEFF'; // BOM pro správné zobrazení v Excelu
  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="faktury${od ? `-${od}` : ''}${do_ ? `-${do_}` : ''}.csv"`,
    },
  });
};
