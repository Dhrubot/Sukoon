import { useState, useEffect } from "react";
import { InteractionManager } from 'react-native';
import * as SplashScreen from "expo-splash-screen";
import StorageService from "../services/StorageService";
import NotificationService from "../services/NotificationService";
import PrayerTimeService from "../services/PrayerTimeService";
import LocationService from "../services/LocationService";
import { useStore } from "../store/useStore";
import { usePrayerTimeRefresh } from "./usePrayerTimeRefresh";
import { initializeEncryptionKey, getEncryptionSecurityState } from "../utils/secureKeyManager";
import { isValidCoordinates } from "../utils/locationValidation";
import logger from "../utils/logger";
import PerformanceService from "../services/PerformanceService";
import TreeGrowthStateService from "../services/TreeGrowthStateService";
import ReflectionGardenService from "../services/ReflectionGardenService";

interface AppInitializationState {
  isLoading: boolean;
  isFirstLaunch: boolean;
  showLocationModal: boolean;
  showSetupHealth: boolean;
  error: string | null;
}

export const useAppInitialization = () => {
  const [state, setState] = useState<AppInitializationState>({
    isLoading: true,
    isFirstLaunch: false,
    showLocationModal: false,
    showSetupHealth: false,
    error: null,
  });

  const { setUserSettings, setLocation, setCurrentDawam, setEngagementDawam } = useStore();
  const { shouldRefreshPrayerTimes, recordRefreshAttempt, recordRefreshSuccess } = usePrayerTimeRefresh();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    const stopStartupTrace = await PerformanceService.startTrace('app_startup');
    try {
      logger.log("Initializing app...");

      // 🔐 Initialize secure encryption key first (before any storage access)
      await initializeEncryptionKey();

      // Create encrypted MMKV now that the key is ready
      await StorageService.initialize();
      const encryptionSecurityState = getEncryptionSecurityState();
      if (encryptionSecurityState !== 'secure_store') {
        logger.warn(`🔐 Storage security degraded: ${encryptionSecurityState}`);
      }

      // Check if first launch
      const firstLaunch = StorageService.isFirstLaunch();

      // Load or create user settings
      let settings = StorageService.getUserSettings();
      if (!settings) {
        settings = StorageService.getDefaultSettings();
      }

      setUserSettings(settings);

      // Render immediately from stored counters; maintenance refresh runs after first paint.
      setCurrentDawam(StorageService.getCurrentDawam());
      setEngagementDawam(StorageService.getEngagementDawam());

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
          settings.calculationMethod,
          settings.asrJuristic
        );

        if (needsRefresh) {
          const refreshDate = new Date();
          if (PrayerTimeService.hasInFlightPrayerTimesFetch(
            settings.location,
            refreshDate,
            settings.calculationMethod,
            settings.asrJuristic
          )) {
            logger.log("♻️ Prayer times refresh already in progress — skipping duplicate boot refresh");
          } else {
            logger.log("Refreshing prayer times...");
            try {
              recordRefreshAttempt(
                settings.location,
                settings.calculationMethod,
                settings.asrJuristic
              );
              await PrayerTimeService.fetchPrayerTimes(
                settings.location,
                refreshDate,
                settings.calculationMethod,
                settings.asrJuristic
              );
              if (!PrayerTimeService.lastFetchWasFallback) {
                recordRefreshSuccess(
                  settings.location,
                  settings.calculationMethod,
                  settings.asrJuristic
                );
              }
            } catch (error) {
              logger.error("Failed to refresh prayer times:", error);
              // Continue anyway, use cached times
            }
          }
        }
      }

      // If no location is set, show location modal
      const needsLocation = !isValidCoordinates(settings.location);

      const setupHealthShown = StorageService.getValue('setup_health_shown') === 'true';

      setState({
        isLoading: false,
        isFirstLaunch: firstLaunch,
        showLocationModal: needsLocation,
        showSetupHealth: !setupHealthShown,
        error: null,
      });

      // Hide splash screen
      await SplashScreen.hideAsync();
      await stopStartupTrace();
      scheduleDeferredStartupMaintenance(encryptionSecurityState);
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
      await stopStartupTrace();
    }
  };

  const scheduleDeferredStartupMaintenance = (encryptionSecurityState: string) => {
    InteractionManager.runAfterInteractions(() => {
      void PerformanceService.traceAsync('startup_deferred_maintenance', async () => {
        StorageService.setValue('encryption_security_state', encryptionSecurityState);

        // One-time migration: split encrypted/unencrypted storage
        StorageService.migrateSplitStorage();

        // Prune old data (once per day, 365-day retention)
        StorageService.pruneOldData(365);

        // Recompute dawam after first paint so boot stays responsive.
        StorageService.updateDawam();
        setCurrentDawam(StorageService.getCurrentDawam());
        setEngagementDawam(StorageService.getEngagementDawam());

        // Bootstrap TreeGrowthState if it doesn't exist yet (one-time migration)
        if (!TreeGrowthStateService.hasState()) {
          logger.log("🌳 Bootstrapping TreeGrowthState from existing reflections...");
          const existingPlants = ReflectionGardenService.getAllPlants(365);
          TreeGrowthStateService.bootstrapFromExistingData(existingPlants);
        }
      }).catch((error) => {
        logger.error('Deferred startup maintenance failed:', error);
      });
    });
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

  const dismissSetupHealth = () => {
    StorageService.setValue('setup_health_shown', 'true');
    setState((prev) => ({ ...prev, showSetupHealth: false }));
  };

  return {
    ...state,
    completeOnboarding,
    closeLocationModal,
    dismissSetupHealth,
    retryInitialization: initializeApp,
  };
};
