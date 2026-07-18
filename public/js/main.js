/* =============================================
   Sublimitas — Main JS
   ============================================= */
const API_BASE = '';

// =============================================
// Utilities
// =============================================
async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const sessionId = localStorage.getItem('session_id');
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }

  try {
    const res = await fetch(url, { ...options, headers, credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.error || 'Erro', data };
    return data;
  } catch (err) {
    if (err.status) throw err;
    throw { status: 0, message: 'Erro de conexão' };
  }
}

function formatPrice(val) {
  return `R$ ${parseFloat(val).toFixed(2).replace('.', ',')}`;
}

function showToast(message, type = '') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type ? 'toast-' + type : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function generateSessionId() {
  let sid = localStorage.getItem('session_id');
  if (!sid) {
    sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('session_id', sid);
  }
  return sid;
}

// =============================================
// Auth
// =============================================
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const authBtns = document.getElementById('authButtons');
  const userMenu = document.getElementById('userMenu');

  if (token && user) {
    if (authBtns) authBtns.style.display = 'none';
    if (userMenu) userMenu.style.display = 'block';
  } else {
    if (authBtns) authBtns.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
  }
}

function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    });
  }
}

// =============================================
// Cart
// =============================================
async function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  try {
    const data = await api('/api/cart');
    const count = data.items ? data.items.length : 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  } catch {}
}

// =============================================
// Mobile Menu
// =============================================
function setupMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const nav = document.getElementById('mobileNav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      nav.classList.toggle('open');
      nav.style.display = nav.classList.contains('open') ? 'flex' : 'none';
    });
  }
}

// =============================================
// User Dropdown
// =============================================
function setupUserDropdown() {
  const btn = document.getElementById('userMenuBtn');
  const dropdown = document.getElementById('userDropdown');
  if (btn && dropdown) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });
  }
}

// =============================================
// Search Modal
// =============================================
function setupSearch() {
  const modal = document.getElementById('searchModal');
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  const openBtn = document.getElementById('searchBtn');

  if (!modal || !input) return;

  function openModal() {
    modal.style.display = 'flex';
    input.focus();
  }

  function closeModal() {
    modal.style.display = 'none';
    input.value = '';
    if (results) results.innerHTML = '';
  }

  if (openBtn) openBtn.addEventListener('click', openModal);

  // Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openModal();
    }
    if (e.key === 'Escape') closeModal();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Search debounce
  let searchTimeout;
  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    if (q.length < 2) {
      results.innerHTML = '<div class="search-empty">Digite pelo menos 2 caracteres</div>';
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const data = await api(`/api/products/search?q=${encodeURIComponent(q)}`);
        let html = '';

        if (data.categories && data.categories.length > 0) {
          data.categories.forEach(c => {
            html += `<a href="/produtos?category=${c.slug}" class="search-result-item">
              <span class="search-result-icon">${c.icon || '📂'}</span>
              <div>
                <div class="search-result-name">${c.name}</div>
                <div class="search-result-type">Categoria</div>
              </div>
            </a>`;
          });
        }

        if (data.products && data.products.length > 0) {
          data.products.forEach(p => {
            html += `<a href="/produto?slug=${p.slug}" class="search-result-item">
              <span class="search-result-icon">📦</span>
              <div>
                <div class="search-result-name">${p.name}</div>
                <div class="search-result-type">${p.category_name || ''} • ${formatPrice(p.base_price)}</div>
              </div>
            </a>`;
          });
        }

        if (!html) {
          html = '<div class="search-empty">Nenhum resultado encontrado</div>';
        }

        results.innerHTML = html;
      } catch {
        results.innerHTML = '<div class="search-empty">Erro ao buscar</div>';
      }
    }, 300);
  });
}

