import { motion } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext.jsx';

const Contact = () => {
  const { t } = useTranslation();

  return (
    <main className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="space-y-4 rounded-3xl bg-white/95 p-8 shadow-soft ring-1 ring-slate-100"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-500">
            {t('nav.contact')}
          </p>
          <h1 className="text-3xl font-extrabold text-slate-950">
            संपर्क साधा (Contact)
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            कुटुंबातील कोणत्याही सदस्याशी संपर्क साधायचा असल्यास किंवा माहिती द्यायची असल्यास,
            कृपया खालील मार्गांचा वापर करा.
          </p>
          <ul className="space-y-3 text-base text-slate-700">
            <li className="rounded-2xl bg-primary-50 p-4 font-semibold text-primary-700">
              📧 Email: support@kulswamini-family.org
            </li>
            <li className="rounded-2xl bg-primary-50 p-4 font-semibold text-primary-700">
              📞 WhatsApp: +91 98765 43210
            </li>
            <li className="rounded-2xl bg-primary-50 p-4 font-semibold text-primary-700">
              🏠 Address: Barshi, Solapur District, Maharashtra
            </li>
          </ul>
          <p className="text-sm text-slate-500">
            आम्ही शक्य तितक्या लवकर प्रतिसाद देण्याचा प्रयत्न करू. Thank you for staying connected! 🙏
          </p>
        </motion.section>
      </div>
    </main>
  );
};

export default Contact;
