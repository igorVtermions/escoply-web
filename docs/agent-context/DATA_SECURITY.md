# Dados, autenticação e segurança

## Modelo e isolamento

O backend é Supabase: Auth para identidade, Postgres para dados, Storage para arquivos e uma Edge Function Deno. O workspace usa **propriedade por usuário**, normalmente com `owner_id = auth.users.id`. Não há camada de organização/tenant compartilhado modelada no repositório.

As migrations são incrementais. Para entender o schema atual, leia a criação e todas as alterações da entidade; a migration inicial isolada não descreve a versão final.

| Entidade | Responsabilidade e relações |
| --- | --- |
| `auth.users` | Identidade, e-mail, senha gerenciada pelo Auth e metadados |
| `profiles` | PK ligada ao usuário, nome/empresa/avatar, perfil pessoal/profissional, `role`, `status`, `plan` |
| `clients` | Contato comercial do proprietário; nome, empresa, e-mail, telefone, WhatsApp, website, observações, status, último contato e logo |
| `projects` | Cliente obrigatório; descrição, status, prazo, valor estimado, progresso, tipo de trabalho e tags |
| `reminders` | Tarefas/lembretes com projeto opcional, tipo, data/hora, conclusão, coluna Kanban e estados de notificação |
| `budgets` | Orçamentos do projeto; valor, status, validade e condição de pagamento |
| `payments` | Recebimentos do projeto, orçamento opcional, tipo, valor, vencimento, pagamento e metadados do comprovante |
| `obligations` | Rotinas/custos do usuário, recorrência, vencimento, valor opcional, atividade, cliente/projeto opcionais |
| `project_scope_items` | Checklist ordenado por `position`, conclusão em `completed_at` |
| `project_approvals` | Aprovações registradas no projeto, nota, status e data de aprovação |
| `project_materials` | Arquivo, link ou anotação no projeto; caminho, tamanho e MIME quando arquivo |
| `notification_preferences` | Uma linha por proprietário com preferências booleanas |
| `notification_states` | Chave composta `(owner_id, source, source_id)` para leitura/descarte de prazo, pagamento e orçamento |
| `plans` | Catálogo global, preços, promoções, limites e flags de recursos; leitura por autenticados |
| `support_tickets` | Chamados com código `SUP-...`, usuário opcional, identidade registrada, tipo, prioridade e status |
| `support_ticket_replies` | Respostas de um ticket, autor, papel e mensagem |

Não há tabela `tasks` nem tabela genérica `notifications` nas migrations examinadas. São conceitos da aplicação sobre `reminders`, `obligations` e notificações calculadas.

## Relações e efeitos de exclusão

```text
auth.users ─ profiles
    └ owner_id ─ clients ─ projects ─ budgets
                              ├ payments ─ budget_id opcional
                              ├ reminders
                              ├ project_scope_items
                              ├ project_approvals
                              └ project_materials
    ├ obligations ─ cliente/projeto opcionais
    ├ notification_preferences
    └ notification_states

support_tickets ─ support_ticket_replies
```

`202607060002_enforce_relation_ownership.sql` introduz FKs compostas com `owner_id`: uma relação não deve apontar para cliente/projeto/orçamento de outro dono. Os módulos de detalhe e obrigações seguem essa abordagem. Isso não substitui validação de consistência adicional, como garantir que o orçamento escolhido pertence ao mesmo projeto do pagamento.

A exclusão de cliente propaga para projetos, e destes para várias dependências. Em obrigações, vínculos opcionais usam `SET NULL` para preservar o registro. A exclusão de orçamento pode limpar `payments.budget_id`. Objetos de Storage não são automaticamente apagados pela cascata de linhas SQL.

## Contratos de status

| Conceito | Valores / tradução relevante |
| --- | --- |
| Cliente | `active`, `prospect`, `inactive` |
| Projeto | `in_progress`, `review`, `completed`, `delayed`, `archived` |
| Trabalho | `design`, `tech`, `marketing`, `content`, `consulting`, `branding`, `automation`, `other` |
| Orçamento | `draft`, `sent`, `approved`, `rejected`, `expired` |
| Aprovação | `pending`, `approved`, `rejected`, `review` |
| Material | `file`, `link`, `note` |
| Tarefa | `todo`, `in_progress`, `paused`, `completed`; `overdue` é também agrupamento/filtro derivado |
| Tipo de tarefa | `meeting`, `action`, `review`, `delivery`, `follow_up`, `charge`, `other` |
| Recebimento SQL | `pending`, `paid`, `overdue`, `cancelled` |
| Recebimento UI financeiro | `pending`, `paid`, `overdue`, **`canceled`** |
| Tipo de recebimento | `deposit`, `final_payment`, `installment`, `extra` |
| Obrigação UI | `pending`, `paid`, `overdue`, `upcoming`, `inactive` |
| Obrigação SQL legado | Também aceita `not_started`, `in_progress`, `completed`; leitor normaliza |
| Recorrência | `weekly`, `monthly`, `quarterly`, `yearly`, `custom` |
| Papel da conta | `user`, `admin` |
| Status da conta | `active`, `blocked`, `pending` |
| Plano persistido | `free`, `starter`, `pro`, `ai` |
| Status de suporte | `new`, `open`, `in_progress`, `waiting_user`, `planned`, `resolved`, `closed`, `rejected` |
| Prioridade de suporte | `low`, `medium`, `high`, `urgent` |

