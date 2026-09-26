# Guia de desenvolvimento e manutenção do contexto

## Ambiente local

Google, 26/09/2026: migrations da projeção e fila automática aplicadas no escoply, dry-run final sem pendências. 35 testes Google, lint, tipos e build aprovados. `after` é chamado apenas por mutações autenticadas; workspace retoma a fila enquanto visível. Sem navegador conectado para QA visual e sem deploy nesta entrega. Consulte `docs/GOOGLE_INTEGRATION.md` para o estado atual, que substitui as anotações históricas de preparação abaixo.

- Use npm e o `package-lock.json` existente.
- Next instalado declara Node **>=20.9.0**; “Node 20” sem minor no README antigo é menos preciso.
- Instalação reproduzível: `npm ci`. Desenvolvimento: `npm run dev`. Produção local: `npm run build` e `npm run start`.
- No PowerShell, use `npm.cmd`/`npx.cmd` se a política bloquear os wrappers `.ps1`.
- Variáveis necessárias e separação de segredos: [Dados e segurança](DATA_SECURITY.md).
- Frontend/servidor web e Supabase remoto são ambientes distintos. Não deduzir o estado remoto a partir do que existe localmente.

Scripts disponíveis: `dev`, `build`, `start`, `lint`, `test:google`. O último usa o runner nativo do Node e módulos reais com serviços simulados; sem nova dependência. ESLint usa os presets Next/TypeScript, e a checagem de tipos é `npx tsc --noEmit`.

`next/font/google` pode precisar de acesso à rede durante build. Não declarar build aprovado só porque lint e tipos passaram.

## Roteiro para uma tarefa

### Preparação local do Google OAuth — 25/09/2026

O ambiente local foi preparado em `.env.local`, ignorado pelo Git, com `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI`. São variáveis exclusivas do servidor, sem prefixo `NEXT_PUBLIC_`. O carregamento foi conferido com `@next/env`, sem imprimir valores. Reinicie o servidor de desenvolvimento após alterações de ambiente.

O callback planejado é `/api/integrations/google/callback`; a URL local usa `http://localhost:3000`. No ambiente publicado, a variável deverá apontar para a origem HTTPS da aplicação. A configuração da Vercel ainda não foi feita. O JSON de origem permanece fora do repositório.

Atualização: callback, persistência criptografada de tokens, interface e sincronização manual foram implementados. A chave adicional `GOOGLE_TOKEN_ENCRYPTION_KEY` foi gerada localmente e precisa ser configurada como Secret na Vercel. Migration e deploy continuam pendentes. O escopo é Calendar e Tasks nos dois sentidos, sem serviços pagos. Google Tasks não permite sincronizar horário de vencimento pela API; lembretes de eventos e notificações próprias do Escoply são recursos distintos. Consulte [ativação e verificações](../GOOGLE_INTEGRATION.md).

### Sequência de implementação

1. Leia `AGENTS.md`, o índice de contexto e os guias do domínio.
2. Consulte `git status --short` para distinguir trabalho anterior das suas alterações.
3. Encontre a rota, o componente, a consulta, a action e as migrations envolvidos. Busque imports antes de concluir que um arquivo é legado ou não usado.
4. Leia o guia local pertinente do Next antes de escrever código. Principais referências em `node_modules/next/dist/docs/01-app/`: `01-getting-started/05-server-and-client-components.md`, `01-getting-started/11-css.md`, `02-guides/server-actions.md`, `03-api-reference/03-file-conventions/proxy.md` e as referências das funções alteradas.
5. Defina se a tarefa muda só apresentação, comportamento client, dados, permissão ou schema. Considere telas que compartilham o registro.
6. Faça a menor alteração coerente com a arquitetura atual; não reestruture módulos não relacionados.
7. Valide conforme o impacto, revise diff e atualize a documentação relevante.

## Nova página ou módulo

- Crie a entrada em `app/dashboard/<rota>/page.tsx` ou no admin conforme público/permissão.
- Valide parâmetros da URL no servidor. Use `Promise` para `params`/`searchParams` conforme os padrões locais.
- Reutilize o layout existente; não crie outro shell dentro da página.
- Concentre consultas e mapeamentos em `lib/<domínio>/` quando houver lógica relevante.
- Crie um componente de composição e extraia header/filtros/lista/dialogs conforme responsabilidades reais.
- Mantenha estado transitório na interface e dados persistidos no backend. Não persistir dados privados em localStorage como atalho.
- Adicione navegação apenas se a funcionalidade for realmente uma nova área principal do produto.
- CSS deve ter prefixo do domínio e considerar as camadas já carregadas. Consulte [UI/UX](UI_UX.md).
- Documente rota, estado de maturidade e entradas de dados no guia de produto/arquitetura.

## Alteração de dados ou action

