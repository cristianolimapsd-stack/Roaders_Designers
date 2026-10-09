import { createHash, timingSafeEqual } from 'node:crypto';
import { clearSessionCookie, createSessionCookie, hasValidSession, isSameOrigin } from '../server/session.js';

const reply = (body: unknown, status = 200, headers: HeadersInit = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const failedLogins = new Map<string, { count: number; resetAt: number }>();

export function GET(request: Request) {
  return reply({ authenticated: hasValidSession(request) });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  const configured = process.env.ACCESS_PASSWORD;
  if (!configured || configured.length < 12) return reply({ error: 'Senha compartilhada não configurada (mínimo: 12 caracteres).' }, 503);
  let password = '';
  try { password = String((await request.json()).password ?? ''); }
  catch { return reply({ error: 'Dados inválidos.' }, 400); }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const current = failedLogins.get(ip);
  if (current && current.resetAt > Date.now() && current.count >= 8) return reply({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, 429);
  const expected = createHash('sha256').update(configured).digest();
  const provided = createHash('sha256').update(password).digest();
  if (!timingSafeEqual(expected, provided)) {
    const next = current && current.resetAt > Date.now() ? current : { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
    failedLogins.set(ip, { ...next, count: next.count + 1 });
    return reply({ error: 'Senha incorreta.' }, 401);
  }
  failedLogins.delete(ip);
  try { return reply({ authenticated: true }, 200, { 'Set-Cookie': createSessionCookie() }); }
  catch { return reply({ error: 'A sessão segura não está configurada.' }, 503); }
}

export function DELETE(request: Request) {
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  return reply({ authenticated: false }, 200, { 'Set-Cookie': clearSessionCookie() });
}
