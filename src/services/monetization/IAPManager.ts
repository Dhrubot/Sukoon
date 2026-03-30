import logger from '../../utils/logger';

type PurchaseHandler = (purchase: unknown) => Promise<void>;

class IAPManager {
  private donationHandler: PurchaseHandler | null = null;
  private subscriptionHandler: PurchaseHandler | null = null;

  async initialize(): Promise<boolean> {
    logger.log('IAPManager: in-app purchases are disabled');
    return false;
  }

  registerDonationHandler(handler: PurchaseHandler) {
    this.donationHandler = handler;
  }

  registerSubscriptionHandler(handler: PurchaseHandler) {
    this.subscriptionHandler = handler;
  }

  async getProducts(_skus: string[]): Promise<unknown[]> {
    return [];
  }

  async getSubscriptions(_skus: string[]): Promise<unknown[]> {
    return [];
  }

  async requestPurchase(
    _productId: string,
    _type: 'in-app' | 'subs' = 'in-app',
    _subscriptionOfferToken?: string
  ): Promise<boolean> {
    logger.warn('IAPManager: purchase request ignored because purchases are disabled');
    return false;
  }

  async finishTransaction(_purchase: unknown, _isConsumable: boolean): Promise<void> {
    return;
  }

  async getAvailablePurchases(): Promise<unknown[]> {
    return [];
  }

  async getActiveSubscriptions(_subscriptionIds?: string[]): Promise<unknown[]> {
    return [];
  }

  isInitialized(): boolean {
    return false;
  }

  cleanup() {
    this.donationHandler = null;
    this.subscriptionHandler = null;
  }
}

export default new IAPManager();
