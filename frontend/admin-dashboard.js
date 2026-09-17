async function requestJson(path, options = {}) {
  const url = window.buildApiUrl ? window.buildApiUrl(path) : path;
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

function setVisible(elementId, visible) {
  const el = document.getElementById(elementId);
  if (el) el.classList.toggle('hidden', !visible);
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function renderTable(tableId, rows, rowMapper, colspan = 6) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  tbody.innerHTML = rows.length
    ? rows.map(rowMapper).join('')
    : `<tr><td colspan="${colspan}" style="text-align:center;opacity:.68;">No records found</td></tr>`;
}

let productsCache = [];

async function loadDashboardData() {
  const stats = await requestJson('/api/admin/stats');
  document.getElementById('statProducts').textContent = stats.totalProducts ?? '0';
  document.getElementById('statOrders').textContent = stats.totalOrders ?? '0';
  document.getElementById('statRevenue').textContent = `$${(stats.totalRevenue ?? 0).toLocaleString()}`;
  document.getElementById('statLowStock').textContent = stats.lowStock?.length ? stats.lowStock.length : '0';
}

async function loadAnalytics() {
  const analytics = await requestJson('/api/admin/analytics');
  const summary = analytics.summary || {};
  document.getElementById('analyticsVisits').textContent = summary.totalVisits ?? '0';
  document.getElementById('analyticsVisitors').textContent = summary.uniqueVisitors ?? '0';
  document.getElementById('analyticsOrders').textContent = summary.totalOrders ?? '0';
  document.getElementById('analyticsRevenue').textContent = `$${(summary.totalRevenue ?? 0).toLocaleString()}`;

  const activityRows = Array.isArray(analytics.recentActivity) ? analytics.recentActivity : [];
  renderTable('analyticsActivityTable', activityRows, item => `
    <tr>
      <td>${(item.type || 'activity').toUpperCase()}</td>
      <td>${item.label || '—'}</td>
      <td>${formatDate(item.timestamp)}</td>
    </tr>
  `, 3);
}

async function renderProducts() {
  productsCache = await requestJson('/api/admin/products');
  renderTable('productsTable', productsCache, product => `
    <tr>
      <td>${product.name || '—'}</td>
      <td>${product.cat || '—'}</td>
      <td>$${Number(product.price ?? 0).toLocaleString()}</td>
      <td>${Number(product.stock ?? 0)}</td>
      <td>${Number(product.sold ?? 0)}</td>
      <td>${Number(product.stock ?? 0) <= 5 ? 'Low' : 'OK'}</td>
      <td>${formatDate(product.updatedAt)}</td>
      <td>
        <button type="button" class="action-btn" data-action="edit" data-id="${product.id}">Edit</button>
        <button type="button" class="action-btn" data-action="delete" data-id="${product.id}">Delete</button>
      </td>
    </tr>
  `, 8);
}

function setProductModalVisible(visible) {
  const overlay = document.getElementById('productModalOverlay');
  if (!overlay) return;
  overlay.classList.toggle('hidden', !visible);
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function resetProductForm() {
  document.getElementById('productId').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('productCategory').value = 'ring';
  document.getElementById('productPrice').value = '';
  document.getElementById('productStock').value = '';
  document.getElementById('productSold').value = '';
  document.getElementById('productImage').value = '';
  document.getElementById('productBadge').value = '';
  document.getElementById('productDesc').value = '';
  document.getElementById('productMaterial').value = '';
  document.getElementById('productDelivery').value = '';
}

function openProductModal(product = null) {
  const title = document.getElementById('productModalTitle');
  const submitButton = document.querySelector('#productForm button[type="submit"]');
  resetProductForm();
  if (product) {
    title.textContent = 'Edit Product';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productCategory').value = product.cat || 'ring';
    document.getElementById('productPrice').value = product.price ?? '';
    document.getElementById('productStock').value = product.stock ?? '';
    document.getElementById('productSold').value = product.sold ?? '';
    document.getElementById('productImage').value = product.image || '';
    document.getElementById('productBadge').value = product.badge || '';
    document.getElementById('productDesc').value = product.desc || '';
    document.getElementById('productMaterial').value = product.material || '';
    document.getElementById('productDelivery').value = product.delivery || '';
    if (submitButton) submitButton.textContent = 'Update Product';
  } else {
    title.textContent = 'Add New Product';
    if (submitButton) submitButton.textContent = 'Save Product';
  }
  setProductModalVisible(true);
}

function closeProductModal() {
  setProductModalVisible(false);
}

async function handleProductFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById('productId').value;
  const product = {
    name: document.getElementById('productName').value.trim(),
    cat: document.getElementById('productCategory').value,
    price: Number(document.getElementById('productPrice').value || 0),
    stock: Number(document.getElementById('productStock').value || 0),
    sold: Number(document.getElementById('productSold').value || 0),
    image: document.getElementById('productImage').value.trim(),
    badge: document.getElementById('productBadge').value.trim(),
    desc: document.getElementById('productDesc').value.trim(),
    material: document.getElementById('productMaterial').value.trim(),
    delivery: document.getElementById('productDelivery').value.trim(),
  };

  if (!product.name || !product.image) {
    alert('Product name and image are required.');
    return;
  }

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
  await requestJson(url, { method, body: JSON.stringify(product) });
  closeProductModal();
  await Promise.all([renderProducts(), loadDashboardData()]);
}

async function handleDeleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  await requestJson(`/api/admin/products/${id}`, { method: 'DELETE' });
  await Promise.all([renderProducts(), loadDashboardData()]);
}

