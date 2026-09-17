// ── HAMBURGER MENU TOGGLE ──
function toggleMenu() {
  const btn = document.getElementById('menuToggle');
  const overlay = document.getElementById('menuOverlay');
  if (btn && overlay) {
    btn.classList.toggle('open');
    overlay.classList.toggle('open');
    document.body.style.overflow = overlay.classList.contains('open') ? 'hidden' : '';
  }
}

async function updateWhatsAppLink() {
  const links = document.querySelectorAll('.whatsapp-float');
  if (!links.length) return;

  try {
    const response = await fetch(window.buildApiUrl ? window.buildApiUrl('/api/settings') : '/api/settings');
    if (!response.ok) return;
    const data = await response.json();
    const link = data.whatsappLink || `https://wa.me/${data.whatsappNumber || '1953320585'}?text=${encodeURIComponent(data.whatsappMessage || 'Hello Brotherhood')}`;
    links.forEach(item => {
      item.href = link;
      item.setAttribute('aria-label', 'Chat with us on WhatsApp');
      item.setAttribute('title', 'Chat with us on WhatsApp');
    });
  } catch (error) {
    console.warn('WhatsApp settings could not be loaded.', error);
  }
}

// ── CURSOR GLOW ──
const cursorGlow = document.getElementById('cursor-glow');
if (cursorGlow) {
  document.addEventListener('mousemove', e => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top  = e.clientY + 'px';
  });
}

// ── PARTICLE SYSTEM ──
const canvas = document.getElementById('particle-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let W = canvas ? canvas.width  = window.innerWidth : window.innerWidth;
let H = canvas ? canvas.height = window.innerHeight : window.innerHeight;

if (canvas) {
  window.addEventListener('resize', () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });
}

const RED = 'rgba(255,255,255,';
const particles = [];
const NUM = 130;

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.r  = Math.random() * 1.4 + 0.3;
    this.vx = (Math.random() - 0.5) * 0.25;
    this.vy = (Math.random() - 0.5) * 0.25;
    this.alpha = Math.random() * 0.5 + 0.1;
    this.life  = Math.random() * 200 + 100;
    this.age   = 0;
    this.shape = Math.random() < 0.15 ? 'triangle' : 'circle';
  }
  update() {
    this.x  += this.vx;
    this.y  += this.vy;
    this.age++;
    if (this.age > this.life || this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
  }
  draw() {
    if (!ctx) return;
    const fade = this.age < 30 ? this.age / 30 : this.age > this.life - 30 ? (this.life - this.age) / 30 : 1;
    ctx.globalAlpha = this.alpha * fade;
    ctx.fillStyle   = RED + '1)';
    if (this.shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.r * 2.5);
      ctx.lineTo(this.x + this.r * 2.2, this.y + this.r * 1.5);
      ctx.lineTo(this.x - this.r * 2.2, this.y + this.r * 1.5);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

if (canvas) {
  for (let i = 0; i < NUM; i++) particles.push(new Particle());
  canvas.style.display = 'none';
}

function drawLines() {
  return;
}

function animateParticles() {
  return;
}

// ── MANAGED GALLERY IMAGES ──
async function applyManagedImages() {
  if (typeof loadSharedData !== 'function') return;
  try {
    const state = await loadSharedData();
    const images = Array.isArray(state.images) ? state.images : [];
    const galleryImages = document.querySelectorAll('#gallery .gallery-card img');
    galleryImages.forEach((img, index) => {
      const item = images[index];
      if (item) {
        img.src = item.src || item.url || '';
        img.alt = item.alt || item.title || img.alt;
      }
    });

    const heroBg = document.querySelector('.hero-bg-img');
    if (heroBg && images[0]) {
      heroBg.style.backgroundImage = `url('${images[0].src || images[0].url || ''}')`;
    }

    const geometryImg = document.querySelector('#geometry .geometry-img-wrap');
    if (geometryImg && images[4]) {
      geometryImg.src = images[4].src || images[4].url || '';
      geometryImg.alt = images[4].alt || images[4].title || geometryImg.alt;
    }

    const chamberImg = document.querySelector('#chamber .chamber-img');
    if (chamberImg && images[5]) {
      chamberImg.src = images[5].src || images[5].url || '';
      chamberImg.alt = images[5].alt || images[5].title || chamberImg.alt;
    }
  } catch (error) {
    console.warn('Managed gallery images could not be loaded.', error);
  }
}
applyManagedImages();

// ── SCROLL REVEAL ──
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => revealObserver.observe(el));

// ── STAGGERED CARD REVEALS ──
document.querySelectorAll('.gallery-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 0.12}s`;
  card.classList.add('reveal');
  revealObserver.observe(card);
});
document.querySelectorAll('.symbol-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 0.1}s`;
  card.classList.add('reveal');
  revealObserver.observe(card);
});
document.querySelectorAll('.tenet-item').forEach((card, i) => {
  card.style.transitionDelay = `${i * 0.1}s`;
  card.classList.add('reveal');
  revealObserver.observe(card);
});

