# Theme Refactoring Status

## ✅ Completed
- [x] Theme System Created (`src/theme/`)
- [x] ThemeProvider and Context
- [x] useTheme Hook
- [x] useThemedStyles Helper Hook
- [x] App.tsx (Wrapped with ThemeProvider)
- [x] LoadingScreen.tsx
- [x] TabNavigator.tsx
- [x] HomeScreen.tsx
- [x] PrayerCard.tsx
- [x] NextPrayerCard.tsx

## 🔄 In Progress
The following files still have hardcoded colors and need refactoring:

### Common Components
- [ ] `src/components/common/DailyVerse.tsx`
- [ ] `src/components/stats/QuickStats.tsx`
- [ ] `src/components/digitalWellness/DigitalWellnessCard.tsx`
- [ ] `src/components/LocationModal.tsx`

### Settings Components
- [ ] `src/screens/Settings/SettingsScreen.tsx`
- [ ] `src/components/settings/SettingSection.tsx`
- [ ] `src/components/settings/SettingRow.tsx`
- [ ] `src/components/settings/NotificationSettings.tsx`
- [ ] `src/components/settings/SegmentedControl.tsx`

### Main Screens
- [ ] `src/screens/Stats/StatsScreen.tsx`
- [ ] `src/screens/Achievements/AchievementsScreen.tsx`
- [ ] `src/screens/DigitalWellness/DigitalWellnessScreen.tsx`
- [ ] `src/screens/Support/SupportScreen.tsx`

### Other Components
- [ ] `src/components/achievements/AchievementCelebration.tsx`
- [ ] `src/components/mindfulness/BreathingCircle.tsx`
- [ ] `src/components/mindfulness/MoodSelector.tsx`
- [ ] `src/components/mindfulness/ReflectionPrompts.tsx`
- [ ] `src/screens/Mindfulness/MindfulnessFlow.tsx`

## 📋 Refactoring Pattern for Remaining Files

For each file, follow this pattern:

### 1. Add theme import
```typescript
import { useTheme } from '../providers/ThemeProvider';
// or
import { useThemedStyles } from '../hooks/useThemedStyles';
```

### 2. Get theme in component
```typescript
const { theme } = useTheme();
```

### 3. Replace hardcoded colors

**Before:**
```typescript
backgroundColor: '#1A1F3A'
color: '#FFFFFF'
borderColor: '#00C9A7'
```

**After:**
```typescript
backgroundColor: theme.colors.background.primary
color: theme.colors.text.primary
borderColor: theme.colors.primary.DEFAULT
```

### 4. Common Color Mappings

| Old Color | Theme Property |
|-----------|---------------|
| `#1A1F3A` | `theme.colors.background.primary` |
| `#252B47` | `theme.colors.card.background` |
| `#2D3454` | `theme.colors.card.hover` |
| `#FFFFFF` | `theme.colors.text.primary` |
| `#A0AEC0` | `theme.colors.text.secondary` |
| `#6C7A89` | `theme.colors.text.muted` |
| `#00C9A7` | `theme.colors.primary.DEFAULT` |
| `#1DD1A1` | `theme.colors.primary.light` |
| `#F44336` | `theme.colors.status.error` |
| `#FFB74D` | `theme.colors.status.warning` |

## 🚀 Quick Command Reference

### Run to test dark theme
The app should work perfectly in dark mode (current default).

### Run to test light theme
Add a theme toggle in Settings screen:
```typescript
const { toggleTheme, themeMode } = useTheme();

<TouchableOpacity onPress={toggleTheme}>
  <Text>Current: {themeMode}</Text>
</TouchableOpacity>
```

## 📝 Notes
- All refactored components will automatically support theme switching
- No breaking changes - components work exactly the same way
- Type-safe - TypeScript will catch any theme property errors
- Centralized - Change colors in one place affects the entire app
