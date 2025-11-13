const normalizeBase = (value) => {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const DEFAULT_API_BASE = 'https://kulswaminiprathisthan.onrender.com';
const API_BASE = normalizeBase(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE);
const CACHE_BUSTER_INTERVAL_MS = 1000 * 60 * 5; // refresh every 5 minutes

const computeCacheBuster = () => Math.floor(Date.now() / CACHE_BUSTER_INTERVAL_MS);

const addCloudinaryCacheParam = (url) => {
  const cacheValue = String(computeCacheBuster());
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('t', cacheValue);
    return urlObj.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${cacheValue}`;
  }
};

export function apiFetch(path, options = {}) {
  if (/^https?:/i.test(path)) {
    const nextOptions = { ...options };
    if (!nextOptions.cache) {
      nextOptions.cache = 'no-store';
    }
    return fetch(path, nextOptions);
  }
  const href = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const nextOptions = { ...options };
  if (!nextOptions.cache) {
    nextOptions.cache = 'no-store';
  }
  return fetch(href, nextOptions);
}

export function getApiBaseUrl() {
  return API_BASE;
}

export function getCacheBustedImageUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) && (url.includes('cloudinary.com') || url.includes('res.cloudinary.com'))) {
    return addCloudinaryCacheParam(url);
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${computeCacheBuster()}`;
}

export function resolveImageUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';

  if (/^data:/i.test(trimmed)) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    if (trimmed.includes('cloudinary.com') || trimmed.includes('res.cloudinary.com')) {
      return addCloudinaryCacheParam(trimmed);
    }
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    // Serve "/family/*" and other asset paths from API_BASE (backend)
    return `${API_BASE}${trimmed}`;
  }

  return trimmed;
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
  const url = data.url || '';
  const timestampedUrl = data.timestampedUrl || (url ? getCacheBustedImageUrl(url) : '');
  return {
    url,
    timestampedUrl,
    uploadedAt: data.uploadedAt || Date.now(),
    publicId: data.public_id || '',
  };
}
