# Commit Review — Batch D
**Branch**: `feature/notification-prayer-times-hardening`  
**Target**: `origin/main`  
**Reviewer**: Claude Sonnet 4.6 (automated)  
**Date**: 2026-06-03  
**Commits reviewed** (newest first): 11 commits, range `05ab478`→`b738427`

---

## Per-Commit Review

---

### C01 — `b738427` — "deobfusc"
**Date**: 2026-04-02

**What it does**:
- Removes `eas.json` from `.gitignore`, committing it to the repository for the first time.
- Adds `eas.json` containing build profiles (development, preview, production) and a submit block with `REPLACE_` placeholder paths for Apple p8 key and Google Play service account JSON.
- Changes `app.config.js` from hardcoded `enableProguardInReleaseBuilds: true` / `enableShrinkResources: true` to environment-variable-driven `enableMinifyInReleaseBuilds` / `enableShrinkResourcesInReleaseBuilds` (reading `ANDROID_ENABLE_MINIFY` and `ANDROID_ENABLE_SHRINK_RESOURCES`).
- Adds a contract test asserting those flags are `true`.

**Files touched**: `.gitignore`, `app.config.js`, `eas.json` (new), `src/__tests__/appConfigContract.test.ts`

**Concerns**:

1. **Contract test immediately overridden (warning)**: The new test asserts `enableMinifyInReleaseBuilds: true`, but a subsequent commit `692a2c3` (not in this batch, but already merged to HEAD) immediately inverts that assertion to `false` with the explanation "intentionally ship Android production with minify=false for crash-symbol stability." The test in this commit is therefore already wrong at the time it was committed. Not a blocker since HEAD is correct, but the commit history tells a confusing story.

2. **`eas.json` `production` env sets `ANDROID_ENABLE_MINIFY: "false"`** but this commit's `app.config.js` change and contract test both expect `true`. The two are contradictory within the same commit. The final state (minify=false, per `692a2c3`) is intentional and correct per the crash-symbol rationale, but this commit briefly pointed in the wrong direction.

3. **KV namespace IDs in `wrangler.toml`**: `5f7be722…` and `d06ee11d…` are KV binding IDs (not API tokens). These are safe to commit — they are analogous to database IDs and do not grant authentication on their own.

4. **No real secrets committed**: `secrets/` directory is gitignored; `.p8` files are gitignored; `eas.json` submit block has only `REPLACE_` placeholder strings. Clean.

5. **ProGuard rules not shipped**: With minification disabled (`false`), no ProGuard rules are needed — consistent. If this is ever re-enabled, `proguard-rules.pro` would need updating for `AdhanService`, `MosqueModeService`, and widget receivers.

**Risk grade**: ⚠ note — The back-and-forth on minification within a single commit creates noise. The final state (`692a2c3`) is sound. Low operational risk.

---

### C02 — `b20e863` — "added new color system"
**Date**: 2026-04-01

**What it does**:
- Extends `PrayerSurfaceState` (in `prayerSurfaceResolver.ts`) with three new semantic fields: `heroGradientPrayer`, `ringAccentPrayer`, and `ringColorMode` (`'gold' | 'prayer'`).
- Adds `isJumuahWindow()` helper in `prayerSurfaceResolver.ts` that returns `true` when the active prayer is Dhuhr and `now.getDay() === 5` (local Friday).
- Removes the 15-minute handoff logic (`HERO_ADVANCE_MINUTES`): display prayer now only switches after the active prayer is logged (not on a time-based cutoff).
- Refactors `CountdownRing.tsx` to accept `progress`, `countdownTargetTime`, `ringAccentPrayer`, and `ringColorMode` as props instead of computing progress internally.
- Updates `WidgetService.ts` to pass the new surface fields to the widget snapshot payload.
- Adds `widgetService.test.ts` (new).
- Updates `liveActivityService.test.ts` and `prayerSurfaceResolver.test.ts`.

