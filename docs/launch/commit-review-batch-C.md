# Commit Review — Batch C
**Branch:** `feature/notification-prayer-times-hardening`  
**Reviewer:** Claude Sonnet 4.6 (automated pre-merge audit)  
**Date:** 2026-06-03  
**Commits reviewed (newest first):** a5820d3, 91d208b, 168cfed, 4731c53, 25dc0f8, 63a35ac, 4ea974b, 1c46fd4, 01a4bc3

---

## Per-Commit Review

---

### 1. `a5820d3` — Default Jummah iqamah to 1:30 PM (absolute, user-overridable)
**Date:** 2026-05-27  
**Files touched:** `src/__tests__/mosqueModeService.test.ts`, `src/__tests__/notificationSettings.test.tsx`, `src/__tests__/onboardingScreen.test.tsx`, `src/__tests__/settingsScreen.test.tsx`, `src/components/mosque/JummahMosqueConfig.tsx`, `src/services/MosqueModeService.ts`, `src/services/StorageService.ts`, `src/types/index.ts`

**What it does:**  
Replaces the `iqamahOffset: number` model (minutes after Dhuhr) with `iqamahTime: string` (HH:mm 24h wall-clock time, default `"13:30"`). `MosqueModeService.getIqamahTime` now correctly returns the absolute Jummah iqamah time on Friday Dhuhr rather than the regular Dhuhr iqamah offset, which was previously orphaned (nothing consumed `jummah.iqamahOffset`). `JummahMosqueConfig` normalizes legacy storage on read and provides both "offset" and "exact time" input modes. Tests cover the new path.

**Timezone handling:**  
The time is parsed with `new Date(prayer.time); iqamah.setHours(h, m, 0, 0)` which uses device local time — correct for a wall-clock time. No UTC confusion. The derived-offset display in the UI (`getDerivedOffset`) also creates a local Date from the stored HH:mm and compares with `dhuhrTime` (a local Date), so rounding is internally consistent.

**Migration concern:**  
Existing users who had set a custom `iqamahOffset` lose that setting silently — it is dropped via the normalization `settings?.jummah?.iqamahTime ?? '13:30'`. There is no migration shim. For v1 launch (first install), this is acceptable. If users carried over data from a beta build with `iqamahOffset`, their custom offset is silently reset to 1:30 PM. Low impact for v1 but worth noting.

**Risk:** ✓ clean — well-motivated fix, tests added, timezone handling correct, acceptable migration trade-off for v1.

---

### 2. `91d208b` — Prompt for exact-alarm permission whenever adhan is enabled
**Date:** 2026-05-27  
**Files touched:** `src/__tests__/notificationSection.test.tsx`, `src/__tests__/onboardingScreen.test.tsx`, `src/screens/Onboarding/OnboardingScreen.tsx`, `src/screens/Settings/components/NotificationSection.tsx`, `src/screens/SetupHealth/SetupHealthScreen.tsx`, `src/services/NotificationService.ts`

**What it does:**  
Renames `fullAdhanReady` → `adhanAudioReady` in `NotificationReadiness`. Broadens the exact-alarm CTA in Settings from `fullAdhanEnabled` to `adhanEnabled` (correct — the native foreground-service engine backs both clips). Adds `maybePromptExactAlarm()` in `OnboardingScreen` which fires an `Alert.alert` after notification permission is granted, directing Android users to "Alarms & reminders" if `exactAlarmStatus === 'fallback'`. This alert is non-blocking (user can pick "Maybe later"). Tests added and green per commit message.

**Loop risk — exact alarm prompt:**  
`maybePromptExactAlarm` is called only inside `requestNotificationPermission` which is guarded by `isRequestingNotifications` (set to `true` while in flight). However, `isRequestingNotifications` is reset to `false` in the `finally` block, so a second tap of the "Enable" button after dismissing the Alert would re-enter the function and show the Alert again. This is a minor UX annoyance but not a data-corruption or crash risk. The Settings CTA is a separate row that just calls `openExactAlarmSettings()` directly — no looping there.

**iOS guard:**  
`maybePromptExactAlarm` early-returns on `Platform.OS !== 'android'`. The `adhanAudioReady` logic also guards with `|| Platform.OS !== 'android'`. Both surfaces are correctly gated.

