# 📱 Android APK Build Script (Windows)
# This script automates the Android APK build process

Write-Host "🚀 Starting Android APK build process..." -ForegroundColor Green
Write-Host ""

# Check if Capacitor is installed
$capInstalled = Get-Command cap -ErrorAction SilentlyContinue
if (-not $capInstalled) {
    Write-Host "📦 Installing Capacitor CLI..." -ForegroundColor Yellow
    npm install -g @capacitor/cli
}

# Install Capacitor dependencies
Write-Host "📦 Installing Capacitor dependencies..." -ForegroundColor Yellow
npm install @capacitor/core @capacitor/android @capacitor/cli --save

# Check if android folder exists
if (-not (Test-Path "android")) {
    Write-Host "🔧 Adding Android platform..." -ForegroundColor Yellow
    npx cap add android
} else {
    Write-Host "✅ Android platform already exists" -ForegroundColor Green
}

# Sync Capacitor
Write-Host "🔄 Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync android

# Copy capacitor config if it doesn't exist
if (-not (Test-Path "capacitor.config.json")) {
    Write-Host "⚠️  capacitor.config.json not found!" -ForegroundColor Red
    Write-Host "Creating default configuration..." -ForegroundColor Yellow
    
    @"
{
  "appId": "com.kulswamini.prathisthan",
  "appName": "कुलस्वामिनी प्रतिष्ठान",
  "webDir": "dist",
  "server": {
    "url": "https://kul-swamini-prathisthan.vercel.app",
    "cleartext": true
  }
}
"@ | Out-File -FilePath "capacitor.config.json" -Encoding UTF8
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npx cap open android"
Write-Host "2. In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)"
Write-Host "3. APK will be in: android\app\build\outputs\apk\debug\"
Write-Host ""
Write-Host "🚀 Or build via command line:" -ForegroundColor Cyan
Write-Host "   cd android"
Write-Host "   .\gradlew.bat assembleDebug"
Write-Host ""
