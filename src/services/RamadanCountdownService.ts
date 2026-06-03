// src/services/RamadanCountdownService.ts
// Schedules daily Ramadan countdown notifications before Ramadan
// and daily encouragement notifications during Ramadan.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CHANNELS, IOS_NOTIFICATION_CAP, NOTIFICATION_LOWER_TIER_DAYS } from '../constants/NotificationConstants';
import { getCachedHijriDate, isRamadan } from '../utils/ramadan';
import StorageService from './StorageService';
import logger from '../utils/logger';
import { getLocalDateKey } from '../utils/dateHelpers';
import { scheduleLocalNotificationAsync } from './notifications/scheduleLocalNotification';

const NOTIFICATION_PREFIX = 'ramadan-countdown';
const STORAGE_KEY_LAST_SCHEDULED = 'ramadan_countdown_last_scheduled';
const NOTIFICATION_HOUR = 9; // 9:00 AM local time
const NOTIFICATION_MINUTE = 0;

// ── Countdown messages (before Ramadan) ──────────────────────────────
const COUNTDOWN_MESSAGES: { title: string; body: string }[] = [
  // General (used for 30+ days)
  { title: 'Ramadan is Approaching', body: '"O you who believe, fasting is prescribed for you..." (2:183). Begin preparing your heart.' },
  { title: 'The Blessed Month Draws Near', body: 'The Prophet ﷺ said: "When Ramadan begins, the gates of Paradise are opened." Start your preparations.' },
  { title: 'Preparing for Ramadan', body: 'Make dua that Allah allows you to reach Ramadan. Many wished for it but did not live to see it.' },
  { title: 'A Month of Mercy Awaits', body: '"Sha\'ban is a month people neglect... I like my deeds to be lifted while I am fasting." — Prophet ﷺ' },
  { title: 'Spiritual Preparation', body: 'Consider increasing your voluntary fasts in Sha\'ban, following the Sunnah of the Prophet ﷺ.' },
  { title: 'Ready Your Heart', body: 'Begin reviewing the Quran now so you can deepen your connection during Ramadan.' },
  { title: 'Clear Your Schedule', body: 'Plan ahead: reduce commitments so you can dedicate more time to worship during Ramadan.' },
  { title: 'Seek Forgiveness', body: 'The Prophet ﷺ said: "Whoever fasts Ramadan out of faith and seeking reward, his past sins will be forgiven."' },
  { title: 'Charity Before Ramadan', body: 'Consider what causes you will support this Ramadan. Planning your charity increases its impact.' },
  { title: 'Mend Relationships', body: 'Enter Ramadan with a clean heart. Reach out to those you have wronged or lost touch with.' },
];

// Milestone messages (specific day counts)
const MILESTONE_MESSAGES: Record<number, { title: string; body: string }> = {
  30: { title: '30 Days to Ramadan', body: 'One month until the blessed month begins. Start preparing your heart, mind, and schedule.' },
  14: { title: 'Two Weeks to Ramadan', body: 'Ramadan is just 14 days away. Consider fasting Mondays and Thursdays to ease into it.' },
  7: { title: 'One Week to Ramadan!', body: 'Seven days until the gates of Paradise open. Increase your dhikr and prepare your intentions.' },
  3: { title: '3 Days to Ramadan', body: 'The blessed month is almost here! Stock your home, clear your heart, and set your goals.' },
  2: { title: '2 Days to Ramadan', body: 'Prepare your suhoor supplies and set your alarm. The Prophet ﷺ said: "Take suhoor, for in it there is blessing."' },
  1: { title: 'Ramadan Begins Tomorrow!', body: 'Allahu Akbar! Tomorrow the mercy descends. Make your niyyah tonight. May Allah accept from all of us.' },
};

