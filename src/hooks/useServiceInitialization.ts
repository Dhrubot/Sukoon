// src/hooks/useServiceInitialization.ts (FINAL MERGED VERSION)
import { useEffect, useMemo, useRef } from "react";
import { InteractionManager } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { usePrayerTimes } from "../providers/PrayerTimesProvider";
import { useStore } from '../store/useStore';
import NotificationService from '../services/NotificationService';
import LocationService from '../services/LocationService';
import PrayerTimeService from '../services/PrayerTimeService';
import MosqueModeService from '../services/MosqueModeService';
import { Location } from "../types";
import { NOTIFICATION_RESCHEDULE_TASK } from '../tasks/notificationRescheduleTask';

import AnalyticsService from '../services/AnalyticsService';
import RamadanCountdownService from '../services/RamadanCountdownService';
import JummahNotificationService from '../services/JummahNotificationService';
import EidNotificationService from '../services/EidNotificationService';
import PerformanceService from '../services/PerformanceService';
import logger from '../utils/logger';
import { SCHEDULING_DEBOUNCE_MS } from '../constants/time';
import StorageService from '../services/StorageService';
import { buildNotificationScheduleFingerprint } from '../utils/notificationScheduleFingerprint';
import {
  needsCalculationMethodMigration,
  migrateUserSettingsForLocale,
} from '../utils/calculationMethodByRegion';

/** Persisted flag — set once the locale-dependent calc-method migration runs. */
const CALC_METHOD_ISO_MIGRATION_FLAG = 'calc-method-iso-migration-v1';

/** If the rescheduler ran within this window, skip the settings-change schedule. */
const COLD_START_GUARD_MS = 30_000;

