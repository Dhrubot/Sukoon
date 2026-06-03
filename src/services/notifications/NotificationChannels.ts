// src/services/notifications/NotificationChannels.ts
// Extracted from NotificationService: channel setup, cleanup, and iOS categories

import * as Notifications from 'expo-notifications';
import { AndroidAudioContentType, AndroidAudioUsage } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { CHANNELS, SOUNDS, NOTIFICATION_CHANNEL_VERSION } from '../../constants/NotificationConstants';
import logger from '../../utils/logger';

// Notification categories for iOS (Prayer Habit Builder)
export const NOTIFICATION_CATEGORIES = {
  PRAYER_REMINDER: 'prayer-reminder',
  PRE_PRAYER: 'pre-prayer',
  POST_PRAYER_CHECK: 'post-prayer-check',
  GRACE_PERIOD_WARNING: 'grace-period-warning',
  SNOOZE_OPTIONS: 'snooze-options',
  MOSQUE_REMINDER: 'mosque-reminder',
  TAHAJJUD_REMINDER: 'tahajjud-reminder',
  JUMMAH_REMINDER: 'jummah-reminder',
};

/**
 * Auto-delete old versioned channels to keep Android settings clean and force sound updates.
 */
export async function cleanupOldChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const channels = await Notifications.getNotificationChannelsAsync();
    const currentVersion = NOTIFICATION_CHANNEL_VERSION;
    const deletableIds = new Set<string>();
    for (let v = 1; v < currentVersion; v++) {
      deletableIds.add(`prayer-times-adhan-v${v}`);
      deletableIds.add(`prayer-times-adhan-silent-v${v}`);
      deletableIds.add(`prayer-times-default-v${v}`);
      deletableIds.add(`pre-prayer-v${v}`);
      deletableIds.add(`persistent-urgent-v${v}`);
      deletableIds.add(`mindfulness-v${v}`);
      deletableIds.add(`grace-warning-v${v}`);
      deletableIds.add(`tahajjud-v${v}`);
      deletableIds.add(`jummah-v${v}`);
      deletableIds.add(`ramadan-countdown-v${v}`);
    }
    for (const channel of channels) {
      if (deletableIds.has(channel.id)) {
        logger.log(`🧹 Deleting old channel: ${channel.id}`);
        await Notifications.deleteNotificationChannelAsync(channel.id);
      }
    }
    logger.log('✅ Old channels cleaned up');
  } catch (e) {
    logger.warn('⚠️ Failed to cleanup old channels:', e);
  }
}

/**
 * Setup notification channels with Adhan support (Android only).
 *
 * Note on lockscreenVisibility: Android defaults this to PRIVATE on most stock
 * builds, but Samsung OneUI leaves the field as -1000 ("not set") which can
 * collapse the body on the lock screen. Setting PUBLIC explicitly keeps the
 * prayer name + body visible when the device is locked — which is the point of
 * the notification.
 *
 * Note on bypassDnd: ADHAN bypasses so the call to prayer reaches the user
 * under silent / Do Not Disturb. ADHAN_SILENT does NOT bypass because the
 * audible portion is handled by AdhanService (USAGE_ALARM stream) and the
 * channel itself only renders the visible card.
 */
export async function setupNotificationChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNELS.DEFAULT, {
    name: 'Prayer Times (Beep)',
    description: 'Standard notifications for prayer times',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E3F',
    bypassDnd: false,
    showBadge: true,
  });

  // Short-clip fallback channel — used when the native full-Adhan alarm service is
  // unavailable (e.g. exact-alarm permission not granted). Alarm-grade audio attributes
  // + bypassDnd make the call to prayer audible under silent mode / Do Not Disturb,
  // matching the native foreground-service path (which plays via USAGE_ALARM).
  await Notifications.setNotificationChannelAsync(CHANNELS.ADHAN, {
    name: 'Prayer Times (Adhan)',
    description: 'Short call to prayer notification',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 1000, 500, 1000],
    lightColor: '#1B5E3F',
    sound: SOUNDS.ANDROID_SHORT,
    audioAttributes: {
      usage: AndroidAudioUsage.ALARM,
      contentType: AndroidAudioContentType.MUSIC,
    },
    bypassDnd: true,
    showBadge: true,
  });

  // Silent adhan channel — used when Full Adhan foreground service handles audio
  await Notifications.setNotificationChannelAsync(CHANNELS.ADHAN_SILENT, {
    name: 'Prayer Times (Full Adhan)',
    description: 'Visual notification while full Adhan plays via foreground service',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E3F',
    sound: null, // No sound — audio comes from AdhanService
    bypassDnd: false,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.PRE_PRAYER, {
    name: 'Prayer Preparation',
    description: 'Reminders before prayer time',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 100, 100, 100],
    lightColor: '#D4AF37',
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.PERSISTENT_URGENT, {
    name: 'Prayer Follow-up (Urgent)',
    description: 'Final prayer-window reminders with higher urgency',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B6B',
    bypassDnd: false,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.MINDFULNESS, {
    name: 'Mindfulness Reminders',
    description: 'Gentle reminders for prayer preparation',
    importance: Notifications.AndroidImportance.LOW,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 50],
    sound: null,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.GRACE_WARNING, {
    name: 'Grace Period Warnings',
    description: 'Urgent reminders when prayer time is ending',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B6B',
    bypassDnd: false,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.TAHAJJUD, {
    name: 'Tahajjud Encouragement',
    description: 'Gentle reminders to pray the night prayer',
    importance: Notifications.AndroidImportance.LOW,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 50],
    lightColor: '#7986CB',
    sound: null,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.JUMMAH, {
    name: 'Jummah Reminders',
    description: 'Friday Jummah prayer and Sunnah reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 100],
    lightColor: '#D4AF37',
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.RAMADAN_COUNTDOWN, {
    name: 'Ramadan Countdown',
    description: 'Daily countdown and encouragement for Ramadan',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 100],
    lightColor: '#D4AF37',
  });

  logger.log('✅ Notification channels set up with versioning');
}

/**
 * Setup iOS notification categories with action buttons.
 */
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.PRAYER_REMINDER, [
    {
      identifier: 'snooze',
      buttonTitle: 'Remind Me Later',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'complete',
      buttonTitle: 'Mark Complete',
      options: { opensAppToForeground: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.PRE_PRAYER, [
    {
      identifier: 'prepare',
      buttonTitle: 'Prepare for Prayer',
      options: { opensAppToForeground: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.POST_PRAYER_CHECK, [
    {
      identifier: 'yes_prayed',
      buttonTitle: 'Yes, I Prayed',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'snooze_prayer',
      buttonTitle: 'Remind Me in 10m',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'skip_prayer',
      buttonTitle: 'Skip',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.GRACE_PERIOD_WARNING, [
    {
      identifier: 'pray_now',
      buttonTitle: 'Pray Now',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'skip_prayer',
      buttonTitle: "I'll Skip",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.TAHAJJUD_REMINDER, [
    {
      identifier: 'prepare',
      buttonTitle: 'Prepare for Prayer',
      options: { opensAppToForeground: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.JUMMAH_REMINDER, [
    {
      identifier: 'prepare',
      buttonTitle: 'Prepare for Jumu\'ah',
      options: { opensAppToForeground: true },
    },
  ]);
}

/**
 * Initialize all channels and categories.
 */
export async function initializeChannelsAndCategories(): Promise<void> {
  if (Platform.OS === 'ios') {
    await setupNotificationCategories();
  }
  if (Platform.OS === 'android' && Device.isDevice) {
    await cleanupOldChannels();
    await setupNotificationChannels();
  }
}
