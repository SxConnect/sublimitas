const jwt = require('jsonwebtoken');

// =============================================
// JWT Secret — centralized, env-only
// =============================================
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: JWT_SECRET não definido. Recusando inicialização em produção.');
      process.exit(1);
    }
    console.warn('AVISO: JWT_SECRET não definido. Usando fallback inseguro apenas para desenvolvimento.');
    return 'dev-fallback-secret-do-not-use-in-production';
  }
  return secret;
}

const JWT_SECRET = getJWTSecret();
const JWT_EXPIRES_IN = '7d';

// =============================================
// Cookie Options — centralized
// =============================================
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    path: '/'
  };
}

// =============================================
// Generate Token
// =============================================
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// =============================================
// Auth Middleware — verificar token
// =============================================
function authenticate(req, res, next) {
  // Tentar Bearer header primeiro
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Fallback para cookie
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// =============================================
// Admin Middleware — verificar role admin
// =============================================
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

// =============================================
// Optional Auth — não bloqueia, mas popula req.user se token existir
// =============================================
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Token inválido, continua sem user
    }
  }

  next();
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  getCookieOptions,
  generateToken,
  authenticate,
  requireAdmin,
  optionalAuth
};