**Risk:** ⚠ note — exact alarm prompt can re-fire on repeated "Enable" taps if user dismisses the Alert and taps again. Not a blocker, but worth a UX test pass. Otherwise clean.

---

### 3. `168cfed` — fixed notfication android (3rd of 3)
**Date:** 2026-04-25  
**Files touched:** `src/__tests__/notificationMaintenance.test.ts`, `src/__tests__/notificationSection.test.tsx`, `src/__tests__/notificationSettings.test.tsx`, `src/__tests__/onboardingScreen.test.tsx`, `src/components/settings/NotificationSettings.tsx`, `src/screens/Onboarding/OnboardingScreen.tsx`, `src/screens/Settings/components/NotificationSection.tsx`, `src/services/NotificationService.ts`, `src/services/notifications/notificationSettingsState.ts`

**What it does:**  
Creates `notificationSettingsState.ts` with `normalizeNotificationSettings` and `mergeNotificationSettings`. These enforce the cascade: `enabled=false → adhanEnabled=false, fullAdhanEnabled=false`; `adhanEnabled=false → fullAdhanEnabled=false`. All settings write paths in `NotificationSection`, `NotificationSettings`, and `OnboardingScreen` now go through `mergeNotificationSettings` instead of raw spreads. This is the correct pattern to prevent inconsistent toggle state (e.g., `fullAdhanEnabled=true` with `adhanEnabled=false` surviving in storage).

**Removed test line:**  
The `notificationMaintenance.test.ts` change removes the explicit `adhanEnabled: false` from a call to `updateNotificationSettings({ enabled: false })`. This is valid because `normalizeNotificationSettings` now auto-cascades the disable, so passing `adhanEnabled: false` explicitly is redundant and would have tested the caller's responsibility rather than the normalizer's.

**Risk:** ✓ clean — this is the most valuable commit of the three. The normalizer is a clear, tested improvement.

---

### 4. `4731c53` — fixed notfication android (2nd of 3)
**Date:** 2026-04-25  
**Files touched:** `CLAUDE.md`, `index.ts`, `plugins/withBootReceiver.js`, `plugins/withFullAdhan.js`, `plugins/withPlatformSounds.js`, `src/__tests__/...` (multiple), `src/screens/Onboarding/OnboardingScreen.tsx`, `src/screens/Settings/components/NotificationSection.tsx`, `src/services/NotificationService.ts`, `src/tasks/notificationBootRescheduleTask.ts`, and others — 21 files, +848/-124

**What it does:**  
Major structural commit. Key changes:
- Introduces `NotificationReadiness` type and `getNotificationReadiness()` method, replacing ad-hoc status checking throughout `NotificationService`.
- Adds `NotificationBlockedReason` type and persists scheduling outcomes (status, reason, blocked reason, timestamp) to MMKV for observability.
- Adds Android-specific scheduling horizon: `ANDROID_NOTIFICATION_SCHEDULING_DAYS = 7`, `ANDROID_NOTIFICATION_LOWER_TIER_DAYS = 5` (vs iOS 3/2). The `getSchedulingDays()`/`getLowerTierSchedulingDays()` helper methods make all scheduling loops platform-aware.
- Adds `notificationBootRescheduleTask.ts` — a headless JS task registered in `index.ts` that runs storage initialization and scheduling on BOOT_COMPLETED.
- Adds `BootNotificationRescheduleTaskService.java` (via `withBootReceiver.js`) that starts the headless task with a 60-second timeout and `allowedInForeground: true`.
- Expands `OnboardingScreen` to use `NotificationReadiness` state, adds `useEffect` to poll readiness on the `notifications` step, and delays advance to 'done' if `exact_alarm_blocked`.
- Adds `clearBootRescheduleFlag` native method and wires it to the headless task (clears the boot flag only after successful reschedule).
- Adds `CLAUDE.md` (initial creation).

