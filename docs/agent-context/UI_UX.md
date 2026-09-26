# UI/UX, design system e composição

## Estado real do sistema visual

Configurações → Integrações: Google aparece em card recolhido por padrão com ícone, conta e status verde/vermelho. Disclosure nativo permite expandir/recolher as opções com teclado. Header mantém ações à direita com margem de 12px.

Header do workspace sem busca global: notificações, perfil e saída permanecem alinhados à direita. Buscas específicas dos módulos permanecem nas respectivas páginas.

Drawer mobile: X centralizado com grid; abertura e fechamento de 320ms com fade do backdrop. O diálogo mantém foco e bloqueio de scroll até terminar a saída. Movimento reduzido fecha imediatamente.

Navegação até 820px: botão de menu no cabeçalho azul abre drawer modal com todas as rotas da sidebar. Usa portal e diálogo nativo para foco, Escape, backdrop e bloqueio de scroll; fecha ao navegar ou retornar ao desktop. Labels permanecem visíveis mesmo se a sidebar desktop estava recolhida.

Sidebar: o card demonstrativo Plano Profissional, incluindo progresso e botão Ver plano, foi removido do shell.

Barra superior: removido o atalho de calendário/Próximos prazos. Notificações permanecem na topbar e Agenda continua disponível na navegação lateral.

A troca de período não exibe a frase “Carregando atividades deste período” nem reserva espaço para ela. A grade mantém animação, opacidade de carregamento e `aria-busy`.

Navegação da agenda: data exibida usa `useOptimistic` durante a troca de período, sem aguardar o servidor para mover a grade. Atividades do período anterior são ocultadas durante carregamento, com status acessível. Animação direcional de 180ms respeita movimento reduzido e não muda o scroll.

Kanban: `tasks-heading-actions` agrupa Novo compromisso e Nova tarefa horizontalmente, com gap e quebra em telas estreitas. O botão de compromisso não é duplicado na barra Google nessa visualização.

Atualização Google (26/09/2026): a agenda mostra somente botão Google Agenda com ícone/status verde ou vermelho e Novo compromisso no padrão de Nova tarefa. Configuração detalhada fica em modal nativo com portal, título acessível, foco restaurado e Escape bloqueado durante processamento. Prévia de histórico e preferências de envio automático ficam dentro desse modal e em Configurações → Integrações. CSS em `google.css`; validação visual autenticada pendente.

O Escoply tem identidade visual reconhecível e padrões repetidos, mas ainda não possui um design system completo de primitivas, tokens semânticos e documentação independente do código. A fonte de verdade visual é a combinação de CSS, componentes e assets. As diretrizes abaixo formalizam essa base para novas mudanças; não significam que todas as telas antigas já atendem a todos os requisitos.

Não foi identificado no repositório um arquivo Figma vinculado, Storybook, catálogo de componentes ou tema escuro operacional. Não inventar uma referência externa de design.

## Identidade e tokens existentes

Fonte dos tokens: `app/globals.css`, em `:root` e `@theme inline`.

| Token CSS | Valor | Intenção |
| --- | --- | --- |
| `--primary` | `#071e63` | Azul-marinho da marca, ações e estrutura |
| `--primary-dark` | `#041342` | Variação escura |
| `--primary-light` | `#123a9c` | Variação mais clara/hover |
| `--secondary` | `#8b5cf6` | Roxo de destaque |
| `--secondary-dark` | `#6d28d9` | Roxo forte |
| `--secondary-light` | `#a78bfa` | Roxo suave |
| `--background` | `#f8fafc` | Fundo principal |
| `--surface` | `#ffffff` | Cards e superfícies |
| `--surface-muted` | `#f1f5f9` | Superfície secundária |
| `--text` | `#0f172a` | Texto principal |
| `--text-muted` | `#64748b` | Texto secundário |
| `--text-light` | `#94a3b8` | Texto menos destacado |
| `--border` | `#e2e8f0` | Divisórias e bordas |
| `--motion-fast/base/slow` | `360ms / 560ms / 900ms` | Durações globais |
| `--ease-out-smooth` | `cubic-bezier(.16, 1, .3, 1)` | Curva global |

Tailwind expõe aliases como `bg-primary`, `text-ink`, `text-muted`, `border-border` e `font-sans`. Vários estilos de domínio ainda usam hexadecimais diretamente, incluindo fundo `#f7f9fd` e texto `#071542`. Prefira tokens existentes quando forem equivalentes, sem alterar incidentalmente toda a identidade de uma tela.

