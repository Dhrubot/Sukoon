# Commit Review — Batch A
**Branch:** `feature/notification-prayer-times-hardening` → `main`
**Reviewer:** Claude Code (automated read-only audit)
**Date:** 2026-06-03
**Scope:** 10 commits reviewed newest-first (f2fcd5f … 64d5b3f)

---

## Commit 1 — `f2fcd5f` "prod ready"

**What it does:** Adds 79 marketing screenshots and two launch-prep docs, and fixes the `privacyPolicyUrl` in `app.config.js` to include the `.html` suffix (resolving the known mismatch from the pre-merge audit).

**Files touched:**
- `app.config.js` — 1-line change: `privacy` → `privacy.html`
- `docs/launch/play-console-submission-packet.md`, `docs/launch/pre-merge-audit.md` — documentation
- `marketing-screenshots/` — 79 binary PNG/HTML files (no code)

**Concerns:**
- No code changes; the `app.config.js` fix is a straightforward string correction and directly addresses the pre-merge audit finding.
- Marketing assets are binary-only, no risk to runtime behavior.
- The commit message "prod ready" is terse and will make `git log` harder to scan in future. Minor style note only.

**Risk grade:** ✓ clean

---

## Commit 2 — `f488dac` "Add hosted privacy policy HTML for Play Console submission"

**What it does:** Adds a self-contained mobile-responsive `docs/privacy.html` for GitHub Pages hosting, required as the Play Console privacy policy URL; also corrects Section 10 (MMKV backup exclusion behavior).

**Files touched:**
- `docs/privacy.html` — 260 lines, new file

**Concerns:**
- Pure documentation/HTML asset. No runtime code changes.
- Content accuracy is a legal/compliance matter, not a code-review concern. The MMKV backup-exclusion claim matches the manifest configuration verified in the pre-merge audit.

**Risk grade:** ✓ clean

---

## Commit 3 — `388cb44` "Hide Live Activity toggle + disable widgets for v1 launch"

**What it does:** Comments out the Live Activity/Persistent Prayer Countdown UI toggle in `NotificationSection.tsx`, gates both Android widget providers behind `WIDGETS_ENABLED=false` in `withAndroidWidget.js`, and updates tests to assert the hidden state.

**Files touched:**
- `plugins/withAndroidWidget.js` — adds `WIDGETS_ENABLED = false` const, applies `android:enabled="false"` to both appwidget-provider receivers
- `src/screens/Settings/components/NotificationSection.tsx` — Live Activity block commented out
- `src/__tests__/notificationSection.test.tsx` — assertions updated; one test `.skip`-ed

**Concerns:**

1. **`it.skip` added** (`src/__tests__/notificationSection.test.tsx:323`): The "starts and ends the platform countdown service when the toggle changes" test is skipped with a `// v1.1: re-enable` comment. This is correctly documented and intentional — the UI surface it tests is genuinely hidden. It is not silently hiding a regression; the skip comment is accurate. The test body is preserved and a negative assertion (`expect(queryByText('Persistent Prayer Countdown')).toBeNull()`) replaces the removed positive assertion. Low risk.

2. **`LiveActivityService` import is commented out** in `NotificationSection.tsx` rather than removed. This is safe — the service is still compiled in via other consumers. The comment is clear and restoration for v1.1 is trivial.

3. **`WIDGETS_ENABLED = false` is a top-level hardcoded constant** in the plugin file (not an env var). A developer running `expo prebuild` will always produce disabled widgets until this is manually flipped. The comment makes the v1.1 re-enable path clear and the risk is intentional.

**Risk grade:** ⚠ note (one `it.skip` acknowledged and documented; intentional feature scope control)

---

## Commit 4 — `68542ab` "Fix setState-during-render in theme toggle"

**What it does:** Switches `useAppInitialization` from `useStore()` (a subscribing destructure) to `useStore.getState()` (a non-subscribing snapshot) so that unrelated Zustand state changes — such as a theme toggle — no longer cause the hook to re-render mid-render-cycle and trigger React's "Cannot update a component while rendering a different component" warning.

**Files touched:**
- `src/hooks/useAppInitialization.ts` — 5-line change

