import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith('/fakturace')) {
    return next();
  }

  if (pathname === '/fakturace/login') {
    return next();
  }

  const session = context.cookies.get('fakturace_session');
  if (session?.value === 'authenticated') {
    return next();
  }

  return context.redirect('/fakturace/login');
});
