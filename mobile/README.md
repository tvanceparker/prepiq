# PrepIQ Mobile 📱

A modern, sleek React Native mobile application for restaurant management, built with Material Design 3 principles.

## 🌟 Features

### 🎨 Modern Design
- **Material Design 3** theming with React Native Paper
- **Sleek animations** and smooth transitions
- **Dark/Light mode** support
- **Responsive layout** for all screen sizes

### 🔐 Authentication
- Secure login and registration
- **JWT token** authentication
- **Biometric authentication** ready
- **Secure storage** for sensitive data

### 📊 Dashboard
- **Real-time analytics** with beautiful charts
- **Sales tracking** and target monitoring
- **Inventory alerts** and notifications
- **Staff on duty** monitoring
- **Prep completion** tracking

### 📦 Inventory Management
- **Real-time stock** level tracking
- **Search and filter** by category
- **Low stock alerts** and notifications
- **Supplier management**
- **Cost tracking** per unit

### 🍽️ Menu Management
- **Complete menu builder** with categories
- **Ingredient tracking** and costing
- **Popularity metrics** and trends
- **Profit margin** calculations
- **Prep time** management

### 👥 Team Management *(Coming Soon)*
- Employee scheduling
- Clock-in/out tracking
- Shift management
- Performance analytics

### 📈 Analytics *(Coming Soon)*
- Profitability analysis
- Ingredient trends
- Waste tracking
- Business intelligence

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI
- Android Studio (for APK building)

### Installation

1. **Navigate to mobile directory**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Test on device**
   - Install **Expo Go** app on your mobile device
   - Scan the QR code displayed in the terminal
   - The app will load on your device

## 📱 Building APK

### Option 1: EAS Build (Recommended)

1. **Install EAS CLI**
   ```bash
   npm install -g @expo/cli eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Build APK**
   ```bash
   eas build --platform android --profile preview
   ```

### Option 2: Local Build

1. **Setup Android Studio**
   - Install Android Studio
   - Setup Android SDK
   - Configure environment variables

2. **Build locally**
   ```bash
   npx expo run:android
   ```

### Option 3: Use Build Script

Run the provided build script for guided setup:
```bash
./build-apk.sh
```

## 🏗️ Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── ScreenLayout.tsx
│   ├── constants/           # App constants and themes
│   │   ├── index.ts
│   │   └── theme.ts
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── dashboard/      # Dashboard screens
│   │   ├── inventory/      # Inventory management
│   │   ├── menu/           # Menu management
│   │   ├── sales/          # Sales analytics
│   │   ├── team/           # Team management
│   │   ├── analytics/      # Business analytics
│   │   └── settings/       # App settings
│   ├── services/           # API services
│   │   └── api.ts
│   └── stores/             # State management
│       └── authStore.ts
├── assets/                 # Static assets
├── App.tsx                # Main app component
└── package.json
```

## 🎨 Design System

### Colors
- **Primary**: #1976D2 (Material Blue)
- **Secondary**: #FFA726 (Amber)
- **Success**: #4CAF50 (Green)
- **Warning**: #FF9800 (Orange)
- **Error**: #F44336 (Red)

### Typography
- **Headlines**: Bold, clear hierarchy
- **Body text**: Readable, accessible
- **Captions**: Subtle, informative

### Components
- **Cards**: Elevated surfaces with subtle shadows
- **Buttons**: Material Design 3 style
- **Icons**: Material Community Icons
- **Charts**: Clean, informative data visualization

## 🔧 Configuration

### API Configuration

Update the API base URL in `src/constants/index.ts`:

```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'        // Development
  : 'https://your-api.com';        // Production
```

### Theme Customization

Customize colors and styling in `src/constants/theme.ts`:

```typescript
export const Colors = {
  primary: '#1976D2',
  secondary: '#FFA726',
  // ... other colors
};
```

## 📱 Platform Support

- ✅ **Android** 7.0+ (API level 24+)
- ✅ **iOS** 13.0+ (when built for iOS)
- ✅ **Web** (Progressive Web App)

## 🔌 Backend Integration

The mobile app integrates with the FastAPI backend:

- **Authentication**: `/auth/login`, `/auth/register`
- **Dashboard**: `/dashboard/daily-overview`
- **Sales**: `/sales/forecast`, `/sales/data`
- **Inventory**: `/inventory`, `/inventory/stock-movements`
- **Menu**: `/menu/items`, `/menu/recipes`

## 🚧 Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run as web app

### State Management

The app uses **Zustand** for state management:
- Lightweight and modern
- TypeScript support
- Persistent storage for auth state

### Navigation

**React Navigation v6** provides:
- Tab navigation for main sections
- Stack navigation for screen hierarchy
- Drawer navigation for settings (future)

## 🎯 Future Enhancements

- [ ] **Real-time updates** with WebSocket integration
- [ ] **Push notifications** for alerts and updates
- [ ] **Offline mode** with local data caching
- [ ] **Biometric authentication** (fingerprint/face)
- [ ] **Multi-language support** (i18n)
- [ ] **Advanced analytics** with interactive charts
- [ ] **Camera integration** for inventory scanning
- [ ] **Geolocation** for delivery tracking

## 📄 License

This is a private repository. All rights reserved.

## 🆘 Support

For technical support or questions about the mobile app:
- Check the main PrepIQ repository README
- Review the API documentation at `/docs` endpoint
- Contact the development team

---

**PrepIQ Mobile** - Restaurant management at your fingertips 📱✨