**Concerns:**
- The fix is semantically correct: the hook only calls setter functions, which are stable references and do not need a subscription.
- `useStore.getState()` is called once at hook definition time and its returned object is destructured immediately. Because the setter functions are stable, this works identically to the subscription path for the use case in question.
- No behavioral change to initialization logic; only the rendering model changes.
- The commit message explains the root cause clearly (ThemeProvider → Zustand → useAppInitialization re-render chain).

**Risk grade:** ✓ clean

---

## Commit 5 — `6444c2d` "Ledger reconcile: skip post-install backfill of past-due prayers"

**What it does:** Adds a guard to `reconcileDelivery` that skips entries where `scheduledAt >= scheduledFor` (i.e., notifications recorded after their fire time, which occurs on post-install onboarding for past prayers of the current day), preventing false delivery inflation in the Notification Health dashboard; also changes `recordTapped`'s `deliveredAt` backfill to use the tap timestamp rather than `scheduledFor`.

**Files touched:**
- `src/services/NotificationLedger.ts` — guard condition in `reconcileDelivery`, `deliveredAt` timestamp in `recordTapped`
- `src/__tests__/notificationLedger.test.ts` — 37-line test addition

**Concerns:**

1. **Drift calculation in `recordTapped`**: when a user taps a notification that fired while the app was backgrounded, `driftSeconds` is now `tap_time - scheduledFor`. This is technically end-to-end latency (schedule → user acknowledgment), not pure delivery latency. The commit message acknowledges this and frames it as a feature ("makes drift reflect end-to-end latency"). However it means `driftSeconds` semantics differ between the foreground-receive path (true delivery drift) and the tap-backfill path (user response time), which could mislead future analysis of the ledger data. Worth a comment in the type or field doc.

2. The `scheduledAt >= scheduledFor` guard is logically correct and well-tested. The 30-second grace window from the previous commit is preserved.

3. Migration safety: existing ledger entries with `deliveredAt: null` that genuinely should not be marked delivered will be re-evaluated on next app foreground; the new guard prevents incorrect marking. No data is retroactively altered — guard only skips the mark, does not un-mark.

**Risk grade:** ⚠ note (drift semantics mismatch documented above; not a correctness bug but a data-interpretation ambiguity)

---

## Commit 6 — `e96c2e9` "Notification ledger: backfill delivery for closed-app fires"

**What it does:** Introduces `reconcileDelivery(stillScheduledIds)` on `NotificationLedger` — a best-effort inference that marks past-due entries no longer in the system's pending list as delivered — and wires it into two foreground paths: `scheduleExtendedNotifications` (reuses an already-fetched scheduled list) and a new lightweight `reconcileLedger()` bridge method called unconditionally by `useNotificationRescheduler` on every app-foreground event.

**Files touched:**
- `src/services/NotificationLedger.ts` — `reconcileDelivery`, `recordTapped` backfill
- `src/services/NotificationService.ts` — `reconcileLedger()` public method
- `src/hooks/useNotificationRescheduler.ts` — fire-and-forget `void NotificationService.reconcileLedger()` on every `checkAndReschedule`
- `src/__tests__/notificationLedger.test.ts` — 63 lines of new tests

**Concerns:**

1. **`void NotificationService.reconcileLedger()`** is called with `void` — errors are suppressed for the caller. `reconcileLedger` itself has an internal `try/catch` that logs warnings and returns 0 on failure, so the silent discard at the call site is appropriate (dashboard backfill is best-effort). Acceptable.

2. **`driftSeconds = 0` for inferred delivery** — when `reconcileDelivery` marks a notification delivered, it sets drift to 0 with `scheduledFor` as the `deliveredAt`. This is acknowledged as "best-effort" but see the note in commit 5 about drift semantic inconsistency.

3. **Dual wiring** (inside `scheduleExtendedNotifications` AND via `reconcileLedger` in the rescheduler hook) is intentional per the commit message to handle the "within-threshold / no full reschedule triggered" path. The two paths are idempotent per the `if (entry.deliveredAt !== null) continue` guard. No double-counting risk.

