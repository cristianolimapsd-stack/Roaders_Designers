-- Registros mensais de feedback e histórico de reuniões 1:1.
create table if not exists public.designer_feedback (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designers(id) on delete cascade,
  periodo text not null check (periodo ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  cargo text not null default '',
  nota numeric(3,1) not null check (nota >= 0 and nota <= 10),
  evolucao text not null check (evolucao in ('melhorou','manteve','atencao')),
  pontos_positivos text not null default '',
  pontos_atencao text not null default '',
  comentarios text not null default '',
  created_at timestamptz not null default now(),
  unique (designer_id, periodo)
);

create table if not exists public.one_on_one_meetings (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designers(id) on delete cascade,
  data_reuniao date not null,
  descricao text not null default '',
  comentarios text not null default '',
  satisfacao_individual numeric(3,1) check (satisfacao_individual between 0 and 10),
  satisfacao_equipe numeric(3,1) check (satisfacao_equipe between 0 and 10),
  engajamento_individual numeric(3,1) check (engajamento_individual between 0 and 10),
  engajamento_equipe numeric(3,1) check (engajamento_equipe between 0 and 10),
  sobrecarga_individual numeric(3,1) check (sobrecarga_individual between 0 and 10),
  sobrecarga_equipe numeric(3,1) check (sobrecarga_equipe between 0 and 10),
  integracao_time numeric(3,1) check (integracao_time between 0 and 10),
  created_at timestamptz not null default now()
);

create index if not exists designer_feedback_periodo_idx on public.designer_feedback (periodo desc);
create index if not exists one_on_one_date_idx on public.one_on_one_meetings (data_reuniao desc);
create index if not exists one_on_one_designer_idx on public.one_on_one_meetings (designer_id, data_reuniao desc);

alter table public.designer_feedback enable row level security;
alter table public.one_on_one_meetings enable row level security;
-- A aplicação lê e grava estas tabelas pelas rotas de servidor, usando SUPABASE_SECRET_KEY.
