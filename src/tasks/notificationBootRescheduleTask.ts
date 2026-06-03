import { AppRegistry, NativeModules } from 'react-native';

import MosqueModeService from '../services/MosqueModeService';
import NotificationService from '../services/NotificationService';
import NotificationTraceService from '../services/NotificationTraceService';
import PrayerTimeService from '../services/PrayerTimeService';
import StorageService from '../services/StorageService';
import logger from '../utils/logger';
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

    // Mosque Mode Phase 2 belt-and-suspenders. The native RingerModeBootReceiver
    // is the critical-path re-arm; this JS pass reconciles MMKV from SharedPreferences
    // and handles the rare edge case where the process is cold-launched after a
    // crash but before reboot, leaving SP state populated and MMKV empty.
    try {
      await MosqueModeService.rearmFromPersistence();
    } catch (mosqueErr) {
      logger.warn('[BootTask] MosqueMode rearmFromPersistence failed:', mosqueErr);
    }

    // Report honest counts so partial-success at boot is observable. A
    // didReschedule=true with prayerScheduledCount<<expected indicates the
    // disk-only fetch chain fell back to last-known-good for some days — the
    // alarms exist but may drift by a few minutes until the next foreground
    // refresh corrects them. didReschedule=true with count=0 is a real failure.
    const summary = NotificationService.getLastScheduleSummary();
    NotificationTraceService.log('headless_boot_reschedule_completed', {
      didReschedule,
      prayerScheduledCount: summary?.scheduledCount ?? 0,
      totalScheduledCount: summary?.totalScheduledCount ?? 0,
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
