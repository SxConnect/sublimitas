const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// =============================================
// POST /api/orders — Criar pedido
// =============================================
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      shipping_address,
      billing_address,
      payment_method,
      guest_name,
      guest_email,
      guest_phone,
      notes
    } = req.body;

    if (!shipping_address) {
      return res.status(400).json({ error: 'Endereço de entrega é obrigatório' });
    }

    // Buscar itens do carrinho
    let cartWhere;
    let cartParams;

    if (req.user) {
      cartWhere = 'ci.user_id = ?';
      cartParams = [req.user.id];
    } else {
      const sessionId = req.headers['x-session-id'] || req.cookies?.session_id;
      if (!sessionId) {
        return res.status(400).json({ error: 'Carrinho vazio' });
      }
      cartWhere = 'ci.session_id = ?';
      cartParams = [sessionId];
    }

    const cartItems = await query(
      `SELECT ci.*, p.name, p.base_price, p.images, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ${cartWhere}`,
      cartParams
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }

    // Verificar estoque
    for (const item of cartItems) {
      if (item.quantity > item.stock_quantity) {
        return res.status(400).json({ error: `Estoque insuficiente para ${item.name}` });
      }
    }

    // Calcular total
    const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.base_price) * item.quantity), 0);
    const total = parseFloat(subtotal.toFixed(2));

    // Gerar código do pedido
    const orderCode = `SLT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Criar pedido
    const orderResult = await query(
      `INSERT INTO orders (order_code, user_id, status, total, shipping_address, billing_address, payment_method, notes, guest_name, guest_email, guest_phone)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderCode,
        req.user ? req.user.id : null,
        total,
        JSON.stringify(shipping_address),
        billing_address ? JSON.stringify(billing_address) : null,
        payment_method || 'pix',
        notes || null,
        guest_name || null,
        guest_email || null,
        guest_phone || null
      ]
    );

    const orderId = orderResult.insertId;

    // Criar itens do pedido
    for (const item of cartItems) {
      await query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, customizations, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.name,
          item.quantity,
          item.base_price,
          item.customizations,
          item.images && Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null
        ]
      );

      // Atualizar estoque
      await query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product_id]);

      // Registrar histórico
      await query(
        'INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)',
        [orderId, 'pending', 'Pedido criado']
      );
    }

    // Limpar carrinho
    if (req.user) {
      await query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    } else {
      const sessionId = req.headers['x-session-id'] || req.cookies?.session_id;
      if (sessionId) {
        await query('DELETE FROM cart_items WHERE session_id = ?', [sessionId]);
      }
    }

    res.status(201).json({
      message: 'Pedido criado com sucesso',
      order: {
        id: orderId,
        order_code: orderCode,
        status: 'pending',
        total,
        items: cartItems.length
      }
    });
  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// GET /api/orders — Histórico de pedidos
// =============================================
router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await query(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ orders });
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// GET /api/orders/track/:code — Rastrear pedido (público)
// =============================================
router.get('/track/:code', async (req, res) => {
  try {
    const orders = await query(
      'SELECT order_code, status, total, tracking_code, created_at, updated_at FROM orders WHERE order_code = ?',
      [req.params.code]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const order = orders[0];

    const history = await query(
      'SELECT status, note, created_at FROM order_status_history WHERE order_id = (SELECT id FROM orders WHERE order_code = ?) ORDER BY created_at ASC',
      [req.params.code]
    );

    res.json({ order, history });
  } catch (err) {
    console.error('Erro ao rastrear pedido:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// GET /api/orders/:id — Detalhe do pedido
// =============================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const orders = await query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const order = orders[0];
    if (order.shipping_address && typeof order.shipping_address === 'string') {
      try { order.shipping_address = JSON.parse(order.shipping_address); } catch {}
    }

    const items = await query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );

    const history = await query(
      'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC',
      [order.id]
    );

    res.json({ order, items, history });
  } catch (err) {
    console.error('Erro ao buscar pedido:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
