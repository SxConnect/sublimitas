function initPage() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href === path || (href === '/' && path === '/') || (href !== '/' && path.startsWith(href))) {
      link.classList.add('active');
    }
  });
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings/public');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('public_settings', JSON.stringify(data));
      applyTheme();
    }
  } catch {}
}

function getSetting(key) {
  try {
    const settings = JSON.parse(localStorage.getItem('public_settings') || '{}');
    return settings[key] || null;
  } catch {
    return null;
  }
}

function applyTheme() {
  const primary = getSetting('primary_color');
  const accent = getSetting('accent_color');
  const root = document.documentElement;
  if (primary) root.style.setProperty('--primary', primary);
  if (accent) root.style.setProperty('--accent', accent);
}

document.addEventListener('DOMContentLoaded', () => {
  initPage();
  loadSettings();
});
