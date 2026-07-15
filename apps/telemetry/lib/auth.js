import crypto from 'node:crypto';

/** Constant-time token compare. Accepts `?token=` or `Authorization: Bearer …`. */
export function tokenFrom(req) {
  const auth = req.headers?.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  try {
    return new URL(req.url, 'http://localhost').searchParams.get('token') || '';
  } catch {
    return '';
  }
}

export function tokenOk(given, expected) {
  if (!expected || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  // timingSafeEqual throws on length mismatch, so the length check is required —
  // it leaks length only, which is not the secret.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
