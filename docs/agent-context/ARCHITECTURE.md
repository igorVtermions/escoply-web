# Arquitetura e organização de código

## Stack observada

Versões declaradas em `package.json`; intervalos com `^` não são versões exatas instaladas. O lockfile é a referência da resolução.

| Camada | Tecnologia / versão declarada | Papel |
| --- | --- | --- |
| Framework | Next.js `16.2.10` | App Router, Server Components, Server Actions, layouts e rotas |
| UI | React / React DOM `19.2.4` | Hooks, transições, estado otimista, portais e formulários |
| Linguagem | TypeScript `^5`, modo `strict` | Tipagem de props, dados e actions |
| Estilos | Tailwind CSS `^4`, `@tailwindcss/postcss` | Utilitários, tokens inline e CSS tradicional |
| Backend | `@supabase/supabase-js ^2.110.0` | Auth, Postgres/PostgREST, Storage e funções |
| Sessão SSR | `@supabase/ssr ^0.12.0`, `cookie ^1.1.1` | Cookies e clientes por ambiente |
| Ícones | `lucide-react ^1.23.0` | Ícones lineares |
| Fontes | `next/font/google` | Inter; Sora na administração |
| Qualidade | ESLint `^9`, `eslint-config-next 16.2.10` | Regras Next, React e TypeScript |
| Backend especial | Supabase Edge Function / Deno | Exclusão autenticada da conta |

Há override de PostCSS `8.5.10` dentro da dependência Next. Não há dependência declarada de ORM, biblioteca de formulários, validação de schema, estado global, gráficos, drag-and-drop ou geração de PDF. Gráficos e impressão são feitos com recursos da própria interface. Não pressupor shadcn, Radix, Zustand, React Query, Prisma, Zod ou Framer Motion.

## Árvore funcional

```text
app/                    rotas, layouts, actions e CSS de domínio
  auth/                 callback, bloqueio e reset de senha
  dashboard/            shell operacional e módulos do freelancer
  admin/                shell e módulos administrativos
components/             interface por área funcional
  ui/                   utilitários compartilhados, não uma biblioteca completa
  landing/, auth/       aquisição e autenticação
  dashboard/            shell e módulos mais antigos/maiores
  finance/              composição mais granular do financeiro
  obligations/          composição mais granular das obrigações
  settings/, admin/     componentes de cada superfície
lib/                    consultas, mapeamentos e infraestrutura
  supabase/             browser, server, proxy e admin
  auth/                 sessão e política de persistência
  <domínio>/            leitura e transformação de dados
types/                  tipos administrativos compartilhados
constants/              marca e conteúdo da landing
data/                   mocks administrativos
supabase/               migrations, função Deno, config e seed
public/                 logo, ícone e screenshots existentes
docs/                   contexto de agentes e diário técnico
```

Imports internos usam `@/*` apontando para a raiz. Arquivos usam em geral kebab-case; componentes React e tipos usam PascalCase; funções e props, camelCase; colunas SQL, snake_case. As rotas do workspace são em português, enquanto pastas de componentes/lib usam nomes em inglês.

## Fluxo de leitura e mutação

Google (26/09/2026): `lib/google/automatic.ts` processa outbox transacional criada por triggers, direcionando somente os IDs alterados a `sync.ts`/`business.ts`. `schedule.ts` agenda tentativa após Server Actions; `GoogleAutomaticSync` retoma no workspace visível. `GoogleAgendaButton` abre a configuração em modal, sem painel extenso no calendário. Histórico usa `preview.ts`/seleção explícita; projeções de negócio nunca alteram sua fonte pelo Google.

```text
Requisição → proxy de sessão (dashboard) → layout/page no servidor
   → requireUser → lib/<domínio>/data → Supabase com sessão + RLS
   → objeto tipado/serializável → componente de interface

Interação → estado local / useActionState / transição → Server Action
   → autenticação + validação + propriedade → Supabase
   → resultado/erro → revalidatePath → toast + refresh/navegação
```

`page.tsx` normalmente valida parâmetros, pede sessão, chama o leitor e entrega dados ao componente. Filtros de clientes, projetos e agenda usam a URL; financeiro e obrigações filtram coleções carregadas no client. Não alterar esse contrato incidentalmente: filtros na URL têm comportamento diferente em recarregar, compartilhar e voltar.

As consultas usam `select`, filtros por proprietário, joins, ordenação e, em alguns casos, limites/paginação. Os mapeamentos convertem `numeric` em número, snake_case em camelCase, status legados em estados da UI e caminhos de Storage em URLs assinadas. `lib` é a camada adequada para essas transformações, não cada célula da tabela.

## Layouts e navegação

- `app/layout.tsx`: idioma, metadata, Inter, CSS global e uma instância de `ToastProvider`.
- `app/dashboard/layout.tsx`: sessão, perfil, checagem de bloqueio, avatar assinado, dados do dashboard e `WorkspaceShell`.
- `WorkspaceShell`: sidebar, topbar, popovers, notificações, logout, prefetch e navegação otimista. A página fornece apenas conteúdo interno.
- `app/dashboard/loading.tsx`: estado de carregamento da área.
- `app/admin/layout.tsx`: perfil admin ativo, Sora e `AdminSidebar`.
- `AdminHeader`: componente de servidor que também carrega notificações administrativas.
- `proxy.ts`: matcher de `/dashboard/:path*`; delega a `lib/supabase/proxy.ts`. Não cobre `/admin` no snapshot atual.

