# Prompt Estruturado — Reconstrução SX AI Designer + Marketplace

> **Objetivo:** Migrar o plugin WordPress/WooCommerce "SX AI Designer" para aplicação web standalone com marketplace integrado, preservando 100% das funcionalidades existentes.

---

## ETAPA 0 — Configuração do Projeto

### Tarefa 0.1: Inicializar o repositório
- Criar projeto monorepo com Turborepo
- Definir stack: **Next.js 14** (App Router) + **NestJS** (API) + **PostgreSQL** + **Redis** + **BullMQ** + **Docker**
- Configurar TypeScript strict mode em todos os pacotes
- Configurar ESLint + Prettier
- Criar `.env.example` com todas as variáveis de ambiente
- Configurar Docker Compose (PostgreSQL, Redis, MinIO para S3 local)

### Tarefa 0.2: Estrutura de pastas
```
sx-designer/
├── apps/
│   ├── web/          # Next.js 14 — Frontend do designer + marketplace
│   ├── admin/        # Next.js 14 — Painel admin
│   └── api/          # NestJS — Backend API
├── packages/
│   ├── ui/           # Componentes React compartilhados
│   ├── database/     # Prisma schema + migrations + seeds
│   ├── ai/           # Providers de IA (OpenAI, Gemini, Fal, Replicate, OmniRoute)
│   ├── mockup/       # Engine de geração de mockups
│   └── types/        # Tipos TypeScript compartilhados
├── docker/
├── docs/
└── turbo.json
```

---

## ETAPA 1 — Banco de Dados e Modelos

### Tarefa 1.1: Schema do Prisma
Recriar as 7 tabelas originais + novas tabelas do marketplace:

**Tabelas do Designer (existentes):**
| Tabela | Colunas Principais |
|---|---|
| `projects` | id (UUID), user_id, session_id, title, status (draft/generating/reviewing/approved/in_production/completed/cancelled), product_id, order_id, provider, model, meta (JSON), created_at, updated_at |
| `messages` | id, project_id, role (user/assistant/system), content (TEXT), attachments (JSON), tokens_used, created_at |
| `arts` | id, project_id, version, prompt, revised_prompt, seed, provider, model, width, height, file_url, file_path, transparent_url, thumb_url, is_approved, generation_time_ms, cost_usd, meta (JSON), created_at |
| `mockups` | id, art_id, project_id, product_type, view, color, file_url, thumb_url, position_x, position_y, scale, rotation, is_approved, created_at |
| `queue_jobs` | id, job_type, payload (JSON), status, attempts, max_attempts, error_log, available_at, started_at, finished_at, created_at |
| `system_logs` | id, level, context, message, data (JSON), user_id, created_at |
| `providers` | id, slug, label, is_active, config (JSON), priority, created_at |

**Tabelas Novas (Marketplace):**
| Tabela | Colunas Principais |
|---|---|
| `users` | id, name, email, password_hash, role (customer/producer/admin), avatar_url, phone, created_at |
| `products` | id, name, slug, description, base_price, category_id, product_type (designer/physical/digital), is_active, images (JSON), specs (JSON), stock_quantity, created_at |
| `categories` | id, name, slug, parent_id, icon, description, sort_order |
| `orders` | id, user_id, status (pending/paid/processing/shipped/delivered/cancelled), total, shipping_address (JSON), payment_method, payment_id, tracking_code, notes, created_at |
| `order_items` | id, order_id, product_id, project_id, quantity, unit_price, custom_price, meta (JSON) |
| `reviews` | id, user_id, product_id, order_id, rating (1-5), comment, images (JSON), is_approved, created_at |
| `favorites` | id, user_id, product_id, created_at |
| `search_history` | id, user_id, query, filters (JSON), created_at |
| `shipping_rules` | id, product_id, region, method, price, estimated_days, is_active |
| `coupons` | id, code, type (percent/fixed), value, min_order, max_uses, used_count, expires_at, is_active |

