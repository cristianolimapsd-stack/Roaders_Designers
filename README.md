# Road People · Equipe de Design

Painel web para organizar os perfis do time, buscar pessoas, conhecer competências e visualizar o ranking coletivo de interesses. A interface inclui visão geral, diretório com busca e filtro por squad, perfil detalhado, cadastro e edição completos e mapa de interesses.

## Tecnologias

- React + TypeScript + Vite
- Supabase Auth e Postgres com Row Level Security
- Vercel para hospedagem

## Rodar localmente

1. Instale Node.js (versão 20 ou superior).
2. Na pasta do projeto, execute `npm install` e depois `npm run dev`.
3. Copie `.env.example` para `.env.local` e preencha a URL e a chave pública/anon do projeto Supabase.

Sem as variáveis, o app mostra o painel vazio e a indicação de configuração. Não coloque a chave `service_role` no navegador nem no GitHub. O arquivo `.env.local` é ignorado pelo Git.

## Preparar o Supabase

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**, execute `supabase/migrations/001_initial_schema.sql`.
3. Em **Authentication → Users**, crie o usuário de administração.
4. No SQL Editor, dê permissão de administrador ao UUID desse usuário:

```sql
insert into public.admin_users (user_id)
values ('UUID_DO_USUARIO_AUTH');
```

O acesso de leitura aos perfis exige login. Apenas usuários listados em `admin_users` podem criar, editar ou excluir perfis. O usuário inicial é incluído pelo SQL Editor, evitando qualquer mecanismo inseguro de autoelevação pelo navegador.

## Publicar

- **GitHub:** envie os arquivos do projeto, sem `.env.local`, senhas ou dados pessoais de perfil.
- **Vercel:** importe o repositório e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente. O arquivo `vercel.json` atende a navegação da aplicação.
- Execute `npm run build` para gerar a pasta `dist`.

## Dados e migração

Este projeto começa sem cópia de perfis embutida no código. Isso evita publicar e-mails e informações pessoais no repositório. Depois de criar o banco, os perfis podem ser cadastrados pela tela administrativa ou importados com uma rotina local autorizada. A senha do painel antigo não é reaproveitada: o acesso novo usa Supabase Auth.
