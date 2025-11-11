import { useEffect, useMemo, useState } from 'react';
import BrandHeader from '../components/BrandHeader.jsx';
import WaIcon from '../components/WaIcon.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useTranslation, useLanguage } from '../context/LanguageContext.jsx';
import { apiFetch, resolveImageUrl } from '../utils/apiClient.js';

const birthdayTerms = ['birthday', 'birth day', 'जन्मदिन', 'जन्मदिवस', 'वाढदिवस'];
const anniversaryTerms = ['anniversary', 'वर्धापनदिन', 'स्मृतिदिन'];
const RECENT_DAY_WINDOW = 21;

const toLower = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

const hasAnyTerm = (value, terms) => {
  const lower = toLower(value);
  if (!lower) return false;
  return terms.some(term => lower.includes(term));
};

const arrayHasTerm = (value, terms) => {
  if (!Array.isArray(value)) return false;
  return value.some(entry => hasAnyTerm(entry, terms));
};

const detectBirthday = (item) => (
  hasAnyTerm(item.type, birthdayTerms)
  || hasAnyTerm(item.category, birthdayTerms)
  || arrayHasTerm(item.tags, birthdayTerms)
  || hasAnyTerm(item.title, birthdayTerms)
  || hasAnyTerm(item.summary, birthdayTerms)
  || hasAnyTerm(item.summaryMr, birthdayTerms)
  || hasAnyTerm(item.summaryEn, birthdayTerms)
  || hasAnyTerm(item.description, birthdayTerms)
);

const detectAnniversary = (item) => (
  hasAnyTerm(item.type, anniversaryTerms)
  || hasAnyTerm(item.category, anniversaryTerms)
  || arrayHasTerm(item.tags, anniversaryTerms)
  || hasAnyTerm(item.title, anniversaryTerms)
  || hasAnyTerm(item.summary, anniversaryTerms)
  || hasAnyTerm(item.summaryMr, anniversaryTerms)
  || hasAnyTerm(item.summaryEn, anniversaryTerms)
  || hasAnyTerm(item.description, anniversaryTerms)
);

const parseNewsDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const enrichNews = (items) => {
  const now = Date.now();
  const recentThreshold = now - RECENT_DAY_WINDOW * 24 * 60 * 60 * 1000;
  return [...items].map(item => {
    const publishDate = parseNewsDate(item.date);
    const timestamp = publishDate ? publishDate.getTime() : null;
    const isBirthday = detectBirthday(item);
    const isAnniversary = detectAnniversary(item);
    const isRecent = timestamp ? timestamp >= recentThreshold : false;
    return {
      ...item,
      publishDate,
      isBirthday,
      isAnniversary,
      isRecent,
    };
  }).sort((a, b) => {
    if (a.isBirthday !== b.isBirthday) return a.isBirthday ? 1 : -1;
    if (a.isAnniversary !== b.isAnniversary) return a.isAnniversary ? 1 : -1;
    if (a.publishDate && b.publishDate) return b.publishDate - a.publishDate;
    if (a.publishDate) return -1;
    if (b.publishDate) return 1;
    const titleA = toLower(a.title || '');
    const titleB = toLower(b.title || '');
    return titleA.localeCompare(titleB);
  });
};

