// src/services/WidgetService.ts
import { NativeModules, Platform } from 'react-native';
import { PrayerTime, PrayerRecord } from '../types';
import logger from '../utils/logger';

const { SukoonWidgetBridge } = NativeModules;

interface WidgetPrayerData {
  name: string;
  time: string; // ISO string
  status: 'prayed' | 'missed' | 'upcoming' | 'current';
}

interface WidgetData {
  prayerTimes: WidgetPrayerData[];
  nextPrayerName: string;
  nextPrayerTime: string;
  completedCount: number;
  totalPrayers: number;
  streak: number;
  lastUpdated: string;
}

class WidgetService {
  /**
   * Update the widget with current prayer data.
   * iOS: Writes to App Group UserDefaults, triggers WidgetKit reload.
   * Android: Writes to SharedPreferences, triggers AppWidgetManager update.
   */
  async updateWidgetData(
    prayerTimes: PrayerTime[],
    records: PrayerRecord[],
    nextPrayer: PrayerTime | null,
    streak: number
  ): Promise<void> {
    if (Platform.OS === 'web') return;
    if (!SukoonWidgetBridge) {
      logger.log('[Widget] Native bridge not available');
      return;
    }

    try {
      const widgetPrayers: WidgetPrayerData[] = prayerTimes.map((prayer) => {
        const record = records.find((r) => r.prayer === prayer.name);
        let status: WidgetPrayerData['status'] = 'upcoming';

        if (record?.status === 'prayed') {
          status = 'prayed';
        } else if (prayer.isNext) {
          status = 'current';
        } else if (prayer.time < new Date()) {
          status = 'missed';
        }

        return {
          name: prayer.name,
          time: prayer.time.toISOString(),
          status,
        };
      });

      const completedCount = records.filter((r) => r.status === 'prayed').length;

      const data: WidgetData = {
        prayerTimes: widgetPrayers,
        nextPrayerName: nextPrayer?.name || '',
        nextPrayerTime: nextPrayer?.time?.toISOString() || '',
        completedCount,
        totalPrayers: 5,
        streak,
        lastUpdated: new Date().toISOString(),
      };

      await SukoonWidgetBridge.setWidgetData(JSON.stringify(data));
      await SukoonWidgetBridge.reloadWidgets();
    } catch (error) {
      logger.error('[Widget] Failed to update widget data:', error);
    }
  }

  /**
   * Force reload all widget timelines.
   */
  async reloadWidgets(): Promise<void> {
    if (Platform.OS === 'web' || !SukoonWidgetBridge) return;
    try {
      await SukoonWidgetBridge.reloadWidgets();
    } catch (error) {
      logger.error('[Widget] Failed to reload widgets:', error);
    }
  }
}

export default new WidgetService();
