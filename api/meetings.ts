import { hasValidSession, isSameOrigin } from '../server/session.js';
import { database } from '../server/database.js';

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const fields = ['designer_id','data_reuniao','descricao','comentarios','satisfacao_individual','satisfacao_equipe','engajamento_individual','engajamento_equipe','sobrecarga_individual','sobrecarga_equipe','integracao_time'] as const;
const pick = (body: Record<string, unknown>) => Object.fromEntries(fields.filter(k => k in body).map(k => [k, body[k] === '' ? null : body[k]]));
const validScore = (n: unknown) => n === null || n === undefined || (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 10);

export async function GET(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  try {
    const { data, error } = await database().from('one_on_one_meetings').select('*').order('data_reuniao', { ascending: false }).order('created_at', { ascending: false });
    if (error) { console.error('[api/meetings] GET:', error.message, error.code); return reply({ error: 'Não foi possível carregar as reuniões.' }, 500); }
    return reply(data);
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}

export async function POST(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.designer_id !== 'string' || !body.designer_id || typeof body.data_reuniao !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.data_reuniao)) return reply({ error: 'Selecione a pessoa e a data da reunião.' }, 400);
    for (const key of fields.slice(4)) if (!validScore(body[key] === '' ? null : body[key])) return reply({ error: 'As notas precisam ficar entre 0 e 10.' }, 400);
    const { data, error } = await database().from('one_on_one_meetings').insert(pick(body)).select().single();
    if (error) { console.error('[api/meetings] POST:', error.message, error.code); return reply({ error: 'Não foi possível salvar a reunião.' }, 400); }
    return reply(data, 201);
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}

export async function PATCH(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.id !== 'string' || !body.id) return reply({ error: 'Reunião inválida.' }, 400);
    const { id, ...rest } = body;
    const { data, error } = await database().from('one_on_one_meetings').update(pick(rest)).eq('id', id).select().single();
    if (error) return reply({ error: 'Não foi possível atualizar a reunião.' }, 400);
    return reply(data);
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}

export async function DELETE(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const { id } = await request.json() as { id?: string };
    if (!id) return reply({ error: 'Reunião inválida.' }, 400);
    const { error } = await database().from('one_on_one_meetings').delete().eq('id', id);
    if (error) return reply({ error: 'Não foi possível excluir a reunião.' }, 400);
    return reply({ ok: true });
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}
