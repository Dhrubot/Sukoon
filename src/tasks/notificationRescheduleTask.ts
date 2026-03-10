import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import NotificationService from '../services/NotificationService';

export const NOTIFICATION_RESCHEDULE_TASK = 'NOTIFICATION_RESCHEDULE_TASK';

TaskManager.defineTask(NOTIFICATION_RESCHEDULE_TASK, async () => {
  try {
    const didReschedule = await NotificationService.maybeRescheduleExtendedNotifications(24, 'background_refresh');

    return didReschedule
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
