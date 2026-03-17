import { EmitterSubscription, Platform } from 'react-native';
import * as InAppPurchases from 'react-native-iap';
import { Purchase, Product, Subscription, PurchaseError } from 'react-native-iap';
import logger from '../../utils/logger';

// Product ID prefixes for routing
const DONATION_PREFIX = 'com.talukders.sukoon.donate.';
const SUBSCRIPTION_PREFIX = 'com.talukders.sukoon.premium.';

type PurchaseHandler = (purchase: Purchase) => Promise<void>;

class IAPManager {
  private _initialized = false;
  private purchaseUpdateSubscription: EmitterSubscription | null = null;
  private purchaseErrorSubscription: EmitterSubscription | null = null;
  private donationHandler: PurchaseHandler | null = null;
  private subscriptionHandler: PurchaseHandler | null = null;

  async initialize(): Promise<boolean> {
    if (this._initialized) return true;

    try {
      const result = await InAppPurchases.initConnection();
      logger.log('IAP connection initialized:', result);

      if (Platform.OS === 'android') {
        await InAppPurchases.flushFailedPurchasesCachedAsPendingAndroid();
        logger.log('Flushed pending Android purchases');
      }

      this.setupListeners();
      this._initialized = true;
      return true;
    } catch (error) {
      logger.error('IAPManager: Failed to initialize:', error);
      return false;
    }
  }

  private setupListeners() {
    this.purchaseUpdateSubscription = InAppPurchases.purchaseUpdatedListener(
      async (purchase) => {
        const productId: string = purchase.productId || '';
        logger.log('IAPManager: Purchase updated:', productId);

        try {
          if (productId.startsWith(DONATION_PREFIX) && this.donationHandler) {
            await this.donationHandler(purchase);
          } else if (productId.startsWith(SUBSCRIPTION_PREFIX) && this.subscriptionHandler) {
            await this.subscriptionHandler(purchase);
          } else {
            logger.warn('IAPManager: Unrecognized product:', productId);
          }
        } catch (error) {
          logger.error('IAPManager: Error processing purchase:', error);
        }
      }
    );

    this.purchaseErrorSubscription = InAppPurchases.purchaseErrorListener(
      (error: PurchaseError) => {
        logger.error('IAPManager: Purchase error:', error);
      }
    );
  }

  registerDonationHandler(handler: PurchaseHandler) {
    this.donationHandler = handler;
  }

  registerSubscriptionHandler(handler: PurchaseHandler) {
    this.subscriptionHandler = handler;
  }

  async getProducts(skus: string[]): Promise<Product[]> {
    return InAppPurchases.getProducts({ skus });
  }

  async getSubscriptions(skus: string[]): Promise<Subscription[]> {
    return InAppPurchases.getSubscriptions({ skus });
  }

  async requestPurchase(productId: string) {
    if (Platform.OS === 'ios') {
      return InAppPurchases.requestPurchase({
        sku: productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });
    } else {
      return InAppPurchases.requestPurchase({
        skus: [productId],
      });
    }
  }

  async finishTransaction(purchase: Purchase, isConsumable: boolean) {
    return InAppPurchases.finishTransaction({ purchase, isConsumable });
  }

  async getAvailablePurchases(): Promise<Purchase[]> {
    return InAppPurchases.getAvailablePurchases();
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  cleanup() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
    }
    InAppPurchases.endConnection();
    this._initialized = false;
    this.donationHandler = null;
    this.subscriptionHandler = null;
  }
}

export default new IAPManager();
