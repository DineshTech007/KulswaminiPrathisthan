import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID, scryptSync, timingSafeEqual, createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Ensure images directories exist
const IMAGES_DIR = path.join(__dirname, '../assets/images');
const FAMILY_DIR = path.join(__dirname, '../assets/family');
try {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  await fs.mkdir(FAMILY_DIR, { recursive: true });
} catch (err) {
  if (err?.code !== 'EEXIST') {
    console.warn('Unable to ensure images directory:', err?.message || err);
  }
}

// Serve static images (always return fresh files to avoid stale caches)
const staticNoCache = {
  setHeaders(res) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  },
};

app.use('/assets/images', express.static(IMAGES_DIR, staticNoCache));
app.use('/family', express.static(FAMILY_DIR, staticNoCache));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const DATA_FILE_PATH = path.join(__dirname, '../assets/data/data.js');
const SITE_FILE_PATH = path.join(__dirname, '../assets/data/site.json');
const NEWS_FILE_PATH = path.join(__dirname, '../assets/data/news.json');
const EVENTS_FILE_PATH = path.join(__dirname, '../assets/data/events.json');

const DATA_CACHE_STATE = {
  data: null,
  meta: {
    version: '',
    etag: '',
    refreshedAt: 0,
    mtimeMs: 0,
    size: 0,
  },
  promise: null,
};

const cloneData = (value) => JSON.parse(JSON.stringify(value));

async function refreshDataCache() {
  if (!DATA_FILE_PATH) return null;
  const loadPromise = (async () => {
    const [content, stats] = await Promise.all([
      fs.readFile(DATA_FILE_PATH, 'utf-8'),
      fs.stat(DATA_FILE_PATH),
    ]);
    const dataMatch = content.match(/const data = (\[[\s\S]*?\]);/);
    if (!dataMatch) {
      throw new Error('Invalid data file format');
    }
    const parsed = JSON.parse(dataMatch[1]);
    const etag = createHash('sha1').update(content).digest('hex');
    DATA_CACHE_STATE.data = parsed;
    DATA_CACHE_STATE.meta = {
      version: `${Math.round(stats.mtimeMs)}-${stats.size}`,
      etag,
      refreshedAt: Date.now(),
      mtimeMs: stats.mtimeMs,
      size: stats.size,
    };
    return parsed;
  })()
    .catch((err) => {
      DATA_CACHE_STATE.data = null;
      DATA_CACHE_STATE.meta = {
        version: '',
        etag: '',
        refreshedAt: 0,
        mtimeMs: 0,
        size: 0,
      };
      throw err;
    })
    .finally(() => {
      DATA_CACHE_STATE.promise = null;
    });

  DATA_CACHE_STATE.promise = loadPromise;
  await loadPromise;
  return DATA_CACHE_STATE.data;
}

async function ensureDataCache(force = false) {
  if (force) {
    return refreshDataCache();
  }
  if (DATA_CACHE_STATE.data) {
    return DATA_CACHE_STATE.data;
  }
  if (DATA_CACHE_STATE.promise) {
    await DATA_CACHE_STATE.promise;
    return DATA_CACHE_STATE.data;
  }
  return refreshDataCache();
}

function invalidateDataCache() {
  DATA_CACHE_STATE.data = null;
  DATA_CACHE_STATE.meta = {
    version: '',
    etag: '',
    refreshedAt: 0,
    mtimeMs: 0,
    size: 0,
  };
}

async function getDataWithMeta(force = false) {
  await ensureDataCache(force);
  return {
    data: DATA_CACHE_STATE.data,
    meta: { ...DATA_CACHE_STATE.meta },
  };
}

try {
  fsSync.watchFile(DATA_FILE_PATH, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs === prev.mtimeMs) {
      return;
    }
    invalidateDataCache();
    refreshDataCache().catch((err) => {
      console.error('Failed to refresh data cache after file change:', err);
    });
  });
} catch (watchError) {
  console.warn('Unable to watch data file for changes:', watchError?.message || watchError);
}