// ── NAV ACTIVE HIGHLIGHT ──
const sections = document.querySelectorAll('section[id], div[id]');
const navLinks = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 200) cur = s.id;
  });
  navLinks.forEach(a => {
    a.style.color = a.getAttribute('href') === '#' + cur
      ? 'rgba(255,255,255,1)' : '';
  });
});

// ── PARALLAX HERO BG ──
window.addEventListener('scroll', () => {
  const hero = document.querySelector('.hero-bg-img');
  if (hero) hero.style.transform = `translateY(${window.scrollY * 0.3}px)`;
});

// ── JOIN FORM SUBMISSIONS ──
function initJoinFormSubmission() {
  const form = document.getElementById('joinForm');
  if (!form) return;

  async function handleJoinFormSubmit(event) {
    event.preventDefault();
    if (form.dataset.submitting === 'true') return;
    form.dataset.submitting = 'true';

    const submitButton = form.querySelector('button[type="submit"]');
    const originalLabel = submitButton?.textContent || 'Submit';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = i18n.t('join_submit_status');
    }

    const payload = {
      fullName: form.querySelector('#fullName')?.value.trim() || '',
      email: form.querySelector('#email')?.value.trim() || '',
      country: form.querySelector('#country')?.value.trim() || '',
      profession: form.querySelector('#profession')?.value.trim() || '',
      motivation: form.querySelector('#motivation')?.value.trim() || '',
    };

    if (!payload.fullName || !payload.email || !payload.country || !payload.motivation) {
      alert(i18n.t('join_error_required'));
      form.dataset.submitting = 'false';
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
      return;
    }

    try {
      const response = await fetch(window.buildApiUrl ? window.buildApiUrl('/api/join') : '/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Submission failed.');
      }

      form.reset();
      const successMessage = document.getElementById('successMsg');
      if (successMessage) {
        successMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Join submission failed:', error);
      alert(error.message || i18n.t('join_error_failed'));
    } finally {
      form.dataset.submitting = 'false';
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  }

  form.addEventListener('submit', handleJoinFormSubmit);
}

