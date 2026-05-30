// src/services/OEMOptimizationService.ts
//
// Mosque Mode Phase 5 — OEM battery-optimization guidance.
//
// Many Android OEMs (Samsung, Xiaomi/Redmi, Huawei/Honor, Oppo, Vivo, OnePlus,
// Realme, Meizu, Asus) ship aggressive battery-saver layers that go beyond
// stock Android Doze. These layers can kill the Mosque Mode foreground service
// mid-window, or prevent the AlarmManager from firing on time for prayer
// notifications, even when the user has granted all our other permissions.
//
// This service surfaces a single, Play-policy-safe escape hatch:
//   1. Detect whether the device manufacturer is one of the aggressive OEMs.
//   2. If so, offer to open the system "Battery optimization" list so the
//      user can manually add Sukoon to the "Don't optimize" allowlist.
//
// We intentionally do NOT use Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
// because that intent requires the REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
// permission, and Google Play restricts that permission to apps where battery
// optimization breaks the app's CORE function. Manual user action via the
// settings list is the compliant path.

import { Platform, Linking } from 'react-native';
import * as Device from 'expo-device';
import logger from '../utils/logger';

const AGGRESSIVE_OEM_KEYWORDS = [
  'samsung',
  'xiaomi',
  'redmi',
  'huawei',
  'honor',
  'oppo',
  'vivo',
  'oneplus',
  'realme',
  'meizu',
  'asus',
  'zte',
  'tecno',
  'infinix',
];

const MANUFACTURER_DISPLAY_NAMES: Record<string, string> = {
  samsung: 'Samsung',
  xiaomi: 'Xiaomi',
  redmi: 'Redmi',
  huawei: 'Huawei',
  honor: 'Honor',
  oppo: 'OPPO',
  vivo: 'Vivo',
  oneplus: 'OnePlus',
  realme: 'realme',
  meizu: 'Meizu',
  asus: 'ASUS',
  zte: 'ZTE',
  tecno: 'TECNO',
  infinix: 'Infinix',
};

class OEMOptimizationService {
  /**
   * True when the device is from a manufacturer known to apply battery limits
   * that can kill background services / delay alarms. iOS always returns false.
   */
  isAggressiveOEM(): boolean {
    if (Platform.OS !== 'android') return false;
    const manufacturer = (Device.manufacturer || '').toLowerCase();
    if (!manufacturer) return false;
    return AGGRESSIVE_OEM_KEYWORDS.some((keyword) => manufacturer.includes(keyword));
  }

  /** Display-friendly manufacturer name, or null when unknown / not Android. */
  manufacturerLabel(): string | null {
    if (Platform.OS !== 'android') return null;
    const raw = (Device.manufacturer || '').toLowerCase();
    if (!raw) return null;
    const match = AGGRESSIVE_OEM_KEYWORDS.find((keyword) => raw.includes(keyword));
    if (match && MANUFACTURER_DISPLAY_NAMES[match]) {
      return MANUFACTURER_DISPLAY_NAMES[match];
    }
    return Device.manufacturer || null;
  }

  /**
   * Opens the system "Battery optimization" list. The user can find Sukoon
   * and switch it to "Don't optimize" manually. Universal across OEMs and
   * compliant with Play Store policy (no special permission required).
   *
   * Returns true if an intent (or fallback Settings) was successfully launched.
   */
  async openBatteryOptimizationSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
      return true;
    } catch (error) {
      logger.warn(
        '[OEMOptimization] IGNORE_BATTERY_OPTIMIZATION_SETTINGS intent failed, falling back to app settings:',
        error,
      );
    }

    try {
      await Linking.openSettings();
      return true;
    } catch (fallbackError) {
      logger.error('[OEMOptimization] openSettings fallback failed:', fallbackError);
      return false;
    }
  }
}

export default new OEMOptimizationService();
