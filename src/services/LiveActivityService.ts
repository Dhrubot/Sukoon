// src/services/LiveActivityService.ts
// JS wrapper for native Live Activity bridge (iOS ActivityKit / Android ongoing notification).
// Platform-aware: iOS uses SukoonLiveActivityBridge, Android uses LiveActivityModule.

import { NativeModules, Platform } from 'react-native';
import { PrayerTime, PrayerRecord } from '../types';
import logger from '../utils/logger';
import StorageService from './StorageService';
import { useStore } from '../store/useStore';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

interface LiveActivityPayload {
  prayerName: string;
  countdownTargetISO: string;
  phase: 'pre_adhan' | 'fiqh_window' | 'prayed';
  progress: number;
  prayerStatuses: string[];
  prayerNames: string[];
}

class LiveActivityService {
  private isActive = false;

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
  ): LiveActivityPayload | null {
    if (!nextPrayer || prayerTimes.length === 0) return null;

    const now = new Date();

    // Determine prayer statuses for dots
    const prayerStatuses = prayerTimes.map((p) => {
      const record = records.find((r) => r.prayer === p.name);
      if (record?.status === 'prayed') return 'prayed';
      if (p.name === nextPrayer.name) return 'current';
      if (p.time < now) return 'missed';
      return 'upcoming';
    });

    // Determine phase and countdown target
    const isPrayerTimePassed = nextPrayer.time <= now;
    const nextIdx = prayerTimes.findIndex((p) => p.name === nextPrayer.name);
    const nextChronoPrayer = nextIdx < prayerTimes.length - 1
      ? prayerTimes[nextIdx + 1]
      : null;

    // Has the current fiqh-window prayer been prayed?
    const isPrayed = records.some(
      (r) => r.prayer === nextPrayer.name && r.status === 'prayed'
    );

    let phase: 'pre_adhan' | 'fiqh_window' | 'prayed';
    let countdownTargetISO: string;
    let prayerName: string;

    if (isPrayed) {
      // Prayer is done — show as prayed, countdown to next
      phase = 'prayed';
      prayerName = nextPrayer.name;
      countdownTargetISO = nextChronoPrayer?.time.toISOString() || '';
    } else if (isPrayerTimePassed) {
      // Adhan has passed, prayer not done — fiqh window open
      phase = 'fiqh_window';
      prayerName = nextPrayer.name;
      // Countdown target = next prayer's adhan (end of this window)
      countdownTargetISO = nextChronoPrayer?.time.toISOString() || '';
    } else {
      // Pre-adhan: counting down to this prayer's time
      phase = 'pre_adhan';
      prayerName = nextPrayer.name;
      countdownTargetISO = nextPrayer.time.toISOString();
    }

    // Calculate progress (0→1, fills from previous prayer to next)
    const prevPrayer = nextIdx > 0 ? prayerTimes[nextIdx - 1] : null;
    const windowStart = prevPrayer?.time.getTime() || (nextPrayer.time.getTime() - 4 * 60 * 60 * 1000);
    const windowEnd = nextPrayer.time.getTime();
    const elapsed = now.getTime() - windowStart;
    const total = windowEnd - windowStart;
    const progress = total > 0 ? Math.min(Math.max(elapsed / total, 0), 1) : 0;

    return {
      prayerName,
      countdownTargetISO,
      phase,
      progress,
      prayerStatuses,
      prayerNames: PRAYER_NAMES,
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

    const payload = this.buildPayload(prayerTimes, records, nextPrayer);
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

    const { todayPrayerTimes, nextPrayer, todayPrayerRecords } = useStore.getState();
    if (!nextPrayer || todayPrayerTimes.length === 0) {
      logger.warn('[LiveActivity] No prayer data available to start');
      return;
    }

    const payload = this.buildPayload(todayPrayerTimes, todayPrayerRecords, nextPrayer);
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
