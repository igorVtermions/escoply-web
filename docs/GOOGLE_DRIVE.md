# Google Drive — primeira etapa

Implementação local em 29/09/2026. **Migration aplicada no Supabase `vdtjfjkupgfepdcxyidh`, após conferir que app e CLI apontam para esse projeto e que apenas a migration Drive estava pendente. As duas variáveis novas estão presentes localmente; ainda falta validar a configuração Cloud e o OAuth real. Não houve deploy.**

## Experiência implementada

- Configurações → Integrações: cartão recolhível com logo do Drive, status real, conexão, renovação e desconexão.
- Projeto → Materiais: adicionar um arquivo pelo Google Picker; aparece na aba **Links**. O título e o link são obtidos pela API no servidor, não confiados ao navegador.
- Vincular, trocar e abrir uma pasta por projeto. Selecionar uma pasta não importa os arquivos de dentro dela nem dá acesso irrestrito a todos os seus descendentes.
- Remover material ou desvincular pasta preserva o original no Google. Não altera compartilhamento, não concede acesso ao cliente e não cria cópias no Supabase.
- A mesma conta/arquivo não pode gerar materiais duplicados no mesmo projeto. Uma reconexão exige a mesma conta Google previamente associada ao Drive.

Nome e tipo são uma fotografia do momento do vínculo. Alterações no conteúdo aparecem ao abrir o original no Google; renomeação, perda de permissão e exclusão posteriores não são monitoradas em segundo plano. Arquivos indisponíveis são recusados ao vincular; depois disso o acesso é tratado pelo próprio Drive ao abrir o link. Atalhos são recusados; selecione o original.

## Arquitetura e segurança

- `lib/google/drive.ts`: autenticação ativa reutilizada de `googleContext`, consulta de projeto por proprietário, credencial do Drive criptografada, limite de operações e validação remota de arquivos.
- `app/dashboard/configuracoes/drive-actions.ts`: estado, configuração pública do seletor, vínculo e desvínculo. Todas as entradas autenticam o usuário no servidor. O proprietário vem da sessão.
- `lib/google/drive-model.ts`: validação de IDs/resource keys e construção de URLs HTTPS do Drive.
- `lib/google/drive-picker.ts`: carrega Google Identity Services e Picker somente para projetos com conexão/configuração pronta. Obtém token temporário com `drive.file` e `include_granted_scopes=false`. Não grava tokens no storage do navegador nem entrega o refresh token ou client secret ao cliente.
- `components/google/drive-panel.tsx` e `project-drive.tsx`: controles nas superfícies existentes. O Picker abre por clique, é descartado ao concluir/cancelar e devolve foco ao acionador.
- O callback OAuth existente usa `purpose` salvo no estado de autorização, vinculado ao proprietário, com PKCE, cookie e consumo único. Drive não exige Calendar/Tasks; Agenda não exige Drive.
- `google_drive_connections`: credencial e identidade próprias, acesso somente por servidor, atualização otimista por `version` para evitar substituir conexão mais recente.
- `project_materials`: permanece `kind=link`, sem binário; novas colunas `drive_file_id` e `drive_account` permitem unicidade por proprietário/projeto/conta/arquivo.
- `project_drive_folders`: pasta do projeto, acesso somente por servidor, FK composta para projeto/proprietário.
- A política COOP das rotas de projetos usa `same-origin-allow-popups` para o fluxo Google. Demais rotas preservam a política existente.

### Desconexão

A revogação de um token Google pode revogar as permissões do projeto Cloud inteiro, inclusive outros clientes OAuth. Por isso os botões do Escoply **desconectam localmente apenas o serviço escolhido**, apagam sua credencial e preservam vínculos. A autorização concedida ao aplicativo no Google permanece até revogação na conta Google. A UI explica isso e oferece o endereço `https://myaccount.google.com/connections`; uma revogação completa pode exigir reconectar ambos os serviços. Não chamar o endpoint global de revogação ao desconectar uma integração isolada.

## Ativação

