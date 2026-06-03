# Notification Scheduling Authority — Design & Migration Plan

**Repository:** Sukoon (`feature/notification-prayer-times-hardening`)  
**Document date:** 2026-05-28  
**Author:** Claude Code (Sonnet 4.6) — design only; no code changes in this pass  
**Status:** Approved direction. Implementation starts Phase 1.

---

## 0. Executive Summary

The goal is a single, deterministic `NotificationAuthority` that owns every
local notification the app schedules — prayer adhans, pre-prayer, habit-builder
tiers, Jummah, Ramadan, Eid, Tahajjud, keep-alive — with one shared slot budget,
one cross-process-safe lock, and zero-network-call boot behaviour. The result is
identical delivery on Android and iOS with no margin for concurrency races,
stale fingerprints, or silent slot overflow.

The ten concrete failure modes documented in
`docs/audit/02-engineering-notifications-security.md` drive every decision below.
Each problem is cited in Section 1 before the design responds in Sections 2–6.

---

## 1. Current-State Problems (Findings Reference)

### Problem 1 — God Object (2,236-line `NotificationService`)

`src/services/NotificationService.ts` owns permission management, the 6-pass
horizontal scheduler, cancellation, Android exact-alarm status, the MMKV
scheduling lock, fingerprint comparison, ledger integration, notification
response/tap handling, adhan audio playback, snooze scheduling, mindfulness
reminders, Tahajjud scheduling, test notifications, keep-alive, a debug-info
method, and the `prayerTimesFetcher` injection point — 12 distinct
responsibilities in one class. A one-line change to the fingerprint or the lock
acquisition touches the same file as a copy-edit to a prayer notification body.
Risk surface is the entire file.

### Problem 2 — `useStore.getState()` in Service Layer

`NotificationService.ts` calls `useStore.getState()` at:
- Line 797: `useStore.getState().setPendingMosquePromptPrayer(...)` — inside
  `handleNotificationResponse`, which is reachable from the notification response
  listener registered in the foreground **and** theoretically from a headless task
  context if the OS delivers a notification response during headless boot.
- Line 1974: `const storeState = useStore.getState()` — inside `getDebugInfo`.

In a headless JS task (Android boot via `BootNotificationRescheduleTaskService`)
the React runtime is not present and Zustand's singleton store is populated only
if `useStore` was previously imported into the task bundle. Depending on
tree-shaking, this either throws or returns the default initial state (all nulls),
silently corrupting the debug state snapshot. The real blocker is the architectural
violation: a service layer must not import the UI store.

### Problem 3 — Supplemental Services Outside the Shared Slot Budget

`JummahNotificationService`, `EidNotificationService`,
`RamadanCountdownService`, and `scheduleTahajjudEncouragement` (inside
`NotificationService`) each call
`Notifications.getAllScheduledNotificationsAsync()` independently and compare the
result against `IOS_NOTIFICATION_CAP = 58`. They run from `useServiceInitialization`
**concurrently with** `scheduleExtendedNotifications`. The budget snapshot each
service sees is stale by the time it acts on it. On a day with Ramadan countdown
+ Jummah (Friday) + Eid + the main prayer schedule all running simultaneously,
the OS slot count can silently exceed 64 — iOS will start dropping the
lowest-priority ones without any error.

Concrete worst case (iOS, Friday during Ramadan, Eid pending):
- Main scheduler: up to 58 slots consumed
- Jummah (5 notifications): 5 more → 63
- Ramadan (2 notifications): 2 more → 65 — **over limit, silent drop**
- Eid: additional slots if Hijri date matches

### Problem 4 — Process-Local Lock (MMKV)

`acquireSchedulingLock()` and `releaseSchedulingLock()` at lines 221–234 read
and write `notification_scheduling_lock` via `StorageService`, which ultimately
writes to MMKV. MMKV is a memory-mapped file that is **process-local** — each
process has its own memory map. The Android headless boot task
(`BootNotificationRescheduleTaskService`) runs in a separate process from the
foreground app. If the user opens the app exactly when the boot task starts, both
processes read the lock key independently (both find it absent or stale), both
acquire it, and both proceed with a full schedule rebuild simultaneously — a
notification storm of up to 2× the normal slot count.

SharedPreferences (`MODE_PRIVATE` with `.apply()`) in Android uses a
cross-process file lock and is safe across processes. The existing
`BootPrefsModule` / `NotificationRescheduleWorker` already demonstrates this
pattern (`sukoon_boot_prefs`).

### Problem 5 — Zero-Notification Window During Cancel-Before-Schedule

`scheduleExtendedNotifications` at line 1696 calls
`cancelAllPrayerNotifications()` before any new notifications are scheduled.
If the process is killed after the cancel but before scheduling completes (low
memory kill, force-quit, OEM battery optimizer), the device has **zero** prayer
notifications scheduled and the user will miss prayers silently. The fingerprint
is saved only after all passes complete (line 1838), so the stale fingerprint
forces a full rebuild on next launch — but that next launch may be hours later.

### Problem 6 — Network Calls in 60-Second Headless Budget

`runBootNotificationRescheduleTask` calls `reconcileScheduling('boot')` which
calls `scheduleExtendedNotifications`, which fetches prayer times with a `for`
loop: `await fetcher(...)` per day. On Android the horizon is 7 days.
`PRAYER_API_TIMEOUT_MS = 8_000` ms per request. Worst case: 7 × 8 s = 56 s.
Adding MMKV init, JS bundle parse, and scheduling overhead easily exceeds the
60 s budget (`HeadlessJsTaskConfig` timeout in `withBootReceiver.js` line 197).
A budget overrun kills the task silently — partial schedule, no error surfaced.

### Problem 7 — Millisecond-Precision Fingerprint

`buildNotificationScheduleFingerprint` at line 39 of
`src/utils/notificationScheduleFingerprint.ts` includes:

```typescript
prayerTimes: prayerTimes.map((prayer) => ({
  name: prayer.name,
  timestamp: prayer.time.getTime(),  // milliseconds since epoch
})),
```

Prayer times fetched from the Aladhan API are in HH:MM format and converted to
`Date` objects. A DST transition, adjustment re-parse, or even a sub-second
system clock correction can produce a 1 ms difference for the same calendar
prayer time, causing the fingerprint to differ and triggering a full cancel +
rebuild unnecessarily. The `timezoneOffset: new Date().getTimezoneOffset()` term
compounds this: it is captured at fingerprint-build time (which may differ
between the moment settings are saved and the moment scheduling runs).

### Problem 8 — DST Retry Storm

In `useNotificationRescheduler.ts` at line 178:

```typescript
if (rescheduled || savedOffset === null) {
  StorageService.setValue('notification_utc_offset', currentOffset.toString());
}
```

If the reschedule triggered by a DST change fails (network unavailable, API
timeout), `rescheduled` is `false` and `savedOffset` is non-null, so
`notification_utc_offset` is **not updated** to the new offset. On every
subsequent app resume, `savedOffset !== currentOffset` is still true, and the
same failed reschedule is attempted again. If the network is down for hours (e.g.
during international travel), the app retries on every resume — a storm of
network requests that all fail, none updating the persisted offset.

### Problem 9 — `NotificationLedger` Full JSON Parse+Serialize Per Write

Every call to `recordScheduled`, `recordDelivered`, or `recordTapped` calls
`getEntries()` (full `JSON.parse` of up to 200 entries) and then `saveEntries()`
(full `JSON.stringify` + MMKV write). A single scheduling cycle for a 7-day
Android horizon with Tier 1 + Tier 2 + Tier 3 + keep-alive produces
approximately 7 days × 5 prayers × (1 adhan + 1 pre-prayer + 3 Tier-2 + 1
Tier-3) = ~140 write events. Each event parses and re-serializes the entire
200-entry array → ~140 full-roundtrip JSON operations per schedule cycle.