### Tarefa 1.2: Configurar Prisma
- Criar `schema.prisma` completo
- Gerar migrations
- Criar seed script com dados iniciais (categorias, produtos, system prompt, provider configs)
- Configurar cliente Prisma para connection pooling

---

## ETAPA 2 — Backend API (NestJS)

### Tarefa 2.1: Módulos base
- Configurar NestJS com modular architecture
- Configurar: ConfigModule, TypeORM/PrismaModule, CacheModule (Redis), ThrottlerModule
- Criar middleware de autenticação JWT (access + refresh tokens)
- Criar middleware de rate limiting
- Criar filtro global de exceções
- Configurar Swagger/OpenAPI para documentação

### Tarefa 2.2: Módulo de Autenticação
- `POST /auth/register` — Cadastro com nome, email, senha
- `POST /auth/login` — Login retorna JWT
- `POST /auth/refresh` — Renovar token
- `POST /auth/forgot-password` — Esqueci minha senha (e-mail)
- `GET /auth/me` — Dados do usuário logado
- Suporte a login social (Google OAuth) — opcional

### Tarefa 2.3: Módulo do Designer (Chat + Geração)

**Chat:**
- `POST /api/designer/chat` — Enviar mensagem, receber resposta da IA
  - Criar projeto se não existir
  - Salvar mensagem do usuário
  - Construir histórico (últimas 40 mensagens + system prompt)
  - Chamar provider de chat (OpenAI/Gemini/OmniRoute)
  - Detectar intenção de geração via triggers: "vou gerar", "vou criar", "vamos criar", "gerando sua arte", "criando a arte", "preparando a arte", "aqui está", "confirme"
  - Retornar `{ message, should_generate, project_id }`

**Geração de Arte:**
- `POST /api/designer/generate` — Gerar arte a partir do prompt
  - Enriquecer prompt com contexto do produto + "Alta resolução, fundo transparente"
  - Atualizar status do projeto → `generating`
  - Chamar provider de imagem (OpenAI/Gemini/Fal/Replicate/OmniRoute)
  - Salvar Art com versionamento
  - Status → `reviewing`
  - Enfileirar geração de mockups

**Mockups:**
- `POST /api/designer/mockups/generate` — Gerar mockups para uma arte
  - Suportar: tshirt, hoodie, mug, bottle, pillow, mousepad, cap, notebook, totebag, poster
  - Views: front, back, person, isolated, lifestyle, closeup
  - Composite local via Sharp/canvas OU integração com Placeit/Printful
- `PATCH /api/designer/mockups/:id` — Atualizar posição/cor/escala

**Projetos:**
- `GET /api/designer/projects` — Listar projetos do usuário
- `POST /api/designer/projects` — Criar projeto
- `GET /api/designer/projects/:uuid` — Detalhes do projeto + artes + mockups
- `PATCH /api/designer/projects/:uuid` — Atualizar título
- `DELETE /api/designer/projects/:uuid` — Deletar projeto (cascade)
- `POST /api/designer/projects/:uuid/approve` — Aprovar arte
- `POST /api/designer/projects/:uuid/add-to-cart` — Adicionar ao carrinho

**Upload:**
- `POST /api/designer/upload` — Upload de imagens (PNG, JPEG, GIF, WEBP, SVG, PDF, máx 10MB)

**Produção (Admin):**
- `GET /api/admin/production` — Fila de produção com filtros
- `PATCH /api/admin/production/:id/status` — Atualizar status

**Configuração:**
- `GET /api/admin/providers` — Listar providers + status
- `POST /api/admin/providers/:slug/validate` — Validar API key
- `GET /api/admin/settings` — Configurações
- `PATCH /api/admin/settings` — Atualizar configurações

### Tarefa 2.4: Módulo de Marketplace

