# Produto, funcionalidades e rotas

## Ideia e público

Escoply é uma plataforma SaaS para freelancers que precisam organizar contatos, escopos, prazos, decisões, arquivos e recebimentos dispersos em conversas, e-mails e planilhas. A proposta está em `constants/brand.ts`, `constants/landing.ts` e na landing.

**Marca:** Escoply. **Slogan:** “Do briefing à entrega, tudo no controle.” **Idioma:** português brasileiro. **Contexto:** trabalho autônomo, inclusive obrigações como DAS MEI. O registro dessas obrigações não constitui um motor de cálculo tributário.

Os tipos de trabalho modelados incluem design, tecnologia, marketing, conteúdo, consultoria, branding, automação e outros. Alguns textos e sugestões ainda são específicos de design, embora o público seja mais amplo.

O fluxo conceitual é:

```text
Cliente → Projeto → Escopo → Orçamento → Aprovação → Entrega → Pagamento
                    └ materiais, tarefas, lembretes e prazos ┘
```

Esse fluxo organiza o produto; não é uma máquina de estados que bloqueia obrigatoriamente uma etapa até a anterior terminar. O sistema permite registros e mudanças manuais. “Entrega” aparece em status, escopo e tarefas; não há entidade independente de entrega ou portal público de clientes identificado.

## Superfícies

1. **Landing:** explica problema, solução, funcionalidades, fluxo, planos e IA futura; abre cadastro/login.
2. **Workspace do freelancer:** operação da conta autenticada, isolada por usuário.
3. **Admin:** gestão interna da plataforma por perfis `admin` com status `active`.

Não há estrutura implementada de equipe, organização, convites ou colaboração multiusuário dentro do workspace. Um cliente cadastrado é um contato comercial, não uma conta autenticada de cliente.

## Matriz de funcionalidades

Atualização Google — 26/09/2026: código local agora inclui modal na agenda, prévia seletiva de histórico, envio automático de novas tarefas/compromissos e categorias opcionais de prazos de projeto, orçamento, recebimento e obrigação. Migrations aplicadas no escoply. Importação de mudanças externas continua manual; não há geração de recorrência. Piloto da fila e UI autenticada pendentes; sem deploy nesta entrega.

| Área | O que existe no código | Limite relevante |
| --- | --- | --- |
| Landing | Hero, problema, solução, funcionalidades, fluxo, preços de apresentação, FAQ, roadmap, CTA e rodapé | Copy comercial não comprova feature operacional |
| Autenticação | E-mail/senha, cadastro, avatar opcional, lembrar sessão, recuperação, callback e reset | Configuração de confirmação de e-mail depende do Supabase remoto |
| Dashboard | Clientes ativos, projetos em andamento, próximos prazos, valores a receber, lembretes do dia, orçamentos e obrigações | Painéis têm limites de consulta; não representam listas completas |
| Clientes | Criar, editar, excluir, buscar, filtrar, paginar, logo, contatos e detalhe com projetos/lembretes | Exclusão pode propagar para projetos e dependências via SQL |
| Projetos | Criar, editar, excluir, arquivar, filtros, ordenação, tipos de trabalho, tags, prazo, valor e progresso | Resumo de escopo da listagem é estimado a partir do progresso |
| Detalhe de projeto | Resumo, cliente, etapas de escopo, orçamento, aprovações, materiais, lembretes e recebimentos | Escopo sugerido pode ser fallback ainda não persistido |
| Escopo | Criar, editar, excluir, concluir/reabrir e salvar etapas sugeridas | Marcar uma etapa não sincroniza automaticamente `projects.progress` |
| Orçamento | Valor, status, validade, condição de pagamento e exportação | Detalhe seleciona o orçamento mais recente; PDF é impressão no navegador |
| Aprovações | Registro de título/nota e mudança manual de status | Sem envio automatizado, assinatura ou aprovação externa do cliente |
| Materiais | Arquivos, links e anotações por projeto, visualização e exclusão | Storage privado; não há biblioteca global de materiais |
| Agenda | Calendário dia/semana/mês e Kanban, com tarefas e eventos de outros módulos | Calendário agregado; nem todo evento é uma tarefa editável |
| Tarefas | Criar, excluir, concluir/reabrir e mover entre colunas | Persistem em `reminders`; atraso pode ser derivado da data |
| Google Agenda/Tasks | OAuth, compromissos com CRUD, edição de tarefas e sincronização manual bidirecional implementados localmente | Depende da migration e variáveis; sem validação real ou deploy. Ver [guia Google](../GOOGLE_INTEGRATION.md) |
| Notificações | Central no shell, marcar como lida, limpar e preferências persistidas | São agregadas a partir dos domínios; não há serviço de push/e-mail identificado |
| Obrigações | Cadastro, edição, exclusão, pagamento, desativação, recorrência, vínculos opcionais, filtros e resumo | Recorrência é metadado; não foi encontrado gerador automático de próximas ocorrências |
| Financeiro | Recebimentos, filtros, resumos, marcar pago, excluir, lembrete de cobrança, CSV e impressão de relatório | Sem integração bancária/gateway; consulta atual limita recebimentos a 300 |
| Comprovantes | Upload e URL assinada no detalhe do projeto | O tipo usado pela listagem financeira não inclui os campos do comprovante |
| Configurações | Perfil, avatar, dados profissionais, preferências de notificações, senha, exportação JSON e limpeza por termos | Plano é simulado, integrações são futuras; limpeza por texto tem risco de falso positivo |
| Exclusão de conta | Interface em segurança e Edge Function `delete-account` | Função remove explicitamente o avatar; outros buckets precisam de revisão |
| Admin: usuários | Auth + profiles + métricas de uso; alteração de plano e status/bloqueio | Requer chave privada; não é fluxo de compra de assinatura |
| Admin: planos | Preços e promoções persistidos em `plans`, distribuição e receita estimada | Receita é projeção, não faturamento recebido; fallback estático quando leitura falha |
| Admin: suporte | Tickets, respostas e alteração de status com persistência no snapshot local | Trabalho local em andamento; sem fluxo integrado de abertura pelo usuário final |
| Admin: logs | Página ligada a `data/admin-mock.ts` | Não é auditoria real; novos arquivos locais de logs ainda não estão ligados à rota |
| Admin: configurações | Tela descritiva de configurações e manutenção | Simulada, não altera infraestrutura |

