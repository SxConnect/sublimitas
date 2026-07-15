require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const { query, getPool } = require('./db');

async function seed() {
  console.log('🌱 Populando banco de dados...');

  try {
    // Verificar se já existe admin
    const existingAdmin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (existingAdmin.length > 0) {
      console.log('ℹ️  Admin já existe, pulando criação');
    } else {
      const hash = await bcrypt.hash('admin123', 12);
      await query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
        ['Administrador', 'admin@sublimitas.com.br', hash]
      );
      console.log('✅ Admin criado: admin@sublimitas.com.br / admin123');
    }

    // Categorias padrão
    const categories = [
      { name: 'Camisetas', slug: 'camisetas', icon: '👕', description: 'Camisetas personalizadas com estampas únicas' },
      { name: 'Canecas', slug: 'canecas', icon: '☕', description: 'Canecas personalizadas para presentes e empresas' },
      { name: 'Uniformes', slug: 'uniformes', icon: '👔', description: 'Uniformes corporativos e de trabalho' },
      { name: 'Garrafas', slug: 'garrafas', icon: '🍶', description: 'Garrafas térmicas e copos personalizados' },
      { name: 'Brindes', slug: 'brindes', icon: '🎁', description: 'Brindes personalizados para empresas e eventos' },
      { name: 'Almofadas', slug: 'almofadas', icon: '🛋️', description: 'Almofadas personalizadas com fotos e estampas' },
      { name: 'Mouse Pads', slug: 'mouse-pads', icon: '🖱️', description: 'Mouse pads personalizados para escritório' },
      { name: 'Bonés', slug: 'bones', icon: '🧢', description: 'Bonés e chapéus personalizados' },
      { name: 'Cadernos', slug: 'cadernos', icon: '📓', description: 'Cadernos e agendas personalizadas' },
      { name: 'Tote Bags', slug: 'tote-bags', icon: '👜', description: 'Bolsas ecobag personalizadas' },
      { name: 'Posters', slug: 'posters', icon: '🖼️', description: 'Posters e pôsteres de alta qualidade' },
      { name: 'Moletom', slug: 'moletom', icon: '🧥', description: 'Moletons personalizados' }
    ];

    const existingCategories = await query("SELECT COUNT(*) as count FROM categories");
    if (existingCategories[0].count === 0) {
      for (const cat of categories) {
        await query(
          "INSERT INTO categories (name, slug, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)",
          [cat.name, cat.slug, cat.icon, cat.description, categories.indexOf(cat)]
        );
      }
      console.log(`✅ ${categories.length} categorias criadas`);
    } else {
      console.log('ℹ️  Categorias já existem, pulando');
    }

    // Produtos de exemplo
    const existingProducts = await query("SELECT COUNT(*) as count FROM products");
    if (existingProducts[0].count === 0) {
      const products = [
        { name: 'Camiseta Algodão Premium', slug: 'camiseta-algodao-premium', price: 49.90, category: 'camisetas', desc: 'Camiseta 100% algodão, estampa de alta qualidade', stock: 100 },
        { name: 'Caneca Cerâmica 300ml', slug: 'caneca-ceramica-300ml', price: 34.90, category: 'canecas', desc: 'Caneca de cerâmica branca, ideal para personalização', stock: 200 },
        { name: 'Uniforme Empresarial Completo', slug: 'uniforme-empresarial', price: 89.90, category: 'uniformes', desc: 'Conjunto completo de uniforme empresarial', stock: 50 },
        { name: 'Garrafa Térmica Inox 500ml', slug: 'garrafa-termica-inox', price: 79.90, category: 'garrafas', desc: 'Garrafa térmica de aço inoxidável, keeps hot 12h', stock: 80 },
        { name: 'Kit Brindes Corporativos', slug: 'kit-brindes-corporativos', price: 29.90, category: 'brindes', desc: 'Kit com caneca + caneta + chaveiro personalizados', stock: 150 },
        { name: 'Almofada Personalizada 40x40cm', slug: 'almofada-personalizada', price: 39.90, category: 'almofadas', desc: 'Almofada com estampa fotográfica, capa removível', stock: 60 },
        { name: 'Mouse Pad Gamer XL', slug: 'mouse-pad-gamer-xl', price: 24.90, category: 'mouse-pads', desc: 'Mouse pad grande com bordas costuradas', stock: 120 },
        { name: 'Boné Abacá Ajustável', slug: 'bone-abaca-ajustavel', price: 39.90, category: 'bones', desc: 'Boné de abacá com costura frontal personalizada', stock: 90 }
      ];

      for (const p of products) {
        const catRow = await query("SELECT id FROM categories WHERE slug = ?", [p.category]);
        if (catRow.length > 0) {
          await query(
            "INSERT INTO products (name, slug, description, base_price, category_id, stock_quantity, images, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [p.name, p.slug, p.desc, p.price, catRow[0].id, p.stock, JSON.stringify([]), Math.random() > 0.5]
          );
        }
      }
      console.log(`✅ ${products.length} produtos criados`);
    } else {
      console.log('ℹ️  Produtos já existem, pulando');
    }

    // Configurações padrão
    const settings = [
      { key: 'site_name', value: 'Sublimitas', type: 'string', category: 'general' },
      { key: 'site_description', value: 'Produtos personalizados de alta qualidade', type: 'string', category: 'general' },
      { key: 'primary_color', value: '#7B2FBE', type: 'string', category: 'design' },
      { key: 'accent_color', value: '#FF6B00', type: 'string', category: 'design' },
      { key: 'whatsapp_number', value: '', type: 'string', category: 'contact' },
      { key: 'whatsapp_message', value: 'Olá! Gostaria de saber mais sobre os produtos personalizados.', type: 'string', category: 'contact' },
      { key: 'support_email', value: 'contato@sublimitas.com.br', type: 'string', category: 'contact' },
      { key: 'instagram_username', value: '', type: 'string', category: 'social' },
      { key: 'facebook_url', value: '', type: 'string', category: 'social' },
      { key: 'support_mode', value: 'whatsapp', type: 'string', category: 'support' },
      { key: 'widget_primary_color', value: '#7B2FBE', type: 'string', category: 'support' },
      { key: 'admin_setup_complete', value: 'false', type: 'boolean', category: 'admin' }
    ];

    const existingSettings = await query("SELECT COUNT(*) as count FROM settings");
    if (existingSettings[0].count === 0) {
      for (const s of settings) {
        await query(
          "INSERT INTO settings (setting_key, setting_value, setting_type, category) VALUES (?, ?, ?, ?)",
          [s.key, s.value, s.type, s.category]
        );
      }
      console.log(`✅ ${settings.length} configurações criadas`);
    } else {
      console.log('ℹ️  Configurações já existem, pulando');
    }

    // Empresas que confiam
    const existingTrust = await query("SELECT COUNT(*) as count FROM trust_companies");
    if (existingTrust[0].count === 0) {
      const companies = [
        { name: 'Empresa 1', sort_order: 0 },
        { name: 'Empresa 2', sort_order: 1 },
        { name: 'Empresa 3', sort_order: 2 },
        { name: 'Empresa 4', sort_order: 3 },
        { name: 'Empresa 5', sort_order: 4 }
      ];
      for (const c of companies) {
        await query(
          "INSERT INTO trust_companies (name, sort_order) VALUES (?, ?)",
          [c.name, c.sort_order]
        );
      }
      console.log(`✅ ${companies.length} empresas de confiança criadas`);
    } else {
      console.log('ℹ️  Empresas de confiança já existem, pulando');
    }

    console.log('✅ Seed concluído com sucesso');
  } catch (err) {
    console.error('❌ Erro no seed:', err.message);
    throw err;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