### Problem 10 — No Delivery Observability

The ledger records `deliveredAt` when the foreground notification listener fires,
but if the app is in the background when the notification fires (the typical
case), `addNotificationReceivedListener` does not fire on iOS at all and fires
only when the notification is displayed (not guaranteed for background delivery).
There is no mechanism to detect: "notification was scheduled 6 hours ago, is now
past its trigger time, but has no `deliveredAt` — was it dropped by the OS?"
Nothing alerts the engineering team when a user's device silently misses prayers.

---

## 2. Target Architecture

### 2.1 Name and Responsibility Boundary

The new orchestrator is `NotificationAuthority` (or `NotificationOrchestrator` —
see Open Question 1). It is the **only** caller of
`Notifications.scheduleNotificationAsync` / `cancelScheduledNotificationAsync` /
`getAllScheduledNotificationsAsync` for all notification kinds. All existing
standalone schedulers (`JummahNotificationService`, `EidNotificationService`,
`RamadanCountdownService`, and the Tahajjud methods in `NotificationService`)
become **plan generators** — pure functions that return
`PlannedNotification[]` given a `ScheduleContext`. The authority collects all
plans, runs them through `BudgetAllocator`, and applies them in one atomic pass.

```
                 ┌──────────────────────────────────┐
                 │       NotificationAuthority       │
                 │  (single point of schedule truth) │
                 └──────────┬───────────────────────┘
                            │ owns
         ┌──────────────────┼──────────────────────┐
         ▼                  ▼                      ▼
  ScheduleLock        BudgetAllocator          LedgerV2
  (SharedPrefs)    (slot priority queue)   (append-only log)
         │                  │                      │
         └──────────────────┴──────────────────────┘
                            │ consumes
      ┌─────────────────────┼──────────────────────┐
      ▼                     ▼                      ▼
PrayerPlanGenerator  SupplementalPlanGenerator  KeepAlivePlan
(Tier1/2/3/pre)     (Jummah/Ramadan/Eid/Tahajjud)  Generator
```

### 2.2 Public API Surface

```typescript
// src/services/NotificationAuthority.ts

export interface AuthorityReadiness {
  permissionGranted: boolean;
  exactAlarmStatus: ExactAlarmStatus | 'not_applicable';
  coreReady: boolean;
  adhanAudioReady: boolean;
  blockedReason: NotificationBlockedReason;
  checkedAt: string; // ISO timestamp
}

export interface ScheduleResult {
  status: 'scheduled' | 'scheduled_degraded' | 'skipped_fingerprint' |
          'blocked' | 'failed' | 'locked';
  reason: NotificationSchedulingReason;
  blockedReason?: ScheduleBlockedReason;
  slotsSummary?: SlotsSummary;
  fingerprintChanged: boolean;
  durationMs: number;
}

export interface SlotsSummary {
  tier1Adhan: number;
  prePrayer: number;
  jummah: number;
  ramadanEid: number;
  tahajjud: number;
  habitTier2: number;
  habitTier3: number;
  keepAlive: number;
  total: number;
  iosCap: number; // IOS_NOTIFICATION_CAP constant (58)
}

export interface DeliveryMissEvent {
  notificationId: string;
  label: string;
  scheduledFor: string;  // ISO
  scheduledAt: string;   // ISO
  missDetectedAt: string; // ISO
  minutesPastDue: number;
}

// ── Core lifecycle ──────────────────────────────────────────────

/**
 * Initialize channels, categories, audio mode. Safe to call multiple times.
 * Does NOT request permissions. Does NOT schedule anything.
 */
initialize(options?: { requestPermissions?: boolean }): Promise<boolean>;

/**
 * Read permission + exact-alarm state. Does not modify any schedule.
 * Persists result to MMKV for fast reads during headless boot.
 */
getReadiness(settingsOverride?: UserSettings | null): Promise<AuthorityReadiness>;

// ── Scheduling ──────────────────────────────────────────────────

/**
 * Main entry point. Evaluates fingerprint, acquires cross-process lock,
 * fetches or uses cached prayer times, generates all plans, allocates
 * budget, and applies the swap-then-cancel rebuild.
 *
 * @param reason   What triggered this call — surfaced in traces and ledger.
 * @param options.force      Skip fingerprint check; always rebuild.
 * @param options.diskOnly   Boot mode: use disk-cache only, no network.
 * @param options.onProgress Optional UI progress callback (day, total).
 */
reschedule(
  reason: NotificationSchedulingReason,
  options?: {
    force?: boolean;
    diskOnly?: boolean;
    onProgress?: (day: number, total: number) => void;
  }
): Promise<ScheduleResult>;

/**
 * Cancel ALL Sukoon-owned notifications (prayer + supplemental + keep-alive).
 * Also cancels native AdhanModule alarms.
 * Does NOT cancel MosqueMode notifications (those are owned by MosqueModeService).
 */
cancelAll(): Promise<void>;

// ── Delivery observability ──────────────────────────────────────

/**
 * Called from the foreground notification-received listener.
 * Records delivery in LedgerV2. Idempotent.
 */
recordDelivered(notificationId: string): void;

/**
 * Called from the notification-response listener (tap/action).
 * Records tap in LedgerV2. Idempotent.
 */
recordTapped(notificationId: string): void;

/**
 * On app foreground: compare scheduled-but-undelivered ledger entries whose
 * trigger time has passed against the OS scheduled list. Entries that are past
 * due but not in the OS list and not yet delivered are "missed".
 * Returns the missed events for optional telemetry upload.
 */
verifyDeliveryWindow(): Promise<DeliveryMissEvent[]>;

// ── Introspection ───────────────────────────────────────────────

/**
 * Returns per-tier counts from the live OS scheduled list.
 * Does NOT call getAllScheduledNotificationsAsync more than once per call.
 */
getScheduledCounts(): Promise<SlotsSummary>;

/**
 * Full debug snapshot: readiness + counts + recent ledger entries + trace log.
 * Safe to call from any context (does not import useStore).
 */
getDebugSnapshot(): Promise<DebugSnapshot>;

// ── Permission management ───────────────────────────────────────

requestPermissionsFromUser(): Promise<AuthorityReadiness>;
openExactAlarmSettingsIfNeeded(): Promise<boolean>;

// ── Response handling (foreground) ─────────────────────────────

/**
 * Register a callback the authority invokes on notification tap.
 * This removes the useStore.getState() call from the service layer.
 * Set to null to unregister.
 */
registerMosquePromptHandler(
  handler: ((prayer: PrayerName) => void) | null
): void;

registerNavigationHandler(
  handler: ((prayer: PrayerName, action: string) => void) | null
): void;

// ── Audio (delegated to AdhanPlayer / FullAdhanScheduler) ───────

playAdhan(onComplete?: () => void): void;
stopAdhan(): void;

// ── Compatibility shims (deprecated — remove after Phase 2) ────

/** @deprecated Use reschedule('settings_change') */
scheduleAllPrayerNotifications(): Promise<void>;

/** @deprecated Use reschedule('background_refresh') with threshold check */
maybeRescheduleExtendedNotifications(
  hoursThreshold?: number,
  reason?: NotificationSchedulingReason
): Promise<boolean>;
```

### 2.3 Internal State Machine

The authority has an explicit internal state that governs every public call:

```
States:
  idle       — no scheduling in progress; lock not held
  planning   — fetching prayer times + building plans (no OS mutations yet)
  applying   — writing new notifications to OS (after old ones not yet cancelled)
  verifying  — post-schedule count validation
  error      — transient failure; transitions to idle on next reschedule attempt

Transitions:
  idle      ──[reschedule() called]──────────────────► planning
  planning  ──[fingerprint unchanged + force=false]──► idle   (ScheduleResult.status = 'skipped_fingerprint')
  planning  ──[lock not acquired]────────────────────► idle   (ScheduleResult.status = 'locked')
  planning  ──[plans built successfully]─────────────► applying
  planning  ──[fatal error]──────────────────────────► error → idle
  applying  ──[all new notifications scheduled]───────► verifying
  applying  ──[process killed mid-apply]──────────────► (lock stale; next reschedule heals)
  verifying ──[count ≥ 1 main prayer]─────────────────► idle  (status = 'scheduled' | 'scheduled_degraded')
  verifying ──[count = 0 main prayer]─────────────────► error (triggers immediate retry via keep-alive path)
  error     ──[reschedule() called]──────────────────► planning

State persisted to:
  MMKV-public: 'authority_state' (idle/planning/applying/verifying/error)
  MMKV-public: 'authority_state_entered_at' (ISO timestamp, for lock-steal timeout)

The persisted state enables a new process (boot task) to detect that a previous
process died in the 'applying' state and must heal.
```

### 2.4 Idempotency Contract

Every planned notification has a **deterministic identifier** derived only from
stable inputs (never from `Date.now()` or random):

```
Tier 1 (adhan):       `prayer-{PrayerName}-{YYYY-MM-DD}`
Pre-prayer:           `pre-{PrayerName}-{YYYY-MM-DD}`
Habit Tier 2:         `tier2-{PrayerName}-{YYYY-MM-DD}-{reminderIndex}`
Habit Tier 3:         `tier3-{PrayerName}-{YYYY-MM-DD}`
Post-prayer check:    `check-{PrayerName}-{YYYY-MM-DD}`
Jummah:               `jummah-{type}-{YYYY-MM-DD}`  (type: morning/preparation/prayer/dua-window/dua)
Ramadan countdown:    `ramadan-countdown-{daysAway}`
Ramadan daily:        `ramadan-daily-day-{ramadanDay}`
Eid:                  `eid-{variant}`  (e.g. eid-fitr-eve, eid-adha-morning)
Takbirat:             `eid-takbir-{dhulHijjahDay}`
Tahajjud:             `tahajjud-{YYYY-MM-DD}`
Keep-alive:           `authority-keepalive`
```

**Same fingerprint = no-op** precisely means: if
`buildFingerprintV2(settings, allDays, hijriDate)` produces the same string as
the stored `notification_schedule_fingerprint_v2`, and `force` is `false`, the
authority returns `ScheduleResult.status = 'skipped_fingerprint'` without
touching the OS schedule. This is only safe because the identifiers above are
deterministic — an unchanged fingerprint guarantees the OS already has the
correct set of notifications.

Dedup within a single schedule cycle: the authority maintains an
`existingIdentifiers: Set<string>` populated from `getAllScheduledNotificationsAsync()`
called **once** at the start of the `applying` phase. Any identifier already in
the set is skipped (the notification is already scheduled correctly). This is
the "repair" path for partially failed previous runs.

---

## 3. Persistence Layout

| Key | Store | Owner | Contents |
|---|---|---|---|
| `notification_schedule_fingerprint_v2` | MMKV-public | Authority | Fingerprint v2 string |
| `last_batch_schedule_date` | MMKV-public | Authority | ISO timestamp of last successful apply |
| `notification_schedule_last_reason` | MMKV-public | Authority | Last reschedule reason |
| `notification_utc_offset` | MMKV-public | Authority | `getTimezoneOffset()` at last success |
| `notification_location_fingerprint` | MMKV-public | Authority | `lat.toFixed(3),lon.toFixed(3)` |
| `authority_state` | MMKV-public | Authority | State machine current state |
| `authority_state_entered_at` | MMKV-public | Authority | ISO of state entry (for stale-lock detection) |
| `notification_scheduling_lock` | **SharedPreferences** (`sukoon_lock_prefs`) | Authority | Unix ms timestamp (cross-process safe) |
| `notification_readiness_permission_status` | MMKV-public | Authority | Last known permission status string |
| `notification_readiness_updated_at` | MMKV-public | Authority | ISO of last readiness check |
| `notification_readiness_blocked_reason` | MMKV-public | Authority | Last blocked reason or absent |
| `android_exact_alarm_status` | MMKV-public | Authority | `granted`/`fallback`/`unsupported` |
| `last_dst_reschedule_attempted_at` | MMKV-public | Authority | ISO of last DST-triggered attempt |
| `last_dst_reschedule_succeeded_at` | MMKV-public | Authority | ISO of last DST success |
| `notification_ledger_v2` | MMKV-public | LedgerV2 | Append-only ring buffer (binary) |
| `needs_notification_reschedule` | **SharedPreferences** (`sukoon_boot_prefs`) | BootPrefsModule | Boolean boot flag (already exists) |

**Why MMKV-public for most keys:** Non-PII scheduling metadata. Fast synchronous
reads. Works pre-init (before encrypted MMKV is unlocked). Safe to lose on
clear-storage events (authority self-heals on next reschedule).

**Why SharedPreferences for the lock:** Cross-process file locking. The existing
`BootPrefsModule` already reads from `sukoon_boot_prefs` — the lock moves to a
new key `notification_scheduling_lock_v2` in a companion `sukoon_lock_prefs`
SharedPreferences file (separate file for cleanliness). An alternative is to
extend `BootPrefsModule` to expose `acquireLock(timeoutMs)` /
`releaseLock()` native methods.

---

## 4. Cross-Process Lock Design

### 4.1 Native Module Extension

Extend `BootPrefsModule.java` (or create a new `ScheduleLockModule.java`)
with these native methods:

```java
// Atomically: read current lock → if absent or stale → write new lock → return true
// If lock held and not stale → return false
@ReactMethod
public void acquireScheduleLock(double timeoutMs, Promise promise) {
    SharedPreferences prefs = getReactApplicationContext()
        .getSharedPreferences("sukoon_lock_prefs", Context.MODE_PRIVATE);
    long now = System.currentTimeMillis();
    long existingLock = prefs.getLong("notification_scheduling_lock_v2", 0L);
    if (existingLock > 0 && (now - existingLock) < (long) timeoutMs) {
        promise.resolve(false); // Lock held
        return;
    }
    prefs.edit().putLong("notification_scheduling_lock_v2", now).commit(); // commit() = synchronous
    promise.resolve(true);
}

@ReactMethod
public void releaseScheduleLock(Promise promise) {
    getReactApplicationContext()
        .getSharedPreferences("sukoon_lock_prefs", Context.MODE_PRIVATE)
        .edit().remove("notification_scheduling_lock_v2").commit();
    promise.resolve(true);
}
```

Key details:
- `.commit()` (not `.apply()`) ensures the write is flushed before returning.
  This provides the linearizability needed for a cross-process lock, at the cost
  of a main-thread disk write (~2 ms). This is acceptable for a lock that is
  acquired once per scheduling cycle.
- The timeout is passed from JS (`SCHEDULING_LOCK_TIMEOUT_MS = 120_000` ms).
- On iOS, the lock is not cross-process (there is no headless boot path), so the
  existing MMKV approach is retained as the iOS lock. A TypeScript-level
  abstraction (`ScheduleLock.acquire()`) hides the platform difference.

