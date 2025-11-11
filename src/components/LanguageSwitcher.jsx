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

  return (
    <div className={cx('language-switcher', className)}>
      <span className="language-switcher-label">{t('language.switcher.label')}:</span>
      <div className="language-switcher-buttons" role="group" aria-label={t('language.switcher.label')}>
        <button
          type="button"
          className={cx('language-switcher-btn', language === 'mr' && 'active')}
          onClick={() => handleSwitch('mr')}
        >
          {t('language.switcher.mr')}
        </button>
        <button
          type="button"
          className={cx('language-switcher-btn', language === 'en' && 'active')}
          onClick={() => handleSwitch('en')}
        >
          {t('language.switcher.en')}
        </button>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
