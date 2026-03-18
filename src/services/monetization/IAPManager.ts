import * as InAppPurchases from 'expo-iap';
import { ActiveSubscription, Product, ProductSubscription, Purchase } from 'expo-iap';
import logger from '../../utils/logger';

// Product ID prefixes for routing
const DONATION_PREFIX = 'com.talukders.sukoon.donate.';
const SUBSCRIPTION_PREFIX = 'com.talukders.sukoon.premium.';

type PurchaseHandler = (purchase: Purchase) => Promise<void>;

class IAPManager {
  private _initialized = false;
  private purchaseUpdateSubscription: { remove: () => void } | null = null;
  private purchaseErrorSubscription: { remove: () => void } | null = null;
  private donationHandler: PurchaseHandler | null = null;
  private subscriptionHandler: PurchaseHandler | null = null;

  async initialize(): Promise<boolean> {
    if (this._initialized) return true;

    try {
      const result = await InAppPurchases.initConnection();
      logger.log('IAP connection initialized:', result);

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
      (error) => {
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
    return InAppPurchases.fetchProducts({ skus, type: 'in-app' }) as Promise<Product[]>;
  }

  async getSubscriptions(skus: string[]): Promise<ProductSubscription[]> {
    return InAppPurchases.fetchProducts({ skus, type: 'subs' }) as Promise<ProductSubscription[]>;
  }

  async requestPurchase(
    productId: string,
    type: 'in-app' | 'subs' = 'in-app',
    subscriptionOfferToken?: string
  ) {
    const googleRequest = type === 'subs' && subscriptionOfferToken
      ? {
          skus: [productId],
          subscriptionOffers: [{ sku: productId, offerToken: subscriptionOfferToken }],
        }
      : {
          skus: [productId],
        };

    return InAppPurchases.requestPurchase({
      request: {
        apple: { sku: productId },
        google: googleRequest,
      },
      type,
    });
  }

  async finishTransaction(purchase: Purchase, isConsumable: boolean) {
    return InAppPurchases.finishTransaction({ purchase, isConsumable });
  }

  async getAvailablePurchases(): Promise<Purchase[]> {
    return InAppPurchases.getAvailablePurchases();
  }

  async getActiveSubscriptions(subscriptionIds?: string[]): Promise<ActiveSubscription[]> {
    return InAppPurchases.getActiveSubscriptions(subscriptionIds);
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
    void InAppPurchases.endConnection();
    this._initialized = false;
    this.donationHandler = null;
    this.subscriptionHandler = null;
  }
}

export default new IAPManager();
