# Diário técnico do Escoply Web

Este arquivo serve como um diário técnico do desenvolvimento do Escoply Web. A ideia é registrar, de forma factual e organizada, decisões, correções, problemas encontrados e aprendizados técnicos ao longo do projeto.

O conteúdo poderá ser usado futuramente como fonte no NotebookLM para gerar documentação, organizar contexto do produto e levantar ideias de posts técnicos para o LinkedIn.

## Como usar este arquivo

1. Adicione um novo registro depois de uma alteração relevante no projeto.
2. Mantenha as entradas mais recentes no topo do arquivo.
3. Registre fatos reais do desenvolvimento, sem transformar automaticamente o conteúdo em propaganda.
4. Nunca adicione credenciais, tokens, senhas, variáveis de ambiente ou dados privados.
5. Use este arquivo como fonte de contexto para documentação, revisão técnica e NotebookLM.

## Modelo de registro

Copie o bloco abaixo para criar uma nova entrada. Substitua os campos entre colchetes pelas informações reais da sessão.

```markdown
## [DATA] — [TÍTULO DA ALTERAÇÃO]

### O que foi desenvolvido

Descreva a funcionalidade, correção ou melhoria implementada.

### Problema ou necessidade

Explique qual problema motivou essa alteração.

### Alternativas consideradas

Registre outras soluções que foram avaliadas, quando existirem.

### Decisão técnica

Explique qual solução foi escolhida.

### Motivo da decisão

Explique por que essa alternativa foi escolhida.

### Arquivos ou módulos envolvidos

Liste os principais arquivos, serviços, componentes ou módulos alterados.

### Resultado atual

Descreva o que está funcionando e o que ainda precisa ser validado.

### Dificuldades encontradas

Registre erros, limitações, dúvidas ou comportamentos inesperados.

### Aprendizado

Explique o principal aprendizado técnico obtido.

### Possível conteúdo para o LinkedIn

Sugira de uma a três abordagens de conteúdo baseadas exclusivamente nesse registro, como:

- Um problema técnico e sua solução.
- Uma decisão de arquitetura.
- Um erro e o aprendizado obtido.
- Uma demonstração da funcionalidade.
- Uma comparação entre alternativas.

### Evidência visual

Sugira o que poderia ser mostrado no post, como captura de tela, trecho de código, diagrama, terminal ou vídeo curto.

### Próximo passo

Informe a próxima atividade relacionada.
```

## Registros

## 2026-09-26 — Ações do Kanban alinhadas

Novo compromisso e Nova tarefa compartilham o grupo de ações do cabeçalho do Kanban, lado a lado com quebra responsiva quando faltar espaço. A visualização Calendário mantém sua ação própria. TasksSection aceita ações adicionais sem duplicar a lógica de criação de tarefas.

> Adicione novos registros abaixo desta linha, mantendo o mais recente primeiro.

## 2026-09-26 — Modal Google, histórico seletivo e envio automático

- Agenda usa botão Google Agenda com ícone e status verde/vermelho; configuração em modal nativo com portal, foco, Escape e scroll. Novo compromisso reutiliza a classe e ícone de Nova tarefa.
- Prévia local por data/categoria distingue novos envios, vínculos existentes e itens ignorados. Histórico não entra no envio automático. Marcador Tasks é limpo somente após persistência do ID remoto e baseline.
- Prazos de projetos, validade de orçamentos, recebimentos e obrigações são eventos de dia inteiro, sem alterar registros de negócio a partir do Google. Conflitos externos exigem revisão; categorias do envio automático e antecedência são persistidas.
- Fila por proprietário e versão recebe alterações após a conexão, com triggers, tentativa após Server Actions via `after`, retomada no workspace visível a cada 30 segundos e backoff. Não há cron nem servidor permanente. Importação de mudanças feitas diretamente no Google continua manual.
- Migrations `202609250002` e `202609260001` aplicadas no projeto escoply, após confirmação do projeto e dry-run; nova checagem confirmou banco atualizado. Nenhum deploy ou billing foi ativado.
- 35 testes passaram, incluindo datas separadas, filtros, conflitos de prazos, recuperação, fila e proteção de alterações concorrentes. Lint, TypeScript e build passaram. Uma amostra dos prints tinha data local igual ao snapshot Google, sem evidência de agrupamento incorreto no payload. Sem navegador conectado, validação visual e envio real pela nova fila ainda pendentes.
- Recorrência de obrigações e lembretes genéricos vinculados a escopo/aprovação/material permanecem etapas futuras do plano; não foram apresentados como disponíveis.

