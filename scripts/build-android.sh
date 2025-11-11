#!/bin/bash

# 📱 Android APK Build Script
# This script automates the Android APK build process

echo "🚀 Starting Android APK build process..."
echo ""

# Check if Capacitor is installed
if ! command -v cap &> /dev/null; then
    echo "📦 Installing Capacitor CLI..."
    npm install -g @capacitor/cli
fi

# Install Capacitor dependencies
echo "📦 Installing Capacitor dependencies..."
npm install @capacitor/core @capacitor/android @capacitor/cli --save

# Check if android folder exists
if [ ! -d "android" ]; then
    echo "🔧 Adding Android platform..."
    npx cap add android
else
    echo "✅ Android platform already exists"
fi

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync android

# Copy capacitor config if it doesn't exist
if [ ! -f "capacitor.config.json" ]; then
    echo "⚠️  capacitor.config.json not found!"
    echo "Creating default configuration..."
    
    cat > capacitor.config.json << 'EOF'
{
  "appId": "com.kulswamini.prathisthan",
  "appName": "कुलस्वामिनी प्रतिष्ठान",
  "webDir": "dist",
  "server": {
    "url": "https://kul-swamini-prathisthan.vercel.app",
    "cleartext": true
  }
}
EOF
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Next steps:"
echo "1. Run: npx cap open android"
echo "2. In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo "3. APK will be in: android/app/build/outputs/apk/debug/"
echo ""
echo "🚀 Or build via command line:"
echo "   cd android && ./gradlew assembleDebug"
echo ""
