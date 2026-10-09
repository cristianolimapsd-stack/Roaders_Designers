import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'road_access';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function signature(expires: string) {
  const secret = process.env.SESSION_SECRET;
  const password = process.env.ACCESS_PASSWORD;
  if (!secret || secret.length < 32 || !password || password.length < 12) throw new Error('Session secrets are not configured.');
  return createHmac('sha256', `${secret}:${password}`).update(expires).digest('base64url');
}

export function createSessionCookie() {
  const expires = String(Date.now() + SESSION_MS);
  const value = `${expires}.${signature(expires)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function hasValidSession(request: Request) {
  try {
    const pair = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE_NAME}=`));
    if (!pair) return false;
    const value = pair.slice(COOKIE_NAME.length + 1);
    const [expires, supplied] = value.split('.');
    if (!expires || !supplied || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
    const expected = Buffer.from(signature(expires));
    const provided = Buffer.from(supplied);
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  } catch { return false; }
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