## 2026-09-25 — Aplicação da migration Google no Supabase

Após autorização do usuário e correção do login da CLI, confirmado o projeto escoply vinculado às URLs do aplicativo. O dry-run mostrou somente `202609250001_google_calendar_tasks.sql` pendente. Aplicação concluída e versão confirmada no histórico remoto por `migration list`. Não houve deploy, alteração de billing ou aplicação de outras migrations nesta operação. OAuth real e isolamento entre contas continuam pendentes de validação.

## 2026-09-25 — Integração manual Google Agenda e Tasks

### Implementação e decisões

- OAuth de usuário separado do login Supabase, state de uso único, PKCE, refresh tokens criptografados por proprietário e acesso somente no servidor.
- Compromissos próprios com início/fim, dia inteiro e avisos; tarefas mantidas em reminders com edição de notas/data. Kanban não altera mais o prazo ao mover coluna.
- Sincronização bidirecional manual, comparação tripla, revisão de conflitos/exclusões, retomada por lotes e recuperação de respostas perdidas. Sem webhook/cron ou novos serviços pagos.
- Novas tabelas e funções em migration incremental; lease por usuário e teto conservador diário para testes gratuitos. Infraestrutura anterior e alterações locais de admin preservadas.

### Validação e próximos passos

Lint, tipos e build passaram; 18 testes cobrem regras e serviços simulados. Smoke HTTP confirmou recusa de acesso sem sessão e callback com state inválido. Sem Postgres local, SQL/RLS não foram executados. Nenhum deploy ou migration remota foi feito. Falta cadastrar chave de criptografia na Vercel, confirmar rotação do segredo OAuth, aplicar a migration revisada e testar OAuth/fluxos autenticados com duas contas. Procedimento e limites em `docs/GOOGLE_INTEGRATION.md`.

## 2026-09-25 — Preparação local de credenciais Google

- Credencial OAuth Web importada de arquivo externo para `.env.local`, ignorado e não rastreado pelo Git; variáveis exclusivamente de servidor.
- Carregamento validado com `@next/env`, sem exposição dos valores. Ambiente Supabase preexistente preservado.
- Decisão de escopo: integração Calendar/Tasks bidirecional, inicialmente manual, dentro das cotas gratuitas; limitações de horário do Tasks devem permanecer explícitas.
- Integração ainda não implementada. Nenhum token de usuário foi obtido, nenhuma migration aplicada e nenhuma configuração remota ou deploy foi alterado nesta etapa.

## 2026-09-25 — Base de contexto do projeto para agentes

### O que foi desenvolvido

Documentação em `docs/agent-context/` sobre produto, rotas, funcionalidades, arquitetura, stack, dados, segurança, UI/UX, componentização, desenvolvimento e lacunas. `AGENTS.md` passou a centralizar regras e leitura orientada por tarefa; README e guia do Supabase apontam para a base detalhada.

### Problema ou necessidade

Agentes precisavam reconstruir o contexto a cada tarefa. O README também não refletia integralmente o admin e misturava funcionalidades já persistidas com roadmap antigo.

### Decisão técnica e motivo

Manter uma entrada curta de instruções e guias temáticos, com evidência por arquivo e distinção entre implementação, simulação, futuro e diretriz. Isso permite consulta progressiva sem carregar toda a documentação em cada alteração.

### Resultado e validação

Inspeção estática dos módulos e infraestrutura local; lint e TypeScript passaram. Não houve alteração de código de produto, aplicação de migrations, deploy ou operação em dados reais. Fluxos autenticados e configuração remota não foram validados. Alterações locais preexistentes de admin/suporte/logs foram preservadas.

### Aprendizados e próximo passo

Tarefas usam `reminders`, notificações têm estados separados, PDFs usam impressão do navegador e planos/suporte/admin possuem maturidades diferentes. A base deve ser atualizada junto de mudanças relevantes; limitações específicas estão em `docs/agent-context/KNOWN_GAPS.md`.
