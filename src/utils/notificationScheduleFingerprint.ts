import { PrayerTime, UserSettings } from '../types';
import { NOTIFICATION_CHANNEL_VERSION } from '../constants/NotificationConstants';
import { getCachedHijriDate } from './ramadan';

const roundCoord = (n: number) => Math.round(n * 10000) / 10000;

export function buildNotificationLocationFingerprint(
  location: UserSettings['location'] | null | undefined
): string | null {
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return null;
  }

  return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
}

// ── Storage key constants ──────────────────────────────────────────────────────
/** MMKV key for the v1 fingerprint (kept for backward-compat reads during migration). */
export const FINGERPRINT_V1_KEY = 'notification_schedule_fingerprint';

/** MMKV key for the v2 fingerprint (primary). */
export const FINGERPRINT_V2_KEY = 'notification_schedule_fingerprint_v2';

// ── V1 (deprecated — backward-compat reads only) ──────────────────────────────
/**
 * @deprecated Use buildNotificationScheduleFingerprintV2 for new scheduling.
 * Retained so that code reading the old v1 key can compare against a known
 * value during the one-time migration window.
 */
export function buildNotificationScheduleFingerprint(
  settings: UserSettings,
  prayerTimes: PrayerTime[] = []
): string {
  return JSON.stringify({
    location: settings.location
      ? {
          latitude: roundCoord(settings.location.latitude),
          longitude: roundCoord(settings.location.longitude),
          timezone: settings.location.timezone ?? null,
        }
      : null,
    calculationMethod: settings.calculationMethod,
    calculationMethodManuallySelected: Boolean(settings.calculationMethodManuallySelected),
    asrJuristic: settings.asrJuristic,
    adjustments: settings.adjustments,
    notifications: settings.notifications,
    prayerNotifications: settings.prayerNotifications,
    habitBuilder: settings.habitBuilder,
    tahajjudReminders: settings.tahajjudReminders ?? null,
    jummahReminders: settings.jummahReminders ?? null,
    channelVersion: NOTIFICATION_CHANNEL_VERSION,
    timezoneOffset: new Date().getTimezoneOffset(),
    prayerTimes: prayerTimes.map((prayer) => ({
      name: prayer.name,
      timestamp: prayer.time.getTime(),
    })),
  });
}

// ── V2 (primary — used by NotificationService after Phase 1 migration) ────────

/**
 * Build a scheduling fingerprint that is stable against:
 *  - Sub-minute prayer time noise (DST re-parse, NTP micro-correction)
 *  - Timezone offset capture-time drift (removed from hash)
 *
 * Invalidates correctly on:
 *  - Settings change (notifications, location, calculation method, etc.)
 *  - Prayer times shifting by ≥ 1 minute
 *  - Hijri date change (seasonal services: Jummah/Ramadan/Eid)
 *  - Notification channel version bump
 *
 * @param settings     Full user settings at the time of scheduling.
 * @param prayerTimes  Flat array of all PrayerTime objects across all scheduled days.
 * @param hijriDate    Hijri date (from getCachedHijriDate) or null if unavailable.
 */
export function buildNotificationScheduleFingerprintV2(
  settings: UserSettings,
  prayerTimes: PrayerTime[] = [],
  hijriDate?: { year: number; month: number; day: number } | null
): string {
  // Resolve hijriDate: accept explicit override or fall back to cached value
  const resolvedHijri = hijriDate !== undefined
    ? hijriDate
    : getCachedHijriDate();

  return JSON.stringify({
    location: settings.location
      ? {
          lat: settings.location.latitude.toFixed(3),
          lon: settings.location.longitude.toFixed(3),
          tz: settings.location.timezone ?? null,
        }
      : null,
    calculationMethod: settings.calculationMethod,
    calculationMethodManuallySelected: Boolean(settings.calculationMethodManuallySelected),
    asrJuristic: settings.asrJuristic,
    adjustments: settings.adjustments,
    notifications: settings.notifications,
    prayerNotifications: settings.prayerNotifications,
    habitBuilder: settings.habitBuilder,
    tahajjudReminders: settings.tahajjudReminders ?? null,
    jummahReminders: settings.jummahReminders ?? null,
    channelVersion: NOTIFICATION_CHANNEL_VERSION,
    // timezoneOffset intentionally EXCLUDED — captured at reschedule success instead.
    hijriDate: resolvedHijri
      ? {
          year: resolvedHijri.year,
          month: resolvedHijri.month,
          day: resolvedHijri.day,
        }
      : null,
    prayerTimes: prayerTimes.map((prayer) => ({
      name: prayer.name,
      // Minute-rounded timestamp: eliminates sub-minute noise (ms → minutes since epoch)
      minutesSinceEpoch: Math.floor(prayer.time.getTime() / 60000),
    })),
  });
}
