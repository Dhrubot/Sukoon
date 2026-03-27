import { Appearance, NativeModules, Platform } from 'react-native';
import { PrayerTime, PrayerRecord } from '../types';
import { PRAYER_ARABIC_MAP, FARD_PRAYER_NAMES_LIST } from '../constants/prayerRegistry';
import { useStore } from '../store/useStore';
import StorageService from './StorageService';
import { getCachedHijriDate } from '../utils/ramadan';
import { formatHijriDateSync } from '../utils/hijriDate';
import { getLocalDateKey } from '../utils/dateHelpers';
import logger from '../utils/logger';

const { SukoonWidgetBridge } = NativeModules;

type WidgetThemeMode = 'light' | 'dark' | 'midnight';
type WidgetPrayerStatus = 'prayed' | 'missed' | 'upcoming' | 'current' | 'next';

interface WidgetPrayerData {
  name: string;
  arabicName: string;
  timeISO: string;
  status: WidgetPrayerStatus;
  accentKey: string;
}

interface WidgetNextPrayer {
  name: string;
  arabicName: string;
  timeISO: string;
  remainingMinutes: number;
}

interface WidgetHijriData {
  day: number;
  monthEn: string;
  monthAr: string;
  year: number;
  shortLabel: string;
}

export interface WidgetSnapshot {
  version: 2;
  themeMode: WidgetThemeMode;
  nextPrayer: WidgetNextPrayer | null;
  prayers: WidgetPrayerData[];
  hijri: WidgetHijriData;
  supportiveLine: string;
  lastUpdatedISO: string;
}

class WidgetService {
  private resolveThemeMode(): WidgetThemeMode {
    const storedTheme = useStore.getState().userSettings?.theme ?? StorageService.getUserSettings()?.theme;
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'midnight') {
      return storedTheme;
    }

    return Appearance.getColorScheme() === 'light' ? 'light' : 'midnight';
  }

  private buildHijriPayload(): WidgetHijriData {
    const cachedHijri = getCachedHijriDate();
    if (cachedHijri) {
      return {
        day: cachedHijri.day,
        monthEn: cachedHijri.monthNameEn,
        monthAr: cachedHijri.monthNameAr,
        year: cachedHijri.year,
        shortLabel: `${cachedHijri.day} ${cachedHijri.monthNameEn}`,
      };
    }

    const fallback = formatHijriDateSync();
    return {
      day: 0,
      monthEn: '',
      monthAr: '',
      year: 0,
      shortLabel: fallback,
    };
  }

  private resolvePrayerStatus(
    prayer: PrayerTime,
    records: PrayerRecord[],
    nextPrayer: PrayerTime | null,
    now: Date
  ): WidgetPrayerStatus {
    const record = records.find((entry) => entry.prayer === prayer.name);
    if (record?.status === 'prayed') return 'prayed';
    if (nextPrayer?.name === prayer.name) {
      return prayer.time <= now ? 'current' : 'next';
    }
    if (prayer.time < now) return 'missed';
    return 'upcoming';
  }

  private resolveSupportiveLine(
    prayerTimes: PrayerTime[],
    records: PrayerRecord[],
    nextPrayer: PrayerTime | null,
    now: Date
  ): string {
    if (prayerTimes.length === 0 || !nextPrayer) {
      return 'Rest in remembrance until the next prayer';
    }

    const nextRecord = records.find((entry) => entry.prayer === nextPrayer.name);
    if (getLocalDateKey(nextPrayer.time) !== getLocalDateKey(now)) {
      return 'Rest in remembrance until the next prayer';
    }

    if (nextPrayer.time <= now && nextRecord?.status !== 'prayed') {
      return 'Return with the next prayer';
    }

    return 'Prepare for the next salah';
  }

  buildSnapshot(
    prayerTimes: PrayerTime[],
    records: PrayerRecord[],
    nextPrayer: PrayerTime | null
  ): WidgetSnapshot {
    const now = new Date();
    const prayers = FARD_PRAYER_NAMES_LIST.map((name) => prayerTimes.find((entry) => entry.name === name))
      .filter((entry): entry is PrayerTime => !!entry)
      .map((prayer) => ({
        name: prayer.name,
        arabicName: PRAYER_ARABIC_MAP[prayer.name.toLowerCase()] ?? prayer.name,
        timeISO: prayer.time.toISOString(),
        status: this.resolvePrayerStatus(prayer, records, nextPrayer, now),
        accentKey: prayer.name.toLowerCase(),
      }));

    const nextPrayerPayload = nextPrayer
      ? {
          name: nextPrayer.name,
          arabicName: PRAYER_ARABIC_MAP[nextPrayer.name.toLowerCase()] ?? nextPrayer.name,
          timeISO: nextPrayer.time.toISOString(),
          remainingMinutes: Math.max(
            0,
            Math.floor((nextPrayer.time.getTime() - now.getTime()) / 60000)
          ),
        }
      : null;

    return {
      version: 2,
      themeMode: this.resolveThemeMode(),
      nextPrayer: nextPrayerPayload,
      prayers,
      hijri: this.buildHijriPayload(),
      supportiveLine: this.resolveSupportiveLine(prayerTimes, records, nextPrayer, now),
      lastUpdatedISO: now.toISOString(),
    };
  }

  private async pushSnapshot(snapshot: WidgetSnapshot): Promise<void> {
    if (Platform.OS === 'web') return;
    if (!SukoonWidgetBridge) {
      logger.log('[Widget] Native bridge not available');
      return;
    }

    await SukoonWidgetBridge.setWidgetData(JSON.stringify(snapshot));
    await SukoonWidgetBridge.reloadWidgets();
  }

  /**
   * Update widgets using explicit prayer data.
   */
  async updateWidgetData(
    prayerTimes: PrayerTime[],
    records: PrayerRecord[],
    nextPrayer: PrayerTime | null
  ): Promise<void> {
    try {
      await this.pushSnapshot(this.buildSnapshot(prayerTimes, records, nextPrayer));
    } catch (error) {
      logger.error('[Widget] Failed to update widget data:', error);
    }
  }

  /**
   * Rebuild the snapshot from the current store + storage state.
   */
  async refreshFromStore(): Promise<void> {
    const { todayPrayerTimes, nextPrayer, todayPrayerRecords } = useStore.getState();
    const todayKey = getLocalDateKey();
    const persistedRecords = StorageService.getDayPrayerRecords(todayKey);
    const records = persistedRecords.length > 0 ? persistedRecords : todayPrayerRecords;
    await this.updateWidgetData(todayPrayerTimes, records, nextPrayer);
  }

  /**
   * Backwards-compatible entrypoint for callers that only know how to request a refresh.
   */
  async reloadWidgets(): Promise<void> {
    try {
      await this.refreshFromStore();
    } catch (error) {
      logger.error('[Widget] Failed to reload widgets:', error);
    }
  }
}

export default new WidgetService();