### 4.2 TypeScript Lock Abstraction

```typescript
// src/services/authority/ScheduleLock.ts

export class ScheduleLock {
  private static readonly TIMEOUT_MS = SCHEDULING_LOCK_TIMEOUT_MS; // 120_000

  /** Returns true if lock was acquired. */
  static async acquire(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        return await NativeModules.ScheduleLockModule?.acquireScheduleLock(
          ScheduleLock.TIMEOUT_MS
        ) ?? false;
      } catch {
        return false;
      }
    }
    // iOS: MMKV is single-process — retain existing pattern
    const lockTime = StorageService.getValue('notification_scheduling_lock');
    if (lockTime) {
      const elapsed = Date.now() - parseInt(lockTime, 10);
      if (elapsed < ScheduleLock.TIMEOUT_MS) return false;
    }
    StorageService.setValue('notification_scheduling_lock', Date.now().toString());
    return true;
  }

  static async release(): Promise<void> {
    if (Platform.OS === 'android') {
      await NativeModules.ScheduleLockModule?.releaseScheduleLock?.();
      return;
    }
    StorageService.deleteValue('notification_scheduling_lock');
  }
}
```

---

## 5. Schedule-Then-Cancel ("Swap") Rebuild

This directly solves Problem 5 (zero-notification window).

### 5.1 Algorithm

```
Phase A — Plan:
  1. Build all PlannedNotification[] (pure function, no OS calls)
  2. Run BudgetAllocator to get the approved set (respects IOS_NOTIFICATION_CAP)
  3. Record approved plan to MMKV-public (key: 'authority_pending_plan')
     This is the "intent" — survives a process kill

Phase B — Apply (swap):
  1. Schedule ALL new notifications (identifiers from the approved plan)
     - Each successful schedule call: append identifier to MMKV-public
       'authority_applied_ids' ring buffer
     - Idempotency: skip if identifier already in existingIdentifiers set
  2. After ALL new notifications are in the OS:
  3. Read the PREVIOUS plan from MMKV-public (key: 'authority_previous_plan_ids')
  4. Cancel ONLY identifiers in previous_plan_ids that are NOT in the new plan
     (i.e. stale identifiers from the old plan that the new plan no longer needs)
  5. Write current plan's identifiers to 'authority_previous_plan_ids'
  6. Delete 'authority_pending_plan'

Phase C — Verify:
  1. getAllScheduledNotificationsAsync() → count Tier 1 prayer notifications
  2. If count >= 1 future prayer notification: success
  3. If count = 0: emit error, schedule immediate retry in 5 minutes via keepalive
```

This ensures there is **always** at least the old set of notifications in the OS
during the rebuild. The worst case on process-kill is: the new notifications
exist in the OS alongside the old ones temporarily (duplicates for a moment).
Duplicate same-identifier notifications are de-duped by the OS (iOS and Android
both allow re-scheduling the same identifier — the newer one wins).

### 5.2 Plan Storage Schema

```typescript
interface AuthorityPlan {
  fingerprintV2: string;
  createdAt: string;        // ISO
  reason: NotificationSchedulingReason;
  notificationIds: string[];  // all identifiers in this plan
  slotsSummary: SlotsSummary;
}

// MMKV-public keys:
// 'authority_pending_plan'     — plan being applied right now
// 'authority_previous_plan'    — the successfully applied previous plan
//   (used to compute the diff for selective cancellation)
```

---

## 6. Fingerprint V2

Replace the current fingerprint in
`src/utils/notificationScheduleFingerprint.ts`.

### 6.1 What Changes

| Field | V1 | V2 | Rationale |
|---|---|---|---|
| Prayer timestamps | `prayer.time.getTime()` (ms) | `Math.floor(prayer.time.getTime() / 60000)` (minutes) | Eliminates sub-minute noise (DST re-parse, NTP micro-correction) |
| UTC offset | `new Date().getTimezoneOffset()` (live) | **Excluded** | Captured once at reschedule success, not at fingerprint build time |
| Channel version | `NOTIFICATION_CHANNEL_VERSION` | Same | Keep — forces rebuild on channel upgrade |
| Settings hash | Full `notifications` + `prayerNotifications` + `habitBuilder` objects | Same | Keep |
| Hijri date | Not included | `hijriDate: { month: number; day: number }` | Seasonal services (Jummah/Ramadan/Eid) depend on Hijri date; including it invalidates the fingerprint when Hijri date changes |
| Calculation method version | Not included | `calculationMethodVersion: number` (constant, bump when formula changes) | Forces rebuild when Aladhan API calculation is updated |

### 6.2 V2 Signature

```typescript
export interface FingerprintV2Input {
  settings: UserSettings;
  prayerTimesByDay: Array<{
    dateKey: string;      // YYYY-MM-DD
    prayers: Array<{ name: PrayerName; minutesSinceEpoch: number }>;
  }>;
  hijriDate: { month: number; day: number } | null;
  calculationMethodVersion: number;
  channelVersion: number;
}

export function buildFingerprintV2(input: FingerprintV2Input): string {
  return JSON.stringify({
    location: input.settings.location
      ? {
          lat: input.settings.location.latitude.toFixed(3),
          lon: input.settings.location.longitude.toFixed(3),
          tz: input.settings.location.timezone ?? null,
        }
      : null,
    calculationMethod: input.settings.calculationMethod,
    asrJuristic: input.settings.asrJuristic,
    adjustments: input.settings.adjustments,
    notifications: input.settings.notifications,
    prayerNotifications: input.settings.prayerNotifications,
    habitBuilder: input.settings.habitBuilder,
    tahajjudReminders: input.settings.tahajjudReminders ?? null,
    jummahReminders: input.settings.jummahReminders ?? null,
    channelVersion: input.channelVersion,
    calculationMethodVersion: input.calculationMethodVersion,
    hijri: input.hijriDate,
    days: input.prayerTimesByDay,
  });
}
```

Key: minute-precision timestamps mean a timing re-parse that changes by < 60 s
does not flip the fingerprint. A genuine settings change or a prayer time shift
of >= 1 minute does flip it correctly.

---

## 7. iOS Slot Budget — Single Shared Allocator

### 7.1 Priority Order (highest → lowest)

```
Tier 1: Main Adhan (prayer-time)          — hard cap: 5 prayers × schedulingDays
Tier 2: Pre-prayer notifications          — 5 prayers × lowerTierDays
Tier 3: Jummah (up to 5 per Friday)      — scheduled only when Friday in horizon
Tier 4: Ramadan / Eid seasonal            — up to lowerTierDays each
Tier 5: Tahajjud                          — up to lowerTierDays
Tier 6: Habit Builder Tier 3 (grace)      — 5 prayers × lowerTierDays
Tier 7: Habit Builder Tier 2 (reminders) — shed first when budget tight
Tier 8: Keep-alive                        — 1 slot (lowest priority, always shed last by nature of being 1)
```

Wait — keep-alive seems low priority, but it is the self-healing mechanism.
Keep-alive gets 1 guaranteed slot out of the cap by being scheduled last and
given the special treatment: if the cap minus 1 is reached and keep-alive hasn't
been scheduled, evict the last Tier 7 entry to make room. Keep-alive is never
dropped unless the cap is 0 (which cannot happen on a functioning device with
permissions).

### 7.2 BudgetAllocator

