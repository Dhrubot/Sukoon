// src/services/WidgetService.ts
import { NativeModules, Platform } from 'react-native';
import { PrayerTime, PrayerRecord } from '../types';
import { formatHijriDateSync } from '../utils/hijriDate';
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
  dawam: number;
  hijriDate: string;
  dailyVerse: string;
  dailyVerseRef: string;
  lastUpdated: string;
}

const WIDGET_VERSES: [string, string][] = [
  ['Indeed, prayer prohibits immorality and wrongdoing', '29:45'],
  ['And seek help through patience and prayer', '2:45'],
  ['Indeed, Allah is with the patient', '2:153'],
  ['So remember Me; I will remember you', '2:152'],
  ['In the remembrance of Allah do hearts find rest', '13:28'],
  ['And He is with you wherever you are', '57:4'],
  ['Allah does not burden a soul beyond that it can bear', '2:286'],
  ['Whoever puts their trust in Allah, He will be enough for them', '65:3'],
  ['And whoever fears Allah, He will make for them a way out', '65:2'],
  ['My mercy encompasses all things', '7:156'],
  ['Call upon Me; I will respond to you', '40:60'],
  ['Do not lose hope in the mercy of Allah', '39:53'],
  ['Verily, with hardship comes ease', '94:6'],
  ['He is the First and the Last, the Ascendant and the Intimate', '57:3'],
  ['And We have certainly made the Quran easy for remembrance', '54:17'],
  ['The most beloved deeds to Allah are those done consistently', 'Bukhari'],
  ['He who draws close to Me a hand span, I draw close to him an arm\'s length', 'Bukhari'],
  ['Allah is beautiful and He loves beauty', 'Muslim'],
  ['The strong believer is better than the weak believer', 'Muslim'],
  ['Every act of kindness is charity', 'Bukhari'],
  ['None of you truly believes until he loves for his brother what he loves for himself', 'Bukhari'],
  ['The best of you are those who learn the Quran and teach it', 'Bukhari'],
  ['Whoever believes in Allah and the Last Day, let him speak good or remain silent', 'Bukhari'],
  ['Take advantage of five before five: your youth before old age', 'Hakim'],
  ['The world is a prison for the believer and a paradise for the disbeliever', 'Muslim'],
  ['Actions are judged by intentions', 'Bukhari'],
  ['Be in this world as if you were a stranger or a traveler', 'Bukhari'],
  ['Truly, Allah does not look at your appearance or wealth, but at your hearts and deeds', 'Muslim'],
  ['Whoever is patient, Allah will give him patience', 'Bukhari'],
  ['The best remembrance is La ilaha illallah', 'Tirmidhi'],
];

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
    dawam: number
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

      const hijriDate = formatHijriDateSync();
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );
      const verse = WIDGET_VERSES[dayOfYear % WIDGET_VERSES.length];

      const data: WidgetData = {
        prayerTimes: widgetPrayers,
        nextPrayerName: nextPrayer?.name || '',
        nextPrayerTime: nextPrayer?.time?.toISOString() || '',
        completedCount,
        totalPrayers: 5,
        dawam,
        hijriDate,
        dailyVerse: verse[0],
        dailyVerseRef: verse[1],
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
