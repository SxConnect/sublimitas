# Prompt para reconstruir o SX AI Designer fora do WordPress e adicionar marketplace

Contexto:
- O sistema atual é um plugin WordPress/WooCommerce e NÃO pode ser mantido como plugin.
- Queremos migrar para uma aplicação web standalone, sem WordPress, usando tecnologias modernas escolhidas pelo assistente (ex.: Laravel, Node, Next.js, Nest, etc.), mas preservando os comportamentos existentes.
- Queremos também criar um marketplace para vender os designs/produtos ligados ao designer.

Analise estes arquivos como referência e use como base de comportamento:
- readme.txt
- src/Core/Plugin.php
- src/Core/Installer.php
- src/Api/*.php
- src/Models/*.php
- src/Repositories/*.php
- src/Services/*.php
- src/Providers/*.php
- src/Queue/*.php
- src/WooCommerce/*.php
- src/Elementor/*.php
- assets/css/*, assets/js/*
- templates/frontend/*
- templates/admin/*

Objetivos do prompt:

1) Definir stack sugerida e justificada para app standalone:
- API/backend robusto
- banco relacional
- fila/jobs assíncronos
- painel admin/production
- frontend designer
- autenticação
- armazenamento de imagens/artes/mockups

2) Reproduzir funcionalidades fieis do zip analisado:
- Chat conversacional com IA para entender a necessidade do usuário
- Geração de artes por provider multi-modelo: OpenAI, Google Gemini + Imagen, Fal.ai, Replicate, Stability AI, OmniRoute
- Mockups automáticos para: camiseta, caneca, garrafa, almofada, mouse pad, moletom, uniforme empresarial
- Histórico de versões/artes
- Seleção de produto/serviço da Sublimitas ligada ao gerador
- Carrinho, checkout e pedidos
- Painel de produção: projetos aprovados, arte aprovada, mockups, detalhes, status
- Integrações não-WordPress: bots de notificação, e-mails transacionais
- Fila de processamento e status de jobs
- Opção de upload de referências pelo cliente

3) Criar marketplace junto:
- vitrine pública do designer/produto
- catálogo de produtos para personalizar
- carrinho + checkout + pedidos
- painel admin do marketplace: produtos, estoque, vendas, pedidos, financeiro básico
- área do cliente: projetos, pedidos, downloads
- área do produtor/designer: upload, edição, aprovação/rejeição
- avaliações/reviews
- sistema de busca e filtros por categoria/tema
- integração de pagamentos
- gestão de fretes/preços personalizados por produto

4) Restrições e regras:
- Não reconstruir como plugin WordPress.
- Deixar em português-BR no código e na interface.
- Permitir trocar provedor de IA por configuração/env.
- Fornecer estrutura pronta para deploy em VPS com Docker.
- Incluir estrutura de testes básicos e logs.
- Manter a estética/navegação alinhada ao site Sublimitas já analisado.

Entregue o resultado como:
1) Prompt estruturado em etapas/tarefas para IA de engenharia
2) Plano arquitetural em markdown com pastas/modulos principais
3) Prompt final copy-paste para iniciar o desenvolvimento

Formato final claro, com prompts separados por contexto e fácil de usar.