4. **Grace window (30 s)**: The 30-second buffer before inferring delivery for a past-due entry is a reasonable heuristic. On a heavily Doze-throttled device the OS could delay delivery by more than 30 seconds but still be pre-delivery — this could cause a false positive. The commit message does not flag this edge case, but the consequence is a minor inaccuracy in the dashboard, not a user-facing defect.

**Risk grade:** ⚠ note (best-effort inference with documented limitations; dual wiring is safe but worth noting for future maintainers)

---

## Commit 7 — `27ca272` "Notification hardening: channel v11, boot LKG fallback, honest trace"

**What it does:** Bumps the notification channel version from 10 to 11 to force recreation of channels that had `bypassDnd=true` in code but `mBypassDnd=false` on existing M21 installs (because the flag was added after the channels were first created and Android locks that field after first create); fixes the `diskOnlyFetcher` introduced in f691a96 to delegate to `PrayerTimeService.getPrayerTimesList({diskOnly:true})` instead of the broken direct-cache path that always returned `invalid` past day 0; adds `lockscreenVisibility=PUBLIC` to all channels; adds missing channels to `cleanupOldChannels`; and makes the boot trace event report actual scheduled counts.

**Files touched:**
- `src/constants/NotificationConstants.ts` — `NOTIFICATION_CHANNEL_VERSION = 11`
- `src/services/notifications/NotificationChannels.ts` — `lockscreenVisibility=PUBLIC` on all channels; `cleanupOldChannels` adds `tahajjud`, `jummah`, `ramadan-countdown`
- `src/services/NotificationService.ts` — `diskOnlyFetcher` rewritten; `stale_cache` added to acceptable-degraded quality list; `getLastScheduleSummary()` public getter
- `src/tasks/notificationBootRescheduleTask.ts` — reports `prayerScheduledCount` / `totalScheduledCount`
- `src/__tests__/notificationChannels.test.ts` — minor version bump
- `docs/launch/qa-findings-galaxy-m21.md` — 243 lines of QA findings documentation

**Concerns:**

1. **Channel v10 → v11**: This is the correct fix for the DND bypass issue. The cleanup loop `for (let v = 1; v < currentVersion; v++)` covers v1–v10, so existing installs will have stale channels cleaned up on first post-update channel setup. The new v11 channels will be created fresh. **Important for existing testers/users who already have build 55 with v10 channels**: they will see channel re-creation on first launch after this build ships, which is the intended behavior.

2. **The `diskOnlyFetcher` fix** correctly delegates to `PrayerTimeService.getPrayerTimesList({diskOnly:true})` which implements the full 2-tier disk fallback (exact-date cache → last-known-good). The previous implementation in f691a96 called `getCachedPrayerTimesFromDisk` directly, which only hit the exact-date cache and returned `invalid` for all other days. This was a real boot-path regression that is now corrected.

3. **`stale_cache` added to acceptable quality**: The quality validator now allows `stale_cache` (last-known-good) in addition to `calculated_fallback` for post-boot scheduling, logging `schedule_using_degraded_prayer_times`. This is correct — LKG times are close enough for approximate alarm scheduling when the network is unavailable at boot.

4. **Missing channels in `cleanupOldChannels`** (tahajjud, jummah, ramadan-countdown) were genuinely absent before this commit. The JUMMAH channel is registered in `CHANNELS` in `NotificationConstants.ts` and created by `setupNotificationChannels`, so including it in the cleanup loop is correct.

**Risk grade:** ✓ clean (critical fixes to boot path and DND bypass)

---

## Commit 8 — `692a2c3` "Notification hardening: KeepAwake redbox, boot recovery, dev debug shortcuts"

**What it does:** Fixes a dev-mode `LogBox` race in `useFocusKeepAwake` by using `.then(onFulfilled, onRejected)` instead of `.then().catch()` and guarding against synchronous (non-Promise) returns; adds a belt-and-suspenders `MosqueModeService.rearmFromPersistence()` call in the boot task after the native receiver; adds MM1–MM5 Mosque Mode test shortcuts to `NotificationDebugScreen`; inverts a stale test assertion in `appConfigContract.test`.

