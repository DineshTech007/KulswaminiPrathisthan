# Site Icon Fix - Using Local Path

## Problem
The site icon was appearing on the family tree page but not consistently on other pages. The issue was that some pages were trying to fetch the icon from Cloudinary URLs stored in `faviconDataUrl`.

## Solution
Updated the icon loading strategy to **always prefer the local icon first** (`/site-icon.png`), with fallbacks to ensure the icon displays everywhere.

## Changes Made

### 1. BrandHeader Component (`src/components/BrandHeader.jsx`)
- Now uses `/site-icon.png` as the primary icon source
- Has a smart fallback chain:
  1. Try local `/site-icon.png`
  2. If that fails, try the `icon` prop (from `faviconDataUrl`)  
  3. If both fail, display initials

```jsx
const iconSrc = '/site-icon.png';

<img
  src={iconSrc}
  alt="Site icon"
  onError={(e) => {
    // If local icon fails, try the provided icon URL
    if (icon && e.target.src !== icon) {
      e.target.src = resolveImageUrl(icon);
    } else {
      // Show initials as final fallback
      e.target.parentElement.innerHTML = `<span...>${fallbackInitials}</span>`;
    }
  }}
/>
```

### 2. Home Page (`src/pages/Home.jsx`)
- Updated to directly use `/site-icon.png` in the header
- Simplified icon display with fallback to `faviconDataUrl`

```jsx
<img 
  src="/site-icon.png" 
  alt="" 
  className="h-10 w-10 rounded-notion"
  onError={(e) => {
    if (site.faviconDataUrl && e.target.src !== site.faviconDataUrl) {
      e.target.src = resolveImageUrl(site.faviconDataUrl);
    }
  }}
/>
```

## Icon Location
The icon file is located at: **`public/site-icon.png`**

This path is accessible as `/site-icon.png` in the browser since Vite serves files from the `public` folder at the root URL.

## Pages Affected
✅ **Home** - Now uses local icon directly with fallback  
✅ **News** - Uses BrandHeader (fixed)
✅ **Events** - Uses BrandHeader (fixed)
✅ **Family Tree** - Already working, now more robust
✅ **About** - Uses shared components  
✅ **Contact** - Uses shared components

## Benefits
1. **Faster Loading**: Local file loads instantly without external HTTP requests
2. **Offline Support**: Works even without internet connectivity
3. **No Cloudinary Dependency**: Doesn't rely on external image hosting
4. **Consistent Display**: Same icon shows on all pages
5. **Resilient Fallbacks**: Multiple fallback options ensure icon always displays

## Testing
To verify the fix works:
1. Check all pages (Home, News, Events, Family Tree, About, Contact)
2. Icon should appear at the top of each page
3. If local icon is missing, it should fallback gracefully
4. Network tab should show `/site-icon.png` being loaded

## Future Updates
To update the site icon:
1. Replace `public/site-icon.png` with your new icon
2. Recommended size: 192x192px or 512x512px
3. Format: PNG with transparency support
4. The change will reflect immediately on all pages

---

**Result**: Site icon now displays consistently across all pages using the local `/site-icon.png` path! 🎨✅
