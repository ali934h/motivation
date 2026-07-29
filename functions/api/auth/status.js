import { jsonResponse } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const { env } = context;
  const record = await env.MOTIVATION_KV.get('auth:password_hash');
  return jsonResponse({ passwordSet: Boolean(record) });
}