```typescript
// src/services/authority/BudgetAllocator.ts

export interface PlannedNotification {
  identifier: string;
  tier: NotificationTier;
  scheduledFor: Date;
  content: Notifications.NotificationContentInput;
  trigger: Notifications.NotificationTriggerInput;
  nativeAudio?: { prayerName: PrayerName; clip: AdhanClip; displayName: string };
  ledgerLabel: string;
}

export type NotificationTier =
  | 'tier1_adhan'
  | 'pre_prayer'
  | 'jummah'
  | 'ramadan_eid'
  | 'tahajjud'
  | 'habit_tier3_grace'
  | 'habit_tier2_reminder'
  | 'keep_alive';

const TIER_PRIORITY: Record<NotificationTier, number> = {
  tier1_adhan:          1,
  pre_prayer:           2,
  jummah:               3,
  ramadan_eid:          4,
  tahajjud:             5,
  habit_tier3_grace:    6,
  habit_tier2_reminder: 7,
  keep_alive:           8,  // Always fits: exactly 1 slot; see scheduling logic
};

export class BudgetAllocator {
  allocate(
    plans: PlannedNotification[],
    cap: number   // IOS_NOTIFICATION_CAP on iOS, Infinity on Android
  ): PlannedNotification[] {
    // Sort by tier priority, then by scheduledFor ascending (soonest first)
    const sorted = [...plans].sort((a, b) => {
      const tierDiff = TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier];
      if (tierDiff !== 0) return tierDiff;
      return a.scheduledFor.getTime() - b.scheduledFor.getTime();
    });

    const approved: PlannedNotification[] = [];
    const keepAlives = sorted.filter(p => p.tier === 'keep_alive');
    const rest = sorted.filter(p => p.tier !== 'keep_alive');

    // Fill up to cap - 1 with non-keep-alive (preserves 1 slot for keep-alive)
    for (const plan of rest) {
      if (approved.length >= cap - 1) break;
      approved.push(plan);
    }

    // Always append keep-alive if any space remains (guaranteed by cap - 1 above)
    if (keepAlives.length > 0 && approved.length < cap) {
      approved.push(keepAlives[0]);
    }

    return approved;
  }
}
```

On Android, `cap = Infinity` and every plan is approved (the Android system has
no hard slot limit enforced at the API level). The allocator still runs to
produce a deterministic ordered list for ledger recording.

---

## 8. Disk-Cache-Only Boot Contract

The headless boot task (called from `runBootNotificationRescheduleTask`) must
satisfy:

### 8.1 What It MAY Do
- Read `StorageService` (MMKV-public + encrypted after initialization)
- Read cached prayer times from `PrayerTimeService`'s disk cache
- Schedule notifications using cached prayer times
- Write scheduling metadata to MMKV-public
- Acquire / release the cross-process lock
- Call `NativeModules.BootPrefsModule.clearBootRescheduleFlag()`

### 8.2 What It MUST NOT Do
- Make network requests (HTTP / DNS)
- Call `useStore.getState()` or import `useStore`
- Call `Notifications.requestPermissionsAsync()` (blocks indefinitely in headless)
- Call `PrayerTimeService.getPrayerTimesList()` without `diskCacheOnly: true`

### 8.3 Contract Implementation

```typescript
// Disk-only fetcher for boot context
const diskOnlyFetcher: PrayerTimesFetcher = async (params) => {
  const cached = await PrayerTimeService.getPrayerTimesFromDiskCache(params);
  if (!cached) {
    throw new Error('boot_disk_cache_miss');
  }
  return cached;
};

// In NotificationAuthority.reschedule():
const fetcher = options?.diskOnly ? diskOnlyFetcher : this.prayerTimesFetcher;
```

On cache miss for any day in the boot path, that day is skipped (logged with
`NotificationTraceService`). If ALL days miss (truly fresh install, unlikely
after reboot), the authority records `status: 'blocked'` with reason
`'boot_cache_miss'` and clears the boot flag anyway. The foreground launch will
heal via normal reschedule.

Cache miss detection updates the fingerprint to an empty string, guaranteeing a
full rebuild on next foreground launch.

---

## 9. DST / Timezone-Change Handling

### 9.1 Detection

The rescheduler hook performs two independent checks:

1. **UTC offset change:** `new Date().getTimezoneOffset() !== parseInt(savedOffset)`
   — detects DST transition and timezone settings change.
2. **Monotonic clock jump:** `|wallClock - (lastWallClock + monotonicDelta)| > 30 min`
   — detects manual clock adjustment or NTP correction. Note: on some Mediatek /
   older Qualcomm OEMs, `performance.now()` resets on screen-off (documented in
   the audit at §2.5). The 30-minute threshold mitigates OEM noise but telemetry
   should log OEM + OS version alongside any detected jump.

### 9.2 Recovery (Solving Problem 8)

```typescript
// src/hooks/useNotificationRescheduler.ts (refactored)

async function checkAndReschedule(): Promise<void> {
  const currentOffset = new Date().getTimezoneOffset();
  const savedOffset = StorageService.getValue('notification_utc_offset');
  const dstChanged = savedOffset !== null &&
    parseInt(savedOffset, 10) !== currentOffset;

  if (dstChanged) {
    const lastAttemptAt = StorageService.getValue('last_dst_reschedule_attempted_at');
    const lastSuccessAt = StorageService.getValue('last_dst_reschedule_succeeded_at');

    // Back-off: only retry DST reschedule if >= 5 minutes have passed since last attempt
    const now = Date.now();
    if (lastAttemptAt) {
      const msSinceAttempt = now - new Date(lastAttemptAt).getTime();
      if (msSinceAttempt < 5 * 60 * 1000) {
        logger.log('⏳ DST reschedule back-off — too soon since last attempt');
        return; // Do NOT retry yet — prevents storm
      }
    }

    StorageService.setValue('last_dst_reschedule_attempted_at', new Date().toISOString());

    const result = await NotificationAuthority.reschedule('timezone_change', { force: true });

    if (result.status === 'scheduled' || result.status === 'scheduled_degraded') {
      // Update offset ONLY on success (existing correct behavior)
      StorageService.setValue('notification_utc_offset', currentOffset.toString());
      StorageService.setValue('last_dst_reschedule_succeeded_at', new Date().toISOString());
    }
    // On failure: offset is NOT updated (still correct), but we now have back-off
    // preventing a storm. Last attempt timestamp was recorded above.
    return;
  }

  // Non-DST path: normal threshold check
  await NotificationAuthority.maybeRescheduleExtendedNotifications();
}
```

**Key fix for Problem 8:** the `last_dst_reschedule_attempted_at` key is always
written before the reschedule attempt. On failure, the back-off key prevents
re-attempts for 5 minutes. After 5 minutes, one more attempt is made. Successive
failures have exponential-like spacing because the back-off window starts at 5
minutes and each attempt resets the window. The user never sees a storm; the
authority retries patiently.

---

## 10. Permission and Exact-Alarm Lifecycle

### 10.1 Revocation Detection

On every `reschedule()` call, the authority calls `getReadiness()` first. If
`permissionGranted` changed from `true` to `false` since last check:
1. Persist the revocation (MMKV-public `notification_readiness_blocked_reason`).
2. Call `cancelAll()` to clean up any stale schedule.
3. Return `ScheduleResult.status = 'blocked'`, `blockedReason = 'permission_denied'`.
4. Emit a `permission_revoked` trace event.

### 10.2 Exact-Alarm Downgrade Path (Android)

When `exactAlarmStatus` transitions from `granted` → `fallback`:
1. The delivery plan switches to `channel_sound` (short clip, alarm-grade channel).
2. The native AdhanModule alarms are cancelled (`cancelAllFullAdhans()`).
3. New notifications are scheduled on `CHANNELS.ADHAN` instead of
   `CHANNELS.ADHAN_SILENT`.
