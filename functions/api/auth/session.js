import { jsonResponse } from '../../_lib/auth.js';

// Reaching this handler means _middleware.js already validated the
// session (this route is not in PUBLIC_ROUTES), so if we're here the
// user is authenticated.
export async function onRequestGet(context) {
  return jsonResponse({ authenticated: true, session: context.data.session });
}