## Mapa de manutenção por domínio

| Domínio | UI principal | Leitura | Escrita |
| --- | --- | --- | --- |
| Landing/auth | `components/landing/`, `components/auth/` | sessão e cliente Supabase | Auth no browser, callback/rotas |
| Dashboard/notificações | `dashboard-content.tsx`, `workspace-shell.tsx` | `lib/dashboard/data.ts` | `app/dashboard/actions.ts` |
| Clientes | `components/dashboard/clients-section.tsx` | `lib/clients/data.ts` | `app/dashboard/clientes/actions.ts` |
| Projetos | `components/dashboard/projects-section.tsx` | `lib/projects/data.ts` | `app/dashboard/projetos/actions.ts` |
| Detalhe | `components/dashboard/project-detail-section.tsx` | `lib/projects/detail-data.ts` | `app/dashboard/projetos/[projectId]/actions.ts` |
| Agenda/tarefas | `agenda-section.tsx`, `tasks-section.tsx` | `lib/agenda/data.ts`, `lib/tasks/data.ts` | `app/dashboard/tarefas/actions.ts` |
| Financeiro | `components/finance/` | `lib/finance/data.ts` | `app/dashboard/financeiro/actions.ts` |
| Obrigações | `components/obligations/` | `lib/obligations/data.ts` | `app/dashboard/obrigacoes/actions.ts`; há criação também nas actions do dashboard |
| Configurações | `components/settings/` | consultas em `app/dashboard/configuracoes/page.tsx` | actions da mesma pasta; Auth/Storage no client quando necessário |
| Admin | `components/admin/` | `lib/admin/{data,plans,notifications,support}.ts` | `app/admin/{users,plans,support}/actions.ts` |

Nas células com nomes curtos de componentes do dashboard, o diretório é `components/dashboard/`.

## Componentização existente e diretriz de evolução

O repositório combina dois níveis de decomposição. Clientes/projetos/detalhe possuem arquivos grandes com subcomponentes e modais internos. Financeiro/obrigações/configurações separam cabeçalho, filtros, cards, tabelas, painéis e diálogos. A segunda estrutura é uma boa referência para novas telas de gestão, sem exigir reescrita das anteriores.

`components/ui/` disponibiliza `BrandLogo`, `ButtonLink`, `SectionHeading`, `CountUp` e toast. `ButtonLink` é uma âncora estilizada, principalmente da landing; não é substituto automático de um botão de formulário. `SectionHeading` atende seções de apresentação; cabeçalhos operacionais têm componentes próprios.

Diretrizes:

1. Mantenha orquestração da página separada da apresentação interativa.
2. Deixe no domínio componentes e regras que só fazem sentido nele.
3. Extraia uma unidade quando ela tiver responsabilidade própria, repetição concreta ou lógica que precise de teste isolado.
4. Promova para `components/ui/` apenas uma primitiva sem dependência de tabela, rota ou regra de negócio.
5. Não unifique componentes só porque têm nomes semelhantes; financeiro, obrigações e admin têm estados e contratos diferentes.
6. Compartilhe formatação/validação quando a semântica for realmente igual; há duplicações atuais de moeda, datas, UUID e modais.
7. Não importe execução de consultas `server-only` em componentes client. Use `import type` para contratos quando aplicável.

## Configurações relevantes

- `next.config.ts`: limite de corpo de Server Actions de **12 MB**, indicadores dev desativados, remoção de `X-Powered-By` e headers de proteção.
- `tsconfig.json`: ES2017, resolução bundler, JSX React, alias da raiz e exclusão de `supabase/functions` da verificação Next/TS.
- `eslint.config.mjs`: presets de core web vitals e TypeScript; ignora saídas de build.
- `postcss.config.mjs`: plugin Tailwind 4. Tokens estão em `@theme inline`, não num `tailwind.config` tradicional.
- `CLAUDE.md`: referencia `@AGENTS.md`; mantenha um ponto central de instruções.

## Particularidades que não devem virar suposições

Google Agenda/Tasks: `lib/google/` contém OAuth/criptografia, mapeamento e sincronização manual; `components/google/` contém painel e formulários. Server Actions em `configuracoes/google-actions.ts`, `agenda/event-actions.ts` e `tarefas/edit-action.ts`. Callback externo em `/api/integrations/google/callback`; não reutiliza o callback de login Supabase. Compromissos usam `calendar_events`, tarefas continuam em `reminders`. Fluxo, limites e ativação estão no [guia Google](../GOOGLE_INTEGRATION.md). Não há worker, webhook ou job pago.

- `admin-realtime.css` é nome de stylesheet; não comprova assinatura Supabase Realtime. Nas interações examinadas, atualização usa `router.refresh()`.
- `app/api` contém o callback Google; as mutações principais continuam como Server Actions.
- Server Actions do workspace retornam em geral `{ success, message }`; admin usa exceções capturadas na UI. Preserve o contrato do módulo ao editar.
- Algumas telas chamam dados compartilhados mais de uma vez (layout e dashboard). Avalie duplicação com cuidado; cache compartilhado nunca pode misturar proprietários.
- CSS por rota continua sendo global. A ordem de importação e a cascata fazem parte do comportamento real.