- **Tipografia:** Inter no produto; Sora via `--font-admin` dentro do admin. Títulos fortes, tracking levemente negativo e texto auxiliar cinza.
- **Marca:** `constants/brand.ts`, `/images/logo-escoply.png`, `/images/icon-escoply.png` e `BrandLogo` com variantes compacta/inversa. Reutilize os assets oficiais.
- **Ícones:** Lucide, geralmente 15–22 px em controles e maiores em destaques. Preserve ícone + texto em ações importantes.
- **Superfícies:** cards brancos, borda fina, sombra suave e cantos arredondados; gradientes azul/roxo em elementos de destaque.
- **Status:** verde para concluído/sucesso, âmbar para pendência/atenção, vermelho para atraso/erro/bloqueio, azul/roxo para informação/ênfase, cinza para neutro/inativo. Os badges do domínio determinam o mapeamento exato; cor nunca deve ser o único sinal.

Não há escala global formal de spacing/radius/tipografia. Reaproveite os valores da tela vizinha e, quando necessário, introduza tokens com escopo claro. Não documentar números escolhidos arbitrariamente como se fossem tokens já existentes.

## Três linguagens de composição

### Landing

Seções de apresentação com container central, títulos grandes, textos de valor e CTA. `container-page` limita a largura a 72rem com margem lateral; `section-space` usa 5rem de padding vertical. `SectionHeading` e `ButtonLink` são referências compartilhadas. Predominam utilitários Tailwind e efeitos de CSS global.

A ordem em `app/page.tsx` é a referência para a narrativa. Respeite as âncoras de `constants/landing.ts`. Autenticação aparece como modal, com estilos globais, CSS Module e alguns overrides inline; verificar as três camadas antes de editar.

### Workspace

`WorkspaceShell` oferece sidebar azul, navegação ativa, topbar clara, usuário, prazos e notificações. A sidebar usa base de 15.5rem e tem variante recolhida em `dashboard-scale.css`; não duplicar offsets nos módulos sem verificar a cascata.

Páginas operacionais costumam seguir:

```text
Cabeçalho: título + descrição + ação principal
Indicadores: cards de resumo
Filtros: busca + seletores + alternância de visualização quando aplicável
Conteúdo: tabela, cards, calendário ou Kanban
Contexto auxiliar: próximos eventos, resumos ou ações rápidas
Diálogos: criação, edição, detalhe e confirmação
```

Essa é uma diretriz de composição, não obrigação de adicionar indicadores onde não ajudam. No detalhe do projeto, mantenha cabeçalho contextual, seções de negócio e painel complementar em vez de transformar cada seção em nova rota principal.

### Administração

Shell próprio com Sora, sidebar e cabeçalhos administrativos, grids de métricas, tabelas, badges de plano/papel/status e painéis de detalhe. Reutilize `AdminHeader`, `AdminSummaryCard`, `StatusBadge`, `RoleBadge`, `PlanBadge` e os padrões de `components/admin/`. O visual não precisa copiar cada medida do workspace, mas deve preservar a marca.

## Componentes de referência

| Necessidade | Referência |
| --- | --- |
| Logo consistente | `components/ui/brand-logo.tsx` |
| CTA da landing | `components/ui/button-link.tsx` |
| Cabeçalho de seção pública | `components/ui/section-heading.tsx` |
| Feedback global | `components/ui/toast-provider.tsx` |
| Página de gestão decomposta | `components/finance/finance-page-content.tsx`, `components/obligations/obligations-page-content.tsx` |
| Tabela, filtros e cards | Arquivos irmãos nos domínios financeiro/obrigações |
| Configurações por aba | `settings-page-content.tsx`, `settings-sidebar.tsx`, `settings-section-shell.tsx` em `components/settings/` |
| Dialog com portal e scroll | `components/finance/new-payment-dialog.tsx`, `ActionModal` no detalhe do projeto |
| Layout administrativo | `app/admin/layout.tsx`, `components/admin/admin-sidebar.tsx` |

Não existe um `Dialog`, `Button`, `Input`, `Table` ou `Select` universal no projeto. Antes de criar uma abstração compartilhada, verifique as diferenças de comportamento das implementações existentes.

## Regras para novos fluxos e alterações

### Hierarquia e conteúdo

1. Apresente título e propósito claros; destaque uma ação principal por contexto.
2. Mantenha ações secundárias discretas e exclusão visualmente distinta.
3. Use labels reais nos campos; placeholder é exemplo, não substituto do rótulo.
4. Exiba status, datas e valores com contexto. Evite métricas decorativas ou números estáticos apresentados como conta real.
5. Use pt-BR, BRL e nomenclatura do produto: cliente, projeto, escopo, orçamento, aprovação, material, tarefa, obrigação e recebimento.
6. Não confunda “pagar obrigação”, “receber de cliente” e “assinar plano Escoply”. São jornadas diferentes.

