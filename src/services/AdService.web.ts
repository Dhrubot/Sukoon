import { TemporaryPremium } from '../types';
import StorageService from './StorageService';

/**
 * Web-compatible version of AdService that mocks ad functionality
 * since react-native-google-mobile-ads doesn't work on web.
 */
class AdService {
  private isInitialized: boolean = false;
  private lastAdShownTime: number = 0;
  private adAvailable: boolean = true;

  async initialize() {
    console.log('AdService (Web): Initializing mock ad service');
    this.isInitialized = true;
    return true;
  }

  async showRewardedAd(): Promise<boolean> {
    console.log('AdService (Web): Showing mock rewarded ad');
    
    // Simulate ad loading delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Always succeed on web
    this.lastAdShownTime = Date.now();
    this.adAvailable = false;
    
    // Grant temporary premium access
    this.grantTemporaryPremium();
    
    // Reset ad availability after 10 seconds (for testing)
    setTimeout(() => {
      this.adAvailable = true;
    }, 10000);
    
    return true;
  }

  async showInterstitialAd(): Promise<boolean> {
    console.log('AdService (Web): Showing mock interstitial ad');
    
    // Simulate ad loading delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  }

  async checkCanShowAd(): Promise<boolean> {
    // For web testing, allow showing ad if it's been more than 10 seconds
    const now = Date.now();
    const timeSinceLastAd = now - this.lastAdShownTime;
    const canShow = this.adAvailable || timeSinceLastAd > 10000; // 10 seconds for testing
    
    return canShow;
  }

  getTimeUntilNextAd(): number {
    if (this.adAvailable) return 0;
    
    const now = Date.now();
    const timeSinceLastAd = now - this.lastAdShownTime;
    const timeRemaining = Math.max(0, 10000 - timeSinceLastAd) / 1000; // Convert to seconds
    
    return Math.ceil(timeRemaining / 3600); // Convert to hours
  }

  private grantTemporaryPremium() {
    console.log('AdService (Web): Granting temporary premium access');
    // Grant 24 hour temporary premium access
    const now = new Date();
    const expiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    StorageService.setTemporaryPremium({
      grantedAt: now,
      expiresAt: expiryTime,
      source: 'ad_reward'
    });
  }

  async checkAdFreeStatus(): Promise<boolean> {
    // Check if user has ad-free status from subscription or temporary premium
    const hasSubscription = await StorageService.isPremiumActive();
    const tempPremium = StorageService.getTemporaryPremium();
    const tempPremiumExpiry = tempPremium ? new Date(tempPremium.expiresAt) : null;
    
    if (hasSubscription) return true;
    if (tempPremiumExpiry && tempPremiumExpiry.getTime() > Date.now()) return true;
    
    return false;
  }

  cleanup() {
    console.log('AdService (Web): Cleaning up');
    // Nothing to clean up in web implementation
  }
}

export default new AdService();
