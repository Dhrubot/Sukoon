import StorageService from '../StorageService';
import { Donation } from '../../types';
import logger from '../../utils/logger';

const DONATION_PRODUCTS = {
  COFFEE: 'com.talukders.sukoon.donate.coffee',
  MEAL: 'com.talukders.sukoon.donate.meal',
  GENEROUS: 'com.talukders.sukoon.donate.generous',
  MAJOR: 'com.talukders.sukoon.donate.major',
};

export const DONATION_TIERS = [
  {
    id: 'coffee',
    productId: DONATION_PRODUCTS.COFFEE,
    amount: 2.99,
    title: 'A Small Sadaqah',
    description: 'Every good deed counts',
    emoji: '☕',
  },
  {
    id: 'meal',
    productId: DONATION_PRODUCTS.MEAL,
    amount: 9.99,
    title: 'Feed the Effort',
    description: 'Help us keep building',
    emoji: '🍱',
  },
  {
    id: 'generous',
    productId: DONATION_PRODUCTS.GENEROUS,
    amount: 24.99,
    title: 'Generous Heart',
    description: 'Barakah in your generosity',
    emoji: '💚',
  },
  {
    id: 'major',
    productId: DONATION_PRODUCTS.MAJOR,
    amount: 49.99,
    title: 'Major Blessing',
    description: 'A lasting impact for the Ummah',
    emoji: '🌟',
  },
];

class DonationService {
  async initialize(): Promise<boolean> {
    logger.log('DonationService: donations are disabled');
    return false;
  }

  async makeDonation(tierId: string): Promise<boolean> {
    const tier = DONATION_TIERS.find((item) => item.id === tierId);

    if (!tier) {
      logger.warn('DonationService: invalid donation tier requested');
      return false;
    }

    logger.warn(`DonationService: donation request ignored for ${tier.productId}`);
    return false;
  }

  async getDonationHistory(): Promise<Donation[]> {
    return StorageService.getDonationHistory();
  }

  async getTotalDonated(): Promise<number> {
    const donations = await this.getDonationHistory();
    return donations.reduce((total, donation) => total + donation.amount, 0);
  }

  calculateZakat(assets: number, liabilities: number): {
    nisab: number;
    zakatable: number;
    zakatDue: number;
    isEligible: boolean;
  } {
    const silverPricePerGram = 0.8;
    const nisabInGrams = 612.36;
    const nisab = nisabInGrams * silverPricePerGram;

    const netWealth = assets - liabilities;
    const isEligible = netWealth >= nisab;
    const zakatDue = isEligible ? netWealth * 0.025 : 0;

    return {
      nisab,
      zakatable: netWealth,
      zakatDue,
      isEligible,
    };
  }

  getSadaqahSuggestion(prayerCompletionRate: number): {
    amount: number;
    message: string;
  } {
    if (prayerCompletionRate >= 90) {
      return {
        amount: 10,
        message: 'Ma sha Allah! Your consistency deserves generous sadaqah',
      };
    }

    if (prayerCompletionRate >= 70) {
      return {
        amount: 5,
        message: 'Great progress! Consider sadaqah to strengthen your journey',
      };
    }

    return {
      amount: 2,
      message: 'Every bit counts! Start small and grow with your prayers',
    };
  }

  getDonationProducts(): [] {
    return [];
  }

  cleanup() {}
}

export default new DonationService();
