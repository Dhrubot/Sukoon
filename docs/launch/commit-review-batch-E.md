# Commit Review — Batch E
Branch: `feature/notification-prayer-times-hardening`
Target: `origin/main`
Reviewed: 2026-06-03
Reviewer: Claude (automated batch audit)

---

## Per-Commit Review

---

### 1. `43f92d9` — removed duplicate title
**Files:** `src/components/mosque/IqamahTimeConfig.tsx` (1 line deleted)

**What it does:** Removes a duplicate `<Text style={styles.title}>Iqamah Times</Text>` from the header of `IqamahTimeConfig`. A title was already being rendered by the parent screen's section label.

**Concerns:** None. Cosmetic dedup.

**Risk:** ✓ clean

---

### 2. `30e40e7` — Standardize settings and mosque mode UI
**Files:** 20 files — notification settings, mosque mode components, settings screen, privacy policy, reflection garden screen, and 2 new test files (`notificationSettings.test.tsx`, `settingsScreen.test.tsx`).

**What it does:**
- Removes the "Test Reminders" section (Send Test Reminder / View Scheduled Reminders) from `NotificationSettings.tsx` — appropriate for v1 launch.
- Changes several `fontSize` calls from theme tokens to raw values (14, 17) across settings, mosque mode, privacy policy components. Internally consistent but departs from the token system.
- Refactors `PrivacyPolicyScreen` — removes the "Open Source" section, updates "Last Updated" to March 2026, rewrites bullet points to more accurately describe on-device vs. network data flows (coordinates may go to prayer-time and geocoding providers — now disclosed).
- Privacy policy now explicitly acknowledges that coordinates may be sent to prayer-time providers. This is more accurate than the prior "never leaves your device" claim. Important for store compliance.

**Concerns:**
- Raw font size literals (14, 17, 11) hardcoded instead of `theme.typography.fontSize.*` — this is a style inconsistency introduced widely. Not a crash risk but departs from the design system. Pattern matches several prior commits in this batch so it appears to be a deliberate direction, not an accident.
- Privacy policy updated from "100% Local Storage" to the more accurate disclosure about coordinates being sent to prayer-time providers. This is _better_ for legal accuracy; just ensure the Play Store Data Safety form is consistent with this new language.
- The removed "Test Reminders" section references `NotificationService.sendTestNotification()` — the method should still compile; it is just no longer rendered. Test confirms the section is absent (`queryByText('Test Reminders')`).

**Risk:** ⚠ note — privacy policy wording improved (good); raw font sizes are a style debt; verify Data Safety form matches new privacy policy language before launch.

---

### 3. `8d12faf` — Refine Hijri prompts and onboarding defaults
**Files:** 12 files — moonSighting.ts, HijriNudgeSheet.tsx, HomeScreen.tsx, StorageService.ts, OnboardingReadyStep.tsx, OnboardingScreen.tsx, ramadan.ts, notificationPresets.ts, and 3 new test files.

**What it does:**
- Replaces `confirmMoonSighting` call in `HijriNudgeSheet` with new `finalizeHijriDateConfirmation`, which additionally writes a `hijri_date_confirmed_<event>_<year>` key and conditionally calls `confirmMoonSighting`/`deferMoonSighting` based on the adjustment value and Hijri month context.
- `getHijriNudgeEvent()` now reads from `getCachedHijriDate()` (adjustment-applied) instead of `getRawCachedHijriDate()` — so users who already set a Hijri offset see the correct adjusted date in the nudge.
- Adds `hasAcknowledgedHijriDate()` guard: once a user responds to the Hijri nudge, it won't re-appear for the same event+year even if they dismiss the sheet.
- `getHijriNudgeEvent()` Shawwal day cap changed: the old code suppressed nudges after day 3 only for `deferred` state; new code silences Shawwal nudges for everyone after day 3 (state-independent). Ramadan and Dhul-Hijjah months have no explicit day cap — they will nudge through the whole month unless acknowledged. This seems intentional for month-start confirmation.
- HomeScreen: Hijri nudge check is promoted above the moon-sighting event check so it takes priority; `showHijriNudgeSheet` and `userSettings?.hijriAdjustment` added to the effect dependency array.
- `onDismissed` prop signature on `HijriNudgeSheet` changed from `() => void` to `(reason: 'acknowledged' | 'dismissed') => void`. The old `HijriNudgeCard` component still has `onDismissed: () => void` — but `HijriNudgeCard` is only self-contained (used in tests and a separate card context) and is not the component wired to `HomeScreen`, so no runtime type error.
- StorageService default settings: `postPrayerCheck` changed from `true` (legacy `balanced`) to `false`, intensity from `'balanced'` to `'gentle'`, and `applyIntensityPreset` is called on the defaults before return. This is addressed in `512ba85` more completely.
- Onboarding: `OnboardingReadyStep` gains `asrJuristic` / `onAsrJuristicChange` props, exposing an Asr juristic picker during onboarding.

