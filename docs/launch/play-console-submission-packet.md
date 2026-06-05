# Sukoon — Google Play Console Submission Packet
# versionCode 57 · package com.talukders.sukoon

**Prepared:** 2026-06-03 · **Refreshed:** 2026-06-05 for build 57
**Branch:** `main`
**Use:** Keep this open in a browser tab. Every field below maps 1-to-1 to a Play Console screen. Copy-paste where you see a code block; follow the click instructions otherwise.

**What changed since 2026-06-03:**
- Build 56 was uploaded and flagged by Play for the ACTIVITY_RECOGNITION Health policy. Build 57 strips that permission (`app.config.js` blockedPermissions, commit `6d8d882`). The Data Safety answers below DO NOT change — the permission was a transitive pull from `expo-sensors` we never used. Pedometer/step-count was never a feature.
- Qibla feature polish (commit `fd09356`) — UX improvements only. No data-collection delta.
- Calc-method-by-region fix (commit `f62500f`) — for non-English Nominatim responses; ISO country code primary + name fallback + one-shot migration. Includes Cloudflare worker re-deploy.
- Build 57 pre-launch sweep (commit `1a2ac98`) — lean onboarding (5→4 steps), notification name variation, city-search country-first hint.

**⚠ CRITICAL — launch path changed:**
This developer account is **Personal, created in 2024**, so the
Nov 2023 Google Play testing policy applies. **Build 57 must upload
to a CLOSED testing track (not Internal), then run a 14-day soak with
≥ 12 continuously-opted-in testers before applying for production access.**
The packet's §12 below has been updated to reference the full workflow
in `docs/launch/closed-testing-playbook.md`, which covers tester
recruitment, opt-in setup, and the production-access application
questionnaire with pre-written answers.

---

## 1. Main Store Listing

### App name (≤50 characters)

```
Sukoon: Prayer Times & Qibla
```

(29 characters)

---

### Short description (≤80 characters)

```
Accurate prayer times, adhan, Qibla, Mosque Mode & a private reflection journal.
```

(80 characters exactly)

---

### Full description (≤4,000 characters — paste the block below as-is)

```
Sukoon (سكون) — stillness — is a Muslim prayer companion built around presence, not performance.

━━━━━━━━━━━━━━━━━━━━
PRAYER TIMES
━━━━━━━━━━━━━━━━━━━━
Fajr, Dhuhr, Asr, Maghrib, and Isha calculated for your exact location using the calculation method that matches your madhab and region: MWL, ISNA, Umm al-Qura, Egypt, Karachi, Tehran, or Jafari. Standard and Hanafi Asr options. Manual ±minute adjustments per prayer.

Prayer times are fetched over the network on first use and cached on-device. After the initial fetch, they are available without a connection. High-latitude warnings appear when Fajr/Isha times may be approximate.

━━━━━━━━━━━━━━━━━━━━
ADHAN ON ANDROID
━━━━━━━━━━━━━━━━━━━━
Full adhan audio plays through the AlarmManager system service on the USAGE_ALARM stream — bypassing silent mode and Do Not Disturb so you never miss the call to prayer. A short notification clip is used as fallback when exact-alarm permission is unavailable. Notifications are rescheduled automatically after device restart.

━━━━━━━━━━━━━━━━━━━━
MOSQUE MODE
━━━━━━━━━━━━━━━━━━━━
Set your mosque's iqamah time offset. Sukoon automatically moves your phone into silent mode at iqamah and restores normal sound after a configurable duration. Separate Jumu'ah settings cover the khutbah + prayer window on Fridays.

━━━━━━━━━━━━━━━━━━━━
QIBLA COMPASS
━━━━━━━━━━━━━━━━━━━━
Live magnetometer-based compass shows the Qibla direction and distance to Makkah. Works once location is set.

━━━━━━━━━━━━━━━━━━━━
MORNING AND EVENING ADHKAR
━━━━━━━━━━━━━━━━━━━━
Guided through each remembrance from Hisnul Muslim with a count target and haptic feedback. The app defaults to morning adhkar before 3 PM and evening adhkar after.

━━━━━━━━━━━━━━━━━━━━
TASBIH COUNTER
━━━━━━━━━━━━━━━━━━━━
SubhanAllah · Alhamdulillah · Allahu Akbar · La ilaha illallah and more, with configurable targets and gentle vibration on completion.

━━━━━━━━━━━━━━━━━━━━
DUA LIBRARY
━━━━━━━━━━━━━━━━━━━━
Searchable supplication library with Arabic, transliteration, and scholarly reference. Categories: before/after prayer, morning, evening, travel, sleep, eating, distress, forgiveness, guidance, gratitude, parents, rain, entering/leaving mosque.

━━━━━━━━━━━━━━━━━━━━
TUBA TREE — PRIVATE REFLECTION
━━━━━━━━━━━━━━━━━━━━
After each prayer, a mindfulness flow guides breathing, Niyyah, optional dhikr, and a reflection prompt. Mood and written reflection are stored in encrypted on-device storage and never sent to a server. Each reflected prayer grows a leaf on your private Tuba Tree. Dawam (days of continuity) is tracked without the pressure of streak mechanics.

━━━━━━━━━━━━━━━━━━━━
PRAYER INSIGHTS
━━━━━━━━━━━━━━━━━━━━
Weekly, monthly, and 90-day charts reveal which prayers you protect most and where you need support. All data stays on your device.

━━━━━━━━━━━━━━━━━━━━
RAMADAN AND JUMU'AH
━━━━━━━━━━━━━━━━━━━━
Automatic Suhoor/Iftar card during Ramadan. Hijri date with moon-sighting prompts at month boundaries. Eid and Tashreeq greetings. Friday Surah Al-Kahf prompts and blessed-hour reminder.

━━━━━━━━━━━━━━━━━━━━
PRIVACY
━━━━━━━━━━━━━━━━━━━━
Prayer records, reflections, and spiritual practice data stay on your device in MMKV encrypted storage. Firebase Analytics tracks anonymous app-open and feature-tap events. Firebase Crashlytics collects crash reports. Your worship data is excluded from all Firebase reporting. No account required. Currently ad-free with no in-app purchases at launch.

Requires: Location (prayer times and Qibla), Notifications, Exact Alarm (for adhan), Ringer control (Mosque Mode auto-silence).

Android 7.0+ (API 24) · Currently free to use
```

(~3,260 characters — within 4,000 limit)

---

### Category

Click **Lifestyle** → reason: prayer/devotion apps are classified Lifestyle on Play Store.

---

### Tags (up to 5)

```
Prayer
Islam
Adhan
Qibla
Ramadan
```

---

### Contact details

| Field | Value |
|---|---|
| Email | `codifizz@gmail.com` |
| Phone | (leave blank) |
| Website | `https://dhrubot.github.io/Sukoon/privacy.html` |

---

### Privacy policy URL

```
https://dhrubot.github.io/Sukoon/privacy.html
```

**Before submitting:** open the URL in an incognito window and confirm the page loads. If it returns 404, GitHub Pages deployment is incomplete — do not proceed.

---

## 2. Graphics Inventory

Play Store requires: 1 feature graphic (1024×500), phone screenshots (up to 8, min 2). Recommended minimum for an initial launch: 6–8 screenshots.

All source files are in `/Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55/`.

Prefix key: `tw-` = Twilight theme, `dw-` = Dawn theme, `mn-` = Midnight/Dark theme.

### Screenshot slot assignments

| Slot | File | Caption (paste into Play Console caption field) | Reason for selection |
|---|---|---|---|
| **1 — Hero / Feature Graphic** | `tw-01-sanctuary.png` | Your next prayer, front and centre — always | Twilight palette; rich, inviting; best first impression |
| **2** | `tw-23-todays-prayers-list.png` | Five prayers. One clear day. Track every return. | Shows the full prayer list — core utility at a glance |
| **3** | `tw-08-qibla-compass.png` | Qibla found. No account, no sign-up, no friction. | Compass is a high-search feature; Twilight consistent |
| **4** | `tw-09-mosque-mode.png` | Your phone goes silent at iqamah — automatically. | Differentiator feature; Android-accurate claim |
| **5** | `tw-06-tuba-tree.png` | A private garden that grows each time you return to prayer. | Emotional hook; Tuba Tree is unique to Sukoon |
| **6** | `dw-01-sanctuary.png` | Dawn theme — because every Fajr deserves its own light. | Shows theme variety (Dawn); different feel from slot 1 |
| **7** | `mn-01-sanctuary.png` | Midnight theme — built for the night prayer too. | Shows Midnight theme; completes the theme trio |
| **8** | `tw-31-dua-library.png` | Duas from Hisnul Muslim — search, read, share. | Shows Dua library breadth; text-heavy content visible |

**Feature Graphic (banner):** Play Console requires a 1024×500 px banner uploaded separately under "Feature graphic". Use `tw-01-sanctuary.png` resized/cropped to 1024×500, or create a dedicated banner. If no banner asset exists yet, upload any Twilight screenshot — Play accepts portrait screenshots as feature graphics with automatic cropping.

**Upload order matters:** slot 1 is the first screenshot shown on the listing. Drag to reorder in Play Console after upload.

---

## 3. Data Safety Form

Navigate: Play Console → your app → **Store presence → Data safety**.

Work through each question in order.

---

### Section A — Does your app collect or share any of the required user data types?

**Click: Yes → reason:** location, device IDs, app activity, and crash diagnostics are all collected.

---

### Section B — Is all of the user data collected by your app encrypted in transit?

**Click: Yes → reason:** all outbound traffic (Firebase, Cloudflare edge API, Aladhan API) uses HTTPS/TLS.

---

### Section C — Do you provide a way for users to request that their data is deleted?

**Click: Yes → reason:** uninstalling the app removes all local data. In-app: Settings → App Data → Reset App Data. There is no server-side user data to delete beyond anonymous Firebase session data, which users can request deletion of at https://firebase.google.com/support/privacy.

---

### Section D — Data types collected

For each data type listed below, follow the click path exactly.

#### D1. Location — Approximate location

- **Collected by your app?** Click: **Yes**
- **Shared with third parties?** Click: **Yes** — shared with prayer-times API (Cloudflare Worker proxying Aladhan API) for prayer-time calculation. Not shared for advertising.
- **Is this data processed ephemerally?** Click: **No** — coordinates are cached on-device in encrypted MMKV for subsequent app opens.
- **Is this data required or can users opt out?** Click: **Optional** — reason: users can enter a city manually instead of granting GPS.
- **Why is this data collected?** Check: **App functionality** (prayer-time calculation, Qibla direction).

#### D2. Location — Precise location

- **Collected?** Click: **Yes**
- **Shared?** Click: **Yes** — same as approximate location; sent to prayer-times API over HTTPS.
- **Ephemeral?** Click: **No**
- **Required or optional?** Click: **Optional**
- **Purpose?** Check: **App functionality**

#### D3. App activity — App interactions

- **Collected?** Click: **Yes** — Firebase Analytics logs screen views and feature-tap events (e.g., `app_open`, `qibla_opened`, `mosque_mode_activated`). Prayer records and reflections are NOT included in analytics.
- **Shared?** Click: **Yes** — processed by Google via Firebase Analytics SDK. Not shared for advertising targeting.
- **Ephemeral?** Click: **No**
- **Required or optional?** Click: **Required** — Firebase Analytics is always active; no in-app opt-out is present.
- **Purpose?** Check: **Analytics**

#### D4. App info and performance — Crash logs

- **Collected?** Click: **Yes** — Firebase Crashlytics collects stack traces, device model, OS version, app version, memory state at crash time.
- **Shared?** Click: **Yes** — processed by Google via Firebase Crashlytics. Not shared for advertising.
- **Ephemeral?** Click: **No**
- **Required or optional?** Click: **Required** — crash reporting always active.
- **Purpose?** Check: **App functionality** (crash reporting and stability improvement)

#### D5. App info and performance — Diagnostics

- **Collected?** Click: **Yes** — Firebase Performance Monitoring collects app startup time and in-app trace durations.
- **Shared?** Click: **Yes** — processed by Google. Not shared for advertising.
- **Ephemeral?** Click: **No**
- **Required or optional?** Click: **Required**
- **Purpose?** Check: **App functionality**

#### D6. Device or other IDs — Device or other IDs

- **Collected?** Click: **Yes** — Firebase Analytics SDK auto-assigns a pseudonymous Firebase App Instance ID. The Android Advertising ID is also collected by default by the Firebase Analytics SDK (Google Play Services integration).
- **Shared?** Click: **Yes** — processed by Google Firebase. Not used for ad targeting.
- **Ephemeral?** Click: **No**
- **Required or optional?** Click: **Required** — auto-collected by Firebase SDK.
- **Purpose?** Check: **Analytics**

**Note on Advertising ID:** The KEY FACTS section confirms Ad ID is collected (default Firebase behaviour, no opt-out config present). This must be declared. If you later add `<meta-data android:name="google_analytics_adid_collection_enabled" android:value="false"/>` to the manifest, you can remove this declaration.

---

### Data types NOT collected — confirm these are left blank/unchecked

| Data type | Status | Reason |
|---|---|---|
| Name | Not collected | No account required; onboarding has no name field |
| Email address | Not collected | No account required |
| Phone number | Not collected | No account required |
| Payment info | Not collected at launch | No IAP active at versionCode 57; tick this when IAP ships |
| Health info | Not collected | Prayer records stay on-device only; excluded from Firebase |
| Fitness info | Not collected | Same |
| Messages / emails | Not collected | App has no comms features |
| Web browsing history | Not collected | |
| Search history | Not collected | Dua library search is on-device only |
| Contacts | Not collected | |
| User content (photos/docs) | Not collected | Reflections stored locally, never transmitted |

---

## 4. Content Rating Questionnaire

Navigate: Play Console → your app → **Policy → App content → Content rating**.

Click **Start questionnaire**. Select category: **Utility / Productivity**. Then answer every question:

| Question | Answer | Reason |
|---|---|---|
| Does the app contain or reference any violence? | **No** | No violent content whatsoever |
| Does the app contain references to, descriptions of, or depictions of sexual content or nudity? | **No** | |
| Does the app allow users to interact with each other, post publicly, or upload media? | **No** | No social/community features in v1 |
| Does the app contain or reference real gambling or simulated gambling? | **No** | |
| Does the app contain profanity or crude humour? | **No** | |
| Does the app contain frightening or intense content? | **No** | |
| Does the app simulate a known controlled substance? | **No** | |
| Does the app use the device's camera or microphone in an unexpected way? | **No** | `RECORD_AUDIO` is in `blockedPermissions`; microphone disabled in expo-audio config |
| Does the app collect sensitive user information from children? | **No** | |
| Does the app contain or reference real money transactions? | **No** | No IAP active at v1 launch |
| Does the app contain advertising? | **No** | |

**Expected result after submitting questionnaire:**

- **IARC rating: Everyone (3+)** — all platforms
- **Google Play rating: Everyone**
- The rating certificate will be issued automatically. Download a copy for your records.

---

## 5. Target Audience and Content

Navigate: Play Console → your app → **Policy → App content → Target audience and content**.

| Question | Answer | Click path |
|---|---|---|
| Select the target age groups for your app | **13–17** and **18 and over** | Check both boxes; do NOT check "Under 13 — Younger children" or "Under 13 — Older children" |
| Is the app designed for or likely to attract children under 13? | **No** | |
| Does the app contain any of the following interactive elements that might appeal to children? | **No** | Nothing listed applies — no cute characters, no children's music, no educational content aimed at children |

**Reason for 13+ minimum:** App deals with religious practice intended for adolescents and adults. Content is appropriate for 13+. Selecting "Under 13" would subject the app to COPPA/children's privacy requirements that are not appropriate for this app's data model.

---

## 6. Government and Health Apps Declaration

Navigate: Play Console → your app → **Policy → App content → Government app**.

**Click: This app is NOT a government app → Save.**

No health claims are made. App is not affiliated with any government body.

---

## 7. News App Declaration

Navigate: Play Console → your app → **Policy → App content → News app**.

**Click: This app is NOT a news app → Save.**

Sukoon does not publish news content. The Daily Verse feature is a devotional feature, not journalism.

---

## 8. Financial Features Declaration

Navigate: Play Console → your app → **Policy → App content → Financial features**.

**Click: This app does NOT include financial features → Save.**

No banking, investing, cryptocurrency, loan, or payment facilitation features. No IAP is active at v1 launch.

---

## 9. App Access

Navigate: Play Console → your app → **Store presence → App access**.

**Select: All or most functionality is available without special access → Save.**

**Tester instructions (paste into the "Notes" field):**

```
No account or sign-in is required to use Sukoon. On first launch:

1. Grant Location permission when prompted — select "While using the app".
   (Alternatively tap "Enter city manually" and type your city name.)
2. Confirm the calculation method displayed on the next screen.
3. Grant Notification permission when prompted.
4. On Android 12+: grant "Alarms & reminders" permission via the system
   settings prompt that appears during onboarding — this enables exact-time
   adhan delivery.

All features (prayer times, adhan, Qibla, Mosque Mode, Tuba Tree, adhkar,
tasbih, dua library) are accessible after these permission grants. No
additional login, subscription, or purchase is needed.
```

---

## 10. Ads Declaration

Navigate: Play Console → your app → **Store presence → Store settings** (or the Ads section in Policy).

**Select: This app does NOT contain ads → Save.**

Advertising SDK code exists in the codebase but no ad surface is active in versionCode 57. No ad is shown to users. This declaration is accurate for this release.

---

## 11. Permissions Declaration

Navigate: Play Console → your app → **Policy → App content → Sensitive permissions and APIs**.

For each permission listed, Play Console may prompt for a justification. Paste the corresponding paragraph below.

### SCHEDULE_EXACT_ALARM

```
Sukoon is a Muslim prayer app. The five daily Islamic prayers (Fajr, Dhuhr,
Asr, Maghrib, Isha) have specific, fixed times that vary by location and season.
Missing a prayer by even a few minutes is spiritually significant for observant
Muslims. SCHEDULE_EXACT_ALARM is required to deliver the adhan (call to prayer)
notification at the precise prayer time as calculated for the user's location.
Approximate alarms — which Android may delay by up to 10 or more minutes —
would cause the adhan to arrive after prayer time has already begun. This matches
the alarm-clock use case cited in Android's documentation: scheduling a
time-critical audio event that must fire at an exact moment regardless of device
state. The full adhan audio is also triggered through the AlarmManager, which
requires exact scheduling to honour the Islamic prayer window. Fallback to a
short notification clip occurs gracefully if the user revokes this permission.
```

### FOREGROUND_SERVICE + FOREGROUND_SERVICE_MEDIA_PLAYBACK

```
Playing the full adhan audio when the phone is in a locked, screen-off state
requires a foreground service. The full adhan (approximately 2–3 minutes of
audio) must play to completion regardless of whether the user is actively using
their phone. A foreground service with foregroundServiceType="mediaPlayback" is
the Android-documented method for audio playback that must not be interrupted by
system resource management. FOREGROUND_SERVICE_MEDIA_PLAYBACK is required on
Android 14+ for foreground services that play audio. The service is started only
when an adhan alarm fires, plays the audio, and stops immediately after playback
ends.
```

### ACCESS_FINE_LOCATION and ACCESS_COARSE_LOCATION

```
Sukoon calculates the five daily Islamic prayer times using the user's geographic
coordinates. Prayer times vary significantly with latitude and longitude — even a
difference of 10–15 km can shift prayer times by several minutes, which matters
for fasting (Suhoor cutoff at Fajr, Iftar at Maghrib). Precise location is used
to minimise this margin of error. Coarse location is declared as the fallback
when the user declines precise location. The app also uses location to point the
Qibla compass toward Makkah. Location is used only during active app use
(WhenInUse scope, not background location). The user can alternatively enter a
city manually, in which case GPS is not used at all.
```

### RECEIVE_BOOT_COMPLETED

```
Sukoon schedules prayer notifications up to 7 days in advance using Android's
AlarmManager. When a device restarts, Android clears all AlarmManager alarms.
Without RECEIVE_BOOT_COMPLETED, all scheduled prayer notifications — including
the full adhan audio alarms — would be lost after a reboot, and users would
silently miss prayers until they reopened the app. This permission allows
Sukoon's boot receiver to reschedule prayer notifications after restart, using
cached prayer times stored on-device. No network calls are made during the boot
reschedule. This is the standard pattern documented by Android for alarm-clock
and timer apps that must survive device restarts.
```

### MODIFY_AUDIO_SETTINGS + ACCESS_NOTIFICATION_POLICY

```
Sukoon's Mosque Mode feature automatically silences the phone at iqamah time and
restores normal sound afterward — an opt-in feature the user explicitly configures.
MODIFY_AUDIO_SETTINGS is required for AudioManager.setRingerMode() to switch to
silent mode at iqamah. ACCESS_NOTIFICATION_POLICY is required on Android 6.0+ to
modify the Do Not Disturb policy when DND is already active. Both permissions are
used exclusively for Mosque Mode. The ringer is always restored automatically
after a configurable duration, and the user is notified if the restore fails. The
feature can be disabled at any time in Settings.
```

### WAKE_LOCK

```
When the full adhan audio plays through the AlarmManager foreground service, the
device may be in a screen-off low-power state. A partial wake lock is acquired
for the duration of adhan playback to prevent the CPU and audio subsystem from
sleeping mid-adhan, which would cut off the call to prayer before completion.
The wake lock is held only for the duration of the audio clip and released
immediately after playback ends.
```

---

## 12. Pre-Launch Checklist Before Pressing "Promote to Production"

> **Personal-account closed-testing requirement applies.** See
> `docs/launch/closed-testing-playbook.md` for the full workflow: closed
> track setup, tester recruitment messages, 14-day soak tracking, and
> production-access questionnaire pre-answers. The checklist below
> assumes that playbook is being followed in parallel.

Run through this list in order. Do not promote until every item is checked.

### Bundle and build

- [ ] AAB for versionCode 57 uploaded to **closed testing track** (NOT Internal — see closed-testing playbook §1) via `eas submit --platform android --latest --track <closed-track-id>`
- [ ] Build appears in Play Console → **Testing → Closed testing** with status "Active"
- [ ] Native symbols / mapping file uploaded. In Play Console: **Android vitals → Deobfuscation files** — upload the `mapping.txt` from the EAS build artifacts (download from expo.dev build page)
- [ ] versionCode 57 confirmed in Play Console (Play Console rejects duplicate versionCodes)
- [ ] **Cloudflare edge worker re-deployed** (`cd edge-api && npm run deploy`) — required for the calc-method-by-region fix. Without this, the country_code field won't be returned and the cache will still serve locale-poisoned entries. Already deployed for build 57.

### Store listing

- [ ] App name, short description, full description pasted and saved
- [ ] All 6–8 screenshots uploaded and in the correct slot order
- [ ] Feature graphic (1024×500) uploaded
- [ ] Category set to **Lifestyle**
- [ ] Tags entered
- [ ] Contact email `codifizz@gmail.com` verified as a working inbox (send a test email to yourself)

### Policy forms

- [ ] Privacy policy URL resolves in incognito: `https://dhrubot.github.io/Sukoon/privacy.html`
- [ ] Data Safety form submitted and showing "Submitted" badge (not "Incomplete")
- [ ] Content rating questionnaire completed and IARC certificate issued — rating shows **Everyone**
- [ ] Target audience set to 13–17 and 18+ only
- [ ] Government app: Not a government app — saved
- [ ] News app: Not a news app — saved
- [ ] Financial features: None — saved
- [ ] Ads: App does NOT contain ads — saved
- [ ] App access: All functionality available without sign-in — saved, with tester notes pasted

### Closed soak (mandatory — 14 days minimum, ≥ 12 testers)

> See `docs/launch/closed-testing-playbook.md` for tester recruitment
> and tracking workflow.

- [ ] ≥ 12 testers opted in continuously for **14 consecutive days** (Play Console → Closed testing → Testers shows current enrolled count)
- [ ] Install the closed-track AAB on a real Android device via Play Store (not sideload)
- [ ] Walk the onboarding: location grant → notification grant → exact-alarm grant — **calc method is now auto-selected (no confirm step in build 57)**
- [ ] Wait for one real prayer notification to fire. Confirm adhan plays on USAGE_ALARM stream
- [ ] Confirm Qibla compass renders and points in the correct direction
- [ ] Confirm Settings → Privacy Policy link opens `https://dhrubot.github.io/Sukoon/privacy.html`
- [ ] Confirm Settings → Contact Support opens an email compose to `codifizz@gmail.com`
- [ ] Confirm the app does not crash on the first 10 screens of a fresh install
- [ ] Check Firebase Crashlytics dashboard — no crash spikes from real testers during the 14-day soak
- [ ] **For Dhrubo's personal install in Dhaka:** confirm the one-shot calc-method migration ran on next-boot after installing build 57 — Settings → Prayer should show "Karachi" method, not "MWL"

### Galaxy M21 blocking bugs (from `qa-findings-galaxy-m21.md`)

Before promoting to production, confirm these fixes are in versionCode 57:

- [ ] **Fix 1.1 (DND bypass):** `adb shell dumpsys notification | grep prayer-times-adhan` shows `mBypassDnd=true` on adhan channels (v11 or later). Short adhan plays under DND.
- [ ] **Fix 1.2 (boot reschedule):** After `adb reboot`, `dumpsys alarm | grep -c com.talukders.sukoon` shows ≥180 alarms (not 9). No "Unsafe prayer time quality" errors in logcat.
- [ ] **Fix 2.1 (lock screen):** `dumpsys notification` shows `mLockscreenVisibility=1` (PUBLIC) on prayer channels, not -1000.

