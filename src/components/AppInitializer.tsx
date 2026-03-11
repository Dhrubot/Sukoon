import React from 'react';
import { useAppInitialization } from '../hooks/useAppInitialization';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import { LoadingScreen } from './LoadingScreen';
import { LocationModal } from './LocationModal';
import { AppNavigator } from '../navigation/AppNavigator';
import { ServiceProvider } from '../providers/ServiceProvider';
import { useNotificationRescheduler } from '../hooks/useNotificationRescheduler';

import SetupHealthScreen from '../screens/SetupHealth/SetupHealthScreen';
import PerformanceService from '../services/PerformanceService';

export const AppInitializer: React.FC = () => {
  const {
    isLoading,
    isFirstLaunch,
    showLocationModal,
    showSetupHealth,
    error,
    completeOnboarding,
    closeLocationModal,
    dismissSetupHealth,
    retryInitialization,
  } = useAppInitialization();

  // This activates the "Check every 24h" logic
  useNotificationRescheduler();

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
    PerformanceService.markLaunchMilestone('onboarding_screen_rendered');
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  PerformanceService.markLaunchMilestone(
    showSetupHealth ? 'setup_health_rendered' : 'app_navigator_rendered'
  );

  return (
    <ServiceProvider>
      {showSetupHealth ? (
        <SetupHealthScreen
          onDone={dismissSetupHealth}
        />
      ) : (
        <AppNavigator />
      )}
      <LocationModal 
        visible={showLocationModal} 
        onClose={closeLocationModal} 
        dismissLabel="Not now"
      />
    </ServiceProvider>
  );
};
