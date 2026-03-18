import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import NotificationService from '../services/NotificationService';
import NotificationTraceService from '../services/NotificationTraceService';

export const NOTIFICATION_RESCHEDULE_TASK = 'NOTIFICATION_RESCHEDULE_TASK';

TaskManager.defineTask(NOTIFICATION_RESCHEDULE_TASK, async () => {
  try {
    NotificationTraceService.log('background_task_started', {
      task: NOTIFICATION_RESCHEDULE_TASK,
    });
    const didReschedule = await NotificationService.maybeRescheduleExtendedNotifications(24, 'background_refresh');
    NotificationTraceService.log('background_task_completed', {
      task: NOTIFICATION_RESCHEDULE_TASK,
      didReschedule,
    });

    return didReschedule
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    NotificationTraceService.log('background_task_failed', {
      task: NOTIFICATION_RESCHEDULE_TASK,
    });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
