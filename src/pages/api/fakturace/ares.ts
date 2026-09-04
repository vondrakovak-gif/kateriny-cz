export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const ico = url.searchParams.get('ico')?.trim();
  if (!ico) {
    return new Response(JSON.stringify({ error: 'Zadej IČO' }), { status: 400 });
  }

  try {
    const res = await fetch(
      `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'IČO nenalezeno v ARES' }), { status: 404 });
    }

    const data = await res.json();

    const sidlo = data.sidlo;
    const adresaStr = [
      sidlo?.nazevUlice ? `${sidlo.nazevUlice} ${sidlo.cisloDomovni ?? ''}${sidlo.cisloOrientacni ? `/${sidlo.cisloOrientacni}` : ''}`.trim() : null,
      sidlo?.nazevObce,
      sidlo?.psc ? String(sidlo.psc).replace(/(\d{3})(\d{2})/, '$1 $2') : null,
    ].filter(Boolean).join(', ');

    return new Response(JSON.stringify({
      nazev: data.obchodniJmeno ?? '',
      ico: data.ico ?? ico,
      dic: data.dic ?? '',
      adresa: adresaStr,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Chyba při komunikaci s ARES' }), { status: 500 });
  }
};
