import { AppRegistry, NativeModules } from 'react-native';

import NotificationService from '../services/NotificationService';
import NotificationTraceService from '../services/NotificationTraceService';
import PrayerTimeService from '../services/PrayerTimeService';
import StorageService from '../services/StorageService';
import { initializeEncryptionKey } from '../utils/secureKeyManager';

export const BOOT_NOTIFICATION_RESCHEDULE_TASK = 'BOOT_NOTIFICATION_RESCHEDULE_TASK';

export async function runBootNotificationRescheduleTask(): Promise<void> {
  try {
    NotificationTraceService.log('headless_boot_reschedule_started');
    await initializeEncryptionKey();
    await StorageService.initialize();

    NotificationService.setPrayerTimesFetcher(async ({ location, date, calculationMethod, adjustments, asrJuristic }) =>
      PrayerTimeService.getPrayerTimesList(
        location,
        date,
        calculationMethod,
        adjustments,
        asrJuristic || 'Standard'
      )
    );

    const didReschedule = await NotificationService.reconcileScheduling('boot', { force: true, diskOnly: true });
    if (didReschedule) {
      await NativeModules.BootPrefsModule?.clearBootRescheduleFlag?.();
    }

    NotificationTraceService.log('headless_boot_reschedule_completed', {
      didReschedule,
    });
  } catch (error) {
    NotificationTraceService.log('headless_boot_reschedule_failed');
    throw error;
  }
}

AppRegistry.registerHeadlessTask(
  BOOT_NOTIFICATION_RESCHEDULE_TASK,
  () => runBootNotificationRescheduleTask
);
