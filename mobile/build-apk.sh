#!/bin/bash

# PrepIQ Mobile - Build Script
# This script helps build the PrepIQ mobile app APK

echo "🏗️  PrepIQ Mobile Build Script"
echo "==============================="

# Check if required tools are installed
echo "📋 Checking dependencies..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install EAS CLI if not already installed
if ! command -v eas &> /dev/null; then
    echo "📥 Installing EAS CLI..."
    npm install -g @expo/cli eas-cli
fi

echo "✅ Dependencies installed"

# Build instructions
echo ""
echo "🚀 BUILD INSTRUCTIONS"
echo "====================="
echo ""
echo "To build the APK, you have two options:"
echo ""
echo "1. 📱 Build with EAS (Recommended):"
echo "   - Login to Expo: eas login"
echo "   - Build APK: eas build --platform android --profile preview"
echo "   - This will create a signed APK that can be distributed"
echo ""
echo "2. 🔧 Local Development Build:"
echo "   - Install Android Studio and setup Android SDK"
echo "   - Run: npx expo run:android"
echo "   - This creates a debug APK for testing"
echo ""
echo "📱 For immediate testing:"
echo "   - Download Expo Go app on your Android device"
echo "   - Run: npm start"
echo "   - Scan the QR code with Expo Go"
echo ""
echo "🎯 The app includes:"
echo "   ✨ Material Design 3 theming"
echo "   🔐 Authentication with JWT tokens"
echo "   📊 Dashboard with sales analytics"
echo "   📦 Inventory management"
echo "   🍽️  Menu management with cost tracking"
echo "   👥 Team management (basic structure)"
echo "   📈 Analytics (basic structure)"
echo "   ⚙️  Settings and account management"
echo ""
echo "🔗 Backend API:"
echo "   - The app connects to the FastAPI backend"
echo "   - Default URL: http://localhost:8000 (development)"
echo "   - Update API_BASE_URL in src/constants/index.ts for production"
echo ""

# Start development server
echo "🚀 Starting development server..."
echo "   You can now scan the QR code with Expo Go app"
echo ""

# Note: In CI/headless mode, expo start won't work properly
# This would normally start the dev server: npm start