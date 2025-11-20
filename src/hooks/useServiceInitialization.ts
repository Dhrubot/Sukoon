// src/hooks/useServiceInitialization.ts (FINAL MERGED VERSION)
import { useEffect } from "react";
import { Platform } from "react-native";
import { usePrayerTimes } from "../providers/PrayerTimesProvider";
import { useStore } from "../store/useStore";
import NotificationService from "../services/NotificationService";
import LocationService from "../services/LocationService";
import { Location } from "../types";

// Platform-specific imports
const SubscriptionService = Platform.select({
  web: () => require("../services/SubscriptionService.web").default,
  default: () => require("../services/SubscriptionService").default,
})();

const AdService = Platform.select({
  web: () => require("../services/AdService.web").default,
  default: () => require("../services/AdService").default,
})();

const DonationService = Platform.select({
  web: () => require("../services/DonationService.web").default,
  default: () => require("../services/DonationService").default,
})();

const FamilySharingService = Platform.select({
  web: () => require("../services/FamilySharingService.web").default,
  default: () => require("../services/FamilySharingService").default,
})();

export const useServiceInitialization = () => {
  const { todayPrayerTimes, nextPrayer, isLoading, hasValidLocation } =
    usePrayerTimes();

  const { userSettings, setLocation, updateUserSettings } = useStore();

  // 🔄 Initialize all services once on mount
  useEffect(() => {
    const initializeServices = async () => {
      console.log("🚀 Initializing services...");

      try {
        await Promise.all([
          SubscriptionService.initialize(),
          AdService.initialize(),
          DonationService.initialize(),
          FamilySharingService.initialize(),
          LocationService.initialize(),
        ]);

        console.log("✅ All core services initialized");
      } catch (error) {
        console.error("❌ Error initializing services:", error);
      }
    };

    initializeServices();

    return () => {
      console.log("🧹 Cleaning up services...");
      SubscriptionService.cleanup();
      AdService.cleanup();
      DonationService.cleanup();
      FamilySharingService.cleanup();
      LocationService.cleanup();
    };
  }, []);

  // 📡 Connect NotificationService to prayer times
  useEffect(() => {
    const prayerTimesSource = {
      getTodayPrayerTimes: () => todayPrayerTimes,
      getNextPrayer: () => nextPrayer,
      isLoading: () => isLoading,
      hasValidLocation: () => hasValidLocation,
    };

    NotificationService.setPrayerTimesSource(prayerTimesSource);
    console.log("🔗 NotificationService connected to centralized prayer times");
  }, [todayPrayerTimes, nextPrayer, isLoading, hasValidLocation]);

  // ⏰ Schedule prayer notifications if conditions are met
  useEffect(() => {
    const shouldSchedule =
      hasValidLocation &&
      !isLoading &&
      userSettings?.notifications?.enabled &&
      todayPrayerTimes.length > 0;

    if (shouldSchedule) {
      console.log("📅 Scheduling prayer notifications...");
      NotificationService.scheduleAllPrayerNotifications();
    }
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
          console.log(
            "📍 Location updated, updating store states and triggering prayer time refresh..."
          );
          setLocation(location);
          updateUserSettings({ location });
          // PrayerTimesProvider will react to location change automatically
        } catch (error) {
          console.error("❌ Error handling location update:", error);
        }
      },
    };

    LocationService.registerLocationUpdateCallback(locationCallback);
    console.log("🧭 LocationService callback registered");

    return () => {
      LocationService.unregisterLocationUpdateCallback(locationCallback);
      console.log("🧹 LocationService callback unregistered");
    };
  }, [setLocation, updateUserSettings]);
};
