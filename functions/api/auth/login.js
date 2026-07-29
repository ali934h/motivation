import {
  jsonResponse,
  verifyPassword,
  generateSessionToken,
  buildSessionCookie,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  getClientIp,
} from '../../_lib/auth.js';

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function onRequestPost(context) {
  const { request, env } = context;
  const ip = getClientIp(request);

  const rateLimit = await checkRateLimit(env, ip);
  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        error: `Too many failed attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, { status: 400 });
  }

  const { password } = body;
  if (typeof password !== 'string' || password.length === 0) {
    return jsonResponse({ error: 'Password is required' }, { status: 400 });
  }

  const record = await env.MOTIVATION_KV.get('auth:password_hash');
  if (!record) {
    return jsonResponse({ error: 'No password has been set up yet' }, { status: 400 });
  }

  const { hash, salt } = JSON.parse(record);
  const isValid = await verifyPassword(password, salt, hash);

  if (!isValid) {
    await recordFailedAttempt(env, ip);
    return jsonResponse({ error: 'Incorrect password' }, { status: 401 });
  }

  await clearRateLimit(env, ip);

  const ttlSeconds = Number(env.SESSION_TTL_SECONDS) || DEFAULT_SESSION_TTL_SECONDS;
  const token = generateSessionToken();
  const session = {
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlSeconds * 1000,
  };

  await env.MOTIVATION_KV.put(`auth:session:${token}`, JSON.stringify(session), {
    expirationTtl: ttlSeconds,
  });

  return jsonResponse(
    { success: true },
    { headers: { 'Set-Cookie': buildSessionCookie(token, ttlSeconds) } }
  );
}
