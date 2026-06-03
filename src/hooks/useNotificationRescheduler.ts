// src/hooks/useNotificationRescheduler.ts
import { useEffect, useRef } from 'react';
import { InteractionManager, NativeModules, Platform } from 'react-native';
import { useAppStateChange } from './useAppStateChange';
import NotificationService from '../services/NotificationService';
import NotificationTraceService from '../services/NotificationTraceService';
import StorageService from '../services/StorageService';
import LocationService from '../services/LocationService';
import { useStore } from '../store/useStore';
import logger from '../utils/logger';
import { buildNotificationLocationFingerprint } from '../utils/notificationScheduleFingerprint';
import { DST_RETRY_BACKOFF_MS } from '../constants/NotificationConstants';

const DST_LAST_ATTEMPT_KEY = 'last_dst_reschedule_attempted_at';

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
    NotificationTraceService.log('rescheduler_initial_check_started');

    InteractionManager.runAfterInteractions(async () => {
      // Android: check if device rebooted since last launch (boot receiver sets flag)
      if (Platform.OS === 'android') {
        try {
          const needsReschedule = await NativeModules.BootPrefsModule?.getAndClearBootRescheduleFlag();
          if (needsReschedule) {
            logger.log('🔄 Boot reschedule flag detected — forcing full reschedule');
            NotificationTraceService.log('rescheduler_boot_flag_detected');
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
      NotificationTraceService.log('rescheduler_app_state_active');
      InteractionManager.runAfterInteractions(() => {
        void checkAndReschedule();
      });
    }
  });

  const checkAndReschedule = async () => {
    try {
      // Always backfill the ledger first — cheap, single bridge call. This
      // surfaces delivery for past-due notifications that fired while the app
      // was backgrounded, independently of whether a full reschedule is
      // needed. Runs on both initial check and AppState-active events.
      void NotificationService.reconcileLedger();

      NotificationTraceService.log('rescheduler_check_started');
      if (!StorageService.isInitialized()) {
        logger.log('⏳ Skipping notification reschedule — storage not initialized');
        NotificationTraceService.log('rescheduler_check_skipped', {
          skipReason: 'storage_not_initialized',
        });
        return;
      }

      const currentUserSettings = useStore.getState().userSettings;
      if (!currentUserSettings) {
        logger.log('⏳ Skipping notification reschedule — user settings not ready');
        NotificationTraceService.log('rescheduler_check_skipped', {
          skipReason: 'user_settings_not_ready',
        });
        return;
      }

      let invalidateReason: 'timezone_change' | 'location_change' | 'clock_change' | null = null;
      let currentLocation = currentUserSettings.location;

      // ── DST offset detection ──────────────────────────────────
      // If the UTC offset changed since last schedule (DST transition),
      // all scheduled times are wrong → force a full reschedule.
      const currentOffset = new Date().getTimezoneOffset();
      const savedOffset = StorageService.getValue('notification_utc_offset');

      if (savedOffset !== null && parseInt(savedOffset, 10) !== currentOffset) {
        logger.warn(`⏰ UTC offset changed (${savedOffset} → ${currentOffset}), forcing reschedule`);
        invalidateReason = 'timezone_change';
        NotificationTraceService.log('rescheduler_invalidation_detected', {
          reason: 'timezone_change',
          previousOffset: parseInt(savedOffset, 10),
          currentOffset,
        });

        // DST back-off: if a previous DST reschedule attempt failed within the
        // last DST_RETRY_BACKOFF_MS, skip to prevent a storm of retries when the
        // network is unavailable (e.g., during international travel).
        const lastAttemptStr = StorageService.getValue(DST_LAST_ATTEMPT_KEY);
        if (lastAttemptStr) {
          const msSinceAttempt = Date.now() - parseInt(lastAttemptStr, 10);
          if (msSinceAttempt < DST_RETRY_BACKOFF_MS) {
            logger.log(`⏳ DST reschedule back-off — ${Math.round(msSinceAttempt / 1000)}s since last attempt (back-off: ${DST_RETRY_BACKOFF_MS / 1000}s)`);
            NotificationTraceService.log('rescheduler_dst_backoff_skipped', {
              msSinceAttempt,
              backoffMs: DST_RETRY_BACKOFF_MS,
            });
            // Do not update lastObservedWallClockMs here; we want the next active
            // check to still detect the timezone mismatch and retry after back-off.
            return;
          }
        }

        // Record the attempt timestamp BEFORE trying (so failures are also throttled)
        StorageService.setValue(DST_LAST_ATTEMPT_KEY, Date.now().toString());

        // Timezone changed — likely international travel. Refresh device location
        // so prayer times are recalculated for the new region.
        try {
          const freshLocation = await LocationService.getCurrentLocation();
          if (freshLocation) {
            const { setLocation, updateUserSettings } = useStore.getState();
            setLocation(freshLocation);
            updateUserSettings({ location: freshLocation });
            currentLocation = freshLocation;
            logger.log('📍 Location refreshed after timezone change');
          }
        } catch (locErr) {
          logger.warn('⚠️ Failed to refresh location after timezone change:', locErr);
          // Continue with reschedule using existing location
        }
      }

      const savedLocationFingerprint = StorageService.getValue('notification_location_fingerprint');
      const currentLocationFingerprint = buildNotificationLocationFingerprint(currentLocation);
      if (
        currentLocationFingerprint &&
        savedLocationFingerprint &&
        savedLocationFingerprint !== currentLocationFingerprint
      ) {
        logger.warn(`📍 Material location change detected (${savedLocationFingerprint} → ${currentLocationFingerprint})`);
        invalidateReason = 'location_change';
        NotificationTraceService.log('rescheduler_invalidation_detected', {
          reason: 'location_change',
          previousLocationFingerprint: savedLocationFingerprint,
          currentLocationFingerprint,
        });
      }

      const now = Date.now();
      const monotonicNow = globalThis.performance?.now?.() ?? null;
      if (lastObservedWallClockMs !== null && lastObservedMonotonicMs !== null && monotonicNow !== null) {
        const expectedNow = lastObservedWallClockMs + (monotonicNow - lastObservedMonotonicMs);
        const clockDriftMs = Math.abs(now - expectedNow);
        if (clockDriftMs > 30 * 60 * 1000) {
          logger.warn(`🕰️ Device clock jump detected (${Math.round(clockDriftMs / 60000)} min)`);
          invalidateReason = invalidateReason || 'clock_change';
          NotificationTraceService.log('rescheduler_invalidation_detected', {
            reason: 'clock_change',
            clockDriftMinutes: Math.round(clockDriftMs / 60000),
          });
        }
      }

      // Detect stale notification state (>48h without refresh)
      const lastRunStr = StorageService.getValue('last_batch_schedule_date');
      if (lastRunStr) {
        const hoursSinceLastRun = (Date.now() - new Date(lastRunStr).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRun > 120) {
          logger.warn('⚠️ Notification refresh was stale (>120h)');
          StorageService.setValue('notification_refresh_stale', 'true');
          NotificationTraceService.log('rescheduler_stale_refresh_detected', {
            hoursSinceLastRun: Number(hoursSinceLastRun.toFixed(2)),
          });
        }
      }

      let rescheduled = false;
      if (invalidateReason) {
        NotificationTraceService.log('rescheduler_reconcile_triggered', {
          reason: invalidateReason,
          force: true,
        });
        rescheduled = await NotificationService.reconcileScheduling(invalidateReason, { force: true });
      } else {
        NotificationTraceService.log('rescheduler_threshold_check_triggered', {
          reason: 'background_refresh',
        });
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

      // DST back-off: clear the attempt key on successful reschedule so the
      // next timezone change gets a fresh attempt immediately.
      if (rescheduled && invalidateReason === 'timezone_change') {
        StorageService.deleteValue(DST_LAST_ATTEMPT_KEY);
      }

      NotificationTraceService.log('rescheduler_check_completed', {
        rescheduled,
        invalidateReason,
      });
    } catch (error) {
      NotificationTraceService.log('rescheduler_check_failed');
      logger.error('❌ Reschedule failed:', error);
    }
  };
};
