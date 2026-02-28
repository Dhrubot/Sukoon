// src/services/EidNotificationService.ts
// Schedules Eid eve/morning notifications and Takbirat reminders
// during Ayyam al-Tashreeq (9–13 Dhul Hijjah).

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CHANNELS } from '../constants/NotificationConstants';
import {
  getCachedHijriDate,
  isRamadan,
  getRamadanDay,
  isTashreeqDays,
} from '../utils/ramadan';
import StorageService from './StorageService';
import logger from '../utils/logger';
import { getLocalDateKey } from '../utils/dateHelpers';

const NOTIFICATION_PREFIX = 'eid';
const STORAGE_KEY_LAST_SCHEDULED = 'eid_notif_last_scheduled';

// ── Eid al-Fitr messages ──────────────────────────────────────────
const EID_AL_FITR_EVE = {
  title: 'Eid al-Fitr Tomorrow!',
  body: 'Taqabbal Allahu minna wa minkum. Don\'t forget Zakat al-Fitr before Eid prayer. May Allah accept your Ramadan.',
};

const EID_AL_FITR_MORNING = {
  title: 'Eid Mubarak!',
  body: 'Eid al-Fitr Mubarak! "Say: In the bounty of Allah and His mercy — in that let them rejoice." (10:58)',
};

// ── Eid al-Adha messages ─────────────────────────────────────────
const EID_AL_ADHA_EVE = {
  title: 'Eid al-Adha Tomorrow!',
  body: 'The Day of Sacrifice approaches. Increase your Takbirat: Allahu Akbar, Allahu Akbar, La ilaha illallah.',
};

const EID_AL_ADHA_MORNING = {
  title: 'Eid Mubarak!',
  body: 'Eid al-Adha Mubarak! "It is not their meat nor blood that reaches Allah; it is your piety." (22:37)',
};

// ── Takbirat reminders (9–13 Dhul Hijjah) ────────────────────────
const TAKBIRAT_MESSAGES: Record<number, { title: string; body: string }> = {
  9: {
    title: 'Day of Arafah',
    body: 'The best day the sun has risen upon. Fast today and recite Takbirat after every prayer: Allahu Akbar, Allahu Akbar, La ilaha illallah.',
  },
  10: {
    title: 'Eid al-Adha — Takbirat',
    body: 'Continue reciting Takbirat al-Tashreeq after every fard prayer. Allahu Akbar, Allahu Akbar, La ilaha illallahu wallahu Akbar.',
  },
  11: {
    title: 'Ayyam al-Tashreeq — Day 1',
    body: 'Remember your Takbirat after every fard prayer. "Remember Allah during the appointed days." (2:203)',
  },
  12: {
    title: 'Ayyam al-Tashreeq — Day 2',
    body: 'Keep the Takbirat going after each prayer. These are days of eating, drinking, and remembrance of Allah.',
  },
  13: {
    title: 'Ayyam al-Tashreeq — Day 3',
    body: 'Last day of Takbirat al-Tashreeq (until Asr). May Allah accept your worship during these blessed days.',
  },
};

class EidNotificationServiceClass {

  /**
   * Main entry point — call on app start from useServiceInitialization.
   */
  async scheduleEidNotifications(): Promise<void> {
    try {
      const hijri = getCachedHijriDate();
      if (!hijri) {
        logger.log('🎉 No Hijri date cached — skipping Eid notifications');
        return;
      }

      const today = getLocalDateKey();
      const lastScheduled = StorageService.getValue(STORAGE_KEY_LAST_SCHEDULED);
      if (lastScheduled === today) {
        return; // Already scheduled today
      }

      await this.cancelExisting();

      // Eid al-Fitr: schedule during last days of Ramadan
      if (isRamadan()) {
        const day = getRamadanDay();
        if (day && day >= 28) {
          await this.scheduleEidAlFitrNotifications(day);
        }
      }

      // Eid al-Adha / Takbirat: schedule during Dhul Hijjah
      if (hijri.month === 12) {
        // Schedule eve notification if day 8 or 9
        if (hijri.day >= 8 && hijri.day <= 9) {
          await this.scheduleEidAlAdhaNotifications(hijri.day);
        }
        // Schedule Takbirat reminders for Ayyam al-Tashreeq
        if (hijri.day >= 9 && hijri.day <= 13) {
          await this.scheduleTakbiratReminders(hijri.day);
        }
      }

      StorageService.setValue(STORAGE_KEY_LAST_SCHEDULED, today);
    } catch (error) {
      logger.error('🎉 Failed to schedule Eid notifications:', error);
    }
  }

