# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start                   # Start Metro bundler (Expo)
npm run ios                 # Run on iOS simulator
npm run android             # Run on Android emulator

# Quality
npm run lint                # ESLint
npm run lint:fix            # Auto-fix linting issues
npm run typecheck           # TypeScript type check (tsc --noEmit)
npm test                    # Run Jest tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report (runs serially with --runInBand)

# Single test file
npx jest src/__tests__/notificationService.test.ts

# Build troubleshooting
npx expo start -c           # Clear Metro cache
npx expo-doctor             # Verify Expo setup

# Production builds (EAS)
eas build --platform ios
eas build --platform android --profile preview
```

## Architecture Overview

### App Entry & Providers

`App.tsx` wraps the app in a provider stack. The provider order matters:
1. **ThemeProvider** — provides `AppTheme` (dark/light/midnight modes)
2. **ServiceProvider** — initializes MMKV encryption, FireBase, and background services on mount
3. **PrayerTimesProvider** — the single source of truth for prayer times; runs a 60-second tick interval that updates `currentTime` in Zustand and recalculates `nextPrayer`
4. **NavigationProvider** — React Navigation setup (Stack + Bottom Tabs)

### State Management (Zustand + MMKV)

`src/store/useStore.ts` — single Zustand store. Key pattern: **write-through to StorageService** for persistent fields (`userSettings`, `dawam`). Use the named selective hooks (`useUserSettings`, `usePrayerTimesState`, `useSunTimes`, etc.) rather than `useStore` directly to avoid unnecessary re-renders.

`src/services/StorageService.ts` — singleton wrapping two MMKV instances:
- **Encrypted** (`prayer-buddy-storage`) for PII: user settings, reflections, subscriptions
- **Unencrypted** (`prayer-buddy-public`) for high-frequency non-PII: prayer records, stats, dawam, achievements

StorageService defers encrypted MMKV initialization to `initialize()` (called by ServiceProvider) and uses a `MemoryStorage` placeholder until then.

### Prayer Times Data Flow

1. `PrayerTimesProvider` calls `PrayerTimeService.getPrayerTimesList()`
2. `PrayerTimeService` first checks disk cache; on cache miss, fetches from the **edge API** (`EXPO_PUBLIC_EDGE_API_BASE_URL`) or falls back to **Aladhan API** (`api.aladhan.com/v1`)
3. Results flow into Zustand store (`setTodayPrayerTimes`, `setNextPrayer`, etc.)
4. Widgets and Live Activities are updated via `WidgetService.updateWidgetData()` and `LiveActivityService.update()` after each successful load

`calculateNextPrayer` uses Islamic fiqh windows: Fajr ends at sunrise, Dhuhr/Asr/Maghrib end at next prayer start, Isha ends at tomorrow's Fajr.

### Notification Architecture

`src/services/NotificationService.ts` — orchestrates scheduling. Key sub-services:
- `notifications/AdhanPlaybackPolicy.ts` — determines per-platform audio strategy (`silent`, `short_notification_sound`, `foreground_full_clip`, `android_scheduled_full_adhan`)
- `notifications/FullAdhanScheduler.ts` — Android-only native exact-alarm scheduling for full adhan audio
- `notifications/AdhanPlayer.ts` — foreground audio playback via `expo-audio`
- `notifications/NotificationChannels.ts` — Android notification channel setup
- `notifications/HabitBuilderNotifications.ts` — Tier-2 (persistent reminder) and Tier-3 (grace period) follow-ups
- `NotificationLedger.ts` — tracks scheduled notification IDs to prevent duplicates

On Android, iOS notification caps (64 slots) and SCHEDULE_EXACT_ALARM permission constraints shape how far ahead notifications are scheduled (`NOTIFICATION_SCHEDULING_DAYS` constant).

### Theme System

Three modes: `dark`, `light`, `midnight` (default). Components use `useThemedStyles(createStyles)` where `createStyles` is a function `(theme: AppTheme) => StyleSheet.create({...})`. Avoid hardcoding colors — pull from `theme.colors.*`.

### Expo Config Plugins (`plugins/`)

Custom plugins applied during `expo prebuild`:
- `withPlatformSounds.js` — copies adhan audio assets to native iOS/Android directories
- `withFullAdhan.js` — native Android AlarmManager integration for full adhan
- `withLiveActivity.js` — iOS Dynamic Island / Lock Screen Live Activity
- `withAndroidWidget.js` / `withWidget.js` — home screen widget support
- `withRingerMode.js` — Android ringer control for Mosque Mode
- `withBootReceiver.js` — reschedules notifications after device reboot

### Edge API (`edge-api/`)

Cloudflare Worker that proxies Aladhan prayer times, caches results in KV, and provides a city-search endpoint. Configured via `EXPO_PUBLIC_EDGE_API_BASE_URL`. See `docs/cloudflare-edge-setup.md` for deployment.

### Key Constants & Feature Flags

- `src/constants/NotificationConstants.ts` — scheduling limits, channel IDs, sound names
- `src/constants/time.ts` — timing constants (e.g., `ISHA_FALLBACK_DEADLINE_MS`)
- `src/setupFeatureFlags.ts` — React Native feature flag overrides (loaded at app entry)
- `app.config.js` env vars: `EXPO_PUBLIC_EDGE_API_BASE_URL`, `EXPO_PUBLIC_EDGE_API_ENABLED`, `EXPO_PUBLIC_PERF_VALIDATION_ENABLED`, `EXPO_PUBLIC_NOTIFICATION_TRACE_ENABLED`

### Testing

Tests live in `src/__tests__/`. Jest is configured via `jest-expo`. Most service tests mock MMKV, Expo modules, and native APIs. Run a targeted test with `npx jest src/__tests__/<file>.test.ts`.

The `lint:upgrade` script lints only the files that have been upgraded to strict ESLint rules; `lint` covers everything with current rules.