// =============================================
// Homepage Loaders
// =============================================
async function loadCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  const defaultCategories = [
    { slug:'canecas', icon:'☕', name:'Canecas', product_count:8 },
    { slug:'camisetas', icon:'👕', name:'Camisetas', product_count:12 },
    { slug:'uniformes', icon:'👔', name:'Uniformes', product_count:6 },
    { slug:'brindes', icon:'🎁', name:'Brindes', product_count:10 },
    { slug:'copos', icon:'🥤', name:'Copos Térmicos', product_count:5 },
    { slug:'garrafas', icon:'🍶', name:'Garrafas', product_count:4 },
    { slug:'bone', icon:'🧢', name:'Bonés', product_count:7 },
    { slug:'agenda', icon:'📓', name:'Agendas', product_count:3 }
  ];

  try {
    const data = await api('/api/categories');
    const cats = data.categories && data.categories.length > 0 ? data.categories : defaultCategories;
    grid.innerHTML = cats.map(c => `
      <a href="/produtos?category=${c.slug}" class="cat-card" style="background:${getCategoryColor(c.slug)}">
        <div class="cat-card-emoji">${c.icon || '📂'}</div>
        <div class="cat-card-name">${c.name}</div>
        <div class="cat-card-count">${c.product_count || 0} produtos</div>
      </a>
    `).join('');
  } catch {
    grid.innerHTML = defaultCategories.map(c => `
      <a href="/produtos?category=${c.slug}" class="cat-card" style="background:${getCategoryColor(c.slug)}">
        <div class="cat-card-emoji">${c.icon}</div>
        <div class="cat-card-name">${c.name}</div>
        <div class="cat-card-count">${c.product_count} produtos</div>
      </a>
    `).join('');
  }
}

function getCategoryColor(slug) {
  const colors = {
    canecas:'#EEF1FF', camisetas:'#E8F8EE', uniformes:'#F0EAFF',
    brindes:'#FFF4E5', copos:'#FFF0E5', garrafas:'#FEE8F0',
    bone:'#E0F2FE', agenda:'#FDE68A'
  };
  return colors[slug] || '#F9FAFB';
}

async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  const defaultProducts = [
    { slug:'caneca-magica', name:'Caneca Mágica Personalizada', category_name:'Canecas', base_price:39.90, stock:45, emoji:'☕', badge:'Novo', badge_class:'product-badge', bg:'#EEF1FF' },
    { slug:'camiseta-polo', name:'Camiseta Polo Corporativa', category_name:'Camisetas', base_price:59.90, stock:30, emoji:'👕', badge:'Destaque', badge_class:'product-badge product-badge-accent', bg:'#E8F8EE' },
    { slug:'garrafa-termica', name:'Garrafa Térmica 500ml', category_name:'Garrafas', base_price:49.90, stock:22, emoji:'🍶', badge:'Novo', badge_class:'product-badge', bg:'#FEE8F0' },
    { slug:'bone-camurca', name:'Boné de Camurça Premium', category_name:'Bonés', base_price:44.90, stock:18, emoji:'🧢', badge:'Destaque', badge_class:'product-badge product-badge-accent', bg:'#E0F2FE' },
    { slug:'kit-canecas', name:'Kit 6 Canecas Personalizadas', category_name:'Canecas', base_price:189.90, stock:12, emoji:'☕', badge:'Novo', badge_class:'product-badge', bg:'#F0EAFF' },
    { slug:'uniforme-esportivo', name:'Uniforme Esportivo Completo', category_name:'Uniformes', base_price:129.90, stock:8, emoji:'👔', badge:'Destaque', badge_class:'product-badge product-badge-accent', bg:'#FFF4E5' },
    { slug:'copo-termico', name:'Copo Térmico 450ml', category_name:'Copos', base_price:34.90, stock:25, emoji:'🥤', badge:'', badge_class:'', bg:'#FFF0E5' },
    { slug:'agenda-capa', name:'Agenda com Capa Personalizada', category_name:'Agendas', base_price:29.90, stock:15, emoji:'📓', badge:'', badge_class:'', bg:'#F5F4F7' }
  ];

  try {
    const data = await api('/api/products/featured');
    const products = data.products && data.products.length > 0 ? data.products : defaultProducts;
    grid.innerHTML = products.map(p => {
      const img = (p.images && p.images.length > 0) ? p.images[0] : null;
      const emoji = p.emoji || '📦';
      const badge = p.badge ? `<span class="${p.badge_class || 'product-badge'}">${p.badge}</span>` : '';
      const bg = p.bg || getCategoryColor(p.category_name);
      return `
        <a href="/produto?slug=${p.slug}" class="product-card">
          <div class="product-img" style="background:${bg}">
            ${img ? `<img src="${img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover">` : emoji}
            ${badge}
          </div>
          <div class="product-info">
            <div class="product-cat">${p.category_name || ''}</div>
            <div class="product-name">${p.name}</div>
            <div class="product-stock">📦 Estoque ${p.stock || 'disponível'} unidades</div>
            <div class="product-price">${formatPrice(p.base_price)}</div>
            <div class="product-installment">ou 3x de ${formatPrice(p.base_price / 3)}</div>
          </div>
          <div class="product-btn">Ver produto</div>
        </a>
      `;
    }).join('');
  } catch {
    grid.innerHTML = defaultProducts.map(p => `
      <a href="/produto?slug=${p.slug}" class="product-card">
        <div class="product-img" style="background:${p.bg}">
          ${p.emoji}
          ${p.badge ? `<span class="${p.badge_class}">${p.badge}</span>` : ''}
        </div>
        <div class="product-info">
          <div class="product-cat">${p.category_name}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-stock">📦 Estoque ${p.stock} unidades</div>
          <div class="product-price">${formatPrice(p.base_price)}</div>
          <div class="product-installment">ou 3x de ${formatPrice(p.base_price / 3)}</div>
        </div>
        <div class="product-btn">Ver produto</div>
      </a>
    `).join('');
  }
}