**Files touched:**
- `src/hooks/useFocusKeepAwake.ts` — Promise guard + rejection handler attachment
- `src/screens/Debug/NotificationDebugScreen.tsx` — MM1–MM5 shortcuts, ADB instruction card
- `src/tasks/notificationBootRescheduleTask.ts` — `rearmFromPersistence()` call
- `src/__tests__/appConfigContract.test.ts` — assertion inversion

**Concerns:**

1. **`NotificationDebugScreen` adds production-service calls** (`MosqueModeService.scheduleTestMosqueMode`, `MosqueModeService.rearmFromPersistence`, `RingerControlService.getRingerMode`). Verified: `NotificationDebugScreen` is only rendered inside `{__DEV__ && ...}` in `SettingsScreen.tsx` (line 276). It is also lazy-loaded in the navigator under `{__DEV__ && ...}`. Both guards are in place; no production user can reach these shortcuts. **Safe.**

2. **`rearmFromPersistence()` in the boot task** is wrapped in try/catch with a warning log; a failure does not abort notification scheduling. The native `RingerModeBootReceiver` is the critical path; this JS call is belt-and-suspenders. Safe.

3. **`appConfigContract.test` assertion inversion**: The test previously asserted `enableMinifyInReleaseBuilds === true`; now asserts `false`. This matches the actual EAS production config (`ANDROID_ENABLE_MINIFY` defaults to off) and the pre-merge audit finding that minify is intentionally disabled for crash-symbol stability. The test now reflects reality.

4. **`isPromiseLike` guard in `useFocusKeepAwake`**: The guard checks for a `.then` property, which is the standard duck-typing approach. Correctly handles expo-keep-awake versions that return `undefined` synchronously.

**Risk grade:** ✓ clean

---

## Commit 9 — `f691a96` "Notification Authority Phase 1: cross-process lock, fingerprint v2, disk-only boot, DST back-off, drop useStore in service"

**What it does:** A large multi-part hardening commit: (1) introduces a cross-process scheduling lock via a new native `BootPrefsModule.acquireScheduleLock/releaseScheduleLock` backed by Android SharedPreferences; (2) adds fingerprint v2 that rounds prayer times to the minute and adds Hijri date; (3) threads `diskOnly` through the boot reschedule path; (4) removes `useStore` from `NotificationService` by replacing the mosque-prompt mutation with a registered callback; (5) adds DST retry back-off via MMKV-persisted timestamp.

**Files touched:**
- `plugins/withBootReceiver.js` — native Java for `acquireScheduleLock` / `releaseScheduleLock`
- `src/services/notifications/ScheduleLock.ts` — new cross-process lock abstraction
- `src/utils/notificationScheduleFingerprint.ts` — `buildNotificationScheduleFingerprintV2`, key constants
- `src/services/NotificationService.ts` — lock swap, fingerprint v2, diskOnly threading, mosque callback
- `src/hooks/useNotificationRescheduler.ts` — DST back-off
- `src/hooks/useServiceInitialization.ts` — registers mosque prompt handler
- `src/__tests__/dstRetryBackoff.test.ts`, `src/__tests__/notificationScheduleFingerprint.test.ts` — new test files
- `src/__tests__/notificationSchedulingIntegration.test.ts` — 9-line update

**Concerns:**

1. **"Note left for follow-up" in commit message**: "The disk-only fetcher currently delegates to PrayerTimeService via the existing path; a stricter from-disk-only PrayerTimeService helper would remove a small residual network-on-memory-miss possibility." This is acknowledged but not resolved in this commit. It IS resolved by the subsequent commit 27ca272, which rewrites the `diskOnlyFetcher` to call `getPrayerTimesList({diskOnly:true})` directly. Verify that the follow-up fix is present — it is.

2. **Fingerprint v2 migration**: On first app launch after this code ships, `FINGERPRINT_V2_KEY` will be null (never written), so `previousFingerprint !== fingerprint` is guaranteed true and a full rebuild fires. The v1 key is deleted on that first write. This one-time forced rebuild on upgrade is correct and expected behavior. It does mean every existing install will reschedule notifications on first post-upgrade launch, which is fine (and actually desirable since channels are also changing with v11).

3. **ScheduleLock falls back to MMKV on native module unavailability**: The fallback path uses a timestamp-based lock stored in MMKV, which is single-process and cannot provide true cross-process exclusion. The `logger.warn` is appropriate. On Android, the native module should always be available after prebuild; the MMKV fallback is a defensive measure.

