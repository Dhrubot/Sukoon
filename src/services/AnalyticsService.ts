// src/services/AnalyticsService.ts
import analytics from '@react-native-firebase/analytics';
import logger from '../utils/logger';

type AnalyticsEvent =
  | 'app_open'
  | 'prayer_completed'
  | 'prayer_missed'
  | 'mindfulness_started'
  | 'mindfulness_completed'
  | 'notification_tapped'
  | 'premium_card_tapped'
  | 'premium_purchased'
  | 'ad_watched'
  | 'ad_failed'
  | 'donation_made'
  | 'streak_milestone'
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
      logger.log(`[Analytics] ${event}`, params);
    }

    if (!this.enabled) return;

    try {
      await analytics().logEvent(event, params);
    } catch (error) {
      logger.error('[Analytics] Failed to log event:', error);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await analytics().setUserProperty(name, value);
    } catch (error) {
      logger.error('[Analytics] Failed to set user property:', error);
    }
  }

  async logScreenView(screenName: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      });
    } catch (error) {
      logger.error('[Analytics] Failed to log screen view:', error);
    }
  }

  // Convenience: prayer
  async logPrayerCompleted(prayer: string, mindful: boolean): Promise<void> {
    await this.logEvent('prayer_completed', { prayer, mindful });
  }

  async logPrayerMissed(prayer: string): Promise<void> {
    await this.logEvent('prayer_missed', { prayer });
  }

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

  // Convenience: engagement
  async logStreakMilestone(days: number): Promise<void> {
    await this.logEvent('streak_milestone', { days });
  }

  async logMosqueModeActivated(): Promise<void> {
    await this.logEvent('mosque_mode_activated');
  }

  async logOnboardingCompleted(): Promise<void> {
    await this.logEvent('onboarding_completed');
  }
}

export default new AnalyticsService();
