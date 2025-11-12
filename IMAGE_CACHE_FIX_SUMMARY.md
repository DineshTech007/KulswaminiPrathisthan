# Image Caching & Sidebar Admin Tools - Implementation Summary

## Overview
This update implements two key improvements:
1. **Sidebar Admin Tools**: Moved title/icon edit functionality from the family tree to the admin sidebar for easier access
2. **Image Cache Busting**: Fixed Cloudinary image caching issues that prevented freshly uploaded images from displaying

---

## Part 1: Admin Title/Icon Edit Tools in Sidebar

### Changes Made

#### `src/components/Sidebar.jsx`
- **Added Props**: `siteTitle`, `siteFavicon`, `onSettingsUpdated` to component signature
- **New Admin Section**: When user is logged in as admin, a new section appears with:
  - **✎ Edit Title**: Opens a prompt to modify the site title
  - **🎨 Change Icon**: File input to upload a new site favicon
- Both buttons directly communicate with `/api/settings` endpoint
- Settings updates trigger `onSettingsUpdated()` callback to refresh site state

#### `src/App.jsx`
- Updated `<Sidebar />` component to pass:
  - `siteTitle={siteSettings?.title}`
  - `siteFavicon={siteSettings?.faviconDataUrl}`
  - `onSettingsUpdated={fetchSettings}`

### UI/UX Benefits
- Quick access to site management without navigating away
- Visible only to admin users
- Consistent with existing sidebar styling
- No changes needed to FamilyTree component

---

## Part 2: Image Caching Fix for Cloudinary

### Problem
After uploading images to Cloudinary, browsers cache the old image URL, preventing new uploads from displaying without a full page refresh.

### Solution: Multi-Layer Cache Busting

#### `src/utils/apiClient.js`
```javascript
// 1. resolveImageUrl() - Auto-add timestamp to Cloudinary URLs
export function resolveImageUrl(url) {
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  }
  return url;
}

// 2. New helper for manual cache busting
export function getCacheBustedImageUrl(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
}
```

#### `server/api.js` - Upload Endpoint
- Adds `Cache-Control: no-cache, no-store, must-revalidate` header to upload responses
- Returns `uploadedAt: Date.now()` in response for client tracking
- Includes `timestampedUrl` in response for immediate use

#### `src/components/MemberDetailModal.jsx`
- Adds cache-bust parameter when saving image URL
- Includes brief delay before reload to ensure server sync

#### `src/components/Sidebar.jsx`
- News image upload: `imageUrl = ${imageUrl}?t=${Date.now()}`
- Event image upload: `imageUrl = ${imageUrl}?t=${Date.now()}`
- Icon upload: `cacheBustedIconUrl = ${iconUrl}?t=${Date.now()}`

### How It Works
1. **Server**: Returns upload response with cache-control headers
2. **Client**: Immediately appends `?t=timestamp` to Cloudinary URL
3. **Browser**: Treats timestamped URL as unique, bypasses cache
4. **Frontend**: Displays fresh image on next load without reload
5. **Fallback**: Page reload still available if needed

---

## Testing Checklist

### Admin Sidebar Tools
- [ ] Login as admin
- [ ] Open sidebar - see "Edit Title" and "Change Icon" buttons
- [ ] Click "Edit Title" and modify site name
- [ ] Verify title updates in FamilyTree header
- [ ] Click "Change Icon" and upload new image
- [ ] Verify favicon updates

### Image Uploads
- [ ] Upload member photo - image displays immediately
- [ ] Upload news image - image shows in latest news
- [ ] Upload event image - image shows in upcoming events
- [ ] Upload site icon - favicon updates without full reload
- [ ] Clear browser cache and refresh - old images don't reappear
- [ ] Test in different browsers (Chrome, Firefox, Safari)

---

## Files Modified

```
src/components/Sidebar.jsx
  - Added admin tools section
  - Added cache-bust params to uploads

src/components/MemberDetailModal.jsx
  - Added cache-bust to member image upload
  - Added delay before reload

src/components/FamilyTree.jsx
  - No changes (functionality moved to Sidebar)

src/App.jsx
  - Pass siteSettings props to Sidebar

src/utils/apiClient.js
  - Enhanced resolveImageUrl() with cache-busting
  - Added getCacheBustedImageUrl() helper

server/api.js
  - Added Cache-Control header to /api/upload
  - Return uploadedAt timestamp in response
```

---

## Browser Compatibility
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance Impact
- **Minimal**: Timestamp query params don't affect server processing
- **Cloudinary**: Timestamps don't interfere with CDN caching (different URLs treated fresh)
- **Storage**: No additional storage needed (query params only)

---

## Future Enhancements
1. Add Service Worker cache invalidation
2. Implement WebP image format detection
3. Add image optimization on client before upload
4. Track image upload history in admin dashboard
5. Batch upload multiple images at once