**Produtos:**
- `GET /api/products` — Catálogo público (paginado, com filtros: category, price_range, search, sort)
- `GET /api/products/:slug` — Detalhe do produto
- `GET /api/products/featured` — Produtos em destaque
- `GET /api/products/categories` — Categorias com contagem

**Carrinho:**
- `GET /api/cart` — Carrinho do usuário
- `POST /api/cart/items` — Adicionar item (product_id, quantity, project_id opcional)
- `PATCH /api/cart/items/:id` — Atualizar quantidade
- `DELETE /api/cart/items/:id` — Remover item
- `DELETE /api/cart` — Limpar carrinho

**Pedidos:**
- `POST /api/orders` — Criar pedido a partir do carrinho
- `GET /api/orders` — Histórico de pedidos do usuário
- `GET /api/orders/:id` — Detalhe do pedido
- `PATCH /api/orders/:id/cancel` — Cancelar pedido

**Pagamento:**
- `POST /api/payments/create` — Criar pagamento (Stripe/Pix/Boleto)
- `POST /api/payments/webhook` — Webhook de confirmação
- `GET /api/payments/:id/status` — Status do pagamento

**Frete:**
- `POST /api/shipping/calculate` — Calcular frete (CEP + itens)
- `GET /api/shipping/options` — Opções disponíveis

**Reviews:**
- `GET /api/products/:id/reviews` — Reviews do produto
- `POST /api/products/:id/reviews` — Criar review (após entrega)
- `GET /api/reviews/pending` — Reviews pendentes (admin)

**Favoritos:**
- `POST /api/favorites/:productId` — Toggle favorito
- `GET /api/favorites` — Lista de favoritos

**Busca:**
- `GET /api/search` — Busca global (produtos + categorias)
- `GET /api/search/suggestions` — Sugestões de busca

### Tarefa 2.5: Módulo de Admin

- `GET /api/admin/dashboard` — KPIs: projetos, aprovados, em produção, custo total, tokens, vendas
- `GET /api/admin/projects` — Todos os projetos (filtros, paginação)
- `GET /api/admin/orders` — Todos os pedidos
- `PATCH /api/admin/orders/:id/status` — Atualizar status do pedido
- `GET /api/admin/products` — Gerenciar produtos
- `POST /api/admin/products` — Criar produto
- `PATCH /api/admin/products/:id` — Editar produto
- `DELETE /api/admin/products/:id` — Desativar produto
- `GET /api/admin/categories` — Gerenciar categorias
- `POST /api/admin/categories` — Criar categoria
- `GET /api/admin/stats` — Estatísticas avançadas
- `GET /api/admin/logs` — Logs do sistema
- `GET /api/admin/coupons` — Gerenciar cupons
- `POST /api/admin/coupons` — Criar cupom

### Tarefa 2.6: Módulo de Notificações

- Sistema de e-mails transacionais (React Email + Resend/Nodemailer):
  - Boas-vindas (cadastro)
  - Arte gerada (notificação)
  - Pedido confirmado
  - Pagamento aprovado
  - Pedido enviado (com rastreio)
  - Pedido entregue
  - Review pendente
- Bots de notificação:
  - WhatsApp (via API Evolution/Z-API)
  - Telegram (bot simples)
- Preferências de notificação do usuário

### Tarefa 2.7: Fila de Jobs (BullMQ + Redis)

- `generate_mockups` — Gerar mockups para todos os tipos de produto
- `send_email` — Enviar e-mails transacionais
- `notify_production` — Notificar equipe de produção
- `process_payment` — Processar pagamento assíncrono
- `generate_report` — Gerar relatórios
- `cleanup_expired` — Limpar dados expirados
- Retry com exponential backoff (max 3 tentativas)
- Dashboard de monitoramento de jobs

---

## ETAPA 3 — Providers de IA

