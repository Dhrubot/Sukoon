import { Appearance, NativeModules, Platform } from 'react-native';
import { PrayerTime, PrayerRecord } from '../types';
import { PRAYER_ARABIC_MAP, FARD_PRAYER_NAMES_LIST } from '../constants/prayerRegistry';
import { useStore } from '../store/useStore';
import StorageService from './StorageService';
import { getCachedHijriDate } from '../utils/ramadan';
import { formatHijriDateSync } from '../utils/hijriDate';
import { getLocalDateKey } from '../utils/dateHelpers';
import logger from '../utils/logger';
import { resolvePrayerSurfaceState } from '../utils/prayerSurfaceResolver';

const { SukoonWidgetBridge } = NativeModules;

type WidgetThemeMode = 'light' | 'dark' | 'midnight';
type WidgetPrayerStatus = 'prayed' | 'missed' | 'upcoming' | 'current' | 'next';
type LegacyWidgetPrayerStatus = 'prayed' | 'missed' | 'upcoming' | 'current';

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

interface WidgetSurfaceData {
  activePrayerName: string;
  displayPrayerName: string;
  heroGradientPrayerName: string;
  ringAccentPrayerName: string;
  ringColorMode: 'gold' | 'prayer';
  countdownTargetName: string;
  countdownTargetISO: string;
  phase: 'pre_adhan' | 'fiqh_window' | 'prayed';
  countdownMode: 'current_prayer_end' | 'next_prayer_start';
}

interface WidgetHijriData {
  day: number;
  monthEn: string;
  monthAr: string;
  year: number;
  shortLabel: string;
}

interface LegacyWidgetPrayerData {
  name: string;
  time: string;
  status: LegacyWidgetPrayerStatus;
}

interface LegacyWidgetData {
  prayerTimes: LegacyWidgetPrayerData[];
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

export interface WidgetSnapshot {
  version: 2;
  themeMode: WidgetThemeMode;
  nextPrayer: WidgetNextPrayer | null;
  prayers: WidgetPrayerData[];
  surface: WidgetSurfaceData | null;
  hijri: WidgetHijriData;
  supportiveLine: string;
  lastUpdatedISO: string;
}

type WidgetPayload = WidgetSnapshot & LegacyWidgetData;

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

  private resolveSupportiveLine(
    surface: ReturnType<typeof resolvePrayerSurfaceState>,
    now: Date
  ): string {
    if (!surface) {
      return 'Rest in remembrance until the next prayer';
    }

    if (getLocalDateKey(surface.displayPrayer.time) !== getLocalDateKey(now)) {
      return 'Rest in remembrance until the next prayer';
    }

    if (surface.phase === 'fiqh_window' && surface.countdownMode === 'current_prayer_end') {
      return 'Return with the next prayer';
    }

    return 'Prepare for the next salah';
  }

  buildSnapshot(
    prayerTimes: PrayerTime[],
    records: PrayerRecord[],
    nextPrayer: PrayerTime | null,
    tomorrowFajr?: PrayerTime | null,
    todaySunrise?: Date | null,
  ): WidgetSnapshot {
    const now = new Date();
    const surface = resolvePrayerSurfaceState(
      prayerTimes,
      records,
      nextPrayer,
      tomorrowFajr ?? null,
      now,
      todaySunrise ?? null,
    );
    const statusByPrayer = new Map<string, WidgetPrayerStatus>();
    prayerTimes.forEach((prayer, index) => {
      const status = surface?.prayerStatuses[index] as WidgetPrayerStatus | undefined;
      if (status) {
        statusByPrayer.set(prayer.name, status);
      }
    });
    const prayers = FARD_PRAYER_NAMES_LIST.map((name) => prayerTimes.find((entry) => entry.name === name))
      .filter((entry): entry is PrayerTime => !!entry)
      .map((prayer) => ({
        name: prayer.name,
        arabicName: PRAYER_ARABIC_MAP[prayer.name.toLowerCase()] ?? prayer.name,
        timeISO: prayer.time.toISOString(),
        status: statusByPrayer.get(prayer.name) ?? (prayer.time < now ? 'missed' : 'upcoming'),
        accentKey: prayer.name.toLowerCase(),
      }));

    const nextPrayerPayload = surface
      ? {
          name: surface.displayPrayer.name,
          arabicName: PRAYER_ARABIC_MAP[surface.displayPrayer.name.toLowerCase()] ?? surface.displayPrayer.name,
          timeISO: surface.displayPrayer.time.toISOString(),
          remainingMinutes: Math.max(
            0,
            Math.floor((surface.countdownTarget.time.getTime() - now.getTime()) / 60000)
          ),
        }
      : null;

    return {
      version: 2,
      themeMode: this.resolveThemeMode(),
      nextPrayer: nextPrayerPayload,
      prayers,
      surface: surface
        ? {
            activePrayerName: surface.activePrayer.name,
            displayPrayerName: surface.displayPrayer.name,
            heroGradientPrayerName: surface.heroGradientPrayer.name,
            ringAccentPrayerName: surface.ringAccentPrayer.name,
            ringColorMode: surface.ringColorMode,
            countdownTargetName: surface.countdownTarget.name,
            countdownTargetISO: surface.countdownTarget.time.toISOString(),
            phase: surface.phase,
            countdownMode: surface.countdownMode,
          }
        : null,
      hijri: this.buildHijriPayload(),
      supportiveLine: this.resolveSupportiveLine(surface, now),
      lastUpdatedISO: now.toISOString(),
    };
  }

