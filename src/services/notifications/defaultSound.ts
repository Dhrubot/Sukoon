import type * as Notifications from 'expo-notifications';

export function normalizeNotificationContentForPlatform<T extends Notifications.NotificationContentInput>(
  content: T
): T {
  return content;
}
