import * as Notifications from 'expo-notifications';
import { normalizeNotificationContentForPlatform } from './defaultSound';

export async function scheduleLocalNotificationAsync(
  request: Notifications.NotificationRequestInput
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    ...request,
    content: normalizeNotificationContentForPlatform(request.content),
  });
}
