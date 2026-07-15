const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas admin requerem autenticação + role admin
router.use(authenticate, requireAdmin);

// =============================================
// GET /api/admin/dashboard — KPIs
// =============================================
router.get('/dashboard', async (req, res) => {
  try {
    const [totalProducts] = await query('SELECT COUNT(*) as count FROM products');
    const [totalOrders] = await query('SELECT COUNT(*) as count FROM orders');
    const [pendingOrders] = await query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
    const [totalUsers] = await query("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");
    const [totalRevenue] = await query("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered')");
    const [monthlyRevenue] = await query(
      "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered') AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
    );
    const recentOrders = await query(
      `SELECT o.*, u.name as customer_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 5`
    );
    const products = await query('SELECT COUNT(*) as count FROM products');
    const categories = await query('SELECT COUNT(*) as count FROM categories');
    const reviews = await query('SELECT COUNT(*) as count FROM reviews');
    const partners = await query('SELECT COUNT(*) as count FROM partners');

    res.json({
      dashboard: {
        totalProducts: totalProducts[0].count,
        totalOrders: totalOrders[0].count,
        pendingOrders: pendingOrders[0].count,
        totalUsers: totalUsers[0].count,
        totalRevenue: parseFloat(totalRevenue[0].total),
        monthlyRevenue: parseFloat(monthlyRevenue[0].total),
        totalCategories: categories[0].count,
        totalReviews: reviews[0].count,
        totalPartners: partners[0].count,
        recentOrders
      }
    });
  } catch (err) {
    console.error('Erro no dashboard:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// GET /api/admin/orders — Todos os pedidos
// =============================================
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = [];
    let params = [];

    if (status) {
      where.push('o.status = ?');
      params.push(status);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const orders = await query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      params
    );

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// PATCH /api/admin/orders/:id/status — Atualizar status
// =============================================
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, note, tracking_code } = req.body;
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    await query(
      'UPDATE orders SET status = ?, tracking_code = COALESCE(?, tracking_code) WHERE id = ?',
      [status, tracking_code, req.params.id]
    );

    await query(
      'INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?, ?, ?, ?)',
      [req.params.id, status, note || null, req.user.id]
    );

    res.json({ message: 'Status atualizado' });
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// CRUD Produtos (Admin)
// =============================================
router.get('/products', async (req, res) => {
  try {
    const products = await query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.created_at DESC`
    );
    products.forEach(p => {
      if (p.images && typeof p.images === 'string') {
        try { p.images = JSON.parse(p.images); } catch { p.images = []; }
      }
    });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { name, slug, description, short_description, base_price, category_id, product_type, stock_quantity, images, specs, is_active, is_featured } = req.body;

    if (!name || !slug || !base_price) {
      return res.status(400).json({ error: 'Nome, slug e preço são obrigatórios' });
    }

    const result = await query(
      `INSERT INTO products (name, slug, description, short_description, base_price, category_id, product_type, stock_quantity, images, specs, is_active, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, description, short_description, base_price, category_id || null, product_type || 'physical', stock_quantity || 0, JSON.stringify(images || []), JSON.stringify(specs || {}), is_active !== false, is_featured || false]
    );

    res.status(201).json({ message: 'Produto criado', id: result.insertId });
  } catch (err) {
    console.error('Erro ao criar produto:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { name, slug, description, short_description, base_price, category_id, product_type, stock_quantity, images, specs, is_active, is_featured } = req.body;

    await query(
      `UPDATE products SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        short_description = COALESCE(?, short_description),
        base_price = COALESCE(?, base_price),
        category_id = COALESCE(?, category_id),
        product_type = COALESCE(?, product_type),
        stock_quantity = COALESCE(?, stock_quantity),
        images = COALESCE(?, images),
        specs = COALESCE(?, specs),
        is_active = COALESCE(?, is_active),
        is_featured = COALESCE(?, is_featured)
       WHERE id = ?`,
      [name, slug, description, short_description, base_price, category_id, product_type, stock_quantity, images ? JSON.stringify(images) : null, specs ? JSON.stringify(specs) : null, is_active, is_featured, req.params.id]
    );

    res.json({ message: 'Produto atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await query('UPDATE products SET is_active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Produto desativado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// CRUD Categorias (Admin)
// =============================================
router.get('/categories', async (req, res) => {
  try {
    const categories = await query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, slug, description, icon, parent_id, sort_order } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Nome e slug são obrigatórios' });
    }

    const result = await query(
      'INSERT INTO categories (name, slug, description, icon, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [name, slug, description, icon, parent_id || null, sort_order || 0]
    );

    res.status(201).json({ message: 'Categoria criada', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { name, slug, description, icon, sort_order, is_active } = req.body;

    await query(
      'UPDATE categories SET name = COALESCE(?, name), slug = COALESCE(?, slug), description = COALESCE(?, description), icon = COALESCE(?, icon), sort_order = COALESCE(?, sort_order), is_active = COALESCE(?, is_active) WHERE id = ?',
      [name, slug, description, icon, sort_order, is_active, req.params.id]
    );

    res.json({ message: 'Categoria atualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// CRUD Reviews (Admin)
// =============================================
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await query(
      `SELECT r.*, u.name as user_name, p.name as product_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       ORDER BY r.created_at DESC`
    );
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/reviews/:id/approve', async (req, res) => {
  try {
    await query('UPDATE reviews SET is_approved = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Review aprovado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// CRUD Parceiros (Admin)
// =============================================
router.get('/partners', async (req, res) => {
  try {
    const partners = await query('SELECT * FROM partners ORDER BY created_at DESC');
    res.json({ partners });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/partners', async (req, res) => {
  try {
    const { slug, company_name, owner_name, email, phone, logo_url, banner_url, primary_color, description, whatsapp_message } = req.body;

    if (!slug || !company_name) {
      return res.status(400).json({ error: 'Slug e nome da empresa são obrigatórios' });
    }

    const result = await query(
      `INSERT INTO partners (slug, company_name, owner_name, email, phone, logo_url, banner_url, primary_color, description, whatsapp_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, company_name, owner_name, email, phone, logo_url, banner_url, primary_color || '#7B2FBE', description, whatsapp_message]
    );

    res.status(201).json({ message: 'Parceiro criado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/partners/:id', async (req, res) => {
  try {
    const { slug, company_name, owner_name, email, phone, logo_url, banner_url, primary_color, description, whatsapp_message, is_active } = req.body;

    await query(
      `UPDATE partners SET
        slug = COALESCE(?, slug),
        company_name = COALESCE(?, company_name),
        owner_name = COALESCE(?, owner_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        logo_url = COALESCE(?, logo_url),
        banner_url = COALESCE(?, banner_url),
        primary_color = COALESCE(?, primary_color),
        description = COALESCE(?, description),
        whatsapp_message = COALESCE(?, whatsapp_message),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [slug, company_name, owner_name, email, phone, logo_url, banner_url, primary_color, description, whatsapp_message, is_active, req.params.id]
    );

    res.json({ message: 'Parceiro atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/partners/:id', async (req, res) => {
  try {
    await query('DELETE FROM partners WHERE id = ?', [req.params.id]);
    res.json({ message: 'Parceiro removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// CRUD Empresas que Confiam (Admin)
// =============================================
router.get('/trust-companies', async (req, res) => {
  try {
    const companies = await query('SELECT * FROM trust_companies ORDER BY sort_order ASC');
    res.json({ companies });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/trust-companies', async (req, res) => {
  try {
    const { name, logo_url, website_url, sort_order } = req.body;
    const result = await query(
      'INSERT INTO trust_companies (name, logo_url, website_url, sort_order) VALUES (?, ?, ?, ?)',
      [name, logo_url, website_url, sort_order || 0]
    );
    res.status(201).json({ message: 'Empresa adicionada', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/trust-companies/:id', async (req, res) => {
  try {
    const { name, logo_url, website_url, sort_order, is_active } = req.body;
    await query(
      'UPDATE trust_companies SET name = COALESCE(?, name), logo_url = COALESCE(?, logo_url), website_url = COALESCE(?, website_url), sort_order = COALESCE(?, sort_order), is_active = COALESCE(?, is_active) WHERE id = ?',
      [name, logo_url, website_url, sort_order, is_active, req.params.id]
    );
    res.json({ message: 'Empresa atualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/trust-companies/:id', async (req, res) => {
  try {
    await query('DELETE FROM trust_companies WHERE id = ?', [req.params.id]);
    res.json({ message: 'Empresa removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// Configurações (Admin)
// =============================================
router.get('/settings', async (req, res) => {
  try {
    const settings = await query('SELECT * FROM settings ORDER BY category, setting_key');
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'Formato inválido' });
    }

    for (const s of settings) {
      await query(
        'INSERT INTO settings (setting_key, setting_value, setting_type, category) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [s.key, s.value, s.type || 'string', s.category || 'general']
      );
    }

    res.json({ message: 'Configurações salvas' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// Clientes (Admin)
// =============================================
router.get('/users', async (req, res) => {
  try {
    const users = await query(
      "SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// Log de Atividades (Admin)
// =============================================
router.get('/logs', async (req, res) => {
  try {
    const logs = await query(
      `SELECT al.*, u.name as user_name
       FROM activity_log al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