**NOTIFICATION_MAX_FUTURE_DAYS concern:**  
`NOTIFICATION_MAX_FUTURE_DAYS` is now `ANDROID_NOTIFICATION_SCHEDULING_DAYS + 1 = 8` for all platforms. It was previously 4 (iOS). This constant appears only in `src/constants/NotificationConstants.ts` — it has no consumers outside that file in the current codebase. It is exported but unused in service code (scheduling uses `getSchedulingDays()` directly). Zero runtime impact, but it is misleading for iOS. Minor.

**Headless task registration:**  
`AppRegistry.registerHeadlessTask` is called at module load in `notificationBootRescheduleTask.ts`, which is imported in `index.ts`. This is correct React Native headless task registration pattern.

**Risk:** ⚠ note — large and dense, message is generic. The `NOTIFICATION_MAX_FUTURE_DAYS` export now equals the Android value unconditionally (misleading for iOS consumers, though none exist currently). The headless boot task does not have a timeout guard at the JS level if `PrayerTimeService.getPrayerTimesList` hangs — the native 60s timeout is the only backstop. These are notes, not blockers.

---

### 5. `25dc0f8` — fixed notfication android (1st of 3)
**Date:** 2026-04-07  
**Files touched:** `app.config.js`, `eas.json`, `plugins/templates/ios/widget/SukoonLiveActivity.swift`, `plugins/withFullAdhan.js`, `plugins/withLiveActivity.js`, `plugins/withPlatformSounds.js`, `src/screens/Debug/NotificationDebugScreen.tsx`, `src/screens/Settings/components/NotificationSection.tsx`, `src/services/NotificationService.ts`, `src/services/notifications/FullAdhanScheduler.ts` — 10 files, +329/-322

**What it does:**
- Adds `getAndroidExactAlarmStatus()` and `openAndroidExactAlarmSettings()` as public methods on `NotificationService`.
- Changes `syncAndroidExactAlarmStatus` to fire on `notifications.enabled` (any notification) rather than only `fullAdhanEnabled`. This is later refined by 91d208b.
- Replaces cached `StorageService.getValue('android_exact_alarm_status')` read with a live `await this.getAndroidExactAlarmStatus()` call in `reconcileScheduling` and `scheduleExtendedNotifications`. This means an async I/O call per scheduling run instead of using the cached value — minor performance note.
- Adds `sendProductionLikePrayerTestNotification()` — a test helper used only by `NotificationDebugScreen`. It has `isDebugProductionLike: true` in data payload, gated to the debug screen.
- Deletes the inline Live Activity Swift code from `withLiveActivity.js` (it was a 260-line embedded string). The Swift code now lives exclusively in `plugins/templates/ios/widget/SukoonLiveActivity.swift` (the template-based approach). The `withLiveActivity.js` plugin still exists and `app.config.js` still references it; the plugin now reads the template from disk via `readTemplate()` rather than using an inline string.
- Refactors `NotificationDebugScreen`: replaces two `console.log` debug lines with cleaner multi-channel display; adds "Test 2.6 Production Prayer" button; adds "4.5 Open Exact Alarm Settings" button (Android-only guarded). The `console.log` lines are in a Debug screen behind a developer-only route — acceptable.
- Updates `SukoonLiveActivity.swift` layout (expanded Live Activity region rewritten).

**Live Activity state check:**  
The Swift template changes and the Live Activity toggle were both in this batch's codebase. The Live Activity toggle is later hidden by commit `5a4d8e9` (not in this batch). As of the end of this batch, the Live Activity toggle is still visible in `NotificationSection`. The subsequent batch's `5a4d8e9` correctly comments it out. No re-enabling occurred.

**`console.log` in debug screen:**  
The `console.log('🔊 Short Adhan channel sound:', ...)` lines are in `NotificationDebugScreen.tsx`. This screen is a developer/QA tool, not user-facing. Acceptable.

**Risk:** ⚠ note — replacing cached exact-alarm status reads with live async calls in the scheduling hot path is a minor perf regression. The deletion of inline Live Activity Swift in favor of the template file is the right architectural move. The debug screen additions are acceptable. No rollback of prior fixes detected.

---

### 6. `63a35ac` — made a final pass on dynamic island
**Date:** 2026-04-04  
**Files touched:** `plugins/templates/ios/widget/SukoonLiveActivity.swift` — 1 file, +23/-14