If any of the above three are not fixed, **do not promote**. File a new closed-track build and restart the soak.

### Production access application (required after 14-day soak)

- [ ] At Day 14, confirm ≥ 12 testers still enrolled in closed track
- [ ] In Play Console → Dashboard → "Apply for production access", submit the 4-question form using pre-written answers in `closed-testing-playbook.md` §4. Customize tester count and dates to match reality.
- [ ] Wait 2–7 business days for Google's review. Production track unlocks once approved.

---

## 13. Day-0 Monitoring Rota

After pressing "Promote to production" (or after Google completes review and the app goes live), follow this schedule for the first 24 hours.

### Dashboards to monitor

| Dashboard | URL / location | What to watch |
|---|---|---|
| Firebase Crashlytics | console.firebase.google.com → Sukoon project → Crashlytics | Crash-free users rate: alert if it drops below 98%. New issues tab: any crash that hits >5 users in first hour is high-priority. |
| Firebase Analytics | console.firebase.google.com → Sukoon project → Analytics → Events | `app_open` count climbing (install confirmation). `onboarding_completed` vs `app_open` ratio — low ratio = onboarding drop-off problem. |
| Play Console — Android vitals | Play Console → Android vitals → Crashes & ANRs | ANR rate and crash rate by device. New crash clusters in first 6 hours are launch-day regressions. |
| Play Console — Reviews | Play Console → Store presence → Ratings & reviews | First 1-star reviews often describe real crashes or permission confusion. Read all 1–2 star reviews within the first hour of visibility. |
| Play Console — Statistics | Play Console → Statistics | Installs, uninstalls, active devices. An uninstall spike in the first hour = critical UX or crash issue. |
| Firebase Performance | console.firebase.google.com → Performance | App start time: alert if cold start p75 exceeds 3 seconds on a low-end device. |
| Support inbox | codifizz@gmail.com | Any email in the first 24h about notification not firing, adhan not playing, app crashing — treat as a P1 bug report. |

### Monitoring schedule — first 24 hours

| Time after go-live | Action |
|---|---|
| **T+0 (immediately after promote)** | Open Crashlytics, Analytics, and Play Vitals in three browser tabs. Take a baseline screenshot of crash-free rate and install count. |
| **T+30 min** | Refresh all three dashboards. Any new crash issue with >2 affected sessions = investigate immediately. Check support inbox. |
| **T+1 hour** | Refresh. Review the first 1–2 star reviews if any appear. Check `onboarding_completed` event count vs `app_open`. |
| **T+2 hours** | Refresh Crashlytics — this is when the first wave of organic users completes onboarding and triggers notification scheduling. Adhan-related crashes will surface here. |
| **T+4 hours** | Refresh all dashboards. At this point enough timezone coverage exists to see if notification delivery is failing in any region. |
| **T+8 hours** | Full refresh. Check Play Vitals ANR rate. Check if boot-reschedule crash (QA finding 1.2) is manifesting at scale. |
| **T+12 hours** | Midpoint review. If crash-free rate is above 98% and no P0 issues: continue monitoring. If crash-free rate is below 95%: halt rollout immediately via Play Console → Production → Manage release → Halt rollout. |
| **T+24 hours** | Final first-day review. Read all reviews. Check install/uninstall ratio. Check prayer notification ANR (any AlarmManager timeout ANRs in Vitals). Decide on v1.0.1 scope if needed. |

### Halt rollout trigger conditions

Halt immediately (Play Console → Production → Manage release → Halt rollout) if any of the following appear within the first 24 hours:

- Crash-free users rate drops below 95%
- A new crash issue affects >50 users and has no fix ready
- Multiple 1-star reviews describing "app crashes at startup" or "notifications not working"
- ANR rate exceeds 0.5% in Android Vitals
- Support inbox receives >5 distinct users reporting adhan not firing (may indicate the DND bypass bug at scale)

### Escalation contact

- Developer: Dhrubo Talukder — check the git config for commit email
- Support inbox: codifizz@gmail.com (monitor this actively for the first 48h)
- Firebase console access: ensure at least one other person has Firebase project access as backup in case the primary reviewer is unavailable during the monitoring window

---

*End of packet. All copy above is submission-ready. Do not paste this document's headers or section numbers into Play Console — only paste the content inside code blocks or quoted paragraphs.*
