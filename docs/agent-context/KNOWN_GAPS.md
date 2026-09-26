# Lacunas, divergências e cuidados conhecidos

Snapshot de **25/09/2026**, por inspeção estática. Este arquivo orienta futuras tarefas; não autoriza mudanças de escopo nem afirma que todos os pontos foram reproduzidos em runtime. Mantenha separado o que é fato de implementação do que precisa de validação funcional.

## Produto e dados de demonstração

Atualização Google em 25/09/2026: conexão OAuth, compromissos e sincronização manual Calendar/Tasks foram implementados localmente, mas migration, autorização real e deploy ainda não foram executados. Regras, limites, casos de recuperação e verificações pendentes estão no [guia Google](../GOOGLE_INTEGRATION.md). As referências abaixo a integrações futuras aplicam-se às demais integrações.

| Observação confirmada no código | Evidência / efeito |
| --- | --- |
| Plano do workspace não reflete necessariamente a conta | `workspace-shell.tsx` exibe “Plano Profissional” e “7 de 10 projetos” fixos |
| Busca global é apresentação | Input e atalho visual `⌘ K` no shell não têm fluxo de busca/atalho implementado no componente |
| Planos têm catálogos divergentes | Banco/admin: Free/Starter/Pro/AI; configurações: Free/Profissional/Studio; landing tem apresentação própria |
| Checkout e quotas não estão integrados | Alteração administrativa de `profiles.plan` não significa assinatura cobrada nem limites impostos nas actions operacionais |
| Receita admin é estimativa | `getAdminPlansData` multiplica usuários do plano pelo preço efetivo, não por pagamentos de assinatura recebidos |
| Promoção não expira pelo simples preenchimento da data | `getEffectiveMonthlyPrice` considera flag ativa e preço; não compara `promotion_ends_at` com hoje |
| Admin ainda mistura suporte real e mock | `app/admin/page.tsx` prefere contagem de `supportTickets` mock quando não zero, mesmo com dado real disponível |
| Logs não são trilha de auditoria | `app/admin/logs/page.tsx` usa `data/admin-mock.ts`; filtros da página atual são controles sem ligação de filtragem |
| Novos arquivos locais de logs ainda não estão conectados | `components/admin/logs/`, `types/admin-log.ts` e `data/admin-logs-mock.ts` não substituem a rota atual no snapshot |
| Integrações são futuras | WhatsApp/e-mail existentes são links, não APIs conectadas; IA/RAG não está implementada |
| Preferência semanal não implica envio | `weekly_summary` existe no banco/UI, sem job de envio identificado |
| Catálogo admin tolera falha com fallback | `getAdminPlanDefinitions` retorna definições locais quando leitura falha; tela renderizada não comprova tabela atualizada |
| Configurações admin e disponibilidade são parciais | `/admin/settings` é simulado; “Online” no painel não é monitoramento completo de produção |

Arquivos `components/finance/mock-payments.ts` e `components/settings/settings-data.ts` existem, mas as páginas principais examinadas recebem dados reais do servidor; a existência do mock sozinha não torna todo o módulo simulado.

## Consistência de negócio e capacidade

1. **Escopo e progresso têm fontes distintas.** `lib/projects/data.ts` estima total de 20 etapas; `detail-data.ts` cria seis sugestões quando não há registros. Conclusão do checklist não atualiza automaticamente `projects.progress`. Um agente não deve usar essas contagens como medição exata do banco.
2. **Recorrência não agenda o próximo ciclo.** `markObligationAsPaidAction` apenas altera o registro atual. `custom` é uma opção, não um motor de regras de recorrência.
3. **Consultas são limitadas.** Financeiro e tarefas usam `.limit(300)`; dashboard tem limites menores por painel. Totais e relatórios derivados dessas coleções podem deixar de ser completos em contas maiores. Exportação JSON também não implementa paginação explícita para superar limites do servidor.
4. **Exportação JSON não é backup integral.** Exporta tabelas listadas nas actions de configurações, sem binários de Storage e sem os tickets/respostas novos. Não há importação/restauração correspondente identificada.
5. **Revalidação não é uniforme.** `revalidateProject` do detalhe cobre dashboard/lista/detalhe, mas não toda agenda/financeiro. Actions financeiras não revalidam sempre o detalhe. Validar atualização cruzada ao editar registros compartilhados.
6. **Datas têm caminhos diferentes.** Leitores usam São Paulo, enquanto `clearNotificationsAction` combina ISO UTC e métodos locais de `Date`. Revisar fronteira do dia ao corrigir notificações.
7. **Descarte de notificações calculadas merece correção/QA.** A leitura de `notification_states` em `getDashboardData` filtra `dismissed_at IS NULL`; assim os estados descartados ficam fora do mapa usado para filtrar notificações geradas. Há risco de reaparecimento após refresh. Confirmar o comportamento em ambiente de teste antes de alterar.
8. **Suporte ainda não fecha o ciclo com o usuário.** A criação administrativa não preenche `user_id`; resposta grava histórico e atualiza status, sem envio externo identificado. A migration estar local não comprova aplicação no Supabase.

