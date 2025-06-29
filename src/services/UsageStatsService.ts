import { NativeModules, Platform } from 'react-native';
import { AppUsageData, UsageStats, ScreenTimeData } from '../types';

// Interface for the native module
interface UsageStatsModule {
  hasUsageStatsPermission(): Promise<boolean>;
  requestUsageStatsPermission(): Promise<void>;
  getUsageStats(startTime: number, endTime: number): Promise<UsageStats>;
  getTodayScreenTime(): Promise<ScreenTimeData>;
  getAppUsageForPeriod(packageName: string, startTime: number, endTime: number): Promise<number>;
  getUnlockCount(startTime: number, endTime: number): Promise<number>;
}

// Native module will be null on iOS
const UsageStatsNative = Platform.OS === 'android' ? NativeModules.UsageStatsModule as UsageStatsModule : null;

class UsageStatsService {
  private isAndroid = Platform.OS === 'android';
  private socialMediaApps = [
    'com.instagram.android',
    'com.twitter.android',
    'com.facebook.katana',
    'com.zhiliaoapp.musically', // TikTok
    'com.google.android.youtube',
    'com.whatsapp',
    'com.snapchat.android',
    'com.reddit.frontpage',
    'com.linkedin.android',
    'com.pinterest',
  ];

  async hasPermission(): Promise<boolean> {
    if (!this.isAndroid || !UsageStatsNative) return false;
    
    try {
      return await UsageStatsNative.hasUsageStatsPermission();
    } catch (error) {
      console.error('Error checking usage stats permission:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isAndroid || !UsageStatsNative) {
      console.log('Usage stats only available on Android');
      return false;
    }

    try {
      const hasPermission = await this.hasPermission();
      if (hasPermission) return true;

      await UsageStatsNative.requestUsageStatsPermission();
      // User will be redirected to settings, we can't know the result immediately
      return false;
    } catch (error) {
      console.error('Error requesting usage stats permission:', error);
      return false;
    }
  }

  async getTodayScreenTime(): Promise<ScreenTimeData | null> {
    if (!this.isAndroid || !UsageStatsNative) return null;

    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return null;

      const data = await UsageStatsNative.getTodayScreenTime();
      return {
        totalScreenTime: Math.round(data.totalScreenTime / 60), // Convert to minutes
        unlockCount: data.unlockCount,
        firstUnlock: data.firstUnlock ? new Date(data.firstUnlock) : null,
        lastUsed: data.lastUsed ? new Date(data.lastUsed) : null,
      };
    } catch (error) {
      console.error('Error getting screen time:', error);
      return null;
    }
  }

  async getUsageStats(startTime: Date, endTime: Date): Promise<UsageStats | null> {
    if (!this.isAndroid || !UsageStatsNative) return null;

    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return null;

      const stats = await UsageStatsNative.getUsageStats(
        startTime.getTime(),
        endTime.getTime()
      );

      // Process app usage data
      const appUsage: AppUsageData[] = [];
      let totalSocialMediaTime = 0;

      for (const [packageName, timeInMs] of Object.entries(stats.appUsage || {})) {
        const timeInMinutes = Math.round((((timeInMs as unknown) as number)) / 60000);
        
        if (this.socialMediaApps.includes(packageName)) {
          totalSocialMediaTime += timeInMinutes;
        }

        appUsage.push({
          packageName,
          appName: this.getAppDisplayName(packageName),
          timeSpent: timeInMinutes,
          category: this.getAppCategory(packageName),
          icon: packageName, // Native module can provide app icons
        });
      }

      // Sort by usage time
      appUsage.sort((a, b) => b.timeSpent - a.timeSpent);

      return {
        totalScreenTime: Math.round(stats.totalScreenTime / 60000), // minutes
        unlockCount: stats.unlockCount,
        appUsage: appUsage.slice(0, 10), // Top 10 apps
        socialMediaTime: totalSocialMediaTime,
        productiveTime: this.calculateProductiveTime(appUsage),
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  }

  async getScreenTimeBeforePrayer(prayerTime: Date, minutesBefore: number = 30): Promise<number> {
    if (!this.isAndroid || !UsageStatsNative) return 0;

    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return 0;

      const endTime = prayerTime.getTime();
      const startTime = endTime - (minutesBefore * 60 * 1000);

      const stats = await UsageStatsNative.getUsageStats(startTime, endTime);
      return Math.round(stats.totalScreenTime / 60000); // minutes
    } catch (error) {
      console.error('Error getting pre-prayer screen time:', error);
      return 0;
    }
  }

