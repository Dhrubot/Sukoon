import { Linking, Platform } from 'react-native';
import StorageService from '../StorageService';
import { PremiumFeatures, SubscriptionPlan } from '../../types';
import logger from '../../utils/logger';

const DISABLED_PREMIUM_FEATURES: PremiumFeatures = {
  removeAds: false,
  themes: false,
  advancedAnalytics: false,
  familySharing: false,
  customNotificationSounds: false,
  cloudBackup: false,
  exportData: false,
  prayerReminders: false,
  widgetSupport: false,
  appleWatchSync: false,
  qiblaCompass: false,
  duaLibrary: false,
  audioRecitations: false,
  unlimitedHistory: false,
};

class SubscriptionService {
  private currentSubscription: SubscriptionPlan | null = null;

  async initialize(): Promise<boolean> {
    this.disableStoredPremiumState();
    logger.log('SubscriptionService: premium purchases are disabled');
    return false;
  }

  async purchaseSubscription(_planType: 'monthly' | 'yearly' | 'lifetime'): Promise<boolean> {
    logger.warn('SubscriptionService: purchase request ignored because premium is disabled');
    return false;
  }

  async restorePurchases(): Promise<boolean> {
    this.disableStoredPremiumState();
    return false;
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    this.disableStoredPremiumState();
    return false;
  }

  getPremiumFeatures(): PremiumFeatures {
    return DISABLED_PREMIUM_FEATURES;
  }

  isFeatureUnlocked(_feature: keyof PremiumFeatures): boolean {
    return false;
  }

  getCurrentSubscription(): SubscriptionPlan | null {
    return this.currentSubscription;
  }

  getProducts(): unknown[] {
    return [];
  }

  async cancelSubscription() {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
      return;
    }

    Linking.openURL('https://play.google.com/store/account/subscriptions');
  }

  cleanup() {
    this.currentSubscription = null;
  }

  private disableStoredPremiumState() {
    this.currentSubscription = null;
    StorageService.clearSubscription();
    StorageService.setPremiumFeatures(DISABLED_PREMIUM_FEATURES);
  }
}

export default new SubscriptionService();
