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

interface AppState {
  // User settings
  userSettings: UserSettings | null;
  setUserSettings: (settings: UserSettings) => void;
  updateUserSettings: (updates: Partial<UserSettings>) => void;
  
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
  currentStreak: number;
  setCurrentStreak: (streak: number) => void;
  todayStats: DailyStats | null;
  setTodayStats: (stats: DailyStats | null) => void;
  
  // Achievements
  achievements: Achievement[];
  setAchievements: (achievements: Achievement[]) => void;
  celebratingAchievement: Achievement | null;
  setCelebratingAchievement: (achievement: Achievement | null) => void;
  
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
      const current = state.userSettings;
      const updated = { ...current } as any;
      for (const key of Object.keys(updates) as Array<keyof typeof updates>) {
        const val = updates[key];
        if (
          val !== null &&
          val !== undefined &&
          typeof val === 'object' &&
          !Array.isArray(val) &&
          typeof (current as any)[key] === 'object' &&
          (current as any)[key] !== null
        ) {
          updated[key] = { ...(current as any)[key], ...val };
        } else {
          updated[key] = val;
        }
      }
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
  currentStreak: 0,
  setCurrentStreak: (streak) => {
    StorageService.setStreak(streak);
    set({ currentStreak: streak });
  },
  todayStats: null,
  setTodayStats: (stats) => set({ todayStats: stats }),
  
  // Achievements
  achievements: [],
  setAchievements: (achievements) => set({ achievements }),
  celebratingAchievement: null,
  setCelebratingAchievement: (achievement) => set({ celebratingAchievement: achievement }),
  
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
 * Hook for stats and streaks
 */
export const useStats = () => useStore(
  useShallow((state) => ({
    currentStreak: state.currentStreak,
    setCurrentStreak: state.setCurrentStreak,
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