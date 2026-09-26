# Contexto do Escoply para agentes

Revisão: **25/09/2026**. Base: código, configurações, SQL e arquivos presentes no workspace, incluindo trabalho local ainda não commitado. Esta documentação não comprova deploy, aplicação de migrations ou funcionamento de um ambiente remoto.

## Leitura rápida

O Escoply centraliza a operação do freelancer, do cadastro do cliente ao recebimento. É uma aplicação Next.js com frontend e Server Actions no mesmo repositório, usando Supabase como backend. Há uma landing, uma área autenticada operacional e um painel administrativo. O sistema já possui persistência em vários módulos, mas ainda combina funcionalidades reais, projeções e demonstrações.

Leia sempre o [AGENTS.md](../../AGENTS.md). Depois escolha os guias pela tarefa:

| Guia | Conteúdo |
| --- | --- |
| [Produto](PRODUCT.md) | Proposta, público, jornadas, rotas e maturidade por funcionalidade |
| [Arquitetura](ARCHITECTURE.md) | Stack, árvore, fluxo servidor/navegador, componentização e mapa de arquivos |
| [Dados e segurança](DATA_SECURITY.md) | Entidades, contratos, autenticação, admin, Storage e infraestrutura |
| [UI/UX](UI_UX.md) | Identidade visual, tokens existentes, composição de páginas e regras de interação |
| [Desenvolvimento](DEVELOPMENT.md) | Ambiente, roteiro para alterações, validação e manutenção do contexto |
| [Lacunas](KNOWN_GAPS.md) | Limitações observadas, divergências de documentação e prioridades sugeridas |

## Trilhas por tarefa

- **Nova tela ou mudança visual:** Produto → UI/UX → Arquitetura → tela semelhante no código.
- **CRUD ou regra de negócio:** Produto → Dados e segurança → Arquitetura → actions, consultas e migrations do domínio.
- **Login, sessão, admin ou uploads:** Dados e segurança → Lacunas → arquivos do fluxo completo.
- **Planos, suporte, notificações ou integrações:** Produto → Lacunas primeiro; esses módulos têm diferenças importantes de maturidade.
- **Refatoração:** Arquitetura → UI/UX se afetar componentes → Desenvolvimento. Preserve comportamento e trabalho local existente.
- **Visão integral para onboarding:** leia os seis guias na ordem da tabela.

## Como interpretar

- **Implementado no código:** há um fluxo identificado na implementação. Não significa validado em produção.
- **Parcial:** uma parte funciona, mas o ciclo completo ainda não está conectado.
- **Simulado:** dados estáticos ou interação de demonstração.
- **Futuro:** intenção expressa no produto, sem implementação operacional identificada.
- **Diretriz:** orientação para mudanças futuras; não é uma afirmação de que todas as telas já a cumprem.

Regras explícitas do usuário prevalecem. Para comportamento existente, o código e as migrations são a evidência primária. Se divergirem deste material, investigue, faça a alteração solicitada e atualize o contexto. Não propague um defeito apenas porque aparece num componente antigo.

## Fontes e limites da análise

Foram examinados os manifests e configurações, rotas, layouts, componentes de cada domínio, consultas, Server Actions, migrations, Edge Function, estilos, constantes e documentação existente. A navegação visual autenticada e as políticas efetivamente instaladas no Supabase não foram verificadas nesta análise. Os screenshots em `public/screenshots/` documentam apenas a landing e autenticação de um momento anterior.

Validação local e pendências da análise estão em [Desenvolvimento](DEVELOPMENT.md). Histórico de decisões deve ir para [CONTENT_LOG](../CONTENT_LOG.md), sem credenciais nem dados reais de usuários.
