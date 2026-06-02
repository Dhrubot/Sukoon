# Galaxy M21 QA — Findings & Fix Plan

Device: Samsung Galaxy M21 (SM-M215F), Android 12 (API 31), 3GB RAM, 1080×2340.
Date: 2026-06-02. Build: dev (Expo dev client), commit `c58d1c0`.

This is the post-walk audit. Sections:
1. Launch-blocking fixes (do before Play Store)
2. High-priority fixes (do before v1.1)
3. Things never tested (must verify before final cut)
4. Confirmed working
5. Re-test protocol after fixes

---

## 1. Launch-blocking fixes

### 1.1 Adhan channels do not bypass DND
**Symptom:** With Android DND ON, the **2.5 short adhan** test (channel `prayer-times-adhan-v10`) was visually posted but produced **no sound and no vibrate**.
**Root cause:** `dumpsys notification` shows `mBypassDnd=false` on every Sukoon channel including `prayer-times-adhan-v10` and `prayer-times-adhan-silent-v10`.
**Why full adhan still works under DND:** the 2.6/2.75 path plays audio through `AdhanService` → `MediaPlayer` on `USAGE_ALARM`. Alarm stream isn't gated by DND. Only the short channel-sound path fails.
**Fix:**
- File: `src/services/notifications/NotificationChannels.ts`
- Set `bypassDnd: true` on `prayer-times-adhan-v10` and `prayer-times-adhan-silent-v10`. Leave `prayer-times-default-v10` as `false` (per CLAUDE.md the default channel is supposed to honor DND).
- **Bump channel IDs to v11** because Android caches channel config at first create — existing v10 installs won't pick up the new flag.
- Update `CHANNEL_VERSION` constant in `NotificationChannels.ts`.

**Verify after fix:**
```
adb shell dumpsys notification | grep "mId='prayer-times-adhan" -A0 | grep mBypassDnd
# Expect: mBypassDnd=true on both v11 channels
```
Then re-run 2.5 under DND. Audio should play.

### 1.2 Boot reschedule fetches all fail — "Unsafe prayer time quality: invalid"
**Symptom:** After `adb reboot`, the headless `SukoonRescheduleWorker` runs cleanly at the receiver/worker level. But the JS-side rescheduler throws on **every day fetched**:
```
❌ Failed to fetch day 0: Error: Unsafe prayer time quality for notification scheduling: invalid
❌ Failed to fetch day 1: Error: Unsafe prayer time quality for notification scheduling: invalid
... (through day 5+)
```
Result: only **9 of ~200** alarms scheduled post-boot. `dumpsys alarm | grep -c com.talukders.sukoon` went `198 → 65` (foreground refresh on app open brought it back to 214).
**Trace event misleading:** `headless_boot_reschedule_completed { didReschedule: true }` despite zero days successfully scheduled. The success flag should reflect actual count.
**Root cause (hypothesis):** Encrypted MMKV or location store isn't initialized in the headless context when `SukoonRescheduleWorker` invokes the JS task. The quality validator (search source for `"Unsafe prayer time quality"`) rejects null/empty location.
**Fix:**
- Grep: `grep -r "Unsafe prayer time quality" src/`
- Inspect the validator. Two possible directions:
  - **A.** Make `StorageService.initialize()` idempotent and call it at the top of the headless task before any prayer-time fetch.
  - **B.** Cache the last-known-good prayer times for the next 7 days on every foreground refresh, and have the headless task fall back to cache when fresh fetch fails.
- Also fix the trace event:
  - `didReschedule: prayerScheduledCount > 0`
  - Add `expectedCount` and `actualCount` fields so the bug surfaces in observability.

**Verify after fix:**
```
adb reboot
# wait for boot
adb logcat -s SukoonRescheduleWorker:I ReactNativeJS:V | grep -E "headless_boot|Failed to fetch"
adb shell dumpsys alarm | grep -c com.talukders.sukoon  # should match pre-reboot count
```

### 1.3 Mosque Mode trace event misleading
**Symptom:** Even when the boot reschedule failed (only 9 of 200 alarms scheduled), the trace reported `didReschedule: true`.
**Fix:** Same change as 1.2 — make `didReschedule` reflect actual success. Add `partial: true` when count < expected.

---

## 2. High-priority fixes (v1.1)

### 2.1 lockscreenVisibility = -1000 on every channel
**Symptom:** `dumpsys notification` shows `mLockscreenVisibility=-1000` on all v10 channels. Valid Android values are -1 (SECRET), 0 (PRIVATE), 1 (PUBLIC). -1000 is Samsung's "not set" sentinel.
**Impact:** lock-screen rendering falls back to Samsung defaults, which may hide notification body on a locked device.
**Fix:** In `NotificationChannels.ts`, explicitly call `setLockscreenVisibility(NotificationManagerCompat.VISIBILITY_PUBLIC)` on each prayer/adhan channel. Important because the prayer name in the notification body is the whole point.

### 2.2 `mBlockableSystem=false` on every channel
**Symptom:** Users can't disable individual prayer channels from Android Settings → Apps → Sukoon → Notifications.
**Question:** is that intentional? It might violate Play Store policy that requires per-channel user control.
**Action:** confirm intent. If unintentional, remove `setBlockableSystem(false)` calls.

### 2.3 Samsung force-stop wipes alarms
**Status:** Known. OEMBatteryGuidanceCard is the existing mitigation.
**Action:** No code fix — but verify the card stays visible on a fresh install before user dismisses it. Already verified in Block 3.

### 2.4 Notification telemetry shows 0 deliveries
**Symptom:** After ~7 hours with 200 alarms scheduled, `Delivered: 0` and `Tapped: 0`. We never observed a real prayer notification fire because the test window straddled Fajr (which we wiped with force-stop) and Dhuhr was 30 min in the future when testing ended.
**Risk:** the delivery counter might be broken regardless of actual delivery. Or it only updates after the user taps.
**Verify:** wait for a real prayer to fire on the device. Check `Delivered: 1` and `Tap Rate` updates.
**Code path to inspect:** `NotificationLedger.markDelivered()` and whatever invokes it from the receiver.

### 2.5 Live Activity / Persistent Prayer Countdown unverified
**Status:** `sukoon-live-activity` channel exists (`mImportance=2`), but Persistent Prayer Countdown toggle was OFF during the walk. Live activity never observed rendering.
**Verify:** turn on Persistent Prayer Countdown in Settings; lock the phone; expect a persistent notification with countdown.

---

## 3. Things never tested — must verify before final cut

The Block 4 destructive items I skipped, plus deeper paths I didn't reach.

### 3.1 High-latitude prayer-time fallback (Reykjavik 64.13°N)
**Why skipped:** would change user's real location.
**Test protocol (safe):**
- Settings → Location → "Select Manually" → search "Reykjavik"
- Force Reschedule All
- Check all 5 prayers populated, no NaN/Invalid text
- Restore real location via "Update Location"
**Risk if not tested:** users near the poles get crashes or all-zero schedules.

### 3.2 Timezone change recovery (+3h shift)
**Why skipped:** would change device clock.
**Test protocol:**
- Airplane mode → Android Settings → Date & Time → disable "Set automatically"
- Change tz from BDT (UTC+6) to UTC+9
- Open Sukoon, observe home screen
- Run Force Reschedule All
- `adb shell dumpsys alarm | grep -i sukoon` — confirm alarms re-schedule to new wall-clock times
- Restore auto-time after.

### 3.3 DST simulation (+1h jump)
**Why skipped:** would change device clock.
**Test protocol:** same as 3.2 but advance clock 1h forward. The relevant question is: do we get **duplicate** alarms (same prayer scheduled at both old and new times) or **missing** alarms (cancel old, no replace)?
**Code path:** scheduler should use `ZonedDateTime` comparisons, not `Date.now()` arithmetic.

### 3.4 Date rollover at midnight
**Why skipped:** would change clock.
**Test protocol:**
- Auto-time off, clock → 23:57
- Observe home: should show Isha as past, next Fajr as upcoming
- Wait 3 minutes through midnight, observe roll
- PrayerTimesProvider's 60s tick should pick up the new day without manual refresh.
**Code path:** `PrayerTimesProvider.tsx` interval logic.

### 3.5 Habit Builder Tier 2 (persistent reminder after missed prayer)
**Setup:** Settings → Notifications → enable Prayer Reminders → enable Habit Builder.
**Trigger:** schedule a fake "missed" prayer (or wait for one), watch logcat for `pre-prayer-v10` channel notification post-prayer-time.
**Verify:** persistent-urgent-v10 channel also fires after the configured delay.

### 3.6 Habit Builder Tier 3 (grace period warning)
**Setup:** same. Channel: `grace-warning-v10`.
**Trigger:** wait for grace window to elapse without tapping.

### 3.7 Real prayer notification end-to-end
**Status:** `Delivered: 0` for all 200 scheduled. We never saw one fire.
**Test:** wait for an actual prayer to fire (or use Debug "2.6 Test Production Prayer" without DND/lock). Verify:
- Heads-up shows with full prayer name in title and body
- Tap → app opens to home (Prepare for Prayer card)
- `Delivered:` counter increments
- `Tap Rate:` updates

### 3.8 Calculation method change post-onboarding
**Test:** Settings → Calculation Method → switch from MWL to ISNA → observe prayer times shift → Force Reschedule → verify dumpsys alarms updated.

### 3.9 Network failure handling
**Test:** enable airplane mode → kill + relaunch app → expect cached prayer times to show. Edge API fail → Aladhan fallback path. Both unavailable → prayer-times-trust-fallback prompt.

### 3.10 Multiple rapid 2.5 taps (concurrency)
**Test:** tap 2.5 ten times in quick succession. Expect deduped alarms (NotificationLedger should prevent stacking).

### 3.11 Volume-down during full adhan
**Test:** start 2.75, press hardware volume-down. Expect alarm-stream volume slider to appear. Confirm USAGE_ALARM stream wiring.

### 3.12 Audio focus during adhan
**Test scenarios:**
- Play music in another app, then trigger adhan via Debug → expect music to duck/pause
- Receive phone call mid-adhan → expect adhan to pause/stop
- Bluetooth connected → adhan routes to BT, disconnect mid-play

### 3.13 Lock-screen visible body
**Test:** trigger 2.6 → lock → expand lock-screen notifications → confirm full title + body visible (not just app name). Tied to fix 2.1 (`setLockscreenVisibility`).

### 3.14 Notification tap → activity launch
**Test:** real notification → tap → confirm `MainActivity` launches and navigates to relevant screen.

### 3.15 Widget on home screen
**Test:** long-press home → add Sukoon widget → confirm next-prayer name + time render → verify it updates after Force Reschedule.

### 3.16 Mosque Mode "Exact Time" iqamah path
**Status:** we used "Offset" mode. Exact Time has separate scheduling logic.
**Test:** Mosque tab → tap Exact Time tab → set Dhuhr iqamah explicitly → verify schedule re-arms.

### 3.17 Mosque Mode during a real iqamah (not 1-min test)
**Test:** leave Mosque Mode ON, wait for actual prayer iqamah window, observe MOSQUE_MODE_ENABLE/RESTORE alarms fire at real iqamah time (not synthesized).

### 3.18 Hijri date adjustment effect
**Test:** Settings → Hijri Date Adjustment → ±1 day → verify Hijri label on home updates → verify schedule fingerprint MM5 reflects new hijri date.

