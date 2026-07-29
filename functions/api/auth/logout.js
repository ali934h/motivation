import { jsonResponse, buildExpiredSessionCookie, parseCookies } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const token = cookies['motivation_session'];
  if (token) {
    await env.MOTIVATION_KV.delete(`auth:session:${token}`);
  }
  return jsonResponse(
    { success: true },
    { headers: { 'Set-Cookie': buildExpiredSessionCookie() } }
  );
}
