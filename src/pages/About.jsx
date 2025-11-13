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

    // Check if admin token exists
    if (!adminToken) {
      setUploadStatus('❌ You must be logged in as admin to upload images');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadStatus(`Uploading ${filename}...`);

    try {
      // Create a new file with the specific filename to ensure correct naming
      const fileWithCorrectName = new File([file], filename, { type: file.type });
      
      const formData = new FormData();
      formData.append('image', fileWithCorrectName);
      formData.append('folder', 'family');

      console.log('=== UPLOAD DEBUG INFO ===');
      console.log('Uploading image:', filename);
      console.log('File size:', file.size, 'bytes');
      console.log('File type:', file.type);
      console.log('Admin token:', adminToken ? `${adminToken.substring(0, 10)}...` : 'MISSING');
      console.log('FormData keys:', Array.from(formData.keys()));
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 
          'x-admin-token': adminToken 
        },
        body: formData,
      });

      console.log('=== RESPONSE INFO ===');
      console.log('Status:', response.status, response.statusText);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('Content-Length:', response.headers.get('content-length'));
      
      // Clone response to read it twice if needed
      const responseClone = response.clone();
      
      // Try to get response text
      let text = '';
      try {
        text = await response.text();
        console.log('Response text length:', text.length);
        if (text.length > 0) {
          console.log('Response text (first 500 chars):', text.substring(0, 500));
        } else {
          console.log('Response is EMPTY');
        }
      } catch (readError) {
        console.error('Failed to read response text:', readError);
        throw new Error(`Could not read server response: ${readError.message}`);
      }
      
      // Parse JSON only if we have content
      let result;
      if (text && text.trim()) {
        try {
          result = JSON.parse(text);
          console.log('Parsed JSON successfully:', result);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Full response text:', text);
          throw new Error(`Server returned invalid JSON. Response: ${text.substring(0, 100)}`);
        }
      } else {
        console.error('Empty response received from server');
        console.error('This usually means:');
        console.error('1. The server crashed or timed out');
        console.error('2. Authentication failed silently');
        console.error('3. The endpoint is not responding');
        throw new Error('Server returned empty response. Check console for details.');
      }

      // Check for errors after parsing
      if (!response.ok) {
        console.error('Upload failed with status:', response.status);
        console.error('Error response:', result);
        const errorMsg = result?.error || `Server error (${response.status})`;
        setUploadStatus(`❌ Upload failed: ${errorMsg}`);
        e.target.value = '';
        return;
      }

      console.log('=== UPLOAD SUCCESS ===');
      console.log('Result:', result);
      setUploadStatus(`✅ ${filename} uploaded successfully!`);
      
      // Refresh page after a short delay to show new image
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('=== UPLOAD ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
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