4. The fingerprint includes `exactAlarmStatus` indirectly (via `notifications.adhanEnabled`
   + the delivery plan engine), so the next reschedule detects the change and rebuilds.

### 10.3 UX Hook

The UI layer subscribes to `AuthorityReadiness` via a Zustand slice (not by
importing `NotificationAuthority` directly). The authority persists readiness to
MMKV-public; a `useNotificationReadiness()` hook reads from MMKV synchronously
on mount and subscribes to an event emitter for updates:

```typescript
// src/hooks/useNotificationReadiness.ts
export function useNotificationReadiness(): AuthorityReadiness | null {
  // Initial read from MMKV (synchronous, no bridge call)
  const [readiness, setReadiness] = useState<AuthorityReadiness | null>(
    () => NotificationAuthority.getStoredReadiness()
  );

  useEffect(() => {
    const unsub = NotificationAuthority.onReadinessChanged(setReadiness);
    return unsub;
  }, []);

  return readiness;
}
```

This removes the need for any component to call the async `getReadiness()` during
render.

---

## 11. LedgerV2 — Append-Only Ring Buffer

Replaces the full-JSON-parse pattern (Problem 9).

### 11.1 Storage Format

Instead of one large JSON array, LedgerV2 stores entries as individual MMKV keys:

```
ledger_v2_head       : number (index of next write slot, 0–199)
ledger_v2_{0..199}   : string (JSON of one LedgerEntry)
ledger_v2_id_map     : string (JSON: { [notificationId]: slotIndex })
```

The `id_map` enables O(1) lookup by notification ID for `recordDelivered` and
`recordTapped`. Each write updates at most two MMKV keys (the entry slot +
maybe the `head` pointer). No full serialization of all 200 entries.

### 11.2 API (unchanged externally)

```typescript
class LedgerV2 {
  recordScheduled(id: string, label: string, scheduledFor: Date): void;
  recordDelivered(id: string): void;
  recordTapped(id: string): void;
  getHealth(): LedgerHealth;
  clear(): void;
}
```

The `LedgerEntry` interface is unchanged for compatibility with
`NotificationDebugScreen`.

### 11.3 Miss Detection Integration

`verifyDeliveryWindow()` in the authority:

```typescript
async verifyDeliveryWindow(): Promise<DeliveryMissEvent[]> {
  const now = Date.now();
  const osScheduled = new Set(
    (await Notifications.getAllScheduledNotificationsAsync()).map(n => n.identifier)
  );

  const missedEntries = LedgerV2.getUndeliveredPastDue(
    now,
    5 * 60 * 1000  // 5 minutes past trigger = "missed"
  );

  return missedEntries
    .filter(entry => !osScheduled.has(entry.id))  // not in OS = not coming
    .map(entry => ({
      notificationId: entry.id,
      label: entry.label,
      scheduledFor: entry.scheduledFor,
      scheduledAt: entry.scheduledAt,
      missDetectedAt: new Date(now).toISOString(),
      minutesPastDue: Math.round((now - new Date(entry.scheduledFor).getTime()) / 60000),
    }));
}
```

Called on every app foreground resume. Results are:
1. Logged to `NotificationTraceService` (local, always).
2. Optionally batched and sent to remote telemetry (Phase 4 feature flag).

---

## 12. Plan Generators (Pure Functions)

Each notification kind becomes a pure function returning `PlannedNotification[]`.
These functions take a `ScheduleContext` and have no side effects:

```typescript
// src/services/authority/plans/PrayerPlanGenerator.ts
export function generatePrayerPlans(ctx: ScheduleContext): PlannedNotification[];

// src/services/authority/plans/SupplementalPlanGenerator.ts
export function generateJummahPlans(ctx: ScheduleContext): PlannedNotification[];
export function generateRamadanPlans(ctx: ScheduleContext): PlannedNotification[];
export function generateEidPlans(ctx: ScheduleContext): PlannedNotification[];
export function generateTahajjudPlans(ctx: ScheduleContext): PlannedNotification[];
export function generateKeepAlivePlan(ctx: ScheduleContext): PlannedNotification;
```

`ScheduleContext` is a plain data object:

```typescript
export interface ScheduleContext {
  settings: UserSettings;
  allDays: Array<{ dateKey: string; prayers: PrayerTime[]; sunrise: Date; midnight: Date | null }>;
  hijriDate: { month: number; day: number } | null;
  now: Date;               // Captured once — no more Date.now() drift across passes
  exactAlarmGranted: boolean;
  platform: 'ios' | 'android';
  personalizationName: string | null;
}
```

Being pure functions, these are independently unit-testable without any mocking
of native modules, Expo, MMKV, or Zustand.

---

## 13. Test Strategy

### 13.1 Unit Tests (pure)

Target files: `src/utils/notificationScheduleFingerprint.ts` (v2),
`src/services/authority/plans/PrayerPlanGenerator.ts`,
`src/services/authority/plans/SupplementalPlanGenerator.ts`,
`src/services/authority/BudgetAllocator.ts`

Test scenarios:
- Fingerprint v2: same inputs → same output; minute rounding eliminates 500ms
  variation; channel version bump → different fingerprint; Hijri date change →
  different fingerprint.
- PrayerPlanGenerator: produces correct identifiers for 7-day horizon; skips
  past prayers; respects `prayerNotifications` per-prayer toggles.
- BudgetAllocator: iOS cap of 58 with 80 plans → correct 58 selected in tier
  priority order; keep-alive always included; Tier 7 shed first.

### 13.2 Service-Level Integration Tests (mocked native)

Target: `NotificationAuthority` with mocked `expo-notifications`, MMKV,
`AdhanModule`, and `ScheduleLockModule`.

Scenarios:
- `reschedule('boot', { diskOnly: true })` → never calls network fetcher.
- `reschedule('background_refresh')` → fingerprint unchanged → returns
  `skipped_fingerprint` without scheduling.
- `reschedule()` with lock already held → returns `locked` immediately.
- Full rebuild: `authority_previous_plan` ids not in new plan are cancelled;
  new ids are scheduled; no notification is cancelled before scheduling.
- Permission revocation mid-cycle → authority cancels all and returns `blocked`.

### 13.3 Scenario Tests

| Scenario | What to verify |
|---|---|
| Android reboot | Boot task uses disk-cache only; no network calls; scheduling finishes in < 30 s |
| DST transition | UTC offset changes → reschedule triggered once with back-off; not re-triggered on next 4 resumes |
| App kill mid-apply | On next launch: `authority_state = 'applying'` is stale; new launch enters `planning` and heals |
| iOS slot overflow | Friday + Ramadan + Eid all active: total slots ≤ 58; no silent overflow |
| Exact-alarm revoked | Android: notifications move to channel-sound path; fingerprint invalidated; rebuild runs |
| Permission denied | `cancelAll()` called; subsequent resumes return `blocked` without retrying OS calls |

---

## 14. Staged Migration Plan

### Phase 0 — Already Done (this sprint)

- Unified adhan delivery resolver (`resolveAdhanDelivery` — single source of
  truth for iOS / Android / exact-alarm path).
- Exact-alarm UX flow (Android permission prompt + settings link).
- Notification channel v10 with alarm-grade audio attributes + `bypassDnd`.

---

### Phase 1 — Launch Blockers: Lock + Fingerprint V2 + Boot-Cache-Only

**Scope:** Fix the three hardest launch blockers without restructuring the full
God object.

