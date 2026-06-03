# Batch B Commit Review — feature/notification-prayer-times-hardening

**Reviewer:** Claude (automated pre-merge review)
**Date:** 2026-06-03
**Commits reviewed:** 10 (oldest → newest: d398e31 … 9fe0bce)
**Target:** merge into `main` for Play Store v1

---

## Commit 1 — d398e31

**Pre-launch quick wins: prod env flags + surface manual export**

### What it does
Sets `EXPO_PUBLIC_NOTIFICATION_TRACE_ENABLED=false` and `EXPO_PUBLIC_PERF_VALIDATION_ENABLED=false` in both the `preview` and `production` EAS build profiles (preventing verbose instrumentation from baking into shipped binaries), and flips `SHOW_APP_DATA_SECTION` from `false` to `true` so the manual JSON export / import section is reachable in Settings.

### Files touched
- `eas.json` — env overrides on preview + production build profiles
- `src/screens/Settings/SettingsScreen.tsx` — feature flag flip + inline comment

### Concerns

**⚠ Export section is now live before redaction is complete.**
The commit's own code comment calls this out explicitly ("blocker #8 must ship before users export in volume"). Commit e6d2816 (later in this batch) does ship the redaction. Assuming both land together in the same merge, the user risk window is closed. However, the comment in the source code will remain in `main` forever and may confuse future reviewers. Consider removing the note once e6d2816 is merged.

**Note — development `.env` still has trace flags as `true`.**
This is intentional (dev environment stays verbose), but confirm `.env` is not accidentally included in EAS cloud builds via a missing `.easignore` entry.

### Risk grade
⚠ note — safe to merge provided e6d2816 lands in the same merge; if cherry-picked alone it ships unredacted export to users.

---

## Commit 2 — 2d8fcc0

**Mosque Mode P1+P2 + launch-prep audit docs**

### What it does
Implements the JS-side Mosque Mode watchdog hook (Phase 1) that catches missed AlarmManager restore alarms on foreground transitions, and adds SharedPreferences persistence plus a `RingerModeBootReceiver` (Phase 2) so Mosque Mode state survives device reboot. Also adds five durable audit markdown documents in `docs/audit/`.

### Files touched
- `plugins/withRingerMode.js` — large addition: SharedPreferences prefs module + `RingerModeBootReceiver` native Java
- `src/hooks/useMosqueModeWatchdog.ts` — new hook, called from `ServiceProvider`
- `src/providers/ServiceProvider.tsx` — watchdog hooked in
- `src/services/MosqueModeService.ts` — `persistActiveState`, `rearmFromPersistence`
- `src/utils/mosqueModePlatform.ts` — iOS platform copy updated
- `src/__tests__/mosqueModeService.test.ts` — 23 tests
- `docs/audit/` — 5 new markdown reports

### Concerns

**⚠ Acknowledged follow-up in commit message: MIUI BOOT_COMPLETED real-device test pending.**
The commit notes "MIUI BOOT_COMPLETED needs real-device test." Xiaomi/MIUI devices typically require the app to be in the "Auto-start" allowlist for `BOOT_COMPLETED` to fire. If it does not fire, the Mosque Mode restore alarm is never re-armed after reboot. The `OEMBatteryGuidanceCard` (committed later, b9b48c7) is the documented mitigation, but it only shows after Mosque Mode is enabled and does not address the Xiaomi BOOT race. **This is a known, documented gap — not a hidden issue.**

**⚠ `notificationBootRescheduleTask` now calls `rearmFromPersistence` — confirmed present.**
The commit message says this was not yet done, but inspection of `src/tasks/notificationBootRescheduleTask.ts` (line 39) shows `rearmFromPersistence()` IS called there. The "known follow-up" in the commit message is therefore stale. No code action needed, but the wording in the docs may cause confusion.

**Note — iOS platform copy change (Automatic → Reminder) is purely cosmetic.**
No logic change on iOS; UI strings only.

**Note — SharedPreferences commit key is `sukoon_mosque_prefs`; MMKV key is different.**
Cross-process consistency depends on both paths writing to the same keys. The audit docs confirm this design is intentional.

