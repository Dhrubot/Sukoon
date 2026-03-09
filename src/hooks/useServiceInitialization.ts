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

import SubscriptionService from '../services/monetization/SubscriptionService';
import AdService from '../services/monetization/AdService';
import DonationService from '../services/monetization/DonationService';
import AnalyticsService from '../services/AnalyticsService';
import RamadanCountdownService from '../services/RamadanCountdownService';
import JummahNotificationService from '../services/JummahNotificationService';
import EidNotificationService from '../services/EidNotificationService';
import PerformanceService from '../services/PerformanceService';
import logger from '../utils/logger';
import { SCHEDULING_DEBOUNCE_MS } from '../constants/time';

export const useServiceInitialization = () => {
  const { todayPrayerTimes, nextPrayer, isLoading, hasValidLocation } =
    usePrayerTimes();

  const { userSettings, setLocation, updateUserSettings } = useStore();

  // 🔄 Initialize all services once on mount
  useEffect(() => {
    const initializeServices = async () => {
      logger.log("🚀 Initializing services...");
      const stopTrace = await PerformanceService.startTrace('service_initialization');

      try {
        await Promise.all([
          SubscriptionService.initialize(),
          AdService.initialize(),
          DonationService.initialize(),
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

        AnalyticsService.logEvent('app_open');
        await stopTrace();
        logger.log("✅ All core services initialized");
      } catch (error) {
        await stopTrace();
        logger.error("❌ Error initializing services:", error);
      }
    };

    initializeServices();

    return () => {
      logger.log("🧹 Cleaning up services...");
      SubscriptionService.cleanup();
      AdService.cleanup();
      DonationService.cleanup();
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
  // (in AppInitializer). This effect only fires on subsequent settings changes
  // to avoid a double-schedule race on mount.
  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    // Skip the very first invocation (cold start) — useNotificationRescheduler owns that.
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
        InteractionManager.runAfterInteractions(() => {
          logger.log("📅 Settings changed — rescheduling prayer notifications...");
          NotificationService.scheduleAllPrayerNotifications();
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
