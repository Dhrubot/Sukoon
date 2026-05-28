// src/services/StorageService.ts
import {
  UserSettings,
  PrayerRecord,
  MindfulnessSession,
  DailyStats,
  Achievement,
  SubscriptionPlan,
  PremiumFeatures,
  TemporaryPremium,
  Donation,
  OnboardingProgress,
  PrayerReminderState,
  HabitBuilderSettings,
  MosqueModeSettings,
} from "../types";
import { createStorage, createUnencryptedStorage, MemoryStorage } from "./StorageAdapter";
import { PRAYER_NAMES as PrayerName } from "../constants/prayerNames";
import AnalyticsService from './AnalyticsService';
import { getLocalDateKey } from '../utils/dateHelpers';
import logger from '../utils/logger';
import { ONE_DAY_MS } from '../constants/time';
import { applyIntensityPreset } from '../utils/notificationPresets';

type FamilyData = Record<string, unknown>;

const GENTLE_PRESET_NORMALIZED_FLAG = 'gentle_preset_normalized_v1';

class StorageService {
  // Encrypted storage for PII: user_settings, user_id, subscription,
  // premium, donations, family, onboarding, reflections, mindfulness
  private storage: ReturnType<typeof createStorage>;
  // Unencrypted storage for non-PII high-frequency data: prayer records,
  // daily stats, counters, dawam, achievements, reminder states, cached data
  private publicStorage: ReturnType<typeof createUnencryptedStorage>;
  private _cachedUserSettings: UserSettings | null = null;
  private _splitMigrationDone = false;
  private _initialized = false;
  private _pendingWrites: Array<{ key: string; value: string }> = [];

  constructor() {
    // Unencrypted public storage is safe to create immediately (no key needed)
    this.publicStorage = createUnencryptedStorage({
      id: "prayer-buddy-public",
    });
    // 🔐 Encrypted storage deferred to initialize() — use MemoryStorage placeholder
    // until the real encryption key is loaded from SecureStore.
    this.storage = new MemoryStorage();
  }

  /**
   * Create the real encrypted MMKV instance.
   * Must be called after initializeEncryptionKey() has populated the cached key.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    this.storage = createStorage({ id: "prayer-buddy-storage" });
    this._initialized = true;

    // Replay any writes that arrived before MMKV was ready
    if (this._pendingWrites.length > 0) {
      logger.log(`🔄 Replaying ${this._pendingWrites.length} queued write(s) to MMKV`);
      for (const { key, value } of this._pendingWrites) {
        this.storage.set(key, value);
      }
      this._pendingWrites = [];
    }

    this.normalizeGentlePresetIfNeeded();

    // Diagnostic: check if we can actually read existing data
    const keyCount = this.storage.getAllKeys().length;
    const hasSettings = this.storage.getString('user_settings') !== undefined;
    logger.log(`🔍 [InitDiag] Encrypted storage: ${keyCount} key(s), user_settings=${hasSettings ? 'FOUND' : 'MISSING'}`);
    if (keyCount === 0) {
      logger.warn('🔍 [InitDiag] Zero keys in encrypted storage — either fresh install or encryption key mismatch (data loss!)');
    }

    logger.log('✅ StorageService initialized with secure encryption');
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  private _preInitAccessLogged = false;
  /** Returns true if storage is ready, false if still using MemoryStorage placeholder. */
  private _ensureInitialized(): boolean {
    if (this._initialized) return true;
    if (!this._preInitAccessLogged) {
      this._preInitAccessLogged = true;
      logger.warn('⚠️ StorageService.storage accessed before initialize() — reads will return empty data');
    }
    return false;
  }