const News = ({ isAdmin = false, isManager = false, token = '' }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState({ title: 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', faviconDataUrl: '' });
  const [activeTab, setActiveTab] = useState('all');
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

  const enhancedNews = useMemo(() => enrichNews(news), [news]);

  const celebrationNews = useMemo(
    () => enhancedNews.filter(item => item.isBirthday || item.isAnniversary),
    [enhancedNews]
  );

  const highlightNews = useMemo(
    () => enhancedNews.filter(item => !(item.isBirthday || item.isAnniversary) && item.isRecent),
    [enhancedNews]
  );

  const filteredNews = useMemo(() => {
    if (activeTab === 'highlights') return highlightNews;
    if (activeTab === 'celebrations') return celebrationNews;
    return enhancedNews;
  }, [activeTab, enhancedNews, highlightNews, celebrationNews]);

  const tabs = useMemo(() => ([
    { key: 'all', label: t('news.tabs.all'), count: enhancedNews.length },
    { key: 'highlights', label: t('news.tabs.highlights'), count: highlightNews.length },
    { key: 'celebrations', label: t('news.tabs.celebrations'), count: celebrationNews.length },
  ]), [enhancedNews.length, highlightNews.length, celebrationNews.length, t]);

  const spotlightNews = useMemo(() => {
    if (filteredNews.length > 0) return filteredNews[0];
    if (activeTab !== 'all') return null;
    if (highlightNews.length > 0) return highlightNews[0];
    return enhancedNews[0] || null;
  }, [filteredNews, activeTab, highlightNews, enhancedNews]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
  const res = await apiFetch('/api/news', { headers: { 'Cache-Control': 'no-store' } });
        const json = await res.json();
        if (!cancelled && res.ok) {
          const items = Array.isArray(json.items) ? json.items : [];
          setNews(items);
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
  const r = await apiFetch('/api/settings', { headers: { 'Cache-Control': 'no-store' } });
        const j = await r.json();
        if (!cancelled && r.ok) setSite({ title: j.settings?.title || 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', faviconDataUrl: j.settings?.faviconDataUrl || '' });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="page-card"><p>{t('news.loading')}</p></div>;

  return (
    <div className="page-card full-page news-page">
      <BrandHeader title={site.title} icon={site.faviconDataUrl} />
      <div className="news-header">
        <h2>{t('news.title')}</h2>
        <LanguageSwitcher />
      </div>
      <div className="news-toolbar">
        <div className="news-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`news-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              disabled={tab.key !== 'all' && tab.count === 0}
            >
              <span>{tab.label}</span>
              <span className="news-tab__count">{tab.count}</span>
            </button>
          ))}
        </div>
        <span className="news-count">{t('news.countLabel', { count: filteredNews.length })}</span>
      </div>
      {spotlightNews ? (
        <section className={`news-spotlight${spotlightNews.isBirthday ? ' news-spotlight--birthday' : ''}${spotlightNews.isAnniversary ? ' news-spotlight--anniversary' : ''}`}>
          <div className="news-spotlight__body">
            <span className="news-spotlight__badge">
              {spotlightNews.isBirthday
                ? t('news.badge.birthday')
                : spotlightNews.isAnniversary
                  ? t('news.badge.anniversary')
                  : spotlightNews.isRecent
                    ? t('news.badge.latest')
                    : t('news.badge.story')}
            </span>
            <h3 className="news-spotlight__title">{resolveTitle(spotlightNews)}</h3>
            {(spotlightNews.date || spotlightNews.location) && (
              <div className="news-spotlight__meta">
                {spotlightNews.date && <span>{spotlightNews.date}</span>}
                {spotlightNews.location && <span>{spotlightNews.location}</span>}
              </div>
            )}
            {resolveSummary(spotlightNews) && (
              <p className="news-spotlight__summary">{resolveSummary(spotlightNews)}</p>
            )}
            <div className="news-spotlight__actions">
              {spotlightNews.link && (
                <a className="news-spotlight__link" href={spotlightNews.link} target="_blank" rel="noreferrer">
                  {t('news.readMore')}
                </a>
              )}
              <a
                className="news-spotlight__share"
                href={buildWhatsAppShareUrl(spotlightNews)}
                target="_blank"
                rel="noreferrer"
              >
                <WaIcon size={20} />
                <span>{t('news.shareStory')}</span>
              </a>
            </div>
          </div>
          {spotlightNews.imageUrl && (
            <div className="news-spotlight__visual">
              <img src={resolveImageUrl(spotlightNews.imageUrl)} alt={resolveTitle(spotlightNews) || spotlightNews.title} />
            </div>
          )}
        </section>
      ) : null}
      {filteredNews.length === 0 ? (
        <div className="news-empty">
          <p>{enhancedNews.length === 0 ? t('news.empty') : t('news.emptyFilter')}</p>
        </div>
      ) : (
        <ul className="news-grid">
          {filteredNews.map(item => {
            const displayTitle = resolveTitle(item);
            const displaySummary = resolveSummary(item);
            const isCelebration = item.isBirthday || item.isAnniversary;
            const badgeLabel = item.isBirthday
              ? t('news.badge.birthday')
              : item.isAnniversary
                ? t('news.badge.anniversary')
                : item.isRecent
                  ? t('news.badge.latest')
                  : t('news.badge.story');
            return (
              <li
                key={item.id}
                className={`news-card${item.isBirthday ? ' news-card--birthday' : ''}${item.isAnniversary ? ' news-card--anniversary' : ''}${item.isRecent ? ' news-card--recent' : ''}`}
              >
                {item.__editing && !isCelebration ? (
                  <form
                    className="event-edit-form news-edit-form"
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
                        const res = await apiFetch(`/api/news/${item.id}`, { method: 'PATCH', headers: { 'X-Admin-Token': token }, body: fd });
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
                  >
                    <input name="title" defaultValue={item.title} placeholder={t('sidebar.form.title')} />
                    <input name="date" defaultValue={item.date} placeholder={t('sidebar.form.date')} />
                    <input name="summary" defaultValue={item.summary} placeholder={t('sidebar.form.summary')} />
                    <input name="link" defaultValue={item.link} placeholder={t('sidebar.form.link')} />
                    <input type="file" name="image" accept="image/*" />
                    <div className="event-edit-form__actions">
                      <button type="submit">{t('common.save')}</button>
                      <button type="button" onClick={() => setNews(list => list.map(x => x.id === item.id ? { ...x, __editing: false } : x))}>{t('common.cancel')}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="news-card__header">
                      <span className={`news-chip${item.isBirthday ? ' news-chip--birthday' : item.isAnniversary ? ' news-chip--anniversary' : item.isRecent ? ' news-chip--recent' : ''}`}>{badgeLabel}</span>
                      <div className="news-card__meta">
                        {item.date && <span>{item.date}</span>}
                        {item.location && <span>{item.location}</span>}
                      </div>
                    </div>
                    <div className={`news-card__body${item.imageUrl ? ' has-media' : ''}`}>
                      {item.imageUrl && (
                        isCelebration ? (
                          <div className="news-card__avatar">
                            <img src={resolveImageUrl(item.imageUrl)} alt={displayTitle || item.title} />
                          </div>
                        ) : (
                          <div className="news-card__media">
                            <img src={resolveImageUrl(item.imageUrl)} alt={displayTitle || item.title} />
                          </div>
                        )
                      )}
                      <div className="news-card__content">
                        <h3 className="news-card__title news-title">{displayTitle}</h3>
                        {displaySummary && <p className="news-summary">{displaySummary}</p>}
                      </div>
                    </div>
                    <div className="news-actions news-card__footer">
                      {item.link && <a className="news-link" href={item.link} target="_blank" rel="noreferrer">{t('news.readMore')}</a>}
                      <div className="row-actions-right">
                        <a
                          className="icon-share-btn"
                          href={buildWhatsAppShareUrl(item)}
                          target="_blank"
                          rel="noreferrer"
                          title="Share on WhatsApp"
                        >
                          <WaIcon size={20} />
                        </a>
                        {(isAdmin || isManager) && !isCelebration && (
                          <button
                            type="button"
                            className="event-action-btn event-action-btn--edit"
                            title="Edit item"
                            onClick={() => setNews(list => list.map(x => x.id === item.id ? { ...x, __editing: true } : x))}
                          >✎</button>
                        )}
                        {(isAdmin || isManager) && !isCelebration && (
                          <button
                            type="button"
                            className="event-action-btn event-action-btn--delete"
                            title="Delete item"
                            onClick={async () => {
                              if (!confirm('Delete this news item?')) return;
                              try {
                                const res = await apiFetch(`/api/news/${item.id}`, { method: 'DELETE', headers: { 'X-Admin-Token': token } });
                                if (res.ok) {
                                  const r = await apiFetch('/api/news', { headers: { 'Cache-Control': 'no-store' } });
                                  const j = await r.json();
                                  if (r.ok) setNews(Array.isArray(j.items) ? j.items : []);
                                  else setNews(arr => arr.filter(x => x.id !== item.id));
                                } else {
                                  const j = await res.json();
                                  alert(j.error || 'Delete failed');
                                }
                              } catch {
                                alert('Delete failed');
                              }
                            }}
                          >✕</button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default News;
