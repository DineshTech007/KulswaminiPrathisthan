import { useEffect, useState } from 'react';
import BrandHeader from '../components/BrandHeader.jsx';
import WaIcon from '../components/WaIcon.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useTranslation, useLanguage } from '../context/LanguageContext.jsx';

const News = ({ isAdmin = false, isManager = false, token = '' }) => {
  const [news, setNews] = useState([]);
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
    const title = resolveTitle(item) || t('news.title');
    const date = item.date ? `\n${t('common.dateLabel')}: ${item.date}` : '';
    const summaryText = resolveSummary(item);
    const summary = summaryText ? `\n${summaryText}` : '';
    const link = item.link ? `\n${item.link}` : `\n${window.location.origin}/news`;
    const text = `${title}${date}${summary}${link}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/news', { headers: { 'Cache-Control': 'no-store' } });
        const json = await res.json();
        if (!cancelled && res.ok) {
          const items = Array.isArray(json.items) ? json.items : [];
          // Move birthday items to the end
          const regular = items.filter(i => i.type !== 'birthday' && i.type !== 'anniversary');
          const birthdays = items.filter(i => i.type === 'birthday' || i.type === 'anniversary');
          setNews([...regular, ...birthdays]);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/settings', { headers: { 'Cache-Control': 'no-store' } });
        const j = await r.json();
        if (!cancelled && r.ok) setSite({ title: j.settings?.title || 'कुलस्वामिनी प्रतिष्ठान', faviconDataUrl: j.settings?.faviconDataUrl || '' });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="page-card"><p>{t('news.loading')}</p></div>;

  return (
    <div className="page-card full-page">
      <BrandHeader title={site.title} icon={site.faviconDataUrl} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>{t('news.title')}</h2>
        <LanguageSwitcher />
      </div>
      {news.length === 0 ? (<p>{t('news.empty')}</p>) : (
        <ul className="news-list">
           {news.map(item => (
            <li key={item.id} className="news-item">
              {/* Inline small avatar for birthday/anniversary items */}
              {(item.type === 'birthday' || item.type === 'anniversary') && item.imageUrl ? (
                <div className="birthday-inline">
                  <img src={item.imageUrl} alt={resolveTitle(item) || item.title} />
                  <div>
                    <div className="news-title">{resolveTitle(item)}</div>
                    <div className="news-meta">{item.date}</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Edit form */}
                  {item.__editing ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData();
                        const title = e.currentTarget.elements.title.value.trim();
                        const date = e.currentTarget.elements.date.value.trim();
                        const summary = e.currentTarget.elements.summary.value.trim();
                        const link = e.currentTarget.elements.link.value.trim();
                        if (!title || !date) { alert('Title and Date required'); return; }
                        fd.append('title', title);
                        fd.append('date', date);
                        fd.append('summary', summary);
                        fd.append('link', link);
                        const imageFile = e.currentTarget.elements.image?.files?.[0];
                        if (imageFile) fd.append('image', imageFile);
                        try {
                          const res = await fetch(`/api/news/${item.id}`, { method: 'PATCH', headers: { 'X-Admin-Token': token }, body: fd });
                          const j = await res.json();
                          if (res.ok) {
                            setNews(list => list.map(x => x.id === item.id ? { ...x, ...j.item, __editing: false } : x));
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
                      style={{display:'flex',flexDirection:'column',gap:10,background:'#fff',padding:12,borderRadius:12,border:'1px solid #e2e8f0'}}
                    >
                      <input name="title" defaultValue={item.title} placeholder={t('sidebar.form.title')} />
                      <input name="date" defaultValue={item.date} placeholder={t('sidebar.form.date')} />
                      <input name="summary" defaultValue={item.summary} placeholder={t('sidebar.form.summary')} />
                      <input name="link" defaultValue={item.link} placeholder={t('sidebar.form.link')} />
                      <input type="file" name="image" accept="image/*" />
                      <div style={{display:'flex',gap:8}}>
                        <button type="submit" style={{background:'#10b981',color:'#fff',border:'none',padding:'8px 14px',borderRadius:8,fontWeight:600}}>Save</button>
                        <button type="button" onClick={() => setNews(list => list.map(x => x.id === item.id ? { ...x, __editing:false } : x))} style={{background:'#e2e8f0',border:'none',padding:'8px 14px',borderRadius:8,fontWeight:600}}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="news-title">{resolveTitle(item)}</div>
                      <div className="news-meta">{item.date}</div>
                      {item.imageUrl && (
                        <div className="news-image">
                          <img src={item.imageUrl} alt={resolveTitle(item) || item.title} />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              {resolveSummary(item) && <p className="news-summary">{resolveSummary(item)}</p>}
              <div className="news-actions">
                {item.link && <a className="news-link" href={item.link} target="_blank" rel="noreferrer">{t('news.readMore')}</a>}
                <div className="row-actions-right" style={{marginLeft:'auto'}}>
                  <a
                    className="icon-share-btn"
                    href={buildWhatsAppShareUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    title="Share on WhatsApp"
                  >
                    <WaIcon size={20} />
                  </a>
                  {(isAdmin || isManager) && item.type !== 'birthday' && item.type !== 'anniversary' && (
                    <button
                      type="button"
                      style={{
                        background:'#e0f2fe',
                        color:'#0369a1',
                        border:'1px solid #0284c7',
                        width:38,height:38,borderRadius:'999px',cursor:'pointer',fontWeight:700
                      }}
                      title="Edit item"
                      onClick={() => setNews(list => list.map(x => x.id === item.id ? { ...x, __editing:true } : x))}
                    >✎</button>
                  )}
                  {(isAdmin || isManager) && item.type !== 'birthday' && item.type !== 'anniversary' && (
                    <button
                      type="button"
                      style={{
                        background:'#fee2e2',
                        color:'#dc2626',
                        border:'1px solid #fecaca',
                        width:38,height:38,borderRadius:'999px',cursor:'pointer',fontWeight:700
                      }}
                      title="Delete item"
                      onClick={async () => {
                        if (!confirm('Delete this news item?')) return;
                        try {
                          const res = await fetch(`/api/news/${item.id}`, { method: 'DELETE', headers: { 'X-Admin-Token': token } });
                          if (res.ok) {
                            // re-fetch to ensure birthday items remain intact
                            const r = await fetch('/api/news', { headers: { 'Cache-Control':'no-store' } });
                            const j = await r.json();
                            if (r.ok) {
                              const items = Array.isArray(j.items) ? j.items : [];
                              const regular = items.filter(i => i.type !== 'birthday' && i.type !== 'anniversary');
                              const birthdays = items.filter(i => i.type === 'birthday' || i.type === 'anniversary');
                              setNews([...regular, ...birthdays]);
                            } else {
                              setNews(n => n.filter(x => x.id !== item.id));
                            }
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
          ))}
        </ul>
      )}
    </div>
  );
};

export default News;
