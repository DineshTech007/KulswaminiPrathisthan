import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resolveImageUrl } from '../utils/apiClient.js';
import '../styles/family-tree.css';

const BrandHeader = ({ title = 'कुलस्वामिनी प्रतिष्ठान,बार्शी ', icon = '', right = null }) => {
  const fallbackInitials = title?.trim()?.[0] ?? 'क';

  return (
    <motion.header
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="tree-header relative isolate overflow-hidden rounded-b-4xl border-b border-white/50 bg-white/80 px-6 py-5 shadow-soft-xl backdrop-blur-xl sm:px-10"
      style={{
        backgroundImage:
          'radial-gradient(circle at 0% -10%, rgba(251, 191, 36, 0.22), transparent 45%), radial-gradient(circle at 100% 0%, rgba(244, 114, 182, 0.18), transparent 48%), linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.72) 100%)',
      }}
    >
      <div className="relative flex flex-wrap items-center gap-5">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="flex items-center gap-4"
        >
          <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-white/70 bg-white/80 shadow-glow-amber shadow-primary-900/10 ring-4 ring-white/40">
            {icon ? (
              <img
                src={resolveImageUrl(icon)}
                alt="Site icon"
                className="h-full w-full rounded-2xl object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-3xl font-display text-brand-600">{fallbackInitials}</span>
            )}
            <span className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/65 via-transparent to-primary-100/35" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[clamp(1.75rem,4vw,2.35rem)] font-display font-semibold leading-snug text-slate-900">
              <Link to="/" className="text-inherit no-underline">
                {title}
              </Link>
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-600">
              <span>कुटुंबाचा इतिहास जपूया</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-700">Preserve Our Family — Together</span>
            </p>
            <p className="max-w-xl text-sm text-slate-600">
              Find your roots, connect with your people, and celebrate every shared memory.
            </p>
          </div>
        </motion.div>
        {right ? (
          <div className="ml-auto flex flex-1 items-center justify-end gap-4">
            {right}
          </div>
        ) : null}
      </div>
      <div className="pointer-events-none absolute -top-20 right-10 h-40 w-40 rounded-full bg-gradient-to-r from-brand-200/55 via-amber-200/35 to-heritage-200/30 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 left-12 h-48 w-48 rounded-full bg-gradient-to-r from-forest-200/45 to-primary-200/40 blur-3xl" aria-hidden="true" />
    </motion.header>
  );
};

export default BrandHeader;
