export const prerender = false;

import type { APIRoute } from 'astro';
import { updateZaplaceno } from '../../../lib/fakturace/sheets';

export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();
  const cislo = data.get('cislo')?.toString() ?? '';
  const zaplaceno = data.get('zaplaceno') === 'true';
  const datum = zaplaceno ? new Date().toISOString().split('T')[0] : '';

  try {
    await updateZaplaceno(cislo, zaplaceno, datum);
  } catch (e) {
    console.error('Chyba při aktualizaci stavu:', e);
  }

  return redirect('/fakturace');
};
