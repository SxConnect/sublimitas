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

  try {
    const data = await api('/api/categories');
    if (data.categories && data.categories.length > 0) {
      grid.innerHTML = data.categories.map(c => `
        <a href="/produtos?category=${c.slug}" class="category-card">
          <div class="category-icon">${c.icon || '📂'}</div>
          <div class="category-name">${c.name}</div>
          <div class="category-count">${c.product_count || 0} produtos</div>
        </a>
      `).join('');
    } else {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--gray-500)">Nenhuma categoria encontrada</p>';
    }
  } catch {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--gray-500)">Erro ao carregar categorias</p>';
  }
}

async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  try {
    const data = await api('/api/products/featured');
    if (data.products && data.products.length > 0) {
      grid.innerHTML = data.products.map(p => {
        const img = (p.images && p.images.length > 0) ? p.images[0] : null;
        return `
          <div class="product-card">
            <div class="product-image">${img ? `<img src="${img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover">` : '📦'}</div>
            <div class="product-info">
              <div class="product-category">${p.category_name || ''}</div>
              <div class="product-name">${p.name}</div>
              <div class="product-price">${formatPrice(p.base_price)}</div>
            </div>
            <div class="product-actions">
              <a href="/produto?slug=${p.slug}" class="btn btn-outline btn-sm">Ver Detalhes</a>
              <button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})">Adicionar</button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--gray-500)">Nenhum produto em destaque</p>';
    }
  } catch {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--gray-500)">Erro ao carregar produtos</p>';
  }
}

async function loadTestimonials() {
  const container = document.getElementById('testimonialsCarousel');
  if (!container) return;

  const defaultTestimonials = [
    { name: 'Maria Silva', role: 'Empresária', text: 'Produtos de excelente qualidade! A personalização ficou perfeita e a entrega foi rápida demais.', rating: 5 },
    { name: 'João Santos', role: 'Gerente de RH', text: 'Encomendamos uniformes para toda a empresa. Ficou maravilhoso! Recomendo demais.', rating: 5 },
    { name: 'Ana Costa', role: 'Event Planner', text: 'Sempre uso a Sublimitas para brindes de eventos. Qualidade consistente e preços justos.', rating: 5 },
    { name: 'Pedro Lima', role: 'Empreendedor', text: 'A ferramenta de IA para criar designs é incrível! Economizei horas de trabalho.', rating: 5 }
  ];

  const testimonials = defaultTestimonials;
  container.innerHTML = testimonials.map(t => `
    <div class="testimonial-card">
      <div class="testimonial-stars">${'⭐'.repeat(t.rating)}</div>
      <div class="testimonial-text">"${t.text}"</div>
      <div class="testimonial-author">${t.name}</div>
      <div class="testimonial-role">${t.role}</div>
    </div>
  `).join('');
}

async function loadTrustCompanies() {
  const container = document.getElementById('trustLogos');
  if (!container) return;

  try {
    const data = await api('/api/settings/public');
    container.innerHTML = '<p style="color:var(--gray-500)">Empresas que confiam em nossos serviços</p>';
  } catch {
    container.innerHTML = '';
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
  loadTestimonials();
  loadTrustCompanies();
});

// Make addToCart global
window.addToCart = addToCart;
