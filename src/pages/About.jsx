import { motion } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext.jsx';

const About = () => {
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
            {t('nav.about')}
          </p>
          <h1 className="text-3xl font-extrabold text-slate-950">
            कुलस्वामिनी प्रतिष्ठान बद्दल
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            कुंटुंबाच्या परंपरेला जपण्यासाठी आम्ही सर्वांनी एकत्र येऊन या प्लॅटफॉर्मची निर्मिती केली आहे.
            वंशावळ, बातम्या आणि कार्यक्रम यांद्वारे कुटुंबातील प्रत्येक सदस्य एकमेकांशी जोडलेले राहतील हीच आमची इच्छा.
          </p>
          <p className="text-base leading-relaxed text-slate-600">
            This directory gives caretakers and young members alike a simple way to explore our shared heritage.
            Every update is curated with respect, accuracy, and love.
          </p>
        </motion.section>
      </div>
    </main>
  );
};

export default About;
