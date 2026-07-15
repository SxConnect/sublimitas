const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// =============================================
// GET /api/cart — Listar carrinho
// =============================================
router.get('/', optionalAuth, async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id;

    if (!sessionId && !req.user) {
      return res.json({ items: [], total: 0 });
    }

    let whereClause;
    let params;

    if (req.user) {
      whereClause = 'ci.user_id = ?';
      params = [req.user.id];
    } else {
      whereClause = 'ci.session_id = ?';
      params = [sessionId];
    }

    const items = await query(
      `SELECT ci.*, p.name, p.slug, p.base_price, p.images, p.stock_quantity,
              c.name as category_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${whereClause}
       ORDER BY ci.created_at DESC`,
      params
    );

    items.forEach(item => {
      if (item.images && typeof item.images === 'string') {
        try { item.images = JSON.parse(item.images); } catch { item.images = []; }
      }
      if (item.customizations && typeof item.customizations === 'string') {
        try { item.customizations = JSON.parse(item.customizations); } catch { item.customizations = {}; }
      }
    });

    const total = items.reduce((sum, item) => {
      return sum + (parseFloat(item.base_price) * item.quantity);
    }, 0);

    res.json({ items, total: parseFloat(total.toFixed(2)) });
  } catch (err) {
    console.error('Erro ao listar carrinho:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// POST /api/cart/items — Adicionar item
// =============================================
router.post('/items', optionalAuth, async (req, res) => {
  try {
    const { product_id, quantity = 1, customizations } = req.body;
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id || uuidv4();

    if (!product_id) {
      return res.status(400).json({ error: 'product_id é obrigatório' });
    }

    // Verificar produto
    const products = await query('SELECT * FROM products WHERE id = ? AND is_active = TRUE', [product_id]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const product = products[0];
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Estoque insuficiente' });
    }

    // Verificar se já existe no carrinho
    let existingWhere;
    let existingParams;

    if (req.user) {
      existingWhere = 'user_id = ? AND product_id = ?';
      existingParams = [req.user.id, product_id];
    } else {
      existingWhere = 'session_id = ? AND product_id = ?';
      existingParams = [sessionId, product_id];
    }

    const existing = await query(
      `SELECT * FROM cart_items WHERE ${existingWhere}`,
      existingParams
    );

    if (existing.length > 0) {
      const newQty = existing[0].quantity + quantity;
      if (newQty > product.stock_quantity) {
        return res.status(400).json({ error: 'Estoque insuficiente' });
      }
      await query('UPDATE cart_items SET quantity = ?, customizations = ? WHERE id = ?',
        [newQty, customizations ? JSON.stringify(customizations) : existing[0].customizations, existing[0].id]);
    } else {
      await query(
        'INSERT INTO cart_items (session_id, user_id, product_id, quantity, customizations) VALUES (?, ?, ?, ?, ?)',
        [
          sessionId,
          req.user ? req.user.id : null,
          product_id,
          quantity,
          customizations ? JSON.stringify(customizations) : null
        ]
      );
    }

    // Retornar carrinho atualizado
    let whereClause;
    let params;
    if (req.user) {
      whereClause = 'ci.user_id = ?';
      params = [req.user.id];
    } else {
      whereClause = 'ci.session_id = ?';
      params = [sessionId];
    }

    const items = await query(
      `SELECT ci.*, p.name, p.base_price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ${whereClause}`,
      params
    );

    const total = items.reduce((sum, item) => sum + (parseFloat(item.base_price) * item.quantity), 0);

    res.json({ items, total: parseFloat(total.toFixed(2)), session_id: sessionId });
  } catch (err) {
    console.error('Erro ao adicionar ao carrinho:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// PATCH /api/cart/items/:id — Atualizar quantidade
// =============================================
router.patch('/items/:id', optionalAuth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const itemId = req.params.id;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantidade inválida' });
    }

    // Verificar item
    const items = await query(
      `SELECT ci.*, p.stock_quantity FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = ?`,
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    if (quantity > items[0].stock_quantity) {
      return res.status(400).json({ error: 'Estoque insuficiente' });
    }

    await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, itemId]);

    res.json({ message: 'Quantidade atualizada' });
  } catch (err) {
    console.error('Erro ao atualizar carrinho:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// DELETE /api/cart/items/:id — Remover item
// =============================================
router.delete('/items/:id', optionalAuth, async (req, res) => {
  try {
    await query('DELETE FROM cart_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Item removido' });
  } catch (err) {
    console.error('Erro ao remover item:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// DELETE /api/cart — Limpar carrinho
// =============================================
router.delete('/', optionalAuth, async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.session_id;

    if (req.user) {
      await query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    } else if (sessionId) {
      await query('DELETE FROM cart_items WHERE session_id = ?', [sessionId]);
    }

    res.json({ message: 'Carrinho limpo' });
  } catch (err) {
    console.error('Erro ao limpar carrinho:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
