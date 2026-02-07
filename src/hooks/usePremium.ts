// src/hooks/usePremium.ts
import { useState, useEffect, useCallback } from 'react';
import StorageService from '../services/StorageService';
import SubscriptionService from '../services/monetization/SubscriptionService';
import { PremiumFeatures } from '../types';

interface UsePremiumReturn {
  isPremium: boolean;
  features: PremiumFeatures;
  isFeatureUnlocked: (feature: keyof PremiumFeatures) => boolean;
  refreshStatus: () => Promise<void>;
}

const DEFAULT_FEATURES: PremiumFeatures = {
  familySharing: false,
  unlimitedHistory: false,
  advancedAnalytics: false,
  customNotificationSounds: false,
  cloudBackup: false,
  exportData: false,
  prayerReminders: true, // Always free
  widgetSupport: false,
  appleWatchSync: false,
  qiblaCompass: true, // Always free
  duaLibrary: false,
  audioRecitations: false,
  themes: false,
  removeAds: false,
};

export const usePremium = (): UsePremiumReturn => {
  const [isPremium, setIsPremium] = useState(false);
  const [features, setFeatures] = useState<PremiumFeatures>(DEFAULT_FEATURES);

  const refreshStatus = useCallback(async () => {
    const hasSubscription = await SubscriptionService.checkSubscriptionStatus();
    setIsPremium(hasSubscription);

    if (hasSubscription) {
      setFeatures(StorageService.getPremiumFeatures());
    } else {
      // Check for ad-granted temporary premium
      const adFreeUntil = StorageService.getValue('ad_free_until');
      if (adFreeUntil && new Date(adFreeUntil) > new Date()) {
        setIsPremium(true);
        setFeatures(StorageService.getPremiumFeatures());
      } else {
        setFeatures(DEFAULT_FEATURES);
      }
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const isFeatureUnlocked = useCallback(
    (feature: keyof PremiumFeatures) => features[feature] || false,
    [features]
  );

  return { isPremium, features, isFeatureUnlocked, refreshStatus };
};
