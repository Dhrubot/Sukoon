# Pre-Merge Audit — feature/notification-prayer-times-hardening → main
**Date:** 2026-06-03 | **Build:** 55 (AAB in Play Console internal testing)

---

## 1. Git State

- ✓ **Uncommitted work:** Only `marketing-screenshots/` (untracked, non-code). No dirty tracked files.
- ✓ **Branch is 1 commit ahead of its remote** (`origin/feature/notification-prayer-times-hardening`). The unpushed commit is `3da4ce6 Add hosted privacy policy HTML`. Push before merging.
- ⚠ **Branch is 280 commits ahead of `origin/main`** (diverged at `40238d9`). `origin/main` has moved 25 commits since the fork point (PRs #21–#30 merged). A rebase or merge of `origin/main` into this branch is strongly recommended before merging to avoid surprises. File-level conflicts unlikely (different feature areas) but confirm.
- ✓ Top 5 hardening commits are coherent launch-prep work: privacy HTML, widget/Live Activity disable for v1, setState render fix, ledger backfill.

---

## 2. Manifest / Permissions

- ✓ `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION` — required for prayer-time calculation.
- ✓ `POST_NOTIFICATIONS`, `VIBRATE`, `WAKE_LOCK` — standard notification stack.
- ✓ `RECEIVE_BOOT_COMPLETED` — needed by `BootReceiver` for notification reschedule.
- ✓ `SCHEDULE_EXACT_ALARM` — required for adhan exact-alarm path; intentional.
- ✓ `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` — used by `AdhanService` and `AudioControlsService`; both declare `foregroundServiceType="mediaPlayback"` in the manifest. Consistent.
- ✓ `ACCESS_NOTIFICATION_POLICY` + `MODIFY_AUDIO_SETTINGS` — Mosque Mode DND; intentional.
- ✓ `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `USE_EXACT_ALARM` all carry `tools:node="remove"`. Blocklist is clean.
- ✓ `allowBackup="true"` with `android:fullBackupContent="@xml/secure_store_backup_rules"` and `android:dataExtractionRules="@xml/secure_store_data_extraction_rules"` set. Both XML files exist in `node_modules/expo-secure-store` and correctly include `sharedpref/.` while excluding `sharedpref/SecureStore`. SecureStore keys will NOT be backed up to Google Drive. Correct.

---

## 3. app.config.js

- ✓ Package name: `com.talukders.sukoon` (Android) and `com.talukders.sukoon` (iOS `bundleIdentifier`). Consistent.
- ⚠ **versionCode is 1** in `android/app/build.gradle:96`. EAS `production` profile has `autoIncrement: true` and `appVersionSource: remote` — this means EAS will manage the versionCode remotely at build time and the local `1` is irrelevant for EAS builds. However, if anyone runs a local Gradle build, they will produce versionCode 1, which Play Store will reject as a duplicate. This is a latent footgun; acceptable as long as all production builds go through EAS.
- ✓ `privacyPolicyUrl` is set: `"https://dhrubot.github.io/Sukoon/privacy"` — matches the `docs/privacy.html` file committed in the latest commit.
- ✓ `supportEmail: "support@sukoon.app"` is present.
- ⚠ **minify/shrinkResources are disabled** in production (`ANDROID_ENABLE_MINIFY=false`, `ANDROID_ENABLE_SHRINK_RESOURCES=false`). This is intentional per the env vars in `eas.json`, but means the production AAB is larger than necessary. Not a launch blocker, but flag for Build 56.

---

## 4. eas.json

- ✓ `production` profile builds `"buildType": "app-bundle"` — correct for Play Store.
- ✓ `autoIncrement: true` in production — EAS manages versionCode remotely.
- ✓ `mapping.txt` artifact path is captured for crash deobfuscation.
- ⚠ **iOS submit block has REPLACE_WITH_* placeholder values** (`ascApiKeyPath`, `ascApiKeyId`, `ascApiKeyIssuerId`, `appleTeamId`, `ascAppId`). These will break `eas submit` for iOS. Not a blocker for Play Store launch, but must be resolved before any TestFlight/App Store submission.

---

## 5. CI / Tests

- ✗ **No `.github/workflows/` directory exists.** There is no automated CI gating lint, typecheck, or tests on PRs. This is a launch risk: the merge is entirely reliant on manual QA. Recommend adding a minimal workflow (`npm run lint && npm run typecheck && npm test`) before or shortly after v1 launch.

---

## 6. Privacy Assets

- ✓ `/Users/dhrubo/Desktop/dev-folder/Sukoon/docs/privacy.html` exists and is 260 lines (non-empty).
- ✓ GitHub Pages source path: with Pages enabled on `main` pointing to `/docs`, the URL `https://dhrubot.github.io/Sukoon/privacy.html` will resolve correctly. Note the `privacyPolicyUrl` in `app.config.js` omits `.html` — confirm the server/Pages config handles this (GitHub Pages does **not** serve extensionless paths by default; the URL should be `https://dhrubot.github.io/Sukoon/privacy.html` with the `.html` suffix). Update `privacyPolicyUrl` to include `.html` or add a redirect.

---

## 7. Risk Flags

- ✓ **console.log in services:** Only 2 occurrences total. Both are in flag-gated paths:
  - `NotificationTraceService.ts:42` — guarded by `if (!this.enabled)` using `isNotificationTraceEnabled()`. Flag is `EXPO_PUBLIC_NOTIFICATION_TRACE_ENABLED=false` in production. Safe.
  - `PerformanceService.ts:53` — guarded by `if (!this.perfValidationEnabled)` using `isPerfValidationEnabled()`. Flag is `EXPO_PUBLIC_PERF_VALIDATION_ENABLED=false` in production. Safe.
- ✓ **Feature flags (`src/setupFeatureFlags.ts`):** Only one override — `scheduleAnimatedCleanupInMicrotask: () => true`. This is a React Native internal animation optimization, not a product feature flag. Looks intentional and low-risk.
- ✓ **No TODO/FIXME in notification or prayer-time critical paths** (`NotificationService.ts`, `PrayerTimeService.ts`, `src/services/notifications/`).
- ⚠ **`StorageService.ts:1102`** has `// TODO: Replace local-only entitlement check with server-side receipt validation`. This is in the monetization/entitlement path. Since monetization is stripped for v1 launch, this is not a launch blocker, but track for a future build.

---

## Summary Table

| Area | Status | Note |
|---|---|---|
| Uncommitted files | ✓ | Only untracked `marketing-screenshots/` |
| Branch vs remote | ⚠ | 1 unpushed commit; push before merge |
| Branch vs main | ⚠ | 25 commits on main not in branch; rebase recommended |
| Manifest permissions | ✓ | All intentional; blocklist clean; backup rules correct |
| Package name | ✓ | `com.talukders.sukoon` consistent |
| versionCode | ⚠ | Local Gradle shows `1`; EAS manages remotely (acceptable) |
| Privacy URL | ⚠ | Missing `.html` suffix in `privacyPolicyUrl` |
| EAS production profile | ✓ | Builds AAB, autoIncrement on |
| EAS iOS submit | ⚠ | Placeholder values; blocks iOS submission only |
| Minify/shrink in prod | ⚠ | Disabled; larger bundle; not a blocker |
| CI / automated gates | ✗ | No `.github/workflows/` — no PR gating |
| privacy.html | ✓ | Exists, 260 lines, correct path for GitHub Pages |
| console.log leaks | ✓ | 2 occurrences, both flag-gated (flags off in prod) |
| Feature flags | ✓ | Only animation optimization override |
| TODO in critical paths | ✓ | None in notification/prayer-time code |
| TODO in monetization | ⚠ | Server-side receipt validation deferred |

**Blockers (must fix before merge):** 1 — No CI. Not strictly a merge blocker but a significant quality gap for a v1 Play Store launch.

**Must-fix before merge:** Privacy URL `.html` suffix mismatch. Push unpushed commit. Rebase onto `origin/main`.
