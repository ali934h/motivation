import { jsonResponse, generateSalt, hashPassword } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const existing = await env.MOTIVATION_KV.get('auth:password_hash');
  if (existing) {
    return jsonResponse({ error: 'Password has already been set' }, { status: 409 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, { status: 400 });
  }

  const { password } = body;
  if (typeof password !== 'string' || password.length < 8) {
    return jsonResponse(
      { error: 'Password must be at least 8 characters long' },
      { status: 400 }
    );
  }

  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  await env.MOTIVATION_KV.put(
    'auth:password_hash',
    JSON.stringify({ hash, salt })
  );

  return jsonResponse({ success: true });
}