4. **DST back-off**: Records the attempt timestamp *before* attempting the reschedule, so a failed attempt is also throttled. This is the conservative choice — a 5-minute back-off window is reasonable. The key `last_dst_reschedule_attempted_at` is cleared on success. Logic is clean.

5. **Mosque prompt handler pattern**: The `registerMosquePromptHandler` callback is registered in `useServiceInitialization`, which runs as part of app init. There is a theoretical window at cold boot where the service handles a tapped notification before the React tree has mounted and registered the handler. In this case `this.mosquePromptHandler` is null and the notification tap silently skips the Zustand update — the user is still navigated to Home but `pendingMosquePromptPrayer` is not set. This is the same race that existed in the previous `useStore.getState()` pattern (the service might be initialized before the store is fully hydrated). Not new, not a regression, but worth noting.

6. **Large commit (737-line diff across 12 files)**: This is a multi-concern commit. Each concern is well-tested and the commit message is thorough, but if any one piece introduced a regression, bisecting would be harder. Acceptable given the sprint pressure.

**Risk grade:** ⚠ note (items 2 and 5 above; both are understood trade-offs, not blocking issues)

---

## Commit 10 — `64d5b3f` "Unify adhan audio delivery: native primary, channel fallback, alarm-grade"

**What it does:** Collapses the adhan audio decision from two separate resolvers (one for scheduling, one for the foreground handler) into a single `resolveAdhanDelivery(platform, notifications, exactAlarmGranted)` function that returns an `AdhanDeliveryPlan`; replaces the four-value `AdhanPlaybackPolicy` type with a two-axis `AdhanClip` + `AdhanAudioEngine` model; upgrades the ADHAN channel from `USAGE_NOTIFICATION` to `USAGE_ALARM` with `bypassDnd=true` for the fallback path; bumps channel version 9 → 10; rewires the foreground handler to suppress sound only for `native_alarm` engine (silent channel), not for `channel_sound` (which now needs to be heard in foreground too).

**Files touched:**
- `src/services/notifications/AdhanPlaybackPolicy.ts` — new resolver, new types
- `src/services/notifications/NotificationChannels.ts` — ADHAN channel audio attributes + bypassDnd
- `src/services/NotificationService.ts` — foreground handler, `scheduleMainPrayerNotification`, test preview
- `src/services/notifications/FullAdhanScheduler.ts` — `scheduleAdhanAudio` replaces `scheduleFullAdhan`
- `src/constants/NotificationConstants.ts` — channel version bump to 10
- 9 test files updated

**Concerns:**

1. **Channel version 9 → 10 in this commit, then 10 → 11 in commit 27ca272**: The total channel version arc over this batch is 9 → 10 → 11. The cleanup loop covers v1 through `currentVersion - 1`, so both old channel sets are cleaned up. No orphan channels.

2. **Foreground sound suppression logic change**: Previously, sound was suppressed for any adhan notification when adhan was enabled (on the assumption AdhanPlayer was handling it). Now, `shouldPlaySound = !suppressForTest`, meaning real prayer-time notifications (`type === 'prayer-time'`) are **never** sound-suppressed by the handler — instead the channel itself decides. For the `native_alarm` engine, the channel is `ADHAN_SILENT` (no sound, confirmed by `sound: null` in `NotificationChannels.ts`), so no double audio. For the `channel_sound` fallback, the channel is `ADHAN` (alarm-grade sound), which also plays correctly. This is architecturally cleaner, but it is a behavioral change: if a `prayer-time` notification arrives in the foreground and `exactAlarmGranted=false` (channel_sound path), the phone will sound the adhan clip through the channel while the app is open. This is presumably intended ("we want it audible in foreground too" per the comment), but it was not the prior behavior. Worth a device test for the fallback path.

3. **`exactAlarmGranted` is resolved once per scheduling cycle** and passed to all `scheduleMainPrayerNotification` calls. This is correct — the permission state does not change mid-cycle. The test-notification path (`scheduleTestAdhanNotification`) also does its own `getAndroidExactAlarmStatus()` check, which is consistent.

