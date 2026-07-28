<p align="center">
  <img src="./public/images/icon-escoply.png" alt="Ícone do Escoply" width="112" />
</p>

<h1 align="center">Escoply Web</h1>

<p align="center">
  <strong>Do briefing à entrega, tudo no controle.</strong>
</p>

Escoply Web é uma plataforma SaaS para freelancers centralizarem clientes, projetos, escopos, orçamentos, aprovações, materiais, prazos, agenda, obrigações recorrentes, recebimentos e configurações da conta.

A proposta do produto é resolver uma dor operacional real: informações importantes ficam espalhadas entre WhatsApp, Drive, e-mail, planilhas, anotações e memória. O Escoply organiza essa rotina em um fluxo rastreável:

```text
Cliente → Projeto → Escopo → Orçamento → Aprovação → Entrega → Pagamento
```

## Prévia visual

### Landing page

![Landing page do Escoply](./public/screenshots/landing-page.png)

### Criação de conta

![Modal de criação de conta](./public/screenshots/signup-modal.png)

### Login

![Modal de login](./public/screenshots/login-modal.png)

## Estado atual do projeto

O projeto já evoluiu além da landing page. A aplicação possui área autenticada, integração com Supabase e módulos internos funcionais para a operação principal do freelancer.

Implementado atualmente:

- landing page institucional responsiva;
- autenticação com Supabase Auth;
- cadastro com foto/avatar opcional;
- login, sessão protegida e recuperação de senha;
- dashboard autenticado com dados reais;
- navegação interna com sidebar e topbar;
- perfil do usuário com avatar, nome, telefone, profissão e bio;
- gestão de clientes com logo, edição, exclusão e detalhes;
- gestão de projetos com criação, edição, exclusão e detalhes completos;
- escopo do projeto com etapas editáveis;
- orçamento vinculado ao projeto e exportação em PDF;
- materiais dentro do detalhe do projeto, separados por arquivos, links e anotações;
- agenda com calendário e Kanban de tarefas;
- notificações internas com marcação como lida e limpeza;
- obrigações recorrentes conectadas ao Supabase;
- financeiro conectado ao Supabase, com recebimentos, status, comprovantes e relatórios;
- modais e menus usando portal quando precisam cobrir a tela inteira;
- toasts personalizados para feedbacks de ações;
- migrations SQL e Edge Function centralizadas em `supabase/`.

Ainda não implementado ou em evolução:

- planos/pagamentos reais de assinatura;
- integrações externas como WhatsApp, Google Calendar, Google Drive e e-mail;
- IA/RAG do Escoply;
- app mobile;
- políticas finais de Termos de Uso e Privacidade revisadas juridicamente.

## Stack

- Next.js 16 com App Router
- React 19
- TypeScript
- Tailwind CSS 4
- CSS Modules e CSS por domínio de tela
- Supabase Auth, Database, Storage e Edge Functions
- Lucide React para ícones
- Inter via `next/font`

## Requisitos

- Node.js 20 ou superior
- npm
- Conta/projeto Supabase
- Supabase CLI, quando for aplicar migrations ou functions

## Variáveis de ambiente

Crie um arquivo `.env` local com as variáveis públicas do Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Observações:

- `.env` não deve ser versionado.
- Não coloque `service_role` ou secret keys em variáveis `NEXT_PUBLIC_*`.
- A Edge Function `delete-account` usa secrets próprios no Supabase, não no client.

## Executando localmente

Instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

A aplicação fica disponível em:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev      # inicia o servidor de desenvolvimento
npm run build    # gera o build de produção
npm run start    # executa o build de produção
npm run lint     # executa ESLint
```

Validação de TypeScript:

```bash
npx tsc --noEmit
```

No Windows/PowerShell, se `npx` for bloqueado por Execution Policy, use:

```bash
npx.cmd tsc --noEmit
```

## Rotas principais

| Rota | Descrição |
| --- | --- |
| `/` | Landing page institucional |
| `/auth/callback` | Callback de autenticação Supabase |
| `/auth/reset-password` | Redefinição de senha |
| `/dashboard` | Dashboard principal autenticado |
| `/dashboard/clientes` | Gestão de clientes |
| `/dashboard/projetos` | Lista e gestão de projetos |
| `/dashboard/projetos/[projectId]` | Detalhe completo do projeto |
| `/dashboard/agenda` | Calendário e Kanban de tarefas |
| `/dashboard/obrigacoes` | Obrigações recorrentes |
| `/dashboard/financeiro` | Recebimentos, cobranças e relatórios |
| `/dashboard/configuracoes` | Configurações da conta |
| `/finance` | Redirecionamento/compatibilidade para financeiro |
| `/obligations` | Redirecionamento/compatibilidade para obrigações |
| `/settings` | Redirecionamento/compatibilidade para configurações |

## Estrutura do projeto

```text
app/
├── auth/                         # callback e recuperação de senha
├── dashboard/                    # área autenticada
│   ├── agenda/
│   ├── clientes/
│   ├── configuracoes/
│   ├── financeiro/
│   ├── obrigacoes/
│   ├── projetos/
│   └── tarefas/                  # rota legada/compatibilidade
├── finance/                      # rota de compatibilidade
├── obligations/                  # rota de compatibilidade
├── settings/                     # rota de compatibilidade
├── globals.css
├── layout.tsx
└── page.tsx

