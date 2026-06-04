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

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function prependNotificationName(
  message: string,
  settings?: Pick<UserSettings, 'name'> | null,
  seed?: string,
): string {
  const name = getNotificationPersonalizationName(settings);
  if (!name) {
    return message;
  }
  if (seed === undefined) {
    return `${name}, ${message}`;
  }
  return simpleHash(seed) % 2 === 0 ? `${name}, ${message}` : message;
}
