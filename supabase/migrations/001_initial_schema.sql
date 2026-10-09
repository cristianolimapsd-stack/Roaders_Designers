-- Road People: perfis e administração. Execute no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.designers (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  curto text not null default '',
  funcao text not null default '',
  email text not null default '',
  admissao date,
  squad text not null default '',
  clientes text[] not null default '{}',
  formacao text not null default '',
  gostos text[] not null default '{}',
  entregas jsonb not null default '[]'::jsonb,
  teto text not null default '',
  simultaneo text not null default '',
  processo text not null default '',
  ferramentas text[] not null default '{}',
  briefings text not null default '',
  interesses text[] not null default '{}',
  "interessesTxt" text not null default '',
  desenvolver text[] not null default '{}',
  "desenvolverTxt" text not null default '',
  obs text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()))
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists designers_updated_at on public.designers;
create trigger designers_updated_at before update on public.designers
for each row execute function public.touch_updated_at();

alter table public.designers enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Authenticated users can read designers" on public.designers;
create policy "Authenticated users can read designers" on public.designers
  for select to authenticated using (true);
drop policy if exists "Admins can insert designers" on public.designers;
create policy "Admins can insert designers" on public.designers
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update designers" on public.designers;
create policy "Admins can update designers" on public.designers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete designers" on public.designers;
create policy "Admins can delete designers" on public.designers
  for delete to authenticated using (public.is_admin());
drop policy if exists "Users can see their own admin role" on public.admin_users;
create policy "Users can see their own admin role" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.designers to authenticated;
grant select on public.admin_users to authenticated;
