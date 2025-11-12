# 📸 Family Photos for About Page

## Images to Add

Place these image files in the `public/family/` directory:

### 1. Night Temple Gathering
**Filename:** `family-gathering-night.jpg`
- Shows family gathering at temple courtyard at night
- Large group photo with multiple family members
- Currently used from your first attached image

### 2. Sneh Melava Hall Gathering  
**Filename:** `sneh-melava-gathering.jpg`
- Shows family gathering during Sneh Melava celebration
- Indoor hall setting with family members and children
- Currently used from your second attached image

---

## How to Add These Images

### Option 1: Manual Upload (Easiest)
1. Create folder: `public/family/`
2. Save the first image as: `family-gathering-night.jpg`
3. Save the second image as: `sneh-melava-gathering.jpg`

### Option 2: Command Line
```bash
# Create directory
mkdir public/family

# Copy your images to this directory
cp "path/to/first/image.jpg" public/family/family-gathering-night.jpg
cp "path/to/second/image.jpg" public/family/sneh-melava-gathering.jpg
```

---

## Image Requirements

- **Format:** JPG, PNG, or WebP
- **Size:** Recommended 1200x800px or larger
- **Quality:** High quality (80-90 JPEG quality)
- **File Size:** Under 2MB each

---

## Code Integration

The images are already configured in `src/pages/About.jsx`:

```jsx
const familyPhotos = [
  {
    src: '/family/family-gathering-night.jpg',
    caption: t('about.gallery.temple'),
    alt: 'Family gathering at temple courtyard during night celebration',
  },
  {
    src: '/family/sneh-melava-gathering.jpg',
    caption: t('about.gallery.hall'),
    alt: 'Family gathering during Sneh Melava celebration in hall',
  },
];
```

Once you add the images to `public/family/`, they will automatically display on the About page!

---

## Translations

The captions are provided in two languages:

**Marathi (मराठी):**
- Temple: "रात्रीच्या दर्शनानंतर मंदिर प्रांगणातील सामूहिक छायाचित्र"
- Hall: "स्नेह मेळाव्यातील आनंदाचा क्षण"

**English:**
- Temple: "Family gathering after the night darshan at the temple courtyard"
- Hall: "Joyful snapshot from the Sneh Melava celebration"

---

## Display Features

✨ **Animations:**
- Smooth fade-in and scale animations
- Staggered timing (0.05s delay between images)

✨ **Styling:**
- Rounded corners (3xl)
- Soft shadow effect
- Responsive layout
- Centered with max-width of 512px (2xl)

✨ **Accessibility:**
- Alt text for screen readers
- Lazy loading for second image
- Fallback if image fails to load

---

## Testing

After adding images:

1. Start dev server: `npm run dev`
2. Navigate to: `/about` route
3. Scroll down to see gallery section
4. Verify images display with captions
5. Check responsive design on mobile

---

## Troubleshooting

**Images not showing?**
1. Check file names match exactly
2. Ensure files are in `public/family/` directory
3. Check browser console for 404 errors
4. Clear browser cache (Ctrl+Shift+Delete)

**Wrong image dimensions?**
- Images use `object-cover` for aspect ratio
- Height set to 80 (320px) on all screens
- Width is 100% of container (max 512px)

**Captions not showing?**
- Check translations.js has the keys
- Verify language context is working
- Check browser console for errors

---

## Next Steps

1. ✅ Code is ready (About.jsx updated)
2. 📸 Add your images to `public/family/`
3. 🧪 Test on local dev server
4. 🚀 Deploy to production
5. 🎉 Images will display on live site

---

**Ready to add your family photos!** 📷
