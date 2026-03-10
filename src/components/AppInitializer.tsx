import React from 'react';
import { useAppInitialization } from '../hooks/useAppInitialization';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import { LoadingScreen } from './LoadingScreen';
import { LocationModal } from './LocationModal';
import { AppNavigator } from '../navigation/AppNavigator';
import { ServiceProvider } from '../providers/ServiceProvider';
import { useNotificationRescheduler } from '../hooks/useNotificationRescheduler';

import SetupHealthScreen from '../screens/SetupHealth/SetupHealthScreen';

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
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

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
