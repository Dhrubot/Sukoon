import StorageService from './StorageService';
import { Achievement, PrayerRecord } from '../types';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { PRAYER_NAMES as PrayerName } from '../constants';

export interface AchievementDefinition extends Achievement {
  category: 'prayer' | 'streak' | 'mindfulness' | 'focus' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  checkCondition: () => boolean | Promise<boolean>;
}

class AchievementService {
  private achievements: AchievementDefinition[] = [
    // Prayer Achievements
    {
      id: 'first_prayer',
      name: 'First Step',
      description: 'Complete your first prayer',
      icon: '🌟',
      category: 'prayer',
      tier: 'bronze',
      target: 1,
      checkCondition: async () => {
        const allTime = await this.getTotalPrayersCount();
        return allTime >= 1;
      },
    },
    {
      id: 'perfect_day',
      name: 'Perfect Day',
      description: 'Complete all 5 prayers in one day',
      icon: '✨',
      category: 'prayer',
      tier: 'silver',
      target: 5,
      checkCondition: () => {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = StorageService.getDayPrayerRecords(today);
        return todayRecords.filter(r => r.status === 'prayed').length === 5;
      },
    },
    {
      id: 'prayer_25',
      name: 'Quarter Century',
      description: 'Complete 25 prayers',
      icon: '🎯',
      category: 'prayer',
      tier: 'bronze',
      target: 25,
      checkCondition: async () => {
        const allTime = await this.getTotalPrayersCount();
        return allTime >= 25;
      },
    },
    {
      id: 'prayer_100',
      name: 'Century',
      description: 'Complete 100 prayers',
      icon: '💯',
      category: 'prayer',
      tier: 'silver',
      target: 100,
      checkCondition: async () => {
        const allTime = await this.getTotalPrayersCount();
        return allTime >= 100;
      },
    },
    {
      id: 'prayer_500',
      name: 'Devoted Worshipper',
      description: 'Complete 500 prayers',
      icon: '🕌',
      category: 'prayer',
      tier: 'gold',
      target: 500,
      checkCondition: async () => {
        const allTime = await this.getTotalPrayersCount();
        return allTime >= 500;
      },
    },
    {
      id: 'prayer_1000',
      name: 'Thousand Blessings',
      description: 'Complete 1000 prayers',
      icon: '🏆',
      category: 'prayer',
      tier: 'platinum',
      target: 1000,
      checkCondition: async () => {
        const allTime = await this.getTotalPrayersCount();
        return allTime >= 1000;
      },
    },

    // Streak Achievements
    {
      id: 'streak_3',
      name: 'Getting Started',
      description: 'Maintain a 3-day streak',
      icon: '🔥',
      category: 'streak',
      tier: 'bronze',
      target: 3,
      checkCondition: () => {
        const streak = StorageService.getCurrentStreak();
        return streak >= 3;
      },
    },
    {
      id: 'streak_7',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '📅',
      category: 'streak',
      tier: 'silver',
      target: 7,
      checkCondition: () => {
        const streak = StorageService.getCurrentStreak();
        return streak >= 7;
      },
    },
    {
      id: 'streak_30',
      name: 'Monthly Master',
      description: 'Maintain a 30-day streak',
      icon: '🌙',
      category: 'streak',
      tier: 'gold',
      target: 30,
      checkCondition: () => {
        const streak = StorageService.getCurrentStreak();
        return streak >= 30;
      },
    },
    {
      id: 'streak_100',
      name: 'Century of Consistency',
      description: 'Maintain a 100-day streak',
      icon: '💎',
      category: 'streak',
      tier: 'platinum',
      target: 100,
      checkCondition: () => {
        const streak = StorageService.getCurrentStreak();
        return streak >= 100;
      },
    },

    // Mindfulness Achievements
    {
      id: 'mindful_first',
      name: 'Mindful Beginning',
      description: 'Complete your first mindfulness session',
      icon: '🧘',
      category: 'mindfulness',
      tier: 'bronze',
      target: 1,
      checkCondition: async () => {
        const count = await this.getMindfulnessCount();
        return count >= 1;
      },
    },
    {
      id: 'mindful_10',
      name: 'Mindful Practitioner',
      description: 'Complete 10 mindfulness sessions',
      icon: '🌸',
      category: 'mindfulness',
      tier: 'silver',
      target: 10,
      checkCondition: async () => {
        const count = await this.getMindfulnessCount();
        return count >= 10;
      },
    },
    {
      id: 'mindful_50',
      name: 'Zen Master',
      description: 'Complete 50 mindfulness sessions',
      icon: '🪷',
      category: 'mindfulness',
      tier: 'gold',
      target: 50,
      checkCondition: async () => {
        const count = await this.getMindfulnessCount();
        return count >= 50;
      },
    },

    // Focus Achievements
    {
      id: 'focus_high',
      name: 'Laser Focus',
      description: 'Achieve 90%+ focus score 5 times',
      icon: '🎯',
      category: 'focus',
      tier: 'silver',
      target: 5,
      checkCondition: async () => {
        const count = await this.getHighFocusCount();
        return count >= 5;
      },
    },
    {
      id: 'focus_perfect_week',
      name: 'Perfect Focus Week',
      description: 'Maintain 80%+ average focus for a week',
      icon: '⭐',
      category: 'focus',
      tier: 'gold',
      target: 7,
      checkCondition: async () => {
        const avgFocus = await this.getWeeklyAverageFocus();
        return avgFocus >= 80;
      },
    },

    // Reflection Achievements
    {
      id: 'reflection_10',
      name: 'Thoughtful',
      description: 'Add reflections to 10 prayers',
      icon: '💭',
      category: 'mindfulness',
      tier: 'bronze',
      target: 10,
      checkCondition: async () => {
        const count = await this.getReflectionCount();
        return count >= 10;
      },
    },
    {
      id: 'reflection_50',
      name: 'Deep Thinker',
      description: 'Add reflections to 50 prayers',
      icon: '📖',
      category: 'mindfulness',
      tier: 'silver',
      target: 50,
      checkCondition: async () => {
        const count = await this.getReflectionCount();
        return count >= 50;
      },
    },

    // Special Achievements
    {
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Pray Fajr on time for 7 consecutive days',
      icon: '🌅',
      category: 'special',
      tier: 'gold',
      target: 7,
      checkCondition: async () => {
        const count = await this.getConsecutiveFajrCount();
        return count >= 7;
      },
    },
    {
      id: 'night_owl',
      name: 'Night Owl',
      description: 'Never miss Isha for 30 days',
      icon: '🌃',
      category: 'special',
      tier: 'gold',
      target: 30,
      checkCondition: async () => {
        const count = await this.getConsecutiveIshaCount();
        return count >= 30;
      },
    },
    {
      id: 'ramadan_warrior',
      name: 'Ramadan Warrior',
      description: 'Perfect prayers during Ramadan',
      icon: '🌙',
      category: 'special',
      tier: 'platinum',
      target: 30,
      checkCondition: async () => {
        // Check if current month is Ramadan and perfect streak
        return false; // Implement Ramadan detection
      },
    },
    {
      id: 'comeback_king',
      name: 'Comeback King',
      description: 'Return to perfect day after missing prayers',
      icon: '💪',
      category: 'special',
      tier: 'silver',
      checkCondition: async () => {
        return await this.checkComebackAchievement();
      },
    },
  ];