  private resolveLegacyStatus(status: WidgetPrayerStatus): LegacyWidgetPrayerStatus {
    return status === 'next' ? 'current' : status;
  }

  private buildLegacyPayload(snapshot: WidgetSnapshot, records: PrayerRecord[]): LegacyWidgetData {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const verse = WIDGET_VERSES[dayOfYear % WIDGET_VERSES.length];

    return {
      prayerTimes: snapshot.prayers.map((prayer) => ({
        name: prayer.name,
        time: prayer.timeISO,
        status: this.resolveLegacyStatus(prayer.status),
      })),
      nextPrayerName: snapshot.nextPrayer?.name ?? '',
      nextPrayerTime: snapshot.nextPrayer?.timeISO ?? '',
      completedCount: records.filter((record) => record.status === 'prayed').length,
      totalPrayers: 5,
      dawam: StorageService.getCurrentDawam(),
      hijriDate: snapshot.hijri.shortLabel || formatHijriDateSync(),
      dailyVerse: verse[0],
      dailyVerseRef: verse[1],
      lastUpdated: snapshot.lastUpdatedISO,
    };
  }

  private buildPayload(
    prayerTimes: PrayerTime[],
    records: PrayerRecord[],
    nextPrayer: PrayerTime | null,
    tomorrowFajr?: PrayerTime | null,
    todaySunrise?: Date | null,
  ): WidgetPayload {
    const snapshot = this.buildSnapshot(prayerTimes, records, nextPrayer, tomorrowFajr, todaySunrise);
    return {
      ...snapshot,
      ...this.buildLegacyPayload(snapshot, records),
    };
  }

  private async pushPayload(payload: WidgetPayload): Promise<void> {
    if (Platform.OS === 'web') return;
    if (!SukoonWidgetBridge) {
      logger.log('[Widget] Native bridge not available');
      return;
    }

    await SukoonWidgetBridge.setWidgetData(JSON.stringify(payload));
    await SukoonWidgetBridge.reloadWidgets();
  }

  /**
   * Update widgets using explicit prayer data.
   */
  async updateWidgetData(
    prayerTimes: PrayerTime[],
    records: PrayerRecord[],
    nextPrayer: PrayerTime | null,
    tomorrowFajr?: PrayerTime | null,
    todaySunrise?: Date | null,
  ): Promise<void> {
    try {
      await this.pushPayload(this.buildPayload(prayerTimes, records, nextPrayer, tomorrowFajr, todaySunrise));
    } catch (error) {
      logger.error('[Widget] Failed to update widget data:', error);
    }
  }

  /**
   * Rebuild the snapshot from the current store + storage state.
   */
  async refreshFromStore(): Promise<void> {
    const { todayPrayerTimes, nextPrayer, todayPrayerRecords, tomorrowFajr, todaySunrise } = useStore.getState();
    const todayKey = getLocalDateKey();
    const persistedRecords = StorageService.getDayPrayerRecords(todayKey);
    const records = persistedRecords.length > 0 ? persistedRecords : todayPrayerRecords;
    await this.updateWidgetData(todayPrayerTimes, records, nextPrayer, tomorrowFajr, todaySunrise);
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