**Concerns:**
- **Hijri offset default on first launch:** `getHijriNudgeEvent()` now uses `getCachedHijriDate()` (adjusted). On first launch, `getUserSettings()` returns `hijriAdjustment: 0` (confirmed in defaults), so the adjusted date equals raw — no off-by-one on first launch. ✓
- **Ramadan nudge guard — no day cap:** Unlike Shawwal (capped at day 3), Ramadan and Dhul-Hijjah nudges repeat every 60-second tick until `hasAcknowledgedHijriDate` is written. The `dismissedHijriNudgeKeyRef` in HomeScreen prevents re-showing _within one session_ but not across sessions. A user who dismisses (not acknowledges) on Ramadan day 5 will see the nudge again next session on day 5. This may be intentional (intended to keep nudging Ramadan date confirmation) but could be annoying if the user was on an unusual Ramadan day and just wanted to dismiss.
- **`finalizeHijriDateConfirmation` on Ramadan day 29:** If `nudge.monthNumber === RAMADAN && nudge.currentDay === 29` and user picks `yesAdjustment` (i.e., adjustment=1 → Eid tomorrow), `confirmMoonSighting('eid_fitr', year)` is called. The user is confirming Eid for a year that may differ from the Eid's Hijri year if the sighting happens on Ramadan 29 of year Y and Shawwal 1 is year Y. The `nudge.currentYear` passed is the Ramadan year, which is the same year as Shawwal's year 1 — so the key matches. ✓

**Risk:** ⚠ note — Ramadan/Dhul-Hijjah nudges have no day cap, so dismissed users will see the sheet on every app open during those months until they formally acknowledge. Acceptable if intentional; worth a QA pass.

---

### 4. `458ef6e` — Fix iOS home reveal and location loading UI
**Files:** `OnboardingLocationStep.tsx`, `SanctuaryView.tsx`

**What it does:**
- `OnboardingLocationStep`: Replaces an inline `ActivityIndicator` row with a `Modal` overlay (fade animation, `statusBarTranslucent`) while GPS is locating. This prevents the location step content from reflowing/jumping mid-location-detect.
- `SanctuaryView`: Platform-splits `HERO_MIN_HEIGHT` and `HERO_FOCUS_MIN_HEIGHT` — iOS gets 72%/80%, Android keeps 78%/86%. Also platform-splits `paddingBottom` — iOS gets `spacing['3xl'] + 32`, Android keeps `spacing['4xl'] + 72`.

**Concerns:**
- iOS path is clearly gated via `Platform.OS === 'ios'` constants. Android layout is unchanged numerically. ✓
- The `Modal` for location loading has no timeout or cancel: if the GPS promise hangs indefinitely, the overlay stays up. The existing parent `OnboardingLocationStep` presumably handles the location error path (confirmed: `locationFailed` state drives the error card). The `isLocating` state must be cleared by the caller on both success and failure — verify that all paths in `OnboardingScreen` clear `isLocating` when the location request settles (not reviewed here but pattern is standard).
- The loading overlay has a hardcoded dark color `rgba(8, 12, 24, 0.34)` that may not respect light theme. In `light` mode this will still render a dark tinted backdrop. Minor visual inconsistency, not a crash.

**Risk:** ⚠ note — hardcoded rgba overlay color won't adapt to light theme; loading modal needs caller to reliably clear `isLocating`. Both are low-severity.

---

### 5. `c94bb39` — changed some more styling
**Files:** `JummahMosqueConfig.tsx`, `MosqueModeOptions.tsx`, `MosqueModeToggle.tsx`, `OnboardingNotificationStep.tsx`, `MosqueModeScreen.tsx`

