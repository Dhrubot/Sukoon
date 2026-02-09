// src/services/MosqueModeService.ts
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { format, addMinutes } from 'date-fns';
import StorageService from './StorageService';
import RingerControlService from './RingerControlService';
import { PrayerName, PrayerTime } from '../types';

// Storage keys for mosque mode state
const STORAGE_KEYS = {
  PREVIOUS_RINGER_MODE: 'mosque_mode_previous_ringer',
  ACTIVE_MOSQUE_MODE: 'mosque_mode_active',
  LAST_MOSQUE_PRAYER: 'mosque_mode_last_prayer',
};

class MosqueModeService {
  private getRequestCodeBase(prayer: PrayerName, iqamahTime: Date): number {
    const dateStr = format(iqamahTime, 'yyyy-MM-dd');
    const input = `${prayer}-${dateStr}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash || 1);
  }

  private getRequestCodeBaseForDate(prayer: PrayerName, dateStr: string): number {
    const input = `${prayer}-${dateStr}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash || 1);
  }

  /**
   * Check if mosque mode is enabled for a specific prayer
   */
  isEnabledForPrayer(prayer: PrayerName): boolean {
    const settings = StorageService.getUserSettings();
    if (!settings?.mosqueMode?.enabled) {
      return false;
    }

    // Check if user has set an iqamah offset for this prayer
    const offset = settings.mosqueMode.iqamahOffsets[prayer];
    return offset > 0;
  }

  /**
   * Calculate iqamah time for a prayer
   */
  getIqamahTime(prayer: PrayerTime): Date | null {
    const settings = StorageService.getUserSettings();
    if (!settings?.mosqueMode?.enabled) {
      return null;
    }

    const offset = settings.mosqueMode.iqamahOffsets[prayer.name];
    if (!offset || offset <= 0) {
      return null;
    }

    return addMinutes(prayer.time, offset);
  }

  /**
   * Schedule silent mode for a prayer's iqamah time
   * This is called when user confirms they're heading to mosque
   */
  async scheduleSilentMode(prayer: PrayerTime): Promise<boolean> {
    try {
      const settings = StorageService.getUserSettings();
      if (!settings?.mosqueMode?.enabled) {
        console.log('📵 Mosque mode is disabled');
        return false;
      }

      const iqamahTime = this.getIqamahTime(prayer);
      if (!iqamahTime) {
        console.log('⚠️ No iqamah time configured for', prayer.name);
        return false;
      }

      const now = new Date();
      if (iqamahTime <= now) {
        console.log('⏰ Iqamah time has already passed');
        return false;
      }

      // Calculate when to restore ringer
      const restoreTime = addMinutes(iqamahTime, settings.mosqueMode.silentDuration);

      // Platform-specific implementation
      if (Platform.OS === 'android') {
        await this.scheduleAndroidSilentMode(prayer, iqamahTime, restoreTime, settings);
      } else if (Platform.OS === 'ios') {
        await this.scheduleIOSReminder(prayer, iqamahTime);
      }

      // Mark this prayer as having mosque mode active
      StorageService.setValue(
        STORAGE_KEYS.ACTIVE_MOSQUE_MODE,
        JSON.stringify({
          prayer: prayer.name,
          iqamahTime: iqamahTime.toISOString(),
          restoreTime: restoreTime.toISOString(),
          scheduledAt: new Date().toISOString(),
        })
      );

      console.log(
        `🕌 Mosque mode scheduled for ${prayer.name} at ${format(iqamahTime, 'h:mm a')}`
      );

      return true;
    } catch (error) {
      console.error('❌ Failed to schedule mosque mode:', error);
      return false;
    }
  }

  async scheduleTestMosqueMode(): Promise<boolean> {
    try {
      const settings = StorageService.getUserSettings();
      if (!settings?.mosqueMode?.enabled) {
        return false;
      }

      if (Platform.OS !== 'android') {
        return false;
      }

      const now = new Date();
      const enableAt = addMinutes(now, 1);
      const restoreAt = addMinutes(enableAt, 1);
      const targetMode = settings.mosqueMode.useVibrateInsteadOfSilent ? 'VIBRATE' : 'SILENT';
      const restoreMode = (await RingerControlService.getRingerMode()) || 'NORMAL';
      const requestCodeBase = this.getRequestCodeBase('Dhuhr', enableAt);

      const scheduled = await RingerControlService.scheduleMosqueMode(
        enableAt.getTime(),
        settings.mosqueMode.autoRestore ? restoreAt.getTime() : 0,
        targetMode as any,
        restoreMode as any,
        requestCodeBase
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🕌 Mosque Mode Test',
          body: scheduled ? 'Test scheduled for 1 minute from now.' : 'Could not schedule. Please grant Do Not Disturb access.',
          data: {
            type: 'mosque_mode_test',
            requestCodeBase,
            scheduledAt: new Date().toISOString(),
          },
          sound: undefined,
        },
        trigger: null,
      });

      return scheduled;
    } catch (error) {
      console.error('❌ Failed to schedule mosque mode test:', error);
      return false;
    }
  }

  /**
   * Android: Schedule notifications that trigger silent mode
   */
  private async scheduleAndroidSilentMode(
    prayer: PrayerTime,
    iqamahTime: Date,
    restoreTime: Date,
    settings: any
  ): Promise<void> {
    // Save current ringer mode so we can restore it later
    const currentMode = await RingerControlService.getRingerMode();
    if (currentMode) {
      StorageService.setValue(STORAGE_KEYS.PREVIOUS_RINGER_MODE, currentMode);
    }

    const targetMode = settings.mosqueMode.useVibrateInsteadOfSilent ? 'VIBRATE' : 'SILENT';
    const restoreMode = (currentMode || 'NORMAL') as any;
    const requestCodeBase = this.getRequestCodeBase(prayer.name, iqamahTime);

    const enableAtMs = iqamahTime.getTime();
    const restoreAtMs = settings.mosqueMode.autoRestore ? restoreTime.getTime() : 0;

    const scheduled = await RingerControlService.scheduleMosqueMode(
      enableAtMs,
      restoreAtMs,
      targetMode as any,
      restoreMode,
      requestCodeBase
    );

    if (!scheduled) {
      console.warn('⚠️ Mosque mode could not be scheduled (missing DND access?)');
    }

    const enableId = `mosque-enable-${prayer.name}-${format(iqamahTime, 'yyyy-MM-dd')}`;

    try {
      await Notifications.cancelScheduledNotificationAsync(enableId);
    } catch {
      // ignore
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🕌 ${prayer.name} Iqamah`,
        body: `Mosque Mode ${scheduled ? 'enabled' : 'could not auto-enable'} (${targetMode.toLowerCase()})`,
        data: {
          type: 'mosque_mode_enable',
          prayer: prayer.name,
          mode: targetMode,
          iqamahTime: iqamahTime.toISOString(),
          requestCodeBase,
        },
        sound: undefined,
      },
      trigger: {
        type: 'date',
        date: iqamahTime,
      } as Notifications.NotificationTriggerInput,
      identifier: enableId,
    });

    if (settings.mosqueMode.autoRestore) {
      const restoreId = `mosque-restore-${prayer.name}-${format(iqamahTime, 'yyyy-MM-dd')}`;

      try {
        await Notifications.cancelScheduledNotificationAsync(restoreId);
      } catch {
        // ignore
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔊 Ringer Restored',
          body: 'Mosque Mode ended',
          data: {
            type: 'mosque_mode_restore',
            prayer: prayer.name,
            previousMode: currentMode || 'NORMAL',
            requestCodeBase,
          },
          sound: undefined,
        },
        trigger: {
          type: 'date',
          date: restoreTime,
        } as Notifications.NotificationTriggerInput,
        identifier: restoreId,
      });
    }

    console.log(
      `📱 Android: Mosque mode scheduled from ${format(iqamahTime, 'h:mm a')} to ${format(
        restoreTime,
        'h:mm a'
      )}`
    );
  }

  /**
   * iOS: Schedule reminder notifications (can't directly control silent mode)
   * Sends a reminder 2 minutes before iqamah so the user can manually enable DND.
   */
  private async scheduleIOSReminder(prayer: PrayerTime, iqamahTime: Date): Promise<void> {
    const now = new Date();

    // Schedule a reminder 2 minutes before iqamah
    const reminderTime = addMinutes(iqamahTime, -2);
    if (reminderTime > now) {
      const reminderId = `mosque-reminder-${prayer.name}-${format(iqamahTime, 'yyyy-MM-dd')}`;
      try { await Notifications.cancelScheduledNotificationAsync(reminderId); } catch { /* ignore */ }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕌 ${prayer.name} Iqamah in 2 minutes`,
          body: 'Silence your phone — swipe down from top-right to enable Do Not Disturb.',
          data: {
            type: 'mosque_mode_reminder',
            prayer: prayer.name,
            iqamahTime: iqamahTime.toISOString(),
          },
          sound: 'default',
        },
        trigger: {
          type: 'date',
          date: reminderTime,
        } as Notifications.NotificationTriggerInput,
        identifier: reminderId,
      });

      console.log(`📱 iOS: Reminder scheduled for ${format(reminderTime, 'h:mm a')}`);
    }

    // Also schedule a notification at iqamah time as a last-chance reminder
    const iqamahId = `mosque-iqamah-${prayer.name}-${format(iqamahTime, 'yyyy-MM-dd')}`;
    if (iqamahTime > now) {
      try { await Notifications.cancelScheduledNotificationAsync(iqamahId); } catch { /* ignore */ }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔇 ${prayer.name} Iqamah Now`,
          body: 'Please silence your phone for prayer.',
          data: {
            type: 'mosque_mode_iqamah',
            prayer: prayer.name,
            iqamahTime: iqamahTime.toISOString(),
          },
          sound: undefined, // Silent notification
        },
        trigger: {
          type: 'date',
          date: iqamahTime,
        } as Notifications.NotificationTriggerInput,
        identifier: iqamahId,
      });
    }
  }

  /**
   * Handle notification response (when user taps on mosque mode notification)
   */
  async handleNotificationResponse(data: any): Promise<void> {
    try {
      const { type, mode, previousMode, prayer } = data;

      if (type === 'mosque_mode_enable') {
        // Android: Best-effort fallback if alarms didn't run
        if (Platform.OS === 'android') {
          await RingerControlService.setRingerMode(mode || 'SILENT');
          console.log(`🔇 ${mode} mode enabled for ${prayer} iqamah`);
        }
      } else if (type === 'mosque_mode_restore') {
        // Android: Restore previous ringer mode
        if (Platform.OS === 'android') {
          const modeToRestore = previousMode || 'NORMAL';
          await RingerControlService.setRingerMode(modeToRestore);
          console.log(`🔊 Ringer restored to ${modeToRestore}`);
        }

        // Clear active mosque mode
        StorageService.setValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE, '');
      }
      // iOS mosque_mode_reminder / mosque_mode_iqamah — no programmatic action,
      // the notification itself is the reminder for the user to silence their phone.
    } catch (error) {
      console.error('❌ Failed to handle mosque mode notification:', error);
    }
  }

  /**
   * Cancel mosque mode for a specific prayer
   */
  async cancelMosqueMode(prayer: PrayerName, date?: Date): Promise<void> {
    try {
      const dateStr = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

      const requestCodeBase = this.getRequestCodeBaseForDate(prayer, dateStr);
      await RingerControlService.cancelMosqueMode(requestCodeBase);

      // Cancel all related notifications
      const identifiers = [
        `mosque-enable-${prayer}-${dateStr}`,
        `mosque-restore-${prayer}-${dateStr}`,
        `mosque-reminder-${prayer}-${dateStr}`,
        `mosque-iqamah-${prayer}-${dateStr}`,
      ];

      for (const id of identifiers) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }

      // Clear active state if it matches
      const activeState = StorageService.getValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE);
      if (activeState) {
        const parsed = JSON.parse(activeState);
        if (parsed.prayer === prayer) {
          StorageService.setValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE, '');
        }
      }

      console.log(`🚫 Mosque mode cancelled for ${prayer}`);
    } catch (error) {
      console.error('❌ Failed to cancel mosque mode:', error);
    }
  }

  async scheduleUpcomingMosqueModes(prayers: PrayerTime[]): Promise<void> {
    const settings = StorageService.getUserSettings();
    if (!settings?.mosqueMode?.enabled) return;
    if (settings.mosqueMode.promptBeforeEnable) return;

    const now = new Date();
    for (const prayer of prayers) {
      if (prayer.time <= now) continue;
      if (!this.isEnabledForPrayer(prayer.name)) continue;
      const iqamahTime = this.getIqamahTime(prayer);
      if (!iqamahTime) continue;
      if (iqamahTime <= now) continue;

      if (Platform.OS === 'android') {
        const restoreTime = addMinutes(iqamahTime, settings.mosqueMode.silentDuration);
        await this.scheduleAndroidSilentMode(prayer, iqamahTime, restoreTime, settings);
      } else if (Platform.OS === 'ios') {
        await this.scheduleIOSReminder(prayer, iqamahTime);
      }
    }
  }

  /**
   * Get current active mosque mode state
   */
  getActiveMosqueMode(): {
    prayer: PrayerName;
    iqamahTime: Date;
    restoreTime: Date;
    scheduledAt: Date;
  } | null {
    try {
      const state = StorageService.getValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE);
      if (!state) return null;

      const parsed = JSON.parse(state);
      return {
        prayer: parsed.prayer,
        iqamahTime: new Date(parsed.iqamahTime),
        restoreTime: new Date(parsed.restoreTime),
        scheduledAt: new Date(parsed.scheduledAt),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if mosque mode is currently active
   */
  isCurrentlyActive(): boolean {
    const active = this.getActiveMosqueMode();
    if (!active) return false;

    const now = new Date();
    return now >= active.iqamahTime && now < active.restoreTime;
  }

  /**
   * Manually restore ringer (if user wants to end mosque mode early)
   */
  async manuallyRestoreRinger(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('📱 Manual restore only available on Android');
        return false;
      }

      const previousMode = StorageService.getValue(STORAGE_KEYS.PREVIOUS_RINGER_MODE) || 'NORMAL';
      await RingerControlService.setRingerMode(previousMode as any);

      // Clear active state
      StorageService.setValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE, '');

      console.log(`🔊 Ringer manually restored to ${previousMode}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to manually restore ringer:', error);
      return false;
    }
  }
}

export default new MosqueModeService();