function initLiveChatWidget() {
  const existing = document.getElementById('liveChatWidget');
  if (existing) return;

  const root = document.createElement('div');
  root.id = 'liveChatWidget';
  root.className = 'live-chat-widget';
  root.innerHTML = `
    <button id="liveChatToggle" class="live-chat-toggle" type="button" aria-label="Open live chat">Chat</button>
    <div id="liveChatPanel" class="live-chat-panel hidden" aria-live="polite">
      <div class="live-chat-header">
        <div>
          <strong>Brotherhood Support</strong>
          <span>We typically reply shortly</span>
        </div>
        <button id="liveChatClose" type="button" aria-label="Close chat">×</button>
      </div>
      <div id="liveChatMessages" class="live-chat-messages"></div>
      <form id="liveChatForm" class="live-chat-form">
        <input id="liveChatInput" type="text" maxlength="500" placeholder="Type your message..." aria-label="Message" />
        <button type="submit">Send</button>
      </form>
    </div>
  `;
  document.body.appendChild(root);

  const toggle = document.getElementById('liveChatToggle');
  const panel = document.getElementById('liveChatPanel');
  const close = document.getElementById('liveChatClose');
  const form = document.getElementById('liveChatForm');
  const input = document.getElementById('liveChatInput');
  const messageBox = document.getElementById('liveChatMessages');

  const storageKey = 'brotherhood-chat-visitor-id';
  const chatState = { conversationId: localStorage.getItem(storageKey) || '', messages: [] };

  function setPanelVisible(visible) {
    panel.classList.toggle('hidden', !visible);
    if (visible) {
      setTimeout(() => input.focus(), 50);
    }
  }

  function formatMessageTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function renderMessages() {
    if (!messageBox) return;
    if (!chatState.messages.length) {
      messageBox.innerHTML = '<div class="live-chat-empty">Start the conversation with the Brotherhood team.</div>';
      return;
    }

    messageBox.innerHTML = chatState.messages.map(item => {
      const fromMe = item.sender === 'visitor';
      return `
        <div class="live-chat-message ${fromMe ? 'mine' : 'them'}">
          <div class="bubble">
            <span>${String(item.message || '').replace(/[<>]/g, '')}</span>
            <small>${formatMessageTime(item.createdAt)}</small>
          </div>
        </div>
      `;
    }).join('');

    messageBox.scrollTop = messageBox.scrollHeight;
  }

  async function ensureConversation() {
    if (!chatState.conversationId) {
      const visitorId = localStorage.getItem(storageKey) || `visitor-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
      localStorage.setItem(storageKey, visitorId);

      const res = await fetch(window.buildApiUrl ? window.buildApiUrl('/api/chat/conversations') : '/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, visitorName: 'Visitor' })
      });

      if (!res.ok) throw new Error('Unable to start chat.');
      const data = await res.json();
      chatState.conversationId = data.conversationId;
      localStorage.setItem(storageKey, chatState.conversationId);
    }
    return chatState.conversationId;
  }

  async function loadMessages() {
    if (!chatState.conversationId) return;
    try {
      const response = await fetch(window.buildApiUrl ? window.buildApiUrl(`/api/chat/public/conversations/${encodeURIComponent(chatState.conversationId)}`) : `/api/chat/public/conversations/${encodeURIComponent(chatState.conversationId)}`);
      if (!response.ok) return;
      const messages = await response.json();
      chatState.messages = Array.isArray(messages) ? messages : [];
      renderMessages();
    } catch (error) {
      console.warn('Live chat messages could not be loaded.', error);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const value = input.value.trim();
    if (!value || !chatState.conversationId) return;

    const conversationId = await ensureConversation();
    const payload = {
      conversationId,
      visitorId: localStorage.getItem(storageKey) || conversationId,
      sender: 'visitor',
      visitorName: 'Visitor',
      message: value,
    };

    const response = await fetch(window.buildApiUrl ? window.buildApiUrl('/api/chat/messages') : '/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Message failed.');
    }

    input.value = '';
    await loadMessages();
  }

  toggle.addEventListener('click', async () => {
    const open = !panel.classList.contains('hidden');
    setPanelVisible(!open);

    if (!open) {
      try {
        await ensureConversation();
        await loadMessages();
      } catch (error) {
        console.warn('Live chat could not open.', error);
      }
    }
  });

  close.addEventListener('click', () => setPanelVisible(false));
  form.addEventListener('submit', async event => {
    try {
      await sendMessage(event);
    } catch (error) {
      console.error(error);
      alert('Unable to send message right now. Please try again.');
    }
  });

  setPanelVisible(false);
  if (localStorage.getItem(storageKey)) {
    chatState.conversationId = localStorage.getItem(storageKey);
    loadMessages();
  }
}

function initChatWidgetOnPage() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiveChatWidget, { once: true });
  } else {
    initLiveChatWidget();
  }
}

initChatWidgetOnPage();
