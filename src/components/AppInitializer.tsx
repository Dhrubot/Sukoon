import React, { useState } from 'react';
import { useAppInitialization } from '../hooks/useAppInitialization';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import { LoadingScreen } from './LoadingScreen';
import { LocationModal } from './LocationModal';
import { AppNavigator } from '../navigation/AppNavigator';
import { ServiceProvider } from '../providers/ServiceProvider';
import { useNotificationRescheduler } from '../hooks/useNotificationRescheduler';
import StorageService from '../services/StorageService';
import SetupHealthScreen from '../screens/SetupHealth/SetupHealthScreen';

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

  const [showSetupHealth, setShowSetupHealth] = useState(
    StorageService.getValue('setup_health_shown') !== 'true'
  );

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
          onDone={() => {
            StorageService.setValue('setup_health_shown', 'true');
            setShowSetupHealth(false);
          }}
        />
      ) : (
        <AppNavigator />
      )}
      <LocationModal 
        visible={showLocationModal} 
        onClose={closeLocationModal} 
      />
    </ServiceProvider>
  );
};