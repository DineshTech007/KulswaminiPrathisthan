import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import AdminToolbar from './AdminToolbar.jsx';
import WaIcon from './WaIcon.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { useTranslation, useLanguage } from '../context/LanguageContext.jsx';
import { apiFetch, uploadImageFile } from '../utils/apiClient.js';
import '../styles/family-tree.css';

const Sidebar = ({ open, onClose, isAdmin = false, isManager = false, token = '', onLoginSuccess, onLogout, siteTitle = '', siteFavicon = '', onSettingsUpdated }) => {
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [adding, setAdding] = useState({ news: false, events: false });
  const [newsForm, setNewsForm] = useState({ title: '', date: '', summary: '', link: '' });
  const [eventForm, setEventForm] = useState({ title: '', date: '', time: '', location: '', description: '', link: '' });
  const [swipeStart, setSwipeStart] = useState(0);
  const sidebarRef = useRef(null);
  const location = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const resolveTitle = (item) => {
    if (language === 'mr' && item.titleMr) return item.titleMr;
    if (language === 'en' && item.titleEn) return item.titleEn;
    return item.title;
  };

  const resolveSummary = (item) => {
    if (language === 'mr' && item.summaryMr) return item.summaryMr;
    if (language === 'en' && item.summaryEn) return item.summaryEn;
    return item.summary || item.description || '';
  };

  // Filter out expired news and events (dates in the past)
  const isDatePast = (dateStr) => {
    if (!dateStr) return false;
    try {
      const itemDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return itemDate < today;
    } catch {
      return false;
    }
  };

  const futureNews = news.filter(item => !isDatePast(item.date));
  const futureEvents = events.filter(item => !isDatePast(item.date));

  const navItems = [
    { to: '/', label: t('sidebar.home'), exact: true },
    { to: '/family', label: t('nav.familyTree') },
    { to: '/directory', label: t('nav.directory') },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') },
    { to: '/news', label: t('sidebar.news') },
    { to: '/events', label: t('sidebar.events') },
  ];

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await apiFetch('/api/news', { headers: { 'Cache-Control': 'no-store' } });
        const json = await res.json();
        if (res.ok) setNews(Array.isArray(json.items) ? json.items.slice(0, 5) : []);
      } catch (err) {
        // ignore
      }
    };
    const fetchEvents = async () => {
      try {
        const res = await apiFetch('/api/events', { headers: { 'Cache-Control': 'no-store' } });
        const json = await res.json();
        if (res.ok) setEvents(Array.isArray(json.items) ? json.items.slice(0, 5) : []);
      } catch (err) {
        // ignore
      }
    };
    fetchNews();
    fetchEvents();
  }, []);

  useEffect(() => {
    // close on route change (mobile UX)
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    // Close sidebar on outside click - add slight delay to allow event to propagate
    const handleClickOutside = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        // Check if click is on the menu button (don't close on it)
        if (!e.target.closest('.menu-button')) {
          onClose?.();
        }
      }
    };

    // Handle swipe gesture to close (swipe left)
    const handleTouchStart = (e) => {
      setSwipeStart(e.touches[0].clientX);
    };

    const handleTouchEnd = (e) => {
      if (swipeStart === 0) return;
      const swipeEnd = e.changedTouches[0].clientX;
      const swipeDistance = swipeStart - swipeEnd;
      
      // If swiped left more than 50px, close sidebar
      if (swipeDistance > 50) {
        onClose?.();
      }
      setSwipeStart(0);
    };

    // Use capture phase to ensure we catch clicks
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [open, onClose, swipeStart]);

  const buildNewsShare = (item) => {
    const title = resolveTitle(item) || t('sidebar.news');
    const date = item.date ? `\n${t('common.dateLabel')}: ${item.date}` : '';
    const summary = resolveSummary(item) ? `\n${resolveSummary(item)}` : '';
    const link = item.link ? `\n${item.link}` : `\n${window.location.origin}/news`;
    return `https://wa.me/?text=${encodeURIComponent(`${title}${date}${summary}${link}`)}`;
  };

  const buildEventShare = (item) => {
    const title = resolveTitle(item) || t('sidebar.events');
    const date = item.date ? `\n${t('common.dateLabel')}: ${item.date}` : '';
    const time = item.time ? `\n${t('common.timeLabel')}: ${item.time}` : '';
    const locationLine = item.location ? `\n${t('common.locationLabel')}: ${item.location}` : '';
    const link = item.link ? `\n${item.link}` : `\n${window.location.origin}/events`;
    return `https://wa.me/?text=${encodeURIComponent(`${title}${date}${time}${locationLine}${link}`)}`;
  };

  return (
    <aside 
      ref={sidebarRef}
      className={`app-sidebar ${open ? 'open' : ''}`} 
      aria-hidden={!open}
      onTouchStart={(e) => setSwipeStart(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (swipeStart === 0) return;
        const swipeEnd = e.changedTouches[0].clientX;
        if (swipeStart - swipeEnd > 50) {
          onClose?.();
        }
        setSwipeStart(0);
      }}
    >
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <h3>{t('sidebar.navigation')}</h3>
          <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">×</button>
        </div>
        <LanguageSwitcher className="sidebar-language" />
        <div style={{ marginBottom: 12 }}>
          <AdminToolbar
            isAdmin={isAdmin}
            role={isAdmin ? 'admin' : (isManager ? 'manager' : '')}
            token={token}
            onLoginSuccess={onLoginSuccess}
            onLogout={onLogout}
          />
        </div>

        {isAdmin && (
          <div className="sidebar-section admin-tools">
            <h4 style={{ marginBottom: 12 }}>{t('family.menu')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="sidebar-link"
                title={t('family.editTitle')}
                onClick={() => {
                  const newTitle = prompt(t('family.editTitle'), siteTitle) || siteTitle;
                  apiFetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
                    body: JSON.stringify({ title: newTitle, faviconDataUrl: siteFavicon })
                  }).then(async (res) => {
                    const json = await res.json();
                    if (res.ok) {
                      alert('Title updated');
                      if (typeof onSettingsUpdated === 'function') onSettingsUpdated();
                    } else {
                      alert(json.error || 'Failed to update title');
                    }
                  }).catch(() => alert('Failed to update title'));
                }}
                style={{ textAlign: 'left' }}
              >
                ✎ {t('family.editTitle')}
              </button>
              <label
                className="sidebar-link"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}
                title={t('family.changeIcon')}
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const iconUrl = await uploadImageFile(file, { token, folder: 'site' });
                      // Add cache-bust parameter for icon
                      const cacheBustedIconUrl = `${iconUrl}?t=${Date.now()}`;
                      const res = await apiFetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
                        body: JSON.stringify({ title: siteTitle, faviconDataUrl: cacheBustedIconUrl }),
                      });
                      const json = await res.json();
                      if (res.ok) {
                        alert('Icon updated');
                        if (typeof onSettingsUpdated === 'function') onSettingsUpdated();
                      } else {
                        alert(json.error || 'Failed to update icon');
                      }
                    } catch (err) {
                      console.error('Icon upload failed:', err);
                      alert(err.message || 'Failed to upload icon');
                    }
                    e.target.value = '';
                  }}}
                />
                🎨 {t('family.changeIcon')}
              </label>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-section">
          <h4>{t('sidebar.latestNews')}</h4>
          <ul className="sidebar-list">
            {futureNews.length === 0 && <li className="muted">{t('sidebar.noNews')}</li>}
            {futureNews.map(item => (
              <li key={item.id} style={{display:'flex', alignItems:'center', gap:8, justifyContent:'space-between'}}>
                <div style={{minWidth:0}}>
                  <Link to="/news" className="sidebar-item-title">{resolveTitle(item)}</Link>
                  <div className="sidebar-item-meta">{item.date}</div>
                </div>
                <a href={buildNewsShare(item)} target="_blank" rel="noreferrer" title="Share on WhatsApp" className="icon-share-btn" style={{width:32,height:32}}>
                  <WaIcon size={18} />
                </a>
              </li>
            ))}
          </ul>
          {(isAdmin || isManager) && (
            <div className="sidebar-add">
              {!adding.news ? (
                <button className="sidebar-link" onClick={() => setAdding(a => ({ ...a, news: true }))}>{t('sidebar.addNews')}</button>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newsForm.title || !newsForm.date) { alert('Title and Date required'); return; }
                  try {
                    let imageUrl = '';
                    const imageFile = e.currentTarget.elements.newsImage?.files?.[0];
                    if (imageFile) {
                      imageUrl = await uploadImageFile(imageFile, { token, folder: 'news' });
                      // Add cache-bust parameter to prevent stale image display
                      imageUrl = `${imageUrl}?t=${Date.now()}`;
                    }
                    const res = await apiFetch('/api/news', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
                      body: JSON.stringify({
                        title: newsForm.title,
                        date: newsForm.date,
                        summary: newsForm.summary,
                        link: newsForm.link,
                        imageUrl,
                      })
                    });
                    const json = await res.json();
                    if (res.ok) {
                      setNewsForm({ title: '', date: '', summary: '', link: '' });
                      setAdding(a => ({ ...a, news: false }));
                      // refresh
                      const r = await apiFetch('/api/news');
                      const j = await r.json();
                      if (r.ok) setNews(Array.isArray(j.items) ? j.items.slice(0,5) : []);
                    } else {
                      alert(json.error || 'Failed to add news');
                    }
                  } catch (err) { 
                    console.error('News upload failed:', err);
                    alert(err.message || 'Failed to add news');
                  }
                }} className="sidebar-form">
                  <input placeholder={t('sidebar.form.title')} value={newsForm.title} onChange={e=>setNewsForm({...newsForm,title:e.target.value})} />
                  <input placeholder={t('sidebar.form.date')} value={newsForm.date} onChange={e=>setNewsForm({...newsForm,date:e.target.value})} />
                  <input placeholder={t('sidebar.form.summary')} value={newsForm.summary} onChange={e=>setNewsForm({...newsForm,summary:e.target.value})} />
                  <input placeholder={t('sidebar.form.link')} value={newsForm.link} onChange={e=>setNewsForm({...newsForm,link:e.target.value})} />
                  <input type="file" name="newsImage" accept="image/*" />
                  <div style={{display:'flex',gap:8}}>
                    <button type="submit" className="sidebar-link">{t('sidebar.actions.save')}</button>
                    <button type="button" className="sidebar-link" onClick={()=>{setAdding(a=>({...a,news:false}));}}>{t('sidebar.actions.cancel')}</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
        <div className="sidebar-section">
          <h4>{t('sidebar.upcomingEvents')}</h4>
          <ul className="sidebar-list">
            {futureEvents.length === 0 && <li className="muted">{t('sidebar.noEvents')}</li>}
            {futureEvents.map(item => (
              <li key={item.id} style={{display:'flex', alignItems:'center', gap:8, justifyContent:'space-between'}}>
                <div style={{minWidth:0}}>
                  <Link to="/events" className="sidebar-item-title">{resolveTitle(item)}</Link>
                  <div className="sidebar-item-meta">{item.date}{item.time ? ` • ${item.time}` : ''}</div>
                </div>
                <a href={buildEventShare(item)} target="_blank" rel="noreferrer" title="Share on WhatsApp" className="icon-share-btn" style={{width:32,height:32}}>
                  <WaIcon size={18} />
                </a>
              </li>
            ))}
          </ul>
          {(isAdmin || isManager) && (
            <div className="sidebar-add">
              {!adding.events ? (
                <button className="sidebar-link" onClick={() => setAdding(a => ({ ...a, events: true }))}>{t('sidebar.addEvent')}</button>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!eventForm.title || !eventForm.date) { alert('Title and Date required'); return; }
                  try {
                    let imageUrl = '';
                    const imageFile = e.currentTarget.elements.eventImage?.files?.[0];
                    if (imageFile) {
                      imageUrl = await uploadImageFile(imageFile, { token, folder: 'events' });
                      // Add cache-bust parameter to prevent stale image display
                      imageUrl = `${imageUrl}?t=${Date.now()}`;
                    }
                    const res = await apiFetch('/api/events', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
                      body: JSON.stringify({
                        title: eventForm.title,
                        date: eventForm.date,
                        time: eventForm.time,
                        location: eventForm.location,
                        description: eventForm.description,
                        link: eventForm.link,
                        imageUrl,
                      })
                    });
                    const json = await res.json();
                    if (res.ok) {
                      setEventForm({ title: '', date: '', time: '', location: '', description: '', link: '' });
                      setAdding(a => ({ ...a, events: false }));
                      // refresh
                      const r = await apiFetch('/api/events');
                      const j = await r.json();
                      if (r.ok) setEvents(Array.isArray(j.items) ? j.items.slice(0,5) : []);
                    } else {
                      alert(json.error || 'Failed to add event');
                    }
                  } catch (err) {
                    console.error('Event upload failed:', err);
                    alert(err.message || 'Failed to add event');
                  }
                }} className="sidebar-form">
                  <input placeholder={t('sidebar.form.title')} value={eventForm.title} onChange={e=>setEventForm({...eventForm,title:e.target.value})} />
                  <input placeholder={t('sidebar.form.date')} value={eventForm.date} onChange={e=>setEventForm({...eventForm,date:e.target.value})} />
                  <input placeholder={t('sidebar.form.time')} value={eventForm.time} onChange={e=>setEventForm({...eventForm,time:e.target.value})} />
                  <input placeholder={t('sidebar.form.location')} value={eventForm.location} onChange={e=>setEventForm({...eventForm,location:e.target.value})} />
                  <input placeholder={t('sidebar.form.description')} value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})} />
                  <input placeholder={t('sidebar.form.link')} value={eventForm.link} onChange={e=>setEventForm({...eventForm,link:e.target.value})} />
                  <input type="file" name="eventImage" accept="image/*" />
                  <div style={{display:'flex',gap:8}}>
                    <button type="submit" className="sidebar-link">{t('sidebar.actions.save')}</button>
                    <button type="button" className="sidebar-link" onClick={()=>{setAdding(a=>({...a,events:false}));}}>{t('sidebar.actions.cancel')}</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