components/
├── auth/                         # formulários de autenticação
├── dashboard/                    # dashboard, shell, clientes, projetos, agenda
├── finance/                      # financeiro, recebimentos e relatórios
├── landing/                      # landing page e modal de auth
├── obligations/                  # obrigações recorrentes
├── settings/                     # configurações da conta
└── ui/                           # componentes utilitários compartilhados

lib/
├── agenda/
├── auth/
├── clients/
├── dashboard/
├── finance/
├── obligations/
├── projects/
└── supabase/

supabase/
├── migrations/                   # schema, RLS, Storage e evolução do banco
├── functions/                    # Edge Functions
├── config.toml
├── README.md
└── seed.sql

public/
├── images/                       # logo e ícone oficiais
└── screenshots/                  # imagens usadas neste README
```

## Supabase

A pasta `supabase/` centraliza a infraestrutura do backend:

- migrations SQL;
- políticas de RLS;
- buckets de Storage;
- Edge Functions;
- seed inicial.

Principais domínios já modelados:

- `profiles`;
- `clients`;
- `projects`;
- escopos/etapas;
- budgets/orçamentos;
- materials/materiais;
- payments/recebimentos;
- obligations/obrigações;
- tasks/agenda;
- notifications.

Para aplicar migrations no projeto remoto:

```bash
npx supabase db push
```

Para listar o estado local/remoto:

```bash
npx supabase migration list
```

Para publicar a Edge Function de exclusão de conta:

```bash
npx supabase functions deploy delete-account
```

Detalhes específicos ficam em [`supabase/README.md`](./supabase/README.md).

## Autenticação e segurança

A área `/dashboard` é protegida por sessão Supabase. O helper `requireUser()` redireciona usuários não autenticados para a landing page com modal de login.

Pontos atuais:

- Auth via Supabase;
- cookies de sessão via `@supabase/ssr`;
- modo “lembrar de mim” com persistência controlada;
- RLS nas tabelas principais;
- Storage privado para avatares, logos de clientes, materiais e comprovantes;
- exclusão de conta via Edge Function com service role isolada no backend.

## Design system

A identidade visual usa azul-marinho e roxo como base:

```text
Primary:        #071E63
Primary Dark:   #041342
Primary Light:  #123A9C
Secondary:      #8B5CF6
Secondary Dark: #6D28D9
Secondary Light:#A78BFA
Background:     #F8FAFC
Surface:        #FFFFFF
Border:         #E2E8F0
Text:           #0F172A
Text Muted:     #64748B
```

O padrão visual do produto prioriza:

- cards brancos com bordas suaves;
- sombras discretas;
- bastante espaçamento;
- tipografia Inter;
- ícones lineares;
- modais com overlay global;
- feedback por toast;
- responsividade mobile-first.

## Convenções técnicas

- Usar TypeScript sem `any`.
- Preferir Server Components para leitura inicial de dados.
- Usar Server Actions para mutações simples.
- Uploads maiores devem ir direto para Supabase Storage pelo client.
- Manter migrations novas em arquivos novos; não alterar migrations já aplicadas em produção.
- Não versionar `.env`, `.next`, `node_modules` ou `supabase/.temp`.
- Manter materiais dentro do detalhe do projeto, não como página principal.

## Validação antes de commit

Antes de subir alterações relevantes:

```bash
npm run lint
npx tsc --noEmit
```

Quando houver alteração de schema:

```bash
npx supabase migration list
npx supabase db push
```

## Roadmap

Próximas frentes prováveis:

- transformar configurações profissionais/preferências/notificações em dados reais;
- completar integrações externas;
- melhorar permissões e auditoria;
- criar templates finais de e-mail;
- evoluir relatórios financeiros;
- adicionar camada futura de IA/RAG;
- preparar deploy de produção.

## Observação legal

Os textos de Termos de Uso e Política de Privacidade presentes na interface são preliminares. Antes de lançamento comercial, devem passar por revisão jurídica.

## Autor

Desenvolvido por **Igor Franco**.
