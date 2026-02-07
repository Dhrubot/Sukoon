import { Linking, Platform } from 'react-native';
import * as InAppPurchases from 'react-native-iap';
import StorageService from '../StorageService';
import { SubscriptionPlan, PremiumFeatures } from '../../types';
import logger from '../../utils/logger';

const PRODUCTS = {
  MONTHLY: Platform.select({
    ios: 'com.talukders.sukoon.premium.monthly',
    android: 'com.talukders.sukoon.premium.monthly',
  }) as string,
  YEARLY: Platform.select({
    ios: 'com.talukders.sukoon.premium.yearly',
    android: 'com.talukders.sukoon.premium.yearly',
  }) as string,
  LIFETIME: Platform.select({
    ios: 'com.talukders.sukoon.premium.lifetime',
    android: 'com.talukders.sukoon.premium.lifetime',
  }) as string,
};

class SubscriptionService {
  private products: any[] = [];
  private currentSubscription: SubscriptionPlan | null = null;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  async initialize() {
    try {
      // Initialize IAP
      const result = await InAppPurchases.initConnection();
      logger.log('IAP initialized:', result);

      // Get products
      await this.loadProducts();

      // Set up purchase listeners
      this.setupPurchaseListeners();

      // Check existing purchases
      await this.restorePurchases();

      return true;
    } catch (error) {
      logger.error('Failed to initialize IAP:', error);
      return false;
    }
  }

  private async loadProducts() {
    try {
      const products = await InAppPurchases.getProducts({
        skus: Object.values(PRODUCTS),
      });
      this.products = products;
      logger.log('Products loaded:', products);
    } catch (error) {
      logger.error('Failed to load products:', error);
    }
  }

  private setupPurchaseListeners() {
    this.purchaseUpdateSubscription = InAppPurchases.purchaseUpdatedListener(
      async (purchase) => {
        logger.log('Purchase updated:', purchase);
        const receipt = purchase.transactionReceipt;
        
        if (receipt) {
          // Validate receipt (in production, do this server-side)
          await this.validateAndSavePurchase(purchase);
          
          // Acknowledge purchase
          await InAppPurchases.finishTransaction({
            purchase,
            isConsumable: false,
          });
        }
      }
    );

    this.purchaseErrorSubscription = InAppPurchases.purchaseErrorListener(
      (error) => {
        logger.error('Purchase error:', error);
      }
    );
  }

  private async validateAndSavePurchase(purchase: any) {
    // In production, validate receipt with your server
    // For now, we'll trust the purchase
    
    const plan: SubscriptionPlan = {
      id: purchase.productId,
      type: this.getPlanType(purchase.productId),
      startDate: new Date(purchase.transactionDate),
      expiryDate: this.calculateExpiryDate(purchase.productId, purchase.transactionDate),
      isActive: true,
      transactionId: purchase.transactionId,
      originalTransactionId: purchase.originalTransactionIdentifier,
    };

    // Save subscription
    StorageService.saveSubscription(plan);
    this.currentSubscription = plan;

    // Enable premium features
    this.enablePremiumFeatures();
  }

  private getPlanType(productId: string): 'monthly' | 'yearly' | 'lifetime' {
    if (productId === PRODUCTS.MONTHLY) return 'monthly';
    if (productId === PRODUCTS.YEARLY) return 'yearly';
    return 'lifetime';
  }

  private calculateExpiryDate(productId: string, purchaseDate: number): Date | null {
    const date = new Date(purchaseDate);
    
    if (productId === PRODUCTS.MONTHLY) {
      date.setMonth(date.getMonth() + 1);
      return date;
    } else if (productId === PRODUCTS.YEARLY) {
      date.setFullYear(date.getFullYear() + 1);
      return date;
    }
    
    // Lifetime has no expiry
    return null;
  }

  async purchaseSubscription(planType: 'monthly' | 'yearly' | 'lifetime') {
    try {
      let productId = '';
      
      switch (planType) {
        case 'monthly':
          productId = PRODUCTS.MONTHLY;
          break;
        case 'yearly':
          productId = PRODUCTS.YEARLY;
          break;
        case 'lifetime':
          productId = PRODUCTS.LIFETIME;
          break;
      }

      const purchase = await InAppPurchases.requestPurchase({
        sku: productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });

      return purchase;
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        logger.log('User cancelled purchase');
      } else {
        logger.error('Purchase error:', error);
      }
      throw error;
    }
  }

  async restorePurchases() {
    try {
      const purchases = await InAppPurchases.getAvailablePurchases();
      
      if (purchases && purchases.length > 0) {
        // Find the most recent valid purchase
        const validPurchase = purchases.find(p => this.isPurchaseValid(p));
        
        if (validPurchase) {
          await this.validateAndSavePurchase(validPurchase);
        }
      }
    } catch (error) {
      logger.error('Failed to restore purchases:', error);
    }
  }

  private isPurchaseValid(purchase: any): boolean {
    // For lifetime, always valid
    if (purchase.productId === PRODUCTS.LIFETIME) {
      return true;
    }

    // For subscriptions, check expiry
    const expiryDate = this.calculateExpiryDate(
      purchase.productId,
      purchase.transactionDate
    );

    return expiryDate ? expiryDate > new Date() : false;
  }

  async checkSubscriptionStatus(): Promise<boolean> {
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

  private enablePremiumFeatures() {
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

  async cancelSubscription() {
    // Direct users to app store subscription management
    if (Platform.OS === 'ios') {
        // iOS subscription management URL
        Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else {
        // Android subscription management
        Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
  }

  cleanup() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
    }
    InAppPurchases.endConnection();
  }
}

export default new SubscriptionService();