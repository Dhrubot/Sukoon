import { Platform } from 'react-native';
import type { RewardedAd } from 'react-native-google-mobile-ads';
import StorageService from '../StorageService';
import AnalyticsService from '../AnalyticsService';
import logger from '../../utils/logger';

// Halal-safe keyword hints for AdMob ad targeting
const HALAL_KEYWORDS = [
  'education', 'technology', 'health', 'fitness',
  'business', 'travel', 'food', 'shopping', 'finance',
  'family', 'productivity', 'learning',
];

class AdService {
  private rewardedAd: RewardedAd | null = null;
  private isRewardedAdLoaded = false;
  private adRewardCallback: ((earned: boolean) => void) | null = null;
  private _initialized = false;
  private _lastError: string | null = null;
  private _retryCount = 0;
  private _maxRetries = 3;
  private _retryTimer: ReturnType<typeof setTimeout> | null = null;
  private sdk: any | null | undefined;

  private getSdk(): any | null {
    if (this.sdk !== undefined) {
      return this.sdk;
    }

    try {
      const module = require('react-native-google-mobile-ads');
      this.sdk = {
        AdEventType: module.AdEventType,
        RewardedAdEventType: module.RewardedAdEventType,
        TestIds: module.TestIds,
        MobileAds: module.MobileAds,
        MaxAdContentRating: module.MaxAdContentRating,
        RewardedAd: module.RewardedAd,
      };
    } catch (error) {
      logger.warn('MobileAds SDK unavailable:', error);
      this.sdk = null;
    }

    return this.sdk;
  }

  private getRewardedAdUnit(sdk: any): string | undefined {
    if (__DEV__) {
      return sdk.TestIds.REWARDED;
    }

    return Platform.select({
      ios: 'ca-app-pub-5474984690525462/3839513900',
      android: 'ca-app-pub-5474984690525462/5179116937',
    });
  }

  async initialize() {
    if (this._initialized) return true;
    try {
      const sdk = this.getSdk();
      if (!sdk) return false;
      // CRITICAL: SDK must be initialized before any ad requests
      await sdk.MobileAds().initialize();
      logger.log('MobileAds SDK initialized');
      await this.configureHalalFiltering(sdk);
      await this.loadRewardedAd(sdk);
      this._initialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize AdService:', error);
      this._lastError = String(error);
      return false;
    }
  }

  /**
   * Configure AdMob for halal-only content:
   * - MaxAdContentRating.G → general audiences (no mature content)
   * - requestNonPersonalizedAdsOnly → privacy-respecting
   *
   * IMPORTANT: You must also configure category blocking in the AdMob dashboard:
   *   AdMob > Blocking controls > Manage > Sensitive categories
   *   Block: Alcohol, Gambling, Dating, Sexual content, Political, Tobacco
   */
  private async configureHalalFiltering(sdk: any) {
    await sdk.MobileAds().setRequestConfiguration({
      maxAdContentRating: sdk.MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
    });
  }

  private async loadRewardedAd(existingSdk?: any) {
    const sdk = existingSdk ?? this.getSdk();
    if (!sdk) return;

    const rewardedAdUnit = this.getRewardedAdUnit(sdk);
    if (!rewardedAdUnit) return;

    const rewardedAd = sdk.RewardedAd.createForAdRequest(rewardedAdUnit, {
      requestNonPersonalizedAdsOnly: true,
      keywords: HALAL_KEYWORDS,
    });
    this.rewardedAd = rewardedAd;

    (rewardedAd as any).addAdEventListener(sdk.RewardedAdEventType.LOADED, () => {
      this.isRewardedAdLoaded = true;
      this._retryCount = 0;
      logger.log('Rewarded ad loaded');
    });

    (rewardedAd as any).addAdEventListener(sdk.RewardedAdEventType.EARNED_REWARD, () => {
      logger.log('User earned ad reward — granting 24h premium');
      if (this.adRewardCallback) {
        this.adRewardCallback(true);
        this.adRewardCallback = null;
      }
      this.grantTemporaryPremium();
      StorageService.setLastAdWatchTime(new Date());
      AnalyticsService.logAdWatched();
    });

    (rewardedAd as any).addAdEventListener(sdk.AdEventType.CLOSED, () => {
      this.isRewardedAdLoaded = false;
      void this.loadRewardedAd(); // Pre-load next ad
    });

    (rewardedAd as any).addAdEventListener(sdk.AdEventType.ERROR, (error: unknown) => {
      logger.warn('Rewarded ad error:', error);
      this._lastError = String(error);
      this.isRewardedAdLoaded = false;
      if (this.adRewardCallback) {
        this.adRewardCallback(false);
        this.adRewardCallback = null;
      }
      AnalyticsService.logAdFailed(String(error));
      this.retryLoadAd();
    });

    rewardedAd.load();
  }

