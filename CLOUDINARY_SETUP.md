# Cloudinary Integration - Complete Setup Guide

## ✅ What Was Updated

### Backend Changes (server/api.js)
✅ **Already configured** with Cloudinary SDK
✅ `/api/upload` endpoint for uploading images to Cloudinary
✅ `/api/upload-image` endpoint for updating member images
✅ All news/events endpoints accept `imageUrl` (Cloudinary URLs)

### Frontend Changes

#### 1. **API Client (src/utils/apiClient.js)**
✅ Already has `uploadImageFile()` function
- Uploads file to `/api/upload` endpoint
- Returns Cloudinary URL
- Supports custom folders (members, news, events, site)

#### 2. **Components Updated Today**
✅ **News.jsx** - Edit form now uses Cloudinary
✅ **Events.jsx** - Edit form now uses Cloudinary
✅ **Sidebar.jsx** - Add news/events forms use Cloudinary (already done)
✅ **MemberDetailModal.jsx** - Member photo uploads use Cloudinary (already done)
✅ **FamilyTree.jsx** - Site icon upload uses Cloudinary (already done)

---

## 🔧 Required Configuration

### 1. Get Cloudinary Credentials
1. Go to https://cloudinary.com and sign up/login
2. Navigate to Dashboard
3. Copy these values:
   - Cloud Name
   - API Key
   - API Secret

### 2. Configure Backend (Render)
Add these environment variables in your Render dashboard:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Configure Local Development
1. Copy `.env` file in project root (already created)
2. Add your Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# For local API testing:
VITE_API_URL=http://localhost:3001
```

---

## 🚀 How to Test

### Test Member Image Upload
1. Login as admin
2. Click on any family member
3. Click the camera icon
4. Upload an image
5. ✅ Image should upload to Cloudinary and display

### Test News/Events
1. Login as admin or manager
2. Add or edit news/event
3. Upload an image
4. ✅ Image should upload to Cloudinary

### Test Site Icon
1. Login as admin
2. Look for site icon change option in family tree
3. Upload a new icon
4. ✅ Icon should update via Cloudinary

---

## 📝 Image Upload Flow

```
1. User selects image file
   ↓
2. Frontend calls uploadImageFile()
   ↓
3. Sends file to /api/upload endpoint
   ↓
4. Backend uploads to Cloudinary
   ↓
5. Backend returns Cloudinary URL
   ↓
6. Frontend sends URL to appropriate endpoint:
   - /api/upload-image (members)
   - /api/news (news creation)
   - /api/events (event creation)
   - /api/news/:id (news edit)
   - /api/events/:id (event edit)
   - /api/upload-site-icon (favicon)
```

---

## 🔍 Troubleshooting

### "API endpoint not found" error
**Cause:** Backend not running or incorrect API URL

**Fix:**
1. Make sure backend is running on Render
2. Check `.env` has correct `VITE_API_URL`
3. Rebuild frontend: `npm run build`

### "Failed to upload image" error
**Cause:** Cloudinary credentials not set

**Fix:**
1. Verify Cloudinary credentials in Render environment variables
2. Restart your Render service
3. Check backend logs for Cloudinary errors

### Images not displaying
**Cause:** Old local image URLs in database

**Solution:** Images will update as you re-upload them. Old URLs will gradually be replaced with Cloudinary URLs.

---

## 🎯 Cloudinary Folder Structure

Images are organized by type:
- `members/` - Family member photos
- `news/` - News article images
- `events/` - Event images
- `site/` - Site icons/favicon

---

## ⚡ Next Steps

1. **Add Cloudinary credentials** to Render
2. **Restart backend** on Render
3. **Test image uploads** for each feature
4. **Monitor Cloudinary dashboard** for uploaded images

---

## 📌 Important Notes

- ✅ All image uploads now go to Cloudinary (no local storage)
- ✅ Old local URLs will still work until replaced
- ✅ 5MB file size limit per image
- ✅ Only image files accepted (jpg, png, gif, webp, etc.)
- ✅ Images are automatically optimized by Cloudinary
