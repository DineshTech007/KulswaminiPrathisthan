import React, { useEffect, useState } from 'react';
import BrandHeader from '../components/BrandHeader.jsx';
import WaIcon from '../components/WaIcon.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useTranslation, useLanguage } from '../context/LanguageContext.jsx';
import '../styles/family-tree.css';

const Events = ({ isAdmin = false, isManager = false, token = '' }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState({ title: 'कुलस्वामिनी प्रतिष्ठान', faviconDataUrl: '' });
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
    return item.summary;
  };

  const buildWhatsAppShareUrl = (item) => {
    const title = resolveTitle(item) || t('events.title');
    const date = item.date ? `\n${t('common.dateLabel')}: ${item.date}` : '';
    const time = item.time ? `\n${t('common.timeLabel')}: ${item.time}` : '';
    const locationLine = item.location ? `\n${t('common.locationLabel')}: ${item.location}` : '';
  const summaryText = resolveSummary(item) || item.description;
  const description = summaryText ? `\n${summaryText}` : '';
    const link = item.link ? `\n${item.link}` : `\n${window.location.origin}/events`;
    const text = `${title}${date}${time}${locationLine}${description}${link}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // Load events
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/events', { headers: { 'Cache-Control': 'no-store' } });
        const json = await res.json();
        if (!cancelled && res.ok) setEvents(Array.isArray(json.items) ? json.items : []);
      } catch {/* ignore */}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load site settings
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/settings', { headers: { 'Cache-Control': 'no-store' } });
        const j = await r.json();
        if (!cancelled && r.ok) setSite({ title: j.settings?.title || 'कुलस्वामिनी प्रतिष्ठान', faviconDataUrl: j.settings?.faviconDataUrl || '' });
      } catch {/* ignore */}
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="page-card"><p>{t('events.loading')}</p></div>;

  return (
    <div className="page-card full-page">
      <BrandHeader title={site.title} icon={site.faviconDataUrl} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>{t('events.title')}</h2>
        <LanguageSwitcher />
      </div>
      {events.length === 0 ? (<p>{t('events.empty')}</p>) : (
        <ul className="events-list">
          {events.map(item => {
            const isSpecial = item.type === 'birthday' || item.type === 'anniversary';
            const displayTitle = resolveTitle(item);
            const displaySummary = resolveSummary(item) || item.description;
            return (
              <li key={item.id} className="event-item">
              {item.__editing && !isSpecial ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData();
                    const title = e.currentTarget.elements.title.value.trim();
                    const date = e.currentTarget.elements.date.value.trim();
                    const time = e.currentTarget.elements.time.value.trim();
                    const location = e.currentTarget.elements.location.value.trim();
                    const description = e.currentTarget.elements.description.value.trim();
                    const link = e.currentTarget.elements.link.value.trim();
                    if (!title || !date) { alert('Title and Date required'); return; }
                    fd.append('title', title);
                    fd.append('date', date);
                    fd.append('time', time);
                    fd.append('location', location);
                    fd.append('description', description);
                    fd.append('link', link);
                    const imageFile = e.currentTarget.elements.image?.files?.[0];
                    if (imageFile) fd.append('image', imageFile);
                    try {
                      const res = await fetch(`/api/events/${item.id}`, { method: 'PATCH', headers: { 'X-Admin-Token': token }, body: fd });
                      const j = await res.json();
                      if (res.ok) {
                        setEvents(list => list.map(x => x.id === item.id ? { ...x, ...j.item, __editing: false } : x));
                      } else {
                        const errorMsg = j.error || 'Edit failed';
                        alert(errorMsg);
                        console.error('Edit failed:', errorMsg);
                      }
                    } catch (err) {
                      alert('An unexpected error occurred during edit.');
                      console.error('Edit submission error:', err);
                    }
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#fff', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                >
                  <input name="title" defaultValue={item.title} placeholder="Title" />
                  <input name="date" defaultValue={item.date} placeholder="Date" />
                  <input name="time" defaultValue={item.time} placeholder="Time" />
                  <input name="location" defaultValue={item.location} placeholder="Location" />
                  <input name="description" defaultValue={item.description} placeholder="Description" />
                  <input name="link" defaultValue={item.link} placeholder="Link" />
                  <input type="file" name="image" accept="image/*" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 600 }}>Save</button>
                    <button type="button" onClick={() => setEvents(list => list.map(x => x.id === item.id ? { ...x, __editing: false } : x))} style={{ background: '#e2e8f0', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
                  </div>
                </form>
              ) : isSpecial ? (
                <div className="event-special">
                  <div className="birthday-inline">
                    {item.imageUrl && <img src={item.imageUrl} alt={displayTitle || item.title} />}
                    <div>
                      <div className="event-title">{displayTitle}</div>
                      <div className="event-meta">{item.date}{item.time ? ` • ${item.time}` : ''}</div>
                    </div>
                  </div>
                  {displaySummary && <p className="event-desc" style={{marginTop:10}}>{displaySummary}</p>}
                </div>
              ) : (
                <>
                  <div className="event-title">{displayTitle}</div>
                  <div className="event-meta">{item.date}{item.time ? ` • ${item.time}` : ''}</div>
                  {item.imageUrl && (
                    <div className="event-image">
                      <img src={item.imageUrl} alt={displayTitle || item.title} />
                    </div>
                  )}
                  {item.location && <div className="event-location">{item.location}</div>}
                  {displaySummary && <p className="event-desc">{displaySummary}</p>}
                </>
              )}
              <div className="event-actions">
                {item.link && <a className="event-link" href={item.link} target="_blank" rel="noreferrer">{t('events.moreDetails')}</a>}
                <div className="row-actions-right" style={{ marginLeft: 'auto' }}>
                  <a
                    className="icon-share-btn"
                    href={buildWhatsAppShareUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    title="Share on WhatsApp"
                  >
                    <WaIcon size={20} />
                  </a>
                  {(isAdmin || isManager) && !isSpecial && (
                    <button
                      type="button"
                      style={{
                        background: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #0284c7',
                        width: 38,
                        height: 38,
                        borderRadius: '999px',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                      title="Edit event"
                      onClick={() => setEvents(list => list.map(x => x.id === item.id ? { ...x, __editing: true } : x))}
                    >✎</button>
                  )}
                  {(isAdmin || isManager) && !isSpecial && (
                    <button
                      type="button"
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        width: 38,
                        height: 38,
                        borderRadius: '999px',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                      title="Delete event"
                      onClick={async () => {
                        if (!confirm('Delete this event?')) return;
                        try {
                          const res = await fetch(`/api/events/${item.id}`, { method: 'DELETE', headers: { 'X-Admin-Token': token } });
                          if (res.ok) {
                            // Refresh list
                            const r = await fetch('/api/events', { headers: { 'Cache-Control': 'no-store' } });
                            const j = await r.json();
                            if (r.ok) setEvents(Array.isArray(j.items) ? j.items : []);
                            else setEvents(arr => arr.filter(x => x.id !== item.id));
                          } else {
                            const j = await res.json();
                            alert(j.error || 'Delete failed');
                          }
                        } catch { alert('Delete failed'); }
                      }}
                    >✕</button>
                  )}
                </div>
              </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Events;
