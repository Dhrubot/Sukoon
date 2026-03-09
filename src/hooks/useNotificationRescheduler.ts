// src/hooks/useNotificationRescheduler.ts
import { useEffect } from 'react';
import { InteractionManager, NativeModules, Platform } from 'react-native';
import { useAppStateChange } from './useAppStateChange';
import NotificationService from '../services/NotificationService';
import StorageService from '../services/StorageService';
import LocationService from '../services/LocationService';
import { useStore } from '../store/useStore';
import logger from '../utils/logger';

export const useNotificationRescheduler = () => {
  // Check on mount (deferred to avoid blocking UI)
  useEffect(() => {
    InteractionManager.runAfterInteractions(async () => {
      // Android: check if device rebooted since last launch (boot receiver sets flag)
      if (Platform.OS === 'android') {
        try {
          const needsReschedule = await NativeModules.BootPrefsModule?.getAndClearBootRescheduleFlag();
          if (needsReschedule) {
            logger.log('🔄 Boot reschedule flag detected — forcing full reschedule');
            StorageService.deleteValue('last_batch_schedule_date');
          }
        } catch (e) {
          // Module may not exist on older builds — fall through to normal check
          logger.warn('⚠️ BootPrefsModule unavailable:', e);
        }
      }
      checkAndReschedule();
    });
  }, []);

  // Check on resume via shared AppState listener
  useAppStateChange((nextState) => {
    if (nextState === 'active') {
      InteractionManager.runAfterInteractions(() => {
        checkAndReschedule();
      });
    }
  });

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

        // Timezone changed — likely international travel. Refresh device location
        // so prayer times are recalculated for the new region.
        try {
          const freshLocation = await LocationService.getCurrentLocation();
          if (freshLocation) {
            const { setLocation, updateUserSettings } = useStore.getState();
            setLocation(freshLocation);
            updateUserSettings({ location: freshLocation });
            logger.log('📍 Location refreshed after timezone change');
          }
        } catch (locErr) {
          logger.warn('⚠️ Failed to refresh location after timezone change:', locErr);
          // Continue with reschedule using existing location
        }
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