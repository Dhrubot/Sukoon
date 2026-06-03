// src/services/notifications/FullAdhanScheduler.ts
// JS wrapper for the native AdhanModule — schedules full Adhan playback
// via Android Foreground Service. No-ops on iOS.

import { Platform, NativeModules } from 'react-native';
import { PrayerName } from '../../types';
import { AdhanClip } from './AdhanPlaybackPolicy';
import logger from '../../utils/logger';

/** Maps the user-facing clip choice to the native res/raw resource name. */
const ADHAN_CLIP_RESOURCE: Record<AdhanClip, string> = {
  short: 'adhan_short',
  full: 'adhan_full',
};

function getAdhanModule() {
  return NativeModules.AdhanModule ?? null;
}

export type ExactAlarmStatus =
  | 'granted'
  | 'fallback'
  | 'unsupported'
  | 'unavailable'
  | 'unknown';

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
 * Schedule a native Adhan audio alarm for a specific prayer time.
 * On Android, this sets an AlarmManager alarm that triggers a Foreground Service
 * which plays the requested clip via USAGE_ALARM (bypasses silent mode / DND).
 * No-ops on iOS.
 *
 * @param clip Which clip to play ('short' or 'full'). Defaults to 'full'.
 */
export async function scheduleAdhanAudio(
  prayerTime: Date,
  prayerName: PrayerName,
  clip: AdhanClip = 'full',
  displayName?: string
): Promise<void> {
  const adhanModule = getAdhanModule();
  if (Platform.OS !== 'android' || !adhanModule) return;

  try {
    const dayOffset = getDayOffset(prayerTime);
    const requestCode = getRequestCode(prayerName, dayOffset);
    const label = displayName || prayerName;
    const soundResource = ADHAN_CLIP_RESOURCE[clip];

    await adhanModule.scheduleAdhan(
      prayerTime.getTime(),
      label,
      requestCode,
      soundResource
    );

    logger.log(
      `🔊 Adhan (${clip}) scheduled for ${label} at ${prayerTime.toLocaleString()} (rc=${requestCode})`
    );
  } catch (error) {
    logger.error(`❌ Failed to schedule Adhan audio for ${prayerName}:`, error);
  }
}

/**
 * Cancel all scheduled full Adhan alarms.
 * Called when notifications are rebuilt or adhan is disabled.
 */
export async function cancelAllFullAdhans(): Promise<void> {
  const adhanModule = getAdhanModule();
  if (Platform.OS !== 'android' || !adhanModule) return;

  try {
    await adhanModule.cancelAllAdhans();
    logger.log('🗑️ All full Adhan alarms cancelled');
  } catch (error) {
    logger.error('❌ Failed to cancel full Adhan alarms:', error);
  }
}

/**
 * Immediately stop any currently playing Adhan foreground service.
 */
export async function stopFullAdhan(): Promise<void> {
  const adhanModule = getAdhanModule();
  if (Platform.OS !== 'android' || !adhanModule) return;

  try {
    await adhanModule.stopAdhan();
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
  const adhanModule = getAdhanModule();
  if (Platform.OS !== 'android' || !adhanModule) return;

  try {
    const dayOffset = getDayOffset(prayerTime);
    const requestCode = getRequestCode(prayerName, dayOffset);
    await adhanModule.cancelAdhan(requestCode);
    logger.log(`🗑️ Full Adhan cancelled for ${prayerName} (rc=${requestCode})`);
  } catch (error) {
    logger.error(`❌ Failed to cancel full Adhan for ${prayerName}:`, error);
  }
}

export async function getExactAlarmStatus(): Promise<ExactAlarmStatus> {
  const adhanModule = getAdhanModule();
  if (Platform.OS !== 'android') return 'unsupported';
  if (!adhanModule?.getExactAlarmStatus) return 'unavailable';

  try {
    const status = await adhanModule.getExactAlarmStatus();
    if (
      status === 'granted' ||
      status === 'fallback' ||
      status === 'unsupported' ||
      status === 'unavailable'
    ) {
      return status;
    }
    return 'unknown';
  } catch (error) {
    logger.error('❌ Failed to read exact alarm status:', error);
    return 'unknown';
  }
}

export async function openExactAlarmSettings(): Promise<boolean> {
  const adhanModule = getAdhanModule();
  if (Platform.OS !== 'android') return false;
  if (!adhanModule?.openExactAlarmSettings) return false;

  try {
    const opened = await adhanModule.openExactAlarmSettings();
    return Boolean(opened);
  } catch (error) {
    logger.error('❌ Failed to open exact alarm settings:', error);
    return false;
  }
}
