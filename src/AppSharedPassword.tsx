import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Clock3,
  Filter,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { emptyDesigner, interestTags, type Designer } from './types';

type Page = 'overview' | 'team' | 'interests';

const initials = (s: string) =>
  s.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'D';

const date = (s: string) =>
  s ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : 'Não informado';

const blank = () => ({ id: '', ...emptyDesigner() }) as Designer;

const payload = (d: Designer) =>
  Object.fromEntries(
    Object.entries(d).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)),
  );

export default function AppSharedPassword() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [page, setPage] = useState<Page>('overview');
  const [query, setQuery] = useState('');
  const [squad, setSquad] = useState('Todas as squads');
  const [selected, setSelected] = useState<Designer | null>(null);
  const [editor, setEditor] = useState<Designer | null>(null);
  const [message, setMessage] = useState('');
  const [mobile, setMobile] = useState(false);

  async function loadProfiles() {
    const response = await fetch('/api/designers');
    if (!response.ok) {
      throw new Error((await response.json()).error || 'Não foi possível carregar os perfis.');
    }
    setDesigners(await response.json());
  }

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.json())
      .then(async s => {
        if (s.authenticated) {
          setUnlocked(true);
          try {
            await loadProfiles();
          } catch (e) {
            setMessage((e as Error).message);
          }
        }
      })
      .catch(() => setMessage('Não foi possível conectar ao sistema.'))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(id);
  }, [message]);

  const squads = useMemo(
    () => [...new Set(designers.map(d => d.squad).filter(Boolean))].sort(),
    [designers],
  );

  const ranked = useMemo(() => {
    const m = new Map<string, Set<string>>();
    designers.forEach(d =>
      interestTags(d).forEach(tag => {
        const k = tag.trim();
        if (!m.has(k)) m.set(k, new Set());
        m.get(k)!.add(d.id);
      }),
    );
    return [...m]
      .map(([name, people]) => ({ name, count: people.size }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [designers]);

  const filtered = useMemo(
    () =>
      designers.filter(
        d =>
          (squad === 'Todas as squads' || d.squad === squad) &&
          `${d.nome} ${d.funcao} ${d.squad} ${d.clientes.join(' ')} ${interestTags(d).join(' ')}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [designers, squad, query],
  );

  async function unlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: form.get('password') }),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || 'Não foi possível liberar o acesso.');
      return;
    }

    setUnlocked(true);
    setMessage('Acesso liberado.');
    try {
      await loadProfiles();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function logout() {
    await fetch('/api/session', { method: 'DELETE' });
    setUnlocked(false);
    setDesigners([]);
    setMessage('Acesso bloqueado neste navegador.');
  }

  async function save(d: Designer) {
    try {
      const response = await fetch('/api/designers', {
        method: d.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d.id ? { ...payload(d), id: d.id } : payload(d)),
      });
      const data = await response.json();

      if (!response.ok) {
        window.alert(data.error || 'Não foi possível salvar o perfil.');
        return;
      }

      setDesigners(old =>
        d.id
          ? old.map(x => (x.id === d.id ? data : x))
          : [...old, data].sort((a, b) => a.nome.localeCompare(b.nome)),
      );
      setEditor(null);
      setMessage('Perfil salvo com sucesso.');
    } catch {
      window.alert('Não foi possível conectar ao sistema. Tente novamente.');
    }
  }

  async function remove(d: Designer) {
    if (!window.confirm(`Excluir o perfil de ${d.nome}? Esta ação não pode ser desfeita.`)) return;

    const response = await fetch('/api/designers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id }),
    });

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error || 'Não foi possível excluir o perfil.');
      return;
    }

    setDesigners(old => old.filter(x => x.id !== d.id));
    setSelected(null);
    setMessage('Perfil excluído.');
  }

  const title =
    page === 'overview'
      ? 'Visão geral'
      : page === 'team'
        ? 'Equipe de Design'
        : 'Mapa de interesses';

  if (checking) {
    return (
      <div className="gate">
        <div className="gate-card">
          <i className="gate-mark"><Sparkles size={20} /></i>
          <p>ROAD PEOPLE · NÚCLEO A</p>
          <h1>Carregando seu espaço…</h1>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="gate">
        <form className="gate-card" onSubmit={unlock}>
          <i className="gate-mark"><Sparkles size={20} /></i>
          <p>ROAD PEOPLE · NÚCLEO A</p>
          <h1>Espaço da equipe</h1>
          <span>Digite a senha compartilhada pelos líderes para acessar os perfis.</span>
          <label className="gate-input">
            <small>Senha de acesso</small>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
            />
          </label>
          {message && <div className="gate-error">{message}</div>}
          <button className="btn primary gate-button">
            Acessar <ChevronRight size={16} />
          </button>
          <small className="gate-foot">
            O acesso ficará salvo neste navegador por até 30 dias.
          </small>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className={`sidebar ${mobile ? 'show' : ''}`}>
        <a className="brand" href="#">
          <i><Sparkles size={17} /></i>road<span>people</span>
        </a>
        <div className="workspace"><i /> NÚCLEO A <ChevronRight size={14} /></div>
        <small className="caption">ESPAÇO DE TRABALHO</small>
        <nav>
          {(
            [
              ['overview', 'Visão geral', LayoutDashboard],
              ['team', 'Equipe', Users],
              ['interests', 'Interesses', BarChart3],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => {
                setPage(key);
                setMobile(false);
              }}
              className={page === key ? 'active' : ''}
            >
              <Icon size={18} />
              {label}
              {key === 'team' && <em>{designers.length}</em>}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="privacy">
            <Check size={16} />
            <span><b>Acesso protegido</b><small>Senha da equipe ativa</small></span>
          </div>
          <button className="account" onClick={logout}>
            <i>L</i>
            <span>
              <b>Área dos líderes</b>
              <small>Bloquear acesso neste navegador</small>
            </span>
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {mobile && (
        <button
          className="shade"
          onClick={() => setMobile(false)}
          aria-label="Fechar menu"
        />
      )}

      <main>
        <header className="topbar">
          <button
            className="hamburger"
            onClick={() => setMobile(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Núcleo A <ChevronRight size={14} /> <b>Equipe de Design</b>
          </div>
          <div className="status">
            <i className="online" /> Acesso liberado
            <button aria-label="Bloquear acesso" onClick={logout}>
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-title">
            <div>
              <div className="eyebrow">TALENTO & CRIAÇÃO</div>
              <h1>{title}</h1>
              <p>
                {page === 'overview'
                  ? 'Um panorama das pessoas, habilidades e repertórios do núcleo.'
                  : page === 'team'
                    ? 'Conheça as pessoas e encontre rapidamente quem você procura.'
                    : 'Os temas que conectam e inspiram nosso time.'}
              </p>
            </div>
            <div className="actions">
              <button className="btn primary" onClick={() => setEditor(blank())}>
                <Plus size={16} /> Novo perfil
              </button>
            </div>
          </div>

          {message && (
            <div className="message">
              {message}
              <button aria-label="Fechar aviso" onClick={() => setMessage('')}>
                <X size={15} />
              </button>
            </div>
          )}

          {page === 'overview' ? (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <label><Sparkles size={14} /> GENTE QUE FAZ ACONTECER</label>
                  <h2>Boas ideias começam<br />com <em>boas conexões.</em></h2>
                  <p>
                    Explore talentos, repertórios e formas de trabalhar.
                    Encontre a pessoa certa para cada desafio.
                  </p>
                  <button onClick={() => setPage('team')}>
                    Explorar equipe <ChevronRight size={16} />
                  </button>
                </div>
                <div className="hero-art">
                  <div className="bubble b1" />
                  <div className="bubble b2" />
                  <div className="art-tile tile1">
                    <b>✳</b>
                    <strong>Ideias em<br />movimento</strong>
                    <small>CRIAÇÃO COLETIVA</small>
                  </div>
                  <div className="art-tile tile2">
                    <div className="faces"><i>A</i><i>M</i><i>J</i></div>
                    <strong>{designers.length} pessoas</strong>
                    <small>UM SÓ TIME</small>
                  </div>
                  <span className="spark">✦</span>
                </div>
              </section>

              <section className="stats">
                <Stat icon={<Users />} label="Pessoas no time" value={designers.length} tint="purple" />
                <Stat icon={<Sparkles />} label="Áreas de interesse" value={ranked.length} tint="orange" />
                <Stat
                  icon={<BriefcaseBusiness />}
                  label="Clientes atendidos"
                  value={designers.reduce((total, designer) => total + designer.clientes.length, 0)}
                  tint="green"
                />
                <Stat
                  icon={<Activity />}
                  label="Ferramentas"
                  value={new Set(designers.flatMap(x => x.ferramentas)).size}
                  tint="blue"
                />
              </section>

              <div className="dash-grid">
                <section className="panel">
                  <PanelTitle
                    label="REPERTÓRIO COLETIVO"
                    title="Interesses em destaque"
                    action="Ver ranking"
                    onAction={() => setPage('interests')}
                  />
                  {ranked.length ? (
                    <Bars data={ranked.slice(0, 6)} total={designers.length} />
                  ) : (
                    <Empty text="Interesses cadastrados nos perfis aparecerão aqui." />
                  )}
                </section>

                <section className="panel">
                  <PanelTitle label="NOSSO TIME" title="Pessoas por squad" />
                  {squads.length ? (
                    squads.map((s, i) => (
                      <div className="squad-row" key={s}>
                        <i className={`dot d${i % 4}`} />
                        <span>{s}</span>
                        <div className="track">
                          <i
                            style={{
                              width: `${(designers.filter(d => d.squad === s).length / Math.max(designers.length, 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <b>{designers.filter(d => d.squad === s).length}</b>
                      </div>
                    ))
                  ) : (
                    <Empty text="As squads aparecerão aqui quando houver perfis." />
                  )}
                  <button className="plain-link" onClick={() => setPage('team')}>
                    Ver equipe <ChevronRight size={14} />
                  </button>
                </section>
              </div>

              <section className="panel recent">
                <PanelTitle
                  label="CONHEÇA QUEM FAZ"
                  title="Perfis da equipe"
                  action="Ver todos"
                  onAction={() => setPage('team')}
                />
                <div className="cards">
                  {designers.slice(0, 4).map(d => (
                    <Person
                      key={d.id}
                      d={d}
                      onClick={() => setSelected(d)}
                      edit={() => setEditor(d)}
                    />
                  ))}
                </div>
                {!designers.length && (
                  <Empty text="A equipe ainda não tem perfis. Clique em Novo perfil para cadastrar a primeira pessoa." />
                )}
              </section>
            </>
          ) : page === 'team' ? (
            <>
              <div className="toolbar">
                <div className="search">
                  <Search size={17} />
                  <input
                    placeholder="Buscar nome, interesse, cliente…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
                <label className="filter">
                  <Filter size={15} />
                  <select value={squad} onChange={e => setSquad(e.target.value)}>
                    <option>Todas as squads</option>
                    {squads.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <span>{filtered.length} pessoas</span>
              </div>
              <div className="cards team-cards">
                {filtered.map(d => (
                  <Person
                    key={d.id}
                    d={d}
                    onClick={() => setSelected(d)}
                    edit={() => setEditor(d)}
                  />
                ))}
              </div>
              {!filtered.length && (
                <Empty
                  text={
                    designers.length
                      ? 'Nenhum perfil encontrado com esses filtros.'
                      : 'Ainda não há designers. Clique em Novo perfil para cadastrar.'
                  }
                />
              )}
            </>
          ) : (
            <>
              <section className="insight">
                <span><BarChart3 size={22} /></span>
                <div>
                  <b>O que move a nossa equipe</b>
                  <p>
                    Cada tema mostra quantas pessoas compartilham aquele interesse.
                    Use esse mapa para aproximar talentos e repertórios.
                  </p>
                </div>
                <strong>{ranked.length}<small>temas</small></strong>
              </section>
              <section className="panel ranking">
                <PanelTitle label="RANKING DA EQUIPE" title="Interesses mais presentes" />
                {ranked.length ? (
                  <Bars data={ranked} total={designers.length} expanded />
                ) : (
                  <Empty text="Cadastre interesses nos perfis para construir o ranking." />
                )}
              </section>
              <p className="footnote">
                <Clock3 size={14} /> Cada pessoa aparece uma única vez por interesse.
              </p>
            </>
          )}
        </div>

        <footer>
          <b>roadpeople</b><i /> Núcleo A · Design
          <span>Feito para aproximar talentos e ideias.</span>
        </footer>
      </main>

      {selected && (
        <Profile
          d={selected}
          close={() => setSelected(null)}
          edit={() => {
            setEditor(selected);
            setSelected(null);
          }}
          remove={() => remove(selected)}
        />
      )}
      {editor && (
        <Editor d={editor} close={() => setEditor(null)} save={save} />
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tint,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tint: string;
}) {
  const unit =
    label === 'Pessoas no time'
      ? 'pessoas'
      : label === 'Áreas de interesse'
        ? 'temas'
        : label === 'Clientes atendidos'
          ? 'clientes'
          : 'apps';
  const helper =
    label === 'Pessoas no time'
      ? 'Talentos do núcleo'
      : label === 'Áreas de interesse'
        ? 'Repertórios que inspiram'
        : label === 'Clientes atendidos'
          ? 'Experiências compartilhadas'
          : 'Recursos do time';

  return (
    <article className="stat">
      <i className={tint}>{icon}</i>
      <small>{label}</small>
      <b>{value}<em> {unit}</em></b>
      <span>{helper}</span>
    </article>
  );
}

function PanelTitle({
  label,
  title,
  action,
  onAction,
}: {
  label: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-title">
      <div><small>{label}</small><h3>{title}</h3></div>
      {action && (
        <button onClick={onAction}>
          {action} <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

function Bars({
  data,
  total,
  expanded = false,
}: {
  data: { name: string; count: number }[];
  total: number;
  expanded?: boolean;
}) {
  const max = Math.max(...data.map(x => x.count), 1);
  return (
    <div className={`bars ${expanded ? 'expanded' : ''}`}>
      {data.map((x, i) => (
        <div className="bar-row" key={x.name}>
          <small>{String(i + 1).padStart(2, '0')}</small>
          <span>{x.name}</span>
          <div><i className={`c${i % 5}`} style={{ width: `${Math.max((x.count / max) * 100, 3)}%` }} /></div>
          <b>{x.count}<small>/{total}</small></b>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="empty"><Search size={17} /><span>{text}</span></div>;
}

function Person({
  d,
  onClick,
  edit,
}: {
  d: Designer;
  onClick: () => void;
  edit: () => void;
}) {
  return (
    <article
      className="person"
      onClick={onClick}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <header>
        <i className={`avatar a${d.nome.charCodeAt(0) % 5}`}>{initials(d.nome)}</i>
        <button
          aria-label="Editar perfil"
          onClick={e => {
            e.stopPropagation();
            edit();
          }}
        >
          <Pencil size={14} />
        </button>
      </header>
      <h3>{d.nome}</h3>
      <p>{d.funcao || 'Designer'} · {d.squad || 'Squad não informada'}</p>
      <div className="tags">
        {interestTags(d).slice(0, 3).map((t, i) => (
          <span className={`t${i % 4}`} key={t}>{t}</span>
        ))}
      </div>
      <footer>
        <span><BriefcaseBusiness size={13} /> {d.clientes.length} clientes</span>
        <span>Ver perfil</span>
      </footer>
    </article>
  );
}

function Profile({
  d,
  close,
  edit,
  remove,
}: {
  d: Designer;
  close: () => void;
  edit: () => void;
  remove: () => void;
}) {
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && close()}>
      <aside className="drawer">
        <header>
          <small>PERFIL DA EQUIPE</small>
          <button onClick={close}><X size={18} /></button>
        </header>
        <div className="profile-head">
          <i className={`avatar large a${d.nome.charCodeAt(0) % 5}`}>{initials(d.nome)}</i>
          <div>
            <h2>{d.nome}</h2>
            <p>{d.funcao || 'Designer'} · {d.squad || 'Squad não informada'}</p>
          </div>
        </div>
        <div className="facts">
          <Fact
            icon={<Mail />}
            label="E-mail"
            value={d.email || 'Não informado'}
            href={d.email ? `mailto:${d.email}` : undefined}
          />
          <Fact icon={<Clock3 />} label="Na equipe desde" value={date(d.admissao)} />
          <Fact
            icon={<BriefcaseBusiness />}
            label="Clientes"
            value={d.clientes.join(', ') || 'Não informado'}
          />
        </div>
        <div className="detail-scroll">
          <Detail title="Perfil e formação" text={d.formacao} tags={d.gostos} />
          <Detail
            title="Entregas e níveis"
            text={[
              d.teto && `Teto: ${d.teto}`,
              d.simultaneo && `Trabalhos simultâneos: ${d.simultaneo}`,
            ].filter(Boolean).join('\n')}
            tags={d.entregas.map(x => `${x.tipo}: nível ${x.nivel}`)}
          />
          <Detail title="Processo e ferramentas" text={d.processo} tags={d.ferramentas} />
          <Detail title="Briefings" text={d.briefings} />
          <Detail title="Interesses" text={d.interessesTxt} tags={d.interesses} />
          <Detail title="Desenvolvimento" text={d.desenvolverTxt} tags={d.desenvolver} />
          <Detail title="Observações" text={d.obs} />
        </div>
        <footer>
          <button className="btn outline" onClick={close}>Fechar</button>
          <button className="btn danger" onClick={remove}><Trash2 size={14} /> Excluir</button>
          <button className="btn primary" onClick={edit}><Pencil size={14} /> Editar perfil</button>
        </footer>
      </aside>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="fact">
      <i>{icon}</i>
      <small>{label}</small>
      {href ? <a href={href}>{value}</a> : <b>{value}</b>}
    </div>
  );
}

function Detail({
  title,
  text,
  tags = [],
}: {
  title: string;
  text: string;
  tags?: string[];
}) {
  return (
    <section className="detail">
      <h3>{title}</h3>
      <p className={!text ? 'muted' : ''}>{text || 'Ainda não informado.'}</p>
      {tags.length > 0 && (
        <div className="tags">
          {tags.map((t, i) => <span className={`t${i % 4}`} key={`${t}-${i}`}>{t}</span>)}
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><small>{label}</small>{children}</label>;
}

function Editor({
  d,
  close,
  save,
}: {
  d: Designer;
  close: () => void;
  save: (d: Designer) => Promise<void>;
}) {
  const [f, setF] = useState<Designer>(structuredClone(d));
  const [delivery, setDelivery] = useState('');
  const [level, setLevel] = useState(3);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Designer, v: unknown) =>
    setF(old => ({ ...old, [k]: v }));

  const list = (k: keyof Designer) =>
    ((f[k] as string[]) || []).join(', ');

  // Mantém a vírgula no texto enquanto a pessoa ainda está digitando.
  const setList = (k: keyof Designer, v: string) =>
    set(k, v.split(',').map(x => x.trim()));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.nome.trim()) return;

    setSaving(true);
    await save({
      ...f,
      clientes: f.clientes.filter(Boolean),
      gostos: f.gostos.filter(Boolean),
      ferramentas: f.ferramentas.filter(Boolean),
      interesses: f.interesses.filter(Boolean),
      desenvolver: f.desenvolver.filter(Boolean),
    });
    setSaving(false);
  }

  return (
    <div className="overlay modal-wrap" onMouseDown={e => e.target === e.currentTarget && close()}>
      <form className="editor" onSubmit={submit}>
        <header>
          <div>
            <small>{d.id ? 'EDITAR PERFIL' : 'NOVO PERFIL'}</small>
            <h2>{d.id ? 'Atualizar designer' : 'Adicionar designer'}</h2>
            <p>As informações ficam disponíveis para os líderes com a senha da equipe.</p>
          </div>
          <button type="button" onClick={close}><X size={18} /></button>
        </header>

        <div className="editor-scroll">
          <fieldset>
            <legend>01 · Informações básicas</legend>
            <div className="formgrid">
              <Field label="Nome completo *">
                <input required value={f.nome} onChange={e => set('nome', e.target.value)} />
              </Field>
              <Field label="Nome curto">
                <input value={f.curto} onChange={e => set('curto', e.target.value)} />
              </Field>
              <Field label="Cargo">
                <input value={f.funcao} onChange={e => set('funcao', e.target.value)} />
              </Field>
              <Field label="E-mail">
                <input type="email" value={f.email} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field label="Data de admissão">
                <input
                  type="date"
                  value={f.admissao?.slice(0, 10) || ''}
                  onChange={e => set('admissao', e.target.value)}
                />
              </Field>
              <Field label="Squad">
                <input value={f.squad} onChange={e => set('squad', e.target.value)} />
              </Field>
            </div>
            <Field label="Clientes · separados por vírgula">
              <input value={list('clientes')} onChange={e => setList('clientes', e.target.value)} />
            </Field>
          </fieldset>

          <fieldset>
            <legend>02 · Perfil e repertório</legend>
            <Field label="Formação e perfil">
              <textarea rows={3} value={f.formacao} onChange={e => set('formacao', e.target.value)} />
            </Field>
            <Field label="Gostos e repertório · separados por vírgula">
              <input value={list('gostos')} onChange={e => setList('gostos', e.target.value)} />
            </Field>
          </fieldset>

          <fieldset>
            <legend>03 · Entregas e processo</legend>
            <div className="delivery">
              <Field label="Tipo de entrega">
                <input
                  value={delivery}
                  onChange={e => setDelivery(e.target.value)}
                  placeholder="Ex.: Estática"
                />
              </Field>
              <Field label="Nível (1 a 5)">
                <select value={level} onChange={e => setLevel(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}
                </select>
              </Field>
              <button
                type="button"
                className="btn outline"
                onClick={() => {
                  if (delivery.trim()) {
                    set('entregas', [...f.entregas, { tipo: delivery.trim(), nivel: level }]);
                    setDelivery('');
                  }
                }}
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
            <div className="delivery-tags">
              {f.entregas.map((x, i) => (
                <span key={`${x.tipo}-${i}`}>
                  {x.tipo} · nível {x.nivel}
                  <button
                    type="button"
                    onClick={() => set('entregas', f.entregas.filter((_, j) => j !== i))}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <Field label="Teto de entregas">
              <textarea rows={2} value={f.teto} onChange={e => set('teto', e.target.value)} />
            </Field>
            <Field label="Trabalhos simultâneos">
              <textarea rows={2} value={f.simultaneo} onChange={e => set('simultaneo', e.target.value)} />
            </Field>
            <Field label="Processo de trabalho">
              <textarea rows={3} value={f.processo} onChange={e => set('processo', e.target.value)} />
            </Field>
            <Field label="Ferramentas · separadas por vírgula">
              <input value={list('ferramentas')} onChange={e => setList('ferramentas', e.target.value)} />
            </Field>
          </fieldset>

          <fieldset>
            <legend>04 · Interesses e desenvolvimento</legend>
            <Field label="Áreas de interesse · separados por vírgula">
              <input value={list('interesses')} onChange={e => setList('interesses', e.target.value)} />
            </Field>
            <Field label="Descrição dos interesses">
              <textarea rows={2} value={f.interessesTxt} onChange={e => set('interessesTxt', e.target.value)} />
            </Field>
            <Field label="Temas para desenvolver · separados por vírgula">
              <input value={list('desenvolver')} onChange={e => setList('desenvolver', e.target.value)} />
            </Field>
            <Field label="Descrição do desenvolvimento">
              <textarea rows={2} value={f.desenvolverTxt} onChange={e => set('desenvolverTxt', e.target.value)} />
            </Field>
            <Field label="Briefings">
              <textarea rows={2} value={f.briefings} onChange={e => set('briefings', e.target.value)} />
            </Field>
            <Field label="Observações">
              <textarea rows={2} value={f.obs} onChange={e => set('obs', e.target.value)} />
            </Field>
          </fieldset>
        </div>

        <footer>
          <button type="button" className="btn outline" onClick={close}>Cancelar</button>
          <button className="btn primary" disabled={saving}>
            <Check size={14} /> {saving ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </footer>
      </form>
    </div>
  );
}
