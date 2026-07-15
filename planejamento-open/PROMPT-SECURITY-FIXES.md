# Prompt para OpenCode — correções de segurança obrigatórias na Sublimitas

Projeto: `/home/silvano/Área de trabalho/SxConnect/Clientes/sublimitas/site-open/`

Corrija **somente os pontos abaixo**, sem reescrever o sistema. Mantenha toda a estrutura atual de rotas, schema e HTMLs.

## 1) JWT / Sessão
- Remover segredo hardcoded. Usar sempre `process.env.JWT_SECRET` e, se não existir, recusar inicialização em produção.
- Em `server/middleware/auth.js`, adicionar cookie com `httpOnly`, `secure` quando `NODE_ENV=production` e `sameSite='strict'`.
- `JWT_SECRET`, `SESSION_SECRET` e afins nunca devem aparecer em exemplos/documentação como valor real. Se existir no `.env.example`, troque por placeholder.

## 2) `.env.example`
- Garantir que não há segredo real no `.env.example`. Tudo deve ser placeholder, exemplo:
  - `JWT_SECRET=seu-secret-aqui`
  - `SESSION_SECRET=seu-session-secret-aqui`
  - `DB_PASSWORD=sua-senha-aqui`
- Adicionar observação curta alertando para gerar segredos novos no `.env` de produção.

## 3) CORS / Cookies
- Fechar `origin` no CORS. Não use `origin: true`.
- Definir origem permitida por `ALLOWED_ORIGINS` (lista separada por vírgula). Em desenvolvimento pode incluir `http://localhost:8080`, `http://127.0.0.1:8080`.
- Cookies não devem ser enviados para origens desconhecidas: `credentials: true` só se a origem for permitida.

## 4) Rate limiting / Brute-force
- Adicionar rate limit em `/api/auth/login` e `/api/admin/*`.
- Limite sugerido: 5 tentativas por IP/minuto p/ login, 20/minuto p/ admin.
- Após bloqueio, retornar `429` com mensagem genérica: `Muitas tentativas. Tente novamente em instantes.`
- Não revelar diferença entre “email não existe” e “senha errada”. Mantenha `'Credenciais inválidas'`.

## Restrições
- Não alterar schema SQL atual.
- Não remover funcionalidades existentes.
- Não criar dependências novas sem necessidade; se precisar, prefira libs leves e comuns.
- Mantenha o código em pt-BR, simples e limpo.

Entregue:
- lista de arquivos alterados
- diff/justificativa final curta
- nota se ainda houver alguma prática insegura não coberta por este prompt
