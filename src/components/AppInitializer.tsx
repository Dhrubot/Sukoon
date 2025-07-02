// src/components/AppInitializer.tsx
import React from 'react';
import { useAppInitialization } from '../hooks/useAppInitialization';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import { LoadingScreen } from './LoadingScreen';
import { LocationModal } from './LocationModal';
import { AppNavigator } from '../navigation/AppNavigator';

export const AppInitializer: React.FC = () => {
  const {
    isLoading,
    isFirstLaunch,
    showLocationModal,
    error,
    completeOnboarding,
    closeLocationModal,
    retryInitialization,
  } = useAppInitialization();

  if (isLoading) {
    return <LoadingScreen message="Initializing PrayerBuddy..." />;
  }

  if (error) {
    return (
      <LoadingScreen 
        message={`Initialization failed: ${error}\n\nTap to retry`} 
      />
    );
  }

  if (isFirstLaunch) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <>
      <AppNavigator />
      <LocationModal 
        visible={showLocationModal} 
        onClose={closeLocationModal} 
      />
    </>
  );
};