  async checkAchievements(): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = [];
    const storedAchievements = StorageService.getAchievements();

    for (const achievement of this.achievements) {
      const stored = storedAchievements.find(a => a.id === achievement.id);
      
      if (!stored?.unlockedAt) {
        try {
          const isUnlocked = await achievement.checkCondition();
          
          if (isUnlocked) {
            // Update progress
            const progress = await this.getAchievementProgress(achievement);
            achievement.progress = progress;
            
            // Unlock achievement
            StorageService.unlockAchievement(achievement.id);
            unlockedAchievements.push({
              ...achievement,
              unlockedAt: new Date(),
            });

            // Send notification
            await this.notifyAchievementUnlocked(achievement);
          } else if (achievement.target) {
            // Update progress for progressive achievements
            const progress = await this.getAchievementProgress(achievement);
            StorageService.updateAchievementProgress(achievement.id, progress);
          }
        } catch (error) {
          console.error(`Error checking achievement ${achievement.id}:`, error);
        }
      }
    }

    return unlockedAchievements;
  }

  private async notifyAchievementUnlocked(achievement: AchievementDefinition) {
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏆 Achievement Unlocked!',
        body: `${achievement.name}: ${achievement.description}`,
        data: { 
          type: 'achievement',
          achievementId: achievement.id,
        },
      },
      trigger: null, // Immediate
    });
  }

  private async getAchievementProgress(achievement: AchievementDefinition): Promise<number> {
    if (!achievement.target) return 0;

    switch (achievement.id) {
      case 'first_prayer':
      case 'prayer_25':
      case 'prayer_100':
      case 'prayer_500':
      case 'prayer_1000':
        return await this.getTotalPrayersCount();
        
      case 'streak_3':
      case 'streak_7':
      case 'streak_30':
      case 'streak_100':
        return StorageService.getCurrentStreak();
        
      case 'mindful_first':
      case 'mindful_10':
      case 'mindful_50':
        return await this.getMindfulnessCount();
        
      case 'reflection_10':
      case 'reflection_50':
        return await this.getReflectionCount();
        
      case 'focus_high':
        return await this.getHighFocusCount();
        
      case 'early_bird':
        return await this.getConsecutiveFajrCount();
        
      case 'night_owl':
        return await this.getConsecutiveIshaCount();
        
      default:
        return 0;
    }
  }

  // Helper methods for counting
  private async getTotalPrayersCount(): Promise<number> {
    let count = 0;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365); // Last year

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const records = StorageService.getDayPrayerRecords(dateStr);
      count += records.filter(r => r.status === 'prayed').length;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  private async getMindfulnessCount(): Promise<number> {
    let count = 0;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const records = StorageService.getDayPrayerRecords(dateStr);
      count += records.filter(r => r.mindfulnessCompleted).length;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  private async getReflectionCount(): Promise<number> {
    let count = 0;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const records = StorageService.getDayPrayerRecords(dateStr);
      count += records.filter(r => r.reflectionAdded).length;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  private async getHighFocusCount(): Promise<number> {
    let count = 0;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const records = StorageService.getDayPrayerRecords(dateStr);
      count += records.filter(r => r.focusScore && r.focusScore >= 90).length;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  private async getWeeklyAverageFocus(): Promise<number> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // Last 7 days

    const stats = StorageService.getStatsInRange(startDate, endDate);
    return stats.averageFocusScore;
  }

  private async getConsecutiveFajrCount(): Promise<number> {
    let count = 0;
    const endDate = new Date();
    const currentDate = new Date();

    // Check backwards from today
    for (let i = 0; i < 30; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const records = StorageService.getDayPrayerRecords(dateStr);
      const fajr = records.find(r => r.prayer === PrayerName.fajr && r.status === 'prayed');
      
      if (fajr) {
        count++;
      } else {
        break; // Streak broken
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return count;
  }

  private async getConsecutiveIshaCount(): Promise<number> {
    let count = 0;
    const currentDate = new Date();

    // Check backwards from today
    for (let i = 0; i < 60; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const records = StorageService.getDayPrayerRecords(dateStr);
      const isha = records.find(r => r.prayer === PrayerName.isha && r.status === 'prayed');
      
      if (isha) {
        count++;
      } else {
        break; // Streak broken
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return count;
  }

  private async checkComebackAchievement(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const todayRecords = StorageService.getDayPrayerRecords(today);
    const yesterdayRecords = StorageService.getDayPrayerRecords(yesterdayStr);

    const todayComplete = todayRecords.filter(r => r.status === 'prayed').length === 5;
    const yesterdayIncomplete = yesterdayRecords.filter(r => r.status === 'prayed').length < 5;

    return todayComplete && yesterdayIncomplete;
  }

  getAchievementCategories() {
    return {
      prayer: this.achievements.filter(a => a.category === 'prayer'),
      streak: this.achievements.filter(a => a.category === 'streak'),
      mindfulness: this.achievements.filter(a => a.category === 'mindfulness'),
      focus: this.achievements.filter(a => a.category === 'focus'),
      special: this.achievements.filter(a => a.category === 'special'),
    };
  }

  getAchievementsByTier() {
    return {
      bronze: this.achievements.filter(a => a.tier === 'bronze'),
      silver: this.achievements.filter(a => a.tier === 'silver'),
      gold: this.achievements.filter(a => a.tier === 'gold'),
      platinum: this.achievements.filter(a => a.tier === 'platinum'),
    };
  }

  getAllAchievements(): AchievementDefinition[] {
    return this.achievements;
  }
}

export default new AchievementService();