### 3.19 Multiple notification stacking
**Test:** trigger 5 different test notifications in rapid succession → verify they group on Samsung shade, no duplicates.

### 3.20 Memory leak / long session
**Test:** leave app foregrounded for 24h+, monitor `adb shell dumpsys meminfo com.talukders.sukoon` for growing PSS.

### 3.21 Galaxy S22 diff items (second device)
- Exact alarm auto-grant on Android 13+ (Samsung-specific)
- Full adhan media routing through speaker/earpiece on OneUI 5+
- Doze on S22 hardware
- OEMBatteryGuidanceCard on OneUI 5+
- Performance baseline (8GB RAM vs 3GB on M21)

---

## 4. Confirmed working (do not regress)

- Install + native module registration (RingerModeModule, BootPrefsModule, AdhanModule)
- Calculation method confirm prompt at first launch
- Location permission grant flow + reverse-geocode to Dhaka
- 36 → 200+ scheduled notifications across 10 days × 5 prayers
- FULL_ADHAN_5000–5043 tagged alarms via `tag=*walarm*:com.talukders.sukoon.FULL_ADHAN_NNNN`
- 2.5 short adhan firing at exact 10s with channel-sound + vibrate
- 2.6/2.75 full adhan: `AdhanAlarmReceiver` → `AdhanService` → `MediaPlayer` on `USAGE_ALARM`, foreground service `adhan-foreground-service`, 30s+ playback
- DND access grant flow via system intent
- OEMBatteryGuidanceCard render with Samsung-specific copy
- OEMBatteryGuidanceCard "Open Battery Settings" → `IGNORE_BATTERY_OPTIMIZATION_SETTINGS` intent (Samsung `Settings$HighPowerApplicationsActivity`)
- "Not now" dismissal persisted across force-stop + relaunch (via MMKV `oem_battery_guidance_dismissed_v1`)
- MM1: `MOSQUE_MODE_ENABLE` at T+60s → SILENT; `MOSQUE_MODE_RESTORE` at T+120s → NORMAL (system audio service log confirmed)
- MM2: `MosqueModeService.rearmFromPersistence()` runs, WorkManager success
- MM3: ringer restored from SharedPrefs (SILENT → NORMAL verified)
- MM4: watchdog runs no-op cleanly
- MM5: schedule fingerprint v2 includes location, calc method, channelVersion, hijri date, prayer times array
- Doze pierce: exact alarm fires at +11s under `dumpsys deviceidle force-idle`
- KeepAwake: no redbox/uncaught during rapid Mosque ↔ Pray navigation
- Boot recovery chain at the receiver/worker level: `SukoonBootReceiver` → enqueue → `SukoonRescheduleWorker` → headless JS task → trace events
- `RingerModeBootReceiver` correctly skips re-arm when no active mosque mode
- Foreground reschedule on app open recovers full alarm count
- 6-hour background idle did not break prayer-time display or live tick
- App self-recovers after Metro dev-server disconnect via `adb reverse tcp:8081`

---

## 5. Re-test protocol after fixes

After applying fixes 1.1, 1.2, 1.3, and 2.1:

1. **Bump channel version** in `NotificationChannels.ts` (v10 → v11) so existing installs adopt the new bypassDnd config.
2. Build + reinstall on Galaxy M21.
3. Re-run sections **Block 2 → DND** (verify 2.5 produces sound under DND).
4. Re-run **Block 5** (reboot, verify dumpsys alarm count matches pre-reboot, no "Unsafe prayer time quality" errors).
5. Run sections **3.1–3.4** with safe location/time changes.
6. Run sections **3.5–3.6** for Habit Builder.
7. Run section **3.7** (wait for real prayer to fire — pick Dhuhr or Asr).
8. Sweep sections **3.8–3.18** before final cut.
9. Repeat **3.21** on Galaxy S22.

After all that passes — submit to Play internal track first, not direct production.
