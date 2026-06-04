# Tuba Tree Dev-Build Screenshot Capture Runbook

**Goal:** Capture 9 marketing screenshots of the Tuba Tree (3 stages × 3 themes) from a local
`__DEV__` build that exposes DevTreeTester. Production build 55 is `__DEV__ = false` and hides
the tester button entirely.

**Device:** Samsung Galaxy M21 (SM-M215F), Android 12, 1080×2340 px
**Repo root:** `/Users/dhrubo/Desktop/dev-folder/Sukoon`

---

## 1. Pre-flight — verify ADB connection

```bash
# Confirm device is attached
adb devices
# Expected: adb-R58NA1M6KCZ-LMVRYj._adb-tls-connect._tcp   device

# List all Sukoon-family packages currently installed
adb shell pm list packages | grep sukoon
# Expected: package:com.talukders.sukoon
```

If `adb devices` shows `unauthorized`, unlock the phone and tap "Allow" on the USB-debugging
prompt, then re-run.

---

## 2. Will the dev build overwrite production data?

**No.** The `android/app/build.gradle` debug build type does **not** set `applicationIdSuffix`.
Both debug and release share `applicationId = "com.talukders.sukoon"`. This means the dev build
installs **over** the production build and shares the same MMKV storage files.

**Mitigation before you build:**

```bash
# Back up production MMKV files via ADB (run BEFORE installing the dev build)
adb exec-out run-as com.talukders.sukoon tar c files/ > /tmp/sukoon-prod-mmkv-backup.tar
```

After the capture session, restore production from the Play Store (reinstall build 55) or restore
from the tar if you have root. The dev build will not corrupt data — it only adds the
`devSetState` / `devReset` calls when DevTreeTester is open — but the package identity collision
means you cannot run both simultaneously.

---

## 3. Dev build commands

The `android/` directory is already committed (prebuilt/committed native project). No
`expo prebuild --clean` is needed unless you have changed Expo config plugins since the last
prebuild. If in doubt, run prebuild first (adds ~5 min).

### Option A — direct Gradle build + install (fastest)

```bash
cd /Users/dhrubo/Desktop/dev-folder/Sukoon

# Start Metro bundler in one terminal (keep it running throughout)
npx expo start --dev-client

# In a second terminal — compile debug APK and sideload
npx expo run:android --variant debug
```

`npx expo run:android` runs `./gradlew assembleDebug` under the hood, installs the APK via ADB,
and launches the app. On a 16-core M-series Mac with a warm Gradle daemon and node_modules
already in place, expect **8–14 min** for the first build and **2–4 min** for incremental
rebuilds.

### Option B — if you want a clean prebuild first

```bash
npx expo prebuild --platform android --clean
npx expo run:android --variant debug
```

Add ~5 min for prebuild. Use this if plugins have changed (e.g., `withFullAdhan.js`).

### Confirm the dev build is running

Once installed, the app should show the orange Expo dev-client banner at the bottom and Metro
should show a connected client in the terminal. `__DEV__` is `true` in this mode.

---

## 4. Reaching DevTreeTester — exact in-app navigation

There is **no onboarding gate** — `AppNavigator` goes straight to `MainTabs` (no onboarding
stack). The app lands on the **Home (Pray) tab** immediately.

```
App launches → Home tab (Pray)
  └─ Tap bottom-tab "More" (rightmost tab, three-dot icon)
       └─ MenuScreen appears
            └─ Scroll down to the featured card titled "Tuba Tree"
               (it is a large card with a leaf/garden icon and subtitle
               "Private reflection of your journey")
            └─ Tap the "Tuba Tree" card → navigates to ReflectionGarden screen
                 └─ IF your dev account has no reflections yet:
                      Empty state is shown.
                      The "🧪 Test Tree Stages" button is at the bottom of the scroll.
                    IF you have existing reflections:
                      The live tree canvas is shown.
                      Scroll to the very bottom → "🧪 Test Tree Stages" button is there.
                 └─ Tap "🧪 Test Tree Stages"
                      → DevTreeTester replaces the screen
```

