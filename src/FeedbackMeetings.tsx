import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Designer, FeedbackRecord, OneOnOneRecord } from './types';
import { interestTags } from './types';
import './feedback-meetings.css';

type Tab = 'feedback' | 'meetings';
type FeedbackHistoryMode = 'month' | 'all';
const dateNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const monthNow = () => dateNow().slice(0, 7);
const scoreFields = [
  ['satisfacao_individual', 'Satisfação individual'], ['satisfacao_equipe', 'Satisfação da equipe'],
  ['engajamento_individual', 'Engajamento individual'], ['engajamento_equipe', 'Engajamento da equipe'],
  ['sobrecarga_individual', 'Sobrecarga individual'], ['sobrecarga_equipe', 'Sobrecarga da equipe'],
  ['integracao_time', 'Integração do time'],
] as const;

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data as T;
}

function DesignerSelect({ designers, value, onChange }: { designers: Designer[]; value: string; onChange: (id: string) => void }) {
  return <select required value={value} onChange={e => onChange(e.target.value)}><option value="">Selecione uma pessoa</option>{designers.map(d => <option key={d.id} value={d.id}>{d.nome} · {d.squad || 'Sem squad'}</option>)}</select>;
}
function PersonContext({ designer }: { designer?: Designer }) {
  if (!designer) return null;
  return <div className="record-person"><b>{designer.nome}</b><span>{designer.funcao || 'Cargo não informado'} · {designer.squad || 'Squad não informada'}</span><small>Clientes: {designer.clientes?.join(', ') || 'Nenhum informado'}</small></div>;
}
function Rating({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return <label className="record-field"><span>{label} (0 a 10)</span><select value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}><option value="">Sem nota</option>{Array.from({ length: 11 }, (_, n) => <option value={n} key={n}>{n}</option>)}</select></label>;
}

