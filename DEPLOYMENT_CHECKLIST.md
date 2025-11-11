# 🚀 Deployment Checklist

## Before Deploying

### ✅ Backend (Render)
- [ ] Add Cloudinary environment variables:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- [ ] Verify other env vars are set (admin passwords, etc.)
- [ ] Deploy latest code to Render
- [ ] Wait for deployment to complete
- [ ] Check Render logs for any errors

### ✅ Frontend (Vercel/Deploy)
- [ ] Ensure `VITE_API_URL` is set correctly (if needed)
- [ ] Run `npm run build` locally to test
- [ ] Deploy to production
- [ ] Clear browser cache after deployment

## After Deploying

### Test Each Feature
- [ ] Login as admin (test authentication)
- [ ] Upload member photo (test `/api/upload` + `/api/upload-image`)
- [ ] Add news with image (test news creation)
- [ ] Edit news with new image (test news update)
- [ ] Add event with image (test event creation)
- [ ] Edit event with new image (test event update)
- [ ] Change site icon (test favicon upload)

### Verify Cloudinary
- [ ] Login to Cloudinary dashboard
- [ ] Check that folders are created (members, news, events, site)
- [ ] Verify images are being uploaded
- [ ] Check storage usage

## Common Issues & Fixes

### Issue: "API endpoint not found"
**Solution:** 
- Verify backend is running on Render
- Check API URL is correct: `https://kulswaminiprathisthan.onrender.com`
- Ensure backend has latest code deployed

### Issue: "Failed to upload image"
**Solution:**
- Check Cloudinary credentials are correct
- Verify Cloudinary account is active
- Check file size < 5MB
- Look at backend logs on Render

### Issue: Images not displaying
**Solution:**
- Check browser console for errors
- Verify Cloudinary URLs are returned correctly
- Check CORS settings on Cloudinary (should allow your domain)

## Production URLs

- **Frontend:** https://kul-swamini-prathisthan.vercel.app/ (or your Vercel URL)
- **Backend API:** https://kulswaminiprathisthan.onrender.com
- **Cloudinary Dashboard:** https://cloudinary.com/console

## Emergency Rollback

If something breaks:
1. Check Render logs: `https://dashboard.render.com`
2. Check browser console for frontend errors
3. Verify environment variables on Render
4. Restart Render service if needed
5. Clear browser cache and test again

---

**Last Updated:** November 12, 2025
**Status:** ✅ All image uploads migrated to Cloudinary
