// src/services/AnalyticsService.ts
//
// Firebase Analytics scaffolding for Sukoon.
// To activate: install @react-native-firebase/app and @react-native-firebase/analytics,
// then uncomment the firebase imports and replace the stub implementations.
//
import logger from '../utils/logger';

// TODO: Uncomment when firebase is installed
// import analytics from '@react-native-firebase/analytics';

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
  | 'donation_made'
  | 'streak_milestone'
  | 'qibla_opened'
  | 'mosque_mode_activated'
  | 'settings_changed';

interface AnalyticsParams {
  [key: string]: string | number | boolean | undefined;
}

class AnalyticsService {
  private enabled = !__DEV__; // Only track in production

  async logEvent(event: AnalyticsEvent, params?: AnalyticsParams): Promise<void> {
    if (!this.enabled) {
      logger.log(`[Analytics] ${event}`, params);
      return;
    }

    try {
      // TODO: Uncomment when firebase is installed
      // await analytics().logEvent(event, params);
    } catch (error) {
      logger.error('[Analytics] Failed to log event:', error);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    if (!this.enabled) return;

    try {
      // TODO: Uncomment when firebase is installed
      // await analytics().setUserProperty(name, value);
    } catch (error) {
      logger.error('[Analytics] Failed to set user property:', error);
    }
  }

  async logScreenView(screenName: string): Promise<void> {
    if (!this.enabled) return;

    try {
      // TODO: Uncomment when firebase is installed
      // await analytics().logScreenView({ screen_name: screenName, screen_class: screenName });
    } catch (error) {
      logger.error('[Analytics] Failed to log screen view:', error);
    }
  }

  // Convenience methods for common events
  async logPrayerCompleted(prayer: string, mindful: boolean): Promise<void> {
    await this.logEvent('prayer_completed', { prayer, mindful });
  }

  async logPremiumPurchased(plan: string): Promise<void> {
    await this.logEvent('premium_purchased', { plan });
  }

  async logAdWatched(): Promise<void> {
    await this.logEvent('ad_watched');
  }

  async logStreakMilestone(days: number): Promise<void> {
    await this.logEvent('streak_milestone', { days });
  }
}

export default new AnalyticsService();
