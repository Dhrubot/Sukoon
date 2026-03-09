import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { 
  UserSettings, 
  PrayerTime, 
  PrayerName,
  PrayerRecord, 
  Location,
  DailyStats,
  Achievement,
  MindfulnessSession
} from '../types';
import StorageService from '../services/StorageService';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface AppState {
  // User settings
  userSettings: UserSettings | null;
  setUserSettings: (settings: UserSettings) => void;
  updateUserSettings: (updates: DeepPartial<UserSettings>) => void;
  
  // Location
  location: Location | null;
  setLocation: (location: Location) => void;
  
  // Prayer times
  todayPrayerTimes: PrayerTime[];
  setTodayPrayerTimes: (times: PrayerTime[]) => void;
  nextPrayer: PrayerTime | null;
  setNextPrayer: (prayer: PrayerTime | null) => void;
  
  // Sun times (Sunrise/Sunset) and Midnight
  todaySunrise: Date | null;
  setTodaySunrise: (time: Date | null) => void;
  todaySunset: Date | null;
  setTodaySunset: (time: Date | null) => void;
  todayMidnight: Date | null;
  setTodayMidnight: (time: Date | null) => void;
  
  // Prayer records
  todayPrayerRecords: PrayerRecord[];
  setTodayPrayerRecords: (records: PrayerRecord[]) => void;
  addPrayerRecord: (record: PrayerRecord) => void;
  
  // Mindfulness
  currentMindfulnessSession: MindfulnessSession | null;
  setCurrentMindfulnessSession: (session: MindfulnessSession | null) => void;
  
  // Stats
  currentDawam: number;
  setCurrentDawam: (dawam: number) => void;
  engagementDawam: number;
  setEngagementDawam: (dawam: number) => void;
  todayStats: DailyStats | null;
  setTodayStats: (stats: DailyStats | null) => void;
  
  // Achievements
  achievements: Achievement[];
  setAchievements: (achievements: Achievement[]) => void;
  celebratingAchievement: Achievement | null;
  setCelebratingAchievement: (achievement: Achievement | null) => void;
  
  // Shared clock — single 60s tick updated by PrayerTimesProvider
  currentTime: Date;
  setCurrentTime: (time: Date) => void;

  // UI State
  isRefreshing: boolean;
  setIsRefreshing: (refreshing: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Mosque mode prompt (set when user taps notification)
  pendingMosquePromptPrayer: PrayerName | null;
  setPendingMosquePromptPrayer: (prayer: PrayerName | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // User settings — write-through: Zustand + StorageService stay in sync
  userSettings: null,
  setUserSettings: (settings) => {
    StorageService.setUserSettings(settings);
    set({ userSettings: settings });
  },
  updateUserSettings: (updates) => 
    set((state) => {
      if (!state.userSettings) return { userSettings: null };

      // Recursive deep merge capped at maxDepth to avoid infinite loops
      const deepMerge = (target: any, source: any, depth: number = 0): any => {
        if (depth > 3) return source; // safety cap
        const result = { ...target };
        for (const key of Object.keys(source)) {
          const srcVal = source[key];
          const tgtVal = target[key];
          if (
            srcVal !== null &&
            srcVal !== undefined &&
            typeof srcVal === 'object' &&
            !Array.isArray(srcVal) &&
            typeof tgtVal === 'object' &&
            tgtVal !== null &&
            !Array.isArray(tgtVal)
          ) {
            result[key] = deepMerge(tgtVal, srcVal, depth + 1);
          } else {
            result[key] = srcVal;
          }
        }
        return result;
      };

      const updated = deepMerge(state.userSettings, updates);
      StorageService.setUserSettings(updated);
      return { userSettings: updated };
    }),
  
  // Location — write-through to StorageService
  location: null,
  setLocation: (location) => {
    // Persist location inside userSettings
    const settings = StorageService.getUserSettings();
    if (settings) {
      StorageService.setUserSettings({ ...settings, location });
    }
    set({ location });
  },
  
  // Prayer times
  todayPrayerTimes: [],
  setTodayPrayerTimes: (times) => set({ todayPrayerTimes: times }),
  nextPrayer: null,
  setNextPrayer: (prayer) => set({ nextPrayer: prayer }),
  
  // Sun times and Midnight
  todaySunrise: null,
  setTodaySunrise: (time) => set({ todaySunrise: time }),
  todaySunset: null,
  setTodaySunset: (time) => set({ todaySunset: time }),
  todayMidnight: null,
  setTodayMidnight: (time) => set({ todayMidnight: time }),
  
  // Prayer records
  todayPrayerRecords: [],
  setTodayPrayerRecords: (records) => set({ todayPrayerRecords: records }),
  addPrayerRecord: (record) => 
    set((state) => ({
      todayPrayerRecords: [
        ...state.todayPrayerRecords.filter(r => r.prayer !== record.prayer),
        record
      ]
    })),
  
  // Mindfulness
  currentMindfulnessSession: null,
  setCurrentMindfulnessSession: (session) => 
    set({ currentMindfulnessSession: session }),
  
  // Stats — write-through to StorageService
  currentDawam: 0,
  setCurrentDawam: (dawam) => {
    StorageService.setDawam(dawam);
    set({ currentDawam: dawam });
  },
  engagementDawam: 0,
  setEngagementDawam: (dawam) => {
    StorageService.setEngagementDawam(dawam);
    set({ engagementDawam: dawam });
  },
  todayStats: null,
  setTodayStats: (stats) => set({ todayStats: stats }),
  
  // Achievements
  achievements: [],
  setAchievements: (achievements) => set({ achievements }),
  celebratingAchievement: null,
  setCelebratingAchievement: (achievement) => set({ celebratingAchievement: achievement }),
  
  // Shared clock
  currentTime: new Date(),
  setCurrentTime: (time) => set({ currentTime: time }),

  // UI State
  isRefreshing: false,
  setIsRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
  activeTab: 'Home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Mosque mode prompt
  pendingMosquePromptPrayer: null,
  setPendingMosquePromptPrayer: (prayer) => set({ pendingMosquePromptPrayer: prayer }),
}));