1. No mesmo projeto Google Cloud do cliente OAuth, habilitar **Google Drive API** e **Google Picker API**.
2. Na configuração de consentimento/acesso a dados, disponibilizar `https://www.googleapis.com/auth/drive.file`. Manter os escopos atuais da Agenda e os usuários de teste necessários. O aplicativo solicita os escopos por recurso, separadamente.
3. No cliente OAuth do tipo Web, adicionar as **origens JavaScript autorizadas**, sem caminho: `http://localhost:3000` e `https://escoply-web.vercel.app`. Preservar os redirects `/api/integrations/google/callback` já cadastrados. Outras portas ou domínios precisam de entradas próprias.
4. Criar uma **chave de API de navegador** para o Picker. Restringir por sites/referrers a `http://localhost:3000/*`, `https://escoply-web.vercel.app/*` e `https://docs.google.com/*`, e por API a **Google Picker API** e **Google Drive API**, conforme o exemplo oficial atual. O domínio docs.google.com é necessário para o iframe do Picker. Essa chave é pública por natureza; a proteção é a restrição de origem/API, não escondê-la no JavaScript. Não usar uma chave de servidor irrestrita.
5. Copiar o **número do projeto Google Cloud** (numérico, diferente do nome/ID textual). API key, cliente OAuth e número devem corresponder ao mesmo projeto.
6. Configurar localmente e na Vercel:

   ```dotenv
   GOOGLE_PICKER_API_KEY=<chave restrita do navegador>
   GOOGLE_CLOUD_PROJECT_NUMBER=<numero do projeto>
   ```

   Reutilizar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` e `GOOGLE_TOKEN_ENCRYPTION_KEY`. Não trocar a chave de criptografia existente: isso impediria ler as credenciais já salvas da Agenda. Não expor client secret ou chave de criptografia com `NEXT_PUBLIC_`.

7. Conferir o projeto Supabase vinculado e aplicar **somente após essa conferência** a migration `202609290001_google_drive.sql`, após as anteriores. Esta versão do callback e das actions Google exige a nova coluna de propósito; a migration deve anteceder a publicação do código. Não editar migrations anteriores.
8. Reiniciar o servidor local; para Vercel, as variáveis só passam a valer numa nova publicação. Publicação não foi executada nesta tarefa.
9. Conectar pelo cartão do Drive e executar a validação abaixo. API habilitada/variáveis preenchidas não comprovam autorização e funcionamento.

Após configuração pelo usuário, as duas variáveis novas foram carregadas localmente e o número do projeto passou na validação de formato numérico. Isso não comprova restrições da API key, APIs habilitadas ou consentimento OAuth. Nenhum valor secreto foi exibido ou alterado pelo agente.

## Uso gratuito e limites

Não foram adicionados serviços pagos, bibliotecas, uploads intermediários, jobs ou leitura em massa do Drive. Os arquivos permanecem na conta Google de origem; apenas metadados e vínculos usam o Supabase.

O servidor limita a **200 tentativas de vincular arquivos/pastas por proprietário por dia UTC**. Cada tentativa autorizada pode fazer uma renovação de token e uma leitura de metadados. Esse limitador não cobre tráfego direto do Picker/Google Identity Services no navegador; configure e acompanhe as cotas do projeto Google Cloud. Não habilitar faturamento/recursos pagos como parte desta ativação.

O uso padrão da API é sem custo adicional dentro das condições atuais; o Google anuncia cobrança futura por excedentes de cotas em 2026. Não há promessa de gratuidade ilimitada. O espaço gratuito do Google é compartilhado com Gmail/Fotos; o Free do Supabase e o Hobby da Vercel continuam com seus próprios limites, incluindo a restrição de uso pessoal/não comercial do Hobby.

Fontes oficiais consultadas:

- [Escopo por arquivo e permissões](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Exemplo Google Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker-sample)
- [Token temporário do navegador](https://developers.google.com/identity/oauth2/web/reference/js-reference)
- [OAuth servidor e revogação](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Cotas/custo Drive](https://developers.google.com/workspace/drive/api/guides/limits)
- [Armazenamento Google](https://support.google.com/googleone/answer/9004014?hl=en)
- [Supabase Free](https://supabase.com/pricing)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)

## Verificação

Se aparecer `401 invalid_client` com `no registered origin`, cadastrar a origem exata do navegador em **Origens JavaScript autorizadas do cliente OAuth Web** correspondente a `GOOGLE_CLIENT_ID`. As restrições da API key e os redirects de callback são configurações distintas. Exemplo: `http://localhost:3000`, sem caminho ou `/*`; outra porta exige outra origem. O seletor agora solicita escolha de conta explicitamente (`select_account`, sem `login_hint`); o projeto mostra qual conta está conectada no Escoply para orientar a seleção. Isso não altera automaticamente a conexão persistida.

Validação local: lint, TypeScript e build aprovados; `npm run test:google` passou com **44 testes**, incluindo nove novos testes do Drive, sem credenciais ou rede. Testes cobrem propriedade, limite, validação de ID/resource key, lixeira, metadados conferidos no servidor, contrato de unicidade, reconexão concorrente, desconexão isolada e consumo único de estado OAuth.

Pendente de validação Google Cloud e sessão autenticada:

1. Conectar Drive sem Agenda e depois com Agenda já conectada; negar permissão e cancelar sem falso sucesso.
2. Abrir Picker em localhost/produção, mobile/desktop e teclado. Conferir popup, foco e cancelamento.
3. Vincular PDF, imagem e documento Google; repetir seleção sem duplicação. Conferir link privado e resource key.
4. Vincular/trocar/desvincular pasta; verificar que o conteúdo não é importado e o original permanece.
5. Tentar projeto de outro usuário e arquivo inacessível; validar RLS e FKs no banco real.
6. Desconectar Drive e testar Agenda; desconectar Agenda e testar Drive; revogar todo o app pelo Google e renovar autorização.

## Próximas etapas, fora desta entrega

Criação de pastas, upload direto ao Drive, anexos financeiros e geração/envio de PDF de orçamento. Nenhuma migração automática dos arquivos já existentes no Supabase.
