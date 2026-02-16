# 🕌 Sukoon

**A mindful prayer sanctuary for Muslims** — helping you find peace, reduce digital distractions, and deepen your connection with prayer.

Sukoon (سكون) means "tranquility" or "stillness" in Arabic. This app is designed not as a dashboard, but as a spiritual companion that guides you through each prayer with mindfulness, reflection, and serenity.

## ✨ Core Features

### 🕰️ Accurate Prayer Times
- **Location-based calculations** using multiple Islamic calculation methods (MWL, ISNA, Umm al-Qura, and more)
- **Manual adjustments** for each prayer time (+/- minutes)
- **Asr calculation options** (Standard Shafi'i/Maliki/Hanbali or Hanafi)
- **Automatic location detection** with manual entry fallback (city, postal code, or coordinates)
- **Ramadan-aware** with Suhoor and Iftar times during the blessed month
- **Jumu'ah reminders** for Friday prayers with Sunnah prompts (Surah Al-Kahf, ghusl, blessed hour)

### 🧘 Mindfulness Flow
A complete pre-prayer and post-prayer spiritual experience:
- **Niyyah (Intention)** setting for each prayer
- **Guided breathing exercises** with beautiful animated circles
- **Post-prayer reflection** with mood tracking and gratitude prompts
- **Quranic verses** and spiritual reminders
- **Prayer-specific gradients** that match the time of day (Fajr dawn, Dhuhr noon, etc.)

### 🌸 Reflection Garden
- **Personal spiritual journal** to record reflections, duas, and thoughts
- **Mood tracking** to understand your spiritual journey
- **Beautiful garden metaphor** where each reflection helps your garden grow

### 🕋 Qibla Finder
- **Accurate Qibla direction** using device compass and location
- **Visual compass** with distance to Makkah
- **Works offline** once location is set

### 🕌 Mosque Mode
- **Silent mode for mosques** - automatically silences notifications when at a mosque
- **Location-based activation** with customizable radius
- **Manual toggle** for quick activation

### 📊 Prayer Tracking & Achievements
- **Daily prayer tracking** with on-time vs. late indicators
- **Streak tracking** to build consistent habits
- **Achievement system** with meaningful badges (First Light, Steadfast, Night Vigil, etc.)
- **Weekly and monthly statistics** with visual charts
- **Mindfulness session history**

### 🔔 Smart Notifications
- **Customizable reminders** before each prayer (5-60 minutes)
- **Adhan audio** with full and short options
- **Tahajjud reminders** for night prayer (optional, twice weekly)
- **Gentle notification style** designed to invite, not interrupt

### 🎨 Beautiful Design
- **Dark and Light themes** with warm, sanctuary-inspired color palettes
- **Prayer-time gradients** that evolve throughout the day
- **Smooth animations** using React Native Reanimated
- **Warm, mindful UI** inspired by mosque architecture and natural light

### 🔒 Privacy First
- **100% local storage** - all data stays on your device
- **No account required** - no email, no password, no tracking
- **No analytics** - your spiritual journey is private
- **Offline-capable** - works without internet after initial setup

## 🚀 Getting Started

### Prerequisites
- **Node.js** 16 or higher
- **npm** or **yarn**
- **Expo CLI** (optional, for development)
- **iOS Simulator** (macOS only) or **Android Studio** with emulator

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/sukoon.git
cd sukoon
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm start
```

4. **Run on your device:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Or scan the QR code with **Expo Go** app on your physical device

### First Launch Setup
On first launch, Sukoon will guide you through:
1. **Location setup** - Allow location access or enter manually
2. **Notification permissions** - Enable prayer time reminders
3. **Calculation method** - Choose your preferred Islamic calculation method
4. **Name (optional)** - Personalize your experience

## 🛠️ Tech Stack

### Core Technologies
- **React Native** 0.79.5 - Cross-platform mobile framework
- **Expo** 53 - Development platform and build tools
- **TypeScript** 5.8 - Type-safe JavaScript

### State & Storage
- **Zustand** - Lightweight state management
- **react-native-mmkv** - Fast, encrypted local storage
- **Expo Secure Store** - Secure credential storage

### UI & Styling
- **NativeWind** 4.1 - Tailwind CSS for React Native
- **React Native Reanimated** 3.17 - Smooth 60fps animations
- **Expo Linear Gradient** - Beautiful gradient backgrounds
- **React Native SVG** - Vector graphics support

### Navigation
- **React Navigation** 7 - Stack and tab navigation
- **Bottom Tabs** - Main app navigation
- **Stack Navigator** - Screen transitions

### Services & APIs
- **Aladhan API** - Accurate prayer time calculations
- **Expo Location** - GPS and location services
- **Expo Notifications** - Local push notifications
- **Expo Audio** - Adhan playback
- **Expo Sensors** - Compass for Qibla finder

### Firebase (Optional)
- **Firebase Analytics** - Usage insights (opt-in)
- **Firebase Auth** - Authentication (for future cloud sync)
- **Firestore** - Cloud database (for future features)

### Monetization (Optional)
- **Google Mobile Ads** - Non-intrusive ads (optional)
- **React Native IAP** - In-app purchases for ad removal

## 📱 Screenshots

<div align="center">
  <img src="docs/screenshots/home.png" width="250" alt="Home Screen" />
  <img src="docs/screenshots/mindfulness.png" width="250" alt="Mindfulness Flow" />
  <img src="docs/screenshots/stats.png" width="250" alt="Progress Stats" />
</div>

## 🏗️ Project Structure

```
Sukoon/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── common/             # Generic components (DailyVerse, SunTimesDisplay, etc.)
│   │   ├── prayer/             # Prayer-related components (PrayerCard, SanctuaryView, etc.)
│   │   ├── mindfulness/        # Mindfulness flow components
│   │   ├── mosque/             # Mosque mode components
│   │   ├── garden/             # Reflection garden components
│   │   ├── achievements/       # Achievement display components
│   │   ├── settings/           # Settings UI components
│   │   └── monetization/       # Ad and IAP components
│   ├── screens/                # Full screen components
│   │   ├── Home/              # Main prayer times sanctuary screen
│   │   ├── Mindfulness/       # Breathing & reflection flow
│   │   ├── ReflectionGarden/  # Spiritual journal
│   │   ├── QiblaFinder/       # Qibla compass
│   │   ├── MosqueMode/        # Mosque mode settings
│   │   ├── Achievements/      # Achievement gallery
│   │   ├── Stats/             # Progress tracking & analytics
│   │   ├── Settings/          # App settings & preferences
│   │   ├── Menu/              # Menu navigation
│   │   ├── Onboarding/        # First-time setup wizard
│   │   └── Support/           # Help & support
│   ├── services/              # Business logic & API integrations
│   │   ├── PrayerTimeService.ts        # Prayer time calculations
│   │   ├── NotificationService.ts      # Push notifications & reminders
│   │   ├── StorageService.ts           # Local data persistence
│   │   ├── LocationService.ts          # GPS & geocoding
│   │   ├── AchievementService.ts       # Achievement tracking
│   │   ├── MosqueModeService.ts        # Mosque mode automation
│   │   ├── ReflectionGardenService.ts  # Journal management
│   │   ├── RamadanCountdownService.ts  # Ramadan features
│   │   └── monetization/               # Ads & IAP services
│   ├── providers/             # React Context providers
│   │   ├── PrayerTimesProvider.tsx    # Centralized prayer times
│   │   ├── ThemeProvider.tsx          # Dark/Light theme
│   │   └── NavigationProvider.tsx     # Navigation setup
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAppInitialization.ts
│   │   ├── usePrayerTimes.ts
│   │   ├── useLocationSetup.ts
│   │   └── useThemedStyles.ts
│   ├── store/                 # Zustand state management
│   │   └── useStore.ts        # Global app state
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Helper functions
│   ├── theme/                 # Design tokens & colors
│   └── constants/             # App-wide constants
├── assets/                    # Static resources
│   ├── icons/                 # App icons & SVGs
│   └── sounds/                # Adhan audio files
├── plugins/                   # Expo config plugins
├── App.tsx                    # Main app entry point
├── app.config.js              # Expo configuration
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript configuration
```

## 🔧 Configuration

### Prayer Calculation Methods
Sukoon supports 8 major Islamic calculation methods:
- **Muslim World League (MWL)** - Default, widely used globally
- **Islamic Society of North America (ISNA)** - North America
- **Egyptian General Authority of Survey** - Egypt
- **Umm al-Qura University, Makkah** - Saudi Arabia
- **University of Islamic Sciences, Karachi** - Pakistan
- **Institute of Geophysics, University of Tehran** - Iran
- **Shia Ithna Ashari, Leva Institute, Qum** - Shia method
- **Gulf Region** - Used in Gulf countries

### Asr Calculation
- **Standard** (Shafi'i, Maliki, Hanbali) - Shadow length = object length + noon shadow
- **Hanafi** - Shadow length = 2 × object length + noon shadow

### User Customization
Users can customize:
- **Prayer time adjustments** - Add or subtract minutes for each prayer
- **Notification timing** - 5 to 60 minutes before each prayer
- **Adhan audio** - Full or short version
- **Theme** - Dark or Light mode
- **Tahajjud reminders** - Optional night prayer encouragement
- **Jumu'ah reminders** - Friday Sunnah reminders
- **Mosque Mode** - Auto-silence at mosque locations

## 🧪 Development

### Linting & Type Checking
```bash
# Run ESLint
npm run lint

# Fix linting issues automatically
npm run lint:fix

# TypeScript type checking
npx tsc --noEmit
```

### Running on Devices
```bash
# iOS (macOS only)
npm run ios

# Android
npm run android

# Start Metro bundler
npm start
```

## 📦 Building for Production

### Using EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android (APK for testing)
eas build --platform android --profile preview

# Build for Android (AAB for Play Store)
eas build --platform android --profile production
```

### Local Builds
```bash
# iOS (requires macOS and Xcode)
npm run ios --configuration Release

# Android APK
npm run android --variant=release
```

## 🤝 Contributing

Sukoon is built as **sadaqah jariyah** (continuous charity) for the Muslim community. Contributions are warmly welcomed!

### How to Contribute
1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/spiritual-feature`)
3. **Commit** your changes (`git commit -m 'Add meaningful feature'`)
4. **Push** to the branch (`git push origin feature/spiritual-feature`)
5. **Open** a Pull Request

### Contribution Guidelines
- **Respectful content** - Ensure all text is appropriate and respectful of Islamic values
- **Test thoroughly** - Test on both iOS and Android before submitting
- **Follow code style** - Use existing patterns and TypeScript best practices
- **Update documentation** - Keep README and code comments up to date
- **Privacy first** - Never add tracking or analytics without explicit opt-in
- **Accessibility** - Consider users with different abilities

### Areas Where We Need Help
- 🌍 **Translations** - Arabic, Urdu, Turkish, French, Indonesian, Malay
- 📚 **Islamic content** - Duas, Quranic verses, hadith (with proper attribution)
- 🎨 **Design** - UI/UX improvements, icons, illustrations
- 🧪 **Testing** - Bug reports, edge case testing
- 📖 **Documentation** - Tutorials, guides, API documentation

## 📝 License

This project is **free and open source**, intended as a benefit for the Muslim Ummah. Feel free to use, modify, and distribute as needed. May Allah accept this as sadaqah jariyah for all contributors.

## 🙏 Acknowledgments

### Islamic Resources
- **Aladhan API** - Accurate prayer time calculations
- **Islamic Finder** - Qibla direction calculations
- **Nasir Al-Qatami** - Beautiful Adhan recitation

### Technical
- **React Native & Expo** - Cross-platform mobile framework
- **Zustand** - State management
- **NativeWind** - Styling system
- **All open source contributors** who make projects like this possible

### Design
- **Mosque icons** by BW Designer - Flaticon
- **Islamic geometric patterns** - Traditional Islamic art inspiration

## 📞 Support & Feedback

If you encounter issues or have suggestions:
- **GitHub Issues** - Report bugs or request features
- **Discussions** - Share ideas and ask questions
- **Email** - [Your support email here]

## 🚀 Roadmap

### ✅ Phase 1 - Sanctuary Foundation (Complete)
- ✅ Accurate prayer times with multiple calculation methods
- ✅ Mindfulness Flow with breathing exercises and reflection
- ✅ Prayer tracking and streak system
- ✅ Achievement system with meaningful badges
- ✅ Reflection Garden spiritual journal
- ✅ Qibla Finder with compass
- ✅ Mosque Mode with location-based automation
- ✅ Dark and Light themes with warm color palettes
- ✅ Local-first privacy with MMKV storage
- ✅ Ramadan features (Suhoor/Iftar times)
- ✅ Jumu'ah reminders with Sunnah prompts

### 🔨 Phase 2 - Enhanced Spirituality (In Progress)
- 🔄 **Expanded verse database** - More Quranic verses and hadith
- 🔄 **Dua library** - Categorized duas for different occasions
- 🔄 **Enhanced Reflection Garden** - Tags, search, and insights
- 📋 **Tasbih counter** - Digital dhikr counter
- 📋 **Quranic reminders** - Daily verse notifications
- 📋 **Prayer time widgets** - Home screen widgets (iOS/Android)

### 📅 Phase 3 - Community & Sync (Future)
- ☁️ **Optional cloud sync** - Backup and restore across devices
- 👥 **Prayer buddy system** - Connect with friends for accountability
- 🌍 **Multi-language support** - Arabic, Urdu, Turkish, French, Indonesian
- 📱 **Share reflections** - Export beautiful reflection cards
- 🕌 **Mosque finder** - Nearby mosques with prayer times

### 🌟 Phase 4 - Advanced Features (Future)
- ⌚ **Apple Watch & Wear OS** - Wearable companion apps
- 📖 **Quran integration** - Full Quran with translations
- 🎓 **Islamic learning modules** - Bite-sized Islamic knowledge
- 📊 **Advanced insights** - Spiritual growth analytics
- 🎯 **Personalized recommendations** - Based on prayer patterns
- 🕋 **Qibla AR** - Augmented reality Qibla direction

---

## 💝 Built with Love for the Ummah

**Sukoon** is built with love and dedication for the Muslim community worldwide. May Allah accept this work and make it a means of benefit for all who use it.

*"The best of people are those who bring most benefit to others."* — Prophet Muhammad ﷺ

*"Whoever guides someone to goodness will have a reward like the one who did it."* — Prophet Muhammad ﷺ

---

**May this app be a source of tranquility (sukoon) in your spiritual journey. Ameen.** 🤲