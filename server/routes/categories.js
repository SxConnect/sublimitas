const express = require('express');
const { query } = require('../config/db');

const router = express.Router();

// =============================================
// GET /api/categories — Listar categorias
// =============================================
router.get('/', async (req, res) => {
  try {
    const categories = await query(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
       WHERE c.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`
    );

    res.json({ categories });
  } catch (err) {
    console.error('Erro ao listar categorias:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// GET /api/categories/:slug — Detalhe da categoria
// =============================================
router.get('/:slug', async (req, res) => {
  try {
    const categories = await query(
      'SELECT * FROM categories WHERE slug = ? AND is_active = TRUE',
      [req.params.slug]
    );

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    res.json({ category: categories[0] });
  } catch (err) {
    console.error('Erro ao buscar categoria:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
