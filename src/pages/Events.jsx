import React, { useEffect, useMemo, useState } from 'react';
import BrandHeader from '../components/BrandHeader.jsx';
import WaIcon from '../components/WaIcon.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useTranslation, useLanguage } from '../context/LanguageContext.jsx';
import { apiFetch, resolveImageUrl, uploadImageFile } from '../utils/apiClient.js';
import '../styles/family-tree.css';

const birthdayTerms = ['birthday', 'birth day', 'जन्मदिन', 'जन्मदिवस', 'वाढदिवस'];
const anniversaryTerms = ['anniversary', 'वर्धापनदिन', 'स्मृतिदिन'];

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

const parseEventDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const enrichEvents = (items) => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return [...items].map(item => {
    const eventDate = parseEventDate(item.date);
    const isBirthday = detectBirthday(item);
    const isAnniversary = detectAnniversary(item);
    const isPast = eventDate ? eventDate < todayStart : false;
    const isUpcoming = eventDate ? eventDate >= todayStart : false;
    return {
      ...item,
      eventDate,
      isBirthday,
      isAnniversary,
      isPast,
      isUpcoming: isUpcoming && !isBirthday,
    };
  }).sort((a, b) => {
    const weight = (event) => {
      if (event.isBirthday) return 3;
      if (event.isPast) return 2;
      return 0;
    };
    const diff = weight(a) - weight(b);
    if (diff !== 0) return diff;
    if (a.eventDate && b.eventDate) {
      if (weight(a) === 2) {
        return b.eventDate - a.eventDate;
      }
      return a.eventDate - b.eventDate;
    }
    if (a.eventDate) return -1;
    if (b.eventDate) return 1;
    const titleA = toLower(a.title || '');
    const titleB = toLower(b.title || '');
    return titleA.localeCompare(titleB);
  });
};

