// src/services/notifications/NotificationChannels.ts
// Extracted from NotificationService: channel setup, cleanup, and iOS categories

import * as Notifications from 'expo-notifications';
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
      deletableIds.add(`prayer-times-default-v${v}`);
      deletableIds.add(`pre-prayer-v${v}`);
      deletableIds.add(`mindfulness-v${v}`);
      deletableIds.add(`grace-warning-v${v}`);
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
 */
export async function setupNotificationChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNELS.DEFAULT, {
    name: 'Prayer Times (Beep)',
    description: 'Standard notifications for prayer times',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E3F',
    sound: 'default',
    bypassDnd: false,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.ADHAN, {
    name: 'Prayer Times (Adhan)',
    description: 'Plays the full call to prayer',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 1000, 500, 1000],
    lightColor: '#1B5E3F',
    sound: SOUNDS.ANDROID_FULL,
    bypassDnd: false,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.PRE_PRAYER, {
    name: 'Prayer Preparation',
    description: 'Reminders before prayer time',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 100, 100, 100],
    lightColor: '#D4AF37',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.MINDFULNESS, {
    name: 'Mindfulness Reminders',
    description: 'Gentle reminders for prayer preparation',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0, 50],
    sound: null,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.GRACE_WARNING, {
    name: 'Grace Period Warnings',
    description: 'Urgent reminders when prayer time is ending',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B6B',
    sound: 'default',
    bypassDnd: false,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.TAHAJJUD, {
    name: 'Tahajjud Encouragement',
    description: 'Gentle reminders to pray the night prayer',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0, 50],
    lightColor: '#7986CB',
    sound: null,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.RAMADAN_COUNTDOWN, {
    name: 'Ramadan Countdown',
    description: 'Daily countdown and encouragement for Ramadan',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 100],
    lightColor: '#D4AF37',
    sound: 'default',
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
      buttonTitle: 'Snooze',
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
      buttonTitle: 'Remind in 10m',
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
