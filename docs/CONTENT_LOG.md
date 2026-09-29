# Diário técnico do Escoply Web

Este arquivo serve como um diário técnico do desenvolvimento do Escoply Web. A ideia é registrar, de forma factual e organizada, decisões, correções, problemas encontrados e aprendizados técnicos ao longo do projeto.

O conteúdo poderá ser usado futuramente como fonte no NotebookLM para gerar documentação, organizar contexto do produto e levantar ideias de posts técnicos para o LinkedIn.

## 29/09/2026 — Espaçamento dos cards Google

Atualização Picker: removida seleção automática por login hint e habilitado `select_account`; card informa conta conectada. Erro observado `no registered origin` exige configurar a origem no cliente OAuth externo, não se resolve apenas trocando conta.

- Aplicada também margem superior e lateral de 1rem ao card Drive em Materiais, alinhando-o às abas e arquivos do projeto.

- Cards da Agenda e do Drive afastados das bordas do painel de configurações, com margem lateral de 1,55rem no desktop e 1rem no mobile.
- Ajuste restrito à apresentação dos cards na seção de configurações.

## 29/09/2026 — Troca local das abas de configurações

- Substituído `router.replace` pela History API nativa suportada pelo Next: evita repetir consultas de perfil, preferências e status Google a cada clique nas seções.
- Mantidos parâmetro de aba na URL, hash, demais parâmetros e revalidação após salvar. Aba ativa anunciada com `aria-current`.
- A alteração elimina a espera da navegação de servidor; não representa medição de latência em produção.

## 29/09/2026 — Ativação do banco para Google Drive

- Após usuário configurar o ambiente, verificada presença das variáveis Picker e formato numérico do projeto, sem exibir valores.
- Host Supabase do app e vínculo CLI coincidem em `vdtjfjkupgfepdcxyidh`. Dry-run indicou somente `202609290001_google_drive.sql`; aplicada com sucesso.
- Guia corrigido para incluir o referrer docs.google.com e restrições de ambas as APIs segundo documentação oficial do Picker. OAuth real e deploy permanecem pendentes.

## 29/09/2026 — Google Drive, primeira etapa local

- Conexão OAuth independente da Agenda, seleção de arquivo pelo Picker e vínculo de pasta por projeto; metadados conferidos no servidor e referências sem cópias no Storage.
- Desconexão por recurso passa a remover credencial local: revogação Google pode afetar todo o projeto Cloud. UI explica revogação completa na conta Google.
- Migration incremental preparada com isolamento, FK composta, unicidade de arquivos e teto diário por proprietário. Não aplicada remotamente nesta entrega.
- Picker usa token temporário próprio restrito a arquivos, sem refresh token ou segredo no navegador; COOP dos projetos ajustada para popups.
- Lint, tipos, build e 44 testes aprovados. Ativação externa, QA autenticado e deploy pendentes. Documentação em [GOOGLE_DRIVE](GOOGLE_DRIVE.md); nenhuma configuração secreta foi alterada.

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

## 2026-09-26 — Integração Google compacta nas configurações

Painel Google passou a abrir recolhido, com ícone compartilhado, conta, status conectado/desconectado e controle de expandir/recolher. Preservadas opções e processamento existentes. Ajustada margem direita das ações do header para 12px conforme solicitação anterior.

## 2026-09-26 — Remoção da busca do header

Removido o campo de busca global e a indicação de atalho do cabeçalho do workspace. Ações restantes alinhadas à direita; buscas dos módulos preservadas.

## 2026-09-26 — Animação do menu mobile

Centralizado o ícone X e adicionadas transições suaves de entrada/saída do drawer e backdrop. Fechamento por botão, Escape, toque fora ou navegação aguarda a animação; preferência por movimento reduzido é respeitada.

## 2026-09-26 — Navegação lateral disponível no mobile

O CSS ocultava a navegação abaixo de 820px sem oferecer substituto. Adicionado botão de menu no cabeçalho e drawer acessível com as mesmas rotas, estado ativo, fechamento ao navegar/Escape/backdrop, restauração de foco e scroll. Sidebar desktop preservada; animação respeita movimento reduzido.

## 2026-09-26 — Remoção do card de plano da sidebar

Removido o card demonstrativo Plano Profissional, seu progresso fixo e botão Ver plano da barra lateral, conforme solicitado.

## 2026-09-26 — Remoção do calendário da navbar

Removidos o botão de calendário da barra superior e seu popover de próximos prazos. Mantidos notificações e acesso à Agenda pela sidebar; removidos estado e formatador exclusivos do popover.

## 2026-09-26 — Remoção do texto de carregamento da agenda

Removida a frase de carregamento abaixo dos filtros e seu espaço reservado, conforme solicitado. Preservados animação, navegação otimista e estado `aria-busy` da grade.

## 2026-09-26 — README atualizado com agenda e Google

README passou a documentar modal da integração, envio automático local, histórico seletivo, projeções de prazos e navegação otimista da agenda. Inclui variáveis sem valores secretos, callback OAuth, migrations necessárias e comando de testes. Diferencia funcionalidades implementadas de importação automática/recorrência ainda pendentes, sem presumir deploy da versão atual. Alteração somente documental.

## 2026-09-26 — Resposta imediata ao navegar na agenda

Título e grade do período usam atualização otimista junto à navegação Next, com carregamento explícito das atividades e animação direcional de 180ms. Sem deslocamento de scroll, respeitando movimento reduzido. Consultas de Google e compromissos foram paralelizadas com as leituras existentes. Agrupamento converte a data de cada tarefa uma vez, em vez de repetir para todas as células do mês. Não houve alteração de dados nem medição de latência em navegador autenticado.

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
