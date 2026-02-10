import { Platform } from 'react-native';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  MobileAds,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';
import StorageService from '../StorageService';
import AnalyticsService from '../AnalyticsService';
import logger from '../../utils/logger';

// Rewarded Ad Unit IDs — users opt-in to watch a halal ad to support the app
const REWARDED_AD_UNIT = __DEV__
  ? TestIds.REWARDED
  : Platform.select({
      ios: 'ca-app-pub-5474984690525462/3839513900',
      android: 'ca-app-pub-5474984690525462/5179116937',
    });

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

  async initialize() {
    if (this._initialized) return true;
    try {
      // CRITICAL: SDK must be initialized before any ad requests
      await MobileAds().initialize();
      logger.log('MobileAds SDK initialized');
      await this.configureHalalFiltering();
      this.loadRewardedAd();
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
  private async configureHalalFiltering() {
    await MobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
    });
  }

  private loadRewardedAd() {
    if (!REWARDED_AD_UNIT) return;

    this.rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT, {
      requestNonPersonalizedAdsOnly: true,
      keywords: HALAL_KEYWORDS,
    });

    this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      this.isRewardedAdLoaded = true;
      logger.log('Rewarded ad loaded');
    });

    this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      logger.log('User earned ad reward — granting 24h premium');
      if (this.adRewardCallback) {
        this.adRewardCallback(true);
        this.adRewardCallback = null;
      }
      this.grantTemporaryPremium();
      StorageService.setLastAdWatchTime(new Date());
      AnalyticsService.logAdWatched();
    });

    this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      this.isRewardedAdLoaded = false;
      this.loadRewardedAd(); // Pre-load next ad
    });

    this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
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

    this.rewardedAd.load();
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
   * Check if user is eligible to watch an ad (not premium, not watched in last 24h).
   */
  async canShowAd(): Promise<boolean> {
    const isPremium = await StorageService.isPremiumActive();
    if (isPremium) return false;

    const lastWatch = StorageService.getLastAdWatchTime();
    if (lastWatch) {
      const hoursSince = (Date.now() - lastWatch.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) return false;
    }

    return this.isRewardedAdLoaded;
  }

  /**
   * Hours remaining until user can watch next ad.
   */
  getHoursUntilNextAd(): number {
    const lastWatch = StorageService.getLastAdWatchTime();
    if (!lastWatch) return 0;
    const hoursSince = (Date.now() - lastWatch.getTime()) / (1000 * 60 * 60);
    return Math.max(0, Math.ceil(24 - hoursSince));
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
      this.loadRewardedAd();
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