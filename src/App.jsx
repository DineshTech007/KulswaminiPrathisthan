import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FamilyTree from './components/FamilyTree.jsx';
import Sidebar from './components/Sidebar.jsx';
import MainNavigation from './components/MainNavigation.jsx';
import News from './pages/News.jsx';
import Events from './pages/Events.jsx';
import { apiFetch, resolveImageUrl } from './utils/apiClient.js';
import Home from './pages/Home.jsx';
import LocationDirectory from './pages/LocationDirectory.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import { useTranslation } from './context/LanguageContext.jsx';

const MIN_LOADING_DURATION_MS = 900;
const TREE_CACHE_KEY = 'familyTreeCache_v2';

const readTreeCache = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(TREE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.data)) return null;
    return parsed;
  } catch (err) {
    console.warn('Failed to read family tree cache:', err);
    return null;
  }
};

const persistTreeCache = (entry) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(TREE_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('Unable to persist family tree cache:', err);
  }
};

const clearTreeCache = () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(TREE_CACHE_KEY);
  } catch (err) {
    console.warn('Unable to clear family tree cache:', err);
  }
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-root">
          <div className="error-card">
            <h1>Something went wrong</h1>
            <p>{this.state.error?.message || 'Unexpected rendering error.'}</p>
            {this.state.errorInfo?.componentStack && (
              <pre>{this.state.errorInfo.componentStack}</pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  const initialTreeCacheSnapshot = useRef(readTreeCache());
  const [treeData, setTreeData] = useState(() => initialTreeCacheSnapshot.current?.data || []);
  const [siteSettings, setSiteSettings] = useState({ title: 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', faviconDataUrl: '' });
  const [loading, setLoading] = useState(() => !initialTreeCacheSnapshot.current);
  const [error, setError] = useState(null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || '');
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTranslation();
  const treeCacheMetaRef = useRef(initialTreeCacheSnapshot.current);
  const hadInitialCacheRef = useRef(Boolean(initialTreeCacheSnapshot.current));

  const fetchData = useCallback(async (forceRefresh = false) => {
    const cached = treeCacheMetaRef.current;
    try {
      setError(null);
      const headers = { Accept: 'application/json' };
      if (!forceRefresh && cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }

      const res = await apiFetch('/api/data', { headers });

      if (res.status === 304) {
        if (cached?.data) {
          const refreshedCache = { ...cached, fetchedAt: Date.now() };
          treeCacheMetaRef.current = refreshedCache;
          hadInitialCacheRef.current = true;
          persistTreeCache(refreshedCache);
          return cached.data;
        }
        return fetchData(true);
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load data');

      const nextData = Array.isArray(json.data) ? json.data : [];
      setTreeData(nextData);

      const etagHeader = res.headers.get('ETag');
      const versionHeader = res.headers.get('X-Data-Version');
      const refreshedAtHeader = res.headers.get('X-Data-Refreshed-At');

      const nextCache = {
        data: nextData,
        etag: etagHeader || cached?.etag || json?.etag || '',
        version: json?.version || versionHeader || '',
        fetchedAt: Date.now(),
        refreshedAt: json?.refreshedAt || refreshedAtHeader || null,
      };

      treeCacheMetaRef.current = nextCache;
      hadInitialCacheRef.current = true;
      persistTreeCache(nextCache);

      return nextData;
    } catch (err) {
      console.error('Failed to fetch data:', err);
      if (forceRefresh) {
        clearTreeCache();
        treeCacheMetaRef.current = null;
        hadInitialCacheRef.current = false;
      }
      setError(err.message || 'Failed to load data');
      throw err;
    }
  }, [setError]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiFetch('/api/settings', { headers: { 'Cache-Control': 'no-store' } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load settings');
      const settings = json.settings || {};
      setSiteSettings({
        title: settings.title || 'कुलस्वामिनी प्रतिष्ठान,बार्शी ',
        faviconDataUrl: settings.faviconDataUrl || '',
      });
    } catch (err) {
      console.warn('Failed to fetch settings:', err);
      // keep defaults
    }
  }, []);

  const checkSession = useCallback(async (token) => {
    if (!token) { setUserRole(''); return; }
    try {
      const res = await apiFetch('/api/session', { headers: { 'x-admin-token': token } });
      const json = await res.json();
      if (!json.role) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userRole');
        setAdminToken('');
        setUserRole('');
      }
      if (json.role) { setUserRole(json.role); localStorage.setItem('userRole', json.role); }
    } catch (err) {
      console.error('Session check failed:', err);
      setUserRole('');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    const load = async () => {
      const start = Date.now();
      const hadCacheOnEntry = hadInitialCacheRef.current;
      try {
        await checkSession(adminToken);
        await fetchSettings();
        await fetchData();
      } catch (err) {
        if (!cancelled) {
          console.warn('Initial data load encountered an issue:', err);
        }
      } finally {
        if (cancelled) return;
        const finalize = () => {
          if (!cancelled) setLoading(false);
        };

        if (!hadCacheOnEntry) {
          const elapsed = Date.now() - start;
          const remaining = Math.max(0, MIN_LOADING_DURATION_MS - elapsed);
          if (remaining > 0) {
            timeoutId = window.setTimeout(finalize, remaining);
          } else {
            finalize();
          }
          hadInitialCacheRef.current = true;
        } else {
          finalize();
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchData, fetchSettings, checkSession, adminToken]);

  // Apply site title and favicon dynamically
  useEffect(() => {
    if (!siteSettings) return;
    const title = siteSettings.title || 'Family Tree';
    if (document && document.title !== title) {
      document.title = title;
    }
    const setFavicon = (_href) => {
      // Always use static frontend asset. Place your icon at public/site-icon.png
      const resolvedHref = '/site-icon.png';
      // Remove existing icons to avoid conflicts
      const existing = Array.from(document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'));
      existing.forEach((el) => el.parentNode?.removeChild(el));

      const icon32 = document.createElement('link');
      icon32.rel = 'icon';
      icon32.type = 'image/png';
      icon32.sizes = '32x32';
      icon32.href = resolvedHref;

      const iconAny = document.createElement('link');
      iconAny.rel = 'shortcut icon';
      iconAny.type = 'image/png';
      iconAny.href = resolvedHref;

      const apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = resolvedHref;

      document.head.appendChild(icon32);
      document.head.appendChild(iconAny);
      document.head.appendChild(apple);
    };

    setFavicon(siteSettings.faviconDataUrl);
  }, [siteSettings]);

  useEffect(() => {
    // Prevent body scroll when sidebar is open
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLoginSuccess = async (token, role) => {
    localStorage.setItem('adminToken', token);
    if (role) localStorage.setItem('userRole', role);
    setAdminToken(token);
    setUserRole(role || '');
    await checkSession(token);
  };

  const handleLogout = async () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userRole');
    setAdminToken('');
    setUserRole('');
  };

  const handleRetry = () => {
    fetchData(true).catch(() => {
      /* no-op: error state already managed within fetchData */
    });
  };

  if (loading) {
    return (
      <div className="app-root">
        <div className="loading-card">
          <div className="spinner" aria-hidden="true" />
          <p>{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
  {/* Global background layers */}
  <div className="app-background-image" aria-hidden="true" />
  <div className="app-background-blur" aria-hidden="true" />
  <div className="app-background-overlay" aria-hidden="true" />
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isAdmin={isAdmin}
          isManager={isManager}
          token={adminToken}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          siteTitle={siteSettings?.title || 'कुलस्वामिनी प्रतिष्ठान,बार्शी '}
          siteFavicon={siteSettings?.faviconDataUrl || ''}
          onSettingsUpdated={fetchSettings}
        />
        <div className={`app-root ${sidebarOpen ? 'with-sidebar' : ''}`}>
          <MainNavigation />
          {error && (
            <div className="px-4 pt-4">
              <div className="error-card" role="alert">
                <h2>Could not load data</h2>
                <p>{error}</p>
                <button onClick={handleRetry}>Retry</button>
              </div>
            </div>
          )}
          <div className="relative flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/family"
                element={(
                  <FamilyTree
                    data={treeData}
                    onDataUpdated={() => fetchData(true)}
                    isAdmin={isAdmin}
                    adminToken={adminToken}
                    onLoginSuccess={handleLoginSuccess}
                    onLogout={handleLogout}
                    siteTitle={siteSettings?.title || 'कुलस्वामिनी प्रतिष्ठान,बार्शी '}
                    siteFavicon={siteSettings?.faviconDataUrl || ''}
                    onSettingsUpdated={fetchSettings}
                    onToggleSidebar={() => setSidebarOpen((o) => !o)}
                    role={userRole}
                  />
                )}
              />
              <Route path="/news" element={<News isAdmin={isAdmin} isManager={isManager} token={adminToken} />} />
              <Route path="/events" element={<Events isAdmin={isAdmin} isManager={isManager} token={adminToken} />} />
              <Route path="/directory" element={<LocationDirectory data={treeData} />} />
              <Route path="/locations" element={<LocationDirectory data={treeData} />} />
              <Route path="/about" element={<About isAdmin={isAdmin} adminToken={adminToken} />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
            <footer className="app-footer">
              <p>{t('footer.developedBy')}</p>
            </footer>
            <button
              type="button"
              className="floating-sidebar-toggle"
              aria-label="Toggle sidebar"
              onClick={() => setSidebarOpen((o) => !o)}
            >☰</button>
          </div>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
