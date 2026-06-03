// src/services/JummahNotificationService.ts
// Schedules Friday-specific notifications: Surah Al-Kahf reminder, Jummah preparation,
// Jummah prayer call, and last-hour dua reminder.
// Modeled after RamadanCountdownService pattern.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CHANNELS, IOS_NOTIFICATION_CAP } from '../constants/NotificationConstants';
import { NOTIFICATION_CATEGORIES } from './notifications/NotificationChannels';
import { isFriday } from '../utils/ramadan';
import StorageService from './StorageService';
import logger from '../utils/logger';
import { getLocalDateKey } from '../utils/dateHelpers';
import { PrayerTime } from '../types';
import { scheduleLocalNotificationAsync } from './notifications/scheduleLocalNotification';

const NOTIFICATION_PREFIX = 'jummah';
const STORAGE_KEY_LAST_SCHEDULED = 'jummah_last_scheduled';

// ── Morning messages (Surah Al-Kahf + Friday blessings) ──────────────
const MORNING_MESSAGES: { title: string; body: string }[] = [
  {
    title: 'Jumu\'ah Mubarak',
    body: 'The Prophet ﷺ said: "Whoever reads Surah Al-Kahf on Friday, a light will shine for him between the two Fridays." Take time to read it today.',
  },
  {
    title: 'Blessed Friday',
    body: '"The best day on which the sun rises is Friday." — Prophet ﷺ. Send abundant salawat upon the Prophet ﷺ today.',
  },
  {
    title: 'Friday Blessings',
    body: 'The Prophet ﷺ said: "Increase your salawat upon me on Friday, for it is witnessed by the angels." Begin your Friday with remembrance.',
  },
  {
    title: 'Surah Al-Kahf',
    body: '"Whoever reads Surah Al-Kahf on Friday, he will be illuminated with light between the two Fridays." — Al-Hakim. Open your Quran.',
  },
  {
    title: 'The Master of Days',
    body: 'Friday is the master of days and the greatest of them before Allah. Make it count with dhikr, salawat, and Surah Al-Kahf.',
  },
];

// ── Pre-Jummah preparation messages ──────────────────────────────────
const PREPARATION_MESSAGES: { title: string; body: string }[] = [
  {
    title: 'Prepare for Jumu\'ah',
    body: 'The Prophet ﷺ said: "Whoever takes a bath on Friday, goes early to the mosque... will have the reward of fasting and praying for a whole year." Perform ghusl and wear your best.',
  },
  {
    title: 'Time to Get Ready',
    body: '"Go early to the mosque — the first hour is like sacrificing a camel, the second like a cow, the third like a ram." — Prophet ﷺ. Head out early!',
  },
  {
    title: 'Jumu\'ah Preparation',
    body: 'Apply perfume, wear clean clothes, and go early. The Prophet ﷺ said: "When it is Friday, the angels stand at the gate of the mosque..."',
  },
  {
    title: 'Get Ready for the Khutbah',
    body: 'Ghusl, miswak, best clothes, and early arrival — these are the Sunnahs of Friday. The reward is immense.',
  },
];

// ── Last-hour dua messages (afternoon) ───────────────────────────────
const DUA_MESSAGES: { title: string; body: string }[] = [
  {
    title: 'The Blessed Hour',
    body: '"There is a time on Friday at which no Muslim stands and prays, asking Allah for something, but Allah will give it to him." — Bukhari. Make dua now!',
  },
  {
    title: 'Don\'t Miss This Hour',
    body: 'The last hour before Maghrib on Friday is one of the most blessed times for dua. Ask Allah for everything you need.',
  },
  {
    title: 'Friday Dua',
    body: 'The Prophet ﷺ said there is an hour on Friday when dua is accepted. Scholars say it is the last hour before Maghrib. Raise your hands.',
  },
  {
    title: 'Ask Allah',
    body: '"Seek the hour of response on Friday." — Prophet ﷺ. The last hour before Maghrib is upon us. Make sincere dua.',
  },
];

const EARLY_DUA_MESSAGES: { title: string; body: string }[] = [
  {
    title: 'Hold Your Dua for Friday',
    body: 'Keep your dua list close today. Many scholars placed the hour of response late on Friday, especially after \'Asr.',
  },
  {
    title: 'Prepare for the Accepted Hour',
    body: 'Jumu\'ah carries a blessed hour in which dua is answered. Return to your duas after \'Asr with presence and hope.',
  },
];

