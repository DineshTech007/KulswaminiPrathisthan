# 📱 Android APK Setup Guide - Capacitor WebView App

## Overview
This guide will help you create an Android APK that wraps your existing website (https://kul-swamini-prathisthan.vercel.app) in a native WebView.

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Install Dependencies
```bash
# Install Capacitor CLI globally (one-time)
npm install -g @capacitor/cli

# Install Capacitor core and Android platform
npm install @capacitor/core @capacitor/android
```

### Step 2: Initialize Capacitor
```bash
# Initialize Capacitor configuration
npx cap init "कुलस्वामिनी प्रतिष्ठान" "com.kulswamini.prathisthan" --web-dir=dist
```

This creates:
- `capacitor.config.json` - Configuration file
- Sets app name and package ID

### Step 3: Add Android Platform
```bash
# Add Android platform
npx cap add android
```

This creates an `android/` folder with complete Android project.

### Step 4: Configure WebView URL

Edit `capacitor.config.json`:
```json
{
  "appId": "com.kulswamini.prathisthan",
  "appName": "कुलस्वामिनी प्रतिष्ठान",
  "webDir": "dist",
  "server": {
    "url": "https://kul-swamini-prathisthan.vercel.app",
    "cleartext": true
  },
  "android": {
    "allowMixedContent": true
  }
}
```

### Step 5: Build APK

**Option A: Using Android Studio (Recommended)**
```bash
# Open in Android Studio
npx cap open android

# Then in Android Studio:
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```

**Option B: Command Line**
```bash
cd android
./gradlew assembleDebug

# APK will be in:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📋 Complete File Structure

After setup, your project will look like:

```
YourProject/
├── android/                    # Native Android project
│   ├── app/
│   │   ├── src/
│   │   └── build.gradle
│   ├── gradle/
│   └── build.gradle
├── dist/                       # Your Vite build output
├── capacitor.config.json       # Capacitor config
└── package.json
```

---

## 🎯 Android App Features

The APK will have:
- ✅ Native Android app icon
- ✅ Splash screen
- ✅ Full-screen WebView loading your website
- ✅ Hardware back button support
- ✅ Offline handling
- ✅ Pull-to-refresh
- ✅ Status bar customization

---

## 🎨 Customize App Icon & Splash Screen

### 1. App Icon
```bash
# Place your icon at:
# android/app/src/main/res/mipmap-*/ic_launcher.png

# Sizes needed:
# mipmap-mdpi: 48x48
# mipmap-hdpi: 72x72
# mipmap-xhdpi: 96x96
# mipmap-xxhdpi: 144x144
# mipmap-xxxhdpi: 192x192
```

### 2. Splash Screen
```bash
# Place splash image at:
# android/app/src/main/res/drawable/splash.png

# Recommended size: 2732x2732 (center content in 1200x1200 safe area)
```

---

## ⚙️ Advanced Configuration

### Enable Pull-to-Refresh
Edit `capacitor.config.json`:
```json
{
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#ffffff"
    }
  }
}
```

### Handle External Links
Create `android/app/src/main/java/com/kulswamini/prathisthan/MainActivity.java`:

```java
package com.kulswamini.prathisthan;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Enable JavaScript
    this.bridge.getWebView().getSettings().setJavaScriptEnabled(true);
    
    // Enable DOM storage
    this.bridge.getWebView().getSettings().setDomStorageEnabled(true);
  }
}
```

---

## 🔧 Build for Production (Release APK)

### Step 1: Generate Keystore
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### Step 2: Configure Signing

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('my-release-key.keystore')
            storePassword 'your-password'
            keyAlias 'my-key-alias'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build Release APK
```bash
cd android
./gradlew assembleRelease

# APK at: android/app/build/outputs/apk/release/app-release.apk
```

---

## 📦 Building AAB for Google Play Store

```bash
cd android
./gradlew bundleRelease

# AAB at: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🧪 Testing

### On Physical Device
1. Enable "Developer Options" on your Android phone
2. Enable "USB Debugging"
3. Connect phone via USB
4. Run: `npx cap run android`

### On Emulator
1. Open Android Studio
2. Tools > Device Manager
3. Create Virtual Device
4. Run: `npx cap run android`

---

## 🎯 App Permissions

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <!-- Internet access (required for WebView) -->
    <uses-permission android:name="android.permission.INTERNET" />
    
    <!-- Optional: Network state -->
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config"
        ...>
    </application>
</manifest>
```

---

## 🔄 Updating the App

When your website changes:

1. **No rebuild needed!** - App loads latest website automatically
2. Only rebuild if you change:
   - App icon
   - Splash screen
   - App name
   - Native Android code

---

## 📱 App Size

- **APK size:** ~5-8 MB
- **Installed size:** ~15-20 MB

---

## 🐛 Troubleshooting

### Issue: "App not loading website"
**Solution:**
1. Check internet connection
2. Verify URL in `capacitor.config.json`
3. Check `AndroidManifest.xml` has INTERNET permission

### Issue: "White screen on startup"
**Solution:**
1. Configure splash screen
2. Check website is accessible
3. Look at Android Studio Logcat for errors

### Issue: "Can't build APK"
**Solution:**
1. Install Android Studio
2. Install Android SDK (API 33+)
3. Set ANDROID_HOME environment variable
4. Run: `npx cap sync android`

---

## 📚 Useful Commands

```bash
# Sync web content to Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Run on device/emulator
npx cap run android

# Update Capacitor
npm install @capacitor/core@latest @capacitor/android@latest
npx cap sync

# Clean build
cd android && ./gradlew clean && cd ..
```

---

## 🌐 Alternative: Expo (React Native)

If you prefer React Native instead of Capacitor:

```bash
# Install Expo
npm install -g expo-cli

# Create new project
expo init KulswaminiApp
cd KulswaminiApp

# Install WebView
expo install react-native-webview

# Edit App.js to show WebView
# Then: expo build:android
```

---

## ✅ Capacitor vs Expo Comparison

| Feature | Capacitor | Expo |
|---------|-----------|------|
| Setup time | 5 minutes | 10 minutes |
| APK size | 5-8 MB | 20-30 MB |
| Native feel | Excellent | Good |
| Updates | Instant (website) | Needs rebuild |
| Complexity | Simple | Medium |

**Recommendation:** Use Capacitor for this use case!

---

## 🎉 Final Checklist

- [ ] Install Capacitor CLI
- [ ] Run `npx cap init`
- [ ] Run `npx cap add android`
- [ ] Edit `capacitor.config.json` with website URL
- [ ] Add app icon to `android/app/src/main/res/mipmap-*/`
- [ ] Add splash screen to `android/app/src/main/res/drawable/`
- [ ] Run `npx cap open android`
- [ ] Build APK in Android Studio
- [ ] Test on device
- [ ] Share APK with users! 🎊

---

**Created:** November 12, 2025  
**Platform:** Android (APK)  
**Tool:** Capacitor  
**Website:** https://kul-swamini-prathisthan.vercel.app