Sequência recomendada: identificar usuário → validar dados → validar relações e autorização → executar operação → conferir erro e resultado → revalidar consumidores → comunicar resultado.

- Derive `owner_id` da sessão. Um hidden input não prova autorização.
- Valide enums em runtime mesmo quando a assinatura TypeScript usa union.
- `update/delete` sem erro não garante que uma linha foi afetada. Onde isso importa, confirme a linha com `select`/resultado apropriado.
- Use mensagens de erro que preservem a capacidade de corrigir/repetir a ação.
- Em operações com múltiplas escritas, planeje atomicidade ou compensação. Evite sucesso parcial silencioso.
- Revise revalidação de dashboard, agenda, lista e detalhe conforme os consumidores. Não adicione revalidação indiscriminada de todo o app como correção padrão.
- Para arquivos, considere falha entre upload e inserção, exclusão da linha sem exclusão do objeto e expiração da URL assinada.

## Banco e infraestrutura

Novas migrations seguem o formato de timestamp já usado em `supabase/migrations/`. Acrescente tabela/colunas, constraints, relações com proprietário, RLS, grants, índices e triggers quando aplicável. Não editar retroativamente uma migration já aplicada.

Comandos disponíveis no fluxo Supabase:

```text
npx supabase migration list
npx supabase db push
npx supabase functions deploy delete-account
```

`migration list` consulta estado; `db push` e deploy alteram ambiente remoto. Não executá-los automaticamente só por terem sido mencionados na documentação. `supabase db reset` é destrutivo no ambiente selecionado e não é etapa de análise. Confira projeto/ambiente e o escopo autorizado antes de operações remotas.

Configuração de URLs de auth, confirmação de e-mail, templates e secrets vive também no Supabase e não foi auditada nesta análise. `supabase/README.md` contém orientações iniciais, mas partes descrevem apenas a primeira fase do schema.

## Validação proporcional

| Tipo de mudança | Verificação recomendada |
| --- | --- |
| Documentação | Links locais, caminhos, coerência com código e diff; sem necessidade de build |
| TypeScript/React | Lint, tipos e fluxo afetado |
| Rota/layout/SSR/CSS compartilhado | Lint/tipos, build quando viável, navegação direta e entre rotas |
| Visual | Desktop/mobile, zoom, overflow, estado vazio, loading, erro, foco e teclado |
| CRUD | Criar/ler/editar, tentativa inválida, falha de backend, isolamento entre contas e telas consumidoras |
| Dinheiro/datas/notificações | Limites de dia/mês, timezone, cancelamento, atraso, leitura versus conclusão e totais sem duplicação |
| Admin/auth | Sem sessão, usuário comum, bloqueado e admin ativo; testar autorização na action, não só na navegação |
| Upload | MIME/tamanho inválido, acesso de outro usuário, falha parcial, exclusão e URL expirada |
| SQL/Edge Function | Ambiente de teste apropriado, RLS e validação própria do Deno; `tsc` web não cobre a função |

Não criar testes que apenas repetem a implementação nem expandir escopo sem necessidade. Para regras críticas novas, testes de comportamento são úteis; ainda será preciso escolher infraestrutura, porque ela não está configurada no snapshot.

## Resultado da análise de 25/09/2026

- `npm.cmd run lint`: **passou**, sem erros/avisos emitidos.
- `npx.cmd tsc --noEmit`: **passou**.
- Build de produção: não executado; a entrega desta tarefa altera documentação.
- Fluxos autenticados no navegador, deploy, conteúdo real do banco e RLS remoto: não verificados.
- Nenhuma migration foi aplicada e nenhum dado de negócio foi alterado durante a análise.

Os resultados valem para o workspace examinado, que já continha alterações locais de admin/suporte/logs. Eles não comprovam que essas mudanças estejam commitadas ou publicadas.

## Como manter esta memória útil

| Mudou | Atualize |
| --- | --- |
| Proposta, feature, rota ou maturidade | `PRODUCT.md` |
| Dependência, diretório, camada ou fluxo técnico | `ARCHITECTURE.md` |
| Tabela, enum, relação, Storage, auth ou permissão | `DATA_SECURITY.md` |
| Token, componente compartilhado, composição ou comportamento visual | `UI_UX.md` |
| Setup, comando ou processo de verificação | `DEVELOPMENT.md` |
| Limitação resolvida ou descoberta | `KNOWN_GAPS.md` |
| Regra transversal para toda tarefa | `AGENTS.md`, mantendo-o curto |
| Decisão relevante e seu motivo | `docs/CONTENT_LOG.md` |

Atualize a data de revisão ao revisar a base, preserve evidências por caminho/símbolo e remova afirmações obsoletas. Não registrar valores de ambiente, dados de clientes, tokens, URLs assinadas ou dumps privados. Evite duplicar o mesmo conteúdo integral em vários guias: o índice existe para consulta progressiva.
