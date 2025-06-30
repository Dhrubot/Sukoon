import { Platform } from 'react-native';
import StorageService from './StorageService';

interface DonationTier {
  id: string;
  title: string;
  description: string;
  amount: string;
  localizedPrice: string;
  emoji: string;
}

// Donation tiers
export const DONATION_TIERS: Record<string, DonationTier> = {
  SMALL: {
    id: 'com.prayerbuddy.donation.small',
    title: 'Sadaqah - Small',
    description: 'Plant a seed of blessing',
    amount: '4.99',
    localizedPrice: '$4.99',
    emoji: '🌱',
  },
  MEDIUM: {
    id: 'com.prayerbuddy.donation.medium',
    title: 'Sadaqah - Medium',
    description: 'Nurture our growth',
    amount: '9.99',
    localizedPrice: '$9.99',
    emoji: '🌿',
  },
  LARGE: {
    id: 'com.prayerbuddy.donation.large',
    title: 'Sadaqah - Large',
    description: 'Support our mission',
    amount: '19.99',
    localizedPrice: '$19.99',
    emoji: '🌳',
  },
};

/**
 * Web-compatible version of DonationService that mocks donation functionality
 * since react-native-iap doesn't work on web.
 */
class DonationService {
  private products: DonationTier[] = [];
  private donationHistory: any[] = [];

  async initialize() {
    console.log('DonationService (Web): Initializing mock donation service');
    this.products = Object.values(DONATION_TIERS);
    return true;
  }

  async makeDonation(tierId: string): Promise<boolean> {
    console.log(`DonationService (Web): Processing donation for ${tierId}`);
    
    const tier = Object.values(DONATION_TIERS).find(tier => tier.id === tierId);
    
    if (!tier) {
      console.error('DonationService (Web): Invalid donation tier');
      return false;
    }
    
    // Record donation
    const donation = {
      id: `mock-donation-${Date.now()}`,
      tierId,
      amount: parseFloat(tier.amount),
      date: new Date(),
      transactionId: `mock-${Date.now()}`,
      currency: 'USD', 
      status: 'completed' as 'completed' | 'pending' | 'failed', 
    };
    
    this.donationHistory.push(donation);
    
    // Save to storage
    const history = StorageService.getDonationHistory() || [];
    history.push(donation);
    StorageService.saveDonation(donation);
    
    // Since this is a mock implementation, always return success
    console.log('DonationService (Web): Donation successful');
    return true;
  }

  getDonationTiers(): DonationTier[] {
    return this.products;
  }

  getDonationHistory(): any[] {
    return StorageService.getDonationHistory() || [];
  }

  async calculateZakat(assets: number): Promise<number> {
    // Zakat is typically 2.5% of assets above nisab
    const nisab = 5000; // Example threshold
    return assets > nisab ? (assets - nisab) * 0.025 : 0;
  }

  getSadaqahSuggestions(): string[] {
    return [
      'Support a local mosque',
      'Feed the hungry',
      'Help orphans',
      'Support educational programs',
      'Fund water projects',
      'Contribute to medical aid',
      'Support widows and elderly',
    ];
  }

  donateViaAlternativeMethod(method: 'paypal' | 'crypto', amount: number): void {
    console.log(`DonationService (Web): Mock ${method} donation of ${amount}`);
    // In a real app, this would open the relevant donation link/page
    // Since this is a web mock, we just log it
  }

  cleanup() {
    console.log('DonationService (Web): Cleaning up');
    // Nothing to clean up in web implementation
  }
}

export default new DonationService();
