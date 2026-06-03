import type { UserSettings } from '../../types';

type NotificationSettings = UserSettings['notifications'];

export function normalizeNotificationSettings(
  settings: NotificationSettings,
): NotificationSettings {
  if (!settings.enabled) {
    return {
      ...settings,
      adhanEnabled: false,
      fullAdhanEnabled: false,
    };
  }

  if (!settings.adhanEnabled) {
    return {
      ...settings,
      fullAdhanEnabled: false,
    };
  }

  return settings;
}

export function mergeNotificationSettings(
  current: NotificationSettings,
  updates: Partial<NotificationSettings>,
): NotificationSettings {
  return normalizeNotificationSettings({
    ...current,
    ...updates,
  });
}
