import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext.jsx';
import { translatePlaceName } from '../data/locationTranslations.js';
import { resolveImageUrl } from '../utils/apiClient.js';

const KNOWN_COUNTRIES = new Set([
  'india',
  'भारत',
  'bharat',
  'uae',
  'united arab emirates',
  'united states',
  'usa',
  'canada',
  'australia',
  'united kingdom',
  'uk',
  'qatar',
  'oman',
  'kuwait',
  'japan',
  'germany',
  'saudi arabia',
  'सौदी अरेबिया',
].map((entry) => entry.toLowerCase()));

const applyFilters = (records, filters) => {
  if (!Array.isArray(records)) return [];
  return records.filter((record) => {
    if (filters.country && record.country !== filters.country) return false;
    if (filters.state && record.state !== filters.state) return false;
    if (filters.district && record.district !== filters.district) return false;
    if (filters.city && record.city !== filters.city) return false;
    return true;
  });
};

const parseAddressParts = (address = '') => {
  if (!address) {
    return { city: '', district: '', state: '', country: '' };
  }

  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { city: '', district: '', state: '', country: '' };
  }

  const lastPart = parts[parts.length - 1];
  const hasCountry = lastPart ? KNOWN_COUNTRIES.has(lastPart.toLowerCase()) : false;

  let city = '';
  let district = '';
  let state = '';
  let country = '';

  if (hasCountry) {
    country = parts[parts.length - 1] || '';
    state = parts.length > 1 ? parts[parts.length - 2] : '';
    district = parts.length > 2 ? parts[parts.length - 3] : '';
    if (parts.length > 3) {
      city = parts.slice(0, parts.length - 3).join(', ');
    } else {
      city = parts[0] || '';
    }
  } else {
    country = '';
    state = parts[parts.length - 1] || '';
    district = parts.length > 2 ? parts[parts.length - 2] : '';
    if (parts.length > 2) {
      city = parts.slice(0, parts.length - 2).join(', ');
    } else {
      city = parts[0] || '';
    }
  }

  return {
    city: city || '',
    district: district || '',
    state: state || '',
    country: country || '',
  };
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
      const { city, district, state, country } = parseAddressParts(member.address || member.city);
      const photoUrl = getPhotoFromMember(member);
      result.push({
        id: member.id,
        name: member.name,
        address: member.address || '',
        mobile: member.mobile || '',
        city: member.city || city,
        district: member.district || district,
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
        district: entry.district || '',
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
  const { t, language } = useTranslation();
  const [filters, setFilters] = useState({ country: '', state: '', district: '', city: '' });
  const [submittedFilters, setSubmittedFilters] = useState({ country: '', state: '', district: '', city: '' });
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const records = useMemo(() => buildRecords(data), [data]);

  const formatPlaceLabel = useCallback(
    (value) => translatePlaceName(value, language),
    [language],
  );

  const countryOptions = useMemo(() => {
    const set = new Set();
    records.forEach((record) => {
      if (record.country) set.add(record.country);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const getStatesForCountry = useCallback(
    (country) => {
      if (!country) return [];
      const set = new Set();
      records.forEach((record) => {
        if (record.country === country && record.state) {
          set.add(record.state);
        }
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
    [records]
  );

  const getDistrictsForLocation = useCallback(
    (country, state) => {
      if (!country && !state) return [];
      const set = new Set();
      records.forEach((record) => {
        if (country && record.country && record.country !== country) return;
        if (state && record.state && record.state !== state) return;
        if (record.district) {
          set.add(record.district);
        }
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
    [records]
  );

  const getCitiesForLocation = useCallback(
    (country, state, district) => {
      if (!country && !state && !district) return [];
      const set = new Set();
      records.forEach((record) => {
        if (country && record.country && record.country !== country) return;
        if (state && record.state && record.state !== state) return;
        if (district && record.district && record.district !== district) return;
        if (record.city) set.add(record.city);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
    [records]
  );

  const stateOptions = useMemo(
    () => getStatesForCountry(filters.country),
    [getStatesForCountry, filters.country]
  );

  const districtOptions = useMemo(
    () => getDistrictsForLocation(filters.country, filters.state),
    [getDistrictsForLocation, filters.country, filters.state]
  );

  const cityOptions = useMemo(
    () => getCitiesForLocation(filters.country, filters.state, filters.district),
    [getCitiesForLocation, filters.country, filters.state, filters.district]
  );

  const filteredRecords = useMemo(
    () => applyFilters(records, submittedFilters),
    [records, submittedFilters]
  );

  useEffect(() => {
    if (!countryOptions.length) return;

    const needsInitialization =
      !isInitialized || (filters.country && !countryOptions.includes(filters.country));

    if (!needsInitialization) return;

    const nextCountry = countryOptions[0];
    const nextState = getStatesForCountry(nextCountry)[0] || '';
    const nextDistrict = getDistrictsForLocation(nextCountry, nextState)[0] || '';
    const nextCity = getCitiesForLocation(nextCountry, nextState, nextDistrict)[0] || '';
    const initialFilters = {
      country: nextCountry,
      state: nextState,
      district: nextDistrict,
      city: nextCity,
    };

    setFilters(initialFilters);
    setSubmittedFilters(initialFilters);
    setIsInitialized(true);
  }, [
    countryOptions,
    filters.country,
    getStatesForCountry,
    getDistrictsForLocation,
    getCitiesForLocation,
    isInitialized,
  ]);

  useEffect(() => {
    if (!filters.country) return;

    if (!stateOptions.length) {
      if (!filters.state && !filters.district) return;
      const nextCity = getCitiesForLocation(filters.country, '', '')[0] || '';
      const nextFilters = {
        country: filters.country,
        state: '',
        district: '',
        city: nextCity,
      };
      setFilters(nextFilters);
      setSubmittedFilters(nextFilters);
      return;
    }

    if (!filters.state || stateOptions.includes(filters.state)) return;

    const fallbackState = stateOptions[0];
    const fallbackDistrict = getDistrictsForLocation(filters.country, fallbackState)[0] || '';
    const nextCity = getCitiesForLocation(filters.country, fallbackState, fallbackDistrict)[0] || '';
    const nextFilters = {
      country: filters.country,
      state: fallbackState,
      district: fallbackDistrict,
      city: nextCity,
    };
    setFilters(nextFilters);
    setSubmittedFilters(nextFilters);
  }, [
    filters.country,
    filters.state,
    stateOptions,
    getDistrictsForLocation,
    getCitiesForLocation,
  ]);

  useEffect(() => {
    if (!filters.country) return;

    if (!districtOptions.length) {
      if (!filters.district) return;
      const nextCity = getCitiesForLocation(filters.country, filters.state, '')[0] || '';
      const nextFilters = {
        country: filters.country,
        state: filters.state,
        district: '',
        city: nextCity,
      };
      setFilters(nextFilters);
      setSubmittedFilters(nextFilters);
      return;
    }

    if (!filters.district || districtOptions.includes(filters.district)) return;

    const fallbackDistrict = districtOptions[0];
    const nextCity = getCitiesForLocation(filters.country, filters.state, fallbackDistrict)[0] || '';
    const nextFilters = {
      country: filters.country,
      state: filters.state,
      district: fallbackDistrict,
      city: nextCity,
    };
    setFilters(nextFilters);
    setSubmittedFilters(nextFilters);
  }, [
    filters.country,
    filters.state,
    filters.district,
    districtOptions,
    getCitiesForLocation,
  ]);

  useEffect(() => {
    if (!filters.country) return;

    if (!cityOptions.length) {
      if (!filters.city) return;
      const nextFilters = {
        country: filters.country,
        state: filters.state,
        district: filters.district,
        city: '',
      };
      setFilters(nextFilters);
      setSubmittedFilters(nextFilters);
      return;
    }

    if (!filters.city) return;
    if (cityOptions.includes(filters.city)) return;

    const fallbackCity = cityOptions[0];
    const nextFilters = {
      country: filters.country,
      state: filters.state,
      district: filters.district,
      city: fallbackCity,
    };
    setFilters(nextFilters);
    setSubmittedFilters(nextFilters);
  }, [filters.country, filters.state, filters.district, filters.city, cityOptions]);

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
    const cleared = { country: '', state: '', district: '', city: '' };
    setFilters(cleared);
    setSubmittedFilters(cleared);
    setError(null);
    setIsInitialized(false);
    setIsSearching(false);
  };

  const handleFilterChange = (field, value) => {
    setError(null);
    setIsSearching(false);

    if (field === 'country') {
      const nextState = getStatesForCountry(value)[0] || '';
      const nextDistrict = getDistrictsForLocation(value, nextState)[0] || '';
      const nextCity = getCitiesForLocation(value, nextState, nextDistrict)[0] || '';
      const nextFilters = {
        country: value,
        state: nextState,
        district: nextDistrict,
        city: nextCity,
      };
      setFilters(nextFilters);
      setSubmittedFilters(nextFilters);
      return;
    }

    if (field === 'state') {
      const nextDistrict = getDistrictsForLocation(filters.country, value)[0] || '';
      const nextCity = getCitiesForLocation(filters.country, value, nextDistrict)[0] || '';
      const nextFilters = {
        ...filters,
        state: value,
        district: nextDistrict,
        city: nextCity,
      };
      setFilters(nextFilters);
      setSubmittedFilters(nextFilters);
      return;
    }

    if (field === 'district') {
      const nextCity = getCitiesForLocation(filters.country, filters.state, value)[0] || '';
      const nextFilters = { ...filters, district: value, city: nextCity };
      setFilters(nextFilters);
      setSubmittedFilters(nextFilters);
      return;
    }

    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
    setSubmittedFilters(nextFilters);
  };

  const selectedMeta = useMemo(() => {
    if (!selectedMember) return null;
    return {
      title: selectedMember.name,
      address: selectedMember.address,
      mobile: selectedMember.mobile,
      city: selectedMember.city,
      district: selectedMember.district,
      state: selectedMember.state,
      country: selectedMember.country,
      photoUrl: selectedMember.photoUrl,
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
          <div className="grid gap-4 border-b border-slate-100 p-6 md:grid-cols-5">
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
                    {formatPlaceLabel(country)}
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
                    {formatPlaceLabel(state)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              {t('location.labels.district')}
              <select
                value={filters.district}
                onChange={(event) => handleFilterChange('district', event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <option value="">--</option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {formatPlaceLabel(district)}
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
                    {formatPlaceLabel(city)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col justify-end gap-3 text-sm font-semibold text-slate-700 md:col-span-1">
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
                          {t('location.address')}: {language === 'mr'
                            ? record.address
                                .split(',')
                                .map((part) => formatPlaceLabel(part.trim()))
                                .join(', ')
                            : record.address}
                        </p>
                      )}
                      {record.mobile && (
                        <p className="text-sm font-medium text-primary-600">
                          {t('location.mobile')}: {record.mobile}
                        </p>
                      )}
                      <p className="text-xs uppercase tracking-widest text-slate-400">
                        {[record.city, record.district, record.state, record.country]
                          .filter(Boolean)
                          .map((part) => formatPlaceLabel(part))
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
                {selectedMeta.photoUrl && (
                  <div className="flex justify-center">
                    <img
                      src={resolveImageUrl(selectedMeta.photoUrl)}
                      alt={selectedMeta.title}
                      className="h-32 w-32 rounded-full object-cover shadow-lg ring-4 ring-primary-100"
                    />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-primary-600">
                  {selectedMeta.title}
                </h2>
                {selectedMeta.address && (
                  <p className="text-sm font-medium text-slate-600">
                    {t('location.address')}: {language === 'mr'
                      ? selectedMeta.address
                          ?.split(',')
                          .map((part) => formatPlaceLabel(part.trim()))
                          .join(', ')
                      : selectedMeta.address}
                  </p>
                )}
                {selectedMeta.mobile && (
                  <p className="text-sm font-semibold text-primary-600">
                    {t('location.mobile')}: {selectedMeta.mobile}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 md:grid-cols-4">
                  {selectedMeta.city && (
                    <div className="rounded-xl bg-primary-50 px-3 py-2 font-semibold text-primary-600">
                      {t('location.labels.city')}: {formatPlaceLabel(selectedMeta.city)}
                    </div>
                  )}
                  {selectedMeta.district && (
                    <div className="rounded-xl bg-primary-50 px-3 py-2 font-semibold text-primary-600">
                      {t('location.labels.district')}: {formatPlaceLabel(selectedMeta.district)}
                    </div>
                  )}
                  {selectedMeta.state && (
                    <div className="rounded-xl bg-primary-50 px-3 py-2 font-semibold text-primary-600">
                      {t('location.labels.state')}: {formatPlaceLabel(selectedMeta.state)}
                    </div>
                  )}
                  {selectedMeta.country && (
                    <div className="rounded-xl bg-primary-50 px-3 py-2 font-semibold text-primary-600">
                      {t('location.labels.country')}: {formatPlaceLabel(selectedMeta.country)}
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
