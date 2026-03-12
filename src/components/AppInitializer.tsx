import React, { useEffect } from 'react';
import { useAppInitialization } from '../hooks/useAppInitialization';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import { LoadingScreen } from './LoadingScreen';
import { LocationModal } from './LocationModal';
import { AppNavigator } from '../navigation/AppNavigator';
import { ServiceProvider } from '../providers/ServiceProvider';
import { useNotificationRescheduler } from '../hooks/useNotificationRescheduler';
import PerformanceService from '../services/PerformanceService';

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

  // This activates the "Check every 24h" logic
  useNotificationRescheduler();

  useEffect(() => {
    if (isLoading || error) return;

    if (isFirstLaunch) {
      PerformanceService.markLaunchMilestoneOnce('onboarding_screen_rendered');
      return;
    }

    PerformanceService.markLaunchMilestoneOnce('app_navigator_rendered');
  }, [error, isFirstLaunch, isLoading]);

  if (isLoading) {
    return <LoadingScreen message="Initializing Sukoon..." />;
  }

  if (error) {
    return (
      <LoadingScreen 
        message={`Initialization failed: ${error}\n\nTap to retry`} 
        onPress={retryInitialization}
      />
    );
  }

  if (isFirstLaunch) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <ServiceProvider>
      <AppNavigator />
      <LocationModal 
        visible={showLocationModal} 
        onClose={closeLocationModal} 
        dismissLabel="Not now"
      />
    </ServiceProvider>
  );
};