### Risk grade
⚠ note — the MIUI boot gap is real but is documented and has a UI mitigation. No hidden auto-silence risk. Safe to merge.

---

## Commit 3 — a2a1029

**chore: ignore .claude/ agent worktree dir**

### What it does
Adds `.claude/` to `.gitignore` so the Claude Code agent's local worktree directory is never accidentally committed.

### Files touched
- `.gitignore`

### Concerns
None.

### Risk grade
✓ clean

---

## Commit 4 — e6d2816

**Prayer-time trust fallback + first-launch calc-method confirm + export redaction**

### What it does
Three independent features in one large commit:
1. Adds a `stale_cache` quality tier to `PrayerTimeService` — the most-recent successful fetch is persisted as "last-known-good" (LKG) and used as tier-5 fallback before hardcoded defaults, in both the network and disk-only paths.
2. Adds `OnboardingCalcMethodConfirmStep` to onboarding — shows a live prayer time preview of the auto-detected calculation method and persists `calculationMethodManuallySelected: true` on confirm.
3. Adds export-data redaction — `StorageService.exportPrayerData()` defaults to stripping lat/lng/city/name; opt-in `includeLocation: true` restores raw values. `importPrayerData` respects the redacted marker and never overwrites the device's current location with zeroed values.

### Files touched
- `src/services/PrayerTimeService.ts` — LKG logic (+156 lines)
- `src/services/StorageService.ts` — export/import redaction (+80 lines)
- `src/providers/PrayerTimesProvider.tsx` — exposes `prayerTimeQuality`
- `src/screens/Onboarding/OnboardingScreen.tsx` — new step inserted
- `src/components/onboarding/OnboardingCalcMethodConfirmStep.tsx` — new component
- `src/screens/Settings/modals/ExportDataConfirmModal.tsx` — new modal
- `src/screens/Settings/SettingsScreen.tsx` — wires redaction modal
- `app.config.js` — adds `extra.supportEmail` and `extra.privacyPolicyUrl`
- `src/utils/supportConfig.ts` — typed accessors for those extras
- `src/screens/Settings/components/AboutSection.tsx` — Contact support row
- `docs/launch/` — 5 new launch artifact docs
- `src/__tests__/` — 13 new unit tests across 2 files + updates to 2 existing

### Concerns

**⚠ Privacy policy URL in `app.config.js` (`https://dhrubot.github.io/Sukoon/privacy.html`) differs from the URL recommended in `docs/launch/privacy-policy.md` (`https://dhrubot.github.io/Sukoon/privacy`).**
A `docs/privacy.html` file exists at the repo root's docs folder, so GitHub Pages should serve the `.html` URL. However the docs/launch/privacy-policy.md suggests hosting at `/privacy` (no extension, via Jekyll front matter). Confirm which URL is live before submission — the currently baked URL (`/privacy.html`) and the store listing copy (`/privacy`) diverge. One must be updated.

**⚠ Fallback support email `codifizz@gmail.com` is a personal Gmail address baked into `src/utils/supportConfig.ts` as `FALLBACK_SUPPORT_EMAIL`.**
This address will appear in the "Contact support" row for any user who upgrades the app before `app.config.js extra.supportEmail` is updated to a production address. The `app.config.js` currently has `"supportEmail": "codifizz@gmail.com"` — not a placeholder. This is not a secret, but it is the developer's personal address surfaced to production users. This should be treated as a pre-submission action item.

**Note — `app.config.js extra.supportEmail` is `"codifizz@gmail.com"`, not a `REPLACE_WITH_…` placeholder.**
This means it will bake into the production binary as-is unless changed before the EAS build. The `eas-submit-guide.md` lists "update `extra.supportEmail`" as a manual prerequisite — but the value in the file is not obviously a placeholder, which may be missed.