refreshDataCache().catch((err) => {
  console.warn('Initial data cache warmup failed:', err?.message || err);
});

// Compress image based on type
async function compressImage(buffer, type = 'photo') {
  const sharpInstance = sharp(buffer);
  
  // Get image metadata
  const metadata = await sharpInstance.metadata();
  console.log(`📊 Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
  
  if (type === 'icon' || type === 'site') {
    // Icons: smaller size, PNG for transparency support
    return await sharpInstance
      .resize(512, 512, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .png({ 
        quality: 85,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toBuffer();
  } else {
    // Photos: larger size, JPEG for better compression
    return await sharpInstance
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 80,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();
  }
}

const uploadBufferToCloudinary = (buffer, options = {}) => new Promise((resolve, reject) => {
  if (!buffer) {
    reject(new Error('No file buffer provided for upload'));
    return;
  }
  const stream = cloudinary.uploader.upload_stream(
    { folder: 'general', resource_type: 'image', ...options },
    (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }
  );
  stream.end(buffer);
});

// --- Simple Admin Auth (token-based) ---
// Admin password verification: prefer hash+salt via env, fallback to plaintext env for dev
// Secure admin credential (hashed). In production set via environment variables.
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '92014605fb81d4644dcb6c391044ff91c73dbc9786bf38f0dcd065e31e54db3dd997f6c5bc364193e21842ccc666b92cc57a9a59cb5b10ee88aafcdabbef97dd';
const ADMIN_PASSWORD_SALT = process.env.ADMIN_PASSWORD_SALT || '649ca47e4da238bfa51999785cb1cdb6';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''; // fallback disabled when hash present
// Manager role password (Manage@123)
const MANAGER_PASSWORD_HASH = process.env.MANAGER_PASSWORD_HASH || '2b9a9d4e676ea954b4843f7c7254572d0124af578d9834ee71cde4ffa725d8fb45d4fc9ef27086817ad4a915d59fca54f5795a0bf04e1bfd65db9ddc17bd6f6e';
const MANAGER_PASSWORD_SALT = process.env.MANAGER_PASSWORD_SALT || '578edd48318a337db5992cac714cfcf9';

// token -> { exp: number, role: 'admin' | 'manager' }
const tokenStore = new Map();
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function issueToken(role = 'admin') {
  const token = randomUUID();
  tokenStore.set(token, { exp: Date.now() + TOKEN_TTL_MS, role });
  return token;
}

function isTokenValid(token) {
  if (!token) return false;
  const meta = tokenStore.get(token);
  if (!meta) return false;
  if (Date.now() > meta.exp) {
    tokenStore.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (isTokenValid(token)) {
    const meta = tokenStore.get(token);
    if (meta?.role === 'admin') return next();
  }
  return res.status(403).json({ error: 'Admin authorization required' });
}

function requireManagerOrAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!isTokenValid(token)) return res.status(403).json({ error: 'Authorization required' });
  const meta = tokenStore.get(token);
  if (meta?.role === 'admin' || meta?.role === 'manager') return next();
  return res.status(403).json({ error: 'Manager or Admin required' });
}

function verifyPassword(input) {
  try {
    if (ADMIN_PASSWORD_HASH && ADMIN_PASSWORD_SALT) {
      const hash = scryptSync(String(input), Buffer.from(ADMIN_PASSWORD_SALT, 'hex'), 64);
      const expected = Buffer.from(ADMIN_PASSWORD_HASH, 'hex');
      if (hash.length === expected.length && timingSafeEqual(hash, expected)) return 'admin';
    }
    if (MANAGER_PASSWORD_HASH && MANAGER_PASSWORD_SALT) {
      const hash = scryptSync(String(input), Buffer.from(MANAGER_PASSWORD_SALT, 'hex'), 64);
      const expected = Buffer.from(MANAGER_PASSWORD_HASH, 'hex');
      if (hash.length === expected.length && timingSafeEqual(hash, expected)) return 'manager';
    }
    // Dev fallback: use plain ADMIN_PASSWORD if provided
    if (ADMIN_PASSWORD) {
      const a = Buffer.from(String(input));
      const b = Buffer.from(String(ADMIN_PASSWORD));
      if (a.length === b.length && timingSafeEqual(a, b)) return 'admin';
    }
    return null;
  } catch {
    return null;
  }
}

// Login endpoint - returns admin token
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  const role = verifyPassword(password);
  if (!role) return res.status(401).json({ error: 'Invalid credentials' });
  const token = issueToken(role);
  return res.json({ success: true, token, role, expiresIn: TOKEN_TTL_MS / 1000 });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express API!' });
});

// Validate current session
app.get('/api/session', (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!isTokenValid(token)) return res.json({ isAdmin: false, role: null });
  const meta = tokenStore.get(token);
  return res.json({ isAdmin: meta?.role === 'admin', role: meta?.role || null });
});

// Logout (invalidate token)
app.post('/api/logout', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) tokenStore.delete(token);
  return res.json({ success: true });
});

app.post('/api/upload', requireManagerOrAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('❌ No file provided');
      return res.status(400).json({ error: 'Image file is required' });
    }
    
    const folderInput = req.body?.folder;
    const folder = typeof folderInput === 'string' && folderInput.trim() ? folderInput.trim() : 'members';
    
    const originalSize = req.file.size;
    console.log(`📤 Original image: ${req.file.originalname} (${(originalSize / 1024).toFixed(2)} KB)`);
    
    // Determine image type based on folder
    const imageType = (folder === 'site' || folder === 'icons') ? 'icon' : 'photo';
    
    // Compress image using Sharp
    console.log(`🗜️  Compressing ${imageType}...`);
    const compressedBuffer = await compressImage(req.file.buffer, imageType);
    
    const compressedSize = compressedBuffer.length;
    const savedPercent = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(`✅ Compressed: ${(compressedSize / 1024).toFixed(2)} KB (saved ${savedPercent}%)`);
    
  // For site/icons folder, save locally instead of Cloudinary
    if (folder === 'site' || folder === 'icons') {
      console.log(`� Saving icon locally...`);
      try {
        const iconFileName = 'site-icon.png';
        const iconPath = path.join(IMAGES_DIR, iconFileName);
        await fs.writeFile(iconPath, compressedBuffer);
        const iconUrl = `/assets/images/${iconFileName}`;
        console.log(`✅ Icon saved locally: ${iconUrl}`);
        
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.json({
          url: iconUrl,
          timestampedUrl: iconUrl,
          public_id: 'site-icon',
          originalSize,
          compressedSize,
          savedPercent: parseFloat(savedPercent),
          uploadedAt: Date.now(),
          isLocal: true
        });
      } catch (localErr) {
        console.error('❌ Local icon save failed:', localErr);
        throw localErr;
      }
    }
    
    // Save About/Family page images locally when folder is 'family'
    if (folder === 'family') {
      console.log('💾 Saving family image locally...');
      try {
        const baseName = (req.file.originalname || `family-${Date.now()}.png`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = baseName.toLowerCase();
        const filePath = path.join(FAMILY_DIR, fileName);
        await fs.writeFile(filePath, compressedBuffer);
        const url = `/family/${fileName}`;
        console.log(`✅ Family image saved locally: ${url}`);
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.json({
          url,
          timestampedUrl: url,
          originalSize,
          compressedSize,
          savedPercent: parseFloat(savedPercent),
          uploadedAt: Date.now(),
          isLocal: true
        });
      } catch (localErr) {
        console.error('❌ Local family image save failed:', localErr);
        throw localErr;
      }
    }
    
    // For other folders, upload to Cloudinary
    console.log(`☁️  Uploading to Cloudinary folder: ${folder}`);
    const result = await uploadBufferToCloudinary(compressedBuffer, { folder });
    console.log(`✅ Cloudinary upload success: ${result.secure_url}`);
    
    // Add timestamp to URL to prevent caching issues
    const urlWithTimestamp = `${result.secure_url}?t=${Date.now()}`;
    
    // Set cache-control header for the response to prevent caching of this specific upload response
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.json({ 
      url: result.secure_url,
      // Return timestamped URL for immediate use in frontend
      timestampedUrl: urlWithTimestamp,
      public_id: result.public_id,
      originalSize,
      compressedSize,
      savedPercent: parseFloat(savedPercent),
      uploadedAt: Date.now()
    });
  } catch (error) {
    console.error('❌ Upload failed:', error);
    return res.status(500).json({ error: 'Image upload failed' });
  }
});

// Helper function to read data
async function readData() {
  const cached = await ensureDataCache();
  return cloneData(cached || []);
}

// Helper function to write data
async function writeData(data) {
  const content = `const data = ${JSON.stringify(data, null, 2)};\n\nexport default data;\n`;
  await fs.writeFile(DATA_FILE_PATH, content, 'utf-8');
  await refreshDataCache();
}

// Helper functions for site settings
async function readSiteSettings() {
  try {
    const content = await fs.readFile(SITE_FILE_PATH, 'utf-8');
    const json = JSON.parse(content);
    return {
      title: typeof json.title === 'string' ? json.title : 'Family Tree',
      faviconDataUrl: typeof json.faviconDataUrl === 'string' ? json.faviconDataUrl : '',
    };
  } catch (err) {
    // Provide sensible defaults if file missing or invalid
    return { title: 'Family Tree', faviconDataUrl: '' };
  }
}

async function writeSiteSettings(settings) {
  const payload = {
    title: settings.title || 'Family Tree',
    faviconDataUrl: settings.faviconDataUrl || '',
  };
  await fs.mkdir(path.dirname(SITE_FILE_PATH), { recursive: true });
  await fs.writeFile(SITE_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}

async function readJsonFile(filePath, fallback = []) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(content);
    return json;
  } catch (err) {
    return fallback;
  }
}

// Helper function to generate unique ID
function generateId(existingData) {
  const maxId = existingData.reduce((max, member) => {
    const numId = parseInt(member.id, 10);
    return numId > max ? numId : max;
  }, 0);
  return String(maxId + 1);
}

// Add child endpoint (admin only)
app.post('/api/add-child', requireAdmin, async (req, res) => {
  try {
    const { parentId, childData } = req.body;
    
    if (!parentId || !childData || !childData.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const data = await readData();
    
    // Find parent
    const parent = data.find(m => m.id === parentId);
    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Create new child
    const newId = generateId(data);
    const newChild = {
      id: newId,
      name: childData.name,
      englishName: childData.englishName || '',
      birthDate: childData.birthDate || '',
      birthMonth: Number.isFinite(childData?.birthMonth) ? Number(childData.birthMonth) : undefined,
      birthDay: Number.isFinite(childData?.birthDay) ? Number(childData.birthDay) : undefined,
      deathDate: childData.deathDate || '',
      isDeceased: Boolean(childData.isDeceased),
      gender: childData.gender || '',
      address: childData.address || '',
      mobile: childData.mobile || '',
      parentIds: [parentId],
      spouseIds: [],
      childrenIds: [],
      generation: childData.generation || parent.generation + 1,
      notes: childData.notes || '',
      isExpanded: false,
    };

    // Update parent's children list
    if (!parent.childrenIds) {
      parent.childrenIds = [];
    }
    parent.childrenIds.push(newId);

    // Add new child to data
    data.push(newChild);

    // Write updated data
    await writeData(data);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error adding child:', error);
    res.status(500).json({ error: 'Failed to add child' });
  }
});

// GET all data endpoint (for frontend to fetch latest data)
app.get('/api/data', async (req, res) => {
  try {
  const { data, meta } = await getDataWithMeta();
  const etag = meta?.etag || '';
  const quotedEtag = etag ? `"${etag}"` : '';

    if (meta?.version) {
      res.set('X-Data-Version', String(meta.version));
    }
    if (meta?.refreshedAt) {
      res.set('X-Data-Refreshed-At', new Date(meta.refreshedAt).toISOString());
    }

    if (etag) {
      const ifNoneMatch = req.headers['if-none-match'];
      res.set('ETag', quotedEtag || etag);
      if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === quotedEtag)) {
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        return res.status(304).end();
      }
    }

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.json({
      success: true,
      data,
      version: meta?.version || '',
      refreshedAt: meta?.refreshedAt || Date.now(),
    });
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Site settings endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readSiteSettings();
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error reading site settings:', error);
    res.status(500).json({ error: 'Failed to read site settings' });
  }
});

app.post('/api/settings', requireAdmin, async (req, res) => {
  try {
    const { title, faviconDataUrl } = req.body || {};
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (faviconDataUrl && typeof faviconDataUrl !== 'string') {
      return res.status(400).json({ error: 'Invalid favicon' });
    }
    await writeSiteSettings({ title: title.trim(), faviconDataUrl: faviconDataUrl || '' });
    const settings = await readSiteSettings();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error writing site settings:', error);
    res.status(500).json({ error: 'Failed to save site settings' });
  }
});

// News & Events (read-only for now)
app.get('/api/news', async (req, res) => {
  try {
    const news = await readJsonFile(NEWS_FILE_PATH, []);
    // Augment with today's birthdays from family data
    let birthdayItems = [];
    try {
      const members = await readData();
      const today = new Date();
      const m = today.getMonth() + 1;
      const d = today.getDate();
      const yyyy = today.getFullYear();
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      birthdayItems = (members || [])
        .filter(mb => Number(mb?.birthMonth) === m && Number(mb?.birthDay) === d)
        .map(mb => {
          const imageUrl = (mb?.notes || '').match(/Image:\s*(.*?)(?:\s*\||$)/)?.[1]?.trim() || '';
          const isDeceased = Boolean(mb?.isDeceased) || (mb.deathDate && String(mb.deathDate).trim() !== '');
          const marathiName = mb.name || '';
          const englishName = (mb.englishName || '').trim();

          if (isDeceased) {
            const titleMr = `🕊️ भावपूर्ण श्रद्धांजली: ${marathiName}`;
            const titleEn = `🕊️ In Loving Memory: ${mb.name}`;
            const summaryMr = englishName
              ? `प्रिय ${englishName} यांच्या स्मृतींना आज विनम्र अभिवादन.`
              : 'आज आम्ही आपल्या स्मृतींना विनम्र अभिवादन करतो.';
            const summaryEn = englishName
              ? `"Those we love never truly leave us." Cherishing ${englishName} today.`
              : '"Those we love never truly leave us." Cherishing your memory today.';
            return {
              id: `a-${mb.id}-${yyyy}${mm}${dd}`, // 'a' for anniversary
              title: titleMr,
              titleMr,
              titleEn,
              date: iso,
              summary: summaryMr,
              summaryMr,
              summaryEn,
              link: '',
              imageUrl,
              type: 'anniversary'
            };
          } else {
            const titleMr = `🎉 वाढदिवसाच्या हार्दिक शुभेच्छा: ${marathiName}`;
            const titleEn = `🎉 Happy Birthday: ${mb.name}`;
            const summaryMr = englishName
              ? `आगामी प्रवास आनंदमय होवो. वाढदिवसाच्या शुभेच्छा, ${englishName}!`
              : 'आगामी प्रवास आनंदमय होवो. वाढदिवसाच्या हार्दिक शुभेच्छा!';
            const summaryEn = englishName
              ? `"May your journey ahead be filled with blessings." Happy Birthday, ${englishName}!`
              : '"May your journey ahead be filled with blessings." Happy Birthday!';
            return {
              id: `b-${mb.id}-${yyyy}${mm}${dd}`,
              title: titleMr,
              titleMr,
              titleEn,
              date: iso,
              summary: summaryMr,
              summaryMr,
              summaryEn,
              link: '',
              imageUrl,
              type: 'birthday'
            };
          }
        });
    } catch (e) {
      // ignore birthday enrichment errors
    }
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, items: [...birthdayItems, ...news] });
  } catch (error) {
    console.error('Error reading news:', error);
    res.status(500).json({ error: 'Failed to read news' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await readJsonFile(EVENTS_FILE_PATH, []);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, items: events });
  } catch (error) {
    console.error('Error reading events:', error);
    res.status(500).json({ error: 'Failed to read events' });
  }
});

// Upload site icon (admin) - saves optimized PNG and updates settings
app.post('/api/upload-site-icon', requireAdmin, async (req, res) => {
  try {
    const { iconUrl } = req.body || {};
    if (!iconUrl || typeof iconUrl !== 'string') {
      return res.status(400).json({ error: 'Icon URL is required' });
    }
    const current = await readSiteSettings();
    await writeSiteSettings({ title: current.title, faviconDataUrl: iconUrl });
    const updated = await readSiteSettings();
    res.json({ success: true, settings: updated });
  } catch (error) {
    console.error('Error uploading site icon:', error);
    res.status(500).json({ error: 'Failed to update site icon' });
  }
});

// --- Manager/Admin create News/Event ---
async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

const genId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random()*1e6)}`;

app.post('/api/news', requireManagerOrAdmin, async (req, res) => {
  try {
    const { title, date, summary = '', link = '', imageUrl = '' } = req.body || {};
    if (!title || !date) return res.status(400).json({ error: 'title and date are required' });
    const items = await readJsonFile(NEWS_FILE_PATH, []);
    const item = { id: genId('n'), title, date, summary, link, imageUrl };
    items.unshift(item);
    await writeJsonFile(NEWS_FILE_PATH, items);
    res.json({ success: true, item });
  } catch (e) {
    console.error('Add news failed', e);
    res.status(500).json({ error: 'Failed to add news' });
  }
});

app.post('/api/events', requireManagerOrAdmin, async (req, res) => {
  try {
    const { title, date, time = '', location = '', description = '', link = '', imageUrl = '' } = req.body || {};
    if (!title || !date) return res.status(400).json({ error: 'title and date are required' });
    const items = await readJsonFile(EVENTS_FILE_PATH, []);
    const item = { id: genId('e'), title, date, time, location, description, link, imageUrl };
    items.unshift(item);
    await writeJsonFile(EVENTS_FILE_PATH, items);
    res.json({ success: true, item });
  } catch (e) {
    console.error('Add event failed', e);
    res.status(500).json({ error: 'Failed to add event' });
  }
});

// Edit news (manager/admin)
app.patch('/api/news/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const items = await readJsonFile(NEWS_FILE_PATH, []);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const current = items[idx];
    const { title, date, summary, link, imageUrl } = req.body || {};
    if (title !== undefined) current.title = title;
    if (date !== undefined) current.date = date;
    if (summary !== undefined) current.summary = summary;
    if (link !== undefined) current.link = link;
    if (imageUrl !== undefined) current.imageUrl = imageUrl;
    items[idx] = current;
    await writeJsonFile(NEWS_FILE_PATH, items);
    res.json({ success: true, item: current });
  } catch (e) {
    console.error('Edit news failed', e);
    res.status(500).json({ error: 'Failed to edit news' });
  }
});

