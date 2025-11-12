import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext.jsx';
import locationSample from '../data/locationSample.js';
import { resolveImageUrl } from '../utils/apiClient.js';

const applyFilters = (records, filters) => {
  if (!Array.isArray(records)) return [];
  return records.filter((record) => {
    if (filters.country && record.country !== filters.country) return false;
    if (filters.state && record.state !== filters.state) return false;
    if (filters.city && record.city !== filters.city) return false;
    return true;
  });
};

const parseAddressParts = (address = '') => {
  if (!address) {
    return { city: '', state: '', country: '' };
  }

  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { city: '', state: '', country: '' };
  }

  const country = parts[parts.length - 1] || '';
  const state = parts.length > 1 ? parts[parts.length - 2] : '';
  const city = parts.length > 2 ? parts[parts.length - 3] : parts[0];

  return { city, state, country };
};

const getPhotoFromMember = (member) => {
  const notesImage = member?.notes?.match(/Image:\s*(.*?)(?:\s*\||$)/)?.[1]?.trim();
  if (notesImage) {
    return resolveImageUrl(notesImage);
  }
  return '';
};

const buildRecords = (treeData) => {
  const result = [];

  if (Array.isArray(treeData)) {
    treeData.forEach((member) => {
      if (!member || !member.name) return;
      const { city, state, country } = parseAddressParts(member.address || member.city);
      const photoUrl = getPhotoFromMember(member);
      result.push({
        id: member.id,
        name: member.name,
        address: member.address || '',
        mobile: member.mobile || '',
        city: member.city || city,
        state: member.state || state,
        country: member.country || country,
        photoUrl,
        member,
      });
    });
  }

  const mergedById = new Map();
  [...result, ...locationSample].forEach((entry) => {
    if (!entry) return;
    const key = entry.id || `${entry.name}-${entry.city}`;
    if (!mergedById.has(key)) {
      mergedById.set(key, {
        ...entry,
        city: entry.city || '',
        state: entry.state || '',
        country: entry.country || '',
      });
    }
  });

  return Array.from(mergedById.values()).filter(
    (record) => record.city || record.state || record.country
  );
};

