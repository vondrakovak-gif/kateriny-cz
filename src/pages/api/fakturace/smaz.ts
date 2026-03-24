export const prerender = false;

import type { APIRoute } from 'astro';
import { deleteFaktura } from '../../../lib/fakturace/kv';

export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();
  const cislo = data.get('cislo')?.toString() ?? '';
  if (cislo) await deleteFaktura(cislo);
  return redirect('/fakturace');
};
