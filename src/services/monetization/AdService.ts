import { Platform } from 'react-native';
import {
  AdEventType,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  MobileAds,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';
import StorageService from '../StorageService';

// Ad Unit IDs (use test IDs for development)
const AD_UNITS = {
  REWARDED: __DEV__ 
    ? TestIds.REWARDED
    : Platform.select({
        ios: 'ca-app-pub-5474984690525462/3839513900', // Replace with your iOS ad unit ID
        android: 'ca-app-pub-5474984690525462/5179116937', // Replace with your Android ad unit ID
      }),
  INTERSTITIAL: __DEV__
    ? TestIds.INTERSTITIAL
    : Platform.select({
        ios: 'ca-app-pub-5474984690525462/7038993514',
        android: 'ca-app-pub-5474984690525462/9128619163',
      }),
};

// Halal ad categories to include
const HALAL_CATEGORIES = [
  'Education',
  'Technology',
  'Health & Fitness',
  'Business',
  'Travel',
  'Food & Drink',
  'Shopping',
  'Finance',
  'Real Estate',
];

// Categories to explicitly exclude
const HARAM_CATEGORIES = [
  'Alcohol',
  'Gambling',
  'Dating',
  'Adult Content',
  'Tobacco',
  'Political',
  'Social Casino Games',
];

class AdService {
  private rewardedAd: RewardedAd | null = null;
  private interstitialAd: InterstitialAd | null = null;
  private isRewardedAdLoaded = false;
  private isInterstitialAdLoaded = false;
  private adRewardCallback: ((earned: boolean) => void) | null = null;

  async initialize() {
    try {
      // Configure ad settings for halal content
      await this.configureAdSettings();

      // Initialize ads
      this.initializeRewardedAd();
      this.initializeInterstitialAd();

      return true;
    } catch (error) {
      console.error('Failed to initialize ads:', error);
      return false;
    }
  }

  private async configureAdSettings() {
    try {
      // Set content filtering
      await MobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G, // General audiences
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
      });

      // Note: Category filtering would need to be implemented server-side
      // through AdMob dashboard or mediation platform
    } catch (error) {
      console.error('Failed to configure ad settings:', error);
    }
  }

  private initializeRewardedAd() {
    if (!AD_UNITS.REWARDED) return;

    this.rewardedAd = RewardedAd.createForAdRequest(AD_UNITS.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
      keywords: HALAL_CATEGORIES,
    });

    // Set up event listeners
    this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      this.isRewardedAdLoaded = true;
      console.log('Rewarded ad loaded');
    });

    this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      console.log('User earned reward');
      if (this.adRewardCallback) {
        this.adRewardCallback(true);
        this.adRewardCallback = null;
      }
      
      // Grant 24-hour premium access
      this.grantTemporaryPremium();
    });

    this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      // Load next ad
      this.isRewardedAdLoaded = false;
      this.rewardedAd?.load();
    });

    this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Rewarded ad error:', error);
      this.isRewardedAdLoaded = false;
      if (this.adRewardCallback) {
        this.adRewardCallback(false);
        this.adRewardCallback = null;
      }
    });

    // Load the first ad
    this.rewardedAd.load();
  }

  private initializeInterstitialAd() {
    if (!AD_UNITS.INTERSTITIAL) return;

    this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
      keywords: HALAL_CATEGORIES,
      // Use negative keywords for categories to avoid
      // Note: This is an additional hint to AdMob, but server-side configuration is still recommended
      contentUrl: `https://prayerbuddy.app/adpolicy?exclude=${HARAM_CATEGORIES.join(',')}`,
    });

    this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      this.isInterstitialAdLoaded = true;
      console.log('Interstitial ad loaded');
    });

    this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      // Load next ad
      this.isInterstitialAdLoaded = false;
      this.interstitialAd?.load();
    });

    this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Interstitial ad error:', error);
      this.isInterstitialAdLoaded = false;
    });

    // Load the first ad
    this.interstitialAd.load();
  }

  async showRewardedAd(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isRewardedAdLoaded || !this.rewardedAd) {
        console.log('Rewarded ad not ready');
        resolve(false);
        return;
      }

      this.adRewardCallback = resolve;
      this.rewardedAd.show();
    });
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!this.isInterstitialAdLoaded || !this.interstitialAd) {
      console.log('Interstitial ad not ready');
      return false;
    }

    try {
      await this.interstitialAd.show();
      return true;
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  private grantTemporaryPremium() {
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24);

    StorageService.setTemporaryPremium({
      grantedAt: new Date(),
      expiresAt: expiryTime,
      source: 'ad_reward',
    });

    // Enable premium features temporarily
    const features = StorageService.getPremiumFeatures();
    Object.keys(features).forEach(key => {
      features[key as keyof typeof features] = true;
    });
    StorageService.setPremiumFeatures(features);
  }

  async checkCanShowAd(): Promise<boolean> {
    // Check if user has already watched an ad today
    const lastAdWatch = StorageService.getLastAdWatchTime();
    if (lastAdWatch) {
      const hoursSinceLastAd = (Date.now() - lastAdWatch.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAd < 24) {
        return false; // Already watched today
      }
    }

    // Check if user is premium
    const isPremium = await StorageService.isPremiumActive();
    if (isPremium) {
      return false; // Premium users don't need ads
    }

    return this.isRewardedAdLoaded;
  }

  getTimeUntilNextAd(): number {
    const lastAdWatch = StorageService.getLastAdWatchTime();
    if (!lastAdWatch) return 0;

    const hoursSinceLastAd = (Date.now() - lastAdWatch.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, 24 - hoursSinceLastAd);
    
    return Math.ceil(hoursRemaining);
  }

  isAdReady(): boolean {
    return this.isRewardedAdLoaded;
  }

  // Get ad-free experience status
  async getAdFreeStatus(): Promise<{
    isAdFree: boolean;
    reason: 'premium' | 'temporary' | 'none';
    expiresAt?: Date;
  }> {
    // Check premium subscription
    const isPremium = await StorageService.isPremiumActive();
    if (isPremium) {
      return { isAdFree: true, reason: 'premium' };
    }

    // Check temporary premium from ad
    const tempPremium = StorageService.getTemporaryPremium();
    if (tempPremium && tempPremium.expiresAt > new Date()) {
      return {
        isAdFree: true,
        reason: 'temporary',
        expiresAt: tempPremium.expiresAt,
      };
    }

    return { isAdFree: false, reason: 'none' };
  }

  cleanup() {
    // Clean up ad instances
    this.rewardedAd = null;
    this.interstitialAd = null;
  }
}

export default new AdService();