  /**
   * Show a rewarded ad. Returns true if user earned the reward.
   */
  async showRewardedAd(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isRewardedAdLoaded || !this.rewardedAd) {
        logger.log('Rewarded ad not ready');
        resolve(false);
        return;
      }
      this.adRewardCallback = resolve;
      this.rewardedAd.show();
    });
  }

  private grantTemporaryPremium() {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    StorageService.setTemporaryPremium({
      grantedAt: new Date(),
      expiresAt,
      source: 'ad_reward',
    });

    const features = StorageService.getPremiumFeatures();
    Object.keys(features).forEach((key) => {
      features[key as keyof typeof features] = true;
    });
    StorageService.setPremiumFeatures(features);
  }

  /**
   * Check if user is eligible to watch an ad.
   * Only blocks for real subscribers — temporary premium from ad rewards
   * should NOT prevent watching more ads.
   * TODO: [PREMIUM] Re-add 24h cooldown when premium features are implemented:
   *   const lastWatch = StorageService.getLastAdWatchTime();
   *   if (lastWatch) {
   *     const hoursSince = (Date.now() - lastWatch.getTime()) / (1000 * 60 * 60);
   *     if (hoursSince < 24) return false;
   *   }
   */
  async canShowAd(): Promise<boolean> {
    const subscription = StorageService.getSubscription();
    if (subscription?.isActive) {
      if (subscription.type === 'lifetime') return false;
      if (subscription.expiryDate && new Date(subscription.expiryDate) > new Date()) {
        return false;
      }
    }

    return this.isRewardedAdLoaded;
  }

  /**
   * Hours remaining until user can watch next ad.
   * TODO: [PREMIUM] Re-add cooldown logic when premium features are implemented.
   * Currently always returns 0 (no cooldown).
   */
  getHoursUntilNextAd(): number {
    return 0;
  }

  isAdReady(): boolean {
    return this.isRewardedAdLoaded;
  }

  getLastError(): string | null {
    return this._lastError;
  }

  private retryLoadAd() {
    if (this._retryCount >= this._maxRetries) {
      logger.warn(`Ad load failed after ${this._maxRetries} retries`);
      return;
    }
    const delays = [5000, 15000, 30000];
    const delay = delays[this._retryCount] || 30000;
    this._retryCount++;
    logger.log(`Retrying ad load in ${delay / 1000}s (attempt ${this._retryCount}/${this._maxRetries})`);
    this._retryTimer = setTimeout(() => {
      void this.loadRewardedAd();
    }, delay);
  }

  /**
   * Get current ad-free status (premium subscription or temporary from ad).
   */
  async getAdFreeStatus(): Promise<{
    isAdFree: boolean;
    reason: 'premium' | 'temporary' | 'none';
    expiresAt?: Date;
  }> {
    const isPremium = await StorageService.isPremiumActive();
    if (isPremium) return { isAdFree: true, reason: 'premium' };

    const temp = StorageService.getTemporaryPremium();
    if (temp && new Date(temp.expiresAt) > new Date()) {
      return { isAdFree: true, reason: 'temporary', expiresAt: new Date(temp.expiresAt) };
    }

    return { isAdFree: false, reason: 'none' };
  }

  cleanup() {
    if (this._retryTimer) clearTimeout(this._retryTimer);
    this.rewardedAd = null;
    this.isRewardedAdLoaded = false;
    this._initialized = false;
    this._retryCount = 0;
    this._lastError = null;
  }
}

export default new AdService();
