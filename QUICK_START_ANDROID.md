# 🚀 Quick Start - Build Android APK in 5 Minutes

## Prerequisites
- ✅ Node.js installed
- ✅ Android Studio installed ([Download](https://developer.android.com/studio))
- ✅ Java JDK installed (comes with Android Studio)

---

## Step 1: Install Capacitor (1 minute)

Open PowerShell in your project folder:

```powershell
npm install @capacitor/core @capacitor/cli @capacitor/android
```

---

## Step 2: Add Android Platform (1 minute)

```powershell
npx cap add android
```

This creates an `android/` folder with your Android project.

---

## Step 3: Sync Configuration (30 seconds)

```powershell
npx cap sync android
```

This copies your `capacitor.config.json` settings to the Android project.

---

## Step 4: Open in Android Studio (30 seconds)

```powershell
npx cap open android
```

Android Studio will open with your project loaded.

---

## Step 5: Build APK (2 minutes)

In Android Studio:

1. Wait for Gradle sync to finish (bottom right corner)
2. Click **Build** menu
3. Select **Build Bundle(s) / APK(s)**
4. Click **Build APK(s)**
5. Wait for build to complete
6. Click **locate** when "APK(s) generated successfully" appears

**APK Location:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## ✅ Done! Install on Phone

### Method 1: USB Cable
1. Enable "Developer Options" on your phone
2. Enable "USB Debugging"
3. Connect phone to computer
4. Copy `app-debug.apk` to phone
5. Open and install

### Method 2: Share APK
1. Upload `app-debug.apk` to Google Drive / Dropbox
2. Open link on your phone
3. Download and install

---

## 📱 What You Get

Your APK will:
- ✅ Load your website: https://kul-swamini-prathisthan.vercel.app
- ✅ Work offline (with cache)
- ✅ Show app icon on phone
- ✅ Feel like a native app
- ✅ Support back button
- ✅ Auto-update when website changes (no rebuild needed!)

---

## 🎨 Customize (Optional)

### Change App Icon
1. Go to `android/app/src/main/res/`
2. Replace `mipmap-*/ic_launcher.png` with your icon
3. Rebuild APK

### Change App Name
Edit `capacitor.config.json`:
```json
{
  "appName": "Your App Name"
}
```
Then run: `npx cap sync android`

### Change Splash Screen
1. Add image to `android/app/src/main/res/drawable/splash.png`
2. Rebuild APK

---

## 🔧 Troubleshooting

### "Gradle sync failed"
**Solution:** 
- File > Sync Project with Gradle Files
- Tools > SDK Manager > Install latest Android SDK

### "APK not installing on phone"
**Solution:**
- Enable "Install from Unknown Sources"
- Settings > Security > Unknown Sources

### "White screen in app"
**Solution:**
- Check internet connection
- Check website URL in `capacitor.config.json`
- Look at Logcat in Android Studio for errors

---

## 📊 APK Info

- **Size:** ~5-8 MB
- **Minimum Android:** 5.0 (API 21)
- **Target Android:** 13 (API 33)
- **Permissions:** Internet access only

---

## 🚀 Build Release APK (For Distribution)

### Create Keystore
```powershell
keytool -genkey -v -keystore kulswamini-release.keystore -alias kulswamini -keyalg RSA -keysize 2048 -validity 10000
```

Enter password when prompted (remember it!)

### Build Release
In Android Studio:
1. Build > Generate Signed Bundle / APK
2. Choose APK
3. Select your keystore file
4. Enter passwords
5. Select "release" build variant
6. Click Finish

**Release APK Location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

This APK is ready for distribution!

---

## 📱 Distribution Options

### Option 1: Direct Install
- Share APK file via WhatsApp, Email, Drive
- Users install manually

### Option 2: Google Play Store
- Create Google Play Developer account ($25 one-time)
- Upload APK or AAB bundle
- Fill in app details
- Publish (review takes 1-3 days)

### Option 3: Third-party Stores
- Amazon Appstore (free)
- Samsung Galaxy Store (free)
- APKPure, F-Droid, etc.

---

## ⚡ Commands Cheat Sheet

```powershell
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Add Android platform
npx cap add android

# Sync changes
npx cap sync android

# Open in Android Studio
npx cap open android

# Build APK (command line)
cd android
.\gradlew.bat assembleDebug

# Build Release APK
.\gradlew.bat assembleRelease

# Clean build
.\gradlew.bat clean
```

---

## 🎉 Success Checklist

- [ ] Capacitor installed
- [ ] Android platform added
- [ ] Android Studio opened
- [ ] APK built successfully
- [ ] APK installed on phone
- [ ] App opens and loads website
- [ ] App icon shows on home screen
- [ ] Back button works

---

**Total Time:** 5-10 minutes  
**Result:** Android APK ready to share! 🎊

---

## 📚 Need Help?

Check these files in your project:
- `ANDROID_APK_GUIDE.md` - Complete detailed guide
- `capacitor.config.json` - Configuration file
- `android-templates/` - Sample files for customization

**Next:** Share your APK with family members and they can install it on their phones! 📱✨
