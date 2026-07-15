function initSupport() {
  const mode = getSetting('admin_support_mode');

  if (mode === 'widget') {
    loadWidget();
  } else if (mode === 'whatsapp') {
    createWhatsappButton();
  }
}

function loadWidget() {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/widget/widget.css';
  document.head.appendChild(css);

  const script = document.createElement('script');
  script.src = '/widget/widget.js';
  script.onload = () => {
    if (window.SublimitasWidget) {
      const primary = getSetting('primary_color') || '#7B2FBE';
      const accent = getSetting('accent_color') || '#FF6B00';
      const whatsappNumber = getSetting('whatsapp_number') || '';
      const whatsappMessage = getSetting('whatsapp_message') || 'Olá! Gostaria de saber mais sobre os produtos.';
      const email = getSetting('contact_email') || '';

      SublimitasWidget.init({
        primaryColor: primary,
        accentColor: accent,
        whatsappNumber: whatsappNumber,
        whatsappMessage: whatsappMessage,
        email: email,
        position: 'bottom-right'
      });
    }
  };
  document.body.appendChild(script);
}

function createWhatsappButton() {
  const whatsappNumber = getSetting('whatsapp_number') || '';
  const whatsappMessage = getSetting('whatsapp_message') || 'Olá! Gostaria de saber mais sobre os produtos.';

  if (!whatsappNumber) return;

  const phone = whatsappNumber.replace(/\D/g, '');
  const encoded = encodeURIComponent(whatsappMessage);
  const url = `https://wa.me/55${phone}?text=${encoded}`;

  const btn = document.createElement('a');
  btn.href = url;
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
  btn.className = 'whatsapp-float';
  btn.setAttribute('aria-label', 'Fale conosco no WhatsApp');
  btn.innerHTML = '<svg viewBox="0 0 32 32" width="32" height="32" fill="#FFFFFF"><path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.132 6.744 3.054 9.378L1.054 31.25l6.144-1.956A15.9 15.9 0 0 0 16.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.37 22.604c-.39 1.1-1.932 2.014-3.158 2.28-.84.18-1.936.322-5.626-1.208-4.72-1.954-7.758-6.76-7.992-7.074-.226-.314-1.874-2.498-1.874-4.766 0-2.264 1.19-3.376 1.612-3.838.39-.428.924-.54 1.228-.54.304 0 .608.002.874.016.28.012.654-.106.884.672.238.812.808 2.786.878 2.988.07.202.116.438.024.704-.09.27-.136.438-.262.672-.13.234-.272.522-.388.698-.13.196-.266.41-.114.8.304.776 1.352 2.236 2.908 3.624 1.998 1.782 3.68 2.336 4.21 2.596.39.19.826.144 1.132-.204.388-.446.87-1.168 1.362-1.896.35-.516.792-.58 1.326-.392.54.19 3.42 1.614 4.006 1.904.584.29.974.436 1.116.678.144.24.144 1.38-.248 2.482z"/></svg>';

  const style = document.createElement('style');
  style.textContent = `
    .whatsapp-float {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      background: #25D366;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(37,211,102,0.4);
      z-index: 9999;
      transition: transform 0.3s ease;
    }
    .whatsapp-float:hover {
      transform: scale(1.1);
    }
    @media (max-width: 768px) {
      .whatsapp-float {
        bottom: 16px;
        right: 16px;
        width: 56px;
        height: 56px;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(btn);
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initSupport, 500);
});