  // One-time migration: move non-PII keys from encrypted → unencrypted storage
  migrateSplitStorage(): void {
    if (this._splitMigrationDone) return;
    this._splitMigrationDone = true;

    // Check if already migrated
    if (this.publicStorage.getBoolean('storage_split_migrated')) return;

    try {
      const allKeys = this.storage.getAllKeys();
      let migrated = 0;

      for (const key of allKeys) {
        // Determine if this key belongs in publicStorage
        const isPublic =
          key.startsWith('prayer_') ||
          key.startsWith('daily_stats_') ||
          key.startsWith('reminder_state_') ||
          key.startsWith('achievement_') ||
          key.startsWith('moon_sighting_') ||
          key === 'current_dawam' ||
          key === 'engagement_dawam' ||
          key === 'longest_dawam' ||
          key === 'longest_engagement_dawam' ||
          key === 'last_dawam_update_date' ||
          key === 'last_engagement_dawam_date' ||
          key === 'total_prayers_count' ||
          key === 'total_mindfulness_count' ||
          key === 'total_reflections_count' ||
          key === 'high_focus_count' ||
          key === 'consecutive_fajr_count' ||
          key === 'consecutive_isha_count' ||
          key === 'has_launched' ||
          key === 'data_migrated' ||
          key === 'last_prune_date' ||
          key === 'cached_prayer_times' ||
          key === 'cached_hijri_date' ||
          key === 'lastPrayerRefresh' ||
          key === 'achievements'; // old blob key (will be migrated by achievement split)

        if (isPublic) {
          // Copy string value (MMKV stores everything as strings internally)
          const strVal = this.storage.getString(key);
          const numVal = this.storage.getNumber(key);
          const boolVal = this.storage.getBoolean(key);

          if (strVal !== undefined) {
            this.publicStorage.set(key, strVal);
          } else if (numVal !== undefined) {
            this.publicStorage.set(key, numVal);
          } else if (boolVal !== undefined) {
            this.publicStorage.set(key, boolVal);
          }

          this.storage.remove(key);
          migrated++;
        }
      }

      this.publicStorage.set('storage_split_migrated', true);

      if (migrated > 0) {
        logger.log(`🔀 Migrated ${migrated} keys to unencrypted storage`);
      }
    } catch (error) {
      logger.error('⚠️ Split storage migration failed:', error);
    }
  }

  // User Settings (with in-memory write-through cache)
  getUserSettings(): UserSettings | null {
    this._ensureInitialized();
    if (this._cachedUserSettings) return this._cachedUserSettings;
    const data = this.storage.getString("user_settings");
    const parsed = data ? JSON.parse(data) : null;
    if (parsed) this._cachedUserSettings = parsed;
    return parsed;
  }

  setUserSettings(settings: UserSettings): void {
    const ready = this._ensureInitialized();
    this._cachedUserSettings = settings;
    const serialized = JSON.stringify(settings);
    if (ready) {
      this.storage.set("user_settings", serialized);
    } else {
      // Queue the write for replay after initialize() completes
      this._pendingWrites.push({ key: "user_settings", value: serialized });
    }
  }

  // Private: All external callers must go through useStore's updateUserSettings
  // to ensure Zustand and StorageService stay in sync via write-through.
  private updateUserSettings(updates: Partial<UserSettings>): void {
    const current = this.getUserSettings();
    if (!current) {
      this.setUserSettings(updates as UserSettings);
      return;
    }
    // Deep merge nested objects to avoid overwriting sibling keys
    const updated = { ...current } as unknown as Record<string, unknown>;
    const source = current as unknown as Record<string, unknown>;
    for (const key of Object.keys(updates)) {
      const val = (updates as unknown as Record<string, unknown>)[key];
      if (
        val !== null &&
        val !== undefined &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof source[key] === 'object' &&
        source[key] !== null
      ) {
        updated[key] = { ...(source[key] as Record<string, unknown>), ...(val as Record<string, unknown>) };
      } else {
        updated[key] = val;
      }
    }
    this.setUserSettings(updated as unknown as UserSettings);
  }

  private buildLegacyGentleHabitBuilderProfile(): HabitBuilderSettings {
    return {
      enabled: false,
      persistentReminders: {
        enabled: false,
        firstCheckDelay: 20,
        interval: 15,
        maxReminders: 1,
      },
      gracePeriodWarning: {
        enabled: false,
        minutesBeforeNext: 15,
      },
      snooze: {
        allowedIntervals: [5, 10, 15, 30],
        defaultInterval: 10,
        maxSnoozesPerPrayer: 5,
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '04:00',
      },
    };
  }

