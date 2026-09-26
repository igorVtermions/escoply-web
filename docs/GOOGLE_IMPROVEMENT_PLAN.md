# Plano de melhoria da agenda e lembretes

Atualização de execução — 26/09/2026: implementados prévia/filtros, testes de datas, projeções de projeto/orçamento/recebimento/obrigação, limpeza segura de marcador Tasks, modal compacto e envio automático local por fila com preferências. Migrations aplicadas no escoply. Amostra identificável do print tinha data local igual ao snapshot Google. Ainda pendentes: piloto real da fila, QA visual com navegador conectado, recorrência de obrigações, vínculos específicos de cobrança e acompanhamentos de escopo/aprovação/material. Nenhum deploy nesta entrega.

Análise de 25/09/2026. Proposta, não implementação. Base: prints do usuário, código atual e documentação oficial Google. Nenhum registro foi alterado nesta análise.

## Diagnóstico e limites da evidência

- O print mostra “Tarefas pendentes — Nos últimos 365 dias”, com itens de oito, nove e dez semanas atrás. Esse painel agrega tarefas antigas. Não prova que todas foram gravadas com a mesma data.
- `lib/google/model.ts:taskValue` converte cada `scheduled_at` para a data em America/Sao_Paulo; `lib/google/provider.ts:payload` envia essa data em `due`. Não foi encontrada atribuição generalizada da data de hoje nesse caminho.
- A API Tasks define `due` como dia programado/visível no calendário, não prazo final, e descarta horário. O campo atual do Escoply mistura essas intenções. Não é possível prometer alarmes com horário via Tasks API.
- `lib/agenda/data.ts` agrega seis categorias; `lib/google/sync.ts` sincroniza apenas `calendar_events` e `reminders`. Prazos dos projetos, validade dos orçamentos, obrigações e recebimentos ficam fora. Os “Prazo final” do segundo print pertencem a esse grupo.
- Todos os registros de `reminders`, inclusive reuniões e cobranças legadas, viram Tasks. Isso perde a intenção de compromisso/alerta com horário.
- A primeira sincronização inclui históricos sem seleção. Limites de 25 alterações, tempo e operações podem exigir continuação. A interface precisa distinguir parcial, falha, conflito e conclusão.
- O marcador técnico nas notas é usado para recuperar inserções sem resposta. Ele aparece no Google e precisa de tratamento de UX sem sacrificar a prevenção de duplicatas.
- Cobrança valida `paymentId`, mas salva somente `project_id` no lembrete (`app/dashboard/financeiro/actions.ts`). Não há vínculo suficiente para encerrar automaticamente o alerta do recebimento correto.
- Notificações internas são agregadas dos domínios; ler/dispensar uma notificação não significa concluir uma tarefa ou pagar uma conta. Recorrência de obrigação ainda não gera próximas ocorrências.
- A leitura diagnóstica remota dos três vínculos dos prints não retornou dados por erro de acesso/rede. Não houve comparação ao vivo com as datas Google; causa específica de eventual data incorreta permanece pendente.

## Comportamento proposto por domínio

| Origem | Representação recomendada | Alterações vindas do Google |
| --- | --- | --- |
| Tarefa de execução | Google Tasks, com dia programado opcional | Título, notas, dia e conclusão nos dois sentidos |
| Compromisso/reunião | Evento com início, fim e avisos | Edição nos dois sentidos, conflito explícito |
| Prazo de projeto | Evento de dia inteiro, fim exclusivo no dia seguinte | Mudança de prazo exige revisão no Escoply |
| Validade de orçamento | Evento de dia inteiro opcional e aviso antecipado | Não alterar valor/status/aprovação por edição do evento |
| Recebimento/cobrança | Vencimento opcional e lembrete vinculado ao recebimento | Nunca marcar como pago ao concluir/excluir algo no Google |
| Obrigação/DAS/assinatura | Ocorrência com data e avisos | Pagamento e recorrência são controlados no Escoply |
| Etapa de escopo/aprovação | Lembrete de acompanhamento escolhido pelo usuário | Não concluir etapa nem aprovar proposta automaticamente |
| Cliente, material ou anotação | “Lembrar de acompanhar”, vinculado à origem | Alterar o lembrete, sem modificar o conteúdo de origem |

Tarefa com necessidade de alarme em horário específico: oferecer um evento de lembrete vinculado e opcional. Explicar quando haverá tarefa mais evento; não duplicar automaticamente tudo. Eventos derivados de domínios são projeções: remover a projeção nunca apaga projeto, orçamento ou recebimento.

## Etapas de execução

### 1. Diagnosticar e corrigir datas antes de ampliar

1. Comparar amostras autorizadas: data/hora no registro de origem, valor normalizado, payload, resposta Google e snapshot. Incluir os três itens dos prints, um compromisso futuro e um prazo ausente. Nunca registrar tokens nem conteúdo privado em logs.
2. Classificar ausências: categoria não suportada, item sem data, calendário oculto, filtro local, pendência antiga, conflito, falha ou lote incompleto.
3. Testar dias separados, virada de mês/ano, 00:00/23:59 em São Paulo, dia inteiro com fim exclusivo, tarefas sem data e edição nos dois sentidos.
4. Corrigir somente divergências comprovadas. Reparar por vínculo existente; prévia antes de reparações em lote, sem recriar tudo nem apagar dados históricos.

Aceite: amostras locais e remotas têm o mesmo dia de negócio; três tarefas em dias diferentes mantêm três datas; nenhuma duplicata após repetir sincronização. Evidência da exibição Google fica separada da validação dos campos da API.

