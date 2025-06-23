import { create } from 'zustand';
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
  
  // UI State
  isRefreshing: false,
  setIsRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
  activeTab: 'Home',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));