  async getUnlockCountBeforePrayer(prayerTime: Date, minutesBefore: number = 30): Promise<number> {
    if (!this.isAndroid || !UsageStatsNative) return 0;

    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return 0;

      const endTime = prayerTime.getTime();
      const startTime = endTime - (minutesBefore * 60 * 1000);

      return await UsageStatsNative.getUnlockCount(startTime, endTime);
    } catch (error) {
      console.error('Error getting unlock count:', error);
      return 0;
    }
  }

  async getWeeklyUsagePattern(): Promise<{ [key: string]: number }> {
    if (!this.isAndroid || !UsageStatsNative) return {};

    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return {};

      const pattern: { [key: string]: number } = {};
      const now = new Date();

      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const stats = await UsageStatsNative.getUsageStats(
          date.getTime(),
          nextDay.getTime()
        );

        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        pattern[dayName] = Math.round(stats.totalScreenTime / 60000); // minutes
      }

      return pattern;
    } catch (error) {
      console.error('Error getting weekly pattern:', error);
      return {};
    }
  }

  async getSocialMediaUsage(startTime: Date, endTime: Date): Promise<AppUsageData[]> {
    if (!this.isAndroid || !UsageStatsNative) return [];

    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return [];

      const socialUsage: AppUsageData[] = [];

      for (const packageName of this.socialMediaApps) {
        const timeInMs = await UsageStatsNative.getAppUsageForPeriod(
          packageName,
          startTime.getTime(),
          endTime.getTime()
        );

        if (timeInMs > 0) {
          socialUsage.push({
            packageName,
            appName: this.getAppDisplayName(packageName),
            timeSpent: Math.round(timeInMs / 60000), // minutes
            category: 'social',
            icon: packageName,
          });
        }
      }

      return socialUsage.sort((a, b) => b.timeSpent - a.timeSpent);
    } catch (error) {
      console.error('Error getting social media usage:', error);
      return [];
    }
  }

  private getAppDisplayName(packageName: string): string {
    const appNames: { [key: string]: string } = {
      'com.instagram.android': 'Instagram',
      'com.twitter.android': 'Twitter',
      'com.facebook.katana': 'Facebook',
      'com.zhiliaoapp.musically': 'TikTok',
      'com.google.android.youtube': 'YouTube',
      'com.whatsapp': 'WhatsApp',
      'com.snapchat.android': 'Snapchat',
      'com.reddit.frontpage': 'Reddit',
      'com.linkedin.android': 'LinkedIn',
      'com.pinterest': 'Pinterest',
      'com.google.android.apps.docs': 'Google Docs',
      'com.microsoft.office.word': 'Word',
      'com.google.android.apps.classroom': 'Classroom',
    };

    return appNames[packageName] || packageName.split('.').pop() || packageName;
  }

  private getAppCategory(packageName: string): 'social' | 'productivity' | 'entertainment' | 'other' {
    if (this.socialMediaApps.includes(packageName)) return 'social';
    
    const productivityApps = [
      'com.google.android.apps.docs',
      'com.microsoft.office',
      'com.notion',
      'com.todoist',
    ];
    
    const entertainmentApps = [
      'com.netflix.mediaclient',
      'com.spotify.music',
      'com.google.android.youtube',
    ];

    if (productivityApps.some(app => packageName.includes(app))) return 'productivity';
    if (entertainmentApps.some(app => packageName.includes(app))) return 'entertainment';
    
    return 'other';
  }

  private calculateProductiveTime(appUsage: AppUsageData[]): number {
    return appUsage
      .filter(app => app.category === 'productivity')
      .reduce((total, app) => total + app.timeSpent, 0);
  }

  // Get focus score based on usage patterns
  calculateFocusScore(screenTime: number, unlockCount: number, socialMediaTime: number): number {
    // Base score
    let score = 100;

    // Deduct for screen time (lose 1 point per 10 minutes)
    score -= Math.floor(screenTime / 10);

    // Deduct for unlocks (lose 2 points per 10 unlocks)
    score -= Math.floor(unlockCount / 10) * 2;

    // Heavy penalty for social media (lose 2 points per 5 minutes)
    score -= Math.floor(socialMediaTime / 5) * 2;

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  // Get usage insights
  getUsageInsights(stats: UsageStats): string[] {
    const insights: string[] = [];

    if (stats.totalScreenTime > 180) { // 3 hours
      insights.push('You spent over 3 hours on your phone today. Consider setting app timers.');
    }

    if (stats.unlockCount > 100) {
      insights.push('You unlocked your phone over 100 times. Try keeping it in another room during prayers.');
    }

    if (stats.socialMediaTime > 60) {
      insights.push(`You spent ${stats.socialMediaTime} minutes on social media. Consider a digital detox.`);
    }

    if (stats.productiveTime > stats.socialMediaTime) {
      insights.push('Great job! You used your phone more for productive apps than social media.');
    }

    const topApp = stats.appUsage[0];
    if (topApp && topApp.timeSpent > 60) {
      insights.push(`You spent ${topApp.timeSpent} minutes on ${topApp.appName}. Is this aligned with your goals?`);
    }

    return insights;
  }
}

export default new UsageStatsService();