  private usesLegacyUntouchedGentlePreset(settings: UserSettings): boolean {
    const notifications = settings.notifications;
    const habitBuilder = settings.habitBuilder;
    const legacyHabitBuilder = this.buildLegacyGentleHabitBuilderProfile();

    return (
      (notifications.intensity ?? 'gentle') === 'gentle' &&
      notifications.beforePrayer === 10 &&
      notifications.postPrayerCheck === false &&
      habitBuilder.enabled === legacyHabitBuilder.enabled &&
      habitBuilder.persistentReminders.enabled === legacyHabitBuilder.persistentReminders.enabled &&
      habitBuilder.persistentReminders.firstCheckDelay === legacyHabitBuilder.persistentReminders.firstCheckDelay &&
      habitBuilder.persistentReminders.interval === legacyHabitBuilder.persistentReminders.interval &&
      habitBuilder.persistentReminders.maxReminders === legacyHabitBuilder.persistentReminders.maxReminders &&
      habitBuilder.gracePeriodWarning.enabled === legacyHabitBuilder.gracePeriodWarning.enabled &&
      habitBuilder.gracePeriodWarning.minutesBeforeNext === legacyHabitBuilder.gracePeriodWarning.minutesBeforeNext &&
      JSON.stringify(habitBuilder.snooze.allowedIntervals) === JSON.stringify(legacyHabitBuilder.snooze.allowedIntervals) &&
      habitBuilder.snooze.defaultInterval === legacyHabitBuilder.snooze.defaultInterval &&
      habitBuilder.snooze.maxSnoozesPerPrayer === legacyHabitBuilder.snooze.maxSnoozesPerPrayer &&
      habitBuilder.quietHours.enabled === legacyHabitBuilder.quietHours.enabled &&
      habitBuilder.quietHours.start === legacyHabitBuilder.quietHours.start &&
      habitBuilder.quietHours.end === legacyHabitBuilder.quietHours.end
    );
  }

  private normalizeGentlePresetIfNeeded(): void {
    if (this.publicStorage.getBoolean(GENTLE_PRESET_NORMALIZED_FLAG)) {
      return;
    }

    const data = this.storage.getString('user_settings');
    if (!data) {
      this.publicStorage.set(GENTLE_PRESET_NORMALIZED_FLAG, true);
      return;
    }

    try {
      const parsed = JSON.parse(data) as UserSettings;
      if (this.usesLegacyUntouchedGentlePreset(parsed)) {
        const preset = applyIntensityPreset(
          parsed.notifications,
          parsed.habitBuilder,
          'gentle'
        );
        const normalized = {
          ...parsed,
          notifications: preset.notifications,
          habitBuilder: preset.habitBuilder,
        };
        this.setUserSettings(normalized);
      }
    } catch (error) {
      logger.warn('⚠️ Failed to normalize gentle preset settings:', error);
    } finally {
      this.publicStorage.set(GENTLE_PRESET_NORMALIZED_FLAG, true);
    }
  }

  // Default settings for new users
  getDefaultSettings(): UserSettings {
    const defaultNotifications: UserSettings['notifications'] = {
      enabled: true,
      adhanEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      beforePrayer: 10,
      reminderText: "Time for {prayer} prayer",
      postPrayerCheck: false,
      liveActivityEnabled: false,
      intensity: 'gentle',
    };
    const defaultHabitBuilder = this.getDefaultHabitBuilderSettings();
    const gentlePreset = applyIntensityPreset(
      defaultNotifications,
      defaultHabitBuilder,
      'gentle'
    );

    return {
      location: {
        latitude: 0,
        longitude: 0,
        city: "Unknown",
        country: "Unknown",
      },
      calculationMethod: "MWL",
      calculationMethodManuallySelected: false,
      asrJuristic: "Standard",
      adjustments: {
        Fajr: 0,
        Dhuhr: 0,
        Asr: 0,
        Maghrib: 0,
        Isha: 0,
      },
      notifications: gentlePreset.notifications,
      prayerNotifications: {
        Fajr: true,
        Dhuhr: true,
        Asr: true,
        Maghrib: true,
        Isha: true,
      },
      habitBuilder: gentlePreset.habitBuilder,
      mosqueMode: this.getDefaultMosqueModeSettings(),
      theme: "auto",
    };
  }

