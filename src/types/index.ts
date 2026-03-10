// Prayer related types
export type PrayerName = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
export type ExtendedPrayerName = PrayerName | "Taraweeh" | "Tahajjud" | "Jumah" | "Eid";

export interface PrayerTime {
  name: PrayerName;
  time: Date;
  timestamp: number;
  isNext?: boolean;
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Midnight: string;
}

export interface PrayerTimesWithSun {
  prayerTimes: PrayerTime[];
  sunrise: Date;
  sunset: Date;
  midnight: Date | null;
}

export interface OptionalPrayerTime {
  name: ExtendedPrayerName;
  displayName: string;
  arabic: string;
  icon: string;
  time: Date;
  category: 'sunnah' | 'seasonal' | 'weekly';
}

export interface PrayerRecord {
  id: string;
  date: string; // YYYY-MM-DD
  prayer: PrayerName;
  status: "prayed" | "missed" | "delayed" | "in_progress";
  prayedAt?: Date;
  mindfulnessCompleted?: boolean;
  reflectionAdded?: boolean;
  focusScore?: number; // 0-100
  mindfulnessScore?: number; // 0-100
}

// Location types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinates {
  city?: string;
  country?: string;
  timezone?: string;
}

// Settings types
export type CalculationMethod =
  | "MWL" // Muslim World League
  | "ISNA" // Islamic Society of North America
  | "Egypt" // Egyptian General Authority of Survey
  | "Makkah" // Umm al-Qura, Makkah
  | "Karachi" // University of Islamic Sciences, Karachi
  | "Tehran" // Institute of Geophysics, University of Tehran
  | "Jafari"; // Shia Ithna Ashari

export interface CalculationMethodType {
  value: CalculationMethod;
  label: string;
}

export const CALCULATION_METHODS: CalculationMethodType[] = [
  { value: "MWL", label: "Muslim World League" },
  { value: "ISNA", label: "Islamic Society of North America" },
  { value: "Egypt", label: "Egyptian General Authority" },
  { value: "Makkah", label: "Umm al-Qura, Makkah" },
  { value: "Karachi", label: "University of Islamic Sciences, Karachi" },
  { value: "Tehran", label: "Institute of Geophysics, Tehran" },
  { value: "Jafari", label: "Shia Ithna Ashari" },
];

export interface UserSettings {
  name?: string;
  location: Location;
  calculationMethod: CalculationMethod;
  asrJuristic: "Standard" | "Hanafi";
  adjustments: {
    Fajr: number;
    Dhuhr: number;
    Asr: number;
    Maghrib: number;
    Isha: number;
  };
  notifications: {
    enabled: boolean;
    adhanEnabled: boolean;
    fullAdhanEnabled?: boolean; // Android only: play full Adhan via foreground service even when locked
    soundEnabled: boolean; // This can control the standard "beep" if Adhan is off
    vibrationEnabled: boolean;
    beforePrayer: number; // minutes
    reminderText: string;
    postPrayerCheck: boolean; // DEPRECATED - replaced by habitBuilder
    intensity?: 'gentle' | 'balanced' | 'persistent'; // Controls follow-up reminder frequency
    liveActivityEnabled?: boolean; // Show prayer countdown on lock screen (iOS Live Activity / Android ongoing notification)
  };
  // Per-prayer notification toggles (individual control)
  prayerNotifications: {
    Fajr: boolean;
    Dhuhr: boolean;
    Asr: boolean;
    Maghrib: boolean;
    Isha: boolean;
  };
  habitBuilder: HabitBuilderSettings;
  mosqueMode: MosqueModeSettings;
  tahajjudReminders?: {
    enabled: boolean;
    frequency: 'daily' | 'weekdays' | 'weekends' | 'twice_weekly';
  };
  jummahReminders?: {
    enabled: boolean;
  };
  hijriAdjustment?: -1 | 0 | 1;
  theme: "light" | "dark" | "midnight" | "auto";
}

export type NotificationSchedulingReason =
  | 'boot'
  | 'permission_change'
  | 'timezone_change'
  | 'location_change'
  | 'clock_change'
  | 'settings_change'
  | 'background_refresh';

// Mindfulness types
export interface MindfulnessSession {
  id: string;
  prayerName: PrayerName;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // seconds
  breathingCompleted: boolean;
  reflectionCompleted: boolean;
  reflection?: {
    mood: 1 | 2 | 3 | 4 | 5;
    text?: string;
  };
}

// Prayer Habit Builder Types
export interface HabitBuilderSettings {
  enabled: boolean; // Master toggle for Prayer Habit Builder
  
  // Persistent "Have you prayed?" reminders
  persistentReminders: {
    enabled: boolean;
    firstCheckDelay: number; // Minutes after prayer time before first check (default: 15)
    interval: number; // Minutes between subsequent reminders (default: 15)
    maxReminders: number; // Maximum number of reminders to send (default: 3)
  };
  
  // Grace period warning (before next prayer starts)
  gracePeriodWarning: {
    enabled: boolean;
    minutesBeforeNext: number; // Warn X minutes before next prayer (default: 15)
  };
  
  // Snooze customization
  snooze: {
    allowedIntervals: number[]; // Available snooze durations in minutes (default: [5, 10, 15, 30])
    defaultInterval: number; // Default snooze duration (default: 10)
    maxSnoozesPerPrayer: number; // Maximum snoozes allowed per prayer (default: 5)
  };
  
  // Respect user's sleep/quiet time
  quietHours: {
    enabled: boolean;
    start: string; // "22:00" format
    end: string; // "04:00" format
  };
}

// Mosque Mode Settings (Silent Phone for Iqamah)
export interface MosqueModeSettings {
  enabled: boolean; // Master toggle for Mosque Mode
  
