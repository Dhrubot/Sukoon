// ===== 1. src/hooks/useServiceInitialization.ts =====
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Import SubscriptionService (you already have this)
const SubscriptionService = Platform.select({
  web: () => require("../services/SubscriptionService.web").default,
  default: () => require("../services/SubscriptionService").default,
})();

// Import AdService (you already have this)
const AdService = Platform.select({
  web: () => require("../services/AdService.web").default,
  default: () => require("../services/AdService").default,
})();

// Import DonationService (you already have this)
const DonationService = Platform.select({
  web: () => require("../services/DonationService.web").default,
  default: () => require("../services/DonationService").default,
})();

// Import FamilySharingService (you already have this)
const FamilySharingService = Platform.select({
  web: () => require("../services/FamilySharingService.web").default,
  default: () => require("../services/FamilySharingService").default,
})();

export const useServiceInitialization = () => {
  useEffect(() => {
    const initializeServices = async () => {
      console.log("Initializing services...");
      try {
        // Initialize subscription service
        await SubscriptionService.initialize();
        console.log("SubscriptionService initialized");

        // Initialize ad service
        await AdService.initialize();
        console.log("AdService initialized");

        // Initialize donation service
        await DonationService.initialize();
        console.log("DonationService initialized");

        // Initialize family sharing service
        await FamilySharingService.initialize();
        console.log("FamilySharingService initialized");
      } catch (error) {
        console.error("Error initializing services:", error);
      }
    };

    initializeServices();

    return () => {
      console.log("Cleaning up services...");
      SubscriptionService.cleanup();
      AdService.cleanup();
      DonationService.cleanup();
      FamilySharingService.cleanup();
    };
  }, []);
};