export const useServiceInitialization = () => {
  const { todayPrayerTimes, isLoading, hasValidLocation } =
    usePrayerTimes();

  const { userSettings, setLocation, updateUserSettings } = useStore();
  const notificationScheduleFingerprint = useMemo(() => {
    if (!userSettings) return null;
    return buildNotificationScheduleFingerprint(userSettings, todayPrayerTimes);
  }, [userSettings, todayPrayerTimes]);
  const notificationsEnabled = userSettings?.notifications?.enabled ?? false;

  // 🔄 Initialize all services once on mount
  useEffect(() => {
    let cancelled = false;
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      void PerformanceService.traceAsync('service_initialization', async () => {
        if (cancelled) return;

        PerformanceService.markLaunchMilestone('deferred_services_started');
        logger.log("🚀 Initializing deferred services...");

        try {
          await Promise.all([
            LocationService.initialize(),
          ]);

          try {
            const isRegistered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_RESCHEDULE_TASK);
            if (!isRegistered) {
              await BackgroundTask.registerTaskAsync(NOTIFICATION_RESCHEDULE_TASK, {
                minimumInterval: 24 * 60,
              });
            }
          } catch (error) {
            logger.warn('⚠️ Failed to register background notification rescheduler:', error);
          }

          // One-shot migration for users whose location.country was saved in a
          // non-English script by the pre-v57 edge path. Re-geocode the saved
          // coordinates so we pick up the new countryCode field, then re-apply
          // regional method resolution. Best-effort — sets the flag regardless
          // of network outcome so we don't keep retrying.
          try {
            const migrationApplied = StorageService.getValue(CALC_METHOD_ISO_MIGRATION_FLAG);
            const currentSettings = useStore.getState().userSettings;
            if (
              !migrationApplied &&
              currentSettings &&
              needsCalculationMethodMigration(currentSettings.location)
            ) {
              logger.log('🔄 Calc method migration: re-resolving region for legacy locale-script country');
              const fresh = await LocationService.reverseGeocodeCoordinates({
                latitude: currentSettings.location.latitude,
                longitude: currentSettings.location.longitude,
              });
              if (fresh) {
                const migrated = migrateUserSettingsForLocale(currentSettings, fresh);
                if (migrated) {
                  useStore.getState().setUserSettings(migrated);
                  logger.log('✅ Calc method migration applied', {
                    previous: currentSettings.calculationMethod,
                    next: migrated.calculationMethod,
                    countryCode: fresh.countryCode,
                  });
                }
              }
            }
            // Always stamp the flag — even on failure — so we don't retry every
            // boot. The check is cheap to re-run if the user uninstalls/reinstalls.
            StorageService.setValue(CALC_METHOD_ISO_MIGRATION_FLAG, '1');
          } catch (error) {
            logger.warn('⚠️ Calc method migration skipped due to error:', error);
          }

          void AnalyticsService.logEvent('app_open');
          PerformanceService.markLaunchMilestone('deferred_services_completed');
          logger.log("✅ Deferred services initialized");
        } catch (error) {
          logger.error("❌ Error initializing deferred services:", error);
        }
      });
    });

    return () => {
      cancelled = true;
      interactionHandle.cancel();
      logger.log("🧹 Cleaning up services...");
      LocationService.cleanup();
    };
  }, []);

  // 📡 Connect NotificationService prayer times fetcher (pure function, no closure over React state)
  useEffect(() => {
    NotificationService.setPrayerTimesFetcher(async ({ location, date, calculationMethod, adjustments, asrJuristic }) => {
      return PrayerTimeService.getPrayerTimesList(
        location,
        date,
        calculationMethod,
        adjustments,
        asrJuristic || 'Standard'
      );
    });
    logger.log("🔗 NotificationService fetcher connected");
  }, []);

  // 🕌 Register mosque-prompt handler so NotificationService can call into the store
  // without importing useStore directly (keeps the service layer store-free).
  useEffect(() => {
    NotificationService.registerMosquePromptHandler((prayer) => {
      useStore.getState().setPendingMosquePromptPrayer(prayer);
    });
    return () => {
      NotificationService.registerMosquePromptHandler(null);
    };
  }, []);

  // ⏰ Reschedule prayer notifications when SETTINGS change.
  // Initial cold-start scheduling is handled by useNotificationRescheduler
  // (in AppInitializer). This effect skips scheduling if the rescheduler
  // ran recently (within COLD_START_GUARD_MS) to avoid double-scheduling.
  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    // Always skip the very first invocation (component mount).
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (!hasValidLocation || isLoading || !notificationScheduleFingerprint || todayPrayerTimes.length === 0) return;

    if (scheduleTimerRef.current) clearTimeout(scheduleTimerRef.current);
    scheduleTimerRef.current = setTimeout(() => {
      if (!notificationsEnabled) {
        InteractionManager.runAfterInteractions(() => {
          logger.log("📵 Notifications disabled — cancelling Sukoon reminders...");
          NotificationService.cancelAllSukoonReminderNotifications();
        });
        scheduleTimerRef.current = null;
        return;
      }

      // Guard: skip if useNotificationRescheduler ran recently (cold-start window)
      const lastRun = StorageService.getValue('last_batch_schedule_date');
      if (lastRun) {
        const msSinceLastRun = Date.now() - new Date(lastRun).getTime();
        if (msSinceLastRun < COLD_START_GUARD_MS) {
          logger.log("📅 Skipping settings-change reschedule — rescheduler ran recently");
          scheduleTimerRef.current = null;
          return;
        }
      }

      InteractionManager.runAfterInteractions(() => {
        logger.log("📅 Schedule fingerprint changed — rescheduling prayer notifications...");
        NotificationService.reconcileScheduling('settings_change', { force: true });
      });
      scheduleTimerRef.current = null;
    }, SCHEDULING_DEBOUNCE_MS);

    return () => {
      if (scheduleTimerRef.current) clearTimeout(scheduleTimerRef.current);
    };
  }, [
    hasValidLocation,
    isLoading,
    notificationScheduleFingerprint,
    notificationsEnabled,
    todayPrayerTimes.length,
  ]);

  // 🌍 Register location update callback to refresh location & prayer times
  useEffect(() => {
    const locationCallback = {
      onLocationUpdate: async (location: Location) => {
        try {
          logger.log(
            "📍 Location updated, updating store states and triggering prayer time refresh..."
          );
          setLocation(location);
          updateUserSettings({ location });
          // PrayerTimesProvider will react to location change automatically
        } catch (error) {
          logger.error("❌ Error handling location update:", error);
        }
      },
    };

    LocationService.registerLocationUpdateCallback(locationCallback);
    logger.log("🧭 LocationService callback registered");

    return () => {
      LocationService.unregisterLocationUpdateCallback(locationCallback);
      logger.log("🧹 LocationService callback unregistered");
    };
  }, [setLocation, updateUserSettings]);

  useEffect(() => {
    const mosqueEnabled =
      hasValidLocation &&
      !isLoading &&
      userSettings?.mosqueMode?.enabled &&
      todayPrayerTimes.length > 0;

    if (!mosqueEnabled) return;

    if (userSettings?.mosqueMode?.promptBeforeEnable) {
      // Confirm mode (opt-in): schedule "Heading to mosque?" notifications
      MosqueModeService.schedulePreIqamahPrompts(todayPrayerTimes);
    } else {
      // Auto mode (default): schedule silent mode directly
      MosqueModeService.scheduleUpcomingMosqueModes(todayPrayerTimes);
    }
  }, [
    hasValidLocation,
    isLoading,
    userSettings?.mosqueMode?.enabled,
    userSettings?.mosqueMode?.promptBeforeEnable,
    userSettings?.mosqueMode?.silentDuration,
    userSettings?.mosqueMode?.autoRestore,
    userSettings?.mosqueMode?.useVibrateInsteadOfSilent,
    todayPrayerTimes.length,
  ]);

  // 🌙 Schedule Ramadan countdown/encouragement + Eid notifications
  // Triggers after prayer times load (which caches the Hijri date)
  useEffect(() => {
    if (hasValidLocation && !isLoading && todayPrayerTimes.length > 0) {
      RamadanCountdownService.scheduleRamadanNotifications();
      EidNotificationService.scheduleEidNotifications();
    }
  }, [hasValidLocation, isLoading, todayPrayerTimes.length]);

  // 🕌 Schedule Jummah (Friday) notifications
  useEffect(() => {
    if (hasValidLocation && !isLoading && todayPrayerTimes.length > 0) {
      JummahNotificationService.scheduleJummahNotifications(todayPrayerTimes);
    }
  }, [hasValidLocation, isLoading, todayPrayerTimes.length]);
};