// ── During-Ramadan daily messages ────────────────────────────────────
const RAMADAN_MESSAGES: { title: string; body: string }[] = [
  { title: 'Ramadan Mubarak!', body: '"The month of Ramadan in which the Quran was revealed..." (2:185). Make the most of this blessed day.' },
  { title: 'A Day of Mercy', body: 'The first 10 days are days of Mercy. Ask Allah for His mercy in every sajdah.' },
  { title: 'Patience & Gratitude', body: '"Fasting is a shield." — Prophet ﷺ. Let today\'s fast protect you from heedlessness.' },
  { title: 'The Quran Awaits', body: 'Even one ayah today is better than none. Open the Quran and let it speak to your heart.' },
  { title: 'Give Today', body: '"The Prophet ﷺ was the most generous of people, and he was most generous during Ramadan." — Bukhari' },
  { title: 'Night Prayer', body: '"Whoever prays during the nights of Ramadan out of faith and seeking reward, his past sins will be forgiven."' },
  { title: 'Break Fast with Gratitude', body: 'As you break your fast, remember those who have nothing. Let gratitude fill your heart.' },
  { title: 'Forgiveness', body: 'The middle 10 days are days of Forgiveness. Seek Allah\'s forgiveness for all your shortcomings.' },
  { title: 'Control Your Tongue', body: '"If someone fights or insults you, say: I am fasting." — Prophet ﷺ. Let fasting purify your speech.' },
  { title: 'Dua at Iftar', body: 'The dua of the fasting person at the time of breaking fast is not rejected. Ask for everything.' },
  { title: 'Stay Strong', body: 'The middle of Ramadan tests your resolve. Remember: every moment of hunger is recorded as worship.' },
  { title: 'Renew Your Intention', body: 'Refresh your niyyah today. Fast not from habit, but from love for Allah.' },
  { title: 'Reflect on the Quran', body: '"Will they not then ponder over the Quran?" (47:24). Let today\'s reading change you.' },
  { title: 'Kindness Today', body: 'The Prophet ﷺ said: "A kind word is charity." Spread warmth wherever you go today.' },
  { title: 'Suhoor Blessing', body: '"Take suhoor, for in it there is blessing." — Prophet ﷺ. Even a sip of water counts.' },
  { title: 'The Last 10 Nights Begin', body: 'Seek Laylatul Qadr! "It is better than a thousand months." (97:3). Increase your worship.' },
  { title: 'Laylatul Qadr', body: 'The Prophet ﷺ said: "Seek it in the odd nights of the last ten." Stay up tonight in worship.' },
  { title: 'Itikaf Spirit', body: 'Even if you cannot do full itikaf, spend extra time in the masjid during these blessed nights.' },
  { title: 'Dua for the Ummah', body: 'In these precious nights, remember the entire Ummah in your dua. Your prayer may save someone.' },
  { title: 'Don\'t Slow Down', body: 'The Prophet ﷺ would tighten his belt in the last 10 nights. Push through — the reward is immense.' },
  { title: 'Almost There', body: 'The last days of Ramadan. Every second is precious. "Allahumma innaka \'afuwwun tuhibbul \'afwa fa\'fu \'anni."' },
  { title: 'Prepare for Eid', body: 'Don\'t forget Zakat al-Fitr before Eid prayer. May Allah accept your Ramadan.' },
  { title: 'Farewell Ramadan', body: 'As Ramadan ends, carry its lessons forward. The Lord of Ramadan is the Lord of every month.' },
];

class RamadanCountdownServiceClass {

  /**
   * Main entry point: schedule Ramadan-related notifications.
   * Call on every app start from useServiceInitialization.
   */
  async scheduleRamadanNotifications(): Promise<void> {
    try {
      const hijri = getCachedHijriDate();
      if (!hijri) {
        logger.log('🌙 No Hijri date cached — skipping Ramadan notifications');
        return;
      }

      // Don't schedule more than once per day
      const today = getLocalDateKey();
      const lastScheduled = StorageService.getValue(STORAGE_KEY_LAST_SCHEDULED);
      if (lastScheduled === today) {
        logger.log('🌙 Ramadan notifications already scheduled today');
        return;
      }

      // Cancel any existing Ramadan countdown notifications
      await this.cancelExisting();

      if (isRamadan()) {
        await this.scheduleDuringRamadan(hijri.day);
      } else {
        const daysUntil = this.estimateDaysUntilRamadan(hijri.month, hijri.day);
        if (daysUntil > 0 && daysUntil <= 45) {
          await this.scheduleCountdown(daysUntil);
        } else {
          logger.log(`🌙 Ramadan is ~${daysUntil} days away — too far for countdown`);
        }
      }

      StorageService.setValue(STORAGE_KEY_LAST_SCHEDULED, today);
    } catch (error) {
      logger.error('🌙 Failed to schedule Ramadan notifications:', error);
    }
  }

  /**
   * Estimate days until Ramadan 1 from current Hijri date.
   * Hijri months alternate 29-30 days. This is approximate.
   */
  private estimateDaysUntilRamadan(currentMonth: number, currentDay: number): number {
    const RAMADAN_MONTH = 9;

    if (currentMonth === RAMADAN_MONTH) return 0; // Already in Ramadan

    let monthsUntil: number;
    if (currentMonth < RAMADAN_MONTH) {
      monthsUntil = RAMADAN_MONTH - currentMonth;
    } else {
      // Past Ramadan this year, calculate to next year's Ramadan
      monthsUntil = (12 - currentMonth) + RAMADAN_MONTH;
    }

    // Average Hijri month ≈ 29.53 days
    // Remaining days in current month + full months between
    const daysRemainingInCurrentMonth = 30 - currentDay; // approximate
    const fullMonthsBetween = monthsUntil - 1;
    const daysInFullMonths = Math.round(fullMonthsBetween * 29.53);

    return daysRemainingInCurrentMonth + daysInFullMonths;
  }

