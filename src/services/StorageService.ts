// src/services/StorageService.ts
import {
  UserSettings,
  PrayerRecord,
  MindfulnessSession,
  DailyStats,
  Achievement,
  Location,
  CalculationMethod,
  SubscriptionPlan,
  PremiumFeatures,
  TemporaryPremium,
  Donation,
  OnboardingProgress,
  PrayerReminderState,
  HabitBuilderSettings,
  MosqueModeSettings,
} from "../types";
import { createStorage } from "./StorageAdapter";
import { PRAYER_NAMES as PrayerName } from "../constants";
import AnalyticsService from './AnalyticsService';
import { getLocalDateKey } from '../utils/dateHelpers';

class StorageService {
  private storage;

  constructor() {
    // 🔐 Encryption key is now managed by secureKeyManager
    // The key is stored in device Keychain (iOS) / Keystore (Android)
    this.storage = createStorage({
      id: "prayer-buddy-storage",
    });
  }

  // User Settings
  getUserSettings(): UserSettings | null {
    const data = this.storage.getString("user_settings");
    return data ? JSON.parse(data) : null;
  }

  setUserSettings(settings: UserSettings): void {
    this.storage.set("user_settings", JSON.stringify(settings));
  }

  updateUserSettings(updates: Partial<UserSettings>): void {
    const current = this.getUserSettings();
    if (!current) {
      this.setUserSettings(updates as UserSettings);
      return;
    }
    // Deep merge nested objects to avoid overwriting sibling keys
    const updated: UserSettings = { ...current };
    for (const key of Object.keys(updates) as Array<keyof UserSettings>) {
      const val = updates[key];
      if (
        val !== null &&
        val !== undefined &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof (current as any)[key] === 'object' &&
        (current as any)[key] !== null
      ) {
        (updated as any)[key] = { ...(current as any)[key], ...val };
      } else {
        (updated as any)[key] = val;
      }
    }
    this.setUserSettings(updated);
  }

  // Default settings for new users
  getDefaultSettings(): UserSettings {
    return {
      location: {
        latitude: 0,
        longitude: 0,
        city: "Unknown",
        country: "Unknown",
      },
      calculationMethod: "MWL",
      asrJuristic: "Standard",
      adjustments: {
        Fajr: 0,
        Dhuhr: 0,
        Asr: 0,
        Maghrib: 0,
        Isha: 0,
      },
      notifications: {
        enabled: true,
        adhanEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        beforePrayer: 10,
        reminderText: "Time for {prayer} prayer 🕌",
        postPrayerCheck: false, // DEPRECATED
      },
      prayerNotifications: {
        Fajr: true,
        Dhuhr: true,
        Asr: true,
        Maghrib: true,
        Isha: true,
      },
      habitBuilder: this.getDefaultHabitBuilderSettings(),
      mosqueMode: this.getDefaultMosqueModeSettings(),
      theme: "auto",
    };
  }

  // Default Prayer Habit Builder settings
  private getDefaultHabitBuilderSettings(): HabitBuilderSettings {
    return {
      enabled: true, // Enable by default for better user engagement
      persistentReminders: {
        enabled: true,
        firstCheckDelay: 15, // 15 min after prayer time
        interval: 15, // Every 15 minutes
        maxReminders: 3, // Up to 3 reminders
      },
      gracePeriodWarning: {
        enabled: true,
        minutesBeforeNext: 15, // Warn 15 min before next prayer
      },
      snooze: {
        allowedIntervals: [5, 10, 15, 30], // Available snooze options
        defaultInterval: 10, // Default 10 min
        maxSnoozesPerPrayer: 5,
      },
      quietHours: {
        enabled: false, // Disabled by default
        start: "22:00",
        end: "04:00",
      },
    };
  }

