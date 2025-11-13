import { useLanguage, useTranslation } from '../context/LanguageContext.jsx';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const LanguageSwitcher = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const handleSwitch = (nextLang) => {
    if (nextLang !== language) {
      setLanguage(nextLang);
    }
  };

  const buttonClasses = (isActive) => cx(
    'relative inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-200 ease-soft-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400 focus-visible:ring-offset-white',
    isActive
      ? 'bg-gradient-to-r from-brand-400 via-primary-500 to-primary-600 text-white shadow-glow-amber'
      : 'bg-white/80 text-primary-700 ring-1 ring-primary-100 hover:bg-primary-50 hover:text-primary-900'
  );

  return (
    <div
      className={cx(
        'language-switcher flex items-center gap-3 rounded-full bg-white/60 px-4 py-2 text-xs font-semibold text-primary-700 shadow-sm shadow-primary-900/5 backdrop-blur-md',
        className
      )}
    >
      <span className="language-switcher-label text-[11px] uppercase tracking-[0.28em] text-brand-600">
        {t('language.switcher.label')}
      </span>
      <div className="language-switcher-buttons flex items-center gap-2" role="group" aria-label={t('language.switcher.label')}>
        <button type="button" className={buttonClasses(language === 'mr')} onClick={() => handleSwitch('mr')}>
          {t('language.switcher.mr')}
        </button>
        <button type="button" className={buttonClasses(language === 'en')} onClick={() => handleSwitch('en')}>
          {t('language.switcher.en')}
        </button>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
