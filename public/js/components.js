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

function renderSocialLinks(targetId) {
  var el = document.getElementById(targetId || 'socialLinks');
  if (!el) return;
  var networks = [
    { key: 'social_instagram', iconKey: 'social_instagram_icon', label: 'Instagram', fallbackIcon: '📸', color: '#E4405F' },
    { key: 'social_facebook', iconKey: 'social_facebook_icon', label: 'Facebook', fallbackIcon: '💬', color: '#1877F2' },
    { key: 'social_tiktok', iconKey: 'social_tiktok_icon', label: 'TikTok', fallbackIcon: '🎵', color: '#000' },
    { key: 'social_youtube', iconKey: 'social_youtube_icon', label: 'YouTube', fallbackIcon: '▶️', color: '#FF0000' },
    { key: 'social_twitter', iconKey: 'social_twitter_icon', label: 'Twitter/X', fallbackIcon: '🐦', color: '#1DA1F2' },
    { key: 'social_linkedin', iconKey: 'social_linkedin_icon', label: 'LinkedIn', fallbackIcon: '💼', color: '#0A66C2' }
  ];
  var html = '';
  networks.forEach(function(n) {
    var url = getSetting(n.key);
    if (url) {
      var iconVal = getSetting(n.iconKey) || '';
      var isImg = iconVal.match(/\.(png|jpe?g|gif|svg|webp)/i) || iconVal.startsWith('http');
      var iconHtml = isImg
        ? '<img src="' + iconVal + '" alt="' + n.label + '" style="width:20px;height:20px;border-radius:4px;object-fit:contain">'
        : (iconVal || n.fallbackIcon);
      html += '<a href="' + url + '" target="_blank" rel="noopener noreferrer" title="' + n.label + '" ' +
        'style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:1rem;text-decoration:none;transition:all .2s" ' +
        'onmouseover="this.style.background=\'' + n.color + '\'" onmouseout="this.style.background=\'rgba(255,255,255,.08)\'">' + iconHtml + '</a>';
    }
  });
  el.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  initPage();
  loadSettings().then(renderSocialLinks);
});
