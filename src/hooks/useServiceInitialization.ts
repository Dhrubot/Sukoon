// src/hooks/useServiceInitialization.ts (FINAL MERGED VERSION)
import { useEffect, useRef } from "react";
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

import AdService from '../services/monetization/AdService';
import AnalyticsService from '../services/AnalyticsService';
import RamadanCountdownService from '../services/RamadanCountdownService';
import JummahNotificationService from '../services/JummahNotificationService';
import EidNotificationService from '../services/EidNotificationService';
import PerformanceService from '../services/PerformanceService';
import logger from '../utils/logger';
import { SCHEDULING_DEBOUNCE_MS } from '../constants/time';
import StorageService from '../services/StorageService';

/** If the rescheduler ran within this window, skip the settings-change schedule. */
const COLD_START_GUARD_MS = 30_000;

export const useServiceInitialization = () => {
  const { todayPrayerTimes, isLoading, hasValidLocation } =
    usePrayerTimes();

  const { userSettings, setLocation, updateUserSettings } = useStore();

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
            // SubscriptionService.initialize(),
            // AdService.initialize(),
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
      AdService.cleanup();
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

    const shouldSchedule =
      hasValidLocation &&
      !isLoading &&
      userSettings?.notifications?.enabled &&
      todayPrayerTimes.length > 0;

    if (shouldSchedule) {
      if (scheduleTimerRef.current) clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = setTimeout(() => {
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
          logger.log("📅 Settings changed — rescheduling prayer notifications...");
          NotificationService.reconcileScheduling('settings_change');
        });
        scheduleTimerRef.current = null;
      }, SCHEDULING_DEBOUNCE_MS);
    }

    return () => {
      if (scheduleTimerRef.current) clearTimeout(scheduleTimerRef.current);
    };
  }, [
    hasValidLocation,
    isLoading,
    userSettings?.notifications?.enabled,
    userSettings?.notifications?.beforePrayer,
    userSettings?.notifications?.soundEnabled,
    userSettings?.notifications?.postPrayerCheck,
    userSettings?.calculationMethod,
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