export function FeedbackMeetings({ designers, initialTab = 'feedback', singleTab = false }: { designers: Designer[]; initialTab?: Tab; singleTab?: boolean }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [meetings, setMeetings] = useState<OneOnOneRecord[]>([]);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackRecord | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<OneOnOneRecord | null>(null);
  const [historyPerson, setHistoryPerson] = useState('');
  const [feedbackHistoryMode, setFeedbackHistoryMode] = useState<FeedbackHistoryMode>('month');
  const [feedbackHistoryMonth, setFeedbackHistoryMonth] = useState(monthNow());
  const [meetingHistoryMode, setMeetingHistoryMode] = useState<FeedbackHistoryMode>('month');
  const [meetingHistoryMonth, setMeetingHistoryMonth] = useState(monthNow());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [feedbackPerson, setFeedbackPerson] = useState('');
  const [period, setPeriod] = useState(monthNow());
  const [note, setNote] = useState(8);
  const [evolution, setEvolution] = useState<FeedbackRecord['evolucao']>('melhorou');
  const [positive, setPositive] = useState('');
  const [attention, setAttention] = useState('');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [meetingPerson, setMeetingPerson] = useState('');
  const [meetingDate, setMeetingDate] = useState(dateNow());
  const [description, setDescription] = useState('');
  const [meetingComments, setMeetingComments] = useState('');
  const [ratings, setRatings] = useState<Record<string, number | null>>(() => Object.fromEntries(scoreFields.map(([key]) => [key, null])));

  async function refresh() {
    const [f, m] = await Promise.all([api<FeedbackRecord[]>('/api/feedback'), api<OneOnOneRecord[]>('/api/meetings')]);
    setFeedbacks(f); setMeetings(m);
  }
  useEffect(() => { refresh().catch(e => setNotice(e.message)); }, []);

  const selectedFeedbackPerson = designers.find(d => d.id === feedbackPerson);
  const selectedMeetingPerson = designers.find(d => d.id === meetingPerson);
  const personById = useMemo(() => new Map(designers.map(d => [d.id, d])), [designers]);
  const visibleFeedbacks = useMemo(() => feedbacks
    .filter(f => (!historyPerson || f.designer_id === historyPerson) && (feedbackHistoryMode === 'all' || f.periodo === feedbackHistoryMonth))
    .sort((a, b) => b.periodo.localeCompare(a.periodo) || String(b.created_at || '').localeCompare(String(a.created_at || ''))),
    [feedbacks, historyPerson, feedbackHistoryMode, feedbackHistoryMonth]);
  const visibleMeetings = useMemo(() => meetings
    .filter(m => (!historyPerson || m.designer_id === historyPerson) && (meetingHistoryMode === 'all' || m.data_reuniao.slice(0, 7) === meetingHistoryMonth))
    .sort((a, b) => b.data_reuniao.localeCompare(a.data_reuniao) || String(b.created_at || '').localeCompare(String(a.created_at || ''))),
    [meetings, historyPerson, meetingHistoryMode, meetingHistoryMonth]);

  async function saveFeedback(e: FormEvent) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      await api('/api/feedback', { method: editingFeedback ? 'PATCH' : 'POST', body: JSON.stringify({ ...(editingFeedback ? { id: editingFeedback.id } : {}), designer_id: feedbackPerson, periodo: period, cargo: selectedFeedbackPerson?.funcao || '', nota: note, evolucao: evolution, pontos_positivos: positive, pontos_atencao: attention, comentarios: feedbackComments }) });
      await refresh(); setEditingFeedback(null); setPositive(''); setAttention(''); setFeedbackComments(''); setNotice('Feedback salvo para o mês selecionado.');
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  }
  async function saveMeeting(e: FormEvent) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      await api('/api/meetings', { method: editingMeeting ? 'PATCH' : 'POST', body: JSON.stringify({ ...(editingMeeting ? { id: editingMeeting.id } : {}), designer_id: meetingPerson, data_reuniao: meetingDate, descricao: description, comentarios: meetingComments, ...ratings }) });
      await refresh(); setEditingMeeting(null); setDescription(''); setMeetingComments(''); setRatings(Object.fromEntries(scoreFields.map(([key]) => [key, null]))); setNotice('Reunião 1:1 salva.');
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  }
  function editFeedback(f: FeedbackRecord) { setTab('feedback'); setEditingFeedback(f); setFeedbackPerson(f.designer_id); setPeriod(f.periodo); setNote(Number(f.nota)); setEvolution(f.evolucao); setPositive(f.pontos_positivos || ''); setAttention(f.pontos_atencao || ''); setFeedbackComments(f.comentarios || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function editMeeting(m: OneOnOneRecord) { setTab('meetings'); setEditingMeeting(m); setMeetingPerson(m.designer_id); setMeetingDate(m.data_reuniao); setDescription(m.descricao || ''); setMeetingComments(m.comentarios || ''); setRatings(Object.fromEntries(scoreFields.map(([key]) => [key, m[key]]))); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function deleteRecord(kind: Tab, id: string) { if (!window.confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return; setNotice(''); try { await api(kind === 'feedback' ? '/api/feedback' : '/api/meetings', { method: 'DELETE', body: JSON.stringify({ id }) }); if (kind === 'feedback' && editingFeedback?.id === id) setEditingFeedback(null); if (kind === 'meetings' && editingMeeting?.id === id) setEditingMeeting(null); await refresh(); setNotice(kind === 'feedback' ? 'Feedback excluído.' : 'Reunião excluída.'); } catch (e) { setNotice((e as Error).message); } }

  return <section className="records-block">
    <header className="records-heading"><div><small>ACOMPANHAMENTO DO TIME</small><h2>{singleTab ? (tab === 'feedback' ? 'Feedback mensal' : 'Reuniões 1:1') : 'Feedback e reuniões 1:1'}</h2><p>{singleTab ? (tab === 'feedback' ? 'Avaliações mensais, notas e pontos de acompanhamento.' : 'Registro privado das conversas e indicadores da reunião.') : 'Registros vinculados aos perfis atuais, com histórico por pessoa.'}</p></div></header>
    {!singleTab && <div className="records-tabs" role="tablist"><button type="button" className={tab === 'feedback' ? 'selected' : ''} onClick={() => setTab('feedback')}>Feedback mensal</button><button type="button" className={tab === 'meetings' ? 'selected' : ''} onClick={() => setTab('meetings')}>Reuniões 1:1</button></div>}
    {notice && <div className="records-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Fechar">×</button></div>}
    {!designers.length ? <p className="records-empty">Cadastre um designer para começar os registros.</p> : tab === 'feedback' ? <div className="records-layout">
      <form className="record-form" onSubmit={saveFeedback}><h3>{editingFeedback ? 'Editar feedback mensal' : 'Registrar avaliação do mês'}</h3><label className="record-field"><span>Designer</span><DesignerSelect designers={designers} value={feedbackPerson} onChange={setFeedbackPerson}/></label><PersonContext designer={selectedFeedbackPerson}/>
        <div className="record-two"><label className="record-field"><span>Período</span><input required type="month" value={period} onChange={e => setPeriod(e.target.value)}/></label><label className="record-field"><span>Nota (0 a 10)</span><input type="number" min="0" max="10" step="0.5" value={note} onChange={e => setNote(Number(e.target.value))}/></label></div>
        <label className="record-field"><span>Evolução</span><select value={evolution} onChange={e => setEvolution(e.target.value as FeedbackRecord['evolucao'])}><option value="melhorou">Melhorou</option><option value="manteve">Manteve</option><option value="atencao">Pontos de atenção</option></select></label>
        <label className="record-field"><span>Pontos positivos e melhorias</span><textarea rows={3} value={positive} onChange={e => setPositive(e.target.value)} placeholder="O que evoluiu neste período?"/></label>
        <label className="record-field"><span>Pontos de atenção</span><textarea rows={3} value={attention} onChange={e => setAttention(e.target.value)} placeholder="O que precisa de acompanhamento?"/></label>
        <label className="record-field"><span>Comentários</span><textarea rows={3} value={feedbackComments} onChange={e => setFeedbackComments(e.target.value)}/></label>
        <div className="record-form-actions">{editingFeedback && <button type="button" className="record-secondary" onClick={() => { setEditingFeedback(null); setFeedbackPerson(''); setPeriod(monthNow()); setNote(8); setEvolution('melhorou'); setPositive(''); setAttention(''); setFeedbackComments(''); }}>Cancelar edição</button>}<button className="record-primary" disabled={busy || !feedbackPerson}>{busy ? 'Salvando…' : editingFeedback ? 'Atualizar feedback' : 'Salvar feedback'}</button></div>
      </form>
    <div className="record-history"><h3>Histórico de feedbacks</h3><div className="feedback-history-tabs" role="tablist" aria-label="Visualização do histórico"><button type="button" className={feedbackHistoryMode === 'month' ? 'selected' : ''} onClick={() => setFeedbackHistoryMode('month')}>Histórico mensal</button><button type="button" className={feedbackHistoryMode === 'all' ? 'selected' : ''} onClick={() => setFeedbackHistoryMode('all')}>Histórico completo</button></div>{feedbackHistoryMode === 'month' && <label className="record-field history-filter"><span>Selecionar mês</span><input type="month" value={feedbackHistoryMonth} onChange={e => setFeedbackHistoryMonth(e.target.value)}/></label>}<label className="record-field history-filter"><span>Ver histórico de</span><select value={historyPerson} onChange={e => setHistoryPerson(e.target.value)}><option value="">Todos os designers</option>{designers.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></label><p className="history-count">{visibleFeedbacks.length} {visibleFeedbacks.length === 1 ? 'feedback' : 'feedbacks'}</p>{visibleFeedbacks.length ? visibleFeedbacks.map(f => <article className="record-card" key={f.id}><header><div className="feedback-card-title"><div><b>{personById.get(f.designer_id)?.nome || 'Designer'}</b><small>{f.periodo} · {f.cargo || personById.get(f.designer_id)?.funcao || 'Cargo não informado'}</small></div><span className={`evolution ${f.evolucao}`}>{f.evolucao === 'melhorou' ? 'Melhorou' : f.evolucao === 'manteve' ? 'Manteve' : 'Pontos de atenção'}</span></div><div className="record-actions"><strong>{Number(f.nota).toLocaleString('pt-BR')}/10</strong><button type="button" onClick={() => editFeedback(f)}>Editar</button><button type="button" className="delete" onClick={() => deleteRecord('feedback', f.id)}>Excluir</button></div></header>{f.pontos_positivos && <p><b>Positivos:</b> {f.pontos_positivos}</p>}{f.pontos_atencao && <p><b>Atenção:</b> {f.pontos_atencao}</p>}{f.comentarios && <p>{f.comentarios}</p>}</article>) : <p className="records-empty">{feedbackHistoryMode === 'month' ? 'Não há feedbacks para este designer neste mês.' : 'Ainda não há feedbacks registrados.'}</p>}</div>
    </div> : <div className="records-layout">
      <form className="record-form" onSubmit={saveMeeting}><h3>{editingMeeting ? 'Editar reunião 1:1' : 'Registrar reunião 1:1'}</h3><label className="record-field"><span>Designer</span><DesignerSelect designers={designers} value={meetingPerson} onChange={setMeetingPerson}/></label><PersonContext designer={selectedMeetingPerson}/><label className="record-field"><span>Data</span><input required type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}/></label>
        <label className="record-field"><span>Descrição · o que a pessoa trouxe na conversa</span><textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Assuntos, contexto e encaminhamentos…"/></label><label className="record-field"><span>Comentários</span><textarea rows={3} value={meetingComments} onChange={e => setMeetingComments(e.target.value)}/></label>
        <div className="rating-grid">{scoreFields.map(([key, label]) => <Rating key={key} label={label} value={ratings[key]} onChange={v => setRatings(old => ({ ...old, [key]: v }))}/>)}</div><div className="record-form-actions">{editingMeeting && <button type="button" className="record-secondary" onClick={() => { setEditingMeeting(null); setMeetingPerson(''); setMeetingDate(dateNow()); setDescription(''); setMeetingComments(''); setRatings(Object.fromEntries(scoreFields.map(([key]) => [key, null]))); }}>Cancelar edição</button>}<button className="record-primary" disabled={busy || !meetingPerson}>{busy ? 'Salvando…' : editingMeeting ? 'Atualizar reunião' : 'Salvar reunião'}</button></div>
      </form>
      <div className="record-history"><h3>Histórico de reuniões</h3><div className="feedback-history-tabs" role="tablist" aria-label="Visualização do histórico de reuniões"><button type="button" className={meetingHistoryMode === 'month' ? 'selected' : ''} onClick={() => setMeetingHistoryMode('month')}>Histórico mensal</button><button type="button" className={meetingHistoryMode === 'all' ? 'selected' : ''} onClick={() => setMeetingHistoryMode('all')}>Histórico completo</button></div>{meetingHistoryMode === 'month' && <label className="record-field history-filter"><span>Selecionar mês</span><input type="month" value={meetingHistoryMonth} onChange={e => setMeetingHistoryMonth(e.target.value)}/></label>}<label className="record-field history-filter"><span>Ver histórico de</span><select value={historyPerson} onChange={e => setHistoryPerson(e.target.value)}><option value="">Todos os designers</option>{designers.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></label><p className="history-count">{visibleMeetings.length} {visibleMeetings.length === 1 ? 'reunião' : 'reuniões'}</p>{visibleMeetings.length ? visibleMeetings.map(m => <article className="record-card" key={m.id}><header><div><b>{personById.get(m.designer_id)?.nome || 'Designer'}</b><small>{new Date(`${m.data_reuniao}T12:00:00`).toLocaleDateString('pt-BR')} · {personById.get(m.designer_id)?.squad || 'Sem squad'}</small></div><div className="record-actions"><button type="button" onClick={() => editMeeting(m)}>Editar</button><button type="button" className="delete" onClick={() => deleteRecord('meetings', m.id)}>Excluir</button></div></header>{m.descricao && <p>{m.descricao}</p>}{m.comentarios && <p><b>Comentários:</b> {m.comentarios}</p>}<div className="rating-chips">{scoreFields.map(([key, label]) => { const val = m[key as MetricKey]; return val === null || val === undefined ? null : <span key={key}>{label}: <b>{val}/10</b></span>; })}</div></article>) : <p className="records-empty">{meetingHistoryMode === 'month' ? 'Não há reuniões para este designer neste mês.' : 'Ainda não há reuniões registradas.'}</p>}</div>
    </div>}
  </section>;
}

type MetricKey = typeof scoreFields[number][0];
const pairKeys: { label: string; a: MetricKey; b: MetricKey }[] = [
  { label: 'Satisfação', a: 'satisfacao_individual', b: 'satisfacao_equipe' },
  { label: 'Engajamento', a: 'engajamento_individual', b: 'engajamento_equipe' },
  { label: 'Sobrecarga', a: 'sobrecarga_individual', b: 'sobrecarga_equipe' },
];
function average(values: (number | null | undefined)[]) { const valid = values.filter((v): v is number => typeof v === 'number'); return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null; }
function MiniBar({ label, value, tint = '', display }: { label: string; value: number | null; tint?: string; display?: string }) { return <div className="mini-bar"><span>{label}</span><div><i className={tint} style={{ width: `${Math.max(0, Math.min(100, (value ?? 0) * 10))}%` }}/></div><b>{display ?? (value === null ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }))}</b></div>; }

export function FeedbackDashboard({ designers }: { designers: Designer[] }) {
  const [meetings, setMeetings] = useState<OneOnOneRecord[]>([]);
  useEffect(() => { api<OneOnOneRecord[]>('/api/meetings').then(setMeetings).catch(() => setMeetings([])); }, []);
  const latest = useMemo(() => {
    const map = new Map<string, OneOnOneRecord>();
    [...meetings].sort((a, b) => b.data_reuniao.localeCompare(a.data_reuniao)).forEach(m => { if (!map.has(m.designer_id)) map.set(m.designer_id, m); });
    return [...map.values()];
  }, [meetings]);
  const squadNames = useMemo(() => [...new Set(designers.map(d => d.squad).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR', { numeric: true })), [designers]);
  const metricAverage = (records: OneOnOneRecord[], key: MetricKey) => average(records.map(r => r[key]));
  const interestCounts = useMemo(() => countLabels(designers.flatMap(interestTags)), [designers]);
  const developmentCounts = useMemo(() => countLabels(designers.flatMap(d => d.desenvolver || [])), [designers]);
  return <section className="records-dashboard"><div className="records-heading"><div><small>PULSO DO TIME</small><h2>Indicadores e repertório</h2><p>Médias das reuniões mais recentes de cada pessoa; o painel compara a equipe geral e cada squad.</p></div></div>
    <div className="analytics-grid"><article className="analytics-card"><h3>Indicadores por squad</h3><p className="analytics-legend">Média de 0 a 10 · sobrecarga maior indica maior percepção de sobrecarga.</p>{!latest.length ? <div className="records-empty">As médias aparecerão depois das primeiras reuniões 1:1.</div> : pairKeys.map(pair => <section className="score-chart" key={pair.label}><h4>{pair.label}</h4>{[[pair.a, 'Individual'], [pair.b, 'Equipe']].map(([key, kind]) => <div className="score-series" key={key}><h5>{kind}</h5><MiniBar label="Geral" value={metricAverage(latest, key as MetricKey)} tint="purple"/>{squadNames.map(s => <MiniBar key={s} label={s} value={metricAverage(latest.filter(m => designers.find(d => d.id === m.designer_id)?.squad === s), key as MetricKey)}/>)}</div>)}</section>)}</article>
    <article className="analytics-card"><h3>Integração do time</h3><p className="analytics-legend">Média das reuniões mais recentes.</p><MiniBar label="Equipe" value={metricAverage(latest, 'integracao_time')} tint="green"/>{squadNames.map(s => <MiniBar key={s} label={s} value={metricAverage(latest.filter(m => designers.find(d => d.id === m.designer_id)?.squad === s), 'integracao_time')} tint="green"/>)}</article>
    <article className="analytics-card"><h3>Áreas para desenvolver</h3><p className="analytics-legend">Quantidade de pessoas que citaram cada tema.</p>{developmentCounts.length ? developmentCounts.slice(0, 8).map((x, i) => <MiniBar key={x.name} label={x.name} value={developmentCounts[0].count ? x.count / developmentCounts[0].count * 10 : 0} display={String(x.count)} tint={i % 2 ? 'orange' : ''}/>) : <div className="records-empty">Cadastre temas de desenvolvimento nos perfis.</div>}</article>
    <article className="analytics-card"><h3>Áreas principais de interesse</h3><p className="analytics-legend">Quantidade de pessoas que citaram cada tema.</p>{interestCounts.length ? interestCounts.slice(0, 8).map((x, i) => <MiniBar key={x.name} label={x.name} value={interestCounts[0].count ? x.count / interestCounts[0].count * 10 : 0} display={String(x.count)} tint={i % 2 ? 'purple' : ''}/>) : <div className="records-empty">Cadastre interesses nos perfis.</div>}</article></div>
  </section>;
}

function countLabels(values: string[]) { const m = new Map<string, number>(); values.map(x => x.trim()).filter(Boolean).forEach(x => m.set(x, (m.get(x) || 0) + 1)); return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR')); }
