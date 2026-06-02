# adb logcat cheat sheet — Sukoon Android QA

Companion to `docs/launch/android-qa-walk.md`. Use this to read signal off the
device during testing.

## Important note on JS-side tags

Sukoon's JS logger (`src/utils/logger`) maps to `console.log/warn/error`. In
dev builds (`__DEV__=true`) all levels are active; in release only `error`
fires (sanitized). All JS output appears under the `ReactNativeJS` logcat
tag (Hermes/Metro bridge). The bracket prefixes shown below are
**message-level text tokens** inside that tag, not separate adb tags — filter
with `grep`.

---

## One-liner: tail all Sukoon-relevant lines

```bash
adb logcat -v time \
  ReactNativeJS:D \
  AdhanService:D AdhanAlarmReceiver:D AdhanModule:D \
  MosqueModeReceiver:D RingerModeBootReceiver:D RingerModeModule:W \
  SukoonBootReceiver:I SukoonRescheduleWorker:I \
  AlarmManager:W NotificationManagerService:W \
  ForegroundServiceController:W AudioManager:W \
  DeviceIdleController:W PowerManagerService:W \
  *:S 2>/dev/null
```

Narrow further with grep:
`| grep -E 'MosqueMode|Adhan|BootTask|NotificationTrace|ScheduleLock|OEMOptimiz'`

---

## Per-feature filters

### Notifications scheduling + fingerprint

- **logcat tag:** `ReactNativeJS`
- **Tokens to grep:** `NotificationService`, `NotificationTrace`,
  `ScheduleLock`, `boot/diskOnly`, `Pass 1`, `Pass 2`, `reconcile`
- **System tags:** `AlarmManager`, `NotificationManagerService`
- **Good signal:**
  - `📢 Pass 1: Scheduling Tier 1 (Adhan) for N days...`
  - `🔔 Pass 2: Scheduling pre-prayer for N days...`
  - `✅ NotificationService initialized`
  - `[NotificationTrace] {"event":"schedule_completed","fields":{"prayerScheduledCount":N,...}}`
  - `[NotificationTrace] {"event":"reconcile_check_triggered",...}`
- **Bad signal:**
  - `❌ No future main prayer notifications were scheduled or repaired`
  - `❌ Extended scheduling failed:` / `❌ Reschedule failed:`
  - `⚠️ ScheduleLock: BootPrefsModule.acquireScheduleLock unavailable`
  - `⚠️ ScheduleLock: Android native acquire failed`
  - `[NotificationTrace] schedule_failed_no_main_prayers`
  - `[NotificationTrace] reconcile_skipped no_valid_location`
  - `SecurityException: SCHEDULE_EXACT_ALARM` (from AlarmManager tag)
- **Command:**

```bash
adb logcat -v time ReactNativeJS:D AlarmManager:W NotificationManagerService:W *:S 2>/dev/null \
  | grep -E 'Pass [1-6]|NotificationTrace|ScheduleLock|reconcile|schedule_|✅ Notification|❌'
```

---

### Adhan audio (short + full)

- **logcat tag:** `ReactNativeJS`
- **JS tokens:** `AdhanPlayer`, `AdhanPlaybackPolicy`, `FullAdhanScheduler`
- **Native tags:** `AdhanService`, `AdhanAlarmReceiver`, `AdhanModule`
- **System tags:** `AudioManager`, `ForegroundServiceController`
- **Good signal (native full adhan):**
  - `AdhanAlarmReceiver: Adhan alarm fired for: Fajr (sound=adhan_fajr)`
  - `AdhanService: Full Adhan playback started` / `... completed`
  - `AdhanModule: Scheduled full adhan for Fajr at <ts> (rc=N)`
- **Good signal (JS foreground):**
  - `🔊 Playing full Adhan in foreground`
- **Bad signal:**
  - `AdhanService: Failed to enter foreground mode:` ↔
    `did not call startForeground in time`
  - `AdhanService: <sound> resource not found in res/raw` — withPlatformSounds
    plugin didn't copy
  - `AdhanService: MediaPlayer.create returned null` — audio focus / DRM
  - `AdhanService: MediaPlayer error: what=...`
  - `AdhanModule: Exact alarm not permitted, using inexact for <prayer>` —
    will drift
  - `❌ Failed to schedule Adhan audio for <prayer>:`
  - `❌ Error playing Adhan:`
  - `⚠️ Failed to set audio mode:` (foreground path)
- **Command:**

```bash
adb logcat -v time \
  ReactNativeJS:D AdhanService:D AdhanAlarmReceiver:D AdhanModule:D \
  AudioManager:W ForegroundServiceController:W *:S 2>/dev/null \
  | grep -E 'Adhan|adhan|AdhanPlayer|foreground mode|playback|MediaPlayer'
```

---

### Mosque Mode (foreground service + ringer)

- **logcat tag:** `ReactNativeJS`
- **JS tokens:** `MosqueModeService`, `MosqueModeWatchdog`,
  `RingerControlService`
- **Native tags:** `MosqueModeReceiver`, `RingerModeModule`
- **System tags:** `ForegroundServiceController`, `AudioManager`
- **Good signal:**
  - `MosqueModeReceiver: Received action=ENABLE mode=SILENT` →
    `Ringer mode set to SILENT`
  - `MosqueModeReceiver: Received action=RESTORE mode=NORMAL` →
    `Ringer mode set to NORMAL`
  - `🔇 SILENT mode enabled for <prayer> iqamah`
  - `🔊 Ringer restored to NORMAL`
  - `[MosqueModeService] Boot: MMKV state reconciled from SharedPreferences`
- **Bad signal:**
  - `MosqueModeReceiver: SecurityException - missing DND permission:`
  - `MosqueModeReceiver: DND policy access not granted, cannot change ringer
    mode`
  - `RingerModeModule: Exact alarm permission not granted, using inexact
    alarm` — restore may be late
  - `❌ Failed to schedule mosque mode:`
  - `⚠️ Mosque mode could not be scheduled (missing DND access?)`
  - `ForegroundServiceController: did not call startForeground in time`
    (Samsung aggressive OEM kill)
  - `[MosqueModeWatchdog] Restore alarm missed — auto-restoring ringer` —
    native alarm killed, watchdog saved it
- **Command:**

```bash
adb logcat -v time \
  ReactNativeJS:D MosqueModeReceiver:D RingerModeModule:W \
  ForegroundServiceController:W AudioManager:W *:S 2>/dev/null \
  | grep -E 'MosqueMode|Mosque|Ringer|ringer|SILENT|RESTORE|DND|foreground'
```

---

### Boot recovery

- **logcat tag:** `ReactNativeJS`
- **JS tokens:** `BootTask`, `MosqueModeService`, `NotificationTrace`
- **Native tags:** `SukoonBootReceiver`, `SukoonRescheduleWorker`,
  `RingerModeBootReceiver`
- **System tags:** `AlarmManager`, `JobScheduler` (WorkManager underlying)
- **Good signal:**
  - `SukoonBootReceiver: Device rebooted — enqueuing notification reschedule`
  - `SukoonRescheduleWorker: Setting reschedule flag and starting headless
    boot reschedule`
  - `[NotificationTrace] headless_boot_reschedule_started`
  - `[NotificationTrace] headless_boot_reschedule_completed
    didReschedule:true`
  - `[MosqueModeService] Boot: iqamah in future — AlarmManager re-arm
    handled by native boot receiver for <prayer>`
  - `RingerModeBootReceiver: BOOT_COMPLETED received — checking mosque mode
    state`
  - `RingerModeBootReceiver: Boot during active silence window — re-applying
    SILENT and re-arming RESTORE alarm`
- **Bad signal:**
  - `SukoonBootReceiver: Failed to enqueue reschedule work`
  - `SukoonRescheduleWorker: Failed to set reschedule flag`
  - `[NotificationTrace] headless_boot_reschedule_failed`
  - `[BootTask] MosqueMode rearmFromPersistence failed:`
  - `[MosqueModeService] rearmFromPersistence: incomplete SP state, clearing`
  - `RingerModeBootReceiver: Incomplete mosque prefs — clearing state`
  - `RingerModeBootReceiver: DND permission not granted — cannot apply ringer
    mode`
- **Command:**

```bash
adb logcat -v time \
  ReactNativeJS:D SukoonBootReceiver:I SukoonRescheduleWorker:I \
  RingerModeBootReceiver:D AlarmManager:W *:S 2>/dev/null \
  | grep -E 'BootTask|rearm|rescheduled|BOOT|headless_boot|MosqueModeService.*Boot'
```

---

### OEM battery optimization

