# EAS Build + Submit — Sukoon v1

End-to-end command sequence and credential setup for shipping Sukoon to the
Apple App Store and Google Play. Pair this with the rest of `docs/launch/`.

---

## 0. Prerequisites (one-time per machine)

```bash
npm install -g eas-cli
eas whoami            # confirms you're logged into the Expo account
# If not: eas login
eas init              # one-time, links this repo to an EAS project (skip if eas.json already has a projectId in extra)
```

Pin the EAS CLI version to match `eas.json` (currently `>= 16.28.0`).

---

## 1. Credentials you must provision **before** running `eas submit`

### Apple (iOS)
You have two routes; **use the API key** — it doesn't expire under your daily review pings the way an Apple ID password does.

1. App Store Connect → Users and Access → Integrations → Keys → **+ Generate API Key**
   - Role: **App Manager** (or Admin). Save the `.p8` file — Apple lets you download it **once**.
2. Note the **Key ID** (10 chars, on that page) and the **Issuer ID** (top of the page).
3. Note your **Team ID** (Apple Developer → Membership) and the **App Store Connect App ID** (the numeric ID of the Sukoon app record).
4. Put the `.p8` file at `./secrets/AuthKey_<KEY_ID>.p8` and update `eas.json` → `submit.production.ios` with:
   - `ascApiKeyPath` → `./secrets/AuthKey_<KEY_ID>.p8`
   - `ascApiKeyId` → the key ID
   - `ascApiIssuerId` → the issuer ID
   - `appleTeamId` → your team ID
   - `ascAppId` → the numeric ASC app ID

### Google (Android)
1. Google Cloud Console → IAM & Admin → Service Accounts → **Create service account**.
2. Roles: nothing in IAM — set the access in Play Console instead.
3. Create a JSON key for the service account → download.
4. Play Console → **Setup → API access** → invite the service account email, grant **"Release manager"** at minimum (or **Admin** if you want it to do everything).
5. Put the JSON at `./secrets/play-store-service-account.json`.
6. Confirm the Play Console listing has an **internal** test track set up (default in `eas.json`).

### Lock down `./secrets/`
```bash
echo "secrets/" >> .gitignore   # if not already ignored
```
Never commit either credential. `.gitignore` already excludes `secrets/` patterns? Verify before staging.

---

## 2. Manual launch-prep items that must be done before submitting

These are tracked across `docs/launch/`:

| Item | Where |
|---|---|
| Host the privacy policy at a public URL (GitHub Pages is easiest) | `docs/launch/privacy-policy.md` |
| Set up a working support email | `docs/launch/support-email-setup.md` |
| Update `app.config.js` → `extra.privacyPolicyUrl` + `extra.supportEmail` | `app.config.js` |
| Fill the Apple App Privacy "nutrition label" form | `docs/launch/app-privacy-data-safety.md` (Apple section) |
| Fill the Google Play Data Safety form | `docs/launch/app-privacy-data-safety.md` (Play section) |
| Submit sensitive-permission justifications in Play Console | `docs/launch/android-permission-justifications.md` |
| Paste the corrected listing copy into both stores | `docs/launch/store-listing-final.md` |
| Add screenshots (6 per platform) | use the captions in `docs/launch/store-listing-final.md` |
| Configure age rating + content rating questionnaires in both consoles | console flow |
| Run `npx expo prebuild --clean` and grep the generated `AndroidManifest.xml` to verify `USE_EXACT_ALARM` is **not** present | shell |

---

## 3. Build

```bash
# Both platforms in one go (parallel cloud build):
eas build --profile production --platform all

# Or one at a time:
eas build --profile production --platform ios
eas build --profile production --platform android
```

Notes:
- `eas.json` production profile sets `autoIncrement: true`, so versionCode/buildNumber auto-bump. You don't need to touch them.
- Production build env now sets `EXPO_PUBLIC_NOTIFICATION_TRACE_ENABLED=false` and `EXPO_PUBLIC_PERF_VALIDATION_ENABLED=false` — debug instrumentation does not ship.
- Android production keeps `ANDROID_ENABLE_MINIFY=false` for crash-symbol stability. If you later flip this, also update the `appConfigContract` test expectation.

Wait for both builds to go green in https://expo.dev (or watch the CLI). Typical time: ~15–25 min per platform.

---

## 4. Submit

```bash
# iOS — uploads the latest production build to App Store Connect.
# This puts the build in "Processing" → moves to TestFlight automatically.
# Reviewer submission is still a manual step in ASC.
eas submit --profile production --platform ios --latest

# Android — uploads the latest production build to the internal track as a draft.
# Promote it to Production after smoke-testing on the internal track.
eas submit --profile production --platform android --latest
```

Both commands will:
1. Prompt to confirm the build (if there are multiple latest candidates).
2. Use the credentials from `eas.json` → `submit.production`.
3. Upload to the respective console.

### What happens on each store after the upload
- **App Store Connect**: the build appears in TestFlight after processing (~10–30 min). Add it to the **App Review** form in the ASC web UI to actually submit for review.
- **Google Play**: the build appears in your **internal testing** track. To go to production:
  1. Internal testing → smoke test on a real device.
  2. Promote release → **Production**.
  3. Submit for review.

---

## 5. Post-submit checklist

| ✅ | What to verify after build but before review submit |
|---|---|
| ☐ | Install the EAS-built `.ipa` via TestFlight on a real iPhone, walk through onboarding (location → notifications → exact-alarm prompt → calc-method confirm). |
| ☐ | Same walkthrough on an Android device — confirm exact-alarm permission flow, then schedule a test notification and verify it fires. |
| ☐ | Trigger Mosque Mode on Android, confirm phone silences and auto-restores. |
| ☐ | Force-reboot the Android device with Mosque Mode active mid-window — confirm the `RingerModeBootReceiver` either re-arms or restores. |
| ☐ | Lock the phone and wait for a real prayer notification — confirm the adhan plays (alarm-stream, bypasses silent mode on Android). |
| ☐ | On iOS, confirm Mosque Mode behaves as **assisted** (two notifications, time-sensitive) — not "auto-silent". |
| ☐ | Export prayer data → confirm location + name are redacted by default; opt in and confirm they appear. |
| ☐ | Privacy policy URL opens correctly from Settings. |
| ☐ | Contact-support row sends mail to the support inbox. |

---

## 6. Emergency rollback

If something egregious ships:

- **Apple**: ASC → My Apps → Sukoon → App Store → Remove from sale (immediate) **or** submit a new build with a higher version and request expedited review.
- **Google**: Play Console → Production → Halt rollout (immediate) **or** promote a previous good release back to 100%.

There is no notification-level rollback — once a scheduled notification fires on a user's device, it fired. The fingerprint v2 / disk-only-boot / DST back-off changes mean a bad batch can't spam, but the prayer-time accuracy bar is high.
