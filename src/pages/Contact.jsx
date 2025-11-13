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
            कुटुंबातील कोणत्याही सदस्याशी संपर्क साधायचा असल्यास किंवा माहिती द्यायची असल्यास,
            कृपया खालील मार्गांचा वापर करा.
          </p>
          
          <ul className="space-y-3">
            <li className="rounded-notion border bg-gray-50 p-4 text-sm font-medium text-gray-900"
              style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}>
              📧 Email: support@Kulswamini-Prathisthan.org
            </li>
            <li className="rounded-notion border bg-gray-50 p-4 text-sm font-medium text-gray-900"
              style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}>
              📞 WhatsApp: +91 968984 4178
            </li>
            <li className="rounded-notion border bg-gray-50 p-4 text-sm font-medium text-gray-900"
              style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}>
              🏠 Address: Barshi, Solapur District, Maharashtra
            </li> 
          </ul>
          
          <p className="text-sm text-gray-600">
            आम्ही शक्य तितक्या लवकर प्रतिसाद देण्याचा प्रयत्न करू. Thank you for staying connected! 🙏
          </p>
        </motion.section>
      </div>
    </div>
  );
};

export default Contact;
