// src/types/garden.ts
import { PrayerName } from './index';

export type GrowthStage = 'seed' | 'sprout' | 'bloom';

export interface GardenPlant {
  prayer: PrayerName;
  date: string; // YYYY-MM-DD
  growthStage: GrowthStage;
  mood: number; // 1-5
  hasText: boolean;
  emoji: string;
}

export interface WeekDay {
  date: string;
  dayLabel: string; // "Mo", "Tu", etc.
  plants: GardenPlant[];
  isToday: boolean;
}

export interface ReflectionEntry {
  prayer: PrayerName;
  date: string;
  relativeDate: string; // "Today", "Yesterday", "3 days ago"
  text: string | null; // null for legacy data without text
  mood: number;
  emoji: string;
}

export interface GardenData {
  plants: GardenPlant[];
  weekSummary: WeekDay[];
  recentReflections: ReflectionEntry[];
  totalPlants: number;
  newBlooms: number; // blooms added this week
  isEmpty: boolean;
}
