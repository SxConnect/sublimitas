# PROMPT FINAL — Iniciar Desenvolvimento SX AI Designer Standalone + Marketplace

> **Cole este prompt em uma sessão nova de IA de engenharia (Claude, GPT-4, Cursor, etc.) para iniciar o desenvolvimento.**

---

## CONTEXTO

Você é um engenheiro sênior full-stack. Vai construir do zero uma aplicação web standalone chamada **SX AI Designer** — um sistema de design gráfico com IA que permite aos clientes descreverem o que querem via chat conversacional, gerar artes com IA, visualizar em mockups de produtos, aprovar e comprar. Additionally, há um **marketplace** integrado para venda de produtos personalizados.

**NÃO é plugin WordPress.** É aplicação web standalone.

**Idioma:** Português-BR em todo o código e interface.

**Stack escolhida:**
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + Zustand
- **Admin:** Next.js 14 (App Router) + Tailwind CSS
- **API:** NestJS + Prisma + PostgreSQL + Redis + BullMQ
- **Storage:** MinIO (S3 compatível)
- **Deploy:** Docker Compose

---

## FUNCIONALIDADES PARA IMPLEMENTAR

### 1. AI Designer (Core)

**Chat conversacional:**
- Cliente entra na página do Designer e começa a conversar com a IA
- IA pergunta o que o cliente quer personalizar
- Sugestões rápidas iniciais: "Camiseta empresarial", "Caneca personalizada", "Uniforme de time", "Brindes corporativos"
- Histórico de mensagens salvo no banco
- Últimas 40 mensagens enviadas como contexto
- System prompt configurável no admin (personalidade da IA Sublimitas)
- Upload de imagens de referência pelo cliente (PNG, JPEG, GIF, WEBP, SVG, PDF, máx 10MB, máx 5 arquivos)

**Geração de arte com IA:**
- Multi-provider: OpenAI (DALL-E 3), Google Gemini (Imagen 3), Fal.ai (Flux), Replicate (Flux/SDXL), OmniRoute (gateway), Stability AI
- Provider configurável via variável de ambiente
- Fallback automático se provider falhar
- Enriquecimento automático do prompt (adiciona contexto do produto + "Alta resolução, fundo transparente")
- Versionamento de artes (máx 10 versões por projeto)
- Histórico visual de versões (usuário pode voltar a versões anteriores)
- Download da arte em alta resolução
- Custo estimado por geração rastreado

**Mockups automáticos:**
- 10 tipos de produto: Camiseta, Moletom, Caneca, Garrafa Térmica, Almofada, Mouse Pad, Boné, Caderno, Tote Bag, Poster
- Múltiplas views por produto: front, back, person, isolated, lifestyle, closeup
- Composite automático da arte no mockup
- Edição de posição/escala/cor do produto
- Aprovação individual de mockups

**Fluxo do projeto:**
1. draft → 2. generating → 3. reviewing → 4. approved → 5. in_production → 6. completed (ou cancelled em qualquer etapa)

**Integração com carrinho:**
- Arte aprovada + mockups → adiciona ao carrinho do marketplace
- Dados do projeto salvos como meta do item do carrinho/pedido

### 2. Marketplace

**Catálogo público:**
- Home page com hero, categorias, produtos em destaque, como funciona, depoimentos, CTA
- Página de catálogo com filtros: categoria, faixa de busca, ordenação, paginação
- Detalhe do produto: galeria, preço, especificações, avaliações, "Personalizar com IA"
- Categorias: Canecas, Camisetas, Uniformes, Garrafas, Brindes, Almofadas, Mouse Pads, etc.

**Carrinho e Checkout:**
- Carrinho lateral (drawer) ou página dedicada
- Itens do marketplace + itens personalizados via IA
- Cálculo de frete por CEP
- Cupom de desconto
- Checkout com endereço de entrega
- Pagamento: Stripe (cartão) + Pix + Boleto

**Área do cliente:**
- Dashboard com resumo
- Histórico de pedidos com status
- Lista de projetos do designer
- Favoritos
- Configurações de conta

**Reviews:**
- Avaliação 1-5 estrelas + comentário + imagens
- Só pode avaliar após entrega
- Moderado pelo admin antes de publicar

**Busca:**
- Busca global com autocomplete
- Filtros por categoria, preço, tema
- Sugestões de busca

### 3. Painel Admin

**Dashboard:**
- KPIs: total projetos, aprovados, em produção, custo total, tokens, vendas do mês
- Gráficos: projetos/dia (30 dias), breakdown por provider, custo/modelo
- Atalhos rápidos

**Gestão de Projetos:**
- Lista com filtros (status, provider, data)
- Detalhe: chat completo, artes, mockups, dados do pedido
- Ações: aprovar/rejeitar, iniciar produção, concluir, cancelar

**Gestão de Produção:**
- Fila visual com cards
- Workflow: Aguardando → Em Produção → Concluído / Cancelado

**Gestão do Marketplace:**
- CRUD de produtos (nome, descrição, preço, imagens, specs, estoque)
- CRUD de categorias
- Gestão de pedidos (status, rastreio)
- Resumo financeiro básico
- Aprovação de reviews
- CRUD de cupons
- Lista de clientes

**Configurações:**
- Chaves API dos providers (com validação)
- Provider padrão chat/imagem
- System prompt do designer
- Configurações de mockup
- Configurações de e-mail/notificação
- Configurações de frete/pagamento

**Estatísticas:**
- Custo total, custo médio/art, tempo médio geração
- Tokens por modelo
- Projetos por provider
- Vendas por período

### 4. Notificações

- E-mails transacionais: boas-vindas, arte gerada, pedido confirmado, pagamento aprovado, pedido enviado, pedido entregue, review pendente
- WhatsApp bot (opcional, via API)
- Telegram bot (opcional)