**Files touched:**
- **New:** `src/services/authority/ScheduleLock.ts`
- **New:** `plugins/withScheduleLock.js` (or extend `withBootReceiver.js` to add
  `acquireScheduleLock` / `releaseScheduleLock` to `BootPrefsModule`)
- **Modified:** `src/utils/notificationScheduleFingerprint.ts` → add
  `buildFingerprintV2()`; keep `buildNotificationScheduleFingerprint` as
  deprecated alias returning v1 string for backward compat during transition
- **Modified:** `src/services/NotificationService.ts`
  - Replace `acquireSchedulingLock` / `releaseSchedulingLock` with
    `await ScheduleLock.acquire()` / `await ScheduleLock.release()`
  - Replace fingerprint generation with `buildFingerprintV2()`
  - Add `diskOnly?: boolean` parameter to `scheduleExtendedNotifications`; when
    `true`, replace fetcher with `diskOnlyFetcher` (cache-only, no network)
  - Remove `import { useStore }` — replace line 797 (`useStore.getState().setPendingMosquePromptPrayer(...)`)
    with the registered callback pattern already used for `navigationHandler`
  - Remove line 1974 store reference from `getDebugInfo` (pass store data in
    from call site or make the method accept an optional snapshot parameter)
- **Modified:** `src/tasks/notificationBootRescheduleTask.ts`
  - Pass `diskOnly: true` to `reconcileScheduling`
- **Modified:** `src/hooks/useNotificationRescheduler.ts`
  - Add `last_dst_reschedule_attempted_at` back-off logic (Section 9.2)

**Tests added:**
- `src/__tests__/notificationScheduleFingerprint.test.ts` — v2 fingerprint unit
  tests (minute rounding, Hijri inclusion, channel version bump)
- `src/__tests__/scheduleLock.test.ts` — mock native module; verify acquire
  returns false when lock held; verify steal after timeout
- `src/__tests__/bootRescheduleTask.test.ts` — verify no network calls when
  `diskOnly: true`; verify boot completes under 30 s with mocked disk cache

**Rollback plan:** `ScheduleLock` has a pure MMKV fallback path for iOS. The
Android native module is additive (new keys in a new SharedPreferences file).
If the native module is unavailable (e.g., build without the plugin), `ScheduleLock.acquire()`
catches the null reference and falls back to MMKV. The fingerprint v2 is stored
under a new key (`notification_schedule_fingerprint_v2`); the v1 key is
ignored once v2 is written, so rollback to a build without v2 produces at most
one spurious full rebuild on first launch.

**Ship / no-ship criteria:**
- Android boot reschedule completes in < 45 s on a cold emulator with no
  network (verified via `NotificationTraceService` timestamps).
- Two concurrent `reconcileScheduling` calls from separate simulated processes
  (foreground + background task runner) produce exactly one rebuild (lock contention
  test).
- DST test: manually set timezone to +1h → reschedule fires once → set timezone
  back → reschedule fires once → repeated toggles do not trigger storm.

---

### Phase 2 — Launch Blocker / Fast-Follow: Shared iOS Budget (BudgetAllocator)

**Scope:** Introduce `BudgetAllocator` and convert supplemental schedulers from
standalone services to plan generators. All scheduling passes happen inside one
authority call with one shared slot counter.

**Files touched:**
- **New:** `src/services/authority/BudgetAllocator.ts`
- **New:** `src/services/authority/plans/PrayerPlanGenerator.ts`
  (extracts `scheduleMainPrayerNotification`, `schedulePrePrayerNotification`,
  `scheduleTier2PersistentReminders`, `scheduleTier3GracePeriodWarning`,
  `scheduleLegacyPostPrayerCheck`, `scheduleKeepAliveNotification` as pure
  plan-generating functions — existing scheduling logic is moved, not rewritten)
- **New:** `src/services/authority/plans/SupplementalPlanGenerator.ts`
  (extracts Jummah, Ramadan, Eid, Tahajjud plan logic as pure functions)
- **Modified:** `src/services/NotificationService.ts`
  - The six scheduling passes now call `PrayerPlanGenerator` and `SupplementalPlanGenerator`
    to collect plans, then pass the combined list to `BudgetAllocator.allocate()`
  - The resulting approved list is applied in a single loop (no more per-service
    `getAllScheduledNotificationsAsync` calls)
  - `scheduleExtendedNotifications` calls `PrayerPlanGenerator` and
    `SupplementalPlanGenerator` internally; supplemental services still exist as
    modules but their core logic is now in the generator
- **Modified:** `src/services/JummahNotificationService.ts`,
  `src/services/EidNotificationService.ts`,
  `src/services/RamadanCountdownService.ts`
  - These become thin wrappers that call the corresponding `generate*Plans()`
    functions and delegate scheduling to the authority (for backward compat with
    direct callers in `useServiceInitialization`)
  - Their per-service `getAllScheduledNotificationsAsync` + cap checks are removed
- **Modified:** `src/hooks/useServiceInitialization.ts`
  - `RamadanCountdownService.scheduleRamadanNotifications()` and
    `JummahNotificationService.scheduleJummahNotifications()` are called only if
    `NotificationAuthority.reschedule()` is NOT already running (check
    `authority_state` key) — avoids duplicate scheduling while the authority is
    mid-apply

**Tests added:**
- `src/__tests__/budgetAllocator.test.ts` — priority ordering; cap enforcement;
  keep-alive guaranteed; iOS 58-slot cap with 80-plan input
- `src/__tests__/supplementalPlanGenerator.test.ts` — Jummah plans include all
  5 types on a Friday; Ramadan plans capped at lowerTierDays; Eid plans only
  during Dhul Hijjah or last days of Ramadan

**Rollback plan:** The plan generators are pure functions. If `BudgetAllocator`
produces incorrect results, the generators can be called directly (bypassing the
allocator) by setting `cap = Infinity` temporarily via a feature flag. The
supplemental services retain their own `schedule*` methods as fallbacks.

**Ship / no-ship criteria:**
- iOS device with Friday + Ramadan active: `getScheduledCounts().total` ≤ 58.
- No `getAllScheduledNotificationsAsync` called more than once per full
  `reschedule()` cycle (verified by log count in integration test).

---

### Phase 3 — Swap Rebuild (No Zero-Notification Window)

**Scope:** Replace cancel-before-schedule with schedule-then-selective-cancel.

**Files touched:**
- **New:** `src/services/authority/AuthorityPlanStore.ts`
  (reads/writes `authority_pending_plan` + `authority_previous_plan` in MMKV-public)
- **Modified:** `src/services/NotificationService.ts`
  - `scheduleExtendedNotifications` replaces:
    ```
    cancelAllPrayerNotifications()
    [schedule all]
    saveFingerprint()
    ```
    with the Phase A / Phase B / Phase C algorithm from Section 5.
  - The selective cancellation step reads `authority_previous_plan.notificationIds`
    and cancels only identifiers NOT in the current approved plan.

**Tests added:**
- `src/__tests__/swapRebuild.test.ts` — process-kill simulation: mock a crash
  after 3 notifications are scheduled; on next mock launch, verify the 3 new
  ones survive and the old ones are eventually cancelled

**Rollback plan:** If the swap algorithm introduces a regression (duplicate
visible notifications during rebuild), revert to the cancel-before-schedule by
commenting out the selective-cancel phase and replacing with `cancelAllPrayerNotifications`.
The `authority_previous_plan` key is orphaned but harmless.

**Ship / no-ship criteria:**
- Kill the app 2 seconds after `reschedule()` starts: device must still have
  ≥ 1 future prayer notification scheduled.