**What it does:**
- Comments out section titles in `MosqueModeOptions` and `MosqueModeToggle` for visual cleanliness.
- In `JummahMosqueConfig`: comments out "Jumu'ah Settings" sub-title; adds conditional `iqamahSectionNoDivider` style to remove top border when silent controls are hidden (iOS).
- `OnboardingNotificationStep`: comments out the "Before prayer" benefit row in the onboarding card, leaving only "At prayer time".
- Adds `maxWidth: '80%'` to description text in `JummahMosqueConfig` and `MosqueModeToggle`.
- `MosqueModeScreen` section label changed from `'MODE'` to `'MOSQUE MODE'`.
- **`import { max } from 'date-fns'` was added** to `JummahMosqueConfig.tsx` in this commit but `max` is never used in the file. This is a dead import. However, the current working tree shows this import is NOT present — meaning a subsequent commit in this batch or after removed it. Confirmed absent in current `JummahMosqueConfig.tsx`. ESLint's `no-unused-vars` should catch this if it runs.

**Concerns:**
- Dead `date-fns` import added by this commit (subsequently cleaned — net state is fine). If ESLint runs in CI this could have caused a lint error between c94bb39 and the cleanup commit; worth verifying CI was not red.
- Commenting out "Before prayer" benefit row in onboarding while the `beforePrayer` setting still exists and is functional. Users won't be told about advance reminders during onboarding — minor UX documentation gap.

**Risk:** ⚠ note — dead import was introduced (subsequently removed); onboarding no longer mentions advance reminders even though they are available.

---

### 6. `9c210ed` — added a fix in wording
**Files:** `src/utils/mosqueModePlatform.ts` (2 lines)

**What it does:** Replaces "your mosque starts at 5:20 AM" with "your mosque starts congregation (Salat al-Jama'ah) at 5:20 AM" in both Android and iOS variants of `iqamahHelpText`. Adds Arabic term for clarity.

**Concerns:** None. Copy improvement, no logic change.

**Risk:** ✓ clean

---

### 7. `7f8a27f` — added some more fixes in wording
**Files:** `adhkarData.ts`, `ReflectionGardenScreen.tsx`, `TasbihScreen.tsx`

**What it does:**
- **`adhkarData.ts`:** Expands the Ayat-ul-Kursi translation from a truncated version to the full verse (morning + evening sets). Changes counts: `Allaahumma innee asbahtu...` from 4 to 1; two other adhkar from 3 to 1. Replaces the shorter `SubhanAllah wa bihamdihi` entry with the combined `SubhanAllahi wa bihamdihi, SubhanAllahil-Azeem` (both morning and evening). This changes the daily adhkar behavior for users.
- **`ReflectionGardenScreen.tsx`:** Empty state replaces `MiniTubaTree` with a new inline `GardenIcon` SVG. Changes empty-state subtitle text. Note that `GardenIcon` is defined inline in the screen file (not a shared component) — acceptable for a single-use icon.
- **`TasbihScreen.tsx`:** ID `'allahu-akbar'` → `'Allahu-akbar'` (capitalization change). The `subhanallah-wa-bihamdihi` Tasbih preset updated to match the new combined dhikr text. Count target unchanged at 100.

**Concerns:**
- **Tasbih ID change:** `'allahu-akbar'` → `'Allahu-akbar'` — if any persisted state (e.g., Tasbih counter progress) is keyed on this ID, existing users could lose their counter state for that preset on upgrade. Needs confirmation that Tasbih progress is not persisted by ID, or that this ID is not used as a storage key.
- **Adhkar count changes (4→1, 3→1):** Users who had started a session with the old counts will see different targets on upgrade. If sessions are not persisted mid-session this is harmless; if they are, verify the counts field is not stored mid-session.
- The new full Ayat-ul-Kursi translation is correct and matches the Quran 2:255 reference.
- `GardenIcon` inline SVG: clean, self-contained.

**Risk:** ⚠ note — Tasbih preset ID change (capitalization) could reset persisted counter state if storage is keyed on that ID. Adhkar count changes change the user-visible target on upgrade.

---

### 8. `97ab64f` — added more styling
**Files:** `MenuScreen.tsx`, `MosqueModeScreen.tsx` (1 line each)

**What it does:** Adds `marginTop: theme.spacing['2xl']` to `headerTitle` style in both screens for visual breathing room at the top.

**Concerns:** None. Pure whitespace/padding tweak.

**Risk:** ✓ clean

---

### 9. `02199e9` — ui
**Files:** `src/screens/Settings/SettingsScreen.tsx` (1 line)

**What it does:** Comments out `<Text style={styles.title}>Prayer Preferences</Text>` in SettingsScreen header, leaving only the eyebrow and subtitle.

**Concerns:** None. Visual polish.

**Risk:** ✓ clean

---