const Events = ({ isAdmin = false, isManager = false, token = '' }) => {
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState({ title: 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', faviconDataUrl: '' });
  const [activeTab, setActiveTab] = useState('all');
  const { t } = useTranslation();
  const { language } = useLanguage();

  const buildFullName = (member) => {
    if (!member) return '';
    const parts = [];
    if (member.name) parts.push(member.name);
    if (member.fatherName) parts.push(member.fatherName);
    if (member.surname) parts.push(member.surname);
    return parts.filter(Boolean).join(' ');
  };

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

  const enhancedEvents = useMemo(() => enrichEvents(events), [events]);

  const { upcomingEvents, birthdayEvents, pastEvents } = useMemo(() => {
    const upcoming = [];
    const birthdays = [];
    const past = [];
    enhancedEvents.forEach(evt => {
      if (evt.isBirthday) {
        birthdays.push(evt);
      } else if (evt.isPast) {
        past.push(evt);
      } else {
        upcoming.push(evt);
      }
    });
    return { upcomingEvents: upcoming, birthdayEvents: birthdays, pastEvents: past };
  }, [enhancedEvents]);

  const filteredEvents = useMemo(() => {
    if (activeTab === 'upcoming') return upcomingEvents;
    if (activeTab === 'birthdays') return birthdayEvents;
    if (activeTab === 'past') return pastEvents;
    return enhancedEvents;
  }, [activeTab, upcomingEvents, birthdayEvents, pastEvents, enhancedEvents]);

  const tabs = useMemo(() => ([
    { key: 'all', label: t('events.tabs.all'), count: enhancedEvents.length },
    { key: 'upcoming', label: t('events.tabs.upcoming'), count: upcomingEvents.length },
    { key: 'birthdays', label: t('events.tabs.birthdays'), count: birthdayEvents.length },
    { key: 'past', label: t('events.tabs.past'), count: pastEvents.length },
  ]), [enhancedEvents.length, upcomingEvents.length, birthdayEvents.length, pastEvents.length, t]);

  const spotlightEvent = useMemo(() => {
    if (filteredEvents.length > 0) return filteredEvents[0];
    if (activeTab !== 'all') return null;
    if (upcomingEvents.length > 0) return upcomingEvents[0];
    return enhancedEvents[0] || null;
  }, [filteredEvents, activeTab, upcomingEvents, enhancedEvents]);

  // Load events
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
  const res = await apiFetch('/api/events', { headers: { 'Cache-Control': 'no-store' } });
        const json = await res.json();
        if (!cancelled && res.ok) setEvents(Array.isArray(json.items) ? json.items : []);
      } catch {/* ignore */}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load members for full name display
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/members', { headers: { 'Cache-Control': 'no-store' } });
        const json = await res.json();
        if (!cancelled && res.ok) setMembers(Array.isArray(json.items) ? json.items : []);
      } catch {/* ignore */}
    })();
    return () => { cancelled = true; };
  }, []);

  // Load site settings
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
  const r = await apiFetch('/api/settings', { headers: { 'Cache-Control': 'no-store' } });
        const j = await r.json();
        if (!cancelled && r.ok) setSite({ title: j.settings?.title || 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', faviconDataUrl: j.settings?.faviconDataUrl || '' });
      } catch {/* ignore */}
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="page-card"><p>{t('events.loading')}</p></div>;

  return (
    <div className="page-card full-page events-page">
      <BrandHeader />
      <div className="events-header">
        <h2>{t('events.title')}</h2>
        <LanguageSwitcher />
      </div>
      <div className="events-toolbar">
        <div className="events-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`events-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              disabled={tab.key !== 'all' && tab.count === 0}
            >
              <span>{tab.label}</span>
              <span className="events-tab__count">{tab.count}</span>
            </button>
          ))}
        </div>
        <span className="events-count">{t('events.countLabel', { count: filteredEvents.length })}</span>
      </div>
      {spotlightEvent ? (
        <section className={`events-spotlight${spotlightEvent.isBirthday ? ' events-spotlight--birthday' : ''}${spotlightEvent.isPast ? ' events-spotlight--past' : ''}`}>
          <div className="events-spotlight__body">
            <span className="events-spotlight__badge">
              {spotlightEvent.isBirthday
                ? t('events.badge.birthday')
                : spotlightEvent.isAnniversary
                  ? t('events.badge.anniversary')
                  : spotlightEvent.isPast
                    ? t('events.badge.past')
                    : t('events.badge.upcoming')}
            </span>
            <h3 className="events-spotlight__title">{resolveTitle(spotlightEvent)}</h3>
            {(spotlightEvent.date || spotlightEvent.time || spotlightEvent.location) && (
              <div className="events-spotlight__meta">
                {spotlightEvent.date && <span>{spotlightEvent.date}</span>}
                {spotlightEvent.time && <span>{spotlightEvent.time}</span>}
                {spotlightEvent.location && <span>{spotlightEvent.location}</span>}
              </div>
            )}
            {resolveSummary(spotlightEvent) && (
              <p className="events-spotlight__summary">{resolveSummary(spotlightEvent)}</p>
            )}
            <div className="events-spotlight__actions">
              {spotlightEvent.link && (
                <a className="events-spotlight__link" href={spotlightEvent.link} target="_blank" rel="noreferrer">
                  {t('events.moreDetails')}
                </a>
              )}
              <a
                className="events-spotlight__share"
                href={buildWhatsAppShareUrl(spotlightEvent)}
                target="_blank"
                rel="noreferrer"
              >
                <WaIcon size={20} />
                <span>{t('events.shareInvite')}</span>
              </a>
            </div>
          </div>
          {spotlightEvent.imageUrl && (
            <div className="events-spotlight__visual">
              <img src={resolveImageUrl(spotlightEvent.imageUrl)} alt={resolveTitle(spotlightEvent) || spotlightEvent.title} />
            </div>
          )}
        </section>
      ) : null}
      {filteredEvents.length === 0 ? (
        <div className="events-empty">
          <p>{enhancedEvents.length === 0 ? t('events.empty') : t('events.emptyFilter')}</p>
        </div>
      ) : (
        <ul className="events-list">
          {filteredEvents.map(item => {
            const displayTitle = resolveTitle(item);
            const displaySummary = resolveSummary(item) || item.description;
            const badgeLabel = item.isBirthday ? t('events.badge.birthday') : item.isAnniversary ? t('events.badge.anniversary') : item.isPast ? t('events.badge.past') : t('events.badge.upcoming');
            
            // Find member for full name and status
            const memberMatch = members.find(m => 
              m.name && item.title && 
              (m.name.toLowerCase().includes(item.title.toLowerCase()) || 
               item.title.toLowerCase().includes(m.name.toLowerCase()))
            );
            const fullNameDisplay = memberMatch ? buildFullName(memberMatch) : displayTitle;
            const isDeceased = memberMatch?.isDeceased || false;
            const isBirthday = item.isBirthday;
            
            return (
              <li
                key={item.id}
                className={`event-item event-card${item.isBirthday ? ' event-card--birthday' : ''}${item.isAnniversary ? ' event-card--anniversary' : ''}${item.isPast ? ' event-card--past' : ' event-card--upcoming'}`}
              >
                {item.__editing && !(item.isBirthday || item.isAnniversary) ? (
                  <form
                    className="event-edit-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const title = e.currentTarget.elements.title.value.trim();
                      const date = e.currentTarget.elements.date.value.trim();
                      const time = e.currentTarget.elements.time.value.trim();
                      const location = e.currentTarget.elements.location.value.trim();
                      const description = e.currentTarget.elements.description.value.trim();
                      const link = e.currentTarget.elements.link.value.trim();
                      if (!title || !date) { alert('Title and Date required'); return; }
                      
                      try {
                        let imageUrl = item.imageUrl || '';
                        const imageFile = e.currentTarget.elements.image?.files?.[0];
                        if (imageFile) {
                          const { url, timestampedUrl } = await uploadImageFile(imageFile, { token, folder: 'events' });
                          imageUrl = url || timestampedUrl;
                        }
                        
                        const res = await apiFetch(`/api/events/${item.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-Admin-Token': token
                          },
                          body: JSON.stringify({ title, date, time, location, description, link, imageUrl })
                        });
                        const j = await res.json();
                        if (res.ok) {
                          setEvents(list => list.map(x => x.id === item.id ? { ...x, ...j.item, __editing: false } : x));
                        } else {
                          const errorMsg = j.error || 'Edit failed';
                          alert(errorMsg);
                          console.error('Edit failed:', errorMsg);
                        }
                      } catch (err) {
                        alert(err.message || 'An unexpected error occurred during edit.');
                        console.error('Edit submission error:', err);
                      }
                    }}
                  >
                    <input name="title" defaultValue={item.title} placeholder="Title" />
                    <input name="date" defaultValue={item.date} placeholder="Date" />
                    <input name="time" defaultValue={item.time} placeholder="Time" />
                    <input name="location" defaultValue={item.location} placeholder="Location" />
                    <input name="description" defaultValue={item.description} placeholder="Description" />
                    <input name="link" defaultValue={item.link} placeholder="Link" />
                    <input type="file" name="image" accept="image/*" />
                    <div className="event-edit-form__actions">
                      <button type="submit">{t('common.save')}</button>
                      <button type="button" onClick={() => setEvents(list => list.map(x => x.id === item.id ? { ...x, __editing: false } : x))}>{t('common.cancel')}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="event-card__header">
                      <span className={`event-chip${item.isBirthday ? ' event-chip--birthday' : item.isPast ? ' event-chip--past' : ''}`}>{badgeLabel}</span>
                      <div className="event-card__datetime">
                        {item.date && <span>{item.date}</span>}
                        {item.time && <span>{item.time}</span>}
                      </div>
                    </div>
                    <div className={`event-card__body${item.imageUrl ? ' has-media' : ''}`}>
                      {item.imageUrl && (
                        item.isBirthday ? (
                          <div className="event-card__avatar">
                            <img src={resolveImageUrl(item.imageUrl)} alt={displayTitle || item.title} />
                          </div>
                        ) : (
                          <div className="event-card__media">
                            <img src={resolveImageUrl(item.imageUrl)} alt={displayTitle || item.title} />
                          </div>
                        )
                      )}
                      <div className="event-card__content">
                        <h3 className="event-card__title event-title">{fullNameDisplay}</h3>
                        {item.location && <div className="event-card__location">{item.location}</div>}
                        {isBirthday && !isDeceased && <p className="event-desc" style={{color: '#10b981', fontWeight: 600}}>🎂 {t('events.birthdayWish')}</p>}
                        {displaySummary && <p className="event-desc">{displaySummary}</p>}
                      </div>
                    </div>
                    <div className="event-actions event-card__footer">
                      {item.link && <a className="event-link" href={item.link} target="_blank" rel="noreferrer">{t('events.moreDetails')}</a>}
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
                        {(isAdmin || isManager) && !(item.isBirthday || item.isAnniversary) && (
                          <button
                            type="button"
                            className="event-action-btn event-action-btn--edit"
                            title="Edit event"
                            onClick={() => setEvents(list => list.map(x => x.id === item.id ? { ...x, __editing: true } : x))}
                          >✎</button>
                        )}
                        {(isAdmin || isManager) && !(item.isBirthday || item.isAnniversary) && (
                          <button
                            type="button"
                            className="event-action-btn event-action-btn--delete"
                            title="Delete event"
                            onClick={async () => {
                              if (!confirm('Delete this event?')) return;
                              try {
                                  const res = await apiFetch(`/api/events/${item.id}`, { method: 'DELETE', headers: { 'X-Admin-Token': token } });
                                if (res.ok) {
                                  const r = await apiFetch('/api/events', { headers: { 'Cache-Control': 'no-store' } });
                                  const j = await r.json();
                                  if (r.ok) setEvents(Array.isArray(j.items) ? j.items : []);
                                  else setEvents(arr => arr.filter(x => x.id !== item.id));
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
                        {isAdmin && (item.isBirthday || item.isAnniversary) && (
                          <button
                            type="button"
                            className="event-action-btn event-action-btn--delete"
                            title="Delete birthday/anniversary"
                            onClick={async () => {
                              if (!confirm('Delete this birthday/anniversary?')) return;
                              try {
                                  const res = await apiFetch(`/api/events/${item.id}`, { method: 'DELETE', headers: { 'X-Admin-Token': token } });
                                if (res.ok) {
                                  const r = await apiFetch('/api/events', { headers: { 'Cache-Control': 'no-store' } });
                                  const j = await r.json();
                                  if (r.ok) setEvents(Array.isArray(j.items) ? j.items : []);
                                  else setEvents(arr => arr.filter(x => x.id !== item.id));
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

export default Events;
