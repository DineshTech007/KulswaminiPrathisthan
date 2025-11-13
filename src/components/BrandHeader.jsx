import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resolveImageUrl } from '../utils/apiClient.js';

const BrandHeader = ({ title = 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', icon = '', right = null }) => {
  const fallbackInitials = title?.trim()?.[0] ?? 'क';

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
            {icon ? (
              <img
                src={resolveImageUrl(icon)}
                alt="Site icon"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-xl font-semibold text-gray-900">{fallbackInitials}</span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="m-0 text-lg font-semibold text-gray-900 sm:text-xl">
              <Link to="/" className="text-inherit no-underline hover:text-gray-700">
                {title}
              </Link>
            </h1>
            <p className="text-xs text-gray-600">
              कुटुंबाचा इतिहास जपूया • Preserve Our Family
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
