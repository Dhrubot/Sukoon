import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import NotificationService from '../services/NotificationService';

export const NOTIFICATION_RESCHEDULE_TASK = 'NOTIFICATION_RESCHEDULE_TASK';

TaskManager.defineTask(NOTIFICATION_RESCHEDULE_TASK, async () => {
  try {
    const didReschedule = await NotificationService.maybeRescheduleExtendedNotifications(24);

    return didReschedule
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