### 2. Dar controle e visibilidade ao usuário

1. Assistente de configuração por categoria, período e inclusão de histórico/concluídos. Sugerir futuros e pendentes recentes; atrasados antigos por escolha explícita.
2. Prévia com origem, data, destino e motivo de exclusão do envio. Mostrar que a seleção de um mês na agenda não filtra automaticamente a sincronização.
3. Resultado por categoria: enviados, recebidos, atualizados, ignorados, pendentes e conflitos. Estado “parcial” até terminar todos os lotes.
4. Botão continuar e retomada automática limitada enquanto a tela estiver aberta, com backoff, cursor persistente e respeito às cotas; sem execução permanente em background.
5. Mostrar no detalhe “Sincronizado”, “Aguardando”, “Revisão necessária” e link para abrir no Google.
6. Revisar marcador Tasks: removê-lo somente após confirmação durável do ID e com estado de limpeza recuperável; manter reconhecimento de marcadores antigos e bloqueio de repetição em caso de resposta incerta. A API Tasks não oferece metadados privados equivalentes aos de eventos.

Aceite: usuário sabe exatamente o que foi enviado e o que ainda falta; histórico não é enviado sem escolha; falha parcial não aparece como sucesso completo.

### 3. Criar uma base comum de lembretes vinculados

1. Separar semanticamente data programada, prazo final e instante do aviso. Data sem hora não recebe horário fictício na interface.
2. Criar preferências por categoria e exceções por item: destino, antecedência, horário e ativação.
3. Acrescentar vínculo explícito `source_type/source_id` validado por proprietário. Para cobranças, persistir referência ao recebimento. Considerar chaves estrangeiras tipadas para garantir integridade das entidades existentes.
4. Adaptadores por domínio produzem itens normalizados sem usar listas limitadas do dashboard ou da agenda. Paginação completa para sincronizar.
5. Expandir vínculos Google para origem, destino e ocorrência, com unicidade por proprietário, idempotência e tombstones para exclusões.
6. Manter RLS e autorização em todas as actions; datas, status e valores financeiros continuam nos domínios de origem. Conclusão, leitura da notificação e pagamento permanecem distintos.

Aceite: um mesmo item de negócio não gera duplicatas ao mudar de tela; status de pagamento não pode mudar por evento externo.

### 4. Expandir a cobertura gradualmente

Ordem: prazos de projetos → validade de orçamentos → recebimentos e cobranças → obrigações → acompanhamentos de escopo/aprovação/cliente/material.

- Começar com projeção Escoply → Google para datas de negócio, preservando sincronização bidirecional das tarefas e compromissos pessoais.
- Ao editar prazo projetado no Google, apresentar proposta de alteração e conflito para revisão; não sobrescrever o projeto silenciosamente.
- Ao pagar/concluir/cancelar na origem, encerrar avisos futuros conforme regra da categoria. Registro financeiro permanece intacto.
- Preferir título discreto e link para origem; valores, notas e dados do cliente só entram por opção do usuário.
- Eventos com mesma origem precisam de chave estável. Cobrança adicional deve ser um alerta deliberado, não duplicação acidental do vencimento.

Aceite: prazo de projeto em cada dia esperado aparece no Google quando habilitado; mudança na origem atualiza o evento existente.

### 5. Recorrência e entrega de avisos

1. Gerar ocorrências reais e idempotentes para obrigações recorrentes, com política de fim do mês, pausa, término e pagamento por ocorrência.
2. Definir presets editáveis (ex.: um dia antes e no dia) e evitar múltiplos avisos equivalentes para a mesma origem.
3. Usar lembretes de eventos Google para avisos fora do Escoply, sujeitos às permissões/configuração do dispositivo. Não prometer entrega garantida.
4. Novos eventos só chegam ao Google após sincronização. Sem job em background, alterações feitas com a aplicação fechada não são enviadas imediatamente.

Aceite: nenhuma ocorrência repetida ao executar novamente; evento já sincronizado mantém aviso Google com o Escoply fechado; atraso da sincronização fica explícito.

### 6. Piloto e rollout

- Migrations novas, compatíveis com vínculos existentes; nada de reset das tabelas de integração.
- Dois usuários de teste para isolamento e consentimento; recuperação de token revogado, desconexão e reconexão.
- Testar lote com mais de 25 itens, interrupção, resposta perdida, alteração simultânea, exclusão e retomada sem duplicatas.
- Piloto por categoria antes de habilitar as demais. Não enviar mensagens a clientes como efeito da integração.
- Exibir resumo final e pendências; validar desktop, celular e navegação por teclado.

## Custos e infraestrutura

Proposta sem novas assinaturas, sem habilitar billing ou serviços de e-mail/SMS/WhatsApp. Manter sincronização manual e retomada limitada no app aberto, cache/incremental quando suportado, backoff e limites diários. Uso precisa caber nas cotas gratuitas da infraestrutura existente; não há promessa de gratuidade ilimitada. Alertas Google já sincronizados dispensam um servidor Escoply executando continuamente.

## Referências

- https://developers.google.com/workspace/tasks/reference/rest/v1/tasks — sem hora programada pela API; `due` é dia programado, não deadline.
- https://support.google.com/calendar/answer/9901136?hl=pt-BR — painel de tarefas pendentes dos últimos 365 dias.
- https://developers.google.com/workspace/calendar/api/guides/quota — limites de uso Calendar.
- https://developers.google.com/workspace/tasks/limits — cotas Tasks.

Prioridade recomendada: concluir etapas 1 e 2 antes de ampliar o sincronizador; em seguida prazos de projetos sobre a base vinculada da etapa 3.
