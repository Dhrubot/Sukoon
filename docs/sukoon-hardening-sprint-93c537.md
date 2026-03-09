# Sukoon Codebase Hardening Plan

A prioritized, implementation-ready plan to address every verified finding from the full codebase audit, organized into 6 sprints from ship-blockers to long-term quality.

---

## Audit Verification Summary

I scanned every file referenced in the audit. **46 of 48 claims confirmed exactly.** Two minor inaccuracies:
- `GardenTeaser` IS already wrapped in `React.memo` (audit said it wasn't)
- `AppProvider.tsx` exists and IS unused (confirmed), but it's a 20-line file — low-priority cleanup

---

## Sprint 0 — Critical Bugs (Ship-Blockers)

> These will cause 1-star reviews and missed prayers within the first week at scale.

### 0.1 Day-Boundary Stale State
**File**: `src/providers/PrayerTimesProvider.tsx` (lines 316-348)
**Bug**: AppState resume handler calls `tick()` → `runRecalc()`, which only recalculates `nextPrayer`. It never checks if the calendar date changed. A user who backgrounds at 11pm and opens at 6am sees yesterday's prayer times.
**Fix**: In the AppState `'active'` handler (line 331), add a `getLocalDateKey()` comparison. If the date differs from the date used in the last `loadPrayerTimes()` call, call `loadPrayerTimes()` again. Store the date key in a ref.
**Scope**: ~15 lines changed in PrayerTimesProvider.

### 0.2 Double Notification Scheduling on Cold Start
**File**: `src/hooks/useServiceInitialization.ts` (lines 90-110)
**Bug**: The scheduling `useEffect` depends on `todayPrayerTimes.length`. This changes twice on cold start: once from disk cache, once from API. The 2-min lock allows the second run because both happen within seconds.
**Fix**: Add an `isInitialLoadComplete` flag. Set it to `true` only after the API response in `PrayerTimesProvider.loadPrayerTimes()`. Gate the notification scheduling effect on this flag. Alternative: debounce with a 3-second stable ref.
**Scope**: ~10 lines in PrayerTimesProvider + ~5 lines in useServiceInitialization.

### 0.3 Debug Screen Accessible in Production
**File**: `src/navigation/AppNavigator.tsx` (lines 19-24)
**Bug**: `NotificationDebugScreen` is registered without a `__DEV__` guard. Any user can navigate to it.
**Fix**: Wrap the Stack.Screen registration in `{__DEV__ && ...}`.
**Scope**: 1-line change.

### 0.4 Permission Revocation Not Detected
**File**: `src/services/NotificationService.ts` (line 885+)
**Bug**: `scheduleExtendedNotifications()` never checks current permission status. If permission was revoked, all `scheduleNotificationAsync` calls silently fail on Android, throw on iOS.
**Fix**: Add `Notifications.getPermissionsAsync()` check at the top of `scheduleExtendedNotifications`. If not granted, set a store flag (`notificationPermissionDenied`) that the UI can surface as a banner on HomeScreen.
**Scope**: ~15 lines in NotificationService + ~10 lines for UI banner.

### 0.5 `updateUserSettings` Shallow Merge
**File**: `src/store/useStore.ts` (lines 84-106)
**Bug**: Only merges one level deep. `updateUserSettings({ habitBuilder: { quietHours: { enabled: true } } })` overwrites the entire `quietHours` object, losing `start`/`end`.
**Fix**: Replace the single-level merge with a recursive deep merge (or use a well-tested `deepMerge` utility). Cap recursion at 3 levels to avoid infinite loops.
**Scope**: ~20 lines in useStore.ts.

---

## Sprint 1 — Security Hardening

### 1.1 Hardcoded Encryption Fallback Keys (HIGH)
**File**: `src/utils/secureKeyManager.ts` (lines 66, 81)
**Bug**: `'sukoon-fallback-encryption-key-v1'` and `'sukoon-temp-encryption-key'` are static, publicly known strings. Any device where SecureStore fails gets effectively unencrypted PII storage.
**Fix**: 
- Derive a device-specific fallback using `expo-device` identifiers (deviceName + osVersion + hash) — not perfect, but far better than a static string.
- For `getCachedEncryptionKey()` temp fallback: throw or return a sentinel that forces `StorageService` to use `MemoryStorage` until the real key loads (this already happens pre-initialization — the issue is the `catch` path in `getOrCreateEncryptionKey`).
- Log the fallback path to analytics so we can measure how many devices are affected.
**Scope**: ~30 lines in secureKeyManager.ts.

### 1.2 Math.random Fallback in Key Generation
**File**: `src/utils/secureKeyManager.ts` (lines 22-26)
**Bug**: If `crypto.getRandomValues` is unavailable, `Math.random()` generates the encryption key. Not cryptographically secure.
**Fix**: On React Native 0.79+ (Hermes), `crypto.getRandomValues` is available. Remove the fallback entirely and let it throw — or use `expo-crypto`'s `getRandomBytes` as the fallback instead.
**Scope**: ~10 lines.

### 1.3 Logger Leaks Errors in Production
**File**: `src/utils/logger.ts` (line 11)
**Bug**: `console.error` is always active. Error messages containing user location, prayer data, or settings will appear in device logs.
**Fix**: In production, route errors through a sanitizer that strips PII (coordinates, names, settings objects) before logging via `console.error`. Or disable `console.error` in prod entirely and rely on Crashlytics.
**Scope**: ~15 lines.

### 1.4 Religious Data Analytics (GDPR Article 9)
**File**: `src/services/AnalyticsService.ts`
**Issue**: `prayer_completed`, `prayer_missed` logged to Firebase Analytics. Religious practice data is "special category" under GDPR/CCPA.
**Fix**: Gate all prayer-specific analytics behind an explicit opt-in toggle (not just a privacy policy). Add `analyticsEnabled` to UserSettings (default: false). Check it at the top of `logEvent()`.
**Scope**: ~10 lines in AnalyticsService + ~20 lines for settings toggle.

---

## Sprint 2 — Performance Optimization (Highest ROI)

### 2.1 Conditional Sheet Mounting on HomeScreen
**Files**: `src/screens/Home/HomeScreen.tsx` (lines 747-778)
**Issue**: `HijriNudgeSheet`, `AutoDeduceSheet`, `CatchUpSheet`, `QuickLogSheet`, `MosqueModeOverlay` are always mounted with `visible` prop control.
**Fix**: Replace `<CatchUpSheet visible={showCatchUpSheet} .../>` with `{showCatchUpSheet && <CatchUpSheet .../>}` pattern for all 5 components.
**Estimated gain**: 30% reduction in HomeScreen mount time, fewer animation graph nodes.
**Scope**: ~10 lines.

### 2.2 Debounce 60-Second Tick Downstream Effects
**Files**: `src/screens/Home/HomeScreen.tsx` (lines 310-468)
**Issue**: 8 `useMemo` hooks depend on `currentTime` (updated every 60s), but most only change at prayer boundaries (~5 times/day).
**Fix**: Split into two groups:
- **Time-sensitive** (keep `currentTime` dep): `isFocusMode`, `isHeroPrayerTimeEntered`, `missedPrayersToday`
- **Prayer-boundary** (use `nextPrayer?.name` + `heroPrayer?.name` as dep instead of `currentTime`): `heroPrayer`, `previousPrayerTime`, `mosqueModeHeroInfo`, `heroPrayerRecord`, `missedPreviousPrayer`
**Estimated gain**: ~80% fewer recalculations.
**Scope**: ~20 lines (dependency array changes).

### 2.3 Wrap Missing useCallback in HomeScreen
**File**: `src/screens/Home/HomeScreen.tsx` (lines 134, 139, 173, 263, 256)
**Issue**: `handleQuickLogTrigger`, `handleQuickLogConfirm`, `handleQuickLogOpenFlow`, `handlePrayerComplete`, `loadTodayRecords` are plain functions that create new references every render, defeating `PrayerCard`'s `React.memo`.
**Fix**: Wrap each in `useCallback` with proper dependency arrays.
**Scope**: ~25 lines.

### 2.4 Add React.memo to Unmemoized Children
**Issue**: `SanctuaryView`, `DailyVerse`, `SunTimesDisplay`, `MosqueModeOverlay`, `CatchUpSheet`, `QuickLogSheet` are NOT wrapped in `React.memo`.
**Fix**: Add `React.memo()` wrapping to each component's export.
**Scope**: ~6 one-line changes across 6 files.

### 2.5 Batch Notification Scheduling with Promise.all
**File**: `src/services/NotificationService.ts` (lines 986-1060)
**Issue**: Each scheduling pass awaits every notification sequentially: 65+ sequential native bridge calls (650ms-3.25s JS thread blocking).
**Fix**: Within each pass, collect all `scheduleNotificationAsync` promises and `await Promise.all()`. Notifications within the same pass are independent.
**Scope**: ~30 lines refactored in each of the 5 pass sections.

---

## Sprint 3 — Reliability & Resilience

### 3.1 Disk Cache Timezone Invalidation
**File**: `src/services/PrayerTimeService.ts` (lines 762-792)
**Issue**: `getCachedPrayerTimesFromDisk` validates date + coordinates + method but NOT timezone offset. A timezone change returns stale times.
**Fix**: Add `timezoneOffset: new Date().getTimezoneOffset()` to the cached data and validate it on read.
**Scope**: ~10 lines.

### 3.2 Consolidate AppState Listeners
**Files**: HomeScreen.tsx (line 199), PrayerTimesProvider.tsx (line 330), useNotificationRescheduler.ts (line 16)
**Issue**: Three separate native bridge AppState subscriptions.
**Fix**: Create a single `useAppStateChange` hook that fires callbacks. All three consumers register via this hook. Alternatively, create an `AppStateProvider` context.
**Scope**: ~40 lines new hook + ~15 lines changes in 3 files.

### 3.3 Android Reboot Notification Recovery
**Issue**: Android clears all scheduled notifications on reboot. No `BOOT_COMPLETED` receiver exists.
**Fix**: Create an Expo config plugin (`plugins/withBootReceiver.js`) that adds a `BroadcastReceiver` for `BOOT_COMPLETED`. On boot, it triggers notification rescheduling via a WorkManager one-time task.
**Scope**: ~80 lines new plugin + manifest entries. Requires `npx expo prebuild`.

### 3.4 Notification Storm Partial Failure
**File**: `src/services/NotificationService.ts` (lines 882-1077)
**Issue**: If scheduling crashes after Pass 1 but before completion, the fingerprint is already saved. Next invocation skips rebuilding → user gets Tier 1 only.
**Fix**: Save fingerprint AFTER all passes complete (move line 909 to just before `finally`). On crash, the stale fingerprint forces a full rebuild next time.
**Scope**: ~3 lines moved.

---

## Sprint 4 — Code Quality & Cleanup

### 4.1 Remove Dead Code
- `src/providers/AppProvider.tsx` — unused (App.tsx doesn't import it)
- `react-is@^18.2.0` — no file imports it, remove from package.json
- `react-native-web@^0.20.0` — app doesn't target web in production
- `WebStorage` class in `src/services/StorageAdapter.ts` — native-only app
**Scope**: Delete 1 file, remove 2 deps, remove ~40 lines from StorageAdapter.

### 4.2 Extract Constants from Inline Hardcodes
Move to `src/constants/`:
- `HERO_ADVANCE_MINUTES = 15` (HomeScreen.tsx line 62)
- `48 * 60 * 60 * 1000` keep-alive interval (NotificationService.ts line 640)
- `120_000` scheduling lock timeout (NotificationService.ts line 71)
- `8000` API timeout (PrayerTimeService.ts)
**Scope**: ~15 lines added to constants, ~10 lines changed in source files.

### 4.3 Reduce `as any` Casts (49 total)
**Priority targets** (most dangerous):
- `NotificationService.ts` (13 casts) — fix the `PrayerTimesFetcher` type to accept the actual parameter types
- `useServiceInitialization.ts` (4 casts) — same root cause as above
- `StorageService.ts` (7 casts) — add proper generics to storage getter methods
- `useStore.ts` (4 casts) — type the `updateUserSettings` merge properly
**Scope**: ~50 lines of type improvements across 4 files.

---

## Sprint 5 — Testing Infrastructure (Non-Negotiable Foundation)

### 5.1 Setup Jest + React Native Testing Library
- Add `jest`, `@testing-library/react-native`, `jest-expo` to devDependencies
- Create `jest.config.js` with Expo preset
- Add test script to `package.json`
**Scope**: Config files only.

### 5.2 Critical Path Tests (First 5)
1. **Prayer time calculation accuracy** — Test `calculatePrayerTimes()` against known reference times for 5 cities × 4 methods
2. **Day-boundary transition** — Simulate app open after midnight, verify `loadPrayerTimes` is called
3. **Notification scheduling count** — Verify correct notification count for iOS cap (≤58) and tier distribution
4. **Timezone change handling** — Simulate offset change, verify disk cache invalidation + reschedule trigger
5. **Encryption key fallback chain** — Verify SecureStore failure → device-specific key (not static string)

### 5.3 God-File Decomposition (Long-term)
This is tracked but NOT urgent for the hardening sprint:
- `NotificationService.ts` → split into `NotificationScheduler`, `NotificationListener`, `AdhanController`, `TahajjudScheduler`
- `StorageService.ts` → split into `SettingsStorage`, `PrayerRecordStorage`, `StatsStorage`, `MonetizationStorage`
- `HomeScreen.tsx` → extract `usePrayerHero` hook, `useSheetManager` hook, move greeting logic to utility

---

## Implementation Order (Recommended)

| Priority | Items | Effort | Impact |
|----------|-------|--------|--------|
| **P0 — Do First** | 0.1, 0.2, 0.3, 0.5, 1.1, 1.2 | ~3h | Prevents missed prayers, fixes data safety |
| **P1 — Same Week** | 0.4, 1.3, 1.4, 2.1, 2.2, 2.3, 3.4 | ~4h | Performance + compliance + resilience |
| **P2 — Next Week** | 2.4, 2.5, 3.1, 3.2, 4.1, 4.2 | ~4h | Polish + cleanup |
| **P3 — Next Sprint** | 3.3, 4.3, 5.1, 5.2 | ~8h | Android resilience + test foundation |
| **P4 — Backlog** | 5.3 | ~16h | Long-term maintainability |

---

## What the Audit Got Wrong (Minor)

1. **GardenTeaser** — Already wrapped in `React.memo`. No action needed.
2. **"Three separate AppState listeners"** — Accurate count, but PrayerTimesProvider's listener pauses the interval on background which is genuinely separate responsibility. Consolidation is nice-to-have, not critical.
3. **"Stale closure in PrayerTimesProvider"** — The audit acknowledges the ref pattern works correctly. The fragility concern is valid but low-risk given the stable pattern.
