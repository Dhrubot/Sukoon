// src/services/notifications/HabitBuilderNotifications.ts
// Extracted from NotificationService: Tier 2/3 habit builder scheduling

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PrayerTime, UserSettings } from '../../types';
import PrayerTimeService from '../PrayerTimeService';
import { CHANNELS } from '../../constants/NotificationConstants';
import { NOTIFICATION_CATEGORIES } from './NotificationChannels';
import { format } from 'date-fns';
import logger from '../../utils/logger';

/**
 * Check if current time is within quiet hours.
 */
export function isQuietHours(settings: UserSettings, time: Date = new Date()): boolean {
  if (!settings.habitBuilder?.quietHours?.enabled) {
    return false;
  }

  const currentHour = time.getHours();
  const currentMinute = time.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = settings.habitBuilder.quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = settings.habitBuilder.quietHours.end.split(':').map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 to 04:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

/**
 * Get contextual messages for Tier 2 reminders.
 */
export function getTier2Messages(urgency: 'first' | 'middle' | 'final'): string[] {
  const messages = {
    first: [
      "Have you prayed {prayer} yet? 🤲",
      "Checking in: Did you complete {prayer}? 🕌",
      "Quick reminder about {prayer} prayer ✨",
    ],
    middle: [
      "Still waiting for {prayer}! Everything okay? 💚",
      "Friendly reminder: {prayer} is waiting! 🤲",
      "Hey there! Don't forget {prayer} prayer 🕌",
    ],
    final: [
      "Last reminder for {prayer} prayer! 🙏",
      "I won't give up on you! {prayer} time 💚",
      "Final check: Have you prayed {prayer}? 🕌",
    ],
  };

  return messages[urgency];
}

/**
 * TIER 2: Schedule persistent "Have you prayed?" reminders.
 */
export async function scheduleTier2PersistentReminders(
  prayer: PrayerTime,
  prayerId: string,
  settings: UserSettings,
  existingIdentifiers?: Set<string>,
  deadline?: Date
): Promise<void> {
  const habitSettings = settings.habitBuilder;

  if (!habitSettings.enabled || !habitSettings.persistentReminders.enabled) {
    return;
  }

  const { firstCheckDelay, interval, maxReminders } = habitSettings.persistentReminders;
  const now = new Date();

  for (let i = 1; i <= maxReminders; i++) {
    const reminderTime = new Date(
      prayer.time.getTime() +
      firstCheckDelay * 60000 +
      (i - 1) * interval * 60000
    );

    if (reminderTime <= now) continue;

    // Don't schedule reminders past the prayer deadline
    // (sunrise for Fajr, next prayer time for others)
    if (deadline && reminderTime >= deadline) {
      logger.log(`⏰ Skipping Tier 2 reminder #${i} - past prayer deadline`);
      break;
    }

    if (isQuietHours(settings, reminderTime)) {
      logger.log(`⏰ Skipping Tier 2 reminder #${i} - quiet hours`);
      continue;
    }

    const urgency = i === 1 ? 'first' : i === maxReminders ? 'final' : 'middle';
    const messages = getTier2Messages(urgency);
    const prayerDisplayName = PrayerTimeService.getPrayerDisplayName(prayer.name);
    const message = messages[Math.floor(Math.random() * messages.length)]
      .replace('{prayer}', prayerDisplayName);

    const tier2Identifier = `tier2-${prayerId}-${i}`;
    if (existingIdentifiers?.has(tier2Identifier)) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${prayerDisplayName} Prayer Check-in 🤲`,
        body: message,
        data: {
          prayerId,
          prayer: prayer.name,
          type: 'tier2-reminder',
          tier: i,
          scheduledAt: new Date().toISOString(),
        },
        categoryIdentifier: NOTIFICATION_CATEGORIES.POST_PRAYER_CHECK,
        sound: 'default',
        ...(Platform.OS === 'android' && {
          channelId: CHANNELS.DEFAULT,
          priority: i === maxReminders ? 'high' : 'default',
        }),
      },
      trigger: {
        type: 'date',
        date: reminderTime,
      } as Notifications.NotificationTriggerInput,
      identifier: tier2Identifier,
    });

    existingIdentifiers?.add(tier2Identifier);
    logger.log(`🔔 Tier 2 reminder #${i} scheduled for ${prayerDisplayName} at ${format(reminderTime, 'HH:mm')}`);
  }
}

/**
 * TIER 3: Schedule grace period warning before next prayer.
 */
export async function scheduleTier3GracePeriodWarning(
  prayer: PrayerTime,
  nextPrayer: PrayerTime,
  prayerId: string,
  settings: UserSettings,
  existingIdentifiers?: Set<string>,
  deadline?: Date
): Promise<void> {
  const habitSettings = settings.habitBuilder;

  if (!habitSettings.enabled || !habitSettings.gracePeriodWarning.enabled) {
    return;
  }

  const { minutesBeforeNext } = habitSettings.gracePeriodWarning;
  // Use deadline (e.g. sunrise for Fajr) if it's earlier than nextPrayer
  const effectiveEnd = deadline && deadline < nextPrayer.time ? deadline : nextPrayer.time;
  const warningTime = new Date(effectiveEnd.getTime() - minutesBeforeNext * 60000);
  const now = new Date();

  if (warningTime <= now || warningTime <= prayer.time) return;

  if (isQuietHours(settings, warningTime)) {
    logger.log('⏰ Skipping Tier 3 warning - quiet hours');
    return;
  }

  const prayerDisplayName = PrayerTimeService.getPrayerDisplayName(prayer.name);
  const deadlineLabel = deadline && deadline < nextPrayer.time
    ? 'Sunrise'
    : PrayerTimeService.getPrayerDisplayName(nextPrayer.name);

  const tier3Identifier = `tier3-${prayerId}`;
  if (existingIdentifiers?.has(tier3Identifier)) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ ${prayerDisplayName} Grace Period Ending`,
      body: `${deadlineLabel} ${deadline && deadline < nextPrayer.time ? 'is' : 'prayer starts'} in ${minutesBeforeNext} minutes. Don't miss ${prayerDisplayName}!`,
      data: {
        prayerId,
        prayer: prayer.name,
        nextPrayer: nextPrayer.name,
        type: 'tier3-warning',
        scheduledAt: new Date().toISOString(),
      },
      categoryIdentifier: NOTIFICATION_CATEGORIES.GRACE_PERIOD_WARNING,
      sound: 'default',
      ...(Platform.OS === 'android' && {
        channelId: CHANNELS.GRACE_WARNING,
        priority: 'high',
      }),
    },
    trigger: {
      type: 'date',
      date: warningTime,
    } as Notifications.NotificationTriggerInput,
    identifier: tier3Identifier,
  });

  existingIdentifiers?.add(tier3Identifier);
  logger.log(`⚠️ Tier 3 warning scheduled for ${prayerDisplayName} at ${format(warningTime, 'HH:mm')}`);
}
