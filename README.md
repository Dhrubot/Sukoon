# 🕌 PrayerBuddy

A mindful prayer companion app for Muslims, helping to reduce digital distractions and enhance focus during prayer times.

## 🌟 Features

### Core MVP Features
- **🕰️ Accurate Prayer Times**: Location-based prayer time calculations using multiple calculation methods
- **🔔 Smart Notifications**: Gentle reminders before each prayer with customizable timing
- **🧘 Mindfulness Flow**: Pre-prayer breathing exercises and post-prayer reflection prompts
- **📊 Prayer Tracking**: Track your daily prayers and build consistent habits
- **🏆 Achievements**: Unlock badges for consistency and mindful practice
- **🌙 Beautiful UI**: Prayer-time themed gradients that change throughout the day
- **🔒 Privacy First**: All data stored locally on device, no account required

### Coming Soon
- 📱 Digital wellness tracking (Android)
- 📈 Advanced analytics and insights
- 🤝 Prayer buddy system
- 🌍 Multi-language support
- ☁️ Optional cloud sync

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Studio

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/prayer-buddy.git
cd prayer-buddy
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your device:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your physical device

## 🛠️ Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Zustand
- **Storage**: react-native-mmkv (encrypted local storage)
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind for React Native)
- **Animations**: React Native Reanimated
- **Prayer Times API**: Aladhan API

## 📱 Screenshots

<div align="center">
  <img src="docs/screenshots/home.png" width="250" alt="Home Screen" />
  <img src="docs/screenshots/mindfulness.png" width="250" alt="Mindfulness Flow" />
  <img src="docs/screenshots/stats.png" width="250" alt="Progress Stats" />
</div>

## 🏗️ Project Structure

```
PrayerBuddy/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Generic components
│   │   ├── prayer/         # Prayer-related components
│   │   └── mindfulness/    # Mindfulness flow components
│   ├── screens/            # Full screen components
│   │   ├── Home/          # Main prayer times screen
│   │   ├── Mindfulness/   # Breathing & reflection flow
│   │   ├── Settings/      # App settings
│   │   ├── Stats/         # Progress tracking
│   │   └── Onboarding/    # First-time setup
│   ├── services/          # Business logic & API calls
│   │   ├── PrayerTimeService.ts
│   │   ├── NotificationService.ts
│   │   └── StorageService.ts
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Helper functions
│   ├── store/             # Global state management
│   ├── types/             # TypeScript definitions
│   └── constants/         # App-wide constants
├── assets/                # Images, fonts, sounds
├── App.tsx               # Main app entry point
└── package.json          # Dependencies
```

## 🔧 Configuration

### Prayer Calculation Methods
The app supports multiple calculation methods:
- Muslim World League (MWL) - Default
- Islamic Society of North America (ISNA)
- Egyptian General Authority
- Umm al-Qura, Makkah
- University of Islamic Sciences, Karachi
- Institute of Geophysics, Tehran
- Shia Ithna Ashari

### Customization
Users can customize:
- Prayer time adjustments (+/- minutes)
- Asr calculation method (Standard/Hanafi)
- Notification timing
- Theme preferences

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## 📦 Building for Production

### Android
```bash
# Build APK
expo build:android -t apk

# Build AAB for Play Store
expo build:android -t app-bundle
```

### iOS
```bash
# Build for iOS
expo build:ios

# Or use EAS Build
eas build --platform ios
```

## 🤝 Contributing

This app is built as sadaqah jariyah (continuous charity) for the Muslim community. Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines
- Ensure all text content is respectful and appropriate
- Test on both iOS and Android before submitting
- Follow the existing code style
- Update documentation as needed

## 📝 License

This project is free and open source, intended as a benefit for the Muslim community. Feel free to use, modify, and distribute as needed.

## 🙏 Acknowledgments

- Aladhan API for accurate prayer time calculations
- The React Native and Expo communities
- All contributors who help improve this app

## 📞 Support

If you encounter any issues or have suggestions:
- Open an issue on GitHub
- Email: support@prayerbuddy.app (coming soon)

## 🚀 Roadmap

### Phase 1 (Current - MVP)
- ✅ Basic prayer time display
- ✅ Notification system
- ✅ Mindfulness flow
- ✅ Local data storage
- ✅ Basic statistics

### Phase 2 (Next 3 months)
- 📱 Android screen time tracking
- 📊 Advanced analytics
- 🌍 Multi-language support (Arabic, Urdu, Turkish)
- 🎨 Custom themes
- 🔊 Adhan audio options

### Phase 3 (6 months)
- ☁️ Optional cloud sync
- 👥 Prayer buddy system
- 📚 Dua and dhikr library
- 🎯 Personalized insights
- ⌚ Apple Watch app

### Phase 4 (Future)
- 🤖 AI-powered spiritual insights
- 🌐 Community features
- 📖 Quran integration
- 🕋 Qibla direction with AR
- 🎓 Islamic learning modules

---

### Sincere Thanks to Below Creators for their work
- Adhan - Nasir Al-Qatami
- icon - <a href="https://www.flaticon.com/free-icons/mosque" title="mosque icons">Mosque icons created by BW Designer - Flaticon</a>

**Built with ❤️ for the Muslim Ummah**

*"The best of people are those who bring most benefit to others" - Prophet Muhammad ﷺ*