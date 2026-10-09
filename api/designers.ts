import { createClient } from '@supabase/supabase-js';
import { hasValidSession, isSameOrigin } from '../server/session.js';

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function database() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('Server-side Supabase settings are missing.');
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
function editableFields(body: Record<string, unknown>) {
  const fields = ['nome','curto','funcao','email','admissao','squad','clientes','formacao','gostos','entregas','teto','simultaneo','processo','ferramentas','briefings','interesses','interessesTxt','desenvolver','desenvolverTxt','obs'];
  return Object.fromEntries(fields.filter(key => key in body).map(key => [key, key === 'admissao' && body[key] === '' ? null : body[key]]));
}

export async function GET(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  try {
    const { data, error } = await database().from('designers').select('*').order('nome');
    if (error) return reply({ error: 'Não foi possível carregar os perfis.' }, 500);
    return reply(data);
  } catch { return reply({ error: 'O acesso ao banco não está configurado na Vercel.' }, 503); }
}

export async function POST(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.nome !== 'string' || !body.nome.trim()) return reply({ error: 'Informe o nome do designer.' }, 400);
    const { data, error } = await database().from('designers').insert(editableFields(body)).select().single();
    if (error) return reply({ error: 'Não foi possível salvar o perfil.' }, 400);
    return reply(data, 201);
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}

export async function PATCH(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.id !== 'string' || !body.id) return reply({ error: 'Perfil inválido.' }, 400);
    const { data, error } = await database().from('designers').update(editableFields(body)).eq('id', body.id).select().single();
    if (error) return reply({ error: 'Não foi possível atualizar o perfil.' }, 400);
    return reply(data);
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}

export async function DELETE(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const { id } = await request.json() as { id?: string };
    if (!id) return reply({ error: 'Perfil inválido.' }, 400);
    const { error } = await database().from('designers').delete().eq('id', id);
    if (error) return reply({ error: 'Não foi possível excluir o perfil.' }, 400);
    return reply({ ok: true });
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}
