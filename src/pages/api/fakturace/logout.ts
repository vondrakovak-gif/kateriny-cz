export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('fakturace_session', { path: '/' });
  return redirect('/fakturace/login');
};
