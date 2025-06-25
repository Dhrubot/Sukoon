# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### 🚨 Build Errors

#### "Unable to resolve module" errors
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start -c
```

#### Android build fails
```bash
# Clean Android build
cd android
./gradlew clean
cd ..
npx expo run:android
```

#### iOS build fails
```bash
# Clean iOS build
cd ios
pod deintegrate
pod install
cd ..
npx expo run:ios
```

### 📱 Runtime Issues

#### Prayer times not updating
1. Check internet connection
2. Verify location permissions are granted
3. Try pulling down to refresh on home screen
4. Check if Aladhan API is accessible

#### Notifications not working

**Android:**
- Check notification permissions in device settings
- Ensure battery optimization is disabled for the app
- Some devices (Xiaomi, Huawei) require additional permissions

**iOS:**
- Check notification permissions in Settings > PrayerBuddy
- Ensure notifications are not in Do Not Disturb mode
- Restart the app after granting permissions

#### App crashes on startup
1. Delete app and reinstall
2. Clear app data/cache
3. Check for available device storage
4. Update to latest Expo Go version

### 🔄 Development Issues

#### Metro bundler issues
```bash
# Reset Metro cache
npx react-native start --reset-cache

# Or with Expo
npx expo start -c
```

#### TypeScript errors
```bash
# Rebuild TypeScript
npx tsc --build --clean
npx tsc
```

#### Hot reload not working
1. Shake device and select "Enable Fast Refresh"
2. Restart Metro bundler
3. Ensure you're on the same network as development server

### 📍 Location Issues

#### Location permission denied
- iOS: Settings > PrayerBuddy > Location > While Using App
- Android: Settings > Apps > PrayerBuddy > Permissions > Location

#### Incorrect prayer times
1. Verify your location is accurate
2. Try different calculation methods in settings
3. Check manual time adjustments haven't been set

### 💾 Storage Issues

#### Data not persisting
1. Ensure MMKV is properly installed
2. Check available device storage
3. Try uninstalling and reinstalling the app

#### Lost prayer history
- Currently, data is stored locally only
- Uninstalling the app will delete all data
- Cloud backup coming in future update

### 🎨 UI/Display Issues

#### Gradients not showing
- Update Expo Linear Gradient: `npm install expo-linear-gradient@latest`
- Restart the app

#### Text cut off or overlapping
- Check device font size settings
- Report specific device model and screen size

### 🔔 Notification Timing Issues

#### Notifications arrive at wrong time
1. Check device time zone settings
2. Verify prayer calculation method is appropriate for your location
3. Check manual adjustments in settings

#### Too many/few notifications
- Adjust notification settings
- Check if post-prayer reminders are enabled
- Ensure notification permissions are fully granted

## 📱 Device-Specific Issues

### Samsung
- Disable battery optimization for PrayerBuddy
- Add app to "Never sleeping apps"

### Xiaomi/Redmi
- Enable "Autostart" permission
- Disable battery restrictions
- Lock app in recent apps

### Huawei
- Enable "Auto-launch" in settings
- Disable "Manage automatically" in battery settings

### OnePlus
- Disable battery optimization
- Lock app in recent apps

## 🆘 Still Having Issues?

1. **Check the logs:**
   ```bash
   # For React Native logs
   npx react-native log-android
   npx react-native log-ios
   ```

2. **Enable debug mode:**
   - Shake device
   - Select "Debug JS Remotely"
   - Check browser console for errors

3. **Report an issue:**
   - Include device model and OS version
   - Steps to reproduce the issue
   - Screenshots if applicable
   - Any error messages

4. **Community support:**
   - Check existing GitHub issues
   - Join our Discord community (coming soon)
   - Email: support@prayerbuddy.app

## 🔍 Debug Commands

```bash
# Check React Native environment
npx react-native doctor

# Verify Expo setup
expo doctor

# Check TypeScript errors
npx tsc --noEmit

# Run linting
npm run lint
```

---

Remember: Most issues can be resolved by:
1. Restarting the app
2. Clearing cache
3. Reinstalling the app
4. Checking permissions

If you discover a new issue or solution, please contribute to this guide!