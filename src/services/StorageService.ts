import { MMKV } from 'react-native-mmkv';
import { 
  UserSettings, 
  PrayerRecord, 
  MindfulnessSession,
  DailyStats,
  Achievement,
  Location,
  CalculationMethod 
} from '../types';
import { createStorage } from './StorageAdapter';

class StorageService {
  // private storage: MMKV;
  
  // constructor() {
  //   this.storage = new MMKV({
  //     id: 'prayer-buddy-storage',
  //     encryptionKey: 'prayer-buddy-encryption-key' // In production, generate secure key
  //   });
  // }

  private storage;
  
  constructor() {
    this.storage = createStorage({
      id: 'prayer-buddy-storage',
      encryptionKey: 'prayer-buddy-encryption-key' // In production, generate secure key
    });
  }

  // User Settings
  getUserSettings(): UserSettings | null {
    const data = this.storage.getString('user_settings');
    return data ? JSON.parse(data) : null;
  }

  setUserSettings(settings: UserSettings): void {
    this.storage.set('user_settings', JSON.stringify(settings));
  }

  updateUserSettings(updates: Partial<UserSettings>): void {
    const current = this.getUserSettings();
    const updated = { ...current, ...updates };
    this.setUserSettings(updated as UserSettings);
  }

  // Default settings for new users
  getDefaultSettings(): UserSettings {
    return {
      location: {
        latitude: 0,
        longitude: 0,
        city: 'Unknown',
        country: 'Unknown'
      },
      calculationMethod: 'MWL',
      asrJuristic: 'Standard',
      adjustments: {
        fajr: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0
      },
      notifications: {
        enabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        beforePrayer: 10,
        reminderText: 'Time for {prayer} prayer 🕌'
      },
      theme: 'auto'
    };
  }

  // Prayer Records
  savePrayerRecord(record: PrayerRecord): void {
    const key = `prayer_${record.date}_${record.prayer}`;
    this.storage.set(key, JSON.stringify(record));
    
    // Update daily stats
    this.updateDailyStats(record.date);
  }

  getPrayerRecord(date: string, prayer: string): PrayerRecord | null {
    const key = `prayer_${date}_${prayer}`;
    const data = this.storage.getString(key);
    return data ? JSON.parse(data) : null;
  }

  getDayPrayerRecords(date: string): PrayerRecord[] {
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const records: PrayerRecord[] = [];
    
    prayers.forEach(prayer => {
      const record = this.getPrayerRecord(date, prayer);
      if (record) records.push(record);
    });
    
    return records;
  }

  // Mindfulness Sessions
  saveMindfulnessSession(session: MindfulnessSession): void {
    const key = `mindfulness_${session.id}`;
    this.storage.set(key, JSON.stringify(session));
    
    // Link to prayer record
    const date = new Date(session.startedAt).toISOString().split('T')[0];
    const prayerRecord = this.getPrayerRecord(date, session.prayerName);
    if (prayerRecord) {
      prayerRecord.mindfulnessCompleted = true;
      if (session.reflection) {
        prayerRecord.reflectionAdded = true;
        prayerRecord.focusScore = session.reflection.mood * 20; // Convert 1-5 to 0-100
      }
      this.savePrayerRecord(prayerRecord);
    }
  }

  getMindfulnessSession(id: string): MindfulnessSession | null {
    const data = this.storage.getString(`mindfulness_${id}`);
    return data ? JSON.parse(data) : null;
  }

  // Daily Stats
  getDailyStats(date: string): DailyStats | null {
    const data = this.storage.getString(`daily_stats_${date}`);
    return data ? JSON.parse(data) : null;
  }

  updateDailyStats(date: string): void {
    const records = this.getDayPrayerRecords(date);
    const prayedCount = records.filter(r => r.status === 'prayed').length;
    const mindfulnessCount = records.filter(r => r.mindfulnessCompleted).length;
    const focusScores = records.filter(r => r.focusScore).map(r => r.focusScore!);
    
    const stats: DailyStats = {
      date,
      prayersCompleted: prayedCount,
      totalPrayers: 5,
      mindfulnessSessions: mindfulnessCount,
      averageFocusScore: focusScores.length > 0 
        ? focusScores.reduce((a, b) => a + b, 0) / focusScores.length 
        : 0
    };
    
    this.storage.set(`daily_stats_${date}`, JSON.stringify(stats));
  }

  // Streaks
  getCurrentStreak(): number {
    return this.storage.getNumber('current_streak') || 0;
  }

  updateStreak(): void {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const todayStats = this.getDailyStats(today);
    const yesterdayStats = this.getDailyStats(yesterday);
    
    if (todayStats && todayStats.prayersCompleted === 5) {
      if (yesterdayStats && yesterdayStats.prayersCompleted === 5) {
        // Continue streak
        const current = this.getCurrentStreak();
        this.storage.set('current_streak', current + 1);
      } else {
        // Start new streak
        this.storage.set('current_streak', 1);
      }
    } else if (yesterdayStats && yesterdayStats.prayersCompleted < 5) {
      // Break streak
      this.storage.set('current_streak', 0);
    }
    
    // Update longest streak
    const current = this.getCurrentStreak();
    const longest = this.storage.getNumber('longest_streak') || 0;
    if (current > longest) {
      this.storage.set('longest_streak', current);
    }
  }

  // Achievements
  getAchievements(): Achievement[] {
    const data = this.storage.getString('achievements');
    return data ? JSON.parse(data) : this.getDefaultAchievements();
  }

  unlockAchievement(achievementId: string): void {
    const achievements = this.getAchievements();
    const achievement = achievements.find(a => a.id === achievementId);
    
    if (achievement && !achievement.unlockedAt) {
      achievement.unlockedAt = new Date();
      this.storage.set('achievements', JSON.stringify(achievements));
    }
  }

  private getDefaultAchievements(): Achievement[] {
    return [
      {
        id: 'first_prayer',
        name: 'First Step',
        description: 'Complete your first prayer',
        icon: '🌟'
      },
      {
        id: 'perfect_day',
        name: 'Perfect Day',
        description: 'Complete all 5 prayers in one day',
        icon: '✨'
      },
      {
        id: 'week_streak',
        name: 'Consistent Week',
        description: 'Maintain a 7-day streak',
        icon: '🔥'
      },
      {
        id: 'mindful_10',
        name: 'Mindful Worshipper',
        description: 'Complete 10 mindfulness sessions',
        icon: '🧘'
      },
      {
        id: 'reflection_master',
        name: 'Reflection Master',
        description: 'Add reflections to 20 prayers',
        icon: '📝'
      }
    ];
  }

  // First Launch
  isFirstLaunch(): boolean {
    const launched = this.storage.getBoolean('has_launched');
    if (!launched) {
      this.storage.set('has_launched', true);
      return true;
    }
    return false;
  }

  // Clear all data
  clearAllData(): void {
    this.storage.clearAll();
  }
}

export default new StorageService();