const LocationDirectory = ({ data = [] }) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ country: '', state: '', city: '' });
  const [submittedFilters, setSubmittedFilters] = useState({ country: '', state: '', city: '' });
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  const records = useMemo(() => buildRecords(data), [data]);

  const countryOptions = useMemo(() => {
    const set = new Set();
    records.forEach((record) => {
      if (record.country) set.add(record.country);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const stateOptions = useMemo(() => {
    const set = new Set();
    records.forEach((record) => {
      if (filters.country && record.country !== filters.country) return;
      if (record.state) set.add(record.state);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records, filters.country]);

  const cityOptions = useMemo(() => {
    const set = new Set();
    records.forEach((record) => {
      if (filters.country && record.country !== filters.country) return;
      if (filters.state && record.state !== filters.state) return;
      if (record.city) set.add(record.city);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records, filters.country, filters.state]);

  const filteredRecords = useMemo(
    () => applyFilters(records, submittedFilters),
    [records, submittedFilters]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedMember(null);
      }
    };
    if (selectedMember) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMember]);

  const handleSearch = (event) => {
    event.preventDefault();
    setError(null);
    setIsSearching(true);

    window.setTimeout(() => {
      try {
        setSubmittedFilters(filters);
      } catch (err) {
        console.error('Location directory search failed:', err);
        setError(t('location.error'));
      } finally {
        setIsSearching(false);
      }
    }, 320);
  };

  const handleReset = () => {
    setFilters({ country: '', state: '', city: '' });
    setSubmittedFilters({ country: '', state: '', city: '' });
    setError(null);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'country') {
        next.state = '';
        next.city = '';
      }
      if (field === 'state') {
        next.city = '';
      }
      return next;
    });
  };

  const selectedMeta = useMemo(() => {
    if (!selectedMember) return null;
    return {
      title: selectedMember.name,
      address: selectedMember.address,
      mobile: selectedMember.mobile,
      city: selectedMember.city,
      state: selectedMember.state,
      country: selectedMember.country,
    };
  }, [selectedMember]);

  return (
    <main className="relative flex-1 bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
        <header className="space-y-3 text-slate-900">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary-500">
            {t('location.title')}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
            {t('location.subtitle')}
          </h1>
        </header>

        <form
          onSubmit={handleSearch}
          className="mt-8 rounded-2xl bg-white/95 shadow-soft ring-1 ring-slate-100"
        >
          <div className="grid gap-4 border-b border-slate-100 p-6 md:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              {t('location.labels.country')}
              <select
                value={filters.country}
                onChange={(event) => handleFilterChange('country', event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <option value="">--</option>
                {countryOptions.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              {t('location.labels.state')}
              <select
                value={filters.state}
                onChange={(event) => handleFilterChange('state', event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <option value="">--</option>
                {stateOptions.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              {t('location.labels.city')}
              <select
                value={filters.city}
                onChange={(event) => handleFilterChange('city', event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <option value="">--</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col justify-end gap-3 text-sm font-semibold text-slate-700">
              <button
                type="submit"
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary-500/30 transition hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                {t('location.search')}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-primary-200 px-4 py-2 text-sm font-bold text-primary-600 transition hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                {t('location.clear')}
              </button>
            </div>
          </div>
          <div className="px-6 py-4 text-sm text-slate-500">
            {t('location.resultsCount', { count: filteredRecords.length })}
          </div>
        </form>

        <div className="mt-8 space-y-4">
          {isSearching && (
            <div className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-3 text-sm font-medium text-primary-600 shadow-sm">
              <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-primary-500" aria-hidden />
              <span>{t('location.loading')}</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {!isSearching && filteredRecords.length === 0 && !error && (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-base font-semibold text-slate-600">
              {t('location.noResults')}
            </div>
          )}

          <AnimatePresence>
            {!isSearching && filteredRecords.length > 0 && (
              <motion.div
                key="location-grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
              >
                {filteredRecords.map((record) => (
                  <motion.button
                    key={record.id}
                    type="button"
                    layout
                    whileHover={{ translateY: -4 }}
                    className="group flex w-full items-stretch gap-4 rounded-2xl bg-white p-4 text-left shadow-soft ring-1 ring-transparent transition hover:ring-primary-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                    onClick={() => setSelectedMember(record)}
                  >
                    {record.photoUrl ? (
                      <img
                        src={resolveImageUrl(record.photoUrl)}
                        alt={record.name}
                        className="h-16 w-16 flex-shrink-0 rounded-xl object-cover shadow-sm"
                      />
                    ) : (
                      <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary-100 via-primary-200 to-primary-300 text-xl font-bold text-primary-700 shadow-sm">
                        <span className="flex h-full w-full items-center justify-center">
                          {record.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="truncate text-lg font-semibold text-slate-900">
                        {record.name}
                      </h3>
                      {record.address && (
                        <p className="line-clamp-2 text-sm text-slate-600">
                          {t('location.address')}: {record.address}
                        </p>
                      )}
                      {record.mobile && (
                        <p className="text-sm font-medium text-primary-600">
                          {t('location.mobile')}: {record.mobile}
                        </p>
                      )}
                      <p className="text-xs uppercase tracking-widest text-slate-400">
                        {[record.city, record.state, record.country]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </div>
                    <span
                      className="self-center text-xs font-semibold uppercase tracking-widest text-primary-500 transition group-hover:translate-x-1"
                    >
                      {t('location.viewDetails')}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedMeta && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                aria-label={t('location.modal.close')}
              >
                ×
              </button>
              <div className="space-y-4 text-slate-800">
                <h2 className="text-2xl font-bold text-primary-600">
                  {selectedMeta.title}
                </h2>
                {selectedMeta.address && (
                  <p className="text-sm font-medium text-slate-600">
                    {t('location.address')}: {selectedMeta.address}
                  </p>
                )}
                {selectedMeta.mobile && (
                  <p className="text-sm font-semibold text-primary-600">
                    {t('location.mobile')}: {selectedMeta.mobile}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  {selectedMeta.city && (
                    <div className="rounded-xl bg-primary-50 px-3 py-2 font-semibold text-primary-600">
                      {t('location.labels.city')}: {selectedMeta.city}
                    </div>
                  )}
                  {selectedMeta.state && (
                    <div className="rounded-xl bg-primary-50 px-3 py-2 font-semibold text-primary-600">
                      {t('location.labels.state')}: {selectedMeta.state}
                    </div>
                  )}
                  {selectedMeta.country && (
                    <div className="rounded-xl bg-primary-50 px-3 py-2 font-semibold text-primary-600">
                      {t('location.labels.country')}: {selectedMeta.country}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="rounded-full bg-primary-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-primary-500/30 transition hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                >
                  {t('location.modal.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default LocationDirectory;
