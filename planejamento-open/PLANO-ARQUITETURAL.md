# Plano Arquitetural — SX AI Designer Standalone + Marketplace

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX REVERSE PROXY                       │
│                   (SSL, Load Balance, Static)                     │
├──────────────┬──────────────────┬───────────────────────────────┤
│  :3000       │     :3001        │          :3002                 │
│  Next.js     │     NestJS       │          Next.js               │
│  Frontend    │     API          │          Admin Panel           │
│  (Designer   │     (REST +      │          (Dashboard,           │
│   +Market)   │      WebSocket)  │           CRUD, Stats)         │
└──────┬───────┴────────┬─────────┴───────────────┬───────────────┘
       │                │                          │
       │         ┌──────┴──────┐            ┌──────┴──────┐
       │         │  PostgreSQL │            │    Redis    │
       │         │   (Dados)   │            │  (Cache +   │
       │         └─────────────┘            │  BullMQ)    │
       │                                    └─────────────┘
       │
┌──────┴──────┐
│   MinIO     │
│   (S3       │
│   Storage)  │
└─────────────┘
```

## Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SSR/SSG, SEO, React Server Components, Image Optimization |
| **Admin** | Next.js 14 (App Router) | Consistência com frontend, Server Actions |
| **API** | NestJS | Modular, TypeScript nativo, robusto para produção, WebSocket nativo |
| **Banco** | PostgreSQL 16 | Relacional robusto, JSON support, full-text search |
| **Cache/Fila** | Redis 7 + BullMQ | Cache de sessões, fila de jobs assíncronos, rate limiting |
| **Storage** | MinIO (S3 compat) | Armazenamento de imagens, mockups, uploads. Migração fácil para AWS S3 |
| **Queue Worker** | BullMQ Worker | Jobs de mockup, e-mails, notificações, processamento assíncrono |
| **AI SDK** | OpenAI SDK + fetch nativo | Compatibilidade com todos os providers |
| **Imagens** | Sharp + node-canvas | Composite de mockups, redimensionamento, thumbnails |
| **E-mail** | React Email + Resend | Templates bonitos e tipados |
| **Pagamento** | Stripe (+ Pix/Boleto via Stripe) | Internacionais + nacionais |
| **Deploy** | Docker Compose | Portável, reproduzível, VPS-friendly |
| **Testes** | Vitest + Playwright | Unit + E2E |

## Estrutura de Pastas

```
sx-designer/
├── apps/
│   ├── web/                          # Frontend público
│   │   ├── src/
│   │   │   ├── app/                  # Next.js App Router
│   │   │   │   ├── (marketing)/      # Rotas públicas (layout grupo)
│   │   │   │   │   ├── page.tsx              # Home
│   │   │   │   │   ├── produtos/
│   │   │   │   │   │   ├── page.tsx          # Catálogo
│   │   │   │   │   │   └── [slug]/page.tsx   # Detalhe produto
│   │   │   │   │   ├── categorias/
│   │   │   │   │   │   └── [slug]/page.tsx
│   │   │   │   │   ├── como-funciona/page.tsx
│   │   │   │   │   ├── sobre/page.tsx
│   │   │   │   │   └── contato/page.tsx
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   ├── registro/page.tsx
│   │   │   │   │   └── esqueci-senha/page.tsx
│   │   │   │   ├── (designer)/
│   │   │   │   │   └── designer/page.tsx     # Página principal do AI Designer
│   │   │   │   ├── (account)/
│   │   │   │   │   ├── minha-conta/
│   │   │   │   │   │   ├── page.tsx          # Dashboard
│   │   │   │   │   │   ├── pedidos/page.tsx
│   │   │   │   │   │   ├── projetos/page.tsx
│   │   │   │   │   │   ├── favoritos/page.tsx
│   │   │   │   │   │   └── configuracoes/page.tsx
│   │   │   │   │   ├── carrinho/page.tsx
│   │   │   │   │   └── checkout/page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/           # Componentes React
│   │   │   │   ├── designer/         # Componentes do AI Designer
│   │   │   │   │   ├── ChatPanel.tsx
│   │   │   │   │   ├── CanvasPanel.tsx
│   │   │   │   │   ├── MessageBubble.tsx
│   │   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   │   ├── QuickSuggestions.tsx
│   │   │   │   │   ├── ArtViewer.tsx
│   │   │   │   │   ├── MockupGrid.tsx
│   │   │   │   │   ├── VersionHistory.tsx
│   │   │   │   │   ├── UploadZone.tsx
│   │   │   │   │   └── GenerateButton.tsx
│   │   │   │   ├── marketplace/      # Componentes do marketplace
│   │   │   │   │   ├── ProductCard.tsx
│   │   │   │   │   ├── ProductGrid.tsx
│   │   │   │   │   ├── CategoryFilter.tsx
│   │   │   │   │   ├── PriceFilter.tsx
│   │   │   │   │   ├── CartDrawer.tsx
│   │   │   │   │   ├── CartItem.tsx
│   │   │   │   │   ├── ReviewCard.tsx
│   │   │   │   │   ├── ReviewForm.tsx
│   │   │   │   │   └── ShippingCalculator.tsx
│   │   │   │   └── shared/           # Componentes compartilhados
│   │   │   │       ├── Header.tsx
│   │   │   │       ├── Footer.tsx
│   │   │   │       ├── Button.tsx
│   │   │   │       ├── Input.tsx
│   │   │   │       ├── Modal.tsx
│   │   │   │       ├── Toast.tsx
│   │   │   │       ├── Skeleton.tsx
│   │   │   │       ├── Pagination.tsx
│   │   │   │       └── Breadcrumb.tsx
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   │   ├── useChat.ts
│   │   │   │   ├── useDesigner.ts
│   │   │   │   ├── useCart.ts
│   │   │   │   ├── useProducts.ts
│   │   │   │   └── useAuth.ts
│   │   │   ├── lib/                  # Utilitários
│   │   │   │   ├── api.ts            # Cliente API
│   │   │   │   ├── auth.ts           # Auth helpers
│   │   │   │   ├── format.ts         # Formatação BR
│   │   │   │   └── constants.ts
│   │   │   ├── stores/               # Zustand stores
│   │   │   │   ├── designerStore.ts
│   │   │   │   ├── cartStore.ts
│   │   │   │   └── authStore.ts
│   │   │   └── styles/
│   │   │       └── globals.css       # Tailwind + design tokens
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── admin/                        # Painel administrativo
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx                  # Dashboard
│   │   │   │   ├── projetos/
│   │   │   │   │   ├── page.tsx              # Lista
│   │   │   │   │   └── [id]/page.tsx         # Detalhe
│   │   │   │   ├── producao/page.tsx
│   │   │   │   ├── produtos/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── novo/page.tsx
│   │   │   │   │   └── [id]/editar/page.tsx
│   │   │   │   ├── categorias/page.tsx
│   │   │   │   ├── pedidos/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── clientes/page.tsx
│   │   │   │   ├── reviews/page.tsx
│   │   │   │   ├── cupons/page.tsx
│   │   │   │   ├── estatisticas/page.tsx
│   │   │   │   ├── logs/page.tsx
│   │   │   │   └── configuracoes/page.tsx
│   │   │   ├── components/
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── Projects/
│   │   │   │   ├── Production/
│   │   │   │   ├── Products/
│   │   │   │   ├── Orders/
│   │   │   │   └── Settings/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   └── api/                          # Backend NestJS
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/               # Utilitários compartilhados
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   ├── middleware/
│       │   │   └── pipes/
│       │   ├── auth/                 # Módulo de autenticação
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── strategies/
│       │   │   │   └── jwt.strategy.ts
│       │   │   └── dto/
│       │   ├── designer/             # Módulo do AI Designer
│       │   │   ├── designer.module.ts
│       │   │   ├── chat/
│       │   │   │   ├── chat.controller.ts
│       │   │   │   ├── chat.service.ts
│       │   │   │   └── dto/
│       │   │   ├── generation/
│       │   │   │   ├── generation.controller.ts
│       │   │   │   ├── generation.service.ts
│       │   │   │   └── dto/
│       │   │   ├── mockup/
│       │   │   │   ├── mockup.controller.ts
│       │   │   │   ├── mockup.service.ts
│       │   │   │   └── dto/
│       │   │   ├── projects/
│       │   │   │   ├── projects.controller.ts
│       │   │   │   ├── projects.service.ts
│       │   │   │   └── dto/
│       │   │   └── upload/
│       │   │       ├── upload.controller.ts
│       │   │       └── upload.service.ts
│       │   ├── marketplace/          # Módulo do marketplace
│       │   │   ├── marketplace.module.ts
│       │   │   ├── products/
│       │   │   │   ├── products.controller.ts
│       │   │   │   ├── products.service.ts
│       │   │   │   └── dto/
│       │   │   ├── categories/
│       │   │   ├── cart/
│       │   │   │   ├── cart.controller.ts
│       │   │   │   └── cart.service.ts
│       │   │   ├── orders/
│       │   │   │   ├── orders.controller.ts
│       │   │   │   └── orders.service.ts
│       │   │   ├── payments/
│       │   │   │   ├── payments.controller.ts
│       │   │   │   └── payments.service.ts
│       │   │   ├── shipping/
│       │   │   ├── reviews/
│       │   │   └── favorites/
│       │   ├── admin/                # Módulo admin
│       │   │   ├── admin.module.ts
│       │   │   ├── dashboard/
│       │   │   ├── production/
│       │   │   ├── settings/
│       │   │   ├── stats/
│       │   │   ├── coupons/
│       │   │   └── users/
│       │   ├── notifications/        # Módulo de notificações
│       │   │   ├── notifications.module.ts
│       │   │   ├── email/
│       │   │   │   ├── email.service.ts
│       │   │   │   └── templates/     # React Email templates
│       │   │   ├── whatsapp/
│       │   │   └── telegram/
│       │   ├── queue/                # Módulo de fila
│       │   │   ├── queue.module.ts
│       │   │   ├── queue.processor.ts
│       │   │   └── jobs/
│       │   │       ├── mockup.job.ts
│       │   │       ├── email.job.ts
│       │   │       └── notification.job.ts
│       │   └── config/               # Configurações
│       │       ├── database.config.ts
│       │       ├── redis.config.ts
│       │       ├── jwt.config.ts
│       │       └── app.config.ts
│       ├── test/
│       ├── nest-cli.json
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── database/                     # Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/
│   │       └── index.ts              # Export do PrismaClient
│   │
│   ├── ai/                           # Providers de IA
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts              # Interfaces dos providers
│   │   │   ├── factory.ts            # AIProviderFactory
│   │   │   ├── providers/
│   │   │   │   ├── openai.provider.ts
│   │   │   │   ├── gemini.provider.ts
│   │   │   │   ├── falai.provider.ts
│   │   │   │   ├── replicate.provider.ts
│   │   │   │   ├── omniroute.provider.ts
│   │   │   │   └── stability.provider.ts
│   │   │   └── utils/
│   │   │       ├── cost-estimator.ts
│   │   │       └── prompt-enricher.ts
│   │   └── package.json
│   │
│   ├── mockup/                       # Engine de mockups
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── engine.ts             # Composite engine (Sharp + Canvas)
│   │   │   ├── templates/            # Positioning maps
│   │   │   │   ├── tshirt.ts
│   │   │   │   ├── mug.ts
│   │   │   │   ├── bottle.ts
│   │   │   │   ├── pillow.ts
│   │   │   │   ├── mousepad.ts
│   │   │   │   ├── hoodie.ts
│   │   │   │   ├── cap.ts
│   │   │   │   ├── notebook.ts
│   │   │   │   ├── totebag.ts
│   │   │   │   └── poster.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── types/                        # Tipos compartilhados
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── project.ts
│   │   │   ├── art.ts
│   │   │   ├── mockup.ts
│   │   │   ├── product.ts
│   │   │   ├── order.ts
│   │   │   ├── user.ts
│   │   │   └── api.ts
│   │   └── package.json
│   │
│   └── ui/                           # Componentes React compartilhados
│       ├── src/
│       │   ├── index.ts
│       │   ├── Button/
│       │   ├── Input/
│       │   ├── Card/
│       │   ├── Modal/
│       │   ├── Toast/
│       │   └── ...
│       └── package.json
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── Dockerfile.admin
│   ├── Dockerfile.worker
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── nginx/
│       └── nginx.conf
│
├── docs/
│   ├── ARQUITETURA.md
│   ├── API.md
│   ├── DEPLOY.md
│   └── MIGRACAO.md
│
├── .env.example
├── .gitignore
├── turbo.json
├── package.json                      # Root package.json (workspace)
├── tsconfig.base.json
└── README.md
```

## Diagrama de Fluxo — Designer

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Cliente  │────▶│  Chat    │────▶│   IA     │────▶│  Resposta│
│  (browser)│     │  API     │     │ Provider │     │  (SSE)   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐     ┌──────────┐
                                  │Gerar Arte│────▶│ Salvar   │
                                  │  (POST)  │     │ Art + DB │
                                  └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐     ┌──────────┐
                                  │ Gerar    │────▶│  Mockups │
                                  │ Mockups  │     │  (async) │
                                  │ (BullMQ) │     │  Salvar  │
                                  └──────────┘     └──────────┘
                                                         │
                                                         ▼
                                                  ┌──────────┐
                                                  │ Aprovar  │
                                                  │ + Carrinho│
                                                  └──────────┘
```