  // Iqamah times (minutes after adhan)
  // e.g., if Fajr adhan is 5:10 AM and iqamah is 5:20 AM, offset is 10
  iqamahOffsets: {
    Fajr: number;    // Minutes after Fajr adhan (default: 10)
    Dhuhr: number;   // Minutes after Dhuhr adhan (default: 10)
    Asr: number;     // Minutes after Asr adhan (default: 10)
    Maghrib: number; // Minutes after Maghrib adhan (default: 5)
    Isha: number;    // Minutes after Isha adhan (default: 10)
  };
  
  // Silent mode duration (minutes)
  silentDuration: number; // How long to stay silent (default: 10)
  
  // Auto-restore ringer after duration
  autoRestore: boolean; // Automatically restore normal mode (default: true)
  
  // Ask before enabling (show "Heading to mosque?" prompt)
  promptBeforeEnable: boolean; // Show confirmation dialog (default: false — auto-silence)
  
  // Platform-specific settings
  useVibrateInsteadOfSilent: boolean; // Use vibrate instead of complete silence (default: false)
  
  // Jummah-specific settings (Friday khutba + prayer)
  jummah?: {
    enabled: boolean;        // Enable Jummah silent mode (default: true)
    silentDuration: number;  // Minutes — khutba (~20) + prayer (~10) = 30 default
    iqamahOffset: number;    // Minutes after Dhuhr adhan on Friday
  };
}

// Prayer reminder state tracking
export interface PrayerReminderState {
  prayerId: string; // Unique ID: Format "Fajr-2025-01-15"
  prayerName: PrayerName;
  prayerTime: Date;
  nextPrayerTime: Date | null;
  
  status: 'pending' | 'snoozed' | 'completed' | 'skipped' | 'missed';
  
  // Notification tracking
  tier1Sent: boolean; // Main prayer notification sent
  tier2SentCount: number; // Number of persistent reminders sent
  tier3Sent: boolean; // Grace period warning sent
  
  // Snooze tracking
  snoozeCount: number;
  lastSnoozeTime: Date | null;
  
  // Completion tracking
  completedAt: Date | null;
  skippedAt: Date | null;
  
  createdAt: Date;
}

// Stats types — see full DailyStats definition below (with digital wellness fields)

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number; // For progressive achievements
  target?: number;
  tier?: string;
}

// API Response types
export interface AladhanResponse {
  code: number;
  status: string;
  data: {
    timings: PrayerTimes;
    date: {
      readable: string;
      timestamp: string;
      hijri: {
        date: string;
        format: string;
        day: string;
        month: {
          number: number;
          en: string;
          ar: string;
        };
        year: string;
      };
    };
    meta: {
      latitude: number;
      longitude: number;
      timezone: string;
      method: {
        id: number;
        name: string;
      };
    };
  };
}

export interface DailyStats {
  date: string;
  prayersCompleted: number;
  totalPrayers: number;
  mindfulnessSessions: number;
  averageFocusScore: number;
}

// Subscription Types
export interface SubscriptionPlan {
  id: string;
  type: "monthly" | "yearly" | "lifetime";
  startDate: Date;
  expiryDate: Date | null; // null for lifetime
  isActive: boolean;
  transactionId: string;
  originalTransactionId?: string;
}

export interface PremiumFeatures {
  familySharing: boolean;
  unlimitedHistory: boolean;
  advancedAnalytics: boolean;
  customNotificationSounds: boolean;
  cloudBackup: boolean;
  exportData: boolean;
  prayerReminders: boolean;
  widgetSupport: boolean;
  appleWatchSync: boolean;
  qiblaCompass: boolean;
  duaLibrary: boolean;
  audioRecitations: boolean;
  themes: boolean;
  removeAds: boolean;
}

// Donation Types
export interface Donation {
  id: string;
  amount: number;
  currency: string;
  date: Date;
  productId?: string;
  status: "pending" | "completed" | "failed";
  message?: string; // Optional message from donor
}

// Ad Types
export interface TemporaryPremium {
  grantedAt: Date;
  expiresAt: Date;
  source: "ad_reward" | "promotion" | "trial";
}

// Update StorageService methods for monetization
export interface StorageServiceMonetization {
  // Subscription
  saveSubscription(subscription: SubscriptionPlan): void;
  getSubscription(): SubscriptionPlan | null;
  clearSubscription(): void;

  // Premium Features
  setPremiumFeatures(features: PremiumFeatures): void;
  getPremiumFeatures(): PremiumFeatures;
  isPremiumActive(): Promise<boolean>;

  // Temporary Premium
  setTemporaryPremium(temp: TemporaryPremium): void;
  getTemporaryPremium(): TemporaryPremium | null;

  // Donations
  saveDonation(donation: Donation): void;
  getDonationHistory(): Donation[];

  // Ad Tracking
  setLastAdWatchTime(time: Date): void;
  getLastAdWatchTime(): Date | null;
}

export interface OnboardingProgress {
  welcomeCompleted: boolean;
  locationPermissionGranted: boolean;
  notificationPermissionGranted: boolean;
  calculationMethodSelected: boolean;
  accountCreated: boolean;
  tutorialCompleted: boolean;
}

// Update StorageService methods for auth
export interface StorageServiceAuth {
  setUserId(userId: string): void;
  getUserId(): string | null;
  clearUserId(): void;
  setDataMigrated(migrated: boolean): void;
  isDataMigrated(): boolean;
  getAllPrayerRecords(): PrayerRecord[];
  setOnboardingProgress(progress: OnboardingProgress): void;
  getOnboardingProgress(): OnboardingProgress | null;
}