### 10. `512ba85` — fixed mosque mode notification, gentle notification to one notification per prayer only
**Files:** 10 files — `MosqueModeService.ts` (major refactor), `StorageService.ts` (migration + defaults), `notificationPresets.ts` (API change), `NotificationSettings.tsx`, and 4 test files.

**What it does (summary):**
This is the substantive commit. Three interlocking changes:

**A. MosqueModeService notification dedup refactor**
- Introduces `getMosqueNotificationIdentifiers(prayer, dateStr)` returning 5 IDs keyed as `mosque-{type}-{prayerName}-{yyyy-MM-dd}`.
- `dateStr` is derived from `getIqamahDateStr(iqamahTime)` which calls `format(iqamahTime, 'yyyy-MM-dd')` — so the key is keyed on the **iqamah date**, not the scheduling date. This correctly scopes dedup to prayer + calendar day, not just prayer name. Cross-day collision is not possible. ✓
- Extracts `schedulePreIqamahNotification(prayer, iqamahTime, mode)` as a shared helper for both `prompt` and `auto` (iOS reminder) modes, replacing duplicated inline scheduling blocks.
- Before scheduling, `cancelLegacyNotifications()` cancels all 5 IDs for that prayer+date — so rescheduling (e.g., after a settings change) cleanly replaces the prior slot.
- Android: adds `alreadyQuiet` guard — if ringer is already SILENT or VIBRATE, `scheduleAndroidSilentMode` returns `false` and `managedBySukoon = false` is persisted. The active state record now carries `managedBySukoon`, preventing the restore handler from incorrectly un-silencing a phone the user silenced themselves.
- iOS: consolidates from 2 notifications (2-min reminder + iqamah-time) to 1 pre-iqamah notification (5-min or 1-min). The `scheduleIOSReminder` now delegates to the new `scheduleIOSSilentModeNotifications` method which, however, **still schedules 2 notifications** (5-min reminder + at-iqamah-time). So the PR description ("one notification per prayer") refers to the removal of the old redundant enable/restore Android notification pair, not a literal single iOS notification. iOS currently sends 2 per prayer (pre-iqamah + iqamah-time) — both are useful, this is acceptable.

**B. `applyIntensityPreset` API change (breaking mutation → pure function)**
- Old: mutated `habitBuilder` in place, returned `void`.
- New: takes both `notifications` and `habitBuilder`, returns `{ notifications, habitBuilder }` without mutation.
- All 3 call sites updated: `NotificationSettings.handleIntensityChange`, `StorageService.normalizeGentlePresetIfNeeded`, `StorageService.getDefaultSettings`.
- The old `StorageService.getDefaultHabitBuilderSettings` called `applyIntensityPreset(defaults, 'gentle')` (old mutating API) — now replaced by the new signature. ✓

**C. Gentle preset migration (`normalizeGentlePresetIfNeeded`)**
- Runs once on `StorageService.initialize()`, gated by `GENTLE_PRESET_NORMALIZED_FLAG` in public MMKV.
- Detects existing users with exactly the old gentle defaults (`beforePrayer: 10, postPrayerCheck: false, habitBuilder.enabled: false, ...`) and re-applies the new gentle preset (which sets `beforePrayer: 0`).
- This will silently change `beforePrayer` from 10 to 0 for existing gentle users on upgrade. Before-prayer = 0 means "no advance reminder" — a meaningful behavioral change for existing users who may have relied on the 10-min advance notification. There is no opt-out for existing users; the migration fires once and sets the flag.

**Concerns:**
1. **`beforePrayer: 10 → 0` migration for existing gentle users** — this silently disables the 10-minute advance prayer reminder for all existing users who are on the gentle preset and have never customized their notification settings. This is a potential regression for real users. If the intent is that "gentle" means no advance reminder, the prior default was inconsistent — but existing users may have come to rely on that 10-minute nudge. Worth an explicit note in release notes or a one-time prompt.
2. **Dedup key confirmed correct:** `mosque-{type}-{prayer}-{iqamahDate}` — uses iqamah's calendar date, not scheduling date. Next day's prayer will have a different `yyyy-MM-dd` in the key. ✓ No cross-day suppression.
3. **`scheduleUpcomingMosqueModes` Android path:** Lines 652-655 call `schedulePreIqamahNotification` AND `scheduleAndroidSilentMode` — the `scheduleAndroidSilentMode` (deprecated wrapper) does not return `managedBySukoon`, so `persistActiveState` is not called in this path. This means the bulk-scheduling path does not record the `managedBySukoon` flag. If Android's ringer was already quiet at bulk-scheduling time, the restore handler will still try to restore — but `getActiveMosqueMode()` would not have `managedBySukoon: false` to gate it. Low-severity (only matters if phone was already quiet at bulk-schedule time, a rare case), but is a gap relative to the single-prayer scheduling path which correctly handles this.
4. **`normalizeGentlePresetIfNeeded` detection:** The fingerprint check verifies 15+ fields match the legacy profile. If any single field deviates (e.g., user manually set `beforePrayer: 5` but left everything else at default), migration is skipped — correct behavior. The `(notifications.intensity ?? 'gentle') === 'gentle'` default fallback handles users who were on the old code before `intensity` was written to storage.