### 5. Fila de Jobs (BullMQ)

- `generate_mockups` — Gerar mockups async após arte
- `send_email` — Enviar e-mails
- `notify_production` — Notificar equipe
- `process_payment` — Pagamento assíncrono
- Retry com exponential backoff (max 3)
- Cleanup de jobs expirados

---

## ESTRUTURA DO PROJETO

```
sx-designer/
├── apps/
│   ├── web/          # Next.js 14 — Frontend marketplace + designer
│   ├── admin/        # Next.js 14 — Painel admin
│   └── api/          # NestJS — Backend API
├── packages/
│   ├── ui/           # Componentes React compartilhados
│   ├── database/     # Prisma schema + migrations
│   ├── ai/           # Providers de IA (OpenAI, Gemini, Fal, Replicate, OmniRoute, Stability)
│   ├── mockup/       # Engine de mockups (Sharp + Canvas)
│   └── types/        # Tipos TypeScript compartilhados
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── Dockerfile.admin
│   ├── Dockerfile.worker
│   └── nginx/nginx.conf
└── docs/
```

---

## INSTRUÇÕES DE EXECUÇÃO

### Fase 1: Setup + Database (comece aqui)
1. Inicializar monorepo com Turborepo
2. Configurar Docker Compose (PostgreSQL 16, Redis 7, MinIO)
3. Criar schema Prisma completo (todas as tabelas do designer + marketplace)
4. Gerar migrations e seed data
5. Configurar NestJS com módulos base (Config, Prisma, Cache, Auth)

### Fase 2: API do Designer
6. Implementar providers de IA (interface abstrata + 6 providers)
7. Implementar ChatService (conversação, detecção de intenção, history)
8. Implementar GenerationService (geração de arte, versionamento)
9. Implementar MockupService (composite local, 10 produtos, múltiplas views)
10. Implementar ProjectService (CRUD, status flow, aprovação)
11. Implementar fila de jobs (BullMQ)
12. Implementar upload de arquivos

### Fase 3: Frontend do Designer
13. Criar layout split-panel (chat + canvas)
14. Implementar ChatPanel (mensagens, digitação, sugestões, upload)
15. Implementar CanvasPanel (3 estados: vazio, gerando, resultado)
16. Implementar abas: Arte, Produtos (mockups), Versões
17. Integrar com API (chat, geração, mockups, aprovação, carrinho)

### Fase 4: API do Marketplace
18. Implementar CRUD de produtos e categorias
19. Implementar carrinho
20. Implementar pedidos
21. Implementar pagamentos (Stripe)
22. Implementar frete
23. Implementar reviews
24. Implementar busca
25. Implementar favoritos

### Fase 5: Frontend do Marketplace
26. Criar Home page (hero, categorias, destaque, como funciona, depoimentos)
27. Criar páginas de catálogo e detalhe de produto
28. Criar carrinho e checkout
29. Criar área do cliente (pedidos, projetos, favoritos, config)
30. Criar páginas institucionais (sobre, contato, como funciona)

### Fase 6: Painel Admin
31. Criar dashboard com KPIs e gráficos
32. Implementar gestão de projetos
33. Implementar fila de produção
34. Implementar gestão de marketplace (produtos, pedidos, clientes)
35. Implementar configurações (providers, sistema, marketplace)
36. Implementar estatísticas

### Fase 7: Notificações + Infra
37. Implementar e-mails transacionais (React Email + Resend)
38. Configurar deploy Docker para VPS
39. Configurar Nginx reverse proxy
40. Escrever testes básicos (unit + integração)

---

## REGRAS DE NEGÓCIO IMPORTANTES

1. **Preços em BRL (R$)** — formatar como `R$ 49,90`
2. **Provider fallback** — se OpenAI falhar, tentar Gemini → Fal.ai → Replicate
3. **Guest users** — permitir uso sem login (identificado por session ID)
4. **Max 10 versões** de arte por projeto
5. **Max 5 uploads** por sessão
6. **System prompt** — controla personalidade da IA (configurável no admin)
7. **Custo tracking** — rastrear custo USD por geração
8. **HPOS compatible** — design compatível com High-Performance Order Storage (WooCommerce concept, mas adaptado)
9. **Todas as imagens** geradas salvas localmente (não depender de URLs externas)
10. **Fila de jobs** — mockups e e-mails são assíncronos

---

## DESIGN TOKENS

```css
:root {
  --primary: #7B2FBE;        /* Roxo principal */
  --primary-dark: #5A1F8C;   /* Roxo escuro */
  --accent: #FF6B00;         /* Laranja destaque */
  --success: #22C55E;        /* Verde sucesso */
  --danger: #EF4444;         /* Vermelho erro */
  --warning: #FFB800;        /* Amarelo aviso */
  --whatsapp: #25D366;       /* Verde WhatsApp */
  --gray-900: #111827;
  --gray-800: #1F2937;
  --gray-700: #374151;
  --gray-600: #4B5563;
  --gray-500: #6B7280;
  --gray-400: #9CA3AF;
  --gray-200: #E5E7EB;
  --gray-100: #F3F4F6;
  --gray-50: #F9FAFB;
  --radius: 16px;
  --radius-sm: 8px;
  --radius-full: 9999px;
  --font: 'Inter', system-ui, sans-serif;
}
```

---

## COMEÇAR DESENVOLVIMENTO

Inicie pela **Fase 1: Setup + Database**. Crie toda a estrutura do monorepo, Docker Compose, schema Prisma, e módulos base do NestJS. Depois avance para a Fase 2. Entregue cada fase completa antes de avançar para a próxima.
