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

  const [orders, contacts, initiations, joins] = await Promise.all([
    requestJson('/api/admin/orders'),
    requestJson('/api/admin/contacts'),
    requestJson('/api/admin/initiations'),
    requestJson('/api/admin/join-applications')
  ]);

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

  renderTable('contactsTable', contacts, contact => `
    <tr>
      <td>${contact.name || '—'}</td>
      <td>${contact.email || '—'}</td>
      <td>${contact.subject || '—'}</td>
      <td>${contact.orderCode || '—'}</td>
      <td>${formatDate(contact.createdAt)}</td>
    </tr>
  `);

  renderTable('initiationsTable', initiations, item => `
    <tr>
      <td>${item.name || '—'}</td>
      <td>${item.email || '—'}</td>
      <td>${item.statement || '—'}</td>
      <td>${formatDate(item.createdAt)}</td>
    </tr>
  `);

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

async function loadProductTable() {
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
  await Promise.all([loadProductTable(), loadDashboardData()]);
}

async function handleDeleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  await requestJson(`/api/admin/products/${id}`, { method: 'DELETE' });
  await Promise.all([loadProductTable(), loadDashboardData()]);
}

async function loadAdminSession() {
  try {
    const data = await requestJson('/api/auth/me');
    document.getElementById('adminSubtitle').textContent = 'Signed in as ' + data.admin.name;
    setVisible('loginPanel', false);
    setVisible('dashboardPanel', true);
    setVisible('adminActions', true);
    await Promise.all([loadDashboardData(), loadProductTable()]);
  } catch (error) {
    setVisible('loginPanel', true);
    setVisible('dashboardPanel', false);
    setVisible('adminActions', false);
    document.getElementById('adminSubtitle').textContent = 'Please sign in to access the admin dashboard.';
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value.trim();
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';
  try {
    await requestJson('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    await loadAdminSession();
  } catch (error) {
    errorEl.textContent = error.message || 'Unable to sign in.';
    errorEl.style.display = 'block';
  }
}

async function handleLogout() {
  await requestJson('/api/auth/logout', { method: 'POST' });
  loadAdminSession();
}

function attachAdminEvents() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  const refreshButton = document.getElementById('refreshButton');
  if (refreshButton) refreshButton.addEventListener('click', () => Promise.all([loadDashboardData(), loadProductTable()]));
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) logoutButton.addEventListener('click', handleLogout);
  const addProductButton = document.getElementById('addProductButton');
  if (addProductButton) addProductButton.addEventListener('click', () => openProductModal());
  const productForm = document.getElementById('productForm');
  if (productForm) productForm.addEventListener('submit', handleProductFormSubmit);
  const cancelProductButton = document.getElementById('cancelProductButton');
  if (cancelProductButton) cancelProductButton.addEventListener('click', closeProductModal);
  const productOverlay = document.getElementById('productModalOverlay');
  if (productOverlay) {
    productOverlay.addEventListener('click', event => {
      if (event.target === productOverlay) closeProductModal();
    });
  }
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
  attachAdminEvents();
  loadAdminSession();
});

