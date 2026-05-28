# Sukoon — Product & Retention Audit
**Branch:** feature/notification-prayer-times-hardening  
**Audit date:** 2026-05-28  
**Auditor:** Claude Code (Sonnet 4.6)

---

## Status Legend

| Tag | Meaning |
|-----|---------|
| ✅ DONE | Verified in code — already implemented |
| 🔧 FIX (BLOCKER) | Must fix before App Store launch |
| 🟡 FIX (FAST-FOLLOW) | Fix post-launch within 4–8 weeks |
| 🚫 WON'T DO (v1) | Explicitly out of scope — reason given |
| ❓ VERIFY | Needs senior-engineer confirmation; exact check stated |

---

## 1. Top Summary

### Status Counts

| Status | Count |
|--------|-------|
| ✅ DONE | 11 |
| 🔧 FIX (BLOCKER) | 6 |
| 🟡 FIX (FAST-FOLLOW) | 9 |
| 🚫 WON'T DO (v1) | 2 |
| ❓ VERIFY | 4 |

### Launch Blockers (🔧)

1. **iOS full-adhan expectation gap** — onboarding and App Store listing do not honestly set expectations that iOS delivers a short clip, not the full 3-min adhan. Users will 1-star when it doesn't match.
2. **Ringer-restore failure leaves phone silent (Android)** — if the DND AlarmManager restore alarm is missed (Doze, OEM kill, permission revoked mid-session), the phone stays muted indefinitely. No watchdog or recovery path exists.
3. **Data export/import hidden behind `SHOW_APP_DATA_SECTION = false`** — the only backup mechanism users have is surfaced to zero users. Single device failure = total data loss.
4. **Wrong times from failed auto-selected calc method** — `calculationMethodManuallySelected: false` defaults new users to MWL regardless of region until location is detected. Edge/Aladhan API failure with no prior cache hits the astronomical fallback, which can diverge ±10–20 min at high latitudes.
5. **Notification scheduling authority fragmentation** — multiple entry points (`ServiceProvider`, `PrayerTimesProvider`, boot receiver, Settings handlers) can race. The planned single "Scheduling Authority" rework is not yet complete, leaving duplicate/missed schedules as a ship-blocking reliability risk.
6. **OEM battery-optimization silent kills on Android** — no in-app guidance to exempt Sukoon from Xiaomi/Samsung/Huawei aggressive kill lists. `exactAlarmReady` addresses the SCHEDULE_EXACT_ALARM permission, but OEM-layer app-kill is a separate uncovered failure mode.

---

## 2. First-Impression & ASO Risks

### 2.1 App Name — Weak English Keyword Signal
🟡 FIX (FAST-FOLLOW) — "Sukoon" (Arabic/Urdu for "peace/tranquility") is evocative for the target audience but contributes zero English search weight to high-volume terms like "prayer times," "Muslim prayer," "adhan," or "qibla." App Store and Google Play keyword fields must be fully loaded with those terms. This is a marketing/listing-layer issue, not a code change.  
_File reference: none (store metadata)_

### 2.2 Store Screenshots Must Show Clock Face With Real Times
🟡 FIX (FAST-FOLLOW) — If screenshots show placeholder or hardcoded times (e.g., "5:00 AM"), potential users distrust accuracy. Screenshots should show real calculated times for a representative city.

### 2.3 Category Positioning
🟡 FIX (FAST-FOLLOW) — Sukoon must be positioned as a "prayer companion" (mindfulness + habit), not a Muslim Pro replacement. The lack of a Quran reader (`🚫 WON'T DO (v1)` below) is a gap vs. top competitors; the store listing copy must pre-empt this with clear value proposition around guided reflection and Mosque Mode. Framing it as a Quran reader alternative invites one-star reviews.

---

## 3. Representative 1-Star Review Scenarios

These are the most likely verbatim review triggers, mapped to their root cause and fix.

| Review Scenario | Root Cause | Fix |
|----------------|------------|-----|
| "Adhan doesn't play on iPhone — just a short beep" | iOS cannot play full clip; no expectation set in onboarding | 🔧 Honest onboarding copy + listing note |
| "Prayer times were wrong — I missed Fajr" | Hardcoded fallback (05:00) shown on full API failure | 🔧 Last-known-good cache now wired as first fallback (✅ DONE for code path; 🔧 UX banner needed) |
| "My phone stayed silent all day after Jumu'ah" | Ringer restore AlarmManager can be killed by Doze | 🔧 Watchdog / restore safeguard |
| "I lost all my prayer history" | No backup surfaced in UI | 🔧 Unhide AppDataSection |
| "Notifications stopped working after phone restart" | Boot receiver exists but OEM kill list bypasses it | 🔧 In-app OEM battery guidance |
| "Mosque Mode didn't silence my phone" | DND permission not granted; no clear pre-enable guidance | 🟡 Permissions onboarding improvement |
| "Prayer times are 20 min off in Stockholm" | High-latitude warning only shown in fallback path | 🟡 Proactive lat-based calc method suggestion |

---

## 4. Top 7-Day Uninstall Reasons

Ranked by likelihood based on the feature surface and known mobile app attrition patterns:

1. **No adhan sound on iOS** — expected full call to prayer, got short clip. Immediate uninstall within 24 h.
2. **Notifications unreliable on Android** — OEM battery optimization. Users who don't see timely prayer reminders by Day 3 uninstall.
3. **Prayer times inaccurate for location** — wrong calc method auto-applied, no correction prompt.
4. **Empty feeling on first open** — no prayer logged, tree is invisible (separate tab, requires reflections), no dawam counter on Home. Nothing communicates "keep coming back."
5. **Confusing feature names** — "Tuba Tree," "Mosque Mode," "Dawam" — non-obvious to diaspora users unfamiliar with classical terms without English context.
6. **Mosque Mode does nothing on iPhone** — user enables it, nothing happens, feels broken.
7. **App killed / no background notifications** — Xiaomi/Samsung MIUI/OneUI aggressive kill. Prayer times appear on screen but no audio fires.

---

## 5. Retention Killers

### 5.1 Invisible Reward Loop
🟡 FIX (FAST-FOLLOW) — **High ROI.** After logging a prayer, the Tuba Tree grows — but it lives in `More → Tuba Tree`, a secondary navigation path. The Home screen (`SanctuaryView`) has no dawam counter, no micro-animation, no "you've logged X prayers today" feedback at the moment of action. The habit loop (cue → routine → reward) is broken at the reward step. A simple dawam count or animated leaf burst on the Home prayer card would close the loop.  
_Verified: `src/screens/Home/HomeScreen.tsx` references `TreeGrowthStateService.recordReflection()` but no visible reward feedback on the Home view. The Tuba Tree canvas is in `src/screens/ReflectionGarden/ReflectionGardenScreen.tsx`, reachable only via `More` tab._

### 5.2 No Progress Anchor on Home Tab
🟡 FIX (FAST-FOLLOW) — There is no streak counter, completion ring for the day's 5 prayers, or "X/5 today" indicator visible on the primary Home screen between prayers. Users who open the app mid-day see only the countdown to next prayer with no sense of accumulated progress.

### 5.3 Cold-Start Friction (No Prior Cache)
🔧 FIX (BLOCKER) — On first launch with no internet, `getDefaultSettings()` sets location to `(0,0) / "Unknown"`. The Home screen shows the hardcoded-defaults banner ("Unable to calculate prayer times"). This can happen mid-onboarding if the user is slow. The flow should block or guide to location before showing the main UI.  
_Verified: `src/services/StorageService.ts` line 327 — default location `{ latitude: 0, longitude: 0, city: "Unknown" }`._

### 5.4 Notification Fatigue from Multi-Tier Habit Builder
🟡 FIX (FAST-FOLLOW) — **Lower risk than previously assessed.** Verified: `getDefaultSettings()` calls `applyIntensityPreset(..., 'gentle')` which sets `habitBuilder.enabled = false` and `persistentReminders.enabled = false` (see `src/utils/notificationPresets.ts` lines 44–45). New users start with adhan-only, no follow-up reminders. Fatigue risk is limited to users who explicitly switch to `balanced` or `persistent` mode. The residual risk is that the Settings UI doesn't explain what switching to "persistent" means in concrete notification counts before the user commits.

### 5.5 Onboarding Doesn't Show the Differentiator
🟡 FIX (FAST-FOLLOW) — The onboarding flow is `welcome → location → notifications → done`. It never shows the Tuba Tree, the Mosque Mode silencer, or the mindfulness reflection loop — the three things that differentiate Sukoon from any basic prayer-times app. A single "here's what makes Sukoon different" slide during onboarding would reduce churn from users who don't discover these features.  
_Verified: `src/screens/Onboarding/OnboardingScreen.tsx` — four steps, none of which preview the tree or mosque mode._

---

## 6. Feature-Expectation Gap

### 6.1 Quran Reader
🚫 WON'T DO (v1) — Intentional product decision. The App Store listing and onboarding must explicitly position Sukoon as a "prayer & reflection companion" rather than a Quran reader. Attempting to compete with Muslim Pro or Quran Majeed on feature completeness is a losing strategy at launch; the differentiation is depth of mindfulness/habit loop, not breadth.

### 6.2 iOS Full Adhan
🔧 FIX (BLOCKER) — iOS receives a short clip (`adhan_ios.caf`) via notification sound. The full 3-minute adhan is not possible without Apple's Critical Alerts entitlement, which requires Apple approval and is typically reserved for medical/safety apps.  
_Verified: `src/services/notifications/AdhanPlaybackPolicy.ts` lines 90–98 — iOS path always returns `clip: 'short'`, `engine: 'ios_notification'`. Comment on line 14 confirms Critical Alerts is out of scope._  
**Required fix:** Add honest copy to onboarding notification step and App Store description. Something like: "On iPhone, the adhan plays as a short notification tone. Full-length adhan requires an app to be foregrounded or requires system-level permissions Apple grants only to medical apps."

### 6.3 Android Full Adhan — Already Mitigated
✅ DONE — Native AlarmManager + foreground-service MediaPlayer (`native_alarm` engine) plays both short and full clips on Android, bypassing silent/DND. Exact-alarm UX (onboarding prompt + Settings CTA) is wired.  
_Verified: `src/services/notifications/AdhanPlaybackPolicy.ts` lines 65–75; `src/screens/Onboarding/OnboardingScreen.tsx` lines 142–155 (exact alarm prompt); `src/screens/Settings/components/NotificationSection.tsx` line 191 ("Allow exact alarms" CTA)._

### 6.4 Cloud/Drive Backup
🚫 WON'T DO (v1) — Manual JSON export/import is the chosen approach. **However, the export/import UI is not surfaced to users (see 6.5 below).**

### 6.5 Export/Import UI Hidden — DATA LOSS RISK
🔧 FIX (BLOCKER) — `SHOW_APP_DATA_SECTION = false` in `src/screens/Settings/SettingsScreen.tsx` (line 40) means the `AppDataSection` component (which renders the Export and Import buttons) is never rendered for users. The underlying `handleExportData` and `handleImportData` functions in `src/screens/Settings/hooks/useSettingsManager.tsx` are fully implemented and working. This is a one-line fix, but until it is flipped, users have no way to back up or restore their prayer history. A phone change or app reinstall = total data loss.  
**Fix:** Set `SHOW_APP_DATA_SECTION = true`. Optionally rename the section from "App Data" to "Backup & Restore" for clarity.

### 6.6 Mosque Mode Name Confusion
🟡 FIX (FAST-FOLLOW) — "Mosque Mode" is a silencer/iqamah manager, not a mosque finder. Users who expect directions to the nearest mosque will be confused. The `mosqueModePlatformUi.toggleDescription` copy (`src/utils/mosqueModePlatform.ts` lines 18/19) is now honest ("Automatically protect masjid quiet..."), but the tab label "Mosque" in the bottom navigation does not carry that context. Consider "Silent" or "Masjid" as the tab label, or add a one-line subtitle to the Mosque Mode screen header.

---

## 7. Trust Risks

### 7.1 Wrong Times from Auto-Selected Calc Method
🔧 FIX (BLOCKER) — `resolveCalculationMethodForCountry()` (`src/utils/calculationMethodByRegion.ts`) covers a limited set of countries and falls back to `MWL` for everything else (line 72). In the UK, France, Germany, and most of Europe, MWL may be correct, but for countries not in the map (e.g., Indonesia, Malaysia, Turkey), the app silently uses MWL without alerting the user. A first-launch banner like "We've selected [Method] for your region — tap to change" with a preview of the resulting times would prevent trust-breaking surprises.  
_Mitigating path: Edge/Aladhan API results use the actual method selected, and there is a "preview calculation method" modal in Settings. But the user must know to look._

### 7.2 Hardcoded Defaults Shown on Full Failure
✅ DONE (code path) / 🟡 FIX (FAST-FOLLOW) (UX) — The code now attempts: memory cache → edge API → Aladhan API → astronomical fallback → last-known-good disk cache → hardcoded defaults. The disk-cache-first fallback (`src/services/PrayerTimeService.ts` lines 656–666) is implemented.  
Residual issue: the hardcoded times (Fajr 05:00, Dhuhr 12:30, etc.) are London-ish values that could be wildly wrong for anyone outside Western Europe. The `usingHardcodedDefaults` banner on the Home screen (`src/screens/Home/HomeScreen.tsx` line 835) shows an error message — **this is correct and ✅ DONE**. The 🟡 risk is that the banner text ("Unable to calculate prayer times — please check your connection") doesn't suggest the user re-enter their location or try the app later; add a CTA button.

### 7.3 Hijri / Ramadan-Start Date Disputes
🟡 FIX (FAST-FOLLOW) — Hijri date comes from Aladhan API (astronomical calculation) with a `±1 day` manual override option in Settings. Different madhabs and local moon-sighting authorities often differ by 1 day on Ramadan/Eid start. The app handles this with `hijriAdjustment` (`-1 | 0 | +1`) and the `MoonSightingPrompt` component, which is a reasonable v1 solution.  
❓ VERIFY — Confirm the moon-sighting prompt fires correctly for Ramadan start detection. Check `src/utils/moonSighting.ts` `getMoonSightingEvent()` and whether the `MoonSightingPrompt` component is connected on the Home screen with the correct Hijri month threshold. If the prompt doesn't surface in the real app, this degrades to 🔧.

### 7.4 High-Latitude Prayer Time Inaccuracy
✅ DONE (detection) / 🟡 FIX (FAST-FOLLOW) (UX) — `_highLatitudeWarning` flag is set when `|latitude| > 48` (line 506, `PrayerTimeService.ts`). The Home screen shows an info banner for high-latitude locations. However, the astronomical fallback calculation doesn't implement any high-latitude rule (nearest-day, angle-based adjustment, etc.) — it can return null/NaN times above the Arctic Circle.  
_Verified: `src/services/PrayerTimeService.ts` lines 505–506 — flag is set but no special calculation branch._  
🟡 Improvement: Add a Settings suggestion to switch to ISNA (fixed angles) for high-latitude users when the warning fires, or link to an explanation.

### 7.5 Local Entitlement Check for Premium (Bypassable)
❓ VERIFY — `StorageService.isPremiumActive()` reads from local MMKV only (line 1050). The TODO comment on line 1047 acknowledges: "Replace local-only entitlement check with server-side receipt validation (RevenueCat / Superwall) before launching paid tiers." If paid tiers are part of v1 launch, this is 🔧. If premium is deferred (free app at launch), this is 🟡.

---

## 8. Habit-Loop Analysis

The habit loop for Sukoon is: **Adhan notification (cue) → log prayer (routine) → Tuba Tree / dawam growth (reward)**.

**Cue is strong on Android, weak on iOS:**
- Android: native alarm bypasses DND — hard to miss. ✅ DONE
- iOS: notification sound only — silent mode kills it. No Critical Alerts. 🔧 expectation gap.

**Routine is frictionless:**  
✅ DONE — Home screen shows the current/next prayer with a one-tap "Log Prayer" flow. `QuickLogSheet` (`src/components/prayer/QuickLogSheet.tsx`) is a one-step log. Good.

**Reward is invisible from the main loop:**  
🟡 FIX (FAST-FOLLOW) — After logging, the user returns to the Home screen where there is no visible acknowledgment of the tree growing, no dawam count, no animated feedback. The reward lives in a separate tab 2–3 taps away. Users who never discover the Tuba Tree tab lose the primary retention mechanism. This is the single highest-ROI retention fix.

**Variable reward (contextual messages):**  
✅ DONE — `getTier2Messages()` in `src/services/notifications/HabitBuilderNotifications.ts` provides varied follow-up copy. Jumu'ah resources, khutba content, and Surah Al-Kahf reminder (`src/constants/surahAlKahf.ts`) provide contextual depth on Fridays.

**Social proof / community loop:**  
🚫 WON'T DO (v1) — No social features. This is appropriate for a v1 privacy-first app.

---

## 9. Mosque Mode — Ringer-Restore Failure (BLOCKER)

🔧 FIX (BLOCKER) — This is a user's explicit non-negotiable requirement.

**The failure scenario:**  
1. User enables Mosque Mode on Android. The app schedules two AlarmManager intents via `RingerModeModule.scheduleMosqueMode()`: one to set SILENT at iqamah time, one to restore NORMAL at `iqamah + silentDuration`.
2. Android Doze mode, OEM aggressive kill (Xiaomi/Samsung/Huawei), or DND permission revocation causes the restore alarm to not fire.
3. User's phone remains SILENT indefinitely. They discover this when someone calls them and the phone doesn't ring.

**Current mitigations (verified):**
- `autoRestore: true` default — restore alarm is scheduled. ✅
- `cancelMosqueMode()` cancels both alarms. ✅
- `manuallyRestoreRinger()` is exposed in the `MosqueModeScreen`. ✅
- `managedBySukoon` flag prevents double-restore when phone was already quiet. ✅

**What is missing (the blocker):**
- No watchdog: if the app is foregrounded after iqamah and the restore time has passed but ringer is still SILENT, there is no automatic recovery.
- No in-app notification or banner on Home screen saying "Your ringer is still in Mosque Mode — tap to restore."
- No check on boot receiver for stale mosque mode state.

**Fix:** In `MosqueModeService`, on app foreground (`useAppStateChange`), call `getActiveMosqueMode()` and if `now > restoreTime && isCurrentlyActive()`, auto-call `manuallyRestoreRinger()` and show a toast/banner.  
_Verified: `src/services/MosqueModeService.ts` `isCurrentlyActive()` method exists (line 512) — the recovery trigger just isn't wired._

---

## 10. Retention Curve Estimate

**Disclaimer:** These estimates are based on comparable faith-app benchmarks (Muslim Pro, Pillars, Athan), the current feature surface, and the identified issues above. Not A/B data.

| Milestone | Estimated Retention (Pre-Fix) | With All Blockers Fixed |
|-----------|-------------------------------|------------------------|
| D1 | 45–55% | 60–70% |
| D7 | 20–28% | 30–38% |
| D30 | 8–14% | 15–22% |

**Biggest D1 driver:** iOS users who expected full adhan (~40% of likely user base). Each 🔧 blocker addressed roughly +3–5% D7.

---

## 11. Market Comparison

| Feature | Sukoon v1 | Muslim Pro | Pillars | Athan |
|---------|-----------|------------|---------|-------|
| Prayer times | ✅ Edge + Aladhan | ✅ | ✅ | ✅ |
| Full adhan (Android) | ✅ AlarmManager | ✅ | ✅ | ✅ |
| Full adhan (iOS) | ❌ Short clip only | ✅ (Critical Alerts) | ❌ | ✅ (Critical Alerts) |
| Mosque Mode silencer | ✅ Android / remind iOS | ❌ | ❌ | ❌ |
| Prayer habit tracking | ✅ | Basic | ✅ | ❌ |
| Mindfulness/reflection | ✅ Deep | ❌ | ✅ Basic | ❌ |
| Tuba Tree visual habit | ✅ Unique | ❌ | ❌ | ❌ |
| Quran reader | 🚫 WON'T DO (v1) | ✅ | Limited | ✅ |
| Widget | ✅ | ✅ | ✅ | ✅ |
| Live Activity / Dynamic Island | ✅ | ❌ | ❌ | ❌ |
| Cloud backup | 🚫 WON'T DO (v1) | ✅ | ✅ | ❌ |

**Competitive insight:** Sukoon's moat is the Mosque Mode silencer (unique), Dynamic Island Live Activity (unique in this category), and the mindfulness/reflection depth. The Quran reader absence removes Sukoon from the "all-in-one" comparison set — this is correct positioning. The iOS full-adhan gap is a real competitive disadvantage vs. Muslim Pro and Athan, which have Critical Alerts entitlements; honest messaging is the only mitigation available without Apple's approval.

---

## 12. Launch Risk Scores

| Risk Area | Severity | Likelihood | Risk Score |
|-----------|----------|------------|------------|
| iOS adhan expectation gap | High | Certain | 🔴 Critical |
| Android ringer stuck silent | High | Moderate | 🔴 Critical |
| Export/import hidden | High | Certain | 🔴 Critical |
| Notification scheduling race | Medium | High | 🔴 Critical |
| OEM battery kill (Android) | High | High | 🔴 Critical |
| Wrong calc method / wrong times | Medium | Moderate | 🟠 High |
| Tuba Tree invisible on Home | Medium | Certain | 🟡 Medium |
| Onboarding no differentiator | Medium | Certain | 🟡 Medium |
| Mosque Mode name confusion | Low | High | 🟡 Medium |
| Hijri date disputes | Low | Moderate | 🟢 Low |

---

## 13. 90-Day Prediction

**If all 6 blockers are shipped before launch:**
- D30 retention reaches 15–20%
- "Wrong times" 1-star reviews: low (hardcoded-defaults banner + calc method preview exist)
- "Silent phone" 1-star reviews: addressed by watchdog
- "No adhan on iPhone" 1-star reviews: reduced by honest onboarding, not eliminated
- Day 7 re-engagement: moderate — reward loop gap (invisible tree) will limit this until fast-follows ship

**If blockers are NOT fixed:**
- iOS launches generate a wave of 1–2 star reviews in week 1 ("just a beep")
- Android Mosque Mode "left my phone silent" creates visceral trust-breaking reviews
- No backup = guaranteed data loss complaints from users who change phones

**Fast-follow impact (weeks 4–8):**
- Surfacing dawam on Home screen and adding a post-log micro-animation is the single highest-ROI retention change. Estimated +4–6% D30 based on comparable habit-tracking apps.
- OEM battery optimization guidance (linking to `dontkillmyapp.com` per-device, or in-app OEM-specific prompt) is the second highest-ROI Android improvement.

---

## 14. Prioritized Retention Improvements

Ordered by retention impact × implementation cost:

1. **🔧 Unhide export/import** — `SHOW_APP_DATA_SECTION = true` in `SettingsScreen.tsx`. 1-line fix. Prevents data loss complaints.
2. **🔧 iOS honest adhan messaging** — Add one paragraph to onboarding notification step and App Store description. Copy change only.
3. **🔧 Mosque Mode ringer watchdog** — Wire `isCurrentlyActive()` check on app foreground to auto-restore if restore time passed. ~50 lines in `MosqueModeService.ts` / `HomeScreen.tsx`.
4. **🔧 OEM battery optimization guidance** — Add a Settings row that detects Xiaomi/Samsung/Huawei and links to device-specific battery settings. Libraries like `react-native-battery-optimization-check` exist.
5. **🔧 Notification scheduling authority** — Complete the single-authority refactor to eliminate race conditions.
6. **🔧 Auto-detect calc method UX** — Show a first-launch banner: "We selected [Method] for [Country] — tap to confirm or change" with a live preview.
7. **🟡 Dawam / tree feedback on Home** — Show current dawam streak + a "leaf earned" animation after logging a prayer. Highest D30 ROI of all fast-follows.
8. **🟡 Onboarding differentiator slide** — Add a single "What makes Sukoon different" slide (Mosque Mode, Tuba Tree, reflections). Reduces Day-1 churn.
9. **🟡 Mosque Mode tab label** — Rename "Mosque" to "Masjid Mode" or add subtitle. Reduces first-impression confusion.
10. **🟡 High-latitude calc suggestion** — When `highLatitudeWarning` fires in Settings, surface a recommendation to switch calc method.
11. **🟡 Notification intensity picker explanation** — Before "balanced" or "persistent" mode, show a concrete count: "This will send up to 3 follow-up reminders per prayer."
12. **🟡 Hardcoded-defaults banner CTA** — Add a "Check Location" button to the error banner so users can self-heal without navigating to Settings.
13. **❓ Moon sighting prompt validation** — Confirm prompt fires in practice for Ramadan start. See Appendix.
14. **❓ Premium entitlement server-side** — Confirm whether paid tiers launch in v1. If yes, local-only check is 🔧.

---

## Appendix A — Files Read

| File | Purpose |
|------|---------|
| `src/services/StorageService.ts` | Default settings, export/import implementation, habitBuilder defaults |
| `src/screens/Settings/SettingsScreen.tsx` | `SHOW_APP_DATA_SECTION = false` flag confirmed |
| `src/screens/Settings/hooks/useSettingsManager.tsx` | Export/import handlers (implemented, not surfaced) |
| `src/screens/Settings/components/NotificationSection.tsx` | "Allow exact alarms" CTA, blocked reason handling |
| `src/services/MosqueModeService.ts` | Ringer restore logic, `isCurrentlyActive()`, `managedBySukoon` |
| `src/services/RingerControlService.ts` | DND permission, `scheduleMosqueMode`, `cancelMosqueMode` |
| `android/.../RingerModeModule.java` | Native AlarmManager scheduling for silence/restore |
| `android/.../MosqueModeReceiver.java` | BroadcastReceiver for silence/restore alarms |
| `src/services/notifications/AdhanPlaybackPolicy.ts` | `resolveAdhanDelivery()` — iOS always `clip: 'short'` |
| `src/constants/NotificationConstants.ts` | Channel version v10, ADHAN + bypassDnd, scheduling days |
| `src/utils/notificationPresets.ts` | `applyIntensityPreset('gentle')` sets `habitBuilder.enabled = false` |
| `src/services/notifications/HabitBuilderNotifications.ts` | Tier 2/3 reminder scheduling |
| `src/services/PrayerTimeService.ts` | Fallback chain, hardcoded defaults, high-latitude flag |
| `src/utils/calculationMethodByRegion.ts` | Country → method map, MWL default |
| `src/screens/Onboarding/OnboardingScreen.tsx` | Four steps, exact alarm prompt, no differentiator slide |
| `src/screens/Home/HomeScreen.tsx` | Banners, notification blocked reason, no dawam on home |
| `src/screens/MosqueMode/MosqueModeScreen.tsx` | Screen structure, `mosqueModePlatformUi` usage |
| `src/utils/mosqueModePlatform.ts` | Platform-conditional UI copy for iOS/Android |
| `src/navigation/TabNavigator.tsx` | Four tabs: Pray, Qibla, Mosque, More |
| `src/navigation/MenuStackNavigator.tsx` | Tuba Tree in `More` stack, not primary navigation |
| `src/components/prayer/SanctuaryView.tsx` | Hero view — no dawam display confirmed |
| `src/utils/hijriDate.ts` | Edge + Aladhan + algorithmic fallback for Hijri |
| `src/utils/moonSighting.ts` | Moon sighting event types, dismiss state |

---

## Appendix B — ❓ Items Requiring Senior Engineer Confirmation

| ID | Item | What to Check |
|----|------|---------------|
| V1 | Moon sighting prompt fires correctly | Run app to Hijri 29 Sha'ban and confirm `getMoonSightingEvent()` returns a Ramadan event and `MoonSightingPrompt` renders on HomeScreen |
| V2 | Premium entitlement scope at launch | Is any paid tier in the v1 App Store submission? If yes, `StorageService.isPremiumActive()` local-only check is 🔧, not 🟡 |
| V3 | Notification scheduling authority rework status | Is the single-authority refactor tracked in a separate PR/branch? Confirm whether it is blocked on launch or can ship as a point release |
| V4 | Boot receiver covers Mosque Mode restore | Confirm `src/tasks/notificationBootRescheduleTask.ts` also re-schedules any pending mosque mode restore alarms after device reboot |
