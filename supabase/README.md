# Supabase

Toda a infraestrutura de backend do Escoply deve permanecer centralizada nesta pasta.

## Estrutura

```text
supabase/
├── config.toml
├── migrations/
│   └── 202607030001_initial_auth.sql
├── functions/
│   ├── _shared/
│   │   └── cors.ts
│   └── delete-account/
│       └── index.ts
├── .env.example
└── seed.sql
```

## Fundação de autenticação

A primeira migração cria:

- `public.profiles`, ligada por chave estrangeira a `auth.users`;
- trigger automático para criar o perfil após o cadastro;
- atualização automática de `updated_at`;
- políticas RLS para leitura e edição do próprio perfil;
- bucket privado `avatars`, limitado a 5 MB e imagens PNG, JPEG ou WebP;
- políticas de Storage que restringem cada usuário à pasta do próprio UID.

O cadastro deve enviar estes campos em `options.data`:

```ts
{
  full_name: "Nome do usuário",
  company_name: "Nome opcional da empresa"
}
```

Arquivos de avatar devem seguir este padrão:

```text
<user_id>/<nome-do-arquivo>
```

O caminho retornado pelo Storage deve ser salvo em `profiles.avatar_path`.

## Edge Function: `delete-account`

Exclui o avatar e a conta autenticada. A função aceita somente `DELETE` com um JWT de usuário válido. A chave `SUPABASE_SERVICE_ROLE_KEY` é usada apenas dentro da função e nunca deve ser exposta no navegador.

## Fluxo após criar o projeto Supabase

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
npx supabase functions deploy delete-account
npx supabase secrets set ALLOWED_ORIGIN=https://seu-dominio.com
```

Para desenvolvimento local com Supabase CLI e Docker:

```bash
npx supabase start
npx supabase db reset
npx supabase functions serve --env-file supabase/.env.local
```

Crie `supabase/.env.local` a partir de `.env.example` e não versione segredos.

## Configurações do Dashboard

Depois de criar o projeto:

1. Configure a URL do site e as URLs de redirecionamento em **Authentication → URL Configuration**.
2. Durante os testes, a confirmação de e-mail está desabilitada. Reative-a antes do lançamento em produção.
3. Personalize os templates de confirmação e recuperação de senha.
4. Nunca copie a secret key ou service role key para variáveis `NEXT_PUBLIC_*`.

## Próximas migrações

Clientes, projetos, escopos, orçamentos e demais domínios devem ser adicionados em novas migrações, sem alterar uma migração que já tenha sido aplicada em produção.
