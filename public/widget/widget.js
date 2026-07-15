const SublimitasWidget = {
  config: null,
  panel: null,
  btn: null,
  isOpen: false,

  init(config) {
    this.config = Object.assign({
      primaryColor: '#7B2FBE',
      accentColor: '#FF6B00',
      whatsappNumber: '',
      whatsappMessage: 'Olá! Gostaria de saber mais sobre os produtos.',
      email: '',
      position: 'bottom-right',
      companyName: 'Sublimitas'
    }, config || {});

    const saved = localStorage.getItem('__sublimitas_widget_config');
    if (saved) {
      try {
        Object.assign(this.config, JSON.parse(saved));
      } catch {}
    }

    if (window.__sublimitas_widget_config) {
      Object.assign(this.config, window.__sublimitas_widget_config);
    }

    this.createButton();
    this.createPanel();
  },

  createButton() {
    this.btn = document.createElement('button');
    this.btn.className = 'sl-widget-btn';
    this.btn.setAttribute('aria-label', 'Abrir suporte');
    this.btn.style.background = this.config.primaryColor;
    this.btn.innerHTML = '<svg viewBox="0 0 24 24" fill="#FFFFFF"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="none"/><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="10" r="1.2"/><circle cx="16" cy="10" r="1.2"/></svg>';
    this.btn.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.btn);
  },

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'sl-widget-panel';
    this.panel.innerHTML = `
      <div class="sl-widget-header" style="background: ${this.config.primaryColor};">
        <div class="sl-widget-header-left">
          <div class="sl-widget-header-avatar">✦</div>
          <div class="sl-widget-header-info">
            <h3>${this.config.companyName}</h3>
            <p>Como podemos ajudar?</p>
          </div>
        </div>
        <button class="sl-widget-close" aria-label="Fechar">✕</button>
      </div>
      <div class="sl-widget-body">
        <div class="sl-widget-message sl-widget-message-incoming">
          Olá! 👋 Bem-vindo à <strong>${this.config.companyName}</strong>. Como podemos ajudar você hoje?
        </div>
        <div class="sl-widget-actions" id="sl-widget-actions"></div>
      </div>
      <div class="sl-widget-footer">
        Powered by <a href="/" target="_blank" style="color:${this.config.primaryColor};">Sublimitas</a>
      </div>
    `;

    this.panel.querySelector('.sl-widget-close').addEventListener('click', () => this.close());
    document.body.appendChild(this.panel);

    this.renderActions();
  },

  renderActions() {
    const container = this.panel.querySelector('#sl-widget-actions');
    let html = '';

    if (this.config.whatsappNumber) {
      const phone = this.config.whatsappNumber.replace(/\D/g, '');
      const msg = encodeURIComponent(this.config.whatsappMessage);
      html += `
        <a href="https://wa.me/55${phone}?text=${msg}" target="_blank" rel="noopener noreferrer" class="sl-widget-action-btn">
          <div class="sl-widget-action-icon" style="background:#25D366;">💬</div>
          <div>
            <div>WhatsApp</div>
            <div style="font-size:0.75rem;font-weight:400;color:#6B7280;">Resposta rápida</div>
          </div>
        </a>
      `;
    }

    if (this.config.email) {
      html += `
        <a href="mailto:${this.config.email}" class="sl-widget-action-btn">
          <div class="sl-widget-action-icon" style="background:${this.config.accentColor};">✉️</div>
          <div>
            <div>E-mail</div>
            <div style="font-size:0.75rem;font-weight:400;color:#6B7280;">${this.config.email}</div>
          </div>
        </a>
      `;
    }

    html += `
      <a href="/contato" class="sl-widget-action-btn">
        <div class="sl-widget-action-icon" style="background:${this.config.primaryColor};">📝</div>
        <div>
          <div>Formulário de Contato</div>
          <div style="font-size:0.75rem;font-weight:400;color:#6B7280;">Preencha online</div>
        </div>
      </a>
    `;

    container.innerHTML = html;
  },

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  open() {
    this.isOpen = true;
    this.panel.classList.add('sl-widget-open');
    this.btn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="#FFFFFF"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  },

  close() {
    this.isOpen = false;
    this.panel.classList.remove('sl-widget-open');
    this.btn.innerHTML = '<svg viewBox="0 0 24 24" fill="#FFFFFF"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="10" r="1.2"/><circle cx="16" cy="10" r="1.2"/></svg>';
  }
};

window.SublimitasWidget = SublimitasWidget;
