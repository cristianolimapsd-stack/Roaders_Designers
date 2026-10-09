-- Permite que qualquer usuário autenticado cadastre designers sem papel de admin.
-- Edição e exclusão continuam restritas às contas em admin_users.
drop policy if exists "Admins can insert designers" on public.designers;
drop policy if exists "Authenticated users can create designers" on public.designers;

create policy "Authenticated users can create designers" on public.designers
  for insert to authenticated with check (true);