  private async scheduleEidAlFitrNotifications(ramadanDay: number): Promise<void> {
    const daysUntilEid = 30 - ramadanDay; // Approximate: Ramadan is 29 or 30 days

    // Eve notification (night before Eid)
    if (daysUntilEid <= 1) {
      const eveDate = new Date();
      eveDate.setHours(20, 0, 0, 0); // 8 PM
      if (eveDate > new Date()) {
        await this.schedule(`${NOTIFICATION_PREFIX}-fitr-eve`, EID_AL_FITR_EVE, eveDate);
      }
    }

    // Morning notification
    if (daysUntilEid === 0) {
      const morningDate = new Date();
      morningDate.setDate(morningDate.getDate() + 1);
      morningDate.setHours(6, 30, 0, 0); // 6:30 AM
      await this.schedule(`${NOTIFICATION_PREFIX}-fitr-morning`, EID_AL_FITR_MORNING, morningDate);
    } else if (daysUntilEid === 1) {
      // Tomorrow is likely the last day, schedule morning for day after
      const morningDate = new Date();
      morningDate.setDate(morningDate.getDate() + 2);
      morningDate.setHours(6, 30, 0, 0);
      await this.schedule(`${NOTIFICATION_PREFIX}-fitr-morning`, EID_AL_FITR_MORNING, morningDate);
    }

    logger.log(`🎉 Scheduled Eid al-Fitr notifications (Ramadan day ${ramadanDay})`);
  }

  private async scheduleEidAlAdhaNotifications(dhulHijjahDay: number): Promise<void> {
    if (dhulHijjahDay <= 9) {
      // Eve notification
      const daysUntilEid = 10 - dhulHijjahDay;
      const eveDate = new Date();
      eveDate.setDate(eveDate.getDate() + daysUntilEid - 1);
      eveDate.setHours(20, 0, 0, 0);
      if (eveDate > new Date()) {
        await this.schedule(`${NOTIFICATION_PREFIX}-adha-eve`, EID_AL_ADHA_EVE, eveDate);
      }

      // Morning notification
      const morningDate = new Date();
      morningDate.setDate(morningDate.getDate() + daysUntilEid);
      morningDate.setHours(6, 30, 0, 0);
      await this.schedule(`${NOTIFICATION_PREFIX}-adha-morning`, EID_AL_ADHA_MORNING, morningDate);
    }

    logger.log(`🎉 Scheduled Eid al-Adha notifications (Dhul Hijjah day ${dhulHijjahDay})`);
  }

  private async scheduleTakbiratReminders(currentDay: number): Promise<void> {
    // Schedule reminders for remaining Tashreeq days
    for (let day = currentDay; day <= 13; day++) {
      const message = TAKBIRAT_MESSAGES[day];
      if (!message) continue;

      const daysAhead = day - currentDay;
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + daysAhead);
      scheduleDate.setHours(5, 30, 0, 0); // 5:30 AM — before Fajr

      if (scheduleDate <= new Date() && daysAhead === 0) {
        // Today but past notification time — try afternoon
        scheduleDate.setHours(13, 0, 0, 0);
        if (scheduleDate <= new Date()) continue;
      }

      await this.schedule(`${NOTIFICATION_PREFIX}-takbir-${day}`, message, scheduleDate);
    }

    logger.log(`🎉 Scheduled Takbirat reminders from day ${currentDay}`);
  }

  private async schedule(
    identifier: string,
    content: { title: string; body: string },
    date: Date,
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: { type: 'eid' },
        sound: 'default',
      },
      trigger: {
        type: 'date',
        date,
        ...(Platform.OS === 'android' && {
          channelId: CHANNELS.RAMADAN_COUNTDOWN,
        }),
      } as Notifications.NotificationTriggerInput,
      identifier,
    });
  }

  private async cancelExisting(): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.identifier.startsWith(NOTIFICATION_PREFIX)) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (error) {
      logger.warn('🎉 Failed to cancel existing Eid notifications:', error);
    }
  }
}

const EidNotificationService = new EidNotificationServiceClass();
export default EidNotificationService;
