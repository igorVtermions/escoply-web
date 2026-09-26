# Google Agenda e Tasks — implementação de testes

Revisão: 26/09/2026. Migrations Google `202609250001`, `202609250002` e `202609260001` aplicadas no projeto escoply. Código local com envio automático e modal; sem deploy nesta entrega. Validação visual e teste real da nova fila ainda pendentes.

## Envio automático e histórico

Na agenda, o botão Google Agenda abre um modal com status, conexão e personalização; a mesma configuração permanece disponível em Configurações → Integrações. Novo compromisso usa o estilo de Nova tarefa.

Novas tarefas/compromissos e alterações feitas após conectar entram em `google_outbox`. Triggers gravam uma versão por item; Server Actions tentam enviar após a resposta com `after`. Um worker no workspace visível retoma a fila a cada 30 segundos, com backoff e limite de oito tentativas. Sem cron: com o app fechado, tentativas pendentes aguardam reabertura. Desconectado não envia. Falha Google não desfaz o salvamento local. Alterações concorrentes não são removidas da fila por uma tentativa anterior. Falhas podem ser retomadas no modal; conflitos e exclusões continuam exigindo revisão.

O histórico usa prévia explícita com categorias, data inicial, concluídos e itens sem data. O filtro vale para novos vínculos; vínculos existentes continuam ativos nas categorias selecionadas. Dados já alterados no Google são importados por sincronização manual, sem promessa de atualização remota em tempo real.

Projetos, orçamentos, recebimentos e obrigações têm projeções opcionais em eventos de dia inteiro. Categorias e avisos automáticos são salvos na conexão. O histórico exige envio manual separado. Projeções são identificadas por vínculo e metadados privados, não são reimportadas como compromissos. Mudanças no Google geram revisão, nunca pagamento/aprovação ou alteração automática do projeto. Encerramento da origem remove o evento gerenciado se não houver conflito. Pausar mantém os dados. Somente ocorrências de obrigações já cadastradas são enviadas; não há geração de recorrência.

## Ativação

1. Confirme a rotação do segredo OAuth que foi compartilhado em uma imagem; atualizar local/Vercel e desativar o antigo no Google Cloud.
2. No servidor local e na Vercel Production, configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` e `GOOGLE_TOKEN_ENCRYPTION_KEY`. Nenhuma usa `NEXT_PUBLIC_`.
3. A chave de criptografia é uma sequência aleatória de 32 bytes em hexadecimal (64 caracteres). Foi criada no `.env.local`, ignorado pelo Git. Transfira-a para uma variável Secret da Vercel por um canal seguro. Não publique nem registre seu valor. Mantenha a mesma chave nos ambientes que compartilham o mesmo banco de conexões. A troca dessa chave sem recriptografar registros exige reconectar usuários.
4. Retornos OAuth: `http://localhost:3000/api/integrations/google/callback` e `https://escoply-web.vercel.app/api/integrations/google/callback`. Na Vercel use o segundo; no localhost use o primeiro. URLs de Preview não estão configuradas.
5. Mantenha Calendar API e Tasks API ativadas, público externo em teste, e os participantes em usuários de teste. Autorize os escopos descritos abaixo no consentimento. O código solicita todas as permissões necessárias e rejeita consentimento incompleto.
6. Migration `202609250001_google_calendar_tasks.sql` aplicada em 25/09/2026 no projeto escoply. Vínculo conferido com as URLs do app, dry-run mostrou somente essa migration pendente e histórico remoto confirmou a aplicação.
7. Publique o código e as variáveis; em Configurações → Integrações, conecte Google. O primeiro clique em Sincronizar cria/recupera os contêineres. Faça o piloto com registros descartáveis criados explicitamente para esse teste.

O cliente Supabase privilegiado é usado somente depois de validar usuário autenticado e perfil ativo. `SUPABASE_SECRET_KEY` e a configuração Supabase existente também são necessários no servidor.

## Experiência

- Uma conta Google por usuário Escoply. Reconexão exige a mesma identidade Google para preservar vínculos; troca de conta não entra nesta versão.
- Compromissos independentes em `calendar_events`, com CRUD na agenda, início/fim, dia inteiro e avisos. Não entram no Kanban.
- Tarefas selecionadas e novos registros de `reminders` após conectar entram na lista `Escoply · <identificador curto>`. Registros antigos de tipo `meeting` continuam tarefas; novos compromissos devem usar Novo compromisso.
- Somente a agenda secundária criada pelo aplicativo e a lista Escoply participam. Não importa calendários pessoais arbitrários.
- Edição de tarefa no painel de detalhe do Kanban: título, data, horário local e notas. Conclusão/reabertura sincroniza com Tasks; etapas intermediárias do Kanban permanecem locais.
- Google Tasks representa o dia programado na API, sem horário. Notas usam um marcador temporário para recuperar criação interrompida; após confirmar ID e baseline no banco, o sincronizador limpa esse marcador também no Google. Resposta incerta mantém a proteção contra duplicatas.
- Tarefa sem data usa `google_undated` e uma data sentinela distante no campo legado obrigatório, exibida como Sem data no Kanban. Não gera vencimento atual. Essa compatibilidade evita tornar `scheduled_at` anulável em todos os módulos nesta entrega. Datas/hora do projeto legado ainda requerem revisão se uma tarefa vinculada tiver a data removida.
- Mover coluna não muda mais o prazo. Atraso é derivado; soltar em Atrasadas orienta editar a data.
- Ao editar compromisso, é possível manter os lembretes vindos do Google, usar o padrão da agenda, remover ou substituir por um aviso popup. O Google entrega esses alertas conforme as preferências do usuário/dispositivo; não é um serviço de push próprio do Escoply.
- Desconectar revoga a autorização, remove o token criptografado e preserva registros/vínculos. Não apaga os eventos no Google.

