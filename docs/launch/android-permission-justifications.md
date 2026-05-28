# Sukoon — Android Permission Justifications

**Prepared:** May 28, 2026  
**For:** Google Play Console — "Permissions declarations" form  
**Source:** `app.config.js` (declared permissions + blocked permissions), `plugins/withFullAdhan.js`, `plugins/withRingerMode.js`, `plugins/withBootReceiver.js`

These paragraphs are ready to paste into the Play Console permission declaration form for each sensitive permission.

---

## Declared in `app.config.js`

### `SCHEDULE_EXACT_ALARM`

**Play Console justification text:**

> Sukoon is a Muslim prayer app. The five daily Islamic prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) have specific, fixed times that vary by location and season. Missing a prayer by even a few minutes is spiritually significant for observant Muslims. The `SCHEDULE_EXACT_ALARM` permission is required to schedule the adhan (call to prayer) notification at the precise prayer time as calculated for the user's location. Approximate alarms — which Android may delay by up to 10 or more minutes — would cause the adhan to arrive after prayer time has already begun, defeating the core purpose of the app. This matches the alarm-clock use case explicitly cited in Android's documentation for this permission: scheduling a time-critical audio event that must fire at an exact moment regardless of device state. The full adhan audio is also triggered through the AlarmManager, which requires exact scheduling to honour the Islamic prayer window.

**Code evidence:** `src/services/notifications/FullAdhanScheduler.ts`, `src/services/notifications/AdhanPlaybackPolicy.ts`, `plugins/withFullAdhan.js`, `plugins/withRingerMode.js` (also adds this permission).

**Note on `USE_EXACT_ALARM`:** `app.config.js` places `android.permission.USE_EXACT_ALARM` in `blockedPermissions`, which intentionally prevents it from being added to the manifest. `USE_EXACT_ALARM` (Android 13+, API 33+) is granted automatically without user approval for a narrower set of use cases (primarily alarm clocks and calendar apps). Using `SCHEDULE_EXACT_ALARM` instead requires user approval on Android 12+ but also allows the permission to be revoked — and Sukoon handles the revocation gracefully by falling back to a short notification clip (`AdhanPlaybackPolicy.ts`). The choice of `SCHEDULE_EXACT_ALARM` over `USE_EXACT_ALARM` is intentional and correctly reflects the permission lifecycle.

**CONFLICT TO RESOLVE:** `plugins/withRingerMode.js` (lines 610–626) also programmatically adds `android.permission.USE_EXACT_ALARM` to the manifest. This conflicts with `app.config.js`'s `blockedPermissions` entry for `USE_EXACT_ALARM`. After `expo prebuild`, it is possible that `USE_EXACT_ALARM` ends up in the final manifest despite the block. **An engineer must run `expo prebuild` and inspect the generated `AndroidManifest.xml` to confirm which permission(s) are actually present.** If `USE_EXACT_ALARM` appears, the `withRingerMode.js` plugin must be corrected to not add it, since `app.config.js` explicitly blocks it.

---

### `RECEIVE_BOOT_COMPLETED`

**Play Console justification text:**

> Sukoon schedules prayer notifications up to 7 days in advance using Android's AlarmManager. When a device restarts, Android clears all AlarmManager alarms. Without `RECEIVE_BOOT_COMPLETED`, all scheduled prayer notifications — including the full adhan audio alarms — would be lost after a reboot, and users would silently miss prayers until they opened the app again. This permission allows Sukoon's boot receiver to reschedule prayer notifications after the device restarts, restoring exactly the same notification schedule that was in place before the reboot. No network calls are made during the boot reschedule — the app uses cached prayer times stored on-device. This is the standard pattern documented by Android for "alarm clock and timer" apps that must survive device restarts.

**Code evidence:** `plugins/withBootReceiver.js` (declares `BootReceiver`), `src/tasks/notificationBootRescheduleTask.ts` (runs the rescheduling task using cached prayer times).

---

### `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`

**Play Console justification text:**

> Sukoon calculates the five daily Islamic prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) using the user's geographic coordinates. Prayer times vary significantly with latitude and longitude — even a difference of 10–15 km can shift prayer times by several minutes, which matters for fasting (Suhoor cutoff at Fajr, Iftar at Maghrib) and for mosque attendance. Precise location (`ACCESS_FINE_LOCATION`) is used to minimise this margin of error. Coarse location (`ACCESS_COARSE_LOCATION`) is declared as the fallback when the user declines precise location. The app also uses the location to point the Qibla compass toward Makkah. Location is used only when the user is actively using the app (`WhenInUse` scope, not background location). The user can alternatively enter a city manually, in which case GPS is not used at all.

**Code evidence:** `app.config.js` iOS `NSLocationWhenInUseUsageDescription`, Android `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` in `permissions`. `src/services/PrayerTimeService.ts` — coordinates are passed to the prayer-time API fetch function.

---

### `POST_NOTIFICATIONS`

**Play Console justification text:**

> Prayer notifications are the primary function of Sukoon. The app notifies users at the time of each of the five daily prayers and, optionally, before each prayer as a preparation reminder. Without notification permission, users would receive no call to prayer. The `POST_NOTIFICATIONS` permission is declared for Android 13+ (API 33+) as required by the platform; on earlier versions, notification permission is implicitly granted. The app requests this permission during onboarding and explains clearly why it is needed.

**Code evidence:** `app.config.js` `android.permissions` list. `src/services/NotificationService.ts` — notifications are scheduled for each prayer.

---

### `VIBRATE`

**Play Console justification text:**

> Sukoon's Tasbih (dhikr counter) feature provides haptic feedback on completion of each count cycle. Prayer notifications also include vibration as part of the standard Android notification pattern. `VIBRATE` is a normal (non-dangerous) permission that does not require user approval; it is declared in the manifest as required by some Android versions when vibration is used by the app.

**Code evidence:** `app.config.js` `android.permissions` list. `src/screens/Tasbih/TasbihScreen.tsx` uses haptic feedback. Standard notification vibration via expo-notifications.

---

### `WAKE_LOCK`

**Play Console justification text:**

> When the full adhan audio plays on Android via the AlarmManager foreground service, the device may be in a screen-off or low-power state. A `WAKE_LOCK` is acquired for the duration of the adhan playback to prevent the CPU and audio subsystem from sleeping mid-adhan, which would cause the audio to cut off before the call to prayer is complete. The wake lock is held only for the duration of the audio clip and released immediately after playback ends. This is the standard approach for audio-alarm apps that must play audio when the device screen is off.

**Code evidence:** `plugins/withFullAdhan.js` (line 80: `PowerManager.PARTIAL_WAKE_LOCK`; line 572: `addPermission('android.permission.WAKE_LOCK')`). The native `AdhanAlarmService` acquires and releases the wake lock around audio playback.

---

### `ACCESS_NOTIFICATION_POLICY`

**Play Console justification text:**

> Sukoon's Mosque Mode feature allows users to automatically silence their phone at iqamah time (the time prayer begins in the mosque) and restore normal sound after a configurable duration. On Android 6.0 (API 23) and later, modifying the Do Not Disturb policy — including switching to silent mode when DND is active — requires the `ACCESS_NOTIFICATION_POLICY` permission. Without this permission, Mosque Mode cannot silence the phone when Do Not Disturb is already enabled. The permission is used only when the user has explicitly enabled Mosque Mode for a specific prayer and the scheduled iqamah time arrives. The ringer is always restored automatically after prayer, and the app notifies the user if the restore fails.

**Code evidence:** `plugins/withRingerMode.js` adds `ACCESS_NOTIFICATION_POLICY`. `src/services/MosqueModeService.ts`, `src/services/RingerControlService.ts` — the native module checks DND access before attempting to change the ringer mode.

