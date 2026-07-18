const SublimitasWidget = {
  config: null,
  panel: null,
  btn: null,
  isOpen: false,
  chatHistory: [],

  init(config) {
    this.config = Object.assign({
      primaryColor: '#7B2FBE',
      accentColor: '#FF6B00',
      whatsappNumber: '',
      whatsappMessage: 'Olá! Gostaria de saber mais sobre os produtos.',
      email: '',
      position: 'bottom-right',
      companyName: 'Sublimitas',
      welcomeMessage: 'Olá! Como podemos ajudar você hoje?',
      statusText: 'Online agora',
      avatar: '',
      hours: '',
      showWhatsapp: true,
      showEmail: true,
      showForm: true,
      llmUrl: '',
      llmModel: '',
      llmApiKey: '',
      llmPrompt: '',
      llmTemp: 0.7,
      llmMaxTokens: 500,
      offlineMsg: 'Estamos fora do horário. Envie um WhatsApp!'
    }, config || {});

    this.chatHistory = [{ role: 'system', content: this.config.llmPrompt || 'Você é o assistente da Sublimitas.' }];

    const saved = localStorage.getItem('__sublimitas_widget_config');
    if (saved) { try { Object.assign(this.config, JSON.parse(saved)); } catch {} }
    if (window.__sublimitas_widget_config) { Object.assign(this.config, window.__sublimitas_widget_config); }

    this.createButton();
    this.createPanel();
  },

  createButton() {
    this.btn = document.createElement('button');
    this.btn.className = 'sl-widget-btn';
    this.btn.setAttribute('aria-label', 'Abrir suporte');
    this.btn.style.background = this.config.primaryColor;
    if (this.config.position === 'bottom-left') {
      this.btn.style.right = 'auto';
      this.btn.style.left = '24px';
    }
    this.btn.innerHTML = this._renderIcon();
    this.btn.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.btn);
  },

  _renderIcon() {
    if (this.config.avatar && this.config.avatar.match(/\.(png|jpe?g|gif|svg|webp)/i)) {
      return '<img src="' + this.config.avatar + '" alt="Suporte" style="width:28px;height:28px;border-radius:50%;object-fit:cover">';
    }
    if (this.config.avatar && !this.config.avatar.match(/^https?:/)) return this.config.avatar;
    return '<svg viewBox="0 0 24 24" fill="#FFFFFF"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="10" r="1.2"/><circle cx="16" cy="10" r="1.2"/></svg>';
  },

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'sl-widget-panel';
    if (this.config.position === 'bottom-left') {
      this.panel.style.right = 'auto';
      this.panel.style.left = '24px';
    }

    const avatarHtml = (this.config.avatar && this.config.avatar.match(/\.(png|jpe?g|gif|svg|webp)/i))
      ? '<img src="' + this.config.avatar + '" alt="" style="width:42px;height:42px;border-radius:50%;object-fit:cover">'
      : '<div class="sl-widget-header-avatar">' + (this.config.avatar || '✦') + '</div>';
    const statusHtml = this.config.statusText
      ? '<div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:#22C55E;display:inline-block"></span><span style="font-size:.7rem;opacity:.85">' + this.config.statusText + '</span></div>' : '';
    const hoursHtml = this.config.hours
      ? '<div style="font-size:.7rem;opacity:.7;margin-top:2px">⏰ ' + this.config.hours + '</div>' : '';
    const hasLLM = this.config.llmUrl && this.config.llmApiKey;

    this.panel.innerHTML = `
      <div class="sl-widget-header" style="background:${this.config.primaryColor};">
        <div class="sl-widget-header-left">
          ${avatarHtml}
          <div class="sl-widget-header-info">
            <h3>${this.config.companyName}</h3>
            ${statusHtml}${hoursHtml}
          </div>
        </div>
        <button class="sl-widget-close" aria-label="Fechar">✕</button>
      </div>
      <div class="sl-widget-body">
        <div class="sl-widget-message sl-widget-message-incoming">${this.config.welcomeMessage}</div>
        ${hasLLM ? '<div class="sl-widget-chat" id="sl-widget-chat"></div>' : ''}
        <div class="sl-widget-actions" id="sl-widget-actions"></div>
      </div>
      ${hasLLM ? '<div class="sl-widget-input-area"><input type="text" id="sl-widget-input" placeholder="Digite sua mensagem..." autocomplete="off"><button id="sl-widget-send" style="background:' + this.config.primaryColor + '">➤</button></div>' : ''}
      <div class="sl-widget-footer">Powered by <a href="/" target="_blank" style="color:${this.config.primaryColor};">Sublimitas</a></div>
    `;

    this.panel.querySelector('.sl-widget-close').addEventListener('click', () => this.close());
    document.body.appendChild(this.panel);
    this.renderActions();

    if (hasLLM) {
      const input = this.panel.querySelector('#sl-widget-input');
      const sendBtn = this.panel.querySelector('#sl-widget-send');
      sendBtn.addEventListener('click', () => this._sendMessage());
      input.addEventListener('keydown', e => { if (e.key === 'Enter') this._sendMessage(); });
    }
  },

  _appendChat(text, sender) {
    const chat = this.panel.querySelector('#sl-widget-chat');
    if (!chat) return;
    const div = document.createElement('div');
    div.className = 'sl-widget-message ' + (sender === 'user' ? 'sl-widget-message-outgoing' : 'sl-widget-message-incoming');
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  },

  async _sendMessage() {
    const input = this.panel.querySelector('#sl-widget-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this._appendChat(text, 'user');
    this.chatHistory.push({ role: 'user', content: text });

    const chat = this.panel.querySelector('#sl-widget-chat');
    const loading = document.createElement('div');
    loading.className = 'sl-widget-message sl-widget-message-incoming';
    loading.textContent = 'Digitando...';
    loading.id = 'sl-widget-loading';
    chat.appendChild(loading);
    chat.scrollTop = chat.scrollHeight;

    try {
      const response = await fetch(this.config.llmUrl + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.config.llmApiKey },
        body: JSON.stringify({
          model: this.config.llmModel,
          messages: this.chatHistory.slice(-10),
          temperature: this.config.llmTemp,
          max_tokens: this.config.llmMaxTokens
        })
      });
      const data = await response.json();
      const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'Desculpe, não consegui responder.';
      this.chatHistory.push({ role: 'assistant', content: reply });
      const el = this.panel.querySelector('#sl-widget-loading');
      if (el) el.textContent = reply;
    } catch {
      const el = this.panel.querySelector('#sl-widget-loading');
      if (el) el.textContent = 'Erro ao conectar. Tente novamente.';
    }
  },

  renderActions() {
    const container = this.panel.querySelector('#sl-widget-actions');
    let html = '';
    if (this.config.showWhatsapp && this.config.whatsappNumber) {
      const phone = this.config.whatsappNumber.replace(/\D/g, '');
      const msg = encodeURIComponent(this.config.whatsappMessage);
      html += '<a href="https://wa.me/55' + phone + '?text=' + msg + '" target="_blank" rel="noopener noreferrer" class="sl-widget-action-btn"><div class="sl-widget-action-icon" style="background:#25D366;">💬</div><div><div>WhatsApp</div><div style="font-size:0.75rem;font-weight:400;color:#6B7280;">Resposta rápida</div></div></a>';
    }
    if (this.config.showEmail && this.config.email) {
      html += '<a href="mailto:' + this.config.email + '" class="sl-widget-action-btn"><div class="sl-widget-action-icon" style="background:' + this.config.accentColor + ';">✉️</div><div><div>E-mail</div><div style="font-size:0.75rem;font-weight:400;color:#6B7280;">' + this.config.email + '</div></div></a>';
    }
    if (this.config.showForm) {
      html += '<a href="/contato.html" class="sl-widget-action-btn"><div class="sl-widget-action-icon" style="background:' + this.config.primaryColor + ';">📝</div><div><div>Formulário de Contato</div><div style="font-size:0.75rem;font-weight:400;color:#6B7280;">Preencha online</div></div></a>';
    }
    container.innerHTML = html;
  },

  toggle() { this.isOpen ? this.close() : this.open(); },

  open() {
    this.isOpen = true;
    this.panel.classList.add('sl-widget-open');
    this.btn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="#FFFFFF"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  },

  close() {
    this.isOpen = false;
    this.panel.classList.remove('sl-widget-open');
    this.btn.innerHTML = this._renderIcon();
  }
};

window.SublimitasWidget = SublimitasWidget;
