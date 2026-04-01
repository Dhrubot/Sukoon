// src/services/LiveActivityService.ts
// JS wrapper for native Live Activity bridge (iOS ActivityKit / Android ongoing notification).
// Platform-aware: iOS uses SukoonLiveActivityBridge, Android uses LiveActivityModule.

import { NativeModules, Platform } from 'react-native';
import { PrayerTime, PrayerRecord } from '../types';
import { PRAYER_ARABIC_MAP } from '../constants/prayerRegistry';
import { getCachedHijriDate } from '../utils/ramadan';
import { formatHijriDateSync } from '../utils/hijriDate';
import logger from '../utils/logger';
import { resolvePrayerSurfaceState } from '../utils/prayerSurfaceResolver';
import StorageService from './StorageService';
import { useStore } from '../store/useStore';

interface LiveActivityPayload {
  prayerName: string;
  prayerArabicName: string;
  activePrayerName: string;
  hijriShortLabel: string;
  countdownTargetISO: string;
  countdownTargetPrayerName: string;
  phase: 'pre_adhan' | 'fiqh_window' | 'prayed';
  countdownMode: 'current_prayer_end' | 'next_prayer_start';
  progress: number;
  prayerStatuses: string[];
  prayerAccentKeys: string[];
  prayerNames: string[];
}

class LiveActivityService {
  private isActive = false;

  private getPrayerArabicName(prayerName: string): string {
    return PRAYER_ARABIC_MAP[prayerName.toLowerCase()] ?? prayerName;
  }

  private getHijriShortLabel(): string {
    const cachedHijri = getCachedHijriDate();
    if (cachedHijri) {
      return `${cachedHijri.day} ${cachedHijri.monthNameEn} ${cachedHijri.year}`;
    }

    return formatHijriDateSync();
  }

  /**
   * Check if the user has enabled Live Activities in settings.
   */
  private isEnabled(): boolean {
    const settings = StorageService.getUserSettings();
    return !!settings?.notifications?.liveActivityEnabled;
  }

  /**
   * Get the native bridge for the current platform.
   */
  private getBridge() {
    if (Platform.OS === 'ios') return NativeModules.SukoonLiveActivityBridge ?? null;
    if (Platform.OS === 'android') return NativeModules.LiveActivityModule ?? null;
    return null;
  }

  /**
   * Build the payload for the Live Activity from prayer data.
   */
  private buildPayload(
    prayerTimes: PrayerTime[],
    records: PrayerRecord[],
    nextPrayer: PrayerTime | null,
    tomorrowFajr?: PrayerTime | null,
    todaySunrise?: Date | null,
  ): LiveActivityPayload | null {
    const surface = resolvePrayerSurfaceState(
      prayerTimes,
      records,
      nextPrayer,
      tomorrowFajr ?? null,
      undefined,
      todaySunrise ?? null,
    );
    if (!surface) return null;

    return {
      prayerName: surface.displayPrayer.name,
      prayerArabicName: this.getPrayerArabicName(surface.displayPrayer.name),
      activePrayerName: surface.activePrayer.name,
      hijriShortLabel: this.getHijriShortLabel(),
      countdownTargetISO: surface.countdownTarget.time.toISOString(),
      countdownTargetPrayerName: surface.countdownTarget.name,
      phase: surface.phase,
      countdownMode: surface.countdownMode,
      progress: surface.progress,
      prayerStatuses: surface.prayerStatuses,
      prayerAccentKeys: prayerTimes.map((p) => p.name.toLowerCase()),
      prayerNames: prayerTimes.map((p) => p.name),
    };
  }

  /**
   * Start or update the Live Activity with current prayer data.
   * Called from PrayerTimesProvider when prayer state changes.
   */
  async update(
    prayerTimes: PrayerTime[],
    records: PrayerRecord[],
    nextPrayer: PrayerTime | null,
    tomorrowFajr?: PrayerTime | null,
    todaySunrise?: Date | null,
  ): Promise<void> {
    if (!this.isEnabled()) {
      // If was active but now disabled, end it
      if (this.isActive) {
        await this.end();
      }
      return;
    }

    const bridge = this.getBridge();
    if (!bridge) return;

    const payload = this.buildPayload(prayerTimes, records, nextPrayer, tomorrowFajr, todaySunrise);
    if (!payload) {
      await this.end();
      return;
    }

    const dataJson = JSON.stringify(payload);

    try {
      if (this.isActive) {
        await bridge.updateLiveActivity(dataJson);
      } else {
        await bridge.startLiveActivity(dataJson);
        this.isActive = true;
        logger.log('[LiveActivity] Started:', payload.prayerName, payload.phase);
      }
    } catch (error) {
      logger.error('[LiveActivity] Failed to update:', error);
    }
  }

  /**
   * Start the Live Activity immediately using current prayer data from the store.
   * Called when the user toggles the setting ON.
   */
  async startWithCurrentData(): Promise<void> {
    const bridge = this.getBridge();
    if (!bridge) {
      logger.warn('[LiveActivity] Native bridge not available');
      return;
    }

    const { todayPrayerTimes, nextPrayer, todayPrayerRecords, tomorrowFajr, todaySunrise } = useStore.getState();
    if (!nextPrayer || todayPrayerTimes.length === 0) {
      logger.warn('[LiveActivity] No prayer data available to start');
      return;
    }

    const payload = this.buildPayload(
      todayPrayerTimes,
      todayPrayerRecords,
      nextPrayer,
      tomorrowFajr,
      todaySunrise,
    );
    if (!payload) {
      logger.warn('[LiveActivity] Could not build payload');
      return;
    }

    const dataJson = JSON.stringify(payload);
    logger.log('[LiveActivity] Starting with current data:', payload.prayerName, payload.phase);

    try {
      await bridge.startLiveActivity(dataJson);
      this.isActive = true;
      logger.log('[LiveActivity] Started successfully');
    } catch (error) {
      logger.error('[LiveActivity] Failed to start:', error);
    }
  }

  /**
   * End the Live Activity.
   */
  async end(): Promise<void> {
    const bridge = this.getBridge();
    if (!bridge) return;

    try {
      await bridge.endLiveActivity();
    } catch (error) {
      logger.error('[LiveActivity] Failed to end:', error);
    } finally {
      this.isActive = false;
    }
  }
}

export default new LiveActivityService();