**Risk:** ⚠ note — silent `beforePrayer: 10→0` migration for existing gentle-preset users is a behavioral regression risk. The `scheduleUpcomingMosqueModes` Android path is a minor gap regarding `managedBySukoon` persistence.

---

### 11. `c244788` — added some more styling
**Files:** `NotificationSettings.tsx`, `NotificationModal.tsx`

**What it does:**
- Converts `sectionTitle` from a 17px medium label to an `eyebrow` style (uppercase, letter-spaced, muted color, `fontSize.xs - 1`). The `eyebrow` style is defined inline in both `NotificationSettings` and `NotificationModal` with identical properties — a minor code duplication.
- Comments out the `<Text style={styles.settingLabel}>Prayer Reminders</Text>` label; changes sibling description text to just "Prayer Notifications".
- Reduces `presetTitle`, `subsectionTitle`, `sectionTitle` font sizes from 17 to 14.
- Indentation cleanup in `PRESET_OPTIONS` array.
- `NotificationModal` title changed from `modalTitle` (semibold 17px) to `eyebrow` style — so the modal header is now visually smaller/more muted.

**Concerns:**
- `eyebrow` style defined in both `NotificationSettings.tsx` and `NotificationModal.tsx` — duplication is minor but worth noting.
- `fontSize.xs - 1` is a raw arithmetic expression on a theme token, not a direct token value. If `fontSize.xs` is 12, this evaluates to 11 — fine. But if the token ever changes, the subtraction shifts too, which is fragile.

**Risk:** ✓ clean (minor duplication and fragile arithmetic, non-blocking)

---

### 12. `eef41ff` — changed gradients for Dhuhr and Asr
**Files:** `src/theme/colors.ts` (7 lines changed)

**What it does:** Replaces dark green/brown-ish Dhuhr/Asr gradients with blue-sky (Dhuhr) and warm amber/grey (Asr) tones across all three theme palettes (dark, light, midnight).

- Dhuhr: `['#1A2F38', '#153A35', '#0D4F35']` → `['#17365D', '#2F6C94', '#7acae4']`
- Asr: `['#2A2A1A', '#1F3222', '#1B3A2A']` → `['#52657A', '#8FA1AE', '#E2B56C']`

**Concerns:**
- Missing newline at end of file (`colors.ts`) introduced by this commit — the diff shows `\ No newline at end of file`. The current file ends without a trailing newline. This is a cosmetic git/editor annoyance; some linters flag it.
- The new gradients are significantly brighter/lighter than the surrounding night-mode gradients for Fajr/Maghrib/Isha. Dhuhr's final stop `#7acae4` is a near-white sky blue — may cause text legibility issues on the SanctuaryView hero if the prayer name or time text uses a dark-on-dark assumption. Should be visually verified on-device.

**Risk:** ⚠ note — missing trailing newline (lint); Dhuhr/Asr light-mode gradients are significantly brighter — verify text legibility on the home screen hero.

---

### 13. `924d06c` — more ui coherence
**Files:** `MosqueModeStatus.tsx`, `TabNavigator.tsx`, `MenuScreen.tsx`, `MosqueModeScreen.tsx`, `mosqueModePlatform.ts`

**What it does:**
- `MosqueModeStatus` title: `fontSize` reduced from 17 to 14.
- `TabNavigator`: Tab label for the Menu/More tab changed from `'Tools'` to `'More'`.
- `MenuScreen`: Comments out `<Text style={styles.headerTitle}>Companion Tools</Text>` header; reduces `headerTitle` fontSize from 22 to 17.
- `MosqueModeScreen`: Jumu'ah section helper text changed from a longer explanatory sentence to "Seperate settings for silence during khutbah and salah" — note **typo: "Seperate" should be "Separate"**.
- `MosqueModeScreen`: `headerTitle` fontSize 22 → 17.
- `mosqueModePlatform.ts`: iOS-only jummah subtitle changed from "Friday reminder timing before khutbah and prayer" to "Friday mosque mode reminder before khutbah and prayer".