### Formulários e feedback

- Validação amigável na UI e validação obrigatória no servidor.
- Preserve os dados digitados quando uma operação falhar.
- Desabilite submissão repetida enquanto a ação estiver em andamento e use texto como “Salvando...”.
- Feche o modal e apresente sucesso apenas após confirmação da operação.
- Erros devem explicar o que o usuário pode fazer; não mostrar segredo ou detalhes brutos de infraestrutura.
- Use `showToast({ type, title, description })`. Tipos existentes: `success`, `error`, `info`. O provider exibe até quatro toasts; duração padrão de 5200ms e anúncios com `aria-live`.
- Diferencie vazio inicial, nenhum resultado de filtro, carregamento e falha. Um erro de leitura não é coleção vazia bem-sucedida.

### Diálogos, menus e acessibilidade

O padrão mais completo existente usa `createPortal(..., document.body)`, overlay de viewport, `role="dialog"`, `aria-modal`, título associado, Escape e bloqueio/restauração de scroll. Nem todos os modais atuais seguem esse conjunto.

Para novos diálogos ou refatorações no escopo da tarefa: foco inicial apropriado, contenção de foco, retorno ao acionador ao fechar, botão de fechar com nome acessível e navegação por teclado. Não considerar `aria-modal` suficiente para implementar essas interações. Não permitir fechamento que silencie uma operação destrutiva em andamento.

Use elementos semânticos: links navegam, botões executam ações. Ícones sem texto precisam de nome acessível. Mantenha `focus-visible`, contraste adequado e status legível por texto. Valide o Kanban também sem arrastar com mouse quando esse fluxo for alterado.

Portais evitam cortes por `overflow` e contextos de empilhamento, mas continuam dependendo da cascata global. Examine overlay, popover, topbar e toast antes de aumentar `z-index`; não há escala global única formalizada.

### Responsividade e movimento

Há breakpoints próprios por módulo, não uma única grade global. O shell usa pontos como 1120, 820 e 640px; agenda usa 1180/720px; admin tem 1180/820/560px mais overrides. Considere isso evidência da implementação, não novos tokens universais.

Em mudanças visuais, verifique pelo menos uma viewport mobile (~390px), intermediária (~820px) e desktop (~1440px), além dos limites particulares do módulo. Tabelas precisam de overflow controlado ou alternativa legível; diálogos precisam caber na altura útil; campos e ações não devem ficar inacessíveis. Essas larguras são uma sugestão de QA, não um requisito já automatizado.

`globals.css` possui tratamento de `prefers-reduced-motion`. Ao criar animações de domínio, respeite essa preferência. Preserve transições existentes sem adicionar movimento que atrase tarefas frequentes. Valide leitura, foco e clique com zoom de 200% quando afetados.

## CSS: localização e ordem

Integração Google: `app/dashboard/google.css`, carregado pelo layout após `dashboard.css`, usa prefixos `google-`. Painel em configurações/agenda com loading, erros, estado de conexão e revisão de conflitos. Compromissos usam diálogo nativo `showModal()` em portal, Escape, bloqueio/restauração de scroll e foco. Calendário apresenta dia inteiro e 24 horas; compromissos que atravessam dias aparecem nos dias sobrepostos. Teste visual autenticado ainda pendente da ativação da migration.

| Superfície | Camadas principais |
| --- | --- |
| Global/landing | `app/globals.css`, utilitários Tailwind |
| Auth | Global + `components/landing/auth-modal.module.css` + overrides locais |
| Shell dashboard | `dashboard.css` seguido de `dashboard-scale.css` |
| Clientes | `clients.css`, `client-modal.css`, `clients-table.css`, `client-actions.css` |
| Projetos | `projects.css`; detalhe importa `project-detail.css` |
| Agenda | `tarefas/tasks.css` seguido de `agenda/agenda.css` |
| Financeiro/obrigações | `financeiro/finance.css`, `obrigacoes/obligations.css` |
| Configurações | `settings.css` seguido de `settings-overrides.css` |
| Admin | `admin.css` seguido de `admin-realtime.css` |

Os caminhos sem raiz nessa tabela partem de `app/dashboard/`, salvo global/auth/admin. CSS tradicional é global mesmo quando importado em uma página. Use prefixos de domínio (`finance-`, `obligations-`, `settings-`, `admin-`, etc.). Classes como `.tone-blue` aparecem em mais de uma área: considere risco de colisão na navegação.

Antes de adicionar um override, encontre o seletor original e todas as redefinições. Evite corrigir localmente com `!important` sem entender qual camada impõe o valor. Não reformate grandes estilos comprimidos junto de uma pequena alteração funcional.
