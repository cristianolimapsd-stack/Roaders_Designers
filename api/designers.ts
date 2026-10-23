import { hasValidSession, isSameOrigin } from '../server/session.js';
import { database } from '../server/database.js';

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const allowedNuclei = ['Núcleo A', 'Núcleo B', 'Núcleo CBF'];
const fields = ['nome', 'curto', 'funcao', 'email', 'admissao', 'squad', 'nucleo', 'foto_url', 'clientes', 'formacao', 'gostos', 'entregas', 'teto', 'simultaneo', 'processo', 'ferramentas', 'briefings', 'interesses', 'interessesTxt', 'desenvolver', 'desenvolverTxt', 'obs'];
function editableFields(body: Record<string, unknown>) {
  const result = Object.fromEntries(fields.filter(key => key in body).map(key => [key, key === 'admissao' && body[key] === '' ? null : body[key]]));
  return result;
}

export async function GET(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  try {
    const { data, error } = await database().from('designers').select('*').order('nome');
    if (error) { console.error('[api/designers] GET:', error.message, error.code); return reply({ error: 'Não foi possível carregar os perfis.' }, 500); }
    return reply(data);
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}

export async function POST(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.nome !== 'string' || !body.nome.trim()) return reply({ error: 'Informe o nome do designer.' }, 400);
    if (body.nucleo !== undefined && !allowedNuclei.includes(String(body.nucleo))) return reply({ error: 'Selecione um núcleo válido.' }, 400);
    const { data, error } = await database().from('designers').insert(editableFields(body)).select().single();
    if (error) { console.error('[api/designers] POST:', error.message, error.code); return reply({ error: 'Não foi possível salvar o perfil.' }, 400); }
    return reply(data, 201);
  } catch (e) { return reply({ error: e instanceof Error ? e.message : 'Não foi possível conectar ao banco.' }, 503); }
}

export async function PATCH(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.id !== 'string' || !body.id) return reply({ error: 'Perfil inválido.' }, 400);
    if (body.nucleo !== undefined && !allowedNuclei.includes(String(body.nucleo))) return reply({ error: 'Selecione um núcleo válido.' }, 400);
    const { data, error } = await database().from('designers').update(editableFields(body)).eq('id', body.id).select().single();
    if (error) { console.error('[api/designers] PATCH:', error.message, error.code); return reply({ error: 'Não foi possível atualizar o perfil.' }, 400); }
    return reply(data);
  } catch (e) { return reply({ error: e instanceof Error ? e.message : 'Não foi possível conectar ao banco.' }, 503); }
}

export async function DELETE(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const { id } = await request.json() as { id?: string };
    if (!id) return reply({ error: 'Perfil inválido.' }, 400);
    const { error } = await database().from('designers').delete().eq('id', id);
    if (error) { console.error('[api/designers] DELETE:', error.message, error.code); return reply({ error: 'Não foi possível excluir o perfil.' }, 400); }
    return reply({ ok: true });
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}
