// ═══════════════════════════════════════════════════════════════════
// Ramadan Utilities
// ═══════════════════════════════════════════════════════════════════
// Lightweight helpers for Ramadan-aware behavior.
// No new API calls — piggybacks on the Aladhan response already fetched.

import StorageService from '../services/StorageService';
import { getLocalDateKey } from './dateHelpers';
import logger from './logger';

const RAMADAN_MONTH = 9; // Hijri month number for Ramadan
const SHAWWAL_MONTH = 10;
const DHUL_HIJJAH_MONTH = 12;
const STORAGE_KEY_HIJRI = 'cached_hijri_date';

// Hijri month lengths: odd = 30, even = 29 (simplified; month 12 can be 30 in leap years)
const hijriMonthLength = (month: number): number => month % 2 === 1 ? 30 : 29;

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
 * Read the user's hijriAdjustment setting (−1, 0, or +1).
 */
export function getCurrentHijriAdjustment(): -1 | 0 | 1 {
  try {
    const raw = StorageService.getValue('user_settings');
    if (!raw) return 0;
    const settings = JSON.parse(raw);
    return (settings.hijriAdjustment ?? 0) as -1 | 0 | 1;
  } catch {
    return 0;
  }
}

/**
 * Shift a HijriDate by +1 or −1 day, handling month/year rollover.
 */
function applyHijriAdjustment(h: HijriDate, offset: -1 | 0 | 1): HijriDate {
  if (offset === 0) return h;

  let { day, month, year, monthNameEn } = { ...h };
  const { monthNameAr } = h;

  if (offset === 1) {
    const maxDay = hijriMonthLength(month);
    if (day < maxDay) {
      day += 1;
    } else {
      day = 1;
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    }
  } else {
    if (day > 1) {
      day -= 1;
    } else {
      month -= 1;
      if (month < 1) { month = 12; year -= 1; }
      day = hijriMonthLength(month);
    }
  }

  // Update month names based on new month
  const MONTH_NAMES_EN = [
    '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
    'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah',
  ];
  monthNameEn = MONTH_NAMES_EN[month] || monthNameEn;

  return { ...h, day, month, year, monthNameEn, monthNameAr };
}

/**
 * Get the cached Hijri date (from the last successful prayer times fetch).
 * Automatically applies the user's hijriAdjustment setting.
 */
export function getCachedHijriDate(): HijriDate | null {
  try {
    const raw = StorageService.getValue(STORAGE_KEY_HIJRI);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HijriDate;
    // Only trust cache if it was set today
    const today = getLocalDateKey();
    if (parsed.cachedFor && parsed.cachedFor !== today) return null;
    return applyHijriAdjustment(parsed, getCurrentHijriAdjustment());
  } catch {
    return null;
  }
}

/**
 * Get the raw cached Hijri date WITHOUT adjustment (for settings preview).
 */
export function getRawCachedHijriDate(): HijriDate | null {
  try {
    const raw = StorageService.getValue(STORAGE_KEY_HIJRI);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HijriDate;
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
 * Check whether a given date falls on Friday (for Jumu'ah support).
 */
export function isFriday(date: Date = new Date()): boolean {
  return date.getDay() === 5;
}

// ─── Eid Detection ──────────────────────────────────────────────

/**
 * Check if today is Eid al-Fitr (1 Shawwal).
 */
export function isEidAlFitr(): boolean {
  const hijri = getCachedHijriDate();
  if (!hijri) return false;
  return hijri.month === SHAWWAL_MONTH && hijri.day === 1;
}

/**
 * Check if today is Eid al-Adha (10 Dhul Hijjah).
 */
export function isEidAlAdha(): boolean {
  const hijri = getCachedHijriDate();
  if (!hijri) return false;
  return hijri.month === DHUL_HIJJAH_MONTH && hijri.day === 10;
}

/**
 * Check if today is either Eid.
 */
export function isEidDay(): boolean {
  return isEidAlFitr() || isEidAlAdha();
}

/**
 * Get which Eid it is, or null.
 */
export function getEidName(): 'Eid al-Fitr' | 'Eid al-Adha' | null {
  if (isEidAlFitr()) return 'Eid al-Fitr';
  if (isEidAlAdha()) return 'Eid al-Adha';
  return null;
}

// ─── Takbirat / Ayyam al-Tashreeq ──────────────────────────────

/**
 * Check if today is within Ayyam al-Tashreeq (9–13 Dhul Hijjah).
 * Takbirat al-Tashreeq are recited from Fajr of 9th to Asr of 13th.
 */
export function isTashreeqDays(): boolean {
  const hijri = getCachedHijriDate();
  if (!hijri) return false;
  return hijri.month === DHUL_HIJJAH_MONTH && hijri.day >= 9 && hijri.day <= 13;
}

/**
 * Get the Tashreeq day label (e.g. "Day of Arafah", "Eid al-Adha", etc.)
 */
export function getTashreeqDayLabel(): string | null {
  const hijri = getCachedHijriDate();
  if (!hijri || hijri.month !== DHUL_HIJJAH_MONTH) return null;
  switch (hijri.day) {
    case 9: return 'Day of Arafah';
    case 10: return 'Eid al-Adha';
    case 11: return 'Ayyam al-Tashreeq (Day 1)';
    case 12: return 'Ayyam al-Tashreeq (Day 2)';
    case 13: return 'Ayyam al-Tashreeq (Day 3)';
    default: return null;
  }
}
