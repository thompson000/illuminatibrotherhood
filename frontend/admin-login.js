async function requestJson(path, options = {}) {
  const url = window.buildApiUrl ? window.buildApiUrl(path) : path;
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value.trim();
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  try {
    await requestJson('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    window.location.href = '/admin-dashboard.html';
  } catch (error) {
    errorEl.textContent = error.message || 'Unable to sign in.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
});
