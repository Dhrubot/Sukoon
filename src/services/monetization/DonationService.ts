import { Linking } from 'react-native';
import IAPManager from './IAPManager';
import StorageService from '../StorageService';
import { Donation } from '../../types';
import logger from '../../utils/logger';

// Donation product IDs — all go through IAP (store policy compliance)
const DONATION_PRODUCTS = {
  COFFEE: 'com.talukders.sukoon.donate.coffee',
  MEAL: 'com.talukders.sukoon.donate.meal',
  GENEROUS: 'com.talukders.sukoon.donate.generous',
  MAJOR: 'com.talukders.sukoon.donate.major',
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
    id: 'major',
    productId: DONATION_PRODUCTS.MAJOR,
    amount: 49.99,
    title: 'Major Support 🌟',
    description: 'Make a big impact for the Ummah',
    emoji: '🌟',
  },
];

class DonationService {
  private donationProducts: any[] = [];

  async initialize() {
    try {
      // Register donation purchase handler with IAPManager
      IAPManager.registerDonationHandler(this.processDonation.bind(this));

      // Load donation products via IAPManager
      const products = await IAPManager.getProducts(
        Object.values(DONATION_PRODUCTS),
      );

      this.donationProducts = products;
      return true;
    } catch (error) {
      logger.error('Failed to initialize donations:', error);
      return false;
    }
  }

  private async processDonation(purchase: any) {
    try {
      // Record donation
      const donation: Donation = {
        id: purchase.transactionId,
        amount: this.getAmountForProduct(purchase.productId),
        currency: 'USD',
        date: new Date(purchase.transactionDate),
        productId: purchase.productId,
        status: 'completed',
      };

      // Save donation record
      StorageService.saveDonation(donation);

      // Acknowledge the donation (consumable) via IAPManager
      await IAPManager.finishTransaction(purchase, true);

      // Show thank you
      this.showThankYou(donation);
    } catch (error) {
      logger.error('Failed to process donation:', error);
    }
  }

  private getAmountForProduct(productId: string): number {
    const tier = DONATION_TIERS.find(t => t.productId === productId);
    return tier?.amount || 0;
  }

  async makeDonation(tierId: string): Promise<boolean> {
    try {
      const tier = DONATION_TIERS.find(t => t.id === tierId);
      if (!tier) {
        throw new Error('Invalid donation tier');
      }

      // All tiers go through IAP (store policy compliance)
      await IAPManager.requestPurchase(tier.productId, true);
      return true;
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        logger.log('User cancelled donation');
      } else {
        logger.error('Donation error:', error);
      }
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
    const paypalUrl = 'https://paypal.me/CodifizApp';
    await Linking.openURL(paypalUrl);
  }

  async openCryptoDonation() {
    const cryptoUrl = 'https://commerce.coinbase.com/checkout/ee131f5e-bec6-4829-b897-ab64258ce317';
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
    // IAPManager owns the listener lifecycle
  }
}

export default new DonationService();