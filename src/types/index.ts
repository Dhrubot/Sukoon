// Prayer related types
export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

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
  Maghrib: string;
  Isha: string;
  Midnight: string;
}

export interface PrayerRecord {
  id: string;
  date: string; // YYYY-MM-DD
  prayer: PrayerName;
  status: 'prayed' | 'missed' | 'delayed';
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
  | 'MWL' // Muslim World League
  | 'ISNA' // Islamic Society of North America
  | 'Egypt' // Egyptian General Authority of Survey
  | 'Makkah' // Umm al-Qura, Makkah
  | 'Karachi' // University of Islamic Sciences, Karachi
  | 'Tehran' // Institute of Geophysics, University of Tehran
  | 'Jafari'; // Shia Ithna Ashari

export interface UserSettings {
  name?: string;
  location: Location;
  calculationMethod: CalculationMethod;
  asrJuristic: 'Standard' | 'Hanafi';
  adjustments: {
    Fajr: number;
    Dhuhr: number;
    Asr: number;
    Maghrib: number;
    Isha: number;
  };
  notifications: {
    enabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    beforePrayer: number; // minutes
    reminderText: string;
    postPrayerCheck: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
}

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

// Stats types
export interface DailyStats {
  date: string; // YYYY-MM-DD
  prayersCompleted: number;
  totalPrayers: number;
  mindfulnessSessions: number;
  averageFocusScore: number;
  screenTimeBeforePrayer?: number; // Android only
}

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

export interface ScreenTimeData {
  totalScreenTime: number; // minutes
  unlockCount: number;
  firstUnlock: Date | null;
  lastUsed: Date | null;
}

export interface AppUsageData {
  packageName: string;
  appName: string;
  timeSpent: number; // minutes
  category: 'social' | 'productivity' | 'entertainment' | 'other';
  icon?: string;
}

export interface UsageStats {
  totalScreenTime: number; // minutes
  unlockCount: number;
  appUsage: AppUsageData[];
  socialMediaTime: number; // minutes
  productiveTime: number; // minutes
}

export interface DigitalWellnessInsight {
  id: string;
  type: 'warning' | 'achievement' | 'tip';
  title: string;
  description: string;
  icon: string;
  actionable?: {
    label: string;
    action: () => void;
  };
}

export interface PrePrayerUsage {
  prayer: PrayerName;
  screenTime: number; // minutes in 30 min before prayer
  unlockCount: number;
  topApp?: string;
  focusScore: number; // 0-100 based on usage
}

export interface DigitalWellnessGoal {
  id: string;
  type: 'daily_limit' | 'app_limit' | 'unlock_limit' | 'prayer_focus';
  target: number;
  current: number;
  unit: 'minutes' | 'times' | 'score';
  period: 'daily' | 'weekly';
  createdAt: Date;
}

// Update DailyStats to include digital wellness
export interface DailyStats {
  date: string;
  prayersCompleted: number;
  totalPrayers: number;
  mindfulnessSessions: number;
  averageFocusScore: number;
  // Add digital wellness stats
  screenTimeMinutes?: number;
  unlockCount?: number;
  socialMediaMinutes?: number;
  prePrayerDistractions?: {
    [key in PrayerName]?: {
      screenTime: number;
      unlocks: number;
    };
  };
}