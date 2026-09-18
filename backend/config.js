(function () {
  window.__BROTHERHOOD_CONFIG__ = window.__BROTHERHOOD_CONFIG__ || {};

  const explicitApiBaseUrl = window.BROTHERHOOD_API_BASE_URL || window.__BROTHERHOOD_CONFIG__.apiBaseUrl;
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  window.__BROTHERHOOD_CONFIG__.apiBaseUrl = explicitApiBaseUrl || (isLocalhost
    ? 'http://localhost:3000'
    : 'https://brother-6wg0.onrender.com');

  window.buildApiUrl = function buildApiUrl(path) {
    const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${path}`;
    const baseUrl = String(window.__BROTHERHOOD_CONFIG__.apiBaseUrl || '').replace(/\/$/, '');
    return `${baseUrl}${normalizedPath}`;
  };
})();