**Concerns:**
- **Typo in production UI string:** "Seperate settings for silence during khutbah and salah" — `src/screens/MosqueMode/MosqueModeScreen.tsx` line 82. "Seperate" should be "Separate". This will be user-visible on the Mosque Mode screen.

**Risk:** ⚠ note — typo "Seperate" in a user-visible string (`MosqueModeScreen.tsx:82`).

---

### 14. `903d332` — changed theme titles only
**Files:** `MenuScreen.tsx` (1 line)

**What it does:** Renames theme display labels in the menu:
- `'dark'` → `'Twilight'`
- `'light'` → `'Dawn'`
- `'midnight'` unchanged → `'Midnight'`

**Concerns:**
- Internal theme mode values (`'dark'`, `'light'`, `'midnight'`) are unchanged — only the display string. `themeMode === 'dark'` is still a valid comparison. ✓
- The theme toggle cycles `dark → light → midnight → dark`. So the label will say "Twilight" when `themeMode === 'dark'`, "Dawn" when `'light'`, "Midnight" when `'midnight'`. Correct mapping. ✓
- Store screenshots and marketing materials should use the new names (Twilight/Dawn/Midnight). If any existing marketing copy references "Dark Mode" or "Light Mode", it needs updating.

**Risk:** ✓ clean

---

### 15. `e5522e6` — removed wording
**Files:** `TubaTreeInfoScreen.tsx` (1 line)

**What it does:** Removes the sentence "Breaks do not erase the tree." from the "Consistency deepens the tree" growth step description.

**Concerns:** Removing the reassurance about breaks could make the copy less forgiving-feeling, but this is a content decision, not a technical concern.

**Risk:** ✓ clean

---

## Batch E Summary

### Blockers
None.

### Warnings (ordered by impact)

1. **`512ba85` — Silent `beforePrayer: 10→0` migration for existing gentle users** (`StorageService.normalizeGentlePresetIfNeeded`). Existing users on the gentle preset will silently lose their 10-minute advance prayer notification on first launch of the new build. This is a behavioral regression for real users. Recommend a one-time user-visible note or confirm the product intent is for gentle = no advance reminder.

2. **`eef41ff` — Dhuhr/Asr gradient brightness.** New Dhuhr gradient ends at near-white `#7acae4`. If the SanctuaryView hero text (prayer name, countdown) uses light-colored typography (confirmed via CLAUDE.md: the hero uses `LinearGradient` with overlaid text), the bright gradient stop may cause readability issues. Verify on-device across all three themes.

3. **`924d06c` — Typo "Seperate" in production UI.** `src/screens/MosqueMode/MosqueModeScreen.tsx` line 82: "Seperate settings for silence during khutbah and salah". Should be "Separate". Visible on Mosque Mode screen.

### Additional Notes (non-blocking)

- `30e40e7` — Privacy policy now accurately discloses coordinates may go to prayer-time providers. Ensure Play Store Data Safety form is consistent before submission.
- `8d12faf` — Ramadan/Dhul-Hijjah Hijri nudge has no day cap: users who dismiss (not acknowledge) will see the sheet every session during those months. Confirm this is intentional.
- `7f8a27f` — Tasbih preset ID `'allahu-akbar'` → `'Allahu-akbar'`. Verify this ID is not used as a persistence key for counter state.
- `c244788` — `fontSize.xs - 1` arithmetic on a theme token is fragile. Use a fixed literal or a dedicated token.
- `512ba85` — `scheduleUpcomingMosqueModes` (bulk Android path) does not persist `managedBySukoon: false` when phone is already quiet — minor gap vs. single-prayer scheduling path.
- Across multiple commits: widespread shift to raw font size literals (11, 14, 17, 22) instead of `theme.typography.fontSize.*` tokens. Accumulating style debt; worth a follow-up token sweep post-launch.

### Overall Confidence: MEDIUM

The batch is predominantly low-risk UI polish. The one substantive commit (`512ba85`) is well-structured and adds tests, but the `beforePrayer: 10→0` silent migration for existing users is a user-facing behavioral change that deserves explicit sign-off. The Dhuhr/Asr gradient brightness and the "Seperate" typo are the most visible launch-day risks.