## Autorização, operações destrutivas e integridade

Estas observações são específicas do código atual e devem ser tratadas quando o fluxo correspondente entrar no escopo.

- **Ordem de bloqueio administrativo:** `updateAdminUserStatusAction` altera o banimento no Auth antes de `updateUserProfile` rejeitar um alvo com papel admin. A validação do alvo deve anteceder o efeito sensível; as duas operações também podem divergir por falha parcial. Evidência: `app/admin/users/actions.ts`.
- **Limpeza por substring:** `clearTestDataAction` apaga linhas com termos como `teste`, `test`, `demo`, `mock` ou `exemplo`. Isso não prova que sejam dados descartáveis; nomes/textos reais podem coincidir, e cascatas ampliam a exclusão. Não executar para “organizar” uma conta durante análise.
- **Remoção de arquivos incompleta:** a Edge Function remove explicitamente apenas o avatar atual. Exclusões de clientes/projetos/pagamentos e limpeza de testes não garantem remoção dos respectivos objetos de Storage. Rever limpeza de órfãos e falhas da exclusão de conta.
- **Autorização não é só layout:** `requireUser` verifica sessão, não status/papel. Helpers admin de leitura usam chave privada e dependem de pontos de entrada protegidos. Não reutilizá-los como endpoints públicos.
- **Relação orçamento/projeto:** FK composta garante dono, mas não necessariamente que um `budget_id` pertence ao `project_id` informado. Validar explicitamente a relação ao evoluir criação/edição de recebimentos.
- **Operações múltiplas sem transação:** orçamento + valor de projeto, resposta + status de ticket e banimento + perfil são exemplos. Definir compensação/atomicidade conforme criticidade.
- **Sucesso sem linha afetada:** várias actions de update/delete verificam apenas `error`; a exclusão com redirecionamento do detalhe não trata o erro antes de navegar. Validar resultado ao trabalhar nesses fluxos.
- **Links de materiais:** `createMaterialAction` verifica presença de URL, mas não aplica allowlist de protocolo como o helper de perfil profissional. Revisar validação antes de ampliar apresentação de URLs fornecidas pelo usuário.

## UI/UX e manutenção

- CSS de domínio é global, com regras comprimidas, estilos repetidos e arquivos de overrides. Alterar só a primeira definição encontrada pode não mudar o resultado visual.
- `.tone-*` e outros nomes genéricos aparecem em superfícies diferentes. Verificar navegação entre rotas, não só recarga direta.
- Há modais com portal e outros inline; Escape, scroll, foco inicial, contenção e restauração de foco não estão centralizados. Não presumir conformidade de acessibilidade pelo uso de ARIA.
- Sidebar mobile e densidade de tabelas dependem de overrides; nenhuma auditoria visual autenticada foi feita nesta tarefa.
- Arquivos grandes, especialmente detalhe de projeto, concentram UI, dialogs, formatação e HTML de impressão. Extração gradual por responsabilidade é preferível a refatoração ampla incidental.
- Strings, regras de validação, UUID, datas, moeda e estados iniciais estão duplicados em alguns módulos. Consolidar apenas quando houver contrato comum comprovado.
- Há testes específicos Google em `tests/google-integration.test.mjs` (`npm run test:google`), com APIs e banco simulados. Não há CI geral de testes. Lint, tipos e esses testes não comprovam RLS remoto nem comportamento visual autenticado.

## Documentação anterior que exige interpretação

- README antigo tratava dados profissionais/notificações como próximos passos, mas já há consultas/actions/migrations correspondentes.
- README não abrangia completamente admin e suporte. Use a matriz de produto deste diretório.
- `supabase/README.md` descreve a fundação e chama domínios já existentes de “próximas migrações”. Leia o conjunto atual de migrations.
- Há TODOs no layout admin sobre mover ações para backend privilegiado, embora várias actions já usem `createSupabaseAdminClient`. Comentário não substitui inspeção do fluxo.
- Screenshots existentes não mostram o estado completo do dashboard/admin.
- Textos legais na interface são apresentados como preliminares na documentação do projeto; não afirmar revisão jurídica concluída.

## Sequência sugerida para futuras frentes

Esta é uma recomendação técnica, não um roadmap aprovado: primeiro integridade/autorização e operações destrutivas; depois divergências entre dados reais e simulados, notificações e atualização cruzada; em seguida consistência de escopo/recorrência/planos, paginação e relatórios; depois primitives compartilhadas e acessibilidade. Integrações e IA precisam de definição própria de produto e infraestrutura.

Ao resolver um item, remova a limitação ou descreva o novo comportamento, atualize os guias relacionados e registre a decisão em `docs/CONTENT_LOG.md`.
