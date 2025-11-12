import { useEffect, useMemo, useState } from 'react';
import BrandHeader from '../components/BrandHeader.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useTranslation, useLanguage } from '../context/LanguageContext.jsx';
import { apiFetch, resolveImageUrl } from '../utils/apiClient.js';

const Home = () => {
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [site, setSite] = useState({ title: 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', faviconDataUrl: '' });
  const { t } = useTranslation();
  const { language } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nr, er] = await Promise.all([
          apiFetch('/api/news', { headers: { 'Cache-Control': 'no-store' } }),
          apiFetch('/api/events', { headers: { 'Cache-Control': 'no-store' } })
        ]);
        const nj = await nr.json();
        const ej = await er.json();
        if (!cancelled) {
          setNews(Array.isArray(nj.items) ? nj.items.slice(0, 5) : []);
          setEvents(Array.isArray(ej.items) ? ej.items.slice(0, 5) : []);
        }
      } catch {
        // ignore fetch errors for the landing view
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
  const r = await apiFetch('/api/settings', { headers: { 'Cache-Control': 'no-store' } });
        const j = await r.json();
        if (!cancelled && r.ok) {
          setSite({ title: j.settings?.title || 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', faviconDataUrl: j.settings?.faviconDataUrl || '' });
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  const curatedFeed = useMemo(() => {
    const combined = [
      ...news.map(n => ({ ...n, _type: 'news' })),
      ...events.map(e => ({ ...e, _type: 'event' })),
    ];
    return combined.sort((a, b) => {
      const aSpecial = a.type === 'birthday' || a.type === 'anniversary';
      const bSpecial = b.type === 'birthday' || b.type === 'anniversary';
      if (aSpecial !== bSpecial) return aSpecial ? 1 : -1;
      return (b.date || '').localeCompare(a.date || '');
    });
  }, [news, events]);

  const stats = useMemo(() => ({
    totalNews: news.length,
    totalEvents: events.length,
    specialDays: curatedFeed.filter(item => item.type === 'birthday' || item.type === 'anniversary').length,
  }), [news.length, events.length, curatedFeed]);

  const hasFeed = curatedFeed.length > 0;

  return (
    <div className="page-card full-page home-feed">
      <BrandHeader title={site.title} icon={site.faviconDataUrl} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <LanguageSwitcher />
      </div>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="hero-kicker">{t('home.hero.kicker')}</p>
          <h2>{t('home.hero.heading')}</h2>
          <p className="hero-sub">{t('home.hero.sub')}</p>
          <div className="hero-actions">
            <a href="/family" className="home-button primary">{t('home.hero.ctaTree')}</a>
            <a href="/news" className="home-button">{t('home.hero.ctaNews')}</a>
            <a href="/events" className="home-button">{t('home.hero.ctaEvents')}</a>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <span>{t('home.stats.news')}</span>
            <strong>{stats.totalNews}</strong>
          </div>
          <div className="hero-stat">
            <span>{t('home.stats.events')}</span>
            <strong>{stats.totalEvents}</strong>
          </div>
          <div className="hero-stat">
            <span>{t('home.stats.special')}</span>
            <strong>{stats.specialDays}</strong>
          </div>
        </div>
      </section>

      <section className="home-feed-section">
        <div className="section-header">
          <h3>{t('home.section.feedTitle')}</h3>
          <p>{t('home.section.feedSub')}</p>
        </div>
        {hasFeed ? (
          <div className="feed-grid">
            {curatedFeed.map(item => {
              const isSpecial = item.type === 'birthday' || item.type === 'anniversary';
              const displayTitle = resolveTitle(item);
              const displaySummary = resolveSummary(item) || item.description;
              return (
                <div className="feed-card" key={item.id}>
                  {isSpecial && item.imageUrl ? (
                    <div style={{ padding: '14px 16px' }}>
                      <div className="birthday-inline">
                        <img src={resolveImageUrl(item.imageUrl)} alt={item.title} />
                        <div>
                          <div className="feed-title" style={{ marginBottom: 4 }}>{displayTitle}</div>
                          <div className="feed-meta" style={{ marginBottom: 0 }}>{item.date}</div>
                        </div>
                      </div>
                    </div>
                  ) : item.imageUrl ? (
                    <div className="feed-thumb"><img src={resolveImageUrl(item.imageUrl)} alt={displayTitle || item.title} /></div>
                  ) : (
                    <div className="feed-thumb placeholder">
                      <span>{t('home.feed.placeholder')}</span>
                    </div>
                  )}
                  <div className="feed-body">
                    {isSpecial ? (
                      displaySummary && <p className="feed-summary" style={{ marginTop: 6 }}>{displaySummary}</p>
                    ) : (
                      <>
                        <div className="feed-type">{item._type === 'news' ? t('sidebar.news') : t('sidebar.events')}</div>
                        <div className="feed-title">{displayTitle}</div>
                        <div className="feed-meta">{item.date}{item.time ? ` • ${item.time}` : ''}</div>
                        {displaySummary && <p className="feed-summary">{displaySummary}</p>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="home-empty">
            <h4>{t('home.feed.noUpdatesTitle')}</h4>
            <p>{t('home.feed.noUpdatesCopy')}</p>
            <div className="hero-actions">
              <a href="/family" className="home-button primary">{t('home.feed.ctaTree')}</a>
              <a href="/news" className="home-button">{t('home.feed.ctaNews')}</a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
