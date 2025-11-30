# 🕌 Mosque Mode - Silent Phone Feature

## Overview

Mosque Mode is a feature that automatically puts your phone into silent mode when iqamah (congregation prayer) starts at the mosque. This ensures your phone doesn't disturb prayers.

**Key Features:**
- ✅ Automatic silent mode at iqamah time
- ✅ Configurable iqamah offsets per prayer
- ✅ Auto-restore ringer after prayer ends
- ✅ Platform-specific implementations (Android direct control, iOS via Focus Mode)
- ✅ Optional "Heading to mosque?" prompts

---

## 📦 What Was Built

### 1. **Native Android Module (via Expo Config Plugin)**
   - **File:** `plugins/withRingerMode.js`
   - **What it does:** Automatically generates Android native code during `expo prebuild`
   - **Native modules created:**
     - `RingerModeModule.java` - Controls device ringer mode
     - `RingerModePackage.java` - Registers module with React Native
   - **Permissions added:**
     - `MODIFY_AUDIO_SETTINGS`
     - `ACCESS_NOTIFICATION_POLICY`

### 2. **Data Model**
   - **File:** `src/types/index.ts`
   - **Interface:** `MosqueModeSettings`
   ```typescript
   {
     enabled: boolean;
     iqamahOffsets: { Fajr: 10, Dhuhr: 10, ... }; // Minutes after adhan
     silentDuration: 10; // Minutes
     autoRestore: true;
     promptBeforeEnable: true;
     useVibrateInsteadOfSilent: false;
   }
   ```

### 3. **Services**
   - **`MosqueModeService.ts`** - Core logic for scheduling and managing silent mode
   - **`RingerControlService.ts`** - TypeScript bridge to Android native module
   - **`RingerControlService.ios.ts`** - iOS-specific Focus Mode implementation

### 4. **React Hook**
   - **File:** `src/hooks/useMosqueMode.ts`
   - **Usage:**
   ```typescript
   const {
     isEnabled,
     settings,
     isActive,
     enableMosqueMode,
     setIqamahOffset,
     scheduleSilentMode,
   } = useMosqueMode();
   ```

### 5. **UI Components**
   - **`MosqueModeToggle.tsx`** - Master toggle in Settings
   - **`IqamahTimeConfig.tsx`** - Configure iqamah times per prayer
   - **`MosqueModePrompt.tsx`** - "Heading to mosque?" dialog
   - **`MosqueModeStatus.tsx`** - Active status banner on Home screen

### 6. **Integration Points**
   - Settings screen (`SettingsScreen.tsx`)
   - Home screen status banner (`HomeScreen.tsx`)
   - Notification handler (`NotificationService.ts`)

---

## 🚀 How to Build & Test

### **Step 1: Generate Native Code**

The Expo config plugin will automatically generate the native Android code when you build:

```bash
# Clean prebuild to ensure plugin runs
npx expo prebuild --clean

# For Android specifically
npx expo prebuild --platform android --clean
```

**What this does:**
- Creates `android/app/src/main/java/com/talukders/sukoon/RingerModeModule.java`
- Creates `android/app/src/main/java/com/talukders/sukoon/RingerModePackage.java`
- Adds permissions to `AndroidManifest.xml`
- Registers module in `MainApplication.java`

### **Step 2: Build Android**

```bash
# Development build
npx expo run:android

# Or using EAS
eas build --platform android --profile development
```

### **Step 3: Test on Device**

**⚠️ Important:** Ringer mode control only works on **physical devices**, not emulators.

#### **Android Testing:**

1. **Enable Mosque Mode:**
   - Go to Settings → Mosque Mode
   - Toggle "Mosque Mode" ON
   - Configure iqamah offsets (default: 10 minutes after adhan)

2. **Grant Permissions:**
   - Android may prompt for "Do Not Disturb access"
   - Go to Settings → Apps → Sukoon → Special access → Do Not Disturb access
   - Enable it

3. **Test Silent Mode:**
   - Option A: Wait for a real prayer time
   - Option B: Use notification debugger:
     ```typescript
     // In NotificationDebugScreen or via console
     import MosqueModeService from './services/MosqueModeService';
     
     const testPrayer = {
       name: 'Fajr',
       time: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
     };
     
     await MosqueModeService.scheduleSilentMode(testPrayer);
     ```

4. **Verify:**
   - Phone should go silent at iqamah time
   - Status banner appears on Home screen
   - Ringer automatically restores after 10 minutes

#### **iOS Testing:**

1. **Setup Shortcuts:**
   - Enable Mosque Mode in Settings
   - App will guide you through Shortcuts setup
   - Create shortcut named exactly: `MosqueSilent`
   - Add action: "Set Focus" → "Do Not Disturb" → "Turn On"

2. **Test Shortcut:**
   - In Settings → Mosque Mode
   - There should be a "Test Shortcut" button
   - Tap it to verify Focus Mode activates

3. **Test with Prayer:**
   - Mosque Mode will show reminder 2 minutes before iqamah
   - Tapping notification triggers Focus Mode

---

## 📱 User Flow

### **First-Time Setup**