async function loadTestimonials() {
  const container = document.getElementById('testimonialsCarousel');
  if (!container) return;

  const defaultTestimonials = [
    { name: 'Maria Silva', role: 'Empresária', text: 'Produtos de excelente qualidade! A personalização ficou perfeita e a entrega foi rápida demais.', rating: 5, initials: 'MS' },
    { name: 'João Santos', role: 'Gerente de RH', text: 'Encomendamos uniformes para toda a empresa. Ficou maravilhoso! Recomendo demais.', rating: 5, initials: 'JS' },
    { name: 'Ana Costa', role: 'Event Planner', text: 'Sempre uso a Sublimitas para brindes de eventos. Qualidade consistente e preços justos.', rating: 5, initials: 'AC' },
    { name: 'Pedro Lima', role: 'Empreendedor', text: 'A ferramenta de IA para criar designs é incrível! Economizei horas de trabalho.', rating: 5, initials: 'PL' },
    { name: 'Carla Mendes', role: 'Dona de Loja', text: 'As canecas personalizadas ficaram lindas! Meus clientes amam. Parceria que veio para ficar.', rating: 5, initials: 'CM' },
    { name: 'Ricardo Alves', role: 'Diretor Comercial', text: 'Profissionalismo do início ao fim. A qualidade dos produtos superou nossas expectativas.', rating: 5, initials: 'RA' }
  ];

  container.innerHTML = defaultTestimonials.map(t => `
    <div class="testimonial-card-v2">
      <div class="testimonial-header">
        <div class="testimonial-avatar">${t.initials}</div>
        <div>
          <div class="testimonial-name">${t.name}</div>
          <div class="testimonial-role">${t.role}</div>
        </div>
      </div>
      <div class="testimonial-stars">${'⭐'.repeat(t.rating)}</div>
      <div class="testimonial-text">"${t.text}"</div>
    </div>
  `).join('');
}

async function loadTrustCompanies() {
  const container = document.getElementById('trustLogos');
  if (!container) return;

  const defaultCompanies = [
    { name: 'Escola Futuro', icon: '🏫' },
    { name: 'Clínica Bem Viver', icon: '🏥' },
    { name: 'Supermercado Economia', icon: '🛒' },
    { name: 'Academia Força Total', icon: '💪' },
    { name: 'Igreja Vida Nova', icon: '⛪' },
    { name: 'Festa Perfeita', icon: '🎉' }
  ];

  try {
    const data = await api('/api/admin/trust-companies');
    const companies = data.companies && data.companies.length > 0 ? data.companies : defaultCompanies;
    container.innerHTML = companies.map(c => `
      <span class="trust-name">${c.icon || '🏢'} ${c.name}</span>
    `).join('');
  } catch {
    container.innerHTML = defaultCompanies.map(c => `
      <span class="trust-name">${c.icon} ${c.name}</span>
    `).join('');
  }
}

// =============================================
// Add to Cart
// =============================================
async function addToCart(productId, quantity = 1) {
  try {
    generateSessionId();
    await api('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity })
    });
    showToast('Produto adicionado ao carrinho!', 'success');
    updateCartBadge();
  } catch (err) {
    showToast(err.message || 'Erro ao adicionar ao carrinho', 'error');
  }
}

// =============================================
// Init
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  generateSessionId();
  checkAuth();
  setupLogout();
  setupMobileMenu();
  setupUserDropdown();
  setupSearch();
  updateCartBadge();

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Load homepage data
  loadCategories();
  loadFeaturedProducts();
  loadTrustCompanies();
});

// Make addToCart global
window.addToCart = addToCart;
