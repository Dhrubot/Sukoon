// src/services/ReflectionGardenService.ts
import { format, subDays, startOfWeek, addDays, isToday } from 'date-fns';
import StorageService from './StorageService';
import TubaTreeService from './TubaTreeService';
import TreeGrowthStateService from './TreeGrowthStateService';
import { PrayerName } from '../types';
import {
  GardenPlant,
  GardenData,
  GrowthStage,
  WeekDay,
  ReflectionEntry,
} from '../types/garden';
import { TreeData } from '../types/tubaTree';

// Plant emoji lookup: prayer × growth stage
const PLANT_EMOJI: Record<string, Record<GrowthStage, string>> = {
  Fajr:    { seed: '🌱', sprout: '🌿', bloom: '🪻' },
  Dhuhr:   { seed: '🌱', sprout: '🌿', bloom: '🌳' },
  Asr:     { seed: '🌱', sprout: '🌾', bloom: '🌻' },
  Maghrib: { seed: '🌱', sprout: '🌹', bloom: '🌺' },
  Isha:    { seed: '🌱', sprout: '🌿', bloom: '🌸' },
};

class ReflectionGardenService {
  /**
   * Build the full garden data model from the last N days of prayer records.
   */
  getGardenData(days: number = 28): GardenData {
    const plants = this.getPlants(days);
    const weekSummary = this.getWeekSummary(plants);
    const recentReflections = this.getRecentReflections(10);

    // Count blooms added this week
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const newBlooms = plants.filter(
      (p) => p.date >= weekStart && p.growthStage === 'bloom'
    ).length;

    return {
      plants,
      weekSummary,
      recentReflections,
      totalPlants: plants.length,
      newBlooms,
      isEmpty: plants.length === 0,
    };
  }

  /**
   * Build tree visualization data from the last N days of reflections.
   * Delegates to TubaTreeService for geometry computation.
   * (Phase 3 addition)
   */
  getTreeData(days: number = 28): TreeData {
    const growthState = TreeGrowthStateService.getState();
    const recentPlants = this.getPlants(days);
    return TubaTreeService.buildTreeData(growthState, recentPlants);
  }

  /**
   * Public accessor for plant data (used by TreeGrowthState bootstrap).
   */
  getAllPlants(days: number): GardenPlant[] {
    return this.getPlants(days);
  }

  /**
   * Convert prayer records with reflections into GardenPlant objects.
   */
  private getPlants(days: number): GardenPlant[] {
    const plants: GardenPlant[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const records = StorageService.getDayPrayerRecords(dateStr);

      for (const record of records) {
        // Include ALL prayers marked as prayed — not just those with mindfulness
        if (record.status !== 'prayed') continue;

        const mood = record.mindfulnessScore
          ? Math.round(record.mindfulnessScore / 20)
          : record.focusScore
            ? Math.round(record.focusScore / 20)
            : 3; // default to mid if no score

        const clampedMood = Math.max(1, Math.min(5, mood));
        const growthStage = this.getGrowthStage(clampedMood);
        const emoji = this.getPlantEmoji(record.prayer as PrayerName, growthStage);

        plants.push({
          prayer: record.prayer as PrayerName,
          date: dateStr,
          growthStage,
          mood: clampedMood,
          hasText: !!record.reflectionAdded,
          emoji,
        });
      }
    }

    return plants;
  }

  /**
   * Determine growth stage from mood (1-5).
   */
  getGrowthStage(mood: number): GrowthStage {
    if (mood <= 2) return 'seed';
    if (mood === 3) return 'sprout';
    return 'bloom';
  }

  /**
   * Get the emoji for a prayer at a given growth stage.
   */
  getPlantEmoji(prayer: PrayerName, stage: GrowthStage): string {
    return PLANT_EMOJI[prayer]?.[stage] ?? PLANT_EMOJI.Fajr[stage];
  }

  /**
   * Build the current week summary (Mon-Sun) for the week timeline.
   */
  private getWeekSummary(allPlants: GardenPlant[]): WeekDay[] {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const week: WeekDay[] = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayPlants = allPlants.filter((p) => p.date === dateStr);

      week.push({
        date: dateStr,
        dayLabel: dayLabels[i],
        plants: dayPlants,
        isToday: isToday(day),
      });
    }

    return week;
  }

  /**
   * Get recent reflection entries for the journal view.
   */
  getRecentReflections(limit: number): ReflectionEntry[] {
    const raw = StorageService.getReflectionsInRange(28);
    const now = new Date();

    return raw.slice(0, limit).map((r) => {
      const mood = (() => {
        const record = StorageService.getPrayerRecord(r.date, r.prayer);
        if (!record) return 3;
        const score = record.mindfulnessScore || record.focusScore || 60;
        return Math.max(1, Math.min(5, Math.round(score / 20)));
      })();

      const stage = this.getGrowthStage(mood);
      const emoji = this.getPlantEmoji(r.prayer as PrayerName, stage);

      return {
        prayer: r.prayer as PrayerName,
        date: r.date,
        relativeDate: this.getRelativeDate(r.date, now),
        text: r.text,
        mood,
        emoji,
      };
    });
  }

  /**
   * Human-readable relative date string.
   */
  private getRelativeDate(dateStr: string, now: Date): string {
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    const diffMs = now.getTime() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }
}

export default new ReflectionGardenService();