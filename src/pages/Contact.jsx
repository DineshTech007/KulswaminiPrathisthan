import { motion } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext.jsx';
import BrandHeader from '../components/BrandHeader.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

const Contact = () => {
  const { t } = useTranslation();

  return (
    <div className="page-card full-page contact-page">
      <BrandHeader />
      <div className="news-header">
        <h2>{t('nav.contact')}</h2>
        <LanguageSwitcher />
      </div>
      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-12">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="space-y-6"
        >
          
          <p className="text-base leading-relaxed text-gray-700">
            {t('contact.intro')}
          </p>
          
          <ul className="space-y-3">
            <li className="rounded-notion border bg-gray-50 p-4 text-sm font-medium text-gray-900"
              style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}>
              📧 {t('contact.email')}: support@Kulswamini-Prathisthan.org
            </li>
            <li className="rounded-notion border bg-gray-50 p-4 text-sm font-medium text-gray-900"
              style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}>
              📞 {t('contact.whatsapp')}: +91 968984 4178
            </li>
            <li className="rounded-notion border bg-gray-50 p-4 text-sm font-medium text-gray-900"
              style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}>
              🏠 {t('contact.address')}: {t('contact.addressValue')}
            </li> 
          </ul>
          
          <p className="text-sm text-gray-600">
            {t('contact.footer')}
          </p>
        </motion.section>
      </div>
    </div>
  );
};

export default Contact;