  // Default Prayer Habit Builder settings
  private getDefaultHabitBuilderSettings(): HabitBuilderSettings {
    return {
      enabled: true,
      persistentReminders: {
        enabled: true,
        firstCheckDelay: 20,
        interval: 15,
        maxReminders: 1,
      },
      gracePeriodWarning: {
        enabled: false,
        minutesBeforeNext: 15,
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
        iqamahTime: '13:30',   // 1:30 PM — common Jummah iqamah; user can override
      },
    };
  }

  // Prayer Records
  savePrayerRecord(record: PrayerRecord): void {
    const key = `prayer_${record.date}_${record.prayer}`;
    this.publicStorage.set(key, JSON.stringify(record));

    // Update daily stats
    this.updateDailyStats(record.date);
  }

  getPrayerRecord(date: string, prayer: string): PrayerRecord | null {
    const key = `prayer_${date}_${prayer}`;
    const data = this.publicStorage.getString(key);
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
    const data = this.publicStorage.getString(`daily_stats_${date}`);
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

    this.publicStorage.set(`daily_stats_${date}`, JSON.stringify(stats));
  }

  // Dawam — dual system: engagement (≥1 prayer) + perfect (5/5)
  getCurrentDawam(): number {
    return this.publicStorage.getNumber("current_dawam") || 0;
  }

  setDawam(value: number): void {
    this.publicStorage.set("current_dawam", value);
  }

  getEngagementDawam(): number {
    return this.publicStorage.getNumber("engagement_dawam") || 0;
  }

  setEngagementDawam(value: number): void {
    this.publicStorage.set("engagement_dawam", value);
  }

  // Dual dawam update: engagement dawam rewards any effort (≥1 prayer),
  // perfect dawam rewards full completion (5/5). This avoids the
  // "abstinence violation effect" where partial progress feels like failure.
  updateDawam(): void {
    const today = getLocalDateKey();
    const yesterday = getLocalDateKey(new Date(Date.now() - ONE_DAY_MS));

    const todayStats = this.getDailyStats(today);
    const yesterdayStats = this.getDailyStats(yesterday);

    const todayCompleted = todayStats?.prayersCompleted ?? 0;
    const yesterdayCompleted = yesterdayStats?.prayersCompleted ?? 0;

    // ── Engagement Dawam (≥1 prayer today) ──
    if (todayCompleted >= 1) {
      const lastEngagementDate = this.publicStorage.getString("last_engagement_dawam_date");
      if (lastEngagementDate !== today) {
        if (yesterdayCompleted >= 1) {
          this.publicStorage.set("engagement_dawam", this.getEngagementDawam() + 1);
        } else {
          this.publicStorage.set("engagement_dawam", 1);
        }
        this.publicStorage.set("last_engagement_dawam_date", today);
      }
    } else {
      if (yesterdayCompleted < 1) {
        this.publicStorage.set("engagement_dawam", 0);
      }
    }

    // ── Perfect Dawam (5/5 prayers) ──
    const lastDawamDate = this.publicStorage.getString("last_dawam_update_date");

    if (todayCompleted === 5) {
      if (lastDawamDate === today) {
        // Already calculated perfect dawam for today — skip
      } else {
        if (yesterdayCompleted === 5) {
          this.publicStorage.set("current_dawam", this.getCurrentDawam() + 1);
        } else {
          this.publicStorage.set("current_dawam", 1);
        }
        this.publicStorage.set("last_dawam_update_date", today);
      }
    } else {
      if (yesterdayCompleted < 5) {
        this.publicStorage.set("current_dawam", 0);
      }
    }

    // Update longest dawam (both types)
    const currentPerfect = this.getCurrentDawam();
    const longestPerfect = this.publicStorage.getNumber("longest_dawam") || 0;
    if (currentPerfect > longestPerfect) {
      this.publicStorage.set("longest_dawam", currentPerfect);
    }

    const currentEngagement = this.getEngagementDawam();
    const longestEngagement = this.publicStorage.getNumber("longest_engagement_dawam") || 0;
    if (currentEngagement > longestEngagement) {
      this.publicStorage.set("longest_engagement_dawam", currentEngagement);
    }

    // Log dawam milestones for both types
    const milestones = [7, 30, 60, 100, 365];
    if (milestones.includes(currentPerfect)) {
      AnalyticsService.logDawamMilestone(currentPerfect);
    }
    if (milestones.includes(currentEngagement)) {
      AnalyticsService.logDawamMilestone(currentEngagement);
    }
  }

