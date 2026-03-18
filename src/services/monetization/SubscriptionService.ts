import { Linking, Platform } from 'react-native';
import {
  ActiveSubscription,
  ErrorCode,
  Product,
  ProductSubscription,
  Purchase,
  PurchaseError,
} from 'expo-iap';
import IAPManager from './IAPManager';
import StorageService from '../StorageService';
import { SubscriptionPlan, PremiumFeatures } from '../../types';
import logger from '../../utils/logger';

const PRODUCTS = {
  MONTHLY: 'com.talukders.sukoon.premium.monthly',
  YEARLY: 'com.talukders.sukoon.premium.yearly',
  LIFETIME: 'com.talukders.sukoon.premium.lifetime',
};

class SubscriptionService {
  private products: Array<Product | ProductSubscription> = [];
  private currentSubscription: SubscriptionPlan | null = null;

  async initialize() {
    try {
      // Register subscription purchase handler with IAPManager
      IAPManager.registerSubscriptionHandler(this.handlePurchase.bind(this));

      // Load subscription products via IAPManager
      await this.loadProducts();

      // Check existing purchases
      await this.restorePurchases();

      return true;
    } catch (error) {
      logger.error('Failed to initialize subscriptions:', error);
      return false;
    }
  }

  private async loadProducts() {
    try {
      const [subscriptionProducts, lifetimeProducts] = await Promise.all([
        IAPManager.getSubscriptions([PRODUCTS.MONTHLY, PRODUCTS.YEARLY]),
        IAPManager.getProducts([PRODUCTS.LIFETIME]),
      ]);

      this.products = [...subscriptionProducts, ...lifetimeProducts];
      logger.log('Subscription products loaded:', this.products);
    } catch (error) {
      logger.error('Failed to load subscription products:', error);
    }
  }

  // Called by IAPManager when a subscription purchase is detected
  private async handlePurchase(purchase: Purchase) {
    logger.log('Subscription purchase received:', purchase);
    if (purchase.purchaseState !== 'purchased') {
      logger.log('Ignoring non-finalized subscription purchase state:', purchase.purchaseState);
      return;
    }

    // Validate receipt (in production, do this server-side)
    await this.validateAndSavePurchase(purchase);

    // Acknowledge purchase (non-consumable)
    await IAPManager.finishTransaction(purchase, false);
  }

  private async validateAndSavePurchase(purchase: Purchase) {
    // In production, validate receipt with your server
    // For now, we'll trust the purchase
    const originalTransactionId =
      'originalTransactionIdentifierIOS' in purchase
        ? purchase.originalTransactionIdentifierIOS ?? undefined
        : undefined;

    const plan: SubscriptionPlan = {
      id: purchase.productId,
      type: this.getPlanType(purchase.productId),
      startDate: new Date(purchase.transactionDate),
      expiryDate: this.calculateExpiryDate(purchase.productId, purchase.transactionDate),
      isActive: true,
      transactionId: purchase.transactionId ?? purchase.productId,
      originalTransactionId,
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

      if (planType === 'lifetime') {
        return IAPManager.requestPurchase(productId, 'in-app');
      }

      return IAPManager.requestPurchase(productId, 'subs');
    } catch (error) {
      if ((error as PurchaseError).code === ErrorCode.UserCancelled) {
        logger.log('User cancelled purchase');
      } else {
        logger.error('Purchase error:', error);
      }
      throw error;
    }
  }

  async restorePurchases() {
    try {
      const [purchases, activeSubscriptions] = await Promise.all([
        IAPManager.getAvailablePurchases(),
        IAPManager.getActiveSubscriptions([PRODUCTS.MONTHLY, PRODUCTS.YEARLY]),
      ]);

      const lifetimePurchase = purchases.find(
        (purchase) => purchase.productId === PRODUCTS.LIFETIME
      );

      if (lifetimePurchase) {
        await this.validateAndSavePurchase(lifetimePurchase);
        return;
      }

      const validSubscription = activeSubscriptions.find((purchase) =>
        this.isActiveSubscriptionPurchase(purchase)
      );

      if (validSubscription) {
        await this.saveActiveSubscription(validSubscription);
      }
    } catch (error) {
      logger.error('Failed to restore purchases:', error);
    }
  }

  private isActiveSubscriptionPurchase(purchase: ActiveSubscription): boolean {
    return (
      (purchase.productId === PRODUCTS.MONTHLY || purchase.productId === PRODUCTS.YEARLY) &&
      purchase.isActive
    );
  }

  private async saveActiveSubscription(purchase: ActiveSubscription) {
    const plan: SubscriptionPlan = {
      id: purchase.productId,
      type: this.getPlanType(purchase.productId),
      startDate: new Date(purchase.transactionDate),
      expiryDate: purchase.expirationDateIOS ? new Date(purchase.expirationDateIOS) : null,
      isActive: purchase.isActive,
      transactionId: purchase.transactionId,
      originalTransactionId: purchase.transactionId,
    };

    StorageService.saveSubscription(plan);
    this.currentSubscription = plan;
    this.enablePremiumFeatures();
  }

  private isPurchaseValid(purchase: Purchase): boolean {
    if (purchase.purchaseState !== 'purchased') {
      return false;
    }

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

  getProducts(): Array<Product | ProductSubscription> {
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
    // IAPManager owns the connection and listener lifecycle
  }
}

export default new SubscriptionService();