**What it does:**
- Reorders "Prepare" and "Prayed" buttons in the `fiqh_window` HStack for both expanded and lock-screen layouts (Prepare becomes primary/left, Prayed becomes secondary/right). Same reordering in the lock-screen `ExpandedContent` below.
- Replaces the `compactLeading` text-only label with an HStack of a colored circle dot + prayer name text.
- Replaces the `minimal` moon icon with a solid accent-colored circle with shadow glow.

**iOS-only guard:**  
This is a Swift template file inside `plugins/templates/ios/`. The `withLiveActivity.js` plugin that injects it is iOS-only by construction (uses `withXcodeProject`). No Android path touched.

**Live Activity state:**  
The Live Activity toggle is hidden post-merge (commit `5a4d8e9`), but the Swift template stays compiled in for both iOS prebuild and future re-enable. This work is not "half-done" — the template polish is complete and will surface when the toggle is restored in v1.1.

**Risk:** ✓ clean — pure iOS template UI polish, well-scoped, no regressions.

---

### 7. `4ea974b` — fixed git add . (countdown prefix + button border)
**Date:** 2026-04-02  
**Files touched:** `src/components/prayer/CountdownRing.tsx`, `src/components/prayer/SanctuaryView.tsx`, `src/screens/Home/HomeScreen.tsx` — 3 files, +25/-3

**What it does:**
- Adds `countdownMode` prop to `CountdownRing` and `SanctuaryView` (default `'next_prayer_start'`). When mode is `'current_prayer_end'`, the countdown label reads "Ends In" instead of "In".
- Wires `heroSurface?.countdownMode` from the store into `SanctuaryView` via `HomeScreen`.
- Derives `buttonAccentColor` and border colors (`activeButtonBorderColor`, `mutedButtonBorderColor`) from the current prayer's theme color, applying them to the Prepare button border. This replaces hardcoded border colors with prayer-aware theming.

**Risk:** ✓ clean — prop-additive change with safe defaults, no behavior change for existing callers.

---

### 8. `1c46fd4` — made the ring transparent
**Date:** 2026-04-02  
**Files touched:** `src/components/prayer/CountdownRing.tsx`, `src/theme/colors.ts` — 2 files, +37/-19

**What it does:**
- Fixes SVG canvas sizing: introduces `SVG_PADDING` and `SVG_SIZE` constants so the ring's glow stroke (now 16px wide, up from 10px) isn't clipped by the SVG viewport. The `container` style, `Svg` width/height, and `cx`/`cy` all move to `SVG_SIZE`.
- Makes the ring interior transparent/glassy: `innerGradCenter` and `innerGradEdge` colors updated to full opacity dark values; gradient stops added with low opacity (0.18–0.88) so the gradient itself creates the transparency illusion rather than color mixing. Adds a `vignetteRing` radial gradient for edge darkening and a faint specular highlight arc (`Path`).
- Imports `Path` from `react-native-svg`.
- Removes trailing newline from `colors.ts`.

**Risk:** ✓ clean — rendering-only change, no logic or state impact.

---

### 9. `01a4bc3` — made the hero top edged
**Date:** 2026-04-02  
**Files touched:** `app.config.js`, `package-lock.json`, `package.json`, `src/components/monetization/WatchAdCard.tsx`, `src/components/prayer/SanctuaryView.tsx`, `src/hooks/useServiceInitialization.ts`, `src/screens/Home/HomeScreen.tsx`, `src/services/monetization/AdService.ts`, `src/services/monetization/README.md` — 9 files, +420/-2466

**What it does:**
- Removes Google Mobile Ads SDK entirely: deletes `WatchAdCard.tsx` (169 lines), `AdService.ts` (261 lines), removes all `react-native-google-mobile-ads` config from `app.config.js` (iOS and Android app IDs), removes the plugin, and removes `AdService.initialize()` / `AdService.cleanup()` from `useServiceInitialization.ts`. The Ad SDK package is removed from `package.json`.
- Fixes `SanctuaryView` hero layout: moves `paddingTop` from the static StyleSheet to an inline style using `useSafeAreaInsets().top + theme.spacing['2xl']`, and adds `insets.top` to `minHeight` for both normal and focus modes. This makes the hero hero flush with the real top of the screen on notched/punched devices.
- Large `package-lock.json` churn reflects Ad SDK removal.

