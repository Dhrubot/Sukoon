import { UserSettings } from '../types';

const INVALID_NOTIFICATION_NAMES = new Set([
  'default friend',
  'your name',
]);

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function getNotificationPersonalizationName(
  settings?: Pick<UserSettings, 'name'> | null
): string | null {
  if (!settings?.name || typeof settings.name !== 'string') {
    return null;
  }

  const normalizedName = normalizeName(settings.name);
  if (!normalizedName) {
    return null;
  }

  if (INVALID_NOTIFICATION_NAMES.has(normalizedName.toLowerCase())) {
    return null;
  }

  return normalizedName;
}

export function prependNotificationName(
  message: string,
  settings?: Pick<UserSettings, 'name'> | null
): string {
  const name = getNotificationPersonalizationName(settings);
  return name ? `${name}, ${message}` : message;
}