  // Default Mosque Mode settings
  private getDefaultMosqueModeSettings(): MosqueModeSettings {
    return {
      enabled: false, // Disabled by default - user must opt-in
      iqamahOffsets: {
        Fajr: 10,    // 10 minutes after Fajr adhan
        Dhuhr: 10,   // 10 minutes after Dhuhr adhan
        Asr: 10,     // 10 minutes after Asr adhan
        Maghrib: 5,  // 5 minutes after Maghrib (usually quicker)
        Isha: 10,    // 10 minutes after Isha adhan
      },
      silentDuration: 10, // 10 minutes of silent mode
      autoRestore: true,  // Automatically restore ringer
      promptBeforeEnable: false, // Auto-silence by default; user can opt into per-prayer confirmation
      useVibrateInsteadOfSilent: false, // Use complete silence by default
      jummah: {
        enabled: true,         // Enable Jummah silent mode by default
        silentDuration: 30,    // 30 minutes (khutba ~20 + prayer ~10)
        iqamahOffset: 15,      // 15 minutes after Dhuhr adhan on Friday
      },
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
    // Use capitalized prayer names to match PrayerName type
    const prayers = [
      PrayerName.fajr,
      PrayerName.dhuhr,
      PrayerName.asr,
      PrayerName.maghrib,
      PrayerName.isha,
    ];
    const records: PrayerRecord[] = [];

    prayers.forEach((prayer) => {
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
    const date = getLocalDateKey(new Date(session.startedAt));
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
    const prayedCount = records.filter((r) => r.status === "prayed").length;
    const mindfulnessCount = records.filter(
      (r) => r.mindfulnessCompleted
    ).length;
    const focusScores = records
      .filter((r) => r.focusScore)
      .map((r) => r.focusScore!);

    const stats: DailyStats = {
      date,
      prayersCompleted: prayedCount,
      totalPrayers: 5,
      mindfulnessSessions: mindfulnessCount,
      averageFocusScore:
        focusScores.length > 0
          ? focusScores.reduce((a, b) => a + b, 0) / focusScores.length
          : 0,
    };

    this.storage.set(`daily_stats_${date}`, JSON.stringify(stats));
  }

  // Streaks
  getCurrentStreak(): number {
    return this.storage.getNumber("current_streak") || 0;
  }

  setStreak(value: number): void {
    this.storage.set("current_streak", value);
  }

  // P0-D FIX: Made idempotent — guards with last_streak_update_date so repeated
  // calls on the same day don't keep incrementing. Also fixes the missing reset
  // path (Bug 9): today < 5 now always resets streak to 0 regardless of yesterday.
  updateStreak(): void {
    const today = getLocalDateKey();
    const yesterday = getLocalDateKey(new Date(Date.now() - 86400000));

    const todayStats = this.getDailyStats(today);
    const yesterdayStats = this.getDailyStats(yesterday);

    // Guard: only recalculate streak once per calendar day
    const lastStreakDate = this.storage.getString("last_streak_update_date");

    if (todayStats && todayStats.prayersCompleted === 5) {
      if (lastStreakDate === today) {
        // Already calculated streak for today's perfect day — skip
        return;
      }
      if (yesterdayStats && yesterdayStats.prayersCompleted === 5) {
        // Continue streak
        const current = this.getCurrentStreak();
        this.storage.set("current_streak", current + 1);
      } else {
        // Start new streak
        this.storage.set("current_streak", 1);
      }
      this.storage.set("last_streak_update_date", today);
    } else {
      // Today is not yet a perfect day — reset streak if yesterday wasn't perfect
      // (Bug 9 fix: this covers the previously missing case)
      if (!yesterdayStats || yesterdayStats.prayersCompleted < 5) {
        this.storage.set("current_streak", 0);
      }
    }

    // Update longest streak
    const current = this.getCurrentStreak();
    const longest = this.storage.getNumber("longest_streak") || 0;
    if (current > longest) {
      this.storage.set("longest_streak", current);
    }

    // Log streak milestones
    const milestones = [7, 30, 60, 100, 365];
    if (milestones.includes(current)) {
      AnalyticsService.logStreakMilestone(current);
    }
  }

  // Get longest streak ever recorded
  getLongestStreak(): number {
    return this.storage.getNumber("longest_streak") || 0;
  }

  // Get prayer records for a date range
  getPrayerRecordsInRange(startDate: Date, endDate: Date): PrayerRecord[] {
    const records: PrayerRecord[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = getLocalDateKey(currentDate);
      const dayRecords = this.getDayPrayerRecords(dateStr);
      records.push(...dayRecords);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return records;
  }

  // Get statistics for a date range
  getStatsInRange(
    startDate: Date,
    endDate: Date
  ): {
    totalPossiblePrayers: number;
    completedPrayers: number;
    mindfulnessSessions: number;
    averageFocusScore: number;
    prayerBreakdown: Record<string, number>;
  } {
    const records = this.getPrayerRecordsInRange(startDate, endDate);
    const dayCount =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    const stats = {
      totalPossiblePrayers: dayCount * 5,
      completedPrayers: 0,
      mindfulnessSessions: 0,
      averageFocusScore: 0,
      prayerBreakdown: {
        fajr: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0,
      },
    };

    const focusScores: number[] = [];

    records.forEach((record) => {
      if (record.status === "prayed") {
        stats.completedPrayers++;
        stats.prayerBreakdown[
          record.prayer.toLowerCase() as keyof typeof stats.prayerBreakdown
        ]++;

        if (record.mindfulnessCompleted) {
          stats.mindfulnessSessions++;
        }

        if (record.focusScore) {
          focusScores.push(record.focusScore);
        }
      }
    });

    if (focusScores.length > 0) {
      stats.averageFocusScore =
        focusScores.reduce((a, b) => a + b, 0) / focusScores.length;
    }

    return stats;
  }

  // Export prayer data as JSON
  exportPrayerData(): string {
    const exportData = {
      exportDate: new Date().toISOString(),
      userSettings: this.getUserSettings(),
      currentStreak: this.getCurrentStreak(),
      longestStreak: this.getLongestStreak(),
      achievements: this.getAchievements(),
      prayers: [] as any[],
      dailyStats: [] as any[],
    };

    // Get all prayer records (last 90 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = getLocalDateKey(currentDate);

      // Get prayer records
      const dayRecords = this.getDayPrayerRecords(dateStr);
      if (dayRecords.length > 0) {
        exportData.prayers.push({
          date: dateStr,
          records: dayRecords,
        });
      }

      // Get daily stats
      const dayStats = this.getDailyStats(dateStr);
      if (dayStats) {
        exportData.dailyStats.push(dayStats);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return JSON.stringify(exportData, null, 2);
  }

  // Calculate prayer consistency percentage for a period
  getConsistencyPercentage(days: number): number {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    const stats = this.getStatsInRange(startDate, endDate);
    return stats.totalPossiblePrayers > 0
      ? (stats.completedPrayers / stats.totalPossiblePrayers) * 100
      : 0;
  }

  // Get prayer completion by time of day
  getPrayerCompletionByTime(): Record<string, number> {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const records = this.getPrayerRecordsInRange(last30Days, new Date());
    const completionRates = {
      fajr: { completed: 0, total: 0 },
      dhuhr: { completed: 0, total: 0 },
      asr: { completed: 0, total: 0 },
      maghrib: { completed: 0, total: 0 },
      isha: { completed: 0, total: 0 },
    };

    // Count occurrences
    const daysChecked = new Set<string>();
    records.forEach((record) => {
      const dateStr = record.date;
      daysChecked.add(dateStr);

      if (record.status === "prayed") {
        completionRates[
          record.prayer.toLowerCase() as keyof typeof completionRates
        ].completed++;
      }
    });

    // Calculate total possible for each prayer
    const totalDays = daysChecked.size;
    Object.keys(completionRates).forEach((prayer) => {
      completionRates[prayer as keyof typeof completionRates].total = totalDays;
    });

    // Return percentages
    const percentages: Record<string, number> = {};
    Object.entries(completionRates).forEach(([prayer, stats]) => {
      percentages[prayer] =
        stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    });

    return percentages;
  }

  // Achievements
  getAchievements(): Achievement[] {
    const data = this.storage.getString("achievements");
    return data ? JSON.parse(data) : this.getDefaultAchievements();
  }

  unlockAchievement(achievementId: string): void {
    const achievements = this.getAchievements();
    const achievement = achievements.find((a) => a.id === achievementId);

    if (achievement && !achievement.unlockedAt) {
      achievement.unlockedAt = new Date();
      this.storage.set("achievements", JSON.stringify(achievements));
    }
  }

  // Update achievement progress
  updateAchievementProgress(achievementId: string, progress: number): void {
    const achievements = this.getAchievements();
    const achievement = achievements.find((a) => a.id === achievementId);

    if (achievement) {
      achievement.progress = progress;
      this.storage.set("achievements", JSON.stringify(achievements));
    }
  }

  // Get total prayers count
  getTotalPrayersCount(): number {
    return this.storage.getNumber("total_prayers_count") || 0;
  }

  // Increment total prayers count
  incrementTotalPrayersCount(): void {
    const current = this.getTotalPrayersCount();
    this.storage.set("total_prayers_count", current + 1);
  }

  // Get total mindfulness sessions
  getTotalMindfulnessCount(): number {
    return this.storage.getNumber("total_mindfulness_count") || 0;
  }

  // Increment mindfulness count
  incrementMindfulnessCount(): void {
    const current = this.getTotalMindfulnessCount();
    this.storage.set("total_mindfulness_count", current + 1);
  }

  // Get total reflections count
  getTotalReflectionsCount(): number {
    return this.storage.getNumber("total_reflections_count") || 0;
  }

  // Increment reflections count
  incrementReflectionsCount(): void {
    const current = this.getTotalReflectionsCount();
    this.storage.set("total_reflections_count", current + 1);
  }

  // Get high focus count (90%+)
  getHighFocusCount(): number {
    return this.storage.getNumber("high_focus_count") || 0;
  }

  // Increment high focus count
  incrementHighFocusCount(): void {
    const current = this.getHighFocusCount();
    this.storage.set("high_focus_count", current + 1);
  }

  // Get consecutive Fajr count
  getConsecutiveFajrCount(): number {
    return this.storage.getNumber("consecutive_fajr_count") || 0;
  }

  // Update consecutive Fajr count
  updateConsecutiveFajrCount(count: number): void {
    this.storage.set("consecutive_fajr_count", count);
  }

  // Get consecutive Isha count
  getConsecutiveIshaCount(): number {
    return this.storage.getNumber("consecutive_isha_count") || 0;
  }

  // Update consecutive Isha count
  updateConsecutiveIshaCount(count: number): void {
    this.storage.set("consecutive_isha_count", count);
  }

  // Save prayer record with achievement tracking
  // P0-D FIX: Made idempotent — only increments counters when a NEW prayer
  // completion is recorded (no existing 'prayed' record for this date+prayer).
  savePrayerRecordWithTracking(record: PrayerRecord): void {
    // Check if a 'prayed' record already exists for this date+prayer
    const existing = this.getPrayerRecord(record.date, record.prayer);
    const isNewCompletion = record.status === "prayed" &&
      (!existing || existing.status !== "prayed");

    // Save the record (always — may update reflection/score fields)
    this.savePrayerRecord(record);

    // Only increment counters for genuinely new completions
    if (isNewCompletion) {
      this.incrementTotalPrayersCount();

      if (record.mindfulnessCompleted) {
        this.incrementMindfulnessCount();
      }

      if (record.reflectionAdded) {
        this.incrementReflectionsCount();
      }

      if (record.focusScore && record.focusScore >= 90) {
        this.incrementHighFocusCount();
      }
    }

    // Update daily stats (idempotent — recalculates from records)
    this.updateDailyStats(record.date);

    // Update streaks (idempotent after fix)
    this.updateStreak();

    // Update consecutive prayer counts
    if (isNewCompletion) {
      this.updateConsecutivePrayerCounts(record);
    }
  }

  private updateConsecutivePrayerCounts(record: PrayerRecord): void {
    if (record.status === "prayed") {
      if (record.prayer === PrayerName.fajr) {
        // Check if yesterday's Fajr was also prayed
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateKey(yesterday);
        const yesterdayRecords = this.getDayPrayerRecords(yesterdayStr);
        const yesterdayFajr = yesterdayRecords.find(
          (r) => r.prayer === PrayerName.fajr
        );

        if (yesterdayFajr && yesterdayFajr.status === "prayed") {
          const current = this.getConsecutiveFajrCount();
          this.updateConsecutiveFajrCount(current + 1);
        } else {
          this.updateConsecutiveFajrCount(1);
        }
      }

      if (record.prayer === PrayerName.isha) {
        // Similar logic for Isha
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateKey(yesterday);
        const yesterdayRecords = this.getDayPrayerRecords(yesterdayStr);
        const yesterdayIsha = yesterdayRecords.find(
          (r) => r.prayer === PrayerName.isha
        );

        if (yesterdayIsha && yesterdayIsha.status === "prayed") {
          const current = this.getConsecutiveIshaCount();
          this.updateConsecutiveIshaCount(current + 1);
        } else {
          this.updateConsecutiveIshaCount(1);
        }
      }
    } else {
      // Reset consecutive counts if missed
      if (record.prayer === PrayerName.fajr) {
        this.updateConsecutiveFajrCount(0);
      }
      if (record.prayer === PrayerName.isha) {
        this.updateConsecutiveIshaCount(0);
      }
    }
  }

  // User ID management
  setUserId(userId: string): void {
    this.storage.set("user_id", userId);
  }

  getUserId(): string | null {
    const userId = this.storage.getString("user_id");
    return userId || null;
  }

  // 🎯 CHANGED: .delete() → .remove() for v4.x
  clearUserId(): void {
    this.storage.remove("user_id");
  }

  // Subscription management
  saveSubscription(subscription: SubscriptionPlan): void {
    this.storage.set("subscription", JSON.stringify(subscription));
  }

  getSubscription(): SubscriptionPlan | null {
    const data = this.storage.getString("subscription");
    return data ? JSON.parse(data) : null;
  }

  // Premium features
  // TODO: Replace local-only entitlement check with server-side receipt validation
  // (RevenueCat / Superwall) before launching paid tiers. Local MMKV booleans are
  // trivially bypassable on jailbroken/rooted devices even with encryption.
  async isPremiumActive(): Promise<boolean> {
    const subscription = this.getSubscription();
    const tempPremium = this.getTemporaryPremium();

    // Check subscription
    if (subscription?.isActive) {
      if (subscription.type === "lifetime") return true;
      if (
        subscription.expiryDate &&
        new Date(subscription.expiryDate) > new Date()
      ) {
        return true;
      }
    }

    // Check temporary premium
    if (tempPremium && new Date(tempPremium.expiresAt) > new Date()) {
      return true;
    }

    return false;
  }

  private getDefaultAchievements(): Achievement[] {
    return [
      {
        id: "first_prayer",
        name: "First Step",
        description: "Complete your first prayer",
        icon: "🌟",
      },
      {
        id: "perfect_day",
        name: "Perfect Day",
        description: "Complete all 5 prayers in one day",
        icon: "✨",
      },
      {
        id: "week_streak",
        name: "Consistent Week",
        description: "Maintain a 7-day streak",
        icon: "🔥",
      },
      {
        id: "mindful_10",
        name: "Mindful Worshipper",
        description: "Complete 10 mindfulness sessions",
        icon: "🧘",
      },
      {
        id: "reflection_master",
        name: "Reflection Master",
        description: "Add reflections to 20 prayers",
        icon: "📝",
      },
    ];
  }

  // First Launch
  isFirstLaunch(): boolean {
    const launched = this.storage.getBoolean("has_launched");
    if (!launched) {
      this.storage.set("has_launched", true);
      return true;
    }
    return false;
  }

  // Get generic value
  getValue(key: string): string | null {
    const value = this.storage.getString(key);
    return value === undefined ? null : value;
  }

  // Set generic value
  setValue(key: string, value: string): void {
    this.storage.set(key, value);
  }

  getPremiumFeatures(): PremiumFeatures {
    const data = this.storage.getString("premium_features");
    if (data) {
      return JSON.parse(data);
    }
    // Default premium features (all disabled)
    return {
      removeAds: false,
      themes: false,
      advancedAnalytics: false,
      familySharing: false,
      customNotificationSounds: false,
      cloudBackup: false,
      exportData: false,
      prayerReminders: false,
      widgetSupport: false,
      appleWatchSync: false,
      qiblaCompass: false,
      duaLibrary: false,
      audioRecitations: false,
      unlimitedHistory: false,
    };
  }

  // Premium features management
  setPremiumFeatures(features: PremiumFeatures): void {
    this.storage.set("premium_features", JSON.stringify(features));
  }

  // Temporary premium access
  setTemporaryPremium(temp: TemporaryPremium): void {
    this.storage.set("temporary_premium", JSON.stringify(temp));
  }

  getTemporaryPremium(): TemporaryPremium | null {
    const data = this.storage.getString("temporary_premium");
    return data ? JSON.parse(data) : null;
  }

  // 🎯 CHANGED: .delete() → .remove() for v4.x
  clearSubscription(): void {
    this.storage.remove("subscription");
  }

  // Donation tracking
  saveDonation(donation: Donation): void {
    const history = this.getDonationHistory();
    history.push(donation);
    this.storage.set("donation_history", JSON.stringify(history));
  }

  getDonationHistory(): Donation[] {
    const data = this.storage.getString("donation_history");
    return data ? JSON.parse(data) : [];
  }

  // Ad tracking
  setLastAdWatchTime(time: Date): void {
    this.storage.set("last_ad_watch", time.toISOString());
  }

  getLastAdWatchTime(): Date | null {
    const timestamp = this.storage.getString("last_ad_watch");
    return timestamp ? new Date(timestamp) : null;
  }

  // Family sharing data
  getFamilyData(): any | null {
    const data = this.storage.getString("family_data");
    return data ? JSON.parse(data) : null;
  }

  saveFamilyData(familyData: any): void {
    this.storage.set("family_data", JSON.stringify(familyData));
  }

  // 🎯 CHANGED: .delete() → .remove() for v4.x
  clearFamilyData(): void {
    this.storage.remove("family_data");
  }

  // Onboarding progress
  setOnboardingProgress(progress: OnboardingProgress): void {
    this.storage.set("onboarding_progress", JSON.stringify(progress));
  }

  getOnboardingProgress(): OnboardingProgress | null {
    const data = this.storage.getString("onboarding_progress");
    return data ? JSON.parse(data) : null;
  }

  // Data migration status
  isDataMigrated(): boolean {
    return this.storage.getBoolean('data_migrated') || false;
  }

  setDataMigrated(migrated: boolean = true): void {
    this.storage.set('data_migrated', migrated);
  }

  // Get all prayer records (with optional limit to avoid full key scan)
  getAllPrayerRecords(limit?: number): PrayerRecord[] {
    const allRecords: PrayerRecord[] = [];
    const keys = this.storage.getAllKeys();
    
    // Filter keys that match prayer record pattern
    const recordKeys = keys.filter(key => key.startsWith('prayer_'));
    
    // Apply limit to avoid scanning thousands of keys
    const keysToScan = limit ? recordKeys.slice(-limit) : recordKeys;
    
    keysToScan.forEach(key => {
      const data = this.storage.getString(key);
      if (data) {
        allRecords.push(JSON.parse(data));
      }
    });
    
    return allRecords;
  }

  // Get prayer records for a recent number of days (bounded query)
  getPrayerRecordsSince(days: number): PrayerRecord[] {
    const records: PrayerRecord[] = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateKey(date);
      const dayRecords = this.getDayPrayerRecords(dateStr);
      records.push(...dayRecords);
    }
    
    return records;
  }

  // Prayer Reminder State Management
  getReminderState(prayerId: string): PrayerReminderState | null {
    const key = `reminder_state_${prayerId}`;
    const data = this.storage.getString(key);
    return data ? JSON.parse(data) : null;
  }

  setReminderState(prayerId: string, state: PrayerReminderState): void {
    const key = `reminder_state_${prayerId}`;
    this.storage.set(key, JSON.stringify(state));
  }

  getAllReminderStates(): PrayerReminderState[] {
    const allStates: PrayerReminderState[] = [];
    const keys = this.storage.getAllKeys();
    
    // Filter keys that match reminder state pattern
    const stateKeys = keys.filter(key => key.startsWith('reminder_state_'));
    
    // Get all reminder states
    stateKeys.forEach(key => {
      const data = this.storage.getString(key);
      if (data) {
        allStates.push(JSON.parse(data));
      }
    });
    
    return allStates;
  }

  deleteReminderState(prayerId: string): void {
    const key = `reminder_state_${prayerId}`;
    this.storage.remove(key);
  }

  // Reflection Garden — cross-reference for reflection text
  saveReflectionText(date: string, prayer: string, text: string): void {
    const key = `reflection_${date}_${prayer}`;
    this.storage.set(key, text);
  }

  getReflectionText(date: string, prayer: string): string | null {
    const key = `reflection_${date}_${prayer}`;
    const data = this.storage.getString(key);
    return data || null;
  }

  getReflectionsInRange(days: number): { date: string; prayer: string; text: string | null }[] {
    const results: { date: string; prayer: string; text: string | null }[] = [];
    const now = new Date();
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateKey(date);

      for (const prayer of prayers) {
        const record = this.getPrayerRecord(dateStr, prayer);
        if (record && (record.reflectionAdded || record.mindfulnessCompleted)) {
          results.push({
            date: dateStr,
            prayer,
            text: this.getReflectionText(dateStr, prayer),
          });
        }
      }
    }

    return results;
  }

  // Clear all data
  clearAllData(): void {
    this.storage.clearAll();
  }
}

export default new StorageService();