# Notification Device Validation Checklist

Use this checklist for the final physical-device notification validation pass.

Audio behavior expected after the Expo 55 upgrade:
- Android: short adhan uses the scheduled notification sound; full adhan can wake and play when the phone is locked or the app is closed.
- iPhone: scheduled notifications stay on the short bundled sound; full adhan only continues when the app process is already alive in foreground or background.
- `expo-audio` now owns the app-alive playback path on both platforms, so foreground/background-app-alive playback should honor silent mode and background audio configuration.

Run these scenarios on:
- 1 mid-range Android device
- 1 iPhone

Build requirements:
- `EXPO_PUBLIC_NOTIFICATION_TRACE_ENABLED=true`
- `EXPO_PUBLIC_PERF_VALIDATION_ENABLED=false` unless startup timing is also being reviewed

Pre-check before every scenario:
1. Open the Notification Debug screen.
2. Tap `Clear Notification Trace`.
3. Tap `Refresh Debug Info`.
4. Record:
   - device
   - OS version
   - app build
   - permission status
   - scheduled count
   - trace event count

Post-check after every scenario:
1. Reopen the Notification Debug screen.
2. Screenshot:
   - Notification Trace
   - scheduled count
   - next 3 notifications
3. Record actual behavior and pass/fail.

## Expected trace events

Common events:
- `permission_request_result`
- `reconcile_started`
- `schedule_started`
- `schedule_completed`
- `notification_received`
- `notification_response_handled`
- `initial_response_consumed`
- `rescheduler_app_state_active`
- `rescheduler_check_completed`

Android-specific events:
- `rescheduler_boot_flag_detected`
- `background_task_completed`

## Android scenarios

### 1. Fresh permission grant
Steps:
1. Fresh install the app.
2. Open app.
3. Grant notification permission.
4. Set location.
5. Wait for initial scheduling to complete.

Expected:
- Notifications schedule once.
- No duplicate reminders.
- Scheduled count is greater than zero.

Expected trace:
- `initialize_started`
- `permission_request_result`
- `initialize_completed`
- `reconcile_started`
- `schedule_started`
- `schedule_completed`
- `reconcile_completed`

### 2. Permission denied
Steps:
1. Fresh install the app.
2. Deny notification permission.
3. Complete onboarding.

Expected:
- App remains usable.
- No notification scheduling occurs.

Expected trace:
- `permission_request_result` with denied status
- `initialize_permissions_missing` or `schedule_skipped_permission`

### 3. Permission revoked later
Steps:
1. Start from a granted state with scheduled notifications.
2. Revoke notification permission from Android app settings.
3. Reopen the app.

Expected:
- Revoked state is detected.
- No silent scheduling success path remains.

Expected trace:
- `permission_status_checked`
- `schedule_skipped_permission` or `reconcile_skipped`

### 4. Killed-app notification tap
Steps:
1. Schedule a near-term notification.
2. Kill the app fully.
3. Tap the notification.

Expected:
- Correct app screen opens.
- Tap is handled once only.

Expected trace:
- `initial_response_hydrated`
- `initial_response_consumed`
- `notification_response_handled`

### 5. Reboot recovery
Steps:
1. Ensure notifications are already scheduled.
2. Reboot the device.
3. Open the app after boot.

Expected:
- Notifications are reconciled once.
- No duplicate schedule storm.

Expected trace:
- `rescheduler_boot_flag_detected`
- `reconcile_started` with `reason=boot`
- `schedule_started`
- `schedule_completed`

### 6. Battery saver enabled
Steps:
1. Enable battery saver.
2. Open app.
3. Force reschedule.
4. Observe reminder behavior if a near-term test is available.

Expected:
- Scheduling still completes.
- No crash or loop.

### 7. Doze / idle mode
Steps:
1. Schedule a near-term reminder.
2. Put the device idle with screen off long enough to enter idle state.
3. Observe actual delivery timing.

Expected:
- No duplicate delivery.
- No obvious miss in normal conditions.

Record:
- expected fire time
- actual fire time
- perceived drift

### 8. Exact alarm denied or unavailable
Steps:
1. Put device in a state where exact alarms are denied or unavailable.
2. Open app.
3. Force reschedule.

Expected:
- App degrades cleanly.
- Exact alarm state is visible in debug/trace.

Expected trace:
- `schedule_completed` with `exactAlarmStatus=denied` or similar

### 9. Android full adhan while locked
Steps:
1. Enable `Adhan Sound`.
2. Enable `Full Adhan (Locked Screen)`.
3. Schedule or trigger a near-term prayer reminder.
4. Lock the phone before the reminder fires.

