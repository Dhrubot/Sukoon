// src/hooks/useNotificationRescheduler.ts
import { useEffect, useRef } from 'react';
import { InteractionManager, NativeModules, Platform } from 'react-native';
import { useAppStateChange } from './useAppStateChange';
import NotificationService from '../services/NotificationService';
import StorageService from '../services/StorageService';
import LocationService from '../services/LocationService';
import { useStore } from '../store/useStore';
import logger from '../utils/logger';

let lastObservedWallClockMs: number | null = null;
let lastObservedMonotonicMs: number | null = null;

export const useNotificationRescheduler = () => {
  const userSettings = useStore((state) => state.userSettings);
  const initialCheckStartedRef = useRef(false);
  const hasReadySettings = StorageService.isInitialized() && !!userSettings;

  // Check once after app initialization has hydrated storage and settings.
  useEffect(() => {
    if (!hasReadySettings || initialCheckStartedRef.current) return;
    initialCheckStartedRef.current = true;

    InteractionManager.runAfterInteractions(async () => {
      // Android: check if device rebooted since last launch (boot receiver sets flag)
      if (Platform.OS === 'android') {
        try {
          const needsReschedule = await NativeModules.BootPrefsModule?.getAndClearBootRescheduleFlag();
          if (needsReschedule) {
            logger.log('🔄 Boot reschedule flag detected — forcing full reschedule');
            StorageService.deleteValue('last_batch_schedule_date');
            await NotificationService.reconcileScheduling('boot', { force: true });
            return;
          }
        } catch (e) {
          // Module may not exist on older builds — fall through to normal check
          logger.warn('⚠️ BootPrefsModule unavailable:', e);
        }
      }
      await checkAndReschedule();
    });
  }, [hasReadySettings]);

  // Check on resume via shared AppState listener
  useAppStateChange((nextState) => {
    if (nextState === 'active') {
      InteractionManager.runAfterInteractions(() => {
        void checkAndReschedule();
      });
    }
  });

  const checkAndReschedule = async () => {
    try {
      if (!StorageService.isInitialized()) {
        logger.log('⏳ Skipping notification reschedule — storage not initialized');
        return;
      }

      const currentUserSettings = useStore.getState().userSettings;
      if (!currentUserSettings) {
        logger.log('⏳ Skipping notification reschedule — user settings not ready');
        return;
      }

      let invalidateReason: 'timezone_change' | 'location_change' | 'clock_change' | null = null;

      // ── DST offset detection ──────────────────────────────────
      // If the UTC offset changed since last schedule (DST transition),
      // all scheduled times are wrong → force a full reschedule.
      const currentOffset = new Date().getTimezoneOffset();
      const savedOffset = StorageService.getValue('notification_utc_offset');

      if (savedOffset !== null && parseInt(savedOffset, 10) !== currentOffset) {
        logger.warn(`⏰ UTC offset changed (${savedOffset} → ${currentOffset}), forcing reschedule`);
        invalidateReason = 'timezone_change';

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

      const currentLocation = currentUserSettings.location;
      const savedLocationFingerprint = StorageService.getValue('notification_location_fingerprint');
      const currentLocationFingerprint = currentLocation
        ? `${currentLocation.latitude.toFixed(3)},${currentLocation.longitude.toFixed(3)}`
        : null;
      if (
        currentLocationFingerprint &&
        savedLocationFingerprint &&
        savedLocationFingerprint !== currentLocationFingerprint
      ) {
        logger.warn(`📍 Material location change detected (${savedLocationFingerprint} → ${currentLocationFingerprint})`);
        invalidateReason = 'location_change';
      }

      const now = Date.now();
      const monotonicNow = globalThis.performance?.now?.() ?? null;
      if (lastObservedWallClockMs !== null && lastObservedMonotonicMs !== null && monotonicNow !== null) {
        const expectedNow = lastObservedWallClockMs + (monotonicNow - lastObservedMonotonicMs);
        const clockDriftMs = Math.abs(now - expectedNow);
        if (clockDriftMs > 30 * 60 * 1000) {
          logger.warn(`🕰️ Device clock jump detected (${Math.round(clockDriftMs / 60000)} min)`);
          invalidateReason = invalidateReason || 'clock_change';
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

      let rescheduled = false;
      if (invalidateReason) {
        rescheduled = await NotificationService.reconcileScheduling(invalidateReason, { force: true });
      } else {
        rescheduled = await NotificationService.maybeRescheduleExtendedNotifications();
      }

      if (currentLocationFingerprint) {
        StorageService.setValue('notification_location_fingerprint', currentLocationFingerprint);
      }
      lastObservedWallClockMs = now;
      lastObservedMonotonicMs = monotonicNow;

      // Persist current offset after successful schedule
      if (rescheduled || savedOffset === null) {
        StorageService.setValue('notification_utc_offset', currentOffset.toString());
      }
    } catch (error) {
      logger.error('❌ Reschedule failed:', error);
    }
  };
};
