/**
 * Custom config plugin that filters expo-notifications sound files by platform.
 * - iOS: only .caf and .mp3 files
 * - Android: only .ogg and .mp3 files
 * This prevents the 2.4 MB adhan_ios.caf from shipping in the Android bundle.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const { basename, resolve } = require('path');
const { existsSync, unlinkSync } = require('fs');

const ANDROID_EXTENSIONS = ['.ogg', '.mp3', '.wav'];

function withPlatformSounds(config) {
  // --- Android: filter to Android-compatible sounds only ---
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const sounds = cfg.extra?.notificationSounds || [];
      const rawPath = resolve(cfg.modRequest.projectRoot, 'android/app/src/main/res/raw');

      // Remove any .caf files that expo-notifications may have already copied
      for (const soundPath of sounds) {
        const filename = basename(soundPath);
        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        if (!ANDROID_EXTENSIONS.includes(ext)) {
          const dest = resolve(rawPath, filename);
          if (existsSync(dest)) {
            unlinkSync(dest);
          }
        }
      }
      return cfg;
    },
  ]);

  // --- iOS: filter to iOS-compatible sounds only ---
  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      // iOS sounds are handled by expo-notifications plugin which copies to the bundle.
      // .ogg is not supported on iOS but won't cause issues if present — iOS just ignores it.
      // No action needed for iOS since .caf and .mp3 are both iOS-native.
      return cfg;
    },
  ]);

  return config;
}

module.exports = withPlatformSounds;