- No user-visible duplicate prayer notification shown during a full rebuild on a
  device with 7-day Android horizon.

---

### Phase 4 — Fast-Follow: Delivery Observability + Remote Miss Telemetry

**Scope:** LedgerV2 ring buffer + `verifyDeliveryWindow()` + optional remote
telemetry.

**Files touched:**
- **New:** `src/services/authority/LedgerV2.ts`
  (replaces `NotificationLedger.ts` — backward-compatible API)
- **Modified:** `src/services/NotificationService.ts`
  - Replace `NotificationLedger.recordScheduled/Delivered/Tapped` with `LedgerV2`
  - Add `verifyDeliveryWindow()` call on app foreground (in
    `useNotificationRescheduler` after `checkAndReschedule`)
- **New:** `src/services/authority/DeliveryObserver.ts`
  (batches miss events; uploads if remote telemetry feature flag enabled)
- **Modified:** `src/constants/NotificationConstants.ts`
  - Add `LEDGER_RING_BUFFER_SIZE = 200` (unchanged from current MAX_ENTRIES)

**Tests added:**
- `src/__tests__/ledgerV2.test.ts` — verify ring buffer wraps at 200; O(1) lookup
  by ID; `getUndeliveredPastDue` returns correct entries
- `src/__tests__/deliveryObserver.test.ts` — miss detection with mocked OS list;
  entries in OS list not flagged as missed; entries past due and absent from OS
  list correctly flagged

**Rollback plan:** `NotificationLedger.ts` is retained unchanged during Phase 4.
`LedgerV2` imports into only `NotificationAuthority`. If LedgerV2 has a bug,
swap back the import in one line.

**Ship / no-ship criteria:**
- After scheduling 5 prayers and simulating delivery of 3: `getHealth().missedNotifications`
  contains 2 entries 10 minutes after their trigger time.
- `verifyDeliveryWindow()` completes in < 50 ms on a device with 200 ledger entries
  (ring buffer O(1) lookup verified).

---

### Final State — `NotificationAuthority`

After Phase 4 completes, the migration of logic out of `NotificationService.ts`
has made it thin enough to rename and re-export as a compatibility shim:

```typescript
// src/services/NotificationService.ts (post-migration, ~200 lines)
// Compatibility shim — delegates everything to NotificationAuthority
export { NotificationAuthority as default };
export { NotificationAuthority };
```

`NotificationService.ts` as a God object ceases to exist. The 2,236 lines are
distributed across:
- `NotificationAuthority.ts` (~300 lines — orchestration only)
- `ScheduleLock.ts` (~60 lines)
- `BudgetAllocator.ts` (~80 lines)
- `LedgerV2.ts` (~120 lines)
- `plans/PrayerPlanGenerator.ts` (~250 lines)
- `plans/SupplementalPlanGenerator.ts` (~300 lines)
- `AuthorityPlanStore.ts` (~80 lines)
- `DeliveryObserver.ts` (~100 lines)
- Existing: `AdhanPlaybackPolicy.ts`, `AdhanPlayer.ts`, `FullAdhanScheduler.ts`,
  `NotificationChannels.ts`, `HabitBuilderNotifications.ts` (unchanged or minor edits)

---

## 15. Open Questions for the Senior Engineer

1. **Authority name:** `NotificationAuthority` vs `NotificationOrchestrator` vs
   keeping `NotificationService` (with an internal refactor, no rename). Renaming
   forces updates to every import site (~15 files). Is the rename worth it for
   clarity, or is incremental extraction without rename preferred?

2. **Cross-process lock on iOS:** iOS has no headless boot task, so MMKV is safe
   as the iOS lock. But the Expo background task (`NOTIFICATION_RESCHEDULE_TASK`)
   runs in the same process as the foreground app on iOS (background task is
   same-process in Expo's implementation). Is the MMKV lock sufficient for iOS,
   or should the `ScheduleLock` abstraction be unified across platforms using
   a JS-level mutex (e.g., a module-level `Promise` chain)?

3. **Supplemental services via `useServiceInitialization` vs authority:**
   Currently `JummahNotificationService.scheduleJummahNotifications()` is called
   from `useServiceInitialization` as a React hook side-effect (after prayer times
   load). After Phase 2, the authority generates Jummah plans internally during
   `reschedule()`. Should `useServiceInitialization` stop calling supplemental
   services entirely (delegating all scheduling to the authority), or retain the
   explicit call as a trigger mechanism? Removing the explicit call simplifies the
   hook but requires the authority to know when prayer times are freshly loaded.

4. **`AuthorityPlan` storage size:** The `authority_previous_plan` MMKV key could
   hold up to ~200 identifier strings (7 days × 5 prayers × multiple tiers). JSON
   size estimate: ~6 KB. Is this acceptable for MMKV-public, or should it be
   stored in a separate MMKV instance to avoid polluting the public store's key
   space?

5. **LedgerV2 MMKV key count:** The ring-buffer design uses 200 individual MMKV
   keys plus 1 head pointer plus 1 id-map. That is 202 MMKV keys dedicated to the
   ledger. MMKV is designed for many small keys, but the `id_map` key is a JSON
   blob that grows to ~8 KB at 200 entries (still faster than the current full
   array). Is the 200-key approach preferred, or would a simpler approach —
   keep the JSON array but batch writes (write at most every N notifications) —
   be acceptable? The batching approach trades O(N) writes for O(N) write size
   but is simpler to implement and reason about.

6. **Delivery observability remote telemetry:** Phase 4 proposes optionally
   uploading miss events. What is the target endpoint — Firebase Remote Config +
   Crashlytics custom key, a dedicated analytics event via `AnalyticsService`, or
   a custom Cloudflare Worker endpoint? This determines the Phase 4 implementation.

7. **`scheduleTahajjudEncouragement` ownership:** Currently embedded in
   `NotificationService`. After migration, should Tahajjud planning move to
   `SupplementalPlanGenerator` (alongside Jummah / Ramadan / Eid), or remain a
   separate method that the authority calls explicitly? The prayer-times fetcher
   dependency (Tahajjud needs midnight time, which requires a per-day fetch) makes
   it slightly more complex than the other supplemental services.

8. **Fingerprint v2 migration of stored data:** On first launch after the Phase 1
   update, `notification_schedule_fingerprint_v2` will not exist. The authority
   treats this as a cache miss and forces a full rebuild — correct behavior. But
   should the `v1` key be deleted on first v2 write to avoid leftover orphaned
   keys? Or left in place (harmless, small, self-expiring)?

9. **Mosque Mode integration:** `MosqueModeService` schedules its own
   notifications (pre-iqamah silent-mode prompts on iOS, AlarmManager alarms on
   Android) completely outside this authority. Phase 3.5 in the audit
   (`docs/audit/02-engineering-notifications-security.md` §3.5) notes that mosque
   mode alarms are not re-scheduled on reboot. Should mosque mode scheduling be
   brought inside the authority's scope (as another plan generator), or remain a
   separate service that the boot task explicitly calls after the authority
   finishes? The latter is simpler but leaves mosque mode outside the slot budget.

10. **iOS slot cap 58 vs 64:** The current cap is 58 (`IOS_NOTIFICATION_CAP`),
    leaving 6 slots of headroom. After Phase 2 (all supplemental services inside
    the budget), the headroom is no longer needed as a safety margin against
    concurrent over-scheduling. Should the cap be raised to 63 (leaving 1 slot
    for system/OS use) to maximize prayer coverage on long Android-style horizons
    that might be applied to iOS in future?
