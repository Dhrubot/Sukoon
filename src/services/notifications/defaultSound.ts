import type * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export function normalizeNotificationContentForPlatform<T extends Notifications.NotificationContentInput>(
  content: T
): T {
  if (Platform.OS === 'ios' && typeof content.sound === 'undefined') {
    return {
      ...content,
      sound: 'default',
    } as T;
  }

  return content;
}
