import { hasValidSession, isSameOrigin } from '../server/session.js';
import { database } from '../server/database.js';

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const fields = ['designer_id','periodo','cargo','nota','evolucao','pontos_positivos','pontos_atencao','comentarios'] as const;
const pick = (body: Record<string, unknown>) => Object.fromEntries(fields.filter(k => k in body).map(k => [k, body[k]]));
const validScore = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 10;

export async function GET(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  try {
    const { data, error } = await database().from('designer_feedback').select('*').order('periodo', { ascending: false }).order('created_at', { ascending: false });
    if (error) { console.error('[api/feedback] GET:', error.message, error.code); return reply({ error: 'Não foi possível carregar os feedbacks.' }, 500); }
    return reply(data);
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}

export async function POST(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.designer_id !== 'string' || !body.designer_id || typeof body.periodo !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.periodo)) return reply({ error: 'Selecione a pessoa e o mês do feedback.' }, 400);
    if (!validScore(body.nota) || !['melhorou','manteve','atencao'].includes(String(body.evolucao))) return reply({ error: 'Confira a nota e a avaliação de evolução.' }, 400);
    const { data, error } = await database().from('designer_feedback').upsert(pick(body), { onConflict: 'designer_id,periodo' }).select().single();
    if (error) { console.error('[api/feedback] POST:', error.message, error.code); return reply({ error: 'Não foi possível salvar o feedback.' }, 400); }
    return reply(data, 201);
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}

export async function PATCH(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.id !== 'string' || !body.id) return reply({ error: 'Feedback inválido.' }, 400);
    const { id, ...rest } = body;
    const { data, error } = await database().from('designer_feedback').update(pick(rest)).eq('id', id).select().single();
    if (error) return reply({ error: 'Não foi possível atualizar o feedback.' }, 400);
    return reply(data);
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}

export async function DELETE(request: Request) {
  if (!hasValidSession(request)) return reply({ error: 'Acesso expirado.' }, 401);
  if (!isSameOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const { id } = await request.json() as { id?: string };
    if (!id) return reply({ error: 'Feedback inválido.' }, 400);
    const { error } = await database().from('designer_feedback').delete().eq('id', id);
    if (error) return reply({ error: 'Não foi possível excluir o feedback.' }, 400);
    return reply({ ok: true });
  } catch { return reply({ error: 'Não foi possível conectar ao banco.' }, 503); }
}