  /**
   * Schedule countdown notifications (before Ramadan).
   */
  private async scheduleCountdown(daysUntil: number): Promise<void> {
    const maxToSchedule = Math.min(daysUntil, NOTIFICATION_LOWER_TIER_DAYS);
    logger.log(`🌙 Scheduling ${maxToSchedule} Ramadan countdown notifications (${daysUntil} days away)`);

    for (let i = 0; i < maxToSchedule; i++) {
      const daysAway = daysUntil - i;
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + i);
      scheduledDate.setHours(NOTIFICATION_HOUR, NOTIFICATION_MINUTE, 0, 0);

      // Skip if the scheduled time is in the past (today but past 9am)
      if (scheduledDate <= new Date()) {
        if (i === 0) continue; // Skip today's if past notification hour
      }

      // iOS budget check
      if (Platform.OS === 'ios') {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (scheduled.length >= IOS_NOTIFICATION_CAP) {
          logger.log(`🌙🚫 iOS cap reached, stopping Ramadan countdown at ${i}/${maxToSchedule}`);
          break;
        }
      }

      // Pick message: milestone or rotating
      const message = MILESTONE_MESSAGES[daysAway]
        || COUNTDOWN_MESSAGES[i % COUNTDOWN_MESSAGES.length];

      const bodyWithCount = daysAway > 1
        ? `${daysAway} days to Ramadan — ${message.body}`
        : message.body;

      await scheduleLocalNotificationAsync({
        content: {
          title: message.title,
          body: bodyWithCount,
          data: { type: 'ramadan-countdown', daysAway },
        },
        trigger: {
          type: 'date',
          date: scheduledDate,
          ...(Platform.OS === 'android' && {
            channelId: CHANNELS.RAMADAN_COUNTDOWN,
          }),
        } as Notifications.NotificationTriggerInput,
        identifier: `${NOTIFICATION_PREFIX}-${daysAway}`,
      });
    }

    logger.log(`🌙 Scheduled ${maxToSchedule} Ramadan countdown notifications`);
  }

  /**
   * Schedule encouragement notifications during Ramadan.
   */
  private async scheduleDuringRamadan(currentDay: number): Promise<void> {
    const daysRemaining = 30 - currentDay;
    const toSchedule = Math.min(daysRemaining + 1, NOTIFICATION_LOWER_TIER_DAYS);
    logger.log(`🌙 Scheduling ${toSchedule} Ramadan daily encouragement notifications (Day ${currentDay})`);

    for (let i = 0; i < toSchedule; i++) {
      const ramadanDay = currentDay + i;
      if (ramadanDay > 30) break;

      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + i);
      scheduledDate.setHours(NOTIFICATION_HOUR, NOTIFICATION_MINUTE, 0, 0);

      if (scheduledDate <= new Date()) {
        if (i === 0) continue;
      }

      // iOS budget check
      if (Platform.OS === 'ios') {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (scheduled.length >= IOS_NOTIFICATION_CAP) {
          logger.log(`🌙🚫 iOS cap reached, stopping Ramadan daily at ${i}/${toSchedule}`);
          break;
        }
      }

      const messageIndex = (ramadanDay - 1) % RAMADAN_MESSAGES.length;
      const message = RAMADAN_MESSAGES[messageIndex];

      await scheduleLocalNotificationAsync({
        content: {
          title: `${message.title} (Day ${ramadanDay})`,
          body: message.body,
          data: { type: 'ramadan-daily', ramadanDay },
        },
        trigger: {
          type: 'date',
          date: scheduledDate,
          ...(Platform.OS === 'android' && {
            channelId: CHANNELS.RAMADAN_COUNTDOWN,
          }),
        } as Notifications.NotificationTriggerInput,
        identifier: `${NOTIFICATION_PREFIX}-day-${ramadanDay}`,
      });
    }

    logger.log(`🌙 Scheduled ${toSchedule} Ramadan daily notifications`);
  }

  /**
   * Cancel all existing Ramadan countdown notifications.
   */
  private async cancelExisting(): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.identifier.startsWith(NOTIFICATION_PREFIX)) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (error) {
      logger.warn('🌙 Failed to cancel existing Ramadan notifications:', error);
    }
  }
}

const RamadanCountdownService = new RamadanCountdownServiceClass();
export default RamadanCountdownService;