  // Get longest dawam ever recorded
  getLongestDawam(): number {
    return this.publicStorage.getNumber("longest_dawam") || 0;
  }

  getLongestEngagementDawam(): number {
    return this.publicStorage.getNumber("longest_engagement_dawam") || 0;
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

  // Export prayer data as JSON.
  // By default, precise location (lat/lng/city) and display name are redacted.
  // Pass includeLocation: true to include them (personal backup on trusted devices).
  exportPrayerData(options: { includeLocation?: boolean } = {}): string {
    const { includeLocation = false } = options;
    const rawSettings = this.getUserSettings();

    // Build a sanitized copy of userSettings
    let exportedSettings: typeof rawSettings | null = null;
    if (rawSettings) {
      const { name, location, ...rest } = rawSettings;
      exportedSettings = {
        ...rest,
        name: includeLocation ? name : undefined,
        location: includeLocation
          ? location
          : {
              // Keep country for regional method matching; redact everything else
              latitude: 0,
              longitude: 0,
              city: undefined,
              country: location.country,
              timezone: location.timezone,
            },
      };
    }

    const exportData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      userSettings: exportedSettings,
      // Embed a redaction marker so importPrayerData knows which fields to skip
      redacted: {
        location: !includeLocation,
        name: !includeLocation,
      },
      currentDawam: this.getCurrentDawam(),
      longestDawam: this.getLongestDawam(),
      prayers: [] as { date: string; records: PrayerRecord[] }[],
      dailyStats: [] as DailyStats[],
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
        (exportData.prayers as { date: string; records: PrayerRecord[] }[]).push({
          date: dateStr,
          records: dayRecords,
        });
      }

      // Get daily stats
      const dayStats = this.getDailyStats(dateStr);
      if (dayStats) {
        (exportData.dailyStats as DailyStats[]).push(dayStats);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return JSON.stringify(exportData, null, 2);
  }

  // Import prayer data from a JSON string (produced by exportPrayerData).
  // Merges records without overwriting existing 'prayed' entries.
  // Respects the 'redacted' marker — when location or name are redacted the
  // current device values are kept and NOT overwritten.
  importPrayerData(jsonString: string): { imported: number; skipped: number } {
    const data = JSON.parse(jsonString);

    // Validate basic structure
    if (!data.exportDate || !data.prayers) {
      throw new Error('Invalid export file — missing required fields');
    }

    let imported = 0;
    let skipped = 0;

    // Import prayer records (merge — don't overwrite existing 'prayed' records)
    if (Array.isArray(data.prayers)) {
      for (const day of data.prayers) {
        if (!day.date || !Array.isArray(day.records)) continue;
        for (const record of day.records) {
          if (!record.prayer || !record.date) continue;
          const existing = this.getPrayerRecord(record.date, record.prayer);
          if (existing?.status === 'prayed') {
            skipped++;
            continue;
          }
          this.savePrayerRecord(record);
          imported++;
        }
      }
    }

    // Recalculate daily stats for all imported dates
    const importedDates = new Set<string>();
    if (Array.isArray(data.prayers)) {
      for (const day of data.prayers) {
        if (day.date) importedDates.add(day.date);
      }
    }
    for (const date of importedDates) {
      this.updateDailyStats(date);
    }

    // Import dawam if higher than current
    if (typeof data.currentDawam === 'number' && data.currentDawam > this.getCurrentDawam()) {
      this.setDawam(data.currentDawam);
    }
    if (typeof data.longestDawam === 'number' && data.longestDawam > this.getLongestDawam()) {
      this.publicStorage.set('longest_dawam', data.longestDawam);
    }

    // Merge non-PII userSettings fields from the export.
    // If location or name are redacted, keep the device's current values.
    if (data.userSettings && typeof data.userSettings === 'object') {
      const redacted: { location?: boolean; name?: boolean } = data.redacted ?? {};
      const current = this.getUserSettings();
      if (current) {
        const incoming = data.userSettings as Partial<UserSettings>;
        const mergedSettings: UserSettings = {
          ...current,
          // Merge safe non-PII settings fields
          calculationMethod: incoming.calculationMethod ?? current.calculationMethod,
          calculationMethodManuallySelected:
            incoming.calculationMethodManuallySelected ?? current.calculationMethodManuallySelected,
          asrJuristic: incoming.asrJuristic ?? current.asrJuristic,
          // Keep current location/name when redacted
          location: redacted.location ? current.location : (incoming.location ?? current.location),
          name: redacted.name ? current.name : (incoming.name ?? current.name),
        };
        this.setUserSettings(mergedSettings);
      }
    }

    return { imported, skipped };
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

  // Achievements (individual keys: achievement_{id})
  private _achievementsMigrated = false;

  private migrateAchievementsIfNeeded(): void {
    if (this._achievementsMigrated) return;
    this._achievementsMigrated = true;

    // One-time migration from old blob to individual keys
    const oldBlob = this.publicStorage.getString('achievements');
    if (!oldBlob) return;

    try {
      const oldList: Achievement[] = JSON.parse(oldBlob);
      for (const a of oldList) {
        const key = `achievement_${a.id}`;
        if (!this.publicStorage.getString(key)) {
          this.publicStorage.set(key, JSON.stringify(a));
        }
      }
      this.publicStorage.remove('achievements');
    } catch { /* skip malformed blob */ }
  }

  getAchievements(): Achievement[] {
    this.migrateAchievementsIfNeeded();
    const defaults = this.getDefaultAchievements();
    return defaults.map(def => {
      const data = this.publicStorage.getString(`achievement_${def.id}`);
      return data ? JSON.parse(data) : def;
    });
  }

  getAchievement(achievementId: string): Achievement | null {
    this.migrateAchievementsIfNeeded();
    const data = this.publicStorage.getString(`achievement_${achievementId}`);
    if (data) return JSON.parse(data);
    // Fall back to default
    const def = this.getDefaultAchievements().find(a => a.id === achievementId);
    return def || null;
  }

  unlockAchievement(achievementId: string): void {
    this.migrateAchievementsIfNeeded();
    const achievement = this.getAchievement(achievementId);
    if (achievement && !achievement.unlockedAt) {
      achievement.unlockedAt = new Date();
      this.publicStorage.set(`achievement_${achievementId}`, JSON.stringify(achievement));
    }
  }

  // Update achievement progress
  updateAchievementProgress(achievementId: string, progress: number): void {
    this.migrateAchievementsIfNeeded();
    const achievement = this.getAchievement(achievementId);
    if (achievement) {
      achievement.progress = progress;
      this.publicStorage.set(`achievement_${achievementId}`, JSON.stringify(achievement));
    }
  }

  // Get total prayers count
  getTotalPrayersCount(): number {
    return this.publicStorage.getNumber("total_prayers_count") || 0;
  }

  // Increment total prayers count
  incrementTotalPrayersCount(): void {
    const current = this.getTotalPrayersCount();
    this.publicStorage.set("total_prayers_count", current + 1);
  }

  // Get total mindfulness sessions
  getTotalMindfulnessCount(): number {
    return this.publicStorage.getNumber("total_mindfulness_count") || 0;
  }

  // Increment mindfulness count
  incrementMindfulnessCount(): void {
    const current = this.getTotalMindfulnessCount();
    this.publicStorage.set("total_mindfulness_count", current + 1);
  }

  // Get total reflections count
  getTotalReflectionsCount(): number {
    return this.publicStorage.getNumber("total_reflections_count") || 0;
  }

  // Increment reflections count
  incrementReflectionsCount(): void {
    const current = this.getTotalReflectionsCount();
    this.publicStorage.set("total_reflections_count", current + 1);
  }

  // Get high focus count (90%+)
  getHighFocusCount(): number {
    return this.publicStorage.getNumber("high_focus_count") || 0;
  }

  // Increment high focus count
  incrementHighFocusCount(): void {
    const current = this.getHighFocusCount();
    this.publicStorage.set("high_focus_count", current + 1);
  }

  // Get consecutive Fajr count
  getConsecutiveFajrCount(): number {
    return this.publicStorage.getNumber("consecutive_fajr_count") || 0;
  }

  // Update consecutive Fajr count
  updateConsecutiveFajrCount(count: number): void {
    this.publicStorage.set("consecutive_fajr_count", count);
  }

  // Get consecutive Isha count
  getConsecutiveIshaCount(): number {
    return this.publicStorage.getNumber("consecutive_isha_count") || 0;
  }

  // Update consecutive Isha count
  updateConsecutiveIshaCount(count: number): void {
    this.publicStorage.set("consecutive_isha_count", count);
  }

  // Save prayer record with prayer tracking
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

    // Update dawam (idempotent after fix)
    this.updateDawam();

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
        id: "week_dawam",
        name: "Consistent Week",
        description: "Maintain 7 days of dawam",
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
    const launched = this.publicStorage.getBoolean("has_launched");
    if (!launched) {
      this.publicStorage.set("has_launched", true);
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

  // Delete generic value
  deleteValue(key: string): void {
    this.storage.remove(key);
  }

  getPublicJson<T>(key: string): T | null {
    const data = this.publicStorage.getString(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  setPublicJson(key: string, value: unknown): void {
    this.publicStorage.set(key, JSON.stringify(value));
  }

  deletePublicValue(key: string): void {
    this.publicStorage.remove(key);
  }

  /** Read a string value from the unencrypted public store. */
  getPublicValue(key: string): string | null {
    const value = this.publicStorage.getString(key);
    return value === undefined ? null : value;
  }

  /** Write a string value to the unencrypted public store. */
  setPublicValue(key: string, value: string): void {
    this.publicStorage.set(key, value);
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

  // Donation tracking (capped at 100 entries)
  saveDonation(donation: Donation): void {
    const history = this.getDonationHistory();
    history.push(donation);
    // Cap at 100 entries to prevent unbounded growth
    const capped = history.length > 100 ? history.slice(-100) : history;
    this.storage.set("donation_history", JSON.stringify(capped));
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
  getFamilyData(): FamilyData | null {
    const data = this.storage.getString("family_data");
    return data ? (JSON.parse(data) as FamilyData) : null;
  }

  saveFamilyData(familyData: FamilyData): void {
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
    return this.publicStorage.getBoolean('data_migrated') || false;
  }

  setDataMigrated(migrated: boolean = true): void {
    this.publicStorage.set('data_migrated', migrated);
  }

  // @deprecated Use getPrayerRecordsSince(days) instead — this scans ALL keys.
  getAllPrayerRecords(limit?: number): PrayerRecord[] {
    // Delegate to bounded query (default 365 days)
    return this.getPrayerRecordsSince(limit ? Math.ceil(limit / 5) : 365);
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
    const data = this.publicStorage.getString(key);
    return data ? JSON.parse(data) : null;
  }

  setReminderState(prayerId: string, state: PrayerReminderState): void {
    const key = `reminder_state_${prayerId}`;
    this.publicStorage.set(key, JSON.stringify(state));
  }

  getAllReminderStates(): PrayerReminderState[] {
    const allStates: PrayerReminderState[] = [];
    const keys = this.publicStorage.getAllKeys();
    
    // Filter keys that match reminder state pattern
    const stateKeys = keys.filter(key => key.startsWith('reminder_state_'));
    
    // Get all reminder states
    stateKeys.forEach(key => {
      const data = this.publicStorage.getString(key);
      if (data) {
        allStates.push(JSON.parse(data));
      }
    });
    
    return allStates;
  }

  deleteReminderState(prayerId: string): void {
    const key = `reminder_state_${prayerId}`;
    this.publicStorage.remove(key);
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

  // Get reminder states for a bounded number of days (deterministic, no getAllKeys)
  getReminderStatesForDays(days: number): PrayerReminderState[] {
    const states: PrayerReminderState[] = [];
    const prayers = [
      PrayerName.fajr,
      PrayerName.dhuhr,
      PrayerName.asr,
      PrayerName.maghrib,
      PrayerName.isha,
    ];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateKey(date);

      for (const prayer of prayers) {
        const prayerId = `${prayer}-${dateStr}`;
        const state = this.getReminderState(prayerId);
        if (state) states.push(state);
      }
    }

    return states;
  }

  // Prune old data beyond retention window (deterministic key iteration)
  pruneOldData(retentionDays: number = 365): { prunedKeys: number } {
    const lastPrune = this.publicStorage.getString('last_prune_date');
    const today = getLocalDateKey();
    if (lastPrune === today) return { prunedKeys: 0 };

    let prunedKeys = 0;
    const prayers = [
      PrayerName.fajr,
      PrayerName.dhuhr,
      PrayerName.asr,
      PrayerName.maghrib,
      PrayerName.isha,
    ];

    // Scan 90 days beyond retention window to catch stragglers
    const scanDays = 90;
    const startOffset = retentionDays + 1;
    const endOffset = retentionDays + scanDays;

    for (let i = startOffset; i <= endOffset; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateKey(date);

      // Delete prayer records: prayer_{date}_{prayer} (publicStorage)
      for (const prayer of prayers) {
        const prayerKey = `prayer_${dateStr}_${prayer}`;
        if (this.publicStorage.getString(prayerKey) !== undefined) {
          this.publicStorage.remove(prayerKey);
          prunedKeys++;
        }
      }

      // Delete daily stats: daily_stats_{date} (publicStorage)
      const statsKey = `daily_stats_${dateStr}`;
      if (this.publicStorage.getString(statsKey) !== undefined) {
        this.publicStorage.remove(statsKey);
        prunedKeys++;
      }

      // Delete reflection texts: reflection_{date}_{prayer} (encrypted — PII)
      for (const prayer of prayers) {
        const reflKey = `reflection_${dateStr}_${prayer}`;
        if (this.storage.getString(reflKey) !== undefined) {
          this.storage.remove(reflKey);
          prunedKeys++;
        }
      }

      // Delete reminder states: reminder_state_{prayer}-{date} (publicStorage)
      for (const prayer of prayers) {
        const reminderKey = `reminder_state_${prayer}-${dateStr}`;
        if (this.publicStorage.getString(reminderKey) !== undefined) {
          this.publicStorage.remove(reminderKey);
          prunedKeys++;
        }
      }
    }

    // Prune mindfulness sessions (these use UUIDs, so we need one getAllKeys scan)
    // Only run this scan during pruning (not on hot path)
    try {
      const allKeys = this.storage.getAllKeys();
      const mindfulnessKeys = allKeys.filter(k => k.startsWith('mindfulness_'));
      for (const key of mindfulnessKeys) {
        const data = this.storage.getString(key);
        if (data) {
          try {
            const session = JSON.parse(data);
            if (session.startedAt) {
              const sessionDate = new Date(session.startedAt);
              const daysDiff = Math.floor(
                (Date.now() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              if (daysDiff > retentionDays) {
                this.storage.remove(key);
                prunedKeys++;
              }
            }
          } catch { /* skip malformed entries */ }
        }
      }

      // Prune stale lastPrayerRefresh_* keys (orphans from old code)
      const refreshKeys = allKeys.filter(k => k.startsWith('lastPrayerRefresh_'));
      for (const key of refreshKeys) {
        this.storage.remove(key);
        prunedKeys++;
      }
    } catch { /* getAllKeys scan failed, skip mindfulness/refresh pruning */ }

    // Also check publicStorage for stale refresh keys from migration
    try {
      const pubKeys = this.publicStorage.getAllKeys();
      const pubRefreshKeys = pubKeys.filter(k => k.startsWith('lastPrayerRefresh_'));
      for (const key of pubRefreshKeys) {
        this.publicStorage.remove(key);
        prunedKeys++;
      }
    } catch { /* skip */ }

    this.publicStorage.set('last_prune_date', today);

    if (prunedKeys > 0) {
      logger.log(`🧹 Pruned ${prunedKeys} old storage keys (retention: ${retentionDays} days)`);
    }

    return { prunedKeys };
  }

  // Clear all data
  clearAllData(): void {
    this._ensureInitialized();
    this._cachedUserSettings = null;
    this.storage.clearAll();
    this.publicStorage.clearAll();
  }
}

export default new StorageService();