1. User goes to **Settings → Mosque Mode**
2. Toggles **Mosque Mode** ON
3. **Android:** Instantly ready!
4. **iOS:** Guided through Shortcuts setup (one-time)
5. User configures iqamah offsets per prayer

### **Daily Usage**

#### **Scenario 1: Automatic Mode (Android)**
```
5:01 AM - Fajr adhan notification plays
5:20 AM - Phone automatically goes SILENT (iqamah time)
5:30 AM - Ringer automatically RESTORED
```

#### **Scenario 2: iOS Reminder Mode**
```
5:01 AM - Fajr adhan notification plays
5:18 AM - Reminder: "Fajr Iqamah in 2 minutes"
          "Tap to enable Do Not Disturb"
User taps → Focus Mode activated via Shortcut
```

#### **Scenario 3: With Prompt (Optional)**
```
5:01 AM - Adhan plays
5:01 AM - Dialog: "Heading to the mosque? 🕌"
          [Not Today] [Yes, Enable]
User taps "Yes, Enable" → Silent mode scheduled
```

---

## 🔧 Technical Details

### **Android Ringer Control**

The native module uses `AudioManager` to control ringer mode:

```java
AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
audioManager.setRingerMode(AudioManager.RINGER_MODE_SILENT);
```

**Modes Available:**
- `SILENT` - Complete silence
- `VIBRATE` - Vibrate only
- `NORMAL` - Normal ringer

### **iOS Focus Mode Trigger**

iOS doesn't allow direct ringer control, so we use Shortcuts app:

```typescript
// Trigger shortcut via URL scheme
await Linking.openURL('shortcuts://run-shortcut?name=MosqueSilent');
```

The shortcut activates Do Not Disturb Focus Mode.

### **Notification Scheduling**

Mosque Mode uses `expo-notifications` to schedule silent mode triggers:

```typescript
await Notifications.scheduleNotificationAsync({
  content: {
    title: '🕌 Fajr Iqamah',
    body: 'Phone is now in silent mode',
    data: { type: 'mosque_mode_enable', mode: 'SILENT' }
  },
  trigger: {
    type: 'date',
    date: iqamahTime,
  }
});
```

When the notification fires, the response handler calls:
```typescript
MosqueModeService.handleNotificationResponse(data);
```

---

## 🎨 UI Components Usage

### **In Settings Screen:**

```tsx
import { MosqueModeToggle, IqamahTimeConfig } from '../../components/mosque';

<SettingSection title="MOSQUE MODE">
  <MosqueModeToggle />
  {userSettings.mosqueMode?.enabled && (
    <IqamahTimeConfig />
  )}
</SettingSection>
```

### **In Home Screen:**

```tsx
import { MosqueModeStatus } from '../../components/mosque';

<MosqueModeStatus />
```

### **Prompt Dialog (Manual Trigger):**

```tsx
import { MosqueModePrompt } from '../../components/mosque';

const [showPrompt, setShowPrompt] = useState(false);

<MosqueModePrompt
  visible={showPrompt}
  prayer={currentPrayer}
  onConfirm={async () => {
    await MosqueModeService.scheduleSilentMode(currentPrayer);
    setShowPrompt(false);
  }}
  onCancel={() => setShowPrompt(false)}
/>
```

---

## 🐛 Troubleshooting

### **Android: Silent Mode Not Working**

**Problem:** Phone doesn't go silent at iqamah time

**Solutions:**
1. Check DND permission:
   ```
   Settings → Apps → Sukoon → Special access → Do Not Disturb access → Enable
   ```

2. Verify module loaded:
   ```typescript
   import { NativeModules } from 'react-native';
   console.log(NativeModules.RingerModeModule); // Should not be undefined
   ```

3. Test manually:
   ```typescript
   import RingerControlService from './services/RingerControlService';
   await RingerControlService.enableSilentMode();
   ```

4. Check notifications scheduled:
   ```typescript
   const scheduled = await Notifications.getAllScheduledNotificationsAsync();
   console.log(scheduled.filter(n => n.content.data?.type?.startsWith('mosque_mode')));
   ```

### **iOS: Shortcut Not Triggering**

**Problem:** Focus Mode doesn't activate

**Solutions:**
1. Verify shortcut exists:
   - Open Shortcuts app
   - Find "MosqueSilent" shortcut
   - Ensure it's named exactly (case-sensitive)

2. Test shortcut manually:
   - Run shortcut from Shortcuts app
   - Should activate Do Not Disturb

3. Check URL scheme:
   ```typescript
   const canOpen = await Linking.canOpenURL('shortcuts://');
   console.log('Shortcuts available:', canOpen);
   ```

4. Re-setup:
   ```typescript
   import IOSRingerControlService from './services/RingerControlService.ios';
   IOSRingerControlService.resetSetup();
   // Then go through setup again
   ```

### **Mosque Mode Not Appearing in Settings**

**Problem:** UI not showing

**Solutions:**
1. Check imports in `SettingsScreen.tsx`
2. Verify `mosqueMode` in user settings:
   ```typescript
   const settings = StorageService.getUserSettings();
   console.log(settings.mosqueMode);
   ```