Datas vencidas podem gerar status de exibição sem gravar alteração no banco. `contribution` legado em obrigações é mapeado para `tax`. Tipos de pagamento antigos podem ser inferidos pela descrição. Ao mudar um enum, confira SQL, tipos, mapper, filtros, badges, formulários e exportações.

## Regras de negócio com impacto técnico

- `projects.progress` é persistido independentemente da conclusão do checklist. Não presumir sincronização automática.
- A lista de projetos estima contagem de escopo com total fixo de 20. O detalhe gera seis sugestões se não houver etapas, com IDs `fallback-*`; essas sugestões não são UUIDs persistidos.
- O detalhe carrega o orçamento mais recente, embora o banco aceite múltiplos orçamentos por projeto.
- Salvar orçamento também tenta atualizar `projects.estimated_value`, em operações separadas.
- Dashboard soma recebimentos pendentes/atrasados e orçamentos enviados/aprovados sem plano de pagamentos associado. Financeiro tem sua própria composição de indicadores.
- `notification_read_at`, `notification_dismissed_at`, `task_status` e `completed_at` têm sentidos diferentes. Não apagar uma tarefa para limpar a central.
- Recorrência de obrigação é armazenada, mas marcar paga só atualiza o registro atual. Não há job identificado que crie o próximo vencimento.
- Datas sem horário usam strings `YYYY-MM-DD`; vários cálculos usam meio-dia UTC para evitar deslocamento de dia. Horários e “hoje” de negócio usam `America/Sao_Paulo`. Há trechos com offset fixo `-03:00`; revisar em mudanças de calendário.

## Autenticação e clientes Supabase

| Arquivo | Uso |
| --- | --- |
| `lib/supabase/client.ts` | Singleton no navegador; retorna `null` sem configuração pública; gerencia modo de persistência |
| `lib/supabase/server.ts` | Cliente por contexto de servidor com `await cookies()`; sessão do usuário e RLS |
| `lib/supabase/proxy.ts` | Renova cookies e valida sessão em rotas cobertas pelo proxy |
| `lib/supabase/admin.ts` | Cliente privilegiado `server-only`, sem persistência/refresh de sessão |
| `lib/auth/session.ts` | `getCurrentUser` com `cache` do React e `requireUser` com redirecionamento |
| `lib/auth/persistence.ts` | Cookie `escoply-session-mode`, modos `session` e `persistent` |

Auth usa `getUser()` para validar a identidade. `requireUser()` verifica autenticação; não verifica sozinho papel administrativo nem status do perfil. O layout do dashboard trata `blocked`; o layout do admin exige papel admin ativo. Actions administrativas repetem essa autorização antes de usar a chave privada.

O proxy é limitado ao dashboard. Não ampliar matcher nem trocar o mecanismo de sessão sem revisar callback, reset, admin e cookies. Em Server Components, gravação de cookies pode não ser permitida; o helper trata esse caso e depende do proxy para renovação nas rotas cobertas.

O callback aceita somente `/dashboard` e `/auth/reset-password` como destinos e define `Cache-Control: no-store`. Recuperação inicia com `resetPasswordForEmail`. Troca de senha nas configurações exige senha atual e regra local de oito caracteres, maiúscula, minúscula, número e especial.

## RLS e administração

As tabelas operacionais habilitam RLS por proprietário, com políticas de leitura/escrita, índices e triggers de `updated_at`. O perfil é criado por trigger do Auth. A migration de admin protege autoalteração de `role`, `status` e `plan` por trigger.

O cliente privilegiado pode ultrapassar RLS: `server-only` impede importação no client, mas **não substitui autorização**. Uma nova action admin deve primeiro validar sessão, papel ativo, campos permitidos e alvo. Helpers de leitura admin atuais dependem da superfície protegida; revisar autorização antes de reutilizá-los em novos pontos de entrada.