**Misleading commit message:**  
The message "made the hero top edged" describes only the UI change. The Ad SDK removal is massive and not mentioned. This is the kind of thing that makes bisect and incident investigation painful, but it is not a correctness bug.

**Ad SDK removal completeness:**  
All three removal sites are cleaned: `app.config.js` (plugin + config blocks), `useServiceInitialization.ts` (import + call), and the component/service files themselves. The `src/services/monetization/README.md` was updated (not deleted). No stray `AdService` import remains in the diff.

**Risk:** ⚠ note — the commit message does not reflect the scope of change (Ad SDK removal is the 99% of the diff). If the ads SDK removal was intentional for v1 (it appears deliberate given the QA findings reference), it is clean. The safe-area hero fix is correct. No blockers.

---

## Batch C Summary

### Blockers
None.

### Warnings (pushback items)

**1. Three "fixed notification android" commits (25dc0f8 → 4731c53 → 168cfed) are an evolutionary build, not a rollback chain.**  
- `25dc0f8` lays groundwork: exact alarm status as live async call, debug screen improvements, Live Activity Swift moved to template file.  
- `4731c53` is the largest structural commit: `NotificationReadiness` type, platform-aware scheduling horizon (Android 7d, iOS 3d), headless boot task, `getNotificationReadiness()` centralization.  
- `168cfed` is the cleanup: `notificationSettingsState.ts` normalizer, ensures cascading toggle logic everywhere.  
None undoes the other. All three build forward. However, `4731c53` and `168cfed` land on the same day (Apr 25) with identical commit messages — they should have been squashed or named descriptively. The code is fine; the history is noisy.

**2. `NOTIFICATION_MAX_FUTURE_DAYS` is now unconditionally the Android value (8) for all platforms.**  
Changed in `4731c53`. It appears to have no active consumers in the current codebase (only exported from the constants file), but it is exported and could mislead future callers on iOS. Consider either adding a platform-specific export or renaming it to `ANDROID_NOTIFICATION_MAX_FUTURE_DAYS`.

**3. Exact-alarm Alert in onboarding can re-fire on repeated taps.**  
`maybePromptExactAlarm` is called from `requestNotificationPermission` (commit `91d208b`). The `isRequestingNotifications` guard prevents concurrent calls, but once the async resolves and the flag is cleared, a second "Enable" tap will show the Alert again. If a user: grants notification permission, dismisses "Allow exact alarms" Alert, then taps "Enable" again (the flow does not advance to 'done' when `exactAlarmStatus === 'fallback'`), they will see the Alert a second time. Recommend either checking a `hasShownExactAlarmPrompt` flag or advancing the step unconditionally after grant.

### Additional Notes (non-blocking)

- `01a4bc3` commit message ("made the hero top edged") badly understates scope — it is 99% an Ad SDK removal. Not a bug, but future devs doing `git log --oneline` or bisecting will be confused.
- Live Activity dynamic island work (`63a35ac`, `25dc0f8`) is correctly gated: Swift template only compiled into iOS widget extension, toggle hidden in v1 by `5a4d8e9`. No accidental re-enable.
- Jummah iqamah default `'13:30'` uses device local time correctly via `setHours()`. Timezone handling is sound.
- `sendProductionLikePrayerTestNotification` added in `25dc0f8` is wired only into `NotificationDebugScreen` and tagged with `isDebugProductionLike: true`. No production surface exposure.
- `console.log` lines in debug screen (`25dc0f8`) are appropriate for a developer tool.

### Overall Confidence: MEDIUM-HIGH

The notification architecture changes are substantive and directionally correct. The three "fixed notification android" commits form a coherent whole once read together. Main concerns are: the re-triggerable exact-alarm Alert (UX, not crash), the misleading `NOTIFICATION_MAX_FUTURE_DAYS` export, and the opaque commit history. No code was found that undoes prior fixes. The Jummah, Dynamic Island, and UI polish commits are clean. Recommend fixing the exact-alarm re-trigger before merge; the other items are low urgency.
