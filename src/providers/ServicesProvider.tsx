// src/providers/ServicesProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Service imports with platform-specific loading
const SubscriptionService = Platform.select({
  web: () => require("../services/SubscriptionService.web").default,
  default: () => require("../services/SubscriptionService").default,
})();

const AdService = Platform.select({
  web: () => require("../services/AdService.web").default,
  default: () => require("../services/AdService").default,
})();

const DonationService = Platform.select({
  web: () => require("../services/DonationService.web").default,
  default: () => require("../services/DonationService").default,
})();

const FamilySharingService = Platform.select({
  web: () => require("../services/FamilySharingService.web").default,
  default: () => require("../services/FamilySharingService").default,
})();

interface ServicesContextType {
  servicesInitialized: boolean;
  initializationError: string | null;
}

const ServicesContext = createContext<ServicesContextType>({
  servicesInitialized: false,
  initializationError: null,
});

export const useServices = () => useContext(ServicesContext);

interface ServicesProviderProps {
  children: React.ReactNode;
}

export const ServicesProvider: React.FC<ServicesProviderProps> = ({ children }) => {
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeServices = async () => {
      console.log("Initializing services...");
      
      try {
        // Initialize all services concurrently
        await Promise.all([
          SubscriptionService.initialize(),
          AdService.initialize(),
          DonationService.initialize(),
          FamilySharingService.initialize(),
        ]);

        console.log("All services initialized successfully");
        setServicesInitialized(true);
      } catch (error) {
        console.error("Error initializing services:", error);
        setInitializationError(error instanceof Error ? error.message : 'Unknown error');
        // Don't block the app if services fail
        setServicesInitialized(true);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up services...");
      SubscriptionService.cleanup?.();
      AdService.cleanup?.();
      DonationService.cleanup?.();
      FamilySharingService.cleanup?.();
    };
  }, []);

  return (
    <ServicesContext.Provider value={{ servicesInitialized, initializationError }}>
      {children}
    </ServicesContext.Provider>
  );
};