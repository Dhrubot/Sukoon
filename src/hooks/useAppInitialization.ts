import { useState, useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import StorageService from "../services/StorageService";
import NotificationService from "../services/NotificationService";
import PrayerTimeService from "../services/PrayerTimeService";
import LocationService from "../services/LocationService";
import { useStore } from "../store/useStore";
import { Location as LocationType } from "../types";
import { usePrayerTimeRefresh } from "./usePrayerTimeRefresh";
import { initializeEncryptionKey } from "../utils/secureKeyManager";
import { isValidCoordinates } from "../utils/locationValidation";
import logger from "../utils/logger";

interface AppInitializationState {
  isLoading: boolean;
  isFirstLaunch: boolean;
  showLocationModal: boolean;
  error: string | null;
}

export const useAppInitialization = () => {
  const [state, setState] = useState<AppInitializationState>({
    isLoading: true,
    isFirstLaunch: false,
    showLocationModal: false,
    error: null,
  });

  const { setUserSettings, setLocation, setCurrentStreak, setEngagementStreak } = useStore();
  const { shouldRefreshPrayerTimes } = usePrayerTimeRefresh();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      logger.log("Initializing app...");

      // 🔐 Initialize secure encryption key first (before any storage access)
      await initializeEncryptionKey();

      // Check if first launch
      const firstLaunch = StorageService.isFirstLaunch();

      // Load or create user settings
      let settings = StorageService.getUserSettings();
      if (!settings) {
        settings = StorageService.getDefaultSettings();
        StorageService.setUserSettings(settings);
      }

      setUserSettings(settings);

      // Check and update streaks on every boot (breaks streak if yesterday was missed)
      StorageService.updateStreak();
      setCurrentStreak(StorageService.getCurrentStreak());
      setEngagementStreak(StorageService.getEngagementStreak());

      // ONLY SET LOCATION IF IT'S ACTUALLY VALID
      const isValidLocation = isValidCoordinates(settings.location);

      if (isValidLocation) {
        logger.log("📍 Setting valid location in store");
        setLocation(settings.location);
      } else {
        logger.log("⏳ No valid location yet, store location remains null");
        // Don't set location - let it remain null until user provides real location
      }

      // Initialize notifications
      await NotificationService.initialize();

      // Check if prayer times need refreshing
      if (isValidCoordinates(settings.location)) {
        const needsRefresh = await shouldRefreshPrayerTimes(
          settings.location,
          settings.calculationMethod
        );

        if (needsRefresh) {
          logger.log("Refreshing prayer times...");
          try {
            await PrayerTimeService.fetchPrayerTimes(
              settings.location,
              new Date(),
              settings.calculationMethod,
              settings.asrJuristic
            );
          } catch (error) {
            logger.error("Failed to refresh prayer times:", error);
            // Continue anyway, use cached times
          }
        }
      }

      // If no location is set, show location modal
      const needsLocation = !isValidCoordinates(settings.location);

      setState({
        isLoading: false,
        isFirstLaunch: firstLaunch,
        showLocationModal: needsLocation,
        error: null,
      });

      // Hide splash screen
      await SplashScreen.hideAsync();
      logger.log("App initialization complete");
    } catch (error) {
      logger.error("App initialization failed:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));

      // Hide splash screen even on error
      await SplashScreen.hideAsync();
    }
  };

  const completeOnboarding = () => {
    // Re-check location settings because the user just finished onboarding
    const settings = StorageService.getUserSettings();
    const hasValidLocation =
      settings &&
      (settings.location.latitude !== 0 || settings.location.longitude !== 0);

    // Update Zustand store with the new location
    if (hasValidLocation && settings) {
      logger.log('✅ Onboarding complete - updating store with location:', {
        city: settings.location.city,
        country: settings.location.country,
        lat: settings.location.latitude,
        lng: settings.location.longitude,
      });
      
      // Update user settings in store
      setUserSettings(settings);
      
      // Update location in store (triggers prayer time refresh)
      setLocation(settings.location);
    } else {
      logger.log('⚠️ Onboarding complete but no valid location set');
    }

    setState((prev) => ({
      ...prev,
      isFirstLaunch: false,
      // If we have a valid location now, ensure the modal doesn't show
      showLocationModal: !hasValidLocation, 
    }));
  };

  const closeLocationModal = () => {
    setState((prev) => ({
      ...prev,
      showLocationModal: false,
    }));
  };

  return {
    ...state,
    completeOnboarding,
    closeLocationModal,
    retryInitialization: initializeApp,
  };
};