// Edit event (manager/admin)
app.patch('/api/events/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const items = await readJsonFile(EVENTS_FILE_PATH, []);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const current = items[idx];
    const { title, date, time, location, description, link, imageUrl } = req.body || {};
    if (title !== undefined) current.title = title;
    if (date !== undefined) current.date = date;
    if (time !== undefined) current.time = time;
    if (location !== undefined) current.location = location;
    if (description !== undefined) current.description = description;
    if (link !== undefined) current.link = link;
    if (imageUrl !== undefined) current.imageUrl = imageUrl;
    items[idx] = current;
    await writeJsonFile(EVENTS_FILE_PATH, items);
    res.json({ success: true, item: current });
  } catch (e) {
    console.error('Edit event failed', e);
    res.status(500).json({ error: 'Failed to edit event' });
  }
});
// Delete news (manager/admin)
app.delete('/api/news/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const items = await readJsonFile(NEWS_FILE_PATH, []);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    items.splice(idx, 1);
    await writeJsonFile(NEWS_FILE_PATH, items);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete news failed', e);
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

// Delete event (manager/admin)
app.delete('/api/events/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const items = await readJsonFile(EVENTS_FILE_PATH, []);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    items.splice(idx, 1);
    await writeJsonFile(EVENTS_FILE_PATH, items);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete event failed', e);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Remove child endpoint (admin only)
app.post('/api/remove-child', requireAdmin, async (req, res) => {
  try {
    const { parentId, childId } = req.body;

    if (!parentId || !childId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const data = await readData();

    // Find parent
    const parent = data.find((m) => m.id === parentId);
    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Find child
    const childIndex = data.findIndex((m) => m.id === childId);
    if (childIndex === -1) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const child = data[childIndex];

    // Check if child has children
    if (child.childrenIds && child.childrenIds.length > 0) {
      return res.status(400).json({
        error: 'Cannot remove member with children. Remove their children first.',
      });
    }

    // Remove child from parent's children list
    parent.childrenIds = parent.childrenIds.filter((id) => id !== childId);

    // Remove child from data
    data.splice(childIndex, 1);

    // Write updated data
    await writeData(data);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error removing child:', error);
    res.status(500).json({ error: 'Failed to remove child' });
  }
});

// Update member endpoint (admin only)
app.post('/api/update-member', requireAdmin, async (req, res) => {
  try {
    const { memberId, updatedData } = req.body;
    
    console.log('Update member request:', { memberId, updatedData });
    
    if (!memberId || !updatedData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const data = await readData();
    
    // Find member
    const member = data.find(m => m.id === memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    console.log('Member before update:', member);

    // Update member fields
    if (updatedData.name !== undefined) member.name = updatedData.name;
    if (updatedData.englishName !== undefined) member.englishName = updatedData.englishName;
    if (updatedData.birthDate !== undefined) member.birthDate = updatedData.birthDate;
  if (updatedData.birthMonth !== undefined) member.birthMonth = Number(updatedData.birthMonth);
  if (updatedData.birthDay !== undefined) member.birthDay = Number(updatedData.birthDay);
    if (updatedData.deathDate !== undefined) member.deathDate = updatedData.deathDate;
  if (updatedData.isDeceased !== undefined) member.isDeceased = Boolean(updatedData.isDeceased);
  if (updatedData.gender !== undefined) member.gender = updatedData.gender;
  if (updatedData.isDeceased !== undefined) member.isDeceased = Boolean(updatedData.isDeceased);
    if (updatedData.address !== undefined) member.address = updatedData.address;
    if (updatedData.mobile !== undefined) member.mobile = updatedData.mobile;
    if (updatedData.notes !== undefined) member.notes = updatedData.notes;

    console.log('Member after update:', member);

    // Write updated data
    await writeData(data);
    
    console.log('Data written successfully');

    res.json({ success: true, member });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Upload image endpoint (admin only)
app.post('/api/upload-image', requireAdmin, async (req, res) => {
  try {
    console.log('📸 Upload image request received:', { body: req.body });
    
    const { memberId, imageUrl } = req.body || {};
    if (!memberId) {
      console.error('❌ Missing memberId');
      return res.status(400).json({ error: 'Member ID is required' });
    }
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('❌ Missing or invalid imageUrl');
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Update member's notes with image URL
    const data = await readData();
    const member = data.find(m => m.id === memberId);
    
    if (!member) {
      console.error('❌ Member not found:', memberId);
      return res.status(404).json({ error: 'Member not found' });
    }

    console.log('📝 Member found:', member.name, 'Old notes:', member.notes);

    // Remove old image URL from notes if exists
    let notes = member.notes || '';
    notes = notes.replace(/Image:\s*.*?(?:\s*\||$)/g, '').trim();
    
    // Add new image URL
    member.notes = notes ? `${notes} | Image: ${imageUrl}` : `Image: ${imageUrl}`;

    console.log('📝 New notes:', member.notes);

    // Write updated data
    await writeData(data);

    console.log('✅ Image uploaded successfully for member:', member.name);
    res.json({ success: true, imageUrl, member });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Catch-all for unknown API routes (MUST be last!)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start the Express server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API running on port ${PORT}`);
});
