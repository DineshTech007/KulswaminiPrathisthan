import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext.jsx';

const About = () => {
  const { t } = useTranslation();
  const familyPhotos = useMemo(
    () => [
      {
        src: '/family/family-temple-gathering.jpg',
        caption: t('about.gallery.temple'),
      },
      {
        src: '/family/family-sneh-melava.jpg',
        caption: t('about.gallery.hall'),
      },
    ],
    [t]
  );

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
          <div className="pt-6">
            <h2 className="text-center text-xl font-semibold text-primary-600">
              {t('about.gallery.heading')}
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500">
              {t('about.gallery.subheading')}
            </p>
            <div className="mt-6 flex flex-col items-center gap-8">
              {familyPhotos.map(({ src, caption }, index) => (
                <motion.figure
                  key={src}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.05 }}
                  className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white/90 shadow-soft ring-1 ring-slate-100"
                >
                  <img
                    src={src}
                    alt={caption}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    className="h-80 w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.classList.add('hidden');
                      event.currentTarget.setAttribute('aria-hidden', 'true');
                    }}
                  />
                  <figcaption className="px-6 py-4 text-center text-sm font-semibold text-slate-600">
                    {caption}
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
};

export default About;
