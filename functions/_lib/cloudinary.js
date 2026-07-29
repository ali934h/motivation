// Helper for calling Cloudinary's signed Admin API to delete an uploaded
// image. This must run server-side (Pages Functions) because it needs the
// API Secret, which must never be exposed to the browser.

const ENCODER = new TextEncoder();

async function sha1Hex(input) {
  const digest = await crypto.subtle.digest('SHA-1', ENCODER.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deletes an image from Cloudinary by its public_id. Never throws — if
 * Cloudinary credentials are missing or the request fails, it logs and
 * returns quietly so a Cloudinary hiccup never blocks deleting/editing a
 * card in KV (the card is the source of truth for the app).
 *
 * Returns a small result object so callers/logs can tell what happened:
 * { ok: boolean, reason?: string }
 */
export async function deleteCloudinaryImage(env, publicId) {
  if (!publicId) return { ok: false, reason: 'no-public-id' };

  const cloudName = env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error(
      'Cloudinary deletion skipped: missing one or more of ' +
        'VITE_CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET. ' +
        'These must be set in Cloudflare Pages > Settings > Environment variables, ' +
        'AND the project must be redeployed after adding them — a new env var only ' +
        'takes effect on the next deployment, not retroactively.'
    );
    return { ok: false, reason: 'missing-env-vars' };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = await sha1Hex(paramsToSign + apiSecret);

  const formData = new URLSearchParams();
  formData.set('public_id', publicId);
  formData.set('api_key', apiKey);
  formData.set('timestamp', String(timestamp));
  formData.set('signature', signature);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      }
    );

    const body = await response.json().catch(() => null);

    // Cloudinary can return HTTP 200 with a body like { result: "not found" }
    // when the public_id doesn't match an existing asset — that's not an
    // HTTP error, so response.ok alone doesn't catch it.
    if (!response.ok || !body || body.result !== 'ok') {
      console.error(
        `Cloudinary deletion did not succeed for public_id "${publicId}" ` +
          `(HTTP ${response.status}): ${JSON.stringify(body)}`
      );
      return { ok: false, reason: body?.result || `http-${response.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error('Cloudinary deletion request failed:', err);
    return { ok: false, reason: 'request-failed' };
  }
}
