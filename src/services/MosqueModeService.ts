// src/services/MosqueModeService.ts
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { IOS_NOTIFICATION_CAP } from '../constants/NotificationConstants';
import { format, addMinutes } from 'date-fns';
import StorageService from './StorageService';
import RingerControlService from './RingerControlService';
import type { RingerMode } from './RingerControlService';
import type { MosqueModeSettings, PrayerName, PrayerTime } from '../types';
import logger from '../utils/logger';
import { mosqueModePlatformUi } from '../utils/mosqueModePlatform';

// Storage keys for mosque mode state
const STORAGE_KEYS = {
  PREVIOUS_RINGER_MODE: 'mosque_mode_previous_ringer',
  ACTIVE_MOSQUE_MODE: 'mosque_mode_active',
  LAST_MOSQUE_PRAYER: 'mosque_mode_last_prayer',
};

interface MosqueModeNotificationData {
  type?: string;
  mode?: RingerMode;
  previousMode?: RingerMode;
  prayer?: PrayerName;
}

class MosqueModeService {
  private async isIosBudgetExhausted(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length >= IOS_NOTIFICATION_CAP;
  }

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
        logger.log('📵 Mosque mode is disabled');
        return false;
      }

      const iqamahTime = this.getIqamahTime(prayer);
      if (!iqamahTime) {
        logger.log('⚠️ No iqamah time configured for', prayer.name);
        return false;
      }

      const now = new Date();
      if (iqamahTime <= now) {
        logger.log('⏰ Iqamah time has already passed');
        return false;
      }

      // Calculate when to restore ringer
      const restoreTime = addMinutes(iqamahTime, settings.mosqueMode.silentDuration);

      // Platform-specific implementation
      if (Platform.OS === 'android') {
        await this.scheduleAndroidSilentMode(prayer, iqamahTime, restoreTime, settings.mosqueMode);
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

      logger.log(
        `🕌 Mosque mode scheduled for ${prayer.name} at ${format(iqamahTime, 'h:mm a')}`
      );

      return true;
    } catch (error) {
      logger.error('❌ Failed to schedule mosque mode:', error);
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
      const targetMode: RingerMode = settings.mosqueMode.useVibrateInsteadOfSilent ? 'VIBRATE' : 'SILENT';
      const restoreMode: RingerMode = (await RingerControlService.getRingerMode()) || 'NORMAL';
      const requestCodeBase = this.getRequestCodeBase('Dhuhr', enableAt);

      const scheduled = await RingerControlService.scheduleMosqueMode(
        enableAt.getTime(),
        settings.mosqueMode.autoRestore ? restoreAt.getTime() : 0,
        targetMode,
        restoreMode,
        requestCodeBase
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Mosque Mode Test',
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
      logger.error('❌ Failed to schedule mosque mode test:', error);
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
    settings: MosqueModeSettings
  ): Promise<void> {
    // Save current ringer mode so we can restore it later
    const currentMode = await RingerControlService.getRingerMode();
    if (currentMode) {
      StorageService.setValue(STORAGE_KEYS.PREVIOUS_RINGER_MODE, currentMode);
    }

    const targetMode: RingerMode = settings.useVibrateInsteadOfSilent ? 'VIBRATE' : 'SILENT';
    const restoreMode: RingerMode = (currentMode || 'NORMAL') as RingerMode;
    const requestCodeBase = this.getRequestCodeBase(prayer.name, iqamahTime);

    const enableAtMs = iqamahTime.getTime();
    const restoreAtMs = settings.autoRestore ? restoreTime.getTime() : 0;

    const scheduled = await RingerControlService.scheduleMosqueMode(
      enableAtMs,
      restoreAtMs,
      targetMode,
      restoreMode,
      requestCodeBase
    );

    if (!scheduled) {
      logger.warn('⚠️ Mosque mode could not be scheduled (missing DND access?)');
    }

    const enableId = `mosque-enable-${prayer.name}-${format(iqamahTime, 'yyyy-MM-dd')}`;

    try {
      await Notifications.cancelScheduledNotificationAsync(enableId);
    } catch {
      // ignore
    }

    if (await this.isIosBudgetExhausted()) {
      logger.log('🕌🚫 iOS cap reached, skipping mosque mode enable notification');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${prayer.name} Iqamah`,
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

    if (settings.autoRestore) {
      const restoreId = `mosque-restore-${prayer.name}-${format(iqamahTime, 'yyyy-MM-dd')}`;

      try {
        await Notifications.cancelScheduledNotificationAsync(restoreId);
      } catch {
        // ignore
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Ringer Restored',
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

    logger.log(
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
      if (await this.isIosBudgetExhausted()) {
        logger.log('🕌🚫 iOS cap reached, skipping mosque mode reminder');
        return;
      }

      const reminderId = `mosque-reminder-${prayer.name}-${format(iqamahTime, 'yyyy-MM-dd')}`;
      try { await Notifications.cancelScheduledNotificationAsync(reminderId); } catch { /* ignore */ }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${prayer.name} Iqamah in 2 minutes`,
          body: mosqueModePlatformUi.iosReminderBody,
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

      logger.log(`📱 iOS: Reminder scheduled for ${format(reminderTime, 'h:mm a')}`);
    }

    // Also schedule a notification at iqamah time as a last-chance reminder
    const iqamahId = `mosque-iqamah-${prayer.name}-${format(iqamahTime, 'yyyy-MM-dd')}`;
    if (iqamahTime > now) {
      try { await Notifications.cancelScheduledNotificationAsync(iqamahId); } catch { /* ignore */ }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${prayer.name} Iqamah Now`,
          body: mosqueModePlatformUi.iosIqamahBody,
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
  async handleNotificationResponse(data: MosqueModeNotificationData): Promise<void> {
    try {
      const { type, mode, previousMode, prayer } = data;

      if (type === 'mosque_mode_enable') {
        // Android: Best-effort fallback if alarms didn't run
        if (Platform.OS === 'android') {
          await RingerControlService.setRingerMode(mode || 'SILENT');
          logger.log(`🔇 ${mode} mode enabled for ${prayer} iqamah`);
        }
      } else if (type === 'mosque_mode_restore') {
        // Android: Restore previous ringer mode
        if (Platform.OS === 'android') {
          const modeToRestore = previousMode || 'NORMAL';
          await RingerControlService.setRingerMode(modeToRestore);
          logger.log(`🔊 Ringer restored to ${modeToRestore}`);
        }

        // Clear active mosque mode
        StorageService.setValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE, '');
      }
      // iOS mosque_mode_reminder / mosque_mode_iqamah — no programmatic action,
      // the notification itself is the reminder for the user to silence their phone.
    } catch (error) {
      logger.error('❌ Failed to handle mosque mode notification:', error);
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

      logger.log(`🚫 Mosque mode cancelled for ${prayer}`);
    } catch (error) {
      logger.error('❌ Failed to cancel mosque mode:', error);
    }
  }

  /**
   * Schedule "Heading to mosque?" prompt notifications (opt-in confirm mode).
   * Fires ~5 min before each upcoming iqamah so the user can tap to enable silent mode.
   */
  async schedulePreIqamahPrompts(prayers: PrayerTime[]): Promise<void> {
    const settings = StorageService.getUserSettings();
    if (!settings?.mosqueMode?.enabled) return;
    if (!settings.mosqueMode.promptBeforeEnable) return; // Only for confirm mode

    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');

    for (const prayer of prayers) {
      if (!this.isEnabledForPrayer(prayer.name)) continue;
      const iqamahTime = this.getIqamahTime(prayer);
      if (!iqamahTime) continue;
      if (iqamahTime <= now) continue; // Iqamah already passed

      // Schedule notification 5 min before iqamah (or 1 min if <5 min away)
      const leadMinutes = (iqamahTime.getTime() - now.getTime()) / (1000 * 60);
      const promptTime = leadMinutes > 5
        ? addMinutes(iqamahTime, -5)
        : addMinutes(now, 1);

      // Don't schedule if prompt time is in the past
      if (promptTime <= now) continue;

      if (await this.isIosBudgetExhausted()) {
        logger.log('🕌🚫 iOS cap reached, skipping mosque mode prompts');
        return;
      }

      const promptId = `mosque-prompt-${prayer.name}-${dateStr}`;
      try { await Notifications.cancelScheduledNotificationAsync(promptId); } catch { /* ignore */ }

      const minsUntilIqamah = Math.round((iqamahTime.getTime() - promptTime.getTime()) / (1000 * 60));

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${prayer.name} Iqamah in ${minsUntilIqamah} min`,
          body: mosqueModePlatformUi.promptNotificationBody,
          data: {
            type: 'mosque_mode_prompt',
            prayer: prayer.name,
            iqamahTime: iqamahTime.toISOString(),
          },
          sound: 'default',
        },
        trigger: {
          type: 'date',
          date: promptTime,
        } as Notifications.NotificationTriggerInput,
        identifier: promptId,
      });

      logger.log(`🕌 Mosque prompt scheduled for ${prayer.name} at ${format(promptTime, 'h:mm a')}`);
    }
  }

  async scheduleUpcomingMosqueModes(prayers: PrayerTime[]): Promise<void> {
    const settings = StorageService.getUserSettings();
    if (!settings?.mosqueMode?.enabled) return;
    if (settings.mosqueMode.promptBeforeEnable) return;

    const now = new Date();
    for (const prayer of prayers) {
      if (!this.isEnabledForPrayer(prayer.name)) continue;
      const iqamahTime = this.getIqamahTime(prayer);
      if (!iqamahTime) continue;
      if (iqamahTime <= now) continue;

      if (Platform.OS === 'android') {
        const restoreTime = addMinutes(iqamahTime, settings.mosqueMode.silentDuration);
        await this.scheduleAndroidSilentMode(prayer, iqamahTime, restoreTime, settings.mosqueMode);
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
        logger.log('📱 Manual restore only available on Android');
        return false;
      }

      const previousMode = (StorageService.getValue(STORAGE_KEYS.PREVIOUS_RINGER_MODE) || 'NORMAL') as RingerMode;
      await RingerControlService.setRingerMode(previousMode);

      // Clear active state
      StorageService.setValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE, '');

      logger.log(`🔊 Ringer manually restored to ${previousMode}`);
      return true;
    } catch (error) {
      logger.error('❌ Failed to manually restore ringer:', error);
      return false;
    }
  }
}

export default new MosqueModeService();