4. **`AdhanPlayer` retained only for test preview**: The foreground received listener now only triggers `playFullAdhan()` for `data.type === 'test'` notifications (not `prayer-time`). This means real foreground prayer notifications no longer trigger `AdhanPlayer`. The audio for those comes from the native service (primary) or the channel (fallback). This correctly eliminates double-audio in the foreground.

5. **Tapping a prayer notification now always calls `this.stopAdhan()`**: This replaces the previous branched logic. `stopAdhan` should stop both the native foreground service and the in-app AdhanPlayer. Verify `stopAdhan` implementation handles both — this was not explicitly reviewed but is implied by the commit description ("Tapping a prayer notification now stops any playing adhan").

**Risk grade:** ⚠ note (item 2 — behavioral change for foreground channel_sound path; item 5 — `stopAdhan` handles both engines requires device validation)

---

## Batch A Summary

### Total blockers: 0

### Total warnings: 5

| Commit | Warning |
|---|---|
| `388cb44` | `it.skip` added — intentional, but live test debt for v1.1 |
| `6444c2d` | `driftSeconds` in `recordTapped` tap-backfill measures user-response time, not delivery latency — semantics differ from foreground-receive path |
| `e96c2e9` | 30 s grace window may produce false positives on heavily Doze-throttled devices; dual wiring is safe but non-obvious |
| `f691a96` | Mosque-prompt handler not registered until React mount — cold-boot tap during early init silently skips Zustand update; large multi-concern commit reduces bisect-ability |
| `64d5b3f` | Foreground `channel_sound` path now audible in-foreground (behavioral change vs prior behavior); `stopAdhan()` covering both engines needs device validation |

### Top 3 pushback items for code review

1. **`driftSeconds` semantic inconsistency across ledger paths** (`6444c2d` + `e96c2e9`): The `reconcileDelivery` path stamps `driftSeconds = 0` (delivery inferred at `scheduledFor`), the `recordDelivered` foreground path stamps actual drift, and `recordTapped` now stamps tap-latency-from-schedule. A future engineer querying the ledger for "delivery drift" will get three different things. Recommend adding a field-level doc comment distinguishing the three cases, or a separate `tap_latency_seconds` field to preserve the semantic cleanly.

2. **Foreground audio behavior change on `channel_sound` fallback path** (`64d5b3f`): When `exactAlarmGranted=false`, a real prayer notification arriving while the app is foregrounded will now play the adhan through the channel (alarm-grade, bypassDnd). This was not possible with the old suppression logic. The test suite cannot exercise this (no physical alarm grant), and it was not called out in the QA findings. It should be explicitly validated on a physical Android device with exact-alarm permission denied.

3. **`diskOnlyFetcher` in `f691a96` was broken on introduction** (LKG path always returned `quality='invalid'` for days 1–6) and had to be fixed in a follow-up commit (`27ca272`). The engineering review of `f691a96` should have caught that the boot path was effectively broken for multi-day scheduling — the `27ca272` fix confirms the issue was real (and documented in the Galaxy M21 QA findings). The pattern of introducing a regression in a large commit and fixing it in a follow-up is fine as long as the follow-up lands before the branch merges, which it does. Flag for process: large multi-concern commits are hard to review.

### Overall confidence

**MEDIUM-HIGH** — No blockers. The critical notification path changes (adhan unification, cross-process lock, fingerprint v2, boot disk fallback) are all well-reasoned and appropriately tested. The boot-path regression introduced in `f691a96` is definitively corrected in `27ca272` and both are present in this batch. The channel versioning chain (9 → 10 → 11) is coherent and the cleanup loop covers all prior versions. The main residual risks are: (a) the foreground `channel_sound` audio behavior change that needs physical device validation; (b) the `driftSeconds` semantic inconsistency which is a data-quality debt, not a user-facing defect; and (c) the `it.skip` test that must be restored in v1.1. None of these block a v1 Play Store submission.

**Prerequisite before merge (inherited from pre-merge audit):**
- Push unpushed commits to `origin/feature/notification-prayer-times-hardening`
- Rebase or merge `origin/main` (25 commits ahead since fork)
- Validate foreground `channel_sound` audio on a physical Android device with exact-alarm permission denied
