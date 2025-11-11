/**
 * Migration Script: Move existing local images to Cloudinary
 * 
 * This script:
 * 1. Reads all member data from data.js
 * 2. Finds members with local image references
 * 3. Uploads images to Cloudinary
 * 4. Updates member notes with new Cloudinary URLs
 * 
 * Usage:
 *   node scripts/migrate-images-to-cloudinary.js
 * 
 * Prerequisites:
 *   - Set CLOUDINARY_* environment variables
 *   - Ensure images exist in assets/images/
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DATA_FILE_PATH = path.join(__dirname, '../assets/data/data.js');
const IMAGES_DIR = path.join(__dirname, '../assets/images');

// Read current data
async function readData() {
  const content = await fs.readFile(DATA_FILE_PATH, 'utf-8');
  const dataMatch = content.match(/const data = (\[[\s\S]*?\]);/);
  if (!dataMatch) {
    throw new Error('Invalid data file format');
  }
  return JSON.parse(dataMatch[1]);
}

// Write updated data
async function writeData(data) {
  const content = `const data = ${JSON.stringify(data, null, 2)};\n\nexport default data;\n`;
  await fs.writeFile(DATA_FILE_PATH, content, 'utf-8');
}

// Upload image file to Cloudinary
async function uploadToCloudinary(imagePath, folder = 'members') {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (error) {
    console.error(`Failed to upload ${imagePath}:`, error.message);
    return null;
  }
}

// Extract image filename from notes
function extractLocalImagePath(notes) {
  if (!notes) return null;
  
  // Match patterns like:
  // - Image: /assets/images/member-123.jpg
  // - Image: member-123.jpg
  // - Image: assets/images/member-123.jpg
  const match = notes.match(/Image:\s*(?:\/assets\/images\/|assets\/images\/)?([^\s|]+\.(jpg|jpeg|png|gif|webp))/i);
  return match ? match[1] : null;
}

// Check if URL is already a Cloudinary URL
function isCloudinaryUrl(url) {
  return url && (url.includes('cloudinary.com') || url.startsWith('https://res.cloudinary.com'));
}

async function main() {
  console.log('🚀 Starting image migration to Cloudinary...\n');

  // Verify Cloudinary config
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ ERROR: Cloudinary credentials not found!');
    console.error('Please set environment variables:');
    console.error('  - CLOUDINARY_CLOUD_NAME');
    console.error('  - CLOUDINARY_API_KEY');
    console.error('  - CLOUDINARY_API_SECRET');
    process.exit(1);
  }

  try {
    // Read member data
    console.log('📖 Reading member data...');
    const data = await readData();
    console.log(`✅ Found ${data.length} members\n`);

    let processed = 0;
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each member
    for (const member of data) {
      processed++;
      
      // Extract image path from notes
      const imageFilename = extractLocalImagePath(member.notes);
      
      if (!imageFilename) {
        // No image found
        continue;
      }

      // Check if already using Cloudinary
      if (isCloudinaryUrl(member.notes)) {
        console.log(`⏭️  [${processed}/${data.length}] ${member.name || member.id} - Already on Cloudinary`);
        skipped++;
        continue;
      }

      const imagePath = path.join(IMAGES_DIR, imageFilename);
      
      // Check if file exists
      try {
        await fs.access(imagePath);
      } catch (err) {
        console.log(`⚠️  [${processed}/${data.length}] ${member.name || member.id} - Image not found: ${imageFilename}`);
        errors++;
        continue;
      }

      console.log(`📤 [${processed}/${data.length}] ${member.name || member.id} - Uploading ${imageFilename}...`);

      // Upload to Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(imagePath, 'members');
      
      if (cloudinaryUrl) {
        // Update notes with new URL
        let notes = member.notes || '';
        // Remove old image reference
        notes = notes.replace(/Image:\s*.*?(?:\s*\||$)/g, '').trim();
        // Add new Cloudinary URL
        member.notes = notes ? `${notes} | Image: ${cloudinaryUrl}` : `Image: ${cloudinaryUrl}`;
        
        console.log(`   ✅ Uploaded to: ${cloudinaryUrl.substring(0, 60)}...`);
        migrated++;
      } else {
        console.log(`   ❌ Failed to upload`);
        errors++;
      }
    }

    // Save updated data if any migrations occurred
    if (migrated > 0) {
      console.log('\n💾 Saving updated member data...');
      await writeData(data);
      console.log('✅ Data saved successfully!');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`Total members processed: ${processed}`);
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`⏭️  Already on Cloudinary: ${skipped}`);
    console.log(`❌ Errors/Not found: ${errors}`);
    console.log(`📁 No images: ${data.length - migrated - skipped - errors}`);
    console.log('='.repeat(50));

    if (migrated > 0) {
      console.log('\n🎉 Migration complete! All images are now on Cloudinary.');
      console.log('💡 You can now safely remove local images from assets/images/');
    } else if (skipped > 0) {
      console.log('\n✨ All images are already on Cloudinary. No migration needed.');
    } else {
      console.log('\n⚠️  No images were migrated. Check if images exist in assets/images/');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main().catch(console.error);