class JummahNotificationServiceClass {
  /**
   * Main entry point: schedule all Friday notifications.
   * Called from useServiceInitialization when prayer times are loaded.
   */
  async scheduleJummahNotifications(todayPrayerTimes: PrayerTime[]): Promise<void> {
    try {
      if (!isFriday()) {
        logger.log('🕌 Not Friday — skipping Jummah notifications');
        return;
      }

      // Check if Jummah reminders are enabled
      const settings = StorageService.getUserSettings();
      if (settings?.jummahReminders?.enabled === false) {
        logger.log('🕌 Jummah reminders disabled');
        return;
      }

      // Don't schedule more than once per day
      const today = getLocalDateKey();
      const lastScheduled = StorageService.getValue(STORAGE_KEY_LAST_SCHEDULED);
      if (lastScheduled === today) {
        logger.log('🕌 Jummah notifications already scheduled today');
        return;
      }

      // Cancel any existing Jummah notifications
      await this.cancelExisting();

      const dhuhr = todayPrayerTimes.find(p => p.name === 'Dhuhr');
      const asr = todayPrayerTimes.find(p => p.name === 'Asr');
      const maghrib = todayPrayerTimes.find(p => p.name === 'Maghrib');
      const fajr = todayPrayerTimes.find(p => p.name === 'Fajr');

      if (!dhuhr) {
        logger.log('🕌 No Dhuhr time available — cannot schedule Jummah');
        return;
      }

      const now = new Date();

      // 1. Morning reminder (after Fajr, around 7am or 2 hours after Fajr)
      const morningTime = new Date();
      if (fajr) {
        morningTime.setTime(fajr.time.getTime() + 2 * 60 * 60 * 1000); // 2 hours after Fajr
      } else {
        morningTime.setHours(7, 0, 0, 0);
      }
      if (morningTime > now) {
        await this.scheduleNotification(
          'morning',
          morningTime,
          this.pickRandom(MORNING_MESSAGES),
        );
      }

      // 2. Preparation reminder (1 hour before Dhuhr)
      const prepTime = new Date(dhuhr.time.getTime() - 60 * 60 * 1000);
      if (prepTime > now) {
        await this.scheduleNotification(
          'preparation',
          prepTime,
          this.pickRandom(PREPARATION_MESSAGES),
        );
      }

      // 3. Jummah prayer call (at Dhuhr time) — uses existing prayer notification system
      // We don't schedule the main adhan here as it's handled by NotificationService.
      // But we add a Jummah-specific overlay message.
      const jummahTime = new Date(dhuhr.time.getTime() + 60 * 1000); // 1 min after Dhuhr adhan
      if (jummahTime > now) {
        await this.scheduleNotification(
          'prayer',
          jummahTime,
          {
            title: 'Jumu\'ah Prayer Time',
            body: '"O you who believe! When the call is made for prayer on Friday, hasten to the remembrance of Allah." — Surah Al-Jumu\'ah (62:9)',
          },
        );
      }

      // 4. Last-hour dua reminder (1 hour before Maghrib)
      if (asr && maghrib) {
        const earlyDuaTime = new Date(asr.time.getTime() + 15 * 60 * 1000);
        if (earlyDuaTime > now && earlyDuaTime < maghrib.time) {
          await this.scheduleNotification(
            'dua-window',
            earlyDuaTime,
            this.pickRandom(EARLY_DUA_MESSAGES),
          );
        }
      }

      // 5. Last-hour dua reminder (1 hour before Maghrib)
      if (maghrib) {
        const duaTime = new Date(maghrib.time.getTime() - 60 * 60 * 1000);
        if (duaTime > now) {
          await this.scheduleNotification(
            'dua',
            duaTime,
            this.pickRandom(DUA_MESSAGES),
          );
        }
      }

      StorageService.setValue(STORAGE_KEY_LAST_SCHEDULED, today);
      logger.log('🕌 Jummah notifications scheduled successfully');
    } catch (error) {
      logger.error('🕌 Failed to schedule Jummah notifications:', error);
    }
  }

  private async scheduleNotification(
    type: string,
    date: Date,
    message: { title: string; body: string },
  ): Promise<void> {
    // iOS budget check
    if (Platform.OS === 'ios') {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      if (scheduled.length >= IOS_NOTIFICATION_CAP) {
        logger.log(`🕌🚫 iOS cap reached, skipping Jummah ${type}`);
        return;
      }
    }

    const identifier = `${NOTIFICATION_PREFIX}-${type}-${getLocalDateKey()}`;

    await scheduleLocalNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        data: { type: `jummah-${type}` },
        categoryIdentifier: NOTIFICATION_CATEGORIES.JUMMAH_REMINDER,
      },
      trigger: {
        type: 'date',
        date,
        ...(Platform.OS === 'android' && {
          channelId: CHANNELS.JUMMAH,
        }),
      } as Notifications.NotificationTriggerInput,
      identifier,
    });

    logger.log(`🕌 Jummah ${type} notification scheduled for ${date.toLocaleTimeString()}`);
  }

  /**
   * Cancel all existing Jummah notifications.
   */
  async cancelExisting(): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.identifier.startsWith(NOTIFICATION_PREFIX)) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (error) {
      logger.warn('🕌 Failed to cancel existing Jummah notifications:', error);
    }
  }

  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

const JummahNotificationService = new JummahNotificationServiceClass();
export default JummahNotificationService;
