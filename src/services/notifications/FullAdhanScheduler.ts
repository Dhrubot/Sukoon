// src/services/notifications/FullAdhanScheduler.ts
// JS wrapper for the native AdhanModule — schedules full Adhan playback
// via Android Foreground Service. No-ops on iOS.

import { Platform, NativeModules } from 'react-native';
import { PrayerName } from '../../types';
import logger from '../../utils/logger';

const { AdhanModule } = NativeModules;

// Request code strategy: base 5000 + (dayOffset * 5) + prayerIndex
// Supports up to 7 days of scheduling (5000..5034)
const REQUEST_CODE_BASE = 5000;

const PRAYER_INDEX: Record<PrayerName, number> = {
  Fajr: 0,
  Dhuhr: 1,
  Asr: 2,
  Maghrib: 3,
  Isha: 4,
};

function getRequestCode(prayerName: PrayerName, dayOffset: number): number {
  return REQUEST_CODE_BASE + (dayOffset * 5) + PRAYER_INDEX[prayerName];
}

function getDayOffset(prayerTime: Date): number {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const prayerDayStart = new Date(
    prayerTime.getFullYear(),
    prayerTime.getMonth(),
    prayerTime.getDate()
  );
  return Math.round(
    (prayerDayStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Schedule a full Adhan alarm for a specific prayer time.
 * On Android, this sets an AlarmManager alarm that triggers a Foreground Service.
 * No-ops on iOS.
 */
export async function scheduleFullAdhan(
  prayerTime: Date,
  prayerName: PrayerName,
  displayName?: string
): Promise<void> {
  if (Platform.OS !== 'android' || !AdhanModule) return;

  try {
    const dayOffset = getDayOffset(prayerTime);
    const requestCode = getRequestCode(prayerName, dayOffset);
    const label = displayName || prayerName;

    await AdhanModule.scheduleAdhan(
      prayerTime.getTime(),
      label,
      requestCode
    );

    logger.log(
      `🔊 Full Adhan scheduled for ${label} at ${prayerTime.toLocaleString()} (rc=${requestCode})`
    );
  } catch (error) {
    logger.error(`❌ Failed to schedule full Adhan for ${prayerName}:`, error);
  }
}

/**
 * Cancel all scheduled full Adhan alarms.
 * Called when notifications are rebuilt or adhan is disabled.
 */
export async function cancelAllFullAdhans(): Promise<void> {
  if (Platform.OS !== 'android' || !AdhanModule) return;

  try {
    await AdhanModule.cancelAllAdhans();
    logger.log('🗑️ All full Adhan alarms cancelled');
  } catch (error) {
    logger.error('❌ Failed to cancel full Adhan alarms:', error);
  }
}

/**
 * Immediately stop any currently playing Adhan foreground service.
 */
export async function stopFullAdhan(): Promise<void> {
  if (Platform.OS !== 'android' || !AdhanModule) return;

  try {
    await AdhanModule.stopAdhan();
    logger.log('⏹️ Full Adhan service stopped');
  } catch (error) {
    logger.error('❌ Failed to stop full Adhan service:', error);
  }
}

/**
 * Cancel a specific prayer's full Adhan alarm.
 */
export async function cancelFullAdhan(
  prayerName: PrayerName,
  prayerTime: Date
): Promise<void> {
  if (Platform.OS !== 'android' || !AdhanModule) return;

  try {
    const dayOffset = getDayOffset(prayerTime);
    const requestCode = getRequestCode(prayerName, dayOffset);
    await AdhanModule.cancelAdhan(requestCode);
    logger.log(`🗑️ Full Adhan cancelled for ${prayerName} (rc=${requestCode})`);
  } catch (error) {
    logger.error(`❌ Failed to cancel full Adhan for ${prayerName}:`, error);
  }
}