## Diagrama de Fluxo — Marketplace

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browse  │────▶│  Carrinho │────▶│ Checkout │
│  Produtos│     │  (+IA)   │     │          │
└──────────┘     └──────────┘     └─────┬────┘
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                        ┌──────────┐        ┌──────────┐
                        │ Pagamento│        │ Frete    │
                        │ (Stripe) │        │ (Cálculo)│
                        └─────┬────┘        └──────────┘
                              │
                              ▼
                        ┌──────────┐     ┌──────────┐
                        │  Pedido  │────▶│Produção  │
                        │ Confirmado│    │(equipe)  │
                        └──────────┘     └──────────┘
                              │
                              ▼
                        ┌──────────┐     ┌──────────┐
                        │ Envio +  │────▶│Entrega + │
                        │ Rastreio │     │ Review   │
                        └──────────┘     └──────────┘
```

## Fluxo de Status dos Projetos

```
draft ──▶ generating ──▶ reviewing ──▶ approved ──▶ in_production ──▶ completed
  │                          │              │
  └──────────────────────────┴──────────────┴──▶ cancelled
```

## Fluxo de Status dos Pedidos

```
pending ──▶ paid ──▶ processing ──▶ shipped ──▶ delivered
   │                                          │
   └──────────────────────────────────────────┴──▶ cancelled
