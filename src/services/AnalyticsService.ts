// src/services/AnalyticsService.ts
import { getAnalytics, logEvent as fbLogEvent, setUserProperty as fbSetUserProperty, logScreenView as fbLogScreenView } from '@react-native-firebase/analytics';
import logger from '../utils/logger';

// Religious practice events (prayer_completed, prayer_missed, mindfulness_started/completed,
// dawam_milestone) are intentionally EXCLUDED. Sukoon's privacy promise is that spiritual
// practice data never leaves the device. These events must never be sent to Firebase.
type AnalyticsEvent =
  | 'app_open'
  | 'notification_tapped'
  | 'premium_card_tapped'
  | 'premium_purchased'
  | 'ad_watched'
  | 'ad_failed'
  | 'donation_made'
  | 'qibla_opened'
  | 'mosque_mode_activated'
  | 'mosque_mode_deactivated'
  | 'settings_changed'
  | 'onboarding_completed';

interface AnalyticsParams {
  [key: string]: string | number | boolean | undefined;
}

class AnalyticsService {
  private enabled = true;

  async logEvent(event: AnalyticsEvent, params?: AnalyticsParams): Promise<void> {
    if (__DEV__) {
      logger.log(`[Analytics] ${event}`);
    }

    if (!this.enabled) return;

    try {
      await fbLogEvent(getAnalytics(), event, params);
    } catch (error) {
      logger.error('[Analytics] Failed to log event:', error);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await fbSetUserProperty(getAnalytics(), name, value);
    } catch (error) {
      logger.error('[Analytics] Failed to set user property:', error);
    }
  }

  async logScreenView(screenName: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await fbLogScreenView(getAnalytics(), {
        screen_name: screenName,
        screen_class: screenName,
      });
    } catch (error) {
      logger.error('[Analytics] Failed to log screen view:', error);
    }
  }

  // No-ops: religious practice data never leaves the device
  async logPrayerCompleted(_prayer: string, _mindful: boolean): Promise<void> { }
  async logPrayerMissed(_prayer: string): Promise<void> { }

  // Convenience: monetization
  async logPremiumPurchased(plan: string): Promise<void> {
    await this.logEvent('premium_purchased', { plan });
  }

  async logAdWatched(): Promise<void> {
    await this.logEvent('ad_watched');
  }

  async logAdFailed(reason: string): Promise<void> {
    await this.logEvent('ad_failed', { reason });
  }

  async logDonationMade(tier: string, amount: number): Promise<void> {
    await this.logEvent('donation_made', { tier, amount });
  }

  // No-op: dawam streaks are spiritual practice data — stays on device
  async logDawamMilestone(_days: number): Promise<void> { }

  async logMosqueModeActivated(): Promise<void> {
    await this.logEvent('mosque_mode_activated');
  }

  async logOnboardingCompleted(): Promise<void> {
    await this.logEvent('onboarding_completed');
  }
}

export default new AnalyticsService();
