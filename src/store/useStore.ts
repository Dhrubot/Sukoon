import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { 
  UserSettings, 
  PrayerTime, 
  PrayerRecord, 
  Location,
  DailyStats,
  Achievement,
  MindfulnessSession
} from '../types';

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
  
  // Sun times (Sunrise/Sunset)
  todaySunrise: Date | null;
  setTodaySunrise: (time: Date | null) => void;
  todaySunset: Date | null;
  setTodaySunset: (time: Date | null) => void;
  
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
}

export const useStore = create<AppState>((set) => ({
  // User settings
  userSettings: null,
  setUserSettings: (settings) => set({ userSettings: settings }),
  updateUserSettings: (updates) => 
    set((state) => ({
      userSettings: state.userSettings 
        ? { ...state.userSettings, ...updates }
        : null
    })),
  
  // Location
  location: null,
  setLocation: (location) => set({ location }),
  
  // Prayer times
  todayPrayerTimes: [],
  setTodayPrayerTimes: (times) => set({ todayPrayerTimes: times }),
  nextPrayer: null,
  setNextPrayer: (prayer) => set({ nextPrayer: prayer }),
  
  // Sun times
  todaySunrise: null,
  setTodaySunrise: (time) => set({ todaySunrise: time }),
  todaySunset: null,
  setTodaySunset: (time) => set({ todaySunset: time }),
  
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
  
  // Stats
  currentStreak: 0,
  setCurrentStreak: (streak) => set({ currentStreak: streak }),
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
    setTodaySunrise: state.setTodaySunrise,
    setTodaySunset: state.setTodaySunset,
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