**Note — Stale cache location/method leakage risk is low.**
The LKG snapshot stores `{ location, times, capturedAt, date }`. The `location` coordinates flow back from LKG only into the prayer time calculation — they are not forwarded to analytics or surfaced in any export (export redaction strips them separately). Failure mode is clear: if all network and astronomical paths fail AND LKG is absent, `getPrayerTimesList` returns an `invalid` quality result with 0 prayer times. PrayerTimesProvider consumers can key off `prayerTimeQuality` to show an offline banner (UI not yet implemented per commit note — quality flag is the v1 contract).

**Note — `OnboardingCalcMethodConfirmStep` is a new required step in onboarding.** Confirm existing users upgrading from a previous build (with `calculationMethodManuallySelected` already true) do not see a redundant confirmation prompt. The commit confirms the flag is persisted on first confirm, but the step gate logic should verify the onboarding flow checks `hasCompletedOnboarding` or similar to skip re-showing for upgrades.

**Note — 325/326 tests pass; one pre-existing `appConfigContract` failure noted in commit message.** This pre-existing failure should be investigated before merge to confirm it is genuinely pre-existing and not masked by this commit's changes.

### Risk grade
⚠ note — two items warrant pre-submission action: privacy URL disambiguation and the personal email address. Neither blocks merge but both block store submission.

---

## Commit 5 — c9f382a

**Launch artifacts: privacy URL, support email, listing honesty, Data Safety, permissions**

### What it does
Adds five launch docs to `docs/launch/` (privacy policy, support email guide, store listing copy, Apple App Privacy / Google Data Safety form answers, Android permission justifications). Also removes the `USE_EXACT_ALARM` permission injection from `plugins/withRingerMode.js`, resolving the conflict with `app.config.js blockedPermissions`. Adds typed `supportConfig.ts` accessors and a "Contact support" row to `AboutSection.tsx`.

### Files touched
- `plugins/withRingerMode.js` — removes `USE_EXACT_ALARM` injection
- `app.config.js` — adds `extra.supportEmail`, `extra.privacyPolicyUrl`
- `src/utils/supportConfig.ts` — new file
- `src/screens/Settings/components/AboutSection.tsx` — new Contact row
- `docs/launch/` — 5 new markdown documents (read-only reference material)

### Concerns

