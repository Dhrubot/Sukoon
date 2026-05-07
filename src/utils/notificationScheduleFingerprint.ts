import { PrayerTime, UserSettings } from '../types';
import { NOTIFICATION_CHANNEL_VERSION } from '../constants/NotificationConstants';

const roundCoord = (n: number) => Math.round(n * 10000) / 10000;

export function buildNotificationLocationFingerprint(
  location: UserSettings['location'] | null | undefined
): string | null {
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return null;
  }

  return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
}

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