3. Ensure default settings include mosque mode:
   ```typescript
   // In StorageService.ts
   getDefaultSettings() {
     return {
       // ...
       mosqueMode: this.getDefaultMosqueModeSettings(),
     };
   }
   ```

---

## 🔐 Permissions

### **Android**

Added automatically by plugin:

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY" />
```

**Runtime Permission:**
- Android 6.0+ requires "Do Not Disturb access"
- User must grant manually in system settings
- App can check: `RingerControlService.canModify()`

### **iOS**

No special permissions needed. Uses Shortcuts app which user controls.

---

## 📊 Storage

Mosque Mode settings are stored in MMKV storage:

**Keys:**
- `user_settings` - Contains `mosqueMode` object
- `mosque_mode_previous_ringer` - Saved ringer mode before silent
- `mosque_mode_active` - Current active mosque mode state
- `ios_shortcut_setup_complete` - iOS setup status

**Data Structure:**
```json
{
  "mosqueMode": {
    "enabled": true,
    "iqamahOffsets": {
      "Fajr": 10,
      "Dhuhr": 10,
      "Asr": 10,
      "Maghrib": 5,
      "Isha": 10
    },
    "silentDuration": 10,
    "autoRestore": true,
    "promptBeforeEnable": true,
    "useVibrateInsteadOfSilent": false
  }
}
```

---

## 🚢 Deployment

### **Development Build**

```bash
# Android
npx expo prebuild --clean --platform android
npx expo run:android

# iOS
npx expo prebuild --clean --platform ios
npx expo run:ios
```

### **Production Build (EAS)**

```bash
# Android
eas build --platform android --profile production

# iOS  
eas build --platform ios --profile production
```

### **Over-The-Air (OTA) Updates**

⚠️ **Note:** The native Android module CANNOT be updated via OTA.

**What can be OTA updated:**
- ✅ UI components (MosqueModeToggle, etc.)
- ✅ Service logic (MosqueModeService.ts)
- ✅ Settings screen integration
- ✅ Notification scheduling logic

**What requires new build:**
- ❌ Native Android module changes
- ❌ Plugin modifications
- ❌ Permission changes

After modifying the plugin or native code, always rebuild:
```bash
eas build --platform android
```

---

## 📝 Future Enhancements

### **Planned Features:**
1. **Smart Location Detection**
   - Auto-enable mosque mode when at mosque location
   - Learn user's mosque location

2. **Mosque Profiles**
   - Pre-configured profiles for popular mosques
   - Community-shared iqamah times

3. **Flexible Schedules**
   - Different iqamah times for weekdays/weekends
   - Special handling for Jumu'ah

4. **Better iOS Integration**
   - Investigate Focus Mode automation
   - Calendar integration for silent events

5. **Analytics**
   - Track mosque attendance
   - Prayer consistency at mosque

---

## 📚 Code References

### **Key Files:**

**Native Module:**
- `plugins/withRingerMode.js`

**Services:**
- `src/services/MosqueModeService.ts`
- `src/services/RingerControlService.ts`
- `src/services/RingerControlService.ios.ts`

**Types:**
- `src/types/index.ts` (MosqueModeSettings)

**Components:**
- `src/components/mosque/MosqueModeToggle.tsx`
- `src/components/mosque/IqamahTimeConfig.tsx`
- `src/components/mosque/MosqueModePrompt.tsx`
- `src/components/mosque/MosqueModeStatus.tsx`

**Hooks:**
- `src/hooks/useMosqueMode.ts`

**Integration:**
- `src/screens/Settings/SettingsScreen.tsx`
- `src/screens/Home/HomeScreen.tsx`
- `src/services/NotificationService.ts`

---

## ✅ Testing Checklist

### **Android**
- [ ] `expo prebuild --clean` runs successfully
- [ ] Native module files generated in `android/app/src/main/java/.../`
- [ ] App builds without errors
- [ ] Mosque Mode toggle appears in Settings
- [ ] Can configure iqamah offsets
- [ ] DND permission granted
- [ ] Phone goes silent at test iqamah time
- [ ] Status banner appears on Home screen
- [ ] Ringer auto-restores after duration
- [ ] Manual restore works

### **iOS**
- [ ] Mosque Mode toggle appears in Settings
- [ ] Setup guide shown on first enable
- [ ] Can create "MosqueSilent" shortcut
- [ ] Test shortcut triggers Focus Mode
- [ ] Reminder notification appears before iqamah
- [ ] Tapping reminder activates Focus Mode
- [ ] Status banner shows on Home screen

### **Both Platforms**
- [ ] Settings persist across app restarts
- [ ] Iqamah offsets save correctly
- [ ] UI responsive and styled correctly
- [ ] No TypeScript errors
- [ ] No console errors

---

## 🎉 Success!

Mosque Mode is now fully implemented and ready for testing! 

**Next Steps:**
1. Run `npx expo prebuild --clean`
2. Build for Android
3. Test on physical device
4. Set up iOS Shortcuts
5. Iterate based on feedback

May this feature help users maintain focus during prayers! 🕌🤲
