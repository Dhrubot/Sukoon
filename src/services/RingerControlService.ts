// src/services/RingerControlService.ts
import { NativeModules, Platform, Linking } from 'react-native';
import logger from '../utils/logger';

type RingerMode = 'SILENT' | 'VIBRATE' | 'NORMAL';

interface RingerModeModule {
  setRingerMode(mode: RingerMode): Promise<string>;
  getRingerMode(): Promise<RingerMode>;
  canModifyRingerMode(): Promise<boolean>;
  scheduleMosqueMode(
    enableAtMs: number,
    restoreAtMs: number,
    enableMode: RingerMode,
    restoreMode: RingerMode,
    requestCodeBase: number
  ): Promise<boolean>;
  cancelMosqueMode(requestCodeBase: number): Promise<boolean>;
  openNotificationPolicyAccessSettings(): Promise<boolean>;
}

class RingerControlService {
  private hasLoggedMissingModule = false;

  private getModule(): RingerModeModule | null {
    if (Platform.OS !== 'android') {
      return null;
    }

    const module = NativeModules.RingerModeModule ?? null;
    if (!module && !this.hasLoggedMissingModule) {
      this.hasLoggedMissingModule = true;
      logger.warn('RingerModeModule not available — native module not registered. Run expo prebuild --clean.');
    }

    if (module && this.hasLoggedMissingModule) {
      this.hasLoggedMissingModule = false;
    }

    return module;
  }

  /**
   * Whether the native ringer module is loaded and usable.
   * UI should check this before offering DND-dependent features.
   */
  isAvailable(): boolean {
    return this.getModule() !== null;
  }

  /**
   * Check if the app has DND policy access (Android 6.0+).
   */
  async canModify(): Promise<boolean> {
    const module = this.getModule();
    if (!module) return false;
    try {
      return await module.canModifyRingerMode();
    } catch (error) {
      logger.error('Failed to check DND permission:', error);
      return false;
    }
  }

  /**
   * Set the device ringer mode.
   */
  async setRingerMode(mode: RingerMode): Promise<boolean> {
    const module = this.getModule();
    if (!module) return false;
    try {
      const canModify = await this.canModify();
      if (!canModify) {
        logger.warn('No DND permission — cannot set ringer mode');
        return false;
      }
      await module.setRingerMode(mode);
      logger.log(`Ringer mode set to: ${mode}`);
      return true;
    } catch (error) {
      logger.error(`Failed to set ringer mode to ${mode}:`, error);
      return false;
    }
  }

  async scheduleMosqueMode(
    enableAtMs: number,
    restoreAtMs: number,
    enableMode: RingerMode,
    restoreMode: RingerMode,
    requestCodeBase: number
  ): Promise<boolean> {
    const module = this.getModule();
    if (!module) return false;
    try {
      const canModify = await this.canModify();
      if (!canModify) {
        logger.warn('No DND permission — cannot schedule mosque mode');
        return false;
      }
      return await module.scheduleMosqueMode(
        enableAtMs, restoreAtMs, enableMode, restoreMode, requestCodeBase
      );
    } catch (error) {
      logger.error('Failed to schedule mosque mode:', error);
      return false;
    }
  }

  async cancelMosqueMode(requestCodeBase: number): Promise<boolean> {
    const module = this.getModule();
    if (!module) return false;
    try {
      return await module.cancelMosqueMode(requestCodeBase);
    } catch (error) {
      logger.error('Failed to cancel mosque mode:', error);
      return false;
    }
  }

  /**
   * Open Android DND permission settings.
   * Uses native module (getCurrentActivity) with Linking.openSettings fallback.
   * Throws on total failure so the caller can inform the user.
   */
  async openNotificationPolicyAccessSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const module = this.getModule();

    // Try native module first (uses getCurrentActivity — most reliable)
    if (module) {
      try {
        return await module.openNotificationPolicyAccessSettings();
      } catch (error) {
        logger.warn('Native openNotificationPolicyAccessSettings failed, trying Linking fallback:', error);
      }
    }

    // Fallback: open general app settings via Linking
    try {
      await Linking.openSettings();
      return true;
    } catch (error) {
      logger.error('All methods to open DND settings failed:', error);
      throw new Error('Could not open DND settings. Please open Android Settings > Apps > Sukoon > Notifications manually.');
    }
  }

  async getRingerMode(): Promise<RingerMode | null> {
    const module = this.getModule();
    if (!module) return null;
    try {
      return await module.getRingerMode();
    } catch (error) {
      logger.error('Failed to get ringer mode:', error);
      return null;
    }
  }

  async enableSilentMode(): Promise<boolean> {
    return this.setRingerMode('SILENT');
  }

  async enableVibrateMode(): Promise<boolean> {
    return this.setRingerMode('VIBRATE');
  }

  async restoreNormalMode(): Promise<boolean> {
    return this.setRingerMode('NORMAL');
  }

  async isSilent(): Promise<boolean> {
    const mode = await this.getRingerMode();
    return mode === 'SILENT';
  }
}

export default new RingerControlService();
export type { RingerMode };
