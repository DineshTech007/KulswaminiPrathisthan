import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import BrandHeader from '../components/BrandHeader.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useTranslation, useLanguage } from '../context/LanguageContext.jsx';
import { apiFetch, resolveImageUrl } from '../utils/apiClient.js';

const Home = () => {
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
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

  const statEntries = [
    { label: t('home.stats.news'), value: stats.totalNews, accent: 'from-brand-300 via-primary-400 to-primary-500' },
    { label: t('home.stats.events'), value: stats.totalEvents, accent: 'from-forest-200 via-forest-400 to-forest-500' },
    { label: t('home.stats.special'), value: stats.specialDays, accent: 'from-heritage-100 via-heritage-200 to-heritage-500' },
  ];

  const hasFeed = curatedFeed.length > 0;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 pb-20 pt-12 lg:px-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="/site-icon.png" 
            alt="" 
            className="h-10 w-10 rounded-notion"
          />
          <h1 className="text-2xl font-semibold text-gray-900">{t('site.title')}</h1>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Smooth hero reveal keeps the landing experience warm and welcoming without flash jumps. */}
      <motion.section
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-4xl border border-white/60 bg-white/80 p-8 shadow-soft-xl backdrop-blur-xl lg:p-12"
      >
        <span className="pointer-events-none absolute -left-12 top-10 h-40 w-40 rounded-full bg-heritage-gradient blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-10 -bottom-16 h-48 w-48 rounded-full bg-gradient-to-br from-brand-200/45 via-primary-100/30 to-forest-200/35 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
          <div className="flex flex-col gap-5">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-600">
              {t('home.hero.kicker')}
            </p>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
              className="text-[clamp(1.9rem,3.6vw,2.9rem)] font-display font-semibold leading-tight text-slate-900"
            >
              {t('home.hero.heading')}
              <span className="mt-2 block text-[clamp(1.65rem,3.1vw,2.45rem)] font-bold text-brand-600">
                कुटुंबाचा इतिहास जपूया
              </span>
              <span className="block text-[clamp(1.45rem,2.6vw,2.1rem)] font-semibold text-slate-700">
                Preserve Our Family — Together
              </span>
            </motion.h2>
            <p className="text-base text-slate-600 md:text-lg">{t('home.hero.sub')}</p>
            <p className="text-sm font-medium text-slate-500">
              Find your roots, connect with your people, and pass every story to the next generation.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="/family"
                className="group inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glow-amber transition duration-200 ease-soft-spring hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {t('home.hero.ctaTree')}
              </a>
              <a
                href="/news"
                className="inline-flex items-center justify-center rounded-full border border-primary-200 bg-white/70 px-5 py-3 text-sm font-semibold text-primary-700 shadow-sm backdrop-blur hover:border-primary-300 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200"
              >
                {t('home.hero.ctaNews')}
              </a>
              <a
                href="/events"
                className="inline-flex items-center justify-center rounded-full border border-forest-200 bg-forest-100/70 px-5 py-3 text-sm font-semibold text-forest-700 shadow-sm hover:border-forest-300 hover:text-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-200"
              >
                {t('home.hero.ctaEvents')}
              </a>
            </div>
            <div className="mt-6 grid gap-3 text-sm text-slate-500 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur">
                <p className="text-sm font-semibold text-brand-600">"कुटुंब प्रेमाने जोडलेले"</p>
                <p className="mt-2 text-sm text-slate-600">Let every branch flourish with memories, blessings, and shared celebrations.</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur">
                <p className="text-sm font-semibold text-slate-700">Community Care</p>
                <p className="mt-2 text-sm text-slate-600">Volunteers keep records updated so future generations can trace their heritage with pride.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
              className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1"
            >
              {/* Animated stat cards gently lift to encourage interaction on hover. */}
              {statEntries.map((stat) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ translateY: -6 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 16 }}
                  className="overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-5 shadow-soft backdrop-blur"
                >
                  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.accent} p-0.5` }>
                    <div className="flex flex-col gap-1 rounded-[1.3rem] bg-white/90 px-5 py-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
                        {stat.label}
                      </span>
                      <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      <section className="relative overflow-hidden rounded-4xl border border-white/60 bg-white/80 p-6 shadow-soft-xl backdrop-blur-xl lg:p-9">
        <div className="flex flex-col gap-2 text-left">
          <h3 className="text-[clamp(1.45rem,3vw,2.15rem)] font-display font-semibold text-slate-900">
            {t('home.section.feedTitle')}
          </h3>
          <p className="max-w-2xl text-sm text-slate-600">{t('home.section.feedSub')}</p>
        </div>
        {hasFeed ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {curatedFeed.map((item, index) => {
              const isSpecial = item.type === 'birthday' || item.type === 'anniversary';
              const displayTitle = resolveTitle(item);
              const displaySummary = resolveSummary(item) || item.description;
              const badgeLabel = item._type === 'news' ? t('sidebar.news') : t('sidebar.events');

              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.04 }}
                  whileHover={{ translateY: -8 }}
                  className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-soft backdrop-blur transition-transform duration-200 ease-soft-spring ${
                    isSpecial ? 'shadow-glow-rose' : 'hover:shadow-soft-xl'
                  }`}
                >
                  {item.imageUrl ? (
                    <div className="relative h-52 w-full overflow-hidden">
                      <img
                        src={resolveImageUrl(item.imageUrl)}
                        alt={displayTitle || item.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      {isSpecial ? (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" aria-hidden="true" />
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-52 w-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-heritage-50 text-sm font-semibold text-brand-500">
                      {t('home.feed.placeholder')}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                          isSpecial
                            ? 'bg-heritage-100 text-heritage-600'
                            : 'bg-primary-50 text-primary-700'
                        }`}
                      >
                        {isSpecial ? t('home.stats.special') : badgeLabel}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{item.date}{item.time ? ` • ${item.time}` : ''}</span>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold leading-snug text-slate-900">
                        {displayTitle || item.title}
                      </h4>
                      {displaySummary ? (
                        <p className="text-sm leading-relaxed text-slate-600">{displaySummary}</p>
                      ) : null}
                    </div>
                    {isSpecial ? (
                      <p className="text-sm font-medium text-heritage-600">
                        {language === 'mr' ? 'आनंद साजरा करा आणि प्रेम वाटा.' : 'Celebrate their journey with love and blessings.'}
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>कुटुंब • Family</span>
                      <span>Heritage • वारसा</span>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-4xl border border-dashed border-primary-200 bg-white/70 px-8 py-12 text-center shadow-soft">
            <h4 className="text-xl font-display font-semibold text-slate-900">{t('home.feed.noUpdatesTitle')}</h4>
            <p className="max-w-2xl text-sm text-slate-600">{t('home.feed.noUpdatesCopy')}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="/family"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-400 to-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
              >
                {t('home.feed.ctaTree')}
              </a>
              <a
                href="/news"
                className="inline-flex items-center justify-center rounded-full border border-primary-200 bg-white/70 px-6 py-3 text-sm font-semibold text-primary-700 hover:border-primary-300 hover:text-primary-900"
              >
                {t('home.feed.ctaNews')}
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
