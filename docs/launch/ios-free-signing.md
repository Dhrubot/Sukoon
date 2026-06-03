# iOS Free-Signing — sideload Sukoon to your iPhone without paying $99

This guide lets you install a dev-signed build of Sukoon on a real iPhone using
just your **free Apple ID** (no Apple Developer Program enrollment needed). Use
it for pre-launch QA. When you're ready to actually ship to the App Store,
enroll in the Developer Program and use the production flow in
`docs/launch/eas-submit-guide.md` instead.

## What works on a free-signed build

- ✅ All local notifications (prayer reminders, Mosque Mode prompts, dhikr)
- ✅ Adhan audio playback (foreground + background, even when phone is locked)
- ✅ Lock-screen behaviour, Do Not Disturb, Focus modes
- ✅ Location, Hijri date, Sanctuary view, Mindfulness Flow
- ✅ Widget extension and Live Activities (App Groups work with personal team)
- ⛔ Apple Push Notification service (APNs) — irrelevant; Sukoon is local-only

## What's different from a production build

| Concern | Free-signed | Production (paid) |
|---|---|---|
| Install expiry | **7 days** — must rebuild and re-install weekly | None — installs last until you uninstall |
| Number of apps per device | 3 free-signed apps max | Unlimited |
| Distribution | Cable only — your Mac → your iPhone | TestFlight, App Store, ad-hoc |
| `aps-environment` entitlement | Stripped by `scripts/devSignIos.mjs` | Restored before EAS production build |

## One-time setup

1. Plug your iPhone into your Mac with a Lightning/USB-C cable.
2. Trust the Mac on the iPhone when prompted.
3. Open Xcode at least once and sign in with your Apple ID under
   **Xcode → Settings → Accounts → +**. Your "Personal Team" becomes available.

## Build & install workflow (every time)

```bash
# 1. Strip aps-environment from entitlements (idempotent; backs up the original)
npm run ios:dev-sign

# 2. Open the Xcode workspace
open ios/Sukoon.xcworkspace

# 3. In Xcode:
#    - Select the Sukoon target → Signing & Capabilities tab
#    - Team: <Your Apple ID> (Personal Team)
#    - "Automatically manage signing" should be checked
#    - If "Push Notifications" capability is listed, click X to remove it
#    - Repeat for SukoonWidget target (same Team)
#
# 4. Top of the Xcode window: select your iPhone as the run destination
# 5. Cmd+R to build, sign, and install
```

On first install, iOS will refuse to launch the app and show
**"Untrusted Developer"**. To trust the build:

> Settings → General → VPN & Device Management → Developer App → trust
> your Apple ID.

After that, the app launches normally.

## When you're done testing — restore production state

Before kicking off an EAS production build, put the entitlement back:

```bash
npm run ios:dev-sign:restore
```

This restores the `aps-environment` key from the backup file
(`ios/Sukoon/Sukoon.entitlements.prod-backup`, gitignored). EAS / TestFlight
builds need it back in place.

## Check current state

```bash
npm run ios:dev-sign:status
```

Output is:
- `aps-environment: PRESENT (production)` — ready for EAS submit
- `aps-environment: STRIPPED (dev-sign ready)` — ready for Xcode free-signing

## Troubleshooting

**"Failed to register bundle identifier"** — someone else's free Apple ID has
claimed `com.talukders.sukoon`. Edit `app.config.js` and change the
`bundleIdentifier` to something unique (e.g. add `.dh` suffix), then re-run
`npx expo prebuild` followed by `npm run ios:dev-sign`.

**"App installation failed: This app cannot be installed because its integrity
could not be verified"** — the 7-day signing expired. Re-run the build.

**Push Notifications capability auto-reappears in Xcode** — the
expo-notifications plugin keeps trying to add it. Just remove it each time, or
in app.config.js move expo-notifications to use a config where push isn't
implied. The stripped entitlements file is the source of truth at build time.

**Widget extension fails to sign** — confirm SukoonWidget target's Team is also
set to your Personal Team. App Groups DO work with free signing as long as the
group ID matches between the app and its extension.

**Notifications don't fire when locked** — Settings → Notifications → Sukoon →
ensure "Lock Screen", "Notification Center", and "Banners" are all enabled,
and "Sounds" is on. iOS free signing doesn't affect these.
