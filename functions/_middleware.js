// Runs before every request to the site (Cloudflare Pages applies a root
// _middleware.js to all routes, not just /api/*), so the very first thing
// this does is let anything outside /api/* through untouched — that's the
// React SPA route (including the secret panel path) and static assets.
//
// For /api/* requests, it enforces the hidden panel secret header and
// attaches the session (if any) to the request context, so downstream
// handlers can check it.

import { getSession, jsonResponse } from './_lib/auth.js';

// Routes that never require an existing session (they establish one).
const PUBLIC_ROUTES = new Set([
  '/api/auth/status', // tells the client whether a password has been set
  '/api/auth/setup',
  '/api/auth/login',
]);

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Anything that isn't an API call (the SPA page itself, JS/CSS assets,
  // etc.) should pass through untouched.
  if (!url.pathname.startsWith('/api/')) {
    return next();
  }

  // Verify the secret panel header on every API request. The front-end
  // sends this header (read from VITE_PANEL_PATH) on all fetches; it acts
  // as a shared secret so simply guessing the API path isn't enough.
  const providedSecret = request.headers.get('X-Panel-Secret');
  if (!env.PANEL_SECRET_PATH || providedSecret !== env.PANEL_SECRET_PATH) {
    return jsonResponse({ error: 'Not found' }, { status: 404 });
  }

  if (PUBLIC_ROUTES.has(url.pathname)) {
    return next();
  }

  const session = await getSession(request, env);
  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }
  context.data = context.data || {};
  context.data.session = session;

  return next();
}