Mudança de plano pelo admin atualiza `profiles.plan`. Bloqueio também usa `auth.admin.updateUserById` com banimento. A sequência atual precisa de revisão antes de ser tomada como padrão para novos fluxos sensíveis; ver [Lacunas](KNOWN_GAPS.md).

Na migration de suporte, usuário pode criar/ler ticket próprio e ler respostas do próprio ticket. Escritas administrativas usam o cliente privilegiado. A action atual de criação no admin registra nome/e-mail/plano, mas não associa `user_id`; portanto, não presumir que esse ticket aparecerá numa futura central do usuário.

## Storage

### Integração Google (migration aplicada no escoply em 25/09/2026)

Atualização 26/09/2026: migrations `202609250002` e `202609260001` aplicadas no mesmo projeto. `google_business_links` e `google_outbox` são server-only com RLS e grants exclusivos service role. Triggers enfileiram mudanças somente de contas conectadas e categorias habilitadas. Vínculo de projeção não permite mutar fonte financeira/projeto; fila usa versão para não descartar alteração concorrente. Preferências `auto_business`/`auto_reminder_minutes` ficam em `google_connections`.

`202609250001_google_calendar_tasks.sql` adiciona `calendar_events` com RLS por usuário e tabelas `google_connections`, `google_oauth_states`, `google_sync_links`, `google_daily_usage` acessíveis somente por service role. Não liberar leitura client de tabelas de tokens. `googleContext` valida sessão e status ativo antes de criar o cliente privilegiado; esse caminho é autorizado para usuários comuns, não exige papel admin.

Tokens usam AES-256-GCM com proprietário autenticado; chave `GOOGLE_TOKEN_ENCRYPTION_KEY` no ambiente do servidor, além de `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`. Nenhuma variável pública. OAuth usa state de uso único e PKCE. Conflitos e exclusões precisam de revisão explícita. As tabelas de vínculos mantêm IDs sem FK para sobreviver à exclusão local até sua confirmação no Google. Consulte [guia Google](../GOOGLE_INTEGRATION.md) para lifecycle, limitações e testes ainda pendentes.

As novas colunas `reminders.google_notes` e `google_undated` preservam notas e ausência de vencimento do Tasks. O horário não é compartilhado pelo Tasks. Mover coluna não altera mais `scheduled_at`.

Todos os buckets abaixo são privados nas migrations, com políticas baseadas no primeiro segmento do caminho igual ao UID.

| Bucket | Limite configurado | Uso |
| --- | --- | --- |
| `avatars` | 5 MB | PNG, JPEG, WebP; cadastro/perfil |
| `client-logos` | 3 MB | PNG, JPEG, WebP |
| `project-materials` | 10 MB | PDF, imagens, texto e formatos ampliados pela migration de tipos |
| `payment-receipts` | 10 MB | PDF, imagens, TXT e CSV |

Materiais/comprovantes normalmente usam `<user_id>/<project_id>/<uuid>.<ext>`. Avatares/logos começam pelo UID. Persista o caminho, não a URL assinada temporária. As leituras examinadas geram URLs com validade de uma hora.

Há uploads diretos do navegador (ex.: avatar), mas materiais e comprovantes do detalhe passam atualmente por Server Actions. Mantenha alinhados `accept`, validação de MIME/tamanho no servidor, política do bucket e limite de corpo de 12 MB. Não afirmar que todos os uploads já são diretos.

O fluxo de criação de materiais/comprovantes tenta remover o arquivo se a inserção da linha falhar. Exclusões em cascata e limpeza de dados não fazem automaticamente essa mesma compensação.

## Edge Function e variáveis

`supabase/functions/delete-account/index.ts` aceita `DELETE` com Bearer token, valida o usuário, remove o avatar apontado no perfil e chama `auth.admin.deleteUser`. Preflight aceita `OPTIONS`. `ALLOWED_ORIGIN` define a origem CORS, com fallback local. Não há varredura dos demais buckets nessa implementação.

| Ambiente | Variáveis lidas no código |
| --- | --- |
| Web pública | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Servidor admin | `SUPABASE_SECRET_KEY`; URL via `SUPABASE_URL` ou fallback público |
| Edge Function | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGIN` |

Não copiar valores de `.env` para docs, logs ou respostas. Nunca prefixar chave privilegiada com `NEXT_PUBLIC_`. A função Deno não participa do `tsc` do aplicativo: precisa de validação própria quando alterada.

O `next.config.ts` adiciona `nosniff`, negação de framing, política de referrer, restrições de câmera/microfone/geolocalização e COOP. Isso é parte da configuração local; não constitui certificação de segurança do deployment.
