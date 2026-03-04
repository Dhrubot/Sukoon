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
      // Detect stale notification state (>48h without refresh)
      const lastRunStr = StorageService.getValue('last_batch_schedule_date');
      if (lastRunStr) {
        const hoursSinceLastRun = (Date.now() - new Date(lastRunStr).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRun > 48) {
          logger.warn('⚠️ Notification refresh was stale (>48h)');
          StorageService.setValue('notification_refresh_stale', 'true');
        }
      }

      await NotificationService.maybeRescheduleExtendedNotifications();
    } catch (error) {
      logger.error('❌ Reschedule failed:', error);
    }
  };
};