import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FamilyTree from './components/FamilyTree.jsx';
import Sidebar from './components/Sidebar.jsx';
import News from './pages/News.jsx';
import Events from './pages/Events.jsx';
import { apiFetch, resolveImageUrl } from './utils/apiClient.js';
import Home from './pages/Home.jsx';
import { useTranslation } from './context/LanguageContext.jsx';

const MIN_LOADING_DURATION_MS = 900;

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
  const [treeData, setTreeData] = useState([]);
  const [siteSettings, setSiteSettings] = useState({ title: 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', faviconDataUrl: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || '');
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTranslation();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch('/api/data', { headers: { 'Cache-Control': 'no-store' } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load data');
      setTreeData(json.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'Failed to load data');
    }
  }, []);

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
    const load = async () => {
      await checkSession(adminToken);
      await fetchSettings();
      await fetchData();
      if (!cancelled) setLoading(false);
    };
    const timeoutId = setTimeout(load, MIN_LOADING_DURATION_MS);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [fetchData, fetchSettings, checkSession, adminToken]);

  // Apply site title and favicon dynamically
  useEffect(() => {
    if (!siteSettings) return;
    const title = siteSettings.title || 'Family Tree';
    if (document && document.title !== title) {
      document.title = title;
    }
    const setFavicon = (href) => {
      if (!href) return;
      // Resolve relative URLs to absolute
      const resolvedHref = resolveImageUrl(href);
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

  if (loading) {
    return (
      <div className="app-root">
        <div className="loading-card">
          <div className="spinner" aria-hidden="true" />
          <p>{t('app.loadingTree')}</p>
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
        />
        <div className={`app-root ${sidebarOpen ? 'with-sidebar' : ''}`}>
          {error && (
            <div className="error-card" role="alert">
              <h2>Could not load data</h2>
              <p>{error}</p>
              <button onClick={fetchData}>Retry</button>
            </div>
          )}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/family"
              element={(
                <FamilyTree
                  data={treeData}
                  onDataUpdated={fetchData}
                  isAdmin={isAdmin}
                  adminToken={adminToken}
                  onLoginSuccess={handleLoginSuccess}
                  onLogout={handleLogout}
                  siteTitle={siteSettings?.title || 'कुलस्वामिनी प्रतिष्ठान,बार्शी '}
                  siteFavicon={siteSettings?.faviconDataUrl || ''}
                  onSettingsUpdated={fetchSettings}
                  onToggleSidebar={() => setSidebarOpen(o => !o)}
                  role={userRole}
                />
              )}
            />
            <Route path="/news" element={<News isAdmin={isAdmin} isManager={isManager} token={adminToken} />} />
            <Route path="/events" element={<Events isAdmin={isAdmin} isManager={isManager} token={adminToken} />} />
          </Routes>
          <button
            type="button"
            className="floating-sidebar-toggle"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen(o => !o)}
          >☰</button>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
