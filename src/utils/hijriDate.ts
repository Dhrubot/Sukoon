// src/utils/hijriDate.ts
// Accurate Hijri date via Aladhan API with offline fallback.

import StorageService from '../services/StorageService';
import { fetchHijriDateFromEdge } from '../services/api/EdgeApiClient';
import { cacheHijriDate } from './ramadan';
import logger from './logger';
import { fetchWithTimeout } from './networkRequest';

const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah',
] as const;

interface HijriResult {
  day: number;
  month: number;
  monthName: string;
  year: number;
}

// Simple daily cache to avoid repeated API calls
let cachedDate: string | null = null;
let cachedResult: HijriResult | null = null;
let lastHijriSource: 'edge' | 'direct' | 'algorithmic_fallback' | 'memory_cache' | null = null;
const HIJRI_API_TIMEOUT_MS = 8000;

// Hijri month lengths: odd = 30, even = 29
const hijriMonthLen = (m: number): number => m % 2 === 1 ? 30 : 29;

function readHijriAdjustment(): -1 | 0 | 1 {
  try {
    const raw = StorageService.getValue('user_settings');
    if (!raw) return 0;
    return (JSON.parse(raw).hijriAdjustment ?? 0) as -1 | 0 | 1;
  } catch { return 0; }
}

function applyAdjustment(h: HijriResult, offset: -1 | 0 | 1): HijriResult {
  if (offset === 0) return h;
  let { day, month, year } = { ...h };
  if (offset === 1) {
    if (day < hijriMonthLen(month)) { day += 1; }
    else { day = 1; month += 1; if (month > 12) { month = 1; year += 1; } }
  } else {
    if (day > 1) { day -= 1; }
    else { month -= 1; if (month < 1) { month = 12; year -= 1; } day = hijriMonthLen(month); }
  }
  return { day, month, monthName: HIJRI_MONTHS[month - 1] || '', year };
}

/**
 * Fetch accurate Hijri date from Aladhan API.
 */
async function fetchHijriFromAPI(date: Date): Promise<HijriResult | null> {
  try {
    try {
      const edgeHijri = await fetchHijriDateFromEdge(date);
      lastHijriSource = 'edge';
      logger.log('🌐 Hijri date source: edge');
      cacheHijriDate(
        {
          day: String(edgeHijri.day),
          month: {
            number: edgeHijri.month,
            en: edgeHijri.monthName,
            ar: edgeHijri.monthNameAr ?? '',
          },
          year: String(edgeHijri.year),
        },
        date
      );

      return {
        day: edgeHijri.day,
        month: edgeHijri.month,
        monthName: edgeHijri.monthName || HIJRI_MONTHS[edgeHijri.month - 1] || '',
        year: edgeHijri.year,
      };
    } catch {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      const url = `https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`;

      const response = await fetchWithTimeout(url, { method: 'GET' }, HIJRI_API_TIMEOUT_MS);
      if (!response.ok) return null;

      const json = await response.json();
      const hijri = json?.data?.hijri;
      if (!hijri) return null;

      lastHijriSource = 'direct';
      logger.log('🌐 Hijri date source: direct_fallback');
      cacheHijriDate(hijri, date);

      return {
        day: parseInt(hijri.day, 10),
        month: parseInt(hijri.month.number, 10),
        monthName: hijri.month.en || HIJRI_MONTHS[parseInt(hijri.month.number, 10) - 1] || '',
        year: parseInt(hijri.year, 10),
      };
    }
  } catch {
    return null;
  }
}

/**
 * Offline fallback: Tabular Islamic Calendar algorithm.
 * Uses the standard arithmetic conversion (accuracy ±1 day).
 */
function toHijriFallback(date: Date): HijriResult {
  const gd = date.getDate();
  let gm = date.getMonth() + 1;
  let gy = date.getFullYear();

  // Gregorian to Julian Day Number (correct formula)
  if (gm <= 2) {
    gy -= 1;
    gm += 12;
  }
  const A = Math.floor(gy / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd = Math.floor(365.25 * (gy + 4716)) + Math.floor(30.6001 * (gm + 1)) + gd + B - 1524;

  // Julian Day to Hijri (tabular algorithm)
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const remainder = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - remainder) / 5316) *
      Math.floor((50 * remainder) / 17719) +
    Math.floor(remainder / 5670) *
      Math.floor((43 * remainder) / 15238);
  const adjustedRemainder =
    remainder -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  const month = Math.floor((24 * adjustedRemainder) / 709);
  const day = adjustedRemainder - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return {
    day,
    month,
    monthName: HIJRI_MONTHS[month - 1] || '',
    year,
  };
}

/**
 * Get Hijri date — tries API first, falls back to algorithm.
 * Caches result for the current day.
 */
export async function getHijriDate(date: Date = new Date()): Promise<HijriResult> {
  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  if (cachedDate === dateKey && cachedResult) {
    lastHijriSource = 'memory_cache';
    return applyAdjustment(cachedResult, readHijriAdjustment());
  }

  const apiResult = await fetchHijriFromAPI(date);
  if (apiResult) {
    cachedDate = dateKey;
    cachedResult = apiResult;
    return applyAdjustment(apiResult, readHijriAdjustment());
  }

  // Offline fallback
  const fallback = toHijriFallback(date);
  cachedDate = dateKey;
  cachedResult = fallback;
  lastHijriSource = 'algorithmic_fallback';
  logger.log('🌐 Hijri date source: algorithmic_fallback');
  return applyAdjustment(fallback, readHijriAdjustment());
}

export function getLastHijriSource(): string | null {
  return lastHijriSource;
}

/**
 * Format a Hijri date as "1 Ramadan 1447"
 * Returns a promise — use with useEffect + state.
 */
export async function formatHijriDate(date: Date = new Date()): Promise<string> {
  const h = await getHijriDate(date);
  return `${h.day} ${h.monthName} ${h.year}`;
}

/**
 * Synchronous fallback formatter (for initial render before API resolves).
 */
export function formatHijriDateSync(date: Date = new Date()): string {
  const adj = readHijriAdjustment();
  if (cachedDate === `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` && cachedResult) {
    const h = applyAdjustment(cachedResult, adj);
    return `${h.day} ${h.monthName} ${h.year}`;
  }
  const h = applyAdjustment(toHijriFallback(date), adj);
  return `${h.day} ${h.monthName} ${h.year}`;
}
