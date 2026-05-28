# Sukoon — App Privacy & Data Safety Form Answers

**Prepared:** May 28, 2026  
**Source of truth:** `src/services/AnalyticsService.ts`, `src/services/CrashReportingService.ts`, `src/services/StorageService.ts`, `src/services/PrayerTimeService.ts`, `app.config.js`, `edge-api/src/index.ts`

---

## Part 1: Apple App Privacy (Nutrition Label)

Apple's App Privacy section in App Store Connect asks you to declare data collected for each category. Paste these answers into the form.

### Do you collect data from this app?

**Yes.**

---

### Category: Contact Info

**Not collected.** Sukoon does not require any account creation. No name, email address, phone number, or physical address is collected by the app.

---

### Category: Health & Fitness

**Not collected.** Prayer completion records (e.g., whether you prayed Fajr today) are stored exclusively on your device and are never transmitted to Firebase, the edge API, or any other service. This is enforced in `AnalyticsService.ts` by explicit no-op implementations of `logPrayerCompleted`, `logPrayerMissed`, and `logDawamMilestone`.

---

### Category: Financial Info

**Collected — Not linked to identity — Not used for tracking.**

- **Payment info:** Not directly collected by the app. Any payment transactions are handled by Apple's IAP system or the payment provider at the time IAP is enabled. Sukoon's `StorageService` records a local `Donation` object with tier and amount — this is on-device only and is not transmitted.
- **Purchase history:** If IAP is active, Apple's StoreKit provides transaction data. The app logs an `donation_made` analytics event with `tier` and `amount` parameters. This is linked to an anonymous Firebase Analytics session, not to a personal identity.

**Note:** At the time of launch, no IAP or payment is active. The `premium_purchased` and `donation_made` events are in the analytics event type list but will not fire until monetisation is enabled.

---

### Category: Location

**Collected — Not linked to identity — Not used for tracking.**

- **Precise location:** Collected when you grant GPS permission. Used solely to calculate prayer times and Qibla direction. Coordinates are sent to the Sukoon edge API (a Cloudflare Worker) or directly to `api.aladhan.com` to retrieve prayer times. The edge API does not log raw coordinates; it uses rounded coordinates as a cache key.
- **Coarse location:** Collected alongside precise location via `ACCESS_COARSE_LOCATION`. Same use as above.

**How location is used:** Prayer-time calculation, Qibla compass (on-device calculation). Location is stored locally in encrypted MMKV storage for subsequent app launches. It is not used for advertising, profiling, or any purpose beyond prayer-time accuracy.

**User control:** The user can grant GPS access or manually enter a city. Manual entry sends the coordinates of the selected city (not the user's GPS position). Location access can be revoked at any time in device Settings.

---

### Category: Sensitive Info

**Not collected.** Religious practice data (prayer records, reflections, Tuba Tree state, mood entries, dawam streaks) is stored only on the device and never transmitted. No sensitive demographic data is collected.

---

### Category: Contacts

**Not collected.**

---

### Category: User Content

**Not collected (from a transmission standpoint).** User-written reflections are stored in encrypted on-device storage (`reflection_{date}_{prayer}` keys in `prayer-buddy-storage` MMKV). They are never transmitted to any server.

---

### Category: Browsing History

**Not collected.**

---

### Category: Search History

**Not collected.** In-app search (Dua library, city search) is on-device.

---

### Category: Identifiers

**Collected — Not linked to identity — Not used for tracking.**

- **Device ID:** Firebase Analytics SDK may auto-collect an anonymous Firebase Instance ID or Analytics App Instance ID. This is a resettable pseudonymous identifier used to aggregate session data anonymously. It is not linked to a personal identity.

**Note:** Sukoon does not call `setUserId()` in Firebase Analytics anywhere in the reviewed codebase. Firebase may still associate events with its own auto-generated instance identifier.

---

### Category: Usage Data

**Collected — Not linked to identity — Not used for tracking.**

Interaction events logged to Firebase Analytics (full list in `AnalyticsService.ts`):

| Event | Data sent |
|---|---|
| `app_open` | None beyond the event name |
| `notification_tapped` | None beyond the event name |
| `premium_card_tapped` | None |
| `premium_purchased` | Plan name |
| `ad_watched` | None |
| `ad_failed` | Reason string |
| `donation_made` | Tier, amount |
| `qibla_opened` | None |
| `mosque_mode_activated` | None |
| `mosque_mode_deactivated` | None |
| `settings_changed` | None |
| `onboarding_completed` | None |
| Screen view | Screen name and class |

Firebase Analytics also auto-collects session duration, engagement time, and screen class via the SDK's default collection. These are not linked to a personal identity.

---

### Category: Diagnostics

**Collected — Not linked to identity — Not used for tracking.**

- **Crash data:** Firebase Crashlytics collects crash reports including stack traces, device model, OS version, app version, memory state, and thread state at crash time.
- **Performance data:** Firebase Performance Monitoring collects app startup time and in-app trace durations.

Neither service receives prayer records, reflections, location coordinates, or any spiritual practice data.

---

### Apple Nutrition Label Summary

| Data type | Collected? | Linked to identity? | Used for tracking? |
|---|---|---|---|
| Contact Info | No | — | — |
| Health & Fitness | No | — | — |
| Financial Info | Yes (when IAP active) | No | No |
| Precise Location | Yes | No | No |
| Sensitive Info | No | — | — |
| Contacts | No | — | — |
| User Content | No | — | — |
| Browsing History | No | — | — |
| Search History | No | — | — |
| Identifiers (Device ID) | Yes (Firebase auto) | No | No |
| Usage Data | Yes | No | No |
| Diagnostics (Crash/Perf) | Yes | No | No |

**Tracking declaration:** The app does not use data to track users across apps and websites owned by other companies.

---

## Part 2: Google Play Data Safety

Google Play's Data Safety section asks you to declare data collection, sharing, security practices, and whether data is required. Paste these answers into the Play Console form.

### Does your app collect or share any of the required user data types?

**Yes.**

---

### Is all of the user data collected by your app encrypted in transit?

**Yes.** All data transmitted by the app (to Firebase services, to the Sukoon edge API, and to the Aladhan API) is over HTTPS/TLS.

---

### Do you provide a way for users to request that their data is deleted?

**Yes.** Uninstalling the app removes all locally stored data. Users can also reset all data from within Settings → App Data → Reset App Data without uninstalling. There is no server-side user data to delete.

---

### Data types: Location

**Collected — Used by the app — Processed ephemerally — Required.**

- **Approximate location:** Collected.
- **Precise location:** Collected.
- **Shared?** Yes — coordinates are shared with the prayer-times API (Sukoon edge API / Aladhan) for prayer-time calculation. Not shared for advertising purposes.
- **Required?** Location permission is optional (user can enter a city manually). Precise GPS location improves prayer-time accuracy but is not mandatory.
- **Purpose:** App functionality (prayer time calculation, Qibla direction).

---

### Data types: App Activity

**Collected — Used by the app — Not shared with third parties for advertising.**

- **App interactions:** Screen views and feature-tap events logged to Firebase Analytics.
- **In-app search history:** Not collected (search is on-device only).
- **Installed apps:** Not collected.
- **Other user-generated content:** Not collected / not transmitted.
- **Shared?** Firebase Analytics data is processed by Google. It is not shared for advertising targeting.
- **Required?** Firebase Analytics collection is currently not user-controllable in the app. It is always active.
- **Purpose:** Analytics (product improvement, crash attribution).

---

### Data types: App Info and Performance

**Collected — Used by the app — Not shared for advertising.**

- **Crash logs:** Collected by Firebase Crashlytics.
- **Diagnostics:** App startup time and performance traces collected by Firebase Performance Monitoring.
- **Shared?** Processed by Google Firebase. Not shared for advertising.
- **Required?** Crash reporting is always active.
- **Purpose:** Crash reporting, app performance.

---

### Data types: Device or Other IDs

**Collected — Used by the app — Not shared for advertising.**

- **Device ID:** Firebase Analytics SDK auto-assigns a pseudonymous Firebase App Instance ID.
- **Advertising ID:** Firebase Analytics SDK may read the Advertising ID on Android (Google Play Services). **Verify with engineer:** If you want to declare that the Advertising ID is NOT collected, you need to confirm that `com.google.android.gms:play-services-ads` is not in the dependency tree, or that Firebase Analytics' ad ID collection is disabled via manifest metadata (`google_analytics_adid_collection_enabled = false`).
- **Shared?** Processed by Google Firebase. Not used for ad targeting.
- **Purpose:** Analytics (anonymous session aggregation).

---

### Data types: Financial Info

**Collected (when IAP is active) — Not shared — Optional.**

At launch, no financial transactions occur. When IAP is enabled, transaction confirmation data (plan, amount) is logged as an analytics event.

---

### Data types: Personal Info (Name, Email, etc.)

**Not collected.** No account registration is required. No name or email is collected.

---

### Data types: Messages / Communications

**Not collected.** Sukoon does not read, store, or transmit any communications.

---

### Data types: Health and Fitness

**Not collected / not transmitted.** Prayer records and spiritual practice data are stored on-device only. Not transmitted.

---

### Play Data Safety Summary

| Data type | Collected | Shared | Encrypted in transit | Required |
|---|---|---|---|---|
| Approximate location | Yes | Shared with prayer API only | Yes | No (manual city entry available) |
| Precise location | Yes | Shared with prayer API only | Yes | No (manual city entry available) |
| App interactions | Yes | Processed by Google (Firebase) | Yes | Yes (always active) |
| Crash logs | Yes | Processed by Google (Firebase) | Yes | Yes (always active) |
| Performance diagnostics | Yes | Processed by Google (Firebase) | Yes | Yes (always active) |
| Device ID | Yes (Firebase auto) | Processed by Google (Firebase) | Yes | Yes (auto-collected) |
| Financial info | No (at launch) | — | — | — |
| Personal info | No | — | — | — |
| Health/fitness | No | — | — | — |

---

## Sources of Truth — Verification Checklist

Use this table to verify each declaration against source files before submitting the forms.

| Declaration | Source file | Line / key |
|---|---|---|
| `prayer_completed` excluded from Analytics | `src/services/AnalyticsService.ts` | `logPrayerCompleted()` is a no-op (line 96) |
| `prayer_missed` excluded from Analytics | `src/services/AnalyticsService.ts` | `logPrayerMissed()` is a no-op (line 97) |
| `logDawamMilestone` excluded from Analytics | `src/services/AnalyticsService.ts` | `logDawamMilestone()` is a no-op (line 117) |
| Full analytics event list | `src/services/AnalyticsService.ts` | `type AnalyticsEvent` union (lines 7–19) |
| Prayer records stored only on device | `src/services/StorageService.ts` | `savePrayerRecord()` writes to `publicStorage` (MMKV) only |
| Reflections stored in encrypted storage | `src/services/StorageService.ts` | `saveReflectionText()` writes to `this.storage` (encrypted MMKV) |
| Location sent to prayer-time API | `src/services/PrayerTimeService.ts` | `fetchPrayerTimesFromAladhan()` URL includes `latitude` and `longitude` params (line 337) |
| Edge API uses coordinates only as cache key | `edge-api/src/index.ts` | Cloudflare Worker — coordinates used for KV cache key construction, not logged |
| Crashlytics used | `src/services/CrashReportingService.ts` | `recordError()`, `log()`, `setAttribute()` |
| No `setUserId` call in Analytics | `src/services/AnalyticsService.ts` | No `setUserId` call in the service |
| Encrypted MMKV for PII | `src/services/StorageService.ts` | `prayer-buddy-storage` MMKV instance (line 57); `prayer-buddy-public` for non-PII (line 44) |
| Firebase Analytics always active | `src/services/AnalyticsService.ts` | `this.enabled = true` (line 26); no user opt-out mechanism visible |
| No personal info collected | `src/screens/Onboarding/OnboardingScreen.tsx` | No email/account step in onboarding (verified in audit doc B1.6) |

---

## Open Questions for the Engineer (Privacy-Specific)

1. **Firebase Advertising ID collection:** Does `@react-native-firebase/analytics` auto-collect the Android Advertising ID? If so, add `<meta-data android:name="google_analytics_adid_collection_enabled" android:value="false" />` to the manifest (via `app.config.js` `android.manifestMetaData`) if you want to declare "Advertising ID not collected." This affects the Play Data Safety form.

2. **Firebase auto-collection scope:** Confirm whether `@react-native-firebase/perf` auto-collects network request URLs and HTTP response codes. If it does, the "Performance diagnostics" row needs to add "Network requests" as a sub-type in the Play Data Safety form.

3. **iCloud / Android Auto Backup:** Does `google-services.json` or any manifest entry disable Android Auto Backup for MMKV files? If not, user data (including prayer records) may be included in Google Drive backups — which should be disclosed as "data shared with Google" in a backup context, even though it is not Sukoon's active sharing. Verify `android:allowBackup` and `android:fullBackupContent` in the manifest post-prebuild.

4. **Google Play Services dependency:** Check whether `com.google.android.gms:play-services-ads` is pulled in transitively (via Firebase or expo-modules). If it is, the Advertising ID may be auto-collected even without explicit code — this must be declared.