## Jornadas principais

### Entrar e começar

A landing abre `AuthModal`; parâmetros como `?auth=login` permitem abrir o login após um redirecionamento. Cadastro envia metadados de nome/empresa ao Supabase Auth; o trigger cria o perfil. O workspace apresenta nome/avatar e navegação compartilhada. A confirmação de e-mail e os destinos permitidos precisam estar configurados no ambiente.

### Trabalhar com um cliente

Cadastre o cliente → crie o projeto vinculado → preencha descrição, prazo, tags e valor → organize escopo e materiais → registre orçamento/aprovações → acompanhe tarefas e recebimentos. WhatsApp e e-mail abrem links externos; não há sincronização de conversas.

### Acompanhar o dia

Dashboard resume o trabalho; agenda reúne `reminders`, obrigações, prazos de projetos, validade de orçamentos e pagamentos. Kanban organiza apenas tarefas. Marcar uma notificação como lida não conclui a tarefa. Limpar notificações não deve apagar os registros de negócio.

### Receber e reportar

Recebimentos pertencem a um projeto, com tipo (sinal, parcela, saldo final, extra), vencimento, valor e status. Marcar pago grava `paid_at`. Relatórios financeiros usam os dados carregados e permitem CSV ou diálogo de impressão. O orçamento também pode compor o valor a receber do dashboard quando ainda não há plano de pagamentos para ele/projeto, evitando dupla contagem naquele cálculo.

## Mapa de rotas

| Rota | Entrada / observação |
| --- | --- |
| `/` | `app/page.tsx`, seções da landing |
| `/auth/callback` | Troca código por sessão; destinos permitidos: dashboard e reset |
| `/auth/reset-password` | Formulário de nova senha com sessão |
| `/auth/blocked` | Encerra sessão e redireciona ao login com motivo de bloqueio |
| `/dashboard` | Resumo, parâmetro `date` |
| `/dashboard/clientes` | `busca`, `status`, `pagina`, `cliente`; 8 clientes por página |
| `/dashboard/projetos` | `busca`, `status`, `cliente`, `ordem`, `pagina`; 6 projetos por página |
| `/dashboard/projetos/[projectId]` | UUID validado; `notFound()` se inválido/indisponível |
| `/dashboard/agenda` | `busca`, `tipo`, `status`, `periodo`, `visualizacao`, `modo`, `data` |
| `/dashboard/obrigacoes` | Filtros e estado de interface no componente do módulo |
| `/dashboard/financeiro` | Filtros e estado de interface no componente do módulo |
| `/dashboard/configuracoes` | `tab`: profile, professional, notifications, plan, security, data, integrations, about |
| `/admin` | Visão geral administrativa; ainda mistura alguns dados estáticos |
| `/admin/users` | Usuários e ações administrativas |
| `/admin/plans` | Planos e preços |
| `/admin/support` | Central de suporte |
| `/admin/logs` | Logs de demonstração |
| `/admin/settings` | Configurações administrativas de demonstração |
| `/dashboard/tarefas` | Redireciona para `/dashboard/agenda` |
| `/finance`, `/obligations`, `/settings` | Redirecionam às respectivas rotas em português no dashboard |

## Roadmap e linguagem do produto

IA/RAG, demais integrações externas, checkout/assinatura recorrente, colaboração em equipe e aplicativo mobile não devem ser descritos como prontos. Google Agenda/Tasks tem implementação local manual, ainda pendente de ativação e teste real. A landing de IA explicita essa condição. “Lembretes inteligentes” é copy de produto, não evidência de uso de modelo de IA.

Preserve a centralidade do projeto: não crie páginas principais separadas de materiais, escopos ou aprovações sem uma decisão explícita de produto. Para novas funcionalidades, descreva o valor para o freelancer e o vínculo com essa jornada antes de definir componentes.
