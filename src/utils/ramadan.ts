// ═══════════════════════════════════════════════════════════════════
// Ramadan Utilities
// ═══════════════════════════════════════════════════════════════════
// Lightweight helpers for Ramadan-aware behavior.
// No new API calls — piggybacks on the Aladhan response already fetched.

import StorageService from '../services/StorageService';
import { getLocalDateKey } from './dateHelpers';
import logger from './logger';

const RAMADAN_MONTH = 9; // Hijri month number for Ramadan
const STORAGE_KEY_HIJRI = 'cached_hijri_date';

export interface HijriDate {
  day: number;
  month: number;
  monthNameEn: string;
  monthNameAr: string;
  year: number;
  cachedFor?: string; // Gregorian date string "YYYY-MM-DD" — used for staleness check
}

/**
 * Cache the Hijri date from an Aladhan API response.
 * Called inside PrayerTimeService after a successful fetch.
 */
export function cacheHijriDate(hijriData: {
  day: string;
  month: { number: number; en: string; ar: string };
  year: string;
}, forDate?: Date): void {
  try {
    // Only cache the Hijri date if it corresponds to today.
    // Pre-fetched dates (tomorrow) must NOT overwrite today's cache.
    const dateKey = getLocalDateKey(forDate ?? new Date());
    const todayKey = getLocalDateKey();
    if (dateKey !== todayKey) {
      return; // Silently skip — this is a pre-fetch for another day
    }

    const hijri: HijriDate = {
      day: parseInt(hijriData.day, 10),
      month: hijriData.month.number,
      monthNameEn: hijriData.month.en,
      monthNameAr: hijriData.month.ar,
      year: parseInt(hijriData.year, 10),
      cachedFor: todayKey,
    };
    StorageService.setValue(STORAGE_KEY_HIJRI, JSON.stringify(hijri));
  } catch (e) {
    logger.warn('Failed to cache Hijri date:', e);
  }
}

/**
 * Get the cached Hijri date (from the last successful prayer times fetch).
 */
export function getCachedHijriDate(): HijriDate | null {
  try {
    const raw = StorageService.getValue(STORAGE_KEY_HIJRI);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HijriDate;
    // Only trust cache if it was set today
    const today = getLocalDateKey();
    if (parsed.cachedFor && parsed.cachedFor !== today) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if today is Ramadan based on the cached Hijri date.
 */
export function isRamadan(): boolean {
  const hijri = getCachedHijriDate();
  if (!hijri) return false;
  return hijri.month === RAMADAN_MONTH;
}

/**
 * Get Ramadan day number (1–30) or null if not Ramadan.
 */
export function getRamadanDay(): number | null {
  const hijri = getCachedHijriDate();
  if (!hijri || hijri.month !== RAMADAN_MONTH) return null;
  return hijri.day;
}

/**
 * Check if today is Friday (for Jumah support).
 */
export function isFriday(): boolean {
  return new Date().getDay() === 5;
}
