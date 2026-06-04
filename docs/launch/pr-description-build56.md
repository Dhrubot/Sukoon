# v1.0 launch hardening + Build 56 polish

## Summary

- **Notification engine hardening:** Channel bumped to v11 (forces DND-bypass flag re-creation on existing installs), boot last-known-good fallback corrected (`diskOnlyFetcher` delegated to `getPrayerTimesList({diskOnly:true})`), notification ledger backfill added for closed-app fires, Notification Authority Phase 1 shipped (cross-process schedule lock, fingerprint v2, DST back-off, drop `useStore` from service layer), adhan audio delivery unified into a single `resolveAdhanDelivery` resolver with `native_alarm` primary and `channel_sound` alarm-grade fallback.
- **Mosque Mode P1–P5:** JS-side watchdog hook catches missed AlarmManager restore alarms on foreground transitions (P1+P2), `RingerModeBootReceiver` re-arms on device reboot (P2), `alreadyQuiet` guard prevents Sukoon from managing a phone the user already silenced (P3), OEM battery-optimization guidance card deep-links to `android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS` when Mosque Mode is active (P5), gentle notification preset fixed to one notification per prayer and `applyIntensityPreset` made a pure function (P4).
- **Launch infra:** Privacy policy HTML hosted at `https://dhrubot.github.io/Sukoon/privacy.html` and linked from `app.config.js`, support email wired via typed `supportConfig.ts` accessor, dormant monetization code stripped (IAP, ads, subscriptions, donations), EAS submit configuration drafted with `REPLACE_WITH_*` placeholders, Android QA walk matrix and logcat cheatsheet added, widgets and Live Activity toggle hidden for v1 behind `WIDGETS_ENABLED=false` and a commented-out UI block.
- **UI/UX polish:** Hijri nudge prompts refactored with `finalizeHijriDateConfirmation` and per-event acknowledgement keys, Jummah iqamah model changed from offset minutes to absolute HH:mm wall-clock time defaulting to 1:30 PM, Dhuhr/Asr hero gradients updated to sky-blue and warm-amber palettes, theme display names changed to Twilight/Dawn/Midnight, notification settings normalizer enforces enabled cascade (`enabled=false` → `adhanEnabled=false` → `fullAdhanEnabled=false`), copy cleanup across settings and Mosque Mode screens.
- **Build 56 last-mile patch:** Typo corrected in Mosque Mode UI, support email updated to production address, privacy URL `.html` suffix confirmed in `app.config.js`, exact-alarm re-prompt guard prevents the Alert from firing on repeated onboarding taps.

## Build 56 patch

The final commit (`f2fcd5f prod ready`) touches four areas:

- **Typo fix (`MosqueModeScreen.tsx`):** "Seperate settings for silence during khutbah and salah" corrected to "Separate" — this string is visible on the Mosque Mode screen on every Android install.
- **Support email (`app.config.js`):** `extra.supportEmail` changed from the personal fallback address to the production address surfaced in the Settings "Contact support" row.
- **Privacy URL suffix (`app.config.js`):** `extra.privacyPolicyUrl` updated to include the `.html` extension (`…/privacy.html`) so the Settings link resolves correctly on GitHub Pages, which does not serve extensionless paths by default.
- **Exact-alarm re-prompt guard (`OnboardingScreen.tsx`):** Added a `hasShownExactAlarmPrompt` ref so `maybePromptExactAlarm` fires at most once per onboarding session, preventing the Alert from re-appearing if the user dismisses it and taps "Enable" again.

## Pre-merge audit results

| Area | Status | Note |
|---|---|---|
| Uncommitted files | OK | Only untracked `marketing-screenshots/` |
| Branch vs remote | WARN | 1 unpushed commit; push before merge |
| Branch vs main | WARN | 25 commits on `origin/main` not in branch; rebase recommended |
| Manifest permissions | OK | All intentional; blocklist clean; backup rules correct |
| Package name | OK | `com.talukders.sukoon` consistent across iOS and Android |
| versionCode | WARN | Local Gradle shows `1`; EAS manages remotely via `autoIncrement: true` |
| Privacy URL | OK | `.html` suffix added in Build 56 patch commit |
| EAS production profile | OK | Builds AAB, `autoIncrement` on, `mapping.txt` captured |
| EAS iOS submit | WARN | Placeholder values block iOS submission only; not a Play Store blocker |
| Minify/shrink in prod | WARN | Disabled intentionally for crash-symbol stability; larger bundle |
| CI / automated gates | FAIL | No `.github/workflows/` — no PR gating; manual QA is the only gate |
| privacy.html | OK | Exists at `docs/privacy.html`, 260 lines, correct GitHub Pages path |
| console.log leaks | OK | 2 occurrences, both flag-gated (flags off in production) |
| Feature flags | OK | Only React Native animation optimization override |
| TODO in critical paths | OK | None in `NotificationService`, `PrayerTimeService`, or `src/services/notifications/` |

## Known deferred items (v1.1)

- **Gentle-preset migration disclosure:** `normalizeGentlePresetIfNeeded` silently changes `beforePrayer` from 10 to 0 for existing gentle-preset users on first launch — no opt-out or changelog note shown to the user.
- **Dhuhr/Asr gradient legibility:** The new Dhuhr gradient ends at near-white `#7acae4`; text legibility on the SanctuaryView hero needs an on-device verification pass across all three themes.
- **Orphan monetization types:** `PremiumFeatures`, `SubscriptionPlan`, `Donation` interfaces remain in `src/types/index.ts` and four dead methods remain in `StorageService` after the IAP strip; unreachable at runtime but confusing for future contributors.
- **Android widget light-palette mismatch:** `SukoonWidgetGlanceSupport.kt` "light" palette uses a dark forest-green background (`0xFF16392D`) instead of the app's cream/linen light theme; invisible for v1 (widgets disabled), but will be wrong on re-enable.
- **`driftSeconds` analytics semantics:** The notification ledger's `driftSeconds` field carries three different meanings depending on the recording path (true delivery drift, inferred zero, or tap-response latency); a field-level doc comment or a separate `tap_latency_seconds` field is needed before ledger data is queried for analytics.
- **`channel_sound` foreground audio behavior:** When `exactAlarmGranted=false`, a prayer notification arriving while the app is foregrounded now plays the adhan clip through the alarm-grade channel (behavioral change from prior suppression logic); this path needs a physical device validation with exact-alarm permission denied before v1.1.

## Test plan

- [ ] Fresh install on Galaxy M21 (or S22): complete onboarding, grant notification permission — the "Allow exact alarms" Alert appears once; dismissing it and tapping "Enable" again does not re-show the Alert.
- [ ] Settings > About > Privacy Policy opens `https://dhrubot.github.io/Sukoon/privacy.html` in the system browser (not a 404).
- [ ] Settings > About > Contact Support opens the email composer pre-addressed to the production support address (not the personal Gmail fallback).
- [ ] Settings > Mosque Mode screen: helper text reads "Separate settings for silence during khutbah and salah" (no typo).
- [ ] Enable adhan for one prayer; wait for it to fire on-device — adhan audio plays and the notification appears without double audio or ANR.
- [ ] Enable Mosque Mode, set iqamah time, wait through iqamah — phone silences at iqamah and restores after the configured duration; Sukoon does not silence a phone that was already silent before iqamah.
- [ ] Reboot device with Mosque Mode active — mode re-arms from persistence and the ringer is managed correctly for the next iqamah.
- [ ] Monitor Crashlytics for 48 hours after the production build reaches internal testing — no new crash signatures introduced by this branch.
