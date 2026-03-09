# Sukoon Production Roadmap

Complete pre-launch fix roadmap: 17 verified issues across 4 phases, merging the audit findings with the focus-mode scroll re-lock and MMKV lazy encryption fixes.

---

## Phase 1 — Pre-Launch Critical (~2.5 hours)

Ship-blocking correctness and performance fixes. All quick wins.

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 1 | **Selective store hooks in PrayerCard** — replace `useStore()` (subscribes to entire store, bypasses React.memo) with `useUserSettings()` + `useSunTimes()` | `PrayerCard.tsx` | 15 min |
| 2 | **Conditional render secondary content** — replace `display: 'none'` with `{(!isFocusMode \|\| focusExpanded) && ...}` so ~8 components unmount in focus mode. Delete `secondaryContentHidden` style. | `HomeScreen.tsx` | 10 min |
| 3 | **Scroll-up re-lock for focus mode** — add `onMomentumScrollEnd` + `onScrollEndDrag` to ScrollView; when scroll stops with `contentOffset.y <= 20` and `focusExpanded`, set `focusExpanded(false)`. Content unmounts, ScrollView snaps to hero. | `HomeScreen.tsx` | 15 min |
| 4 | **Unify settings mutations** — adopt `syncUserSettings()` (already exists in `settingsSync.ts` but never used) as the single write path. Remove redundant `StorageService.setUserSettings()` calls. | `PrayerCard.tsx`, `PrayerSettingsSection.tsx`, `useMosqueMode.ts` | 30 min |
| 5 | **Fix PrayerTimesProvider recalc loop** — remove `todayPrayerTimes` from the useEffect deps at line 338. Prevents double-fire at prayer boundaries. | `PrayerTimesProvider.tsx` | 15 min |
| 6 | **Replace `console.log` with `logger`** — ~35 raw console calls bypass the logger and leak to production logcat/Console.app. | `MosqueModeService.ts`, `useServiceInitialization.ts`, `PrayerSettingsSection.tsx`, `StorageAdapter.ts` | 20 min |
| 7 | **Add Firebase creds to .gitignore** | `.gitignore` | 2 min |
| 8 | **Remove unused NativeWind + tailwindcss** — zero `className` usage in codebase. | `package.json`, `tailwind.config.js` | 10 min |

**After Phase 1:** App is functionally correct, performant, and clean for soft launch.

---

## Phase 2 — Notification Hardening (~1.5 hours)

Prevent drift, improve UX of notification content.

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 9 | **DST offset detection on resume** — store UTC offset at schedule time, compare on resume. If different, force full reschedule. | `useNotificationRescheduler.ts` | 30 min |
| 10 | **Deterministic notification messages** — replace `Math.random()` with prayer-name + date-based index so same prayer shows same message on a given day. | `NotificationService.ts` | 20 min |
| 11 | **Soften keep-alive notification copy** — change from "Keep Your Prayer Reminders Active / Tap here to ensure..." to gentler Islamic greeting. | `NotificationService.ts` | 5 min |
| 12 | **AppState pause for useMosqueMode interval** — currently ticks every 60s even when app is backgrounded (unlike HomeScreen and PrayerTimesProvider which pause). | `useMosqueMode.ts` | 10 min |

---

## Phase 3 — Architecture (~3 hours)

Encryption integrity + interval consolidation + stale closure elimination.

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 13 | **MMKV lazy encryption init** — `StorageService` constructor currently creates MMKV at import time (before SecureStore key is ready), always using temp key. Fix: defer MMKV creation to a new `async initialize()` method called from `useAppInitialization` after `initializeEncryptionKey()`. Add `_ensureInitialized()` dev guard. No migration needed (no real users yet). | `StorageService.ts`, `StorageAdapter.ts`, `useAppInitialization.ts` | 1.5 hrs |
| 14 | **Merge concurrent 60s intervals** — HomeScreen `setCurrentTime` + PrayerTimesProvider `runRecalc` + useMosqueMode `checkActive` → single coordinated tick (e.g. shared event emitter or single interval in PrayerTimesProvider that exposes a `currentTime` via store). | `HomeScreen.tsx`, `PrayerTimesProvider.tsx`, `useMosqueMode.ts` | 1 hr |
| 15 | **Eliminate stale closures in NotificationService** — replace `setPrayerTimesSource()` closure pattern with direct `useStore.getState()` reads inside NotificationService methods. | `useServiceInitialization.ts`, `NotificationService.ts` | 30 min |

---

## Phase 4 — Pre-Scale (before 50K DAU)

Longer-term items. Not blocking launch but critical before significant user growth.

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 16 | **Unit tests** — Jest setup + tests for `calculateNextPrayer`, `parseTimeToDate`, notification scheduling logic, settings sync. | New test files, `package.json` | 2-3 days |
| 17 | **Server-side receipt validation** — RevenueCat or direct Apple/Google receipt validation to prevent premium bypass (currently client-side only). | Multiple | 3-5 days |
| 18 | **Server-side push (FCM)** — as primary notification delivery for passive users who don't open the app for days. | New infrastructure | 1-2 weeks |

---

## Audit Corrections (for the record)

6 claims in the original audit were **wrong** — documented here to prevent re-investigating:

| Claim | Reality |
|-------|---------|
| "PrayerCard is not memoized" | IS wrapped in `React.memo` with custom comparator (line 274). The real issue is `useStore()` without selectors bypassing the memo. |
| "14-day notification horizon" | 3-day Tier 1, 2-day lower tiers (`NotificationConstants.ts:7-8`). ~90 bridge calls, not 420. |
| "Scheduling lock doesn't exist" | MMKV-based lock with 2-min TTL exists (`NotificationService.ts:74-87`). |
| "420 bridge calls cause 2-5s block" | ~90 calls with 3-day horizon. Worth optimizing but not a blocker. |
| "MMKV key wrong on second launch → data loss" | Temp key used on EVERY launch (constructor always runs first). No data loss — just fake encryption. |
| "3-8 second first-launch spinner" | Trig fallback available. Severity overstated. |

---

## Timeline

| Phase | Duration | Dependency |
|-------|----------|------------|
| Phase 1 | 1 day | None — start immediately |
| Phase 2 | 0.5 day | After Phase 1 |
| Phase 3 | 1 day | After Phase 2 |
| Phase 4 | 1-3 weeks | After soft launch |

**Soft launch ready after Phase 2** (~1.5 days of work).
