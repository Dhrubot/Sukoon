# Sukoon — Mosque Mode Fail-Safe Design
**Branch:** `feature/notification-prayer-times-hardening`  
**Design date:** 2026-05-28  
**Author:** Claude Code (Principal Mobile Reliability Engineer role)  
**Status:** Design only — no code changes in this document

---

## The Non-Negotiable

> "I don't want the user's phone ringing when they are praying in the mosque with Mosque Mode turned on."

**Android:** Hard guarantee. Every design decision below is evaluated against this sentence.  
**iOS:** The OS makes this guarantee impossible. We will be honest about this loudly and immediately. We will not pretend symmetry.

---

## Table of Contents

1. [Current Behavior Summary](#1-current-behavior-summary)
2. [Android Target Guarantees A–F](#2-android-target-guarantees-a-f)
3. [iOS Honest Assisted Mode](#3-ios-honest-assisted-mode)
4. [State Machine](#4-state-machine)
5. [Persistence: Keys, Storage, and Why Not MMKV](#5-persistence-keys-storage-and-why-not-mmkv)
6. [Watchdog Design](#6-watchdog-design)
7. [Copy Changes](#7-copy-changes)
8. [Test Plan](#8-test-plan)
9. [Migration Plan (Phased)](#9-migration-plan-phased)
10. [Open Questions](#10-open-questions)

---

## 1. Current Behavior Summary

### 1.1 Android — What Works

**Chain of trust (verified in `plugins/withRingerMode.js` and `src/services/MosqueModeService.ts`):**

1. User confirms mosque mode → `MosqueModeService.scheduleSilentMode()` (`MosqueModeService.ts:221`)
2. `scheduleAndroidSilentMode()` checks current ringer; if already quiet, skips (correct: avoids over-writing user's manual silent). (`MosqueModeService.ts:329`)
3. `RingerControlService.scheduleMosqueMode()` calls `RingerModeModule.scheduleMosqueMode()` (`RingerControlService.ts:86`)
4. Native Java in `withRingerMode.js`: two `AlarmManager.setExactAndAllowWhileIdle(RTC_WAKEUP)` alarms — ENABLE at iqamah time, RESTORE at `iqamah + silentDuration`. (`withRingerMode.js:176–179`)
5. `MosqueModeReceiver.onReceive()` checks `isNotificationPolicyAccessGranted()`, then calls `AudioManager.setRingerMode()`. (`withRingerMode.js:256–290`)
6. `persistActiveState()` writes to `StorageService` (MMKV) so `isCurrentlyActive()` and the UI banner function. (`MosqueModeService.ts:106`)

**Permission-checking is correct:** `canModifyRingerMode()` is called before both `setRingerMode()` and `scheduleMosqueMode()`. `MosqueModeReceiver` also checks DND access before acting.

**Doze bypass is correct:** `setExactAndAllowWhileIdle` fires even in Doze mode — this is the right alarm type for a user-critical, time-exact event.

**`managedBySukoon` flag is correct:** If the phone was already silent at schedule time, Sukoon records `managedBySukoon: false` and does not schedule restore, avoiding spurious restore of a user-controlled silent state.

### 1.2 Android — Known Gaps (All Confirmed in Codebase)

**Gap A — No post-apply verification.** `setRingerMode()` in `RingerControlService.ts:68` calls `module.setRingerMode(mode)` and returns `true` if no exception is thrown. It does NOT read back the ringer mode to confirm the change applied. On some OEM builds (Xiaomi HyperOS, Samsung OneUI with strict battery policy), `AudioManager.setRingerMode()` can be silently no-oped. The app has no way to detect this.  
_File: `src/services/RingerControlService.ts:68–83`_

**Gap B — No watchdog on app foreground.** `isCurrentlyActive()` method exists at `MosqueModeService.ts:512` but is called only from the 60-second Zustand tick (via `useMosqueMode.ts:22–26` responding to `currentTime` from the store). If the RESTORE alarm was killed (Doze, OEM, process kill), there is no recovery path. The app will show "Mosque Mode Active" indefinitely and the phone stays silent.  
_File: `src/hooks/useMosqueMode.ts:22–26`; gap identified in `docs/audit/01-product-retention.md:195–202`_

**Gap C — Boot does not reschedule mosque mode alarms.** `runBootNotificationRescheduleTask()` calls `NotificationService.reconcileScheduling('boot')` but never calls `MosqueModeService.scheduleUpcomingMosqueModes()`. On device reboot between scheduling and iqamah, the phone will NOT be silenced.  
_File: `src/tasks/notificationBootRescheduleTask.ts:27`; gap identified in `docs/audit/02-engineering-notifications-security.md` section 3.5_

**Gap D — State persisted in MMKV, invisible across processes.** `STORAGE_KEYS.ACTIVE_MOSQUE_MODE` is written to `StorageService` (MMKV). The boot headless task (`notificationBootRescheduleTask.ts`) runs in a separate process. If the active state check needs to happen cross-process, MMKV won't see it.  
_File: `src/services/MosqueModeService.ts:16–20`; pattern from `docs/audit/02-engineering-notifications-security.md` section 7.2_

**Gap E — DND permission revocation creates phantom active state.** If `ACCESS_NOTIFICATION_POLICY` is revoked after scheduling, `MosqueModeReceiver` silently logs and returns without silencing. The `ACTIVE_MOSQUE_MODE` key still reads as active, so `isCurrentlyActive()` returns `true` and the UI shows a banner saying the phone is silent — when it is not.  
_File: `plugins/withRingerMode.js:256–263`; gap identified in `docs/audit/02-engineering-notifications-security.md` section 3.6_

**Gap F — Exact alarm degradation not surfaced.** On Android 12+ without `SCHEDULE_EXACT_ALARM`, the code falls back to inexact alarms that may fire up to ~10 minutes late (noted in `withRingerMode.js:148`). The mosque mode UI does not warn the user, so they believe iqamah will be honored precisely when it may not be.  
_File: `plugins/withRingerMode.js:145–151`; gap identified in `docs/audit/02-engineering-notifications-security.md` section 8.1 Gap C_

**Gap G — No failure notification.** If the restore alarm fails (any reason), the user has no out-of-band notification. Discovery is: "I missed a call because my phone was still silent." There is a manual restore button in `MosqueModeStatus`, but it requires opening the app.  
_File: `src/components/mosque/MosqueModeStatus.tsx:86–100`_

**Gap H — Race condition on double-schedule.** `scheduleUpcomingMosqueModes()` is called from `useServiceInitialization.ts` inside a `useEffect` that re-fires whenever `todayPrayerTimes.length` changes. A cold start with disk cache + network update triggers two calls. Each cancels the previous alarms via `cancelLegacyNotifications()` before re-scheduling, creating a narrow window where no alarm is set.  
_File: `src/hooks/useServiceInitialization.ts:179–203`; gap identified in `docs/audit/02-engineering-notifications-security.md` section 8.1 Gap D_

### 1.3 iOS — What Exists

`scheduleIOSReminder()` (`MosqueModeService.ts:374`) schedules a single local notification 5 minutes before iqamah. The body comes from `mosqueModePlatformUi.autoReminderBody` which reads: "Iqamah starts soon. Silence your phone before prayer begins." (`mosqueModePlatform.ts:73`).

`mosqueModePlatformUi` correctly differentiates Android vs iOS copy throughout. The footer text explicitly says iOS cannot change sound settings. The toggle description, enabled message, and prompt description all correctly describe the reminder-only behavior.

**What iOS does NOT have:**
- Any programmatic ability to mute the phone. This is an OS-level restriction. Apple does not expose `AudioSession` APIs for ringer control and prohibits apps from toggling the ringer switch programmatically.
- A restore reminder notification after the silent window ends.
- A Focus mode integration. iOS Shortcuts can automate Focus modes, but requires explicit one-time user setup.
- Pre-iqamah notification with urgency styling that stays persistent on the lock screen.

**The iOS notification is a whisper, not a shout.** Given that the user may be commuting, the single-notification approach may be missed.

---

## 2. Android Target Guarantees A–F

### Guarantee A — Silence APPLIES: verify by reading back

**The problem:** `RingerControlService.setRingerMode()` returns `true` if `AudioManager.setRingerMode()` does not throw. On Xiaomi HyperOS and some Samsung builds, the call is a no-op for apps without system-level authorization or when the device is in a vendor-defined "locked" audio state. We claim we silenced the phone but we have not.

**Design — Post-Apply Verification:**

After `AudioManager.setRingerMode(target)` in the native layer (`RingerModeModule.java`), immediately call `audioManager.getRingerMode()` and compare to `target`. If they differ, retry once after a 200 ms sleep and read again. If still mismatched, resolve the promise with a new result object:

```
// Conceptual — not production code
{
  "applied": false,
  "requested": "SILENT",
  "actual": "NORMAL",
  "retried": true
}
```

In `RingerControlService.setRingerMode()` (JS side), parse this result and return a structured `{ success: boolean; verified: boolean; actualMode: RingerMode }` instead of a bare `boolean`.

In `MosqueModeReceiver.onReceive()` (native broadcast receiver, no JS bridge), call `audioManager.getRingerMode()` immediately after `setRingerMode()`. If they differ, write a "verify_failed" flag to `SharedPreferences` using the existing `sukoon_mosque_prefs` store (see Section 5). On next app foreground, the watchdog reads this flag and surfaces the error banner.

**What this eliminates:** Silent OEM no-ops that leave the user's phone ringing during prayer without the app knowing.

**Ship criterion:** `setRingerMode` in JS returns structured result; `MosqueModeReceiver` writes a verification flag to SharedPreferences; no call site trusts a bare `true` without checking `verified`.

---

### Guarantee B — Silence RESTORES even after failure: watchdog on foreground

**The problem:** `isCurrentlyActive()` is called on the 60-second Zustand tick (through `useMosqueMode`). If the user is praying for 15 minutes with the screen off, that's 15 minutes of silence even after the restore alarm should have fired. When they pick up the phone (app foregrounds), there is no check — the app just shows the same "Mosque Mode Active" banner.

**Design — App-Foreground Watchdog:**

Create `MosqueModeWatchdog.ts` (or add to `MosqueModeService.ts`) with a single exported function:

```
async function runForegroundWatchdog(): Promise<WatchdogResult>
```

**What it checks (in order):**

1. Call `getActiveMosqueMode()`. If null, nothing to do. Return `{ action: 'none' }`.
2. Check `now >= activeState.iqamahTime` (silence window has started).
3. Check `now >= activeState.restoreTime` (restore window has passed).
4. If (2) and (3) and `activeState.managedBySukoon === true`:
   - Call `RingerControlService.getRingerMode()`.
   - If still SILENT or VIBRATE: the restore alarm failed. Auto-restore by calling `manuallyRestoreRinger()`.
   - Clear `ACTIVE_MOSQUE_MODE` storage key.
   - Post a notification: "Sukoon restored your ringer automatically. It was left on silent after prayer." (See Section 7 for copy.)
   - Return `{ action: 'auto_restored', reason: 'alarm_missed' }`.
5. If (2) but NOT (3): we are in the active window. Optionally verify ringer is actually silent (Guarantee A passive check). If not silent, re-apply silently and log.
6. If NOT (2): we are before iqamah. Check that the enable alarm is still scheduled (via `SharedPreferences` flag). If not, re-schedule.

**Where to call it:**

Hook `useAppStateChange` (already exists at `src/hooks/useAppStateChange.ts`) in a new `useMosqueModeWatchdog` hook. Call the watchdog whenever `nextState === 'active'`.

Also call the watchdog from the 60-second tick path already in `useMosqueMode.ts:22` — this covers in-app foreground without a state change event.

**Periodic watchdog while active (belt-and-suspenders):**

When `isCurrentlyActive()` is true, set a `setInterval` of 30 seconds that calls `getRingerMode()`. If the ringer is NORMAL during an active window (someone called — Android may revert ringer after an incoming call, or the user manually restored), clear the active state gracefully.

**What this eliminates:** The stuck-silent scenario where the restore alarm was killed by Doze, OEM, or process death, and the user never discovers it until they miss a call.

---

### Guarantee C — Survives crash / process kill / OS reboot

**Sub-problem 1 — Reboot clears AlarmManager.**

Android clears all `AlarmManager` alarms on reboot. The current `BootReceiver` calls `NotificationRescheduleWorker` which sets a `SharedPreferences` flag and starts the headless JS boot task (`runBootNotificationRescheduleTask`). That task calls `NotificationService.reconcileScheduling('boot')` and nothing else. Mosque mode alarms are never re-armed.

**Design — Boot path re-arms mosque mode:**

In `runBootNotificationRescheduleTask()` (`src/tasks/notificationBootRescheduleTask.ts`), after `reconcileScheduling` completes, add:

```typescript
// Re-arm any pending mosque mode alarms from the state persisted in SharedPreferences
await MosqueModeBootHelper.rearmFromPersistence();
```

`MosqueModeBootHelper.rearmFromPersistence()`:
1. Read mosque mode active state from `SharedPreferences` (see Section 5 for the new SP key design).
2. Parse `iqamahTime`, `restoreTime`, `managedBySukoon`, `restoreMode`.
3. If `now < iqamahTime`: re-schedule both ENABLE and RESTORE alarms via `RingerModeModule.scheduleMosqueMode()`.
4. If `now >= iqamahTime && now < restoreTime && managedBySukoon`: re-schedule only the RESTORE alarm. Also immediately apply SILENT (the enable alarm fired before reboot, so the phone should already be silent — but verify and apply if not).
5. If `now >= restoreTime`: the restore window passed during reboot. Immediately restore the ringer, clear the state, and (if the ringer was changed) post a "Sukoon restored your ringer after reboot" notification.

**Sub-problem 2 — Process kill between JS schedule and alarm fire.**

The JS-side `persistActiveState()` writes to MMKV. If the process is killed after this write but before the `scheduleMosqueMode()` native call, the active state record says "mosque mode scheduled" but no alarm exists. The watchdog on next foreground launch would detect `now < iqamahTime` and no alarm armed → re-schedule.

But to detect "alarm exists," we need to check the `SharedPreferences` flag written by the native side (see Section 5). This creates the cross-process visibility needed.

**Sub-problem 3 — State must survive after process kill.**

The current `ACTIVE_MOSQUE_MODE` key lives in MMKV (StorageService). MMKV is process-local. The headless boot task (separate process) cannot read it to know whether to re-arm.

Solution: Mirror the critical fields to `SharedPreferences` via a new `MosqueModePrefsModule` (see Section 5). This is the same cross-process-safe pattern already used by `BootPrefsModule` for notification rescheduling.

**What this eliminates:** The reboot-between-schedule-and-iqamah failure (currently certain data loss of the silence guarantee). The process-kill gap.

---

### Guarantee D — Permission losses handled gracefully

**The problem:** If `ACCESS_NOTIFICATION_POLICY` is revoked after scheduling, `MosqueModeReceiver` logs and returns. The active state in MMKV still says "active" and `isCurrentlyActive()` returns `true`. The UI banner shows "Mosque Mode Active" when the phone will ring.

**Design — Permission State Check on Foreground:**

Add to the foreground watchdog (`useMosqueModeWatchdog`): when `isCurrentlyActive()` is true, call `RingerControlService.canModify()`. If `canModify()` returns `false`:
1. Clear `ACTIVE_MOSQUE_MODE` storage key.
2. Clear the SharedPreferences mosque state.
3. Show a persistent in-app banner (not just a notification): "Mosque Mode needs permission to work. Tap to grant Do Not Disturb access." This banner must appear on the Home screen and Mosque Mode screen.
4. The `MosqueModeStatus` component should add a `permissionLost` visual state (red/orange rather than the current teal active state).

During the `scheduleAndroidSilentMode()` scheduling call, `canModify()` is already checked. If it returns `false`, the method returns `false` and the UI already handles it (the toggle returns `false`). The gap is the post-schedule revocation.

**Degradation copy (see Section 7 for exact strings):**

Do not say "Mosque Mode is active." Say "Mosque Mode needs Do Not Disturb access to silence your phone." Provide a one-tap deeplink: "Grant Permission" → `openNotificationPolicyAccessSettings()`.

**What this eliminates:** The phantom-active scenario where the user is praying and their phone rings despite the banner saying it's in mosque mode.

---

### Guarantee E — Edge cases

**E1 — User manually changes ringer during the silent window.**

On Android, the user can manually adjust the ringer volume via hardware buttons, which overrides the AudioManager silent state. When the restore alarm fires, it restores to `previousMode` (e.g., NORMAL). This is correct behavior — the phone rings again.

The 30-second periodic watchdog (Guarantee B) detects that the ringer is NORMAL during an active window. It should NOT re-apply silence. Instead: if `now` is still within the active window and the ringer changed to NORMAL, this is most likely a deliberate user action or an incoming call. The watchdog should:
- Cancel the ENABLE alarm (already fired) if it hasn't.
- Leave the RESTORE alarm in place.
- Log `user_manual_override` event.
- Update the UI banner: "You changed your ringer. Mosque Mode will end at [restoreTime]."

The key question: did the user manually change it (tolerate) or did an OEM policy reset it (re-apply)? We cannot distinguish with certainty. Default to tolerating — do not re-apply silence without user consent. If the restore alarm fires, it will try to restore to `previousMode` (NORMAL), which may or may not be desired. At minimum, log it.

**E2 — Incoming call interrupted.**

When an incoming call arrives on a silent Android phone, the OS plays the ringtone at the stored ring volume (not the current ringer mode volume on some OEM variants). Some OEM launchers may also temporarily bump the ringer mode to allow the call. On RESTORE, we restore to `previousMode` (NORMAL), which is correct. The 30-second watchdog may see NORMAL mid-call; it must not treat this as a failure — it should see `now < restoreTime && ringer = NORMAL` and log `incoming_call_suspected` but not re-silence. The distinction from E1 (manual override) is the same ambiguity; the policy is identical: do not re-apply silence.

**E3 — Battery saver killed the alarm.**

`setExactAndAllowWhileIdle` (the alarm type used) is designed to survive Doze mode. Battery saver on stock Android does not kill `RTC_WAKEUP` exact alarms. However, OEM battery savers (Xiaomi's MIUI Battery Saver, Samsung's Extreme Battery Saver, Huawei's Ultra Battery Saver) CAN suspend even `RTC_WAKEUP` alarms. These are documented Android compliance deviations.

Mitigation: the foreground watchdog (Guarantee B) covers recovery. In Phase 2, add OEM battery optimization detection in the Mosque Mode settings onboarding: if the device is Xiaomi/Samsung/Huawei, show a "Battery Optimization" row in the Mosque Mode setup that deeplinks to OEM battery exemption settings (the same pattern used for adhan: `exactAlarmReady` CTA in `NotificationSection.tsx`).

**E4 — OEM (Xiaomi/Samsung) aggressive app kill.**

AlarmManager broadcast receivers (`MosqueModeReceiver`) run in a separate process context from the app and survive app kill. The receiver is declared in the manifest (via `withRingerMode.js:395–403`) with `android:exported="false"`. OEM aggressive kill does not typically kill the `BroadcastReceiver` that responds to system-level alarms. However, some Xiaomi builds have been reported to prevent broadcast delivery for battery-restricted apps.

Mitigation: same as E3. The watchdog covers recovery. The OEM battery guidance covers prevention. For Xiaomi specifically, `BOOT_COMPLETED` is also restricted on some builds — the boot receiver re-arm depends on this. Flag this as Open Question #6.

---

### Guarantee F — Failure mode UX

**The problem:** If the restore alarm does not fire and the watchdog does not fire (app not opened), the user has no notification. They discover the failure by missing a call or checking the phone's ringer.

**Design — "Stuck Silent" Notification:**

When `MosqueModeReceiver` fires the ENABLE alarm successfully (ringer set to SILENT, verified by reading back), write a "needs_restore_confirmation" flag to `SharedPreferences` with the restore timestamp. This flag is the basis for two safety nets:

**Safety net 1 — The RESTORE alarm itself:** On `MOSQUE_MODE_RESTORE` receive, clear the flag and post: "Prayer time complete — your phone is back to normal." (Informational; can be dismissed.)

**Safety net 2 — WorkManager check-in:** Schedule a one-shot WorkManager task to fire at `restoreTime + 5 minutes` (not an `AlarmManager`, to be friendly to Doze). Its only job: read `needs_restore_confirmation`. If still set, it means the RESTORE alarm did NOT fire or the JS restore path did not run. Post a high-priority notification:

> "Sukoon couldn't restore your ringer automatically.  
> Your phone may still be on silent from prayer.  
> **Restore now**"

Tapping "Restore now" deeplinks into the app, which calls `manuallyRestoreRinger()`.

The WorkManager task uses `setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)` to maximize reliability under battery policy.

**Safety net 3 — Foreground watchdog notification:** If the watchdog (Guarantee B) detects stuck silent and auto-restores, it posts:

> "Sukoon restored your ringer. It was left on silent after prayer."

This is informational — no action needed. It tells the user "we caught it, you're good."

**What this eliminates:** Silent failure. The user always gets notified (app-foreground: auto-restores; app-background: WorkManager posts the "restore now" prompt; app reopened later: watchdog auto-restores and confirms).

---

## 3. iOS Honest Assisted Mode

### 3.1 The Hard Truth — Say It Clearly

iOS does not permit apps to programmatically change the ringer mode or mute the hardware ringer. This is not a gap in Sukoon's implementation. It is an OS-level policy enforced by Apple. No workaround exists without Critical Alerts entitlement (reserved for medical/safety apps; Apple has rejected prayer apps for this entitlement). Sukoon must not imply, hint, or obscure this limitation.

**Current state:** The footer text in `MosqueModeScreen` correctly says "Sukoon cannot change iPhone sound settings for you." The toggle description and enabled message are correctly differentiated in `mosqueModePlatform.ts`. This is the right foundation.

**Gaps in the current iOS UX:**

- The pre-iqamah notification is a single notification 5 minutes before. If the user's screen is off and notification previews are hidden (common on iPhone), the notification may not be seen. No second/final reminder is scheduled.
- No restore reminder after the silence window ends ("if you silenced your phone, you can unmute now").
- The Mosque Mode settings screen has no prominent iOS-specific explanation section — a user who reads the screen carefully will understand the limitation, but the hierarchy currently puts Android-centric content first.
- The onboarding flow does not mention Mosque Mode at all (confirmed in `01-product-retention.md:104`).

### 3.2 iOS Notification Strategy — Two Reminders

Replace the single 5-minute notification with two notifications:

**Notification 1 — 5 minutes before iqamah:**

```
Title: [PrayerName] Iqamah in 5 min
Body:  Time to silence your phone. Swipe down → Control Center → Silent.
Category: mosque_ios_reminder (persistent on lock screen — see below)
```

Keep this notification visible on the lock screen until iqamah time passes. Use a notification category with no action buttons (keeps it clean) but with `UNNotificationInterruptionLevel.active` (iOS 15+) so it does not get collapsed into a group.

**Notification 2 — At iqamah time:**

```
Title: [PrayerName] Iqamah beginning now
Body:  Silence your phone if you haven't yet.
```

This fires at the exact iqamah timestamp. Brief and actionable.

**Notification 3 — Restore reminder (after silence window):**

```
Title: Prayer complete
Body:  If you silenced your phone, you can unmute now.
```

Schedule this for `iqamahTime + silentDuration` minutes. It is informational — no action required.

**iOS notification budget:** Three notifications per prayer × 5 prayers = 15 slots per day maximum. The iOS 64-slot cap is shared with prayer notifications. The 7-day horizon for prayer notifications already uses approximately 35 slots (5 prayers × 7 days). Mosque mode adds up to 15/day × 7 = 105 slots — this would completely exhaust the budget. **Do not schedule mosque mode iOS notifications for the full 7-day horizon.** Limit to the next 2 days only (6 prayers × 3 notifications = 18 slots maximum). This matches the actual utility — a user does not need mosque reminders scheduled 7 days out.

### 3.3 iOS Focus Mode and Shortcuts Integration

Apple's iOS Focus mode allows apps to deliver notifications during Focus. iOS Shortcuts can automate Focus mode activation. Sukoon can make the following flow possible with one-time user setup:

**Shortcut flow:**
1. User opens Shortcuts app once during Mosque Mode onboarding (Sukoon deeplinks to it via `Linking.openURL('shortcuts://')`).
2. User creates or downloads a pre-built shortcut named "Mosque Mode" that does: Enable Focus: Do Not Disturb → Wait [silentDuration] minutes → Disable Focus: Do Not Disturb.
3. User assigns this shortcut to a Siri phrase or a personal automation triggered by a calendar event.
4. Sukoon can add a calendar event for each iqamah (via `expo-calendar`) as the trigger — but this requires Calendar permission and a separate user setup step.

**Honest framing:** This requires the user to configure it once outside the app. It is not automatic. Sukoon cannot run the shortcut on behalf of the user. Documenting this path is valuable because some users will set it up and get a much better experience.

**In-app Surface:** In the iOS Mosque Mode settings, add a "Shortcuts Setup" expandable section:

> "iOS doesn't allow apps to silence your phone. But you can set this up once in Shortcuts for automatic silencing:"
> 1. Tap "Get the Shortcut" → deeplink to a Shortcut URL or Shortcuts app.
> 2. Configure your iqamah time in the Shortcut.
> 3. Sukoon will remind you to run it before prayer.

Note: Creating a `.shortcut` file that Sukoon distributes (via URL scheme `shortcuts://run-shortcut?name=`) removes the user setup entirely but requires Apple's shortcut sharing infrastructure and the user having the Shortcuts app configured. This is a Phase 3 enhancement.

### 3.4 iOS Settings Copy Requirement

The Mosque Mode options section on iOS must NOT show the same controls as Android. Specifically:
- "Silent Duration" control: **Hide on iOS.** This duration is meaningless if Sukoon can't control silence.
- "Auto Restore" toggle: **Hide on iOS.** Nothing to restore.
- "Use Vibrate Instead of Silent" toggle: **Hide on iOS.** Irrelevant.

These are conditionally hidden via `mosqueModePlatformUi.showsSilentModeControls` (already `false` on iOS). Verify this gate is respected in `MosqueModeOptions` component.

The options section on iOS should show:
- Reminder timing (how far before iqamah to notify)
- Enable/disable restore reminder notification
- "How does this work on iPhone?" expandable explanation

---

## 4. State Machine

The mosque mode silent cycle has the following states. The transitions and their failure modes must be explicitly modeled.

```
┌─────────────────────────────────────────────────────────────────┐
│                     MOSQUE MODE STATE MACHINE (Android)         │
└─────────────────────────────────────────────────────────────────┘

[IDLE / DISABLED]
     │
     │  User enables mosque mode + iqamah offset configured
     ▼
[ARMED]
  Storage: SP.mosque_state = "armed"
           SP.iqamah_time, SP.restore_time, SP.restore_mode
           SP.alarm_scheduled = true
           MMKV.ACTIVE_MOSQUE_MODE = { prayer, iqamahTime, restoreTime, managedBySukoon: true }
  AlarmManager: ENABLE alarm set for iqamahTime
                RESTORE alarm set for restoreTime
     │
     │  Failure paths from ARMED:
     │  ─ Device reboots → BootReceiver fires → re-arm from SP (Guarantee C)
     │  ─ Permission revoked → foreground watchdog detects (Guarantee D)
     │  ─ App foregrounded before iqamah → watchdog re-verifies alarm exists
     │
     │  AlarmManager.ENABLE fires at iqamahTime
     ▼
[SILENCING]
  MosqueModeReceiver.onReceive(MOSQUE_MODE_ENABLE)
  Reads SP.restore_mode for ringer to restore later
  Calls audioManager.setRingerMode(SILENT | VIBRATE)
  Reads back audioManager.getRingerMode()
     │
     ├──[verified]───────────────────────────────────────────────►
     │                                                             │
     │  [not verified — retry]                                     │
     │   Wait 200ms, setRingerMode again, read back                │
     │   If still not verified: write SP.verify_failed = true      │
     │   (Watchdog picks this up on next foreground)               │
     │                                                             ▼
     │                                                    [SILENCED — VERIFIED]
     │                                                    Storage: SP.silence_active = true
     │                                                             SP.silence_verified = true
     │                                                             SP.verify_failed = false
     │                                                             WorkManager "check-in" task scheduled
     │                                                             at restoreTime + 5 min
     │                                                             │
     │                                                             │  Failure paths from SILENCED:
     │                                                             │  ─ Restore alarm killed → WorkManager posts
     │                                                             │    "restore now" notification (Guarantee F)
     │                                                             │  ─ App foregrounds mid-window → watchdog
     │                                                             │    verifies ringer is still silent (periodic)
     │                                                             │  ─ User manually changes ringer → watchdog
     │                                                             │    logs user_override, does NOT re-silence
     │
     │  [verify_failed path]
     │   SP.verify_failed = true
     │   MMKV shows "active" but ringer is not actually silent
     │   WorkManager check-in task scheduled
     │   Watchdog on foreground: read verify_failed → show banner
     │   "Mosque Mode couldn't silence your phone. Check DND access."
     │
     │  AlarmManager.RESTORE fires at restoreTime
     ▼
[RESTORING]
  MosqueModeReceiver.onReceive(MOSQUE_MODE_RESTORE)
  Calls audioManager.setRingerMode(SP.restore_mode)
  Reads back to verify
  Clears SP.silence_active, SP.mosque_state
  Posts "Prayer complete — ringer restored" notification
  WorkManager check-in cancelled (or reads and finds flag clear)
     │
     │  [verified restore]
     ▼
[RESTORED — VERIFIED]
  All SP keys cleared
  MMKV.ACTIVE_MOSQUE_MODE cleared
  WorkManager check-in task finds flag clear → no action
  UI banner: "Mosque Mode ended" (auto-dismissed after 10 seconds)
     │
     │  [restore not verified]
     │   SP.restore_verify_failed = true
     │   Post high-priority notification: "Couldn't restore ringer — tap to restore"
     │   Watchdog on next foreground: read flag → auto-restore → clear flag
     ▼
[FAILED — RECOVERY NEEDED]
  SP.restore_verify_failed = true
  WorkManager check-in fires → posts "restore now" notification
  UI: persistent banner on Home screen and Mosque Mode screen
  "Your ringer may still be on silent. Tap to restore."
     │
     │  User taps "Restore" (notification) OR app foreground watchdog fires
     ▼
[RESTORED — MANUAL]
  manuallyRestoreRinger() called
  ringer verified back to restore_mode
  All SP keys cleared
  Post: "Ringer restored. You're all set."
```

**iOS State Machine (simplified — no ringer control):**

```
[IDLE]
     │  User enables mosque mode
     ▼
[REMINDERS SCHEDULED]
  Expo notification: 5 min before iqamah
  Expo notification: at iqamah
  Expo notification: at restoreTime (unmute reminder)
     │
     ▼
[REMINDER DELIVERED] — OS responsibility, app has no further role
     │
     ▼
[IDLE] — cycle ends
```

---

## 5. Persistence: Keys, Storage, and Why Not MMKV

### 5.1 Why MMKV Is Insufficient for Mosque Mode State

MMKV is initialized per-process in Android. The Sukoon app uses two MMKV instances (`prayer-buddy-storage` encrypted, `prayer-buddy-public` unencrypted). These are loaded by the JS runtime.

**The headless boot task** (`runBootNotificationRescheduleTask`) runs in the `BootNotificationRescheduleTaskService` — a separate Android process context where a new React Native runtime is bootstrapped. The `StorageService.initialize()` call in `notificationBootRescheduleTask.ts:15` re-initializes MMKV in this new process, but there is no guarantee the state written by the main process is visible (MMKV's cross-process mode is not enabled).

**The `MosqueModeReceiver` BroadcastReceiver** runs with no React Native runtime at all. It has zero access to MMKV. It needs to read the restore mode from somewhere — currently it reads `mode` from the Intent extras put by `scheduleMosqueMode()`. This works for the initial alarm but fails if the Intent extras are lost (edge case: Intent re-delivery on restart).

**SharedPreferences** is Android's built-in cross-process-safe key-value store. It is correct to use here because:
- It is readable by BroadcastReceivers and WorkManager workers with no runtime dependency.
- It survives process kill.
- It survives device reboot (persists in `/data/data/<package>/shared_prefs/`).
- `BootPrefsModule` already extends this pattern for notification rescheduling (`withBootReceiver.js:115–220`).

### 5.2 SharedPreferences Key Design

All mosque mode cross-process state lives in a new SharedPreferences file: `sukoon_mosque_prefs` (mirrors the existing `sukoon_boot_prefs` pattern).

**Keys (all prefixed `mosque_`):**

| Key | Type | Written by | Read by | Purpose |
|-----|------|-----------|---------|---------|
| `mosque_state` | String (`"idle"`, `"armed"`, `"silenced"`, `"failed"`) | JS via `MosqueModePrefsModule.set` / Java receiver | Boot task, Watchdog, WorkManager | Primary state indicator |
| `mosque_prayer` | String (prayer name) | JS | Boot task, UI | Which prayer is active |
| `mosque_iqamah_ms` | Long | JS | Boot task, alarm re-arming | Iqamah epoch milliseconds |
| `mosque_restore_ms` | Long | JS | Boot task, alarm re-arming, WorkManager | Restore epoch milliseconds |
| `mosque_restore_mode` | String (`"NORMAL"`, `"VIBRATE"`) | JS | Receiver, Boot task | What to restore the ringer to |
| `mosque_managed_by_sukoon` | Boolean | JS | Receiver, Watchdog | Whether Sukoon changed the ringer |
| `mosque_alarm_scheduled` | Boolean | Java (`RingerModeModule`) | Watchdog | AlarmManager call succeeded |
| `mosque_silence_verified` | Boolean | Java (`MosqueModeReceiver`) | Watchdog | Ringer read-back confirmed silence |
| `mosque_verify_failed` | Boolean | Java (`MosqueModeReceiver`) | Watchdog | Ringer apply failed |
| `mosque_restore_verify_failed` | Boolean | Java (`MosqueModeReceiver`) | Watchdog, WorkManager | Restore apply failed |
| `mosque_checkin_task_id` | String | JS | JS (to cancel) | WorkManager task ID for the restore check-in |

### 5.3 New Native Module: MosqueModePrefsModule

Extend `withRingerMode.js` to inject a `MosqueModePrefsModule.java` that mirrors the `BootPrefsModule` pattern:

**Methods:**
- `setState(prayer, iqamahMs, restoreMs, restoreMode, managedBySukoon)` → writes all primary keys atomically
- `getState()` → returns all keys as a JSON string
- `clearState()` → clears all keys
- `getAndClearVerifyFailed()` → atomic read + clear of `mosque_verify_failed`
- `getAndClearRestoreVerifyFailed()` → atomic read + clear of `mosque_restore_verify_failed`

All writes use `SharedPreferences.Editor.apply()` for async safety. For the final clear on restore, use `commit()` (synchronous) to ensure the WorkManager check-in task does not read stale state.

### 5.4 MMKV Remains for UI State

The `ACTIVE_MOSQUE_MODE` key in `StorageService` (MMKV) is kept for UI purposes only — it drives `useMosqueMode`'s `isActive` and `activeState` React state. It is NOT the source of truth for alarm re-arming or boot recovery. The source of truth is SharedPreferences.

On resume, the watchdog syncs SharedPreferences → MMKV if they are out of sync (e.g., after a boot where MMKV was cleared).

---

## 6. Watchdog Design

### 6.1 Overview

The watchdog is a pure function `runMosqueModeWatchdog()` that can be called from multiple contexts. It is idempotent — calling it twice concurrently is safe because the actions it takes (setRingerMode, clear SP) are atomic with respect to the receiver.

### 6.2 When It Runs

| Trigger | Mechanism | File to modify |
|---------|-----------|----------------|
| App foregrounds | `useAppStateChange` callback, `nextState === 'active'` | New `useMosqueModeWatchdog.ts` hook |
| 60-second tick | Existing `useMosqueMode` effect on `currentTime` change | `src/hooks/useMosqueMode.ts:22` |
| 30-second interval during active window | `setInterval` inside `useMosqueModeWatchdog`, started when `isCurrentlyActive()` is true | `useMosqueModeWatchdog.ts` |
| Boot task | After `reconcileScheduling` completes | `src/tasks/notificationBootRescheduleTask.ts:28` |
| WorkManager check-in | At `restoreTime + 5 min` | New `MosqueModeCheckInWorker.java` (injected by plugin) |

### 6.3 Watchdog Logic (Pseudocode)

```typescript
async function runMosqueModeWatchdog(context: 'foreground' | 'tick' | 'periodic' | 'boot' | 'checkin'): Promise<void> {
  // 1. Read cross-process state
  const spState = await MosqueModePrefsModule.getState();
  const mmkvState = MosqueModeService.getActiveMosqueMode();
  const now = Date.now();

  // 2. Sync SP → MMKV if needed (e.g., after boot)
  if (spState.state !== 'idle' && !mmkvState) {
    MosqueModeService.persistActiveStateFromSP(spState);
  }

  // 3. Check verify_failed from the last enable alarm
  const verifyFailed = await MosqueModePrefsModule.getAndClearVerifyFailed();
  if (verifyFailed) {
    // Silence didn't apply. Show "couldn't silence" banner.
    store.dispatch(setMosqueModeError('silence_verify_failed'));
    MosqueModePrefsModule.clearState();
    return;
  }

  // 4. Check restore_verify_failed from the last restore alarm
  const restoreVerifyFailed = await MosqueModePrefsModule.getAndClearRestoreVerifyFailed();
  if (restoreVerifyFailed) {
    // Restore didn't apply. Auto-restore now.
    await MosqueModeService.manuallyRestoreRinger();
    postNotification('Sukoon restored your ringer — it was left on silent after prayer.');
    MosqueModePrefsModule.clearState();
    return;
  }

  // 5. Nothing armed — nothing to do
  if (!mmkvState && spState.state === 'idle') return;

  const iqamahTime = mmkvState?.iqamahTime?.getTime() ?? spState.iqamahMs;
  const restoreTime = mmkvState?.restoreTime?.getTime() ?? spState.restoreMs;
  const managedBySukoon = mmkvState?.managedBySukoon ?? spState.managedBySukoon;

  // 6. Past restore time — stuck silent?
  if (now >= restoreTime && managedBySukoon) {
    const currentMode = await RingerControlService.getRingerMode();
    if (currentMode === 'SILENT' || currentMode === 'VIBRATE') {
      // Alarm missed. Auto-restore.
      await MosqueModeService.manuallyRestoreRinger();
      postNotification('Sukoon restored your ringer automatically after prayer ended.');
    }
    MosqueModeService.clearActiveState();
    MosqueModePrefsModule.clearState();
    return;
  }

  // 7. In active silence window — verify still silent
  if (now >= iqamahTime && now < restoreTime && managedBySukoon) {
    const currentMode = await RingerControlService.getRingerMode();
    if (currentMode !== 'SILENT' && currentMode !== 'VIBRATE') {
      // User manually changed or OEM reset. Do NOT re-silence. Log and update UI.
      logger.log('[MosqueModeWatchdog] Ringer changed during active window — user override or OEM reset');
      store.dispatch(setMosqueModeStatus('user_override_detected'));
    }
    return;
  }

  // 8. Before iqamah — verify alarm is still scheduled
  if (now < iqamahTime && spState.alarmScheduled === false) {
    // Re-arm the alarm
    await MosqueModeService.rearmSchedule(spState);
  }

  // 9. Permission check (any state)
  const canModify = await RingerControlService.canModify();
  if (!canModify && spState.state !== 'idle') {
    store.dispatch(setMosqueModeError('dnd_permission_lost'));
    MosqueModePrefsModule.clearState();
    MosqueModeService.clearActiveState();
  }
}
```

### 6.4 Debouncing

The watchdog MUST be debounced to avoid double-execution when multiple triggers fire simultaneously (e.g., app foreground coincides with the 60-second tick). Use a simple module-level `lastRunMs` variable. If `Date.now() - lastRunMs < 5000`, skip the run. This prevents concurrent state mutations.

---

## 7. Copy Changes

### 7.1 Android — Be More Specific About the Guarantee

**Current** (`mosqueModePlatform.ts:9`):
> "Guard the quiet of the masjid by entering a dedicated prayer mode before iqamah."

**Proposed** (Android only):
> "Sukoon automatically silences your phone at iqamah time and restores it after prayer. Requires Do Not Disturb access."

**Current** (`MosqueModePrompt.tsx:70`):
> "Sukoon will hold your phone in quiet at iqamah time and restore it after [N] minutes."

**Proposed** (Android only):
> "Sukoon will silence your phone at iqamah time and restore your previous ringer setting [N] minutes later. If anything prevents this, we'll notify you."

**New** — Exact alarm degradation warning (Android 12+, no exact alarm permission):
> "Mosque Mode scheduling is approximate — your phone may not silence until a few minutes after iqamah. Grant exact alarm permission in settings for precise timing."

**New** — Permission lost banner:
> "Mosque Mode needs Do Not Disturb access to silence your phone. [Grant Access]"

**New** — Restore failed notification:
> Title: "Mosque Mode — restore needed"
> Body: "Sukoon couldn't restore your ringer automatically. Tap to restore now."
> Action: "Restore" → deeplink to `manuallyRestoreRinger()`

**New** — Auto-restore success notification (soft confirmation):
> "Prayer complete — your ringer is back to normal."

**New** — Verify failed banner (in-app):
> "Sukoon couldn't silence your phone — Do Not Disturb access may have been blocked. Check your permissions."

### 7.2 iOS — Remove Ambiguity, Add Specificity

**Current** (`mosqueModePlatform.ts:10`):
> "Get a calm reminder before iqamah so you can silence your phone yourself before prayer begins."

This is honest, but buries the platform constraint. Proposed to **lead with the constraint**:

**Proposed** (iOS only, header subtitle):
> "iPhone doesn't allow apps to control the ringer. Sukoon will remind you before iqamah so you can silence it yourself."

**Current** `mosqueModePlatform.ts:14` (footer text):
> "Sukoon cannot change iPhone sound settings for you. It will remind you at the right time so you can silence your phone yourself."

Keep this. It is correct. Ensure it is styled prominently — not as a faint italic footnote.

**New** — Pre-iqamah notification (iOS), 5 min before:
> Title: "[Prayer] Iqamah in 5 min"
> Body: "Time to silence your phone. Swipe down → [Bell icon] in Control Center."

**New** — At-iqamah notification (iOS):
> Title: "[Prayer] Iqamah beginning now"
> Body: "Silence your phone if you haven't yet."

**New** — Restore reminder notification (iOS), after silent window:
> Title: "Prayer complete"
> Body: "If you silenced your phone for prayer, you can unmute now."

**New** — Shortcuts setup section heading:
> "iPhone Automatic Silence (Optional Setup)"
> Subtext: "Use iOS Shortcuts to automate silencing. Requires one-time setup outside this app — but once done, it works automatically."

### 7.3 Settings Section — Honest Platform Differentiation

**In `MosqueModeOptions` or `NotificationSection`**, add a platform disclosure chip near the top of the mosque mode section:

Android:
```
[ Android: automatic silence at iqamah ]
```

iOS:
```
[ iPhone: reminder to silence manually ]
[ Optional: set up Shortcuts for automatic ]
```

This should not be hidden in small text. It should be a visible label that prevents any impression of symmetry.

---

## 8. Test Plan

### 8.1 Unit-Testable Components

**`MosqueModeService.ts`:**
- `getIqamahTime()`: test Jumu'ah absolute time parse, offset calculation, null for disabled prayers.
- `isCurrentlyActive()`: mock `getActiveMosqueMode()`, test boundary conditions (exactly at iqamahTime, exactly at restoreTime).
- `getActiveMosqueMode()`: test JSON parse of stored state, null on empty/invalid JSON.
- `managedBySukoon = false` path: verify that `scheduleAndroidSilentMode` returning `false` when already quiet is correctly persisted.

**`RingerControlService.ts`:**
- `setRingerMode()` with module = null: returns false.
- `canModify()` with module throwing: returns false.

**Watchdog logic (`runMosqueModeWatchdog`):**
- Past restoreTime + mode still SILENT → calls `manuallyRestoreRinger()`.
- Past restoreTime + mode NORMAL → does not call `manuallyRestoreRinger()`.
- Before iqamahTime + alarmScheduled = false → calls `rearmSchedule()`.
- Permission lost → sets error state, clears SP.
- verify_failed flag set → sets `silence_verify_failed` error, clears state.
- restoreVerifyFailed flag set → calls `manuallyRestoreRinger()`, posts notification.

### 8.2 Manual Scenarios — Android

**Scenario 1 — Happy path:**
1. Enable mosque mode, set 10-min offset for Dhuhr.
2. Wait for iqamah time → verify phone is silent (read back via getRingerMode).
3. Wait for restore time → verify phone is NORMAL again.
4. Verify "prayer complete" notification appears.

**Scenario 2 — Incoming call interrupted:**
1. Set up mosque mode for 1 minute from now (use test mode).
2. As iqamah fires and phone goes silent, receive an incoming call.
3. Answer or decline.
4. Verify phone is still set to SILENT after call (OEM behavior varies — document findings).
5. Wait for restore → verify NORMAL restored.

**Scenario 3 — Reboot mid-window:**
1. Schedule mosque mode with iqamah 5 minutes away.
2. Reboot device before iqamah time.
3. Wait for BootReceiver to fire (usually within 15 seconds).
4. Verify AlarmManager alarms are re-armed (check via `adb shell dumpsys alarm | grep sukoon`).
5. Wait for iqamah time → verify phone goes silent.

**Scenario 4 — Reboot after iqamah, before restore:**
1. Schedule mosque mode. Wait for iqamah → phone silent.
2. Reboot during the silent window.
3. Verify boot watchdog immediately applies silent mode (or finds it already silent) and re-arms restore alarm.
4. Wait for restore → verify NORMAL.

**Scenario 5 — Force kill app after scheduling:**
1. Schedule mosque mode.
2. Force kill the app via Android Settings → Apps → Force Stop.
3. Wait for iqamah → verify phone goes silent (AlarmManager should fire even with app killed).
4. Wait for restore → verify NORMAL (AlarmManager again).
5. Open app → verify watchdog runs, finds state cleared, shows no banner.

**Scenario 6 — Permission revoke between schedule and fire:**
1. Schedule mosque mode.
2. Go to Android Settings → DND Policy → revoke Sukoon's DND access.
3. Wait for iqamah → verify phone does NOT go silent (receiver correctly aborts).
4. Open app → verify permission-lost banner appears, not "Mosque Mode Active."

**Scenario 7 — OEM aggressive kill (Xiaomi/Samsung):**
1. On a Xiaomi or Samsung device with aggressive battery optimization, schedule mosque mode.
2. Lock screen and put in pocket for 20+ minutes (let Doze kick in).
3. Verify iqamah fires correctly (`setExactAndAllowWhileIdle` should survive Doze — but OEM may not).
4. If missed: verify WorkManager check-in fires within 5 minutes of restoreTime and posts the "restore now" notification.
5. Tap notification → verify `manuallyRestoreRinger()` called, phone goes NORMAL.

**Scenario 8 — Verify failed (OEM no-ops setRingerMode):**
1. This requires mocking `AudioManager.getRingerMode()` to return NORMAL after `setRingerMode(SILENT)`.
2. In a test build, add a flag `sukoon_debug_force_verify_fail = true` in SharedPreferences.
3. `MosqueModeReceiver` checks this flag and skips actually setting the mode.
4. Verify `mosque_verify_failed` is written to SP.
5. Open app → verify "couldn't silence" banner appears.

**Scenario 9 — Manual restore from notification:**
1. Simulate restore alarm failure (stop the alarm service via ADB or test flag).
2. Wait for `restoreTime + 5 minutes`.
3. Verify WorkManager check-in fires and posts "restore now" notification.
4. Tap notification → verify app opens, `manuallyRestoreRinger()` is called, phone goes NORMAL.
5. Verify notification is dismissed.

**Scenario 10 — DST transition during window:**
1. Schedule mosque mode to span a DST transition (edge case in countries with DST).
2. Verify iqamahTime and restoreTime are stored as epoch milliseconds (absolute), not as local time strings. If stored correctly, DST has no effect.
3. Verify the phone goes silent and restores at the correct wall-clock times.

### 8.3 Manual Scenarios — iOS

**Scenario 1 — Happy path reminder:**
1. Enable mosque mode on iPhone.
2. Set iqamah offset.
3. Wait for the 5-minute pre-iqamah notification.
4. Verify notification appears on lock screen with correct text.
5. Verify iqamah-time notification appears.
6. Verify restore-reminder notification appears after silent duration.

**Scenario 2 — iOS notification budget check:**
1. Enable mosque mode with 7-day horizon scheduled.
2. Call `getAllScheduledNotificationsAsync()` and verify count ≤ 64 total (prayer + mosque mode).
3. Verify mosque mode notifications are limited to 2-day horizon (≤ 18 slots for mosque mode).

**Scenario 3 — Shortcuts integration (manual):**
1. Follow the in-app Shortcuts setup instructions.
2. Create an automation triggered by the mosque mode calendar event.
3. Verify DND activates at iqamah time via Shortcuts.
4. Verify DND deactivates after the configured duration.

---

## 9. Migration Plan (Phased)

### Phase 1 — Bare-Minimum Guarantee (BLOCKER — ship this first)

**Scope:** Eliminate the "stuck silent" scenario. This is the #1 user-facing failure mode. All other phases are improvements; this is the non-negotiable.

**Files touched:**
- `src/hooks/useMosqueMode.ts` — add foreground watchdog call on `currentTime` tick
- `src/hooks/useAppStateChange.ts` — no change needed (already exists)
- `src/services/MosqueModeService.ts` — add `runForegroundWatchdog()` that checks `isCurrentlyActive()` + `getRingerMode()` and calls `manuallyRestoreRinger()` if stuck
- `src/utils/mosqueModePlatform.ts` — update iOS copy to explicitly say "automatic on Android, reminder on iPhone"
- `src/components/mosque/MosqueModeStatus.tsx` — add "stuck silent" recovery banner state

**What this does:**
- Every time the app is opened after iqamah, if the restore alarm was missed and the phone is still silent, it auto-restores.
- The 60-second tick also checks this — if the user leaves the app open through prayer, it catches the restore within 60 seconds of the restoreTime passing.

**What this does NOT do:** cross-process persistence, boot re-arming, WorkManager check-in, verify-on-apply. Those come in Phase 2.

**Ship criteria:**
- Scenario 5 (force kill + open app) passes: after force-kill and iqamah passing, opening the app restores the ringer automatically.
- Scenario 2 (restore time passes with app open): ringer is restored within 60 seconds.
- No regression on happy path (Scenario 1).

**Estimated effort:** ~2–4 hours. Small and focused.

---

### Phase 2 — SharedPreferences Persistence + Boot Re-arm

**Scope:** Mosque mode state survives reboot and process kill without opening the app.

**Files touched:**
- `plugins/withRingerMode.js` — add `MosqueModePrefsModule.java` (new native module), update `RingerModeModule.java` to write SP on schedule/clear, update `MosqueModeReceiver.java` to verify ringer and write `mosque_verify_failed` / `mosque_restore_verify_failed` flags
- `plugins/withAndroidManifest` section of `withRingerMode.js` — register `MosqueModePrefsModule` in the package
- `src/services/RingerControlService.ts` — surface structured `{ success, verified, actualMode }` return from `setRingerMode`
- `src/services/MosqueModeService.ts` — write state to SP via `MosqueModePrefsModule` on scheduling; read SP in watchdog; add `rearmFromPersistence()` for boot path
- `src/tasks/notificationBootRescheduleTask.ts` — call `MosqueModeService.rearmFromPersistence()` after `reconcileScheduling`
- `src/hooks/useMosqueModeWatchdog.ts` — new hook; reads SP flags on foreground transition; handles `verify_failed` and `restore_verify_failed`

**Ship criteria:**
- Scenario 3 (reboot before iqamah): phone silences after reboot. Passes on stock Android and at least one OEM (Samsung).
- Scenario 4 (reboot during silent window): boot task re-applies silent and re-arms restore.
- Scenario 5 (force kill): still passes from Phase 1, but now also verified via SP (not just MMKV).
- Scenario 8 (verify failed): banner appears on next app open.

**Estimated effort:** ~1–2 days. Touches native plugin code (requires `expo prebuild --clean` to test).

---

### Phase 3 — WorkManager Check-In + Failure Notification

**Scope:** Even if the user never opens the app after prayer, they get a notification if the ringer wasn't restored.

**Files touched:**
- `plugins/withRingerMode.js` — add `MosqueModeCheckInWorker.java` (WorkManager Worker that reads SP flags and posts notification if restore failed)
- `src/services/MosqueModeService.ts` — schedule WorkManager task at `restoreTime + 5 min` after successfully arming mosque mode; cancel it on successful restore
- `src/services/notifications/` — new `MosqueModeFailureNotification.ts` that schedules the "restore now" notification via expo-notifications with a deeplink action
- `src/utils/mosqueModePlatform.ts` — add notification strings (already designed in Section 7)

**Ship criteria:**
- Scenario 9 (WorkManager check-in): passes. The "restore now" notification fires within 5 minutes of `restoreTime` if the restore alarm was missed. Tapping it restores the ringer.
- No regression on Scenarios 1–5.

**Estimated effort:** ~1 day. Most complexity is in the WorkManager registration and notification deeplink.

---

### Phase 4 — iOS Two-Notification + Restore Reminder

**Scope:** Improve the iOS reminder from "one soft notification" to "two notifications + unmute reminder." This is a quality improvement, not a guarantee gap.

**Files touched:**
- `src/services/MosqueModeService.ts` — replace `scheduleIOSReminder()` single notification with a three-notification sequence (5-min warning, iqamah-time, restore-reminder)
- `src/services/MosqueModeService.ts` — enforce 2-day horizon for iOS mosque mode notifications (iOS budget constraint)
- `src/utils/mosqueModePlatform.ts` — add new iOS-specific notification strings (iosIqamahBody already exists at line 75)
- `src/services/notifications/NotificationChannels.ts` — add iOS category for mosque mode reminder with no action buttons (prevents grouping)

**Ship criteria:**
- Scenario 1 (iOS happy path): three notifications fire at the correct times.
- Total scheduled notification count with mosque mode active ≤ 64 on iOS (verified by `getAllScheduledNotificationsAsync()`).

**Estimated effort:** ~3–4 hours.

---

### Phase 5 — OEM Battery Optimization Guidance + Exact Alarm Warning

**Scope:** Surface the OEM battery kill risk in the UI, and warn when exact alarm permission is missing.

**Files touched:**
- `src/components/mosque/MosqueModeOptions.tsx` — add Android-only "Battery Optimization" row (detect Xiaomi/Samsung/Huawei via `Device.manufacturer`; deeplink to OEM battery exemption settings)
- `src/services/MosqueModeService.ts` — check `alarmManager.canScheduleExactAlarms()` (already exists in `FullAdhanScheduler`) before scheduling mosque mode; return a `scheduling_precision` field in the result
- `src/screens/MosqueMode/MosqueModeScreen.tsx` — surface inexact alarm warning banner if `scheduling_precision === 'inexact'`

**Ship criteria:**
- On a device without `SCHEDULE_EXACT_ALARM`, the inexact alarm warning banner appears after scheduling mosque mode.
- On Xiaomi/Samsung, the Battery Optimization row appears with the correct deeplink.

**Estimated effort:** ~4–6 hours.

---

### Phase 6 — iOS Shortcuts Integration (Optional, Phase N)

**Scope:** Document and surface the iOS Shortcuts setup path.

**Files touched:**
- `src/components/mosque/MosqueModeOptions.tsx` — add iOS-only "Shortcuts Setup" section (expandable, with numbered steps and deeplink to Shortcuts app)
- `src/utils/mosqueModePlatform.ts` — add `shortcutsSetupSection` copy block

**Ship criteria:**
- The section renders correctly on iOS with the correct copy and a working deeplink to the Shortcuts app (`shortcuts://`).
- Android does not render this section.

**Estimated effort:** ~2 hours (copy-heavy, code-light).

---

## 10. Open Questions

1. **SharedPreferences concurrency on MosqueModeReceiver.** The receiver's `onReceive()` runs on the main thread of its process. Writing to SharedPreferences via `apply()` is async. If the device receives two intents rapidly (e.g., ENABLE immediately followed by a spurious RESTORE), can the async write from ENABLE land after the RESTORE read? Should we use `commit()` (synchronous) in the receiver to prevent this? Assess the performance impact of synchronous SP writes in a BroadcastReceiver.

2. **WorkManager vs AlarmManager for the check-in task.** WorkManager tasks are subject to job dequeuing under Doze and extreme battery saver. An AlarmManager `setAndAllowWhileIdle` would be more reliable for the check-in, but adds another alarm to manage. What is the acceptable delay for the "restore now" notification? If 5–10 minutes is acceptable, WorkManager is fine. If it needs to fire within 1 minute of the window end, use AlarmManager.

3. **MosqueModeReceiver RESTORE Intent extras survival.** The current restore alarm puts `mode = restoreMode` in the Intent extras. If the system re-delivers the Intent after a restart (Android's `FLAG_UPDATE_CURRENT` semantics), are the extras preserved? Test explicitly: cancel and re-schedule the alarm, then read the extras on the receiver. If extras are not guaranteed, the RESTORE receiver must read `mosque_restore_mode` from SharedPreferences instead of relying on Intent extras.

4. **`canScheduleExactAlarms()` vs. OEM behavior.** On Xiaomi MIUI 14+, `alarmManager.canScheduleExactAlarms()` returns `true` even when the OEM has battery restrictions that prevent exact alarm delivery. Has this been tested on a physical Xiaomi device? If `canScheduleExactAlarms()` is unreliable as a proxy for "alarm will actually fire," the pre-iqamah notification fallback (which currently uses `scheduleLocalNotificationAsync`) becomes the primary reliability path.

5. **`expo-calendar` permission for iOS Shortcuts automation.** Triggering a Shortcut via calendar event requires `NSCalendarsUsageDescription` in the plist and a user permission grant. Is the Shortcuts calendar automation path worth the additional permission ask during iOS onboarding? An alternative is a URL scheme-based trigger that the user manually invokes via the Shortcuts app, requiring no calendar permission.

6. **BOOT_COMPLETED delivery reliability on Xiaomi MIUI.** On some MIUI builds, `BOOT_COMPLETED` is not delivered to apps that are not in the "Protected Apps" list unless the user has manually whitelisted them. If the boot receiver does not fire, mosque mode alarms are never re-armed after reboot. Can we test this on a MIUI device without Protected Apps whitelist? The in-app battery optimization guidance (Phase 5) is the mitigation, but we need to confirm the failure mode is real on current MIUI versions.

7. **Silent window overlap with incoming call ringer behavior.** When the phone is in SILENT mode and an incoming call arrives, some Android OEM variants play a ringtone anyway (treating calls as higher priority than the SILENT ringer mode). If we use VIBRATE mode instead of SILENT, this behavior is more consistent across OEMs. Is the default for mosque mode to use VIBRATE (respects call ringer) or SILENT (suppresses calls entirely)? The current setting is `useVibrateInsteadOfSilent: false` (SILENT by default). This choice needs a deliberate UX decision: is prayer so important that calls should be suppressed? Or should the user's mosque always allow emergency calls via vibration?

8. **Phase 2 rollout gating.** Phase 2 requires `expo prebuild --clean` and native code changes to the Ringer plugin. This cannot be shipped as an OTA JavaScript update. It requires a new binary release to both stores. Does the release cadence allow a Phase 1 JS-only patch (which can be shipped OTA via EAS Update) followed by Phase 2 as a separate binary release? Confirm with the product owner.

9. **iOS notification category for mosque mode.** The current mosque mode iOS notification uses a category that may be grouped with other mosque mode notifications in the notification center. On iOS 15+, notification summaries can collapse them. Should the iqamah notification use `UNNotificationInterruptionLevel.timeSensitive` (which bypasses Focus Modes)? This requires the `com.apple.developer.usernotifications.time-sensitive` entitlement. Does Sukoon have or plan to request this entitlement?

10. **Watchdog 30-second interval battery impact.** The periodic watchdog during an active window polls `getRingerMode()` every 30 seconds via the native bridge. This is low cost but non-zero. On a 15-minute prayer window, this is 30 bridge calls. Is this acceptable? An alternative is a single `setTimeout` at `restoreTime + 30 seconds` instead of polling, which would be cheaper but less reactive to mid-window failures.

---

## Summary Reference

**Phase plan:**

| Phase | What | Effort | Delivery |
|-------|------|--------|----------|
| 1 | Foreground watchdog (auto-restore on app open) | 2–4 h | OTA JS update |
| 2 | SharedPreferences persistence + boot re-arm | 1–2 d | Binary release |
| 3 | WorkManager check-in + failure notification | 1 d | Binary release (bundle with Phase 2) |
| 4 | iOS two-notification + restore reminder | 3–4 h | OTA JS update |
| 5 | OEM battery guidance + exact alarm warning | 4–6 h | OTA JS update |
| 6 | iOS Shortcuts integration (optional) | 2 h | OTA JS update |

**Open questions summary (numbered for the senior engineer):**

1. SharedPreferences write concurrency in BroadcastReceiver — use `apply()` or `commit()`?
2. WorkManager vs AlarmManager for check-in task — what is the acceptable delay?
3. RESTORE Intent extras survival across system-rescheduled alarm delivery?
4. `canScheduleExactAlarms()` Xiaomi MIUI 14+ reliability — tested on device?
5. `expo-calendar` permission acceptable for iOS Shortcuts calendar trigger?
6. BOOT_COMPLETED delivery reliability on MIUI without Protected Apps whitelist?
7. SILENT vs VIBRATE default for mosque mode — calls suppressed or vibrated?
8. Phase 1 OTA then Phase 2 binary release cadence — confirmed with product owner?
9. `timeSensitive` notification entitlement for iOS iqamah notification — planned?
10. Watchdog 30-second polling vs single `setTimeout` — battery impact acceptable?