```

## Decisões de Arquitetura

| Decisão | Escolha | Justificativa |
|---|---|---|
| **Monorepo** | Turborepo | Code sharing, builds incrementais, consistência |
| **API Framework** | NestJS | Modular, DI nativo, TypeScript, WebSocket, testes fáceis |
| **Frontend** | Next.js 14 App Router | SSR/SSG para SEO, Server Components, Image optimization |
| **Database ORM** | Prisma | Type-safe, migrations automáticas, DX excelente |
| **Cache/Fila** | Redis + BullMQ | Performático, confiável, monitoramento |
| **Storage** | MinIO (S3) | Compatível S3, self-hosted, fácil migração para AWS |
| **UI Framework** | Tailwind CSS | Consistente com design atual (cores, border-radius), produtivo |
| **State Management** | Zustand | Leve, simples, sem boilerplate |
| **Autenticação** | JWT (access + refresh) | Stateless, escalável, padrão de mercado |
| **Pagamento** | Stripe | Internacionais + Pix/Boleto via Stripe Brasil |
| **E-mails** | React Email + Resend | Templates bonitos, tipados, delivery excelente |
| **Testes** | Vitest (unit) + Playwright (E2E) | Rápido, DX bom, cobertura ampla |
| **Containerização** | Docker Compose | VPS-friendly, reproduzível, sem lock-in de cloud |
