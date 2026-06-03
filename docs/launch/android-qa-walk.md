# Android QA Walk — Sukoon

Pre-Play-Store hardening walk. Run on a **low-end Samsung first**, then Galaxy
S22 as the second pass. Total target: ~45 min + 10 min S22 diff.

Install command (user-driven):

```bash
npx expo run:android --device
```

Companion docs:
- `docs/launch/android-logcat-cheatsheet.md` — adb tags & dump commands
- `docs/launch/ios-free-signing.md` — iOS sideload (after Android ships)

---

## Block 0 — Install & first-launch (~5 min)

- [ ] Run `npx expo run:android --device` and confirm the build completes
      without native module errors; watch Metro for any
      `RingerModeModule not available` or `BootPrefsModule` registration
      warnings.
      **PASS:** App opens to the home screen (prayer times or location prompt);
      no red-screen crash.

- [ ] Confirm these native modules register. In a second terminal:
      `adb logcat -s ReactNative | grep -E "(RingerModeModule|BootPrefsModule|AdhanModule)"`.
      **PASS:** All three names appear within 10 seconds of launch; no
      "module not found" errors.

- [ ] Confirm `__DEV__` mode: Settings → scroll to bottom — Notification
      Debugger section and "Connection Status" block should be visible.
      **PASS:** Debug sections render below "About". If absent, the build is
      release/production and MM1–MM5 shortcuts won't appear.

- [ ] First-launch calculation method confirm prompt may appear (from the
      "Prayer-time trust fallback" commit). Pick a method.
      **PASS:** Prayer times load and next-prayer name + time shows on home
      within ~5 seconds.

---

## Block 1 — Permissions & onboarding (~5 min)

- [ ] Grant location. Settings → Location: confirm displayed city / coords are
      plausible.
      **PASS:** Correct city; 5 fard prayers listed with non-zero times.

- [ ] Settings → Notification toggle → grant OS permission.
      **PASS:** Debug screen Device Info row "Permission" → `granted`.

- [ ] Android 12+: Debug screen → "4.5 Open Exact Alarm Settings" → enable.
      **PASS:** Debug Device Info row "Exact Alarm Status" → `granted`.

- [ ] Grant DND / Notification Policy access for Mosque Mode (prompt should
      fire; otherwise Android Settings → Special app access → Do Not Disturb).
      **PASS:** `adb shell dumpsys notification | grep -A2 "com.talukders.sukoon"`
      shows `zen_access=true`, or Mosque Mode toggle activates without error.

---

## Block 2 — Prayer notifications (~10 min)

**Schedule + fire**

- [ ] Debug screen → "5. Force Reschedule All" → "7. View All Scheduled".
      **PASS:** ≥5 notifications, each with a prayer name in title and a
      future trigger time.

- [ ] `adb shell dumpsys alarm | grep -i sukoon`.
      **PASS:** At least one `com.talukders.sukoon` alarm entry visible.

**Short adhan (channel-sound fallback)**

- [ ] Temporarily revoke "Alarms & reminders" → Debug → "2.5 Test 10-Second
      Adhan" → lock phone. Re-grant after.
      **PASS:** Notification + short adhan via channel-sound fires at 10s.

- [ ] With exact-alarm re-granted, tap "2.5 Test 10-Second Adhan" → lock.
      **PASS:** Fires; channel id should be `prayer-times-adhan-silent-v*`
      (the silent channel — audio comes from native foreground service).

**Full adhan (native foreground service)**

- [ ] Settings → enable Full Adhan. Debug → "2.75 Test Full Adhan (Lock
      Screen)" → lock within 3 seconds.
      **PASS:** At ~10s, full adhan plays while locked; audio continues ≥30s;
      visible notification in status bar.

- [ ] While playing, press hardware volume-down.
      **PASS:** Volume decreases — confirms USAGE_ALARM stream.

- [ ] Debug → "3. Test Adhan Sound" then "3. Stop Adhan". Navigate away.
      **PASS:** Audio stops on tap-stop and on screen-exit cleanup; no leak.

**Channel config**

- [ ] Debug → "8. Check Android Channels".
      **PASS:** Alert lists `prayer-times-adhan-*`, `prayer-times-adhan-silent-*`,
      `prayer-times-default-*`, `prayer-preparation-*`,
      `prayer-follow-up-urgent-*`. No stale `v1`/`v2`.

- [ ] Android Settings → Apps → Sukoon → Notifications → "Prayer Times
      (Adhan)" channel.
      **PASS:** Importance High; "Override Do Not Disturb" enabled (matches
      `bypassDnd: true` / `AndroidImportance.HIGH` in NotificationChannels.ts).

**Lock screen**

- [ ] Debug → "2.6 Test Production Prayer" → lock.
      **PASS:** Notification appears on Samsung lock screen with full title +
      body; tap unlocks to app.

**DND / Focus**

- [ ] Enable Android DND. "2.6 Test Production Prayer" → lock.
      **PASS:** `prayer-times-default` channel (bypassDnd=false) suppresses.

- [ ] DND still on. "2.5 Test 10-Second Adhan" → lock.
      **PASS:** Short-adhan channel (bypassDnd=true) appears and plays under
      DND. Disable DND after.

**Habit Builder (Tier 2/3)**

- [ ] Settings → Notifications → Prayer reminders ON. Run "Force Reschedule
      All". Inspect "View All Scheduled".
      **PASS:** Entries with channel ids `prayer-preparation-*` or
      `grace-period-warnings-*` present alongside main prayer entries.

---

## Block 3 — Mosque Mode (~10 min)

**Enable**

- [ ] Mosque Mode tab → toggle ON.
      **PASS:** Status component updates; device does NOT immediately silence
      (silence is scheduled per iqamah); no crash.

**OEMBatteryGuidanceCard**

- [ ] Scroll to top of Mosque Mode screen (above IQAMAH TIMES).
      **PASS:** Card visible with heading "Improve reliability on Samsung"
      (OEMOptimizationService detects Samsung). Two buttons: "Open Battery
      Settings", "Not now".

- [ ] Tap "Open Battery Settings".
      **PASS:** Android's Battery optimization list opens; no crash.

- [ ] Tap "Not now". Force-kill app, relaunch.
      **PASS:** Card stays hidden after relaunch (dismissal persisted via
      MMKV key `oem_battery_guidance_dismissed_v1`).

**MM1 — 1-min test silence**

- [ ] Debug → "Mosque Mode & Boot Recovery" → "MM1. Test Mosque Mode (1-min)".
      Phone face-up, wait ~60 s.
      **PASS:** At ~1 min, ringer → SILENT. At ~2 min, ringer restores. Logcat
      shows `[MosqueModeService]` arm/disarm entries.

**MM2 — Force boot recovery (no reboot)**

- [ ] Debug → "MM2. Force Boot Recovery (rearm)".
      **PASS:** "Boot Recovery Ran" alert with no error; NotificationTrace
      shows new `headless_boot_reschedule_*` or rearm event.

**MM3 — Manual ringer restore**

- [ ] Set phone to silent via hardware. Debug → "MM3. Manually Restore Ringer".
      **PASS:** Alert appears; if Mosque Mode had stored a `restore_mode`,
      ringer restores to it. Else "No Action Taken".

**MM4 — Watchdog**

- [ ] Debug → "MM4. Run Foreground Watchdog".
      **PASS:** "Watchdog Result" alert with outcome string (`no_action`,
      `restored`, `not_in_mosque_mode`); trace entry appears; no crash.

**MM5 — Fingerprint v2**

- [ ] Debug → "MM5. Show Schedule Fingerprint (v2)".
      **PASS:** Alert shows non-empty string. Change notification settings,
      re-tap — string differs.

---

## Block 4 — Edge cases (~10 min)

- [ ] **High latitude.** Settings → Location → set Reykjavik 64.13°N -21.94°W.
      Debug → Force Reschedule All. Check prayer list.
      **PASS:** All 5 prayer times present, non-null; no NaN/Invalid in UI.
      Restore real location after.

- [ ] **Timezone change.** Airplane mode → Android Settings → disable "Set
      automatically" → change tz +3 h. Return to Sukoon.
      **PASS:** Times update within one 60-s tick or after Force Reschedule;
      no stale clock display.

- [ ] **DST sim.** Auto-time OFF → advance clock +1 h. Force Reschedule All.
      `adb shell dumpsys alarm | grep -i sukoon`.
      **PASS:** New alarms at shifted times; no duplicates for same prayer;
      trace shows fresh `schedule_completed`.

- [ ] **Date rollover.** Set clock to 23:57, observe at 23:58 and midnight.
      **PASS:** Home rolls to next day without manual refresh (driven by the
      60-s tick in PrayerTimesProvider). Restore auto-time.