Expected:
- The short notification sound is not used for the main prayer reminder.
- Full adhan playback starts from the Android native alarm/service path.
- Opening the app afterward does not trigger a second overlapping adhan.

Expected trace:
- `schedule_completed` with an exact-alarm status value
- one notification delivery path only

### 10. Android full adhan with app terminated
Steps:
1. Keep `Full Adhan (Locked Screen)` enabled.
2. Force stop or swipe away the app.
3. Trigger a near-term prayer reminder.

Expected:
- Full adhan still plays.
- No duplicate playback begins when the app is reopened.

### 11. Timezone change
Steps:
1. Start from a scheduled state.
2. Change timezone.
3. Reopen app.

Expected:
- One clean reschedule.
- No duplicate notifications.

Expected trace:
- `rescheduler_invalidation_detected` with `reason=timezone_change`
- `rescheduler_reconcile_triggered`
- `schedule_completed`

### 12. Manual location change
Steps:
1. Start from a scheduled state.
2. Change location in app.
3. Observe reschedule.

Expected:
- Old reminders replaced.
- No duplicate buildup.

Expected trace:
- `rescheduler_invalidation_detected` with `reason=location_change` or a settings-driven reconcile
- `schedule_completed`

## iPhone scenarios

### 1. Fresh permission grant
Expected:
- Same core init and schedule flow as Android.
- No exact alarm fields.

### 2. Permission denied
Expected:
- App remains usable.
- Scheduling skips cleanly.

Expected trace:
- `permission_request_result`
- `schedule_skipped_permission` or equivalent skip

### 3. Permission revoked later
Steps:
1. Start from a granted state with scheduled notifications.
2. Revoke permission in iOS Settings.
3. Reopen app.

Expected:
- Revoked state detected.
- No fake “scheduled successfully” state.

### 4. Killed-app notification tap
Steps:
1. Schedule a near-term notification.
2. Kill app fully.
3. Tap notification.

Expected:
- Correct app state opens.
- Tap handled exactly once.

Expected trace:
- `initial_response_hydrated`
- `initial_response_consumed`
- `notification_response_handled`

### 5. 12h+ resume
Steps:
1. Leave the app backgrounded for 12+ hours.
2. Resume app.

Expected:
- Rescheduler runs once.
- No schedule storm.

Expected trace:
- `rescheduler_app_state_active`
- `rescheduler_check_started`
- threshold-triggered reconcile or stale refresh detection
- `reconcile_completed`

### 6. iOS full adhan with app alive in background
Steps:
1. Enable `Adhan Sound`.
2. Put the app in the background without terminating it.
3. Trigger a near-term prayer reminder.

Expected:
- The scheduled notification uses the short bundled iOS sound.
- After tapping/opening back into the app-alive process, full adhan can continue from the runtime audio path.
- No claim or behavior suggests terminated-state full adhan support.

### 7. iOS terminated-state reminder
Steps:
1. Enable `Adhan Sound`.
2. Fully terminate the app.
3. Trigger a near-term prayer reminder.

Expected:
- Only the short bundled notification sound is heard.
- Reopening the app does not retroactively start a full adhan unless the user explicitly triggers playback flow.

### 8. Timezone change
Expected:
- One clean reconcile.
- No duplicate reminders.

Expected trace:
- `rescheduler_invalidation_detected` with `reason=timezone_change`

### 9. Manual location change
Expected:
- One clean reschedule.
- Old reminder set replaced.

### 10. iOS scheduled notification cap behavior
Steps:
1. Force reschedule.
2. Inspect scheduled count.

Expected:
- Scheduled count stays within budget.
- Core prayer reminders still exist.

## Failure conditions

Stop and fix before continuing if any of these happen:
- repeated `schedule_started` or `schedule_completed` loops from one action
- killed-app tap does not produce `initial_response_consumed`
- scheduled count keeps climbing after repeated reschedules
- timezone or location changes create duplicate reminders
- permission denial causes repeated prompts or modal loops

## Pass/fail record template

Use one row per scenario.

| Device | OS | Build | Scenario | Expected | Actual | Trace highlights | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |

## Production signoff criteria

Notification validation is good enough for production when:
- permission flows degrade cleanly on both platforms
- killed-app taps work on both platforms
- reboot, timezone change, and location change each produce one clean reconcile
- no duplicate reminders appear after repeated app opens or settings changes
- scheduled count remains bounded
- Android exact-alarm state is visible and understandable
- Android full adhan works while locked and after termination
- iPhone full adhan behavior is correct only while the app process is alive
- no silent failure pattern appears in trace logs
