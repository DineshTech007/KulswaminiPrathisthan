import { useEffect, useState } from 'react';
import { useTranslation } from '../context/LanguageContext.jsx';
import '../styles/family-tree.css';

const AdminToolbar = ({ isAdmin, token, onLoginSuccess, onLogout, role }) => {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      if (!token) return;
      setChecking(true);
      try {
        const res = await fetch('/api/session', { headers: { 'x-admin-token': token } });
        const json = await res.json();
        if (!cancelled && (!json.role || json.role === null)) {
          onLogout();
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [token, onLogout]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (res.ok) {
        onLoginSuccess(json.token, json.role);
        setPassword('');
        setShowModal(false);
      } else {
        setError(json.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', headers: { 'x-admin-token': token } });
    } catch (err) {
      console.error('Logout error:', err);
    }
    onLogout();
  };

  return (
    <div className={`admin-toolbar ${role ? 'admin-active' : ''}`}>
      {role ? (
        <div className="admin-status">
          <span className="role-badge" title={t('admin.modeLabel', { role: role === 'admin' ? t('admin.role.admin') : t('admin.role.manager') })}>
            {t('admin.modeLabel', { role: role === 'admin' ? t('admin.role.admin') : t('admin.role.manager') })}
          </span>
          <button type="button" onClick={handleLogout} className="logout-btn">{t('admin.logout')}</button>
        </div>
      ) : (
        <button
          type="button"
          className="login-btn"
          title={t('admin.loginTitle')}
          onClick={() => setShowModal(true)}
          aria-label={t('admin.loginTitle')}
        >
          {t('admin.loginButton')}
        </button>
      )}

      {showModal && !isAdmin && (
        <div className="login-modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()} role="document">
            <h3>{t('admin.loginTitle')}</h3>
            <form onSubmit={handleLogin} className="admin-login-form">
              <label htmlFor="adminPassword" className="login-label">{t('admin.passwordLabel')}</label>
              <input
                id="adminPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('admin.passwordPlaceholder')}
                disabled={checking}
                autoFocus
              />
              {error && <div className="login-error">{error}</div>}
              <div className="login-actions">
                <button type="submit" disabled={checking || !password.trim()} className="login-btn">{t('admin.loginAction')}</button>
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>{t('admin.cancelAction')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminToolbar;