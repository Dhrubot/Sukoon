---
title: Sukoon Privacy Policy
description: Privacy policy for the Sukoon Muslim prayer companion app
permalink: /privacy/
layout: default
---

# Sukoon Privacy Policy

**Last Updated: May 28, 2026**

---

## A Privacy-First Approach

Sukoon is designed so your worship data stays primarily on your device and under your control. We do not require an account to use the app. Your spiritual practice — your prayers, reflections, streaks, and Tuba Tree — belongs to you.

---

## 1. What Data Sukoon Stores and Where

### On-Device Encrypted Storage

The following data is stored in encrypted MMKV storage on your device. It is never transmitted to any server:

- Prayer records (dates, status, focus scores)
- Mindfulness sessions and mood entries
- Written reflections and Tuba Tree journal entries
- User settings (notification preferences, calculation method, iqamah offsets)
- Location details (city, country, coordinates, timezone) — used locally for prayer-time calculation
- Subscription and donation records
- Onboarding progress

### On-Device Unencrypted Storage

The following non-sensitive operational data is stored in unencrypted local storage. It is also never transmitted to any server:

- Prayer completion statistics and daily aggregates
- Dawam (consistency streak) counts
- Achievement states
- Notification scheduling metadata
- App-launch flag and migration markers

### Data That Leaves the Device

The only data transmitted externally is:

1. **Prayer time requests:** Your GPS coordinates (or the coordinates of a manually selected city) and your chosen calculation method are sent to either the Sukoon edge API (a Cloudflare Worker proxy) or directly to the Aladhan API (`api.aladhan.com`) to retrieve your prayer times. The edge API caches prayer-time responses keyed by rounded coordinates; it does not log or store your raw coordinates for any purpose beyond the cache key. After the first successful fetch, prayer times are cached on-device and available without a network connection.

2. **Firebase Analytics events:** Anonymous interaction events are sent to Google Firebase Analytics. See the full list in Section 3.

3. **Firebase Crashlytics reports:** If the app crashes, a crash report including a stack trace and anonymised device information is sent to Google Firebase Crashlytics.

4. **Firebase Performance traces:** App startup and performance timing data is sent to Google Firebase Performance Monitoring.

---

## 2. What Sukoon Explicitly Does NOT Collect or Transmit

The following data is **never** sent to Firebase or any other external service. This is enforced in code (`src/services/AnalyticsService.ts`) by no-op methods for these events:

- Whether you prayed a specific prayer (`prayer_completed`, `prayer_missed`)
- Your mindfulness session content, mood ratings, or reflection text
- Your dawam streak count or milestones
- Your Tuba Tree state — leaf count, growth, or journal entries
- Your written reflections
- Your exact location coordinates in analytics events (coordinates are sent only to the prayer-times API, not to analytics)

---

## 3. Firebase Analytics — Full Event List

The following analytics events are collected. No user identifier is attached to these events in the reviewed implementation:

| Event | What it records |
|---|---|
| `app_open` | App was opened |
| `notification_tapped` | A prayer notification was tapped |
| `premium_card_tapped` | The premium upgrade card was tapped |
| `premium_purchased` | A premium plan was purchased (includes plan name) |
| `ad_watched` | An ad was watched (currently no ads are running) |
| `ad_failed` | An ad failed to load (includes reason string) |
| `donation_made` | A donation was made (includes tier and amount) |
| `qibla_opened` | The Qibla Finder screen was opened |
| `mosque_mode_activated` | Mosque Mode was activated |
| `mosque_mode_deactivated` | Mosque Mode was deactivated |
| `settings_changed` | A setting was changed |
| `onboarding_completed` | Onboarding was completed |

Screen view events (`screen_name`, `screen_class`) are also logged for each screen transition.

**Note on Firebase auto-collection:** Firebase Analytics and Performance SDKs may auto-collect additional device and session data beyond the events listed above (e.g., device model, OS version, app version, session duration, first-open). This is standard Firebase SDK behaviour. See [Firebase's data collection documentation](https://support.google.com/firebase/answer/6318039) for the complete list of automatically collected parameters.

---

## 4. Firebase Crashlytics — What Is Collected

When the app crashes, Firebase Crashlytics automatically collects:

- Crash stack trace and thread state
- Device model and OS version
- App version and build number
- Device orientation and memory state at the time of crash
- Custom log messages written by the app (these describe technical events, not user content)

Crashlytics does not collect: prayer records, reflections, mood data, location coordinates, or any spiritual practice data.

---

## 5. Location

Location access is used solely for:

1. **Prayer time calculation:** Your coordinates are sent to the prayer-times API to retrieve accurate Fajr, Dhuhr, Asr, Maghrib, and Isha times for your location.
2. **Qibla compass:** The direction to the Kaaba is calculated on-device using your coordinates.
3. **Mosque Mode timing:** Iqamah offsets are calculated using your stored location.

You may use a manually entered city instead of GPS. If you do, the coordinates of the selected city (not your GPS position) are used for prayer-time requests.

**Sukoon requests location only while the app is in use.** It does not request background location access. The `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` permissions on Android, and `NSLocationWhenInUseUsageDescription` on iOS, reflect this scope.

---

## 6. Notifications

Prayer reminders are scheduled locally on your device using iOS and Android notification APIs. Sukoon does not use a remote push-notification backend for routine prayer reminders. Notifications fire from locally scheduled alarms and are not routed through any server.

On Android, the full adhan audio is delivered via the native AlarmManager service. On iOS, a short adhan clip is played as a notification sound.

---

## 7. No Account Required

Sukoon does not require you to create an account, provide an email address, or sign in. The app is fully functional without any registration.

---

## 8. Data Export

Sukoon provides a manual JSON export of your prayer records and daily statistics (last 90 days). The export is triggered only when you explicitly tap "Export Prayer Data" in Settings.

**Redaction:** The export currently includes location details. A redaction option (to strip location and display name from the export) is being added as part of our v1.1 update. If you export data before that update, be aware that the file may contain your city name and coordinates.

The export file is saved to your device. Sukoon does not upload it anywhere. If you share the file manually (e.g., by email or cloud service), that transmission is outside Sukoon's control.

---

## 9. Deleting Your Data

All Sukoon data is stored locally on your device. To delete all data:

1. **Uninstall the app.** This removes all MMKV storage files from your device (subject to platform-specific backup behaviour — see Section 10).
2. **Reset from within the app.** Settings → App Data → Reset App Data clears all local data without uninstalling.

Sukoon does not maintain any server-side copy of your data, so there is no "account deletion" request process.

---

## 10. Platform Backup Behaviour

**iOS:** By default, iOS iCloud backup does not back up app-specific MMKV storage files. If your device is restored from an iCloud backup, Sukoon will start fresh.

**Android:** By default, Android Auto Backup may include app data in Google Drive backups. Sukoon's data (MMKV files) may be included in an automatic device backup and restored to a new device. Sukoon does not currently offer an explicit opt-out of Android Auto Backup — this is on the roadmap for a future update.

---

## 11. Children's Privacy

Sukoon is not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe a child has provided information through the app, please contact us at the address below.

---

## 12. Changes to This Policy

We may update this policy as the app and its data practices change. When we do, we will update the "Last Updated" date at the top of this page. For significant changes, we will update the in-app privacy policy screen simultaneously.

---

## 13. Contact

If you have questions about this privacy policy or Sukoon's data practices:

**Email:** codifizz@gmail.com

We aim to respond to privacy questions within 5 business days.

---

## Hosting Instructions

This file is the authoritative hosted version of the Sukoon privacy policy. It should be accessible at a stable public URL before App Store and Google Play submission.

### Option 1: GitHub Pages (Recommended)

GitHub Pages can serve this file from the Sukoon repository at no cost.

**Setup steps:**

1. In the Sukoon repository on GitHub, go to Settings → Pages.
2. Under "Source," select "Deploy from a branch" and choose `main` branch, `/docs` folder.
3. GitHub Pages will serve files from `docs/` at `https://<username>.github.io/<repo-name>/`.
4. This file (`docs/launch/privacy-policy.md`) will be accessible at `https://<username>.github.io/<repo-name>/launch/privacy-policy/` (with the Jekyll front matter processed).
5. For a cleaner URL, create `docs/privacy.md` as a redirect or copy of this file, making the policy available at `https://<username>.github.io/<repo-name>/privacy/`.

**Suggested final URL:** `https://dhrubot.github.io/Sukoon/privacy`

To make that URL work cleanly, either:
- Copy this file to `docs/privacy.md` (keeping the front matter `permalink: /privacy/`), or
- Add a `_config.yml` to `docs/` with `baseurl: ""` and Jekyll will handle the front matter permalink.

### Option 2: Cloudflare Pages

1. Create a new Pages project in the Cloudflare dashboard.
2. Connect to the Sukoon GitHub repository.
3. Set the build command to `echo done` (no build needed for plain Markdown + a minimal index).
4. Set the publish directory to `docs/launch`.
5. The policy will be served at `https://<project>.pages.dev/privacy-policy`.
6. Add a custom domain (`sukoon.app/privacy`) via Cloudflare DNS if you own the domain.

### Option 3: Any Static Host

Host this `.md` file (or an HTML-converted version) at any static host (Netlify, Vercel, etc.). The URL must be:
- Publicly accessible over HTTPS
- Stable (do not use time-limited preview URLs for store submissions)
- The same URL submitted to App Store Connect and Google Play Console

### In-App Link

After the policy is hosted, update `extra.privacyPolicyUrl` in `app.config.js` to the final URL. The in-app Privacy Policy screen can then display a "View online" link using `Linking.openURL(privacyPolicyUrl)`.
