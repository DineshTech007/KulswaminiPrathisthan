import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext.jsx';

const BrandHeader = ({ right = null }) => {
  const { t, language } = useTranslation();
  const title = t('site.title');
  const subtitle = language === 'mr' ? 'कुटुंबाचा इतिहास जपूया' : 'Preserve Our Family History';
  
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="border-b bg-white px-6 py-4 sm:px-10"
      style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-notion border bg-white"
            style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}>
            <img
              src="/site-icon.png?v=2"
              alt="Site icon"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="m-0 text-lg font-semibold text-gray-900 sm:text-xl">
              <Link to="/" className="text-inherit no-underline hover:text-gray-700">
                {title}
              </Link>
            </h1>
            <p className="text-xs text-gray-600">
              {subtitle}
            </p>
          </div>
        </div>
        {right && (
          <div className="flex items-center">
            {right}
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default BrandHeader;