### Tarefa 3.1: Interface abstrata
```typescript
interface AIProvider {
  slug: string;
  label: string;
  supportsChat: boolean;
  supportsImage: boolean;
  
  chat(messages: Message[], model: string, options?: ChatOptions): Promise<ChatResponse>;
  generateImage(prompt: string, model: string, options?: ImageOptions): Promise<ImageResponse>;
  validateKey(apiKey: string): Promise<boolean>;
  estimateCost(model: string, type: 'chat' | 'image'): number;
}
```

### Tarefa 3.2: Implementar providers
- **OpenAI**: GPT-4o chat + DALL-E 3 images
- **Gemini**: Gemini 1.5 Pro chat + Imagen 3 images
- **Fal.ai**: Flux Dev/Schnell/Realism images (sem chat)
- **Replicate**: Flux 1.1 Pro/SDXL images (sem chat, polling)
- **OmniRoute**: Gateway unificado (Claude/GPT/Gemini/Mistral chat + DALL-E/Flux images)
- **Stability AI**: Stable Diffusion 3/SDXL images

### Tarefa 3.3: Sistema de fallback
- Se provider principal falhar → tentar próximo na fila
- Configuração por variável de ambiente
- Rate limit por provider
- Cache de respostas de chat (Redis, 5min TTL)
- Cost tracking por provider/modelo

---

## ETAPA 4 — Engine de Mockups

### Tarefa 4.1: Mockup engine local
- Usar **Sharp** + **canvas** (node-canvas) para composite
- Templates PNG para cada produto (10 tipos × 6 views = 60 templates)
- Positioning maps (percentuais) por tipo de produto
- Suporte a cores do produto (overlay/multiply blend)
- Output: PNG 2000x2000 para web

### Tarefa 4.2: Produtos suportados
| Produto | Views | Preço Base |
|---|---|---|
| Camiseta | front, back, person, isolated | R$ 49,90 |
| Moletom | front, back, person | R$ 89,90 |
| Caneca | front, isolated, lifestyle | R$ 34,90 |
| Garrafa Térmica | front, isolated, lifestyle | R$ 79,90 |
| Almofada | front, lifestyle | R$ 39,90 |
| Mouse Pad | front, lifestyle | R$ 24,90 |
| Boné | front, person | R$ 39,90 |
| Caderno | front, isolated | R$ 29,90 |
| Tote Bag | front, isolated | R$ 34,90 |
| Poster | front, isolated | R$ 19,90 |

---

## ETAPA 5 — Frontend Designer (Next.js)

### Tarefa 5.1: Layout principal
- Split-panel: Chat (380px lateral esquerda) + Canvas (flex direita)
- Responsivo: stack vertical em mobile (<768px)
- Altura: 80vh, min 600px, max 900px
- Header com avatar da IA, status online, nome do produto

### Tarefa 5.2: Painel de Chat
- Área de mensagens com scroll infinito
- Bolhas de usuário/assistente com timestamps
- Indicador de digitação (3 pontos pulsantes)
- Chips de sugestão rápida (4 opções iniciais)
- Input com auto-resize, botão de upload, botão enviar
- Enter para enviar, Shift+Enter para nova linha
- Preview de upload com thumbnail e botão remover
- Máximo 5 uploads por sessão

### Tarefa 5.3: Painel de Canvas (3 estados)
1. **Vazio:** Instruções com 4 passos (Descreva → IA cria → Veja nos produtos → Aprove e compre)
2. **Gerando:** Spinner grande com "Criando sua arte..."
3. **Resultado com abas:**
   - **Arte:** Viewer grande, botões Regenerar/Baixar/Aprovar
   - **Produtos:** Grid de mockups, loading, checkboxes de produto, "Adicionar ao Carrinho"
   - **Versões:** Grid de todas as versões (clique para trocar)

### Tarefa 5.4: Estados do projeto
- Gerenciar status via React Context/Zustand
- Polling para atualização de status durante geração
- Animações de transição entre estados

