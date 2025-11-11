const normalizeBase = (value) => {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const DEFAULT_API_BASE = 'https://kulswaminiprathisthan.onrender.com';
const API_BASE = normalizeBase(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE);

export function apiFetch(path, options) {
  if (/^https?:/i.test(path)) {
    return fetch(path, options);
  }
  const href = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(href, options);
}

export function getApiBaseUrl() {
  return API_BASE;
}
