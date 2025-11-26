// src/services/RingerControlService.ts
import { NativeModules, Platform } from 'react-native';

type RingerMode = 'SILENT' | 'VIBRATE' | 'NORMAL';

interface RingerModeModule {
  setRingerMode(mode: RingerMode): Promise<string>;
  getRingerMode(): Promise<RingerMode>;
  canModifyRingerMode(): Promise<boolean>;
}

// Platform-specific implementation
class RingerControlService {
  private module: RingerModeModule | null = null;

  constructor() {
    if (Platform.OS === 'android') {
      this.module = NativeModules.RingerModeModule;
      if (!this.module) {
        console.warn('⚠️ RingerModeModule not available. Did you run expo prebuild?');
      }
    }
  }

  /**
   * Check if ringer mode can be modified
   * Android 6.0+ requires special permission
   */
  async canModify(): Promise<boolean> {
    if (Platform.OS !== 'android' || !this.module) {
      return false;
    }

    try {
      return await this.module.canModifyRingerMode();
    } catch (error) {
      console.error('❌ Failed to check ringer permissions:', error);
      return false;
    }
  }

  /**
   * Set the device ringer mode
   * Android only - iOS will use Focus Mode workaround
   */
  async setRingerMode(mode: RingerMode): Promise<boolean> {
    if (Platform.OS !== 'android' || !this.module) {
      console.log('📱 Ringer mode control only available on Android');
      return false;
    }

    try {
      const canModify = await this.canModify();
      if (!canModify) {
        console.warn('⚠️ App does not have permission to modify ringer mode');
        return false;
      }

      await this.module.setRingerMode(mode);
      console.log(`🔊 Ringer mode set to: ${mode}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to set ringer mode to ${mode}:`, error);
      return false;
    }
  }

  /**
   * Get current ringer mode
   */
  async getRingerMode(): Promise<RingerMode | null> {
    if (Platform.OS !== 'android' || !this.module) {
      return null;
    }

    try {
      const mode = await this.module.getRingerMode();
      return mode;
    } catch (error) {
      console.error('❌ Failed to get ringer mode:', error);
      return null;
    }
  }

  /**
   * Enable silent mode (convenience method)
   */
  async enableSilentMode(): Promise<boolean> {
    return this.setRingerMode('SILENT');
  }

  /**
   * Enable vibrate mode (convenience method)
   */
  async enableVibrateMode(): Promise<boolean> {
    return this.setRingerMode('VIBRATE');
  }

  /**
   * Restore normal mode (convenience method)
   */
  async restoreNormalMode(): Promise<boolean> {
    return this.setRingerMode('NORMAL');
  }

  /**
   * Check if device is currently in silent mode
   */
  async isSilent(): Promise<boolean> {
    const mode = await this.getRingerMode();
    return mode === 'SILENT';
  }

  /**
   * iOS-specific: Guide user to setup Focus Mode shortcut
   */
  async setupIOSShortcut(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    // This will be implemented in Phase 4
    console.log('📱 iOS Focus Mode setup will be implemented in Phase 4');
  }
}

export default new RingerControlService();
export type { RingerMode };