**Files touched**: `prayerSurfaceResolver.ts`, `CountdownRing.tsx`, `SanctuaryView.tsx`, `HomeScreen.tsx`, `LiveActivityService.ts`, `WidgetService.ts`, plus 3 test files.

**Concerns**:

1. **`HERO_ADVANCE_MINUTES` is now dead code**: The constant is still exported from `src/constants/NotificationConstants.ts` (value: 15) but `import { HERO_ADVANCE_MINUTES }` was removed from `prayerSurfaceResolver.ts` and no other file references it. Should be cleaned up to avoid confusion, but poses no runtime risk.

2. **`isJumuahWindow` uses `now.getDay()` (local time)**: Correct for production — `currentTime` is always `new Date()` (local). The test suite uses UTC date strings (e.g., `2026-03-20T10:00:00.000Z`) which is 4pm UTC+6 (Friday) — no boundary issue at those test times. However, a test written as `T18:00:00.000Z` in UTC+6 would be Saturday local and silently pass/fail depending on CI timezone. This is a testing hygiene concern, not a production bug.

3. **Behavioral change to 15-min handoff removed**: The old logic switched the displayed prayer to the upcoming one 15 minutes before the current prayer window closed. The new logic never switches on time alone — only when the prayer is logged. This is a deliberate UX decision (documented in test rename: "keeps focus on the active prayer even during the last 15 minutes when not prayed"). The semantic is correct for the use case.

4. **`CountdownRing.tsx` force-unwrap of `theme.colors.prayer[accentKey]`**: The code does `theme.colors.prayer[accentKey] ?? theme.colors.gold`. The `??` fallback handles any unmapped key safely.

5. **Color token `goldLight` and `sanctuary.ring.glowStroke`**: Both are confirmed present in all three theme variants (dark, light, midnight). No missing token.

**Risk grade**: ✓ clean — Sound refactor with good test coverage. Dead constant is minor litter.

---

### C03 — `4b3a761` — "added splash icon"
**Date**: 2026-04-01

**What it does**:
- Adds `assets/splash-logo.png` (487 KB binary).
- Changes `app.config.js` to use `splash-logo.png` instead of `icon.png` for both the legacy `splash.image` and the `expo-splash-screen` plugin config.
- Background color remains `#00102a` (deep midnight blue — consistent with midnight theme).
- `imageWidth: 180` is unchanged, `resizeMode: "contain"` is unchanged.

**Files touched**: `app.config.js`, `assets/splash-logo.png`

**Concerns**:

1. **Binary asset in git**: 487 KB PNG committed to the repo. This is normal for mobile apps; not a blocker. `git lfs` is not configured but the repo does not appear to use it for other assets either — consistent.

2. **No `icon.png` change**: The app icon remains `icon.png`; only the splash screen changed. The splash background color `#00102a` matches the midnight theme primary background. If the new logo uses transparency, the dark background ensures correct rendering.

3. **No adaptive icon change**: Android adaptive icon foreground (`./assets/icon.png`) is unchanged. Splash and adaptive icon are intentionally separate — correct.

**Risk grade**: ✓ clean — Straightforward splash branding update.

---

### C04 — `d639de1` — "widgets complete"
**Date**: 2026-04-01

**What it does**:
- Splits `SukoonWidget` iOS widget into `HomeWidgetEntryView` (systemSmall, systemMedium) and `LockWidgetEntryView` (accessoryInline, accessoryCircular, accessoryRectangular).
- Adds `SukoonAccessoryWidget` as a separate `Widget` struct registered in `SukoonWidgetBundle`.
- Moves the background rendering (`WidgetCardBackground`) from inside `SmallWidgetView`/`MediumWidgetView` to the outer `containerBackground` modifier (iOS 17+) / `background` modifier (iOS <17). This is the correct pattern — avoids double-background layering.
- Polishes `SukoonLiveActivity.swift` progress bar gradients (opacity values) and radial glow radius.

**Files touched**: `SukoonWidget.swift`, `SukoonWidgetBundle.swift`, `SukoonLiveActivity.swift`

**Concerns**:

1. **Two force-unwraps in `SukoonLiveActivity.swift`** (lines 557, 561): `URL(string: "sukoon://prepare?prayer=\(actionPrayer)")!`. The `actionPrayer` value comes from `ContentState` (a string prayer name like "Dhuhr"). Custom URL schemes with ASCII strings are safe to force-unwrap; the only crash vector would be if `actionPrayer` contained non-URL-safe characters inserted by a bug elsewhere. Acceptable risk given the controlled input.

2. **`SukoonAccessoryWidget` uses default case for `.accessoryRectangular`**: The `switch family` in `LockWidgetEntryView` has `default: AccessoryRectangularView(...)`. If new WidgetKit families are added in future iOS versions, the default will silently render a rectangular view. Non-breaking but worth noting.

3. **Widgets disabled for v1**: This commit ships, but commit `388cb44` (not in this batch) disables widgets in the manifest. The Swift code still compiles and links — no crash risk since the `WidgetBundle` entry only matters if the host runs it. The code is structurally sound.

**Risk grade**: ✓ clean

---

### C05 — `3f27917` — "working widgets"
**Date**: 2026-04-01

**What it does**:
- Introduces `src/utils/prayerSurfaceResolver.ts` — a new centralized module computing `PrayerSurfaceState` from prayer times, records, next prayer, tomorrow Fajr, and sunrise. This is the canonical display logic for Home screen, widget, and Live Activity.
- Upgrades `react-native-mmkv` 4.0.1 → 4.3.0 and `react-native-nitro-modules` 0.31.9 → 0.35.0.
- Adds `react-test-renderer` 19.2.0 as a dev dependency.
- Large `package-lock.json` churn (5137 lines) — consistent with minor version bumps.
- Updates `LiveActivityService.ts` to consume `prayerSurfaceResolver`.
- Adds `NotificationSection.tsx` test, updates `liveActivityService.test.ts` and `prayerSurfaceResolver.test.ts`.

**Files touched**: 18 files (new `prayerSurfaceResolver.ts`, package files, service files, tests).

**Concerns**:

1. **`resolvePreviousBoundary` has a subtle dead-code path**: When `prayerIndex === 0` it returns `shiftPrayer(lastPrayer, -DAY_MS)` (yesterday's Isha shifted back). But the block immediately below checks `if (prayer.name === prayerTimes[0]?.name)` which can never be reached after `prayerIndex === 0` already returned. The dead block returns `lastPrayer` (without day shift) — if somehow reached it would be wrong. No actual crash risk since the `prayerIndex === 0` branch always returns first.

2. **`SizeMode.Responsive` sizes** in `SukoonSmallWidget` and `SukoonMediumWidget`: The `smallWidgetSizes` and `mediumWidgetSizes` sets are defined as hardcoded `DpSize` values. If the hosting launcher provides a size outside these sets, Glance falls back to the nearest match — acceptable.

3. **Package version pinning**: `react-native-mmkv` pinned to exact `4.3.0` (no caret). This is intentional for stability on encrypted storage — correct practice.

**Risk grade**: ✓ clean

---

### C06 — `6003a2c` — "widget shippable"
**Date**: 2026-03-30

**What it does**:
- Major widget polish: both Android widgets switch from `SizeMode.Single` to `SizeMode.Responsive`, adopting `LocalSize.current` for adaptive layouts.
- Adds `SukoonWidgetBitmaps.cardBackground()` — draws a layered gradient card background using `LinearGradient` + `RadialGradient` on Android `Canvas`. This replaces the old `background(ColorProvider(...))` approach.
- Adds `highlight` field to `AndroidWidgetPalette` and updates all three theme variants.
- Overhauls color palette for dark/midnight themes (`label` changed from green to teal; `timer` changed from gold to teal).
- Removes `expo-iap` from dependencies.
- Updates `src/theme/colors.ts` with a large palette refactor (130 lines changed).
- Adds `src/services/notifications/defaultSound.ts` and `scheduleLocalNotification.ts`.

**Files touched**: 38 files.

**Concerns**:

1. **Android widget "light" theme mislabeled**: `SukoonWidgetGlanceSupport.kt` has a `"light"` palette branch with `background = Color(0xFF16392D)` (dark forest green) — not the cream/linen light theme used in the app. The widget "light" mode appears to be a "green nature" variant, not a bright background. Since widgets are disabled for v1, this causes no user-visible issue now. If widgets are re-enabled, a user who has the app in light mode would get a dark green widget — inconsistent with the app UI.

2. **`SukoonWidgetBitmaps.cardBackground()` uses `RadialGradient` with `alpha` on a `Color`**: `accent.copy(alpha = 0.22f)` is called on a `androidx.compose.ui.graphics.Color`. This is valid Compose API, but note this runs in a `GlanceAppWidget` context where Compose APIs work at draw time via Glance's bitmap rendering path. This is established Glance usage — not a crash risk.

3. **Large `colors.ts` churn** (1430 line file, 130 lines changed): The refactor is a palette-level color rename (e.g., `label` colors, `timer` from gold to teal). All theme objects (`darkTheme`, `lightTheme`, `midnightTheme`) export a `prayer` sub-object with all five prayer keys (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`) plus `jumah`, `taraweeh`, `tahajjud`. The `CountdownRing` accesses these via `theme.colors.prayer[accentKey] ?? theme.colors.gold` — the fallback covers any future unmapped key. Clean.

4. **`SubscriptionService.ts` massive reduction** (304 lines → slim): The diff shows `src/services/monetization/SubscriptionService.ts` shrunk significantly. This aligns with `expo-iap` removal — monetization stub kept for type compatibility.

**Risk grade**: ⚠ note — Android widget "light" palette color mismatch (dark green background ≠ light app theme). Non-blocking for v1 (widgets disabled). Flag for re-enable sprint.

---

### C07 — `68ae5ef` — "added fix"
**Date**: 2026-03-28

**What it does**:
- Splits `SukoonWidget` into `HomeWidgetEntryView` (home screen families) and `LockWidgetEntryView` (lock screen accessory families).
- Adds `SukoonAccessoryWidget` struct — a separate `StaticConfiguration` widget for lock screen.
- Removes `.background(WidgetCardBackground(...))` from inside `SmallWidgetView` and `MediumWidgetView` bodies, moving background responsibility to the outer `containerBackground` modifier on `SukoonWidget`.
- Adds `SukoonAccessoryWidget()` to `SukoonWidgetBundle`.

**Note**: This is the iOS-side precursor to `d639de1` (C04). Both commits address the same widget split. C04 appears to be a polish pass on top of this.

**Files touched**: `SukoonWidget.swift`, `SukoonWidgetBundle.swift`

**Concerns**:

1. **Intermediate state**: This commit alone left `SukoonAccessoryWidget` with a `StaticConfiguration` that has no `containerBackground` wrapper — the lock screen widget would render without the card gradient. C04 (`d639de1`) completes this by adding the `containerBackground` to `SukoonAccessoryWidget` as well. In isolation C07 is incomplete, but the branch lands with C04 on top, making it whole.

**Risk grade**: ⚠ note — Intermediate state only; C04 completes it. Acceptable for feature branch commits.

---

### C08 — `98010e9` — "added fix for jumuah reminder day"
**Date**: 2026-03-28

**What it does**:
- Refactors `isFriday()` in `src/utils/ramadan.ts` to accept an optional `date: Date` parameter (default `new Date()`).
- Updates `PrayerTimeService.getPrayerDisplayName()` to accept a `referenceDate` and passes `prayer.time` at every call site in `NotificationService.ts` and `HabitBuilderNotifications.ts`.
- The fix: previously, `getPrayerDisplayName('Dhuhr')` would call `isFriday()` with `new Date()` (the current wall-clock time at scheduling). If notifications are scheduled on a Thursday for the next day's prayers, Dhuhr would be labeled "Dhuhr" even for Friday's Dhuhr. Now it uses the prayer's scheduled time to correctly detect Friday.
- Adds two tests.

**Files touched**: `ramadan.ts`, `PrayerTimeService.ts`, `NotificationService.ts`, `HabitBuilderNotifications.ts`, plus 2 test files.

**Concerns**:

1. **`JummahNotificationService.scheduleJummahNotifications()` still calls `isFriday()` without args** (line 102 in current file). This function is called from `useServiceInitialization` at app start, not from a scheduling loop. At startup time on Friday, `new Date()` correctly returns Friday. This is appropriate — the guard is "is today Friday?" not "is this prayer on Friday?". Not a bug.

2. **`isFriday(referenceDate)` uses `referenceDate.getDay()`**: `getDay()` returns local day of week. The `referenceDate` passed is `prayer.time` (a `Date` object constructed from the API's ISO string). If the API returns UTC midnight times (e.g., `2026-04-10T00:00:00Z`) and the user is in UTC+6, `getDay()` on that Date returns Friday local (April 10 is Friday) but the ISO string is Thursday midnight UTC. This could in theory cause a mismatch if prayer times are stored as UTC midnight rather than local prayer times. However, prayer times from Aladhan are returned as local clock times in ISO format (not UTC midnight) — so `prayer.time` represents the local time of the prayer. `getDay()` on local-aware Date objects is correct here.

3. **Test uses hardcoded UTC dates**: `new Date('2026-03-20T12:05:00.000Z')` for "Friday". March 20, 2026 is indeed a Friday. The UTC date is 12:05 UTC which is 18:05 UTC+6 — still Friday local. Sound.

**Risk grade**: ✓ clean — Correct bug fix with good test coverage. The pre-scheduling Friday detection was the actual bug.

---

### C09 — `93b1bdf` — "added new widgets"
**Date**: 2026-03-28

**What it does**:
- Introduces the full Android widget infrastructure as template files:
  - `SukoonSmallWidget.kt`, `SukoonMediumWidget.kt` — Glance `GlanceAppWidgetReceiver` implementations.
  - `SukoonWidgetGlanceSupport.kt` — shared `SukoonWidgetSnapshotStore`, `SukoonWidgetTheme`, `SukoonWidgetBitmaps`, `SukoonWidgetIntents`.
  - `SukoonWidgetBridge.java` — React Native module writing to SharedPreferences and triggering widget reloads.
  - `LiveActivityModule.java` / `LiveActivityPackage.java` — Android-side persistent notification (no native Live Activity on Android).
  - `SukoonWidgetPackage.java` — RN package registration.
  - Android drawable XMLs, layout XMLs, `widget_*_info.xml`, `widget_strings.xml`.
- Introduces iOS template files:
  - `SukoonLiveActivityBridge.swift`, `SukoonLiveActivityBridge.m`, `SukoonWidgetBridge.swift`, `SukoonWidgetBridge.m`.
- Refactors `withAndroidWidget.js`, `withLiveActivity.js`, `withWidget.js` to use template files instead of inline code generation.
- Adds `app-build.gradle` and `project-build.gradle` templates.

**Files touched**: 36 files.

**Concerns**:

1. **`SukoonWidgetSnapshotStore.load()` is crash-safe**: On JSON parse failure it returns `sample()` — a hardcoded placeholder snapshot. No uncaught exception path.

2. **`SukoonWidgetIntents.openApp()` is crash-safe**: Falls back to explicit `MainActivity::class.java` intent if `getLaunchIntentForPackage()` returns null. Clean.

3. **`LiveActivityModule.startLiveActivity()` wraps in try/catch**: Rejects the promise on error rather than throwing. No crash path.

4. **`SukoonWidgetBridge.reloadWidgets()` iterates over both widget classes**: References `SukoonSmallWidget.class` and `SukoonMediumWidget.class` directly. Since these are in the same package and compiled together, no `ClassNotFoundException` risk.

5. **`app-build.gradle` has `minifyEnabled enableMinifyInReleaseBuilds` and `shrinkResources enableShrinkResources.toBoolean()`**: These are controlled by `expo-build-properties` plugin, which reads environment variables. Consistent with the `deobfusc` commit (C01).

6. **`GlanceAppWidgetReceiver` subclass `SukoonMediumWidget` is public and registered**: Even with widgets disabled in the manifest via `388cb44`, the Kotlin class is compiled into the APK. The `GlanceAppWidgetReceiver.onUpdate()` will not be called if the `<receiver>` is not declared in the manifest. No initialization crash.

**Risk grade**: ✓ clean — Defensive coding throughout. Widget infrastructure compiles safely even when disabled.

---

### C10 — `0d35658` — "added fix and added surah for jumuah"
**Date**: 2026-03-27

**What it does**:
- Adds `src/constants/surahAlKahf.ts` — 110 ayahs of Surah Al-Kahf with Arabic text, transliteration, and English translation.
- Adds `src/components/prayer/JummahSunnahSheet.tsx` — a bottom sheet displaying Al-Kahf ayahs for Friday sunnah reading.
- Adds `src/constants/jummahContent.ts` — curated Friday sunnahs and virtues content.
- Adds `src/utils/notificationPersonalization.ts` — name personalization helper for notifications.
- Extends `JummahNotificationService.ts`: adds an early dua reminder 15 minutes after Asr (in addition to the existing 1-hour-before-Maghrib reminder).
- Extends `NotificationService.ts`: imports and uses personalization helpers; uses `settings` (user's name) in notification content.
- Adds `src/assets/icons/prayer/StillnessLeafSvg.tsx` (new SVG icon).
- Updates `HomeScreen.tsx` and `SanctuaryView.tsx` for Jummah sheet entry point.
- Adds 4 test files.

**Files touched**: 17 files.

**Concerns**:

1. **Arabic text encoding**: File is confirmed UTF-8 (no mojibake). Spot-checked ayahs 1-6, 50-55, and 110 — Arabic Unicode codepoints are intact, including proper diacritics (tashkeel) and Quranic pauses (ۜ, ۚ, ۗ). The test confirms all 110 ayahs have non-empty `arabic`, `transliteration`, and `translation` fields.

2. **`EARLY_DUA_MESSAGES` has a comment copy-paste error**: The comment above the late dua block reads "5. Last-hour dua reminder (1 hour before Maghrib)" — but it's the same comment as the block immediately before (numbered 4). The code itself is correct; only the comment numbering is wrong.

3. **Early dua reminder (15 min after Asr) guard**: `earlyDuaTime < maghrib.time` — correctly prevents scheduling after Maghrib. Also `earlyDuaTime > now` — correctly skips if already passed. Sound.

4. **Jummah notification ID collision risk**: The early dua block uses `'dua-window'` as the notification identifier, same as the late dua block (which is at 1 hour before Maghrib). If both are scheduled, the second `scheduleNotification('dua-window', ...)` would overwrite the first (depending on `scheduleNotification` implementation). Let's note this as a potential duplicate-key issue.

**Risk grade**: ⚠ note — The `'dua-window'` identifier may be shared between two distinct dua reminders. If `scheduleNotification` uses the identifier as a unique key, only one will fire. Recommend separate IDs: `'dua-window-early'` and `'dua-window-late'`.

---

### C11 — `05ab478` — "extensive city indexes uploaded to kv in cloudflare"
**Date**: 2026-03-26

**What it does**:
- Adds `edge-api/data/cities.v2.json` (148 KB, ~6,872 entries) — an expanded city dataset replacing `cities.v1.json`.
- Updates `build-city-index.mjs` to default to `v2` input file and adds `--version` CLI argument.
- Adds `build:city-index:v1` and `build:city-index:v2` npm scripts for explicit versioning.
- Updates `wrangler.toml` `CITY_INDEX_VERSION` from `"v1"` to `"v2"`.
- Updates `edge-api/README.md` to reflect v2 dataset and versioning workflow.

**Files touched**: 5 files.

**Concerns**:

1. **KV namespace IDs in `wrangler.toml`** (unchanged from before this commit): `5f7be722d4fd4818a4c6d4cd34227b9e` and `d06ee11df9f342b78356884eef0e5600`. These are Cloudflare KV binding IDs — they identify the namespace but cannot be used to authenticate or query KV without a valid Cloudflare API token (which is a separate secret, managed via `wrangler` or environment variables, never committed). No security issue.

2. **148 KB JSON in git**: Reasonable for an offline-first city search dataset. Not bloating the mobile bundle (this is `edge-api/data/`, not in the `src/assets/` tree). The city data is uploaded to Cloudflare KV via `wrangler kv bulk put` — the JSON file is the build artifact/source, not served from the mobile app.

3. **`CITY_INDEX_VERSION` env var**: Switching from v1 to v2 is backward-compatible per the README ("lets you roll forward to a new shard set without breaking old keys"). The v1 shards remain in KV until explicitly deleted.

4. **No API key committed**: No Cloudflare API token, account ID, or authentication credential appears in any changed file. The `wrangler.toml` contains only public-safe binding configuration.

**Risk grade**: ✓ clean

---

## Batch D Summary

### Blockers
None.

### Warnings (ordered by severity)

| # | Commit | Issue |
|---|--------|-------|
| 1 | `0d35658` (C10) | `'dua-window'` notification identifier shared between early (post-Asr) and late (pre-Maghrib) dua reminders. If `scheduleNotification` uses the ID as a unique key, the second call overwrites the first and only one reminder fires on Fridays. |
| 2 | `b738427` (C01) | Minification flip-flop: this commit briefly asserted `enableMinifyInReleaseBuilds: true` in the contract test, contradicting the `eas.json` production env (`ANDROID_ENABLE_MINIFY: "false"`). Corrected by `692a2c3` already in HEAD, but the commit history is confusing. |
| 3 | `6003a2c` (C06) | Android widget `"light"` theme palette uses dark green background (`0xFF16392D`), inconsistent with the app's cream/linen light mode. Invisible for v1 (widgets disabled), but will be an issue on re-enable. |
| 4 | `b20e863` (C02) | `HERO_ADVANCE_MINUTES` constant in `NotificationConstants.ts` is now dead code — no import remains. Minor cleanup debt. |

### Top 3 Pushback Items

1. **Dua-window ID collision** (`0d35658`): The early and late Friday dua reminders share the same `'dua-window'` notification ID. Before this merges, confirm whether `scheduleNotification` is idempotent on ID collision or overwrites. If it overwrites, rename to `'dua-window-early'` and `'dua-window-late'`. This directly affects Friday user experience.

2. **Minification state is clear in HEAD but unclear in commit history** (`b738427`): The deobfusc commit's intent (commit message, code change, and test) pulled in three different directions simultaneously. Consider a brief follow-up comment in `eas.json` or `app.config.js` documenting why minification is intentionally disabled — the rationale exists only in the contract test comment added by `692a2c3`.

3. **Android widget light-theme palette** (`6003a2c`): Log a tracked issue before re-enabling widgets. The `"light"` palette branch in `SukoonWidgetGlanceSupport.kt` needs a bright-background palette (matching `lightTheme` in `colors.ts`) rather than the current dark-forest-green.

### Overall Confidence: **HIGH**

The batch is structurally sound. The Jummah Friday detection fix (`98010e9`) correctly solves the pre-scheduling day-of-week bug by threading `prayer.time` as the reference date through all call sites. The widget infrastructure (`93b1bdf`, `6003a2c`, `3f27917`) is defensively coded with safe fallback paths throughout. The `prayerSurfaceResolver` (`3f27917`, `b20e863`) is well-tested and correctly centralizes display logic. The Cloudflare KV city index commit (`05ab478`) commits no credentials. The splash branding (`4b3a761`) is a clean asset swap. The single actionable blocker (dua-window ID collision) is low-effort to verify and fix.
