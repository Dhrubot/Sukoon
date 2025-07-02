// src/hooks/useAppInitialization.ts
import { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationService';
import { useStore } from '../store/useStore';

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

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing app...');

      // Check if first launch
      const firstLaunch = StorageService.isFirstLaunch();
      
      // Load or create user settings
      let settings = StorageService.getUserSettings();
      if (!settings) {
        settings = StorageService.getDefaultSettings();
      }

      setUserSettings(settings);
      setLocation(settings.location);

      // Initialize notifications
      await NotificationService.initialize();

      // If no location is set, show location modal
      const needsLocation = !settings.location.latitude || !settings.location.longitude;

      setState({
        isLoading: false,
        isFirstLaunch: firstLaunch,
        showLocationModal: needsLocation,
        error: null,
      });

      // Hide splash screen
      await SplashScreen.hideAsync();
      console.log('App initialization complete');

    } catch (error) {
      console.error('App initialization failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      
      // Hide splash screen even on error
      await SplashScreen.hideAsync();
    }
  };

  const completeOnboarding = () => {
    setState(prev => ({
      ...prev,
      isFirstLaunch: false,
    }));
  };

  const closeLocationModal = () => {
    setState(prev => ({
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