- **logcat tag:** `ReactNativeJS`
- **JS token:** `OEMOptimization`
- **System tags:** `PowerManagerService`, `BatteryStats`
- **Good signal:** Settings screen appears on device (no logcat output on the
  success path — the call is silent).
- **Bad signal:**
  - `[OEMOptimization] IGNORE_BATTERY_OPTIMIZATION_SETTINGS intent failed,
    falling back to app settings:` — deep-link blocked; fallback to generic
    Settings should still work
  - `[OEMOptimization] openSettings fallback failed:` — both failed; user
    must navigate manually
- **Command:**

```bash
adb logcat -v time ReactNativeJS:D PowerManagerService:W *:S 2>/dev/null \
  | grep -E 'OEMOptimiz|battery|Battery|PowerManager'
```

---

### Doze / standby (Samsung-specific hardening)

Force commands (with screen off, unplugged):

```bash
adb shell dumpsys deviceidle force-idle        # Enter Doze immediately
adb shell dumpsys deviceidle unforce           # Exit Doze
adb shell dumpsys deviceidle step              # Advance Doze state one step
adb shell dumpsys battery unplug               # Simulate unplugged
adb shell dumpsys battery reset                # Restore battery state
```

- **Watch tags:** `DeviceIdleController`, `AlarmManager`, `ReactNativeJS`
- **Expected on Samsung:** Tier 1 prayer notifications still fire — `AdhanModule`
  uses `AlarmManager.setAlarmClock()` (RTC_WAKEUP, Doze-exempt).
  `SukoonBootReceiver` must NOT be blocked by Samsung's Auto-start restriction
  (Settings → Apps → Sukoon → Battery → Allow background activity).
- **Bad signal during Doze test:** Notification >5 min late, or `AlarmManager`
  log shows alarm converted from exact → inexact (SCHEDULE_EXACT_ALARM
  revoked).

---

## Quick observability commands

```bash
# Scheduled Expo notifications + channel config
adb shell dumpsys notification | grep -A5 com.talukders.sukoon

# AlarmManager entries (prayer + mosque mode alarms)
adb shell dumpsys alarm | grep -A3 com.talukders.sukoon

# WorkManager / JobScheduler (boot reschedule worker)
adb shell dumpsys jobscheduler | grep -A5 com.talukders.sukoon

# Active media sessions (adhan foreground audio)
adb shell dumpsys media_session

# Exact alarm permission status
adb shell dumpsys alarm | grep -A2 SCHEDULE_EXACT_ALARM

# DND / notification policy access (Mosque Mode needs this)
adb shell cmd notification get-zen-mode-config

# Battery whitelist (Samsung: should be 0 / "unrestricted" for reliability)
adb shell dumpsys deviceidle whitelist | grep sukoon

# Simulate boot broadcast — safe; triggers SukoonBootReceiver headless task
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED \
  -p com.talukders.sukoon --receiver-include-background
```

NotificationTrace is enabled by default in dev — see
`EXPO_PUBLIC_NOTIFICATION_TRACE_ENABLED` in `.env`.

---

## Tag reference summary

| Layer | logcat TAG | Source |
|---|---|---|
| All JS logs | `ReactNativeJS` | `src/utils/logger.ts` (Hermes) |
| Notification trace | `ReactNativeJS` + `[NotificationTrace]` | `src/services/NotificationTraceService.ts` |
| Full adhan service | `AdhanService` | `plugins/withFullAdhan.js` |
| Full adhan alarm | `AdhanAlarmReceiver` | `plugins/withFullAdhan.js` |
| Full adhan JS bridge | `AdhanModule` | `plugins/withFullAdhan.js` |
| Ringer mode receiver | `MosqueModeReceiver` | `plugins/withRingerMode.js` |
| Ringer mode boot | `RingerModeBootReceiver` | `plugins/withRingerMode.js` |
| Ringer RN module | `RingerModeModule` (warn) | `plugins/withRingerMode.js` |
| Boot headless task | `SukoonBootReceiver` + `SukoonRescheduleWorker` | `plugins/withBootReceiver.js` |
| MosqueModeService (JS) | `ReactNativeJS` + `[MosqueModeService]` | `src/services/MosqueModeService.ts` |
| OEM battery (JS) | `ReactNativeJS` + `[OEMOptimization]` | `src/services/OEMOptimizationService.ts` |
| ScheduleLock (JS) | `ReactNativeJS` + `ScheduleLock` | `src/services/notifications/ScheduleLock.ts` |
