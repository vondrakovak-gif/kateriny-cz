export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const data = await request.formData();
  const username = data.get('username')?.toString() ?? '';
  const password = data.get('password')?.toString() ?? '';

  const validUsername = import.meta.env.FAKTURACE_USERNAME;
  const validPassword = import.meta.env.FAKTURACE_PASSWORD;

  if (username === validUsername && password === validPassword) {
    cookies.set('fakturace_session', 'authenticated', {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dní
    });
    return redirect('/fakturace');
  }

  return redirect('/fakturace/login?error=1');
};
