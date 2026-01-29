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
      if (
        typeof settings.location.latitude === 'number' &&
        typeof settings.location.longitude === 'number' &&
        !Number.isNaN(settings.location.latitude) &&
        !Number.isNaN(settings.location.longitude) &&
        (settings.location.latitude !== 0 || settings.location.longitude !== 0)
      ) {
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
        typeof settings.location.latitude !== 'number' ||
        typeof settings.location.longitude !== 'number' ||
        Number.isNaN(settings.location.latitude) ||
        Number.isNaN(settings.location.longitude) ||
        (settings.location.latitude === 0 && settings.location.longitude === 0);

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
    // Re-check location settings because the user just finished onboarding
    const settings = StorageService.getUserSettings();
    const hasValidLocation =
      settings &&
      (settings.location.latitude !== 0 || settings.location.longitude !== 0);

    // Update Zustand store with the new location
    if (hasValidLocation && settings) {
      console.log('✅ Onboarding complete - updating store with location:', {
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
      console.log('⚠️ Onboarding complete but no valid location set');
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
