import { useState, useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import StorageService from "../services/StorageService";
import NotificationService from "../services/NotificationService";
import PrayerTimeService from "../services/PrayerTimeService";
import LocationService from "../services/LocationService";
import { useStore } from "../store/useStore";
import { Location as LocationType } from "../types";
import { usePrayerTimeRefresh } from "./usePrayerTimeRefresh";

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

  const { setUserSettings, setLocation } = useStore();
  const { shouldRefreshPrayerTimes } = usePrayerTimeRefresh();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log("Initializing app...");

      // Check if first launch
      const firstLaunch = StorageService.isFirstLaunch();

      // Load or create user settings
      let settings = StorageService.getUserSettings();
      if (!settings) {
        settings = StorageService.getDefaultSettings();
        StorageService.setUserSettings(settings);
      }

      setUserSettings(settings);

      // ONLY SET LOCATION IF IT'S ACTUALLY VALID
      const isValidLocation =
        settings.location.latitude !== 0 || settings.location.longitude !== 0;

      if (isValidLocation) {
        console.log("📍 Setting valid location in store");
        setLocation(settings.location);
      } else {
        console.log("⏳ No valid location yet, store location remains null");
        // Don't set location - let it remain null until user provides real location
      }

      // Initialize notifications
      await NotificationService.initialize();

      // Check if prayer times need refreshing
      if (settings.location.latitude && settings.location.longitude) {
        const needsRefresh = await shouldRefreshPrayerTimes(
          settings.location,
          settings.calculationMethod
        );

        if (needsRefresh) {
          console.log("Refreshing prayer times...");
          try {
            await PrayerTimeService.fetchPrayerTimes(
              settings.location,
              new Date(),
              settings.calculationMethod,
              settings.asrJuristic
            );
          } catch (error) {
            console.error("Failed to refresh prayer times:", error);
            // Continue anyway, use cached times
          }
        }
      }

      // If no location is set, show location modal
      const needsLocation =
        !settings.location.latitude || !settings.location.longitude;

      setState({
        isLoading: false,
        isFirstLaunch: firstLaunch,
        showLocationModal: needsLocation,
        error: null,
      });

      // Hide splash screen
      await SplashScreen.hideAsync();
      console.log("App initialization complete");
    } catch (error) {
      console.error("App initialization failed:", error);
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
    setState((prev) => ({
      ...prev,
      isFirstLaunch: false,
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