## Sincronização e segurança

`lib/google/` concentra modelo, mapeamento da API, cliente, criptografia, leitura segura e motor. Actions ficam em `app/dashboard/configuracoes/google-actions.ts`; callback em `app/api/integrations/google/callback/route.ts`.

OAuth usa state aleatório com hash no banco, cookie HttpOnly SameSite=Lax, validade de dez minutos, consumo único vinculado à sessão e PKCE S256. O refresh token é criptografado por AES-256-GCM com proprietário como dado autenticado. Access tokens existem apenas durante a requisição. Nenhum token é retornado ao client ou impresso em logs.

Escopos: `openid`, `email`, `calendar.app.created`, `calendar.calendarlist.readonly`, `tasks`. A leitura de metadados das agendas permite recuperar a agenda própria após interrupção na criação. Tasks não oferece escopo limitado a uma lista; o código restringe as operações à lista gerenciada.

- `google_connections`, `google_oauth_states`, `google_sync_links`, `google_daily_usage`: RLS habilitado e acesso revogado para `anon`/`authenticated`; apenas servidor com service role.
- `calendar_events`: RLS por proprietário; tarefas continuam com o isolamento existente.
- Lease de três minutos por usuário e intervalo mínimo de dez segundos entre operações; callback de reconexão, resolução, desconexão e sincronização usam o mesmo bloqueio.
- Comparação tripla entre local, remoto e última versão sincronizada. Alterações em ambos os lados exigem escolha. A escolha é invalidada se qualquer versão mudar antes da execução.
- Escritas locais usam `updated_at` como controle otimista; mutações Google usam ETag quando disponível.
- Exclusões só são inferidas após leitura completa paginada. É preciso confirmar propagação ou escolher restaurar a cópia restante.
- IDs estáveis de eventos e marcador em notas do Tasks recuperam respostas perdidas. Criação de tarefa sem confirmação fica bloqueada para revisão antes de tentar novamente.
- Lotes: até 25 alterações, orçamento de 60 operações contadas e janela de aproximadamente 40 segundos. Cursores persistidos impedem que os primeiros itens monopolizem a retomada.
- Reserva conservadora de 65 operações por execução; teto global local de 10.000 por dia UTC. Esse controle é da aplicação, não uma garantia de faturamento de toda a conta Google. Nenhum serviço pago ou billing foi habilitado.
- Listas Google são paginadas até 2.000 registros por coleção nesta versão. Acima disso, a sincronização para explicitamente. Não interpreta truncamento como exclusão.

## Limites conhecidos

Sem importação automática do Google, webhook, cron, convites, Meet, anexos, subtarefas, edição de recorrência ou eventos especiais. O envio local é automático pela fila. Recorrências/eventos especiais detectáveis são sinalizados, preservando os originais. A Tasks API não expõe todos os recursos da interface Google; não há garantia de espelhamento de recorrência/alarme de tarefa.

Prazos de projetos, obrigações, orçamentos e recebimentos têm exportação opcional nesta versão. Acompanhamentos genéricos de escopo, aprovação, cliente e material ainda não estão implementados.

Se a agenda/lista inteira for apagada no Google, a integração para com erro; não recria automaticamente e não considera todos os itens locais excluídos. Recuperação administrativa desses contêineres fica para uma evolução.

Consulta visual de compromissos limitada a 1.000 por período; Kanban mantém o limite preexistente de 300. O motor de sincronização não depende dessas listas da interface. Exclusão de conta remove credenciais no banco por cascata, mas a Edge Function atual não revoga previamente a concessão Google; o usuário pode revogá-la no Google.

## Verificações

- `npm run test:google`: 35 testes, sem rede ou credenciais, usando módulos reais com serviços externos simulados. Cobre comparação tripla, datas distintas, seleção, projeções, fila, versões concorrentes, recuperação, conflitos, lease, limite diário, criptografia e autorização.
- `npm run lint`, `npx tsc --noEmit` e `npm run build` passaram durante a implementação.
- Smoke HTTP: agenda sem sessão deve redirecionar ao login; callback sem state válido deve recusar e redirecionar sem acessar Google.
- Migration executada no Supabase remoto e confirmada por `migration list`. Testes funcionais de isolamento com duas contas ainda estão pendentes.
- Pendentes após ativação: OAuth real, duas contas, consentimento parcial, token revogado, evento/tarefa em ambos os lados, conflitos e exclusões, mobile/desktop e teclado no navegador autenticado.

## Fontes

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/workspace/calendar/api/auth
- https://developers.google.com/workspace/calendar/api/guides/quota
- https://developers.google.com/workspace/tasks/reference/rest/v1/tasks
- https://developers.google.com/workspace/tasks/limits
