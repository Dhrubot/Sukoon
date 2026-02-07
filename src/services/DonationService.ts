import { Platform, Linking } from 'react-native';
import * as InAppPurchases from 'react-native-iap';
import StorageService from './StorageService';
import { Donation } from '../types';

// Donation product IDs
const DONATION_PRODUCTS = {
  COFFEE: Platform.select({
    ios: 'com.talukders.sukoon.donate.coffee',
    android: 'com.talukders.sukoon.donate.coffee',
  }) as string,
  MEAL: Platform.select({
    ios: 'com.talukders.sukoon.donate.meal',
    android: 'com.talukders.sukoon.donate.meal',
  }) as string,
  GENEROUS: Platform.select({
    ios: 'com.talukders.sukoon.donate.generous',
    android: 'com.talukders.sukoon.donate.generous',
  }) as string,
  CUSTOM: Platform.select({
    ios: 'com.talukders.sukoon.donate.custom',
    android: 'com.talukders.sukoon.donate.custom',
  }) as string,
};

// Donation tiers
export const DONATION_TIERS = [
  {
    id: 'coffee',
    productId: DONATION_PRODUCTS.COFFEE,
    amount: 2.99,
    title: 'Buy us a Coffee ☕',
    description: 'Support with a small contribution',
    emoji: '☕',
  },
  {
    id: 'meal',
    productId: DONATION_PRODUCTS.MEAL,
    amount: 9.99,
    title: 'Buy us a Meal 🍱',
    description: 'Help us keep developing',
    emoji: '🍱',
  },
  {
    id: 'generous',
    productId: DONATION_PRODUCTS.GENEROUS,
    amount: 24.99,
    title: 'Generous Support 💚',
    description: 'Your generosity keeps us going',
    emoji: '💚',
  },
  {
    id: 'custom',
    productId: DONATION_PRODUCTS.CUSTOM,
    amount: 0, // Custom amount
    title: 'Custom Amount 🤲',
    description: 'Choose your own amount',
    emoji: '🤲',
  },
];

class DonationService {
  private donationProducts: any[] = [];
  private purchaseListener: any = null;

  async initialize() {
    try {
      // Load donation products
      const products = await InAppPurchases.getProducts({
        skus: Object.values(DONATION_PRODUCTS),
      });
      
      this.donationProducts = products;
      this.setupDonationListener();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize donations:', error);
      return false;
    }
  }

  private setupDonationListener() {
    this.purchaseListener = InAppPurchases.purchaseUpdatedListener(
      async (purchase) => {
        if (this.isDonationProduct(purchase.productId)) {
          await this.processDonation(purchase);
        }
      }
    );
  }

  private isDonationProduct(productId: string): boolean {
    return Object.values(DONATION_PRODUCTS).includes(productId);
  }

  private async processDonation(purchase: any) {
    try {
      // Record donation
      const donation: Donation = {
        id: purchase.transactionId,
        amount: this.getAmountForProduct(purchase.productId),
        currency: 'USD', // Get from product details
        date: new Date(purchase.transactionDate),
        productId: purchase.productId,
        status: 'completed',
      };

      // Save donation record
      StorageService.saveDonation(donation);

      // Acknowledge the donation (consumable)
      await InAppPurchases.finishTransaction({
        purchase,
        isConsumable: true,
      });

      // Show thank you
      this.showThankYou(donation);
    } catch (error) {
      console.error('Failed to process donation:', error);
    }
  }

  private getAmountForProduct(productId: string): number {
    const tier = DONATION_TIERS.find(t => t.productId === productId);
    return tier?.amount || 0;
  }

  async makeDonation(tierId: string, customAmount?: number): Promise<boolean> {
    try {
      const tier = DONATION_TIERS.find(t => t.id === tierId);
      if (!tier) {
        throw new Error('Invalid donation tier');
      }

      if (tierId === 'custom' && customAmount) {
        // For custom amounts, use external payment processor
        return await this.processCustomDonation(customAmount);
      }

      // Process through IAP
      const purchase = await InAppPurchases.requestPurchase({
        sku: tier.productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });

      return true;
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        console.log('User cancelled donation');
      } else {
        console.error('Donation error:', error);
      }
      return false;
    }
  }

  private async processCustomDonation(amount: number): Promise<boolean> {
    // For custom amounts, redirect to external donation page
    // This could be PayPal, Stripe, or any halal payment processor
    const donationUrl = `https://prayerbuddy.app/donate?amount=${amount}`;
    
    try {
      await Linking.openURL(donationUrl);
      return true;
    } catch (error) {
      console.error('Failed to open donation URL:', error);
      return false;
    }
  }

  async getDonationHistory(): Promise<Donation[]> {
    return StorageService.getDonationHistory();
  }

  async getTotalDonated(): Promise<number> {
    const donations = await this.getDonationHistory();
    return donations.reduce((total, donation) => total + donation.amount, 0);
  }

  private showThankYou(donation: Donation) {
    // This will be handled by the UI layer
    // Could show a modal, notification, or special animation
    console.log('Thank you for your donation!', donation);
  }

  // Alternative donation methods
  async openPayPalDonation() {
    const paypalUrl = 'https://paypal.me/prayerbuddy'; // Replace with actual
    await Linking.openURL(paypalUrl);
  }

  async openCryptoDonation() {
    const cryptoUrl = 'https://prayerbuddy.app/crypto-donation';
    await Linking.openURL(cryptoUrl);
  }

  // Zakat calculator integration
  calculateZakat(assets: number, liabilities: number): {
    nisab: number;
    zakatable: number;
    zakatDue: number;
    isEligible: boolean;
  } {
    // Nisab (minimum wealth) - traditionally 87.48g of gold or 612.36g of silver
    // Using silver nisab as it benefits more people
    const silverPricePerGram = 0.80; // Update with current price
    const nisabInGrams = 612.36;
    const nisab = nisabInGrams * silverPricePerGram;

    const netWealth = assets - liabilities;
    const isEligible = netWealth >= nisab;
    const zakatDue = isEligible ? netWealth * 0.025 : 0; // 2.5%

    return {
      nisab,
      zakatable: netWealth,
      zakatDue,
      isEligible,
    };
  }

  // Sadaqah suggestions based on user's prayer consistency
  getSadaqahSuggestion(prayerCompletionRate: number): {
    amount: number;
    message: string;
  } {
    if (prayerCompletionRate >= 90) {
      return {
        amount: 10,
        message: "Ma sha Allah! Your consistency deserves generous sadaqah",
      };
    } else if (prayerCompletionRate >= 70) {
      return {
        amount: 5,
        message: "Great progress! Consider sadaqah to strengthen your journey",
      };
    } else {
      return {
        amount: 2,
        message: "Every bit counts! Start small and grow with your prayers",
      };
    }
  }

  getDonationProducts() {
    return this.donationProducts;
  }

  cleanup() {
    if (this.purchaseListener) {
      this.purchaseListener.remove();
    }
  }
}

export default new DonationService();