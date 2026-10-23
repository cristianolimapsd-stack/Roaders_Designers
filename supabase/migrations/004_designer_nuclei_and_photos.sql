-- Organiza os perfis por núcleo e habilita uma foto de perfil otimizada.
alter table public.designers
  add column if not exists nucleo text not null default 'Núcleo A',
  add column if not exists foto_url text not null default '';

-- Classifica os perfis antigos pelos clientes já cadastrados.
update public.designers
set nucleo = case
  when clientes && array['Seleção Feminina', 'Brasileirão', 'Copa do Brasil', 'Brasileiras']::text[] then 'Núcleo CBF'
  when clientes && array['Bienal do Livro Rio', 'Elibré', 'Farmalife', 'Fundação Oscar', 'Gás Verde', 'GL Events', 'Instituto Reação', 'Jujuba Playz', 'Justa Saúde', 'M2 Eventos', 'Memorial do Carmo', 'NeuroEvidencia', 'Prêmio Isabel Salgado', 'RAF', 'Rosário', 'Roxy', 'Saveiros', 'SLS', 'Staytement', 'Tamoio', 'The Simple Gym', 'The Simple Run', 'YA Boi']::text[] then 'Núcleo B'
  else 'Núcleo A'
end
where nucleo = 'Núcleo A';

alter table public.designers drop constraint if exists designers_nucleo_check;
alter table public.designers add constraint designers_nucleo_check
  check (nucleo in ('Núcleo A', 'Núcleo B', 'Núcleo CBF'));