DevTreeTester opens showing five stage buttons in a horizontal row:
`🌱 Seedling (8)` | `🌿 Sapling (45)` | `🌳 Growing (160)` | `🌸 Flourishing (500)` | `🏛️ Ancient (1100)`

The currently selected stage is highlighted (teal background). It defaults to Seedling on open.

---

## 5. Capture sequence

### Output directory

```bash
mkdir -p /Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55
```

(Already exists from build 55 session — safe to reuse.)

### Theme cycle order

`toggleTheme` in ThemeProvider cycles: **dark → light → midnight → dark → …**
The UI labels these as: dark = **Twilight**, light = **Dawn**, midnight = **Midnight**.

The "App Theme" tile is on the **More tab → MenuScreen** (not in Settings). Its subtitle shows
the current theme name. Each tap of the tile advances one step.

Check current theme before starting: open More tab, read the "App Theme" subtitle.

### Recommended starting state

Set theme to **Twilight (dark)** before entering DevTreeTester:
- More tab → tap "App Theme" tile until subtitle reads "Currently: Twilight"

### Per-stage capture procedure (repeat for each of the 3 stages)

#### Stage: Sapling (45 reflections)

```bash
# --- In DevTreeTester: tap the "🌿 Sapling" button (second from left) ---
# Wait 3 seconds for the SVG tree canvas to render all leaves

# THEME 1: Twilight (dark) — prefix tw-
adb exec-out screencap -p > /Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55/tw-tuba-tree-sapling.png

# Switch theme: press Android back-button (or tap "✕ Close" and navigate to More tab)
# DevTreeTester "✕ Close" calls devReset() — if you close, you must reopen and re-tap Sapling.
# BETTER: keep DevTreeTester open and use adb input keyevent to go to More tab and back:
adb shell input keyevent KEYCODE_BACK    # exits DevTreeTester (calls devReset)
# Tap More tab
adb shell input tap 972 2260             # More tab (rightmost of 4 tabs, ~x=972 on 1080px wide)
# Tap "App Theme" tile — it is in the MenuScreen settings section, roughly y=1050 on M21
adb shell input tap 540 1050
# Verify subtitle changed (check visually), then re-enter:
adb shell input tap 540 750             # Tuba Tree card (approx — confirm visually first time)
# Scroll to bottom if needed, tap "🧪 Test Tree Stages"
# Re-tap "🌿 Sapling" button

# THEME 2: Dawn (light) — prefix dw-
# (After cycling theme once from Twilight → Dawn)
adb exec-out screencap -p > /Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55/dw-tuba-tree-sapling.png

# Cycle theme again (More tab → App Theme tile): Dawn → Midnight
# Re-enter DevTreeTester, tap Sapling again

# THEME 3: Midnight — prefix mn-
adb exec-out screencap -p > /Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55/mn-tuba-tree-sapling.png
```

#### Stage: Growing (160 reflections)

Repeat the above procedure, tapping `🌳 Growing` (third button):

```bash
# Twilight
adb exec-out screencap -p > /Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55/tw-tuba-tree-growing.png
# Dawn
adb exec-out screencap -p > /Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55/dw-tuba-tree-growing.png
# Midnight
adb exec-out screencap -p > /Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55/mn-tuba-tree-growing.png
```

#### Stage: Ancient (1100 reflections)

Repeat, tapping `🏛️ Ancient` (fifth/rightmost button):

```bash
# Twilight
adb exec-out screencap -p > /Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55/tw-tuba-tree-ancient.png
# Dawn
adb exec-out screencap -p > /Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55/dw-tuba-tree-ancient.png
# Midnight
adb exec-out screencap -p > /Users/dhrubo/Desktop/dev-folder/Sukoon/marketing-screenshots/build55/mn-tuba-tree-ancient.png
```

### ADB tap coordinate guidance for Galaxy M21 (1080×2340)

The M21 uses gesture navigation (no physical nav-bar buttons at those coords). Key landmarks:

| UI element | Approx ADB coords |
|---|---|
| Bottom tab bar center-Y | ~2260 px from top |
| Tab 1 — Pray (Home) | x≈135, y≈2260 |
| Tab 2 — Qibla | x≈378, y≈2260 |
| Tab 3 — Mosque | x≈702, y≈2260 |
| Tab 4 — More | x≈945, y≈2260 |
| "App Theme" tile in MenuScreen | x≈540, y≈1020 (scroll position dependent) |
| "Tuba Tree" card in MenuScreen | x≈540, y≈750 (approximate — confirm visually) |
| DevTreeTester: Sapling button | x≈270, y≈580 (second of 5 equal-width buttons) |
| DevTreeTester: Growing button | x≈432, y≈580 (third button) |
| DevTreeTester: Ancient button | x≈810, y≈580 (fifth button) |
| DevTreeTester: "✕ Close" | x≈950, y≈200 |

**Calibrate on first run:** Before scripting taps, manually confirm button positions once.
The DevTreeTester button row is a flex-row of 5 equal buttons from x≈70 to x≈1010;
each button is ~188 px wide. Button centers: Seedling≈163, Sapling≈351, Growing≈539,
Flourishing≈727, Ancient≈915.

### Waiting for render

After tapping a stage button, the TubaTreeCanvas redraws with new leaf data. Wait:
- Sapling (45 leaves): **2 seconds**
- Growing (160 leaves): **3 seconds**
- Ancient (1100 leaves): **5 seconds**

Use `sleep` in your shell between the tap and the screencap command:

```bash
adb shell input tap 351 580    # Sapling button
sleep 2
adb exec-out screencap -p > .../tw-tuba-tree-sapling.png
```

---

## 6. Cropping (optional)

The screencap is full 1080×2340. To crop to Google Play's preferred 1080×1920 (removing the
status bar and gesture-nav region):

```bash
# Requires ImageMagick (brew install imagemagick)
convert tw-tuba-tree-sapling.png -crop 1080x1920+0+60 tw-tuba-tree-sapling-cropped.png
```

Adjust the +0+60 offset so the status bar icons are excluded.

---

## 7. Post-capture cleanup

### devReset behavior

`DevTreeTester.handleClose()` calls `TreeGrowthStateService.devReset()` before returning to the
garden screen. This resets the in-memory dev state; the real MMKV store is restored to whatever
it held before. No permanent corruption occurs from using DevTreeTester.

### If you want to wipe the dev build's MMKV entirely

```bash
adb shell run-as com.talukders.sukoon rm -rf files/mmkv/
```

**Warning:** this also wipes production data (same package). Only do this after you have
reinstalled production from Play Store or restored from the tar backup.

### Restoring production build 55

Since debug and release share `com.talukders.sukoon`, installing the debug APK replaced the Play
Store build. To restore:

1. Uninstall the dev build: `adb uninstall com.talukders.sukoon`
2. Reinstall from Play Store (internal testing track) or sideload the production APK/APAB.
3. Restore MMKV backup if needed:
   ```bash
   adb shell run-as com.talukders.sukoon tar xf /tmp/sukoon-prod-mmkv-backup.tar
   ```

---

## 8. Total estimated time

| Step | Time |
|---|---|
| Gradle debug build (warm daemon, 16-core M-series) | 8–14 min |
| App install + launch | 1 min |
| Navigate to DevTreeTester | 2 min |
| 3 stages × 3 themes (tap + wait + screencap + theme cycle) | 10–15 min |
| **Total end-to-end** | **~21–32 min** |

A clean prebuild (`expo prebuild --clean`) adds ~5 min if needed.

---

## Quick-reference: 9 output files

```
marketing-screenshots/build55/
  tw-tuba-tree-sapling.png     (Twilight / dark)
  tw-tuba-tree-growing.png
  tw-tuba-tree-ancient.png
  dw-tuba-tree-sapling.png     (Dawn / light)
  dw-tuba-tree-growing.png
  dw-tuba-tree-ancient.png
  mn-tuba-tree-sapling.png     (Midnight)
  mn-tuba-tree-growing.png
  mn-tuba-tree-ancient.png
```
