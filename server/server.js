require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// CORS — whitelist via ALLOWED_ORIGINS
// =============================================
function getAllowedOrigins() {
  const origins = process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://127.0.0.1:8080';
  return origins.split(',').map(o => o.trim());
}

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sem origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowed = getAllowedOrigins();
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin não permitida'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
}));

// =============================================
// Rate Limiting
// =============================================
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: 'Muitas tentativas. Tente novamente em instantes.',
  standardHeaders: true,
  legacyHeaders: false
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Muitas requisições. Tente novamente em instantes.',
  standardHeaders: true,
  legacyHeaders: false
});

// =============================================
// Middleware
// =============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// =============================================
// Rotas da API
// =============================================
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const categoriesRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

// Login com rate limiting
app.use('/api/auth/login', loginLimiter);

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Rotas públicas
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);

// Rotas admin com rate limiting
app.use('/api/admin', adminLimiter, adminRoutes);

// =============================================
// Configurações públicas (para o frontend)
// =============================================
app.get('/api/settings/public', async (req, res) => {
  try {
    const { query } = require('./config/db');
    const settings = await query(
      "SELECT setting_key, setting_value FROM settings WHERE category IN ('general', 'design', 'contact', 'social', 'support', 'ai', 'sections')"
    );

    const publicSettings = {};
    settings.forEach(s => {
      if (s.setting_key !== 'ai_api_key') {
        publicSettings[s.setting_key] = s.setting_value;
      }
    });

    res.json(publicSettings);
  } catch (err) {
    res.json({});
  }
});

// =============================================
// Página do parceiro
// =============================================
app.get('/parceiro/:slug', async (req, res) => {
  try {
    const { query } = require('./config/db');
    const partners = await query('SELECT * FROM partners WHERE slug = ? AND is_active = TRUE', [req.params.slug]);
    if (partners.length === 0) {
      return res.status(404).send('Parceiro não encontrado');
    }
    res.sendFile(path.join(__dirname, '../public/parceiro.html'));
  } catch (err) {
    res.status(404).send('Parceiro não encontrado');
  }
});

// =============================================
// SPA fallback — servir index.html para rotas HTML
// =============================================
const htmlPages = ['produtos', 'produto', 'categorias', 'como-funciona', 'sobre', 'contato', 'faq', 'criar-com-ia', 'login', 'cadastro', 'rastrear', 'meus-pedidos', 'admin', 'carrinho'];
htmlPages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `../public/${page}.html`));
  });
  app.get(`/${page}.html`, (req, res) => {
    res.sendFile(path.join(__dirname, `../public/${page}.html`));
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// =============================================
// 404 handler
// =============================================
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Rota não encontrada' });
  }
  res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
});

// =============================================
// Error handler
// =============================================
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// =============================================
// Iniciar servidor
// =============================================
async function start() {
  const dbOk = await testConnection();

  if (!dbOk) {
    console.warn('⚠️  MySQL indisponível. Servidor iniciando em modo offline (funcionalidade limitada).');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  MySQL: ${dbOk ? 'Conectado' : 'Indisponível (modo offline)'}`);
  });
}

start();