async function loadAdminSession() {
  try {
    const data = await requestJson('/api/auth/me');
    document.getElementById('adminSubtitle').textContent = 'Signed in as ' + data.admin.name;
    await Promise.all([loadDashboardData(), loadAnalytics(), renderProducts(), loadOrders(), loadContacts(), loadInitiations(), loadJoins(), loadChatConversations()]);
  } catch (error) {
    window.location.href = '/admin-login.html';
  }
}

async function loadChatConversations() {
  const conversations = await requestJson('/api/chat/conversations');
  const list = document.getElementById('chatConversationList');
  if (!list) return;

  list.innerHTML = conversations.length
    ? conversations.map(item => `
        <li class="chat-admin-item" data-conversation-id="${item.conversationId}">
          <strong>${item.visitorName || 'Visitor'}</strong>
          <small>${item.lastMessage ? item.lastMessage.slice(0, 48) : 'No messages yet'}</small>
        </li>
      `).join('')
    : '<li class="chat-admin-item"><strong>No chats yet</strong><small>New conversations will appear here.</small></li>';

  const items = list.querySelectorAll('.chat-admin-item');
  const firstConversation = conversations[0]?.conversationId;
  items.forEach(item => {
    item.addEventListener('click', async () => {
      const id = item.dataset.conversationId;
      if (!id) return;
      document.querySelectorAll('.chat-admin-item').forEach(node => node.classList.toggle('active', node === item));
      await openChatConversation(id);
    });
  });

  if (firstConversation && !list.dataset.selected) {
    await openChatConversation(firstConversation);
  }
}

async function openChatConversation(conversationId) {
  const header = document.getElementById('chatThreadHeader');
  const thread = document.getElementById('chatThreadMessages');
  const form = document.getElementById('chatReplyForm');
  const input = document.getElementById('chatReplyInput');
  if (!header || !thread) return;

  const messages = await requestJson(`/api/chat/conversations/${encodeURIComponent(conversationId)}`);
  header.textContent = `Conversation: ${conversationId}`;
  thread.innerHTML = messages.length
    ? messages.map(message => `
        <div class="chat-message-row ${message.sender === 'admin' ? 'mine' : 'them'}">
          <div class="bubble">
            <div>${message.message || ''}</div>
            <small>${new Date(message.createdAt).toLocaleString()}</small>
          </div>
        </div>
      `).join('')
    : '<div class="chat-message-row them"><div class="bubble">No messages yet.</div></div>';
  thread.scrollTop = thread.scrollHeight;

  form.dataset.conversationId = conversationId;
  if (input) input.focus();
}

async function handleChatReply(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = document.getElementById('chatReplyInput');
  const conversationId = form.dataset.conversationId;
  const message = input.value.trim();
  if (!conversationId || !message) return;

  await requestJson('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify({ conversationId, sender: 'admin', visitorName: 'Visitor', message })
  });

  input.value = '';
  await openChatConversation(conversationId);
  await loadChatConversations();
}

async function loadOrders() {
  const orders = await requestJson('/api/admin/orders');
  renderTable('ordersTable', orders, order => `
    <tr>
      <td>${order.orderCode}</td>
      <td>${order.customerName || '—'}</td>
      <td>${order.email || '—'}</td>
      <td>$${Number(order.total || 0).toLocaleString()}</td>
      <td>${order.status || '—'}</td>
      <td>${formatDate(order.createdAt)}</td>
    </tr>
  `);
}

async function loadContacts() {
  const contacts = await requestJson('/api/admin/contacts');
  renderTable('contactsTable', contacts, contact => `
    <tr>
      <td>${contact.name || '—'}</td>
      <td>${contact.email || '—'}</td>
      <td>${contact.subject || '—'}</td>
      <td>${contact.orderCode || '—'}</td>
      <td>${formatDate(contact.createdAt)}</td>
    </tr>
  `);
}

async function loadInitiations() {
  const initiations = await requestJson('/api/admin/initiations');
  renderTable('initiationsTable', initiations, item => `
    <tr>
      <td>${item.name || '—'}</td>
      <td>${item.email || '—'}</td>
      <td>${item.statement || '—'}</td>
      <td>${formatDate(item.createdAt)}</td>
    </tr>
  `);
}

async function loadJoins() {
  const joins = await requestJson('/api/admin/join-applications');
  renderTable('joinsTable', joins, app => `
    <tr>
      <td>${app.fullName || '—'}</td>
      <td>${app.email || '—'}</td>
      <td>${app.country || '—'}</td>
      <td>${app.profession || '—'}</td>
      <td>${formatDate(app.createdAt)}</td>
    </tr>
  `);
}

async function handleLogout() {
  await requestJson('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin-login.html';
}

function attachDashboardEvents() {
  document.getElementById('refreshButton')?.addEventListener('click', () => Promise.all([loadDashboardData(), loadAnalytics(), renderProducts(), loadOrders(), loadContacts(), loadInitiations(), loadJoins()]));
  document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
  document.getElementById('addProductButton')?.addEventListener('click', () => openProductModal());
  document.getElementById('productForm')?.addEventListener('submit', handleProductFormSubmit);
  document.getElementById('cancelProductButton')?.addEventListener('click', closeProductModal);
  document.getElementById('productModalOverlay')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closeProductModal();
  });
  document.getElementById('chatReplyForm')?.addEventListener('submit', handleChatReply);
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const productId = button.dataset.id;
    if (button.dataset.action === 'edit') {
      const product = productsCache.find(item => item.id === productId);
      if (product) openProductModal(product);
    }
    if (button.dataset.action === 'delete') {
      handleDeleteProduct(productId);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  attachDashboardEvents();
  loadAdminSession();
});
