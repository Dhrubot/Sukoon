// src/hooks/useNotificationRescheduler.ts
import { useEffect } from 'react';
import { AppState, InteractionManager } from 'react-native';
import NotificationService from '../services/NotificationService';
import StorageService from '../services/StorageService';
import logger from '../utils/logger';

export const useNotificationRescheduler = () => {
  useEffect(() => {
    // Check on mount (deferred to avoid blocking UI)
    InteractionManager.runAfterInteractions(() => {
      checkAndReschedule();
    });

    // Check on resume
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        InteractionManager.runAfterInteractions(() => {
          checkAndReschedule();
        });
      }
    });

    return () => subscription.remove();
  }, []);

  const checkAndReschedule = async () => {
    try {
      // ── DST offset detection ──────────────────────────────────
      // If the UTC offset changed since last schedule (DST transition),
      // all scheduled times are wrong → force a full reschedule.
      const currentOffset = new Date().getTimezoneOffset();
      const savedOffset = StorageService.getValue('notification_utc_offset');

      if (savedOffset !== null && parseInt(savedOffset, 10) !== currentOffset) {
        logger.warn(`⏰ UTC offset changed (${savedOffset} → ${currentOffset}), forcing reschedule`);
        // Clear last run so maybeReschedule always fires
        StorageService.deleteValue('last_batch_schedule_date');
      }

      // Detect stale notification state (>48h without refresh)
      const lastRunStr = StorageService.getValue('last_batch_schedule_date');
      if (lastRunStr) {
        const hoursSinceLastRun = (Date.now() - new Date(lastRunStr).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRun > 48) {
          logger.warn('⚠️ Notification refresh was stale (>48h)');
          StorageService.setValue('notification_refresh_stale', 'true');
        }
      }

      const rescheduled = await NotificationService.maybeRescheduleExtendedNotifications();

      // Persist current offset after successful schedule
      if (rescheduled || savedOffset === null) {
        StorageService.setValue('notification_utc_offset', currentOffset.toString());
      }
    } catch (error) {
      logger.error('❌ Reschedule failed:', error);
    }
  };
};