**⚠ `USE_EXACT_ALARM` removal is correct but must be verified post-prebuild.**
The plugin was racing against `app.config.js blockedPermissions`. The fix (removing the plugin's `permissions.push(USE_EXACT_ALARM)` call) is correct, but the docs themselves call out: "An engineer must run `expo prebuild` and inspect the generated `AndroidManifest.xml` to confirm which permission(s) are actually present." This verification has not been done in CI (no `npx expo prebuild` is run in these commits). This is flagged as a **required pre-submission manual step**.

**⚠ `app-privacy-data-safety.md` flags open questions about Firebase Advertising ID collection and Android Auto Backup behavior.**
These are honestly documented as "Verify with engineer" items. They affect the accuracy of the Data Safety form submitted to Google Play. Filing inaccurate Data Safety answers is a Play policy violation that can cause removal post-launch. These must be verified before submission.

**Note — `docs/launch/android-permission-justifications.md` notes the `USE_EXACT_ALARM` conflict** and explicitly requires post-prebuild verification. This document is correct; the fix in this same commit should resolve the conflict, pending `prebuild` confirmation.

**Note — `docs/launch/store-listing-final.md` iOS adhan claim** ("short adhan clip with time-sensitive priority") is accurately described per the codebase. The iOS/Android platform split in Mosque Mode copy is correctly distinguished.

**Note — Privacy policy is written as a Markdown file with Jekyll front matter.**
It is designed to be hosted on GitHub Pages. A `docs/privacy.html` file already exists in the repo. Confirm which file is canonical before pointing the store listing to a URL.

### Risk grade
⚠ note — `USE_EXACT_ALARM` manifest conflict fix needs post-`prebuild` verification; Firebase Advertising ID and Auto Backup questions must be answered before Data Safety form submission. Code change itself is safe to merge.

---

## Commit 6 — 0bf078b

**Strip dormant monetization + add mobile-mcp + draft EAS submit**

### What it does
Deletes all monetization scaffolding (`GoPremiumCard`, `PremiumGate`, `IAPManager`, `SubscriptionService`, `DonationService`, `usePremium`), removes the corresponding analytics events and methods from `AnalyticsService`, removes the commented-out `SubscriptionService.initialize()` call, adds `.mcp.json` for the `mobile-mcp` MCP server, populates `eas.json` submit configuration with `REPLACE_WITH_…` placeholders, and adds `eas-submit-guide.md`.

### Files touched
- `src/components/monetization/GoPremiumCard.tsx` — deleted
- `src/components/monetization/PremiumGate.tsx` — deleted
- `src/services/monetization/DonationService.ts` — deleted
- `src/services/monetization/IAPManager.ts` — deleted
- `src/services/monetization/SubscriptionService.ts` — deleted
- `src/services/monetization/README.md` — deleted
- `src/hooks/usePremium.ts` — deleted
- `src/hooks/useServiceInitialization.ts` — commented-out line removed
- `src/services/AnalyticsService.ts` — event union and methods trimmed
- `eas.json` — submit.production populated
- `.mcp.json` — new file
- `.gitignore` — `secrets/` added
- `docs/launch/eas-submit-guide.md` — new file

### Concerns

**⚠ Orphan types and StorageService methods remain in the codebase.**
`src/types/index.ts` still defines `PremiumFeatures` (line 326), `SubscriptionPlan` (line 316), and `Donation` interfaces. `src/services/StorageService.ts` still implements `clearSubscription()`, `setPremiumFeatures()`, `getPremiumFeatures()`, `getDonationHistory()` (lines 1219–1272). These are dead code — nothing in the active path calls them after this commit. They are not harmful at runtime (the methods exist but are never invoked), but they will confuse future developers and may trigger "why is subscription state being cleared at startup?" questions. This is a cleanup debt item, not a blocker.

**Note — `.mcp.json` commits `npx -y @mobilenext/mobile-mcp@latest` (floating `latest` version).**
This pins no version. The MCP server will auto-upgrade silently whenever a developer runs it. For a dev-only tooling file this is acceptable, but document it as a known "latest-floating" dependency.

**Note — `eas.json` submit.production contains `REPLACE_WITH_…` strings, not live credentials.**
These are placeholder tokens that must be manually replaced before `eas submit` is run. The `secrets/` path is correctly gitignored. The guide in `eas-submit-guide.md` clearly calls this out.

**Note — `DonationService.ts` previously hardcoded product IDs (`com.talukders.sukoon.donate.*`).**
Removing these removes the App Review binary-scan risk. Clean deletion — no trace in active code paths confirmed by grep.

**Note — `SubscriptionService.disableStoredPremiumState()` was the one caller of `StorageService.clearSubscription()` and `StorageService.setPremiumFeatures()`.**
With `SubscriptionService` deleted, those StorageService methods are now unreachable from production code. The orphan methods noted above are confirmed dead.

### Risk grade
⚠ note — orphan `PremiumFeatures` / `SubscriptionPlan` types and dead `StorageService` monetization methods remain. Not a runtime risk. Clean-up recommended before v1.1.

---

## Commit 7 — b9b48c7

**Mosque Mode P5: OEM battery-optimization guidance card**

### What it does
Adds `OEMOptimizationService` with manufacturer-based detection of aggressive-OEM Android devices, and `OEMBatteryGuidanceCard` — a dismissable card that deep-links to `android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS`. The card is rendered above the IQAMAH TIMES section when Mosque Mode is enabled. Dismissal is persisted to MMKV. 26 unit tests cover detection, iOS no-op, null manufacturer, display-name canonicalization, and the intent→fallback chain.

### Files touched
- `src/services/OEMOptimizationService.ts` — new
- `src/components/mosque/OEMBatteryGuidanceCard.tsx` — new
- `src/screens/MosqueMode/MosqueModeScreen.tsx` — card inserted
- `src/__tests__/oemOptimizationService.test.ts` — 26 tests

### Concerns

**Note — `OEMBatteryGuidanceCard` shows only when `isEnabled` (Mosque Mode on).**
The card does NOT appear on first install or on the notification settings screen. Users who never enable Mosque Mode will never see the battery guidance. If full-adhan reliability is also affected by OEM battery limits, consider showing a version of this card in the notification settings or after onboarding. Not a blocker for v1, but worth noting as a fast-follow.

**Note — `IGNORE_BATTERY_OPTIMIZATION_SETTINGS` intent is the Play-policy-safe path.**
The implementation correctly avoids `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (which requires a restricted permission). The fallback to `Linking.openSettings()` is sound.

**Note — Dismissal key `oem_battery_guidance_dismissed_v1` uses `StorageService.getValue` / `setValue`.**
These methods write to the encrypted MMKV store. A try/catch wraps both read and write, so a storage failure degrades gracefully (card shows every session but does not crash). This is correct behavior.

**Note — `ZTE`, `Tecno`, `Infinix` are included in the aggressive OEM list but are not covered by named tests.**
The test file covers Samsung, Xiaomi, Redmi, HUAWEI, Honor, OPPO, Vivo, OnePlus, Realme, Meizu, ASUS as positive cases. ZTE, Tecno, Infinix are in the service's keyword list but absent from the test matrix. Low-risk gap (string matching is the same logic), but worth noting.

### Risk grade
✓ clean — well-tested, iOS short-circuits, dismiss is persistent, no auto-silence risk.

---

## Commit 8 — a72e3e2

**iOS free-signing tooling: dev-sign script, npm aliases, sideload guide**

### What it does
Adds a Node.js script (`scripts/devSignIos.mjs`) that strips the `aps-environment` entitlement from the generated iOS entitlements file so the app can be sideloaded via Xcode Personal Team (free Apple ID). Adds three `npm run ios:dev-sign*` aliases to `package.json`. Adds documentation. Gitignores the entitlement backup file.

### Files touched
- `scripts/devSignIos.mjs` — new file
- `package.json` — 3 new npm aliases
- `docs/launch/ios-free-signing.md` — new doc
- `.gitignore` — backup path added

### Concerns

**Note — script is idempotent and reversible by design.**
`--strip` mode backs up the original before modifying; `--restore` reads from the backup. If the backup file is deleted (e.g., after `npx expo prebuild --clean`), `--restore` exits with a clear error. No data loss risk.

**Note — script operates on `ios/Sukoon/Sukoon.entitlements`, which is generated by `expo prebuild` and is gitignored.**
The script will fail with a clear message if the file doesn't exist (`npx expo prebuild` must run first). This is documented.

**Note — `aps-environment` entitlement is required for production builds (TestFlight/App Store).**
The doc clearly states to run `npm run ios:dev-sign:restore` before an EAS production build. Failure to restore would break Push Notification delivery — but Sukoon uses local-only notifications, so this would only surface if a future push notification pipeline is added. The 7-day sideload expiry is a natural forcing function to re-run the workflow.

**Note — Script in repo does not affect the production EAS cloud build.**
EAS builds run in a fresh cloud environment; they do not execute `scripts/devSignIos.mjs`. The entitlements file for EAS builds is regenerated from `app.config.js` during prebuild in the cloud. No production build risk.

### Risk grade
✓ clean — tooling-only change, does not affect production build path.

---

## Commit 9 — 130d986

**Fix EAS submit schema: ascApiIssuerId → ascApiKeyIssuerId**

### What it does
Corrects a typo in the `eas.json` `submit.production.ios` block — the EAS CLI validator rejects `ascApiIssuerId`; the correct key is `ascApiKeyIssuerId` (with "Key" in the middle). Also corrects the matching reference in `docs/launch/eas-submit-guide.md`.

### Files touched
- `eas.json` — single key rename
- `docs/launch/eas-submit-guide.md` — matching line in guide

### Concerns
None. This is a correct schema fix. The wrong key would have caused `eas submit --platform ios` to fail at credential validation.

### Risk grade
✓ clean

---

## Commit 10 — 9fe0bce

**Android launch QA infra: test matrix + logcat cheatsheet**

### What it does
Adds two companion docs for the pre-Play-Store hardening walk: `android-qa-walk.md` (six-block ~45-minute test matrix with explicit PASS criteria) and `android-logcat-cheatsheet.md` (per-feature `adb logcat` filters and quick `dumpsys` commands).

### Files touched
- `docs/launch/android-qa-walk.md` — new
- `docs/launch/android-logcat-cheatsheet.md` — new

### Concerns

**Note — docs reference `npx expo run:android --device` (development build) for the QA walk.**
This is appropriate for the QA walk but differs from the EAS production build. The QA walk must also be run on an EAS-built APK (preview profile) before Play Store submission. The docs do not explicitly call this out.

**Note — Several debug screen references (e.g., "MM1. Test Mosque Mode (1-min)") assume the debug UI is visible.**
The debug UI renders only in dev builds (`__DEV__ === true`). Block 0 of the QA walk correctly instructs the tester to confirm they are in dev mode. No action needed.

**Note — No new code in this commit.**
Purely documentation. Cannot introduce regressions.

### Risk grade
✓ clean

---

## Batch B Summary

### Totals
| Grade | Count |
|---|---|
| ✓ clean | 5 (a2a1029, b9b48c7, a72e3e2, 130d986, 9fe0bce) |
| ⚠ note | 5 (d398e31, 2d8fcc0, e6d2816, c9f382a, 0bf078b) |
| ✗ blocker | 0 |

### Top 3 Pushback Items

**1. Support email / privacy URL are personal/mismatched — required pre-submission action (e6d2816 + c9f382a)**

`app.config.js extra.supportEmail` is `"codifizz@gmail.com"` (personal Gmail, not a placeholder). `app.config.js extra.privacyPolicyUrl` is `"https://dhrubot.github.io/Sukoon/privacy.html"` while the privacy policy doc recommends hosting at `…/privacy` (no extension). A `docs/privacy.html` exists so the baked URL may resolve — but neither value should ship to production unchanged. The EAS submit guide lists these as manual prerequisites, but because the current values look like real values (not `REPLACE_WITH_…`), they may be accidentally shipped as-is.

**Action before EAS production build:** update `extra.supportEmail` to the production address (e.g., `support@sukoon.app`), verify `extra.privacyPolicyUrl` resolves publicly and matches the URL submitted to both stores.

**2. USE_EXACT_ALARM post-prebuild verification required (c9f382a)**

`withRingerMode.js` previously injected `USE_EXACT_ALARM` into the manifest. This commit removes that injection. The permission is also listed in `app.config.js blockedPermissions`. The two should now agree, but this has not been verified by running `npx expo prebuild` and inspecting the generated `AndroidManifest.xml`. An inaccurate manifest can trigger Play Console rejection or unpublishing.

**Action before Play Store submission:** run `npx expo prebuild --clean` and `grep USE_EXACT_ALARM android/app/src/main/AndroidManifest.xml` — must return no hits.

**3. Orphan monetization types and StorageService methods not cleaned up (0bf078b)**

`PremiumFeatures`, `SubscriptionPlan`, `Donation` interfaces remain in `src/types/index.ts`. `clearSubscription()`, `setPremiumFeatures()`, `getPremiumFeatures()`, `getDonationHistory()` remain in `StorageService`. These are unreachable dead code post-monetization strip, but they will confuse future contributors and could be resurrected accidentally. No runtime risk.

**Action before v1.1 (not a merge blocker):** remove orphan types from `src/types/index.ts` and corresponding dead methods from `StorageService.ts`.

### Overall Confidence

**MEDIUM — safe to merge, but two pre-submission action items must be completed before submitting to either store.**

The code changes are well-constructed. Mosque Mode auto-silence cannot fire unexpectedly (requires explicit user enable + iqamah time arrival). Prayer-time fallback has a clear tier order and failure modes. Export redaction defaults to safe. The monetization strip is complete in the active code paths. The EAS schema fix is correct. The QA docs are detailed and actionable.

The two items that must be resolved before store submission — the personal email address in config and the unverified manifest permission — are process gaps, not code bugs. Both are caught by the pre-submission checklist in `eas-submit-guide.md`; the risk is that they are not obviously flagged as "REPLACE THIS" in the config file itself.
