const express = require('express');
const { query } = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// =============================================
// GET /api/products — Catálogo público
// =============================================
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = ['p.is_active = TRUE'];
    let params = [];

    if (category) {
      where.push('c.slug = ?');
      params.push(category);
    }

    if (search) {
      where.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'p.base_price ASC';
    if (sort === 'price_desc') orderBy = 'p.base_price DESC';
    if (sort === 'name') orderBy = 'p.name ASC';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause}`,
      params
    );

    const products = await query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Parse JSON fields
    products.forEach(p => {
      if (p.images && typeof p.images === 'string') {
        try { p.images = JSON.parse(p.images); } catch { p.images = []; }
      }
      if (p.specs && typeof p.specs === 'string') {
        try { p.specs = JSON.parse(p.specs); } catch { p.specs = {}; }
      }
    });

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Erro ao listar produtos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// GET /api/products/featured — Produtos em destaque
// =============================================
router.get('/featured', async (req, res) => {
  try {
    const products = await query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = TRUE AND p.is_featured = TRUE
       ORDER BY p.created_at DESC
       LIMIT 8`
    );

    products.forEach(p => {
      if (p.images && typeof p.images === 'string') {
        try { p.images = JSON.parse(p.images); } catch { p.images = []; }
      }
    });

    res.json({ products });
  } catch (err) {
    console.error('Erro ao buscar destaque:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// GET /api/products/search — Busca
// =============================================
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ products: [], categories: [] });
    }

    const term = `%${q}%`;

    const products = await query(
      `SELECT p.id, p.name, p.slug, p.base_price, p.images, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = TRUE AND (p.name LIKE ? OR p.description LIKE ?)
       ORDER BY p.name ASC
       LIMIT 10`,
      [term, term]
    );

    const categories = await query(
      `SELECT id, name, slug, icon
       FROM categories
       WHERE is_active = TRUE AND (name LIKE ? OR description LIKE ?)
       LIMIT 5`,
      [term, term]
    );

    products.forEach(p => {
      if (p.images && typeof p.images === 'string') {
        try { p.images = JSON.parse(p.images); } catch { p.images = []; }
      }
    });

    res.json({ products, categories });
  } catch (err) {
    console.error('Erro na busca:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// GET /api/products/:slug — Detalhe do produto
// =============================================
router.get('/:slug', async (req, res) => {
  try {
    const products = await query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? AND p.is_active = TRUE`,
      [req.params.slug]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const product = products[0];
    if (product.images && typeof product.images === 'string') {
      try { product.images = JSON.parse(product.images); } catch { product.images = []; }
    }
    if (product.specs && typeof product.specs === 'string') {
      try { product.specs = JSON.parse(product.specs); } catch { product.specs = {}; }
    }

    // Customizações
    const customizations = await query(
      'SELECT * FROM customizations WHERE product_id = ? ORDER BY sort_order',
      [product.id]
    );

    // Reviews
    const reviews = await query(
      `SELECT r.*, u.name as user_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? AND r.is_approved = TRUE
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [product.id]
    );

    // Produtos relacionados
    const related = await query(
      `SELECT p.id, p.name, p.slug, p.base_price, p.images
       FROM products p
       WHERE p.category_id = ? AND p.id != ? AND p.is_active = TRUE
       LIMIT 4`,
      [product.category_id, product.id]
    );

    related.forEach(p => {
      if (p.images && typeof p.images === 'string') {
        try { p.images = JSON.parse(p.images); } catch { p.images = []; }
      }
    });

    res.json({ product, customizations, reviews, related });
  } catch (err) {
    console.error('Erro ao buscar produto:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
