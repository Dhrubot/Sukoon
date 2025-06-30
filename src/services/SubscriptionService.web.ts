import StorageService from './StorageService';
import { SubscriptionPlan, PremiumFeatures } from '../types';

/**
 * Web-compatible version of SubscriptionService that mocks subscription functionality
 * since react-native-iap doesn't work on web.
 */
class SubscriptionService {
  private products: any[] = [
    {
      productId: 'com.prayerbuddy.premium.monthly',
      title: 'Premium Monthly',
      description: 'Monthly premium subscription',
      price: '$4.99',
      localizedPrice: '$4.99',
    },
    {
      productId: 'com.prayerbuddy.premium.yearly',
      title: 'Premium Yearly',
      description: 'Yearly premium subscription (save 30%)',
      price: '$39.99',
      localizedPrice: '$39.99',
    },
    {
      productId: 'com.prayerbuddy.premium.lifetime',
      title: 'Premium Lifetime',
      description: 'Lifetime premium subscription',
      price: '$79.99',
      localizedPrice: '$79.99',
    }
  ];
  private currentSubscription: SubscriptionPlan | null = null;

  async initialize() {
    console.log('SubscriptionService (Web): Initializing mock subscription service');
    // Check for existing mock subscription
    return this.checkSubscriptionStatus();
  }

  async loadProducts() {
    console.log('SubscriptionService (Web): Loading mock products');
    // Products are already defined
    return this.products;
  }

  async purchaseSubscription(planType: 'monthly' | 'yearly' | 'lifetime') {
    console.log(`SubscriptionService (Web): Purchasing ${planType} subscription`);
    
    // Simulate purchase success
    const plan: SubscriptionPlan = {
      id: `com.prayerbuddy.premium.${planType}`,
      type: planType,
      startDate: new Date(),
      expiryDate: planType === 'lifetime' ? null : this.calculateExpiryDate(planType),
      isActive: true,
      transactionId: `mock-${Date.now()}`,
      originalTransactionId: `mock-${Date.now()}`,
    };
    
    // Save subscription
    StorageService.saveSubscription(plan);
    this.currentSubscription = plan;
    
    // Enable premium features
    this.enablePremiumFeatures();
    
    return plan;
  }

  async restorePurchases() {
    console.log('SubscriptionService (Web): Restoring mock purchases');
    return this.checkSubscriptionStatus();
  }

  private calculateExpiryDate(planType: string): Date | null {
    const date = new Date();
    
    if (planType === 'monthly') {
      date.setMonth(date.getMonth() + 1);
      return date;
    } else if (planType === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
      return date;
    }
    
    // Lifetime has no expiry
    return null;
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    console.log('SubscriptionService (Web): Checking subscription status');
    const subscription = StorageService.getSubscription();
    
    if (!subscription) {
      return false;
    }

    // Lifetime is always active
    if (subscription.type === 'lifetime') {
      this.currentSubscription = subscription;
      return true;
    }

    // Check expiry for other plans
    if (subscription.expiryDate && new Date(subscription.expiryDate) > new Date()) {
      this.currentSubscription = subscription;
      return true;
    }

    // Subscription expired
    StorageService.clearSubscription();
    this.currentSubscription = null;
    return false;
  }

  enablePremiumFeatures() {
    console.log('SubscriptionService (Web): Enabling premium features');
    const features: PremiumFeatures = {
      familySharing: true,
      unlimitedHistory: true,
      advancedAnalytics: true,
      customNotificationSounds: true,
      cloudBackup: true,
      exportData: true,
      prayerReminders: true,
      widgetSupport: true,
      appleWatchSync: true,
      qiblaCompass: true,
      duaLibrary: true,
      audioRecitations: true,
      themes: true,
      removeAds: true,
    };

    StorageService.setPremiumFeatures(features);
  }

  getPremiumFeatures(): PremiumFeatures {
    return StorageService.getPremiumFeatures();
  }

  isFeatureUnlocked(feature: keyof PremiumFeatures): boolean {
    const features = this.getPremiumFeatures();
    return features[feature] || false;
  }

  getCurrentSubscription(): SubscriptionPlan | null {
    return this.currentSubscription;
  }

  getProducts() {
    return this.products;
  }

  cancelSubscription() {
    console.log('SubscriptionService (Web): Canceling subscription (mock)');
    // In web, just cancel immediately
    StorageService.clearSubscription();
    this.currentSubscription = null;
    return true;
  }

  cleanup() {
    console.log('SubscriptionService (Web): Cleaning up');
    // Nothing to clean up in web implementation
  }
}

export default new SubscriptionService();
