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
 */
export async function deleteCloudinaryImage(env, publicId) {
  if (!publicId) return;

  const cloudName = env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Cloudinary deletion skipped: missing cloud name / API key / API secret env vars.');
    return;
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

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`Cloudinary deletion failed (${response.status}): ${body}`);
    }
  } catch (err) {
    console.error('Cloudinary deletion request failed:', err);
  }
}
