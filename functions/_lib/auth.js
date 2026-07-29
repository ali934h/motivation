// Shared authentication helpers used across Pages Functions.
// Uses the Web Crypto API available in the Cloudflare Workers runtime.

const ENCODER = new TextEncoder();

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomHex(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

export function generateSalt() {
  return randomHex(16);
}

export function generateSessionToken() {
  return randomHex(32);
}

export async function hashPassword(password, salt) {
  const data = ENCODER.encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(digest);
}

export async function verifyPassword(password, salt, expectedHash) {
  const computed = await hashPassword(password, salt);
  // Constant-time-ish comparison to reduce timing side channels.
  if (computed.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

export function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const cookies = {};
  header.split(';').forEach((part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return;
    cookies[key] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

export function buildSessionCookie(token, maxAgeSeconds) {
  return `motivation_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function buildExpiredSessionCookie() {
  return 'motivation_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export async function getSession(request, env) {
  const cookies = parseCookies(request);
  const token = cookies['motivation_session'];
  if (!token) return null;
  const raw = await env.MOTIVATION_KV.get(`auth:session:${token}`);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (session.expiresAt < Date.now()) {
      await env.MOTIVATION_KV.delete(`auth:session:${token}`);
      return null;
    }
    return { token, ...session };
  } catch {
    return null;
  }
}

export function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes

export async function checkRateLimit(env, ip) {
  const key = `auth:ratelimit:${ip}`;
  const raw = await env.MOTIVATION_KV.get(key);
  const now = Date.now();
  if (!raw) return { allowed: true };
  const data = JSON.parse(raw);
  if (data.resetAt < now) return { allowed: true };
  if (data.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((data.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

export async function recordFailedAttempt(env, ip) {
  const key = `auth:ratelimit:${ip}`;
  const raw = await env.MOTIVATION_KV.get(key);
  const now = Date.now();
  let data;
  if (!raw) {
    data = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 };
  } else {
    const existing = JSON.parse(raw);
    if (existing.resetAt < now) {
      data = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 };
    } else {
      data = { count: existing.count + 1, resetAt: existing.resetAt };
    }
  }
  await env.MOTIVATION_KV.put(key, JSON.stringify(data), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
  });
}

export async function clearRateLimit(env, ip) {
  await env.MOTIVATION_KV.delete(`auth:ratelimit:${ip}`);
}

export function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}
