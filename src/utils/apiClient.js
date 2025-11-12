const normalizeBase = (value) => {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const DEFAULT_API_BASE = 'https://kulswaminiprathisthan.onrender.com';
const API_BASE = normalizeBase(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE);

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

export function getCacheBustedImageUrl(url) {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
}

export function resolveImageUrl(url) {
  if (!url) return '';
  // Already absolute URL
  if (/^https?:\/\//i.test(url)) {
    // Add cache-busting query param for Cloudinary URLs to prevent stale image caching
    if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${Date.now()}`;
    }
    return url;
  }
  // Relative URL starting with / - prepend API base
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  // Data URL or other format
  return url;
}

export async function uploadImageFile(file, { token = '', folder = 'general', signal } = {}) {
  if (!file) throw new Error('No image file provided');
  const formData = new FormData();
  formData.append('image', file);
  if (folder) {
    formData.append('folder', folder);
  }
  const headers = {};
  if (token) {
    headers['X-Admin-Token'] = token;
  }
  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
    headers,
    signal,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to upload image');
  }
  // Return URL with cache-busting parameter to ensure fresh image on subsequent requests
  const url = data.url || '';
  return url;
}