// 🎯 SELECTIVE HOOKS - Prevent unnecessary re-renders by subscribing to specific state slices

/**
 * Hook for user settings only - use when you only need settings
 */
export const useUserSettings = () => useStore((state) => state.userSettings);

/**
 * Hook for location only
 */
export const useLocation = () => useStore((state) => state.location);

/**
 * Hook for prayer times data
 */
export const usePrayerTimesState = () => useStore(
  useShallow((state) => ({
    todayPrayerTimes: state.todayPrayerTimes,
    nextPrayer: state.nextPrayer,
    setTodayPrayerTimes: state.setTodayPrayerTimes,
    setNextPrayer: state.setNextPrayer,
  }))
);

/**
 * Hook for sun times only
 */
export const useSunTimes = () => useStore(
  useShallow((state) => ({
    todaySunrise: state.todaySunrise,
    todaySunset: state.todaySunset,
    todayMidnight: state.todayMidnight,
    setTodaySunrise: state.setTodaySunrise,
    setTodaySunset: state.setTodaySunset,
    setTodayMidnight: state.setTodayMidnight,
  }))
);

/**
 * Hook for prayer records
 */
export const usePrayerRecords = () => useStore(
  useShallow((state) => ({
    todayPrayerRecords: state.todayPrayerRecords,
    setTodayPrayerRecords: state.setTodayPrayerRecords,
    addPrayerRecord: state.addPrayerRecord,
  }))
);

/**
 * Hook for stats and dawam
 */
export const useStats = () => useStore(
  useShallow((state) => ({
    currentDawam: state.currentDawam,
    setCurrentDawam: state.setCurrentDawam,
    engagementDawam: state.engagementDawam,
    setEngagementDawam: state.setEngagementDawam,
    todayStats: state.todayStats,
    setTodayStats: state.setTodayStats,
  }))
);

/**
 * Hook for achievements
 */
export const useAchievements = () => useStore(
  useShallow((state) => ({
    achievements: state.achievements,
    setAchievements: state.setAchievements,
    celebratingAchievement: state.celebratingAchievement,
    setCelebratingAchievement: state.setCelebratingAchievement,
  }))
);

/**
 * Hook for UI state
 */
export const useUIState = () => useStore(
  useShallow((state) => ({
    isRefreshing: state.isRefreshing,
    setIsRefreshing: state.setIsRefreshing,
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
  }))
);