- [ ] **Doze.** Schedule a near-future notification via "2. Test 10-Second
      Delay". Run `adb shell dumpsys deviceidle force-idle`. Wait for fire.
      **PASS:** Notification delivers despite Doze (exact alarms pierce on
      Android 12+). Run `dumpsys deviceidle unforce` after.

- [ ] **Background idle.** Background app 5+ min, return.
      **PASS:** Times and next-prayer still current; no stale data; no crash.

- [ ] **KeepAwake redbox.** Open Mosque Mode screen (uses `useFocusKeepAwake`),
      rapidly navigate away/back 5×.
      **PASS:** No red-/yellow-box; logcat shows no uncaught `ExpoKeepAwake`
      errors (only silent swallowing of benign activity-destroyed errors).

---

## Block 5 — Mosque Mode boot survival (~5 min)

- [ ] Enable Mosque Mode → MM1 (1-min test) → confirm silence ran (so SP has
      `armed` state). Then `adb reboot`. Open Sukoon after boot.
      **PASS:** Within 30 s, Trace shows `headless_boot_reschedule_started`
      and `headless_boot_reschedule_completed`. MM2 shows "Boot Recovery Ran"
      with no error.

- [ ] After reboot, check ringer state.
      **PASS:** If MM1 had restored before reboot → NORMAL. If reboot during
      silence window → `RingerModeBootReceiver` cleared silence (verify in
      logcat).

- [ ] `adb logcat -s SukoonBootReceiver | head -20` right after reboot.
      **PASS:** "Device rebooted — enqueuing notification reschedule" present.

- [ ] `adb shell dumpsys alarm | grep -i sukoon` after boot.
      **PASS:** Future prayer alarm entries present; no zero/epoch times.

---

## Block 6 — Battery optimization / OEM (~5 min)

- [ ] Mosque Mode screen → OEMBatteryGuidanceCard visible → "Open Battery
      Settings".
      **PASS:** Android battery optimization list opens at
      `IGNORE_BATTERY_OPTIMIZATION_SETTINGS`; Sukoon listed. Set to
      "Don't optimize".

- [ ] Dismiss with "Not now" → Force Stop app → relaunch.
      **PASS:** Card stays hidden (key persisted across force-stop).

- [ ] Re-enable Samsung optimization → run MM1.
      **PASS:** Silence + restore both fire. If foreground service is killed,
      re-whitelist and log as Samsung-specific reliability gap — the
      OEMBatteryGuidanceCard CTA is the documented fix.

- [ ] `adb shell dumpsys activity services | grep -i sukoon` while MM1 active.
      **PASS:** A `SukoonAdhanService` / `MosqueMode*Service` entry visible
      in foreground services list during silence window.

---

## Galaxy S22 — SECOND PASS (~10 min, diff only)

Repeat only these; skip the rest unless they failed on the low-end.

- [ ] **Exact alarm auto-grant.** Samsung Android 13+ auto-grants for
      sideloads. Verify Debug "Exact Alarm Status" → `granted` with no
      manual step.
      **PASS:** `native_alarm` engine active from first launch.

- [ ] **Full adhan media routing.** "2.75 Test Full Adhan (Lock Screen)" with
      Bluetooth disconnected.
      **PASS:** Adhan plays through earpiece/speaker; audible at alarm-stream
      volume.

- [ ] **Doze on S22.** `dumpsys deviceidle force-idle`, fire a scheduled
      notification.
      **PASS:** Fires within 15 s of trigger even under Doze.

- [ ] **OEMBatteryGuidanceCard on OneUI.** "Open Battery Settings".
      **PASS:** OneUI battery optimization screen opens; Sukoon findable; no
      `ActivityNotFoundException` in logcat.

- [ ] **Performance baseline.** Rapidly switch Home ↔ Mosque Mode ↔ Settings
      5×.
      **PASS:** No `"JS thread has been blocked"` warnings; no visible jank
      (S22 has 8GB RAM vs low-end 3–4GB — any jank here is a real signal).

---

## After the walk

- File any failures inline as TODO comments in the relevant service file, or
  open issues in the launch tracker (`docs/launch/...`).
- The OEMBatteryGuidanceCard is the documented OEM-kill fallback. If it works
  on Samsung low-end here, it ships to Play unchanged.
- If Mosque Mode survives reboot on both devices, the Authority Phase 2-4
  deferral is justified — keep it as v1.1 fast-follow.
