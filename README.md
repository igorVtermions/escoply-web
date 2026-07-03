# Escoply Web

> Do briefing à entrega, tudo no controle.

Escoply é uma plataforma para freelancers centralizarem clientes, projetos, escopos, orçamentos, aprovações, materiais, prazos e lembretes em um só lugar.

O produto nasce para resolver uma rotina comum entre profissionais independentes: informações importantes espalhadas entre WhatsApp, Drive, e-mail, planilhas, anotações e memória. O objetivo é transformar esse processo fragmentado em um fluxo simples e rastreável:

**Cliente → Projeto → Escopo → Orçamento → Aprovação → Entrega → Pagamento**

## Estado atual

Esta versão contém a base visual do projeto e a landing page institucional responsiva do Escoply.

Já estão implementados:

- identidade visual e componentes reutilizáveis;
- apresentação do problema e da solução;
- visão geral das funcionalidades planejadas;
- fluxo de trabalho do produto;
- prévia do roadmap de IA;
- apresentação inicial dos planos;
- FAQ e chamadas para ação;
- metadados, favicon e assets oficiais da marca.

Autenticação, dashboard, banco de dados, integrações, pagamentos e recursos de IA ainda não fazem parte desta etapa.

## Tecnologias

- [Next.js 16](https://nextjs.org/) com App Router
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) para ícones
- [Inter](https://fonts.google.com/specimen/Inter) carregada com `next/font`

## Executando localmente

### Requisitos

- Node.js 20 ou superior
- npm

### Instalação

```bash
git clone <URL_DO_REPOSITORIO>
cd escoply-web
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # inicia o ambiente de desenvolvimento
npm run build    # gera o build de produção
npm run start    # executa o build de produção
npm run lint     # verifica a qualidade do código
```

Para validar os tipos sem gerar arquivos:

```bash
npx tsc --noEmit
```

## Estrutura do projeto

```text
app/
├── globals.css             # tema global e variáveis visuais
├── layout.tsx              # layout raiz, fonte e metadados
└── page.tsx                # composição da landing page

components/
├── landing/                # seções da landing page
└── ui/                     # componentes visuais reutilizáveis

constants/
├── brand.ts                # informações e assets da marca
└── landing.ts              # conteúdo estruturado da página

public/images/              # logo e ícone oficiais
```

## Identidade visual

A interface utiliza azul-marinho e roxo como cores principais, com superfícies claras, gradientes sutis, bordas suaves e tipografia Inter. Os tokens do tema estão definidos como CSS variables em `app/globals.css`, facilitando a evolução consistente para a futura área autenticada.

## Roadmap

As próximas etapas previstas incluem:

- autenticação e área logada;
- gestão de clientes e projetos;
- escopos, orçamentos e aprovações;
- organização de materiais e arquivos;
- prazos, cobranças e obrigações recorrentes;
- experiência mobile;
- camada futura de IA/RAG para consultas e automações contextuais.

Os itens do roadmap representam a direção do produto e ainda não estão disponíveis nesta versão.

## Autor

Desenvolvido por **Igor Franco**.
