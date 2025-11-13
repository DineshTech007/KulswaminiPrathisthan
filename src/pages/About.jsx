import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext.jsx';
import { resolveImageUrl } from '../utils/apiClient.js';

const About = ({ isAdmin = false, adminToken = '' }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const familyPhotos = useMemo(
    () => [
      {
        src: '/family/family-gathering-night.jpg',
        caption: t('about.gallery.temple'),
        alt: 'Family gathering at temple courtyard during night celebration',
        filename: 'family-gathering-night.jpg',
      },
      {
        src: '/family/sneh-melava-gathering.jpg',
        caption: t('about.gallery.hall'),
        alt: 'Family gathering during Sneh Melava celebration in hall',
        filename: 'sneh-melava-gathering.jpg',
      },
    ],
    [t]
  );

  const handleImageUpload = async (e, filename) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(`Uploading ${filename}...`);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'family');

      console.log('Uploading image:', filename, 'with token:', adminToken);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-admin-token': adminToken },
        body: formData,
      });

      console.log('Upload response status:', response.status);
      if (!response.ok) {
        const err = await response.json();
        console.error('Upload error response:', err);
        setUploadStatus(`❌ Upload failed: ${err.error || 'Unknown error'}`);
        e.target.value = '';
        return;
      }

      const result = await response.json();
      console.log('Upload result:', result);
      setUploadStatus(`✅ ${filename} uploaded successfully!`);
      
      // Refresh page after a short delay to show new image
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`❌ Upload error: ${error.message}`);
      e.target.value = '';
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="flex-1 bg-white">
      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-12">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="space-y-6"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('nav.about')}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">
              कुलस्वामिनी प्रतिष्ठान बद्दल
            </h1>
          </div>
          
          <div className="space-y-4 text-base leading-relaxed text-gray-700">
            <p>
              कुंटुंबाच्या परंपरेला जपण्यासाठी आम्ही सर्वांनी एकत्र येऊन या प्लॅटफॉर्मची निर्मिती केली आहे.
              वंशावळ, बातम्या आणि कार्यक्रम यांद्वारे कुटुंबातील प्रत्येक सदस्य एकमेकांशी जोडलेले राहतील हीच आमची इच्छा.
            </p>
            <p>
              This directory gives caretakers and young members alike a simple way to explore our shared heritage.
              Every update is curated with respect, accuracy, and love.
            </p>
          </div>
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('about.gallery.heading')}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {t('about.gallery.subheading')}
            </p>
            <div className="mt-6 flex flex-col gap-6">
              {familyPhotos.map(({ src, caption, alt, filename }, index) => (
                <motion.figure
                  key={src}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.05 }}
                  className="overflow-hidden rounded-notion border bg-white shadow-notion"
                  style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}
                >
                  <img
                    src={resolveImageUrl(src)}
                    alt={alt}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    className="h-96 w-full object-cover"
                    onError={(event) => {
                      console.error('Image failed to load:', src);
                      event.currentTarget.classList.add('hidden');
                      event.currentTarget.setAttribute('aria-hidden', 'true');
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', src);
                    }}
                  />
                  <figcaption className="px-4 py-3 text-sm text-gray-700">
                    {caption}
                  </figcaption>
                  {isAdmin && (
                    <div className="border-t bg-gray-50 px-4 py-3" style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, filename)}
                          disabled={uploading}
                          style={{ display: 'none' }}
                        />
                        <span className="inline-block cursor-pointer rounded-notion bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-gray-800 disabled:bg-gray-400">
                          {uploading ? 'Uploading...' : `Update ${filename.split('.')[0]}`}
                        </span>
                      </label>
                    </div>
                  )}
                </motion.figure>
              ))}
            </div>
            {uploadStatus && (
              <div className="mt-4 rounded-notion border bg-gray-50 px-4 py-2 text-sm text-gray-700"
                style={{ borderColor: 'rgba(55, 53, 47, 0.09)' }}>
                {uploadStatus}
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </main>
  );
};

export default About;