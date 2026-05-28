// src/services/MosqueModeService.ts
import { Platform, NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';
import { IOS_NOTIFICATION_CAP } from '../constants/NotificationConstants';
import { format, addMinutes } from 'date-fns';
import { isFriday } from '../utils/ramadan';
import StorageService from './StorageService';
import RingerControlService from './RingerControlService';
import type { RingerMode } from './RingerControlService';
import type { MosqueModeSettings, PrayerName, PrayerTime } from '../types';
import logger from '../utils/logger';
import { mosqueModePlatformUi } from '../utils/mosqueModePlatform';
import { scheduleLocalNotificationAsync } from './notifications/scheduleLocalNotification';

// ---------------------------------------------------------------------------
// MosqueModePrefsModule — thin wrapper around the native SharedPreferences
// module for cross-process mosque-mode state persistence (Phase 2).
// All methods are no-ops on iOS or when the native module is unavailable.
//
// The module reference is resolved lazily (inside each function) so that
// jest.doMock('react-native', ...) can inject a mock before the module is
// loaded; a module-level const would capture the unset value at import time.
// ---------------------------------------------------------------------------
interface MosqueModePrefsModuleNative {
  mosquePrefsSet(key: string, value: string): Promise<void>;
  mosquePrefsGet(key: string): Promise<string | null>;
  mosquePrefsClear(key: string): Promise<void>;
}

function _getPrefsModule(): MosqueModePrefsModuleNative | null {
  if (Platform.OS !== 'android') return null;
  // NativeModules is read lazily so jest.doMock can replace react-native first.
  return (NativeModules.RingerModeModule as MosqueModePrefsModuleNative) ?? null;
}

// SP key names — mirroring the Java constants in RingerModeModule
const SP_KEYS = {
  STATE:              'mosque_state',
  PRAYER:             'mosque_prayer',
  IQAMAH_MS:         'mosque_iqamah_ms',
  RESTORE_MS:        'mosque_restore_ms',
  RESTORE_MODE:       'mosque_restore_mode',
  MANAGED_BY_SUKOON: 'mosque_managed_by_sukoon',
} as const;

async function spSet(key: string, value: string): Promise<void> {
  try {
    await _getPrefsModule()?.mosquePrefsSet(key, value);
  } catch (err) {
    logger.warn('[MosqueModeService] spSet failed:', err);
  }
}

async function spGet(key: string): Promise<string | null> {
  try {
    return await _getPrefsModule()?.mosquePrefsGet(key) ?? null;
  } catch (err) {
    logger.warn('[MosqueModeService] spGet failed:', err);
    return null;
  }
}

async function spClear(key: string): Promise<void> {
  try {
    await _getPrefsModule()?.mosquePrefsClear(key);
  } catch (err) {
    logger.warn('[MosqueModeService] spClear failed:', err);
  }
}

/** Write all primary mosque-mode state keys to SharedPreferences atomically. */
async function spWriteActiveState(
  prayer: PrayerName,
  iqamahTime: Date,
  restoreTime: Date,
  managedBySukoon: boolean,
  restoreMode: RingerMode,
): Promise<void> {
  await Promise.all([
    spSet(SP_KEYS.STATE,              'armed'),
    spSet(SP_KEYS.PRAYER,             prayer),
    spSet(SP_KEYS.IQAMAH_MS,         String(iqamahTime.getTime())),
    spSet(SP_KEYS.RESTORE_MS,        String(restoreTime.getTime())),
    spSet(SP_KEYS.RESTORE_MODE,       restoreMode),
    spSet(SP_KEYS.MANAGED_BY_SUKOON, managedBySukoon ? '1' : '0'),
  ]);
}

/** Clear all primary mosque-mode state keys from SharedPreferences. */
async function spClearActiveState(): Promise<void> {
  await Promise.all(
    Object.values(SP_KEYS).map((k) => spClear(k))
  );
}

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

interface MosqueModeActiveState {
  prayer: PrayerName;
  iqamahTime: Date;
  restoreTime: Date;
  scheduledAt: Date;
  managedBySukoon: boolean;
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

  private getIqamahDateStr(iqamahTime: Date): string {
    return format(iqamahTime, 'yyyy-MM-dd');
  }

  private getReminderTime(iqamahTime: Date, now: Date): Date | null {
    const leadMinutes = (iqamahTime.getTime() - now.getTime()) / (1000 * 60);
    if (leadMinutes <= 0) {
      return null;
    }

    if (leadMinutes > 5) {
      return addMinutes(iqamahTime, -5);
    }

    return addMinutes(now, 1);
  }

  private async cancelNotificationIdentifiers(identifiers: string[]): Promise<void> {
    for (const id of identifiers) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // ignore
      }
    }
  }

  private getMosqueNotificationIdentifiers(prayer: PrayerName, dateStr: string): string[] {
    return [
      `mosque-prompt-${prayer}-${dateStr}`,
      `mosque-reminder-${prayer}-${dateStr}`,
      `mosque-enable-${prayer}-${dateStr}`,
      `mosque-restore-${prayer}-${dateStr}`,
      `mosque-iqamah-${prayer}-${dateStr}`,
    ];
  }

  private async cancelLegacyNotifications(prayer: PrayerName, iqamahTime: Date): Promise<void> {
    await this.cancelNotificationIdentifiers(
      this.getMosqueNotificationIdentifiers(prayer, this.getIqamahDateStr(iqamahTime))
    );
  }

  private persistActiveState(
    prayer: PrayerName,
    iqamahTime: Date,
    restoreTime: Date,
    managedBySukoon: boolean,
    restoreMode: RingerMode = 'NORMAL',
  ): void {
    StorageService.setValue(
      STORAGE_KEYS.ACTIVE_MOSQUE_MODE,
      JSON.stringify({
        prayer,
        iqamahTime: iqamahTime.toISOString(),
        restoreTime: restoreTime.toISOString(),
        scheduledAt: new Date().toISOString(),
        managedBySukoon,
      })
    );
    // Phase 2: Mirror to SharedPreferences for cross-process / boot-receiver use.
    void spWriteActiveState(prayer, iqamahTime, restoreTime, managedBySukoon, restoreMode);
  }

  private async schedulePreIqamahNotification(
    prayer: PrayerTime,
    iqamahTime: Date,
    mode: 'auto' | 'prompt',
  ): Promise<void> {
    const now = new Date();
    const reminderTime = this.getReminderTime(iqamahTime, now);
    if (!reminderTime || reminderTime <= now) {
      return;
    }

    if (await this.isIosBudgetExhausted()) {
      logger.log(`🕌🚫 iOS cap reached, skipping mosque mode ${mode} notification`);
      return;
    }

    const dateStr = this.getIqamahDateStr(iqamahTime);
    const identifier = mode === 'prompt'
      ? `mosque-prompt-${prayer.name}-${dateStr}`
      : `mosque-reminder-${prayer.name}-${dateStr}`;
    const minsUntilIqamah = Math.max(
      1,
      Math.round((iqamahTime.getTime() - reminderTime.getTime()) / (1000 * 60)),
    );

    await scheduleLocalNotificationAsync({
      content: {
        title: `${prayer.name} Iqamah in ${minsUntilIqamah} min`,
        body: mode === 'prompt'
          ? mosqueModePlatformUi.promptNotificationBody
          : mosqueModePlatformUi.autoReminderBody,
        data: {
          type: mode === 'prompt' ? 'mosque_mode_prompt' : 'mosque_mode_reminder',
          prayer: prayer.name,
          iqamahTime: iqamahTime.toISOString(),
        },
      },
      trigger: {
        type: 'date',
        date: reminderTime,
      } as Notifications.NotificationTriggerInput,
      identifier,
    });

    logger.log(
      `🕌 ${mode === 'prompt' ? 'Prompt' : 'Reminder'} scheduled for ${prayer.name} at ${format(
        reminderTime,
        'h:mm a'
      )}`
    );
  }

  /**
   * iOS: Schedule a Time-Sensitive pre-iqamah notification so it penetrates Focus modes.
   * Phase 1 — used when the user manually confirms heading to mosque on iOS.
   * interruptionLevel: 'timeSensitive' requires the
   * com.apple.developer.usernotifications.time-sensitive entitlement (set YES in app.config.js).
   */
  private async scheduleIOSSilentModeNotifications(
    prayer: PrayerTime,
    iqamahTime: Date,
  ): Promise<void> {
    if (Platform.OS !== 'ios') return;

    if (await this.isIosBudgetExhausted()) {
      logger.log('🕌🚫 iOS cap reached, skipping mosque mode iOS notifications');
      return;
    }

    const now = new Date();
    const dateStr = this.getIqamahDateStr(iqamahTime);

    // Notification 1: 5 minutes before iqamah — Time-Sensitive so it pierces Focus modes.
    const reminderTime = this.getReminderTime(iqamahTime, now);
    if (reminderTime && reminderTime > now) {
      const minsUntilIqamah = Math.max(
        1,
        Math.round((iqamahTime.getTime() - reminderTime.getTime()) / (1000 * 60)),
      );
      await scheduleLocalNotificationAsync({
        identifier: `mosque-reminder-${prayer.name}-${dateStr}`,
        content: {
          title: `${prayer.name} Iqamah in ${minsUntilIqamah} min`,
          body: mosqueModePlatformUi.iosPreIqamahBody,
          interruptionLevel: 'timeSensitive',
          data: {
            type: 'mosque_mode_reminder',
            prayer: prayer.name,
            iqamahTime: iqamahTime.toISOString(),
          },
        },
        trigger: {
          type: 'date',
          date: reminderTime,
        } as Notifications.NotificationTriggerInput,
      });
      logger.log(`🕌 iOS Time-Sensitive reminder scheduled for ${prayer.name} at ${format(reminderTime, 'h:mm a')}`);
    }

    // Notification 2: At iqamah time — final call.
    if (iqamahTime > now) {
      await scheduleLocalNotificationAsync({
        identifier: `mosque-iqamah-${prayer.name}-${dateStr}`,
        content: {
          title: `${prayer.name} Iqamah beginning now`,
          body: mosqueModePlatformUi.iosIqamahBody,
          interruptionLevel: 'timeSensitive',
          data: {
            type: 'mosque_mode_iqamah',
            prayer: prayer.name,
            iqamahTime: iqamahTime.toISOString(),
          },
        },
        trigger: {
          type: 'date',
          date: iqamahTime,
        } as Notifications.NotificationTriggerInput,
      });
      logger.log(`🕌 iOS iqamah notification scheduled for ${prayer.name} at ${format(iqamahTime, 'h:mm a')}`);
    }
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

    // On Fridays, Dhuhr is Jumu'ah — use the dedicated absolute iqamah time
    // (a fixed wall-clock time set by the user, default 1:30 PM) instead of an offset.
    const jummah = settings.mosqueMode.jummah;
    if (prayer.name === 'Dhuhr' && isFriday(prayer.time) && jummah?.enabled && jummah.iqamahTime) {
      const [hStr, mStr] = jummah.iqamahTime.split(':');
      const iqamah = new Date(prayer.time);
      iqamah.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
      return iqamah;
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
      let managedBySukoon = false;
      let restoreMode: RingerMode = 'NORMAL';

      // Platform-specific implementation
      if (Platform.OS === 'android') {
        await this.cancelLegacyNotifications(prayer.name, iqamahTime);
        const result = await this.scheduleAndroidSilentModeWithMode(
          prayer,
          iqamahTime,
          restoreTime,
          settings.mosqueMode
        );
        managedBySukoon = result.managed;
        restoreMode = result.restoreMode;
      } else if (Platform.OS === 'ios') {
        await this.cancelLegacyNotifications(prayer.name, iqamahTime);
        await this.scheduleIOSSilentModeNotifications(prayer, iqamahTime);
      }

      // Manual confirmations still keep mosque mode state for in-app status,
      // even when iOS can only remind and Android may leave an already-quiet phone untouched.
      this.persistActiveState(prayer.name, iqamahTime, restoreTime, managedBySukoon, restoreMode);

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

      await scheduleLocalNotificationAsync({
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
   * Android: Schedule silent mode and return structured result including restoreMode.
   * Used by scheduleSilentMode so restoreMode can be persisted to SharedPreferences.
   */
  private async scheduleAndroidSilentModeWithMode(
    prayer: PrayerTime,
    iqamahTime: Date,
    restoreTime: Date,
    settings: MosqueModeSettings
  ): Promise<{ managed: boolean; restoreMode: RingerMode }> {
    const currentMode = await RingerControlService.getRingerMode();
    const alreadyQuiet = currentMode === 'SILENT' || currentMode === 'VIBRATE';
    if (alreadyQuiet) {
      logger.log(`🕌 Android: ${prayer.name} already quiet before iqamah — skipping auto-silence`);
      return { managed: false, restoreMode: (currentMode ?? 'NORMAL') as RingerMode };
    }

    const targetMode: RingerMode = settings.useVibrateInsteadOfSilent ? 'VIBRATE' : 'SILENT';
    const restoreMode: RingerMode = (currentMode || 'NORMAL') as RingerMode;
    const requestCodeBase = this.getRequestCodeBase(prayer.name, iqamahTime);

    const enableAtMs = iqamahTime.getTime();
    const restoreAtMs = settings.autoRestore ? restoreTime.getTime() : 0;

    if (currentMode) {
      StorageService.setValue(STORAGE_KEYS.PREVIOUS_RINGER_MODE, currentMode);
    }

    const scheduled = await RingerControlService.scheduleMosqueMode(
      enableAtMs,
      restoreAtMs,
      targetMode,
      restoreMode,
      requestCodeBase
    );

    if (!scheduled) {
      logger.warn('⚠️ Mosque mode could not be scheduled (missing DND access?)');
      return { managed: false, restoreMode };
    }

    logger.log(
      `📱 Android: Mosque mode scheduled from ${format(iqamahTime, 'h:mm a')} to ${format(
        restoreTime,
        'h:mm a'
      )}`
    );

    return { managed: true, restoreMode };
  }

  /**
   * @deprecated Use scheduleAndroidSilentModeWithMode. Kept for scheduleUpcomingMosqueModes.
   */
  private async scheduleAndroidSilentMode(
    prayer: PrayerTime,
    iqamahTime: Date,
    restoreTime: Date,
    settings: MosqueModeSettings
  ): Promise<boolean> {
    const result = await this.scheduleAndroidSilentModeWithMode(prayer, iqamahTime, restoreTime, settings);
    return result.managed;
  }

  /**
   * iOS: Schedule reminder notifications (can't directly control silent mode).
   * Used by scheduleUpcomingMosqueModes (auto mode). Sends a Time-Sensitive
   * pre-iqamah notification so it penetrates Focus modes.
   */
  private async scheduleIOSReminder(prayer: PrayerTime, iqamahTime: Date): Promise<void> {
    await this.cancelLegacyNotifications(prayer.name, iqamahTime);
    await this.scheduleIOSSilentModeNotifications(prayer, iqamahTime);
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
          const activeState = this.getActiveMosqueMode();
          if (activeState?.managedBySukoon !== false) {
            await RingerControlService.setRingerMode(mode || 'SILENT');
            logger.log(`🔇 ${mode} mode enabled for ${prayer} iqamah`);
          }
        }
      } else if (type === 'mosque_mode_restore') {
        // Android: Restore previous ringer mode
        if (Platform.OS === 'android') {
          const activeState = this.getActiveMosqueMode();
          if (activeState?.managedBySukoon !== false) {
            const modeToRestore = previousMode || 'NORMAL';
            await RingerControlService.setRingerMode(modeToRestore);
            logger.log(`🔊 Ringer restored to ${modeToRestore}`);
          }
        }

        // Clear active mosque mode (MMKV + SharedPreferences)
        StorageService.setValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE, '');
        void spClearActiveState();
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
      await this.cancelNotificationIdentifiers(this.getMosqueNotificationIdentifiers(prayer, dateStr));

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

    for (const prayer of prayers) {
      if (!this.isEnabledForPrayer(prayer.name)) continue;
      const iqamahTime = this.getIqamahTime(prayer);
      if (!iqamahTime) continue;
      if (iqamahTime <= now) continue; // Iqamah already passed
      await this.cancelLegacyNotifications(prayer.name, iqamahTime);
      await this.schedulePreIqamahNotification(prayer, iqamahTime, 'prompt');
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
        await this.cancelLegacyNotifications(prayer.name, iqamahTime);
        await this.schedulePreIqamahNotification(prayer, iqamahTime, 'auto');
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
  getActiveMosqueMode(): MosqueModeActiveState | null {
    try {
      const state = StorageService.getValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE);
      if (!state) return null;

      const parsed = JSON.parse(state);
      return {
        prayer: parsed.prayer,
        iqamahTime: new Date(parsed.iqamahTime),
        restoreTime: new Date(parsed.restoreTime),
        scheduledAt: new Date(parsed.scheduledAt),
        managedBySukoon: parsed.managedBySukoon !== false,
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

      const activeState = this.getActiveMosqueMode();
      if (activeState && !activeState.managedBySukoon) {
        StorageService.setValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE, '');
        void spClearActiveState();
        logger.log('🔕 Mosque mode ended without changing the current ringer state');
        return true;
      }

      const previousMode = (StorageService.getValue(STORAGE_KEYS.PREVIOUS_RINGER_MODE) || 'NORMAL') as RingerMode;
      await RingerControlService.setRingerMode(previousMode);

      // Clear active state from both MMKV and SharedPreferences
      StorageService.setValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE, '');
      void spClearActiveState();

      logger.log(`🔊 Ringer manually restored to ${previousMode}`);
      return true;
    } catch (error) {
      logger.error('❌ Failed to manually restore ringer:', error);
      return false;
    }
  }

  /**
   * Clear the active mosque-mode state from both MMKV and SharedPreferences.
   * Called by the watchdog after auto-restore, and by the boot receiver reconciliation.
   */
  clearActiveState(): void {
    StorageService.setValue(STORAGE_KEYS.ACTIVE_MOSQUE_MODE, '');
    void spClearActiveState();
    logger.log('[MosqueModeService] Active state cleared');
  }

  /**
   * Phase 1 — JS foreground watchdog (Android-only).
   *
   * Called on every app-foreground transition and on the 60-second tick.
   * If the AlarmManager restore alarm was killed and the phone is still silent
   * past restoreTime, this method auto-restores the ringer and clears the state.
   *
   * Also sets a one-shot setTimeout inside an active window as a redundant
   * in-process safety net (called from useMosqueModeWatchdog).
   *
   * Returns a string describing what action was taken (for logging/testing).
   */
  async runForegroundWatchdog(): Promise<'none' | 'restored' | 'no_restore_needed'> {
    // Watchdog is Android-only — iOS cannot change ringer programmatically.
    if (Platform.OS !== 'android') return 'none';

    const activeState = this.getActiveMosqueMode();
    if (!activeState) return 'none';

    // Only act when Sukoon was actually managing the ringer.
    if (!activeState.managedBySukoon) {
      // If state is stale (past restoreTime), clean up anyway.
      const now = Date.now();
      if (now >= activeState.restoreTime.getTime()) {
        this.clearActiveState();
        logger.log('[MosqueModeWatchdog] Stale non-managed state cleared after restoreTime');
      }
      return 'none';
    }

    const now = Date.now();
    const restoreMs = activeState.restoreTime.getTime();

    // Past restoreTime — check if phone is still quiet (alarm may have been killed).
    if (now >= restoreMs) {
      const currentMode = await RingerControlService.getRingerMode();
      if (currentMode === 'SILENT' || currentMode === 'VIBRATE') {
        // Restore alarm was missed. Auto-restore now.
        logger.log(`[MosqueModeWatchdog] Restore alarm missed — auto-restoring ringer (was ${currentMode})`);
        await this.manuallyRestoreRinger();
        return 'restored';
      }
      // Ringer is already NORMAL — alarm fired, state just wasn't cleared (edge case).
      logger.log('[MosqueModeWatchdog] Past restoreTime, ringer already normal — clearing stale state');
      this.clearActiveState();
      return 'no_restore_needed';
    }

    return 'none';
  }

  /**
   * Phase 2 — Boot reconciliation.
   *
   * Called from the JS boot task (notificationBootRescheduleTask) after
   * reconcileScheduling completes. Reads SharedPreferences to check if
   * there was an active mosque mode at boot time and re-arms the
   * AlarmManager restore alarm (or immediately restores the ringer if
   * the window has already passed).
   */
  async rearmFromPersistence(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const stateVal    = await spGet(SP_KEYS.STATE);
      if (!stateVal || stateVal === 'idle') return;

      const iqamahMsStr  = await spGet(SP_KEYS.IQAMAH_MS);
      const restoreMsStr = await spGet(SP_KEYS.RESTORE_MS);
      const prayerName   = (await spGet(SP_KEYS.PRAYER)) as PrayerName | null;
      const restoreMode  = ((await spGet(SP_KEYS.RESTORE_MODE)) || 'NORMAL') as RingerMode;
      const managedStr   = await spGet(SP_KEYS.MANAGED_BY_SUKOON);
      const managedBySukoon = managedStr === '1';

      if (!iqamahMsStr || !restoreMsStr || !prayerName) {
        logger.warn('[MosqueModeService] rearmFromPersistence: incomplete SP state, clearing');
        await spClearActiveState();
        return;
      }

      const iqamahMs  = parseInt(iqamahMsStr,  10);
      const restoreMs = parseInt(restoreMsStr, 10);
      const now       = Date.now();

      if (now >= restoreMs) {
        // Window has passed during reboot. Restore ringer immediately if we managed it.
        logger.log('[MosqueModeService] Boot: restore window passed — applying restore immediately');
        if (managedBySukoon) {
          const canModify = await RingerControlService.canModify();
          if (canModify) {
            await RingerControlService.setRingerMode(restoreMode);
            logger.log(`[MosqueModeService] Boot: ringer restored to ${restoreMode}`);
          }
        }
        this.clearActiveState();
        return;
      }

      if (now >= iqamahMs && now < restoreMs && managedBySukoon) {
        // We're in the active silence window after boot — re-arm only RESTORE alarm.
        // Also verify ringer is actually silent (boot may have reset it).
        const currentMode = await RingerControlService.getRingerMode();
        if (currentMode !== 'SILENT' && currentMode !== 'VIBRATE') {
          const canModify = await RingerControlService.canModify();
          if (canModify) {
            await RingerControlService.setRingerMode('SILENT');
            logger.log('[MosqueModeService] Boot: re-applied SILENT after boot during active window');
          }
        }
        logger.log('[MosqueModeService] Boot: in active window — RESTORE alarm re-arm handled by native boot receiver');
        return;
      }

      if (now < iqamahMs) {
        // Before iqamah — re-arm both alarms via native module.
        logger.log(`[MosqueModeService] Boot: iqamah in future — AlarmManager re-arm handled by native boot receiver for ${prayerName}`);
        // The RingerModeBootReceiver in the native plugin handles actual alarm re-arm.
        // JS side just needs to ensure MMKV state is reconciled.
        const existingMmkv = this.getActiveMosqueMode();
        if (!existingMmkv) {
          // MMKV was lost (process cleared) — restore from SP so UI is correct.
          this.persistActiveState(
            prayerName,
            new Date(iqamahMs),
            new Date(restoreMs),
            managedBySukoon,
            restoreMode,
          );
          logger.log('[MosqueModeService] Boot: MMKV state reconciled from SharedPreferences');
        }
      }
    } catch (error) {
      logger.error('[MosqueModeService] rearmFromPersistence error:', error);
    }
  }
}

export default new MosqueModeService();