---

### `MODIFY_AUDIO_SETTINGS`

**Play Console justification text:**

> Sukoon's Mosque Mode feature programmatically adjusts the device ringer mode to silent or vibrate at iqamah time. `MODIFY_AUDIO_SETTINGS` is required for the `AudioManager.setRingerMode()` call that performs this adjustment. The permission is used exclusively for Mosque Mode — an opt-in feature where the user has explicitly set up their mosque's iqamah time and consented to automatic phone silencing. The ringer is restored to its previous state (normal or vibrate) after a configurable duration (default 10 minutes), and the user is notified if the restore does not complete. The feature can be disabled at any time in Settings.

**Code evidence:** `plugins/withRingerMode.js` adds `MODIFY_AUDIO_SETTINGS`. The native `RingerModeModule.java` (injected by the plugin) calls `audioManager.setRingerMode()`.

---

## Added by Plugins (Not Listed in `app.config.js` Directly)

### `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK`

**Declared by:** `plugins/withFullAdhan.js` (lines 570–571).

**Play Console justification text:**

> On Android, playing the full adhan audio when the phone is in a locked, screen-off state requires a foreground service. The full adhan (approximately 2–3 minutes of audio) must play to completion regardless of whether the user is actively using their phone. A foreground service with `foregroundServiceType="mediaPlayback"` is the Android-documented method for audio playback that must not be interrupted by system resource management. `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK` declare this service's intent to Android. On Android 14 (API 34) and later, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` is required specifically for foreground services that play audio. The service is started only when an adhan alarm fires, plays the audio, and stops immediately after playback ends.

**Code evidence:** `plugins/withFullAdhan.js` line 107: `ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK`; lines 570–572: `addPermission` calls; line 592: `android:foregroundServiceType="mediaPlayback"` on the service entry.

---

## Permissions in `blockedPermissions` — Confirmed Intentional

The following permissions are in `app.config.js` `android.blockedPermissions`:

| Permission | Why blocked |
|---|---|
| `android.permission.RECORD_AUDIO` | Sukoon has no audio recording feature. `expo-audio` is configured with `microphonePermission: false` and `recordAudioAndroid: false`. Blocking prevents it from appearing in the manifest. |
| `android.permission.READ_EXTERNAL_STORAGE` | Sukoon does not read files from external storage. All data is in app-private MMKV storage. Blocked to prevent unnecessary declarations. |
| `android.permission.WRITE_EXTERNAL_STORAGE` | Same reason as `READ_EXTERNAL_STORAGE`. The JSON export feature saves to app-private storage, not external storage. |
| `android.permission.SYSTEM_ALERT_WINDOW` | Sukoon has no overlay UI feature. Blocked to prevent it being added by a transitive dependency. |
| `android.permission.USE_EXACT_ALARM` | See the `SCHEDULE_EXACT_ALARM` entry above. `SCHEDULE_EXACT_ALARM` is used instead because it requires explicit user approval and Sukoon handles the revocation gracefully. **CONFLICT:** `plugins/withRingerMode.js` also adds `USE_EXACT_ALARM` programmatically — this may override the block after `expo prebuild`. Must verify the final manifest. |

---

## Permissions Requiring Post-Prebuild Verification

Before submitting to Google Play, run `npx expo prebuild --clean` and inspect `android/app/src/main/AndroidManifest.xml` to confirm:

1. `SCHEDULE_EXACT_ALARM` is present.
2. `USE_EXACT_ALARM` is **absent** (if the `withRingerMode.js` conflict is resolved) or present with a justified reason (if kept).
3. `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK` are present.
4. `android:foregroundServiceType="mediaPlayback"` is on the `AdhanAlarmService` declaration.
5. `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` are all absent.

Run: `grep -E "permission|foregroundServiceType" android/app/src/main/AndroidManifest.xml` to produce a quick audit.