### Tarefa 5.5: Design System
- Cores: Primary #7B2FBE, Accent #FF6B00, Success #22C55E, Danger #EF4444
- Border radius: 16px
- Fonte: Inter/system-ui
- Componentes compartilhados via `packages/ui`
- Tema claro escuro (futuro)

---

## ETAPA 6 — Marketplace Frontend (Next.js)

### Tarefa 6.1: Páginas públicas
- **Home:** Hero, categorias, produtos em destaque, como funciona, depoimentos, CTA
- **Catálogo:** Grid de produtos com filtros laterais (categoria, preço, busca, ordenação)
- **Detalhe do produto:** Galeria, preço, opções, avaliações, produtos relacionados, botão "Personalizar com IA"
- **Carrinho:** Lista de itens, resumo, frete, cupom, checkout
- **Checkout:** Endereço, pagamento (Stripe/Pix/Boleto), confirmação
- **Minha conta:** Dashboard, pedidos, projetos, favoritos, configurações

### Tarefa 6.2: Componentes compartilhados
- Header com navegação, busca, carrinho, avatar
- Footer com links, newsletter, redes sociais
- Cards de produto
- Filtros laterais
- Paginação
- Breadcrumbs
- Toast/notificações
- Modal de confirmação
- Loading states (skeleton, spinner)

### Tarefa 6.3: SEO e Performance
- Server-Side Rendering para páginas de catálogo
- Static Generation para páginas estáticas
- Lazy loading de imagens (Next/Image)
- Sitemap dinâmico
- Schema.org/JSON-LD para produtos
- Meta tags Open Graph

---

## ETAPA 7 — Painel Admin (Next.js)

### Tarefa 7.1: Dashboard
- KPIs: total projetos, aprovados, em produção, custo total, tokens, vendas do mês
- Gráficos: projetos por dia (30 dias), provider breakdown, custo por modelo
- Projetos recentes
- Atalhos: fila de produção, configurações

### Tarefa 7.2: Gestão de Projetos
- Lista de todos os projetos com filtros (status, provider, data)
- Detalhe: chat completo, artes, mockups, dados do pedido
- Ações: aprovar, rejeitar, iniciar produção, concluir, cancelar

### Tarefa 7.3: Gestão de Produção
- Fila com cards: arte aprovada, mockups, dados do cliente, prompt
- Workflow: Aguardando → Em Produção → Concluído / Cancelado
- Filtros por status
- Paginação

### Tarefa 7.4: Gestão de Marketplace
- **Produtos:** CRUD completo, upload de imagens, ativar/desativar
- **Categorias:** CRUD, ordenação, ícones
- **Pedidos:** Lista, detalhes, atualizar status, rastreio
- **Financeiro:** Resumo de vendas, pedidos pendentes, relatório básico
- **Reviews:** Aprovar/rejeitar reviews
- **Cupons:** CRUD de cupons de desconto
- **Clientes:** Lista de usuários, detalhes, histórico

### Tarefa 7.5: Configurações
- **Providers:** Chaves API, validação, provider padrão chat/imagem
- **Geral:** Moeda, idioma, upload limits, email de produção
- **Prompt do Sistema:** Textarea para system prompt do chat
- **Mockups:** Ativar/desativar, provider (local/API)
- **Marketplace:** Configurações de frete, pagamento, impostos
- **Notificações:** Configurar e-mails e bots

### Tarefa 7.6: Estatísticas
- Custo total, custo médio por arte, tempo médio de geração
- Tokens consumidos por modelo
- Projetos por provider
- Vendas por período
- Produtos mais vendidos

---

## ETAPA 8 — Autenticação e Segurança

### Tarefa 8.1: Auth
- JWT com access token (15min) + refresh token (7d)
- Senhas com bcrypt (12 rounds)
- Rate limiting: 100 req/min (API), 10 req/min (auth)
- CSRF protection
- Helmet headers
- Input validation com class-validator + Zod

