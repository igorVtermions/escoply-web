<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Escoply — contexto obrigatório para agentes

## Antes de agir

1. Leia [o índice de contexto](docs/agent-context/README.md) e os guias indicados para a tarefa.
2. Confira o código atual e `git status --short`. Preserve alterações existentes, inclusive arquivos não rastreados.
3. Antes de escrever código Next.js, consulte o guia pertinente em `node_modules/next/dist/docs/`. Se as dependências não estiverem instaladas, registre essa limitação e consulte documentação oficial compatível com a versão do projeto.
4. Ao mudar comportamento, atualize o guia afetado e registre decisões relevantes em [CONTENT_LOG](docs/CONTENT_LOG.md). Não use a documentação como substituto da leitura da implementação.

## Produto em um minuto

Escoply é um SaaS em português brasileiro para freelancers organizarem sua operação: **cliente → projeto → escopo → orçamento → aprovação → entrega → pagamento**. Marca: **“Do briefing à entrega, tudo no controle.”**

- Três superfícies: landing pública, workspace em `/dashboard` e administração em `/admin`.
- Projetos pertencem a clientes; materiais, escopo e aprovações ficam no detalhe do projeto.
- Agenda reúne calendário e Kanban. Tarefas são registros em `reminders`; `/dashboard/tarefas` redireciona para a agenda, mas seus arquivos de lógica e CSS continuam ativos.
- Financeiro registra recebimentos do freelancer. Não confundir com cobrança de assinatura do Escoply.
- Planos do usuário, integrações externas e IA têm partes simuladas ou futuras. Consulte a matriz de funcionalidades antes de prometer funcionamento.
- O isolamento atual é por usuário (`owner_id`), sem modelo implementado de organizações/equipes compartilhadas.

## Regras de implementação

- Stack: Next.js 16.2.10, React 19.2.4, TypeScript estrito, Tailwind 4, CSS por domínio, Supabase e Lucide. Use npm e preserve `package-lock.json`.
- `app/**/page.tsx`: autenticação, parâmetros, leitura inicial e composição. `lib/<domínio>/`: consultas e transformação. `components/<domínio>/`: interface. `app/**/actions.ts`: mutações no servidor.
- Mantenha Server Components por padrão; use `"use client"` onde houver interação. `params`, `searchParams` e `cookies()` são assíncronos nos usos existentes.
- Não introduza `any`, nova biblioteca de UI, estado global, ORM ou arquitetura paralela sem necessidade concreta da tarefa.
- Autentique cada mutação; obtenha o proprietário da sessão, nunca do formulário. Valide entrada e relações, mantenha filtros por proprietário e RLS.
- Chaves privilegiadas ficam apenas no servidor. Actions administrativas devem validar administrador **ativo** antes de usar o cliente privilegiado; o layout sozinho não protege uma action.
- Novas mudanças de banco entram em novas migrations. Não reescreva migrations aplicadas. A existência do arquivo não comprova aplicação remota.
- Considere todas as telas afetadas ao revalidar dados: dashboard, agenda, listas e detalhe podem consumir o mesmo registro.
- Preserve contratos entre SQL e UI, especialmente `cancelled` no banco versus `canceled` no financeiro e tarefas versus leitura de notificações.

## Regras de interface

- Preserve a identidade azul-marinho/roxo, superfícies claras, bordas discretas e ícones Lucide. Inter é a fonte principal; admin usa Sora.
- Leia [UI/UX e design system](docs/agent-context/UI_UX.md) antes de alterar telas. O sistema visual é implementado em CSS e componentes, sem biblioteca universal de primitivas.
- Reutilize o shell, os componentes e o padrão do domínio. Não replique sidebar/topbar dentro das páginas.
- Use feedback real de carregamento, sucesso, erro e vazio; `showToast` é o mecanismo compartilhado. Não apresente sucesso antes da persistência.
- Em novos diálogos, mantenha semântica acessível, teclado, foco, bloqueio/restauração de scroll e portal quando o overlay precisar cobrir a viewport.
- CSS de domínio é global: use prefixos específicos e examine os arquivos de overrides antes de mudar seletores.
- Textos em pt-BR, moeda BRL, datas de negócio em `America/Sao_Paulo`. Respeite a diferença entre data sem horário e timestamp.
- Não transforme mocks, estimativas ou roadmap em informações reais na interface.

## Onde procurar

| Necessidade | Guia |
| --- | --- |
| Ideia, público, funcionalidades e rotas | [Produto](docs/agent-context/PRODUCT.md) |
| Stack, camadas, componentes e fluxo de dados | [Arquitetura](docs/agent-context/ARCHITECTURE.md) |
| Banco, autenticação, permissões e uploads | [Dados e segurança](docs/agent-context/DATA_SECURITY.md) |
| Design, páginas, responsividade e interação | [UI/UX](docs/agent-context/UI_UX.md) |
| Como implementar e validar alterações | [Desenvolvimento](docs/agent-context/DEVELOPMENT.md) |
| Mocks, inconsistências e limites conhecidos | [Lacunas](docs/agent-context/KNOWN_GAPS.md) |

## Validação e limites

Para alterações de código, execute `npm run lint` e `npx tsc --noEmit` (no PowerShell, `npm.cmd`/`npx.cmd` se necessário). Use build e verificações funcionais proporcionais à mudança. Não há suíte de testes automatizados configurada no snapshot documentado.

Não execute limpeza de dados, exclusão de conta, reset de banco, aplicação remota de migrations ou deploy como parte de uma simples análise. São operações com efeitos reais e dependem do escopo solicitado.