### Tarefa 8.2: Autorização
- Roles: `customer`, `producer`, `admin`
- Guards por rota
- Owner check (usuário só vê seus próprios projetos/pedidos)
- Admin pode ver tudo

---

## ETAPA 9 — Deploy e Infraestrutura

### Tarefa 9.1: Docker
```yaml
services:
  api:        # NestJS (port 3001)
  web:        # Next.js frontend (port 3000)
  admin:      # Next.js admin (port 3002)
  postgres:   # PostgreSQL 16 (port 5432)
  redis:      # Redis 7 (port 6379)
  minio:      # S3 local para uploads (port 9000)
  worker:     # BullMQ worker para jobs assíncronos
```

### Tarefa 9.2: Variáveis de ambiente
```env
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/sxdesigner

# Redis
REDIS_URL=redis://redis:6379

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRATION=15m
REFRESH_EXPIRATION=7d

# AI Providers
OPENAI_API_KEY=
GEMINI_API_KEY=
FALAI_API_KEY=
REPLICATE_API_KEY=
OMNIROUTE_API_KEY=
STABILITY_API_KEY=

# Default providers
DEFAULT_CHAT_PROVIDER=openai
DEFAULT_IMAGE_PROVIDER=openai
DEFAULT_CHAT_MODEL=gpt-4o
DEFAULT_IMAGE_MODEL=dall-e-3

# Storage
S3_ENDPOINT=http://minio:9000
S3_BUCKET=sxdesigner
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# App
APP_URL=http://localhost:3000
ADMIN_URL=http://localhost:3002
API_URL=http://localhost:3001

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@sublimitas.com.br

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Currency
CURRENCY=BRL
```

### Tarefa 9.3: Deploy em VPS
- Docker Compose para produção
- Nginx reverse proxy com SSL (Let's Encrypt)
- Health checks
- Backup automático do PostgreSQL
- Logs centralizados (Loki + Grafana opcional)
- Monitoramento básico

---

## ETAPA 10 — Testes

### Tarefa 10.1: Testes unitários
- Services: ChatService, GenerationService, MockupService
- Providers: todos os providers com mocks
- Repositories: CRUD operations
- Utils: formatação, validação

### Tarefa 10.2: Testes de integração
- Fluxo completo: chat → geração → mockup → aprovação → carrinho → pedido
- Auth: registro, login, refresh, proteção de rotas
- Webhook de pagamento

### Tarefa 10.3: Testes E2E
- Playwright: fluxo completo do designer
- Playwright: fluxo de compra no marketplace
- Playwright: painel admin

---

## ETAPA 11 — Migração de Dados

### Tarefa 11.1: Script de migração
- Ler dados do WordPress (via WP REST API ou direto do MySQL)
- Migrar: usuários, projetos, mensagens, artes, mockups, configurações
- Transformar formato de imagens (WP media → S3/MinIO)
- Validar integridade dos dados migrados

---

## Ordem de Execução Recomendada

1. **Etapa 0** (Setup) → 2 dias
2. **Etapa 1** (Database) → 2 dias
3. **Etapa 2.1-2.2** (API Base + Auth) → 3 dias
4. **Etapa 3** (Providers IA) → 4 dias
5. **Etapa 4** (Mockups) → 3 dias
6. **Etapa 2.3** (API Designer) → 4 dias
7. **Etapa 5** (Frontend Designer) → 5 dias
8. **Etapa 2.4** (API Marketplace) → 4 dias
9. **Etapa 6** (Frontend Marketplace) → 5 dias
10. **Etapa 2.5-2.7** (API Admin + Notificações + Jobs) → 4 dias
11. **Etapa 7** (Painel Admin) → 5 dias
12. **Etapa 8** (Segurança) → 2 dias
13. **Etapa 9** (Docker + Deploy) → 3 dias
14. **Etapa 10** (Testes) → 4 dias
15. **Etapa 11** (Migração) → 2 dias

**Total estimado: ~52 dias de desenvolvimento**
